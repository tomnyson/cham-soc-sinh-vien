const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Class = require('../models/class.model');
const AttendanceSession = require('../models/attendance.model');
const attendanceController = require('./attendance.controller');

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
      durationHours: 3,
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

describe('getSessionsByClass — lọc theo khoảng ngày', () => {
  it('không có query thì trả về toàn bộ buổi học như trước', async () => {
    const res = makeRes();
    await attendanceController.getSessionsByClass(makeReq(), res, jest.fn());

    expect(res.body.success).toBe(true);
    expect(res.body.data.sessions).toHaveLength(2);
    expect(res.body.data.totalRevenue).toBe(1000000);
  });

  it('lọc được theo cả from và to', async () => {
    const res = makeRes();
    await attendanceController.getSessionsByClass(
      makeReq({ from: '2026-08-01', to: '2026-08-31' }),
      res,
      jest.fn()
    );

    expect(res.body.data.sessions).toHaveLength(1);
    expect(res.body.data.totalRevenue).toBe(600000);
  });

  it('lọc được khi chỉ có from', async () => {
    const res = makeRes();
    await attendanceController.getSessionsByClass(makeReq({ from: '2026-08-01' }), res, jest.fn());

    expect(res.body.data.sessions).toHaveLength(1);
  });

  it('bao gồm cả buổi học trong ngày biên (to là cuối ngày)', async () => {
    const res = makeRes();
    await attendanceController.getSessionsByClass(
      makeReq({ from: '2026-08-10', to: '2026-08-10' }),
      res,
      jest.fn()
    );

    // Buổi lúc 11:36 ngày 10/08 vẫn phải nằm trong khoảng
    expect(res.body.data.sessions).toHaveLength(1);
  });

  it('không thay đổi dữ liệu trong database', async () => {
    const before = await AttendanceSession.find({ classId: 'class_test_1' })
      .sort({ date: 1 })
      .lean();

    await attendanceController.getSessionsByClass(makeReq(), makeRes(), jest.fn());
    await attendanceController.getSessionsByClass(
      makeReq({ from: '2026-08-01', to: '2026-08-31' }),
      makeRes(),
      jest.fn()
    );

    const after = await AttendanceSession.find({ classId: 'class_test_1' }).sort({ date: 1 }).lean();
    expect(after).toEqual(before);
  });
});
