# Modules

Các module client-side đang được sử dụng. Tất cả (trừ `auth.js`) là ES module, được import từ `public/js/init.js`.

| Module | Vai trò |
|--------|---------|
| `api.js` | API client với retry, timeout và logging |
| `storage.js` | Quản lý localStorage làm fallback offline |
| `uiState.js` | Trạng thái UI: loading, error, empty states |
| `logger.js` | Log tập trung cho API call / retry / fallback |
| `profiles.js` | Quản lý profile điểm (load qua API, fallback storage) |
| `classManager.js` | Quản lý lớp học (load qua API, fallback storage) |
| `auth.js` | **Classic script** (không phải ES module) — set `window.AuthModule`, xử lý Google OAuth và session. Được nạp bằng thẻ `<script>` riêng trong `views/partials/scripts.ejs`, TRƯỚC `init.js` |

Lưu ý: các SPA view module cũ (`gradeCheck.js`, `profilesView.js`, `classes.js`, `template.js`) và `timer.js` đã bị xóa cùng client-side router. Logic tương ứng nằm ở server-rendered EJS + `app.js`.
