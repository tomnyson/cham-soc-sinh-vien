# Feature Specification: Student Lesson Report

**Feature Branch**: `002-student-lesson-report`

**Created**: 2026-05-29

**Status**: Draft

**Input**: User description: "tao chuc nang report cho sinh vien note bai hoc  5 phut sau khi hoc xong bai  sinh vien login vao he thong theo tai khoan duoc cap tu giao vien sau do chon mon de report laij noi dung cua buoi hoc theo ngay, theo mon, giao vien co the custom yeu cau report"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Student Submits Lesson Report (Priority: P1)

As a student, I want to log in and submit a report of my lesson notes 5 minutes after class so that I can document my understanding and share it with my teacher.

**Why this priority**: Submitting the report is the core capability that enables this entire feature.

**Independent Test**: Can be tested independently by logging in as a student with a Class ID and MSSV, selecting a subject and date, and submitting a valid report.

**Acceptance Scenarios**:

1. **Given** a student is logged into the student portal, **When** they navigate to the "Report" tab, select a subject, date, and fill out the form, **Then** the report is saved successfully and the student sees a success message.
2. **Given** a student is on the report form, **When** they try to submit without filling in the mandatory fields customized by the teacher, **Then** the system shows validation errors and prevents submission.

---

### User Story 2 - Teacher Customizes Report Requirements (Priority: P2)

As a teacher, I want to customize the report requirements (e.g., specific questions or required sections) for my subjects so that students provide the exact information I need to assess their learning.

**Why this priority**: Customization makes the report feature adaptable to different teaching styles and subjects, which is explicitly requested.

**Independent Test**: Can be tested by logging in as a teacher, modifying the report template for a class/subject, and verifying that the student form updates accordingly.

**Acceptance Scenarios**:

1. **Given** a teacher is managing a class, **When** they update the report form requirements (e.g., adding a new required question), **Then** the changes are saved and immediately reflected when students of that class open the report form.

---

### Edge Cases

- What happens if a student tries to submit multiple reports for the same subject on the same date?
- How does the system handle students submitting the report very late (e.g., days after the class) versus the "5 minutes after" expectation?
- What happens if the teacher changes the report requirements while a student is currently filling out the form?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow students to log in using credentials provided by the teacher (e.g., Class ID and MSSV).
- **FR-002**: System MUST provide a "Report" tab/interface for students to select a subject and date.
- **FR-003**: System MUST allow students to input their lesson notes/reports based on the form fields.
- **FR-004**: System MUST allow teachers to customize the required fields/questions for the report per class or subject.
- **FR-005**: System MUST validate student report submissions against the teacher's customized requirements.
- **FR-006**: System MUST allow teachers to view the submitted reports from their students.

### Key Entities

- **StudentReport**: Represents a submitted report containing the student ID, class ID, subject, date, and the JSON payload of the answers/notes.
- **ReportTemplate**: Represents the teacher's customized requirements (questions, field types, mandatory flags) for a specific class/subject.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Students can successfully submit a lesson report in under 2 minutes.
- **SC-002**: Teachers can customize a report template in under 3 minutes.
- **SC-003**: 95% of submitted reports contain all mandatory fields requested by the teacher.

## Assumptions

- Students use the same login mechanism (Class ID and MSSV) as the existing `student.html` grade lookup page.
- "5 minutes after class" is a policy/guideline rather than a strict system lock-out (i.e., the system won't block submissions at 6 minutes, unless explicitly requested).
- The "Subject" list for a student is derived from the Class they belong to.
