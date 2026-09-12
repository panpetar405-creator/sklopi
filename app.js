/* ==========================================================
   MOCK PROVIDER LAYER
   Stand-in for providers/flights/kayak.ts, providers/hotels/booking.ts, etc.
   Every provider function returns the same normalized shape,
   exactly like the "standardizovani sloj" in the brief.
========================================================== */

function seededRandom(seed){
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function(){
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
function hashSeed(str){
  let h = 0;
  for (let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) | 0; }
  return Math.abs(h) || 1;
}
function nightsBetween(a,b){
  const ms = new Date(b) - new Date(a);
  return Math.max(1, Math.round(ms / 86400000));
}
function fmtDate(iso){
  const d = new Date(iso);
  return d.getDate() + '. ' + d.toLocaleString('sr-Latn', {month:'long'});
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
  const calMonths = document.getElementById('calMonths');
  const calGrids = document.getElementById('calGrids');
  const calRangeLabel = document.getElementById('calRangeLabel');
  const prevBtn = document.getElementById('calPrev');
  const nextBtn = document.getElementById('calNext');
  const applyBtn = document.getElementById('calApply');
  if (!displayBtn || !calCard) return;

  const DAY_NAMES = ['Pon','Uto','Sre','Čet','Pet','Sub','Ned'];
  const today = new Date(); today.setHours(0,0,0,0);

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
  function sameDay(a,b){ return !!a && !!b && a.getTime() === b.getTime(); }
  function nightsCount(a,b){ return Math.max(1, Math.round((b - a) / 86400000)); }
  function nightsWord(n){ return n === 1 ? 'noć' : 'noći'; }

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
      const attempts = [
        'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city) + '&count=10&language=sr&format=json',
        'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city) + '&count=10&language=en&format=json',
        'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city) + '&count=10&format=json'
      ];
      let networkError = false;
      for (const url of attempts){
        try{
          const res = await fetch(url);
          if (!res.ok){ networkError = true; continue; }
          const data = await res.json();
          if (data && data.results && data.results.length){
            const r = pickBestLocationMatch(data.results, city);
            const geo = {lat: Math.round(r.latitude*100)/100, lon: Math.round(r.longitude*100)/100};
            this.geoCache[key] = geo;
            return {geo, networkError:false};
          }
        } catch(err){
          networkError = true;
          console.warn('[skoknica] geokodiranje odredišta nije uspelo:', err.message);
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
      } catch(err){ console.warn('[skoknica] prognoza nije uspela:', err.message); return {data:{}, networkError:true}; }
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
        console.warn('[skoknica] istorijski podaci nisu uspeli:', err.message);
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
    setStatus('Tražim vreme za „' + city + '“…');

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
    calRangeLabel.innerHTML = fmtShort(selStart) + ' – ' + fmtShort(selEnd) + ' <b>· ' + n + ' ' + nightsWord(n) + '</b>';
  }

  function commit(){
    hiddenFrom.value = toISODate(selStart);
    hiddenTo.value = toISODate(selEnd);
    hiddenFrom.dispatchEvent(new Event('change', {bubbles:true}));
    hiddenTo.dispatchEvent(new Event('change', {bubbles:true}));
    updateDisplay();
  }

  function buildMonthGrid(year, month){
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // ponedeljak = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let head = '<div class="cal-grid-head">' + DAY_NAMES.map(d => '<span>' + d + '</span>').join('') + '</div>';
    let body = '<div class="cal-grid-body">';
    for (let i = 0; i < startOffset; i++) body += '<span class="cal-day is-empty"></span>';
    for (let day = 1; day <= daysInMonth; day++){
      const d = new Date(year, month, day);
      const classes = ['cal-day'];
      if (d < today) classes.push('is-disabled');
      if (sameDay(d, selStart)) classes.push('range-start');
      if (sameDay(d, selEnd)) classes.push('range-end');
      if (selStart && selEnd && d > selStart && d < selEnd) classes.push('range-mid');
      if (sameDay(d, today)) classes.push('is-today');
      body += '<span class="' + classes.join(' ') + '" data-date="' + toISODate(d) + '">' + day + '</span>';
    }
    body += '</div>';
    return '<div class="cal-grid">' + head + body + '</div>';
  }

  function render(){
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    const monthLabel = (y, m) => {
      const name = new Date(y, m, 1).toLocaleString('sr-Latn', {month:'long'});
      return name.charAt(0).toUpperCase() + name.slice(1) + ' ' + y;
    };
    calMonths.innerHTML = '<span>' + monthLabel(viewYear, viewMonth) + '</span><span>' + monthLabel(nextY, nextM) + '</span>';
    calGrids.innerHTML = buildMonthGrid(viewYear, viewMonth) + buildMonthGrid(nextY, nextM);
    calGrids.querySelectorAll('.cal-day:not(.is-empty):not(.is-disabled)').forEach(el => {
      el.addEventListener('click', () => {
        const d = parseISODate(el.dataset.date);
        if (!selStart || (selStart && selEnd)){
          selStart = d; selEnd = null;
        } else if (d < selStart){
          selStart = d;
        } else {
          selEnd = d;
        }
        render();
        if (selStart && selEnd) updateDisplay();
      });
    });
    paintWeather();
  }

  function openCal(){
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    render();
    calCard.classList.add('open');
    displayBtn.setAttribute('aria-expanded', 'true');
  }
  function closeCal(shouldCommit){
    calCard.classList.remove('open');
    displayBtn.setAttribute('aria-expanded', 'false');
    if (shouldCommit && selStart && selEnd){
      commit();
    } else if (!selStart || !selEnd){
      selStart = parseISODate(hiddenFrom.value);
      selEnd = parseISODate(hiddenTo.value);
    }
  }

  displayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (calCard.classList.contains('open')) closeCal(true);
    else openCal();
  });
  applyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (selStart && selEnd) closeCal(true);
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

  document.addEventListener('click', () => {
    if (calCard.classList.contains('open')) closeCal(true);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && calCard.classList.contains('open')) closeCal(true);
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

  updateDisplay();
})();

// Small heuristic list — no geo API here, just enough to stop the CTA
// from promising a beach in landlocked cities like Beograd or Beč.
const COASTAL_DESTINATIONS = [
  'atina','solun','krf','santorini','mikonos','rodos','krit',
  'dubrovnik','split','zadar','budva','kotor','herceg novi',
  'barselona','nica','malaga','valensija','ibica','napulj','venecija',
  'lisabon','porto','tel aviv','antalija','bodrum'
];
function ctaCopy(dest){
  const isCoastal = COASTAL_DESTINATIONS.includes(dest.trim().toLowerCase());
  return isCoastal
    ? 'Istorija, dobra hrana, more i nezaboravni doživljaji — a sad je lakše nego ikad da sve to isplaniraš.'
    : 'Istorija, dobra hrana i nezaboravni doživljaji — a sad je lakše nego ikad da sve to isplaniraš.';
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
   dok Skoknica destinaciju vodi kao grad ("Atina"). Mapiramo preko iste liste
   POPULAR_DESTINATIONS koja se već koristi za predloge gradova — svaki unos
   tamo ima "extra" polje sa nazivom države na srpskom, koje ovde prevodimo
   u Airalo-ov URL slug (engleski naziv države, malim slovima, sa crticama).
   NAPOMENA: slug format je potvrđen za par država (italy-esim, greece-esim),
   ostatak je najbolja moguća pretpostavka po istoj šemi — pre pravog
   affiliate ugovora vredi proveriti da li svaka od ovih stranica zaista
   postoji na Airalo sajtu. ---- */
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
  'Japan':'japan', 'Indonezija':'indonesia', 'Singapur':'singapore'
};
function airaloCountrySlug(destName){
  const match = POPULAR_DESTINATIONS.find(d => normalizeSr(d.name) === normalizeSr(destName));
  if (!match) return null;
  return COUNTRY_SLUG_SR[match.extra] || null;
}

/* ==========================================================
   AFFILIATE DEEP LINKS
   Builds a real search URL on the partner's own site, pre-filled
   with destination/dates/passengers. No live pricing API is called
   client-side — replace AFF_ID placeholders with real affiliate IDs
   once each partner program is approved.
========================================================== */
const AFF_ID = 'SKOKNICA'; // TODO: replace per-partner with real affiliate/tracking IDs

function buildAffiliateLink(kind, ctx){
  const enc = encodeURIComponent;
  const dest = enc(ctx.dest);
  switch(kind){
    case 'flight':
      // Kayak supports "anywhere-<city>" as an origin placeholder when no origin airport is known.
      return `https://www.kayak.com/flights/anywhere-${dest}/${ctx.from}/${ctx.to}?adults=${ctx.adults}&sort=bestflight_a&ref=${AFF_ID}`;
    case 'hotel':
      return `https://www.booking.com/searchresults.html?ss=${dest}&checkin=${ctx.from}&checkout=${ctx.to}&group_adults=${ctx.adults}&no_rooms=1&aid=${AFF_ID}`;
    case 'car':
      return `https://www.booking.com/cars/results.html?ss=${dest}&pickupDate=${ctx.from}&dropoffDate=${ctx.to}&aid=${AFF_ID}`;
    case 'activity':
      return `https://www.viator.com/searchResults/all?text=${dest}&pid=${AFF_ID}`;
    case 'esim': {
      const slug = airaloCountrySlug(ctx.dest);
      // Ako ne prepoznamo državu iz grada, vodimo na opštu prodavnicu
      // (bolje nego pogrešan/nepostojeći URL za državu).
      return slug
        ? `https://www.airalo.com/${slug}-esim?ref=${AFF_ID}`
        : `https://www.airalo.com/esim?ref=${AFF_ID}`;
    }
    case 'insurance':
      // Za razliku od ostalih partnera, World Nomads nema potvrđen javni
      // URL šablon za deep-link sa unapred popunjenom destinacijom/datumima
      // (proces dobijanja ponude ide kroz njihov sopstveni wizard, ne kroz
      // query parametre na ovoj stranici) — zato vodi na opštu stranicu za
      // ponudu, ne na nešto specifično za ${ctx.dest}. Kad se prijava na
      // affiliate program (preko CJ mreže) odobri, ovaj URL treba zameniti
      // pravim CJ tracking linkom (obično na drugom domenu, ne worldnomads.com).
      // TODO takođe: potvrditi da World Nomads uopšte prodaje rezidentima Srbije
      // pre nego što ovo ide u produkciju — nije potvrđeno u istraživanju.
      return `https://www.worldnomads.com/travel-insurance?ref=${AFF_ID}`;
  }
}

function fetchFlights(rng, dest, adults, tier){
  const base = 60 + Math.floor(rng()*140);
  const tierMult = {budget:0.72, best:1, comfort:1.55}[tier];
  const price = Math.round(base * tierMult * adults);
  const p = PARTNERS.flight;
  const carriers = ['Wizz Air','Air Serbia','Ryanair','Aegean','Lufthansa'];
  return {
    provider:p.provider, providerLabel:p.name, type:'flight',
    name: (tier==='comfort' ? carriers[carriers.length-1] : carriers[Math.floor(rng()*carriers.length)]) + ' → ' + dest,
    sub: (tier==='comfort' ? 'direktan let, prtljag uključen' : (tier==='budget' ? 'jedan presedanje' : 'direktan let'))
      + (adults > 1 ? ' · cena za svih ' + adults + ' putnika' : ''),
    price, currency:'EUR'
  };
}
function fetchHotel(rng, dest, nights, adults, tier){
  const perNight = {budget:32, best:71, comfort:138}[tier] + Math.floor(rng()*24);
  const price = Math.round(perNight * nights * Math.ceil(adults/2));
  const p = PARTNERS.hotel;
  const ratings = {budget:7.6, best:8.7, comfort:9.3};
  const names = {
    budget:['Hostel Centar','City Rooms','Studio Plaza'],
    best:[dest+' Hotel', 'Aegean Suites', 'Old Town Residence'],
    comfort:['Grand '+dest, 'Royal Palace Hotel', dest+' Luxury Collection']
  };
  const arr = names[tier];
  const rooms = Math.ceil(adults/2);
  return {
    provider:p.provider, providerLabel:p.name, type:'hotel',
    name: arr[Math.floor(rng()*arr.length)],
    sub: nights+' noć' + (nights===1?'':'i') + ' · ocena ' + (ratings[tier]+rng()*0.3).toFixed(1)
      + (rooms > 1 ? ' · cena za ' + rooms + ' sobe' : ''),
    price, currency:'EUR'
  };
}
function fetchCar(rng, days, tier){
  if (tier==='budget') return null; // budget package skips a car, per the brief
  const perDay = {best:34, comfort:58}[tier] + Math.floor(rng()*12);
  const price = Math.round(perDay * days);
  const p = PARTNERS.car;
  const models = {best:['Fiat 500','VW Polo','Opel Corsa'], comfort:['VW Tiguan','Audi A4','Volvo XC40']};
  const arr = models[tier];
  return {
    provider:p.provider, providerLabel:p.name, type:'car',
    name: arr[Math.floor(rng()*arr.length)],
    sub: days+' dana · automatski/ručni menjač',
    price, currency:'EUR'
  };
}
function fetchActivity(rng, dest, tier){
  const price = {budget:18, best:41, comfort:79}[tier] + Math.floor(rng()*20);
  const p = PARTNERS.activity;
  const opts = {
    budget:['Obilazak starog grada peške'],
    best:['Poludnevna tura s vodičem','Ulaznica za glavne znamenitosti'],
    comfort:['Privatna tura s vodičem','Gastronomska tura uz degustaciju']
  };
  const arr = opts[tier];
  return {
    provider:p.provider, providerLabel:p.name, type:'activity',
    name: arr[Math.floor(rng()*arr.length)] + ' — ' + dest,
    sub: 'po osobi',
    price, currency:'EUR'
  };
}

const EXTRA_COSTS = {
  best:    {fuel:45, tolls:28, insurance:22, esim:12},
  comfort: {fuel:58, tolls:34, insurance:34, esim:18},
  budget:  {fuel:0,  tolls:0,  insurance:14, esim:8}
};

/* ==========================================================
   PRICING + SCORE ENGINE
========================================================== */
function buildPackage(rng, dest, nights, days, adults, tier, flags){
  const flight = flags.flight ? fetchFlights(rng, dest, adults, tier) : null;
  const hotel  = flags.hotel  ? fetchHotel(rng, dest, nights, adults, tier) : null;
  const car    = flags.car    ? fetchCar(rng, days, tier) : null;
  const activity = flags.activity ? fetchActivity(rng, dest, tier) : null;
  const extras = EXTRA_COSTS[tier];

  const fuel = (car && extras.fuel) ? extras.fuel : 0;
  const tolls = (car && extras.tolls) ? extras.tolls : 0;
  // Osiguranje i eSIM više NISU deo osnovne cene — to su dodaci na već
  // kupljenu uslugu, ne "proizvod" koji se pretražuje. Cena im je uvek
  // dostupna (da bi se prikazala uz čekboks u rezultatima), ali se ne
  // sabira u `total` dok ih korisnik svesno ne uključi (vidi toggleAddon).
  const insuranceCost = extras.insurance;
  const esimCost = extras.esim;

  const total = (flight?flight.price:0) + (hotel?hotel.price:0) + (car?car.price:0)
              + (activity?activity.price:0) + fuel + tolls;

  // Quality is a fixed, structural property of each tier (hotel rating,
  // flight directness, car size) — it doesn't depend on this run's prices.
  const qualityScore = {best:84, budget:58, comfort:97}[tier];

  return {tier, flight, hotel, car, activity, fuel, tolls, insuranceCost, esimCost, total, qualityScore};
}

const TIER_META = {
  best:    {label:'Best Value', desc:'Najbolji odnos cene i kvaliteta'},
  comfort: {label:'Comfort', desc:'Bolji hotel, direktan let, prostraniji auto'},
  budget:  {label:'Budget', desc:'Najniža cena, bez iznajmljivanja auta'}
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
const state = { searches:0, clicks:0, revenue:0 };

function fmtEUR(n){ return '€' + n.toLocaleString('de-DE'); }

function attachAffiliateLinks(pkg, dest, from, to, adults){
  const ctx = {dest, from, to, adults};
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
// window.SKOKNICA_API_BASE = 'https://api.skoknica.rs';
const API_BASE = window.SKOKNICA_API_BASE || '';

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
  // Region
  {name:'Podgorica', extra:'Crna Gora'}, {name:'Budva', extra:'Crna Gora'}, {name:'Kotor', extra:'Crna Gora'},
  {name:'Herceg Novi', extra:'Crna Gora'}, {name:'Igalo', extra:'Crna Gora'}, {name:'Bar', extra:'Crna Gora'},
  {name:'Tivat', extra:'Crna Gora'}, {name:'Petrovac', extra:'Crna Gora'}, {name:'Sutomore', extra:'Crna Gora'},
  {name:'Ulcinj', extra:'Crna Gora'}, {name:'Perast', extra:'Crna Gora'}, {name:'Risan', extra:'Crna Gora'},
  {name:'Sarajevo', extra:'Bosna i Hercegovina'}, {name:'Mostar', extra:'Bosna i Hercegovina'}, {name:'Banja Luka', extra:'Bosna i Hercegovina'},
  {name:'Zagreb', extra:'Hrvatska'}, {name:'Split', extra:'Hrvatska'}, {name:'Dubrovnik', extra:'Hrvatska'},
  {name:'Zadar', extra:'Hrvatska'}, {name:'Rijeka', extra:'Hrvatska'}, {name:'Pula', extra:'Hrvatska'}, {name:'Hvar', extra:'Hrvatska'},
  {name:'Makarska', extra:'Hrvatska'}, {name:'Trogir', extra:'Hrvatska'}, {name:'Šibenik', extra:'Hrvatska'}, {name:'Rovinj', extra:'Hrvatska'},
  {name:'Skoplje', extra:'Severna Makedonija'}, {name:'Ohrid', extra:'Severna Makedonija'},
  {name:'Priština', extra:'Kosovo'},
  {name:'Ljubljana', extra:'Slovenija'}, {name:'Bled', extra:'Slovenija'}, {name:'Piran', extra:'Slovenija'},
  {name:'Tirana', extra:'Albanija'}, {name:'Sarande', extra:'Albanija'},
  {name:'Bukurešt', extra:'Rumunija'}, {name:'Sofija', extra:'Bugarska'}, {name:'Varna', extra:'Bugarska'}, {name:'Burgas', extra:'Bugarska'},
  // Grčka i Egej
  {name:'Atina', extra:'Grčka'}, {name:'Solun', extra:'Grčka'}, {name:'Krf', extra:'Grčka'},
  {name:'Santorini', extra:'Grčka'}, {name:'Mikonos', extra:'Grčka'}, {name:'Rodos', extra:'Grčka'},
  {name:'Krit', extra:'Grčka'}, {name:'Halkidiki', extra:'Grčka'},
  // Italija
  {name:'Rim', extra:'Italija'}, {name:'Milano', extra:'Italija'}, {name:'Napulj', extra:'Italija'},
  {name:'Venecija', extra:'Italija'}, {name:'Firenca', extra:'Italija'}, {name:'Bolonja', extra:'Italija'},
  {name:'Verona', extra:'Italija'}, {name:'Torino', extra:'Italija'}, {name:'Bari', extra:'Italija'}, {name:'Sicilija', extra:'Italija'},
  // Španija i Portugal
  {name:'Barselona', extra:'Španija'}, {name:'Madrid', extra:'Španija'}, {name:'Valensija', extra:'Španija'},
  {name:'Malaga', extra:'Španija'}, {name:'Ibica', extra:'Španija'}, {name:'Majorka', extra:'Španija'}, {name:'Sevilja', extra:'Španija'},
  {name:'Lisabon', extra:'Portugalija'}, {name:'Porto', extra:'Portugalija'}, {name:'Faro', extra:'Portugalija'},
  // Zapadna/Severna Evropa
  {name:'Pariz', extra:'Francuska'}, {name:'Nica', extra:'Francuska'}, {name:'Lion', extra:'Francuska'},
  {name:'London', extra:'Velika Britanija'}, {name:'Edinburg', extra:'Velika Britanija'},
  {name:'Amsterdam', extra:'Holandija'}, {name:'Roterdam', extra:'Holandija'},
  {name:'Berlin', extra:'Nemačka'}, {name:'Minhen', extra:'Nemačka'}, {name:'Hamburg', extra:'Nemačka'}, {name:'Frankfurt', extra:'Nemačka'},
  {name:'Beč', extra:'Austrija'}, {name:'Zalcburg', extra:'Austrija'}, {name:'Insbruk', extra:'Austrija'},
  {name:'Prag', extra:'Češka'}, {name:'Budimpešta', extra:'Mađarska'}, {name:'Bratislava', extra:'Slovačka'},
  {name:'Varšava', extra:'Poljska'}, {name:'Krakov', extra:'Poljska'},
  {name:'Stokholm', extra:'Švedska'}, {name:'Oslo', extra:'Norveška'}, {name:'Kopenhagen', extra:'Danska'}, {name:'Helsinki', extra:'Finska'},
  {name:'Dablin', extra:'Irska'}, {name:'Brisel', extra:'Belgija'}, {name:'Cirih', extra:'Švajcarska'}, {name:'Ženeva', extra:'Švajcarska'},
  // Turska, Bliski istok, sever Afrike
  {name:'Istanbul', extra:'Turska'}, {name:'Antalija', extra:'Turska'}, {name:'Bodrum', extra:'Turska'}, {name:'Kapadokija', extra:'Turska'},
  {name:'Tel Aviv', extra:'Izrael'}, {name:'Dubai', extra:'UAE'}, {name:'Abu Dabi', extra:'UAE'},
  {name:'Kairo', extra:'Egipat'}, {name:'Šarm El Šeik', extra:'Egipat'}, {name:'Hurgada', extra:'Egipat'}, {name:'Marakeš', extra:'Maroko'},
  // Amerika i Azija (najtraženiji daleki gradovi)
  {name:'Njujork', extra:'SAD'}, {name:'Majami', extra:'SAD'}, {name:'Los Anđeles', extra:'SAD'},
  {name:'Bangkok', extra:'Tajland'}, {name:'Tokio', extra:'Japan'}, {name:'Bali', extra:'Indonezija'}, {name:'Singapur', extra:'Singapur'},
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

let _destSuggestTimer = null;
let _originSuggestTimer = null;
async function fetchLocationSuggestions(q, datalistId){
  const query = q.trim();
  const inputEl = document.querySelector(`input[list="${datalistId}"]`);
  const stubEl = inputEl ? inputEl.closest('.stub') : null;
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
        console.warn('[skoknica] backend predlozi nedostupni, prelazim na Open-Meteo:', err.message);
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
          console.warn('[skoknica] predlozi mesta (Open-Meteo) nisu uspeli:', err.message);
        }
      }
    }

    renderLocationSuggestions(combined.slice(0, 6), datalistId);
  } finally {
    if (stubEl) stubEl.classList.remove('is-loading');
  }
}
function renderLocationSuggestions(results, datalistId){
  const list = document.getElementById(datalistId);
  if (!list) return;
  if (!results.length){ list.innerHTML = ''; return; }
  const seen = new Set(); // izbegava duplikate istog naziva grada
  list.innerHTML = results.filter(r => {
    const key = r.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(r => `<option value="${escapeHtml(r.name)}">${escapeHtml(r.name)}${r.extra ? ' — ' + escapeHtml(r.extra) : ''}</option>`).join('');
}
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
  markStubLoading(e.target, q);
  _destSuggestTimer = setTimeout(()=> fetchLocationSuggestions(q, 'destSuggestions'), 300);
});
document.getElementById('origin').addEventListener('input', (e)=>{
  clearTimeout(_originSuggestTimer);
  const q = e.target.value;
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
  try {
    const res = await fetch(API_BASE + '/api/search', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    return json.packages;
  } catch(err){
    console.warn('[skoknica] backend nedostupan, koristim lokalni mock:', err.message);
    return null;
  }
}

function computePackagesLocally(dest, from, to, nights, days, adults, flags){
  const seed = hashSeed(dest.toLowerCase()+dest.length+nights+adults);
  const rng = seededRandom(seed);

  const pkgs = ['best','comfort','budget'].map(t => buildPackage(rng, dest, nights, days, adults, t, flags));
  pkgs.forEach(p => attachAffiliateLinks(p, dest, from, to, adults));

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
   "IZNENADI ME" — pretraga samo po budžetu, bez destinacije.
   Korisnik unese samo iznos; sajt proba svih ~100 gradova iz
   POPULAR_DESTINATIONS na 'best' tieru (isti flagovi kao u glavnoj
   formi) i vrati 3 nasumične koje se uklapaju u budžet.

   Namerno koristi ISTI seed kao computePackagesLocally za 'best'
   tier (hashSeed(dest+dest.length+nights+adults), pa rng potrošen
   redom best->comfort->budget) — cena koju "Iznenadi me" pokaže za
   neki grad je BIT-ZA-BIT ista kao kad bi korisnik taj grad ukucao
   ručno u glavnu pretragu. Nema dupliranja logike, samo poziva
   buildPackage direktno za jedan tier umesto sva tri.
========================================================== */
function computeSurpriseCandidates(from, to, adults, flags){
  const nights = nightsBetween(from, to);
  const days = nights;
  return POPULAR_DESTINATIONS.map(d => {
    const seed = hashSeed(d.name.toLowerCase()+d.name.length+nights+adults);
    const rng = seededRandom(seed);
    const pkg = buildPackage(rng, d.name, nights, days, adults, 'best', flags);
    attachAffiliateLinks(pkg, d.name, from, to, adults);
    return {dest:d.name, country:d.extra||'', pkg};
  });
}

// Bira 3 grada. Ako manje od 3 uopšte stane u budžet, umesto da vrati
// prazno (razočaravajuće), vraća 3 NAJJEFTINIJE opcije uz jasnu napomenu —
// sajt nikad ne sme da ostavi korisnika bez ijednog predloga.
function pickSurpriseDestinations(budget, candidates, count){
  const fitting = candidates.filter(c => c.pkg.total <= budget);
  const usedFallback = fitting.length < count;
  const pool = usedFallback ? candidates.slice().sort((a,b)=>a.pkg.total-b.pkg.total).slice(0, Math.max(count*3, count)) : fitting;

  // Obično (Fisher-Yates) mešanje — namerno NIJE seed-ovano kao ostatak
  // cenovne logike, jer ovde želimo da svaki klik na "Probaj ponovo" da
  // drugačiju trojku. Cena svakog grada ostaje deterministička, samo je
  // IZBOR koja 3 grada se prikazuju nasumičan.
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return {picks: shuffled.slice(0, count), usedFallback};
}

async function renderResults(dest, from, to, nights, days, adults, flags, originCode){
  const backendPkgs = await fetchPackagesFromBackend({
    dest, from, to, adults, originCode, flags
  });
  const pkgs = backendPkgs || computePackagesLocally(dest, from, to, nights, days, adults, flags);

  // Global kontekst za "Sačuvaj ovu ponudu" dugme na svakoj kartici —
  // isti obrazac kao window._lastBuilderPkg za builder.
  window._lastSearchPkgs = pkgs;
  window._lastSearchCtx = {dest, from, to, adults};

  document.getElementById('ctaTitle').textContent = dest + ' te čeka.';
  document.getElementById('ctaDesc').textContent = ctaCopy(dest);

  // Airalo (eSIM) se dodaje ručno jer nije "fetch-ovana" stavka kao ostali
  // partneri (nema svoju cenu sa API-ja) — ali je i dalje pravi partner
  // sa affiliate linkom, pa treba da stoji u napomeni ispod paketa.
  const providers = [...new Set(pkgs.flatMap(p=>[p.flight,p.hotel,p.car,p.activity].filter(Boolean).map(i=>i.providerLabel)))].concat('Airalo');

  const head = document.getElementById('resultsHead');
  head.innerHTML = `
    <div class="status-banner">
      <div class="status-left">
        <div class="status-check">${iconSvg('check')}</div>
        <div><h3>Tvoje putovanje je spremno.</h3><p>Evo 3 pažljivo odabrane kombinacije za tvoj trip u ${escapeHtml(dest)}.</p></div>
      </div>
      <div class="status-pills">
        <div class="pill">${iconSvg('calendar')} ${fmtDate(from)} – ${fmtDate(to)}</div>
        <div class="pill">${iconSvg('people')} ${adults} putnik${adults==='1'?'':'a'}</div>
      </div>
    </div>
  `;

  const body = document.getElementById('resultsBody');
  body.innerHTML = `<div class="packages">${pkgs.map(pkgHtml).join('')}</div>
    <p class="disclaimer">⚠️ Skoknica je trenutno u razvoju — prikazane cene su ilustrativan primer, generisan lokalno radi demonstracije, i <strong>nisu preuzete uživo</strong> sa partnerskih sajtova. Za stvarnu cenu i dostupnost proveri direktno na sajtu partnera (${providers.join(', ')}) pre rezervacije.</p>`;
}

function itemCardHtml(item, kind){
  if (!item) return '';
  const labels = {flight:'Let', hotel:'Hotel', car:'Auto'};
  const btnLabel = {flight:'Pretraži na KAYAK-u', hotel:'Rezerviši na Booking.com', car:'Rezerviši na Booking.com'};
  return `
  <div class="item-card ${kind}">
    <div class="item-photo ${kind}">${iconSvg(kind)}</div>
    <div class="item-body">
      <div class="item-label">${labels[kind]}${item.providerLabel!=='Skoknica' ? `<span class="item-provider">${escapeHtml(item.providerLabel)}</span>` : ''}</div>
      <div class="item-name">${escapeHtml(item.name)}</div>
      <div class="item-sub">${escapeHtml(item.sub)}</div>
      <div class="item-price tabular">${fmtEUR(item.price)}</div>
      <button class="item-btn ${kind}" data-kind="${kind}" data-price="${item.price}" data-url="${escapeHtml(item.bookUrl||'')}" onclick="bookItem(this)">${btnLabel[kind]}</button>
    </div>
  </div>`;
}

function pkgHtml(pkg){
  const meta = TIER_META[pkg.tier];
  const featured = pkg.recommended;
  const itemsRow = [
    itemCardHtml(pkg.flight,'flight'),
    itemCardHtml(pkg.hotel,'hotel'),
    itemCardHtml(pkg.car,'car')
  ].filter(Boolean).join('');

  return `
  <div class="pkg ${pkg.tier} ${featured?'featured':''}" data-base-total="${pkg.total}">
    <div class="pkg-head">
      <div>
        ${featured ? `<span class="pkg-badge">★ Preporučeno</span>` : ''}
        <h3>${meta.label}</h3>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;">${meta.desc}</div>
      </div>
      <div class="pkg-total">
        <div class="num tabular">${fmtEUR(pkg.total)}</div>
        <div class="cur">ukupno</div>
        <div class="hint">zbir odvojenih rezervacija, ne jedno plaćanje</div>
      </div>
    </div>
    <div class="pkg-score">
      <span><strong style="color:var(--ink);font-weight:600;">Skor ${pkg.score}/100</strong> — odnos cene i kvaliteta</span>
    </div>
    ${itemsRow ? `<div class="items-row">${itemsRow}</div>` : ''}
    ${(() => {
      const extraTiles = [
        pkg.activity ? `<div class="extra activity-extra">${iconSvg('activity')}<div><div class="lab">${escapeHtml(pkg.activity.name.split(' — ')[0])}</div><div class="val tabular">${fmtEUR(pkg.activity.price)}</div></div><button class="extra-btn" data-kind="activity" data-price="${pkg.activity.price}" data-url="${escapeHtml(pkg.activity.bookUrl||'')}" onclick="bookItem(this)">Viator</button></div>` : '',
        pkg.car ? `<div class="extra fuel-extra">${iconSvg('fuel')}<div><div class="lab">Gorivo (procena)</div><div class="val tabular">${fmtEUR(pkg.fuel)}</div></div></div>` : '',
        pkg.car ? `<div class="extra tolls-extra">${iconSvg('tolls')}<div><div class="lab">Putarine (procena)</div><div class="val tabular">${fmtEUR(pkg.tolls)}</div></div></div>` : '',
        `<label class="extra insurance-extra addon-extra">${iconSvg('insurance')}<div><div class="lab">Osiguranje</div><div class="val tabular">+${fmtEUR(pkg.insuranceCost)}</div></div><input type="checkbox" class="addon-checkbox" data-price="${pkg.insuranceCost}" onchange="toggleAddon(this)"></label>`,
        `<div class="extra esim-extra addon-extra"><label class="addon-label"><input type="checkbox" class="addon-checkbox" data-price="${pkg.esimCost}" onchange="toggleAddon(this)">${iconSvg('esim')}<div><div class="lab">eSIM / internet</div><div class="val tabular">+${fmtEUR(pkg.esimCost)}</div></div></label><button type="button" class="extra-btn" data-kind="esim" data-price="${pkg.esimCost}" data-url="${escapeHtml(pkg.esimBookUrl||'')}" onclick="bookItem(this)">Airalo</button></div>`
      ].filter(Boolean).join('');
      return extraTiles ? `<div class="extras-row">${extraTiles}</div>` : '';
    })()}
    <div class="confirm-banner">
      <span>${iconSvg('check')} Cena osnovnog paketa — dodaj osiguranje ili eSIM po želji.</span>
      <span><span class="amt-lab">Ukupno:</span><span class="amt tabular">${fmtEUR(pkg.total)}</span></span>
    </div>
    <button type="button" class="pkg-save-btn" onclick="saveSearchPackage('${pkg.tier}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
      Sačuvaj ovu ponudu
    </button>
    <button type="button" class="pkg-alert-btn" onclick="openAlertModal('search', '${pkg.tier}', ${pkg.total})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 3a5 5 0 00-5 5v3.2c0 .9-.35 1.75-.98 2.4L4.6 15h14.8l-1.42-1.4a3.4 3.4 0 01-.98-2.4V8a5 5 0 00-5-5z"/><path d="M9.5 19a2.6 2.6 0 005 0"/></svg>
      Javi mi kad padne cena
    </button>
  </div>`;
}

/* ==========================================================
   Prikaz rezultata za "Iznenadi me" — 3 RAZLIČITE destinacije
   (uvek 'best' tier) umesto 3 tier-a ISTE destinacije. Deli
   #resultsHead/#resultsBody sa običnom pretragom (isti kontejner),
   samo drugačiji sadržaj.
========================================================== */
function surprisePkgHtml(pick, idx, budget){
  const {dest, country, pkg} = pick;
  const itemsRow = [
    itemCardHtml(pkg.flight,'flight'),
    itemCardHtml(pkg.hotel,'hotel'),
    itemCardHtml(pkg.car,'car')
  ].filter(Boolean).join('');
  const fits = pkg.total <= budget;

  return `
  <div class="pkg surprise-pkg" data-base-total="${pkg.total}">
    <div class="pkg-head">
      <div>
        <span class="pkg-badge surprise-badge">🎲 Predlog</span>
        <h3>${escapeHtml(dest)}</h3>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;">${escapeHtml(country)} · Best Value</div>
      </div>
      <div class="pkg-total">
        <div class="num tabular">${fmtEUR(pkg.total)}</div>
        <div class="cur">ukupno</div>
        <div class="hint">zbir odvojenih rezervacija, ne jedno plaćanje</div>
      </div>
    </div>
    ${itemsRow ? `<div class="items-row">${itemsRow}</div>` : ''}
    <div class="confirm-banner">
      <span>${iconSvg('check')} ${fits ? 'Uklapa se u tvoj budžet od ' + fmtEUR(budget) + '.' : 'Malo iznad budžeta, ali najbliža opcija koju imamo.'}</span>
      <span><span class="amt-lab">Ukupno:</span><span class="amt tabular">${fmtEUR(pkg.total)}</span></span>
    </div>
    <button type="button" class="pkg-save-btn" onclick="exploreSurpriseDestination(${idx})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M9 18l6-6-6-6"/></svg>
      Vidi sve opcije za ${escapeHtml(dest)}
    </button>
    <button type="button" class="pkg-save-btn" onclick="saveSurprisePackage(${idx})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
      Sačuvaj ovu ponudu
    </button>
    <button type="button" class="pkg-alert-btn" onclick="openAlertModal('search', 'best', ${pkg.total}, '${escapeHtml(dest).replace(/'/g,"\\'")}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 3a5 5 0 00-5 5v3.2c0 .9-.35 1.75-.98 2.4L4.6 15h14.8l-1.42-1.4a3.4 3.4 0 01-.98-2.4V8a5 5 0 00-5-5z"/><path d="M9.5 19a2.6 2.6 0 005 0"/></svg>
      Javi mi kad padne cena
    </button>
  </div>`;
}

function renderSurpriseResults(picks, ctxBase, budget, usedFallback){
  window._lastSurprisePicks = picks;
  window._lastSurpriseCtx = ctxBase;

  const head = document.getElementById('resultsHead');
  head.innerHTML = `
    <div class="status-banner">
      <div class="status-left">
        <div class="status-check">🎲</div>
        <div><h3>3 predloga za budžet od ${fmtEUR(budget)}.</h3><p>${usedFallback ? 'Nijedan grad se u potpunosti nije uklopio u budžet — evo 3 najjeftinije opcije koje imamo.' : 'Nasumično odabrano od preko 100 gradova koji se uklapaju u tvoj budžet.'}</p></div>
      </div>
      <div class="status-pills">
        <div class="pill">${iconSvg('calendar')} ${fmtDate(ctxBase.from)} – ${fmtDate(ctxBase.to)}</div>
        <div class="pill">${iconSvg('people')} ${ctxBase.adults} putnik${ctxBase.adults==='1'?'':'a'}</div>
      </div>
    </div>
  `;

  const body = document.getElementById('resultsBody');
  body.innerHTML = `
    <div class="packages">${picks.map((p,i)=>surprisePkgHtml(p, i, budget)).join('')}</div>
    <button type="button" class="btn-alert surprise-reroll-btn" onclick="runSurpriseSearch(true)">🎲 Probaj druga 3 predloga</button>
    <p class="disclaimer">⚠️ Skoknica je trenutno u razvoju — prikazane cene su ilustrativan primer, generisan lokalno radi demonstracije, i <strong>nisu preuzete uživo</strong> sa partnerskih sajtova.</p>
  `;
}

async function runSurpriseSearch(isReroll){
  const budget = Number(document.getElementById('surpriseBudget').value);
  if (!budget || budget <= 0){ showToast('Unesi budžet veći od 0.'); return; }

  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  const adults = document.getElementById('adults').value;
  const flags = {
    flight:    document.querySelector('.toggle[data-t="flight"]').classList.contains('on'),
    hotel:     document.querySelector('.toggle[data-t="hotel"]').classList.contains('on'),
    car:       document.querySelector('.toggle[data-t="car"]').classList.contains('on'),
    activity:  document.querySelector('.toggle[data-t="activity"]').classList.contains('on'),
  };

  if (!isReroll) closeSurpriseModal();

  const results = document.getElementById('results');
  results.classList.add('visible');
  if (!isReroll){
    document.getElementById('resultsHead').innerHTML = '';
    document.getElementById('resultsBody').innerHTML = '<div class="loading"><div class="spin"></div>Tražimo 3 destinacije koje se uklapaju u tvoj budžet…</div>';
    results.scrollIntoView({behavior:'smooth', block:'start'});
  }

  state.searches += 1;
  document.getElementById('statLast').textContent = '🎲 ' + fmtEUR(budget);
  updateStats();

  setTimeout(()=>{
    const candidates = computeSurpriseCandidates(from, to, adults, flags);
    const {picks, usedFallback} = pickSurpriseDestinations(budget, candidates, 3);
    renderSurpriseResults(picks, {from, to, adults}, budget, usedFallback);
  }, isReroll ? 0 : 700);
}

// Klik na "Vidi sve opcije za {grad}" — prebacuje na normalnu pretragu
// (sva 3 tier-a) za taj konkretni grad, umesto samo 'best' predloga.
function exploreSurpriseDestination(idx){
  const pick = (window._lastSurprisePicks || [])[idx];
  if (!pick) return;
  document.getElementById('dest').value = pick.dest;
  runSearch(true);
}

async function saveSurprisePackage(idx){
  const user = await getCurrentUser();
  if (!user){
    _authBarExpanded = true;
    renderSavedTrips();
    document.getElementById('authBar').scrollIntoView({behavior:'smooth', block:'center'});
    showToast('Prijavi se emailom da sačuvaš ponudu.');
    return;
  }
  const pick = (window._lastSurprisePicks || [])[idx];
  const ctx = window._lastSurpriseCtx;
  if (!pick || !ctx){ showToast('Ponuda više nije dostupna — probaj ponovo.'); return; }

  const summaryTags = [
    '🎲 Iznenadi me',
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
    selection: {kind:'search', tier:'best', tierLabel:'Best Value (Iznenadi me)', summaryTags},
    total: pick.pkg.total
  });
  if (error){ showToast('Greška pri čuvanju: ' + error.message); return; }
  renderSavedTrips();
  showToast(pick.dest + ' sačuvan (' + fmtEUR(pick.pkg.total) + ').');
}

function openSurpriseModal(){
  document.getElementById('surpriseBudget').value = '';
  document.getElementById('surpriseModalBackdrop').classList.add('open');
  document.getElementById('surpriseModal').classList.add('open');
  document.getElementById('surpriseBudget').focus();
}
function closeSurpriseModal(){
  document.getElementById('surpriseModalBackdrop').classList.remove('open');
  document.getElementById('surpriseModal').classList.remove('open');
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
  state.clicks += 1;
  state.revenue += Math.round(price * 0.04); // mock ~4% affiliate commission
  updateStats();
  const labels = {
    flight:   'let na KAYAK-u',
    hotel:    'smeštaj na Booking.com',
    car:      'auto na Booking.com',
    activity: 'aktivnost na Viator-u',
    esim:     'eSIM na Airalo-u'
  };
  showToast('Klik zabeležen za ' + (labels[kind]||kind) + ' (' + fmtEUR(price) + ') · otvaram partnera…');
  if (url) window.open(url, '_blank', 'noopener');
}

function showToast(msg){
  const t = document.getElementById('toast');
  document.getElementById('toastText').textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('show'), 3200);
}

function updateStats(){
  document.getElementById('statSearches').textContent = state.searches;
  document.getElementById('statClicks').textContent = state.clicks;
  document.getElementById('statRevenue').textContent = fmtEUR(state.revenue);
}

/* ==========================================================
   FORM WIRING
========================================================== */
/* ---- "Polazak" (poreklo/origin) je bitno SAMO kad se traži let — za
   hotel/auto/aktivnosti nema smisla pitati odakle korisnik kreće. Polje
   se sakriva kad je "Letovi" toggle isključen (i to je podrazumevano
   stanje pri učitavanju stranice), a ponovo se pojavljuje čim se let
   uključi. Required atribut prati isto stanje, da prazno polje ne
   blokira slanje forme kad let uopšte nije deo pretrage. ---- */
function updateOriginVisibility(showOrigin){
  const stub = document.getElementById('originStub');
  const originInput = document.getElementById('origin');
  if (!stub || !originInput) return;
  stub.style.display = showOrigin ? '' : 'none';
  if (showOrigin) originInput.setAttribute('required', 'required');
  else originInput.removeAttribute('required');
}

document.querySelectorAll('.toggle').forEach(t=>{
  t.addEventListener('click', (e)=>{
    e.preventDefault();
    const input = t.querySelector('input');
    input.checked = !input.checked;
    t.classList.toggle('on', input.checked);
    if (t.dataset.t === 'flight') updateOriginVisibility(input.checked);
  });
});

// Postavi početno stanje u skladu sa checkbox-om koji je već markiran u HTML-u
// (trenutno "Letovi" nije uključen po default-u, pa se polje krije od starta).
updateOriginVisibility(document.querySelector('.toggle[data-t="flight"] input').checked);

async function runSearch(shouldScroll){
  const dest = document.getElementById('dest').value.trim() || 'Atina';
  const originCode = document.getElementById('origin').value.trim();
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  const adults = document.getElementById('adults').value;
  const flags = {
    flight:    document.querySelector('.toggle[data-t="flight"]').classList.contains('on'),
    hotel:     document.querySelector('.toggle[data-t="hotel"]').classList.contains('on'),
    car:       document.querySelector('.toggle[data-t="car"]').classList.contains('on'),
    activity:  document.querySelector('.toggle[data-t="activity"]').classList.contains('on'),
  };
  const nights = nightsBetween(from, to);
  const days = nights;

  const results = document.getElementById('results');
  results.classList.add('visible');
  document.getElementById('resultsHead').innerHTML = '';
  document.getElementById('resultsBody').innerHTML = '<div class="loading"><div class="spin"></div>Pretražujemo letove, smeštaj, aute i aktivnosti…</div>';
  if (shouldScroll) results.scrollIntoView({behavior:'smooth', block:'start'});

  state.searches += 1;
  document.getElementById('statLast').textContent = dest;
  updateStats();

  setTimeout(()=>{
    renderResults(dest, from, to, nights, days, adults, flags, originCode);
  }, 700);
}

document.getElementById('searchForm').addEventListener('submit', function(e){
  e.preventDefault();
  runSearch(true);
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
const BUILDER_DEFAULTS = {
  flightPref: 'direct',
  airlineName: '',
  hotelStars: 4,
  prioritizeRating: false,
  prioritizeLocation: false,
  carPref: 'small',
  activityCount: 2,
  budget: null
};
const builderState = Object.assign({}, BUILDER_DEFAULTS);

function builderCtx(){
  const dest = document.getElementById('dest').value.trim() || 'Atina';
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  const adults = Number(document.getElementById('adults').value) || 2;
  const nights = nightsBetween(from, to);
  return {dest, nights, days:nights, adults};
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
  const flightMult = {direct:1.05, cheapest:0.72, airline:1.15}[sel.flightPref];
  const flightPrice = Math.round(flightBase * flightMult * ctx.adults);
  const carriers = ['Wizz Air','Air Serbia','Ryanair','Aegean','Lufthansa'];
  // NAPOMENA: ako je flightPref==='airline' i ime je uneto, grana ispod
  // NE zove rng() (carriers[...] se preskače) — to je namerno, jer inače
  // bi svaki prelaz prazno/popunjeno polje pomerio redosled sledećih
  // rng() poziva (hotel, auto...) za jedno mesto. Pošto je ova grana
  // stabilna za SVAKI neprazan unos (bilo koje slovo znači "preskoči"),
  // cene se ne pomeraju dok korisnik kuca — samo pri prvom i poslednjem
  // karakteru (prazno ↔ nije prazno), što je prihvatljivo i retko.
  const flightName = sel.flightPref === 'airline' && sel.airlineName
    ? sel.airlineName + ' → ' + ctx.dest
    : carriers[Math.floor(rng()*carriers.length)] + ' → ' + ctx.dest;
  const flightSub = sel.flightPref === 'cheapest' ? 'jedno presedanje' : 'direktan let';

  // --- Hotel ---
  const hotelBasePerNight = {3:36, 4:66, 5:122}[sel.hotelStars] + rng()*22;
  let hotelMult = 1;
  if (sel.prioritizeRating) hotelMult += 0.10;
  if (sel.prioritizeLocation) hotelMult += 0.07;
  const hotelPrice = Math.round(hotelBasePerNight * hotelMult * ctx.nights * Math.ceil(ctx.adults/2));
  let hotelRating = {3:7.7, 4:8.6, 5:9.2}[sel.hotelStars] + rng()*0.25;
  if (sel.prioritizeRating) hotelRating += 0.25;
  hotelRating = Math.min(9.9, hotelRating);

  // --- Car ---
  const carPerDay = {none:0, small:31, suv:57}[sel.carPref] + (sel.carPref==='none'?0:rng()*11);
  const carPrice = Math.round(carPerDay * ctx.days);

  // --- Activities ---
  const perActivity = 21 + rng()*17;
  const activityPrice = Math.round(perActivity * sel.activityCount);

  // --- Gorivo i putarine (samo ako je auto uključen) ---
  const carExtras = sel.carPref === 'none' ? 0 : Math.round(18 + rng()*20);
  // --- Taksa za rezervaciju ---
  const bookingFee = Math.round(10 + rng()*10);

  const total = flightPrice + hotelPrice + carPrice + activityPrice + carExtras + bookingFee;

  return {
    flight: {price:flightPrice, name:flightName, sub:flightSub},
    hotel:  {price:hotelPrice, rating:Number(hotelRating.toFixed(1)), stars:sel.hotelStars},
    car:    {price:carPrice, pref:sel.carPref},
    activity: {price:activityPrice, count:sel.activityCount},
    carExtras: {price:carExtras},
    bookingFee: {price:bookingFee},
    total
  };
}

function renderBuilder(){
  const ctx = builderCtx();
  const pkg = computeCustomPackage(builderState, ctx);

  const lines = document.getElementById('builderLines');
  const rows = [
    ['✈️', 'Let', pkg.flight.price],
    ['🏨', 'Hotel', pkg.hotel.price],
  ];
  if (builderState.carPref !== 'none') rows.push(['🚗', 'Auto', pkg.car.price]);
  if (builderState.activityCount > 0) rows.push(['🎟️', 'Aktivnosti', pkg.activity.price]);
  if (pkg.carExtras.price > 0) rows.push(['⛽', 'Gorivo i putarine', pkg.carExtras.price]);
  rows.push(['🧾', 'Taksa za rezervaciju', pkg.bookingFee.price]);

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
    to: document.getElementById('dateTo').value
  });
  const bookBtns = [
    `<button type="button" class="item-btn flight" data-kind="flight" data-price="${pkg.flight.price}" data-url="${escapeHtml(buildAffiliateLink('flight', linkCtx))}" onclick="bookItem(this)">✈️ KAYAK</button>`,
    `<button type="button" class="item-btn hotel" data-kind="hotel" data-price="${pkg.hotel.price}" data-url="${escapeHtml(buildAffiliateLink('hotel', linkCtx))}" onclick="bookItem(this)">🏨 Booking.com</button>`
  ];
  if (builderState.carPref !== 'none'){
    bookBtns.push(`<button type="button" class="item-btn car" data-kind="car" data-price="${pkg.car.price}" data-url="${escapeHtml(buildAffiliateLink('car', linkCtx))}" onclick="bookItem(this)">🚗 Booking.com</button>`);
  }
  if (builderState.activityCount > 0){
    bookBtns.push(`<button type="button" class="item-btn" style="background:var(--aqua);" data-kind="activity" data-price="${pkg.activity.price}" data-url="${escapeHtml(buildAffiliateLink('activity', linkCtx))}" onclick="bookItem(this)">🎟️ Viator</button>`);
  }
  document.getElementById('builderBookLinks').innerHTML =
    '<div class="bbl-label">Rezerviši svaku stavku direktno kod partnera:</div>' +
    '<div class="builder-book-row">' + bookBtns.join('') + '</div>';
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

wireChipGroup('flightPref', (val)=>{
  builderState.flightPref = val;
  document.getElementById('airlineName').style.display = (val === 'airline') ? 'block' : 'none';
  renderBuilder();
});
document.getElementById('airlineName').addEventListener('input', (e)=>{
  builderState.airlineName = e.target.value.trim();
  renderBuilder();
});

wireChipGroup('hotelStars', (val)=>{
  builderState.hotelStars = Number(val);
  renderBuilder();
});

wireChipGroup('carPref', (val)=>{
  builderState.carPref = val;
  renderBuilder();
});

document.querySelectorAll('.toggle-chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    chip.classList.toggle('on');
    builderState[chip.dataset.toggle] = chip.classList.contains('on');
    renderBuilder();
  });
});

document.getElementById('actMinus').addEventListener('click', ()=>{
  builderState.activityCount = Math.max(0, builderState.activityCount - 1);
  document.getElementById('actCount').textContent = builderState.activityCount;
  renderBuilder();
});
document.getElementById('actPlus').addEventListener('click', ()=>{
  builderState.activityCount = Math.min(8, builderState.activityCount + 1);
  document.getElementById('actCount').textContent = builderState.activityCount;
  renderBuilder();
});

// Gornja granica je namerno velikodušna (niko realno ne planira izlet
// preko ovoga), samo sprečava apsurdne unose tipa "1e10" ili slučajno
// dodat nepotreban nule. Budžet mora biti ceo broj > 0, ne negativan
// i ne decimalan — sve ostalo se ili odbacuje (null) ili zaokružuje/seče.
const MAX_BUDGET = 50000;

document.getElementById('budgetInput').addEventListener('input', (e)=>{
  const raw = e.target.value;
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
    if (String(clamped) !== raw) e.target.value = clamped;
    builderState.budget = clamped;
  }
  renderBuilder();
});

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
        document.querySelectorAll('.chip-row[data-group="hotelStars"] .chip').forEach(c=>{
          c.classList.toggle('on', Number(c.dataset.value) === testSel.hotelStars);
        });
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
        document.querySelectorAll('.chip-row[data-group="carPref"] .chip').forEach(c=>{
          c.classList.toggle('on', c.dataset.value === testSel.carPref);
        });
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
        document.getElementById('actCount').textContent = testSel.activityCount;
      }
    });
  }

  const box = document.getElementById('optimizeResult');
  box.style.display = 'block';

  const viable = candidates.filter(c => c.savings > 0).sort((a,b) => b.savings - a.savings);
  if (!viable.length) {
    box.innerHTML = candidates.length
      ? '<span class="save">Aranžman je već optimalan</span>Proverili smo hotel, auto i broj aktivnosti — trenutna kombinacija je već najjeftinija za odabrane kriterijume.'
      : '<span class="save">Aranžman je već optimalan</span>Već si na najnižim opcijama za sve stavke — nema očiglednog mesta za uštedu bez gubitka udobnosti.';
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
    showToast('Aranžman ažuriran — ' + best.toastMsg);
  });
});

document.getElementById('makeBuilderBtn').addEventListener('click', ()=>{
  const destInput = document.getElementById('dest');
  if (!destInput.value.trim()){
    showToast('Unesi destinaciju da bismo napravili aranžman.');
    destInput.focus();
    destInput.scrollIntoView({behavior:'smooth', block:'center'});
    return;
  }
  renderBuilder();
  document.getElementById('builderSummary').style.display = 'block';
  document.getElementById('builderPlaceholder').style.display = 'none';
});

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
    document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
    runSearch(false);
  });
});

/* ==========================================================
   MOJA PUTOVANJA — Supabase (auth.users + trips tabela).
   Prijava je email magic-link (OTP), ne treba Google/OAuth podesavanje.
   Ako Supabase iz nekog razloga ne odgovori (mreza, pogresan kljuc),
   sekcija samo ostaje prazna — ne obara ostatak sajta.
========================================================== */
const sb = window.supabase.createClient(window.SKOKNICA_SUPABASE_URL, window.SKOKNICA_SUPABASE_KEY);

async function getCurrentUser(){
  try {
    const { data } = await sb.auth.getUser();
    return (data && data.user) || null;
  } catch(err){
    console.warn('[skoknica] auth nedostupan:', err.message);
    return null;
  }
}

let _authBarExpanded = false;
function renderAuthPanel(containerId, user){
  const bar = document.getElementById(containerId);
  if (!bar) return;
  const emailId = containerId + '_email';
  const loginBtnId = containerId + '_loginBtn';
  const logoutBtnId = containerId + '_logoutBtn';
  // U glavnoj sekciji ("authBar") ne guramo email formu odmah u lice —
  // prvo je tih link, forma se otvara tek kad korisnik zaista hoće da sačuva.
  // U dropdown-u iz topbar-a (containerId "authDropdown") forma je uvek otvorena,
  // jer je korisnik tamo već svesno kliknuo na ikonicu naloga.
  const compact = containerId === 'authBar';
  if (user){
    bar.innerHTML = `
      <div class="auth-row">
        <span class="auth-status">Ulogovan kao <strong>${escapeHtml(user.email)}</strong></span>
        <button type="button" class="auth-btn" id="${logoutBtnId}">Izloguj se</button>
      </div>`;
    document.getElementById(logoutBtnId).addEventListener('click', async ()=>{
      await sb.auth.signOut();
      renderSavedTrips();
    });
  } else if (compact && !_authBarExpanded){
    bar.innerHTML = `<button type="button" class="auth-link" id="${loginBtnId}_reveal">Prijavi se da sačuvaš aranžmane →</button>`;
    document.getElementById(loginBtnId + '_reveal').addEventListener('click', ()=>{
      _authBarExpanded = true;
      renderAuthPanel(containerId, user);
    });
  } else {
    const pwId = emailId + '_pw';
    bar.innerHTML = `
      <div class="auth-row">
        <input type="email" id="${emailId}" class="auth-input" placeholder="tvoj@email.com" autocomplete="email">
        <input type="password" id="${pwId}" class="auth-input" placeholder="lozinka (min 6 karaktera)" autocomplete="current-password">
        <button type="button" class="auth-btn" id="${loginBtnId}">Prijavi se / Napravi nalog</button>
      </div>
      <p class="auth-hint">Prva prijava sa ovim emailom i lozinkom automatski pravi nalog — zapamti lozinku, nema linka za oporavak dok sajt ne bude na pravom domenu.</p>`;
    document.getElementById(emailId).focus();
    document.getElementById(loginBtnId).addEventListener('click', async ()=>{
      const email = document.getElementById(emailId).value.trim();
      const password = document.getElementById(pwId).value;
      if (!email || !password){ showToast('Unesi email i lozinku.'); return; }
      if (password.length < 6){ showToast('Lozinka mora imati bar 6 karaktera.'); return; }

      const { error: signInError } = await sb.auth.signInWithPassword({ email, password });
      if (!signInError){
        renderSavedTrips();
        showToast('Prijavljen kao ' + email + '.');
        return;
      }

      // Ako prijava ne uspe (nalog jos ne postoji), probaj da ga napravis odmah.
      const { error: signUpError } = await sb.auth.signUp({ email, password });
      if (signUpError){ showToast('Greška: ' + signUpError.message); return; }
      renderSavedTrips();
      showToast('Nalog napravljen i prijavljen kao ' + email + '.');
    });
  }
}

/* ---- Topbar: hamburger meni (mobilni) + dropdown za prijavu ---- */
const mobilePanel = document.getElementById('mobilePanel');
const authDropdown = document.getElementById('authDropdown');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const topAvatarBtn = document.getElementById('topAvatarBtn');

hamburgerBtn.addEventListener('click', ()=>{
  authDropdown.classList.remove('open');
  mobilePanel.classList.toggle('open');
  hamburgerBtn.classList.toggle('open', mobilePanel.classList.contains('open'));
});
topAvatarBtn.addEventListener('click', ()=>{
  mobilePanel.classList.remove('open');
  hamburgerBtn.classList.remove('open');
  authDropdown.classList.toggle('open');
});
document.addEventListener('click', (e)=>{
  if (!e.target.closest('#authDropdown') && !e.target.closest('#topAvatarBtn')) authDropdown.classList.remove('open');
  if (!e.target.closest('#mobilePanel') && !e.target.closest('#hamburgerBtn')){
    mobilePanel.classList.remove('open');
    hamburgerBtn.classList.remove('open');
  }
});


function tierLabelsForSaved(sel){
  if (sel.summaryTags) return sel.summaryTags;
  const flightLabels = {direct:'Direktan let', cheapest:'Najjeftiniji let', airline: sel.airlineName || 'Određena kompanija'};
  const carLabels = {none:'Bez auta', small:'Mali auto', suv:'SUV'};
  return [
    flightLabels[sel.flightPref] || 'Let',
    sel.hotelStars + '★ hotel',
    carLabels[sel.carPref] || 'Auto',
    sel.activityCount + ' aktivnosti'
  ];
}

/* ---------- Poređenje sačuvanih aranžmana ----
   Korisnik čekira do 3 kartice; čim su 2+ čekirane, ispod liste se
   pojavljuje tabela koja ih upoređuje jednu pored druge. Ne pravi se
   novi network poziv pri čekiranju — koristi se _lastSavedTripsCache
   iz poslednjeg fetchSavedTrips() poziva. ---------- */
let compareIds = new Set();
let _lastSavedTripsCache = [];
const COMPARE_MAX = 3;

function renderCompareTable(){
  const wrap = document.getElementById('compareWrap');
  if (!wrap) return;
  const selected = _lastSavedTripsCache.filter(t => compareIds.has(t.id));
  if (selected.length < 2){
    wrap.style.display = 'none';
    wrap.innerHTML = '';
    return;
  }
  const cheapest = Math.min(...selected.map(t => t.total));
  wrap.style.display = 'block';
  wrap.innerHTML = `
    <div class="compare-head">
      <div class="eyebrow">Poređenje</div>
      <h3>Uporedi ${selected.length} sačuvana aranžmana</h3>
    </div>
    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead>
          <tr>
            <th></th>
            ${selected.map(t => `<th>${escapeHtml(t.dest)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr><td>Datumi</td>${selected.map(t => `<td>${fmtDate(t.from)} – ${fmtDate(t.to)}</td>`).join('')}</tr>
          <tr><td>Putnika</td>${selected.map(t => `<td>${t.adults}</td>`).join('')}</tr>
          <tr><td>Detalji</td>${selected.map(t => `<td>${tierLabelsForSaved(t.sel).map(l => escapeHtml(l)).join('<br>')}</td>`).join('')}</tr>
          <tr class="compare-total-row">
            <td>Procenjeno ukupno</td>
            ${selected.map(t => `<td class="tabular${t.total === cheapest ? ' compare-best' : ''}">${fmtEUR(t.total)}${t.total === cheapest ? '<span class="compare-badge">najjeftinije</span>' : ''}</td>`).join('')}
          </tr>
        </tbody>
      </table>
    </div>
    <button type="button" class="compare-clear" id="compareClearBtn">Očisti poređenje</button>
  `;
  document.getElementById('compareClearBtn').addEventListener('click', () => {
    compareIds.clear();
    renderSavedTripsMarkup(_lastSavedTripsCache);
  });
}

function renderSavedTripsMarkup(trips){
  const wrap = document.getElementById('savedTripsList');
  if (!trips.length){
    wrap.innerHTML = '<div class="saved-empty">Još nema sačuvanih aranžmana. Podesi izbore u builderu iznad i klikni <strong>„Sačuvaj aranžman“</strong>.</div>';
    renderCompareTable();
    return;
  }
  wrap.innerHTML = '<div class="saved-grid">' + trips.map(t => `
    <div class="saved-card" data-id="${t.id}">
      <label class="sc-compare">
        <input type="checkbox" class="sc-compare-cb" data-id="${t.id}"
          ${compareIds.has(t.id) ? 'checked' : ''}
          ${(!compareIds.has(t.id) && compareIds.size >= COMPARE_MAX) ? 'disabled' : ''}>
        <span>Uporedi</span>
      </label>
      <div class="sc-dest">${escapeHtml(t.dest)}</div>
      <div class="sc-meta">${fmtDate(t.from)} – ${fmtDate(t.to)} · ${t.adults} putnik${t.adults==='1'?'':'a'}</div>
      <div class="sc-tags">${tierLabelsForSaved(t.sel).map(l => `<span class="sc-tag">${escapeHtml(l)}</span>`).join('')}</div>
      <div class="sc-total"><span class="lab">procenjeno ukupno</span><span class="num tabular">${fmtEUR(t.total)}</span></div>
      <div class="sc-actions">
        <button type="button" class="sc-btn load" onclick="loadSavedTrip('${t.id}')">Učitaj</button>
        <button type="button" class="sc-btn del" onclick="deleteSavedTrip('${t.id}')">Obriši</button>
      </div>
    </div>`).join('') + '</div>';

  wrap.querySelectorAll('.sc-compare-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) compareIds.add(cb.dataset.id);
      else compareIds.delete(cb.dataset.id);
      renderSavedTripsMarkup(_lastSavedTripsCache);
    });
  });

  renderCompareTable();
}

async function fetchSavedTrips(){
  const { data, error } = await sb.from('trips').select('*').order('created_at', {ascending:false});
  if (error){ console.warn('[skoknica] ucitavanje putovanja nije uspelo:', error.message); return []; }
  return data.map(row => ({
    id: row.id,
    dest: row.dest,
    from: row.date_from,
    to: row.date_to,
    adults: String(row.adults),
    sel: row.selection,
    total: row.total
  }));
}

async function renderSavedTrips(){
  const user = await getCurrentUser();
  renderAuthPanel('authBar', user);
  renderAuthPanel('authDropdown', user);
  topAvatarBtn.classList.toggle('logged-in', !!user);
  const wrap = document.getElementById('savedTripsList');

  if (!user){
    wrap.innerHTML = '<div class="saved-empty">Prijavi se emailom iznad da vidiš i čuvaš svoje aranžmane — čuvaju se na nalogu, ne u ovom pregledaču.</div>';
    _lastSavedTripsCache = [];
    compareIds.clear();
    renderCompareTable();
    return;
  }

  const trips = await fetchSavedTrips();
  _lastSavedTripsCache = trips;
  // ukloni iz poređenja sve id-jeve koji više ne postoje (npr. obrisan aranžman)
  const stillExists = new Set(trips.map(t => t.id));
  compareIds.forEach(id => { if (!stillExists.has(id)) compareIds.delete(id); });

  renderSavedTripsMarkup(trips);
}

async function saveSavedTrip(){
  const user = await getCurrentUser();
  if (!user){
    _authBarExpanded = true;
    renderSavedTrips();
    document.getElementById('authBar').scrollIntoView({behavior:'smooth', block:'center'});
    showToast('Prijavi se emailom da sačuvaš aranžman.');
    return;
  }
  const ctx = builderCtx();
  const pkg = window._lastBuilderPkg || computeCustomPackage(builderState, ctx);
  const { error } = await sb.from('trips').insert({
    user_id: user.id,
    dest: ctx.dest,
    date_from: document.getElementById('dateFrom').value,
    date_to: document.getElementById('dateTo').value,
    adults: Number(document.getElementById('adults').value),
    selection: Object.assign({kind:'builder'}, builderState),
    total: pkg.total
  });
  if (error){ showToast('Greška pri čuvanju: ' + error.message); return; }
  renderSavedTrips();
  showToast('Aranžman za ' + ctx.dest + ' sačuvan (' + fmtEUR(pkg.total) + ').');
}

/* ---- Čuvanje jedne od 3 gotove ponude iz pretrage (Budget/Best/Comfort) ----
   Za razliku od buildera, ovde nema builderState da se sačuva/vrati — pamtimo
   samo prikazne oznake (summaryTags) i tier, dovoljno da se kartica lepo prikaže
   na listi. "Učitaj" za ovaj tip ponovo pokreće pretragu sa istim parametrima,
   umesto da puni builder (jer selekcija nije builder-oblika). */
async function saveSearchPackage(tier){
  const user = await getCurrentUser();
  if (!user){
    _authBarExpanded = true;
    renderSavedTrips();
    document.getElementById('authBar').scrollIntoView({behavior:'smooth', block:'center'});
    showToast('Prijavi se emailom da sačuvaš ponudu.');
    return;
  }
  const pkg = (window._lastSearchPkgs || []).find(p => p.tier === tier);
  const ctx = window._lastSearchCtx;
  if (!pkg || !ctx){ showToast('Ponuda više nije dostupna — pretraži ponovo.'); return; }

  const summaryTags = [
    TIER_META[tier].label,
    pkg.flight ? pkg.flight.name : 'Bez leta',
    pkg.hotel ? pkg.hotel.name : 'Bez hotela',
    pkg.car ? 'Sa autom' : 'Bez auta'
  ];

  const { error } = await sb.from('trips').insert({
    user_id: user.id,
    dest: ctx.dest,
    date_from: ctx.from,
    date_to: ctx.to,
    adults: Number(ctx.adults),
    selection: {kind:'search', tier, tierLabel: TIER_META[tier].label, summaryTags},
    total: pkg.total
  });
  if (error){ showToast('Greška pri čuvanju: ' + error.message); return; }
  renderSavedTrips();
  showToast(TIER_META[tier].label + ' ponuda za ' + ctx.dest + ' sačuvana (' + fmtEUR(pkg.total) + ').');
}

async function loadSavedTrip(id){
  const trips = await fetchSavedTrips();
  const t = trips.find(x => x.id === id);
  if (!t) return;

  document.getElementById('dest').value = t.dest;
  document.getElementById('dateFrom').value = t.from;
  document.getElementById('dateTo').value = t.to;
  document.getElementById('adults').value = t.adults;

  // Sačuvane ponude iz pretrage (Budget/Best/Comfort) nisu builder-oblika —
  // za njih nema šta da se "vrati" u builder chipove, samo ponovo pretražujemo
  // sa istim parametrima i korisnik opet vidi sve 3 ponude.
  if (t.sel && t.sel.kind === 'search'){
    document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
    showToast('Ponovo pretražujem za ' + t.dest + ' (' + (t.sel.tierLabel||'') + ')…');
    runSearch(false);
    return;
  }

  // Prvo reset na BUILDER_DEFAULTS, pa tek onda t.sel preko toga — tako
  // svako polje koje nedostaje u starom sačuvanom zapisu dobije siguran
  // fallback umesto da nasledi stanje iz prethodno učitanog aranžmana.
  Object.assign(builderState, BUILDER_DEFAULTS, t.sel);

  document.querySelectorAll('.chip-row[data-group="flightPref"] .chip').forEach(c=>{
    c.classList.toggle('on', c.dataset.value === builderState.flightPref);
  });
  document.getElementById('airlineName').style.display = (builderState.flightPref === 'airline') ? 'block' : 'none';
  document.getElementById('airlineName').value = builderState.airlineName || '';

  document.querySelectorAll('.chip-row[data-group="hotelStars"] .chip').forEach(c=>{
    c.classList.toggle('on', Number(c.dataset.value) === builderState.hotelStars);
  });
  document.querySelectorAll('.chip-row[data-group="carPref"] .chip').forEach(c=>{
    c.classList.toggle('on', c.dataset.value === builderState.carPref);
  });
  document.querySelectorAll('.toggle-chip').forEach(chip=>{
    chip.classList.toggle('on', !!builderState[chip.dataset.toggle]);
  });
  document.getElementById('actCount').textContent = builderState.activityCount;

  renderBuilder();
  document.getElementById('builderSummary').style.display = 'block';
  document.getElementById('builderPlaceholder').style.display = 'none';
  document.querySelector('.builder-wrap').scrollIntoView({behavior:'smooth', block:'start'});
  showToast('Učitan sačuvani aranžman za ' + t.dest + '.');
}

async function deleteSavedTrip(id){
  const { error } = await sb.from('trips').delete().eq('id', id);
  if (error){ showToast('Greška pri brisanju: ' + error.message); return; }
  renderSavedTrips();
}

document.getElementById('saveTripBtn').addEventListener('click', saveSavedTrip);
sb.auth.onAuthStateChange(()=> renderSavedTrips());
renderSavedTrips();

/* ==========================================================
   PRICE ALERTS — "Javi mi kad padne cena"
   Otvara se sa dugmeta na svakoj gotovoj ponudi (Budget/Best/Comfort)
   ili sa dugmeta u builderu. Upisuje red direktno u price_alerts preko
   anon ključa (RLS na toj tabeli dozvoljava SAMO insert — vidi
   supabase/price_alerts.sql), bez potrebe za nalogom/prijavom.
   Periodičnu proveru i slanje mejla radi poseban Cloudflare Worker
   (worker/price-alert-worker.js), ne ovaj fajl.
========================================================== */
let _alertCtx = null;

function openAlertModal(kind, tierOrNull, currentPrice, destOverride){
  const ctx = builderCtx();
  const dest = destOverride || ctx.dest;
  const selection = (kind === 'search')
    ? {kind:'search', tier:tierOrNull, tierLabel:(TIER_META[tierOrNull]||{}).label || ''}
    : Object.assign({kind:'builder'}, builderState);

  _alertCtx = {
    dest: dest,
    from: document.getElementById('dateFrom').value,
    to: document.getElementById('dateTo').value,
    adults: Number(document.getElementById('adults').value) || 2,
    selection,
    price: Math.round(currentPrice)
  };

  document.getElementById('alertModalSub').textContent =
    'Trenutna procena za ' + dest + ': ' + fmtEUR(_alertCtx.price) + '. Javićemo ti mejlom kad procenjena cena padne ispod praga koji postaviš.';
  document.getElementById('alertThreshold').value = Math.max(1, Math.round(_alertCtx.price * 0.9));
  document.getElementById('alertEmail').value = '';

  document.getElementById('alertModalBackdrop').classList.add('open');
  document.getElementById('alertModal').classList.add('open');
  document.getElementById('alertEmail').focus();
}

function closeAlertModal(){
  document.getElementById('alertModalBackdrop').classList.remove('open');
  document.getElementById('alertModal').classList.remove('open');
}

document.getElementById('alertBuilderBtn').addEventListener('click', ()=>{
  const ctx = builderCtx();
  const pkg = window._lastBuilderPkg || computeCustomPackage(builderState, ctx);
  openAlertModal('builder', null, pkg.total);
});

document.getElementById('alertModalBackdrop').addEventListener('click', closeAlertModal);
document.getElementById('alertModalClose').addEventListener('click', closeAlertModal);
document.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape' && document.getElementById('alertModal').classList.contains('open')) closeAlertModal();
});

document.getElementById('alertModalSubmit').addEventListener('click', async ()=>{
  if (!_alertCtx) return;
  const email = document.getElementById('alertEmail').value.trim();
  const threshold = Number(document.getElementById('alertThreshold').value);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ showToast('Unesi ispravan email.'); return; }
  if (!threshold || threshold <= 0){ showToast('Unesi ispravan prag u evrima.'); return; }

  const submitBtn = document.getElementById('alertModalSubmit');
  submitBtn.disabled = true;

  const { error } = await sb.from('price_alerts').insert({
    email,
    dest: _alertCtx.dest,
    date_from: _alertCtx.from,
    date_to: _alertCtx.to,
    adults: _alertCtx.adults,
    selection: _alertCtx.selection,
    threshold,
    last_price: _alertCtx.price
  });

  submitBtn.disabled = false;

  if (error){ showToast('Greška pri postavljanju alerta: ' + error.message); return; }

  closeAlertModal();
  showToast('Gotovo — javićemo ti na ' + email + ' kad cena padne ispod ' + fmtEUR(threshold) + '.');
});

/* ==========================================================
   "IZNENADI ME" — wiring dugmeta i modala
========================================================== */
document.getElementById('surpriseModalBackdrop').addEventListener('click', closeSurpriseModal);
document.getElementById('surpriseModalClose').addEventListener('click', closeSurpriseModal);
document.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape' && document.getElementById('surpriseModal').classList.contains('open')) closeSurpriseModal();
});
document.getElementById('surpriseTriggerBtn').addEventListener('click', openSurpriseModal);
document.getElementById('surpriseModalSubmit').addEventListener('click', ()=> runSurpriseSearch(false));
document.getElementById('surpriseBudget').addEventListener('keydown', (e)=>{
  if (e.key === 'Enter'){ e.preventDefault(); runSurpriseSearch(false); }
});
