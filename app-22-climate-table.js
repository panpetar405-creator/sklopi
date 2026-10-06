/* app-22-climate-table.js — ekran #12: "Klima po mesecima" kao pregledna lista (mesec, ikona, dnevna/noćna temperatura, kiša).
   Podaci se čitaju iz već nacrtanog grafikona u dest-info (title atributi po mesecu), pa ne menjamo dest-info.js
   ni worker. Grafikon ostaje dostupan preko prekidača "Grafikon". Tekući mesec je istaknut. */
(function(){
  'use strict';
  var ct = document.getElementById('destInfoContent');
  if (!ct) return;

  function tr(s){ try { return typeof tx === 'function' ? tx(s) : s; } catch(e){ return s; } }
  function esc(s){
    return typeof escapeHtml === 'function' ? escapeHtml(s) :
      String(s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
  }
  var RE = /^(.+?):\s*(-?\d+(?:\.\d+)?)\s*°\s*\/\s*(-?\d+(?:\.\d+)?)?\s*°?\s*(?:·\s*(\d+(?:\.\d+)?)\s*mm)?/;

  function parse(card){
    var cols = card.querySelectorAll('[title]'), out = [];
    for (var i = 0; i < cols.length; i++){
      var m = RE.exec(cols[i].getAttribute('title') || '');
      if (!m) return null;
      out.push({ m:m[1].trim(), hi:Number(m[2]), lo:m[3] === undefined ? null : Number(m[3]), rain:m[4] === undefined ? null : Number(m[4]) });
    }
    return out.length === 12 ? out : null;
  }
  function icon(r){
    if (r.rain !== null && r.rain >= 70) return '🌧️';
    if (r.hi >= 24) return '☀️';
    if (r.hi <= 8) return '❄️';
    return '🌤️';
  }

  function enhance(card){
    if (card.getAttribute('data-cm') === '1') return;
    var data = parse(card);
    if (!data) return;
    card.setAttribute('data-cm', '1');
    var hasLo = data.some(function(r){ return r.lo !== null; });
    var hasRain = data.some(function(r){ return r.rain !== null; });
    var now = new Date().getMonth();

    // grafikon: dva grid bloka + legenda → grupišemo klasom da ih prekidač sakrije
    var kids = Array.prototype.slice.call(card.children);
    kids.forEach(function(k){
      var st = k.getAttribute('style') || '';
      if (/grid-template-columns:\s*repeat\(12/.test(st) || (k.classList && k.classList.contains('di-tier-note'))) k.classList.add('di-cm-chart');
    });

    var wrap = document.createElement('div');
    wrap.className = 'di-cm';
    var rows = data.map(function(r, i){
      return '<li class="di-cm-row' + (i === now ? ' is-now' : '') + '">'
        + '<span class="di-cm-ic" aria-hidden="true">' + icon(r) + '</span>'
        + '<span class="di-cm-month">' + esc(r.m) + (i === now ? ' <em>' + esc(tr('sada')) + '</em>' : '') + '</span>'
        + '<span class="di-cm-hi">' + r.hi + '°</span>'
        + (hasLo ? '<span class="di-cm-lo">' + (r.lo !== null ? r.lo + '°' : '–') + '</span>' : '')
        + (hasRain ? '<span class="di-cm-rain">' + (r.rain !== null ? r.rain + ' mm' : '–') + '</span>' : '')
        + '</li>';
    }).join('');
    wrap.innerHTML = '<div class="di-cm-switch" role="group" aria-label="' + esc(tr('Prikaz klime')) + '">'
      + '<button type="button" class="is-on" data-v="list" aria-pressed="true">' + esc(tr('Lista')) + '</button>'
      + '<button type="button" data-v="chart" aria-pressed="false">' + esc(tr('Grafikon')) + '</button></div>'
      + '<div class="di-cm-head" aria-hidden="true"><span></span><span></span><span>' + esc(tr('Dan')) + '</span>'
      + (hasLo ? '<span>' + esc(tr('Noć')) + '</span>' : '') + (hasRain ? '<span>' + esc(tr('Kiša')) + '</span>' : '') + '</div>'
      + '<ul class="di-cm-list">' + rows + '</ul>';
    var head = card.querySelector('.di-card-head');
    card.insertBefore(wrap, head ? head.nextSibling : card.firstChild);
    card.classList.add('di-cm-list-on');

    wrap.querySelector('.di-cm-switch').addEventListener('click', function(e){
      var b = e.target.closest('button');
      if (!b) return;
      var list = b.dataset.v === 'list';
      Array.prototype.forEach.call(this.querySelectorAll('button'), function(x){
        var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      card.classList.toggle('di-cm-list-on', list);
    });
  }

  function scan(){
    var cards = ct.querySelectorAll('.di-card');
    for (var i = 0; i < cards.length; i++){
      var ic = cards[i].querySelector('.di-card-ic');
      if (ic && ic.textContent.indexOf('\uD83D\uDCC5') >= 0) enhance(cards[i]);   // 📅
    }
  }
  var busy = false;
  new MutationObserver(function(){
    if (busy) return;
    busy = true;
    Promise.resolve().then(function(){ busy = false; scan(); });
  }).observe(ct, { childList:true, subtree:true });
  scan();
})();
