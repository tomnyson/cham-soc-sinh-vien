const XLSX = require('xlsx');
const { normalizeString } = require('./string.util');

/**
 * Đọc file Excel và trả về dữ liệu dạng mảng 2 chiều
 * @param {string} filePath - Đường dẫn đến file Excel
 * @returns {Array<Array>} Dữ liệu từ file Excel
 */
function readExcelFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
}

/**
 * Tìm index của cột MSSV trong headers
 * @param {Array} headers - Mảng header
 * @returns {number} Index của cột MSSV hoặc -1
 */
function findMSSVColumnIndex(headers) {
  return headers.findIndex(h => {
    if (!h) return false;
    const normalized = normalizeString(h);
    return (
      normalized.includes('mssv') ||
      normalized.includes('masinhvien') ||
      normalized.includes('masv') ||
      normalized === 'masinhvien' ||
      normalized === 'ma'
    );
  });
}

/**
 * Tìm index của cột tên trong headers
 * @param {Array} headers - Mảng header
 * @returns {number} Index của cột tên hoặc -1
 */
function findNameColumnIndex(headers) {
  return headers.findIndex(h => {
    if (!h) return false;
    const normalized = normalizeString(h);
    return (
      normalized.includes('ten') ||
      normalized.includes('hova') ||
      normalized.includes('hovaten') ||
      normalized.includes('ho') ||
      normalized === 'ten' ||
      normalized === 'hovaten'
    );
  });
}

/**
 * Tạo workbook Excel từ dữ liệu
 * @param {Object} params - Tham số
 * @param {Array} params.students - Danh sách sinh viên
 * @param {Object} params.weights - Trọng số điểm
 * @param {string} params.profileName - Tên profile
 * @param {number} params.passThreshold - Ngưỡng qua môn
 * @returns {Buffer} Excel buffer
 */
function createTemplateWorkbook({ students, weights, profileName, passThreshold }) {
  // Sắp xếp các cột theo thứ tự: Lab, Quiz, GD
  const sortWeightColumns = columns =>
    columns.sort((a, b) => {
      const getOrder = key => {
        if (key.includes('Lab')) return 1;
        if (key.includes('Quiz')) return 2;
        if (key.includes('GD')) return 3;
        return 4;
      };
      const orderDiff = getOrder(a) - getOrder(b);
      if (orderDiff !== 0) return orderDiff;
      const numA = parseInt(a.match(/\d+/)?.[0] || 0, 10);
      const numB = parseInt(b.match(/\d+/)?.[0] || 0, 10);
      return numA - numB;
    });

  const weightColumns = sortWeightColumns(Object.keys(weights));

  // Tạo header row
  const headers = ['Mã sinh viên', 'Họ và tên'];
  weightColumns.forEach(col => {
    headers.push(`${col} (${weights[col]}%)`);
  });

  // Tạo data rows
  const rows = [headers];
  students.forEach(student => {
    const row = [student.mssv, student.name];
    weightColumns.forEach(() => row.push(''));
    rows.push(row);
  });

  // Tạo worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  const colWidths = [
    { wch: 15 }, // MSSV
    { wch: 25 }, // Họ và tên
  ];
  weightColumns.forEach(() => {
    colWidths.push({ wch: 12 });
  });
  ws['!cols'] = colWidths;

  // Tạo workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bảng điểm');

  // Tạo sheet hướng dẫn
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);
  const instructionData = [
    ['HƯỚNG DẪN SỬ DỤNG'],
    [''],
    ['1. Nhập điểm cho sinh viên vào các cột tương ứng'],
    ['2. Điểm được tính theo thang 100'],
    ['3. Để trống hoặc điền 0 nếu sinh viên không có điểm'],
    ['4. Sau khi nhập xong, upload file này vào tool để tính tổng điểm'],
    [''],
    ['Thông tin Profile:'],
    [`Tên: ${profileName || 'Không rõ'}`],
    [`Ngưỡng qua môn: ${passThreshold || 3} điểm`],
    [`Tổng trọng số: ${totalWeight.toFixed(1)}%`],
    [''],
    ['Danh sách trọng số:'],
  ];

  weightColumns.forEach(col => {
    instructionData.push([`${col}: ${weights[col]}%`]);
  });

  const wsInstruction = XLSX.utils.aoa_to_sheet(instructionData);
  XLSX.utils.book_append_sheet(wb, wsInstruction, 'Hướng dẫn');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Tạo workbook kết quả
 * @param {Array} results - Danh sách kết quả
 * @returns {Buffer} Excel buffer
 */
function createResultsWorkbook(results) {
  const exportData = results.map((student, index) => ({
    STT: index + 1,
    MSSV: student.mssv,
    'Họ và tên': student.name,
    'Điểm tổng': student.totalScore,
    'Trạng thái': student.passed ? 'Đạt' : 'Chưa đạt',
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kết quả');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  readExcelFile,
  findMSSVColumnIndex,
  findNameColumnIndex,
  createTemplateWorkbook,
  createResultsWorkbook,
};
