const CACHE_NAME = 'spotify-clone-cache-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/s192.png',  // 192x192 icon
  './icons/s512.png',  // 512x512 icon
  './style.css',
  './main.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'
];

const DYNAMIC_CACHE = 'spotify-dynamic-cache-v1';

// Install Service Worker - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing and caching static assets...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate Service Worker - remove old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch handler - cache-first for static, network-first for dynamic
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Cache static assets
  if (STATIC_ASSETS.includes(requestUrl.href) || requestUrl.origin !== location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // Dynamic caching for music, images, API requests
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request).then(networkResponse => {
        return caches.open(DYNAMIC_CACHE).then(cache => {
          if (event.request.method === 'GET') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      }).catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
