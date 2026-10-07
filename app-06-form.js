/* app-06-form.js — deo nekadašnjeg app.js (deo 6/11): Forma, "Napravi svoj aranžman", stanje forme.
   Klasična skripta: deli globalni opseg sa ostalim app-*.js fajlovima; redosled učitavanja u index.html je bitan. */
/* ==========================================================
   FORM WIRING
========================================================== */
/* ---- "Polazak" (poreklo/origin) polje je sada TRAJNO vidljivo, bez
   obzira na "Letovi" toggle — korisnik može uneti polazište i kad
   avion nije označen. Required atribut i dalje prati "Letovi" toggle,
   jer je polazište obavezno samo kad se stvarno traži let (vidi i
   validateSearchInputs ispod), dok za hotel/auto/aktivnosti ostaje
   opciono. ---- */
function updateOriginVisibility(showOrigin){
  const originInput = document.getElementById('origin');
  if (!originInput) return;
  if (showOrigin) originInput.setAttribute('required', 'required');
  else originInput.removeAttribute('required');
}

document.querySelectorAll('.toggle').forEach(t=>{
  t.addEventListener('click', (e)=>{
    e.preventDefault();
    const input = t.querySelector('input');
    input.checked = !input.checked;
    t.classList.toggle('on', input.checked);
    if (t.dataset.t === 'flight'){
      updateOriginVisibility(input.checked);
      renderOriginAirportWarning(document.getElementById('origin').value);
      renderDestAirportWarning(document.getElementById('dest').value);
    }
    // BAG: "3 plana" i "Tvoj personalizovani plan" su se osvežavali SAMO na
    // promenu Polaska/datuma/putnika (vidi njihove 'origin'/'dateFrom'/
    // 'dateTo'/'adults' listenere), ne i na Letovi/Smeštaj/R a C/Aktivnost —
    // pa je npr. markiranje sva 4 toggle-a i dalje prikazivalo kartice
    // izračunate za STARO (podrazumevano: samo Smeštaj) stanje, dok
    // korisnik posle toga ne bi dirnuo neko od tih ostalih polja. Ovaj
    // event javlja svima koji zavise od izbora usluga da se osveže odmah.
    document.dispatchEvent(new Event('sklopi:services-changed'));
  });
});

// Postavi početno stanje u skladu sa checkbox-om koji je već markiran u HTML-u
// (trenutno "Letovi" nije uključen po default-u, pa se polje krije od starta).
updateOriginVisibility(document.querySelector('.toggle[data-t="flight"] input').checked);

function localTodayStr(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
/* Provera unosa PRE pokretanja pretrage — umesto tihih zamena (prazna
   destinacija → "Atina") i NaN cena (neispravni datumi). Vraća
   {ok:true} ili {ok:false, msg, focus}. `extra` dozvoljava pozivaocu da
   javi uključivanje auta/aktivnosti koje još nije primenjeno na toggle-ove
   (modal "Prilagodi svoj plan" ih tek postavlja); `checkPast` se traži samo
   za NOVU pretragu — ne i za učitavanje sačuvanog izleta sa starim datumima. */
function validateSearchInputs(extra){
  extra = extra || {};
  const dest = document.getElementById('dest').value.trim();
  const origin = document.getElementById('origin').value.trim();
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  const on = k => { const el = document.querySelector('.toggle[data-t="' + k + '"]'); return !!(el && el.classList.contains('on')); };
  const flight = on('flight'), hotel = on('hotel');
  const car = on('car') || !!extra.car, activity = on('activity') || !!extra.activity;
  const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !isNaN(new Date(v));
  // #dateFrom/#dateTo se PUNE default vrednošću (danas+14 dana) čim se
  // stranica učita — to je samo početna pozicija kalendara, ne stvarni
  // izbor korisnika. Zato datumi ovde NISU validni dok ih korisnik ne
  // potvrdi (dugme "Gotovo" u kalendaru skida "is-empty" — vidi updateDisplay
  // u IIFE-u iznad); bez ove provere je moguće poslati pretragu i dobiti
  // ceo paket a da datumi nikad nisu ni otvoreni, kamoli izabrani.
  const datesConfirmed = !document.getElementById('dateDisplayBtn')?.classList.contains('is-empty');
  const paxConfirmed = !document.getElementById('paxDisplayBtn')?.classList.contains('is-empty');
  if (!dest) return {ok:false, focus:'dest', msg:t('val_dest_missing')};
  if (placeStatus(dest) === false) return {ok:false, focus:'dest', msg:tf('val_dest_unknown', {name: placeBaseName(dest)})};
  if (origin && flight && placeStatus(origin) === false) return {ok:false, focus:'origin', msg:tf('val_origin_unknown', {name: placeBaseName(origin)})};
  if (flight && !origin) return {ok:false, focus:'origin', msg:t('val_origin_missing')};
  if (!datesConfirmed || !isDate(from) || !isDate(to)) return {ok:false, focus:'form', msg:t('val_dates_missing')};
  if (to <= from) return {ok:false, focus:'form', msg:t('val_return_before_departure')};
  if (extra.checkPast && from < localTodayStr()) return {ok:false, focus:'form', msg:t('val_departure_in_past')};
  if (!paxConfirmed) return {ok:false, focus:'form', msg:t('val_passengers_missing')};
  if (!(flight || hotel || car || activity)) return {ok:false, focus:'form', msg:t('val_no_service')};
  return {ok:true};
}
/* ==========================================================
   POLJA "Destinacija" i "Polazak": dozvoljeni znaci + provera da mesto postoji.
   1) Pri kucanju/lepljenju se zadržavaju samo slova (svi alfabeti), razmak, crtica, apostrof, tačka i zarez
      — brojevi i simboli nestaju odmah; maksimalno 60 znakova.
   2) Pretraga se ne pokreće dok mesto nije potvrđeno: prvo lokalna lista (aerodromi, popularne destinacije),
      pa geokoder (isti Open-Meteo koji pravi predloge). Izmišljen ili pogrešno ukucan naziv se odbija uz
      predlog "Misliš li na ...?". Ako mreža nije dostupna, NE blokiramo (ne kažnjavamo korisnika zbog servisa).
========================================================== */
const PLACE_ALLOWED_RE = /[^\p{L}\p{M}\s'\u2019.,\-]/gu;
function sanitizePlaceText(v){
  return String(v || '').replace(PLACE_ALLOWED_RE, '').replace(/\s{2,}/g, ' ').replace(/^[\s.,\-'\u2019]+/, '').slice(0, 60);
}
const _CYR = {'а':'a','б':'b','в':'v','г':'g','д':'d','ђ':'dj','е':'e','ж':'z','з':'z','и':'i','ј':'j','к':'k','л':'l','љ':'lj','м':'m','н':'n','њ':'nj','о':'o','п':'p','р':'r','с':'s','т':'t','ћ':'c','у':'u','ф':'f','х':'h','ц':'c','ч':'c','џ':'dz','ш':'s','ё':'e','й':'j','ы':'i','э':'e','ю':'ju','я':'ja','щ':'s','ъ':'','ь':''};
function placeNorm(s){
  const base = String(s || '').toLowerCase().replace(/[а-яёђјљњћџ]/g, c => _CYR[c] != null ? _CYR[c] : c);
  return normalizeSr(base).replace(/[^a-z0-9]+/g, ' ').trim();
}
function placeBaseName(raw){ return sanitizePlaceText(raw).split(',')[0].trim(); }

const _placeVerifyCache = Object.create(null);    // norm → true | false (samo pouzdani odgovori)
const _placeSuggest = Object.create(null);  // norm → predlog ispravnog naziva
let _placeLocalSet = null;
function placeKnownLocally(raw){
  const q = placeNorm(raw);
  if (!q) return false;
  if (!_placeLocalSet){
    _placeLocalSet = new Set();
    const add = n => { const k = placeNorm(n); if (k) _placeLocalSet.add(k); };
    try { Object.keys(AIRPORT_DB).forEach(add); } catch(e){}
    try { POPULAR_DESTINATIONS.forEach(d => add(d.name)); } catch(e){}
    try { MATCH_DESTINATIONS.forEach(d => add(d.name)); } catch(e){}
    try { Object.keys(DEST_EN_NAMES).forEach(k => { add(k); add(String(DEST_EN_NAMES[k]).split(',')[0]); }); } catch(e){}
  }
  return _placeLocalSet.has(q);
}
function placeStatus(raw){                    // true / false / undefined (još nije provereno)
  const name = placeBaseName(raw), q = placeNorm(name);
  if (q.length < 2) return undefined;
  if (placeKnownLocally(name)) return true;
  return _placeVerifyCache[q];
}
function placeSuggestion(raw){ return _placeSuggest[placeNorm(placeBaseName(raw))] || ''; }

// Tolerantno poređenje naziva: geokoder često vrati drugačije pisanje (Hurgada/Hurghada, Sarm el Sejk/Sharm el-Sheikh...)
function placeLev(a, b){
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  let prev = Array.from({length: n + 1}, (_, j) => j);
  for (let i = 1; i <= m; i++){
    const cur = [i];
    for (let j = 1; j <= n; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
function placeClose(rn, q){
  if (q.length < 3) return false;
  if (rn.startsWith(q) || q.startsWith(rn)) return true;               // "Kotor" ~ "Kotor Varos"
  const flat = s => s.replace(/\s+/g, '');
  const a = flat(rn), b = flat(q);
  const tol = b.length >= 9 ? 3 : b.length >= 5 ? 2 : 1;
  return placeLev(a, b) <= tol;
}

async function verifyPlace(raw){              // true / false / null (nije moguće proveriti)
  const name = placeBaseName(raw), q = placeNorm(name);
  if (q.length < 2) return false;
  const known = placeStatus(name);
  if (known !== undefined) return known;
  const nonLatin = /[^\u0000-\u024F\s'\u2019.\-]/.test(name);
  let reached = false, ok = false, sug = '';
  const eat = (list) => {
    for (const r of list){
      const rn = placeNorm(r && r.name);
      if (rn && (rn === q || placeClose(rn, q))) ok = true;   // tačno ili vrlo blizu (drugačije pisanje, prefiks, 1-2 slova razlike)
      else if (!sug && r && r.name) sug = r.name;
    }
    if (nonLatin && list.length) ok = true;   // ćirilica/ruski: poređenje po slovima nije pouzdano → dovoljan je pogodak
  };
  const jobs = ['sr', 'en', null].map(async lang => {
    try {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 3500);
      const res = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(name)
        + '&count=10' + (lang ? '&language=' + lang : '') + '&format=json', {signal: ctl.signal});
      clearTimeout(to);
      if (!res.ok) return;
      reached = true;
      const data = await res.json();
      eat(data.results || []);
    } catch(e){}
  });
  if (typeof API_BASE !== 'undefined' && API_BASE){
    jobs.push((async () => {
      try {
        const res = await fetch(API_BASE + '/api/locations?q=' + encodeURIComponent(name));
        if (!res.ok) return;
        reached = true;
        const json = await res.json();
        eat((json.results || []).map(r => ({name: r.cityName})));
      } catch(e){}
    })());
  }
  await Promise.all(jobs);
  if (ok){ _placeVerifyCache[q] = true; return true; }
  if (!reached) return null;
  _placeVerifyCache[q] = false;
  if (sug) _placeSuggest[q] = sug;
  return false;
}
window.SKLOPI_verifyPlace = verifyPlace;
window.SKLOPI_placeStatus = placeStatus;
window.SKLOPI_placeSuggestion = placeSuggestion;

// Provera oba polja pre pretrage. {ok:true} ili {ok:false, msg, focus}
async function verifyFormPlaces(){
  const dest = (document.getElementById('dest') || {}).value || '';
  const origin = (document.getElementById('origin') || {}).value || '';
  if (dest.trim() && (await verifyPlace(dest)) === false)
    return {ok:false, focus:'dest', msg:tf('val_dest_unknown', {name: placeBaseName(dest)})};
  if (origin.trim() && (await verifyPlace(origin)) === false)
    return {ok:false, focus:'origin', msg:tf('val_origin_unknown', {name: placeBaseName(origin)})};
  return {ok:true};
}
function openPlaceSuggestions(which){
  const id = which === 'origin' ? 'origin' : 'dest', list = id === 'origin' ? 'originSuggestions' : 'destSuggestions';
  const el = document.getElementById(id);
  if (el && typeof fetchLocationSuggestions === 'function'){
    const sug = placeSuggestion(el.value);
    fetchLocationSuggestions(sug || placeBaseName(el.value), list);
  }
}

(function installPlaceGuards(){
  ['dest', 'origin'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute('maxlength', '60');
    // capture: radi PRE ostalih 'input' slušalaca (predlozi, spotlight), pa oni vide već očišćen tekst
    el.addEventListener('input', () => {
      const before = el.value, clean = sanitizePlaceText(before);
      if (clean !== before){
        const pos = el.selectionStart, shift = before.length - clean.length;
        el.value = clean;
        try { const p = Math.max(0, (pos == null ? clean.length : pos) - shift); el.setSelectionRange(p, p); } catch(e){}
      }
    }, true);
    // tiha provera u pozadini — da keš bude spreman kad korisnik stigne do dugmeta
    let timer = null;
    const quiet = () => { clearTimeout(timer); timer = setTimeout(() => { if (el.value.trim().length >= 3) verifyPlace(el.value); }, 700); };
    el.addEventListener('input', quiet);
    el.addEventListener('change', () => { if (el.value.trim()) verifyPlace(el.value); });
  });
})();

function focusSearchField(which){
  const el = which === 'dest' || which === 'origin' ? document.getElementById(which) : null;
  const form = document.getElementById('searchForm');
  if (form) form.scrollIntoView({behavior:'smooth', block:'center'});
  if (el) setTimeout(() => el.focus({preventScroll:true}), 250);
}

async function runSearch(shouldScroll, autoReveal){
  const placeCheck = await verifyFormPlaces();   // izmišljen/nepostojeći naziv mesta se ne pretražuje
  if (!placeCheck.ok){ showToast(placeCheck.msg); focusSearchField(placeCheck.focus); openPlaceSuggestions(placeCheck.focus); return; }
  const check = validateSearchInputs();
  if (!check.ok){ showToast(check.msg); focusSearchField(check.focus); return; }
  const dest = document.getElementById('dest').value.trim();
  const originCode = document.getElementById('origin').value.trim();
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  // Ranije se nights/days ovde NIKAD nisu definisali, pa je poziv u
  // setTimeout-u ispod bacao ReferenceError i skeleton ostajao zauvek.
  const nights = nightsBetween(from, to);
  const days = nights;
  const adults = String(Math.min(9, Math.max(1, Number(document.getElementById('adults').value) || 2)));
  const seq = window._searchSeq = (window._searchSeq || 0) + 1; // samo poslednja pretraga sme da iscrta rezultate
  const flags = {
    flight:    document.querySelector('.toggle[data-t="flight"]').classList.contains('on'),
    hotel:     document.querySelector('.toggle[data-t="hotel"]').classList.contains('on'),
    car:       document.querySelector('.toggle[data-t="car"]').classList.contains('on'),
    activity:  document.querySelector('.toggle[data-t="activity"]').classList.contains('on'),
    // Detaljne preference iz upitnika (builderState) — da tri ponuđene
    // kartice (Best/Comfort/Budget) STVARNO traže ono što je korisnik
    // izabrao (tip leta, zvezdice hotela, tip auta, broj aktivnosti), a
    // ne generišu nasumičan sadržaj po tier-u nezavisno od tih izbora.
    // Tier i dalje menja cenu/kvalitet detalja (npr. koji je hotel u istoj
    // kategoriji zvezdica), ali ne i samu kategoriju koju je korisnik tražio.
    flightPref: builderState.flightPref,
    airlineName: builderState.airlineName,
    hotelStars: builderState.hotelStars,
    prioritizeRating: builderState.prioritizeRating,
    prioritizeLocation: builderState.prioritizeLocation,
    carPref: builderState.carPref !== 'none' ? builderState.carPref : 'small',
    activityCount: builderState.activityCount > 0 ? builderState.activityCount : 1,
  };

  const results = document.getElementById('results');
  openResultsSheet();
  document.getElementById('resultsHead').innerHTML = '';
  const rb = document.getElementById('resultsBody');
  rb.innerHTML = skeletonResultsHtml('Pripremamo tvoj plan…');
  rb.classList.remove('rb-hidden');
  rb.classList.add('rb-reveal');
  if (shouldScroll && !isMobileResults()) results.scrollIntoView({behavior:'smooth', block:'start'});

  bumpSearchStat(dest);
  logAirportDbMiss(originCode, 'origin');
  logAirportDbMiss(dest, 'dest');

  setTimeout(()=>{
    if (seq !== window._searchSeq) return; // u međuvremenu pokrenuta novija pretraga
    renderResults(dest, from, to, nights, days, adults, flags, originCode, autoReveal, seq);
  }, 700);
}

document.getElementById('searchForm').addEventListener('submit', async function(e){
  e.preventDefault();
  // Kreni: provera da mesto postoji + validacija, pa ODMAH 3 plana za destinaciju (bez dodatnog klika
  // na spotlight). Polazak/datumi/putnici dolaze iz podrazumevanih vrednosti (vidi app-12), a korisnik ih
  // menja u redu "Polazak · datumi · putnici → Promeni".
  const placeCheck = await verifyFormPlaces();
  if (!placeCheck.ok){ showToast(placeCheck.msg); focusSearchField(placeCheck.focus); openPlaceSuggestions(placeCheck.focus); return; }
  const check = validateSearchInputs();
  if (!check.ok){ showToast(check.msg); focusSearchField(check.focus); return; }
  const destVal = document.getElementById('dest').value.trim();
  trackFunnelEvent('search_submit', { destination: destVal || 'Atina' });
  try { bumpSearchStat(destVal); } catch(err){}
  // Kreni vodi direktno na stranicu destinacije (destinacija.html): letovi, smeštaj, atrakcije,
  // rent a car i ostalo za iste datume, bez međukoraka sa 3 plana na glavnoj stranici.
  const originVal = (document.getElementById('origin').value || '').trim() || 'Beograd';
  const adultsVal = Number(document.getElementById('adults').value) || 2;
  const destUrl = 'destinacija.html?' + new URLSearchParams({
    od: originVal,
    do: destVal || 'Atina',
    polazak: document.getElementById('dateFrom').value,
    povratak: document.getElementById('dateTo').value,
    putnika: String(adultsVal)
  }).toString();
  window.location.href = destUrl;
});

/* ==========================================================
   BUILD-YOUR-OWN ("Napravi svoj aranžman")
========================================================== */
// Jedini izvor default vrednosti — čuvamo posebno od builderState (koji se
// mutira tokom rada) da bismo mogli da RESETUJEMO na siguran default pre
// učitavanja sačuvanog aranžmana (vidi loadSavedTrip). Bez ovog reseta,
// polje koje nedostaje u starom sačuvanom zapisu (npr. jer je dodato tek
// kasnije u builderState) ne bi dobilo fallback — ostalo bi kakvo je bilo
// pre poziva (stanje iz prethodno učitanog aranžmana ili undefined), što bi
// computeCustomPackage moglo da pretvori u NaN cene.
const BUILDER_ADDON_RATES = { insurance: 18, esim: 9, putarina: 18, transferi: 25, touristTax: 2 }; // insurance/esim/transferi po osobi, putarina paušalno, touristTax po osobi po noći
const BUILDER_DEFAULTS = {
  includeFlight: true,
  flightPref: 'direct',
  airlineName: '',
  includeHotel: true,
  hotelStars: 4,
  prioritizeRating: false,
  prioritizeLocation: false,
  carPref: 'none',
  activityCount: 0,
  insurance: false,
  esim: false,
  putarina: false,
  transferi: false,
  touristTax: true, // Boravišna taksa NIJE opcioni popust — realan trošak koji se stvarno plaća
                     // u hotelu, zato je uključena po difoltu (korisnik i dalje može da je isključi).
  budget: null
};
const builderState = Object.assign({}, BUILDER_DEFAULTS);

// Originalno mesto kartice "Tvoj izlet" (#builderSummary) unutar samostalne
// "Kontrola sadržaja" sekcije — čuvamo ga da bismo karticu mogli privremeno
// da premestimo u "Prilagodi svoj plan" modal (klik na Start) i posle vratimo
// tačno gde je bila, bez dupliranja cele te (prilično razgranate) logike.
const BS_ORIGINAL_PARENT = document.getElementById('builderSummary').parentElement;
const BS_ORIGINAL_NEXT = document.getElementById('builderSummary').nextElementSibling;
function restoreBuilderSummaryPosition(){
  const bs = document.getElementById('builderSummary');
  if (!bs || bs.parentElement === BS_ORIGINAL_PARENT) return;
  if (BS_ORIGINAL_NEXT && BS_ORIGINAL_NEXT.parentElement === BS_ORIGINAL_PARENT){
    BS_ORIGINAL_PARENT.insertBefore(bs, BS_ORIGINAL_NEXT);
  } else {
    BS_ORIGINAL_PARENT.appendChild(bs);
  }
  // Vrati "Nastavi" dugme (skriveno dok je kartica bila unutar modala —
  // vidi #spMakeBtn) sad kad je kartica opet na svom originalnom mestu.
  document.getElementById('builderContinueBtn').style.display = '';
}

// Builder panel — zatvoren po default-u (vidi style="display:none" na
// #builderPanel u HTML-u). Jedini ulaz je sada plan-kartica (klik na Start),
// pošto je zasebna teaser kartica "Želiš više kontrole?" uklonjena sa zida
// (početne strane) da se ne dupira sa istim pozivom na akciju.
function openControlPanel(){
  document.getElementById('builderPanel').style.display = 'grid';
}
function closeControlPanel(){
  document.getElementById('builderPanel').style.display = 'none';
}
document.getElementById('builderCloseBtn').addEventListener('click', ()=>{
  closeControlPanel();
  document.getElementById('builderPanel').scrollIntoView({behavior:'smooth', block:'start'});
});

function builderCtx(){
  const dest = document.getElementById('dest').value.trim() || 'Atina';
  const originCode = document.getElementById('origin').value.trim();
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  const adults = Number(document.getElementById('adults').value) || 2;
  const nights = nightsBetween(from, to);
  return {dest, originCode, from, to, nights, days:nights, adults};
}

function computeCustomPackage(sel, ctx){
  // Seed zavisi SAMO od izbora koji stvarno utiču na SASTAV aranžmana
  // (let, hotel, auto, aktivnosti) — budžet je isključen iz istog razloga
  // kao i pre (samo prag za poređenje, ne treba da menja generisane cene).
  // airlineName je TAKOĐE namerno isključen: to je slobodan tekst koji
  // korisnik kuca slovo po slovo, i kad bi bio deo seed-a, svaki novi
  // karakter bi generisao potpuno nov seed → hotel/auto/aktivnosti cene
  // bi "treperele" i menjale se pri svakom tasteru, iako se ništa
  // semantički bitno za njih nije promenilo. Ime avio-kompanije i dalje
  // utiče na PRIKAZ leta (flightName ispod), samo ne na seed generatora.
  const seedSel = {
    flightPref: sel.flightPref,
    hotelStars: sel.hotelStars,
    prioritizeRating: sel.prioritizeRating,
    prioritizeLocation: sel.prioritizeLocation,
    carPref: sel.carPref,
    activityCount: sel.activityCount
  };
  const seedStr = ctx.dest.toLowerCase()+'|'+JSON.stringify(seedSel)+'|'+ctx.nights+'|'+ctx.adults;
  const rng = seededRandom(hashSeed(seedStr));

  // --- Flight ---
  const flightBase = 55 + rng()*130;
  const flightMult = FLIGHT_PREF_PRICE_MULT[sel.flightPref];
  const flightPrice = Math.round(flightBase * flightMult * ctx.adults * flightRouteMult(ctx.originCode, ctx.dest));
  // pickCarrierName zove rng() u IDENTIČNOM obrascu kao na kartičnom putu
  // (fetchFlights) — tačno jednom, i samo kad nije tražena konkretna
  // kompanija. Ne prosleđujemo forceCarrier ovde (builder nema tier-ove).
  const builderArrival = realArrivalAirportFor(ctx.dest);
  // NAPOMENA: ako je flightPref==='airline' i ime je uneto, pickCarrierName
  // NE zove rng() (isto kao pre) — to je namerno, jer inače bi svaki prelaz
  // prazno/popunjeno polje pomerio redosled sledećih rng() poziva (hotel,
  // auto...) za jedno mesto. Pošto je ova grana stabilna za SVAKI neprazan
  // unos (bilo koje slovo znači "preskoči"), cene se ne pomeraju dok
  // korisnik kuca — samo pri prvom i poslednjem karakteru (prazno ↔ nije
  // prazno), što je prihvatljivo i retko.
  const carrierName = pickCarrierName(rng, {flightPref: sel.flightPref, airlineName: sel.airlineName});
  const builderDeparture = realDepartureAirportFor(ctx.originCode);
  const flightName = carrierName + (builderDeparture ? ' ' + builderDeparture : '') + ' → ' + builderArrival;
  // Ista funkcija kao na kartičnom putu — pre deljenja, ovde NIJE bilo ni
  // upozorenja za ograničenu avio-mrežu ni napomene o ceni za više putnika,
  // iako let ovde isto zavisi od broja putnika (vidi flightPrice gore).
  const flightSub = flightSubText({
    flightPref: sel.flightPref, arrival: builderArrival, destRaw: ctx.dest,
    adults: ctx.adults, limitedNetwork: isLimitedNetworkOrigin(ctx.originCode)
  });
  assertFlightSubConsistency(sel.flightPref || 'direct', flightSub, 'computeCustomPackage');

  // --- Hotel ---
  const hotelBasePerNight = HOTEL_STAR_BASE_PRICE[sel.hotelStars] + rng()*22;
  let hotelMult = 1;
  if (sel.prioritizeRating) hotelMult += 0.10;
  if (sel.prioritizeLocation) hotelMult += 0.07;
  const hotelPrice = Math.round(hotelBasePerNight * hotelMult * ctx.nights * Math.ceil(ctx.adults/2));
  let hotelRating = HOTEL_STAR_RATING_BASE[sel.hotelStars] + rng()*0.25;
  if (sel.prioritizeRating) hotelRating += 0.25;
  hotelRating = Math.min(9.9, hotelRating);

  // --- Car ---
  const carPerDay = CAR_TYPE_BASE_PRICE[sel.carPref] + (sel.carPref==='none'?0:rng()*11);
  const carPrice = Math.round(carPerDay * ctx.days);

  // --- Activities ---
  const perActivity = 21 + rng()*17;
  const activityPrice = Math.round(perActivity * sel.activityCount);

  // --- Gorivo i putarine (samo ako je auto uključen) ---
  const carExtras = sel.carPref === 'none' ? 0 : Math.round(18 + rng()*20);

  // --- Osiguranje i eSIM (dodaci, cena po osobi) ---
  // NAPOMENA: namerno NE koristi rng() — ovo su uključi/isključi dodaci
  // (vidi .toggle-chip[data-toggle="insurance"/"esim"]), i pošto nisu deo
  // seedSel, uzimanje rng() ovde bi pomerilo redosled poziva za sve
  // random vrednosti iznad svaki put kad se dodatak uključi/isključi —
  // isti problem opisan gore za airlineName. Fiksna cena po osobi rešava
  // to i drži ostatak paketa stabilnim.
  const insuranceCost = sel.insurance ? BUILDER_ADDON_RATES.insurance * ctx.adults : 0;
  const esimCost = sel.esim ? BUILDER_ADDON_RATES.esim * ctx.adults : 0;
  // Putarine (paušalna procena za celu rutu, nezavisno od rent-a-cara —
  // relevantno i kad se putuje sopstvenim autom ili transferom) i
  // transferi (aerodrom–smeštaj, cena po osobi), isti obrazac kao gore.
  const putarinaCost = sel.putarina ? BUILDER_ADDON_RATES.putarina : 0;
  const transferiCost = sel.transferi ? BUILDER_ADDON_RATES.transferi * ctx.adults : 0;
  // Boravišna taksa (city/tourist tax) — po osobi, po noći; naplaćuje se na
  // licu mesta u hotelu, van same cene smeštaja, zato je poseban dodatak.
  // Računa se SAMO ako je hotel uključen (nema smisla bez smeštaja).
  const touristTaxCost = (sel.touristTax && sel.includeHotel) ? Math.round(BUILDER_ADDON_RATES.touristTax * ctx.adults * ctx.nights) : 0;

  // Isti dnevni tržišni faktor kao u gotovim ponudama (vidi marketFactor) —
  // primenjen na sve stavke osim osiguranja/eSIM-a, koji su fiksni dodaci
  // po osobi, ne tržišna cena koja fluktuira.
  const factor = marketFactor(ctx.dest, todayStr());
  const season = seasonFactor(ctx.dest, ctx.from); // po datumu polaska (vidi seasonFactor)
  const flightPriceF = sel.includeFlight ? Math.round(flightPrice * factor * season) : 0;
  const hotelPriceF = sel.includeHotel ? Math.round(hotelPrice * factor * season) : 0;
  const carPriceF = Math.round(carPrice * factor * season);
  const activityPriceF = Math.round(activityPrice * factor);
  const carExtrasF = Math.round(carExtras * factor);

  const total = flightPriceF + hotelPriceF + carPriceF + activityPriceF + carExtrasF + insuranceCost + esimCost + putarinaCost + transferiCost + touristTaxCost;

  return {
    flight: {price:flightPriceF, name:flightName, sub:flightSub},
    hotel:  {price:hotelPriceF, rating:Number(hotelRating.toFixed(1)), stars:sel.hotelStars},
    car:    {price:carPriceF, pref:sel.carPref},
    activity: {price:activityPriceF, count:sel.activityCount},
    carExtras: {price:carExtrasF},
    insuranceCost, esimCost, putarinaCost, transferiCost, touristTaxCost,
    total
  };
}

function renderBuilder(){
  const ctx = builderCtx();
  const pkg = computeCustomPackage(builderState, ctx);

  const lines = document.getElementById('builderLines');
  const ICONS = {
    flight:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M2 16l6-2 4.5-7 2 .6-2.5 6.9 5 1.5 3-2.4 1.6.5-2 3-5.5 1-1 2.6-1.8-.5.7-2.8-5 1.2-1-1.7z"/></svg>',
    hotel:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 21V6l7-3 7 3v15M3 21h18M9 21v-6h4v6"/></svg>',
    car:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 16v-4l2-5h12l2 5v4M4 16h16M6 16v2.5a1 1 0 001 1h1a1 1 0 001-1V16M15 16v2.5a1 1 0 001 1h1a1 1 0 001-1V16M6 12h12"/></svg>',
    activity:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/></svg>'
  };
  const badge = (kind) => '<span class="lic ic-' + kind + '">' + ICONS[kind] + '</span>';
  const rows = [];
  if (builderState.includeFlight) rows.push([badge('flight'), t('builder_flight_label'), pkg.flight.price]);
  if (builderState.includeHotel) rows.push([badge('hotel'), 'Hotel', pkg.hotel.price]);
  if (builderState.carPref !== 'none') rows.push([badge('car'), tx('Auto'), pkg.car.price]);
  if (builderState.activityCount > 0) rows.push([badge('activity'), t('builder_activities_label'), pkg.activity.price]);
  if (pkg.carExtras.price > 0) rows.push(['⛽', tx('Gorivo i putarine (auto)'), pkg.carExtras.price]);
  if (builderState.insurance) rows.push(['🛡️', t('f_insurance_name'), pkg.insuranceCost]);
  if (builderState.putarina) rows.push(['🛣️', t('f_tolls_name'), pkg.putarinaCost]);
  if (builderState.touristTax && builderState.includeHotel) rows.push(['🏛️', t('f_tax_name'), pkg.touristTaxCost]);
  if (builderState.esim) rows.push(['📶', 'eSIM', pkg.esimCost]);
  if (builderState.transferi) rows.push(['🚐', t('f_transfer_name'), pkg.transferiCost]);

  lines.innerHTML = rows.map(([ic,name,price]) => `
    <div class="builder-line">
      <span class="lname">${ic} ${name}</span>
      <span class="lval tabular">${fmtEUR(price)}</span>
    </div>`).join('');

  document.getElementById('builderTotal').textContent = fmtEUR(pkg.total);
  document.getElementById('builderTotalSub').textContent =
    'ukupno za ' + ctx.adults + ' osob' + (ctx.adults===1?'u':'e') + ' / ' + ctx.nights + ' dana';

  const statusEl = document.getElementById('builderBudgetStatus');
  if (builderState.budget) {
    statusEl.classList.add('show');
    if (pkg.total <= builderState.budget) {
      statusEl.className = 'builder-budget-status show ok';
      statusEl.innerHTML = '✓ U okviru budžeta od ' + fmtEUR(builderState.budget);
    } else {
      statusEl.className = 'builder-budget-status show over';
      statusEl.innerHTML = '⚠ ' + fmtEUR(pkg.total - builderState.budget) + ' preko budžeta od ' + fmtEUR(builderState.budget);
    }
  } else {
    statusEl.className = 'builder-budget-status';
    statusEl.innerHTML = '';
  }

  document.getElementById('optimizeResult').style.display = 'none';
  window._lastBuilderPkg = pkg;

  // --- Rezervacija po stavci (isti affiliate linkovi kao u gotovim ponudama) ---
  const linkCtx = Object.assign({}, ctx, {
    from: document.getElementById('dateFrom').value,
    to: document.getElementById('dateTo').value,
    flightPref: builderState.flightPref,
    hotelStars: builderState.hotelStars,
    prioritizeRating: builderState.prioritizeRating,
    prioritizeLocation: builderState.prioritizeLocation,
    carPref: builderState.carPref
  });
  const bookBtns = [];
  if (builderState.includeFlight){
    bookBtns.push(`<span class="bbl-item"><a class="item-btn flight" href="${escapeHtml(buildAffiliateLink('flight', linkCtx))}" target="_blank" rel="noopener sponsored" data-kind="flight" data-price="${pkg.flight.price}" data-url="${escapeHtml(buildAffiliateLink('flight', linkCtx))}" data-dest="${escapeHtml(linkCtx.dest||'')}" data-tier="builder" onclick="bookItem(this)">✈️ KAYAK</a>${affBadgeHtml()}</span>`);
  }
  if (builderState.includeHotel){
    bookBtns.push(`<span class="bbl-item"><a class="item-btn hotel" href="${escapeHtml(buildAffiliateLink('hotel', linkCtx))}" target="_blank" rel="noopener sponsored" data-kind="hotel" data-price="${pkg.hotel.price}" data-url="${escapeHtml(buildAffiliateLink('hotel', linkCtx))}" data-dest="${escapeHtml(linkCtx.dest||'')}" data-tier="builder" onclick="bookItem(this)">🏨 Booking.com</a>${affBadgeHtml()}</span>`);
  }
  if (builderState.carPref !== 'none'){
    bookBtns.push(`<span class="bbl-item"><a class="item-btn car" href="${escapeHtml(buildAffiliateLink('car', linkCtx))}" target="_blank" rel="noopener sponsored" data-kind="car" data-price="${pkg.car.price}" data-url="${escapeHtml(buildAffiliateLink('car', linkCtx))}" data-dest="${escapeHtml(linkCtx.dest||'')}" data-tier="builder" onclick="bookItem(this)">🚗 Booking.com</a>${affBadgeHtml()}</span>`);
  }
  if (builderState.activityCount > 0){
    bookBtns.push(`<span class="bbl-item"><a class="item-btn" style="background:var(--aqua);" href="${escapeHtml(buildAffiliateLink('activity', linkCtx))}" target="_blank" rel="noopener sponsored" data-kind="activity" data-price="${pkg.activity.price}" data-url="${escapeHtml(buildAffiliateLink('activity', linkCtx))}" data-dest="${escapeHtml(linkCtx.dest||'')}" data-tier="builder" onclick="bookItem(this)">🎟️ Viator</a>${affBadgeHtml()}</span>`);
  }
  document.getElementById('builderBookLinks').innerHTML =
    '<div class="bbl-label">Rezerviši svaku stavku direktno kod partnera:</div>' +
    '<div class="builder-book-row">' + bookBtns.join('') + '</div>' +
    '<p class="disclaimer" style="margin-top:10px;">' + escapeHtml(affDisc()) + '</p>';
}

function wireChipGroup(groupName, onChange){
  document.querySelectorAll('.chip-row[data-group="'+groupName+'"] .chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      document.querySelectorAll('.chip-row[data-group="'+groupName+'"] .chip').forEach(c=>c.classList.remove('on'));
      chip.classList.add('on');
      onChange(chip.dataset.value);
    });
  });
}

// ---- Upitnik (#builderPanel) — čekboks/radio povezivanje, bez chip
// dugmadi. Svaki .q-row-head checkbox otvara/zatvara svoj .q-sub (klasa
// .checked) i upisuje include-flag u builderState.
function qRow(name){ return document.querySelector('.q-row[data-row="'+name+'"]'); }
function qSyncRow(name, isOpen){ const row = qRow(name); if (row) row.classList.toggle('checked', isOpen); }

/* ==========================================================
   JEDINSTVENO STANJE FORME — builderState + renderFormUI()
   ----------------------------------------------------------
   builderState je JEDINI izvor istine — i za samostalnu "Kontrola
   sadržaja" sekciju (#builderPanel) i za "Prilagodi svoj plan" modal
   (#startPrefsModal, otvara se klikom na Start). Ranije je modal imao
   svoju KOPIJU stanja (startPrefs) koju je trebalo ručno prepisivati
   u builderState i nazad (dve sync funkcije) — svako novo polje se
   moralo ručno dodati na ~4 mesta (default, listener u panelu,
   listener u modalu, OBE sync funkcije). To je tačan obrazac greške
   koju je trebalo ispraviti.

   Sad postoji SAMO builderState + JEDNA renderFormUI() koja iscrtava
   OBA UI-ja iz njega + JEDNA wireFormFields() koja kači listener na
   odgovarajući element u OBA UI-ja (kad element postoji — letovi/
   hotel toggle, osiguranje, eSIM i transferi postoje samo u panelu,
   ne i u brzom modalu; modal id-jevi su isti kao panelovi, samo sa
   "sp" prefiksom). Za novo prosto polje (checkbox/radio): dodaj jedan
   unos u FORM_FIELDS. Auto i aktivnosti imaju poseban obrazac
   (čekboks uključi/isključi + pamćenje poslednje vrednosti), pa su
   ožičeni preko setupToggleRadioField / setupToggleCountField —
   svaki JEDNOM, ne duplirano za panel i modal.
========================================================== */
function setChkVal(id, val){ const el = document.getElementById(id); if (el) el.checked = !!val; }
function setRadioVal(name, val){ document.querySelectorAll('input[name="'+name+'"]').forEach(r=>{ r.checked = (String(r.value) === String(val)); }); }

// Jednostavna polja: jedan checkbox/radio u panelu, po volji i isti tip
// u modalu (modal:null → polje postoji samo u panelu, ne i u brzom modalu).
const FORM_FIELDS = [
  { key:'includeFlight',       type:'checkbox', panel:'flightInclude',         modal:null,                    row:'flight' },
  { key:'includeHotel',        type:'checkbox', panel:'hotelInclude',          modal:null,                    row:'hotel' },
  { key:'hotelStars',          type:'radio',    panel:'hotelStarsRadio',       modal:'spHotelStarsRadio',     numeric:true },
  { key:'prioritizeRating',    type:'checkbox', panel:'prioritizeRatingChk',   modal:'spPrioritizeRatingChk' },
  { key:'prioritizeLocation',  type:'checkbox', panel:'prioritizeLocationChk', modal:'spPrioritizeLocationChk' },
  { key:'insurance',           type:'checkbox', panel:'insuranceChk',          modal:null },
  { key:'putarina',            type:'checkbox', panel:'putarinaChk',           modal:'spPutarinaChk' },
  { key:'touristTax',          type:'checkbox', panel:'touristTaxChk',         modal:'spTouristTaxChk' },
  { key:'esim',                type:'checkbox', panel:'esimChk',               modal:null },
  { key:'transferi',           type:'checkbox', panel:'transferiChk',          modal:null }
];
function renderSimpleField(f){
  const val = builderState[f.key];
  if (f.type === 'checkbox'){
    setChkVal(f.panel, val);
    if (f.modal) setChkVal(f.modal, val);
    if (f.row) qSyncRow(f.row, !!val);
  } else {
    setRadioVal(f.panel, val);
    if (f.modal) setRadioVal(f.modal, val);
  }
}
function wireSimpleField(f){
  const onChange = (raw) => {
    builderState[f.key] = f.numeric ? Number(raw) : raw;
    renderFormUI();
    renderBuilder();
  };
  if (f.type === 'checkbox'){
    [f.panel, f.modal].filter(Boolean).forEach(id=>{
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', ()=> onChange(el.checked));
    });
  } else {
    [f.panel, f.modal].filter(Boolean).forEach(name=>{
      document.querySelectorAll('input[name="'+name+'"]').forEach(r=>{
        r.addEventListener('change', ()=> onChange(r.value));
      });
    });
  }
}

// Let: radio grupa + tekstualno polje za ime kompanije (prikazano samo
// kad je izabrano "Određena kompanija") — u panelu i u modalu odjednom.
const FLIGHT_PREF = { panelRadio:'flightPrefRadio', modalRadio:'spFlightPrefRadio', panelText:'airlineName', modalText:'spAirlineName' };
function renderFlightPrefField(){
  setRadioVal(FLIGHT_PREF.panelRadio, builderState.flightPref);
  setRadioVal(FLIGHT_PREF.modalRadio, builderState.flightPref);
  const showAirline = builderState.flightPref === 'airline';
  [FLIGHT_PREF.panelText, FLIGHT_PREF.modalText].forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = showAirline ? 'block' : 'none';
    if (document.activeElement !== el) el.value = builderState.airlineName || '';
  });
}
function wireFlightPrefField(){
  [FLIGHT_PREF.panelRadio, FLIGHT_PREF.modalRadio].forEach(name=>{
    document.querySelectorAll('input[name="'+name+'"]').forEach(r=>{
      r.addEventListener('change', ()=>{
        builderState.flightPref = r.value;
        renderFormUI();
        renderBuilder();
      });
    });
  });
  [FLIGHT_PREF.panelText, FLIGHT_PREF.modalText].forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', ()=>{
      builderState.airlineName = el.value.trim();
      renderBuilder();
    });
  });
}

// Rent a car / aktivnosti: čekboks uključi/isključi (mapira se na
// carPref==='none' odn. activityCount===0) + radio/broj za detalje.
// Pamti se JEDNA poslednja "uključena" vrednost — ponovno čekiranje u
// BILO KOM od dva UI-ja vraća istu vrednost, ne dve odvojene (ranije:
// _lastCarPref za panel, _spLastCarPref za modal, ručno usklađivane).
function setupToggleRadioField({ key, offValue, defaultOnValue, panelToggleId, modalToggleId, panelRow, modalRow, panelRadioName, modalRadioName }){
  let lastOnValue = builderState[key] !== offValue ? builderState[key] : defaultOnValue;
  function setOn(isOn, radioVal){
    builderState[key] = isOn ? (radioVal || lastOnValue) : offValue;
    if (builderState[key] !== offValue) lastOnValue = builderState[key];
    renderFormUI();
    renderBuilder();
  }
  [panelToggleId, modalToggleId].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', ()=> setOn(el.checked));
  });
  [panelRadioName, modalRadioName].forEach(name=>{
    document.querySelectorAll('input[name="'+name+'"]').forEach(r=>{
      r.addEventListener('change', ()=> setOn(true, r.value));
    });
  });
  return function render(){
    const isOn = builderState[key] !== offValue;
    setChkVal(panelToggleId, isOn);
    setChkVal(modalToggleId, isOn);
    qSyncRow(panelRow, isOn);
    qSyncRow(modalRow, isOn);
    setRadioVal(panelRadioName, isOn ? builderState[key] : lastOnValue);
    setRadioVal(modalRadioName, isOn ? builderState[key] : lastOnValue);
  };
}
function setupToggleCountField({ key, defaultOnValue, min, max, panelToggleId, modalToggleId, panelRow, modalRow, panelInputId, modalInputId }){
  let lastOnValue = builderState[key] > 0 ? builderState[key] : defaultOnValue;
  function setOn(isOn){
    builderState[key] = isOn ? lastOnValue : 0;
    renderFormUI();
    renderBuilder();
  }
  [panelToggleId, modalToggleId].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', ()=> setOn(el.checked));
  });
  [panelInputId, modalInputId].forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('focus', ()=> el.select());
    el.addEventListener('input', ()=>{
      const raw = el.value;
      const n = raw === '' ? 0 : Math.max(min, Math.min(max, Math.floor(Number(raw)) || 0));
      builderState[key] = n;
      if (n > 0) lastOnValue = n;
      renderFormUI();
      renderBuilder();
    });
    el.addEventListener('blur', renderFormUI);
  });
  return function render(){
    const isOn = builderState[key] > 0;
    setChkVal(panelToggleId, isOn);
    setChkVal(modalToggleId, isOn);
    qSyncRow(panelRow, isOn);
    qSyncRow(modalRow, isOn);
    [panelInputId, modalInputId].forEach(id=>{
      const el = document.getElementById(id);
      if (el && document.activeElement !== el) el.value = builderState[key];
    });
  };
}

// Gornja granica je namerno velikodušna (niko realno ne planira izlet
// preko ovoga), samo sprečava apsurdne unose tipa "1e10" ili slučajno
// dodat nepotreban nule. Budžet mora biti ceo broj > 0, ne negativan
// i ne decimalan — sve ostalo se ili odbacuje (null) ili zaokružuje/seče.
// Isto polje ideje u panelu i modalu — pisano jednom, primenjeno na oba.
const MAX_BUDGET = 50000;
function clampBudgetInput(el){
  const raw = el.value;
  if (!raw) { builderState.budget = null; renderBuilder(); return; }
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n <= 0) {
    // Prazno/nevalidno/negativno dok korisnik još kuca (npr. samo "-") —
    // ne diramo polje, samo privremeno ignorišemo budžet u proračunu.
    builderState.budget = null;
  } else {
    const clamped = Math.min(n, MAX_BUDGET);
    // Ako je uneta decimala ili broj veći od granice, ispravi i prikaz
    // u polju da korisnik vidi tačno koja vrednost se zapravo koristi.
    if (String(clamped) !== raw) el.value = clamped;
    builderState.budget = clamped;
  }
  renderBuilder();
}
function wireBudgetField(){
  ['budgetInput','spBudgetInput'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', ()=> clampBudgetInput(el));
  });
}
function renderBudgetField(){
  ['budgetInput','spBudgetInput'].forEach(id=>{
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = builderState.budget || '';
  });
}

let _renderCarField = null;
let _renderActivitiesField = null;

// Kači SVE listenere (panel + modal) odjednom. Poziva se JEDNOM, pri učitavanju.
function wireFormFields(){
  FORM_FIELDS.forEach(wireSimpleField);
  wireFlightPrefField();
  wireBudgetField();
  _renderCarField = setupToggleRadioField({
    key:'carPref', offValue:'none', defaultOnValue:'small',
    panelToggleId:'carInclude', modalToggleId:'spCarInclude',
    panelRow:'car', modalRow:'sp-car',
    panelRadioName:'carPrefRadio', modalRadioName:'spCarPrefRadio'
  });
  _renderActivitiesField = setupToggleCountField({
    key:'activityCount', defaultOnValue:2, min:0, max:10,
    panelToggleId:'activitiesInclude', modalToggleId:'spActivitiesInclude',
    panelRow:'activities', modalRow:'sp-activities',
    panelInputId:'actCountInput', modalInputId:'spActCountInput'
  });
}
// Iscrtava OBA UI-ja (panel i modal) iz builderState. Poziva se posle
// svake izmene stanja (iz bilo kog UI-ja), i posle svake spoljašnje
// izmene builderState (učitavanje sačuvanog izleta, primena optimizacije).
function renderFormUI(){
  FORM_FIELDS.forEach(renderSimpleField);
  renderFlightPrefField();
  renderBudgetField();
  if (_renderCarField) _renderCarField();
  if (_renderActivitiesField) _renderActivitiesField();
}
wireFormFields();
renderFormUI();

// Recalculate live if destination/dates/passengers change up in the ticket
['dest','dateFrom','dateTo','adults'].forEach(id=>{
  document.getElementById(id).addEventListener('input', renderBuilder);
  document.getElementById(id).addEventListener('change', renderBuilder);
});

/* ---- Optimizacija: proba SVE dostupne poluge (hotel, auto, aktivnosti),
   ne samo hotel — i predlaže onu sa najvećom uštedom. "Već optimalno" se
   sada prikazuje samo ako ni jedna poluga stvarno ne postoji ili ni jedna
   ne donosi uštedu, ne čim prva proverena poluga (hotel) padne na 3★. ---- */
document.getElementById('optimizeBtn').addEventListener('click', ()=>{
  const ctx = builderCtx();
  const current = window._lastBuilderPkg || computeCustomPackage(builderState, ctx);
  const candidates = [];

  // Poluga 1: hotel jednu zvezdicu niže.
  if (builderState.hotelStars > 3) {
    const testSel = Object.assign({}, builderState, {hotelStars: builderState.hotelStars - 1});
    const alt = computeCustomPackage(testSel, ctx);
    candidates.push({
      testSel,
      savings: current.total - alt.total,
      message: `Ako promeniš hotel na ${testSel.hotelStars}★, zadržavaš skoro istu lokaciju uz malo nižu ocenu (${alt.hotel.rating} umesto ${current.hotel.rating}).`,
      toastMsg: 'hotel promenjen na ' + testSel.hotelStars + '★.',
      apply(){
        renderFormUI();
      }
    });
  }

  // Poluga 2: manji auto (SUV → mali auto → bez auta).
  const carDowngrade = {suv:'small', small:'none'}[builderState.carPref];
  if (carDowngrade) {
    const testSel = Object.assign({}, builderState, {carPref: carDowngrade});
    const alt = computeCustomPackage(testSel, ctx);
    candidates.push({
      testSel,
      savings: current.total - alt.total,
      message: carDowngrade === 'none'
        ? 'Ako odustaneš od iznajmljivanja auta, gubiš deo fleksibilnosti u kretanju, ali štediš i na gorivu i putarinama.'
        : 'Ako uzmeš manji auto umesto SUV-a, uštedu dobijaš uz nešto manje prtljažnog prostora.',
      toastMsg: 'auto promenjen na ' + (carDowngrade === 'none' ? 'bez auta' : 'mali auto') + '.',
      apply(){
        renderFormUI();
      }
    });
  }

  // Poluga 3: jedna aktivnost manje.
  if (builderState.activityCount > 0) {
    const testSel = Object.assign({}, builderState, {activityCount: builderState.activityCount - 1});
    const alt = computeCustomPackage(testSel, ctx);
    candidates.push({
      testSel,
      savings: current.total - alt.total,
      message: `Ako smanjiš broj aktivnosti na ${testSel.activityCount}, ostaje ti i dalje dovoljno vremena za slobodno istraživanje.`,
      toastMsg: 'broj aktivnosti smanjen na ' + testSel.activityCount + '.',
      apply(){
        renderFormUI();
      }
    });
  }

  const box = document.getElementById('optimizeResult');
  box.style.display = 'block';

  const viable = candidates.filter(c => c.savings > 0).sort((a,b) => b.savings - a.savings);
  if (!viable.length) {
    box.innerHTML = candidates.length
      ? '<span class="save">Izlet je već optimalan</span>Proverili smo hotel, auto i broj aktivnosti — trenutna kombinacija je već najjeftinija za odabrane kriterijume.'
      : '<span class="save">Izlet je već optimalan</span>Već si na najnižim opcijama za sve stavke — nema očiglednog mesta za uštedu bez gubitka udobnosti.';
    return;
  }

  const best = viable[0];
  box.innerHTML = `
    <span class="save">Možeš uštedeti ${fmtEUR(best.savings)}</span>
    ${best.message}
    <button type="button" class="optimize-apply" id="applyOptimize">Primeni ovu izmenu</button>
  `;
  document.getElementById('applyOptimize').addEventListener('click', ()=>{
    Object.assign(builderState, best.testSel);
    best.apply();
    renderBuilder();
    showToast('Izlet ažuriran — ' + best.toastMsg);
  });
});

document.getElementById('makeBuilderBtn').addEventListener('click', ()=>{
  const destInput = document.getElementById('dest');
  if (!destInput.value.trim()){
    showToast('Unesi destinaciju da bismo napravili izlet.');
    destInput.focus();
    destInput.scrollIntoView({behavior:'smooth', block:'center'});
    return;
  }
  renderBuilder();
  document.getElementById('builderSummary').style.display = 'block';
  document.getElementById('builderPlaceholder').style.display = 'none';
  document.getElementById('builderBookLinks').style.display = 'none';
});

// "Nastavi" — otkriva linkove za rezervaciju kod partnera (kayak/booking/
// itd.), koji su već izračunati u renderBuilder() ali ostaju sakriveni dok
// korisnik ne pregleda cenu/optimizaciju i svesno odluči da nastavi.
document.getElementById('builderContinueBtn').addEventListener('click', ()=>{
  const links = document.getElementById('builderBookLinks');
  links.style.display = 'block';
  requestAnimationFrame(() => {
    links.scrollIntoView({behavior:'smooth', block:'center'});
  });
});

