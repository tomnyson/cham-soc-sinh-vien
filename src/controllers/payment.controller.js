const mongoose = require('mongoose');
const AttendanceSession = require('../models/attendance.model');
const Payment = require('../models/payment.model');
const classService = require('../services/class.service');
const { parseDateRange } = require('../utils/invoice.util');
const { buildStudentLedger, parsePaymentInput } = require('../utils/payment.util');

const VOID_REASON_MAX_LENGTH = 200;

/**
 * Lấy lớp thuộc user đang đăng nhập. Trả null nếu không có hoặc không thuộc user.
 * @param {string} classId
 * @param {object} user
 * @returns {Promise<object|null>}
 */
async function findOwnedClass(classId, user) {
    try {
        return await classService.getClassById(classId, user && user._id);
    } catch (error) {
        if (error.message.includes('Class not found')) return null;
        throw error;
    }
}

function notFound(res) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy lớp học' });
}

function inRange(date, from, to) {
    const time = new Date(date).getTime();
    if (from && time < from.getTime()) return false;
    if (to && time > to.getTime()) return false;
    return true;
}

/**
 * GET /api/classes/:classId/payments?mssv=&from=&to=
 * - payments: lịch sử thu (kể cả đã huỷ) theo khoảng ngày + học viên
 * - ledger: công nợ từng học viên trên toàn bộ thời gian
 * - rangeSummary: phát sinh / đã thu / còn nợ trong khoảng ngày (cả lớp hoặc 1 học viên)
 */
exports.getPayments = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const classData = await findOwnedClass(classId, req.user);
        if (!classData) return notFound(res);

        const query = req.query || {};
        const mssv = String(query.mssv || '').trim();
        const { from, to } = parseDateRange(query.from, query.to);

        const [sessions, allPayments] = await Promise.all([
            AttendanceSession.find({ classId }).lean(),
            Payment.find({ classId }).sort({ paidAt: -1, createdAt: -1 }).lean()
        ]);

        const students = classData.students || [];
        const ledger = buildStudentLedger({ students, sessions, payments: allPayments });

        const rangeLedger = buildStudentLedger({
            students,
            sessions: sessions.filter(s => inRange(s.date, from, to)),
            payments: allPayments.filter(p => inRange(p.paidAt, from, to))
        });
        const rangeEntry = mssv ? rangeLedger.students.find(s => s.mssv === mssv) : null;
        const rangeSummary = mssv
            ? {
                charged: rangeEntry ? rangeEntry.charged : 0,
                paid: rangeEntry ? rangeEntry.paid : 0,
                outstanding: rangeEntry ? rangeEntry.outstanding : 0
            }
            : {
                charged: rangeLedger.totals.charged,
                paid: rangeLedger.totals.paid,
                outstanding: rangeLedger.totals.outstanding
            };

        const payments = allPayments.filter(
            p => inRange(p.paidAt, from, to) && (!mssv || p.mssv === mssv)
        );

        return res.json({ success: true, data: { payments, ledger, rangeSummary } });
    } catch (error) {
        return next(error);
    }
};

/**
 * POST /api/classes/:classId/payments
 * Ghi nhận một lần thu tiền của học viên.
 */
exports.createPayment = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const classData = await findOwnedClass(classId, req.user);
        if (!classData) return notFound(res);

        const { value, error } = parsePaymentInput(req.body, classData.students);
        if (error) return res.status(400).json({ success: false, error });

        const payment = await Payment.create({
            ...value,
            classId,
            createdBy: String(req.user.id || req.user._id || 'unknown')
        });

        return res.status(201).json({
            success: true,
            data: payment,
            message: 'Đã ghi nhận khoản thu'
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * PUT /api/classes/:classId/payments/:paymentId/void
 * Huỷ một khoản thu ghi nhầm. Không xoá bản ghi để giữ lịch sử.
 */
exports.voidPayment = async (req, res, next) => {
    try {
        const { classId, paymentId } = req.params;
        const classData = await findOwnedClass(classId, req.user);
        if (!classData) return notFound(res);

        if (!mongoose.isValidObjectId(paymentId)) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy khoản thu' });
        }

        const reason = String((req.body && req.body.reason) || '').trim();
        if (reason.length > VOID_REASON_MAX_LENGTH) {
            return res.status(400).json({
                success: false,
                error: `Lý do huỷ tối đa ${VOID_REASON_MAX_LENGTH} ký tự.`
            });
        }

        const payment = await Payment.findOneAndUpdate(
            { _id: paymentId, classId, status: 'active' },
            {
                $set: {
                    status: 'voided',
                    voidedAt: new Date(),
                    voidedBy: String(req.user.id || req.user._id || 'unknown'),
                    voidReason: reason
                }
            },
            { new: true }
        );

        if (!payment) {
            const exists = await Payment.exists({ _id: paymentId, classId });
            return exists
                ? res.status(400).json({ success: false, error: 'Khoản thu đã được huỷ trước đó' })
                : res.status(404).json({ success: false, error: 'Không tìm thấy khoản thu' });
        }

        return res.json({ success: true, data: payment, message: 'Đã huỷ khoản thu' });
    } catch (error) {
        return next(error);
    }
};
