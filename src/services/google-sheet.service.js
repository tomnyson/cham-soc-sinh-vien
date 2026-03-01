const jwt = require('jsonwebtoken');

const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_SHEETS_API_BASE = 'https://sheets.googleapis.com/v4';

function normalizePrivateKey(rawPrivateKey = '') {
    return String(rawPrivateKey || '').replace(/\\n/g, '\n').trim();
}

function parseServiceAccountFromJson(rawJson = '') {
    const normalized = String(rawJson || '').trim();
    if (!normalized) return null;

    // Accept either raw JSON string or base64-encoded JSON.
    const candidates = [normalized];
    try {
        candidates.push(Buffer.from(normalized, 'base64').toString('utf8'));
    } catch (error) {
        // Ignore invalid base64 input.
    }

    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            if (parsed?.client_email && parsed?.private_key) {
                return {
                    clientEmail: String(parsed.client_email).trim(),
                    privateKey: normalizePrivateKey(parsed.private_key)
                };
            }
        } catch (error) {
            // Try next format.
        }
    }

    return null;
}

function getServiceAccountCredentials() {
    const jsonConfig = parseServiceAccountFromJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '');
    if (jsonConfig) {
        return jsonConfig;
    }

    const clientEmail = String(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
    const privateKey = normalizePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '');

    if (!clientEmail || !privateKey) {
        throw new Error(
            'Thiếu cấu hình Google Service Account. Cần GOOGLE_SERVICE_ACCOUNT_JSON hoặc GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.'
        );
    }

    return { clientEmail, privateKey };
}

async function requestAccessToken() {
    if (typeof fetch !== 'function') {
        throw new Error('Node.js hiện tại không hỗ trợ fetch để gọi Google API.');
    }

    const { clientEmail, privateKey } = getServiceAccountCredentials();
    const issuedAt = Math.floor(Date.now() / 1000);

    const assertion = jwt.sign(
        {
            iss: clientEmail,
            scope: GOOGLE_SHEETS_SCOPE,
            aud: GOOGLE_TOKEN_ENDPOINT,
            iat: issuedAt,
            exp: issuedAt + 3600
        },
        privateKey,
        { algorithm: 'RS256' }
    );

    const body = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion
    });

    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token) {
        throw new Error(payload.error_description || payload.error || 'Không thể lấy access token từ Google.');
    }

    return payload.access_token;
}

async function googleApiRequest(url, options = {}) {
    const { token, method = 'GET', body } = options;
    const response = await fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    });

    const rawText = await response.text();
    let payload = {};

    try {
        payload = rawText ? JSON.parse(rawText) : {};
    } catch (error) {
        payload = { rawText };
    }

    if (!response.ok) {
        const message =
            payload?.error?.message ||
            payload?.error_description ||
            payload?.error ||
            rawText ||
            `Google API lỗi ${response.status}`;
        const err = new Error(message);
        err.statusCode = response.status;
        throw err;
    }

    return payload;
}

function sanitizeSheetName(name = '') {
    const normalized = String(name || '')
        .replace(/[\\/?*\[\]:]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return (normalized || 'BangDiem').slice(0, 100);
}

function escapeSheetTitle(title = '') {
    return `'${String(title).replace(/'/g, "''")}'`;
}

async function ensureSheetExists(token, spreadsheetId, sheetName) {
    const metadataUrl = `${GOOGLE_SHEETS_API_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties.title`;
    const metadata = await googleApiRequest(metadataUrl, { token });
    const existingTitles = (metadata.sheets || [])
        .map(sheet => sheet?.properties?.title)
        .filter(Boolean);

    if (existingTitles.includes(sheetName)) {
        return;
    }

    const batchUpdateUrl = `${GOOGLE_SHEETS_API_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`;
    await googleApiRequest(batchUpdateUrl, {
        token,
        method: 'POST',
        body: {
            requests: [
                {
                    addSheet: {
                        properties: {
                            title: sheetName
                        }
                    }
                }
            ]
        }
    });
}

async function clearSheetData(token, spreadsheetId, sheetName) {
    const clearUrl = `${GOOGLE_SHEETS_API_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchClear`;
    const clearRange = `${escapeSheetTitle(sheetName)}!A:ZZZ`;

    await googleApiRequest(clearUrl, {
        token,
        method: 'POST',
        body: {
            ranges: [clearRange]
        }
    });
}

async function updateSheetValues(token, spreadsheetId, sheetName, values) {
    const range = `${escapeSheetTitle(sheetName)}!A1`;
    const updateUrl = `${GOOGLE_SHEETS_API_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

    return googleApiRequest(updateUrl, {
        token,
        method: 'PUT',
        body: {
            range,
            majorDimension: 'ROWS',
            values
        }
    });
}

async function syncGradesToGoogleSheet({ spreadsheetId, sheetName = 'BangDiem', values = [] }) {
    const normalizedSpreadsheetId = String(spreadsheetId || '').trim();
    if (!normalizedSpreadsheetId) {
        throw new Error('Spreadsheet ID là bắt buộc.');
    }

    if (!Array.isArray(values) || values.length === 0) {
        throw new Error('Không có dữ liệu điểm để sync.');
    }

    const normalizedSheetName = sanitizeSheetName(sheetName);
    const token = await requestAccessToken();

    await ensureSheetExists(token, normalizedSpreadsheetId, normalizedSheetName);
    await clearSheetData(token, normalizedSpreadsheetId, normalizedSheetName);
    const updateResult = await updateSheetValues(token, normalizedSpreadsheetId, normalizedSheetName, values);

    return {
        spreadsheetId: normalizedSpreadsheetId,
        sheetName: normalizedSheetName,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${normalizedSpreadsheetId}/edit`,
        updatedRange: updateResult.updatedRange || '',
        updatedRows: updateResult.updatedRows || 0,
        updatedColumns: updateResult.updatedColumns || 0,
        updatedCells: updateResult.updatedCells || 0
    };
}

module.exports = {
    syncGradesToGoogleSheet
};
