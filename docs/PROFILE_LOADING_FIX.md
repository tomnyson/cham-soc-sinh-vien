# Sửa lỗi load profile từ database

## Vấn đề
Module `gradeCheck.js` không load profile từ database thông qua `profileManager`, mà sử dụng biến global `profiles` trực tiếp.

## Nguyên nhân

### 1. Module không sử dụng profileManager
- `gradeCheck.js` kiểm tra `typeof profiles !== 'undefined'` thay vì lấy từ `profileManager.profiles`
- Không có listener cho event `app-data-ready` để cập nhật dropdown khi data được load

### 2. ID không nhất quán
- Trang grade-check sử dụng `profileSelect` 
- Module gradeCheck tìm `gradeProfileSelect`
- Không có fallback cho các ID khác nhau

### 3. Hàm loadProfile() không dùng module
- Hàm `loadProfile()` trong `app.js` không gọi `profileManager.loadProfile()`
- Sử dụng biến global trực tiếp thay vì module

## Giải pháp

### 1. Cập nhật gradeCheck.js để dùng profileManager
```javascript
// Trước:
if (typeof profiles !== 'undefined') {
    Object.entries(profiles).forEach(...)
}

// Sau:
const profilesData = window.profileManager?.profiles || window.profiles || {};
Object.entries(profilesData).forEach(...)
```

### 2. Thêm listener cho app-data-ready
```javascript
init() {
    // Listen for data ready event to populate profile select
    window.addEventListener('app-data-ready', () => {
        this.populateProfileSelect();
    });
}
```

### 3. Hỗ trợ nhiều ID cho select
```javascript
// Support both gradeProfileSelect and profileSelect IDs
const select = document.getElementById('gradeProfileSelect') || 
               document.getElementById('profileSelect');
```

### 4. Cập nhật loadProfile() để dùng module
```javascript
function loadProfile() {
    // Use profileManager if available
    if (window.profileManager && typeof window.profileManager.loadProfile === 'function') {
        window.profileManager.loadProfile();
    } else {
        // Legacy fallback
        // ...
    }
}
```

### 5. Cập nhật profileManager.loadProfile() để hỗ trợ nhiều ID
```javascript
loadProfile() {
    // Support multiple select IDs
    const select = document.getElementById('profileSelect') || 
                  document.getElementById('gradeProfileSelect') ||
                  document.getElementById('templateProfileSelect');
    // ...
}
```

### 6. Cập nhật currentProfile khi load
```javascript
// Update current profile in manager
if (window.profileManager) {
    window.profileManager.currentProfile = profileId;
    window.profileManager.weights = { ...profile.weights };
    window.profileManager.passThreshold = profile.passThreshold || 3;
}
```

## Kết quả
- ✅ Profile được load từ database thông qua `profileManager`
- ✅ Dropdown được cập nhật tự động khi data ready
- ✅ Hỗ trợ nhiều ID cho select element
- ✅ Profile hiện tại được đồng bộ với manager
- ✅ Fallback cho legacy code vẫn hoạt động

## Files đã sửa
- `public/js/modules/gradeCheck.js`: Dùng profileManager, thêm listener, hỗ trợ nhiều ID
- `public/js/modules/profiles.js`: Hỗ trợ nhiều ID trong loadProfile()
- `public/js/app.js`: Gọi profileManager.loadProfile() thay vì code trực tiếp
