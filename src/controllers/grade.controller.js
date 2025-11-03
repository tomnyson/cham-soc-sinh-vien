const { readExcelFile } = require('../utils/excel.util');

/**
 * Controller xử lý upload file điểm
 */
const uploadGrades = async (req, res, next) => {
    try {
        const data = readExcelFile(req.file.path);

        res.json({
            success: true,
            data: data,
            filename: req.file.originalname
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    uploadGrades
};
