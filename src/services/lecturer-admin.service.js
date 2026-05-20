/**
 * Lecturer admin service
 *
 * Encapsulates the queries/mutations the super admin uses to manage lecturer
 * accounts (list, approve, reject, suspend, extend, etc.).
 */

const User = require('../models/user.model');
const { isSuperAdminEmail } = require('../utils/super-admin.util');

const STATUSES = ['pending', 'active', 'rejected', 'suspended'];

function createValidationError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

function createNotFoundError(message = 'Không tìm thấy tài khoản') {
    const error = new Error(message);
    error.statusCode = 404;
    return error;
}

function parseExpiry(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw createValidationError('serviceExpiresAt không hợp lệ');
    }
    return date;
}

function serializeLecturer(doc) {
    if (!doc) return null;
    const obj = doc.toObject ? doc.toObject({ virtuals: true }) : doc;
    return {
        id: obj._id?.toString?.() || String(obj._id || ''),
        email: obj.email || '',
        name: obj.name || '',
        picture: obj.picture || '',
        role: obj.role || 'lecturer',
        status: obj.status || 'pending',
        serviceExpiresAt: obj.serviceExpiresAt || null,
        approvedAt: obj.approvedAt || null,
        approvedBy: obj.approvedBy ? String(obj.approvedBy) : null,
        notes: obj.notes || '',
        lastLogin: obj.lastLogin || null,
        createdAt: obj.createdAt || null,
        updatedAt: obj.updatedAt || null,
        isExpired: typeof obj.isExpired === 'boolean'
            ? obj.isExpired
            : (obj.serviceExpiresAt ? new Date(obj.serviceExpiresAt).getTime() < Date.now() : false),
        isSuperAdmin: isSuperAdminEmail(obj.email)
    };
}

class LecturerAdminService {
    /**
     * Return all non-admin accounts (lecturers + legacy 'user' role) plus a
     * computed access state. Optionally filter by status.
     */
    async list({ status } = {}) {
        const query = { role: { $ne: 'admin' } };
        if (status && STATUSES.includes(status)) {
            query.status = status;
        }
        const docs = await User.find(query).sort({ createdAt: -1 }).lean();
        return docs.map(d => serializeLecturer(d));
    }

    async getById(id) {
        const doc = await User.findById(id);
        if (!doc) throw createNotFoundError();
        return serializeLecturer(doc);
    }

    async approve(id, { serviceExpiresAt = null, approverId = null, notes } = {}) {
        const doc = await User.findById(id);
        if (!doc) throw createNotFoundError();
        if (doc.role === 'admin') {
            throw createValidationError('Không thể thay đổi trạng thái của super admin');
        }

        doc.status = 'active';
        doc.role = doc.role === 'admin' ? 'admin' : 'lecturer';
        doc.serviceExpiresAt = parseExpiry(serviceExpiresAt);
        doc.approvedAt = new Date();
        doc.approvedBy = approverId || null;
        if (typeof notes === 'string') doc.notes = notes;
        await doc.save();
        return serializeLecturer(doc);
    }

    async reject(id, { approverId = null, notes } = {}) {
        const doc = await User.findById(id);
        if (!doc) throw createNotFoundError();
        if (doc.role === 'admin') {
            throw createValidationError('Không thể thay đổi trạng thái của super admin');
        }

        doc.status = 'rejected';
        doc.serviceExpiresAt = null;
        doc.approvedAt = new Date();
        doc.approvedBy = approverId || null;
        if (typeof notes === 'string') doc.notes = notes;
        await doc.save();
        return serializeLecturer(doc);
    }

    async suspend(id, { approverId = null, notes } = {}) {
        const doc = await User.findById(id);
        if (!doc) throw createNotFoundError();
        if (doc.role === 'admin') {
            throw createValidationError('Không thể thay đổi trạng thái của super admin');
        }

        doc.status = 'suspended';
        doc.approvedAt = new Date();
        doc.approvedBy = approverId || null;
        if (typeof notes === 'string') doc.notes = notes;
        await doc.save();
        return serializeLecturer(doc);
    }

    /**
     * Update arbitrary fields on a lecturer record. Used both for "extend"
     * (changing only serviceExpiresAt) and full edits.
     */
    async update(id, payload = {}, { approverId = null } = {}) {
        const doc = await User.findById(id);
        if (!doc) throw createNotFoundError();
        if (doc.role === 'admin') {
            throw createValidationError('Không thể chỉnh sửa super admin từ giao diện này');
        }

        if (Object.prototype.hasOwnProperty.call(payload, 'serviceExpiresAt')) {
            doc.serviceExpiresAt = parseExpiry(payload.serviceExpiresAt);
        }

        if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
            if (!STATUSES.includes(payload.status)) {
                throw createValidationError('status không hợp lệ');
            }
            doc.status = payload.status;
            if (payload.status === 'active') {
                doc.approvedAt = new Date();
                doc.approvedBy = approverId || null;
            }
        }

        if (Object.prototype.hasOwnProperty.call(payload, 'notes') && typeof payload.notes === 'string') {
            doc.notes = payload.notes;
        }

        if (Object.prototype.hasOwnProperty.call(payload, 'name') && typeof payload.name === 'string' && payload.name.trim()) {
            doc.name = payload.name.trim();
        }

        await doc.save();
        return serializeLecturer(doc);
    }

    async remove(id) {
        const doc = await User.findById(id);
        if (!doc) throw createNotFoundError();
        if (doc.role === 'admin') {
            throw createValidationError('Không thể xoá super admin');
        }
        await User.deleteOne({ _id: doc._id });
        return { id: String(doc._id) };
    }

    /**
     * Aggregate counters for the admin dashboard.
     */
    async stats() {
        const [pending, active, rejected, suspended] = await Promise.all([
            User.countDocuments({ role: { $ne: 'admin' }, status: 'pending' }),
            User.countDocuments({ role: { $ne: 'admin' }, status: 'active' }),
            User.countDocuments({ role: { $ne: 'admin' }, status: 'rejected' }),
            User.countDocuments({ role: { $ne: 'admin' }, status: 'suspended' })
        ]);
        return { pending, active, rejected, suspended };
    }
}

module.exports = new LecturerAdminService();
module.exports.STATUSES = STATUSES;
module.exports.serializeLecturer = serializeLecturer;
