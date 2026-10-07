// worker.js — ulazna tačka Worker-a "sklopi".
// Dodaje rutu /api/dest-info, a sve ostalo (cron, alerti, ostale rute)
// prosleđuje postojećem price-alert-worker.js kao do sada.
import * as alertMod from './price-alert-worker.js';
import { rateLimit, clientIp, tooManyRequests } from './rate-limit.js';

const alertWorker = alertMod.default || alertMod;

const CORS = {
  'Access-Control-Allow-Origin': 'https://sklopi.rs', // sajt zove /api/dest-info sa istog domena; CORS je potreban samo za druge izvore
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Šema odgovora sa OPISIMA polja (ne sa primerom konkretnog grada — model je ranije kopirao
// vrednosti iz primera, pa je npr. za Atinu vraćao italijanski jezik i rimska jela).
const SUPPORTED = ['sr', 'en', 'de', 'ru'];
const MAX_BODY = 2048;                                   // bajtova; legitimno telo je ~200
const SAFE_TEXT = /^[\p{L}\p{M}\p{N} .,'’()\/&-]+$/u;          // vidi handleDestInfo
// Limiti važe kad NEMA [[ratelimits]] bindinga (fallback); sa bindingom važe vrednosti iz wrangler.toml.
const DEST_LIMIT_IP = 6;        // AI poziva po IP-u u minuti (keš pogoci ne računaju)
const DEST_LIMIT_GLOBAL = 40;   // AI poziva ukupno u minuti, po lokaciji
const SCHEMA = {
  country: '<name of the country where DEST is located, in the output language>',
  real_place: '<true if DEST is a real city, town, island, region or country that tourists can visit; false if it is a misspelling, a made-up name or not a place>',
  suggestion: '<if DEST looks like a misspelling of a real place: the correctly spelled name of that place; otherwise an empty string>',
  flag: '<flag emoji of the country where DEST is located>',
  currency: '<ISO currency code used in DEST, e.g. the local currency>',
  currency_rate: '<approximate rate: 1 <DEST currency> ≈ N <currency of ORIGIN country>; if both use the same currency output exactly the single word SAME>',
  timezone_iana: '<IANA timezone id of DEST, e.g. Europe/Athens>',
  timezone: '<short label, e.g. EET (UTC+2)>',
  language: '<the official/main language(s) a tourist will actually hear in DEST, max 2, no regional minority languages>',
  language_codes: '<JSON array of the ISO 639-1 codes of exactly those languages, e.g. ["de"] or ["el"]>',
  safety_level: '<one short phrase rating how safe DEST is for tourists, in the output language>',
  safety_note: '<one short practical safety tip specific to DEST>',
  weather: { season_now: '<current season in DEST>', temp_range: '<typical temperature range now, °C>', icon: '<one weather emoji>', description: '<short description>', best_months: '<JSON array of month NUMBERS 1-12 (1=January) that are best to visit, e.g. [5,6,9] — numbers only, no month names>' },
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


// ── Dodatni odeljci (učitavaju se tek kad korisnik klikne, poseban AI poziv i poseban keš) ──
const EXTRA_SCHEMA = {
  entry: {
    schengen: '<true if the country of DEST is in the Schengen area, otherwise false>',
    ees_etias: '<what EES (Entry/Exit System) and ETIAS mean for the PASSPORT holder entering the country of DEST today, and whether/when ETIAS is required; write that no such checks apply if the PASSPORT holder is an EU citizen or DEST is outside Schengen>',
    customs: '<entry customs limits of DEST\'s country for a traveller coming from ORIGIN: cash declaration threshold, alcohol, tobacco, food/meat/dairy limits>',
    docs: '<other documents usually needed at entry: ID card or passport validity, proof of accommodation, return ticket>',
  },
  driving: {
    toll: '<road toll or vignette system for passenger cars in the country of DEST and typical prices, or that there are no tolls>',
    speed: '<speed limits: built-up area / open road / motorway in km/h>',
    parking: '<parking rules, restricted-traffic or low-emission zones in the city of DEST and a typical parking price>',
    rules: '<mandatory equipment, blood alcohol limit, headlight rule and insurance/green card for a car registered in the ORIGIN country>',
  },
  city_tax: { amount: '<tourist tax per person per night in DEST in EUR, or that there is none>', note: '<who pays it, how it is paid, exemptions>' },
  day_trips: [1, 2, 3].map((n) => ({ name: '<real place #' + n + ' within about 2 hours of DEST>', time: '<travel time and how to get there>', note: '<why it is worth going>' })),
};

function extraPrompt(dest, origin, passport, LANG_EN, L, now) {
  return 'You are a travel expert. DEST = "' + dest + '". ' +
    'The traveller departs from ORIGIN = "' + (origin || 'Belgrade, Serbia') + '" and holds the passport of PASSPORT = "' + (passport || 'the country where ORIGIN is located') + '". ' +
    'PASSPORT may list several passports: use the MOST favourable one for entry rules and say which passport the rule applies to. ' +
    'Today is ' + now.toISOString().slice(0, 10) + '; give rules valid on that date. ' +
    'Return ONLY a JSON object with EXACTLY the keys of the schema below, filled with REAL facts about DEST and the country it is in. ' +
    'The schema values in <angle brackets> are instructions, NOT example data: replace every one of them and never output angle brackets. ' +
    'If you are not sure about an exact price, limit or rule, do NOT invent a number: say briefly (in the output language) that it should be checked with the official source. ' +
    'day_trips: 3 items, each an object with all its keys filled. JSON keys must stay EXACTLY as in the schema (English, never translated). ' +
    'LANGUAGE RULE: every human-readable value must be written in ' + LANG_EN + (L === 'sr' ? ' (ekavian, e.g. "nemački", never "njemački"; always use proper diacritics č ć š ž đ)' : '') + ', except proper names. ' +
    'Schema:\n' + JSON.stringify(EXTRA_SCHEMA) + '\nAll keys are required. Return ONLY JSON.';
}

// ── Itinerar po danima ("Tvoj itinerar"): pravi vodič sa imenovanim mestima, poseban AI poziv i keš ──
const ITIN_KINDS = ['sight', 'food', 'walk', 'view', 'market', 'trip', 'rest', 'night'];
const ITIN_SCHEMA_DAY = {
  title: '<short theme of the day that names the area, e.g. the old town and sunset>',
  area: '<main district / area of the day>',
  tip: '<one practical tip for this day: transport, tickets, best light, siesta closing times, dress code>',
  slots: [{ t: '<HH:MM 24h>', k: '<one of: ' + ITIN_KINDS.join(' | ') + '>', name: '<REAL specific place or experience>', note: '<max 160 characters: why it is worth it + one concrete tip, e.g. what to order or when to go>', dur: '<e.g. ~2h>' }],
};
function itineraryPrompt(dest, days, tier, LANG_EN, L, now) {
  const style = {
    budget: 'BUDGET: free or cheap sights, bakeries, markets, local taverns, public transport and walking',
    balanced: 'BALANCED: a mix of must-see sights and authentic local places, mid-range restaurants, public transport plus an occasional taxi',
    comfort: 'COMFORT: relaxed pace, well-reviewed restaurants, guided tours or tickets booked ahead, taxis between far stops',
  }[tier] || 'BALANCED';
  return 'You are a local expert travel guide writing a REAL, usable day-by-day itinerary. DEST = \"' + dest + '\". ' +
    'Number of days: ' + days + '. Travel style: ' + style + '. Today is ' + now.toISOString().slice(0, 10) + ' — adapt to the current season (daylight, weather, what is open). ' +
    'RULES: ' +
    '1) Every place must be a REAL, well-established, specifically named place in or near DEST (museum, landmark, neighbourhood, market, viewpoint, trail, beach, cafe, bakery, restaurant, tavern). ' +
    'Prefer places that have existed for many years and are widely known. NEVER invent names. If you are not sure that a specific restaurant or cafe exists, name the street/square/neighbourhood and the dish instead (for example a traditional tavern around a named square), but never fabricate a venue. ' +
    '2) Cluster every day in ONE area and order the stops so the route is logical with little back-and-forth; when two stops are far apart say how to get between them (on foot 10 min, tram/bus line, taxi) in the note. ' +
    '3) Day 1 is lighter (arrival, orientation walk, a first local dinner). The last day is lighter and ends with a relaxed morning near the centre and a buffer for departure. ' +
    (days >= 4 ? 'Include ONE real day trip (a named place within about 2 hours, with how to get there) on day 3 or later. ' : '') +
    '4) Each day has 5-7 slots between 08:00 and 22:30 with realistic times and durations, including lunch and dinner (name the local dish AND where to eat it) and one slot for a rest, coffee or viewpoint. ' +
    '5) note: at most 160 characters — why it is worth it plus ONE concrete tip (what to order, best time of day, book ahead, free entry). Do NOT state exact opening hours, ticket prices or phone numbers unless you are certain; otherwise tell the traveller to check the opening hours. ' +
    '6) k must be one of: ' + ITIN_KINDS.join(', ') + '. ' +
    'Return ONLY a JSON object {\"days\": [...]} with EXACTLY ' + days + ' items, each shaped like the schema below. The schema values in <angle brackets> are instructions, NOT example data: replace every one and never output angle brackets. JSON keys stay EXACTLY as in the schema (English). ' +
    'LANGUAGE RULE: every human-readable value must be written in ' + LANG_EN + (L === 'sr' ? ' (ekavian, e.g. \"nemački\", never \"njemački\"; always use proper diacritics č ć š ž đ)' : '') + ', except proper names of places. ' +
    'Day schema:\n' + JSON.stringify(ITIN_SCHEMA_DAY) + '\nReturn ONLY JSON.';
}
function validItinerary(o, want) {
  if (!o || !Array.isArray(o.days) || o.days.length < want) return false;
  return o.days.slice(0, want).every((d) => d && typeof d.title === 'string' && Array.isArray(d.slots) && d.slots.length >= 4 &&
    d.slots.every((s) => s && /^\d{1,2}:\d{2}$/.test(String(s.t || '').trim()) && typeof s.name === 'string' && s.name.trim().length > 1 && !/[<>]/.test(s.name + (s.note || ''))) &&
    !/[<>]/.test(d.title));
}

function hasText(v) {
  if (typeof v === 'string') return v.trim().length > 2 && !/[<>]/.test(v);
  if (Array.isArray(v)) return v.some(hasText);
  if (v && typeof v === 'object') return Object.keys(v).some((k) => hasText(v[k]));
  return false;
}
function validExtra(o) {
  return !!(o && typeof o === 'object' && hasText(o.entry) && hasText(o.driving) && hasText(o.city_tax) && Array.isArray(o.day_trips) && o.day_trips.length >= 2 && hasText(o.day_trips));
}

async function handleDestInfo(request, env, ctx) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  // Telo zahteva je malo (dest/lang/origin/passport) — veće odbijamo pre parsiranja.
  const declared = parseInt(request.headers.get('content-length') || '0', 10);
  if (declared > MAX_BODY) return json({ error: 'payload_too_large' }, 413);

  let dest = '', lang = 'sr', origin = '', passport = '', part = 'main', itinDays = 0, itinTier = 'balanced';
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ error: 'payload_too_large' }, 413);
    const body = JSON.parse(raw);
    dest = String(body.dest || '').trim().slice(0, 80);
    lang = String(body.lang || 'sr').trim().slice(0, 5);
    origin = String(body.origin || '').trim().slice(0, 80);
    passport = String(body.passport || '').trim().slice(0, 60);
    part = body.part === 'extra' ? 'extra' : (body.part === 'itinerary' ? 'itinerary' : 'main');
    if (part === 'itinerary') {
      itinDays = Math.min(10, Math.max(1, parseInt(body.days, 10) || 3));
      itinTier = ['budget', 'balanced', 'comfort'].includes(body.tier) ? body.tier : 'balanced';
    }
  } catch (e) {}
  if (!dest) return json({ error: 'nedostaje dest' }, 400);
  // dest/origin/passport ulaze u AI prompt: dozvoljena su samo slova, cifre, razmak i .,'’-()/&
  // (sprečava ubacivanje instrukcija u prompt i nasumične ključeve koji zaobilaze keš).
  if (!SAFE_TEXT.test(dest) || (origin && !SAFE_TEXT.test(origin)) || (passport && !SAFE_TEXT.test(passport))) {
    return json({ error: 'neispravan unos' }, 400);
  }


  const L = SUPPORTED.includes(lang) ? lang : 'sr';

  // ── Keš: isti grad (+ jezik, polazak, pasoš, mesec) se generiše samo jednom ──
  const post = (o) => (part === 'main' ? finalize(o) : o);
  // Itinerar ne zavisi od polaska i pasoša — deli se između svih posetilaca (jedan AI poziv po gradu/danima/stilu).
  const cacheKey = part === 'itinerary'
    ? makeKey(dest, L, '', '') + '|itin|' + itinDays + '|' + itinTier
    : makeKey(dest, L, origin, passport) + '|' + part;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(post(cached), 200, { 'X-Cache': 'HIT' });
  // Ako isti zahtev već traje u ovom Worker-u, čekaj njegov rezultat (bez drugog AI poziva)
  if (INFLIGHT.has(cacheKey)) {
    try { return json(post(await INFLIGHT.get(cacheKey)), 200, { 'X-Cache': 'JOIN' }); }
    catch (e) { return json({ error: 'unavailable' }, 503, { 'Retry-After': '5' }); }
  }
  // ── Rate limit: samo za KEŠ PROMAŠAJE (to je jedino što troši AI/Groq pozive).
  // Pogoci u kešu i spajanje na već aktivan zahtev ne broje se.
  const ip = clientIp(request);
  const rlIp = await rateLimit(env, { binding: 'RL_DEST_IP', name: 'dest-ip', key: ip, limit: DEST_LIMIT_IP, windowSec: 60 });
  if (!rlIp.ok) return tooManyRequests(rlIp.retryAfter, CORS);
  // Zaštita budžeta: gornja granica AI poziva za sve posetioce zajedno (po lokaciji).
  const rlAll = await rateLimit(env, { binding: 'RL_DEST_GLOBAL', name: 'dest-global', key: 'all', limit: DEST_LIMIT_GLOBAL, windowSec: 60 });
  if (!rlAll.ok) return tooManyRequests(rlAll.retryAfter, CORS);

  const LANG_EN = { sr: 'Serbian (Latin script)', en: 'English', de: 'German', ru: 'Russian' }[L];
  const now = new Date();
  const mainPrompt =
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
  const prompt = part === 'extra' ? extraPrompt(dest, origin, passport, LANG_EN, L, now)
    : part === 'itinerary' ? itineraryPrompt(dest, itinDays, itinTier, LANG_EN, L, now) : mainPrompt;

  const work = generateInfo(env, prompt, part, itinDays);
  INFLIGHT.set(cacheKey, work);
  try {
    const out = await work;                               // sirovo (sa timezone_iana)
    ctx.waitUntil(cacheSet(env, cacheKey, out));          // greške se nikad ne keširaju
    return json(post(out), 200, { 'X-Cache': 'MISS' });
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
  return ['v3', norm(dest), lang, norm(origin) || 'default', norm(passport) || 'auto', month].join('|');
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
async function generateInfo(env, prompt, part, want) {
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
            max_tokens: part === 'extra' ? 2500 : (part === 'itinerary' ? Math.min(7000, 900 + want * 800) : m.max),       // Groq ovo uračunava u TPM procenu — zato ne 8000
            temperature: part === 'itinerary' ? 0.4 : 0.3,
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
        if (part === 'itinerary' ? validItinerary(out, want) : (part === 'extra' ? validExtra : validInfo)(out)) return out;
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
