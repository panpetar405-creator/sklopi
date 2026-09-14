// supabase/functions/check-price-alerts/index.ts
//
// Šta radi: čita sve aktivne redove iz price_alerts, za svaki REKONSTRUIŠE
// paket po identičnoj formuli kao app.js (isti seededRandom/hashSeed/
// marketFactor), i ako je današnja procenjena cena pala ispod threshold-a,
// šalje mejl (Resend) i gasi taj alert (active=false) da se ne šalje opet.
//
// Deploy (jednom, sa svog računara, posle instalacije Supabase CLI):
//   supabase functions deploy check-price-alerts
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
//   supabase secrets set ALERTS_FROM_EMAIL="Skoknica <alerts@tvoj-domen.rs>"
//
// Zakazivanje (Supabase Dashboard → Edge Functions → check-price-alerts →
// Cron): npr. "0 8 * * *" da se pokreće svaki dan u 08:00.
//
// NAPOMENA: SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY su automatski dostupni
// unutar Edge Function okruženja — ne treba ih ručno postavljati.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('ALERTS_FROM_EMAIL') || 'Skoknica <alerts@skoknica.rs>';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

/* ==========================================================
   ISTI pricing engine kao u app.js — mora da ostane BIT-ZA-BIT
   identičan (isti redosled rng() poziva), inače rekonstruisana
   cena ovde neće odgovarati onome što bi korisnik video na sajtu.
   Ako menjaš formule u app.js, ogledalski promeni i ovde.
========================================================== */
function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
function hashSeed(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) | 0; }
  return Math.abs(h) || 1;
}
function marketFactor(dest: string, dateStr: string) {
  const f = seededRandom(hashSeed('mkt|' + dest.toLowerCase() + '|' + dateStr));
  return 0.88 + f() * 0.24;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type Flags = { flight: boolean; hotel: boolean; car: boolean; activity: boolean };
type Tier = 'budget' | 'best' | 'comfort';

function fetchFlights(rng: () => number, dest: string, adults: number, tier: Tier) {
  const base = 60 + Math.floor(rng() * 140);
  const tierMult = { budget: 0.72, best: 1, comfort: 1.55 }[tier];
  const price = Math.round(base * tierMult * adults);
  const carriers = ['Wizz Air', 'Air Serbia', 'Ryanair', 'Aegean', 'Lufthansa'];
  // Poziv rng() ispod je namerno tu (i kad rezultat ne koristimo) da bi
  // stream rng() poziva ostao sinhronizovan sa app.js.
  if (tier === 'comfort') { /* comfort ne troši rng() za prevoznika */ }
  else { Math.floor(rng() * carriers.length); }
  return { price };
}
function fetchHotel(rng: () => number, nights: number, adults: number, tier: Tier) {
  const perNight = { budget: 32, best: 71, comfort: 138 }[tier] + Math.floor(rng() * 24);
  const price = Math.round(perNight * nights * Math.ceil(adults / 2));
  const names: Record<Tier, string[]> = {
    budget: ['Hostel Centar', 'City Rooms', 'Studio Plaza'],
    best: ['Hotel', 'Aegean Suites', 'Old Town Residence'],
    comfort: ['Grand', 'Royal Palace Hotel', 'Luxury Collection']
  };
  Math.floor(rng() * names[tier].length); // ime (neiskorišćeno ovde)
  rng() * 0.3; // ocena (neiskorišćena ovde)
  return { price };
}
function fetchCar(rng: () => number, days: number, tier: Tier) {
  if (tier === 'budget') return null;
  const perDay = ({ best: 34, comfort: 58 } as Record<string, number>)[tier] + Math.floor(rng() * 12);
  const price = Math.round(perDay * days);
  const models: Record<string, string[]> = { best: ['Fiat 500', 'VW Polo', 'Opel Corsa'], comfort: ['VW Tiguan', 'Audi A4', 'Volvo XC40'] };
  Math.floor(rng() * models[tier].length); // model (neiskorišćen ovde)
  return { price };
}
function fetchActivity(rng: () => number, tier: Tier) {
  const price = { budget: 18, best: 41, comfort: 79 }[tier] + Math.floor(rng() * 20);
  const opts: Record<Tier, string[]> = {
    budget: ['a'], best: ['a', 'b'], comfort: ['a', 'b']
  };
  Math.floor(rng() * opts[tier].length); // naziv (neiskorišćen ovde)
  return { price };
}
const EXTRA_COSTS: Record<Tier, { fuel: number; tolls: number }> = {
  best: { fuel: 45, tolls: 28 }, comfort: { fuel: 58, tolls: 34 }, budget: { fuel: 0, tolls: 0 }
};

function buildPackageTotal(rng: () => number, dest: string, nights: number, days: number, adults: number, tier: Tier, flags: Flags, factor: number) {
  const flight = flags.flight ? fetchFlights(rng, dest, adults, tier) : null;
  const hotel = flags.hotel ? fetchHotel(rng, nights, adults, tier) : null;
  const car = flags.car ? fetchCar(rng, days, tier) : null;
  const activity = flags.activity ? fetchActivity(rng, tier) : null;
  const extras = EXTRA_COSTS[tier];

  const flightP = flight ? Math.round(flight.price * factor) : 0;
  const hotelP = hotel ? Math.round(hotel.price * factor) : 0;
  const carP = car ? Math.round(car.price * factor) : 0;
  const activityP = activity ? Math.round(activity.price * factor) : 0;
  const fuel = Math.round((car ? extras.fuel : 0) * factor);
  const tolls = Math.round((car ? extras.tolls : 0) * factor);

  return flightP + hotelP + carP + activityP + fuel + tolls;
}

// Rekonstruiše cenu za "search" alert (obična pretraga ili "Iznenadi me") —
// MORA da prođe kroz sva tri tier-a redom (best, comfort, budget) jer isti
// rng deli sve tri, tačno kao computePackagesLocally u app.js.
function recomputeSearchTotal(params: { dest: string; tier: Tier; nights: number; adults: number; flags: Flags }) {
  const { dest, tier, nights, adults, flags } = params;
  const seed = hashSeed(dest.toLowerCase() + dest.length + nights + adults);
  const rng = seededRandom(seed);
  const factor = marketFactor(dest, todayStr());
  const order: Tier[] = ['best', 'comfort', 'budget'];
  let result: number | null = null;
  for (const t of order) {
    const total = buildPackageTotal(rng, dest, nights, nights, adults, t, flags, factor);
    if (t === tier) result = total;
  }
  return result;
}

// Rekonstruiše cenu za "builder" alert (Kontrola sadržaja) — identična
// formula kao computeCustomPackage u app.js.
const BUILDER_ADDON_RATES = { insurance: 18, esim: 9 };
function recomputeBuilderTotal(params: { dest: string; nights: number; days: number; adults: number; sel: any }) {
  const { dest, nights, days, adults, sel } = params;
  const seedSel = {
    flightPref: sel.flightPref, hotelStars: sel.hotelStars,
    prioritizeRating: sel.prioritizeRating, prioritizeLocation: sel.prioritizeLocation,
    carPref: sel.carPref, activityCount: sel.activityCount
  };
  const seedStr = dest.toLowerCase() + '|' + JSON.stringify(seedSel) + '|' + nights + '|' + adults;
  const rng = seededRandom(hashSeed(seedStr));

  const flightBase = 55 + rng() * 130;
  const flightMult = ({ direct: 1.05, cheapest: 0.72, airline: 1.15 } as Record<string, number>)[sel.flightPref];
  const flightPrice = Math.round(flightBase * flightMult * adults);
  if (!(sel.flightPref === 'airline' && sel.airlineName)) { Math.floor(rng() * 5); } // prevoznik (neiskorišćen)

  const hotelBasePerNight = ({ 3: 36, 4: 66, 5: 122 } as Record<number, number>)[sel.hotelStars] + rng() * 22;
  let hotelMult = 1;
  if (sel.prioritizeRating) hotelMult += 0.10;
  if (sel.prioritizeLocation) hotelMult += 0.07;
  const hotelPrice = Math.round(hotelBasePerNight * hotelMult * nights * Math.ceil(adults / 2));

  const carPerDay = ({ none: 0, small: 31, suv: 57 } as Record<string, number>)[sel.carPref] + (sel.carPref === 'none' ? 0 : rng() * 11);
  const carPrice = Math.round(carPerDay * days);

  const perActivity = 21 + rng() * 17;
  const activityPrice = Math.round(perActivity * sel.activityCount);

  const carExtras = sel.carPref === 'none' ? 0 : Math.round(18 + rng() * 20);
  const bookingFee = Math.round(10 + rng() * 10);

  const insuranceCost = sel.insurance ? BUILDER_ADDON_RATES.insurance * adults : 0;
  const esimCost = sel.esim ? BUILDER_ADDON_RATES.esim * adults : 0;

  const factor = marketFactor(dest, todayStr());
  const total = Math.round(flightPrice * factor) + Math.round(hotelPrice * factor) + Math.round(carPrice * factor)
    + Math.round(activityPrice * factor) + Math.round(carExtras * factor) + Math.round(bookingFee * factor)
    + insuranceCost + esimCost;
  return total;
}

async function sendAlertEmail(to: string, dest: string, total: number, threshold: number) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY nije podešen — preskačem slanje mejla (alert je ipak markiran kao okinut).');
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject: `Cena za ${dest} je pala na €${total}`,
      html: `<p>Procenjena cena za <strong>${dest}</strong> je danas <strong>€${total}</strong> — ispod tvog praga od €${threshold}.</p>
             <p>⚠️ I dalje je ilustrativna procena, ne stvarna ponuda partnera — proveri tačnu cenu i dostupnost pre rezervacije.</p>
             <p><a href="https://skoknica.rs/?dest=${encodeURIComponent(dest)}">Otvori Skoknicu</a></p>`
    })
  });
  if (!res.ok) throw new Error('Resend greška: ' + (await res.text()));
}

Deno.serve(async () => {
  const { data: alerts, error } = await sb.from('price_alerts').select('*').eq('active', true);
  if (error) return new Response('DB greška: ' + error.message, { status: 500 });

  let checked = 0, triggered = 0, skipped = 0;
  for (const row of alerts ?? []) {
    checked++;
    try {
      if (!row.params) { skipped++; continue; } // stariji red bez dovoljno podataka za rekonstrukciju

      const total = row.params.kind === 'builder'
        ? recomputeBuilderTotal(row.params)
        : recomputeSearchTotal(row.params);

      if (total == null) { skipped++; continue; }

      await sb.from('price_alerts').update({ current_total: total }).eq('id', row.id);

      if (total <= row.threshold) {
        await sendAlertEmail(row.email, row.dest, total, row.threshold);
        await sb.from('price_alerts').update({ active: false, notified_at: new Date().toISOString() }).eq('id', row.id);
        triggered++;
      }
    } catch (err) {
      console.error('Greška za alert', row.id, err);
    }
  }

  return new Response(JSON.stringify({ checked, triggered, skipped }), { headers: { 'Content-Type': 'application/json' } });
});
