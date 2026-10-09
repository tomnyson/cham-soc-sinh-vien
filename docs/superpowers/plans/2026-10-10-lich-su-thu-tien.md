# Lịch sử thu tiền theo học viên — Implementation Plan

**Goal:** Ghi nhận nhiều lần thu tiền cho từng học viên, theo dõi công nợ từng học viên, và đưa "Đã thanh toán / Còn lại" vào hóa đơn in + Excel (in được theo cả lớp hoặc theo 1 học viên).

**Architecture:** Additive. Collection mới `payments` (model `Payment`). Logic chia tiền / sổ công nợ / validate nằm trong util thuần `src/utils/payment.util.js`. Controller mới `payment.controller.js` (GET / POST / PUT void). Hóa đơn mở rộng `buildInvoiceData` với tham số tuỳ chọn `mssv`, `payments` — không truyền thì kết quả giữ nguyên như cũ.

## Quy tắc nghiệp vụ

- Tiền mỗi buổi **chia đều cho cả lớp trong buổi** (mọi mssv trong `records`, kể cả vắng).
- Chia số nguyên VND; phần dư +1đ lần lượt theo mssv tăng dần → tổng phần chia luôn = `totalCost`.
- Buổi không có `records` → "chưa phân bổ", không ai nợ.
- Học viên vào lớp sau 1 buổi không có trong `records` → không nợ buổi đó. Học viên rời lớp vẫn còn nợ (hiển thị "đã rời lớp").
- Hình thức thu: `cash` (tiền mặt), `transfer` (chuyển khoản), `discount` (giảm trừ — dùng để ghi nhận voucher/miễn giảm vì voucher không lưu DB).
- Ghi nhầm → **huỷ (void)**, không xoá. Bản ghi `voided` không tính vào tổng.

## Global Constraints

- Không sửa / xoá dữ liệu `attendancesessions`, không đổi field hiện có của `classes`.
- Không thêm route `DELETE`, không migration.
- API ghi/đọc thu tiền kiểm tra quyền qua `classService.getClassById(classId, req.user._id)`.
- Chạy jest theo đường dẫn file, không chạy `test:coverage`.

## Tasks

- [x] Task 1: `payment.util` — `allocateSessionCost`, `buildStudentLedger`, `sumActivePayments`, `parsePaymentInput` + test
- [x] Task 2: `payment.model` + `payment.controller` (GET/POST/PUT void) + routes + controller test
- [x] Task 3: Hóa đơn — `buildInvoiceData` nhận `mssv`/`payments`; `loadInvoice` nạp payments; Excel + trang in hiển thị Đã thanh toán / Còn lại; QR = số còn lại
- [x] Task 4: UI — tab "Thu tiền" (partial + module JS), ô ĐÃ THU / CÒN NỢ + chọn học viên ở tab Lịch sử
- [ ] Task 5: GitNexus `detect_changes`, chạy toàn bộ test liên quan

## Rủi ro đã biết

- Khoản thu trên hóa đơn lọc theo `paidAt` trong khoảng ngày của hóa đơn — nộp sau kỳ thì cần nới ngày "đến".
- Controller điểm danh / hóa đơn JSON hiện tìm lớp không theo user (`Class.findOne({ classId })`) — lỗ hổng có sẵn, ngoài phạm vi.
