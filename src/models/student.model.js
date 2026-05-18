/**
 * Student model
 *
 * The application stores students embedded inside `Class.students` (see
 * `class.model.js`). The Grade Entry Dashboard data-model (data-model.md) calls
 * for an explicit Student entity with id, mssv, name, email, classId, grades,
 * totalScore, and status.
 *
 * Rather than duplicate the persistence layer we expose:
 *   - The shared embedded sub-schema (re-exported for re-use).
 *   - A helper that materializes a Student view-model from a class document
 *     and the calculated grade summary, ready to be sent to dashboard
 *     templates or JSON consumers.
 */

const mongoose = require('mongoose');

/**
 * Embedded student sub-schema. Mirrors the definition used in `Class.students`
 * so other modules can reference it without importing the full class model.
 */
const studentSubSchema = new mongoose.Schema({
    mssv: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true }
}, { _id: false });

/**
 * Build a Student view-model from a class document, the raw grade row, and
 * an already-computed score summary (see `grade.util.js#calculateStudentScore`).
 *
 * @param {Object} classDoc - Mongoose Class document (or plain object).
 * @param {Object} student  - Embedded student record (`{mssv, name, email, ...}`).
 * @param {Object} computed - Output of `calculateStudentScore`.
 * @returns {Object} Student view-model conforming to data-model.md.
 */
function buildStudentViewModel(classDoc, student, computed) {
    return {
        // Composite id keeps uniqueness even though students are embedded.
        _id: `${classDoc?.classId || ''}::${student?.mssv || ''}`,
        mssv: String(student?.mssv || '').trim(),
        name: String(student?.name || '').trim(),
        email: String(student?.email || '').trim(),
        phone: String(student?.phone || '').trim(),
        classId: classDoc?.classId || '',
        grades: computed?.grades || {},
        totalScore: computed?.finalTotal ?? 0,
        status: computed?.status || 'failed',
        note: computed?.note || ''
    };
}

module.exports = {
    studentSubSchema,
    buildStudentViewModel
};
