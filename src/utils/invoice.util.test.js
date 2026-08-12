const {
  numberToVietnameseWords,
  BANKS,
  buildVietQrUrl,
  generateInvoiceNo,
  parseDateRange,
  filterSessionsByRange,
  buildInvoiceData,
} = require('./invoice.util');

const makeSession = (dateIso, overrides = {}) => ({
  date: new Date(dateIso),
  durationHours: 2,
  hourlyRate: 200000,
  totalCost: 400000,
  records: [
    { mssv: 'SV01', status: 'present' },
    { mssv: 'SV02', status: 'absent' },
  ],
  ...overrides,
});

describe('numberToVietnameseWords', () => {
  it('đọc số 0', () => {
    expect(numberToVietnameseWords(0)).toBe('Không đồng');
  });

  it('đọc số hàng trăm', () => {
    expect(numberToVietnameseWords(105)).toBe('Một trăm linh năm đồng chẵn');
  });

  it('đọc số hàng nghìn tròn', () => {
    expect(numberToVietnameseWords(400000)).toBe('Bốn trăm nghìn đồng chẵn');
  });

  it('đọc số hàng triệu tròn', () => {
    expect(numberToVietnameseWords(6000000)).toBe('Sáu triệu đồng chẵn');
  });

  it('đọc "mốt" khi hàng đơn vị là 1 và hàng chục >= 2', () => {
    expect(numberToVietnameseWords(21000000)).toBe('Hai mươi mốt triệu đồng chẵn');
  });

  it('đọc "lăm" khi hàng đơn vị là 5 và có hàng chục', () => {
    expect(numberToVietnameseWords(15)).toBe('Mười lăm đồng chẵn');
  });

  it('đọc "tư" khi hàng đơn vị là 4 và hàng chục >= 2', () => {
    expect(numberToVietnameseWords(24)).toBe('Hai mươi tư đồng chẵn');
  });

  it('chèn "không trăm" cho nhóm giữa', () => {
    expect(numberToVietnameseWords(1015000)).toBe('Một triệu không trăm mười lăm nghìn đồng chẵn');
  });

  it('đọc số hàng tỷ', () => {
    expect(numberToVietnameseWords(2000000000)).toBe('Hai tỷ đồng chẵn');
  });

  it('làm tròn số thập phân và xử lý đầu vào không hợp lệ', () => {
    expect(numberToVietnameseWords(1000.6)).toBe('Một nghìn đồng chẵn');
    expect(numberToVietnameseWords(NaN)).toBe('Không đồng');
    expect(numberToVietnameseWords(-5)).toBe('Không đồng');
    expect(numberToVietnameseWords(undefined)).toBe('Không đồng');
  });
});

describe('BANKS', () => {
  it('chứa các ngân hàng lớn với BIN đúng', () => {
    const byShortName = Object.fromEntries(BANKS.map(b => [b.shortName, b.bin]));
    expect(byShortName.Vietcombank).toBe('970436');
    expect(byShortName.Techcombank).toBe('970407');
    expect(byShortName.MBBank).toBe('970422');
    expect(BANKS.length).toBeGreaterThanOrEqual(15);
  });

  it('mọi BIN đều là 6 chữ số và không trùng nhau', () => {
    const bins = BANKS.map(b => b.bin);
    bins.forEach(bin => expect(bin).toMatch(/^\d{6}$/));
    expect(new Set(bins).size).toBe(bins.length);
  });
});

describe('buildVietQrUrl', () => {
  it('trả null khi thiếu mã ngân hàng', () => {
    expect(buildVietQrUrl({ bankAccount: '123456', amount: 1000 })).toBeNull();
  });

  it('trả null khi thiếu số tài khoản', () => {
    expect(buildVietQrUrl({ bankCode: '970436', amount: 1000 })).toBeNull();
  });

  it('dựng URL đúng định dạng VietQR', () => {
    const url = buildVietQrUrl({
      bankCode: '970436',
      bankAccount: '0011001234567',
      bankAccountName: 'NGUYEN VAN A',
      amount: 6000000,
      addInfo: 'HD-848247-202608',
    });
    expect(url).toContain('https://img.vietqr.io/image/970436-0011001234567-compact2.png');
    expect(url).toContain('amount=6000000');
    expect(url).toContain('addInfo=HD-848247-202608');
    expect(url).toContain('accountName=NGUYEN%20VAN%20A');
  });

  it('encode nội dung có dấu tiếng Việt', () => {
    const url = buildVietQrUrl({
      bankCode: '970436',
      bankAccount: '123',
      addInfo: 'Học phí tháng 8',
    });
    expect(url).toContain('addInfo=H%E1%BB%8Dc%20ph%C3%AD%20th%C3%A1ng%208');
  });

  it('bỏ qua amount khi không hợp lệ hoặc bằng 0', () => {
    const url = buildVietQrUrl({ bankCode: '970436', bankAccount: '123', amount: 0 });
    expect(url).not.toContain('amount=');
  });
});

describe('generateInvoiceNo', () => {
  it('dựng số hóa đơn từ classId và khoảng ngày', () => {
    const from = new Date(2026, 6, 1);
    const to = new Date(2026, 7, 10);
    expect(generateInvoiceNo('class_1782608848247', from, to)).toBe('HD-848247-202607-202608');
  });

  it('dùng ALL khi thiếu đầu khoảng ngày', () => {
    const to = new Date(2026, 7, 10);
    expect(generateInvoiceNo('class_1782608848247', null, to)).toBe('HD-848247-ALL-202608');
    expect(generateInvoiceNo('class_1782608848247', null, null)).toBe('HD-848247-ALL-ALL');
  });

  it('tất định — cùng đầu vào cho cùng kết quả', () => {
    const from = new Date(2026, 6, 1);
    expect(generateInvoiceNo('abc', from, null)).toBe(generateInvoiceNo('abc', from, null));
  });

  it('xử lý classId ngắn hơn 6 ký tự', () => {
    expect(generateInvoiceNo('ab', null, null)).toBe('HD-AB-ALL-ALL');
  });
});

describe('parseDateRange', () => {
  it('trả null cho cả hai khi đầu vào rỗng', () => {
    expect(parseDateRange('', '')).toEqual({ from: null, to: null });
    expect(parseDateRange(undefined, undefined)).toEqual({ from: null, to: null });
  });

  it('đẩy "to" tới cuối ngày', () => {
    const { to } = parseDateRange('', '2026-08-10');
    expect(to.getHours()).toBe(23);
    expect(to.getMinutes()).toBe(59);
    expect(to.getSeconds()).toBe(59);
    expect(to.getMilliseconds()).toBe(999);
  });

  it('đặt "from" về đầu ngày', () => {
    const { from } = parseDateRange('2026-07-01', '');
    expect(from.getHours()).toBe(0);
    expect(from.getMinutes()).toBe(0);
  });

  it('bỏ qua ngày không hợp lệ', () => {
    expect(parseDateRange('khong-phai-ngay', 'abc')).toEqual({ from: null, to: null });
  });
});

describe('filterSessionsByRange', () => {
  const sessions = [
    makeSession('2026-07-01T10:00:00'),
    makeSession('2026-07-15T10:00:00'),
    makeSession('2026-08-10T11:36:00'),
  ];

  it('trả toàn bộ khi không có khoảng lọc', () => {
    expect(filterSessionsByRange(sessions, null, null)).toHaveLength(3);
  });

  it('lọc theo cận dưới', () => {
    const { from } = parseDateRange('2026-07-15', '');
    expect(filterSessionsByRange(sessions, from, null)).toHaveLength(2);
  });

  it('lọc theo cận trên, bao gồm cả buổi trong ngày cuối', () => {
    const { to } = parseDateRange('', '2026-08-10');
    expect(filterSessionsByRange(sessions, null, to)).toHaveLength(3);
  });

  it('lọc theo cả hai cận', () => {
    const { from, to } = parseDateRange('2026-07-10', '2026-07-20');
    expect(filterSessionsByRange(sessions, from, to)).toHaveLength(1);
  });

  it('trả mảng rỗng khi không buổi nào khớp', () => {
    const { from, to } = parseDateRange('2026-01-01', '2026-01-31');
    expect(filterSessionsByRange(sessions, from, to)).toEqual([]);
  });

  it('không mutate mảng đầu vào', () => {
    const original = [...sessions];
    filterSessionsByRange(sessions, null, null);
    expect(sessions).toEqual(original);
  });
});

describe('buildInvoiceData', () => {
  const classData = {
    classId: 'class_1782608848247',
    name: 'SOF308',
    semester: 'fall',
    year: 2026,
    block: 1,
    instructorCode: 'HungNX',
    students: [{ mssv: 'SV01' }, { mssv: 'SV02' }],
    invoiceConfig: {
      centerName: 'Trung tâm ABC',
      payerName: 'Phụ huynh Nguyễn Văn A',
      bankCode: '970436',
      bankAccount: '0011001234567',
      bankAccountName: 'NGUYEN VAN A',
    },
  };
  const branding = { logoDataUrl: '', subtext: 'FPT Polytechnic', primaryColor: '#FF6C00' };

  it('cộng đúng tổng số buổi, tổng giờ và tổng tiền', () => {
    const sessions = [makeSession('2026-08-01T10:00:00'), makeSession('2026-08-10T10:00:00')];
    const result = buildInvoiceData({ classData, sessions, from: null, to: null, branding });
    expect(result.totals.sessionCount).toBe(2);
    expect(result.totals.totalHours).toBe(4);
    expect(result.totals.totalAmount).toBe(800000);
    expect(result.amountInWords).toBe('Tám trăm nghìn đồng chẵn');
  });

  it('giữ nguyên hourlyRate snapshot của từng buổi', () => {
    const sessions = [
      makeSession('2026-08-01T10:00:00', { hourlyRate: 200000, totalCost: 400000 }),
      makeSession('2026-08-10T10:00:00', { hourlyRate: 300000, totalCost: 600000 }),
    ];
    const result = buildInvoiceData({ classData, sessions, from: null, to: null, branding });
    expect(result.rows[0].hourlyRate).toBe(200000);
    expect(result.rows[1].hourlyRate).toBe(300000);
    expect(result.totals.totalAmount).toBe(1000000);
  });

  it('đếm đúng sĩ số có mặt trên tổng số bản ghi', () => {
    const result = buildInvoiceData({
      classData,
      sessions: [makeSession('2026-08-01T10:00:00')],
      from: null,
      to: null,
      branding,
    });
    expect(result.rows[0].presentCount).toBe(1);
    expect(result.rows[0].totalStudents).toBe(2);
  });

  it('đánh số thứ tự tăng dần theo ngày', () => {
    const sessions = [makeSession('2026-08-10T10:00:00'), makeSession('2026-08-01T10:00:00')];
    const result = buildInvoiceData({ classData, sessions, from: null, to: null, branding });
    expect(result.rows.map(r => r.index)).toEqual([1, 2]);
    expect(result.rows[0].date.getTime()).toBeLessThan(result.rows[1].date.getTime());
  });

  it('sinh qrUrl khi đã cấu hình ngân hàng', () => {
    const result = buildInvoiceData({
      classData,
      sessions: [makeSession('2026-08-01T10:00:00')],
      from: null,
      to: null,
      branding,
    });
    expect(result.qrUrl).toContain('970436-0011001234567');
    expect(result.qrUrl).toContain('amount=400000');
    expect(result.qrUrl).toContain(`addInfo=${result.invoiceNo}`);
  });

  it('qrUrl là null khi chưa cấu hình ngân hàng', () => {
    const result = buildInvoiceData({
      classData: { ...classData, invoiceConfig: { centerName: 'X' } },
      sessions: [makeSession('2026-08-01T10:00:00')],
      from: null,
      to: null,
      branding,
    });
    expect(result.qrUrl).toBeNull();
  });

  it('xử lý lớp không có buổi nào', () => {
    const result = buildInvoiceData({ classData, sessions: [], from: null, to: null, branding });
    expect(result.rows).toEqual([]);
    expect(result.totals).toEqual({ sessionCount: 0, totalHours: 0, totalAmount: 0 });
    expect(result.amountInWords).toBe('Không đồng');
    expect(result.qrUrl).toBeNull();
  });

  it('xử lý lớp chưa có invoiceConfig', () => {
    const result = buildInvoiceData({
      classData: { classId: 'c1', name: 'X' },
      sessions: [],
      from: null,
      to: null,
      branding: null,
    });
    expect(result.config.centerName).toBe('');
    expect(result.branding.subtext).toBe('');
    expect(result.qrUrl).toBeNull();
  });

  it('dựng nhãn khoảng thời gian', () => {
    const { from, to } = parseDateRange('2026-07-01', '2026-08-10');
    const withRange = buildInvoiceData({ classData, sessions: [], from, to, branding });
    expect(withRange.period.label).toBe('01/07/2026 – 10/08/2026');

    const noRange = buildInvoiceData({ classData, sessions: [], from: null, to: null, branding });
    expect(noRange.period.label).toBe('Toàn bộ');
  });
});
