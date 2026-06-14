# Implementation Plan: Student Lesson Report & Website Redesign

**Branch**: `002-student-lesson-report` | **Date**: 2026-06-14 | **Spec**: [spec.md](file:///Applications/work/tool_cham_soc_sv/specs/002-student-lesson-report/spec.md)

## Summary

Implement the Student Lesson Report feature (Student login via Class ID and MSSV, lesson report submission form with teacher-customized questions) and perform a comprehensive styling redesign of all pages of the website using the `/design-taste-frontend` rules to deliver a high-end, cohesive user experience.

---

### Design Read (taste-skill inference)
**Reading this as**: Academic student care and grading portal for lecturers and students, with a clean B2B/SaaS dashboard language, leaning toward a cohesive CSS-variables theme + polished borders, soft shadows, and clean grid alignments.

**Core Configuration Dials**:
* `DESIGN_VARIANCE`: 5 (symmetric, clean, structured)
* `MOTION_INTENSITY`: 3 (subtle entry/state transitions, restrained)
* `VISUAL_DENSITY`: 5 (high-density layout suitable for grading tables and dashboards)

---

## Technical Context

**Language/Version**: Node.js 18+ (Express app)

**Primary Dependencies**:
* `express` for server-side routing
* `ejs` for view templates
* `mongoose` for MongoDB schema models
* `bootstrap@5.3.2` and `bootstrap-icons@1.11.1` via CDN for CSS/icons framework
* `xlsx` for Excel import/export logic
* `chart.js` for dashboard metrics visualization

**Storage**: MongoDB (local and atlas) for `StudentReport`, `ReportTemplate`, `Class`, `Student`, `User` data.

**Testing**: Jest + Supertest (defined in `package.json`).

**Target Platform**: Node.js runtime, modern browsers (Chrome, Safari, Firefox).

**Project Type**: Server-side rendered web service with client-side SPA routing for specific views.

**Performance Goals**:
* Page loads under 1 second.
* Database queries indexed properly by `classId` and `mssv`.

**Constraints**:
* No Tailwind CSS unless explicitly chosen; style overrides must leverage Vanilla CSS and Bootstrap utility mappings in `public/css/style.css`.
* Responsive layout (from mobile to wide screen) for all redesigned elements.

**Scale/Scope**:
* 10+ pages including Student Login, Student Dashboard, Lecturer Dashboard, Student Care panel, Template customizer, Profiles list, and Admin settings.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **MVC Architecture**: Route handles controller actions; templates are separated into EJS views and static client-side partials. (Passed)
- **Error Handling**: Use `asyncHandler` middleware for endpoints. (Passed)
- **Security & Validation**: CAPTCHA verification on public report submissions; validation of inputs using middleware. (Passed)
- **Code Quality**: Keep scripts modular in `public/js/pages/`. (Passed)
- **Server-Side Rendering**: Leverages `master.ejs` layout pattern. (Passed)

---

## Project Structure

### Documentation (this feature)

```text
specs/002-student-lesson-report/
├── plan.md              # This file
├── research.md          # Research details (design alignment & captcha service)
├── data-model.md        # DB Schemas: StudentReport, ReportTemplate
├── quickstart.md        # Local environment run details
└── contracts/
    └── api.md           # API request/response formats for reports
```

### Source Code (repository root)

```text
public/
├── css/
│   ├── style.css        # Refined custom styling system (redesigned)
│   └── reliability.css  # Error and offline styling
├── js/
│   ├── app.js           # Core layout logic
│   ├── router.js        # Client-side router
│   ├── routes.js        # Updated routes (adding lesson report triggers)
│   └── pages/
│       ├── report-tool.js # Lesson report UI controller
│       └── ...          # Existing pages scripts
└── partials/
    ├── template.html    # Report template design (redesigned)
    └── ...              # Other partials
views/
├── layouts/
│   └── master.ejs       # Global master frame (redesigned header/sidebar/mobile-nav)
└── pages/
    ├── dashboard.ejs    # Lecturer grade/status table (redesigned)
    ├── student-care.ejs # Student Care tracker (redesigned)
    └── template.ejs     # Template builder (redesigned)
```

**Structure Decision**: Continue using the single hybrid project structure. Server-rendered views and static API-driven HTML pages are updated in parallel.

---

## Verification Plan

### Automated Tests
Run back-end unit tests using Jest:
```bash
npm test
```

### Manual Verification
1. Access the Student Portal (`student.html` or `/grade-check` route) and verify visual consistency (colors, shadows, typography, buttons contrast).
2. Test report submission:
   * Verify validation for mandatory fields.
   * Verify reCAPTCHA verification.
   * Verify date picker and subject selection.
3. Test Lecturer Dashboard:
   * Navigate to `/dashboard` and check the updated stats cards.
   * Check sticky columns during horizontal scrolling on mobile.
4. Test Template builder:
   * Configure questions for a class and save. Verify that the updated questions appear in the student form.
