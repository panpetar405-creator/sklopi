/* ==========================================================
   SKLOPI — Cloudflare Worker: slike za kartice u sekciji "Destinacije" (Viator)
   Ruta:  POST /go/destination-images     (isti obrazac kao /go/send-confirmation)
   Telo:  {"items":[{"d":"Split","q":"Split, Croatia beach"}, ...]}     (najviše 40)
   Odgovor: {"images":{"Split":"https://media.tacdn.com/....jpg", ...}}   (nema slike → nema ključa)

   ZAŠTO WORKER: Viator API ključ (exp-api-key) ne sme u pregledač — svako bi ga video.
   PODEŠAVANJE:
     1) Viator nalog → Tools → Affiliate API → generiši ključ (Basic Access je dovoljan).
     2) wrangler secret put VIATOR_API_KEY
     3) (opciono) ALLOWED_ORIGINS = "https://sklopi.rs,https://www.sklopi.rs"  (env promenljiva)
     4) Route: <tvoj-domen>/go/destination-images → ovaj Worker.
   PRAVILA VIATORA (Technical Guide): rezultati pretrage smeju da se keširaju najviše 1 h — zato je
   keš ovde 1 h; /search/freetext se koristi u realnom vremenu za prikaz, ne za skladištenje kataloga.
========================================================== */
const VIATOR_URL = 'https://api.viator.com/partner/search/freetext';
const CACHE_SECONDS = 3600;
const MAX_ITEMS = 40;
const MAX_TERM = 80;
const CONCURRENCY = 4;

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

// Bira sliku iz proizvoda: naslovna (isCover) ako postoji, varijanta širine najbliže ~480 px (≥ 400 ako ima).
export function pickImageUrl(product){
  const imgs = (product && product.images) || [];
  const ordered = imgs.filter(i => i && i.isCover).concat(imgs.filter(i => i && !i.isCover));
  for (const img of ordered){
    const vars = (img.variants || []).filter(v => v && v.url);
    if (!vars.length) continue;
    const big = vars.filter(v => (v.width || 0) >= 400);
    const pool = big.length ? big : vars;
    pool.sort((a, b) => Math.abs((a.width || 0) - 480) - Math.abs((b.width || 0) - 480));
    return pool[0].url;
  }
  return '';
}

async function viatorImage(term, env, fetchFn){
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
      searchTypes: [{searchType: 'PRODUCTS', pagination: {start: 1, count: 5}}],
      currency: 'EUR'
    })
  });
  if (!res.ok) throw new Error('Viator HTTP ' + res.status);
  const data = await res.json();
  const list = (data && data.products && (data.products.results || data.products)) || [];
  for (const p of (Array.isArray(list) ? list : [])){
    const url = pickImageUrl(p);
    if (url) return url;
  }
  return '';
}

// Keš po upitu (1 h) — isti upit iz više poseta ne troši Viator limit.
async function cachedImage(term, env, ctx, fetchFn, cache){
  const key = new Request('https://sklopi.cache/dest-img?q=' + encodeURIComponent(term.toLowerCase()));
  if (cache){
    const hit = await cache.match(key);
    if (hit) return (await hit.json()).url || '';
  }
  const url = await viatorImage(term, env, fetchFn);
  if (cache){
    const put = cache.put(key, new Response(JSON.stringify({url}), {headers: {'Cache-Control': 'public, max-age=' + CACHE_SECONDS, 'Content-Type': 'application/json'}}));
    if (ctx && ctx.waitUntil) ctx.waitUntil(put); else await put;
  }
  return url;
}

export default {
  async fetch(request, env, ctx, deps){
    const cors = corsHeaders(request, env || {});
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: cors});
    if (request.method !== 'POST') return json({error: 'method'}, 405, cors);
    if (!env || !env.VIATOR_API_KEY) return json({images: {}, error: 'not_configured'}, 503, cors);

    let items;
    try { items = (await request.json()).items; } catch(e){ return json({error: 'bad_json'}, 400, cors); }
    if (!Array.isArray(items) || !items.length) return json({error: 'no_items'}, 400, cors);
    items = items.slice(0, MAX_ITEMS)
      .map(it => ({d: String((it && it.d) || '').slice(0, 60), q: String((it && it.q) || '').trim().slice(0, MAX_TERM)}))
      .filter(it => it.d && it.q);

    const fetchFn = (deps && deps.fetch) || fetch;
    const cache = (deps && 'cache' in deps) ? deps.cache : (typeof caches !== 'undefined' ? caches.default : null);
    const images = {};
    let next = 0;
    async function worker(){
      while (next < items.length){
        const it = items[next++];
        try {
          const url = await cachedImage(it.q, env, ctx, fetchFn, cache);
          if (url) images[it.d] = url;
        } catch(e){ console.warn('destination-images:', it.d, e && e.message); }
      }
    }
    await Promise.all(Array.from({length: Math.min(CONCURRENCY, items.length)}, worker));
    return json({images}, 200, Object.assign({'Cache-Control': 'no-store'}, cors));
  }
};
