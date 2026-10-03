/* SKLOPI UX v3 — dopune oko plana (redosled sekcija je u index.html, ovde se NE premešta ništa). */
(function(){
  'use strict';
  function byId(id){ return document.getElementById(id); }
  function T(k){ return (typeof t === 'function') ? t(k) : k; }

  // Price Alert pored ukupne cene, kad je razrada plana iscrtana. Originalno dugme i handler ostaju;
  // klon samo prosleđuje klik. Tekstovi idu kroz data-i18n pa prate promenu jezika.
  function addInlinePriceAlert(){
    const total = byId('totalDetail'), btn = byId('exAlertBtn');
    if(!total || !btn || total.querySelector('.ux-price-alert-inline')) return;
    const host = total.querySelector('.mt-card');
    if(!host) return;
    const card = document.createElement('div');
    card.className = 'ux-price-alert-inline';
    const p = document.createElement('p');
    const strong = document.createElement('strong');
    strong.setAttribute('data-i18n', 'ux_price_alert_title'); strong.textContent = T('ux_price_alert_title');
    const span = document.createElement('span');
    span.setAttribute('data-i18n', 'ux_price_alert_text'); span.textContent = T('ux_price_alert_text');
    p.appendChild(strong); p.appendChild(document.createElement('br')); p.appendChild(span);
    const clone = btn.cloneNode(true);
    clone.id = 'uxInlineAlertBtn';
    clone.addEventListener('click', function(){ btn.click(); });
    card.appendChild(p); card.appendChild(clone);
    host.appendChild(card);
  }
  document.addEventListener('sklopi:plan-breakdown', addInlinePriceAlert);

  // Napomena o proceni u detalju plana (jednom po otvaranju).
  function decoratePlanDetail(){
    const detail = byId('planDetail');
    if(!detail) return;
    const note = detail.querySelector('.plan-detail-note');
    if(note && !detail.querySelector('.ux-detail-trust')){
      const trust = document.createElement('p');
      trust.className = 'plan-detail-note ux-detail-trust';
      trust.setAttribute('data-i18n', 'ux_detail_trust');
      trust.textContent = T('ux_detail_trust');
      note.after(trust);
    }
  }
  document.addEventListener('sklopi:plan-changed', decoratePlanDetail);
  const detail = byId('planDetail');
  if(detail) new MutationObserver(function(){ if(!detail.hidden) decoratePlanDetail(); })
    .observe(detail, {attributes:true, attributeFilter:['hidden','class']});

  /* ===== Hero: jedno polje + podrazumevane vrednosti =====
     Hero pokazuje samo "Gde želiš da putuješ?" i dugme Kreni. Polazak, datumi, putnici i usluge ostaju u
     istoj formi (isti ID-jevi, ista logika) ali su sklopljeni; red "Polazak · datumi · putnici → Promeni"
     ih otvara. Isti red stoji i ispod 3 plana, da cena nikad ne izgleda tačnija nego što jeste. */
  const hero = byId('searchForm-wrap');
  const plansSec = byId('destinationPlans');
  const heroEdit = byId('tripDefaultsEdit');
  const plansEdit = byId('tripDefaultsPlansEdit');
  const ORIGIN_KEY = 'sklopi_last_origin';

  function setExpanded(on){
    if(!hero) return;
    hero.classList.toggle('ux-expanded', !!on);
    if(heroEdit){
      heroEdit.setAttribute('aria-expanded', on ? 'true' : 'false');
      heroEdit.textContent = T(on ? 'btn_done' : 'ux_defaults_change');
    }
  }
  function summaryText(){
    const parts = [];
    const o = ((byId('origin') || {}).value || '').trim();
    if(o) parts.push(T('ux_defaults_from') + ' ' + o);
    const db = byId('dateDisplayBtn'), pb = byId('paxDisplayBtn');
    if(db && !db.classList.contains('is-empty')){
      const d = ((byId('dateDisplayText') || {}).textContent || '').trim();
      const n = ((byId('dateNightsText') || {}).textContent || '').trim();
      if(d) parts.push(d + (n ? ' (' + n + ')' : ''));
    }
    if(pb && !pb.classList.contains('is-empty')){
      const p = ((byId('paxDisplayText') || {}).textContent || '').trim();
      if(p) parts.push(p);
    }
    return parts.join(' \u00B7 ');
  }
  function refreshSummary(){
    const txt = summaryText();
    ['tripDefaultsText', 'tripDefaultsPlansText'].forEach(id => { const el = byId(id); if(el) el.textContent = txt; });
    ['tripDefaults', 'tripDefaultsPlans'].forEach(id => { const el = byId(id); if(el) el.hidden = !txt; });
  }
  function initDefaults(){
    const origin = byId('origin'), pax = byId('adults');
    // polazak: poslednji korišćen, inače Beograd (korisnik ga menja jednim tapom na "Promeni")
    if(origin && !origin.value.trim()){
      let saved = '';
      try { saved = localStorage.getItem(ORIGIN_KEY) || ''; } catch(e){}
      origin.value = saved || 'Beograd';
      try { _locDropdownState.originSuggestions.suppressNextFetch = true; } catch(e){}   // bez otvaranja liste predloga
      origin.dispatchEvent(new Event('input', {bubbles:true}));
      origin.dispatchEvent(new Event('change', {bubbles:true}));
    }
    if(pax && !pax.value){
      pax.value = '2';
      if(typeof window.syncPaxDisplay === 'function') window.syncPaxDisplay();
      pax.dispatchEvent(new Event('input', {bubbles:true}));
      pax.dispatchEvent(new Event('change', {bubbles:true}));
    }
    const db = byId('dateDisplayBtn');
    if(db && db.classList.contains('is-empty') && typeof window.syncDateDisplay === 'function') window.syncDateDisplay();
    refreshSummary();
  }
  const originEl = byId('origin');
  if(originEl){
    originEl.addEventListener('input', refreshSummary);
    originEl.addEventListener('change', function(){
      refreshSummary();
      const v = originEl.value.trim();
      if(v){ try { localStorage.setItem(ORIGIN_KEY, v); } catch(e){} }
    });
  }
  ['dateDisplayText', 'dateNightsText', 'paxDisplayText'].forEach(id => {
    const el = byId(id);
    if(el) new MutationObserver(refreshSummary).observe(el, {childList:true, characterData:true, subtree:true});
  });
  document.addEventListener('sklopi:lang', function(){ setExpanded(hero && hero.classList.contains('ux-expanded')); refreshSummary(); });

  if(heroEdit){
    heroEdit.removeAttribute('data-i18n');     // naslov dugmeta menja JS (Promeni / Gotovo)
    heroEdit.addEventListener('click', function(){
      const on = !(hero && hero.classList.contains('ux-expanded'));
      setExpanded(on);
      if(!on && plansSec && !plansSec.hidden) plansSec.scrollIntoView({behavior:'smooth', block:'start'});
    });
  }
  if(plansEdit){
    plansEdit.addEventListener('click', function(){
      setExpanded(true);
      const f = byId('searchForm');
      if(f) f.scrollIntoView({behavior:'smooth', block:'center'});
    });
  }

  // Greška u skrivenom polju (npr. nedostaje polazak): prvo otvori detalje, pa tek onda fokus.
  if(typeof window.focusSearchField === 'function'){
    const origFocus = window.focusSearchField;
    window.focusSearchField = function(which){
      if(which === 'origin' || which === 'form') setExpanded(true);
      return origFocus.apply(this, arguments);
    };
  }
  // Izbor predloga u polju Destinacija = odmah 3 plana (isto kao dugme Kreni).
  if(typeof window.selectLocSuggestion === 'function'){
    const origSelect = window.selectLocSuggestion;
    window.selectLocSuggestion = function(id, value){
      origSelect.apply(this, arguments);
      if(id === 'destSuggestions'){
        const f = byId('searchForm');
        setTimeout(function(){ if(f) (f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', {cancelable:true}))); }, 80);
      }
    };
  }
  // Kad su planovi otvoreni, dugme "3 plana za ..." u spotlight kartici je suvišno.
  function syncPlansOpen(){ document.body.classList.toggle('ux-plans-open', !!plansSec && !plansSec.hidden); }
  if(plansSec) new MutationObserver(syncPlansOpen).observe(plansSec, {attributes:true, attributeFilter:['hidden']});
  syncPlansOpen();

  initDefaults();
  window.addEventListener('load', initDefaults);   // ponovo posle ostalih inicijalizacija (popunjava samo prazno)
})();
