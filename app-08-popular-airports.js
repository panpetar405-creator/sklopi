/* app-08-popular-airports.js — deo nekadašnjeg app.js (deo 8/11): Popularne destinacije, regionalni signal, upozorenja i saveti za aerodrome.
   Klasična skripta: deli globalni opseg sa ostalim app-*.js fajlovima; redosled učitavanja u index.html je bitan. */
/* ==========================================================
   POPULARNE DESTINACIJE — statične kartice u HTML-u (SEO sadržaj
   vidljiv i bez JS-a); klik samo puni postojeću formu i pokreće
   isti runSearch() koji se koristi za "Pronađi najbolje putovanje".
   Namerno stoji PRE Supabase inicijalizacije ispod — ako config.js
   nedostane ili baci grešku, ovo i dalje treba da radi.
========================================================== */
document.querySelectorAll('.popular-dest-card').forEach(card => {
  card.addEventListener('click', () => {
    document.getElementById('dest').value = card.dataset.dest;
    if (window.SKLOPI_setSpotlight) window.SKLOPI_setSpotlight(card.dataset.dest, {generic:true, loose:true});
    if (!isMobileResults()) document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
    runSearch(false);
  });
});

/* ==========================================================
   REGIONALNI SIGNAL — "Popularno kod putnika iz [tvog grada]"
   umesto univerzalne top-liste. Ovo je uredničko, ručno sastavljeno
   po realnim navikama iz svakog grada (aerodrom, sezonski čarteri,
   praksa letenja preko bližeg stranog aerodroma) — NIJE uživo
   statistika i ne pretvaramo se da jeste. Ako grad iz polja "Polazak"
   nije prepoznat, ostaje originalni (Beograd-orijentisani) SEO sadržaj
   iz HTML-a, bez ikakve promene.
========================================================== */
const REGIONAL_POPULAR_DESTINATIONS = {
  'beograd': { genitiv:'Beograda', show:6, cards: [
    {dest:'Atina', name:'Atina, Grčka', desc:'Antika, ostrvski trajekti i vrhunska kuhinja — česti direktni letovi iz Beograda.'},
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum, Vatikan i ulična kuhinja — kratak let, grad se obilazi peške.'},
    {dest:'Barselona', name:'Barselona, Španija', desc:'Gaudijeva arhitektura, plaža i tapas bari — omiljena kombinacija grada i mora.'},
    {dest:'Budva', name:'Budva, Crna Gora', desc:'Najbliže more autom — 4-5h vožnje, stara varoš i duge plaže.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, bazari i Bosfor — pristupačan izlet van sezone.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji, kafei i božićne pijace zimi — praktičan gradski izlet za vikend.'},
    {dest:'Solun', name:'Solun, Grčka', desc:'More bez potrebe za letom — oko 6-7h vožnje, popularno van glavne sezone.'},
    {dest:'Budimpešta', name:'Budimpešta, Mađarska', desc:'Kratak let ili vožnja — kupatila, arhitektura i praktičan gradski izlet.'}
  ]},
  'novi sad': { genitiv:'Novog Sada', show:5, cards: [
    {dest:'Budimpešta', name:'Budimpešta, Mađarska', desc:'Oko 2h vožnje — low-cost letovi odatle su često jeftiniji nego iz Beograda.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Direktan voz i autobus iz Novog Sada — praktičan gradski izlet bez presedanja.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Za more i ostrva i dalje se najisplativije leti preko Beograda.'},
    {dest:'Budva', name:'Budva, Crna Gora', desc:'Najbliže more autom — stara varoš i duge plaže.'},
    {dest:'Zagreb', name:'Zagreb, Hrvatska', desc:'Kratka vožnja, praktičan vikend izlet uz adventski sadržaj zimi.'},
    {dest:'Solun', name:'Solun, Grčka', desc:'More bez potrebe za letom — preko Beograda ili direktno autom.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije — let preko Beograda.'}
  ]},
  'nis': { genitiv:'Niša', show:4, cards: [
    {dest:'Solun', name:'Solun, Grčka', desc:'Oko 3h vožnje — najbliže more za vikend izlet, bez potrebe za letom.'},
    {dest:'Skoplje', name:'Skoplje, Sev. Makedonija', desc:'Blizu, praktično autom za kraći izlet.'},
    {dest:'Antalija', name:'Antalija, Turska', desc:'Sezonski čarter letovi direktno sa aerodroma u Nišu, van glavne sezone jeftiniji.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Za većinu daljih destinacija, presedanje preko Beograda ili Istanbula je i dalje najisplativije.'},
    {dest:'Sofija', name:'Sofija, Bugarska', desc:'Blizu, praktično autom ili vozom za kraći izlet.'},
    {dest:'Budva', name:'Budva, Crna Gora', desc:'More autom — nešto duža vožnja, ali bez potrebe za letom.'}
  ]},
  'podgorica': { genitiv:'Podgorice', show:4, cards: [
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije — praktičan let sa podgoričkog aerodroma.'},
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum, Vatikan i ulična kuhinja — kratak let preko mora.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji i kafei — praktičan gradski izlet.'},
    {dest:'Barselona', name:'Barselona, Španija', desc:'Arhitektura, plaža i tapas bari.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Antika i ostrva — let preko mora.'},
    {dest:'Milano', name:'Milano, Italija', desc:'Moda, dizajn i kratak let preko mora.'}
  ]},
  'subotica': { genitiv:'Subotice', show:4, cards: [
    {dest:'Budimpešta', name:'Budimpešta, Mađarska', desc:'Manje od 3h vožnje i blizu granice — često praktičnija polazna tačka nego Beograd.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji, kafei i gradska šetnja — dostupan i preko Budimpešte.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Za more i ostrva, let preko Beograda je i dalje najisplativiji.'},
    {dest:'Zagreb', name:'Zagreb, Hrvatska', desc:'Kraća vožnja, praktičan vikend izlet.'},
    {dest:'Prag', name:'Prag, Češka', desc:'Arhitektura i pivnice — dostupan preko Budimpešte.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, let preko Beograda.'}
  ]},
  'kragujevac': { genitiv:'Kragujevca', show:4, cards: [
    {dest:'Atina', name:'Atina, Grčka', desc:'Antika i ostrva — let preko Beograda, oko 1h vožnje do aerodroma.'},
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum i ulična kuhinja — kratak let iz Beograda.'},
    {dest:'Budva', name:'Budva, Crna Gora', desc:'Najbliže more autom — oko 3h vožnje.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, pristupačan izlet van sezone.'},
    {dest:'Barselona', name:'Barselona, Španija', desc:'Arhitektura, plaža i tapas bari — let preko Beograda.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji i kafei — praktičan gradski izlet.'}
  ]},
  'kraljevo': { genitiv:'Kraljeva', show:4, cards: [
    {dest:'Budva', name:'Budva, Crna Gora', desc:'Jedna od bližih ruta do mora sa juga Srbije — oko 3h vožnje.'},
    {dest:'Solun', name:'Solun, Grčka', desc:'Preko Niša, oko 4h vožnje — more bez potrebe za letom.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Za ostrva i dalje, let preko Beograda ili Niša.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, pristupačan izlet van sezone.'},
    {dest:'Podgorica', name:'Podgorica, Crna Gora', desc:'Alternativni pravac za let ka moru ili dalje.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji i kafei — let preko Beograda.'}
  ]},
  'novi pazar': { genitiv:'Novog Pazara', show:4, cards: [
    {dest:'Budva', name:'Budva, Crna Gora', desc:'Preko Rožaja — jedna od kraćih ruta do mora sa juga Srbije.'},
    {dest:'Podgorica', name:'Podgorica, Crna Gora', desc:'Bliži aerodrom za neke pravce nego Beograd — vredi uporediti oba.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, pristupačan izlet van sezone.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Za ostrva, let preko Beograda ili Podgorice.'},
    {dest:'Sarajevo', name:'Sarajevo, BiH', desc:'Blizu, praktično autom za kraći izlet.'},
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum i ulična kuhinja — let preko Beograda ili Podgorice.'}
  ]},
  'banja luka': { genitiv:'Banje Luke', show:4, cards: [
    {dest:'Zagreb', name:'Zagreb, Hrvatska', desc:'Oko 2h vožnje — mnogo širi izbor letova nego banjalučki aerodrom.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji i kafei — praktičan gradski izlet.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, pristupačan izlet van sezone.'},
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum, Vatikan i ulična kuhinja.'},
    {dest:'Budimpešta', name:'Budimpešta, Mađarska', desc:'Šira mreža letova nego banjalučki aerodrom, oko 4-5h vožnje.'},
    {dest:'Barselona', name:'Barselona, Španija', desc:'Arhitektura, plaža i tapas bari.'}
  ]},
  'sarajevo': { genitiv:'Sarajeva', show:4, cards: [
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije — česti direktni letovi sa sarajevskog aerodroma.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji, kafei i gradska šetnja — kratak let.'},
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum, Vatikan i ulična kuhinja.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Antika, ostrva i vrhunska kuhinja.'},
    {dest:'Barselona', name:'Barselona, Španija', desc:'Arhitektura, plaža i tapas bari.'},
    {dest:'Budimpešta', name:'Budimpešta, Mađarska', desc:'Kratak let ili vožnja preko Hrvatske.'}
  ]},
  'skoplje': { genitiv:'Skoplja', show:4, cards: [
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum i ulična kuhinja — česti low-cost letovi sa skopskog aerodroma.'},
    {dest:'Barselona', name:'Barselona, Španija', desc:'Arhitektura, plaža i tapas bari.'},
    {dest:'Solun', name:'Solun, Grčka', desc:'Blizu, praktično i autom — oko 3h vožnje.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, pristupačan izlet van sezone.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Antika, ostrva i vrhunska kuhinja.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji, kafei i gradska šetnja.'}
  ]}
};
/* ==========================================================
   Podrazumevani ("Gde bi sledeće?") skup — kad polje Polazak nije
   prepoznato ili je prazno. Umesto fiksnih 6 kartica iz HTML-a,
   biramo dnevno-rotirajući podskup iz šireg pool-a (ispod), preko
   dailyPick() — isto za sve posetioce istog dana, drugačije sutra.
   Prevodi idu preko t()/I18N (pd_* ključevi), da poštuje SR/EN.
========================================================== */
const DEFAULT_POPULAR_DEST_POOL = [
  {dest:'Atina', name:'Atina', desc:'Antika, kultura i more — idealan mediteranski city break.', meta:'Grčka · 1h 20m', price:'od 247 €', category:'city', image:'https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=500&q=82'},
  {dest:'Istanbul', name:'Istanbul', desc:'Spoj Evrope i Azije, Bosfor i bogata gradska scena.', meta:'Turska · 2h', price:'od 199 €', category:'city', image:'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=500&q=82'},
  {dest:'Krf', name:'Krf', desc:'Mirnije uvale, more i mediteranski ritam za odmor.', meta:'Grčka · 1h 20m', price:'od 229 €', category:'nature', image:'https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?auto=format&fit=crop&w=500&q=82'},
  {dest:'Pariz', name:'Pariz', desc:'Muzeji, arhitektura i gradske šetnje.', meta:'Francuska · 2h 30m', price:'od 349 €', category:'city', image:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=500&q=82'},
  {dest:'Lisabon', name:'Lisabon', desc:'Vidikovci, tramvaji i Atlantski vazduh.', meta:'Portugal · 3h', price:'od 299 €', category:'city', image:'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=500&q=82'}
];
const POPULAR_DEST_IMAGES = Object.fromEntries(DEFAULT_POPULAR_DEST_POOL.map(x => [normalizeSr(x.dest), x.image]));
/* Oznake po destinaciji — jedna destinacija može biti u više kategorija
   (npr. Barselona = city + sea + weekend). Ključevi: sea (More), city (City break),
   nature (Priroda), weekend (Vikend = kratak let/vožnja). Čipovi filtriraju po ovome. */
const POPULAR_DEST_TAGS = {
  'atina':['city','sea'], 'istanbul':['city','weekend'], 'krf':['sea','nature'],
  'pariz':['city','weekend'], 'lisabon':['city','sea'], 'rim':['city','weekend'],
  'barselona':['city','sea','weekend'], 'budva':['sea','weekend'], 'bec':['city','weekend'],
  'solun':['city','sea','weekend'], 'budimpesta':['city','weekend'], 'prag':['city','weekend'],
  'zagreb':['city','weekend'], 'dubrovnik':['sea','city','weekend'], 'santorini':['sea'],
  'kotor':['sea','nature','weekend'], 'plitvicka jezera':['nature','weekend'], 'bled':['nature','weekend'],
  'ohrid':['nature','weekend'], 'durmitor':['nature'], 'split':['sea','city','weekend'],
  'ljubljana':['city','weekend'], 'venecija':['city','weekend']
};
function popularTagsFor(key){ return POPULAR_DEST_TAGS[normalizeSr(key || '')] || []; }
// Dodatne destinacije za filtere (kartice iz DEFAULT_POPULAR_DEST_POOL imaju slike; ove dobijaju
// rezervnu sliku dok se ne doda prava — dopuni image/price kad budeš imao podatke).
const EXTRA_POPULAR_DEST_POOL = ['Dubrovnik','Santorini','Kotor','Plitvička Jezera','Bled','Ohrid','Durmitor','Split','Ljubljana','Venecija']
  .map(n => ({dest:n, name:n}));
const POPULAR_FILTER_POOL = DEFAULT_POPULAR_DEST_POOL.concat(
  ['Rim','Barselona','Budva','Beč','Solun','Budimpešta','Prag','Zagreb'].map(n => ({dest:n, name:n})),
  EXTRA_POPULAR_DEST_POOL);
let _popularFilter = 'sea';
function popularActiveFilter(){
  const a = document.querySelector('[data-popular-filter].is-active');
  return a ? a.dataset.popularFilter : _popularFilter;
}
const POPULAR_DEST_META = {
  'atina':['Grčka · 1h 20m','od 247 €','city'], 'istanbul':['Turska · 2h','od 199 €','city'],
  'krf':['Grčka · 1h 20m','od 229 €','nature'], 'pariz':['Francuska · 2h 30m','od 349 €','city'],
  'lisabon':['Portugal · 3h','od 299 €','city'], 'rim':['Italija · 1h 40m','od 239 €','city'],
  'barselona':['Španija · 2h 40m','od 289 €','city'], 'budva':['Crna Gora · 1h 10m','od 159 €','weekend'],
  'bec':['Austrija · 1h 25m','od 219 €','city'], 'beč':['Austrija · 1h 25m','od 219 €','city'],
  'solun':['Grčka · 1h 15m','od 189 €','weekend'], 'budimpesta':['Mađarska · 1h 30m','od 179 €','city'],
  'prag':['Češka · 1h 45m','od 259 €','city'], 'zagreb':['Hrvatska · 1h','od 169 €','weekend'],
  'dubrovnik':['Hrvatska','','sea'], 'santorini':['Grčka','','sea'], 'kotor':['Crna Gora','','sea'],
  'plitvicka jezera':['Hrvatska','','nature'], 'bled':['Slovenija','','nature'], 'ohrid':['Severna Makedonija','','nature'],
  'durmitor':['Crna Gora','','nature'], 'split':['Hrvatska','','sea'], 'ljubljana':['Slovenija','','city'],
  'venecija':['Italija','','city']
};
// Kartice "Popularne destinacije": naziv države i "od" su fiksni na srpskom u podacima -- prevodi se pri prikazu.
function popularMetaLabel(m){
  const parts = String(m || '').split(/\s*[\u00B7\u2022]\s*/);
  return parts.length > 1 ? [countryLabel(parts[0])].concat(parts.slice(1)).join(' \u00B7 ') : String(m || '');
}
function popularPriceLabel(pr){ return String(pr || '').replace(/^od\s+/i, () => tx('od ')); }
function popularCardData(card){
  const key = normalizeSr(card.dest || '');
  const meta = POPULAR_DEST_META[key] || [card.name || '', '', 'all'];
  return {
    dest: card.dest || '',
    name: cityLabel(card.name || t(card.nameKey || '') || card.dest || ''),
    desc: card.desc || (card.descKey ? t(card.descKey) : ''),
    meta: popularMetaLabel(card.meta || meta[0]),
    price: popularPriceLabel(card.price || meta[1]),
    category: (popularTagsFor(card.dest || card.name).join(' ')) || card.category || meta[2] || 'all',
    image: card.image || POPULAR_DEST_IMAGES[key] || ''
  };
}
function popularCardHtml(card){
  const c = popularCardData(card);
  const noImg = !c.image;   // bez svoje slike → slika se učitava kao u ostalim sekcijama (popularFillImages)
  return '<button type="button" class="popular-dest-card" data-dest="' + escapeHtml(c.dest) + '" data-category="' + escapeHtml(c.category) + '"' + (noImg ? ' data-noimg="1"' : '') + '>'
    + '<span class="pd-thumb"' + (noImg ? ' style="background:#e4eef1"' : '') + '><img ' + (noImg ? '' : 'src="' + escapeHtml(c.image) + '" ') + 'alt="' + (noImg ? '' : escapeHtml(c.name)) + '" loading="lazy"></span>'
    + '<span class="pd-copy"><span class="pd-name">' + escapeHtml(c.name) + '</span>'
    + '<span class="pd-meta">' + escapeHtml(c.meta) + '</span>'
    + '<span class="pd-price">' + escapeHtml(c.price) + '</span></span>'
    + '<span class="pd-arrow" aria-hidden="true">›</span>'
    + '</button>';
}
/* Slike kartica bez sopstvene slike — isti izvori kao u ostalim sekcijama:
   1) urednička fotografija grada (SKLOPI_destPhoto, ista kao u planovima),
   2) već učitana slika iz sekcije „Destinacije“ / zajednički keš,
   3) Viator (ako je Worker podešen) pa Wikipedia. */
const POPULAR_WIKI_TITLES = {
  'Split':'Split,_Croatia', 'Plitvička Jezera':'Plitvice_Lakes_National_Park', 'Durmitor':'Durmitor',
  'Kotor':'Kotor', 'Bled':'Bled', 'Ohrid':'Ohrid', 'Budva':'Budva', 'Zagreb':'Zagreb', 'Dubrovnik':'Dubrovnik',
  'Santorini':'Santorini', 'Ljubljana':'Ljubljana', 'Istanbul':'Istanbul'
};
async function popularFillImages(grid){
  const cards = Array.from(grid.querySelectorAll('.popular-dest-card[data-noimg="1"]'));
  if (!cards.length) return;
  const put = (card, url) => {
    if (!url || !card.isConnected) return;
    const img = card.querySelector('.pd-thumb img');
    if (!img) return;
    img.alt = card.dataset.dest || ''; img.src = url; card.dataset.noimg = '0';
  };
  const cache = destReadImgCache(WIKI_IMG_CACHE_KEY, WIKI_IMG_TTL);
  const need = [];
  cards.forEach(card => {
    const d = card.dataset.dest;
    const url = (window.SKLOPI_destPhoto && window.SKLOPI_destPhoto(d, 300)) || _destImgMap[d] || cache.m[d];
    if (url) put(card, url); else need.push(card);
  });
  let next = 0;
  async function worker(){
    while (next < need.length){
      const card = need[next++], d = card.dataset.dest;
      let url = '';
      try {
        if (destImgEndpoint()) url = await destFetchOneImage({dest:d, row:''});
        if (!url) url = await fetchWikiImage(POPULAR_WIKI_TITLES[d] || destWikiTitle({dest:d}));
      } catch(e){}
      if (url){ cache.m[d] = url; _destImgMap[d] = url; put(card, url); }
    }
  }
  await Promise.all(Array.from({length: Math.min(4, need.length)}, worker));
  destWriteImgCache(WIKI_IMG_CACHE_KEY, cache);
}
function attachPopularDestCardHandlers(grid){
  // odloženo: DEST_* podaci i pomoćnici su definisani niže u fajlu
  setTimeout(() => popularFillImages(grid), 0);
  grid.querySelectorAll('.popular-dest-card').forEach(card => {
    card.addEventListener('click', () => {
      document.getElementById('dest').value = card.dataset.dest;
      if (window.SKLOPI_setSpotlight) window.SKLOPI_setSpotlight(card.dataset.dest, {generic:true, loose:true});
      if (!isMobileResults()) document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
      runSearch(false);
    });
  });
  applyPopularDestFilters();
}
function renderDefaultPopularDestinations(){
  const grid = document.getElementById('popularDestGrid');
  const head = document.getElementById('popularDestHead');
  const eyebrow = document.getElementById('popularDestEyebrow');
  if (!grid || !head) return;
  head.textContent = t('h2_popular_dest');
  if (eyebrow) eyebrow.textContent = t('eyebrow_ideas');
  const f = popularActiveFilter();
  const cards = f === 'all' ? DEFAULT_POPULAR_DEST_POOL : popularCardsForFilter(f, '');
  grid.innerHTML = cards.map(c => popularCardHtml(c)).join('');
  attachPopularDestCardHandlers(grid);
}
// Kartice za izabrani čip: prvo regionalne preporuke za grad polaska koje imaju tu oznaku,
// pa dopuna iz šireg pool-a (bez samog polazišta). Dnevna rotacija ostaje.
function popularCardsForFilter(filter, originRaw, limit){
  limit = limit || 5;
  const has = c => popularTagsFor(c.dest).indexOf(filter) !== -1;
  const originKey = normalizeSr(String(originRaw || '').split(',')[0].trim());
  const norm = normalizeSr((originRaw || '').trim());
  let regional = [];
  if (norm){
    for (const key in REGIONAL_POPULAR_DESTINATIONS){
      if (norm === key || norm.startsWith(key + ' ') || norm.startsWith(key + ',') || norm.includes(' ' + key)){
        regional = REGIONAL_POPULAR_DESTINATIONS[key].cards.filter(has);
        break;
      }
    }
  }
  const out = dailyPick(regional, limit, 'pf-r|' + filter + '|' + norm);
  const seen = new Set(out.map(c => normalizeSr(c.dest)));
  const rest = POPULAR_FILTER_POOL.filter(c => has(c) && !seen.has(normalizeSr(c.dest)) && normalizeSr(c.dest) !== originKey);
  return out.concat(dailyPick(rest, limit - out.length, 'pf|' + filter));
}
function renderRegionalPopularDestinations(originRaw){
  const grid = document.getElementById('popularDestGrid');
  const head = document.getElementById('popularDestHead');
  const eyebrow = document.getElementById('popularDestEyebrow');
  if (!grid || !head) return;
  const norm = normalizeSr((originRaw || '').trim());
  let bucket = null;
  let matchedKey = null;
  if (norm){
    for (const key in REGIONAL_POPULAR_DESTINATIONS){
      if (norm === key || norm.startsWith(key + ' ') || norm.startsWith(key + ',') || norm.includes(' ' + key) ){
        bucket = REGIONAL_POPULAR_DESTINATIONS[key];
        matchedKey = key;
        break;
      }
    }
  }
  if (!bucket){
    // Nepoznat ili prazan grad — vrati podrazumevani (dnevno-rotirajući) sadržaj, ne ostavljaj "zaglavljen" prethodni grad.
    renderDefaultPopularDestinations();
    return;
  }
  const activeFilter = popularActiveFilter();
  if (activeFilter !== 'all'){
    head.textContent = t('h2_popular_dest');
    if (eyebrow) eyebrow.textContent = t('eyebrow_ideas');
    grid.innerHTML = popularCardsForFilter(activeFilter, originRaw).map(c => popularCardHtml(c)).join('');
    attachPopularDestCardHandlers(grid);
    return;
  }
  head.textContent = 'Popularno kod putnika iz ' + bucket.genitiv;
  if (eyebrow) eyebrow.textContent = 'Predlozi prilagođeni tvom polasku';
  const picks = dailyPick(bucket.cards, bucket.show || bucket.cards.length, matchedKey);
  grid.innerHTML = picks.map(c => popularCardHtml(c)).join('');
  attachPopularDestCardHandlers(grid);
}
const popularDestSearch = document.getElementById('popularDestSearch');
const popularDestFilters = document.querySelectorAll('[data-popular-filter]');
function applyPopularDestFilters(){
  const grid = document.getElementById('popularDestGrid');
  if (!grid) return;
  const query = normalizeSr((popularDestSearch?.value || '').trim());
  const active = document.querySelector('[data-popular-filter].is-active')?.dataset.popularFilter || 'all';
  grid.querySelectorAll('.popular-dest-card').forEach(card => {
    const hay = normalizeSr(card.textContent || '');
    const category = card.dataset.category || 'all';
    const matchesQuery = !query || card.dataset.search === '1' || hay.includes(query);
    const matchesFilter = active === 'all' || category.split(' ').indexOf(active) !== -1;
    card.hidden = !(matchesQuery && matchesFilter);
  });
}
/* Pretraga destinacija: traži kroz CELU listu (POPULAR_DESTINATIONS), a ne samo
   kroz 5 kartica koje su trenutno prikazane. Prazno polje vraća regionalni/podrazumevani prikaz. */
function renderPopularSearchResults(rawQuery){
  const grid = document.getElementById('popularDestGrid');
  if (!grid) return;
  const q = (rawQuery || '').trim();
  if (!q){
    popularDestFilters.forEach(b => b.classList.toggle('is-active', b.dataset.popularFilter === _popularFilter));
    renderRegionalPopularDestinations((document.getElementById('origin') || {}).value || '');
    return;
  }
  // tokom pretrage nijedan čip nije aktivan — prikazuju se svi pogoci
  popularDestFilters.forEach(b => b.classList.remove('is-active'));
  const matches = matchPopularDestinations(q).slice(0, 8);
  if (!matches.length){
    grid.innerHTML = '<div class="popular-empty"><p>' + escapeHtml(tx('Nema rezultata za') + ' „' + q + '“') + '</p>'
      + '<button type="button" class="btn-secondary" id="popularEmptySearchBtn">' + escapeHtml(tx('Pretraži ovu destinaciju')) + '</button></div>';
    document.getElementById('popularEmptySearchBtn')?.addEventListener('click', () => {
      document.getElementById('dest').value = q;
      if (!isMobileResults()) document.getElementById('results')?.scrollIntoView({behavior:'smooth', block:'start'});
      runSearch(false);
    });
    return;
  }
  grid.innerHTML = matches.map(d => {
    const meta = POPULAR_DEST_META[normalizeSr(d.name)];
    return popularCardHtml({dest:d.name, name:d.name, meta: meta ? meta[0] : (d.extra || ''), price: meta ? meta[1] : '', category: popularTagsFor(d.name).join(' ') || (meta ? meta[2] : 'all')});
  }).join('');
  grid.querySelectorAll('.popular-dest-card').forEach(c => { c.dataset.search = '1'; });
  attachPopularDestCardHandlers(grid);
}
popularDestSearch?.addEventListener('input', () => renderPopularSearchResults(popularDestSearch.value));
popularDestSearch?.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const grid = document.getElementById('popularDestGrid');
  const first = grid && grid.querySelector('.popular-dest-card:not([hidden])');
  if (first) first.click();
  else document.getElementById('popularEmptySearchBtn')?.click();
  popularDestSearch.blur();
});
popularDestFilters.forEach(btn => btn.addEventListener('click', () => {
  popularDestFilters.forEach(b => b.classList.toggle('is-active', b === btn));
  _popularFilter = btn.dataset.popularFilter;
  if ((popularDestSearch?.value || '').trim()) applyPopularDestFilters();
  else renderRegionalPopularDestinations((document.getElementById('origin') || {}).value || '');
}));

let _originRegionalTimer = null;
const originInputForRegional = document.getElementById('origin');
if (originInputForRegional){
  originInputForRegional.addEventListener('input', (e) => {
    clearTimeout(_originRegionalTimer);
    const val = e.target.value;
    _originRegionalTimer = setTimeout(() => {
      renderRegionalPopularDestinations(val);
      renderOriginAirportWarning(val);
      updateCtaBanner();
    }, 400);
  });
  if (originInputForRegional.value){
    renderRegionalPopularDestinations(originInputForRegional.value);
    renderOriginAirportWarning(originInputForRegional.value);
    updateCtaBanner();
  } else {
    renderDefaultPopularDestinations();
  }
}
let _destAirportTimer = null;
let _spotTimer = null;
const destInputForAirport = document.getElementById('dest');
if (destInputForAirport){
  destInputForAirport.addEventListener('input', (e) => {
    // Reordering nekoliko DOM elemenata je jeftina operacija — radi se
    // odmah, na svaki taster, bez debounce-a. Debounce ostaje samo za
    // renderDestAirportWarning (teža provera protiv AIRPORT_DB), jer
    // deljenje istog tajmera za oba dovodi do toga da reorder radi
    // "na sreću" — samo kad pauza između tastera bude duža od 400ms.
    syncDestTypingWithPopular(e.target.value);
    if (window.SKLOPI_setSpotlight){
      // Urednički gradovi odmah; bilo koja druga poznata destinacija (lista) posle pauze u kucanju.
      window.SKLOPI_setSpotlight(e.target.value);
      clearTimeout(_spotTimer);
      const v = e.target.value;
      _spotTimer = setTimeout(() => window.SKLOPI_setSpotlight(v, {generic:true}), 600);
    }
    clearTimeout(_destAirportTimer);
    const val = e.target.value;
    _destAirportTimer = setTimeout(() => renderDestAirportWarning(val), 400);
  });
  if (destInputForAirport.value) renderDestAirportWarning(destInputForAirport.value);
  // Izbor iz predloga / Enter / napuštanje polja: bilo koji upisan grad dobija spotlight i 3 plana.
  destInputForAirport.addEventListener('change', e => {
    if (window.SKLOPI_setSpotlight) window.SKLOPI_setSpotlight(e.target.value, {generic:true, loose:true});
  });
}

/* ==========================================================
   Dok kucaš u "Destinacija", ako se poklopi sa jednom od kartica
   u "Gde bi sledeće?" gridu — ta kartica skoči na prvo mesto u
   tabeli. CTA baner ("X te čeka.") i stavka "poslednja destinacija"
   se ažuriraju preko updateCtaBanner()/updateStatLastPreview() ispod —
   ODAKLE (Polazak) ima prioritet nad Destinacijom: ako je Polazak
   popunjen, baner prati top preporuku iz regionalnog grida; tek kad
   je Polazak prazan, baner prati ono što je ukucano u Destinaciju.
   Stavka "poslednja destinacija" prati isključivo Destinaciju —
   dok se kuca prikazuje uneti tekst, a kad se polje isprazni vraća
   se na stvarnu (deljenu) poslednju pretragu.
========================================================== */
function syncDestTypingWithPopular(destRaw){
  const grid = document.getElementById('popularDestGrid');
  const val = normalizeSr((destRaw || '').trim());
  if (grid && val){
    const cards = Array.from(grid.querySelectorAll('.popular-dest-card'));
    const match = cards.find(card => normalizeSr(card.dataset.dest || '') === val)
      || cards.find(card => normalizeSr(card.dataset.dest || '').startsWith(val));
    if (match && grid.firstElementChild !== match) grid.insertBefore(match, grid.firstElementChild);
  }
  updateStatLastPreview(destRaw);
  updateCtaBanner();
}
function updateStatLastPreview(destRaw){
  const statLastEl = document.getElementById('statLast');
  if (!statLastEl) return;
  const typed = (destRaw || '').trim();
  const lastShown = typed || state.lastDest;
  statLastEl.textContent = lastShown ? cityLabelWithPrefix(lastShown) : '—';
}
function pickCtaDestFromTyping(){
  const originVal = (document.getElementById('origin') || {}).value || '';
  const destVal = (document.getElementById('dest') || {}).value || '';
  const grid = document.getElementById('popularDestGrid');
  if (originVal.trim()){
    if (grid && grid.firstElementChild && grid.firstElementChild.dataset.dest) return grid.firstElementChild.dataset.dest;
    return null;
  }
  if (destVal.trim()){
    const norm = normalizeSr(destVal.trim());
    if (grid){
      const cards = Array.from(grid.querySelectorAll('.popular-dest-card'));
      const named = cards.find(c => normalizeSr(c.dataset.dest || '') === norm)
        || cards.find(c => normalizeSr(c.dataset.dest || '').startsWith(norm));
      if (named) return named.dataset.dest;
    }
    return destVal.trim();
  }
  return null;
}
function updateCtaBanner(){
  const ctaTitleEl = document.getElementById('ctaTitle');
  const ctaDescEl = document.getElementById('ctaDesc');
  const ctaDest = pickCtaDestFromTyping() || state.lastDest || '';
  if (ctaTitleEl){
    ctaTitleEl.textContent = ctaDest
      ? tf('cta_title', {dest: cityLabel(ctaDest)})
      : t('cta_next_destination');
  }
  if (ctaDescEl) ctaDescEl.textContent = ctaCopy(ctaDest);
}

/* ==========================================================
   UPOZORENJE: grad bez aerodroma — predlaže najbliži pravi
   aerodrom umesto grada koji ga uopšte nema, direktno u samoj
   formi za pretragu (ne tek u rezultatima). Radi na OBA polja
   (Polazak i Destinacija), nad istom AIRPORT_DB bazom iznad u
   fajlu. Uredničko znanje o geografiji, ne uživo podatak.
   Prikazuje se ISKLJUČIVO kad je toggle "Letovi" uključen — u
   Smeštaj/R&C/Aktivnost pretragama nema leta, pa napomena o
   aerodromu nema smisla tu.
========================================================== */
function isFlightToggleOn(){
  const el = document.querySelector('.toggle[data-t="flight"]');
  return !!(el && el.classList.contains('on'));
}
function renderAirportWarning(cityRaw, boxId, inputId){
  const box = document.getElementById(boxId);
  if (!box) return;
  if (!isFlightToggleOn()){ box.innerHTML = ''; return; }
  const info = airportInfoFor(cityRaw);
  if (!info || info.hasAirport || !info.nearest){ box.innerHTML = ''; return; }
  const btnId = boxId + 'UseNearestBtn';
  box.innerHTML = '<div class="origin-airport-warning">✈️ ' + escapeHtml(airportNoteText(info))
    + '<br><button type="button" id="' + btnId + '">' + escapeHtml(tf('airport_use_instead', {near: cityLabel(info.nearest)})) + '</button></div>';
  const btn = document.getElementById(btnId);
  if (btn) btn.addEventListener('click', () => {
    const inputEl = document.getElementById(inputId);
    inputEl.value = info.nearest;
    inputEl.dispatchEvent(new Event('input', {bubbles:true}));
    box.innerHTML = '';
  });
}
function renderOriginAirportWarning(originRaw){
  renderAirportWarning(originRaw, 'originAirportWarning', 'origin');
}
function renderDestAirportWarning(destRaw){
  renderAirportWarning(destRaw, 'destAirportWarning', 'dest');
}
// Upozorenje se iscrtava jednom (kad korisnik kuca) — posle promene jezika
// ostalo bi na starom, pa ga osveži.
const _prevOnLangChangeAirport = window.onLangChange;
window.onLangChange = function(lang){
  if (typeof _prevOnLangChangeAirport === 'function') _prevOnLangChangeAirport(lang);
  const o = document.getElementById('origin'), d = document.getElementById('dest');
  if (o && o.value) renderOriginAirportWarning(o.value);
  if (d && d.value) renderDestAirportWarning(d.value);
};

/* ==========================================================
   "ISPLATI LI SE LET PREKO DRUGOG AERODROMA?" — savet u rezultatima
   pretrage za gradove gde je poznata, realna praksa da je jeftinije/
   češće leteti preko obližnjeg stranog aerodroma nego iz sopstvenog
   grada. Uredničko znanje (kao i regionalni signal iznad), ne uživo
   podaci o cenama — zato namerno bez konkretnih brojki koje bismo
   morali da dokazujemo.
========================================================== */
function matchOriginCityKey(originRaw, keysObject){
  const norm = normalizeSr((originRaw || '').trim());
  if (!norm) return null;
  for (const key in keysObject){
    if (norm === key || norm.startsWith(key + ' ') || norm.startsWith(key + ',') || norm.includes(' ' + key)){
      return key;
    }
  }
  return null;
}
const ALT_AIRPORT_NOTES = {
  'novi sad': 'Budimpešta i Beč su oko 2h vožnje od Novog Sada — low-cost aviokompanije tamo često lete češće i jeftinije nego iz Beograda, pa se isplati uporediti pre rezervacije.',
  'nis': 'Solun i Skoplje su 2-3h vožnje od Niša i imaju širu mrežu low-cost letova nego niški aerodrom — vredi uporediti tu cenu sa letom iz Beograda ili sezonskim čarterom direktno iz Niša.',
  'kragujevac': 'Beograd je najbliži veliki aerodrom (oko 1h vožnje) — za širi izbor i niže cene, isplati se poći odatle umesto tražiti direktan let iz manjeg grada.',
  'subotica': 'Subotica je blizu mađarske granice — Budimpešta (oko 2h30 vožnje) ima mnogo širu mrežu low-cost letova i često je isplativija polazna tačka nego Beograd.',
  'kraljevo': 'Kraljevo nema svoj aerodrom — Beograd (oko 2h) ili Niš (oko 1h) su najbliže polazne tačke, u zavisnosti od pravca leta. Vredi uporediti oba pre rezervacije.',
  'novi pazar': 'Novi Pazar nema svoj aerodrom — za neke pravce je Podgorica bliža i praktičnija polazna tačka nego Beograd. Vredi uporediti obe opcije pre rezervacije.',
  'banja luka': 'Banjalučki aerodrom ima ograničen broj linija — Zagreb (oko 2h vožnje) često nudi mnogo širi izbor letova i niže cene.'
};
function altAirportNoteFor(originRaw){
  const key = matchOriginCityKey(originRaw, ALT_AIRPORT_NOTES);
  return key ? ALT_AIRPORT_NOTES[key] : null;
}

/* ==========================================================
   "PAZI NA KOJI AERODROM SLEŽEŠ" — uredničke napomene za evropske
   gradove gde low-cost aviokompanije često slede na aerodrom daleko
   od centra grada (isti pod-brend imena grada, ali sat-dva vožnje
   dalje). Namerno SAMO Evropa — stabilna, opštepoznata geografska
   činjenica, ne uživo podatak, pa je bezbedno da bude urednička.
========================================================== */
const DEST_AIRPORT_NOTES = {
  'london': 'London ima više aerodroma — Hitrou je najbliži centru, ali low-cost kompanije često slede na Stansted ili Luton, 45-75 minuta dalje od grada. Proveri tačan aerodrom pre nego što planiraš prevoz do centra.',
  'pariz': 'Pariz ima tri aerodroma — Šarl de Gol i Orli su blizu grada, ali Ryanair i slične kompanije često koriste Bove (Beauvais), oko 85km severno, sa transferom od preko sat vremena do centra.',
  'brisel': 'Brisel ima glavni aerodrom blizu grada, ali low-cost letovi često slede u Šarlroa, oko 50km južnije — računaj dodatni sat vožnje i trošak prevoza do centra.',
  'frankfurt': 'Frankfurt ima dva aerodroma pod sličnim imenom — glavni je blizu grada, dok je Han (Hahn) oko 120km zapadno, bliže Luksemburgu nego Frankfurtu. Ryanair često leti baš tamo, sa transferom i do 2h.',
  'milano': 'Milano ima tri aerodroma — Malpensa i Linate su praktični, ali Ryanair često leti u Bergamo, oko 45km od centra, sa transferom od preko sat vremena.',
  'barselona': 'Barselona ima glavni aerodrom blizu grada (El Prat), ali neki low-cost letovi slede u Đironu ili Reus, stotinak kilometara dalje, sa transferom od preko sat vremena.',
  'rim': 'Rim ima dva aerodroma — Fjumičino (glavni, malo dalji od centra) i Čampino (bliži centru, manji, koriste ga neke low-cost kompanije).',
  'stokholm': 'Stokholm ima glavni aerodrom Arlanda, ali Ryanair često leti u Skavstu, oko 100km južnije — transfer do centra traje i do sat i po.',
  'geteborg': 'Geteborg ima aerodrom Landveter, oko 25 min od centra. Pazi: neki low-cost letovi ka "Geteborgu" slede u Savessen (City Airport), koji je bliži centru ali sa manjim brojem veza.',
  'oslo': 'Oslo ima glavni aerodrom Gardermoen, ali neki low-cost letovi ka "Oslu" slede u Torp kod Sandefjorda, oko 110km južnije — transfer je i do 2h.',
  'bergen': 'Bergen ima aerodrom Flesland, oko 20 min od centra. Direktnih letova iz Srbije nema — najčešće se putuje sa presedanjem u Oslu, Kopenhagenu ili nekom hub-u.',
  'tromse': 'Tromse ima sopstveni aerodrom sa redovnim unutrašnjim letovima, ali direktnih letova iz Srbije nema. Najčešći put je presedanje u Oslu — ukupno putovanje traje 4-6h.',
  'stavanger': 'Stavanger ima aerodrom Sola, oko 15 min od centra. Direktnih letova iz Srbije nema — najčešće se putuje sa presedanjem u Oslu ili Kopenhagenu.',
  'lofoti': 'Lofotska ostrva nemaju direktnih veza iz Srbije. Najbliži pristup je aerodrom Bodo (Bodø), odakle se nastavlja brodom ili unutrašnjim letom do Svolværa ili Leknesа. Ukupno putovanje iz Srbije traje 8-12h.',
  'kopenhagen': 'Neki letovi oglašeni ka "Kopenhagenu" zapravo slede u Malme, u Švedskoj, s druge strane mosta — računaj dodatno vreme za prelazak i eventualnu graničnu kontrolu.',
  'arhus': 'Arhus nema sopstveni aerodrom sa redovnim međunarodnim letovima — koristi se aerodrom Bilund (Billund), oko 1h vožnje. Kopenhagen je alternativa sa više veza.',
  'sognefjord': 'Sognefjord nema sopstveni aerodrom — najbliži su Bergen (oko 2-3h) i Flåm (polazna tačka brodskih tura). Kombinuje se sa posetom Bergenu.',
  'nærojfjord': 'Nærojfjord (UNESCO) je deo Sognefjorda — polazna tačka je Flåm ili Gudvangen, dostupni iz Bergena (oko 2-3h) ili Vosa.',
  'preikestolen': 'Preikestolen je dostupan iz Stavangera — oko 1h20min vožnje + 4-5h pešačenja povratno. Nema aerodroma u blizini, polazi se sa stavangerskog aerodroma Sola.',
  'trolltunga': 'Trolltunga je dostupna iz Bergena (oko 3h) ili aerodroma u Vosу. Aktivna planinska tura — preporučuje se samo u letnjim mesecima (jun–sep).',
  'nordkapp': 'Nordkapp nema sopstveni aerodrom — najbliži je Honningsvåg (manji lokalni aero) ili Alta, odakle se nastavlja autom (1-2h). Iz Srbije je najčešći put Tromse + rent-a-car ili organizovana tura.',
  'flom': 'Flåm je terminalna tačka čuvene Flåmsbane železnice i polazišta fjordskih tura — nema aerodroma, najčešće se dolazi iz Bergena (2-3h vozom/autobusom).',
  'geiranger': 'Geiranger nema aerodrom — najbliži je Ålesund (oko 1h30min). Brodovi idu iz Hellesylta i sa turističkih ruta iz Bergena. Sezona je maj–oktobar.',
  'jotunheimen': 'Jotunheimen nacionalni park nema aerodroma — ulazi se iz Ose, Loma ili Elvesatera, dostupnih iz Osla (3-4h vožnje). Baza za planinare.',
  'abisko': 'Abisko (Severno svetlo, polarne noći) nema aerodroma — najbliži je Kiruna u Švedskoj (oko 1h30min vozom ili autom). Iz Srbije: let do Kiruне ili Tromse + transfer.',
  'are': 'Åre ski centar — najbliži aerodrom je Östersund (Åre Östersund Airport), oko 1h vožnje. Direktnih letova iz Srbije nema; najčešće se preseda u Stokholmu.',
  'hemsedal': 'Hemsedal ski centar — oko 3h vožnje od Osla i aerodroma Gardermoen. Nema sopstvenog aerodroma; polazi se iz Osla.',
  'geilo': 'Geilo ski centar — oko 3h vožnje od Osla. Dostupan i vozom (direktna linija Bergen–Oslo prolazi kroz Geilo). Nema aerodroma u blizini.',
  'trysil': 'Trysil ski centar — oko 3h vožnje od Osla. Nema aerodroma; polazi se iz Osla (Gardermoen). Dostupan i iz Stockholma (oko 4h).',
  'salen': 'Sälen ski centri (Lindvallen, Tandådalen...) — oko 4h vožnje od Stokholma. Nema aerodroma u blizini; polazi se iz Stokholma ili Faluna.',
  'bornholm': 'Bornholm ima sopstveni aerodrom sa direktnim letovima iz Kopenhagena (oko 25 min). Nema direktnih letova iz Srbije — putuje se preko Kopenhagena, a može i trajektom iz Malmea.',
  'faroe ostrva': 'Farska ostrva imaju aerodrom Vágar — direktnih letova iz Srbije nema. Najčešće se preseda u Kopenhagenu ili Rejkjaviku. Preporučuje se leto (jun–avg) za dobre uslove.',
  'gotland': 'Gotland ima aerodrom Visby sa letovima iz Stokholma (45 min) i Geteborga. Nema direktnih letova iz Srbije — putuje se preko Stokholma, a može i trajektom iz Nynäshamna ili Oskarshamna.',
  'dalarna': 'Dalarna (jezero Siljan, Dalecarlia) nema aerodroma — najbliži je Dala Airport u Borlengu, ili dolazak vozom iz Stokholma (2-3h). Popularno u leto i oko Božića (julebuk tradicija).',
  'vänern': 'Jezero Vänern nema sopstveni aerodrom — najbliži su Göteborg (oko 1h30min) ili Karlstad Airport. Letovanje i kajak tura u leto.',
  'vättern': 'Jezero Vättern — polazne tačke su Jönköping (aerodrom tu) ili Örebro. Nema direktnih letova iz Srbije; presedanje u Stokholmu.',
  'siljan': 'Jezero Siljan (Dalarna) — dostupno vozom iz Stokholma (2-3h, stanica Mora ili Rättvik). Popularna destinacija u leto i zimi.',
  'mjøsa': 'Jezero Mjøsa — dostupno iz Osla (1-1h30min vozom ili autom; stanice Hamar, Gjøvik, Lillehammer). Nema aerodroma uz jezero.',
  // Turska — napomene o aerodromima
  'istanbul': 'Istanbul ima dva aerodroma — novi Istanbul Airport (IST) na evropskoj strani i Sabiha Gökçen (SAW) na azijskoj strani, oko 1h30min od centra. Proveri koji aerodrom koristi tvoj let — razlika u transferu može biti i sat vremena.',
  'ankara': 'Ankara ima aerodrom Esenboğa, oko 30 min od centra. Direktnih letova iz Srbije nema — najčešće se preseda u Istanbulu (1h let).',
  'izmir': 'Izmir ima aerodrom Adnan Menderes, oko 20 min od centra. Direktnih letova iz Srbije ima (Turkish Airlines, Air Serbia sezonski) ili se preseda u Istanbulu.',
  'bodrum': 'Bodrum ima aerodrom Milas-Bodrum, oko 35 min od centra. Sezonski direktni charter letovi iz Srbije; van sezone presedanje u Istanbulu.',
  'antalija': 'Antalija ima veliki aerodrom sa brojnim sezonskim direktnim letovima iz Srbije (charter i regularni). Van maja–oktobra saobraćaj je znatno manji.',
  'marmaris': 'Marmaris koristi aerodrom Dalaman (oko 1h vožnje). Sezonski direktni charter letovi iz Srbije ka Dalamanu, uglavnom maj–oktobar.',
  'fetije': 'Fetije koristi aerodrom Dalaman (oko 50 min). Sezonski charter letovi iz Srbije; Ölüdeniz i Butterfly Valley su u blizini.',
  'kapadokija': 'Kapadokija ima aerodrom Nevşehir (30 min) i Kayseri (1h30min). Direktnih letova iz Srbije nema — presedanje u Istanbulu; Nevşehir je obično bolji izbor za centralnu Kapadokiju.',
  'trabzon': 'Trabzon ima aerodrom direktno uz more, svega 5 km od centra. Direktnih letova iz Srbije nema — presedanje u Istanbulu (1h15min let).',
  'bursa': 'Bursa nema veliki međunarodni aerodrom — najčešće se dolazi iz Istanbula (1h30min trajektom + autobusом ili 3h autobusom). Alternativno: let do Istanbula pa transfer.',
  'uludag': 'Uludağ ski centar je dostupan iz Istanbula (oko 3h) ili Burse (žičara iz centra grada, 30 min). Iz Srbije: let do Istanbula + transfer.',
  'palandoken': 'Palandöken ski centar je neposredno uz Erzurum — aerodrom je 4 km dalje. Iz Srbije: presedanje u Istanbulu, ukupno 3-4h putovanja.',
  'ercijes': 'Erciyes ski centar (Kayseri) — aerodrom Kayseri je 25 km dalje. Iz Srbije: presedanje u Istanbulu, ukupno 2-3h.',
  'reka daljan': 'Dalyan (reka, kornjače, Kaunos) — 30 min od aerodroma Dalaman. Popularno uz Marmaris i Fethiye pakete.',
  'reka manavgat': 'Manavgat vodopad i reka — oko 1h od Antalije. Standardna izletnička tačka uz antalijske ljetne pakete.',
  'jezero van': 'Jezero Van — aerodrom Van je odmah uz obalu. Iz Srbije: presedanje u Istanbulu, ukupno 3-4h. Sezona maj–septembar.',
  'nemrut': 'Nemrut Dağı (ogromne kamene glave) — najbliži aerodrom Malatya (2h) ili Adıyaman (1h30min). Iz Srbije: presedanje u Istanbulu.',
  'gjobekli tepe': 'Göbekli Tepe (najstariji hram sveta) — 10 km od Şanlıurfe. Aerodrom Şanlıurfa je 45 km dalje; Gaziantep je alternativa (1h30min vožnje). Iz Srbije: presedanje u Istanbulu.',
  'safranbolu': 'Safranbolu (UNESCO osmanlijski grad) — oko 3h od Ankare autobusом. Nema aerodroma; iz Srbije: let do Istanbula ili Ankare + transfer.'
};
function destAirportNoteFor(destRaw){
  const norm = normalizeSr((destRaw || '').trim());
  if (!norm) return null;
  for (const key in DEST_AIRPORT_NOTES){
    if (norm === key || norm.startsWith(key)) return DEST_AIRPORT_NOTES[key];
  }
  return null;
}

/* ==========================================================
   "RAZMISLI I O AUTOBUSU" — alternativa prevoza za bliske regionalne
   destinacije koje veliki deo putnika iz Srbije uglavnom i onako radi
   autobusom (crnogorsko primorje, BiH, Severna Makedonija), a nijedan
   klasičan OTA/metasearch ovo ne poredi sa letom. Namerno samo
   destinacije do ~8h vožnje — dalje od toga autobus prestaje da bude
   realna alternativa letu. Cene/trajanje su ilustrativna procena (isti
   status kao i ostatak sajta u razvoju), ne uživo podatak prevoznika. */
const BUS_TRAIN_ROUTES = {
  'Budva':{hours:7, price:26}, 'Kotor':{hours:7, price:26}, 'Herceg Novi':{hours:8, price:28},
  'Igalo':{hours:8, price:28}, 'Bar':{hours:6.5, price:25}, 'Tivat':{hours:7, price:27},
  'Petrovac':{hours:7, price:26}, 'Sutomore':{hours:6.5, price:25}, 'Ulcinj':{hours:7.5, price:27},
  'Perast':{hours:7, price:26}, 'Risan':{hours:7, price:26}, 'Podgorica':{hours:5.5, price:22},
  'Sarajevo':{hours:6, price:24}, 'Mostar':{hours:7, price:26}, 'Banja Luka':{hours:4.5, price:20},
  'Skoplje':{hours:4, price:18}, 'Ohrid':{hours:6.5, price:24}
};
function busTrainNoteFor(destRaw, adults){
  const canonical = resolveCanonicalDestName(destRaw);
  const route = BUS_TRAIN_ROUTES[canonical];
  if (!route) return null;
  const n = Math.max(1, Number(adults) || 1);
  const oneWay = Math.round(route.price * n);
  const roundTrip = Math.round(route.price * n * 1.8);
  return 'Ovo je oko ' + route.hours + 'h vožnje autobusom iz Srbije (npr. Lasta, FlixBus, Ekol) — procena cene je oko '
    + fmtEUR(route.price) + ' po osobi u jednom pravcu. Za ' + n + ' ' + passengerLabel(n) + ' to je otprilike ' + fmtEUR(oneWay)
    + ' u jednom pravcu, odnosno grubo ' + fmtEUR(roundTrip) + ' povratno. Za kraće izlete i manje grupe ovo često izađe jeftinije od leta — vredi uporediti pre nego što rezervišeš.';
}

