/* app-24-notifications.js — ekran #18: "Obaveštenja" (iz menija profila).
   VAŽNO: ovo NIJE push. Pravi push bi tražio service worker + server koji šalje poruke; ovde ih nema, pa se ne prikazuju
   izmišljene poruke. Browser takođe NEMA pravo čitanja tabele price_alerts (RLS je insert-only, namerno), pa sajt ne
   može da zna da li je alert potvrđen ni da li je cena pala — to stiže mejlom.
   Ekran prikazuje samo ono što sajt stvarno zna u ovom pregledaču:
   1) alerte koje je korisnik ovde postavio (dogadjaj 'sklopi:alert-created' iz app-09; bez mejla, samo odredište i prag),
   2) izabrani plan iz "Moj put" (koliko dana do polaska, koliko stavki još nije štikliranih kao rezervisano — app-23). */
(function(){
  'use strict';
  var LOG_KEY = 'sklopi_alert_log_v1', TRIP_KEY = 'sklopi_my_trip_v1', DONE_KEY = 'sklopi_resv_done_v1', MAX_LOG = 20;
  var dlg = null, lastFocus = null;

  function tr(s){ try { return typeof tx === 'function' ? tx(s) : s; } catch(e){ return s; } }
  function esc(s){
    return typeof escapeHtml === 'function' ? escapeHtml(s) :
      String(s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
  }
  function money(n){ return typeof fmtEUR === 'function' && window.currentCurrency === 'RSD' ? fmtEUR(n) : Number(n).toLocaleString('de-DE') + ' \u20ac'; }
  function read(key, fb){ try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? fb : v; } catch(e){ return fb; } }
  function write(key, v){ try { localStorage.setItem(key, JSON.stringify(v)); } catch(e){} }

  /* ---------- 1) log alerta postavljenih u ovom pregledaču ---------- */
  document.addEventListener('sklopi:alert-created', function(e){
    var d = (e && e.detail) || {};
    if (!d.dest) return;
    var log = read(LOG_KEY, []);
    if (!Array.isArray(log)) log = [];
    log.unshift({ id: Date.now(), dest: String(d.dest), threshold: Number(d.threshold) || 0, from: d.dateFrom || '', to: d.dateTo || '' });
    write(LOG_KEY, log.slice(0, MAX_LOG));
  });

  /* ---------- 2) stavke ---------- */
  function ago(ts){
    var days = Math.floor((Date.now() - ts) / 86400000);
    if (days <= 0) return tr('Danas');
    if (days === 1) return tr('Juče');
    return daysLabel(days);
  }
  function dayDiff(iso){
    var a = new Date(iso + 'T00:00:00'), b = new Date(); b.setHours(0,0,0,0);
    return Math.round((a - b) / 86400000);
  }
  function build(){
    var items = [];
    var trip = read(TRIP_KEY, null);
    if (trip && trip.dest && trip.ctx && /^\d{4}-\d{2}-\d{2}$/.test(trip.ctx.from) && /^\d{4}-\d{2}-\d{2}$/.test(trip.ctx.to)){
      var untilStart = dayDiff(trip.ctx.from), untilEnd = dayDiff(trip.ctx.to);
      if (untilEnd >= 0){
        var sel = trip.sel || {}, kinds = [];
        if (sel.includeFlight) kinds.push('flight');
        if (sel.includeHotel) kinds.push('hotel');
        if (sel.carPref && sel.carPref !== 'none') kinds.push('car');
        if (sel.activityCount > 0) kinds.push('activity');
        var done = read(DONE_KEY, {}) || {};
        var left = kinds.filter(function(k){ return !done[[trip.dest, trip.ctx.from, trip.ctx.to, k].join('|')]; }).length;
        var when = untilStart > 0 ? tr('Polazak za ') + daysLabel(untilStart) + '.'
                 : untilStart === 0 ? tr('Polazak je danas.') : tr('Putovanje je u toku.');
        var rest = left > 0 ? ' ' + tr('Još nije označeno kao rezervisano: ') + left + '.' : (kinds.length ? ' ' + tr('Sve stavke su označene kao rezervisane.') : '');
        items.push({ ic:'\u2708', t: tr('Tvoj plan za ') + cityLabel(trip.dest), p: when + rest, meta: tr('Moj put'), go:'#myTrip' });
      }
    }
    var log = read(LOG_KEY, []);
    (Array.isArray(log) ? log : []).forEach(function(a){
      items.push({
        ic:'\ud83d\udd14', t: tr('Alert za cenu \u2014 ') + cityLabel(a.dest),
        p: tr('Javljamo ti kad cena padne ispod ') + money(a.threshold) + '. ' + tr('Alert postaje aktivan tek kad potvrdiš mejl koji smo ti poslali.'),
        meta: ago(a.id), alertId: a.id
      });
    });
    return items;
  }
  window.SKLOPI_notifCount = function(){ try { return build().length; } catch(e){ return 0; } };

  /* ---------- prikaz ---------- */
  function ensure(){
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.className = 'notif-sheet'; dlg.id = 'notifSheet';
    dlg.setAttribute('aria-labelledby', 'notifTitle');
    document.body.appendChild(dlg);
    dlg.addEventListener('cancel', function(e){ e.preventDefault(); requestClose(); });        // Escape
    dlg.addEventListener('click', function(e){ if (e.target === dlg) requestClose(); });        // klik na pozadinu
    document.addEventListener('sklopi:lang', function(){ if (dlg.open) paint(); });
    return dlg;
  }
  function paint(){
    var items = build();
    dlg.innerHTML =
      '<div class="notif-head"><h2 id="notifTitle" tabindex="-1">' + esc(tr('Obaveštenja')) + '</h2>' +
      '<button type="button" class="notif-x" id="notifClose" aria-label="' + esc(tr('Zatvori')) + '">\u00d7</button></div>' +
      '<ul class="notif-list">' + (items.length ? items.map(function(it, i){
        return '<li class="notif-item"><span class="notif-ic" aria-hidden="true">' + it.ic + '</span>' +
          '<div class="notif-body"><b>' + esc(it.t) + '</b><p>' + esc(it.p) + '</p>' +
          '<div class="notif-foot"><span>' + esc(it.meta) + '</span>' +
          (it.go ? '<button type="button" class="notif-link" data-go="' + esc(it.go) + '">' + esc(tr('Otvori')) + '</button>' : '') +
          (it.alertId ? '<button type="button" class="notif-link" data-rm="' + it.alertId + '">' + esc(tr('Ukloni')) + '</button>' : '') +
          '</div></div></li>';
      }).join('') : '<li class="notif-empty"><span aria-hidden="true">\ud83d\udd14</span><p>' + esc(tr('Još nema obaveštenja.')) + '</p>' +
        '<small>' + esc(tr('Postavi Price Alert na planu ili izaberi plan, pa će se pojaviti ovde.')) + '</small></li>') + '</ul>' +
      '<p class="notif-note">' + esc(tr('Pad cene ti stiže na mejl, ne kao push poruka na telefon. Ova lista se pamti samo u ovom pregledaču.')) + '</p>';
    dlg.querySelector('#notifClose').addEventListener('click', requestClose);
    dlg.querySelectorAll('[data-go]').forEach(function(b){
      b.addEventListener('click', function(){
        var sel = b.getAttribute('data-go');
        requestClose();
        setTimeout(function(){ var t = document.querySelector(sel); if (t) t.scrollIntoView({behavior:'smooth', block:'start'}); }, 60);
      });
    });
    dlg.querySelectorAll('[data-rm]').forEach(function(b){
      b.addEventListener('click', function(){
        var id = Number(b.getAttribute('data-rm'));
        write(LOG_KEY, (read(LOG_KEY, []) || []).filter(function(a){ return a.id !== id; }));
        paint();
        var nb = document.getElementById('dropdownNotifBadge');
        if (nb){ var n = window.SKLOPI_notifCount(); nb.textContent = n; nb.hidden = !n; }
      });
    });
  }
  function closeRaw(){
    if (dlg && dlg.open) dlg.close();
    if (typeof guardOverlayDrop === 'function') guardOverlayDrop('notif');
    if (lastFocus && lastFocus.focus){ try { lastFocus.focus(); } catch(e){} }
  }
  function requestClose(){
    if (typeof guardOverlayRequestClose === 'function' && guardOverlayRequestClose('notif')) return;
    closeRaw();
  }
  window.SKLOPI_openNotifications = function(){
    ensure(); lastFocus = document.activeElement;
    paint();
    if (!dlg.open) dlg.showModal();
    if (typeof guardOverlayOpen === 'function') guardOverlayOpen('notif', closeRaw);
    var h = dlg.querySelector('#notifTitle'); if (h) h.focus({preventScroll:true});
  };
})();
