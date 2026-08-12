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

  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.open(`/classes/${getClassId()}/invoice${getInvoiceRangeQuery()}`, '_blank');
    });
  }

  if (btnExcel) {
    btnExcel.addEventListener('click', () => {
      window.location.href = `/api/classes/${getClassId()}/invoice/export${getInvoiceRangeQuery()}`;
    });
  }

  Object.values(INVOICE_CONFIG_FIELDS).forEach(elementId => {
    document.getElementById(elementId)?.addEventListener('change', updateQrWarning);
  });

  updateQrWarning();
});
