# Hướng dẫn cấu hình Google OAuth

## Bước 1: Tạo Google OAuth Credentials

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Vào **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Chọn **Application type**: Web application
6. Điền thông tin:
   - **Name**: Grade Checker App (hoặc tên bạn muốn)
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (cho development)
     - `https://your-domain.com` (cho production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/google/callback` (cho development)
     - `https://your-domain.com/api/auth/google/callback` (cho production)
7. Click **Create**
8. Copy **Client ID** và **Client Secret**

## Bước 2: Cấu hình biến môi trường

1. Tạo file `.env` từ `.env.example`:
   ```bash
   cp .env.example .env
   ```

2. Cập nhật các giá trị trong file `.env`:
   ```env
   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

   # Session & JWT Configuration (tạo random string phức tạp)
   SESSION_SECRET=your-random-session-secret-here
   JWT_SECRET=your-random-jwt-secret-here
   ```

3. Tạo random secret keys:
   ```bash
   # Tạo SESSION_SECRET
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

   # Tạo JWT_SECRET
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

## Bước 3: Cấu hình OAuth Consent Screen

1. Vào **APIs & Services** > **OAuth consent screen**
2. Chọn **User Type**: External (hoặc Internal nếu dùng Google Workspace)
3. Điền thông tin app:
   - **App name**: Grade Checker
   - **User support email**: your-email@example.com
   - **Developer contact information**: your-email@example.com
4. Click **Save and Continue**
5. Thêm scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
6. Click **Save and Continue**
7. Thêm test users (nếu app chưa verified):
   - Thêm email của các tài khoản Google cần test
8. Click **Save and Continue**

## Bước 4: Chạy ứng dụng

1. Cài đặt dependencies (nếu chưa):
   ```bash
   npm install
   ```

2. Khởi động server:
   ```bash
   npm start
   ```

3. Truy cập: http://localhost:3000

## Kiểm tra cấu hình

1. Mở trình duyệt và truy cập http://localhost:3000
2. Bạn sẽ thấy màn hình đăng nhập
3. Click **Đăng nhập với Google**
4. Chọn tài khoản Google
5. Cho phép quyền truy cập
6. Sau khi đăng nhập thành công, bạn sẽ được chuyển về trang chủ

## Lưu ý bảo mật

1. **KHÔNG** commit file `.env` vào Git
2. Luôn sử dụng HTTPS trong production
3. Thay đổi `SESSION_SECRET` và `JWT_SECRET` thành giá trị phức tạp
4. Giới hạn domain được phép trong CORS settings
5. Chỉ thêm authorized redirect URIs cần thiết

## Troubleshooting

### Lỗi "redirect_uri_mismatch"
- Kiểm tra lại **Authorized redirect URIs** trong Google Console
- Đảm bảo URL khớp chính xác (bao gồm http/https, port, path)

### Lỗi "Access blocked: This app's request is invalid"
- Kiểm tra OAuth consent screen đã được cấu hình đúng
- Thêm email test user trong Google Console

### Không redirect sau khi login
- Kiểm tra `GOOGLE_CALLBACK_URL` trong `.env`
- Kiểm tra MongoDB đã được kết nối
- Xem console log để debug

### Cookie không được set
- Kiểm tra CORS configuration
- Đảm bảo `credentials: true` trong CORS settings
- Trong production, set `secure: true` cho cookies

## Production Deployment

Khi deploy lên production:

1. Thêm production domain vào **Authorized JavaScript origins**
2. Thêm production callback URL vào **Authorized redirect URIs**
3. Cập nhật `.env`:
   ```env
   NODE_ENV=production
   GOOGLE_CALLBACK_URL=https://your-domain.com/api/auth/google/callback
   CORS_ORIGIN=https://your-domain.com
   ```
4. Publish OAuth consent screen (nếu cần public access)
