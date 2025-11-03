# Implementation Plan

- [ ] 1. Add CSS styles for loading and notification UI
  - Create loading overlay styles with spinner animation
  - Create notification styles for success, error, warning, and info types
  - Add responsive design for mobile devices
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 6.1_

- [ ] 2. Implement API Client Layer with retry logic
  - [ ] 2.1 Create fetchWithRetry() function
    - Implement timeout handling with AbortController
    - Add exponential backoff for retries
    - Handle 4xx vs 5xx errors differently (no retry for 4xx)
    - Add onRetry callback for UI updates
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.1, 7.2, 7.4_
  
  - [ ] 2.2 Create healthCheck() function
    - Call /api/health endpoint with 3 second timeout
    - Return boolean for server availability
    - Log health check results
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.1, 7.2_
  
  - [ ] 2.3 Enhance API object methods
    - Update API.getProfiles() with fetchWithRetry and caching
    - Update API.getClasses() with fetchWithRetry and caching
    - Add error logging to all API methods
    - Save successful responses to localStorage cache
    - _Requirements: 2.1, 2.2, 2.5, 4.1, 4.2, 4.5, 7.1, 7.2, 7.3_

- [ ] 3. Implement UI Layer components
  - [ ] 3.1 Create LoadingManager
    - Implement init() to create loading overlay DOM
    - Implement show() to display loading with message
    - Implement updateDetails() to update loading text
    - Implement hide() to remove loading overlay
    - Implement showSlowConnection() for timeout warning
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 3.2 Create NotificationManager
    - Implement show() for generic notifications
    - Implement showSuccess() for success messages
    - Implement showError() with optional action button
    - Implement showWarning() for warnings
    - Implement showRetry() for retry notifications
    - Add auto-dismiss functionality
    - _Requirements: 2.5, 3.1, 3.2, 3.3, 3.4, 4.3, 6.1, 6.2, 6.3_
  
  - [ ] 3.3 Create error logging utility
    - Implement logError() function with context and additional info
    - Log to browser console with structured format
    - Include timestamp, error details, and stack trace
    - _Requirements: 3.5, 7.1, 7.2, 7.3, 7.5_

- [ ] 4. Enhance data initialization functions
  - [ ] 4.1 Update initDefaultProfiles()
    - Add try-catch with API call using enhanced API.getProfiles()
    - Implement fallback to localStorage cache on error
    - Show cache age when using fallback data
    - Display success notification with profile count
    - Display warning notification when using cache
    - Display error notification with retry button when no cache
    - Return boolean indicating if API load was successful
    - _Requirements: 2.1, 2.4, 2.5, 3.1, 3.4, 4.1, 4.3, 4.5, 6.1, 6.2_
  
  - [ ] 4.2 Update initClasses()
    - Add try-catch with API call using enhanced API.getClasses()
    - Implement fallback to localStorage cache on error
    - Show cache age when using fallback data
    - Display success notification with class count
    - Display warning notification when using cache
    - Display error notification with retry button when no cache
    - Return boolean indicating if API load was successful
    - _Requirements: 2.1, 2.4, 2.5, 3.1, 3.4, 4.2, 4.3, 4.5, 6.1, 6.3_

- [ ] 5. Implement main initialization flow
  - [ ] 5.1 Update DOMContentLoaded event handler
    - Initialize LoadingManager at start
    - Show loading overlay with initial message
    - Set up slow connection timer (5 seconds)
    - Perform health check before loading data
    - Call initDefaultProfiles() and initClasses() sequentially
    - Clear slow connection timer after loading
    - Hide loading overlay when complete
    - Handle initialization errors with error notification
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 6.1, 6.5_
  
  - [ ] 5.2 Implement periodic health check for offline mode
    - Create setupPeriodicHealthCheck() function
    - Check server health every 30 seconds when offline
    - Show notification when server comes back online
    - Clear interval when connection restored
    - Call setupPeriodicHealthCheck() when initial load fails
    - _Requirements: 4.4, 5.5_

- [ ] 6. Update existing API methods to save cache
  - Update API.createProfile() to invalidate and refresh cache
  - Update API.updateProfile() to invalidate and refresh cache
  - Update API.deleteProfile() to invalidate and refresh cache
  - Update API.createClass() to invalidate and refresh cache
  - Update API.updateClass() to invalidate and refresh cache
  - Update API.deleteClass() to invalidate and refresh cache
  - _Requirements: 4.4, 4.5_

- [ ] 7. Add cache management utilities
  - Create getCacheAge() function to calculate cache freshness
  - Create clearOldCache() function to remove cache older than 24 hours
  - Call clearOldCache() on initialization
  - _Requirements: 4.1, 4.2, 6.4_

- [ ] 8. Testing and validation
  - [ ] 8.1 Test normal flow with healthy server
    - Verify loading overlay appears and disappears
    - Verify success notifications show correct counts
    - Verify data loads correctly
    - _Requirements: 1.1, 1.4, 6.1, 6.2, 6.3_
  
  - [ ] 8.2 Test error scenarios
    - Test with server down (offline mode)
    - Test with slow connection (timeout warning)
    - Test with API returning errors
    - Test retry mechanism
    - Verify fallback to cache works
    - Verify error notifications with retry buttons
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3_
  
  - [ ] 8.3 Test cache functionality
    - Test cache save on successful API calls
    - Test cache load when API fails
    - Test cache age display
    - Test old cache cleanup
    - _Requirements: 4.1, 4.2, 4.5, 6.4_
  
  - [ ] 8.4 Test periodic health check
    - Test health check runs every 30 seconds in offline mode
    - Test notification when server comes back online
    - Test interval cleanup when connection restored
    - _Requirements: 5.5_
