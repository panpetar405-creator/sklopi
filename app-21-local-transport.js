/* app-21-local-transport.js — ekran #11: "Prevoz u <grad>" (#carDetail) sa tabovima Opcije / Karta / Saveti.
   Opcije: Javni prevoz i Taksi iz dest-info (transport.public / transport.taxi) + postojeća procena za rent-a-car.
   Karta: Google Maps pretraga javnog prevoza. Saveti: savet iz dest-info + opšti saveti za najam auta.
   Bez izmišljenih linija, cena karata ni vozača — prikazuje se samo ono što AI info vrati. */
(function(){
  'use strict';
  var sec = document.getElementById('carDetail');
  var body = sec && sec.querySelector('.fd-body');
  var tabs = document.getElementById('cdTabs');
  var elOpts = document.getElementById('cdOptions');
  var elMap = document.getElementById('cdMap');
  var elTips = document.getElementById('cdTips');
  if (!sec || !body || !tabs || !elOpts) return;

  var cache = {}, token = 0, sel = 'recs';

  function tr(s){ try { return typeof tx === 'function' ? tx(s) : s; } catch(e){ return s; } }
  function esc(s){
    return typeof escapeHtml === 'function' ? escapeHtml(s) :
      String(s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
  }
  function ctx(){ try { return builderCtx(); } catch(e){ return { dest:'' }; } }
  function city(d){ try { return typeof cityLabel === 'function' ? cityLabel(d) : d; } catch(e){ return d; } }

  function setTab(id){
    sel = id;
    body.setAttribute('data-hd-tab', id);
    Array.prototype.forEach.call(tabs.querySelectorAll('.hd-tab'), function(b){
      var on = b.dataset.tab === id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.setAttribute('tabindex', on ? '0' : '-1');
    });
  }
  tabs.addEventListener('click', function(e){
    var b = e.target.closest('.hd-tab');
    if (b) setTab(b.dataset.tab);
  });
  tabs.addEventListener('keydown', function(e){
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var all = Array.prototype.slice.call(tabs.querySelectorAll('.hd-tab'));
    var i = all.findIndex(function(b){ return b.dataset.tab === sel; });
    var n = all[Math.max(0, Math.min(all.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)))];
    if (n){ e.preventDefault(); setTab(n.dataset.tab); n.focus(); }
  });

  /* ---------- opcije ---------- */
  var GENERIC_TIPS = [
    'Pre najma proveri depozit, osiguranje i pravilo za gorivo.',
    'U centru grada parking je često skup i težak za nalaženje — razmisli o javnom prevozu za gradske ture.',
    'Preuzmi offline mapu grada pre polaska da ne zavisiš od roaminga.'
  ];
  function opt(icon, title, text){
    return '<article class="hd-opt"><span class="hd-opt-ic" aria-hidden="true">' + icon + '</span>'
      + '<div><h4>' + esc(tr(title)) + '</h4><p>' + esc(text) + '</p></div></article>';
  }
  function renderOpts(t){
    var h = '';
    if (t && t.pub)  h += opt('🚇', 'Javni prevoz', t.pub);
    if (t && t.taxi) h += opt('🚕', 'Taksi / Bolt', t.taxi);
    elOpts.innerHTML = h
      ? '<h3 class="hd-sub">' + esc(tr('Kako se kretati po gradu')) + '</h3>' + h
        + '<p class="hd-areas-note">' + esc(tr('Informacije su AI procena radi orijentacije.')) + '</p>'
      : '';
  }
  function renderTips(t){
    var list = [];
    if (t && t.tip) list.push(t.tip);
    GENERIC_TIPS.forEach(function(x){ list.push(tr(x)); });
    elTips.innerHTML = list.map(function(x){ return '<li><span aria-hidden="true">✓</span> ' + esc(x) + '</li>'; }).join('');
  }
  function renderMap(c){
    var q = encodeURIComponent('public transport in ' + c.dest);
    elMap.innerHTML = '<p class="hd-map-text">' + esc(tr('Pogledaj stanice i linije javnog prevoza u gradu.')) + '</p>'
      + '<a class="hd-area-cta hd-map-cta" href="https://www.google.com/maps/search/?api=1&query=' + q + '" target="_blank" rel="noopener">'
      + '<span>' + esc(tr('Otvori mapu prevoza')) + '</span> <span aria-hidden="true">↗</span></a>';
  }

  function render(){
    if (sec.hidden) return;
    var c = ctx();
    var h = document.getElementById('carDetailTitle');
    if (h) h.textContent = tr('Prevoz u ') + city(c.dest);
    renderMap(c);
    if (cache[c.dest]){ renderOpts(cache[c.dest]); renderTips(cache[c.dest]); return; }
    renderOpts(null); renderTips(null);
    if (typeof window.SKLOPI_destInfoPeek !== 'function') return;
    var my = ++token;
    window.SKLOPI_destInfoPeek(c.dest).then(function(r){
      if (my !== token) return;
      var t = r && r.real && r.localTransport ? r.localTransport : null;
      if (t) cache[c.dest] = t;
      renderOpts(t); renderTips(t);
    });
  }
  document.addEventListener('sklopi:plan-breakdown', function(){ setTab('recs'); setTimeout(render, 0); });
  document.addEventListener('sklopi:lang', function(){ if (!sec.hidden) setTimeout(render, 0); });
  setTab('recs');
})();
