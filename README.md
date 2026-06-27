# Clark College Events

A cross-browser extension (Chrome and Firefox) that displays today's, tomorrow's, and upcoming events from Clark College's 25Live calendar system.

## Overview

Clark College Events pulls RSS feeds from Clark College's [25Live](https://25livepub.collegenet.com/) calendar platform and presents them in a clean, accessible popup. Users can browse current events, filter by keyword, search up to 60 days ahead, and expand any event for full details.

The extension is available on:

- [Chrome Web Store](https://chromewebstore.google.com/detail/clark-college-events/kmafihepapkgalfjdgogcgloamkdlkpk)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/clark-college-events/)

## Features

- **Today, Earlier Today, and Tomorrow** — events are grouped by time relevance
- **Upcoming Events** — a collapsible 10-day rolling window of future events
- **Live indicators** — orange pulse for events starting soon, green pulse for events in progress
- **Keyword filter** — real-time filtering on the home page by title, time, or description
- **Search** — search across all events up to 60 days out (minimum 3 characters)
- **Expandable details** — click the chevron button to reveal full event descriptions
- **5-minute cache** — feed data is cached locally to speed up repeat loads
- **Firefox support** — one-time permission prompt for Firefox users to grant host access

## Project Structure

```
├── manifest.json          # Extension manifest (Manifest V3)
├── popup.html             # Main popup / home page
├── search.html            # Search events page
├── about.html             # About / credits page
├── help.html              # Help & FAQ page
├── changelog.html         # Version change log
├── css/
│   ├── style.css          # Shared styles across all pages
│   └── loading-overlay.css # Loading spinner overlay
├── js/
│   ├── feed.js            # Feed fetching & caching (Chrome + Firefox)
│   ├── popup.js           # Home page logic — rendering, filtering, permissions
│   ├── search.js          # Search page logic — query, display results
│   └── service-worker.js  # Background script — CORS handling, feed proxy
├── images/
│   └── logo.png           # Extension logo
├── icon_32.png            # Toolbar icon (32×32)
├── icon_48.png            # Toolbar icon (48×48)
├── icon_64.png            # Toolbar icon (64×64)
├── icon_128.png           # Toolbar icon (128×128)
└── Google Store/           # Chrome Web Store listing assets
```

## Architecture

### Data Flow

1. **popup.js / search.js** call `fetchRssFeed()` or `fetchFeedCached()` from `feed.js`
2. **feed.js** checks `chrome.storage.local` for a cached response (5-minute TTL)
3. On cache miss:
   - **Chrome**: sends a message to `service-worker.js`, which fetches the RSS feed directly (CORS bypassed via `host_permissions`)
   - **Firefox**: first attempts a direct `XMLHttpRequest` from the popup (works if host permissions are granted), then falls back to the background script
4. The XML response is parsed with `DOMParser` and events are sorted into time buckets: today (upcoming/earlier), tomorrow, and upcoming (10-day window)
5. Events are rendered as interactive list items with expandable detail panels

### Key Files

| File | Purpose |
|------|---------|
| `manifest.json` | Manifest V3 configuration — permissions, icons, popup, background script |
| `feed.js` | Shared feed fetcher with caching; handles Chrome vs. Firefox differences |
| `popup.js` | Renders event sections, manages filter input, handles Firefox permission flow |
| `search.js` | Implements keyword search across both RSS feeds with live results |
| `service-worker.js` | Background script that proxies feed requests and injects CORS headers |
| `style.css` | All shared styles including nav, event cards, animations, and responsive layout |

### RSS Feeds

| Feed | URL |
|------|-----|
| General Events | `https://25livepub.collegenet.com/calendars/clark-events.rss` |
| Training Events | `https://25livepub.collegenet.com/calendars/training-and-development.rss` |

## Accessibility (WCAG 2.2)

The extension follows WCAG 2.2 guidelines:

- **Atkinson Hyperlegible** font — designed by the Braille Institute for low-vision readability
- **Skip-to-content links** on every page for keyboard users
- **`aria-current="page"`** identifies the active navigation item for screen readers
- **`aria-label`** on navigation landmarks
- **`aria-expanded`** and descriptive `aria-label` on every expand/collapse button (includes event title)
- **Live regions** (`role="status"`) announce filter and search result counts to screen readers
- **`prefers-reduced-motion`** — pulse animations are replaced with static border indicators; all transitions are minimized
- **Visible focus indicators** — inputs and buttons show clear outlines on keyboard focus
- **Minimum 24×24px target sizes** on interactive controls (clear buttons, info icons)
- **Proper heading hierarchy** and semantic HTML (`<main>`, `<nav>`, `<section>`)

## Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|-----------------|-------|
| Chrome  | Manifest V3     | Uses `chrome.runtime.sendMessage` for feed fetching |
| Firefox | 109.0+          | Uses `browser.permissions.request` for host permission grant; XHR fallback |

## Permissions

| Permission | Reason |
|------------|--------|
| `host_permissions` (`https://25livepub.collegenet.com/*`) | Fetch RSS feed data from 25Live |
| `storage` | Cache feed data locally for 5 minutes |

## Development

### Loading for Development

**Chrome:**
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the project folder

**Firefox:**
1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select `manifest.json` from the project folder

### Building for Submission

```bash
zip -r clark-college-events-extension.zip . -x "*.DS_Store" -x "Google Store/*" -x ".git/*"
```

## Development Team

Developed by students in Clark College's [Web Development Program](https://www.clark.edu/academics/programs/science-technology-and-engineering/web-dev/).

- **Juniper Colville** — Testing and Quality Assurance
- **Professor Bruce Elgort** — Project Lead
- **Beheshta Eqbali**
- **Dank Mitchell**
- **Andrew Sabourin**

## Version

Current version: **1.7.3**