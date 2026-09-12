/* ==========================================================
   PRICING CORE — deljena, čista (bez DOM-a) verzija formula iz app.js.
   Koristi je ISKLJUČIVO price-alert-worker.js da ponovo izračuna cenu
   na serveru, van browsera.

   VAŽNO — zašto ovo postoji kao poseban fajl umesto da worker uveze app.js:
   app.js je pisan da radi u browseru (čita iz document.getElementById,
   piše u DOM...) i ne može da se pokrene u Cloudflare Workeru. Ovde su
   iskopirane SAMO čiste formule za cenu (bez ijedne DOM reference),
   namerno name-for-name iste kao u app.js, da bi worker i sajt uvek
   računali IDENTIČNU osnovnu cenu za isti unos.

   AKO PROMENIŠ FORMULU CENE U app.js (fetchFlights/fetchHotel/fetchCar/
   fetchActivity/EXTRA_COSTS ili computeCustomPackage), PRENESI ISTU
   IZMENU I OVDE — inače će se cena na sajtu i cena u mejl-alertu
   razminuti. (Ako ovo useliš u pravi build sistem, razmisli da ovaj
   fajl bude jedini izvor istine i da ga app.js uvozi umesto da duplira
   kod — za sada je dupliranje namerno minimalno i izolovano u jedan fajl.)

   "DRIFT" — SIMULACIJA PROMENE CENE KROZ VREME:
   computeCustomPackage/buildPackage u app.js daju cenu koja je čisto
   deterministička funkcija unosa (destinacija, izbori, broj noći/putnika)
   — za isti upit UVEK isti broj, bez obzira na dan. To je u redu za
   prikaz na sajtu, ali znači da "cena padne ispod praga" nikad ne bi
   moglo da se desi da se ne doda nešto što se menja iz dana u dan.
   Zato ovde (SAMO ovde, ne i na sajtu) dodajemo mali "market drift"
   množilac koji zavisi od datuma provere (YYYY-MM-DD) — isti tog dana
   za svakog, drugačiji sutra. Kad affiliate API proradi i cene postanu
   prave, ukloni applyDrift() i vrati čist rezultat iz computeAlertPrice().
========================================================== */

export function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

export function nightsBetween(fromISO, toISO) {
  const ms = new Date(toISO) - new Date(fromISO);
  return Math.max(1, Math.round(ms / 86400000));
}

/* Množilac 0.92–1.08, stabilan za dati (dest, dateKey) par u okviru istog dana. */
export function driftMultiplier(dest, dateKey) {
  const rng = seededRandom(hashSeed('drift|' + dest.toLowerCase() + '|' + dateKey));
  return 0.92 + rng() * 0.16;
}

/* ---- Ista logika kao computeCustomPackage(sel, ctx) u app.js ---- */
function computeBuilderTotal(selection, ctx) {
  const seedSel = {
    flightPref: selection.flightPref,
    hotelStars: selection.hotelStars,
    prioritizeRating: selection.prioritizeRating,
    prioritizeLocation: selection.prioritizeLocation,
    carPref: selection.carPref,
    activityCount: selection.activityCount,
  };
  const seedStr =
    ctx.dest.toLowerCase() + '|' + JSON.stringify(seedSel) + '|' + ctx.nights + '|' + ctx.adults;
  const rng = seededRandom(hashSeed(seedStr));

  const flightBase = 55 + rng() * 130;
  const flightMult = { direct: 1.05, cheapest: 0.72, airline: 1.15 }[selection.flightPref] || 1;
  const flightPrice = Math.round(flightBase * flightMult * ctx.adults);
  rng(); // carriers[...] pick — mora da se "potroši" isti broj rng() poziva kao u app.js
  // (airlineName grana u app.js preskače OVAJ rng() poziv kad je flightPref==='airline'
  //  i ime je uneto — pošto alert ne prikazuje ime kompanije, ovde uvek trošimo poziv
  //  kao za "nije uneto ime", što je i podrazumevano stanje builderState.airlineName='').

  const hotelBasePerNight = ({ 3: 36, 4: 66, 5: 122 }[selection.hotelStars] || 66) + rng() * 22;
  let hotelMult = 1;
  if (selection.prioritizeRating) hotelMult += 0.1;
  if (selection.prioritizeLocation) hotelMult += 0.07;
  const hotelPrice = Math.round(hotelBasePerNight * hotelMult * ctx.nights * Math.ceil(ctx.adults / 2));
  rng(); // hotelRating jitter — potroši poziv radi identičnog redosleda kao app.js

  const carPerDay =
    ({ none: 0, small: 31, suv: 57 }[selection.carPref] || 0) +
    (selection.carPref === 'none' ? 0 : rng() * 11);
  const carPrice = Math.round(carPerDay * ctx.days);

  const perActivity = 21 + rng() * 17;
  const activityPrice = Math.round(perActivity * selection.activityCount);

  const carExtras = selection.carPref === 'none' ? 0 : Math.round(18 + rng() * 20);
  const bookingFee = Math.round(10 + rng() * 10);

  return flightPrice + hotelPrice + carPrice + activityPrice + carExtras + bookingFee;
}

/* ---- Ista logika kao buildPackage(...) za gotove pakete (Budget/Best/Comfort) ---- */
function computeSearchTierTotal(dest, nights, days, adults, tier) {
  const seedStr = dest.toLowerCase() + '|' + tier + '|' + nights + '|' + adults;
  const rng = seededRandom(hashSeed(seedStr));

  const flightBaseRaw = 60 + Math.floor(rng() * 140);
  const flightTierMult = { budget: 0.72, best: 1, comfort: 1.55 }[tier];
  const flightPrice = Math.round(flightBaseRaw * flightTierMult * adults);
  // NAPOMENA: fetchFlights(...) u app.js NE zove rng() za carrier pick kad je
  // tier==='comfort' (ime je hardkodovano na poslednjeg prevoznika, carriers[carriers.length-1],
  // bez slučajnog izbora). Ako bismo ovde UVEK zvali rng(), niz slučajnih brojeva za
  // hotel/auto/aktivnosti bi se pomerio za jedno mesto u odnosu na app.js SAMO za
  // Comfort pakete — i cena u mejl-alertu bi se razmimoišla od cene na sajtu.
  // Zato ovde ponavljamo ISTU granu kao u app.js.
  if (tier !== 'comfort') rng(); // carrier pick

  const perNight = { budget: 32, best: 71, comfort: 138 }[tier] + Math.floor(rng() * 24);
  const hotelPrice = Math.round(perNight * nights * Math.ceil(adults / 2));
  rng(); // hotel name pick
  rng(); // rating jitter

  let carPrice = 0;
  if (tier !== 'budget') {
    const perDay = { best: 34, comfort: 58 }[tier] + Math.floor(rng() * 12);
    carPrice = Math.round(perDay * days);
    rng(); // model pick
  }

  const activityPrice = { budget: 18, best: 41, comfort: 79 }[tier] + Math.floor(rng() * 20);
  rng(); // activity name pick

  const extras = {
    best: { fuel: 45, tolls: 28 },
    comfort: { fuel: 58, tolls: 34 },
    budget: { fuel: 0, tolls: 0 },
  }[tier];
  const fuel = tier !== 'budget' ? extras.fuel : 0;
  const tolls = tier !== 'budget' ? extras.tolls : 0;

  return flightPrice + hotelPrice + carPrice + activityPrice + fuel + tolls;
}

/**
 * Ponovo računa procenjenu cenu za jedan red iz price_alerts, sa dnevnim "drift"
 * množiocem primenjenim SAMO ovde (ne menja formule na samom sajtu).
 * @param {object} alert - red iz price_alerts (dest, date_from, date_to, adults, selection)
 * @param {string} dateKey - "YYYY-MM-DD" dana provere (npr. new Date().toISOString().slice(0,10))
 * @returns {number} procenjena ukupna cena, zaokružena na ceo broj
 */
export function computeAlertPrice(alert, dateKey) {
  const nights = nightsBetween(alert.date_from, alert.date_to);
  const ctx = { dest: alert.dest, nights, days: nights, adults: alert.adults };

  let baseTotal;
  if (alert.selection && alert.selection.kind === 'search') {
    baseTotal = computeSearchTierTotal(alert.dest, nights, nights, alert.adults, alert.selection.tier);
  } else {
    baseTotal = computeBuilderTotal(alert.selection, ctx);
  }

  const drifted = baseTotal * driftMultiplier(alert.dest, dateKey);
  return Math.round(drifted);
}
