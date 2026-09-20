/* Živa raspodela cene paketa (dva scenarija). Čita GET {SKLOPI_API_BASE}/api/price-mix
   (vidi worker/price-mix.js) i osvežava postojeće redove u .price-hbar-list.
   Ako backend nije podešen ili ne odgovori, ostaju statične vrednosti iz HTML-a. */
(function () {
  var BASE = (window.SKLOPI_API_BASE || '').replace(/\/$/, '');
  var list = document.querySelector('.price-hbar-list');
  if (!list) return;

  var TXT = {
    sr: { upd: 'Ažurirano', live: 'cene letova iz tržišnih podataka', per: 'po osobi', d: 'dana', n: 'noći',
          tabs: { road: 'Sa rentakarom', city: 'Avion + hotel' },
          what: { road: 'avion + hotel 4★ + mali rentakar', city: 'avion + hotel 4★ + transfer' },
          share: { road: 'dvoje putnika dele sobu i auto', city: 'dvoje putnika dele sobu' },
          names: { flight: 'letovi', hotel: 'smeštaj', car: 'auto i gorivo', activity: 'aktivnosti', transfer: 'transferi', insurance: 'osiguranje', tolls: 'putarine', esim: 'eSIM' },
          aria: 'Raspodela cene paketa po osobi', eur: 'evra', about: 'oko' },
    en: { upd: 'Updated', live: 'flight prices from market data', per: 'per person', d: 'days', n: 'nights',
          tabs: { road: 'With rental car', city: 'Flight + hotel' },
          what: { road: 'flight + 4★ hotel + small rental car', city: 'flight + 4★ hotel + transfer' },
          share: { road: 'two travellers share room and car', city: 'two travellers share a room' },
          names: { flight: 'flights', hotel: 'stay', car: 'car & fuel', activity: 'activities', transfer: 'transfers', insurance: 'insurance', tolls: 'tolls', esim: 'eSIM' },
          aria: 'Package price breakdown per person', eur: 'euros', about: '≈' },
    ru: { upd: 'Обновлено', live: 'цены на перелёты — рыночные данные', per: 'на человека', d: 'дн.', n: 'ноч.',
          tabs: { road: 'С арендой авто', city: 'Перелёт + отель' },
          what: { road: 'перелёт + отель 4★ + малый прокатный авто', city: 'перелёт + отель 4★ + трансфер' },
          share: { road: 'двое делят номер и авто', city: 'двое делят номер' },
          names: { flight: 'перелёты', hotel: 'жильё', car: 'авто и топливо', activity: 'активности', transfer: 'трансферы', insurance: 'страховка', tolls: 'платные дороги', esim: 'eSIM' },
          aria: 'Структура цены пакета на человека', eur: 'евро', about: '≈' }
  };
  var LOCALE = { sr: 'sr-Latn', en: 'en', ru: 'ru' };
  var lang = function () { try { var l = getLang(); return TXT[l] ? l : 'sr'; } catch (e) { return 'sr'; } };


  /* ====== CENE — menjaj samo brojeve ovde (u evrima), ostalo se preračuna samo ======
     Datum promene upiši u UPDATED. */
  var UPDATED = '2026-09-20';
  var P = {
    flight: 190,        // let, povratna karta po osobi
    hotel_night_4: 77,  // hotel 4★, cela soba po noći
    car_day: 36,        // mali rentakar po danu
    fuel_eur_l: 1.95,   // gorivo €/l
    km_trip: 600,       // km vožnje
    l_per_100km: 6,     // potrošnja
    toll_eur_km: 0.05,  // putarine €/km
    activity_each: 30,  // jedna aktivnost
    transfer: 25,       // transfer aerodrom–smeštaj
    insurance: 20,      // osiguranje po osobi
    esim: 10            // eSIM po osobi
  };
  /* ================================================================================= */
  var SCN = { road: { nights: 6, days: 7, car: true, transfer: false, activities: 3 },
              city: { nights: 4, days: 5, car: false, transfer: true, activities: 2 } };
  function localData() {
    var out = {};
    Object.keys(SCN).forEach(function (id) {
      var sc = SCN[id], e = { flight: P.flight, hotel: Math.round(P.hotel_night_4 * sc.nights / 2),
        activity: Math.round(P.activity_each * sc.activities), insurance: P.insurance, esim: P.esim };
      if (sc.car) {
        e.car = Math.round((P.car_day * sc.days + P.km_trip * P.l_per_100km / 100 * P.fuel_eur_l) / 2);
        e.tolls = Math.round(P.km_trip * P.toll_eur_km / 2);
      }
      if (sc.transfer) e.transfer = P.transfer;
      var ks = Object.keys(e), tot = 0, pct = {}, used = 0;
      ks.forEach(function (k) { tot += e[k]; });
      ks.forEach(function (k) { pct[k] = Math.floor(e[k] / tot * 100); used += pct[k]; });
      ks.slice().sort(function (a, b) { return (e[b] / tot * 100 % 1) - (e[a] / tot * 100 % 1); })
        .slice(0, 100 - used).forEach(function (k) { pct[k]++; });
      out[id] = { nights: sc.nights, days: sc.days, total: tot,
        items: ks.map(function (k) { return { key: k, eur: e[k], pct: pct[k], delta: null, live: false }; })
                 .sort(function (a, b) { return b.eur - a.eur; }) };
    });
    return { updated: UPDATED, default: 'road', scenarios: out };
  }

  var data = null, current = null;
  var tabs = document.createElement('div'); tabs.className = 'chip-row price-chart-tabs'; tabs.hidden = true;
  var scn = document.createElement('p'); scn.className = 'price-chart-scn'; scn.hidden = true;
  var stamp = document.createElement('p'); stamp.className = 'price-chart-updated'; stamp.hidden = true;
  list.parentNode.insertBefore(tabs, list);
  list.parentNode.insertBefore(scn, list);
  var foot = document.querySelector('.price-chart-foot');
  if (foot) foot.parentNode.insertBefore(stamp, foot);

  function rowOf(key) { var f = list.querySelector('.phr-fill--' + key); return f ? f.closest('.phr-row') : null; }

  function render() {
    if (!data || !data.scenarios) return;
    var T = TXT[lang()], ids = Object.keys(data.scenarios);
    if (!current || !data.scenarios[current]) current = data['default'] && data.scenarios[data['default']] ? data['default'] : ids[0];
    var S = data.scenarios[current];

    // tabovi
    tabs.textContent = '';
    ids.forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip' + (id === current ? ' on' : '');
      b.setAttribute('aria-pressed', id === current ? 'true' : 'false');
      b.textContent = T.tabs[id] || id;
      b.addEventListener('click', function () { current = id; render(); });
      tabs.appendChild(b);
    });
    tabs.hidden = ids.length < 2;
    scn.textContent = S.days + ' ' + T.d + ' · ' + S.nights + ' ' + T.n + ' · ' + (T.what[current] || '') + ' · ' + T.per + ' (' + (T.share[current] || '') + ')';
    scn.hidden = false;

    // redovi: sakrij one kojih nema u scenariju
    var present = {}, parts = [];
    S.items.forEach(function (it) { present[it.key] = true; });
    Array.prototype.forEach.call(list.querySelectorAll('.phr-fill'), function (f) {
      var k = (f.className.match(/phr-fill--(\w+)/) || [])[1];
      if (k && !present[k]) f.closest('.phr-row').hidden = true;
    });
    S.items.forEach(function (it) {
      var row = rowOf(it.key);
      if (!row) return;
      row.hidden = false;
      row.querySelector('.phr-fill').style.width = it.pct + '%';
      row.querySelector('.phr-pct').textContent = it.pct + '%';
      row.querySelector('.phr-eur').textContent = '≈ €' + it.eur;
      var el = row.querySelector('.phr-delta');
      if (it.delta != null && Math.abs(it.delta) >= 1) {
        if (!el) { el = document.createElement('span'); row.querySelector('.phr-nums').appendChild(el); }
        el.className = 'phr-delta phr-delta--' + (it.delta > 0 ? 'up' : 'down');
        el.textContent = (it.delta > 0 ? '▲ ' : '▼ ') + Math.abs(it.delta).toFixed(it.delta % 1 ? 1 : 0) + '%';
      } else if (el) { el.remove(); }
      list.appendChild(row); // stavke stižu sortirane od najveće ka najmanjoj
      parts.push(T.names[it.key] + ' ' + it.pct + '% ' + T.about + ' ' + it.eur + ' ' + T.eur);
    });
    list.setAttribute('aria-label', T.aria + ' (' + T.tabs[current] + '): ' + parts.join(', '));

    var when = new Date(data.updated).toLocaleDateString(LOCALE[lang()], { day: 'numeric', month: 'short' });
    var live = S.items.some(function (i) { return i.live; });
    stamp.textContent = T.upd + ' ' + when + (live ? ' · ' + T.live : '');
    stamp.hidden = false;
  }

  function load() {
    if (!BASE) { data = localData(); render(); return; }
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl && setTimeout(function () { ctrl.abort(); }, 6000);
    fetch(BASE + '/api/price-mix', { signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { data = d; render(); })
      .catch(function (e) { console.warn('[sklopi] price-mix nedostupan, koristim lokalne cene:', e.message || e); if (!data) { data = localData(); render(); } })
      .then(function () { if (timer) clearTimeout(timer); });
  }

  load();
  if (BASE) document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
  if (BASE) setInterval(load, 30 * 60 * 1000);

  var prevLang = window.onLangChange;
  window.onLangChange = function (l) { if (typeof prevLang === 'function') prevLang(l); render(); };
})();
