const classService = require('../services/class.service');
const profileService = require('../services/profile.service');
const googleSheetService = require('../services/google-sheet.service');

/**
 * Class Controller - Xử lý requests liên quan đến classes
 */

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

function normalizeGradeStudents(gradeStudents = {}) {
    if (gradeStudents instanceof Map) {
        return Object.fromEntries(gradeStudents.entries());
    }
    return gradeStudents || {};
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
    const gradeStudents = normalizeGradeStudents(classData.grades?.students || {});
    const weights = normalizeWeights(profile);
    const columns = sortGradeColumns(weights);
    const passThreshold = Number.parseFloat(profile.passThreshold) || 0;

    const headers = ['STT', 'MSSV', 'Họ và tên', ...columns, 'Tổng', 'Trạng thái', 'Bonus', 'Tổng cuối', 'Ghi chú'];
    const rows = students.map((student, index) => {
        const studentGrades = gradeStudents[student.mssv] || {};
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

        let studentGrades = {};
        const gradeStudents = grades.students || {};

        if (gradeStudents instanceof Map) {
            for (const [key, value] of gradeStudents.entries()) {
                if (String(key || '').trim().toUpperCase() === mssv) {
                    studentGrades = value || {};
                    break;
                }
            }
        } else {
            for (const [key, value] of Object.entries(gradeStudents)) {
                if (String(key || '').trim().toUpperCase() === mssv) {
                    studentGrades = value || {};
                    break;
                }
            }
        }

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
    getPublicStudentGrade
};
