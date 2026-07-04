# Documentation Index

Tài liệu cho hệ thống Quản lý Điểm & Chăm sóc Sinh viên FPT Polytechnic.

Kiến trúc hiện tại: Express + MongoDB, render phía server bằng EJS (`views/`), JavaScript client bổ sung tương tác (`public/js/` — xem `public/js/README.md`).

## Bắt đầu

- **[QUICK_START.md](./QUICK_START.md)** — Cài đặt và chạy dự án
- **[HUONG_DAN_SU_DUNG.md](./HUONG_DAN_SU_DUNG.md)** — Hướng dẫn sử dụng cho người dùng cuối

## Cài đặt hạ tầng

- **[MONGODB_SETUP.md](./MONGODB_SETUP.md)** — Cài đặt MongoDB
- **[GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)** — Cấu hình đăng nhập Google OAuth

## Kiểm thử & Debug

- **[QUICK_TEST.md](./QUICK_TEST.md)** — Hướng dẫn test nhanh các flow chính
- **[DEBUG_TEMPLATE.md](./DEBUG_TEMPLATE.md)** — Debug tính năng tạo template Excel

## Đặc tả tính năng

Xem thư mục `specs/` ở gốc dự án:

- `specs/001-grade-entry-tool/` — Công cụ nhập điểm
- `specs/002-student-lesson-report/` — Báo cáo buổi học cho sinh viên

> Lưu ý: các tài liệu mô tả kiến trúc SPA client-side cũ (router.js, hash routing, partials HTML) đã được xóa cùng với code tương ứng.
