const { loadEsModule } = require('../../../test-utils/loadEsModule');

const {
  toDateKey,
  startOfWeek,
  getViewRange,
  shiftAnchor,
  classColorIndex,
  formatTime,
  formatRangeLabel,
  renderWeek,
  renderMonth,
  createCalendar,
} = loadEsModule('public/js/modules/scheduleCalendar.js');

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// Giống JSON API trả về: start/end là chuỗi ISO UTC. 18:00 VN = 11:00Z
const occ = (overrides = {}) => ({
  classId: 'c1',
  className: 'SOF308',
  start: '2026-10-05T11:00:00.000Z',
  end: '2026-10-05T13:00:00.000Z',
  durationHours: 2,
  location: 'P.301',
  dateKey: '2026-10-05',
  status: 'missed',
  attendanceSessionId: null,
  ...overrides,
});

const WEEK = { from: '2026-10-05', to: '2026-10-11' };
const MONTH = { from: '2026-09-28', to: '2026-11-08' };

let container;
beforeEach(() => {
  container = document.createElement('div');
  document.body.replaceChildren(container);
});

describe('hàm ngày giờ', () => {
  it('toDateKey / formatTime theo giờ VN', () => {
    expect(toDateKey('2026-10-04T23:00:00Z')).toBe('2026-10-05');
    expect(formatTime('2026-10-04T23:00:00Z')).toBe('06:00');
    expect(formatTime('2026-10-05T11:00:00.000Z')).toBe('18:00');
  });

  it('startOfWeek luôn là Thứ Hai', () => {
    expect(startOfWeek('2026-10-08')).toBe('2026-10-05');
    expect(startOfWeek('2026-10-05')).toBe('2026-10-05');
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05');
  });

  it('getViewRange tuần và lưới tháng 42 ngày', () => {
    expect(getViewRange('week', '2026-10-08')).toEqual(WEEK);
    expect(getViewRange('month', '2026-10-08')).toEqual(MONTH);
  });

  it('shiftAnchor', () => {
    expect(shiftAnchor('week', '2026-10-08', 1)).toBe('2026-10-15');
    expect(shiftAnchor('week', '2026-10-08', -1)).toBe('2026-10-01');
    expect(shiftAnchor('month', '2026-12-15', 1)).toBe('2027-01-01');
    expect(shiftAnchor('month', '2026-01-31', -1)).toBe('2025-12-01');
  });

  it('formatRangeLabel', () => {
    expect(formatRangeLabel('week', WEEK, '2026-10-08')).toBe('05/10 – 11/10/2026');
    expect(formatRangeLabel('week', { from: '2026-12-28', to: '2027-01-03' }, '2026-12-30')).toBe(
      '28/12/2026 – 03/01/2027'
    );
    expect(formatRangeLabel('month', MONTH, '2026-10-01')).toBe('Tháng 10/2026');
  });

  it('classColorIndex ổn định, trong 0..7', () => {
    expect(classColorIndex('SOF308')).toBe(classColorIndex('SOF308'));
    ['a', 'b', 'class_test_1', ''].forEach(id => {
      expect(classColorIndex(id)).toBeGreaterThanOrEqual(0);
      expect(classColorIndex(id)).toBeLessThan(8);
    });
  });
});

describe('renderWeek', () => {
  it('vẽ 7 cột Thứ Hai → Chủ nhật, buổi nằm đúng cột', () => {
    renderWeek(container, [occ()], { range: WEEK, today: '2026-10-08', onSelect: jest.fn() });

    const days = container.querySelectorAll('.sched-day');
    expect(days).toHaveLength(7);
    expect(days[0].querySelectorAll('.sched-event')).toHaveLength(1);
    expect(days[3].classList.contains('sched-day--today')).toBe(true);
    expect(days[6].classList.contains('sched-day--empty')).toBe(true);
  });

  it('nút buổi học có class trạng thái, màu, aria-label và nhãn', () => {
    renderWeek(container, [occ()], { range: WEEK, today: '2026-10-08', onSelect: jest.fn() });

    const button = container.querySelector('button.sched-event');
    expect(button.classList.contains('sched-event--missed')).toBe(true);
    expect(button.classList.contains(`sched-color-${classColorIndex('c1')}`)).toBe(true);
    expect(button.getAttribute('aria-label')).toBe(
      'SOF308, Thứ Hai 05/10, 18:00–20:00, P.301, chưa điểm danh'
    );
    expect(button.querySelector('.sched-event__badge').textContent).toBe('Chưa điểm danh');
    expect(button.querySelector('.sched-event__class')).toBeNull();
  });

  it('done có dấu ✓, showClassName hiện tên lớp', () => {
    renderWeek(container, [occ({ status: 'done' })], {
      range: WEEK,
      today: '2026-10-08',
      showClassName: true,
      onSelect: jest.fn(),
    });

    const button = container.querySelector('button.sched-event');
    expect(button.classList.contains('sched-event--done')).toBe(true);
    expect(button.querySelector('.sched-event__badge').textContent).toBe('✓ Đã điểm danh');
    expect(button.querySelector('.sched-event__class').textContent).toBe('SOF308');
  });

  it('upcoming không có nhãn trạng thái', () => {
    renderWeek(container, [occ({ status: 'upcoming' })], { range: WEEK, today: '2026-10-08' });
    expect(container.querySelector('.sched-event__badge')).toBeNull();
  });

  it('bấm buổi gọi onSelect với đúng occurrence', () => {
    const onSelect = jest.fn();
    const item = occ();
    renderWeek(container, [item], { range: WEEK, today: '2026-10-08', onSelect });

    container.querySelector('button.sched-event').click();
    expect(onSelect).toHaveBeenCalledWith(item);
  });

  it('tuần trống có thông báo (dùng cho màn hình nhỏ)', () => {
    renderWeek(container, [], { range: WEEK, today: '2026-10-08' });
    expect(container.querySelector('.sched-week__empty').textContent).toBe(
      'Không có buổi học trong tuần này.'
    );
  });

  it('tên lớp chứa HTML hiện dạng chữ, không chạy', () => {
    const evil = '<img src=x onerror="window.__xss=1">';
    renderWeek(container, [occ({ className: evil, location: '<b>P</b>' })], {
      range: WEEK,
      today: '2026-10-08',
      showClassName: true,
    });

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('.sched-event__class').textContent).toBe(evil);
  });
});

describe('renderMonth', () => {
  const sameDay = count =>
    Array.from({ length: count }, (_, i) =>
      occ({
        dateKey: '2026-10-14',
        start: `2026-10-14T0${i}:00:00.000Z`,
        end: `2026-10-14T0${i}:30:00.000Z`,
      })
    );

  it('vẽ 42 ô, đánh dấu ô ngoài tháng và hôm nay', () => {
    renderMonth(container, [], { range: MONTH, anchor: '2026-10-01', today: '2026-10-08' });

    expect(container.querySelectorAll('.sched-cell')).toHaveLength(42);
    expect(container.querySelectorAll('.sched-cell--outside')).toHaveLength(11);
    expect(container.querySelectorAll('.sched-cell--today')).toHaveLength(1);
    expect(container.querySelectorAll('.sched-month__weekday')).toHaveLength(7);
  });

  it('tối đa 3 chip mỗi ô, còn lại là nút +n gọi onMore', () => {
    const onMore = jest.fn();
    renderMonth(container, sameDay(5), {
      range: MONTH,
      anchor: '2026-10-01',
      today: '2026-10-08',
      onMore,
    });

    expect(container.querySelectorAll('.sched-chip')).toHaveLength(3);
    const more = container.querySelector('button.sched-more');
    expect(more.textContent).toBe('+2');
    more.click();
    expect(onMore).toHaveBeenCalledWith('2026-10-14');
  });

  it('đúng 3 buổi thì không có +n', () => {
    renderMonth(container, sameDay(3), { range: MONTH, anchor: '2026-10-01', today: '2026-10-08' });
    expect(container.querySelector('.sched-more')).toBeNull();
  });

  it('chip có class trạng thái và aria-label', () => {
    renderMonth(container, [occ({ status: 'done' })], {
      range: MONTH,
      anchor: '2026-10-01',
      today: '2026-10-08',
    });
    const chip = container.querySelector('button.sched-chip');
    expect(chip.classList.contains('sched-chip--done')).toBe(true);
    expect(chip.getAttribute('aria-label')).toContain('đã điểm danh');
  });

  it('chip missed có tiền tố "! " (không chỉ phân biệt bằng màu), upcoming thì không', () => {
    renderMonth(container, [occ({ status: 'missed' }), occ({ status: 'upcoming' })], {
      range: MONTH,
      anchor: '2026-10-01',
      today: '2026-10-08',
    });
    const chips = [...container.querySelectorAll('button.sched-chip')];
    const missed = chips.find(c => c.classList.contains('sched-chip--missed'));
    const upcoming = chips.find(c => c.classList.contains('sched-chip--upcoming'));
    expect(missed.textContent.startsWith('! ')).toBe(true);
    expect(upcoming.textContent.startsWith('! ')).toBe(false);
  });
});

describe('createCalendar', () => {
  const navButton = action => container.querySelector(`[data-nav="${action}"]`);
  const viewButton = view => container.querySelector(`[data-view="${view}"]`);
  const label = () => container.querySelector('.sched-toolbar__label').textContent;

  it('tải tuần hiện tại, hiện trạng thái đang tải rồi vẽ', async () => {
    const pending = deferred();
    const loadRange = jest.fn(() => pending.promise);
    createCalendar(container, { loadRange, today: '2026-10-08' });

    expect(container.classList.contains('sched')).toBe(true);
    expect(loadRange).toHaveBeenCalledWith(WEEK);
    expect(container.textContent).toContain('Đang tải lịch...');
    expect(label()).toBe('05/10 – 11/10/2026');
    expect(viewButton('week').getAttribute('aria-pressed')).toBe('true');

    pending.resolve([occ()]);
    await flush();
    expect(container.querySelectorAll('.sched-event')).toHaveLength(1);
  });

  it('bỏ phản hồi cũ khi bấm › nhanh', async () => {
    const first = deferred();
    const second = deferred();
    const loadRange = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    createCalendar(container, { loadRange, today: '2026-10-08' });

    navButton('next').click();
    expect(loadRange).toHaveBeenLastCalledWith({ from: '2026-10-12', to: '2026-10-18' });

    first.resolve([occ()]);
    await flush();
    expect(container.querySelectorAll('.sched-event')).toHaveLength(0);
    expect(container.textContent).toContain('Đang tải lịch...');

    second.resolve([]);
    await flush();
    expect(label()).toBe('12/10 – 18/10/2026');
    expect(container.querySelectorAll('.sched-event')).toHaveLength(0);
    expect(container.querySelectorAll('.sched-day')).toHaveLength(7);
  });

  it('‹ và Hôm nay', async () => {
    const loadRange = jest.fn().mockResolvedValue([]);
    createCalendar(container, { loadRange, today: '2026-10-08' });

    navButton('prev').click();
    expect(loadRange).toHaveBeenLastCalledWith({ from: '2026-09-28', to: '2026-10-04' });
    navButton('today').click();
    expect(loadRange).toHaveBeenLastCalledWith(WEEK);
    await flush();
  });

  it('lỗi tải → thông báo + Thử lại', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const loadRange = jest
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([occ()]);
    createCalendar(container, { loadRange, today: '2026-10-08' });
    await flush();

    expect(container.querySelector('[role="alert"]').textContent).toContain('Lỗi tải lịch.');
    const retry = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent === 'Thử lại'
    );
    retry.click();
    await flush();

    expect(loadRange).toHaveBeenCalledTimes(2);
    expect(container.querySelectorAll('.sched-event')).toHaveLength(1);
    errorSpy.mockRestore();
  });

  it('chuyển sang tháng tải lưới 42 ngày', async () => {
    const loadRange = jest.fn().mockResolvedValue([]);
    createCalendar(container, { loadRange, today: '2026-10-08' });
    await flush();

    viewButton('month').click();
    expect(loadRange).toHaveBeenLastCalledWith(MONTH);
    await flush();

    expect(label()).toBe('Tháng 10/2026');
    expect(viewButton('month').getAttribute('aria-pressed')).toBe('true');
    expect(viewButton('week').getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelectorAll('.sched-cell')).toHaveLength(42);
  });

  it('+n ở chế độ tháng chuyển sang tuần chứa ngày đó', async () => {
    const many = Array.from({ length: 4 }, (_, i) =>
      occ({ dateKey: '2026-10-14', start: `2026-10-14T0${i}:00:00.000Z` })
    );
    const loadRange = jest.fn().mockResolvedValue(many);
    createCalendar(container, { loadRange, today: '2026-10-08', initialView: 'month' });
    await flush();

    container.querySelector('.sched-more').click();
    expect(loadRange).toHaveBeenLastCalledWith({ from: '2026-10-12', to: '2026-10-18' });
    await flush();
    expect(viewButton('week').getAttribute('aria-pressed')).toBe('true');
  });

  it('setFilter lọc phía client, không gọi lại API', async () => {
    const loadRange = jest
      .fn()
      .mockResolvedValue([occ(), occ({ classId: 'c2', className: 'WEB101' })]);
    const calendar = createCalendar(container, {
      loadRange,
      today: '2026-10-08',
      showClassName: true,
    });
    await flush();
    expect(container.querySelectorAll('.sched-event')).toHaveLength(2);

    calendar.setFilter('c2');
    const names = Array.from(container.querySelectorAll('.sched-event__class'), n => n.textContent);
    expect(names).toEqual(['WEB101']);

    calendar.setFilter(null);
    expect(container.querySelectorAll('.sched-event')).toHaveLength(2);
    expect(loadRange).toHaveBeenCalledTimes(1);
  });

  it('refresh tải lại khoảng hiện tại, getRange trả khoảng đang xem', async () => {
    const loadRange = jest.fn().mockResolvedValue([]);
    const calendar = createCalendar(container, { loadRange, today: '2026-10-08' });
    await flush();

    await calendar.refresh();
    expect(loadRange).toHaveBeenCalledTimes(2);
    expect(calendar.getRange()).toEqual(WEEK);
  });
});
