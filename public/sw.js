// Service Worker for NIRMAN AI PWA
const CACHE_NAME = 'nirman-v1.1.0';
const STATIC_CACHE = 'nirman-static-v1.1.0';
const DYNAMIC_CACHE = 'nirman-dynamic-v1.1.0';
const API_CACHE = 'nirman-api-v1.1.0';

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
  // Add other static assets
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== API_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Supabase reads get network-first caching; writes are handled by app queues.
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Skip external resources
  if (!url.hostname.includes('localhost') && !url.hostname.includes('nirman')) {
    return;
  }

  // Cache-first for static assets
  if (STATIC_ASSETS.includes(url.pathname) || url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Network-first for everything else
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// Cache-first strategy
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache-first failed:', error);
    // Return offline fallback
    return caches.match('/offline.html') || new Response('Offline', { status: 503 });
  }
}

// Network-first strategy
async function networkFirst(request, cacheName = DYNAMIC_CACHE) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network-first failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline fallback
    return caches.match('/offline.html') || new Response('Offline', { status: 503 });
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'background-sync' || event.tag === 'nirman-offline-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('[SW] Performing background sync');
  const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clientsList.forEach((client) => client.postMessage({ type: 'NIRMAN_BACKGROUND_SYNC' }));
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: data.data,
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event);

  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(syncContent());
  }
});

async function syncContent() {
  console.log('[SW] Periodic content sync');
  // Implement content sync logic
}
