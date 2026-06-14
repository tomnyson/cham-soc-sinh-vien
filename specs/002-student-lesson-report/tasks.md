# Tasks: Student Lesson Report & Website Redesign

**Input**: Design documents from `/specs/002-student-lesson-report/`

**Prerequisites**: [plan.md](file:///Applications/work/tool_cham_soc_sv/specs/002-student-lesson-report/plan.md) (required), [spec.md](file:///Applications/work/tool_cham_soc_sv/specs/002-student-lesson-report/spec.md) (required), [research.md](file:///Applications/work/tool_cham_soc_sv/specs/002-student-lesson-report/research.md), [data-model.md](file:///Applications/work/tool_cham_soc_sv/specs/002-student-lesson-report/data-model.md), [contracts/api.md](file:///Applications/work/tool_cham_soc_sv/specs/002-student-lesson-report/contracts/api.md)

**Tests**: Test tasks are optional. They are only included if explicitly requested.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Single project: `public/`, `src/`, `views/` at repository root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Style system setup and variable alignment

- [x] T001 Initialize theme rules and CSS variable mappings in [public/css/style.css](file:///Applications/work/tool_cham_soc_sv/public/css/style.css)
- [x] T002 Configure base layout definitions (max-widths, container pads) in [public/css/style.css](file:///Applications/work/tool_cham_soc_sv/public/css/style.css)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure and base styling that MUST be complete before user story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Overhaul input fields: border-color, shadow, and placeholder contrast ratios in [public/css/style.css](file:///Applications/work/tool_cham_soc_sv/public/css/style.css)
- [x] T004 Overhaul buttons: hover, active clicks scale states, and contrast in [public/css/style.css](file:///Applications/work/tool_cham_soc_sv/public/css/style.css)
- [x] T005 Refine layout header, sidebar nav, and mobile-nav in [views/layouts/master.ejs](file:///Applications/work/tool_cham_soc_sv/views/layouts/master.ejs), [views/partials/header.ejs](file:///Applications/work/tool_cham_soc_sv/views/partials/header.ejs), and [views/partials/sidebar.ejs](file:///Applications/work/tool_cham_soc_sv/views/partials/sidebar.ejs)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Student Submits Lesson Report (Priority: P1) 🎯 MVP

**Goal**: Student logs in, views grades in a premium table, and submits lesson reports.

**Independent Test**: Login as a student in `student.html` using Class ID and MSSV, navigate to "Báo cáo bài học" tab, fill in the custom questions, and click submit. Verify submission succeeds and is saved.

### Implementation for User Story 1

- [x] T006 [P] [US1] Overhaul lookup portal login card, typography, and background in [public/student.html](file:///Applications/work/tool_cham_soc_sv/public/student.html)
- [x] T007 [P] [US1] Redesign the grades display card, table structure, and status badges in [public/student.html](file:///Applications/work/tool_cham_soc_sv/public/student.html)
- [x] T008 [US1] Redesign the "Báo cáo bài học" form tab: textareas, dates, and submit buttons in [public/student.html](file:///Applications/work/tool_cham_soc_sv/public/student.html)
- [x] T009 [P] [US1] Redesign the fallback student public view in [public/partials/grade-check.html](file:///Applications/work/tool_cham_soc_sv/public/partials/grade-check.html) and [views/pages/grade-check.ejs](file:///Applications/work/tool_cham_soc_sv/views/pages/grade-check.ejs)
- [x] T010 [US1] Integrate report template loader and submission script handlers in [public/js/pages/report-tool.js](file:///Applications/work/tool_cham_soc_sv/public/js/pages/report-tool.js)

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Teacher Customizes Report Requirements (Priority: P2)

**Goal**: Teacher can edit report templates for each class, adding/editing custom questions.

**Independent Test**: Login as teacher, navigate to "Tạo Template" page, modify questions, and save. Verify changes load correctly in student portal.

### Implementation for User Story 2

- [x] T011 [US2] Redesign the report template builder layout: class selector, profile selector, drag/reorder indicators, and add question buttons in [views/pages/template.ejs](file:///Applications/work/tool_cham_soc_sv/views/pages/template.ejs)
- [x] T012 [P] [US2] Redesign template partial file structure in [public/partials/template.html](file:///Applications/work/tool_cham_soc_sv/public/partials/template.html)
- [x] T013 [US2] Refine form customization script and save template action in [public/js/pages/branding.js](file:///Applications/work/tool_cham_soc_sv/public/js/pages/branding.js) or associated scripts

**Checkpoint**: At this point, User Stories 1 and 2 should both work independently.

---

## Phase 5: Overhaul Lecturer & Admin Pages

**Goal**: Redesign all other dashboard, student care list, and settings pages.

**Independent Test**: Log in as teacher, view `/dashboard`, `/student-care`, `/profiles`, `/admin/lecturers`, and `/branding` and verify layout.

### Implementation Tasks

- [x] T014 [P] Redesign stats cards and filters in [views/pages/dashboard.ejs](file:///Applications/work/tool_cham_soc_sv/views/pages/dashboard.ejs)
- [x] T015 Overhaul grading sheet table, focus colors, and column sticky positioning in [public/css/style.css](file:///Applications/work/tool_cham_soc_sv/public/css/style.css)
- [x] T016 [P] Redesign Student Care grid/list components in [views/pages/student-care.ejs](file:///Applications/work/tool_cham_soc_sv/views/pages/student-care.ejs)
- [x] T017 Redesign Profiles editor in [views/pages/profiles.ejs](file:///Applications/work/tool_cham_soc_sv/views/pages/profiles.ejs) and [public/partials/profiles.html](file:///Applications/work/tool_cham_soc_sv/public/partials/profiles.html)
- [x] T018 Redesign Admin settings and Branding configuration view in [views/pages/branding.ejs](file:///Applications/work/tool_cham_soc_sv/views/pages/branding.ejs)

**Checkpoint**: All main pages are visually overhauled.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Performance, accessibility, and documentation

- [x] T019 Check button contrasts against WCAG AA compliance across all views
- [x] T020 Optimize CSS layouts on mobile breakpoints (width < 768px)
- [x] T021 Validate start-up with `npm run dev` and perform final verification

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - User stories can then proceed in parallel (if staffed).
  - Or sequentially in priority order (P1 → P2).
- **Polish (Final Phase)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories.
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable.

### Within Each User Story

- Models before services.
- Services before endpoints.
- Core implementation before integration.
- Story complete before moving to next priority.

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T001, T002).
- Foundational tasks T003, T004, T005 can run partially in parallel.
- Once Foundational phase completes, all user stories can start in parallel.
- Student UI modifications (T006, T007) and Public view styling (T009) can run in parallel.
- Stats cards redesign (T014) and Student Care panel redesign (T016) can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Launch student UI tasks in parallel:
Task: "Overhaul lookup portal login card, typography, and background in public/student.html"
Task: "Redesign the grades display card, table structure, and status badges in public/student.html"
Task: "Redesign the fallback student public view in public/partials/grade-check.html and views/pages/grade-check.ejs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Test User Story 1 independently.
5. Deploy/demo if ready.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready.
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!).
3. Add User Story 2 → Test independently → Deploy/Demo.
4. Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together.
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
3. Stories complete and integrate independently.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
