const CACHE_NAME = 'zg-shop-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './admin.html',
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
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
