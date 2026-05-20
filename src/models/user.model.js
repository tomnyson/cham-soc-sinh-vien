const mongoose = require('mongoose');

/**
 * User Schema
 *
 * Stores user information for Google OAuth authentication.
 *
 * Roles:
 *   - 'admin'    : Super admin (managed via SUPER_ADMIN_EMAILS env). Bypasses all
 *                  access checks. Can approve/manage lecturers.
 *   - 'lecturer' : Regular teacher account. Must be approved (status='active')
 *                  and within `serviceExpiresAt` to access internal features.
 *   - 'user'     : Legacy value kept for backward compatibility. New accounts
 *                  default to 'lecturer'.
 *
 * Status (only meaningful for non-admin accounts):
 *   - 'pending'  : Newly registered, waiting for super admin approval.
 *   - 'active'   : Approved by super admin. Combined with `serviceExpiresAt`
 *                  decides whether the account can access internal features.
 *   - 'rejected' : Super admin rejected the request.
 *   - 'suspended': Temporarily disabled by super admin.
 */
const userSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    picture: {
        type: String
    },
    role: {
        type: String,
        enum: ['user', 'lecturer', 'admin'],
        default: 'lecturer'
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'rejected', 'suspended'],
        default: 'pending',
        index: true
    },
    serviceExpiresAt: {
        type: Date,
        default: null
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    approvedAt: {
        type: Date,
        default: null
    },
    notes: {
        type: String,
        default: ''
    },
    lastLogin: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes
userSchema.index({ role: 1, status: 1 });

// Virtuals
userSchema.virtual('isExpired').get(function () {
    if (this.role === 'admin') return false;
    if (!this.serviceExpiresAt) return false;
    return new Date(this.serviceExpiresAt).getTime() < Date.now();
});

userSchema.virtual('canAccessInternal').get(function () {
    if (this.role === 'admin') return true;
    if (this.status !== 'active') return false;
    if (!this.serviceExpiresAt) return true;
    return new Date(this.serviceExpiresAt).getTime() >= Date.now();
});

// Methods
userSchema.methods.toJSON = function () {
    const user = this.toObject({ virtuals: true });
    delete user.__v;
    return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
