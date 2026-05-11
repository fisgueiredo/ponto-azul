// IMPORTANT: bump CACHE/RUNTIME version on every shell or asset-strategy change
// so existing installs purge stale caches on activate.
const CACHE = "ponto-azul-v9";
const RUNTIME = "ponto-azul-runtime-v9";
const TILES = "ponto-azul-tiles-v9";
const TILES_MAX = 600;
const SHELL = [
  "/",
  "/adicionar",
  "/definicoes",
  "/manifest.webmanifest",
  "/icon.png",
];

function isTileHost(hostname) {
  return (
    hostname.endsWith("openfreemap.org") ||
    /^mt[0-3]\.google\.com$/.test(hostname)
  );
}

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  // Evict oldest entries (queue order is insertion order).
  for (let i = 0; i < keys.length - max; i++) {
    await cache.delete(keys[i]);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE && k !== RUNTIME && k !== TILES)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(css|js|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  );
}

function isPage(req, url) {
  if (req.mode === "navigate") return true;
  if (req.method !== "GET") return false;
  const accept = req.headers.get("accept") || "";
  return accept.includes("text/html") && url.origin === self.location.origin;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Cache-first for map tiles: repeat pans/zooms feel instant.
  if (isTileHost(url.hostname)) {
    event.respondWith(
      caches.open(TILES).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) return cached;
          // Preserve the request's original mode (often no-cors for <img>).
          return fetch(req)
            .then((res) => {
              // Cache both ok responses and opaque (no-cors image) responses.
              if (res && (res.ok || res.type === "opaque")) {
                const copy = res.clone();
                cache
                  .put(req, copy)
                  .then(() => trimCache(TILES, TILES_MAX))
                  .catch(() => {});
              }
              return res;
            })
            .catch(() => cached || Response.error());
        })
      )
    );
    return;
  }

  if (
    url.hostname.endsWith("supabase.co") ||
    url.hostname.endsWith("openstreetmap.org") ||
    url.hostname.endsWith("googleapis.com") ||
    url.hostname.endsWith("google.com")
  ) {
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/data")) return;

  // Cache-first for hashed static assets: instant repeat loads.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok && res.status === 200 && res.type === "basic") {
              const copy = res.clone();
              caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
      )
    );
    return;
  }

  // Stale-while-revalidate for other static assets.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok && res.status === 200 && res.type === "basic") {
              const copy = res.clone();
              caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Network-first with cache fallback for pages — keeps content fresh, instant offline.
  if (isPage(req, url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("/")))
    );
    return;
  }

  // Default: stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
