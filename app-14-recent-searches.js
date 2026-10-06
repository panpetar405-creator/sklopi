/* app-14-recent-searches.js — ekran #2: "Nedavno pretraga" + dugme za filtere u polju za pretragu.
   Klasična skripta; učitava se posle app-08. Ne menja postojeće tokove: samo prati bumpSearchStat()
   (poziva ga i klik na karticu i dugme "Kreni") i čuva poslednje destinacije u localStorage. */
(function(){
  'use strict';
  var KEY = 'sklopi_recent_dest';
  var MAX = 4;
  var list = document.getElementById('recentSearchList');
  var wrap = document.getElementById('recentSearches');
  var clearBtn = document.getElementById('recentSearchClear');
  var section = document.getElementById('popular-destinations');
  var filterBtn = document.getElementById('popularFilterToggle');

  function tr(s){ try { return typeof tx === 'function' ? tx(s) : s; } catch(e){ return s; } }
  function load(){
    try {
      var a = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(a) ? a.filter(function(x){ return typeof x === 'string' && x; }).slice(0, MAX) : [];
    } catch(e){ return []; }
  }
  function save(a){ try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, MAX))); } catch(e){} }
  function same(a, b){
    var n = typeof normalizeSr === 'function' ? normalizeSr : function(s){ return String(s).toLowerCase(); };
    return n(a) === n(b);
  }
  function add(dest){
    dest = String(dest || '').split(',')[0].trim();
    if (!dest || dest.length > 60) return;
    dest = dest.charAt(0).toUpperCase() + dest.slice(1);
    var a = load().filter(function(x){ return !same(x, dest); });
    a.unshift(dest);
    save(a);
    render();
  }
  function info(dest){
    var d = { name: dest, country: '', image: '' };
    try {
      var c = popularCardData({ dest: dest, name: dest });
      d.name = c.name || dest;
      d.country = String(c.meta || '').split(' · ')[0];
      d.image = c.image || '';
    } catch(e){}
    return d;
  }
  function esc(s){
    return typeof escapeHtml === 'function' ? escapeHtml(s) :
      String(s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
  }
  function render(){
    if (!list || !wrap) return;
    var a = load();
    wrap.hidden = !a.length;
    list.innerHTML = a.map(function(dest){
      var d = info(dest);
      var thumb = d.image
        ? '<img alt="" loading="lazy" src="' + esc(d.image) + '">'
        : '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>';
      return '<li><button class="recent-row" data-dest="' + esc(dest) + '" type="button">'
        + '<span class="recent-thumb">' + thumb + '</span>'
        + '<span class="recent-copy"><span class="recent-name">' + esc(d.name) + '</span>'
        + (d.country ? '<span class="recent-country">' + esc(d.country) + '</span>' : '') + '</span>'
        + '<span class="recent-arrow" aria-hidden="true">›</span></button></li>';
    }).join('');
  }
  function open(dest){
    var dEl = document.getElementById('dest');
    if (dEl) dEl.value = dest;
    try { trackFunnelEvent('search_submit', { destination: dest }); } catch(e){}
    try { bumpSearchStat(dest); } catch(e){}
    if (window.SKLOPI_setSpotlight) window.SKLOPI_setSpotlight(dest, { generic: true, loose: true });
    if (window.SKLOPI_showDestPlans) window.SKLOPI_showDestPlans();
    else if (typeof runSearch === 'function') runSearch(false);
  }

  if (list) list.addEventListener('click', function(e){
    var b = e.target.closest('.recent-row');
    if (b) open(b.getAttribute('data-dest'));
  });
  if (clearBtn) clearBtn.addEventListener('click', function(){
    try { localStorage.removeItem(KEY); } catch(e){}
    render();
  });
  if (filterBtn && section) filterBtn.addEventListener('click', function(){
    var on = section.classList.toggle('is-filters-open');
    filterBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
  });

  /* Svaka pretraga (klik na karticu ili "Kreni") prolazi kroz bumpSearchStat — tu je beležimo. */
  var orig = window.bumpSearchStat;
  if (typeof orig === 'function'){
    window.bumpSearchStat = function(dest){
      try { add(dest); } catch(e){}
      return orig.apply(this, arguments);
    };
  }
  render();
  window.SKLOPI_recentSearches = { add: add, render: render };
  void tr;
})();
