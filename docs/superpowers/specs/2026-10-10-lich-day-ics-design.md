# Xuất lịch dạy ra file .ics (Google Calendar) — Thiết kế

Ngày: 2026-10-10

## Mục tiêu

Giảng viên tải lịch dạy cố định hằng tuần về dưới dạng file `.ics`, rồi import thủ công vào Google Calendar (hoặc Apple / Outlook Calendar).

Tiêu chí thành công:

- Bấm "Tải .ics" trên `/schedule` sẽ tải về một file hợp lệ theo RFC 5545.
- Import file vào Google Calendar cho ra sự kiện lặp hằng tuần, đúng giờ Việt Nam, đúng khoảng ngày của từng khung giờ.

## Đã chốt với người dùng

- Cách đồng bộ: tải file `.ics` một lần, giảng viên tự import. Không dùng link đăng ký, không gọi Google Calendar API.
- Mỗi khung giờ là một sự kiện lặp hằng tuần (`RRULE:FREQ=WEEKLY`), không tách thành từng buổi.
- Nút đặt trên `/schedule`, xuất theo bộ lọc:
  - "Tất cả lớp": mọi lớp chưa lưu trữ đã có lịch.
  - Đang lọc một lớp: chỉ lớp đó.

## Ràng buộc

- Chỉ đọc database, không ghi hoặc sửa dữ liệu.
- Không thêm dependency mới. File `.ics` được tạo bằng hàm thuần tự viết.
- Mọi phép tính ngày dùng offset cố định UTC+7. Kết quả không phụ thuộc múi giờ máy chủ, test chạy được dưới cả `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`.
- Test chỉ dùng mongodb-memory-server hoặc jsdom.

## Kiến trúc

### 1. `src/utils/schedule-ics.util.js` (mới, hàm thuần)

`buildIcs(classes, now)` nhận vào:

- `classes`: mảng `{ classId, name, schedule }`. Định dạng khung giờ lấy theo `class.model.js`: `weekday` 0–6 (0 là Chủ nhật), `startTime` và `endTime` dạng `'HH:mm'`, `startDate` và `endDate` kiểu `Date` (lúc 00:00 giờ VN), `location`.
- `now`: `Date`, dùng để ghi `DTSTAMP`.

Hàm trả về chuỗi `.ics`, dòng phân cách bằng CRLF. Hàm không sửa input.

Phần đầu lịch:

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//cham-soc-sv//lich-day//VI
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Lịch dạy
X-WR-TIMEZONE:Asia/Ho_Chi_Minh
BEGIN:VTIMEZONE
TZID:Asia/Ho_Chi_Minh
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:+0700
TZOFFSETTO:+0700
TZNAME:ICT
END:STANDARD
END:VTIMEZONE
...VEVENT...
END:VCALENDAR
```

Mỗi khung giờ tạo một `VEVENT`:

- **Ngày buổi đầu**: ngày đầu tiên tính từ `startDate` (theo ngày VN, `toDateKey`) có thứ trùng `weekday`.
- **Bỏ qua khung rỗng**: khung có `endDate` mà buổi đầu rơi sau `endDate` thì không xuất `VEVENT`.
- **Thời gian**: `DTSTART;TZID=Asia/Ho_Chi_Minh:YYYYMMDDTHHmm00` và `DTEND;TZID=Asia/Ho_Chi_Minh:...`, cùng ngày với buổi đầu, giờ lấy từ `startTime` và `endTime`.
- **Lặp**: `RRULE:FREQ=WEEKLY;BYDAY=<SU|MO|TU|WE|TH|FR|SA>`.
  - Có `endDate` thì thêm `;UNTIL=<UTC>`. Giá trị là 23:59:59 giờ VN của ngày `endDate`, đổi sang UTC dạng `YYYYMMDDTHHmmssZ`. RFC 5545 bắt buộc `UNTIL` ở UTC khi `DTSTART` có `TZID`.
  - Không có `endDate` thì lặp vô hạn.
- **Định danh**: `UID:<classId>-<weekday>-<HHmm>-<YYYYMMDD của startDate>@cham-soc-sv`. UID cố định theo nội dung khung, nên import lại cùng một khung thì Google nhận ra là cùng sự kiện.
- **Mốc tạo**: `DTSTAMP:<now dạng UTC YYYYMMDDTHHmmssZ>`.
- **Nội dung**:
  - `SUMMARY:<tên lớp>`; nếu tên rỗng thì dùng `classId`.
  - `LOCATION:<location>`, chỉ ghi khi không rỗng.
  - `DESCRIPTION:Mã lớp: <classId>`.

Định dạng chữ:

- **Escape** trong giá trị text: `\` thành `\\`, `;` thành `\;`, `,` thành `\,`, xuống dòng (`\r\n`, `\n`) thành `\n`.
- **Gập dòng**: dòng dài hơn 75 byte UTF-8 được gập. Mỗi đoạn tiếp theo bắt đầu bằng `CRLF` + một dấu cách. Không được cắt ngang một ký tự nhiều byte.

Thứ tự `VEVENT`: theo thứ tự lớp trong input, rồi theo thứ tự khung trong `schedule`.

Ngoài `buildIcs`, module export thêm `icsFileName(classId)`:

- Không có `classId` thì trả `'lich-day.ics'`.
- Có `classId` thì trả `'lich-day-<classId>.ics'`, trong đó mọi ký tự ngoài `[A-Za-z0-9_-]` đổi thành `_`.

### 2. Endpoint `GET /api/schedule/ics?classId=`

- Đặt trong `src/routes/api.routes.js`, middleware `authenticate, requireActiveLecturer`, giống các route lịch khác. Handler là `scheduleController.exportTeacherIcs`.
- Truy vấn: `Class.find({ userId: String(req.user._id), isArchived: { $ne: true }, 'schedule.0': { $exists: true } }, { classId: 1, name: 1, schedule: 1 }).sort({ name: 1 }).lean()`.
- Nếu query có `classId` khác rỗng (sau `trim`) thì thêm điều kiện `classId` vào truy vấn.
- Không có lớp nào, hoặc `buildIcs` không sinh được `VEVENT` nào: trả `404 { success: false, error: 'Chưa có lịch để xuất.' }`.
- Thành công:
  - `Content-Type: text/calendar; charset=utf-8`
  - `Content-Disposition: attachment; filename="<icsFileName>"`
  - Body là chuỗi `buildIcs(classes, new Date())`.
- Lỗi khác chuyển cho `next(error)`.

### 3. Giao diện `/schedule`

- `views/pages/schedule.ejs`: thêm `button#btnExportIcs` "Tải .ics" (icon `bi-calendar-plus`) cạnh nút "Thêm lịch". Thêm `title` hướng dẫn: "Tải file rồi vào Google Calendar → Cài đặt → Nhập và xuất → Nhập".
- `public/js/pages/schedule.js`, hàm `exportIcs()`:
  - Đọc `classId` từ `#scheduleClassFilter` rồi gọi `fetch('/api/schedule/ics' + (classId ? '?classId=' + encodeURIComponent(classId) : ''))`.
  - `res.ok`: đọc `blob()`, tạo object URL, cho một thẻ `<a download>` tạm thời click để tải, rồi `URL.revokeObjectURL`. Tên file lấy từ header `Content-Disposition`, không có thì dùng `lich-day.ics`.
  - Không ok: đọc JSON lỗi và gọi `uiState.showNotification(error, 'error')`.
  - Trong lúc tải, nút bị `disabled`.

## Giới hạn đã chấp nhận

- Sửa một khung giờ (đổi thứ, giờ bắt đầu hoặc ngày bắt đầu) làm UID đổi theo. Import lại thì sự kiện cũ vẫn còn trên Google, giảng viên phải tự xoá.
- Khung bị xoá trong app không tự biến mất trên Google.
- Nếu sau này cần tự cập nhật, có thể nâng lên link iCal đăng ký và tái dùng `buildIcs`.

## Test

- `src/utils/schedule-ics.util.test.js`:
  - Có header và `VTIMEZONE`, dòng phân cách CRLF.
  - Ngày buổi đầu: `startDate` rơi vào thứ Hai còn khung là thứ Tư, thì `DTSTART` là thứ Tư cùng tuần. Thêm trường hợp `startDate` trùng đúng thứ.
  - `startDate` lưu ở dạng ISO UTC (`'2026-09-06T17:00:00.000Z'`) phải được hiểu là ngày VN `2026-09-07`.
  - `UNTIL` của `endDate` `2026-12-31` (VN) phải là `20261231T165959Z`. Không có `endDate` thì không có `UNTIL`.
  - Khung rỗng bị bỏ qua.
  - Escape `,` `;` `\` và xuống dòng.
  - Dòng tiếng Việt dài được gập, mỗi dòng không quá 75 byte, ghép lại đúng chuỗi gốc.
  - `LOCATION` bị bỏ khi rỗng. `SUMMARY` dùng `classId` khi tên rỗng.
  - Không sửa input.
  - `icsFileName` đúng cả hai trường hợp.
- `src/controllers/schedule.controller.test.js` (mongodb-memory-server):
  - Chỉ trả lớp của user đang đăng nhập.
  - Bỏ lớp đã lưu trữ.
  - Lọc đúng theo `classId`.
  - Trả 404 khi không có lịch.
  - Header `Content-Type` và `Content-Disposition` đúng.
- `src/__tests__/schedule-views.test.js`: có `#btnExportIcs` kèm nhãn "Tải .ics".
- Toàn bộ test phải pass dưới cả `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`.
