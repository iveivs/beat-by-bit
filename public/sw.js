const CACHE_PREFIX = "beat-by-bit-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const appRoot = new URL("./", self.registration.scope);
const shellFiles = [
  appRoot.href,
  new URL("site.webmanifest", appRoot).href,
  new URL("icon-192.png", appRoot).href,
  new URL("icon-512.png", appRoot).href,
  new URL("apple-touch-icon.png", appRoot).href,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(shellFiles))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, navigationFallback = false) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (navigationFallback) return cache.match(appRoot.href);
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.endsWith("/sw.js")
  ) {
    return;
  }

  event.respondWith(networkFirst(request, request.mode === "navigate"));
});
