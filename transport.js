/* ==========================================================
   PREVOZ AUTOBUSOM I VOZOM — "Bez aviona: Beograd → …"
   ----------------------------------------------------------
   Novi fajl. Učitava se POSLE app.js (koristi njegove globalne funkcije:
   normalizeSr, escapeHtml, cityLabel, passengerLabel, t/getLang,
   airportInfoFor, iataFor, realArrivalAirportFor, AIRPORT_COORDS,
   haversineKm, currentCurrency, RSD_PER_EUR). Ako ovaj fajl ne postoji,
   app.js radi kao pre — pozivi su zaštićeni sa typeof.

   ŠTA RADI
   1) TRANSPORT_ROUTES — ručno uneta baza ruta iz BEOGRADA (autobus/voz:
      trajanje, cena po osobi u jednom pravcu, prevoznici, status linije).
   2) transportCardHtml(dest, adults, origin, flags) — velika kartica ispod
      ponuda na običnoj pretrazi. Prikazuje se SAMO kad let nije izabran.
      Sadrži: AUTO (razdaljina, vožnja, gorivo — automatski za bilo koja dva
      mesta, vidi TRANSPORT_ROUTING_URL niže, plus mala mapa sa ucrtanom
      rutom preko Leaflet-a/OSM tajlova — vidi _tcDrawMap) i AUTOBUS/VOZ
      (ručna baza, samo polazak iz Beograda).
   3) transportCompactHtml(dest, adults) — kratak blok za kartice
      predloga u "Pronađi svoj izlet".

   VAŽNO O PODACIMA
   - Sve su ILUSTRATIVNE procene iz javno dostupnih izvora, ne uživo
     podatak prevoznika. Autobus: agregatori karata (Obilet, Omio) za
     polazak sa BAS-a (Novi Beograd). Voz: štampa (Vreme, N1, 021) i
     saopštenja prevoznika. Datum provere: TRANSPORT_DATA_CHECKED.
   - Voz je unet SAMO za rute gde je postojanje linije provereno (Niš, Bar,
     Budimpešta, Beč). Za ostale rute (Zagreb, Skoplje, Sofija, Solun,
     Ljubljana, Podgorica, Segedin, ...) nisam našao pouzdane podatke o
     direktnom vozu, pa se prikazuje samo autobus. Ako znaš da linija
     postoji, dodaj 'train' unos.
   - Rute koje NISU u bazi ne dobijaju izmišljene brojke: ako je
     destinacija blizu (do ~650 km vazdušnom linijom) prikazuje se samo
     kratka kartica sa linkom za poređenje, inače se ništa ne prikazuje.
   - Kako dodati rutu: dodaj unos u TRANSPORT_ROUTES (ključ = naziv
     destinacije na srpskom, kako ga sajt prikazuje). Polja:
       bus:   {hMin, hMax, eurMin, eurMax, operators:[...], note}
       train: {status:'regular'|'seasonal'|'planned', hMin, hMax,
               eurMin, eurMax, note}
     eurMin/eurMax i operators su opcioni — ako fale, ta stavka se ne
     prikazuje. Cene su po osobi, u jednom pravcu, u EUR.
   - Voz: status 'planned' = linija najavljena/nova, prikazuje se
     upozorenje da korisnik proveri da li već saobraća.
   - Tekstovi u kartici idu kroz ključeve "transport_*" (vidi
     transport-sr-keys.json). Dok ključ ne postoji u locales, koristi se
     srpski tekst iz ovog fajla. Napomene (note) i nazivi prevoznika
     ostaju na srpskom u svim jezicima.

   PARTNER LINK — ❌ NIJE SPREMNO ZA PROVIZIJU: dugme vodi na početnu
   Omio-a bez tracking parametara. Omio affiliate program radi preko
   Travelpayouts-a; kad se nalog odobri, zameni TRANSPORT_PARTNER_URL
   pravim tracking linkom iz njihovog panela i tek tada dodaj
   affBadgeHtml() pored dugmeta (bez tracking-a se NE sme označavati
   kao partnerski link).
========================================================== */
const TRANSPORT_DATA_CHECKED = 'septembar 2026';
const TRANSPORT_PARTNER_URL = 'https://www.omio.com/';
const TRANSPORT_NEAR_KM = 650;

/* ---- AUTO: razdaljina, trajanje i gorivo za bilo koja dva mesta ----
   Koordinate: prvo poznati aerodrom (AIRPORT_COORDS, isti spisak kao za cenu
   leta) ako je ime prepoznato — pouzdanije od tekstualne pretrage, jer
   Open-Meteo/GeoNames često zna grad samo pod internacionalnim imenom
   (npr. "Skopje", ne "Skoplje"), pa bi srpski naziv vratio 0 rezultata.
   Za nepoznata imena (slobodno ukucano polazište bez svog aerodroma) i dalje
   se koristi Open-Meteo geokodiranje (isti servis koji sajt već koristi za
   vremensku prognozu). Ruta: javni OSRM server (router.project-osrm.org) —
   ❌ NAMENJEN PROBI: pre pravog saobraćaja proveri uslove korišćenja, ili
   postavi sopstveni OSRM / OpenRouteService (besplatan ključ, dnevno
   ograničenje) i samo promeni TRANSPORT_ROUTING_URL. Ako ruta ne uspe,
   koristi se PROCENA po vazdušnoj liniji (označena kao procena).
   Putarine se NE računaju (nijedan besplatan servis ih ne daje pouzdano).
   Cena goriva i potrošnja su procene — ažuriraj po potrebi. */
const TRANSPORT_ROUTING_URL = 'https://router.project-osrm.org/route/v1/driving/';
const TRANSPORT_FUEL_EUR_PER_L = 1.6;            // prosečna cena litra goriva (EUR) — AŽURIRAJ
const TRANSPORT_CONSUMPTION_L_100 = [6.0, 8.5];  // potrošnja od-do, l/100 km
const TRANSPORT_CAR_SEATS = 4;                   // koliko putnika staje u jedan auto
const TRANSPORT_CAR_MAX_KM = 2500;               // dalje od ovoga red za auto se ne prikazuje
const TRANSPORT_AIR_TO_ROAD = 1.35;              // faktor vazdušna linija → put (samo za procenu)
const TRANSPORT_AVG_KMH = 70;                    // prosečna brzina (samo za procenu)

const TRANSPORT_ROUTES = {
  // ---- Autobus: Obilet/Omio/FlixBus, polasci sa BAS-a (Novi Beograd) ----
  'Zagreb': {
    bus: {hMin:5.5, hMax:6, eurMin:30, eurMax:45, operators:['FlixBus'],
          note:'Direktni polasci tokom celog dana.'}
  },
  'Ljubljana': {
    bus: {hMin:7.5, hMax:8.5, eurMin:36, eurMax:60, operators:['FlixBus','Transprodukt'],
          note:'Direktni polasci, i dnevni i noćni.'}
  },
  'Segedin': {
    bus: {hMin:4.5, hMax:5, eurMin:17, eurMax:28, operators:['FlixBus'],
          note:'Ne vozi svakog dana — proveri dane polaska.'}
  },
  'Skoplje': {
    bus: {hMin:7, hMax:8.5, eurMin:25, eurMax:35,
          note:'Polasci tokom dana i noću.'}
  },
  'Sofija': {
    bus: {hMin:6.5, hMax:7, eurMin:36, eurMax:40, operators:['Karat-S'],
          note:'Malo polazaka dnevno — proveri red vožnje. Razlika u vremenu (+1 h) je uračunata.'}
  },
  'Solun': {
    bus: {hMin:9, hMax:10, eurMin:50, eurMax:55, operators:['FP Travel'],
          note:'Polazak uveče, dolazak u zoru. Proveri dane polaska.'}
  },
  'Niš': {
    bus: {hMin:3, hMax:4, eurMin:13, eurMax:19, operators:['Niš ekspres','Lasta','Auto Kodeks'],
          note:'Polasci skoro svakog sata.'},
    train: {status:'regular', hMin:5.5, hMax:6, eurMin:11, eurMax:14,
            note:'Znatno sporiji od autobusa. Cena po tarifi Srbijavoza (Regio i Inter Regio).'}
  },
  'Podgorica': {
    bus: {hMin:10, hMax:10.5, eurMin:27, eurMax:33, operators:['FlixBus']}
  },
  'Budva': {
    bus: {hMin:10, hMax:12, eurMin:30, eurMax:40, operators:['Lasta','Trans Jug','Niš ekspres'],
          note:'Većina polazaka je uveče, dolazak ujutru.'}
  },
  'Herceg Novi': {
    bus: {hMin:12.5, hMax:14, eurMin:34, eurMax:40,
          note:'Većina polazaka je popodne ili uveče, dolazak ujutru.'}
  },
  'Kotor': {
    bus: {hMin:12, hMax:13, eurMin:35, eurMax:39,
          note:'Polasci popodne i uveče, dolazak ujutru.'}
  },
  'Dubrovnik': {
    bus: {hMin:16.5, hMax:17, eurMin:70, eurMax:85,
          note:'Direktni polasci popodne, uveče i posle ponoći. Vrlo duga vožnja.'}
  },
  'Ohrid': {
    bus: {hMin:11, hMax:12, eurMin:39, eurMax:45, operators:['Galeb','Transprodukt'],
          note:'Noćna linija: polazak uveče, dolazak ujutru.'}
  },
  'Sarajevo': {
    bus: {hMin:9, hMax:10, eurMin:25, eurMax:46,
          note:'Cena zavisi od prevoznika i polaska; ima i noćnih polazaka.'}
  },
  // Zadar: red vožnje BAS-a za 24.09.2026 (08:00→20:10, 20:20→07:30, 22:45→08:00;
  // 5.359 / 5.900 / 3.889 din; Megapul Zadar, Banbus+Auto Trans, Koop Split).
  'Zadar': {
    bus: {hMin:9, hMax:12, eurMin:33, eurMax:50, operators:['Megapul Zadar','Banbus + Auto Trans','Koop Split'],
          note:'Polasci ujutru i uveče, vožnja traje 9 do 12 sati zavisno od linije (preko Siska i Gline ili direktnije).'}
  },
  'Split': {
    bus: {hMin:10, hMax:12, eurMin:38, eurMax:57,
          note:'Vožnja traje ceo dan ili noć; proveri red vožnje.'}
  },
  'Venecija': {
    bus: {hMin:12, hMax:12, eurMin:65, eurMax:70, operators:['Fudeks'],
          note:'Polazak uveče. Autobus staje u Mestreu na kopnu; do Venecije se ide lokalnim prevozom.'}
  },
  'Istanbul': {
    bus: {hMin:13, hMax:15, eurMin:40, eurMax:60,
          note:'Prolazi se granica sa Bugarskom i Turskom, računaj na čekanje na granici.'}
  },
  'Priština': {
    bus: {hMin:5.5, hMax:6.5, eurMin:20, eurMax:25,
          note:'Polasci tokom dana i noću.'}
  },
  'Prizren': {
    bus: {hMin:8, hMax:8, eurMin:25, eurMax:27, operators:['Adio'],
          note:'Dva polaska dnevno: podne i uveče.'}
  },
  'Tirana': {
    bus: {hMin:11.5, hMax:12.5, eurMin:37, eurMax:46, operators:['Adio'],
          note:'Nema direktne linije — ide se preko Prištine.'}
  },
  // ---- Voz ----
  // Bar: Železnički prevoz Crne Gore, sezona 2024 (karta 21 € + 3 € rezervacija).
  'Bar': {
    train: {status:'seasonal', hMin:11, hMax:11, eurMin:24, eurMax:24,
            note:'Dnevni voz sa presedanjem u Bijelom Polju, vozi u letnjoj sezoni (cena iz sezone 2024: karta plus obavezna rezervacija).'}
  },
  // Budimpešta/Beč: nova brza pruga — start saobraćaja se više puta pomerao (N1, Vreme, 021; jul 2026).
  'Budimpešta': {
    bus: {hMin:6, hMax:7, eurMin:24, eurMax:48, operators:['FlixBus','Terra Travel'],
          note:'Više polazaka dnevno; cena zavisi od termina.'},
    train: {status:'planned', hMin:3.5, hMax:3.5,
            note:'Nova brza pruga Beograd–Budimpešta. Početak saobraćaja se više puta pomerao, pa proveri da li vozovi već saobraćaju.'}
  },
  'Beč': {
    train: {status:'planned', hMin:7, hMax:7,
            note:'Planirani red vožnje 2026/27: direktan voz, oko 7 h 15 min. Proveri da li već saobraća.'},
    bus:   {hMin:9, hMax:9, note:'Prema redu vožnje Beogradske autobuske stanice.'}
  }
};

let _transportIndex = null;
function _transportLookup(destRaw){
  if (typeof normalizeSr !== 'function') return null;
  if (!_transportIndex){
    _transportIndex = {};
    Object.keys(TRANSPORT_ROUTES).forEach(k => { _transportIndex[normalizeSr(k)] = k; });
  }
  const key = normalizeSr(String(destRaw || '').split(',')[0].trim());
  const found = _transportIndex[key];
  return found ? {name: found, route: TRANSPORT_ROUTES[found]} : null;
}

// Podaci važe samo za polazak iz Beograda (prazno polje = Beograd, kao i u ostatku sajta).
function _transportOriginIsBeograd(originRaw){
  if (typeof normalizeSr !== 'function') return false;
  const o = normalizeSr(String(originRaw || '').split(',')[0].trim());
  return o === '' || o === 'beg' || o.indexOf('beograd') === 0;
}

// Da li je destinacija dovoljno blizu da autobus/voz uopšte ima smisla (vazdušna linija od Beograda).
function _transportIsNear(destRaw){
  try {
    const d = iataFor(realArrivalAirportFor(destRaw));
    if (!d || typeof AIRPORT_COORDS === 'undefined' || !AIRPORT_COORDS[d] || !AIRPORT_COORDS.BEG) return false;
    return haversineKm(AIRPORT_COORDS.BEG, AIRPORT_COORDS[d]) <= TRANSPORT_NEAR_KM;
  } catch (e){ return false; }
}

// Tekst iz locales ako postoji za aktivni jezik, inače srpski tekst iz ovog fajla.
function _tt(key, fallback, vars){
  let s = fallback;
  try {
    const lang = getLang();
    if (typeof I18N !== 'undefined' && I18N[lang] && I18N[lang][key] != null) s = I18N[lang][key];
  } catch (e){}
  return s.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined) ? vars[k] : m);
}

function _tcNum(n){ return Number.isInteger(n) ? String(n) : String(n).replace('.', ','); }
function _tcHours(a, b){
  return a === b ? _tt('transport_about', 'oko {x}', {x: _tcNum(a) + ' h'}) : _tcNum(a) + '–' + _tcNum(b) + ' h';
}
function _tcMoney(a, b){
  const rsd = (typeof currentCurrency !== 'undefined' && currentCurrency === 'RSD' && typeof RSD_PER_EUR !== 'undefined');
  if (rsd){
    const f = n => Math.round(n * RSD_PER_EUR).toLocaleString('sr-RS');
    return b > a ? f(a) + '–' + f(b) + ' RSD' : f(a) + ' RSD';
  }
  const f = n => n.toLocaleString('de-DE');
  return '€' + f(a) + (b > a ? '–' + f(b) : '');
}

function _tcStatusHtml(status){
  if (status === 'seasonal') return '<span class="tc-status">' + escapeHtml(_tt('transport_status_seasonal', 'Sezonska linija')) + '</span>';
  if (status === 'planned') return '<span class="tc-status is-planned">' + escapeHtml(_tt('transport_status_planned', 'Nova linija — proveri da li saobraća')) + '</span>';
  return '';
}

function _tcRowHtml(kind, m, adults){
  const label = kind === 'bus' ? '🚌 ' + _tt('transport_bus', 'Autobus') : '🚆 ' + _tt('transport_train', 'Voz');
  const hasPrice = typeof m.eurMin === 'number' && typeof m.eurMax === 'number';
  const n = Math.max(1, Number(adults) || 1);
  const figs =
    '<div class="tc-fig"><span class="tc-lab">' + escapeHtml(_tt('transport_duration', 'Trajanje')) + '</span><b>' + escapeHtml(_tcHours(m.hMin, m.hMax)) + '</b></div>' +
    (hasPrice ? '<div class="tc-fig"><span class="tc-lab">' + escapeHtml(_tt('transport_price_pp', 'Cena po osobi, jedan pravac')) + '</span><b>' + escapeHtml(_tcMoney(m.eurMin, m.eurMax)) + '</b></div>' : '');
  const meta = [];
  if (m.operators && m.operators.length) meta.push(escapeHtml(_tt('transport_operators', 'Prevoznici: {list}', {list: m.operators.join(', ')})));
  if (m.note) meta.push(escapeHtml(m.note));
  const group = hasPrice
    ? '<div class="tc-group">' + escapeHtml(_tt('transport_group_rt', '{n} {pax}, povratno: oko {amount}', {
        n: n, pax: (typeof passengerLabel === 'function' ? passengerLabel(n) : ''), amount: _tcMoney(m.eurMin * n * 2, m.eurMax * n * 2)
      })) + '</div>'
    : '';
  return '<div class="tc-row tc-' + kind + '">' +
    '<div class="tc-mode">' + escapeHtml(label) + (kind === 'train' ? _tcStatusHtml(m.status) : '') + '</div>' +
    '<div class="tc-figs">' + figs + '</div>' +
    (meta.length ? '<div class="tc-meta">' + meta.join('<br>') + '</div>' : '') +
    group + '</div>';
}

function _tcCtaHtml(){
  return '<a class="tc-cta" href="' + TRANSPORT_PARTNER_URL + '" target="_blank" rel="noopener">' +
    escapeHtml(_tt('transport_cta', 'Uporedi na Omio-u')) + ' →</a>';
}
// Zvanični red vožnje i prodaja karata za polaske iz Beograda (Beogradska autobuska stanica).
function _tcBasLinkHtml(){
  return '<a href="https://www.bas.rs/sr/autobuske-karte" target="_blank" rel="noopener" style="display:block;margin-top:12px;text-align:center;font-size:15px;color:var(--deep);text-decoration:underline;">' +
    escapeHtml(_tt('transport_bas_link', 'Red vožnje i karte na sajtu BAS-a')) + '</a>';
}
function _tcFootHtml(){
  return '<div class="tc-foot">' + escapeHtml(_tt('transport_disclaimer',
    'Okvirne vrednosti iz javno dostupnih izvora (provereno: {date}), ne stvarna ponuda prevoznika. Red vožnje i cene se menjaju — proveri pre kupovine.',
    {date: _tt('transport_checked_date', TRANSPORT_DATA_CHECKED)})) + '</div>';
}

// ---------- AUTO: geokodiranje + ruta (async, sa kešom) ----------
const _tcGeoCache = new Map(), _tcRouteCache = new Map();
async function _tcFetchJson(url, ms){
  const ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), ms || 7000) : null;
  try {
    const res = await fetch(url, ctl ? {signal: ctl.signal} : undefined);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally { if (timer) clearTimeout(timer); }
}
function _tcGeocode(nameRaw){
  const name = String(nameRaw || '').split(',')[0].trim();
  if (!name) return Promise.resolve(null);
  const key = normalizeSr(name);
  if (_tcGeoCache.has(key)) return _tcGeoCache.get(key);
  const job = (async () => {
    let ref = null;
    try { const i = iataFor(realArrivalAirportFor(name)); if (i && AIRPORT_COORDS[i]) ref = AIRPORT_COORDS[i]; } catch (e){}
    // Ako je ime prepoznato (isti spisak koji koristi cena leta), koordinate
    // aerodroma su uređivački provereno TAČNE — koristimo ih direktno, bez
    // Open-Meteo pretrage. Razlog: Open-Meteo/GeoNames zna grad samo pod
    // internacionalnim imenom (npr. "Skopje"), pa srpski egzonim ("Skoplje")
    // ume da vrati NULA rezultata i cela auto stavka onda tiho nestane —
    // ovo je bio taj bug. Za slobodno ukucana mesta bez poznatog aerodroma
    // (mali gradovi kao polazište) i dalje se ide na tekstualnu pretragu ispod.
    if (ref) return {lat: ref[0], lon: ref[1]};
    for (const lang of ['&language=sr', '&language=en', '']){
      let data;
      try { data = await _tcFetchJson('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(name) + '&count=10' + lang + '&format=json'); }
      catch (e){ continue; }
      let results = (data && data.results) || [];
      if (!results.length) continue;
      const best = pickBestLocationMatch(results, name);
      if (best) return {lat: best.latitude, lon: best.longitude};
    }
    return null;
  })();
  _tcGeoCache.set(key, job);
  job.then(v => { if (!v) _tcGeoCache.delete(key); });
  return job;
}
// Vraća {km, min, approx} ili null (nema rute / previše daleko).
function _tcRoute(fromRaw, toRaw){
  const key = normalizeSr(String(fromRaw).split(',')[0]) + '>' + normalizeSr(String(toRaw).split(',')[0]);
  if (_tcRouteCache.has(key)) return _tcRouteCache.get(key);
  const job = (async () => {
    const [a, b] = await Promise.all([_tcGeocode(fromRaw), _tcGeocode(toRaw)]);
    if (!a || !b) return null;
    const air = haversineKm([a.lat, a.lon], [b.lat, b.lon]);
    if (air < 3) return null;
    try {
      // overview=full&geometries=geojson — ista OSRM ruta kao pre, samo tražimo
      // i geometriju (niz [lon,lat] tačaka celog puta) da bismo je iscrtali na
      // mapi (vidi _tcMapHtml/_tcDrawMap niže). Bez ovoga imali bismo samo
      // brojeve (km/min), što je dovoljno za cenu, ali ne i za prikaz linije.
      const data = await _tcFetchJson(TRANSPORT_ROUTING_URL + a.lon + ',' + a.lat + ';' + b.lon + ',' + b.lat + '?overview=full&geometries=geojson&alternatives=false&steps=false', 8000);
      if (data && data.code === 'Ok' && data.routes && data.routes[0]){
        const km = data.routes[0].distance / 1000, min = data.routes[0].duration / 60;
        if (km > TRANSPORT_CAR_MAX_KM) return null;
        const coords = (data.routes[0].geometry && data.routes[0].geometry.coordinates) || [];
        // OSRM vraća [lon,lat] — Leaflet očekuje [lat,lon], okrećemo ovde jednom.
        const path = coords.map(c => [c[1], c[0]]);
        return {km, min, approx:false, path, from:[a.lat, a.lon], to:[b.lat, b.lon]};
      }
      if (data && data.code === 'NoRoute') return null; // npr. ostrvo — nema kopnene veze
    } catch (e){ /* mreža/CORS/ograničenje servisa → procena ispod */ }
    const km = air * TRANSPORT_AIR_TO_ROAD;
    if (km > TRANSPORT_CAR_MAX_KM) return null;
    return {km, min: km / TRANSPORT_AVG_KMH * 60, approx:true, path:[[a.lat, a.lon], [b.lat, b.lon]], from:[a.lat, a.lon], to:[b.lat, b.lon]};
  })();
  _tcRouteCache.set(key, job);
  return job;
}
function _tcDur(min){
  const h = Math.floor(min / 60), m = Math.round(min % 60 / 5) * 5;
  const hh = m === 60 ? h + 1 : h, mm = m === 60 ? 0 : m;
  return hh + ' h' + (mm ? ' ' + mm + ' min' : '');
}

function _tcCarPlaceholder(fromName, toName, adults){
  return '<div class="tc-row tc-car" data-pending="1" data-from="' + escapeHtml(fromName) + '" data-to="' + escapeHtml(toName) + '" data-adults="' + escapeHtml(String(adults)) + '">' +
    '<div class="tc-mode">🚗 ' + escapeHtml(_tt('transport_car', 'Auto')) + '</div>' +
    '<div class="tc-meta" style="margin-top:0">' + escapeHtml(_tt('transport_car_loading', 'Računam rutu…')) + '</div></div>';
}
async function _tcHydrate(el){
  if (!el || el.dataset.pending !== '1') return;
  el.dataset.pending = '0';
  const card = el.closest('.transport-card');
  const fail = () => {
    el.remove();
    // Ako nema ni autobusa ni voza, a auto ne može (nepoznato mesto, ostrvo, previše daleko) — nema šta da se prikaže.
    if (card && !card.querySelector('.tc-bus, .tc-train')) card.remove();
  };
  let r = null;
  try { r = await _tcRoute(el.dataset.from, el.dataset.to); } catch (e){ r = null; }
  if (!r) return fail();
  const n = Math.max(1, Number(el.dataset.adults) || 1);
  const cars = Math.ceil(n / TRANSPORT_CAR_SEATS);
  const fLo = r.km * TRANSPORT_CONSUMPTION_L_100[0] / 100 * TRANSPORT_FUEL_EUR_PER_L;
  const fHi = r.km * TRANSPORT_CONSUMPTION_L_100[1] / 100 * TRANSPORT_FUEL_EUR_PER_L;
  const approx = r.approx ? _tt('transport_about', 'oko {x}', {x: ''}).trim() + ' ' : '';
  const km = Math.round(r.km / 5) * 5;
  const figs =
    '<div class="tc-fig"><span class="tc-lab">' + escapeHtml(_tt('transport_car_dist', 'Razdaljina')) + '</span><b>' + escapeHtml(approx + km + ' km') + '</b></div>' +
    '<div class="tc-fig"><span class="tc-lab">' + escapeHtml(_tt('transport_car_time', 'Vožnja')) + '</span><b>' + escapeHtml(approx + _tcDur(r.min)) + '</b></div>' +
    '<div class="tc-fig"><span class="tc-lab">' + escapeHtml(_tt('transport_car_fuel', 'Gorivo, jedan pravac')) + '</span><b>' + escapeHtml(_tcMoney(Math.round(fLo), Math.round(fHi))) + '</b></div>';
  const rtLo = fLo * 2 * cars, rtHi = fHi * 2 * cars;
  const what = cars > 1 ? tfLocal('transport_car_cars', '{n} vozila', {n: cars}) : _tt('transport_car_one', 'ceo auto');
  let extra = '<div class="tc-group">' + escapeHtml(_tt('transport_car_rt', 'Povratno, {what}: oko {amount}', {what: what, amount: _tcMoney(Math.round(rtLo), Math.round(rtHi))})) + '</div>';
  if (n > 1) extra += '<div class="tc-group">' + escapeHtml(_tt('transport_car_pp', 'Po osobi, povratno: oko {amount}', {amount: _tcMoney(Math.round(rtLo / n), Math.round(rtHi / n))})) + '</div>';
  const notes = [_tt('transport_car_note', 'Vreme vožnje je bez zadržavanja na granicama i pauza. Putarine nisu uračunate — zavise od zemalja na ruti.')];
  if (r.approx) notes.unshift(_tt('transport_car_approx', 'Procena po vazdušnoj liniji (ruta trenutno nije dostupna).'));
  const mapId = 'tcMap' + Math.random().toString(36).slice(2, 9);
  el.innerHTML = '<div class="tc-mode">🚗 ' + escapeHtml(_tt('transport_car', 'Auto')) + '</div>' +
    '<div id="' + mapId + '" class="tc-map" aria-hidden="true"></div>' +
    '<div class="tc-figs">' + figs + '</div>' +
    '<div class="tc-meta">' + notes.map(escapeHtml).join('<br>') + '</div>' + extra;
  _tcDrawMap(mapId, r);
}
// Iscrtava rutu preko Leaflet-a (OSM tajlovi, bez ključa). Ako Leaflet nije
// učitan (CDN blokiran, offline...) samo uklonimo prazan kontejner — brojevi
// (km/vreme/gorivo) i dalje rade nezavisno od ovoga.
function _tcDrawMap(mapId, r){
  try {
    if (typeof L === 'undefined' || !r.path || r.path.length < 2) {
      const box = document.getElementById(mapId);
      if (box) box.remove();
      return;
    }
    requestAnimationFrame(() => {
      const box = document.getElementById(mapId);
      if (!box) return;
      const map = L.map(mapId, {zoomControl:false, dragging:false, scrollWheelZoom:false, doubleClickZoom:false, boxZoom:false, keyboard:false, tap:false});
      // OSM tajlovi zahtevaju vidljivu atribuciju — ostaje uključena (samo je stilizujemo sitnije, vidi styles.css .tc-map).
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom:18, attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
      }).addTo(map);
      const lineStyle = r.approx ? {color:'#C9A45C', weight:3, dashArray:'6,7'} : {color:'#C9A45C', weight:4};
      const line = L.polyline(r.path, lineStyle).addTo(map);
      const dot = (latlng) => L.circleMarker(latlng, {radius:6, color:'#fff', weight:2, fillColor:'#3A2E5C', fillOpacity:1});
      dot(r.from).addTo(map);
      dot(r.to).addTo(map);
      map.invalidateSize();
      map.fitBounds(line.getBounds(), {padding:[18, 18]});
    });
  } catch (e){ /* mapa je samo ilustracija — greška ovde ne sme da obori figure/cenu iznad */ }
}
function tfLocal(key, fallback, vars){ return _tt(key, fallback, vars); }
function _tcHydrateAll(){
  document.querySelectorAll('.tc-car[data-pending="1"]').forEach(_tcHydrate);
}
// Kartica se ubacuje u DOM iz app.js (innerHTML) — osmatramo DOM i dopunjavamo red za auto.
if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined'){
  new MutationObserver(() => { if (document.querySelector('.tc-car[data-pending="1"]')) _tcHydrateAll(); })
    .observe(document.documentElement, {childList:true, subtree:true});
}

// Velika kartica ispod ponuda (obična pretraga). Prikazuje se samo kad let NIJE izabran.
// Red za AUTO važi za bilo koja dva mesta; autobus/voz samo za polazak iz Beograda (ručna baza).
// ---- Privremeni prekidač: bus/voz sekcija je ostala u kodu (TRANSPORT_ROUTES,
// _tcRowHtml, _tcBasLinkHtml...) radi lakšeg vraćanja kasnije, ali se trenutno
// NE prikazuje — samo AUTO red (na zahtev: "za sada ukloni bus i voz, samo auto"). ----
const TRANSPORT_SHOW_BUS_TRAIN = false;

function transportCardHtml(destRaw, adults, originRaw, flags){
  try {
    // Ko je označio let (avion), auto/bus/voz ga ne zanimaju.
    if (flags && flags.flight) return '';
    const dest = String(destRaw || '').trim();
    if (!dest) return '';
    const fromBg = _transportOriginIsBeograd(originRaw);
    const fromName = String(originRaw || '').trim() || 'Beograd';
    const fromCity = cityLabel(fromName.split(',')[0].trim());
    const destCity = cityLabel(dest.split(',')[0].trim());
    const hit = (TRANSPORT_SHOW_BUS_TRAIN && fromBg) ? _transportLookup(dest) : null;
    const rows = [];
    if (hit && hit.route.bus) rows.push(_tcRowHtml('bus', hit.route.bus, adults));
    if (hit && hit.route.train) rows.push(_tcRowHtml('train', hit.route.train, adults));
    rows.push(_tcCarPlaceholder(fromName, dest, adults));
    if (TRANSPORT_SHOW_BUS_TRAIN && !hit){
      const key = fromBg ? 'transport_no_bus_data' : 'transport_bus_only_bg';
      const txt = fromBg
        ? 'Za autobus i voz na ovoj ruti još nemamo unete podatke.'
        : 'Podaci o autobusu i vozu trenutno postoje samo za polazak iz Beograda.';
      rows.push('<div class="tc-row"><div class="tc-meta" style="margin-top:0">' + escapeHtml(_tt(key, txt)) + '</div></div>');
    }
    return '<section class="transport-card">' +
      '<div class="tc-head"><span class="tc-ico" aria-hidden="true">🚗</span><div>' +
      '<h3>' + escapeHtml(_tt('transport_title_car', '{from} → {dest}', {from: fromCity, dest: destCity})) + '</h3>' +
      '<p class="tc-sub">' + escapeHtml(_tt('transport_sub_car', 'Auto — okvirna procena vožnje')) + '</p>' +
      '</div></div>' + rows.join('') + (hit && hit.route.bus ? _tcCtaHtml() + _tcBasLinkHtml() : '') + _tcFootHtml() + '</section>';
  } catch (e){
    console.warn('[sklopi] transport kartica nije iscrtana:', e);
    return '';
  }
}

// Kratak blok za kartice predloga ("Pronađi svoj izlet", polazak je uvek Beograd).
// Vraća '' ako destinacije nema u bazi — pozivač tada koristi stariju napomenu.
function transportCompactHtml(destRaw, adults){
  try {
    if (!TRANSPORT_SHOW_BUS_TRAIN) return ''; // isključeno za sada — nema auto varijantu ovog kratkog bloka
    const hit = _transportLookup(destRaw);
    if (!hit) return '';
    const parts = [];
    const one = (kind, m) => {
      const label = kind === 'bus' ? _tt('transport_bus', 'Autobus') : _tt('transport_train', 'Voz');
      const price = (typeof m.eurMin === 'number' && typeof m.eurMax === 'number')
        ? ', ' + _tcMoney(m.eurMin, m.eurMax) + ' ' + _tt('transport_pp_short', 'po osobi')
        : '';
      const st = kind === 'train' && m.status === 'planned' ? ' (' + _tt('transport_status_planned_short', 'nova linija, proveri') + ')'
               : kind === 'train' && m.status === 'seasonal' ? ' (' + _tt('transport_status_seasonal_short', 'sezonski') + ')' : '';
      parts.push('<div class="tc-line"><b>' + escapeHtml(label) + ':</b> ' + escapeHtml(_tcHours(m.hMin, m.hMax) + price + st) + '</div>');
    };
    if (hit.route.bus) one('bus', hit.route.bus);
    if (hit.route.train) one('train', hit.route.train);
    return '<div class="alt-airport-box tc-compact" style="margin:0 0 14px;">🚌 <b>' +
      escapeHtml(_tt('transport_compact_title', 'A bez aviona?')) + '</b>' + parts.join('') +
      '<div class="tc-line tc-compact-foot">' + escapeHtml(_tt('transport_compact_foot', 'Okvirno, iz Beograda. Proveri red vožnje i cene pre kupovine.')) + '</div></div>';
  } catch (e){
    return '';
  }
}
