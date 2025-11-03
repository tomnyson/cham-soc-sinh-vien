const profileService = require('../services/profile.service');

/**
 * Profile Controller - Xử lý requests liên quan đến profiles
 */

/**
 * Lấy tất cả profiles
 */
const getAllProfiles = async (req, res, next) => {
    try {
        const userId = req.query.userId || 'default';
        const profiles = await profileService.getAllProfiles(userId);

        // Convert Map to Object cho JSON response
        const formattedProfiles = profiles.map(profile => ({
            profileId: profile.profileId,
            name: profile.name,
            passThreshold: profile.passThreshold,
            weights: Object.fromEntries(profile.weights),
            isDefault: profile.isDefault,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt
        }));

        res.json({
            success: true,
            data: formattedProfiles
        });
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
        const userId = req.query.userId || 'default';

        const profile = await profileService.getProfileById(profileId, userId);

        res.json({
            success: true,
            data: {
                profileId: profile.profileId,
                name: profile.name,
                passThreshold: profile.passThreshold,
                weights: Object.fromEntries(profile.weights),
                isDefault: profile.isDefault
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Lấy profile mặc định
 */
const getDefaultProfile = async (req, res, next) => {
    try {
        const userId = req.query.userId || 'default';
        const profile = await profileService.getDefaultProfile(userId);

        if (!profile) {
            return res.json({
                success: true,
                data: null
            });
        }

        res.json({
            success: true,
            data: {
                profileId: profile.profileId,
                name: profile.name,
                passThreshold: profile.passThreshold,
                weights: Object.fromEntries(profile.weights),
                isDefault: profile.isDefault
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Tạo profile mới
 */
const createProfile = async (req, res, next) => {
    try {
        const userId = req.body.userId || 'default';
        const profile = await profileService.createProfile(req.body, userId);

        res.status(201).json({
            success: true,
            data: {
                profileId: profile.profileId,
                name: profile.name,
                passThreshold: profile.passThreshold,
                weights: Object.fromEntries(profile.weights),
                isDefault: profile.isDefault
            },
            message: 'Profile created successfully'
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
        const userId = req.body.userId || 'default';

        const profile = await profileService.updateProfile(profileId, req.body, userId);

        res.json({
            success: true,
            data: {
                profileId: profile.profileId,
                name: profile.name,
                passThreshold: profile.passThreshold,
                weights: Object.fromEntries(profile.weights),
                isDefault: profile.isDefault
            },
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
        const userId = req.query.userId || 'default';

        const result = await profileService.deleteProfile(profileId, userId);

        res.json({
            success: true,
            message: result.message
        });
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
        const userId = req.body.userId || 'default';

        const profile = await profileService.duplicateProfile(profileId, req.body, userId);

        res.status(201).json({
            success: true,
            data: {
                profileId: profile.profileId,
                name: profile.name,
                passThreshold: profile.passThreshold,
                weights: Object.fromEntries(profile.weights),
                isDefault: profile.isDefault
            },
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
        const userId = req.body.userId || 'default';

        if (!profiles || typeof profiles !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid profiles data'
            });
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
        const userId = req.query.userId || 'default';
        const profiles = await profileService.exportProfiles(userId);

        res.json({
            success: true,
            data: profiles
        });
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
    exportProfiles
};
