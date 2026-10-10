/**
 * Lịch tuần / tháng tự vẽ cho tính năng Lịch dạy.
 * KHÔNG import gì: test nạp file qua test-utils/loadEsModule.js,
 * nên chỉ dùng `export function` / `export const`.
 * Ngày giờ theo giờ VN cố định (UTC+7), không phụ thuộc múi giờ trình duyệt.
 * Dữ liệu người dùng (tên lớp, địa điểm) chỉ gán qua textContent.
 */

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const COLOR_COUNT = 8;
const MAX_CHIPS = 3;
const WEEKDAY_NAMES = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const COLUMN_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const STATUS_ARIA = { done: 'đã điểm danh', missed: 'chưa điểm danh', upcoming: 'chưa diễn ra' };
const STATUS_BADGE = { done: '✓ Đã điểm danh', missed: 'Chưa điểm danh' };

const shiftToVn = date => new Date(new Date(date).getTime() + VN_OFFSET_MS).toISOString();
const dayMonth = key => `${key.slice(8, 10)}/${key.slice(5, 7)}`;

export function toDateKey(date) {
  return shiftToVn(date).slice(0, 10);
}

export function formatTime(date) {
  return shiftToVn(date).slice(11, 16);
}

export function addDays(key, days) {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function weekdayOf(key) {
  return new Date(`${key}T00:00:00Z`).getUTCDay();
}

function dayCount(range) {
  return (
    Math.round(
      (Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / DAY_MS
    ) + 1
  );
}

export function startOfWeek(key) {
  return addDays(key, -((weekdayOf(key) + 6) % 7));
}

/**
 * Khoảng ngày đang xem. Tuần: Thứ Hai → Chủ nhật. Tháng: lưới 6 tuần bắt đầu Thứ Hai.
 * @param {'week'|'month'} view
 * @param {string} anchor 'YYYY-MM-DD'
 * @returns {{from: string, to: string}}
 */
export function getViewRange(view, anchor) {
  const from = view === 'month' ? startOfWeek(`${anchor.slice(0, 7)}-01`) : startOfWeek(anchor);
  return { from, to: addDays(from, view === 'month' ? 41 : 6) };
}

export function shiftAnchor(view, anchor, step) {
  if (view !== 'month') return addDays(anchor, step * 7);
  const [year, month] = anchor.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + step, 1)).toISOString().slice(0, 10);
}

export function classColorIndex(classId) {
  const text = String(classId || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 1000003;
  }
  return hash % COLOR_COUNT;
}

export function formatRangeLabel(view, range, anchor) {
  if (view === 'month') return `Tháng ${Number(anchor.slice(5, 7))}/${anchor.slice(0, 4)}`;
  const fromYear = range.from.slice(0, 4);
  const toYear = range.to.slice(0, 4);
  const fromText =
    fromYear === toYear ? dayMonth(range.from) : `${dayMonth(range.from)}/${fromYear}`;
  return `${fromText} – ${dayMonth(range.to)}/${toYear}`;
}

function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function dayLabel(key) {
  return `${WEEKDAY_NAMES[weekdayOf(key)]} ${dayMonth(key)}`;
}

function describeOccurrence(occ) {
  return [
    occ.className,
    dayLabel(occ.dateKey),
    `${formatTime(occ.start)}–${formatTime(occ.end)}`,
    occ.location,
    STATUS_ARIA[occ.status],
  ]
    .filter(Boolean)
    .join(', ');
}

function occurrenceButton(base, occ, onSelect) {
  const button = el(
    'button',
    `${base} ${base}--${occ.status} sched-color-${classColorIndex(occ.classId)}`
  );
  button.type = 'button';
  button.setAttribute('aria-label', describeOccurrence(occ));
  button.addEventListener('click', () => {
    if (onSelect) onSelect(occ);
  });
  return button;
}

function buildEvent(occ, { showClassName, onSelect }) {
  const button = occurrenceButton('sched-event', occ, onSelect);
  button.appendChild(
    el('span', 'sched-event__time', `${formatTime(occ.start)}–${formatTime(occ.end)}`)
  );
  if (showClassName) button.appendChild(el('span', 'sched-event__class', occ.className));
  if (occ.location) button.appendChild(el('span', 'sched-event__location', occ.location));
  if (STATUS_BADGE[occ.status]) {
    button.appendChild(el('span', 'sched-event__badge', STATUS_BADGE[occ.status]));
  }
  return button;
}

function buildChip(occ, { showClassName, onSelect }) {
  const chip = occurrenceButton('sched-chip', occ, onSelect);
  const prefix = occ.status === 'done' ? '✓ ' : '';
  const name = showClassName ? occ.className : occ.location;
  chip.textContent = `${prefix}${[formatTime(occ.start), name].filter(Boolean).join(' ')}`;
  return chip;
}

function groupByDay(occurrences) {
  return occurrences.reduce(
    (map, occ) => map.set(occ.dateKey, [...(map.get(occ.dateKey) || []), occ]),
    new Map()
  );
}

function dayGroup(className, key) {
  const node = el('div', className);
  node.setAttribute('role', 'group');
  node.setAttribute('aria-label', dayLabel(key));
  return node;
}

/**
 * Vẽ tuần: 7 cột, buổi xếp chồng theo giờ (không vẽ trục thời gian).
 * @param {HTMLElement} container
 * @param {object[]} occurrences đã sắp theo giờ bắt đầu
 * @param {{range: {from: string, to: string}, today: string, showClassName?: boolean, onSelect?: Function}} opts
 */
export function renderWeek(container, occurrences, opts) {
  const { range, today, showClassName = false, onSelect } = opts;
  const byDay = groupByDay(occurrences);
  const grid = el('div', 'sched-week');

  COLUMN_NAMES.forEach((columnName, index) => {
    const key = addDays(range.from, index);
    const items = byDay.get(key) || [];
    const column = dayGroup('sched-day', key);
    if (key === today) column.classList.add('sched-day--today');
    if (items.length === 0) column.classList.add('sched-day--empty');

    const head = el('div', 'sched-day__head');
    head.append(
      el('span', 'sched-day__name', columnName),
      el('span', 'sched-day__date', dayMonth(key))
    );
    column.appendChild(head);
    items.forEach(occ => column.appendChild(buildEvent(occ, { showClassName, onSelect })));
    grid.appendChild(column);
  });

  const nodes = [grid];
  if (occurrences.length === 0) {
    nodes.push(el('p', 'sched-week__empty', 'Không có buổi học trong tuần này.'));
  }
  container.replaceChildren(...nodes);
}

/**
 * Vẽ tháng: lưới 6 × 7, mỗi ô tối đa 3 chip, còn lại là nút +n.
 * @param {HTMLElement} container
 * @param {object[]} occurrences
 * @param {{range: object, anchor: string, today: string, showClassName?: boolean, onSelect?: Function, onMore?: Function}} opts
 */
export function renderMonth(container, occurrences, opts) {
  const { range, anchor, today, showClassName = false, onSelect, onMore } = opts;
  const byDay = groupByDay(occurrences);
  const month = anchor.slice(0, 7);

  const head = el('div', 'sched-month__head');
  head.setAttribute('aria-hidden', 'true');
  COLUMN_NAMES.forEach(name => head.appendChild(el('span', 'sched-month__weekday', name)));

  const grid = el('div', 'sched-month');
  Array.from({ length: dayCount(range) }, (_, i) => addDays(range.from, i)).forEach(key => {
    const items = byDay.get(key) || [];
    const cell = dayGroup('sched-cell', key);
    if (key.slice(0, 7) !== month) cell.classList.add('sched-cell--outside');
    if (key === today) cell.classList.add('sched-cell--today');
    cell.appendChild(el('span', 'sched-cell__date', String(Number(key.slice(8, 10)))));

    items
      .slice(0, MAX_CHIPS)
      .forEach(occ => cell.appendChild(buildChip(occ, { showClassName, onSelect })));
    const hidden = items.length - MAX_CHIPS;
    if (hidden > 0) {
      const more = el('button', 'sched-more', `+${hidden}`);
      more.type = 'button';
      more.setAttribute('aria-label', `Xem thêm ${hidden} buổi ngày ${dayMonth(key)}`);
      more.addEventListener('click', () => {
        if (onMore) onMore(key);
      });
      cell.appendChild(more);
    }
    grid.appendChild(cell);
  });

  container.replaceChildren(head, grid);
}

function toolbarButton(text, dataset, ariaLabel) {
  const button = el('button', 'sched-btn', text);
  button.type = 'button';
  Object.entries(dataset).forEach(([key, value]) => {
    button.dataset[key] = value;
  });
  if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
  return button;
}

function buildToolbar() {
  const node = el('div', 'sched-toolbar');
  const nav = el('div', 'sched-toolbar__nav');
  nav.append(
    toolbarButton('‹', { nav: 'prev' }, 'Trước'),
    toolbarButton('Hôm nay', { nav: 'today' }),
    toolbarButton('›', { nav: 'next' }, 'Sau')
  );
  const label = el('h2', 'sched-toolbar__label');
  label.setAttribute('aria-live', 'polite');
  const views = el('div', 'sched-toolbar__views');
  views.setAttribute('role', 'group');
  views.setAttribute('aria-label', 'Chế độ xem');
  views.append(toolbarButton('Tuần', { view: 'week' }), toolbarButton('Tháng', { view: 'month' }));
  node.append(nav, label, views);
  return { node, label, views };
}

/**
 * Gắn lịch vào `root`: thanh công cụ + phần thân, tự tải dữ liệu theo khoảng ngày.
 * Phản hồi về muộn của khoảng cũ bị bỏ qua.
 * @param {HTMLElement} root
 * @param {{loadRange: Function, onSelect?: Function, showClassName?: boolean, initialView?: 'week'|'month', today?: string}} options
 * @returns {{refresh: () => Promise<void>, setFilter: (classId: string|null) => void, getRange: () => object}}
 */
export function createCalendar(root, options) {
  const { loadRange, onSelect, showClassName = false } = options;
  const today = options.today || toDateKey(new Date());
  let view = options.initialView === 'month' ? 'month' : 'week';
  let anchor = today;
  let occurrences = [];
  let filter = null;
  let status = 'loading';
  let token = 0;

  root.classList.add('sched');
  const toolbar = buildToolbar();
  const body = el('div', 'sched-body');
  root.replaceChildren(toolbar.node, body);

  const visible = () => (filter ? occurrences.filter(occ => occ.classId === filter) : occurrences);

  function render() {
    const range = getViewRange(view, anchor);
    const common = { range, today, showClassName, onSelect };
    if (view === 'week') {
      renderWeek(body, visible(), common);
      return;
    }
    renderMonth(body, visible(), {
      ...common,
      anchor,
      onMore: key => {
        view = 'week';
        anchor = key;
        load();
      },
    });
  }

  function updateToolbar(range) {
    toolbar.label.textContent = formatRangeLabel(view, range, anchor);
    toolbar.views.querySelectorAll('[data-view]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.view === view));
    });
  }

  function showError() {
    const box = el('div', 'sched-status sched-status--error');
    box.setAttribute('role', 'alert');
    const retry = el('button', 'sched-btn', 'Thử lại');
    retry.type = 'button';
    retry.addEventListener('click', () => load());
    box.append(el('span', '', 'Lỗi tải lịch.'), retry);
    body.replaceChildren(box);
  }

  async function load() {
    token += 1;
    const current = token;
    const range = getViewRange(view, anchor);
    status = 'loading';
    updateToolbar(range);
    body.setAttribute('aria-busy', 'true');
    body.replaceChildren(el('p', 'sched-status', 'Đang tải lịch...'));

    try {
      const result = await loadRange(range);
      if (current !== token) return;
      occurrences = Array.isArray(result) ? result : [];
      status = 'ready';
      render();
    } catch (error) {
      if (current !== token) return;
      console.error(error);
      status = 'error';
      showError();
    } finally {
      if (current === token) body.removeAttribute('aria-busy');
    }
  }

  toolbar.node.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.nav === 'today') {
      anchor = today;
    } else if (button.dataset.nav) {
      anchor = shiftAnchor(view, anchor, button.dataset.nav === 'next' ? 1 : -1);
    } else if (button.dataset.view) {
      view = button.dataset.view;
    } else {
      return;
    }
    load();
  });

  load();

  return {
    refresh: load,
    setFilter(classId) {
      filter = classId || null;
      if (status === 'ready') render();
    },
    getRange: () => getViewRange(view, anchor),
  };
}
