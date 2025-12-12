/**
 * Centralized logging module for debugging and monitoring
 * Requirement 7: Detailed logging for API calls
 */

export const logger = {
    /**
     * Log API request
     * @param {string} url - Request URL
     * @param {string} method - HTTP method
     */
    logRequest(url, method = 'GET') {
        console.log(`[API Request] ${method} ${url}`, {
            timestamp: new Date().toISOString(),
            url,
            method
        });
    },

    /**
     * Log API response
     * @param {number} status - Response status code
     * @param {number} dataSize - Size of response data
     * @param {string} url - Request URL
     */
    logResponse(status, dataSize, url) {
        console.log(`[API Response] ${status} ${url}`, {
            timestamp: new Date().toISOString(),
            status,
            dataSize: `${dataSize} bytes`,
            url
        });
    },

    /**
     * Log error with full context
     * @param {Error} error - Error object
     * @param {string} context - Context where error occurred
     */
    logError(error, context) {
        console.error(`[Error] ${context}`, {
            timestamp: new Date().toISOString(),
            context,
            type: error.name,
            message: error.message,
            stack: error.stack
        });
    },

    /**
     * Log retry attempt
     * @param {number} attempt - Current attempt number
     * @param {number} delay - Delay before retry (ms)
     * @param {string} reason - Reason for retry
     */
    logRetry(attempt, delay, reason) {
        console.warn(`[Retry] Attempt ${attempt} after ${delay}ms`, {
            timestamp: new Date().toISOString(),
            attempt,
            delay,
            reason
        });
    },

    /**
     * Log fallback usage
     * @param {string} dataType - Type of data (profiles/classes)
     * @param {string} reason - Reason for fallback
     * @param {string} source - Fallback data source
     */
    logFallback(dataType, reason, source) {
        console.warn(`[Fallback] Using ${source} for ${dataType}`, {
            timestamp: new Date().toISOString(),
            dataType,
            reason,
            source
        });
    },

    /**
     * Log successful operation
     * @param {string} operation - Operation name
     * @param {object} details - Additional details
     */
    logSuccess(operation, details = {}) {
        console.log(`[Success] ${operation}`, {
            timestamp: new Date().toISOString(),
            operation,
            ...details
        });
    }
};
