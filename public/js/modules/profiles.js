// ========================================
// PROFILES MODULE
// ========================================

const ProfilesModule = {
    // Initialize module
    init() {
        console.log('Profiles Module initialized');
    },

    // Show profiles view
    show() {
        // Switch to profiles tab
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById('tab-profiles').classList.add('active');
        
        // Load profiles list
        this.loadProfiles();
    },

    // Load profiles list
    async loadProfiles() {
        if (typeof renderProfilesList === 'function') {
            await renderProfilesList();
        }
    },

    // Cleanup
    cleanup() {
        console.log('Profiles Module cleanup');
    }
};

// Make globally available
window.ProfilesModule = ProfilesModule;
