// Cambia CACHE a ogni nuova versione dei contenuti o del codice.
const CACHE = 'inglese-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './src/app.js',
  './src/check.js',
  './src/content.js',
  './src/lesson.js',
  './src/progress.js',
  './src/speech.js',
  './src/srs.js',
  './content/levels.json',
  './content/topics.json',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    handle(event, req).catch(() => fetch(req).catch(() => new Response('Offline', { status: 503, statusText: 'Offline' }))),
  );
});

async function handle(event, req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req, { ignoreSearch: true });
  const network = fetch(req)
    .then(async (res) => {
      if (res && res.ok) await cache.put(req, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => null);
  event.waitUntil(network);
  if (cached) return cached;
  const res = await network;
  if (res) return res;
  if (req.mode === 'navigate') {
    const fallback = await cache.match('./index.html');
    if (fallback) return fallback;
  }
  return new Response('Offline', { status: 503, statusText: 'Offline' });
}
