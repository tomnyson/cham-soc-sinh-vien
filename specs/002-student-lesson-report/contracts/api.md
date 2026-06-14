# API Contract: Student Lesson Report

API endpoints exposed for student reports and templates.

---

### 1. Get Report Template (Public)
* **Method**: `GET`
* **Path**: `/api/public/report-template`
* **Query Params**:
  * `classId` (string, required)
* **Response (Success)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "60c72b2f9b1d8b2c8c8b4567",
      "classId": "class_123",
      "fields": [
        {
          "_id": "field_001",
          "questionText": "Nội dung bài học hôm nay là gì?",
          "isRequired": true,
          "order": 1
        }
      ]
    }
  }
  ```

---

### 2. Submit Report (Public)
* **Method**: `POST`
* **Path**: `/api/public/submit-report`
* **Request Body**:
  ```json
  {
    "classId": "class_123",
    "mssv": "PK01234",
    "date": "2026-06-14",
    "answers": {
      "field_001": "Học về thiết kế giao diện."
    },
    "captchaToken": "g-recaptcha-response-token"
  }
  ```
* **Response (Success)**:
  ```json
  {
    "success": true,
    "message": "Gửi báo cáo thành công",
    "data": {
      "classId": "class_123",
      "mssv": "PK01234",
      "date": "2026-06-14",
      "studentName": "Nguyễn Văn A"
    }
  }
  ```
