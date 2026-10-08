/* SKLOPI — jedan tok: početna samo traži destinaciju, sve ostalo je na stranici destinacije (destinacija.html).
   Ovaj fajl se učitava POSLE svih ostalih i preusmerava stare ulaze (popularne destinacije, nedavne pretrage,
   unos u polje Destinacija) koji su ranije otvarali spotlight / 3 plana na početnoj. Stari blokovi su u
   #legacyPlanner (skriveno) i mogu se obrisati kad se očisti i stari JS. */
(function(){
  'use strict';
  // Rezultati upitnika "Nemaš ideju kuda" (#results + #resultsBackdrop) su u HTML-u unutar skrivenog
  // #legacyPlanner, pa se nikad nisu videli. Izvlačimo ih na kraj <body> (fixed sheet, ne zavisi od roditelja).
  ['resultsBackdrop', 'results'].forEach(function(id){
    var el = document.getElementById(id);
    if (el && el.closest('#legacyPlanner')) document.body.appendChild(el);
  });

  function val(id){ var el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }

  function goToDestination(){
    var dest = val('dest');
    if (!dest) return;
    var q = new URLSearchParams({ od: val('origin') || 'Beograd', 'do': dest });
    var from = val('dateFrom'), to = val('dateTo'), adults = val('adults');
    if (from) q.set('polazak', from);
    if (to) q.set('povratak', to);
    q.set('putnika', adults || '2');
    window.location.href = 'destinacija.html?' + q.toString();
  }

  // Kartice popularnih destinacija i nedavne pretrage zovu ove dve funkcije preko window — preusmeravamo.
  window.SKLOPI_showDestPlans = goToDestination;
  window.SKLOPI_revealSpotlight = goToDestination;
  // Spotlight kartica (3 plana ispod pretrage) više ne postoji: kucanje u polje ne treba ništa da otvara.
  window.SKLOPI_setSpotlight = function(){};
})();
