const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Class = require('../models/class.model');
const AttendanceSession = require('../models/attendance.model');
const scheduleController = require('./schedule.controller');
const { RANGE_ERROR } = require('../utils/schedule.util');

let mongoServer;

// Fixture theo giờ VN có offset rõ ràng → không phụ thuộc TZ máy chạy test
const vn = local => new Date(`${local}+07:00`);

const MONDAY_SLOT = {
  weekday: 1,
  startTime: '18:00',
  endTime: '20:00',
  startDate: vn('2026-09-07T00:00:00'),
  endDate: null,
  location: 'P.301',
};

const makeRes = () => {
  const res = { statusCode: 200, body: null };
  res.status = code => {
    res.statusCode = code;
    return res;
  };
  res.json = payload => {
    // Giống Express: serialize qua JSON (Date → chuỗi ISO, mongoose doc → object)
    res.body = JSON.parse(JSON.stringify(payload));
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
  await Class.create([
    {
      classId: 'class_test_1',
      name: 'SOF308',
      userId: 'user_1',
      hourlyRate: 200000,
      students: [{ mssv: 'SV01', name: 'Nguyễn Văn A' }],
      invoiceConfig: { centerName: 'Trung tâm A', note: 'Ghi chú' },
      schedule: [MONDAY_SLOT],
    },
    {
      classId: 'class_archived',
      name: 'ARC101',
      userId: 'user_1',
      isArchived: true,
      schedule: [MONDAY_SLOT],
    },
    { classId: 'class_empty', name: 'EMP101', userId: 'user_1' },
    { classId: 'class_other', name: 'OTH101', userId: 'user_2', schedule: [MONDAY_SLOT] },
  ]);

  // Buổi điểm danh lúc 18:05 VN (= 11:05 UTC) của Thứ Hai 07/09
  await AttendanceSession.create({
    classId: 'class_test_1',
    date: vn('2026-09-07T18:05:00'),
    durationHours: 2,
    hourlyRate: 200000,
    records: [{ mssv: 'SV01', status: 'present' }],
    createdBy: 'user_1',
  });
});

afterEach(async () => {
  // Dọn dẹp CHỈ dữ liệu do test tạo trong DB in-memory (không phải DB thật)
  await Class.deleteMany({});
  await AttendanceSession.deleteMany({});
});

describe('getClassSchedule', () => {
  it('trả lịch và các buổi đã đánh dấu điểm danh', async () => {
    const res = makeRes();
    await scheduleController.getClassSchedule(
      makeReq({ query: { from: '2026-09-07', to: '2026-09-20' } }),
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(200);
    const { schedule, range, occurrences } = res.body.data;
    expect(schedule).toHaveLength(1);
    expect(schedule[0]).toMatchObject({ weekday: 1, startTime: '18:00', location: 'P.301' });
    expect(range).toEqual({ from: '2026-09-07', to: '2026-09-20' });
    expect(occurrences.map(o => [o.dateKey, o.status])).toEqual([
      ['2026-09-07', 'done'],
      ['2026-09-14', 'missed'],
    ]);
    expect(occurrences[0].start).toBe('2026-09-07T11:00:00.000Z');
    expect(occurrences[0].attendanceSessionId).toEqual(expect.any(String));
    expect(occurrences[1].attendanceSessionId).toBeNull();
  });

  it('mặc định là tuần hiện tại bắt đầu Thứ Hai', async () => {
    const res = makeRes();
    await scheduleController.getClassSchedule(makeReq(), res, jest.fn());

    const { from, to } = res.body.data.range;
    expect(new Date(`${from}T00:00:00Z`).getUTCDay()).toBe(1);
    expect(new Date(`${to}T00:00:00Z`).getUTCDay()).toBe(0);
  });

  it('lớp cũ chưa có field schedule → lịch rỗng', async () => {
    await Class.collection.insertOne({
      classId: 'class_legacy',
      name: 'OLD101',
      userId: 'user_1',
      students: [],
    });

    const res = makeRes();
    await scheduleController.getClassSchedule(
      makeReq({ params: { classId: 'class_legacy' } }),
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.data.schedule).toEqual([]);
    expect(res.body.data.occurrences).toEqual([]);
  });

  it('trả 404 khi lớp thuộc user khác', async () => {
    const res = makeRes();
    await scheduleController.getClassSchedule(
      makeReq({ params: { classId: 'class_other' } }),
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Không tìm thấy lớp học');
  });

  it('trả 400 khi khoảng ngày sai', async () => {
    const res = makeRes();
    await scheduleController.getClassSchedule(
      makeReq({ query: { from: '2026-09-01', to: '2026-12-31' } }),
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe(RANGE_ERROR);
  });
});

describe('saveClassSchedule', () => {
  const body = {
    schedule: [
      {
        weekday: 3,
        startTime: '07:30',
        endTime: '09:30',
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        location: ' Lab 2 ',
      },
    ],
  };

  it('thay toàn bộ lịch, giữ nguyên các field khác của lớp', async () => {
    const before = await Class.findOne({ classId: 'class_test_1' }).lean();

    const res = makeRes();
    await scheduleController.saveClassSchedule(makeReq({ body }), res, jest.fn());

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã lưu lịch học');
    expect(res.body.data.schedule).toEqual([
      {
        weekday: 3,
        startTime: '07:30',
        endTime: '09:30',
        startDate: '2026-09-30T17:00:00.000Z',
        endDate: '2026-12-30T17:00:00.000Z',
        location: 'Lab 2',
      },
    ]);

    const after = await Class.findOne({ classId: 'class_test_1' }).lean();
    expect(after.schedule).toHaveLength(1);
    expect(after.schedule[0].startDate).toEqual(vn('2026-10-01T00:00:00'));
    expect(after.name).toBe(before.name);
    expect(after.userId).toBe(before.userId);
    expect(after.hourlyRate).toBe(before.hourlyRate);
    expect(after.students).toEqual(before.students);
    expect(after.invoiceConfig).toEqual(before.invoiceConfig);
  });

  it('không đổi updatedAt của lớp', async () => {
    const oldUpdatedAt = vn('2020-01-01T00:00:00');
    // Driver gốc → bỏ qua timestamps của mongoose, ghim updatedAt về giá trị cũ
    await Class.collection.updateOne(
      { classId: 'class_test_1' },
      { $set: { updatedAt: oldUpdatedAt } }
    );

    const res = makeRes();
    await scheduleController.saveClassSchedule(makeReq({ body }), res, jest.fn());

    expect(res.statusCode).toBe(200);
    const after = await Class.findOne({ classId: 'class_test_1' }).lean();
    expect(after.schedule).toHaveLength(1);
    expect(after.updatedAt).toEqual(oldUpdatedAt);
  });

  it('cho phép xoá hết lịch bằng mảng rỗng', async () => {
    const res = makeRes();
    await scheduleController.saveClassSchedule(makeReq({ body: { schedule: [] } }), res, jest.fn());

    expect(res.statusCode).toBe(200);
    expect((await Class.findOne({ classId: 'class_test_1' }).lean()).schedule).toEqual([]);
  });

  it('trả 400 khi dữ liệu sai và DB không đổi', async () => {
    const res = makeRes();
    await scheduleController.saveClassSchedule(
      makeReq({
        body: {
          schedule: [{ weekday: 1, startTime: '20:00', endTime: '18:00', startDate: '2026-10-01' }],
        },
      }),
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Khung giờ 1: giờ kết thúc phải sau giờ bắt đầu.');
    const saved = await Class.findOne({ classId: 'class_test_1' }).lean();
    expect(saved.schedule).toHaveLength(1);
    expect(saved.schedule[0].startTime).toBe('18:00');
  });

  it('trả 404 khi lớp thuộc user khác và không ghi gì', async () => {
    const res = makeRes();
    await scheduleController.saveClassSchedule(
      makeReq({ params: { classId: 'class_other' }, body }),
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(404);
    const other = await Class.findOne({ classId: 'class_other' }).lean();
    expect(other.schedule[0].startTime).toBe('18:00');
  });
});

describe('getTeacherSchedule', () => {
  it('chỉ trả lớp của user hiện tại, bỏ lớp lưu trữ và lớp chưa có lịch', async () => {
    const res = makeRes();
    await scheduleController.getTeacherSchedule(
      makeReq({ query: { from: '2026-09-07', to: '2026-09-13' } }),
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(200);
    const { classes, occurrences, range } = res.body.data;
    expect(range).toEqual({ from: '2026-09-07', to: '2026-09-13' });
    expect(classes).toEqual([{ classId: 'class_test_1', name: 'SOF308' }]);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]).toMatchObject({
      classId: 'class_test_1',
      className: 'SOF308',
      status: 'done',
    });
  });

  it('user không có lớp nào có lịch → danh sách rỗng', async () => {
    const res = makeRes();
    await scheduleController.getTeacherSchedule(
      makeReq({ user: { _id: 'user_3', id: 'user_3' } }),
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.data.classes).toEqual([]);
    expect(res.body.data.occurrences).toEqual([]);
  });

  it('trả 400 khi khoảng ngày sai', async () => {
    const res = makeRes();
    await scheduleController.getTeacherSchedule(
      makeReq({ query: { from: 'abc', to: '2026-09-13' } }),
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe(RANGE_ERROR);
  });
});
