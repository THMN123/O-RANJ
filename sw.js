// sw.js - Service Worker for O-RANJ App
const CACHE_NAME = 'O-RANJ-app-v1.4';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/images/photo1.png',
  '/images/photo2.png',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache all static resources
self.addEventListener('install', function(event) {
  console.log('Service Worker installing');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('Service Worker activating');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache first, then network
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        return response || fetch(event.request)
          .then(function(fetchResponse) {
            // Cache the new response
            return caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, fetchResponse.clone());
                return fetchResponse;
              });
          })
          .catch(function(error) {
            console.log('Fetch failed; returning offline page:', error);
            // If both cache and network fail, show a generic offline page
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
          });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // This would sync data when connection is restored
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_COMPLETED',
      message: 'Data synchronized successfully'
    });
  });
}

// Push notifications
self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'New survey data available',
    icon: 'images/photo1.png',
    badge: 'images/photo1.png',
    tag: 'survey-notification',
    renotify: true,
    actions: [
      {
        action: 'view',
        title: 'View Results'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'O-RANJ App', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else {
    event.waitUntil(
      clients.matchAll({type: 'window'}).then(windowClients => {
        for (let client of windowClients) {
          if (client.url.includes('/') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});