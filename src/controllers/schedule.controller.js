const AttendanceSession = require('../models/attendance.model');
const Class = require('../models/class.model');
const classService = require('../services/class.service');
const {
  parseScheduleInput,
  parseRange,
  rangeBounds,
  expandOccurrences,
  markAttendance,
} = require('../utils/schedule.util');
const { buildIcs, icsFileName } = require('../utils/schedule-ics.util');

const NO_SCHEDULE_ERROR = 'Chưa có lịch để xuất.';

/**
 * Lấy lớp thuộc user đang đăng nhập. Trả null nếu không có hoặc không thuộc user.
 * @param {string} classId
 * @param {object} user
 * @returns {Promise<object|null>}
 */
async function findOwnedClass(classId, user) {
  try {
    return await classService.getClassById(classId, user && user._id);
  } catch (error) {
    if (error.message.includes('Class not found')) return null;
    throw error;
  }
}

function notFound(res) {
  return res.status(404).json({ success: false, error: 'Không tìm thấy lớp học' });
}

/**
 * Buổi điểm danh trong khoảng ngày (chỉ lấy classId, date để ghép lịch).
 * @param {string[]} classIds
 * @param {{from: string, to: string}} range
 */
function findSessionsInRange(classIds, range) {
  const { start, end } = rangeBounds(range);
  return AttendanceSession.find(
    { classId: { $in: classIds }, date: { $gte: start, $lt: end } },
    { classId: 1, date: 1 }
  ).lean();
}

/**
 * Lớp chưa lưu trữ, đã có lịch của giảng viên, sắp theo tên. Có classId → chỉ lớp đó.
 * @param {object} user
 * @param {string} [classId]
 */
function findScheduledClasses(user, classId = '') {
  return Class.find(
    {
      userId: String(user._id),
      isArchived: { $ne: true },
      'schedule.0': { $exists: true },
      ...(classId ? { classId } : {}),
    },
    { classId: 1, name: 1, schedule: 1 }
  )
    .sort({ name: 1 })
    .lean();
}

/**
 * GET /api/classes/:classId/schedule?from=&to=
 * Lịch cố định + các buổi trong khoảng ngày (đã đánh dấu điểm danh).
 */
exports.getClassSchedule = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const classData = await findOwnedClass(classId, req.user);
    if (!classData) return notFound(res);

    const query = req.query || {};
    const { value: range, error } = parseRange(query.from, query.to);
    if (error) return res.status(400).json({ success: false, error });

    const plain = typeof classData.toObject === 'function' ? classData.toObject() : classData;
    const sessions = await findSessionsInRange([classId], range);
    const occurrences = markAttendance(expandOccurrences(plain, range), sessions);

    return res.json({
      success: true,
      data: { schedule: plain.schedule || [], range, occurrences },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/classes/:classId/schedule
 * Thay toàn bộ lịch cố định. Chỉ $set field schedule, không đụng field khác.
 */
exports.saveClassSchedule = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const classData = await findOwnedClass(classId, req.user);
    if (!classData) return notFound(res);

    const { value, error } = parseScheduleInput(req.body);
    if (error) return res.status(400).json({ success: false, error });

    const updated = await Class.findOneAndUpdate(
      { classId, userId: classData.userId },
      { $set: { schedule: value } },
      { new: true, runValidators: true, timestamps: false }
    )
      .select({ schedule: 1 })
      .lean();
    if (!updated) return notFound(res);

    return res.json({
      success: true,
      data: { schedule: updated.schedule || [] },
      message: 'Đã lưu lịch học',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/schedule?from=&to=
 * Lịch mọi lớp (chưa lưu trữ, có lịch) của giảng viên đang đăng nhập. Đúng 2 query.
 */
exports.getTeacherSchedule = async (req, res, next) => {
  try {
    const query = req.query || {};
    const { value: range, error } = parseRange(query.from, query.to);
    if (error) return res.status(400).json({ success: false, error });

    const classes = await findScheduledClasses(req.user);

    const sessions = classes.length
      ? await findSessionsInRange(
          classes.map(c => c.classId),
          range
        )
      : [];
    const occurrences = markAttendance(
      classes.flatMap(c => expandOccurrences(c, range)),
      sessions
    );

    return res.json({
      success: true,
      data: {
        range,
        classes: classes.map(({ classId, name }) => ({ classId, name })),
        occurrences,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/schedule/ics?classId=
 * Tải lịch dạy dạng .ics để import vào Google Calendar. Chỉ đọc DB.
 */
exports.exportTeacherIcs = async (req, res, next) => {
  try {
    // Ép về chuỗi: ?classId[$ne]=x không được thành toán tử truy vấn
    const classId = String((req.query && req.query.classId) || '').trim();
    const classes = await findScheduledClasses(req.user, classId);
    const content = buildIcs(classes, new Date());
    if (!content.includes('BEGIN:VEVENT')) {
      return res.status(404).json({ success: false, error: NO_SCHEDULE_ERROR });
    }

    return res
      .set({
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${icsFileName(classId)}"`,
      })
      .send(content);
  } catch (error) {
    return next(error);
  }
};
