/* app-19-info-index.js — ekran #9: "Dodatne informacije" — brza lista tema (Vize i ulazak, Klima, Prevoz, Valuta…).
   Klik prebaci na pravi tab (app-18), skroluje do odgovarajuće kartice u #destInfoContent i kratko je istakne.
   Tema se prikazuje samo ako odgovarajuća kartica zaista postoji u odgovoru. */
(function(){
  'use strict';
  var ct = document.getElementById('destInfoContent');
  if (!ct || !ct.parentNode) return;

  function tr(s){ try { return typeof tx === 'function' ? tx(s) : s; } catch(e){ return s; } }
  function esc(s){
    return typeof escapeHtml === 'function' ? escapeHtml(s) :
      String(s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
  }

  /* ic = ikona u zaglavlju kartice (ili 'pills' za traku sa valutom), tab = tab u kome se kartica nalazi */
  var TOPICS = [
    { k:'visa',      ic:'🛂',  tab:'visa',    icon:'🛂', t:'Vize i ulazak',        h:'Koji su uslovi za ulazak?' },
    { k:'climate',   ic:'🌤',  tab:'climate', icon:'🌤️', t:'Klima',                h:'Kakvo vreme da očekuješ?' },
    { k:'transport', ic:'🚇',  tab:'basic',   icon:'🚇', t:'Prevoz',               h:'Kako se kretati po gradu?' },
    { k:'money',     ic:'pills', tab:'basic', icon:'💶', t:'Valuta i plaćanje',    h:'Koju valutu poneti i da li se može karticom?' },
    { k:'safety',    ic:'🔌',  tab:'basic',   icon:'🔒', t:'Bezbednost',           h:'Šta treba da znaš?' },
    { k:'internet',  ic:'📶',  tab:'basic',   icon:'📶', t:'Internet i konekcija', h:'WiFi, SIM kartice, eSIM' },
    { k:'emergency', ic:'🚨',  tab:'basic',   icon:'🚨', t:'Hitni brojevi',        h:'Policija, hitna pomoć, ambasada' },
    { k:'sights',    ic:'🎡',  tab:'basic',   icon:'🎡', t:'Znamenitosti',         h:'Šta ne smeš da propustiš' }
  ];

  var box = document.createElement('section');
  box.className = 'di-more';
  box.hidden = true;
  box.setAttribute('aria-labelledby', 'diMoreTitle');
  box.innerHTML = '<h3 class="di-more-title" id="diMoreTitle">' + esc(tr('Dodatne informacije')) + '</h3><ul class="di-more-list" id="diMoreList"></ul>';
  ct.parentNode.insertBefore(box, ct.nextSibling);
  var list = box.querySelector('#diMoreList');

  function target(topic){
    if (topic.ic === 'pills') return ct.querySelector('.di-pills');
    var cards = ct.querySelectorAll('.di-card');
    for (var i = 0; i < cards.length; i++){
      var ic = cards[i].querySelector('.di-card-ic');
      if (ic && ic.textContent.indexOf(topic.ic) >= 0) return cards[i];
    }
    return null;
  }

  function render(){
    if (ct.hidden || !ct.children.length){ box.hidden = true; return; }
    var rows = TOPICS.filter(function(t){ return !!target(t); }).map(function(t){
      return '<li><button type="button" class="di-more-row" data-k="' + t.k + '">'
        + '<span class="di-more-ic" aria-hidden="true">' + t.icon + '</span>'
        + '<span class="di-more-copy"><b>' + esc(tr(t.t)) + '</b><small>' + esc(tr(t.h)) + '</small></span>'
        + '<span class="di-more-arrow" aria-hidden="true">›</span></button></li>';
    }).join('');
    if (list.innerHTML !== rows) list.innerHTML = rows;
    box.hidden = !rows;
  }

  list.addEventListener('click', function(e){
    var b = e.target.closest('.di-more-row');
    if (!b) return;
    var topic = TOPICS.filter(function(t){ return t.k === b.dataset.k; })[0];
    if (!topic) return;
    if (typeof window.SKLOPI_infoSetTab === 'function') window.SKLOPI_infoSetTab(topic.tab);
    var el = target(topic);
    if (!el) return;
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
    el.classList.add('di-flash');
    setTimeout(function(){ el.classList.remove('di-flash'); }, 1800);
  });

  var busy = false;
  new MutationObserver(function(){
    if (busy) return;
    busy = true;
    Promise.resolve().then(function(){ busy = false; render(); });
  }).observe(ct, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
  document.addEventListener('sklopi:lang', function(){
    box.querySelector('#diMoreTitle').textContent = tr('Dodatne informacije');
    list.innerHTML = ''; render();
  });
  render();
})();
