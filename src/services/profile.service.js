const Profile = require('../models/profile.model');

/**
 * Profile Service - Business logic cho profiles
 */
class ProfileService {
    /**
     * Lấy tất cả profiles của user
     */
    async getAllProfiles(userId = 'default') {
        try {
            const profiles = await Profile.findByUserId(userId);
            return profiles;
        } catch (error) {
            throw new Error(`Error fetching profiles: ${error.message}`);
        }
    }

    /**
     * Lấy profile theo ID
     */
    async getProfileById(profileId, userId = 'default') {
        try {
            const profile = await Profile.findByProfileId(profileId, userId);
            if (!profile) {
                throw new Error('Profile not found');
            }
            return profile;
        } catch (error) {
            throw new Error(`Error fetching profile: ${error.message}`);
        }
    }

    /**
     * Lấy profile mặc định
     */
    async getDefaultProfile(userId = 'default') {
        try {
            let profile = await Profile.findDefaultProfile(userId);

            // Nếu không có profile mặc định, lấy profile đầu tiên
            if (!profile) {
                const profiles = await Profile.findByUserId(userId);
                profile = profiles[0] || null;
            }

            return profile;
        } catch (error) {
            throw new Error(`Error fetching default profile: ${error.message}`);
        }
    }

    /**
     * Tạo profile mới
     */
    async createProfile(profileData, userId = 'default') {
        try {
            const { profileId, name, passThreshold, weights } = profileData;

            // Validate
            if (!profileId || !name) {
                throw new Error('ProfileId and name are required');
            }

            // Kiểm tra trùng profileId
            const existing = await Profile.findByProfileId(profileId, userId);
            if (existing) {
                throw new Error('Profile with this ID already exists');
            }

            // Convert weights object to Map
            const weightsMap = new Map(Object.entries(weights || {}));

            const profile = new Profile({
                profileId,
                name,
                passThreshold: passThreshold || 3,
                weights: weightsMap,
                userId,
                isDefault: false
            });

            await profile.save();
            return profile;
        } catch (error) {
            throw new Error(`Error creating profile: ${error.message}`);
        }
    }

    /**
     * Cập nhật profile
     */
    async updateProfile(profileId, updates, userId = 'default') {
        try {
            const profile = await Profile.findByProfileId(profileId, userId);
            if (!profile) {
                throw new Error('Profile not found');
            }

            // Update fields
            if (updates.name) profile.name = updates.name;
            if (updates.passThreshold !== undefined) profile.passThreshold = updates.passThreshold;
            if (updates.weights) {
                profile.weights = new Map(Object.entries(updates.weights));
            }
            if (updates.isDefault !== undefined) {
                // Nếu set isDefault = true, unset các profile khác
                if (updates.isDefault) {
                    await Profile.updateMany(
                        { userId, profileId: { $ne: profileId } },
                        { isDefault: false }
                    );
                }
                profile.isDefault = updates.isDefault;
            }

            await profile.save();
            return profile;
        } catch (error) {
            throw new Error(`Error updating profile: ${error.message}`);
        }
    }

    /**
     * Xóa profile
     */
    async deleteProfile(profileId, userId = 'default') {
        try {
            // Không cho xóa profile mặc định
            const profile = await Profile.findByProfileId(profileId, userId);
            if (!profile) {
                throw new Error('Profile not found');
            }

            if (profileId === 'default') {
                throw new Error('Cannot delete default profile');
            }

            await Profile.deleteOne({ profileId, userId });
            return { success: true, message: 'Profile deleted successfully' };
        } catch (error) {
            throw new Error(`Error deleting profile: ${error.message}`);
        }
    }

    /**
     * Nhân bản profile
     */
    async duplicateProfile(sourceProfileId, newProfileData, userId = 'default') {
        try {
            const sourceProfile = await Profile.findByProfileId(sourceProfileId, userId);
            if (!sourceProfile) {
                throw new Error('Source profile not found');
            }

            const newProfile = new Profile({
                profileId: newProfileData.profileId || `profile_${Date.now()}`,
                name: newProfileData.name || `${sourceProfile.name} (Copy)`,
                passThreshold: sourceProfile.passThreshold,
                weights: new Map(sourceProfile.weights),
                userId,
                isDefault: false
            });

            await newProfile.save();
            return newProfile;
        } catch (error) {
            throw new Error(`Error duplicating profile: ${error.message}`);
        }
    }

    /**
     * Import profiles (bulk create)
     */
    async importProfiles(profilesData, userId = 'default') {
        try {
            const results = {
                success: [],
                failed: []
            };

            for (const [profileId, profileData] of Object.entries(profilesData)) {
                try {
                    // Kiểm tra xem profile đã tồn tại chưa
                    let profile = await Profile.findByProfileId(profileId, userId);

                    const weightsMap = new Map(Object.entries(profileData.weights || {}));

                    if (profile) {
                        // Update existing
                        profile.name = profileData.name;
                        profile.passThreshold = profileData.passThreshold || 3;
                        profile.weights = weightsMap;
                        await profile.save();
                    } else {
                        // Create new
                        profile = new Profile({
                            profileId,
                            name: profileData.name,
                            passThreshold: profileData.passThreshold || 3,
                            weights: weightsMap,
                            userId,
                            isDefault: profileData.isDefault || false
                        });
                        await profile.save();
                    }

                    results.success.push(profileId);
                } catch (error) {
                    results.failed.push({ profileId, error: error.message });
                }
            }

            return results;
        } catch (error) {
            throw new Error(`Error importing profiles: ${error.message}`);
        }
    }

    /**
     * Export tất cả profiles
     */
    async exportProfiles(userId = 'default') {
        try {
            const profiles = await Profile.findByUserId(userId);

            const exportData = {};
            profiles.forEach(profile => {
                exportData[profile.profileId] = {
                    name: profile.name,
                    passThreshold: profile.passThreshold,
                    weights: Object.fromEntries(profile.weights)
                };
            });

            return exportData;
        } catch (error) {
            throw new Error(`Error exporting profiles: ${error.message}`);
        }
    }
}

module.exports = new ProfileService();
