/* guide-lang.js — jezik na stranicama vodiča (vodic-*.html, vodici.html i njihovi prevodi).
   1) Ako je izabran drugi jezik (?lang= ili sklopi_lang iz localStorage — isti ključ kao u aplikaciji)
      i postoji prevod ove stranice (<link rel="alternate" hreflang>), prebaci na njega.
   2) Ubaci mali prekidač jezika u gornju traku (samo za jezike koji za ovu stranicu postoje).
   Botovi nemaju localStorage ni ?lang= pa vide pravu stranicu — SEO se ne menja. */
(function(){
  'use strict';
  var cur = (document.documentElement.getAttribute('lang') || 'sr').slice(0, 2);
  var alts = {};
  Array.prototype.forEach.call(document.querySelectorAll('link[rel="alternate"][hreflang]'), function(l){
    var c = l.getAttribute('hreflang');
    if (c && c !== 'x-default') {
      // Apsolutni hreflang (https://sklopi.rs/...) pretvaramo u relativni fajl, da prebacivanje jezika
      // radi na bilo kom domenu (workers.dev, sklopi.rs...). <link> tagovi ostaju isti (SEO).
      var h = l.getAttribute('href');
      try { h = new URL(h, location.href).pathname.split('/').pop() || h; } catch(e){}
      alts[c] = h;
    }
  });
  function same(u){ try { return new URL(u, location.href).pathname === location.pathname; } catch(e){ return true; } }
  function go(code){
    var u; try { u = new URL(alts[code], location.href); } catch(e){ return false; }
    if (u.pathname === location.pathname) return false;
    u.hash = location.hash;
    location.replace(u.href);
    return true;
  }
  var want = '';
  try { want = new URLSearchParams(location.search).get('lang') || ''; } catch(e){}
  if (!want) { try { want = localStorage.getItem('sklopi_lang') || ''; } catch(e){} }
  if (want && want !== cur && alts[want] && go(want)) return;

  var codes = Object.keys(alts).filter(function(c){ return c === cur || !same(alts[c]); });
  if (codes.length < 2) return;
  var order = ['sr', 'en', 'ru', 'de'];
  codes.sort(function(a, b){ var x = order.indexOf(a), y = order.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); });
  function init(){
    var bar = document.querySelector('.topbar-right');
    if (!bar || bar.querySelector('.guide-langs')) return;
    var box = document.createElement('span');
    box.className = 'guide-langs';
    box.style.cssText = 'display:inline-flex;gap:10px;margin-right:14px;font:700 13px Inter,sans-serif;';
    codes.forEach(function(c){
      var a = document.createElement('a');
      a.textContent = c.toUpperCase();
      a.href = c === cur ? '#' : alts[c];
      a.hreflang = c;
      a.style.cssText = 'text-decoration:none;color:inherit;opacity:' + (c === cur ? '1' : '.6') + ';' + (c === cur ? 'border-bottom:2px solid currentColor;' : '');
      if (c === cur) a.setAttribute('aria-current', 'true');
      a.addEventListener('click', function(e){
        try { localStorage.setItem('sklopi_lang', c); } catch(err){}
        if (c === cur) e.preventDefault();
      });
      box.appendChild(a);
    });
    bar.insertBefore(box, bar.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
