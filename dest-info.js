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
    if (titleEl) titleEl.textContent = 'O destinaciji — ' + dest;
    if (subEl) subEl.textContent = 'Sve što treba da znaš pre polaska u ' + dest + '.';

    // Iz keša ako već imamo
    if (_cache[dest]) {
      renderPanel(_cache[dest]);
      return;
    }

    showSkeleton(true);

    var myReq = ++_reqId;

    var prompt = 'Ti si travel ekspert koji pomaže srpskim turistima. Za destinaciju "' + dest + '" vrati SAMO JSON objekat (bez markdown, bez teksta pre ili posle) sa ovom strukturom:\n\n{\n  "flag": "🇮🇹",\n  "currency": "EUR",\n  "currency_rate": "1 EUR ≈ 117 RSD",\n  "timezone": "CET (UTC+1)",\n  "local_time_now": "14:30",\n  "language": "Italijanski",\n  "safety_level": "Bezbedno",\n  "safety_note": "Pazi na džepare u centru",\n  "weather": {\n    "season_now": "Jesen",\n    "temp_range": "12–22°C",\n    "icon": "🌤️",\n    "description": "Blago i suvo, idealno za šetnju",\n    "best_months": "Apr–Jun, Sep–Okt"\n  },\n  "visa": {\n    "required": false,\n    "type": "Bez vize (Šengen 90/180)",\n    "duration": "Do 90 dana",\n    "passport_note": "Pasoš mora važiti još 3 meseca po povratku",\n    "health_note": "Preporučena EHIC kartica"\n  },\n  "daily_cost": {\n    "budget": {"range": "30–50 EUR", "note": "Hostel, street food, javni prevoz"},\n    "mid": {"range": "80–140 EUR", "note": "3–4★ hotel, restoran, ulaznice"},\n    "comfort": {"range": "200–400+ EUR", "note": "5★ hotel, fine dining, taksi"}\n  },\n  "transport": {\n    "public": "Metro 1.50 EUR, bus mreža pokriva ceo grad",\n    "taxi": "Aerodrom–centar ≈ 48 EUR fiksna tarifa",\n    "tip": "Metro za centar, bus za Vatikan"\n  },\n  "practical": {\n    "plug": "Tip C/F, 230V",\n    "water": "Česmovača pitka",\n    "tip_custom": "5–10% u restoranima"\n  },\n  "must_see": [\n    {"name": "Koloseum", "note": "Kupi ulaznicu online unapred"},\n    {"name": "Vatikan", "note": "Rezerviši mesec dana ranije u sezoni"},\n    {"name": "Fontana di Trevi", "note": "Dođi u zoru — bez gužve"},\n    {"name": "Forum Romanum", "note": "Ulaznica kombinovana sa Koloseumom"},\n    {"name": "Borghese galerija", "note": "Obavezna rezervacija — Bernini skulpture"}\n  ],\n  "phrases": [\n    {"sr": "Hvala", "local": "Grazie"},\n    {"sr": "Izvinite", "local": "Scusi"},\n    {"sr": "Koliko košta?", "local": "Quanto costa?"},\n    {"sr": "Gde je…?", "local": "Dov\'è…?"},\n    {"sr": "Govorite li engleski?", "local": "Parla inglese?"}\n  ]\n}\n\nSva polja su obavezna. Prilagodi sve stavke stvarnim uslovima za ' + dest + '. Vrati SAMO JSON, ništa drugo.';

    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer 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' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (myReq !== _reqId) return; // zastareo zahtev
      var raw = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
      var clean = raw.replace(/```json|```/g, '').trim();
      var info = JSON.parse(clean);
      _cache[dest] = info;
      showSkeleton(false);
      renderPanel(info);
    })
    .catch(function (err) {
      if (myReq !== _reqId) return;
      console.warn('[sklopi][dest-info] greška:', err);
      showSkeleton(false);
      showError();
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

  function showError() {
    var ct = el('destInfoContent');
    if (ct) {
      ct.hidden = false;
      ct.innerHTML = '<p class="di-error">Nije uspelo učitavanje info o destinaciji. Pokušaj ponovo osvežavanjem stranice.</p>';
    }
  }

  /* ── Render ── */
  function renderPanel(d) {
    var ct = el('destInfoContent');
    if (!ct) return;

    var visaColor = d.visa && d.visa.required === false ? 'di-green' : d.visa && d.visa.required === true ? 'di-red' : 'di-gold';
    var safetyClass = (d.safety_level || '').toLowerCase().indexOf('bezbed') !== -1 ? 'di-green'
                    : (d.safety_level || '').toLowerCase().indexOf('oprez') !== -1 ? 'di-gold' : 'di-gold';

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
    html += '<div class="di-card-head"><span class="di-card-ic di-ic-aqua">🌤️</span><span class="di-card-title">Klima</span></div>';
    html += '<div class="di-weather-row">';
    html += '<span class="di-weather-emoji">' + esc(w.icon || '🌡️') + '</span>';
    html += '<div><div class="di-temp">' + esc(w.temp_range || '—') + '</div>';
    if (w.description) html += '<div class="di-temp-desc">' + esc(w.description) + '</div>';
    html += '</div></div>';
    if (w.season_now) html += '<div class="di-row"><span class="di-label">Sada</span><span class="di-val">' + esc(w.season_now) + '</span></div>';
    if (w.best_months) html += '<div class="di-row"><span class="di-label">Idealno</span><span class="di-val">' + esc(w.best_months) + '</span></div>';
    html += '</div>';

    /* Viza */
    var v = d.visa || {};
    html += '<div class="di-card">';
    html += '<div class="di-card-head"><span class="di-card-ic di-ic-deep">🛂</span><span class="di-card-title">Viza & Ulazak</span></div>';
    if (v.type) html += '<div class="di-row"><span class="di-label">Status</span><span class="di-val ' + visaColor + '">' + esc(v.type) + '</span></div>';
    if (v.duration) html += '<div class="di-row"><span class="di-label">Boravak</span><span class="di-val">' + esc(v.duration) + '</span></div>';
    if (v.passport_note) html += '<div class="di-row"><span class="di-label">Pasoš</span><span class="di-val">' + esc(v.passport_note) + '</span></div>';
    if (v.health_note) html += '<div class="di-row"><span class="di-label">Zdravlje</span><span class="di-val">' + esc(v.health_note) + '</span></div>';
    html += '</div>';

    html += '</div>'; /* /di-grid */

    /* ── Budžet ── */
    var dc = d.daily_cost || {};
    html += '<div class="di-card di-card-full">';
    html += '<div class="di-card-head"><span class="di-card-ic di-ic-gold">💰</span><span class="di-card-title">Okvirni dnevni troškovi po osobi</span></div>';
    html += '<div class="di-budget-row">';
    if (dc.budget) html += '<div class="di-budget-tier di-tier-budget"><div class="di-tier-label">🎒 Budžet</div><div class="di-tier-price">' + esc(dc.budget.range) + '</div><div class="di-tier-note">' + esc(dc.budget.note || '') + '</div></div>';
    if (dc.mid)    html += '<div class="di-budget-tier di-tier-mid"><div class="di-tier-label">✈️ Balans</div><div class="di-tier-price">' + esc(dc.mid.range) + '</div><div class="di-tier-note">' + esc(dc.mid.note || '') + '</div></div>';
    if (dc.comfort) html += '<div class="di-budget-tier di-tier-comfort"><div class="di-tier-label">🛎️ Komfor</div><div class="di-tier-price">' + esc(dc.comfort.range) + '</div><div class="di-tier-note">' + esc(dc.comfort.note || '') + '</div></div>';
    html += '</div>';
    html += '</div>';

    /* ── Grid row 2: Transport + Praktično ── */
    html += '<div class="di-grid">';

    /* Transport */
    var tr = d.transport || {};
    html += '<div class="di-card">';
    html += '<div class="di-card-head"><span class="di-card-ic di-ic-deep">🚇</span><span class="di-card-title">Transport</span></div>';
    if (tr.public) html += '<div class="di-row"><span class="di-label">Javni</span><span class="di-val">' + esc(tr.public) + '</span></div>';
    if (tr.taxi)   html += '<div class="di-row"><span class="di-label">Taksi</span><span class="di-val">' + esc(tr.taxi) + '</span></div>';
    if (tr.tip)    html += '<div class="di-row"><span class="di-label">💡 Savet</span><span class="di-val">' + esc(tr.tip) + '</span></div>';
    html += '</div>';

    /* Praktično */
    var pr = d.practical || {};
    html += '<div class="di-card">';
    html += '<div class="di-card-head"><span class="di-card-ic di-ic-coral">🔌</span><span class="di-card-title">Praktično</span></div>';
    if (pr.plug)       html += '<div class="di-row"><span class="di-label">Adapter</span><span class="di-val">' + esc(pr.plug) + '</span></div>';
    if (pr.water)      html += '<div class="di-row"><span class="di-label">Voda</span><span class="di-val">' + esc(pr.water) + '</span></div>';
    if (pr.tip_custom) html += '<div class="di-row"><span class="di-label">Napojnica</span><span class="di-val">' + esc(pr.tip_custom) + '</span></div>';
    if (d.safety_note) html += '<div class="di-row"><span class="di-label">Bezbednost</span><span class="di-val">' + esc(d.safety_note) + '</span></div>';
    html += '</div>';

    html += '</div>'; /* /di-grid */

    /* ── Must-see ── */
    var ms = d.must_see || [];
    if (ms.length) {
      html += '<div class="di-card di-card-full">';
      html += '<div class="di-card-head"><span class="di-card-ic di-ic-aqua">🎡</span><span class="di-card-title">Must-see</span></div>';
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
      html += '<div class="di-card-head"><span class="di-card-ic di-ic-purple">💬</span><span class="di-card-title">Korisne fraze</span></div>';
      ph.forEach(function (p) {
        html += '<div class="di-row"><span class="di-label">' + esc(p.sr) + '</span><span class="di-val di-phrase">' + esc(p.local) + '</span></div>';
      });
      html += '</div>';
    }

    ct.innerHTML = html;
    ct.hidden = false;

    var disc = el('destInfoDisclaimer');
    if (disc) disc.hidden = false;
  }

  /* ── Init ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchDest);
  } else {
    watchDest();
  }

})();
