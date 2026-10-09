/* trip-bar.js — lepljiva traka "Ukupno ~X € + Podeli" i otvaranje podeljenog linka (#t=…).
   Sve stanje čita iz TripStore-a (trip-store.js); ništa ne računa sam (cenu računa isti motor kao i ranije).
   Share radi BEZ naloga: link nosi validiran izbor putovanja u adresi (TripStore.toHash), a primalac
   dobija SVOJU izračunatu cenu (ne veruje se ceni iz linka). */
(function(){
  'use strict';
  if (!window.TripStore || !document.body) return;
  var TS = window.TripStore;
  var tr = function(s){ return typeof window.tx === 'function' ? window.tx(s) : s; };
  var money = function(n){ return typeof fmtEUR === 'function' ? fmtEUR(n) : '€' + Math.round(n); };
  var toast = function(m){ if (typeof showToast === 'function') showToast(m); };

  var bar, elLabel, elTotal, elDelta, elPax, elNights, elBudget, elShareTxt, elLive;
  var prev = null, ctxKey = null, last = null, deltaTimer = 0, liveTimer = 0;

  function build(){
    bar = document.createElement('div');
    bar.className = 'trip-bar'; bar.id = 'tripBar'; bar.hidden = true;
    bar.setAttribute('role', 'region');
    bar.innerHTML =
      '<div class="tb-text">' +
        '<div class="tb-main"><span class="tb-label"></span><strong class="tb-total"></strong><span class="tb-delta" aria-hidden="true"></span></div>' +
        '<div class="tb-sub"><span class="tb-pax"></span><span class="tb-nights"></span><span class="tb-budget"></span></div>' +
      '</div>' +
      '<button type="button" class="tb-share">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"/><path d="M12 3v12M8 7l4-4 4 4"/></svg>' +
        '<span class="tb-share-txt"></span>' +
      '</button>' +
      '<div class="tb-live" aria-live="polite" aria-atomic="true"></div>';
    document.body.appendChild(bar);
    elLabel = bar.querySelector('.tb-label'); elTotal = bar.querySelector('.tb-total'); elDelta = bar.querySelector('.tb-delta');
    elPax = bar.querySelector('.tb-pax'); elNights = bar.querySelector('.tb-nights'); elBudget = bar.querySelector('.tb-budget');
    elShareTxt = bar.querySelector('.tb-share-txt'); elLive = bar.querySelector('.tb-live');
    bar.querySelector('.tb-share').addEventListener('click', onShare);
    labels();
  }

  function labels(){
    if (!bar) return;
    bar.setAttribute('aria-label', tr('Ukupna cena putovanja'));
    elLabel.textContent = tr('Ukupno');
    elShareTxt.textContent = tr('Podeli');
    bar.querySelector('.tb-share').setAttribute('aria-label', tr('Podeli putovanje'));
    if (last) paint(last);
  }

  function nightsOf(s){
    if (!s.from || !s.to) return null;
    var n = Math.round((Date.parse(s.to + 'T00:00:00Z') - Date.parse(s.from + 'T00:00:00Z')) / 86400000);
    return isFinite(n) && n > 0 ? n : null;
  }
  function keyOf(s){ return [s.dest, s.origin, s.from, s.to, s.adults].join('|'); }

  function paint(s){
    elTotal.textContent = money(s.total);
    elPax.textContent = '👤 ' + s.adults; elPax.title = tr('Broj putnika') + ': ' + s.adults;
    var n = nightsOf(s);
    elNights.textContent = n ? '🌙 ' + n : ''; elNights.title = n ? tr('Broj noći') + ': ' + n : '';
    var b = s.sel && s.sel.budget;
    if (b){
      var ok = s.total <= b;
      elBudget.className = 'tb-budget ' + (ok ? 'ok' : 'over');
      elBudget.textContent = (ok ? '✓ ' + tr('U okviru budžeta') : '⚠ ' + tr('preko budžeta')) + ' (' + money(b) + ')';
    } else { elBudget.className = 'tb-budget'; elBudget.textContent = ''; }
  }

  function hide(){
    if (!bar) return;
    bar.hidden = true; document.body.classList.remove('has-trip-bar');
    prev = null; last = null;
  }

  function update(s, changed){
    // Kad se polja pretrage promene u odnosu na putovanje koje je cenjeno, stara cena više ne važi → sakrij traku.
    if (changed && changed.indexOf('estimate') === -1 && ctxKey !== null && last && keyOf(s) !== ctxKey){ hide(); ctxKey = null; return; }
    if (s.total == null){ hide(); return; }
    if (!bar) build();
    if (changed && changed.indexOf('estimate') !== -1) ctxKey = keyOf(s);
    paint(s);
    if (bar.hidden){ bar.hidden = false; document.body.classList.add('has-trip-bar'); }

    var moved = prev != null && Math.abs(s.total - prev) >= 1;
    if (moved){
      var d = s.total - prev;
      elDelta.textContent = (d > 0 ? '+' : '−') + money(Math.abs(d));
      elDelta.className = 'tb-delta show ' + (d > 0 ? 'up' : 'down');
      clearTimeout(deltaTimer);
      deltaTimer = setTimeout(function(){ elDelta.className = 'tb-delta ' + (d > 0 ? 'up' : 'down'); }, 4000);
      // čitač ekrana: jedno saopštenje po seriji izmena, ne po svakoj
      clearTimeout(liveTimer);
      liveTimer = setTimeout(function(){ elLive.textContent = tr('Ukupno') + ' ' + money(s.total); }, 800);
    }
    prev = s.total; last = s;
  }

  /* ---------- Podeli ---------- */
  function copyText(text){
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function(res, rej){
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand('copy'); ta.remove();
        ok ? res() : rej(new Error('copy'));
      } catch(e){ rej(e); }
    });
  }
  function onShare(){
    var s = TS.snapshot();
    var url = location.origin + location.pathname + TS.toHash(s);
    var text = tr('Procena cene mog putovanja:') + ' ' + (s.total != null ? money(s.total) : '') + (s.dest ? ' — ' + s.dest : '');
    if (navigator.share){
      navigator.share({ title: tr('Moje putovanje'), text: text, url: url }).catch(function(e){
        if (e && e.name === 'AbortError') return;
        copyText(url).then(function(){ toast(tr('Link do tvog putovanja je kopiran.')); }, function(){});
      });
      return;
    }
    copyText(url).then(function(){ toast(tr('Link do tvog putovanja je kopiran.')); },
                       function(){ toast(url); });
  }

  /* ---------- Otvaranje podeljenog linka (#t=…) ---------- */
  function isoPlus(days){ var d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
  function addDays(iso, n){ var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function setVal(id, v){ var el = document.getElementById(id); if (el) el.value = v; }

  function restore(){
    if (!/^#?t=/.test(location.hash)) return;
    var p = TS.fromHash(location.hash);
    if (!p){ toast(tr('Link nije ispravan ili je oštećen.')); return; }
    var ready = typeof builderState !== 'undefined' && typeof BUILDER_DEFAULTS !== 'undefined' && typeof renderBuilder === 'function' &&
                typeof renderFormUI === 'function' && typeof openControlPanel === 'function';
    if (!ready) return;
    try {
      setVal('dest', p.dest);
      if (p.origin) setVal('origin', p.origin);
      if (p.from && p.to){
        var nights = Math.round((Date.parse(p.to + 'T00:00:00Z') - Date.parse(p.from + 'T00:00:00Z')) / 86400000);
        var from = p.from, to = p.to;
        if (from < isoPlus(0)){ from = isoPlus(14); to = addDays(from, Math.max(nights, 1)); }   // stari link: zadrži trajanje, pomeri početak
        setVal('dateFrom', from); setVal('dateTo', to);
      }
      setVal('adults', String(p.adults));
      if (typeof window.syncPaxDisplay === 'function') window.syncPaxDisplay();
      if (typeof window.syncDateDisplay === 'function') window.syncDateDisplay();
      var df = document.getElementById('dateFrom'); if (df) df.dispatchEvent(new Event('change', { bubbles: true }));
      Object.assign(builderState, BUILDER_DEFAULTS, p.sel);
      renderFormUI();
      renderBuilder();
      var sum = document.getElementById('builderSummary'); if (sum) sum.style.display = 'block';
      var ph = document.getElementById('builderPlaceholder'); if (ph) ph.style.display = 'none';
      var bl = document.getElementById('builderBookLinks'); if (bl) bl.style.display = 'none';
      openControlPanel();
      var w = document.querySelector('.builder-wrap'); if (w && w.scrollIntoView) w.scrollIntoView({ behavior: 'auto', block: 'start' });
    } catch(e){
      toast(tr('Link nije ispravan ili je oštećen.'));
    }
  }

  TS.subscribe(update);
  try { new MutationObserver(labels).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] }); } catch(e){}
  if (document.readyState === 'complete') setTimeout(restore, 80);
  else window.addEventListener('load', function(){ setTimeout(restore, 80); });
})();
