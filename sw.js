self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open('opd-loggerx-v1');
    await cache.addAll(['./', './index.html', './manifest.webmanifest']);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const fresh = await fetch(event.request);
      const cache = await caches.open('opd-loggerx-v1');
      cache.put(event.request, fresh.clone());
      return fresh;
    } catch (e) {
      return cached || Response.error();
    }
  })());
});
