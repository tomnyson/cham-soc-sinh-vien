const mongoose = require('mongoose');

/**
 * Profile Schema - Lưu trữ cấu hình trọng số điểm
 */
const profileSchema = new mongoose.Schema({
    // ID tùy chỉnh (để tương thích với frontend)
    profileId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Tên profile
    name: {
        type: String,
        required: true,
        trim: true
    },

    // Ngưỡng qua môn
    passThreshold: {
        type: Number,
        required: true,
        default: 3,
        min: 0,
        max: 10
    },

    // Trọng số các cột điểm
    weights: {
        type: Map,
        of: Number,
        required: true,
        default: {}
    },

    // User ID (để phân biệt profiles của từng user - có thể mở rộng sau)
    userId: {
        type: String,
        default: 'default',
        index: true
    },

    // Đánh dấu profile mặc định
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true, // Tự động thêm createdAt, updatedAt
    collection: 'profiles'
});

// Index cho tìm kiếm
profileSchema.index({ userId: 1, profileId: 1 });
profileSchema.index({ userId: 1, isDefault: 1 });

// Virtual để lấy tổng trọng số
profileSchema.virtual('totalWeight').get(function() {
    if (!this.weights) return 0;
    return Array.from(this.weights.values()).reduce((sum, weight) => sum + weight, 0);
});

// Đảm bảo virtuals được included khi convert to JSON
profileSchema.set('toJSON', { virtuals: true });
profileSchema.set('toObject', { virtuals: true });

// Static method: Tìm profile theo profileId và userId
profileSchema.statics.findByProfileId = function(profileId, userId = 'default') {
    return this.findOne({ profileId, userId });
};

// Static method: Lấy tất cả profiles của user
profileSchema.statics.findByUserId = function(userId = 'default') {
    return this.find({ userId }).sort({ createdAt: -1 });
};

// Static method: Lấy profile mặc định
profileSchema.statics.findDefaultProfile = function(userId = 'default') {
    return this.findOne({ userId, isDefault: true });
};

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
