/**
 * Grade calculation utilities
 *
 * Reused across the Grade Entry Dashboard feature to keep weight/threshold
 * logic consistent between server-rendered views, JSON APIs, and notifications.
 */

const STATUS = Object.freeze({
    PASSED: 'passed',
    AT_RISK: 'at-risk',
    FAILED: 'failed'
});

const SCORE_MIN = 0;
const SCORE_MAX = 10;
const BONUS_MIN = 0;
const BONUS_MAX = 2;

/**
 * Clamp a numeric value into [min, max]. Returns null when the input cannot be
 * coerced to a finite number.
 */
function clampNumber(value, min, max) {
    const num = Number.parseFloat(value);
    if (!Number.isFinite(num)) return null;
    return Math.min(Math.max(num, min), max);
}

/**
 * Validate that a raw score falls inside the allowed [0, 10] range. Throws a
 * descriptive Error otherwise.
 */
function assertScoreInRange(value, columnLabel = 'score') {
    const num = Number.parseFloat(value);
    if (!Number.isFinite(num)) {
        throw new Error(`${columnLabel} phải là số`);
    }
    if (num < SCORE_MIN || num > SCORE_MAX) {
        throw new Error(`${columnLabel} phải nằm trong khoảng ${SCORE_MIN}-${SCORE_MAX}`);
    }
    return num;
}

/**
 * Convert profile.weights (Map | object | undefined) to a plain numeric map.
 */
function toWeightsMap(weights) {
    if (!weights) return {};
    const entries = weights instanceof Map
        ? Array.from(weights.entries())
        : Object.entries(weights);

    return entries.reduce((acc, [key, value]) => {
        const numeric = Number.parseFloat(value);
        if (key && Number.isFinite(numeric)) {
            acc[key] = numeric;
        }
        return acc;
    }, {});
}

/**
 * Pull the grade row for a given MSSV from a grades.students container that may
 * be a Map or plain object keyed by MSSV (case-insensitive).
 */
function getStudentGradesByMssv(gradeStudents, mssv) {
    const target = String(mssv || '').trim().toUpperCase();
    if (!target) return {};

    if (gradeStudents instanceof Map) {
        for (const [key, value] of gradeStudents.entries()) {
            if (String(key || '').trim().toUpperCase() === target) {
                return value || {};
            }
        }
        return {};
    }

    for (const [key, value] of Object.entries(gradeStudents || {})) {
        if (String(key || '').trim().toUpperCase() === target) {
            return value || {};
        }
    }
    return {};
}

/**
 * Compute the weighted total for a student given a weights map.
 * Each component score is treated as a value in [0, 10] and is contributed at
 * `(score / 100) * weight`, matching the calculation already used in the
 * existing class controller for Google Sheet sync.
 */
function calculateTotal(studentGrades = {}, weights = {}) {
    return Object.entries(weights).reduce((sum, [column, weight]) => {
        const score = clampNumber(studentGrades[column], SCORE_MIN, SCORE_MAX);
        if (score === null) return sum;
        return sum + (score / 100) * weight;
    }, 0);
}

/**
 * Determine pass/fail/at-risk status from a final score.
 *
 * - `passed`  : finalScore >= passThreshold + 1
 * - `at-risk` : finalScore >= passThreshold but within +1 of the threshold
 * - `failed`  : finalScore < passThreshold
 *
 * The "at-risk" band lets the dashboard surface students who passed but barely.
 */
function determineStatus(finalScore, passThreshold = 0) {
    const score = Number.parseFloat(finalScore);
    const threshold = Number.parseFloat(passThreshold) || 0;
    if (!Number.isFinite(score)) return STATUS.FAILED;
    if (score < threshold) return STATUS.FAILED;
    if (score < threshold + 1) return STATUS.AT_RISK;
    return STATUS.PASSED;
}

/**
 * Compute the dashboard view-model for a single student row.
 */
function calculateStudentScore(student, gradeRow = {}, profile = {}) {
    const weights = toWeightsMap(profile.weights);
    const passThreshold = Number.parseFloat(profile.passThreshold) || 0;
    const total = calculateTotal(gradeRow, weights);
    const bonus = clampNumber(gradeRow._bonus, BONUS_MIN, BONUS_MAX) || 0;
    const finalTotal = Math.min(total + bonus, SCORE_MAX);
    const status = determineStatus(finalTotal, passThreshold);

    return {
        mssv: String(student?.mssv || '').trim(),
        name: String(student?.name || '').trim(),
        email: String(student?.email || '').trim(),
        phone: String(student?.phone || '').trim(),
        grades: { ...gradeRow },
        total: Number(total.toFixed(2)),
        bonus: Number(bonus.toFixed(2)),
        finalTotal: Number(finalTotal.toFixed(2)),
        status,
        note: String(gradeRow._note || '')
    };
}

/**
 * Build the complete dashboard data set for a class.
 *
 * @returns {{rows: Array, summary: {total:number, passed:number, atRisk:number, failed:number, passRate:number}}}
 */
function summarizeStudents(classDoc = {}, profile = {}) {
    const students = Array.isArray(classDoc.students) ? classDoc.students : [];
    const gradeStudents = classDoc.grades?.students || {};

    const rows = students.map(student => {
        const gradeRow = getStudentGradesByMssv(gradeStudents, student.mssv);
        return calculateStudentScore(student, gradeRow, profile);
    });

    const summary = rows.reduce((acc, row) => {
        acc.total += 1;
        if (row.status === STATUS.PASSED) acc.passed += 1;
        else if (row.status === STATUS.AT_RISK) acc.atRisk += 1;
        else acc.failed += 1;
        return acc;
    }, { total: 0, passed: 0, atRisk: 0, failed: 0 });

    summary.passRate = summary.total === 0
        ? 0
        : Number((((summary.passed + summary.atRisk) / summary.total) * 100).toFixed(1));

    return { rows, summary };
}

module.exports = {
    STATUS,
    SCORE_MIN,
    SCORE_MAX,
    BONUS_MIN,
    BONUS_MAX,
    clampNumber,
    assertScoreInRange,
    toWeightsMap,
    getStudentGradesByMssv,
    calculateTotal,
    determineStatus,
    calculateStudentScore,
    summarizeStudents
};
