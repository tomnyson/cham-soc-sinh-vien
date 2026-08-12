/**
 * Invoice Utilities
 * Các hàm thuần phục vụ xuất hóa đơn / bảng kê học phí.
 * Không đọc / ghi database.
 */

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const SCALES = ['', ' nghìn', ' triệu', ' tỷ'];

/**
 * Đọc một nhóm 3 chữ số thành chữ.
 * @param {number} value - giá trị 0..999
 * @param {boolean} isLeadingGroup - true nếu đây là nhóm có nghĩa đầu tiên (bỏ "không trăm")
 * @returns {string}
 */
function readTriple(value, isLeadingGroup) {
  const hundred = Math.floor(value / 100);
  const ten = Math.floor((value % 100) / 10);
  const unit = value % 10;
  const parts = [];

  if (hundred > 0 || !isLeadingGroup) {
    parts.push(`${DIGITS[hundred]} trăm`);
  }

  if (ten === 0) {
    if (unit > 0) {
      if (hundred > 0 || !isLeadingGroup) parts.push('linh');
      parts.push(DIGITS[unit]);
    }
  } else if (ten === 1) {
    parts.push('mười');
    if (unit === 5) parts.push('lăm');
    else if (unit > 0) parts.push(DIGITS[unit]);
  } else {
    parts.push(`${DIGITS[ten]} mươi`);
    if (unit === 1) parts.push('mốt');
    else if (unit === 4) parts.push('tư');
    else if (unit === 5) parts.push('lăm');
    else if (unit > 0) parts.push(DIGITS[unit]);
  }

  return parts.join(' ');
}

/**
 * Đọc số tiền VNĐ thành chữ tiếng Việt.
 * @param {number} amount
 * @returns {string} VD: "Sáu triệu đồng chẵn"
 */
function numberToVietnameseWords(amount) {
  const value = Math.floor(Number(amount));
  if (!Number.isFinite(value) || value <= 0) return 'Không đồng';

  // Tách thành các nhóm 3 chữ số, nhóm 0 là hàng đơn vị
  const groups = [];
  let remaining = value;
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const highestIndex = groups.length - 1;
  const chunks = [];

  for (let i = highestIndex; i >= 0; i -= 1) {
    if (groups[i] !== 0) {
      const text = readTriple(groups[i], i === highestIndex);
      chunks.push(`${text}${SCALES[i] || ''}`);
    }
  }

  const sentence = chunks.join(' ').replace(/\s+/g, ' ').trim();
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)} đồng chẵn`;
}

/**
 * Danh sách ngân hàng hỗ trợ VietQR (BIN theo chuẩn NAPAS).
 */
const BANKS = [
  { bin: '970436', shortName: 'Vietcombank', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam' },
  { bin: '970415', shortName: 'VietinBank', name: 'Ngân hàng TMCP Công Thương Việt Nam' },
  { bin: '970418', shortName: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
  { bin: '970405', shortName: 'Agribank', name: 'Ngân hàng NN&PTNT Việt Nam' },
  { bin: '970422', shortName: 'MBBank', name: 'Ngân hàng TMCP Quân đội' },
  { bin: '970407', shortName: 'Techcombank', name: 'Ngân hàng TMCP Kỹ Thương Việt Nam' },
  { bin: '970416', shortName: 'ACB', name: 'Ngân hàng TMCP Á Châu' },
  { bin: '970432', shortName: 'VPBank', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' },
  { bin: '970423', shortName: 'TPBank', name: 'Ngân hàng TMCP Tiên Phong' },
  { bin: '970403', shortName: 'Sacombank', name: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
  { bin: '970443', shortName: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội' },
  { bin: '970426', shortName: 'MSB', name: 'Ngân hàng TMCP Hàng Hải' },
  { bin: '970441', shortName: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam' },
  { bin: '970437', shortName: 'HDBank', name: 'Ngân hàng TMCP Phát triển TP.HCM' },
  { bin: '970431', shortName: 'Eximbank', name: 'Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam' },
  { bin: '970448', shortName: 'OCB', name: 'Ngân hàng TMCP Phương Đông' },
  { bin: '970440', shortName: 'SeABank', name: 'Ngân hàng TMCP Đông Nam Á' },
  { bin: '970449', shortName: 'LPBank', name: 'Ngân hàng TMCP Lộc Phát Việt Nam' },
  { bin: '970425', shortName: 'ABBANK', name: 'Ngân hàng TMCP An Bình' },
  { bin: '970429', shortName: 'SCB', name: 'Ngân hàng TMCP Sài Gòn' },
  { bin: '970454', shortName: 'BVBank', name: 'Ngân hàng TMCP Bản Việt' },
  { bin: '970409', shortName: 'BacABank', name: 'Ngân hàng TMCP Bắc Á' },
];

/**
 * Dựng URL ảnh QR chuyển khoản VietQR.
 * Trả null nếu chưa cấu hình đủ ngân hàng + số tài khoản.
 * @returns {string|null}
 */
function buildVietQrUrl({ bankCode, bankAccount, bankAccountName, amount, addInfo } = {}) {
  const bank = String(bankCode || '').trim();
  const account = String(bankAccount || '').trim();
  if (!bank || !account) return null;

  const params = [];
  const numericAmount = Math.floor(Number(amount));
  if (Number.isFinite(numericAmount) && numericAmount > 0) {
    params.push(`amount=${numericAmount}`);
  }
  if (addInfo) {
    params.push(`addInfo=${encodeURIComponent(String(addInfo))}`);
  }
  if (bankAccountName) {
    params.push(`accountName=${encodeURIComponent(String(bankAccountName))}`);
  }

  const query = params.length ? `?${params.join('&')}` : '';
  return `https://img.vietqr.io/image/${bank}-${account}-compact2.png${query}`;
}

/**
 * Định dạng Date thành YYYYMM, trả 'ALL' nếu không có ngày.
 * @param {Date|string|null} date
 * @returns {string}
 */
function toPeriodKey(date) {
  if (!date) return 'ALL';
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'ALL';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

/**
 * Sinh số hóa đơn tất định — cùng tham số luôn cho cùng kết quả, không cần lưu DB.
 * @param {string} classId
 * @param {Date|null} from
 * @param {Date|null} to
 * @returns {string} VD: HD-848247-202607-202608
 */
function generateInvoiceNo(classId, from, to) {
  const suffix =
    String(classId || '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(-6)
      .toUpperCase() || 'UNKNOWN';
  return `HD-${suffix}-${toPeriodKey(from)}-${toPeriodKey(to)}`;
}

/**
 * Chuẩn hoá tham số khoảng ngày từ query string.
 * from → 00:00:00.000, to → 23:59:59.999 để bao trọn ngày cuối.
 * @param {string} fromRaw
 * @param {string} toRaw
 * @returns {{ from: Date|null, to: Date|null }}
 */
function parseDateRange(fromRaw, toRaw) {
  const parse = (raw, endOfDay) => {
    if (!raw) return null;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    if (endOfDay) parsed.setHours(23, 59, 59, 999);
    else parsed.setHours(0, 0, 0, 0);
    return parsed;
  };

  return { from: parse(fromRaw, false), to: parse(toRaw, true) };
}

/**
 * Lọc buổi học theo khoảng ngày. Không mutate đầu vào.
 * @param {Array} sessions
 * @param {Date|null} from
 * @param {Date|null} to
 * @returns {Array}
 */
function filterSessionsByRange(sessions, from, to) {
  const list = Array.isArray(sessions) ? sessions : [];
  return list.filter(session => {
    const date =
      session && session.date instanceof Date ? session.date : new Date(session && session.date);
    if (Number.isNaN(date.getTime())) return false;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  });
}

/**
 * @param {Date|string} date
 * @returns {string} dd/mm/yyyy
 */
function formatDdMmYyyy(date) {
  const parsed = date instanceof Date ? date : new Date(date);
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${parsed.getFullYear()}`;
}

/**
 * @param {Date|null} from
 * @param {Date|null} to
 * @returns {string}
 */
function buildPeriodLabel(from, to) {
  if (from && to) return `${formatDdMmYyyy(from)} – ${formatDdMmYyyy(to)}`;
  if (from) return `Từ ${formatDdMmYyyy(from)}`;
  if (to) return `Đến ${formatDdMmYyyy(to)}`;
  return 'Toàn bộ';
}

const VOUCHER_CODE_MAX_LENGTH = 40;

/**
 * Chuẩn hoá voucher giảm giá từ query string.
 * Voucher nhập tại chỗ khi xuất hóa đơn — không lưu database.
 * @param {object} query - { voucherCode, discountType, discountValue }
 * @returns {{ code: string, type: 'percent'|'amount', value: number }|null} null nếu không giảm
 */
function parseVoucher(query) {
  const source = query || {};
  const value = Number(source.discountValue);
  if (!Number.isFinite(value) || value <= 0) return null;

  const type = source.discountType === 'amount' ? 'amount' : 'percent';
  const code = String(source.voucherCode || '')
    .trim()
    .slice(0, VOUCHER_CODE_MAX_LENGTH)
    .toUpperCase();

  return { code, type, value: type === 'percent' ? Math.min(value, 100) : value };
}

/**
 * Tính số tiền được giảm, luôn nằm trong khoảng 0..subtotal.
 * @param {number} subtotal - tổng tiền trước giảm
 * @param {object|null} voucher - kết quả parseVoucher()
 * @returns {number} số tiền giảm đã làm tròn về đồng
 */
function calcDiscountAmount(subtotal, voucher) {
  if (!voucher || subtotal <= 0) return 0;
  const raw = voucher.type === 'percent' ? (subtotal * voucher.value) / 100 : voucher.value;
  return Math.min(Math.max(Math.round(raw), 0), subtotal);
}

/**
 * Nhãn hiển thị của voucher trên hóa đơn.
 * @param {object} voucher - kết quả parseVoucher()
 * @returns {string} VD: "GIAM10 (giảm 10%)" hoặc "Giảm 5%"
 */
function buildVoucherLabel(voucher) {
  const amount =
    voucher.type === 'percent'
      ? `${voucher.value}%`
      : `${Number(voucher.value).toLocaleString('vi-VN')} đ`;
  return voucher.code ? `${voucher.code} (giảm ${amount})` : `Giảm ${amount}`;
}

/**
 * Dựng toàn bộ dữ liệu hóa đơn để render ra HTML hoặc Excel.
 * Hàm thuần — không đọc / ghi database.
 * @param {object} params
 * @param {object} params.classData - document lớp (dạng lean)
 * @param {Array} params.sessions - danh sách buổi điểm danh
 * @param {Date|null} params.from - cận dưới khoảng ngày
 * @param {Date|null} params.to - cận trên khoảng ngày
 * @param {object|null} params.branding - cấu hình thương hiệu toàn cục
 * @param {object|null} params.voucher - voucher giảm giá đã chuẩn hoá
 * @returns {object}
 */
function buildInvoiceData({
  classData = {},
  sessions = [],
  from = null,
  to = null,
  branding = null,
  voucher = null,
} = {}) {
  const filtered = filterSessionsByRange(sessions, from, to)
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const rows = filtered.map((session, i) => {
    const records = Array.isArray(session.records) ? session.records : [];
    return {
      index: i + 1,
      date: session.date instanceof Date ? session.date : new Date(session.date),
      durationHours: Number(session.durationHours) || 0,
      presentCount: records.filter(r => r && r.status === 'present').length,
      totalStudents: records.length,
      hourlyRate: Number(session.hourlyRate) || 0,
      totalCost: Number(session.totalCost) || 0,
    };
  });

  const summed = rows.reduce(
    (acc, row) => ({
      sessionCount: acc.sessionCount + 1,
      totalHours: acc.totalHours + row.durationHours,
      subtotal: acc.subtotal + row.totalCost,
    }),
    { sessionCount: 0, totalHours: 0, subtotal: 0 }
  );

  const discountAmount = calcDiscountAmount(summed.subtotal, voucher);
  const totals = {
    ...summed,
    discountAmount,
    // totalAmount luôn là số tiền phải trả sau khi trừ voucher
    totalAmount: summed.subtotal - discountAmount,
  };

  const rawConfig = classData.invoiceConfig || {};
  const config = {
    centerName: String(rawConfig.centerName || ''),
    payerName: String(rawConfig.payerName || ''),
    payerPhone: String(rawConfig.payerPhone || ''),
    payerAddress: String(rawConfig.payerAddress || ''),
    bankCode: String(rawConfig.bankCode || ''),
    bankAccount: String(rawConfig.bankAccount || ''),
    bankAccountName: String(rawConfig.bankAccountName || ''),
    note: String(rawConfig.note || ''),
  };

  const bank = BANKS.find(b => b.bin === config.bankCode) || null;
  const invoiceNo = generateInvoiceNo(classData.classId, from, to);

  return {
    invoiceNo,
    issuedAt: new Date(),
    class: {
      classId: String(classData.classId || ''),
      name: String(classData.name || ''),
      semester: String(classData.semester || ''),
      year: classData.year === undefined ? null : classData.year,
      block: classData.block === undefined ? null : classData.block,
      instructorCode: String(classData.instructorCode || ''),
      studentCount: Array.isArray(classData.students) ? classData.students.length : 0,
    },
    period: { from, to, label: buildPeriodLabel(from, to) },
    config,
    bank,
    branding: {
      logoDataUrl: String((branding && branding.logoDataUrl) || ''),
      subtext: String((branding && branding.subtext) || ''),
      primaryColor: String((branding && branding.primaryColor) || '#FF6C00'),
    },
    rows,
    totals,
    voucher: voucher ? { ...voucher, label: buildVoucherLabel(voucher) } : null,
    amountInWords: numberToVietnameseWords(totals.totalAmount),
    // Không sinh QR khi tổng tiền bằng 0 — QR không có số tiền dễ gây hiểu nhầm
    qrUrl:
      totals.totalAmount > 0
        ? buildVietQrUrl({
            bankCode: config.bankCode,
            bankAccount: config.bankAccount,
            bankAccountName: config.bankAccountName,
            amount: totals.totalAmount,
            addInfo: invoiceNo,
          })
        : null,
  };
}

module.exports = {
  numberToVietnameseWords,
  BANKS,
  buildVietQrUrl,
  generateInvoiceNo,
  parseDateRange,
  filterSessionsByRange,
  parseVoucher,
  buildInvoiceData,
};
