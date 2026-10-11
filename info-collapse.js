/* info-collapse.js — kartice u #destInfoContent su zatvorene (naslov + ključna informacija) i otvaraju se na klik.
   Ne menja dest-info.js ni DOM strukturu kartica (tabovi, indeks tema i klima ih i dalje nalaze po .di-card / .di-card-ic):
   samo dodaje klasu, ARIA atribute i kratak pregled u zaglavlje; sakrivanje radi CSS (info-collapse.css). */
(function(){
  'use strict';
  var OPEN_ICONS = ['\uD83D\uDEC2', '\uD83C\uDFE8'];   // 🛂 viza i ulazak, 🏨 gde odseti — otvoreno unapred
  var NO_PREVIEW = ['\uD83D\uDCC5'];                   // 📅 klima po mesecima — nema smislenog jednog reda

  function clean(s){ return String(s || '').replace(/[\uFE0F\u200D]/g, '').trim(); }
  function txt(n){ return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; }

  function previewOf(card, ic){
    if (NO_PREVIEW.indexOf(ic) >= 0) return '';
    if (ic === '\uD83C\uDF24') return txt(card.querySelector('.di-temp'));          // 🌤 temperatura
    if (ic === '\uD83D\uDCB0') return txt(card.querySelector('.di-tier-mid .di-tier-price') || card.querySelector('.di-tier-price')); // 💰
    var v = card.querySelector('.di-row .di-val');
    if (v) return txt(v);
    return txt(card.querySelector('.di-ms-name'));
  }

  function setOpen(card, open){
    card.classList.toggle('di-open', open);
    var h = card.querySelector('.di-card-head');
    if (h) h.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function enhance(){
    var ct = document.getElementById('destInfoContent');
    if (!ct) return;
    var cards = ct.querySelectorAll('.di-card:not([data-cz])');
    for (var i = 0; i < cards.length; i++){
      var card = cards[i];
      card.setAttribute('data-cz', '1');
      var head = card.querySelector('.di-card-head');
      if (!head) continue;
      var icEl = card.querySelector('.di-card-ic');
      var ic = clean(icEl ? icEl.textContent : '');
      var pv = previewOf(card, ic);
      if (pv){
        if (pv.length > 60) pv = pv.slice(0, 58) + '\u2026';
        var s = document.createElement('span');
        s.className = 'di-card-pv';
        s.textContent = pv;
        head.appendChild(s);
      }
      var chev = document.createElement('span');
      chev.className = 'di-card-chev';
      chev.setAttribute('aria-hidden', 'true');
      chev.textContent = '\u203A';
      head.appendChild(chev);
      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');
      card.classList.add('di-collapsible');
      // otvoreno unapred: viza i smeštaj; sve iz "Ulazak, vožnja…" (korisnik je to sam tražio klikom)
      setOpen(card, OPEN_ICONS.indexOf(ic) >= 0 || !!card.closest('#diExtra'));
    }
  }

  function toggleFrom(head){
    var card = head.closest('.di-card');
    if (card && card.classList.contains('di-collapsible')) setOpen(card, !card.classList.contains('di-open'));
  }

  document.addEventListener('click', function(e){
    var head = e.target.closest && e.target.closest('#destInfoContent .di-card-head');
    if (head){
      if (e.target.closest('button, a, select, input')) return;   // dugmad unutar zaglavlja rade svoje
      toggleFrom(head);
      return;
    }
    // klik na temu iz "Dodatne informacije" (app-19): otvori karticu na koju je skrolovano
    if (e.target.closest && e.target.closest('.di-more-row')){
      setTimeout(function(){
        var card = document.querySelector('#destInfoContent .di-card.di-flash');
        if (card && card.classList.contains('di-collapsible') && !card.classList.contains('di-open')){
          setOpen(card, true);
          card.scrollIntoView({ block: 'center' });
        }
      }, 0);
    }
  });
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var head = e.target.closest && e.target.closest('#destInfoContent .di-card-head');
    if (head && e.target === head){ e.preventDefault(); toggleFrom(head); }
  });

  var t = 0;
  new MutationObserver(function(){
    clearTimeout(t);
    t = setTimeout(enhance, 30);
  }).observe(document.body, { childList: true, subtree: true });
  enhance();
})();
