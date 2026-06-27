const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
    mssv: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['present', 'absent'],
        default: 'present'
    }
}, { _id: false });

const attendanceSessionSchema = new mongoose.Schema({
    classId: {
        type: String,
        required: true,
        index: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    durationHours: {
        type: Number,
        required: true,
        min: 0.1
    },
    hourlyRate: {
        type: Number,
        default: 0
    },
    totalCost: {
        type: Number,
        default: 0
    },
    records: {
        type: [attendanceRecordSchema],
        default: []
    },
    createdBy: {
        type: String,
        required: true
    }
}, {
    timestamps: true,
    collection: 'attendancesessions'
});

// Calculate totalCost before saving
attendanceSessionSchema.pre('save', function(next) {
    if (this.durationHours && this.hourlyRate) {
        this.totalCost = this.durationHours * this.hourlyRate;
    } else {
        this.totalCost = 0;
    }
    next();
});

const AttendanceSession = mongoose.model('AttendanceSession', attendanceSessionSchema);

module.exports = AttendanceSession;
