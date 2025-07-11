# App Icon Badge System

This feature adds mobile app-style badges to your PWA app icon, just like how mobile apps show notification counts.

## How It Works

1. **Badge API**: Uses the modern `navigator.setAppBadge()` API
2. **Service Worker**: Handles badge updates in the background
3. **Automatic Triggers**: Badge increments for important events

## Features

### ✅ Automatic Badge Increments
- **New Tasks**: When you add a new quick task
- **Timer Completions**: When a study timer finishes
- **Task Completions**: When you mark a task as complete
- **GitHub Pushes**: Simulate code updates (for development)

### ✅ Badge Management
- **Clear on App Open**: Badge clears when you open the app (like mobile apps)
- **Manual Control**: Set specific badge counts
- **Increment/Decrement**: Add or remove badge counts

## How to Test

### 1. Add to Home Screen
First, add your app to your device's home screen:
- **iOS**: Use Safari's "Add to Home Screen" feature
- **Android**: Use Chrome's "Add to Home Screen" feature
- **Desktop**: Install as PWA from browser menu

### 2. Test Badge Functionality
Visit `badge-test.html` to test different scenarios:

```javascript
// Test functions available in console
testBadge()           // Increment badge by 1
simulateGitHubPush()   // Simulate GitHub push notification
```

### 3. Real Usage
The badge automatically increments when you:
- Add new tasks in the dashboard
- Complete study timers
- Mark tasks as complete

## Browser Support

- ✅ **Chrome/Edge**: Full support
- ✅ **Safari**: Full support (iOS 16.4+)
- ⚠️ **Firefox**: Limited support
- ❌ **Older browsers**: No support

## Code Usage

```javascript
// Increment badge (for new updates)
await window.badgeManager.incrementBadge();

// Set specific badge count
await window.badgeManager.setBadge(5);

// Clear badge
await window.badgeManager.clearBadge();

// Check current count
const count = window.badgeManager.getCurrentCount();

// Check if supported
const supported = window.badgeManager.isBadgeSupported();
```

## Integration Points

The badge system is integrated into:
- `dashboard.html` - Main app interface
- `script.js` - Task management
- `sw.js` - Service worker for background updates
- `badge-manager.js` - Core badge functionality

## Future Enhancements

- [ ] Sync badge count with server
- [ ] Different badge types (tasks, reminders, updates)
- [ ] Badge persistence across sessions
- [ ] Custom badge colors/styles

## Troubleshooting

**Badge not showing?**
1. Make sure you've added the app to home screen
2. Check browser support (Chrome/Safari recommended)
3. Grant notification permissions
4. Check console for errors

**Badge not updating?**
1. Refresh the page
2. Check service worker registration
3. Verify badge manager is loaded
4. Test with `testBadge()` in console 