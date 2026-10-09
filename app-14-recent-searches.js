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
  /* Statistika "poslednja destinacija" ume da sačuva emoji prefiks ("🧭 Prag") — za naziv grada ga skidamo. */
  function clean(dest){
    return String(dest || '').split(',')[0]
      .replace(/^[\s\p{Extended_Pictographic}\uFE0F\u200D]+/u, '').trim();
  }
  function load(){
    try {
      var a = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (!Array.isArray(a)) return [];
      var out = [];
      a.forEach(function(x){
        x = typeof x === 'string' ? clean(x) : '';
        if (x && !out.some(function(y){ return same(x, y); })) out.push(x);
      });
      return out.slice(0, MAX);
    } catch(e){ return []; }
  }
  function save(a){ try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, MAX))); } catch(e){} }
  function same(a, b){
    var n = typeof normalizeSr === 'function' ? normalizeSr : function(s){ return String(s).toLowerCase(); };
    return n(a) === n(b);
  }
  function add(dest){
    dest = clean(dest);
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
  /* Poslednja rezerva: gradijent (boja iz naziva, uvek ista za isti grad) + početno slovo. */
  function fallbackThumb(thumb, dest){
    var h = 0, i; for (i = 0; i < dest.length; i++) h = (h * 31 + dest.charCodeAt(i)) % 360;
    thumb.classList.add('thumb-fallback');
    thumb.style.background = 'linear-gradient(135deg,hsl(' + h + ',55%,38%),hsl(' + ((h + 40) % 360) + ',60%,22%))';
    thumb.innerHTML = '<span class="thumb-initial" aria-hidden="true">' + esc(dest.charAt(0).toUpperCase()) + '</span>';
  }
  window.SKLOPI_thumbFallback = fallbackThumb;
  var PIN = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>';

  /* Skripte app-11 / app-07 se učitavaju posle ove — pomoćnike zovemo tek kad postoje. */
  function whenReady(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else setTimeout(fn, 0);
  }
  /* Rezervni lanac — isti izvori kao kartice u "Popularne destinacije" (popularFillImages):
     1) urednička fotografija grada, 2) već učitana slika / keš, 3) Viator Worker, pa Wikipedia. */
  function syncPhoto(dest){
    var url = '';
    try { url = (window.SKLOPI_destPhoto && window.SKLOPI_destPhoto(dest, 300)) || ''; } catch(e){}
    if (!url) { try { url = (typeof _destImgMap !== 'undefined' && _destImgMap[dest]) || ''; } catch(e){} }
    if (!url) {
      try {
        if (typeof destReadImgCache === 'function' && typeof WIKI_IMG_CACHE_KEY !== 'undefined')
          url = destReadImgCache(WIKI_IMG_CACHE_KEY, WIKI_IMG_TTL).m[dest] || '';
      } catch(e){}
    }
    return url;
  }
  function remotePhoto(dest){
    return Promise.resolve().then(function(){
      var url = '';
      if (typeof destFetchOneImage === 'function') return destFetchOneImage({ dest: dest, row: '' });
      return url;
    }).then(function(url){
      if (url) return url;
      if (typeof fetchWikiImage === 'function' && typeof destWikiTitle === 'function')
        return fetchWikiImage(destWikiTitle({ dest: dest }));
      return '';
    }).catch(function(){ return ''; });
  }
  function setThumb(thumb, url, dest){
    var img = thumb.querySelector('img');
    if (!img){ thumb.innerHTML = '<img alt="" loading="lazy">'; img = thumb.querySelector('img'); }
    img.onerror = function(){ img.onerror = null; fallbackThumb(thumb, dest); };   // poslednja rezerva: pin ikona, nikad "polomljena" slika
    img.src = url;
  }
  function fillThumb(thumb, dest){
    var url = syncPhoto(dest);
    if (url) return setThumb(thumb, url, dest);
    remotePhoto(dest).then(function(u){
      if (!thumb.isConnected) return;
      if (u){
        try {
          if (typeof _destImgMap !== 'undefined') _destImgMap[dest] = u;
          if (typeof destReadImgCache === 'function' && typeof destWriteImgCache === 'function'){
            var c = destReadImgCache(WIKI_IMG_CACHE_KEY, WIKI_IMG_TTL); c.m[dest] = u; destWriteImgCache(WIKI_IMG_CACHE_KEY, c);
          }
        } catch(e){}
        setThumb(thumb, u, dest);
      } else fallbackThumb(thumb, dest);
    });
  }
  function render(){
    if (!list || !wrap) return;
    var a = load();
    wrap.hidden = !a.length;
    list.innerHTML = a.map(function(dest){
      var d = info(dest);
      return '<li><button class="recent-row" data-dest="' + esc(dest) + '" type="button">'
        + '<span class="recent-thumb" data-img="' + esc(d.image) + '">' + (d.image ? '<img alt="" loading="lazy" src="' + esc(d.image) + '">' : PIN) + '</span>'
        + '<span class="recent-copy"><span class="recent-name">' + esc(d.name) + '</span>'
        + (d.country ? '<span class="recent-country">' + esc(d.country) + '</span>' : '') + '</span>'
        + '<span class="recent-arrow" aria-hidden="true">›</span></button></li>';
    }).join('');
    /* Svaka destinacija mora da dobije svoju sliku: ako nema lokalnu/definisanu ili se ne učita → rezervni lanac. */
    whenReady(function(){
      Array.prototype.forEach.call(list.querySelectorAll('.recent-row'), function(row){
        var thumb = row.querySelector('.recent-thumb'), dest = row.getAttribute('data-dest');
        var img = thumb.querySelector('img');
        if (!img) return fillThumb(thumb, dest);
        var fallback = function(){ img.onerror = null; fillThumb(thumb, dest); };
        img.onerror = fallback;
        if (img.complete && !img.naturalWidth) fallback();   // greška pre nego što je handler postavljen
      });
    });
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
