/* app-17-itinerary.js — ekran #7: "Tvoj itinerar" po danima unutar detalja plana.
   Glavni izvor: pravi AI vodič po danima (worker /api/dest-info, part:'itinerary') — imenovana mesta, kvart dana,
   praktičan savet, link ka mapi. Rezerva (ako vodič nije dostupan): stari šablon iz znamenitosti i jela (SKLOPI_destInfoPeek). */
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
  var aiCache = {}, aiFail = {}, aiPending = {};   // key -> dani vodiča / true / Promise
  var LS_TTL = 7 * 24 * 3600 * 1000;
  function lsGet(k){ try { var o = JSON.parse(localStorage.getItem(k) || 'null'); return o && Date.now() - o.t < LS_TTL ? o.v : null; } catch(e){ return null; } }
  function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify({ t: Date.now(), v: v })); } catch(e){} }
  function lang(){ try { if (typeof window.getLang === 'function') return window.getLang(); } catch(e){} try { return localStorage.getItem('sklopi_lang') || 'sr'; } catch(e){ return 'sr'; } }
  function tier(){
    var p = window.SKLOPI_ACTIVE_PLAN, t = p && p.title ? String(p.title) : '';
    return t === 'Budžet' ? 'budget' : (t === 'Komfor' ? 'comfort' : 'balanced');
  }

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
  var IC = { sight:'📍', food:'🍽️', walk:'🚶', view:'🌅', market:'🧺', trip:'🚌', rest:'☕', night:'🌙' };
  function mapUrl(name){
    var dest = ctx().dest || '';
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(name + ' ' + dest);
  }
  function renderDay(){
    var d = state.days[state.sel];
    if (!d){ dayEl.innerHTML = ''; return; }
    dayEl.setAttribute('aria-labelledby', 'piTab' + state.sel);
    var title = d.ai ? d.title : tr(d.title);
    dayEl.innerHTML = '<h4 class="pi-day-title">' + esc(tr('Dan') + ' ' + (state.sel + 1) + ' – ' + title) + '</h4>'
      + (d.area ? '<p class="pi-area">📍 ' + esc(d.area) + '</p>' : '')
      + '<ol class="pi-slots">' + d.slots.map(function(s){
        var nm = d.ai ? s.name : tr(s.name), nt = d.ai ? s.note : tr(s.note);
        var link = d.ai && s.k !== 'walk' ? ' <a class="pi-map" href="' + esc(mapUrl(s.name)) + '" target="_blank" rel="noopener">' + esc(tr('Mapa')) + ' ↗</a>' : '';
        return '<li class="pi-slot pi-' + esc(IC[s.k] ? s.k : 'sight') + '"><time class="pi-time">' + esc(s.t) + '</time>'
          + '<span class="pi-ic" aria-hidden="true">' + (IC[s.k] || IC.sight) + '</span>'
          + '<span class="pi-copy"><b>' + esc(nm) + '</b>'
          + (nt ? '<small>' + esc(nt) + link + '</small>' : (link ? '<small>' + link + '</small>' : '')) + '</span>'
          + (s.dur ? '<span class="pi-dur">' + esc(s.dur) + '</span>' : '') + '</li>';
      }).join('') + '</ol>'
      + (d.tip ? '<p class="pi-tip">💡 ' + esc(d.tip) + '</p>' : '');
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

  function setSub(n){
    var p = window.SKLOPI_ACTIVE_PLAN;
    var plan = p && p.title ? ' · ' + tr(p.title) + ' ' + tr('plan') : '';
    subEl.textContent = n + ' ' + tr(n === 1 ? 'dan' : 'dana') + plan;
  }
  function apply(days, n, key){
    var keep = state.sel;
    state.key = key || '';
    state.days = days;
    state.sel = keep < days.length ? keep : 0;
    setSub(n);
    box.hidden = false;
    renderTabs(); renderDay();
  }
  function showTemplate(info, c){
    var n = Math.min(MAX_DAYS, Math.max(1, Number(c.days) || 1));
    if (!info || !info.sights.length){ box.hidden = true; return; }
    apply(build(n, info), n);
  }
  function loadTemplate(){
    var c = ctx(), dest = c.dest;
    if (!dest || typeof window.SKLOPI_destInfoPeek !== 'function'){ box.hidden = true; return; }
    if (cache[dest]){ showTemplate(cache[dest], c); return; }
    var my = ++token;
    window.SKLOPI_destInfoPeek(dest).then(function(r){
      if (my !== token) return;                       // stigao je noviji zahtev
      var info = r && r.real && r.sightsAll && r.sightsAll.length ? { sights:r.sightsAll, food:r.foodAll || [] } : null;
      if (info) cache[dest] = info;
      showTemplate(info, ctx());
    });
  }

  /* ---------- pravi vodič (AI, keširan u workeru i u pregledaču) ---------- */
  function cleanDays(raw, n){
    if (!raw || !Array.isArray(raw.days) || raw.days.length < n) return null;
    var out = raw.days.slice(0, n).map(function(d){
      var slots = (d.slots || []).filter(function(s){ return s && s.name && /^\d{1,2}:\d{2}$/.test(String(s.t || '').trim()); })
        .map(function(s){ return { t: String(s.t).trim().replace(/^(\d):/, '0$1:'), k: IC[s.k] ? s.k : 'sight', name: String(s.name), note: String(s.note || ''), dur: String(s.dur || '') }; });
      return { ai: true, title: String(d.title || ''), area: String(d.area || ''), tip: String(d.tip || ''), slots: slots };
    });
    return out.every(function(d){ return d.slots.length >= 4 && d.title; }) ? out : null;
  }
  function fetchGuide(dest, n, tr_, key){
    if (aiPending[key]) return aiPending[key];
    var delays = [2500, 6000];
    function attempt(i){
      return fetch('/api/dest-info', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dest: dest, lang: lang(), part: 'itinerary', days: n, tier: tr_ })
      }).then(function(res){
        if (!res.ok){ var e = new Error('HTTP ' + res.status); e.status = res.status; throw e; }
        return res.json();
      }).then(function(raw){
        var days = cleanDays(raw, n);
        if (!days){ var ie = new Error('neispravan odgovor'); ie.status = 422; throw ie; }
        return days;
      }).catch(function(err){
        var retry = !err.status || err.status === 429 || err.status >= 500;
        if (retry && i < delays.length) return new Promise(function(r){ setTimeout(r, delays[i]); }).then(function(){ return attempt(i + 1); });
        throw err;
      });
    }
    aiPending[key] = attempt(0).then(function(days){ aiCache[key] = days; lsSet(key, days); return days; })
      .catch(function(e){ aiFail[key] = true; console.warn('[sklopi][itinerar] vodič nije dostupan, koristim šablon:', e && e.message); return null; })
      .then(function(r){ delete aiPending[key]; return r; });
    return aiPending[key];
  }
  function load(){
    var c = ctx(), dest = c.dest;
    if (!dest){ box.hidden = true; return; }
    var n = Math.min(MAX_DAYS, Math.max(1, Number(c.days) || 1)), t = tier();
    var key = 'sklopi_itin2|' + dest.toLowerCase() + '|' + n + '|' + t + '|' + lang();
    var hit = aiCache[key] || (aiCache[key] = lsGet(key));
    if (hit){ apply(hit, n, key); return; }
    if (aiFail[key]){ loadTemplate(); return; }
    var my = ++token;
    // Dok se vodič priprema: poruka umesto praznine (ako već postoji prikaz za ovaj grad, ostaje dok ne stigne novi).
    if (box.hidden || state.key !== key){
      box.hidden = false; tabs.innerHTML = '';
      subEl.textContent = n + ' ' + tr(n === 1 ? 'dan' : 'dana');
      dayEl.innerHTML = '<p class="pi-loading">⏳ ' + esc(tr('Pripremamo vodič po danima za') + ' ' + dest + '…') + '</p>';
    }
    fetchGuide(dest, n, t, key).then(function(days){
      if (my !== token) return;                       // stigao je noviji zahtev
      if (days) apply(days, n, key); else loadTemplate();
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
