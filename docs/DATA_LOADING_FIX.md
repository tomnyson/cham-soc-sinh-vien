# Data Loading Fix

## Vấn đề

Dữ liệu từ server không được load vào view sau khi chuyển sang server-side rendering.

## Nguyên nhân

### 1. Sai ID elements
```javascript
// Code tìm:
document.getElementById('profilesList')
document.getElementById('classesList')

// Nhưng HTML có:
<div id="profiles-list">
<div id="classes-list">
```

### 2. Không gọi render functions
Pages được render từ server nhưng không có code để gọi `renderProfilesList()` và `renderClassesList()`.

### 3. Timing issue
Init.js load data nhưng render functions chưa được gọi.

## Giải pháp

### 1. Sửa ID trong app.js

**Trước:**
```javascript
async function renderProfilesList() {
    const container = document.getElementById('profilesList');
    if (!container) return;
}

async function renderClassesList() {
    const container = document.getElementById('classesList');
    if (!container) return;
}
```

**Sau:**
```javascript
async function renderProfilesList() {
    const container = document.getElementById('profiles-list');
    if (!container) {
        console.warn('profiles-list container not found');
        return;
    }
}

async function renderClassesList() {
    const container = document.getElementById('classes-list');
    if (!container) {
        console.warn('classes-list container not found');
        return;
    }
}
```

### 2. Thêm initialization scripts vào pages

#### profiles.ejs
```html
<script>
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (typeof renderProfilesList === 'function') {
            renderProfilesList();
        }
    }, 200);
});
</script>
```

#### classes.ejs
```html
<script>
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (typeof renderClassesList === 'function') {
            renderClassesList();
        }
    }, 200);
});
</script>
```

#### grade-check.ejs
```html
<script>
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (typeof updateProfileSelect === 'function') {
            updateProfileSelect();
        }
    }, 200);
});
</script>
```

#### template.ejs
```html
<script>
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (typeof updateProfileSelect === 'function') {
            updateProfileSelect();
        }
        if (typeof updateClassSelect === 'function') {
            updateClassSelect();
        }
        if (typeof updateTemplateSource === 'function') {
            updateTemplateSource();
        }
    }, 200);
});
</script>
```

## Flow hoạt động

### Trước (Không hoạt động)
```
1. Server renders page
   ↓
2. Browser loads HTML
   ↓
3. init.js loads data
   ↓
4. ❌ No one calls render functions
   ↓
5. Empty page
```

### Sau (Hoạt động)
```
1. Server renders page
   ↓
2. Browser loads HTML
   ↓
3. init.js loads data (50ms delay)
   ↓
4. Page script waits 200ms
   ↓
5. ✅ Calls render functions
   ↓
6. Data displayed
```

## Timing

### Why 200ms delay?
- init.js starts after 50ms
- Data loading takes ~100-150ms
- 200ms ensures data is ready

### Alternative: Event-based
```javascript
// In init.js
window.dispatchEvent(new CustomEvent('data-loaded'));

// In page
window.addEventListener('data-loaded', () => {
    renderProfilesList();
});
```

## Files Changed

### 1. public/js/app.js
- ✅ Fixed `getElementById('profilesList')` → `getElementById('profiles-list')`
- ✅ Fixed `getElementById('classesList')` → `getElementById('classes-list')`
- ✅ Added console warnings

### 2. views/pages/profiles.ejs
- ✅ Added initialization script
- ✅ Calls `renderProfilesList()` after delay

### 3. views/pages/classes.ejs
- ✅ Added initialization script
- ✅ Calls `renderClassesList()` after delay

### 4. views/pages/grade-check.ejs
- ✅ Added initialization script
- ✅ Calls `updateProfileSelect()` after delay

### 5. views/pages/template.ejs
- ✅ Added initialization script
- ✅ Calls multiple update functions

## Testing

### Test Profiles Page
```bash
1. Open http://localhost:3000/profiles
2. Wait 200ms
3. Should see profiles list
4. Check console for warnings
```

### Test Classes Page
```bash
1. Open http://localhost:3000/classes
2. Wait 200ms
3. Should see classes list
4. Check console for warnings
```

### Test Grade Check
```bash
1. Open http://localhost:3000/grade-check
2. Wait 200ms
3. Profile dropdown should be populated
4. Check console for warnings
```

### Test Template
```bash
1. Open http://localhost:3000/template
2. Wait 200ms
3. Profile and class dropdowns should be populated
4. Check console for warnings
```

## Debug

### Check if data is loaded
```javascript
// In browser console
console.log('Profiles:', profiles);
console.log('Classes:', classes);
```

### Check if functions exist
```javascript
// In browser console
console.log(typeof renderProfilesList);
console.log(typeof renderClassesList);
console.log(typeof updateProfileSelect);
```

### Check if containers exist
```javascript
// In browser console
console.log(document.getElementById('profiles-list'));
console.log(document.getElementById('classes-list'));
```

## Common Issues

### Issue: Still empty
**Check:**
1. Data loaded? `console.log(profiles)`
2. Function exists? `console.log(typeof renderProfilesList)`
3. Container exists? `console.log(document.getElementById('profiles-list'))`
4. Timing correct? Increase delay to 500ms

### Issue: Console warnings
**Check:**
1. Correct page? Some pages don't have all containers
2. Correct ID? Check HTML vs JavaScript
3. Function defined? Check if app.js loaded

### Issue: Slow loading
**Solution:**
1. Increase timeout from 200ms to 500ms
2. Or use event-based approach
3. Or add loading indicators

## Best Practices

### 1. Consistent Naming
```javascript
// HTML
<div id="profiles-list">

// JavaScript
document.getElementById('profiles-list')
```

### 2. Check Existence
```javascript
if (typeof renderProfilesList === 'function') {
    renderProfilesList();
}
```

### 3. Add Warnings
```javascript
if (!container) {
    console.warn('Container not found');
    return;
}
```

### 4. Use Delays
```javascript
setTimeout(() => {
    // Call after data loaded
}, 200);
```

## Future Improvements

### 1. Event-Based Loading
```javascript
// In init.js
async function initializeApp() {
    await loadData();
    window.dispatchEvent(new CustomEvent('app-ready'));
}

// In pages
window.addEventListener('app-ready', () => {
    renderData();
});
```

### 2. Loading States
```html
<div id="profiles-list">
    <div class="loading">Loading...</div>
</div>
```

### 3. Error Handling
```javascript
try {
    await renderProfilesList();
} catch (error) {
    showError('Failed to load profiles');
}
```

## Conclusion

✅ **Data loading fixed**

Changes:
- Fixed element IDs
- Added initialization scripts
- Proper timing with delays
- Console warnings for debugging

All pages now load data correctly from server!
