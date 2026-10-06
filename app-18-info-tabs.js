/* app-18-info-tabs.js — ekran #8: "Informacije o destinaciji" u tabovima Osnovno / Troškovi / Vize / Klima
   + "SKLOPI savet" ispod troškova. Ne menja dest-info.js: razvrstava već nacrtane kartice u #destInfoContent
   (po ikoni u zaglavlju kartice) i reaguje kad se sadržaj ponovo iscrta (promena grada, jezika, pasoša, "extra" kartice). */
(function(){
  'use strict';
  var ct = document.getElementById('destInfoContent');
  if (!ct || !ct.parentNode) return;
  var TABS = [
    { id:'basic',   label:'Osnovno' },
    { id:'costs',   label:'Troškovi' },
    { id:'visa',    label:'Vize' },
    { id:'climate', label:'Klima' }
  ];
  var sel = 'basic';

  function tr(s){ try { return typeof tx === 'function' ? tx(s) : s; } catch(e){ return s; } }

  var bar = document.createElement('div');
  bar.className = 'di-tabs';
  bar.setAttribute('role', 'tablist');
  bar.setAttribute('aria-label', tr('Informacije o destinaciji'));
  bar.hidden = true;
  ct.parentNode.insertBefore(bar, ct);

  var tip = document.createElement('div');
  tip.className = 'di-savet';
  tip.id = 'diSavet';
  tip.hidden = true;
  ct.parentNode.insertBefore(tip, ct.nextSibling);

  function cardTab(card){
    var ic = card.querySelector('.di-card-ic');
    var t = ic ? ic.textContent : '';
    if (t.indexOf('\uD83D\uDCB0') >= 0) return 'costs';    // 💰
    if (t.indexOf('\uD83D\uDEC2') >= 0) return 'visa';     // 🛂
    if (t.indexOf('\uD83C\uDF24') >= 0) return 'climate';  // 🌤
    if (t.indexOf('\uD83D\uDCC5') >= 0) return 'climate';  // 📅 klima po mesecima
    return 'basic';
  }
  function childTab(el){
    if (el.classList.contains('di-card')) return cardTab(el);
    if (el.classList.contains('di-row')) return 'visa';    // padajuće liste za pasoš
    return 'basic';
  }
  function findTip(){
    var cards = ct.querySelectorAll('.di-card');
    for (var i = 0; i < cards.length; i++){
      var ic = cards[i].querySelector('.di-card-ic');
      if (!ic || ic.textContent.indexOf('\uD83D\uDE87') < 0) continue;   // 🚇 prevoz
      var rows = cards[i].querySelectorAll('.di-row');
      for (var j = 0; j < rows.length; j++){
        var l = rows[j].querySelector('.di-label'), v = rows[j].querySelector('.di-val');
        if (l && v && l.textContent.indexOf('\uD83D\uDCA1') >= 0) return v.textContent.trim();   // 💡
      }
    }
    return '';
  }

  function apply(){
    if (ct.hidden || !ct.children.length){ bar.hidden = true; tip.hidden = true; return; }
    var counts = { basic:0, costs:0, visa:0, climate:0 };
    var kids = Array.prototype.slice.call(ct.children);
    kids.forEach(function(el){
      if (el.classList.contains('di-grid')){
        var any = 0;
        Array.prototype.forEach.call(el.children, function(c){
          var t = childTab(c), on = t === sel;
          c.classList.toggle('di-tab-off', !on);
          counts[t]++; if (on) any++;
        });
        el.classList.toggle('di-tab-off', !any);
      } else {
        var t = childTab(el), on = t === sel;
        el.classList.toggle('di-tab-off', !on);
        counts[t]++;
      }
    });
    if (!counts[sel]){ sel = 'basic'; return apply(); }
    var html = TABS.filter(function(t){ return t.id === 'basic' || counts[t.id]; }).map(function(t){
      var on = t.id === sel;
      return '<button type="button" role="tab" class="di-tab' + (on ? ' is-on' : '') + '" data-tab="' + t.id + '"'
        + ' aria-selected="' + (on ? 'true' : 'false') + '" tabindex="' + (on ? '0' : '-1') + '">' + tr(t.label) + '</button>';
    }).join('');
    if (bar.innerHTML !== html) bar.innerHTML = html;
    bar.hidden = false;
    var txt = sel === 'costs' ? findTip() : '';
    if (txt){
      var h = '<span class="di-savet-ic" aria-hidden="true">💡</span><div><b>' + tr('SKLOPI savet') + '</b><p></p></div>';
      if (tip.getAttribute('data-k') !== txt){ tip.innerHTML = h; tip.querySelector('p').textContent = txt; tip.setAttribute('data-k', txt); }
      tip.hidden = false;
    } else tip.hidden = true;
  }

  bar.addEventListener('click', function(e){
    var b = e.target.closest('.di-tab');
    if (b){ sel = b.dataset.tab; apply(); }
  });
  bar.addEventListener('keydown', function(e){
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var tabs = Array.prototype.slice.call(bar.querySelectorAll('.di-tab'));
    var i = tabs.findIndex(function(t){ return t.dataset.tab === sel; });
    var n = tabs[Math.max(0, Math.min(tabs.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)))];
    if (n){ e.preventDefault(); sel = n.dataset.tab; apply(); var nb = bar.querySelector('[data-tab="' + sel + '"]'); if (nb) nb.focus(); }
  });

  /* za app-19 ("Dodatne informacije"): prebaci tab programski */
  window.SKLOPI_infoSetTab = function(id){
    if (!TABS.some(function(t){ return t.id === id; })) return;
    sel = id; apply();
  };

  var busy = false;
  new MutationObserver(function(){
    if (busy) return;
    busy = true;
    Promise.resolve().then(function(){ busy = false; apply(); });     // jedan prolaz po seriji promena
  }).observe(ct, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
  apply();
})();
