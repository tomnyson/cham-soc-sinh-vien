# Data Model: Student Lesson Report

This document defines the schemas used to store report templates and student submissions.

## Entities

### `ReportTemplate`
Stores the custom question configuration set by the lecturer for each class/subject.
* `classId` (String, required): ID of the class this template belongs to.
* `userId` (String, required): ID of the lecturer who created it.
* `fields` (Array of objects):
  * `questionText` (String, required): The prompt or question.
  * `isRequired` (Boolean): Validation requirement flag.
  * `order` (Number): Sorting weight of the question on the form.

### `StudentReport`
Stores students' submitted notes and answers.
* `classId` (String, required): ID of the class.
* `mssv` (String, required): Student's roll number.
* `studentName` (String): Student's full name.
* `date` (String, required): The date of the lesson (format: YYYY-MM-DD).
* `answers` (Map/Object): Key-value pair of questions (`fieldId` -> `answerText`).
