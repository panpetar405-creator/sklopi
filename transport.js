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
   2) transportCardHtml(dest, adults, origin) — velika kartica ispod
      ponuda na običnoj pretrazi.
   3) transportCompactHtml(dest, adults) — kratak blok za kartice
      predloga u "Pronađi svoj izlet".

   VAŽNO O PODACIMA
   - Sve su ILUSTRATIVNE procene iz javno dostupnih izvora, ne uživo
     podatak prevoznika. Autobus: agregatori karata (Obilet, Omio) za
     polazak sa BAS-a (Novi Beograd). Voz: štampa (Vreme, N1, 021) i
     saopštenja prevoznika. Datum provere: TRANSPORT_DATA_CHECKED.
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
  // Autobus: Obilet/Omio (polasci sa BAS-a, većinom uveče, dolazak ujutru).
  'Budva': {
    bus: {hMin:10, hMax:12, eurMin:30, eurMax:40,
          operators:['Lasta','Trans Jug','Niš ekspres'],
          note:'Većina polazaka je uveče, dolazak ujutru.'}
  },
  // Autobus: Obilet (prosek oko 10 h, dnevni i noćni polasci).
  'Sarajevo': {
    bus: {hMin:9, hMax:10, eurMin:25, eurMax:46,
          note:'Cena zavisi od prevoznika i polaska; ima i noćnih polazaka.'}
  },
  // Voz: Železnički prevoz Crne Gore, sezona 2024 (karta 21 € + 3 € rezervacija).
  'Bar': {
    train: {status:'seasonal', hMin:11, hMax:11, eurMin:24, eurMax:24,
            note:'Dnevni voz sa presedanjem u Bijelom Polju, vozi u letnjoj sezoni (cena iz sezone 2024: karta plus obavezna rezervacija).'}
  },
  // Voz: nova brza pruga — start saobraćaja se više puta pomerao (N1, Vreme, 021; jul 2026).
  'Budimpešta': {
    train: {status:'planned', hMin:3.5, hMax:3.5,
            note:'Nova brza pruga Beograd–Budimpešta. Početak saobraćaja se više puta pomerao, pa proveri da li vozovi već saobraćaju.'}
  },
  // Voz: planirani red vožnje 2026/27 (EC Avala, EC Ivo Andrić); autobus prema redu vožnje BAS-a.
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
function _tcFootHtml(){
  return '<div class="tc-foot">' + escapeHtml(_tt('transport_disclaimer',
    'Okvirne vrednosti iz javno dostupnih izvora (provereno: {date}), ne stvarna ponuda prevoznika. Red vožnje i cene se menjaju — proveri pre kupovine.',
    {date: TRANSPORT_DATA_CHECKED})) + '</div>';
}

// Velika kartica ispod ponuda (obična pretraga). Vraća '' kad nema šta pošteno da se kaže.
function transportCardHtml(destRaw, adults, originRaw){
  try {
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
      '</div></div>' + rows.join('') + _tcCtaHtml() + _tcFootHtml() + '</section>';
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
