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
    {date: TRANSPORT_DATA_CHECKED})) + '</div>';
}

// Velika kartica ispod ponuda (obična pretraga). Vraća '' kad nema šta pošteno da se kaže.
function transportCardHtml(destRaw, adults, originRaw, flags){
  try {
    // Ko je označio let (avion), autobus i voz ga ne zanimaju — kartica se prikazuje
    // samo kad let NIJE izabran (flags.flight === false).
    if (flags && flags.flight) return '';
    if (!_transportOriginIsBeograd(originRaw)) return '';
    const hit = _transportLookup(destRaw);
    const city = cityLabel(String(destRaw || '').split(',')[0].trim());
    if (!hit){
      if (!_transportIsNear(destRaw)) return '';
      return '<section class="transport-card tc-empty">' +
        '<div class="tc-head"><span class="tc-ico" aria-hidden="true">🚌</span><div>' +
        '<h3>' + escapeHtml(_tt('transport_no_data_title', 'Autobusom ili vozom?')) + '</h3>' +
        '<p class="tc-sub">' + escapeHtml(_tt('transport_no_data', 'Za rutu Beograd–{dest} još nemamo unete podatke o autobusu i vozu. Uporedi trajanje i cene pre nego što odlučiš.', {dest: city})) + '</p>' +
        '</div></div>' + _tcCtaHtml() + _tcFootHtml() + '</section>';
    }
    const rows = [];
    if (hit.route.bus) rows.push(_tcRowHtml('bus', hit.route.bus, adults));
    if (hit.route.train) rows.push(_tcRowHtml('train', hit.route.train, adults));
    return '<section class="transport-card">' +
      '<div class="tc-head"><span class="tc-ico" aria-hidden="true">🚌</span><div>' +
      '<h3>' + escapeHtml(_tt('transport_title', 'Bez aviona: Beograd → {dest}', {dest: city})) + '</h3>' +
      '<p class="tc-sub">' + escapeHtml(_tt('transport_sub', 'Autobusom ili vozom, okvirno, za polazak iz Beograda')) + '</p>' +
      '</div></div>' + rows.join('') + _tcCtaHtml() + (hit.route.bus ? _tcBasLinkHtml() : '') + _tcFootHtml() + '</section>';
  } catch (e){
    console.warn('[sklopi] transport kartica nije iscrtana:', e);
    return '';
  }
}

// Kratak blok za kartice predloga ("Pronađi svoj izlet", polazak je uvek Beograd).
// Vraća '' ako destinacije nema u bazi — pozivač tada koristi stariju napomenu.
function transportCompactHtml(destRaw, adults){
  try {
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
