// Service worker for Clark College Events extension.
// Fetches RSS feeds directly from the source and caches them in memory
// to avoid repeated network requests within the same browser session.

// Activate immediately on install so messages aren't lost during the
// waiting phase (especially important on first registration).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const ALLOWED_FEEDS = new Set([
    "https://25livepub.collegenet.com/calendars/clark-events.rss",
    "https://25livepub.collegenet.com/calendars/training-and-development.rss"
]);

// In-memory cache: url -> { text, timestamp }
const feedCache = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type !== 'fetchFeed') return false;

    const url = message.url;

    if (!ALLOWED_FEEDS.has(url)) {
        sendResponse({ error: 'URL not allowed' });
        return false;
    }

    const cached = feedCache.get(url);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION_MS) {
        sendResponse({ text: cached.text });
        return false;
    }

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            return response.text();
        })
        .then(text => {
            feedCache.set(url, { text, timestamp: Date.now() });
            sendResponse({ text });
        })
        .catch(err => {
            sendResponse({ error: err.message });
        });

    // Return true to keep the message channel open for the async response
    return true;
});
