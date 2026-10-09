/* ==========================================================
   SKLOPI — city-image.js (samo za Worker, NE za pregledač; vidi .assetsignore)
   Ruta:   GET /go/dest-image?city=Rim        → {"url":"https://upload.wikimedia.org/...","source":"wikipedia","page":"https://en.wikipedia.org/wiki/Rome"}
           (nema slike → {"url":""} sa kratkim kešom; klijent tada prikazuje gradijent)

   ZAŠTO: slike se ne unose ručno po gradu. Naziv grada (srpski, engleski, nemački, sa/bez kvačica,
   "Rim/Rom/Rome/Roma") se rešava automatski preko Wikidata → Wikipedia (glavna fotografija članka),
   pa Wikimedia Commons (P18). Rezultat se kešira na Cloudflare-u (30 dana za pogodak, 1 dan za promašaj),
   tako da se isti grad traži samo jednom, a ne za svakog posetioca.

   Ne treba nikakav API ključ. Wikimedia traži User-Agent sa kontaktom (UA ispod).
   Napomena o licenci: Commons/Wikipedia slike su slobodne licence, ali većina traži navođenje autora —
   "page" u odgovoru vodi na članak/stranicu slike, odatle se vidi autor i licenca.
========================================================== */
const UA = 'SklopiBot/1.0 (https://sklopi.rs; destination thumbnails)';
const HIT_SECONDS = 30 * 24 * 3600;
const MISS_SECONDS = 24 * 3600;
const MAX_CITY = 60;
const SAFE_TEXT = /^[\p{L}\p{M}\p{N} .,'’()\/&-]+$/u;
const BAD_IMG = /(flag|coat[_ ]of[_ ]arms|locator|location[_ ]map|map[_ ]of|_map|seal[_ ]of|logo|blason)/i;

// Srpski/nemački/ruski/lokalni oblici → engleski naziv (najpouzdaniji za Wikidata pretragu).
// Ne mora da pokrije sve gradove na svetu — ovo je samo ubrzanje/preciznost za najčešće;
// ostalo rešava pretraga po originalnom nazivu (sr, de, en).
const EN = {
  rim: 'Rome', rom: 'Rome', roma: 'Rome', rome: 'Rome',
  lisabon: 'Lisbon', lissabon: 'Lisbon', lisboa: 'Lisbon',
  prag: 'Prague', praha: 'Prague', prague: 'Prague',
  tokio: 'Tokyo', tokyo: 'Tokyo',
  bec: 'Vienna', wien: 'Vienna', vienna: 'Vienna',
  budimpesta: 'Budapest', atina: 'Athens', athen: 'Athens', solun: 'Thessaloniki', krf: 'Corfu',
  pariz: 'Paris', barselona: 'Barcelona', milano: 'Milan', venecija: 'Venice', firenca: 'Florence',
  minhen: 'Munich', munchen: 'Munich', cirih: 'Zurich', kairo: 'Cairo', marakes: 'Marrakesh',
  njujork: 'New York City', majami: 'Miami', bukurest: 'Bucharest', sofija: 'Sofia', skoplje: 'Skopje',
  beograd: 'Belgrade', ljubljana: 'Ljubljana', plitvicka: 'Plitvice Lakes National Park',
  'plitvicka jezera': 'Plitvice Lakes National Park', hurgada: 'Hurghada', kankun: 'Cancún',
  puket: 'Phuket', singapur: 'Singapore', sidnej: 'Sydney', kejptaun: 'Cape Town', antalija: 'Antalya',
  kapadokija: 'Cappadocia', mikonos: 'Mykonos', rodos: 'Rhodes', krit: 'Crete', nica: 'Nice',
  malaga: 'Málaga', ibica: 'Ibiza', 'los andjeles': 'Los Angeles', sarande: 'Sarandë',
  moskva: 'Moscow', 'sankt peterburg': 'Saint Petersburg', peterburg: 'Saint Petersburg'
};

export function normalizeCity(raw) {
  return String(raw || '')
    .replace(/^[\s\p{Extended_Pictographic}\uFE0F\u200D]+/u, '')   // "🧭 Prag" → "Prag"
    .split(',')[0].trim()
    .replace(/đ/g, 'dj').replace(/Đ/g, 'Dj')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ');
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String((env && env.ALLOWED_ORIGINS) || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = !allowed.length || allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? (allowed.length ? origin : '*') : allowed[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}
function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, headers) });
}

async function getJson(url, fetchFn) {
  const r = await fetchFn(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + new URL(url).hostname);
  return r.json();
}

async function searchIds(term, lang, fetchFn) {
  const u = 'https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&type=item&limit=5&uselang=en'
    + '&language=' + lang + '&search=' + encodeURIComponent(term);
  const d = await getJson(u, fetchFn);
  return (d.search || []).map((x) => x.id);
}

async function pickPlace(ids, fetchFn) {
  if (!ids.length) return null;
  const u = 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|sitelinks&sitefilter=enwiki&ids=' + ids.join('|');
  const d = await getJson(u, fetchFn);
  for (const id of ids) {
    const e = d.entities && d.entities[id];
    if (e && e.claims && e.claims.P625) return e;   // P625 = koordinate → geografsko mesto (ne osoba/film)
  }
  return null;
}

async function wikipediaThumb(title, fetchFn) {
  const u = 'https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail&pithumbsize=640&redirects=1&titles=' + encodeURIComponent(title);
  const d = await getJson(u, fetchFn);
  const pages = (d.query && d.query.pages) || {};
  for (const k of Object.keys(pages)) {
    const src = pages[k].thumbnail && pages[k].thumbnail.source;
    if (src && !BAD_IMG.test(decodeURIComponent(src))) return src;
  }
  return '';
}

function commonsUrl(entity) {
  const c = entity.claims && entity.claims.P18;
  const name = c && c[0] && c[0].mainsnak && c[0].mainsnak.datavalue && c[0].mainsnak.datavalue.value;
  if (!name || BAD_IMG.test(name)) return '';
  return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(name) + '?width=640';
}

/** Rešava naziv grada u {url, page}. Vraća url:'' ako ništa pouzdano nije nađeno. */
export async function resolveCityImage(city, fetchFn) {
  const key = normalizeCity(city);
  const en = EN[key];
  const tries = [];
  if (en) tries.push([en, 'en']);
  tries.push([String(city).replace(/^[\s\p{Extended_Pictographic}\uFE0F\u200D]+/u, '').split(',')[0].trim(), 'sr']);
  tries.push([tries[tries.length - 1][0], 'de'], [tries[tries.length - 1][0], 'en']);
  const seen = new Set();
  for (const [term, lang] of tries) {
    const sig = lang + ':' + term.toLowerCase();
    if (!term || seen.has(sig)) continue;
    seen.add(sig);
    let ids;
    try { ids = await searchIds(term, lang, fetchFn); } catch (e) { continue; }
    const ent = await pickPlace(ids, fetchFn).catch(() => null);
    if (!ent) continue;
    const wiki = ent.sitelinks && ent.sitelinks.enwiki && ent.sitelinks.enwiki.title;
    let url = '';
    if (wiki) url = await wikipediaThumb(wiki, fetchFn).catch(() => '');
    if (url) return { url, page: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(wiki.replace(/ /g, '_')) };
    url = commonsUrl(ent);
    if (url) return { url, page: 'https://www.wikidata.org/wiki/' + ent.id };
  }
  return { url: '', page: '' };
}

/**
 * Handler rute. rateLimitFn(env, request) → Response|null (vraća 429 ili null) — prosleđuje worker.js,
 * poziva se samo kad slike nema u kešu (keš pogoci ne troše limit i ne idu na Wikimedia).
 */
export async function handleCityImage(request, env, ctx, opts = {}) {
  const cors = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'GET') return json({ error: 'method' }, 405, cors);

  const url = new URL(request.url);
  const city = String(url.searchParams.get('city') || '').replace(/^[\s\p{Extended_Pictographic}\uFE0F\u200D]+/u, '').trim();
  if (!city || city.length > MAX_CITY || !SAFE_TEXT.test(city)) return json({ error: 'bad_city' }, 400, cors);

  const key = EN[normalizeCity(city)] ? normalizeCity(EN[normalizeCity(city)]) : normalizeCity(city);
  const fetchFn = opts.fetch || fetch;
  const cache = 'cache' in opts ? opts.cache : (typeof caches !== 'undefined' ? caches.default : null);
  const cacheKey = new Request('https://sklopi.cache/city-image?c=' + encodeURIComponent(key));

  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return json(await hit.json(), 200, Object.assign({ 'Cache-Control': 'public, max-age=86400' }, cors));
  }
  if (opts.rateLimit) {
    const limited = await opts.rateLimit(env, request, cors);
    if (limited) return limited;
  }

  let out;
  try { out = await resolveCityImage(city, fetchFn); } catch (e) { out = null; }
  if (!out) return json({ url: '', error: 'upstream' }, 200, Object.assign({ 'Cache-Control': 'no-store' }, cors));   // greška ≠ "nema slike": ne kešira se

  const body = { url: out.url, source: out.url ? 'wikimedia' : '', page: out.page };
  const ttl = out.url ? HIT_SECONDS : MISS_SECONDS;
  if (cache) {
    const put = cache.put(cacheKey, new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=' + ttl } }));
    if (ctx && ctx.waitUntil) ctx.waitUntil(put); else await put;
  }
  return json(body, 200, Object.assign({ 'Cache-Control': 'public, max-age=' + (out.url ? 86400 : 3600) }, cors));
}
