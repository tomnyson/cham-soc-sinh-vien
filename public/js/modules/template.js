// ========================================
// TEMPLATE MODULE
// ========================================

const TemplateModule = {
    // Initialize module
    init() {
        console.log('Template Module initialized');
    },

    // Show template view
    show() {
        // Switch to template tab
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById('tab-template').classList.add('active');
    },

    // Cleanup
    cleanup() {
        console.log('Template Module cleanup');
    }
};

// Make globally available
window.TemplateModule = TemplateModule;
