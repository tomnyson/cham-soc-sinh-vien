/**
 * Application initialization with module imports
 * This file bootstraps the application with all reliability features
 */

import { apiClient } from './modules/api.js';
import { storage } from './modules/storage.js';
import { uiState } from './modules/uiState.js';
import { logger } from './modules/logger.js';
import { profileManager } from './modules/profiles.js';
import { classManager } from './modules/classManager.js';

// Make modules globally available for legacy code compatibility
window.apiClient = apiClient;
window.storage = storage;
window.uiState = uiState;
window.logger = logger;
window.profileManager = profileManager;
window.classManager = classManager;

// Expose data for backward compatibility
Object.defineProperty(window, 'profiles', {
    get() { return profileManager.profiles; },
    set(value) { profileManager.profiles = value; }
});

Object.defineProperty(window, 'currentProfile', {
    get() { return profileManager.currentProfile; },
    set(value) { profileManager.currentProfile = value; }
});

Object.defineProperty(window, 'weights', {
    get() { return profileManager.weights; },
    set(value) { profileManager.weights = value; }
});

Object.defineProperty(window, 'passThreshold', {
    get() { return profileManager.passThreshold; },
    set(value) { profileManager.passThreshold = value; }
});

Object.defineProperty(window, 'classes', {
    get() { return classManager.classes; },
    set(value) { classManager.classes = value; }
});

Object.defineProperty(window, 'currentClass', {
    get() { return classManager.currentClass; },
    set(value) { classManager.currentClass = value; }
});

Object.defineProperty(window, 'classListData', {
    get() { return classManager.classListData; },
    set(value) { classManager.classListData = value; }
});

let isAppInitialized = false;

/**
 * Initialize application
 * Requirements 1-7: All reliability features
 */
async function initializeApp() {
    if (isAppInitialized) {
        logger.logSuccess('Application', { message: 'Already initialized, skipping' });
        return;
    }

    isAppInitialized = true;
    logger.logSuccess('Application', { message: 'Starting initialization' });

    try {
        // Initialize profiles and classes in parallel for better performance
        await Promise.all([
            profileManager.init(),
            classManager.init()
        ]);

        logger.logSuccess('Application', { message: 'Initialization complete' });

        // Dispatch event to notify pages that data is ready
        window.dispatchEvent(new CustomEvent('app-data-ready'));

    } catch (error) {
        isAppInitialized = false;
        logger.logError(error, 'initializeApp');
        uiState.showError(
            error,
            () => {
                isAppInitialized = false;
                initializeApp();
            },
            'Initialization error'
        );
    }
}

/**
 * Legacy function wrappers for backward compatibility
 */
window.initDefaultProfiles = async function() {
    await profileManager.init();
};

window.initClasses = async function() {
    await classManager.init();
};

window.loadProfile = function() {
    profileManager.loadProfile();
};

window.updateProfileSelect = function() {
    profileManager.updateProfileSelect();
};

window.updateWeightSummary = function() {
    profileManager.updateWeightSummary();
};

window.loadClass = function() {
    classManager.loadClass();
};

window.updateClassSelect = function() {
    classManager.updateClassSelect();
};

window.createNewProfile = async function() {
    await profileManager.createNew();
};

window.duplicateCurrentProfile = async function() {
    await profileManager.duplicate();
};

window.deleteProfileById = async function(profileId) {
    await profileManager.deleteById(profileId);
};

window.createNewClass = async function() {
    await classManager.createNew();
};

window.deleteClassById = async function(classId) {
    await classManager.deleteById(classId);
};

// Initialize when DOM is ready
// Note: We delay initialization slightly to let inline scripts run first
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeApp, 50);
    });
} else {
    // DOM already loaded
    setTimeout(initializeApp, 50);
}

// Export for module usage
export { initializeApp };
