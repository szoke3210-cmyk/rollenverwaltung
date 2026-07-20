const CACHE_VERSION = "saveline-shell-v2";
const RUNTIME_CACHE = "saveline-runtime-v2";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./style.css?v=8",
  "./config.js",
  "./state.js",
  "./utils.js",
  "./api.js",
  "./auth.js",
  "./aktivitaet.js",
  "./backup.js",
  "./qr.js",
  "./typen.js",
  "./statistik.js",
  "./kunden.js",
  "./scanner.js",
  "./rollen.js?v=20260720-1",
  "./app.js?v=20260720-2",
  "./offline.js?v=2",
  "./SL-LO-CO.jpg?v=2",
  "./saveway-background.png",
  "./extra-urlaub.jpg",
  "./icon-192.png",
  "./icon-512.png"
];

const EXTERNAL_ASSETS = [
  "https://unpkg.com/html5-qrcode",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);

    // Egy hibás vagy kimaradt fájl se akadályozza meg a Service Worker telepítését.
    await Promise.allSettled(
      CORE_ASSETS.map(async (asset) => {
        const request = new Request(asset, { cache: "reload" });
        const response = await fetch(request);
        if (!response.ok) throw new Error(`${asset}: ${response.status}`);
        await cache.put(request, response);
      })
    );

    await Promise.allSettled(
      EXTERNAL_ASSETS.map(async (asset) => {
        const response = await fetch(asset, { mode: "cors", cache: "reload" });
        if (!response.ok) throw new Error(`${asset}: ${response.status}`);
        await cache.put(asset, response);
      })
    );

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([CACHE_VERSION, RUNTIME_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.filter((name) => !keep.has(name)).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // A Supabase adat- és bejelentkezési kérések ne kerüljenek gyorsítótárba.
  if (url.hostname.endsWith("supabase.co")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(cacheFirstWithRefresh(request));
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    return (
      await caches.match(request, { ignoreSearch: true }) ||
      await caches.match("./index.html", { ignoreSearch: true }) ||
      await caches.match("./", { ignoreSearch: true }) ||
      new Response("Saveline offline", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      })
    );
  }
}

async function cacheFirstWithRefresh(request) {
  const cached = await caches.match(request, { ignoreSearch: false });

  const refresh = fetch(request)
    .then(async (response) => {
      if (response && (response.ok || response.type === "opaque")) {
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const response = await refresh;
  if (response) return response;

  // Verzióparaméter eltérés esetén is keresse meg a helyi fájlt.
  const fallback = await caches.match(request, { ignoreSearch: true });
  if (fallback) return fallback;

  return new Response("", { status: 504, statusText: "Offline" });
}
