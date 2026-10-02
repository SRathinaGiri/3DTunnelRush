// Service Worker for 3D Tunnel Rush PWA
const CACHE_VERSION = 'tunnel-rush-v4.2.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/lib/three.min.js',
  './js/app.js',
  './js/renderer.js',
  './js/tunnel.js',
  './js/player.js',
  './js/controls.js',
  './js/audio.js',
  './js/ui.js',
  './js/hud3d.js',
  './manifest.json',
  './assets/favicon.svg'
];

self.addEventListener('install', (event) => {
  console.log(`[SW ${CACHE_VERSION}] Installing Service Worker...`);
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      console.log(`[SW ${CACHE_VERSION}] Caching core game assets...`);
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn(`[SW ${CACHE_VERSION}] Pre-cache warning:`, err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log(`[SW ${CACHE_VERSION}] Activating Service Worker...`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_VERSION) {
            console.log(`[SW ${CACHE_VERSION}] Purging old cache: ${cache}`);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message listener for user-triggered software updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log(`[SW ${CACHE_VERSION}] skipWaiting triggered by user update button.`);
    self.skipWaiting();
  }
});

// Network-First Strategy: Fetch latest version from server/CDN when online, update cache, fallback to cache if offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_VERSION).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return networkResponse;
    }).catch(() => {
      // If network fails (offline mode), return cached response seamlessly
      return caches.match(event.request);
    })
  );
});
