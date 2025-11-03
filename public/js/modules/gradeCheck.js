// ========================================
// GRADE CHECK MODULE
// ========================================

const GradeCheckModule = {
    // Initialize module
    init() {
        console.log('Grade Check Module initialized');
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
        const select = document.getElementById('gradeProfileSelect');
        if (!select) return;

        // Clear and repopulate
        select.innerHTML = '<option value="">-- Chọn profile --</option>';
        
        if (typeof profiles !== 'undefined') {
            Object.entries(profiles).forEach(([key, profile]) => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = profile.name;
                select.appendChild(option);
            });
        }
    },

    // Load profile for grade check
    loadGradeProfile() {
        try {
            const select = document.getElementById('gradeProfileSelect');
            if (!select || !select.value) {
                console.warn('Profile select not found or no value selected');
                return;
            }

            const profileId = select.value;
            
            // Check if profiles is defined
            if (typeof profiles === 'undefined') {
                console.error('Profiles not loaded yet');
                return;
            }
            
            const profile = profiles[profileId];
            
            if (!profile) {
                console.warn('Profile not found:', profileId);
                return;
            }

            // Update summary
            const total = Object.values(profile.weights).reduce((sum, w) => sum + w, 0);
            const summaryEl = document.getElementById('gradeProfileSummary');
            if (summaryEl) {
                summaryEl.innerHTML = `
                    <strong>${profile.name}</strong> - 
                    Tổng: ${total.toFixed(1)}% - 
                    Qua môn: ≥${profile.passThreshold} điểm
                `;
                summaryEl.className = 'alert alert-success mb-0 mt-3 mt-md-0';
            } else {
                console.warn('gradeProfileSummary element not found');
            }

            // Update weights grid
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
        console.log('Grade Check Module cleanup');
    }
};

// Make globally available
window.GradeCheckModule = GradeCheckModule;
