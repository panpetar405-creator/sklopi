/* ==========================================================
   SKLOPI — Destination Info Panel (dest-info.js)
   ----------------------------------------------------------
   Ubaci u index.html NAKON app.js:
     <script src="dest-info.js" defer></script>

   HTML koji treba dodati u index.html iza #activitiesDetail
   i pre #extrasDetail (unutar #planBreakdown):

     <!-- DEST INFO PANEL -->
     <section class="section flight-detail-section" id="destInfoSection" aria-labelledby="destInfoTitle">
       <div class="ad-head">
         <h2 id="destInfoTitle">O destinaciji</h2>
         <p id="destInfoSub">Sve što treba da znaš pre polaska.</p>
       </div>
       <div id="destInfoBody">
         <div class="dest-info-skeleton" id="destInfoSkeleton" hidden>
           <div class="di-skel-row"></div><div class="di-skel-row di-skel-short"></div>
           <div class="di-skel-grid">
             <div class="di-skel-card"></div><div class="di-skel-card"></div>
           </div>
           <div class="di-skel-card di-skel-full"></div>
         </div>
         <div id="destInfoContent" hidden></div>
         <p class="fd-note di-disclaimer" id="destInfoDisclaimer" hidden>
           ⚠️ Info generiše AI radi orijentacije — pred put uvek proveri na sajtu ambasade i kod avio-kompanije.
         </p>
       </div>
     </section>
     <!-- / DEST INFO PANEL -->

   CSS koji treba dodati u styles.css (ili u <style> tag u <head>):
   Vidi dest-info.css koji dolazi uz ovaj fajl.
========================================================== */

(function () {
  'use strict';

  /* ── State ── */
  var _currentDest = '';
  var _currentKey = '';
  var _cache = {};          // dest → parsed JSON
  var _reqId = 0;           // za race-condition zaštitu
  // Poziva tvoj Worker (ključ za Groq stoji samo tamo, kao Secret).
  var DEST_INFO_URL = '/api/dest-info';  // ruta u tvom Worker-u (isti domen kao sajt)


  /* ── Jezik panela (sr / en / de / ru) ── */
  var UI = {
    sr: { sub_pre:'O destinaciji — ', sub_sub:'Sve što treba da znaš pre polaska.',
      error:'Info o destinaciji trenutno nije dostupan.', detail:'Detalji: ',
      disclaimer:'Info generiše AI radi orijentacije — pred put uvek proveri na sajtu ambasade i kod avio-kompanije.',
      climate:'Klima', now:'Sada', best:'Idealno', visa:'Viza & Ulazak', status:'Status', stay:'Boravak', passport:'Pasoš', health:'Zdravlje',
      costs:'Okvirni dnevni troškovi po osobi', budget:'Budžet', balanced:'Balans', comfort:'Komfor',
      transport:'Prevoz', pub:'Javni', taxi:'Taksi', tip:'Savet', practical:'Praktično', plug:'Adapter', water:'Voda', tipping:'Napojnica', safety:'Bezbednost',
      mustsee:'Obavezno videti', climate_m:'Klima po mesecima', hi:'Dnevna', lo:'Noćna', rain:'Kiša', sea:'More', getting:'Kako doći', airlines:'Aviokompanije', ftime:'Let', road:'Kopnom', airport:'Aerodrom → centar', food:'Šta jesti', months:['J','F','M','A','M','J','J','A','S','O','N','D'], phrases:'Korisne fraze', where:'Gde odsesti', for_:'Za koga', emerg:'Hitni brojevi i ambasada', gen:'Opšti', police:'Policija', amb:'Hitna', embassy:'Ambasada', conn:'Internet i novac', roaming:'Roaming', esim:'SIM / eSIM', cash:'Kartica / keš', atm:'Bankomati', scams:'Česte prevare', passport_l:'Pasoš / državljanstvo', passport_ph:'npr. Srbija, Nemačka', passport_auto:'Automatski prema polaznom mestu', apply:'Primeni' },
    en: { sub_pre:'About the destination — ', sub_sub:'Everything you need to know before you go.',
      error:'Destination info is not available right now.', detail:'Details: ',
      disclaimer:'Info is AI-generated for orientation only — always check with the embassy and your airline before travelling.',
      climate:'Climate', now:'Now', best:'Best time', visa:'Visa & Entry', status:'Status', stay:'Stay', passport:'Passport', health:'Health',
      costs:'Approx. daily costs per person', budget:'Budget', balanced:'Balanced', comfort:'Comfort',
      transport:'Transport', pub:'Public', taxi:'Taxi', tip:'Tip', practical:'Practical', plug:'Plug', water:'Water', tipping:'Tipping', safety:'Safety',
      mustsee:'Must-see', climate_m:'Climate by month', hi:'Day', lo:'Night', rain:'Rain', sea:'Sea', getting:'Getting there', airlines:'Airlines', ftime:'Flight', road:'By road', airport:'Airport → centre', food:'What to eat', months:['J','F','M','A','M','J','J','A','S','O','N','D'], phrases:'Useful phrases', where:'Where to stay', for_:'Best for', emerg:'Emergency & embassy', gen:'General', police:'Police', amb:'Ambulance', embassy:'Embassy', conn:'Internet & money', roaming:'Roaming', esim:'SIM / eSIM', cash:'Card / cash', atm:'ATMs', scams:'Common scams', passport_l:'Passport / citizenship', passport_ph:'e.g. Serbia, Germany', passport_auto:'Automatic, based on departure city', apply:'Apply' },
    de: { sub_pre:'Über das Reiseziel — ', sub_sub:'Alles, was du vor der Abreise wissen musst.',
      error:'Reiseziel-Infos sind gerade nicht verfügbar.', detail:'Details: ',
      disclaimer:'Die Infos sind KI-generiert und dienen nur zur Orientierung — prüfe vor der Reise immer bei der Botschaft und deiner Fluggesellschaft.',
      climate:'Klima', now:'Jetzt', best:'Beste Zeit', visa:'Visum & Einreise', status:'Status', stay:'Aufenthalt', passport:'Reisepass', health:'Gesundheit',
      costs:'Ungefähre Tageskosten pro Person', budget:'Budget', balanced:'Ausgewogen', comfort:'Komfort',
      transport:'Verkehr', pub:'Öffentlich', taxi:'Taxi', tip:'Tipp', practical:'Praktisches', plug:'Steckdose', water:'Wasser', tipping:'Trinkgeld', safety:'Sicherheit',
      mustsee:'Sehenswürdigkeiten', climate_m:'Klima nach Monat', hi:'Tag', lo:'Nacht', rain:'Regen', sea:'Meer', getting:'Anreise', airlines:'Fluggesellschaften', ftime:'Flug', road:'Auf dem Landweg', airport:'Flughafen → Zentrum', food:'Was essen', months:['J','F','M','A','M','J','J','A','S','O','N','D'], phrases:'Nützliche Redewendungen', where:'Wo übernachten', for_:'Geeignet für', emerg:'Notfall & Botschaft', gen:'Allgemein', police:'Polizei', amb:'Rettung', embassy:'Botschaft', conn:'Internet & Geld', roaming:'Roaming', esim:'SIM / eSIM', cash:'Karte / Bargeld', atm:'Geldautomaten', scams:'Häufige Betrugsmaschen', passport_l:'Reisepass / Staatsbürgerschaft', passport_ph:'z. B. Serbien, Deutschland', passport_auto:'Automatisch nach Abflugort', apply:'Übernehmen' },
    ru: { sub_pre:'О направлении — ', sub_sub:'Всё, что нужно знать перед поездкой.',
      error:'Информация о направлении сейчас недоступна.', detail:'Подробности: ',
      disclaimer:'Информация создана ИИ и носит ознакомительный характер — перед поездкой всегда проверяйте в посольстве и у авиакомпании.',
      climate:'Климат', now:'Сейчас', best:'Лучшее время', visa:'Виза и въезд', status:'Статус', stay:'Срок пребывания', passport:'Паспорт', health:'Здоровье',
      costs:'Примерные расходы в день на человека', budget:'Бюджет', balanced:'Баланс', comfort:'Комфорт',
      transport:'Транспорт', pub:'Общественный', taxi:'Такси', tip:'Совет', practical:'Практика', plug:'Розетка', water:'Вода', tipping:'Чаевые', safety:'Безопасность',
      mustsee:'Обязательно посмотреть', climate_m:'Климат по месяцам', hi:'День', lo:'Ночь', rain:'Дождь', sea:'Море', getting:'Как добраться', airlines:'Авиакомпании', ftime:'Перелёт', road:'По суше', airport:'Аэропорт → центр', food:'Что попробовать', months:['Я','Ф','М','А','М','И','И','А','С','О','Н','Д'], phrases:'Полезные фразы', where:'Где остановиться', for_:'Подходит', emerg:'Экстренные номера и посольство', gen:'Общий', police:'Полиция', amb:'Скорая', embassy:'Посольство', conn:'Интернет и деньги', roaming:'Роуминг', esim:'SIM / eSIM', cash:'Карта / наличные', atm:'Банкоматы', scams:'Частые мошенничества', passport_l:'Паспорт / гражданство', passport_ph:'напр. Сербия, Германия', passport_auto:'Автоматически по городу вылета', apply:'Применить' }
  };
  function getLang() {
    try { if (typeof window.getLang === 'function') return window.getLang(); } catch (e) {}
    try { var u = new URLSearchParams(location.search).get('lang'); if (u && UI[u]) return u; } catch (e) {}
    try { var sv = localStorage.getItem('sklopi_lang'); if (sv && UI[sv]) return sv; } catch (e) {}
    return 'sr';
  }
  function curLang() { var l = 'sr'; try { l = getLang(); } catch (e) {} return UI[l] ? l : 'sr'; }
  function ui() { return UI[curLang()]; }
  function safeLevel(txt) {
    var x = String(txt || '').toLowerCase();
    return /bezbed|safe|sicher|безопас/.test(x) && !/unsafe|nicht sicher|небезопас/.test(x) ? 'di-green' : 'di-gold';
  }

  /* ── Helpers ── */
  var _originOverride = '';   // destinacija.html nema #origin polje, pa polazak stiže preko load(dest, origin)
  function getOrigin() { if (_originOverride) return _originOverride.slice(0, 80); var o = el('origin'); return o ? o.value.trim().slice(0, 80) : ''; }
  function getPassport() { try { return (localStorage.getItem('sklopi_passport') || '').slice(0, 60); } catch (e) { return ''; } }
  function keyOf(dest) { return dest + '|' + getLang() + '|' + getOrigin() + '|' + getPassport(); }
  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function el(id) { return document.getElementById(id); }

  /* ── Hook: prati promenu destinacije ── */
  function watchDest() {
    var destInput = el('dest');
    if (!destInput) return;

    // Kad se rezultati otvore — proveri da li je nova destinacija
    var observer = new MutationObserver(function () {
      checkAndLoad();
    });

    // Prati #planBreakdown — kad se pojavi/promeni znamo da su planovi otvoreni
    var pb = el('planBreakdown');
    if (pb) {
      observer.observe(pb, { attributes: true, attributeFilter: ['hidden', 'style', 'class'] });
    }

    // Prati #destinationPlans takođe
    var dp = el('destinationPlans');
    if (dp) {
      observer.observe(dp, { attributes: true, attributeFilter: ['hidden'] });
    }

    // Direktno na input promenu (debounce)
    // Namerno NE učitavamo dok korisnik kuca ("Ati", "Atin"...) — svaki takav
    // poziv troši AI tokene. Učitava se na submit, izbor iz autocomplete-a
    // (change) i kad se otvore planovi.
    destInput.addEventListener('change', function () { setTimeout(checkAndLoad, 300); });

    // Promena polaznog mesta -> nove informacije (viza, ambasada, roaming zavise od toga)
    var originInput = el('origin');
    if (originInput) {
      var od;
      originInput.addEventListener('change', function () { clearTimeout(od); od = setTimeout(checkAndLoad, 400); });
    }

    // Kad se forma submituje
    var form = el('searchForm');
    if (form) {
      form.addEventListener('submit', function () {
        setTimeout(checkAndLoad, 900);
      });
    }
  }

  function checkAndLoad() {
    var destInput = el('dest');
    var dest = destInput ? destInput.value.trim() : _currentDest;   // destinacija.html nema #dest
    if (!dest) return;
    var k = keyOf(dest);
    if (k === _currentKey) return;
    _currentDest = dest;
    _currentKey = k;
    loadDestInfo(dest);
  }

  /* ── API call ── */
  function loadDestInfo(dest) {
    // Update naslova sekcije
    var titleEl = el('destInfoTitle');
    var subEl = el('destInfoSub');
    var u = ui();
    if (titleEl) titleEl.textContent = u.sub_pre + dest;
    if (subEl) subEl.textContent = u.sub_sub;

    // Iz keša ako već imamo (memorija, pa localStorage 7 dana)
    var cacheKey = keyOf(dest);
    if (!_cache[cacheKey]) {
      var stored = lsGet(cacheKey);
      if (stored) _cache[cacheKey] = stored;
    }
    if (_cache[cacheKey]) {
      showSkeleton(false);
      renderPanel(_cache[cacheKey]);
      return;
    }

    showSkeleton(true);

    var myReq = ++_reqId;

    // Do 3 pokušaja; na 429/502/503/504 čekamo 2s pa 5s (AI servis je povremeno zauzet)
    var delays = [2000, 5000];
    function attempt(n) {
      fetch(DEST_INFO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dest: dest, lang: getLang(), origin: getOrigin(), passport: getPassport() })
      })
      .then(function (res) {
        if (!res.ok) {
          return res.text().then(function (t) {
            var e = new Error('HTTP ' + res.status + ': ' + t.slice(0, 300));
            e.status = res.status;
            throw e;
          });
        }
        return res.json();
      })
      .then(function (info) {
        if (myReq !== _reqId) return; // zastareo zahtev
        if (!info || typeof info !== 'object' || info.error) throw new Error((info && info.error) || 'prazan odgovor');
        _cache[cacheKey] = info;
        lsSet(cacheKey, info);
        showSkeleton(false);
        renderPanel(info);
      })
      .catch(function (err) {
        if (myReq !== _reqId) return;
        var retryable = !err.status || err.status === 429 || err.status >= 500;
        if (retryable && n < delays.length) {
          setTimeout(function () { if (myReq === _reqId) attempt(n + 1); }, delays[n]);
          return;
        }
        console.warn('[sklopi][dest-info] greška:', err);   // detalji samo u konzoli
        showSkeleton(false);
        showError();
      });
    }
    attempt(0);
  }

  /* ── localStorage keš (7 dana) ── */
  var LS_PREFIX = 'sklopi_di:', LS_TTL = 7 * 24 * 3600 * 1000;
  function lsGet(k) {
    try {
      var r = JSON.parse(localStorage.getItem(LS_PREFIX + k) || 'null');
      return r && r.t && (Date.now() - r.t) < LS_TTL ? r.d : null;
    } catch (e) { return null; }
  }
  function lsSet(k, d) {
    try { localStorage.setItem(LS_PREFIX + k, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {}
  }

  /* ── Skeleton ── */
  function showSkeleton(show) {
    var sk = el('destInfoSkeleton');
    var ct = el('destInfoContent');
    var disc = el('destInfoDisclaimer');
    if (sk) sk.hidden = !show;
    if (ct) ct.hidden = show;
    if (disc) disc.hidden = show;
  }

  function showError() {
    var u2 = ui();
    var ct = el('destInfoContent');
    if (ct) {
      ct.hidden = false;
      var retry = { sr:'Pokušaj ponovo', en:'Try again', de:'Erneut versuchen', ru:'Повторить' }[curLang()];
      var wait = { sr:'Pokušaj ponovo za minut.', en:'Please try again in a minute.', de:'Bitte in einer Minute erneut versuchen.', ru:'Повторите попытку через минуту.' }[curLang()];
      ct.innerHTML = '<p class="di-error">' + esc(u2.error) + ' ' + esc(wait) + '</p>' +
        '<p style="text-align:center"><button type="button" id="diRetryBtn" style="padding:8px 18px;border:0;border-radius:10px;background:#0f3b4c;color:#fff;font:inherit;font-weight:600">' + esc(retry) + '</button></p>';
      var b = el('diRetryBtn');
      if (b) b.addEventListener('click', function () { if (_currentDest) { showSkeleton(false); loadDestInfo(_currentDest); } });
    }
  }

  /* ── Normalizacija stavki (model ume da vrati string ili drugačije ključeve na en/de/ru) ── */
  function pick(o, keys) { for (var i = 0; i < keys.length; i++) { if (o[keys[i]]) return String(o[keys[i]]); } return ''; }
  function vals(o) { return Object.keys(o).map(function (k) { return o[k]; }).filter(function (v) { return typeof v === 'string' && v; }); }
  function normPair(it, nameKeys, noteKeys) {
    if (typeof it === 'string') return { a: it, b: '' };
    if (!it || typeof it !== 'object') return { a: '', b: '' };
    var v = vals(it);
    var a = pick(it, nameKeys) || v[0] || '';
    var b = pick(it, noteKeys) || (v[0] === a ? v[1] : v[0]) || '';
    return { a: a, b: b === a ? '' : b };
  }
  function normList(arr, nameKeys, noteKeys) {
    if (!Array.isArray(arr)) return [];
    return arr.map(function (it) { return normPair(it, nameKeys, noteKeys); }).filter(function (p) { return p.a; });
  }

  /* ── Render ── */
  function renderPanel(d) {
    var ct = el('destInfoContent');
    if (!ct) return;

    var visaColor = d.visa && d.visa.required === false ? 'di-green' : d.visa && d.visa.required === true ? 'di-red' : 'di-gold';
    var safetyClass = safeLevel(d.safety_level);
    var L = ui();

    var html = '';

    /* ── Pasoš / državljanstvo (viza, ambasada i roaming zavise od toga) ── */
    html += '<div class="di-row" style="align-items:center;gap:8px;margin-bottom:10px"><span class="di-label">🛂 ' + esc(L.passport_l) + '</span>' +
      '<input id="diPassport" type="text" maxlength="60" value="' + esc(getPassport()) + '" placeholder="' + esc(L.passport_ph) + '" title="' + esc(L.passport_auto) + '" style="flex:1;min-width:0;padding:6px 10px;border:1px solid #cbd5e1;border-radius:10px;font:inherit;font-size:13px">' +
      '<button type="button" id="diPassportBtn" style="padding:6px 14px;border:0;border-radius:10px;background:#0f3b4c;color:#fff;font:inherit;font-size:13px;font-weight:600">' + esc(L.apply) + '</button></div>';

    /* ── Header pill row ── */
    html += '<div class="di-pills">';
    if (d.flag && d.currency) {
      html += '<div class="di-pill"><span class="di-pill-icon">' + esc(d.flag) + '</span><span><strong>' + esc(d.currency) + '</strong>';
      if (d.currency_rate) html += ' · ' + esc(d.currency_rate);
      html += '</span></div>';
    }
    if (d.language) {
      html += '<div class="di-pill"><span class="di-pill-icon">🗣️</span><span>' + esc(d.language) + '</span></div>';
    }
    if (d.local_time_now) {
      html += '<div class="di-pill"><span class="di-pill-icon">🕐</span><span>' + esc(d.local_time_now) + (d.timezone ? ' · ' + esc(d.timezone) : '') + '</span></div>';
    }
    if (d.safety_level) {
      html += '<div class="di-pill di-pill-' + safetyClass + '"><span class="di-pill-icon">🔒</span><span>' + esc(d.safety_level) + '</span></div>';
    }
    html += '</div>';

    /* ── Grid row 1: Klima + Viza ── */
    html += '<div class="di-grid">';

    /* Klima */
    var w = d.weather || {};
    html += '<div class="di-card">';
    html += '<div class="di-card-head"><span class="di-card-ic di-ic-aqua">🌤️</span><span class="di-card-title">' + L.climate + '</span></div>';
    html += '<div class="di-weather-row">';
    html += '<span class="di-weather-emoji">' + esc(w.icon || '🌡️') + '</span>';
    html += '<div><div class="di-temp">' + esc(w.temp_range || '—') + '</div>';
    if (w.description) html += '<div class="di-temp-desc">' + esc(w.description) + '</div>';
    html += '</div></div>';
    if (w.season_now) html += '<div class="di-row"><span class="di-label">' + L.now + '</span><span class="di-val">' + esc(w.season_now) + '</span></div>';
    if (w.best_months) html += '<div class="di-row"><span class="di-label">' + L.best + '</span><span class="di-val">' + esc(w.best_months) + '</span></div>';
    html += '</div>';

    /* Viza */
    var v = d.visa || {};
    html += '<div class="di-card">';
    html += '<div class="di-card-head"><span class="di-card-ic di-ic-deep">🛂</span><span class="di-card-title">' + L.visa + '</span></div>';
    if (v.type) html += '<div class="di-row"><span class="di-label">' + L.status + '</span><span class="di-val ' + visaColor + '">' + esc(v.type) + '</span></div>';
    if (v.duration) html += '<div class="di-row"><span class="di-label">' + L.stay + '</span><span class="di-val">' + esc(v.duration) + '</span></div>';
    if (v.passport_note) html += '<div class="di-row"><span class="di-label">' + L.passport + '</span><span class="di-val">' + esc(v.passport_note) + '</span></div>';
    if (v.health_note) html += '<div class="di-row"><span class="di-label">' + L.health + '</span><span class="di-val">' + esc(v.health_note) + '</span></div>';
    html += '</div>';

    html += '</div>'; /* /di-grid */

    /* ── Budžet ── */
    var dc = d.daily_cost || {};
    html += '<div class="di-card di-card-full">';
    html += '<div class="di-card-head"><span class="di-card-ic di-ic-gold">💰</span><span class="di-card-title">' + L.costs + '</span></div>';
    html += '<div class="di-budget-row">';
    if (dc.budget) html += '<div class="di-budget-tier di-tier-budget"><div class="di-tier-label">🎒 ' + L.budget + '</div><div class="di-tier-price">' + esc(dc.budget.range) + '</div><div class="di-tier-note">' + esc(dc.budget.note || '') + '</div></div>';
    if (dc.mid)    html += '<div class="di-budget-tier di-tier-mid"><div class="di-tier-label">✈️ ' + L.balanced + '</div><div class="di-tier-price">' + esc(dc.mid.range) + '</div><div class="di-tier-note">' + esc(dc.mid.note || '') + '</div></div>';
    if (dc.comfort) html += '<div class="di-budget-tier di-tier-comfort"><div class="di-tier-label">🛎️ ' + L.comfort + '</div><div class="di-tier-price">' + esc(dc.comfort.range) + '</div><div class="di-tier-note">' + esc(dc.comfort.note || '') + '</div></div>';
    html += '</div>';
    html += '</div>';

    /* ── Grid row 2: Transport + Praktično ── */
    html += '<div class="di-grid">';

    /* Transport */
    var tr = d.transport || {};
    html += '<div class="di-card">';
    html += '<div class="di-card-head"><span class="di-card-ic di-ic-deep">🚇</span><span class="di-card-title">' + L.transport + '</span></div>';
    if (tr.public) html += '<div class="di-row"><span class="di-label">' + L.pub + '</span><span class="di-val">' + esc(tr.public) + '</span></div>';
    if (tr.taxi)   html += '<div class="di-row"><span class="di-label">' + L.taxi + '</span><span class="di-val">' + esc(tr.taxi) + '</span></div>';
    if (tr.tip)    html += '<div class="di-row"><span class="di-label">💡 ' + L.tip + '</span><span class="di-val">' + esc(tr.tip) + '</span></div>';
    html += '</div>';

    /* Praktično */
    var pr = d.practical || {};
    html += '<div class="di-card">';
    html += '<div class="di-card-head"><span class="di-card-ic di-ic-coral">🔌</span><span class="di-card-title">' + L.practical + '</span></div>';
    if (pr.plug)       html += '<div class="di-row"><span class="di-label">' + L.plug + '</span><span class="di-val">' + esc(pr.plug) + '</span></div>';
    if (pr.water)      html += '<div class="di-row"><span class="di-label">' + L.water + '</span><span class="di-val">' + esc(pr.water) + '</span></div>';
    if (pr.tip_custom) html += '<div class="di-row"><span class="di-label">' + L.tipping + '</span><span class="di-val">' + esc(pr.tip_custom) + '</span></div>';
    if (d.safety_note) html += '<div class="di-row"><span class="di-label">' + L.safety + '</span><span class="di-val">' + esc(d.safety_note) + '</span></div>';
    html += '</div>';

    html += '</div>'; /* /di-grid */

    /* ── Hitni brojevi + Internet i novac ── */
    var em = d.emergency || {}, cn = d.connectivity || {};
    if (Object.keys(em).length || Object.keys(cn).length) {
      html += '<div class="di-grid">';
      html += '<div class="di-card"><div class="di-card-head"><span class="di-card-ic di-ic-coral">🚨</span><span class="di-card-title">' + L.emerg + '</span></div>';
      if (em.general)   html += '<div class="di-row"><span class="di-label">' + L.gen + '</span><span class="di-val">' + esc(em.general) + '</span></div>';
      if (em.police)    html += '<div class="di-row"><span class="di-label">' + L.police + '</span><span class="di-val">' + esc(em.police) + '</span></div>';
      if (em.ambulance) html += '<div class="di-row"><span class="di-label">' + L.amb + '</span><span class="di-val">' + esc(em.ambulance) + '</span></div>';
      if (em.embassy)   html += '<div class="di-row"><span class="di-label">' + L.embassy + '</span><span class="di-val">' + esc(em.embassy) + '</span></div>';
      html += '</div>';
      html += '<div class="di-card"><div class="di-card-head"><span class="di-card-ic di-ic-deep">📶</span><span class="di-card-title">' + L.conn + '</span></div>';
      if (cn.roaming) html += '<div class="di-row"><span class="di-label">' + L.roaming + '</span><span class="di-val">' + esc(cn.roaming) + '</span></div>';
      if (cn.esim)    html += '<div class="di-row"><span class="di-label">' + L.esim + '</span><span class="di-val">' + esc(cn.esim) + '</span></div>';
      if (cn.cash)    html += '<div class="di-row"><span class="di-label">' + L.cash + '</span><span class="di-val">' + esc(cn.cash) + '</span></div>';
      if (cn.atm)     html += '<div class="di-row"><span class="di-label">' + L.atm + '</span><span class="di-val">' + esc(cn.atm) + '</span></div>';
      html += '</div></div>';
    }

    /* ── Must-see ── */
    var ms = normList(d.must_see, ['name','landmark','title','attraction','sight'], ['note','tip','description','desc']);
    if (ms.length) {
      html += '<div class="di-card di-card-full">';
      html += '<div class="di-card-head"><span class="di-card-ic di-ic-aqua">🎡</span><span class="di-card-title">' + L.mustsee + '</span></div>';
      html += '<div class="di-mustsee">';
      ms.forEach(function (item, i) {
        html += '<div class="di-ms-item">';
        html += '<span class="di-ms-num">' + (i + 1) + '</span>';
        html += '<div><div class="di-ms-name">' + esc(item.a) + '</div>';
        if (item.b) html += '<div class="di-ms-note">' + esc(item.b) + '</div>';
        html += '</div></div>';
      });
      html += '</div></div>';
    }


    /* ── Gde odsesti ── */
    var nb = Array.isArray(d.neighborhoods) ? d.neighborhoods : [];
    nb = nb.filter(function (n) { return n && typeof n === 'object' && (n.area || n.name); });
    if (nb.length) {
      html += '<div class="di-card di-card-full"><div class="di-card-head"><span class="di-card-ic di-ic-gold">🏨</span><span class="di-card-title">' + L.where + '</span></div><div class="di-mustsee">';
      nb.forEach(function (n, i) {
        var meta = [n.for, n.price].filter(Boolean).join(' · ');
        html += '<div class="di-ms-item"><span class="di-ms-num">' + (i + 1) + '</span><div><div class="di-ms-name">' + esc(n.area || n.name) + '</div>' +
          (meta ? '<div class="di-ms-note">' + esc(meta) + '</div>' : '') + (n.note ? '<div class="di-ms-note">' + esc(n.note) + '</div>' : '') + '</div></div>';
      });
      html += '</div></div>';
    }

    /* ── Klima po mesecima ── */
    var cm = d.climate_months;
    if (cm && cm.hi && cm.hi.length === 12) {
      var maxHi = Math.max.apply(null, cm.hi), minLo = Math.min.apply(null, (cm.lo || cm.hi).concat([0]));
      var maxRain = Math.max.apply(null, (cm.rain || [1]).concat([1]));
      html += '<div class="di-card di-card-full"><div class="di-card-head"><span class="di-card-ic di-ic-aqua">📅</span><span class="di-card-title">' + L.climate_m + '</span></div>';
      html += '<div style="display:grid;grid-template-columns:repeat(12,1fr);gap:4px;align-items:end;height:120px">';
      for (var i = 0; i < 12; i++) {
        var h = Math.max(6, Math.round((cm.hi[i] - minLo) / Math.max(1, maxHi - minLo) * 100));
        var rn = cm.rain ? Math.round(cm.rain[i] / maxRain * 100) : 0;
        html += '<div title="' + esc(L.months[i] + ': ' + cm.hi[i] + '° / ' + (cm.lo ? cm.lo[i] : '') + '° · ' + (cm.rain ? cm.rain[i] + ' mm' : '')) + '" style="display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;font-size:10px">' +
          '<span>' + esc(cm.hi[i]) + '°</span><div style="width:100%;height:' + h + '%;background:linear-gradient(#f59e0b,#38bdf8);border-radius:4px 4px 0 0"></div>' +
          '<div style="width:60%;height:3px;margin-top:2px;background:#0ea5e9;opacity:' + (0.15 + rn / 120) + ';border-radius:2px"></div></div>';
      }
      html += '</div><div style="display:grid;grid-template-columns:repeat(12,1fr);gap:4px;text-align:center;font-size:11px;margin-top:4px;opacity:.7">';
      for (var j = 0; j < 12; j++) html += '<span>' + esc(L.months[j]) + '</span>';
      html += '</div>';
      if (cm.sea && cm.sea.length === 12) {
        html += '<div class="di-row" style="margin-top:8px"><span class="di-label">🌊 ' + L.sea + '</span><span class="di-val">' + cm.sea.map(function (t, k) { return esc(L.months[k] + ' ' + t + '°'); }).join(' · ') + '</span></div>';
      }
      html += '<div class="di-tier-note" style="margin-top:6px">▮ ' + L.hi + ' °C · ▬ ' + L.rain + ' (mm)</div></div>';
    }

    /* ── Kako doći + Aerodrom → centar ── */
    var gt = d.getting_there || {}, a2c = d.airport_to_center || [];
    if (gt.airlines || gt.flight_time || a2c.length) {
      html += '<div class="di-grid">';
      html += '<div class="di-card"><div class="di-card-head"><span class="di-card-ic di-ic-deep">✈️</span><span class="di-card-title">' + L.getting + '</span></div>';
      if (gt.airlines)    html += '<div class="di-row"><span class="di-label">' + L.airlines + '</span><span class="di-val">' + esc(gt.airlines) + '</span></div>';
      if (gt.flight_time) html += '<div class="di-row"><span class="di-label">' + L.ftime + '</span><span class="di-val">' + esc(gt.flight_time) + '</span></div>';
      if (gt.by_road)     html += '<div class="di-row"><span class="di-label">' + L.road + '</span><span class="di-val">' + esc(gt.by_road) + '</span></div>';
      if (gt.tip)         html += '<div class="di-row"><span class="di-label">💡 ' + L.tip + '</span><span class="di-val">' + esc(gt.tip) + '</span></div>';
      html += '</div>';
      html += '<div class="di-card"><div class="di-card-head"><span class="di-card-ic di-ic-coral">🚆</span><span class="di-card-title">' + L.airport + '</span></div>';
      a2c.forEach(function (o) {
        html += '<div class="di-row"><span class="di-label">' + esc(o.mode) + '</span><span class="di-val">' + esc(o.price || '') + (o.duration ? ' · ' + esc(o.duration) : '') + '</span></div>';
      });
      html += '</div></div>';
    }

    /* ── Šta jesti ── */
    var fd = normList(d.food, ['dish','name','food','title'], ['note','tip','description','desc']);
    if (fd.length) {
      html += '<div class="di-card di-card-full"><div class="di-card-head"><span class="di-card-ic di-ic-gold">🍽️</span><span class="di-card-title">' + L.food + '</span></div><div class="di-mustsee">';
      fd.forEach(function (f, i) {
        html += '<div class="di-ms-item"><span class="di-ms-num">' + (i + 1) + '</span><div><div class="di-ms-name">' + esc(f.a) + '</div>' + (f.b ? '<div class="di-ms-note">' + esc(f.b) + '</div>' : '') + '</div></div>';
      });
      html += '</div></div>';
    }

    /* ── Česte prevare ── */
    var sc = normList(d.scams, ['title','scam','name'], ['note','tip','description']);
    if (sc.length) {
      html += '<div class="di-card di-card-full"><div class="di-card-head"><span class="di-card-ic di-ic-coral">⚠️</span><span class="di-card-title">' + L.scams + '</span></div><div class="di-mustsee">';
      sc.forEach(function (f, i) {
        html += '<div class="di-ms-item"><span class="di-ms-num">' + (i + 1) + '</span><div><div class="di-ms-name">' + esc(f.a) + '</div>' + (f.b ? '<div class="di-ms-note">' + esc(f.b) + '</div>' : '') + '</div></div>';
      });
      html += '</div></div>';
    }

    /* ── Fraze ── */
    var ph = normList(d.phrases, ['sr','phrase','reader','source','text'], ['local','translation','foreign']);
    if (ph.length) {
      html += '<div class="di-card di-card-full">';
      html += '<div class="di-card-head"><span class="di-card-ic di-ic-purple">💬</span><span class="di-card-title">' + L.phrases + '</span></div>';
      ph.forEach(function (p) {
        html += '<div class="di-row"><span class="di-label">' + esc(p.a) + '</span><span class="di-val di-phrase">' + esc(p.b) + '</span></div>';
      });
      html += '</div>';
    }

    ct.innerHTML = html;
    ct.hidden = false;

    var pp = el('diPassport'), pb = el('diPassportBtn');
    if (pp) {
      var pt;
      var savePassport = function () {
        var v = pp.value.trim().slice(0, 60);
        try { localStorage.setItem('sklopi_passport', v); } catch (e) {}
        if (!_currentDest) return;
        var k = keyOf(_currentDest);
        if (k === _currentKey) return;
        _currentKey = k;
        loadDestInfo(_currentDest);
      };
      pp.addEventListener('input', function () { clearTimeout(pt); pt = setTimeout(savePassport, 1500); });
      pp.addEventListener('change', function () { clearTimeout(pt); savePassport(); });
      pp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(pt); savePassport(); pp.blur(); } });
      if (pb) pb.addEventListener('click', function () { clearTimeout(pt); savePassport(); });
    }

    var disc = el('destInfoDisclaimer');
    if (disc) { disc.hidden = false; disc.textContent = '⚠️ ' + ui().disclaimer.replace(/^⚠️\s*/, ''); }
  }

  document.addEventListener('sklopi:lang', function () { if (_currentDest) { showSkeleton(false); loadDestInfo(_currentDest); } });

  window.SklopiDestInfo = { load: function (dest, origin) { if (origin) _originOverride = String(origin).trim(); _currentDest = dest; _currentKey = keyOf(dest); loadDestInfo(dest); } };

  /* ── Init ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchDest);
  } else {
    watchDest();
  }

})();
