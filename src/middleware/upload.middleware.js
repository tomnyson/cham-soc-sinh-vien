const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../../config/app.config');

// Cấu hình storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = config.upload.uploadDir;
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const extname = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;

    const isValidExtension = config.upload.allowedExtensions.includes(extname);
    const isValidMimetype = config.upload.allowedMimeTypes.includes(mimetype);

    if (isValidExtension && isValidMimetype) {
        return cb(null, true);
    }

    cb(new Error(`Chỉ chấp nhận file Excel (${config.upload.allowedExtensions.join(', ')})`));
};

// Multer instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: config.upload.maxFileSize
    }
});

/**
 * Middleware để xử lý file upload đơn
 * @param {string} fieldName - Tên field trong form
 */
const uploadSingle = (fieldName) => {
    return (req, res, next) => {
        const uploadHandler = upload.single(fieldName);

        uploadHandler(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        error: `File quá lớn! Kích thước tối đa: ${config.upload.maxFileSize / (1024 * 1024)}MB`
                    });
                }
                return res.status(400).json({
                    success: false,
                    error: `Lỗi upload: ${err.message}`
                });
            } else if (err) {
                return res.status(400).json({
                    success: false,
                    error: err.message
                });
            }

            // Kiểm tra file có tồn tại không
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Không có file được upload!'
                });
            }

            next();
        });
    };
};

/**
 * Middleware để cleanup file sau khi xử lý
 */
const cleanupFile = (req, res, next) => {
    if (req.file && req.file.path) {
        try {
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
        } catch (error) {
            console.error('Error cleaning up file:', error);
        }
    }
    next();
};

module.exports = {
    uploadSingle,
    cleanupFile
};
