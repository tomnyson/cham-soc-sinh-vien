# JavaScript Architecture

## Structure

```
public/js/
├── router.js           # Client-side routing system
├── routes.js           # Route definitions and configuration
├── app.js             # Core application logic, API calls, utilities
├── modules/
│   ├── gradeCheck.js  # Grade checking functionality
│   ├── profiles.js    # Profile management
│   ├── classes.js     # Class management with list/detail views
│   └── template.js    # Template generation
└── README.md          # This file
```

## Router System

### Router (`router.js`)
Simple hash-based client-side router that manages navigation without page reloads.

**Features:**
- Hash-based routing (`#/route`)
- Route parameters support
- Cleanup handlers for each route
- Browser back/forward support

**Usage:**
```javascript
// Register a route
router.register('/path', {
    handler: (params) => {
        // Handle route
    },
    cleanup: () => {
        // Cleanup when leaving route
    }
});

// Navigate to a route
router.navigate('/path', { param: 'value' });
```

### Routes Configuration (`routes.js`)
Defines all application routes and maps them to module handlers.

**Routes:**
- `/` or `/grade-check` → Grade Check Module
- `/profiles` → Profiles Module
- `/classes` → Classes List View
- `/classes/detail` → Class Detail View (with classId param)
- `/template` → Template Module

## Modules

### Grade Check Module (`modules/gradeCheck.js`)
Handles grade checking functionality.

**Responsibilities:**
- Display grade check interface
- Load and display profile weights
- Process grade files
- Calculate pass/fail status

**Key Methods:**
- `show()` - Display grade check view
- `loadGradeProfile()` - Load selected profile
- `displayWeights()` - Show weight configuration

### Profiles Module (`modules/profiles.js`)
Manages profile CRUD operations.

**Responsibilities:**
- List all profiles
- Create/edit/delete profiles
- Import/export profile configurations

**Key Methods:**
- `show()` - Display profiles list
- `loadProfiles()` - Fetch and render profiles

### Classes Module (`modules/classes.js`)
Manages class and student data with list/detail views.

**Responsibilities:**
- List all classes
- Show class details with student table
- Add/remove students
- Export student lists

**Key Methods:**
- `showList()` - Display classes list view
- `showDetail(classId)` - Display class detail view
- `renderStudentsTable()` - Render students table
- `removeStudent(mssv)` - Remove student from class
- `exportStudents()` - Export to Excel

**State:**
- `currentView` - Current view ('list' or 'detail')
- `currentClassId` - Currently viewed class ID

### Template Module (`modules/template.js`)
Handles template generation.

**Responsibilities:**
- Generate Excel templates
- Select profile and class for template

**Key Methods:**
- `show()` - Display template view

## Core App (`app.js`)

Contains shared functionality:
- API client (`API` object)
- Global state (profiles, classes, etc.)
- Utility functions
- Modal handlers
- Data processing functions

## Navigation Flow

```
User clicks nav item
    ↓
switchTab(tabName) called
    ↓
Maps to route path
    ↓
router.navigate(path, params)
    ↓
Calls route handler
    ↓
Module.show() or Module.showDetail()
    ↓
Updates UI
```

## Adding New Routes

1. Create module in `modules/` directory:
```javascript
const NewModule = {
    init() { },
    show() { },
    cleanup() { }
};
window.NewModule = NewModule;
```

2. Register route in `routes.js`:
```javascript
router.register('/new-route', {
    handler: () => {
        NewModule.show();
    },
    cleanup: () => {
        NewModule.cleanup();
    }
});
```

3. Add navigation link in HTML:
```html
<a href="#" onclick="navigateTo('/new-route')">New Feature</a>
```

## Benefits

✅ **Separation of Concerns** - Each module handles its own logic
✅ **Easy to Maintain** - Clear structure and responsibilities
✅ **Reusable** - Modules can be reused across routes
✅ **Testable** - Each module can be tested independently
✅ **Scalable** - Easy to add new features/routes
✅ **Clean URLs** - Hash-based routing with meaningful paths
✅ **No Page Reloads** - SPA-like experience

## Best Practices

1. **Keep modules focused** - Each module should handle one feature
2. **Use cleanup handlers** - Clean up event listeners and timers
3. **Handle errors gracefully** - Always try/catch async operations
4. **Update navigation state** - Keep nav items in sync with routes
5. **Document new routes** - Update this README when adding routes
