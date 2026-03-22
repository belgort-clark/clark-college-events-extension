// Feed fetcher for Chrome and Firefox.
// Chrome: routes through background service worker (CORS bypassed via host_permissions).
// Firefox: first tries to grant host permissions via browser.permissions.request(),
// then uses XMLHttpRequest from the popup page. If permissions can't be granted,
// falls back to background fetch (which may work if permissions are granted later).

const FEED_CACHE_TTL = 5 * 60 * 1000;
const isFirefox = (typeof browser !== 'undefined' && navigator.userAgent.indexOf('Firefox') !== -1);

// Check and request host permissions on Firefox.
// Must be called from a user-gesture context (e.g., click handler).
async function requestHostPermissions() {
    if (!isFirefox) return true;

    const origins = ['https://25livepub.collegenet.com/*'];
    try {
        // Use the Promise-based browser.permissions API (Firefox native)
        const has = await browser.permissions.contains({ origins: origins });
        if (has) {
            console.log('[feed] Host permissions: already granted');
            return true;
        }
        console.log('[feed] Requesting host permissions via browser.permissions.request...');
        const granted = await browser.permissions.request({ origins: origins });
        console.log('[feed] Permission request result:', granted);
        return granted;
    } catch (e) {
        console.error('[feed] Permission request error:', e.message);
        return false;
    }
}

async function fetchFeedCached(url) {
    const cacheKey = 'feedcache_' + url;
    const stored = await new Promise(function (resolve) {
        chrome.storage.local.get(cacheKey, function (r) { resolve(r[cacheKey] || null); });
    });
    const now = Date.now();
    if (stored && (now - stored.timestamp) < FEED_CACHE_TTL) return stored.text;

    if (isFirefox) {
        // On Firefox, try direct XHR from the popup.
        // If host permissions have been granted, XHR will work.
        // If not, it will fail with CORS error — that's handled below.
        console.log('[feed] Firefox: trying XHR for', url);
        try {
            const text = await new Promise(function (resolve, reject) {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.onload = function () {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(xhr.responseText);
                    } else {
                        reject(new Error('HTTP ' + xhr.status));
                    }
                };
                xhr.onerror = function () { reject(new Error('XHR network error')); };
                xhr.ontimeout = function () { reject(new Error('XHR timeout')); };
                xhr.timeout = 15000;
                xhr.send();
            });
            console.log('[feed] Firefox XHR success:', text.length, 'bytes');
            chrome.storage.local.set({ [cacheKey]: { text: text, timestamp: now } });
            return text;
        } catch (xhrErr) {
            console.error('[feed] Firefox XHR failed:', xhrErr.message);
            // Fall through to background fetch
        }
    }

    // Chrome path, or Firefox fallback: route through background
    return new Promise(function (resolve, reject) {
        function trySend(attemptsLeft) {
            chrome.runtime.sendMessage({ type: 'fetchFeed', url: url }, function (response) {
                if (chrome.runtime.lastError) {
                    if (attemptsLeft > 0) {
                        setTimeout(function () { trySend(attemptsLeft - 1); }, 1000);
                    } else {
                        reject(new Error(chrome.runtime.lastError.message));
                    }
                } else if (response && response.error) {
                    reject(new Error(response.error));
                } else if (response && response.text) {
                    chrome.storage.local.set({ [cacheKey]: { text: response.text, timestamp: now } });
                    resolve(response.text);
                } else {
                    reject(new Error('Empty response from background'));
                }
            });
        }
        trySend(3);
    });
}
