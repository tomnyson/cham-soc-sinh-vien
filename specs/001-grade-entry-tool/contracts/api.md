# API Contracts: Grade Entry Dashboard

## Endpoints

### 1. View Dashboard
**Endpoint:** `GET /dashboard`
- **Auth Required:** Yes (Lecturer)
- **Description:** Renders the EJS view for the Grade Entry dashboard, injecting the list of classes assigned to the lecturer.

### 2. View Class Grades
**Endpoint:** `GET /api/classes/:id/grades`
- **Auth Required:** Yes
- **Description:** Returns JSON representation of a class's student grades and statuses.

### 3. Update Grade
**Endpoint:** `PUT /api/classes/:id/student/:mssv/grade`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "assessment": "Lab 1",
  "score": 8.5
}
```
- **Response:** Updated student status JSON.
