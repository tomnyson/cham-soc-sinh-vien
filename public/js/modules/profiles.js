/**
 * Profile management module
 * Handles profile initialization, loading, and management
 */

import { apiClient } from './api.js';
import { storage } from './storage.js';
import { uiState } from './uiState.js';
import { logger } from './logger.js';

export const profileManager = {
    profiles: {},
    currentProfile: 'default',
    weights: {},
    passThreshold: 3,

    /**
     * Try to use server-rendered data instead of fetching via API
     */
    consumeServerProfiles() {
        if (typeof window === 'undefined') {
            return false;
        }

        const serverData = window.__INITIAL_SERVER_DATA__;
        if (!serverData || !serverData.profiles) {
            return false;
        }

        try {
            const preloadedProfiles = JSON.parse(JSON.stringify(serverData.profiles)) || {};
            this.profiles = preloadedProfiles;

            const fallbackId = serverData.currentProfile ||
                this.currentProfile ||
                Object.keys(preloadedProfiles)[0] ||
                '';
            this.currentProfile = fallbackId;

            if (fallbackId && preloadedProfiles[fallbackId]) {
                const profile = preloadedProfiles[fallbackId];
                this.weights = { ...profile.weights };
                this.passThreshold = profile.passThreshold || 3;
            }

            storage.saveProfiles(this.profiles);
            this.updateProfileSelect();
            this.loadProfile();

            logger.logSuccess('profileManager.init', {
                message: 'Loaded profiles from server-rendered data',
                count: Object.keys(preloadedProfiles).length
            });

            return true;
        } catch (error) {
            logger.logError(error, 'profileManager.consumeServerProfiles');
            return false;
        }
    },

    /**
     * Initialize profiles with health check and retry logic
     * Requirements 1, 2, 5, 6: Loading states, retry, health check, success notification
     */
    async init() {
        if (this.consumeServerProfiles()) {
            return;
        }

        uiState.showLoading('profiles');
        
        try {
            // Requirement 5: Health check before loading data
            logger.logSuccess('initProfiles', { message: 'Starting health check' });
            const isHealthy = await apiClient.healthCheck();
            
            if (isHealthy) {
                // Load from API
                const apiProfiles = await apiClient.getProfiles();
                
                if (apiProfiles && apiProfiles.length > 0) {
                    // Convert array to object keyed by profileId
                    this.profiles = {};
                    apiProfiles.forEach(profile => {
                        this.profiles[profile.profileId] = {
                            profileId: profile.profileId,
                            name: profile.name,
                            passThreshold: profile.passThreshold,
                            weights: profile.weights
                        };
                    });
                    
                    // Save to localStorage for offline use
                    storage.saveProfiles(this.profiles);
                    
                    // Requirement 6: Success notification with count
                    const lastSync = storage.getProfilesLastSync();
                    const syncTime = storage.getTimeSinceSync(lastSync);
                    uiState.showNotification(
                        `Đã tải ${apiProfiles.length} profiles thành công (${syncTime})`,
                        'success'
                    );
                    
                    logger.logSuccess('initProfiles', {
                        count: apiProfiles.length,
                        source: 'API'
                    });
                } else {
                    // Empty array - initialize with empty object
                    this.profiles = {};
                    storage.saveProfiles(this.profiles);
                    
                    uiState.showNotification(
                        'Chưa có profile nào. Hãy tạo profile mới.',
                        'info'
                    );
                    
                    logger.logSuccess('initProfiles', {
                        count: 0,
                        source: 'API',
                        message: 'No profiles yet'
                    });
                }
            } else {
                throw new Error('Server health check failed');
            }
            
        } catch (error) {
            // Requirement 3: User-friendly error messages
            logger.logError(error, 'profileManager.init');
            
            // Requirement 4: Fallback to localStorage
            const cached = storage.loadProfiles();
            
            if (cached) {
                this.profiles = cached;
                const lastSync = storage.getProfilesLastSync();
                const syncTime = storage.getTimeSinceSync(lastSync);
                
                // Requirement 4: Warning message for offline mode
                uiState.showNotification(
                    `Đang sử dụng profiles đã lưu (${syncTime}). Chế độ offline.`,
                    'warning',
                    0
                );
                
                logger.logSuccess('initProfiles', {
                    count: Object.keys(cached).length,
                    source: 'localStorage'
                });
                
                // Requirement 5: Start periodic health check
                apiClient.startPeriodicHealthCheck();
            } else {
                // No cached data available
                uiState.showError(
                    error,
                    () => this.init(),
                    'Không thể tải profiles'
                );
            }
        } finally {
            uiState.hideLoading('profiles');
            
            // Set default profile if not set
            if (!this.currentProfile && this.profiles['default']) {
                this.currentProfile = 'default';
            }
            
            this.loadProfile();
            this.updateProfileSelect();
        }
    },

    /**
     * Load selected profile
     */
    loadProfile() {
        // Support multiple select IDs
        const select = document.getElementById('profileSelect') || 
                      document.getElementById('gradeProfileSelect') ||
                      document.getElementById('templateProfileSelect');
        
        if (select && select.value) {
            this.currentProfile = select.value;
        }

        const profile = this.profiles[this.currentProfile];
        if (profile) {
            this.weights = { ...profile.weights };
            this.passThreshold = profile.passThreshold || 3;
            storage.saveCurrentProfile(this.currentProfile);
            this.updateWeightSummary();
        }
    },

    /**
     * Update profile select dropdowns
     */
    updateProfileSelect() {
        const selects = [
            document.getElementById('profileSelect'),
            document.getElementById('gradeProfileSelect'),
            document.getElementById('templateProfileSelect')
        ];

        selects.forEach(select => {
            if (!select) return;

            select.innerHTML = '';
            for (const [key, profile] of Object.entries(this.profiles)) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = profile.name;
                if (key === this.currentProfile) {
                    option.selected = true;
                }
                select.appendChild(option);
            }
        });
    },

    /**
     * Update weight summary display
     */
    updateWeightSummary() {
        const total = Object.values(this.weights).reduce((sum, w) => sum + w, 0);
        const profile = this.profiles[this.currentProfile];
        const element = document.getElementById('currentWeightSummary');
        if (element && profile) {
            element.innerHTML =
                `Đang sử dụng: <strong>${profile.name}</strong> - Tổng: ${total.toFixed(1)}% - Qua môn: ≥${this.passThreshold} điểm`;
        }
    },

    /**
     * Create new profile
     */
    async createNew() {
        const name = prompt('Nhập tên profile mới:');
        if (!name) return;

        const id = 'profile_' + Date.now();
        const profileData = {
            profileId: id,
            name: name,
            passThreshold: 3,
            weights: {}
        };

        try {
            const result = await apiClient.createProfile(profileData);

            if (result.success) {
                this.profiles[id] = profileData;
                this.currentProfile = id;
                storage.saveProfiles(this.profiles);
                this.updateProfileSelect();
                
                uiState.showNotification(`Đã tạo profile "${name}"`, 'success');
                
                // Open editor
                if (typeof openWeightEditor === 'function') {
                    openWeightEditor();
                }
            } else {
                uiState.showNotification(
                    'Lỗi tạo profile: ' + (result.message || 'Unknown error'),
                    'error'
                );
            }
        } catch (error) {
            logger.logError(error, 'profileManager.createNew');
            uiState.showNotification('Lỗi kết nối server: ' + error.message, 'error');
        }
    },

    /**
     * Duplicate current profile
     */
    async duplicate() {
        const sourceProfile = this.profiles[this.currentProfile];
        const newName = prompt(
            `Nhập tên cho bản sao của "${sourceProfile.name}":`,
            `${sourceProfile.name} (Copy)`
        );

        if (!newName) return;

        const id = 'profile_' + Date.now();
        const profileData = {
            profileId: id,
            name: newName,
            passThreshold: sourceProfile.passThreshold,
            weights: { ...sourceProfile.weights }
        };

        try {
            const result = await apiClient.createProfile(profileData);

            if (result.success) {
                this.profiles[id] = profileData;
                this.currentProfile = id;
                storage.saveProfiles(this.profiles);
                this.updateProfileSelect();
                this.loadProfile();

                uiState.showNotification(`Đã tạo bản sao "${newName}"`, 'success');
            } else {
                uiState.showNotification(
                    'Lỗi tạo profile: ' + (result.message || 'Unknown error'),
                    'error'
                );
            }
        } catch (error) {
            logger.logError(error, 'profileManager.duplicate');
            uiState.showNotification('Lỗi kết nối server: ' + error.message, 'error');
        }
    },

    /**
     * Delete profile by ID
     */
    async deleteById(profileId) {
        if (profileId === 'default') {
            uiState.showNotification('Không thể xóa profile mặc định!', 'warning');
            return;
        }

        const profile = this.profiles[profileId];
        if (!profile) {
            uiState.showNotification('Không tìm thấy profile!', 'error');
            return;
        }

        if (!confirm(`Bạn có chắc muốn xóa profile "${profile.name}"?`)) {
            return;
        }

        try {
            const result = await apiClient.deleteProfile(profileId);

            if (result.success) {
                delete this.profiles[profileId];

                if (this.currentProfile === profileId) {
                    this.currentProfile = 'default';
                }

                storage.saveProfiles(this.profiles);
                this.updateProfileSelect();
                
                uiState.showNotification('Đã xóa profile!', 'success');
            } else {
                uiState.showNotification(
                    'Lỗi xóa profile: ' + (result.message || 'Unknown error'),
                    'error'
                );
            }
        } catch (error) {
            logger.logError(error, 'profileManager.deleteById');
            uiState.showNotification('Lỗi kết nối server: ' + error.message, 'error');
        }
    },

    /**
     * Update profile
     */
    async update(profileId, profileData) {
        try {
            const result = await apiClient.updateProfile(profileId, profileData);

            if (result.success) {
                this.profiles[profileId] = profileData;
                storage.saveProfiles(this.profiles);
                this.loadProfile();
                this.updateProfileSelect();
                
                uiState.showNotification('Đã lưu profile thành công!', 'success');
                return true;
            } else {
                uiState.showNotification(
                    'Lỗi lưu profile: ' + (result.message || 'Unknown error'),
                    'error'
                );
                return false;
            }
        } catch (error) {
            logger.logError(error, 'profileManager.update');
            uiState.showNotification('Lỗi kết nối server: ' + error.message, 'error');
            return false;
        }
    }
};
