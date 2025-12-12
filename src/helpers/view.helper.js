/**
 * View Helpers for EJS Templates
 * Provides utility functions for templates
 */

/**
 * Format date to Vietnamese format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * Format datetime to Vietnamese format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted datetime
 */
function formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated text
 */
function truncate(text, length = 50) {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

/**
 * Check if route is active
 * @param {string} currentRoute - Current route
 * @param {string} route - Route to check
 * @returns {boolean} True if active
 */
function isActiveRoute(currentRoute, route) {
    return currentRoute === route;
}

/**
 * Get active class for navigation
 * @param {string} currentRoute - Current route
 * @param {string} route - Route to check
 * @returns {string} 'active' or ''
 */
function activeClass(currentRoute, route) {
    return isActiveRoute(currentRoute, route) ? 'active' : '';
}

/**
 * Format number with thousand separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString('vi-VN');
}

/**
 * Format grade score
 * @param {number} score - Score to format
 * @returns {string} Formatted score
 */
function formatScore(score) {
    if (score === null || score === undefined) return '-';
    return score.toFixed(2);
}

/**
 * Get status badge class
 * @param {boolean} passed - Whether student passed
 * @returns {string} Badge class
 */
function statusBadgeClass(passed) {
    return passed ? 'badge-pass' : 'badge-fail';
}

/**
 * Get status text
 * @param {boolean} passed - Whether student passed
 * @returns {string} Status text
 */
function statusText(passed) {
    return passed ? '✓ Đạt' : '✗ Chưa đạt';
}

/**
 * Register helpers with app
 * @param {Express} app - Express app instance
 */
function registerHelpers(app) {
    // Make helpers available in all views
    app.locals.formatDate = formatDate;
    app.locals.formatDateTime = formatDateTime;
    app.locals.truncate = truncate;
    app.locals.isActiveRoute = isActiveRoute;
    app.locals.activeClass = activeClass;
    app.locals.formatNumber = formatNumber;
    app.locals.formatScore = formatScore;
    app.locals.statusBadgeClass = statusBadgeClass;
    app.locals.statusText = statusText;
}

module.exports = {
    formatDate,
    formatDateTime,
    truncate,
    isActiveRoute,
    activeClass,
    formatNumber,
    formatScore,
    statusBadgeClass,
    statusText,
    registerHelpers
};
