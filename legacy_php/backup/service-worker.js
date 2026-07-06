const CACHE_NAME = 'fate-video-cache-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/?pwa=1',
  '/static_yk/css/common.css',
  '/static_yk/css/play.css',
  '/static_yk/js/common.js',
  '/static_yk/js/index.js',
  '/static_yk/js/play.js',
  '/static_yk/js/jquery.min.js',
  '/static_yk/images/logo.png',
  '/static_yk/images/icon-192.png',
  '/static_yk/images/icon-512.png'
];

// Install Event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching assets');
        // Ignore failures on optional routes or when offline
        return cache.addAll(ASSETS_TO_CACHE).catch(err => {
          console.warn('Some assets failed to cache during install:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Skip caching for POST/PUT requests or chrome-extensions/non-http schemes
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // Network-First for HTML/Navigation pages
  var acceptHeader = event.request.headers.get('accept') || '';
  if (event.request.mode === 'navigate' || acceptHeader.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) return cachedResponse;
              return caches.match('/');
            });
        })
    );
    return;
  }

  // Cache-First (Stale-While-Revalidate) for static assets
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Update cache in background
          fetch(event.request).then(networkResponse => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }

        return fetch(event.request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      })
  );
});
