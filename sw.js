/* SKLOPI — service worker
   Minimalan, siguran SW: kešira samo osnovnu "app shell" ljusku sajta
   (HTML/CSS/JS/manifest, sopstveni domen), a sve spoljašnje pozive
   (Unsplash slike, KAYAK, Booking.com, fontovi...) ostavlja netaknutim
   i pušta direktno na mrežu. Cilj mu je pre svega da omogući Chrome-u
   da prepozna sajt kao instalabilnu PWA aplikaciju (potreban je bar
   jedan registrovan 'fetch' handler), a uzgred daje i osnovnu
   otpornost na slab/nestabilan signal.
*/
// VAŽNO: pri svakom deploy-u koji menja app.js/styles.css/index.html,
// promeni ovaj string (npr. v2, v3...) — to je jedini način da postojeći
// korisnici (i ti sam/a kad testiraš) odmah dobiju novu verziju, jer se
// SW fajl inače retko menja pa se ne re-instalira sam od sebe.
const CACHE_VERSION = 'sklopi-shell-v4';
// app.js i styles.css su kritični za funkcionalnost i menjaju se često —
// za njih se mreža uvek probom prva (network-first), keš je samo rezerva
// za slab/nestabilan signal ili offline rad. Bez ovoga bi stari keš mogao
// da nastavi da se servira i posle uspešnog deploy-a nove verzije.
const NETWORK_FIRST = ['/app.js', '/styles.css', '/dest-info.js', '/dest-info.css', '/i18n-data.js', '/i18n-extra.js'];
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

  // app.js / styles.css: mreža prva (network-first), keš samo kao
  // rezerva ako nema interneta — da svaki deploy odmah stigne do korisnika.
  if (NETWORK_FIRST.includes(url.pathname)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Ostala statika sa sopstvenog domena (manifest/ikonice): keš prvi,
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
