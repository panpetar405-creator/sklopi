/* app-23-reservation.js — ekran #15 + #16 ("Plaćanje kod partnera") + #17 ("Sačuvano u Moj put"): "Rezervacija" (pregled stavki + ukupno + nastavak kod partnera).
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
    '<button type="button" class="btn-primary resv-go" id="resvGo">' +
      '<span data-resv="go">Nastavi kod partnera</span> <span aria-hidden="true">\u2192</span></button>' +
    '<button type="button" class="resv-save" id="resvSave">Sa\u010duvaj u Moj put</button>' +
    '<p class="resv-trust"><span aria-hidden="true">\ud83d\udd12</span> <span data-resv="trust"></span></p>';
  /* korak 2 (#16): "Plaćanje" — SKLOPI ne prima uplate, pa su ovo partneri kod kojih se plaća */
  var pay = document.createElement('div');
  pay.className = 'resv-pay'; pay.id = 'resvPay'; pay.hidden = true;
  sec.insertBefore(card, oldCard ? oldCard.nextSibling : null);
  sec.insertBefore(actions, card.nextSibling);
  sec.insertBefore(pay, actions.nextSibling);
  /* korak 3 (#17): potvrda da je plan sačuvan + podsetnik šta još treba rezervisati kod partnera */
  var done = document.createElement('div');
  done.className = 'resv-done'; done.id = 'resvDone'; done.hidden = true;
  sec.insertBefore(done, pay.nextSibling);
  var go = actions.querySelector('#resvGo');
  var headBox = sec.querySelector('.ad-head');
  var step = 1;

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
  var last = null, metaText = '';
  function setHead(){
    if (title) title.textContent = tr(step === 2 ? 'Plaćanje' : 'Rezervacija');
    if (step === 3 && title) title.textContent = tr('Sačuvano');
    if (sub) sub.textContent = step === 3 ? tr('Rezervacija se završava kod partnera.') : step === 2 ? tr('Plaćanje se obavlja na sajtu partnera.') : metaText;
  }
  function render(){
    var s; try { s = snapshot(); } catch(e){ return; }
    last = s;
    var c = s.ctx, p = s.plan;
    var planName = p.title ? tr(p.title) + ' ' + tr('plan') : '';
    metaText = cityLabel(c.dest) + (planName ? ' \u2013 ' + planName : '') + ' \u2022 ' + daysLabel(c.days)
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
    if (step === 2) renderPay(); else if (step === 3) renderDone(); else setHead();
  }
  function renderPay(){
    if (!last) return;
    var s = last, c = s.ctx, n = 0, items = [];
    s.rows.forEach(function(r){
      if (!r.cta) return;
      n++;
      var url = linkFor(r.kind, s);
      items.push('<span class="resv-link-item"><a class="resv-link" href="' + esc(url) + '" target="_blank" rel="noopener sponsored"' +
        ' data-kind="' + r.kind + '" data-price="' + Math.round(r.price) + '" data-url="' + esc(url) + '" data-dest="' + esc(c.dest || '') + '" data-tier="plan" onclick="bookItem(this)">' +
        '<span class="resv-link-ic" aria-hidden="true">' + r.ic + '</span>' +
        '<span class="resv-link-t"><b>' + esc(r.name) + ' \u2022 ' + esc(money(r.price)) + '</b><small>' + esc(tr('Plati kod: ')) + esc(r.cta) + '</small></span>' +
        '<span aria-hidden="true">\u2197</span></a>' + (typeof affBadgeHtml === 'function' ? affBadgeHtml() : '') + '</span>');
    });
    pay.innerHTML =
      '<button type="button" class="resv-back" id="resvBack"><span aria-hidden="true">\u2190</span> ' + esc(tr('Rezervacija')) + '</button>' +
      '<div class="resv-card">' +
        '<h3 class="resv-sub">' + esc(tr('Plati svaku stavku kod partnera')) + '</h3>' +
        '<p class="resv-pay-info">' + esc(tr('Kartica, Apple Pay ili PayPal \u2014 načini plaćanja zavise od partnera. SKLOPI ne vidi niti čuva podatke o tvojoj kartici.')) + '</p>' +
        (items.length ? items.join('') : '<p class="resv-pay-info">' + esc(tr('Nijedna stavka plana se ne rezerviše preko partnera.')) + '</p>') +
        '<div class="resv-total"><span>' + esc(tr('Ukupno')) + '</span><b>' + esc(money(s.pkg.total)) + '</b></div>' +
        '<p class="resv-fine">' + esc(tr('Ilustrativna procena \u2014 konačnu cenu i dostupnost potvrđuješ kod partnera.')) + '</p>' +
      '</div>' +
      '<p class="resv-disc">' + esc(typeof affDisc === 'function' ? affDisc() : '') + '</p>';
    pay.querySelector('#resvBack').addEventListener('click', function(){ show(1); });
  }
  /* podsetnik: štikliranje ide u localStorage (samo u ovom pregledaču), ključ = odredište + datumi + stavka */
  var DONE_KEY = 'sklopi_resv_done_v1';
  function doneMap(){ try { return JSON.parse(localStorage.getItem(DONE_KEY) || '{}') || {}; } catch(e){ return {}; } }
  function doneKey(kind){ var c = last.ctx; return [c.dest, c.from, c.to, kind].join('|'); }
  function renderDone(){
    if (!last) return;
    var s = last, m = doneMap();
    var list = s.rows.filter(function(r){ return r.cta; });
    done.innerHTML =
      '<div class="resv-ok" aria-hidden="true"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
      '<h3 class="resv-done-h" tabindex="-1">' + esc(tr('Plan je sačuvan u Moj put')) + '</h3>' +
      '<p class="resv-done-p">' + esc(tr('Sačuvan je u ovom pregledaču, pa možeš da mu se vratiš kasnije. Za čuvanje preko naloga prijavi se.')) + '</p>' +
      '<div class="resv-card">' +
        '<h3 class="resv-sub">' + esc(tr('Još treba da rezervišeš')) + '</h3>' +
        '<p class="resv-pay-info">' + esc(tr('Rezervacija nije izvršena dok je ne završiš na sajtu partnera. Štikliraj stavke kad ih rezervišeš.')) + '</p>' +
        '<ul class="resv-check">' + (list.length ? list.map(function(r){
          var id = 'resvChk_' + r.kind, on = !!m[doneKey(r.kind)];
          return '<li><input type="checkbox" id="' + id + '" data-kind="' + r.kind + '"' + (on ? ' checked' : '') + '>' +
            '<label for="' + id + '"><b>' + esc(r.name) + '</b><small>' + esc(r.cta) + ' \u2022 ' + esc(money(r.price)) + '</small></label></li>';
        }).join('') : '<li class="resv-pay-info">' + esc(tr('Nijedna stavka plana se ne rezerviše preko partnera.')) + '</li>') + '</ul>' +
      '</div>' +
      '<div class="resv-done-actions">' +
        '<button type="button" class="btn-primary resv-go" id="resvHome">' + esc(tr('Nazad na početak')) + '</button>' +
        '<button type="button" class="resv-save" id="resvMyTrip">' + esc(tr('Pogledaj Moj put')) + '</button>' +
        '<button type="button" class="resv-save" id="resvAcct">' + esc(tr('Sačuvaj i u nalog')) + '</button>' +
        '<button type="button" class="resv-save" id="resvBack3">' + esc(tr('Nazad na rezervaciju')) + '</button>' +
      '</div>';
    done.querySelectorAll('.resv-check input').forEach(function(i){
      i.addEventListener('change', function(){
        var mm = doneMap(), k = doneKey(i.dataset.kind);
        if (i.checked) mm[k] = 1; else delete mm[k];
        try { localStorage.setItem(DONE_KEY, JSON.stringify(mm)); } catch(e){}
      });
    });
    done.querySelector('#resvHome').addEventListener('click', function(){ window.scrollTo({top:0, behavior:'smooth'}); });
    done.querySelector('#resvMyTrip').addEventListener('click', function(){
      var t = document.getElementById('myTrip'); if (t) t.scrollIntoView({behavior:'smooth', block:'start'});
    });
    done.querySelector('#resvAcct').addEventListener('click', function(){
      var b = document.getElementById('mtSave');          // isti tok kao u "Moj put" (traži prijavu ako je nema)
      if (b && !b.disabled) b.click();
      else if (b && b.disabled) { try { showToast(tr('Već je sačuvano u nalogu.')); } catch(e){} }
    });
    done.querySelector('#resvBack3').addEventListener('click', function(){ show(1); });
  }
  function show(n){
    step = n;
    var two = n === 2;
    card.hidden = n !== 1; actions.hidden = n !== 1; pay.hidden = n !== 2; done.hidden = n !== 3;
    if (two) renderPay(); else if (n === 3) renderDone();
    setHead();
    if (headBox) headBox.scrollIntoView({behavior:'smooth', block:'start'});
    if (n === 3){ var h = done.querySelector('.resv-done-h'); if (h) h.focus({preventScroll:true}); }
  }

  go.addEventListener('click', function(){ show(2); });
  actions.querySelector('#resvSave').addEventListener('click', function(){ show(3); });

  function ifOpen(){ if (!box.hidden) render(); }
  document.addEventListener('sklopi:plan-breakdown', function(){
    step = 1; card.hidden = false; actions.hidden = false; pay.hidden = true; done.hidden = true;   // svaki ulazak počinje od koraka 1
    render();
  });
  document.addEventListener('sklopi:plan-changed', ifOpen);
  document.addEventListener('sklopi:lang', ifOpen);
  var cur = document.getElementById('currencySwitchBtn');
  if (cur) cur.addEventListener('click', function(){ setTimeout(ifOpen, 0); });
})();
