// Aggiornamenti atomici: tutti i file stanno in una cache con il numero di versione,
// riempita in blocco (addAll) all'installazione; l'app risponde sempre da lì.
// Per aggiornare l'app si cambia CACHE: il nuovo service worker si installa,
// poi skipWaiting, e la versione nuova parte al lancio successivo dell'app.
// Nessun file viene mai riscritto nella cache attiva in background.
const CACHE = 'inglese-v3';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './src/app.js',
  './src/check.js',
  './src/content.js',
  './src/lesson.js',
  './src/numbers.js',
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
  if (cached) return cached;
  try {
    return await fetch(req);
  } catch {
    if (req.mode === 'navigate') {
      const fallback = await cache.match('./index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}
