/**
 * Validate request body cho generate template
 */
const validateGenerateTemplate = (req, res, next) => {
    const { students, weights, profileName } = req.body;

    // Validate students
    if (!students || !Array.isArray(students)) {
        return res.status(400).json({
            success: false,
            error: 'Danh sách sinh viên không hợp lệ!'
        });
    }

    if (students.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Danh sách sinh viên trống!'
        });
    }

    // Validate mỗi student
    for (const student of students) {
        if (!student.mssv || !student.name) {
            return res.status(400).json({
                success: false,
                error: 'Thông tin sinh viên không đầy đủ (cần MSSV và tên)!'
            });
        }
    }

    // Validate weights
    if (!weights || typeof weights !== 'object') {
        return res.status(400).json({
            success: false,
            error: 'Danh sách trọng số không hợp lệ!'
        });
    }

    if (Object.keys(weights).length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Danh sách trọng số trống!'
        });
    }

    // Validate weight values
    for (const [key, value] of Object.entries(weights)) {
        if (typeof value !== 'number' || value < 0 || value > 100) {
            return res.status(400).json({
                success: false,
                error: `Trọng số "${key}" không hợp lệ! (phải là số từ 0-100)`
            });
        }
    }

    next();
};

/**
 * Validate request body cho export results
 */
const validateExportResults = (req, res, next) => {
    const { results } = req.body;

    if (!results || !Array.isArray(results)) {
        return res.status(400).json({
            success: false,
            error: 'Dữ liệu kết quả không hợp lệ!'
        });
    }

    if (results.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Không có dữ liệu để xuất!'
        });
    }

    // Validate mỗi result
    for (const result of results) {
        if (!result.mssv || !result.name || result.totalScore === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Dữ liệu kết quả không đầy đủ!'
            });
        }
    }

    next();
};

module.exports = {
    validateGenerateTemplate,
    validateExportResults
};
