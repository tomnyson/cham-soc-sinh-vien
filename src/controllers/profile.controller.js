const profileService = require('../services/profile.service');

/**
 * Profile Controller - Xử lý requests liên quan đến profiles
 */

/**
 * Helper: serialize a profile document to a plain response object.
 */
function serializeProfile(profile) {
    return {
        profileId: profile.profileId,
        name: profile.name,
        passThreshold: profile.passThreshold,
        weights: Object.fromEntries(profile.weights || new Map()),
        columnTypes: Object.fromEntries(profile.columnTypes || new Map()),
        isDefault: profile.isDefault,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
    };
}

/**
 * Lấy tất cả profiles
 */
const getAllProfiles = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const profiles = await profileService.getAllProfiles(userId);
        res.json({ success: true, data: profiles.map(serializeProfile) });
    } catch (error) {
        next(error);
    }
};

/**
 * Lấy profile theo ID
 */
const getProfileById = async (req, res, next) => {
    try {
        const { profileId } = req.params;
        const userId = req.user._id;
        const profile = await profileService.getProfileById(profileId, userId);
        res.json({ success: true, data: serializeProfile(profile) });
    } catch (error) {
        next(error);
    }
};

/**
 * Lấy profile mặc định
 */
const getDefaultProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const profile = await profileService.getDefaultProfile(userId);
        if (!profile) {
            return res.json({ success: true, data: null });
        }
        res.json({ success: true, data: serializeProfile(profile) });
    } catch (error) {
        next(error);
    }
};

/**
 * Tạo profile mới
 */
const createProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const profile = await profileService.createProfile(req.body, userId);
        res.status(201).json({
            success: true,
            data: serializeProfile(profile),
            message: 'Profile created successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Tạo nhanh profile mặc định cho user hiện tại
 */
const createDefaultProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { profile, created } = await profileService.ensureDefaultProfile(userId);
        res.status(created ? 201 : 200).json({
            success: true,
            data: serializeProfile(profile),
            message: created
                ? 'Default profile created successfully'
                : 'Default profile already exists'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cập nhật profile
 */
const updateProfile = async (req, res, next) => {
    try {
        const { profileId } = req.params;
        const userId = req.user._id;
        const profile = await profileService.updateProfile(profileId, req.body, userId);
        res.json({
            success: true,
            data: serializeProfile(profile),
            message: 'Profile updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Xóa profile
 */
const deleteProfile = async (req, res, next) => {
    try {
        const { profileId } = req.params;
        const userId = req.user._id;
        const result = await profileService.deleteProfile(profileId, userId);
        res.json({ success: true, message: result.message });
    } catch (error) {
        next(error);
    }
};

/**
 * Nhân bản profile
 */
const duplicateProfile = async (req, res, next) => {
    try {
        const { profileId } = req.params;
        const userId = req.user._id;
        const profile = await profileService.duplicateProfile(profileId, req.body, userId);
        res.status(201).json({
            success: true,
            data: serializeProfile(profile),
            message: 'Profile duplicated successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Import profiles
 */
const importProfiles = async (req, res, next) => {
    try {
        const { profiles } = req.body;
        const userId = req.user._id;
        if (!profiles || typeof profiles !== 'object') {
            return res.status(400).json({ success: false, error: 'Invalid profiles data' });
        }
        const results = await profileService.importProfiles(profiles, userId);
        res.json({
            success: true,
            data: results,
            message: `Imported ${results.success.length} profiles successfully`
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Export profiles
 */
const exportProfiles = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const profiles = await profileService.exportProfiles(userId);
        res.json({ success: true, data: profiles });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllProfiles,
    getProfileById,
    getDefaultProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    duplicateProfile,
    importProfiles,
    exportProfiles,
    createDefaultProfile
};
