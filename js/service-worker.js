// Clark College Events - Background Script

if (typeof ServiceWorkerGlobalScope !== 'undefined') {
    self.addEventListener('install', function () { self.skipWaiting(); });
    self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
}

var CACHE_TTL = 5 * 60 * 1000;
var ALLOWED_FEEDS = [
    "https://25livepub.collegenet.com/calendars/clark-events.rss",
    "https://25livepub.collegenet.com/calendars/training-and-development.rss"
];
var isFirefox = (typeof browser !== 'undefined');
console.log('[SW] Starting. Firefox:', isFirefox);

// Register webRequest CORS header injection
try {
    var wrApi = isFirefox ? browser.webRequest : (chrome.webRequest || null);
    if (wrApi && wrApi.onHeadersReceived) {
        wrApi.onHeadersReceived.addListener(
            function (details) {
                var headers = details.responseHeaders.filter(function (h) {
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
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type !== 'fetchFeed') return false;

    var url = message.url;
    if (ALLOWED_FEEDS.indexOf(url) === -1) {
        sendResponse({ error: 'URL not allowed' });
        return false;
    }

    var cacheKey = 'feedcache_' + url;
    var now = Date.now();

    chrome.storage.local.get(cacheKey, function (stored) {
        var entry = stored[cacheKey] || null;
        if (entry && (now - entry.timestamp) < CACHE_TTL) {
            sendResponse({ text: entry.text });
            return;
        }

        console.log('[SW] Fetching:', url);
        fetch(url)
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.text();
            })
            .then(function (text) {
                console.log('[SW] Fetch OK:', text.length, 'bytes');
                chrome.storage.local.set({ [cacheKey]: { text: text, timestamp: now } });
                sendResponse({ text: text });
            })
            .catch(function (err) {
                console.error('[SW] Fetch failed:', err.message);
                sendResponse({ error: err.message });
            });
    });

    return true;
});

console.log('[SW] Init complete.');
