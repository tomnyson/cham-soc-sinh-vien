# Requirements Document

## Introduction

Hệ thống hiện tại gọi API để load profiles và classes khi khởi tạo trang, nhưng thiếu xử lý lỗi và trạng thái loading đầy đủ. Điều này dẫn đến trải nghiệm người dùng kém khi API chậm hoặc thất bại. Feature này sẽ đảm bảo API load thành công với error handling, retry logic, loading states và fallback mechanisms.

## Glossary

- **Frontend Application**: Ứng dụng web chạy trên trình duyệt người dùng (public/js/app.js)
- **API Service**: Backend REST API cung cấp dữ liệu profiles và classes
- **Loading State**: Trạng thái hiển thị cho người dùng biết dữ liệu đang được tải
- **Error State**: Trạng thái hiển thị khi có lỗi xảy ra
- **Retry Mechanism**: Cơ chế tự động thử lại khi request thất bại
- **Fallback Data**: Dữ liệu dự phòng từ localStorage khi API không khả dụng
- **Health Check**: Endpoint kiểm tra trạng thái server
- **User Notification**: Thông báo hiển thị cho người dùng về trạng thái hệ thống

## Requirements

### Requirement 1

**User Story:** Là người dùng, tôi muốn thấy trạng thái loading khi trang đang tải dữ liệu, để tôi biết hệ thống đang hoạt động

#### Acceptance Criteria

1. WHEN the Frontend Application initializes, THE Frontend Application SHALL display a loading indicator
2. WHILE data is being fetched from the API Service, THE Frontend Application SHALL show loading state for profiles section
3. WHILE data is being fetched from the API Service, THE Frontend Application SHALL show loading state for classes section
4. WHEN all data has loaded successfully, THE Frontend Application SHALL hide the loading indicators
5. WHEN the loading time exceeds 5 seconds, THE Frontend Application SHALL display a message indicating slow connection

### Requirement 2

**User Story:** Là người dùng, tôi muốn hệ thống tự động retry khi API thất bại, để tôi không phải refresh trang thủ công

#### Acceptance Criteria

1. WHEN an API request fails with network error, THE Frontend Application SHALL retry the request up to 3 times
2. WHEN an API request fails with 5xx server error, THE Frontend Application SHALL retry the request with exponential backoff
3. WHEN an API request fails with 4xx client error, THE Frontend Application SHALL not retry the request
4. WHEN all retry attempts fail, THE Frontend Application SHALL display an error message to the user
5. WHEN retry is in progress, THE Frontend Application SHALL display retry attempt number to the user

### Requirement 3

**User Story:** Là người dùng, tôi muốn thấy thông báo lỗi rõ ràng khi API thất bại, để tôi biết vấn đề và cách khắc phục

#### Acceptance Criteria

1. WHEN the API Service returns an error, THE Frontend Application SHALL display a user-friendly error message
2. WHEN the API Service is unreachable, THE Frontend Application SHALL display a message indicating connection problem
3. WHEN MongoDB is not connected, THE Frontend Application SHALL display a message about database unavailability
4. WHEN an error occurs, THE Frontend Application SHALL provide an action button to retry loading data
5. WHEN displaying errors, THE Frontend Application SHALL log detailed error information to browser console for debugging

### Requirement 4

**User Story:** Là người dùng, tôi muốn hệ thống sử dụng dữ liệu đã lưu khi API không khả dụng, để tôi vẫn có thể làm việc offline

#### Acceptance Criteria

1. WHEN the API Service fails to load profiles, THE Frontend Application SHALL load Fallback Data from localStorage
2. WHEN the API Service fails to load classes, THE Frontend Application SHALL load Fallback Data from localStorage
3. WHEN using Fallback Data, THE Frontend Application SHALL display a warning message indicating offline mode
4. WHEN API becomes available again, THE Frontend Application SHALL sync local changes with the API Service
5. WHEN Fallback Data is used, THE Frontend Application SHALL save any new changes to localStorage

### Requirement 5

**User Story:** Là người dùng, tôi muốn hệ thống kiểm tra kết nối server trước khi load dữ liệu, để tránh lỗi không cần thiết

#### Acceptance Criteria

1. WHEN the Frontend Application initializes, THE Frontend Application SHALL perform a Health Check to the API Service
2. WHEN the Health Check succeeds, THE Frontend Application SHALL proceed to load profiles and classes data
3. WHEN the Health Check fails, THE Frontend Application SHALL display a connection error and use Fallback Data
4. WHEN the Health Check takes longer than 3 seconds, THE Frontend Application SHALL timeout and use Fallback Data
5. WHEN in offline mode, THE Frontend Application SHALL periodically retry the Health Check every 30 seconds

### Requirement 6

**User Story:** Là người dùng, tôi muốn thấy thông báo thành công khi dữ liệu load xong, để tôi biết hệ thống đã sẵn sàng

#### Acceptance Criteria

1. WHEN all API data loads successfully, THE Frontend Application SHALL display a success User Notification
2. WHEN profiles are loaded, THE Frontend Application SHALL show the number of profiles loaded
3. WHEN classes are loaded, THE Frontend Application SHALL show the number of classes loaded
4. WHEN using cached data, THE Frontend Application SHALL indicate data freshness timestamp
5. WHEN data is loaded, THE Frontend Application SHALL enable all interactive features

### Requirement 7

**User Story:** Là developer, tôi muốn có logging chi tiết cho các API calls, để dễ dàng debug khi có vấn đề

#### Acceptance Criteria

1. WHEN an API request is made, THE Frontend Application SHALL log the request URL and method
2. WHEN an API response is received, THE Frontend Application SHALL log the response status and data size
3. WHEN an error occurs, THE Frontend Application SHALL log the error type, message, and stack trace
4. WHEN retry is attempted, THE Frontend Application SHALL log the retry attempt number and delay
5. WHEN fallback is used, THE Frontend Application SHALL log the reason and fallback data source
