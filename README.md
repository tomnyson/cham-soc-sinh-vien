# Grade Checker - Ứng dụng kiểm tra điểm qua môn

Ứng dụng web được xây dựng bằng Node.js Express để quản lý và tính toán điểm của sinh viên theo trọng số, hỗ trợ tạo template Excel và xuất kết quả.

## Tính năng

- ✅ Upload file Excel để tính điểm theo trọng số
- ✅ Quản lý nhiều profile trọng số khác nhau
- ✅ Quản lý danh sách lớp học
- ✅ Tạo template Excel cho nhập điểm
- ✅ Xuất kết quả ra file Excel
- ✅ Lưu trữ cấu hình trên browser (LocalStorage)
- ✅ Hỗ trợ import/export cấu hình

## Cấu trúc project

```
grade-checker/
├── config/                 # Configuration files
│   └── app.config.js      # Application configuration
├── src/
│   ├── controllers/       # Request handlers
│   │   ├── grade.controller.js
│   │   ├── classlist.controller.js
│   │   └── template.controller.js
│   ├── middleware/        # Custom middleware
│   │   ├── error.middleware.js
│   │   ├── upload.middleware.js
│   │   └── validation.middleware.js
│   ├── routes/           # API routes
│   │   └── api.routes.js
│   ├── utils/            # Utility functions
│   │   ├── excel.util.js
│   │   └── string.util.js
│   └── app.js            # Express app setup
├── public/               # Static files (frontend)
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   └── index.html
├── uploads/              # Temporary file uploads
├── .env.example          # Environment variables template
├── .gitignore
├── package.json
├── server.js            # Server entry point
└── README.md
```

## Yêu cầu hệ thống

- Node.js >= 14.x
- npm >= 6.x

## Cài đặt

1. **Clone repository hoặc tải source code**

```bash
cd tool_cham_soc_sv
```

2. **Cài đặt dependencies**

```bash
npm install
```

3. **Cấu hình môi trường**

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Chỉnh sửa file `.env` nếu cần:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# File Upload Configuration
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./uploads

# CORS Configuration
CORS_ORIGIN=*
```

4. **Chạy ứng dụng**

Development mode (với nodemon):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

5. **Truy cập ứng dụng**

Mở trình duyệt và truy cập: `http://localhost:3000`

## API Documentation

### 1. Health Check

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "success": true,
  "message": "Server is running!",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Upload file điểm

**Endpoint:** `POST /api/upload-grades`

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: File Excel (field name: `gradeFile`)

**Response:**
```json
{
  "success": true,
  "data": [["Header1", "Header2"], ["Row1Col1", "Row1Col2"]],
  "filename": "grades.xlsx"
}
```

### 3. Upload danh sách lớp

**Endpoint:** `POST /api/upload-classlist`

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: File Excel (field name: `classListFile`)

**Response:**
```json
{
  "success": true,
  "data": [["MSSV", "Họ tên"], ["SE123456", "Nguyễn Văn A"]],
  "filename": "classlist.xlsx"
}
```

### 4. Tạo template Excel

**Endpoint:** `POST /api/generate-template`

**Request:**
```json
{
  "students": [
    { "mssv": "SE123456", "name": "Nguyễn Văn A" },
    { "mssv": "SE123457", "name": "Trần Thị B" }
  ],
  "weights": {
    "Lab 1": 3.5,
    "Quiz 1": 1.5,
    "GD 1": 10
  },
  "profileName": "Profile mặc định",
  "passThreshold": 3
}
```

**Response:** File Excel download

### 5. Xuất kết quả

**Endpoint:** `POST /api/export-results`

**Request:**
```json
{
  "results": [
    {
      "mssv": "SE123456",
      "name": "Nguyễn Văn A",
      "totalScore": "4.5",
      "passed": true
    }
  ]
}
```

**Response:** File Excel download

## Best Practices được áp dụng

### 1. Architecture Pattern

- **MVC Pattern**: Tách biệt Controllers, Routes, và Views
- **Separation of Concerns**: Mỗi module có trách nhiệm riêng biệt
- **Modular Structure**: Code được tổ chức theo chức năng

### 2. Error Handling

- Centralized error handling middleware
- Async error handling với `asyncHandler`
- Proper HTTP status codes
- User-friendly error messages

### 3. Validation

- Input validation middleware
- File type và size validation
- Data structure validation

### 4. Security

- File upload restrictions (type, size)
- CORS configuration
- Environment variables cho sensitive data
- File cleanup sau khi xử lý

### 5. Code Quality

- Separation of business logic và routes
- Reusable utility functions
- Clear naming conventions
- Proper comments và documentation

### 6. Configuration Management

- Centralized configuration
- Environment-based settings
- `.env` file cho sensitive data
- `.env.example` cho documentation

## Development Guide

### Thêm API endpoint mới

1. **Tạo controller** trong `src/controllers/`
2. **Tạo route** trong `src/routes/`
3. **Thêm validation** nếu cần trong `src/middleware/validation.middleware.js`
4. **Test** endpoint

### Thêm utility function

1. Tạo function trong `src/utils/`
2. Export function
3. Import và sử dụng ở controller

### Custom middleware

1. Tạo middleware trong `src/middleware/`
2. Apply vào route hoặc globally trong `src/app.js`

## Production Deployment

1. **Set NODE_ENV**

```bash
export NODE_ENV=production
```

2. **Install production dependencies only**

```bash
npm install --production
```

3. **Use process manager** (PM2, Forever, etc.)

```bash
npm install -g pm2
pm2 start server.js --name grade-checker
```

4. **Set up reverse proxy** (Nginx, Apache)

5. **Enable HTTPS**

## Troubleshooting

### Port đã được sử dụng

Thay đổi PORT trong file `.env`:
```env
PORT=3001
```

### File upload quá lớn

Tăng MAX_FILE_SIZE trong `.env`:
```env
MAX_FILE_SIZE=104857600  # 100MB
```

### CORS errors

Cấu hình CORS_ORIGIN trong `.env`:
```env
CORS_ORIGIN=http://localhost:3000
```

## 📚 Documentation

Xem tài liệu chi tiết trong thư mục [docs/](./docs/):

- **[Quick Start Guide](./docs/QUICK_START.md)** - Hướng dẫn bắt đầu nhanh
- **[Final Summary](./docs/FINAL_SUMMARY.md)** - Tổng kết dự án
- **[Refactoring Guide](./docs/REFACTORING_GUIDE.md)** - Hướng dẫn refactoring
- **[EJS Implementation](./docs/EJS_IMPLEMENTATION.md)** - EJS template engine
- **[Server-Side Rendering](./docs/SERVER_SIDE_RENDERING.md)** - SSR architecture
- **[Verification Checklist](./docs/VERIFICATION_CHECKLIST.md)** - Testing checklist

Xem đầy đủ: [docs/README.md](./docs/README.md)

## 🎯 Features v2.0

### API Reliability
- ✅ Health check trước khi load data
- ✅ Automatic retry với exponential backoff
- ✅ Loading states với slow connection warnings
- ✅ LocalStorage fallback cho offline mode
- ✅ User-friendly error messages
- ✅ Success notifications
- ✅ Detailed logging

### Architecture
- ✅ EJS template engine
- ✅ Server-side rendering
- ✅ Master layout pattern
- ✅ Reusable partials
- ✅ View helpers
- ✅ ES6 modules

## License

MIT

## Author

Developed with Node.js Express following professional best practices.

**Version:** 2.0.0  
**Last Updated:** November 3, 2025
