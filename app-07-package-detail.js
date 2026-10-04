/* app-07-package-detail.js — deo nekadašnjeg app.js (deo 7/11): Spotlight, planer paketa, let/hotel/auto/aktivnosti/ukupno, moj put.
   Klasična skripta: deli globalni opseg sa ostalim app-*.js fajlovima; redosled učitavanja u index.html je bitan. */
/* ==========================================================
   DESTINATION SPOTLIGHT — referentni ekran za Atinu
========================================================== */
(function initDestinationSpotlight(){
  const planBtn = document.getElementById('destinationPlansBtn');
  const buildBtn = document.getElementById('destinationBuildBtn');
  const tabs = document.querySelectorAll('[data-destination-tab]');

  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.toggle('is-active', t === tab));
  }));

  // KORAK 1: klik na glavni CTA ("Sklopi moj put") otkriva SAMO spotlight
  // karticu (foto/"Zašto <grad>?"/dugmad) — ne i listu od 3 ponude. Forma
  // (destinacija, datumi, putnici) mora biti popunjena; bez toga bi kartica
  // mogla da se otvori (i "Atina" primer) a da ništa nije stvarno upisano.
  function revealSpotlight(){
    const check = validateSearchInputs();
    if (!check.ok){ showToast(check.msg); focusSearchField(check.focus); return false; }
    const spotlight = document.getElementById('destinationSpotlight');
    if (spotlight){ spotlight.hidden = false; spotlight.scrollIntoView({behavior:'smooth', block:'start'}); }
    return true;
  }
  window.SKLOPI_revealSpotlight = revealSpotlight;
  // KORAK 2: klik na dugme "3 plana — <grad>" (unutar spotlight kartice)
  // otvara stvarnu listu od 3 ponude ispod. Takođe se koristi kad se planovi
  // otvaraju direktno (npr. "Izaberi plan" u Moj put, ili povratak sa detalja
  // paketa) — u tom slučaju otkriva i spotlight, da kontekst ne nedostaje.
  function showDestPlans(){
    const check = validateSearchInputs();
    if (!check.ok){ showToast(check.msg); focusSearchField(check.focus); return; }
    const spotlight = document.getElementById('destinationSpotlight');
    if (spotlight) spotlight.hidden = false;
    const plans = document.getElementById('destinationPlans');
    if (!plans) return;
    plans.hidden = false;
    planBtn?.setAttribute('aria-expanded', 'true');
    plans.scrollIntoView({behavior:'smooth', block:'start'});
  }
  window.SKLOPI_showDestPlans = showDestPlans;
  planBtn?.addEventListener('click', showDestPlans);

  /* ---- Fiksni planovi po gradu (podaci: dest-plans.js) ----
     Spotlight prati izabranu destinaciju: klik na karticu u "Popularne destinacije"
     ili tačan naziv grada u polju Destinacija. Grad koji nije u dest-plans.js ne menja
     spotlight. Tri plana dolaze iz šablona ("city"/"sea"); cena je fiksna (c.fixed) ili
     se računa iz builder-a za trenutni polazak/datume/putnike. */
  const CFG = window.SKLOPI_DEST_PLANS || {def:'Atina', arch:{}, cities:{}};
  const $ = id => document.getElementById(id);
  const qs = s => document.querySelector(s);
  const ph = (id, w) => id.indexOf('img/') === 0 ? id : 'https://images.unsplash.com/photo-' + id + '?auto=format&fit=crop&w=' + w + '&q=82';
  // Neutralna pozadina (ne fotografija konkretnog mesta) za gradove bez slike — da nepoznat ili
  // izmišljen unos ne dobije tuđe, prepoznatljivo mesto.
  const GENERIC_PHOTO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
    + '<stop offset="0" stop-color="#14707f"/><stop offset="1" stop-color="#123A44"/></linearGradient></defs>'
    + '<rect width="1200" height="800" fill="url(#g)"/><g fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="14" stroke-linecap="round">'
    + '<path d="M600 520c-70-90-110-150-110-205a110 110 0 0 1 220 0c0 55-40 115-110 205z"/><circle cx="600" cy="315" r="38"/></g></svg>');
  let curCity = CFG.def, curEntry = CFG.cities[CFG.def], curPlans = [], shownCity = null;

  // Skida navodnike/zagrade/tačke sa krajeva ("Dubrovnik" -> Dubrovnik) i duple razmake.
  function cleanName(name){
    // navodnici/apostrofi i interpunkcija se skidaju samo sa krajeva (Val d'Isère ostaje netaknut)
    return String(name || '')
      .replace(/^[\s.,;:!?()\[\]{}\-\u201C\u201D\u201E\u201F\u2018\u2019\u00AB\u00BB"'`]+/, '')
      .replace(/[\s.,;:!?()\[\]{}\-\u201C\u201D\u201E\u201F\u2018\u2019\u00AB\u00BB"'`]+$/, '')
      .replace(/\s+/g, ' ').trim();
  }
  function cityKey(name){
    const n = normalizeSr(String(name || '').trim());
    return n ? (Object.keys(CFG.cities).find(k => normalizeSr(k) === n) || null) : null;
  }
  // Grad iz dest-plans.js -> uredničke stavke; bilo koji drugi grad (iz liste POPULAR_DESTINATIONS
  // ili slobodan unos, o.loose) -> opšta stavka: isti šablon plana, cena iz builder-a, bez izmišljenih detalja.
  function resolveDest(name, o){
    o = o || {};
    const raw = cleanName(name), k = cityKey(raw);
    if (k) return {k, c:CFG.cities[k]};
    if (!o.generic || raw.length < 2) return null;
    const n = normalizeSr(raw);
    const md = MATCH_DESTINATIONS.find(d => normalizeSr(d.name) === n);
    const hit = md || POPULAR_DESTINATIONS.find(d => normalizeSr(d.name) === n);
    if (!hit && !o.loose) return null;
    const known = !!hit || !!(typeof airportInfoFor === 'function' && airportInfoFor(raw));
    return {k: hit ? hit.name : raw.charAt(0).toUpperCase() + raw.slice(1),
            c:{arch: archFor(md), country: hit ? (hit.extra || '') : '', reasons: reasonsFor(md), generic:true, known}};
  }
  // Šablon plana i "Zašto <grad>?" iz podataka koje sajt već ima (MATCH_DESTINATIONS: vibes, distance, family,
  // nightlife) — samo ono što tamo piše, bez izmišljanja; gradovi bez tih podataka nemaju blok "Zašto".
  function archFor(md){
    const v = md ? md.vibes : [];
    if (v.includes('sea') && !v.includes('city')) return 'sea';
    if (v.includes('city') && !v.includes('ski')) return 'city';
    return 'trip';
  }
  function reasonsFor(md){
    if (!md) return [];
    const v = md.vibes, out = [];
    if (v.includes('sea')) out.push('More i plaže');
    if (v.includes('city')) out.push('Kultura, muzeji i gradske šetnje');
    if (v.includes('nature')) out.push('Priroda i izleti');
    if (v.includes('ski')) out.push('Skijanje i zimski sportovi');
    if (md.nightlife) out.push('Živ noćni život');
    if (md.distance === 'near') out.push('Blizu — kratak let ili vožnja');
    if (md.distance === 'far') out.push('Dalje putovanje — isplati se duži boravak');
    if (md.family) out.push('Dobro za porodice');
    return out.slice(0, 4);
  }
  // Slika grada za koji nemamo urednički Unsplash ID: Wikipedia (en, pa sh za srpska imena), keš 7 dana;
  // dok ne stigne, koristi se slika sa kartice ili opšta slika.
  const IMG_KEY = 'sklopi_spot_img_v1', IMG_TTL = 7 * 24 * 3600 * 1000;
  const cityImg = {};
  function readImgCache(){
    try { const c = JSON.parse(localStorage.getItem(IMG_KEY) || 'null'); if (c && c.m && Date.now() - c.ts < IMG_TTL) return c; } catch(e){}
    return {ts:Date.now(), m:{}};
  }
  async function wikiImg(host, title){
    try {
      const r = await fetch('https://' + host + '/api/rest_v1/page/summary/' + encodeURIComponent(title));
      if (!r.ok) return '';
      const d = await r.json();
      if (d.type !== 'standard') return '';          // preskoči stranice za razdvajanje značenja
      const th = d.thumbnail && d.thumbnail.source, o = d.originalimage;
      if (th && o && o.width >= 960) return th.replace(/\/\d+px-/, '/960px-');
      return (o && o.width && o.width <= 1400 && o.source) || th || '';
    } catch(e){ return ''; }
  }
  async function loadCityPhoto(k){
    if (cityImg[k] !== undefined) return;
    cityImg[k] = '';
    const cache = readImgCache();
    let url = cache.m[k] || '';
    if (!url){
      let names = {}; try { names = DEST_EN_NAMES; } catch(e){}
      url = await wikiImg('en.wikipedia.org', (names[k] || k).split(',')[0].trim()) || await wikiImg('sh.wikipedia.org', k);
      if (url){ cache.m[k] = url; try { localStorage.setItem(IMG_KEY, JSON.stringify(cache)); } catch(e){} }
    }
    if (!url) return;
    cityImg[k] = url;
    if (curCity === k) render();
    document.dispatchEvent(new Event('sklopi:city-photo'));
  }
  /* ---- Više različitih slika za BILO KOJU destinaciju (kartice Budžet / Balans / Komfor) ----
     Urednički gradovi imaju c.photos. Ostali: glavna slika (cityImg) + do 2 dodatne iz Wikipedia
     media-list (samo .jpg fotografije; zastave, mape, grbovi, logotipi i dijagrami se preskaču).
     Ako ništa ne stigne, kartice koriste glavnu sliku kao i do sada. Keš 7 dana. */
  const IMGS_KEY = 'sklopi_spot_imgs_v1';
  const cityImgs = {};
  const BAD_IMG = /flag|map|locator|location|coat[_ ]of|arms|logo|seal|icon|symbol|blank|pictogram|signature|diagram|chart|graph|portrait|bust|poster|stamp|banner|\bsvg\b/i;
  function imgFileName(url){
    const m = /\/([^\/]+)\/\d+px-[^\/]+$/.exec(String(url || ''));
    const f = m ? m[1] : String(url || '').split('?')[0].split('/').pop();
    try { return decodeURIComponent(f).toLowerCase(); } catch(e){ return f.toLowerCase(); }
  }
  // items = media-list "items"; heroUrl = glavna slika grada; vraća do `max` dodatnih URL-ova
  function pickWikiPhotos(items, heroUrl, max){
    const seen = {}, out = [];
    seen[imgFileName(heroUrl)] = 1;
    (items || []).forEach(it => {
      if (out.length >= max || !it || it.type !== 'image' || it.showInGallery === false) return;
      const title = String(it.title || '').replace(/^File:/i, '');
      if (!/\.jpe?g$/i.test(title) || BAD_IMG.test(title)) return;
      const set = Array.isArray(it.srcset) ? it.srcset.filter(x => x && x.src) : [];
      if (!set.length) return;
      let src = set[set.length - 1].src;                 // najveća dostupna (obično 2x)
      src = src.indexOf('//') === 0 ? 'https:' + src : src;
      if (!/^https:\/\/upload\.wikimedia\.org\//.test(src)) return;
      const key = imgFileName(src);
      if (seen[key]) return;
      seen[key] = 1; out.push(src);
    });
    return out;
  }
  async function wikiMedia(host, title){
    try {
      const r = await fetch('https://' + host + '/api/rest_v1/page/media-list/' + encodeURIComponent(title));
      if (!r.ok) return [];
      const d = await r.json();
      return (d && d.items) || [];
    } catch(e){ return []; }
  }
  async function loadCityPhotos(k){
    if (cityImgs[k] !== undefined) return;
    cityImgs[k] = [];
    let cache = null; try { cache = JSON.parse(localStorage.getItem(IMGS_KEY) || 'null'); } catch(e){}
    if (!cache || !cache.m || Date.now() - cache.ts > IMG_TTL) cache = {ts:Date.now(), m:{}};
    let extra = cache.m[k];
    if (!extra){
      // sačekaj glavnu sliku (loadCityPhoto je već pokrenut iz heroFor) da bismo je ne ponovili
      for (let i = 0; i < 20 && !cityImg[k]; i++) await new Promise(r => setTimeout(r, 250));
      let names = {}; try { names = DEST_EN_NAMES; } catch(e){}
      const title = (names[k] || k).split(',')[0].trim();
      extra = pickWikiPhotos(await wikiMedia('en.wikipedia.org', title), cityImg[k], 2);
      if (extra.length < 2) extra = extra.concat(pickWikiPhotos(await wikiMedia('sh.wikipedia.org', k), cityImg[k], 2 - extra.length));
      if (extra.length){ cache.m[k] = extra; try { localStorage.setItem(IMGS_KEY, JSON.stringify(cache)); } catch(e){} }
    }
    if (!extra || !extra.length) return;
    cityImgs[k] = extra;
    if (curCity === k) render();
    document.dispatchEvent(new Event('sklopi:city-photo'));
  }
  // [glavna, dodatna1, dodatna2] za plan-indekse 0 (Balans), 1 (Komfor), 2 (Budžet); prazno dok slike ne stignu
  function wikiPhotosFor(k){
    if (cityImgs[k] === undefined) loadCityPhotos(k);
    const main = cityImg[k];
    const ex = cityImgs[k] || [];
    return main && ex.length ? [main].concat(ex) : [];
  }
  function heroFor(k, c){
    if (c.photo) return ph(c.photo, 1200);
    if (!cityImg[k]) loadCityPhoto(k);
    return cityImg[k] || fallbackPhoto(k);
  }
  function fallbackPhoto(city){
    const card = Array.from(document.querySelectorAll('.popular-dest-card'))
      .find(c => normalizeSr(c.dataset.dest || '') === normalizeSr(city));
    const im = card && card.querySelector('img');
    return im && im.src ? im.src.replace(/w=\d+/, 'w=1200') : GENERIC_PHOTO;
  }
  function plansTitle(k){
    const c = curEntry, l = getLang(), n = cityLabel(k);
    if (c.generic) return (l === 'sr' ? '3 plana' : l === 'ru' ? '3 плана' : l === 'de' ? '3 Pläne' : '3 plans') + ' \u2014 ' + n;
    if (l === 'sr') return '3 plana za ' + c.acc;
    if (l === 'ru') return '3 плана для вашей поездки ' + c.ru;
    if (l === 'de') return '3 Pläne für dein ' + n;
    return '3 plans for your ' + n;
  }
  function whyTitle(k){
    const l = getLang(), n = cityLabel(k);
    return l === 'sr' ? 'Zašto ' + k + '?' : l === 'ru' ? 'Почему ' + n + '?' : l === 'de' ? 'Warum ' + n + '?' : 'Why ' + n + '?';
  }
  const pickSel = p => ({flightPref:p.flightPref, hotelStars:p.hotelStars, prioritizeLocation:p.prioritizeLocation,
    carPref:p.carPref, activityCount:p.activityCount});
  // Servisi koje je korisnik STVARNO markirao (Letovi/Smeštaj/R a C/Aktivnost
  // ispod forme) — bez ovoga su kartice "3 plana" uvek prikazivale ceo
  // paket (let + hotel + auto + aktivnosti) iz fiksnog šablona, čak i kad je
  // korisnik obeležio samo "Smeštaj" (pravi bag).
  function activeServiceFlags(){
    const on = key => { const el = document.querySelector('.toggle[data-t="' + key + '"]'); return !!(el && el.classList.contains('on')); };
    return {flight:on('flight'), hotel:on('hotel'), car:on('car'), activity:on('activity')};
  }
  window.SKLOPI_activeServiceFlags = activeServiceFlags; // koriste ga i "Sastavi svoj paket"/"Tvoj personalizovani plan"

  // Redosled prikaza (kao na dizajnu): Budžet → Balans → Komfor, cene rastu sleva nadesno.
  // Računanje u buildPlansRaw ostaje po originalnom redosledu šablona (plans[0] = osnova za cenu).
  function buildPlans(k){
    const rank = p => p.key === 'best-value' ? 0 : p.key === 'comfort' ? 2 : 1;
    return buildPlansRaw(k).slice().sort((x, y) => rank(x) - rank(y));
  }
  function buildPlansRaw(k){
    const c = curEntry, tpl = CFG.arch[c.arch] || CFG.arch.city || [];
    const hero = heroFor(k, c);
    const n = cityLabel(k);
    const wp = c.photos ? [] : wikiPhotosFor(k);
    const plans = tpl.map((t, i) => Object.assign({}, t, {
      dest:k, alt:n + ' \u2014 ' + tx(t.title),
      photo: c.photos ? ph(c.photos[i], 1200) : (wp[i] || hero),
      thumb: c.photos ? ph(c.photos[i], 500) : (wp[i] || hero).replace(/w=1200/, 'w=500'),
      forWho: (i === 0 && c.forWho1) || t.forWho
    }));
    // Grad BEZ sopstvenog aerodroma (Bled, Rogaška Slatina...): urednički
    // feats iznad uvek pišu "Direktan let" / "Fleksibilan let" i sl. jer su
    // to fiksni šabloni po arhetipu (city/sea), isti za sve destinacije —
    // ne znaju ništa o AIRPORT_DB. Bez ovoga kartica ovde ćuti o tome da let
    // stvarno sleće u drugi grad, iako se ISTA napomena već ispisuje kad
    // korisnik kuca tu destinaciju u polju pretrage (airportInfoFor +
    // airportNoteText, vidi renderDestAirportWarning). Dodajemo je i ovde,
    // istim tekstom, da poruka bude dosledna kroz ceo sajt.
    const apInfo = airportInfoFor(k);
    const noOwnAirport = apInfo && !apInfo.hasAirport && apInfo.nearest;
    const airportNote = noOwnAirport ? airportNoteText(apInfo) : '';
    const svc = activeServiceFlags();
    plans.forEach(p => {
      p.airportNote = airportNote;
      // "Direktan let"/"Fleksibilan let" i sl. opisuju TIP karte (bez
      // presedanja), ne kuda sleće — samo po sebi to zvuči kao direktan let
      // baš u k, što zbunjuje kad grad nema aerodrom. flightArrival se
      // dodaje u cardHtml() uz taj tekst ("... do Tivata"), da kartica ne
      // zvuči kao da protivreči napomeni ispod nje.
      p.flightArrival = noOwnAirport ? apInfo.nearest : null;
      // Šabloni (dest-plans.js) uvek nabrajaju sve 4 stavke (let/hotel/
      // aktivnosti/auto) bez obzira šta je korisnik markirao ispod forme —
      // zato je kartica za "samo Smeštaj" ipak pisala "Direktan let". Ovde
      // sklanjamo stavke za servise koje korisnik NIJE tražio; auto-red je
      // ponekad kombinovan sa brojem aktivnosti ("Auto + 3 aktivnosti"), pa
      // se prikazuje samo ako je auto zaista uključen.
      p.feats = p.feats.filter(f => {
        if (f[0] === '\u2708') return svc.flight;
        if (f[0] === '\u25a3') return svc.hotel;
        if (f[0] === '\u25c7') return svc.activity;
        if (f[0] === '\u25b1') return svc.car;
        return true;
      });
      if (!svc.flight){ p.airportNote = ''; p.flightArrival = null; }
      // Detalj paketa (#planDetail, "Pogledaj detalje") NIJE čitao feats —
      // gradio je red-po-red direktno iz šablona (p.flightT/hotelS/actS/
      // carS), pa je i posle filtriranja feats-a za listu kartica detalj i
      // dalje uvek pisao "Direktan let" i ćutao o aerodromu. Čuvamo svc
      // ovde da renderPlanDetail() zna šta stvarno da prikaže.
      p.svc = svc;
    });
    // Uredničke fiksne cene (c.fixed, npr. Atina) pretpostavljaju PUN paket
    // (let + hotel); ako korisnik nije tražio let i/ili hotel, te cene više
    // ne važe i računamo iz builder-a (ispod), isto kao za sve ostale gradove.
    if (c.fixed && svc.flight && svc.hotel){ plans.forEach((p, i) => { p.price = c.fixed[i]; }); return plans; }
    const ctx = Object.assign({}, builderCtx(), {dest:k});
    const sel = p => {
      const s = Object.assign({}, BUILDER_DEFAULTS, {includeFlight:svc.flight, includeHotel:svc.hotel}, pickSel(p));
      if (!svc.car) s.carPref = 'none';
      if (!svc.activity) s.activityCount = 0;
      return s;
    };
    const a = sel(plans[0]), pkg = computeCustomPackage(a, ctx);
    const derive = window.SKLOPI_derivePerPerson;
    plans.forEach((p, i) => {
      p.price = i === 0 ? Math.round(pkg.total / ctx.adults)
        : (derive ? derive(pkg, a, sel(p), ctx) : Math.round(computeCustomPackage(sel(p), ctx).total / ctx.adults));
    });
    return plans;
  }
  // Kratak opis plana (ekran 4 sa slike): Budžet / Balans / Komfor
  const PLAN_TAGS = {'best-value':'Pametno putovanje, velika iskustva.', 'comfort':'Više uživanja, manje briga.'};
  const PLAN_TAG_BALANCE = 'Idealna kombinacija cene i komfora.';
  function cardHtml(p, i){
    const ft = p.feats.map(f => {
      // f[0] je '\u2708' (✈) samo za red o letu (uvek prvi u feats, videti
      // dest-plans.js) — tu, i samo tu, dodajemo "do {aerodrom}" kad grad
      // nema sopstveni aerodrom, da red o letu ne izgleda kao da je u
      // suprotnosti sa napomenom ispod (apNote) koja kaže da leti do
      // drugog grada.
      const label = (f[0] === '\u2708' && p.flightArrival)
        ? tx(f[1]) + ' \u2192 ' + cityLabel(p.flightArrival)
        : tx(f[1]);
      return '<li><span class="dpf-ic" aria-hidden="true">' + f[0] + '</span><span>' + escapeHtml(label) + '</span></li>';
    }).join('');
    const apNote = p.airportNote ? '<p class="dest-plan-airport-note">\u2708\ufe0f ' + escapeHtml(p.airportNote) + '</p>' : '';
    return '<article class="dest-plan-card" data-plan="' + i + '"><div class="dest-plan-photo"><img src="' + escapeHtml(p.thumb)
      + '" alt="' + escapeHtml(cityLabel(p.dest)) + '" loading="lazy">'
      + (i === 0 ? '<span class="dest-plan-badge dest-plan-badge--popular">' + escapeHtml(tx(p.badge)) + '</span>' : '')
      + '</div><div class="dest-plan-body"><h3>' + escapeHtml(tx(p.title)) + '</h3>'
      + '<p class="dest-plan-tag">' + escapeHtml(tx(PLAN_TAGS[p.key] || PLAN_TAG_BALANCE)) + '</p>'
      + '<p class="dest-plan-price">' + escapeHtml(tx('od ') + priceText(p.price)) + ' <span>' + tx('/ osoba') + '</span></p><ul class="dest-plan-features">' + ft
      + '</ul>' + apNote + '<p class="dest-plan-for">' + escapeHtml(tx(p.forWho)) + '</p></div>'
      + '<span class="dest-plan-arrow" aria-hidden="true">\u203a</span></article>';
  }
  // Tekstovi koje JS preuzima od statičkog (SEO) HTML-a za Atinu: skidamo data-i18n da ih
  // applyStaticI18n() ne vrati na Atinu; osvežavaju se u render() pri promeni grada/jezika.
  const managed = ['.destination-reference-photo img', '.destination-reference-location', '#destinationSpotlightTitle',
    '.destination-reference-title-row p', '.destination-reference-reason .eyebrow', '#destinationPlansBtn span', '#destinationPlansTitle']
    .map(qs).filter(Boolean);
  managed.forEach(el => { el.removeAttribute('data-i18n'); el.removeAttribute('data-i18n-alt'); });

  /* ---- Bilo koja destinacija = prave informacije ----
     Grad koji nije u dest-plans.js dobija "Zašto <grad>?" iz AI info (/api/dest-info, isti keš kao panel
     "O destinaciji"): znamenitosti i kuhinja. Ako AI kaže da mesto ne postoji (ili je greška u kucanju),
     prikazujemo upozorenje i predlog ("Misliš li na ...?") umesto izmišljenog sadržaja.
     Gradovi iz AIRPORT_DB / popularnih / urednički (c.known) se uvek smatraju stvarnim. */
  const aiInfo = {}, aiTried = {};
  const LBL = {
    sr:{unk:'Ne možemo da proverimo ovo mesto.', retry:'Pokušaj ponovo', sights:'Znamenitosti: ', food:'Lokalna kuhinja: ', nf:q => 'Ne prepoznajemo „' + q + '". Proveri naziv.', dym:'Misliš li na'},
    en:{unk:'We couldn\u2019t verify this place.', retry:'Try again', sights:'Sights: ', food:'Local food: ', nf:q => 'We don\u2019t recognise \u201c' + q + '\u201d. Please check the name.', dym:'Did you mean'},
    de:{unk:'Wir konnten diesen Ort nicht prüfen.', retry:'Erneut versuchen', sights:'Sehenswürdigkeiten: ', food:'Küche: ', nf:q => '\u201e' + q + '\u201c kennen wir nicht. Bitte Namen prüfen.', dym:'Meintest du'},
    ru:{unk:'Не удалось проверить это место.', retry:'Повторить', sights:'Достопримечательности: ', food:'Кухня: ', nf:q => 'Мы не нашли «' + q + '». Проверьте название.', dym:'Вы имели в виду'}
  };
  const lbl = () => LBL[getLang()] || LBL.en;
  const aiKey = k => k + '|' + getLang();
  function aiReasons(ai){
    if (!ai || !ai.real) return [];
    const L = lbl(), out = [];
    if (ai.sights && ai.sights.length) out.push(L.sights + ai.sights.slice(0, 2).join(', '));
    if (ai.food && ai.food.length) out.push(L.food + ai.food.slice(0, 2).join(', '));
    return out;
  }
  // Najbliži poznat naziv (Levenshtein) — radi i kad AI nije dostupan.
  function lev(a, b){
    const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9;
    let prev = Array.from({length:n + 1}, (_, j) => j);
    for (let i = 1; i <= m; i++){
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function localSuggest(raw){
    const q = normalizeSr(String(raw || '').trim());
    if (q.length < 4) return '';
    const names = new Set(Object.keys(CFG.cities));
    try { POPULAR_DESTINATIONS.forEach(d => names.add(d.name)); } catch(e){}
    let best = '', bd = 9;
    names.forEach(nm => { const d = lev(q, normalizeSr(nm)); if (d < bd){ bd = d; best = nm; } });
    return bd >= 1 && bd <= (q.length <= 5 ? 1 : 2) ? best : '';
  }
  const sugOk = (k, sug) => !!sug && normalizeSr(sug) !== normalizeSr(k);
  function noticeEl(){
    let el = $('destinationNotFound');
    if (!el){
      const host = qs('.destination-reference-body'), act = qs('.destination-reference-actions');
      if (!host) return null;
      el = document.createElement('p');
      el.id = 'destinationNotFound'; el.className = 'destination-notfound'; el.hidden = true;
      el.setAttribute('role', 'status');
      host.insertBefore(el, act || null);
    }
    return el;
  }
  function applySuggestion(name){
    const dest = $('dest');
    if (!dest) return;
    dest.value = name;
    dest.dispatchEvent(new Event('input', {bubbles:true}));
    dest.dispatchEvent(new Event('change', {bubbles:true}));
  }
  function updateNotice(k, c, ai){
    const el = noticeEl();
    if (!el) return;
    const tried = aiTried[aiKey(k)];
    // upozorenje samo kad AI kaže "ne postoji", ili AI nije odgovorio a imamo lokalni predlog
    const ps = window.SKLOPI_placeStatus ? window.SKLOPI_placeStatus(k) : undefined;
    const aiSaysFake = !!(ai && !ai.real) || ps === false;
    const fake = !!(c.generic && !c.known && ps !== true && (aiSaysFake || tried === 'fail'));
    if (!fake){ el.hidden = true; el.textContent = ''; return; }
    const sug = (window.SKLOPI_placeSuggestion && window.SKLOPI_placeSuggestion(k)) || (ai && ai.suggestion) || localSuggest(k);
    el.textContent = '';
    const L = lbl();
    if (aiSaysFake) el.appendChild(document.createTextNode(L.nf(k)));
    else if (tried === 'fail'){
      el.appendChild(document.createTextNode(L.unk + ' '));
      const rb = document.createElement('button');
      rb.type = 'button'; rb.textContent = L.retry;
      rb.addEventListener('click', () => { delete aiTried[aiKey(k)]; render(); });
      el.appendChild(rb);
      if (sugOk(k, (ai && ai.suggestion) || localSuggest(k))) el.appendChild(document.createTextNode(' \u00B7 '));
    }
    if (sugOk(k, sug)){
      if (el.textContent && tried !== 'fail') el.appendChild(document.createTextNode(' '));
      el.appendChild(document.createTextNode(L.dym + ' '));
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = sug + '?';
      b.addEventListener('click', () => applySuggestion(sug));
      el.appendChild(b);
    }
    el.hidden = !el.childNodes.length;
  }
  function enrichGeneric(k){
    const key = aiKey(k);
    if (aiTried[key] || typeof window.SKLOPI_destInfoPeek !== 'function') return;
    aiTried[key] = 'pending';
    // 1) geokoder potvrđuje da mesto postoji (jeftino, bez AI); 2) tek onda AI informacije
    const verify = window.SKLOPI_verifyPlace ? window.SKLOPI_verifyPlace(k) : Promise.resolve(null);
    verify.then(v => {
      if (v === false){ aiTried[key] = 'ok'; if (curCity === k) render(); return null; }
      return window.SKLOPI_destInfoPeek(k).then(res => ({res}));
    }).then(box => {
      if (!box) return;
      const res = box.res;
      if (res){ aiInfo[key] = res; aiTried[key] = 'ok'; }
      else { aiTried[key] = 'fail'; setTimeout(() => { if (aiTried[key] === 'fail') delete aiTried[key]; }, 30000); }
      if (curCity === k) render();
    });
  }

  function render(){
    const k = curCity, c = curEntry;
    if (!c || !$('destPlansList')) return;
    const n = cityLabel(k), img = qs('.destination-reference-photo img');
    if (img){
      const want = heroFor(k, c);
      if (img.dataset.src !== want){ img.dataset.src = want; img.src = want; }
      img.alt = n;
    }
    const set = (sel, txt) => { const el = qs(sel); if (el) el.textContent = txt; };
    const ai = c.generic ? aiInfo[aiKey(k)] : null;
    const ps = c.generic && !c.known && window.SKLOPI_placeStatus ? window.SKLOPI_placeStatus(k) : undefined;   // geokoder: true/false/undefined
    const reasons = ((ai && !ai.real) || ps === false) ? [] : aiReasons(ai).concat(c.reasons || []).slice(0, 4);
    const cn = c.country ? countryLabel(c.country) : ((ai && ai.real && ai.country) || '');
    set('.destination-reference-location', cn);
    set('.destination-reference-title-row p', cn);
    [qs('.destination-reference-location'), qs('.destination-reference-title-row p')].forEach(el => { if (el) el.hidden = !cn; });
    const rb = qs('.destination-reference-reason');
    if (rb) rb.hidden = !reasons.length;     // "Zašto <grad>?": urednički tekst, ili AI info za ostale gradove
    set('#destinationSpotlightTitle', n);
    if (reasons.length) set('.destination-reference-reason .eyebrow', whyTitle(k));
    set('#destinationPlansBtn span', plansTitle(k));
    set('#destinationPlansTitle', tx('Izaberi svoj plan'));   // opšti naslov; grad je već u kartici iznad
    const ul = qs('.destination-reference-reason ul');
    if (ul) ul.innerHTML = reasons.map(r => '<li>' + escapeHtml(tx(r)) + '</li>').join('');
    curPlans = buildPlans(k);
    $('destPlansList').innerHTML = curPlans.map(cardHtml).join('');
    // Ove kartice se računaju i prikazuju ČIM se otvori destinacija, pre
    // nego što korisnik uopšte dirne "Sastavi svoj put" formu ispod — cena
    // je zato uvek zasnovana na podrazumevanim vrednostima (2 putnika,
    // orijentacioni datumi), ne na nečemu što je korisnik stvarno izabrao.
    // Napomena ispod naslova to jasno kaže dok god forma nije popunjena;
    // čim JESTE (isti "is-empty" signal kao u validateSearchInputs), kartice
    // već odražavaju stvarne podatke pa napomena više nije potrebna.
    const estNote = $('destPlansEstNote');
    if (estNote){
      const datesConfirmed = !document.getElementById('dateDisplayBtn')?.classList.contains('is-empty');
      const paxConfirmed = !document.getElementById('paxDisplayBtn')?.classList.contains('is-empty');
      estNote.hidden = datesConfirmed && paxConfirmed;
    }
    shownCity = k;
    updateNotice(k, c, ai);
    if (c.generic) enrichGeneric(k);
  }
  function setCity(name, o){
    const r = resolveDest(name, o);
    if (!r) return false;
    if (r.k === curCity) return true;
    curCity = r.k; curEntry = r.c;
    const plans = $('destinationPlans');
    if (plans) plans.hidden = true;          // stari planovi/detalji više ne važe za novi grad
    planBtn?.setAttribute('aria-expanded', 'false');
    if (detail) detail.hidden = true;
    if (breakdown) breakdown.hidden = true;
    // Grad se promenio mimo "Nazad" toka (npr. nova pretraga) — overlay
    // se gasi "sam od sebe", pa ga samo skidamo sa guard steka (bez
    // history.back()), isti princip kao guardOverlayDrop svuda drugde.
    guardOverlayDrop('planBreakdown');
    guardOverlayDrop('planDetail');
    render();
    return true;
  }
  window.SKLOPI_setSpotlight = setCity;
  // Za "Tvoj personalizovani plan" (konfigurator): da li je unos poznata destinacija i urednička slika grada.
  window.SKLOPI_knownDest = name => !!resolveDest(name, {generic:true});
  // Niz [glavna, dodatna, dodatna] za bilo koju destinaciju (prazno ako nema); koristi ga "Tvoj personalizovani plan".
  window.SKLOPI_destPhotos = name => {
    const r = resolveDest(name, {generic:true, loose:true});
    return !r || r.c.photos || r.c.photo ? [] : wikiPhotosFor(r.k);
  };
  window.SKLOPI_destPhoto = (name, w) => {
    const r = resolveDest(name, {generic:true, loose:true});
    if (!r) return null;
    if (r.c.photo) return ph(r.c.photo, w || 400);
    if (!cityImg[r.k]) loadCityPhoto(r.k);
    return cityImg[r.k] || null;
  };

  buildBtn?.addEventListener('click', () => {
    const check = validateSearchInputs();
    if (!check.ok){ showToast(check.msg); focusSearchField(check.focus); return; }
    const cp = document.getElementById('customPlanner');
    if (cp){ cp.hidden = false; cp.scrollIntoView({behavior:'smooth', block:'start'}); }
  });

  // Popuni destinaciju plana u pretragu i skroluj na formu (koristi se za "Rezerviši paket").
  function goToSearchForCity(){
    const dest = document.getElementById('dest');
    const ap = window.SKLOPI_ACTIVE_PLAN;
    if (dest && !(ap && ap.keepDest)) {
      const newDest = (ap && ap.dest) || curCity;
      // Isto kao gore: ne diraj/ne dispatch-uj ako je destinacija već ta ista.
      if (dest.value !== newDest) {
        dest.value = newDest;
        dest.dispatchEvent(new Event('input', {bubbles:true}));
      }
    }
    const search = document.getElementById('searchForm');
    if (search) search.scrollIntoView({behavior:'smooth', block:'center'});
    setTimeout(() => document.getElementById('origin')?.focus(), 500);
  }

  // Detalj paketa (#planDetail) + razrada (#planBreakdown: let, hotel,
  // aktivnosti, dodatne usluge) za SVE tri kartice iz "3 plana". Klik na
  // karticu upisuje izbor plana u builderState i destinaciju grada, pa
  // razrada ispod (let/hotel/aktivnosti/dodaci) prikazuje baš taj plan.
  const detail = document.getElementById('planDetail');
  const breakdown = document.getElementById('planBreakdown');
  function priceText(n){ return currentCurrency === 'RSD' ? fmtEUR(n) : n.toLocaleString('de-DE') + ' \u20ac'; }

  function renderPlanDetail(){
    const p = window.SKLOPI_ACTIVE_PLAN;
    if (!p || !detail) return;
    const svc = p.svc || {flight:true, hotel:true, car:true, activity:true}; // stariji/keširan plan bez svc -> ponašaj se kao pre
    const lo = Math.round(p.price * 0.935 / 10) * 10, hi = Math.round(p.price * 1.07 / 10) * 10;
    $('planDetailTitle').textContent = tx(p.title);
    const pctx = builderCtx();
    $('planDetailMeta').textContent = cityLabel(pctx.dest) + ' \u2022 ' + daysLabel(pctx.days);
    $('planDetailPrice').innerHTML = escapeHtml(priceText(p.price)) + ' <span>' + tx('/ osoba') + '</span>';
    $('planDetailEst').textContent = tx('Procena: ~') + priceText(lo).replace(' \u20ac','') + '\u2013' + priceText(hi);
    $('planDetailImg').src = p.photo;
    $('planDetailImg').alt = tx(p.alt);
    const badge = $('planDetailBadge');
    badge.textContent = tx(p.badge);
    badge.className = 'plan-detail-badge ' + p.badgeCls;
    $('planDetailFor').textContent = tx(p.forWho);
    const row = (ic, t1, t2) => '<li><span class="pdl-ic" aria-hidden="true">' + ic + '</span><div><b>' + t1 + '</b><small>' + t2 + '</small></div></li>';
    // Isti princip kao za kartice u listi: red se prikazuje SAMO ako je taj
    // servis stvarno tražen, i let dobija "\u2192 <aerodrom>" kad grad nema
    // svoj (ista logika/tekst kao airportInfoFor/airportNoteText svuda drugde).
    const flightTitle = p.flightArrival ? escapeHtml(tx(p.flightT)) + ' \u2192 ' + escapeHtml(cityLabel(p.flightArrival)) : escapeHtml(tx(p.flightT));
    $('planDetailList').innerHTML =
      (svc.flight ? row('\u2708', flightTitle, escapeHtml(tx(p.flightS))) : '') +
      (svc.hotel ? row('\u25a3', tx('Hotel'), escapeHtml(tx(p.hotelS))) : '') +
      (svc.activity ? row('\u25c7', tx('Aktivnosti'), escapeHtml(tx(p.actS))) : '') +
      (svc.car ? row('\u25b1', tx('Prevoz'), escapeHtml(tx(p.carS))) : '');
    const apEl = $('planDetailAirport');
    if (apEl){
      const show = svc.flight && !!p.airportNote;
      apEl.hidden = !show;
      apEl.textContent = show ? ('\u2708\ufe0f ' + p.airportNote) : '';
    }
  }

  function openPlan(key){
    const p = typeof key === 'string' ? curPlans.find(x => x.key === key) : key;
    if (!p || !detail) return;
    window.SKLOPI_ACTIVE_PLAN = p;
    const dest = $('dest');
    if (dest && !p.keepDest){
      const newDest = p.dest || curCity;
      // Isti razlog kao kod buildBtn/goToSearchForCity iznad — ne
      // dispatch-uj 'input' ako se destinacija stvarno ne menja.
      if (dest.value !== newDest){ dest.value = newDest; dest.dispatchEvent(new Event('input', {bubbles:true})); }
    }
    // Isto ovde: nekad se builderState (za "razradu"/rezervaciju ispod)
    // uvek postavljao na includeFlight/includeHotel true, bez obzira na
    // stvarno markirane servise — pa je i razrada tražila let za grad bez
    // aerodroma / usluge koje korisnik nikad nije tražio.
    const svc = p.svc || {flight:true, hotel:true, car:true, activity:true};
    Object.assign(builderState, {
      includeFlight:svc.flight, includeHotel:svc.hotel, flightPref:p.flightPref, hotelStars:p.hotelStars,
      prioritizeLocation:p.prioritizeLocation, carPref:svc.car ? p.carPref : 'none', activityCount:svc.activity ? p.activityCount : 0
    });
    renderFormUI();
    document.dispatchEvent(new Event('sklopi:plan-changed'));
    if (breakdown){ breakdown.hidden = true; breakdown.classList.remove('open'); }   // razrada se otvara tek na "Pogledaj detalje"
    guardOverlayDrop('planBreakdown');   // ako je razrada prethodnog paketa bila otvorena/gurnuta, skini je sa steka
    renderPlanDetail();
    detail.hidden = false;
    // #planDetail je na mobilnom zaseban "prozor" preko sadržaja (isti
    // obrazac kao #results/#attractionsSheet) — bez klase .open (position:
    // fixed) i lockResultsPageScroll() skrol prstom "pobegne" na ostatak
    // sajta umesto da ostane zaključan unutar kartice. Vidi styles.css.
    if (isMobileResults()){
      detail.classList.add('open');
      lockResultsPageScroll();
    }
    guardOverlayOpen('planDetail', closePlanDetail);
    detail.scrollIntoView({behavior:'smooth', block:'start'});
  }

  // "Sirovo" zatvaranje #planDetail (i, ako je otvorena, #planBreakdown
  // razrade unutar njega) — poziva ga ISKLJUČIVO popstate handler (preko
  // guarda) ili guardOverlayRequestClose fallback ispod. Ne diraj historiju
  // ovde, to je posao guarda (vidi komentar na vrhu fajla).
  function closePlanDetail(){
    const wasLocked = _resultsScrollLocked;
    if (detail){ detail.hidden = true; detail.classList.remove('open'); detail.removeAttribute('role'); detail.removeAttribute('aria-modal'); }
    if (breakdown){ breakdown.hidden = true; breakdown.classList.remove('open'); }
    guardOverlayDrop('planBreakdown');   // ako je razrada bila otvorena, skini je i sa steka
    // Skida se zaključavanje skrola OVDE (ne u closePlanBreakdown) jer je
    // ovo konačno zatvaranje ekrana — dok se razrada zatvara natrag na
    // #planDetail, taj je i dalje otvoren pa skrol ostaje zaključan.
    if (wasLocked) unlockResultsPageScroll();
    const ap = window.SKLOPI_ACTIVE_PLAN;
    const backId = (ap && ap.backTo) || 'destinationPlans';
    if (backId === 'destinationPlans') showDestPlans();
    else $(backId)?.scrollIntoView({behavior:'smooth', block:'start'});
  }
  // "Sirovo" zatvaranje #planBreakdown (vraćanje na #planDetail) — isti
  // princip, koriste ga i flightDetailBack/hotelDetailBack/carDetailBack
  // ispod preko guardOverlayRequestClose('planBreakdown'). Skrol OSTAJE
  // zaključan (unlockResultsPageScroll() se ne zove ovde) jer se vraćamo
  // na #planDetail, koji je i dalje otvoren ispod.
  function closePlanBreakdown(){
    if (breakdown){ breakdown.hidden = true; breakdown.classList.remove('open'); }
    document.getElementById('planDetail')?.scrollIntoView({behavior:'smooth', block:'start'});
  }
  window.SKLOPI_closePlanBreakdown = closePlanBreakdown;
  $('destPlansList')?.addEventListener('click', e => {
    const card = e.target.closest('.dest-plan-card');
    if (card) openPlan(curPlans[Number(card.dataset.plan)]);
  });
  window.SKLOPI_openPlan = openPlan;   // koristi ga i "Tvoj personalizovani plan"
  document.addEventListener('sklopi:lang', () => { render(); if (detail && !detail.hidden) renderPlanDetail(); });
  // Cene "računatih" gradova zavise od polaska, datuma i broja putnika.
  let _planTimer = null;
  ['origin','dateFrom','dateTo','adults'].forEach(id => {
    const el = $(id);
    if (!el) return;
    ['input','change'].forEach(ev => el.addEventListener(ev, () => { clearTimeout(_planTimer); _planTimer = setTimeout(render, 250); }));
  });
  // I na promenu Letovi/Smeštaj/R a C/Aktivnost — vidi napomenu uz
  // 'sklopi:services-changed' gore (FORM WIRING) za ceo bag.
  document.addEventListener('sklopi:services-changed', render);

  $('planDetailBack')?.addEventListener('click', () => {
    // guardOverlayRequestClose ide preko history.back() -> popstate ->
    // closePlanDetail(); ako iz nekog razloga overlay nije na steku
    // (fallback), zatvori direktno.
    if (!guardOverlayRequestClose('planDetail')) closePlanDetail();
  });
  $('planDetailBook')?.addEventListener('click', goToSearchForCity);
  $('planDetailMore')?.addEventListener('click', () => {
    if (!breakdown) return;
    // BAG: "Pogledaj detalje" je otvarao SVE podstranice (let/hotel/
    // aktivnosti) bez obzira na to koje je usluge korisnik stvarno
    // markirao (Letovi/Smeštaj/R a C/Aktivnost) — npr. paket sa samo
    // "Smeštaj" i dalje je prikazivao "Let Beograd → X" (i, pošto Polazak
    // nije bio popunjen jer let nije ni tražen, tiho je pretpostavljao
    // Beograd). Sada sakrivamo podstranicu za svaku uslugu koja nije
    // markirana, isto kao što se već radi za red u planDetailList iznad.
    const p = window.SKLOPI_ACTIVE_PLAN;
    const svc = (p && p.svc) || {flight:true, hotel:true, car:true, activity:true};
    const flightSec = $('flightDetail'), hotelSec = $('hotelDetail'), carSec = $('carDetail'), actSec = $('activitiesDetail');
    if (flightSec) flightSec.hidden = !svc.flight;
    if (hotelSec) hotelSec.hidden = !svc.hotel;
    if (carSec) carSec.hidden = !svc.car;
    if (actSec) actSec.hidden = !svc.activity;
    breakdown.hidden = false;
    // Isti razlog kao u openPlan() iznad — #planBreakdown je zaseban
    // prozor preko #planDetail-a na mobilnom. lockResultsPageScroll() je
    // idempotentan (već je zaključan iz openPlan()), samo za svaki slučaj
    // ako je breakdown nekako otvoren bez prethodnog planDetail-a.
    if (isMobileResults()){
      breakdown.classList.add('open');
      lockResultsPageScroll();
    }
    guardOverlayOpen('planBreakdown', closePlanBreakdown);
    document.dispatchEvent(new Event('sklopi:plan-breakdown'));
    breakdown.scrollIntoView({behavior:'smooth', block:'start'});
  });
  $('planDetailCustomize')?.addEventListener('click', () => {
    const cp = document.getElementById('customPlanner');
    if (cp){ cp.hidden = false; cp.scrollIntoView({behavior:'smooth', block:'start'}); }
  });
  $('currencySwitchBtn')?.addEventListener('click', () => setTimeout(() => { render(); if (detail && !detail.hidden) renderPlanDetail(); }, 0));
  render();
})();

/* ==========================================================
   SASTAVI SVOJ PAKET (#customPlanner) — čip izbori (6. ekran sa slike).
   Upisuje izbor u builderState (isti izvor istine kao stari upitnik),
   pa "Sklopi moj put" otvara postojeći builder sa procenom cene.
   Budžet/Balans/Komfor su samo prečice: postave zvezdice hotela i tip
   leta, a korisnik ih posle može da promeni ostalim čipovima.
   Broj aktivnosti: 1-2 → 2, 3-4 → 3, 5+ → 5 (predstavnička vrednost).
========================================================== */
(function initCustomPlanner(){
  const root = document.getElementById('customPlanner');
  const btn = document.getElementById('customPlannerBtn');
  if (!root || !btn) return;
  const TIER_PRESETS = {
    budget:  {stars:'3', flight:'cheapest'},
    balance: {stars:'4', flight:'direct'},
    comfort: {stars:'5', flight:'direct'}
  };
  function setChip(group, value){
    root.querySelectorAll('.cp-group[data-group="' + group + '"] .cp-chip').forEach(c => {
      const on = c.dataset.value === String(value);
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function getChip(group){
    const on = root.querySelector('.cp-group[data-group="' + group + '"] .cp-chip.is-on');
    return on ? on.dataset.value : null;
  }
  // Primeni izbore iz konfiguratora (builderState + "Tvoj personalizovani plan"). Bez validacije i skrola:
  // koristi se i za živo osvežavanje cene dok korisnik menja izbore.
  function apply(){
    const svc = window.SKLOPI_activeServiceFlags ? window.SKLOPI_activeServiceFlags() : {flight:true, hotel:true, car:true, activity:true};
    builderState.includeFlight = svc.flight;
    builderState.includeHotel = svc.hotel;
    builderState.flightPref = getChip('flight') === 'cheapest' ? 'cheapest' : 'direct';
    builderState.hotelStars = Number(getChip('stars')) || 4;
    builderState.carPref = svc.car ? (getChip('car') || 'none') : 'none';
    builderState.activityCount = svc.activity ? (Number(getChip('acts')) || 2) : 0;
    renderFormUI();
    // Rezultat je "Tvoj personalizovani plan" (#personalPlans); builder se
    // otvara tek klikom na "Pogledaj detalje" na nekom od planova.
    document.dispatchEvent(new CustomEvent('sklopi:custom-plan', {detail:{
      tier: getChip('tier'),
      sel: {flightPref: builderState.flightPref, hotelStars: builderState.hotelStars,
            carPref: builderState.carPref, activityCount: builderState.activityCount}
    }}));
  }
  // Ako su personalizovani planovi već prikazani, svaka promena izbora odmah osvežava cene.
  function liveRefresh(){
    const pp = document.getElementById('personalPlans');
    if (pp && !pp.hidden) apply();
  }
  document.addEventListener('sklopi:cp-refresh', liveRefresh);
  root.querySelectorAll('.cp-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const group = chip.closest('.cp-group').dataset.group;
      setChip(group, chip.dataset.value);
      if (group === 'tier'){
        const p = TIER_PRESETS[chip.dataset.value];
        if (p){ setChip('stars', p.stars); setChip('flight', p.flight); }
      }
      liveRefresh();
    });
  });
  btn.addEventListener('click', () => {
    // Ranije se proveravala SAMO destinacija — ista rupa kao kod ostalih
    // dugmadi "Sklopi moj put"/"Napravi izlet": polazak, datumi i broj
    // putnika su mogli ostati prazni. Ista provera kao svuda drugde.
    const check = validateSearchInputs();
    if (!check.ok){ showToast(check.msg); focusSearchField(check.focus); return; }
    apply();
    const target = document.getElementById('personalPlans') || document.getElementById('builderPanel');
    if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
  });
})();

/* ==========================================================
   KONFIGURATOR — redovi Datum / Putnici / Budžet (6. ekran sa slike).
   Datum i putnici se i dalje biraju u formi za pretragu (jedan izvor istine):
   "Promeni" otvara istu formu kao "Promeni" ispod kartica planova.
   Budžet je isto polje kao #budgetInput (builderState.budget).
========================================================== */
(function initCpTripRows(){
  const root = document.getElementById('customPlanner');
  const byId = id => document.getElementById(id);
  const dVal = byId('cpRowDatesVal'), pVal = byId('cpRowPaxVal'), bIn = byId('cpBudget');
  if (!root || !dVal || !pVal || !bIn) return;
  const txt = id => ((byId(id) || {}).textContent || '').trim();
  function refresh(){
    const db = byId('dateDisplayBtn'), pb = byId('paxDisplayBtn');
    const d = txt('dateDisplayText'), n = txt('dateNightsText'), p = txt('paxDisplayText');
    dVal.textContent = (db && !db.classList.contains('is-empty') && d) ? d + (n ? ' (' + n + ')' : '') : tx('Izaberi');
    pVal.textContent = (pb && !pb.classList.contains('is-empty') && p) ? p : tx('Izaberi');
    if (document.activeElement !== bIn) bIn.value = builderState.budget || '';
  }
  function editTrip(){
    const edit = byId('tripDefaultsPlansEdit');
    if (edit){ edit.click(); return; }
    const f = byId('searchForm');
    if (f) f.scrollIntoView({behavior:'smooth', block:'center'});
  }
  byId('cpRowDates').addEventListener('click', editTrip);
  byId('cpRowPax').addEventListener('click', editTrip);
  let t = null;
  bIn.addEventListener('input', () => {
    const src = byId('budgetInput');
    if (src){ src.value = bIn.value; src.dispatchEvent(new Event('input', {bubbles:true})); }
    else builderState.budget = Math.max(0, Math.min(50000, Number(bIn.value) || 0));
    clearTimeout(t);
    t = setTimeout(() => document.dispatchEvent(new Event('sklopi:cp-refresh')), 350);
  });
  bIn.addEventListener('blur', refresh);
  ['dateDisplayText', 'dateNightsText', 'paxDisplayText'].forEach(id => {
    const el = byId(id);
    if (el) new MutationObserver(refresh).observe(el, {childList:true, characterData:true, subtree:true});
  });
  new MutationObserver(refresh).observe(root, {attributes:true, attributeFilter:['hidden']});
  document.addEventListener('sklopi:lang', refresh);
  refresh();
})();

/* ==========================================================
   TVOJ PERSONALIZOVANI PLAN (#personalPlans) — 7. ekran sa slike.
   Iz izbora u "Sastavi svoj paket" pravi 3 plana: Balans (tvoj
   izbor), Komfor i Budžet. Osnovnu cenu daje
   computeCustomPackage; Plan 2 i 3 se izvode iz nje istim konstantama
   (množioci leta, cene zvezdica, cena auta), da redosled cena uvek
   bude Budžet < Balans < Komfor (isti redosled kao na kartici: Budžet, Balans, Komfor).
========================================================== */
(function initPersonalPlans(){
  const section = document.getElementById('personalPlans');
  const list = document.getElementById('ppList');
  const tags = document.getElementById('ppTags');
  if (!section || !list || !tags) return;
  const TIER_LABEL = {budget:'Budžet', balance:'Balans', comfort:'Komfor'};
  const ATHENS_PHOTOS = [
    'https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=400&q=80'
  ];
  let last = null;

  function fmtPrice(n){
    return currentCurrency === 'RSD' ? fmtEUR(n) : n.toLocaleString('de-DE') + ' \u20ac';
  }
  function photosFor(dest){
    if (normalizeSr(dest) === 'atina') return ATHENS_PHOTOS;
    const many = window.SKLOPI_destPhotos ? window.SKLOPI_destPhotos(dest) : [];
    if (many.length) return [many[0], many[1] || many[0], many[2] || many[0]];
    const cur = window.SKLOPI_destPhoto && window.SKLOPI_destPhoto(dest, 400);
    if (cur) return [cur, cur, cur];
    const card = Array.from(document.querySelectorAll('.popular-dest-card'))
      .find(c => normalizeSr(c.dataset.dest || '') === normalizeSr(dest));
    const src = card && card.querySelector('img') ? card.querySelector('img').src : 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=400&q=80';
    return [src, src, src];
  }
  // Procena po osobi za izbor `x`, izvedena iz osnovnog paketa `pkg` (izbor `a`).
  function derivePerPerson(pkg, a, x, ctx){
    const f = marketFactor(ctx.dest, todayStr()) * seasonFactor(ctx.dest, ctx.from);
    const flight = pkg.flight.price * FLIGHT_PREF_PRICE_MULT[x.flightPref] / FLIGHT_PREF_PRICE_MULT[a.flightPref];
    const hotel = pkg.hotel.price * HOTEL_STAR_BASE_PRICE[x.hotelStars] / HOTEL_STAR_BASE_PRICE[a.hotelStars];
    const perAct = a.activityCount > 0 ? pkg.activity.price / a.activityCount : 30 * marketFactor(ctx.dest, todayStr());
    const acts = perAct * x.activityCount;
    let car = 0;
    if (x.carPref !== 'none'){
      car = x.carPref === a.carPref
        ? pkg.car.price + pkg.carExtras.price
        : (CAR_TYPE_BASE_PRICE[x.carPref] + 5.5) * ctx.days * f + 27 * marketFactor(ctx.dest, todayStr());
    }
    return Math.round((flight + hotel + acts + car) / ctx.adults);
  }
  window.SKLOPI_derivePerPerson = derivePerPerson;   // koristi ga i spotlight (fiksni planovi po gradu)
  function flightText(x, ctx, comfortFlex){
    if (x.flightPref === 'cheapest') return 'Let sa presedanjem';
    if (comfortFlex) return 'Fleksibilan let';
    const o = iataFor(realDepartureAirportFor(ctx.originCode));
    const d = iataFor(realArrivalAirportFor(ctx.dest));
    return 'Direktan let' + (ctx.originCode && o && d ? ' (' + o + '\u2013' + d + ')' : '');
  }
  function carText(p){ return p === 'suv' ? 'Auto (SUV)' : p === 'small' ? 'Auto (mali)' : 'Bez auta'; }

  function render(){
    if (!last) return;
    const ctx = builderCtx();
    const svc = window.SKLOPI_activeServiceFlags ? window.SKLOPI_activeServiceFlags() : {flight:true, hotel:true, car:true, activity:true};
    const a = Object.assign({}, builderState, last.sel, {includeFlight:svc.flight, includeHotel:svc.hotel});
    if (!svc.car) a.carPref = 'none';
    if (!svc.activity) a.activityCount = 0;
    const pkg = computeCustomPackage(a, ctx);
    // Grad bez sopstvenog aerodroma (ista baza/tekst kao svuda drugde na
    // sajtu): dodajemo napomenu i "\u2192 <aerodrom>" umesto da kartica ćuti
    // ili tvrdi da let sleće baš u ctx.dest.
    const apInfo = airportInfoFor(ctx.dest);
    const noOwnAirport = svc.flight && apInfo && !apInfo.hasAirport && apInfo.nearest;
    const airportNote = noOwnAirport ? airportNoteText(apInfo) : '';
    const plans = [
      {idx:0, title:'Plan 1 \u2013 Balans', sel:a, flex:false},
      {idx:1, title:'Plan 2 \u2013 Komfor', flex:true, sel:Object.assign({}, a, {
        flightPref:'direct', hotelStars:Math.min(5, a.hotelStars + 1),
        carPref: svc.car ? (a.carPref === 'none' ? 'small' : a.carPref) : 'none',
        activityCount: svc.activity ? Math.min(10, a.activityCount + 1) : 0})},
      {idx:2, title:'Plan 3 \u2013 Budžet', flex:false, sel:Object.assign({}, a, {
        flightPref:'cheapest', hotelStars:Math.max(3, a.hotelStars - 1),
        carPref:'none', activityCount: svc.activity ? Math.max(1, a.activityCount - 1) : 0})}
    ];
    const shown = [plans[2], plans[0], plans[1]];   // prikaz: Budžet, Balans, Komfor
    const photos = photosFor(ctx.dest);
    tags.innerHTML = '<span class="pp-tag">' + escapeHtml(tx(TIER_LABEL[last.tier] || 'Balans')) + '</span>'
      + '<span class="pp-tag pp-tag--stars">' + a.hotelStars + '\u2605 ' + tx('hotel') + ' +</span>';
    list.innerHTML = shown.map((p, i) => {
      const price = p.price = p.idx === 0 ? Math.round(pkg.total / ctx.adults) : derivePerPerson(pkg, a, p.sel, ctx);
      // Budžet (opciono, ukupno za sve putnike): kratka napomena da li plan staje u njega.
      const bud = Number(builderState.budget) || 0, tot = price * ctx.adults;
      const budLine = !bud ? '' : tot <= bud
        ? '<p class="pp-budget pp-budget--ok">\u2713 ' + escapeHtml(tx('U okviru budžeta')) + '</p>'
        : '<p class="pp-budget pp-budget--over">\u26A0 ' + escapeHtml(fmtPrice(tot - bud) + ' ' + tx('preko budžeta')) + '</p>';
      const flightLabel = escapeHtml(tx(flightText(p.sel, ctx, p.flex))) + (noOwnAirport ? ' \u2192 ' + escapeHtml(cityLabel(apInfo.nearest)) : '');
      const apNote = airportNote ? '<p class="dest-plan-airport-note">\u2708\ufe0f ' + escapeHtml(airportNote) + '</p>' : '';
      return '<article class="pp-card" data-plan="' + i + '"><div class="pp-card-top"><div class="pp-card-info">'
        + '<h3>' + escapeHtml(tx(p.title)) + '</h3>'
        + '<p class="pp-price">' + fmtPrice(price) + ' <span>' + tx('/ osoba') + '</span></p>'
        + budLine
        + '<ul class="pp-feats">'
        + (svc.flight ? '<li><span class="dpf-ic" aria-hidden="true">\u2708</span>' + flightLabel + '</li>' : '')
        + (svc.hotel ? '<li><span class="dpf-ic" aria-hidden="true">\u25a3</span>' + p.sel.hotelStars + '\u2605 ' + tx('hotel') + ' (' + nightsLabel(ctx.nights) + ')</li>' : '')
        + (svc.activity ? '<li><span class="dpf-ic" aria-hidden="true">\u25c7</span>' + activitiesLabel(p.sel.activityCount) + '</li>' : '')
        + (svc.car ? '<li><span class="dpf-ic" aria-hidden="true">\u25b1</span>' + escapeHtml(tx(carText(p.sel.carPref))) + '</li>' : '')
        + '</ul>' + apNote + '</div><div class="pp-photo"><img src="' + photos[p.idx] + '" alt="" loading="lazy"></div></div>'
        + '<button type="button" class="btn-primary pp-more" data-plan="' + i + '">' + tx('Pogledaj detalje') + '</button></article>';
    }).join('');
    list.querySelectorAll('.pp-more').forEach(btn => btn.addEventListener('click', () => {
      const i = Number(btn.dataset.plan), p = shown[i], c = builderCtx();
      const rooms = p.sel.hotelStars + '\u2605 ' + tx('hotel') + ' (' + nightsLabel(c.nights) + ')';
      if (typeof window.SKLOPI_openPlan !== 'function') return;
      window.SKLOPI_openPlan({
        title:p.title, price:p.price, badge:['Popularno','Više komfora','Najpovoljnije'][p.idx],
        badgeCls:p.idx === 1 ? 'plan-detail-badge--comfort' : '',
        photo:photos[p.idx].replace('w=400', 'w=1200'), alt:p.title,
        flightPref:p.sel.flightPref, hotelStars:p.sel.hotelStars, prioritizeLocation:!!builderState.prioritizeLocation,
        carPref:p.sel.carPref, activityCount:p.sel.activityCount,
        flightT:flightText(p.sel, c, p.flex), flightS:'Povratna karta',
        hotelS:rooms, actS:activitiesLabel(p.sel.activityCount), carS:carText(p.sel.carPref),
        forWho:'Izračunato prema tvojim izborima u \u201eSastavi svoj paket\u201c.',
        keepDest:true, backTo:'personalPlans',
        svc:svc, airportNote:airportNote, flightArrival:noOwnAirport ? apInfo.nearest : null
      });
    }));
    section.hidden = false;
  }
  document.addEventListener('sklopi:custom-plan', e => { last = e.detail; render(); });
  document.addEventListener('sklopi:city-photo', () => { if (last && !section.hidden) render(); });
  // Živo osvežavanje: promena destinacije, polaska, datuma ili broja putnika iznova računa 3 plana
  // (bez ovoga bi ostali stari plani za prethodni grad). Destinacija samo kad je poznata ili posle izbora/Enter.
  let _ppTimer = null;
  const refresh = ms => { clearTimeout(_ppTimer); _ppTimer = setTimeout(() => { if (last && !section.hidden) render(); }, ms); };
  ['origin','dateFrom','dateTo','adults'].forEach(id => {
    const el = document.getElementById(id);
    if (el) ['input','change'].forEach(ev => el.addEventListener(ev, () => refresh(250)));
  });
  // Isti bag/popravka kao za "3 plana" — vidi 'sklopi:services-changed'.
  document.addEventListener('sklopi:services-changed', () => refresh(0));
  const ppDest = document.getElementById('dest');
  if (ppDest){
    ppDest.addEventListener('input', () => { if (window.SKLOPI_knownDest && window.SKLOPI_knownDest(ppDest.value)) refresh(600); });
    ppDest.addEventListener('change', () => { if (ppDest.value.trim()) refresh(0); });
  }
  document.addEventListener('sklopi:lang', () => { if (last && !section.hidden) render(); });
  document.getElementById('currencySwitchBtn')?.addEventListener('click', () => setTimeout(() => { if (!section.hidden) render(); }, 0));
})();

/* ==========================================================
   LET BEOGRAD → ATINA (#flightDetail) — 8. ekran sa slike.
   Otvara se iz "Pogledaj detalje" na paketu (#planBreakdown). Ruta,
   putnici i datumi dolaze iz forme za pretragu (polazak podrazumevano
   Beograd, destinacija Atina); cena po osobi je ilustrativna procena
   iz computeCustomPackage (direktan let). Nema "live cene" ni tačnog
   vremena polaska — nemamo pravi izvor; trajanje je procena iz
   udaljenosti aerodroma. Dugme vodi na KAYAK preko buildAffiliateLink.
========================================================== */
(function initFlightDetail(){
  const box = document.getElementById('planBreakdown');
  const btn = document.getElementById('fdKayakBtn');
  if (!box || !btn) return;
  const $ = id => document.getElementById(id);
  function render(){
    // Ako ovaj paket uopšte nije tražio let (svc.flight === false), sekcija
    // je već sakrivena iz planDetailMore handlera iznad — ovde samo ne
    // trošimo posao i ne prikazujemo je slučajno preko nekog drugog
    // okidača (promena jezika/valute) dok je hidden.
    if (box.hidden || (document.getElementById('flightDetail')?.hidden)) return;
    const ctx = builderCtx();
    // Polazak nije popunjen (let nije ni bio tražen, pa polje nije bilo
    // obavezno) — NE pretvaramo to tiho u "Beograd" kao pravu pretpostavku;
    // jasno označavamo da je polazište nepoznato i tražimo od korisnika
    // da ga upiše, umesto da mu ponudimo let iz grada koji nikad nije uneo.
    const hasOrigin = !!ctx.originCode;
    const originName = hasOrigin ? ctx.originCode : 'Beograd';
    const destName = ctx.dest;
    const c = Object.assign({}, ctx, {originCode: originName});
    const pref = builderState.flightPref === 'cheapest' ? 'cheapest' : 'direct';
    const sel = Object.assign({}, builderState, {flightPref:pref, includeFlight:true});
    const pkg = computeCustomPackage(sel, c);
    const perPerson = Math.round(pkg.flight.price / c.adults);
    const o = iataFor(realDepartureAirportFor(originName));
    const d = iataFor(realArrivalAirportFor(destName));
    let dur = '';
    if (o && d && AIRPORT_COORDS[o] && AIRPORT_COORDS[d] && o !== d){
      const mins = Math.round((haversineKm(AIRPORT_COORDS[o], AIRPORT_COORDS[d]) / 620 * 60 + 35) / 5) * 5;
      dur = tx('oko ') + Math.floor(mins / 60) + 'h ' + String(mins % 60).padStart(2, '0') + 'm';
    }
    const carrier = FLIGHT_CARRIERS.find(n => pkg.flight.name.indexOf(n) === 0) || '';
    $('flightDetailTitle').textContent = tx('Let ') + cityLabel(originName) + ' \u2192 ' + cityLabel(destName);
    $('fdMeta').textContent = tx(pref === 'cheapest' ? 'Najjeftinija kombinacija' : 'Direktan let') + ' \u2022 KAYAK';
    $('fdPrice').innerHTML = (currentCurrency === 'RSD' ? escapeHtml(fmtEUR(perPerson)) : perPerson.toLocaleString('de-DE') + ' \u20ac') + ' <span>' + tx('/ osoba') + '</span>';
    $('fdFrom').textContent = o || '\u2014';
    $('fdTo').textContent = d || '\u2014';
    // Polazak/destinacija bez sopstvenog aerodroma: pokaži aerodrom koji se zaista koristi + isto obaveštenje kao u pretrazi.
    const oInfo = airportInfoFor(originName), dInfo = airportInfoFor(destName);
    const noAp = i => i && !i.hasAirport && i.nearest;
    $('fdFromName').textContent = cityLabel(noAp(oInfo) ? oInfo.nearest : originName);
    $('fdToName').textContent = cityLabel(noAp(dInfo) ? dInfo.nearest : destName);
    const apNote = $('fdAirportNote');
    if (apNote){
      const notes = [oInfo, dInfo].filter(noAp).map(airportNoteText).filter(Boolean);
      // Ako Polazak nije upisan, ne ćutimo o pretpostavci — jasno kažemo
      // da je Beograd samo podrazumevano polazište dok korisnik ne unese svoje.
      if (!hasOrigin) notes.unshift(tx('Polazak nije unet — cena je procena za let iz Beograda. Upiši svoj Polazak za tačniju ponudu.'));
      apNote.textContent = notes.length ? '\u2708\ufe0f ' + notes.join(' ') : '';
      apNote.hidden = !notes.length;
    }
    const stopTxt = tx(pref === 'cheapest' ? 'Moguće presedanje' : 'Direktan let');
    $('fdDur').textContent = dur ? dur + ' \u2022 ' + stopTxt : stopTxt;
    $('fdCarrier').textContent = carrier ? tx('Prevoznik (procena): ') + carrier : '';
    const url = buildAffiliateLink('flight', {
      dest: destName, originCode: originName, from: c.from, to: c.to, adults: c.adults, flightPref: pref
    });
    btn.href = url;
    btn.dataset.url = url;
    btn.dataset.price = String(pkg.flight.price);
    btn.dataset.dest = destName;
  }
  document.addEventListener('sklopi:plan-breakdown', render);
  document.addEventListener('sklopi:lang', () => { if (!box.hidden) render(); });
  document.getElementById('flightDetailBack')?.addEventListener('click', () => {
    if (!guardOverlayRequestClose('planBreakdown')) {
      box.hidden = true;
      document.getElementById('planDetail')?.scrollIntoView({behavior:'smooth', block:'start'});
    }
  });
  document.getElementById('currencySwitchBtn')?.addEventListener('click', () => setTimeout(() => { if (!box.hidden) render(); }, 0));
})();

/* ==========================================================
   HOTEL U ATINI (#hotelDetail) — 9. ekran sa slike. Isti obrazac kao
   #flightDetail: otvara se sa #planBreakdown, podaci iz forme. Hotel je
   3★ blizu centra (kao paket "Najviše za novac"); cena po noći i ukupno
   su ilustrativna procena iz computeCustomPackage. Namerno bez izmišljenog
   naziva hotela, broja recenzija i liste sadržaja (WiFi/bazen) — nemamo
   te podatke; umesto toga prikazujemo šta procena stvarno pokriva
   (blizu centra, sobe, noći). Dugme vodi na Booking.com (affiliate link).
========================================================== */
(function initHotelDetail(){
  const box = document.getElementById('planBreakdown');
  const btn = document.getElementById('hdBookingBtn');
  if (!box || !btn) return;
  const $ = id => document.getElementById(id);
  const money = n => currentCurrency === 'RSD' ? fmtEUR(n) : n.toLocaleString('de-DE') + ' \u20ac';
  function render(){
    // Isti razlog kao u initFlightDetail: ne prikazuj/računaj ako ovaj
    // paket nije tražio Smeštaj (svc.hotel === false).
    if (box.hidden || (document.getElementById('hotelDetail')?.hidden)) return;
    const ctx = builderCtx();
    const stars = builderState.hotelStars || 3;
    const central = !!builderState.prioritizeLocation;
    const sel = Object.assign({}, builderState, {includeHotel:true, hotelStars:stars});
    const pkg = computeCustomPackage(sel, ctx);
    const rooms = Math.max(1, Math.ceil(ctx.adults / 2));
    const perNight = Math.round(pkg.hotel.price / (ctx.nights * rooms));
    $('hotelDetailTitle').textContent = tx('Hotel u ') + cityLabel(ctx.dest);
    $('hdMeta').textContent = stars + '\u2605 \u2022 ' + tx(central ? 'blizu centra' : 'mirniji deo');
    $('hdPrice').innerHTML = escapeHtml(money(perNight)) + ' <span>' + tx('/ no\u0107') + '</span>';
    $('hdTotal').textContent = tx('(ukupno ') + money(pkg.hotel.price) + ') \u2022 ' + tx('ilustrativna procena');
    $('hdChips').innerHTML = [
      (central ? '\ud83d\udccd ' + tx('Blizu centra') : '\ud83c\udf3f ' + tx('Mirniji deo')),
      '\ud83d\udecf ' + roomsLabel(rooms),
      '\ud83c\udf19 ' + nightsLabel(ctx.nights)
    ].map(s => '<span class="hd-chip">' + s + '</span>').join('');
    const url = buildAffiliateLink('hotel', {
      dest: ctx.dest, from: ctx.from, to: ctx.to, adults: ctx.adults,
      hotelStars: stars, prioritizeLocation: central, prioritizeRating: false
    });
    btn.href = url;
    btn.dataset.url = url;
    btn.dataset.price = String(pkg.hotel.price);
    btn.dataset.dest = ctx.dest;
  }
  document.addEventListener('sklopi:plan-breakdown', render);
  document.addEventListener('sklopi:lang', () => { if (!box.hidden) render(); });
  $('hotelDetailBack')?.addEventListener('click', () => {
    if (!guardOverlayRequestClose('planBreakdown')) {
      box.hidden = true;
      document.getElementById('planDetail')?.scrollIntoView({behavior:'smooth', block:'start'});
    }
  });
  document.getElementById('currencySwitchBtn')?.addEventListener('click', () => setTimeout(() => { if (!box.hidden) render(); }, 0));
})();

/* ==========================================================
   AUTO (#carDetail) — isti obrazac kao #hotelDetail/#flightDetail:
   otvara se sa #planBreakdown, samo kad je paket stvarno tražio R a C
   (svc.car), podaci iz forme. BAG koji je ovo popravio: R a C nije imao
   NIKAKVU podstranicu u "Pogledaj detalje" (postojale su samo za Let/
   Hotel/Aktivnosti) — auto je ulazio u ukupnu cenu i u "Šta je
   uključeno?" listu, ali korisnik nije mogao da ga vidi/rezerviše kad
   je to bila jedina ili jedna od tri tražene usluge. Cena po danu i
   ukupno (uključujući gorivo/putarine, isto kao u builderu) su
   ilustrativna procena iz computeCustomPackage. Dugme vodi na
   Booking.com Cars (isti partner/provider kao za hotel).
========================================================== */
(function initCarDetail(){
  const box = document.getElementById('planBreakdown');
  const btn = document.getElementById('cdBookingBtn');
  if (!box || !btn) return;
  const $ = id => document.getElementById(id);
  const money = n => currentCurrency === 'RSD' ? fmtEUR(n) : n.toLocaleString('de-DE') + ' \u20ac';
  const carLabel = p => p === 'suv' ? tx('Auto (SUV)') : tx('Auto (mali)');
  function render(){
    if (box.hidden || (document.getElementById('carDetail')?.hidden)) return;
    const ctx = builderCtx();
    const carPref = builderState.carPref !== 'none' ? builderState.carPref : 'small';
    const sel = Object.assign({}, builderState, {carPref});
    const pkg = computeCustomPackage(sel, ctx);
    const perDay = Math.round(pkg.car.price / Math.max(1, ctx.days));
    const totalWithExtras = pkg.car.price + pkg.carExtras.price;
    $('carDetailTitle').textContent = tx('Auto u ') + cityLabel(ctx.dest);
    $('cdMeta').textContent = carLabel(carPref);
    $('cdPrice').innerHTML = escapeHtml(money(perDay)) + ' <span>' + tx('/ dan') + '</span>';
    $('cdTotal').textContent = tx('(ukupno ') + money(totalWithExtras) + ', ' + tx('uklj. gorivo i putarine') + ') \u2022 ' + tx('ilustrativna procena');
    $('cdChips').innerHTML = [
      '\ud83d\udccd ' + cityLabel(ctx.dest),
      '\ud83d\udcc5 ' + daysLabel(ctx.days),
      '\u26fd ' + tx('Gorivo i putarine: ') + money(pkg.carExtras.price)
    ].map(s => '<span class="hd-chip">' + s + '</span>').join('');
    const url = buildAffiliateLink('car', {dest: ctx.dest, from: ctx.from, to: ctx.to, adults: ctx.adults});
    btn.href = url;
    btn.dataset.url = url;
    btn.dataset.price = String(pkg.car.price);
    btn.dataset.dest = ctx.dest;
  }
  document.addEventListener('sklopi:plan-breakdown', render);
  document.addEventListener('sklopi:lang', () => { if (!box.hidden) render(); });
  $('carDetailBack')?.addEventListener('click', () => {
    if (!guardOverlayRequestClose('planBreakdown')) {
      box.hidden = true;
      document.getElementById('planDetail')?.scrollIntoView({behavior:'smooth', block:'start'});
    }
  });
  document.getElementById('currencySwitchBtn')?.addEventListener('click', () => setTimeout(() => { if (!box.hidden) render(); }, 0));
})();

/* ==========================================================
   NAJPOPULARNIJE AKTIVNOSTI (#activitiesDetail) — 10. ekran sa slike.
   Za Atinu: 3 ručno odabrane aktivnosti (ilustrativne "od" cene).
   Za ostale destinacije: 3 opšte aktivnosti sa cenom izvedenom iz
   computeCustomPackage. Bez ocena i broja recenzija (nemamo podatke).
   "Rezerviši" vodi na Viator pretragu (affiliate), "Pogledaj sve
   aktivnosti" otvara postojeći spisak atrakcija.
========================================================== */
(function initActivitiesDetail(){
  const box = document.getElementById('planBreakdown');
  const list = document.getElementById('adList');
  if (!box || !list) return;
  const ATHENS = [
    {name:'Akropolj i muzej Akropolja', price:35, q:'Acropolis Athens tour', img:'https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=300&q=80'},
    {name:'Obilazak starog grada', price:28, q:'Athens old town walking tour', img:'https://images.unsplash.com/photo-1555993539-1732b0258235?w=300&q=70&auto=format&fit=crop'},
    {name:'Krstarenje zalivom', price:42, q:'Athens bay cruise', img:'https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?auto=format&fit=crop&w=300&q=80'}
  ];
  // Kurirane, po destinaciji specifične aktivnosti (stvarne znamenitosti/ture) za
  // gradove koje SKLOPI posebno ističe (isti spisak kao dest-plans.js). Cena se i
  // dalje izvodi iz computeCustomPackage (base * ratio) da ostane usklađena sa
  // ostatkom procene paketa; menja se samo NAZIV aktivnosti po destinaciji.
  // Za sve ostale (stotine manjih mesta) koristi se generički fallback ispod, ali
  // sa imenom destinacije ubačenim u naslov — da se više ne ponavlja identičan
  // tekst bez obzira šta je upisano u polje Destinacija.
  const CITY_ACTIVITIES = {
    istanbul: [
      {name:'Aja Sofija i Plava džamija', ratio:1.15, q:'Hagia Sophia Blue Mosque tour'},
      {name:'Obilazak Velikog bazara', ratio:0.75, q:'Istanbul Grand Bazaar tour'},
      {name:'Krstarenje Bosforom', ratio:1.05, q:'Bosphorus cruise Istanbul'}
    ],
    krf: [
      {name:'Obilazak starog grada Krfa', ratio:0.85, q:'Corfu old town walking tour'},
      {name:'Poseta tvrđavi Angelokastro', ratio:1.05, q:'Angelokastro fortress Corfu tour'},
      {name:'Izlet brodom do Paleokastrice', ratio:1.3, q:'Corfu boat trip Paleokastritsa'}
    ],
    pariz: [
      {name:'Ulaznica za Ajfelovu kulu', ratio:1.3, q:'Eiffel Tower tickets'},
      {name:'Obilazak Luvra', ratio:1.1, q:'Louvre museum tour'},
      {name:'Šetnja kroz Monmartr', ratio:0.7, q:'Montmartre walking tour Paris'}
    ],
    lisabon: [
      {name:'Vožnja istorijskim tramvajem 28', ratio:0.6, q:'Lisbon tram 28 tour'},
      {name:'Obilazak četvrti Alfama', ratio:0.85, q:'Alfama walking tour Lisbon'},
      {name:'Izlet do Sintre', ratio:1.5, q:'Sintra day trip from Lisbon'}
    ],
    rim: [
      {name:'Ulaznice za Koloseum i Forum', ratio:1.3, q:'Colosseum Roman Forum tickets'},
      {name:'Obilazak Vatikanskih muzeja', ratio:1.4, q:'Vatican Museums tour'},
      {name:'Šetnja istorijskim centrom Rima', ratio:0.7, q:'Rome historic center walking tour'}
    ],
    barselona: [
      {name:'Ulaznica za Sagrada Familiju', ratio:1.2, q:'Sagrada Familia tickets'},
      {name:'Obilazak Park Guelja', ratio:0.8, q:'Park Guell tour Barcelona'},
      {name:'Šetnja bulevarom Las Ramblas', ratio:0.6, q:'Las Ramblas walking tour Barcelona'}
    ],
    budva: [
      {name:'Obilazak Starog grada Budve', ratio:0.7, q:'Budva old town walking tour'},
      {name:'Izlet do Svetog Stefana', ratio:1.0, q:'Sveti Stefan tour Budva'},
      {name:'Krstarenje Budvanskom rivijerom', ratio:1.3, q:'Budva riviera boat cruise'}
    ],
    bec: [
      {name:'Ulaznica za dvorac Šenbrun', ratio:1.2, q:'Schönbrunn Palace tickets Vienna'},
      {name:'Obilazak katedrale Sv. Stefana', ratio:0.6, q:'St. Stephens Cathedral tour Vienna'},
      {name:'Koncert klasične muzike u Beču', ratio:1.5, q:'classical music concert Vienna'}
    ],
    solun: [
      {name:'Obilazak Bele kule', ratio:0.65, q:'White Tower Thessaloniki tour'},
      {name:'Šetnja Gornjim gradom (Ano Poli)', ratio:0.8, q:'Ano Poli walking tour Thessaloniki'},
      {name:'Obilazak arheoloških nalazišta Soluna', ratio:1.2, q:'Thessaloniki archaeological sites tour'}
    ],
    budimpesta: [
      {name:'Krstarenje Dunavom', ratio:1.0, q:'Danube river cruise Budapest'},
      {name:'Ulaznica za termalna kupatila Segedin', ratio:1.2, q:'Szechenyi Baths tickets Budapest'},
      {name:'Obilazak zgrade Parlamenta', ratio:0.9, q:'Hungarian Parliament tour Budapest'}
    ],
    prag: [
      {name:'Obilazak Praškog grada', ratio:1.1, q:'Prague Castle tour'},
      {name:'Šetnja Karlovim mostom i Starim gradom', ratio:0.65, q:'Charles Bridge Old Town walking tour Prague'},
      {name:'Obilazak Astronomskog sata i Starog grada', ratio:0.9, q:'Astronomical Clock Old Town tour Prague'}
    ],
    zagreb: [
      {name:'Obilazak Gornjeg grada', ratio:0.7, q:'Zagreb Upper Town walking tour'},
      {name:'Šetnja Trgom bana Jelačića', ratio:0.5, q:'Ban Jelačić Square tour Zagreb'},
      {name:'Izlet do Plitvičkih jezera', ratio:1.8, q:'Plitvice Lakes day trip from Zagreb'}
    ]
  };
  const money = n => currentCurrency === 'RSD' ? fmtEUR(n) : n.toLocaleString('de-DE') + ' \u20ac';

  /* ---- PRAVE aktivnosti sa Viator-a (preko Worker-a), za BILO KOJU destinaciju ----
     CITY_ACTIVITIES/generički fallback iznad su i dalje tu — služe kao trenutni
     prikaz (bez čekanja mreže) DOK se ne vrati pravi odgovor, i kao rezerva ako
     Worker nije podešen ili je Viator privremeno nedostupan. Kad pravi podaci
     stignu za destinaciju koja je i dalje upisana, tiho zamenjuju placeholder. */
  const REAL_ACT_CACHE_KEY = 'sklopi_dest_activities_v1';
  const REAL_ACT_TTL = 3600 * 1000; // isto ograničenje keširanja kao Viator dozvoljava (1h)
  function realActEndpoint(){
    if (window.SKLOPI_DEST_ACTIVITIES_URL) return window.SKLOPI_DEST_ACTIVITIES_URL;
    const base = window.SKLOPI_ALERT_WORKER_URL;
    return base ? String(base).replace(/\/$/, '') + '/go/destination-activities' : '';
  }
  function realActQuery(destName){
    return (typeof DEST_EN_NAMES !== 'undefined' && DEST_EN_NAMES[destName]) || destName;
  }
  function readRealActCache(q){
    try {
      const all = JSON.parse(localStorage.getItem(REAL_ACT_CACHE_KEY) || '{}');
      const hit = all[q];
      if (hit && (Date.now() - hit.t) < REAL_ACT_TTL) return hit.items;
    } catch(e){}
    return null;
  }
  function writeRealActCache(q, items){
    try {
      const all = JSON.parse(localStorage.getItem(REAL_ACT_CACHE_KEY) || '{}');
      all[q] = {t: Date.now(), items};
      localStorage.setItem(REAL_ACT_CACHE_KEY, JSON.stringify(all));
    } catch(e){}
  }
  async function fetchRealActivities(destName){
    const endpoint = realActEndpoint();
    if (!endpoint) return null; // Worker nije podešen — ostaje na ilustrativnom prikazu
    const q = realActQuery(destName);
    const cached = readRealActCache(q);
    if (cached) return cached;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({dest: destName, q})
      });
      if (!res.ok) return null;
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      writeRealActCache(q, items);
      return items;
    } catch(e){ return null; }
  }
  /* Slika za aktivnosti destinacije koja nema karticu među popularnim: Wikipedia slika grada
     (keš 7 dana), a do tada neutralna slika — nikad slika drugog grada (npr. Santorini za Sofiju). */
  const ACT_GENERIC_IMG = 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=400&q=80';
  const ACT_IMG_KEY = 'sklopi_act_photo_v1', ACT_IMG_TTL = 7 * 24 * 3600 * 1000;
  const actPhoto = {};
  async function actWiki(host, title){
    try {
      const r = await fetch('https://' + host + '/api/rest_v1/page/summary/' + encodeURIComponent(title));
      if (!r.ok) return '';
      const d = await r.json();
      if (d.type !== 'standard') return '';
      const th = d.thumbnail && d.thumbnail.source;
      return th || '';   // bez menjanja veličine: Wikimedia vraća grešku kad tražena veličina premašuje original
    } catch(e){ return ''; }
  }
  async function actCityPhoto(name, key){
    if (actPhoto[key] !== undefined) return actPhoto[key];
    actPhoto[key] = '';
    let cache = {ts:Date.now(), m:{}};
    try { const c = JSON.parse(localStorage.getItem(ACT_IMG_KEY) || 'null'); if (c && c.m && Date.now() - c.ts < ACT_IMG_TTL) cache = c; } catch(e){}
    let url = cache.m[key] || '';
    if (!url){
      let names = {}; try { names = DEST_EN_NAMES; } catch(e){}
      const en = String(names[name] || names[key] || name).split(',')[0].trim();
      url = await actWiki('en.wikipedia.org', en) || await actWiki('sh.wikipedia.org', name);
      if (url){ cache.m[key] = url; try { localStorage.setItem(ACT_IMG_KEY, JSON.stringify(cache)); } catch(e){} }
    }
    actPhoto[key] = url;
    return url;
  }
  function paint(items, ctx){
    list.innerHTML = items.map(it => {
      const url = it.url || buildAffiliateLink('activity', {dest: it.q || ctx.dest});
      return '<article class="ad-card"><div class="ad-photo"><img src="' + escapeHtml(it.img) + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'' + ACT_GENERIC_IMG + '\'"></div>'
        + '<div class="ad-info"><h3>' + escapeHtml(tx(it.name)) + '</h3><p class="ad-price">' + tx('od ') + escapeHtml(money(it.price)) + '</p>'
        + '<span class="partner-badge partner-badge--viator">Viator</span></div>'
        + '<a class="ad-book" href="' + escapeHtml(url) + '" target="_blank" rel="noopener sponsored" data-kind="activity" data-price="' + it.price
        + '" data-url="' + escapeHtml(url) + '" data-dest="' + escapeHtml(ctx.dest) + '" data-tier="plan" onclick="bookItem(this)">' + tx('Rezerviši') + '</a></article>';
    }).join('');
  }
  function render(){
    // Isti razlog kao u initFlightDetail: ne prikazuj/računaj ako ovaj
    // paket nije tražio Aktivnosti (svc.activity === false).
    if (box.hidden || (document.getElementById('activitiesDetail')?.hidden)) return;
    const ctx = builderCtx();
    const destKey = normalizeSr(ctx.dest);
    let items, fallbackImg;
    if (destKey === 'atina'){
      items = ATHENS;
      fallbackImg = ATHENS[2].img;
    } else {
      const pkg = computeCustomPackage(Object.assign({}, builderState, {activityCount:2}), ctx);
      const base = Math.max(10, Math.round(pkg.activity.price / 2));
      const card = Array.from(document.querySelectorAll('.popular-dest-card'))
        .find(c => normalizeSr(c.dataset.dest || '') === destKey);
      const img = card && card.querySelector('img') ? card.querySelector('img').src : (actPhoto[destKey] || ACT_GENERIC_IMG);
      fallbackImg = img;
      if (!(card && card.querySelector('img')) && actPhoto[destKey] === undefined){
        actCityPhoto(ctx.dest, destKey).then(u => {
          if (u && !box.hidden && normalizeSr(builderCtx().dest) === destKey) render();
        }).catch(() => {});
      }
      const curated = CITY_ACTIVITIES[destKey];
      if (curated){
        items = curated.map(it => ({name: it.name, price: Math.max(5, Math.round(base * it.ratio)), q: it.q, img}));
      } else {
        // Generički fallback za destinacije bez posebno pripremljenih aktivnosti —
        // ime destinacije se ubacuje u naslov da se lista razlikuje od grada do grada,
        // dok se (ispod) ne učita prava lista sa Viator-a za baš to mesto.
        items = [
          {name:'Ulaznice za glavne znamenitosti \u2013 ' + ctx.dest, price:Math.round(base * 1.1), q:ctx.dest + ' top attractions tickets', img},
          {name:'Obilazak starog grada \u2013 ' + ctx.dest, price:Math.round(base * 0.85), q:ctx.dest + ' old town walking tour', img},
          {name:'Vođena tura po gradu \u2013 ' + ctx.dest, price:Math.round(base * 1.3), q:ctx.dest + ' guided city tour', img}
        ];
      }
    }
    paint(items, ctx);
    // Pravi podaci sa Viator-a za TAČNO ovo mesto stižu asinhrono i (tiho, bez
    // treperenja) zamenjuju gornji ilustrativni prikaz — jedina prava vrednost
    // za korisnika, radi za bilo koju destinaciju, ne samo za kurirane gradove.
    fetchRealActivities(ctx.dest).then(real => {
      if (!real || !real.length) return;
      if (box.hidden || (document.getElementById('activitiesDetail')?.hidden)) return;
      if (normalizeSr(builderCtx().dest) !== destKey) return; // korisnik je u međuvremenu promenio destinaciju
      const mapped = real.slice(0, 3).map(r => ({name: r.name, price: r.price, url: r.url, img: r.img || fallbackImg}));
      paint(mapped, ctx);
    }).catch(() => {});
  }
  document.addEventListener('sklopi:plan-breakdown', render);
  document.addEventListener('sklopi:lang', () => { if (!box.hidden) render(); });
  document.getElementById('adAllBtn')?.addEventListener('click', () => openAttractionsSheet());
  document.getElementById('currencySwitchBtn')?.addEventListener('click', () => setTimeout(() => { if (!box.hidden) render(); }, 0));
})();

/* ==========================================================
   DODATNE USLUGE (#extrasDetail) — 11. ekran sa slike.
   eSIM: "Dodaj" uključuje eSIM u procenu (builderState.esim, isti
   izvor istine kao builder). Putno osiguranje: samo informacija dok
   nema partnerskog linka (World Nomads ide preko CJ). Price Alert:
   postojeći openAlertModal za trenutni izbor (builderState).
========================================================== */
(function initExtrasDetail(){
  const box = document.getElementById('planBreakdown');
  const esimBtn = document.getElementById('exEsimBtn');
  const alertBtn = document.getElementById('exAlertBtn');
  if (!box || !esimBtn || !alertBtn) return;
  const money = n => currentCurrency === 'RSD' ? fmtEUR(n) : n.toLocaleString('de-DE') + ' \u20ac';
  function render(){
    document.getElementById('exEsimPrice').textContent = tx('od ') + money(BUILDER_ADDON_RATES.esim);
    document.getElementById('exInsPrice').textContent = tx('od ') + money(BUILDER_ADDON_RATES.insurance);
    esimBtn.textContent = tx(builderState.esim ? 'Dodato \u2713' : 'Dodaj');
    esimBtn.setAttribute('aria-pressed', builderState.esim ? 'true' : 'false');
  }
  esimBtn.addEventListener('click', () => {
    builderState.esim = !builderState.esim;
    renderFormUI();
    renderBuilder();
    render();
    document.dispatchEvent(new Event('sklopi:plan-changed'));
    showToast(tx(builderState.esim ? 'eSIM dodat u procenu paketa.' : 'eSIM uklonjen iz procene.'));
  });
  alertBtn.addEventListener('click', () => {
    const pkg = computeCustomPackage(builderState, builderCtx());
    openAlertModal('builder', null, pkg.total);
  });
  document.addEventListener('sklopi:plan-breakdown', render);
  document.addEventListener('sklopi:lang', () => { if (!box.hidden) render(); });
  document.getElementById('currencySwitchBtn')?.addEventListener('click', () => setTimeout(() => { if (!box.hidden) render(); }, 0));
})();

/* ==========================================================
   UKUPNA CENA (#totalDetail) — poslednji ekran u razradi paketa
   (#planBreakdown: let/hotel/auto/aktivnosti/extras), posle kog
   korisnik više ne treba da ide na "Moj put" da vidi zbir svih
   troškova. Sabira TAČNO ono što je stvarno uključeno (isto kao
   #myTrip summary()), preko istog computeCustomPackage() —
   jedan izvor istine za ukupnu cenu na celom sajtu.
========================================================== */
(function initTotalDetail(){
  const box = document.getElementById('planBreakdown');
  const rowsEl = document.getElementById('totalDetailRows');
  const grandEl = document.getElementById('totalDetailGrand');
  const fineEl = document.getElementById('totalDetailFine');
  const myTripBtn = document.getElementById('totalDetailMyTripBtn');
  if (!box || !rowsEl || !grandEl) return;
  const money = n => currentCurrency === 'RSD' ? fmtEUR(n) : n.toLocaleString('de-DE') + ' \u20ac';
  function render(){
    const ctx = builderCtx();
    const sel = builderState;
    const pkg = computeCustomPackage(sel, ctx);
    const rows = [];
    if (sel.includeFlight) rows.push(['\u2708', tx('Let'), pkg.flight.price]);
    if (sel.includeHotel) rows.push(['\u25a3', tx('Hotel'), pkg.hotel.price]);
    if (sel.includeHotel && sel.touristTax) rows.push(['\ud83c\udfdb\ufe0f', tx('Boravišna taksa'), pkg.touristTaxCost]);
    if (sel.activityCount > 0) rows.push(['\u25c7', tx('Aktivnosti'), pkg.activity.price]);
    if (sel.carPref !== 'none') rows.push(['\u25b1', tx('Prevoz'), pkg.car.price + pkg.carExtras.price]);
    if (sel.esim) rows.push(['\ud83d\udcf6', tx('eSIM'), pkg.esimCost]);
    rowsEl.innerHTML = rows.map(r => '<li><span aria-hidden="true">' + r[0] + '</span><b>' + escapeHtml(r[1]) + '</b><em>' + escapeHtml(money(r[2])) + '</em></li>').join('');
    grandEl.innerHTML = tx('Ukupno: ') + '<b>' + escapeHtml(money(pkg.total)) + '</b>';
    fineEl.textContent = tx('Ilustrativna procena za ') + ctx.adults + ' ' + pluralWord('adult', ctx.adults) + ', ' + daysLabel(ctx.days) + '.';
  }
  myTripBtn?.addEventListener('click', () => {
    document.getElementById('myTrip')?.scrollIntoView({behavior:'smooth', block:'start'});
  });
  document.addEventListener('sklopi:plan-breakdown', render);
  document.addEventListener('sklopi:plan-changed', () => { if (!box.hidden) render(); });
  document.addEventListener('sklopi:lang', () => { if (!box.hidden) render(); });
  document.getElementById('currencySwitchBtn')?.addEventListener('click', () => setTimeout(() => { if (!box.hidden) render(); }, 0));
})();

/* ==========================================================
   MOJ PUT (#myTrip) — 13. ekran sa slike. Pregled trenutno izabranog
   plana (builderState + forma): stavke, ukupno, "Pogledaj detalje"
   (otvara builder) i "Preuzmi plan puta" (tekstualni fajl sa procenom
   i partnerskim linkovima). Dok korisnik ne izabere plan, prikazuje
   poruku i dugme ka 3 plana. "Završeni" je prazan (nema istorije).
========================================================== */
(function initMyTrip(){
  const root = document.getElementById('myTrip');
  const body = document.getElementById('mtBody');
  if (!root || !body) return;
  const KEY = 'sklopi_my_trip_v1';
  let ready = false, tab = 'active';
  // "Moj put" pamti IZABRAN plan: grad, izbore (let/hotel/auto/aktivnosti/eSIM), naziv plana i putne podatke
  // (polazak, datumi, putnici). Čuva se u pregledaču (localStorage) pa preživi osvežavanje; grad i izbori se NE
  // menjaju kad korisnik kasnije ukuca drugu destinaciju, a datumi/putnici prate formu dok je plan izabran.
  let trip = null;
  function persist(){ try { localStorage.setItem(KEY, JSON.stringify(trip)); } catch(e){} }
  function restore(){
    try {
      const t = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (t && typeof t.dest === 'string' && t.sel && t.ctx && /^\d{4}-\d{2}-\d{2}$/.test(t.ctx.from) && /^\d{4}-\d{2}-\d{2}$/.test(t.ctx.to)){
        trip = t; ready = true;
      }
    } catch(e){}
  }
  function formCtx(){ const c = builderCtx(); return {originCode:c.originCode, from:c.from, to:c.to, adults:c.adults}; }
  function snap(fromPlan){
    const c = builderCtx(), ap = window.SKLOPI_ACTIVE_PLAN;
    const own = fromPlan && ap && (ap.keepDest || !ap.dest || ap.dest === c.dest);
    trip = {dest:c.dest, sel:Object.assign({}, builderState), ctx:formCtx(), saved:false,
      title: own ? ap.title : '',
      photo: own && ap.photo ? ap.photo : ((window.SKLOPI_destPhoto && window.SKLOPI_destPhoto(c.dest, 300)) || '')};
    persist();
  }
  const isPast = () => !!trip && trip.ctx.to < todayStr();
  const money = n => currentCurrency === 'RSD' ? fmtEUR(n) : n.toLocaleString('de-DE') + ' \u20ac';
  function tripCtx(){
    const tc = trip.ctx, nights = nightsBetween(tc.from, tc.to);
    return {dest:trip.dest, originCode:tc.originCode, from:tc.from, to:tc.to, nights, days:nights, adults:tc.adults};
  }
  function summary(){
    const sel = trip.sel, ctx = tripCtx();
    const pkg = computeCustomPackage(sel, ctx);
    const rows = [];
    if (sel.includeFlight) rows.push(['\u2708', tx('Let'), pkg.flight.price]);
    if (sel.includeHotel) rows.push(['\u25a3', tx('Hotel'), pkg.hotel.price]);
    if (sel.includeHotel && sel.touristTax) rows.push(['\ud83c\udfdb\ufe0f', tx('Boravišna taksa'), pkg.touristTaxCost]);
    if (sel.activityCount > 0) rows.push(['\u25c7', tx('Aktivnosti'), pkg.activity.price]);
    rows.push(['\u25b1', tx('Prevoz'), sel.carPref === 'none' ? 0 : pkg.car.price + pkg.carExtras.price]);
    if (sel.esim) rows.push(['\ud83d\udcf6', 'eSIM', pkg.esimCost]);
    return {ctx, pkg, rows};
  }
  function headHtml(ctx){
    const photo = trip.photo ? trip.photo.replace(/w=\d+/, 'w=300') : '';
    return '<div class="mt-head">'
      + (photo ? '<span class="mt-thumb"><img src="' + escapeHtml(photo) + '" alt="" loading="lazy"></span>' : '')
      + '<div><h3>' + escapeHtml(cityLabel(ctx.dest)) + ' \u2013 ' + daysLabel(ctx.days) + '</h3>'
      + '<p>' + (trip.title ? escapeHtml(tx(trip.title)) + ' \u2022 ' : '') + escapeHtml(fmtDate(ctx.from) + ' \u2013 ' + fmtDate(ctx.to)) + ' \u2022 '
      + ctx.adults + ' ' + pluralWord('adult', ctx.adults) + '</p></div></div>';
  }
  function render(){
    root.querySelectorAll('.mt-tab').forEach(b => {
      b.classList.toggle('is-on', b.dataset.tab === tab);
      b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false');
    });
    if (tab === 'done'){
      if (ready && isPast()){          // putovanju je prošao datum povratka -> "Završeni"
        body.innerHTML = '<article class="mt-card">' + headHtml(tripCtx()) + '</article>'
          + '<button type="button" class="mt-link" id="mtRemove">' + tx('Ukloni plan') + '</button>';
        document.getElementById('mtRemove').addEventListener('click', removeTrip);
      } else {
        body.innerHTML = '<p class="mt-empty">' + tx('Još nemaš završenih putovanja.') + '</p>';
      }
      return;
    }
    if (!ready || isPast()){
      body.innerHTML = '<p class="mt-empty">' + tx('Još nisi sklopio put. Izaberi jedan od planova ili sastavi svoj paket.') + '</p>'
        + '<button type="button" class="btn-primary mt-btn" id="mtChoose">' + tx('Izaberi plan') + '</button>';
      document.getElementById('mtChoose').addEventListener('click', () => {
        if (window.SKLOPI_showDestPlans) window.SKLOPI_showDestPlans();
        else document.getElementById('destinationPlans')?.scrollIntoView({behavior:'smooth', block:'start'});
      });
      return;
    }
    const {ctx, pkg, rows} = summary();
    body.innerHTML = '<article class="mt-card">' + headHtml(ctx)
      + '<ul class="mt-rows">' + rows.map(r => '<li><span aria-hidden="true">' + r[0] + '</span><b>' + escapeHtml(tx(r[1])) + '</b><em>' + escapeHtml(money(r[2])) + '</em></li>').join('') + '</ul>'
      + '<p class="mt-total">' + tx('Ukupno: ') + '<b>' + escapeHtml(money(pkg.total)) + '</b></p>'
      + '<p class="mt-fine">' + tx('Ilustrativna procena za ') + ctx.adults + ' ' + pluralWord('adult', ctx.adults) + '.</p></article>'
      + '<button type="button" class="btn-primary mt-btn" id="mtDetails">' + tx('Pogledaj detalje') + '</button>'
      + '<button type="button" class="mt-link" id="mtSave"' + (trip.saved ? ' disabled' : '') + '>' + tx(trip.saved ? 'Sačuvano u nalogu \u2713' : 'Sačuvaj u nalog') + '</button>'
      + '<button type="button" class="mt-link" id="mtDownload">' + tx('Preuzmi plan puta') + '</button>'
      + '<button type="button" class="mt-link" id="mtRemove">' + tx('Ukloni plan') + '</button>';
    document.getElementById('mtDetails').addEventListener('click', () => {
      // Builder radi nad poljima forme i builderState — vrati ih na izabrani plan pre otvaranja.
      const set = (id, v) => { const el = document.getElementById(id); if (el && v != null && el.value !== String(v)){ el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); } };
      set('dest', trip.dest); set('dateFrom', trip.ctx.from); set('dateTo', trip.ctx.to); set('adults', trip.ctx.adults);
      if (typeof window.syncPaxDisplay === 'function') window.syncPaxDisplay();
      if (typeof window.syncDateDisplay === 'function') window.syncDateDisplay();
      Object.assign(builderState, trip.sel);
      renderFormUI();
      openControlPanel();
      document.getElementById('makeBuilderBtn').click();
      document.getElementById('builderPanel')?.scrollIntoView({behavior:'smooth', block:'start'});
    });
    document.getElementById('mtSave').addEventListener('click', saveToAccount);
    document.getElementById('mtDownload').addEventListener('click', download);
    document.getElementById('mtRemove').addEventListener('click', removeTrip);
  }
  function removeTrip(){
    trip = null; ready = false;
    try { localStorage.removeItem(KEY); } catch(e){}
    render();
  }
  // Isti zapis kao "Sačuvaj izlet" u builderu (selection.kind = 'builder'), pa ga postojeća lista
  // sačuvanih izleta i loadSavedTrip() otvaraju bez izmena. Traži prijavu.
  async function saveToAccount(){
    if (!trip || trip.saved) return;
    const user = await getCurrentUser();
    if (!user){ promptLogin(tx('Prijavi se da sačuvaš izlete')); return; }
    const {ctx, pkg} = summary(), sel = trip.sel;
    const summaryTags = [pkg.flight.name, sel.hotelStars + '\u2605 hotel',
      sel.carPref === 'none' ? 'Bez auta' : (sel.carPref === 'suv' ? 'SUV' : 'Mali auto'), sel.activityCount + ' aktivnosti'];
    try {
      const { error } = await sb.from('trips').insert({
        user_id: user.id, dest: ctx.dest, date_from: ctx.from, date_to: ctx.to, adults: ctx.adults,
        selection: {kind:'builder', builderState: Object.assign({}, sel), summaryTags, tierLabel: trip.title || 'Sopstveni izlet'},
        total: pkg.total
      });
      if (error) throw error;
      trip.saved = true; persist();
      renderSavedTrips();
      showToast('Izlet sačuvan (' + fmtEUR(pkg.total) + ').');
      render();
    } catch(err) {
      console.warn('[sklopi] čuvanje plana iz "Moj put" nije uspelo:', err.message);
      showToast('Čuvanje nije uspelo — pokušaj ponovo.');
    }
  }
  function download(){
    const {ctx, pkg, rows} = summary();
    const sel = trip.sel;
    const linkCtx = {dest:ctx.dest, originCode:ctx.originCode || 'Beograd', from:ctx.from, to:ctx.to, adults:ctx.adults,
      flightPref:sel.flightPref, hotelStars:sel.hotelStars, prioritizeLocation:sel.prioritizeLocation};
    const lines = ['SKLOPI \u2014 plan puta', '',
      cityLabel(ctx.dest) + ' \u2013 ' + daysLabel(ctx.days),
      ctx.from + ' do ' + ctx.to + ', putnika: ' + ctx.adults, ''];
    rows.forEach(r => lines.push(r[1] + ': ' + money(r[2])));
    lines.push('', 'Ukupno (ilustrativna procena): ' + money(pkg.total), '',
      'Rezervacija ide preko partnera (cena i dostupnost se proveravaju kod njih):');
    if (sel.includeFlight) lines.push('KAYAK (let): ' + buildAffiliateLink('flight', linkCtx));
    if (sel.includeHotel) lines.push('Booking.com (hotel): ' + buildAffiliateLink('hotel', linkCtx));
    if (sel.activityCount > 0) lines.push('Viator (aktivnosti): ' + buildAffiliateLink('activity', {dest:ctx.dest}));
    lines.push('', affDisc());
    const url = URL.createObjectURL(new Blob(['\uFEFF' + lines.join('\r\n')], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url; link.download = 'sklopi-plan-puta.txt';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  root.querySelectorAll('.mt-tab').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
  document.addEventListener('sklopi:lang', render);
  document.addEventListener('sklopi:plan-changed', () => { snap(true); ready = true; render(); });
  document.addEventListener('sklopi:custom-plan', () => { snap(false); ready = true; render(); });
  document.addEventListener('sklopi:city-photo', () => {
    if (ready && trip && !trip.photo && window.SKLOPI_destPhoto){
      trip.photo = window.SKLOPI_destPhoto(trip.dest, 300) || '';
      if (trip.photo){ persist(); if (tab === 'active') render(); }
    }
  });
  // Datumi, polazak i broj putnika prate formu dok je plan izabran.
  ['dateFrom', 'dateTo', 'adults', 'origin'].forEach(id => document.getElementById(id)?.addEventListener('change', () => {
    if (ready && trip){ trip.ctx = formCtx(); trip.saved = false; persist(); render(); }
  }));
  document.getElementById('currencySwitchBtn')?.addEventListener('click', () => setTimeout(render, 0));
  restore();
  render();
})();

(function initFooterYear(){
  const y = document.getElementById('footYear');
  if (y) y.textContent = '\u00a9 ' + new Date().getFullYear();
})();

