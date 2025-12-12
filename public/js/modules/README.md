# Modules Documentation

This directory contains modular JavaScript code for the Grade Management System with full API reliability features.

## Module Structure

### Core Reliability Modules (ES6)

#### `logger.js`
Centralized logging for debugging and monitoring.
- **Requirement 7**: Detailed logging for API calls
- Functions:
  - `logRequest(url, method)` - Log API requests
  - `logResponse(status, dataSize, url)` - Log API responses
  - `logError(error, context)` - Log errors with stack traces
  - `logRetry(attempt, delay, reason)` - Log retry attempts
  - `logFallback(dataType, reason, source)` - Log fallback usage
  - `logSuccess(operation, details)` - Log successful operations

#### `storage.js`
LocalStorage management for offline fallback.
- **Requirement 4**: Fallback data from localStorage
- Functions:
  - `saveProfiles(profiles)` - Save profiles to localStorage
  - `loadProfiles()` - Load profiles from localStorage
  - `saveClasses(classes)` - Save classes to localStorage
  - `loadClasses()` - Load classes from localStorage
  - `getProfilesLastSync()` - Get last sync timestamp
  - `getClassesLastSync()` - Get last sync timestamp
  - `getTimeSinceSync(timestamp)` - Human-readable time difference

#### `uiState.js`
UI state management for loading indicators and notifications.
- **Requirements 1, 3, 6**: Loading states, error messages, success notifications
- Functions:
  - `showLoading(section)` - Show loading indicator
  - `hideLoading(section)` - Hide loading indicator
  - `showSlowConnectionWarning(section)` - Show slow connection warning (>5s)
  - `showNotification(message, type, duration)` - Show toast notification
  - `showError(error, retryFn, context)` - Show error with retry button
  - `showRetryNotification(attempt, maxAttempts)` - Show retry attempt

#### `api.js`
API client with retry logic and health checks.
- **Requirements 2, 5**: Retry mechanism and health checks
- Functions:
  - `healthCheck(timeout)` - Perform health check (3s timeout)
  - `startPeriodicHealthCheck()` - Start 30s periodic health check
  - `stopPeriodicHealthCheck()` - Stop periodic health check
  - `fetchWithRetry(url, options, maxRetries)` - Fetch with exponential backoff
  - `getProfiles()` - Get profiles from API
  - `createProfile(profileData)` - Create profile
  - `updateProfile(profileId, profileData)` - Update profile
  - `deleteProfile(profileId)` - Delete profile
  - `getClasses()` - Get classes from API
  - `createClass(classData)` - Create class
  - `updateClass(classId, classData)` - Update class
  - `deleteClass(classId)` - Delete class

#### `profiles.js`
Profile management with full reliability features.
- **All Requirements**: Complete implementation
- Functions:
  - `init()` - Initialize profiles with health check, retry, and fallback
  - `loadProfile()` - Load selected profile
  - `updateProfileSelect()` - Update profile dropdowns
  - `updateWeightSummary()` - Update weight summary display
  - `createNew()` - Create new profile
  - `duplicate()` - Duplicate current profile
  - `deleteById(profileId)` - Delete profile
  - `update(profileId, profileData)` - Update profile

#### `classManager.js`
Class management with full reliability features.
- **All Requirements**: Complete implementation
- Functions:
  - `init()` - Initialize classes with health check, retry, and fallback
  - `loadClass()` - Load selected class
  - `updateClassSelect()` - Update class dropdowns
  - `createNew()` - Create new class
  - `update(classId, classData)` - Update class
  - `deleteById(classId)` - Delete class

### Legacy Modules (Non-ES6)

#### `auth.js`
Authentication module (unchanged).

#### `gradeCheck.js`
Grade checking functionality (unchanged).

#### `classes.js`
Class detail view and grade management (unchanged).

#### `template.js`
Template generation (unchanged).

## Initialization Flow

1. **HTML loads** → `init.js` (ES6 module)
2. **init.js imports** all reliability modules
3. **initializeApp()** runs:
   - Shows initial loading notification
   - Calls `profileManager.init()` in parallel with `classManager.init()`
   - Each init function:
     - Shows loading indicator
     - Performs health check
     - If healthy: Loads from API with retry logic
     - If unhealthy: Falls back to localStorage
     - Shows appropriate notifications
     - Hides loading indicator
4. **Sets up event listeners** for server reconnection
5. **Exposes legacy wrappers** for backward compatibility

## Requirements Implementation

### Requirement 1: Loading States
- ✅ Loading indicators shown during data fetch
- ✅ Separate loading states for profiles and classes
- ✅ Slow connection warning after 5 seconds
- ✅ Loading indicators hidden after completion

### Requirement 2: Retry Logic
- ✅ Network errors: Retry up to 3 times
- ✅ 5xx errors: Retry with exponential backoff (1s, 2s, 4s)
- ✅ 4xx errors: No retry
- ✅ Retry attempt number shown to user
- ✅ Error message after all retries fail

### Requirement 3: Error Messages
- ✅ User-friendly error messages
- ✅ Connection problem messages
- ✅ Database unavailability messages
- ✅ Retry action button in error modal
- ✅ Detailed error logging to console

### Requirement 4: Fallback Data
- ✅ Load profiles from localStorage on API failure
- ✅ Load classes from localStorage on API failure
- ✅ Warning message for offline mode
- ✅ Sync when API becomes available
- ✅ Save changes to localStorage

### Requirement 5: Health Check
- ✅ Health check before loading data (3s timeout)
- ✅ Proceed to load data if healthy
- ✅ Use fallback data if unhealthy
- ✅ Periodic retry every 30 seconds in offline mode

### Requirement 6: Success Notifications
- ✅ Success notification after data load
- ✅ Show number of profiles loaded
- ✅ Show number of classes loaded
- ✅ Show data freshness timestamp
- ✅ Enable features after data load

### Requirement 7: Detailed Logging
- ✅ Log request URL and method
- ✅ Log response status and data size
- ✅ Log error type, message, and stack trace
- ✅ Log retry attempt number and delay
- ✅ Log fallback reason and data source

## Usage Examples

### Show a notification
```javascript
uiState.showNotification('Operation successful!', 'success', 5000);
```

### Log an API call
```javascript
logger.logRequest('/api/profiles', 'GET');
logger.logResponse(200, 1024, '/api/profiles');
```

### Perform health check
```javascript
const isHealthy = await apiClient.healthCheck();
if (isHealthy) {
    // Proceed with API calls
}
```

### Save to localStorage
```javascript
storage.saveProfiles(profiles);
const cached = storage.loadProfiles();
```

## Browser Compatibility

- ES6 modules require modern browsers (Chrome 61+, Firefox 60+, Safari 11+, Edge 16+)
- Fallback to legacy code if modules not supported
- All features work in IE11 with polyfills

## Testing

To test the reliability features:

1. **Loading states**: Throttle network in DevTools to "Slow 3G"
2. **Retry logic**: Stop the server and watch retry attempts
3. **Fallback**: Load data, stop server, refresh page
4. **Health check**: Monitor console for health check logs
5. **Notifications**: Trigger various operations and observe toasts

## Future Improvements

- [ ] Add service worker for true offline support
- [ ] Implement optimistic UI updates
- [ ] Add conflict resolution for offline changes
- [ ] Implement request queuing for offline operations
- [ ] Add network status indicator in UI
- [ ] Implement progressive data loading
