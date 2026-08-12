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
    if (groups[i] === 0) continue;
    const text = readTriple(groups[i], i === highestIndex);
    chunks.push(`${text}${SCALES[i] || ''}`);
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

module.exports = {
  numberToVietnameseWords,
  BANKS,
  buildVietQrUrl,
  generateInvoiceNo,
};
