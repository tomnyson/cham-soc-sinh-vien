/**
 * Storage manager for localStorage operations
 * Requirement 4: Fallback data from localStorage
 */

import { logger } from './logger.js';

export const storage = {
    /**
     * Save profiles to localStorage
     * @param {object} profiles - Profiles object
     */
    saveProfiles(profiles) {
        try {
            localStorage.setItem('gradeProfiles', JSON.stringify(profiles));
            localStorage.setItem('profilesLastSync', new Date().toISOString());
            logger.logSuccess('saveProfiles', { count: Object.keys(profiles).length });
        } catch (error) {
            logger.logError(error, 'storage.saveProfiles');
        }
    },

    /**
     * Load profiles from localStorage
     * @returns {object|null} Profiles object or null
     */
    loadProfiles() {
        try {
            const saved = localStorage.getItem('gradeProfiles');
            if (saved) {
                const profiles = JSON.parse(saved);
                logger.logFallback('profiles', 'API unavailable', 'localStorage');
                return profiles;
            }
            return null;
        } catch (error) {
            logger.logError(error, 'storage.loadProfiles');
            return null;
        }
    },

    /**
     * Save classes to localStorage
     * @param {object} classes - Classes object
     */
    saveClasses(classes) {
        try {
            localStorage.setItem('classes', JSON.stringify(classes));
            localStorage.setItem('classesLastSync', new Date().toISOString());
            logger.logSuccess('saveClasses', { count: Object.keys(classes).length });
        } catch (error) {
            logger.logError(error, 'storage.saveClasses');
        }
    },

    /**
     * Load classes from localStorage
     * @returns {object|null} Classes object or null
     */
    loadClasses() {
        try {
            const saved = localStorage.getItem('classes');
            if (saved) {
                const classes = JSON.parse(saved);
                logger.logFallback('classes', 'API unavailable', 'localStorage');
                return classes;
            }
            return null;
        } catch (error) {
            logger.logError(error, 'storage.loadClasses');
            return null;
        }
    },

    /**
     * Get last sync timestamp for profiles
     * @returns {string|null} ISO timestamp or null
     */
    getProfilesLastSync() {
        return localStorage.getItem('profilesLastSync');
    },

    /**
     * Get last sync timestamp for classes
     * @returns {string|null} ISO timestamp or null
     */
    getClassesLastSync() {
        return localStorage.getItem('classesLastSync');
    },

    /**
     * Get formatted time since last sync
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Human-readable time difference
     */
    getTimeSinceSync(timestamp) {
        if (!timestamp) return 'unknown';
        
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now - then;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hours ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} days ago`;
    },

    /**
     * Save current profile selection
     * @param {string} profileId - Profile ID
     */
    saveCurrentProfile(profileId) {
        localStorage.setItem('currentProfile', profileId);
    },

    /**
     * Load current profile selection
     * @returns {string|null} Profile ID or null
     */
    loadCurrentProfile() {
        return localStorage.getItem('currentProfile');
    }
};
