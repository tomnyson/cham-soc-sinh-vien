const Class = require('../models/class.model');

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
     * Tạo lớp mới
     */
    async createClass(classData, userId = 'default') {
        try {
            const { classId, name, description, students, grades } = classData;

            // Validate
            if (!classId || !name) {
                throw new Error('ClassId and name are required');
            }

            // Kiểm tra trùng classId
            const existing = await Class.findByClassId(classId, userId);
            if (existing) {
                throw new Error('Class with this ID already exists');
            }

            const newClass = new Class({
                classId,
                name,
                description: description || '',
                students: students || [],
                grades: grades || null,
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
            if (updates.name) classData.name = updates.name;
            if (updates.description !== undefined) classData.description = updates.description;
            if (updates.students) classData.students = updates.students;
            if (updates.grades !== undefined) classData.grades = updates.grades;

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

            const { mssv, name } = studentData;
            if (!mssv || !name) {
                throw new Error('MSSV and name are required');
            }

            // Kiểm tra trùng MSSV
            const exists = classData.students.some(s => s.mssv === mssv);
            if (exists) {
                throw new Error('Student with this MSSV already exists in class');
            }

            await classData.addStudent(mssv, name);
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

            await classData.removeStudent(mssv);
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

            await classData.updateStudent(mssv, updates);
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
                    const { mssv, name } = student;

                    // Kiểm tra trùng MSSV
                    const exists = classData.students.some(s => s.mssv === mssv);
                    if (!exists) {
                        classData.students.push({ mssv, name });
                        results.success.push(mssv);
                    } else {
                        results.failed.push({ mssv, reason: 'Duplicate MSSV' });
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
