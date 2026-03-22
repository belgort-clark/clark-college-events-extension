// Clark College Events - Background Script

if (typeof ServiceWorkerGlobalScope !== 'undefined') {
    self.addEventListener('install', () => { self.skipWaiting(); });
    self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
}

const CACHE_TTL = 5 * 60 * 1000;
const ALLOWED_FEEDS = [
    "https://25livepub.collegenet.com/calendars/clark-events.rss",
    "https://25livepub.collegenet.com/calendars/training-and-development.rss"
];
const isFirefox = (typeof browser !== 'undefined');
console.log('[SW] Starting. Firefox:', isFirefox);

// Register webRequest CORS header injection
try {
    const wrApi = isFirefox ? browser.webRequest : (chrome.webRequest || null);
    if (wrApi && wrApi.onHeadersReceived) {
        wrApi.onHeadersReceived.addListener(
            (details) => {
                const headers = details.responseHeaders.filter((h) => {
                    return h.name.toLowerCase() !== 'access-control-allow-origin';
                });
                headers.push({ name: 'Access-Control-Allow-Origin', value: '*' });
                console.log('[SW] CORS header injected for:', details.url);
                return { responseHeaders: headers };
            },
            { urls: ['https://25livepub.collegenet.com/*'] },
            ['blocking', 'responseHeaders']
        );
        console.log('[SW] webRequest CORS listener registered');
    }
} catch (e) {
    console.log('[SW] webRequest error:', e.message);
}

// Message handler for Chrome (and Firefox if host perms are granted)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type !== 'fetchFeed') return false;

    const url = message.url;
    if (!ALLOWED_FEEDS.includes(url)) {
        sendResponse({ error: 'URL not allowed' });
        return false;
    }

    const cacheKey = 'feedcache_' + url;
    const now = Date.now();

    chrome.storage.local.get(cacheKey, (stored) => {
        const entry = stored[cacheKey] || null;
        if (entry && (now - entry.timestamp) < CACHE_TTL) {
            sendResponse({ text: entry.text });
            return;
        }

        console.log('[SW] Fetching:', url);
        fetch(url)
            .then((r) => {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.text();
            })
            .then((text) => {
                console.log('[SW] Fetch OK:', text.length, 'bytes');
                chrome.storage.local.set({ [cacheKey]: { text, timestamp: now } });
                sendResponse({ text });
            })
            .catch((err) => {
                console.error('[SW] Fetch failed:', err.message);
                sendResponse({ error: err.message });
            });
    });

    return true;
});

console.log('[SW] Init complete.');
