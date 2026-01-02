/*
Created: 2026-01-02
Author: @marcinmajsc
Repository: https://github.com/marcinmajsc/streamdelay-gui
*/

/* Streamdelay-GUI: minimal SW for app-shell caching (HTTPS/localhost only). */
const CACHE = "streamdelay-gui-v1";
const ASSETS = [
  "/",
  "/static/manifest.webmanifest",
  "/static/favicon.ico",
  "/static/favicon-32.png",
  "/static/favicon-192.png",
  "/static/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE ? null : caches.delete(k))));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    const res = await fetch(req);
    // cache same-origin basic responses
    try {
      const url = new URL(req.url);
      if (url.origin === self.location.origin && res && res.status === 200 && res.type === "basic") {
        const c = await caches.open(CACHE);
        c.put(req, res.clone());
      }
    } catch (_) {}
    return res;
  })());
});
