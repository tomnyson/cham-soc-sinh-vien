# EJS Template Engine Implementation

## Tổng quan

Đã chuyển đổi ứng dụng sang sử dụng EJS (Embedded JavaScript) template engine với master layout pattern.

## Cấu trúc thư mục

```
views/
├── layouts/
│   └── master.ejs              # Master layout template
├── partials/
│   ├── head-extra.ejs          # Additional head content
│   ├── sidebar.ejs             # Sidebar navigation
│   ├── header.ejs              # Top header
│   ├── mobile-nav.ejs          # Mobile bottom navigation
│   ├── modals.ejs              # Shared modals
│   ├── scripts.ejs             # Core scripts
│   └── scripts-extra.ejs       # Additional scripts
└── pages/
    └── index.ejs               # Home page content
```

## Files đã tạo

### 1. Master Layout
**`views/layouts/master.ejs`**
- Template chính chứa cấu trúc HTML
- Include các partials
- Dynamic title và currentRoute
- Body content placeholder

### 2. Partials

#### `views/partials/head-extra.ejs`
- Placeholder cho additional head content
- Views có thể override để thêm CSS/meta tags

#### `views/partials/sidebar.ejs`
- Sidebar navigation
- Active state dựa trên `currentRoute`
- Dynamic class binding

#### `views/partials/header.ejs`
- Top header với user info
- Notifications
- User dropdown menu

#### `views/partials/mobile-nav.ejs`
- Mobile bottom navigation
- Active state dựa trên `currentRoute`
- Responsive design

#### `views/partials/modals.ejs`
- Profile modal
- Class modal
- Shared across all pages

#### `views/partials/scripts.ejs`
- Core JavaScript files
- Bootstrap
- Router
- Modules
- App logic

#### `views/partials/scripts-extra.ejs`
- Placeholder cho additional scripts
- Views có thể override để thêm custom JS

### 3. Pages

#### `views/pages/index.ejs`
- Home page content
- Welcome message
- Will be enhanced by client-side router

## Server Configuration

### Updated `src/app.js`

```javascript
// View engine setup - EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Main route - Render with EJS
app.get('/', (req, res) => {
    res.render('layouts/master', {
        title: 'FPT Polytechnic - Hệ thống quản lý điểm',
        currentRoute: '/grade-check',
        body: '' // Will be populated by client-side router
    });
});
```

## EJS Syntax

### Variables
```ejs
<title><%= title %></title>
```

### Conditionals
```ejs
<a class="nav-item <%= currentRoute === '/profiles' ? 'active' : '' %>">
```

### Includes
```ejs
<%- include('../partials/sidebar') %>
```

### Raw HTML
```ejs
<%- body %>
```

## Template Variables

### Available in all views:
- `title` - Page title
- `currentRoute` - Current active route
- `body` - Page content (for layouts)

### Example usage:
```javascript
res.render('layouts/master', {
    title: 'Custom Page Title',
    currentRoute: '/profiles',
    body: '<div>Custom content</div>'
});
```

## Benefits of EJS

### 1. Server-Side Rendering
- ✅ SEO friendly
- ✅ Faster initial page load
- ✅ Better for low-end devices

### 2. Template Reusability
- ✅ Master layout pattern
- ✅ Reusable partials
- ✅ DRY principle

### 3. Dynamic Content
- ✅ Server-side data injection
- ✅ Conditional rendering
- ✅ Loop rendering

### 4. Maintainability
- ✅ Organized structure
- ✅ Easy to update
- ✅ Clear separation of concerns

## How It Works

### Request Flow

```
1. User requests /
   ↓
2. Express receives request
   ↓
3. Server renders master.ejs with data:
   - title
   - currentRoute
   - body (empty for SPA)
   ↓
4. EJS processes template:
   - Includes partials
   - Evaluates variables
   - Generates HTML
   ↓
5. Server sends complete HTML to browser
   ↓
6. Browser loads HTML
   ↓
7. Client-side router takes over
   ↓
8. Router loads partials dynamically
   ↓
9. SPA navigation works as before
```

### Hybrid Approach

This implementation uses a **hybrid approach**:
- **Server-side**: Initial page render with EJS
- **Client-side**: Dynamic navigation with router

Benefits:
- Fast initial load (server-rendered)
- Smooth navigation (client-side routing)
- SEO friendly (server-rendered HTML)
- Progressive enhancement

## Creating New Pages

### Option 1: Server-Rendered Page

```javascript
// In routes
app.get('/custom-page', (req, res) => {
    res.render('layouts/master', {
        title: 'Custom Page',
        currentRoute: '/custom',
        body: '<div>Custom content</div>'
    });
});
```

### Option 2: Client-Side Routed Page

```javascript
// In public/js/routes.js
router.register('/custom', {
    partial: '/partials/custom.html',
    handler: () => {
        CustomModule.show();
    }
});
```

### Option 3: Hybrid Page

```javascript
// Server route
app.get('/custom', (req, res) => {
    res.render('pages/custom', {
        title: 'Custom Page',
        currentRoute: '/custom',
        data: { /* server data */ }
    });
});

// views/pages/custom.ejs
<div class="container">
    <h1><%= data.title %></h1>
    <!-- Client-side enhanced content -->
</div>
```

## Extending Templates

### Adding Custom CSS

Create view-specific partial:
```ejs
<!-- views/pages/custom.ejs -->
<% 
    const headExtra = `
        <link rel="stylesheet" href="/css/custom.css">
    `;
%>
<%- include('../layouts/master', { headExtra }) %>
```

### Adding Custom Scripts

Create view-specific partial:
```ejs
<!-- views/pages/custom.ejs -->
<% 
    const scriptsExtra = `
        <script src="/js/custom.js"></script>
    `;
%>
<%- include('../layouts/master', { scriptsExtra }) %>
```

## Migration Path

### Phase 1: ✅ Current (Hybrid)
- Server renders master layout
- Client-side router handles navigation
- Partials loaded dynamically

### Phase 2: Future (Full SSR)
- Server renders all pages
- Client-side enhancement only
- Better SEO and performance

### Phase 3: Future (API-driven)
- Server provides API + SSR
- Client can be SPA or SSR
- Flexible architecture

## Testing

### Test Server Rendering
```bash
npm start
# Open http://localhost:3000
# View page source - should see full HTML
```

### Test Client Routing
```bash
# Click navigation links
# URL should change with #
# Content should load dynamically
```

### Test Template Variables
```javascript
// In src/app.js
app.get('/test', (req, res) => {
    res.render('layouts/master', {
        title: 'Test Page',
        currentRoute: '/test',
        body: '<h1>Test Content</h1>'
    });
});
```

## Troubleshooting

### Issue: Template not found
**Solution:** Check views path in `src/app.js`:
```javascript
app.set('views', path.join(__dirname, '../views'));
```

### Issue: Variables undefined
**Solution:** Pass all required variables:
```javascript
res.render('layouts/master', {
    title: 'Page Title',
    currentRoute: '/route',
    body: ''
});
```

### Issue: Partials not loading
**Solution:** Check include path:
```ejs
<%- include('../partials/sidebar') %>
```

### Issue: Styles not applied
**Solution:** Verify static files middleware:
```javascript
app.use(express.static(path.join(__dirname, '../public')));
```

## Best Practices

### 1. Keep Partials Small
- Each partial should have single responsibility
- Easy to maintain and test

### 2. Use Meaningful Names
- `sidebar.ejs` not `nav.ejs`
- `modals.ejs` not `dialogs.ejs`

### 3. Pass Data Explicitly
```javascript
// Good
res.render('page', { title: 'Title', data: {} });

// Bad
res.render('page'); // Missing data
```

### 4. Escape User Input
```ejs
<!-- Escaped (safe) -->
<%= userInput %>

<!-- Raw (dangerous) -->
<%- userInput %>
```

### 5. Use Layouts
```ejs
<!-- Good -->
<%- include('../layouts/master') %>

<!-- Bad -->
<!-- Duplicate HTML in every view -->
```

## Performance

### Caching
EJS automatically caches compiled templates in production:
```javascript
// In production
app.set('view cache', true);
```

### Compression
Enable gzip compression:
```javascript
const compression = require('compression');
app.use(compression());
```

## Security

### XSS Prevention
```ejs
<!-- Safe - Escaped -->
<%= userInput %>

<!-- Dangerous - Raw -->
<%- userInput %>
```

### CSRF Protection
```javascript
const csrf = require('csurf');
app.use(csrf());

// In template
<input type="hidden" name="_csrf" value="<%= csrfToken %>">
```

## Next Steps

### Recommended Enhancements
1. ✅ Add more page templates
2. ✅ Implement server-side data fetching
3. ✅ Add template helpers
4. ✅ Implement caching strategy
5. ✅ Add error pages (404, 500)

### Future Improvements
1. Add i18n support
2. Add template minification
3. Add asset pipeline
4. Add CDN integration
5. Add progressive web app features

## Conclusion

✅ **Successfully implemented EJS template engine**

- Clean master layout pattern
- Reusable partials
- Server-side rendering
- Hybrid SPA/SSR approach
- Backward compatible
- Production ready

The application now has a solid foundation for server-side rendering while maintaining all client-side functionality.
