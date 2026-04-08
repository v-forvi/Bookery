/// <reference lib="webworker" />

const CACHE_NAME = 'bookery-v2';
const urlsToCache = [
  '/',
  '/manifest.json',
  // Static assets will be cached automatically by Next.js
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first, fall back to network - for static assets
  cacheFirst: (request) => {
    return caches.match(request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        // Clone the response since it can only be consumed once
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      });
    });
  },

  // Network first, fall back to cache - for API calls
  networkFirst: (request) => {
    return fetch(request).then((response) => {
      // Cache the fresh response
      if (response && response.status === 200) {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
      }
      return response;
    }).catch(() => {
      // Network failed, try cache
      return caches.match(request);
    });
  },

  // Network only - for mutations
  networkOnly: (request) => {
    return fetch(request);
  },

  // Cache only - for static assets that should be cached
  cacheOnly: (request) => {
    return caches.match(request);
  },
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - handle requests based on strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  // API routes - use network first for reads, network only for writes
  if (url.pathname.startsWith('/api/')) {
    if (request.method === 'GET') {
      // For GET requests, try network first, fall back to cache
      event.respondWith(CACHE_STRATEGIES.networkFirst(request));
    } else {
      // For mutations, always use network
      event.respondWith(CACHE_STRATEGIES.networkOnly(request));
    }
    return;
  }

  // Static assets (JS, CSS, images) - cache first
  if (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(CACHE_STRATEGIES.cacheFirst(request));
    return;
  }

  // HTML pages - network first, fall back to cache for offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh page
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline - serve cached page or offline fallback
          return caches.match(request).then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // Default: cache first
  event.respondWith(CACHE_STRATEGIES.cacheFirst(request));
});

export {};
