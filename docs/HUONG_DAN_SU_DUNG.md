# Hướng dẫn sử dụng - Hệ thống quản lý điểm sinh viên

## 🎯 Tổng quan

Ứng dụng đã được nâng cấp với:
- ✅ Giao diện Tab hiện đại
- ✅ Tích hợp MongoDB Atlas
- ✅ RESTful API đầy đủ
- ✅ Lưu trữ dữ liệu vĩnh viễn
- ✅ **Xác thực Google OAuth** - Bảo mật tài khoản
- ✅ **Phân quyền truy cập** - Chỉ user đã đăng nhập mới quản lý được lớp và điểm

## 🚀 Khởi động ứng dụng

### Bước 1: Cài đặt dependencies

```bash
npm install
```

### Bước 2: Cấu hình Google OAuth

**QUAN TRỌNG:** Ứng dụng yêu cầu đăng nhập với Google để sử dụng.

1. Xem hướng dẫn chi tiết tại: [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)
2. Tạo Google OAuth credentials tại [Google Cloud Console](https://console.cloud.google.com/)
3. Cập nhật file `.env` với `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`

### Bước 3: Cấu hình MongoDB

File `.env` đã được cấu hình với MongoDB Atlas:

```env
MONGODB_URI=mongodb+srv://admin:jT9nhQ3TPsVmwfBq@cluster0.x7ehwnm.mongodb.net/?appName=Cluster0
```

### Bước 4: Chạy server

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

### Bước 5: Đăng nhập

1. Mở trình duyệt: **http://localhost:3000**
2. Bạn sẽ thấy màn hình đăng nhập
3. Click nút **"Đăng nhập với Google"**
4. Chọn tài khoản Google của bạn
5. Cho phép quyền truy cập
6. Sau khi đăng nhập thành công, bạn sẽ vào trang chủ

**Lưu ý:** Chỉ có user đã đăng nhập mới có thể:
- Quản lý Profile điểm
- Quản lý Lớp học
- Upload và kiểm tra điểm sinh viên

## 📱 Giao diện Tab

Ứng dụng được chia thành 4 tab chính:

### 1. 📊 Kiểm tra điểm

**Chức năng:**
- Chọn profile điểm từ dropdown
- Upload file Excel điểm
- Xem kết quả và thống kê
- Xuất kết quả ra Excel

**Cách sử dụng:**
1. Chọn profile từ dropdown "Chọn Profile điểm"
2. Click "📂 Chọn file Excel điểm"
3. Xem kết quả thống kê và bảng điểm
4. Click "📥 Xuất kết quả Excel" để download

### 2. ⚙️ Quản lý Profile

**Chức năng:**
- Xem danh sách tất cả profiles
- Tạo profile mới
- Sửa/Xóa profile
- Nhân bản profile
- Import/Export cấu hình

**Cách sử dụng:**
- **Tạo mới**: Click "➕ Tạo Profile mới" → Nhập thông tin → Lưu
- **Sửa**: Click "✏️ Sửa" trên profile → Chỉnh sửa → Lưu
- **Nhân bản**: Click "📑 Nhân bản" → Nhập tên mới
- **Xuất**: Click "📤 Xuất cấu hình" → Download JSON file
- **Nhập**: Click "📥 Nhập cấu hình" → Chọn JSON file

### 3. 👥 Quản lý Lớp học

**Chức năng:**
- Xem danh sách lớp
- Tạo/Sửa/Xóa lớp
- Quản lý sinh viên trong lớp
- Upload danh sách sinh viên từ Excel

**Cách sử dụng:**
- **Tạo lớp**: Click "➕ Tạo lớp mới" → Nhập thông tin
- **Thêm SV thủ công**: Click "➕ Thêm SV thủ công" → Nhập MSSV và tên
- **Upload SV**: Click "📁 Upload danh sách" → Chọn file Excel
- **Lưu**: Click "💾 Lưu"

### 4. 📝 Tạo Template

**Chức năng:**
- Chọn profile điểm
- Chọn nguồn danh sách sinh viên
- Tạo template Excel tự động

**Cách sử dụng:**
1. **Chọn Profile**: Dropdown "Chọn profile" → Chọn profile điểm
2. **Chọn nguồn SV**:
   - **Từ lớp đã lưu**: Chọn radio "Từ lớp đã lưu" → Chọn lớp
   - **Upload file mới**: Chọn radio "Upload file mới" → Upload file danh sách
3. **Tạo template**: Click "📝 Tạo Template Excel"
4. File template sẽ tự động download

## 📁 Format file Excel

### File danh sách lớp

Cần có ít nhất 2 cột:
- **MSSV** (hoặc "Mã sinh viên", "Mã SV")
- **Họ và tên** (hoặc "Tên", "Họ tên")

Ví dụ:
```
MSSV        | Họ và tên
SE123456    | Nguyễn Văn A
SE123457    | Trần Thị B
```

### File điểm

Template sẽ tự động tạo các cột dựa trên profile:
- Mã sinh viên
- Họ và tên
- Các cột điểm (Lab 1, Quiz 1, GD 1, etc.)

Nhập điểm theo thang 100 (0-100)

## 🔄 Workflow khuyến nghị

### Lần đầu sử dụng:

1. **Tạo Profile** (Tab "Quản lý Profile")
   - Click "➕ Tạo Profile mới"
   - Nhập tên (VD: "Lập trình Java SE1801")
   - Thêm các cột điểm và trọng số
   - Đặt ngưỡng qua môn
   - Lưu

2. **Tạo Lớp học** (Tab "Quản lý Lớp học")
   - Click "➕ Tạo lớp mới"
   - Nhập tên lớp và mô tả
   - Upload danh sách SV hoặc thêm thủ công
   - Lưu

3. **Tạo Template** (Tab "Tạo Template")
   - Chọn profile vừa tạo
   - Chọn lớp vừa tạo
   - Click "📝 Tạo Template Excel"
   - Download và nhập điểm

4. **Kiểm tra điểm** (Tab "Kiểm tra điểm")
   - Chọn profile
   - Upload file đã nhập điểm
   - Xem kết quả
   - Xuất kết quả nếu cần

### Sử dụng thường xuyên:

1. Tab "Kiểm tra điểm" → Chọn profile → Upload file
2. Hoặc tạo template mới cho lớp khác

## 🔧 Troubleshooting

### Server không start

```bash
# Kill tất cả process Node.js
killall node

# Hoặc kill process trên port 3000
lsof -ti:3000 | xargs kill -9

# Restart
npm start
```

### MongoDB connection error

- Kiểm tra connection string trong `.env`
- Kiểm tra network/firewall
- Xem MONGODB_SETUP.md để cấu hình lại

### File không upload được

- Kiểm tra định dạng file (.xlsx hoặc .xls)
- Kiểm tra kích thước file (max 50MB)
- Kiểm tra format cột MSSV và Họ tên

### Không thấy dữ liệu đã lưu

- Kiểm tra MongoDB connection
- Nếu sử dụng LocalStorage mode, dữ liệu chỉ lưu trên browser hiện tại
- Clear cache browser và thử lại

## 📊 API Endpoints

### Profiles

- `GET /api/profiles` - Lấy tất cả profiles
- `GET /api/profiles/:id` - Lấy profile theo ID
- `POST /api/profiles` - Tạo profile mới
- `PUT /api/profiles/:id` - Cập nhật profile
- `DELETE /api/profiles/:id` - Xóa profile

### Classes

- `GET /api/classes` - Lấy tất cả lớp
- `GET /api/classes/:id` - Lấy lớp theo ID
- `POST /api/classes` - Tạo lớp mới
- `PUT /api/classes/:id` - Cập nhật lớp
- `DELETE /api/classes/:id` - Xóa lớp

### Upload

- `POST /api/upload-grades` - Upload file điểm
- `POST /api/upload-classlist` - Upload danh sách lớp

### Template

- `POST /api/generate-template` - Tạo template Excel
- `POST /api/export-results` - Xuất kết quả

## 💡 Tips

1. **Backup cấu hình**: Thường xuyên export profiles để backup
2. **Đặt tên rõ ràng**: Profile và lớp nên có tên dễ nhớ, dễ phân biệt
3. **Kiểm tra trọng số**: Đảm bảo tổng trọng số = 60% (hoặc theo yêu cầu)
4. **Template chuẩn**: Luôn tạo template từ hệ thống để đảm bảo format đúng
5. **Ngưỡng qua môn**: Kiểm tra ngưỡng qua môn trong profile trước khi tính điểm

## 📞 Support

Nếu gặp vấn đề, check:
1. Console log trong browser (F12)
2. Server log trong terminal
3. MongoDB connection status
4. README.md và MONGODB_SETUP.md

## 🔐 Bảo mật

**LƯU Ý**: MongoDB connection string trong `.env` chứa thông tin nhạy cảm:
- KHÔNG commit file `.env` lên Git
- KHÔNG chia sẻ connection string
- Sử dụng `.env.example` làm template
