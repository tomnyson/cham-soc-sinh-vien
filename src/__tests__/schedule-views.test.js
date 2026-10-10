/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const ROOT = path.join(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const renderView = (relative, data = {}) =>
  ejs.render(
    read(relative),
    { assetPath: p => p, ...data },
    { filename: path.join(ROOT, relative) }
  );
const mount = html => {
  document.body.innerHTML = html; // template của repo, không chứa dữ liệu người dùng
  return document.body;
};

describe('views/partials/attendance-schedule-tab.ejs', () => {
  const body = () => mount(renderView('views/partials/attendance-schedule-tab.ejs'));

  it('có khung lịch và trình sửa khung giờ', () => {
    const root = body();
    expect(root.querySelector('#classScheduleCalendar.sched')).not.toBeNull();
    expect(root.querySelector('form#scheduleForm').hasAttribute('novalidate')).toBe(true);
    expect(root.querySelector('#scheduleSlotBody').tagName).toBe('TBODY');
    expect(root.querySelectorAll('#scheduleForm thead th')).toHaveLength(7);
    expect(root.querySelector('#scheduleSlotEmpty')).not.toBeNull();
    expect(root.querySelector('#scheduleFormError').getAttribute('role')).toBe('alert');
  });

  it('nút thêm / lưu bị khoá tới khi tải xong lịch', () => {
    const root = body();
    expect(root.querySelector('#btnAddScheduleSlot').disabled).toBe(true);
    expect(root.querySelector('#btnSaveSchedule').disabled).toBe(true);
    expect(root.querySelector('#btnSaveSchedule').type).toBe('submit');
  });
});

describe('views/pages/class-detail.ejs', () => {
  const source = read('views/pages/class-detail.ejs');

  it('pill "Lịch" nằm giữa "Thu tiền" và "Cấu hình"', () => {
    const payment = source.indexOf('id="tab-attendance-payment"');
    const schedule = source.indexOf('id="tab-attendance-schedule"');
    const config = source.indexOf('id="tab-attendance-config"');
    expect(payment).toBeGreaterThan(-1);
    expect(schedule).toBeGreaterThan(payment);
    expect(config).toBeGreaterThan(schedule);
    expect(source).toContain('data-bs-target="#attendance-schedule"');
  });

  it('có modal điểm danh và tab "Điểm danh mới" mà tab lịch / ?attend dựa vào', () => {
    expect(source).toContain('id="attendanceModal"');
    expect(source).toContain('id="tab-take-attendance"');
    expect(source).toContain('id="tab-attendance-history"');
  });

  it('pane gọi partial lịch', () => {
    expect(source).toMatch(
      /id="attendance-schedule"[\s\S]{0,200}include\('\.\.\/partials\/attendance-schedule-tab'\)/
    );
  });

  it('nạp CSS lịch và script tab lịch sau script điểm danh', () => {
    expect(source).toContain("assetPath('/css/schedule-calendar.css')");
    const attendance = source.indexOf('/js/pages/class-detail-attendance.js');
    const schedule = source.indexOf("assetPath('/js/pages/class-detail-schedule.js')");
    expect(attendance).toBeGreaterThan(-1);
    expect(schedule).toBeGreaterThan(attendance);
  });
});
