const ReportTemplate = require('../models/report-template.model');
const StudentReport = require('../models/student-report.model');
const Class = require('../models/class.model');
const recaptchaService = require('../services/recaptcha.service');

/**
 * Get public reCAPTCHA config for the student report form
 * GET /api/public/recaptcha-config
 */
exports.getPublicRecaptchaConfig = async (req, res) => {
    res.json({ success: true, data: recaptchaService.getPublicConfig() });
};

/**
 * Get Report Template for Students (Public)
 * GET /api/public/report-template?classId=...
 */
exports.getPublicTemplate = async (req, res) => {
    try {
        const { classId } = req.query;
        if (!classId) {
            return res.status(400).json({ success: false, message: 'Thiếu mã lớp (classId)' });
        }

        const template = await ReportTemplate.findOne({ classId });
        if (!template) {
            // Default template if teacher hasn't set one up
            return res.json({
                success: true,
                data: {
                    classId,
                    fields: [
                        { _id: 'default_1', questionText: 'Nội dung bài học hôm nay là gì?', isRequired: true, order: 1 },
                        { _id: 'default_2', questionText: 'Bạn gặp khó khăn gì không?', isRequired: false, order: 2 }
                    ]
                }
            });
        }

        res.json({ success: true, data: template });
    } catch (error) {
        console.error('Error in getPublicTemplate:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy template report' });
    }
};

/**
 * Submit Student Report (Public)
 * POST /api/public/submit-report
 * Upsert: mỗi sinh viên chỉ có 1 báo cáo duy nhất cho mỗi ngày.
 * Nếu gửi lại sẽ ghi đè kết quả cũ.
 */
exports.submitReport = async (req, res) => {
    try {
        const { classId, mssv, date, answers, captchaToken } = req.body;

        if (!classId || !mssv || !date || !answers) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
        }

        const captchaResult = await recaptchaService.verify(captchaToken, req.ip);
        if (!captchaResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng xác minh CAPTCHA trước khi gửi báo cáo.'
            });
        }

        // Verify student belongs to class
        const classData = await Class.findOne({ classId });
        if (!classData) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
        }

        const student = classData.students.find(s => s.mssv.toUpperCase() === mssv.toUpperCase());
        if (!student) {
            return res.status(404).json({ success: false, message: 'Sinh viên không thuộc lớp này' });
        }

        // Upsert: chỉ giữ 1 bản ghi duy nhất cho mỗi sinh viên + ngày + lớp
        const report = await StudentReport.findOneAndUpdate(
            { classId, mssv: student.mssv, date },
            {
                $set: {
                    studentName: student.name,
                    answers
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({ success: true, message: 'Gửi báo cáo thành công', data: report });
    } catch (error) {
        console.error('Error in submitReport:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi gửi báo cáo' });
    }
};


/**
 * Save Report Template (Protected - Teacher)
 * POST /api/report-template
 */
exports.saveTemplate = async (req, res) => {
    try {
        const { classId, fields } = req.body;
        const userId = req.user.id;

        if (!classId || !fields) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin classId hoặc fields' });
        }

        // Verify class belongs to teacher
        const classData = await Class.findOne({ classId, userId });
        if (!classData) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lớp hoặc bạn không có quyền' });
        }

        let template = await ReportTemplate.findOne({ classId, userId });
        if (template) {
            template.fields = fields;
            await template.save();
        } else {
            template = new ReportTemplate({
                classId,
                userId,
                fields
            });
            await template.save();
        }

        res.json({ success: true, message: 'Lưu template thành công', data: template });
    } catch (error) {
        console.error('Error in saveTemplate:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lưu template' });
    }
};

/**
 * Get Report Template (Protected - Teacher)
 * GET /api/report-template?classId=...
 */
exports.getTemplate = async (req, res) => {
    try {
        const { classId } = req.query;
        const userId = req.user.id;

        if (!classId) {
            return res.status(400).json({ success: false, message: 'Thiếu classId' });
        }

        const template = await ReportTemplate.findOne({ classId, userId });
        res.json({ success: true, data: template }); // Returns null data if not found, frontend should handle this
    } catch (error) {
        console.error('Error in getTemplate:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy template' });
    }
};

/**
 * Get Submitted Reports (Protected - Teacher)
 * GET /api/reports?classId=...&date=...
 */
exports.getReports = async (req, res) => {
    try {
        const { classId, date } = req.query;
        const userId = req.user.id;

        if (!classId) {
            return res.status(400).json({ success: false, message: 'Thiếu classId' });
        }

        // Verify class belongs to teacher
        const classData = await Class.findOne({ classId, userId });
        if (!classData) {
            return res.status(403).json({ success: false, message: 'Không có quyền truy cập lớp này' });
        }

        let query = { classId };
        if (date) {
            query.date = date;
        }

        const reports = await StudentReport.find(query).sort({ createdAt: -1 });

        res.json({ success: true, data: reports });
    } catch (error) {
        console.error('Error in getReports:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy báo cáo' });
    }
};
