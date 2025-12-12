# Server Layout Fix - EJS vs Static HTML

## Vấn đề

Server đã được cấu hình để sử dụng EJS template engine, nhưng vẫn còn các file HTML tĩnh gây xung đột.

## Phát hiện

### Files xung đột:
1. ✅ `public/index.html` - Redirect đến `/layouts/master.html`
2. ✅ `public/layouts/master.html` - File HTML tĩnh
3. ✅ `views/layouts/master.ejs` - Template EJS (đúng)

### Vấn đề:
- Server render EJS tại route `/`
- Nhưng `public/index.html` redirect đến file HTML tĩnh
- Gây confusion và không sử dụng được EJS features

## Giải pháp

### 1. Xóa file HTML tĩnh
```bash
# Deleted files:
- public/index.html
- public/layouts/master.html
```

### 2. Server configuration (đã đúng)
```javascript
// src/app.js
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.get('/', (req, res) => {
    res.render('layouts/master', {
        title: 'FPT Polytechnic - Hệ thống quản lý điểm',
        currentRoute: '/grade-check',
        body: ''
    });
});
```

### 3. EJS Template structure (đã đúng)
```
views/
├── layouts/
│   └── master.ejs              ✅ EJS template
├── partials/
│   ├── head-extra.ejs          ✅
│   ├── sidebar.ejs             ✅
│   ├── header.ejs              ✅
│   ├── mobile-nav.ejs          ✅
│   ├── modals.ejs              ✅
│   ├── scripts.ejs             ✅
│   └── scripts-extra.ejs       ✅
└── pages/
    └── index.ejs               ✅
```

## Request Flow (Sau khi fix)

### Trước (Sai):
```
1. User requests /
   ↓
2. Express serves public/index.html (static)
   ↓
3. index.html redirects to /layouts/master.html
   ↓
4. Browser loads master.html (static)
   ↓
5. ❌ EJS không được sử dụng
```

### Sau (Đúng):
```
1. User requests /
   ↓
2. Express route handler catches /
   ↓
3. Server renders views/layouts/master.ejs
   ↓
4. EJS processes template:
   - Includes partials
   - Evaluates variables
   - Generates HTML
   ↓
5. Server sends complete HTML
   ↓
6. ✅ EJS features work correctly
```

## Lợi ích của EJS

### 1. Server-Side Rendering
```ejs
<!-- Dynamic title -->
<title><%= title %></title>

<!-- Dynamic active state -->
<a class="<%= activeClass(currentRoute, '/profiles') %>">
```

### 2. Reusable Partials
```ejs
<%- include('../partials/sidebar') %>
<%- include('../partials/header') %>
```

### 3. View Helpers
```ejs
<%= formatDate(date) %>
<%= formatScore(score) %>
<%= statusText(passed) %>
```

### 4. Conditional Rendering
```ejs
<% if (user.isAdmin) { %>
    <button>Admin Panel</button>
<% } %>
```

## Testing

### 1. Start Server
```bash
npm start
```

### 2. Check Console
```bash
# Should see:
✅ Rendering master layout with EJS
```

### 3. Open Browser
```bash
http://localhost:3000
```

### 4. View Page Source
```bash
# Right-click → View Page Source
# Should see complete HTML (not redirect script)
# Should see EJS-generated content
```

### 5. Check Network Tab
```bash
# Open DevTools → Network
# Request to / should return HTML directly
# No redirect to /layouts/master.html
```

### 6. Test EJS Features
```javascript
// In browser console
// Check if title is set correctly
document.title; // Should be "FPT Polytechnic - Hệ thống quản lý điểm"

// Check if partials are included
document.querySelector('.sidebar'); // Should exist
document.querySelector('.top-header'); // Should exist
```

## Verification Checklist

- [x] `public/index.html` deleted
- [x] `public/layouts/master.html` deleted
- [x] `views/layouts/master.ejs` exists
- [x] All partials exist in `views/partials/`
- [x] Server configured with EJS
- [x] View helpers registered
- [x] Route renders EJS template
- [x] No redirect in HTML
- [x] EJS features work

## File Structure (Final)

```
project/
├── public/                     # Static assets only
│   ├── css/
│   ├── js/
│   └── partials/              # Client-side partials for router
├── views/                      # EJS templates
│   ├── layouts/
│   │   └── master.ejs         ✅ Server-rendered
│   ├── partials/
│   │   ├── sidebar.ejs        ✅ Server-rendered
│   │   ├── header.ejs         ✅ Server-rendered
│   │   └── ...
│   └── pages/
│       └── index.ejs
└── src/
    ├── app.js                 ✅ EJS configured
    └── helpers/
        └── view.helper.js     ✅ View helpers
```

## Common Issues

### Issue: 404 on /
**Cause:** Route not defined
**Solution:** Check `app.get('/', ...)` exists in `src/app.js`

### Issue: Template not found
**Cause:** Wrong views path
**Solution:** Check `app.set('views', path.join(__dirname, '../views'))`

### Issue: Partials not loading
**Cause:** Wrong include path
**Solution:** Use `<%- include('../partials/sidebar') %>`

### Issue: Variables undefined
**Cause:** Not passed to render
**Solution:** Pass all variables:
```javascript
res.render('layouts/master', {
    title: 'Title',
    currentRoute: '/route',
    body: ''
});
```

### Issue: Still seeing redirect
**Cause:** Browser cache
**Solution:** Hard refresh (Ctrl+Shift+R) or clear cache

## Benefits of This Fix

### ✅ Proper Architecture
- Server-side rendering with EJS
- No unnecessary redirects
- Clean separation of concerns

### ✅ Better Performance
- Single request instead of redirect
- Faster initial load
- Less network overhead

### ✅ SEO Friendly
- Complete HTML in response
- No JavaScript redirect
- Better for search engines

### ✅ Developer Experience
- Use EJS features
- Reusable partials
- View helpers
- Dynamic content

### ✅ Maintainability
- Single source of truth (EJS)
- No duplicate HTML files
- Easier to update

## Next Steps

### Recommended
1. ✅ Test all routes
2. ✅ Verify EJS features work
3. ✅ Check console for errors
4. ✅ Test navigation
5. ✅ Verify partials load

### Optional Enhancements
1. Add more EJS pages
2. Create page-specific layouts
3. Add more view helpers
4. Implement caching
5. Add error pages (404, 500)

## Conclusion

✅ **Server now correctly uses EJS templates**

Changes made:
- Deleted conflicting HTML files
- Server renders EJS at `/`
- All partials in place
- View helpers registered
- Clean architecture

The application now properly uses EJS template engine with server-side rendering while maintaining all client-side functionality.

## Quick Reference

### Render a page
```javascript
app.get('/page', (req, res) => {
    res.render('layouts/master', {
        title: 'Page Title',
        currentRoute: '/page',
        body: '<div>Content</div>'
    });
});
```

### Use view helpers
```ejs
<%= formatDate(date) %>
<%= activeClass(currentRoute, '/profiles') %>
```

### Include partials
```ejs
<%- include('../partials/sidebar') %>
```

### Pass variables
```ejs
<title><%= title %></title>
<div class="<%= className %>"></div>
```
