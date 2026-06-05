const mongoose = require('mongoose');

const studentReportSchema = new mongoose.Schema({
    classId: {
        type: String,
        required: true,
        index: true
    },
    mssv: {
        type: String,
        required: true,
        index: true
    },
    studentName: {
        type: String,
        required: true
    },
    date: {
        type: String, // Format: YYYY-MM-DD
        required: true,
        index: true
    },
    answers: {
        type: mongoose.Schema.Types.Mixed, // Key-value pairs of question _id -> answer text
        default: {}
    }
}, {
    timestamps: true,
    collection: 'studentReports'
});

// Unique: mỗi sinh viên chỉ có 1 báo cáo cho mỗi ngày trong mỗi lớp
studentReportSchema.index({ classId: 1, mssv: 1, date: 1 }, { unique: true });
// Index for fetching all reports for a class on a specific date
studentReportSchema.index({ classId: 1, date: 1 });

const StudentReport = mongoose.model('StudentReport', studentReportSchema);

module.exports = StudentReport;
