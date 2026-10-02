/* ==========================================================
   SKLOPI — rate-limit.js (samo za Worker, NE za pregledač; vidi .assetsignore)

   Jedna zajednička funkcija za sve skupe/javne rute (/api/dest-info,
   /api/flights, /go/destination-activities, ...).

   1) Ako u wrangler.toml postoji [[ratelimits]] binding sa tim imenom,
      koristi se Cloudflare Workers Rate Limiting (env[binding].limit()).
      NAPOMENA: limit važi po Cloudflare lokaciji i nije striktno tačan —
      dobar je protiv zloupotrebe/petlji, ne za tačno brojanje.
   2) Ako binding ne postoji (lokalni razvoj, zaboravljen binding), pada se
      na brojač u Cache API-ju (fiksni prozor, po lokaciji, nije atomičan).
      Slabiji je, ali je i dalje bolje nego bez ikakve zaštite.
   3) Ako i to pukne, propušta se zahtev (fail-open) — pad limitera ne sme da
      obori sajt. Greška ide u log.
========================================================== */

export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

/**
 * @param {object} env
 * @param {object} opts
 * @param {string} opts.binding    ime [[ratelimits]] bindinga u wrangler.toml
 * @param {string} opts.name       ime pravila (za ključ keša / log)
 * @param {string} opts.key        po čemu se broji (IP, 'global', ...)
 * @param {number} opts.limit      max zahteva u prozoru (samo za fallback;
 *                                 sa bindingom važi limit iz wrangler.toml)
 * @param {number} opts.windowSec  trajanje prozora u sekundama (10 ili 60)
 * @returns {Promise<{ok: boolean, retryAfter: number}>}
 */
export async function rateLimit(env, { binding, name, key, limit, windowSec = 60 }) {
  const nowSec = Math.floor(Date.now() / 1000);
  const retryAfter = Math.max(1, windowSec - (nowSec % windowSec));
  try {
    const b = env && env[binding];
    if (b && typeof b.limit === 'function') {
      const { success } = await b.limit({ key: name + ':' + key });
      return { ok: !!success, retryAfter };
    }
    if (typeof caches === 'undefined') return { ok: true, retryAfter };
    const win = Math.floor(nowSec / windowSec);
    const req = new Request('https://rl.sklopi.internal/' + encodeURIComponent(name) + '/' + encodeURIComponent(key) + '/' + win);
    const hit = await caches.default.match(req);
    const n = hit ? parseInt(await hit.text(), 10) || 0 : 0;
    if (n >= limit) return { ok: false, retryAfter };
    await caches.default.put(req, new Response(String(n + 1), { headers: { 'Cache-Control': 'max-age=' + windowSec } }));
    return { ok: true, retryAfter };
  } catch (e) {
    console.error('[rate-limit] ' + name + ' greška, propuštam zahtev:', e && e.message);
    return { ok: true, retryAfter };
  }
}

/** 429 odgovor; headers = CORS zaglavlja te rute (mogu već imati svoj content-type). */
export function tooManyRequests(retryAfter, headers = {}) {
  const h = new Headers(headers);
  h.set('Content-Type', 'application/json; charset=utf-8');
  h.set('Retry-After', String(retryAfter));
  h.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify({ error: 'rate_limited', retry_after: retryAfter }), { status: 429, headers: h });
}
