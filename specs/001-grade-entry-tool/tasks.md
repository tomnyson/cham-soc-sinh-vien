# Tasks: Grade Entry & Student Status Dashboard

**Input**: Design documents from `/specs/001-grade-entry-tool/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are omitted as they were not explicitly requested.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Verify project structure per implementation plan and ensure `src/controllers`, `src/models`, `src/routes`, `src/middleware`, `views/` exist.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [ ] T002 Verify `User` model and `auth.middleware.js` are in place for Google OAuth authentication.
- [ ] T003 [P] Create/Update `Class` model in `src/models/class.model.js` based on `data-model.md`.
- [ ] T004 [P] Create/Update `Student` model in `src/models/student.model.js` based on `data-model.md`.

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Lecturer Grade Entry (Priority: P1)

**Goal**: As a lecturer, I want to input grades for my students (either via manual entry or Excel upload) so that I can efficiently record their academic performance.

**Independent Test**: Can be fully tested by entering grades for a sample class and verifying the data is saved and calculated correctly.

### Implementation for User Story 1

- [ ] T005 [P] [US1] Implement grade calculation logic (weights, pass/fail thresholds) in `src/utils/grade.util.js`.
- [ ] T006 [P] [US1] Create grade entry endpoints (`PUT /api/classes/:id/student/:mssv/grade`) in `src/controllers/dashboard.controller.js`.
- [ ] T007 [P] [US1] Configure API routes in `src/routes/dashboard.routes.js`.
- [ ] T008 [US1] Add input validation for grade values (0-10) in `src/middleware/validation.middleware.js`.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently via API.

---

## Phase 4: User Story 2 - View Student Status Dashboard (Priority: P1)

**Goal**: As a lecturer, I want to view a dashboard showing the status of all students in my class (passed, failed, at-risk) so that I can identify students who need help.

**Independent Test**: Can be tested independently by loading mock grade data and verifying the dashboard correctly categorizes and displays student statuses.

### Implementation for User Story 2

- [ ] T009 [P] [US2] Implement dashboard view rendering endpoint (`GET /dashboard`) in `src/controllers/dashboard.controller.js`.
- [ ] T010 [P] [US2] Create EJS template `views/dashboard.ejs` with a table displaying student statuses and grades.
- [ ] T011 [US2] Create EJS partial `views/partials/studentList.ejs` to render individual student rows.
- [ ] T012 [US2] Implement client-side filtering logic (All, Passed, Failed, At-Risk) in `public/js/app.js` (or inline in EJS).
- [ ] T013 [US2] Link grade entry form/buttons on the dashboard to the `PUT` API from US1.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T014 [P] Apply aesthetic UI polish (custom CSS) to `views/dashboard.ejs`.
- [ ] T015 Verify error handling middleware works correctly for invalid grade submissions.
- [ ] T016 [P] Documentation updates in `docs/` regarding the new dashboard.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 and 2 can be developed in parallel as their goals differ slightly, but US2's UI depends on US1's API logic.
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P1)**: Can start after Foundational (Phase 2), uses mock data if US1 is not ready.

### Parallel Opportunities

- Models updates in Foundational phase can run in parallel.
- US1 logic (API) and US2 view (UI) can be built in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 & 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (API logic)
4. Complete Phase 4: User Story 2 (Dashboard UI)
5. **STOP and VALIDATE**: Test both stories.
6. Complete Phase 5: Polish.
