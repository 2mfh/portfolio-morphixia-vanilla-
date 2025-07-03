// Service Worker for Morphixia Website
const CACHE_NAME = 'morphixia-v1.0.0';
const STATIC_CACHE = 'morphixia-static-v1.0.0';
const DYNAMIC_CACHE = 'morphixia-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/main.js',
    '/images/hero-digital-solutions.jpg',
    '/images/ui-ux-design.jpg',
    '/images/business-transformation.png',
    '/images/technology-innovation.jpg',
    '/manifest.json',
    '/offline.html'
];

// Files to cache on first visit
const DYNAMIC_FILES = [
    '/about',
    '/services',
    '/portfolio',
    '/blog',
    '/contact'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Service Worker: Static files cached');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Error caching static files', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve cached files or fetch from network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip external requests
    if (url.origin !== location.origin) {
        return;
    }
    
    // Handle different types of requests
    if (request.destination === 'document') {
        // HTML pages - Network first, then cache
        event.respondWith(handleDocumentRequest(request));
    } else if (request.destination === 'image') {
        // Images - Cache first, then network
        event.respondWith(handleImageRequest(request));
    } else {
        // Other assets - Cache first, then network
        event.respondWith(handleAssetRequest(request));
    }
});

// Handle document requests (HTML pages)
async function handleDocumentRequest(request) {
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful responses
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        
        throw new Error('Network response not ok');
    } catch (error) {
        console.log('Service Worker: Network failed, trying cache', error);
        
        // Try cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            return caches.match('/offline.html');
        }
        
        throw error;
    }
}

// Handle image requests
async function handleImageRequest(request) {
    try {
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Try network
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful responses
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        
        throw new Error('Network response not ok');
    } catch (error) {
        console.log('Service Worker: Image request failed', error);
        
        // Return placeholder image or throw error
        throw error;
    }
}

// Handle asset requests (CSS, JS, etc.)
async function handleAssetRequest(request) {
    try {
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Try network
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful responses
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        
        throw new Error('Network response not ok');
    } catch (error) {
        console.log('Service Worker: Asset request failed', error);
        throw error;
    }
}

// Background sync for form submissions
self.addEventListener('sync', event => {
    console.log('Service Worker: Background sync', event.tag);
    
    if (event.tag === 'contact-form') {
        event.waitUntil(syncContactForm());
    }
    
    if (event.tag === 'newsletter-form') {
        event.waitUntil(syncNewsletterForm());
    }
});

// Sync contact form submissions
async function syncContactForm() {
    try {
        const db = await openDB();
        const tx = db.transaction(['contact-forms'], 'readonly');
        const store = tx.objectStore('contact-forms');
        const forms = await store.getAll();
        
        for (const form of forms) {
            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(form.data)
                });
                
                if (response.ok) {
                    // Remove from IndexedDB after successful submission
                    const deleteTx = db.transaction(['contact-forms'], 'readwrite');
                    const deleteStore = deleteTx.objectStore('contact-forms');
                    await deleteStore.delete(form.id);
                    
                    // Notify user of successful submission
                    self.registration.showNotification('Pesan Terkirim', {
                        body: 'Pesan Anda telah berhasil dikirim.',
                        icon: '/assets/icon-192x192.png',
                        badge: '/assets/badge-72x72.png',
                        tag: 'contact-success'
                    });
                }
            } catch (error) {
                console.error('Service Worker: Failed to sync contact form', error);
            }
        }
    } catch (error) {
        console.error('Service Worker: Error in syncContactForm', error);
    }
}

// Sync newsletter subscriptions
async function syncNewsletterForm() {
    try {
        const db = await openDB();
        const tx = db.transaction(['newsletter-forms'], 'readonly');
        const store = tx.objectStore('newsletter-forms');
        const forms = await store.getAll();
        
        for (const form of forms) {
            try {
                const response = await fetch('/api/newsletter', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(form.data)
                });
                
                if (response.ok) {
                    // Remove from IndexedDB after successful submission
                    const deleteTx = db.transaction(['newsletter-forms'], 'readwrite');
                    const deleteStore = deleteTx.objectStore('newsletter-forms');
                    await deleteStore.delete(form.id);
                    
                    // Notify user of successful subscription
                    self.registration.showNotification('Newsletter Subscription', {
                        body: 'Anda telah berhasil berlangganan newsletter kami.',
                        icon: '/assets/icon-192x192.png',
                        badge: '/assets/badge-72x72.png',
                        tag: 'newsletter-success'
                    });
                }
            } catch (error) {
                console.error('Service Worker: Failed to sync newsletter form', error);
            }
        }
    } catch (error) {
        console.error('Service Worker: Error in syncNewsletterForm', error);
    }
}

// Open IndexedDB for offline form storage
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('morphixia-db', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = event => {
            const db = event.target.result;
            
            // Create object stores
            if (!db.objectStoreNames.contains('contact-forms')) {
                const contactStore = db.createObjectStore('contact-forms', { keyPath: 'id', autoIncrement: true });
                contactStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('newsletter-forms')) {
                const newsletterStore = db.createObjectStore('newsletter-forms', { keyPath: 'id', autoIncrement: true });
                newsletterStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

// Push notification handling
self.addEventListener('push', event => {
    console.log('Service Worker: Push notification received');
    
    const options = {
        body: 'Terima kasih telah mengunjungi Morphixia!',
        icon: '/assets/icon-192x192.png',
        badge: '/assets/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Jelajahi Layanan',
                icon: '/assets/action-explore.png'
            },
            {
                action: 'close',
                title: 'Tutup',
                icon: '/assets/action-close.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Morphixia', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/services')
        );
    } else if (event.action === 'close') {
        // Just close the notification
        return;
    } else {
        // Default action - open homepage
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handling from main thread
self.addEventListener('message', event => {
    console.log('Service Worker: Message received', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
    console.log('Service Worker: Periodic sync', event.tag);
    
    if (event.tag === 'content-sync') {
        event.waitUntil(syncContent());
    }
});

// Sync content in background
async function syncContent() {
    try {
        // Fetch latest blog posts or updates
        const response = await fetch('/api/content-updates');
        
        if (response.ok) {
            const data = await response.json();
            
            // Cache updated content
            const cache = await caches.open(DYNAMIC_CACHE);
            
            for (const item of data.updates) {
                try {
                    await cache.add(item.url);
                } catch (error) {
                    console.error('Service Worker: Failed to cache content update', error);
                }
            }
            
            console.log('Service Worker: Content synced successfully');
        }
    } catch (error) {
        console.error('Service Worker: Error syncing content', error);
    }
}

// Error handling
self.addEventListener('error', event => {
    console.error('Service Worker: Error', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('Service Worker: Unhandled promise rejection', event.reason);
});

console.log('Service Worker: Loaded successfully');

