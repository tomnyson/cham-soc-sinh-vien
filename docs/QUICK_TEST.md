# Quick Test - Template Page

## Test ngay bây giờ:

### 1. Restart server
```bash
npm start
```

### 2. Mở http://localhost:3000

### 3. Mở Console (F12)

### 4. Đăng nhập với Google

### 5. Sau khi đăng nhập, kiểm tra Console:

Bạn sẽ thấy:
```
🎯 Initializing routes...
🔧 Router initialized
📋 Registered routes: ['/', '/grade-check', '/profiles', '/classes', '/classes/detail', '/template']
🏠 Initial hash:
🔀 Router navigating to: /
✅ Route found for: /
🚀 Calling handler for: /
```

### 6. Click vào "Tạo Template" menu

Bạn sẽ thấy thêm:
```
📍 Hash changed to: /template
🔀 Router navigating to: /template
✅ Route found for: /template
🧹 Cleaning up previous route: /
🚀 Calling handler for: /template
📄 Template route handler called
✅ TemplateModule found, calling show()
TemplateModule.show() called
Template tab activated
Tab display: block
Loading template data...
```

### 7. Nếu không thấy gì:

**Test trong Console:**
```javascript
// Test 1: Check routes
console.log(router.routes)

// Test 2: Manual navigate
router.navigate('/template')

// Test 3: Check if TemplateModule exists
console.log(TemplateModule)

// Test 4: Manual show
TemplateModule.show()

// Test 5: Check element
console.log(document.getElementById('tab-template'))
```

### 8. Kiểm tra phần tử HTML:

```javascript
const tab = document.getElementById('tab-template');
console.log('Element:', tab);
console.log('Has active:', tab?.classList.contains('active'));
console.log('Display:', tab ? window.getComputedStyle(tab).display : 'null');
```

### Expected Output (Đúng):

```
Element: <div id="tab-template" class="tab-content active">...</div>
Has active: true
Display: block
```

### Error Output (Lỗi):

**Lỗi 1: Element not found**
```
Element: null
```
→ HTML không load, reload page

**Lỗi 2: Not active**
```
Has active: false
Display: none
```
→ Route handler không chạy, check router

**Lỗi 3: TemplateModule undefined**
```
❌ TemplateModule is undefined!
```
→ Script chưa load, check thứ tự scripts

## Commands để debug:

### Kiểm tra tất cả modules:
```javascript
console.log({
    AuthModule: typeof AuthModule,
    GradeCheckModule: typeof GradeCheckModule,
    ProfilesModule: typeof ProfilesModule,
    ClassesModule: typeof ClassesModule,
    TemplateModule: typeof TemplateModule,
    router: typeof router
});
```

### Force show template:
```javascript
// Remove all active
document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

// Add active to template
document.getElementById('tab-template').classList.add('active');

// Check if visible
console.log('Visible:', window.getComputedStyle(document.getElementById('tab-template')).display);
```

### Check all tabs:
```javascript
document.querySelectorAll('.tab-content').forEach(tab => {
    console.log(tab.id, {
        hasActive: tab.classList.contains('active'),
        display: window.getComputedStyle(tab).display
    });
});
```

## Nếu console không có log:

1. Console bị filter - Click "All levels"
2. Console bị clear - Uncheck "Preserve log"
3. Script error - Check Errors tab
4. Page không load scripts - Check Network tab
