# Implementation Plan: Grade Entry Dashboard

**Branch**: `001-grade-entry-tool` | **Date**: 2026-05-13 | **Spec**: [specs/001-grade-entry-tool/spec.md](spec.md)

**Input**: Feature specification from `/specs/001-grade-entry-tool/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

The Grade Entry Dashboard feature allows lecturers to manually enter student grades via a web interface or upload via Excel. It calculates the final score and determines pass/fail status, which is then visualized on a filterable dashboard. The system utilizes the existing Node.js/Express, MongoDB, and Google OAuth/JWT authentication framework.

## Technical Context

**Language/Version**: Node.js >= 14.x

**Primary Dependencies**: Express.js, EJS, Mongoose, jsonwebtoken, google-auth-library

**Storage**: MongoDB (Mongoose)

**Testing**: Jest (assuming standard for Node.js, to be confirmed if present)

**Target Platform**: Web browser

**Project Type**: web-service (Express web app)

**Performance Goals**: Dashboard loads in < 1 second for 100 students

**Constraints**: Security validation on file uploads, responsive web UI

**Scale/Scope**: ~100 students per class, standard academic workflows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **MVC Architecture & Separation of Concerns**: PASSED - Dashboard views will be built with EJS, routing in Express, and data logic in Mongoose models.
- **Error Handling & API Reliability**: PASSED - All async DB calls will use `asyncHandler`.
- **Security & Validation**: PASSED - Leverages existing `auth.middleware.js` (JWT). Input validation added for grade updates.
- **Code Quality & Maintainability**: PASSED - Modular utility functions will be used for calculation logic.
- **Server-Side Rendering & Templates**: PASSED - Uses the Master layout pattern with EJS partials.

## Project Structure

### Documentation (this feature)

```text
specs/001-grade-entry-tool/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (to be created)
```

### Source Code (repository root)

```text
src/
├── controllers/
│   └── dashboard.controller.js
├── models/
│   ├── class.model.js
│   └── student.model.js
├── routes/
│   └── dashboard.routes.js
└── middleware/
    └── auth.middleware.js

views/
├── dashboard.ejs
└── partials/
    └── studentList.ejs
```

**Structure Decision**: The feature follows Option 2 (Web application) adapted to an MVC pattern. The dashboard interface will reside in the `views/` folder using EJS, backed by controllers in `src/controllers/` and models in `src/models/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
