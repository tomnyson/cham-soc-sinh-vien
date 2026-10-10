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
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    }
}, { _id: false });

/**
 * Invoice Config Sub-Schema - Thông tin xuất hóa đơn của lớp
 */
const invoiceConfigSchema = new mongoose.Schema({
    centerName: { type: String, default: '', trim: true, maxlength: 120 },
    payerName: { type: String, default: '', trim: true, maxlength: 120 },
    payerPhone: { type: String, default: '', trim: true, maxlength: 30 },
    payerAddress: { type: String, default: '', trim: true, maxlength: 200 },
    bankCode: { type: String, default: '', trim: true, maxlength: 20 },
    bankAccount: { type: String, default: '', trim: true, maxlength: 30 },
    bankAccountName: { type: String, default: '', trim: true, maxlength: 120 },
    note: { type: String, default: '', trim: true, maxlength: 300 }
}, { _id: false });

/**
 * Schedule Slot Sub-Schema - Khung giờ học cố định hằng tuần
 * Kiểm tra chính ở src/utils/schedule.util.js, ở đây chỉ là lưới an toàn.
 */
const scheduleSlotSchema = new mongoose.Schema({
    weekday: { type: Number, required: true, min: 0, max: 6 }, // 0 = Chủ nhật … 6 = Thứ bảy
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ }, // 'HH:mm'
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    startDate: { type: Date, required: true }, // 00:00 giờ VN của ngày bắt đầu
    endDate: { type: Date, default: null }, // null = không giới hạn
    location: { type: String, default: '', trim: true, maxlength: 100 }
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

    // Mức giá / giờ học
    hourlyRate: {
        type: Number,
        default: 0
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
    },

    // Năm học (VD: 2025).
    year: {
        type: Number,
        default: null
    },

    // Block trong kỳ (1 hoặc 2). Để trống nếu không áp dụng.
    block: {
        type: Number,
        enum: [1, 2],
        default: null
    },

    // Kỳ học: spring | summer | fall.
    semester: {
        type: String,
        enum: [null, '', 'spring', 'summer', 'fall'],
        default: null
    },

    // Mã giảng viên phụ trách (VD: HungNX).
    instructorCode: {
        type: String,
        default: '',
        trim: true
    },

    // Cấu hình xuất hóa đơn (thêm mới - lớp cũ không có field này vẫn hoạt động bình thường)
    invoiceConfig: {
        type: invoiceConfigSchema,
        default: () => ({})
    },

    // Lịch học cố định hằng tuần (thêm mới - lớp cũ không có field này mặc định [])
    schedule: {
        type: [scheduleSlotSchema],
        default: []
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
classSchema.methods.addStudent = function (mssv, name, phone = '', email = '') {
    this.students.push({ mssv, name, phone, email });
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
