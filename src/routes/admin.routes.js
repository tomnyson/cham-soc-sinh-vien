/**
 * Admin-only routes (super admin lecturer management).
 */

const express = require('express');
const router = express.Router();

const lecturerAdminController = require('../controllers/lecturer-admin.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

router.use(authenticate, requireAdmin);

router.get('/lecturers', asyncHandler(lecturerAdminController.list));
router.get('/lecturers/:id', asyncHandler(lecturerAdminController.getById));
router.post('/lecturers/:id/approve', asyncHandler(lecturerAdminController.approve));
router.post('/lecturers/:id/reject', asyncHandler(lecturerAdminController.reject));
router.post('/lecturers/:id/suspend', asyncHandler(lecturerAdminController.suspend));
router.put('/lecturers/:id', asyncHandler(lecturerAdminController.update));
router.delete('/lecturers/:id', asyncHandler(lecturerAdminController.remove));

module.exports = router;
