const https = require('https');
const { URLSearchParams } = require('url');

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
const TEST_SECRET_KEY = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';

function getKeys() {
    const siteKey = process.env.RECAPTCHA_SITE_KEY;
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (siteKey && secretKey) {
        return { siteKey, secretKey, usingTestKeys: false };
    }

    if (process.env.NODE_ENV !== 'production') {
        return {
            siteKey: TEST_SITE_KEY,
            secretKey: TEST_SECRET_KEY,
            usingTestKeys: true
        };
    }

    return { siteKey: '', secretKey: '', usingTestKeys: false };
}

function isEnabled() {
    const { siteKey, secretKey } = getKeys();
    return Boolean(siteKey && secretKey);
}

function getPublicConfig() {
    const { siteKey, usingTestKeys } = getKeys();

    return {
        enabled: isEnabled(),
        siteKey,
        usingTestKeys
    };
}

function postForm(url, formData) {
    return new Promise((resolve, reject) => {
        const body = formData.toString();
        const request = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body)
            },
            timeout: 8000
        }, (response) => {
            let data = '';

            response.setEncoding('utf8');
            response.on('data', chunk => {
                data += chunk;
            });
            response.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    reject(error);
                }
            });
        });

        request.on('timeout', () => {
            request.destroy(new Error('reCAPTCHA verification timeout'));
        });
        request.on('error', reject);
        request.write(body);
        request.end();
    });
}

async function verify(token, remoteIp) {
    if (!isEnabled()) {
        return { success: true, skipped: true };
    }

    if (!token) {
        return { success: false, errorCodes: ['missing-input-response'] };
    }

    const { secretKey } = getKeys();
    const formData = new URLSearchParams({
        secret: secretKey,
        response: token
    });

    if (remoteIp) {
        formData.append('remoteip', remoteIp);
    }

    const result = await postForm(VERIFY_URL, formData);
    return {
        success: Boolean(result.success),
        hostname: result.hostname,
        challengeTs: result.challenge_ts,
        errorCodes: result['error-codes'] || []
    };
}

module.exports = {
    getPublicConfig,
    isEnabled,
    verify
};
