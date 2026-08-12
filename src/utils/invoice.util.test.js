const {
  numberToVietnameseWords,
  BANKS,
  buildVietQrUrl,
  generateInvoiceNo,
} = require('./invoice.util');

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
    expect(numberToVietnameseWords(1015000)).toBe(
      'Một triệu không trăm mười lăm nghìn đồng chẵn'
    );
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
      addInfo: 'HD-848247-202608'
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
      addInfo: 'Học phí tháng 8'
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
