/* app-23-reservation.js — ekran #15: "Rezervacija" (pregled stavki + ukupno + nastavak kod partnera).
   Zamenjuje izgled ekrana "Ukupna cena tvog puta" (#totalDetail). Stari .mt-card ostaje u DOM-u (skriven)
   jer ga i dalje puni app-07 — ovde se samo crta nova kartica iz istih podataka (computeCustomPackage).
   SKLOPI NE naplaćuje i ne prima uplate: "Nastavi" otkriva linkove ka partnerima (KAYAK, Booking.com, Viator),
   isti buildAffiliateLink/bookItem tok kao u builderu. Nema unosa kartice ni "potvrde rezervacije" na sajtu. */
(function(){
  'use strict';
  var box = document.getElementById('planBreakdown');
  var sec = document.getElementById('totalDetail');
  if (!box || !sec) return;
  var oldCard = sec.querySelector('.mt-card');
  var oldSave = document.getElementById('totalDetailMyTripBtn');
  var oldNote = sec.querySelector('.fd-note');
  var title = document.getElementById('totalDetailTitle');
  var sub = document.getElementById('totalDetailSub');

  function tr(s){ try { return typeof tx === 'function' ? tx(s) : s; } catch(e){ return s; } }
  function esc(s){
    return typeof escapeHtml === 'function' ? escapeHtml(s) :
      String(s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
  }
  function money(n){ return currentCurrency === 'RSD' ? fmtEUR(n) : Number(n).toLocaleString('de-DE') + ' \u20ac'; }

  /* ---------- DOM ---------- */
  if (oldCard) oldCard.hidden = true;
  if (oldSave) oldSave.hidden = true;
  if (oldNote) oldNote.hidden = true;
  var card = document.createElement('article');
  card.className = 'resv-card'; card.id = 'resvCard';
  var actions = document.createElement('div');
  actions.className = 'resv-actions';
  actions.innerHTML =
    '<button type="button" class="btn-primary resv-go" id="resvGo" aria-expanded="false" aria-controls="resvLinks">' +
      '<span data-resv="go">Nastavi kod partnera</span> <span aria-hidden="true">\u2192</span></button>' +
    '<div class="resv-links" id="resvLinks" hidden></div>' +
    '<button type="button" class="resv-save" id="resvSave">Sa\u010duvaj u Moj put</button>' +
    '<p class="resv-trust"><span aria-hidden="true">\ud83d\udd12</span> <span data-resv="trust"></span></p>';
  sec.insertBefore(card, oldCard ? oldCard.nextSibling : null);
  sec.insertBefore(actions, card.nextSibling);
  var go = actions.querySelector('#resvGo'), links = actions.querySelector('#resvLinks');

  /* ---------- podaci ---------- */
  function snapshot(){
    var ctx = builderCtx(), sel = builderState;
    var pkg = computeCustomPackage(sel, ctx);
    var p = window.SKLOPI_ACTIVE_PLAN || {};
    var rows = [];
    function add(kind, ic, name, detail, price, cta){ rows.push({kind:kind, ic:ic, name:name, detail:detail, price:price, cta:cta}); }
    var origin = ((document.getElementById('origin') || {}).value || '').split(',')[0].trim();
    if (sel.includeFlight){
      var to = cityLabel(p.flightArrival || ctx.dest);
      add('flight', '\u2708', tr('Avio karte'), (origin ? cityLabel(origin) + ' \u2192 ' : '') + to, pkg.flight.price, 'KAYAK');
    }
    if (sel.includeHotel){
      add('hotel', '\u25a3', tr('Sme\u0161taj'), (sel.hotelStars ? sel.hotelStars + '\u2605 \u2022 ' : '') + daysLabel(ctx.nights), pkg.hotel.price, 'Booking.com');
      if (sel.touristTax && pkg.touristTaxCost) add('tax', '\ud83c\udfdb\ufe0f', tr('Boravi\u0161na taksa'), tr('Plaća se na licu mesta ili u smeštaju'), pkg.touristTaxCost, '');
    }
    if (sel.activityCount > 0) add('activity', '\u25c7', tr('Aktivnosti'), sel.activityCount + ' \u2022 ' + tr('izleti i ture'), pkg.activity.price, 'Viator');
    if (sel.carPref !== 'none') add('car', '\u25b1', tr('Prevoz'), p.carS ? tr(p.carS) : tr('Auto'), pkg.car.price + pkg.carExtras.price, 'Booking.com');
    if (sel.esim) add('esim', '\ud83d\udcf6', 'eSIM', tr('Mobilni internet'), pkg.esimCost, '');
    return {ctx:ctx, sel:sel, pkg:pkg, plan:p, rows:rows};
  }
  function linkFor(kind, s){
    var c = Object.assign({}, s.ctx, {
      flightPref:s.sel.flightPref, hotelStars:s.sel.hotelStars,
      prioritizeRating:s.sel.prioritizeRating, prioritizeLocation:s.sel.prioritizeLocation, carPref:s.sel.carPref
    });
    return buildAffiliateLink(kind, c);
  }

  /* ---------- crtanje ---------- */
  var last = null;
  function render(){
    var s; try { s = snapshot(); } catch(e){ return; }
    last = s;
    var c = s.ctx, p = s.plan;
    if (title) title.textContent = tr('Rezervacija');
    var planName = p.title ? tr(p.title) + ' ' + tr('plan') : '';
    if (sub) sub.textContent = cityLabel(c.dest) + (planName ? ' \u2013 ' + planName : '') + ' \u2022 ' + daysLabel(c.days)
      + (c.from && c.to ? ' \u2022 ' + fmtDate(c.from) + ' \u2013 ' + fmtDate(c.to) : '');
    var persons = c.adults + ' ' + pluralWord('adult', c.adults);
    card.innerHTML =
      '<h3 class="resv-sub">' + esc(tr('Tvoj plan')) + '</h3>' +
      '<ul class="resv-rows">' + s.rows.map(function(r){
        return '<li class="resv-row resv-row--' + r.kind + '"><span class="resv-ic" aria-hidden="true">' + r.ic + '</span>' +
          '<div class="resv-what"><b>' + esc(r.name) + '</b><small>' + esc(r.detail) + '</small></div>' +
          '<em class="resv-price">' + esc(money(r.price)) + '</em></li>';
      }).join('') + '</ul>' +
      '<div class="resv-total"><span>' + esc(tr('Ukupno')) + '</span><b>' + esc(money(s.pkg.total)) + '</b></div>' +
      '<p class="resv-fine">' + esc(tr('Ilustrativna procena za ') + persons + ', ' + daysLabel(c.days) + '.') + '</p>';
    var goTxt = go.querySelector('[data-resv="go"]'); if (goTxt) goTxt.textContent = tr('Nastavi kod partnera');
    var trust = actions.querySelector('[data-resv="trust"]');
    if (trust) trust.textContent = tr('Plaćanje ide direktno kod partnera \u2022 SKLOPI ne naplaćuje');
    actions.querySelector('#resvSave').textContent = tr('Sačuvaj u Moj put');
    if (!links.hidden) renderLinks();
  }
  function renderLinks(){
    if (!last) return;
    var s = last, c = s.ctx, parts = [];
    s.rows.forEach(function(r){
      if (!r.cta) return;
      var url = linkFor(r.kind, s);
      parts.push('<span class="resv-link-item"><a class="resv-link" href="' + esc(url) + '" target="_blank" rel="noopener sponsored"' +
        ' data-kind="' + r.kind + '" data-price="' + Math.round(r.price) + '" data-url="' + esc(url) + '" data-dest="' + esc(c.dest || '') + '" data-tier="plan" onclick="bookItem(this)">' +
        '<span class="resv-link-ic" aria-hidden="true">' + r.ic + '</span><span class="resv-link-t"><b>' + esc(r.name) + '</b><small>' + esc(r.cta) + '</small></span>' +
        '<span aria-hidden="true">\u2197</span></a>' + (typeof affBadgeHtml === 'function' ? affBadgeHtml() : '') + '</span>');
    });
    links.innerHTML = '<p class="resv-links-label">' + esc(tr('Rezerviši svaku stavku direktno kod partnera:')) + '</p>' +
      parts.join('') + '<p class="resv-disc">' + esc(typeof affDisc === 'function' ? affDisc() : '') + '</p>';
  }

  go.addEventListener('click', function(){
    var open = links.hidden;
    if (open){ renderLinks(); links.hidden = false; }
    else links.hidden = true;
    go.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) requestAnimationFrame(function(){ links.scrollIntoView({behavior:'smooth', block:'nearest'}); });
  });
  actions.querySelector('#resvSave').addEventListener('click', function(){
    var t = document.getElementById('myTrip');
    if (t) t.scrollIntoView({behavior:'smooth', block:'start'});
  });

  function ifOpen(){ if (!box.hidden) render(); }
  document.addEventListener('sklopi:plan-breakdown', function(){
    links.hidden = true; go.setAttribute('aria-expanded', 'false');   // svaki ulazak na ekran počinje zatvoren
    render();
  });
  document.addEventListener('sklopi:plan-changed', ifOpen);
  document.addEventListener('sklopi:lang', ifOpen);
  var cur = document.getElementById('currencySwitchBtn');
  if (cur) cur.addEventListener('click', function(){ setTimeout(ifOpen, 0); });
})();
