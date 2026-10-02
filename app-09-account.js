/* app-09-account.js — deo nekadašnjeg app.js (deo 9/11): Supabase: sačuvani izleti, nalog, deljenje, alert za cenu.
   Klasična skripta: deli globalni opseg sa ostalim app-*.js fajlovima; redosled učitavanja u index.html je bitan. */
/* ==========================================================
   MOJA PUTOVANJA — Supabase (auth.users + trips tabela).
   Prijava je email magic-link (OTP), ne treba Google/OAuth podesavanje.
   Ako Supabase iz nekog razloga ne odgovori (mreza, pogresan kljuc),
   sekcija samo ostaje prazna — ne obara ostatak sajta.

   NAPOMENA O DOPUNI: ovaj fajl je stigao na doradu isečen tačno OVDE
   ("sb = window.su..."), pa je sve od ove tačke pa do kraja fajla
   dopisano da bi sajt uopšte proradio. Šema tabele "trips" (user_id,
   dest, date_from, date_to, adults, selection, total) je preuzeta iz
   poziva koji već postoje gore u fajlu (saveMatchPackage) — to je
   sigurno tačno. Ime tabele "price_alerts" i imena globalnih promenljivih
   iz config.js (window.SUPABASE_URL / window.SUPABASE_ANON_KEY) NISU
   potvrđena — ako se config.js zove drugačije, ispravi te dve linije
   odmah ispod.
========================================================== */
/* ---- Supabase biblioteka se učitava TEK KAD ZATREBA (lazy). ----
   Ranije je supabase-js stajao kao <script defer> u index.html pa se
   skidao i izvršavao za svakog posetioca, iako ga koristi samo prijava,
   sačuvani izleti, alerti i deljeni brojač. Sada:
   - sb je null dok se biblioteka ne učita; ensureSb() je učitava (jednom) i vraća klijent;
   - _SB_CONFIGURED kaže da li je Supabase uopšte podešen (config.js) — to se
     koristi za UI ("Prijava nije dostupna"), a ne sb;
   - ako već postoji sačuvana sesija ili je ovo povratak sa magic-linka,
     biblioteka se učitava odmah da se prijava prepozna. */
let sb = null;
const _SB_CONFIGURED = !!(window.SKLOPI_SUPABASE_URL && window.SKLOPI_SUPABASE_KEY);
const _SB_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
let _sbPromise = null;
if (!_SB_CONFIGURED) {
  console.warn('[sklopi] Supabase konfiguracija (config.js) nije pronađena — nalozi i sačuvani izleti su isključeni, ostatak sajta radi normalno.');
}
function _sbShouldLoadEarly(){
  try {
    const loc = String(window.location.hash || '') + '&' + String(window.location.search || '');
    if (/[#&?](access_token|refresh_token|error_description)=/.test(loc) || /[?&]code=/.test(loc)) return true;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /^sb-.+-auth-token$/.test(k)) return true;
    }
  } catch (_) { /* localStorage može biti blokiran */ }
  return false;
}
function ensureSb(){
  if (sb) return Promise.resolve(sb);
  if (!_SB_CONFIGURED) return Promise.resolve(null);
  if (_sbPromise) return _sbPromise;
  _sbPromise = new Promise((resolve) => {
    const init = () => {
      try {
        sb = window.supabase.createClient(window.SKLOPI_SUPABASE_URL, window.SKLOPI_SUPABASE_KEY);
        sb.auth.onAuthStateChange((_event, session) => {
          _cachedUser = session ? session.user : null;
          renderSavedTrips();
          renderAccountMenu();
        });
        resolve(sb);
      } catch (err) {
        console.warn('[sklopi] Supabase inicijalizacija nije uspela:', err.message);
        sb = null; _sbPromise = null;
        resolve(null);
      }
    };
    if (window.supabase) { init(); return; }
    const s = document.createElement('script');
    s.src = _SB_CDN;
    s.async = true;
    s.onload = init;
    s.onerror = () => {
      console.warn('[sklopi] Supabase biblioteka nije učitana (mreža/CDN) — nalozi i alerti trenutno nisu dostupni.');
      _sbPromise = null;
      resolve(null);
    };
    document.head.appendChild(s);
  });
  return _sbPromise;
}

/* ---- Deljeni (globalni) brojači — tabela "site_stats", jedan red (id=1).
   Ako Supabase nije dostupan ili tabela/funkcije ne postoje, ostajemo na
   lokalnom (localStorage) brojaču koji je već učitan preko loadStats(). ---- */
async function loadStatsFromSupabase(){
  if (!(await ensureSb())) return;
  try{
    const { data, error } = await sb.from('site_stats').select('searches,clicks,last_dest').eq('id', 1).single();
    if (error) throw error;
    if (data){
      state.searches = data.searches || 0;
      state.clicks = data.clicks || 0;
      state.lastDest = data.last_dest || state.lastDest;
      updateStats();
    }
  }catch(err){
    console.warn('[sklopi] Deljena statistika nije dostupna (tabela site_stats?), ostajem na lokalnoj:', err.message);
  }
}
/* Brojači (#statSearches...) učitavamo tek kad su na ekranu; ako elementa nema
   u HTML-u, ništa se ne učitava (prvi RPC iz bumpSearchStat ionako osvežava state). */
(function lazyLoadStats(){
  const el = document.getElementById('statSearches');
  if (!el || !_SB_CONFIGURED) return;
  if (typeof IntersectionObserver === 'undefined') { window.addEventListener('load', () => setTimeout(loadStatsFromSupabase, 4000)); return; }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); loadStatsFromSupabase(); }
  }, { rootMargin: '400px' });
  io.observe(el);
})();

/* ---- Trenutni korisnik (keširano da ne zovemo getSession na svaki klik) ---- */
let _cachedUser = undefined; // undefined = još nije provereno, null = nije prijavljen
async function getCurrentUser(){
  if (!_SB_CONFIGURED) return null;
  if (_cachedUser !== undefined) return _cachedUser;
  // Bez sačuvane sesije niko nije prijavljen — ne učitavaj biblioteku samo zbog ove provere.
  if (!sb && !_sbPromise && !_sbShouldLoadEarly()) return null;
  if (!(await ensureSb())) return null;
  try {
    const { data, error } = await sb.auth.getSession();
    if (error) { console.warn('[sklopi] getSession greška:', error.message); _cachedUser = null; return null; }
    _cachedUser = data.session ? data.session.user : null;
    return _cachedUser;
  } catch(err) {
    console.warn('[sklopi] getSession nije uspeo:', err.message);
    _cachedUser = null;
    return null;
  }
}

// Sačuvana sesija / povratak sa magic-linka: učitaj biblioteku odmah da se prijava prepozna.
if (_SB_CONFIGURED && _sbShouldLoadEarly()) ensureSb();

/* ==========================================================
   NALOG — prijava linkom na email (magic link), bez lozinke.
   authBar se prikazuje u sekciji "Sačuvani izleti"; authDropdown je
   mala kartica koja iskače klikom na ikonicu naloga u zaglavlju.
========================================================== */
let _authBarExpanded = false;

// Zajednička funkcija za sve "Sačuvaj..." akcije kad korisnik nije
// prijavljen — otvara login karticu u header dropdown-u (dugme za nalog
// gore desno), umesto da skroluje na sekciju "Sačuvani izleti" na sredini
// sajta.
function promptLogin(message){
  ensureSb(); // unapred učitaj biblioteku dok korisnik kuca email
  _authBarExpanded = true;
  renderAccountMenu();
  const dropdown = document.getElementById('authDropdown');
  if (dropdown) dropdown.classList.add('open');
  window.scrollTo({top:0, behavior:'smooth'});
  if (message) showToast(message);
}

function renderAuthBar(user){
  const bar = document.getElementById('authBar');
  if (!bar) return;
  if (!_SB_CONFIGURED) { bar.innerHTML = ''; return; }

  if (user) {
    bar.innerHTML = `
      <div class="auth-logged-in">
        <span>Prijavljen/a kao <strong>${escapeHtml(user.email)}</strong></span>
        <button type="button" class="auth-logout-btn" id="authLogoutBtn">Odjavi se</button>
      </div>`;
    const logoutBtn = document.getElementById('authLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
      await sb.auth.signOut();
      _cachedUser = null;
      showToast('Odjavljen/a.');
      renderSavedTrips();
      renderAccountMenu();
    });
  } else if (_authBarExpanded) {
    bar.innerHTML = `
      <div class="auth-form">
        <input type="email" id="authEmailInput" class="auth-input" placeholder="tvoj@email.com" autocomplete="email" required>
        <button type="button" class="btn-primary" id="authSendLinkBtn">Pošalji link za prijavu</button>
      </div>
      <p class="auth-hint">Nema lozinke — kliknućeš na link koji ti stigne na email.</p>`;
    const sendBtn = document.getElementById('authSendLinkBtn');
    const emailInput = document.getElementById('authEmailInput');
    if (sendBtn) sendBtn.addEventListener('click', async () => {
      const email = (emailInput.value || '').trim();
      if (!email || !email.includes('@')) { showToast('Unesi ispravnu email adresu.'); return; }
      sendBtn.disabled = true;
      sendBtn.textContent = 'Šaljem…';
      try {
        if (!(await ensureSb())) throw new Error('Supabase nije dostupan');
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
        if (error) throw error;
        showToast('Link za prijavu je poslat na ' + email + ' — proveri inbox.');
        bar.innerHTML = '<p class="auth-hint">✓ Proveri email (' + escapeHtml(email) + ') i klikni na link za prijavu.</p>';
      } catch(err) {
        console.warn('[sklopi] slanje magic linka nije uspelo:', err.message);
        showToast('Slanje linka nije uspelo — pokušaj ponovo.');
        sendBtn.disabled = false;
        sendBtn.textContent = 'Pošalji link za prijavu';
      }
    });
  } else {
    bar.innerHTML = `<button type="button" class="btn-alert" id="authOpenBtn">${tx('Prijavi se da sačuvaš izlete')}</button>`;
    const openBtn = document.getElementById('authOpenBtn');
    if (openBtn) openBtn.addEventListener('click', () => { ensureSb(); _authBarExpanded = true; renderAuthBar(user); });
  }
}

/* ==========================================================
   SAČUVANI IZLETI
========================================================== */
async function renderSavedTrips(){
  const listEl = document.getElementById('savedTripsList');
  if (!listEl) return;
  const user = await getCurrentUser();
  renderAuthBar(user);

  if (!_SB_CONFIGURED) {
    listEl.innerHTML = '<p class="saved-empty">Sačuvani izleti trenutno nisu dostupni.</p>';
    return;
  }
  if (!user) {
    listEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = '<p class="saved-loading">Učitavam sačuvane izlete…</p>';
  try {
    const { data, error } = await sb.from('trips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending:false });
    if (error) throw error;

    if (!data || !data.length) {
      listEl.innerHTML = '<p class="saved-empty">Još nemaš sačuvanih izleta — sačuvaj neku od ponuda gore.</p>';
      return;
    }

    window._savedTripsCache = data;
    listEl.innerHTML = data.map(tripCardHtml).join('');
  } catch(err) {
    console.warn('[sklopi] učitavanje sačuvanih izleta nije uspelo:', err.message);
    listEl.innerHTML = '<p class="saved-empty">Sačuvani izleti trenutno nisu dostupni — probaj ponovo kasnije.</p>';
  }
}

function tripCardHtml(trip){
  const tags = (trip.selection && trip.selection.summaryTags) ? trip.selection.summaryTags : [];
  const tierLabel = (trip.selection && trip.selection.tierLabel) || '';
  return `
  <div class="saved-trip-card" data-trip-id="${trip.id}">
    <div class="saved-trip-head">
      <div>
        <h4>${escapeHtml(trip.dest)}</h4>
        <div class="saved-trip-meta">${fmtDate(trip.date_from)} – ${fmtDate(trip.date_to)} · ${trip.adults} ${passengerLabel(trip.adults)}${tierLabel ? ' · ' + escapeHtml(tierLabel) : ''}</div>
      </div>
      <div class="saved-trip-total tabular">${fmtEUR(trip.total)}</div>
    </div>
    ${tags.length ? `<div class="saved-trip-tags">${tags.map(x=>`<span class="saved-trip-tag">${escapeHtml(x)}</span>`).join('')}</div>` : ''}
    <div class="saved-trip-actions">
      <button type="button" class="saved-trip-btn" onclick="loadSavedTrip('${trip.id}')">Otvori ponovo</button>
      <button type="button" class="saved-trip-btn" onclick="openShareModal('${trip.id}')">Podeli</button>
      <button type="button" class="saved-trip-btn danger" onclick="deleteSavedTrip('${trip.id}')">Obriši</button>
    </div>
  </div>`;
}

async function saveSearchPackage(tier){
  const user = await getCurrentUser();
  if (!user){
    promptLogin('Prijavi se emailom da sačuvaš ponudu.');
    return;
  }
  const pkgs = window._lastSearchPkgs;
  const ctx = window._lastSearchCtx;
  if (!pkgs || !ctx){ showToast('Ponuda više nije dostupna — probaj ponovo.'); return; }
  const pkg = pkgs.find(p => p.tier === tier);
  if (!pkg){ showToast('Ponuda više nije dostupna — probaj ponovo.'); return; }

  const meta = TIER_META[tier];
  const summaryTags = [
    pkg.flight ? pkg.flight.name : 'Bez leta',
    pkg.hotel ? pkg.hotel.name : 'Bez hotela',
    pkg.car ? 'Sa autom' : 'Bez auta'
  ];

  try {
    const { error } = await sb.from('trips').insert({
      user_id: user.id,
      dest: ctx.dest,
      date_from: ctx.from,
      date_to: ctx.to,
      adults: Number(ctx.adults),
      selection: {kind:'search', tier, tierLabel: meta.label, summaryTags},
      total: pkg.total
    });
    if (error) throw error;
    renderSavedTrips();
    showToast(ctx.dest + ' sačuvan (' + fmtEUR(pkg.total) + ').');
  } catch(err) {
    console.warn('[sklopi] čuvanje ponude nije uspelo:', err.message);
    showToast('Čuvanje nije uspelo — pokušaj ponovo.');
  }
}

document.getElementById('saveTripBtn').addEventListener('click', async () => {
  const user = await getCurrentUser();
  if (!user){
    promptLogin('Prijavi se emailom da sačuvaš izlet.');
    return;
  }
  const pkg = window._lastBuilderPkg;
  if (!pkg){ showToast('Napravi izlet pre čuvanja.'); return; }
  const ctx = builderCtx();
  const summaryTags = [
    pkg.flight.name,
    builderState.hotelStars + '★ hotel',
    builderState.carPref === 'none' ? 'Bez auta' : (builderState.carPref === 'suv' ? 'SUV' : 'Mali auto'),
    builderState.activityCount + ' aktivnosti'
  ];
  try {
    const { error } = await sb.from('trips').insert({
      user_id: user.id,
      dest: ctx.dest,
      date_from: document.getElementById('dateFrom').value,
      date_to: document.getElementById('dateTo').value,
      adults: ctx.adults,
      selection: {kind:'builder', builderState: Object.assign({}, builderState), summaryTags, tierLabel:'Sopstveni izlet'},
      total: pkg.total
    });
    if (error) throw error;
    renderSavedTrips();
    showToast('Izlet sačuvan (' + fmtEUR(pkg.total) + ').');
  } catch(err) {
    console.warn('[sklopi] čuvanje izleta nije uspelo:', err.message);
    showToast('Čuvanje nije uspelo — pokušaj ponovo.');
  }
});

function loadSavedTrip(tripId){
  const trip = (window._savedTripsCache || []).find(t => String(t.id) === String(tripId));
  if (!trip){ showToast('Izlet više nije dostupan.'); return; }

  document.getElementById('dest').value = trip.dest;
  document.getElementById('dateFrom').value = trip.date_from;
  document.getElementById('dateTo').value = trip.date_to;
  document.getElementById('adults').value = String(trip.adults);
  if (typeof window.syncPaxDisplay === 'function') window.syncPaxDisplay();
  if (typeof window.syncDateDisplay === 'function') window.syncDateDisplay();
  document.getElementById('dateFrom').dispatchEvent(new Event('change', {bubbles:true}));

  if (trip.selection && trip.selection.kind === 'builder' && trip.selection.builderState){
    Object.assign(builderState, BUILDER_DEFAULTS, trip.selection.builderState);
    renderFormUI();
    renderBuilder();
    document.getElementById('builderSummary').style.display = 'block';
    document.getElementById('builderPlaceholder').style.display = 'none';
    document.getElementById('builderBookLinks').style.display = 'none';
    openControlPanel();
    document.querySelector('.builder-wrap').scrollIntoView({behavior:'smooth', block:'start'});
  } else {
    if (!isMobileResults()) document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
    runSearch(false);
  }
  showToast('Izlet za ' + trip.dest + ' učitan.');
}

async function deleteSavedTrip(tripId){
  if (!(await ensureSb())) return;
  try {
    const { error } = await sb.from('trips').delete().eq('id', tripId);
    if (error) throw error;
    renderSavedTrips();
    showToast('Izlet obrisan.');
  } catch(err) {
    console.warn('[sklopi] brisanje nije uspelo:', err.message);
    showToast('Brisanje nije uspelo — pokušaj ponovo.');
  }
}

/* ==========================================================
   PODELI SA PRIJATELJIMA
   Deljeni link vodi na zajedno.html sa ?trip=<id> parametrom;
   ta stranica (van obima ovog prolaza) čita parametar i prikazuje
   RSVP (Idem/Možda/Ne mogu) bez potrebe za nalogom.
========================================================== */
function openShareModal(tripId){
  const trip = (window._savedTripsCache || []).find(t => String(t.id) === String(tripId));
  const link = window.location.origin + '/zajedno.html?trip=' + encodeURIComponent(tripId);
  document.getElementById('shareModalSub').textContent = trip
    ? 'Pošalji predlog za ' + trip.dest + ' prijateljima.'
    : 'Pošalji ovaj predlog prijateljima.';
  document.getElementById('shareModalLink').value = link;
  document.getElementById('shareModalNative').style.display = (navigator.share) ? 'block' : 'none';
  document.getElementById('shareModalBackdrop').classList.add('open');
  document.getElementById('shareModal').classList.add('open');
  window._pendingShareLink = link;
  guardOverlayOpen('share', closeShareModal);
}
function requestCloseShareModal(){
  if (!guardOverlayRequestClose('share')) closeShareModal();
}
function closeShareModal(){
  document.getElementById('shareModalBackdrop').classList.remove('open');
  document.getElementById('shareModal').classList.remove('open');
}
document.getElementById('shareModalClose').addEventListener('click', requestCloseShareModal);
document.getElementById('shareModalBackdrop').addEventListener('click', requestCloseShareModal);
document.getElementById('shareModalCopy').addEventListener('click', async () => {
  const input = document.getElementById('shareModalLink');
  input.select();
  try {
    await navigator.clipboard.writeText(input.value);
    showToast('Link kopiran.');
  } catch(err) {
    document.execCommand('copy');
    showToast('Link kopiran.');
  }
});
document.getElementById('shareModalNative').addEventListener('click', async () => {
  try {
    await navigator.share({ title:'SKLOPI — predlog za izlet', url: window._pendingShareLink });
  } catch(err){ /* korisnik je otkazao deljenje — nema potrebe za toast-om */ }
});

/* ==========================================================
   ALERT ZA CENU (Javi mi kad padne cena)
========================================================== */
let _pendingAlert = null;
/* ---- Double opt-in: traži od worker-a da pošalje potvrdni mejl za
   alert koji je upravo upisan kao 'pending_confirmation'. Fire-and-
   -forget — čak i ako ovaj pozit ne uspe (npr. Worker Route još nije
   podešen, vidi SKLOPI_ALERT_WORKER_URL u config.js), red u bazi i
   dalje postoji, samo ostaje pending dok korisnik ne zatraži novi
   alert ili se problem ne reši; ne blokiramo UI čekajući ovo. ---- */
function requestConfirmationEmail(payload){
  const base = window.SKLOPI_ALERT_WORKER_URL;
  if (!base) return;
  fetch(base.replace(/\/$/, '') + '/go/send-confirmation', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  }).catch(err => {
    console.warn('[sklopi] slanje potvrdnog mejla nije uspelo:', err.message);
  });
}

async function openAlertModal(kind, tier, total, destOverride){
  const user = await getCurrentUser();
  if (!user){
    promptLogin('Prijavi se emailom da postaviš alert za cenu.');
    return;
  }
  let dest, dateFrom, dateTo, adults, selection;
  if (kind === 'builder') {
    const ctx = builderCtx();
    dest = ctx.dest;
    dateFrom = ctx.from;
    dateTo = ctx.to;
    adults = ctx.adults;
    // Čuvamo CEO izbor iz buildera (builderState) da bi server kasnije
    // mogao da rekonstruiše IDENTIČAN paket i uporedi cenu (vidi
    // computeBuilderTotal u pricing-core.js, koje očekuje selection sa
    // flightPref/hotelStars/prioritizeRating/prioritizeLocation/carPref/
    // activityCount direktno na objektu — bez ovoga ne bi imao dovoljno
    // informacija: builder ima mnogo više opcija od gotove ponude).
    selection = Object.assign({ kind: 'builder' }, builderState);
  } else {
    const isMatchPick = !!destOverride;
    const ctx = isMatchPick ? window._lastMatchCtx : window._lastSearchCtx;
    dest = destOverride || (window._lastSearchCtx && window._lastSearchCtx.dest) || document.getElementById('dest').value.trim() || 'Atina';
    dateFrom = ctx && ctx.from;
    dateTo = ctx && ctx.to;
    adults = ctx ? Number(ctx.adults) : 2;
    // Worker (pricing-core.js → computeAlertPrice) prepoznaje 'search' po
    // selection.kind i računa cenu preko computeSearchTierTotal(dest,
    // nights, adults, tier) — tier je jedino što mu treba osim onoga što
    // već ima u redu (dest/date_from/date_to/adults).
    selection = { kind: 'search', tier };
  }
  if (!dateFrom || !dateTo) {
    showToast('Nedostaju datumi putovanja — pokušaj ponovo iz pretrage.');
    return;
  }
  _pendingAlert = { dest, dateFrom, dateTo, adults, selection, currentTotal: total };
  document.getElementById('alertModalSub').textContent = 'Za ' + dest + ' — trenutna procena je ' + fmtEUR(total) + '.';
  document.getElementById('alertEmail').value = user.email;
  document.getElementById('alertThreshold').value = Math.max(1, Math.round(total * 0.9));
  document.getElementById('alertConsent').checked = false;
  document.getElementById('alertModalBackdrop').classList.add('open');
  document.getElementById('alertModal').classList.add('open');
  guardOverlayOpen('alert', closeAlertModal);
}
function requestCloseAlertModal(){
  if (!guardOverlayRequestClose('alert')) closeAlertModal();
}
function closeAlertModal(){
  document.getElementById('alertModalBackdrop').classList.remove('open');
  document.getElementById('alertModal').classList.remove('open');
}
document.getElementById('alertModalClose').addEventListener('click', requestCloseAlertModal);
document.getElementById('alertModalBackdrop').addEventListener('click', requestCloseAlertModal);
document.getElementById('alertBuilderBtn')?.addEventListener('click', () => {
  const pkg = window._lastBuilderPkg;
  if (!pkg){ showToast('Napravi izlet pre postavljanja alerta.'); return; }
  openAlertModal('builder', null, pkg.total);
});
document.getElementById('alertModalSubmit').addEventListener('click', async () => {
  const email = document.getElementById('alertEmail').value.trim();
  const threshold = Number(document.getElementById('alertThreshold').value);
  const submitBtn = document.getElementById('alertModalSubmit');
  if (!email || !email.includes('@')){ showToast('Unesi ispravnu email adresu.'); return; }
  if (!threshold || threshold <= 0){ showToast('Unesi ispravan iznos.'); return; }
  if (!document.getElementById('alertConsent').checked){ showToast(t('alert_consent_required')); return; }
  if (!_pendingAlert){ requestCloseAlertModal(); return; }

  if (!(await ensureSb())) {
    showToast('Alerti trenutno nisu dostupni — pokušaj kasnije.');
    return;
  }

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = '…';
  try {
    const { error } = await sb.from('price_alerts').insert({
      email,
      dest: _pendingAlert.dest,
      date_from: _pendingAlert.dateFrom,
      date_to: _pendingAlert.dateTo,
      adults: _pendingAlert.adults,
      selection: _pendingAlert.selection,
      threshold,
      last_price: _pendingAlert.currentTotal
      // Napomena: NE šaljemo status — kolona ima default
      // 'pending_confirmation' (double opt-in, vidi
      // 20260918100005_price_alerts_double_optin.sql). Alert postaje
      // 'active' (i worker ga počinje da proverava) tek kad korisnik
      // klikne link iz mejla koji šaljemo ispod.
    });
    if (error) throw error;

    // Browser nema SELECT pravo na price_alerts (namerno, vidi RLS u
    // price_alerts.sql), pa ne dobijamo nazad confirmation_token iz
    // insert-a — zato worker sam pronalazi red po ovim istim poljima
    // (vidi handleSendConfirmation u price-alert-worker.js).
    requestConfirmationEmail({
      email,
      dest: _pendingAlert.dest,
      date_from: _pendingAlert.dateFrom,
      date_to: _pendingAlert.dateTo,
      threshold
    });

    requestCloseAlertModal();
    showToast('Poslali smo ti mejl na ' + email + ' — potvrdi klikom da aktiviraš alert za ' + _pendingAlert.dest + '.');
  } catch(err) {
    console.warn('[sklopi] čuvanje alerta nije uspelo:', err.message);
    showToast('Postavljanje alerta nije uspelo — pokušaj ponovo.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});

/* ==========================================================
   NALOG — dropdown u zaglavlju + mobilni meni (hamburger)
========================================================== */
function renderAccountMenu(){
  const dropdown = document.getElementById('authDropdown');
  if (!dropdown) return;
  if (!_SB_CONFIGURED) {
    dropdown.innerHTML = `<div class="auth-dropdown-inner">
         <p class="auth-hint">Prijava trenutno nije dostupna.</p>
       </div>`;
    return;
  }
  getCurrentUser().then(user => {
    if (user) {
      dropdown.innerHTML = `<div class="auth-dropdown-inner">
           <div class="auth-dropdown-email">${escapeHtml(user.email)}</div>
           <a href="#" id="dropdownSavedLink">Sačuvani izleti</a>
           <button type="button" id="dropdownLogoutBtn">Odjavi se</button>
         </div>`;
    } else if (_authBarExpanded) {
      dropdown.innerHTML = `<div class="auth-dropdown-inner">
           <p>${tx('Prijavi se da sačuvaš izlete i primaš alerte o ceni.')}</p>
           <input type="email" id="dropdownEmailInput" class="auth-input" placeholder="tvoj@email.com" autocomplete="email" required>
           <button type="button" class="btn-primary" id="dropdownSendLinkBtn">Pošalji link za prijavu</button>
           <p class="auth-hint">Nema lozinke — kliknućeš na link koji ti stigne na email.</p>
         </div>`;
    } else {
      dropdown.innerHTML = `<div class="auth-dropdown-inner">
           <p>${tx('Prijavi se da sačuvaš izlete i primaš alerte o ceni.')}</p>
           <button type="button" id="dropdownLoginBtn">Prijavi se</button>
         </div>`;
    }
    const savedLink = document.getElementById('dropdownSavedLink');
    if (savedLink) savedLink.addEventListener('click', (e) => {
      e.preventDefault();
      dropdown.classList.remove('open');
      document.querySelector('.saved-wrap')?.scrollIntoView({behavior:'smooth', block:'start'});
    });
    const logoutBtn = document.getElementById('dropdownLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
      await sb.auth.signOut();
      _cachedUser = null;
      dropdown.classList.remove('open');
      showToast('Odjavljen/a.');
      renderSavedTrips();
      renderAccountMenu();
    });
    const loginBtn = document.getElementById('dropdownLoginBtn');
    if (loginBtn) loginBtn.addEventListener('click', () => {
      _authBarExpanded = true;
      renderAccountMenu();
    });
    const sendBtn = document.getElementById('dropdownSendLinkBtn');
    const emailInput = document.getElementById('dropdownEmailInput');
    if (sendBtn) sendBtn.addEventListener('click', async () => {
      const email = (emailInput.value || '').trim();
      if (!email || !email.includes('@')) { showToast('Unesi ispravnu email adresu.'); return; }
      sendBtn.disabled = true;
      sendBtn.textContent = 'Šaljem…';
      try {
        if (!(await ensureSb())) throw new Error('Supabase nije dostupan');
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
        if (error) throw error;
        showToast('Link za prijavu je poslat na ' + email + ' — proveri inbox.');
        dropdown.innerHTML = '<div class="auth-dropdown-inner"><p class="auth-hint">✓ Proveri email (' + escapeHtml(email) + ') i klikni na link za prijavu.</p></div>';
      } catch(err) {
        console.warn('[sklopi] slanje magic linka nije uspelo:', err.message);
        showToast('Slanje linka nije uspelo — pokušaj ponovo.');
        sendBtn.disabled = false;
        sendBtn.textContent = 'Pošalji link za prijavu';
      }
    });
  });
}

const topAvatarBtn = document.getElementById('topAvatarBtn');
const authDropdown = document.getElementById('authDropdown');
if (topAvatarBtn && authDropdown){
  topAvatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const mp = document.getElementById('mobilePanel'); if (mp) mp.classList.remove('open');
    authDropdown.classList.toggle('open');
    if (authDropdown.classList.contains('open')) renderAccountMenu();
  });
  document.addEventListener('click', () => authDropdown.classList.remove('open'));
  authDropdown.addEventListener('click', (e) => e.stopPropagation());
}

const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobilePanel = document.getElementById('mobilePanel');
if (hamburgerBtn && mobilePanel){
  hamburgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const ad = document.getElementById('authDropdown'); if (ad) ad.classList.remove('open');
    mobilePanel.classList.toggle('open');
  });
  mobilePanel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobilePanel.classList.remove('open')));
  document.addEventListener('click', (e) => {
    if (mobilePanel.classList.contains('open') && !mobilePanel.contains(e.target)) mobilePanel.classList.remove('open');
  });
}

/* ---- "Pronađi svoj izlet" dugme na stranici otvara kviz modal (koristi runMatchSearch iznad) ---- */
const matchTriggerBtn = document.getElementById('matchTriggerBtn');
if (matchTriggerBtn) matchTriggerBtn.addEventListener('click', openMatchModal);
const matchModalClose = document.getElementById('matchModalClose');
if (matchModalClose) matchModalClose.addEventListener('click', requestCloseMatchModal);
const matchModalBackdrop = document.getElementById('matchModalBackdrop');
if (matchModalBackdrop) matchModalBackdrop.addEventListener('click', requestCloseMatchModal);
const matchModalSubmit = document.getElementById('matchModalSubmit');
if (matchModalSubmit) matchModalSubmit.addEventListener('click', () => runMatchSearch(false));
document.querySelectorAll('#matchModal .match-back').forEach(btn => {
  btn.addEventListener('click', () => goToMatchStep(Number(btn.dataset.back)));
});

/* ---- Jedinstvena kartica "Dokumenta za put": pasoš + zelena karta, sa tabovima i scrollom ---- */
/* docsActionRow (unos datuma + dugme "Proveri") se prikazuje samo na tabu
   "Pasoš" i samo kad je pasoš uopšte relevantan za unetu destinaciju —
   ako destinacija nije uneta ili pasoš nije potreban, red se sakriva
   umesto da ostane vidljiv ali onemogućen (što je izgledalo kao kvar). */
let passportActionApplicable = false;
function updateDocsActionRowVisibility(){
  const row = document.getElementById('docsActionRow');
  const passTab = document.getElementById('docsTabPassport');
  const onPassportTab = !!(passTab && passTab.classList.contains('active'));
  if (row) row.hidden = !(onPassportTab && passportActionApplicable);
}
function fillPassportSection(destVal, country){
  const box = document.getElementById('passportRuleBox');
  const submitBtn = document.getElementById('passportCheckSubmit');
  const expiryInput = document.getElementById('passportExpiryInput');
  const resultEl = document.getElementById('passportResult');
  if (!destVal.trim()){
    if (box){
      box.innerHTML = '<div class="passport-rule-box">'
        + '<b>Destinacija nije uneta</b>'
        + '<br>Prvo upiši kuda putuješ u polje „Destinacija“ iznad, pa se vrati ovde — pravilo o pasošu zavisi od zemlje.'
        + '</div>';
    }
    if (expiryInput) expiryInput.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    if (resultEl){ resultEl.className = ''; resultEl.innerHTML = ''; }
    passportActionApplicable = false;
    updateDocsActionRowVisibility();
    return;
  }
  if (expiryInput) expiryInput.disabled = false;
  if (submitBtn) submitBtn.disabled = false;
  const rule = getPassportRule(country, destVal);
  if (box){
    box.innerHTML = (rule.visaNote
        ? '<div class="passport-visa-box">🛂❗ <b>Potrebna je viza</b><br>' + escapeHtml(rule.visaNote) + '</div>'
        : '')
      + '<div class="passport-rule-box">'
      + '<b>' + escapeHtml(destVal + (country ? ' · ' + country : '')) + '</b>'
      + '<br>' + escapeHtml(rule.why)
      + (rule.confident ? '' : '<br><span style="opacity:0.75">(opšte pravilo, ne potvrđeno za ovu zemlju)</span>')
      + '</div>'
      + travelRulesUpdatedHtml();
  }
  if (rule.noPassportNeeded){
    if (expiryInput) expiryInput.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    if (resultEl){
      resultEl.className = 'passport-result ok';
      resultEl.innerHTML = '✅ ' + escapeHtml(rule.why);
    }
    passportActionApplicable = false;
  } else {
    if (resultEl){ resultEl.className = ''; resultEl.innerHTML = ''; }
    passportActionApplicable = true;
  }
  if (submitBtn) submitBtn.dataset.country = country;
  updateDocsActionRowVisibility();
}
function fillGreenCardSection(destVal, country){
  const box = document.getElementById('greenCardRuleBox');
  if (!box) return;
  if (!destVal.trim()){
    box.innerHTML = '<div class="passport-rule-box">'
      + '<b>Destinacija nije uneta</b>'
      + '<br>' + escapeHtml(t('green_card_dest_missing'))
      + '</div>';
    return;
  }
  const rule = getGreenCardRule(country);
  const statusBox = rule.status === 'needed'
    ? '<div class="passport-visa-box">🪪❗ <b>Zelena karta je obavezna</b><br>' + escapeHtml(rule.why) + '</div>'
    : rule.status === 'ok'
      ? '<div class="passport-result ok" style="margin-top:0;">✅ ' + escapeHtml(rule.why) + '</div>'
      : '<div class="passport-rule-box"><b>' + escapeHtml(destVal + (country ? ' · ' + country : '')) + '</b><br>' + escapeHtml(rule.why) + '</div>';
  box.innerHTML = statusBox
    + '<div class="passport-rule-box" style="margin-top:10px;">'
    + (rule.status !== 'unknown' ? '<b>' + escapeHtml(destVal + (country ? ' · ' + country : '')) + '</b><br>' : '')
    + '<span style="opacity:0.75">' + escapeHtml(t('green_card_scope_note')) + '</span>'
    + '</div>'
    + travelRulesUpdatedHtml();
}
function switchDocsTab(which){
  const passTab = document.getElementById('docsTabPassport');
  const gcTab = document.getElementById('docsTabGreenCard');
  const passSection = document.getElementById('docsSectionPassport');
  const gcSection = document.getElementById('docsSectionGreenCard');
  const showPassport = which === 'passport';
  if (passTab){ passTab.classList.toggle('active', showPassport); passTab.setAttribute('aria-selected', showPassport ? 'true' : 'false'); }
  if (gcTab){ gcTab.classList.toggle('active', !showPassport); gcTab.setAttribute('aria-selected', !showPassport ? 'true' : 'false'); }
  if (passSection) passSection.hidden = !showPassport;
  if (gcSection) gcSection.hidden = showPassport;
  updateDocsActionRowVisibility();
  const scrollEl = document.querySelector('#documentsModal .docs-scroll');
  if (scrollEl) scrollEl.scrollTop = 0;
}
function openDocumentsModal(){
  const destVal = (document.getElementById('dest') || {}).value || '';
  const country = destVal.trim() ? resolveCountryForDestination(destVal) : null;
  fillPassportSection(destVal, country);
  fillGreenCardSection(destVal, country);
  switchDocsTab('passport');
  document.getElementById('documentsModalBackdrop').classList.add('open');
  document.getElementById('documentsModal').classList.add('open');
  guardOverlayOpen('documents', closeDocumentsModal);
}
function requestCloseDocumentsModal(){
  if (!guardOverlayRequestClose('documents')) closeDocumentsModal();
}
function closeDocumentsModal(){
  document.getElementById('documentsModalBackdrop').classList.remove('open');
  document.getElementById('documentsModal').classList.remove('open');
}
function runPassportCheck(){
  const destVal = (document.getElementById('dest') || {}).value || '';
  const resultEl = document.getElementById('passportResult');
  if (!resultEl) return;
  if (!destVal.trim()){
    resultEl.className = 'passport-result warn';
    resultEl.innerHTML = 'Prvo upiši destinaciju u formi, pa probaj ponovo.';
    return;
  }
  const expiryVal = (document.getElementById('passportExpiryInput') || {}).value;
  const country = resolveCountryForDestination(destVal);
  const rule = getPassportRule(country, destVal);
  if (rule.noPassportNeeded){
    resultEl.className = 'passport-result ok';
    resultEl.innerHTML = '✅ ' + escapeHtml(rule.why);
    return;
  }
  if (!expiryVal){
    resultEl.className = 'passport-result warn';
    resultEl.innerHTML = 'Unesi datum isteka pasoša da bismo mogli da proverimo.';
    return;
  }
  const fromISO = (document.getElementById('dateFrom') || {}).value;
  const toISO = (document.getElementById('dateTo') || {}).value;
  const basisISO = rule.basis === 'from' ? fromISO : toISO;
  if (!basisISO){
    resultEl.className = 'passport-result warn';
    resultEl.innerHTML = 'Nedostaju datumi putovanja — vrati se na formu i izaberi Od — Do.';
    return;
  }
  const [by, bm, bd] = basisISO.split('-').map(Number);
  const basisDate = new Date(by, bm - 1, bd);
  const requiredExpiry = rule.days != null ? addDaysToDate(basisDate, rule.days) : addMonthsToDate(basisDate, rule.months);
  const [ey, em, ed] = expiryVal.split('-').map(Number);
  const expiryDate = new Date(ey, em - 1, ed);
  if (expiryDate.getTime() >= requiredExpiry.getTime()){
    resultEl.className = 'passport-result ok';
    resultEl.innerHTML = '✅ Tvoj pasoš važi dovoljno dugo za ovo putovanje — destinacija „' + escapeHtml(rule.label) + '“.';
  } else {
    resultEl.className = 'passport-result warn';
    resultEl.innerHTML = '⚠️ Tvoj pasoš ističe ' + fmtDateSr(expiryDate) + '. Pravilo za destinaciju „' + escapeHtml(rule.label)
      + '“ traži da važi bar do ' + fmtDateSr(requiredExpiry) + '. Vreme je da obnoviš pasoš — MUP izdaje redovan za oko 30 dana, a uz dokaz o putovanju (kartu ili rezervaciju) moguća je i ubrzana procedura za 48h.';
  }
}

const currencySwitchBtn = document.getElementById('currencySwitchBtn');
if (currencySwitchBtn) currencySwitchBtn.addEventListener('click', () => {
  setCurrency(currentCurrency === 'EUR' ? 'RSD' : 'EUR');
});
applyCurrencyToggleUi(); // odraz sačuvanog izbora (localStorage) pri učitavanju

const documentsCheckBtn = document.getElementById('documentsCheckBtn');
if (documentsCheckBtn) documentsCheckBtn.addEventListener('click', openDocumentsModal);
const documentsModalClose = document.getElementById('documentsModalClose');
if (documentsModalClose) documentsModalClose.addEventListener('click', requestCloseDocumentsModal);
const documentsModalBackdrop = document.getElementById('documentsModalBackdrop');
if (documentsModalBackdrop) documentsModalBackdrop.addEventListener('click', requestCloseDocumentsModal);
const docsTabPassport = document.getElementById('docsTabPassport');
if (docsTabPassport) docsTabPassport.addEventListener('click', () => switchDocsTab('passport'));
const docsTabGreenCard = document.getElementById('docsTabGreenCard');
if (docsTabGreenCard) docsTabGreenCard.addEventListener('click', () => switchDocsTab('greencard'));
const passportCheckSubmit = document.getElementById('passportCheckSubmit');
if (passportCheckSubmit) passportCheckSubmit.addEventListener('click', runPassportCheck);

