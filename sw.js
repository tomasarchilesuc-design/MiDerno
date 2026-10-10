/* MiDerno: abre aunque no haya internet. La app se pide primero a la red
   (así cada versión nueva llega al tiro); si no hay conexión, usa la copia guardada. */
const V = 'miderno-aeb84339536b';
const BASE = ['./', './manifest.webmanifest', './logo-192.png', './logo-512.png', './logo-apple.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('miderno-') && k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin || u.pathname.endsWith('version.json') || u.pathname.endsWith('sw.js')) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then((res) => {
      const raiz = /\/(index\.html)?$/.test(u.pathname);
      if (res.ok && raiz) { const copia = res.clone(); caches.open(V).then((c) => c.put('./', copia)); }
      return res;
    }).catch(() => caches.match('./').then((m) => m || Response.error())));
    return;
  }
  e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => {
    if (res.ok && /\.(png|webmanifest|html)$/.test(u.pathname)) { const copia = res.clone(); caches.open(V).then((c) => c.put(r, copia)); }
    return res;
  })));
});
// al tocar el aviso de una reserva se abre (o se enfoca) MiDerno en la agenda
self.addEventListener('notificationclick', (e) => {
  e.notification.close(); const url = e.notification.data?.url || './#agenda';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => {
    const w = ws.find((x) => x.url.startsWith(self.registration.scope)); if (w) { w.navigate?.(url); return w.focus(); }
    return self.clients.openWindow(url);
  }));
});
// aviso push del servidor (reserva nueva) aunque MiDerno esté cerrado
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { cuerpo: e.data ? e.data.text() : '' }; }
  const url = new URL(d.url || './#agenda', self.registration.scope).href;
  e.waitUntil(self.registration.showNotification(d.titulo || 'MiDerno', { body: d.cuerpo || '', icon: 'logo-192.png', badge: 'logo-192.png', tag: d.tag || 'miderno', renotify: true, data: { url } }));
});
