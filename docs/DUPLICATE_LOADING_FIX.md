# Duplicate Loading Fix

## Vấn đề

Loading indicators và data initialization bị duplicate - chạy nhiều lần.

## Nguyên nhân

### Multiple DOMContentLoaded Listeners

```javascript
// init.js
document.addEventListener('DOMContentLoaded', () => {
    initializeApp(); // Load data
});

// profiles.ejs
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        renderProfilesList(); // Trigger another load
    }, 200);
});

// classes.ejs
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        renderClassesList(); // Trigger another load
    }, 200);
});
```

### Kết quả:
- Data được load 2 lần
- Loading indicators xuất hiện 2 lần
- API calls duplicate
- Performance kém

## Giải pháp: Custom Event

### 1. Dispatch event sau khi data ready

**File: `public/js/init.js`**

```javascript
async function initializeApp() {
    try {
        // Load data
        await Promise.all([
            profileManager.init(),
            classManager.init()
        ]);
        
        // ✅ Dispatch custom event
        window.dispatchEvent(new CustomEvent('app-data-ready'));
        
    } catch (error) {
        // Handle error
    }
}
```

### 2. Listen custom event trong pages

**Trước (DOMContentLoaded):**
```javascript
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        renderProfilesList();
    }, 200);
});
```

**Sau (Custom Event):**
```javascript
window.addEventListener('app-data-ready', function() {
    renderProfilesList();
});
```

## Flow hoạt động

### Trước (Duplicate)
```
1. Browser loads page
   ↓
2. DOMContentLoaded fires
   ↓
3. init.js starts loading (50ms delay)
   ├─→ profileManager.init()
   └─→ classManager.init()
   ↓
4. Page script starts (200ms delay)
   ├─→ renderProfilesList() → triggers another load
   └─→ renderClassesList() → triggers another load
   ↓
5. ❌ Duplicate loading!
```

### Sau (Single Load)
```
1. Browser loads page
   ↓
2. DOMContentLoaded fires
   ↓
3. init.js starts loading (50ms delay)
   ├─→ profileManager.init()
   └─→ classManager.init()
   ↓
4. Data loaded successfully
   ↓
5. ✅ Dispatch 'app-data-ready' event
   ↓
6. Pages listen and render
   ├─→ renderProfilesList()
   └─→ renderClassesList()
   ↓
7. ✅ Single load, no duplicate!
```

## Files Changed

### 1. public/js/init.js
```javascript
// Added after successful initialization
window.dispatchEvent(new CustomEvent('app-data-ready'));
```

### 2. views/pages/profiles.ejs
```javascript
// Changed from DOMContentLoaded to custom event
window.addEventListener('app-data-ready', function() {
    renderProfilesList();
});
```

### 3. views/pages/classes.ejs
```javascript
// Changed from DOMContentLoaded to custom event
window.addEventListener('app-data-ready', function() {
    renderClassesList();
});
```

### 4. views/pages/grade-check.ejs
```javascript
// Changed from DOMContentLoaded to custom event
window.addEventListener('app-data-ready', function() {
    updateProfileSelect();
});
```

### 5. views/pages/template.ejs
```javascript
// Changed from DOMContentLoaded to custom event
window.addEventListener('app-data-ready', function() {
    updateProfileSelect();
    updateClassSelect();
    updateTemplateSource();
});
```

## Benefits

### 1. No Duplicate Loading
- ✅ Data loaded once
- ✅ API called once
- ✅ Loading indicators show once

### 2. Better Performance
- ✅ Faster page load
- ✅ Less network traffic
- ✅ Less CPU usage

### 3. Cleaner Code
- ✅ Event-driven architecture
- ✅ Clear separation of concerns
- ✅ No timing hacks (setTimeout)

### 4. More Reliable
- ✅ Data guaranteed to be ready
- ✅ No race conditions
- ✅ Predictable behavior

## Testing

### Test No Duplicate
```bash
1. Open browser DevTools
2. Go to Network tab
3. Open http://localhost:3000/profiles
4. Check API calls
5. Should see only 1 call to /api/profiles
6. Should see only 1 call to /api/classes
```

### Test Console
```bash
1. Open browser Console
2. Open http://localhost:3000/profiles
3. Should see:
   - [Success] initProfiles (once)
   - [Success] initClasses (once)
4. Should NOT see duplicate logs
```

### Test Loading Indicators
```bash
1. Throttle network to "Slow 3G"
2. Open http://localhost:3000/profiles
3. Should see loading indicator once
4. Should NOT see duplicate indicators
```

## Debug

### Check event dispatch
```javascript
// In browser console
window.addEventListener('app-data-ready', () => {
    console.log('app-data-ready fired!');
});
```

### Check event listeners
```javascript
// In browser console
getEventListeners(window);
// Should see 'app-data-ready' listeners
```

### Manual trigger
```javascript
// In browser console
window.dispatchEvent(new CustomEvent('app-data-ready'));
// Should trigger page renders
```

## Common Issues

### Issue: Event not firing
**Check:**
1. init.js loaded? Check Network tab
2. Data loaded successfully? Check Console
3. Event dispatched? Add console.log before dispatch

### Issue: Event fires multiple times
**Check:**
1. Multiple listeners? Check getEventListeners(window)
2. Page reloaded? Event listeners persist
3. Navigation? Use once: true option

### Issue: Data not ready
**Check:**
1. Event fires too early? Add delay
2. Async issue? Use Promise.all
3. Error in init? Check error handling

## Best Practices

### 1. Use Custom Events
```javascript
// Good
window.dispatchEvent(new CustomEvent('app-data-ready'));

// Bad
setTimeout(() => { /* hope data is ready */ }, 200);
```

### 2. Single Source of Truth
```javascript
// Good - init.js loads data once
initializeApp();

// Bad - multiple places load data
initDefaultProfiles();
initClasses();
renderProfilesList(); // loads again
```

### 3. Event-Driven
```javascript
// Good
window.addEventListener('app-data-ready', render);

// Bad
setInterval(checkIfDataReady, 100);
```

### 4. Clean Listeners
```javascript
// Good - auto cleanup
window.addEventListener('app-data-ready', render, { once: true });

// Bad - manual cleanup needed
window.addEventListener('app-data-ready', render);
```

## Future Improvements

### 1. Loading States
```javascript
window.dispatchEvent(new CustomEvent('app-loading-start'));
// ... load data ...
window.dispatchEvent(new CustomEvent('app-data-ready'));
```

### 2. Error Events
```javascript
window.dispatchEvent(new CustomEvent('app-error', {
    detail: { error: error }
}));
```

### 3. Progress Events
```javascript
window.dispatchEvent(new CustomEvent('app-progress', {
    detail: { loaded: 1, total: 2 }
}));
```

## Conclusion

✅ **Duplicate loading fixed**

Changes:
- Custom event 'app-data-ready'
- Pages listen to event
- No more DOMContentLoaded timing hacks
- Single data load
- Better performance

No more duplicate loading! 🎉
