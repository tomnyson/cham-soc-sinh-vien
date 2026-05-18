/**
 * Student Care Controller
 *
 * Provides a consolidated list of students across all of a lecturer's
 * non-archived classes who need attention. A student qualifies when either:
 *   - their teacher rating is between 1 and 3 stars (inclusive), or
 *   - their absence count is greater than 2 (i.e. 3 or 4).
 *
 * Endpoints:
 *   - GET /student-care                    (renders the page)
 *   - GET /api/student-care                (returns JSON for the page or 3rd parties)
 *   - GET /api/student-care/export         (returns the list as an Excel file)
 *
 * Supported query filters (page, JSON, and export endpoints):
 *   - classId   : limit to a specific class
 *   - year      : academic year (number)
 *   - block     : 1 or 2
 *   - semester  : spring | summer | fall
 */

const XLSX = require('xlsx');
const classService = require('../services/class.service');

const RATING_THRESHOLD = 3;   // include ratings 1..3 (inclusive)
const ABSENCE_THRESHOLD = 2;  // include absences strictly greater than this

const VALID_SEMESTERS = new Set(['spring', 'summer', 'fall']);
const SEMESTER_LABELS = {
    spring: 'Spring',
    summer: 'Summer',
    fall: 'Fall'
};

/**
 * Read a normalized grade row for a given MSSV from the class's grades doc,
 * accepting Map / object / legacy shapes.
 */
function getStudentGradeRow(grades, mssv) {
    if (!grades) return {};

    const studentsContainer = grades.students || grades;
    if (!studentsContainer) return {};

    if (studentsContainer instanceof Map) {
        return studentsContainer.get(mssv) || studentsContainer.get(String(mssv).toUpperCase()) || {};
    }

    if (typeof studentsContainer === 'object' && !Array.isArray(studentsContainer)) {
        const directHit = studentsContainer[mssv] || studentsContainer[String(mssv).toUpperCase()];
        if (directHit && typeof directHit === 'object' && !Array.isArray(directHit)) {
            return directHit instanceof Map ? Object.fromEntries(directHit.entries()) : directHit;
        }
    }

    return {};
}

/**
 * Decide if a given grade row qualifies a student for care follow-up.
 */
function evaluateCareStatus(gradeRow = {}) {
    const rating = Number.parseInt(gradeRow._rating, 10);
    const absences = Number.parseInt(gradeRow._absences, 10);

    const ratingFlag = Number.isFinite(rating) && rating >= 1 && rating <= RATING_THRESHOLD;
    const absenceFlag = Number.isFinite(absences) && absences > ABSENCE_THRESHOLD;

    return {
        flagged: ratingFlag || absenceFlag,
        rating: Number.isFinite(rating) ? rating : null,
        absences: Number.isFinite(absences) ? absences : null,
        reasons: {
            lowRating: ratingFlag,
            tooManyAbsences: absenceFlag
        }
    };
}

/**
 * Coerce raw query params into a typed filter object.
 */
function normalizeFilters(query = {}) {
    const filters = { classId: '', year: null, block: null, semester: '' };

    if (query.classId !== undefined) {
        filters.classId = String(query.classId || '').trim();
    }

    if (query.year !== undefined && query.year !== '') {
        const year = Number.parseInt(query.year, 10);
        if (Number.isFinite(year) && year >= 2000 && year <= 2100) {
            filters.year = year;
        }
    }

    if (query.block !== undefined && query.block !== '') {
        const block = Number.parseInt(query.block, 10);
        if (block === 1 || block === 2) {
            filters.block = block;
        }
    }

    if (query.semester !== undefined && query.semester !== '') {
        const semester = String(query.semester || '').trim().toLowerCase();
        if (VALID_SEMESTERS.has(semester)) {
            filters.semester = semester;
        }
    }

    return filters;
}

function classMatchesFilters(classDoc, filters) {
    if (filters.classId && classDoc.classId !== filters.classId) return false;
    if (filters.year !== null && classDoc.year !== filters.year) return false;
    if (filters.block !== null && classDoc.block !== filters.block) return false;
    if (filters.semester && (classDoc.semester || '') !== filters.semester) return false;
    return true;
}

/**
 * Build the care-list payload for a lecturer's account.
 *
 * @param {string} userId
 * @param {object} [filters]
 * @returns {Promise<{ students: object[], summary: object, thresholds: object,
 *   filterOptions: { classes: object[], years: number[], blocks: number[], semesters: string[] },
 *   appliedFilters: object }>}
 */
async function buildStudentCareList(userId, filters = {}) {
    const classes = await classService.getAllClasses(userId);
    const activeClasses = (classes || []).filter(c => !c.isArchived);

    // Build filter options from all active classes (so the dropdowns stay
    // useful even after a filter is applied).
    const yearSet = new Set();
    const blockSet = new Set();
    const semesterSet = new Set();
    const classOptions = [];

    activeClasses.forEach((classDoc) => {
        if (Number.isFinite(classDoc.year)) yearSet.add(classDoc.year);
        if (classDoc.block === 1 || classDoc.block === 2) blockSet.add(classDoc.block);
        if (classDoc.semester) semesterSet.add(classDoc.semester);
        classOptions.push({
            classId: classDoc.classId,
            name: classDoc.name || classDoc.classId,
            year: Number.isFinite(classDoc.year) ? classDoc.year : null,
            block: classDoc.block === 1 || classDoc.block === 2 ? classDoc.block : null,
            semester: classDoc.semester || '',
            instructorCode: classDoc.instructorCode || ''
        });
    });

    const matchingClasses = activeClasses.filter(c => classMatchesFilters(c, filters));

    const students = [];
    matchingClasses.forEach((classDoc) => {
        const classStudents = Array.isArray(classDoc.students) ? classDoc.students : [];
        classStudents.forEach((student) => {
            const mssv = String(student?.mssv || '').trim();
            if (!mssv) return;

            const gradeRow = getStudentGradeRow(classDoc.grades, mssv);
            const status = evaluateCareStatus(gradeRow);
            if (!status.flagged) return;

            students.push({
                mssv,
                name: String(student.name || '').trim(),
                email: String(student.email || '').trim(),
                phone: String(student.phone || '').trim(),
                classId: classDoc.classId,
                className: classDoc.name || '',
                year: Number.isFinite(classDoc.year) ? classDoc.year : null,
                block: classDoc.block === 1 || classDoc.block === 2 ? classDoc.block : null,
                semester: classDoc.semester || '',
                instructorCode: classDoc.instructorCode || '',
                rating: status.rating,
                absences: status.absences,
                careNote: String(gradeRow._careNote || '').trim(),
                teacherNote: String(gradeRow._note || '').trim(),
                reasons: status.reasons
            });
        });
    });

    // Stable sort: most-absent first, then lowest rating, then class then MSSV.
    students.sort((a, b) => {
        const absencesDiff = (b.absences || 0) - (a.absences || 0);
        if (absencesDiff !== 0) return absencesDiff;

        const ratingA = a.rating == null ? Number.POSITIVE_INFINITY : a.rating;
        const ratingB = b.rating == null ? Number.POSITIVE_INFINITY : b.rating;
        if (ratingA !== ratingB) return ratingA - ratingB;

        if (a.className !== b.className) return a.className.localeCompare(b.className, 'vi');
        return a.mssv.localeCompare(b.mssv);
    });

    const summary = {
        totalFlagged: students.length,
        classCount: matchingClasses.length,
        lowRatingCount: students.filter(s => s.reasons.lowRating).length,
        tooManyAbsencesCount: students.filter(s => s.reasons.tooManyAbsences).length
    };

    return {
        students,
        summary,
        thresholds: { rating: RATING_THRESHOLD, absences: ABSENCE_THRESHOLD },
        filterOptions: {
            classes: classOptions.sort((a, b) => a.name.localeCompare(b.name, 'vi')),
            years: Array.from(yearSet).sort((a, b) => b - a),
            blocks: Array.from(blockSet).sort(),
            semesters: ['spring', 'summer', 'fall'].filter(s => semesterSet.has(s))
        },
        appliedFilters: { ...filters }
    };
}

/**
 * Build a worksheet rows array from the care list, ready for `aoa_to_sheet`.
 */
function buildExportRows(students) {
    const header = [
        'STT', 'MSSV', 'Họ và tên', 'Email', 'Phone',
        'Lớp', 'Năm', 'Block', 'Kỳ', 'Mã GV',
        'Đánh giá', 'Vắng', 'Lý do', 'Ghi chú chăm sóc', 'Ghi chú GV'
    ];

    const rows = students.map((student, idx) => {
        const reasons = [];
        if (student.reasons?.lowRating) reasons.push('Đánh giá thấp');
        if (student.reasons?.tooManyAbsences) reasons.push('Vắng nhiều');

        return [
            idx + 1,
            student.mssv,
            student.name,
            student.email || '',
            student.phone || '',
            student.className,
            student.year ?? '',
            student.block ?? '',
            student.semester ? SEMESTER_LABELS[student.semester] || student.semester : '',
            student.instructorCode || '',
            student.rating != null ? `${student.rating}/5` : '',
            student.absences != null ? `${student.absences}/4` : '',
            reasons.join(', '),
            student.careNote || '',
            student.teacherNote || ''
        ];
    });

    return [header, ...rows];
}

/**
 * Compose a download-friendly filename based on the active filters.
 */
function buildExportFilename(filters) {
    const parts = ['cham_soc_sinh_vien'];
    if (filters.classId) parts.push(filters.classId);
    if (filters.year) parts.push(String(filters.year));
    if (filters.block) parts.push(`block${filters.block}`);
    if (filters.semester) parts.push(filters.semester);
    parts.push(String(Date.now()));
    return parts.join('_').replace(/[^a-zA-Z0-9_-]/g, '_') + '.xlsx';
}

/**
 * GET /api/student-care
 */
const getStudentCareList = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        const filters = normalizeFilters(req.query);
        const data = await buildStudentCareList(req.user._id, filters);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/student-care/export
 */
const exportStudentCareList = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        const filters = normalizeFilters(req.query);
        const data = await buildStudentCareList(req.user._id, filters);

        const sheetRows = buildExportRows(data.students);
        const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);

        // Reasonable column widths.
        worksheet['!cols'] = [
            { wch: 5 }, { wch: 12 }, { wch: 28 }, { wch: 28 }, { wch: 14 },
            { wch: 18 }, { wch: 6 }, { wch: 6 }, { wch: 8 }, { wch: 10 },
            { wch: 9 }, { wch: 7 }, { wch: 22 }, { wch: 30 }, { wch: 30 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Cham soc SV');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${buildExportFilename(filters)}"`);
        return res.send(buffer);
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    buildStudentCareList,
    normalizeFilters,
    getStudentCareList,
    exportStudentCareList
};
