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

describe('views/pages/schedule.ejs', () => {
  const body = () => mount(renderView('views/pages/schedule.ejs'));

  it('có tiêu đề, bộ lọc, trạng thái trống và khung lịch', () => {
    const root = body();
    expect(root.querySelector('h1#scheduleHeading').textContent.trim()).toBe('Lịch dạy');
    const filter = root.querySelector('select#scheduleClassFilter');
    expect(filter.disabled).toBe(true);
    expect(filter.options[0].value).toBe('');
    expect(filter.options[0].textContent).toBe('Tất cả lớp');
    expect(root.querySelector('label[for="scheduleClassFilter"]')).not.toBeNull();
    expect(root.querySelector('#scheduleEmpty').classList.contains('d-none')).toBe(true);
    expect(root.querySelector('#scheduleEmpty').textContent.replace(/\s+/g, ' ').trim()).toBe(
      'Chưa có lớp nào có lịch. Bấm "Thêm lịch" để tạo khung giờ đầu tiên.'
    );
    expect(root.querySelector('#scheduleCalendar.sched')).not.toBeNull();
  });

  it('có nút "Thêm lịch" mở modal thêm lịch', () => {
    const root = body();
    const button = root.querySelector('button#btnAddSchedule');
    expect(button.type).toBe('button');
    expect(button.textContent.trim()).toBe('Thêm lịch');
    expect(button.dataset.bsToggle).toBe('modal');
    expect(button.dataset.bsTarget).toBe('#addScheduleModal');

    const modal = root.querySelector('#addScheduleModal.modal');
    expect(modal.getAttribute('aria-labelledby')).toBe('addScheduleModalLabel');
    expect(root.querySelector('#addScheduleModalLabel').textContent.trim()).toBe('Thêm lịch dạy');
  });

  it('form thêm lịch có chọn lớp, đủ ô khung giờ có nhãn, vùng báo lỗi và nút lưu', () => {
    const root = body();
    const form = root.querySelector('form#addScheduleForm');
    expect(form.noValidate).toBe(true);

    const classSelect = form.querySelector('select#addScheduleClass');
    expect(classSelect.disabled).toBe(true);
    expect(form.querySelector('label[for="addScheduleClass"]')).not.toBeNull();

    const rows = form.querySelectorAll('.sched-slot-row');
    expect(rows).toHaveLength(1);
    const fields = {
      weekday: 'SELECT',
      startTime: 'time',
      endTime: 'time',
      startDate: 'date',
      endDate: 'date',
      location: 'text',
    };
    Object.entries(fields).forEach(([name, kind]) => {
      const input = rows[0].querySelector(`[data-field="${name}"]`);
      expect(input).not.toBeNull();
      expect(kind === 'SELECT' ? input.tagName : input.type).toBe(kind);
      expect(form.querySelector(`label[for="${input.id}"]`)).not.toBeNull();
    });
    expect(rows[0].querySelector('[data-field="location"]').maxLength).toBe(100);

    const error = form.querySelector('#addScheduleError');
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.classList.contains('d-none')).toBe(true);
    const save = form.querySelector('button#btnSaveNewSchedule');
    expect(save.type).toBe('submit');
    expect(save.textContent.trim()).toBe('Lưu lịch');
  });

  it('có nút "Tải .ics" kèm hướng dẫn import Google Calendar', () => {
    const root = body();
    const button = root.querySelector('button#btnExportIcs');
    expect(button.type).toBe('button');
    expect(button.textContent.trim()).toBe('Tải .ics');
    expect(button.title).toBe('Tải file rồi vào Google Calendar → Cài đặt → Nhập và xuất → Nhập');
    expect(button.querySelector('i.bi-calendar-plus').getAttribute('aria-hidden')).toBe('true');
  });

  it('nạp CSS lịch và script trang', () => {
    const html = renderView('views/pages/schedule.ejs');
    expect(html).toContain('href="/css/schedule-calendar.css"');
    expect(html).toContain('<script type="module" src="/js/pages/schedule.js"></script>');
  });
});

describe('điều hướng tới /schedule', () => {
  it('sidebar có link "Lịch dạy" ngay sau "Quản lý Lớp học"', () => {
    const source = read('views/partials/sidebar.ejs');
    const classes = source.indexOf('href="/classes"');
    const schedule = source.indexOf('href="/schedule"');
    expect(classes).toBeGreaterThan(-1);
    expect(schedule).toBeGreaterThan(classes);
    expect(source).toContain("activeClass(currentRoute, '/schedule')");
    expect(source).toContain('<span>Lịch dạy</span>');
  });

  it('app.js đăng ký route trang /schedule có kiểm quyền giảng viên', () => {
    const source = read('src/app.js');
    expect(source).toMatch(
      /app\.get\('\/schedule', optionalAuth[\s\S]{0,200}ensureLecturerAccess\(req, res\)[\s\S]{0,200}renderLayoutPage\(req, res, 'schedule'/
    );
  });

  it('api.routes.js đăng ký GET /schedule/ics có kiểm quyền giảng viên', () => {
    expect(read('src/routes/api.routes.js')).toContain(
      "router.get('/schedule/ics', authenticate, requireActiveLecturer, asyncHandler(scheduleController.exportTeacherIcs));"
    );
  });
});
