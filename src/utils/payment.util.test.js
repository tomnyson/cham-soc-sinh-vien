const {
  PAYMENT_METHODS,
  allocateSessionCost,
  buildStudentLedger,
  sumActivePayments,
  parsePaymentInput,
} = require('./payment.util');

const session = (totalCost, mssvList, extra = {}) => ({
  date: new Date(2026, 9, 1, 10, 0),
  durationHours: 1.5,
  hourlyRate: totalCost / 1.5,
  totalCost,
  records: mssvList.map(mssv => ({ mssv, status: 'present' })),
  ...extra,
});

describe('allocateSessionCost', () => {
  it('chia đều cho mọi học viên trong buổi, kể cả vắng', () => {
    const s = session(225000, ['SV01', 'SV02', 'SV03']);
    s.records[2].status = 'absent';
    const shares = allocateSessionCost(s);
    expect(shares.get('SV01')).toBe(75000);
    expect(shares.get('SV02')).toBe(75000);
    expect(shares.get('SV03')).toBe(75000);
  });

  it('phần dư cộng 1đ theo mssv tăng dần, tổng luôn bằng totalCost', () => {
    const shares = allocateSessionCost(session(100000, ['SV03', 'SV01', 'SV02']));
    expect(shares.get('SV01')).toBe(33334);
    expect(shares.get('SV02')).toBe(33333);
    expect(shares.get('SV03')).toBe(33333);
    const total = [...shares.values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(100000);
  });

  it('bỏ qua mssv trùng lặp trong records', () => {
    const shares = allocateSessionCost(session(200000, ['SV01', 'SV01', 'SV02']));
    expect(shares.size).toBe(2);
    expect(shares.get('SV01')).toBe(100000);
  });

  it('trả Map rỗng khi buổi không có học viên', () => {
    expect(allocateSessionCost(session(150000, [])).size).toBe(0);
    expect(allocateSessionCost({ totalCost: 100000 }).size).toBe(0);
  });

  it('làm tròn totalCost lẻ về đồng', () => {
    const shares = allocateSessionCost(session(1000.6, ['SV01']));
    expect(shares.get('SV01')).toBe(1001);
  });
});

describe('sumActivePayments', () => {
  const payments = [
    { mssv: 'SV01', amount: 100000, status: 'active' },
    { mssv: 'SV01', amount: 50000, status: 'voided' },
    { mssv: 'SV02', amount: 70000 },
  ];

  it('cộng các khoản active (mặc định active khi thiếu status)', () => {
    expect(sumActivePayments(payments)).toBe(170000);
  });

  it('lọc theo mssv khi truyền vào', () => {
    expect(sumActivePayments(payments, 'SV01')).toBe(100000);
    expect(sumActivePayments(payments, 'SV09')).toBe(0);
  });

  it('chịu được đầu vào rỗng', () => {
    expect(sumActivePayments(null)).toBe(0);
  });
});

describe('buildStudentLedger', () => {
  const students = [
    { mssv: 'SV01', name: 'Nguyễn Văn A' },
    { mssv: 'SV02', name: 'Trần Thị B' },
    { mssv: 'SV04', name: 'Học viên mới' },
  ];
  const sessions = [
    session(200000, ['SV01', 'SV02']),
    session(300000, ['SV01', 'SV02', 'SV03']),
    session(90000, []),
  ];
  const payments = [
    { mssv: 'SV01', amount: 150000, status: 'active' },
    { mssv: 'SV01', amount: 999999, status: 'voided' },
    { mssv: 'SV02', amount: 250000, status: 'active' },
  ];

  const ledger = buildStudentLedger({ students, sessions, payments });
  const byMssv = Object.fromEntries(ledger.students.map(s => [s.mssv, s]));

  it('tính phát sinh / đã thu / còn nợ theo từng học viên', () => {
    expect(byMssv.SV01).toMatchObject({
      name: 'Nguyễn Văn A',
      inClass: true,
      sessionCount: 2,
      charged: 200000,
      paid: 150000,
      outstanding: 50000,
    });
  });

  it('cho phép trả thừa (còn nợ âm)', () => {
    expect(byMssv.SV02.outstanding).toBe(-50000);
  });

  it('học viên vào lớp sau không bị tính buổi cũ', () => {
    expect(byMssv.SV04).toMatchObject({ sessionCount: 0, charged: 0, outstanding: 0 });
  });

  it('học viên đã rời lớp vẫn còn nợ, đánh dấu inClass=false', () => {
    expect(byMssv.SV03).toMatchObject({ inClass: false, charged: 100000, outstanding: 100000 });
  });

  it('giữ thứ tự danh sách lớp, học viên ngoài lớp xếp sau', () => {
    expect(ledger.students.map(s => s.mssv)).toEqual(['SV01', 'SV02', 'SV04', 'SV03']);
  });

  it('tổng hợp cả lớp, tách riêng tiền chưa phân bổ', () => {
    expect(ledger.totals).toEqual({
      charged: 500000,
      paid: 400000,
      outstanding: 100000,
      unallocated: 90000,
    });
  });

  it('không mutate đầu vào', () => {
    const input = [{ mssv: 'SV01', name: 'A' }];
    const frozen = Object.freeze(input.map(s => Object.freeze({ ...s })));
    expect(() => buildStudentLedger({ students: frozen, sessions, payments })).not.toThrow();
  });
});

describe('parsePaymentInput', () => {
  const classStudents = [{ mssv: 'SV01', name: 'A' }];

  it('chuẩn hoá dữ liệu hợp lệ', () => {
    const { value, error } = parsePaymentInput(
      { mssv: ' SV01 ', amount: '500000', paidAt: '2026-10-09T09:30', method: 'transfer', note: ' Đợt 1 ' },
      classStudents
    );
    expect(error).toBe('');
    expect(value).toMatchObject({ mssv: 'SV01', amount: 500000, method: 'transfer', note: 'Đợt 1' });
    expect(value.paidAt).toBeInstanceOf(Date);
    expect(value.paidAt.getDate()).toBe(9);
  });

  it('mặc định hình thức tiền mặt và ngày thu là hiện tại', () => {
    const before = Date.now();
    const { value } = parsePaymentInput({ mssv: 'SV01', amount: 1000 }, classStudents);
    expect(value.method).toBe('cash');
    expect(value.paidAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it.each([
    [{ amount: 1000 }, 'Vui lòng chọn học viên.'],
    [{ mssv: 'SV99', amount: 1000 }, 'Học viên không thuộc lớp này.'],
    [{ mssv: 'SV01', amount: '' }, 'Số tiền phải là số nguyên lớn hơn 0.'],
    [{ mssv: 'SV01', amount: -5 }, 'Số tiền phải là số nguyên lớn hơn 0.'],
    [{ mssv: 'SV01', amount: 10.5 }, 'Số tiền phải là số nguyên lớn hơn 0.'],
    [{ mssv: 'SV01', amount: 1e12 }, 'Số tiền vượt quá giới hạn cho phép.'],
    [{ mssv: 'SV01', amount: 1000, paidAt: 'abc' }, 'Ngày thu không hợp lệ.'],
    [{ mssv: 'SV01', amount: 1000, method: 'bitcoin' }, 'Hình thức thu không hợp lệ.'],
    [{ mssv: 'SV01', amount: 1000, note: 'x'.repeat(301) }, 'Ghi chú tối đa 300 ký tự.'],
  ])('báo lỗi với %j', (body, message) => {
    const { value, error } = parsePaymentInput(body, classStudents);
    expect(value).toBeNull();
    expect(error).toBe(message);
  });

  it('có nhãn tiếng Việt cho mọi hình thức thu', () => {
    expect(PAYMENT_METHODS).toEqual({
      cash: 'Tiền mặt',
      transfer: 'Chuyển khoản',
      discount: 'Giảm trừ',
    });
  });
});
