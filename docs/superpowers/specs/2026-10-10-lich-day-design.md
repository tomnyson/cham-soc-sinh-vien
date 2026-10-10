# Thiết kế: Lịch dạy (lịch học cả lớp)

**Ngày:** 2026-10-10
**Trang liên quan:** trang mới `/schedule` (Lịch dạy) + tab mới "Lịch" trong modal `#attendanceModal` ở `/classes/:classId`
**Trạng thái:** Đã duyệt thiết kế, chờ review spec

---

## 1. Mục tiêu

Giảng viên xem được lịch học của các lớp mình dạy theo tuần/tháng:

- **Trang tổng `/schedule`**: lịch của tất cả lớp thuộc giảng viên đang đăng nhập.
- **Tab "Lịch" từng lớp**: xem lịch của lớp + chỉnh khung giờ cố định hằng tuần.
- Buổi đã qua được **đánh dấu** đã điểm danh / chưa điểm danh. Bấm vào buổi để **mở nhanh** form điểm danh với ngày giờ và thời lượng điền sẵn.

### Ràng buộc tuyệt đối

> **KHÔNG được xóa hoặc sửa dữ liệu đã có trong database.**

Tính năng là **additive**: thêm field `schedule` (mặc định `[]`), thêm route, thêm file. Endpoint ghi chỉ `$set` đúng field `schedule`. Test chỉ chạy trên `mongodb-memory-server` — không ghi vào DB Atlas trong `.env`.

---

## 2. Quyết định đã chốt

| Câu hỏi | Quyết định |
|---|---|
| Phạm vi | **Cả hai** — trang tổng `/schedule` + tab "Lịch" từng lớp |
| Vị trí tab từng lớp | Trong modal "Điểm danh & Học phí" (trang lớp không có tab chính) |
| Nguồn lịch | **Chỉ lịch cố định hằng tuần.** Không sửa/huỷ/dời từng buổi |
| Liên kết điểm danh | **Có** — đánh dấu buổi đã qua + bấm để mở nhanh form điểm danh |
| Cách vẽ lịch | **Tự vẽ tuần/tháng** bằng JS thuần + Bootstrap. Không dùng FullCalendar |
| Nhiều khung giờ / lớp | Có, mỗi khung có `startDate`/`endDate` riêng (`endDate = null` = không giới hạn) |
| Múi giờ | Cố định **UTC+7** (giờ Việt Nam) |
| "Đã điểm danh" | Lớp có `AttendanceSession` **cùng ngày** (theo giờ VN) với buổi |
| Quyền xem | Mỗi giảng viên chỉ thấy lớp của mình (lọc theo `userId`) |
| Tuần bắt đầu | **Thứ Hai** |

---

## 3. Hiện trạng codebase

| Thành phần | Vị trí | Ghi chú |
|---|---|---|
| Model lớp | `src/models/class.model.js` | `userId: String` (index), `isArchived`, `students[]`, `hourlyRate`, `invoiceConfig` |
| Model buổi học | `src/models/attendance.model.js` | `classId` (index), `date`, `durationHours` (min 0.1), `records[]` |
| Kiểm tra quyền | `classService.getClassById(classId, userId)` | Ném `'Class not found'` → controller trả 404 (mẫu `findOwnedClass` trong `payment.controller.js`) |
| Cập nhật lớp chung | `class.service.js` → `normalizeClassMetadata()` | **Whitelist** — không đi qua đường này; dùng endpoint riêng |
| Route API | `src/routes/api.routes.js` | Mẫu `authenticate, requireActiveLecturer, asyncHandler(...)` |
| Route trang | `src/app.js` | `res.render('layouts/master', …)` |
| Sidebar | `views/partials/sidebar.ejs` | `<a href="/x" data-route="/x" class="nav-item <%= activeClass(currentRoute, '/x') %>">` |
| Modal điểm danh | `views/pages/class-detail.ejs` | Tab pills: `tab-take-attendance`, `tab-attendance-history`, `tab-attendance-payment`, `tab-attendance-config`; input `#attDate` (datetime-local), `#attDuration` |
| JS modal | `public/js/pages/class-detail-attendance.js`, `class-detail-payment.js` | ES module, `uiState.showNotification`, dữ liệu người dùng qua `textContent` |

---

## 4. Model dữ liệu

Thêm sub-schema vào `src/models/class.model.js`:

```js
const scheduleSlotSchema = new mongoose.Schema({
    weekday:   { type: Number, required: true, min: 0, max: 6 },   // 0 = Chủ nhật … 6 = Thứ bảy
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ }, // 'HH:mm'
    endTime:   { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    startDate: { type: Date, required: true },                     // 00:00 giờ VN của ngày bắt đầu
    endDate:   { type: Date, default: null },                      // null = không giới hạn
    location:  { type: String, default: '', trim: true, maxlength: 100 }
}, { _id: false });

// trong classSchema
schedule: { type: [scheduleSlotSchema], default: [] }
```

Quy tắc (kiểm ở util, model chỉ là lưới an toàn):

- Tối đa **14** khung giờ / lớp.
- `endTime > startTime` (không cho buổi qua nửa đêm).
- `endDate ≥ startDate` khi có `endDate`.
- Ngày nhập dạng `'YYYY-MM-DD'`, lưu thành thời điểm `YYYY-MM-DDT00:00:00+07:00`.

Lớp cũ không có field → mặc định `[]`, **không cần migration**.

---

## 5. Logic thuần — `src/utils/schedule.util.js`

Không phụ thuộc DB, test được bằng unit test.

### 5.1 `parseScheduleInput(body) → { value, error }`

- `body.schedule` phải là mảng, ≤ 14 phần tử.
- Kiểm từng khung theo quy tắc mục 4. Lỗi trả **một** thông điệp tiếng Việt, có số thứ tự dòng, ví dụ: `'Khung giờ 2: giờ kết thúc phải sau giờ bắt đầu.'`
- `value` là mảng mới đã chuẩn hoá (trim `location`, đổi ngày sang `Date`). Không sửa `body`.

### 5.2 `parseRange(from, to, now) → { value: {from, to}, error }`

- `from`, `to` dạng `'YYYY-MM-DD'` (ngày VN), **bao gồm cả hai đầu**.
- Thiếu cả hai → tuần hiện tại (Thứ Hai – Chủ nhật, giờ VN) theo `now`.
- Sai định dạng, `to < from`, hoặc khoảng > **62 ngày** → `error`.

### 5.3 `expandOccurrences(classData, range) → Occurrence[]`

Duyệt từng ngày VN trong `range`. Với mỗi khung có `weekday` khớp và ngày nằm trong `[startDate, endDate]` (so theo khoá ngày VN `'YYYY-MM-DD'`), sinh:

```js
{
  classId, className,
  start,          // Date: ngày VN + startTime, quy về UTC (trừ 7 giờ)
  end,            // Date: ngày VN + endTime
  durationHours,  // (end - start) / 1h, làm tròn 2 chữ số
  location,
  dateKey         // 'YYYY-MM-DD' theo giờ VN
}
```

Kết quả sắp theo `start` tăng dần. Không dùng múi giờ của máy chủ: mọi phép tính ngày dùng offset cố định +7.

### 5.4 `markAttendance(occurrences, sessions, now) → Occurrence[]`

Trả mảng **mới**, mỗi phần tử thêm `status` và `attendanceSessionId`:

- Gom theo `(classId, dateKey)`. Trong mỗi nhóm, sắp buổi lịch và `AttendanceSession` theo giờ rồi **ghép lần lượt**; mỗi session chỉ ghép một buổi.
- Được ghép → `status: 'done'`, `attendanceSessionId = session._id`.
- Không ghép, `end < now` → `'missed'`.
- Còn lại → `'upcoming'`.
- Session không khớp buổi lịch nào (buổi học bù, ngoài lịch) **không hiển thị** trên lịch.

---

## 6. API

Tất cả qua `authenticate, requireActiveLecturer, asyncHandler(...)`. Envelope `{ success, data, error }`. Controller mới: `src/controllers/schedule.controller.js`.

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/api/classes/:classId/schedule?from&to` | Kiểm quyền qua `getClassById`. Trả `{ schedule, occurrences }` (occurrences đã `markAttendance`) |
| `PUT` | `/api/classes/:classId/schedule` | Body `{ schedule: [...] }`, **thay toàn bộ** mảng. Kiểm quyền → `parseScheduleInput` → `Class.updateOne({ classId, userId }, { $set: { schedule } })`. Trả `{ schedule }` |
| `GET` | `/api/schedule?from&to` | Lịch mọi lớp của giảng viên. Trả `{ classes: [{classId, name}], occurrences }` |

`GET /api/schedule` dùng đúng **2 query**:

1. `Class.find({ userId: String(req.user._id), isArchived: { $ne: true }, 'schedule.0': { $exists: true } }, { classId: 1, name: 1, schedule: 1 })`
2. `AttendanceSession.find({ classId: { $in: ids }, date: { $gte: from, $lt: toExclusive } }, { classId: 1, date: 1 })`

Endpoint từng lớp cũng chỉ lấy session trong khoảng ngày (projection `classId, date`).

---

## 7. Giao diện

### 7.1 Module dùng chung — `public/js/modules/scheduleCalendar.js`

- `renderWeek(container, occurrences, opts)` và `renderMonth(container, occurrences, opts)`.
- `opts`: `{ anchorDate, onSelect(occurrence), showClassName }`.
- **Tuần**: 7 cột ngày (Thứ Hai → Chủ nhật), các buổi xếp chồng theo giờ trong cột (không vẽ trục thời gian theo pixel).
- **Tháng**: lưới 6 × 7; mỗi ô tối đa **3** chip, quá thì hiện `+n` (bấm → chuyển sang tuần chứa ngày đó).
- **Thanh công cụ**: `‹  Hôm nay  ›`, nút chuyển `Tuần | Tháng`, nhãn khoảng ngày (ví dụ `06/10 – 12/10/2026`).
- **Màu lớp**: bảng 8 màu, chọn theo hash `classId`, khai báo token CSS (`--sched-color-0` … `--sched-color-7`) trong `public/css/schedule-calendar.css`.
- **Trạng thái**:
  - `done` — dấu ✓ xanh lá.
  - `missed` — viền đỏ + nhãn "Chưa điểm danh".
  - `upcoming` — hiển thị thường.
- **< 768px**: chế độ tuần chuyển thành danh sách nhóm theo ngày.
- Tên lớp, địa điểm: luôn `textContent`.
- Mỗi buổi là `<button>` có `aria-label` (ví dụ `"SOF308, Thứ Hai 06/10, 18:00–20:00, chưa điểm danh"`), dùng được bằng bàn phím.

### 7.2 Trang `/schedule` — "Lịch dạy"

- Route trang mới trong `src/app.js`, view `views/pages/schedule.ejs`, script `public/js/pages/schedule.js`.
- Link "Lịch dạy" trong `views/partials/sidebar.ejs` theo mẫu `activeClass`.
- Bộ lọc lớp (select "Tất cả lớp" + từng lớp), lọc phía client.
- Không có lớp nào có lịch → trạng thái trống: "Chưa có lớp nào có lịch. Vào trang lớp → Điểm danh & Học phí → Lịch để thêm khung giờ."
- Bấm buổi → `/classes/:classId?attend=<ISO start>&hours=<durationHours>`.

### 7.3 Tab "Lịch" trong modal điểm danh

- Thêm pill `tab-attendance-schedule` vào `views/pages/class-detail.ejs`; script mới `public/js/pages/class-detail-schedule.js`.
- Tải dữ liệu khi `shown.bs.tab` (giống tab Thu tiền).
- **Trên**: lịch của lớp (module 7.1, không hiện tên lớp).
- **Dưới**: trình sửa khung giờ. Mỗi dòng: Thứ · Giờ bắt đầu · Giờ kết thúc · Từ ngày · Đến ngày · Địa điểm · Xoá. Nút **"+ Thêm khung giờ"** và **"Lưu lịch"**. Lỗi hiện ngay dưới form.
- Lưu thành công → `showNotification` + vẽ lại lịch.
- **Bấm buổi**:
  - `missed` / `upcoming` → chuyển sang tab "Điểm danh mới", điền `#attDate` (giờ bắt đầu, dạng datetime-local) và `#attDuration`.
  - `done` → mở tab "Lịch sử".

### 7.4 Mở nhanh từ trang tổng

`class-detail` đọc `?attend=` khi tải trang:

- `attend` là ISO hợp lệ → mở `#attendanceModal`, tab "Điểm danh mới", điền `#attDate`.
- `hours` là số trong `[0.1, 24]` → điền `#attDuration`; sai thì bỏ qua.
- Sau đó gọi `history.replaceState` xoá query để F5 không mở lại.

---

## 8. Xử lý lỗi

| Tình huống | Hành vi |
|---|---|
| Dữ liệu khung giờ sai | `400` + thông điệp tiếng Việt từ `parseScheduleInput`; UI hiện dưới form, không xoá dòng đang nhập |
| Lớp không tồn tại / thuộc người khác | `404` `'Không tìm thấy lớp học'` |
| `from`/`to` sai hoặc > 62 ngày | `400` `'Khoảng ngày không hợp lệ (tối đa 62 ngày).'` |
| Lỗi tải lịch (mạng/5xx) | Khung lịch hiện "Lỗi tải lịch." + nút "Thử lại"; các tab khác của modal vẫn dùng được |
| `?attend` / `hours` sai | Bỏ qua im lặng, trang mở bình thường |
| Lớp có `schedule` rỗng | Bị bỏ khỏi trang tổng; tab "Lịch" hiện lịch trống + trình sửa |
| Lỗi không lường trước | `next(error)` về error handler chung |

---

## 9. Kiểm thử

Không ghi vào DB Atlas. Backend dùng `mongodb-memory-server`, frontend dùng `jsdom`.

**Unit — `src/utils/schedule.util.test.js`**

- `parseScheduleInput`: hợp lệ; thiếu field; `weekday` ngoài 0–6; giờ sai định dạng; `endTime ≤ startTime`; `endDate < startDate`; > 14 khung; `location` > 100 ký tự; không sửa input.
- `parseRange`: mặc định tuần hiện tại (kể cả khi `now` là Chủ nhật); sai định dạng; `to < from`; 62 ngày OK, 63 ngày lỗi.
- `expandOccurrences`: một tuần; một tháng; ranh giới `startDate`/`endDate`; `endDate = null`; nhiều khung cùng ngày; ranh giới ngày UTC+7 (buổi 06:00 VN = 23:00 UTC hôm trước vẫn thuộc đúng ngày VN).
- `markAttendance`: `done` / `missed` / `upcoming`; hai buổi cùng ngày chỉ một session → buổi sớm `done`, buổi sau theo `now`; session ngoài lịch bị bỏ qua; không sửa input.

**Controller — `src/controllers/schedule.controller.test.js`**

- GET từng lớp: trả occurrences đã đánh dấu; lớp người khác → 404; khoảng ngày sai → 400.
- PUT: lưu hợp lệ; dữ liệu sai → 400 và DB không đổi; lớp người khác → 404; các field khác của lớp (students, hourlyRate, invoiceConfig) **giữ nguyên**.
- GET tổng: chỉ lớp của `userId` hiện tại; bỏ lớp `isArchived` và lớp lịch rỗng.

**Frontend — jsdom harness**

- `scheduleCalendar`: số cột/ô đúng; `+n` khi > 3 buổi/ngày; class trạng thái; tên lớp chứa `<script>` hiện dạng chữ.
- Trình sửa khung giờ: thêm/xoá dòng; đọc form thành payload đúng.
- Đọc `?attend` / `hours`: hợp lệ thì điền đúng; sai thì bỏ qua.

---

## 10. Ngoài phạm vi

- Sửa, huỷ, dời hoặc thêm buổi lẻ (ngoại lệ lịch).
- Buổi qua nửa đêm.
- Đồng bộ Google Calendar / xuất iCal.
- Nhắc lịch, thông báo.
- Phát hiện trùng giờ giữa các lớp.

---

## 11. File chạm tới

| File | Thay đổi |
|---|---|
| `src/models/class.model.js` | Thêm `scheduleSlotSchema` + field `schedule` |
| `src/utils/schedule.util.js` (+ test) | Mới |
| `src/controllers/schedule.controller.js` (+ test) | Mới |
| `src/routes/api.routes.js` | Thêm 3 route |
| `src/app.js` | Thêm route trang `/schedule` |
| `views/pages/schedule.ejs` | Mới |
| `views/partials/sidebar.ejs` | Thêm link "Lịch dạy" |
| `views/pages/class-detail.ejs` | Thêm pill + pane "Lịch", nạp script |
| `public/js/modules/scheduleCalendar.js` | Mới |
| `public/js/pages/schedule.js` | Mới |
| `public/js/pages/class-detail-schedule.js` | Mới |
| `public/css/schedule-calendar.css` | Mới |
