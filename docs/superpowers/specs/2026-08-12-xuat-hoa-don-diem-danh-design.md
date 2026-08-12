# Thiết kế: Xuất hóa đơn từ điểm danh & học phí

**Ngày:** 2026-08-12
**Trang liên quan:** `/classes/:classId` → modal `#attendanceModal` (Điểm Danh & Học Phí)
**Trạng thái:** Đã duyệt thiết kế, chờ lập kế hoạch triển khai

---

## 1. Mục tiêu

Cho phép giảng viên xuất **bảng kê học phí (hóa đơn) của cả lớp** dựa trên các buổi đã điểm danh, lọc theo khoảng ngày, ra hai định dạng: **PDF (in qua trình duyệt)** và **Excel (.xlsx)**. Hóa đơn kèm **mã QR chuyển khoản VietQR** sinh từ cấu hình ngân hàng của lớp.

### Ràng buộc tuyệt đối

> **KHÔNG được xóa hoặc sửa dữ liệu đã có trong database.**

Toàn bộ tính năng là **additive**: chỉ thêm field mới, thêm route mới, thêm file mới. Chi tiết cưỡng chế ở [mục 8](#8-an-toàn-dữ-liệu).

---

## 2. Quyết định thiết kế đã chốt

| Câu hỏi | Quyết định |
|---|---|
| Hóa đơn cho ai | **Bảng kê tổng cho cả lớp** (một hóa đơn liệt kê mọi buổi học, không tách theo từng sinh viên) |
| Định dạng | **Cả hai** — PDF qua trình duyệt + Excel `.xlsx` |
| Phạm vi dữ liệu | **Lọc theo khoảng ngày** (Từ ngày – Đến ngày). Không có checkbox chọn từng buổi. |
| Lưu hóa đơn vào DB | **Không.** Sinh tại chỗ mỗi lần xuất, số hóa đơn theo quy tắc tất định. |
| Sinh QR | **VietQR.io image API** (`img.vietqr.io`) |
| Nơi lưu cấu hình | **Theo từng lớp** — thêm `invoiceConfig` vào model `Class` |

---

## 3. Hiện trạng codebase

| Thành phần | Vị trí | Ghi chú |
|---|---|---|
| Model buổi học | `src/models/attendance.model.js` | `classId, date, durationHours, hourlyRate, totalCost, records[], createdBy` |
| API điểm danh | `src/routes/api.routes.js:121-122` | `GET`/`POST /api/classes/:classId/attendance` |
| Controller | `src/controllers/attendance.controller.js` | `getSessionsByClass`, `createSession` |
| UI modal | `views/pages/class-detail.ejs:1898-2057` | 3 tab: Điểm danh mới / Lịch sử / Cấu hình |
| JS modal | `public/js/pages/class-detail-attendance.js` | ES module, dùng `uiState.showNotification` |
| Cập nhật lớp | `src/services/class.service.js:317` → `normalizeClassMetadata()` (dòng 88) | **Whitelist** — field không khai báo sẽ bị bỏ qua |
| Thương hiệu | `src/models/branding.model.js` | `logoDataUrl`, `subtext`, `primaryColor` |
| Excel | `src/utils/excel.util.js` (server, SheetJS) | Đã dùng cho export bảng điểm, student-care |

**Mô hình tính tiền hiện tại:** `totalCost = durationHours × hourlyRate`, tính **theo buổi**, độc lập với số sinh viên có mặt. `hourlyRate` được lưu **snapshot trên từng buổi** → đơn giá lịch sử luôn chính xác kể cả khi đổi cấu hình sau này. Hóa đơn dùng đúng `totalCost` đã lưu, **không tính lại**.

---

## 4. Model dữ liệu

### 4.1 Thêm `invoiceConfig` vào `Class`

Thêm vào `src/models/class.model.js` — sub-schema mới, mọi field optional:

```js
const invoiceConfigSchema = new mongoose.Schema({
  centerName:      { type: String, default: '', trim: true, maxlength: 120 },
  payerName:       { type: String, default: '', trim: true, maxlength: 120 },
  payerPhone:      { type: String, default: '', trim: true, maxlength: 30  },
  payerAddress:    { type: String, default: '', trim: true, maxlength: 200 },
  bankCode:        { type: String, default: '', trim: true, maxlength: 20  },
  bankAccount:     { type: String, default: '', trim: true, maxlength: 30  },
  bankAccountName: { type: String, default: '', trim: true, maxlength: 120 },
  note:            { type: String, default: '', trim: true, maxlength: 300 }
}, { _id: false });

// trong classSchema:
invoiceConfig: { type: invoiceConfigSchema, default: () => ({}) }
```

**Tương thích ngược:** document `classes` cũ không có field này. Mongoose trả về default rỗng khi đọc; chỉ ghi vào DB khi người dùng thực sự lưu cấu hình. Không cần migration.

**Không thay đổi:** `AttendanceSession` giữ nguyên hoàn toàn.

### 4.2 Mở rộng whitelist trong service

`src/services/class.service.js` → `normalizeClassMetadata()` thêm nhánh:

```js
if (input.invoiceConfig !== undefined) {
  result.invoiceConfig = normalizeInvoiceConfig(input.invoiceConfig);
}
```

`normalizeInvoiceConfig()` là hàm mới: trim từng field, ép về chuỗi, cắt theo maxlength, bỏ qua key lạ. Endpoint `PUT /api/classes/:classId` **đã tồn tại** nên không cần route mới cho việc lưu cấu hình.

---

## 5. Backend

### 5.1 `src/utils/invoice.util.js` (file mới, thuần hàm)

| Hàm | Mô tả |
|---|---|
| `filterSessionsByRange(sessions, from, to)` | Lọc theo `date`; `from`/`to` rỗng nghĩa là không giới hạn phía đó. `to` được đẩy đến cuối ngày (23:59:59.999). |
| `buildInvoiceData({ classData, sessions, from, to, branding })` | Trả về cấu trúc hoàn chỉnh để render (xem 5.2) |
| `numberToVietnameseWords(n)` | `6000000` → `"Sáu triệu đồng chẵn"` |
| `buildVietQrUrl({ bankCode, bankAccount, bankAccountName, amount, addInfo })` | Trả `null` nếu thiếu `bankCode` hoặc `bankAccount` |
| `generateInvoiceNo(classId, from, to)` | Tất định (xem 5.3) |
| `BANKS` | Mảng hằng ngân hàng VietQR: `{ code, bin, shortName, name }` |

### 5.2 Cấu trúc `invoiceData`

```js
{
  invoiceNo: 'HD-848247-202607-202608',
  issuedAt: Date,
  class: { classId, name, semester, year, block, instructorCode },
  period: { from: Date|null, to: Date|null, label: '01/07/2026 – 10/08/2026' },
  config: { centerName, payerName, payerPhone, payerAddress,
            bankCode, bankAccount, bankAccountName, note },
  branding: { logoDataUrl, subtext, primaryColor },
  rows: [{ index, date, durationHours, presentCount, totalStudents,
           hourlyRate, totalCost }],
  totals: { sessionCount, totalHours, totalAmount },
  amountInWords: 'Sáu triệu đồng chẵn',
  qrUrl: 'https://img.vietqr.io/image/...' | null
}
```

### 5.3 Quy tắc số hóa đơn

`HD-{6 ký tự cuối classId}-{YYYYMM của from}-{YYYYMM của to}`

Không có `from`/`to` thì dùng `ALL` cho vế tương ứng. Tất định — cùng tham số luôn cho cùng số hóa đơn, không cần lưu DB, không cần bộ đếm.

### 5.4 `src/controllers/invoice.controller.js` (file mới)

| Handler | Route | Trả về |
|---|---|---|
| `getInvoiceData` | `GET /api/classes/:classId/invoice?from=&to=` | JSON `{ success, data: invoiceData }` |
| `exportInvoiceExcel` | `GET /api/classes/:classId/invoice/export?from=&to=` | Buffer `.xlsx`, tên file `Hoa_don_{classId}_{timestamp}.xlsx` |

Cả hai dùng `authenticate, requireActiveLecturer` như các route lớp khác. Truy vấn:

```js
AttendanceSession.find({ classId, date: { $gte, $lte } }).sort({ date: 1 })
```

Không có buổi nào trong khoảng → trả `success: true` với `rows: []`, `totals` bằng 0 (UI hiển thị thông báo, không coi là lỗi).

### 5.5 Trang in

`src/app.js` thêm route `GET /classes/:classId/invoice?from=&to=` → render `views/pages/invoice-print.ejs`, **không dùng layout master** (trang in độc lập).

Bảo vệ theo đúng pattern của `GET /classes/:classId/note` (`src/app.js:541`):

```js
app.get('/classes/:classId/invoice', optionalAuth, async (req, res, next) => {
  if (!ensureLecturerAccess(req, res)) return;
  const userId = req.user._id;
  // ...
});
```

Lớp không tồn tại → render `class-not-found` như các route lớp hiện có.

### 5.6 Excel

Thêm `createInvoiceWorkbook(invoiceData)` vào `src/utils/excel.util.js`. **Không sửa hàm hiện có.** Một sheet `Hóa đơn`:

1. Khối tiêu đề: tên trung tâm, số HĐ, ngày xuất, lớp, kỳ/năm, giảng viên, kính gửi
2. Bảng buổi học (cùng cột với PDF)
3. Dòng tổng + tiền bằng chữ
4. Khối thanh toán: ngân hàng, STK, chủ TK, và **link VietQR dạng text**

> SheetJS bản community không nhúng được ảnh → QR chỉ có ở bản PDF; Excel ghi link.

---

## 6. Frontend

### 6.1 Tab "Cấu hình" — thêm mục *Thông tin hóa đơn*

Trong `views/pages/class-detail.ejs`, dưới ô đơn giá hiện có (`#attConfigHourlyRate`), thêm khối form: tên trung tâm, người nhận/phụ huynh, SĐT, địa chỉ, dropdown ngân hàng (từ `BANKS`), số tài khoản, chủ tài khoản, ghi chú. Nút `#btnSaveAttendanceConfig` hiện có được mở rộng để gửi kèm `invoiceConfig` trong cùng request `PUT /api/classes/:classId`.

### 6.2 Tab "Lịch sử" — thêm thanh lọc + nút xuất

Thêm phía trên bảng: `Từ ngày` / `Đến ngày` (mặc định rỗng = tất cả), nút **Áp dụng**, nút **In / PDF**, nút **Tải Excel**.

- `loadAttendanceHistory()` được sửa để truyền `from`/`to` vào query — tổng doanh thu hiển thị theo đúng khoảng lọc
- **In / PDF** → `window.open('/classes/{id}/invoice?from=&to=')`
- **Tải Excel** → điều hướng tới endpoint export
- Nếu chưa cấu hình STK, hiện cảnh báo nhẹ "Chưa cấu hình tài khoản — hóa đơn sẽ không có mã QR" nhưng **vẫn cho xuất**

### 6.3 `public/js/pages/class-detail-invoice.js` (file mới)

ES module riêng cho phần lọc ngày, hai nút xuất, và lưu `invoiceConfig`. Tách khỏi `class-detail-attendance.js` để không phình file. Dùng `uiState.showNotification` theo đúng pattern hiện có.

---

## 7. Trang hóa đơn `views/pages/invoice-print.ejs` (file mới)

**Hướng thiết kế:** chứng từ hành chính Việt Nam — nghiêm túc, mật độ chữ cao, chỉ dùng một màu nhấn lấy từ `branding.primaryColor`.

- **Header:** logo (`logoDataUrl`) trái, tên trung tâm + `subtext` dưới logo; phải là "BẢNG KÊ HỌC PHÍ" + số HĐ + ngày xuất
- **Khối thông tin:** hai cột — trái là Lớp / Kỳ / Năm / Giảng viên; phải là Kính gửi / SĐT / Địa chỉ (ẩn dòng nào rỗng)
- **Bảng:** `STT | Ngày | Thời lượng | Sĩ số | Đơn giá/giờ | Thành tiền`
- **Chân bảng:** tổng số buổi, tổng giờ, **TỔNG CỘNG** in đậm + *Bằng chữ: …*
- **Khối thanh toán:** ảnh QR VietQR bên trái (`amount` = tổng tiền, `addInfo` = số HĐ), thông tin ngân hàng dạng chữ bên phải. `onerror` trên `<img>` ẩn ảnh khi lỗi mạng → thông tin chữ vẫn đầy đủ
- **Chữ ký:** hai ô ký "Người lập bảng kê" / "Người nộp tiền"
- **`@media print`:** khổ A4, ẩn thanh nút, `print-color-adjust: exact`, tránh ngắt trang giữa hàng bảng
- Nút "In hóa đơn" gọi `window.print()`

---

## 8. An toàn dữ liệu

Yêu cầu bất di bất dịch của người dùng: **tuyệt đối không xóa dữ liệu DB.**

| Collection | Thao tác được phép | Bị cấm |
|---|---|---|
| `attendancesessions` | `find()` duy nhất | `update*`, `delete*`, `remove`, `drop`, `bulkWrite` |
| `classes` | `$set` field mới `invoiceConfig` qua `updateClass` sẵn có | `replaceOne`, `findOneAndReplace`, `deleteOne`, `deleteMany` |
| Khác | không đụng | — |

Ngoài ra:

- **Không viết migration script** dưới bất kỳ hình thức nào
- **Không thêm endpoint DELETE** nào trong phạm vi tính năng này
- Test tích hợp **đếm số document `attendancesessions` và `classes` trước/sau** mỗi lần gọi API xuất hóa đơn, khẳng định không đổi
- Thay đổi `class.model.js` chỉ là **thêm field mới**; không đổi tên, không đổi kiểu, không xóa field hiện có

---

## 9. Kiểm thử

### Unit — `src/utils/invoice.util.js`

- `numberToVietnameseWords`: 0, 1.000, 400.000, 6.000.000, 21.000.000, số lẻ hàng nghìn, số có "linh"/"mươi"/"lăm"
- `filterSessionsByRange`: rỗng cả hai đầu, chỉ `from`, chỉ `to`, cả hai, biên đầu/cuối ngày, khoảng không có buổi nào
- `buildInvoiceData`: cộng đúng `totals`, `rows` giữ nguyên `hourlyRate` snapshot của từng buổi, `presentCount` đếm đúng
- `buildVietQrUrl`: trả `null` khi thiếu `bankCode`/`bankAccount`; encode đúng `addInfo` tiếng Việt
- `generateInvoiceNo`: tất định, xử lý đúng khi thiếu `from`/`to`

### Integration — supertest + `mongodb-memory-server`

- `GET /api/classes/:id/invoice` trả đúng cấu trúc, đúng tổng tiền
- `GET .../invoice/export` trả `Content-Type` xlsx và buffer đọc lại được bằng SheetJS
- Chặn khi chưa đăng nhập / không phải lecturer đang hoạt động
- Lớp không tồn tại → 404
- Khoảng ngày không có buổi → 200 với `rows: []`
- **Bất biến DB:** đếm document trước/sau mỗi request, phải bằng nhau
- `PUT /api/classes/:id` với `invoiceConfig` lưu đúng và **không làm mất** `students`, `grades`, `hourlyRate`

Mục tiêu bao phủ: ≥ 80% cho file mới.

---

## 10. Rủi ro

| Mức | Rủi ro | Giảm thiểu |
|---|---|---|
| TRUNG BÌNH | `img.vietqr.io` cần internet lúc in; bên thứ ba có thể đổi/ngừng | Luôn in kèm thông tin STK dạng chữ; `onerror` ẩn ảnh, hóa đơn vẫn hợp lệ |
| TRUNG BÌNH | `normalizeClassMetadata` là whitelist — quên thêm nhánh thì cấu hình im lặng không lưu | Test tích hợp bắt buộc cho `PUT` với `invoiceConfig` |
| THẤP | SheetJS không nhúng ảnh QR | Excel ghi thông tin CK + link QR dạng text |
| THẤP | Trang in phá vỡ layout ở khổ A4 | CSS `@media print` riêng, `page-break-inside: avoid` cho hàng bảng |
| THẤP | Sai mã ngân hàng do gõ tay | Dropdown chọn từ danh sách `BANKS` cố định, không cho nhập tự do |

**Độ phức tạp: TRUNG BÌNH** — ước tính 6–8 giờ (backend 3h, frontend 2h, trang in 2h, test 1–2h).

---

## 11. Danh sách file

**Thêm mới**

- `src/utils/invoice.util.js`
- `src/controllers/invoice.controller.js`
- `views/pages/invoice-print.ejs`
- `public/js/pages/class-detail-invoice.js`
- Test tương ứng

CSS của trang in đặt **inline trong `<style>` của `invoice-print.ejs`**, không tách file riêng: trang này độc lập, cần chèn `branding.primaryColor` động, và inline tránh thêm một request chặn render lúc in.

**Sửa (chỉ thêm, không xóa)**

- `src/models/class.model.js` — thêm `invoiceConfig`
- `src/services/class.service.js` — thêm `normalizeInvoiceConfig` + nhánh trong `normalizeClassMetadata`
- `src/utils/excel.util.js` — thêm `createInvoiceWorkbook`
- `src/routes/api.routes.js` — thêm 2 route
- `src/app.js` — thêm route trang in
- `views/pages/class-detail.ejs` — thêm form cấu hình + thanh lọc/nút xuất
- `public/js/pages/class-detail-attendance.js` — `loadAttendanceHistory` nhận `from`/`to`

**Không đụng tới:** `src/models/attendance.model.js`, `src/controllers/attendance.controller.js`.
