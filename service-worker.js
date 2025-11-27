const CACHE_NAME = 'clark-events-v2.1.9';
const URLS_TO_CACHE = [
    './',
    './index.html',
    './offline.html',
    './css/style.css',
    './css/loading-overlay.css',
    './js/router.js',
    './js/popup.js',
    './js/search.js',
    './js/install.js',
    './js/pull-to-refresh.js',
    './js/sw-register.js',
    './icon_32.png',
    './icon_48.png',
    './icon_64.png',
    './icon_128.png',
    './images/logo.png',
    './images/box-arrow-up-right.svg'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(URLS_TO_CACHE);
            })
            .then(() => self.skipWaiting()) // Activate immediately
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control immediately
    );
});

// Fetch event - cache first for HTML, network first for other resources
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip external requests
    if (!event.request.url.startsWith(self.location.origin)) return;

    // For HTML requests (navigation), use cache-first to ensure offline works
    if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            caches.open(CACHE_NAME)
                .then((cache) => {
                    return cache.match(event.request, { ignoreSearch: true })
                        .then((response) => {
                            if (response) {
                                return response;
                            }
                            // Try to match index.html specifically
                            return cache.match('./index.html')
                                .then((indexResponse) => {
                                    if (indexResponse) {
                                        return indexResponse;
                                    }
                                    // If not in cache, try network
                                    return fetch(event.request)
                                        .then((networkResponse) => {
                                            // Clone and cache the response
                                            const responseToCache = networkResponse.clone();
                                            cache.put(event.request, responseToCache);
                                            return networkResponse;
                                        })
                                        .catch(() => {
                                            // Network failed and not in cache, serve offline page
                                            return cache.match('./offline.html');
                                        });
                                });
                        });
                })
        );
    } else {
        // For other resources, use network-first
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Clone the response
                    const responseToCache = response.clone();

                    // Update cache with fresh content
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                })
                .catch(() => {
                    // If network fails, try cache
                    return caches.match(event.request)
                        .then((response) => {
                            if (response) {
                                return response;
                            }
                            // For non-HTML requests, return a simple message
                            return new Response('Offline - content not available', {
                                status: 503,
                                statusText: 'Service Unavailable',
                                headers: new Headers({
                                    'Content-Type': 'text/plain'
                                })
                            });
                        });
                })
        );
    }
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
