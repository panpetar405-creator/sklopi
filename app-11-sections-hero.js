/* app-11-sections-hero.js — deo nekadašnjeg app.js (deo 11/11): Slajder atrakcija, sekcija destinacija, hero.
   Klasična skripta: deli globalni opseg sa ostalim app-*.js fajlovima; redosled učitavanja u index.html je bitan. */
/* ==========================================================
   "Sklopi svoju atrakciju" — slajder + sheet sa filterima
   (Viator partner sekcija). Podaci ispod su PRIMER/MOCK radi
   dizajna i UX toka — pre puštanja u produkciju treba ih
   zameniti stvarnim Viator affiliate API/widget pozivom
   (po zemlji/gradu/kategoriji), sa keširanjem odgovora.
   ========================================================== */
const ATTRACTIONS_DATA = [
  {id:'a1', name:'Vožnja gondolom kroz kanale', city:'Venecija', country:'Italija', category:'gondole', categoryLabel:'Gondole i panorame', img:'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=70&auto=format&fit=crop', price:45, q:'Venice gondola'},
  {id:'a2', name:'Koncert u Bečkoj filharmoniji', city:'Beč', country:'Austrija', category:'muzika', categoryLabel:'Muzika i koncerti', img:'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&q=70&auto=format&fit=crop', price:69, q:'Vienna concert'},
  {id:'a3', name:'Ulaznica za Koloseum sa vodičem', city:'Rim', country:'Italija', category:'kultura', categoryLabel:'Kultura i znamenitosti', img:'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=70&auto=format&fit=crop', price:39, q:'Colosseum tour'},
  {id:'a4', name:'Utakmica na Santiago Bernabeu', city:'Madrid', country:'Španija', category:'arene', categoryLabel:'Arene i sport', img:'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=70&auto=format&fit=crop', price:120, q:'Bernabeu tour'},
  {id:'a5', name:'Ronjenje na Velikom koralnom grebenu', city:'Kerns', country:'Australija', category:'voda', categoryLabel:'Vodene aktivnosti', img:'https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=800&q=70&auto=format&fit=crop', price:159, q:'Great Barrier Reef diving'},
  {id:'a6', name:'Noćna tura po Montmartru', city:'Pariz', country:'Francuska', category:'noc', categoryLabel:'Noćni život', img:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=70&auto=format&fit=crop', price:35, q:'Montmartre night tour'},
  {id:'a7', name:'Paragliding iznad Interlakena', city:'Interlaken', country:'Švajcarska', category:'avantura', categoryLabel:'Avantura', img:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=70&auto=format&fit=crop', price:189, q:'Interlaken paragliding'},
  {id:'a8', name:'Degustacija tapasa u Trijani', city:'Sevilja', country:'Španija', category:'gastro', categoryLabel:'Gastro ture', img:'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=70&auto=format&fit=crop', price:55, q:'Seville tapas tour'},
  {id:'a9', name:'Panoramski točak London Eye', city:'London', country:'Velika Britanija', category:'gondole', categoryLabel:'Gondole i panorame', img:'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=70&auto=format&fit=crop', price:32, q:'London Eye'},
  {id:'a10', name:'DJ set na krovnom baru', city:'Barselona', country:'Španija', category:'noc', categoryLabel:'Noćni život', img:'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=70&auto=format&fit=crop', price:25, q:'Barcelona rooftop bar'},
  {id:'a11', name:'Muzej Akropolja — brza ulaznica', city:'Atina', country:'Grčka', category:'kultura', categoryLabel:'Kultura i znamenitosti', img:'https://images.unsplash.com/photo-1555993539-1732b0258235?w=800&q=70&auto=format&fit=crop', price:28, q:'Acropolis museum'},
  {id:'a12', name:'Rafting na reci Soči', city:'Bovec', country:'Slovenija', category:'avantura', categoryLabel:'Avantura', img:'https://images.unsplash.com/photo-1530866495561-507c9faab8c9?w=800&q=70&auto=format&fit=crop', price:65, q:'Soca rafting'},
  {id:'a13', name:'Jazz klub u podrumu', city:'Njujork', country:'SAD', category:'muzika', categoryLabel:'Muzika i koncerti', img:'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=70&auto=format&fit=crop', price:48, q:'New York jazz club'},
  {id:'a14', name:'Vinska tura kroz Toskanu', city:'Firenca', country:'Italija', category:'gastro', categoryLabel:'Gastro ture', img:'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&q=70&auto=format&fit=crop', price:79, q:'Tuscany wine tour'}
];
// Oznake kategorija dolaze iz I18N (attr_cat_<key>); ovde ostaju samo ključ i emoji.
const ATTRACTIONS_CATEGORIES = [
  {key:'kultura', emoji:'🏛️'},
  {key:'muzika', emoji:'🎵'},
  {key:'gondole', emoji:'🎡'},
  {key:'arene', emoji:'🏟️'},
  {key:'avantura', emoji:'🧗'},
  {key:'voda', emoji:'🌊'},
  {key:'gastro', emoji:'🍷'},
  {key:'noc', emoji:'🎶'}
];
function attractionCategoryLabel(key){ return t('attr_cat_' + key); }
let attractionsActiveCategories = new Set();
let attractionsActiveCountry = '';

// Viator pretraga za atrakciju; affiliate ID dolazi iz config.js (isti builder kao ostale aktivnosti).
function attractionLink(a){ return buildAffiliateLink('activity', {dest: a.q}); }
function attractionCardHtml(a){
  // Naziv iz I18N (attr_<id>), grad/država kroz rečnike; a.name ostaje srpski izvor.
  const name = t('attr_' + a.id);
  return `<a class="attraction-card" data-category="${escapeHtml(a.category)}" href="${escapeHtml(attractionLink(a))}" target="_blank" rel="noopener sponsored">
    <div class="ac-photo">
      <img src="${a.img}" alt="${escapeHtml(name)}" loading="lazy">
      <span class="ac-badge">${escapeHtml(attractionCategoryLabel(a.category))}</span>
    </div>
    <div class="ac-body">
      <span class="ac-name">${escapeHtml(name)}</span>
      <span class="ac-loc">${escapeHtml(cityLabel(a.city))}, ${escapeHtml(countryLabel(a.country))}</span>
      <span class="ac-price"><span>${escapeHtml(t('attr_from'))}</span> €${a.price}</span>
      ${affBadgeHtml({plain:true})}
    </div>
  </a>`;
}

function renderAttractionsSlider(){
  const wrap = document.getElementById('attractionsSlider');
  if (!wrap) return;
  const picks = ATTRACTIONS_DATA.slice(0, 5);
  wrap.innerHTML = picks.map(attractionCardHtml).join('');
  renderAttractionsDots(picks.length);
}
function renderAttractionsDots(count){
  const dotsWrap = document.getElementById('attractionsDots');
  if (!dotsWrap) return;
  dotsWrap.innerHTML = Array.from({length: count}).map((_, i) =>
    `<button type="button" class="a-dot${i === 0 ? ' active' : ''}" data-idx="${i}" aria-label="${escapeHtml(tf('attr_dot_aria', {n: i + 1}))}"></button>`
  ).join('');
}
(function initAttractionsSliderScrollSync(){
  const slider = document.getElementById('attractionsSlider');
  if (!slider) return;
  slider.addEventListener('scroll', () => {
    const cards = slider.querySelectorAll('.attraction-card');
    if (!cards.length) return;
    let closest = 0, minDist = Infinity;
    cards.forEach((c, i) => {
      const dist = Math.abs(c.offsetLeft - slider.scrollLeft);
      if (dist < minDist){ minDist = dist; closest = i; }
    });
    document.querySelectorAll('#attractionsDots .a-dot').forEach((d, i) => d.classList.toggle('active', i === closest));
  }, {passive:true});
})();
document.getElementById('attractionsPrev')?.addEventListener('click', () => {
  document.getElementById('attractionsSlider')?.scrollBy({left:-280, behavior:'smooth'});
});
document.getElementById('attractionsNext')?.addEventListener('click', () => {
  document.getElementById('attractionsSlider')?.scrollBy({left:280, behavior:'smooth'});
});

let _attractionsFiltersWired = false;
// Poziva se pri svakom otvaranju sheet-a i pri promeni jezika: opcije zemalja i
// čipovi kategorija se grade ponovo (na trenutnom jeziku), a slušaoci se
// postavljaju samo jednom. Vrednost opcije ostaje srpski naziv zemlje (filter).
function populateAttractionsFilters(){
  const select = document.getElementById('attractionsCountrySelect');
  if (select){
    const lang = getLang();
    const countries = [...new Set(ATTRACTIONS_DATA.map(a => a.country))]
      .sort((x, y) => String(countryLabel(x)).localeCompare(String(countryLabel(y)), lang));
    while (select.options.length > 1) select.remove(1); // prva opcija ("Sve zemlje") je iz HTML-a
    countries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = countryLabel(c);
      select.appendChild(opt);
    });
    select.value = attractionsActiveCountry;
    if (!_attractionsFiltersWired){
      select.addEventListener('change', () => {
        attractionsActiveCountry = select.value;
        renderAttractionsGrid();
      });
    }
  }
  const chipRow = document.getElementById('attractionsCategoryChips');
  if (chipRow){
    chipRow.innerHTML = ATTRACTIONS_CATEGORIES.map(c =>
      `<button type="button" class="attraction-chip${attractionsActiveCategories.has(c.key) ? ' on' : ''}" data-cat="${c.key}">${c.emoji} ${escapeHtml(attractionCategoryLabel(c.key))}</button>`
    ).join('');
    if (!_attractionsFiltersWired){
      chipRow.addEventListener('click', (e) => {
        const chip = e.target.closest('.attraction-chip');
        if (!chip) return;
        const key = chip.dataset.cat;
        if (attractionsActiveCategories.has(key)){
          attractionsActiveCategories.delete(key);
          chip.classList.remove('on');
        } else {
          attractionsActiveCategories.add(key);
          chip.classList.add('on');
        }
        renderAttractionsGrid();
      });
    }
  }
  _attractionsFiltersWired = true;
}
function renderAttractionsGrid(){
  const grid = document.getElementById('attractionsGrid');
  const empty = document.getElementById('attractionsEmpty');
  if (!grid) return;
  const filtered = ATTRACTIONS_DATA.filter(a => {
    const catOk = attractionsActiveCategories.size === 0 || attractionsActiveCategories.has(a.category);
    const countryOk = !attractionsActiveCountry || a.country === attractionsActiveCountry;
    return catOk && countryOk;
  });
  grid.innerHTML = filtered.map(attractionCardHtml).join('');
  if (empty) empty.hidden = filtered.length > 0;
}

function openAttractionsSheet(){
  populateAttractionsFilters();
  renderAttractionsGrid();
  const sheet = document.getElementById('attractionsSheet');
  if (!sheet) return;
  sheet.classList.add('visible');
  const backdrop = document.getElementById('attractionsSheetBackdrop');
  if (isMobileResults()){
    if (backdrop) backdrop.classList.add('open');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    lockResultsPageScroll();
    guardOverlayOpen('attractionsSheet', closeAttractionsSheet);
  }
}
function closeAttractionsSheet(){
  const sheet = document.getElementById('attractionsSheet');
  if (!sheet) return;
  const backdrop = document.getElementById('attractionsSheetBackdrop');
  const wasLocked = _resultsScrollLocked;
  sheet.classList.remove('visible');
  if (backdrop) backdrop.classList.remove('open');
  sheet.removeAttribute('role');
  sheet.removeAttribute('aria-modal');
  if (wasLocked) unlockResultsPageScroll();
}
function requestCloseAttractionsSheet(){
  if (!guardOverlayRequestClose('attractionsSheet')) closeAttractionsSheet();
}
document.getElementById('attractionsSeeAllBtn')?.addEventListener('click', openAttractionsSheet);
document.getElementById('attractionsSheetBackBtn')?.addEventListener('click', requestCloseAttractionsSheet);
document.getElementById('attractionsSheetBackdrop')?.addEventListener('click', requestCloseAttractionsSheet);

renderAttractionsSlider();

// Promena jezika: slajder i (ako je otvoren) sheet sa filterima se iscrtavaju ponovo,
// a "poslednja destinacija" u statistici dobija preveden naziv grada.
const _prevOnLangChangeAttractions = window.onLangChange;
window.onLangChange = function(lang){
  if (typeof _prevOnLangChangeAttractions === 'function') _prevOnLangChangeAttractions(lang);
  renderAttractionsSlider();
  const sheet = document.getElementById('attractionsSheet');
  if (sheet && sheet.classList.contains('visible')){
    populateAttractionsFilters();
    renderAttractionsGrid();
  }
  updateStatLastPreview((document.getElementById('dest') || {}).value || '');
};

/* ==========================================================
   SEKCIJA "DESTINACIJE" (#destinacije) — slajderi po vrsti odmora.
   Isti princip kao 3 kartice ponude: svaka kartica predlaže PARTNERSKU ponudu i vodi na
   partnera istim buildAffiliateLink() (isti aid/pid iz config.js, dok ih nema — test 'SKLOPI'):
     • "Blizu Srbije" i "More i plaža" → HOTEL na Booking.com. Ime, ocena i cena su ILUSTRATIVNI
       (ista fetchHotel() kao na karticama ponude); dugme otvara PRETRAGU hotela u tom gradu
       (datumi i putnici iz forme, ako su upisani; 4★ kao na kartici).
     • "Gradovi i kultura" i "Priroda i planina" → ATRAKCIJE na Viator-u: dugme otvara Viator
       pretragu (muzeji / priroda) za taj grad. Nema izmišljenih naziva tura ni cena.
   GRADOVI: dok pravi API nije gotov, dolaze iz MATCH_DESTINATIONS (isti gradovi/države
   kao u "Pronađi svoj izlet"). Svaki grad je samo u JEDNOM slajderu (bez ponavljanja).
   FOTOGRAFIJE: samo od partnera (Viator) ili tvoje. Kartica ima gradijent + ikonu vrste odmora
   dok slika ne stigne (ili ako nikad ne stigne). Redosled prvenstva slike:
     item.img (iz DEST_API_URL) → DEST_IMG_OVERRIDES (tvoje slike) → Viator preko Worker-a.
   Viator API ključ stoji SAMO na Worker-u (worker/destination-images.js), nikad u pregledaču.
   Adresa Worker-a: window.SKLOPI_DEST_IMG_URL, ili SKLOPI_ALERT_WORKER_URL + '/go/destination-images'
   (config.js). Dok ni jedno nije podešeno, ništa se ne poziva i kartice ostaju kao sada.
   PRELAZAK NA PRAVI API: upiši adresu u DEST_API_URL. Očekivan oblik odgovora:
     [{key:'sea', title:'More i plaža',   (title je opciono)
       items:[{dest:'Budva', country:'Crna Gora', img:'https://…', partner:'hotel'|'activity'}]}]
   (img i partner su opciono; bez partner-a odlučuje vrsta slajdera — vidi DEST_ROW_PARTNER.)
========================================================== */
const DEST_API_URL = '';
// Tvoje sopstvene fotografije po gradu, npr. {'Budva':'img/destinacije/budva.jpg'}.
// Ključ je naziv grada na srpskom, kao u MATCH_DESTINATIONS.
const DEST_IMG_OVERRIDES = {};
// Srpski naziv → engleski naziv za Viator pretragu (gde se razlikuje).
const DEST_EN_NAMES = {
  'Budimpešta':'Budapest','Beč':'Vienna','Sofija':'Sofia','Solun':'Thessaloniki','Skoplje':'Skopje',
  'Sarande':'Sarandë','Split':'Split, Croatia','Bukurešt':'Bucharest','Prag':'Prague','Krf':'Corfu',
  'Atina':'Athens','Mikonos':'Mykonos','Rodos':'Rhodes','Krit':'Crete','Rim':'Rome','Milano':'Milan',
  'Venecija':'Venice','Firenca':'Florence','Barselona':'Barcelona','Malaga':'Málaga','Ibica':'Ibiza',
  'Lisabon':'Lisbon','Pariz':'Paris','Nica':'Nice','Minhen':'Munich','Cirih':'Zürich','Antalija':'Antalya',
  'Kapadokija':'Cappadocia','Kairo':'Cairo','Šarm El Šeik':'Sharm El Sheikh','Marakeš':'Marrakesh',
  'Njujork':'New York City','Majami':'Miami','Los Anđeles':'Los Angeles','Puket':'Phuket','Tokio':'Tokyo',
  'Singapur':'Singapore','Sidnej':'Sydney','Kejptaun':'Cape Town',
  'St. Anton am Arlberg':'St. Anton am Arlberg'
};
// Šta kartica nudi po vrsti slajdera: 'hotel' (Booking.com) ili 'activity' (Viator).
const DEST_ROW_PARTNER = {ski:'hotel', sea:'hotel', city:'activity', nature:'activity'};
const DEST_ROW_ICON = {ski:'⛷️', sea:'🏖️', city:'🏛️', nature:'🌲'};
// Ključna reč koja se dodaje nazivu grada u Viator pretrazi.
const DEST_VIATOR_KEYWORD = {city:'museums', nature:'nature tours'};
// Viator pretraga za sliku kartice = engleski naziv grada + ključna reč vrste odmora
// (isti izraz kao u Viator linku na kartici, a za "More i plaža" — plaža).
const DEST_IMG_KEYWORD = Object.assign({sea:'beach', ski:'ski resort'}, DEST_VIATOR_KEYWORD);
const DEST_ROW_LIMIT = 8;
const DEST_SPARE_LIMIT = 6; // rezervne destinacije po slajderu, za zamenu kad ponuđena nema sliku
// prio = redosled kojim slajderi "biraju" gradove (da se nijedan ne ponovi); redosled prikaza je redosled niza.
// "ski" (Skijaški centri) je zamenio raniji "near" (Blizu Srbije) red — prvi u prikazu.
const DEST_ROW_DEFS = [
  {key:'ski',    prio:1, test: d => d.vibes.includes('ski')},
  {key:'sea',    prio:2, test: d => d.vibes.includes('sea')},
  {key:'city',   prio:3, test: d => d.vibes.includes('city')},
  {key:'nature', prio:0, test: d => d.vibes.includes('nature') && !d.vibes.includes('city') && !d.vibes.includes('ski')}
];
// Tekstovi sekcije žive ovde (ne u i18n-data.js) da sekcija radi bez izmene prevoda;
// ako nedostaje jezik, pada na srpski kao i t().
const DEST_TXT = {
  sr:{eyebrow:'Odaberi pravac', title:'Destinacije',
      sub:'Prelistaj ideje po vrsti odmora. Klikni na naziv grada i upisujemo ga u pretragu, ili otvori ponudu partnera — datume biraš ti.',
      row_ski:'Skijaški centri', row_sea:'More i plaža', row_city:'Gradovi i kultura', row_nature:'Priroda i planina',
      prev:'Prethodne destinacije', next:'Sledeće destinacije', pick_aria:'Upiši u pretragu: ',
      per_night:'po noći', label_activity:'Atrakcije', btn_viator:'Pogledaj na Viator-u',
      act_city:'Muzeji, pozorišta i galerije', act_nature:'Priroda, parkovi i izleti', act_sub:'Ulaznice i organizovane ture',
      credit:'Cene su ilustrativna procena; tačnu cenu i dostupnost proveri kod partnera. Linkovi ka Booking.com-u i Viator-u su partnerski — SKLOPI može da dobije proviziju, a tebi cena ostaje ista.'},
  en:{eyebrow:'Pick a direction', title:'Destinations',
      sub:'Browse ideas by kind of trip. Tap a city name and we fill it into the search, or open the partner offer — you pick the dates.',
      row_ski:'Ski resorts', row_sea:'Sea and beaches', row_city:'Cities and culture', row_nature:'Nature and mountains',
      prev:'Previous destinations', next:'Next destinations', pick_aria:'Fill into search: ',
      per_night:'per night', label_activity:'Attractions', btn_viator:'View on Viator',
      act_city:'Museums, theatres and galleries', act_nature:'Nature, parks and day trips', act_sub:'Tickets and guided tours',
      credit:'Prices are an illustrative estimate; check the exact price and availability with the partner. Links to Booking.com and Viator are affiliate links — SKLOPI may earn a commission at no extra cost to you.'},
  ru:{eyebrow:'Выбери направление', title:'Направления',
      sub:'Листай идеи по типу отдыха. Нажми на название города — мы подставим его в поиск, или открой предложение партнёра — даты выбираешь ты.',
      row_ski:'Горнолыжные курорты', row_sea:'Море и пляжи', row_city:'Города и культура', row_nature:'Природа и горы',
      prev:'Предыдущие направления', next:'Следующие направления', pick_aria:'Подставить в поиск: ',
      per_night:'за ночь', label_activity:'Впечатления', btn_viator:'Смотреть на Viator',
      act_city:'Музеи, театры и галереи', act_nature:'Природа, парки и экскурсии', act_sub:'Билеты и экскурсии с гидом',
      credit:'Цены — ориентировочная оценка; точную цену и наличие проверяйте у партнёра. Ссылки на Booking.com и Viator партнёрские — SKLOPI может получить комиссию, а цена для вас не меняется.'}
};
function dtx(key){
  const own = DEST_TXT[getLang()];
  const v = (own && own[key] !== undefined) ? own[key] : DEST_TXT.sr[key];
  return v === undefined ? '' : v;
}
function destMockRows(){
  const used = new Set(), byKey = {}, spareKey = {};
  const defsByPrio = DEST_ROW_DEFS.slice().sort((a, b) => a.prio - b.prio);
  // Prvi prolaz: glavnih 8 po slajderu (kao ranije).
  defsByPrio.forEach(def => {
    const picks = MATCH_DESTINATIONS.filter(d => def.test(d) && !used.has(d.name)).slice(0, DEST_ROW_LIMIT);
    picks.forEach(d => used.add(d.name));
    byKey[def.key] = picks.map(d => ({dest:d.name, country:d.extra, row:def.key}));
  });
  // Drugi prolaz (tek kad su svi glavni izbori poznati): rezervne destinacije za zamenu
  // onih kojima slika ne stigne — bez preklapanja sa glavnim izborom bilo kog slajdera.
  defsByPrio.forEach(def => {
    const spares = MATCH_DESTINATIONS.filter(d => def.test(d) && !used.has(d.name)).slice(0, DEST_SPARE_LIMIT);
    spares.forEach(d => used.add(d.name));
    spareKey[def.key] = spares.map(d => ({dest:d.name, country:d.extra, row:def.key}));
  });
  return DEST_ROW_DEFS.map(def => ({key:def.key, items:byKey[def.key], spares:spareKey[def.key]}));
}
async function loadDestinationRows(){
  if (DEST_API_URL){
    try {
      const r = await fetch(DEST_API_URL, {headers:{Accept:'application/json'}});
      if (r.ok){
        const data = await r.json();
        if (Array.isArray(data) && data.length){
          data.forEach(row => (row.items || []).forEach(it => { if (!it.row) it.row = row.key; }));
          return data;
        }
      }
    } catch(e){ console.warn('[sklopi] destinacije: API nije dostupan, koristim test podatke.', e); }
  }
  return destMockRows();
}

/* ---- slike sa Viator-a (preko Worker-a), sa privremenim Wikipedia fallback-om ---- */
const DEST_IMG_CACHE_KEY = 'sklopi_dest_img_v1';
const DEST_IMG_TTL = 3600 * 1000;   // Viator dozvoljava keširanje rezultata pretrage do 1 h
const WIKI_IMG_CACHE_KEY = 'sklopi_dest_img_wiki_v1';
const WIKI_IMG_TTL = 7 * 24 * 3600 * 1000; // Wikipedia slike su stabilne, keš na 7 dana
let _destImgMap = {};               // naziv destinacije → URL slike
let _destImgStarted = false;
function destImgEndpoint(){
  if (window.SKLOPI_DEST_IMG_URL) return window.SKLOPI_DEST_IMG_URL;
  const base = window.SKLOPI_ALERT_WORKER_URL;
  return base ? String(base).replace(/\/$/, '') + '/go/destination-images' : '';
}
function destViatorQuery(it){
  const en = DEST_EN_NAMES[it.dest] || it.dest;
  const kw = DEST_IMG_KEYWORD[it.row] || '';
  return en + (kw ? ' ' + kw : '');
}
// Naslov Wikipedia članka za grad (bez zemlje posle zareza — REST API to ne voli).
function destWikiTitle(it){
  const en = DEST_EN_NAMES[it.dest] || it.dest;
  return en.split(',')[0].trim();
}
function destReadImgCache(key, ttl){
  try {
    const c = JSON.parse(localStorage.getItem(key) || 'null');
    if (c && c.m && Date.now() - c.ts < ttl) return c;
  } catch(e){}
  return {ts: Date.now(), m: {}};
}
function destWriteImgCache(key, c){ try { localStorage.setItem(key, JSON.stringify(c)); } catch(e){} }
// Ubacuje <img> u već iscrtane kartice, bez ponovnog iscrtavanja (čuva skrol slajdera).
function destApplyImages(){
  document.querySelectorAll('#destRows .dest-card').forEach(card => {
    const photo = card.querySelector('.dc-photo');
    const url = _destImgMap[card.dataset.dest];
    if (!photo || !url || photo.querySelector('img')) return;
    const img = document.createElement('img');
    img.alt = ''; img.decoding = 'async'; img.loading = 'lazy'; img.src = url;
    photo.insertBefore(img, photo.firstChild);
  });
}
// PRIVREMENO: Wikipedia REST API (javan, ne traži ključ) dok Viator Worker ne bude spreman.
// Čim SKLOPI_DEST_IMG_URL / SKLOPI_ALERT_WORKER_URL budu podešeni u config.js, Viator
// automatski preuzima prioritet (vidi destLoadImages ispod) — ovo ostaje samo kao rezerva
// ako Viator za neku destinaciju ne vrati sliku.
async function fetchWikiImage(title){
  try {
    const r = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title));
    if (!r.ok) return '';
    const data = await r.json();
    return (data.thumbnail && data.thumbnail.source) || (data.originalimage && data.originalimage.source) || '';
  } catch(e){ return ''; }
}
async function destLoadImagesWiki(rows){
  const items = rows.flatMap(r => r.items || []).filter(it => !it.img && !DEST_IMG_OVERRIDES[it.dest] && !_destImgMap[it.dest]);
  if (!items.length) return;
  const cache = destReadImgCache(WIKI_IMG_CACHE_KEY, WIKI_IMG_TTL);
  const need = [];
  items.forEach(it => { if (cache.m[it.dest]) _destImgMap[it.dest] = cache.m[it.dest]; else need.push(it); });
  destApplyImages();
  if (!need.length) return;
  let next = 0;
  async function worker(){
    while (next < need.length){
      const it = need[next++];
      const url = await fetchWikiImage(destWikiTitle(it));
      if (url){ cache.m[it.dest] = url; _destImgMap[it.dest] = url; }
    }
  }
  await Promise.all(Array.from({length: Math.min(4, need.length)}, worker));
  destWriteImgCache(WIKI_IMG_CACHE_KEY, cache);
  destApplyImages();
}
// Traži sliku za JEDNU destinaciju (Viator ako je Worker podešen, inače/uz to Wikipedia) —
// koristi se pri zameni kartice koja nije dobila sliku.
async function destFetchOneImage(it){
  const endpoint = destImgEndpoint();
  if (endpoint){
    try {
      const r = await fetch(endpoint, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({items:[{d: it.dest, q: destViatorQuery(it)}]})
      });
      if (r.ok){
        const got = ((await r.json()) || {}).images || {};
        if (got[it.dest]) return got[it.dest];
      }
    } catch(e){ /* padamo na Wikipedia ispod */ }
  }
  return fetchWikiImage(destWikiTitle(it));
}
// Ako kartica na poziciji idx u redu nema sliku, zameni je sledećom rezervnom destinacijom
// (do 2 pokušaja — ako ni rezerva nema sliku, probaj sledeću rezervu pa odustani).
async function destTryReplacement(row, idx, triesLeft){
  if (!row.spares || !row.spares.length || triesLeft <= 0) return;
  const oldItem = row.items[idx];
  const spare = row.spares.shift();
  const oldEl = document.querySelector('#destRows .dest-card[data-dest="' + CSS.escape(oldItem.dest) + '"]');
  row.items[idx] = spare;
  if (oldEl) oldEl.outerHTML = destCardHtml(spare);
  const url = await destFetchOneImage(spare);
  if (url){
    _destImgMap[spare.dest] = url;
    destApplyImages();
  } else {
    await destTryReplacement(row, idx, triesLeft - 1);
  }
}
// Prolazi kroz sve redove i menja kartice bez slike rezervnim destinacijama (ako ih ima).
async function destFillMissingImages(rows){
  for (const row of rows){
    if (!row.items || !row.items.length) continue;
    for (let i = 0; i < row.items.length; i++){
      const it = row.items[i];
      if (it.img || DEST_IMG_OVERRIDES[it.dest] || _destImgMap[it.dest]) continue;
      await destTryReplacement(row, i, 2);
    }
  }
}
async function destLoadImages(rows){
  const endpoint = destImgEndpoint();
  if (endpoint){
    const items = rows.flatMap(r => r.items || []).filter(it => !it.img && !DEST_IMG_OVERRIDES[it.dest]);
    if (items.length){
      const cache = destReadImgCache(DEST_IMG_CACHE_KEY, DEST_IMG_TTL);
      const need = [];
      items.forEach(it => { if (cache.m[it.dest]) _destImgMap[it.dest] = cache.m[it.dest]; else need.push(it); });
      destApplyImages();
      if (need.length){
        try {
          const r = await fetch(endpoint, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({items: need.map(it => ({d: it.dest, q: destViatorQuery(it)}))})
          });
          if (!r.ok) throw new Error('HTTP ' + r.status);
          const got = ((await r.json()) || {}).images || {};
          Object.keys(got).forEach(k => { if (got[k]){ cache.m[k] = got[k]; _destImgMap[k] = got[k]; } });
          destWriteImgCache(DEST_IMG_CACHE_KEY, cache);
        } catch(e){ console.warn('[sklopi] destinacije: slike sa Viator-a nisu stigle.', e); }
        destApplyImages();
      }
    }
  }
  await destLoadImagesWiki(rows); // popuni Wikipedia slikom sve što Viator nije pokrio (ili sve, ako Viator još nije podešen)
  await destFillMissingImages(rows); // ono što ni Wikipedia nije pokrila — zameni rezervnom destinacijom
}
// Slike se traže tek kad je sekcija blizu vidnog polja (ne opterećuje početno učitavanje).
function destStartImages(rows){
  if (_destImgStarted) return;
  _destImgStarted = true;
  const sec = document.getElementById('destinacije');
  if (sec && 'IntersectionObserver' in window){
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)){ io.disconnect(); destLoadImages(rows); }
    }, {rootMargin:'600px 0px'});
    io.observe(sec);
  } else destLoadImages(rows);
}

/* ---- partnerska ponuda na kartici ---- */
function destKind(it){ return it.partner || DEST_ROW_PARTNER[it.row] || 'hotel'; }
function destPhotoFor(it){ return it.img || DEST_IMG_OVERRIDES[it.dest] || _destImgMap[it.dest] || ''; }
// Ilustrativni hotel: ista fetchHotel() kao na karticama ponude (4★, 2 osobe, 1 noć),
// seed po gradu — pa je hotel na kartici uvek isti za isti grad.
function destSimHotel(dest){
  const rng = seededRandom(hashSeed('destcard|' + String(dest).toLowerCase()));
  return fetchHotel(rng, dest, 1, 2, 'best', {hotelStars:4}, null);
}
// Link se računa u trenutku klika (datumi u formi su se mogli promeniti od iscrtavanja).
function destPartnerLink(kind, dest, rowKey){
  if (kind === 'hotel'){
    const val = id => (document.getElementById(id) || {}).value || '';
    const from = val('dateFrom'), to = val('dateTo');
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    if (iso.test(from) && iso.test(to) && to > from){
      return buildAffiliateLink('hotel', {dest, from, to, adults: Number(val('adults')) || 2, hotelStars: 4});
    }
    return buildAffiliateLink('hotel', {dest, hotelStars: 4});
  }
  const en = DEST_EN_NAMES[dest] || dest;
  const kw = DEST_VIATOR_KEYWORD[rowKey] || '';
  return buildAffiliateLink('activity', {dest: en + (kw ? ' ' + kw : '')});
}
function destOfferHtml(it, kind){
  const provider = PARTNERS[kind].name;
  if (kind === 'hotel'){
    const h = destSimHotel(it.dest);
    return `<div class="dc-offer">
      <div class="item-label"><span>${escapeHtml(t('item_label_hotel'))}</span><span class="item-provider">${escapeHtml(provider)}</span></div>
      <div class="item-name">${escapeHtml(h.name)}</div>
      <div class="item-sub">${escapeHtml(h.sub)}</div>
      <div class="item-price tabular">${fmtEUR(h.price)} <span class="dc-per">${escapeHtml(dtx('per_night'))}</span></div>
      <div class="dc-actions"><a class="item-btn hotel dc-book" href="${escapeHtml(destPartnerLink('hotel', it.dest, it.row))}" target="_blank" rel="noopener sponsored" data-kind="hotel" data-price="${h.price}" data-url="" data-dest="${escapeHtml(it.dest)}" data-tier="destinacije" onclick="bookItem(this)">${escapeHtml(t('btn_book_booking'))}</a>${affBadgeHtml()}</div>
    </div>`;
  }
  const nameKey = it.row === 'nature' ? 'act_nature' : 'act_city';
  return `<div class="dc-offer">
      <div class="item-label"><span>${escapeHtml(dtx('label_activity'))}</span><span class="item-provider">${escapeHtml(provider)}</span></div>
      <div class="item-name">${escapeHtml(dtx(nameKey))}</div>
      <div class="item-sub">${escapeHtml(dtx('act_sub'))}</div>
      <div class="dc-actions"><a class="item-btn activity dc-book" href="${escapeHtml(destPartnerLink('activity', it.dest, it.row))}" target="_blank" rel="noopener sponsored" data-kind="activity" data-price="0" data-url="" data-dest="${escapeHtml(it.dest)}" data-tier="destinacije" onclick="bookItem(this)">${escapeHtml(dtx('btn_viator'))}</a>${affBadgeHtml()}</div>
    </div>`;
}

/* ---- prikaz ---- */
let _destRowsPromise = null;
function destCardHtml(it){
  const name = cityLabel(it.dest);
  const country = it.country ? countryLabel(it.country) : '';
  const url = destPhotoFor(it);
  const kind = destKind(it);
  const icon = DEST_ROW_ICON[it.row] || (kind === 'hotel' ? '🏨' : '🎟️');
  // Obaveštenje za mesta bez sopstvenog aerodroma (ista baza/logika kao svuda
  // drugde u aplikaciji — airportInfoFor/airportNoteText), da korisnik odmah
  // na kartici vidi da let ide na najbliži aerodrom, a ne u sam grad.
  const apInfo = airportInfoFor(it.dest);
  const noOwnAirport = apInfo && !apInfo.hasAirport;
  const apNote = noOwnAirport ? airportNoteText(apInfo) : '';
  return `<div class="dest-card dest-card--${kind}" data-dest="${escapeHtml(it.dest)}" data-kind="${kind}" data-row="${escapeHtml(it.row || '')}">
    <button type="button" class="dc-pick" aria-label="${escapeHtml(dtx('pick_aria') + name)}">
      <span class="dc-photo">${url ? `<img src="${escapeHtml(url)}" alt="" loading="lazy" decoding="async">` : `<span class="dc-ico" aria-hidden="true">${icon}</span>`}</span>
      <span class="dc-cap"><span class="dc-name">${escapeHtml(name)}</span>${country ? `<span class="dc-country">${escapeHtml(country)}</span>` : ''}</span>
    </button>
    ${apNote ? `<p class="dc-airport-note" style="margin:6px 10px 0;font-size:12px;line-height:1.35;color:var(--muted,#8a8f98);">\u2708\ufe0f ${escapeHtml(apNote)}</p>` : ''}
    ${destOfferHtml(it, kind)}
  </div>`;
}
function destRowHtml(row, idx){
  const items = row.items || [];
  if (!items.length) return '';
  const title = row.title || dtx('row_' + row.key) || row.key || '';
  const arrow = (dir, path) => `<button type="button" class="attractions-arrow attractions-arrow--${dir < 0 ? 'prev' : 'next'}" data-dir="${dir}" aria-label="${escapeHtml(dtx(dir < 0 ? 'prev' : 'next'))}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg></button>`;
  return `<div class="dest-row" data-row="${escapeHtml(row.key || '')}">
    <h3 class="dest-row-title" id="destRowTitle${idx}">${escapeHtml(title)}</h3>
    <div class="attractions-slider-wrap">
      ${arrow(-1, 'M15 18l-6-6 6-6')}
      <div class="attractions-slider dest-slider" role="group" aria-labelledby="destRowTitle${idx}">${items.map(destCardHtml).join('')}</div>
      ${arrow(1, 'M9 18l6-6-6-6')}
    </div>
  </div>`;
}
async function renderDestinations(){
  const wrap = document.getElementById('destRows');
  if (!wrap) return;
  [['destSecEyebrow','eyebrow'], ['destSecTitle','title'], ['destSecSub','sub'], ['destCreditText','credit']].forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = dtx(key);
  });
  if (!_destRowsPromise) _destRowsPromise = loadDestinationRows();
  const rows = await _destRowsPromise;
  wrap.innerHTML = rows.map(destRowHtml).join('');
  destStartImages(rows);
}
(function initDestinations(){
  const wrap = document.getElementById('destRows');
  if (!wrap) return;
  // Link ka partneru se osvežava PRE nego što se okine dugme (capture faza), da nosi
  // trenutne datume/putnike iz forme, a GA klik (bookItem) dobije isti URL.
  wrap.addEventListener('click', (e) => {
    const book = e.target.closest && e.target.closest('a.dc-book');
    if (!book) return;
    const card = book.closest('.dest-card');
    if (!card) return;
    book.href = destPartnerLink(card.dataset.kind, card.dataset.dest, card.dataset.row);
    book.dataset.url = book.href;
  }, true);
  wrap.addEventListener('click', (e) => {
    const arrowBtn = e.target.closest('.attractions-arrow');
    if (arrowBtn){
      const slider = arrowBtn.parentElement.querySelector('.dest-slider');
      if (slider) slider.scrollBy({left: Number(arrowBtn.dataset.dir) * Math.max(240, slider.clientWidth * 0.8), behavior:'smooth'});
      return;
    }
    const pick = e.target.closest('.dc-pick');
    if (!pick) return;
    const card = pick.closest('.dest-card');
    if (!card) return;
    // Isti tok kao dolazak sa ?dest= (prefillDestFromQuery): popuni Destinacija i skroluj
    // do forme, BEZ automatske pretrage — datume i putnike korisnik i dalje bira.
    const destInput = document.getElementById('dest');
    if (!destInput) return;
    destInput.value = card.dataset.dest;
    document.getElementById('searchForm')?.scrollIntoView({behavior:'smooth', block:'start'});
  });
  // Fotografija koja ne učita se sakriva, a kartica ostaje čitljiva na gradijentu.
  wrap.addEventListener('error', (e) => {
    if (e.target && e.target.tagName === 'IMG') e.target.classList.add('is-broken');
  }, true);
})();
renderDestinations();
const _prevOnLangChangeDest = window.onLangChange;
window.onLangChange = function(lang){
  if (typeof _prevOnLangChangeDest === 'function') _prevOnLangChangeDest(lang);
  renderDestinations();
};
// Promena valute (EUR/RSD): cena hotela na karticama se iscrtava ponovo.
const _prevRefreshPricesDest = refreshDisplayedPrices;
refreshDisplayedPrices = function(){
  _prevRefreshPricesDest();
  renderDestinations();
};


/* ==========================================================
   HERO: Budžet / Balans / Komfor
   Izbor postavlja preset (zvezdice hotela + tip leta) u builderState,
   sinhronizuje se sa čipovima u "Sastavi svoj paket" i određuje koji
   paket u rezultatima ide prvi (Budžet -> budget, Balans -> best,
   Komfor -> comfort). Izbor se pamti u localStorage.
========================================================== */
(function initHeroTier(){
  const wrap = document.querySelector('.hero-benefits');
  if (!wrap) return;
  const btns = Array.from(wrap.querySelectorAll('.hero-benefit[data-tier]'));
  if (!btns.length) return;
  const PRESETS = {budget:{stars:3, flight:'cheapest'}, balance:{stars:4, flight:'direct'}, comfort:{stars:5, flight:'direct'}};
  const LABEL = {budget:'Budžet', balance:'Balans', comfort:'Komfor'};
  const KEY = 'sklopi_tier';
  let syncing = false;

  function paint(tier){
    btns.forEach(b => {
      const on = b.dataset.tier === tier;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function apply(tier, opts){
    opts = opts || {};
    if (!PRESETS[tier]) return;
    window.SKLOPI_tier = tier;
    window.SKLOPI_tierChosen = true;
    paint(tier);
    const p = PRESETS[tier];
    builderState.hotelStars = p.stars;
    builderState.flightPref = p.flight;
    try { renderFormUI(); } catch (e) {}
    if (!opts.fromPlanner){
      const chip = document.querySelector('#customPlanner .cp-group[data-group="tier"] .cp-chip[data-value="' + tier + '"]');
      if (chip){ syncing = true; try { chip.click(); } finally { syncing = false; } }
    }
    try { localStorage.setItem(KEY, tier); } catch (e) {}
    if (opts.toast && typeof showToast === 'function') showToast(tx('Stil putovanja: ') + tx(LABEL[tier]));
  }

  btns.forEach(b => b.addEventListener('click', () => apply(b.dataset.tier, {toast:true})));

  // Klik na Budžet/Balans/Komfor u "Sastavi svoj paket" pomera i hero izbor.
  document.querySelectorAll('#customPlanner .cp-group[data-group="tier"] .cp-chip').forEach(chip => {
    chip.addEventListener('click', () => { if (!syncing) apply(chip.dataset.value, {fromPlanner:true}); });
  });

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved && PRESETS[saved]) apply(saved);
})();


/* Promena jezika: osvežava delove koji se iscrtavaju iz JS-a (Tvoj personalizovani plan,
   detalj plana, razrada, Moj put). Statički tekst prevodi applyStaticI18n(). */
(function(){
  const prev = window.onLangChange;
  window.onLangChange = function(lang){
    if (typeof prev === 'function') prev(lang);
    document.dispatchEvent(new Event('sklopi:lang'));
  };
})();


/* Registracija service worker-a — neophodno da bi Chrome ponudio
   pravu instalaciju ("Instaliraj"), ne samo prečicu. */
(function(){
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('/sw.js').catch(function(){});
  });
})();
