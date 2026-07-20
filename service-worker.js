const CACHE_VERSION = "saveline-shell-v6";
const RUNTIME_CACHE = "saveline-runtime-v6";

const CORE_ASSETS = [
  "./", "./index.html", "./manifest.json", "./style.css?v=9",
  "./config.js", "./state.js", "./utils.js", "./api.js?v=6",
  "./auth.js?v=4", "./aktivitaet.js", "./backup.js", "./qr.js?v=6",
  "./typen.js", "./statistik.js", "./kunden.js", "./scanner.js",
  "./rollen.js?v=20260720-1", "./app.js?v=20260720-6", "./offline.js?v=6",
  "./SL-LO-CO.jpg?v=2", "./saveway-background.png", "./extra-urlaub.jpg",
  "./icon-192.png", "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await Promise.allSettled(CORE_ASSETS.map(async asset => {
      const response = await fetch(new Request(asset, { cache: "reload" }));
      if (response.ok) await cache.put(asset, response.clone());
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keep = new Set([CACHE_VERSION, RUNTIME_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.filter(name => !keep.has(name)).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.hostname.endsWith("supabase.co")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, true));
    return;
  }

  // Saját JS/CSS fájloknál online mindig az új verziót próbáljuk először.
  if (url.origin === self.location.origin && ["script", "style"].includes(request.destination)) {
    event.respondWith(networkFirst(request, false));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirst(request, navigation) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    return (await caches.match(request, { ignoreSearch: true })) ||
      (navigation ? await caches.match("./index.html", { ignoreSearch: true }) : null) ||
      new Response(navigation ? "Saveline offline" : "", { status: 503 });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: false });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    return (await caches.match(request, { ignoreSearch: true })) || new Response("", { status: 504 });
  }
}
