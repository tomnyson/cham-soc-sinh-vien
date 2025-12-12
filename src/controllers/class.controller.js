const classService = require('../services/class.service');

/**
 * Class Controller - Xử lý requests liên quan đến classes
 */

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
    unarchiveClass
};
