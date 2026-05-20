/**
 * Helpers to identify super admin accounts.
 *
 * Super admins are configured via the `SUPER_ADMIN_EMAILS` env variable, which
 * accepts a comma-separated list of email addresses. The legacy alias
 * `SUPER_ADMIN_EMAIL` (single email) is also supported.
 */

function getSuperAdminEmails() {
    const raw = [
        process.env.SUPER_ADMIN_EMAILS,
        process.env.SUPER_ADMIN_EMAIL
    ]
        .filter(Boolean)
        .join(',');

    return raw
        .split(/[,;\s]+/)
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
}

function isSuperAdminEmail(email) {
    if (!email) return false;
    const list = getSuperAdminEmails();
    return list.includes(String(email).trim().toLowerCase());
}

module.exports = {
    getSuperAdminEmails,
    isSuperAdminEmail
};
