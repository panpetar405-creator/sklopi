/* app-15-plan-select.js — ekran #3: izbor jednog od 3 plana pa "Nastavi".
   Klik na karticu sada samo BIRA plan (podrazumevano: onaj sa značkom "Popularno");
   "Nastavi" otvara izabrani plan istim tokom kao ranije (app-07 openPlan).
   Ne menja app-07: hvata klik u capture fazi, a "Nastavi" ga propušta kroz flag. */
(function(){
  'use strict';
  var list = document.getElementById('destPlansList');
  var cta = document.getElementById('destPlansContinue');
  if (!list) return;
  var sel = null, lastDest = '';

  function cards(){ return Array.prototype.slice.call(list.querySelectorAll('.dest-plan-card')); }
  function destName(){
    var h = document.getElementById('destinationSpotlightTitle');
    return h ? h.textContent.trim() : '';
  }
  function paint(){
    var cs = cards();
    if (!cs.length){ if (cta) cta.hidden = true; return; }
    var d = destName();
    if (d !== lastDest){ lastDest = d; sel = null; }
    if (sel === null || sel >= cs.length){
      var pop = cs.findIndex(function(c){ return c.querySelector('.dest-plan-badge--popular'); });
      sel = pop >= 0 ? pop : 0;
    }
    list.setAttribute('role', 'radiogroup');
    cs.forEach(function(c, i){
      var on = i === sel;
      c.classList.toggle('is-selected', on);
      c.setAttribute('role', 'radio');
      c.setAttribute('aria-checked', on ? 'true' : 'false');
      c.setAttribute('tabindex', on ? '0' : '-1');
    });
    if (cta) cta.hidden = false;
  }
  function choose(i, focus){
    var cs = cards();
    if (i < 0 || i >= cs.length) return;
    sel = i; paint();
    if (focus) cs[i].focus();
  }

  list.addEventListener('click', function(e){
    var c = e.target.closest('.dest-plan-card');
    if (!c) return;
    if (c.dataset.go === '1'){ delete c.dataset.go; return; }   // prolaz od "Nastavi"
    e.stopPropagation();
    choose(cards().indexOf(c), false);
  }, true);

  list.addEventListener('keydown', function(e){
    var c = e.target.closest('.dest-plan-card');
    if (!c) return;
    var i = cards().indexOf(c);
    if (e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); choose(i, false); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight'){ e.preventDefault(); choose(Math.min(i + 1, cards().length - 1), true); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft'){ e.preventDefault(); choose(Math.max(i - 1, 0), true); }
  });

  if (cta) cta.addEventListener('click', function(){
    var c = cards()[sel];
    if (!c) return;
    c.dataset.go = '1';
    c.click();
    delete c.dataset.go;
  });

  /* app-07 ponovo crta kartice (promena grada, datuma, jezika) → vrati izbor */
  new MutationObserver(paint).observe(list, { childList: true });

  /* Putni podaci ispod naslova destinacije (isti tekst kao traka "Promeni" ispod planova) */
  var meta = document.getElementById('destRefMeta');
  var src = document.getElementById('tripDefaultsPlansText');
  function syncMeta(){
    if (!meta || !src) return;
    var t = src.textContent.trim();
    meta.textContent = t; meta.hidden = !t;
  }
  if (src) new MutationObserver(syncMeta).observe(src, { childList: true, characterData: true, subtree: true });
  syncMeta();
  paint();
})();
