/* app-26-plan-customize.js — popravka dugmeta "Prilagodi ovaj plan" (ekran #5 → #6).
   Problem: app-07 samo otkrije #customPlanner i skroluje do njega, ali je ta sekcija deo stranice IZA prozora plana
   (#planDetail je na telefonu fiksni sloj preko stranice), pa klik izgleda kao da ne radi.
   Ovde se klik hvata pre app-07 handlera: na telefonu se prvo zatvori prozor plana (isti tok kao dugme "← Planovi"),
   zatim se otkrije i prikaže "Sastavi svoj paket" sa već izabranim stilom (Budžet/Balans/Komfor) tog plana. */
(function(){
  'use strict';
  function reveal(tier){
    var cp = document.getElementById('customPlanner');
    if (!cp) return;
    cp.hidden = false;
    if (tier){
      var chip = cp.querySelector('.cp-group[data-group="tier"] .cp-chip[data-value="' + tier + '"]');
      if (chip && !chip.classList.contains('is-on')) chip.click();      // isto kao ručni klik: sinhronizuje i hero izbor
    }
    cp.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var h = cp.querySelector('h2'); if (h){ h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  document.addEventListener('click', function(e){
    var b = e.target && e.target.closest && e.target.closest('#planDetailCustomize');
    if (!b) return;
    e.stopImmediatePropagation(); e.preventDefault();
    var p = window.SKLOPI_ACTIVE_PLAN || {};
    var tier = p.key || p.tier || '';
    var det = document.getElementById('planDetail');
    var overlay = det && !det.hidden && det.classList.contains('open');
    if (overlay){
      var back = document.getElementById('planDetailBack');
      if (back) back.click();
      setTimeout(function(){ reveal(tier); }, 380);                      // sačekaj da se sloj zatvori i stranica otključa
    } else {
      reveal(tier);
    }
  }, true);
})();
