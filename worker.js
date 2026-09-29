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
  currency_rate: '<approximate rate: 1 <currency> ≈ N RSD>',
  timezone_iana: '<IANA timezone id of DEST, e.g. Europe/Athens>',
  timezone: '<short label, e.g. EET (UTC+2)>',
  language: '<main local language(s) of DEST>',
  safety_level: '<one short phrase rating how safe DEST is for tourists, in the output language>',
  safety_note: '<one short practical safety tip specific to DEST>',
  weather: { season_now: '<current season in DEST>', temp_range: '<typical temperature range now, °C>', icon: '<one weather emoji>', description: '<short description>', best_months: '<best months to visit>' },
  visa: { required: '<true|false — for citizens of Serbia travelling to DEST\'s country>', type: '<entry rule for Serbian citizens>', duration: '<allowed stay>', passport_note: '<passport validity rule>', health_note: '<health/insurance note>' },
  daily_cost: {
    budget: { range: '<EUR range per person per day>', note: '<what it covers in DEST>' },
    mid: { range: '<EUR range>', note: '<...>' },
    comfort: { range: '<EUR range>', note: '<...>' },
  },
  transport: { public: '<local public transport and fare>', taxi: '<typical airport–centre taxi price in DEST>', tip: '<one tip>' },
  practical: { plug: '<socket type and voltage used in DEST>', water: '<is tap water drinkable>', tip_custom: '<tipping custom in DEST>' },
  must_see: [{ name: '<real landmark in DEST>', note: '<short tip>' }],
  phrases: [{ sr: '<everyday phrase in the reader language>', local: '<same phrase in the local language of DEST>' }],
  climate_months: { hi: '<12 numbers Jan→Dec, avg daytime max °C in DEST>', lo: '<12 numbers, avg night min °C>', rain: '<12 numbers, mm of rain per month>', sea: '<12 numbers sea temperature °C, or null if DEST has no sea>' },
  getting_there: { airlines: '<airlines flying Belgrade → DEST>', flight_time: '<flight duration from Belgrade, direct or with stop>', by_road: '<by car/bus/train from Serbia: km and hours, or "not practical">', tip: '<booking tip>' },
  airport_to_center: [{ mode: '<Metro/Bus/Train/Taxi at DEST airport>', price: '<price>', duration: '<duration>' }],
  food: [{ dish: '<traditional dish or drink of DEST>', note: '<where to eat it and typical price>' }],
};

async function handleDestInfo(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  let dest = '', lang = 'sr';
  try {
    const body = await request.json();
    dest = String(body.dest || '').trim().slice(0, 80);
    lang = String(body.lang || 'sr').trim().slice(0, 5);
  } catch (e) {}
  if (!dest) return json({ error: 'nedostaje dest' }, 400);


  const L = SUPPORTED.includes(lang) ? lang : 'sr';
  const LANG_EN = { sr: 'Serbian (Latin script)', en: 'English', de: 'German', ru: 'Russian' }[L];
  const now = new Date();
  const prompt =
    'You are a travel expert helping travellers from Serbia. DEST = "' + dest + '". ' +
    'Return ONLY a JSON object with EXACTLY the keys of the schema below, filled with REAL facts about DEST and the country it is in. ' +
    'The schema values in <angle brackets> are instructions, NOT example data: replace every one of them; never output angle brackets and never reuse data of another city or country. ' +
    'Everything (currency, language, flag, plug type, dishes, phrases, landmarks, transport) must be correct for DEST specifically. ' +
    'Today is ' + now.toISOString().slice(0, 10) + ' (use it for season_now). must_see: 5 items, phrases: 5 items, food: 5 items, airport_to_center: 2-4 options, ' +
    'climate_months: arrays of exactly 12 numbers Jan→Dec (sea = null if no sea). ' +
    'LANGUAGE RULE: every human-readable value — including safety_level, safety_note, water, tips, notes, descriptions, season names, transport and airline notes, dish notes and month lists — must be written in ' + LANG_EN + (L === 'sr' ? ' (ekavian, e.g. "voda je pitka", "bezbedno")' : '') + ', never in English or any other language. The ONLY exceptions are proper names (dishes, landmarks, airlines) and phrases[].local, which is the local language of DEST. ' +
    'Schema:\n' + JSON.stringify(SCHEMA) + '\nAll keys are required. Return ONLY JSON.';

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.GROQ_API_KEY },
    body: JSON.stringify({
      model: env.GROQ_MODEL || 'openai/gpt-oss-120b',
      reasoning_effort: 'low',
      max_tokens: 8000,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!r.ok) return json({ error: 'Groq HTTP ' + r.status + ': ' + (await r.text()).slice(0, 200) }, 502);

  const data = await r.json();
  const raw = data.choices?.[0]?.message?.content || '';
  try {
    const out = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    try {
      out.local_time_now = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: out.timezone_iana }).format(new Date());
    } catch (e) { delete out.local_time_now; }
    delete out.timezone_iana;
    return json(out);
  } catch (e) {
    return json({ error: 'model nije vratio ispravan JSON' }, 502);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/dest-info') return handleDestInfo(request, env);
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
