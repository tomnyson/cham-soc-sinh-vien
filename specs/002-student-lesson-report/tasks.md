# Tasks: Student Lesson Report & Website Redesign

**Input**: Design documents from `/specs/002-student-lesson-report/`

**Prerequisites**: [plan.md](file:///Applications/work/tool_cham_soc_sv/specs/002-student-lesson-report/plan.md) (required), [spec.md](file:///Applications/work/tool_cham_soc_sv/specs/002-student-lesson-report/spec.md) (required), [research.md](file:///Applications/work/tool_cham_soc_sv/specs/002-student-lesson-report/research.md), [data-model.md](file:///Applications/work/tool_cham_soc_sv/specs/002-student-lesson-report/data-model.md), [contracts/api.md](file:///Applications/work/tool_cham_soc_sv/specs/002-student-lesson-report/contracts/api.md)

**Organization**: Tasks are grouped by setup, foundational, user stories, and layout overhaul phases.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Style system setup and variable alignment

- [ ] T001 Initialize theme rules and CSS variable mappings in [public/css/style.css](file:///Applications/work/tool_cham_soc_sv/public/css/style.css)
- [ ] T002 Configure base layout definitions (max-widths, container pads) in [public/css/style.css](file:///Applications/work/tool_cham_soc_sv/public/css/style.css)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core visual overrides and styling components

- [ ] T003 Overhaul input fields: border-color, shadow, and placeholder contrast ratios in [public/css/style.css](file:///Applications/work/tool_cham_soc_sv/public/css/style.css)
- [ ] T004 Overhaul buttons: hover, active clicks scale states, and contrast in [public/css/style.css](file:///Applications/work/tool_cham_soc_sv/public/css/style.css)
- [ ] T005 Refine layout header, sidebar nav and mobile-nav in [views/layouts/master.ejs](file:///Applications/work/tool_cham_soc_sv/views/layouts/master.ejs), [views/partials/header.ejs](file:///Applications/work/tool_cham_soc_sv/views/partials/header.ejs), and [views/partials/sidebar.ejs](file:///Applications/work/tool_cham_soc_sv/views/partials/sidebar.ejs)

---

## Phase 3: User Story 1 - Overhaul Student Portal & Implement Lesson Report Submissions (P1) 🎯 MVP

**Goal**: Student logs in, views grades in a premium table, and submits lesson reports.

**Independent Test**: Login as a student in `student.html` using Class ID and MSSV, navigate to "Báo cáo bài học" tab, fill in the custom questions, and click submit. Verify submission succeeds and is saved.

### Implementation Tasks
- [ ] T006 [P] [US1] Overhaul lookup portal login card, typography, and background in [public/student.html](file:///Applications/work/tool_cham_soc_sv/public/student.html)
- [ ] T007 [P] [US1] Redesign the grades display card, table structure, and status badges in [public/student.html](file:///Applications/work/tool_cham_soc_sv/public/student.html)
- [ ] T008 [US1] Redesign the "Báo cáo bài học" form tab: textareas, dates, and submit buttons in [public/student.html](file:///Applications/work/tool_cham_soc_sv/public/student.html)
- [ ] T009 [P] [US1] Redesign the fallback student public view in [public/partials/grade-check.html](file:///Applications/work/tool_cham_soc_sv/public/partials/grade-check.html) and [views/pages/grade-check.ejs](file:///Applications/work/tool_cham_soc_sv/views/pages/grade-check.ejs)
- [ ] T010 [US1] Integrate report template loader and submission script handlers in [public/js/pages/report-tool.js](file:///Applications/work/tool_cham_soc_sv/public/js/pages/report-tool.js)

**Checkpoint**: Student portal and lesson report submissions are fully operational and visually refined.

---

## Phase 4: User Story 2 - Overhaul Teacher Customization Interface & Templates (P2)

**Goal**: Teacher can edit report templates for each class, adding/editing custom questions.

**Independent Test**: Login as teacher, navigate to "Tạo Template" page, modify questions, and save. Verify changes load correctly in student portal.

### Implementation Tasks
- [ ] T011 [US2] Redesign the report template builder layout: class selector, profile selector, drag/reorder indicators, and add question buttons in [views/pages/template.ejs](file:///Applications/work/tool_cham_soc_sv/views/pages/template.ejs)
- [ ] T012 [P] [US2] Redesign template partial file structure in [public/partials/template.html](file:///Applications/work/tool_cham_soc_sv/public/partials/template.html)
- [ ] T013 [US2] Refine form customization script and save template action in [public/js/pages/branding.js](file:///Applications/work/tool_cham_soc_sv/public/js/pages/branding.js) or associated scripts

**Checkpoint**: Teacher report customization works and presents a clean form layout.

---

## Phase 5: Overhaul Lecturer & Admin Pages

**Goal**: Redesign all other dashboard, student care list, and settings pages.

### Implementation Tasks
- [ ] T014 [P] Redesign stats cards and filters in [views/pages/dashboard.ejs](file:///Applications/work/tool_cham_soc_sv/views/pages/dashboard.ejs)
- [ ] T015 Overhaul grading sheet table, focus colors, and column sticky positioning in [public/css/style.css](file:///Applications/work/tool_cham_soc_sv/public/css/style.css)
- [ ] T016 [P] Redesign Student Care grid/list components in [views/pages/student-care.ejs](file:///Applications/work/tool_cham_soc_sv/views/pages/student-care.ejs)
- [ ] T017 Redesign Profiles editor in [views/pages/profiles.ejs](file:///Applications/work/tool_cham_soc_sv/views/pages/profiles.ejs) and [public/partials/profiles.html](file:///Applications/work/tool_cham_soc_sv/public/partials/profiles.html)
- [ ] T018 Redesign Admin settings and Branding configuration view in [views/pages/branding.ejs](file:///Applications/work/tool_cham_soc_sv/views/pages/branding.ejs)

**Checkpoint**: All main pages are visually overhauled.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Performance, accessibility, and documentation

- [ ] T019 Check button contrasts against WCAG AA compliance across all views
- [ ] T020 Optimize CSS layouts on mobile breakpoints (width < 768px)
- [ ] T021 Validate start-up with `npm run dev` and perform final verification

---

## Dependencies & Execution Order

### Phase Dependencies

* **Setup (Phase 1)**: No dependencies - can start immediately.
* **Foundational (Phase 2)**: Depends on Setup - BLOCKS all pages design tweaks.
* **User Stories (Phases 3-4)** and **Lecturer/Admin Overhaul (Phase 5)**: Depend on Foundational.
* **Polish (Phase 6)**: Depends on all other phases being completed.

### Parallel Opportunities

* Setup tasks T001 and T002 can run in parallel.
* Student UI modifications (T006, T007) and Public view styling (T009) can run in parallel.
* Stats cards redesign (T014) and Student Care panel redesign (T016) can run in parallel.
