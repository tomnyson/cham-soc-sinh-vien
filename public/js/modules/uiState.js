/**
 * UI State Manager for loading states and notifications
 * Requirements 1, 3, 6: Loading states, error messages, success notifications
 */

export const uiState = {
    loadingStates: {},
    slowConnectionTimers: {},

    /**
     * Show loading indicator for a section
     * @param {string} section - Section identifier (profiles/classes)
     */
    showLoading(section) {
        this.loadingStates[section] = true;
        
        // Create or update loading indicator
        const containerId = `${section}-loading`;
        let container = document.getElementById(containerId);
        
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.className = 'loading-indicator';
            container.innerHTML = `
                <div class="spinner-border spinner-border-sm" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <span class="ms-2">Đang tải ${section === 'profiles' ? 'profiles' : 'danh sách lớp'}...</span>
            `;
            
            // Insert at appropriate location
            const targetElement = this.getLoadingTarget(section);
            if (targetElement) {
                targetElement.prepend(container);
            }
        }
        
        container.style.display = 'flex';
        
        // Set slow connection warning timer (5 seconds)
        this.slowConnectionTimers[section] = setTimeout(() => {
            this.showSlowConnectionWarning(section);
        }, 5000);
    },

    /**
     * Hide loading indicator for a section
     * @param {string} section - Section identifier
     */
    hideLoading(section) {
        this.loadingStates[section] = false;
        
        const containerId = `${section}-loading`;
        const container = document.getElementById(containerId);
        
        if (container) {
            // Remove the element completely instead of just hiding
            container.remove();
        }
        
        // Clear slow connection timer
        if (this.slowConnectionTimers[section]) {
            clearTimeout(this.slowConnectionTimers[section]);
            delete this.slowConnectionTimers[section];
        }
        
        // Remove slow connection warning if exists
        this.hideSlowConnectionWarning(section);
    },

    /**
     * Show slow connection warning
     * @param {string} section - Section identifier
     */
    showSlowConnectionWarning(section) {
        const warningId = `${section}-slow-warning`;
        let warning = document.getElementById(warningId);
        
        if (!warning) {
            warning = document.createElement('div');
            warning.id = warningId;
            warning.className = 'alert alert-warning mt-2';
            warning.innerHTML = `
                <i class="bi bi-exclamation-triangle"></i>
                Kết nối chậm. Vui lòng đợi hoặc kiểm tra kết nối mạng...
            `;
            
            const targetElement = this.getLoadingTarget(section);
            if (targetElement) {
                targetElement.prepend(warning);
            }
        }
    },

    /**
     * Hide slow connection warning
     * @param {string} section - Section identifier
     */
    hideSlowConnectionWarning(section) {
        const warningId = `${section}-slow-warning`;
        const warning = document.getElementById(warningId);
        if (warning) {
            warning.remove();
        }
    },

    /**
     * Get target element for loading indicators
     * @param {string} section - Section identifier
     * @returns {HTMLElement|null} Target element
     */
    getLoadingTarget(section) {
        // Try multiple possible containers
        const possibleTargets = [
            `tab-${section}`,           // Old tab system
            'page-content',             // New router system
            'app-content',              // Alternative
            'main-content'              // Fallback
        ];
        
        for (const targetId of possibleTargets) {
            const element = document.getElementById(targetId);
            if (element) {
                return element;
            }
        }
        
        // Last resort: body
        return document.body;
    },

    /**
     * Show notification toast
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success/error/warning/info)
     * @param {number} duration - Duration in ms (0 = permanent)
     */
    showNotification(message, type = 'info', duration = 5000) {
        const toastContainer = this.getOrCreateToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${this.getBootstrapColor(type)} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${this.getIcon(type)} ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast, {
            autohide: duration > 0,
            delay: duration
        });
        
        bsToast.show();
        
        // Remove from DOM after hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    },

    /**
     * Show error with retry button
     * @param {Error} error - Error object
     * @param {Function} retryFn - Retry function
     * @param {string} context - Error context
     */
    showError(error, retryFn, context = '') {
        const message = this.getErrorMessage(error);
        const fullMessage = context ? `${context}: ${message}` : message;
        
        // Show error notification
        this.showNotification(fullMessage, 'error', 0);
        
        // Show error modal with retry option
        this.showErrorModal(fullMessage, retryFn);
    },

    /**
     * Show error modal with retry button
     * @param {string} message - Error message
     * @param {Function} retryFn - Retry function
     */
    showErrorModal(message, retryFn) {
        const modalId = 'error-modal';
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-danger text-white">
                            <h5 class="modal-title">
                                <i class="bi bi-exclamation-triangle"></i> Lỗi kết nối
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p id="error-message"></p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                            <button type="button" class="btn btn-primary" id="retry-button">
                                <i class="bi bi-arrow-clockwise"></i> Thử lại
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        document.getElementById('error-message').textContent = message;
        
        const retryButton = document.getElementById('retry-button');
        retryButton.onclick = () => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            bsModal.hide();
            if (retryFn) retryFn();
        };
        
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    },

    /**
     * Get or create toast container
     * @returns {HTMLElement} Toast container
     */
    getOrCreateToastContainer() {
        let container = document.getElementById('toast-container');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        
        return container;
    },

    /**
     * Get Bootstrap color class for notification type
     * @param {string} type - Notification type
     * @returns {string} Bootstrap color class
     */
    getBootstrapColor(type) {
        const colors = {
            success: 'success',
            error: 'danger',
            warning: 'warning',
            info: 'info'
        };
        return colors[type] || 'info';
    },

    /**
     * Get icon for notification type
     * @param {string} type - Notification type
     * @returns {string} Icon HTML
     */
    getIcon(type) {
        const icons = {
            success: '<i class="bi bi-check-circle"></i>',
            error: '<i class="bi bi-x-circle"></i>',
            warning: '<i class="bi bi-exclamation-triangle"></i>',
            info: '<i class="bi bi-info-circle"></i>'
        };
        return icons[type] || icons.info;
    },

    /**
     * Get user-friendly error message
     * @param {Error} error - Error object
     * @returns {string} User-friendly message
     */
    getErrorMessage(error) {
        if (!error) return 'Lỗi không xác định';
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
        }
        
        if (error.message.includes('timeout')) {
            return 'Kết nối quá chậm. Vui lòng thử lại.';
        }
        
        if (error.message.includes('MongoDB')) {
            return 'Cơ sở dữ liệu không khả dụng. Vui lòng thử lại sau.';
        }
        
        if (error.message.includes('health check')) {
            return 'Server không phản hồi. Đang sử dụng dữ liệu đã lưu.';
        }
        
        return error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
    },

    /**
     * Show retry attempt notification
     * @param {number} attempt - Current attempt number
     * @param {number} maxAttempts - Maximum attempts
     */
    showRetryNotification(attempt, maxAttempts) {
        this.showNotification(
            `Đang thử lại... (Lần ${attempt}/${maxAttempts})`,
            'warning',
            2000
        );
    }
};
