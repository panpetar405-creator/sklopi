/* app-17-itinerary.js — ekran #7: "Tvoj itinerar" po danima unutar detalja plana.
   Izvor: znamenitosti (must_see) i lokalna jela (food) iz dest-info (SKLOPI_destInfoPeek).
   Dnevni šablon: jutarnja znamenitost → ručak → popodnevna znamenitost → šetnja → večera.
   Ne izmišlja sadržaj: kad ponestane znamenitosti, dan postaje "Slobodan dan"; bez podataka sekcija se krije. */
(function(){
  'use strict';
  var box = document.getElementById('planItinerary');
  if (!box) return;
  var tabs = document.getElementById('piTabs');
  var dayEl = document.getElementById('piDay');
  var subEl = document.getElementById('planItinerarySub');
  var MAX_DAYS = 10;
  var cache = {};          // dest -> {sights, food}
  var state = { days: [], sel: 0 };
  var token = 0;

  function tr(s){ try { return typeof tx === 'function' ? tx(s) : s; } catch(e){ return s; } }
  function esc(s){
    return typeof escapeHtml === 'function' ? escapeHtml(s) :
      String(s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
  }
  function ctx(){ try { return builderCtx(); } catch(e){ return { dest:'', days:3 }; } }

  /* ---------- građenje dana ---------- */
  function title(i, total, hasSights){
    if (i === 0) return 'Upoznaj grad';
    if (!hasSights) return 'Slobodan dan';
    if (i === total - 1 && total >= 3) return 'Poslednji dan';
    return 'Istraži dalje';
  }
  function build(total, info){
    var sights = info.sights, food = info.food, days = [], si = 0;
    for (var i = 0; i < total; i++){
      var a = sights[si++], b = sights[si++];
      var f1 = food.length ? food[(i * 2) % food.length] : null;
      var f2 = food.length ? food[(i * 2 + 1) % food.length] : null;
      var slots = [];
      if (a) slots.push({ t:'09:30', k:'sight', name:a.a, note:a.b, dur:'~2h' });
      else   slots.push({ t:'10:00', k:'walk', name:'Slobodno vreme u gradu', note:'Istraži kvart po svom izboru', dur:'' });
      slots.push({ t:'12:30', k:'food', name:'Ručak', note:f1 ? 'Probaj: ' + f1.a : 'Lokalni restoran', dur:'~1h' });
      if (b) slots.push({ t:'14:30', k:'sight', name:b.a, note:b.b, dur:'~2h' });
      slots.push({ t:'17:30', k:'walk', name:'Šetnja i odmor', note:'Kafa, pogled, kupovina suvenira', dur:'~1.5h' });
      slots.push({ t:'20:00', k:'food', name:'Večera', note:f2 ? 'Probaj: ' + f2.a : 'Lokalni restoran', dur:'~2h' });
      days.push({ title: title(i, total, !!a), slots: slots });
    }
    return days;
  }

  /* ---------- prikaz ---------- */
  var IC = { sight:'📍', food:'🍽️', walk:'🚶' };
  function renderDay(){
    var d = state.days[state.sel];
    if (!d){ dayEl.innerHTML = ''; return; }
    dayEl.setAttribute('aria-labelledby', 'piTab' + state.sel);
    dayEl.innerHTML = '<h4 class="pi-day-title">' + esc(tr('Dan') + ' ' + (state.sel + 1) + ' – ' + tr(d.title)) + '</h4>'
      + '<ol class="pi-slots">' + d.slots.map(function(s){
        return '<li class="pi-slot pi-' + s.k + '"><time class="pi-time">' + s.t + '</time>'
          + '<span class="pi-ic" aria-hidden="true">' + IC[s.k] + '</span>'
          + '<span class="pi-copy"><b>' + esc(tr(s.name)) + '</b>'
          + (s.note ? '<small>' + esc(tr(s.note)) + '</small>' : '') + '</span>'
          + (s.dur ? '<span class="pi-dur">' + s.dur + '</span>' : '') + '</li>';
      }).join('') + '</ol>';
  }
  function renderTabs(){
    tabs.innerHTML = state.days.map(function(_, i){
      var on = i === state.sel;
      return '<button type="button" role="tab" class="pi-tab' + (on ? ' is-on' : '') + '" id="piTab' + i + '" data-i="' + i + '"'
        + ' aria-selected="' + (on ? 'true' : 'false') + '" tabindex="' + (on ? '0' : '-1') + '">' + esc(tr('Dan') + ' ' + (i + 1)) + '</button>';
    }).join('');
  }
  function select(i, focus){
    if (i < 0 || i >= state.days.length) return;
    state.sel = i; renderTabs(); renderDay();
    if (focus){ var b = document.getElementById('piTab' + i); if (b) b.focus(); }
  }
  tabs.addEventListener('click', function(e){
    var b = e.target.closest('.pi-tab');
    if (b) select(Number(b.dataset.i), false);
  });
  tabs.addEventListener('keydown', function(e){
    var b = e.target.closest('.pi-tab');
    if (!b) return;
    var i = Number(b.dataset.i);
    if (e.key === 'ArrowRight'){ e.preventDefault(); select(Math.min(i + 1, state.days.length - 1), true); }
    else if (e.key === 'ArrowLeft'){ e.preventDefault(); select(Math.max(i - 1, 0), true); }
  });

  function show(info, c){
    var n = Math.min(MAX_DAYS, Math.max(1, Number(c.days) || 1));
    if (!info || !info.sights.length){ box.hidden = true; return; }
    var keep = state.sel;
    state.days = build(n, info);
    state.sel = keep < n ? keep : 0;
    var p = window.SKLOPI_ACTIVE_PLAN;
    var plan = p && p.title ? ' · ' + tr(p.title) + ' ' + tr('plan') : '';
    subEl.textContent = n + ' ' + tr(n === 1 ? 'dan' : 'dana') + plan;
    box.hidden = false;
    renderTabs(); renderDay();
  }

  function load(){
    var c = ctx(), dest = c.dest;
    if (!dest || typeof window.SKLOPI_destInfoPeek !== 'function'){ box.hidden = true; return; }
    if (cache[dest]){ show(cache[dest], c); return; }
    var my = ++token;
    window.SKLOPI_destInfoPeek(dest).then(function(r){
      if (my !== token) return;                       // stigao je noviji zahtev
      var info = r && r.real && r.sightsAll && r.sightsAll.length ? { sights:r.sightsAll, food:r.foodAll || [] } : null;
      if (info) cache[dest] = info;
      show(info, ctx());
    });
  }

  var lastDest = '';
  document.addEventListener('sklopi:plan-changed', function(){
    var d = ctx().dest;
    if (d !== lastDest){ lastDest = d; state.sel = 0; }   // drugi grad → opet Dan 1; eSIM/preračun zadržava izabran dan
    load();
  });
  document.addEventListener('sklopi:lang', function(){ if (!box.hidden) load(); });
})();
