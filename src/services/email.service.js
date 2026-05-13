const nodemailer = require('nodemailer');

function parseBoolean(value, defaultValue = false) {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }
    return String(value).trim().toLowerCase() === 'true';
}

function createConfigError(message) {
    const error = new Error(message);
    error.statusCode = 503;
    return error;
}

class EmailService {
    constructor() {
        this.transporter = null;
        this.cachedSignature = '';
    }

    getConfig() {
        const host = String(process.env.SMTP_HOST || '').trim();
        const portRaw = String(process.env.SMTP_PORT || '').trim();
        const port = Number.parseInt(portRaw || '587', 10);
        const secure = parseBoolean(process.env.SMTP_SECURE, port === 465);
        const user = String(process.env.SMTP_USER || '').trim();
        const pass = String(process.env.SMTP_PASS || '').trim();
        const fromName = String(process.env.SMTP_FROM_NAME || 'FPT Polytechnic').trim();
        const fromEmail = String(process.env.SMTP_FROM_EMAIL || '').trim();

        if (!host || !Number.isFinite(port) || port <= 0 || !user || !pass || !fromEmail) {
            throw createConfigError(
                'Thiếu cấu hình SMTP. Cần SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL.'
            );
        }

        return {
            host,
            port,
            secure,
            user,
            pass,
            fromName,
            fromEmail
        };
    }

    getTransporter() {
        const config = this.getConfig();
        const signature = [
            config.host,
            config.port,
            config.secure,
            config.user,
            config.pass
        ].join('|');

        if (!this.transporter || this.cachedSignature !== signature) {
            this.transporter = nodemailer.createTransport({
                host: config.host,
                port: config.port,
                secure: config.secure,
                auth: {
                    user: config.user,
                    pass: config.pass
                }
            });
            this.cachedSignature = signature;
        }

        return { transporter: this.transporter, config };
    }

    async sendMail({ to, subject, text, html }) {
        const toEmail = String(to || '').trim();
        const mailSubject = String(subject || '').trim();
        if (!toEmail || !mailSubject) {
            throw new Error('Thiếu thông tin email người nhận hoặc subject');
        }

        const { transporter, config } = this.getTransporter();
        const from = config.fromName
            ? `"${config.fromName}" <${config.fromEmail}>`
            : config.fromEmail;

        try {
            return await transporter.sendMail({
                from,
                to: toEmail,
                subject: mailSubject,
                text: String(text || ''),
                html: String(html || '')
            });
        } catch (error) {
            const sendError = new Error(`Gửi email thất bại: ${error.message}`);
            sendError.statusCode = 500;
            throw sendError;
        }
    }
}

module.exports = new EmailService();
