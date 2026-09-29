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
      mustsee:'Obavezno videti', phrases:'Korisne fraze' },
    en: { sub_pre:'About the destination — ', sub_sub:'Everything you need to know before you go.',
      error:'Destination info is not available right now.', detail:'Details: ',
      disclaimer:'Info is AI-generated for orientation only — always check with the embassy and your airline before travelling.',
      climate:'Climate', now:'Now', best:'Best time', visa:'Visa & Entry', status:'Status', stay:'Stay', passport:'Passport', health:'Health',
      costs:'Approx. daily costs per person', budget:'Budget', balanced:'Balanced', comfort:'Comfort',
      transport:'Transport', pub:'Public', taxi:'Taxi', tip:'Tip', practical:'Practical', plug:'Plug', water:'Water', tipping:'Tipping', safety:'Safety',
      mustsee:'Must-see', phrases:'Useful phrases' },
    de: { sub_pre:'Über das Reiseziel — ', sub_sub:'Alles, was du vor der Abreise wissen musst.',
      error:'Reiseziel-Infos sind gerade nicht verfügbar.', detail:'Details: ',
      disclaimer:'Die Infos sind KI-generiert und dienen nur zur Orientierung — prüfe vor der Reise immer bei der Botschaft und deiner Fluggesellschaft.',
      climate:'Klima', now:'Jetzt', best:'Beste Zeit', visa:'Visum & Einreise', status:'Status', stay:'Aufenthalt', passport:'Reisepass', health:'Gesundheit',
      costs:'Ungefähre Tageskosten pro Person', budget:'Budget', balanced:'Ausgewogen', comfort:'Komfort',
      transport:'Verkehr', pub:'Öffentlich', taxi:'Taxi', tip:'Tipp', practical:'Praktisches', plug:'Steckdose', water:'Wasser', tipping:'Trinkgeld', safety:'Sicherheit',
      mustsee:'Sehenswürdigkeiten', phrases:'Nützliche Redewendungen' },
    ru: { sub_pre:'О направлении — ', sub_sub:'Всё, что нужно знать перед поездкой.',
      error:'Информация о направлении сейчас недоступна.', detail:'Подробности: ',
      disclaimer:'Информация создана ИИ и носит ознакомительный характер — перед поездкой всегда проверяйте в посольстве и у авиакомпании.',
      climate:'Климат', now:'Сейчас', best:'Лучшее время', visa:'Виза и въезд', status:'Статус', stay:'Срок пребывания', passport:'Паспорт', health:'Здоровье',
      costs:'Примерные расходы в день на человека', budget:'Бюджет', balanced:'Баланс', comfort:'Комфорт',
      transport:'Транспорт', pub:'Общественный', taxi:'Такси', tip:'Совет', practical:'Практика', plug:'Розетка', water:'Вода', tipping:'Чаевые', safety:'Безопасность',
      mustsee:'Обязательно посмотреть', phrases:'Полезные фразы' }
  };
  function curLang() { var l = 'sr'; try { l = (typeof getLang === 'function' ? getLang() : 'sr'); } catch (e) {} return UI[l] ? l : 'sr'; }
  function ui() { return UI[curLang()]; }
  function safeLevel(txt) {
    var x = String(txt || '').toLowerCase();
    return /bezbed|safe|sicher|безопас/.test(x) && !/unsafe|nicht sicher|небезопас/.test(x) ? 'di-green' : 'di-gold';
  }

  /* ── Helpers ── */
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
    var debounce;
    destInput.addEventListener('input', function () {
      clearTimeout(debounce);
      debounce = setTimeout(checkAndLoad, 600);
    });

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
    if (!destInput) return;
    var dest = destInput.value.trim();
    if (!dest || dest === _currentDest) return;
    _currentDest = dest;
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

    // Iz keša ako već imamo
    var cacheKey = dest + '|' + getLang();
    if (_cache[cacheKey]) {
      renderPanel(_cache[cacheKey]);
      return;
    }

    showSkeleton(true);

    var myReq = ++_reqId;

    fetch(DEST_INFO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dest: dest, lang: getLang() })
    })
    .then(function (res) {
      if (!res.ok) { return res.text().then(function (t) { throw new Error('HTTP ' + res.status + ': ' + t.slice(0, 300)); }); }
      return res.json();
    })
    .then(function (info) {
      if (myReq !== _reqId) return; // zastareo zahtev
      if (!info || typeof info !== 'object' || info.error) throw new Error((info && info.error) || 'prazan odgovor');
      _cache[cacheKey] = info;
      showSkeleton(false);
      renderPanel(info);
    })
    .catch(function (err) {
      if (myReq !== _reqId) return;
      console.warn('[sklopi][dest-info] greška:', err);
      showSkeleton(false);
      showError(String(err && err.message || err));
    });
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

  function showError(detail) {
    var u2 = ui();
    var ct = el('destInfoContent');
    if (ct) {
      ct.hidden = false;
      ct.innerHTML = '<p class="di-error">' + esc(u2.error) + '</p><p class="di-error" style="font-size:12px;opacity:.7">' + esc(u2.detail) + esc(detail || '') + '</p>';
    }
  }

  /* ── Render ── */
  function renderPanel(d) {
    var ct = el('destInfoContent');
    if (!ct) return;

    var visaColor = d.visa && d.visa.required === false ? 'di-green' : d.visa && d.visa.required === true ? 'di-red' : 'di-gold';
    var safetyClass = safeLevel(d.safety_level);
    var L = ui();

    var html = '';

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

    /* ── Must-see ── */
    var ms = d.must_see || [];
    if (ms.length) {
      html += '<div class="di-card di-card-full">';
      html += '<div class="di-card-head"><span class="di-card-ic di-ic-aqua">🎡</span><span class="di-card-title">' + L.mustsee + '</span></div>';
      html += '<div class="di-mustsee">';
      ms.forEach(function (item, i) {
        html += '<div class="di-ms-item">';
        html += '<span class="di-ms-num">' + (i + 1) + '</span>';
        html += '<div><div class="di-ms-name">' + esc(item.name) + '</div>';
        if (item.note) html += '<div class="di-ms-note">' + esc(item.note) + '</div>';
        html += '</div></div>';
      });
      html += '</div></div>';
    }

    /* ── Fraze ── */
    var ph = d.phrases || [];
    if (ph.length) {
      html += '<div class="di-card di-card-full">';
      html += '<div class="di-card-head"><span class="di-card-ic di-ic-purple">💬</span><span class="di-card-title">' + L.phrases + '</span></div>';
      ph.forEach(function (p) {
        html += '<div class="di-row"><span class="di-label">' + esc(p.sr) + '</span><span class="di-val di-phrase">' + esc(p.local) + '</span></div>';
      });
      html += '</div>';
    }

    ct.innerHTML = html;
    ct.hidden = false;

    var disc = el('destInfoDisclaimer');
    if (disc) { disc.hidden = false; disc.textContent = '⚠️ ' + ui().disclaimer.replace(/^⚠️\s*/, ''); }
  }

  /* ── Promena jezika: osveži panel (labele + AI sadržaj) na novom jeziku ── */
  var _prevOnLangChange = window.onLangChange;
  window.onLangChange = function () {
    if (typeof _prevOnLangChange === 'function') _prevOnLangChange.apply(this, arguments);
    if (_currentDest) loadDestInfo(_currentDest);
  };

  /* ── Init ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchDest);
  } else {
    watchDest();
  }

})();
