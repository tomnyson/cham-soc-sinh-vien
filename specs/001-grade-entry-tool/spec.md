# Feature Specification: Grade Entry & Student Status Dashboard

**Feature Branch**: `001-grade-entry-tool`

**Created**: 2026-05-13

**Status**: Draft

**Input**: User description: "xay dung 1 tool giup giang vien nhap diem va xem tinh trang sinh vien"

## Clarifications

### Session 2026-05-13
- Q: How should the system handle user authentication for lecturers? → A: Use existing Google OAuth and JWT-based authentication.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lecturer Grade Entry (Priority: P1)

As a lecturer, I want to input grades for my students (either via manual entry or Excel upload) so that I can efficiently record their academic performance.

**Why this priority**: Grade entry is the core functionality that enables the rest of the student status tracking.

**Independent Test**: Can be fully tested by entering grades for a sample class and verifying the data is saved and calculated correctly.

**Acceptance Scenarios**:

1. **Given** a lecturer is on the grade entry interface, **When** they upload a valid Excel file or manually input grades, **Then** the system should validate, calculate total scores, and save the data.
2. **Given** a lecturer is entering grades, **When** they input invalid data (e.g., negative numbers or exceeding max score), **Then** the system should display an error message and prevent saving.

---

### User Story 2 - View Student Status Dashboard (Priority: P1)

As a lecturer, I want to view a dashboard showing the status of all students in my class (passed, failed, at-risk) so that I can identify students who need help.

**Why this priority**: Viewing student status is the primary goal of entering the grades, providing immediate value to the lecturer.

**Independent Test**: Can be tested independently by loading mock grade data and verifying the dashboard correctly categorizes and displays student statuses.

**Acceptance Scenarios**:

1. **Given** grades have been entered for a class, **When** the lecturer views the class dashboard, **Then** they should see a list of students with their total scores and pass/fail status.
2. **Given** the class dashboard is displayed, **When** the lecturer filters by "Failed", **Then** the list should update to show only students matching the criteria.

---

### Edge Cases

- What happens when a student is missing a grade for a specific assignment?
- How does system handle updating an existing grade that was entered incorrectly?
- What happens if the lecturer tries to upload an Excel file with an incorrect format or missing columns?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow lecturers to enter grades for students manually via a web interface.
- **FR-002**: System MUST allow lecturers to upload grades via Excel files.
- **FR-003**: System MUST calculate the final score and pass/fail status based on predefined grade weights.
- **FR-004**: System MUST provide a dashboard displaying the list of students, their individual grades, total score, and status.
- **FR-005**: System MUST allow filtering of students on the dashboard by their status (e.g., All, Passed, Failed).
- **FR-006**: System MUST authenticate users via Google OAuth and JWT tokens using the existing `auth.middleware.js` setup.

### Key Entities

- **Class**: Represents a group of students and the associated grading profile/weights.
- **Student**: Represents an individual student with attributes like ID (MSSV), Name, and contact info.
- **Grade**: Represents a score for a specific assessment (e.g., Lab 1, Quiz 1) linked to a Student.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Lecturers can successfully upload or enter a class's grades in under 2 minutes.
- **SC-002**: The dashboard loads the student status list in under 1 second for classes with up to 100 students.
- **SC-003**: 95% of lecturers can determine which students failed within 30 seconds of viewing the dashboard.

## Assumptions

- Users have modern web browsers and stable internet connectivity.
- The existing backend logic for calculating grades (weights, profiles) will be reused.
- Lecturers already have the class list available (either pre-loaded or uploaded alongside grades).
