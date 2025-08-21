const CACHE_NAME = 'teleprompter-v1.0.0';
// Support both local development and GitHub Pages deployment
const BASE_PATH = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? '' : '/video-prompter';
const STATIC_ASSETS = [
    BASE_PATH + '/',
    BASE_PATH + '/index.html',
    BASE_PATH + '/styles.css',
    BASE_PATH + '/app.js',
    BASE_PATH + '/components/DragHandler.js',
    BASE_PATH + '/components/ResizeHandler.js',
    BASE_PATH + '/components/TouchHandler.js',
    BASE_PATH + '/components/VideoComponent.js',
    BASE_PATH + '/components/ScriptComponent.js',
    BASE_PATH + '/components/ControlsComponent.js',
    BASE_PATH + '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Service Worker: Installed and cached assets');
                return self.skipWaiting(); // Activate immediately
            })
            .catch((error) => {
                console.error('Service Worker: Failed to cache assets', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Activated');
            return self.clients.claim(); // Take control of all clients
        })
    );
});

// Fetch event - serve from cache first, then network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip requests with schemes other than http/https
    if (!event.request.url.startsWith('http')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    console.log('Service Worker: Serving from cache', event.request.url);
                    return cachedResponse;
                }
                
                console.log('Service Worker: Fetching from network', event.request.url);
                return fetch(event.request)
                    .then((response) => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response before caching
                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch((error) => {
                        console.error('Service Worker: Fetch failed', error);
                        
                        // Return a custom offline page or response if needed
                        if (event.request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                        
                        throw error;
                    });
            })
    );
});

// Background sync for potential future features
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

function doBackgroundSync() {
    // Placeholder for background sync functionality
    // Could be used for uploading recordings when connection is restored
    return Promise.resolve();
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
    console.log('Service Worker: Received message', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

// Notification handling (for future features)
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification click', event.notification.tag);
    
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('/')
    );
});

// Push message handling (for future features)
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push message received', event);
    
    // Handle push notifications if needed in the future
});

// Error handling
self.addEventListener('error', (event) => {
    console.error('Service Worker: Error', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker: Unhandled promise rejection', event.reason);
});
