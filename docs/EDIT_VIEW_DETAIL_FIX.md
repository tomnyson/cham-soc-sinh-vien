# Sửa lỗi chức năng Edit và Xem chi tiết

## Vấn đề
- Chức năng edit profile và class không hoạt động
- Chức năng xem chi tiết class không hoạt động
- Modal không hiển thị đúng cách

## Nguyên nhân

### 1. Modal Bootstrap 5 không được khởi tạo đúng cách
- Hàm `viewClassDetails` sử dụng `classList.add('show')` thay vì Bootstrap Modal API
- Hàm `closeClassDetailsModal` sử dụng `classList.remove('show')` thay vì Bootstrap Modal API

### 2. Gọi sai tên hàm
- `renderClassesList` gọi `showClassDetailView()` (từ router cũ) thay vì `viewClassDetails()`
- Router đã bị loại bỏ nhưng hàm `showClassDetailView` vẫn tồn tại trong `routes.js`

### 3. Hàm trùng lặp
- Có 2 hàm `saveClass()` trong `app.js` (dòng 871 và 1927)
- Hàm `closeClassEditor()` không dùng Bootstrap API đúng cách

### 4. Thiếu hàm
- Hàm `deleteCurrentProfile()` được gọi từ modal nhưng không tồn tại

## Giải pháp

### 1. Sửa Bootstrap Modal API
```javascript
// Trước (SAI):
document.getElementById('classDetailsModal').classList.add('show');

// Sau (ĐÚNG):
const modal = new bootstrap.Modal(document.getElementById('classDetailsModal'));
modal.show();
```

```javascript
// Trước (SAI):
function closeClassDetailsModal() {
    document.getElementById('classDetailsModal').classList.remove('show');
}

// Sau (ĐÚNG):
function closeClassDetailsModal() {
    const modalElement = document.getElementById('classDetailsModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
        modal.hide();
    }
}
```

### 2. Sửa tên hàm trong renderClassesList
```javascript
// Trước:
onclick="showClassDetailView('${cls.classId}')"

// Sau:
onclick="viewClassDetails('${cls.classId}')"
```

### 3. Xóa hàm trùng lặp
- Xóa hàm `saveClass()` đầu tiên (dòng 871-916)
- Xóa hàm `deleteClass()` (dòng 919-945) - đã có `deleteClassById()`
- Xóa hàm `closeClassEditor()` - thay bằng `closeClassModal()`

### 4. Thêm hàm deleteCurrentProfile
```javascript
async function deleteCurrentProfile() {
    if (!currentProfile) {
        alert('Không có profile nào được chọn!');
        return;
    }
    
    if (currentProfile === 'default') {
        alert('Không thể xóa profile mặc định!');
        return;
    }
    
    const profile = profiles[currentProfile];
    if (!profile) {
        alert('Không tìm thấy profile!');
        return;
    }
    
    if (!confirm(`Bạn có chắc muốn xóa profile "${profile.name}"?`)) {
        return;
    }
    
    try {
        const result = await API.deleteProfile(currentProfile);
        
        if (result.success) {
            delete profiles[currentProfile];
            currentProfile = 'default';
            updateProfileSelect();
            await renderProfilesList();
            closeProfileModal();
            alert('Đã xóa profile!');
        } else {
            alert('Lỗi xóa profile: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting profile:', error);
        alert('Lỗi: ' + error.message);
    }
}
```

## Kết quả
- ✅ Chức năng edit profile hoạt động đúng
- ✅ Chức năng edit class hoạt động đúng
- ✅ Chức năng xem chi tiết class hiển thị modal đúng cách
- ✅ Nút xóa trong modal profile hoạt động
- ✅ Modal đóng/mở đúng cách với Bootstrap 5 API

## Files đã sửa
- `public/js/app.js`: Sửa modal API, xóa hàm trùng lặp, thêm `deleteCurrentProfile()`
