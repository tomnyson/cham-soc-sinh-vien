const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Class = require('../models/class.model');
const AttendanceSession = require('../models/attendance.model');
const invoiceController = require('./invoice.controller');

let mongoServer;

const makeRes = () => {
  const res = { statusCode: 200, body: null, headers: {}, sentBuffer: null };
  res.status = code => {
    res.statusCode = code;
    return res;
  };
  res.json = payload => {
    res.body = payload;
    return res;
  };
  res.setHeader = (k, v) => {
    res.headers[k] = v;
    return res;
  };
  res.send = buf => {
    res.sentBuffer = buf;
    return res;
  };
  return res;
};

const makeReq = (query = {}) => ({
  params: { classId: 'class_test_1' },
  query,
  user: { _id: 'user_1', id: 'user_1' },
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
    students: [{ mssv: 'SV01', name: 'Nguyễn Văn A' }],
    invoiceConfig: {
      centerName: 'Trung tâm ABC',
      payerName: 'Phụ huynh A',
      bankCode: '970436',
      bankAccount: '0011001234567',
      bankAccountName: 'NGUYEN VAN A',
    },
  });

  await AttendanceSession.create([
    {
      classId: 'class_test_1',
      date: new Date(2026, 6, 1, 10, 0),
      durationHours: 2,
      hourlyRate: 200000,
      records: [{ mssv: 'SV01', status: 'present' }],
      createdBy: 'user_1',
    },
    {
      classId: 'class_test_1',
      date: new Date(2026, 7, 10, 11, 36),
      durationHours: 2,
      hourlyRate: 200000,
      records: [{ mssv: 'SV01', status: 'present' }],
      createdBy: 'user_1',
    },
  ]);
});

afterEach(async () => {
  // Dọn dẹp CHỈ dữ liệu do test tạo trong DB in-memory (không phải DB thật)
  await Class.deleteMany({});
  await AttendanceSession.deleteMany({});
});

describe('getInvoiceData', () => {
  it('trả dữ liệu hóa đơn đầy đủ cho toàn bộ buổi học', async () => {
    const res = makeRes();
    await invoiceController.getInvoiceData(makeReq(), res, jest.fn());

    expect(res.body.success).toBe(true);
    expect(res.body.data.totals.sessionCount).toBe(2);
    expect(res.body.data.totals.totalAmount).toBe(800000);
    expect(res.body.data.class.name).toBe('SOF308');
    expect(res.body.data.config.centerName).toBe('Trung tâm ABC');
    expect(res.body.data.qrUrl).toContain('970436-0011001234567');
  });

  it('lọc theo khoảng ngày', async () => {
    const res = makeRes();
    await invoiceController.getInvoiceData(
      makeReq({ from: '2026-08-01', to: '2026-08-31' }),
      res,
      jest.fn()
    );

    expect(res.body.data.totals.sessionCount).toBe(1);
    expect(res.body.data.totals.totalAmount).toBe(400000);
  });

  it('trả 200 với rows rỗng khi khoảng ngày không có buổi nào', async () => {
    const res = makeRes();
    await invoiceController.getInvoiceData(
      makeReq({ from: '2026-01-01', to: '2026-01-31' }),
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rows).toEqual([]);
    expect(res.body.data.totals.totalAmount).toBe(0);
  });

  it('trả 404 khi lớp không tồn tại', async () => {
    const res = makeRes();
    const req = { ...makeReq(), params: { classId: 'khong_ton_tai' } };
    await invoiceController.getInvoiceData(req, res, jest.fn());

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('exportInvoiceExcel', () => {
  it('trả buffer xlsx với header tải file', async () => {
    const res = makeRes();
    await invoiceController.exportInvoiceExcel(makeReq(), res, jest.fn());

    expect(Buffer.isBuffer(res.sentBuffer)).toBe(true);
    expect(res.headers['Content-Type']).toContain('spreadsheetml');
    expect(res.headers['Content-Disposition']).toContain('.xlsx');
  });

  it('trả 404 khi lớp không tồn tại', async () => {
    const res = makeRes();
    const req = { ...makeReq(), params: { classId: 'khong_ton_tai' } };
    await invoiceController.exportInvoiceExcel(req, res, jest.fn());

    expect(res.statusCode).toBe(404);
  });
});

describe('bất biến dữ liệu — yêu cầu tuyệt đối', () => {
  it('không thay đổi số lượng document sau khi gọi cả hai endpoint', async () => {
    const sessionsBefore = await AttendanceSession.countDocuments();
    const classesBefore = await Class.countDocuments();

    await invoiceController.getInvoiceData(makeReq(), makeRes(), jest.fn());
    await invoiceController.exportInvoiceExcel(makeReq(), makeRes(), jest.fn());
    await invoiceController.getInvoiceData(makeReq({ from: '2026-08-01' }), makeRes(), jest.fn());

    expect(await AttendanceSession.countDocuments()).toBe(sessionsBefore);
    expect(await Class.countDocuments()).toBe(classesBefore);
  });

  it('không thay đổi nội dung buổi học sau khi xuất hóa đơn', async () => {
    const before = await AttendanceSession.find({ classId: 'class_test_1' })
      .sort({ date: 1 })
      .lean();

    await invoiceController.getInvoiceData(makeReq(), makeRes(), jest.fn());
    await invoiceController.exportInvoiceExcel(makeReq(), makeRes(), jest.fn());

    const after = await AttendanceSession.find({ classId: 'class_test_1' })
      .sort({ date: 1 })
      .lean();
    expect(after).toEqual(before);
  });

  it('không thay đổi nội dung lớp sau khi xuất hóa đơn', async () => {
    const before = await Class.findOne({ classId: 'class_test_1' }).lean();

    await invoiceController.getInvoiceData(makeReq(), makeRes(), jest.fn());
    await invoiceController.exportInvoiceExcel(makeReq(), makeRes(), jest.fn());

    const after = await Class.findOne({ classId: 'class_test_1' }).lean();
    expect(after).toEqual(before);
  });
});
