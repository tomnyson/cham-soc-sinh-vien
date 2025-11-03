# Hướng dẫn cài đặt MongoDB Atlas

## Bước 1: Tạo tài khoản MongoDB Atlas

1. Truy cập [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)
2. Đăng ký tài khoản miễn phí (Free Tier)
3. Xác nhận email

## Bước 2: Tạo Cluster mới

1. Đăng nhập vào MongoDB Atlas
2. Click **"Build a Database"** hoặc **"Create"**
3. Chọn **"Shared"** (Free tier - M0)
4. Chọn Cloud Provider (AWS, Google Cloud, hoặc Azure)
5. Chọn Region gần nhất (VD: Singapore cho Việt Nam)
6. Đặt tên cho Cluster (VD: `grade-checker-cluster`)
7. Click **"Create Cluster"**

## Bước 3: Tạo Database User

1. Trong sidebar, click **"Database Access"**
2. Click **"Add New Database User"**
3. Chọn **"Password"** authentication
4. Nhập **Username** và **Password** (lưu lại thông tin này!)
5. Database User Privileges: Chọn **"Read and write to any database"**
6. Click **"Add User"**

## Bước 4: Whitelist IP Address

1. Trong sidebar, click **"Network Access"**
2. Click **"Add IP Address"**
3. Chọn **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Hoặc thêm IP cụ thể nếu muốn bảo mật hơn
4. Click **"Confirm"**

## Bước 5: Lấy Connection String

1. Quay lại **"Database"** trong sidebar
2. Click **"Connect"** trên Cluster của bạn
3. Chọn **"Connect your application"**
4. Driver: **Node.js**, Version: **5.5 or later**
5. Copy Connection String:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```

## Bước 6: Cấu hình trong Project

1. Mở file `.env` trong project
2. Thay thế `MONGODB_URI` bằng connection string của bạn:

```env
MONGODB_URI=mongodb+srv://your-username:your-password@grade-checker-cluster.xxxxx.mongodb.net/grade-checker?retryWrites=true&w=majority
```

**Lưu ý:**
- Thay `<username>` bằng username database user
- Thay `<password>` bằng password database user
- Thay `<cluster>` bằng tên cluster của bạn
- Thêm database name sau domain (VD: `/grade-checker`)

## Ví dụ Connection String hoàn chỉnh

```env
MONGODB_URI=mongodb+srv://myuser:mypassword123@grade-checker-cluster.abc123.mongodb.net/grade-checker?retryWrites=true&w=majority
```

## Bước 7: Kiểm tra kết nối

1. Cài đặt dependencies:
   ```bash
   npm install
   ```

2. Chạy server:
   ```bash
   npm run dev
   ```

3. Kiểm tra log trong console:
   ```
   🔌 Connecting to MongoDB...
   ✅ MongoDB connected successfully
   📍 Database: grade-checker
   🖥️  Host: grade-checker-cluster.xxxxx.mongodb.net
   ```

## Troubleshooting

### Lỗi: "Authentication failed"
- Kiểm tra lại username và password
- Đảm bảo password không chứa ký tự đặc biệt (hoặc encode URL)

### Lỗi: "Connection timeout"
- Kiểm tra IP whitelist trong Network Access
- Kiểm tra firewall/proxy

### Lỗi: "Database not found"
- Database sẽ tự động được tạo khi có data
- Hoặc tạo database manually trong Atlas UI

## Xem dữ liệu trong MongoDB Atlas

1. Vào **"Database"** → Click **"Browse Collections"**
2. Bạn sẽ thấy:
   - Collection `profiles` - Lưu trữ grade profiles
   - Collection `classes` - Lưu trữ class information

## Features với MongoDB

Sau khi kết nối thành công, ứng dụng sẽ:
- ✅ Lưu profiles và classes vào database
- ✅ Sync dữ liệu giữa các devices
- ✅ Backup tự động
- ✅ Query nhanh hơn với large dataset
- ✅ Seed default profile tự động

## Chế độ LocalStorage (Không dùng MongoDB)

Nếu không muốn dùng MongoDB:
1. Để `MONGODB_URI` trống trong `.env`
2. Ứng dụng sẽ tự động chạy ở LocalStorage mode
3. Dữ liệu chỉ lưu trên browser
