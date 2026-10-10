import { uiState } from '/js/modules/uiState.js';
import { createCalendar, toDateKey } from '/js/modules/scheduleCalendar.js';
import {
  MAX_SLOTS,
  bindSlotRemoval,
  buildSlotRow,
  emptySlotValues,
  fillAttendanceForm,
  parseAttendParams,
  readSlotRows,
  slotToFormValues,
} from '/js/modules/scheduleForm.js';

let calendar = null;
// Chỉ cho sửa / lưu sau khi đã tải lịch hiện có, tránh lưu đè lịch cũ bằng form rỗng
let editorLoaded = false;

const byId = id => document.getElementById(id);
const scheduleUrl = () =>
  `/api/classes/${encodeURIComponent(byId('classDetailPage').dataset.classId)}/schedule`;

function slotCount() {
  return byId('scheduleSlotBody').querySelectorAll('.sched-slot-row').length;
}

function syncEditorState() {
  const count = slotCount();
  byId('scheduleSlotEmpty').classList.toggle('d-none', !editorLoaded || count > 0);
  byId('btnAddScheduleSlot').disabled = !editorLoaded || count >= MAX_SLOTS;
  byId('btnSaveSchedule').disabled = !editorLoaded;
}

function fillEditor(schedule) {
  const rows = (schedule || []).map(slot => buildSlotRow(slotToFormValues(slot)));
  byId('scheduleSlotBody').replaceChildren(...rows);
  editorLoaded = true;
  syncEditorState();
}

function showFormError(message) {
  const errorEl = byId('scheduleFormError');
  errorEl.textContent = message;
  errorEl.classList.toggle('d-none', !message);
}

async function fetchSchedule(range) {
  const res = await fetch(`${scheduleUrl()}?${new URLSearchParams(range)}`);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Không tải được lịch học');
  if (!editorLoaded) fillEditor(data.data.schedule);
  return data.data.occurrences;
}

function addSlot() {
  if (!editorLoaded || slotCount() >= MAX_SLOTS) return;
  const row = buildSlotRow(emptySlotValues(toDateKey(new Date())));
  byId('scheduleSlotBody').appendChild(row);
  row.querySelector('[data-field="weekday"]').focus();
  syncEditorState();
}

async function saveSchedule(event) {
  event.preventDefault();
  if (!editorLoaded) return;
  showFormError('');
  const button = byId('btnSaveSchedule');
  button.disabled = true;
  try {
    const res = await fetch(scheduleUrl(), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule: readSlotRows(byId('scheduleSlotBody')) }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showFormError(data.error || 'Không lưu được lịch học.');
      return;
    }
    fillEditor(data.data.schedule);
    uiState.showNotification(data.message || 'Đã lưu lịch học', 'success');
    if (calendar) calendar.refresh();
  } catch (error) {
    console.error(error);
    showFormError('Lỗi kết nối khi lưu lịch học.');
  } finally {
    button.disabled = !editorLoaded;
  }
}

function showTab(id) {
  const tab = byId(id);
  if (tab && window.bootstrap) window.bootstrap.Tab.getOrCreateInstance(tab).show();
}

function handleSelect(occurrence) {
  if (occurrence.status === 'done') {
    showTab('tab-attendance-history');
    if (typeof window.loadAttendanceHistory === 'function') window.loadAttendanceHistory();
    return;
  }
  fillAttendanceForm(document, {
    date: new Date(occurrence.start),
    hours: occurrence.durationHours,
  });
  showTab('tab-take-attendance');
}

function showCalendar() {
  if (calendar) {
    calendar.refresh();
    return;
  }
  calendar = createCalendar(byId('classScheduleCalendar'), {
    loadRange: fetchSchedule,
    onSelect: handleSelect,
    showClassName: false,
  });
}

function clearAttendQuery() {
  const url = new URL(window.location.href);
  url.searchParams.delete('attend');
  url.searchParams.delete('hours');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

/** Mở nhanh từ trang /schedule: ?attend=<ISO>&hours=<n>. Sai thì bỏ qua im lặng. */
function openFromQuery() {
  const params = parseAttendParams(window.location.search);
  const modal = byId('attendanceModal');
  if (!params || !modal || !window.bootstrap) return;
  fillAttendanceForm(document, params);
  window.bootstrap.Modal.getOrCreateInstance(modal).show();
  showTab('tab-take-attendance');
  clearAttendQuery();
}

document.addEventListener('DOMContentLoaded', () => {
  const form = byId('scheduleForm');
  if (form) {
    form.addEventListener('submit', saveSchedule);
    byId('btnAddScheduleSlot').addEventListener('click', addSlot);
    bindSlotRemoval(byId('scheduleSlotBody'), syncEditorState);
    byId('tab-attendance-schedule')?.addEventListener('shown.bs.tab', showCalendar);
  }
  openFromQuery();
});
