/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * DG Gestão em Orçamentos - Service Worker Enterprise Offline-First Architecture
 */

const CACHE_NAME = 'dg-gestao-pwa-v7';

const INITIAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/splash.png',
  '/icon/icon_16x16.png',
  '/icon/icon_20x20.png',
  '/icon/icon_29x29.png',
  '/icon/icon_32x32.png',
  '/icon/icon_40x40.png',
  '/icon/icon_64x64.png',
  '/icon/icon_76x76.png',
  '/icon/icon_128x128.png',
  '/icon/icon_256x256.png',
  '/icon/icon_512x512.png',
  '/icon/icon_1024x1024.png'
];

// 1. Install event: pre-caches the main HTML shell and icons safely
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA SW] Pre-caching HTML shell, manifest and icons');
      return cache.addAll(INITIAL_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 2. Activate event: purges unused older caches to keep storage lean
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[PWA SW] Purging legacy cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. Fetch event: Network-first for shell/scripts, Stale-while-revalidate for static assets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET requests and external third-party operational traffic (Firebase, Chrome extensions, websockets)
  if (
    req.method !== 'GET' ||
    url.protocol.startsWith('chrome-extension') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.pathname.includes('ws')
  ) {
    return;
  }

  // Network-First with Cache-Fallback strategy for HTML, JavaScript bundles, CSS, and app routes
  if (
    req.mode === 'navigate' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.includes('/src/')
  ) {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(req).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Stale-While-Revalidate strategy for icons, images, favicons, fonts
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          /* Silent fallback when offline */
        });

      return cachedResponse || fetchPromise;
    })
  );
});
