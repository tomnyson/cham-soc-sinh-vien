# Client-side JavaScript

Trang được render phía server bằng EJS (`views/pages/*.ejs`). JavaScript client chỉ bổ sung tương tác — không còn client-side router (cụm `router.js`/`routes.js`/SPA view modules đã được gỡ bỏ).

## Cấu trúc

```text
public/js/
├── app.js        # Global helpers cho inline handlers trong EJS (tạo lớp, profile, template, upload điểm...)
├── init.js       # Entry ES module: khởi tạo API client, storage, profiles, classes (type="module")
├── modules/      # ES modules dùng bởi init.js + auth.js (classic script, set window.AuthModule)
└── pages/        # Script riêng từng trang, include ở cuối file EJS tương ứng
```

## Cách nạp (xem `views/partials/scripts.ejs`)

1. `bootstrap.bundle.min.js` (CDN)
2. `modules/auth.js` — classic script, set `window.AuthModule` (init.js gọi `AuthModule.init()`)
3. `app.js` — classic script, expose globals cho các `onclick`/`onchange` inline
4. `init.js` — `type="module"`, import các module trong `modules/`

Script trang (`pages/*.js`) được include trực tiếp trong từng file `views/pages/*.ejs`.

## Quy ước

- Trang mới: tạo `pages/<ten-trang>.js` và include bằng `<script type="module" src="<%- assetPath('/js/pages/<ten-trang>.js') %>">` trong EJS của trang.
- Logic dùng chung: thêm ES module vào `modules/` và import từ `init.js` hoặc page script.
- Asset được version hóa qua `assetPath()` (hash tính lúc server khởi động).
