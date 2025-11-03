const { createTemplateWorkbook, createResultsWorkbook } = require('../utils/excel.util');

/**
 * Controller tạo template Excel
 */
const generateTemplate = async (req, res, next) => {
    try {
        const { students, weights, profileName, passThreshold } = req.body;

        const buffer = createTemplateWorkbook({
            students,
            weights,
            profileName,
            passThreshold
        });

        const fileName = `Template_${profileName ? profileName.replace(/[^a-zA-Z0-9]/g, '_') : 'Grade'}_${Date.now()}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};

/**
 * Controller xuất kết quả Excel
 */
const exportResults = async (req, res, next) => {
    try {
        const { results } = req.body;

        const buffer = createResultsWorkbook(results);

        const fileName = `Ket_qua_hoc_tap_${Date.now()}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    generateTemplate,
    exportResults
};
