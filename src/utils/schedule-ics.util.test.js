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

  it('hai khung trùng lớp, thứ, giờ bắt đầu, ngày bắt đầu → UID khác nhau', () => {
    const schedule = [slot(), slot({ endTime: '21:00', location: 'P.302' }), slot()];
    const uids = lines(buildIcs([classOf(schedule)], NOW)).filter(line => line.startsWith('UID:'));
    expect(uids).toEqual([
      'UID:SOF308_01-3-1800-20260907@cham-soc-sv',
      'UID:SOF308_01-3-1800-20260907-2@cham-soc-sv',
      'UID:SOF308_01-3-1800-20260907-3@cham-soc-sv',
    ]);
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
