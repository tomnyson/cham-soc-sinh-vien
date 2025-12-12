# Debug Template Page

## Vấn đề: Trang Template hiển thị trống

### Các bước kiểm tra:

#### 1. Mở Chrome DevTools (F12)

#### 2. Vào tab Console và kiểm tra:

**Khi load trang, bạn sẽ thấy:**
```
Template Module initialized
```

**Khi click vào "Tạo Template" menu, bạn sẽ thấy:**
```
TemplateModule.show() called
Template tab activated
Tab display: block
Loading template data...
✅ Profile dropdown updated
✅ Class dropdown updated
✅ Template profile info updated
✅ Template class info updated
```

#### 3. Kiểm tra Errors

Nếu thấy các lỗi sau, đây là nguyên nhân:

**Lỗi 1: `❌ tab-template element not found!`**
- Nguyên nhân: HTML không tồn tại
- Giải pháp: Reload trang

**Lỗi 2: `⚠️ updateProfileSelect function not found`**
- Nguyên nhân: app.js chưa load
- Giải pháp: Kiểm tra thứ tự load scripts

**Lỗi 3: `401 Unauthorized` trong Network tab**
- Nguyên nhân: Chưa đăng nhập
- Giải pháp: Đăng nhập với Google

#### 4. Kiểm tra Network tab

Mở tab Network, filter "XHR", reload trang và kiểm tra:

- `GET /api/profiles` - Phải return 200 với danh sách profiles
- `GET /api/classes` - Phải return 200 với danh sách classes

Nếu return 401:
- Bạn chưa đăng nhập
- Cookie không được gửi đi

#### 5. Kiểm tra Elements tab

Tìm element `#tab-template`:

```html
<div id="tab-template" class="tab-content active">
  <!-- Nội dung template -->
</div>
```

**Phải có class `active`**

Nếu không có class `active`:
- TemplateModule.show() không được gọi
- Router có vấn đề

#### 6. Test thủ công trong Console

Paste code sau vào Console:

```javascript
// Test 1: Check element exists
console.log('Tab element:', document.getElementById('tab-template'));

// Test 2: Check module
console.log('TemplateModule:', TemplateModule);

// Test 3: Try to show
TemplateModule.show();

// Test 4: Check if visible
const tab = document.getElementById('tab-template');
console.log('Has active:', tab.classList.contains('active'));
console.log('Display:', window.getComputedStyle(tab).display);
```

### Giải pháp thường gặp:

#### Giải pháp 1: Reload trang
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

#### Giải pháp 2: Clear cache
```
1. Mở DevTools (F12)
2. Right-click vào nút Reload
3. Chọn "Empty Cache and Hard Reload"
```

#### Giải pháp 3: Kiểm tra đăng nhập
```
1. Mở Console
2. Gõ: AuthModule.checkAuthStatus()
3. Phải return true
```

#### Giải pháp 4: Manual navigate
```javascript
// Trong Console
router.navigate('/template');
```

### Debug Output mẫu (đúng):

```
Template Module initialized
GradeCheckModule initialized
ProfilesModule initialized
ClassesModule initialized
TemplateModule.show() called
Template tab activated
Tab display: block
Loading template data...
✅ Profile dropdown updated
✅ Class dropdown updated
✅ Template profile info updated
✅ Template class info updated
```

### Debug Output lỗi:

```
❌ tab-template element not found!
⚠️ updateProfileSelect function not found
⚠️ updateTemplateClass function not found
```

## Nếu vẫn không hoạt động:

1. Kiểm tra file đã được save chưa
2. Restart server: `npm start`
3. Clear browser cache hoàn toàn
4. Thử trình duyệt khác (Chrome/Firefox)
5. Kiểm tra MongoDB có kết nối không

## Liên hệ support:

Nếu vẫn không được, gửi screenshot của:
1. Console tab (có errors)
2. Network tab (API calls)
3. Elements tab (tab-template element)
