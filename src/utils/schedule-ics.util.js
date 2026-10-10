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
