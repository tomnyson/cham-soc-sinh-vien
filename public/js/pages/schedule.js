import { uiState } from '/js/modules/uiState.js';
import { createCalendar, toDateKey } from '/js/modules/scheduleCalendar.js';
import {
  WEEKDAY_OPTIONS,
  appendSlot,
  buildOccurrenceUrl,
  emptySlotValues,
  readSlotRows,
} from '/js/modules/scheduleForm.js';

const byId = id => document.getElementById(id);
const classScheduleUrl = classId => `/api/classes/${encodeURIComponent(classId)}/schedule`;

let classOptionsLoaded = false;

// Gọi lại mỗi lần tải lịch: lớp vừa thêm lịch phải hiện trong bộ lọc, giữ lựa chọn hiện tại
function populateFilter(select, classes) {
  const selected = select.value;
  select.replaceChildren(
    new Option('Tất cả lớp', ''),
    ...classes.map(item => new Option(item.name || item.classId, item.classId))
  );
  select.value = classes.some(item => item.classId === selected) ? selected : '';
  select.disabled = false;
}

async function loadRange(range) {
  const res = await fetch(`/api/schedule?${new URLSearchParams(range)}`);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Không tải được lịch dạy');

  const { classes, occurrences } = data.data;
  populateFilter(byId('scheduleClassFilter'), classes);
  byId('scheduleEmpty').classList.toggle('d-none', classes.length > 0);
  return occurrences;
}

function showAddError(message) {
  const errorEl = byId('addScheduleError');
  errorEl.textContent = message;
  errorEl.classList.toggle('d-none', !message);
}

function resetSlotFields() {
  const values = emptySlotValues(toDateKey(new Date()));
  byId('addScheduleForm')
    .querySelectorAll('[data-field]')
    .forEach(input => {
      input.value = values[input.dataset.field];
    });
}

// /api/schedule chỉ trả lớp đã có lịch → lấy mọi lớp đang dạy từ /api/classes
async function loadClassOptions() {
  if (classOptionsLoaded) return;
  const select = byId('addScheduleClass');
  try {
    const res = await fetch('/api/classes');
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Không tải được danh sách lớp');

    const active = data.data.filter(item => !item.isArchived);
    select.replaceChildren(
      new Option(active.length ? 'Chọn lớp' : 'Chưa có lớp nào', ''),
      ...active.map(item => new Option(item.name || item.classId, item.classId))
    );
    select.disabled = active.length === 0;
    classOptionsLoaded = true;
  } catch (e) {
    console.error(e);
    select.replaceChildren(new Option('Không tải được danh sách lớp', ''));
    showAddError('Không tải được danh sách lớp. Đóng lại rồi thử mở lại.');
  }
}

async function fetchCurrentSchedule(classId) {
  const res = await fetch(classScheduleUrl(classId));
  const data = await res.json();
  if (!res.ok || !data.success)
    throw new Error(data.error || 'Không tải được lịch hiện có của lớp');
  return data.data.schedule;
}

async function putSchedule(classId, schedule) {
  const res = await fetch(classScheduleUrl(classId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schedule }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Không lưu được lịch.');
  return data;
}

async function saveNewSlot(event, calendar) {
  event.preventDefault();
  showAddError('');
  const classId = byId('addScheduleClass').value;
  if (!classId) {
    showAddError('Vui lòng chọn lớp.');
    return;
  }

  const button = byId('btnSaveNewSchedule');
  button.disabled = true;
  try {
    // PUT thay toàn bộ lịch → phải lấy lịch hiện có rồi ghép thêm, không gửi riêng khung giờ mới
    const [slot] = readSlotRows(byId('addScheduleForm'));
    const { schedule, error } = appendSlot(await fetchCurrentSchedule(classId), slot);
    if (error) {
      showAddError(error);
      return;
    }
    await putSchedule(classId, schedule);
    window.bootstrap.Modal.getOrCreateInstance(byId('addScheduleModal')).hide();
    uiState.showNotification('Đã thêm lịch dạy', 'success');
    calendar.refresh();
  } catch (e) {
    console.error(e);
    showAddError(e.message || 'Lỗi kết nối khi lưu lịch.');
  } finally {
    button.disabled = false;
  }
}

function setupAddSchedule(calendar) {
  const modal = byId('addScheduleModal');
  if (!modal) return;

  const weekday = byId('addScheduleWeekday');
  WEEKDAY_OPTIONS.forEach(option => weekday.appendChild(new Option(option.label, option.value)));

  modal.addEventListener('show.bs.modal', async () => {
    showAddError('');
    resetSlotFields();
    await loadClassOptions();
    // Đang lọc một lớp → chọn sẵn lớp đó
    const filtered = byId('scheduleClassFilter').value;
    const select = byId('addScheduleClass');
    if (filtered && Array.from(select.options).some(option => option.value === filtered)) {
      select.value = filtered;
    }
  });
  byId('addScheduleForm').addEventListener('submit', event => saveNewSlot(event, calendar));
}

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

document.addEventListener('DOMContentLoaded', () => {
  const root = byId('scheduleCalendar');
  if (!root) return;

  const calendar = createCalendar(root, {
    loadRange,
    showClassName: true,
    onSelect: occurrence => {
      window.location.href = buildOccurrenceUrl(occurrence);
    },
  });

  byId('scheduleClassFilter').addEventListener('change', event => {
    calendar.setFilter(event.target.value || null);
  });
  const exportButton = byId('btnExportIcs');
  exportButton.addEventListener('click', () => exportIcs(exportButton));
  setupAddSchedule(calendar);
});
