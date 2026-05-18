/**
 * Dashboard Controller
 *
 * Implements the Grade Entry & Student Status Dashboard endpoints described in
 * `specs/001-grade-entry-tool/contracts/api.md`:
 *   - GET  /dashboard
 *   - GET  /api/classes/:id/grades
 *   - PUT  /api/classes/:id/student/:mssv/grade
 */

const path = require('path');
const fs = require('fs').promises;
const ejs = require('ejs');

const classService = require('../services/class.service');
const profileService = require('../services/profile.service');
const { buildStudentViewModel } = require('../models/student.model');
const {
    summarizeStudents,
    calculateStudentScore,
    getStudentGradesByMssv,
    assertScoreInRange,
    BONUS_MIN,
    BONUS_MAX
} = require('../utils/grade.util');

const VIEWS_DIR = path.join(__dirname, '..', '..', 'views');

/**
 * Resolve the grading profile for a class. Falls back to the user's default
 * profile when the class has not selected one yet.
 */
async function resolveProfileForClass(classDoc, userId) {
    const profileId = classDoc?.grades?.profileId;
    if (profileId) {
        try {
            return await profileService.getProfileById(profileId, userId);
        } catch (err) {
            // Fall through to default below.
        }
    }
    const fallback = await profileService.getDefaultProfile(userId);
    if (!fallback) {
        throw new Error('No grading profile available for this class.');
    }
    return fallback;
}

/**
 * Normalize a profile document for JSON consumers (Map -> object).
 */
function serializeProfile(profile) {
    if (!profile) return null;
    const weights = profile.weights instanceof Map
        ? Object.fromEntries(profile.weights)
        : (profile.weights || {});
    return {
        profileId: profile.profileId,
        name: profile.name,
        passThreshold: profile.passThreshold,
        weights
    };
}

/**
 * Build the dashboard view-model for a single class.
 */
async function buildClassDashboard(classId, userId) {
    const classDoc = await classService.getClassById(classId, userId);
    const profile = await resolveProfileForClass(classDoc, userId);
    const { rows, summary } = summarizeStudents(classDoc, profile);

    const gradeStudents = classDoc.grades?.students || {};
    const students = (classDoc.students || []).map((student) => {
        const gradeRow = getStudentGradesByMssv(gradeStudents, student.mssv);
        const computed = calculateStudentScore(student, gradeRow, profile);
        return {
            ...buildStudentViewModel(classDoc, student, computed),
            total: computed.total,
            bonus: computed.bonus,
            finalTotal: computed.finalTotal
        };
    });

    return {
        classData: {
            classId: classDoc.classId,
            name: classDoc.name,
            description: classDoc.description || ''
        },
        profile: serializeProfile(profile),
        students,
        rows,
        summary
    };
}

/**
 * GET /dashboard
 *
 * Renders the Grade Entry Dashboard for the authenticated lecturer. When the
 * lecturer has classes, the first one is pre-loaded so the table is populated
 * on first render (the user can switch classes via the dropdown without a
 * full reload).
 */
const renderDashboard = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.redirect('/?login=required');
        }

        const userId = req.user._id;
        const classes = await classService.getAllClasses(userId);
        const classList = (classes || []).map(c => ({
            classId: c.classId,
            name: c.name,
            studentCount: Array.isArray(c.students) ? c.students.length : 0
        }));

        const selectedClassId = req.query.classId || classList[0]?.classId || '';
        let dashboard = null;
        if (selectedClassId) {
            try {
                dashboard = await buildClassDashboard(selectedClassId, userId);
            } catch (err) {
                console.warn('Dashboard: failed to preload class', selectedClassId, err.message);
            }
        }

        const userData = {
            id: req.user._id?.toString?.() || req.user._id,
            name: req.user.name || '',
            email: req.user.email || '',
            picture: req.user.picture || '',
            role: req.user.role || 'user'
        };

        const pageViewPath = path.join(VIEWS_DIR, 'pages', 'dashboard.ejs');
        const template = await fs.readFile(pageViewPath, 'utf8');
        const body = ejs.render(template, {
            classes: classList,
            selectedClassId,
            dashboard
        }, { filename: pageViewPath });

        return res.render('layouts/master', {
            title: 'Bảng điểm sinh viên - FPT Polytechnic',
            currentRoute: '/dashboard',
            body,
            user: userData,
            initialData: {
                currentUser: userData,
                dashboard,
                classes: classList,
                selectedClassId
            }
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * GET /api/classes/:classId/grades
 *
 * Returns the dashboard payload for a single class as JSON. Used to switch
 * classes from the dropdown without reloading the whole page.
 */
const getClassGrades = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const userId = req.user._id;
        const dashboard = await buildClassDashboard(classId, userId);
        return res.json({ success: true, data: dashboard });
    } catch (error) {
        return next(error);
    }
};

/**
 * PUT /api/classes/:classId/student/:mssv/grade
 *
 * Updates a single grade cell for a student. The validation middleware ensures
 * `assessment` is a non-empty string and `score` is within the allowed range.
 * Persistence reuses the existing `classService.updateClass` path so that the
 * data passes through the same `normalizeGradesPayload` validation as bulk
 * updates.
 */
const updateStudentGrade = async (req, res, next) => {
    try {
        const { classId, mssv } = req.params;
        const userId = req.user._id;
        const assessment = req.body.assessment;
        const rawScore = req.body.score;

        // Defense in depth: validation middleware already enforced this, but the
        // controller should remain safe even when called from elsewhere.
        const TEXT_FIELDS = new Set(['_note', '_careNote']);
        const NUMERIC_EXTRA_FIELDS = new Set(['_bonus', '_rating', '_absences']);

        if (TEXT_FIELDS.has(assessment)) {
            // Free-form text columns: nothing to validate here.
        } else if (assessment === '_bonus') {
            const bonus = Number.parseFloat(rawScore);
            if (!Number.isFinite(bonus) || bonus < BONUS_MIN || bonus > BONUS_MAX) {
                return res.status(400).json({
                    success: false,
                    error: `Bonus phải nằm trong khoảng ${BONUS_MIN}-${BONUS_MAX}.`
                });
            }
        } else if (assessment === '_rating') {
            const rating = Number.parseInt(rawScore, 10);
            if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
                return res.status(400).json({
                    success: false,
                    error: 'Đánh giá phải là số nguyên 1-5.'
                });
            }
        } else if (assessment === '_absences') {
            const absences = Number.parseInt(rawScore, 10);
            if (!Number.isFinite(absences) || absences < 0 || absences > 4) {
                return res.status(400).json({
                    success: false,
                    error: 'Số buổi vắng phải là số nguyên 0-4.'
                });
            }
        } else {
            assertScoreInRange(rawScore, `Điểm "${assessment}"`);
        }

        const classDoc = await classService.getClassById(classId, userId);
        const targetMssv = String(mssv || '').trim();
        const studentExists = (classDoc.students || []).some(
            s => String(s.mssv || '').trim().toUpperCase() === targetMssv.toUpperCase()
        );
        if (!studentExists) {
            return res.status(404).json({ success: false, error: 'Student not found in class' });
        }

        // Resolve grading profile (auto-assign default if class has none yet).
        const profile = await resolveProfileForClass(classDoc, userId);

        // Build a fresh grades payload by cloning the existing one.
        const existingGrades = classDoc.grades || { profileId: profile.profileId, students: {} };
        const existingStudents = (() => {
            const src = existingGrades.students;
            if (!src) return {};
            if (src instanceof Map) return Object.fromEntries(src.entries());
            return { ...src };
        })();

        const studentRow = { ...(existingStudents[targetMssv] || {}) };
        if (assessment === '_note' || assessment === '_careNote') {
            studentRow[assessment] = String(rawScore == null ? '' : rawScore);
        } else if (assessment === '_rating' || assessment === '_absences') {
            studentRow[assessment] = Number.parseInt(rawScore, 10);
        } else {
            studentRow[assessment] = Number.parseFloat(rawScore);
        }
        existingStudents[targetMssv] = studentRow;

        const nextGrades = {
            profileId: existingGrades.profileId || profile.profileId,
            students: existingStudents
        };

        await classService.updateClass(classId, { grades: nextGrades }, userId);

        // Recompute the student's status for the response.
        const computed = calculateStudentScore(
            (classDoc.students || []).find(
                s => String(s.mssv || '').trim().toUpperCase() === targetMssv.toUpperCase()
            ) || { mssv: targetMssv },
            studentRow,
            profile
        );

        const studentView = buildStudentViewModel(
            { classId },
            { mssv: targetMssv, ...(computed) },
            computed
        );

        return res.json({
            success: true,
            data: {
                ...studentView,
                total: computed.total,
                bonus: computed.bonus,
                finalTotal: computed.finalTotal
            }
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    renderDashboard,
    getClassGrades,
    updateStudentGrade,
    // Exposed for testing.
    _internal: { buildClassDashboard, resolveProfileForClass }
};
