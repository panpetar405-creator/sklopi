/* SKLOPI — service worker
   Minimalan, siguran SW: kešira samo osnovnu "app shell" ljusku sajta
   (HTML/CSS/JS/manifest, sopstveni domen), a sve spoljašnje pozive
   (Unsplash slike, KAYAK, Booking.com, fontovi...) ostavlja netaknutim
   i pušta direktno na mrežu. Cilj mu je pre svega da omogući Chrome-u
   da prepozna sajt kao instalabilnu PWA aplikaciju (potreban je bar
   jedan registrovan 'fetch' handler), a uzgred daje i osnovnu
   otpornost na slab/nestabilan signal.
*/
const CACHE_VERSION = 'sklopi-shell-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}) // ne blokiraj instalaciju ako neki fajl fali/menja se
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Diramo samo GET zahteve ka sopstvenom domenu — sve ostalo
  // (POST/PUT, spoljni domeni: slike, partneri, fontovi, mape...)
  // prolazi normalno, bez ikakve izmene ponašanja.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigacije (otvaranje/refresh stranice): mreža prva, keš kao
  // rezerva ako nema interneta.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // Statika sa sopstvenog domena (css/js/manifest/ikonice): keš prvi,
  // pa mreža, da app-shell radi i offline i brže učitava.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
