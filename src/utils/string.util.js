/**
 * Loại bỏ dấu tiếng Việt khỏi chuỗi
 * @param {string} str - Chuỗi cần xử lý
 * @returns {string} Chuỗi đã loại bỏ dấu
 */
function removeVietnameseTones(str) {
    if (!str) return '';
    str = str.toString();

    const replacements = [
        { pattern: /à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, replacement: 'a' },
        { pattern: /è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, replacement: 'e' },
        { pattern: /ì|í|ị|ỉ|ĩ/g, replacement: 'i' },
        { pattern: /ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, replacement: 'o' },
        { pattern: /ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, replacement: 'u' },
        { pattern: /ỳ|ý|ỵ|ỷ|ỹ/g, replacement: 'y' },
        { pattern: /đ/g, replacement: 'd' },
        { pattern: /À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, replacement: 'A' },
        { pattern: /È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, replacement: 'E' },
        { pattern: /Ì|Í|Ị|Ỉ|Ĩ/g, replacement: 'I' },
        { pattern: /Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, replacement: 'O' },
        { pattern: /Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, replacement: 'U' },
        { pattern: /Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, replacement: 'Y' },
        { pattern: /Đ/g, replacement: 'D' }
    ];

    replacements.forEach(({ pattern, replacement }) => {
        str = str.replace(pattern, replacement);
    });

    return str;
}

/**
 * Chuẩn hóa chuỗi để so sánh
 * @param {string} str - Chuỗi cần chuẩn hóa
 * @returns {string} Chuỗi đã chuẩn hóa
 */
function normalizeString(str) {
    if (!str) return '';
    str = removeVietnameseTones(str);
    return str.toString()
        .toLowerCase()
        .replace(/\s+/g, '') // Bỏ tất cả khoảng trắng
        .replace(/[()%]/g, '') // Bỏ dấu ngoặc và %
        .trim();
}

module.exports = {
    removeVietnameseTones,
    normalizeString
};
