const classService = require('../services/class.service');
const profileService = require('../services/profile.service');
const googleSheetService = require('../services/google-sheet.service');
const emailService = require('../services/email.service');

/**
 * Class Controller - Xử lý requests liên quan đến classes
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseBooleanFlag(value, defaultValue = false) {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
        return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
        return false;
    }
    return defaultValue;
}

function sortGradeColumns(weights = {}) {
    return Object.keys(weights).sort((a, b) => {
        const getOrder = (key) => {
            if (key.includes('Lab')) return 1;
            if (key.includes('Quiz')) return 2;
            if (key.includes('GD')) return 3;
            return 4;
        };

        const orderDiff = getOrder(a) - getOrder(b);
        if (orderDiff !== 0) return orderDiff;

        const numA = Number.parseInt((a.match(/\d+/) || ['0'])[0], 10);
        const numB = Number.parseInt((b.match(/\d+/) || ['0'])[0], 10);
        return numA - numB;
    });
}

function parseSpreadsheetId(input = '') {
    const raw = String(input || '').trim();
    if (!raw) return '';

    const urlMatch = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
    return urlMatch ? urlMatch[1] : raw;
}

function normalizeWeights(profile = {}) {
    const rawWeights = profile.weights instanceof Map
        ? Object.fromEntries(profile.weights)
        : (profile.weights || {});

    const normalized = {};
    for (const [key, value] of Object.entries(rawWeights)) {
        const weight = Number.parseFloat(value);
        if (key && Number.isFinite(weight)) {
            normalized[key] = weight;
        }
    }
    return normalized;
}

function getStudentGradesByMssv(gradeStudents = {}, mssv = '') {
    const target = String(mssv || '').trim().toUpperCase();
    if (!target) return {};

    if (gradeStudents instanceof Map) {
        for (const [key, value] of gradeStudents.entries()) {
            if (String(key || '').trim().toUpperCase() === target) {
                return value || {};
            }
        }
        return {};
    }

    for (const [key, value] of Object.entries(gradeStudents || {})) {
        if (String(key || '').trim().toUpperCase() === target) {
            return value || {};
        }
    }
    return {};
}

function escapeHtml(value = '') {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function buildScoreEmailContent({
    classData,
    student,
    total,
    bonus,
    finalTotal,
    status,
    note,
    customMessage,
    lookupLink,
    noteOnly = false
}) {
    const safeClassName = escapeHtml(classData?.name || '');
    const safeStudentName = escapeHtml(student?.name || '');
    const safeStudentMssv = escapeHtml(student?.mssv || '');
    const safeStatus = escapeHtml(status);
    const safeNote = escapeHtml(note || 'Không có');
    const safeCustomMessage = escapeHtml(customMessage || '');
    const safeLink = escapeHtml(lookupLink);

    const text = noteOnly
        ? [
            `Lớp: ${classData?.name || ''}`,
            `Sinh viên: ${student?.name || ''} (${student?.mssv || ''})`,
            `Ghi chú GV: ${note || 'Không có'}`,
            customMessage ? `Tin nhắn từ GV: ${customMessage}` : '',
            `Tra cứu chi tiết: ${lookupLink}`
        ].filter(Boolean).join('\n')
        : [
            `Lớp: ${classData?.name || ''}`,
            `Sinh viên: ${student?.name || ''} (${student?.mssv || ''})`,
            `Tổng điểm: ${total.toFixed(2)}`,
            `Bonus: ${bonus.toFixed(2)}`,
            `Tổng cuối: ${finalTotal.toFixed(2)}`,
            `Trạng thái: ${status}`,
            `Ghi chú GV: ${note || 'Không có'}`,
            customMessage ? `Tin nhắn từ GV: ${customMessage}` : '',
            `Tra cứu chi tiết: ${lookupLink}`
        ].filter(Boolean).join('\n');

    const html = noteOnly
        ? `
            <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
                <h3 style="margin:0 0 8px;">Ghi chú từ lớp ${safeClassName}</h3>
                <p style="margin:0 0 14px;">Sinh viên: <strong>${safeStudentName}</strong> (${safeStudentMssv})</p>
                <table style="border-collapse:collapse;width:100%;max-width:520px;margin-bottom:14px;">
                    <tbody>
                        <tr><td style="padding:6px 8px;border:1px solid #e5e7eb;">Ghi chú GV</td><td style="padding:6px 8px;border:1px solid #e5e7eb;">${safeNote}</td></tr>
                    </tbody>
                </table>
                ${safeCustomMessage ? `<p style="margin:0 0 10px;"><strong>Tin nhắn từ giáo viên:</strong><br>${safeCustomMessage.replace(/\n/g, '<br>')}</p>` : ''}
                <p style="margin:0;">
                    Tra cứu chi tiết:
                    <a href="${safeLink}" target="_blank" rel="noopener noreferrer">${safeLink}</a>
                </p>
            </div>
        `
        : `
            <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
                <h3 style="margin:0 0 8px;">Thông báo điểm từ lớp ${safeClassName}</h3>
                <p style="margin:0 0 14px;">Sinh viên: <strong>${safeStudentName}</strong> (${safeStudentMssv})</p>
                <table style="border-collapse:collapse;width:100%;max-width:520px;margin-bottom:14px;">
                    <tbody>
                        <tr><td style="padding:6px 8px;border:1px solid #e5e7eb;">Tổng điểm</td><td style="padding:6px 8px;border:1px solid #e5e7eb;"><strong>${total.toFixed(2)}</strong></td></tr>
                        <tr><td style="padding:6px 8px;border:1px solid #e5e7eb;">Bonus</td><td style="padding:6px 8px;border:1px solid #e5e7eb;">${bonus.toFixed(2)}</td></tr>
                        <tr><td style="padding:6px 8px;border:1px solid #e5e7eb;">Tổng cuối</td><td style="padding:6px 8px;border:1px solid #e5e7eb;"><strong>${finalTotal.toFixed(2)}</strong></td></tr>
                        <tr><td style="padding:6px 8px;border:1px solid #e5e7eb;">Trạng thái</td><td style="padding:6px 8px;border:1px solid #e5e7eb;">${safeStatus}</td></tr>
                        <tr><td style="padding:6px 8px;border:1px solid #e5e7eb;">Ghi chú GV</td><td style="padding:6px 8px;border:1px solid #e5e7eb;">${safeNote}</td></tr>
                    </tbody>
                </table>
                ${safeCustomMessage ? `<p style="margin:0 0 10px;"><strong>Tin nhắn từ giáo viên:</strong><br>${safeCustomMessage.replace(/\n/g, '<br>')}</p>` : ''}
                <p style="margin:0;">
                    Tra cứu chi tiết:
                    <a href="${safeLink}" target="_blank" rel="noopener noreferrer">${safeLink}</a>
                </p>
            </div>
        `;

    return { text, html };
}

function clampNumber(value, min, max) {
    const num = Number.parseFloat(value);
    if (!Number.isFinite(num)) return null;
    return Math.min(Math.max(num, min), max);
}

function calculateTotal(studentGrades = {}, weights = {}) {
    return Object.entries(weights).reduce((sum, [column, weight]) => {
        const score = clampNumber(studentGrades[column], 0, 10);
        if (score === null) return sum;
        return sum + (score / 100) * weight;
    }, 0);
}

function buildGradeRowsForSync(classData = {}, profile = {}) {
    const students = Array.isArray(classData.students) ? classData.students : [];
    const gradeStudents = classData.grades?.students || {};
    const weights = normalizeWeights(profile);
    const columns = sortGradeColumns(weights);
    const passThreshold = Number.parseFloat(profile.passThreshold) || 0;

    const headers = ['STT', 'MSSV', 'Họ và tên', ...columns, 'Tổng', 'Trạng thái', 'Bonus', 'Tổng cuối', 'Ghi chú'];
    const rows = students.map((student, index) => {
        const studentGrades = getStudentGradesByMssv(gradeStudents, student.mssv);
        const total = calculateTotal(studentGrades, weights);
        const bonus = clampNumber(studentGrades._bonus, 0, 2) || 0;
        const finalTotal = Math.min(total + bonus, 10);
        const status = total >= passThreshold ? 'Đạt' : 'Chưa đạt';

        const componentScores = columns.map((column) => {
            const score = clampNumber(studentGrades[column], 0, 10);
            return score === null ? '' : Number(score.toFixed(2));
        });

        return [
            index + 1,
            student.mssv || '',
            student.name || '',
            ...componentScores,
            Number(total.toFixed(2)),
            status,
            Number(bonus.toFixed(2)),
            Number(finalTotal.toFixed(2)),
            (studentGrades._note || '').toString()
        ];
    });

    return { headers, rows };
}

/**
 * Lấy tất cả classes
 */
const getAllClasses = async (req, res, next) => {
    try {
        const userId = req.user._id; // Use authenticated user's ID
        const classes = await classService.getAllClasses(userId);

        res.json({
            success: true,
            data: classes
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Lấy class theo ID
 */
const getClassById = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const userId = req.user._id; // Use authenticated user's ID

        const classData = await classService.getClassById(classId, userId);

        res.json({
            success: true,
            data: classData
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Tạo class mới
 */
const createClass = async (req, res, next) => {
    try {
        const userId = req.user._id; // Use authenticated user's ID
        const classData = await classService.createClass(req.body, userId);

        res.status(201).json({
            success: true,
            data: classData,
            message: 'Class created successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cập nhật class
 */
const updateClass = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const userId = req.user._id; // Use authenticated user's ID

        const classData = await classService.updateClass(classId, req.body, userId);

        res.json({
            success: true,
            data: classData,
            message: 'Class updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Xóa class
 */
const deleteClass = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const userId = req.user._id; // Use authenticated user's ID

        const result = await classService.deleteClass(classId, userId);

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Thêm sinh viên vào class
 */
const addStudent = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const userId = req.user._id; // Use authenticated user's ID

        const classData = await classService.addStudent(classId, req.body, userId);

        res.json({
            success: true,
            data: classData,
            message: 'Student added successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Xóa sinh viên khỏi class
 */
const removeStudent = async (req, res, next) => {
    try {
        const { classId, mssv } = req.params;
        const userId = req.user._id; // Use authenticated user's ID

        const classData = await classService.removeStudent(classId, mssv, userId);

        res.json({
            success: true,
            data: classData,
            message: 'Student removed successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cập nhật thông tin sinh viên
 */
const updateStudent = async (req, res, next) => {
    try {
        const { classId, mssv } = req.params;
        const userId = req.user._id; // Use authenticated user's ID

        const classData = await classService.updateStudent(classId, mssv, req.body, userId);

        res.json({
            success: true,
            data: classData,
            message: 'Student updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Thêm nhiều sinh viên cùng lúc
 */
const addStudentsBulk = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const { students } = req.body;
        const userId = req.user._id; // Use authenticated user's ID

        if (!students || !Array.isArray(students)) {
            return res.status(400).json({
                success: false,
                error: 'Students array is required'
            });
        }

        const result = await classService.addStudentsBulk(classId, students, userId);

        res.json({
            success: true,
            data: result.classData,
            results: result.results,
            message: `Added ${result.results.success.length} students successfully`
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Lưu trữ lớp (Archive)
 */
const archiveClass = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const userId = req.user._id;

        const classData = await classService.archiveClass(classId, userId);

        res.json({
            success: true,
            data: classData,
            message: 'Class archived successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Bỏ lưu trữ lớp (Unarchive)
 */
const unarchiveClass = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const userId = req.user._id;

        const classData = await classService.unarchiveClass(classId, userId);

        res.json({
            success: true,
            data: classData,
            message: 'Class unarchived successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Đồng bộ toàn bộ bảng điểm lớp lên Google Sheet
 */
const syncGradesToGoogleSheet = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const userId = req.user._id;

        const spreadsheetId = parseSpreadsheetId(req.body?.spreadsheetId);
        const sheetName = String(req.body?.sheetName || 'BangDiem').trim();

        if (!spreadsheetId) {
            return res.status(400).json({
                success: false,
                message: 'spreadsheetId là bắt buộc'
            });
        }

        const classData = await classService.getClassById(classId, userId);
        if (!classData?.grades?.profileId) {
            return res.status(400).json({
                success: false,
                message: 'Lớp chưa có profile điểm để sync'
            });
        }

        const profile = await profileService.getProfileById(classData.grades.profileId, userId);
        const exportPayload = buildGradeRowsForSync(classData, profile);

        const syncResult = await googleSheetService.syncGradesToGoogleSheet({
            spreadsheetId,
            sheetName,
            values: [exportPayload.headers, ...exportPayload.rows]
        });

        res.json({
            success: true,
            message: 'Đồng bộ Google Sheet thành công',
            data: {
                classId: classData.classId,
                className: classData.name,
                studentCount: exportPayload.rows.length,
                ...syncResult
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Gửi email điểm + ghi chú cho 1 hoặc nhiều sinh viên trong lớp
 */
const sendScoreEmail = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const userId = req.user._id;
        const recipientsRaw = Array.isArray(req.body?.recipients) ? req.body.recipients : [];
        const customMessage = String(req.body?.customMessage || '').trim().slice(0, 2000);
        const noteOnly = parseBooleanFlag(req.body?.noteOnly, false);
        const recipients = [...new Set(
            recipientsRaw
                .map(value => String(value || '').trim().toUpperCase())
                .filter(Boolean)
        )];

        if (recipients.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'recipients là bắt buộc'
            });
        }

        const classData = await classService.getClassById(classId, userId);
        if (!classData?.grades?.profileId) {
            return res.status(400).json({
                success: false,
                message: 'Lớp chưa có profile điểm để gửi email'
            });
        }

        const profile = await profileService.getProfileById(classData.grades.profileId, userId);
        const weights = normalizeWeights(profile);
        const passThreshold = Number.parseFloat(profile.passThreshold) || 0;
        const gradeStudents = classData.grades?.students || {};
        const students = Array.isArray(classData.students) ? classData.students : [];
        const origin = `${req.protocol}://${req.get('host')}`;

        // Validate SMTP config once before iterating recipients
        emailService.getConfig();

        const failed = [];
        const skipped = [];
        let sentCount = 0;

        for (const recipientMssv of recipients) {
            const student = students.find(
                s => String(s.mssv || '').trim().toUpperCase() === recipientMssv
            );

            if (!student) {
                skipped.push({ mssv: recipientMssv, reason: 'Không có sinh viên trong lớp' });
                continue;
            }

            const email = String(student.email || '').trim().toLowerCase();
            if (!email) {
                skipped.push({ mssv: student.mssv, reason: 'Sinh viên chưa có email' });
                continue;
            }

            if (!EMAIL_REGEX.test(email)) {
                skipped.push({ mssv: student.mssv, reason: 'Email không hợp lệ' });
                continue;
            }

            const studentGrades = getStudentGradesByMssv(gradeStudents, student.mssv);
            const total = calculateTotal(studentGrades, weights);
            const bonus = clampNumber(studentGrades._bonus, 0, 2) || 0;
            const finalTotal = Math.min(total + bonus, 10);
            const status = total >= passThreshold ? 'Đạt' : 'Chưa đạt';
            const note = String(studentGrades._note || '').trim();
            const lookupLink = `${origin}/student.html?class=${encodeURIComponent(classData.classId)}&mssv=${encodeURIComponent(student.mssv)}`;

            const { text, html } = buildScoreEmailContent({
                classData,
                student,
                total,
                bonus,
                finalTotal,
                status,
                note,
                customMessage,
                lookupLink,
                noteOnly
            });

            const subject = noteOnly
                ? `[${classData.name}] Ghi chú từ giảng viên - ${student.name} (${student.mssv})`
                : `[${classData.name}] Kết quả điểm - ${student.name} (${student.mssv})`;

            try {
                await emailService.sendMail({
                    to: email,
                    subject,
                    text,
                    html
                });
                sentCount += 1;
            } catch (error) {
                failed.push({
                    mssv: student.mssv,
                    email,
                    reason: error.message
                });
            }
        }

        if (sentCount === 0 && failed.length === 0 && skipped.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có người nhận hợp lệ để gửi email',
                data: { sentCount, failed, skipped }
            });
        }

        res.json({
            success: true,
            message: `Đã gửi email thành công ${sentCount}/${recipients.length} sinh viên`,
            data: {
                sentCount,
                totalRequested: recipients.length,
                failed,
                skipped
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Tra cứu điểm công khai theo classId + mssv (không yêu cầu đăng nhập)
 */
const getPublicStudentGrade = async (req, res, next) => {
    try {
        const classId = String(req.query.classId || '').trim();
        const mssv = String(req.query.mssv || '').trim().toUpperCase();

        if (!classId || !mssv) {
            return res.status(400).json({
                success: false,
                message: 'classId và mssv là bắt buộc'
            });
        }

        const classData = await classService.getClassByIdAnyUser(classId);
        const students = Array.isArray(classData.students) ? classData.students : [];
        const student = students.find(s => String(s.mssv || '').trim().toUpperCase() === mssv);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'MSSV không có trong lớp này'
            });
        }

        const grades = classData.grades || null;
        if (!grades || !grades.profileId) {
            return res.status(404).json({
                success: false,
                message: 'Lớp chưa có điểm'
            });
        }

        const profile = await profileService.getProfileById(grades.profileId, classData.userId || 'default');
        const profileWeights = profile.weights instanceof Map
            ? Object.fromEntries(profile.weights)
            : Object.fromEntries(new Map(Object.entries(profile.weights || {})));

        const studentGrades = getStudentGradesByMssv(grades.students || {}, mssv);

        res.json({
            success: true,
            data: {
                classData: {
                    classId: classData.classId,
                    name: classData.name
                },
                student: {
                    mssv: student.mssv,
                    name: student.name
                },
                profile: {
                    profileId: profile.profileId,
                    name: profile.name,
                    passThreshold: profile.passThreshold,
                    weights: profileWeights
                },
                studentGrades
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllClasses,
    getClassById,
    createClass,
    updateClass,
    deleteClass,
    addStudent,
    removeStudent,
    updateStudent,
    addStudentsBulk,
    archiveClass,
    unarchiveClass,
    syncGradesToGoogleSheet,
    sendScoreEmail,
    getPublicStudentGrade
};
