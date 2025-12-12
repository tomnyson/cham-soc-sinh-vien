/**
 * Class management module with API reliability features
 * Handles class initialization, loading, and management
 */

import { apiClient } from './api.js';
import { storage } from './storage.js';
import { uiState } from './uiState.js';
import { logger } from './logger.js';

export const classManager = {
    classes: {},
    currentClass: '',
    classListData: [],

    /**
     * Try to use server-rendered data instead of fetching via API
     */
    consumeServerClasses() {
        if (typeof window === 'undefined') {
            return false;
        }

        const serverData = window.__INITIAL_SERVER_DATA__;
        if (!serverData || !serverData.classes) {
            return false;
        }

        try {
            const preloadedClasses = JSON.parse(JSON.stringify(serverData.classes)) || {};
            this.classes = preloadedClasses;

            const fallbackClassId = serverData.currentClass ||
                this.currentClass ||
                Object.keys(preloadedClasses)[0] ||
                '';
            this.currentClass = fallbackClassId;

            if (fallbackClassId && preloadedClasses[fallbackClassId]) {
                this.classListData = preloadedClasses[fallbackClassId].students || [];
            } else {
                this.classListData = [];
            }

            storage.saveClasses(this.classes);
            this.updateClassSelect();

            logger.logSuccess('classManager.init', {
                message: 'Loaded classes from server-rendered data',
                count: Object.keys(preloadedClasses).length
            });

            return true;
        } catch (error) {
            logger.logError(error, 'classManager.consumeServerClasses');
            return false;
        }
    },

    /**
     * Initialize classes with health check and retry logic
     * Requirements 1, 2, 5, 6: Loading states, retry, health check, success notification
     */
    async init() {
        if (this.consumeServerClasses()) {
            return;
        }

        uiState.showLoading('classes');
        
        try {
            // Requirement 5: Health check before loading data
            logger.logSuccess('initClasses', { message: 'Starting health check' });
            const isHealthy = await apiClient.healthCheck();
            
            if (isHealthy) {
                // Load from API
                const apiClasses = await apiClient.getClasses();
                
                if (apiClasses && apiClasses.length > 0) {
                    // Convert array to object keyed by classId
                    this.classes = {};
                    apiClasses.forEach(cls => {
                        this.classes[cls.classId] = {
                            classId: cls.classId,
                            name: cls.name,
                            description: cls.description || '',
                            students: cls.students || [],
                            grades: cls.grades || null,
                            createdAt: cls.createdAt,
                            updatedAt: cls.updatedAt
                        };
                    });
                    
                    // Save to localStorage for offline use
                    storage.saveClasses(this.classes);
                    
                    // Requirement 6: Success notification with count
                    const lastSync = storage.getClassesLastSync();
                    const syncTime = storage.getTimeSinceSync(lastSync);
                    uiState.showNotification(
                        `Đã tải ${apiClasses.length} lớp học thành công (${syncTime})`,
                        'success'
                    );
                    
                    logger.logSuccess('initClasses', {
                        count: apiClasses.length,
                        source: 'API'
                    });
                } else {
                    // Empty array - initialize with empty object
                    this.classes = {};
                    storage.saveClasses(this.classes);
                    
                    uiState.showNotification(
                        'Chưa có lớp học nào. Hãy tạo lớp mới.',
                        'info'
                    );
                    
                    logger.logSuccess('initClasses', {
                        count: 0,
                        source: 'API',
                        message: 'No classes yet'
                    });
                }
            } else {
                throw new Error('Server health check failed');
            }
            
        } catch (error) {
            // Requirement 3: User-friendly error messages
            logger.logError(error, 'classManager.init');
            
            // Requirement 4: Fallback to localStorage
            const cached = storage.loadClasses();
            
            if (cached) {
                this.classes = cached;
                const lastSync = storage.getClassesLastSync();
                const syncTime = storage.getTimeSinceSync(lastSync);
                
                // Requirement 4: Warning message for offline mode
                uiState.showNotification(
                    `Đang sử dụng danh sách lớp đã lưu (${syncTime}). Chế độ offline.`,
                    'warning',
                    0
                );
                
                logger.logSuccess('initClasses', {
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
                    'Không thể tải danh sách lớp'
                );
            }
        } finally {
            uiState.hideLoading('classes');
            this.updateClassSelect();
        }
    },

    /**
     * Update class select dropdowns
     */
    updateClassSelect() {
        const selects = [
            document.getElementById('classSelect'),
            document.getElementById('templateClassSelect')
        ];

        selects.forEach(select => {
            if (!select) return;

            select.innerHTML = '<option value="">-- Chọn lớp --</option>';

            for (const [key, classData] of Object.entries(this.classes)) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = classData.name;
                if (key === this.currentClass) {
                    option.selected = true;
                }
                select.appendChild(option);
            }
        });
    },

    /**
     * Load selected class
     */
    loadClass() {
        const select = document.getElementById('classSelect');
        if (!select) return;

        this.currentClass = select.value;

        if (this.currentClass && this.classes[this.currentClass]) {
            const classData = this.classes[this.currentClass];
            this.classListData = classData.students || [];

            const classInfo = document.getElementById('classInfo');
            const classDetails = document.getElementById('classDetails');

            if (classInfo) classInfo.style.display = 'block';
            if (classDetails) {
                classDetails.textContent =
                    `${classData.name} - ${classData.description || ''} (${this.classListData.length} sinh viên)`;
            }
        } else {
            this.classListData = [];
            const classInfo = document.getElementById('classInfo');
            if (classInfo) classInfo.style.display = 'none';
        }
    },

    /**
     * Create new class
     */
    async createNew() {
        const name = prompt('Nhập tên lớp (VD: SE1801):');
        if (!name) return;

        const id = 'class_' + Date.now();
        const classData = {
            classId: id,
            name: name,
            description: '',
            students: []
        };

        try {
            const result = await apiClient.createClass(classData);

            if (result.success) {
                this.classes[id] = classData;
                this.currentClass = id;
                storage.saveClasses(this.classes);
                this.updateClassSelect();
                
                uiState.showNotification(`Đã tạo lớp "${name}"`, 'success');
                
                // Open editor if available
                if (typeof editClass === 'function') {
                    editClass();
                }
            } else {
                uiState.showNotification(
                    'Lỗi tạo lớp: ' + (result.message || 'Unknown error'),
                    'error'
                );
            }
        } catch (error) {
            logger.logError(error, 'classManager.createNew');
            uiState.showNotification('Lỗi kết nối server: ' + error.message, 'error');
        }
    },

    /**
     * Update class
     */
    async update(classId, classData) {
        try {
            const result = await apiClient.updateClass(classId, classData);

            if (result.success) {
                this.classes[classId] = classData;
                storage.saveClasses(this.classes);
                this.updateClassSelect();
                
                uiState.showNotification(
                    `Đã lưu lớp "${classData.name}" với ${classData.students.length} sinh viên!`,
                    'success'
                );
                return true;
            } else {
                uiState.showNotification(
                    'Lỗi lưu lớp: ' + (result.message || 'Unknown error'),
                    'error'
                );
                return false;
            }
        } catch (error) {
            logger.logError(error, 'classManager.update');
            uiState.showNotification('Lỗi kết nối server: ' + error.message, 'error');
            return false;
        }
    },

    /**
     * Delete class by ID
     */
    async deleteById(classId) {
        const classData = this.classes[classId];
        if (!classData) {
            uiState.showNotification('Không tìm thấy lớp!', 'error');
            return;
        }

        if (!confirm(`Bạn có chắc muốn xóa lớp "${classData.name}"?`)) {
            return;
        }

        try {
            const result = await apiClient.deleteClass(classId);

            if (result.success) {
                delete this.classes[classId];

                if (this.currentClass === classId) {
                    this.currentClass = '';
                    this.classListData = [];
                }

                storage.saveClasses(this.classes);
                this.updateClassSelect();
                
                uiState.showNotification('Đã xóa lớp!', 'success');
            } else {
                uiState.showNotification(
                    'Lỗi xóa lớp: ' + (result.message || 'Unknown error'),
                    'error'
                );
            }
        } catch (error) {
            logger.logError(error, 'classManager.deleteById');
            uiState.showNotification('Lỗi kết nối server: ' + error.message, 'error');
        }
    }
};
