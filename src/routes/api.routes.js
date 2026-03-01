const express = require('express');
const router = express.Router();

const gradeController = require('../controllers/grade.controller');
const classlistController = require('../controllers/classlist.controller');
const templateController = require('../controllers/template.controller');
const profileController = require('../controllers/profile.controller');
const classController = require('../controllers/class.controller');
const brandingController = require('../controllers/branding.controller');

const { uploadSingle, cleanupFile } = require('../middleware/upload.middleware');
const { validateGenerateTemplate, validateExportResults } = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

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

// Upload routes (Protected)
router.post(
    '/upload-grades',
    authenticate,
    uploadSingle('gradeFile'),
    asyncHandler(gradeController.uploadGrades),
    cleanupFile
);

router.post(
    '/upload-classlist',
    authenticate,
    uploadSingle('classListFile'),
    asyncHandler(classlistController.uploadClassList),
    cleanupFile
);

// Template routes (Protected)
router.post(
    '/generate-template',
    authenticate,
    validateGenerateTemplate,
    asyncHandler(templateController.generateTemplate)
);

router.post(
    '/export-results',
    authenticate,
    validateExportResults,
    asyncHandler(templateController.exportResults)
);

// ===== Profile Routes (Protected) =====
router.get('/profiles', authenticate, asyncHandler(profileController.getAllProfiles));
router.get('/profiles/default', authenticate, asyncHandler(profileController.getDefaultProfile));
router.post('/profiles/default', authenticate, asyncHandler(profileController.createDefaultProfile));
router.get('/profiles/:profileId', authenticate, asyncHandler(profileController.getProfileById));
router.post('/profiles', authenticate, asyncHandler(profileController.createProfile));
router.put('/profiles/:profileId', authenticate, asyncHandler(profileController.updateProfile));
router.delete('/profiles/:profileId', authenticate, asyncHandler(profileController.deleteProfile));
router.post('/profiles/:profileId/duplicate', authenticate, asyncHandler(profileController.duplicateProfile));
router.post('/profiles/import', authenticate, asyncHandler(profileController.importProfiles));
router.get('/profiles/export/all', authenticate, asyncHandler(profileController.exportProfiles));

// ===== Class Routes (Protected) =====
router.get('/classes', authenticate, asyncHandler(classController.getAllClasses));
router.get('/classes/:classId', authenticate, asyncHandler(classController.getClassById));
router.post('/classes', authenticate, asyncHandler(classController.createClass));
router.put('/classes/:classId', authenticate, asyncHandler(classController.updateClass));
router.post('/classes/:classId/sync-google-sheet', authenticate, asyncHandler(classController.syncGradesToGoogleSheet));
router.delete('/classes/:classId', authenticate, asyncHandler(classController.deleteClass));

// Student management within a class (Protected)
router.post('/classes/:classId/students', authenticate, asyncHandler(classController.addStudent));
router.post('/classes/:classId/students/bulk', authenticate, asyncHandler(classController.addStudentsBulk));
router.delete('/classes/:classId/students/:mssv', authenticate, asyncHandler(classController.removeStudent));
router.put('/classes/:classId/students/:mssv', authenticate, asyncHandler(classController.updateStudent));

// Class archive management (Protected)
router.put('/classes/:classId/archive', authenticate, asyncHandler(classController.archiveClass));
router.put('/classes/:classId/unarchive', authenticate, asyncHandler(classController.unarchiveClass));

// ===== Global Branding (Admin Only) =====
router.get('/branding', authenticate, requireAdmin, asyncHandler(brandingController.getBranding));
router.put('/branding', authenticate, requireAdmin, asyncHandler(brandingController.updateBranding));
router.post('/branding/reset', authenticate, requireAdmin, asyncHandler(brandingController.resetBranding));

module.exports = router;
