/* SKLOPI — service worker

   STRATEGIJA KEŠA (po vrsti zahteva):
   1) Navigacije (HTML)            mreža prva (max 4 s), keš kao rezerva; offline → /index.html.
   2) Verzionisani .css/.js (?v=)  keš prvi — URL se menja kad se sadržaj promeni (stamp-assets.mjs),
                                   pa stari keš NE MOŽE da zaglavi staru verziju.
   3) /fonts/*                     keš prvi (nikad se ne menjaju bez novog imena).
   4) Slike sa našeg domena        keš prvi, najviše IMG_MAX komada (najstarije izlaze).
   5) Ostalo naše (manifest...)    stale-while-revalidate.
   NIKAD se ne kešira: /api/*, /go/*, /unsubscribe, /confirm-alert, zajedno.html (deljeni linkovi
   sa tokenom), ne-GET zahtevi, Range zahtevi i tuđi domeni (Unsplash, partneri, Supabase...).

   VERZIJA: BUILD (dole) se upisuje AUTOMATSKI — `npm run stamp`. Ne treba ništa ručno da se
   menja pri deploy-u. Nov BUILD = nov shell keš; stari se briše pri aktivaciji. */

/* STAMP:BEGIN (generiše stamp-assets.mjs — ne menjaj ručno) */
const BUILD = '1c24e7b3';
const PRECACHE = [
  "/",
  "/affiliate.js?v=85396c00",
  "/app-01-core.js?v=01ae711c",
  "/app-02-market-passengers.js?v=3eb1af24",
  "/app-03-airports.js?v=81b29008",
  "/app-04-pricing-engine.js?v=fafc7a3c",
  "/app-05-results.js?v=108b871e",
  "/app-06-form.js?v=9bbd4299",
  "/app-07-package-detail.js?v=70762447",
  "/app-08-popular-airports.js?v=00bc4b12",
  "/app-09-account.js?v=c058eb8e",
  "/app-10-planner-init.js?v=3f5e04ee",
  "/app-11-sections-hero.js?v=981569dd",
  "/app-12-ux-refactor.js?v=f4ec42e0",
  "/app-13-destination-value.js?v=5285c82e",
  "/app-14-recent-searches.js?v=838179ea",
  "/app-15-plan-select.js?v=e82434f8",
  "/app-16-trip-prefs.js?v=f03a4be1",
  "/app-17-itinerary.js?v=05a09fcc",
  "/app-18-info-tabs.js?v=931fcc1e",
  "/app-19-info-index.js?v=998ffeee",
  "/app-21-local-transport.js?v=fd61e4ac",
  "/app-22-climate-table.js?v=97edbc6c",
  "/app-23-reservation.js?v=08005ba1",
  "/app-24-notifications.js?v=f8c346d9",
  "/app-25-hero.js?v=67dcb030",
  "/app-26-plan-customize.js?v=fe5d4a62",
  "/config.js?v=60b28611",
  "/contact.js?v=60aecad3",
  "/cookies.js?v=ac951772",
  "/dest-info.css?v=67d8e547",
  "/dest-info.js?v=0165513e",
  "/dest-plans.js?v=23ab51ff",
  "/fonts.css?v=0f858672",
  "/hero-extras.css?v=9b7a4fd2",
  "/i18n-data.js?v=f8ee145f",
  "/i18n-extra.js?v=f92038ad",
  "/index.html",
  "/manifest.json",
  "/notifications.css?v=563a3ebd",
  "/price-mix.js?v=5e3c1012",
  "/reservation.css?v=f76d78d6",
  "/styles.css?v=e6c63a2f",
  "/theme-navy-rest.css?v=f33d9135",
  "/theme-navy.css?v=55c54d01",
  "/transport-i18n.js?v=f616fd98",
  "/transport.js?v=dcc41813",
  "/ux-refactor.css?v=94624cca"
];
/* STAMP:END */

const SHELL_CACHE = 'sklopi-shell-' + BUILD;
const IMG_CACHE = 'sklopi-img-v1';          // slike prežive nov BUILD; menjaj samo ako menjaš pravila
const KEEP = [SHELL_CACHE, IMG_CACHE];
const IMG_MAX = 80;
const NAV_TIMEOUT_MS = 4000;
const NEVER = /^\/(api|go)\/|^\/(unsubscribe|confirm-alert|send-confirmation)(\/|$)|^\/zajedno\.html$/;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // jedan fajl koji fali ne sme da obori instalaciju
      Promise.all(PRECACHE.map((u) => cache.add(u).catch(() => {})))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('sklopi-') && !KEEP.includes(k)).map((k) => caches.delete(k)));
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.enable(); } catch (e) {} }
    await self.clients.claim();
  })());
});

const okToStore = (res) => res && res.status === 200 && res.type === 'basic';

async function putIn(name, req, res, key) {
  try { await (await caches.open(name)).put(key || req, res); } catch (e) { /* kvota/privatni režim */ }
}

async function trimImages() {
  try {
    const cache = await caches.open(IMG_CACHE);
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - IMG_MAX; i++) await cache.delete(keys[i]);   // keys() je po redosledu ubacivanja
  } catch (e) {}
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function handleNavigate(event) {
  const req = event.request;
  const url = new URL(req.url);
  // Ključ bez query-ja (?lang=, ?utm_...) — da keš ne raste po svakoj varijanti URL-a.
  const key = new Request(url.origin + url.pathname);
  try {
    const net = (async () => (await event.preloadResponse) || fetch(req))();
    const res = await withTimeout(net, NAV_TIMEOUT_MS);
    if (okToStore(res)) event.waitUntil(putIn(SHELL_CACHE, key, res.clone()));
    return res;
  } catch (e) {
    const cached = await caches.match(key) || await caches.match('/index.html');
    if (cached) return cached;
    return fetch(req);        // nema keša: pusti pregledaču da prikaže svoju grešku
  }
}

async function cacheFirst(req, cacheName, after) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (okToStore(res)) { await putIn(cacheName, req, res.clone()); if (after) after(); }
  return res;
}

async function staleWhileRevalidate(event, req) {
  const hit = await caches.match(req);
  const refresh = fetch(req).then((res) => { if (okToStore(res)) putIn(SHELL_CACHE, req, res.clone()); return res; }).catch(() => null);
  if (hit) { event.waitUntil(refresh); return hit; }
  return (await refresh) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // tuđi domeni: direktno na mrežu
  if (url.pathname === '/sw.js' || NEVER.test(url.pathname)) return;

  if (req.mode === 'navigate') { event.respondWith(handleNavigate(event)); return; }

  const p = url.pathname;
  if (/\.(css|js)$/.test(p) && url.searchParams.has('v')) { event.respondWith(cacheFirst(req, SHELL_CACHE)); return; }
  if (p.startsWith('/fonts/')) { event.respondWith(cacheFirst(req, SHELL_CACHE)); return; }
  if (/\.(png|jpe?g|webp|svg|ico|gif|avif)$/.test(p)) { event.respondWith(cacheFirst(req, IMG_CACHE, trimImages)); return; }
  event.respondWith(staleWhileRevalidate(event, req));
});
