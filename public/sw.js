const CACHE_NAME = "exammate-offline-v6";
const OFFLINE_PAGE = "/offline.html";
const OFFLINE_ASSETS = [
  OFFLINE_PAGE,
  "/offline/offline-app.js",
  "/offline/excel-parser.js",
  "/offline/exporter.js",
  "/icons/exammate-192.png",
  "/icons/exammate-512.png",
  "/icons/exammate-maskable-512.png",
  "/icon.svg?v=2",
];
const OFFLINE_ASSET_PATHS = new Set(
  OFFLINE_ASSETS.map((asset) => new URL(asset, self.location.origin).pathname),
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("exammate-offline-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (
    request.method !== "GET" ||
    new URL(request.url).origin !== self.location.origin
  ) {
    return;
  }

  const url = new URL(request.url);
  const isOfflineAsset = OFFLINE_ASSET_PATHS.has(url.pathname);

  // Only the public offline shell and its parser/icon assets may be read from Cache Storage.
  // Never cache page HTML, routines, API responses, account data, or OAuth responses.
  if (isOfflineAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => cache.match(request)).then((cached) => cached || fetch(request)),
    );
    return;
  }

  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(async () => {
      const offlineCache = await caches.open(CACHE_NAME);
      const offlinePage = await offlineCache.match(OFFLINE_PAGE);
      return (
        offlinePage ||
        new Response("You are offline. Reconnect to use ExamMate.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      );
    }),
  );
});
