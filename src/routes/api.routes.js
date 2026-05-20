const express = require('express');
const router = express.Router();

const gradeController = require('../controllers/grade.controller');
const classlistController = require('../controllers/classlist.controller');
const templateController = require('../controllers/template.controller');
const profileController = require('../controllers/profile.controller');
const classController = require('../controllers/class.controller');
const brandingController = require('../controllers/branding.controller');

const dashboardRoutes = require('./dashboard.routes');
const adminRoutes = require('./admin.routes');

const studentCareController = require('../controllers/student-care.controller');

const { uploadSingle, cleanupFile } = require('../middleware/upload.middleware');
const { validateGenerateTemplate, validateExportResults } = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const {
    authenticate,
    requireAdmin,
    requireActiveLecturer
} = require('../middleware/auth.middleware');

// Auth routes
const authRoutes = require('./auth.routes');
router.use('/auth', authRoutes);

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running!',
        timestamp: new Date().toISOString()
    });
});

// ===== Public Student Grade Lookup (No Login Required) =====
router.get('/public/student-grade', asyncHandler(classController.getPublicStudentGrade));
router.get('/public/branding', asyncHandler(brandingController.getPublicBranding));

// ===== Admin Lecturer Management =====
router.use('/admin', adminRoutes);

// Upload routes (Protected)
router.post(
    '/upload-grades',
    authenticate,
    requireActiveLecturer,
    uploadSingle('gradeFile'),
    asyncHandler(gradeController.uploadGrades),
    cleanupFile
);

router.post(
    '/upload-classlist',
    authenticate,
    requireActiveLecturer,
    uploadSingle('classListFile'),
    asyncHandler(classlistController.uploadClassList),
    cleanupFile
);

// Template routes (Protected)
router.post(
    '/generate-template',
    authenticate,
    requireActiveLecturer,
    validateGenerateTemplate,
    asyncHandler(templateController.generateTemplate)
);

router.post(
    '/export-results',
    authenticate,
    requireActiveLecturer,
    validateExportResults,
    asyncHandler(templateController.exportResults)
);

// ===== Profile Routes (Protected) =====
router.get('/profiles', authenticate, requireActiveLecturer, asyncHandler(profileController.getAllProfiles));
router.get('/profiles/default', authenticate, requireActiveLecturer, asyncHandler(profileController.getDefaultProfile));
router.post('/profiles/default', authenticate, requireActiveLecturer, asyncHandler(profileController.createDefaultProfile));
router.get('/profiles/:profileId', authenticate, requireActiveLecturer, asyncHandler(profileController.getProfileById));
router.post('/profiles', authenticate, requireActiveLecturer, asyncHandler(profileController.createProfile));
router.put('/profiles/:profileId', authenticate, requireActiveLecturer, asyncHandler(profileController.updateProfile));
router.delete('/profiles/:profileId', authenticate, requireActiveLecturer, asyncHandler(profileController.deleteProfile));
router.post('/profiles/:profileId/duplicate', authenticate, requireActiveLecturer, asyncHandler(profileController.duplicateProfile));
router.post('/profiles/import', authenticate, requireActiveLecturer, asyncHandler(profileController.importProfiles));
router.get('/profiles/export/all', authenticate, requireActiveLecturer, asyncHandler(profileController.exportProfiles));

// ===== Class Routes (Protected) =====
router.get('/classes', authenticate, requireActiveLecturer, asyncHandler(classController.getAllClasses));
router.get('/classes/:classId', authenticate, requireActiveLecturer, asyncHandler(classController.getClassById));
router.post('/classes', authenticate, requireActiveLecturer, asyncHandler(classController.createClass));
router.put('/classes/:classId', authenticate, requireActiveLecturer, asyncHandler(classController.updateClass));
router.post('/classes/:classId/sync-google-sheet', authenticate, requireActiveLecturer, asyncHandler(classController.syncGradesToGoogleSheet));
router.post('/classes/:classId/send-score-email', authenticate, requireActiveLecturer, asyncHandler(classController.sendScoreEmail));
router.delete('/classes/:classId', authenticate, requireActiveLecturer, asyncHandler(classController.deleteClass));

// Student management within a class (Protected)
router.post('/classes/:classId/students', authenticate, requireActiveLecturer, asyncHandler(classController.addStudent));
router.post('/classes/:classId/students/bulk', authenticate, requireActiveLecturer, asyncHandler(classController.addStudentsBulk));
router.delete('/classes/:classId/students/:mssv', authenticate, requireActiveLecturer, asyncHandler(classController.removeStudent));
router.put('/classes/:classId/students/:mssv', authenticate, requireActiveLecturer, asyncHandler(classController.updateStudent));

// Class archive management (Protected)
router.put('/classes/:classId/archive', authenticate, requireActiveLecturer, asyncHandler(classController.archiveClass));
router.put('/classes/:classId/unarchive', authenticate, requireActiveLecturer, asyncHandler(classController.unarchiveClass));

// ===== Global Branding (Admin Only) =====
router.get('/branding', authenticate, requireAdmin, asyncHandler(brandingController.getBranding));
router.put('/branding', authenticate, requireAdmin, asyncHandler(brandingController.updateBranding));
router.post('/branding/reset', authenticate, requireAdmin, asyncHandler(brandingController.resetBranding));

// ===== Grade Entry Dashboard JSON endpoints =====
router.use('/', dashboardRoutes);

// ===== Student Care list =====
router.get('/student-care', authenticate, requireActiveLecturer, asyncHandler(studentCareController.getStudentCareList));
router.get('/student-care/export', authenticate, requireActiveLecturer, asyncHandler(studentCareController.exportStudentCareList));

module.exports = router;
