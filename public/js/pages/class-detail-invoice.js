const INVOICE_CONFIG_FIELDS = {
  centerName: 'invCenterName',
  payerName: 'invPayerName',
  payerPhone: 'invPayerPhone',
  payerAddress: 'invPayerAddress',
  bankCode: 'invBankCode',
  bankAccount: 'invBankAccount',
  bankAccountName: 'invBankAccountName',
  note: 'invNote',
};

function getClassId() {
  return document.getElementById('classDetailPage').dataset.classId;
}

/**
 * Đọc khoảng ngày đang chọn thành query string (rỗng nếu không lọc).
 * @returns {string} ví dụ '?from=2026-08-01&to=2026-08-31'
 */
export function getInvoiceRangeQuery() {
  const from = document.getElementById('invoiceFromDate')?.value || '';
  const to = document.getElementById('invoiceToDate')?.value || '';
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return query ? `?${query}` : '';
}

/**
 * Thu thập giá trị form cấu hình hóa đơn. Trả null nếu form chưa render.
 * @returns {object|null}
 */
export function collectInvoiceConfig() {
  if (!document.getElementById('invCenterName')) return null;
  const entries = Object.entries(INVOICE_CONFIG_FIELDS).map(([field, elementId]) => {
    const el = document.getElementById(elementId);
    return [field, el ? el.value.trim() : ''];
  });
  return Object.fromEntries(entries);
}

/**
 * Voucher đang áp dụng cho lần in/tải hiện tại.
 * Chỉ tồn tại trong bộ nhớ trang — không gửi lên server để lưu.
 * @type {{ code: string, type: string, value: number }|null}
 */
let activeVoucher = null;

/**
 * Ghép khoảng ngày và voucher thành query string cho hóa đơn.
 * @returns {string}
 */
function buildInvoiceQuery() {
  const params = new URLSearchParams(getInvoiceRangeQuery());
  if (activeVoucher) {
    if (activeVoucher.code) params.set('voucherCode', activeVoucher.code);
    params.set('discountType', activeVoucher.type);
    params.set('discountValue', String(activeVoucher.value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

function formatVoucherLabel(voucher) {
  const amount =
    voucher.type === 'percent' ? `${voucher.value}%` : `${voucher.value.toLocaleString('vi-VN')} đ`;
  return voucher.code ? `${voucher.code} — giảm ${amount}` : `Giảm ${amount}`;
}

function renderVoucherBadge() {
  const badge = document.getElementById('invoiceVoucherBadge');
  if (!badge) return;
  badge.classList.toggle('d-none', !activeVoucher);
  badge.classList.toggle('d-flex', Boolean(activeVoucher));
  if (activeVoucher) {
    document.getElementById('invoiceVoucherLabel').textContent = formatVoucherLabel(activeVoucher);
  }
}

function openPrintTab() {
  window.open(`/classes/${getClassId()}/invoice${buildInvoiceQuery()}`, '_blank');
}

/**
 * Đọc voucher từ modal. Trả về { error } nếu nhập sai.
 * @returns {{ voucher: object|null, error: string }}
 */
function readVoucherForm() {
  const code = document.getElementById('voucherCodeInput').value.trim().toUpperCase();
  const type = document.getElementById('voucherTypeInput').value;
  const raw = document.getElementById('voucherValueInput').value.trim();

  if (!raw) return { voucher: null, error: '' };

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return { voucher: null, error: 'Giá trị giảm phải là số lớn hơn 0.' };
  }
  if (type === 'percent' && value > 100) {
    return { voucher: null, error: 'Giảm theo phần trăm không vượt quá 100%.' };
  }

  return { voucher: { code, type, value }, error: '' };
}

function updateQrWarning() {
  const warning = document.getElementById('invoiceConfigWarning');
  if (!warning) return;
  const config = collectInvoiceConfig();
  const missing = !config || !config.bankCode || !config.bankAccount;
  warning.classList.toggle('d-none', !missing);
}

document.addEventListener('DOMContentLoaded', () => {
  const btnApply = document.getElementById('btnApplyInvoiceRange');
  const btnPrint = document.getElementById('btnPrintInvoice');
  const btnExcel = document.getElementById('btnExportInvoiceExcel');

  if (btnApply) {
    btnApply.addEventListener('click', () => {
      if (typeof window.loadAttendanceHistory === 'function') {
        window.loadAttendanceHistory();
      }
    });
  }

  const modalEl = document.getElementById('invoiceVoucherModal');
  const voucherModal = modalEl ? window.bootstrap.Modal.getOrCreateInstance(modalEl) : null;
  const errorEl = document.getElementById('voucherError');

  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      if (!voucherModal) {
        openPrintTab();
        return;
      }
      errorEl?.classList.add('d-none');
      voucherModal.show();
    });
  }

  document.getElementById('btnConfirmVoucherPrint')?.addEventListener('click', () => {
    const { voucher, error } = readVoucherForm();
    if (error) {
      errorEl.textContent = error;
      errorEl.classList.remove('d-none');
      return;
    }
    activeVoucher = voucher;
    renderVoucherBadge();
    voucherModal.hide();
    openPrintTab();
  });

  document.getElementById('btnPrintWithoutVoucher')?.addEventListener('click', () => {
    activeVoucher = null;
    renderVoucherBadge();
    voucherModal.hide();
    openPrintTab();
  });

  document.getElementById('btnClearInvoiceVoucher')?.addEventListener('click', () => {
    activeVoucher = null;
    document.getElementById('voucherValueInput').value = '';
    renderVoucherBadge();
  });

  if (btnExcel) {
    btnExcel.addEventListener('click', () => {
      window.location.href = `/api/classes/${getClassId()}/invoice/export${buildInvoiceQuery()}`;
    });
  }

  Object.values(INVOICE_CONFIG_FIELDS).forEach(elementId => {
    document.getElementById(elementId)?.addEventListener('change', updateQrWarning);
  });

  updateQrWarning();
});
