const lecturerAdminService = require('../services/lecturer-admin.service');

/**
 * GET /api/admin/lecturers
 */
exports.list = async (req, res) => {
    const { status } = req.query;
    const items = await lecturerAdminService.list({ status });
    const stats = await lecturerAdminService.stats();
    res.json({ success: true, data: items, stats });
};

/**
 * GET /api/admin/lecturers/:id
 */
exports.getById = async (req, res) => {
    const item = await lecturerAdminService.getById(req.params.id);
    res.json({ success: true, data: item });
};

/**
 * POST /api/admin/lecturers/:id/approve
 * Body: { serviceExpiresAt?: ISO string|null, notes?: string }
 */
exports.approve = async (req, res) => {
    const item = await lecturerAdminService.approve(req.params.id, {
        serviceExpiresAt: req.body?.serviceExpiresAt ?? null,
        notes: req.body?.notes,
        approverId: req.user?._id
    });
    res.json({ success: true, message: 'Đã duyệt tài khoản', data: item });
};

/**
 * POST /api/admin/lecturers/:id/reject
 */
exports.reject = async (req, res) => {
    const item = await lecturerAdminService.reject(req.params.id, {
        notes: req.body?.notes,
        approverId: req.user?._id
    });
    res.json({ success: true, message: 'Đã từ chối tài khoản', data: item });
};

/**
 * POST /api/admin/lecturers/:id/suspend
 */
exports.suspend = async (req, res) => {
    const item = await lecturerAdminService.suspend(req.params.id, {
        notes: req.body?.notes,
        approverId: req.user?._id
    });
    res.json({ success: true, message: 'Đã tạm khoá tài khoản', data: item });
};

/**
 * PUT /api/admin/lecturers/:id
 * Body: { serviceExpiresAt?, status?, notes?, name? }
 */
exports.update = async (req, res) => {
    const item = await lecturerAdminService.update(req.params.id, req.body || {}, {
        approverId: req.user?._id
    });
    res.json({ success: true, message: 'Đã cập nhật tài khoản', data: item });
};

/**
 * DELETE /api/admin/lecturers/:id
 */
exports.remove = async (req, res) => {
    const result = await lecturerAdminService.remove(req.params.id);
    res.json({ success: true, message: 'Đã xoá tài khoản', data: result });
};
