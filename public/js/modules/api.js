/**
 * API Client with retry logic, health checks, and error handling
 * Requirements 2, 5: Retry mechanism and health checks
 */

import { logger } from './logger.js';
import { uiState } from './uiState.js';

export const apiClient = {
    baseURL: '/api',
    healthCheckInterval: null,
    isOnline: true,

    /**
     * Perform health check
     * Requirement 5: Health check before loading data
     * @param {number} timeout - Timeout in ms (default 3000)
     * @returns {Promise<boolean>} Health status
     */
    async healthCheck(timeout = 3000) {
        logger.logRequest('/api/health', 'GET');
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(`${this.baseURL}/health`, {
                method: 'GET',
                credentials: 'include',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            const isHealthy = response.ok;
            this.isOnline = isHealthy;
            
            logger.logResponse(response.status, 0, '/api/health');
            logger.logSuccess('healthCheck', { status: isHealthy });
            
            return isHealthy;
        } catch (error) {
            if (error.name === 'AbortError') {
                logger.logError(new Error('Health check timeout'), 'healthCheck');
            } else {
                logger.logError(error, 'healthCheck');
            }
            this.isOnline = false;
            return false;
        }
    },

    /**
     * Start periodic health check
     * Requirement 5: Periodically retry health check every 30 seconds
     */
    startPeriodicHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        this.healthCheckInterval = setInterval(async () => {
            if (!this.isOnline) {
                logger.logSuccess('periodicHealthCheck', { message: 'Checking if server is back online' });
                const isHealthy = await this.healthCheck();
                
                if (isHealthy) {
                    uiState.showNotification(
                        'Kết nối đã được khôi phục! Đang đồng bộ dữ liệu...',
                        'success'
                    );
                    // Trigger data sync
                    window.dispatchEvent(new CustomEvent('server-online'));
                }
            }
        }, 30000); // 30 seconds
    },

    /**
     * Stop periodic health check
     */
    stopPeriodicHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    },

    /**
     * Fetch with retry logic
     * Requirement 2: Retry mechanism with exponential backoff
     * @param {string} url - Request URL
     * @param {object} options - Fetch options
     * @param {number} maxRetries - Maximum retry attempts (default 3)
     * @returns {Promise<Response>} Fetch response
     */
    async fetchWithRetry(url, options = {}, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.logRequest(url, options.method || 'GET');
                
                const response = await fetch(url, {
                    ...options,
                    credentials: 'include'
                });

                const contentLength = response.headers.get('content-length') || 0;
                logger.logResponse(response.status, contentLength, url);

                // Handle authentication errors
                if (response.status === 401) {
                    logger.logError(new Error('Authentication required'), 'fetchWithRetry');
                    // Trigger authentication check
                    window.dispatchEvent(new CustomEvent('auth-required'));
                    return response;
                }

                // Don't retry on 4xx client errors
                if (response.status >= 400 && response.status < 500) {
                    logger.logSuccess('fetchWithRetry', {
                        message: 'Client error - no retry',
                        status: response.status
                    });
                    return response;
                }
                
                // Retry on 5xx server errors
                if (response.status >= 500) {
                    throw new Error(`Server error: ${response.status}`);
                }
                
                // Success
                return response;
                
            } catch (error) {
                lastError = error;
                logger.logError(error, `fetchWithRetry attempt ${attempt}`);
                
                // Don't retry if it's a network error and we're on the last attempt
                if (attempt === maxRetries) {
                    break;
                }
                
                // Calculate exponential backoff delay
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                logger.logRetry(attempt, delay, error.message);
                
                // Show retry notification to user
                uiState.showRetryNotification(attempt, maxRetries);
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        // All retries failed
        throw lastError;
    },

    /**
     * Get profiles from API
     * @returns {Promise<Array>} Array of profiles
     */
    async getProfiles() {
        const response = await this.fetchWithRetry(`${this.baseURL}/profiles`);

        if (!response.ok) {
            throw new Error(`Failed to fetch profiles: ${response.status}`);
        }

        const result = await response.json();
        // API returns { success: true, data: [...] }
        return result.success ? result.data : [];
    },

    /**
     * Create profile via API
     * @param {object} profileData - Profile data
     * @returns {Promise<object>} Result object
     */
    async createProfile(profileData) {
        const response = await this.fetchWithRetry(`${this.baseURL}/profiles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileData)
        });
        
        return await response.json();
    },

    /**
     * Update profile via API
     * @param {string} profileId - Profile ID
     * @param {object} profileData - Profile data
     * @returns {Promise<object>} Result object
     */
    async updateProfile(profileId, profileData) {
        const response = await this.fetchWithRetry(`${this.baseURL}/profiles/${profileId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileData)
        });
        
        return await response.json();
    },

    /**
     * Delete profile via API
     * @param {string} profileId - Profile ID
     * @returns {Promise<object>} Result object
     */
    async deleteProfile(profileId) {
        const response = await this.fetchWithRetry(`${this.baseURL}/profiles/${profileId}`, {
            method: 'DELETE'
        });
        
        return await response.json();
    },

    /**
     * Get classes from API
     * @returns {Promise<Array>} Array of classes
     */
    async getClasses() {
        const response = await this.fetchWithRetry(`${this.baseURL}/classes`);

        if (!response.ok) {
            throw new Error(`Failed to fetch classes: ${response.status}`);
        }

        const result = await response.json();
        // API returns { success: true, data: [...] }
        return result.success ? result.data : [];
    },

    /**
     * Create class via API
     * @param {object} classData - Class data
     * @returns {Promise<object>} Result object
     */
    async createClass(classData) {
        const response = await this.fetchWithRetry(`${this.baseURL}/classes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(classData)
        });
        
        return await response.json();
    },

    /**
     * Update class via API
     * @param {string} classId - Class ID
     * @param {object} classData - Class data
     * @returns {Promise<object>} Result object
     */
    async updateClass(classId, classData) {
        const response = await this.fetchWithRetry(`${this.baseURL}/classes/${classId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(classData)
        });
        
        return await response.json();
    },

    /**
     * Delete class via API
     * @param {string} classId - Class ID
     * @returns {Promise<object>} Result object
     */
    async deleteClass(classId) {
        const response = await this.fetchWithRetry(`${this.baseURL}/classes/${classId}`, {
            method: 'DELETE'
        });
        
        return await response.json();
    }
};
