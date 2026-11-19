// Aggiornamenti atomici: tutti i file stanno in una cache con il numero di versione,
// riempita in blocco (addAll) all'installazione; l'app risponde sempre da lì.
// La versione si riempie da sola alla pubblicazione, a partire dal commit:
// non c'è nulla da cambiare a mano. Il nuovo service worker si installa,
// poi skipWaiting, e la versione nuova parte al lancio successivo dell'app.
// Nessun file viene mai riscritto nella cache attiva in background.
importScripts('./src/range.js');
const CACHE = 'inglese-__VERSIONE__';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './src/app.js',
  './src/audio.js',
  './src/check.js',
  './src/content.js',
  './src/lesson.js',
  './src/numbers.js',
  './src/practice.js',
  './src/progress.js',
  './src/range.js',
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

// Audio: fuori dal precache (crescerebbe all'infinito). Si mette in cache al primo ascolto;
// l'indice va sempre dalla rete, con ripiego sulla cache.
const AUDIO_PATH = new URL('audio/', self.registration.scope).pathname;

async function handleAudio(req, url) {
  const cache = await caches.open(CACHE);
  if (url.pathname === AUDIO_PATH + 'index.json') {
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') await cache.put(req, res.clone());
      return res;
    } catch {
      const cached = await cache.match(req, { ignoreSearch: true });
      return cached || new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
  }
  let full = await cache.match(url.pathname);
  if (!full) {
    // Richiesta intera (senza Range) così il file si può mettere in cache; poi si risponde a misura.
    const res = await fetch(new Request(url.href));
    if (!(res.ok && res.status === 200 && res.type === 'basic')) return res;
    await cache.put(url.pathname, res.clone());
    full = res;
  }
  return rangeResponse(req, full);
}

// Safari chiede i file audio con Range e vuole un 206 (parseRange: src/range.js).
async function rangeResponse(req, res) {
  const buf = await res.arrayBuffer();
  const size = buf.byteLength;
  const r = parseRange(req.headers.get('range'), size);
  if (r === null) return new Response(buf, { status: 200, headers: { 'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg' } });
  if (r === 'unsatisfiable') return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(buf.slice(r.start, r.end + 1), {
    status: 206,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${r.start}-${r.end}/${size}`,
      'Content-Length': String(r.end - r.start + 1),
    },
  });
}

async function handle(event, req) {
  const url = new URL(req.url);
  if (url.pathname.startsWith(AUDIO_PATH)) return handleAudio(req, url);
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
