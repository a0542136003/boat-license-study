/* משיט 12 – offline cache. Bump VERSION when files change. */
const VERSION = 'ml12-v6';
const CORE = ['./', './index.html', './style.css', './app.js', './pics.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './data/bundle.json'];
const PAGES = Array.from({length: 15}, (_, i) => `./pdf/p${String(i + 1).padStart(2, '0')}.jpg`).concat(["c1-28", "c1-29", "c1-31", "c1-36", "c1-38", "c1-39", "c2-28", "c2-29", "c2-33", "c2-37", "c2-40", "c2-41", "c2-47"].map(k => `./img/${k}.jpg`));
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.concat(PAGES))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // network-first for the data bundle (so updates arrive), cache-first for everything else
  if (url.pathname.endsWith('/data/bundle.json')) {
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); } return r; })));
});
