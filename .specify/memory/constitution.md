<!-- Sync Impact Report
Version change: 0.0.0 -> 1.0.0
Modified Principles:
  - [PRINCIPLE_1_NAME] -> MVC Architecture & Separation of Concerns
  - [PRINCIPLE_2_NAME] -> Error Handling & API Reliability
  - [PRINCIPLE_3_NAME] -> Security & Validation
  - [PRINCIPLE_4_NAME] -> Code Quality & Maintainability
  - [PRINCIPLE_5_NAME] -> Server-Side Rendering & Templates
Added Sections:
  - Configuration Management
  - Development Workflow
Removed Sections: None
Templates requiring updates:
  - .specify/templates/plan-template.md (⚠ pending)
  - .specify/templates/spec-template.md (⚠ pending)
  - .specify/templates/tasks-template.md (⚠ pending)
Follow-up TODOs: None
-->

# Grade Checker Constitution

## Core Principles

### I. MVC Architecture & Separation of Concerns
The project strictly follows the Model-View-Controller (MVC) architectural pattern. Controllers, Routes, and Views MUST be cleanly separated. Each module MUST have a single, distinct responsibility. Business logic MUST be separated from routing definitions.

### II. Error Handling & API Reliability
Centralized error handling middleware MUST be utilized. All asynchronous operations MUST use proper error handling (e.g., `asyncHandler`). The application MUST return appropriate HTTP status codes and user-friendly error messages. For client-side interactions, automatic retries with exponential backoff and LocalStorage fallbacks for offline mode SHOULD be implemented.

### III. Security & Validation
All incoming requests MUST undergo input validation. File uploads MUST be strictly restricted by type and size. Sensitive data MUST NOT be hardcoded and MUST use environment variables (`.env`). Proper CORS configurations MUST be maintained. Uploaded files MUST be cleaned up after processing.

### IV. Code Quality & Maintainability
Code MUST use clear naming conventions, proper comments, and comprehensive documentation. Utility functions MUST be reusable and centralized in the `utils/` directory. ES6 modules and modern JavaScript features SHOULD be used where appropriate.

### V. Server-Side Rendering & Templates
The frontend MUST leverage EJS as the template engine. The architecture MUST utilize the Master layout pattern with reusable partials and view helpers to ensure DRY (Don't Repeat Yourself) principles across all views.

## Configuration Management

All environment-specific settings MUST be managed through centralized configuration files (e.g., `config/app.config.js` and `.env`). A `.env.example` file MUST be maintained to document required environment variables.

## Development Workflow

When adding new API endpoints, developers MUST:
1. Create a controller in `src/controllers/`.
2. Define the route in `src/routes/`.
3. Add necessary validation in `src/middleware/validation.middleware.js`.
4. Test the endpoint thoroughly.
Custom middlewares MUST be placed in `src/middleware/` and utility functions in `src/utils/`.

## Governance

This Constitution supersedes all other development practices for the Grade Checker project. All Pull Requests and Code Reviews MUST verify compliance with these core principles. Any complex deviations MUST be justified.

**Version**: 1.0.0 | **Ratified**: 2026-05-13 | **Last Amended**: 2026-05-13
