/* Powerhouse service worker: precache the whole app so it opens offline; update in place. */
const VERSION = '2026.11.03-1afc2d';
const CACHE = 'powerhouse-' + VERSION;
const PRECACHE = ["./", "./index.html", "./manifest.webmanifest", "./fonts/atkinson-hyperlegible-latin-400-normal.woff2", "./fonts/atkinson-hyperlegible-latin-700-normal.woff2", "./fonts/atkinson-hyperlegible-latin-400-italic.woff2", "./fonts/big-shoulders-display-latin-700-normal.woff2", "./fonts/big-shoulders-display-latin-800-normal.woff2", "./fonts/big-shoulders-display-latin-900-normal.woff2", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('powerhouse-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // Navigations: serve the app shell from cache first so the app opens instantly and offline.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cached = await caches.match('./index.html', { ignoreSearch: true });
      if (cached) return cached;
      try { return await fetch(req); } catch (e) { return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } }); }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') { const c = await caches.open(CACHE); c.put(req, res.clone()); }
      return res;
    } catch (e) {
      return new Response('', { status: 504 });
    }
  })());
});
