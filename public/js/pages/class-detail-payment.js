import { uiState } from '/js/modules/uiState.js';

const METHOD_LABELS = {
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
  discount: 'Giảm trừ',
};

const state = {
  payments: [],
  ledger: null,
};

const formatVnd = value => `${new Intl.NumberFormat('vi-VN').format(value || 0)} đ`;

function getClassId() {
  return document.getElementById('classDetailPage').dataset.classId;
}

function toLocalDateTimeValue(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/**
 * Tạo phần tử với class và text (textContent — an toàn với dữ liệu người dùng).
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function messageRow(colspan, text, className = 'text-muted') {
  const tr = el('tr');
  const td = el('td', `text-center py-4 ${className}`, text);
  td.colSpan = colspan;
  tr.appendChild(td);
  return tr;
}

function studentName(mssv) {
  const entry = state.ledger?.students.find(s => s.mssv === mssv);
  return entry ? entry.name : mssv;
}

function renderLedger() {
  const tbody = document.getElementById('paymentLedgerBody');
  const { students, totals } = state.ledger;

  document.getElementById('ledgerTotalCharged').textContent = formatVnd(totals.charged);
  document.getElementById('ledgerTotalPaid').textContent = formatVnd(totals.paid);
  document.getElementById('ledgerTotalOutstanding').textContent = formatVnd(totals.outstanding);

  const note = document.getElementById('ledgerUnallocatedNote');
  note.classList.toggle('d-none', !totals.unallocated);
  note.textContent = totals.unallocated
    ? `Có ${formatVnd(totals.unallocated)} từ buổi học không có danh sách điểm danh — chưa chia cho học viên nào.`
    : '';

  if (students.length === 0) {
    tbody.replaceChildren(messageRow(5, 'Chưa có học viên nào.'));
    return;
  }

  const rows = students.map(student => {
    const tr = el('tr');

    const nameCell = el('td', 'ps-3');
    const name = el('div', 'fw-semibold', student.name || student.mssv);
    if (!student.inClass) {
      name.appendChild(el('span', 'badge bg-secondary-subtle text-secondary-emphasis ms-2', 'Đã rời lớp'));
    }
    nameCell.append(name, el('div', 'small text-muted font-monospace', student.mssv));

    const outstandingClass = student.outstanding > 0
      ? 'text-danger'
      : student.outstanding < 0 ? 'text-info' : 'text-success';
    const outstandingText = student.outstanding < 0
      ? `Trả thừa ${formatVnd(-student.outstanding)}`
      : formatVnd(student.outstanding);

    tr.append(
      nameCell,
      el('td', 'text-center', String(student.sessionCount)),
      el('td', 'text-end', formatVnd(student.charged)),
      el('td', 'text-end text-success', formatVnd(student.paid)),
      el('td', `text-end pe-3 fw-bold ${outstandingClass}`, outstandingText)
    );
    return tr;
  });
  tbody.replaceChildren(...rows);
}

function buildVoidButton(payment) {
  const button = el('button', 'btn btn-sm btn-outline-danger rounded-pill px-2 py-0');
  button.type = 'button';
  button.title = 'Huỷ khoản thu ghi nhầm';
  button.appendChild(el('i', 'bi bi-x-circle'));
  button.addEventListener('click', () => voidPayment(payment));
  return button;
}

function buildPaymentRow(payment) {
  const voided = payment.status === 'voided';
  const tr = el('tr', voided ? 'text-muted' : '');
  const amountClass = voided ? 'text-decoration-line-through' : 'fw-bold text-success';

  const actionCell = el('td', 'pe-3 text-end');
  if (voided) {
    const badge = el('span', 'badge bg-light text-secondary border', 'Đã huỷ');
    badge.title = payment.voidReason ? `Lý do: ${payment.voidReason}` : 'Đã huỷ';
    actionCell.appendChild(badge);
  } else {
    actionCell.appendChild(buildVoidButton(payment));
  }

  tr.append(
    el('td', 'ps-3 text-nowrap', new Date(payment.paidAt).toLocaleString('vi-VN')),
    el('td', '', `${studentName(payment.mssv)} (${payment.mssv})`),
    el('td', '', METHOD_LABELS[payment.method] || payment.method),
    el('td', `text-end text-nowrap ${amountClass}`, formatVnd(payment.amount)),
    el('td', 'small', payment.note || ''),
    actionCell
  );
  return tr;
}

function renderHistory() {
  const tbody = document.getElementById('paymentHistoryBody');
  const mssv = document.getElementById('paymentHistoryFilter').value;
  const payments = mssv ? state.payments.filter(p => p.mssv === mssv) : state.payments;

  if (payments.length === 0) {
    tbody.replaceChildren(messageRow(6, 'Chưa có khoản thu nào.'));
    return;
  }
  tbody.replaceChildren(...payments.map(buildPaymentRow));
}

function renderStudentOutstanding() {
  const hint = document.getElementById('paymentStudentOutstanding');
  const mssv = document.getElementById('paymentStudent').value;
  const entry = mssv && state.ledger?.students.find(s => s.mssv === mssv);
  hint.textContent = entry
    ? `Phát sinh ${formatVnd(entry.charged)} · đã thu ${formatVnd(entry.paid)} · còn nợ ${formatVnd(entry.outstanding)}`
    : '';
}

async function loadPayments() {
  const ledgerBody = document.getElementById('paymentLedgerBody');
  const historyBody = document.getElementById('paymentHistoryBody');
  try {
    const res = await fetch(`/api/classes/${getClassId()}/payments`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Không tải được dữ liệu thu tiền');

    state.payments = data.data.payments;
    state.ledger = data.data.ledger;
    renderLedger();
    renderHistory();
    renderStudentOutstanding();
  } catch (e) {
    console.error(e);
    ledgerBody.replaceChildren(messageRow(5, 'Lỗi tải công nợ.', 'text-danger'));
    historyBody.replaceChildren(messageRow(6, 'Lỗi tải lịch sử thu tiền.', 'text-danger'));
  }
}

function showFormError(message) {
  const errorEl = document.getElementById('paymentFormError');
  errorEl.textContent = message;
  errorEl.classList.toggle('d-none', !message);
}

function readPaymentForm() {
  const mssv = document.getElementById('paymentStudent').value;
  const amount = Number(document.getElementById('paymentAmount').value);
  const paidAtRaw = document.getElementById('paymentPaidAt').value;

  if (!mssv) return { error: 'Vui lòng chọn học viên.' };
  if (!Number.isInteger(amount) || amount <= 0) {
    return { error: 'Số tiền phải là số nguyên lớn hơn 0.' };
  }

  return {
    value: {
      mssv,
      amount,
      paidAt: paidAtRaw ? new Date(paidAtRaw).toISOString() : undefined,
      method: document.getElementById('paymentMethod').value,
      note: document.getElementById('paymentNote').value.trim(),
    },
  };
}

function resetPaymentForm() {
  document.getElementById('paymentAmount').value = '';
  document.getElementById('paymentNote').value = '';
  document.getElementById('paymentPaidAt').value = toLocalDateTimeValue(new Date());
}

async function submitPayment(event) {
  event.preventDefault();
  const { value, error } = readPaymentForm();
  showFormError(error || '');
  if (error) return;

  const button = document.getElementById('btnSavePayment');
  button.disabled = true;
  try {
    const res = await fetch(`/api/classes/${getClassId()}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showFormError(data.error || 'Không lưu được khoản thu.');
      return;
    }
    uiState.showNotification(data.message || 'Đã ghi nhận khoản thu', 'success');
    resetPaymentForm();
    await loadPayments();
  } catch (e) {
    console.error(e);
    showFormError('Lỗi kết nối khi lưu khoản thu.');
  } finally {
    button.disabled = false;
  }
}

async function voidPayment(payment) {
  const label = `${formatVnd(payment.amount)} của ${studentName(payment.mssv)}`;
  const reason = window.prompt(`Huỷ khoản thu ${label}?\nNhập lý do (không bắt buộc):`, '');
  if (reason === null) return;

  try {
    const res = await fetch(`/api/classes/${getClassId()}/payments/${payment._id}/void`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason.trim().slice(0, 200) }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      uiState.showNotification(data.error || 'Không huỷ được khoản thu.', 'error');
      return;
    }
    uiState.showNotification(data.message || 'Đã huỷ khoản thu', 'success');
    await loadPayments();
  } catch (e) {
    console.error(e);
    uiState.showNotification('Lỗi kết nối khi huỷ khoản thu.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('paymentForm');
  if (!form) return;

  resetPaymentForm();
  form.addEventListener('submit', submitPayment);
  document.getElementById('paymentStudent').addEventListener('change', renderStudentOutstanding);
  document.getElementById('paymentHistoryFilter').addEventListener('change', renderHistory);
  document.getElementById('tab-attendance-payment')?.addEventListener('shown.bs.tab', loadPayments);
});
