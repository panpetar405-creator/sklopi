/* ==========================================================
   SKLOPI — Cloudflare Worker: PRAVE aktivnosti sa Viator-a za sekciju
   "Najpopularnije aktivnosti" (#activitiesDetail u app.js).

   ZAŠTO OVAJ WORKER POSTOJI: dosad je ta sekcija za većinu destinacija (sve
   osim ~13 ručno pripremljenih gradova u app.js/CITY_ACTIVITIES) prikazivala
   3 generička naziva ("Ulaznice za glavne znamenitosti"...) jer nismo imali
   pravu listu znamenitosti/tura za svako od 700+ mesta koje korisnik može
   da upiše. Ovaj Worker rešava to iz korena: za BILO KOJU destinaciju vraća
   3 STVARNA proizvoda sa Viator-a (pravi naziv ture, prava "od" cena, prava
   slika, pravi link direktno na tu turu) — to je prava vrednost usluge,
   ne ilustracija.

   Ruta:   POST /go/destination-activities   (isti obrazac kao /go/destination-images
           i /go/send-confirmation — deploy-uje se kao deo istog Worker-a/rute).
   Telo:   {"dest":"Zagreb", "q":"Zagreb, Croatia"}    (q = engleski naziv za Viator pretragu,
           app.js šalje isti izraz koji inače koristi za Viator affiliate link)
   Odgovor: {"items":[{"name":"...", "price":42, "currency":"EUR", "img":"https://…", "url":"https://…"}]}
           (do 3 stavke; prazan niz ako Viator nema rezultata za taj pojam)

   PODEŠAVANJE (ako VIATOR_API_KEY već postoji od destination-images.js Worker-a,
   samo dodaj ovu rutu — ključ se ne ponavlja):
     1) Viator nalog → Tools → Affiliate API → ključ (Basic Access je dovoljan).
     2) wrangler secret put VIATOR_API_KEY   (ako već nije postavljen za ovaj Worker)
     3) (opciono) ALLOWED_ORIGINS = "https://sklopi.rs,https://www.sklopi.rs"
     4) Route: <tvoj-domen>/go/destination-activities → ovaj Worker.
   NAPOMENA: nazivi polja u Viator odgovoru (title/pricingSummary/productUrl...) su
   uzeti iz uobičajene strukture Merchandising API v2 odgovora — pre prvog live
   deploy-a proveri jedan stvaran odgovor (npr. Postman) i po potrebi prilagodi
   extractProduct() ako se neko polje zove drugačije u tvojoj verziji API-ja.
   PRAVILA VIATORA (Technical Guide): rezultati pretrage smeju da se keširaju
   najviše 1h — zato je keš ovde 1h, isto kao u destination-images.js.
========================================================== */
const VIATOR_URL = 'https://api.viator.com/partner/search/freetext';
const CACHE_SECONDS = 3600;
const MAX_TERM = 80;
const ITEMS_PER_QUERY = 3;

function corsHeaders(request, env){
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = !allowed.length || allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? (allowed.length ? origin : '*') : allowed[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}
function json(body, status, headers){
  return new Response(JSON.stringify(body), {status, headers: Object.assign({'Content-Type':'application/json'}, headers)});
}

// Bira sliku iz proizvoda — ista logika kao pickImageUrl() u destination-images.js.
function pickImageUrl(product){
  const imgs = (product && product.images) || [];
  const ordered = imgs.filter(i => i && i.isCover).concat(imgs.filter(i => i && !i.isCover));
  for (const img of ordered){
    const vars = (img.variants || []).filter(v => v && v.url);
    if (!vars.length) continue;
    const big = vars.filter(v => (v.width || 0) >= 300);
    const pool = big.length ? big : vars;
    pool.sort((a, b) => Math.abs((a.width || 0) - 400) - Math.abs((b.width || 0) - 400));
    return pool[0].url;
  }
  return '';
}

// Izvlači {name, price, currency, img, url} iz jednog Viator proizvoda.
// Više mogućih putanja za cenu/naslov jer se polja mogu zvati drugačije
// zavisno od verzije API-ja koju nalog koristi — proveri na prvom pravom
// odgovoru i po potrebi skrati listu na tačno polje.
function extractProduct(p){
  if (!p) return null;
  const name = p.title || p.name || '';
  const price = (p.pricing && p.pricing.summary && p.pricing.summary.fromPrice)
    || (p.pricingSummary && p.pricingSummary.fromPrice)
    || p.fromPrice || null;
  const currency = (p.pricing && p.pricing.currency) || p.currency || 'EUR';
  const img = pickImageUrl(p);
  const url = p.productUrl || p.webURL || p.bookingLink || '';
  if (!name || price == null) return null;
  return {name, price: Math.round(price), currency, img, url};
}

async function searchActivities(term, env, fetchFn){
  const res = await fetchFn(VIATOR_URL, {
    method: 'POST',
    headers: {
      'exp-api-key': env.VIATOR_API_KEY,
      'Accept': 'application/json;version=2.0',
      'Accept-Language': 'en-US',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      searchTerm: term,
      searchTypes: [{searchType: 'PRODUCTS', pagination: {start: 1, count: 10}}],
      currency: 'EUR'
    })
  });
  if (!res.ok) throw new Error('Viator HTTP ' + res.status);
  const data = await res.json();
  const list = (data && data.products && (data.products.results || data.products)) || [];
  const out = [];
  for (const p of (Array.isArray(list) ? list : [])){
    const item = extractProduct(p);
    if (item) out.push(item);
    if (out.length >= ITEMS_PER_QUERY) break;
  }
  return out;
}

// Keš po pojmu pretrage (1h) — isti grad/pojam iz više poseta ne troši Viator limit.
async function cachedActivities(term, env, ctx, fetchFn, cache){
  const key = new Request('https://sklopi.cache/dest-activities?q=' + encodeURIComponent(term.toLowerCase()));
  if (cache){
    const hit = await cache.match(key);
    if (hit) return (await hit.json()).items || [];
  }
  const items = await searchActivities(term, env, fetchFn);
  if (cache){
    const put = cache.put(key, new Response(JSON.stringify({items}), {headers: {'Cache-Control': 'public, max-age=' + CACHE_SECONDS, 'Content-Type': 'application/json'}}));
    if (ctx && ctx.waitUntil) ctx.waitUntil(put); else await put;
  }
  return items;
}

export default {
  async fetch(request, env, ctx, deps){
    const cors = corsHeaders(request, env || {});
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: cors});
    if (request.method !== 'POST') return json({error: 'method'}, 405, cors);
    if (!env || !env.VIATOR_API_KEY) return json({items: [], error: 'not_configured'}, 503, cors);

    let body;
    try { body = await request.json(); } catch(e){ return json({error: 'bad_json'}, 400, cors); }
    const q = String((body && body.q) || (body && body.dest) || '').trim().slice(0, MAX_TERM);
    if (!q) return json({error: 'no_query'}, 400, cors);

    const fetchFn = (deps && deps.fetch) || fetch;
    const cache = (deps && 'cache' in deps) ? deps.cache : (typeof caches !== 'undefined' ? caches.default : null);
    try {
      const items = await cachedActivities(q, env, ctx, fetchFn, cache);
      return json({items}, 200, Object.assign({'Cache-Control': 'no-store'}, cors));
    } catch(e){
      console.warn('destination-activities:', q, e && e.message);
      return json({items: [], error: 'upstream'}, 200, Object.assign({'Cache-Control': 'no-store'}, cors));
    }
  }
};
