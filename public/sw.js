// Service worker do My Routes — cache offline do app shell, estáticos e GETs de API.
const CACHE = "my-routes-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.add(OFFLINE_URL).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function putInCache(request, response) {
  if (!response || response.status !== 200 || response.type === "opaque") return;
  const copy = response.clone();
  caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Só lidamos com GET de mesma origem. POST/PATCH/DELETE e terceiros passam direto.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Navegações (páginas): network-first → cache → página offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          putInCache(req, res);
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Estáticos (build, fontes, imagens): cache-first com atualização em background.
  if (
    url.pathname.startsWith("/_next/static") ||
    /\.(?:js|css|woff2?|ttf|png|jpe?g|svg|ico|webp)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            putInCache(req, res);
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // GET de API (dados): network-first, cache como fallback offline.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          putInCache(req, res);
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }
});
