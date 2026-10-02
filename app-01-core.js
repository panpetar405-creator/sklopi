/* app-01-core.js — deo nekadašnjeg app.js (deo 1/11): Zaštita dugmeta "Nazad", i18n, pomoćnici za prevod.
   Klasična skripta: deli globalni opseg sa ostalim app-*.js fajlovima; redosled učitavanja u index.html je bitan. */
window.addEventListener('error', function(e){ document.title = 'GRESKA: ' + e.message + ' (' + String(e.filename||'').split('/').pop().split('?')[0] + ':' + e.lineno + ')'; }, {once:true});
(function(){
  const topbarWrap = document.querySelector('.topbar-wrap');
  if (!topbarWrap) return;
  function syncTopbarHeight(){
    document.documentElement.style.setProperty('--topbar-h', topbarWrap.offsetHeight + 'px');
  }
  syncTopbarHeight();
  window.addEventListener('resize', syncTopbarHeight);
  window.addEventListener('orientationchange', syncTopbarHeight);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncTopbarHeight);
})();
/* ==========================================================
   UNIVERZALNI GUARD ZA FIZIČKO/GEST "NAZAD" DUGME NA TELEFONU
   ----------------------------------------------------------
   Kad se otvori modal/sheet/kartica (kalendar, putnici, match kviz,
   deljenje, alert, dokumenta, start-prefs, rezultati, feature-guide...),
   stranica se tehnički ne menja — nema novog unosa u history. Zato
   "Nazad" dugme ne zna da treba da zatvori TAJ overlay i umesto toga
   izlazi sa celog sajta.
   Rešenje: pri otvaranju svakog overlay-a guramo prazan unos u
   history (guardOverlayOpen). "Nazad" prvo pop-uje TAJ unos — jedini
   popstate handler ispod ga hvata i zatvara najgornji otvoreni
   overlay (raw close funkcija, bez ponovnog diranja historije).
   Kad se overlay zatvara na neki drugi način (X dugme, klik na
   pozadinu, Escape, "Primeni"...), koristi se guardOverlayRequestClose
   — ona samo prosledi na history.back(), da postoji JEDAN jedini put
   kojim se overlay zatvara i history stek ostane čist.
========================================================== */
// Isključujemo automatsko vraćanje skrola koje sam browser radi na
// popstate. Bez ovoga, kad se overlay (npr. feature-guide "Putarine")
// zatvori preko "Nazad" i stigne popstate, browser NAJPRE sam skoči
// na skrol poziciju koju je zapamtio za taj unos u historiji (obično
// vrh strane — pozadina je za vreme overlay-a bila zaključana preko
// position:fixed trika, pa je "prava" scrollY vrednost dokumenta bila
// 0), a tek POSLE toga naš unlockResultsPageScroll()/closeFeatureGuideSheet()
// vrati skrol na stvarnu poziciju. Ta dva koraka daju vidljiv "trzaj":
// skrol prvo ode na vrh sajta pa se tek onda vrati na sekciju. Ručno
// upravljamo skrolom (lockResultsPageScroll/unlockResultsPageScroll i
// slično), pa browser-ovo automatsko vraćanje ovde samo smeta.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const _historyOverlays = []; // stek { id, close(rawCloseFn) }

function guardOverlayOpen(id, closeFn){
  // Ako je ovaj overlay (npr. kalendar) već otvoren i gurnut, ne guramo
  // duplo — samo ažuriramo close funkciju (može se promeniti po pozivu).
  const existing = _historyOverlays.find(o => o.id === id);
  if (existing){ existing.close = closeFn; return; }
  _historyOverlays.push({ id, close: closeFn });
  // history.pushState() se NAMERNO odlaže za sledeći tick (setTimeout 0),
  // ne poziva se direktno unutar click/touch handlera. Pozivanje
  // pushState() sinhrono, usred istog dodira koji je otvorio overlay,
  // je pravi uzrok bio zašto je na mobilnom trebalo dva tapa za SVAKU
  // narednu radnju (biranje datuma, brojač putnika, Nastavi...) — mobilni
  // WebKit/Chrome ume da "zaglavi" isporuku sledećeg klika kad se historija
  // menja usred obrade dodira. Odlaganjem za jedan tick, pushState se
  // izvršava tek KAD je browser završio sa obradom trenutnog tapa.
  setTimeout(() => {
    history.pushState({ overlayGuard: true, id }, '');
  }, 0);
}
// Vraća true ako je overlay bio gurnut u historiju (i time preuzima
// zatvaranje preko history.back() → popstate). Vraća false ako nije
// bio gurnut — u tom slučaju pozivač treba sam da zatvori overlay.
function guardOverlayRequestClose(id){
  const entry = _historyOverlays.find(o => o.id === id);
  if (!entry) return false;
  // NE skidamo overlay sa steka ovde — to radi ISKLJUČIVO popstate handler
  // ispod, kad back-navigacija stvarno stigne. history.back() je asinhron
  // (odložen i sam po sebi za jedan tick), pa ako overlay skinemo odmah,
  // popstate koji stigne kasnije ne nađe ništa na steku i nikad ne pozove
  // close() — otud je trebalo DVA klika da se overlay stvarno zatvori
  // (tek drugi klik, kad guard ne nađe overlay, sam direktno zove close()).
  // 'closing' flag samo sprečava da brzi uzastopni klikovi pokrenu više
  // history.back() poziva dok se prvi još ne obradi.
  if (entry.closing) return true;
  entry.closing = true;
  setTimeout(() => {
    history.back();
  }, 0);
  return true;
}
window.addEventListener('popstate', () => {
  const top = _historyOverlays.pop();
  if (top) top.close();
});
// Za slučajeve kad se overlay zatvori "sam od sebe" van normalnog toka
// (npr. rotacija ekrana/promena veličine prozora ugasi mobilni prikaz) —
// samo skida overlay sa steka, BEZ history.back(), da ne bismo nepotrebno
// vratili korisnika na prethodnu stranicu. Unos u historiji ostaje (biće
// tiho pokupljen sledećim "Nazad", bez efekta jer je stek već čist).
function guardOverlayDrop(id){
  const idx = _historyOverlays.findIndex(o => o.id === id);
  if (idx !== -1) _historyOverlays.splice(idx, 1);
}
// Za prelazak SA jednog guarded overlay-a DIREKTNO na drugi (npr. "Nastavi"
// unutar "Prilagodi svoj plan" ili match kviz -> rezultati): korisnik ide
// NAPRED, ne izlazi nazad, pa nema razloga da čekamo history.back()/popstate
// da zatvori stari overlay pre nego što se otvori novi. Kad bi se ovde
// pozvao guardOverlayRequestClose (back) pa odmah zatim guardOverlayOpen
// (push) za novi overlay, oba idu kroz odvojene setTimeout(0) pozive koji se
// mogu izvršiti PRE nego što browser stvarno završi back-navigaciju — novi
// overlay bi već bio na steku kad stigne popstate od starog zatvaranja, pa bi
// popstate handler pogrešno zatvorio NOVI overlay umesto starog (otud je novi
// ekran ostajao otvoren "iza" starog, koji se nikad stvarno nije zatvorio).
// Rešenje: zatvori stari overlay ODMAH, sinhrono (raw close, bez back()), i
// PREPIŠI postojeći history unos (replaceState) da sad predstavlja novi
// overlay — jedan unos u historiji i dalje odgovara jednom otvorenom
// overlay-u, bez ikakve back/push trke.
function guardOverlayReplace(oldId, newId, closeFn){
  const idx = _historyOverlays.findIndex(o => o.id === oldId);
  if (idx === -1) return;
  _historyOverlays[idx] = { id: newId, close: closeFn };
  history.replaceState({ overlayGuard: true, id: newId }, '');
}

/* ==========================================================
   I18N — jezici i prevodi
   ==========================================================
   Izvor istine je SAMO sr.json (srpski). Ostali jezici
   (en.json, ru.json, ...) nastaju skriptom:
       node translate.mjs        (vidi PREVODI.md)
   koja i generiše i18n-data.js — taj fajl definiše I18N i I18N_LANGS
   i mora biti učitan PRE app.js. Ovde se ne piše nijedan prevod.

   Princip: statički tekst u HTML-u se prevodi preko data-i18n /
   data-i18n-html / data-i18n-placeholder / data-i18n-aria-label
   atributa i primenjuje se applyStaticI18n() funkcijom ispod.
   Za tekst koji JS generiše (rezultati, builder, poruke), koristi
   se t('kljuc') / tf('kljuc', {ime: vrednost}).
   NAPOMENA: pravne stranice (privatnost/uslovi/kolačići) i stranica
   za deljenje (zajedno.html) NISU obuhvaćene — ostaju na srpskom.
========================================================== */
function hasLang(code){ return Object.prototype.hasOwnProperty.call(I18N, code); }
// Redosled: ?lang= iz URL-a (da Google/deljeni linkovi mogu da otvore
// konkretnu jezičku verziju) > localStorage (pamćenje izbora) > sr.
function getLang(){
  try {
    const urlLang = new URLSearchParams(location.search).get('lang');
    if (urlLang && hasLang(urlLang)) return urlLang;
  } catch(e){}
  try {
    const saved = localStorage.getItem('sklopi_lang');
    if (saved && hasLang(saved)) return saved;
  } catch(e){}
  return 'sr';
}
// og:locale po jeziku (Facebook/WhatsApp format sa donjom crtom).
const OG_LOCALE = { sr: 'sr_RS', en: 'en_GB', ru: 'ru_RU', de: 'de_DE' };
// Ažurira canonical/og:url/og:locale da odgovaraju TRENUTNOM jeziku.
// hreflang <link> tagovi ostaju statični u <head> (isti za sve jezike —
// nabrajaju sve verzije), ovde se menja samo "koja je ovo verzija".
function updateLangSEOTags(lang){
  try {
    const base = location.origin + location.pathname;
    const url = (lang === 'sr') ? base : (base + '?lang=' + lang);
    const canon = document.querySelector('link[rel="canonical"]');
    if (canon) canon.setAttribute('href', url);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', url);
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute('content', OG_LOCALE[lang] || OG_LOCALE.sr);
  } catch(e){}
}
// Metapodaci jezika iz languages.json (code, short, name, locale, dateMonth).
function langMeta(code){
  code = code || getLang();
  return I18N_LANGS.find(l => l.code === code) || I18N_LANGS[0];
}
/* ==========================================================
   DEV-ONLY PROVERA PREVODA (isti duh kao assertFlightSubConsistency):
   u dev okruženju (localhost ili ?debug) konzola odmah prijavi
     1) ključ koji postoji u jednom jeziku a fali u drugom (svi jezici iz languages.json),
     2) prazan prevod,
     3) različit skup {placeholder}-a između jezika (npr. {n} fali u ru),
     4) t('kljuc') sa ključem koji uopšte ne postoji u I18N.sr,
     5) t('kljuc') koji u en/ru pada nazad na srpski (nedostaje prevod).
   Ne menja ponašanje — t() vraća isto što i ranije. U produkciji je
   isključena. Ne hvata stringove pisane direktno u kodu (van t/tf) —
   to i dalje ostaje na pravilu pri pisanju koda.
========================================================== */
const _I18N_DEV = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /(^|[?&])debug(=1)?(&|$)/.test(location.search);
const _i18nWarned = new Set();
function _i18nWarn(id, msg){
  if (_i18nWarned.has(id)) return;
  _i18nWarned.add(id);
  console.warn('[sklopi][i18n] ' + msg);
}
function t(key){
  const lang = getLang();
  const own = I18N[lang] && I18N[lang][key];
  if (_I18N_DEV && (own === undefined || own === null)){
    if (I18N.sr[key] === undefined) _i18nWarn('unknown|' + key, 'nepoznat ključ t("' + key + '") — ne postoji ni u sr.');
    else if (lang !== 'sr') _i18nWarn(lang + '|' + key, 'nedostaje ' + lang.toUpperCase() + ' prevod za "' + key + '" — prikazuje se srpski.');
  }
  return own ?? ((lang !== 'sr' && I18N.en && I18N.en[key]) ?? I18N.sr[key] ?? key);  // nedostaje prevod → prvo engleski, pa srpski
}
function checkI18nCompleteness(){
  if (!_I18N_DEV) return;
  const langs = I18N_LANGS.map(l => l.code);
  const all = new Set();
  langs.forEach(l => Object.keys(I18N[l] || {}).forEach(k => all.add(k)));
  const ph = v => (String(v).match(/\{\w+\}/g) || []).sort().join(',');
  let problems = 0;
  all.forEach(k => {
    const missing = langs.filter(l => !(I18N[l] && k in I18N[l]));
    if (missing.length){ problems++; _i18nWarn('miss|' + k, 'ključ "' + k + '" nedostaje u: ' + missing.join(', ')); return; }
    langs.forEach(l => {
      if (String(I18N[l][k]).trim() === ''){ problems++; _i18nWarn('empty|' + l + '|' + k, 'prazan prevod: ' + l + '.' + k); }
    });
    const base = ph(I18N.sr[k]);
    langs.slice(1).forEach(l => {
      if (ph(I18N[l][k]) !== base){
        problems++;
        _i18nWarn('ph|' + l + '|' + k, 'placeholderi se razlikuju u "' + k + '": sr={' + base + '} ' + l + '={' + ph(I18N[l][k]) + '}');
      }
    });
  });
  if (!problems) console.log('[sklopi][i18n] svi ključevi (' + all.size + ') postoje u ' + langs.join('/') + ', bez praznih prevoda i neusklađenih placeholdera.');
  else console.warn('[sklopi][i18n] ukupno ' + problems + ' problema u prevodima (vidi gore).');
}
checkI18nCompleteness();
/* ==========================================================
   PREVOD DINAMIČKIH STRINGOVA — pomoćnici
   ==========================================================
   tf('kljuc', {n:3})  — t() + zamena {placeholder}-a.
   pluralForm / nightsLabel / daysLabel / roomsLabel / activitiesLabel
       — množina za sr (1 / 2-4 / 5+), en (1 / ostalo) i ru (1 / 2-4 / 5+).
   cityLabel / countryLabel — prevod naziva gradova i država koje
       aplikacija drži na srpskom (aerodromi iz AIRPORT_DB, kartice
       "Pronađi svoj izlet"). Nepoznat naziv (npr. ono što je korisnik
       sam ukucao) ostaje nepromenjen — nikad se ne nagađa.
   VAŽNO: vrednost u poljima Polazak/Destinacija ostaje na srpskom
   (airportInfoFor/iataFor/isKnownDestination rade nad srpskim
   nazivima); ovde se prevodi samo PRIKAZ.
========================================================== */
function tf(key, vars){
  return t(key).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined) ? vars[k] : m);
}
// Množina: 'plural.<ime>' u *.json je niz oblika odvojenih sa '|', redosledom
// CLDR kategorija tog jezika (Intl.PluralRules): sr: one|few|other, en: one|other,
// ru: one|few|many|other. Novi jezik dobija tačan broj oblika od skripte za prevod.
const _PLURAL_ORDER = ['zero','one','two','few','many','other'];
const _pluralCache = {};
function _pluralInfo(lang){
  if (!_pluralCache[lang]){
    let pr;
    try { pr = new Intl.PluralRules(lang); } catch(e){ pr = new Intl.PluralRules('en'); }
    const cats = pr.resolvedOptions().pluralCategories.slice()
      .sort((a, b) => _PLURAL_ORDER.indexOf(a) - _PLURAL_ORDER.indexOf(b));
    _pluralCache[lang] = {pr, cats};
  }
  return _pluralCache[lang];
}
function pluralWord(name, n){
  n = Math.abs(Math.round(Number(n)) || 0);
  const forms = t('plural.' + name).split('|');
  const info = _pluralInfo(getLang());
  let i = info.cats.indexOf(info.pr.select(n));
  if (i < 0 || i >= forms.length) i = forms.length - 1;
  return forms[i];
}
function nightsLabel(n){ return n + ' ' + pluralWord('night', n); }
function daysLabel(n){ return n + ' ' + pluralWord('day', n); }
function roomsLabel(n){ return n + ' ' + pluralWord('room', n); }
function activitiesLabel(n){ return n + ' ' + pluralWord('activity', n); }

/* Nazivi gradova i država: u *.json pod ključevima 'city.<srpski naziv>' i
   'country.<srpski naziv>'. Poređenje ide preko normalizeSr (bez dijakritika).
   Nepoznat naziv (npr. ono što je korisnik sam ukucao) ostaje nepromenjen. */
const _placeCache = {};
function _placeTable(prefix){
  const lang = getLang(), ck = prefix + lang;
  if (!_placeCache[ck]){
    const o = {}, dict = I18N[lang] || {};
    Object.keys(dict).forEach(k => {
      if (k.indexOf(prefix) === 0) o[normalizeSr(k.slice(prefix.length))] = dict[k];
    });
    _placeCache[ck] = o;
  }
  return _placeCache[ck];
}
function cityLabel(name){
  if (getLang() === 'sr' || name == null) return name;
  const raw = String(name).trim();
  if (!raw) return name;
  return _placeTable('city.')[normalizeSr(raw)] || name;
}
function countryLabel(name){
  if (getLang() === 'sr' || name == null) return name;
  return _placeTable('country.')[normalizeSr(String(name).trim())] || name;
}
// "🧭 Prag" (statistika "poslednja destinacija" čuva i emoji prefiks) — prevodi samo naziv grada.
function cityLabelWithPrefix(s){
  if (s == null) return s;
  const m = /^(\p{Extended_Pictographic}\uFE0F?\s+)(.+)$/u.exec(String(s));
  return m ? m[1] + cityLabel(m[2]) : cityLabel(s);
}
// '1h30' / '40 min' / '2h' (format iz AIRPORT_DB) → '1 h 30 min' / '1 ч 30 мин'
function driveTimeLabel(tStr){
  if (getLang() === 'sr') return tStr;
  const m = /^(?:(\d+)h(\d+)?)?(?:(\d+) min)?$/.exec(String(tStr || '').trim());
  if (!m) return tStr;
  const hh = m[1], mm = m[2] || m[3];
  return [hh ? hh + ' ' + t('unit_h') : '', mm ? mm + ' ' + t('unit_min') : ''].filter(Boolean).join(' ');
}

// Prekidač jezika se gradi iz I18N_LANGS (nema ručnog spiska SR/EN/RU u HTML-u).
function renderLangSwitch(lang){
  const btn = document.getElementById('langSwitchBtn');
  if (!btn) return;
  const meta = langMeta(lang);
  const GLOBE = '<svg class="ld-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z"/></svg>';
  const CHEV = '<svg class="ld-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  const CHECK = '<svg class="lo-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  let menu = document.getElementById('langMenu');
  if (!btn.dataset.built){
    btn.dataset.built = '1';
    btn.classList.add('lang-dd-btn');
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'langMenu');
    const wrap = document.createElement('span');
    wrap.className = 'lang-dd';
    btn.parentNode.insertBefore(wrap, btn);
    wrap.appendChild(btn);
    menu = document.createElement('ul');
    menu.id = 'langMenu'; menu.className = 'lang-menu'; menu.hidden = true;
    menu.setAttribute('role', 'listbox');
    wrap.appendChild(menu);
    const close = (focusBtn) => {
      if (menu.hidden) return;
      menu.hidden = true; btn.setAttribute('aria-expanded', 'false');
      if (focusBtn) btn.focus();
    };
    const open = () => {
      menu.hidden = false; btn.setAttribute('aria-expanded', 'true');
      const cur = menu.querySelector('.is-active') || menu.querySelector('.lang-opt');
      if (cur) cur.focus();
    };
    btn.addEventListener('click', (e) => { e.stopPropagation(); menu.hidden ? open() : close(false); });
    menu.addEventListener('click', (e) => {
      const li = e.target.closest('[data-l]');
      if (!li) return;
      close(true); setLang(li.getAttribute('data-l'));
    });
    menu.addEventListener('keydown', (e) => {
      const items = Array.prototype.slice.call(menu.querySelectorAll('.lang-opt'));
      const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown'){ e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp'){ e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); if (i >= 0) items[i].click(); }
      else if (e.key === 'Tab'){ close(false); }
    });
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) close(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(true); });
  }
  btn.setAttribute('data-lang', lang);
  btn.innerHTML = GLOBE + '<span class="ld-code">' + meta.short + '</span>' + CHEV;
  menu.innerHTML = I18N_LANGS.map(l =>
    '<li class="lang-opt' + (l.code === lang ? ' is-active' : '') + '" role="option" tabindex="0" data-l="' + l.code +
    '" aria-selected="' + (l.code === lang ? 'true' : 'false') + '"><span class="lo-code">' + l.short +
    '</span><span class="lo-name">' + (l.name || l.short) + '</span>' + CHECK + '</li>').join('');
}
function applyStaticI18n(){
  const lang = getLang();
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label'))); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.setAttribute('title', t(el.getAttribute('data-i18n-title'))); });
  document.querySelectorAll('[data-i18n-alt]').forEach(el => { el.setAttribute('alt', t(el.getAttribute('data-i18n-alt'))); });
  document.querySelectorAll('[data-aff-disclosure]').forEach(el => { el.textContent = affDisc(); });
  renderLangSwitch(lang);
  const authDd = document.getElementById('authDropdown');
  if (authDd) authDd.setAttribute('data-title', t('aria_account'));
  const titleEl = document.querySelector('title');
  if (titleEl) titleEl.textContent = t('meta_title');
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', t('meta_description'));
  updateLangSEOTags(lang);
}
function setLang(lang){
  const l = hasLang(lang) ? lang : 'sr';
  localStorage.setItem('sklopi_lang', l);
  // Upiši izbor i u URL (bez reload-a) — tako link postaje deljiv i
  // Google indeksira konkretnu jezičku verziju umesto samo srpske.
  try {
    const url = new URL(location.href);
    if (l === 'sr') url.searchParams.delete('lang');
    else url.searchParams.set('lang', l);
    history.replaceState(history.state, '', url.toString());
  } catch(e){}
  applyStaticI18n();
  updateLangSEOTags(l);
  // Ponovo iscrtaj dinamički generisan sadržaj (rezultati/builder/auth/saved)
  // u novom jeziku, ako trenutno postoji na strani.
  if (typeof window.onLangChange === 'function') window.onLangChange(lang);
}


function seededRandom(seed){
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function(){
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
function hashSeed(str){
  let h = 0;
  for (let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) | 0; }
  return Math.abs(h) || 1;
}
/* Deterministička "dnevna" rotacija: isti izbor za sve posetioce istog dana
   (na osnovu UTC datuma + salt), promeni se sledeći dan. Koristi isti
   seededRandom/hashSeed par kao i marketFactor iznad — namerno, radi
   doslednosti i da ne uvodimo drugi RNG algoritam u fajl. */
function dailyShuffle(arr, salt){
  const rand = seededRandom(hashSeed(String(salt) + '|' + todayStr()));
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function dailyPick(arr, count, salt){
  return dailyShuffle(arr, salt).slice(0, Math.min(count, arr.length));
}
