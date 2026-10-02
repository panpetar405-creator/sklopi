/* app-05-results.js — deo nekadašnjeg app.js (deo 5/11): Predlozi mesta, "Pronađi svoj izlet", rezultati, slajder.
   Klasična skripta: deli globalni opseg sa ostalim app-*.js fajlovima; redosled učitavanja u index.html je bitan. */
/* ==========================================================
   Sopstvena (ne-native) lista predloga mesta za Polazak/Destinaciju.
   Ranije: <input list="..."> + <datalist>. Problem koji je to pravilo
   na Android/Chrome: nativna traka predloga iznad tastature ume da
   "trepće" — zatvori pa ponovo otvori tastaturu pri svakom kucanju
   ili izboru predloga, jer datalist UI nije deo same tastature nego
   posebna traka koju browser umeće/uklanja. Ovde predloge iscrtavamo
   sami u panel-u koji mi kontrolišemo (position:fixed, pozicioniran
   preko getBoundingClientRect), a fokus nikad ne napušta input polje
   (mousedown/touchstart na panelu je preventDefault-ovan), pa tastatura
   ostaje otvorena i mirna od prvog slova do izbora predloga.
========================================================== */
const LOC_DROPDOWN_INPUT_ID = { destSuggestions:'dest', originSuggestions:'origin' };
const _locDropdownState = {
  destSuggestions:{ items:[], activeIndex:-1, suppressNextFetch:false, reqSeq:0 },
  originSuggestions:{ items:[], activeIndex:-1, suppressNextFetch:false, reqSeq:0 }
};
// Koristi visualViewport (kad postoji — svi moderni Android/Chrome) da
// zna GDE se stvarno završava vidljiv deo ekrana kad je tastatura otvorena.
// Bez ovoga se panel računao prema window.innerHeight/scroll poziciji koje
// tastatura ne menja (samo "visual" viewport se smanji), pa je panel visio
// ispod polja i tastatura ga je prekrivala skoro celog — vidljiv je ostajao
// tek delić prvog predloga.
function getVisibleViewportTop(){
  const vv = window.visualViewport;
  return vv ? vv.offsetTop : 0;
}
function getVisibleViewportBottom(){
  const vv = window.visualViewport;
  return vv ? (vv.offsetTop + vv.height) : window.innerHeight;
}
function positionLocDropdown(panel, inputEl){
  const r = inputEl.getBoundingClientRect();
  const gap = 6, margin = 8, minUseful = 120, preferredMax = 264;
  const visTop = getVisibleViewportTop() + margin;
  const visBottom = getVisibleViewportBottom() - margin;
  const spaceBelow = visBottom - (r.bottom + gap);
  const spaceAbove = (r.top - gap) - visTop;
  panel.style.left = r.left + 'px';
  panel.style.width = r.width + 'px';
  if (spaceBelow >= minUseful || spaceBelow >= spaceAbove){
    // dovoljno mesta ispod polja (ili bar više nego iznad) — otvori ispod,
    // ali visinu ograniči na stvarno vidljiv prostor iznad tastature
    panel.style.top = (r.bottom + gap) + 'px';
    panel.style.bottom = 'auto';
    panel.style.maxHeight = Math.max(minUseful, Math.min(preferredMax, spaceBelow)) + 'px';
  } else {
    // tastatura pojela prostor ispod polja — otvori NAVIŠE, iznad polja
    panel.style.top = 'auto';
    panel.style.bottom = (window.innerHeight - r.top + gap) + 'px';
    panel.style.maxHeight = Math.max(minUseful, Math.min(preferredMax, spaceAbove)) + 'px';
  }
}
function closeLocDropdown(datalistId){
  const panel = document.getElementById(datalistId);
  const inputEl = document.getElementById(LOC_DROPDOWN_INPUT_ID[datalistId]);
  const state = _locDropdownState[datalistId];
  if (panel){ panel.classList.remove('open'); panel.innerHTML = ''; }
  // reqSeq++ ovde je KLJUČNO: poništava svaki fetchLocationSuggestions poziv
  // koji je u tom trenutku još "u letu" (čeka backend/Open-Meteo). Bez ovoga,
  // zatvaranje panela (izborom predloga, blur-om ili skrolom) ne prekida stari
  // mrežni poziv — kad on kasnije stigne, ponovo otvara panel sa starim
  // predlozima, iako je korisnik u međuvremenu već izabrao/sačuvao destinaciju
  // i pomerio se dalje po sajtu.
  if (state){ state.items = []; state.activeIndex = -1; state.reqSeq++; }
  if (inputEl){ inputEl.setAttribute('aria-expanded', 'false'); inputEl.removeAttribute('aria-activedescendant'); }
}
function selectLocSuggestion(datalistId, value){
  const inputEl = document.getElementById(LOC_DROPDOWN_INPUT_ID[datalistId]);
  if (!inputEl) return;
  inputEl.value = value;
  // Sledeći 'input' event (koji dispatch-ujemo ispod, da pokrene regionalne
  // predloge/upozorenje o aerodromu) NE sme ponovo da pokrene pretragu
  // predloga — inače isti tekst ("Budva") opet nađe sam sebe kao pogodak
  // i lista se vrati/ne zatvori 300ms nakon izbora. Ovaj flag preskače
  // TAČNO taj jedan naredni poziv.
  const state = _locDropdownState[datalistId];
  if (state) state.suppressNextFetch = true;
  closeLocDropdown(datalistId);
  inputEl.dispatchEvent(new Event('input', {bubbles:true}));
  inputEl.dispatchEvent(new Event('change', {bubbles:true}));
  // Tastatura se zatvara ODMAH posle izbora, bez obzira na sledeće polje —
  // dok je otvorena, prekriva pola ekrana i baš uneto polje se jedva vidi.
  // Fokus se NE prebacuje automatski na sledeće polje (ni Destinaciju ni
  // datume): korisnik sam dodirne sledeće polje kad bude spreman, i tastatura
  // (ili kalendar) se tad normalno otvori za njega.
  inputEl.blur();
}
function setupLocDropdown(datalistId){
  const panel = document.getElementById(datalistId);
  const inputEl = document.getElementById(LOC_DROPDOWN_INPUT_ID[datalistId]);
  if (!panel || !inputEl) return;

  // KLJUČNO: panel fizički prebacujemo u <body>. U HTML-u je ugnježden unutar
  // .stub-a za Destinaciju/Polazak, a taj .stub ima isolation:isolate (isti
  // razlog zbog kog je i kalendar ranije morao specijalan tretman — vidi
  // komentar uz .cal-card u styles.css). Isolation zarobi SVAKI potomak u
  // sopstveni sloj za crtanje, čak i position:fixed — pa su stubovi koji u
  // DOM-u dolaze POSLE (OD—DO, Putnika) crtani PREKO panela, bez obzira na
  // z-index. Kad je panel direktno dete <body>, taj problem nestaje.
  if (panel.parentElement !== document.body) document.body.appendChild(panel);

  // Sprečava da tap/klik na predlog oduzme fokus input polju pre nego što
  // stigne 'click' — upravo taj gubitak-pa-povratak fokusa je ono što na
  // mobilnom zatvori pa ponovo otvori tastaturu. NAPOMENA: ovo se radi SAMO
  // na 'mousedown' (stiže i posle dodira, kao "kompatibilni" miš-događaj) —
  // preventDefault() na 'touchstart' je ranije bio dodat sa istom namerom,
  // ali on na dodirnim uređajima potpuno ugasi naredni 'click' događaj
  // (deo specifikacije touch-events), pa tap nije radio ništa.
  panel.addEventListener('mousedown', (e) => e.preventDefault());

  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('.loc-dropdown-item');
    if (!btn) return;
    const state = _locDropdownState[datalistId];
    const item = state.items[Number(btn.dataset.idx)];
    if (item) selectLocSuggestion(datalistId, item.name);
  });

  inputEl.addEventListener('keydown', (e) => {
    const state = _locDropdownState[datalistId];
    if (!panel.classList.contains('open') || !state.items.length) return;
    if (e.key === 'ArrowDown'){
      e.preventDefault();
      state.activeIndex = Math.min(state.activeIndex + 1, state.items.length - 1);
    } else if (e.key === 'ArrowUp'){
      e.preventDefault();
      state.activeIndex = Math.max(state.activeIndex - 1, 0);
    } else if (e.key === 'Enter'){
      if (state.activeIndex >= 0){
        e.preventDefault();
        const item = state.items[state.activeIndex];
        if (item) selectLocSuggestion(datalistId, item.name);
      }
      return;
    } else if (e.key === 'Escape'){
      closeLocDropdown(datalistId);
      return;
    } else {
      return;
    }
    const optionEls = panel.querySelectorAll('.loc-dropdown-item');
    optionEls.forEach((el, i) => el.classList.toggle('is-active', i === state.activeIndex));
    const activeEl = optionEls[state.activeIndex];
    if (activeEl){
      activeEl.scrollIntoView({block:'nearest'});
      inputEl.setAttribute('aria-activedescendant', activeEl.id);
    }
  });

  // Malo kašnjenje na blur: ostavlja vremena da 'click' na predlogu (posle
  // mousedown-a iznad) stigne da se obradi pre nego što panel nestane.
  inputEl.addEventListener('blur', () => setTimeout(() => closeLocDropdown(datalistId), 150));

  window.addEventListener('resize', () => { if (panel.classList.contains('open')) positionLocDropdown(panel, inputEl); });
  window.addEventListener('scroll', () => { if (panel.classList.contains('open')) positionLocDropdown(panel, inputEl); }, true);
  // window 'resize' se često NE aktivira kad se otvori/zatvori tastatura
  // (menja se samo visualViewport, ne i layout viewport) — bez ovoga bi
  // panel ostao zaleđen na poziciji izračunatoj PRE nego što je tastatura
  // stigla da se potpuno otvori.
  if (window.visualViewport){
    window.visualViewport.addEventListener('resize', () => { if (panel.classList.contains('open')) positionLocDropdown(panel, inputEl); });
    window.visualViewport.addEventListener('scroll', () => { if (panel.classList.contains('open')) positionLocDropdown(panel, inputEl); });
  }
}

let _destSuggestTimer = null;
let _originSuggestTimer = null;
async function fetchLocationSuggestions(q, datalistId){
  const query = q.trim();
  const inputEl = document.getElementById(LOC_DROPDOWN_INPUT_ID[datalistId]);
  const stubEl = inputEl ? inputEl.closest('.stub') : null;
  const state = _locDropdownState[datalistId];
  // Isti princip kao mySeq/wxRequestSeq kod prognoze: obeleži OVAJ poziv
  // brojem. Ako se panel u međuvremenu zatvori (izbor, blur, nova pretraga —
  // svaki poziv closeLocDropdown-a povećava reqSeq), taj broj više neće biti
  // najsvežiji, pa ovaj poziv na kraju NEĆE ponovo otvoriti panel sa
  // zastarelim/tuđim predlozima.
  const mySeq = state ? ++state.reqSeq : 0;
  if (query.length < 2){ renderLocationSuggestions([], datalistId); if (stubEl) stubEl.classList.remove('is-loading'); return; }
  if (stubEl) stubEl.classList.add('is-loading');

  try {
    const combined = [];
    const seen = new Set();
    function addAll(arr){
      for (const r of arr){
        const key = r.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        combined.push(r);
      }
    }

    addAll(matchPopularDestinations(query));

    if (combined.length < 6 && API_BASE){
      try {
        const res = await fetch(API_BASE + '/api/locations?q=' + encodeURIComponent(query));
        if (res.ok){
          const json = await res.json();
          if (json.results) addAll(json.results.map(r => ({name:r.cityName, extra:r.countryName})));
        }
      } catch(err){
        console.warn('[sklopi] backend predlozi nedostupni, prelazim na Open-Meteo:', err.message);
      }
    }

    if (combined.length < 6){
      const langAttempts = ['sr', 'en', null];
      for (const lang of langAttempts){
        if (combined.length >= 6) break;
        try {
          const langParam = lang ? '&language=' + lang : '';
          const res = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(query) + '&count=10' + langParam + '&format=json');
          if (res.ok){
            const data = await res.json();
            const sorted = rankLocationMatches(data.results || [], query);
            addAll(sorted.map(r => ({name:r.name, extra:[r.admin1, r.country].filter(Boolean).join(', ')})));
          }
        } catch(err){
          console.warn('[sklopi] predlozi mesta (Open-Meteo) nisu uspeli:', err.message);
        }
      }
    }

    // Ako je u međuvremenu panel zatvoren (izbor predloga, blur, skrol koji
    // je blur-ovao polje...) ili je pokrenuta NOVIJA pretraga, ovaj odgovor
    // je zastareo — ne prikazuj ga.
    if (!state || mySeq === state.reqSeq) renderLocationSuggestions(combined.slice(0, 6), datalistId);
  } finally {
    if (stubEl) stubEl.classList.remove('is-loading');
  }
}
function renderLocationSuggestions(results, datalistId){
  const panel = document.getElementById(datalistId);
  const inputEl = document.getElementById(LOC_DROPDOWN_INPUT_ID[datalistId]);
  if (!panel || !inputEl) return;
  const seen = new Set(); // izbegava duplikate istog naziva grada
  const items = results.filter(r => {
    const key = r.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const state = _locDropdownState[datalistId];
  state.items = items;
  state.activeIndex = -1;
  if (!items.length){ closeLocDropdown(datalistId); return; }
  panel.innerHTML = items.map((r, i) =>
    `<button type="button" class="loc-dropdown-item" role="option" id="${datalistId}-opt-${i}" data-idx="${i}">`
    + escapeHtml(r.name) + (r.extra ? `<span class="ldi-extra">${escapeHtml(r.extra)}</span>` : '')
    + `</button>`
  ).join('');
  positionLocDropdown(panel, inputEl);
  panel.classList.add('open');
  inputEl.setAttribute('aria-expanded', 'true');
}
setupLocDropdown('destSuggestions');
setupLocDropdown('originSuggestions');
function markStubLoading(inputEl, q){
  const stubEl = inputEl.closest('.stub');
  if (!stubEl) return;
  // Upali spinner odmah na kucanje (ne čekaj debounce) — inače 300ms
  // pre samog fetch-a polje izgleda mirno/prazno, kao da nešto ne radi.
  stubEl.classList.toggle('is-loading', q.trim().length >= 2);
}
document.getElementById('dest').addEventListener('input', (e)=>{
  clearTimeout(_destSuggestTimer);
  const q = e.target.value;
  const state = _locDropdownState.destSuggestions;
  if (state && state.suppressNextFetch){ state.suppressNextFetch = false; return; }
  markStubLoading(e.target, q);
  _destSuggestTimer = setTimeout(()=> fetchLocationSuggestions(q, 'destSuggestions'), 300);
});
document.getElementById('origin').addEventListener('input', (e)=>{
  clearTimeout(_originSuggestTimer);
  const q = e.target.value;
  const state = _locDropdownState.originSuggestions;
  if (state && state.suppressNextFetch){ state.suppressNextFetch = false; return; }
  markStubLoading(e.target, q);
  _originSuggestTimer = setTimeout(()=> fetchLocationSuggestions(q, 'originSuggestions'), 300);
});

function escapeHtml(str){
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

async function fetchPackagesFromBackend(payload){
  if (!API_BASE) return null; // backend jos nije deploy-ovan — nema smisla ni pokusavati
  // Tajmaut: spor backend ne sme da drži skeleton unedogled — posle 6 s
  // (ili prekida) pada na lokalnu procenu, isto kao kad je nedostupan.
  const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 6000) : null;
  try {
    const res = await fetch(API_BASE + '/api/search', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    // Prazan ili neispravan odgovor = kao da backend nije odgovorio.
    const pkgs = json && json.packages;
    if (!Array.isArray(pkgs) || !pkgs.length || !pkgs.every(pk => pk && TIER_META[pk.tier])) throw new Error('neispravan odgovor');
    return pkgs;
  } catch(err){
    console.warn('[sklopi] backend nedostupan, koristim lokalni mock:', err.message);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function computePackagesLocally(dest, from, to, nights, days, adults, flags, originCode){
  const seed = hashSeed(dest.toLowerCase()+dest.length+nights+adults);
  const rng = seededRandom(seed);
  const factor = marketFactor(dest, todayStr());
  // Deljena "baza" cene za sve tri tier kartice — vidi buildPriceSeeds.
  const priceSeeds = buildPriceSeeds(rng);

  const pkgs = ['best','comfort','budget'].map(t => buildPackage(rng, dest, nights, days, adults, t, flags, factor, originCode, seasonFactor(dest, from), priceSeeds));
  pkgs.forEach(p => attachAffiliateLinks(p, dest, from, to, adults, {originCode, flags}));

  // Price score is relative to the cheapest of THIS run's three packages —
  // the cheapest always scores highest on price, others drop off the more
  // expensive they are. Combined with the fixed quality score, this decides
  // which package actually gets the "Preporučeno" badge (not just whichever
  // tier is named "Best Value").
  const minTotal = Math.min(...pkgs.map(p => p.total));
  pkgs.forEach(p => {
    const overCheapest = (p.total - minTotal) / minTotal;
    p.priceScore = Math.max(40, Math.round(96 - overCheapest * 140));
    p.score = Math.round(p.priceScore * 0.55 + p.qualityScore * 0.45);
  });
  pkgs.sort((a, b) => b.score - a.score);
  pkgs.forEach((p, i) => { p.recommended = (i === 0); });
  return pkgs;
}

/* ==========================================================
   "PRONAĐI SVOJ IZLET" — pravi alat za odlučivanje, ne kocka.
   Umesto da nasumično bira grad koji se uklapa u budžet, korisnik
   prođe kratak upitnik (sa kim putuje, šta mu znači odmor, budžet)
   i svaki grad iz kurirane MATCH_DESTINATIONS baze se BODUJE po
   poklapanju sa odgovorima + sezonom (mesec iz already-selected
   datuma) + dužinom puta (broj noći iz already-selected datuma) +
   budžetom. Vraćaju se 3 grada sa najvišim skorom i objašnjenjem
   ZAŠTO baš oni odgovaraju — ne samo cenom.
========================================================== */
/* Kurirana baza destinacija sa tagovima za bodovanje (podskup
   POPULAR_DESTINATIONS — namerno manji i pažljivije tagovan, jer je
   ovde tačnost preporuke važnija od broja gradova).
   vibes: 'sea' | 'city' | 'nature' | 'nightlife' (grad može imati više)
   months: meseci (1-12) kad je destinacija najbolja sezona
   distance: 'near' (Balkan/susedne zemlje), 'medium' (ostatak Evrope,
             Turska, sev. Afrika), 'far' (interkontinentalni letovi)
   family: da li je pogodna za porodice sa decom
   nightlife: da li ima jak noćni život/provod */
/* MATCH_DESTINATIONS_TAGS — kurirana lista mesta pogodnih za kviz preporuka,
   SAMO tagovi (vibe/meseci/udaljenost/porodica/noćni život). Ime mesta mora
   postojati i u POPULAR_DESTINATIONS — odatle se automatski povlači država
   (extra), da se ne bi dupliralo i razilazilo na dva mesta. */
const MATCH_DESTINATIONS_TAGS = [
  {name:'Budimpešta', vibes:['city'], months:[3,4,5,6,9,10,11,12], distance:'near', family:true, nightlife:true},
  {name:'Beč', vibes:['city'], months:[1,2,3,4,5,9,10,11,12], distance:'near', family:true, nightlife:false},
  // Austrija — dopuna (Kicbil i St. Anton am Arlberg su već u redu "Skijaški centri")
  {name:'Zalcburg', vibes:['city','nature'], months:[1,2,3,4,5,9,10,11,12], distance:'near', family:true, nightlife:false},
  {name:'Insbruk', vibes:['city','nature','ski'], months:[12,1,2,3,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Graz', vibes:['city'], months:[3,4,5,9,10,11], distance:'near', family:true, nightlife:false},
  {name:'Halštat', vibes:['nature'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:false},
  {name:'Grosglokner', vibes:['nature'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Vertersee', vibes:['nature','sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Sofija', vibes:['city','nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Solun', vibes:['city','sea'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:true},
  {name:'Skoplje', vibes:['city'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Ohrid', vibes:['sea','nature'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Tirana', vibes:['city'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:true},
  {name:'Sarande', vibes:['sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Budva', vibes:['sea','nightlife'], months:[6,7,8,9], distance:'near', family:false, nightlife:true},
  {name:'Kotor', vibes:['sea','nature'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:false},
  {name:'Herceg Novi', vibes:['sea','nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  // Crna Gora — dopuna (Žabljak je već ispod, u redu "Skijaški centri" nema svoju stavku ovde)
  {name:'Podgorica', vibes:['city'], months:[4,5,9,10], distance:'near', family:true, nightlife:false},
  {name:'Tivat', vibes:['sea'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Sveti Stefan', vibes:['sea'], months:[5,6,7,8,9], distance:'near', family:false, nightlife:false},
  {name:'Petrovac', vibes:['sea'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Ulcinj', vibes:['sea'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:false},
  {name:'Cetinje', vibes:['city','nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Durmitor', vibes:['nature'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Skadarsko Jezero', vibes:['nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  // Crna Gora — dopuna: primorska mesta (van Budve/Kotora/Herceg Novog, koji su već gore)
  {name:'Bar', vibes:['sea'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:false},
  {name:'Sutomore', vibes:['sea'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Igalo', vibes:['sea'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Perast', vibes:['sea','nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Risan', vibes:['sea','nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Stari Bar', vibes:['sea','nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Bečići', vibes:['sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:true},
  {name:'Rafailovići', vibes:['sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:true},
  {name:'Pržno', vibes:['sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Miločer', vibes:['sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Čanj', vibes:['sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Buljarica', vibes:['sea','nature'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Velika Plaža', vibes:['sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Ada Bojana', vibes:['sea','nature'], months:[6,7,8,9], distance:'near', family:false, nightlife:false},
  // Crna Gora — dopuna: planine
  {name:'Lovćen', vibes:['nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Bjelasica', vibes:['nature'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Komovi', vibes:['nature'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Sinjajevina', vibes:['nature'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Rumija', vibes:['nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Hajla', vibes:['nature'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Orjen', vibes:['nature'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:false},
  // Crna Gora — dopuna: reke i kanjoni (Tara i Lim se NE dodaju ovde — POPULAR_DESTINATIONS
  // već ima istoimene srpske unose ranije u nizu, pa bi .find() po imenu pogrešno povukao
  // extra:'Srbija'; treba prvo razdvojiti imena, npr. u 'Tara (Crna Gora)', pa tek onda dodati)
  {name:'Morača', vibes:['nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Zeta', vibes:['nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Piva', vibes:['nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Ćehotina', vibes:['nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Cijevna', vibes:['nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Bistrica', vibes:['nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  // Crna Gora — dopuna: jezera
  {name:'Crno Jezero', vibes:['nature'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Biogradsko Jezero', vibes:['nature'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:false},
  {name:'Plavsko Jezero', vibes:['nature'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Slansko Jezero', vibes:['nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Šasko Jezero', vibes:['nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Pivsko Jezero', vibes:['nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Dubrovnik', vibes:['sea','city'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:false},
  {name:'Split', vibes:['sea','city','nightlife'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:true},
  {name:'Hvar', vibes:['sea','nightlife'], months:[6,7,8,9], distance:'near', family:false, nightlife:true},
  {name:'Zagreb', vibes:['city'], months:[3,4,5,6,9,10,11,12], distance:'near', family:true, nightlife:false},
  // Hrvatska — dopuna (obala)
  {name:'Zadar', vibes:['sea','city'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:false},
  {name:'Rijeka', vibes:['sea','city'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Pula', vibes:['sea','city'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Rovinj', vibes:['sea'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Plitvička Jezera', vibes:['nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  // Hrvatska — dopuna: primorska mesta (van Splita/Dubrovnika/Hvara/Zadra/Rijeke/Pule/Rovinja, koji su već gore)
  {name:'Opatija', vibes:['sea'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Krk', vibes:['sea'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Poreč', vibes:['sea'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Umag', vibes:['sea'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Šibenik', vibes:['sea','city'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Trogir', vibes:['sea','city'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Biograd na Moru', vibes:['sea'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Vodice', vibes:['sea'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:true},
  {name:'Primošten', vibes:['sea'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Makarska', vibes:['sea'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:true},
  {name:'Omiš', vibes:['sea','nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Baška Voda', vibes:['sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Brela', vibes:['sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Tučepi', vibes:['sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Korčula', vibes:['sea','city'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:false},
  {name:'Vela Luka', vibes:['sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Supetar', vibes:['sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Bol', vibes:['sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Mali Lošinj', vibes:['sea','nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Cres', vibes:['sea','nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Rab', vibes:['sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Novalja', vibes:['sea','nightlife'], months:[6,7,8,9], distance:'near', family:false, nightlife:true},
  {name:'Pag', vibes:['sea','nightlife'], months:[6,7,8,9], distance:'near', family:false, nightlife:true},
  {name:'Vis', vibes:['sea','nature'], months:[6,7,8,9], distance:'near', family:false, nightlife:false},
  {name:'Cavtat', vibes:['sea'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:false},
  {name:'Kaštela', vibes:['sea','city'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  // Hrvatska — dopuna: planine
  {name:'Velebit', vibes:['nature'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:false},
  {name:'Biokovo', vibes:['nature'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:false},
  {name:'Risnjak', vibes:['nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Dinara', vibes:['nature'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Učka', vibes:['nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Medvednica', vibes:['nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Papuk', vibes:['nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Psunj', vibes:['nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  // Hrvatska — dopuna: reke, kanjoni i jezera (Sava se NE dodaje ovde — POPULAR_DESTINATIONS
  // već ima istoimeni srpski unos ranije u nizu, pa bi .find() po imenu pogrešno povukao
  // extra:'Srbija'; treba prvo razdvojiti imena, pa tek onda dodati)
  {name:'Krka', vibes:['nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Paklenica', vibes:['nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Cetina', vibes:['nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Zrmanja', vibes:['nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Mirna', vibes:['nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Kupa', vibes:['nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Drava', vibes:['nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Vransko Jezero', vibes:['nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Ljubljana', vibes:['city','nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Bled', vibes:['nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Sarajevo', vibes:['city','nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Mostar', vibes:['city','nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Bukurešt', vibes:['city','nightlife'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:true},
  {name:'Varna', vibes:['sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Istanbul', vibes:['city'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:true},
  {name:'Prag', vibes:['city','nightlife'], months:[3,4,5,6,9,10,11,12], distance:'medium', family:true, nightlife:true},
  {name:'Bratislava', vibes:['city'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Krf', vibes:['sea','nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Atina', vibes:['city','sea'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Santorini', vibes:['sea'], months:[5,6,7,8,9,10], distance:'medium', family:false, nightlife:false},
  {name:'Mikonos', vibes:['sea','nightlife'], months:[6,7,8,9], distance:'medium', family:false, nightlife:true},
  {name:'Rodos', vibes:['sea'], months:[5,6,7,8,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Krit', vibes:['sea','nature'], months:[5,6,7,8,9,10], distance:'medium', family:true, nightlife:false},
  // Grčka — dopuna
  {name:'Zakintos', vibes:['sea'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:false},
  {name:'Kefalonija', vibes:['sea','nature'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:false},
  {name:'Halkidiki', vibes:['sea'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Nafplion', vibes:['city','nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Paros', vibes:['sea','nightlife'], months:[6,7,8,9], distance:'medium', family:false, nightlife:true},
  {name:'Naksos', vibes:['sea'], months:[5,6,7,8,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Kos', vibes:['sea','nightlife'], months:[5,6,7,8,9,10], distance:'medium', family:true, nightlife:true},
  {name:'Rim', vibes:['city'], months:[3,4,5,9,10,11], distance:'medium', family:true, nightlife:false},
  {name:'Milano', vibes:['city','nightlife'], months:[3,4,5,9,10], distance:'medium', family:false, nightlife:true},
  {name:'Venecija', vibes:['city'], months:[3,4,5,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Firenca', vibes:['city'], months:[4,5,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Barselona', vibes:['sea','city','nightlife'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:true},
  {name:'Madrid', vibes:['city','nightlife'], months:[4,5,9,10], distance:'medium', family:true, nightlife:true},
  {name:'Malaga', vibes:['sea'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Ibica', vibes:['sea','nightlife'], months:[6,7,8,9], distance:'medium', family:false, nightlife:true},
  // Španija — dopuna
  {name:'Sevilja', vibes:['city','nightlife'], months:[3,4,5,10,11], distance:'medium', family:true, nightlife:true},
  {name:'Valensija', vibes:['city','sea'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:true},
  {name:'Majorka', vibes:['sea','nightlife'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:true},
  {name:'Granada', vibes:['city','nature'], months:[3,4,5,9,10,11], distance:'medium', family:true, nightlife:false},
  {name:'Tenerife', vibes:['sea'], months:[1,2,3,4,5,10,11,12], distance:'medium', family:true, nightlife:false},
  {name:'San Sebastijan', vibes:['city','sea'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Alikante', vibes:['sea'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Bilbao', vibes:['city'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Toledo', vibes:['city'], months:[3,4,5,9,10,11], distance:'medium', family:true, nightlife:false},
  {name:'Kordoba', vibes:['city'], months:[3,4,5,10,11], distance:'medium', family:true, nightlife:false},
  {name:'Marbelja', vibes:['sea','nightlife'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:true},
  {name:'Benidorm', vibes:['sea','nightlife'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:true},
  {name:'Lisabon', vibes:['city','sea','nightlife'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:true},
  {name:'Porto', vibes:['city'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  // Portugalija — dopuna
  {name:'Faro', vibes:['sea'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Albufeira', vibes:['sea','nightlife'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:true},
  {name:'Madeira', vibes:['sea','nature'], months:[3,4,5,9,10,11], distance:'medium', family:true, nightlife:false},
  {name:'Sintra', vibes:['city','nature'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Koimbra', vibes:['city'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Azori', vibes:['nature','sea'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Pariz', vibes:['city'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Nica', vibes:['sea','city'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'London', vibes:['city','nightlife'], months:[4,5,6,9], distance:'medium', family:true, nightlife:true},
  {name:'Amsterdam', vibes:['city','nightlife'], months:[4,5,6,9], distance:'medium', family:true, nightlife:true},
  {name:'Berlin', vibes:['city','nightlife'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:true},
  {name:'Minhen', vibes:['city'], months:[5,6,9], distance:'medium', family:true, nightlife:false},
  // Nemačka — dopuna (Garmisch-Partenkirchen je već u redu "Skijaški centri")
  {name:'Hamburg', vibes:['city','nightlife'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:true},
  {name:'Keln', vibes:['city','nightlife'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:true},
  {name:'Drezden', vibes:['city'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Nirnberg', vibes:['city'], months:[4,5,9,10,11,12], distance:'medium', family:true, nightlife:false},
  {name:'Hajdelberg', vibes:['city'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Potsdam', vibes:['city','nature'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Nojšvanštajn', vibes:['nature'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Bodensko Jezero', vibes:['nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Cirih', vibes:['city','nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  // Švajcarska — dopuna
  {name:'Ženeva', vibes:['city'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Bern', vibes:['city'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Lucern', vibes:['city','nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Interlaken', vibes:['nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Lugano', vibes:['city','nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Grindelvald', vibes:['nature','ski'], months:[12,1,2,3,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Cermat', vibes:['ski','nature'], months:[12,1,2,3,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Antalija', vibes:['sea'], months:[5,6,7,8,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Bodrum', vibes:['sea','nightlife'], months:[6,7,8,9], distance:'medium', family:false, nightlife:true},
  {name:'Kapadokija', vibes:['nature'], months:[4,5,9,10], distance:'medium', family:true, nightlife:false},
  // Turska — more i primorje
  {name:'Marmaris', vibes:['sea','nightlife'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:true},
  {name:'Fetije', vibes:['sea','nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Alanja', vibes:['sea'], months:[5,6,7,8,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Kušadasi', vibes:['sea'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Side', vibes:['sea'], months:[5,6,7,8,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Kaš', vibes:['sea','nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Kalkan', vibes:['sea'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Datča', vibes:['sea','nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Česme', vibes:['sea','nightlife'], months:[5,6,7,8,9], distance:'medium', family:false, nightlife:true},
  {name:'Ajvalik', vibes:['sea','nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  // Turska — gradovi i kultura
  {name:'Izmir', vibes:['city','sea'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:true},
  {name:'Ankara', vibes:['city'], months:[4,5,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Bursa', vibes:['city','nature'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Trabzon', vibes:['city','nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Gaziantep', vibes:['city'], months:[3,4,5,9,10,11], distance:'medium', family:true, nightlife:false},
  {name:'Eskišehir', vibes:['city'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Safranbolu', vibes:['city','nature'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  // Turska — antička i kulturna mesta
  {name:'Efes', vibes:['city','nature'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Pamukale', vibes:['nature'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Nemrut', vibes:['nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Pergamon', vibes:['nature'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Gjobekli Tepe', vibes:['nature'], months:[4,5,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Sumela', vibes:['nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  // Turska — ski centri
  {name:'Uludag', vibes:['ski','nature'], months:[12,1,2,3], distance:'medium', family:true, nightlife:false},
  {name:'Kartalkaja', vibes:['ski','nature'], months:[12,1,2,3], distance:'medium', family:true, nightlife:false},
  {name:'Palandoken', vibes:['ski','nature'], months:[12,1,2,3], distance:'medium', family:true, nightlife:false},
  {name:'Ercijes', vibes:['ski','nature'], months:[12,1,2,3], distance:'medium', family:true, nightlife:false},
  // Turska — jezera i priroda
  {name:'Jezero Van', vibes:['nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Jezero Tuz', vibes:['nature'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Jezero Bejšehir', vibes:['nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Tel Aviv', vibes:['sea','city','nightlife'], months:[4,5,6,9,10], distance:'medium', family:false, nightlife:true},
  {name:'Dubai', vibes:['city'], months:[11,12,1,2,3], distance:'medium', family:true, nightlife:true},
  {name:'Kairo', vibes:['city','nature'], months:[10,11,12,1,2,3], distance:'medium', family:true, nightlife:false},
  {name:'Šarm El Šeik', vibes:['sea'], months:[10,11,12,1,2,3,4], distance:'medium', family:true, nightlife:false},
  {name:'Marakeš', vibes:['city'], months:[3,4,10,11], distance:'medium', family:true, nightlife:false},
  {name:'Njujork', vibes:['city','nightlife'], months:[4,5,9,10,12], distance:'far', family:true, nightlife:true},
  {name:'Majami', vibes:['sea','nightlife'], months:[11,12,1,2,3,4], distance:'far', family:true, nightlife:true},
  {name:'Los Anđeles', vibes:['city','sea'], months:[3,4,5,9,10], distance:'far', family:true, nightlife:false},
  {name:'Bangkok', vibes:['city','nightlife'], months:[11,12,1,2], distance:'far', family:true, nightlife:true},
  {name:'Puket', vibes:['sea'], months:[11,12,1,2,3], distance:'far', family:true, nightlife:false},
  {name:'Tokio', vibes:['city'], months:[3,4,5,10,11], distance:'far', family:true, nightlife:false},
  {name:'Bali', vibes:['sea','nature'], months:[5,6,7,8,9], distance:'far', family:true, nightlife:false},
  {name:'Singapur', vibes:['city'], months:[1,2,3,4,11,12], distance:'far', family:true, nightlife:true},
  {name:'Sidnej', vibes:['city','sea'], months:[10,11,12,1,2,3], distance:'far', family:true, nightlife:false},
  {name:'Kejptaun', vibes:['nature','sea'], months:[10,11,12,1,2,3], distance:'far', family:true, nightlife:false},
  // Dodato — popularne "paket" destinacije (charter, zimovanja, egzotika)
  {name:'Tunis (grad)', vibes:['city','sea'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Hamamet', vibes:['sea'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Sus', vibes:['sea','nightlife'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:true},
  {name:'Monastir', vibes:['sea'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Đerba', vibes:['sea'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Havana', vibes:['city','sea'], months:[11,12,1,2,3,4], distance:'far', family:true, nightlife:true},
  {name:'Varadero', vibes:['sea'], months:[11,12,1,2,3,4], distance:'far', family:true, nightlife:false},
  {name:'Punta Kana', vibes:['sea'], months:[11,12,1,2,3,4], distance:'far', family:true, nightlife:false},
  {name:'Santo Domingo', vibes:['city','sea'], months:[11,12,1,2,3,4], distance:'far', family:true, nightlife:true},
  {name:'Zanzibar', vibes:['sea','nature'], months:[6,7,8,9,10,1,2], distance:'far', family:true, nightlife:false},
  {name:'Mauricijus', vibes:['sea','nature'], months:[5,6,7,8,9,10,11], distance:'far', family:false, nightlife:false},
  {name:'Mahe', vibes:['sea','nature'], months:[4,5,10,11], distance:'far', family:false, nightlife:false},
  {name:'Sal', vibes:['sea'], months:[11,12,1,2,3,4], distance:'far', family:true, nightlife:false},
  {name:'Karpatos', vibes:['sea','nature'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Parga', vibes:['sea','nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Sivota', vibes:['sea','nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  // Skandinavija — gradovi
  {name:'Oslo', vibes:['city','nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Bergen', vibes:['city','nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Tromse', vibes:['nature'], months:[11,12,1,2,3], distance:'medium', family:true, nightlife:false},
  {name:'Stavanger', vibes:['city','nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Lofoti', vibes:['nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Kopenhagen', vibes:['city','nightlife'], months:[4,5,6,7,8,9], distance:'medium', family:true, nightlife:true},
  {name:'Arhus', vibes:['city'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Stokholm', vibes:['city','nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:true},
  {name:'Geteborg', vibes:['city','nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  // Skandinavija — fjordovi i priroda
  {name:'Geiranger', vibes:['nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Sognefjord', vibes:['nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Nærojfjord', vibes:['nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Preikestolen', vibes:['nature'], months:[5,6,7,8,9], distance:'medium', family:false, nightlife:false},
  {name:'Trolltunga', vibes:['nature'], months:[6,7,8,9], distance:'medium', family:false, nightlife:false},
  {name:'Nordkapp', vibes:['nature'], months:[6,7,8], distance:'medium', family:true, nightlife:false},
  {name:'Flom', vibes:['nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Jotunheimen', vibes:['nature'], months:[6,7,8,9], distance:'medium', family:false, nightlife:false},
  {name:'Abisko', vibes:['nature'], months:[11,12,1,2,3], distance:'medium', family:true, nightlife:false},
  {name:'Gotland', vibes:['sea','nature'], months:[6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Bornholm', vibes:['sea','nature'], months:[6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Faroe ostrva', vibes:['nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Dalarna', vibes:['nature'], months:[5,6,7,8,9,12,1,2], distance:'medium', family:true, nightlife:false},
  // Skandinavija — ski centri
  {name:'Are', vibes:['ski','nature'], months:[12,1,2,3], distance:'medium', family:true, nightlife:true},
  {name:'Hemsedal', vibes:['ski','nature'], months:[12,1,2,3], distance:'medium', family:true, nightlife:true},
  {name:'Geilo', vibes:['ski','nature'], months:[12,1,2,3], distance:'medium', family:true, nightlife:false},
  {name:'Trysil', vibes:['ski','nature'], months:[12,1,2,3], distance:'medium', family:true, nightlife:false},
  {name:'Salen', vibes:['ski','nature'], months:[12,1,2,3], distance:'medium', family:true, nightlife:false},
  // Skandinavija — jezera
  {name:'Vänern', vibes:['nature'], months:[6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Vättern', vibes:['nature'], months:[6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Siljan', vibes:['nature'], months:[6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Mjøsa', vibes:['nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  // Skijaški centri — najpoznatije skijalište po zemlji (koristi ih red "Skijaški centri", zamena za "Blizu Srbije").
  {name:'Žabljak', vibes:['ski','nature'], months:[12,1,2,3], distance:'near', family:true, nightlife:false},
  {name:'Kicbil', vibes:['ski'], months:[12,1,2,3], distance:'near', family:true, nightlife:true},
  {name:'Garmisch-Partenkirchen', vibes:['ski','nature'], months:[12,1,2,3], distance:'medium', family:true, nightlife:false},
  {name:'Kopaonik', vibes:['ski','nature'], months:[12,1,2,3], distance:'near', family:true, nightlife:false},
  {name:'Šamoni', vibes:['ski','nature'], months:[12,1,2,3], distance:'medium', family:true, nightlife:true},
  {name:'St. Anton am Arlberg', vibes:['ski'], months:[12,1,2,3], distance:'near', family:false, nightlife:true},
  {name:'Kranjska Gora', vibes:['ski','nature'], months:[12,1,2,3], distance:'near', family:true, nightlife:false},
  {name:'Jahorina', vibes:['ski','nature'], months:[12,1,2,3], distance:'near', family:true, nightlife:false},
];

// Puna lista za kviz: spaja tagove sa državom iz POPULAR_DESTINATIONS.
// Ako mesto iz MATCH_DESTINATIONS_TAGS slučajno ne postoji u POPULAR_DESTINATIONS,
// preskače se (umesto da uđe u kviz sa praznom državom).
const MATCH_DESTINATIONS = MATCH_DESTINATIONS_TAGS.map(t => {
  const pop = POPULAR_DESTINATIONS.find(d => d.name === t.name);
  if (!pop) return null;
  return {name:t.name, extra:pop.extra, vibes:t.vibes, months:t.months, distance:t.distance, family:t.family, nightlife:t.nightlife};
}).filter(Boolean);

// Getteri, pa oznake prate trenutni jezik (koristi ih matchReasonSentence i naslov rezultata).
const MATCH_VIBE_LABELS = {
  get sea(){ return t('mvibe_sea'); }, get city(){ return t('mvibe_city'); }, get nature(){ return t('mvibe_nature'); },
  get nightlife(){ return t('mvibe_nightlife'); }, get mix(){ return t('mvibe_mix'); }
};
// Naziv meseca u obliku koji traži rečenica mreason_season (npr. sr: "sezona za maj",
// ru: predloški padež). Vrednosti su u *.json pod 'match_month.1'..'match_month.12'.
function matchMonthName(month){ return t('match_month.' + month); }

// Deo bodovanja koji NE zavisi od cene (poklapanje sa odgovorima,
// sezonom i dužinom puta) — cena/budžet se dodaje posebno u
// pickMatchDestinations, pošto cena zavisi od već izračunatog pkg-a.
function computeMatchFitScore(cand, answers, nights, month){
  const tags = cand.tags;
  const reasons = [];
  let score = 0;

  // Šta ti znači odmor? (do 34 poena)
  if (answers.vibe === 'mix'){
    score += Math.min(34, 14 + tags.vibes.length * 7);
    reasons.push('vibe_mix');
  } else if (tags.vibes.includes(answers.vibe)){
    score += 34;
    reasons.push('vibe_' + answers.vibe);
  } else {
    score += 6;
  }

  // Sezona — mesec polaska iz već izabranih datuma (do 22 poena)
  if (tags.months.includes(month)){
    score += 22;
    reasons.push('season');
  } else {
    const prev = month === 1 ? 12 : month - 1;
    const next = month === 12 ? 1 : month + 1;
    if (tags.months.includes(prev) || tags.months.includes(next)) score += 11;
  }

  // Dužina puta iz već izabranih datuma vs udaljenost destinacije (do 20 poena)
  // — vikend putovanje ne predlaže interkontinentalni let, dug odmor
  // favorizuje udaljenije destinacije.
  if (nights <= 3){
    if (tags.distance === 'near') { score += 20; reasons.push('near_fit'); }
    else if (tags.distance === 'medium') score += 6;
  } else if (nights <= 7){
    if (tags.distance === 'medium') { score += 18; reasons.push('length_fit'); }
    else if (tags.distance === 'near') score += 14;
    else score += 9;
  } else {
    if (tags.distance === 'far') { score += 20; reasons.push('length_fit'); }
    else score += 13;
  }

  // Sa kim putuješ? (do 14 poena)
  if (answers.companion === 'family'){
    if (tags.family) { score += 14; reasons.push('family'); }
    else score += 2;
  } else if (answers.companion === 'friends'){
    if (tags.nightlife) { score += 14; reasons.push('nightlife'); }
    else score += 6;
  } else if (answers.companion === 'couple'){
    if (tags.vibes.includes('sea') || tags.vibes.includes('city')) { score += 12; reasons.push('romantic'); }
    else score += 6;
  } else {
    score += 10;
  }

  return {score, reasons};
}

function computeMatchCandidates(from, to, adults, flags){
  const nights = nightsBetween(from, to);
  const days = nights;
  // Polazište iz forme — utiče na cenu leta (flightRouteMult) i na deep link.
  const matchOrigin = (document.getElementById('origin') || {}).value || '';
  return MATCH_DESTINATIONS.map(d => {
    const seed = hashSeed(d.name.toLowerCase()+d.name.length+nights+adults);
    const rng = seededRandom(seed);
    const factor = marketFactor(d.name, todayStr());
    const pkg = buildPackage(rng, d.name, nights, days, adults, 'best', flags, factor, matchOrigin, seasonFactor(d.name, from));
    attachAffiliateLinks(pkg, d.name, from, to, adults, {originCode: matchOrigin, flags});
    return {dest:d.name, country:d.extra||'', pkg, tags:d};
  });
}

// Rangira SVE kandidate po poklapanju + budžetu i vraća top `count`,
// plus ceo rangirani pool (za "Drugih 3 predloga" i fino podešavanje
// bez ponovnog otvaranja upitnika).
function pickMatchDestinations(answers, budget, candidates, nights, month, count){
  const scored = candidates.map(c => {
    const fit = computeMatchFitScore(c, answers, nights, month);
    let bonus = 0;
    let fitsBudget = true;
    if (budget){
      const ratio = c.pkg.total / budget;
      fitsBudget = ratio <= 1;
      bonus = fitsBudget ? 10 : Math.max(-24, 10 - (ratio - 1) * 40);
      if (fitsBudget) fit.reasons.push('budget');
    }
    const total = fit.score + bonus;
    const matchPct = Math.max(35, Math.min(98, Math.round(total)));
    return Object.assign({}, c, {matchScore: total, matchPct, reasons: fit.reasons, fitsBudget});
  });
  scored.sort((a, b) => b.matchScore - a.matchScore);
  const usedFallback = !!budget && !scored.slice(0, count).every(s => s.fitsBudget);
  return {picks: scored.slice(0, count), pool: scored, usedFallback};
}

// Kratka rečenica "Zato što…" — objašnjava PREPORUKU umesto da samo
// pokaže cenu, tako da korisnik vidi zašto baš taj grad, ne samo koliko košta.
function matchReasonSentence(pick, answers, month){
  const bits = [];
  const r = pick.reasons;
  if (r.some(x => x.startsWith('vibe_'))) bits.push(tf('mreason_vibe', {vibe: MATCH_VIBE_LABELS[answers.vibe] || t('mvibe_default')}));
  if (r.includes('season')) bits.push(tf('mreason_season', {month: matchMonthName(month)}));
  if (r.includes('near_fit') || r.includes('length_fit')) bits.push(t('mreason_length'));
  if (r.includes('family')) bits.push(t('mreason_family'));
  if (r.includes('nightlife')) bits.push(t('mreason_nightlife'));
  if (r.includes('romantic')) bits.push(t('mreason_romantic'));
  if (r.includes('budget')) bits.push(t('mreason_budget'));
  const top = bits.slice(0, 2);
  if (!top.length) return t('mreason_fallback');
  return tf('mreason_intro', {reasons: top.join(' ' + t('pkg_desc_and') + ' ')});
}

/* ==========================================================
   Loading skeleton — prikazuje se u #resultsBody dok se ponuda
   računa (lokalno ili sa backend-a), umesto praznog ekrana ili
   golog spinnera. Oblik prati stvarne .pkg/.item-card kartice
   (3 paketa x 3 stavke) da ne dođe do skoka layout-a kad prava
   ponuda stigne. ========================================================== */
function skeletonItemHtml(){
  return `
  <div class="skel-item">
    <div class="skel skel-photo"></div>
    <div class="skel-item-body">
      <div class="skel skel-label"></div>
      <div class="skel skel-name"></div>
      <div class="skel skel-sub2"></div>
      <div class="skel skel-price2"></div>
      <div class="skel skel-btn"></div>
    </div>
  </div>`;
}

function skeletonPkgHtml(){
  return `
  <div class="skel-pkg">
    <div class="skel-pkg-head">
      <div>
        <div class="skel skel-badge"></div>
        <div class="skel skel-title"></div>
        <div class="skel skel-sub"></div>
      </div>
      <div>
        <div class="skel skel-price"></div>
        <div class="skel skel-price-cur"></div>
      </div>
    </div>
    <div class="skel-items-row">${skeletonItemHtml()}${skeletonItemHtml()}${skeletonItemHtml()}</div>
  </div>`;
}

function skeletonResultsHtml(loadingText){
  return `
  <div class="skel-packages" role="status" aria-busy="true" aria-live="polite">
    <span class="sr-only">${escapeHtml(loadingText || '')}</span>
    ${skeletonPkgHtml()}${skeletonPkgHtml()}${skeletonPkgHtml()}
  </div>`;
}

/* ==========================================================
   Slajder za pakete (Budget/Comfort/Best Value) — na mobilnom
   se 3 kartice prikazuju kao horizontalni slajder sa snap-om i
   tačkicama umesto naslaganih jedna ispod druge (na širim
   ekranima CSS ih vraća u 3 kolone, vidi @media u styles.css).
========================================================== */
function packagesSliderHtml(cardsHtml){
  const dots = cardsHtml.length > 1
    ? `<div class="packages-dots">${cardsHtml.map((_,i)=>`<button type="button" class="packages-dot${i===0?' active':''}" data-idx="${i}" aria-label="Prikaži ponudu ${i+1}"></button>`).join('')}</div>`
    : '';
  return `<div class="packages-slider-wrap"><div class="packages">${cardsHtml.join('')}</div>${dots}</div>`;
}

function initPackagesSlider(wrap){
  if (!wrap) return;
  const track = wrap.querySelector('.packages');
  const dotsWrap = wrap.querySelector('.packages-dots');
  if (!track || !dotsWrap) return;
  track.scrollLeft = 0;
  const cards = Array.from(track.querySelectorAll('.pkg'));
  const dots = Array.from(dotsWrap.querySelectorAll('.packages-dot'));
  if (cards.length < 2) return;
  const setActive = (idx) => dots.forEach((d,i)=>d.classList.toggle('active', i===idx));
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = Number(dot.dataset.idx);
      const card = cards[idx];
      if (card) card.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'});
    });
  });
  if ('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6){
          const idx = cards.indexOf(entry.target);
          if (idx > -1) setActive(idx);
        }
      });
    }, {root:track, threshold:[0.6]});
    cards.forEach(c => io.observe(c));
  }
}

function rebuildPackagesDots(sliderWrap){
  if (!sliderWrap) return;
  const track = sliderWrap.querySelector('.packages');
  const dotsWrap = sliderWrap.querySelector('.packages-dots');
  if (!track) return;
  const cards = Array.from(track.querySelectorAll('.pkg'));
  if (!dotsWrap) return;
  if (cards.length < 2){ dotsWrap.remove(); return; }
  dotsWrap.innerHTML = cards.map((_,i)=>`<button type="button" class="packages-dot${i===0?' active':''}" data-idx="${i}" aria-label="Prikaži ponudu ${i+1}"></button>`).join('');
  initPackagesSlider(sliderWrap);
}

/* Centrira dati element u vidljivom prostoru ISPOD sticky top bara.
   Native scrollIntoView({block:'center'}) centrira CEO element — a
   #resultsBody (3 kartice u slajderu + tačkice + disclaimer pasus ispod)
   je često viši od ekrana, pa "centriranje" celog bloka gurne njegov vrh
   (deo koji korisnik treba da vidi) gore, ispod/iza sticky menija. Zato
   ovde ciljamo KONKRETAN element (npr. samu prvu karticu ponude) i
   centriramo SAMO njega u prostoru koji ostaje ispod menija. */
function scrollIntoCenterBelowHeader(el){
  if (!el) return;
  const topbarH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 0;
  const rect = el.getBoundingClientRect();
  const availableH = window.innerHeight - topbarH;
  const elH = Math.min(rect.height, availableH);
  const targetTopInViewport = topbarH + Math.max(0, (availableH - elH) / 2);
  const currentY = window.scrollY || window.pageYOffset;
  const elTopAbs = rect.top + currentY;
  window.scrollTo({top: Math.max(0, elTopAbs - targetTopInViewport), behavior:'smooth'});
}

/* ==========================================================
   Rezultati (3 kartice ponuda) kao zaseban prozor na mobilnom
   ==========================================================
   Na širem ekranu #results ostaje običan deo stranice (kao pre).
   Na mobilnom (<=760px) otvara se kao "bottom sheet" preko sadržaja:
   80% visine ekrana, pozadina stranice je zaključana (position:fixed
   trik, isti obrazac kao kod kalendara), a "Nazad" dugme zatvara sheet
   i vraća korisnika tačno tamo gde je bio na sajtu. Bez ovoga je skrol
   prstom unutar kartica u praksi skrolovao CEO sajt, jer su kartice
   bile samo deo obične stranice, a ne svoj prozor.
========================================================== */
let _resultsScrollY = 0;
const isMobileResults = () => window.matchMedia('(max-width:760px)').matches;

let _resultsScrollLocked = false;
// Isti razlog/rešenje kao kod kalendara/putnika (vidi lockPageScroll tamo).
function lockResultsPageScroll(){
  if (_resultsScrollLocked) return;
  _resultsScrollLocked = true;
  _resultsScrollY = window.scrollY;
  setTimeout(() => {
    if (!_resultsScrollLocked) return;
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + _resultsScrollY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }, 0);
}
function unlockResultsPageScroll(){
  _resultsScrollLocked = false;
  setTimeout(() => {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    // behavior:'instant' iz istog razloga kao kod kalendara/putnika — bez
    // ovoga skrol animirano "leti" preko celog sajta (vidljivo i kod
    // zatvaranja rezultata i kod zatvaranja vodiča-po-stavci/feature-guide,
    // koji deli ovu istu funkciju za otključavanje skrola).
    window.scrollTo({top: _resultsScrollY, left: 0, behavior: 'instant'});
  }, 0);
}

function openResultsSheet(){
  const results = document.getElementById('results');
  if (!results) return;
  const wasVisible = results.classList.contains('visible');
  results.classList.add('visible');
  const backdrop = document.getElementById('resultsBackdrop');
  if (isMobileResults()){
    if (backdrop) backdrop.classList.add('open');
    results.setAttribute('role', 'dialog');
    results.setAttribute('aria-modal', 'true');
    if (!wasVisible || !_resultsScrollLocked) lockResultsPageScroll();
    guardOverlayOpen('results', closeResultsSheet);
  }
}

function requestCloseResultsSheet(){
  if (!guardOverlayRequestClose('results')) closeResultsSheet();
}

function closeResultsSheet(){
  const results = document.getElementById('results');
  if (!results) return;
  const backdrop = document.getElementById('resultsBackdrop');
  const wasLocked = _resultsScrollLocked;
  results.classList.remove('visible');
  if (backdrop) backdrop.classList.remove('open');
  results.removeAttribute('role');
  results.removeAttribute('aria-modal');
  if (wasLocked) unlockResultsPageScroll();
  const trigger = document.querySelector('.btn-search-main');
  if (trigger) trigger.focus();
}

(function(){
  const backBtn = document.getElementById('resultsBackBtn');
  const backdrop = document.getElementById('resultsBackdrop');
  if (backBtn) backBtn.addEventListener('click', () => requestCloseResultsSheet());
  if (backdrop) backdrop.addEventListener('click', () => requestCloseResultsSheet());
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const results = document.getElementById('results');
    if (results && results.classList.contains('visible') && isMobileResults()) requestCloseResultsSheet();
  });
  // Ako se ekran "prebaci" preko 760px dok je sheet otvoren (npr. rotacija
  // tableta), skini zaključavanje skrola — na širem ekranu #results više
  // nije fiksni sheet, pa zaključana pozadina ne bi imala smisla.
  window.addEventListener('resize', () => {
    const results = document.getElementById('results');
    if (!results || !results.classList.contains('visible')) return;
    if (!isMobileResults() && _resultsScrollLocked){
      unlockResultsPageScroll();
      const backdrop = document.getElementById('resultsBackdrop');
      if (backdrop) backdrop.classList.remove('open');
      results.removeAttribute('role');
      results.removeAttribute('aria-modal');
      guardOverlayDrop('results');
    }
  });
  // Isto i za #planDetail/#planBreakdown — ako se ekran "prebaci" preko
  // 760px dok su otvoreni (npr. rotacija tableta), skini klasu .open
  // (position:fixed) i zaključavanje skrola; na širem ekranu su to opet
  // obične sekcije u toku stranice.
  window.addEventListener('resize', () => {
    const detail = document.getElementById('planDetail');
    const breakdown = document.getElementById('planBreakdown');
    const detailOpen = detail && detail.classList.contains('open');
    const breakdownOpen = breakdown && breakdown.classList.contains('open');
    if (!detailOpen && !breakdownOpen) return;
    if (!isMobileResults()){
      if (detail) detail.classList.remove('open');
      if (breakdown) breakdown.classList.remove('open');
      if (_resultsScrollLocked) unlockResultsPageScroll();
    }
  });
})();

function showResultsError(){
  const body = document.getElementById('resultsBody');
  if (!body) return;
  body.classList.remove('rb-hidden', 'rb-swap-out');
  body.classList.add('rb-reveal');
  body.innerHTML = '<div class="disclaimer" role="alert" style="text-align:center;padding:18px 12px;">'
    + '<p style="margin:0 0 10px;">' + t('offers_load_error') + '</p>'
    + '<button type="button" class="pkg-alert-btn" onclick="runSearch(false)">' + t('offers_retry') + '</button></div>';
}
// Destinacija koju ne prepoznajemo ni u jednoj našoj bazi — korisniku javljamo
// da je ponuda okvirna, umesto da tiho prikažemo izmišljen "<grad> Hotel".
function isKnownDestination(destRaw){
  const key = normalizeSr(String(destRaw || '').split(',')[0].trim());
  if (!key) return false;
  if (POPULAR_DESTINATIONS.some(d => normalizeSr(d.name) === key)) return true;
  if (MATCH_DESTINATIONS.some(d => normalizeSr(d.name) === key)) return true;
  return !!airportInfoFor(destRaw);
}
async function renderResults(dest, from, to, nights, days, adults, flags, originCode, autoReveal, seq){
  try {
    await renderResultsInner(dest, from, to, nights, days, adults, flags, originCode, autoReveal, seq);
  } catch (err) {
    console.error('[sklopi] prikaz ponuda nije uspeo:', err);
    if (seq !== undefined && seq !== window._searchSeq) return;
    showResultsError();
  }
}
async function renderResultsInner(dest, from, to, nights, days, adults, flags, originCode, autoReveal, seq){
  const backendPkgs = await fetchPackagesFromBackend({
    dest, from, to, adults, originCode, flags
  });
  if (seq !== undefined && seq !== window._searchSeq) return; // stigla je novija pretraga
  const pkgs = backendPkgs || computePackagesLocally(dest, from, to, nights, days, adults, flags, originCode);
  // Ako je korisnik na početnoj izabrao Budžet / Balans / Komfor, taj paket ide prvi i nosi oznaku "Preporučeno".
  if (window.SKLOPI_tierChosen && Array.isArray(pkgs)){
    const want = {budget:'budget', balance:'best', comfort:'comfort'}[window.SKLOPI_tier];
    if (want && pkgs.some(p => p.tier === want)){
      pkgs.sort((x, y) => (y.tier === want) - (x.tier === want));
      pkgs.forEach(p => { p.recommended = (p.tier === want); });
    }
  }

  // Global kontekst za "Sačuvaj ovu ponudu" dugme na svakoj kartici —
  // isti obrazac kao window._lastBuilderPkg za builder.
  window._lastSearchPkgs = pkgs;
  window._lastSearchCtx = {dest, from, to, adults, nights, flags};

  document.getElementById('ctaTitle').textContent = tf('cta_title', {dest: cityLabel(dest)});
  document.getElementById('ctaDesc').textContent = ctaCopy(dest);

  const head = document.getElementById('resultsHead');
  const altNote = altAirportNoteFor(originCode);
  const destNote = destAirportNoteFor(dest);
  const unknownNote = isKnownDestination(dest) ? '' : tf('unknown_dest_note', {dest: dest});
  // Link ka stranici destinacije (destinacija.html): letovi, smeštaj, atrakcije, ruta i saveti za iste datume.
  // Prikazan kao kartica (dest-page-card) iznad ponuda, u istom vizuelnom jeziku kao ostale bele kartice sa senkom.
  const destPageUrl = 'destinacija.html?' + new URLSearchParams({
    od: originCode || 'Beograd', do: dest, polazak: from, povratak: to, putnika: String(adults)
  }).toString();
  const destPageNote = `<a class="dest-page-card" href="${escapeHtml(destPageUrl)}">` +
    `<span class="dpc-ic" aria-hidden="true">🧭</span>` +
    `<span class="dpc-text"><span class="dpc-title">Sve o putu na jednom mestu</span>` +
    `<span class="dpc-sub">Letovi, smeštaj, atrakcije, ruta i saveti za tvoje datume.</span></span>` +
    `<span class="dpc-arrow" aria-hidden="true">→</span></a>`;
  const notes = [
    unknownNote ? `<div class="plan-note">🔎 ${escapeHtml(unknownNote)}</div>` : '',
    altNote ? `<div class="plan-note">✈️ <b>Isplati li se let preko drugog aerodroma?</b><br>${escapeHtml(altNote)}</div>` : '',
    destNote ? `<div class="plan-note">🛬 <b>Pazi na koji aerodrom slećeš</b><br>${escapeHtml(destNote)}</div>` : ''
  ].filter(Boolean).join('');
  head.innerHTML = destPageNote + (notes ? `<div class="plan-notes">${notes}</div>` : '');

  // "Tvoj plan" kartica (naslov, Nastavi dugme i builder link) je uklonjena —
  // paketi se sada prikazuju odmah, bez međukoraka. Zamena skeletona
  // pravim karticama ide kroz kratki fade-out/fade-in (rb-swap-out), da
  // prelaz izgleda smišljeno, a ne kao nagli skok sadržaja.
  const body = document.getElementById('resultsBody');
  const hadSkeleton = !!body.querySelector('.skel-packages');
  body.classList.add('rb-swap-out');
  setTimeout(() => {
    if (seq !== undefined && seq !== window._searchSeq) return;
    try {
      body.innerHTML = `${packagesSliderHtml(pkgs.map(pkgHtml))}${typeof transportCardHtml === 'function' ? transportCardHtml(dest, adults, originCode, flags) : ''}`;
      initPackagesSlider(body.querySelector('.packages-slider-wrap'));
      body.classList.remove('rb-swap-out');
      body.classList.remove('rb-hidden');
      body.classList.add('rb-reveal');

      requestAnimationFrame(() => {
        scrollIntoCenterBelowHeader(body.querySelector('.packages .pkg') || body);
      });
    } catch (err) {
      console.error('[sklopi] iscrtavanje kartica nije uspelo:', err);
      showResultsError();
    }
  }, hadSkeleton ? 180 : 0);
}

/* ---- Vidljiva oznaka "affiliate/sponzorisan link" pored svake CTA
   rezervacije — potrošačka zaštita/transparentnost, ne samo FTC. ---- */
function affBadgeHtml(opts){
  // opts.plain: bez tabindex-a — za oznaku UNUTAR <a> kartice (fokusabilan element u linku nije dobar).
  const focus = (opts && opts.plain) ? '' : ' tabindex="0"';
  return `<span class="aff-badge" title="${escapeHtml(t('aff_badge_title'))}" data-i18n-title="aff_badge_title"${focus}>🔗 <span data-i18n="aff_badge">${escapeHtml(t('aff_badge'))}</span></span>`;
}

function itemCardHtml(item, kind, pkg){
  if (!item) return '';
  const labels = {flight:t('item_label_flight'), hotel:t('item_label_hotel'), car:t('item_label_car')};
  const btnKey = {flight:'btn_search_kayak', hotel:'btn_book_booking', car:'btn_book_booking'};
  return `
  <div class="item-card ${kind}">
    <div class="item-photo ${kind}">${iconSvg(kind)}</div>
    <div class="item-body">
      <div class="item-label"><span data-i18n="item_label_${kind}">${labels[kind]}</span>${item.providerLabel!=='SKLOPI' ? `<span class="item-provider">${escapeHtml(item.providerLabel)}</span>` : ''}</div>
      <div class="item-name">${escapeHtml(item.name)}</div>
      <div class="item-sub">${escapeHtml(item.sub)}</div>
      ${item.perks && item.perks.length ? `<ul class="item-perks">${item.perks.map(pk => `<li class="perk ${pk.pos === true ? 'pos' : pk.pos === false ? 'neg' : 'neu'}" data-i18n="${pk.k}">${escapeHtml(t(pk.k))}</li>`).join('')}</ul>` : ''}
      <div class="item-price tabular">${fmtEUR(item.price)}</div>
      <a class="item-btn ${kind}" href="${escapeHtml(item.bookUrl||'#')}" target="_blank" rel="noopener sponsored" data-kind="${kind}" data-price="${item.price}" data-url="${escapeHtml(item.bookUrl||'')}" data-dest="${escapeHtml(pkg&&pkg.dest||'')}" data-tier="${escapeHtml(pkg&&pkg.tier||'')}" onclick="bookItem(this)" data-i18n="${btnKey[kind]}">${escapeHtml(t(btnKey[kind]))}</a>
      ${affBadgeHtml()}
    </div>
  </div>`;
}

function pkgHtml(pkg){
  const meta = TIER_META[pkg.tier];
  const featured = pkg.recommended;
  const itemsRow = [
    itemCardHtml(pkg.flight,'flight',pkg),
    itemCardHtml(pkg.hotel,'hotel',pkg),
    itemCardHtml(pkg.car,'car',pkg)
  ].filter(Boolean).join('');

  return `
  <div class="pkg ${pkg.tier} ${featured?'featured':''}" data-base-total="${pkg.total}">
    <button type="button" class="pkg-close" onclick="closePkgCard(this)" aria-label="${escapeHtml(t('pkg_close'))}" title="${escapeHtml(t('pkg_close'))}" data-i18n-aria-label="pkg_close" data-i18n-title="pkg_close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
    <div class="pkg-head">
      <div class="pkg-head-main">
        ${featured ? `<span class="pkg-badge" data-i18n="pkg_recommended">${escapeHtml(t('pkg_recommended'))}</span>` : ''}
        <h3>${meta.label}</h3>
        <div class="pkg-desc">${pkgDescText(pkg)}</div>
        <div class="pkg-total">
          <div class="num tabular">${fmtEUR(pkg.total)}</div>
          <div class="cur" data-i18n="builder_total_sub">${escapeHtml(t('builder_total_sub'))}</div>
          <div class="hint" data-i18n="pkg_total_hint">${escapeHtml(t('pkg_total_hint'))}</div>
        </div>
      </div>
      <div class="pkg-score-box score-${pkg.score>=80?'good':pkg.score>=60?'mid':'low'}">
        <div class="score-num tabular">${pkg.score}</div>
        <div class="score-max">/100</div>
        <div class="score-label" data-i18n-html="pkg_score_label">${t('pkg_score_label')}</div>
      </div>
    </div>
    ${itemsRow ? `<div class="items-row">${itemsRow}</div>` : ''}
    ${(() => {
      const extraTiles = [
        pkg.activity ? `<div class="extra activity-extra">${iconSvg('activity')}<div><div class="lab">${escapeHtml(pkg.activity.name.split(' — ')[0])}</div><div class="val tabular">${fmtEUR(pkg.activity.price)}</div></div><a class="extra-btn" href="${escapeHtml(pkg.activity.bookUrl||'#')}" target="_blank" rel="noopener sponsored" data-kind="activity" data-price="${pkg.activity.price}" data-url="${escapeHtml(pkg.activity.bookUrl||'')}" data-dest="${escapeHtml(pkg.dest||'')}" data-tier="${escapeHtml(pkg.tier||'')}" onclick="bookItem(this)">Viator</a>${affBadgeHtml()}</div>` : '',
        pkg.car ? `<div class="extra fuel-extra">${iconSvg('fuel')}<div><div class="lab">${t('fuel_estimate')}</div><div class="val tabular">${fmtEUR(pkg.fuel)}</div></div></div>` : '',
        pkg.car ? `<div class="extra tolls-extra">${iconSvg('tolls')}<div><div class="lab">${t('tolls_estimate')}</div><div class="val tabular">${fmtEUR(pkg.tolls)}</div></div></div>` : ''
        // Osiguranje i eSIM dodaci su uklonjeni sa ovih kartica — sad se
        // biraju u sekciji "Kontrola sadržaja" (builder), da kartice
        // ponude ostanu pregledne. pkg.insuranceCost/esimCost i dalje
        // postoje u pkg objektu (koristi ih builder), samo se ovde ne
        // renderuju.
      ].filter(Boolean).join('');
      return extraTiles ? `<div class="extras-row">${extraTiles}</div>` : '';
    })()}
    <div class="confirm-banner">
      <span>${iconSvg('check')} ${t('base_package_note')}</span>
      <span><span class="amt-lab" data-i18n="pkg_total_line">${escapeHtml(t('pkg_total_line'))}</span><span class="amt tabular">${fmtEUR(pkg.total)}</span></span>
    </div>
    <button type="button" class="pkg-save-btn" onclick="saveSearchPackage('${pkg.tier}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
      <span data-i18n="pkg_save_offer">${escapeHtml(t('pkg_save_offer'))}</span>
    </button>
    <button type="button" class="pkg-alert-btn" onclick="openAlertModal('search', '${pkg.tier}', ${pkg.total})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 3a5 5 0 00-5 5v3.2c0 .9-.35 1.75-.98 2.4L4.6 15h14.8l-1.42-1.4a3.4 3.4 0 01-.98-2.4V8a5 5 0 00-5-5z"/><path d="M9.5 19a2.6 2.6 0 005 0"/></svg>
      <span data-i18n="btn_price_alert">${escapeHtml(t('btn_price_alert'))}</span>
    </button>
  </div>`;
}

function closePkgCard(btn){
  const card = btn.closest('.pkg');
  if (!card) return;
  const wrap = card.parentElement;
  card.style.transition = 'opacity .18s ease, transform .18s ease, margin .18s ease, max-height .18s ease';
  card.style.maxHeight = card.offsetHeight + 'px';
  card.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    card.style.opacity = '0';
    card.style.transform = 'scale(0.97)';
    card.style.maxHeight = '0px';
    card.style.marginBottom = '0px';
    card.style.marginTop = '0px';
  });
  setTimeout(() => {
    card.remove();
    const sliderWrap = wrap && wrap.classList.contains('packages') ? wrap.closest('.packages-slider-wrap') : null;
    if (wrap && wrap.classList.contains('packages') && !wrap.querySelector('.pkg')){
      wrap.innerHTML = '<p class="disclaimer" style="text-align:center;">' + escapeHtml(t('pkg_all_closed')) + ' <button type="button" class="pkg-alert-btn" style="margin-left:6px;" onclick="runSearch(false)">' + escapeHtml(t('pkg_search_again')) + '</button></p>';
      const dotsWrap = sliderWrap && sliderWrap.querySelector('.packages-dots');
      if (dotsWrap) dotsWrap.remove();
    } else if (sliderWrap) {
      rebuildPackagesDots(sliderWrap);
    }
  }, 200);
}

/* ==========================================================
   Prikaz rezultata za "Pronađi svoj izlet" — 3 RAZLIČITE destinacije
   sa procentom poklapanja i objašnjenjem, ne samo cenom. Deli
   #resultsHead/#resultsBody sa običnom pretragom (isti kontejner),
   samo drugačiji sadržaj + poseban jewel-tone match bedž.
========================================================== */
function matchPkgHtml(pick, idx, budget, answers, month){
  const {dest, country, pkg, matchPct, fitsBudget} = pick;
  const featured = idx === 0;
  const itemsRow = [
    itemCardHtml(pkg.flight,'flight',pkg),
    itemCardHtml(pkg.hotel,'hotel',pkg),
    itemCardHtml(pkg.car,'car',pkg)
  ].filter(Boolean).join('');
  // Autobus/voz zanima samo one koji NISU izabrali let — ko je označio avion, ne prikazuje im se.
  // Privremeno isključeno na zahtev ("za sada samo auto") — busTrainNoteFor() ostaje u kodu
  // nedirnut, samo se ne poziva, radi lakšeg vraćanja kasnije.
  const busNote = '';
  const reasonText = matchReasonSentence(pick, answers, month);

  return `
  <div class="pkg match-pkg ${featured?'featured':''}" data-base-total="${pkg.total}">
    <div class="pkg-head">
      <div class="pkg-head-main">
        <span class="pkg-badge match-badge">${escapeHtml(featured ? t('pkg_recommended') : t('match_badge_suggestion'))}</span>
        <h3>${escapeHtml(cityLabel(dest))}</h3>
        <div class="pkg-desc">${escapeHtml(countryLabel(country))} · Best Value</div>
        <div class="pkg-total">
          <div class="num tabular">${fmtEUR(pkg.total)}</div>
          <div class="cur" data-i18n="builder_total_sub">${escapeHtml(t('builder_total_sub'))}</div>
          <div class="hint" data-i18n="pkg_total_hint">${escapeHtml(t('pkg_total_hint'))}</div>
        </div>
      </div>
      <div class="pkg-score-box">
        <div class="score-num tabular">${matchPct}%</div>
        <div class="score-max">${escapeHtml(t('match_score_label'))}</div>
        <div class="score-label">${escapeHtml(t('match_score_sub'))}</div>
      </div>
    </div>
    <div class="match-reason">💡 ${escapeHtml(reasonText)}</div>
    ${(!pkg.flight && typeof transportCompactHtml === 'function' && transportCompactHtml(dest, pick.adults)) || (busNote ? `<div class="alt-airport-box" style="margin:0 0 14px;">🚌 <b>${escapeHtml(t('match_bus_title'))}</b><br>${escapeHtml(busNote)}</div>` : '')}
    ${itemsRow ? `<div class="items-row">${itemsRow}</div>` : ''}
    <div class="confirm-banner">
      <span>${iconSvg('check')} ${budget ? (fitsBudget ? t('fits_budget') + fmtEUR(budget) + '.' : t('over_budget')) : t('match_no_budget')}</span>
      <span><span class="amt-lab" data-i18n="pkg_total_line">${escapeHtml(t('pkg_total_line'))}</span><span class="amt tabular">${fmtEUR(pkg.total)}</span></span>
    </div>
    <button type="button" class="pkg-save-btn" onclick="exploreMatchDestination(${idx})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M9 18l6-6-6-6"/></svg>
      ${escapeHtml(tf('match_build_for', {dest: cityLabel(dest)}))}
    </button>
    <button type="button" class="pkg-save-btn" onclick="saveMatchPackage(${idx})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
      <span data-i18n="pkg_save_offer">${escapeHtml(t('pkg_save_offer'))}</span>
    </button>
    <button type="button" class="pkg-alert-btn" onclick="openAlertModal('search', 'best', ${pkg.total}, '${escapeHtml(dest).replace(/'/g,"\\'")}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 3a5 5 0 00-5 5v3.2c0 .9-.35 1.75-.98 2.4L4.6 15h14.8l-1.42-1.4a3.4 3.4 0 01-.98-2.4V8a5 5 0 00-5-5z"/><path d="M9.5 19a2.6 2.6 0 005 0"/></svg>
      <span data-i18n="btn_price_alert">${escapeHtml(t('btn_price_alert'))}</span>
    </button>
  </div>`;
}

function renderMatchResults(picks, ctxBase, budget, answers, usedFallback){
  // Argumenti se pamte da bi se rezultati mogli ponovo iscrtati kad se promeni jezik.
  window._lastMatchRender = {picks, ctxBase, budget, answers, usedFallback};
  window._lastMatchPicks = picks;
  window._lastMatchCtx = ctxBase;
  window._lastMatchAnswers = answers;

  const month = new Date(ctxBase.from).getMonth() + 1;
  const vibeLab = MATCH_VIBE_LABELS[answers.vibe] || '';
  const head = document.getElementById('resultsHead');
  head.innerHTML = `
    <div class="status-banner match-status-banner">
      <div class="status-left">
        <div class="status-check">🧭</div>
        <div><h3>${escapeHtml(t('match_results_title'))}</h3><p>${escapeHtml(usedFallback ? t('match_results_sub_fallback') : tf('match_results_sub', {vibe: vibeLab ? ' (' + vibeLab + ')' : ''}))}</p></div>
      </div>
      <div class="status-pills">
        <div class="pill">${iconSvg('calendar')} ${fmtDate(ctxBase.from)} – ${fmtDate(ctxBase.to)}</div>
        <div class="pill">${iconSvg('people')} ${ctxBase.adults} ${passengerLabel(ctxBase.adults)}</div>
      </div>
    </div>
  `;

  const body = document.getElementById('resultsBody');
  const hadSkeleton = !!body.querySelector('.skel-packages');
  body.classList.add('rb-swap-out');
  setTimeout(() => {
    body.innerHTML = `
      ${packagesSliderHtml(picks.map((p,i)=>matchPkgHtml(p, i, budget, answers, month)))}
      <div class="match-refine-row">
        <button type="button" class="chip match-refine-chip" onclick="refineMatchSearch('sea')">${escapeHtml(t('match_refine_sea'))}</button>
        <button type="button" class="chip match-refine-chip" onclick="refineMatchSearch('nightlife')">${escapeHtml(t('match_refine_nightlife'))}</button>
        <button type="button" class="chip match-refine-chip" onclick="refineMatchSearch('nature')">${escapeHtml(t('match_refine_nature'))}</button>
        <button type="button" class="chip match-refine-chip" onclick="refineMatchSearch('cheaper')">${escapeHtml(t('match_refine_cheaper'))}</button>
      </div>
      <button type="button" class="btn-alert match-reroll-btn" onclick="runMatchSearch(true)">${escapeHtml(t('match_reroll'))}</button>
    `;
    initPackagesSlider(body.querySelector('.packages-slider-wrap'));
    body.classList.remove('rb-swap-out');
  }, hadSkeleton ? 180 : 0);
}

// Ako su trenutno prikazani rezultati upitnika, iscrtaj ih ponovo u novom jeziku.
const _prevOnLangChangeMatch = window.onLangChange;
window.onLangChange = function(lang){
  if (typeof _prevOnLangChangeMatch === 'function') _prevOnLangChangeMatch(lang);
  const r = window._lastMatchRender;
  if (r && document.querySelector('#resultsBody .match-pkg')){
    renderMatchResults(r.picks, r.ctxBase, r.budget, r.answers, r.usedFallback);
  }
};

// Trenutno stanje upitnika (popunjava se klikom na chip-ove u modalu)
const matchQuizState = { companion:null, vibe:null };

async function runMatchSearch(isReroll){
  const budgetInput = document.getElementById('matchBudget');
  const budget = Number(budgetInput.value) || 0;

  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  const adults = document.getElementById('adults').value || '2';
  const flags = {
    flight:    document.querySelector('.toggle[data-t="flight"]').classList.contains('on'),
    hotel:     document.querySelector('.toggle[data-t="hotel"]').classList.contains('on'),
    car:       document.querySelector('.toggle[data-t="car"]').classList.contains('on'),
    activity:  document.querySelector('.toggle[data-t="activity"]').classList.contains('on'),
    // Iste stvarne preference iz upitnika kao i kod runSearch() — vidi
    // komentar tamo. "Pronađi svoj izlet" predlaže DESTINACIJE, ali
    // paketi koje pravi za njih treba da poštuju isti tip leta/hotela/
    // auta/broj aktivnosti, ne nasumičan sadržaj.
    flightPref: builderState.flightPref,
    airlineName: builderState.airlineName,
    hotelStars: builderState.hotelStars,
    prioritizeRating: builderState.prioritizeRating,
    prioritizeLocation: builderState.prioritizeLocation,
    carPref: builderState.carPref !== 'none' ? builderState.carPref : 'small',
    activityCount: builderState.activityCount > 0 ? builderState.activityCount : 1,
  };
  const answers = Object.assign({}, (isReroll && window._lastMatchAnswers) || matchQuizState);
  if (!answers.companion || !answers.vibe){ showToast('Odgovori na oba pitanja pre pretrage.'); return; }

  // Direktan prelazak na rezultate — vidi komentar uz guardOverlayReplace
  // (zašto NE koristimo requestCloseMatchModal ovde).
  if (!isReroll){
    closeMatchModal();
    guardOverlayReplace('match', 'results', closeResultsSheet);
  }

  const results = document.getElementById('results');
  openResultsSheet();
  if (!isReroll){
    document.getElementById('resultsHead').innerHTML = '';
    document.getElementById('resultsBody').innerHTML = skeletonResultsHtml('Tražimo destinacije koje ti najbolje odgovaraju…');
    if (!isMobileResults()) results.scrollIntoView({behavior:'smooth', block:'start'});
  }

  setTimeout(()=>{
    const nights = nightsBetween(from, to);
    const month = new Date(from).getMonth() + 1;
    const candidates = computeMatchCandidates(from, to, adults, flags).map(c => Object.assign(c, {adults}));
    const excludeNames = isReroll ? (window._lastMatchPicks || []).map(p => p.dest) : [];
    const pool = excludeNames.length ? candidates.filter(c => !excludeNames.includes(c.dest)) : candidates;
    const {picks, usedFallback} = pickMatchDestinations(answers, budget, pool, nights, month, 3);
    // "Poslednja destinacija" u statistici treba da bude GRAD (kao kod obične
    // pretrage), a ne budžet — zato se beleži tek kad su predlozi izračunati.
    bumpSearchStat('🧭 ' + (picks[0] ? picks[0].dest : 'Match'));
    renderMatchResults(picks, {from, to, adults, nights, flags}, budget, answers, usedFallback);
  }, isReroll ? 0 : 700);
}

// Fino podešavanje BEZ ponovnog otvaranja upitnika — menja jedan
// parametar (vibe ili budžet) i odmah ponovo rangira, kao pravi filter.
function refineMatchSearch(kind){
  const ctx = window._lastMatchCtx;
  const answers = Object.assign({}, window._lastMatchAnswers || matchQuizState);
  let budget = Number(document.getElementById('matchBudget').value) || 0;
  if (!ctx){ showToast('Pokreni "Pronađi svoj izlet" ponovo.'); return; }

  if (kind === 'cheaper'){
    budget = budget ? Math.round(budget * 0.75) : 0;
    if (!budget){ showToast('Prvo unesi budžet da bi mogao da ga smanjiš.'); return; }
    document.getElementById('matchBudget').value = budget;
  } else {
    answers.vibe = kind;
  }

  const results = document.getElementById('results');
  openResultsSheet();
  document.getElementById('resultsBody').innerHTML = skeletonResultsHtml('Prilagođavamo predloge…');
  setTimeout(()=>{
    const nights = nightsBetween(ctx.from, ctx.to);
    const month = new Date(ctx.from).getMonth() + 1;
    const candidates = computeMatchCandidates(ctx.from, ctx.to, ctx.adults, ctx.flags).map(c => Object.assign(c, {adults: ctx.adults}));
    const {picks, usedFallback} = pickMatchDestinations(answers, budget, candidates, nights, month, 3);
    renderMatchResults(picks, ctx, budget, answers, usedFallback);
  }, 350);
}

// Klik na "Napravi aranžman za {grad}" — prebacuje na normalnu pretragu
// (sva 3 tier-a) za taj konkretni grad, umesto samo 'best' predloga.
function exploreMatchDestination(idx){
  const pick = (window._lastMatchPicks || [])[idx];
  if (!pick) return;
  document.getElementById('dest').value = pick.dest;
  runSearch(true);
}

async function saveMatchPackage(idx){
  const user = await getCurrentUser();
  if (!user){
    promptLogin('Prijavi se emailom da sačuvaš ponudu.');
    return;
  }
  const pick = (window._lastMatchPicks || [])[idx];
  const ctx = window._lastMatchCtx;
  if (!pick || !ctx){ showToast('Ponuda više nije dostupna — probaj ponovo.'); return; }

  const summaryTags = [
    '🧭 ' + pick.matchPct + '% poklapanje',
    pick.pkg.flight ? pick.pkg.flight.name : 'Bez leta',
    pick.pkg.hotel ? pick.pkg.hotel.name : 'Bez hotela',
    pick.pkg.car ? 'Sa autom' : 'Bez auta'
  ];

  const { error } = await sb.from('trips').insert({
    user_id: user.id,
    dest: pick.dest,
    date_from: ctx.from,
    date_to: ctx.to,
    adults: Number(ctx.adults),
    selection: {kind:'search', tier:'best', tierLabel:'Best Value (Pronađi svoj izlet)', summaryTags},
    total: pick.pkg.total
  });
  if (error){ showToast('Greška pri čuvanju: ' + error.message); return; }
  renderSavedTrips();
  showToast(pick.dest + ' sačuvan (' + fmtEUR(pick.pkg.total) + ').');
}

/* ---- Kviz modal: 3 koraka (sa kim / vibe / budžet), chip-select sa
   auto-napredovanjem na sledeći korak, kao pravi kratak upitnik. ---- */
function goToMatchStep(n){
  document.querySelectorAll('#matchModal .match-step').forEach(el => {
    el.classList.toggle('active', Number(el.dataset.step) === n);
  });
  document.querySelectorAll('#matchModal .match-dot').forEach(el => {
    el.classList.toggle('active', Number(el.dataset.step) === n);
  });
  if (n === 3){
    const btn = document.getElementById('matchModalSubmit');
    if (btn) setTimeout(() => document.getElementById('matchBudget').focus(), 200);
  }
}
function selectMatchChip(group, value, chipEl, nextStep){
  matchQuizState[group] = value;
  chipEl.closest('.match-chip-grid').querySelectorAll('.match-chip').forEach(c => c.classList.remove('on'));
  chipEl.classList.add('on');
  if (nextStep) setTimeout(() => goToMatchStep(nextStep), 260);
}
function openMatchModal(){
  matchQuizState.companion = null;
  matchQuizState.vibe = null;
  document.querySelectorAll('#matchModal .match-chip').forEach(c => c.classList.remove('on'));
  document.getElementById('matchBudget').value = '';
  goToMatchStep(1);
  document.getElementById('matchModalBackdrop').classList.add('open');
  document.getElementById('matchModal').classList.add('open');
  guardOverlayOpen('match', closeMatchModal);
}
function requestCloseMatchModal(){
  if (!guardOverlayRequestClose('match')) closeMatchModal();
}
function closeMatchModal(){
  document.getElementById('matchModalBackdrop').classList.remove('open');
  document.getElementById('matchModal').classList.remove('open');
}

/* Uživo sabiranje dodataka (osiguranje/eSIM) na cenu paketa — bez ponovne
   pretrage. Svaki .pkg pamti svoju osnovnu cenu u data-base-total, a ovde
   se na nju dodaje zbir čekiranih dodataka unutar TOG istog paketa. */
function toggleAddon(checkbox){
  const pkgEl = checkbox.closest('.pkg');
  if (!pkgEl) return;
  const base = Number(pkgEl.dataset.baseTotal) || 0;
  let sum = base;
  pkgEl.querySelectorAll('.addon-checkbox:checked').forEach(cb => { sum += Number(cb.dataset.price) || 0; });
  const totalEl = pkgEl.querySelector('.pkg-total .num');
  const confirmEl = pkgEl.querySelector('.confirm-banner .amt');
  if (totalEl) totalEl.textContent = fmtEUR(sum);
  if (confirmEl) confirmEl.textContent = fmtEUR(sum);
}

/* ==========================================================
   AFFILIATE CLICK SIMULATION
   Mirrors /go/offer123 -> save click -> redirect
========================================================== */
function bookItem(btn){
  const kind = btn.dataset.kind;
  const price = Number(btn.dataset.price);
  const url = btn.dataset.url;
  const dest = btn.dataset.dest || '';
  const tier = btn.dataset.tier || '';
  bumpClickStat();
  trackAffiliateClick(kind, price, dest, tier);
  const labels = {
    flight:   'let na KAYAK-u',
    hotel:    'smeštaj na Booking.com',
    car:      'auto na Booking.com',
    activity: 'aktivnost na Viator-u',
    esim:     'eSIM na Airalo-u'
  };
  showToast('Klik zabeležen za ' + (labels[kind]||kind) + (price > 0 ? ' (' + fmtEUR(price) + ')' : '') + ' · otvaram partnera…');
  // Napomena: ne pozivamo window.open ovde — <a href target="_blank"> sam
  // otvara link. Ranije smo ovde imali window.open(url,'_blank','noopener'),
  // ali JS-generisani popup tabovi znaju da se na mobilnom Chrome-u ne povežu
  // kako treba sa originalnim tabom, pa dugme "nazad" na partnerskom sajtu
  // ume da zatvori ceo browser umesto da vrati korisnika na Skoknicu.
  // Pravi <a> link je pouzdaniji način da se to izbegne.
}

/* ---- GA4: koji partner/destinacija/tier generiše affiliate klikove.
   Ćuti ako GA nije učitan (kolačići odbijeni ili korisnik još nije birao) —
   vidi cookies.js/loadGA(). bumpClickStat() iznad i dalje radi nezavisno
   od ovoga (to je opšti brojač, ne po partneru/destinaciji). ---- */
function trackAffiliateClick(kind, price, dest, tier){
  if (typeof window.gtag !== 'function') return;
  const partner = {flight:'kayak', hotel:'booking', car:'booking', activity:'viator', esim:'airalo', insurance:'worldnomads'}[kind] || kind;
  window.gtag('event', 'affiliate_click', {
    item_kind: kind,
    partner: partner,
    destination: dest,
    tier: tier,
    value: price,
    currency: 'EUR'
  });
}

/* ---- GA4: gornji/srednji dio funnel-a (affiliate_click iznad je već
   dno funnel-a). Isti "ćuti ako GA nije učitan" obrazac kao gore —
   pozivi ispod se dešavaju i kad su kolačići odbijeni, samo bez efekta.
   Tri koraka koje ovo prati:
     search_submit  — korisnik je potvrdio destinaciju/datume (Start)
     builder_open   — otvorio "Napravi svoj aranžman" (custom put)
     offers_view    — dobio 3 gotove ponude (Budget/Best/Comfort put)
   Ovo je namerno odvojeno od bumpSearchStat/bumpClickStat, koji pišu u
   site_stats (javni brojač na sajtu, ne GA/funnel podatak). ---- */
function trackFunnelEvent(name, params){
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, params || {});
}

function showToast(msg){
  const t = document.getElementById('toast');
  document.getElementById('toastText').textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('show'), 3200);
}

function updateStats(){
  const elSearches = document.getElementById('statSearches');
  const elClicks = document.getElementById('statClicks');
  const elLast = document.getElementById('statLast');
  if (elSearches) elSearches.textContent = Math.max(state.searches, STAT_DISPLAY_FLOOR.searches);
  if (elClicks) elClicks.textContent = Math.max(state.clicks, STAT_DISPLAY_FLOOR.clicks);
  if (elLast) elLast.textContent = cityLabelWithPrefix(state.lastDest || STAT_LAST_DEST_FALLBACK);
  saveStats();
}

/* ---- Uvećanje brojača: prvo pokušaj deljeni (Supabase RPC, atomično za
   sve posetioce), a ako ne uspe (sb nedostupan, tabela/funkcija ne postoji,
   mreža) — padni nazad na lokalni brojač kao do sad. ---- */
async function bumpSearchStat(destLabel){
  if (typeof ensureSb === 'function' && await ensureSb()){
    try{
      const { data, error } = await sb.rpc('increment_search_stat', { p_dest: destLabel });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row){
        state.searches = row.searches;
        state.clicks = row.clicks;
        state.lastDest = row.last_dest || destLabel;
        updateStats();
        return;
      }
    }catch(err){
      console.warn('[sklopi] Deljeni brojač pretraga nije uspeo, koristim lokalni:', err.message);
    }
  }
  state.searches += 1;
  state.lastDest = destLabel;
  updateStats();
}
async function bumpClickStat(){
  if (typeof ensureSb === 'function' && await ensureSb()){
    try{
      const { data, error } = await sb.rpc('increment_click_stat');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row){
        state.searches = row.searches;
        state.clicks = row.clicks;
        state.lastDest = row.last_dest || state.lastDest;
        updateStats();
        return;
      }
    }catch(err){
      console.warn('[sklopi] Deljeni brojač klikova nije uspeo, koristim lokalni:', err.message);
    }
  }
  state.clicks += 1;
  updateStats();
}

