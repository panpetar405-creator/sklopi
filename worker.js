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

// Primer strukture — po jeziku. Model prepisuje jezik primera, pa primer MORA biti na jeziku odgovora
// (inače se u odgovoru mešaju npr. srpske vrednosti u engleskom prikazu).
const EXAMPLES = {
  sr: {
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
  },
  en: {
    flag: '🇮🇹', currency: 'EUR', currency_rate: '1 EUR ≈ 117 RSD',
    timezone: 'CET (UTC+1)', local_time_now: '14:30', language: 'Italian',
    safety_level: 'Safe', safety_note: 'Watch out for pickpockets in the centre',
    weather: { season_now: 'Autumn', temp_range: '12–22°C', icon: '🌤️', description: 'Mild and dry', best_months: 'Apr–Jun, Sep–Oct' },
    visa: { required: false, type: 'No visa (Schengen 90/180)', duration: 'Up to 90 days', passport_note: 'Passport must be valid for at least 3 months after return', health_note: 'EHIC card recommended' },
    daily_cost: {
      budget: { range: '30–50 EUR', note: 'Hostel, street food, public transport' },
      mid: { range: '80–140 EUR', note: '3–4★ hotel, restaurant meals, attractions' },
      comfort: { range: '200–400+ EUR', note: '5★ hotel, fine dining, taxis' },
    },
    transport: { public: 'Metro 1.50 EUR', taxi: 'Airport–centre ≈ 48 EUR', tip: 'Take the metro to the centre' },
    practical: { plug: 'Type C/F, 230V', water: 'Tap water is drinkable', tip_custom: '5–10% in restaurants' },
    must_see: [{ name: 'Colosseum', note: 'Buy your ticket online in advance' }],
    phrases: [{ sr: 'Thank you', local: 'Grazie' }],
  },
  de: {
    flag: '🇮🇹', currency: 'EUR', currency_rate: '1 EUR ≈ 117 RSD',
    timezone: 'MEZ (UTC+1)', local_time_now: '14:30', language: 'Italienisch',
    safety_level: 'Sicher', safety_note: 'Im Zentrum auf Taschendiebe achten',
    weather: { season_now: 'Herbst', temp_range: '12–22°C', icon: '🌤️', description: 'Mild und trocken', best_months: 'Apr–Jun, Sep–Okt' },
    visa: { required: false, type: 'Kein Visum (Schengen 90/180)', duration: 'Bis zu 90 Tage', passport_note: 'Der Reisepass muss nach der Rückkehr noch 3 Monate gültig sein', health_note: 'EHIC-Karte empfohlen' },
    daily_cost: {
      budget: { range: '30–50 EUR', note: 'Hostel, Streetfood, öffentliche Verkehrsmittel' },
      mid: { range: '80–140 EUR', note: '3–4★-Hotel, Restaurant, Eintrittskarten' },
      comfort: { range: '200–400+ EUR', note: '5★-Hotel, gehobene Küche, Taxi' },
    },
    transport: { public: 'Metro 1,50 EUR', taxi: 'Flughafen–Zentrum ≈ 48 EUR', tip: 'Mit der Metro ins Zentrum' },
    practical: { plug: 'Typ C/F, 230V', water: 'Leitungswasser ist trinkbar', tip_custom: '5–10 % im Restaurant' },
    must_see: [{ name: 'Kolosseum', note: 'Ticket vorab online kaufen' }],
    phrases: [{ sr: 'Danke', local: 'Grazie' }],
  },
  ru: {
    flag: '🇮🇹', currency: 'EUR', currency_rate: '1 EUR ≈ 117 RSD',
    timezone: 'CET (UTC+1)', local_time_now: '14:30', language: 'Итальянский',
    safety_level: 'Безопасно', safety_note: 'В центре остерегайтесь карманников',
    weather: { season_now: 'Осень', temp_range: '12–22°C', icon: '🌤️', description: 'Мягко и сухо', best_months: 'Апр–июн, сен–окт' },
    visa: { required: false, type: 'Без визы (Шенген 90/180)', duration: 'До 90 дней', passport_note: 'Паспорт должен быть действителен ещё 3 месяца после возвращения', health_note: 'Рекомендуется карта EHIC' },
    daily_cost: {
      budget: { range: '30–50 EUR', note: 'Хостел, уличная еда, общественный транспорт' },
      mid: { range: '80–140 EUR', note: 'Отель 3–4★, рестораны, билеты' },
      comfort: { range: '200–400+ EUR', note: 'Отель 5★, высокая кухня, такси' },
    },
    transport: { public: 'Метро 1,50 EUR', taxi: 'Аэропорт–центр ≈ 48 EUR', tip: 'В центр на метро' },
    practical: { plug: 'Тип C/F, 230 В', water: 'Водопроводную воду можно пить', tip_custom: '5–10% в ресторанах' },
    must_see: [{ name: 'Колизей', note: 'Купите билет онлайн заранее' }],
    phrases: [{ sr: 'Спасибо', local: 'Grazie' }],
  },
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


  const L = EXAMPLES[lang] ? lang : 'sr';
  const LANG_EN = { sr: 'Serbian (Latin script)', en: 'English', de: 'German', ru: 'Russian' }[L];
  const prompt =
    'You are a travel expert. For the destination "' + dest + '" return ONLY a JSON object ' +
    'with EXACTLY this structure (the example is for Rome; adapt every value to ' + dest + '; must_see: 5 items, phrases: 5 items). ' +
    'Write EVERY human-readable value (descriptions, notes, names, visa text, season names, safety level) in ' + LANG_EN + ' — no other language. ' +
    'In phrases[], the field "sr" holds the everyday phrase in ' + LANG_EN + ' (the reader\'s language) and "local" holds the same phrase in the destination country\'s local language. ' +
    'Keep the keys exactly as in the example:\n' +
    JSON.stringify(EXAMPLES[L]) + '\nAll fields are required. Return ONLY JSON.';

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
