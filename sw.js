// C.L.O.N.E.S - service worker (zodat het spel ook zonder internet opstart)
// Altijd EERST internet proberen ("network-first"): zo krijg je updates meteen.
// Alleen als er geen internet is, pakken we de bewaarde kopie uit de cache.
// Nieuwe versie van dit bestand? Verhoog dan het nummer hieronder.
const CACHE = 'clones-v2';

// Andere websites die we ook mogen bewaren (Three.js, PeerJS en de lettertypes)
const CDN = ['https://cdn.jsdelivr.net', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('clones-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const eigen = url.origin === self.location.origin && url.pathname.startsWith(new URL(self.registration.scope).pathname);
  if (!eigen && !CDN.includes(url.origin)) return; // samen spelen e.d.: niet aankomen
  event.respondWith(netwerkEerst(req, eigen));
});

async function netwerkEerst(req, eigen) {
  const cache = await caches.open(CACHE);
  try {
    // Eigen bestanden: altijd even bij de server checken of er een nieuwere versie is
    const res = eigen ? await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const oud = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (oud) return oud;
    if (req.mode === 'navigate') {
      const start = await cache.match(new URL('./', self.registration.scope).href);
      if (start) return start;
    }
    throw err;
  }
}
