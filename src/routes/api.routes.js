const express = require('express');
const router = express.Router();

const gradeController = require('../controllers/grade.controller');
const classlistController = require('../controllers/classlist.controller');
const templateController = require('../controllers/template.controller');
const profileController = require('../controllers/profile.controller');
const classController = require('../controllers/class.controller');

const { uploadSingle, cleanupFile } = require('../middleware/upload.middleware');
const { validateGenerateTemplate, validateExportResults } = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running!',
        timestamp: new Date().toISOString()
    });
});

// Upload routes
router.post(
    '/upload-grades',
    uploadSingle('gradeFile'),
    asyncHandler(gradeController.uploadGrades),
    cleanupFile
);

router.post(
    '/upload-classlist',
    uploadSingle('classListFile'),
    asyncHandler(classlistController.uploadClassList),
    cleanupFile
);

// Template routes
router.post(
    '/generate-template',
    validateGenerateTemplate,
    asyncHandler(templateController.generateTemplate)
);

router.post(
    '/export-results',
    validateExportResults,
    asyncHandler(templateController.exportResults)
);

// ===== Profile Routes =====
router.get('/profiles', asyncHandler(profileController.getAllProfiles));
router.get('/profiles/default', asyncHandler(profileController.getDefaultProfile));
router.get('/profiles/:profileId', asyncHandler(profileController.getProfileById));
router.post('/profiles', asyncHandler(profileController.createProfile));
router.put('/profiles/:profileId', asyncHandler(profileController.updateProfile));
router.delete('/profiles/:profileId', asyncHandler(profileController.deleteProfile));
router.post('/profiles/:profileId/duplicate', asyncHandler(profileController.duplicateProfile));
router.post('/profiles/import', asyncHandler(profileController.importProfiles));
router.get('/profiles/export/all', asyncHandler(profileController.exportProfiles));

// ===== Class Routes =====
router.get('/classes', asyncHandler(classController.getAllClasses));
router.get('/classes/:classId', asyncHandler(classController.getClassById));
router.post('/classes', asyncHandler(classController.createClass));
router.put('/classes/:classId', asyncHandler(classController.updateClass));
router.delete('/classes/:classId', asyncHandler(classController.deleteClass));

// Student management within a class
router.post('/classes/:classId/students', asyncHandler(classController.addStudent));
router.post('/classes/:classId/students/bulk', asyncHandler(classController.addStudentsBulk));
router.delete('/classes/:classId/students/:mssv', asyncHandler(classController.removeStudent));
router.put('/classes/:classId/students/:mssv', asyncHandler(classController.updateStudent));

module.exports = router;
