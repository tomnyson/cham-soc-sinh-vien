// ========================================
// GRADE CHECK MODULE
// ========================================

const GradeCheckModule = {
    // Initialize module
    init() {
        // Listen for data ready event to populate profile select
        window.addEventListener('app-data-ready', () => {
            this.populateProfileSelect();
        });
    },

    // Show grade check view
    show() {
        // Switch to grade check tab
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById('tab-grade-check').classList.add('active');
        
        // Populate profile select
        this.populateProfileSelect();
    },

    // Populate profile select dropdown
    populateProfileSelect() {
        // Support both gradeProfileSelect and profileSelect IDs
        const select = document.getElementById('gradeProfileSelect') || document.getElementById('profileSelect');
        if (!select) return;

        // Clear and repopulate
        select.innerHTML = '<option value="">-- Chọn profile --</option>';
        
        // Get profiles from profileManager or global
        const profilesData = window.profileManager?.profiles || window.profiles || {};
        
        Object.entries(profilesData).forEach(([key, profile]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = profile.name;
            
            // Select current profile if it matches
            if (window.profileManager?.currentProfile === key || window.currentProfile === key) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });
    },

    // Load profile for grade check
    loadGradeProfile() {
        try {
            // Support both gradeProfileSelect and profileSelect IDs
            const select = document.getElementById('gradeProfileSelect') || document.getElementById('profileSelect');
            if (!select || !select.value) {
                console.warn('Profile select not found or no value selected');
                return;
            }

            const profileId = select.value;
            
            // Get profiles from profileManager or global
            const profilesData = window.profileManager?.profiles || window.profiles || {};
            
            if (Object.keys(profilesData).length === 0) {
                console.error('Profiles not loaded yet');
                return;
            }
            
            const profile = profilesData[profileId];
            
            if (!profile) {
                console.warn('Profile not found:', profileId);
                return;
            }

            // Update current profile in manager
            if (window.profileManager) {
                window.profileManager.currentProfile = profileId;
                window.profileManager.weights = { ...profile.weights };
                window.profileManager.passThreshold = profile.passThreshold || 3;
            }

            // Update summary (support both IDs)
            const total = Object.values(profile.weights).reduce((sum, w) => sum + w, 0);
            const summaryEl = document.getElementById('gradeProfileSummary') || document.getElementById('currentWeightSummary');
            if (summaryEl) {
                summaryEl.innerHTML = `
                    Đang sử dụng: <strong>${profile.name}</strong> - 
                    Tổng: ${total.toFixed(1)}% - 
                    Qua môn: ≥${profile.passThreshold} điểm
                `;
                summaryEl.className = 'alert alert-success mb-0';
            }

            // Update weights grid if exists
            this.displayWeights(profile.weights);
        } catch (error) {
            console.error('Error loading grade profile:', error);
        }
    },

    // Display weights grid
    displayWeights(weights) {
        try {
            const grid = document.getElementById('gradeWeightsGrid');
            if (!grid) {
                console.warn('gradeWeightsGrid element not found');
                return;
            }

            if (!weights || Object.keys(weights).length === 0) {
                grid.innerHTML = '<p class="text-muted">Chưa có trọng số nào</p>';
                return;
            }

            const sortedWeights = Object.entries(weights).sort((a, b) => {
                const getOrder = (key) => {
                    if (key.includes('Lab')) return 1;
                    if (key.includes('Quiz')) return 2;
                    if (key.includes('GD')) return 3;
                    return 4;
                };
                return getOrder(a[0]) - getOrder(b[0]);
            });

            grid.innerHTML = sortedWeights.map(([key, value]) => `
                <div class="weight-item">
                    <strong>${key}:</strong> ${value}%
                </div>
            `).join('');
        } catch (error) {
            console.error('Error displaying weights:', error);
        }
    },

    // Cleanup
    cleanup() {
        // Cleanup complete
    }
};

// Make globally available
window.GradeCheckModule = GradeCheckModule;
