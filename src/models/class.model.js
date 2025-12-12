const mongoose = require('mongoose');

/**
 * Student Sub-Schema
 */
const studentSchema = new mongoose.Schema({
    mssv: {
        type: String,
        required: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    }
}, { _id: false });

/**
 * Class Schema - Lưu trữ thông tin lớp học
 */
const classSchema = new mongoose.Schema({
    // ID tùy chỉnh (để tương thích với frontend)
    classId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Tên lớp
    name: {
        type: String,
        required: true,
        trim: true
    },

    // Mô tả lớp
    description: {
        type: String,
        default: '',
        trim: true
    },

    // Danh sách sinh viên
    students: {
        type: [studentSchema],
        default: []
    },

    // Điểm của lớp
    grades: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },

    // User ID (để phân biệt lớp của từng user - có thể mở rộng sau)
    userId: {
        type: String,
        default: 'default',
        index: true
    },

    // Trạng thái lưu trữ
    isArchived: {
        type: Boolean,
        default: false,
        index: true
    }
}, {
    timestamps: true,
    collection: 'classes'
});

// Index cho tìm kiếm
classSchema.index({ userId: 1, classId: 1 });
classSchema.index({ userId: 1, name: 1 });

// Virtual để lấy số lượng sinh viên
classSchema.virtual('studentCount').get(function () {
    return this.students ? this.students.length : 0;
});

// Đảm bảo virtuals được included khi convert to JSON
classSchema.set('toJSON', { virtuals: true });
classSchema.set('toObject', { virtuals: true });

// Static method: Tìm lớp theo classId và userId
classSchema.statics.findByClassId = function (classId, userId = 'default') {
    return this.findOne({ classId, userId });
};

// Static method: Lấy tất cả lớp của user
classSchema.statics.findByUserId = function (userId = 'default') {
    return this.find({ userId }).sort({ createdAt: -1 });
};

// Instance method: Thêm sinh viên
classSchema.methods.addStudent = function (mssv, name) {
    this.students.push({ mssv, name });
    return this.save();
};

// Instance method: Xóa sinh viên
classSchema.methods.removeStudent = function (mssv) {
    this.students = this.students.filter(s => s.mssv !== mssv);
    return this.save();
};

// Instance method: Cập nhật sinh viên
classSchema.methods.updateStudent = function (mssv, newData) {
    const student = this.students.find(s => s.mssv === mssv);
    if (student) {
        Object.assign(student, newData);
        return this.save();
    }
    return Promise.reject(new Error('Student not found'));
};

const Class = mongoose.model('Class', classSchema);

module.exports = Class;
