/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
    res.status(404).json({
        success: false,
        error: 'Không tìm thấy endpoint này!'
    });
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Xác định status code
    const statusCode = err.statusCode || err.status || 500;

    // Xác định error message
    let message = err.message || 'Có lỗi xảy ra!';

    // Trong môi trường production, không expose lỗi chi tiết
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        message = 'Lỗi server nội bộ!';
    }

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

/**
 * Async handler wrapper để catch lỗi trong async routes
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    notFoundHandler,
    errorHandler,
    asyncHandler
};
