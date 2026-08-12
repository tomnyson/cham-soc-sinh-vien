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

module.exports = {
  numberToVietnameseWords,
};
