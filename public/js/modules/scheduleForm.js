/**
 * Trình sửa khung giờ + mở nhanh điểm danh cho tính năng Lịch dạy.
 * KHÔNG import gì: test nạp file qua test-utils/loadEsModule.js,
 * nên chỉ dùng `export function` / `export const`.
 * Ngày giờ theo giờ VN cố định (UTC+7).
 */

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const LOCATION_MAX_LENGTH = 100;
const MIN_HOURS = 0.1;
const MAX_HOURS = 24;

export const MAX_SLOTS = 14;

export const WEEKDAY_OPTIONS = [
  { value: '1', label: 'Thứ Hai' },
  { value: '2', label: 'Thứ Ba' },
  { value: '3', label: 'Thứ Tư' },
  { value: '4', label: 'Thứ Năm' },
  { value: '5', label: 'Thứ Sáu' },
  { value: '6', label: 'Thứ Bảy' },
  { value: '0', label: 'Chủ nhật' },
];

const shiftToVn = date => new Date(new Date(date).getTime() + VN_OFFSET_MS).toISOString();

/**
 * Khung giờ từ API → giá trị cho các ô nhập.
 * @param {{weekday: number, startTime: string, endTime: string, startDate: string, endDate: string|null, location?: string}} slot
 */
export function slotToFormValues(slot) {
  return {
    weekday: String(slot.weekday),
    startTime: slot.startTime || '',
    endTime: slot.endTime || '',
    startDate: slot.startDate ? shiftToVn(slot.startDate).slice(0, 10) : '',
    endDate: slot.endDate ? shiftToVn(slot.endDate).slice(0, 10) : '',
    location: slot.location || '',
  };
}

export function emptySlotValues(todayKey) {
  return {
    weekday: '1',
    startTime: '18:00',
    endTime: '20:00',
    startDate: todayKey,
    endDate: '',
    location: '',
  };
}

function inputField(type, name, value, label) {
  const input = document.createElement('input');
  input.type = type;
  input.className = 'form-control form-control-sm';
  input.dataset.field = name;
  input.value = value;
  input.setAttribute('aria-label', label);
  return input;
}

function weekdaySelect(value) {
  const select = document.createElement('select');
  select.className = 'form-select form-select-sm';
  select.dataset.field = 'weekday';
  select.setAttribute('aria-label', 'Thứ');
  WEEKDAY_OPTIONS.forEach(option => select.appendChild(new Option(option.label, option.value)));
  select.value = value;
  return select;
}

function removeButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-sm btn-outline-danger';
  button.dataset.action = 'remove';
  button.setAttribute('aria-label', 'Xoá khung giờ');
  const icon = document.createElement('i');
  icon.className = 'bi bi-trash';
  icon.setAttribute('aria-hidden', 'true');
  button.appendChild(icon);
  return button;
}

function cell(child) {
  const td = document.createElement('td');
  td.appendChild(child);
  return td;
}

/**
 * Một dòng trình sửa khung giờ.
 * @param {{weekday: string, startTime: string, endTime: string, startDate: string, endDate: string, location: string}} values
 * @returns {HTMLTableRowElement}
 */
export function buildSlotRow(values) {
  const row = document.createElement('tr');
  row.className = 'sched-slot-row';
  const location = inputField('text', 'location', values.location, 'Địa điểm');
  location.maxLength = LOCATION_MAX_LENGTH;
  location.placeholder = 'VD: P.301';

  row.append(
    cell(weekdaySelect(values.weekday)),
    cell(inputField('time', 'startTime', values.startTime, 'Giờ bắt đầu')),
    cell(inputField('time', 'endTime', values.endTime, 'Giờ kết thúc')),
    cell(inputField('date', 'startDate', values.startDate, 'Từ ngày')),
    cell(inputField('date', 'endDate', values.endDate, 'Đến ngày')),
    cell(location),
    cell(removeButton())
  );
  return row;
}

/**
 * Bấm nút xoá trong `tbody` → bỏ dòng đó rồi gọi onChange.
 * @param {HTMLElement} tbody
 * @param {() => void} onChange
 */
export function bindSlotRemoval(tbody, onChange) {
  tbody.addEventListener('click', event => {
    const button = event.target.closest('[data-action="remove"]');
    if (!button || !tbody.contains(button)) return;
    button.closest('.sched-slot-row').remove();
    onChange();
  });
}

/**
 * Đọc các dòng thành body PUT /api/classes/:classId/schedule.
 * Server kiểm tra lại toàn bộ, ở đây chỉ chuẩn hoá kiểu.
 * @param {HTMLElement} container
 * @returns {object[]}
 */
export function readSlotRows(container) {
  return Array.from(container.querySelectorAll('.sched-slot-row'), row => {
    const value = name => row.querySelector(`[data-field="${name}"]`).value.trim();
    return {
      weekday: Number(value('weekday')),
      startTime: value('startTime'),
      endTime: value('endTime'),
      startDate: value('startDate'),
      endDate: value('endDate') || null,
      location: value('location'),
    };
  });
}

/**
 * Đọc ?attend=<ISO>&hours=<n>. attend sai → null. hours sai → hours null.
 * @param {string} search
 * @returns {{date: Date, hours: number|null} | null}
 */
export function parseAttendParams(search) {
  const params = new URLSearchParams(search || '');
  const attend = params.get('attend') || '';
  if (!ISO_PATTERN.test(attend)) return null;
  const date = new Date(attend);
  if (Number.isNaN(date.getTime())) return null;

  const hoursText = (params.get('hours') || '').trim();
  const hours = hoursText ? Number(hoursText) : NaN;
  const validHours = Number.isFinite(hours) && hours >= MIN_HOURS && hours <= MAX_HOURS;
  return { date, hours: validHours ? hours : null };
}

export function toDateTimeLocalValue(date) {
  return shiftToVn(date).slice(0, 16);
}

/**
 * Giá trị ô datetime-local (hiểu là giờ VN) → chuỗi ISO UTC để gửi server.
 * @param {string} value 'YYYY-MM-DDTHH:mm' hoặc 'YYYY-MM-DDTHH:mm:ss'
 * @returns {string|null}
 */
export function vnLocalToIso(value) {
  if (typeof value !== 'string' || !DATETIME_LOCAL_PATTERN.test(value)) return null;
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  const date = new Date(`${withSeconds}+07:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Điền form "Điểm danh mới": #attDate theo giờ VN, #attDuration nếu có hours.
 * Phát sự kiện input để class-detail-attendance.js tính lại thành tiền.
 * @param {Document} doc
 * @param {{date: Date, hours: number|null}} values
 */
export function fillAttendanceForm(doc, { date, hours }) {
  const dateInput = doc.getElementById('attDate');
  if (dateInput) dateInput.value = toDateTimeLocalValue(date);

  const durationInput = doc.getElementById('attDuration');
  if (!durationInput || hours === null || hours === undefined) return;
  durationInput.value = String(hours);
  durationInput.dispatchEvent(new Event('input', { bubbles: true }));
}

export function buildAttendUrl(occurrence) {
  const start = new Date(occurrence.start).toISOString();
  const params = `attend=${encodeURIComponent(start)}&hours=${encodeURIComponent(occurrence.durationHours)}`;
  return `/classes/${encodeURIComponent(occurrence.classId)}?${params}`;
}

/** Buổi đã điểm danh → mở lịch sử điểm danh; còn lại → mở form điểm danh mới. */
export function buildOccurrenceUrl(occurrence) {
  if (occurrence.status === 'done') {
    return `/classes/${encodeURIComponent(occurrence.classId)}?attendHistory=1`;
  }
  return buildAttendUrl(occurrence);
}
