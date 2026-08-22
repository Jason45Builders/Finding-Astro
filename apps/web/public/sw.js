const CACHE_NAME = "finding-astro-v1";
const STATIC_ASSETS = [
  "/",
  "/offline.html",
];

const PRECACHE_URLS = [
  "/",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const isNavigation = request.mode === "navigate";
  const isApi = request.url.includes("/api/");
  const isStatic = STATIC_ASSETS.some((asset) => request.url.endsWith(asset));

  if (isApi) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ success: false, code: "OFFLINE", message: "You are currently offline. Please try again when connected." }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      })
    );
    return;
  }

  if (isNavigation || isStatic) {
    event.respondWith(
      fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => caches.match(request).then((cached) => cached || caches.match("/offline.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      return response;
    }).catch(() => new Response("Offline", { status: 503 })))
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const title = payload.title ?? "Finding Astro";
    const options = {
      body: payload.body ?? payload.message ?? "You have a new notification",
      data: payload.data ?? {},
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag: payload.tag ?? "finding-astro-notification",
      renotify: true,
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    const title = "Finding Astro";
    const options = {
      body: event.data.text() ?? "You have a new notification",
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag: "finding-astro-notification",
      renotify: true,
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      if (client.url === url && "focus" in client) return client.focus();
    }
    return self.clients.openWindow(url);
  }));
});
