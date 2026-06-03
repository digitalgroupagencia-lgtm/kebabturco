function isLegacyAppCache(name) {
  return /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-|workbox|vite-pwa|snaporder/i.test(name);
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.allSettled(keys.filter(isLegacyAppCache).map((key) => caches.delete(key)));
        await self.clients.claim();
        const clients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(clients.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);

self.addEventListener("fetch", (event) => event.respondWith(fetch(event.request)));