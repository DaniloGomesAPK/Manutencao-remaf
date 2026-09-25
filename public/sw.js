/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * DG Gestão em Orçamentos - Service Worker Enterprise Offline-First Architecture
 */

const CACHE_NAME = 'dg-gestao-pwa-v10';
const PDF_CACHE_NAME = 'dg-gestao-pdf-cache';

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

// 2. Activate event: purges unused older caches to keep storage lean (preserving PDF cache)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== PDF_CACHE_NAME) {
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

  // 0. On-device PDF download requests via Cache Storage (HTTPS URLs on same domain)
  if (url.pathname.startsWith('/pdf-download/')) {
    const rawFilename = url.pathname.replace('/pdf-download/', '') || 'Orçamento.pdf';
    const filename = decodeURIComponent(rawFilename);
    const safeAsciiFilename = filename.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');

    event.respondWith(
      (async () => {
        try {
          const cache = await caches.open(PDF_CACHE_NAME);
          const cachedResponse = (await cache.match(req.url)) || (await cache.match(url.pathname)) || (await cache.match(req));
          if (cachedResponse) {
            const blob = await cachedResponse.blob();
            // Remove the entry from cache only after the Blob is already in memory
            try {
              await cache.delete(req.url);
              await cache.delete(url.pathname);
              await cache.delete(req);
            } catch (delErr) {
              console.warn('[PWA SW] Cache entry cleanup error:', delErr);
            }
            return new Response(blob, {
              status: 200,
              headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
                'Content-Length': blob.size.toString(),
                'Cache-Control': 'no-store, no-cache, must-revalidate',
              },
            });
          }
          return new Response('PDF não encontrado ou expirado no cache.', { status: 404 });
        } catch (err) {
          console.error('[PWA SW] Erro ao servir PDF do cache:', err);
          return new Response('Erro ao processar download do PDF.', { status: 500 });
        }
      })()
    );
    return;
  }

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

  // 1. Navigation requests: Network-First with fallback to cached /index.html
  if (req.mode === 'navigate') {
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
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // 2. JavaScript bundles, CSS, and source assets: Network-First with Cache-Fallback (NEVER fallback to index.html)
  if (
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
          return caches.match(req);
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
