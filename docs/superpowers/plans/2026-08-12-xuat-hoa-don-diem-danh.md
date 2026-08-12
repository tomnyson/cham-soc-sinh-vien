# Xuất hóa đơn từ điểm danh & học phí — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép giảng viên xuất bảng kê học phí cả lớp (PDF in qua trình duyệt + Excel) từ các buổi đã điểm danh, lọc theo khoảng ngày, kèm mã QR chuyển khoản VietQR.

**Architecture:** Toàn bộ tính năng là additive. Logic tính toán nằm trong một util thuần hàm (`src/utils/invoice.util.js`) không phụ thuộc Mongoose/Express nên test được bằng unit test thuần. Controller mới chỉ đọc `AttendanceSession` và render/serialize. Cấu hình hóa đơn lưu thành sub-document `invoiceConfig` trên model `Class` sẵn có, đi qua endpoint `PUT /api/classes/:classId` đã tồn tại.

**Tech Stack:** Node 18+, Express 4, Mongoose 8, EJS, SheetJS (`xlsx` 0.18), Jest 29, mongodb-memory-server 9. Frontend là ES module thuần + Bootstrap 5 (không framework).

**Spec:** `docs/superpowers/specs/2026-08-12-xuat-hoa-don-diem-danh-design.md`

## Global Constraints

- **TUYỆT ĐỐI KHÔNG XÓA HOẶC SỬA DỮ LIỆU DB.** Với `attendancesessions` chỉ được dùng `find()`. Với `classes` chỉ được `$set` field mới `invoiceConfig` qua `classService.updateClass` sẵn có.
- **Cấm** hoàn toàn: `deleteOne`, `deleteMany`, `remove`, `drop`, `replaceOne`, `findOneAndReplace`, `bulkWrite`, `updateMany` trong phạm vi tính năng này.
- **Cấm** viết migration script dưới mọi hình thức.
- **Cấm** thêm bất kỳ route HTTP `DELETE` nào.
- Không sửa `src/models/attendance.model.js` và `src/controllers/attendance.controller.js`.
- Khi sửa file có sẵn: **chỉ thêm**, không đổi tên / đổi kiểu / xóa field, hàm, export hiện có.
- Mọi text hiển thị cho người dùng viết bằng **tiếng Việt**.
- Style code theo file xung quanh: `src/**` dùng 4 space ở model/controller/service, 2 space ở `utils` — bám theo từng file đang sửa.
- Tiền tệ luôn format `Intl.NumberFormat('vi-VN')` + hậu tố ` đ`.
- Repo hiện **chưa có test file nào**. Đừng chạy `npm run test:coverage` (ngưỡng global 80% sẽ fail vì phần lớn codebase chưa có test). Chỉ chạy jest theo đường dẫn file cụ thể.
- Test đặt cạnh source theo pattern jest sẵn có: `src/**/*.test.js`.

---

### Task 1: Đọc số tiền thành chữ tiếng Việt

**Files:**
- Create: `src/utils/invoice.util.js`
- Test: `src/utils/invoice.util.test.js`

**Interfaces:**
- Consumes: (không có)
- Produces: `numberToVietnameseWords(amount: number): string` — trả chuỗi đã viết hoa chữ đầu, kết thúc bằng `" đồng chẵn"` (hoặc `"Không đồng"` khi bằng 0).

- [x] **Step 1: Viết test thất bại**

Tạo `src/utils/invoice.util.test.js`:

```js
const { numberToVietnameseWords } = require('./invoice.util');

describe('numberToVietnameseWords', () => {
  it('đọc số 0', () => {
    expect(numberToVietnameseWords(0)).toBe('Không đồng');
  });

  it('đọc số hàng trăm', () => {
    expect(numberToVietnameseWords(105)).toBe('Một trăm linh năm đồng chẵn');
  });

  it('đọc số hàng nghìn tròn', () => {
    expect(numberToVietnameseWords(400000)).toBe('Bốn trăm nghìn đồng chẵn');
  });

  it('đọc số hàng triệu tròn', () => {
    expect(numberToVietnameseWords(6000000)).toBe('Sáu triệu đồng chẵn');
  });

  it('đọc "mốt" khi hàng đơn vị là 1 và hàng chục >= 2', () => {
    expect(numberToVietnameseWords(21000000)).toBe('Hai mươi mốt triệu đồng chẵn');
  });

  it('đọc "lăm" khi hàng đơn vị là 5 và có hàng chục', () => {
    expect(numberToVietnameseWords(15)).toBe('Mười lăm đồng chẵn');
  });

  it('đọc "tư" khi hàng đơn vị là 4 và hàng chục >= 2', () => {
    expect(numberToVietnameseWords(24)).toBe('Hai mươi tư đồng chẵn');
  });

  it('chèn "không trăm" cho nhóm giữa', () => {
    expect(numberToVietnameseWords(1015000)).toBe(
      'Một triệu không trăm mười lăm nghìn đồng chẵn'
    );
  });

  it('đọc số hàng tỷ', () => {
    expect(numberToVietnameseWords(2000000000)).toBe('Hai tỷ đồng chẵn');
  });

  it('làm tròn số thập phân và xử lý đầu vào không hợp lệ', () => {
    expect(numberToVietnameseWords(1000.6)).toBe('Một nghìn đồng chẵn');
    expect(numberToVietnameseWords(NaN)).toBe('Không đồng');
    expect(numberToVietnameseWords(-5)).toBe('Không đồng');
    expect(numberToVietnameseWords(undefined)).toBe('Không đồng');
  });
});
```

- [x] **Step 2: Chạy test để xác nhận nó fail**

Run: `npx jest src/utils/invoice.util.test.js`
Expected: FAIL — `Cannot find module './invoice.util'`

- [x] **Step 3: Viết implementation tối thiểu**

Tạo `src/utils/invoice.util.js`:

```js
const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const SCALES = ['', ' nghìn', ' triệu', ' tỷ'];

/**
 * Đọc một nhóm 3 chữ số thành chữ.
 * @param {number} value - giá trị 0..999
 * @param {boolean} isLeadingGroup - true nếu đây là nhóm có nghĩa đầu tiên (bỏ "không trăm")
 * @returns {string}
 */
function readTriple(value, isLeadingGroup) {
  const hundred = Math.floor(value / 100);
  const ten = Math.floor((value % 100) / 10);
  const unit = value % 10;
  const parts = [];

  if (hundred > 0 || !isLeadingGroup) {
    parts.push(`${DIGITS[hundred]} trăm`);
  }

  if (ten === 0) {
    if (unit > 0) {
      if (hundred > 0 || !isLeadingGroup) parts.push('linh');
      parts.push(DIGITS[unit]);
    }
  } else if (ten === 1) {
    parts.push('mười');
    if (unit === 5) parts.push('lăm');
    else if (unit > 0) parts.push(DIGITS[unit]);
  } else {
    parts.push(`${DIGITS[ten]} mươi`);
    if (unit === 1) parts.push('mốt');
    else if (unit === 4) parts.push('tư');
    else if (unit === 5) parts.push('lăm');
    else if (unit > 0) parts.push(DIGITS[unit]);
  }

  return parts.join(' ');
}

/**
 * Đọc số tiền VNĐ thành chữ tiếng Việt.
 * @param {number} amount
 * @returns {string} VD: "Sáu triệu đồng chẵn"
 */
function numberToVietnameseWords(amount) {
  const value = Math.floor(Number(amount));
  if (!Number.isFinite(value) || value <= 0) return 'Không đồng';

  // Tách thành các nhóm 3 chữ số, nhóm 0 là hàng đơn vị
  const groups = [];
  let remaining = value;
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const highestIndex = groups.length - 1;
  const chunks = [];

  for (let i = highestIndex; i >= 0; i -= 1) {
    if (groups[i] === 0) continue;
    const text = readTriple(groups[i], i === highestIndex);
    chunks.push(`${text}${SCALES[i] || ''}`);
  }

  const sentence = chunks.join(' ').replace(/\s+/g, ' ').trim();
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)} đồng chẵn`;
}

module.exports = {
  numberToVietnameseWords,
};
```

- [x] **Step 4: Chạy test để xác nhận pass**

Run: `npx jest src/utils/invoice.util.test.js`
Expected: PASS — 10 test

- [x] **Step 5: Commit**

```bash
git add src/utils/invoice.util.js src/utils/invoice.util.test.js
git commit -m "feat: doc so tien thanh chu tieng Viet cho hoa don"
```

---

### Task 2: Danh sách ngân hàng, URL VietQR và số hóa đơn

**Files:**
- Modify: `src/utils/invoice.util.js` (thêm hàm, giữ nguyên phần Task 1)
- Test: `src/utils/invoice.util.test.js` (thêm describe block)

**Interfaces:**
- Consumes: (không có)
- Produces:
  - `BANKS: Array<{ bin: string, shortName: string, name: string }>` — hằng, dùng cho dropdown frontend
  - `buildVietQrUrl({ bankCode, bankAccount, bankAccountName, amount, addInfo }): string | null`
  - `generateInvoiceNo(classId: string, from: Date|null, to: Date|null): string`

- [x] **Step 1: Viết test thất bại**

Thêm vào cuối `src/utils/invoice.util.test.js`:

```js
const { BANKS, buildVietQrUrl, generateInvoiceNo } = require('./invoice.util');

describe('BANKS', () => {
  it('chứa các ngân hàng lớn với BIN đúng', () => {
    const byShortName = Object.fromEntries(BANKS.map(b => [b.shortName, b.bin]));
    expect(byShortName.Vietcombank).toBe('970436');
    expect(byShortName.Techcombank).toBe('970407');
    expect(byShortName.MBBank).toBe('970422');
    expect(BANKS.length).toBeGreaterThanOrEqual(15);
  });

  it('mọi BIN đều là 6 chữ số và không trùng nhau', () => {
    const bins = BANKS.map(b => b.bin);
    bins.forEach(bin => expect(bin).toMatch(/^\d{6}$/));
    expect(new Set(bins).size).toBe(bins.length);
  });
});

describe('buildVietQrUrl', () => {
  it('trả null khi thiếu mã ngân hàng', () => {
    expect(buildVietQrUrl({ bankAccount: '123456', amount: 1000 })).toBeNull();
  });

  it('trả null khi thiếu số tài khoản', () => {
    expect(buildVietQrUrl({ bankCode: '970436', amount: 1000 })).toBeNull();
  });

  it('dựng URL đúng định dạng VietQR', () => {
    const url = buildVietQrUrl({
      bankCode: '970436',
      bankAccount: '0011001234567',
      bankAccountName: 'NGUYEN VAN A',
      amount: 6000000,
      addInfo: 'HD-848247-202608'
    });
    expect(url).toContain('https://img.vietqr.io/image/970436-0011001234567-compact2.png');
    expect(url).toContain('amount=6000000');
    expect(url).toContain('addInfo=HD-848247-202608');
    expect(url).toContain('accountName=NGUYEN%20VAN%20A');
  });

  it('encode nội dung có dấu tiếng Việt', () => {
    const url = buildVietQrUrl({
      bankCode: '970436',
      bankAccount: '123',
      addInfo: 'Học phí tháng 8'
    });
    expect(url).toContain('addInfo=H%E1%BB%8Dc%20ph%C3%AD%20th%C3%A1ng%208');
  });

  it('bỏ qua amount khi không hợp lệ hoặc bằng 0', () => {
    const url = buildVietQrUrl({ bankCode: '970436', bankAccount: '123', amount: 0 });
    expect(url).not.toContain('amount=');
  });
});

describe('generateInvoiceNo', () => {
  it('dựng số hóa đơn từ classId và khoảng ngày', () => {
    const from = new Date('2026-07-01T00:00:00Z');
    const to = new Date('2026-08-10T00:00:00Z');
    expect(generateInvoiceNo('class_1782608848247', from, to)).toBe('HD-848247-202607-202608');
  });

  it('dùng ALL khi thiếu đầu khoảng ngày', () => {
    const to = new Date('2026-08-10T00:00:00Z');
    expect(generateInvoiceNo('class_1782608848247', null, to)).toBe('HD-848247-ALL-202608');
    expect(generateInvoiceNo('class_1782608848247', null, null)).toBe('HD-848247-ALL-ALL');
  });

  it('tất định — cùng đầu vào cho cùng kết quả', () => {
    const from = new Date('2026-07-01T00:00:00Z');
    expect(generateInvoiceNo('abc', from, null)).toBe(generateInvoiceNo('abc', from, null));
  });

  it('xử lý classId ngắn hơn 6 ký tự', () => {
    expect(generateInvoiceNo('ab', null, null)).toBe('HD-AB-ALL-ALL');
  });
});
```

- [x] **Step 2: Chạy test để xác nhận fail**

Run: `npx jest src/utils/invoice.util.test.js`
Expected: FAIL — `BANKS is not defined` / `buildVietQrUrl is not a function`

- [x] **Step 3: Viết implementation**

Thêm vào `src/utils/invoice.util.js` (trước `module.exports`):

```js
/**
 * Danh sách ngân hàng hỗ trợ VietQR (BIN theo chuẩn NAPAS).
 */
const BANKS = [
  { bin: '970436', shortName: 'Vietcombank', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam' },
  { bin: '970415', shortName: 'VietinBank', name: 'Ngân hàng TMCP Công Thương Việt Nam' },
  { bin: '970418', shortName: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
  { bin: '970405', shortName: 'Agribank', name: 'Ngân hàng NN&PTNT Việt Nam' },
  { bin: '970422', shortName: 'MBBank', name: 'Ngân hàng TMCP Quân đội' },
  { bin: '970407', shortName: 'Techcombank', name: 'Ngân hàng TMCP Kỹ Thương Việt Nam' },
  { bin: '970416', shortName: 'ACB', name: 'Ngân hàng TMCP Á Châu' },
  { bin: '970432', shortName: 'VPBank', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' },
  { bin: '970423', shortName: 'TPBank', name: 'Ngân hàng TMCP Tiên Phong' },
  { bin: '970403', shortName: 'Sacombank', name: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
  { bin: '970443', shortName: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội' },
  { bin: '970426', shortName: 'MSB', name: 'Ngân hàng TMCP Hàng Hải' },
  { bin: '970441', shortName: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam' },
  { bin: '970437', shortName: 'HDBank', name: 'Ngân hàng TMCP Phát triển TP.HCM' },
  { bin: '970431', shortName: 'Eximbank', name: 'Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam' },
  { bin: '970448', shortName: 'OCB', name: 'Ngân hàng TMCP Phương Đông' },
  { bin: '970440', shortName: 'SeABank', name: 'Ngân hàng TMCP Đông Nam Á' },
  { bin: '970449', shortName: 'LPBank', name: 'Ngân hàng TMCP Lộc Phát Việt Nam' },
  { bin: '970425', shortName: 'ABBANK', name: 'Ngân hàng TMCP An Bình' },
  { bin: '970429', shortName: 'SCB', name: 'Ngân hàng TMCP Sài Gòn' },
  { bin: '970454', shortName: 'BVBank', name: 'Ngân hàng TMCP Bản Việt' },
  { bin: '970409', shortName: 'BacABank', name: 'Ngân hàng TMCP Bắc Á' }
];

/**
 * Dựng URL ảnh QR chuyển khoản VietQR.
 * Trả null nếu chưa cấu hình đủ ngân hàng + số tài khoản.
 * @returns {string|null}
 */
function buildVietQrUrl({ bankCode, bankAccount, bankAccountName, amount, addInfo } = {}) {
  const bank = String(bankCode || '').trim();
  const account = String(bankAccount || '').trim();
  if (!bank || !account) return null;

  const params = [];
  const numericAmount = Math.floor(Number(amount));
  if (Number.isFinite(numericAmount) && numericAmount > 0) {
    params.push(`amount=${numericAmount}`);
  }
  if (addInfo) {
    params.push(`addInfo=${encodeURIComponent(String(addInfo))}`);
  }
  if (bankAccountName) {
    params.push(`accountName=${encodeURIComponent(String(bankAccountName))}`);
  }

  const query = params.length ? `?${params.join('&')}` : '';
  return `https://img.vietqr.io/image/${bank}-${account}-compact2.png${query}`;
}

/**
 * Định dạng Date thành YYYYMM, trả 'ALL' nếu không có ngày.
 */
function toPeriodKey(date) {
  if (!date) return 'ALL';
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'ALL';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

/**
 * Sinh số hóa đơn tất định — cùng tham số luôn cho cùng kết quả, không cần lưu DB.
 * @returns {string} VD: HD-848247-202607-202608
 */
function generateInvoiceNo(classId, from, to) {
  const suffix = String(classId || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-6)
    .toUpperCase() || 'UNKNOWN';
  return `HD-${suffix}-${toPeriodKey(from)}-${toPeriodKey(to)}`;
}
```

Cập nhật `module.exports`:

```js
module.exports = {
  numberToVietnameseWords,
  BANKS,
  buildVietQrUrl,
  generateInvoiceNo,
};
```

> Lưu ý `generateInvoiceNo` dùng `getFullYear()`/`getMonth()` theo giờ máy chủ — nhất quán với cách hiển thị ngày `toLocaleString('vi-VN')` ở phần còn lại của app.

- [x] **Step 4: Chạy test để xác nhận pass**

Run: `npx jest src/utils/invoice.util.test.js`
Expected: PASS — toàn bộ test của Task 1 và Task 2

- [x] **Step 5: Commit**

```bash
git add src/utils/invoice.util.js src/utils/invoice.util.test.js
git commit -m "feat: danh sach ngan hang VietQR, dung URL QR va so hoa don"
```

---

### Task 3: Lọc buổi học theo khoảng ngày và dựng dữ liệu hóa đơn

**Files:**
- Modify: `src/utils/invoice.util.js`
- Test: `src/utils/invoice.util.test.js`

**Interfaces:**
- Consumes: `numberToVietnameseWords`, `buildVietQrUrl`, `generateInvoiceNo` (Task 1, 2)
- Produces:
  - `parseDateRange(fromRaw, toRaw): { from: Date|null, to: Date|null }` — `to` được đẩy tới 23:59:59.999
  - `filterSessionsByRange(sessions, from, to): Array` — thuần lọc, không mutate
  - `buildInvoiceData({ classData, sessions, from, to, branding }): object` — cấu trúc đầy đủ để render

- [x] **Step 1: Viết test thất bại**

Thêm vào `src/utils/invoice.util.test.js`:

```js
const { parseDateRange, filterSessionsByRange, buildInvoiceData } = require('./invoice.util');

const makeSession = (dateIso, overrides = {}) => ({
  date: new Date(dateIso),
  durationHours: 2,
  hourlyRate: 200000,
  totalCost: 400000,
  records: [
    { mssv: 'SV01', status: 'present' },
    { mssv: 'SV02', status: 'absent' }
  ],
  ...overrides
});

describe('parseDateRange', () => {
  it('trả null cho cả hai khi đầu vào rỗng', () => {
    expect(parseDateRange('', '')).toEqual({ from: null, to: null });
    expect(parseDateRange(undefined, undefined)).toEqual({ from: null, to: null });
  });

  it('đẩy "to" tới cuối ngày', () => {
    const { to } = parseDateRange('', '2026-08-10');
    expect(to.getHours()).toBe(23);
    expect(to.getMinutes()).toBe(59);
    expect(to.getSeconds()).toBe(59);
    expect(to.getMilliseconds()).toBe(999);
  });

  it('đặt "from" về đầu ngày', () => {
    const { from } = parseDateRange('2026-07-01', '');
    expect(from.getHours()).toBe(0);
    expect(from.getMinutes()).toBe(0);
  });

  it('bỏ qua ngày không hợp lệ', () => {
    expect(parseDateRange('khong-phai-ngay', 'abc')).toEqual({ from: null, to: null });
  });
});

describe('filterSessionsByRange', () => {
  const sessions = [
    makeSession('2026-07-01T10:00:00'),
    makeSession('2026-07-15T10:00:00'),
    makeSession('2026-08-10T11:36:00')
  ];

  it('trả toàn bộ khi không có khoảng lọc', () => {
    expect(filterSessionsByRange(sessions, null, null)).toHaveLength(3);
  });

  it('lọc theo cận dưới', () => {
    const { from } = parseDateRange('2026-07-15', '');
    expect(filterSessionsByRange(sessions, from, null)).toHaveLength(2);
  });

  it('lọc theo cận trên, bao gồm cả buổi trong ngày cuối', () => {
    const { to } = parseDateRange('', '2026-08-10');
    expect(filterSessionsByRange(sessions, null, to)).toHaveLength(3);
  });

  it('lọc theo cả hai cận', () => {
    const { from, to } = parseDateRange('2026-07-10', '2026-07-20');
    expect(filterSessionsByRange(sessions, from, to)).toHaveLength(1);
  });

  it('trả mảng rỗng khi không buổi nào khớp', () => {
    const { from, to } = parseDateRange('2026-01-01', '2026-01-31');
    expect(filterSessionsByRange(sessions, from, to)).toEqual([]);
  });

  it('không mutate mảng đầu vào', () => {
    const original = [...sessions];
    filterSessionsByRange(sessions, null, null);
    expect(sessions).toEqual(original);
  });
});

describe('buildInvoiceData', () => {
  const classData = {
    classId: 'class_1782608848247',
    name: 'SOF308',
    semester: 'fall',
    year: 2026,
    block: 1,
    instructorCode: 'HungNX',
    students: [{ mssv: 'SV01' }, { mssv: 'SV02' }],
    invoiceConfig: {
      centerName: 'Trung tâm ABC',
      payerName: 'Phụ huynh Nguyễn Văn A',
      bankCode: '970436',
      bankAccount: '0011001234567',
      bankAccountName: 'NGUYEN VAN A'
    }
  };
  const branding = { logoDataUrl: '', subtext: 'FPT Polytechnic', primaryColor: '#FF6C00' };

  it('cộng đúng tổng số buổi, tổng giờ và tổng tiền', () => {
    const sessions = [makeSession('2026-08-01T10:00:00'), makeSession('2026-08-10T10:00:00')];
    const result = buildInvoiceData({ classData, sessions, from: null, to: null, branding });
    expect(result.totals.sessionCount).toBe(2);
    expect(result.totals.totalHours).toBe(4);
    expect(result.totals.totalAmount).toBe(800000);
    expect(result.amountInWords).toBe('Tám trăm nghìn đồng chẵn');
  });

  it('giữ nguyên hourlyRate snapshot của từng buổi', () => {
    const sessions = [
      makeSession('2026-08-01T10:00:00', { hourlyRate: 200000, totalCost: 400000 }),
      makeSession('2026-08-10T10:00:00', { hourlyRate: 300000, totalCost: 600000 })
    ];
    const result = buildInvoiceData({ classData, sessions, from: null, to: null, branding });
    expect(result.rows[0].hourlyRate).toBe(200000);
    expect(result.rows[1].hourlyRate).toBe(300000);
    expect(result.totals.totalAmount).toBe(1000000);
  });

  it('đếm đúng sĩ số có mặt trên tổng số bản ghi', () => {
    const result = buildInvoiceData({
      classData,
      sessions: [makeSession('2026-08-01T10:00:00')],
      from: null, to: null, branding
    });
    expect(result.rows[0].presentCount).toBe(1);
    expect(result.rows[0].totalStudents).toBe(2);
  });

  it('đánh số thứ tự tăng dần theo ngày', () => {
    const sessions = [makeSession('2026-08-10T10:00:00'), makeSession('2026-08-01T10:00:00')];
    const result = buildInvoiceData({ classData, sessions, from: null, to: null, branding });
    expect(result.rows.map(r => r.index)).toEqual([1, 2]);
    expect(result.rows[0].date.getTime()).toBeLessThan(result.rows[1].date.getTime());
  });

  it('sinh qrUrl khi đã cấu hình ngân hàng', () => {
    const result = buildInvoiceData({
      classData,
      sessions: [makeSession('2026-08-01T10:00:00')],
      from: null, to: null, branding
    });
    expect(result.qrUrl).toContain('970436-0011001234567');
    expect(result.qrUrl).toContain('amount=400000');
    expect(result.qrUrl).toContain(`addInfo=${result.invoiceNo}`);
  });

  it('qrUrl là null khi chưa cấu hình ngân hàng', () => {
    const result = buildInvoiceData({
      classData: { ...classData, invoiceConfig: { centerName: 'X' } },
      sessions: [makeSession('2026-08-01T10:00:00')],
      from: null, to: null, branding
    });
    expect(result.qrUrl).toBeNull();
  });

  it('xử lý lớp không có buổi nào', () => {
    const result = buildInvoiceData({ classData, sessions: [], from: null, to: null, branding });
    expect(result.rows).toEqual([]);
    expect(result.totals).toEqual({ sessionCount: 0, totalHours: 0, totalAmount: 0 });
    expect(result.amountInWords).toBe('Không đồng');
    expect(result.qrUrl).toBeNull();
  });

  it('xử lý lớp chưa có invoiceConfig', () => {
    const result = buildInvoiceData({
      classData: { classId: 'c1', name: 'X' },
      sessions: [], from: null, to: null, branding: null
    });
    expect(result.config.centerName).toBe('');
    expect(result.branding.subtext).toBe('');
    expect(result.qrUrl).toBeNull();
  });

  it('dựng nhãn khoảng thời gian', () => {
    const { from, to } = parseDateRange('2026-07-01', '2026-08-10');
    const withRange = buildInvoiceData({ classData, sessions: [], from, to, branding });
    expect(withRange.period.label).toBe('01/07/2026 – 10/08/2026');

    const noRange = buildInvoiceData({ classData, sessions: [], from: null, to: null, branding });
    expect(noRange.period.label).toBe('Toàn bộ');
  });
});
```

- [x] **Step 2: Chạy test để xác nhận fail**

Run: `npx jest src/utils/invoice.util.test.js`
Expected: FAIL — `parseDateRange is not a function`

- [x] **Step 3: Viết implementation**

Thêm vào `src/utils/invoice.util.js`:

```js
/**
 * Chuẩn hoá tham số khoảng ngày từ query string.
 * from → 00:00:00.000, to → 23:59:59.999 để bao trọn ngày cuối.
 * @returns {{ from: Date|null, to: Date|null }}
 */
function parseDateRange(fromRaw, toRaw) {
  const parse = (raw, endOfDay) => {
    if (!raw) return null;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    if (endOfDay) parsed.setHours(23, 59, 59, 999);
    else parsed.setHours(0, 0, 0, 0);
    return parsed;
  };

  return { from: parse(fromRaw, false), to: parse(toRaw, true) };
}

/**
 * Lọc buổi học theo khoảng ngày. Không mutate đầu vào.
 * @returns {Array}
 */
function filterSessionsByRange(sessions, from, to) {
  const list = Array.isArray(sessions) ? sessions : [];
  return list.filter(session => {
    const date = session?.date instanceof Date ? session.date : new Date(session?.date);
    if (Number.isNaN(date.getTime())) return false;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  });
}

function formatDdMmYyyy(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

function buildPeriodLabel(from, to) {
  if (from && to) return `${formatDdMmYyyy(from)} – ${formatDdMmYyyy(to)}`;
  if (from) return `Từ ${formatDdMmYyyy(from)}`;
  if (to) return `Đến ${formatDdMmYyyy(to)}`;
  return 'Toàn bộ';
}

/**
 * Dựng toàn bộ dữ liệu hóa đơn để render ra HTML hoặc Excel.
 * Hàm thuần — không đọc/ghi DB.
 */
function buildInvoiceData({ classData = {}, sessions = [], from = null, to = null, branding = null } = {}) {
  const filtered = filterSessionsByRange(sessions, from, to)
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const rows = filtered.map((session, i) => {
    const records = Array.isArray(session.records) ? session.records : [];
    return {
      index: i + 1,
      date: session.date instanceof Date ? session.date : new Date(session.date),
      durationHours: Number(session.durationHours) || 0,
      presentCount: records.filter(r => r?.status === 'present').length,
      totalStudents: records.length,
      hourlyRate: Number(session.hourlyRate) || 0,
      totalCost: Number(session.totalCost) || 0
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      sessionCount: acc.sessionCount + 1,
      totalHours: acc.totalHours + row.durationHours,
      totalAmount: acc.totalAmount + row.totalCost
    }),
    { sessionCount: 0, totalHours: 0, totalAmount: 0 }
  );

  const rawConfig = classData.invoiceConfig || {};
  const config = {
    centerName: String(rawConfig.centerName || ''),
    payerName: String(rawConfig.payerName || ''),
    payerPhone: String(rawConfig.payerPhone || ''),
    payerAddress: String(rawConfig.payerAddress || ''),
    bankCode: String(rawConfig.bankCode || ''),
    bankAccount: String(rawConfig.bankAccount || ''),
    bankAccountName: String(rawConfig.bankAccountName || ''),
    note: String(rawConfig.note || '')
  };

  const bank = BANKS.find(b => b.bin === config.bankCode) || null;
  const invoiceNo = generateInvoiceNo(classData.classId, from, to);

  return {
    invoiceNo,
    issuedAt: new Date(),
    class: {
      classId: String(classData.classId || ''),
      name: String(classData.name || ''),
      semester: String(classData.semester || ''),
      year: classData.year ?? null,
      block: classData.block ?? null,
      instructorCode: String(classData.instructorCode || ''),
      studentCount: Array.isArray(classData.students) ? classData.students.length : 0
    },
    period: { from, to, label: buildPeriodLabel(from, to) },
    config,
    bank,
    branding: {
      logoDataUrl: String(branding?.logoDataUrl || ''),
      subtext: String(branding?.subtext || ''),
      primaryColor: String(branding?.primaryColor || '#FF6C00')
    },
    rows,
    totals,
    amountInWords: numberToVietnameseWords(totals.totalAmount),
    qrUrl: buildVietQrUrl({
      bankCode: config.bankCode,
      bankAccount: config.bankAccount,
      bankAccountName: config.bankAccountName,
      amount: totals.totalAmount,
      addInfo: invoiceNo
    })
  };
}
```

Cập nhật `module.exports`:

```js
module.exports = {
  numberToVietnameseWords,
  BANKS,
  buildVietQrUrl,
  generateInvoiceNo,
  parseDateRange,
  filterSessionsByRange,
  buildInvoiceData,
};
```

- [x] **Step 4: Chạy test để xác nhận pass**

Run: `npx jest src/utils/invoice.util.test.js`
Expected: PASS — toàn bộ test Task 1–3

- [x] **Step 5: Commit**

```bash
git add src/utils/invoice.util.js src/utils/invoice.util.test.js
git commit -m "feat: loc buoi hoc theo khoang ngay va dung du lieu hoa don"
```

---

### Task 4: Lưu cấu hình hóa đơn trên model Class

**Files:**
- Modify: `src/models/class.model.js` (thêm sub-schema + field)
- Modify: `src/services/class.service.js` (thêm `normalizeInvoiceConfig`, thêm nhánh trong `normalizeClassMetadata` ở dòng 88, thêm vào `module.exports`)
- Modify: `src/app.js:216-229` (thêm `invoiceConfig` vào giá trị trả về của `serializeClass`)
- Test: `src/services/class.service.test.js`

**Interfaces:**
- Consumes: (không có)
- Produces:
  - `Class.invoiceConfig` — sub-document với 8 field chuỗi
  - `classService.normalizeInvoiceConfig(input): object` — export thêm để test được
  - `serializeClass()` trả thêm `invoiceConfig`

> **Ràng buộc:** chỉ THÊM. Không đổi bất kỳ field, hàm, export nào đang có.

- [x] **Step 1: Viết test thất bại**

Tạo `src/services/class.service.test.js`:

```js
const { normalizeInvoiceConfig } = require('./class.service');

describe('normalizeInvoiceConfig', () => {
  it('trả object với đủ 8 field rỗng khi đầu vào rỗng', () => {
    expect(normalizeInvoiceConfig()).toEqual({
      centerName: '', payerName: '', payerPhone: '', payerAddress: '',
      bankCode: '', bankAccount: '', bankAccountName: '', note: ''
    });
    expect(normalizeInvoiceConfig(null)).toEqual(normalizeInvoiceConfig({}));
  });

  it('trim khoảng trắng thừa', () => {
    const result = normalizeInvoiceConfig({ centerName: '  Trung tâm ABC  ', payerName: ' A ' });
    expect(result.centerName).toBe('Trung tâm ABC');
    expect(result.payerName).toBe('A');
  });

  it('bỏ qua key lạ không nằm trong whitelist', () => {
    const result = normalizeInvoiceConfig({ centerName: 'X', hackedField: 'evil', __proto__: {} });
    expect(result.hackedField).toBeUndefined();
    expect(Object.keys(result).sort()).toEqual([
      'bankAccount', 'bankAccountName', 'bankCode', 'centerName',
      'note', 'payerAddress', 'payerName', 'payerPhone'
    ]);
  });

  it('cắt chuỗi vượt maxlength', () => {
    const result = normalizeInvoiceConfig({ centerName: 'a'.repeat(200), note: 'b'.repeat(400) });
    expect(result.centerName).toHaveLength(120);
    expect(result.note).toHaveLength(300);
  });

  it('ép kiểu số về chuỗi (số tài khoản nhập dạng number)', () => {
    expect(normalizeInvoiceConfig({ bankAccount: 123456 }).bankAccount).toBe('123456');
  });
});
```

- [x] **Step 2: Chạy test để xác nhận fail**

Run: `npx jest src/services/class.service.test.js`
Expected: FAIL — `normalizeInvoiceConfig is not a function`

- [x] **Step 3: Thêm sub-schema vào model**

Trong `src/models/class.model.js`, thêm **sau** `studentSchema` (dòng 28) và **trước** `classSchema`:

```js
/**
 * Invoice Config Sub-Schema - Thông tin xuất hóa đơn của lớp
 */
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
```

Trong `classSchema`, thêm **sau** field `instructorCode` (dòng 109-113), trước dấu `}` đóng của object định nghĩa:

```js
    ,

    // Cấu hình xuất hóa đơn (thêm mới - lớp cũ không có field này vẫn hoạt động bình thường)
    invoiceConfig: {
        type: invoiceConfigSchema,
        default: () => ({})
    }
```

- [x] **Step 4: Thêm normalizeInvoiceConfig vào service**

Trong `src/services/class.service.js`, thêm **trước** `function normalizeClassMetadata` (dòng 88):

```js
const INVOICE_CONFIG_FIELDS = {
    centerName: 120,
    payerName: 120,
    payerPhone: 30,
    payerAddress: 200,
    bankCode: 20,
    bankAccount: 30,
    bankAccountName: 120,
    note: 300
};

/**
 * Chuẩn hoá cấu hình hóa đơn: chỉ giữ field trong whitelist, trim và cắt theo maxlength.
 * @param {object} input
 * @returns {object}
 */
function normalizeInvoiceConfig(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    return Object.entries(INVOICE_CONFIG_FIELDS).reduce((acc, [field, maxLength]) => {
        const raw = Object.prototype.hasOwnProperty.call(source, field) ? source[field] : '';
        acc[field] = String(raw ?? '').trim().slice(0, maxLength);
        return acc;
    }, {});
}
```

Trong `normalizeClassMetadata`, thêm **sau** nhánh `hourlyRate` (kết thúc quanh dòng 134), trước `return result;`:

```js
    if (input.invoiceConfig !== undefined) {
        result.invoiceConfig = normalizeInvoiceConfig(input.invoiceConfig);
    }
```

Thêm `normalizeInvoiceConfig` vào `module.exports` ở cuối file (giữ nguyên mọi export sẵn có). File hiện export một instance service — thêm dạng property:

```js
// Ở cuối file, sau dòng export instance hiện có, bổ sung:
module.exports.normalizeInvoiceConfig = normalizeInvoiceConfig;
```

> Đọc kỹ dòng `module.exports` hiện tại của file trước khi sửa, và giữ nguyên hoàn toàn hình thức export cũ.

- [x] **Step 5: Thêm invoiceConfig vào serializeClass**

Trong `src/app.js`, trong object `return` của `serializeClass` (dòng 216-229), thêm sau `instructorCode`:

```js
    invoiceConfig: {
      centerName: classDoc.invoiceConfig?.centerName || '',
      payerName: classDoc.invoiceConfig?.payerName || '',
      payerPhone: classDoc.invoiceConfig?.payerPhone || '',
      payerAddress: classDoc.invoiceConfig?.payerAddress || '',
      bankCode: classDoc.invoiceConfig?.bankCode || '',
      bankAccount: classDoc.invoiceConfig?.bankAccount || '',
      bankAccountName: classDoc.invoiceConfig?.bankAccountName || '',
      note: classDoc.invoiceConfig?.note || '',
    },
```

> Không bỏ field nào đang có trong object return này.

- [x] **Step 6: Chạy test để xác nhận pass**

Run: `npx jest src/services/class.service.test.js`
Expected: PASS — 5 test

- [x] **Step 7: Kiểm tra lint không hỏng file đã sửa**

Run: `npx eslint src/models/class.model.js src/services/class.service.js src/app.js src/utils/invoice.util.js`
Expected: không có error mới (cảnh báo có sẵn từ trước thì bỏ qua)

- [x] **Step 8: Commit**

```bash
git add src/models/class.model.js src/services/class.service.js src/services/class.service.test.js src/app.js
git commit -m "feat: them cau hinh hoa don invoiceConfig vao model Class"
```

---

### Task 5: Sinh workbook Excel cho hóa đơn

**Files:**
- Modify: `src/utils/excel.util.js` (thêm hàm mới + thêm vào `module.exports`, không sửa hàm cũ)
- Test: `src/utils/excel.util.invoice.test.js`

**Interfaces:**
- Consumes: `buildInvoiceData` output (Task 3)
- Produces: `createInvoiceWorkbook(invoiceData): Buffer` — buffer `.xlsx` một sheet tên `Hóa đơn`

- [x] **Step 1: Viết test thất bại**

Tạo `src/utils/excel.util.invoice.test.js`:

```js
const XLSX = require('xlsx');
const { createInvoiceWorkbook } = require('./excel.util');
const { buildInvoiceData } = require('./invoice.util');

const invoiceData = buildInvoiceData({
  classData: {
    classId: 'class_1782608848247',
    name: 'SOF308',
    semester: 'fall',
    year: 2026,
    instructorCode: 'HungNX',
    students: [{ mssv: 'SV01' }],
    invoiceConfig: {
      centerName: 'Trung tâm ABC',
      payerName: 'Phụ huynh Nguyễn Văn A',
      bankCode: '970436',
      bankAccount: '0011001234567',
      bankAccountName: 'NGUYEN VAN A'
    }
  },
  sessions: [
    { date: new Date('2026-08-01T10:00:00'), durationHours: 2, hourlyRate: 200000,
      totalCost: 400000, records: [{ mssv: 'SV01', status: 'present' }] },
    { date: new Date('2026-08-10T11:36:00'), durationHours: 2, hourlyRate: 200000,
      totalCost: 400000, records: [{ mssv: 'SV01', status: 'present' }] }
  ],
  from: null,
  to: null,
  branding: { subtext: 'FPT Polytechnic', primaryColor: '#FF6C00', logoDataUrl: '' }
});

function readSheetText(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return { wb, ws, rows: XLSX.utils.sheet_to_json(ws, { header: 1 }) };
}

describe('createInvoiceWorkbook', () => {
  it('trả về Buffer đọc lại được bằng SheetJS', () => {
    const buffer = createInvoiceWorkbook(invoiceData);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    const { wb } = readSheetText(buffer);
    expect(wb.SheetNames).toContain('Hóa đơn');
  });

  it('chứa số hóa đơn, tên lớp và tên trung tâm', () => {
    const { rows } = readSheetText(createInvoiceWorkbook(invoiceData));
    const flat = rows.flat().filter(Boolean).map(String).join(' | ');
    expect(flat).toContain(invoiceData.invoiceNo);
    expect(flat).toContain('SOF308');
    expect(flat).toContain('Trung tâm ABC');
    expect(flat).toContain('Phụ huynh Nguyễn Văn A');
  });

  it('chứa header bảng và đúng số dòng buổi học', () => {
    const { rows } = readSheetText(createInvoiceWorkbook(invoiceData));
    const headerIndex = rows.findIndex(r => r[0] === 'STT' && r[1] === 'Ngày');
    expect(headerIndex).toBeGreaterThan(-1);
    expect(rows[headerIndex + 1][0]).toBe(1);
    expect(rows[headerIndex + 2][0]).toBe(2);
  });

  it('chứa tổng tiền dạng số và tiền bằng chữ', () => {
    const { rows } = readSheetText(createInvoiceWorkbook(invoiceData));
    const flat = rows.flat();
    expect(flat).toContain(800000);
    expect(flat.map(String).join(' ')).toContain('Tám trăm nghìn đồng chẵn');
  });

  it('chứa thông tin chuyển khoản và link VietQR dạng text', () => {
    const { rows } = readSheetText(createInvoiceWorkbook(invoiceData));
    const flat = rows.flat().filter(Boolean).map(String).join(' | ');
    expect(flat).toContain('0011001234567');
    expect(flat).toContain('Vietcombank');
    expect(flat).toContain('img.vietqr.io');
  });

  it('xử lý hóa đơn rỗng không crash', () => {
    const empty = buildInvoiceData({
      classData: { classId: 'c1', name: 'X' },
      sessions: [], from: null, to: null, branding: null
    });
    const { rows } = readSheetText(createInvoiceWorkbook(empty));
    expect(rows.flat().map(String).join(' ')).toContain('Không đồng');
  });
});
```

- [x] **Step 2: Chạy test để xác nhận fail**

Run: `npx jest src/utils/excel.util.invoice.test.js`
Expected: FAIL — `createInvoiceWorkbook is not a function`

- [x] **Step 3: Viết implementation**

Thêm vào `src/utils/excel.util.js` **trước** `module.exports` (giữ nguyên toàn bộ hàm hiện có):

```js
const SEMESTER_LABELS = { spring: 'Spring', summer: 'Summer', fall: 'Fall' };

function formatInvoiceDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

/**
 * Tạo workbook Excel cho hóa đơn (bảng kê học phí).
 * @param {object} invoiceData - kết quả của buildInvoiceData()
 * @returns {Buffer}
 */
function createInvoiceWorkbook(invoiceData) {
  const data = invoiceData || {};
  const cls = data.class || {};
  const config = data.config || {};
  const totals = data.totals || { sessionCount: 0, totalHours: 0, totalAmount: 0 };
  const rows = Array.isArray(data.rows) ? data.rows : [];

  const semesterLabel = SEMESTER_LABELS[cls.semester] || '';
  const periodParts = [semesterLabel, cls.year || '', cls.block ? `Block ${cls.block}` : '']
    .filter(Boolean)
    .join(' ');

  const sheet = [
    [config.centerName || 'BẢNG KÊ HỌC PHÍ'],
    ['BẢNG KÊ HỌC PHÍ'],
    [''],
    ['Số hóa đơn:', data.invoiceNo || '', '', 'Ngày xuất:', formatInvoiceDate(data.issuedAt || new Date())],
    ['Lớp:', cls.name || '', '', 'Kỳ học:', periodParts],
    ['Giảng viên:', cls.instructorCode || '', '', 'Kỳ thanh toán:', data.period?.label || ''],
    ['Kính gửi:', config.payerName || '', '', 'Điện thoại:', config.payerPhone || ''],
    ['Địa chỉ:', config.payerAddress || ''],
    [''],
    ['STT', 'Ngày', 'Thời lượng (giờ)', 'Sĩ số', 'Đơn giá/giờ', 'Thành tiền']
  ];

  rows.forEach(row => {
    sheet.push([
      row.index,
      formatInvoiceDate(row.date),
      row.durationHours,
      `${row.presentCount}/${row.totalStudents}`,
      row.hourlyRate,
      row.totalCost
    ]);
  });

  sheet.push(['']);
  sheet.push(['', 'TỔNG CỘNG', totals.totalHours, `${totals.sessionCount} buổi`, '', totals.totalAmount]);
  sheet.push(['Bằng chữ:', data.amountInWords || '']);

  if (config.bankAccount) {
    sheet.push(['']);
    sheet.push(['THÔNG TIN CHUYỂN KHOẢN']);
    sheet.push(['Ngân hàng:', data.bank ? `${data.bank.shortName} - ${data.bank.name}` : config.bankCode]);
    sheet.push(['Số tài khoản:', config.bankAccount]);
    sheet.push(['Chủ tài khoản:', config.bankAccountName || '']);
    sheet.push(['Nội dung:', data.invoiceNo || '']);
    if (data.qrUrl) sheet.push(['Mã QR:', data.qrUrl]);
  }

  if (config.note) {
    sheet.push(['']);
    sheet.push(['Ghi chú:', config.note]);
  }

  const ws = XLSX.utils.aoa_to_sheet(sheet);
  ws['!cols'] = [{ wch: 16 }, { wch: 26 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 18 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hóa đơn');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
```

Thêm `createInvoiceWorkbook` vào `module.exports` hiện có (giữ nguyên 5 export cũ):

```js
module.exports = {
  readExcelFile,
  findMSSVColumnIndex,
  findNameColumnIndex,
  createTemplateWorkbook,
  createResultsWorkbook,
  createInvoiceWorkbook,
};
```

- [x] **Step 4: Chạy test để xác nhận pass**

Run: `npx jest src/utils/excel.util.invoice.test.js`
Expected: PASS — 6 test

- [x] **Step 5: Commit**

```bash
git add src/utils/excel.util.js src/utils/excel.util.invoice.test.js
git commit -m "feat: sinh workbook Excel cho hoa don hoc phi"
```

---

### Task 6: API hóa đơn (JSON + xuất Excel)

**Files:**
- Create: `src/controllers/invoice.controller.js`
- Modify: `src/routes/api.routes.js` (thêm require + 2 route sau dòng 122)
- Test: `src/controllers/invoice.controller.test.js`

**Interfaces:**
- Consumes: `parseDateRange`, `buildInvoiceData` (Task 3), `createInvoiceWorkbook` (Task 5), `Class.invoiceConfig` (Task 4)
- Produces:
  - `getInvoiceData(req, res, next)` → `GET /api/classes/:classId/invoice?from=&to=`
  - `exportInvoiceExcel(req, res, next)` → `GET /api/classes/:classId/invoice/export?from=&to=`

> **Ràng buộc dữ liệu:** controller này CHỈ được gọi `AttendanceSession.find()` và `Class.findOne()`. Không có bất kỳ lệnh ghi nào.

- [x] **Step 1: Viết test thất bại**

Tạo `src/controllers/invoice.controller.test.js`. Test dùng `mongodb-memory-server` và gọi thẳng controller với mock `req`/`res` để tránh phải dựng luồng xác thực JWT:

```js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Class = require('../models/class.model');
const AttendanceSession = require('../models/attendance.model');
const invoiceController = require('./invoice.controller');

let mongoServer;

const makeRes = () => {
  const res = { statusCode: 200, body: null, headers: {}, sentBuffer: null };
  res.status = code => { res.statusCode = code; return res; };
  res.json = payload => { res.body = payload; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; return res; };
  res.send = buf => { res.sentBuffer = buf; return res; };
  return res;
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Class.create({
    classId: 'class_test_1',
    name: 'SOF308',
    userId: 'user_1',
    hourlyRate: 200000,
    students: [{ mssv: 'SV01', name: 'Nguyễn Văn A' }],
    invoiceConfig: {
      centerName: 'Trung tâm ABC',
      payerName: 'Phụ huynh A',
      bankCode: '970436',
      bankAccount: '0011001234567',
      bankAccountName: 'NGUYEN VAN A'
    }
  });

  await AttendanceSession.create([
    { classId: 'class_test_1', date: new Date('2026-07-01T10:00:00'), durationHours: 2,
      hourlyRate: 200000, records: [{ mssv: 'SV01', status: 'present' }], createdBy: 'user_1' },
    { classId: 'class_test_1', date: new Date('2026-08-10T11:36:00'), durationHours: 2,
      hourlyRate: 200000, records: [{ mssv: 'SV01', status: 'present' }], createdBy: 'user_1' }
  ]);
});

afterEach(async () => {
  // Dọn dẹp CHỈ dữ liệu do test tạo trong DB in-memory (không phải DB thật)
  await Class.deleteMany({});
  await AttendanceSession.deleteMany({});
});

const makeReq = (query = {}) => ({
  params: { classId: 'class_test_1' },
  query,
  user: { _id: 'user_1', id: 'user_1' }
});

describe('getInvoiceData', () => {
  it('trả dữ liệu hóa đơn đầy đủ cho toàn bộ buổi học', async () => {
    const res = makeRes();
    await invoiceController.getInvoiceData(makeReq(), res, jest.fn());

    expect(res.body.success).toBe(true);
    expect(res.body.data.totals.sessionCount).toBe(2);
    expect(res.body.data.totals.totalAmount).toBe(800000);
    expect(res.body.data.class.name).toBe('SOF308');
    expect(res.body.data.config.centerName).toBe('Trung tâm ABC');
    expect(res.body.data.qrUrl).toContain('970436-0011001234567');
  });

  it('lọc theo khoảng ngày', async () => {
    const res = makeRes();
    await invoiceController.getInvoiceData(makeReq({ from: '2026-08-01', to: '2026-08-31' }), res, jest.fn());

    expect(res.body.data.totals.sessionCount).toBe(1);
    expect(res.body.data.totals.totalAmount).toBe(400000);
  });

  it('trả 200 với rows rỗng khi khoảng ngày không có buổi nào', async () => {
    const res = makeRes();
    await invoiceController.getInvoiceData(makeReq({ from: '2026-01-01', to: '2026-01-31' }), res, jest.fn());

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rows).toEqual([]);
    expect(res.body.data.totals.totalAmount).toBe(0);
  });

  it('trả 404 khi lớp không tồn tại', async () => {
    const res = makeRes();
    const req = { ...makeReq(), params: { classId: 'khong_ton_tai' } };
    await invoiceController.getInvoiceData(req, res, jest.fn());

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('exportInvoiceExcel', () => {
  it('trả buffer xlsx với header tải file', async () => {
    const res = makeRes();
    await invoiceController.exportInvoiceExcel(makeReq(), res, jest.fn());

    expect(Buffer.isBuffer(res.sentBuffer)).toBe(true);
    expect(res.headers['Content-Type']).toContain('spreadsheetml');
    expect(res.headers['Content-Disposition']).toContain('.xlsx');
  });

  it('trả 404 khi lớp không tồn tại', async () => {
    const res = makeRes();
    const req = { ...makeReq(), params: { classId: 'khong_ton_tai' } };
    await invoiceController.exportInvoiceExcel(req, res, jest.fn());

    expect(res.statusCode).toBe(404);
  });
});

describe('bất biến dữ liệu — yêu cầu tuyệt đối', () => {
  it('không thay đổi số lượng document sau khi gọi cả hai endpoint', async () => {
    const sessionsBefore = await AttendanceSession.countDocuments();
    const classesBefore = await Class.countDocuments();

    await invoiceController.getInvoiceData(makeReq(), makeRes(), jest.fn());
    await invoiceController.exportInvoiceExcel(makeReq(), makeRes(), jest.fn());
    await invoiceController.getInvoiceData(makeReq({ from: '2026-08-01' }), makeRes(), jest.fn());

    expect(await AttendanceSession.countDocuments()).toBe(sessionsBefore);
    expect(await Class.countDocuments()).toBe(classesBefore);
  });

  it('không thay đổi nội dung buổi học sau khi xuất hóa đơn', async () => {
    const before = await AttendanceSession.find({ classId: 'class_test_1' }).sort({ date: 1 }).lean();

    await invoiceController.getInvoiceData(makeReq(), makeRes(), jest.fn());
    await invoiceController.exportInvoiceExcel(makeReq(), makeRes(), jest.fn());

    const after = await AttendanceSession.find({ classId: 'class_test_1' }).sort({ date: 1 }).lean();
    expect(after).toEqual(before);
  });

  it('không thay đổi nội dung lớp sau khi xuất hóa đơn', async () => {
    const before = await Class.findOne({ classId: 'class_test_1' }).lean();

    await invoiceController.getInvoiceData(makeReq(), makeRes(), jest.fn());
    await invoiceController.exportInvoiceExcel(makeReq(), makeRes(), jest.fn());

    const after = await Class.findOne({ classId: 'class_test_1' }).lean();
    expect(after).toEqual(before);
  });
});
```

- [x] **Step 2: Chạy test để xác nhận fail**

Run: `npx jest src/controllers/invoice.controller.test.js`
Expected: FAIL — `Cannot find module './invoice.controller'`

- [x] **Step 3: Viết controller**

Tạo `src/controllers/invoice.controller.js`:

```js
const AttendanceSession = require('../models/attendance.model');
const Class = require('../models/class.model');
const brandingService = require('../services/branding.service');
const { parseDateRange, buildInvoiceData } = require('../utils/invoice.util');
const { createInvoiceWorkbook } = require('../utils/excel.util');

/**
 * Nạp dữ liệu cần thiết để dựng hóa đơn.
 * CHỈ ĐỌC — không có bất kỳ thao tác ghi nào lên database.
 * @returns {Promise<object|null>} null nếu không tìm thấy lớp
 */
async function loadInvoice(classId, query) {
    const classData = await Class.findOne({ classId }).lean();
    if (!classData) return null;

    const { from, to } = parseDateRange(query?.from, query?.to);

    const filter = { classId };
    if (from || to) {
        filter.date = {};
        if (from) filter.date.$gte = from;
        if (to) filter.date.$lte = to;
    }

    const sessions = await AttendanceSession.find(filter).sort({ date: 1 }).lean();
    const branding = await brandingService.getGlobalBranding();

    return buildInvoiceData({ classData, sessions, from, to, branding });
}

/**
 * GET /api/classes/:classId/invoice?from=&to=
 */
exports.getInvoiceData = async (req, res, next) => {
    try {
        const invoice = await loadInvoice(req.params.classId, req.query);
        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy lớp học' });
        }
        res.json({ success: true, data: invoice });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/classes/:classId/invoice/export?from=&to=
 */
exports.exportInvoiceExcel = async (req, res, next) => {
    try {
        const invoice = await loadInvoice(req.params.classId, req.query);
        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy lớp học' });
        }

        const buffer = createInvoiceWorkbook(invoice);
        const fileName = `${invoice.invoiceNo}.xlsx`.replace(/[^a-zA-Z0-9._-]/g, '_');

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};

exports.loadInvoice = loadInvoice;
```

- [x] **Step 4: Đăng ký route**

Trong `src/routes/api.routes.js`, thêm require cạnh các require controller khác (quanh dòng 10):

```js
const invoiceController = require('../controllers/invoice.controller');
```

Thêm **ngay sau** dòng 122 (route POST attendance):

```js
// Hóa đơn / bảng kê học phí (chỉ đọc)
router.get('/classes/:classId/invoice', authenticate, requireActiveLecturer, asyncHandler(invoiceController.getInvoiceData));
router.get('/classes/:classId/invoice/export', authenticate, requireActiveLecturer, asyncHandler(invoiceController.exportInvoiceExcel));
```

- [x] **Step 5: Chạy test để xác nhận pass**

Run: `npx jest src/controllers/invoice.controller.test.js`
Expected: PASS — 9 test, trong đó 3 test bất biến dữ liệu

> Lần chạy đầu `mongodb-memory-server` sẽ tải binary MongoDB, có thể mất 1–2 phút. Nếu timeout, chạy lại với `--testTimeout=120000`.

- [x] **Step 6: Kiểm tra không có lệnh ghi nào lọt vào**

Run: `grep -nE "delete(One|Many)|\.remove\(|drop\(|replaceOne|findOneAndReplace|bulkWrite|updateMany|\.save\(" src/controllers/invoice.controller.js src/utils/invoice.util.js`
Expected: không có kết quả nào

- [x] **Step 7: Commit**

```bash
git add src/controllers/invoice.controller.js src/controllers/invoice.controller.test.js src/routes/api.routes.js
git commit -m "feat: API xuat hoa don JSON va Excel (chi doc DB)"
```

---

### Task 7: Trang hóa đơn để in / lưu PDF

**Files:**
- Create: `views/pages/invoice-print.ejs`
- Modify: `src/app.js` (thêm route sau route `/classes/:classId/note` kết thúc quanh dòng 588)

**Interfaces:**
- Consumes: `invoiceController.loadInvoice(classId, query)` (Task 6)
- Produces: `GET /classes/:classId/invoice?from=&to=` — trang HTML độc lập, không dùng layout master

- [x] **Step 1: Tạo trang hóa đơn**

Tạo `views/pages/invoice-print.ejs`:

```html
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bảng kê học phí <%= invoice.class.name %> - <%= invoice.invoiceNo %></title>
<style>
  :root {
    --accent: <%= invoice.branding.primaryColor || '#FF6C00' %>;
    --ink: #1a1a1a;
    --muted: #6b7280;
    --line: #d9dee5;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    background: #f3f4f6;
    color: var(--ink);
    font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }
  .toolbar {
    max-width: 820px;
    margin: 0 auto 16px;
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
  .btn {
    border: 1px solid var(--line);
    background: #fff;
    color: var(--ink);
    padding: 10px 20px;
    border-radius: 999px;
    font-weight: 600;
    cursor: pointer;
    font-size: 14px;
  }
  .btn-primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .sheet {
    max-width: 820px;
    margin: 0 auto;
    background: #fff;
    padding: 40px 44px;
    box-shadow: 0 4px 24px rgba(0,0,0,.08);
  }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
  .brand { display: flex; gap: 14px; align-items: center; }
  .brand img { height: 52px; width: auto; }
  .brand-name { font-weight: 700; font-size: 17px; }
  .brand-sub { color: var(--muted); font-size: 13px; }
  .doc-title {
    text-align: right;
    text-transform: uppercase;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: .5px;
    color: var(--accent);
  }
  .doc-meta { text-align: right; color: var(--muted); font-size: 13px; margin-top: 6px; }
  .rule { height: 3px; background: var(--accent); margin: 20px 0 24px; }
  .info { display: flex; gap: 40px; margin-bottom: 24px; }
  .info > div { flex: 1; }
  .info dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; }
  .info dt { color: var(--muted); }
  .info dd { margin: 0; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; }
  thead th {
    background: #f8f9fb;
    text-align: left;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .4px;
    color: var(--muted);
    padding: 10px 12px;
    border-bottom: 2px solid var(--line);
  }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #eef1f4; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .center { text-align: center; }
  tbody tr { page-break-inside: avoid; }
  .empty { text-align: center; color: var(--muted); padding: 32px 0; }
  .totals { margin-top: 18px; display: flex; justify-content: flex-end; }
  .totals table { width: auto; min-width: 340px; }
  .totals td { padding: 6px 12px; border: 0; }
  .grand td { border-top: 2px solid var(--accent); font-size: 18px; font-weight: 800; padding-top: 12px; }
  .grand .num { color: var(--accent); }
  .words { margin-top: 8px; text-align: right; font-style: italic; color: var(--muted); }
  .pay { margin-top: 28px; display: flex; gap: 24px; align-items: center; border: 1px solid var(--line); border-radius: 10px; padding: 18px; page-break-inside: avoid; }
  .pay img { width: 168px; height: 168px; }
  .pay dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; }
  .pay dt { color: var(--muted); }
  .pay dd { margin: 0; font-weight: 600; }
  .note { margin-top: 16px; color: var(--muted); }
  .sign { margin-top: 44px; display: flex; justify-content: space-around; text-align: center; page-break-inside: avoid; }
  .sign div { width: 220px; }
  .sign .role { font-weight: 700; }
  .sign .hint { color: var(--muted); font-size: 12px; }
  .sign .space { height: 68px; }
  @media print {
    @page { size: A4; margin: 12mm; }
    body { background: #fff; padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .toolbar { display: none; }
    .sheet { box-shadow: none; max-width: none; padding: 0; }
  }
</style>
</head>
<body>
<div class="toolbar">
  <button class="btn" onclick="window.close()">Đóng</button>
  <button class="btn btn-primary" onclick="window.print()">In hóa đơn</button>
</div>

<main class="sheet">
  <header>
    <div class="brand">
      <% if (invoice.branding.logoDataUrl) { %>
        <img src="<%= invoice.branding.logoDataUrl %>" alt="Logo">
      <% } %>
      <div>
        <div class="brand-name"><%= invoice.config.centerName || invoice.branding.subtext || 'Bảng kê học phí' %></div>
        <% if (invoice.branding.subtext && invoice.config.centerName) { %>
          <div class="brand-sub"><%= invoice.branding.subtext %></div>
        <% } %>
      </div>
    </div>
    <div>
      <div class="doc-title">Bảng kê học phí</div>
      <div class="doc-meta">
        Số: <strong><%= invoice.invoiceNo %></strong><br>
        Ngày xuất: <%= fmtDate(invoice.issuedAt) %>
      </div>
    </div>
  </header>

  <div class="rule"></div>

  <section class="info">
    <div>
      <dl>
        <dt>Lớp</dt><dd><%= invoice.class.name %></dd>
        <% if (semesterLabel) { %><dt>Kỳ học</dt><dd><%= semesterLabel %></dd><% } %>
        <% if (invoice.class.instructorCode) { %><dt>Giảng viên</dt><dd><%= invoice.class.instructorCode %></dd><% } %>
        <dt>Kỳ thanh toán</dt><dd><%= invoice.period.label %></dd>
      </dl>
    </div>
    <div>
      <dl>
        <% if (invoice.config.payerName) { %><dt>Kính gửi</dt><dd><%= invoice.config.payerName %></dd><% } %>
        <% if (invoice.config.payerPhone) { %><dt>Điện thoại</dt><dd><%= invoice.config.payerPhone %></dd><% } %>
        <% if (invoice.config.payerAddress) { %><dt>Địa chỉ</dt><dd><%= invoice.config.payerAddress %></dd><% } %>
      </dl>
    </div>
  </section>

  <table>
    <thead>
      <tr>
        <th style="width:48px">STT</th>
        <th>Ngày</th>
        <th class="center">Thời lượng</th>
        <th class="center">Sĩ số</th>
        <th class="num">Đơn giá/giờ</th>
        <th class="num">Thành tiền</th>
      </tr>
    </thead>
    <tbody>
      <% if (invoice.rows.length === 0) { %>
        <tr><td colspan="6" class="empty">Không có buổi học nào trong kỳ thanh toán này.</td></tr>
      <% } %>
      <% invoice.rows.forEach(function (row) { %>
        <tr>
          <td><%= row.index %></td>
          <td><%= fmtDate(row.date) %></td>
          <td class="center"><%= row.durationHours %> giờ</td>
          <td class="center"><%= row.presentCount %>/<%= row.totalStudents %></td>
          <td class="num"><%= fmtMoney(row.hourlyRate) %></td>
          <td class="num"><%= fmtMoney(row.totalCost) %></td>
        </tr>
      <% }); %>
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td>Tổng số buổi</td><td class="num"><%= invoice.totals.sessionCount %> buổi</td></tr>
      <tr><td>Tổng số giờ</td><td class="num"><%= invoice.totals.totalHours %> giờ</td></tr>
      <tr class="grand"><td>TỔNG CỘNG</td><td class="num"><%= fmtMoney(invoice.totals.totalAmount) %></td></tr>
    </table>
  </div>
  <div class="words">Bằng chữ: <%= invoice.amountInWords %></div>

  <% if (invoice.config.bankAccount) { %>
    <section class="pay">
      <% if (invoice.qrUrl) { %>
        <img src="<%= invoice.qrUrl %>" alt="Mã QR chuyển khoản" onerror="this.style.display='none'">
      <% } %>
      <dl>
        <dt>Ngân hàng</dt>
        <dd><%= invoice.bank ? invoice.bank.shortName + ' - ' + invoice.bank.name : invoice.config.bankCode %></dd>
        <dt>Số tài khoản</dt><dd><%= invoice.config.bankAccount %></dd>
        <% if (invoice.config.bankAccountName) { %>
          <dt>Chủ tài khoản</dt><dd><%= invoice.config.bankAccountName %></dd>
        <% } %>
        <dt>Nội dung</dt><dd><%= invoice.invoiceNo %></dd>
        <dt>Số tiền</dt><dd><%= fmtMoney(invoice.totals.totalAmount) %></dd>
      </dl>
    </section>
  <% } %>

  <% if (invoice.config.note) { %>
    <p class="note">Ghi chú: <%= invoice.config.note %></p>
  <% } %>

  <section class="sign">
    <div>
      <div class="role">Người nộp tiền</div>
      <div class="hint">(Ký, ghi rõ họ tên)</div>
      <div class="space"></div>
    </div>
    <div>
      <div class="role">Người lập bảng kê</div>
      <div class="hint">(Ký, ghi rõ họ tên)</div>
      <div class="space"></div>
    </div>
  </section>
</main>
</body>
</html>
```

- [x] **Step 2: Thêm route render**

Trong `src/app.js`, thêm **sau** khi route `app.get('/classes/:classId/note', ...)` kết thúc (quanh dòng 588, trước `app.get('/branding', ...)` ở dòng 589):

```js
// Trang hóa đơn / bảng kê học phí để in hoặc lưu PDF (chỉ đọc dữ liệu)
app.get('/classes/:classId/invoice', optionalAuth, async (req, res, next) => {
  if (!ensureLecturerAccess(req, res)) return;

  try {
    const { classId } = req.params;
    const invoice = await invoiceController.loadInvoice(classId, req.query);

    if (!invoice) {
      return renderLayoutPage(req, res, 'class-not-found', {
        title: 'Không tìm thấy lớp - FPT Polytechnic',
        currentRoute: '/classes',
        pageData: { classId },
      });
    }

    const SEMESTER_LABELS = { spring: 'Spring', summer: 'Summer', fall: 'Fall' };
    const semesterLabel = [
      SEMESTER_LABELS[invoice.class.semester] || '',
      invoice.class.year || '',
      invoice.class.block ? `Block ${invoice.class.block}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    res.render('pages/invoice-print', {
      invoice,
      semesterLabel,
      fmtDate: value => {
        const d = value instanceof Date ? value : new Date(value);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}/${d.getFullYear()}`;
      },
      fmtMoney: value => `${new Intl.NumberFormat('vi-VN').format(Number(value) || 0)} đ`,
    });
  } catch (error) {
    console.error('Error rendering invoice page:', error);
    next(error);
  }
});
```

Thêm require cạnh các require controller khác ở đầu `src/app.js`:

```js
const invoiceController = require('./controllers/invoice.controller');
```

> Route này phải đặt **trước** bất kỳ route `/classes/:classId` catch-all nào. Route `/classes/:classId` hiện ở dòng 471 dùng path chính xác nên Express không nuốt `/classes/:classId/invoice` — vẫn đặt route mới cạnh `/classes/:classId/note` cho nhất quán.

- [x] **Step 3: Kiểm tra thủ công**

Khởi động server: `npm run dev`

Mở: `http://localhost:3000/classes/class_1782608848247/invoice`

Kiểm tra:
- Trang hiện tiêu đề "BẢNG KÊ HỌC PHÍ", số hóa đơn, bảng buổi học, tổng tiền khớp với tab Lịch sử
- Thêm `?from=2026-08-01&to=2026-08-31` → chỉ còn buổi trong tháng 8
- `Cmd+P` → xem preview A4, thanh nút bị ẩn, bảng không bị cắt giữa hàng

- [x] **Step 4: Commit**

```bash
git add views/pages/invoice-print.ejs src/app.js
git commit -m "feat: trang hoa don de in va luu PDF"
```

---

### Task 8: Giao diện — cấu hình hóa đơn và nút xuất

**Files:**
- Create: `public/js/pages/class-detail-invoice.js`
- Modify: `views/pages/class-detail.ejs` (tab Lịch sử quanh dòng 2005-2034; tab Cấu hình quanh dòng 2036-2052; thẻ script cuối file dòng 2059)
- Modify: `public/js/pages/class-detail-attendance.js` (`loadAttendanceHistory` nhận khoảng ngày; nút lưu cấu hình gửi kèm `invoiceConfig`)

**Interfaces:**
- Consumes: `GET /api/classes/:classId/invoice`, `GET /api/classes/:classId/invoice/export`, `PUT /api/classes/:classId`, `BANKS` (Task 2), `classData.invoiceConfig` từ `serializeClass` (Task 4)
- Produces: (kết thúc chuỗi — không có task sau)

- [x] **Step 1: Truyền danh sách ngân hàng vào view**

Trong `src/app.js`, ở route `app.get('/classes/:classId', ...)` (dòng 471), thêm require ở đầu file:

```js
const { BANKS } = require('./utils/invoice.util');
```

và thêm `banks: BANKS` vào `pageData` của lời gọi `renderLayoutPage(req, res, 'class-detail', {...})`:

```js
      pageData: {
        classData,
        profiles,
        selectedProfileId,
        googleServiceAccountEmail: googleSheetService.getServiceAccountEmail(),
        banks: BANKS,
      },
```

- [x] **Step 2: Thêm thanh lọc và nút xuất vào tab Lịch sử**

Trong `views/pages/class-detail.ejs`, thay khối `<div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">` … `</div>` ở dòng 2008-2016 bằng:

```html
                                <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                                    <h6 class="fw-bold d-flex align-items-center gap-2 mb-0">
                                        <i class="bi bi-clock-history text-primary"></i> Lịch sử buổi học
                                    </h6>
                                    <div class="text-end px-3 py-2 rounded-3 border text-start d-flex flex-column justify-content-center">
                                        <span class="text-muted small fw-bold text-uppercase tracking-wide" style="font-size: 0.75rem;">Tổng doanh thu</span>
                                        <h4 class="text-success fw-bold mb-0 mt-1" id="attTotalRevenue">0 đ</h4>
                                    </div>
                                </div>
                                <div class="d-flex flex-wrap align-items-end gap-2 mb-4">
                                    <div>
                                        <label class="form-label text-muted small fw-bold text-uppercase tracking-wide mb-1">Từ ngày</label>
                                        <input type="date" class="form-control border-0 bg-light" id="invoiceFromDate">
                                    </div>
                                    <div>
                                        <label class="form-label text-muted small fw-bold text-uppercase tracking-wide mb-1">Đến ngày</label>
                                        <input type="date" class="form-control border-0 bg-light" id="invoiceToDate">
                                    </div>
                                    <button class="btn btn-light border rounded-pill fw-semibold px-3" id="btnApplyInvoiceRange">
                                        <i class="bi bi-funnel me-1"></i> Áp dụng
                                    </button>
                                    <div class="ms-auto d-flex gap-2">
                                        <button class="btn btn-outline-success rounded-pill fw-semibold px-3" id="btnExportInvoiceExcel">
                                            <i class="bi bi-file-earmark-spreadsheet me-1"></i> Tải Excel
                                        </button>
                                        <button class="btn btn-primary rounded-pill fw-bold px-3 shadow-sm" id="btnPrintInvoice">
                                            <i class="bi bi-printer me-1"></i> In / PDF
                                        </button>
                                    </div>
                                </div>
                                <div id="invoiceConfigWarning" class="alert alert-warning py-2 px-3 small rounded-3 d-none">
                                    Chưa cấu hình tài khoản ngân hàng — hóa đơn sẽ không có mã QR chuyển khoản.
                                    Vào tab <strong>Cấu hình</strong> để bổ sung.
                                </div>
```

- [x] **Step 3: Thêm form cấu hình hóa đơn vào tab Cấu hình**

Trong `views/pages/class-detail.ejs`, trong tab `#attendance-config`, thêm **giữa** khối `<div class="mb-4">` chứa `#attConfigHourlyRate` và nút `#btnSaveAttendanceConfig`:

```html
                                <hr class="my-4">
                                <h6 class="fw-bold d-flex align-items-center gap-2 mb-3">
                                    <i class="bi bi-receipt text-primary"></i> Thông tin hóa đơn
                                </h6>
                                <div class="row g-3 mb-4">
                                    <div class="col-md-6">
                                        <label class="form-label text-muted small fw-bold text-uppercase tracking-wide">Tên trung tâm</label>
                                        <input type="text" class="form-control border-0 bg-light" id="invCenterName" maxlength="120"
                                            value="<%= classData.invoiceConfig?.centerName || '' %>">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label text-muted small fw-bold text-uppercase tracking-wide">Người nhận / Phụ huynh</label>
                                        <input type="text" class="form-control border-0 bg-light" id="invPayerName" maxlength="120"
                                            value="<%= classData.invoiceConfig?.payerName || '' %>">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label text-muted small fw-bold text-uppercase tracking-wide">Điện thoại</label>
                                        <input type="text" class="form-control border-0 bg-light" id="invPayerPhone" maxlength="30"
                                            value="<%= classData.invoiceConfig?.payerPhone || '' %>">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label text-muted small fw-bold text-uppercase tracking-wide">Địa chỉ</label>
                                        <input type="text" class="form-control border-0 bg-light" id="invPayerAddress" maxlength="200"
                                            value="<%= classData.invoiceConfig?.payerAddress || '' %>">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label text-muted small fw-bold text-uppercase tracking-wide">Ngân hàng</label>
                                        <select class="form-select border-0 bg-light" id="invBankCode">
                                            <option value="">— Chưa chọn —</option>
                                            <% (banks || []).forEach(function (bank) { %>
                                                <option value="<%= bank.bin %>"
                                                    <%= classData.invoiceConfig?.bankCode === bank.bin ? 'selected' : '' %>>
                                                    <%= bank.shortName %> — <%= bank.name %>
                                                </option>
                                            <% }); %>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label text-muted small fw-bold text-uppercase tracking-wide">Số tài khoản</label>
                                        <input type="text" class="form-control border-0 bg-light" id="invBankAccount" maxlength="30"
                                            value="<%= classData.invoiceConfig?.bankAccount || '' %>">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label text-muted small fw-bold text-uppercase tracking-wide">Chủ tài khoản</label>
                                        <input type="text" class="form-control border-0 bg-light" id="invBankAccountName" maxlength="120"
                                            value="<%= classData.invoiceConfig?.bankAccountName || '' %>">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label text-muted small fw-bold text-uppercase tracking-wide">Ghi chú trên hóa đơn</label>
                                        <input type="text" class="form-control border-0 bg-light" id="invNote" maxlength="300"
                                            value="<%= classData.invoiceConfig?.note || '' %>">
                                    </div>
                                </div>
```

- [x] **Step 4: Tạo module JS cho hóa đơn**

Tạo `public/js/pages/class-detail-invoice.js`:

```js
import { uiState } from '/js/modules/uiState.js';

const INVOICE_CONFIG_FIELDS = {
    centerName: 'invCenterName',
    payerName: 'invPayerName',
    payerPhone: 'invPayerPhone',
    payerAddress: 'invPayerAddress',
    bankCode: 'invBankCode',
    bankAccount: 'invBankAccount',
    bankAccountName: 'invBankAccountName',
    note: 'invNote'
};

function getClassId() {
    return document.getElementById('classDetailPage').dataset.classId;
}

/**
 * Đọc khoảng ngày đang chọn thành query string (rỗng nếu không lọc).
 */
export function getInvoiceRangeQuery() {
    const from = document.getElementById('invoiceFromDate')?.value || '';
    const to = document.getElementById('invoiceToDate')?.value || '';
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return query ? `?${query}` : '';
}

/**
 * Thu thập giá trị form cấu hình hóa đơn. Trả null nếu form chưa render.
 */
export function collectInvoiceConfig() {
    const entries = Object.entries(INVOICE_CONFIG_FIELDS).map(([field, elementId]) => {
        const el = document.getElementById(elementId);
        return [field, el ? el.value.trim() : ''];
    });
    if (!document.getElementById('invCenterName')) return null;
    return Object.fromEntries(entries);
}

function updateQrWarning() {
    const warning = document.getElementById('invoiceConfigWarning');
    if (!warning) return;
    const config = collectInvoiceConfig();
    const missing = !config || !config.bankCode || !config.bankAccount;
    warning.classList.toggle('d-none', !missing);
}

document.addEventListener('DOMContentLoaded', () => {
    const btnApply = document.getElementById('btnApplyInvoiceRange');
    const btnPrint = document.getElementById('btnPrintInvoice');
    const btnExcel = document.getElementById('btnExportInvoiceExcel');

    if (btnApply) {
        btnApply.addEventListener('click', () => {
            if (typeof window.loadAttendanceHistory === 'function') {
                window.loadAttendanceHistory();
            }
        });
    }

    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            window.open(`/classes/${getClassId()}/invoice${getInvoiceRangeQuery()}`, '_blank');
        });
    }

    if (btnExcel) {
        btnExcel.addEventListener('click', () => {
            window.location.href = `/api/classes/${getClassId()}/invoice/export${getInvoiceRangeQuery()}`;
        });
    }

    Object.values(INVOICE_CONFIG_FIELDS).forEach(elementId => {
        document.getElementById(elementId)?.addEventListener('change', updateQrWarning);
    });

    updateQrWarning();
});
```

- [x] **Step 5: Nạp module trong view**

Trong `views/pages/class-detail.ejs`, thêm sau dòng 2059:

```html
<script type="module" src="/js/pages/class-detail-invoice.js"></script>
```

- [x] **Step 6: Cho lịch sử tôn trọng khoảng ngày và lưu kèm cấu hình hóa đơn**

Trong `public/js/pages/class-detail-attendance.js`:

Sửa import ở đầu file thành:

```js
import { uiState } from '/js/modules/uiState.js';
import { getInvoiceRangeQuery, collectInvoiceConfig } from '/js/pages/class-detail-invoice.js';
```

Trong `loadAttendanceHistory` (dòng 119), sửa dòng fetch:

```js
        const res = await fetch(`/api/classes/${classId}/attendance${getInvoiceRangeQuery()}`);
```

Trong handler `btnSaveConfig` (dòng 83), sửa phần dựng body request:

```js
                const hourlyRate = parseFloat(configRateInput.value) || 0;
                const invoiceConfig = collectInvoiceConfig();
                const payload = invoiceConfig ? { hourlyRate, invoiceConfig } : { hourlyRate };
```

và dùng `payload` trong `body: JSON.stringify(payload)`.

- [x] **Step 7: Cho API điểm danh nhận khoảng ngày**

`getSessionsByClass` hiện bỏ qua query. Trong `src/controllers/attendance.controller.js`, sửa **duy nhất** phần dựng filter (không đụng gì khác):

```js
        const { parseDateRange } = require('../utils/invoice.util');
        const { from, to } = parseDateRange(req.query?.from, req.query?.to);
        const filter = { classId };
        if (from || to) {
            filter.date = {};
            if (from) filter.date.$gte = from;
            if (to) filter.date.$lte = to;
        }

        const sessions = await AttendanceSession.find(filter).sort({ date: -1 });
```

Chuyển `require` lên đầu file cạnh các require khác thay vì đặt trong hàm.

> Đây là ngoại lệ duy nhất được phép với `attendance.controller.js`: chỉ thêm bộ lọc đọc, không thêm thao tác ghi. Nếu không có query thì hành vi giữ nguyên như cũ.

- [x] **Step 8: Kiểm tra thủ công đầy đủ luồng**

Khởi động: `npm run dev`, mở `http://localhost:3000/classes/class_1782608848247`

1. Mở modal **Điểm Danh & Học Phí** → tab **Cấu hình** → điền tên trung tâm, phụ huynh, chọn Vietcombank, nhập STK, chủ TK → **Lưu Cấu Hình** → thấy thông báo thành công
2. Tải lại trang, mở lại tab Cấu hình → các giá trị vừa nhập **vẫn còn**
3. Tab **Lịch sử** → cảnh báo QR đã biến mất → tổng doanh thu hiện `6.000.000 đ`
4. Nhập Từ ngày `2026-08-01`, Đến ngày `2026-08-31` → **Áp dụng** → bảng và tổng doanh thu chỉ còn buổi tháng 8
5. Bấm **In / PDF** → tab mới mở đúng khoảng ngày đã lọc, có mã QR hiển thị
6. Bấm **Tải Excel** → file `HD-*.xlsx` tải về, mở lên thấy bảng buổi học + tổng tiền + thông tin CK
7. Kiểm tra dữ liệu không đổi: mở lại tab Lịch sử, xóa khoảng ngày, **Áp dụng** → vẫn đủ **15 buổi** và tổng `6.000.000 đ` như ban đầu

- [x] **Step 9: Chạy lại toàn bộ test và lint**

Run: `npx jest src/utils/invoice.util.test.js src/utils/excel.util.invoice.test.js src/services/class.service.test.js src/controllers/invoice.controller.test.js`
Expected: PASS toàn bộ

Run: `npx eslint src/ public/js/pages/class-detail-invoice.js public/js/pages/class-detail-attendance.js`
Expected: không có error mới

- [x] **Step 10: Commit**

```bash
git add views/pages/class-detail.ejs public/js/pages/class-detail-invoice.js public/js/pages/class-detail-attendance.js src/controllers/attendance.controller.js src/app.js
git commit -m "feat: giao dien cau hinh hoa don va nut xuat PDF/Excel"
```

---

## Kiểm tra cuối cùng trước khi bàn giao

- [ ] Chạy `grep -rnE "delete(One|Many)|\.remove\(|\.drop\(|replaceOne|findOneAndReplace|bulkWrite|updateMany" src/controllers/invoice.controller.js src/utils/invoice.util.js src/utils/excel.util.js` → **không có kết quả**
- [ ] Chạy `git diff main --stat` và xác nhận không có file nào bị xóa
- [ ] Xác nhận `src/models/attendance.model.js` **không có** trong danh sách file thay đổi
- [ ] Xác nhận `git diff main -- src/models/class.model.js` chỉ có dòng thêm (`+`), không có dòng xóa field nào
- [ ] Mở một lớp **chưa từng cấu hình hóa đơn** và xác nhận trang chi tiết + modal vẫn hoạt động bình thường, xuất hóa đơn vẫn ra file (chỉ thiếu QR)
