/* app-27-hotel-tabs.js — ekran "Hotel u <grad>" (#hotelDetail): tabovi Preporuke / Karte / Saveti.
   Preporuke: kvartovi za odsedanje iz dest-info (neighborhoods) sa linkom ka Booking.com pretrazi tog kvarta.
   Karte: Google Maps pretraga smeštaja + kvartovi. Saveti: savet o prevozu iz dest-info + opšti saveti za rezervaciju.
   Ne izmišlja hotele ni cene: prikazuje samo ono što AI info vrati, uz napomenu da je procena. */
(function(){
  'use strict';
  var sec = document.getElementById('hotelDetail');
  var body = sec && sec.querySelector('.fd-body');
  var tabs = document.getElementById('hdTabs');
  var elAreas = document.getElementById('hdAreas');
  var elMap = document.getElementById('hdMap');
  var elTips = document.getElementById('hdTips');
  if (!sec || !body || !tabs || !elAreas || !elMap || !elTips) return;

  var cache = {}, token = 0, sel = 'recs';

  function tr(s){ try { return typeof tx === 'function' ? tx(s) : s; } catch(e){ return s; } }
  function esc(s){
    return typeof escapeHtml === 'function' ? escapeHtml(s) :
      String(s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
  }
  function ctx(){ try { return builderCtx(); } catch(e){ return { dest:'' }; } }
  function city(d){ try { return typeof cityLabel === 'function' ? cityLabel(d) : d; } catch(e){ return d; } }
  function mapUrl(q){ return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); }
  function bookingUrl(area, c){
    try {
      var st = (typeof builderState !== 'undefined' && builderState) || {};
      return buildAffiliateLink('hotel', {
        dest: area + ', ' + c.dest, from: c.from, to: c.to, adults: c.adults,
        hotelStars: st.hotelStars || 3, prioritizeLocation: !!st.prioritizeLocation, prioritizeRating: false
      });
    } catch(e){ return ''; }
  }

  /* ---------- tabovi ---------- */
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

  /* ---------- sadržaj ---------- */
  var GENERIC_TIPS = [
    'Pre rezervacije proveri uslove otkazivanja — opcija sa besplatnim otkazom ti ostavlja slobodu da promeniš plan.',
    'Boravišna taksa se često plaća posebno, na recepciji — proveri da li je uračunata u cenu.',
    'Pogledaj tačnu lokaciju na mapi i recenzije iz poslednjih meseci, ne samo opštu ocenu.',
    'Ako stižeš kasno uveče, javi hotelu vreme dolaska da ti ne ukinu rezervaciju.'
  ];
  function renderAreas(areas, c){
    var h = '';
    if (areas && areas.length){
      h += '<h3 class="hd-sub">' + esc(tr('Gde odsesti u ') + city(c.dest)) + '</h3>';
      areas.forEach(function(a){
        var link = bookingUrl(a.area, c);
        h += '<article class="hd-area"><div class="hd-area-head"><h4>' + esc(a.area) + '</h4>'
          + (a.price ? '<span class="hd-area-price">' + esc(a.price) + '</span>' : '') + '</div>'
          + (a.forWho ? '<p class="hd-area-for">' + esc(a.forWho) + '</p>' : '')
          + (a.note ? '<p class="hd-area-note">' + esc(a.note) + '</p>' : '')
          + (link ? '<a class="hd-area-cta" href="' + esc(link) + '" target="_blank" rel="noopener sponsored"><span>'
            + esc(tr('Smeštaj u ovom kvartu')) + '</span> <span aria-hidden="true">↗</span></a>' : '')
          + '</article>';
      });
      h += '<p class="hd-areas-note">' + esc(tr('Informacije su AI procena radi orijentacije.')) + '</p>';
    } else {
      h = '<p class="hd-empty">' + esc(tr('Preporuke po kvartovima trenutno nisu dostupne.')) + '</p>';
    }
    elAreas.innerHTML = h;
  }
  function renderMap(areas, c){
    var h = '<p class="hd-map-text">' + esc(tr('Pogledaj gde se nalaze hoteli i koji kvart ti najviše odgovara.')) + '</p>'
      + '<a class="hd-area-cta hd-map-cta" href="' + esc(mapUrl('hotels in ' + c.dest)) + '" target="_blank" rel="noopener"><span>'
      + esc(tr('Otvori mapu smeštaja')) + '</span> <span aria-hidden="true">↗</span></a>';
    if (areas && areas.length){
      h += '<div class="hd-chips" style="margin:14px 0 0">' + areas.map(function(a){
        return '<a class="hd-chip" style="text-decoration:none" href="' + esc(mapUrl(a.area + ' ' + c.dest)) + '" target="_blank" rel="noopener">📍 ' + esc(a.area) + '</a>';
      }).join('') + '</div>';
    }
    elMap.innerHTML = h;
  }
  function renderTips(info){
    var list = [];
    if (info && info.transportTip) list.push(info.transportTip);
    GENERIC_TIPS.forEach(function(x){ list.push(tr(x)); });
    elTips.innerHTML = list.map(function(x){ return '<li><span aria-hidden="true">✓</span> ' + esc(x) + '</li>'; }).join('');
  }
  function paint(info, c){
    renderAreas(info && info.areas, c);
    renderMap(info && info.areas, c);
    renderTips(info);
  }

  function render(){
    if (sec.hidden) return;
    var c = ctx();
    if (!c.dest) return;
    if (cache[c.dest]){ paint(cache[c.dest], c); return; }
    paint(null, c);
    if (typeof window.SKLOPI_destInfoPeek !== 'function') return;
    var my = ++token;
    window.SKLOPI_destInfoPeek(c.dest).then(function(r){
      if (my !== token) return;
      var info = r && r.real ? { areas: r.areas || [], transportTip: r.localTransport && r.localTransport.tip ? r.localTransport.tip : '' } : null;
      if (info) cache[c.dest] = info;
      paint(info, ctx());
    });
  }
  document.addEventListener('sklopi:plan-breakdown', function(){ setTab('recs'); setTimeout(render, 0); });
  document.addEventListener('sklopi:lang', function(){ if (!sec.hidden) setTimeout(render, 0); });
  document.getElementById('currencySwitchBtn')?.addEventListener('click', function(){ setTimeout(function(){ if (!sec.hidden) render(); }, 0); });
  setTab('recs');
})();
