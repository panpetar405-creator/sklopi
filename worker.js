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

const EXAMPLE = {
  flag: '🇮🇹', currency: 'EUR', currency_rate: '1 EUR ≈ 117 RSD',
  timezone: 'CET (UTC+1)', local_time_now: '14:30', language: 'Italijanski',
  safety_level: 'Bezbedno', safety_note: 'Pazi na džepare u centru',
  weather: { season_now: 'Jesen', temp_range: '12–22°C', icon: '🌤️', description: 'Blago i suvo', best_months: 'Apr–Jun, Sep–Okt' },
  visa: { required: false, type: 'Bez vize (Šengen 90/180)', duration: 'Do 90 dana', passport_note: 'Pasoš mora važiti još 3 meseca po povratku', health_note: 'Preporučena EHIC kartica' },
  daily_cost: {
    budget: { range: '30–50 EUR', note: 'Hostel, street food, javni prevoz' },
    mid: { range: '80–140 EUR', note: '3–4★ hotel, restoran, ulaznice' },
    comfort: { range: '200–400+ EUR', note: '5★ hotel, fine dining, taksi' },
  },
  transport: { public: 'Metro 1.50 EUR', taxi: 'Aerodrom–centar ≈ 48 EUR', tip: 'Metro za centar' },
  practical: { plug: 'Tip C/F, 230V', water: 'Česmovača pitka', tip_custom: '5–10% u restoranima' },
  must_see: [{ name: 'Koloseum', note: 'Kupi ulaznicu online unapred' }],
  phrases: [{ sr: 'Hvala', local: 'Grazie' }],
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

  var LANG_NAMES = { sr: 'srpskom', en: 'engleskom', de: 'nemačkom', ru: 'ruskom' };
  var langName = LANG_NAMES[lang] || LANG_NAMES.sr;

  const prompt =
    'Ti si travel ekspert. Za destinaciju "' + dest + '" vrati SAMO JSON objekat ' +
    'sa TAČNO ovom strukturom (primer je za Rim, prilagodi sve za ' + dest + '; must_see 5 stavki, phrases 5 stavki). ' +
    'SAV tekst u vrednostima (opisi, napomene, imena, fraze) napiši na ' + langName + ' jeziku, ' +
    'osim lokalnog izraza u phrases[].local, koji ostaje na jeziku te zemlje:\n' +
    JSON.stringify(EXAMPLE) + '\nSva polja su obavezna. Vrati SAMO JSON.';

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.GROQ_API_KEY },
    body: JSON.stringify({
      model: env.GROQ_MODEL || 'openai/gpt-oss-120b',
      reasoning_effort: 'low',
      max_tokens: 6000,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!r.ok) return json({ error: 'Groq HTTP ' + r.status + ': ' + (await r.text()).slice(0, 200) }, 502);

  const data = await r.json();
  const raw = data.choices?.[0]?.message?.content || '';
  try {
    return json(JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)));
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
