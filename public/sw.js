/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Name of our offline cache
const CACHE_NAME = 'dg-gestao-v3';

// Mandatory minimal assets to cache on install
const INITIAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/favicon-48x48.png',
  '/apple-touch-icon.png',
  '/android-launcher-icon.png',
  '/splash.png',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-167.png',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-256.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',
  '/icons/maskable-icon-192.png',
  '/icons/maskable-icon-512.png',
  '/icons/maskable-icon.png'
];

// 1. Install event: pre-caches the main HTML shell and icons
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching HTML shell and icons');
      return cache.addAll(INITIAL_ASSETS);
    }).then(() => {
      // Force immediate activation
      return self.skipWaiting();
    })
  );
});

// 2. Activate event: purges unused older caches to manage device storage
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache storage:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Claim clients immediately
      return self.clients.claim();
    })
  );
});

// 3. Fetch event: intercept network requests and deliver offline-ready assets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip operational requests like extensions, dev socket HMR, chrome-extension, or HTTP POST endpoints
  if (
    req.method !== 'GET' ||
    url.protocol.startsWith('chrome-extension') ||
    url.hostname.includes('localhost') && url.port === '3001' || // Vite dev server extra socket
    url.pathname.includes('ws') // WebSocket path
  ) {
    return;
  }

  // Network-First with Cache-Fallback strategy for HTML, core JS bundles, and stylesheets
  // This ensures the user always gets the latest version when online, while ensuring offline operation
  if (
    req.mode === 'navigate' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.includes('/src/')
  ) {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          // Put a copy of the fresh resource into cache
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline, serve from cache falling back to /index.html as SPA routing anchor
          return caches.match(req).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Cache-First with Network-Fallback strategy for static image assets, fonts, icons, etc.
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Asynchronously check for update in context
        fetch(req).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, networkResponse);
            });
          }
        }).catch(() => {/* Ignore network errors silently */});
        
        return cachedResponse;
      }

      return fetch(req)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return networkResponse;
        });
    })
  );
});
