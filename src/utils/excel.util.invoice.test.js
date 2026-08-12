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
