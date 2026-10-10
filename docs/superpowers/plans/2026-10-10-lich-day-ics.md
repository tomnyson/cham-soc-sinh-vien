# Xuất lịch dạy ra file .ics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giảng viên bấm "Tải .ics" trên `/schedule` để tải lịch dạy cố định (sự kiện lặp hằng tuần), rồi import vào Google Calendar.

**Architecture:**
- Hàm thuần `buildIcs` trong `src/utils/schedule-ics.util.js` sinh chuỗi RFC 5545, gồm `VTIMEZONE` Asia/Ho_Chi_Minh, `RRULE` WEEKLY, escape text và gập dòng 75 byte.
- Endpoint chỉ đọc `GET /api/schedule/ics?classId=` dùng chung truy vấn lớp với `getTeacherSchedule`, qua helper mới `findScheduledClasses`.
- Nút ở trang gọi `fetch`, nhận blob rồi tải file về.

**Tech Stack:** Express 4, Mongoose 8, EJS + Bootstrap 5.3, ES modules thuần trong `public/`, Jest 29 (project `backend` và `frontend`), mongodb-memory-server.

**Spec:** `docs/superpowers/specs/2026-10-10-lich-day-ics-design.md`

## Global Constraints

- Chỉ đọc DB. Không ghi, không sửa dữ liệu.
- Không thêm dependency mới.
- Mọi phép tính ngày dùng offset cố định UTC+7. Test phải pass dưới cả `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`.
- Test chỉ dùng mongodb-memory-server hoặc jsdom. Không bao giờ dùng `MONGODB_URI` trong `.env`.
- Prettier chỉ chạy trên file mới hoặc file do tính năng lịch dạy tạo ra: `schedule-ics.util*.js`, `schedule.controller*.js`, `public/js/pages/schedule.js`, `src/__tests__/schedule-views.test.js`.
- Không chạy Prettier lên `views/**/*.ejs` hoặc `src/routes/api.routes.js`. Hai chỗ này giữ thụt lề 4 dấu cách.
- Không stage `CLAUDE.md` hoặc `AGENTS.md`. Mọi lần `git add` đều liệt kê đúng tên file.
- Commit kết thúc bằng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Trước khi sửa symbol có sẵn, chạy GitNexus `impact`. Trước mỗi commit, chạy `detect_changes`.
- Thông báo lỗi giữ đúng nguyên văn: `'Chưa có lịch để xuất.'`.

## Review Focus

1. `classId` trong query là object hoặc mảng (vd `?classId[$ne]=x`): phải bị ép thành chuỗi, không được thành toán tử Mongo, và trả 404. Test ở Task 2.
2. Buổi đầu vượt sang tháng hoặc năm mới (startDate 30/12, khung Thứ Hai → 04/01): `DTSTART` phải đúng. Test ở Task 1.
3. Dữ liệu cũ thiếu `location` (`undefined`): không xuất `LOCATION`, không có chữ "undefined". Test ở Task 1.
4. Tên lớp có emoji (ký tự 4 byte) nằm gần chỗ gập dòng: không được cắt ngang ký tự. Test ở Task 1.
5. DB lỗi khi xuất: phải chuyển cho `next(error)`, không treo request. Test ở Task 2.

---

### Task 1: `buildIcs` và `icsFileName`

**Files:**
- Create: `src/utils/schedule-ics.util.js`
- Test: `src/utils/schedule-ics.util.test.js`

**Interfaces:**
- Consumes: `toDateKey(date)` từ `src/utils/schedule.util.js`, trả `'YYYY-MM-DD'` theo ngày VN.
- Produces:
  - `buildIcs(classes: {classId, name, schedule}[], now: Date): string`
  - `icsFileName(classId?: string): string`

- [ ] **Step 1: Viết test (fail)**: `src/utils/schedule-ics.util.test.js`

```js
const { buildIcs, icsFileName } = require('./schedule-ics.util');

// Fixture theo giờ VN có offset rõ ràng → không phụ thuộc TZ máy chạy test
const vn = local => new Date(`${local}+07:00`);
const NOW = new Date('2026-10-10T03:04:05.678Z');
const unfold = ics => ics.replace(/\r\n /g, '');
const lines = ics => unfold(ics).split('\r\n');

const slot = overrides => ({
  weekday: 3,
  startTime: '18:00',
  endTime: '20:30',
  startDate: vn('2026-09-07T00:00:00'),
  endDate: null,
  location: 'P.301',
  ...overrides,
});
const classOf = (schedule, overrides) => ({
  classId: 'SOF308_01',
  name: 'SOF308',
  schedule,
  ...overrides,
});

describe('buildIcs', () => {
  it('có header, VTIMEZONE và dùng CRLF', () => {
    const ics = buildIcs([classOf([slot()])], NOW);
    expect(
      ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//cham-soc-sv//lich-day//VI\r\n')
    ).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
    expect(lines(ics)).toEqual(
      expect.arrayContaining([
        'X-WR-CALNAME:Lịch dạy',
        'BEGIN:VTIMEZONE',
        'TZID:Asia/Ho_Chi_Minh',
        'TZOFFSETTO:+0700',
        'END:VTIMEZONE',
      ])
    );
  });

  it('một khung giờ → một VEVENT lặp hằng tuần, buổi đầu là thứ đúng sau startDate', () => {
    const all = lines(buildIcs([classOf([slot()])], NOW));
    const event = all.slice(all.indexOf('BEGIN:VEVENT'), all.indexOf('END:VEVENT') + 1);
    expect(event).toEqual([
      'BEGIN:VEVENT',
      'UID:SOF308_01-3-1800-20260907@cham-soc-sv',
      'DTSTAMP:20261010T030405Z',
      'DTSTART;TZID=Asia/Ho_Chi_Minh:20260909T180000',
      'DTEND;TZID=Asia/Ho_Chi_Minh:20260909T203000',
      'RRULE:FREQ=WEEKLY;BYDAY=WE',
      'SUMMARY:SOF308',
      'LOCATION:P.301',
      'DESCRIPTION:Mã lớp: SOF308_01',
      'END:VEVENT',
    ]);
  });

  it('startDate trùng đúng thứ → buổi đầu chính là startDate', () => {
    const ics = unfold(buildIcs([classOf([slot({ weekday: 1 })])], NOW));
    expect(ics).toContain('DTSTART;TZID=Asia/Ho_Chi_Minh:20260907T180000');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO');
  });

  it('startDate dạng ISO UTC được hiểu theo ngày VN', () => {
    const iso = slot({ weekday: 1, startDate: '2026-09-06T17:00:00.000Z' });
    const ics = unfold(buildIcs([classOf([iso])], NOW));
    expect(ics).toContain('DTSTART;TZID=Asia/Ho_Chi_Minh:20260907T180000');
    expect(ics).toContain('UID:SOF308_01-1-1800-20260907@cham-soc-sv');
  });

  it('buổi đầu vượt sang năm mới', () => {
    const late = slot({ weekday: 1, startDate: vn('2026-12-30T00:00:00') });
    const ics = unfold(buildIcs([classOf([late])], NOW));
    expect(ics).toContain('DTSTART;TZID=Asia/Ho_Chi_Minh:20270104T180000');
  });

  it('có endDate → UNTIL là 23:59:59 giờ VN đổi sang UTC', () => {
    const ics = unfold(buildIcs([classOf([slot({ endDate: vn('2026-12-31T00:00:00') })])], NOW));
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=WE;UNTIL=20261231T165959Z');
  });

  it('khung không có buổi nào trong khoảng ngày bị bỏ qua', () => {
    // Thứ Tư đầu tiên là 09/09, sau endDate 08/09
    const empty = slot({ endDate: vn('2026-09-08T00:00:00') });
    const ics = buildIcs([classOf([empty, slot({ weekday: 1 })])], NOW);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(unfold(ics)).toContain('BYDAY=MO');
  });

  it('không có khung nào → lịch rỗng, không có VEVENT', () => {
    const ics = buildIcs([], NOW);
    expect(ics).not.toContain('BEGIN:VEVENT');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('escape \\ ; , và xuống dòng trong giá trị text', () => {
    const tricky = slot({ location: 'P.301; tầng 3, nhà A\\B\nlối vào' });
    const ics = unfold(buildIcs([classOf([tricky])], NOW));
    expect(ics).toContain('LOCATION:P.301\\; tầng 3\\, nhà A\\\\B\\nlối vào');
  });

  it('gập dòng dài theo 75 byte UTF-8, không cắt ngang ký tự', () => {
    const name =
      'Lập trình ứng dụng web nâng cao với Node.js và Express 🚀 lớp tối thứ Tư phòng học lớn';
    const ics = buildIcs([classOf([slot()], { name })], NOW);
    ics.split('\r\n').forEach(line => {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
      // Cắt ngang cặp surrogate → mã hoá ra U+FFFD, không còn bằng chuỗi gốc
      expect(Buffer.from(line, 'utf8').toString('utf8')).toBe(line);
    });
    expect(lines(ics)).toContain(`SUMMARY:${name}`);
  });

  it('bỏ LOCATION khi rỗng hoặc thiếu, SUMMARY dùng classId khi tên rỗng', () => {
    const schedule = [slot({ location: '' }), slot({ weekday: 1, location: undefined })];
    const ics = unfold(buildIcs([classOf(schedule, { name: '' })], NOW));
    expect(ics).not.toContain('LOCATION');
    expect(ics).not.toContain('undefined');
    expect(ics).toContain('SUMMARY:SOF308_01');
  });

  it('không sửa input', () => {
    const classes = [classOf([slot({ endDate: vn('2026-12-31T00:00:00') })])];
    const before = JSON.stringify(classes);
    buildIcs(classes, NOW);
    expect(JSON.stringify(classes)).toBe(before);
  });
});

describe('icsFileName', () => {
  it('không có classId → lich-day.ics', () => {
    expect(icsFileName('')).toBe('lich-day.ics');
    expect(icsFileName(undefined)).toBe('lich-day.ics');
  });

  it('có classId → ký tự ngoài [A-Za-z0-9_-] đổi thành _', () => {
    expect(icsFileName('SOF308_01')).toBe('lich-day-SOF308_01.ics');
    expect(icsFileName('Lớp A/1 "x"')).toBe('lich-day-L_p_A_1__x_.ics');
  });
});
```

- [ ] **Step 2: Chạy, xác nhận FAIL**

Run: `npx jest --selectProjects backend src/utils/schedule-ics.util.test.js`
Expected: FAIL `Cannot find module './schedule-ics.util'`

- [ ] **Step 3: Viết code**: `src/utils/schedule-ics.util.js`

```js
/**
 * Xuất lịch dạy cố định ra iCalendar (RFC 5545) để import vào Google Calendar.
 * Hàm thuần, không đọc / ghi database. Ngày tính theo offset cố định UTC+7.
 */
const { toDateKey } = require('./schedule.util');

const TZID = 'Asia/Ho_Chi_Minh';
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const MAX_LINE_BYTES = 75;
const DAY_MS = 24 * 60 * 60 * 1000;

const HEADER = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//cham-soc-sv//lich-day//VI',
  'CALSCALE:GREGORIAN',
  'METHOD:PUBLISH',
  'X-WR-CALNAME:Lịch dạy',
  `X-WR-TIMEZONE:${TZID}`,
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  'BEGIN:STANDARD',
  'DTSTART:19700101T000000',
  'TZOFFSETFROM:+0700',
  'TZOFFSETTO:+0700',
  'TZNAME:ICT',
  'END:STANDARD',
  'END:VTIMEZONE',
];

const compactDate = key => key.replace(/-/g, '');
const compactTime = time => `${time.replace(':', '')}00`;
// '2026-12-31T16:59:59.000Z' → '20261231T165959Z'
const utcStamp = date =>
  new Date(date)
    .toISOString()
    .replace(/\.\d{3}/, '')
    .replace(/[-:]/g, '');

function addDays(key, days) {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function escapeText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

// Gập dòng > 75 byte UTF-8; dòng tiếp theo bắt đầu bằng 1 dấu cách. Duyệt theo code point nên không cắt ngang ký tự.
function foldLine(line) {
  const parts = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char, 'utf8');
    const limit = parts.length === 0 ? MAX_LINE_BYTES : MAX_LINE_BYTES - 1;
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  return [...parts, current].join('\r\n ');
}

// Ngày (VN) đầu tiên từ startDate trở đi trùng thứ của khung
function firstOccurrenceKey(slot) {
  const startKey = toDateKey(slot.startDate);
  const startWeekday = new Date(`${startKey}T00:00:00Z`).getUTCDay();
  return addDays(startKey, (slot.weekday - startWeekday + 7) % 7);
}

function buildEvent(classData, slot, stamp) {
  const firstKey = firstOccurrenceKey(slot);
  const endKey = slot.endDate ? toDateKey(slot.endDate) : null;
  if (endKey && firstKey > endKey) return [];

  // RFC 5545: DTSTART có TZID thì UNTIL phải ở UTC → 23:59:59 giờ VN của endDate
  const until = endKey ? `;UNTIL=${utcStamp(`${endKey}T23:59:59+07:00`)}` : '';
  const uid = [
    classData.classId,
    slot.weekday,
    slot.startTime.replace(':', ''),
    compactDate(toDateKey(slot.startDate)),
  ].join('-');

  return [
    'BEGIN:VEVENT',
    `UID:${escapeText(uid)}@cham-soc-sv`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${TZID}:${compactDate(firstKey)}T${compactTime(slot.startTime)}`,
    `DTEND;TZID=${TZID}:${compactDate(firstKey)}T${compactTime(slot.endTime)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[slot.weekday]}${until}`,
    `SUMMARY:${escapeText(classData.name || classData.classId)}`,
    ...(slot.location ? [`LOCATION:${escapeText(slot.location)}`] : []),
    `DESCRIPTION:${escapeText(`Mã lớp: ${classData.classId}`)}`,
    'END:VEVENT',
  ];
}

/**
 * Lịch dạy → chuỗi .ics, mỗi khung giờ là một sự kiện lặp hằng tuần. Không sửa input.
 * Khung không có buổi nào (buổi đầu sau endDate) bị bỏ qua.
 * @param {{classId: string, name: string, schedule?: object[]}[]} classes
 * @param {Date} now dùng cho DTSTAMP
 * @returns {string}
 */
function buildIcs(classes, now) {
  const stamp = utcStamp(now);
  const events = classes.flatMap(classData =>
    (classData.schedule || []).flatMap(slot => buildEvent(classData, slot, stamp))
  );
  return `${[...HEADER, ...events, 'END:VCALENDAR'].map(foldLine).join('\r\n')}\r\n`;
}

/**
 * Tên file tải về; ký tự ngoài [A-Za-z0-9_-] trong classId đổi thành '_'.
 * @param {string} [classId]
 * @returns {string}
 */
function icsFileName(classId) {
  if (!classId) return 'lich-day.ics';
  return `lich-day-${String(classId).replace(/[^A-Za-z0-9_-]/g, '_')}.ics`;
}

module.exports = { buildIcs, icsFileName };
```

- [ ] **Step 4: Chạy, xác nhận PASS dưới cả hai TZ**

Run: `TZ=UTC npx jest --selectProjects backend src/utils/schedule-ics.util.test.js && TZ=Asia/Ho_Chi_Minh npx jest --selectProjects backend src/utils/schedule-ics.util.test.js`
Expected: PASS (14 tests)

- [ ] **Step 5: Prettier và commit**

```bash
npx prettier --check src/utils/schedule-ics.util.js src/utils/schedule-ics.util.test.js
git add src/utils/schedule-ics.util.js src/utils/schedule-ics.util.test.js
git commit -m "feat: ham tao file .ics tu lich day co dinh

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Endpoint `GET /api/schedule/ics`

**Files:**
- Modify: `src/controllers/schedule.controller.js`: thêm helper `findScheduledClasses`, đưa `getTeacherSchedule` sang dùng helper này, thêm `exportTeacherIcs`.
- Modify: `src/routes/api.routes.js:139` (thêm 1 dòng route, thụt lề 4 dấu cách, không chạy Prettier).
- Test: `src/controllers/schedule.controller.test.js` và `src/__tests__/schedule-views.test.js` (kiểm tra mã nguồn route).

**Interfaces:**
- Consumes: `buildIcs` và `icsFileName` từ Task 1.
- Produces: `GET /api/schedule/ics?classId=`.
  - 200: `text/calendar`, header `Content-Disposition: attachment; filename="<icsFileName>"`.
  - 404: `{ success: false, error: 'Chưa có lịch để xuất.' }`.

- [ ] **Step 1: Chạy GitNexus `impact` trên `getTeacherSchedule`** (upstream, `repo: "cham-soc-sinh-vien"`). Báo mức rủi ro.

- [ ] **Step 2: Viết test (fail)**: thêm vào cuối `src/controllers/schedule.controller.test.js`

```js
describe('exportTeacherIcs', () => {
  const makeIcsRes = () => {
    const res = makeRes();
    res.headers = {};
    res.set = headers => {
      res.headers = { ...res.headers, ...headers };
      return res;
    };
    res.send = payload => {
      res.body = payload;
      return res;
    };
    return res;
  };

  it('xuất mọi lớp có lịch của user hiện tại, bỏ lớp lưu trữ và lớp user khác', async () => {
    const res = makeIcsRes();
    await scheduleController.exportTeacherIcs(makeReq(), res, jest.fn());

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('text/calendar; charset=utf-8');
    expect(res.headers['Content-Disposition']).toBe('attachment; filename="lich-day.ics"');
    expect(res.body.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(res.body).toContain('SUMMARY:SOF308');
    expect(res.body).toContain('DTSTART;TZID=Asia/Ho_Chi_Minh:20260907T180000');
    expect(res.body).not.toContain('ARC101');
    expect(res.body).not.toContain('OTH101');
  });

  it('lọc theo classId (có trim) và đặt tên file theo lớp', async () => {
    await Class.create({
      classId: 'class_test_2',
      name: 'WEB201',
      userId: 'user_1',
      schedule: [MONDAY_SLOT],
    });
    const res = makeIcsRes();
    await scheduleController.exportTeacherIcs(
      makeReq({ query: { classId: ' class_test_2 ' } }),
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Disposition']).toBe(
      'attachment; filename="lich-day-class_test_2.ics"'
    );
    expect(res.body).toContain('SUMMARY:WEB201');
    expect(res.body).not.toContain('SUMMARY:SOF308');
  });

  it.each([
    ['lớp của user khác', { query: { classId: 'class_other' } }],
    ['lớp đã lưu trữ', { query: { classId: 'class_archived' } }],
    ['lớp chưa có lịch', { query: { classId: 'class_empty' } }],
    ['classId dạng object không thành toán tử truy vấn', { query: { classId: { $ne: 'x' } } }],
    ['user không có lớp nào có lịch', { user: { _id: 'user_3', id: 'user_3' } }],
  ])('trả 404 khi %s', async (_label, reqOptions) => {
    const res = makeIcsRes();
    await scheduleController.exportTeacherIcs(makeReq(reqOptions), res, jest.fn());

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Chưa có lịch để xuất.' });
  });

  it('lỗi DB chuyển cho next', async () => {
    const error = new Error('db down');
    const spy = jest.spyOn(Class, 'find').mockImplementationOnce(() => {
      throw error;
    });
    const next = jest.fn();
    await scheduleController.exportTeacherIcs(makeReq(), makeIcsRes(), next);

    expect(next).toHaveBeenCalledWith(error);
    spy.mockRestore();
  });
});
```

Thêm vào `describe('điều hướng tới /schedule', ...)` trong `src/__tests__/schedule-views.test.js`:

```js
  it('api.routes.js đăng ký GET /schedule/ics có kiểm quyền giảng viên', () => {
    expect(read('src/routes/api.routes.js')).toContain(
      "router.get('/schedule/ics', authenticate, requireActiveLecturer, asyncHandler(scheduleController.exportTeacherIcs));"
    );
  });
```

- [ ] **Step 3: Chạy, xác nhận FAIL**

Run: `npx jest src/controllers/schedule.controller.test.js src/__tests__/schedule-views.test.js`
Expected: FAIL `scheduleController.exportTeacherIcs is not a function`, và test route báo thiếu chuỗi.

- [ ] **Step 4: Viết code**

Trong `src/controllers/schedule.controller.js`:

- Thêm import `const { buildIcs, icsFileName } = require('../utils/schedule-ics.util');`.
- Thêm hằng `const NO_SCHEDULE_ERROR = 'Chưa có lịch để xuất.';`.
- Thêm helper đặt sau `findSessionsInRange`:

```js
/**
 * Lớp chưa lưu trữ, đã có lịch của giảng viên, sắp theo tên. Có classId → chỉ lớp đó.
 * @param {object} user
 * @param {string} [classId]
 */
function findScheduledClasses(user, classId = '') {
  return Class.find(
    {
      userId: String(user._id),
      isArchived: { $ne: true },
      'schedule.0': { $exists: true },
      ...(classId ? { classId } : {}),
    },
    { classId: 1, name: 1, schedule: 1 }
  )
    .sort({ name: 1 })
    .lean();
}
```

- Trong `getTeacherSchedule`, thay khối `Class.find(...).sort(...).lean()` bằng `const classes = await findScheduledClasses(req.user);`.
- Thêm handler ở cuối file:

```js
/**
 * GET /api/schedule/ics?classId=
 * Tải lịch dạy dạng .ics để import vào Google Calendar. Chỉ đọc DB.
 */
exports.exportTeacherIcs = async (req, res, next) => {
  try {
    // Ép về chuỗi: ?classId[$ne]=x không được thành toán tử truy vấn
    const classId = String((req.query && req.query.classId) || '').trim();
    const classes = await findScheduledClasses(req.user, classId);
    const content = buildIcs(classes, new Date());
    if (!content.includes('BEGIN:VEVENT')) {
      return res.status(404).json({ success: false, error: NO_SCHEDULE_ERROR });
    }

    return res
      .set({
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${icsFileName(classId)}"`,
      })
      .send(content);
  } catch (error) {
    return next(error);
  }
};
```

Trong `src/routes/api.routes.js`, thêm ngay sau dòng `router.get('/schedule', ...)`:

```js
router.get('/schedule/ics', authenticate, requireActiveLecturer, asyncHandler(scheduleController.exportTeacherIcs));
```

- [ ] **Step 5: Chạy, xác nhận PASS dưới cả hai TZ**

Run: `TZ=UTC npx jest src/controllers/schedule.controller.test.js src/__tests__/schedule-views.test.js && TZ=Asia/Ho_Chi_Minh npx jest src/controllers/schedule.controller.test.js src/__tests__/schedule-views.test.js`
Expected: PASS. Các test cũ của `getTeacherSchedule` vẫn xanh.

- [ ] **Step 6: Prettier, detect_changes, commit**

```bash
npx prettier --check src/controllers/schedule.controller.js src/controllers/schedule.controller.test.js src/__tests__/schedule-views.test.js
git add src/controllers/schedule.controller.js src/controllers/schedule.controller.test.js src/routes/api.routes.js src/__tests__/schedule-views.test.js
git commit -m "feat: endpoint tai lich day dang .ics

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Nút "Tải .ics" trên `/schedule`

**Files:**
- Modify: `views/pages/schedule.ejs` (thêm nút trước `#btnAddSchedule`, thụt lề 4 dấu cách).
- Modify: `public/js/pages/schedule.js` (thêm `icsFileNameFrom`, `exportIcs`, gắn sự kiện trong `DOMContentLoaded`).
- Test: `src/__tests__/schedule-views.test.js`

**Interfaces:**
- Consumes: `GET /api/schedule/ics?classId=` từ Task 2.
- Produces: không có.

- [ ] **Step 1: Viết test (fail)**: thêm vào `describe('views/pages/schedule.ejs', ...)`

```js
  it('có nút "Tải .ics" kèm hướng dẫn import Google Calendar', () => {
    const root = body();
    const button = root.querySelector('button#btnExportIcs');
    expect(button.type).toBe('button');
    expect(button.textContent.trim()).toBe('Tải .ics');
    expect(button.title).toBe('Tải file rồi vào Google Calendar → Cài đặt → Nhập và xuất → Nhập');
    expect(button.querySelector('i.bi-calendar-plus').getAttribute('aria-hidden')).toBe('true');
  });
```

- [ ] **Step 2: Chạy, xác nhận FAIL**

Run: `npx jest src/__tests__/schedule-views.test.js`
Expected: FAIL `Cannot read properties of null (reading 'type')`

- [ ] **Step 3: Viết code**

Trong `views/pages/schedule.ejs`, thêm ngay trước `<button type="button" id="btnAddSchedule" ...>`:

```html
                <button type="button" id="btnExportIcs" class="btn btn-outline-primary rounded-pill px-3" title="Tải file rồi vào Google Calendar → Cài đặt → Nhập và xuất → Nhập">
                    <i class="bi bi-calendar-plus me-1" aria-hidden="true"></i>Tải .ics
                </button>
```

Trong `public/js/pages/schedule.js`, thêm trước `document.addEventListener('DOMContentLoaded', ...)`:

```js
function icsFileNameFrom(res) {
  const match = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '');
  return match ? match[1] : 'lich-day.ics';
}

// Tải .ics theo bộ lọc lớp đang chọn ('' = tất cả lớp)
async function exportIcs(button) {
  const classId = byId('scheduleClassFilter').value;
  button.disabled = true;
  try {
    const query = classId ? `?${new URLSearchParams({ classId })}` : '';
    const res = await fetch(`/api/schedule/ics${query}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Không tải được file lịch.');
    }

    const url = URL.createObjectURL(await res.blob());
    const link = Object.assign(document.createElement('a'), {
      href: url,
      download: icsFileNameFrom(res),
    });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch (e) {
    console.error(e);
    uiState.showNotification(e.message || 'Lỗi kết nối khi tải file lịch.', 'error');
  } finally {
    button.disabled = false;
  }
}
```

Trong callback `DOMContentLoaded`, thêm trước `setupAddSchedule(calendar);`:

```js
  const exportButton = byId('btnExportIcs');
  exportButton.addEventListener('click', () => exportIcs(exportButton));
```

- [ ] **Step 4: Chạy toàn bộ test dưới cả hai TZ**

Run: `TZ=UTC npx jest && TZ=Asia/Ho_Chi_Minh npx jest`
Expected: PASS toàn bộ.

- [ ] **Step 5: Prettier, detect_changes, commit**

```bash
npx prettier --check public/js/pages/schedule.js src/__tests__/schedule-views.test.js
git add views/pages/schedule.ejs public/js/pages/schedule.js src/__tests__/schedule-views.test.js
git commit -m "feat: nut tai lich day .ics tren trang /schedule

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
