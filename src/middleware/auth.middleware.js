const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * Authentication Middleware
 */

/**
 * Verify JWT token from cookie or Authorization header
 */
exports.authenticate = async (req, res, next) => {
    try {
        // If user is already authenticated via passport session, accept it.
        // This prevents 401 errors when the JWT token expires but the
        // passport session (set by passport.session() middleware) is still valid.
        if (req.user && req.user._id) {
            return next();
        }

        let token;

        // Check for token in cookie
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        // Check for token in Authorization header
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.substring(7);
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please login to continue.'
            });
        }

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'your-secret-key-change-in-production'
        );

        // Get user from token
        const user = await User.findById(decoded.id).select('-__v');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found. Please login again.'
            });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Please login again.'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

/**
 * Compute the access state for the given user.
 *
 * @returns {{allowed: boolean, reason?: string, message?: string}}
 */
function evaluateLecturerAccess(user) {
    if (!user) {
        return { allowed: false, reason: 'unauthenticated', message: 'Authentication required' };
    }
    if (user.role === 'admin') {
        return { allowed: true };
    }
    if (user.status === 'pending') {
        return {
            allowed: false,
            reason: 'pending_approval',
            message: 'Tài khoản đang chờ super admin duyệt.'
        };
    }
    if (user.status === 'rejected') {
        return {
            allowed: false,
            reason: 'rejected',
            message: 'Tài khoản đã bị từ chối. Vui lòng liên hệ quản trị viên.'
        };
    }
    if (user.status === 'suspended') {
        return {
            allowed: false,
            reason: 'suspended',
            message: 'Tài khoản đã bị tạm khoá. Vui lòng liên hệ quản trị viên.'
        };
    }
    if (user.status !== 'active') {
        return {
            allowed: false,
            reason: 'inactive',
            message: 'Tài khoản chưa được kích hoạt.'
        };
    }
    if (user.serviceExpiresAt && new Date(user.serviceExpiresAt).getTime() < Date.now()) {
        return {
            allowed: false,
            reason: 'expired',
            message: 'Tài khoản đã hết hạn sử dụng. Vui lòng liên hệ quản trị viên để gia hạn.'
        };
    }
    return { allowed: true };
}

exports.evaluateLecturerAccess = evaluateLecturerAccess;

/**
 * Check if user has admin role
 */
exports.requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }

    next();
};

/**
 * Require an active, non-expired lecturer (or admin) account.
 *
 * Used for internal feature endpoints (classes, profiles, dashboard, ...).
 * Pending/rejected/suspended/expired accounts get a structured 403 so the
 * client can display the appropriate message.
 */
exports.requireActiveLecturer = (req, res, next) => {
    const verdict = evaluateLecturerAccess(req.user);
    if (verdict.allowed) {
        return next();
    }

    const status = verdict.reason === 'unauthenticated' ? 401 : 403;
    return res.status(status).json({
        success: false,
        message: verdict.message,
        reason: verdict.reason
    });
};

/**
 * Optional authentication - doesn't fail if not authenticated
 */
exports.optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.substring(7);
        }

        if (token) {
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || 'your-secret-key-change-in-production'
            );
            const user = await User.findById(decoded.id).select('-__v');
            if (user) {
                req.user = user;
            }
        }
    } catch (error) {
        // Silently fail for optional auth
        console.log('Optional auth failed:', error.message);
    }

    next();
};
