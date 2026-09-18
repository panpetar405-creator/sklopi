/* ==========================================================
   PRICING-CORE.JS
   Zajednički cenovni "engine" — ISTI algoritam koji app.js koristi
   za prikaz ponuda u pretrazi/builderu, izdvojen ovde da bi ga
   mogao da poziva i server (Supabase Edge Function) kad proverava
   alert za pad cene. Ako se ova logika ikad promeni u app.js
   (nove tier cene, novi dodaci...), MORA se ručno preneti i ovde —
   nema build koraka koji ih drži sinhronizovanim.

   Namerno NE računa displej stringove (ime avio-kompanije, hotela,
   ocenu...) — samo brojku (total), jer je to jedino što je alertu
   potrebno. Zato je ovaj fajl mnogo kraći od buildPackage/
   computeCustomPackage u app.js.

   Radi i kao <script> u browseru (postavlja window.SkoknicaPricing)
   i kao ES modul u Deno Edge Function-u (export).
========================================================== */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api; // Node/Deno CJS-style require, ako zatreba
  }
  if (typeof root !== 'undefined') {
    root.SkoknicaPricing = api; // browser
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // ---- isto kao u app.js (linije ~551-593) ----
  function seededRandom(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }
  function hashSeed(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) | 0; }
    return Math.abs(h) || 1;
  }
  function marketFactor(dest, dateStr) {
    const f = seededRandom(hashSeed('mkt|' + dest.toLowerCase() + '|' + dateStr));
    return 0.88 + f() * 0.24;
  }
  function todayStr() {
    return new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
  }
  function nightsBetween(a, b) {
    const ms = new Date(b) - new Date(a);
    return Math.max(1, Math.round(ms / 86400000));
  }

  // ---- isto kao EXTRA_COSTS / BUILDER_ADDON_RATES u app.js ----
  const EXTRA_COSTS = {
    best: { fuel: 45, tolls: 28, insurance: 22, esim: 12 },
    comfort: { fuel: 58, tolls: 34, insurance: 34, esim: 18 },
    budget: { fuel: 28, tolls: 14, insurance: 14, esim: 8 }
  };
  const BUILDER_ADDON_RATES = { insurance: 18, esim: 9, putarina: 18, transferi: 25 };

  const DEFAULT_SEARCH_FLAGS = { flight: true, hotel: true, car: true, activity: true };

  /* ==========================================================
     computeSearchTierTotal — verna kopija cenovnog dela
     fetchFlights/fetchHotel/fetchCar/fetchActivity + buildPackage
     iz app.js (linije ~2114-2237), BEZ display stringova.
     Redosled rng() poziva mora ostati identičan app.js verziji,
     jer isti (dest+nights+adults) seed mora dati isti niz brojeva.
  ========================================================== */
  function computeSearchTierTotal(dest, nights, days, adults, tier, flags, dateStr) {
    flags = Object.assign({}, DEFAULT_SEARCH_FLAGS, flags || {});
    dateStr = dateStr || todayStr();
    const seed = hashSeed(dest.toLowerCase() + dest.length + nights + adults);
    const rng = seededRandom(seed);
    const factor = marketFactor(dest, dateStr);

    let flightPrice = 0, hotelPrice = 0, carPrice = 0, activityPrice = 0;

    // --- let --- (fetchFlights)
    if (flags.flight) {
      const base = 60 + Math.floor(rng() * 140);
      const tierMult = { budget: 0.72, best: 1, comfort: 1.55 }[tier];
      flightPrice = Math.round(base * tierMult * adults);
      rng(); // biranje avio-kompanije (ne utiče na cenu, ali TROŠI jedno mesto u rng nizu u app.js)
    }
    // --- hotel --- (fetchHotel)
    if (flags.hotel) {
      const perNight = { budget: 32, best: 71, comfort: 138 }[tier] + Math.floor(rng() * 24);
      hotelPrice = Math.round(perNight * nights * Math.ceil(adults / 2));
      rng(); // biranje ocene hotela — vidi napomenu iznad
      rng(); // biranje imena hotela — vidi napomenu iznad
    }
    // --- auto --- (fetchCar)
    if (flags.car) {
      const perDay = { budget: 19, best: 34, comfort: 58 }[tier] + Math.floor(rng() * 12);
      carPrice = Math.round(perDay * days);
      rng(); // biranje modela auta
    }
    // --- aktivnost --- (fetchActivity)
    if (flags.activity) {
      const base = { budget: 18, best: 41, comfort: 79 }[tier] + Math.floor(rng() * 20);
      activityPrice = base;
      rng(); // biranje naziva aktivnosti
    }

    const extras = EXTRA_COSTS[tier];
    flightPrice = Math.round(flightPrice * factor);
    hotelPrice = Math.round(hotelPrice * factor);
    carPrice = Math.round(carPrice * factor);
    activityPrice = Math.round(activityPrice * factor);
    const fuel = Math.round((flags.car ? extras.fuel : 0) * factor);
    const tolls = Math.round((flags.car ? extras.tolls : 0) * factor);

    return flightPrice + hotelPrice + carPrice + activityPrice + fuel + tolls;
  }

  /* ==========================================================
     computeBuilderTotal — verna kopija computeCustomPackage
     iz app.js (linije ~4120-4221), BEZ display stringova.
     `selection` je isti oblik kao builderState u app.js
     (flightPref, hotelStars, carPref, activityCount, insurance,
     esim, putarina, transferi, includeFlight, includeHotel...).
  ========================================================== */
  function computeBuilderTotal(selection, dest, nights, days, adults, dateStr) {
    dateStr = dateStr || todayStr();
    const sel = selection || {};
    const seedSel = {
      flightPref: sel.flightPref, hotelStars: sel.hotelStars,
      prioritizeRating: sel.prioritizeRating, prioritizeLocation: sel.prioritizeLocation,
      carPref: sel.carPref, activityCount: sel.activityCount
    };
    const seedStr = dest.toLowerCase() + '|' + JSON.stringify(seedSel) + '|' + nights + '|' + adults;
    const rng = seededRandom(hashSeed(seedStr));

    const flightBase = 55 + rng() * 130;
    const flightMult = { direct: 1.05, cheapest: 0.72, airline: 1.15 }[sel.flightPref];
    const flightPrice = Math.round(flightBase * flightMult * adults);
    if (!(sel.flightPref === 'airline' && sel.airlineName)) rng(); // biranje avio-kompanije, vidi napomenu u app.js

    const hotelBasePerNight = { 3: 36, 4: 66, 5: 122 }[sel.hotelStars] + rng() * 22;
    let hotelMult = 1;
    if (sel.prioritizeRating) hotelMult += 0.10;
    if (sel.prioritizeLocation) hotelMult += 0.07;
    const hotelPrice = Math.round(hotelBasePerNight * hotelMult * nights * Math.ceil(adults / 2));
    rng(); // hotelRating

    const carPerDay = { none: 0, small: 31, suv: 57 }[sel.carPref] + (sel.carPref === 'none' ? 0 : rng() * 11);
    const carPrice = Math.round(carPerDay * days);

    const perActivity = 21 + rng() * 17;
    const activityPrice = Math.round(perActivity * (sel.activityCount || 0));

    const carExtras = sel.carPref === 'none' ? 0 : Math.round(18 + rng() * 20);
    const bookingFee = Math.round(10 + rng() * 10);

    const insuranceCost = sel.insurance ? BUILDER_ADDON_RATES.insurance * adults : 0;
    const esimCost = sel.esim ? BUILDER_ADDON_RATES.esim * adults : 0;
    const putarinaCost = sel.putarina ? BUILDER_ADDON_RATES.putarina : 0;
    const transferiCost = sel.transferi ? BUILDER_ADDON_RATES.transferi * adults : 0;

    const factor = marketFactor(dest, dateStr);
    const flightPriceF = sel.includeFlight ? Math.round(flightPrice * factor) : 0;
    const hotelPriceF = sel.includeHotel ? Math.round(hotelPrice * factor) : 0;
    const carPriceF = Math.round(carPrice * factor);
    const activityPriceF = Math.round(activityPrice * factor);
    const carExtrasF = Math.round(carExtras * factor);
    const bookingFeeF = Math.round(bookingFee * factor);

    return flightPriceF + hotelPriceF + carPriceF + activityPriceF + carExtrasF + bookingFeeF
      + insuranceCost + esimCost + putarinaCost + transferiCost;
  }

  return {
    seededRandom, hashSeed, marketFactor, todayStr, nightsBetween,
    computeSearchTierTotal, computeBuilderTotal
  };
});
