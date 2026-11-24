// Guarda o app no aparelho para funcionar offline.
// Com internet, a página principal vem sempre da versão mais nova; sem internet, usa a cópia guardada.
const CACHE = "estudos-pc-v2";
const FILES = ["./", "./index.html", "./manifest.json", "./icon-180.png", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(u => new Request(u, { cache: "reload" })))));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  const isPage = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html");
  if (isPage) {
    // rede primeiro (até 5 s), depois a cópia guardada
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const r = await Promise.race([fetch(req, { cache: "no-store" }), timeout(5000)]);
        if (r.ok) c.put("./index.html", r.clone());
        return r;
      } catch (err) {
        return (await c.match("./index.html")) || (await c.match(req, { ignoreSearch: true })) || Response.error();
      }
    })());
    return;
  }
  // ícones e manifesto: cópia guardada primeiro
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r;
  }));
});
