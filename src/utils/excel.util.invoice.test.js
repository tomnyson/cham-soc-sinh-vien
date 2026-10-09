const XLSX = require('xlsx');
const { createInvoiceWorkbook } = require('./excel.util');
const { buildInvoiceData } = require('./invoice.util');

const invoiceData = buildInvoiceData({
  classData: {
    classId: 'class_1782608848247',
    name: 'SOF308',
    semester: 'fall',
    year: 2026,
    instructorCode: 'HungNX',
    students: [{ mssv: 'SV01' }],
    invoiceConfig: {
      centerName: 'Trung tâm ABC',
      payerName: 'Phụ huynh Nguyễn Văn A',
      bankCode: '970436',
      bankAccount: '0011001234567',
      bankAccountName: 'NGUYEN VAN A',
    },
  },
  sessions: [
    {
      date: new Date(2026, 7, 1, 10, 0),
      durationHours: 2,
      hourlyRate: 200000,
      totalCost: 400000,
      records: [{ mssv: 'SV01', status: 'present' }],
    },
    {
      date: new Date(2026, 7, 10, 11, 36),
      durationHours: 2,
      hourlyRate: 200000,
      totalCost: 400000,
      records: [{ mssv: 'SV01', status: 'present' }],
    },
  ],
  from: null,
  to: null,
  branding: { subtext: 'FPT Polytechnic', primaryColor: '#FF6C00', logoDataUrl: '' },
});

function readSheetText(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return { wb, ws, rows: XLSX.utils.sheet_to_json(ws, { header: 1 }) };
}

describe('createInvoiceWorkbook', () => {
  it('trả về Buffer đọc lại được bằng SheetJS', () => {
    const buffer = createInvoiceWorkbook(invoiceData);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    const { wb } = readSheetText(buffer);
    expect(wb.SheetNames).toContain('Hóa đơn');
  });

  it('chứa số hóa đơn, tên lớp và tên trung tâm', () => {
    const { rows } = readSheetText(createInvoiceWorkbook(invoiceData));
    const flat = rows.flat().filter(Boolean).map(String).join(' | ');
    expect(flat).toContain(invoiceData.invoiceNo);
    expect(flat).toContain('SOF308');
    expect(flat).toContain('Trung tâm ABC');
    expect(flat).toContain('Phụ huynh Nguyễn Văn A');
  });

  it('chứa header bảng và đúng số dòng buổi học', () => {
    const { rows } = readSheetText(createInvoiceWorkbook(invoiceData));
    const headerIndex = rows.findIndex(r => r[0] === 'STT' && r[1] === 'Ngày');
    expect(headerIndex).toBeGreaterThan(-1);
    expect(rows[headerIndex + 1][0]).toBe(1);
    expect(rows[headerIndex + 2][0]).toBe(2);
  });

  it('chứa tổng tiền dạng số và tiền bằng chữ', () => {
    const { rows } = readSheetText(createInvoiceWorkbook(invoiceData));
    const flat = rows.flat();
    expect(flat).toContain(800000);
    expect(flat.map(String).join(' ')).toContain('Tám trăm nghìn đồng chẵn');
  });

  it('chứa thông tin chuyển khoản và link VietQR dạng text', () => {
    const { rows } = readSheetText(createInvoiceWorkbook(invoiceData));
    const flat = rows.flat().filter(Boolean).map(String).join(' | ');
    expect(flat).toContain('0011001234567');
    expect(flat).toContain('Vietcombank');
    expect(flat).toContain('img.vietqr.io');
  });

  it('không có voucher thì chỉ có một dòng TỔNG CỘNG', () => {
    const { rows } = readSheetText(createInvoiceWorkbook(invoiceData));
    const labels = rows.flat().filter(Boolean).map(String);
    expect(labels).toContain('TỔNG CỘNG');
    expect(labels).not.toContain('TẠM TÍNH');
    expect(labels).not.toContain('TỔNG THANH TOÁN');
  });

  it('có voucher thì hiện tạm tính, dòng giảm giá âm và tổng thanh toán', () => {
    const withVoucher = buildInvoiceData({
      classData: { classId: 'c1', name: 'SOF308' },
      sessions: [
        { date: new Date(2026, 7, 1), durationHours: 2, hourlyRate: 200000, totalCost: 400000 },
        { date: new Date(2026, 7, 10), durationHours: 2, hourlyRate: 200000, totalCost: 400000 },
      ],
      from: null,
      to: null,
      branding: null,
      voucher: { code: 'GIAM10', type: 'percent', value: 10 },
    });

    const { rows } = readSheetText(createInvoiceWorkbook(withVoucher));
    const flat = rows.flat();
    const labels = flat.filter(Boolean).map(String);

    expect(labels).toContain('TẠM TÍNH');
    expect(labels).toContain('GIAM10 (giảm 10%)');
    expect(labels).toContain('TỔNG THANH TOÁN');
    expect(flat).toContain(800000); // tạm tính
    expect(flat).toContain(-80000); // giảm giá ghi âm
    expect(flat).toContain(720000); // phải trả
    expect(labels.join(' ')).toContain('Bảy trăm hai mươi nghìn đồng chẵn');
  });

  it('xử lý hóa đơn rỗng không crash', () => {
    const empty = buildInvoiceData({
      classData: { classId: 'c1', name: 'X' },
      sessions: [],
      from: null,
      to: null,
      branding: null,
    });
    const { rows } = readSheetText(createInvoiceWorkbook(empty));
    expect(rows.flat().map(String).join(' ')).toContain('Không đồng');
  });
});

describe('createInvoiceWorkbook - thanh toán và học viên', () => {
  const classData = {
    classId: 'c1',
    name: 'SOF308',
    students: [
      { mssv: 'SV01', name: 'Nguyễn Văn A' },
      { mssv: 'SV02', name: 'Trần Thị B' },
    ],
  };
  const sessions = [
    {
      date: new Date(2026, 7, 1),
      durationHours: 2,
      hourlyRate: 200000,
      totalCost: 400000,
      records: [
        { mssv: 'SV01', status: 'present' },
        { mssv: 'SV02', status: 'absent' },
      ],
    },
    {
      date: new Date(2026, 7, 10),
      durationHours: 2,
      hourlyRate: 200000,
      totalCost: 400000,
      records: [
        { mssv: 'SV01', status: 'absent' },
        { mssv: 'SV02', status: 'present' },
      ],
    },
  ];
  const payments = [
    { mssv: 'SV01', amount: 150000, paidAt: new Date(2026, 7, 12), method: 'transfer', note: 'Đợt 1' },
  ];

  it('không có khoản thu thì không hiện dòng đã thanh toán', () => {
    const { rows } = readSheetText(createInvoiceWorkbook(invoiceData));
    const labels = rows.flat().filter(Boolean).map(String);
    expect(labels).not.toContain('ĐÃ THANH TOÁN');
    expect(labels).not.toContain('LỊCH SỬ THANH TOÁN');
    expect(rows.find(r => r[0] === 'STT')).toHaveLength(6);
  });

  it('cả lớp: hiện đã thanh toán (số âm), còn lại và lịch sử thu', () => {
    const data = buildInvoiceData({ classData, sessions, payments });
    const { rows } = readSheetText(createInvoiceWorkbook(data));
    const flat = rows.flat();
    const labels = flat.filter(Boolean).map(String);

    expect(labels).toContain('ĐÃ THANH TOÁN');
    expect(labels).toContain('CÒN LẠI');
    expect(flat).toContain(-150000);
    expect(flat).toContain(650000);
    expect(labels).toContain('LỊCH SỬ THANH TOÁN');
    expect(labels).toContain('Chuyển khoản');
    expect(labels).toContain('Đợt 1');
    expect(labels.join(' ')).toContain('Sáu trăm năm mươi nghìn đồng chẵn');
  });

  it('theo học viên: có dòng Học viên và cột Điểm danh', () => {
    const data = buildInvoiceData({ classData, sessions, payments, mssv: 'SV01' });
    const { rows } = readSheetText(createInvoiceWorkbook(data));
    const labels = rows.flat().filter(Boolean).map(String);

    expect(labels).toContain('SV01 - Nguyễn Văn A');
    const header = rows.find(r => r[0] === 'STT');
    expect(header).toEqual(['STT', 'Ngày', 'Thời lượng (giờ)', 'Sĩ số', 'Điểm danh', 'Đơn giá/giờ', 'Thành tiền']);
    const headerIndex = rows.indexOf(header);
    expect(rows[headerIndex + 1][4]).toBe('Có mặt');
    expect(rows[headerIndex + 1][6]).toBe(200000);
    expect(rows[headerIndex + 2][4]).toBe('Vắng');
    expect(rows.flat()).toContain(250000); // còn lại = 400.000 - 150.000
  });
});
