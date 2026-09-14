importScripts('./version.js');
const CACHE = `xpaylo-for-eldon-v${self.XPAYLO_VERSION || 'dev'}`;
const APP_SHELL = [
  './',
  './index.html',
  './version.js',
  './styles.css',
  './app.js',
  './paygrid-rebuild.js',
  './pako_inflate.min.js',
  './PAKO-LICENSE.txt',
  './manifest.webmanifest',
  './assets/xpaylo-logo.png',
  './icons/favicon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate';
  const isVersionedCore = /\/(?:index\.html|version\.js|app\.js|paygrid-rebuild\.js)$/.test(url.pathname);
  if (isNavigation || isVersionedCore) {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then(r => r || caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match('./index.html'))));
});
