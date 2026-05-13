const Class = require('../models/class.model');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{8,20}$/;

function normalizeText(value) {
    return String(value || '').trim();
}

function normalizeEmail(value, fieldLabel = 'email') {
    const email = normalizeText(value).toLowerCase();
    if (!email) return '';
    if (!EMAIL_REGEX.test(email)) {
        throw new Error(`${fieldLabel} không hợp lệ`);
    }
    return email;
}

function normalizePhone(value, fieldLabel = 'phone') {
    const phone = normalizeText(value);
    if (!phone) return '';
    if (!PHONE_REGEX.test(phone)) {
        throw new Error(`${fieldLabel} không hợp lệ`);
    }
    return phone;
}

function normalizeStudent(student = {}, contextLabel = 'sinh viên') {
    const mssv = normalizeText(student.mssv);
    const name = normalizeText(student.name);
    const phone = normalizePhone(student.phone, `${contextLabel}.phone`);
    const email = normalizeEmail(student.email, `${contextLabel}.email`);

    if (!mssv || !name) {
        throw new Error(`${contextLabel}: MSSV và Họ tên là bắt buộc`);
    }

    return { mssv, name, phone, email };
}

function normalizeStudents(students = []) {
    if (!Array.isArray(students)) {
        throw new Error('students phải là mảng');
    }

    const seen = new Set();
    return students.map((student, index) => {
        const normalized = normalizeStudent(student, `students[${index}]`);
        const key = normalized.mssv.toUpperCase();
        if (seen.has(key)) {
            throw new Error(`Trùng MSSV trong danh sách: ${normalized.mssv}`);
        }
        seen.add(key);
        return normalized;
    });
}

function normalizeStudentUpdates(updates = {}) {
    const normalized = {};

    if (updates.name !== undefined) {
        const name = normalizeText(updates.name);
        if (!name) {
            throw new Error('name không được để trống');
        }
        normalized.name = name;
    }

    if (updates.phone !== undefined) {
        normalized.phone = normalizePhone(updates.phone);
    }

    if (updates.email !== undefined) {
        normalized.email = normalizeEmail(updates.email);
    }

    return normalized;
}

function normalizeNumeric(value, fieldLabel) {
    const num = Number.parseFloat(value);
    if (!Number.isFinite(num)) {
        throw new Error(`${fieldLabel} phải là số`);
    }
    return num;
}

function normalizeGradesPayload(grades) {
    if (grades === null) return null;
    if (grades === undefined) return undefined;
    if (!grades || typeof grades !== 'object' || Array.isArray(grades)) {
        throw new Error('grades không hợp lệ');
    }

    const profileId = normalizeText(grades.profileId);
    const sourceStudents = (grades.students && typeof grades.students === 'object' && !Array.isArray(grades.students))
        ? grades.students
        : {};

    const normalizedStudents = {};

    Object.entries(sourceStudents).forEach(([rawMssv, rawGradeRow]) => {
        const mssv = normalizeText(rawMssv);
        if (!mssv) return;

        if (!rawGradeRow || typeof rawGradeRow !== 'object' || Array.isArray(rawGradeRow)) {
            throw new Error(`grades.students[${mssv}] không hợp lệ`);
        }

        const normalizedGradeRow = {};

        Object.entries(rawGradeRow).forEach(([column, rawValue]) => {
            if (rawValue === '' || rawValue === null || rawValue === undefined) {
                return;
            }

            if (column === '_note') {
                normalizedGradeRow[column] = String(rawValue);
                return;
            }

            if (column === '_bonus') {
                const bonus = normalizeNumeric(rawValue, `Bonus của ${mssv}`);
                if (bonus < 0 || bonus > 2) {
                    throw new Error(`Bonus của ${mssv} phải trong khoảng 0-2`);
                }
                normalizedGradeRow[column] = bonus;
                return;
            }

            const score = normalizeNumeric(rawValue, `Điểm "${column}" của ${mssv}`);
            if (score < 0 || score > 10) {
                throw new Error(`Điểm "${column}" của ${mssv} phải trong khoảng 0-10`);
            }
            normalizedGradeRow[column] = score;
        });

        normalizedStudents[mssv] = normalizedGradeRow;
    });

    return {
        profileId,
        students: normalizedStudents
    };
}

/**
 * Class Service - Business logic cho classes
 */
class ClassService {
    /**
     * Lấy tất cả lớp của user
     */
    async getAllClasses(userId = 'default') {
        try {
            const classes = await Class.findByUserId(userId);
            return classes;
        } catch (error) {
            throw new Error(`Error fetching classes: ${error.message}`);
        }
    }

    /**
     * Lấy lớp theo ID
     */
    async getClassById(classId, userId = 'default') {
        try {
            const classData = await Class.findByClassId(classId, userId);
            if (!classData) {
                throw new Error('Class not found');
            }
            return classData;
        } catch (error) {
            throw new Error(`Error fetching class: ${error.message}`);
        }
    }

    /**
     * Lấy lớp theo ID (không ràng buộc user) cho tra cứu điểm công khai
     */
    async getClassByIdAnyUser(classId) {
        try {
            const classData = await Class.findOne({ classId });
            if (!classData) {
                throw new Error('Class not found');
            }
            return classData;
        } catch (error) {
            throw new Error(`Error fetching class: ${error.message}`);
        }
    }

    /**
     * Tạo lớp mới
     */
    async createClass(classData, userId = 'default') {
        try {
            const { classId, name, description, students, grades } = classData;
            const normalizedClassId = normalizeText(classId);
            const normalizedName = normalizeText(name);

            // Validate
            if (!normalizedClassId || !normalizedName) {
                throw new Error('ClassId and name are required');
            }

            // Kiểm tra trùng classId
            const existing = await Class.findByClassId(normalizedClassId, userId);
            if (existing) {
                throw new Error('Class with this ID already exists');
            }

            const newClass = new Class({
                classId: normalizedClassId,
                name: normalizedName,
                description: normalizeText(description),
                students: normalizeStudents(students || []),
                grades: normalizeGradesPayload(grades ?? null),
                userId
            });

            await newClass.save();
            return newClass;
        } catch (error) {
            throw new Error(`Error creating class: ${error.message}`);
        }
    }

    /**
     * Cập nhật lớp
     */
    async updateClass(classId, updates, userId = 'default') {
        try {
            const classData = await Class.findByClassId(classId, userId);
            if (!classData) {
                throw new Error('Class not found');
            }

            // Update fields
            if (updates.name !== undefined) {
                const normalizedName = normalizeText(updates.name);
                if (!normalizedName) {
                    throw new Error('name không được để trống');
                }
                classData.name = normalizedName;
            }
            if (updates.description !== undefined) classData.description = normalizeText(updates.description);
            if (updates.students !== undefined) classData.students = normalizeStudents(updates.students);
            if (updates.grades !== undefined) classData.grades = normalizeGradesPayload(updates.grades);

            await classData.save();
            return classData;
        } catch (error) {
            throw new Error(`Error updating class: ${error.message}`);
        }
    }

    /**
     * Xóa lớp
     */
    async deleteClass(classId, userId = 'default') {
        try {
            const classData = await Class.findByClassId(classId, userId);
            if (!classData) {
                throw new Error('Class not found');
            }

            await Class.deleteOne({ classId, userId });
            return { success: true, message: 'Class deleted successfully' };
        } catch (error) {
            throw new Error(`Error deleting class: ${error.message}`);
        }
    }

    /**
     * Thêm sinh viên vào lớp
     */
    async addStudent(classId, studentData, userId = 'default') {
        try {
            const classData = await Class.findByClassId(classId, userId);
            if (!classData) {
                throw new Error('Class not found');
            }

            const normalized = normalizeStudent(studentData);

            // Kiểm tra trùng MSSV
            const exists = classData.students.some(
                s => String(s.mssv || '').trim().toUpperCase() === normalized.mssv.toUpperCase()
            );
            if (exists) {
                throw new Error('Student with this MSSV already exists in class');
            }

            await classData.addStudent(normalized.mssv, normalized.name, normalized.phone, normalized.email);
            return classData;
        } catch (error) {
            throw new Error(`Error adding student: ${error.message}`);
        }
    }

    /**
     * Xóa sinh viên khỏi lớp
     */
    async removeStudent(classId, mssv, userId = 'default') {
        try {
            const classData = await Class.findByClassId(classId, userId);
            if (!classData) {
                throw new Error('Class not found');
            }

            await classData.removeStudent(normalizeText(mssv));
            return classData;
        } catch (error) {
            throw new Error(`Error removing student: ${error.message}`);
        }
    }

    /**
     * Cập nhật thông tin sinh viên
     */
    async updateStudent(classId, mssv, updates, userId = 'default') {
        try {
            const classData = await Class.findByClassId(classId, userId);
            if (!classData) {
                throw new Error('Class not found');
            }

            const normalizedUpdates = normalizeStudentUpdates(updates);
            if (Object.keys(normalizedUpdates).length === 0) {
                throw new Error('No valid fields to update');
            }

            await classData.updateStudent(normalizeText(mssv), normalizedUpdates);
            return classData;
        } catch (error) {
            throw new Error(`Error updating student: ${error.message}`);
        }
    }

    /**
     * Thêm nhiều sinh viên cùng lúc (bulk add)
     */
    async addStudentsBulk(classId, studentsArray, userId = 'default') {
        try {
            const classData = await Class.findByClassId(classId, userId);
            if (!classData) {
                throw new Error('Class not found');
            }

            const results = {
                success: [],
                failed: []
            };

            for (const student of studentsArray) {
                try {
                    const normalized = normalizeStudent(student);

                    // Kiểm tra trùng MSSV
                    const key = normalized.mssv.toUpperCase();
                    const exists = classData.students.some(
                        s => String(s.mssv || '').trim().toUpperCase() === key
                    );
                    if (!exists) {
                        classData.students.push(normalized);
                        results.success.push(normalized.mssv);
                    } else {
                        results.failed.push({ mssv: normalized.mssv, reason: 'Duplicate MSSV' });
                    }
                } catch (error) {
                    results.failed.push({ mssv: student.mssv, reason: error.message });
                }
            }

            await classData.save();
            return { classData, results };
        } catch (error) {
            throw new Error(`Error adding students in bulk: ${error.message}`);
        }
    }

    /**
     * Lưu trữ lớp (Archive)
     */
    async archiveClass(classId, userId = 'default') {
        try {
            const classData = await Class.findByClassId(classId, userId);
            if (!classData) {
                throw new Error('Class not found');
            }

            classData.isArchived = true;
            await classData.save();
            return classData;
        } catch (error) {
            throw new Error(`Error archiving class: ${error.message}`);
        }
    }

    /**
     * Bỏ lưu trữ lớp (Unarchive)
     */
    async unarchiveClass(classId, userId = 'default') {
        try {
            const classData = await Class.findByClassId(classId, userId);
            if (!classData) {
                throw new Error('Class not found');
            }

            classData.isArchived = false;
            await classData.save();
            return classData;
        } catch (error) {
            throw new Error(`Error unarchiving class: ${error.message}`);
        }
    }
}

module.exports = new ClassService();
