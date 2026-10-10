import { createCalendar } from '/js/modules/scheduleCalendar.js';
import { buildAttendUrl } from '/js/modules/scheduleForm.js';

let filterReady = false;

// Danh sách lớp có lịch không phụ thuộc khoảng ngày → chỉ điền bộ lọc một lần
function populateFilter(select, classes) {
  if (filterReady) return;
  classes.forEach(item => select.appendChild(new Option(item.name || item.classId, item.classId)));
  select.disabled = false;
  filterReady = true;
}

async function loadRange(range) {
  const res = await fetch(`/api/schedule?${new URLSearchParams(range)}`);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Không tải được lịch dạy');

  const { classes, occurrences } = data.data;
  populateFilter(document.getElementById('scheduleClassFilter'), classes);
  document.getElementById('scheduleEmpty').classList.toggle('d-none', classes.length > 0);
  return occurrences;
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('scheduleCalendar');
  if (!root) return;

  const calendar = createCalendar(root, {
    loadRange,
    showClassName: true,
    onSelect: occurrence => {
      window.location.href = buildAttendUrl(occurrence);
    },
  });

  document.getElementById('scheduleClassFilter').addEventListener('change', event => {
    calendar.setFilter(event.target.value || null);
  });
});
