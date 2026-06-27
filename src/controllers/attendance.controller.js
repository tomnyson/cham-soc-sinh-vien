const AttendanceSession = require('../models/attendance.model');
const Class = require('../models/class.model');

// Lấy danh sách điểm danh của lớp
exports.getSessionsByClass = async (req, res, next) => {
    try {
        const { classId } = req.params;
        // Kiểm tra quyền (lecturer/admin đã check ở middleware)
        const classData = await Class.findOne({ classId });
        if (!classData) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy lớp học' });
        }

        const sessions = await AttendanceSession.find({ classId }).sort({ date: -1 });
        
        // Tính tổng doanh thu
        const totalRevenue = sessions.reduce((sum, s) => sum + s.totalCost, 0);

        res.json({
            success: true,
            data: {
                sessions,
                totalRevenue
            }
        });
    } catch (error) {
        next(error);
    }
};

// Tạo buổi điểm danh mới
exports.createSession = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const { durationHours, hourlyRate, records, date } = req.body;

        const classData = await Class.findOne({ classId });
        if (!classData) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy lớp học' });
        }

        const sessionData = {
            classId,
            durationHours: Number(durationHours) || 1,
            hourlyRate: Number(hourlyRate) || 0,
            records: records || [],
            createdBy: req.user.id || req.user._id || 'unknown'
        };

        if (date) {
            sessionData.date = new Date(date);
        }

        const session = new AttendanceSession(sessionData);

        await session.save();

        // Cập nhật lại hourlyRate của lớp nếu khác mặc định
        if (session.hourlyRate !== classData.hourlyRate) {
            classData.hourlyRate = session.hourlyRate;
            await classData.save();
        }

        res.status(201).json({
            success: true,
            data: session,
            message: 'Đã lưu điểm danh thành công'
        });
    } catch (error) {
        next(error);
    }
};
