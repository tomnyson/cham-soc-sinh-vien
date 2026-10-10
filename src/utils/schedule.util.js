/**
 * Lịch dạy: các hàm thuần cho khung giờ cố định hằng tuần.
 * Không đọc / ghi database.
 * Mọi phép tính ngày dùng offset cố định UTC+7, không phụ thuộc múi giờ máy chủ.
 */

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MAX_SLOTS = 14;
const MAX_RANGE_DAYS = 62;
const LOCATION_MAX_LENGTH = 100;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RANGE_ERROR = 'Khoảng ngày không hợp lệ (tối đa 62 ngày).';

const text = value => (value === null || value === undefined ? '' : String(value).trim());

/**
 * Khoá ngày 'YYYY-MM-DD' theo giờ VN của một thời điểm.
 * @param {Date|string} date
 * @returns {string}
 */
function toDateKey(date) {
  return new Date(new Date(date).getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * 'YYYY-MM-DD' → Date lúc 00:00 giờ VN.
 * Trả null nếu sai định dạng hoặc ngày không tồn tại (vd 2026-02-30).
 * @param {string} key
 * @returns {Date|null}
 */
function parseDateKey(key) {
  if (typeof key !== 'string' || !DATE_PATTERN.test(key)) return null;
  const date = new Date(`${key}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime()) || toDateKey(date) !== key) return null;
  return date;
}

function addDays(key, days) {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function daysBetween(fromKey, toKey) {
  return Math.round(
    (Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / DAY_MS
  );
}

function weekdayOf(key) {
  return new Date(`${key}T00:00:00Z`).getUTCDay();
}

function minutesOf(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function toInstant(key, time) {
  return new Date(`${key}T${time}:00+07:00`);
}

function parseSlot(raw, index) {
  const fail = message => ({ error: `Khung giờ ${index + 1}: ${message}` });
  if (!raw || typeof raw !== 'object') return fail('dữ liệu không hợp lệ.');

  const weekdayText = text(raw.weekday);
  const weekday = weekdayText === '' ? NaN : Number(weekdayText);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return fail('thứ không hợp lệ.');

  const startTime = text(raw.startTime);
  const endTime = text(raw.endTime);
  if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
    return fail('giờ phải có dạng HH:mm.');
  }
  if (minutesOf(endTime) <= minutesOf(startTime)) {
    return fail('giờ kết thúc phải sau giờ bắt đầu.');
  }

  const startDate = parseDateKey(text(raw.startDate));
  if (!startDate) return fail('ngày bắt đầu không hợp lệ.');

  const endKey = text(raw.endDate);
  const endDate = endKey ? parseDateKey(endKey) : null;
  if (endKey && !endDate) return fail('ngày kết thúc không hợp lệ.');
  if (endDate && endDate < startDate) return fail('ngày kết thúc phải từ ngày bắt đầu trở đi.');

  const location = text(raw.location);
  if (location.length > LOCATION_MAX_LENGTH) {
    return fail(`địa điểm tối đa ${LOCATION_MAX_LENGTH} ký tự.`);
  }

  return { value: { weekday, startTime, endTime, startDate, endDate, location } };
}

/**
 * Kiểm tra và chuẩn hoá body PUT lịch học. Không sửa body.
 * @param {{schedule: unknown}} body
 * @returns {{value: object[]} | {error: string}}
 */
function parseScheduleInput(body) {
  const list = body && body.schedule;
  if (!Array.isArray(list)) return { error: 'Dữ liệu lịch phải là danh sách khung giờ.' };
  if (list.length > MAX_SLOTS) return { error: `Tối đa ${MAX_SLOTS} khung giờ cho mỗi lớp.` };

  const value = [];
  for (let index = 0; index < list.length; index += 1) {
    const result = parseSlot(list[index], index);
    if (result.error) return { error: result.error };
    value.push(result.value);
  }
  return { value };
}

function currentWeek(now) {
  const today = toDateKey(now);
  const from = addDays(today, -((weekdayOf(today) + 6) % 7));
  return { from, to: addDays(from, 6) };
}

/**
 * Khoảng ngày VN 'YYYY-MM-DD', bao gồm hai đầu. Thiếu cả hai → tuần hiện tại (Thứ Hai – CN).
 * @param {string} [fromRaw]
 * @param {string} [toRaw]
 * @param {Date} [now]
 * @returns {{value: {from: string, to: string}} | {error: string}}
 */
function parseRange(fromRaw, toRaw, now = new Date()) {
  const from = text(fromRaw);
  const to = text(toRaw);
  if (!from && !to) return { value: currentWeek(now) };
  if (!parseDateKey(from) || !parseDateKey(to)) return { error: RANGE_ERROR };

  const days = daysBetween(from, to) + 1;
  if (days < 1 || days > MAX_RANGE_DAYS) return { error: RANGE_ERROR };
  return { value: { from, to } };
}

/**
 * Mốc thời gian để truy vấn DB: [00:00 VN ngày `from`, 00:00 VN ngày sau `to`).
 * @param {{from: string, to: string}} range
 * @returns {{start: Date, end: Date}}
 */
function rangeBounds(range) {
  return { start: parseDateKey(range.from), end: parseDateKey(addDays(range.to, 1)) };
}

function slotActiveOn(slot, dateKey) {
  if (dateKey < toDateKey(slot.startDate)) return false;
  return !slot.endDate || dateKey <= toDateKey(slot.endDate);
}

function buildOccurrence(classData, slot, dateKey) {
  const start = toInstant(dateKey, slot.startTime);
  const end = toInstant(dateKey, slot.endTime);
  return {
    classId: classData.classId,
    className: classData.name,
    start,
    end,
    durationHours: Math.round(((end - start) / HOUR_MS) * 100) / 100,
    location: slot.location || '',
    dateKey,
  };
}

/**
 * Sinh các buổi học của một lớp trong khoảng ngày, sắp theo giờ bắt đầu.
 * @param {{classId: string, name: string, schedule?: object[]}} classData
 * @param {{from: string, to: string}} range
 * @returns {object[]}
 */
function expandOccurrences(classData, range) {
  const slots = (classData && classData.schedule) || [];
  if (slots.length === 0) return [];

  const dayCount = daysBetween(range.from, range.to) + 1;
  const dateKeys = Array.from({ length: dayCount }, (_, i) => addDays(range.from, i));
  return dateKeys
    .flatMap(dateKey => {
      const weekday = weekdayOf(dateKey);
      return slots
        .filter(slot => slot.weekday === weekday && slotActiveOn(slot, dateKey))
        .map(slot => buildOccurrence(classData, slot, dateKey));
    })
    .sort((a, b) => a.start - b.start);
}

const groupKey = (classId, dateKey) => `${classId}|${dateKey}`;

/**
 * Ghép buổi lịch với buổi điểm danh cùng lớp, cùng ngày VN (lần lượt theo giờ).
 * Session không ghép được buổi nào bị bỏ qua. Trả mảng mới, không sửa input.
 * @param {object[]} occurrences
 * @param {{_id: unknown, classId: string, date: Date|string}[]} sessions
 * @param {Date} [now]
 * @returns {object[]}
 */
function markAttendance(occurrences, sessions, now = new Date()) {
  const sessionsByDay = [...sessions]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .reduce((map, session) => {
      const key = groupKey(session.classId, toDateKey(session.date));
      return map.set(key, [...(map.get(key) || []), session]);
    }, new Map());

  const pairedCount = new Map();
  return [...occurrences]
    .sort((a, b) => a.start - b.start)
    .map(occurrence => {
      const key = groupKey(occurrence.classId, occurrence.dateKey);
      const index = pairedCount.get(key) || 0;
      const session = (sessionsByDay.get(key) || [])[index];
      if (session) {
        pairedCount.set(key, index + 1);
        return {
          ...occurrence,
          status: 'done',
          attendanceSessionId: session._id ? String(session._id) : null,
        };
      }
      const status = new Date(occurrence.end) < now ? 'missed' : 'upcoming';
      return { ...occurrence, status, attendanceSessionId: null };
    });
}

module.exports = {
  MAX_SLOTS,
  RANGE_ERROR,
  toDateKey,
  parseScheduleInput,
  parseRange,
  rangeBounds,
  expandOccurrences,
  markAttendance,
};
