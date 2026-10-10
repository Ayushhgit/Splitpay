/*
  Offline shell for a counter with poor signal.

  Codes are generated on the device, so once the app has loaded it needs nothing
  from the network to take a payment. This keeps that true across a reload.

  Navigations go to the network first and fall back to the last good copy, so a
  deploy is picked up as soon as there is signal and never serves a stale page
  while online. Build assets under /_next/static/ carry a content hash in their
  name, so they are safe to serve from the cache first.

  Bump CACHE when changing this file.
*/
const CACHE = 'counter-v2';
const SHELL = '/';
/* Every screen the counter needs with no signal. The memo id travels in the
   query string, so one cached document per route serves every memo. */
const ROUTES = ['/', '/sale', '/receipt', '/ledger', '/settings'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        // One failure must not abandon the rest.
        Promise.all(ROUTES.map((r) => cache.add(r).catch(() => {})))
      )
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache the aggregator webhook or anything else under /api.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          // ignoreSearch so /sale?id=A answers for /sale?id=B: the page reads
          // the real id from the URL once it hydrates.
          caches
            .match(request, { ignoreSearch: true })
            .then((hit) => hit ?? caches.match(SHELL))
            .then((hit) => hit ?? Response.error())
        )
    );
    return;
  }

  const hashed =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/icon.svg' ||
    url.pathname === '/manifest.webmanifest';

  if (!hashed) return;

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
