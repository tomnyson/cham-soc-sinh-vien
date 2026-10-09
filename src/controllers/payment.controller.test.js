const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Class = require('../models/class.model');
const AttendanceSession = require('../models/attendance.model');
const Payment = require('../models/payment.model');
const paymentController = require('./payment.controller');

let mongoServer;

const makeRes = () => {
  const res = { statusCode: 200, body: null };
  res.status = code => {
    res.statusCode = code;
    return res;
  };
  res.json = payload => {
    res.body = payload;
    return res;
  };
  return res;
};

const makeReq = ({ query = {}, body = {}, params = {}, user } = {}) => ({
  params: { classId: 'class_test_1', ...params },
  query,
  body,
  user: user || { _id: 'user_1', id: 'user_1' },
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Class.create({
    classId: 'class_test_1',
    name: 'SOF308',
    userId: 'user_1',
    hourlyRate: 200000,
    students: [
      { mssv: 'SV01', name: 'Nguyễn Văn A' },
      { mssv: 'SV02', name: 'Trần Thị B' },
    ],
  });

  // 2 buổi, mỗi buổi 400.000đ chia đều 2 học viên → mỗi người nợ 400.000đ
  await AttendanceSession.create([
    {
      classId: 'class_test_1',
      date: new Date(2026, 6, 1, 10, 0),
      durationHours: 2,
      hourlyRate: 200000,
      records: [
        { mssv: 'SV01', status: 'present' },
        { mssv: 'SV02', status: 'absent' },
      ],
      createdBy: 'user_1',
    },
    {
      classId: 'class_test_1',
      date: new Date(2026, 7, 10, 10, 0),
      durationHours: 2,
      hourlyRate: 200000,
      records: [
        { mssv: 'SV01', status: 'present' },
        { mssv: 'SV02', status: 'present' },
      ],
      createdBy: 'user_1',
    },
  ]);
});

afterEach(async () => {
  // Dọn dẹp CHỈ dữ liệu do test tạo trong DB in-memory (không phải DB thật)
  await Class.deleteMany({});
  await AttendanceSession.deleteMany({});
  await Payment.deleteMany({});
});

const seedPayment = (overrides = {}) =>
  Payment.create({
    classId: 'class_test_1',
    mssv: 'SV01',
    amount: 100000,
    paidAt: new Date(2026, 7, 15, 9, 0),
    method: 'cash',
    createdBy: 'user_1',
    ...overrides,
  });

describe('createPayment', () => {
  it('ghi nhận khoản thu hợp lệ và trả 201', async () => {
    const res = makeRes();
    await paymentController.createPayment(
      makeReq({ body: { mssv: 'SV01', amount: '250000', method: 'transfer', note: 'Đợt 1' } }),
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    const saved = await Payment.find({ classId: 'class_test_1' }).lean();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      mssv: 'SV01',
      amount: 250000,
      method: 'transfer',
      note: 'Đợt 1',
      status: 'active',
      createdBy: 'user_1',
    });
  });

  it('cho phép một học viên đóng nhiều lần', async () => {
    const body = { mssv: 'SV01', amount: 100000 };
    await paymentController.createPayment(makeReq({ body }), makeRes(), jest.fn());
    await paymentController.createPayment(makeReq({ body }), makeRes(), jest.fn());

    expect(await Payment.countDocuments({ mssv: 'SV01' })).toBe(2);
  });

  it('trả 400 khi dữ liệu không hợp lệ', async () => {
    const res = makeRes();
    await paymentController.createPayment(
      makeReq({ body: { mssv: 'SV99', amount: 1000 } }),
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Học viên không thuộc lớp này.');
    expect(await Payment.countDocuments()).toBe(0);
  });

  it('trả 404 khi lớp thuộc user khác', async () => {
    const res = makeRes();
    await paymentController.createPayment(
      makeReq({ body: { mssv: 'SV01', amount: 1000 }, user: { _id: 'user_2', id: 'user_2' } }),
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(404);
    expect(await Payment.countDocuments()).toBe(0);
  });
});

describe('getPayments', () => {
  it('trả lịch sử, sổ công nợ từng học viên và tổng hợp', async () => {
    await seedPayment({ amount: 300000 });
    await seedPayment({ amount: 100000, paidAt: new Date(2026, 7, 20, 9, 0) });
    await seedPayment({ mssv: 'SV02', amount: 50000, status: 'voided' });

    const res = makeRes();
    await paymentController.getPayments(makeReq(), res, jest.fn());

    expect(res.statusCode).toBe(200);
    const { payments, ledger, rangeSummary } = res.body.data;
    expect(payments).toHaveLength(3);
    expect(new Date(payments[0].paidAt).getDate()).toBe(20);

    const byMssv = Object.fromEntries(ledger.students.map(s => [s.mssv, s]));
    expect(byMssv.SV01).toMatchObject({ charged: 400000, paid: 400000, outstanding: 0 });
    expect(byMssv.SV02).toMatchObject({ charged: 400000, paid: 0, outstanding: 400000 });
    expect(rangeSummary).toEqual({ charged: 800000, paid: 400000, outstanding: 400000 });
  });

  it('lọc theo học viên và khoảng ngày', async () => {
    await seedPayment({ amount: 300000, paidAt: new Date(2026, 6, 5, 9, 0) });
    await seedPayment({ amount: 100000, paidAt: new Date(2026, 7, 20, 9, 0) });
    await seedPayment({ mssv: 'SV02', amount: 70000, paidAt: new Date(2026, 7, 21, 9, 0) });

    const res = makeRes();
    await paymentController.getPayments(
      makeReq({ query: { mssv: 'SV01', from: '2026-08-01', to: '2026-08-31' } }),
      res,
      jest.fn()
    );

    const { payments, ledger, rangeSummary } = res.body.data;
    expect(payments).toHaveLength(1);
    expect(payments[0].amount).toBe(100000);
    expect(rangeSummary).toEqual({ charged: 200000, paid: 100000, outstanding: 100000 });
    // Sổ công nợ luôn tính toàn bộ thời gian
    expect(ledger.totals.paid).toBe(470000);
  });

  it('trả 404 khi lớp không tồn tại', async () => {
    const res = makeRes();
    await paymentController.getPayments(
      makeReq({ params: { classId: 'khong_ton_tai' } }),
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(404);
  });
});

describe('voidPayment', () => {
  it('huỷ khoản thu, giữ bản ghi và loại khỏi tổng', async () => {
    const payment = await seedPayment({ amount: 300000 });

    const res = makeRes();
    await paymentController.voidPayment(
      makeReq({ params: { paymentId: String(payment._id) }, body: { reason: 'Ghi nhầm' } }),
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(200);
    const saved = await Payment.findById(payment._id).lean();
    expect(saved).toMatchObject({ status: 'voided', voidReason: 'Ghi nhầm', voidedBy: 'user_1' });
    expect(saved.voidedAt).toBeInstanceOf(Date);

    const listRes = makeRes();
    await paymentController.getPayments(makeReq(), listRes, jest.fn());
    expect(listRes.body.data.rangeSummary.paid).toBe(0);
  });

  it('trả 400 khi khoản thu đã huỷ trước đó', async () => {
    const payment = await seedPayment({ status: 'voided' });

    const res = makeRes();
    await paymentController.voidPayment(
      makeReq({ params: { paymentId: String(payment._id) } }),
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(400);
  });

  it('trả 404 với id sai định dạng hoặc thuộc lớp khác', async () => {
    const other = await seedPayment({ classId: 'class_khac' });

    const badId = makeRes();
    await paymentController.voidPayment(
      makeReq({ params: { paymentId: 'abc' } }),
      badId,
      jest.fn()
    );
    expect(badId.statusCode).toBe(404);

    const otherClass = makeRes();
    await paymentController.voidPayment(
      makeReq({ params: { paymentId: String(other._id) } }),
      otherClass,
      jest.fn()
    );
    expect(otherClass.statusCode).toBe(404);
    expect((await Payment.findById(other._id).lean()).status).toBe('active');
  });

  it('trả 400 khi lý do huỷ quá dài', async () => {
    const payment = await seedPayment();

    const res = makeRes();
    await paymentController.voidPayment(
      makeReq({ params: { paymentId: String(payment._id) }, body: { reason: 'x'.repeat(201) } }),
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(400);
    expect((await Payment.findById(payment._id).lean()).status).toBe('active');
  });
});
