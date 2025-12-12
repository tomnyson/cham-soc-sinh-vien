// ========================================
// TEMPLATE MODULE
// ========================================

const TemplateModule = {
    // Initialize module
    init() {
        // Module initialized
    },

    // Show template view
    show() {
        // Load data into dropdowns (partial is already loaded by router)
        this.loadTemplateData();
    },

    // Load template data
    loadTemplateData() {
        // Update profile dropdown
        if (typeof updateProfileSelect === 'function') {
            updateProfileSelect();
        } else {
            console.warn('⚠️ updateProfileSelect function not found');
        }

        // Update class dropdown
        if (typeof updateClassSelect === 'function') {
            updateClassSelect();
        } else {
            console.warn('⚠️ updateClassSelect function not found');
        }

        // Reset source selection
        const sourceClass = document.getElementById('sourceClass');
        const sourceUpload = document.getElementById('sourceUpload');
        if (sourceClass) sourceClass.checked = true;
        if (sourceUpload) sourceUpload.checked = false;

        // Update source display
        if (typeof updateTemplateSource === 'function') {
            updateTemplateSource();
        } else {
            console.warn('⚠️ updateTemplateSource function not found');
        }

        // Update profile info (trigger after dropdown is populated)
        setTimeout(() => {
            if (typeof updateTemplateProfile === 'function') {
                updateTemplateProfile();
            } else {
                console.warn('⚠️ updateTemplateProfile function not found');
            }
            if (typeof updateTemplateClass === 'function') {
                updateTemplateClass();
            } else {
                console.warn('⚠️ updateTemplateClass function not found');
            }
        }, 100);
    },

    // Cleanup
    cleanup() {

        // Reset file input
        const fileInput = document.getElementById('classListInput');
        const fileName = document.getElementById('classListFileName');
        if (fileInput) fileInput.value = '';
        if (fileName) fileName.textContent = '';

        // Reset generate button
        const generateBtn = document.getElementById('generateTemplateBtn');
        if (generateBtn) generateBtn.disabled = true;
    }
};

// Make globally available
window.TemplateModule = TemplateModule;
