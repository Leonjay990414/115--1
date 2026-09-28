const CACHE_NAME = 'zg-shop-backend-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './store.html',
  './css/styles.css',
  './css/print.css',
  './js/data.js',
  './js/store.js',
  './js/admin.js',
  './manifest.json',
  './assets/images/logo.png',
  './assets/images/favicon.png',
  './assets/images/icon-192.png',
  './assets/images/icon-512.png',
  './assets/images/mug.jpg',
  './assets/images/coaster.jpg',
  './assets/images/badge.jpg',
  './assets/images/cardholder.jpg',
  './assets/images/passport.jpg',
  './assets/vendor/xlsx.full.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] 快取核心資產中...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] 清理過期快取:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // 網路優先，離線回退至快取策略
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});
