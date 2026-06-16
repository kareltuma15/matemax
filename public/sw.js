const CACHE = "matemax-v4";
const OFFLINE_PAGES = ["/", "/diagnostika", "/trenink"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(OFFLINE_PAGES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/api/")) return;

  // HTML / navigace → NETWORK-FIRST.
  // Cache-first servírovalo starou HTML odkazující na neexistující hashované
  // bundly (/_next/...-OLD.js) → 404 → stránka bez stylů. Proto vždy nejdřív síť;
  // cache jen jako offline fallback.
  const isNavigation =
    e.request.mode === "navigate" ||
    (e.request.headers.get("accept") || "").includes("text/html");

  if (isNavigation) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(e.request).then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  // Ostatní GET (obrázky, fonty…) → cache-first (mění se jen zřídka)
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return response;
        })
        .catch(() => caches.match("/"));
    })
  );
});

// ── Push notifications ──────────────────────────────────────────────────────

self.addEventListener("push", (e) => {
  let data = { title: "MateMax", body: "Čas na dnešní trénink! 💪", url: "/trenink" };
  try {
    if (e.data) data = { ...data, ...e.data.json() };
  } catch { /* ignore */ }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/api/icon?size=192",
      badge: "/api/icon?size=96",
      tag: "matemax-reminder",
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url ?? "/trenink";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
