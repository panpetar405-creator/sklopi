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
})();
