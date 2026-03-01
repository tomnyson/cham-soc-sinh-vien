const brandingService = require('../services/branding.service');

const getPublicBranding = async (req, res) => {
    const branding = await brandingService.getGlobalBranding();
    res.json({
        success: true,
        data: branding
    });
};

const getBranding = async (req, res) => {
    const branding = await brandingService.getGlobalBranding();
    res.json({
        success: true,
        data: branding
    });
};

const updateBranding = async (req, res) => {
    const userId = req.user?._id?.toString?.() || req.user?._id || '';
    const branding = await brandingService.updateGlobalBranding(req.body || {}, userId);

    res.json({
        success: true,
        message: 'Cập nhật branding thành công',
        data: branding
    });
};

const resetBranding = async (req, res) => {
    const userId = req.user?._id?.toString?.() || req.user?._id || '';
    const branding = await brandingService.resetGlobalBranding(userId);

    res.json({
        success: true,
        message: 'Đã reset branding về mặc định',
        data: branding
    });
};

module.exports = {
    getPublicBranding,
    getBranding,
    updateBranding,
    resetBranding
};
