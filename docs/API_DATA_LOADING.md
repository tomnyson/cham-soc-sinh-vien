# API Data Loading Flow

## Complete Data Loading Architecture

This document explains how data flows from the MongoDB database through the API to the frontend.

## 🔄 Full Data Flow Diagram

```
┌─────────────┐
│   MongoDB   │ User's profiles & classes stored with userId
└──────┬──────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  Backend API (Express + Controllers)     │
│  - Uses req.user._id from JWT token      │
│  - Queries DB with authenticated userId  │
└──────┬───────────────────────────────────┘
       │
       ↓ HTTP Response
       │ { success: true, data: [...] }
       │
┌──────┴───────────────────────────────────┐
│  Frontend API Client (api.js)            │
│  - Sends credentials: 'include'          │
│  - Extracts data from response           │
│  - Handles 401 auth errors               │
└──────┬───────────────────────────────────┘
       │
       ↓ Returns array
       │ [{ profileId, name, weights, ... }]
       │
┌──────┴───────────────────────────────────┐
│  Profile/Class Manager (ES6 modules)     │
│  - Converts array to object              │
│  - Saves to localStorage                 │
│  - Updates UI                            │
└──────────────────────────────────────────┘
```

## 📋 Step-by-Step Flow

### Step 1: User Authentication

**Login Flow:**
```javascript
// User clicks "Đăng nhập với Google"
1. AuthModule.loginWithGoogle()
2. → Redirects to /api/auth/google
3. → Google OAuth flow
4. → Callback to /api/auth/google/callback
5. → passport.config.js creates/updates user
6. → Creates default profile for new users
7. → Sets JWT token in httpOnly cookie
8. → Redirects to /?login=success
9. → Frontend detects success, calls AuthModule.checkAuthStatus()
10. → User authenticated ✅
```

**Authentication State:**
```javascript
// After successful login
AuthModule.isAuthenticated = true
AuthModule.currentUser = {
    id: "673abc123...",
    name: "User Name",
    email: "user@example.com",
    picture: "https://...",
    role: "user"
}
```

### Step 2: Profile Loading

**Profile Loading Sequence:**

```javascript
// 1. Frontend calls API
const profiles = await apiClient.getProfiles();

// 2. API Client (public/js/modules/api.js)
async getProfiles() {
    const response = await fetch('/api/profiles', {
        credentials: 'include'  // ← Sends JWT cookie
    });

    const result = await response.json();
    return result.success ? result.data : [];
    // Returns: [{ profileId, name, passThreshold, weights, ... }]
}

// 3. Backend Route (src/routes/api.routes.js)
router.get('/profiles', authenticate, asyncHandler(profileController.getAllProfiles));
//                       ↑ Middleware checks JWT token

// 4. Auth Middleware (src/middleware/auth.middleware.js)
exports.authenticate = async (req, res, next) => {
    // Extract token from cookie
    const token = req.cookies.token;

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from DB
    const user = await User.findById(decoded.id);

    // Attach to request
    req.user = user;  // ← Available in controller
    next();
}

// 5. Profile Controller (src/controllers/profile.controller.js)
const getAllProfiles = async (req, res, next) => {
    const userId = req.user._id;  // ✅ Use authenticated user's ID

    const profiles = await profileService.getAllProfiles(userId);

    res.json({
        success: true,
        data: profiles  // Array of profile documents
    });
}

// 6. Profile Service (src/services/profile.service.js)
async getAllProfiles(userId) {
    const profiles = await Profile.find({ userId });
    // Returns profiles for THIS user only
    return profiles;
}

// 7. MongoDB Query
db.profiles.find({ userId: ObjectId("673abc123...") })
// Returns only profiles belonging to authenticated user
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "profileId": "default",
      "name": "Mặc định (60%)",
      "passThreshold": 3,
      "weights": {
        "Lab 1": 3.5,
        "Lab 2": 3.5,
        "Quiz 1": 1.5,
        "GD 1": 10
      },
      "isDefault": true,
      "createdAt": "2025-11-10T...",
      "updatedAt": "2025-11-10T..."
    }
  ]
}
```

### Step 3: Class Loading

**Same flow as profiles:**

```javascript
// Frontend
const classes = await apiClient.getClasses();

// Backend
router.get('/classes', authenticate, asyncHandler(classController.getAllClasses));

// Controller
const getAllClasses = async (req, res, next) => {
    const userId = req.user._id;  // ✅ Authenticated user
    const classes = await classService.getAllClasses(userId);
    res.json({ success: true, data: classes });
}

// Service
async getAllClasses(userId) {
    return await Class.find({ userId });
}
```

## 🔐 Security Features

### 1. Authentication Required
```javascript
// ❌ BEFORE (Insecure)
const userId = req.query.userId || 'default';
// Anyone could pass ?userId=someone-elses-id

// ✅ AFTER (Secure)
const userId = req.user._id;
// Only from authenticated JWT token
```

### 2. Data Isolation
```javascript
// Each user sees ONLY their own data
User A (id: 673abc...) → Profiles with userId: 673abc...
User B (id: 673def...) → Profiles with userId: 673def...
User C (id: 673ghi...) → Profiles with userId: 673ghi...
```

### 3. JWT Token Security
```javascript
// Token stored in httpOnly cookie
res.cookie('token', token, {
    httpOnly: true,      // ✅ Not accessible via JavaScript
    secure: production,  // ✅ HTTPS only in production
    maxAge: 7 days      // ✅ Auto-expires
});
```

### 4. Authentication Error Handling
```javascript
// API Client detects 401
if (response.status === 401) {
    // Trigger login page
    window.dispatchEvent(new CustomEvent('auth-required'));
    return response;
}

// Auth Module listens
window.addEventListener('auth-required', () => {
    this.showLoginPage();
});
```

## 📊 Data Transformation

### Backend → Frontend Conversion

**Profile Data:**
```javascript
// MongoDB Document (Map type)
{
    weights: Map {
        'Lab 1' => 3.5,
        'Lab 2' => 3.5
    }
}

// Controller converts to Object
weights: Object.fromEntries(profile.weights)

// JSON Response
{
    "weights": {
        "Lab 1": 3.5,
        "Lab 2": 3.5
    }
}

// Frontend uses directly
profile.weights['Lab 1']  // 3.5
```

**Class Data:**
```javascript
// MongoDB Document
{
    classId: "WEB123",
    name: "Web Programming",
    students: [
        { mssv: "PS12345", name: "Student A", scores: {...} }
    ]
}

// Sent as-is to frontend
// Frontend converts to object keyed by classId
this.classes = {
    "WEB123": {
        classId: "WEB123",
        name: "Web Programming",
        students: [...]
    }
}
```

## 🔄 Complete Feature Flow Example

### Example: Loading Grade Check Page

```javascript
// 1. User navigates to grade check page
router.navigate('/grade-check');

// 2. Route handler loads partial
router.loadPartial('/partials/grade-check.html');

// 3. After DOM ready, initialize
setTimeout(() => {
    updateProfileSelect();  // Populate dropdown
    GradeCheckModule.show();  // Show page
}, 50);

// 4. updateProfileSelect() uses profileManager
function updateProfileSelect() {
    const profiles = profileManager.profiles;
    // profiles = {
    //     "default": { name: "Mặc định (60%)", ... },
    //     "custom1": { name: "Custom Profile", ... }
    // }

    const select = document.getElementById('profileSelect');
    select.innerHTML = '';

    for (const [key, profile] of Object.entries(profiles)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = profile.name;
        select.appendChild(option);
    }
}

// 5. profileManager.profiles already loaded from:
// - API on page load (if online)
// - localStorage (if offline)
// - Server-rendered data (if available)
```

## 🌐 API Endpoints Reference

### Authentication Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/auth/google` | Public | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | Public | OAuth callback |
| GET | `/api/auth/check` | Optional | Check auth status |
| GET | `/api/auth/me` | Required | Get current user |
| POST | `/api/auth/logout` | Public | Logout user |

### Profile Endpoints

| Method | Endpoint | Auth | Controller Method |
|--------|----------|------|-------------------|
| GET | `/api/profiles` | Required | getAllProfiles() |
| GET | `/api/profiles/default` | Required | getDefaultProfile() |
| GET | `/api/profiles/:id` | Required | getProfileById() |
| POST | `/api/profiles` | Required | createProfile() |
| PUT | `/api/profiles/:id` | Required | updateProfile() |
| DELETE | `/api/profiles/:id` | Required | deleteProfile() |
| POST | `/api/profiles/:id/duplicate` | Required | duplicateProfile() |

### Class Endpoints

| Method | Endpoint | Auth | Controller Method |
|--------|----------|------|-------------------|
| GET | `/api/classes` | Required | getAllClasses() |
| GET | `/api/classes/:id` | Required | getClassById() |
| POST | `/api/classes` | Required | createClass() |
| PUT | `/api/classes/:id` | Required | updateClass() |
| DELETE | `/api/classes/:id` | Required | deleteClass() |
| POST | `/api/classes/:id/students` | Required | addStudent() |
| POST | `/api/classes/:id/students/bulk` | Required | addStudentsBulk() |
| DELETE | `/api/classes/:id/students/:mssv` | Required | removeStudent() |
| PUT | `/api/classes/:id/students/:mssv` | Required | updateStudent() |

## ✅ Verification Checklist

### Backend Verification
```bash
# 1. Check authentication works
curl http://localhost:3000/api/auth/check
# Response: { "success": true, "authenticated": false, "user": null }

# 2. Verify routes are protected (should return 401)
curl http://localhost:3000/api/profiles
# Response: { "success": false, "message": "Authentication required..." }

# 3. Check server logs
tail -f /tmp/server.log
# Should see: "✅ MongoDB connected successfully"
```

### Frontend Verification
```javascript
// 1. Open browser console at http://localhost:3000

// 2. Check if authenticated
console.log(AuthModule.isAuthenticated);
// false = need to login
// true = logged in

// 3. After login, check profiles loaded
console.log(profileManager.profiles);
// Should show object with profile data

// 4. Check classes loaded
console.log(classManager.classes);
// Should show object with class data

// 5. Verify API client working
await apiClient.getProfiles();
// Should return array of profiles
```

## 🐛 Troubleshooting

### Issue: "Không tìm thấy profile!"

**Cause:** User not authenticated or no profiles exist

**Solution:**
1. Login with Google OAuth
2. Default profile auto-created on first login
3. Check: `profileManager.profiles` should have data

### Issue: Profile dropdown empty

**Cause:** API not returning data or parsing error

**Debug:**
```javascript
// Check API response
const response = await fetch('/api/profiles', { credentials: 'include' });
const data = await response.json();
console.log('API Response:', data);

// Check if data extracted correctly
console.log('Profiles:', profileManager.profiles);
```

### Issue: 401 Unauthorized errors

**Cause:** Not logged in or JWT expired

**Solution:**
1. Check: `AuthModule.isAuthenticated` should be `true`
2. If false, click "Đăng nhập với Google"
3. Token expires after 7 days - need to re-login

## 📁 Files Modified

### Backend
- ✅ [src/controllers/profile.controller.js](../src/controllers/profile.controller.js) - Use `req.user._id`
- ✅ [src/controllers/class.controller.js](../src/controllers/class.controller.js) - Use `req.user._id`
- ✅ [config/passport.config.js](../config/passport.config.js) - Auto-create default profile

### Frontend
- ✅ [public/js/modules/api.js](../public/js/modules/api.js) - Extract `data` from API response, handle 401
- ✅ [public/js/modules/auth.js](../public/js/modules/auth.js) - Listen for auth-required events
- ✅ [public/js/app.js](../public/js/app.js) - Already correct (extract data from response)

## 🚀 Performance Optimizations

### 1. Parallel API Calls
```javascript
// Load profiles and classes in parallel
await Promise.all([
    profileManager.init(),
    classManager.init()
]);
```

### 2. LocalStorage Caching
```javascript
// First load: API call
// Subsequent loads: localStorage (instant)
// Background: Sync with API
```

### 3. Health Checks
```javascript
// Check server health before loading
const isHealthy = await apiClient.healthCheck();
if (isHealthy) {
    // Load from API
} else {
    // Use cached data
}
```

## 📝 Summary

**Complete Data Flow:**
1. ✅ User authenticates via Google OAuth
2. ✅ JWT token stored in httpOnly cookie
3. ✅ Frontend sends authenticated requests
4. ✅ Backend verifies JWT, extracts userId
5. ✅ Controllers use `req.user._id` (secure)
6. ✅ Services query DB with userId (isolated)
7. ✅ API returns `{ success, data }`
8. ✅ Frontend extracts data array
9. ✅ Managers convert to objects
10. ✅ UI displays user's data only

**Security:** ✅ Complete data isolation, JWT authentication
**Reliability:** ✅ Retry logic, health checks, offline support
**Performance:** ✅ Parallel loading, caching, efficient queries

---

**Last Updated:** 2025-11-10
**Status:** ✅ Complete and Verified
