const AttendanceSession = require('../models/attendance.model');
const Class = require('../models/class.model');
const brandingService = require('../services/branding.service');
const { parseDateRange, buildInvoiceData } = require('../utils/invoice.util');
const { createInvoiceWorkbook } = require('../utils/excel.util');

/**
 * Nạp dữ liệu cần thiết để dựng hóa đơn.
 * CHỈ ĐỌC - không có bất kỳ thao tác ghi nào lên database.
 * @param {string} classId
 * @param {object} query - query string chứa from / to
 * @returns {Promise<object|null>} null nếu không tìm thấy lớp
 */
async function loadInvoice(classId, query) {
    const classData = await Class.findOne({ classId }).lean();
    if (!classData) return null;

    const { from, to } = parseDateRange(query && query.from, query && query.to);

    const filter = { classId };
    if (from || to) {
        filter.date = {};
        if (from) filter.date.$gte = from;
        if (to) filter.date.$lte = to;
    }

    const sessions = await AttendanceSession.find(filter).sort({ date: 1 }).lean();
    const branding = await brandingService.getGlobalBranding();

    return buildInvoiceData({ classData, sessions, from, to, branding });
}

/**
 * GET /api/classes/:classId/invoice?from=&to=
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
