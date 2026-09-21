/* ==========================================================
   ŽIVA RASPODELA CENE (price-mix.js)
   Sekcija "Od čega se sastoji cena paketa" — grafikon koji se
   preračunava u realnom vremenu: čim korisnik promeni destinaciju,
   datume, broj putnika ili uključi/isključi uslugu, trake se pomere,
   uz razliku (+/−) u odnosu na prethodni izračun.

   Prikazuje TIPIČAN paket (let + smeštaj + auto + aktivnosti + dodaci)
   za trenutnu pretragu, bez obzira na to koje su usluge uključene u
   formi — grafikon objašnjava od čega se cena obično sastoji.
   Brojevi dolaze iz istog izvora kao kartice ponuda:
   computePackagesLocally() sa vrednostima iz forme (destinacija,
   datumi, putnici, izbori iz buildera). Ako je forma prazna ili
   nepotpuna, koristi se primer (Atina, 7 noći) za nedostajuće delove.
   Skripta ništa ne menja u app.js — samo čita njegove globalne
   funkcije (computePackagesLocally, fmtEUR, t, getLang, TIER_META...).
   Učitava se posle app.js. Sekcija se iscrtava u #priceMixSection.
========================================================== */
(function(){
'use strict';

const HOST_ID = 'priceMixSection';
const POLL_MS = 1000;          // koliko često proveravamo da li se ulaz promenio
const DELTA_VISIBLE_MS = 8000; // koliko dugo se vidi razlika (+/−) posle promene

/* Redosled = redosled u grafikonu. key = polje u raspodeli, cls = boja iz styles.css */
const ROWS = [
  {key:'flight',    cls:'flight',    label:'pc_flights',    svg:'<path d="M2 16l6-2 4.5-7 2 .6-2.5 6.9 5 1.5 3-2.4 1.6.5-2 3-5.5 1-1 2.6-1.8-.5.7-2.8-5 1.2-1-1.7z"/>'},
  {key:'hotel',     cls:'hotel',     label:'pc_hotel',      svg:'<path d="M3 21V6l7-3 7 3v15M3 21h18M9 21v-6h4v6"/>'},
  {key:'car',       cls:'car',       label:'pc_car',        svg:'<path d="M4 16v-4l2-5h12l2 5v4M4 16h16M6 16v2.5a1 1 0 001 1h1a1 1 0 001-1V16M15 16v2.5a1 1 0 001 1h1a1 1 0 001-1V16M6 12h12"/>'},
  {key:'activity',  cls:'activity',  label:'pc_activities', svg:'<path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/>'},
  {key:'insurance', cls:'insurance', label:'pc_insurance',  svg:'<path d="M12 2l8 3v6c0 5-3.4 8.5-8 11-4.6-2.5-8-6-8-11V5l8-3z"/>'},
  {key:'tolls',     cls:'tolls',     label:'pc_tolls',      svg:'<path d="M4 20L11 4h2l7 16M8 15h8"/>'},
  {key:'esim',      cls:'esim',      label:'pc_esim',       svg:'<path d="M6 8.5a8.5 8.5 0 0112 0M8.7 11.2a4.7 4.7 0 016.6 0M11.4 13.9a1 1 0 011.2 0"/><circle cx="12" cy="17.5" r="1.1" fill="currentColor"/>'},
  {key:'transfer',  cls:'transfer',  label:'pc_transfers',  svg:'<path d="M4 8h13l-3-3M20 16H7l3 3"/>'}
];
const TIERS = ['best','comfort','budget'];

/* Tekstovi koji nisu u locales/*.json — držimo ih ovde da za ovu funkciju
   ne treba menjati prevode i regenerisati i18n-data.js. */
const TXT = {
  sr: {live:'uživo', now:'Ažurirano upravo sada', sec:'Ažurirano pre {n} sek', min:'Ažurirano pre {n} min',
       foot:'⚠️ Ilustrativna procena tipičnog paketa (let, smeštaj, auto i aktivnosti) za tvoju pretragu. Računa se istim izvorom kao kartice ponuda i osvežava se čim izmeniš destinaciju, datume ili broj putnika. Cenu potvrđuje partner pri rezervaciji.',
       tabs:'Kategorija paketa', empty:'Nema podataka za prikaz raspodele cene.'},
  en: {live:'live', now:'Updated just now', sec:'Updated {n} sec ago', min:'Updated {n} min ago',
       foot:'⚠️ Illustrative estimate of a typical package (flight, stay, car and activities) for your search. It uses the same source as the offer cards and refreshes as soon as you change the destination, dates or number of travelers. The partner confirms the price at booking.',
       tabs:'Package category', empty:'No data to show the price breakdown.'},
  ru: {live:'онлайн', now:'Обновлено только что', sec:'Обновлено {n} сек. назад', min:'Обновлено {n} мин. назад',
       foot:'⚠️ Ориентировочная оценка типового пакета (перелёт, проживание, авто и активности) для вашего поиска. Считается из того же источника, что и карточки предложений, и обновляется при смене направления, дат или числа путешественников. Цену подтверждает партнёр при бронировании.',
       tabs:'Категория пакета', empty:'Нет данных для отображения структуры цены.'}
};
function lang(){ try { return typeof getLang === 'function' ? getLang() : 'sr'; } catch(e){ return 'sr'; } }
function tx(k, vars){
  const d = TXT[lang()] || TXT.sr;
  let s = d[k] != null ? d[k] : TXT.sr[k];
  if (vars) for (const v in vars) s = s.replace('{' + v + '}', vars[v]);
  return s;
}
function tr(key){ try { return t(key); } catch(e){ return key; } }
function money(n){ try { return fmtEUR(n); } catch(e){ return '€' + n; } }
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------- ulaz: forma → paketi ---------- */
function $(id){ return document.getElementById(id); }

function readForm(){
  const dest = ($('dest') && $('dest').value || '').trim();
  return {
    dest: dest,
    origin: ($('origin') && $('origin').value || '').trim(),
    from: $('dateFrom') ? $('dateFrom').value : '',
    to: $('dateTo') ? $('dateTo').value : '',
    adults: String(Math.min(9, Math.max(1, Number($('adults') && $('adults').value) || 2)))
  };
}
function buildFlags(){
  /* isti oblik kao u runSearch(), ali sa SVIM uslugama uključenim (tipičan paket) */
  const b = (typeof builderState !== 'undefined') ? builderState : {};
  return {
    flight:true, hotel:true, car:true, activity:true,
    flightPref:b.flightPref, airlineName:b.airlineName, hotelStars:b.hotelStars,
    prioritizeRating:b.prioritizeRating, prioritizeLocation:b.prioritizeLocation,
    carPref: b.carPref && b.carPref !== 'none' ? b.carPref : 'small',
    activityCount: b.activityCount > 0 ? b.activityCount : 1
  };
}
function isIso(v){ return /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !isNaN(new Date(v)); }
function isoPlus(days){
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
/* Vraća {pkgs, ctx}; nedostajuće/neispravne delove forme menja primerom */
function currentSource(){
  const f = readForm();
  let from = f.from, to = f.to;
  if (!isIso(from) || !isIso(to) || to <= from){ from = isoPlus(30); to = isoPlus(37); }
  const ctx = {dest: f.dest || 'Atina', origin: f.origin || 'Beograd', from:from, to:to, adults:f.adults};
  try {
    const nights = nightsBetween(from, to);
    return {pkgs:computePackagesLocally(ctx.dest, from, to, nights, nights, ctx.adults, buildFlags(), ctx.origin), ctx:ctx};
  } catch(e){
    console.error('[price-mix] izračun nije uspeo:', e);
    return null;
  }
}

/* Raspodela u EUR po stavci (isti brojevi kao na kartici paketa) */
function breakdown(pkg){
  const n = v => { v = Math.round(Number(v)); return isFinite(v) && v > 0 ? v : 0; };
  return {
    flight: n(pkg.flight && pkg.flight.price),
    hotel: n(pkg.hotel && pkg.hotel.price),
    car: n((pkg.car ? pkg.car.price : 0) + (pkg.car ? pkg.fuel : 0)),
    activity: n(pkg.activity && pkg.activity.price),
    insurance: n(pkg.insuranceCost),
    tolls: n(pkg.tolls),
    esim: n(pkg.esimCost),
    transfer: 0
  };
}
/* Procenti koji se uvek sabiraju na 100 (metod najvećeg ostatka) */
function percents(vals){
  const total = ROWS.reduce((s, r) => s + vals[r.key], 0);
  const out = {}; if (!total){ ROWS.forEach(r => out[r.key] = 0); return {total:0, pct:out}; }
  let used = 0; const rem = [];
  ROWS.forEach(r => {
    const raw = vals[r.key] * 100 / total, fl = Math.floor(raw);
    out[r.key] = fl; used += fl; rem.push({k:r.key, r:raw - fl});
  });
  rem.sort((a, b) => b.r - a.r);
  for (let i = 0; i < 100 - used; i++) out[rem[i % rem.length].k]++;
  return {total:total, pct:out};
}

/* ---------- prikaz ---------- */
let state = {tier:'best', sig:'', lang:'', updatedAt:0, prev:null, deltaTimer:0, values:null};
const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

function buildShell(){
  const host = $(HOST_ID);
  if (!host) return null;
  const tabs = TIERS.map(k => {
    const label = (typeof TIER_META !== 'undefined' && TIER_META[k]) ? TIER_META[k].label : k;
    return '<button type="button" class="chip' + (k === state.tier ? ' on' : '') + '" data-tier="' + k + '" aria-pressed="' + (k === state.tier) + '">' + esc(label) + '</button>';
  }).join('');
  const rows = ROWS.map(r =>
    '<div class="phr-row" data-key="' + r.key + '" hidden>' +
      '<div class="phr-label"><span class="phr-ic phr-ic--' + r.cls + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' + r.svg + '</svg></span><span>' + esc(tr(r.label)) + '</span></div>' +
      '<div class="phr-track"><div class="phr-fill phr-fill--' + r.cls + '" style="width:0%"></div></div>' +
      '<div class="phr-nums"><span class="phr-pct tabular">0%</span><span class="phr-eur tabular"></span><span class="phr-delta" hidden></span></div>' +
    '</div>').join('');
  host.innerHTML =
    '<div class="price-chart">' +
      '<div class="price-chart-head"><h3>' + esc(tr('pc_title')) + '</h3><p>' + esc(tr('pc_sub')) + '</p></div>' +
      '<div class="price-chart-tabs chip-row" role="group" aria-label="' + esc(tx('tabs')) + '">' + tabs + '</div>' +
      '<p class="price-chart-scn" id="pmScn"></p>' +
      '<div class="price-hbar-list" id="pmList" role="img">' + rows + '</div>' +
      '<p class="price-chart-empty" id="pmEmpty" hidden style="margin:0;font-size:14px;color:var(--ink-soft);">' + esc(tx('empty')) + '</p>' +
      '<p class="price-chart-updated" id="pmUpdated" aria-live="off"></p>' +
      '<p class="price-chart-foot">' + esc(tx('foot')) + '</p>' +
    '</div>';
  host.querySelectorAll('[data-tier]').forEach(b => b.addEventListener('click', () => {
    state.tier = b.getAttribute('data-tier');
    host.querySelectorAll('[data-tier]').forEach(x => {
      const on = x.getAttribute('data-tier') === state.tier;
      x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on));
    });
    state.prev = null;             // promena kategorije nije "promena cene"
    refresh(true);
  }));
  if (REDUCED) host.querySelectorAll('.phr-fill').forEach(el => el.style.transition = 'none');
  return host;
}

function scenarioText(ctx){
  let s = '';
  try { s = (typeof cityLabel === 'function' ? cityLabel(ctx.dest) : ctx.dest); } catch(e){ s = ctx.dest; }
  try { s += ' · ' + fmtDate(ctx.from) + ' – ' + fmtDate(ctx.to); } catch(e){}
  try { s += ' · ' + ctx.adults + ' ' + passengerLabel(Number(ctx.adults)); } catch(e){}
  try { const d = TIER_META[state.tier].desc; if (d) s += ' — ' + d; } catch(e){}
  return s;
}

function updateAgo(){
  const el = $('pmUpdated'); if (!el || !state.updatedAt) return;
  const sec = Math.max(0, Math.round((Date.now() - state.updatedAt) / 1000));
  el.textContent = sec < 10 ? tx('now') : sec < 60 ? tx('sec', {n:sec}) : tx('min', {n:Math.floor(sec / 60)});
}

function render(src, animate){
  const host = $(HOST_ID); if (!host || !src) return;
  const pkg = (src.pkgs.find(p => p.tier === state.tier)) || src.pkgs[0];
  if (!pkg) return;
  const vals = breakdown(pkg);
  const calc = percents(vals);
  const prev = state.prev;
  const list = $('pmList');
  const parts = [];

  $('pmEmpty').hidden = calc.total > 0;
  list.hidden = calc.total === 0;
  $('pmScn').textContent = scenarioText(src.ctx);

  ROWS.forEach(r => {
    const row = list.querySelector('[data-key="' + r.key + '"]');
    const v = vals[r.key];
    row.hidden = v === 0;
    if (v === 0) return;
    const p = calc.pct[r.key];
    row.querySelector('.phr-fill').style.width = Math.max(p, 1) + '%';
    row.querySelector('.phr-pct').textContent = p < 1 ? '<1%' : p + '%';
    row.querySelector('.phr-eur').textContent = '≈ ' + money(v);
    const dEl = row.querySelector('.phr-delta');
    const d = prev ? v - (prev[r.key] || 0) : 0;
    if (prev && d !== 0){
      dEl.textContent = (d > 0 ? '+' : '−') + money(Math.abs(d));
      dEl.className = 'phr-delta phr-delta--' + (d > 0 ? 'up' : 'down');
      dEl.hidden = false;
    } else { dEl.hidden = true; }
    parts.push(tr(r.label) + ' ' + (p < 1 ? '<1' : p) + '% ≈ ' + money(v));
  });
  list.setAttribute('aria-label', parts.join(', '));

  clearTimeout(state.deltaTimer);
  state.deltaTimer = setTimeout(() => host.querySelectorAll('.phr-delta').forEach(e => e.hidden = true), DELTA_VISIBLE_MS);
  state.prev = vals;
  state.updatedAt = Date.now();
  updateAgo();
}

/* Potpis ulaza — kad se promeni, grafikon se preračuna */
function signature(){
  const f = readForm();
  let cur = ''; try { cur = currentCurrency; } catch(e){}
  let b = ''; try { b = [builderState.flightPref, builderState.hotelStars, builderState.carPref, builderState.activityCount, builderState.airlineName, builderState.prioritizeRating, builderState.prioritizeLocation].join(','); } catch(e){}
  return [f.dest, f.origin, f.from, f.to, f.adults, cur, b, lang(), state.tier].join('#');
}

function refresh(force){
  const sig = signature();
  if (!force && sig === state.sig) return;
  const langChanged = state.lang !== lang();
  state.sig = sig;
  if (langChanged || !$(HOST_ID).firstChild){ state.lang = lang(); state.prev = null; buildShell(); }
  render(currentSource(), true);
}

let pendingSig = '';
function tick(){
  if (document.hidden) return;
  try {
    const sig = signature();
    if (sig !== state.sig){
      // preračunaj tek kad se ulaz nije menjao ~1 s (da kucanje ne "treperi" grafikon)
      if (sig === pendingSig) refresh(false); else pendingSig = sig;
    }
    updateAgo();
  } catch(e){ console.error('[price-mix]', e); }
}

function init(){
  if (!$(HOST_ID)) return;
  // Ako neka od globalnih funkcija iz app.js ne postoji, ne rušimo stranicu — sekcija ostaje prazna.
  if (typeof computePackagesLocally !== 'function' || typeof validateSearchInputs !== 'function') return;
  refresh(true);
  setInterval(tick, POLL_MS);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
