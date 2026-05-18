/**
 * Dashboard API routes.
 *
 * The page-level route (`GET /dashboard`) is mounted directly on the Express
 * app from `src/app.js` so that it can use the master EJS layout. This router
 * only exposes the JSON endpoints that live under `/api`.
 */

const express = require('express');
const router = express.Router({ mergeParams: true });

const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateGradeUpdate } = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// GET /api/classes/:classId/grades  - Class grade snapshot for the dashboard.
router.get(
    '/classes/:classId/grades',
    authenticate,
    asyncHandler(dashboardController.getClassGrades)
);

// PUT /api/classes/:classId/student/:mssv/grade  - Update a single grade cell.
router.put(
    '/classes/:classId/student/:mssv/grade',
    authenticate,
    validateGradeUpdate,
    asyncHandler(dashboardController.updateStudentGrade)
);

module.exports = router;
