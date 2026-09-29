// worker.js — ulazna tačka Worker-a "sklopi".
// Dodaje rutu /api/dest-info, a sve ostalo (cron, alerti, ostale rute)
// prosleđuje postojećem price-alert-worker.js kao do sada.
import * as alertMod from './price-alert-worker.js';

const alertWorker = alertMod.default || alertMod;

const CORS = {
  'Access-Control-Allow-Origin': '*', // bolje: tvoj domen, npr. 'https://sklopi.rs'
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Šema odgovora sa OPISIMA polja (ne sa primerom konkretnog grada — model je ranije kopirao
// vrednosti iz primera, pa je npr. za Atinu vraćao italijanski jezik i rimska jela).
const SUPPORTED = ['sr', 'en', 'de', 'ru'];
const SCHEMA = {
  flag: '<flag emoji of the country where DEST is located>',
  currency: '<ISO currency code used in DEST, e.g. the local currency>',
  currency_rate: '<approximate rate: 1 <DEST currency> ≈ N <currency of ORIGIN country>; if both use the same currency output exactly the single word SAME>',
  timezone_iana: '<IANA timezone id of DEST, e.g. Europe/Athens>',
  timezone: '<short label, e.g. EET (UTC+2)>',
  language: '<the official/main language(s) a tourist will actually hear in DEST, max 2, no regional minority languages>',
  safety_level: '<one short phrase rating how safe DEST is for tourists, in the output language>',
  safety_note: '<one short practical safety tip specific to DEST>',
  weather: { season_now: '<current season in DEST>', temp_range: '<typical temperature range now, °C>', icon: '<one weather emoji>', description: '<short description>', best_months: '<best months to visit>' },
  visa: { required: '<true|false — for holders of the PASSPORT country travelling to DEST\'s country>', type: '<entry rule for PASSPORT holders>', duration: '<allowed stay>', passport_note: '<passport validity rule>', health_note: '<health/insurance note>' },
  daily_cost: {
    budget: { range: '<EUR range per person per day>', note: '<what it covers in DEST>' },
    mid: { range: '<EUR range>', note: '<...>' },
    comfort: { range: '<EUR range>', note: '<...>' },
  },
  transport: { public: '<local public transport and fare>', taxi: '<typical airport–centre taxi price in DEST>', tip: '<one tip>' },
  practical: { plug: '<socket type and voltage used in DEST>', water: '<is tap water drinkable>', tip_custom: '<tipping custom in DEST>' },
  must_see: [1,2,3,4,5].map((n) => ({ name: '<real landmark #' + n + ' in DEST>', note: '<short tip>' })),
  phrases: [1,2,3,4,5].map((n) => ({ sr: '<everyday phrase #' + n + ' in the reader language>', local: '<same phrase in the local language of DEST>' })),
  climate_months: { hi: '<12 numbers Jan→Dec, avg daytime max °C in DEST>', lo: '<12 numbers, avg night min °C>', rain: '<12 numbers, mm of rain per month>', sea: '<12 numbers sea temperature °C, or null if DEST has no sea>' },
  getting_there: { airlines: '<airlines flying ORIGIN → DEST>', flight_time: '<flight duration from ORIGIN, direct or with stop>', by_road: '<by car/bus/train from ORIGIN: km and hours, or "not practical">', tip: '<booking tip>' },
  airport_to_center: [{ mode: '<Metro/Bus/Train/Taxi at DEST airport>', price: '<price>', duration: '<duration>' }],
  emergency: { general: '<general emergency number in DEST\'s country>', police: '<police number>', ambulance: '<ambulance number>', embassy: '<embassy or consulate of the PASSPORT country in DEST\'s country: city/address or phone if known, otherwise where to find it; if PASSPORT country has none there, say which embassy handles it>' },
  connectivity: { roaming: '<roaming situation for a phone from ORIGIN country in DEST\'s country (EU roaming, extra charges, etc.)>', esim: '<practical local SIM / eSIM option for tourists in DEST\'s country>', cash: '<card vs cash habits in DEST>', atm: '<ATM tips and fee warnings in DEST>' },
  neighborhoods: [1,2,3,4].map((n) => ({ area: '<real district #' + n + ' of DEST to stay in>', for: '<who it suits>', price: '<typical hotel price per night in EUR>', note: '<one short reason>' })),
  scams: [1,2,3,4].map((n) => ({ title: '<common tourist scam or trap #' + n + ' in DEST>', note: '<how to avoid it>' })),
  food: [1,2,3,4,5].map((n) => ({ dish: '<traditional dish or drink #' + n + ' of DEST>', note: '<where to eat it and typical price>' })),
};

async function handleDestInfo(request, env, ctx) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  let dest = '', lang = 'sr', origin = '', passport = '';
  try {
    const body = await request.json();
    dest = String(body.dest || '').trim().slice(0, 80);
    lang = String(body.lang || 'sr').trim().slice(0, 5);
    origin = String(body.origin || '').trim().slice(0, 80);
    passport = String(body.passport || '').trim().slice(0, 60);
  } catch (e) {}
  if (!dest) return json({ error: 'nedostaje dest' }, 400);


  const L = SUPPORTED.includes(lang) ? lang : 'sr';

  // ── Keš: isti grad (+ jezik, polazak, pasoš, mesec) se generiše samo jednom ──
  const cacheKey = makeKey(dest, L, origin, passport);
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(finalize(cached), 200, { 'X-Cache': 'HIT' });
  // Ako isti zahtev već traje u ovom Worker-u, čekaj njegov rezultat (bez drugog AI poziva)
  if (INFLIGHT.has(cacheKey)) {
    try { return json(finalize(await INFLIGHT.get(cacheKey)), 200, { 'X-Cache': 'JOIN' }); }
    catch (e) { return json({ error: 'unavailable' }, 503, { 'Retry-After': '5' }); }
  }
  const LANG_EN = { sr: 'Serbian (Latin script)', en: 'English', de: 'German', ru: 'Russian' }[L];
  const now = new Date();
  const prompt =
    'You are a travel expert. DEST = "' + dest + '". ' +
    'The traveller departs from ORIGIN = "' + (origin || 'Belgrade, Serbia') + '" and holds the passport of PASSPORT = "' + (passport || ('the country where ORIGIN is located')) + '". ' +
    'PASSPORT may list several passports (e.g. "Serbia, Germany" or "Srbija-Nemačka"): treat the traveller as holding all of them and, for visa/entry/health rules, use the MOST favourable one (an EU/Schengen passport means free movement, an ID card is enough) and say which passport the rule applies to. '+
    'ORIGIN is the departure city: flights, road distance, airport transfers and travel time are for ORIGIN → DEST (e.g. Athens → Sofia), not from Serbia. Roaming is for a typical mobile plan of the FIRST passport country listed (state that assumption in one short phrase). '+
    'Currency facts as of 2026: Bulgaria uses the euro (EUR) since 1 January 2026, Croatia since 2023; never output BGN for Bulgaria. If the DEST currency equals the ORIGIN country currency, set currency_rate to exactly the word SAME (nothing else) instead of a rate. '+
    'Everything that depends on the traveller (visa/entry rules, embassy, roaming, currency_rate, flights and routes, road distance) must be correct for that ORIGIN and PASSPORT — never assume Serbia unless ORIGIN/PASSPORT say so. ' +
    'Return ONLY a JSON object with EXACTLY the keys of the schema below, filled with REAL facts about DEST and the country it is in. ' +
    'The schema values in <angle brackets> are instructions, NOT example data: replace every one of them; never output angle brackets and never reuse data of another city or country. ' +
    'Everything (currency, language, flag, plug type, dishes, phrases, landmarks, transport) must be correct for DEST specifically. ' +
    'Today is ' + now.toISOString().slice(0, 10) + ' (use it for season_now). must_see: 5 items, phrases: 5 items, food: 5 items, neighborhoods: 4 items, scams: 4 items, airport_to_center: 2-4 options, ' +
    'climate_months: arrays of exactly 12 numbers Jan→Dec (sea = null if no sea). ' +
    'KEY RULE: JSON keys must stay EXACTLY as in the schema (English, never translated); every array item must be an object with all its keys filled, no empty or missing fields. ' +
    'LANGUAGE RULE: every human-readable value — including safety_level, safety_note, water, tips, notes, descriptions, season names, transport and airline notes, dish notes and month lists — must be written in ' + LANG_EN + (L === 'sr' ? ' (ekavian, e.g. "voda je pitka", "bezbedno", "nemački" — never ijekavian/Croatian forms like "njemački"; always write proper diacritics č ć š ž đ, never c/s/z instead)' : '') + ', never in English or any other language. The ONLY exceptions are proper names (dishes, landmarks, airlines) and phrases[].local, which is the local language of DEST. ' +
    'Schema:\n' + JSON.stringify(SCHEMA) + '\nAll keys are required. Return ONLY JSON.';

  const work = generateInfo(env, prompt);
  INFLIGHT.set(cacheKey, work);
  try {
    const out = await work;                               // sirovo (sa timezone_iana)
    ctx.waitUntil(cacheSet(env, cacheKey, out));          // greške se nikad ne keširaju
    return json(finalize(out), 200, { 'X-Cache': 'MISS' });
  } catch (e) {
    console.error('[dest-info] neuspeh za', dest, '-', e && e.message);   // detalji samo u logu
    return json({ error: 'unavailable' }, 503, { 'Retry-After': '5' });  // klijent ne vidi Groq detalje
  } finally {
    INFLIGHT.delete(cacheKey);
  }
}

// ── Pomoćne funkcije ─────────────────────────────────────────────
const INFLIGHT = new Map();
const CACHE_TTL = 35 * 24 * 3600; // ključ sadrži mesec, pa se info osveži jednom mesečno

function norm(x) {
  return String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
function makeKey(dest, lang, origin, passport) {
  const month = new Date().toISOString().slice(0, 7);
  return ['v2', norm(dest), lang, norm(origin) || 'default', norm(passport) || 'auto', month].join('|');
}
async function cacheGet(env, key) {
  try {
    if (env.DEST_CACHE) return await env.DEST_CACHE.get('di:' + key, 'json');
    const r = await caches.default.match(new Request('https://dest-info.cache/' + encodeURIComponent(key)));
    return r ? await r.json() : null;
  } catch (e) { return null; }
}
async function cacheSet(env, key, val) {
  try {
    if (env.DEST_CACHE) { await env.DEST_CACHE.put('di:' + key, JSON.stringify(val), { expirationTtl: CACHE_TTL }); return; }
    await caches.default.put(
      new Request('https://dest-info.cache/' + encodeURIComponent(key)),
      new Response(JSON.stringify(val), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=' + CACHE_TTL } })
    );
  } catch (e) {}
}

// Lokalno vreme se računa pri SVAKOM odgovoru (ne sme ostati zamrznuto u kešu)
function finalize(raw) {
  const out = { ...raw };
  try {
    out.local_time_now = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: out.timezone_iana }).format(new Date());
  } catch (e) { delete out.local_time_now; }
  delete out.timezone_iana;
  return out;
}

function validInfo(o) {
  return o && typeof o === 'object' && o.currency && o.visa && o.climate_months &&
    Array.isArray(o.must_see) && o.must_see.length >= 3 && Array.isArray(o.food) && o.food.length >= 3;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Primarni model, na 429 kratko čekanje pa jedan ponovni pokušaj, zatim rezervni model
// (drugi model ima svoj TPM limit na Groq-u).
async function generateInfo(env, prompt) {
  const models = [
    { name: env.GROQ_MODEL || 'openai/gpt-oss-120b', max: 4000, extra: { reasoning_effort: 'low' } },
    { name: env.GROQ_FALLBACK_MODEL || 'llama-3.3-70b-versatile', max: 3500, extra: {} },
  ];
  let lastErr = 'nema odgovora';
  for (const m of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let r;
      try {
        r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.GROQ_API_KEY },
          body: JSON.stringify({
            model: m.name, ...m.extra,
            max_tokens: m.max,       // Groq ovo uračunava u TPM procenu — zato ne 8000
            temperature: 0.3,
            response_format: { type: 'json_object' },
            messages: [{ role: 'user', content: prompt }],
          }),
        });
      } catch (e) { lastErr = 'mreža: ' + e.message; break; }

      if (r.status === 429) {
        lastErr = m.name + ' HTTP 429';
        const ra = Math.min(parseFloat(r.headers.get('retry-after')) || 2, 4);
        if (attempt === 0) { await sleep(ra * 1000); continue; }
        break;                                   // sledeći model
      }
      if (!r.ok) { lastErr = m.name + ' HTTP ' + r.status; break; }

      const data = await r.json();
      const raw = data.choices?.[0]?.message?.content || '';
      try {
        const out = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
        if (/^BGN$/i.test(String(out.currency || ''))) { out.currency = 'EUR'; out.currency_rate = ''; } // Bugarska: evro od 1.1.2026.
        if (validInfo(out)) return out;
        lastErr = m.name + ' nepotpun JSON';
      } catch (e) { lastErr = m.name + ' neispravan JSON'; }
      // nepotpun/neispravan odgovor: pokušaj ponovo, pa sledeći model
    }
  }
  throw new Error(lastErr);
}

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json', ...extra } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/dest-info') return handleDestInfo(request, env, ctx);
    if (alertWorker && typeof alertWorker.fetch === 'function') {
      return alertWorker.fetch(request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(event, env, ctx) {
    if (alertWorker && typeof alertWorker.scheduled === 'function') {
      return alertWorker.scheduled(event, env, ctx);
    }
  },
};
