/* app-04-pricing-engine.js — deo nekadašnjeg app.js (deo 4/11): Pricing + score engine, state/render, valuta, API feed.
   Klasična skripta: deli globalni opseg sa ostalim app-*.js fajlovima; redosled učitavanja u index.html je bitan. */
/* ==========================================================
   PRICING + SCORE ENGINE
========================================================== */
function buildPackage(rng, dest, nights, days, adults, tier, flags, factor, originCode, seasonMult, seeds){
  factor = factor || 1;
  seasonMult = seasonMult || 1; // sezona (seasonFactor) — samo let/smeštaj/auto
  const flight = flags.flight ? fetchFlights(rng, dest, adults, tier, originCode, flags, seeds) : null;
  const hotel  = flags.hotel  ? fetchHotel(rng, dest, nights, adults, tier, flags, seeds) : null;
  const car    = flags.car    ? fetchCar(rng, days, tier, flags, seeds) : null;
  const activity = flags.activity ? fetchActivity(rng, dest, tier, flags, seeds) : null;
  const extras = EXTRA_COSTS[tier];

  if (flight) assertFlightSubConsistency(flags.flightPref || 'direct', flight.sub, 'buildPackage (' + tier + ')');

  // Tržišni faktor menja samo cenu, ne i ime/opis stavke (ti se biraju
  // gore, iz rng niza, pre ove linije — pa ostaju stabilni iz dana u dan).
  if (flight) flight.price = Math.round(flight.price * factor * seasonMult);
  if (hotel) hotel.price = Math.round(hotel.price * factor * seasonMult);
  if (car) car.price = Math.round(car.price * factor * seasonMult);
  if (activity) activity.price = Math.round(activity.price * factor);

  const fuel = Math.round(((car && extras.fuel) ? extras.fuel : 0) * factor);
  const tolls = Math.round(((car && extras.tolls) ? extras.tolls : 0) * factor);
  // Osiguranje i eSIM više NISU deo osnovne cene — to su dodaci na već
  // kupljenu uslugu, ne "proizvod" koji se pretražuje. Cena im je uvek
  // dostupna (da bi se prikazala uz čekboks u rezultatima), ali se ne
  // sabira u `total` dok ih korisnik svesno ne uključi (vidi toggleAddon).
  const insuranceCost = extras.insurance;
  const esimCost = extras.esim;
  // Transferi (aerodrom–smeštaj) — isti princip kao osiguranje/eSIM: fiksan
  // dodatak po tier-u, uvek dostupan (za prikaz, npr. u price-mix grafikonu),
  // ali se ne sabira u `total` dok ga korisnik svesno ne uključi.
  const transferCost = extras.transfer;

  const total = (flight?flight.price:0) + (hotel?hotel.price:0) + (car?car.price:0)
              + (activity?activity.price:0) + fuel + tolls;

  // Quality score je fiksna vrednost po tier-u (marketinški nivo paketa —
  // Comfort > Best Value > Budget), NE izvedena iz stvarnog sadržaja: tip
  // leta, tip auta i tražena kategorija hotela su isti izbor na sve tri
  // kartice (vidi flags.flightPref/carPref/hotelStars gore), pa razlika
  // između kartica nije u TOME šta je uključeno, već samo u ceni i sitnim
  // razlikama unutar iste kategorije (npr. koji tačno hotel od nekoliko u
  // istoj zvezdičnoj klasi, ili koja avio-kompanija kad korisnik nije
  // tražio konkretnu).
  // Sad izveden iz STVARNIH perks-ova uključenih stavki (vidi qualityFromPerks),
  // a ne iz fiksne konstante po tier-u.
  const qualityScore = qualityFromPerks([flight, hotel, car], tier);

  return {tier, flight, hotel, car, activity, fuel, tolls, insuranceCost, esimCost, transferCost, total, qualityScore,
    // Stvarno tražene kategorije (isti izbor za sve tri kartice — vidi
    // komentar uz `flags` u runSearch) — pkgDescText ih koristi umesto da
    // nagađa tip leta/auta iz tier-a, jer tier više ne menja KATEGORIJU
    // koju je korisnik tražio, samo cenu/kvalitet unutar nje.
    flightPref: flags.flightPref, carPref: flags.carPref};
}

/* ==========================================================
   DEV-ONLY PROVERA: invarijante nad buildPackage.
   Isti mehanizam/razlog kao assertFlightSubConsistency iznad, ali
   umesto da hvata JEDNU vrstu neusklađenosti, prolazi kroz mnogo
   nasumičnih kombinacija ulaza (destinacija/noći/putnici/flags) i
   proverava tri opšta svojstva koja moraju da važe za SVAKU
   kombinaciju, bez obzira na to kako se pricing logika menja u
   budućnosti:
     1) total === zbir uključenih stavki (+ gorivo + putarine) —
        lako se pokvari ako neko doda novo polje u cenu a zaboravi
        da ga uključi u `total`, ili obrnuto.
     2) stavka koju `flags` nije tražio(la) MORA biti null — nema
        "duha" u paketu (npr. auto na kartici kad Auto toggle nije
        uključen).
     3) cena raste Budget ≤ Best ≤ Comfort. Do 19.9. je ovo znalo da
        pukne na ~47% nasumičnih ulaza jer je svaka tier kartica
        nezavisno izvlačila SOPSTVENU nasumičnu "bazu" cene (jitter
        uporediv po veličini sa samim tier-množiocem). Otkriveno baš
        preko ove provere. Popravljeno deljenim `priceSeeds`
        (buildPriceSeeds) koji se izvlače JEDNOM po pretrazi i prosleđuju
        u sve tri buildPackage kartice — sad je redosled matematički
        garantovan (tier-množilac je jedina promenljiva), osim retkog
        teoretskog slučaja gde zaokruživanje na ceo broj izjednači dva
        susedna tier-a (jednako ≠ kršenje ≤). Test i dalje prolazi kroz
        60 različitih ulaza, sad kao regresiona zaštita da se neko opet
        ne vrati na nezavisno izvlačenje po tier-u.
   `rng` se namerno DELI između tri poziva, istim redosledom
   (best → comfort → budget) kao u computePackagesLocally — testira
   se stvarni redosled poziva iz produkcije, ne tri izolovana rng-a.
========================================================== */
function runBuildPackageInvariantChecks(){
  if (!DEV_MODE) return;
  const TIERS_IN_ORDER = ['best', 'comfort', 'budget'];
  const FLAG_COMBOS = [
    {flight:true,  hotel:true,  car:true,  activity:true},
    {flight:true,  hotel:true,  car:false, activity:false},
    {flight:false, hotel:true,  car:false, activity:true},
    {flight:true,  hotel:false, car:true,  activity:false},
    {flight:false, hotel:false, car:false, activity:true}
  ];
  const DESTS = ['Atina', 'Rim', 'Barselona', 'Budva', 'Beč'];
  const TRIALS = 60;
  let failures = 0;

  for (let i = 0; i < TRIALS; i++){
    const seed = 1000 + i * 97;
    const rng = seededRandom(seed);
    const dest = DESTS[i % DESTS.length];
    const nights = 2 + (i % 7);
    const days = nights + 1;
    const adults = 1 + (i % 4);
    const flags = {
      ...FLAG_COMBOS[i % FLAG_COMBOS.length],
      flightPref: ['direct', 'cheapest', 'airline'][i % 3],
      carPref: i % 2 ? 'suv' : 'small',
      hotelStars: [3, 4, 5][i % 3],
      activityCount: 1 + (i % 3)
    };
    const originCode = 'BEG';
    const inputDesc = 'seed=' + seed + ' dest=' + dest + ' nights=' + nights + ' adults=' + adults + ' flags=' + JSON.stringify(flags);
    const priceSeeds = buildPriceSeeds(rng);

    const results = {};
    TIERS_IN_ORDER.forEach(tier => {
      results[tier] = buildPackage(rng, dest, nights, days, adults, tier, flags, 1, originCode, 1, priceSeeds);
    });

    TIERS_IN_ORDER.forEach(tier => {
      const pkg = results[tier];

      // 1) total === zbir uključenih stavki
      const sum = (pkg.flight ? pkg.flight.price : 0) + (pkg.hotel ? pkg.hotel.price : 0)
                + (pkg.car ? pkg.car.price : 0) + (pkg.activity ? pkg.activity.price : 0)
                + pkg.fuel + pkg.tolls;
      if (sum !== pkg.total){
        failures++;
        console.error('[sklopi][invariant] total (' + pkg.total + ') != zbir stavki (' + sum + '). tier=' + tier + ' — ' + inputDesc);
      }

      // 2) nema stavke koju korisnik nije tražio
      ['flight', 'hotel', 'car', 'activity'].forEach(key => {
        const requested = !!flags[key];
        const present = !!pkg[key];
        if (requested !== present){
          failures++;
          console.error('[sklopi][invariant] stavka "' + key + '" ne prati flags (traženo=' + requested + ', prisutno=' + present + '). tier=' + tier + ' — ' + inputDesc);
        }
      });
    });

    // 3) Budget ≤ Best ≤ Comfort
    if (results.budget.total > results.best.total || results.best.total > results.comfort.total){
      failures++;
      console.error('[sklopi][invariant] cena nije Budget≤Best≤Comfort (budget=' + results.budget.total
        + ', best=' + results.best.total + ', comfort=' + results.comfort.total + ') — ' + inputDesc);
    }
  }

  if (failures){
    console.error('[sklopi][invariant] ukupno ' + failures + ' problema u buildPackage invarijantama (vidi gore).');
  } else {
    console.log('[sklopi][invariant] buildPackage: svih ' + TRIALS + ' probnih kombinacija prošlo (total/stavke/redosled cena).');
  }
}
runBuildPackageInvariantChecks();

// label ostaje kao nazivi paketa (Best Value / Comfort / Budget); desc je
// getter koji ide kroz t(), pa uvek prati trenutni jezik (nije keširan pri
// učitavanju skripte).
const TIER_META = {
  best:    {label:'Best Value', get desc(){ return t('tier_best_desc'); }},
  comfort: {label:'Comfort',    get desc(){ return t('tier_comfort_desc'); }},
  budget:  {label:'Budget',     get desc(){ return t('tier_budget_desc'); }}
};

/* Opis kartice ponude mora pratiti stvarni sadržaj paketa — koje usluge
   su STVARNO uključene (let/hotel/auto/aktivnosti) — a ne fiksni tekst po
   tier-u. Korisnik bira usluge preko toggle-a iznad forme (Letovi/Smeštaj/
   Auto/Aktivnosti), pa npr. Comfort ponuda bez izabranog Auto toggle-a ne
   sme da u opisu i dalje piše "prostraniji auto" kad auto nije ni prikazan
   na kartici.
   Tip leta i tip auta su TAKOĐE isti izbor na sve tri kartice (flags.
   flightPref/carPref iz upitnika važe podjednako za best/comfort/budget —
   tier menja samo cenu/kvalitet, ne i kategoriju), pa se ovde opisuju na
   osnovu STVARNOG izbora (pkg.flightPref/pkg.carPref), a ne fiksno po
   tier-u — inače bi npr. Comfort pisao "direktan let" i kad je korisnik
   tražio najjeftiniji let sa presedanjem. Iz istog razloga, odsustvo auta
   (kad Auto toggle nije uključen) važi podjednako za sve tri kartice, pa
   se ne ističe kao posebna "Budget prednost". */
function pkgDescText(pkg){
  const bits = [];
  if (pkg.hotel) bits.push(t(pkg.tier === 'comfort' ? 'pkg_desc_hotel_better' : pkg.tier === 'budget' ? 'pkg_desc_hotel_cheapest' : 'pkg_desc_hotel_verified'));
  if (pkg.flight){
    bits.push(t(pkg.flightPref === 'cheapest' ? 'pkg_desc_flight_stopover'
      : pkg.flightPref === 'airline' ? 'pkg_desc_flight_airline'
      : 'pkg_desc_flight_direct'));
  }
  if (pkg.car) bits.push(t(pkg.carPref === 'suv' ? 'pkg_desc_car_spacious' : 'pkg_desc_car'));
  if (pkg.activity) bits.push(t('pkg_desc_activities'));

  if (!bits.length) return TIER_META[pkg.tier].label;

  let text = bits.length === 1
    ? bits[0]
    : bits.slice(0, -1).join(', ') + ' ' + t('pkg_desc_and') + ' ' + bits[bits.length - 1];
  text = text.charAt(0).toUpperCase() + text.slice(1);

  return text;
}

// Kartice se iscrtavaju jednom (pkgHtml), pa bez ovoga opis i nazivi/podnaslovi
// stavki ostaju na starom jeziku posle prebacivanja SR/EN/RU. Osvežava samo
// tekst (ne ceo rezultat) — statični delovi kartice idu preko data-i18n.
const _prevOnLangChangePkgDesc = window.onLangChange;
window.onLangChange = function(lang){
  if (typeof _prevOnLangChangePkgDesc === 'function') _prevOnLangChangePkgDesc(lang);
  const pkgs = window._lastSearchPkgs;
  if (!Array.isArray(pkgs)) return;
  document.querySelectorAll('.pkg:not(.match-pkg)').forEach(card => {
    const pkg = pkgs.find(p => card.classList.contains(p.tier));
    if (!pkg) return;
    const desc = card.querySelector('.pkg-desc');
    if (desc) desc.textContent = pkgDescText(pkg);
    ['flight', 'hotel', 'car'].forEach(kind => {
      const item = pkg[kind], el = card.querySelector('.item-card.' + kind);
      if (!item || !el) return;
      const nameEl = el.querySelector('.item-name'), subEl = el.querySelector('.item-sub');
      if (nameEl) nameEl.textContent = item.name;
      if (subEl) subEl.textContent = item.sub;
    });
    const actLab = card.querySelector('.activity-extra .lab');
    if (actLab && pkg.activity) actLab.textContent = pkg.activity.name.split(' — ')[0];
  });
};

const ICONS = {
  flight: '<path d="M2 16l6-2 4.5-7 2 .6-2.5 6.9 5 1.5 3-2.4 1.6.5-2 3-5.5 1-1 2.6-1.8-.5.7-2.8-5 1.2-1-1.7z"/>',
  hotel: '<path d="M3 21V6l7-3 7 3v15M3 21h18M9 21v-6h4v6M9 10h.01M13 10h.01M9 6.5h.01M13 6.5h.01"/>',
  car: '<path d="M4 16v-4l2-5h12l2 5v4M4 16h16M4 16v2.5a1 1 0 001 1h1a1 1 0 001-1V16M17 16v2.5a1 1 0 001 1h1a1 1 0 001-1V16M6 12h12"/>',
  activity: '<path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/>',
  fuel: '<path d="M6 21V6a2 2 0 012-2h4a2 2 0 012 2v15M6 21h8M6 10h8M16 9l2.5 2v6a1.4 1.4 0 002.5-.9V9.5L18 6"/>',
  tolls: '<path d="M4 20L11 4h2l7 16M8 15h8"/>',
  insurance: '<path d="M12 2l8 3v6c0 5-3.4 8.5-8 11-4.6-2.5-8-6-8-11V5l8-3z"/>',
  esim: '<path d="M6 8.5a8.5 8.5 0 0112 0M8.7 11.2a4.7 4.7 0 016.6 0M11.4 13.9a1 1 0 011.2 0"/><circle cx="12" cy="17.5" r="1.1" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 3v3M16 3v3"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M2 20c1.2-3.4 3.5-5 7-5s5.8 1.6 7 5M17 8.3a3 3 0 010 5.9M20 20c-.4-1.9-1.2-3.3-2.5-4.2"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  extra: '<circle cx="12" cy="12" r="8"/>'
};
function iconSvg(type){
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(ICONS[type]||ICONS.extra)+'</svg>';
}

/* ==========================================================
   STATE + RENDER
========================================================== */
const state = { searches:0, clicks:0, lastDest:null };
const STATS_STORAGE_KEY = 'sklopi_stats_v1';
function loadStats(){
  try{
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.searches = saved.searches || 0;
    state.clicks = saved.clicks || 0;
    state.lastDest = saved.lastDest || null;
  }catch(e){ /* localStorage nedostupan (privatni mod i sl.) — nastavi sa 0 */ }
}
function saveStats(){
  try{
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify({searches:state.searches, clicks:state.clicks, lastDest:state.lastDest}));
  }catch(e){}
}
loadStats();

/* ==========================================================
   VALUTA — EUR/RSD prikaz

   Sve cene na sajtu su i onako ilustrativna procena (vidi
   disclaimer_illustrative), pa RSD prikaz koristi FIKSAN kurs za
   konverziju, ne uživo/NBS kurs — dovoljno je za "koliko je to
   otprilike u dinarima", ne za tačno plaćanje. Kad affiliate API
   proradi i cene postanu prave, ovde bi trebalo uvesti pravi kurs
   (ili konvertovati na serveru, zavisno od partnera).

   fmtEUR() ostaje pod istim imenom (koristi se na 20+ mesta u
   kodu) da bi se izbeglo preimenovanje svuda — samo je interno
   postala "prikaži cenu u trenutno izabranoj valuti".
========================================================== */
const RSD_PER_EUR = 117; // fiksni prikazni kurs, ažuriraj povremeno rucno
let currentCurrency = (localStorage.getItem('sklopi_currency') === 'RSD') ? 'RSD' : 'EUR';

function fmtEUR(n){
  if (currentCurrency === 'RSD'){
    return Math.round(n * RSD_PER_EUR).toLocaleString('sr-RS') + ' RSD';
  }
  return '€' + n.toLocaleString('de-DE');
}

function applyCurrencyToggleUi(){
  const btn = document.getElementById('currencySwitchBtn');
  if (!btn) return;
  btn.setAttribute('data-currency', currentCurrency);
  btn.setAttribute('aria-pressed', currentCurrency === 'RSD' ? 'true' : 'false');
}

// Ponovo iscrtava VEĆ PRIKAZANE cene u novoj valuti — ne pokreće novu
// pretragu od nule. Builder je jeftin (renderBuilder je sinhron, isti
// deterministički seed → isti brojevi, samo nov format), a gotove
// ponude (Budget/Best/Comfort) prolaze kroz runSearch jer je to jedini
// siguran ulaz koji renderResults ume da pozove sa svim potrebnim
// argumentima (originCode, autoReveal...); isti seed → cene se ne
// menjaju, samo se ponovo formatiraju.
function refreshDisplayedPrices(){
  const builderPanel = document.getElementById('builderPanel');
  if (window._lastBuilderPkg && builderPanel && builderPanel.style.display !== 'none'){
    renderBuilder();
  }
  const results = document.getElementById('results');
  if (window._lastSearchCtx && results && results.classList.contains('visible') && validateSearchInputs().ok){
    runSearch(false); // tiho preskoči ako je forma u međuvremenu izmenjena u neispravno stanje
  }
}

function setCurrency(cur){
  currentCurrency = (cur === 'RSD') ? 'RSD' : 'EUR';
  localStorage.setItem('sklopi_currency', currentCurrency);
  applyCurrencyToggleUi();
  refreshDisplayedPrices();
}

function attachAffiliateLinks(pkg, dest, from, to, adults, extra){
  // extra = {originCode, flags} — polazište i izbori iz upitnika, da link
  // vodi na ono što kartica opisuje (ruta, tip leta, zvezdice, sobe).
  extra = extra || {};
  const f = extra.flags || {};
  const ctx = {
    dest, from, to, adults,
    originCode: extra.originCode || '',
    flightPref: f.flightPref, hotelStars: f.hotelStars,
    prioritizeRating: f.prioritizeRating, prioritizeLocation: f.prioritizeLocation,
    carPref: f.carPref
  };
  pkg.dest = dest; // sačuvano na pkg da bi analitika (GA4 affiliate_click) znala destinaciju/tier klika
  if (pkg.flight)   pkg.flight.bookUrl   = buildAffiliateLink('flight', ctx);
  if (pkg.hotel)    pkg.hotel.bookUrl    = buildAffiliateLink('hotel', ctx);
  if (pkg.car)      pkg.car.bookUrl      = buildAffiliateLink('car', ctx);
  if (pkg.activity) pkg.activity.bookUrl = buildAffiliateLink('activity', ctx);
  // eSIM i osiguranje nisu "fetch-ovane" stavke kao let/hotel/auto/aktivnost
  // (nemaju svoju cenu sa partnerskog API-ja, cena im dolazi iz EXTRA_COSTS) —
  // ali dugme na svakom dodatku i dalje treba pravi link ka partneru.
  pkg.esimBookUrl = buildAffiliateLink('esim', ctx);
  pkg.insuranceBookUrl = buildAffiliateLink('insurance', ctx);
}

/* ==========================================================
   API FEED — poziv ka backendu (server/src/routes/search.js).
   Ako backend nije upaljen (nema hostinga jos, radi se lokalno bez
   servera, ili je pao), automatski se vraca na stari lokalni mock —
   sajt NIKAD ne sme da ostane bez rezultata korisniku.
========================================================== */
// Postavi ovo na URL svog backenda kad ga deploy-ujes, npr:
// window.SKLOPI_API_BASE = 'https://api.sklopi.rs';
const API_BASE = window.SKLOPI_API_BASE || '';

/* ---- Autocomplete destinacije: prvo /api/locations (ako je backend podešen),
   a ako nema backend-a (ili poziv ne uspe) — Open-Meteo geokodiranje, isti
   javni API bez ključa koji se već koristi za vremensku prognozu. ---- */
/* ---- Poznati gradovi/prestonice/turistička mesta — ovo je uvek prvi izvor
   predloga, jer Open-Meteo geokoding ume da vrati nepoznata mesta umesto
   očiglednih (npr. selo umesto prestonice), i loše "pogađa" kad se kuca
   bez kvačica (c/s/z umesto č/š/ž). Tek ako ovde nema dovoljno pogodaka,
   dopunjuje se sa Open-Meteo. ---- */
const POPULAR_DESTINATIONS = [
  // Srbija
  {name:'Beograd', extra:'Srbija'}, {name:'Novi Sad', extra:'Srbija'}, {name:'Niš', extra:'Srbija'},
  {name:'Kragujevac', extra:'Srbija'}, {name:'Subotica', extra:'Srbija'}, {name:'Zlatibor', extra:'Srbija'},
  {name:'Kopaonik', extra:'Srbija'}, {name:'Vrnjačka Banja', extra:'Srbija'},
  {name:'Čačak', extra:'Srbija'}, {name:'Kraljevo', extra:'Srbija'}, {name:'Kruševac', extra:'Srbija'},
  {name:'Šabac', extra:'Srbija'}, {name:'Smederevo', extra:'Srbija'}, {name:'Užice', extra:'Srbija'},
  {name:'Vranje', extra:'Srbija'}, {name:'Leskovac', extra:'Srbija'}, {name:'Zaječar', extra:'Srbija'},
  {name:'Valjevo', extra:'Srbija'}, {name:'Sombor', extra:'Srbija'}, {name:'Zrenjanin', extra:'Srbija'},
  {name:'Pančevo', extra:'Srbija'}, {name:'Vršac', extra:'Srbija'}, {name:'Loznica', extra:'Srbija'},
  {name:'Sremska Mitrovica', extra:'Srbija'}, {name:'Bečej', extra:'Srbija'}, {name:'Kikinda', extra:'Srbija'},
  {name:'Pirot', extra:'Srbija'}, {name:'Jagodina', extra:'Srbija'}, {name:'Paraćin', extra:'Srbija'},
  {name:'Aranđelovac', extra:'Srbija'}, {name:'Požarevac', extra:'Srbija'}, {name:'Bor', extra:'Srbija'},
  {name:'Negotin', extra:'Srbija'}, {name:'Priboj', extra:'Srbija'}, {name:'Prijepolje', extra:'Srbija'},
  {name:'Sjenica', extra:'Srbija'}, {name:'Novi Pazar', extra:'Srbija'}, {name:'Ivanjica', extra:'Srbija'},
  {name:'Gornji Milanovac', extra:'Srbija'}, {name:'Vrbas', extra:'Srbija'}, {name:'Inđija', extra:'Srbija'},
  {name:'Ruma', extra:'Srbija'}, {name:'Sremski Karlovci', extra:'Srbija'}, {name:'Bajina Bašta', extra:'Srbija'},
  // Srbija — planine
  {name:'Tara', extra:'Srbija'}, {name:'Divčibare', extra:'Srbija'}, {name:'Stara Planina', extra:'Srbija'},
  {name:'Golija', extra:'Srbija'}, {name:'Rtanj', extra:'Srbija'}, {name:'Zlatar', extra:'Srbija'},
  {name:'Mokra Gora', extra:'Srbija'}, {name:'Fruška Gora', extra:'Srbija'}, {name:'Vlasina', extra:'Srbija'}, {name:'Goč', extra:'Srbija'},
  {name:'Suva Planina', extra:'Srbija'}, {name:'Jastrebac', extra:'Srbija'}, {name:'Rudnik', extra:'Srbija'},
  {name:'Kablar', extra:'Srbija'}, {name:'Ovčar', extra:'Srbija'}, {name:'Maljen', extra:'Srbija'},
  {name:'Cer', extra:'Srbija'}, {name:'Vršačke Planine', extra:'Srbija'}, {name:'Besna Kobila', extra:'Srbija'}, {name:'Beljanica', extra:'Srbija'},
  {name:'Homoljske Planine', extra:'Srbija'}, {name:'Crni Vrh', extra:'Srbija'}, {name:'Vlasinsko Jezero', extra:'Srbija'},
  // Srbija — banje
  {name:'Sokobanja', extra:'Srbija'}, {name:'Niška Banja', extra:'Srbija'}, {name:'Banja Koviljača', extra:'Srbija'},
  {name:'Banja Vrujci', extra:'Srbija'}, {name:'Banja Kanjiža', extra:'Srbija'}, {name:'Prolom Banja', extra:'Srbija'},
  {name:'Bukovička Banja', extra:'Srbija'}, {name:'Vranjska Banja', extra:'Srbija'}, {name:'Mataruška Banja', extra:'Srbija'},
  {name:'Sijarinska Banja', extra:'Srbija'}, {name:'Josanička Banja', extra:'Srbija'}, {name:'Ribarska Banja', extra:'Srbija'},
  {name:'Lukovska Banja', extra:'Srbija'}, {name:'Kuršumlijska Banja', extra:'Srbija'}, {name:'Banja Junaković', extra:'Srbija'}, {name:'Banja Rusanda', extra:'Srbija'},
  {name:'Bogutovačka Banja', extra:'Srbija'}, {name:'Gamzigradska Banja', extra:'Srbija'}, {name:'Banja Selters', extra:'Srbija'}, {name:'Slankamenačke Banje', extra:'Srbija'},
  {name:'Banja Gornja Trepča', extra:'Srbija'}, {name:'Rgotska Banja', extra:'Srbija'},
  // Srbija — jezera i prirodne atrakcije
  {name:'Palić', extra:'Srbija'}, {name:'Zlatarsko jezero', extra:'Srbija'}, {name:'Perućac', extra:'Srbija'},
  {name:'Srebrno jezero', extra:'Srbija'}, {name:'Borsko jezero', extra:'Srbija'}, {name:'Gružansko jezero', extra:'Srbija'},
  {name:'Đerdap', extra:'Srbija'}, {name:'Uvac', extra:'Srbija'}, {name:'Golubac', extra:'Srbija'},
  {name:'Ćelijsko jezero', extra:'Srbija'}, {name:'Bovansko jezero', extra:'Srbija'}, {name:'Zaovinsko jezero', extra:'Srbija'}, {name:'Ludaško jezero', extra:'Srbija'},
  // Srbija — reke
  {name:'Drina', extra:'Srbija'}, {name:'Zapadna Morava', extra:'Srbija'}, {name:'Južna Morava', extra:'Srbija'},
  {name:'Velika Morava', extra:'Srbija'}, {name:'Sava', extra:'Srbija'}, {name:'Dunav', extra:'Srbija'},
  {name:'Ibar', extra:'Srbija'}, {name:'Lim', extra:'Srbija'}, {name:'Nišava', extra:'Srbija'},
  {name:'Kolubara', extra:'Srbija'}, {name:'Pčinja', extra:'Srbija'}, {name:'Timok', extra:'Srbija'}, {name:'Toplica', extra:'Srbija'}, {name:'Pek', extra:'Srbija'},
  // Srbija — gradovi
  {name:'Ćuprija', extra:'Srbija'}, {name:'Prokuplje', extra:'Srbija'}, {name:'Svilajnac', extra:'Srbija'},
  {name:'Senta', extra:'Srbija'}, {name:'Kanjiža', extra:'Srbija'}, {name:'Temerin', extra:'Srbija'},
  // Srbija — Vojvodina (manja mesta)
  {name:'Bačka Palanka', extra:'Srbija'}, {name:'Bačka Topola', extra:'Srbija'}, {name:'Bački Petrovac', extra:'Srbija'},
  {name:'Bač', extra:'Srbija'}, {name:'Beočin', extra:'Srbija'}, {name:'Žabalj', extra:'Srbija'}, {name:'Kula', extra:'Srbija'},
  {name:'Mali Iđoš', extra:'Srbija'}, {name:'Novi Bečej', extra:'Srbija'}, {name:'Odžaci', extra:'Srbija'}, {name:'Titel', extra:'Srbija'},
  {name:'Ada', extra:'Srbija'}, {name:'Čoka', extra:'Srbija'}, {name:'Novi Kneževac', extra:'Srbija'},
  {name:'Alibunar', extra:'Srbija'}, {name:'Bela Crkva', extra:'Srbija'}, {name:'Kovačica', extra:'Srbija'},
  {name:'Kovin', extra:'Srbija'}, {name:'Opovo', extra:'Srbija'}, {name:'Plandište', extra:'Srbija'},
  {name:'Irig', extra:'Srbija'}, {name:'Pećinci', extra:'Srbija'}, {name:'Stara Pazova', extra:'Srbija'}, {name:'Šid', extra:'Srbija'},
  // Srbija — Beograd (opštine)
  {name:'Lazarevac', extra:'Srbija'}, {name:'Mladenovac', extra:'Srbija'}, {name:'Barajevo', extra:'Srbija'},
  {name:'Grocka', extra:'Srbija'}, {name:'Obrenovac', extra:'Srbija'}, {name:'Sopot', extra:'Srbija'}, {name:'Surčin', extra:'Srbija'}, {name:'Zemun', extra:'Srbija'},
  // Srbija — Šumadija i zapadna Srbija (manja mesta)
  {name:'Topola', extra:'Srbija'}, {name:'Velika Plana', extra:'Srbija'}, {name:'Smederevska Palanka', extra:'Srbija'},
  {name:'Žabari', extra:'Srbija'}, {name:'Malo Crniće', extra:'Srbija'}, {name:'Petrovac na Mlavi', extra:'Srbija'},
  {name:'Kučevo', extra:'Srbija'}, {name:'Žagubica', extra:'Srbija'}, {name:'Despotovac', extra:'Srbija'},
  {name:'Rekovac', extra:'Srbija'}, {name:'Varvarin', extra:'Srbija'}, {name:'Ćićevac', extra:'Srbija'}, {name:'Trstenik', extra:'Srbija'},
  {name:'Brus', extra:'Srbija'}, {name:'Aleksandrovac', extra:'Srbija'}, {name:'Lučani', extra:'Srbija'}, {name:'Požega', extra:'Srbija'},
  {name:'Kosjerić', extra:'Srbija'}, {name:'Arilje', extra:'Srbija'}, {name:'Čajetina', extra:'Srbija'}, {name:'Nova Varoš', extra:'Srbija'},
  {name:'Ub', extra:'Srbija'}, {name:'Koceljeva', extra:'Srbija'}, {name:'Vladimirci', extra:'Srbija'}, {name:'Mionica', extra:'Srbija'},
  {name:'Lajkovac', extra:'Srbija'}, {name:'Ljig', extra:'Srbija'}, {name:'Osečina', extra:'Srbija'}, {name:'Krupanj', extra:'Srbija'},
  {name:'Ljubovija', extra:'Srbija'}, {name:'Mali Zvornik', extra:'Srbija'}, {name:'Raška', extra:'Srbija'}, {name:'Tutin', extra:'Srbija'},
  // Srbija — južna i istočna Srbija (manja mesta)
  {name:'Boljevac', extra:'Srbija'}, {name:'Knjaževac', extra:'Srbija'}, {name:'Svrljig', extra:'Srbija'},
  {name:'Bela Palanka', extra:'Srbija'}, {name:'Dimitrovgrad', extra:'Srbija'}, {name:'Babušnica', extra:'Srbija'},
  {name:'Gadžin Han', extra:'Srbija'}, {name:'Doljevac', extra:'Srbija'}, {name:'Merošina', extra:'Srbija'}, {name:'Blace', extra:'Srbija'},
  {name:'Žitorađa', extra:'Srbija'}, {name:'Vlasotince', extra:'Srbija'}, {name:'Lebane', extra:'Srbija'}, {name:'Bojnik', extra:'Srbija'},
  {name:'Medveđa', extra:'Srbija'}, {name:'Crna Trava', extra:'Srbija'}, {name:'Surdulica', extra:'Srbija'},
  {name:'Bosilegrad', extra:'Srbija'}, {name:'Trgovište', extra:'Srbija'}, {name:'Bujanovac', extra:'Srbija'}, {name:'Preševo', extra:'Srbija'},
  {name:'Ražanj', extra:'Srbija'}, {name:'Aleksinac', extra:'Srbija'}, {name:'Kladovo', extra:'Srbija'}, {name:'Majdanpek', extra:'Srbija'},
  // Region
  {name:'Podgorica', extra:'Crna Gora'}, {name:'Budva', extra:'Crna Gora'}, {name:'Kotor', extra:'Crna Gora'},
  {name:'Herceg Novi', extra:'Crna Gora'}, {name:'Igalo', extra:'Crna Gora'}, {name:'Bar', extra:'Crna Gora'},
  {name:'Tivat', extra:'Crna Gora'}, {name:'Petrovac', extra:'Crna Gora'}, {name:'Sutomore', extra:'Crna Gora'},
  {name:'Ulcinj', extra:'Crna Gora'}, {name:'Perast', extra:'Crna Gora'}, {name:'Risan', extra:'Crna Gora'},
  {name:'Žabljak', extra:'Crna Gora'}, {name:'Kolašin', extra:'Crna Gora'}, {name:'Nikšić', extra:'Crna Gora'},
  {name:'Cetinje', extra:'Crna Gora'}, {name:'Rožaje', extra:'Crna Gora'},
  {name:'Bijelo Polje', extra:'Crna Gora'}, {name:'Pljevlja', extra:'Crna Gora'}, {name:'Berane', extra:'Crna Gora'},
  {name:'Plav', extra:'Crna Gora'}, {name:'Mojkovac', extra:'Crna Gora'}, {name:'Danilovgrad', extra:'Crna Gora'},
  {name:'Andrijevica', extra:'Crna Gora'}, {name:'Gusinje', extra:'Crna Gora'}, {name:'Plužine', extra:'Crna Gora'}, {name:'Šavnik', extra:'Crna Gora'},
  {name:'Petnjica', extra:'Crna Gora'}, {name:'Tuzi', extra:'Crna Gora'},
  // Crna Gora — priobalje i manja mesta
  {name:'Sveti Stefan', extra:'Crna Gora'}, {name:'Pržno', extra:'Crna Gora'}, {name:'Rafailovići', extra:'Crna Gora'},
  {name:'Bečići', extra:'Crna Gora'}, {name:'Miločer', extra:'Crna Gora'}, {name:'Jaz', extra:'Crna Gora'},
  {name:'Dobrota', extra:'Crna Gora'}, {name:'Muo', extra:'Crna Gora'}, {name:'Škaljari', extra:'Crna Gora'}, {name:'Stoliv', extra:'Crna Gora'}, {name:'Orahovac', extra:'Crna Gora'},
  {name:'Morinj', extra:'Crna Gora'}, {name:'Kamenari', extra:'Crna Gora'}, {name:'Baošići', extra:'Crna Gora'},
  {name:'Đenovići', extra:'Crna Gora'}, {name:'Bijela', extra:'Crna Gora'}, {name:'Zelenika', extra:'Crna Gora'},
  {name:'Meljine', extra:'Crna Gora'}, {name:'Kumbor', extra:'Crna Gora'}, {name:'Njivice', extra:'Crna Gora'},
  {name:'Donja Lastva', extra:'Crna Gora'}, {name:'Lepetane', extra:'Crna Gora'}, {name:'Luštica', extra:'Crna Gora'},
  {name:'Stari Bar', extra:'Crna Gora'}, {name:'Šušanj', extra:'Crna Gora'}, {name:'Dobra Voda', extra:'Crna Gora'},
  {name:'Velika Plaža', extra:'Crna Gora'}, {name:'Štoj', extra:'Crna Gora'}, {name:'Valdanos', extra:'Crna Gora'}, {name:'Šasko Jezero', extra:'Crna Gora'},
  {name:'Pivsko Jezero', extra:'Crna Gora'},
  {name:'Durmitor', extra:'Crna Gora'}, {name:'Biogradska Gora', extra:'Crna Gora'}, {name:'Lovćen', extra:'Crna Gora'},
  {name:'Skadarsko Jezero', extra:'Crna Gora'},
  {name:'Crno Jezero', extra:'Crna Gora'}, {name:'Biogradsko Jezero', extra:'Crna Gora'}, {name:'Tara', extra:'Crna Gora'},
  {name:'Virpazar', extra:'Crna Gora'}, {name:'Ada Bojana', extra:'Crna Gora'}, {name:'Čanj', extra:'Crna Gora'},
  {name:'Buljarica', extra:'Crna Gora'}, {name:'Prčanj', extra:'Crna Gora'}, {name:'Ostrog', extra:'Crna Gora'},
  {name:'Bjelasica', extra:'Crna Gora'}, {name:'Komovi', extra:'Crna Gora'}, {name:'Sinjajevina', extra:'Crna Gora'},
  {name:'Rumija', extra:'Crna Gora'}, {name:'Prokletije', extra:'Crna Gora'}, {name:'Hajla', extra:'Crna Gora'},
  {name:'Morača', extra:'Crna Gora'}, {name:'Lim', extra:'Crna Gora'}, {name:'Zeta', extra:'Crna Gora'},
  {name:'Piva', extra:'Crna Gora'}, {name:'Ćehotina', extra:'Crna Gora'},
  // Crna Gora — dopuna: planine, reke, jezera, priobalje
  {name:'Orjen', extra:'Crna Gora'}, {name:'Cijevna', extra:'Crna Gora'}, {name:'Bistrica', extra:'Crna Gora'},
  {name:'Plavsko Jezero', extra:'Crna Gora'}, {name:'Slansko Jezero', extra:'Crna Gora'},
  {name:'Mamula', extra:'Crna Gora'}, {name:'Rose', extra:'Crna Gora'}, {name:'Žanjic', extra:'Crna Gora'},
  {name:'Lastva Grbaljska', extra:'Crna Gora'}, {name:'Lipska Pećina', extra:'Crna Gora'},
  {name:'Sarajevo', extra:'Bosna i Hercegovina'}, {name:'Mostar', extra:'Bosna i Hercegovina'}, {name:'Banja Luka', extra:'Bosna i Hercegovina'},
  {name:'Trebinje', extra:'Bosna i Hercegovina'}, {name:'Bihać', extra:'Bosna i Hercegovina'}, {name:'Tuzla', extra:'Bosna i Hercegovina'},
  {name:'Zenica', extra:'Bosna i Hercegovina'},
  {name:'Jajce', extra:'Bosna i Hercegovina'}, {name:'Travnik', extra:'Bosna i Hercegovina'}, {name:'Konjic', extra:'Bosna i Hercegovina'},
  {name:'Neum', extra:'Bosna i Hercegovina'}, {name:'Bijeljina', extra:'Bosna i Hercegovina'}, {name:'Doboj', extra:'Bosna i Hercegovina'},
  {name:'Prijedor', extra:'Bosna i Hercegovina'}, {name:'Brčko', extra:'Bosna i Hercegovina'}, {name:'Foča', extra:'Bosna i Hercegovina'},
  {name:'Višegrad', extra:'Bosna i Hercegovina'},
  {name:'Bjelašnica', extra:'Bosna i Hercegovina'}, {name:'Jahorina', extra:'Bosna i Hercegovina'}, {name:'Vlašić', extra:'Bosna i Hercegovina'}, {name:'Kupres', extra:'Bosna i Hercegovina'},
  {name:'Blagaj', extra:'Bosna i Hercegovina'}, {name:'Počitelj', extra:'Bosna i Hercegovina'}, {name:'Vrelo Bosne', extra:'Bosna i Hercegovina'},
  {name:'Sutjeska', extra:'Bosna i Hercegovina'}, {name:'Una', extra:'Bosna i Hercegovina'}, {name:'Livno', extra:'Bosna i Hercegovina'},
  // BiH — Federacija (manja mesta)
  {name:'Cazin', extra:'Bosna i Hercegovina'}, {name:'Velika Kladuša', extra:'Bosna i Hercegovina'}, {name:'Bužim', extra:'Bosna i Hercegovina'},
  {name:'Sanski Most', extra:'Bosna i Hercegovina'}, {name:'Ključ', extra:'Bosna i Hercegovina'}, {name:'Bosanska Krupa', extra:'Bosna i Hercegovina'},
  {name:'Bosanski Petrovac', extra:'Bosna i Hercegovina'}, {name:'Goražde', extra:'Bosna i Hercegovina'}, {name:'Visoko', extra:'Bosna i Hercegovina'},
  {name:'Fojnica', extra:'Bosna i Hercegovina'}, {name:'Kakanj', extra:'Bosna i Hercegovina'}, {name:'Vareš', extra:'Bosna i Hercegovina'},
  {name:'Breza', extra:'Bosna i Hercegovina'}, {name:'Zavidovići', extra:'Bosna i Hercegovina'}, {name:'Žepče', extra:'Bosna i Hercegovina'},
  {name:'Maglaj', extra:'Bosna i Hercegovina'}, {name:'Tešanj', extra:'Bosna i Hercegovina'}, {name:'Gradačac', extra:'Bosna i Hercegovina'},
  {name:'Gračanica', extra:'Bosna i Hercegovina'}, {name:'Lukavac', extra:'Bosna i Hercegovina'}, {name:'Čapljina', extra:'Bosna i Hercegovina'},
  {name:'Stolac', extra:'Bosna i Hercegovina'}, {name:'Ljubuški', extra:'Bosna i Hercegovina'}, {name:'Široki Brijeg', extra:'Bosna i Hercegovina'},
  {name:'Grude', extra:'Bosna i Hercegovina'}, {name:'Posušje', extra:'Bosna i Hercegovina'}, {name:'Tomislavgrad', extra:'Bosna i Hercegovina'},
  {name:'Bugojno', extra:'Bosna i Hercegovina'}, {name:'Donji Vakuf', extra:'Bosna i Hercegovina'}, {name:'Gornji Vakuf', extra:'Bosna i Hercegovina'},
  {name:'Novi Travnik', extra:'Bosna i Hercegovina'}, {name:'Vitez', extra:'Bosna i Hercegovina'}, {name:'Busovača', extra:'Bosna i Hercegovina'},
  {name:'Kreševo', extra:'Bosna i Hercegovina'}, {name:'Olovo', extra:'Bosna i Hercegovina'}, {name:'Srebrenik', extra:'Bosna i Hercegovina'},
  {name:'Čelić', extra:'Bosna i Hercegovina'}, {name:'Živinice', extra:'Bosna i Hercegovina'}, {name:'Kalesija', extra:'Bosna i Hercegovina'},
  {name:'Sapna', extra:'Bosna i Hercegovina'}, {name:'Orašje', extra:'Bosna i Hercegovina'}, {name:'Odžak', extra:'Bosna i Hercegovina'},
  // BiH — Republika Srpska (manja mesta)
  {name:'Gradiška', extra:'Bosna i Hercegovina'}, {name:'Prnjavor', extra:'Bosna i Hercegovina'}, {name:'Modriča', extra:'Bosna i Hercegovina'},
  {name:'Šamac', extra:'Bosna i Hercegovina'}, {name:'Zvornik', extra:'Bosna i Hercegovina'}, {name:'Bratunac', extra:'Bosna i Hercegovina'},
  {name:'Srebrenica', extra:'Bosna i Hercegovina'}, {name:'Rogatica', extra:'Bosna i Hercegovina'}, {name:'Rudo', extra:'Bosna i Hercegovina'},
  {name:'Čajniče', extra:'Bosna i Hercegovina'}, {name:'Kalinovik', extra:'Bosna i Hercegovina'}, {name:'Nevesinje', extra:'Bosna i Hercegovina'},
  {name:'Gacko', extra:'Bosna i Hercegovina'}, {name:'Bileća', extra:'Bosna i Hercegovina'}, {name:'Ljubinje', extra:'Bosna i Hercegovina'},
  {name:'Novi Grad', extra:'Bosna i Hercegovina'}, {name:'Kozarska Dubica', extra:'Bosna i Hercegovina'}, {name:'Kotor Varoš', extra:'Bosna i Hercegovina'},
  {name:'Laktaši', extra:'Bosna i Hercegovina'}, {name:'Čelinac', extra:'Bosna i Hercegovina'}, {name:'Teslić', extra:'Bosna i Hercegovina'},
  {name:'Derventa', extra:'Bosna i Hercegovina'}, {name:'Šipovo', extra:'Bosna i Hercegovina'}, {name:'Mrkonjić Grad', extra:'Bosna i Hercegovina'},
  {name:'Jablaničko Jezero', extra:'Bosna i Hercegovina'}, {name:'Boračko Jezero', extra:'Bosna i Hercegovina'}, {name:'Plivska Jezera', extra:'Bosna i Hercegovina'},
  {name:'Neretva', extra:'Bosna i Hercegovina'}, {name:'Ilidža', extra:'Bosna i Hercegovina'},
  {name:'Igman', extra:'Bosna i Hercegovina'}, {name:'Trebević', extra:'Bosna i Hercegovina'}, {name:'Prenj', extra:'Bosna i Hercegovina'},
  {name:'Čvrsnica', extra:'Bosna i Hercegovina'}, {name:'Maglić', extra:'Bosna i Hercegovina'}, {name:'Vranica', extra:'Bosna i Hercegovina'}, {name:'Treskavica', extra:'Bosna i Hercegovina'},
  {name:'Konjuh', extra:'Bosna i Hercegovina'}, {name:'Romanija', extra:'Bosna i Hercegovina'}, {name:'Zvijezda', extra:'Bosna i Hercegovina'},
  {name:'Banja Vrućica', extra:'Bosna i Hercegovina'}, {name:'Banja Slatina', extra:'Bosna i Hercegovina'}, {name:'Kiseljak', extra:'Bosna i Hercegovina'}, {name:'Kulaši', extra:'Bosna i Hercegovina'},
  {name:'Bosna', extra:'Bosna i Hercegovina'}, {name:'Vrbas', extra:'Bosna i Hercegovina'}, {name:'Miljacka', extra:'Bosna i Hercegovina'},
  {name:'Trebišnjica', extra:'Bosna i Hercegovina'}, {name:'Sana', extra:'Bosna i Hercegovina'}, {name:'Drina', extra:'Bosna i Hercegovina'},
  {name:'Lašva', extra:'Bosna i Hercegovina'}, {name:'Spreča', extra:'Bosna i Hercegovina'},
  {name:'Zagreb', extra:'Hrvatska'}, {name:'Split', extra:'Hrvatska'}, {name:'Dubrovnik', extra:'Hrvatska'},
  {name:'Zadar', extra:'Hrvatska'}, {name:'Rijeka', extra:'Hrvatska'}, {name:'Pula', extra:'Hrvatska'}, {name:'Hvar', extra:'Hrvatska'},
  {name:'Makarska', extra:'Hrvatska'}, {name:'Trogir', extra:'Hrvatska'}, {name:'Šibenik', extra:'Hrvatska'}, {name:'Rovinj', extra:'Hrvatska'},
  {name:'Osijek', extra:'Hrvatska'}, {name:'Krk', extra:'Hrvatska'}, {name:'Poreč', extra:'Hrvatska'}, {name:'Umag', extra:'Hrvatska'},
  {name:'Opatija', extra:'Hrvatska'}, {name:'Cavtat', extra:'Hrvatska'}, {name:'Vis', extra:'Hrvatska'},
  {name:'Varaždin', extra:'Hrvatska'}, {name:'Karlovac', extra:'Hrvatska'}, {name:'Sisak', extra:'Hrvatska'},
  {name:'Vukovar', extra:'Hrvatska'}, {name:'Slavonski Brod', extra:'Hrvatska'}, {name:'Vinkovci', extra:'Hrvatska'},
  {name:'Đakovo', extra:'Hrvatska'}, {name:'Čakovec', extra:'Hrvatska'}, {name:'Bjelovar', extra:'Hrvatska'},
  {name:'Koprivnica', extra:'Hrvatska'}, {name:'Požega', extra:'Hrvatska'}, {name:'Virovitica', extra:'Hrvatska'},
  // Hrvatska — kontinent (manja mesta)
  {name:'Velika Gorica', extra:'Hrvatska'}, {name:'Zaprešić', extra:'Hrvatska'}, {name:'Samobor', extra:'Hrvatska'},
  {name:'Dugo Selo', extra:'Hrvatska'}, {name:'Ivanić-Grad', extra:'Hrvatska'}, {name:'Sveti Ivan Zelina', extra:'Hrvatska'},
  {name:'Jastrebarsko', extra:'Hrvatska'}, {name:'Kutina', extra:'Hrvatska'}, {name:'Novska', extra:'Hrvatska'},
  {name:'Petrinja', extra:'Hrvatska'}, {name:'Glina', extra:'Hrvatska'}, {name:'Slunj', extra:'Hrvatska'},
  {name:'Ogulin', extra:'Hrvatska'}, {name:'Duga Resa', extra:'Hrvatska'}, {name:'Ozalj', extra:'Hrvatska'},
  {name:'Delnice', extra:'Hrvatska'}, {name:'Vrbovsko', extra:'Hrvatska'}, {name:'Čabar', extra:'Hrvatska'},
  {name:'Gospić', extra:'Hrvatska'}, {name:'Otočac', extra:'Hrvatska'}, {name:'Senj', extra:'Hrvatska'},
  {name:'Novi Vinodolski', extra:'Hrvatska'}, {name:'Crikvenica', extra:'Hrvatska'}, {name:'Kastav', extra:'Hrvatska'},
  {name:'Bakar', extra:'Hrvatska'}, {name:'Kraljevica', extra:'Hrvatska'}, {name:'Vodnjan', extra:'Hrvatska'},
  {name:'Buje', extra:'Hrvatska'}, {name:'Novigrad', extra:'Hrvatska'}, {name:'Buzet', extra:'Hrvatska'},
  {name:'Labin', extra:'Hrvatska'}, {name:'Pazin', extra:'Hrvatska'}, {name:'Rabac', extra:'Hrvatska'},
  {name:'Motovun', extra:'Hrvatska'}, {name:'Medulin', extra:'Hrvatska'}, {name:'Barban', extra:'Hrvatska'},
  {name:'Korenica', extra:'Hrvatska'}, {name:'Udbina', extra:'Hrvatska'},
  // Hrvatska — Slavonija (manja mesta)
  {name:'Slatina', extra:'Hrvatska'}, {name:'Orahovica', extra:'Hrvatska'}, {name:'Našice', extra:'Hrvatska'},
  {name:'Đurđevac', extra:'Hrvatska'}, {name:'Ludbreg', extra:'Hrvatska'}, {name:'Prelog', extra:'Hrvatska'},
  {name:'Valpovo', extra:'Hrvatska'}, {name:'Belišće', extra:'Hrvatska'}, {name:'Županja', extra:'Hrvatska'},
  {name:'Ilok', extra:'Hrvatska'}, {name:'Otok', extra:'Hrvatska'}, {name:'Nova Gradiška', extra:'Hrvatska'},
  {name:'Pakrac', extra:'Hrvatska'}, {name:'Daruvar', extra:'Hrvatska'}, {name:'Grubišno Polje', extra:'Hrvatska'},
  {name:'Garešnica', extra:'Hrvatska'}, {name:'Čazma', extra:'Hrvatska'},
  // Hrvatska — Zagorje i Međimurje
  {name:'Krapina', extra:'Hrvatska'}, {name:'Zabok', extra:'Hrvatska'}, {name:'Klanjec', extra:'Hrvatska'},
  {name:'Pregrada', extra:'Hrvatska'}, {name:'Donja Stubica', extra:'Hrvatska'}, {name:'Marija Bistrica', extra:'Hrvatska'},
  {name:'Mursko Središće', extra:'Hrvatska'},
  // Hrvatska — obala i ostrva
  {name:'Biograd na Moru', extra:'Hrvatska'}, {name:'Vodice', extra:'Hrvatska'}, {name:'Primošten', extra:'Hrvatska'},
  {name:'Omiš', extra:'Hrvatska'}, {name:'Baška Voda', extra:'Hrvatska'}, {name:'Brela', extra:'Hrvatska'}, {name:'Tučepi', extra:'Hrvatska'},
  {name:'Korčula', extra:'Hrvatska'}, {name:'Vela Luka', extra:'Hrvatska'}, {name:'Supetar', extra:'Hrvatska'}, {name:'Bol', extra:'Hrvatska'},
  {name:'Mali Lošinj', extra:'Hrvatska'}, {name:'Cres', extra:'Hrvatska'}, {name:'Rab', extra:'Hrvatska'}, {name:'Novalja', extra:'Hrvatska'},
  {name:'Pag', extra:'Hrvatska'}, {name:'Vrsar', extra:'Hrvatska'}, {name:'Fažana', extra:'Hrvatska'}, {name:'Kaštela', extra:'Hrvatska'},
  {name:'Mljet', extra:'Hrvatska'}, {name:'Lastovo', extra:'Hrvatska'}, {name:'Šolta', extra:'Hrvatska'},
  // Hrvatska — Dalmacija (manja mesta)
  {name:'Metković', extra:'Hrvatska'}, {name:'Ploče', extra:'Hrvatska'}, {name:'Vrgorac', extra:'Hrvatska'},
  {name:'Imotski', extra:'Hrvatska'}, {name:'Sinj', extra:'Hrvatska'}, {name:'Trilj', extra:'Hrvatska'},
  {name:'Drniš', extra:'Hrvatska'}, {name:'Knin', extra:'Hrvatska'}, {name:'Skradin', extra:'Hrvatska'},
  {name:'Benkovac', extra:'Hrvatska'}, {name:'Obrovac', extra:'Hrvatska'}, {name:'Nin', extra:'Hrvatska'},
  {name:'Pakoštane', extra:'Hrvatska'}, {name:'Pirovac', extra:'Hrvatska'}, {name:'Murter', extra:'Hrvatska'},
  {name:'Tisno', extra:'Hrvatska'}, {name:'Rogoznica', extra:'Hrvatska'}, {name:'Dugi Rat', extra:'Hrvatska'},
  {name:'Gradac', extra:'Hrvatska'}, {name:'Ston', extra:'Hrvatska'}, {name:'Slano', extra:'Hrvatska'},
  {name:'Orebić', extra:'Hrvatska'}, {name:'Opuzen', extra:'Hrvatska'}, {name:'Blato', extra:'Hrvatska'},
  {name:'Jelsa', extra:'Hrvatska'}, {name:'Stari Grad', extra:'Hrvatska'}, {name:'Milna', extra:'Hrvatska'},
  {name:'Postira', extra:'Hrvatska'}, {name:'Punat', extra:'Hrvatska'}, {name:'Vrbnik', extra:'Hrvatska'},
  {name:'Baška', extra:'Hrvatska'}, {name:'Malinska', extra:'Hrvatska'},
  // Hrvatska — dodatna ostrva
  {name:'Ugljan', extra:'Hrvatska'}, {name:'Pašman', extra:'Hrvatska'}, {name:'Dugi Otok', extra:'Hrvatska'},
  {name:'Iž', extra:'Hrvatska'}, {name:'Molat', extra:'Hrvatska'}, {name:'Silba', extra:'Hrvatska'},
  {name:'Vir', extra:'Hrvatska'}, {name:'Kornati', extra:'Hrvatska'}, {name:'Biševo', extra:'Hrvatska'},
  {name:'Susak', extra:'Hrvatska'}, {name:'Ilovik', extra:'Hrvatska'}, {name:'Unije', extra:'Hrvatska'}, {name:'Brač', extra:'Hrvatska'},
  // Hrvatska — nacionalni parkovi, planine, banje
  {name:'Plitvička Jezera', extra:'Hrvatska'}, {name:'Krka', extra:'Hrvatska'}, {name:'Paklenica', extra:'Hrvatska'},
  {name:'Vransko Jezero', extra:'Hrvatska'}, {name:'Cetina', extra:'Hrvatska'}, {name:'Kupa', extra:'Hrvatska'},
  {name:'Učka', extra:'Hrvatska'}, {name:'Medvednica', extra:'Hrvatska'},
  {name:'Varaždinske Toplice', extra:'Hrvatska'}, {name:'Stubičke Toplice', extra:'Hrvatska'},
  {name:'Krapinske Toplice', extra:'Hrvatska'}, {name:'Daruvarske Toplice', extra:'Hrvatska'},
  {name:'Velebit', extra:'Hrvatska'}, {name:'Biokovo', extra:'Hrvatska'}, {name:'Risnjak', extra:'Hrvatska'},
  {name:'Dinara', extra:'Hrvatska'}, {name:'Papuk', extra:'Hrvatska'}, {name:'Psunj', extra:'Hrvatska'},
  {name:'Tuheljske Toplice', extra:'Hrvatska'}, {name:'Lipik', extra:'Hrvatska'}, {name:'Sveti Martin na Muri', extra:'Hrvatska'},
  {name:'Sava', extra:'Hrvatska'}, {name:'Drava', extra:'Hrvatska'}, {name:'Mirna', extra:'Hrvatska'}, {name:'Zrmanja', extra:'Hrvatska'},
  {name:'Skoplje', extra:'Severna Makedonija'}, {name:'Ohrid', extra:'Severna Makedonija'},
  {name:'Bitola', extra:'Severna Makedonija'}, {name:'Tetovo', extra:'Severna Makedonija'},
  {name:'Kumanovo', extra:'Severna Makedonija'}, {name:'Prilep', extra:'Severna Makedonija'}, {name:'Strumica', extra:'Severna Makedonija'},
  {name:'Gevgelija', extra:'Severna Makedonija'}, {name:'Veles', extra:'Severna Makedonija'}, {name:'Struga', extra:'Severna Makedonija'},
  {name:'Kruševo', extra:'Severna Makedonija'}, {name:'Mavrovo', extra:'Severna Makedonija'},
  // Severna Makedonija — manja mesta
  {name:'Štip', extra:'Severna Makedonija'}, {name:'Kočani', extra:'Severna Makedonija'}, {name:'Kavadarci', extra:'Severna Makedonija'},
  {name:'Radoviš', extra:'Severna Makedonija'}, {name:'Kičevo', extra:'Severna Makedonija'}, {name:'Gostivar', extra:'Severna Makedonija'},
  {name:'Debar', extra:'Severna Makedonija'}, {name:'Delčevo', extra:'Severna Makedonija'}, {name:'Vinica', extra:'Severna Makedonija'},
  {name:'Berovo', extra:'Severna Makedonija'}, {name:'Pehčevo', extra:'Severna Makedonija'}, {name:'Makedonski Brod', extra:'Severna Makedonija'},
  {name:'Demir Hisar', extra:'Severna Makedonija'}, {name:'Demir Kapija', extra:'Severna Makedonija'}, {name:'Negotino', extra:'Severna Makedonija'},
  {name:'Kriva Palanka', extra:'Severna Makedonija'}, {name:'Kratovo', extra:'Severna Makedonija'}, {name:'Probištip', extra:'Severna Makedonija'},
  {name:'Sveti Nikole', extra:'Severna Makedonija'}, {name:'Resen', extra:'Severna Makedonija'}, {name:'Valandovo', extra:'Severna Makedonija'},
  {name:'Bogdanci', extra:'Severna Makedonija'}, {name:'Star Dojran', extra:'Severna Makedonija'}, {name:'Vevčani', extra:'Severna Makedonija'},
  // Severna Makedonija — planine, jezera i reke
  {name:'Galičica', extra:'Severna Makedonija'}, {name:'Belasica', extra:'Severna Makedonija'}, {name:'Osogovske Planine', extra:'Severna Makedonija'},
  {name:'Jakupica', extra:'Severna Makedonija'}, {name:'Bistra', extra:'Severna Makedonija'},
  {name:'Ohridsko Jezero', extra:'Severna Makedonija'}, {name:'Dojransko Jezero', extra:'Severna Makedonija'},
  {name:'Crna Reka', extra:'Severna Makedonija'}, {name:'Bregalnica', extra:'Severna Makedonija'},
  {name:'Šar Planina', extra:'Severna Makedonija'}, {name:'Pelister', extra:'Severna Makedonija'}, {name:'Vodno', extra:'Severna Makedonija'},
  {name:'Katlanovska Banja', extra:'Severna Makedonija'}, {name:'Banjište', extra:'Severna Makedonija'}, {name:'Negorci', extra:'Severna Makedonija'},
  {name:'Vardar', extra:'Severna Makedonija'}, {name:'Treska', extra:'Severna Makedonija'}, {name:'Prespansko Jezero', extra:'Severna Makedonija'},
  {name:'Priština', extra:'Kosovo'}, {name:'Prizren', extra:'Kosovo'}, {name:'Peć', extra:'Kosovo'},
  {name:'Gnjilane', extra:'Kosovo'}, {name:'Mitrovica', extra:'Kosovo'}, {name:'Đakovica', extra:'Kosovo'}, {name:'Uroševac', extra:'Kosovo'},
  {name:'Brezovica', extra:'Kosovo'}, {name:'Rugova', extra:'Kosovo'}, {name:'Dečani', extra:'Kosovo'}, {name:'Gračanica', extra:'Kosovo'},
  {name:'Šar Planina', extra:'Kosovo'}, {name:'Prokletije', extra:'Kosovo'}, {name:'Kllokot', extra:'Kosovo'},
  {name:'Beli Drim', extra:'Kosovo'}, {name:'Sitnica', extra:'Kosovo'}, {name:'Ibar', extra:'Kosovo'},
  {name:'Ljubljana', extra:'Slovenija'}, {name:'Bled', extra:'Slovenija'}, {name:'Piran', extra:'Slovenija'},
  {name:'Maribor', extra:'Slovenija'}, {name:'Kranjska Gora', extra:'Slovenija'}, {name:'Portorož', extra:'Slovenija'},
  {name:'Kranj', extra:'Slovenija'}, {name:'Celje', extra:'Slovenija'}, {name:'Novo Mesto', extra:'Slovenija'},
  {name:'Koper', extra:'Slovenija'}, {name:'Ptuj', extra:'Slovenija'}, {name:'Škofja Loka', extra:'Slovenija'},
  {name:'Kamnik', extra:'Slovenija'}, {name:'Idrija', extra:'Slovenija'},
  {name:'Postojna', extra:'Slovenija'}, {name:'Bohinj', extra:'Slovenija'}, {name:'Bovec', extra:'Slovenija'},
  {name:'Kobarid', extra:'Slovenija'}, {name:'Logarska Dolina', extra:'Slovenija'}, {name:'Rogaška Slatina', extra:'Slovenija'},
  {name:'Murska Sobota', extra:'Slovenija'}, {name:'Nova Gorica', extra:'Slovenija'}, {name:'Velenje', extra:'Slovenija'},
  {name:'Jesenice', extra:'Slovenija'}, {name:'Slovenj Gradec', extra:'Slovenija'},
  // Slovenija — manja mesta
  {name:'Domžale', extra:'Slovenija'}, {name:'Vrhnika', extra:'Slovenija'}, {name:'Logatec', extra:'Slovenija'},
  {name:'Cerknica', extra:'Slovenija'}, {name:'Ilirska Bistrica', extra:'Slovenija'}, {name:'Sežana', extra:'Slovenija'},
  {name:'Ajdovščina', extra:'Slovenija'}, {name:'Tolmin', extra:'Slovenija'}, {name:'Radovljica', extra:'Slovenija'},
  {name:'Litija', extra:'Slovenija'}, {name:'Trbovlje', extra:'Slovenija'}, {name:'Zagorje ob Savi', extra:'Slovenija'},
  {name:'Hrastnik', extra:'Slovenija'}, {name:'Krško', extra:'Slovenija'}, {name:'Brežice', extra:'Slovenija'},
  {name:'Sevnica', extra:'Slovenija'}, {name:'Trebnje', extra:'Slovenija'}, {name:'Črnomelj', extra:'Slovenija'},
  {name:'Metlika', extra:'Slovenija'}, {name:'Kočevje', extra:'Slovenija'}, {name:'Ribnica', extra:'Slovenija'},
  {name:'Grosuplje', extra:'Slovenija'}, {name:'Ivančna Gorica', extra:'Slovenija'}, {name:'Šentjur', extra:'Slovenija'},
  {name:'Rogatec', extra:'Slovenija'}, {name:'Slovenske Konjice', extra:'Slovenija'}, {name:'Žalec', extra:'Slovenija'},
  {name:'Šoštanj', extra:'Slovenija'}, {name:'Mozirje', extra:'Slovenija'}, {name:'Gornja Radgona', extra:'Slovenija'},
  {name:'Lendava', extra:'Slovenija'}, {name:'Ljutomer', extra:'Slovenija'}, {name:'Ormož', extra:'Slovenija'},
  {name:'Slovenska Bistrica', extra:'Slovenija'}, {name:'Ruše', extra:'Slovenija'}, {name:'Dravograd', extra:'Slovenija'},
  {name:'Ravne na Koroškem', extra:'Slovenija'}, {name:'Mislinja', extra:'Slovenija'}, {name:'Prevalje', extra:'Slovenija'},
  {name:'Črna na Koroškem', extra:'Slovenija'}, {name:'Šmarje pri Jelšah', extra:'Slovenija'}, {name:'Sečovlje', extra:'Slovenija'},
  // Slovenija — banje
  {name:'Čatež', extra:'Slovenija'}, {name:'Terme Ptuj', extra:'Slovenija'}, {name:'Dolenjske Toplice', extra:'Slovenija'},
  {name:'Moravske Toplice', extra:'Slovenija'}, {name:'Laško', extra:'Slovenija'}, {name:'Radenci', extra:'Slovenija'},
  {name:'Rimske Toplice', extra:'Slovenija'}, {name:'Podčetrtek', extra:'Slovenija'}, {name:'Topolšica', extra:'Slovenija'},
  // Slovenija — planine
  {name:'Triglav', extra:'Slovenija'}, {name:'Vogel', extra:'Slovenija'}, {name:'Krvavec', extra:'Slovenija'},
  {name:'Pohorje', extra:'Slovenija'}, {name:'Mangart', extra:'Slovenija'}, {name:'Rogla', extra:'Slovenija'}, {name:'Golte', extra:'Slovenija'},
  {name:'Stol', extra:'Slovenija'}, {name:'Storžič', extra:'Slovenija'}, {name:'Grintovec', extra:'Slovenija'}, {name:'Pokljuka', extra:'Slovenija'},
  // Slovenija — reke
  {name:'Soča', extra:'Slovenija'}, {name:'Sava', extra:'Slovenija'}, {name:'Drava', extra:'Slovenija'}, {name:'Kolpa', extra:'Slovenija'},
  // Slovenija — turistički centri
  {name:'Škocjanske jame', extra:'Slovenija'}, {name:'Predjama', extra:'Slovenija'}, {name:'Vintgar', extra:'Slovenija'}, {name:'Cerkniško Jezero', extra:'Slovenija'},
  // Slovenija — primorska mesta
  {name:'Izola', extra:'Slovenija'}, {name:'Ankaran', extra:'Slovenija'},
  {name:'Tirana', extra:'Albanija'}, {name:'Sarande', extra:'Albanija'},
  {name:'Drač', extra:'Albanija'}, {name:'Vlora', extra:'Albanija'}, {name:'Ksamil', extra:'Albanija'},
  {name:'Skadar', extra:'Albanija'}, {name:'Kruja', extra:'Albanija'}, {name:'Berat', extra:'Albanija'},
  {name:'Gjirokastra', extra:'Albanija'}, {name:'Pogradec', extra:'Albanija'},
  {name:'Dhermi', extra:'Albanija'}, {name:'Himara', extra:'Albanija'},
  {name:'Theth', extra:'Albanija'}, {name:'Valbona', extra:'Albanija'},
  // Albanija — manja mesta
  {name:'Elbasan', extra:'Albanija'}, {name:'Korča', extra:'Albanija'}, {name:'Fier', extra:'Albanija'},
  {name:'Lushnja', extra:'Albanija'}, {name:'Kavaja', extra:'Albanija'}, {name:'Kukës', extra:'Albanija'},
  {name:'Lezha', extra:'Albanija'}, {name:'Peshkopia', extra:'Albanija'}, {name:'Përmet', extra:'Albanija'},
  {name:'Tepelena', extra:'Albanija'}, {name:'Fushë-Kruja', extra:'Albanija'}, {name:'Laç', extra:'Albanija'},
  {name:'Burrel', extra:'Albanija'}, {name:'Gramsh', extra:'Albanija'}, {name:'Patos', extra:'Albanija'},
  {name:'Delvina', extra:'Albanija'}, {name:'Konispol', extra:'Albanija'}, {name:'Shengjin', extra:'Albanija'}, {name:'Velipoja', extra:'Albanija'},
  {name:'Peqin', extra:'Albanija'}, {name:'Kuçova', extra:'Albanija'}, {name:'Ballsh', extra:'Albanija'}, {name:'Rrëshen', extra:'Albanija'},
  {name:'Bulqiza', extra:'Albanija'}, {name:'Librazhd', extra:'Albanija'}, {name:'Puka', extra:'Albanija'}, {name:'Bilisht', extra:'Albanija'},
  {name:'Maliq', extra:'Albanija'}, {name:'Vora', extra:'Albanija'}, {name:'Kruma', extra:'Albanija'},
  // Albanija — planine
  {name:'Korab', extra:'Albanija'}, {name:'Jezerca', extra:'Albanija'}, {name:'Čika', extra:'Albanija'}, {name:'Lura', extra:'Albanija'},
  // Albanija — banje
  {name:'Benja', extra:'Albanija'},
  // Albanija — jezera i primorje
  {name:'Prespansko jezero', extra:'Albanija'}, {name:'Bovilla', extra:'Albanija'},
  {name:'Radhima', extra:'Albanija'}, {name:'Orikum', extra:'Albanija'}, {name:'Palasa', extra:'Albanija'},
  {name:'Drymades', extra:'Albanija'}, {name:'Gjipe', extra:'Albanija'}, {name:'Currila', extra:'Albanija'}, {name:'Patok', extra:'Albanija'},
  // Albanija — priroda i reke
  {name:'Syri i Kaltër', extra:'Albanija'}, {name:'Llogara', extra:'Albanija'}, {name:'Butrint', extra:'Albanija'},
  {name:'Komansko Jezero', extra:'Albanija'}, {name:'Dajti', extra:'Albanija'}, {name:'Tomorr', extra:'Albanija'},
  {name:'Qeparo', extra:'Albanija'}, {name:'Borsh', extra:'Albanija'}, {name:'Jale', extra:'Albanija'}, {name:'Golem', extra:'Albanija'},
  {name:'Drin', extra:'Albanija'}, {name:'Vjosa', extra:'Albanija'}, {name:'Shkumbin', extra:'Albanija'}, {name:'Buna', extra:'Albanija'},
  {name:'Bukurešt', extra:'Rumunija'}, {name:'Kluž', extra:'Rumunija'}, {name:'Brašov', extra:'Rumunija'}, {name:'Konstanca', extra:'Rumunija'},
  {name:'Sibiu', extra:'Rumunija'}, {name:'Temišvar', extra:'Rumunija'}, {name:'Jaši', extra:'Rumunija'},
  {name:'Krajova', extra:'Rumunija'}, {name:'Oradea', extra:'Rumunija'}, {name:'Arad', extra:'Rumunija'},
  {name:'Bakau', extra:'Rumunija'}, {name:'Satu Mare', extra:'Rumunija'}, {name:'Baja Mare', extra:'Rumunija'},
  {name:'Targu Mureš', extra:'Rumunija'}, {name:'Ploješti', extra:'Rumunija'}, {name:'Pitešti', extra:'Rumunija'}, {name:'Galac', extra:'Rumunija'},
  // Rumunija — manja mesta
  {name:'Sighišoara', extra:'Rumunija'}, {name:'Alba Julija', extra:'Rumunija'}, {name:'Sfantu Georgije', extra:'Rumunija'},
  {name:'Deva', extra:'Rumunija'}, {name:'Rešica', extra:'Rumunija'}, {name:'Zalau', extra:'Rumunija'},
  {name:'Buzau', extra:'Rumunija'}, {name:'Fokšani', extra:'Rumunija'}, {name:'Targovište', extra:'Rumunija'},
  // Rumunija — banje
  {name:'Bajle Herkulane', extra:'Rumunija'}, {name:'Sovata', extra:'Rumunija'}, {name:'Bajle Feliks', extra:'Rumunija'},
  {name:'Vatra Dornei', extra:'Rumunija'}, {name:'Kovasna', extra:'Rumunija'}, {name:'Slanik Moldova', extra:'Rumunija'},
  // Rumunija — planine
  {name:'Sinaja', extra:'Rumunija'}, {name:'Predeal', extra:'Rumunija'}, {name:'Poiana Brašov', extra:'Rumunija'},
  {name:'Bušteni', extra:'Rumunija'}, {name:'Semenic', extra:'Rumunija'}, {name:'Paltiniš', extra:'Rumunija'},
  // Rumunija — reke
  {name:'Mureš', extra:'Rumunija'}, {name:'Olt', extra:'Rumunija'}, {name:'Prut', extra:'Rumunija'}, {name:'Siret', extra:'Rumunija'},
  // Rumunija — jezera
  {name:'Crveno Jezero', extra:'Rumunija'}, {name:'Jezero Bikaz', extra:'Rumunija'}, {name:'Jezero Sveta Ana', extra:'Rumunija'},
  {name:'Jezero Vidraru', extra:'Rumunija'}, {name:'Delta Dunava', extra:'Rumunija'},
  // Rumunija — turistički centri
  {name:'Bran', extra:'Rumunija'}, {name:'Peleš Dvorac', extra:'Rumunija'}, {name:'Rišnov', extra:'Rumunija'},
  {name:'Maramureš', extra:'Rumunija'}, {name:'Bukovina', extra:'Rumunija'},
  // Rumunija — primorska mesta
  {name:'Mamaja', extra:'Rumunija'}, {name:'Eforie Nord', extra:'Rumunija'}, {name:'Eforie Sud', extra:'Rumunija'},
  {name:'Vama Vekje', extra:'Rumunija'}, {name:'Neptun', extra:'Rumunija'}, {name:'Kostinešti', extra:'Rumunija'},
  {name:'Mangalija', extra:'Rumunija'}, {name:'Navodari', extra:'Rumunija'},
  {name:'Sofija', extra:'Bugarska'}, {name:'Varna', extra:'Bugarska'}, {name:'Burgas', extra:'Bugarska'},
  {name:'Plovdiv', extra:'Bugarska'}, {name:'Nesebar', extra:'Bugarska'}, {name:'Bansko', extra:'Bugarska'},
  {name:'Ruse', extra:'Bugarska'}, {name:'Stara Zagora', extra:'Bugarska'}, {name:'Pleven', extra:'Bugarska'},
  {name:'Veliko Trnovo', extra:'Bugarska'}, {name:'Blagoevgrad', extra:'Bugarska'}, {name:'Šumen', extra:'Bugarska'},
  {name:'Sliven', extra:'Bugarska'}, {name:'Vidin', extra:'Bugarska'}, {name:'Dobrič', extra:'Bugarska'},
  {name:'Kjustendil', extra:'Bugarska'}, {name:'Gabrovo', extra:'Bugarska'}, {name:'Haskovo', extra:'Bugarska'},
  // Bugarska — banje
  {name:'Sandanski', extra:'Bugarska'}, {name:'Velingrad', extra:'Bugarska'}, {name:'Hisarja', extra:'Bugarska'},
  {name:'Devin', extra:'Bugarska'}, {name:'Pavel Banja', extra:'Bugarska'}, {name:'Bankja', extra:'Bugarska'},
  // Bugarska — planine
  {name:'Borovec', extra:'Bugarska'}, {name:'Pamporovo', extra:'Bugarska'}, {name:'Vitoša', extra:'Bugarska'},
  {name:'Čepelare', extra:'Bugarska'}, {name:'Rila', extra:'Bugarska'},
  // Bugarska — turistički centri
  {name:'Koprivštica', extra:'Bugarska'}, {name:'Melnik', extra:'Bugarska'}, {name:'Rilski manastir', extra:'Bugarska'},
  {name:'Trjavna', extra:'Bugarska'}, {name:'Arbanasi', extra:'Bugarska'},
  // Bugarska — primorska mesta
  {name:'Sozopol', extra:'Bugarska'}, {name:'Sunčev Breg', extra:'Bugarska'}, {name:'Zlatni Pjasci', extra:'Bugarska'},
  {name:'Primorsko', extra:'Bugarska'}, {name:'Balčik', extra:'Bugarska'}, {name:'Kavarna', extra:'Bugarska'},
  {name:'Carevo', extra:'Bugarska'}, {name:'Pomorije', extra:'Bugarska'}, {name:'Ahtopol', extra:'Bugarska'},
  // Bugarska — manja mesta
  {name:'Karlovo', extra:'Bugarska'}, {name:'Kazanlak', extra:'Bugarska'}, {name:'Smoljan', extra:'Bugarska'},
  {name:'Kardžali', extra:'Bugarska'}, {name:'Vraca', extra:'Bugarska'}, {name:'Pernik', extra:'Bugarska'},
  {name:'Trojan', extra:'Bugarska'}, {name:'Asenovgrad', extra:'Bugarska'},
  // Bugarska — reke
  {name:'Marica', extra:'Bugarska'}, {name:'Iskar', extra:'Bugarska'}, {name:'Struma', extra:'Bugarska'}, {name:'Tundža', extra:'Bugarska'},
  // Bugarska — jezera
  {name:'Sedam Rilskih Jezera', extra:'Bugarska'}, {name:'Srebarno Jezero', extra:'Bugarska'}, {name:'Pančarevsko Jezero', extra:'Bugarska'}, {name:'Batačko Jezero', extra:'Bugarska'},
  // Grčka i Egej
  {name:'Atina', extra:'Grčka'}, {name:'Solun', extra:'Grčka'}, {name:'Krf', extra:'Grčka'},
  {name:'Santorini', extra:'Grčka'}, {name:'Mikonos', extra:'Grčka'}, {name:'Rodos', extra:'Grčka'},
  {name:'Krit', extra:'Grčka'}, {name:'Halkidiki', extra:'Grčka'},
  {name:'Zakintos', extra:'Grčka'}, {name:'Kefalonija', extra:'Grčka'}, {name:'Lefkada', extra:'Grčka'},
  {name:'Paros', extra:'Grčka'}, {name:'Naksos', extra:'Grčka'}, {name:'Kos', extra:'Grčka'}, {name:'Volos', extra:'Grčka'},
  // Grčka — gradovi
  {name:'Patra', extra:'Grčka'}, {name:'Larisa', extra:'Grčka'}, {name:'Kavala', extra:'Grčka'},
  {name:'Janjina', extra:'Grčka'}, {name:'Iraklion', extra:'Grčka'}, {name:'Kalamata', extra:'Grčka'},
  // Grčka — banje
  {name:'Lutraki', extra:'Grčka'}, {name:'Edipsos', extra:'Grčka'},
  // Grčka — planine
  {name:'Olimp', extra:'Grčka'}, {name:'Pilion', extra:'Grčka'},
  // Grčka — turistički centri
  {name:'Meteori', extra:'Grčka'}, {name:'Delfi', extra:'Grčka'}, {name:'Nafplion', extra:'Grčka'},
  // Grčka — primorska mesta i ostrva
  {name:'Tasos', extra:'Grčka'}, {name:'Samos', extra:'Grčka'}, {name:'Hios', extra:'Grčka'},
  {name:'Skijatos', extra:'Grčka'}, {name:'Skopelos', extra:'Grčka'}, {name:'Evija', extra:'Grčka'},
  {name:'Idra', extra:'Grčka'}, {name:'Spece', extra:'Grčka'}, {name:'Milos', extra:'Grčka'},
  {name:'Ios', extra:'Grčka'}, {name:'Egina', extra:'Grčka'}, {name:'Poros', extra:'Grčka'},
  // Grčka — dopunski gradovi
  {name:'Ser', extra:'Grčka'}, {name:'Ksanti', extra:'Grčka'}, {name:'Komotini', extra:'Grčka'},
  {name:'Aleksandrupolj', extra:'Grčka'}, {name:'Trikala', extra:'Grčka'}, {name:'Kardica', extra:'Grčka'},
  {name:'Lamija', extra:'Grčka'}, {name:'Halkida', extra:'Grčka'}, {name:'Kozani', extra:'Grčka'},
  {name:'Kastorija', extra:'Grčka'}, {name:'Florina', extra:'Grčka'}, {name:'Verija', extra:'Grčka'},
  {name:'Katerini', extra:'Grčka'}, {name:'Drama', extra:'Grčka'}, {name:'Edesa', extra:'Grčka'},
  {name:'Sparta', extra:'Grčka'}, {name:'Tripoli', extra:'Grčka'}, {name:'Korint', extra:'Grčka'}, {name:'Argos', extra:'Grčka'},
  // Grčka — dopunska ostrva
  {name:'Andros', extra:'Grčka'}, {name:'Tinos', extra:'Grčka'}, {name:'Siros', extra:'Grčka'},
  {name:'Amorgos', extra:'Grčka'}, {name:'Folegandros', extra:'Grčka'}, {name:'Sifnos', extra:'Grčka'},
  {name:'Simi', extra:'Grčka'}, {name:'Kalimnos', extra:'Grčka'}, {name:'Leros', extra:'Grčka'},
  {name:'Patmos', extra:'Grčka'}, {name:'Lezbos', extra:'Grčka'}, {name:'Limnos', extra:'Grčka'},
  {name:'Kitira', extra:'Grčka'}, {name:'Antiparos', extra:'Grčka'}, {name:'Serifos', extra:'Grčka'},
  // Grčka — planine i priroda
  {name:'Tajget', extra:'Grčka'}, {name:'Parnas', extra:'Grčka'}, {name:'Vardusija', extra:'Grčka'},
  {name:'Kamena Vurla', extra:'Grčka'}, {name:'Vikos', extra:'Grčka'}, {name:'Samarija', extra:'Grčka'},
  // Grčka — reke
  {name:'Aheloos', extra:'Grčka'}, {name:'Aliakmon', extra:'Grčka'}, {name:'Pinios', extra:'Grčka'},
  // Grčka — jezera
  {name:'Jezero Plastira', extra:'Grčka'}, {name:'Jezero Kerkini', extra:'Grčka'}, {name:'Jezero Prespa', extra:'Grčka'},
  // Italija
  {name:'Rim', extra:'Italija'}, {name:'Milano', extra:'Italija'}, {name:'Napulj', extra:'Italija'},
  {name:'Venecija', extra:'Italija'}, {name:'Firenca', extra:'Italija'}, {name:'Bolonja', extra:'Italija'},
  {name:'Verona', extra:'Italija'}, {name:'Torino', extra:'Italija'}, {name:'Bari', extra:'Italija'}, {name:'Sicilija', extra:'Italija'},
  {name:'Đenova', extra:'Italija'}, {name:'Pisa', extra:'Italija'}, {name:'Trst', extra:'Italija'},
  {name:'Leče', extra:'Italija'}, {name:'Sardinija', extra:'Italija'}, {name:'Kaljari', extra:'Italija'},
  {name:'Palermo', extra:'Italija'}, {name:'Katanija', extra:'Italija'}, {name:'Padova', extra:'Italija'}, {name:'Parma', extra:'Italija'},
  {name:'Modena', extra:'Italija'}, {name:'Perudja', extra:'Italija'}, {name:'Brešija', extra:'Italija'}, {name:'Salerno', extra:'Italija'},
  {name:'Bergamo', extra:'Italija'}, {name:'Komo', extra:'Italija'}, {name:'Trevizo', extra:'Italija'}, {name:'Udine', extra:'Italija'},
  {name:'Ankona', extra:'Italija'}, {name:'Peskara', extra:'Italija'}, {name:'Ređo Emilija', extra:'Italija'}, {name:'Ferara', extra:'Italija'},
  {name:'Livorno', extra:'Italija'}, {name:'Trento', extra:'Italija'}, {name:'Bolcano', extra:'Italija'}, {name:'Aosta', extra:'Italija'},
  {name:'Luka', extra:'Italija'}, {name:'La Specija', extra:'Italija'}, {name:'Savona', extra:'Italija'}, {name:'Matera', extra:'Italija'},
  {name:'Kozenca', extra:'Italija'}, {name:'Ređo di Kalabrija', extra:'Italija'},
  // Italija — banje
  {name:'Abano Terme', extra:'Italija'}, {name:'Montekatini Terme', extra:'Italija'}, {name:'Fjuđi', extra:'Italija'}, {name:'Salsomađore Terme', extra:'Italija'},
  // Italija — planine
  {name:'Dolomiti', extra:'Italija'}, {name:'Kortina d\'Ampeco', extra:'Italija'}, {name:'Val Gardena', extra:'Italija'}, {name:'Livinjo', extra:'Italija'}, {name:'Etna', extra:'Italija'},
  {name:'Vezuv', extra:'Italija'}, {name:'Gran Paradizo', extra:'Italija'}, {name:'Monblan', extra:'Italija'}, {name:'Stelvio', extra:'Italija'},
  // Italija — jezera
  {name:'Gardsko Jezero', extra:'Italija'}, {name:'Jezero Mađore', extra:'Italija'},
  // Italija — turistički centri
  {name:'Pompeji', extra:'Italija'}, {name:'Asizi', extra:'Italija'}, {name:'Sijena', extra:'Italija'}, {name:'San Đimonjano', extra:'Italija'}, {name:'Orvieto', extra:'Italija'}, {name:'Ravena', extra:'Italija'},
  // Italija — primorska mesta
  {name:'Amalfi', extra:'Italija'}, {name:'Pozitano', extra:'Italija'}, {name:'Sorento', extra:'Italija'}, {name:'Rimini', extra:'Italija'},
  {name:'Kapri', extra:'Italija'}, {name:'Portofino', extra:'Italija'}, {name:'Elba', extra:'Italija'}, {name:'Taormina', extra:'Italija'},
  {name:'San Remo', extra:'Italija'}, {name:'Vijaređo', extra:'Italija'}, {name:'Forte dei Marmi', extra:'Italija'}, {name:'Ostija', extra:'Italija'},
  {name:'Otranto', extra:'Italija'}, {name:'Poliljano a Mare', extra:'Italija'}, {name:'Trapani', extra:'Italija'},
  {name:'Sirakuza', extra:'Italija'}, {name:'Agriđento', extra:'Italija'}, {name:'Ćefalu', extra:'Italija'}, {name:'San Vito Lo Kapo', extra:'Italija'},
  {name:'Lipari', extra:'Italija'}, {name:'Iskija', extra:'Italija'}, {name:'Pročida', extra:'Italija'}, {name:'Ustika', extra:'Italija'},
  // Španija i Portugal
  {name:'Barselona', extra:'Španija'}, {name:'Madrid', extra:'Španija'}, {name:'Valensija', extra:'Španija'},
  {name:'Malaga', extra:'Španija'}, {name:'Ibica', extra:'Španija'}, {name:'Majorka', extra:'Španija'}, {name:'Sevilja', extra:'Španija'},
  {name:'Alikante', extra:'Španija'}, {name:'Granada', extra:'Španija'}, {name:'Bilbao', extra:'Španija'},
  {name:'Tenerife', extra:'Španija'}, {name:'Gran Kanarija', extra:'Španija'},
  {name:'San Sebastijan', extra:'Španija'}, {name:'Salamanka', extra:'Španija'}, {name:'Toledo', extra:'Španija'},
  {name:'Santjago de Kompostela', extra:'Španija'}, {name:'Lanzarote', extra:'Španija'}, {name:'Fuerteventura', extra:'Španija'},
  // Španija — dopunski gradovi
  {name:'Zaragoza', extra:'Španija'}, {name:'Murcija', extra:'Španija'}, {name:'Valjadolid', extra:'Španija'},
  {name:'Vigo', extra:'Španija'}, {name:'Hihon', extra:'Španija'}, {name:'A Korunja', extra:'Španija'}, {name:'Kadiz', extra:'Španija'},
  {name:'Pamplona', extra:'Španija'}, {name:'Burgos', extra:'Španija'}, {name:'Ovijedo', extra:'Španija'}, {name:'Kartahena', extra:'Španija'},
  {name:'Vitorija', extra:'Španija'}, {name:'Logronjo', extra:'Španija'}, {name:'Kaseres', extra:'Španija'}, {name:'Merida', extra:'Španija'},
  // Španija — ostrva
  {name:'Palma de Majorka', extra:'Španija'}, {name:'Menorka', extra:'Španija'}, {name:'Formentera', extra:'Španija'},
  {name:'La Palma', extra:'Španija'}, {name:'El Hijero', extra:'Španija'}, {name:'La Gomera', extra:'Španija'},
  // Španija — obala i planine
  {name:'Kosta Brava', extra:'Španija'}, {name:'Kosta del Sol', extra:'Španija'}, {name:'Kosta Blanka', extra:'Španija'},
  {name:'Marbelja', extra:'Španija'}, {name:'Benidorm', extra:'Španija'}, {name:'Torremolinos', extra:'Španija'}, {name:'Salou', extra:'Španija'}, {name:'Sitges', extra:'Španija'},
  {name:'Sijera Nevada', extra:'Španija'}, {name:'Pirineji', extra:'Španija'},
  // Španija — manja mesta
  {name:'Segovija', extra:'Španija'}, {name:'Kuenka', extra:'Španija'}, {name:'Avila', extra:'Španija'},
  // Španija — banje
  {name:'Panticosa', extra:'Španija'}, {name:'Archena', extra:'Španija'}, {name:'Alama de Aragon', extra:'Španija'},
  // Španija — reke
  {name:'Ebro', extra:'Španija'}, {name:'Duero', extra:'Španija'}, {name:'Taho', extra:'Španija'}, {name:'Gvadalkivir', extra:'Španija'}, {name:'Gvadijana', extra:'Španija'},
  // Španija — jezera
  {name:'Jezera Kovadonga', extra:'Španija'}, {name:'Jezero Sanabija', extra:'Španija'}, {name:'Jezero Banjoles', extra:'Španija'},
  // Španija — turistički centri
  {name:'Kordoba', extra:'Španija'}, {name:'Ronda', extra:'Španija'},
  {name:'Lisabon', extra:'Portugalija'}, {name:'Porto', extra:'Portugalija'}, {name:'Faro', extra:'Portugalija'},
  {name:'Koimbra', extra:'Portugalija'}, {name:'Braga', extra:'Portugalija'},
  // Portugalija — gradovi
  {name:'Aveiro', extra:'Portugalija'}, {name:'Guimarães', extra:'Portugalija'}, {name:'Setúbal', extra:'Portugalija'}, {name:'Viseu', extra:'Portugalija'},
  // Portugalija — manja mesta
  {name:'Óbidos', extra:'Portugalija'}, {name:'Tomar', extra:'Portugalija'}, {name:'Elvas', extra:'Portugalija'}, {name:'Marvão', extra:'Portugalija'}, {name:'Monsaraz', extra:'Portugalija'},
  // Portugalija — banje
  {name:'Caldas da Rainha', extra:'Portugalija'}, {name:'Termas de São Pedro do Sul', extra:'Portugalija'}, {name:'Caldas do Gerês', extra:'Portugalija'}, {name:'Monfortinho', extra:'Portugalija'},
  // Portugalija — planine
  {name:'Serra da Estrela', extra:'Portugalija'}, {name:'Peneda-Gerês', extra:'Portugalija'}, {name:'Monchique', extra:'Portugalija'},
  // Portugalija — reke
  {name:'Douro', extra:'Portugalija'}, {name:'Tejo', extra:'Portugalija'}, {name:'Minho', extra:'Portugalija'}, {name:'Mondego', extra:'Portugalija'},
  // Portugalija — jezera
  {name:'Alqueva', extra:'Portugalija'}, {name:'Jezero Sedam Gradova', extra:'Portugalija'}, {name:'Jezero Furnas', extra:'Portugalija'},
  // Portugalija — turistički centri
  {name:'Sintra', extra:'Portugalija'}, {name:'Evora', extra:'Portugalija'}, {name:'Fatima', extra:'Portugalija'},
  // Portugalija — primorska mesta i ostrva
  {name:'Albufeira', extra:'Portugalija'}, {name:'Kaskais', extra:'Portugalija'}, {name:'Nazare', extra:'Portugalija'},
  {name:'Ericeira', extra:'Portugalija'}, {name:'Peniche', extra:'Portugalija'}, {name:'Lagos', extra:'Portugalija'},
  {name:'Portimão', extra:'Portugalija'}, {name:'Tavira', extra:'Portugalija'}, {name:'Vilamoura', extra:'Portugalija'},
  {name:'Sesimbra', extra:'Portugalija'}, {name:'Costa da Caparica', extra:'Portugalija'},
  {name:'Madeira', extra:'Portugalija'}, {name:'Azori', extra:'Portugalija'}, {name:'Tersejra', extra:'Portugalija'},
  // Zapadna/Severna Evropa
  {name:'Pariz', extra:'Francuska'}, {name:'Nica', extra:'Francuska'}, {name:'Lion', extra:'Francuska'},
  {name:'Bordo', extra:'Francuska'}, {name:'Marselj', extra:'Francuska'}, {name:'Strazbur', extra:'Francuska'},
  {name:'Tuluz', extra:'Francuska'}, {name:'Kan', extra:'Francuska'}, {name:'Avinjon', extra:'Francuska'},
  {name:'Anesi', extra:'Francuska'}, {name:'Šamoni', extra:'Francuska'}, {name:'Korzika', extra:'Francuska'},
  {name:'Kuršel', extra:'Francuska'}, {name:'Val d\'Izer', extra:'Francuska'}, {name:'Val Toran', extra:'Francuska'},
  {name:'Meribel', extra:'Francuska'}, {name:'Tinj', extra:'Francuska'}, {name:'Mežev', extra:'Francuska'},
  {name:'London', extra:'Velika Britanija'}, {name:'Edinburg', extra:'Velika Britanija'},
  {name:'Mančester', extra:'Velika Britanija'}, {name:'Liverpul', extra:'Velika Britanija'},
  {name:'Glazgov', extra:'Velika Britanija'}, {name:'Belfast', extra:'Velika Britanija'},
  {name:'Oksford', extra:'Velika Britanija'}, {name:'Kembridž', extra:'Velika Britanija'}, {name:'Bat', extra:'Velika Britanija'},
  {name:'Kardif', extra:'Velika Britanija'}, {name:'Aberdin', extra:'Velika Britanija'},
  {name:'Amsterdam', extra:'Holandija'}, {name:'Roterdam', extra:'Holandija'}, {name:'Hag', extra:'Holandija'},
  {name:'Utreht', extra:'Holandija'}, {name:'Delft', extra:'Holandija'}, {name:'Mastriht', extra:'Holandija'},
  {name:'Berlin', extra:'Nemačka'}, {name:'Minhen', extra:'Nemačka'}, {name:'Hamburg', extra:'Nemačka'}, {name:'Frankfurt', extra:'Nemačka'},
  {name:'Keln', extra:'Nemačka'}, {name:'Diseldorf', extra:'Nemačka'}, {name:'Štutgart', extra:'Nemačka'}, {name:'Drezden', extra:'Nemačka'},
  {name:'Nirnberg', extra:'Nemačka'}, {name:'Lajpcig', extra:'Nemačka'}, {name:'Bremen', extra:'Nemačka'}, {name:'Hanover', extra:'Nemačka'},
  // Nemačka — dopunski gradovi
  {name:'Bon', extra:'Nemačka'}, {name:'Esen', extra:'Nemačka'}, {name:'Dortmund', extra:'Nemačka'}, {name:'Duizburg', extra:'Nemačka'},
  {name:'Bohum', extra:'Nemačka'}, {name:'Vupertal', extra:'Nemačka'}, {name:'Bilefeld', extra:'Nemačka'}, {name:'Manhajm', extra:'Nemačka'},
  {name:'Karlsrue', extra:'Nemačka'}, {name:'Visbaden', extra:'Nemačka'}, {name:'Majnc', extra:'Nemačka'}, {name:'Ahen', extra:'Nemačka'},
  {name:'Minster', extra:'Nemačka'}, {name:'Augsburg', extra:'Nemačka'}, {name:'Kasel', extra:'Nemačka'}, {name:'Kil', extra:'Nemačka'},
  {name:'Rostok', extra:'Nemačka'}, {name:'Magdeburg', extra:'Nemačka'}, {name:'Erfurt', extra:'Nemačka'}, {name:'Vajmar', extra:'Nemačka'},
  {name:'Ulm', extra:'Nemačka'}, {name:'Frajburg', extra:'Nemačka'}, {name:'Lubek', extra:'Nemačka'}, {name:'Regensburg', extra:'Nemačka'},
  {name:'Vircburg', extra:'Nemačka'}, {name:'Konstanc', extra:'Nemačka'}, {name:'Koblenc', extra:'Nemačka'}, {name:'Bamberg', extra:'Nemačka'}, {name:'Trir', extra:'Nemačka'},
  // Nemačka — banje
  {name:'Baden-Baden', extra:'Nemačka'}, {name:'Bad Homburg', extra:'Nemačka'},
  // Nemačka — planine i priroda
  {name:'Cugšpice', extra:'Nemačka'}, {name:'Švarcvald', extra:'Nemačka'}, {name:'Harc', extra:'Nemačka'},
  {name:'Bodensko Jezero', extra:'Nemačka'}, {name:'Kimzee', extra:'Nemačka'}, {name:'Zilt', extra:'Nemačka'}, {name:'Rugen', extra:'Nemačka'},
  {name:'Beč', extra:'Austrija'}, {name:'Zalcburg', extra:'Austrija'}, {name:'Insbruk', extra:'Austrija'}, {name:'Graz', extra:'Austrija'},
  {name:'Linc', extra:'Austrija'}, {name:'Klagenfurt', extra:'Austrija'}, {name:'Filah', extra:'Austrija'}, {name:'Vels', extra:'Austrija'}, {name:'Sankt Pelten', extra:'Austrija'},
  {name:'Ajzenštat', extra:'Austrija'}, {name:'Dornbirn', extra:'Austrija'}, {name:'Bregenc', extra:'Austrija'}, {name:'Feldkirh', extra:'Austrija'},
  {name:'Viner Nojštat', extra:'Austrija'}, {name:'Krems na Dunavu', extra:'Austrija'}, {name:'Klosternojburg', extra:'Austrija'},
  {name:'Leoben', extra:'Austrija'}, {name:'Štajer', extra:'Austrija'}, {name:'Amšteten', extra:'Austrija'},
  {name:'Kufštajn', extra:'Austrija'}, {name:'Vergl', extra:'Austrija'}, {name:'Švac', extra:'Austrija'}, {name:'Lienc', extra:'Austrija'},
  // Austrija — banje
  {name:'Bad Gastajn', extra:'Austrija'}, {name:'Bad Išl', extra:'Austrija'}, {name:'Bad Ausee', extra:'Austrija'}, {name:'Baden kod Beča', extra:'Austrija'},
  {name:'Bad Hofgastajn', extra:'Austrija'}, {name:'Bad Klajnkirhajm', extra:'Austrija'}, {name:'Lojpersdorf', extra:'Austrija'},
  // Austrija — planine i skijališta
  {name:'Kicbil', extra:'Austrija'}, {name:'Zel am Zi', extra:'Austrija'}, {name:'Solden', extra:'Austrija'}, {name:'Išgl', extra:'Austrija'}, {name:'Majrhofen', extra:'Austrija'},
  {name:'Lech', extra:'Austrija'}, {name:'Cirs', extra:'Austrija'}, {name:'Obertauern', extra:'Austrija'}, {name:'Šladming', extra:'Austrija'},
  {name:'Zalbah', extra:'Austrija'}, {name:'Kaprun', extra:'Austrija'}, {name:'Bišofshofen', extra:'Austrija'}, {name:'Sankt Johan im Pongau', extra:'Austrija'},
  {name:'Grosglokner', extra:'Austrija'}, {name:'Dahštajn', extra:'Austrija'}, {name:'Semering', extra:'Austrija'},
  // Austrija — turistički centri
  {name:'Halštat', extra:'Austrija'}, {name:'Verfen', extra:'Austrija'}, {name:'Melk', extra:'Austrija'}, {name:'Vahau', extra:'Austrija'},
  // Austrija — jezera
  {name:'Volfgangze', extra:'Austrija'}, {name:'Ahenze', extra:'Austrija'}, {name:'Vertersee', extra:'Austrija'},
  {name:'Atersee', extra:'Austrija'}, {name:'Mondzee', extra:'Austrija'}, {name:'Traunzee', extra:'Austrija'}, {name:'Nojzidlersko Jezero', extra:'Austrija'},
  {name:'Prag', extra:'Češka'}, {name:'Brno', extra:'Češka'}, {name:'Plzenj', extra:'Češka'}, {name:'Olomouc', extra:'Češka'},
  {name:'Ostrava', extra:'Češka'}, {name:'Hradec Kralove', extra:'Češka'}, {name:'Liberec', extra:'Češka'}, {name:'Pardubice', extra:'Češka'},
  {name:'Zlin', extra:'Češka'}, {name:'Češke Budejovice', extra:'Češka'},
  // Češka — manja mesta
  {name:'Telč', extra:'Češka'}, {name:'Mikulov', extra:'Češka'}, {name:'Kroměříž', extra:'Češka'}, {name:'Litomyšl', extra:'Češka'}, {name:'Terezin', extra:'Češka'},
  // Češka — banje
  {name:'Karlovi Vari', extra:'Češka'}, {name:'Mariánske Lazne', extra:'Češka'}, {name:'Františkove Lazne', extra:'Češka'}, {name:'Luhačovice', extra:'Češka'},
  // Češka — planine
  {name:'Krkonoše', extra:'Češka'}, {name:'Šumava', extra:'Češka'}, {name:'Jeseniky', extra:'Češka'},
  // Češka — reke
  {name:'Vltava', extra:'Češka'}, {name:'Labe', extra:'Češka'}, {name:'Morava', extra:'Češka'},
  // Češka — jezera
  {name:'Lipno Jezero', extra:'Češka'}, {name:'Mácha Jezero', extra:'Češka'},
  // Češka — turistički centri
  {name:'Češki Krumlov', extra:'Češka'}, {name:'Kutna Hora', extra:'Češka'}, {name:'Konopiste Dvorac', extra:'Češka'}, {name:'Karlštejn Dvorac', extra:'Češka'},
  {name:'Bratislava', extra:'Slovačka'}, {name:'Košice', extra:'Slovačka'}, {name:'Poprad', extra:'Slovačka'}, {name:'Banska Bistrica', extra:'Slovačka'},
  {name:'Žilina', extra:'Slovačka'}, {name:'Prešov', extra:'Slovačka'}, {name:'Nitra', extra:'Slovačka'}, {name:'Trnava', extra:'Slovačka'},
  // Slovačka — manja mesta
  {name:'Levoča', extra:'Slovačka'}, {name:'Bardejov', extra:'Slovačka'}, {name:'Kežmarok', extra:'Slovačka'}, {name:'Trenčín', extra:'Slovačka'},
  // Slovačka — banje
  {name:'Piešťany', extra:'Slovačka'}, {name:'Bardejovske Kupele', extra:'Slovačka'}, {name:'Dudince', extra:'Slovačka'},
  // Slovačka — planine
  {name:'Visoke Tatre', extra:'Slovačka'}, {name:'Niske Tatre', extra:'Slovačka'}, {name:'Mala Fatra', extra:'Slovačka'},
  // Slovačka — reke
  {name:'Váh', extra:'Slovačka'}, {name:'Hron', extra:'Slovačka'}, {name:'Hornád', extra:'Slovačka'},
  // Slovačka — jezera
  {name:'Štrbske Pleso', extra:'Slovačka'}, {name:'Domaša Jezero', extra:'Slovačka'}, {name:'Oravska Priehrada', extra:'Slovačka'},
  // Slovačka — turistički centri
  {name:'Spišski Hrad', extra:'Slovačka'}, {name:'Demanovska Jaskinja', extra:'Slovačka'}, {name:'Oravski Hrad', extra:'Slovačka'},
  {name:'Budimpešta', extra:'Mađarska'},
  {name:'Segedin', extra:'Mađarska'}, {name:'Pečuj', extra:'Mađarska'}, {name:'Debrecin', extra:'Mađarska'}, {name:'Đer', extra:'Mađarska'},
  {name:'Balaton', extra:'Mađarska'}, {name:'Heviz', extra:'Mađarska'}, {name:'Šiofok', extra:'Mađarska'}, {name:'Kečkemet', extra:'Mađarska'},
  {name:'Varšava', extra:'Poljska'}, {name:'Krakov', extra:'Poljska'}, {name:'Vroclav', extra:'Poljska'},
  {name:'Gdanjsk', extra:'Poljska'}, {name:'Poznanj', extra:'Poljska'}, {name:'Lođ', extra:'Poljska'}, {name:'Ščećin', extra:'Poljska'}, {name:'Katovice', extra:'Poljska'}, {name:'Bidgošć', extra:'Poljska'}, {name:'Lublin', extra:'Poljska'}, {name:'Žešuv', extra:'Poljska'},
  // Poljska — manja mesta
  {name:'Torunj', extra:'Poljska'}, {name:'Zelena Gora', extra:'Poljska'}, {name:'Bjalistok', extra:'Poljska'}, {name:'Olštin', extra:'Poljska'}, {name:'Kališ', extra:'Poljska'},
  // Poljska — banje
  {name:'Krinica Zdruj', extra:'Poljska'}, {name:'Kudova Zdruj', extra:'Poljska'}, {name:'Poljanica Zdruj', extra:'Poljska'}, {name:'Čechocinek', extra:'Poljska'}, {name:'Naleczov', extra:'Poljska'},
  // Poljska — planine
  {name:'Zakopane', extra:'Poljska'}, {name:'Karkonoše', extra:'Poljska'}, {name:'Beščadi', extra:'Poljska'},
  // Poljska — reke
  {name:'Visla', extra:'Poljska'}, {name:'Odra', extra:'Poljska'}, {name:'Varta', extra:'Poljska'}, {name:'Bug', extra:'Poljska'},
  // Poljska — jezera
  {name:'Mazurska Jezera', extra:'Poljska'},
  // Poljska — turistički centri
  {name:'Vjelička', extra:'Poljska'}, {name:'Aušvic-Birkenau', extra:'Poljska'}, {name:'Malburk', extra:'Poljska'}, {name:'Bjalovješka Šuma', extra:'Poljska'}, {name:'Čenstohova', extra:'Poljska'},
  // Poljska — primorska mesta
  {name:'Gdinja', extra:'Poljska'}, {name:'Sopot', extra:'Poljska'}, {name:'Kolobžeg', extra:'Poljska'}, {name:'Hel', extra:'Poljska'}, {name:'Ustka', extra:'Poljska'},
  {name:'Stokholm', extra:'Švedska'}, {name:'Geteborg', extra:'Švedska'}, {name:'Malme', extra:'Švedska'}, {name:'Kiruna', extra:'Švedska'},
  {name:'Oslo', extra:'Norveška'}, {name:'Bergen', extra:'Norveška'}, {name:'Tromse', extra:'Norveška'}, {name:'Stavanger', extra:'Norveška'}, {name:'Lofoti', extra:'Norveška'},
  {name:'Kopenhagen', extra:'Danska'}, {name:'Arhus', extra:'Danska'}, {name:'Odense', extra:'Danska'},
  {name:'Helsinki', extra:'Finska'}, {name:'Rovanijemi', extra:'Finska'}, {name:'Tampere', extra:'Finska'},
  {name:'Dablin', extra:'Irska'}, {name:'Kork', extra:'Irska'}, {name:'Golvej', extra:'Irska'}, {name:'Šenon', extra:'Irska'},
  {name:'Brisel', extra:'Belgija'}, {name:'Briž', extra:'Belgija'}, {name:'Gent', extra:'Belgija'}, {name:'Antverpen', extra:'Belgija'},
  {name:'Cirih', extra:'Švajcarska'}, {name:'Ženeva', extra:'Švajcarska'}, {name:'Bern', extra:'Švajcarska'}, {name:'Lucern', extra:'Švajcarska'},
  {name:'Bazel', extra:'Švajcarska'}, {name:'Cermat', extra:'Švajcarska'}, {name:'Interlaken', extra:'Švajcarska'}, {name:'Lugano', extra:'Švajcarska'},
  {name:'Sen Moric', extra:'Švajcarska'}, {name:'Verbije', extra:'Švajcarska'},
  // Baltik, Malta, Kipar, Island i mikrodržave
  {name:'Talin', extra:'Estonija'}, {name:'Tartu', extra:'Estonija'},
  {name:'Riga', extra:'Letonija'}, {name:'Jurmala', extra:'Letonija'},
  {name:'Viljnus', extra:'Litvanija'}, {name:'Kaunas', extra:'Litvanija'}, {name:'Klaipeda', extra:'Litvanija'}, {name:'Palanga', extra:'Litvanija'},
  {name:'Valeta', extra:'Malta'}, {name:'Sliema', extra:'Malta'}, {name:'Mdina', extra:'Malta'}, {name:'Gozo', extra:'Malta'},
  {name:'Nikozija', extra:'Kipar'}, {name:'Limasol', extra:'Kipar'}, {name:'Larnaka', extra:'Kipar'}, {name:'Pafos', extra:'Kipar'}, {name:'Ajia Napa', extra:'Kipar'},
  {name:'Rejkjavik', extra:'Island'}, {name:'Akurejri', extra:'Island'},
  // Island — manja mesta
  {name:'Keflavik', extra:'Island'}, {name:'Selfos', extra:'Island'}, {name:'Vestmanaeyjar', extra:'Island'},
  {name:'Hofn', extra:'Island'}, {name:'Egilsstadir', extra:'Island'}, {name:'Isafjordur', extra:'Island'},
  {name:'Husavik', extra:'Island'}, {name:'Vik', extra:'Island'}, {name:'Borganes', extra:'Island'},
  {name:'Stikisholmur', extra:'Island'}, {name:'Grindavik', extra:'Island'}, {name:'Hafnarfjordur', extra:'Island'},
  // Island — vodopadi i priroda
  {name:'Gulfos', extra:'Island'}, {name:'Skogafos', extra:'Island'}, {name:'Seljalandsfos', extra:'Island'},
  {name:'Detifos', extra:'Island'}, {name:'Fjadrargljufur', extra:'Island'}, {name:'Rejnisfjara', extra:'Island'},
  {name:'Dijamantska Plaža', extra:'Island'}, {name:'Hverir', extra:'Island'},
  // Island — banje i lagune
  {name:'Plava Laguna', extra:'Island'}, {name:'Terme Mivatn', extra:'Island'}, {name:'Tajna Laguna', extra:'Island'}, {name:'Sky Laguna', extra:'Island'},
  // Island — planine i vulkani
  {name:'Snajfelsjokul', extra:'Island'}, {name:'Kirkjufel', extra:'Island'}, {name:'Hekla', extra:'Island'},
  {name:'Herdubreid', extra:'Island'}, {name:'Ejafjatlajokul', extra:'Island'}, {name:'Askja', extra:'Island'},
  // Island — glečeri i jezera
  {name:'Jokulsarlon', extra:'Island'}, {name:'Mivatn', extra:'Island'}, {name:'Vatnajokul', extra:'Island'},
  // Island — turistički centri
  {name:'Tingvelir', extra:'Island'}, {name:'Landmanalaugar', extra:'Island'}, {name:'Torsmork', extra:'Island'},
  {name:'Skaftafel', extra:'Island'}, {name:'Snajfelsnes', extra:'Island'}, {name:'Vestfjordi', extra:'Island'}, {name:'Kerid', extra:'Island'},
  {name:'Monako', extra:'Monako'}, {name:'Monte Karlo', extra:'Monako'}, {name:'Luksemburg', extra:'Luksemburg'},
  // Turska, Bliski istok, sever Afrike
  {name:'Istanbul', extra:'Turska'}, {name:'Antalija', extra:'Turska'}, {name:'Bodrum', extra:'Turska'}, {name:'Kapadokija', extra:'Turska'},
  {name:'Marmaris', extra:'Turska'}, {name:'Fetije', extra:'Turska'}, {name:'Izmir', extra:'Turska'}, {name:'Ankara', extra:'Turska'},
  {name:'Alanja', extra:'Turska'}, {name:'Kušadasi', extra:'Turska'}, {name:'Side', extra:'Turska'}, {name:'Pamukale', extra:'Turska'}, {name:'Bursa', extra:'Turska'}, {name:'Česme', extra:'Turska'},
  // Turska — gradovi
  {name:'Adana', extra:'Turska'}, {name:'Konja', extra:'Turska'}, {name:'Gaziantep', extra:'Turska'}, {name:'Kajseri', extra:'Turska'}, {name:'Mersin', extra:'Turska'},
  {name:'Eskišehir', extra:'Turska'}, {name:'Denizli', extra:'Turska'}, {name:'Trabzon', extra:'Turska'}, {name:'Samsun', extra:'Turska'}, {name:'Malatja', extra:'Turska'},
  // Turska — banje
  {name:'Jalova', extra:'Turska'}, {name:'Afjon Karahisar', extra:'Turska'}, {name:'Haymana', extra:'Turska'}, {name:'Kizildžahamam', extra:'Turska'},
  // Turska — turistički centri
  {name:'Efes', extra:'Turska'}, {name:'Troja', extra:'Turska'}, {name:'Pergamon', extra:'Turska'}, {name:'Hijerapolis', extra:'Turska'},
  {name:'Sumela', extra:'Turska'}, {name:'Nemrut', extra:'Turska'}, {name:'Safranbolu', extra:'Turska'}, {name:'Gjobekli Tepe', extra:'Turska'},
  // Turska — primorska mesta
  {name:'Kaš', extra:'Turska'}, {name:'Kalkan', extra:'Turska'}, {name:'Datča', extra:'Turska'}, {name:'Didim', extra:'Turska'},
  {name:'Ajvalik', extra:'Turska'}, {name:'Silifke', extra:'Turska'}, {name:'Foča (Turska)', extra:'Turska'},
  // Turska — jezera i reke
  {name:'Jezero Van', extra:'Turska'}, {name:'Jezero Tuz', extra:'Turska'}, {name:'Jezero Bejšehir', extra:'Turska'},
  {name:'Jezero Egirdir', extra:'Turska'}, {name:'Reka Manavgat', extra:'Turska'}, {name:'Reka Daljan', extra:'Turska'},
  // Turska — ski centri
  {name:'Uludag', extra:'Turska'}, {name:'Kartalkaja', extra:'Turska'}, {name:'Ercijes', extra:'Turska'},
  {name:'Palandoken', extra:'Turska'}, {name:'Saklikent', extra:'Turska'},
  // Turska — gradovi istoka i unutrašnjosti
  {name:'Šanliurfa', extra:'Turska'}, {name:'Diyarbakir', extra:'Turska'},
  {name:'Erzurum', extra:'Turska'}, {name:'Van', extra:'Turska'}, {name:'Dogubayazit', extra:'Turska'},
  {name:'Tel Aviv', extra:'Izrael'}, {name:'Mrtvo More', extra:'Izrael'}, {name:'Jerusalim', extra:'Izrael'}, {name:'Dubai', extra:'UAE'}, {name:'Abu Dabi', extra:'UAE'},
  // Ikonične svetske znamenitosti (dopuna)
  {name:'Agra (Tadž Mahal)', extra:'Indija'}, {name:'Kineski zid', extra:'Kina'}, {name:'Everest baza kamp', extra:'Nepal'}, {name:'Lukla', extra:'Nepal'},
  {name:'Stonehendž', extra:'Velika Britanija'}, {name:'Veliki Koralni Greben', extra:'Australija'},
  {name:'Kilimandžaro', extra:'Tanzanija'}, {name:'Serengeti', extra:'Tanzanija'}, {name:'Sahara (Merzuga)', extra:'Maroko'},
  {name:'Bora Bora', extra:'Francuska Polinezija'}, {name:'Tahiti', extra:'Francuska Polinezija'},
  {name:'Kairo', extra:'Egipat'}, {name:'Šarm El Šeik', extra:'Egipat'}, {name:'Hurgada', extra:'Egipat'}, {name:'Luksor', extra:'Egipat'},
  {name:'Marakeš', extra:'Maroko'}, {name:'Rabat', extra:'Maroko'}, {name:'Kazablanka', extra:'Maroko'}, {name:'Tanger', extra:'Maroko'},
  // Amerika i Azija (najtraženiji daleki gradovi)
  {name:'Njujork', extra:'SAD'}, {name:'Majami', extra:'SAD'}, {name:'Los Anđeles', extra:'SAD'},
  {name:'Las Vegas', extra:'SAD'}, {name:'Čikago', extra:'SAD'}, {name:'San Francisko', extra:'SAD'},
  {name:'Boston', extra:'SAD'}, {name:'Vašington', extra:'SAD'}, {name:'Orlando', extra:'SAD'}, {name:'Honolulu', extra:'SAD'},
  {name:'Filadelfija', extra:'SAD'}, {name:'Sijetl', extra:'SAD'}, {name:'Denver', extra:'SAD'}, {name:'Atlanta', extra:'SAD'},
  {name:'Nju Orleans', extra:'SAD'}, {name:'Nešvil', extra:'SAD'}, {name:'San Dijego', extra:'SAD'}, {name:'Ostin', extra:'SAD'},
  {name:'Dalas', extra:'SAD'}, {name:'Hjuston', extra:'SAD'}, {name:'Feniks', extra:'SAD'}, {name:'Portland', extra:'SAD'},
  {name:'Aspen', extra:'SAD'}, {name:'Vejl', extra:'SAD'}, {name:'Park Siti', extra:'SAD'}, {name:'Džekson Houl', extra:'SAD'},
  // SAD — nacionalni parkovi
  {name:'Grand Kanjon', extra:'SAD'}, {name:'Jeloustoun', extra:'SAD'}, {name:'Jozemit', extra:'SAD'}, {name:'Maui', extra:'SAD'},
  {name:'Toronto', extra:'Kanada'}, {name:'Vankuver', extra:'Kanada'}, {name:'Montreal', extra:'Kanada'}, {name:'Otava', extra:'Kanada'},
  {name:'Kvebek Siti', extra:'Kanada'}, {name:'Kalgari', extra:'Kanada'}, {name:'Banf', extra:'Kanada'},
  {name:'Niagarini Vodopadi', extra:'Kanada'}, {name:'Vistler', extra:'Kanada'},
  {name:'Meksiko Siti', extra:'Meksiko'}, {name:'Kankun', extra:'Meksiko'},
  {name:'Plaja del Karmen', extra:'Meksiko'}, {name:'Tulum', extra:'Meksiko'}, {name:'Kozumel', extra:'Meksiko'},
  {name:'Isla Muheres', extra:'Meksiko'}, {name:'Holboks', extra:'Meksiko'},
  {name:'Puerto Valjarta', extra:'Meksiko'}, {name:'Los Kabos', extra:'Meksiko'}, {name:'Masatlan', extra:'Meksiko'},
  {name:'Akapulko', extra:'Meksiko'}, {name:'Uatulko', extra:'Meksiko'}, {name:'Istapa-Sivataneho', extra:'Meksiko'},
  {name:'Gvadalahara', extra:'Meksiko'}, {name:'Monterej', extra:'Meksiko'}, {name:'Puebla', extra:'Meksiko'},
  {name:'Oahaka', extra:'Meksiko'}, {name:'San Migel de Aljende', extra:'Meksiko'}, {name:'Gvanahvato', extra:'Meksiko'},
  {name:'Merida', extra:'Meksiko'}, {name:'Keretaro', extra:'Meksiko'}, {name:'Morelija', extra:'Meksiko'},
  {name:'Zakatekas', extra:'Meksiko'}, {name:'Kampeče', extra:'Meksiko'}, {name:'Tukstla Gutijeres', extra:'Meksiko'},
  {name:'San Kristobal de las Kasas', extra:'Meksiko'}, {name:'Bilja Ermosa', extra:'Meksiko'}, {name:'Čivava', extra:'Meksiko'},
  {name:'Četumal', extra:'Meksiko'}, {name:'Leon', extra:'Meksiko'}, {name:'La Pas', extra:'Meksiko'}, {name:'Loreto', extra:'Meksiko'},
  {name:'Todos Santos', extra:'Meksiko'}, {name:'Tihuana', extra:'Meksiko'}, {name:'Ensenada', extra:'Meksiko'}, {name:'Kolima', extra:'Meksiko'},
  // Meksiko — pueblos mágicos i manja mesta
  {name:'Tekila', extra:'Meksiko'}, {name:'Taska', extra:'Meksiko'}, {name:'Valjadolid', extra:'Meksiko'}, {name:'Tepostlan', extra:'Meksiko'},
  {name:'Real de Katorse', extra:'Meksiko'}, {name:'Čolula', extra:'Meksiko'}, {name:'Sajulita', extra:'Meksiko'}, {name:'Valje de Bravo', extra:'Meksiko'},
  // Meksiko — priobalje (dopuna)
  {name:'Puerto Eskondido', extra:'Meksiko'}, {name:'Kabo Pulmo', extra:'Meksiko'},
  // Meksiko — priroda (dopuna)
  {name:'Jezero Pacskuaro', extra:'Meksiko'}, {name:'Grutas de Tolantongo', extra:'Meksiko'}, {name:'Hierve el Agua', extra:'Meksiko'},
  // Meksiko — Maja lokaliteti i priroda
  {name:'Čičen Ica', extra:'Meksiko'}, {name:'Palenke', extra:'Meksiko'}, {name:'Uksmal', extra:'Meksiko'},
  {name:'Teotivakan', extra:'Meksiko'}, {name:'Monte Alban', extra:'Meksiko'}, {name:'Kalakmul', extra:'Meksiko'},
  {name:'Kanjon Sumidero', extra:'Meksiko'}, {name:'Bakalar', extra:'Meksiko'}, {name:'Čapala Jezero', extra:'Meksiko'},
  {name:'Kanjon Bakra', extra:'Meksiko'},
  {name:'Popokatepetl', extra:'Meksiko'}, {name:'Ikstasivatl', extra:'Meksiko'}, {name:'Piko de Oriaba', extra:'Meksiko'},
  {name:'Istapan de la Sal', extra:'Meksiko'},
  {name:'Rio de Žaneiro', extra:'Brazil'}, {name:'Sao Paulo', extra:'Brazil'}, {name:'Buenos Ajres', extra:'Argentina'},
  // Brazil — dopuna
  {name:'Vodopadi Iguasu', extra:'Brazil'}, {name:'Salvador', extra:'Brazil'}, {name:'Florijanopolis', extra:'Brazil'},
  {name:'Buzios', extra:'Brazil'}, {name:'Manaus', extra:'Brazil'}, {name:'Brazilija', extra:'Brazil'},
  {name:'Fortaleza', extra:'Brazil'}, {name:'Resife', extra:'Brazil'},
  // Argentina — dopuna
  {name:'Bariloče', extra:'Argentina'}, {name:'Mendoza', extra:'Argentina'}, {name:'Iguasu (Argentina)', extra:'Argentina'},
  {name:'Ušuaja', extra:'Argentina'}, {name:'El Kalafate', extra:'Argentina'}, {name:'Salta', extra:'Argentina'}, {name:'Kordoba', extra:'Argentina'},
  {name:'Bogota', extra:'Kolumbija'}, {name:'Kartahena', extra:'Kolumbija'}, {name:'Lima', extra:'Peru'},
  // Kolumbija — dopuna
  {name:'Medeljin', extra:'Kolumbija'}, {name:'San Andres', extra:'Kolumbija'}, {name:'Santa Marta', extra:'Kolumbija'},
  // Peru — dopuna
  {name:'Arekipa', extra:'Peru'}, {name:'Puno', extra:'Peru'}, {name:'Ika-Uakačina', extra:'Peru'}, {name:'Naska linije', extra:'Peru'},
  {name:'Bangkok', extra:'Tajland'}, {name:'Puket', extra:'Tajland'}, {name:'Čijang Maj', extra:'Tajland'}, {name:'Pataja', extra:'Tajland'},
  {name:'Krabi', extra:'Tajland'}, {name:'Ko Samui', extra:'Tajland'}, {name:'Ko Pangan', extra:'Tajland'}, {name:'Ko Tao', extra:'Tajland'},
  {name:'Ko Pi Pi', extra:'Tajland'}, {name:'Ko Lanta', extra:'Tajland'}, {name:'Ajutaja', extra:'Tajland'}, {name:'Čijang Raj', extra:'Tajland'},
  {name:'Hua Hin', extra:'Tajland'}, {name:'Sukotaj', extra:'Tajland'},
  {name:'Tokio', extra:'Japan'}, {name:'Osaka', extra:'Japan'}, {name:'Kjoto', extra:'Japan'},
  {name:'Bali', extra:'Indonezija'}, {name:'Džakarta', extra:'Indonezija'}, {name:'Singapur', extra:'Singapur'},
  {name:'Ho Ši Min', extra:'Vijetnam'}, {name:'Hanoj', extra:'Vijetnam'},
  {name:'Peking', extra:'Kina'}, {name:'Šangaj', extra:'Kina'}, {name:'Hongkong', extra:'Kina'},
  {name:'Guangdžou', extra:'Kina'}, {name:'Šendžen', extra:'Kina'}, {name:'Sian', extra:'Kina'},
  {name:'Čengdu', extra:'Kina'}, {name:'Guilin', extra:'Kina'}, {name:'Makao', extra:'Kina'},
  {name:'Hangdžou', extra:'Kina'}, {name:'Lasa', extra:'Kina'},
  {name:'Seul', extra:'Južna Koreja'}, {name:'Kuala Lumpur', extra:'Malezija'}, {name:'Manila', extra:'Filipini'},
  {name:'Nju Delhi', extra:'Indija'}, {name:'Mumbaj', extra:'Indija'}, {name:'Goa', extra:'Indija'}, {name:'Male', extra:'Maldivi'},
  {name:'Baku', extra:'Azerbejdžan'}, {name:'Tbilisi', extra:'Gruzija'},
  {name:'Sidnej', extra:'Australija'}, {name:'Melburn', extra:'Australija'}, {name:'Brizbejn', extra:'Australija'},
  {name:'Pert', extra:'Australija'}, {name:'Gold Coast', extra:'Australija'}, {name:'Kernz', extra:'Australija'},
  {name:'Uluru', extra:'Australija'}, {name:'Adelejd', extra:'Australija'}, {name:'Darvin', extra:'Australija'},
  {name:'Hobart', extra:'Australija'}, {name:'Kanbera', extra:'Australija'},
  {name:'Okland', extra:'Novi Zeland'}, {name:'Velington', extra:'Novi Zeland'},
  {name:'Doha', extra:'Katar'}, {name:'Rijad', extra:'Saudijska Arabija'},
  {name:'Kejptaun', extra:'Južnoafrička Republika'}, {name:'Najrobi', extra:'Kenija'},
  // Dodato — popularne "paket" destinacije i sitni propusti
  {name:'Tunis (grad)', extra:'Tunis'}, {name:'Hamamet', extra:'Tunis'}, {name:'Sus', extra:'Tunis'},
  {name:'Monastir', extra:'Tunis'}, {name:'Đerba', extra:'Tunis'},
  {name:'Havana', extra:'Kuba'}, {name:'Varadero', extra:'Kuba'}, {name:'Trinidad (Kuba)', extra:'Kuba'}, {name:'Vinjales', extra:'Kuba'},
  {name:'Punta Kana', extra:'Dominikanska Republika'}, {name:'Santo Domingo', extra:'Dominikanska Republika'},
  {name:'Puerto Plata', extra:'Dominikanska Republika'}, {name:'Samana', extra:'Dominikanska Republika'},
  {name:'Zanzibar', extra:'Tanzanija'}, {name:'Mauricijus', extra:'Mauricijus'},
  {name:'Mahe', extra:'Sejšeli'}, {name:'Sejšeli', extra:'Sejšeli'},
  {name:'Sal', extra:'Zelenortska ostrva'}, {name:'Zelenortska ostrva', extra:'Zelenortska ostrva'},
  // Čile — gradovi
  {name:'Santiago', extra:'Čile'}, {name:'Konsepsion', extra:'Čile'}, {name:'La Serena', extra:'Čile'},
  {name:'Puerto Montt', extra:'Čile'}, {name:'Punta Arenas', extra:'Čile'}, {name:'Antofagasta', extra:'Čile'},
  {name:'Ikike', extra:'Čile'}, {name:'Arika', extra:'Čile'}, {name:'Kalama', extra:'Čile'}, {name:'Temuko', extra:'Čile'},
  // Čile — manja mesta
  {name:'Pukon', extra:'Čile'}, {name:'San Pedro de Atakama', extra:'Čile'}, {name:'Puerto Varas', extra:'Čile'},
  {name:'Viljarika', extra:'Čile'}, {name:'Čiloe', extra:'Čile'},
  // Čile — banje
  {name:'Terme Pujehue', extra:'Čile'}, {name:'Terme Čiljan', extra:'Čile'}, {name:'Terme Kolina', extra:'Čile'},
  // Čile — planine
  {name:'Vale Nevado', extra:'Čile'}, {name:'Vulkan Viljarika', extra:'Čile'}, {name:'Portiljo', extra:'Čile'},
  // Čile — reke
  {name:'Bio Bio', extra:'Čile'}, {name:'Majpo', extra:'Čile'}, {name:'Baker', extra:'Čile'},
  // Čile — jezera
  {name:'Jezero Ljankiue', extra:'Čile'}, {name:'Jezero Viljarika', extra:'Čile'}, {name:'Jezero Đeneral Karera', extra:'Čile'}, {name:'Jezero Todos los Santos', extra:'Čile'},
  // Čile — turistički centri
  {name:'Tores del Pajne', extra:'Čile'}, {name:'Uskršnje ostrvo', extra:'Čile'}, {name:'Dolina Meseca', extra:'Čile'}, {name:'Atakama pustinja', extra:'Čile'},
  // Čile — primorska mesta
  {name:'Valparaiso', extra:'Čile'}, {name:'Vinja del Mar', extra:'Čile'}, {name:'Pičilemu', extra:'Čile'},
  {name:'Karpatos', extra:'Grčka'}, {name:'Parga', extra:'Grčka'}, {name:'Sivota', extra:'Grčka'},
  {name:'Garmisch-Partenkirchen', extra:'Nemačka'}, {name:'St. Anton am Arlberg', extra:'Austrija'},
  // Dodato — poznata mesta/znamenitosti koje su falile unutar postojećih zemalja
  {name:'Hajdelberg', extra:'Nemačka'}, {name:'Potsdam', extra:'Nemačka'}, {name:'Nojšvanštajn', extra:'Nemačka'}, {name:'Rotenburg na Tauberu', extra:'Nemačka'},
  {name:'Versaj', extra:'Francuska'},
  {name:'Činkve Tere', extra:'Italija'}, {name:'Komsko jezero', extra:'Italija'},
  {name:'Grindelvald', extra:'Švajcarska'},
  {name:'Geiranger', extra:'Norveška'},
  // Norveška — fjordovi i turistički centri
  {name:'Sognefjord', extra:'Norveška'}, {name:'Hardangerfjord', extra:'Norveška'}, {name:'Nærojfjord', extra:'Norveška'},
  {name:'Preikestolen', extra:'Norveška'}, {name:'Trolltunga', extra:'Norveška'}, {name:'Nordkapp', extra:'Norveška'},
  {name:'Flom', extra:'Norveška'}, {name:'Alesund', extra:'Norveška'}, {name:'Jotunheimen', extra:'Norveška'},
  {name:'Roros', extra:'Norveška'}, {name:'Kristiansand', extra:'Norveška'}, {name:'Lillehamer', extra:'Norveška'},
  // Norveška — ski centri
  {name:'Hemsedal', extra:'Norveška'}, {name:'Geilo', extra:'Norveška'}, {name:'Trysil', extra:'Norveška'},
  {name:'Voss', extra:'Norveška'}, {name:'Kvitfjell', extra:'Norveška'},
  // Norveška — jezera i reke
  {name:'Mjøsa', extra:'Norveška'}, {name:'Femunden', extra:'Norveška'}, {name:'Randsfjorden', extra:'Norveška'},
  // Švedska — turistički centri i ostrva
  {name:'Gotland', extra:'Švedska'}, {name:'Öland', extra:'Švedska'}, {name:'Dalarna', extra:'Švedska'},
  {name:'Abisko', extra:'Švedska'}, {name:'Upsala', extra:'Švedska'}, {name:'Lund', extra:'Švedska'},
  {name:'Visby', extra:'Švedska'}, {name:'Sigtuna', extra:'Švedska'}, {name:'Kalmar', extra:'Švedska'},
  // Švedska — ski centri
  {name:'Are', extra:'Švedska'}, {name:'Salen', extra:'Švedska'}, {name:'Idre Fjall', extra:'Švedska'},
  {name:'Vemdalen', extra:'Švedska'}, {name:'Bjorkliden', extra:'Švedska'},
  // Švedska — jezera i reke
  {name:'Vänern', extra:'Švedska'}, {name:'Vättern', extra:'Švedska'}, {name:'Siljan', extra:'Švedska'},
  {name:'Storsjön', extra:'Švedska'}, {name:'Klarälven', extra:'Švedska'}, {name:'Dalälven', extra:'Švedska'},
  // Danska — turistički centri i ostrva
  {name:'Bornholm', extra:'Danska'}, {name:'Bilund', extra:'Danska'}, {name:'Skagen', extra:'Danska'},
  {name:'Roskilde', extra:'Danska'}, {name:'Helsingor', extra:'Danska'}, {name:'Ribe', extra:'Danska'},
  {name:'Odder', extra:'Danska'}, {name:'Silkeborg', extra:'Danska'}, {name:'Faroe ostrva', extra:'Danska'},
  // Danska — jezera i reke
  {name:'Gudena', extra:'Danska'}, {name:'Skanderborg jezero', extra:'Danska'}, {name:'Silkeborg jezera', extra:'Danska'},
  {name:'Maču Piču', extra:'Peru'}, {name:'Kusko', extra:'Peru'},
  // Dodato — potpuno nove zemlje/mikro-države
  {name:'Vatikan', extra:'Vatikan'}, {name:'San Marino', extra:'San Marino'}, {name:'Andora', extra:'Andora'},
  {name:'Soldeu', extra:'Andora'}, {name:'Pas de la Kasa', extra:'Andora'},
  {name:'Vaduz', extra:'Lihtenštajn'}, {name:'Torshavn', extra:'Farska ostrva'},
  {name:'Aman', extra:'Jordan'}, {name:'Petra', extra:'Jordan'}, {name:'Akaba', extra:'Jordan'},
  {name:'Bejrut', extra:'Liban'}, {name:'Muskat', extra:'Oman'},
  {name:'Kolombo', extra:'Šri Lanka'}, {name:'Katmandu', extra:'Nepal'},
  {name:'Angkor Vat', extra:'Kambodža'}, {name:'Pnom Pen', extra:'Kambodža'},
  {name:'Vindhuk', extra:'Namibija'}, {name:'Santjago', extra:'Čile'}, {name:'Kito', extra:'Ekvador'}, {name:'Galapagos ostrva', extra:'Ekvador'}, {name:'San Hoze', extra:'Kostarika'},
  // Kostarika — dopuna
  {name:'Manuel Antonio', extra:'Kostarika'}, {name:'Montverde', extra:'Kostarika'}, {name:'Arenal-La Fortuna', extra:'Kostarika'},
  {name:'Tamarindo', extra:'Kostarika'}, {name:'Liberija (Kostarika)', extra:'Kostarika'},
  // Rusija — gradovi
  {name:'Moskva', extra:'Rusija'}, {name:'Sankt Peterburg', extra:'Rusija'}, {name:'Kazanj', extra:'Rusija'},
  {name:'Jekaterinburg', extra:'Rusija'}, {name:'Novosibirsk', extra:'Rusija'}, {name:'Vladivostok', extra:'Rusija'},
  {name:'Nižnji Novgorod', extra:'Rusija'}, {name:'Samara', extra:'Rusija'}, {name:'Rostov na Donu', extra:'Rusija'},
  {name:'Ufa', extra:'Rusija'}, {name:'Krasnojarsk', extra:'Rusija'}, {name:'Irkutsk', extra:'Rusija'},
  {name:'Volgograd', extra:'Rusija'}, {name:'Perm', extra:'Rusija'}, {name:'Voronjež', extra:'Rusija'},
  {name:'Murmansk', extra:'Rusija'}, {name:'Arhangelsk', extra:'Rusija'}, {name:'Petrozavodsk', extra:'Rusija'},
  {name:'Ulan-Ude', extra:'Rusija'}, {name:'Petropavlovsk-Kamčatski', extra:'Rusija'}, {name:'Pskov', extra:'Rusija'},
  {name:'Mineralne Vode', extra:'Rusija'},
  // Rusija — manja mesta (Zlatni prsten i okolina Moskve/Sankt Peterburga)
  {name:'Suzdalj', extra:'Rusija'}, {name:'Vladimir', extra:'Rusija'}, {name:'Jaroslavlj', extra:'Rusija'},
  {name:'Kostroma', extra:'Rusija'}, {name:'Rostov Veliki', extra:'Rusija'}, {name:'Pereslavlj-Zaleski', extra:'Rusija'},
  {name:'Sergijev Posad', extra:'Rusija'}, {name:'Uglič', extra:'Rusija'}, {name:'Kolomna', extra:'Rusija'},
  {name:'Zvenigorod', extra:'Rusija'}, {name:'Tver', extra:'Rusija'}, {name:'Smolensk', extra:'Rusija'},
  {name:'Veliki Novgorod', extra:'Rusija'}, {name:'Vyborg', extra:'Rusija'}, {name:'Petergof', extra:'Rusija'},
  {name:'Puškin (Carsko Selo)', extra:'Rusija'}, {name:'Kronštat', extra:'Rusija'},
  // Rusija — planine
  {name:'Elbrus', extra:'Rusija'}, {name:'Dombaj', extra:'Rusija'}, {name:'Šeregeš', extra:'Rusija'}, {name:'Gorno-Altajsk', extra:'Rusija'},
  // Rusija — banje (Kavkaske mineralne vode)
  {name:'Pjatigorsk', extra:'Rusija'}, {name:'Kislovodsk', extra:'Rusija'}, {name:'Železnovodsk', extra:'Rusija'}, {name:'Jesentuki', extra:'Rusija'},
  // Rusija — reke
  {name:'Volga', extra:'Rusija'}, {name:'Jenisej', extra:'Rusija'}, {name:'Ob', extra:'Rusija'},
  {name:'Lena', extra:'Rusija'}, {name:'Amur', extra:'Rusija'}, {name:'Don', extra:'Rusija'}, {name:'Kama', extra:'Rusija'},
  // Rusija — jezera
  {name:'Bajkalsko jezero', extra:'Rusija'}, {name:'Ladoško jezero', extra:'Rusija'}, {name:'Onješko jezero', extra:'Rusija'}, {name:'Teletsko jezero', extra:'Rusija'},
  // Rusija — turistički centri
  {name:'Karelija', extra:'Rusija'}, {name:'Kamčatka', extra:'Rusija'}, {name:'Listvjanka', extra:'Rusija'}, {name:'Olhon ostrvo', extra:'Rusija'},
  // Rusija — primorska mesta
  {name:'Soči', extra:'Rusija'}, {name:'Anapa', extra:'Rusija'}, {name:'Gelendžik', extra:'Rusija'}, {name:'Tuapse', extra:'Rusija'},
  {name:'Kalinjingrad', extra:'Rusija'}, {name:'Svetlogorsk', extra:'Rusija'}, {name:'Zelenogradsk', extra:'Rusija'}, {name:'Kurška kosa', extra:'Rusija'},
  // Ukrajina
  {name:'Kijev', extra:'Ukrajina'}, {name:'Lavov', extra:'Ukrajina'}, {name:'Odesa', extra:'Ukrajina'}, {name:'Harkov', extra:'Ukrajina'},
  // Belorusija
  {name:'Minsk', extra:'Belorusija'}, {name:'Brest (Belorusija)', extra:'Belorusija'},
  // Moldavija
  {name:'Kišinjev', extra:'Moldavija'},
  // Jermenija
  {name:'Jerevan', extra:'Jermenija'}, {name:'Jezero Sevan', extra:'Jermenija'},
  // Kazahstan
  {name:'Almati', extra:'Kazahstan'}, {name:'Astana', extra:'Kazahstan'},
  // Uzbekistan
  {name:'Taškent', extra:'Uzbekistan'}, {name:'Samarkand', extra:'Uzbekistan'}, {name:'Buhara', extra:'Uzbekistan'},
  // Kirgistan
  {name:'Biškek', extra:'Kirgistan'}, {name:'Jezero Isik-kulj', extra:'Kirgistan'},
  // Mongolija
  {name:'Ulan Bator', extra:'Mongolija'},
  // Pakistan
  {name:'Islamabad', extra:'Pakistan'}, {name:'Lahore', extra:'Pakistan'}, {name:'Karači', extra:'Pakistan'},
  // Bangladeš
  {name:'Daka', extra:'Bangladeš'},
  // Mijanmar
  {name:'Jangon', extra:'Mijanmar'}, {name:'Bagan', extra:'Mijanmar'},
  // Laos
  {name:'Vijentijan', extra:'Laos'}, {name:'Luang Prabang', extra:'Laos'},
  // Butan
  {name:'Timpu', extra:'Butan'},
  // Fidži
  {name:'Nadi', extra:'Fidži'}, {name:'Suva', extra:'Fidži'},
  // Samoa
  {name:'Apija', extra:'Samoa'},
  // Papua Nova Gvineja
  {name:'Port Morsbi', extra:'Papua Nova Gvineja'},
  // Grenland
  {name:'Nuk', extra:'Grenland'},
  // Urugvaj
  {name:'Montevideo', extra:'Urugvaj'}, {name:'Punta del Este', extra:'Urugvaj'},
  // Bolivija
  {name:'La Paz', extra:'Bolivija'}, {name:'Salar de Ujuni', extra:'Bolivija'}, {name:'Sukre', extra:'Bolivija'},
  // Paragvaj
  {name:'Asunsion', extra:'Paragvaj'},
  // Venecuela
  {name:'Karakas', extra:'Venecuela'}, {name:'Angelski slap', extra:'Venecuela'},
  // Panama
  {name:'Panama Siti', extra:'Panama'}, {name:'Bokas del Toro', extra:'Panama'}, {name:'San Blas ostrva', extra:'Panama'},
  // Gvatemala
  {name:'Gvatemala Siti', extra:'Gvatemala'}, {name:'Antigva Gvatemala', extra:'Gvatemala'}, {name:'Tikal', extra:'Gvatemala'},
  // Belize
  {name:'Belize Siti', extra:'Belize'},
  // Honduras
  {name:'Roatan', extra:'Honduras'},
  // Jamajka
  {name:'Kingston', extra:'Jamajka'}, {name:'Montego Bej', extra:'Jamajka'}, {name:'Negril', extra:'Jamajka'}, {name:'Očo Rios', extra:'Jamajka'},
  // Bahami
  {name:'Nasau', extra:'Bahami'},
  // Barbados
  {name:'Bridžtaun', extra:'Barbados'},
  // Portoriko
  {name:'San Huan', extra:'Portoriko'},
  // Gana
  {name:'Akra', extra:'Gana'},
  // Nigerija
  {name:'Lagos (Nigerija)', extra:'Nigerija'}, {name:'Abudža', extra:'Nigerija'},
  // Etiopija
  {name:'Adis Abeba', extra:'Etiopija'},
  // Uganda
  {name:'Kampala', extra:'Uganda'},
  // Ruanda
  {name:'Kigali', extra:'Ruanda'},
  // Bocvana
  {name:'Gaboron', extra:'Bocvana'}, {name:'Delta Okavango', extra:'Bocvana'},
  // Zambija
  {name:'Livingston', extra:'Zambija'}, {name:'Vodopadi Viktorija', extra:'Zambija'},
  // Zimbabve
  {name:'Harare', extra:'Zimbabve'},
  // Mozambik
  {name:'Maputo', extra:'Mozambik'},
  // Alžir
  {name:'Alžir (grad)', extra:'Alžir'},
  // Bahrein
  {name:'Manama', extra:'Bahrein'},
  // Kuvajt
  {name:'Kuvajt Siti', extra:'Kuvajt'},
];
// Uklanja srpske kvačice (č/ć/š/ž/đ) i standardne akcente, radi poređenja bez
// obzira da li korisnik kuca sa ili bez njih (npr. "Kotor" vs "Beč"/"Bec").
function normalizeSr(str){
  return String(str)
    .replace(/đ/g, 'dj').replace(/Đ/g, 'Dj')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
function matchPopularDestinations(query){
  const q = normalizeSr(query);
  const scored = POPULAR_DESTINATIONS.map(d => {
    const name = normalizeSr(d.name);
    const extra = normalizeSr(d.extra || '');
    let score;
    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (name.includes(q)) score = 2;
    else if (extra.startsWith(q)) score = 3;
    else if (extra.includes(q)) score = 4;
    else score = null;
    return {d, score};
  }).filter(x => x.score !== null);
  scored.sort((a, b) => a.score - b.score);
  return scored.map(x => x.d);
}

/* ---- Provera važenja pasoša za odabranu destinaciju ----
   Srpski biometrijski pasoš je bezvizan za Šengen zonu (90 dana u periodu
   od 180 dana), pa "da li mi treba viza" nije stvarni problem za većinu
   traženih destinacija. Pravi, dokumentovan problem je KOLIKO DUGO pasoš
   mora da važi nakon (ili za Tursku: od) putovanja — turisti bivaju vraćeni
   sa granice ili čekiranja zbog ovoga, iako je sam datum putovanja u redu. */
const SCHENGEN_COUNTRIES = new Set([
  'Austrija','Belgija','Hrvatska','Češka','Danska','Estonija','Finska','Francuska',
  'Nemačka','Grčka','Mađarska','Italija','Letonija','Litvanija','Luksemburg','Malta',
  'Holandija','Poljska','Portugalija','Slovačka','Slovenija','Španija','Švedska',
  'Island','Lihtenštajn','Norveška','Švajcarska'
]);
/* Zemlje van Šengena za koje je državljanima Srbije i dalje potrebna PRAVA VIZA
   (ne samo pasoš) — ovo je veći problem od važenja pasoša jer traži prijavu,
   dokumenta i nedelje čekanja, pa se ističe posebno, pre pravila o pasošu. */
const VISA_REQUIRED_NOTES = {
  'Velika Britanija':'Državljanima Srbije je potrebna prava viza za Veliku Britaniju (uključujući London i tranzit bez izlaska iz aerodroma) — ovo nije samo provera pasoša. Standardna turistička viza obično se obrađuje oko 3 nedelje, pa prijavu treba podneti mnogo pre kupovine nepovratnih karata.',
  'Irska':'Državljanima Srbije je potrebna prava viza za Irsku — stara pogodnost putovanja preko britanske vize je ukinuta 2020. i nije vraćena. Prijavu za vizu treba podneti mnogo pre kupovine nepovratnih karata.',
  'SAD':'Državljanima Srbije je potrebna prava viza za SAD (obično turistička B1/B2) — ovo nije samo provera pasoša. Traži se obavezan intervju u ambasadi u Beogradu, taksa oko 185 USD, a na termin se čeka od par nedelja do više meseci u zavisnosti od perioda. Prijavu treba podneti mnogo pre kupovine nepovratnih karata.',
  'Kanada':'Državljanima Srbije je potrebna prava viza za Kanadu (Kanada nema eTA olakšicu za srpski pasoš) — ovo nije samo provera pasoša. Obrada uključuje biometriju i obično traje oko 2-4 nedelje, pa prijavu treba podneti mnogo pre kupovine nepovratnih karata.'
};
/* Regionalne destinacije za koje državljanima Srbije pasoš UOPŠTE nije
   potreban — ulazi se samo sa važećom biometrijskom ličnom kartom (do 90
   dana boravka u periodu od 6 meseci), na osnovu regionalnog sporazuma o
   tzv. "mini Šengenu" (Srbija–Severna Makedonija–Albanija od 2020/2021,
   Crna Gora i BiH imaju istovetnu praksu sa ličnom kartom). Ako se ovo ne
   prepozna, korisnik dobija generičko "verovatno 6 meseci" upozorenje koje
   je i pogrešno i nepotrebno zabrinjavajuće za ove destinacije. */
const REGIONAL_ID_CARD_COUNTRIES = new Set([
  'Crna Gora', 'Bosna i Hercegovina', 'Severna Makedonija', 'Albanija'
]);
function getPassportRule(country, destVal){
  const c = (country || '').trim();
  const fallbackName = (destVal || '').trim();
  const visaNote = VISA_REQUIRED_NOTES[c] || null;
  let base;
  if (REGIONAL_ID_CARD_COUNTRIES.has(c)){
    base = {basis:'none', months:null, days:null, label:c, confident:true, noPassportNeeded:true,
      why:'Za ' + c + ' pasoš ti uopšte nije potreban — državljani Srbije ulaze samo sa važećom biometrijskom ličnom kartom (do 90 dana boravka u periodu od 6 meseci), na osnovu regionalnog sporazuma o slobodnom kretanju.'};
  } else if (SCHENGEN_COUNTRIES.has(c)){
    base = {basis:'to', months:3, days:null, label:c || 'Šengen zona', confident:true,
      why:'Za Šengen zonu pasoš mora da važi još najmanje 3 meseca nakon planiranog datuma povratka.'};
  } else if (c === 'Turska'){
    base = {basis:'from', months:null, days:150, label:'Turska', confident:true,
      why:'Za Tursku pasoš mora da važi još najmanje 150 dana (cca 5 meseci) od datuma ulaska u zemlju.'};
  } else if (c === 'Egipat' || c === 'Tunis'){
    base = {basis:'to', months:6, days:null, label:c, confident:true,
      why:'Za ' + c + ' pasoš mora da važi još najmanje 6 meseci nakon planiranog datuma povratka.'};
  } else if (c === 'Kina'){
    base = {basis:'to', months:6, days:null, label:'Kina', confident:true,
      why:'Za Kinu državljanima Srbije nije potrebna viza za turistički boravak do 30 dana, ali pasoš mora da važi još najmanje 6 meseci nakon planiranog datuma povratka. (Hongkong i Makao imaju poseban, još slobodniji režim.)'};
  } else {
    const shownName = c || fallbackName || 'ova destinacija';
    const genericWhy = c
      ? 'Nemamo potvrđeno pravilo za zemlju „' + c + '“ — mnoge zemlje van Šengena traže važenje pasoša još 6 meseci nakon povratka, ali ovo obavezno proveri kod ambasade/aviokompanije jer se pravilo razlikuje po zemlji.'
      : 'Ne znamo tačnu zemlju za „' + shownName + '“, pa nemamo potvrđeno pravilo — mnoge zemlje van Šengena traže važenje pasoša još 6 meseci nakon povratka, ali ovo obavezno proveri kod ambasade/aviokompanije jer se pravilo razlikuje po zemlji.';
    base = {basis:'to', months:6, days:null, label:shownName, confident: !!visaNote,
      why: visaNote
        ? 'Uz vizu, pasoš uglavnom mora da važi još najmanje 6 meseci nakon planiranog datuma povratka — konkretan rok proverava ambasada prilikom obrade vize.'
        : genericWhy};
  }
  base.visaNote = visaNote;
  return base;
}
/* ---- Provera da li je za vožnju automobilom (sopstvenim ili u Srbiji
   iznajmljenim) do odabrane destinacije potrebna "zelena karta" —
   međunarodna potvrda auto-osiguranja.
   Srbija je od 2012. članica Multilateralnog garantnog sporazuma Sistema
   zelene karte, pa karton NIJE potreban za vožnju u zemlje EU/Šengena,
   Švajcarsku, Lihtenštajn, Norvešku, Island i Andoru (SCHENGEN_COUNTRIES
   gore), kao ni za Crnu Goru (bilateralni sporazum sa Udruženjem
   osiguravača Srbije) i Bosnu i Hercegovinu (BiH pristupila sporazumu
   19.10.2020, ranije bio potreban). I DALJE je obavezna za Severnu
   Makedoniju (nije potpisnica) i za zemlje van kruga zelene karte
   (Rusija, Belorusija, Ukrajina, Moldavija, Turska, Izrael, Iran,
   Albanija, Tunis, Maroko). Izvor: Udruženje osiguravača Srbije / AMSS. */
const GREEN_CARD_NOT_NEEDED = new Set([
  ...SCHENGEN_COUNTRIES,
  'Crna Gora', 'Bosna i Hercegovina'
]);
const GREEN_CARD_NEEDED_NOTES = {
  'Severna Makedonija':'Za Severnu Makedoniju je zelena karta i dalje obavezna — nije potpisnica Multilateralnog sporazuma sa Srbijom.',
  'Turska':'Za Tursku je zelena karta obavezna.',
  'Albanija':'Za Albaniju je zelena karta obavezna.',
  'Rusija':'Za Rusiju je zelena karta obavezna.',
  'Belorusija':'Za Belorusiju je zelena karta obavezna.',
  'Ukrajina':'Za Ukrajinu je zelena karta obavezna.',
  'Moldavija':'Za Moldaviju je zelena karta obavezna.',
  'Izrael':'Za Izrael je zelena karta obavezna.',
  'Iran':'Za Iran je zelena karta obavezna.',
  'Maroko':'Za Maroko je zelena karta obavezna.',
  'Tunis':'Za Tunis je zelena karta obavezna.'
};
function getGreenCardRule(country){
  const c = (country || '').trim();
  if (!c){
    return {status:'unknown', label:'', confident:false,
      why:'Ne znamo tačnu zemlju za unetu destinaciju, pa ne možemo da proverimo pravilo o zelenoj karti.'};
  }
  if (GREEN_CARD_NOT_NEEDED.has(c)){
    return {status:'ok', label:c, confident:true,
      why:'Za ' + c + ' zelena karta NIJE potrebna za vozila registrovana u Srbiji — registarska tablica je dovoljan dokaz osiguranja.'};
  }
  if (GREEN_CARD_NEEDED_NOTES[c]){
    return {status:'needed', label:c, confident:true, why: GREEN_CARD_NEEDED_NOTES[c]};
  }
  return {status:'unknown', label:c, confident:false,
    why:'Nemamo potvrđeno pravilo za „' + c + '“ — proveri kod svog osiguravača da li ti treba zelena karta pre polaska.'};
}
/* ---------- "Da li si sve pokrio?" — putni checklist ----------
   Sabira već postojeća pravila (pasoš, viza, zelena karta) u jedan
   vizuelni indikator koji se prikazuje UZ rezultate/paket, umesto da
   ostane skriven dok korisnik sam ne otvori documentsModal. Ovo je
   svesno konzervativno: ne izmišlja nova pravila, samo prikazuje ono
   što getPassportRule/getGreenCardRule već znaju, plus generičku
   stavku za putno osiguranje koja uvek ostaje "za proveriti" jer
   nemamo podatke o polisama. */
function travelChecklistHtml(country, includeCar){
  const items = [];
  const p = getPassportRule(country, country);
  items.push({
    ok: !!p.confident,
    icon: p.confident ? '✅' : '◻️',
    title: 'Pasoš',
    text: p.why
  });
  if (p.visaNote){
    items.push({ok:false, icon:'⚠️', title:'Viza', text:p.visaNote});
  } else if (country){
    items.push({ok:true, icon:'✅', title:'Viza',
      text:'Nije potrebna viza za ' + country + ' — proveri ipak tik pred put ako se pravila u međuvremenu promene.'});
  }
  if (includeCar){
    const g = getGreenCardRule(country);
    items.push({
      ok: g.status === 'ok',
      icon: g.status === 'ok' ? '✅' : (g.status === 'needed' ? '⚠️' : '◻️'),
      title: 'Zelena karta',
      text: g.why
    });
  }
  items.push({
    ok:false, icon:'◻️', title:'Putno osiguranje',
    text:'Preporučeno za svaki put van zemlje — proveri ponudu World Nomads ili sličnog partnera pre polaska.'
  });
  const doneCount = items.filter(i => i.ok).length;
  const rows = items.map(i =>
    `<li class="tc-item ${i.ok ? 'tc-ok' : 'tc-todo'}"><span class="tc-ic">${i.icon}</span><div><b>${escapeHtml(i.title)}</b><p>${escapeHtml(i.text)}</p></div></li>`
  ).join('');
  return `<div class="travel-checklist">
    <div class="tc-head"><span class="tc-title">🧳 Da li si sve pokrio?</span><span class="tc-score">${doneCount}/${items.length}</span></div>
    <ul class="tc-list">${rows}</ul>
  </div>`;
}
function resolveCountryForDestination(destValue){
  if (!destValue || !destValue.trim()) return '';
  const matches = matchPopularDestinations(destValue);
  return matches.length ? (matches[0].extra || '') : '';
}
function resolveCanonicalDestName(destValue){
  if (!destValue || !destValue.trim()) return '';
  const matches = matchPopularDestinations(destValue);
  return matches.length ? matches[0].name : '';
}
function addMonthsToDate(date, months){
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
function addDaysToDate(date, days){
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
/* Napomena „Pravila ažurirana: …“ ispod pasoš/zelena karta pravila. Datum dolazi iz
   config.js (SKLOPI_TRAVEL_RULES_UPDATED); ako ga nema ili nije validan, ne prikazuje se ništa. */
function travelRulesUpdatedHtml(){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(window.SKLOPI_TRAVEL_RULES_UPDATED || '');
  if (!m) return '';
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  if (isNaN(d)) return '';
  return '<p class="travel-updated">Pravila ažurirana: <time datetime="' + m[0] + '">' + fmtDateSr(d)
    + '</time> Uslovi ulaska se menjaju — proveri kod ambasade ili MUP-a pre puta.</p>';
}
function fmtDateSr(d){
  return d.getDate() + '. ' + d.toLocaleString('sr-Latn', {month:'long'}) + ' ' + d.getFullYear() + '.';
}

