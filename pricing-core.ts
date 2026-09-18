// ==========================================================
// _shared/pricing-core.ts
// Deno-native kopija istog algoritma iz /pricing-core.js (koji koristi
// browser / app.js). Namerno DUPLIRANO, ne uvezeno — Supabase Edge
// Functions bundluju svaku funkciju posebno i najpouzdanije je da
// _shared fascikla sadrži čist Deno/TS kod bez UMD omotača.
//
// ⚠️ VAŽNO: ako se cenovna logika promeni u app.js (nove tier cene,
// novi dodaci, novi tier...), mora se ručno preneti i u /pricing-core.js
// I OVDE. Nema build koraka koji ih drži sinhronizovanim — isti
// "ručno održavaj kopiju" obrazac koji već postoji u ovom projektu
// (npr. tierLabelsForSaved je namerno dupliran između app.js i
// zajedno.html, iz istog razloga).
// ==========================================================

export function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) | 0; }
  return Math.abs(h) || 1;
}

export function marketFactor(dest: string, dateStr: string): number {
  const f = seededRandom(hashSeed('mkt|' + dest.toLowerCase() + '|' + dateStr));
  return 0.88 + f() * 0.24;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nightsBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / 86400000));
}

const EXTRA_COSTS: Record<string, { fuel: number; tolls: number }> = {
  best: { fuel: 45, tolls: 28 },
  comfort: { fuel: 58, tolls: 34 },
  budget: { fuel: 28, tolls: 14 }
};
const BUILDER_ADDON_RATES = { insurance: 18, esim: 9, putarina: 18, transferi: 25 };

export interface SearchFlags {
  flight?: boolean; hotel?: boolean; car?: boolean; activity?: boolean;
}
const DEFAULT_SEARCH_FLAGS: Required<SearchFlags> = { flight: true, hotel: true, car: true, activity: true };

// Verna kopija fetchFlights/fetchHotel/fetchCar/fetchActivity + buildPackage
// iz app.js (linije ~2114-2237) — samo total, bez display stringova.
// Redosled rng() poziva MORA ostati identičan (isti seed → isti niz).
export function computeSearchTierTotal(
  dest: string, nights: number, days: number, adults: number,
  tier: 'best' | 'comfort' | 'budget', flags?: SearchFlags, dateStr?: string
): number {
  const f = { ...DEFAULT_SEARCH_FLAGS, ...(flags || {}) };
  const day = dateStr || todayStr();
  const seed = hashSeed(dest.toLowerCase() + dest.length + nights + adults);
  const rng = seededRandom(seed);
  const factor = marketFactor(dest, day);

  let flightPrice = 0, hotelPrice = 0, carPrice = 0, activityPrice = 0;

  if (f.flight) {
    const base = 60 + Math.floor(rng() * 140);
    const tierMult = { budget: 0.72, best: 1, comfort: 1.55 }[tier];
    flightPrice = Math.round(base * tierMult * adults);
    rng();
  }
  if (f.hotel) {
    const perNight = { budget: 32, best: 71, comfort: 138 }[tier] + Math.floor(rng() * 24);
    hotelPrice = Math.round(perNight * nights * Math.ceil(adults / 2));
    rng(); rng();
  }
  if (f.car) {
    const perDay = { budget: 19, best: 34, comfort: 58 }[tier] + Math.floor(rng() * 12);
    carPrice = Math.round(perDay * days);
    rng();
  }
  if (f.activity) {
    activityPrice = { budget: 18, best: 41, comfort: 79 }[tier] + Math.floor(rng() * 20);
    rng();
  }

  const extras = EXTRA_COSTS[tier];
  flightPrice = Math.round(flightPrice * factor);
  hotelPrice = Math.round(hotelPrice * factor);
  carPrice = Math.round(carPrice * factor);
  activityPrice = Math.round(activityPrice * factor);
  const fuel = Math.round((f.car ? extras.fuel : 0) * factor);
  const tolls = Math.round((f.car ? extras.tolls : 0) * factor);

  return flightPrice + hotelPrice + carPrice + activityPrice + fuel + tolls;
}

export interface BuilderSelection {
  flightPref?: 'direct' | 'cheapest' | 'airline';
  airlineName?: string;
  includeFlight?: boolean;
  hotelStars?: 3 | 4 | 5;
  prioritizeRating?: boolean;
  prioritizeLocation?: boolean;
  includeHotel?: boolean;
  carPref?: 'none' | 'small' | 'suv';
  activityCount?: number;
  insurance?: boolean;
  esim?: boolean;
  putarina?: boolean;
  transferi?: boolean;
}

// Verna kopija computeCustomPackage iz app.js (linije ~4120-4221) — samo total.
export function computeBuilderTotal(
  sel: BuilderSelection, dest: string, nights: number, days: number, adults: number, dateStr?: string
): number {
  const day = dateStr || todayStr();
  const seedSel = {
    flightPref: sel.flightPref, hotelStars: sel.hotelStars,
    prioritizeRating: sel.prioritizeRating, prioritizeLocation: sel.prioritizeLocation,
    carPref: sel.carPref, activityCount: sel.activityCount
  };
  const seedStr = dest.toLowerCase() + '|' + JSON.stringify(seedSel) + '|' + nights + '|' + adults;
  const rng = seededRandom(hashSeed(seedStr));

  const flightBase = 55 + rng() * 130;
  const flightMult = { direct: 1.05, cheapest: 0.72, airline: 1.15 }[sel.flightPref || 'direct'];
  const flightPrice = Math.round(flightBase * flightMult * adults);
  if (!(sel.flightPref === 'airline' && sel.airlineName)) rng();

  const hotelBasePerNight = { 3: 36, 4: 66, 5: 122 }[sel.hotelStars || 4] + rng() * 22;
  let hotelMult = 1;
  if (sel.prioritizeRating) hotelMult += 0.10;
  if (sel.prioritizeLocation) hotelMult += 0.07;
  const hotelPrice = Math.round(hotelBasePerNight * hotelMult * nights * Math.ceil(adults / 2));
  rng();

  const carPerDay = { none: 0, small: 31, suv: 57 }[sel.carPref || 'small'] + (sel.carPref === 'none' ? 0 : rng() * 11);
  const carPrice = Math.round(carPerDay * days);

  const perActivity = 21 + rng() * 17;
  const activityPrice = Math.round(perActivity * (sel.activityCount || 0));

  const carExtras = sel.carPref === 'none' ? 0 : Math.round(18 + rng() * 20);
  const bookingFee = Math.round(10 + rng() * 10);

  const insuranceCost = sel.insurance ? BUILDER_ADDON_RATES.insurance * adults : 0;
  const esimCost = sel.esim ? BUILDER_ADDON_RATES.esim * adults : 0;
  const putarinaCost = sel.putarina ? BUILDER_ADDON_RATES.putarina : 0;
  const transferiCost = sel.transferi ? BUILDER_ADDON_RATES.transferi * adults : 0;

  const factor = marketFactor(dest, day);
  const flightPriceF = sel.includeFlight ? Math.round(flightPrice * factor) : 0;
  const hotelPriceF = sel.includeHotel ? Math.round(hotelPrice * factor) : 0;
  const carPriceF = Math.round(carPrice * factor);
  const activityPriceF = Math.round(activityPrice * factor);
  const carExtrasF = Math.round(carExtras * factor);
  const bookingFeeF = Math.round(bookingFee * factor);

  return flightPriceF + hotelPriceF + carPriceF + activityPriceF + carExtrasF + bookingFeeF
    + insuranceCost + esimCost + putarinaCost + transferiCost;
}
