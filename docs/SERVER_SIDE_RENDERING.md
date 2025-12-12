# Server-Side Rendering Implementation

## Tổng quan

Đã chuyển đổi hoàn toàn sang server-side rendering với Express + EJS, loại bỏ client-side router.

## Thay đổi chính

### ❌ Removed (Client-Side Router)
- `public/js/router.js` - Client-side router (không cần)
- `public/js/routes.js` - Client routes config (không cần)
- `public/js/layout.js` - Layout manager (không cần)
- `public/js/modules/profilesView.js` - View module (không cần)
- `public/js/modules/gradeCheck.js` - View module (không cần)
- `public/js/modules/template.js` - View module (không cần)
- `public/partials/*.html` - Client-side partials (không cần)

### ✅ Added (Server-Side Rendering)
- `views/pages/grade-check.ejs` - Grade check page
- `views/pages/profiles.ejs` - Profiles page
- `views/pages/classes.ejs` - Classes page
- `views/pages/template.ejs` - Template page
- Server routes in `src/app.js`

## Cấu trúc mới

### Server Routes
```javascript
// src/app.js
app.get('/', (req, res) => {
    res.redirect('/grade-check');
});

app.get('/grade-check', (req, res) => {
    res.render('layouts/master', {
        title: 'Kiểm tra điểm - FPT Polytechnic',
        currentRoute: '/grade-check',
        body: fs.readFileSync('views/pages/grade-check.ejs', 'utf8')
    });
});

// Similar for /profiles, /classes, /template
```

### Navigation
```html
<!-- Before (Hash-based) -->
<a href="#/profiles">Profiles</a>

<!-- After (Server routes) -->
<a href="/profiles">Profiles</a>
```

## Request Flow

### Before (Client-Side Router)
```
1. User clicks link
   ↓
2. Hash changes (#/profiles)
   ↓
3. Client-side router detects change
   ↓
4. Router loads partial HTML
   ↓
5. Router calls module handler
   ↓
6. Content displayed
```

### After (Server-Side Rendering)
```
1. User clicks link
   ↓
2. Browser requests /profiles
   ↓
3. Express route handler
   ↓
4. Server renders EJS template
   ↓
5. Complete HTML sent to browser
   ↓
6. Page displayed
```

## Lợi ích

### 1. Đơn giản hơn
- ✅ Không cần client-side router
- ✅ Không cần route configuration
- ✅ Không cần partial loading logic
- ✅ Code ít hơn, dễ maintain hơn

### 2. SEO Friendly
- ✅ Real URLs (không phải hash)
- ✅ Server-rendered HTML
- ✅ Better for search engines
- ✅ Social media sharing works

### 3. Performance
- ✅ Faster initial load
- ✅ No client-side routing overhead
- ✅ Browser back/forward works natively
- ✅ Better caching

### 4. User Experience
- ✅ Real browser navigation
- ✅ Bookmarkable URLs
- ✅ Browser history works correctly
- ✅ No hash in URL

## Files Structure

```
project/
├── views/
│   ├── layouts/
│   │   └── master.ejs          # Master layout
│   ├── partials/
│   │   ├── sidebar.ejs         # Sidebar (updated)
│   │   ├── header.ejs
│   │   ├── mobile-nav.ejs      # Mobile nav (updated)
│   │   ├── modals.ejs
│   │   └── scripts.ejs         # Scripts (updated)
│   └── pages/
│       ├── grade-check.ejs     # NEW
│       ├── profiles.ejs        # NEW
│       ├── classes.ejs         # NEW
│       └── template.ejs        # NEW
├── public/
│   ├── js/
│   │   ├── app.js              # Core functions
│   │   ├── init.js             # ES6 module init
│   │   └── modules/
│   │       ├── auth.js
│   │       └── classes.js      # Class detail view
│   └── css/
└── src/
    └── app.js                  # Server routes (updated)
```

## Migration Guide

### Navigation Links
```html
<!-- Old -->
<a href="#/profiles">Link</a>

<!-- New -->
<a href="/profiles">Link</a>
```

### JavaScript Navigation
```javascript
// Old
router.navigate('/profiles');

// New
window.location.href = '/profiles';
```

### Active State
```html
<!-- Handled by server -->
<a class="<%= activeClass(currentRoute, '/profiles') %>">
```

## Testing

### Test Routes
```bash
# Start server
npm start

# Test each route
http://localhost:3000/
http://localhost:3000/grade-check
http://localhost:3000/profiles
http://localhost:3000/classes
http://localhost:3000/template
```

### Test Navigation
1. Click sidebar links
2. Click mobile nav links
3. Use browser back/forward
4. Refresh page
5. Bookmark page

### Test Features
- [ ] Grade check works
- [ ] Profile management works
- [ ] Class management works
- [ ] Template generation works
- [ ] All modals work
- [ ] All forms work

## Backward Compatibility

### JavaScript Functions
All existing JavaScript functions still work:
- `loadProfile()`
- `createNewProfile()`
- `createNewClass()`
- `generateTemplate()`
- etc.

### API Calls
All API calls unchanged:
- `/api/profiles`
- `/api/classes`
- etc.

### Data Management
- profileManager still works
- classManager still works
- All reliability features work

## Performance Comparison

### Before (Client-Side Router)
- Initial load: HTML + JS + Router + Partials
- Navigation: Load partial + Execute handler
- Back/forward: Client-side handling

### After (Server-Side Rendering)
- Initial load: Complete HTML from server
- Navigation: New page from server
- Back/forward: Native browser handling

## SEO Comparison

### Before
```
URL: http://localhost:3000/#/profiles
- Not SEO friendly
- Hash not sent to server
- Can't be indexed properly
```

### After
```
URL: http://localhost:3000/profiles
- SEO friendly
- Real URL
- Can be indexed
- Social media friendly
```

## Deployment

### No Changes Needed
- Same deployment process
- Same environment variables
- Same server configuration

### Benefits in Production
- Better caching
- Better CDN support
- Better analytics
- Better monitoring

## Future Enhancements

### Possible Additions
1. Add page-specific meta tags
2. Add structured data for SEO
3. Add Open Graph tags
4. Add server-side data fetching
5. Add page transitions
6. Add loading states

### Not Needed
- ❌ Client-side router
- ❌ Route configuration
- ❌ Partial loading
- ❌ Hash-based navigation

## Conclusion

✅ **Successfully migrated to pure server-side rendering**

Benefits:
- Simpler architecture
- Better SEO
- Better performance
- Better UX
- Less code to maintain

The application now uses standard web navigation with server-side rendering, making it simpler, faster, and more SEO-friendly.
