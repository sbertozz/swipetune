const CACHE = 'swipetune-v3';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './manifest.webmanifest', './assets/icon.svg', './assets/icon-512.png', './assets/apple-touch-icon.png', './assets/demo-preview.wav', './swipetune-esempio.csv'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
