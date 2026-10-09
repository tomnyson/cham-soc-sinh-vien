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

const ATTENDANCE_LABELS = { present: 'Có mặt', absent: 'Vắng' };

/**
 * Chèn ô "Điểm danh" vào vị trí cột thứ 5 khi hóa đơn in cho một học viên.
 * @param {Array} cells - 6 ô theo bố cục cả lớp
 * @param {boolean} withAttendance
 * @param {*} attendanceCell
 * @returns {Array}
 */
function withAttendanceColumn(cells, withAttendance, attendanceCell = '') {
  return withAttendance ? [...cells.slice(0, 4), attendanceCell, ...cells.slice(4)] : cells;
}

/**
 * Các dòng tổng: tổng cộng / tạm tính, voucher, tổng thanh toán, đã thanh toán, còn lại.
 * @param {object} data - kết quả của buildInvoiceData()
 * @param {boolean} withAttendance
 * @returns {Array<Array>}
 */
function buildInvoiceTotalRows(data, withAttendance) {
  const totals = data.totals || { sessionCount: 0, totalHours: 0, totalAmount: 0 };
  const discountAmount = totals.discountAmount || 0;
  const paidAmount = totals.paidAmount || 0;
  const subtotal = totals.subtotal === undefined ? totals.totalAmount : totals.subtotal;
  const line = (label, amount) => withAttendanceColumn(['', label, '', '', '', amount], withAttendance);

  const lines = [
    [''],
    withAttendanceColumn(
      [
        '',
        discountAmount > 0 ? 'TẠM TÍNH' : 'TỔNG CỘNG',
        totals.totalHours,
        `${totals.sessionCount} buổi`,
        '',
        discountAmount > 0 ? subtotal : totals.totalAmount,
      ],
      withAttendance
    ),
  ];

  if (discountAmount > 0) {
    lines.push(line((data.voucher && data.voucher.label) || 'Giảm giá', -discountAmount));
    lines.push(line('TỔNG THANH TOÁN', totals.totalAmount));
  }

  if (paidAmount > 0) {
    const remaining = totals.remainingAmount || 0;
    lines.push(line('ĐÃ THANH TOÁN', -paidAmount));
    lines.push(line(remaining < 0 ? 'TRẢ THỪA' : 'CÒN LẠI', Math.abs(remaining)));
  }

  return lines;
}

/**
 * Bảng lịch sử các khoản đã thu trên hóa đơn.
 * @param {Array} payments - invoice.payments
 * @returns {Array<Array>}
 */
function buildPaymentHistoryRows(payments) {
  const list = Array.isArray(payments) ? payments : [];
  if (!list.length) return [];
  return [
    [''],
    ['LỊCH SỬ THANH TOÁN'],
    ['Ngày thu', 'Học viên', 'Hình thức', 'Số tiền', 'Ghi chú'],
    ...list.map(p => [
      formatInvoiceDate(p.paidAt),
      p.studentName ? `${p.mssv} - ${p.studentName}` : p.mssv,
      p.methodLabel,
      p.amount,
      p.note || '',
    ]),
  ];
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
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const student = data.student || null;

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
  ];

  if (student) {
    sheet.push(['Học viên:', student.name ? `${student.mssv} - ${student.name}` : student.mssv]);
  }

  sheet.push(['']);
  sheet.push(
    withAttendanceColumn(
      ['STT', 'Ngày', 'Thời lượng (giờ)', 'Sĩ số', 'Đơn giá/giờ', 'Thành tiền'],
      Boolean(student),
      'Điểm danh'
    )
  );

  rows.forEach(row => {
    sheet.push(
      withAttendanceColumn(
        [
          row.index,
          formatInvoiceDate(row.date),
          row.durationHours,
          `${row.presentCount}/${row.totalStudents}`,
          row.hourlyRate,
          row.totalCost,
        ],
        Boolean(student),
        ATTENDANCE_LABELS[row.attendanceStatus] || ''
      )
    );
  });

  sheet.push(...buildInvoiceTotalRows(data, Boolean(student)));
  sheet.push(['Bằng chữ:', data.amountInWords || '']);
  sheet.push(...buildPaymentHistoryRows(data.payments));

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
  ws['!cols'] = withAttendanceColumn(
    [{ wch: 16 }, { wch: 26 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 18 }],
    Boolean(student),
    { wch: 12 }
  );

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
