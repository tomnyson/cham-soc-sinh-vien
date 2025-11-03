# Design Document

## Overview

Thiết kế này cải thiện độ tin cậy của việc load API trên giao diện bằng cách thêm:
- API wrapper với retry logic và error handling
- Loading states và UI feedback
- Health check mechanism
- Fallback to localStorage
- Comprehensive logging
- User notifications

Giải pháp tập trung vào frontend (public/js/app.js) với minimal changes ở backend để đảm bảo backward compatibility.

## Architecture

### High-Level Flow

```
┌─────────────────┐
│  Page Load      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Show Loading   │
│  Indicator      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Health Check   │◄──── Timeout: 3s
└────┬────────────┘
     │
     ├─── Success ──────┐
     │                  ▼
     │         ┌─────────────────┐
     │         │  Load Profiles  │◄──── Retry: 3x
     │         └────────┬────────┘
     │                  │
     │                  ├─── Success ──┐
     │                  │               ▼
     │                  │      ┌─────────────────┐
     │                  │      │  Load Classes   │◄──── Retry: 3x
     │                  │      └────────┬────────┘
     │                  │               │
     │                  │               ├─── Success ──┐
     │                  │               │               ▼
     │                  │               │      ┌─────────────────┐
     │                  │               │      │  Show Success   │
     │                  │               │      │  Hide Loading   │
     │                  │               │      └─────────────────┘
     │                  │               │
     │                  │               └─── Failure ──┐
     │                  │                               │
     │                  └─── Failure ──────────────────┤
     │                                                  ▼
     └─── Failure ──────────────────────────┐  ┌─────────────────┐
                                             │  │  Use Fallback   │
                                             └─►│  (localStorage) │
                                                └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │  Show Warning   │
                                                │  (Offline Mode) │
                                                └─────────────────┘
```

### Component Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Frontend (app.js)                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              API Client Layer (New)                    │  │
│  │  - fetchWithRetry()                                    │  │
│  │  - healthCheck()                                       │  │
│  │  - Enhanced API object                                 │  │
│  └────────────────────────────────────────────────────────┘  │
│                           │                                   │
│  ┌────────────────────────┼────────────────────────────────┐ │
│  │         UI Layer       │                                │ │
│  │  - LoadingManager      │                                │ │
│  │  - NotificationManager │                                │ │
│  │  - ErrorDisplay        │                                │ │
│  └────────────────────────┼────────────────────────────────┘ │
│                           │                                   │
│  ┌────────────────────────┼────────────────────────────────┐ │
│  │    Data Layer          │                                │ │
│  │  - initDefaultProfiles()  (Enhanced)                   │ │
│  │  - initClasses()          (Enhanced)                   │ │
│  │  - LocalStorage fallback                               │ │
│  └────────────────────────┼────────────────────────────────┘ │
│                           │                                   │
└───────────────────────────┼───────────────────────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │   Backend API   │
                   │  (No changes)   │
                   └─────────────────┘
```

## Components and Interfaces

### 1. API Client Layer

#### fetchWithRetry()
Wrapper function cho fetch API với retry logic và error handling.

```javascript
async function fetchWithRetry(url, options = {}, retries = 3) {
    const {
        timeout = 10000,
        retryDelay = 1000,
        onRetry = null,
        ...fetchOptions
    } = options;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            // Timeout wrapper
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Don't retry on 4xx errors
            if (response.status >= 400 && response.status < 500) {
                throw new Error(`Client error: ${response.status}`);
            }

            // Retry on 5xx errors
            if (response.status >= 500 && attempt < retries) {
                throw new Error(`Server error: ${response.status}`);
            }

            return response;

        } catch (error) {
            // Last attempt - throw error
            if (attempt === retries) {
                throw error;
            }

            // Calculate exponential backoff
            const delay = retryDelay * Math.pow(2, attempt);

            // Notify about retry
            if (onRetry) {
                onRetry(attempt + 1, retries, delay);
            }

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

#### healthCheck()
Kiểm tra server availability trước khi load data.

```javascript
async function healthCheck() {
    try {
        const response = await fetchWithRetry('/api/health', {
            timeout: 3000,
            retries: 1
        });

        const data = await response.json();
        return data.success === true;
    } catch (error) {
        console.error('Health check failed:', error);
        return false;
    }
}
```

#### Enhanced API Object
Cập nhật API object hiện tại với error handling và logging.

```javascript
const API = {
    async getProfiles() {
        try {
            const response = await fetchWithRetry('/api/profiles', {
                onRetry: (attempt, max, delay) => {
                    NotificationManager.showRetry('profiles', attempt, max);
                }
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to load profiles');
            }

            // Save to localStorage as backup
            localStorage.setItem('profiles_cache', JSON.stringify(data.data));
            localStorage.setItem('profiles_cache_time', Date.now());

            return data.data;
        } catch (error) {
            console.error('API.getProfiles error:', error);
            throw error;
        }
    },

    async getClasses() {
        try {
            const response = await fetchWithRetry('/api/classes', {
                onRetry: (attempt, max, delay) => {
                    NotificationManager.showRetry('classes', attempt, max);
                }
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to load classes');
            }

            // Save to localStorage as backup
            localStorage.setItem('classes_cache', JSON.stringify(data.data));
            localStorage.setItem('classes_cache_time', Date.now());

            return data.data;
        } catch (error) {
            console.error('API.getClasses error:', error);
            throw error;
        }
    }

    // ... other API methods remain unchanged
};
```

### 2. UI Layer

#### LoadingManager
Quản lý loading states cho các phần khác nhau của UI.

```javascript
const LoadingManager = {
    elements: {},

    init() {
        // Create loading overlay
        const overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">Đang tải dữ liệu...</div>
            <div class="loading-details"></div>
        `;
        document.body.appendChild(overlay);

        this.elements.overlay = overlay;
        this.elements.text = overlay.querySelector('.loading-text');
        this.elements.details = overlay.querySelector('.loading-details');
    },

    show(message = 'Đang tải...') {
        if (this.elements.overlay) {
            this.elements.text.textContent = message;
            this.elements.overlay.classList.add('show');
        }
    },

    updateDetails(details) {
        if (this.elements.details) {
            this.elements.details.textContent = details;
        }
    },

    hide() {
        if (this.elements.overlay) {
            this.elements.overlay.classList.remove('show');
        }
    },

    showSlowConnection() {
        this.updateDetails('⚠️ Kết nối chậm, vui lòng đợi...');
    }
};
```

#### NotificationManager
Hiển thị notifications cho user.

```javascript
const NotificationManager = {
    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${this.getIcon(type)}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        document.body.appendChild(notification);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => notification.remove(), duration);
        }

        return notification;
    },

    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    },

    showSuccess(message) {
        return this.show(message, 'success');
    },

    showError(message, actionButton = null) {
        const notification = this.show(message, 'error', 0);

        if (actionButton) {
            const btn = document.createElement('button');
            btn.className = 'notification-action';
            btn.textContent = actionButton.text;
            btn.onclick = actionButton.onClick;
            notification.appendChild(btn);
        }

        return notification;
    },

    showWarning(message) {
        return this.show(message, 'warning', 10000);
    },

    showRetry(resource, attempt, max) {
        this.show(
            `Đang thử lại tải ${resource}... (${attempt}/${max})`,
            'info',
            2000
        );
    }
};
```

### 3. Data Layer

#### Enhanced initDefaultProfiles()

```javascript
async function initDefaultProfiles() {
    try {
        LoadingManager.show('Đang tải profiles...');

        // Try to load from API
        const apiProfiles = await API.getProfiles();

        if (apiProfiles && apiProfiles.length > 0) {
            profiles = {};
            apiProfiles.forEach(profile => {
                profiles[profile.profileId] = {
                    profileId: profile.profileId,
                    name: profile.name,
                    passThreshold: profile.passThreshold,
                    weights: profile.weights
                };
            });

            if (!currentProfile && profiles['default']) {
                currentProfile = 'default';
            }

            loadProfile();
            updateProfileSelect();

            NotificationManager.showSuccess(
                `✓ Đã tải ${apiProfiles.length} profiles`
            );

            return true;
        }

    } catch (error) {
        console.error('Error loading profiles from API:', error);

        // Try fallback to localStorage
        const cached = localStorage.getItem('profiles_cache');
        const cacheTime = localStorage.getItem('profiles_cache_time');

        if (cached) {
            const cacheAge = Date.now() - parseInt(cacheTime || 0);
            const cacheAgeMinutes = Math.floor(cacheAge / 60000);

            profiles = {};
            JSON.parse(cached).forEach(profile => {
                profiles[profile.profileId] = profile;
            });

            loadProfile();
            updateProfileSelect();

            NotificationManager.showWarning(
                `⚠️ Đang dùng dữ liệu đã lưu (${cacheAgeMinutes} phút trước). ` +
                `Một số thay đổi có thể chưa được cập nhật.`
            );

            return false;
        }

        // No cache available - show error
        NotificationManager.showError(
            'Không thể tải profiles. Vui lòng kiểm tra kết nối.',
            {
                text: 'Thử lại',
                onClick: () => {
                    location.reload();
                }
            }
        );

        return false;
    }
}
```

#### Enhanced initClasses()

```javascript
async function initClasses() {
    try {
        LoadingManager.updateDetails('Đang tải classes...');

        // Try to load from API
        const apiClasses = await API.getClasses();

        if (apiClasses && apiClasses.length > 0) {
            classes = {};
            apiClasses.forEach(cls => {
                classes[cls.classId] = {
                    classId: cls.classId,
                    name: cls.name,
                    description: cls.description || '',
                    students: cls.students || []
                };
            });

            updateClassSelect();

            NotificationManager.showSuccess(
                `✓ Đã tải ${apiClasses.length} classes`
            );

            return true;
        }

    } catch (error) {
        console.error('Error loading classes from API:', error);

        // Try fallback to localStorage
        const cached = localStorage.getItem('classes_cache');
        const cacheTime = localStorage.getItem('classes_cache_time');

        if (cached) {
            const cacheAge = Date.now() - parseInt(cacheTime || 0);
            const cacheAgeMinutes = Math.floor(cacheAge / 60000);

            classes = {};
            JSON.parse(cached).forEach(cls => {
                classes[cls.classId] = cls;
            });

            updateClassSelect();

            NotificationManager.showWarning(
                `⚠️ Đang dùng dữ liệu classes đã lưu (${cacheAgeMinutes} phút trước)`
            );

            return false;
        }

        // No cache available - show error
        NotificationManager.showError(
            'Không thể tải classes. Vui lòng kiểm tra kết nối.',
            {
                text: 'Thử lại',
                onClick: () => {
                    location.reload();
                }
            }
        );

        return false;
    }
}
```

#### Main Initialization Flow

```javascript
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize UI managers
        LoadingManager.init();
        LoadingManager.show('Đang khởi tạo...');

        // Set slow connection warning
        const slowConnectionTimer = setTimeout(() => {
            LoadingManager.showSlowConnection();
        }, 5000);

        // Health check first
        const isServerHealthy = await healthCheck();

        if (!isServerHealthy) {
            console.warn('Server health check failed, using offline mode');
            NotificationManager.showWarning(
                '⚠️ Không thể kết nối server. Đang sử dụng chế độ offline.'
            );
        }

        // Load profiles and classes
        const profilesLoaded = await initDefaultProfiles();
        const classesLoaded = await initClasses();

        // Clear slow connection timer
        clearTimeout(slowConnectionTimer);

        // Hide loading
        LoadingManager.hide();

        // Setup periodic health check if offline
        if (!isServerHealthy || !profilesLoaded || !classesLoaded) {
            setupPeriodicHealthCheck();
        }

    } catch (error) {
        console.error('Initialization error:', error);
        LoadingManager.hide();
        NotificationManager.showError(
            'Lỗi khởi tạo ứng dụng: ' + error.message,
            {
                text: 'Tải lại trang',
                onClick: () => location.reload()
            }
        );
    }
});
```

#### Periodic Health Check

```javascript
let healthCheckInterval = null;

function setupPeriodicHealthCheck() {
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
    }

    healthCheckInterval = setInterval(async () => {
        const isHealthy = await healthCheck();

        if (isHealthy) {
            console.log('Server is back online');
            NotificationManager.showSuccess(
                'Kết nối đã được khôi phục!',
                {
                    text: 'Tải lại dữ liệu',
                    onClick: () => location.reload()
                }
            );
            clearInterval(healthCheckInterval);
        }
    }, 30000); // Check every 30 seconds
}
```

## Data Models

### Cache Structure (localStorage)

```javascript
// Profiles cache
{
    key: 'profiles_cache',
    value: JSON.stringify([
        {
            profileId: 'default',
            name: 'Mặc định',
            passThreshold: 3,
            weights: { ... }
        }
    ])
}

{
    key: 'profiles_cache_time',
    value: '1699123456789' // timestamp
}

// Classes cache
{
    key: 'classes_cache',
    value: JSON.stringify([
        {
            classId: 'class_123',
            name: 'SE1801',
            description: '',
            students: [...]
        }
    ])
}

{
    key: 'classes_cache_time',
    value: '1699123456789' // timestamp
}
```

## Error Handling

### Error Types and Responses

| Error Type | HTTP Status | User Message | Action |
|------------|-------------|--------------|--------|
| Network Error | N/A | "Không thể kết nối server" | Use cache, show retry |
| Timeout | N/A | "Kết nối quá chậm" | Use cache, show retry |
| 4xx Client Error | 400-499 | "Yêu cầu không hợp lệ" | Show error, no retry |
| 5xx Server Error | 500-599 | "Lỗi server" | Retry with backoff |
| MongoDB Disconnected | 503 | "Database tạm thời không khả dụng" | Use cache, retry |
| Invalid Response | 200 | "Dữ liệu không hợp lệ" | Use cache, log error |

### Error Logging

```javascript
function logError(context, error, additionalInfo = {}) {
    const errorLog = {
        timestamp: new Date().toISOString(),
        context,
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name
        },
        ...additionalInfo
    };

    console.error('Error Log:', errorLog);

    // Could send to error tracking service
    // sendToErrorTracking(errorLog);
}
```

## Testing Strategy

### Unit Tests (Optional)

1. **fetchWithRetry()**
   - Test successful request
   - Test retry on 5xx errors
   - Test no retry on 4xx errors
   - Test timeout handling
   - Test exponential backoff

2. **healthCheck()**
   - Test successful health check
   - Test failed health check
   - Test timeout

3. **LoadingManager**
   - Test show/hide
   - Test update details
   - Test slow connection warning

4. **NotificationManager**
   - Test different notification types
   - Test auto-dismiss
   - Test action buttons

### Integration Tests (Optional)

1. **Full initialization flow**
   - Test with healthy server
   - Test with unhealthy server
   - Test with slow server
   - Test with cached data

2. **Fallback mechanism**
   - Test cache usage when API fails
   - Test cache age display
   - Test no cache scenario

### Manual Testing Scenarios

1. **Normal flow**: Server healthy, all APIs working
2. **Slow connection**: Simulate slow network
3. **Server down**: Stop server, test offline mode
4. **Intermittent failures**: Random API failures
5. **Cache scenarios**: Test with old/new cache data

## CSS Styles

### Loading Overlay

```css
.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: none;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    z-index: 9999;
}

.loading-overlay.show {
    display: flex;
}

.loading-spinner {
    width: 50px;
    height: 50px;
    border: 5px solid #f3f3f3;
    border-top: 5px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.loading-text {
    color: white;
    font-size: 18px;
    margin-top: 20px;
}

.loading-details {
    color: #ccc;
    font-size: 14px;
    margin-top: 10px;
}
```

### Notifications

```css
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    min-width: 300px;
    max-width: 500px;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from {
        transform: translateX(400px);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.notification-success {
    background: #d4edda;
    border-left: 4px solid #28a745;
    color: #155724;
}

.notification-error {
    background: #f8d7da;
    border-left: 4px solid #dc3545;
    color: #721c24;
}

.notification-warning {
    background: #fff3cd;
    border-left: 4px solid #ffc107;
    color: #856404;
}

.notification-info {
    background: #d1ecf1;
    border-left: 4px solid #17a2b8;
    color: #0c5460;
}

.notification-icon {
    font-size: 20px;
    font-weight: bold;
}

.notification-message {
    flex: 1;
}

.notification-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    opacity: 0.5;
}

.notification-close:hover {
    opacity: 1;
}

.notification-action {
    margin-left: 10px;
    padding: 5px 15px;
    border: none;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.1);
    cursor: pointer;
    font-weight: bold;
}

.notification-action:hover {
    background: rgba(0, 0, 0, 0.2);
}
```

## Performance Considerations

1. **Caching Strategy**
   - Cache API responses in localStorage
   - Include timestamp for cache age
   - Clear old cache after 24 hours

2. **Request Optimization**
   - Use AbortController for timeout
   - Exponential backoff for retries
   - Parallel loading where possible

3. **UI Performance**
   - Use CSS animations for smooth transitions
   - Debounce notification updates
   - Remove notifications from DOM after animation

## Security Considerations

1. **Data Validation**
   - Validate API responses before using
   - Sanitize data before storing in localStorage
   - Check cache data integrity

2. **Error Messages**
   - Don't expose sensitive server information
   - Use generic messages for users
   - Log detailed errors to console only

## Backward Compatibility

- All existing API methods remain unchanged
- New features are additive only
- Fallback to old behavior if new features fail
- No breaking changes to existing code
