const Branding = require('../models/branding.model');

const GLOBAL_SCOPE = 'global_share_page';
const MAX_LOGO_BYTES = 500 * 1024;

const DEFAULT_BRANDING = Object.freeze({
    logoDataUrl: 'https://caodang.fpt.edu.vn/wp-content/uploads/logo-3.png',
    subtext: 'FPT Polytechnic',
    primaryColor: '#FF6C00'
});

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const LOGO_DATA_URL_REGEX = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/i;

function createValidationError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

function normalizeSubtext(value) {
    const subtext = String(value || '').trim();
    if (!subtext) {
        throw createValidationError('subtext là bắt buộc');
    }
    if (subtext.length > 80) {
        throw createValidationError('subtext tối đa 80 ký tự');
    }
    return subtext;
}

function normalizePrimaryColor(value) {
    const color = String(value || '').trim();
    if (!HEX_COLOR_REGEX.test(color)) {
        throw createValidationError('primaryColor phải có định dạng #RRGGBB');
    }
    return color.toUpperCase();
}

function estimateBase64Bytes(base64Data) {
    const cleaned = String(base64Data || '').replace(/\s+/g, '');
    const padding = cleaned.endsWith('==') ? 2 : cleaned.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.floor((cleaned.length * 3) / 4) - padding);
}

function normalizeLogoDataUrl(value) {
    const logoDataUrl = String(value || '').trim();
    if (!logoDataUrl) {
        throw createValidationError('logoDataUrl là bắt buộc');
    }

    if (logoDataUrl === DEFAULT_BRANDING.logoDataUrl) {
        return logoDataUrl;
    }

    const match = logoDataUrl.match(LOGO_DATA_URL_REGEX);
    if (!match) {
        throw createValidationError('logoDataUrl chỉ chấp nhận data:image/png|jpeg|webp;base64,...');
    }

    const base64Data = match[2] || '';
    const bytes = estimateBase64Bytes(base64Data);
    if (bytes > MAX_LOGO_BYTES) {
        throw createValidationError('Logo vượt quá giới hạn 500KB');
    }

    return logoDataUrl;
}

function mergeWithDefaults(doc) {
    return {
        logoDataUrl: doc?.logoDataUrl || DEFAULT_BRANDING.logoDataUrl,
        subtext: doc?.subtext || DEFAULT_BRANDING.subtext,
        primaryColor: doc?.primaryColor || DEFAULT_BRANDING.primaryColor,
        updatedAt: doc?.updatedAt || null
    };
}

class BrandingService {
    getDefaultBranding() {
        return { ...DEFAULT_BRANDING };
    }

    async getGlobalBranding() {
        const doc = await Branding.findOne({ scope: GLOBAL_SCOPE }).lean();
        return mergeWithDefaults(doc);
    }

    async updateGlobalBranding(payload = {}, userId = '') {
        const normalized = {
            logoDataUrl: normalizeLogoDataUrl(payload.logoDataUrl),
            subtext: normalizeSubtext(payload.subtext),
            primaryColor: normalizePrimaryColor(payload.primaryColor),
            updatedBy: String(userId || '')
        };

        const doc = await Branding.findOneAndUpdate(
            { scope: GLOBAL_SCOPE },
            {
                $set: {
                    ...normalized,
                    scope: GLOBAL_SCOPE
                }
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true
            }
        ).lean();

        return mergeWithDefaults(doc);
    }

    async resetGlobalBranding(userId = '') {
        const doc = await Branding.findOneAndUpdate(
            { scope: GLOBAL_SCOPE },
            {
                $set: {
                    scope: GLOBAL_SCOPE,
                    logoDataUrl: DEFAULT_BRANDING.logoDataUrl,
                    subtext: DEFAULT_BRANDING.subtext,
                    primaryColor: DEFAULT_BRANDING.primaryColor,
                    updatedBy: String(userId || '')
                }
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true
            }
        ).lean();

        return mergeWithDefaults(doc);
    }
}

module.exports = new BrandingService();
module.exports.GLOBAL_SCOPE = GLOBAL_SCOPE;
module.exports.MAX_LOGO_BYTES = MAX_LOGO_BYTES;
module.exports.DEFAULT_BRANDING = DEFAULT_BRANDING;
