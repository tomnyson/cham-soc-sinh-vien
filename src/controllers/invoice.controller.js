const AttendanceSession = require('../models/attendance.model');
const Class = require('../models/class.model');
const Payment = require('../models/payment.model');
const brandingService = require('../services/branding.service');
const { parseDateRange, parseVoucher, buildInvoiceData } = require('../utils/invoice.util');
const { createInvoiceWorkbook } = require('../utils/excel.util');

const MSSV_MAX_LENGTH = 50;

/**
 * Nạp dữ liệu cần thiết để dựng hóa đơn.
 * CHỈ ĐỌC - không có bất kỳ thao tác ghi nào lên database.
 * @param {string} classId
 * @param {object} query - query string chứa from / to / mssv / voucher
 * @returns {Promise<object|null>} null nếu không tìm thấy lớp
 */
async function loadInvoice(classId, query) {
    const classData = await Class.findOne({ classId }).lean();
    if (!classData) return null;

    const { from, to } = parseDateRange(query && query.from, query && query.to);

    const mssv = String((query && query.mssv) || '').trim().slice(0, MSSV_MAX_LENGTH);

    const dateRange = {};
    if (from) dateRange.$gte = from;
    if (to) dateRange.$lte = to;
    const hasRange = Boolean(from || to);

    const sessionFilter = hasRange ? { classId, date: dateRange } : { classId };
    const paymentFilter = {
        classId,
        status: 'active',
        ...(mssv ? { mssv } : {}),
        ...(hasRange ? { paidAt: dateRange } : {})
    };

    const [sessions, payments, branding] = await Promise.all([
        AttendanceSession.find(sessionFilter).sort({ date: 1 }).lean(),
        Payment.find(paymentFilter).sort({ paidAt: 1 }).lean(),
        brandingService.getGlobalBranding()
    ]);
    const voucher = parseVoucher(query);

    return buildInvoiceData({ classData, sessions, from, to, branding, voucher, mssv, payments });
}

/**
 * GET /api/classes/:classId/invoice?from=&to=&mssv=
 * Trả dữ liệu hóa đơn dạng JSON
 */
exports.getInvoiceData = async (req, res, next) => {
    try {
        const invoice = await loadInvoice(req.params.classId, req.query);
        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy lớp học' });
        }
        return res.json({ success: true, data: invoice });
    } catch (error) {
        return next(error);
    }
};

/**
 * GET /api/classes/:classId/invoice/export?from=&to=
 * Tải hóa đơn dạng file Excel
 */
exports.exportInvoiceExcel = async (req, res, next) => {
    try {
        const invoice = await loadInvoice(req.params.classId, req.query);
        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy lớp học' });
        }

        const buffer = createInvoiceWorkbook(invoice);
        const fileName = `${invoice.invoiceNo}.xlsx`.replace(/[^a-zA-Z0-9._-]/g, '_');

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        return res.send(buffer);
    } catch (error) {
        return next(error);
    }
};

exports.loadInvoice = loadInvoice;
