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

const SEMESTER_LABELS = { spring: 'Spring', summer: 'Summer', fall: 'Fall' };

/**
 * Định dạng ngày dd/mm/yyyy cho ô Excel
 * @param {Date|string} date
 * @returns {string}
 */
function formatInvoiceDate(date) {
  const parsed = date instanceof Date ? date : new Date(date);
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${parsed.getFullYear()}`;
}

/**
 * Tạo workbook Excel cho hóa đơn (bảng kê học phí)
 * @param {object} invoiceData - kết quả của buildInvoiceData()
 * @returns {Buffer} Buffer file .xlsx
 */
function createInvoiceWorkbook(invoiceData) {
  const data = invoiceData || {};
  const cls = data.class || {};
  const config = data.config || {};
  const totals = data.totals || { sessionCount: 0, totalHours: 0, totalAmount: 0 };
  const rows = Array.isArray(data.rows) ? data.rows : [];

  const semesterLabel = SEMESTER_LABELS[cls.semester] || '';
  const periodParts = [semesterLabel, cls.year || '', cls.block ? `Block ${cls.block}` : '']
    .filter(Boolean)
    .join(' ');

  const sheet = [
    [config.centerName || 'BẢNG KÊ HỌC PHÍ'],
    ['BẢNG KÊ HỌC PHÍ'],
    [''],
    [
      'Số hóa đơn:',
      data.invoiceNo || '',
      '',
      'Ngày xuất:',
      formatInvoiceDate(data.issuedAt || new Date()),
    ],
    ['Lớp:', cls.name || '', '', 'Kỳ học:', periodParts],
    [
      'Giảng viên:',
      cls.instructorCode || '',
      '',
      'Kỳ thanh toán:',
      (data.period && data.period.label) || '',
    ],
    ['Kính gửi:', config.payerName || '', '', 'Điện thoại:', config.payerPhone || ''],
    ['Địa chỉ:', config.payerAddress || ''],
    [''],
    ['STT', 'Ngày', 'Thời lượng (giờ)', 'Sĩ số', 'Đơn giá/giờ', 'Thành tiền'],
  ];

  rows.forEach(row => {
    sheet.push([
      row.index,
      formatInvoiceDate(row.date),
      row.durationHours,
      `${row.presentCount}/${row.totalStudents}`,
      row.hourlyRate,
      row.totalCost,
    ]);
  });

  sheet.push(['']);
  sheet.push([
    '',
    'TỔNG CỘNG',
    totals.totalHours,
    `${totals.sessionCount} buổi`,
    '',
    totals.totalAmount,
  ]);
  sheet.push(['Bằng chữ:', data.amountInWords || '']);

  if (config.bankAccount) {
    sheet.push(['']);
    sheet.push(['THÔNG TIN CHUYỂN KHOẢN']);
    sheet.push([
      'Ngân hàng:',
      data.bank ? `${data.bank.shortName} - ${data.bank.name}` : config.bankCode,
    ]);
    sheet.push(['Số tài khoản:', config.bankAccount]);
    sheet.push(['Chủ tài khoản:', config.bankAccountName || '']);
    sheet.push(['Nội dung:', data.invoiceNo || '']);
    if (data.qrUrl) sheet.push(['Mã QR:', data.qrUrl]);
  }

  if (config.note) {
    sheet.push(['']);
    sheet.push(['Ghi chú:', config.note]);
  }

  const ws = XLSX.utils.aoa_to_sheet(sheet);
  ws['!cols'] = [{ wch: 16 }, { wch: 26 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 18 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hóa đơn');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  readExcelFile,
  findMSSVColumnIndex,
  findNameColumnIndex,
  createTemplateWorkbook,
  createResultsWorkbook,
  createInvoiceWorkbook,
};
