const { readExcelFile } = require('../utils/excel.util');

/**
 * Controller xử lý upload file danh sách lớp
 */
const uploadClassList = async (req, res, next) => {
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
    uploadClassList
};
