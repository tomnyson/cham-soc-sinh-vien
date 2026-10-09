const mongoose = require('mongoose');

/**
 * Payment Schema - Mỗi lần thu tiền của một học viên trong lớp.
 * Không xoá bản ghi: ghi nhầm thì chuyển status sang 'voided'.
 */
const paymentSchema = new mongoose.Schema({
    classId: {
        type: String,
        required: true,
        index: true
    },
    mssv: {
        type: String,
        required: true,
        trim: true
    },
    // Số tiền VND (số nguyên > 0)
    amount: {
        type: Number,
        required: true,
        min: 1
    },
    paidAt: {
        type: Date,
        default: Date.now
    },
    method: {
        type: String,
        enum: ['cash', 'transfer', 'discount'],
        default: 'cash'
    },
    note: {
        type: String,
        default: '',
        trim: true,
        maxlength: 300
    },
    status: {
        type: String,
        enum: ['active', 'voided'],
        default: 'active'
    },
    createdBy: {
        type: String,
        required: true
    },
    voidedAt: {
        type: Date,
        default: null
    },
    voidedBy: {
        type: String,
        default: ''
    },
    voidReason: {
        type: String,
        default: '',
        trim: true,
        maxlength: 200
    }
}, {
    timestamps: true,
    collection: 'payments'
});

paymentSchema.index({ classId: 1, mssv: 1, paidAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
