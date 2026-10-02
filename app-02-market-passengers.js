/* app-02-market-passengers.js — deo nekadašnjeg app.js (deo 2/11): Dnevna fluktuacija cene, broj putnika, IATA kodovi.
   Klasična skripta: deli globalni opseg sa ostalim app-*.js fajlovima; redosled učitavanja u index.html je bitan. */
/* ==========================================================
   DNEVNA FLUKTUACIJA CENE ("tržišni faktor")
   Ranije je ilustrativna cena bila FIKSNA funkcija (grad+noći+putnici) —
   nikad se nije menjala tokom vremena, pa "Javi mi kad padne cena" nije
   fizički mogao nikad da se ispuni. Ovaj faktor dodaje determinističku
   ali dnevno promenljivu varijaciju (±12%), istu za sve koji tog dana
   gledaju isti grad, nezavisnu od glavnog rng niza (ne pomera redosled
   ostalih random poziva). Isti algoritam se koristi i na serveru
   (Supabase Edge Function) da bi se alert mogao stvarno proveravati.
========================================================== */
function marketFactor(dest, dateStr){
  const f = seededRandom(hashSeed('mkt|' + dest.toLowerCase() + '|' + dateStr));
  return 0.88 + f() * 0.24;
}

/* Sezonski množilac po DATUMU POLASKA (ne po današnjem datumu, kao
   marketFactor koji je dnevna fluktuacija). Za destinacije iz
   MATCH_DESTINATIONS koristi njihove već označene najbolje mesece
   (months) i tip (vibes): u sezoni 1.0, morske destinacije u julu/avgustu
   1.22 i u junu/septembru 1.08, mesec do sezone 0.92, van sezone 0.82
   (ne-morske se mešaju 50/50 sa opštom krivom, vidi dole).
   Ostale destinacije dobijaju opštu evropsku krivu. Novogodišnji period
   (20. dec – 3. jan) dodaje 15%. Primenjuje se na let, smeštaj i auto —
   ne na gorivo/putarine/dodatke. NE zove rng(). Prazan/neispravan
   datum → 1 (staro ponašanje). */
const GENERIC_SEASON_BY_MONTH = [0.88,0.86,0.90,0.97,1.00,1.08,1.20,1.22,1.05,0.97,0.88,0.95];
function seasonFactor(destRaw, fromStr){
  const m = Number(String(fromStr || '').slice(5, 7));
  const d = Number(String(fromStr || '').slice(8, 10)) || 1;
  if (!(m >= 1 && m <= 12)) return 1;
  const key = normalizeSr(String(destRaw || '').split(',')[0].trim());
  const tag = (typeof MATCH_DESTINATIONS !== 'undefined')
    ? MATCH_DESTINATIONS.find(x => normalizeSr(x.name) === key) : null;
  let f;
  if (tag){
    const prev = m === 1 ? 12 : m - 1, next = m === 12 ? 1 : m + 1;
    const sea = tag.vibes.includes('sea');
    if (tag.months.includes(m)) f = sea && (m === 7 || m === 8) ? 1.22 : sea && (m === 6 || m === 9) ? 1.08 : 1.0;
    else if (tag.months.includes(prev) || tag.months.includes(next)) f = 0.92;
    else f = 0.82;
    // "months" je najbolja sezona po vremenu/doživljaju, a ne po potražnji:
    // gradovi (i sve što nije morsko) imaju cene leta koje ipak rastu leti
    // i oko praznika. Zato za ne-morske destinacije mešamo tag sa opštom
    // krivom (50/50), a čisto tagovanje važi samo za morske.
    if (!sea) f = 0.5 * f + 0.5 * GENERIC_SEASON_BY_MONTH[m - 1];
  } else {
    f = GENERIC_SEASON_BY_MONTH[m - 1];
  }
  if ((m === 12 && d >= 20) || (m === 1 && d <= 3)) f *= 1.15;
  return Math.round(f * 100) / 100;
}
function todayStr(){
  return new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
}
function nightsBetween(a,b){
  const ms = new Date(b) - new Date(a);
  return Math.max(1, Math.round(ms / 86400000));
}
function fmtDate(iso){
  const d = new Date(iso);
  const lang = getLang();
  if (lang === 'sr') return d.getDate() + '. ' + d.toLocaleString('sr-Latn', {month:'long'});
  const m = langMeta(lang);
  return d.toLocaleString(m.locale, {day:'numeric', month: m.dateMonth || 'long'});
}
function passengerLabel(adults){
  const n = String(adults);
  return n === '1' ? t('passenger') : t('passengers');
}

/* ---- Kalendar za izbor datuma u "ticket" pretrazi (stub "Od — Do") ---- */
// Open-Meteo geokodiranje ne sortira rezultate po značaju grada, pa "Milano"
// ume da vrati malo selo u Peruu pre Milana u Italiji. Ovde biramo najbolje
// poklapanje: prvo tačan naziv (case-insensitive), pa najveći broj stanovnika,
// pa gradove/prestonice (feature_code) pre manjih naselja.
// (globalna funkcija — koriste je i vremenska prognoza (wx.geocode) i predlozi
// gradova u poljima Polazak/Destinacija (fetchLocationSuggestions), pa mora
// biti van svih IIFE-ova da bi bila vidljiva na oba mesta.)
function rankLocationMatches(results, query){
  const q = query.trim().toLowerCase();
  const featureRank = {PPLC:0, PPLA:1, PPLA2:2, PPL:3}; // prestonica > regionalni centar > selo
  const scored = results.map(r => {
    const exact = r.name.trim().toLowerCase() === q ? 0 : 1;
    const feat = featureRank[r.feature_code] ?? 4;
    const pop = r.population || 0;
    return {r, exact, feat, pop};
  });
  scored.sort((a, b) => {
    if (a.exact !== b.exact) return a.exact - b.exact;
    if (a.feat !== b.feat) return a.feat - b.feat;
    return b.pop - a.pop; // veći grad prvo
  });
  return scored.map(s => s.r);
}
function pickBestLocationMatch(results, query){
  return rankLocationMatches(results, query)[0];
}

(function(){
  const displayBtn = document.getElementById('dateDisplayBtn');
  const rangeText = document.getElementById('dateDisplayText');
  const nightsText = document.getElementById('dateNightsText');
  const hiddenFrom = document.getElementById('dateFrom');
  const hiddenTo = document.getElementById('dateTo');
  const calCard = document.getElementById('calCard');
  const calBackdrop = document.getElementById('calBackdrop');
  const calMonths = document.getElementById('calMonths');
  const calGrids = document.getElementById('calGrids');
  const calRangeLabel = document.getElementById('calRangeLabel');
  const prevBtn = document.getElementById('calPrev');
  const nextBtn = document.getElementById('calNext');
  const applyBtn = document.getElementById('calApply');
  if (!displayBtn || !calCard) return;

  const DAY_NAMES = ['Pon','Uto','Sre','Čet','Pet','Sub','Ned'];
  const today = new Date(); today.setHours(0,0,0,0);

  // Podrazumevani datumi su RELATIVNI na današnji dan (polazak za 14 dana,
  // 4 noći) — ranije su u HTML-u bili tvrdo zadati (2026-10-01/05), pa bi
  // posle tog datuma svaka nova pretraga tražila ručni izbor datuma.
  // Polja su skrivena i pri svakom učitavanju kreću iz HTML default-a, pa
  // ovde uvek postavljamo svež default (izbor korisnika se čuva tek posle
  // učitavanja — kalendar i učitavanje sačuvanog izleta ih posle menjaju).
  (function setRelativeDefaultDates(){
    const isoLocal = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 18);
    hiddenFrom.value = isoLocal(start);
    hiddenTo.value = isoLocal(end);
  })();

  function parseISODate(iso){
    const [y,m,d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function toISODate(d){
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function fmtShort(d){
    return d.getDate() + '. ' + d.toLocaleString('sr-Latn', {month:'short'}).replace('.', '');
  }
  // Pun, čitljiv opis datuma za screen reader (aria-label na svakom danu) —
  // npr. "17. oktobar 2026, subota".
  function fmtFullLabel(d){
    const s = d.toLocaleString('sr-Latn', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function sameDay(a,b){ return !!a && !!b && a.getTime() === b.getTime(); }
  function nightsCount(a,b){ return Math.max(1, Math.round((b - a) / 86400000)); }
  function nightsWord(n){ return n === 1 ? t('night') : t('nights'); }

  let selStart = parseISODate(hiddenFrom.value);
  let selEnd = parseISODate(hiddenTo.value);
  let viewYear = selStart.getFullYear();
  let viewMonth = selStart.getMonth();

  /* ---- Vremenska prognoza po danima (Open-Meteo — javno dostupan, besplatan API) ----
     Prava prognoza postoji samo za ~16 dana unapred. Za datume dalje u budućnosti
     ne postoji "tačna" prognoza kod nikog — zato se za njih prikazuje PROCENA na
     osnovu istog perioda prošle godine (arhivski podaci), vizuelno zamućena ikonica,
     da se ne stvori lažan utisak preciznosti. */
  const WMO_ICON = {
    0:'☀️',1:'🌤️',2:'⛅',3:'☁️',
    45:'🌫️',48:'🌫️',
    51:'🌦️',53:'🌦️',55:'🌦️',
    56:'🌧️',57:'🌧️',
    61:'🌧️',63:'🌧️',65:'🌧️',
    66:'🌧️',67:'🌧️',
    71:'🌨️',73:'🌨️',75:'❄️',77:'❄️',
    80:'🌦️',81:'🌧️',82:'⛈️',
    85:'🌨️',86:'🌨️',
    95:'⛈️',96:'⛈️',99:'⛈️'
  };
  function wxIcon(code){ return WMO_ICON[code] || ''; }

  const wx = {
    geoCache: {},
    forecastCache: {}, // key: "lat,lon" -> {iso: {code,tmax,tmin}}
    climateCache: {},  // key: "lat,lon|minISO|maxISO" -> {iso: {code,tmax,tmin}}
    async geocode(city){
      const key = city.trim().toLowerCase();
      if (!key) return {geo:null, networkError:false};
      if (this.geoCache[key]) return {geo:this.geoCache[key], networkError:false};
      // Neki srpski egzonimi (npr. "Skoplje") ne postoje u Open-Meteo geo bazi —
      // ona grad vodi pod međunarodnim nazivom ("Skopje"), pa bi upit sa srpskim
      // nazivom vratio 0 rezultata i prognoza se ne bi prikazala. Zato prvo
      // probamo prevod iz DEST_EN_NAMES (ista tabela koja se koristi za Viator
      // pretragu), pa tek onda izvorni upisani naziv kao rezervu.
      const rawCity = city.trim().split(',')[0].trim();
      const enName = (typeof DEST_EN_NAMES !== 'undefined' && DEST_EN_NAMES[rawCity]) || null;
      const queries = [];
      const addQuery = (q) => { if (q && !queries.some(x => x.toLowerCase() === q.toLowerCase())) queries.push(q); };
      addQuery(enName);
      addQuery(city);
      // Jezera, planine, nacionalni parkovi i slična turistička mesta (npr.
      // "Skadarsko jezero", "Durmitor", "Plitvička jezera") nisu naseljena
      // mesta i Open-Meteo ih ne vodi u geo bazi — koristimo AIRPORT_DB
      // (ista tabela kao za "najbliži aerodrom") da nađemo najbliži poznat
      // grad i njegovu prognozu prikažemo kao okvirnu.
      if (typeof airportInfoFor === 'function'){
        const info = airportInfoFor(rawCity);
        if (info && !info.hasAirport && info.nearest){
          addQuery((typeof DEST_EN_NAMES !== 'undefined' && DEST_EN_NAMES[info.nearest]) || info.nearest);
        }
      }
      const attempts = [];
      queries.forEach(q => {
        attempts.push(
          {q, url:'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=10&language=sr&format=json'},
          {q, url:'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=10&language=en&format=json'},
          {q, url:'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=10&format=json'}
        );
      });
      let networkError = false;
      for (const {q, url} of attempts){
        try{
          const res = await fetch(url);
          if (!res.ok){ networkError = true; continue; }
          const data = await res.json();
          if (data && data.results && data.results.length){
            const r = pickBestLocationMatch(data.results, q);
            const geo = {lat: Math.round(r.latitude*100)/100, lon: Math.round(r.longitude*100)/100};
            this.geoCache[key] = geo;
            return {geo, networkError:false};
          }
        } catch(err){
          networkError = true;
          console.warn('[sklopi] geokodiranje odredišta nije uspelo:', err.message);
        }
      }
      return {geo:null, networkError};
    },
    async getForecast(geo){
      const key = geo.lat + ',' + geo.lon;
      if (this.forecastCache[key]) return {data:this.forecastCache[key], networkError:false};
      try{
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + geo.lat + '&longitude=' + geo.lon + '&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=16');
        if (!res.ok) return {data:{}, networkError:true};
        const data = await res.json();
        const out = {};
        if (data && data.daily){
          data.daily.time.forEach((iso, i) => {
            out[iso] = {code: data.daily.weathercode[i], tmax: Math.round(data.daily.temperature_2m_max[i]), tmin: Math.round(data.daily.temperature_2m_min[i])};
          });
        }
        this.forecastCache[key] = out;
        return {data:out, networkError:false};
      } catch(err){ console.warn('[sklopi] prognoza nije uspela:', err.message); return {data:{}, networkError:true}; }
    },
    async getClimateRange(geo, minISO, maxISO){
      const key = geo.lat + ',' + geo.lon + '|' + minISO + '|' + maxISO;
      if (this.climateCache[key]) return {data:this.climateCache[key], networkError:false};
      // ista opsega dana, samo godinu unazad — kao osnova za procenu
      const shiftYear = (iso, delta) => { const d = parseISODate(iso); d.setFullYear(d.getFullYear() + delta); return d; };
      const startLastYear = shiftYear(minISO, -1);
      const endLastYear = shiftYear(maxISO, -1);
      const out = {};
      try{
        const res = await fetch('https://archive-api.open-meteo.com/v1/archive?latitude=' + geo.lat + '&longitude=' + geo.lon +
          '&start_date=' + toISODate(startLastYear) + '&end_date=' + toISODate(endLastYear) +
          '&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto');
        if (!res.ok) return {data:{}, networkError:true};
        const data = await res.json();
        if (data && data.daily){
          data.daily.time.forEach((lastYearISO, i) => {
            const d = parseISODate(lastYearISO); d.setFullYear(d.getFullYear() + 1);
            out[toISODate(d)] = {code: data.daily.weathercode[i], tmax: Math.round(data.daily.temperature_2m_max[i]), tmin: Math.round(data.daily.temperature_2m_min[i])};
          });
        }
        this.climateCache[key] = out;
        return {data:out, networkError:false};
      } catch(err){
        console.warn('[sklopi] istorijski podaci nisu uspeli:', err.message);
        return {data:out, networkError:true};
      }
    }
  };

  let wxRequestSeq = 0;
  async function paintWeather(){
    const cells = Array.from(calGrids.querySelectorAll('.cal-day[data-date]:not(.is-disabled)'));
    if (!cells.length) return;
    const destInput = document.getElementById('dest');
    const city = (destInput && destInput.value.trim()) || 'Atina';
    const statusEl = document.getElementById('calWxStatus');
    const setStatus = (msg) => { if (statusEl){ statusEl.textContent = msg; statusEl.style.display = msg ? 'block' : 'none'; } };

    const mySeq = ++wxRequestSeq;
    // odmah skini stare ikonice (mogu biti od prethodne destinacije) da ne ostane pogrešan utisak
    cells.forEach(cell => cell.querySelectorAll('.cal-wx').forEach(n => n.remove()));
    setStatus(tf('weather_looking', {city: city}));

    const {geo, networkError: geoErr} = await wx.geocode(city);
    if (mySeq !== wxRequestSeq) return; // korisnik je u međuvremenu promenio destinaciju — ovaj odgovor je zastareo
    if (!geo){
      setStatus(geoErr
        ? 'Prognoza trenutno nije dostupna — zahtev ka mreži nije uspeo (provera internet konekcije ili pristupa mreži u ovom pregledaču).'
        : 'Nije pronađena lokacija za „' + city + '” — provera pravopisa naziva mesta.');
      return;
    }

    const isoList = cells.map(c => c.dataset.date).sort();
    const minISO = isoList[0], maxISO = isoList[isoList.length - 1];

    const [fRes, cRes] = await Promise.all([
      wx.getForecast(geo),
      wx.getClimateRange(geo, minISO, maxISO)
    ]);
    if (mySeq !== wxRequestSeq) return; // isto — zastareo odgovor, ne crtati preko novijeg stanja
    const forecast = fRes.data, climate = cRes.data;

    let painted = 0;
    cells.forEach(cell => {
      cell.querySelectorAll('.cal-wx').forEach(n => n.remove());
      const iso = cell.dataset.date;
      let rec = forecast[iso];
      let exact = true;
      if (!rec){ rec = climate[iso]; exact = false; }
      if (!rec) return;
      const icon = wxIcon(rec.code);
      if (!icon) return;
      const span = document.createElement('span');
      span.className = 'cal-wx' + (exact ? '' : ' cal-wx-est');
      span.textContent = icon;
      span.title = (exact ? 'Prognoza za ' : 'Procena za ') + iso + ': ' + rec.tmax + '°/' + rec.tmin + '°C' + (exact ? '' : ' (na osnovu iste nedelje prošle godine)');
      cell.appendChild(span);
      painted++;
    });

    if (!painted){
      setStatus((fRes.networkError || cRes.networkError)
        ? 'Prognoza trenutno nije dostupna — zahtev ka mreži nije uspeo (provera internet konekcije ili pristupa mreži u ovom pregledaču).'
        : 'Nema podataka o vremenu za ove datume.');
    } else {
      setStatus('');
    }
  }

  function updateDisplay(){
    const n = nightsCount(selStart, selEnd);
    rangeText.textContent = fmtShort(selStart) + ' – ' + fmtShort(selEnd);
    nightsText.textContent = n + ' ' + nightsWord(n);
    displayBtn.classList.remove('is-empty');
    calRangeLabel.innerHTML = fmtShort(selStart) + ' – ' + fmtShort(selEnd) + ' <b>· ' + n + ' ' + nightsWord(n) + '</b>';
  }

  function commit(){
    hiddenFrom.value = toISODate(selStart);
    hiddenTo.value = toISODate(selEnd);
    hiddenFrom.dispatchEvent(new Event('change', {bubbles:true}));
    hiddenTo.dispatchEvent(new Event('change', {bubbles:true}));
    updateDisplay();
  }

  // Izloženo van IIFE-a — kad neko SPOLJA upiše prave datume direktno u
  // #dateFrom/#dateTo (učitavanje sačuvanog izleta, "Pogledaj detalje"),
  // stub mora da izgubi "is-empty" i pokaže te datume, isti obrazac kao
  // window.syncPaxDisplay za broj putnika. Bez ovoga validacija (koja sad
  // proverava baš tu "is-empty" klasu, ne samo sirovu vrednost polja —
  // videti validateSearchInputs) ne bi prepoznala datume kao izabrane.
  window.syncDateDisplay = function(){
    selStart = parseISODate(hiddenFrom.value);
    selEnd = parseISODate(hiddenTo.value);
    viewYear = selStart.getFullYear();
    viewMonth = selStart.getMonth();
    updateDisplay();
  };

  function buildMonthGrid(year, month, monthLabelText){
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // ponedeljak = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const head = '<div class="cal-grid-head" role="row">' +
      DAY_NAMES.map(d => '<span role="columnheader" aria-hidden="true">' + d + '</span>').join('') +
      '</div>';

    // Skupi sve ćelije (prazan razmak + dani), pa ih iseci na nedelje od po 7
    // radi role="row" (potrebno za role="grid" navigaciju strelicama / SR).
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push('<span class="cal-day is-empty" role="gridcell" aria-hidden="true"></span>');
    for (let day = 1; day <= daysInMonth; day++){
      const d = new Date(year, month, day);
      const iso = toISODate(d);
      const isDisabled = d < today;
      const isToday = sameDay(d, today);
      const isSelected = sameDay(d, selStart) || sameDay(d, selEnd) || (selStart && selEnd && d > selStart && d < selEnd);
      const classes = ['cal-day'];
      if (isDisabled) classes.push('is-disabled');
      if (sameDay(d, selStart)) classes.push('range-start');
      if (sameDay(d, selEnd)) classes.push('range-end');
      if (selStart && selEnd && d > selStart && d < selEnd) classes.push('range-mid');
      if (isToday) classes.push('is-today');
      const label = fmtFullLabel(d) + (isToday ? ', ' + t('aria_today') : '');
      if (isDisabled){
        // Prošli datum — nije klikabilan, pa ostaje neinteraktivan span,
        // ali i dalje sa aria-label/aria-disabled radi screen readera.
        cells.push('<span class="' + classes.join(' ') + '" role="gridcell" aria-disabled="true" aria-label="' + escapeHtml(label) + '">' + day + '</span>');
      } else {
        cells.push('<button type="button" class="' + classes.join(' ') + '" role="gridcell" data-date="' + iso + '" tabindex="-1" aria-selected="' + (isSelected ? 'true' : 'false') + '"' + (isToday ? ' aria-current="date"' : '') + ' aria-label="' + escapeHtml(label) + '">' + day + '</button>');
      }
    }
    while (cells.length % 7 !== 0) cells.push('<span class="cal-day is-empty" role="gridcell" aria-hidden="true"></span>');

    let body = '';
    for (let i = 0; i < cells.length; i += 7){
      body += '<div class="cal-grid-row" role="row">' + cells.slice(i, i + 7).join('') + '</div>';
    }
    body = '<div class="cal-grid-body">' + body + '</div>';

    return '<div class="cal-grid" role="grid" aria-label="' + escapeHtml(monthLabelText) + '">' + head + body + '</div>';
  }

  // Datum koji trenutno "nosi" roving tabindex/fokus u gridu — prati se
  // odvojeno od selStart/selEnd jer se fokus tokom navigacije strelicama
  // može naći na danu koji uopšte nije (još) selektovan.
  let activeDate = null;

  function selectDate(d){
    if (!selStart || (selStart && selEnd)){
      selStart = d; selEnd = null;
    } else if (d < selStart){
      selStart = d;
    } else {
      selEnd = d;
    }
    activeDate = d;
    render();
    if (selStart && selEnd) updateDisplay();
    focusDayButton(d);
  }

  // Fokusira dugme za dati datum AKO je trenutno vidljivo (na mobilnom je
  // drugi mesec u dvomesečnom prikazu sakriven preko CSS-a — display:none
  // elementi se ne mogu fokusirati). Vraća true/false radi fallback logike.
  function focusDayButton(d){
    const btn = calGrids.querySelector('.cal-day[data-date="' + toISODate(d) + '"]');
    if (btn && btn.offsetParent !== null){
      calGrids.querySelectorAll('.cal-day[data-date]').forEach(el => el.setAttribute('tabindex', '-1'));
      btn.setAttribute('tabindex', '0');
      btn.focus();
      return true;
    }
    return false;
  }

  // Posle svakog render()-a DOM se potpuno zameni (innerHTML), pa roving
  // tabindex treba ponovo postaviti na "aktivni" dan (fokus/selekciju),
  // a na sve ostale -1 — inače bi Tab uvek kretao od prvog dana u mesecu.
  function syncRovingTabindex(){
    const pref = activeDate || selStart || today;
    let target = calGrids.querySelector('.cal-day[data-date="' + toISODate(pref) + '"]:not(.is-disabled)');
    if (!target) target = calGrids.querySelector('.cal-day[data-date]:not(.is-disabled)');
    calGrids.querySelectorAll('.cal-day[data-date]').forEach(el => el.setAttribute('tabindex', '-1'));
    if (target) target.setAttribute('tabindex', '0');
  }

  function render(){
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    const monthLabel = (y, m) => {
      const name = new Date(y, m, 1).toLocaleString('sr-Latn', {month:'long'});
      return name.charAt(0).toUpperCase() + name.slice(1) + ' ' + y;
    };
    const label1 = monthLabel(viewYear, viewMonth), label2 = monthLabel(nextY, nextM);
    calMonths.innerHTML = '<span>' + label1 + '</span><span>' + label2 + '</span>';
    calGrids.innerHTML = buildMonthGrid(viewYear, viewMonth, label1) + buildMonthGrid(nextY, nextM, label2);
    calGrids.querySelectorAll('.cal-day:not(.is-empty):not(.is-disabled)').forEach(el => {
      el.addEventListener('click', () => selectDate(parseISODate(el.dataset.date)));
    });
    syncRovingTabindex();
    paintWeather();
    // Sadržaj (broj redova u mreži, prognoza) menja visinu kartice — ako je
    // otvorena na mobilnom, osveži poziciju da i dalje ostane tačno iznad polja.
    if (calCard.classList.contains('open')) positionCalMobile();
  }

  // ---- Pozicioniranje kartice na mobilnom ----
  // Kartica je sad, dok je otvorena, prebačena direktno u <body> (van
  // .ticket-a, van .hero-a) sa punim tamnim overlay-em preko celog ekrana —
  // pravi fullscreen "bottom sheet" modal, a ne više mali dropdown zalepljen
  // uz konkretno polje. Zato više NE računamo visinu prema poziciji polja
  // (to je ranije nepotrebno sažimalo karticu i sekalo mesec/legendu/dugme
  // "Gotovo" van vidljivog dela) — prepuštamo visinu CSS pravilu iz media
  // query-ja (top odmah ispod topbar-a, do skoro dna ekrana), koje već daje
  // maksimalan mogući prostor da ceo mesec stane bez skrolovanja. Ovde samo
  // brišemo eventualne inline stilove koje je ranija verzija postavljala.
  function positionCalMobile(){
    if (!isMobileCal()) return;
    calCard.style.left = '';
    calCard.style.right = '';
    calCard.style.top = '';
    calCard.style.bottom = '';
    calCard.style.maxHeight = '';
  }

  // ---- Navigacija tastaturom po mreži datuma (WAI-ARIA APG "grid" obrazac) ----
  // strelice = dan/nedelja, Home/End = početak/kraj nedelje, PageUp/PageDown =
  // prethodni/sledeći mesec (sa Shift = godina), Enter/Space = izbor datuma.
  const isMobileCal = () => window.matchMedia('(max-width:760px)').matches;

  function isDateInView(d){
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) return true;
    if (isMobileCal()) return false; // drugi mesec je sakriven na mobilnom
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    return d.getFullYear() === nextY && d.getMonth() === nextM;
  }

  function goToDate(d){
    if (d < today) d = new Date(today); // ne dozvoli fokus na onemogućen (prošli) dan
    activeDate = d;
    if (!isDateInView(d)){
      viewYear = d.getFullYear();
      viewMonth = d.getMonth();
      render();
    }
    if (!focusDayButton(d)){
      const fallback = calGrids.querySelector('.cal-day[data-date]:not(.is-disabled)');
      if (fallback){ fallback.setAttribute('tabindex', '0'); fallback.focus(); }
    }
  }

  calGrids.addEventListener('keydown', (e) => {
    const cellBtn = e.target.closest('.cal-day[data-date]');
    if (!cellBtn) return;
    const current = parseISODate(cellBtn.dataset.date);
    let next = null;
    switch (e.key){
      case 'ArrowRight': next = new Date(current); next.setDate(next.getDate() + 1); break;
      case 'ArrowLeft':  next = new Date(current); next.setDate(next.getDate() - 1); break;
      case 'ArrowDown':  next = new Date(current); next.setDate(next.getDate() + 7); break;
      case 'ArrowUp':    next = new Date(current); next.setDate(next.getDate() - 7); break;
      case 'Home': { const dow = (current.getDay() + 6) % 7; next = new Date(current); next.setDate(next.getDate() - dow); break; }
      case 'End':  { const dow = (current.getDay() + 6) % 7; next = new Date(current); next.setDate(next.getDate() + (6 - dow)); break; }
      case 'PageUp':
        next = new Date(current);
        if (e.shiftKey) next.setFullYear(next.getFullYear() - 1); else next.setMonth(next.getMonth() - 1);
        break;
      case 'PageDown':
        next = new Date(current);
        if (e.shiftKey) next.setFullYear(next.getFullYear() + 1); else next.setMonth(next.getMonth() + 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        selectDate(current);
        return;
      default:
        return;
    }
    e.preventDefault();
    goToDate(next);
  });

  let calScrollY = 0;
  let _calScrollLocked = false;
  // Isti uzrok i isto rešenje kao guardOverlayOpen (vidi komentar na vrhu
  // fajla): menjanje body position-a u 'fixed' USRED obrade dodira je
  // drugi (do sada nepopravljeni) razlog zašto je na mobilnom trebalo dva
  // tapa za SVAKU narednu radnju — izbor datuma, X za zatvaranje, Nastavi...
  // Logičko stanje (_calScrollLocked) se ažurira ODMAH da ostatak koda zna
  // je li "zaključano", ali sama promena na <body> se odlaže za sledeći
  // tick, da ne ometa isporuku klika koji je zaključavanje i pokrenuo.
  function lockPageScroll(){
    if (_calScrollLocked) return;
    _calScrollLocked = true;
    calScrollY = window.scrollY;
    setTimeout(() => {
      if (!_calScrollLocked) return; // otključano pre nego što je ovo stiglo
      document.body.style.position = 'fixed';
      document.body.style.top = '-' + calScrollY + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }, 0);
  }
  function unlockPageScroll(){
    _calScrollLocked = false;
    setTimeout(() => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      // behavior:'instant' je NAMERNO eksplicitan — <html> ima globalno
      // scroll-behavior:smooth u CSS-u (styles.css), pa bi obično
      // scrollTo(0, calScrollY) bez ovoga animirano "odleteo" preko celog
      // sajta do sačuvane pozicije umesto da odmah skoči na nju.
      window.scrollTo({top: calScrollY, left: 0, behavior: 'instant'});
    }, 0);
  }

  // .ticket ima backdrop-filter (zbog blur efekta), a to po CSS spec-u
  // pravi NOV containing block za position:fixed potomke — position:fixed
  // se onda ne računa od viewport-a nego od ivice .ticket-a. Zato je kalendar
  // na mobilnom "iskakao" na pogrešno mesto (oko sredine forme, prekrivajući
  // polje za destinaciju) umesto da se otvori tačno iznad polja "Od — Do",
  // sa punim tamnim overlay-em preko celog ekrana. Rešenje: dok je kartica
  // otvorena na mobilnom, privremeno je (i njen backdrop) prebacujemo direktno
  // u <body> — van .ticket-a — gde position:fixed opet radi normalno, prema
  // stvarnom viewport-u. Vraćamo je na originalno mesto pri zatvaranju, da
  // desktop raspored (position:absolute vezan za stub) ostane netaknut.
  let calHomeParent = null, calHomeNext = null;
  let calBackdropHomeParent = null, calBackdropHomeNext = null;
  function detachCalForMobile(){
    if (calCard.parentElement !== document.body){
      calHomeParent = calCard.parentElement;
      calHomeNext = calCard.nextSibling;
      document.body.appendChild(calCard);
    }
    if (calBackdrop && calBackdrop.parentElement !== document.body){
      calBackdropHomeParent = calBackdrop.parentElement;
      calBackdropHomeNext = calBackdrop.nextSibling;
      document.body.appendChild(calBackdrop);
    }
  }
  function reattachCal(){
    if (calHomeParent){
      if (calHomeNext) calHomeParent.insertBefore(calCard, calHomeNext);
      else calHomeParent.appendChild(calCard);
      calHomeParent = null; calHomeNext = null;
    }
    if (calBackdropHomeParent){
      if (calBackdropHomeNext) calBackdropHomeParent.insertBefore(calBackdrop, calBackdropHomeNext);
      else calBackdropHomeParent.appendChild(calBackdrop);
      calBackdropHomeParent = null; calBackdropHomeNext = null;
    }
  }

  function openCal(){
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    activeDate = (selStart && selStart >= today) ? selStart : today;
    render();
    calCard.classList.add('open');
    if (calBackdrop) calBackdrop.classList.add('open');
    displayBtn.setAttribute('aria-expanded', 'true');
    if (isMobileCal()){
      detachCalForMobile(); lockPageScroll(); positionCalMobile();
      guardOverlayOpen('cal', () => closeCal(true));
    }
    // fokus tastature/screen readera ide direktno na selektovani (ili
    // današnji) dan — bez ovoga dijalog se otvara vizuelno, ali korisnik
    // koji ne koristi miša nema signal da se nešto promenilo.
    focusDayButton(activeDate);
  }
  // "Meki" zahtev za zatvaranje (klik na dugme, Escape...) — ako je
  // kartica na mobilnom gurnula unos u historiju, prosleđuje se na
  // "Nazad" da postoji jedan jedini put kojim se zatvara.
  function requestCloseCal(){
    if (!guardOverlayRequestClose('cal')) closeCal(true);
  }
  function closeCal(shouldCommit){
    const wasOpen = calCard.classList.contains('open');
    calCard.classList.remove('open');
    if (calBackdrop) calBackdrop.classList.remove('open');
    displayBtn.setAttribute('aria-expanded', 'false');
    if (_calScrollLocked) unlockPageScroll();
    reattachCal();
    if (shouldCommit && selStart && selEnd){
      commit();
    } else if (!selStart || !selEnd){
      selStart = parseISODate(hiddenFrom.value);
      selEnd = parseISODate(hiddenTo.value);
    }
    // fokus se vraća na dugme koje je otvorilo dijalog — inače se gubi
    // (npr. posle Escape) i tastaturni/SR korisnik "ispadne" iz konteksta.
    if (wasOpen && document.activeElement && calCard.contains(document.activeElement)){
      displayBtn.focus();
    }
  }

  displayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (calCard.classList.contains('open')) requestCloseCal();
    else openCal();
  });
  applyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (selStart && selEnd) requestCloseCal();
  });
  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    viewMonth -= 1;
    if (viewMonth < 0){ viewMonth = 11; viewYear -= 1; }
    render();
  });
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    viewMonth += 1;
    if (viewMonth > 11){ viewMonth = 0; viewYear += 1; }
    render();
  });
  calCard.querySelectorAll('[data-quick]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const base = (selStart && selStart >= today) ? new Date(selStart) : new Date(today);
      let s, en;
      if (btn.dataset.quick === 'weekend'){
        s = new Date(today);
        const offset = (5 - s.getDay() + 7) % 7 || 7;
        s.setDate(s.getDate() + offset);
        en = new Date(s); en.setDate(en.getDate() + 2);
      } else if (btn.dataset.quick === 'week'){
        s = base; en = new Date(s); en.setDate(en.getDate() + 7);
      } else {
        s = base; en = new Date(s); en.setDate(en.getDate() + 14);
      }
      selStart = s; selEnd = en;
      viewYear = s.getFullYear(); viewMonth = s.getMonth();
      render();
      updateDisplay();
    });
  });
  calCard.addEventListener('click', (e) => e.stopPropagation());
  // Focus trap — pošto je calCard role="dialog" aria-modal="true", Tab ne
  // sme da izađe u pozadinski sadržaj dok je kalendar otvoren.
  calCard.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = Array.from(calCard.querySelectorAll('button:not([tabindex="-1"]), [tabindex="0"]'))
      .filter(el => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first){
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last){
      e.preventDefault(); first.focus();
    }
  });

  document.addEventListener('click', () => {
    if (calCard.classList.contains('open')) requestCloseCal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && calCard.classList.contains('open')) requestCloseCal();
  });
  window.addEventListener('resize', () => {
    if (calCard.classList.contains('open')) positionCalMobile();
  });

  const destInputEl = document.getElementById('dest');
  if (destInputEl){
    let destDebounce;
    destInputEl.addEventListener('input', () => {
      clearTimeout(destDebounce);
      destDebounce = setTimeout(() => {
        if (calCard.classList.contains('open')) paintWeather();
      }, 500);
    });
  }

  // Polje "Od — Do" na startu prikazuje crtice (placeholder stanje), a ne
  // unapred izračunat opseg/broj noći iz skrivenih polja — updateDisplay()
  // se zove tek kad korisnik stvarno potvrdi datume (Gotovo / brzi izbor).
})();

/* ==========================================================
   BROJ PUTNIKA — kartica po uzoru na kalendar (umesto native <select>,
   koji je ograničavao izbor na najviše 4 osobe i čiji padajući meni
   nije moguće stilizovati). Vrednost i dalje živi u #adults (sad
   <input type="hidden">, isti obrazac kao #dateFrom/#dateTo), pa sav
   ostatak koda koji čita/piše .value nastavlja da radi bez izmena.
   ========================================================== */
(function(){
  const displayBtn = document.getElementById('paxDisplayBtn');
  const displayText = document.getElementById('paxDisplayText');
  const hiddenField = document.getElementById('adults');
  const paxCard = document.getElementById('paxCard');
  const paxBackdrop = document.getElementById('paxBackdrop');
  const paxList = document.getElementById('paxList');
  const applyBtn = document.getElementById('paxApply');
  if (!displayBtn || !paxCard || !hiddenField || !paxList) return;

  const MAX_ADULTS = 30;

  // Gramatički ispravna množina za "odrasla osoba/odrasla/odraslih" — oblici
  // su u locales (plural.adult), izbor oblika radi pluralWord() preko Intl.PluralRules.
  function paxOptionLabel(n){ return n + ' ' + pluralWord('adult', n); }

  function buildOptions(){
    const keepVal = hiddenField.value;
    paxList.innerHTML = '';
    for (let n = 1; n <= MAX_ADULTS; n++){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pax-option';
      btn.setAttribute('role', 'option');
      btn.dataset.value = String(n);
      btn.textContent = paxOptionLabel(n);
      const isSel = String(n) === keepVal;
      btn.classList.toggle('is-selected', isSel);
      btn.setAttribute('aria-selected', isSel ? 'true' : 'false');
      btn.addEventListener('click', (e) => { e.stopPropagation(); selectPax(n); });
      paxList.appendChild(btn);
    }
  }

  function updateDisplay(){
    const val = hiddenField.value;
    if (!val){
      displayText.textContent = t('placeholder_passengers');
      displayBtn.classList.add('is-empty');
    } else {
      displayText.textContent = paxOptionLabel(Number(val));
      displayBtn.classList.remove('is-empty');
    }
  }
  // Izloženo van IIFE-a da loadSavedTrip() može da osveži prikaz posle
  // direktnog upisa u #adults.value (isti obrazac kao za ostatak forme).
  window.syncPaxDisplay = updateDisplay;

  function selectPax(n){
    hiddenField.value = String(n);
    paxList.querySelectorAll('.pax-option').forEach(b => {
      const isSel = b.dataset.value === String(n);
      b.classList.toggle('is-selected', isSel);
      b.setAttribute('aria-selected', isSel ? 'true' : 'false');
    });
    updateDisplay();
    hiddenField.dispatchEvent(new Event('input', {bubbles:true}));
    hiddenField.dispatchEvent(new Event('change', {bubbles:true}));
    // Sam klik na broj putnika sad odmah čuva izbor i zatvara karticu — dugme
    // "Gotovo" ostaje kao rezerva, ali izbor više ne zavisi od toga da se do
    // njega dogura (na dužim listama, npr. blizu 30, ranije je bilo van dohvata).
    requestClosePax();
  }

  const isMobilePax = () => window.matchMedia('(max-width:760px)').matches;

  let paxScrollY = 0;
  let _paxScrollLocked = false;
  // Isti razlog/rešenje kao kod kalendara — vidi komentar uz lockPageScroll
  // tamo (odlaganje body position promene za jedan tick, da ne "zaglavi"
  // isporuku sledećeg klika na mobilnom).
  function lockPageScroll(){
    if (_paxScrollLocked) return;
    _paxScrollLocked = true;
    paxScrollY = window.scrollY;
    setTimeout(() => {
      if (!_paxScrollLocked) return;
      document.body.style.position = 'fixed';
      document.body.style.top = '-' + paxScrollY + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }, 0);
  }
  function unlockPageScroll(){
    _paxScrollLocked = false;
    setTimeout(() => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      // behavior:'instant' iz istog razloga kao u unlockPageScroll za
      // kalendar iznad — zaobilazi globalno scroll-behavior:smooth.
      window.scrollTo({top: paxScrollY, left: 0, behavior: 'instant'});
    }, 0);
  }

  // Isti razlog kao kod positionCalMobile gore — kartica je sad fullscreen
  // modal u <body>, pa joj prepuštamo visinu CSS media-query pravilu umesto
  // da je ručno sažimamo prema poziciji polja.
  function positionPaxMobile(){
    if (!isMobilePax()) return;
    paxCard.style.left = '';
    paxCard.style.right = '';
    paxCard.style.top = '';
    paxCard.style.bottom = '';
    paxCard.style.maxHeight = '';
  }

  // Isti razlog i isto rešenje kao kod kalendara (vidi detachCalForMobile
  // gore) — .ticket ima backdrop-filter, što pravi containing block za
  // position:fixed potomke, pa se kartica bez ovoga otvara na pogrešnom
  // mestu na mobilnom umesto tačno iznad polja "Putnika".
  let paxHomeParent = null, paxHomeNext = null;
  let paxBackdropHomeParent = null, paxBackdropHomeNext = null;
  function detachPaxForMobile(){
    if (paxCard.parentElement !== document.body){
      paxHomeParent = paxCard.parentElement;
      paxHomeNext = paxCard.nextSibling;
      document.body.appendChild(paxCard);
    }
    if (paxBackdrop && paxBackdrop.parentElement !== document.body){
      paxBackdropHomeParent = paxBackdrop.parentElement;
      paxBackdropHomeNext = paxBackdrop.nextSibling;
      document.body.appendChild(paxBackdrop);
    }
  }
  function reattachPax(){
    if (paxHomeParent){
      if (paxHomeNext) paxHomeParent.insertBefore(paxCard, paxHomeNext);
      else paxHomeParent.appendChild(paxCard);
      paxHomeParent = null; paxHomeNext = null;
    }
    if (paxBackdropHomeParent){
      if (paxBackdropHomeNext) paxBackdropHomeParent.insertBefore(paxBackdrop, paxBackdropHomeNext);
      else paxBackdropHomeParent.appendChild(paxBackdrop);
      paxBackdropHomeParent = null; paxBackdropHomeNext = null;
    }
  }

  function openPax(){
    paxCard.classList.add('open');
    if (paxBackdrop) paxBackdrop.classList.add('open');
    displayBtn.setAttribute('aria-expanded', 'true');
    if (isMobilePax()){
      detachPaxForMobile(); lockPageScroll(); positionPaxMobile();
      guardOverlayOpen('pax', closePax);
    }
    const focusTarget = paxList.querySelector('.pax-option.is-selected') || paxList.querySelector('.pax-option');
    if (focusTarget) focusTarget.focus();
  }
  function requestClosePax(){
    if (!guardOverlayRequestClose('pax')) closePax();
  }
  function closePax(){
    const wasOpen = paxCard.classList.contains('open');
    paxCard.classList.remove('open');
    if (paxBackdrop) paxBackdrop.classList.remove('open');
    displayBtn.setAttribute('aria-expanded', 'false');
    if (isMobilePax() && _paxScrollLocked) unlockPageScroll();
    reattachPax();
    if (wasOpen && document.activeElement && paxCard.contains(document.activeElement)){
      displayBtn.focus();
    }
  }

  displayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (paxCard.classList.contains('open')) requestClosePax();
    else openPax();
  });
  if (applyBtn) applyBtn.addEventListener('click', (e) => { e.stopPropagation(); requestClosePax(); });
  paxCard.addEventListener('click', (e) => e.stopPropagation());
  // Focus trap dok je "dijalog" otvoren — isti obrazac kao kod kalendara.
  paxCard.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = Array.from(paxCard.querySelectorAll('button')).filter(el => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  });
  document.addEventListener('click', () => {
    if (paxCard.classList.contains('open')) requestClosePax();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && paxCard.classList.contains('open')) requestClosePax();
  });
  window.addEventListener('resize', () => {
    if (paxCard.classList.contains('open')) positionPaxMobile();
  });

  buildOptions();
  updateDisplay();

  // Ako se jezik promeni, prevedi i listu i trenutni prikaz.
  const _prevOnLangChangePax = window.onLangChange;
  window.onLangChange = function(lang){
    if (typeof _prevOnLangChangePax === 'function') _prevOnLangChangePax(lang);
    buildOptions();
    updateDisplay();
  };
})();

// Small heuristic list — no geo API here, just enough to stop the CTA
// from promising a beach in landlocked cities like Beograd or Beč.
const COASTAL_DESTINATIONS = [
  'atina','solun','krf','santorini','mikonos','rodos','krit',
  'dubrovnik','split','zadar','budva','kotor','herceg novi',
  'barselona','nica','malaga','valensija','ibica','napulj','venecija',
  'lisabon','porto','tel aviv','antalija','bodrum',
  'gdanjsk','gdinja','sopot','kolobžeg','hel','ustka',
  'faro','albufeira','kaskais','nazare','ericeira','peniche','lagos','portimão',
  'tavira','vilamoura','sesimbra','costa da caparica','madeira','azori','tersejra','aveiro',
  'alikante','majorka','palma de majorka','menorka','formentera','tenerife','gran kanarija',
  'lanzarote','fuerteventura','la palma','el hijero','la gomera','san sebastijan','a korunja',
  'vigo','hihon','kadiz','kartahena','kosta brava','kosta del sol','kosta blanka','marbelja',
  'benidorm','torremolinos','salou','sitges',
  'halkidiki','zakintos','kefalonija','lefkada','paros','naksos','kos','volos',
  'patra','kavala','iraklion','kalamata','edipsos','lutraki','nafplion',
  'tasos','samos','hios','skijatos','skopelos','evija','idra','spece','milos','ios','egina','poros',
  'andros','tinos','siros','amorgos','folegandros','sifnos','simi','kalimnos','leros','patmos',
  'lezbos','limnos','kitira','antiparos','serifos','kamena vurla','karpatos','parga','sivota'
];
function ctaCopy(dest){
  const isCoastal = COASTAL_DESTINATIONS.includes(dest.trim().toLowerCase());
  return t(isCoastal ? 'cta_copy_coastal' : 'cta_copy_inland');
}

const PARTNERS = {
  flight:    {provider:'kayak',      name:'KAYAK'},
  hotel:     {provider:'booking',    name:'Booking.com'},
  car:       {provider:'booking',    name:'Booking.com'},
  activity:  {provider:'viator',     name:'Viator'},
  esim:      {provider:'airalo',     name:'Airalo'},
  insurance: {provider:'worldnomads',name:'World Nomads'}
};

/* ---- Airalo prodaje eSIM po DRŽAVI, ne po gradu (npr. airalo.com/greece-esim),
   dok SKLOPI destinaciju vodi kao grad ("Atina"). Mapiramo preko iste liste
   POPULAR_DESTINATIONS koja se već koristi za predloge gradova — svaki unos
   tamo ima "extra" polje sa nazivom države na srpskom, koje ovde prevodimo
   u Airalo-ov URL slug (engleski naziv države, malim slovima, sa crticama).
   Status ovog mapiranja: vidi STATUS PRE PRODUKCIJE blok ispod. ---- */
const COUNTRY_SLUG_SR = {
  'Srbija':'serbia', 'Crna Gora':'montenegro', 'Bosna i Hercegovina':'bosnia-and-herzegovina',
  'Hrvatska':'croatia', 'Severna Makedonija':'north-macedonia', 'Kosovo':'kosovo',
  'Slovenija':'slovenia', 'Albanija':'albania', 'Rumunija':'romania', 'Bugarska':'bulgaria',
  'Grčka':'greece', 'Italija':'italy', 'Španija':'spain', 'Portugalija':'portugal',
  'Francuska':'france', 'Velika Britanija':'united-kingdom', 'Holandija':'netherlands',
  'Nemačka':'germany', 'Austrija':'austria', 'Češka':'czech-republic', 'Mađarska':'hungary',
  'Slovačka':'slovakia', 'Poljska':'poland', 'Švedska':'sweden', 'Norveška':'norway',
  'Danska':'denmark', 'Finska':'finland', 'Irska':'ireland', 'Belgija':'belgium',
  'Švajcarska':'switzerland', 'Turska':'turkey', 'Izrael':'israel', 'UAE':'united-arab-emirates',
  'Egipat':'egypt', 'Maroko':'morocco', 'SAD':'united-states', 'Tajland':'thailand',
  'Japan':'japan', 'Indonezija':'indonesia', 'Singapur':'singapore',
  'Indija':'india', 'Šri Lanka':'sri-lanka', 'Brazil':'brazil', 'Kolumbija':'colombia', 'Ekvador':'ecuador',
  'Australija':'australia', 'Kina':'china'
};
function airaloCountrySlug(destName){
  const match = POPULAR_DESTINATIONS.find(d => normalizeSr(d.name) === normalizeSr(destName));
  if (!match) return null;
  return COUNTRY_SLUG_SR[match.extra] || null;
}

/* ==========================================================
   IATA KODOVI za deep link ka KAYAK-u. Ključ = normalizeSr(grad).
   Uredničko znanje, namerno samo za aerodrome u kojima smo sigurni;
   za sve ostalo iataFor() vraća null i link pada na stari
   "anywhere-<grad>" oblik (ne nagađamo kod). Gradovi bez sopstvenog
   aerodroma se ovde NE mapiraju — pre pretrage prolaze kroz
   realDepartureAirportFor/realArrivalAirportFor (Bar → Tivat, itd.),
   isto kao i tekst na kartici, pa link i kartica pominju isti aerodrom.
========================================================== */
const AIRPORT_IATA = {
  'beograd':'BEG','nis':'INI','podgorica':'TGD','tivat':'TIV','zagreb':'ZAG','split':'SPU','dubrovnik':'DBV',
  'zadar':'ZAD','pula':'PUY','sarajevo':'SJJ','mostar':'OMO','skoplje':'SKP','ohrid':'OHD','pristina':'PRN',
  'ljubljana':'LJU','tirana':'TIA','budimpesta':'BUD','temisvar':'TSR','bukurest':'OTP',
  'sofija':'SOF','varna':'VAR','solun':'SKG','atina':'ATH','krf':'CFU','santorini':'JTR','mikonos':'JMK',
  'rodos':'RHO','krit':'HER','iraklion':'HER','rim':'FCO','milano':'MXP','venecija':'VCE','napulj':'NAP',
  'barselona':'BCN','madrid':'MAD','malaga':'AGP','ibica':'IBZ','lisabon':'LIS','porto':'OPO','pariz':'CDG',
  'nica':'NCE','london':'LON','amsterdam':'AMS','berlin':'BER','minhen':'MUC','frankfurt':'FRA','cirih':'ZRH',
  'bec':'VIE','prag':'PRG','bratislava':'BTS','varsava':'WAW','krakov':'KRK','istanbul':'IST','antalija':'AYT',
  'bodrum':'BJV','tel aviv':'TLV','dubai':'DXB','kairo':'CAI','marakes':'RAK','larnaka':'LCA','valeta':'MLA',
  'majorka':'PMI','kopenhagen':'CPH','stokholm':'ARN','oslo':'OSL','helsinki':'HEL','dablin':'DUB',
  'brisel':'BRU','bazel':'BSL','zeneva':'GVA','njujork':'NYC','bangkok':'BKK','tokio':'TYO'
};
function iataFor(airportNameRaw){
  const norm = normalizeSr(String(airportNameRaw || '').split(',')[0].trim());
  return AIRPORT_IATA[norm] || null;
}

/* ---- Cena leta zavisi od RUTE (polazište → destinacija), ne samo od
   nasumične osnove. Koordinate aerodroma (približne, dovoljne za
   procenu udaljenosti) za IATA kodove iz AIRPORT_IATA. Bez koordinata
   za bilo koji kraj rute, flightRouteMult() vraća 1 (staro ponašanje). ---- */
const AIRPORT_COORDS = {
  BEG:[44.82,20.29], INI:[43.34,21.85], TGD:[42.36,19.25], TIV:[42.40,18.72], ZAG:[45.74,16.07], SPU:[43.54,16.30],
  DBV:[42.56,18.27], ZAD:[44.11,15.35], PUY:[44.89,13.92], SJJ:[43.82,18.33], OMO:[43.29,17.85], SKP:[41.96,21.62],
  OHD:[41.18,20.74], PRN:[42.36,21.03], LJU:[46.22,14.46], TIA:[41.41,19.72], BUD:[47.44,19.26], TSR:[45.81,21.34],
  OTP:[44.57,26.09], SOF:[42.69,23.41], VAR:[43.23,27.83], SKG:[40.52,22.97], ATH:[37.94,23.94], CFU:[39.60,19.91],
  JTR:[36.40,25.48], JMK:[37.44,25.35], RHO:[36.41,28.09], HER:[35.34,25.18], FCO:[41.80,12.25], MXP:[45.63,8.72],
  VCE:[45.51,12.35], NAP:[40.89,14.29], BCN:[41.30,2.08], MAD:[40.47,-3.56], AGP:[36.67,-4.50], IBZ:[38.87,1.37],
  LIS:[38.77,-9.13], OPO:[41.24,-8.68], CDG:[49.01,2.55], NCE:[43.66,7.22], LON:[51.47,-0.45], AMS:[52.31,4.76],
  BER:[52.36,13.50], MUC:[48.35,11.79], FRA:[50.03,8.57], ZRH:[47.46,8.55], VIE:[48.11,16.57], PRG:[50.10,14.26],
  BTS:[48.17,17.21], WAW:[52.17,20.97], KRK:[50.08,19.78], IST:[41.26,28.74], AYT:[36.90,30.80], BJV:[37.25,27.66],
  TLV:[32.01,34.89], DXB:[25.25,55.36], CAI:[30.12,31.41], RAK:[31.61,-8.04], LCA:[34.88,33.63], MLA:[35.86,14.48],
  PMI:[39.55,2.74], CPH:[55.62,12.65], ARN:[59.65,17.93], OSL:[60.19,11.10], HEL:[60.32,24.96], DUB:[53.42,-6.27],
  BRU:[50.90,4.48], BSL:[47.59,7.53], GVA:[46.24,6.11], NYC:[40.64,-73.78], BKK:[13.69,100.75], TYO:[35.55,139.78]
};
function haversineKm(a, b){
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat/2)**2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// Množilac cene leta za konkretnu rutu. 1500 km = referentna (množilac 1);
// kraće rute jeftinije, dalje skuplje (ograničeno 0.6–4). Polazište bez
// sopstvenog aerodroma računa se od NAJBLIŽEG pravog (Novi Sad → Beograd),
// isto kao tekst na kartici. Mala mreža linija (Niš) daje +12% —
// ista okolnost na koju flightSubText već upozorava korisnika.
// NE zove rng() — ne sme da pomeri niz nasumičnih vrednosti.
function flightRouteMult(originRaw, destRaw){
  const o = iataFor(realDepartureAirportFor(originRaw));
  const d = iataFor(realArrivalAirportFor(destRaw));
  if (!o || !d || !AIRPORT_COORDS[o] || !AIRPORT_COORDS[d]) return 1;
  const km = o === d ? 0 : haversineKm(AIRPORT_COORDS[o], AIRPORT_COORDS[d]);
  let m = Math.min(4, Math.max(0.6, 0.5 + 0.5 * (km / 1500)));
  if (isLimitedNetworkOrigin(originRaw)) m *= 1.12;
  return m;
}

