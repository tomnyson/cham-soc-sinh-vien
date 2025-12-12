// ========================================
// PROFILES VIEW MODULE
// ========================================

const ProfilesModule = {
    // Initialize module
    init() {
        // Module initialized
    },

    // Show profiles view
    show() {
        
        // Render profiles list
        if (typeof renderProfilesList === 'function') {
            renderProfilesList();
        } else {
            console.warn('⚠️ renderProfilesList function not found');
        }
    },

    // Cleanup
    cleanup() {
        // Cleanup complete
    }
};

// Make globally available
window.ProfilesModule = ProfilesModule;
