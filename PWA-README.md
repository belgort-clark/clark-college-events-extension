# Clark College Events - PWA Implementation

## What's New: Progressive Web App (PWA)

Your app is now a full Progressive Web App with offline capabilities and automatic updates!

## How It Works

### Installation
When users tap "Add to Home Screen", they're installing a full PWA that:
- Works offline (cached pages and resources)
- Loads faster on subsequent visits
- Gets automatic updates when you deploy changes

### Update Mechanism

**Automatic Background Updates:**
1. Service worker checks for updates every minute
2. When changes are detected, downloads new files in the background
3. Shows an update notification banner at the top of the page
4. User can click "Update Now" to refresh immediately, or "Later" to continue and update on next visit

**Files Included:**

- **pwa-manifest.json** - PWA configuration (app name, icons, theme colors)
- **service-worker.js** - Handles caching and updates
- **js/sw-register.js** - Registers service worker and manages update notifications

### Caching Strategy

**Network First, Cache Fallback:**
- Always tries to fetch fresh content from the server
- Updates cache with latest content automatically
- Falls back to cached version if offline
- Users always see the freshest content when online

### Version Management

To release an update:
1. Make your changes to any files
2. Update the version in `service-worker.js` (line 1: `CACHE_NAME`)
3. Deploy to your web server
4. Users will see update notification within 1 minute

**Current Version:** v1.6.5

### Update Notification

When a new version is available, users see:
```
🎉 New version available!
[Update Now] [Later]
```

- **Update Now** - Immediately refreshes with new content
- **Later** - Dismisses banner, updates on next page reload

### Offline Support

Cached files work completely offline:
- All HTML pages (popup, search, about, changelog, help)
- CSS and JavaScript files
- Images and icons
- Basic offline functionality maintained

### Testing the Update Flow

1. Install the PWA on your device
2. Make a change to any file (e.g., add text to popup.html)
3. Update version in service-worker.js: `const CACHE_NAME = 'clark-events-v1.6.6';`
4. Deploy to server
5. Open installed app - within 60 seconds you'll see the update banner
6. Click "Update Now" to see your changes

### Browser Support

- **Chrome/Edge (Android)** - Full PWA support with install prompt
- **Safari (iOS)** - Manual "Add to Home Screen" via share menu
- **Firefox** - Full PWA support on Android
- **Desktop** - Install as standalone app on Chrome/Edge

### Files Modified

All HTML pages now include:
```html
<link rel="manifest" href="pwa-manifest.json">
<script src="js/sw-register.js"></script>
```

### Important Notes

- Service worker only works on HTTPS (or localhost for testing)
- Update checks happen every 60 seconds while app is open
- Old cache versions are automatically deleted when updates activate
- Pull-to-refresh still works on the home page for manual refresh

## Troubleshooting

**Update not showing?**
- Check browser console for service worker messages
- Verify CACHE_NAME version changed
- Clear browser cache and reinstall

**Offline not working?**
- Ensure files are in URLS_TO_CACHE array in service-worker.js
- Check that service worker registered successfully (console log)

**Force update:**
- Close all tabs with the app
- Unregister service worker in DevTools > Application > Service Workers
- Reinstall the PWA
