require('dotenv').config();

module.exports = {
    // Server config
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    // Upload config
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
        uploadDir: process.env.UPLOAD_DIR || './uploads',
        allowedExtensions: ['.xlsx', '.xls'],
        allowedMimeTypes: [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ]
    },

    // CORS config
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true
    }
};
