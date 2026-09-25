window.addEventListener('error', function(e){ document.title = 'GRESKA: ' + e.message + ' (linija ' + e.lineno + ')'; }, {once:true});
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
function getLang(){
  try {
    const saved = localStorage.getItem('sklopi_lang');
    if (saved && hasLang(saved)) return saved;
  } catch(e){}
  return 'sr';
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
}
function setLang(lang){
  localStorage.setItem('sklopi_lang', hasLang(lang) ? lang : 'sr');
  applyStaticI18n();
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
/* ==========================================================
   DNEVNA FLUKTUACIJA CENE ("tržišni faktor")
   Ranije je ilustrativna cena bila FIKSNA funkcija (grad+noći+putnici) —
   nikad se nije menjala tokom vremena, pa "Javi mi kad padne cena" nije
   fizički mogao nikad da se ispuni. Ovaj faktor dodaje determinističku
   ali dnevno promenljivu varijaciju (±12%), istu za sve koji tog dana
   gledaju isti grad, nezavisnu od glavnog rng niza (ne pomera redosled
   ostalih random poziva). Isti algoritam se koristi i na serveru
   (Supabase Edge Function) da bi se alert mogao stvarno proveravati.
========================================================== */
function marketFactor(dest, dateStr){
  const f = seededRandom(hashSeed('mkt|' + dest.toLowerCase() + '|' + dateStr));
  return 0.88 + f() * 0.24;
}

/* Sezonski množilac po DATUMU POLASKA (ne po današnjem datumu, kao
   marketFactor koji je dnevna fluktuacija). Za destinacije iz
   MATCH_DESTINATIONS koristi njihove već označene najbolje mesece
   (months) i tip (vibes): u sezoni 1.0, morske destinacije u julu/avgustu
   1.22 i u junu/septembru 1.08, mesec do sezone 0.92, van sezone 0.82
   (ne-morske se mešaju 50/50 sa opštom krivom, vidi dole).
   Ostale destinacije dobijaju opštu evropsku krivu. Novogodišnji period
   (20. dec – 3. jan) dodaje 15%. Primenjuje se na let, smeštaj i auto —
   ne na gorivo/putarine/dodatke. NE zove rng(). Prazan/neispravan
   datum → 1 (staro ponašanje). */
const GENERIC_SEASON_BY_MONTH = [0.88,0.86,0.90,0.97,1.00,1.08,1.20,1.22,1.05,0.97,0.88,0.95];
function seasonFactor(destRaw, fromStr){
  const m = Number(String(fromStr || '').slice(5, 7));
  const d = Number(String(fromStr || '').slice(8, 10)) || 1;
  if (!(m >= 1 && m <= 12)) return 1;
  const key = normalizeSr(String(destRaw || '').split(',')[0].trim());
  const tag = (typeof MATCH_DESTINATIONS !== 'undefined')
    ? MATCH_DESTINATIONS.find(x => normalizeSr(x.name) === key) : null;
  let f;
  if (tag){
    const prev = m === 1 ? 12 : m - 1, next = m === 12 ? 1 : m + 1;
    const sea = tag.vibes.includes('sea');
    if (tag.months.includes(m)) f = sea && (m === 7 || m === 8) ? 1.22 : sea && (m === 6 || m === 9) ? 1.08 : 1.0;
    else if (tag.months.includes(prev) || tag.months.includes(next)) f = 0.92;
    else f = 0.82;
    // "months" je najbolja sezona po vremenu/doživljaju, a ne po potražnji:
    // gradovi (i sve što nije morsko) imaju cene leta koje ipak rastu leti
    // i oko praznika. Zato za ne-morske destinacije mešamo tag sa opštom
    // krivom (50/50), a čisto tagovanje važi samo za morske.
    if (!sea) f = 0.5 * f + 0.5 * GENERIC_SEASON_BY_MONTH[m - 1];
  } else {
    f = GENERIC_SEASON_BY_MONTH[m - 1];
  }
  if ((m === 12 && d >= 20) || (m === 1 && d <= 3)) f *= 1.15;
  return Math.round(f * 100) / 100;
}
function todayStr(){
  return new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
}
function nightsBetween(a,b){
  const ms = new Date(b) - new Date(a);
  return Math.max(1, Math.round(ms / 86400000));
}
function fmtDate(iso){
  const d = new Date(iso);
  const lang = getLang();
  if (lang === 'sr') return d.getDate() + '. ' + d.toLocaleString('sr-Latn', {month:'long'});
  const m = langMeta(lang);
  return d.toLocaleString(m.locale, {day:'numeric', month: m.dateMonth || 'long'});
}
function passengerLabel(adults){
  const n = String(adults);
  return n === '1' ? t('passenger') : t('passengers');
}

/* ---- Kalendar za izbor datuma u "ticket" pretrazi (stub "Od — Do") ---- */
// Open-Meteo geokodiranje ne sortira rezultate po značaju grada, pa "Milano"
// ume da vrati malo selo u Peruu pre Milana u Italiji. Ovde biramo najbolje
// poklapanje: prvo tačan naziv (case-insensitive), pa najveći broj stanovnika,
// pa gradove/prestonice (feature_code) pre manjih naselja.
// (globalna funkcija — koriste je i vremenska prognoza (wx.geocode) i predlozi
// gradova u poljima Polazak/Destinacija (fetchLocationSuggestions), pa mora
// biti van svih IIFE-ova da bi bila vidljiva na oba mesta.)
function rankLocationMatches(results, query){
  const q = query.trim().toLowerCase();
  const featureRank = {PPLC:0, PPLA:1, PPLA2:2, PPL:3}; // prestonica > regionalni centar > selo
  const scored = results.map(r => {
    const exact = r.name.trim().toLowerCase() === q ? 0 : 1;
    const feat = featureRank[r.feature_code] ?? 4;
    const pop = r.population || 0;
    return {r, exact, feat, pop};
  });
  scored.sort((a, b) => {
    if (a.exact !== b.exact) return a.exact - b.exact;
    if (a.feat !== b.feat) return a.feat - b.feat;
    return b.pop - a.pop; // veći grad prvo
  });
  return scored.map(s => s.r);
}
function pickBestLocationMatch(results, query){
  return rankLocationMatches(results, query)[0];
}

(function(){
  const displayBtn = document.getElementById('dateDisplayBtn');
  const rangeText = document.getElementById('dateDisplayText');
  const nightsText = document.getElementById('dateNightsText');
  const hiddenFrom = document.getElementById('dateFrom');
  const hiddenTo = document.getElementById('dateTo');
  const calCard = document.getElementById('calCard');
  const calBackdrop = document.getElementById('calBackdrop');
  const calMonths = document.getElementById('calMonths');
  const calGrids = document.getElementById('calGrids');
  const calRangeLabel = document.getElementById('calRangeLabel');
  const prevBtn = document.getElementById('calPrev');
  const nextBtn = document.getElementById('calNext');
  const applyBtn = document.getElementById('calApply');
  if (!displayBtn || !calCard) return;

  const DAY_NAMES = ['Pon','Uto','Sre','Čet','Pet','Sub','Ned'];
  const today = new Date(); today.setHours(0,0,0,0);

  // Podrazumevani datumi su RELATIVNI na današnji dan (polazak za 14 dana,
  // 4 noći) — ranije su u HTML-u bili tvrdo zadati (2026-10-01/05), pa bi
  // posle tog datuma svaka nova pretraga tražila ručni izbor datuma.
  // Polja su skrivena i pri svakom učitavanju kreću iz HTML default-a, pa
  // ovde uvek postavljamo svež default (izbor korisnika se čuva tek posle
  // učitavanja — kalendar i učitavanje sačuvanog izleta ih posle menjaju).
  (function setRelativeDefaultDates(){
    const isoLocal = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 18);
    hiddenFrom.value = isoLocal(start);
    hiddenTo.value = isoLocal(end);
  })();

  function parseISODate(iso){
    const [y,m,d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function toISODate(d){
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function fmtShort(d){
    return d.getDate() + '. ' + d.toLocaleString('sr-Latn', {month:'short'}).replace('.', '');
  }
  // Pun, čitljiv opis datuma za screen reader (aria-label na svakom danu) —
  // npr. "17. oktobar 2026, subota".
  function fmtFullLabel(d){
    const s = d.toLocaleString('sr-Latn', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function sameDay(a,b){ return !!a && !!b && a.getTime() === b.getTime(); }
  function nightsCount(a,b){ return Math.max(1, Math.round((b - a) / 86400000)); }
  function nightsWord(n){ return n === 1 ? t('night') : t('nights'); }

  let selStart = parseISODate(hiddenFrom.value);
  let selEnd = parseISODate(hiddenTo.value);
  let viewYear = selStart.getFullYear();
  let viewMonth = selStart.getMonth();

  /* ---- Vremenska prognoza po danima (Open-Meteo — javno dostupan, besplatan API) ----
     Prava prognoza postoji samo za ~16 dana unapred. Za datume dalje u budućnosti
     ne postoji "tačna" prognoza kod nikog — zato se za njih prikazuje PROCENA na
     osnovu istog perioda prošle godine (arhivski podaci), vizuelno zamućena ikonica,
     da se ne stvori lažan utisak preciznosti. */
  const WMO_ICON = {
    0:'☀️',1:'🌤️',2:'⛅',3:'☁️',
    45:'🌫️',48:'🌫️',
    51:'🌦️',53:'🌦️',55:'🌦️',
    56:'🌧️',57:'🌧️',
    61:'🌧️',63:'🌧️',65:'🌧️',
    66:'🌧️',67:'🌧️',
    71:'🌨️',73:'🌨️',75:'❄️',77:'❄️',
    80:'🌦️',81:'🌧️',82:'⛈️',
    85:'🌨️',86:'🌨️',
    95:'⛈️',96:'⛈️',99:'⛈️'
  };
  function wxIcon(code){ return WMO_ICON[code] || ''; }

  const wx = {
    geoCache: {},
    forecastCache: {}, // key: "lat,lon" -> {iso: {code,tmax,tmin}}
    climateCache: {},  // key: "lat,lon|minISO|maxISO" -> {iso: {code,tmax,tmin}}
    async geocode(city){
      const key = city.trim().toLowerCase();
      if (!key) return {geo:null, networkError:false};
      if (this.geoCache[key]) return {geo:this.geoCache[key], networkError:false};
      // Neki srpski egzonimi (npr. "Skoplje") ne postoje u Open-Meteo geo bazi —
      // ona grad vodi pod međunarodnim nazivom ("Skopje"), pa bi upit sa srpskim
      // nazivom vratio 0 rezultata i prognoza se ne bi prikazala. Zato prvo
      // probamo prevod iz DEST_EN_NAMES (ista tabela koja se koristi za Viator
      // pretragu), pa tek onda izvorni upisani naziv kao rezervu.
      const rawCity = city.trim().split(',')[0].trim();
      const enName = (typeof DEST_EN_NAMES !== 'undefined' && DEST_EN_NAMES[rawCity]) || null;
      const queries = [];
      const addQuery = (q) => { if (q && !queries.some(x => x.toLowerCase() === q.toLowerCase())) queries.push(q); };
      addQuery(enName);
      addQuery(city);
      // Jezera, planine, nacionalni parkovi i slična turistička mesta (npr.
      // "Skadarsko jezero", "Durmitor", "Plitvička jezera") nisu naseljena
      // mesta i Open-Meteo ih ne vodi u geo bazi — koristimo AIRPORT_DB
      // (ista tabela kao za "najbliži aerodrom") da nađemo najbliži poznat
      // grad i njegovu prognozu prikažemo kao okvirnu.
      if (typeof airportInfoFor === 'function'){
        const info = airportInfoFor(rawCity);
        if (info && !info.hasAirport && info.nearest){
          addQuery((typeof DEST_EN_NAMES !== 'undefined' && DEST_EN_NAMES[info.nearest]) || info.nearest);
        }
      }
      const attempts = [];
      queries.forEach(q => {
        attempts.push(
          {q, url:'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=10&language=sr&format=json'},
          {q, url:'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=10&language=en&format=json'},
          {q, url:'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=10&format=json'}
        );
      });
      let networkError = false;
      for (const {q, url} of attempts){
        try{
          const res = await fetch(url);
          if (!res.ok){ networkError = true; continue; }
          const data = await res.json();
          if (data && data.results && data.results.length){
            const r = pickBestLocationMatch(data.results, q);
            const geo = {lat: Math.round(r.latitude*100)/100, lon: Math.round(r.longitude*100)/100};
            this.geoCache[key] = geo;
            return {geo, networkError:false};
          }
        } catch(err){
          networkError = true;
          console.warn('[sklopi] geokodiranje odredišta nije uspelo:', err.message);
        }
      }
      return {geo:null, networkError};
    },
    async getForecast(geo){
      const key = geo.lat + ',' + geo.lon;
      if (this.forecastCache[key]) return {data:this.forecastCache[key], networkError:false};
      try{
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + geo.lat + '&longitude=' + geo.lon + '&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=16');
        if (!res.ok) return {data:{}, networkError:true};
        const data = await res.json();
        const out = {};
        if (data && data.daily){
          data.daily.time.forEach((iso, i) => {
            out[iso] = {code: data.daily.weathercode[i], tmax: Math.round(data.daily.temperature_2m_max[i]), tmin: Math.round(data.daily.temperature_2m_min[i])};
          });
        }
        this.forecastCache[key] = out;
        return {data:out, networkError:false};
      } catch(err){ console.warn('[sklopi] prognoza nije uspela:', err.message); return {data:{}, networkError:true}; }
    },
    async getClimateRange(geo, minISO, maxISO){
      const key = geo.lat + ',' + geo.lon + '|' + minISO + '|' + maxISO;
      if (this.climateCache[key]) return {data:this.climateCache[key], networkError:false};
      // ista opsega dana, samo godinu unazad — kao osnova za procenu
      const shiftYear = (iso, delta) => { const d = parseISODate(iso); d.setFullYear(d.getFullYear() + delta); return d; };
      const startLastYear = shiftYear(minISO, -1);
      const endLastYear = shiftYear(maxISO, -1);
      const out = {};
      try{
        const res = await fetch('https://archive-api.open-meteo.com/v1/archive?latitude=' + geo.lat + '&longitude=' + geo.lon +
          '&start_date=' + toISODate(startLastYear) + '&end_date=' + toISODate(endLastYear) +
          '&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto');
        if (!res.ok) return {data:{}, networkError:true};
        const data = await res.json();
        if (data && data.daily){
          data.daily.time.forEach((lastYearISO, i) => {
            const d = parseISODate(lastYearISO); d.setFullYear(d.getFullYear() + 1);
            out[toISODate(d)] = {code: data.daily.weathercode[i], tmax: Math.round(data.daily.temperature_2m_max[i]), tmin: Math.round(data.daily.temperature_2m_min[i])};
          });
        }
        this.climateCache[key] = out;
        return {data:out, networkError:false};
      } catch(err){
        console.warn('[sklopi] istorijski podaci nisu uspeli:', err.message);
        return {data:out, networkError:true};
      }
    }
  };

  let wxRequestSeq = 0;
  async function paintWeather(){
    const cells = Array.from(calGrids.querySelectorAll('.cal-day[data-date]:not(.is-disabled)'));
    if (!cells.length) return;
    const destInput = document.getElementById('dest');
    const city = (destInput && destInput.value.trim()) || 'Atina';
    const statusEl = document.getElementById('calWxStatus');
    const setStatus = (msg) => { if (statusEl){ statusEl.textContent = msg; statusEl.style.display = msg ? 'block' : 'none'; } };

    const mySeq = ++wxRequestSeq;
    // odmah skini stare ikonice (mogu biti od prethodne destinacije) da ne ostane pogrešan utisak
    cells.forEach(cell => cell.querySelectorAll('.cal-wx').forEach(n => n.remove()));
    setStatus(tf('weather_looking', {city: city}));

    const {geo, networkError: geoErr} = await wx.geocode(city);
    if (mySeq !== wxRequestSeq) return; // korisnik je u međuvremenu promenio destinaciju — ovaj odgovor je zastareo
    if (!geo){
      setStatus(geoErr
        ? 'Prognoza trenutno nije dostupna — zahtev ka mreži nije uspeo (provera internet konekcije ili pristupa mreži u ovom pregledaču).'
        : 'Nije pronađena lokacija za „' + city + '” — provera pravopisa naziva mesta.');
      return;
    }

    const isoList = cells.map(c => c.dataset.date).sort();
    const minISO = isoList[0], maxISO = isoList[isoList.length - 1];

    const [fRes, cRes] = await Promise.all([
      wx.getForecast(geo),
      wx.getClimateRange(geo, minISO, maxISO)
    ]);
    if (mySeq !== wxRequestSeq) return; // isto — zastareo odgovor, ne crtati preko novijeg stanja
    const forecast = fRes.data, climate = cRes.data;

    let painted = 0;
    cells.forEach(cell => {
      cell.querySelectorAll('.cal-wx').forEach(n => n.remove());
      const iso = cell.dataset.date;
      let rec = forecast[iso];
      let exact = true;
      if (!rec){ rec = climate[iso]; exact = false; }
      if (!rec) return;
      const icon = wxIcon(rec.code);
      if (!icon) return;
      const span = document.createElement('span');
      span.className = 'cal-wx' + (exact ? '' : ' cal-wx-est');
      span.textContent = icon;
      span.title = (exact ? 'Prognoza za ' : 'Procena za ') + iso + ': ' + rec.tmax + '°/' + rec.tmin + '°C' + (exact ? '' : ' (na osnovu iste nedelje prošle godine)');
      cell.appendChild(span);
      painted++;
    });

    if (!painted){
      setStatus((fRes.networkError || cRes.networkError)
        ? 'Prognoza trenutno nije dostupna — zahtev ka mreži nije uspeo (provera internet konekcije ili pristupa mreži u ovom pregledaču).'
        : 'Nema podataka o vremenu za ove datume.');
    } else {
      setStatus('');
    }
  }

  function updateDisplay(){
    const n = nightsCount(selStart, selEnd);
    rangeText.textContent = fmtShort(selStart) + ' – ' + fmtShort(selEnd);
    nightsText.textContent = n + ' ' + nightsWord(n);
    displayBtn.classList.remove('is-empty');
    calRangeLabel.innerHTML = fmtShort(selStart) + ' – ' + fmtShort(selEnd) + ' <b>· ' + n + ' ' + nightsWord(n) + '</b>';
  }

  function commit(){
    hiddenFrom.value = toISODate(selStart);
    hiddenTo.value = toISODate(selEnd);
    hiddenFrom.dispatchEvent(new Event('change', {bubbles:true}));
    hiddenTo.dispatchEvent(new Event('change', {bubbles:true}));
    updateDisplay();
  }

  // Izloženo van IIFE-a — kad neko SPOLJA upiše prave datume direktno u
  // #dateFrom/#dateTo (učitavanje sačuvanog izleta, "Pogledaj detalje"),
  // stub mora da izgubi "is-empty" i pokaže te datume, isti obrazac kao
  // window.syncPaxDisplay za broj putnika. Bez ovoga validacija (koja sad
  // proverava baš tu "is-empty" klasu, ne samo sirovu vrednost polja —
  // videti validateSearchInputs) ne bi prepoznala datume kao izabrane.
  window.syncDateDisplay = function(){
    selStart = parseISODate(hiddenFrom.value);
    selEnd = parseISODate(hiddenTo.value);
    viewYear = selStart.getFullYear();
    viewMonth = selStart.getMonth();
    updateDisplay();
  };

  function buildMonthGrid(year, month, monthLabelText){
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // ponedeljak = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const head = '<div class="cal-grid-head" role="row">' +
      DAY_NAMES.map(d => '<span role="columnheader" aria-hidden="true">' + d + '</span>').join('') +
      '</div>';

    // Skupi sve ćelije (prazan razmak + dani), pa ih iseci na nedelje od po 7
    // radi role="row" (potrebno za role="grid" navigaciju strelicama / SR).
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push('<span class="cal-day is-empty" role="gridcell" aria-hidden="true"></span>');
    for (let day = 1; day <= daysInMonth; day++){
      const d = new Date(year, month, day);
      const iso = toISODate(d);
      const isDisabled = d < today;
      const isToday = sameDay(d, today);
      const isSelected = sameDay(d, selStart) || sameDay(d, selEnd) || (selStart && selEnd && d > selStart && d < selEnd);
      const classes = ['cal-day'];
      if (isDisabled) classes.push('is-disabled');
      if (sameDay(d, selStart)) classes.push('range-start');
      if (sameDay(d, selEnd)) classes.push('range-end');
      if (selStart && selEnd && d > selStart && d < selEnd) classes.push('range-mid');
      if (isToday) classes.push('is-today');
      const label = fmtFullLabel(d) + (isToday ? ', ' + t('aria_today') : '');
      if (isDisabled){
        // Prošli datum — nije klikabilan, pa ostaje neinteraktivan span,
        // ali i dalje sa aria-label/aria-disabled radi screen readera.
        cells.push('<span class="' + classes.join(' ') + '" role="gridcell" aria-disabled="true" aria-label="' + escapeHtml(label) + '">' + day + '</span>');
      } else {
        cells.push('<button type="button" class="' + classes.join(' ') + '" role="gridcell" data-date="' + iso + '" tabindex="-1" aria-selected="' + (isSelected ? 'true' : 'false') + '"' + (isToday ? ' aria-current="date"' : '') + ' aria-label="' + escapeHtml(label) + '">' + day + '</button>');
      }
    }
    while (cells.length % 7 !== 0) cells.push('<span class="cal-day is-empty" role="gridcell" aria-hidden="true"></span>');

    let body = '';
    for (let i = 0; i < cells.length; i += 7){
      body += '<div class="cal-grid-row" role="row">' + cells.slice(i, i + 7).join('') + '</div>';
    }
    body = '<div class="cal-grid-body">' + body + '</div>';

    return '<div class="cal-grid" role="grid" aria-label="' + escapeHtml(monthLabelText) + '">' + head + body + '</div>';
  }

  // Datum koji trenutno "nosi" roving tabindex/fokus u gridu — prati se
  // odvojeno od selStart/selEnd jer se fokus tokom navigacije strelicama
  // može naći na danu koji uopšte nije (još) selektovan.
  let activeDate = null;

  function selectDate(d){
    if (!selStart || (selStart && selEnd)){
      selStart = d; selEnd = null;
    } else if (d < selStart){
      selStart = d;
    } else {
      selEnd = d;
    }
    activeDate = d;
    render();
    if (selStart && selEnd) updateDisplay();
    focusDayButton(d);
  }

  // Fokusira dugme za dati datum AKO je trenutno vidljivo (na mobilnom je
  // drugi mesec u dvomesečnom prikazu sakriven preko CSS-a — display:none
  // elementi se ne mogu fokusirati). Vraća true/false radi fallback logike.
  function focusDayButton(d){
    const btn = calGrids.querySelector('.cal-day[data-date="' + toISODate(d) + '"]');
    if (btn && btn.offsetParent !== null){
      calGrids.querySelectorAll('.cal-day[data-date]').forEach(el => el.setAttribute('tabindex', '-1'));
      btn.setAttribute('tabindex', '0');
      btn.focus();
      return true;
    }
    return false;
  }

  // Posle svakog render()-a DOM se potpuno zameni (innerHTML), pa roving
  // tabindex treba ponovo postaviti na "aktivni" dan (fokus/selekciju),
  // a na sve ostale -1 — inače bi Tab uvek kretao od prvog dana u mesecu.
  function syncRovingTabindex(){
    const pref = activeDate || selStart || today;
    let target = calGrids.querySelector('.cal-day[data-date="' + toISODate(pref) + '"]:not(.is-disabled)');
    if (!target) target = calGrids.querySelector('.cal-day[data-date]:not(.is-disabled)');
    calGrids.querySelectorAll('.cal-day[data-date]').forEach(el => el.setAttribute('tabindex', '-1'));
    if (target) target.setAttribute('tabindex', '0');
  }

  function render(){
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    const monthLabel = (y, m) => {
      const name = new Date(y, m, 1).toLocaleString('sr-Latn', {month:'long'});
      return name.charAt(0).toUpperCase() + name.slice(1) + ' ' + y;
    };
    const label1 = monthLabel(viewYear, viewMonth), label2 = monthLabel(nextY, nextM);
    calMonths.innerHTML = '<span>' + label1 + '</span><span>' + label2 + '</span>';
    calGrids.innerHTML = buildMonthGrid(viewYear, viewMonth, label1) + buildMonthGrid(nextY, nextM, label2);
    calGrids.querySelectorAll('.cal-day:not(.is-empty):not(.is-disabled)').forEach(el => {
      el.addEventListener('click', () => selectDate(parseISODate(el.dataset.date)));
    });
    syncRovingTabindex();
    paintWeather();
    // Sadržaj (broj redova u mreži, prognoza) menja visinu kartice — ako je
    // otvorena na mobilnom, osveži poziciju da i dalje ostane tačno iznad polja.
    if (calCard.classList.contains('open')) positionCalMobile();
  }

  // ---- Pozicioniranje kartice na mobilnom ----
  // Kartica je sad, dok je otvorena, prebačena direktno u <body> (van
  // .ticket-a, van .hero-a) sa punim tamnim overlay-em preko celog ekrana —
  // pravi fullscreen "bottom sheet" modal, a ne više mali dropdown zalepljen
  // uz konkretno polje. Zato više NE računamo visinu prema poziciji polja
  // (to je ranije nepotrebno sažimalo karticu i sekalo mesec/legendu/dugme
  // "Gotovo" van vidljivog dela) — prepuštamo visinu CSS pravilu iz media
  // query-ja (top odmah ispod topbar-a, do skoro dna ekrana), koje već daje
  // maksimalan mogući prostor da ceo mesec stane bez skrolovanja. Ovde samo
  // brišemo eventualne inline stilove koje je ranija verzija postavljala.
  function positionCalMobile(){
    if (!isMobileCal()) return;
    calCard.style.left = '';
    calCard.style.right = '';
    calCard.style.top = '';
    calCard.style.bottom = '';
    calCard.style.maxHeight = '';
  }

  // ---- Navigacija tastaturom po mreži datuma (WAI-ARIA APG "grid" obrazac) ----
  // strelice = dan/nedelja, Home/End = početak/kraj nedelje, PageUp/PageDown =
  // prethodni/sledeći mesec (sa Shift = godina), Enter/Space = izbor datuma.
  const isMobileCal = () => window.matchMedia('(max-width:760px)').matches;

  function isDateInView(d){
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) return true;
    if (isMobileCal()) return false; // drugi mesec je sakriven na mobilnom
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    return d.getFullYear() === nextY && d.getMonth() === nextM;
  }

  function goToDate(d){
    if (d < today) d = new Date(today); // ne dozvoli fokus na onemogućen (prošli) dan
    activeDate = d;
    if (!isDateInView(d)){
      viewYear = d.getFullYear();
      viewMonth = d.getMonth();
      render();
    }
    if (!focusDayButton(d)){
      const fallback = calGrids.querySelector('.cal-day[data-date]:not(.is-disabled)');
      if (fallback){ fallback.setAttribute('tabindex', '0'); fallback.focus(); }
    }
  }

  calGrids.addEventListener('keydown', (e) => {
    const cellBtn = e.target.closest('.cal-day[data-date]');
    if (!cellBtn) return;
    const current = parseISODate(cellBtn.dataset.date);
    let next = null;
    switch (e.key){
      case 'ArrowRight': next = new Date(current); next.setDate(next.getDate() + 1); break;
      case 'ArrowLeft':  next = new Date(current); next.setDate(next.getDate() - 1); break;
      case 'ArrowDown':  next = new Date(current); next.setDate(next.getDate() + 7); break;
      case 'ArrowUp':    next = new Date(current); next.setDate(next.getDate() - 7); break;
      case 'Home': { const dow = (current.getDay() + 6) % 7; next = new Date(current); next.setDate(next.getDate() - dow); break; }
      case 'End':  { const dow = (current.getDay() + 6) % 7; next = new Date(current); next.setDate(next.getDate() + (6 - dow)); break; }
      case 'PageUp':
        next = new Date(current);
        if (e.shiftKey) next.setFullYear(next.getFullYear() - 1); else next.setMonth(next.getMonth() - 1);
        break;
      case 'PageDown':
        next = new Date(current);
        if (e.shiftKey) next.setFullYear(next.getFullYear() + 1); else next.setMonth(next.getMonth() + 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        selectDate(current);
        return;
      default:
        return;
    }
    e.preventDefault();
    goToDate(next);
  });

  let calScrollY = 0;
  let _calScrollLocked = false;
  // Isti uzrok i isto rešenje kao guardOverlayOpen (vidi komentar na vrhu
  // fajla): menjanje body position-a u 'fixed' USRED obrade dodira je
  // drugi (do sada nepopravljeni) razlog zašto je na mobilnom trebalo dva
  // tapa za SVAKU narednu radnju — izbor datuma, X za zatvaranje, Nastavi...
  // Logičko stanje (_calScrollLocked) se ažurira ODMAH da ostatak koda zna
  // je li "zaključano", ali sama promena na <body> se odlaže za sledeći
  // tick, da ne ometa isporuku klika koji je zaključavanje i pokrenuo.
  function lockPageScroll(){
    if (_calScrollLocked) return;
    _calScrollLocked = true;
    calScrollY = window.scrollY;
    setTimeout(() => {
      if (!_calScrollLocked) return; // otključano pre nego što je ovo stiglo
      document.body.style.position = 'fixed';
      document.body.style.top = '-' + calScrollY + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }, 0);
  }
  function unlockPageScroll(){
    _calScrollLocked = false;
    setTimeout(() => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, calScrollY);
    }, 0);
  }

  // .ticket ima backdrop-filter (zbog blur efekta), a to po CSS spec-u
  // pravi NOV containing block za position:fixed potomke — position:fixed
  // se onda ne računa od viewport-a nego od ivice .ticket-a. Zato je kalendar
  // na mobilnom "iskakao" na pogrešno mesto (oko sredine forme, prekrivajući
  // polje za destinaciju) umesto da se otvori tačno iznad polja "Od — Do",
  // sa punim tamnim overlay-em preko celog ekrana. Rešenje: dok je kartica
  // otvorena na mobilnom, privremeno je (i njen backdrop) prebacujemo direktno
  // u <body> — van .ticket-a — gde position:fixed opet radi normalno, prema
  // stvarnom viewport-u. Vraćamo je na originalno mesto pri zatvaranju, da
  // desktop raspored (position:absolute vezan za stub) ostane netaknut.
  let calHomeParent = null, calHomeNext = null;
  let calBackdropHomeParent = null, calBackdropHomeNext = null;
  function detachCalForMobile(){
    if (calCard.parentElement !== document.body){
      calHomeParent = calCard.parentElement;
      calHomeNext = calCard.nextSibling;
      document.body.appendChild(calCard);
    }
    if (calBackdrop && calBackdrop.parentElement !== document.body){
      calBackdropHomeParent = calBackdrop.parentElement;
      calBackdropHomeNext = calBackdrop.nextSibling;
      document.body.appendChild(calBackdrop);
    }
  }
  function reattachCal(){
    if (calHomeParent){
      if (calHomeNext) calHomeParent.insertBefore(calCard, calHomeNext);
      else calHomeParent.appendChild(calCard);
      calHomeParent = null; calHomeNext = null;
    }
    if (calBackdropHomeParent){
      if (calBackdropHomeNext) calBackdropHomeParent.insertBefore(calBackdrop, calBackdropHomeNext);
      else calBackdropHomeParent.appendChild(calBackdrop);
      calBackdropHomeParent = null; calBackdropHomeNext = null;
    }
  }

  function openCal(){
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    activeDate = (selStart && selStart >= today) ? selStart : today;
    render();
    calCard.classList.add('open');
    if (calBackdrop) calBackdrop.classList.add('open');
    displayBtn.setAttribute('aria-expanded', 'true');
    if (isMobileCal()){
      detachCalForMobile(); lockPageScroll(); positionCalMobile();
      guardOverlayOpen('cal', () => closeCal(true));
    }
    // fokus tastature/screen readera ide direktno na selektovani (ili
    // današnji) dan — bez ovoga dijalog se otvara vizuelno, ali korisnik
    // koji ne koristi miša nema signal da se nešto promenilo.
    focusDayButton(activeDate);
  }
  // "Meki" zahtev za zatvaranje (klik na dugme, Escape...) — ako je
  // kartica na mobilnom gurnula unos u historiju, prosleđuje se na
  // "Nazad" da postoji jedan jedini put kojim se zatvara.
  function requestCloseCal(){
    if (!guardOverlayRequestClose('cal')) closeCal(true);
  }
  function closeCal(shouldCommit){
    const wasOpen = calCard.classList.contains('open');
    calCard.classList.remove('open');
    if (calBackdrop) calBackdrop.classList.remove('open');
    displayBtn.setAttribute('aria-expanded', 'false');
    if (_calScrollLocked) unlockPageScroll();
    reattachCal();
    if (shouldCommit && selStart && selEnd){
      commit();
    } else if (!selStart || !selEnd){
      selStart = parseISODate(hiddenFrom.value);
      selEnd = parseISODate(hiddenTo.value);
    }
    // fokus se vraća na dugme koje je otvorilo dijalog — inače se gubi
    // (npr. posle Escape) i tastaturni/SR korisnik "ispadne" iz konteksta.
    if (wasOpen && document.activeElement && calCard.contains(document.activeElement)){
      displayBtn.focus();
    }
  }

  displayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (calCard.classList.contains('open')) requestCloseCal();
    else openCal();
  });
  applyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (selStart && selEnd) requestCloseCal();
  });
  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    viewMonth -= 1;
    if (viewMonth < 0){ viewMonth = 11; viewYear -= 1; }
    render();
  });
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    viewMonth += 1;
    if (viewMonth > 11){ viewMonth = 0; viewYear += 1; }
    render();
  });
  calCard.querySelectorAll('[data-quick]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const base = (selStart && selStart >= today) ? new Date(selStart) : new Date(today);
      let s, en;
      if (btn.dataset.quick === 'weekend'){
        s = new Date(today);
        const offset = (5 - s.getDay() + 7) % 7 || 7;
        s.setDate(s.getDate() + offset);
        en = new Date(s); en.setDate(en.getDate() + 2);
      } else if (btn.dataset.quick === 'week'){
        s = base; en = new Date(s); en.setDate(en.getDate() + 7);
      } else {
        s = base; en = new Date(s); en.setDate(en.getDate() + 14);
      }
      selStart = s; selEnd = en;
      viewYear = s.getFullYear(); viewMonth = s.getMonth();
      render();
      updateDisplay();
    });
  });
  calCard.addEventListener('click', (e) => e.stopPropagation());
  // Focus trap — pošto je calCard role="dialog" aria-modal="true", Tab ne
  // sme da izađe u pozadinski sadržaj dok je kalendar otvoren.
  calCard.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = Array.from(calCard.querySelectorAll('button:not([tabindex="-1"]), [tabindex="0"]'))
      .filter(el => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first){
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last){
      e.preventDefault(); first.focus();
    }
  });

  document.addEventListener('click', () => {
    if (calCard.classList.contains('open')) requestCloseCal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && calCard.classList.contains('open')) requestCloseCal();
  });
  window.addEventListener('resize', () => {
    if (calCard.classList.contains('open')) positionCalMobile();
  });

  const destInputEl = document.getElementById('dest');
  if (destInputEl){
    let destDebounce;
    destInputEl.addEventListener('input', () => {
      clearTimeout(destDebounce);
      destDebounce = setTimeout(() => {
        if (calCard.classList.contains('open')) paintWeather();
      }, 500);
    });
  }

  // Polje "Od — Do" na startu prikazuje crtice (placeholder stanje), a ne
  // unapred izračunat opseg/broj noći iz skrivenih polja — updateDisplay()
  // se zove tek kad korisnik stvarno potvrdi datume (Gotovo / brzi izbor).
})();

/* ==========================================================
   BROJ PUTNIKA — kartica po uzoru na kalendar (umesto native <select>,
   koji je ograničavao izbor na najviše 4 osobe i čiji padajući meni
   nije moguće stilizovati). Vrednost i dalje živi u #adults (sad
   <input type="hidden">, isti obrazac kao #dateFrom/#dateTo), pa sav
   ostatak koda koji čita/piše .value nastavlja da radi bez izmena.
   ========================================================== */
(function(){
  const displayBtn = document.getElementById('paxDisplayBtn');
  const displayText = document.getElementById('paxDisplayText');
  const hiddenField = document.getElementById('adults');
  const paxCard = document.getElementById('paxCard');
  const paxBackdrop = document.getElementById('paxBackdrop');
  const paxList = document.getElementById('paxList');
  const applyBtn = document.getElementById('paxApply');
  if (!displayBtn || !paxCard || !hiddenField || !paxList) return;

  const MAX_ADULTS = 30;

  // Gramatički ispravna množina za "odrasla osoba/odrasla/odraslih" — oblici
  // su u locales (plural.adult), izbor oblika radi pluralWord() preko Intl.PluralRules.
  function paxOptionLabel(n){ return n + ' ' + pluralWord('adult', n); }

  function buildOptions(){
    const keepVal = hiddenField.value;
    paxList.innerHTML = '';
    for (let n = 1; n <= MAX_ADULTS; n++){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pax-option';
      btn.setAttribute('role', 'option');
      btn.dataset.value = String(n);
      btn.textContent = paxOptionLabel(n);
      const isSel = String(n) === keepVal;
      btn.classList.toggle('is-selected', isSel);
      btn.setAttribute('aria-selected', isSel ? 'true' : 'false');
      btn.addEventListener('click', (e) => { e.stopPropagation(); selectPax(n); });
      paxList.appendChild(btn);
    }
  }

  function updateDisplay(){
    const val = hiddenField.value;
    if (!val){
      displayText.textContent = t('placeholder_passengers');
      displayBtn.classList.add('is-empty');
    } else {
      displayText.textContent = paxOptionLabel(Number(val));
      displayBtn.classList.remove('is-empty');
    }
  }
  // Izloženo van IIFE-a da loadSavedTrip() može da osveži prikaz posle
  // direktnog upisa u #adults.value (isti obrazac kao za ostatak forme).
  window.syncPaxDisplay = updateDisplay;

  function selectPax(n){
    hiddenField.value = String(n);
    paxList.querySelectorAll('.pax-option').forEach(b => {
      const isSel = b.dataset.value === String(n);
      b.classList.toggle('is-selected', isSel);
      b.setAttribute('aria-selected', isSel ? 'true' : 'false');
    });
    updateDisplay();
    hiddenField.dispatchEvent(new Event('input', {bubbles:true}));
    hiddenField.dispatchEvent(new Event('change', {bubbles:true}));
    // Sam klik na broj putnika sad odmah čuva izbor i zatvara karticu — dugme
    // "Gotovo" ostaje kao rezerva, ali izbor više ne zavisi od toga da se do
    // njega dogura (na dužim listama, npr. blizu 30, ranije je bilo van dohvata).
    requestClosePax();
  }

  const isMobilePax = () => window.matchMedia('(max-width:760px)').matches;

  let paxScrollY = 0;
  let _paxScrollLocked = false;
  // Isti razlog/rešenje kao kod kalendara — vidi komentar uz lockPageScroll
  // tamo (odlaganje body position promene za jedan tick, da ne "zaglavi"
  // isporuku sledećeg klika na mobilnom).
  function lockPageScroll(){
    if (_paxScrollLocked) return;
    _paxScrollLocked = true;
    paxScrollY = window.scrollY;
    setTimeout(() => {
      if (!_paxScrollLocked) return;
      document.body.style.position = 'fixed';
      document.body.style.top = '-' + paxScrollY + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }, 0);
  }
  function unlockPageScroll(){
    _paxScrollLocked = false;
    setTimeout(() => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, paxScrollY);
    }, 0);
  }

  // Isti razlog kao kod positionCalMobile gore — kartica je sad fullscreen
  // modal u <body>, pa joj prepuštamo visinu CSS media-query pravilu umesto
  // da je ručno sažimamo prema poziciji polja.
  function positionPaxMobile(){
    if (!isMobilePax()) return;
    paxCard.style.left = '';
    paxCard.style.right = '';
    paxCard.style.top = '';
    paxCard.style.bottom = '';
    paxCard.style.maxHeight = '';
  }

  // Isti razlog i isto rešenje kao kod kalendara (vidi detachCalForMobile
  // gore) — .ticket ima backdrop-filter, što pravi containing block za
  // position:fixed potomke, pa se kartica bez ovoga otvara na pogrešnom
  // mestu na mobilnom umesto tačno iznad polja "Putnika".
  let paxHomeParent = null, paxHomeNext = null;
  let paxBackdropHomeParent = null, paxBackdropHomeNext = null;
  function detachPaxForMobile(){
    if (paxCard.parentElement !== document.body){
      paxHomeParent = paxCard.parentElement;
      paxHomeNext = paxCard.nextSibling;
      document.body.appendChild(paxCard);
    }
    if (paxBackdrop && paxBackdrop.parentElement !== document.body){
      paxBackdropHomeParent = paxBackdrop.parentElement;
      paxBackdropHomeNext = paxBackdrop.nextSibling;
      document.body.appendChild(paxBackdrop);
    }
  }
  function reattachPax(){
    if (paxHomeParent){
      if (paxHomeNext) paxHomeParent.insertBefore(paxCard, paxHomeNext);
      else paxHomeParent.appendChild(paxCard);
      paxHomeParent = null; paxHomeNext = null;
    }
    if (paxBackdropHomeParent){
      if (paxBackdropHomeNext) paxBackdropHomeParent.insertBefore(paxBackdrop, paxBackdropHomeNext);
      else paxBackdropHomeParent.appendChild(paxBackdrop);
      paxBackdropHomeParent = null; paxBackdropHomeNext = null;
    }
  }

  function openPax(){
    paxCard.classList.add('open');
    if (paxBackdrop) paxBackdrop.classList.add('open');
    displayBtn.setAttribute('aria-expanded', 'true');
    if (isMobilePax()){
      detachPaxForMobile(); lockPageScroll(); positionPaxMobile();
      guardOverlayOpen('pax', closePax);
    }
    const focusTarget = paxList.querySelector('.pax-option.is-selected') || paxList.querySelector('.pax-option');
    if (focusTarget) focusTarget.focus();
  }
  function requestClosePax(){
    if (!guardOverlayRequestClose('pax')) closePax();
  }
  function closePax(){
    const wasOpen = paxCard.classList.contains('open');
    paxCard.classList.remove('open');
    if (paxBackdrop) paxBackdrop.classList.remove('open');
    displayBtn.setAttribute('aria-expanded', 'false');
    if (isMobilePax() && _paxScrollLocked) unlockPageScroll();
    reattachPax();
    if (wasOpen && document.activeElement && paxCard.contains(document.activeElement)){
      displayBtn.focus();
    }
  }

  displayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (paxCard.classList.contains('open')) requestClosePax();
    else openPax();
  });
  if (applyBtn) applyBtn.addEventListener('click', (e) => { e.stopPropagation(); requestClosePax(); });
  paxCard.addEventListener('click', (e) => e.stopPropagation());
  // Focus trap dok je "dijalog" otvoren — isti obrazac kao kod kalendara.
  paxCard.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = Array.from(paxCard.querySelectorAll('button')).filter(el => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  });
  document.addEventListener('click', () => {
    if (paxCard.classList.contains('open')) requestClosePax();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && paxCard.classList.contains('open')) requestClosePax();
  });
  window.addEventListener('resize', () => {
    if (paxCard.classList.contains('open')) positionPaxMobile();
  });

  buildOptions();
  updateDisplay();

  // Ako se jezik promeni, prevedi i listu i trenutni prikaz.
  const _prevOnLangChangePax = window.onLangChange;
  window.onLangChange = function(lang){
    if (typeof _prevOnLangChangePax === 'function') _prevOnLangChangePax(lang);
    buildOptions();
    updateDisplay();
  };
})();

// Small heuristic list — no geo API here, just enough to stop the CTA
// from promising a beach in landlocked cities like Beograd or Beč.
const COASTAL_DESTINATIONS = [
  'atina','solun','krf','santorini','mikonos','rodos','krit',
  'dubrovnik','split','zadar','budva','kotor','herceg novi',
  'barselona','nica','malaga','valensija','ibica','napulj','venecija',
  'lisabon','porto','tel aviv','antalija','bodrum'
];
function ctaCopy(dest){
  const isCoastal = COASTAL_DESTINATIONS.includes(dest.trim().toLowerCase());
  return t(isCoastal ? 'cta_copy_coastal' : 'cta_copy_inland');
}

const PARTNERS = {
  flight:    {provider:'kayak',      name:'KAYAK'},
  hotel:     {provider:'booking',    name:'Booking.com'},
  car:       {provider:'booking',    name:'Booking.com'},
  activity:  {provider:'viator',     name:'Viator'},
  esim:      {provider:'airalo',     name:'Airalo'},
  insurance: {provider:'worldnomads',name:'World Nomads'}
};

/* ---- Airalo prodaje eSIM po DRŽAVI, ne po gradu (npr. airalo.com/greece-esim),
   dok SKLOPI destinaciju vodi kao grad ("Atina"). Mapiramo preko iste liste
   POPULAR_DESTINATIONS koja se već koristi za predloge gradova — svaki unos
   tamo ima "extra" polje sa nazivom države na srpskom, koje ovde prevodimo
   u Airalo-ov URL slug (engleski naziv države, malim slovima, sa crticama).
   Status ovog mapiranja: vidi STATUS PRE PRODUKCIJE blok ispod. ---- */
const COUNTRY_SLUG_SR = {
  'Srbija':'serbia', 'Crna Gora':'montenegro', 'Bosna i Hercegovina':'bosnia-and-herzegovina',
  'Hrvatska':'croatia', 'Severna Makedonija':'north-macedonia', 'Kosovo':'kosovo',
  'Slovenija':'slovenia', 'Albanija':'albania', 'Rumunija':'romania', 'Bugarska':'bulgaria',
  'Grčka':'greece', 'Italija':'italy', 'Španija':'spain', 'Portugalija':'portugal',
  'Francuska':'france', 'Velika Britanija':'united-kingdom', 'Holandija':'netherlands',
  'Nemačka':'germany', 'Austrija':'austria', 'Češka':'czech-republic', 'Mađarska':'hungary',
  'Slovačka':'slovakia', 'Poljska':'poland', 'Švedska':'sweden', 'Norveška':'norway',
  'Danska':'denmark', 'Finska':'finland', 'Irska':'ireland', 'Belgija':'belgium',
  'Švajcarska':'switzerland', 'Turska':'turkey', 'Izrael':'israel', 'UAE':'united-arab-emirates',
  'Egipat':'egypt', 'Maroko':'morocco', 'SAD':'united-states', 'Tajland':'thailand',
  'Japan':'japan', 'Indonezija':'indonesia', 'Singapur':'singapore'
};
function airaloCountrySlug(destName){
  const match = POPULAR_DESTINATIONS.find(d => normalizeSr(d.name) === normalizeSr(destName));
  if (!match) return null;
  return COUNTRY_SLUG_SR[match.extra] || null;
}

/* ==========================================================
   IATA KODOVI za deep link ka KAYAK-u. Ključ = normalizeSr(grad).
   Uredničko znanje, namerno samo za aerodrome u kojima smo sigurni;
   za sve ostalo iataFor() vraća null i link pada na stari
   "anywhere-<grad>" oblik (ne nagađamo kod). Gradovi bez sopstvenog
   aerodroma se ovde NE mapiraju — pre pretrage prolaze kroz
   realDepartureAirportFor/realArrivalAirportFor (Bar → Tivat, itd.),
   isto kao i tekst na kartici, pa link i kartica pominju isti aerodrom.
========================================================== */
const AIRPORT_IATA = {
  'beograd':'BEG','nis':'INI','podgorica':'TGD','tivat':'TIV','zagreb':'ZAG','split':'SPU','dubrovnik':'DBV',
  'zadar':'ZAD','pula':'PUY','sarajevo':'SJJ','mostar':'OMO','skoplje':'SKP','ohrid':'OHD','pristina':'PRN',
  'ljubljana':'LJU','tirana':'TIA','budimpesta':'BUD','temisvar':'TSR','bukurest':'OTP',
  'sofija':'SOF','varna':'VAR','solun':'SKG','atina':'ATH','krf':'CFU','santorini':'JTR','mikonos':'JMK',
  'rodos':'RHO','krit':'HER','iraklion':'HER','rim':'FCO','milano':'MXP','venecija':'VCE','napulj':'NAP',
  'barselona':'BCN','madrid':'MAD','malaga':'AGP','ibica':'IBZ','lisabon':'LIS','porto':'OPO','pariz':'CDG',
  'nica':'NCE','london':'LON','amsterdam':'AMS','berlin':'BER','minhen':'MUC','frankfurt':'FRA','cirih':'ZRH',
  'bec':'VIE','prag':'PRG','bratislava':'BTS','varsava':'WAW','krakov':'KRK','istanbul':'IST','antalija':'AYT',
  'bodrum':'BJV','tel aviv':'TLV','dubai':'DXB','kairo':'CAI','marakes':'RAK','larnaka':'LCA','valeta':'MLA',
  'majorka':'PMI','kopenhagen':'CPH','stokholm':'ARN','oslo':'OSL','helsinki':'HEL','dablin':'DUB',
  'brisel':'BRU','bazel':'BSL','zeneva':'GVA','njujork':'NYC','bangkok':'BKK','tokio':'TYO'
};
function iataFor(airportNameRaw){
  const norm = normalizeSr(String(airportNameRaw || '').split(',')[0].trim());
  return AIRPORT_IATA[norm] || null;
}

/* ---- Cena leta zavisi od RUTE (polazište → destinacija), ne samo od
   nasumične osnove. Koordinate aerodroma (približne, dovoljne za
   procenu udaljenosti) za IATA kodove iz AIRPORT_IATA. Bez koordinata
   za bilo koji kraj rute, flightRouteMult() vraća 1 (staro ponašanje). ---- */
const AIRPORT_COORDS = {
  BEG:[44.82,20.29], INI:[43.34,21.85], TGD:[42.36,19.25], TIV:[42.40,18.72], ZAG:[45.74,16.07], SPU:[43.54,16.30],
  DBV:[42.56,18.27], ZAD:[44.11,15.35], PUY:[44.89,13.92], SJJ:[43.82,18.33], OMO:[43.29,17.85], SKP:[41.96,21.62],
  OHD:[41.18,20.74], PRN:[42.36,21.03], LJU:[46.22,14.46], TIA:[41.41,19.72], BUD:[47.44,19.26], TSR:[45.81,21.34],
  OTP:[44.57,26.09], SOF:[42.69,23.41], VAR:[43.23,27.83], SKG:[40.52,22.97], ATH:[37.94,23.94], CFU:[39.60,19.91],
  JTR:[36.40,25.48], JMK:[37.44,25.35], RHO:[36.41,28.09], HER:[35.34,25.18], FCO:[41.80,12.25], MXP:[45.63,8.72],
  VCE:[45.51,12.35], NAP:[40.89,14.29], BCN:[41.30,2.08], MAD:[40.47,-3.56], AGP:[36.67,-4.50], IBZ:[38.87,1.37],
  LIS:[38.77,-9.13], OPO:[41.24,-8.68], CDG:[49.01,2.55], NCE:[43.66,7.22], LON:[51.47,-0.45], AMS:[52.31,4.76],
  BER:[52.36,13.50], MUC:[48.35,11.79], FRA:[50.03,8.57], ZRH:[47.46,8.55], VIE:[48.11,16.57], PRG:[50.10,14.26],
  BTS:[48.17,17.21], WAW:[52.17,20.97], KRK:[50.08,19.78], IST:[41.26,28.74], AYT:[36.90,30.80], BJV:[37.25,27.66],
  TLV:[32.01,34.89], DXB:[25.25,55.36], CAI:[30.12,31.41], RAK:[31.61,-8.04], LCA:[34.88,33.63], MLA:[35.86,14.48],
  PMI:[39.55,2.74], CPH:[55.62,12.65], ARN:[59.65,17.93], OSL:[60.19,11.10], HEL:[60.32,24.96], DUB:[53.42,-6.27],
  BRU:[50.90,4.48], BSL:[47.59,7.53], GVA:[46.24,6.11], NYC:[40.64,-73.78], BKK:[13.69,100.75], TYO:[35.55,139.78]
};
function haversineKm(a, b){
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat/2)**2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// Množilac cene leta za konkretnu rutu. 1500 km = referentna (množilac 1);
// kraće rute jeftinije, dalje skuplje (ograničeno 0.6–4). Polazište bez
// sopstvenog aerodroma računa se od NAJBLIŽEG pravog (Novi Sad → Beograd),
// isto kao tekst na kartici. Mala mreža linija (Niš) daje +12% —
// ista okolnost na koju flightSubText već upozorava korisnika.
// NE zove rng() — ne sme da pomeri niz nasumičnih vrednosti.
function flightRouteMult(originRaw, destRaw){
  const o = iataFor(realDepartureAirportFor(originRaw));
  const d = iataFor(realArrivalAirportFor(destRaw));
  if (!o || !d || !AIRPORT_COORDS[o] || !AIRPORT_COORDS[d]) return 1;
  const km = o === d ? 0 : haversineKm(AIRPORT_COORDS[o], AIRPORT_COORDS[d]);
  let m = Math.min(4, Math.max(0.6, 0.5 + 0.5 * (km / 1500)));
  if (isLimitedNetworkOrigin(originRaw)) m *= 1.12;
  return m;
}

/* ==========================================================
   AFFILIATE DEEP LINKS — STATUS PRE PRODUKCIJE
   Jedino mesto gde treba gledati šta je spremno, umesto komentara
   rasutih kroz fajl. Pravi ID-jevi idu u config.js
   (window.SKLOPI_AFF_IDS) — dok tamo za neki partner stoji
   'SKLOPI', taj link vodi na partnera ali NE PRATI proviziju.

   ✅ POTVRĐENO protiv partnerske dokumentacije:
      - Airalo slug za Italiju i Grčku (italy-esim, greece-esim)
      - World Nomads PRODAJE rezidentima Srbije: "Serbia" se pojavljuje
        kao opcija u njihovom "country of residence" izborniku na
        service.worldnomads.com i worldnomads.com/eu (help centar),
        provereno 2026-09-18. Srbija nije u EU (za koju trenutno imaju
        posebno ograničenje) ni na listi sankcionisanih zemalja
        (Iran/Sirija/Sudan/S.Koreja/Krim/Kuba) — rezidentska strana
        pitanja više NIJE blokator.
      - Kayak: PARAMETAR JE BIO POGREŠAN, sad ispravljen. Zvanični
        KAYAK Affiliate help centar (help.affiliates.kayak.com) kaže
        eksplicitno: "please ensure that all your affiliate links
        include your unique affiliate ID 'a' at the very least" — dakle
        parametar se zove 'a', NE 'ref' (staro ${'&ref='} nikad ne bi
        pratilo proviziju, ni sa pravim ID-jem). Napomena istog help
        centra: pravi (portal) deep-link generator dodaje i granularne
        tracking parametre (Click ID/Label, Location ID) — 'a' je samo
        apsolutni minimum, korisno je jednom kad se odobri nalog
        proveriti i njihov Deeplink Generator za bolju atribuciju.
      - Booking.com: 'aid=' je potvrđen kao ispravan naziv parametra
        (potvrđeno kroz primer stvarnog linka trećeg partnera). Njihov
        zvanični link generator dodaje i 'label=' za finiju kampanjsku
        atribuciju — nije obavezno, ali vredi dodati kad se nalog odobri.
      - Viator: 'pid=' je potvrđen kao ispravan (stvaran primer iz
        njihove API dokumentacije: ...?mcid=42383&pid=P00063937...).
        NAPOMENA: taj isti primer ima i 'mcid=' (Viator-ov marketing
        campaign ID, poseban broj koji ONI dodeljuju) pored pid-a — kad
        se nalog odobri, pitati account managera da li je mcid obavezan
        i za osnovni link, ili samo za API pozive.

   ⚠️ NAJBOLJA PRETPOSTAVKA — provera pre produkcije:
      - Airalo     airalo.com/<drzava>-esim?ref= — slug za SVE ostale
        države (osim Italije/Grčke) je pretpostavka po istoj šemi,
        nije provereno da stranica zaista postoji za svaku od njih;
        parametar 'ref=' za Airalo takođe nije potvrđen (nije nađena
        zvanična dokumentacija affiliate linka, samo da program postoji)

   ⚠️ NOVI PARAMETRI DEEP LINKA (pretpostavka, proveri ručno jednom
      pre produkcije — otvori po jedan link i vidi da filteri stvarno
      uhvate): KAYAK ruta BEG-ATH/…, `fs=stops%3D0` (samo direktni),
      `sort=price_a`; Booking `nflt=class%3D<3|4|5>`,
      `order=review_score_and_price` / `distance_from_search`,
      `no_rooms=ceil(adults/2)`. Tip auta i konkretna avio-kompanija se
      i dalje NE prosleđuju (nema potvrđenog parametra / mape kodova).

   ❌ NIJE SPREMNO — ne puštati u produkciju dok se ne reši:
      - World Nomads: rezidentska strana je ✅ rešena (vidi gore), ali
        AFFILIATE LINK i dalje nije. Program je od nov. 2022 EXKLUZIVNO
        preko CJ Affiliate (Commission Junction) — stari direktni
        worldnomads.com referral linkovi NE PRATE proviziju. Potreban
        je stvarni ljudski korak, ne kod: (1) registruj se kao Publisher
        na cj.com, (2) potraži "World Nomads" i prijavi se na program,
        (3) nakon odobrenja, generiši prave tracking linkove kroz CJ
        Account Manager (Links → Search) — ti linkovi idu preko CJ-jevog
        sopstvenog tracking domena, ne direktno na worldnomads.com/?ref=.
        Dok se to ne uradi, trenutni URL ispod je samo placeholder koji
        VODI na sajt ali NE DONOSI proviziju.
        Trenutni rizik je nizak: insurance dugme/CTA se generiše
        (pkg.insuranceBookUrl) ali se NIGDE ne renderuje u UI-ju
        (uklonjeno sa kartica — vidi pkgHtml), tako da ovaj link
        još nije user-facing.
========================================================== */
/* Obaveštenje o partnerskim linkovima (builder + rezultati). Isti obrazac kao
   DEST_TXT: tekst živi ovde (sr/en/ru), pada na srpski ako jezika nema.
   Pokriva partnere čiji se linkovi stvarno prikazuju: KAYAK (let),
   Booking.com (hotel/auto), Viator (aktivnosti). Ako se Airalo ili osiguranje
   ikad prikažu u UI-ju, dodaj ih i ovde. */
function affDisc(){
  // Spisak partnera prati šta se STVARNO prikazuje sa provizijom: KAYAK, Booking.com,
  // Viator uvek; Omio tek kad u config.js dobije pravi tracking link (SKLOPI_AFF.isLive).
  // Ako se Airalo ili osiguranje ikad prikažu na glavnoj stranici, dodaj ih i ovde.
  const omio = !!(window.SKLOPI_AFF && window.SKLOPI_AFF.isLive('omio'));
  const list = (names, and) => names.length < 2 ? names.join('')
    : names.slice(0, -1).join(', ') + ' ' + and + ' ' + names[names.length - 1];
  const base = ['KAYAK', 'Booking.com', 'Viator'].concat(omio ? ['Omio'] : []);
  const D = {
    sr:'Linkovi ka ' + list(base.map(n => n + '-u'), 'i') + ' su partnerski: SKLOPI može da dobije proviziju, a tebi cena ostaje ista. Cene i dostupnost potvrđuješ na sajtu partnera.',
    en:'Links to ' + list(base, 'and') + ' are affiliate links: SKLOPI may earn a commission at no extra cost to you. Confirm prices and availability on the partner\'s site.',
    ru:'Ссылки на ' + list(base, 'и') + ' партнёрские: SKLOPI может получить комиссию, а цена для вас не меняется. Цены и наличие проверяйте на сайте партнёра.'
  };
  return D[getLang()] || D.sr;
}
// ID-jevi se čitaju SAMO preko affiliate.js (a upisuju samo u config.js → SKLOPI_AFF_IDS).
function affId(kind){ return window.SKLOPI_AFF.id(PARTNERS[kind].provider); }

function buildAffiliateLink(kind, ctx){
  const enc = encodeURIComponent;
  const dest = enc(ctx.dest);
  switch(kind){
    case 'flight': {
      // Parametar je 'a' (affiliate ID), NE 'ref' — potvrđeno na
      // help.affiliates.kayak.com. Vidi STATUS PRE PRODUKCIJE iznad.
      // Ruta: kad znamo IATA i polazišta i odredišta (posle preslikavanja
      // grada bez aerodroma na najbliži pravi — isto kao na kartici),
      // link nosi TAČNU rutu; inače pada na stari "anywhere-<grad>".
      const oIata = iataFor(realDepartureAirportFor(ctx.originCode));
      const dIata = iataFor(realArrivalAirportFor(ctx.dest));
      const route = (oIata && dIata) ? `${oIata}-${dIata}` : `anywhere-${dest}`;
      const pref = ctx.flightPref || 'direct';
      // direktan → samo direktni letovi; najjeftiniji → sortirano po ceni;
      // konkretna kompanija se NE prosleđuje (KAYAK traži kod kompanije,
      // a nemamo mapu naziv → kod, pa ne nagađamo).
      const sort = pref === 'cheapest' ? 'price_a' : 'bestflight_a';
      const stops = pref === 'direct' ? '&fs=stops%3D0' : '';
      return `https://www.kayak.com/flights/${route}/${ctx.from}/${ctx.to}?adults=${ctx.adults}&sort=${sort}${stops}&a=${affId('flight')}`;
    }
    case 'hotel': {
      // Broj soba isti kao na kartici (ceil(adults/2)), zvezdice kao
      // filter kategorije (class=3/4/5), a prioritet ocene/lokacije kao
      // redosled rezultata — da link otvara ono što kartica opisuje.
      const rooms = Math.max(1, Math.ceil((Number(ctx.adults) || 2) / 2));
      // Datumi i broj gostiju su opcioni: bez njih (destinacije pre izbora datuma)
      // link ostaje obična pretraga grada, ali i dalje nosi affiliate ID.
      const dates = (ctx.from && ctx.to) ? `&checkin=${ctx.from}&checkout=${ctx.to}` : '';
      const guests = (ctx.adults != null) ? `&group_adults=${ctx.adults}&no_rooms=${rooms}` : '';
      const stars = [3,4,5].includes(ctx.hotelStars) ? `&nflt=class%3D${ctx.hotelStars}` : '';
      const order = ctx.prioritizeRating ? '&order=review_score_and_price'
                  : ctx.prioritizeLocation ? '&order=distance_from_search' : '';
      return `https://www.booking.com/searchresults.html?ss=${dest}${dates}${guests}${stars}${order}&aid=${affId('hotel')}`;
    }
    case 'car':
      return `https://www.booking.com/cars/results.html?ss=${dest}&pickupDate=${ctx.from}&dropoffDate=${ctx.to}&aid=${affId('car')}`;
    case 'activity':
      return `https://www.viator.com/searchResults/all?text=${dest}&pid=${affId('activity')}`;
    case 'esim': {
      const slug = airaloCountrySlug(ctx.dest);
      // Ako ne prepoznamo državu iz grada, vodimo na opštu prodavnicu
      // (bolje nego pogrešan/nepostojeći URL za državu).
      return slug
        ? `https://www.airalo.com/${slug}-esim?ref=${affId('esim')}`
        : `https://www.airalo.com/esim?ref=${affId('esim')}`;
    }
    case 'insurance':
      // Vidi STATUS PRE PRODUKCIJE iznad — ova stavka je ❌ nije spremna.
      return `https://www.worldnomads.com/travel-insurance?ref=${affId('insurance')}`;
  }
}

/* ==========================================================
   JEDINSTVENA BAZA AERODROMA — gradovi Srbije i regiona koji
   IMAJU sopstveni aerodrom (hasAirport:true, uz limited:true ako
   je mreža linija ograničena/sezonska) i gradovi koji NEMAJU
   sopstveni aerodrom (nearest + note = najbliži pravi aerodrom).
   Namerno JEDNA baza za oba polja forme (Polazak i Destinacija) —
   koristi se i za upozorenje dok korisnik kuca, i za sam prikaz
   ponude (stvarni aerodrom umesto grada koji ga nema). Uredničko
   geografsko znanje, ne uživo podatak o letovima/linijama.
   NAPOMENA: obuhvata veći broj manjih gradova regiona, ali i dalje
   nije iscrpna lista svakog mesta. Kad sajt bude live, vredi ovo
   dalje širiti na osnovu stvarnih pretraga korisnika koje promaše
   bazu (npr. praćenjem koji gradovi u polju Polazak/Destinacija
   vrate null iz airportInfoFor() ispod).
========================================================== */
const AIRPORT_DB = {
  // --- Srbija: aerodromi ---
  'beograd': {hasAirport:true},
  'nis': {hasAirport:true, limited:true},
  // --- Srbija: bez sopstvenog aerodroma ---
  'niska banja': {nearest:'Niš', note:'Niška Banja nema svoj aerodrom — najbliži je Niš (oko 15 min vožnje).', c:'Niška Banja', k:'own', t:'15 min'},
  'novi sad': {nearest:'Beograd', note:'Novi Sad nema svoj aerodrom — najbliži je Beograd (oko 1h vožnje).', c:'Novi Sad', k:'own', t:'1h'},
  'subotica': {nearest:'Budimpešta'},
  'kragujevac': {nearest:'Beograd', note:'Kragujevac nema svoj aerodrom — najbliži je Beograd (oko 1h vožnje).', c:'Kragujevac', k:'own', t:'1h'},
  'kraljevo': {nearest:'Niš'},
  'novi pazar': {nearest:'Beograd'},
  'sabac': {nearest:'Beograd', note:'Šabac nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).', c:'Šabac', k:'own', t:'1h30'},
  'zrenjanin': {nearest:'Beograd', note:'Zrenjanin nema svoj aerodrom — najbliži je Beograd (oko 1h vožnje).', c:'Zrenjanin', k:'own', t:'1h'},
  'pancevo': {nearest:'Beograd', note:'Pančevo nema svoj aerodrom — najbliži je Beograd (oko 30 min vožnje).', c:'Pančevo', k:'own', t:'30 min'},
  'cacak': {nearest:'Beograd', note:'Čačak nema svoj aerodrom — najbliži je Beograd (oko 2h vožnje).', c:'Čačak', k:'own', t:'2h'},
  'krusevac': {nearest:'Niš', note:'Kruševac nema svoj aerodrom — najbliži je Niš (oko 1h vožnje).', c:'Kruševac', k:'own', t:'1h'},
  'leskovac': {nearest:'Niš', note:'Leskovac nema svoj aerodrom — najbliži je Niš (oko 40 min vožnje).', c:'Leskovac', k:'own', t:'40 min'},
  'vranje': {nearest:'Niš', note:'Vranje nema svoj aerodrom — najbliži je Niš (oko 1h vožnje).', c:'Vranje', k:'own', t:'1h'},
  'uzice': {nearest:'Beograd', note:'Užice nema svoj aerodrom — najbliži je Beograd (oko 3h vožnje).', c:'Užice', k:'own', t:'3h'},
  'valjevo': {nearest:'Beograd', note:'Valjevo nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).', c:'Valjevo', k:'own', t:'1h30'},
  'smederevo': {nearest:'Beograd', note:'Smederevo nema svoj aerodrom — najbliži je Beograd (oko 45 min vožnje).', c:'Smederevo', k:'own', t:'45 min'},
  'sombor': {nearest:'Beograd', note:'Sombor nema svoj aerodrom — najbliži je Beograd (oko 2h vožnje).', c:'Sombor', k:'own', t:'2h'},
  'zajecar': {nearest:'Niš', note:'Zaječar nema svoj aerodrom — najbliži je Niš (oko 1h30 vožnje).', c:'Zaječar', k:'own', t:'1h30'},
  'pirot': {nearest:'Niš', note:'Pirot nema svoj aerodrom — najbliži je Niš (oko 1h vožnje).', c:'Pirot', k:'own', t:'1h'},
  'loznica': {nearest:'Beograd', note:'Loznica nema svoj aerodrom — najbliži je Beograd (oko 2h vožnje).', c:'Loznica', k:'own', t:'2h'},
  'pozarevac': {nearest:'Beograd', note:'Požarevac nema svoj aerodrom — najbliži je Beograd (oko 1h vožnje).', c:'Požarevac', k:'own', t:'1h'},
  'sremska mitrovica': {nearest:'Beograd', note:'Sremska Mitrovica nema svoj aerodrom — najbliži je Beograd (oko 1h vožnje).', c:'Sremska Mitrovica', k:'own', t:'1h'},
  'vrsac': {nearest:'Beograd', note:'Vršac nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).', c:'Vršac', k:'own', t:'1h30'},
  'kikinda': {nearest:'Beograd', note:'Kikinda nema svoj aerodrom — najbliži je Beograd (oko 2h vožnje).', c:'Kikinda', k:'own', t:'2h'},
  'jagodina': {nearest:'Niš', note:'Jagodina nema svoj aerodrom — najbliži je Niš (oko 1h vožnje), Beograd je alternativa.', c:'Jagodina', k:'own', t:'1h', alt:'Beograd'},
  'paracin': {nearest:'Niš', note:'Paraćin nema svoj aerodrom — najbliži je Niš (oko 1h vožnje).', c:'Paraćin', k:'own', t:'1h'},
  'bor': {nearest:'Niš', note:'Bor nema svoj aerodrom — najbliži je Niš (oko 1h30 vožnje).', c:'Bor', k:'own', t:'1h30'},
  'negotin': {nearest:'Niš', note:'Negotin nema svoj aerodrom — najbliži je Niš (oko 2h vožnje).', c:'Negotin', k:'own', t:'2h'},
  'prijepolje': {nearest:'Podgorica', note:'Prijepolje nema svoj aerodrom — najbliži je Podgorica (oko 1h30 vožnje), Beograd je alternativa.', c:'Prijepolje', k:'own', t:'1h30', alt:'Beograd'},
  'priboj': {nearest:'Podgorica', note:'Priboj nema svoj aerodrom — najbliži je Podgorica (oko 1h30 vožnje).', c:'Priboj', k:'own', t:'1h30'},
  'sjenica': {nearest:'Beograd', note:'Sjenica nema svoj aerodrom — najbliži je Beograd (oko 3h vožnje), Podgorica je alternativa.', c:'Sjenica', k:'own', t:'3h', alt:'Podgorica'},
  'prokuplje': {nearest:'Niš', note:'Prokuplje nema svoj aerodrom — najbliži je Niš (oko 40 min vožnje).', c:'Prokuplje', k:'own', t:'40 min'},
  'vrnjacka banja': {nearest:'Niš', note:'Vrnjačka Banja nema svoj aerodrom — najbliži je Niš (oko 1h30 vožnje), Beograd je alternativa.', c:'Vrnjačka Banja', k:'own', t:'1h30', alt:'Beograd'},
  'sokobanja': {nearest:'Niš', note:'Sokobanja nema svoj aerodrom — najbliži je Niš (oko 1h vožnje).', c:'Sokobanja', k:'own', t:'1h'},
  'aleksinac': {nearest:'Niš', note:'Aleksinac nema svoj aerodrom — najbliži je Niš (oko 30 min vožnje).', c:'Aleksinac', k:'own', t:'30 min'},
  'vlasotince': {nearest:'Niš', note:'Vlasotince nema svoj aerodrom — najbliži je Niš (oko 1h vožnje).', c:'Vlasotince', k:'own', t:'1h'},
  'surdulica': {nearest:'Niš', note:'Surdulica nema svoj aerodrom — najbliži je Niš (oko 1h30 vožnje).', c:'Surdulica', k:'own', t:'1h30'},
  'ivanjica': {nearest:'Beograd', note:'Ivanjica nema svoj aerodrom — najbliži je Beograd (oko 3h vožnje).', c:'Ivanjica', k:'own', t:'3h'},
  'cuprija': {nearest:'Niš', note:'Ćuprija nema svoj aerodrom — najbliži je Niš (oko 1h vožnje), Beograd je alternativa.', c:'Ćuprija', k:'own', t:'1h', alt:'Beograd'},
  'svilajnac': {nearest:'Beograd', note:'Svilajnac nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).', c:'Svilajnac', k:'own', t:'1h30'},
  'senta': {nearest:'Beograd', note:'Senta nema svoj aerodrom — najbliži je Beograd (oko 2h vožnje), Budimpešta je alternativa.', c:'Senta', k:'own', t:'2h', alt:'Budimpešta'},
  'becej': {nearest:'Beograd', note:'Bečej nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).', c:'Bečej', k:'own', t:'1h30'},
  'vrbas': {nearest:'Beograd', note:'Vrbas nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).', c:'Vrbas', k:'own', t:'1h30'},
  'backa palanka': {nearest:'Beograd', note:'Bačka Palanka nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).', c:'Bačka Palanka', k:'own', t:'1h30'},
  'ruma': {nearest:'Beograd', note:'Ruma nema svoj aerodrom — najbliži je Beograd (oko 1h vožnje).', c:'Ruma', k:'own', t:'1h'},
  'indjija': {nearest:'Beograd', note:'Inđija nema svoj aerodrom — najbliži je Beograd (oko 40 min vožnje).', c:'Inđija', k:'own', t:'40 min'},
  'stara pazova': {nearest:'Beograd', note:'Stara Pazova nema svoj aerodrom — najbliži je Beograd (oko 30 min vožnje).', c:'Stara Pazova', k:'own', t:'30 min'},
  'sid': {nearest:'Beograd', note:'Šid nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje), Zagreb je alternativa.', c:'Šid', k:'own', t:'1h30', alt:'Zagreb'},
  // --- Crna Gora: aerodromi ---
  'podgorica': {hasAirport:true},
  'tivat': {hasAirport:true},
  // --- Crna Gora: bez sopstvenog aerodroma ---
  'budva': {nearest:'Tivat', note:'Budva nema svoj aerodrom — najbliži je Tivat (oko 25 min vožnje).', c:'Budva', k:'own', t:'25 min'},
  'danilovgrad': {nearest:'Podgorica', note:'Danilovgrad nema svoj aerodrom — najbliži je Podgorica (oko 20 min vožnje).', c:'Danilovgrad', k:'own', t:'20 min'},
  'pljevlja': {nearest:'Podgorica', note:'Pljevlja nema svoj aerodrom — najbliži je Podgorica (oko 2h30 vožnje), Sarajevo je alternativa.', c:'Pljevlja', k:'own', t:'2h30', alt:'Sarajevo'},
  'berane': {nearest:'Podgorica', note:'Berane nema svoj aerodrom — najbliži je Podgorica (oko 2h vožnje).', c:'Berane', k:'own', t:'2h'},
  'rozaje': {nearest:'Podgorica', note:'Rožaje nema svoj aerodrom — najbliži je Podgorica (oko 2h30 vožnje).', c:'Rožaje', k:'own', t:'2h30'},
  'bijelo polje': {nearest:'Podgorica', note:'Bijelo Polje nema svoj aerodrom — najbliži je Podgorica (oko 2h vožnje).', c:'Bijelo Polje', k:'own', t:'2h'},
  'bar': {nearest:'Tivat'},
  'herceg novi': {nearest:'Tivat', note:'Herceg Novi nema svoj aerodrom — najbliži je Tivat (oko 35 min vožnje).', c:'Herceg Novi', k:'own', t:'35 min'},
  'igalo': {nearest:'Tivat', note:'Igalo nema svoj aerodrom — najbliži je Tivat (oko 35 min vožnje).', c:'Igalo', k:'own', t:'35 min'},
  'niksic': {nearest:'Podgorica', note:'Nikšić nema svoj aerodrom — najbliži je Podgorica (oko 1h vožnje).', c:'Nikšić', k:'own', t:'1h'},
  'cetinje': {nearest:'Podgorica', note:'Cetinje nema svoj aerodrom — najbliži je Podgorica (oko 30 min vožnje).', c:'Cetinje', k:'own', t:'30 min'},
  'ulcinj': {nearest:'Tivat', note:'Ulcinj nema svoj aerodrom — najbliži je Tivat (oko 1h vožnje), Podgorica je alternativa.', c:'Ulcinj', k:'own', t:'1h', alt:'Podgorica'},
  'petrovac': {nearest:'Tivat', note:'Petrovac nema svoj aerodrom — najbliži je Tivat (oko 35 min vožnje).', c:'Petrovac', k:'own', t:'35 min'},
  'sutomore': {nearest:'Tivat', note:'Sutomore nema svoj aerodrom — najbliži je Tivat (oko 45 min vožnje).', c:'Sutomore', k:'own', t:'45 min'},
  'perast': {nearest:'Tivat', note:'Perast nema svoj aerodrom — najbliži je Tivat (oko 20 min vožnje).', c:'Perast', k:'own', t:'20 min'},
  'risan': {nearest:'Tivat', note:'Risan nema svoj aerodrom — najbliži je Tivat (oko 25 min vožnje).', c:'Risan', k:'own', t:'25 min'},
  'kotor': {nearest:'Tivat', note:'Kotor nema svoj aerodrom — najbliži je Tivat (oko 15 min vožnje).', c:'Kotor', k:'own', t:'15 min'},
  'kolasin': {nearest:'Podgorica', note:'Kolašin nema svoj aerodrom — najbliži je Podgorica (oko 1h vožnje).', c:'Kolašin', k:'own', t:'1h'},
  'zabljak': {nearest:'Podgorica', note:'Žabljak nema svoj aerodrom — najbliži je Podgorica (oko 2h vožnje).', c:'Žabljak', k:'own', t:'2h'},
  // --- Bosna i Hercegovina: aerodromi ---
  'sarajevo': {hasAirport:true},
  'banja luka': {hasAirport:true, limited:true},
  'tuzla': {hasAirport:true},
  'mostar': {hasAirport:true},
  'blagaj': {nearest:'Mostar', note:'Blagaj nema svoj aerodrom — najbliži je Mostar (oko 15 min vožnje).', c:'Blagaj', k:'own', t:'15 min'},
  'pocitelj': {nearest:'Mostar', note:'Počitelj nema svoj aerodrom — najbliži je Mostar (oko 30 min vožnje).', c:'Počitelj', k:'own', t:'30 min'},
  'medjugorje': {nearest:'Mostar', note:'Međugorje nema svoj aerodrom — najbliži je Mostar (oko 25 min vožnje).', c:'Međugorje', k:'own', t:'25 min'},
  // --- BiH: bez sopstvenog aerodroma ---
  'zenica': {nearest:'Sarajevo', note:'Zenica nema svoj aerodrom — najbliži je Sarajevo (oko 1h vožnje).', c:'Zenica', k:'own', t:'1h'},
  'prijedor': {nearest:'Banja Luka', note:'Prijedor nema svoj aerodrom — najbliži je Banja Luka (oko 40 min vožnje).', c:'Prijedor', k:'own', t:'40 min'},
  'bihac': {nearest:'Banja Luka', note:'Bihać nema svoj aerodrom — najbliži je Banja Luka (oko 2h vožnje), Zagreb je alternativa.', c:'Bihać', k:'own', t:'2h', alt:'Zagreb'},
  'doboj': {nearest:'Banja Luka', note:'Doboj nema svoj aerodrom — najbliži je Banja Luka (oko 1h vožnje), Sarajevo je alternativa.', c:'Doboj', k:'own', t:'1h', alt:'Sarajevo'},
  'trebinje': {nearest:'Dubrovnik', note:'Trebinje nema svoj aerodrom — najbliži je Dubrovnik u Hrvatskoj (oko 40 min vožnje).', c:'Trebinje', k:'own', t:'40 min', cc:'Hrvatskoj'},
  'foca': {nearest:'Sarajevo', note:'Foča nema svoj aerodrom — najbliži je Sarajevo (oko 1h30 vožnje).', c:'Foča', k:'own', t:'1h30'},
  'bijeljina': {nearest:'Tuzla', note:'Bijeljina nema svoj aerodrom — najbliži je Tuzla (oko 1h vožnje), Beograd je alternativa.', c:'Bijeljina', k:'own', t:'1h', alt:'Beograd'},
  'brcko': {nearest:'Tuzla', note:'Brčko nema svoj aerodrom — najbliži je Tuzla (oko 1h vožnje).', c:'Brčko', k:'own', t:'1h'},
  'travnik': {nearest:'Sarajevo', note:'Travnik nema svoj aerodrom — najbliži je Sarajevo (oko 1h30 vožnje).', c:'Travnik', k:'own', t:'1h30'},
  'livno': {nearest:'Split', note:'Livno nema svoj aerodrom — najbliži je Split u Hrvatskoj (oko 1h30 vožnje), Sarajevo je alternativa.', c:'Livno', k:'own', t:'1h30', cc:'Hrvatskoj', alt:'Sarajevo'},
  'gorazde': {nearest:'Sarajevo', note:'Goražde nema svoj aerodrom — najbliži je Sarajevo (oko 1h vožnje).', c:'Goražde', k:'own', t:'1h'},
  'vrelo bosne': {nearest:'Sarajevo', note:'Vrelo Bosne nema svoj aerodrom — najbliži je Sarajevo (oko 20 min vožnje).', c:'Vrelo Bosne', k:'own', t:'20 min'},
  'konjic': {nearest:'Sarajevo', note:'Konjic nema svoj aerodrom — najbliži je Sarajevo (oko 45 min vožnje), Mostar je alternativa.', c:'Konjic', k:'own', t:'45 min', alt:'Mostar'},
  'jajce': {nearest:'Banja Luka', note:'Jajce nema svoj aerodrom — najbliži je Banja Luka (oko 1h30 vožnje), Sarajevo je alternativa.', c:'Jajce', k:'own', t:'1h30', alt:'Sarajevo'},
  'neum': {nearest:'Dubrovnik', note:'Neum nema svoj aerodrom — najbliži je Dubrovnik u Hrvatskoj (oko 30 min vožnje), Mostar je alternativa.', c:'Neum', k:'own', t:'30 min', cc:'Hrvatskoj', alt:'Mostar'},
  'bjelasnica': {nearest:'Sarajevo', note:'Bjelašnica nema svoj aerodrom — najbliži je Sarajevo (oko 30 min vožnje).', c:'Bjelašnica', k:'own', t:'30 min'},
  'jahorina': {nearest:'Sarajevo', note:'Jahorina nema svoj aerodrom — najbliži je Sarajevo (oko 40 min vožnje).', c:'Jahorina', k:'own', t:'40 min'},
  'vlasic': {nearest:'Banja Luka', note:'Vlašić nema svoj aerodrom — najbliži je Banja Luka (oko 1h30 vožnje), Sarajevo je alternativa.', c:'Vlašić', k:'own', t:'1h30', alt:'Sarajevo'},
  'kupres': {nearest:'Split', note:'Kupres nema svoj aerodrom — najbliži je Split u Hrvatskoj (oko 1h30 vožnje), Mostar je alternativa.', c:'Kupres', k:'own', t:'1h30', cc:'Hrvatskoj', alt:'Mostar'},
  'sutjeska': {nearest:'Sarajevo', note:'Nacionalni park Sutjeska nema svoj aerodrom — najbliži je Sarajevo (oko 2h30 vožnje).', c:'Sutjeska', k:'own', t:'2h30'},
  'una': {nearest:'Banja Luka', note:'Nacionalni park Una nema svoj aerodrom — najbliži je Banja Luka (oko 2h vožnje).', c:'Una', k:'own', t:'2h'},
  // --- Hrvatska: aerodromi ---
  'zagreb': {hasAirport:true}, 'split': {hasAirport:true}, 'dubrovnik': {hasAirport:true},
  'zadar': {hasAirport:true}, 'rijeka': {hasAirport:true}, 'pula': {hasAirport:true},
  'osijek': {hasAirport:true, limited:true},
  // --- Hrvatska: bez sopstvenog aerodroma ---
  'vukovar': {nearest:'Osijek', note:'Vukovar nema svoj aerodrom — najbliži je Osijek (oko 40 min vožnje).', c:'Vukovar', k:'own', t:'40 min'},
  'slavonski brod': {nearest:'Zagreb', note:'Slavonski Brod nema svoj aerodrom — najbliži je Zagreb (oko 2h vožnje), Sarajevo je alternativa.', c:'Slavonski Brod', k:'own', t:'2h', alt:'Sarajevo'},
  'varazdin': {nearest:'Zagreb', note:'Varaždin nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Varaždin', k:'own', t:'1h'},
  'knin': {nearest:'Split', note:'Knin nema svoj aerodrom — najbliži je Split (oko 1h vožnje), Zadar je alternativa.', c:'Knin', k:'own', t:'1h', alt:'Zadar'},
  'sibenik': {nearest:'Split', note:'Šibenik nema svoj aerodrom — najbliži je Split (oko 1h vožnje), Zadar je alternativa.', c:'Šibenik', k:'own', t:'1h', alt:'Zadar'},
  'makarska': {nearest:'Split', note:'Makarska nema svoj aerodrom — najbliži je Split (oko 1h vožnje).', c:'Makarska', k:'own', t:'1h'},
  'trogir': {nearest:'Split'},
  'hvar': {nearest:'Split'},
  'rovinj': {nearest:'Pula', note:'Rovinj nema svoj aerodrom — najbliži je Pula (oko 40 min vožnje).', c:'Rovinj', k:'own', t:'40 min'},
  'sisak': {nearest:'Zagreb', note:'Sisak nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Sisak', k:'own', t:'1h'},
  'karlovac': {nearest:'Zagreb', note:'Karlovac nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Karlovac', k:'own', t:'1h'},
  // --- Severna Makedonija ---
  'skoplje': {hasAirport:true}, 'ohrid': {hasAirport:true, limited:true},
  'bitola': {nearest:'Ohrid', note:'Bitolj nema svoj aerodrom — najbliži je Ohrid (oko 1h vožnje), Skoplje je alternativa.', c:'Bitolj', k:'own', t:'1h', alt:'Skoplje'},
  'tetovo': {nearest:'Skoplje', note:'Tetovo nema svoj aerodrom — najbliži je Skoplje (oko 30 min vožnje).', c:'Tetovo', k:'own', t:'30 min'},
  'kumanovo': {nearest:'Skoplje', note:'Kumanovo nema svoj aerodrom — najbliži je Skoplje (oko 30 min vožnje).', c:'Kumanovo', k:'own', t:'30 min'},
  'gostivar': {nearest:'Skoplje', note:'Gostivar nema svoj aerodrom — najbliži je Skoplje (oko 45 min vožnje).', c:'Gostivar', k:'own', t:'45 min'},
  'strumica': {nearest:'Skoplje', note:'Strumica nema svoj aerodrom — najbliži je Skoplje (oko 1h30 vožnje).', c:'Strumica', k:'own', t:'1h30'},
  'prilep': {nearest:'Ohrid', note:'Prilep nema svoj aerodrom — najbliži je Ohrid (oko 1h vožnje), Skoplje je alternativa.', c:'Prilep', k:'own', t:'1h', alt:'Skoplje'},
  'struga': {nearest:'Ohrid', note:'Struga nema svoj aerodrom — najbliži je Ohrid (oko 20 min vožnje).', c:'Struga', k:'own', t:'20 min'},
  'veles': {nearest:'Skoplje', note:'Veles nema svoj aerodrom — najbliži je Skoplje (oko 40 min vožnje).', c:'Veles', k:'own', t:'40 min'},
  // --- Kosovo ---
  'pristina': {hasAirport:true},
  'prizren': {nearest:'Priština', note:'Prizren nema svoj aerodrom — najbliži je Priština (oko 1h30 vožnje).', c:'Prizren', k:'own', t:'1h30'},
  'pec': {nearest:'Priština', note:'Peć nema svoj aerodrom — najbliži je Priština (oko 1h30 vožnje), Podgorica je alternativa.', c:'Peć', k:'own', t:'1h30', alt:'Podgorica'},
  'djakovica': {nearest:'Priština', note:'Đakovica nema svoj aerodrom — najbliži je Priština (oko 1h vožnje).', c:'Đakovica', k:'own', t:'1h'},
  'mitrovica': {nearest:'Priština', note:'Mitrovica nema svoj aerodrom — najbliži je Priština (oko 40 min vožnje).', c:'Mitrovica', k:'own', t:'40 min'},
  // --- Albanija ---
  'tirana': {hasAirport:true},
  'skadar': {nearest:'Podgorica'},
  'skadarsko jezero': {nearest:'Podgorica', note:'Skadarsko jezero nema svoj aerodrom — najbliži je Podgorica (oko 30 min vožnje).', c:'Skadarsko jezero', k:'own', t:'30 min'},
  'sarande': {nearest:'Tirana'},
  'vlore': {nearest:'Tirana', note:'Vlorë nema svoj aerodrom — najbliži je Tirana (oko 2h vožnje).', c:'Vlorë', k:'own', t:'2h'},
  'durres': {nearest:'Tirana', note:'Durrës nema svoj aerodrom — najbliži je Tirana (oko 30 min vožnje).', c:'Durrës', k:'own', t:'30 min'},
  // --- Slovenija: aerodromi ---
  'ljubljana': {hasAirport:true},
  'maribor': {hasAirport:true, limited:true},
  // --- Slovenija: bez sopstvenog aerodroma ---
  'bled': {nearest:'Ljubljana', note:'Bled nema svoj aerodrom — najbliži je Ljubljana (oko 40 min vožnje).', c:'Bled', k:'own', t:'40 min'},
  'kranjska gora': {nearest:'Ljubljana', note:'Kranjska Gora nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Kranjska Gora', k:'own', t:'1h'},
  'kranj': {nearest:'Ljubljana', note:'Kranj nema svoj aerodrom — najbliži je Ljubljana (oko 30 min vožnje).', c:'Kranj', k:'own', t:'30 min'},
  'bohinj': {nearest:'Ljubljana', note:'Bohinj nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Bohinj', k:'own', t:'1h'},
  'bovec': {nearest:'Ljubljana', note:'Bovec nema svoj aerodrom — najbliži je Ljubljana (oko 1h30 vožnje).', c:'Bovec', k:'own', t:'1h30'},
  'kobarid': {nearest:'Ljubljana', note:'Kobarid nema svoj aerodrom — najbliži je Ljubljana (oko 1h30 vožnje).', c:'Kobarid', k:'own', t:'1h30'},
  'logarska dolina': {nearest:'Ljubljana', note:'Logarska Dolina nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Logarska Dolina', k:'own', t:'1h'},
  'idrija': {nearest:'Ljubljana', note:'Idrija nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Idrija', k:'own', t:'1h'},
  'postojna': {nearest:'Ljubljana', note:'Postojna nema svoj aerodrom — najbliži je Ljubljana (oko 45 min vožnje).', c:'Postojna', k:'own', t:'45 min'},
  'škocjanske jame': {nearest:'Ljubljana', note:'Škocjanske jame nemaju aerodrom u blizini — najbliži je Ljubljana (oko 1h vožnje).', c:'Škocjanske jame', k:'nearby', t:'1h'},
  'predjama': {nearest:'Ljubljana', note:'Predjama nema svoj aerodrom — najbliži je Ljubljana (oko 45 min vožnje).', c:'Predjama', k:'own', t:'45 min'},
  'vintgar': {nearest:'Ljubljana', note:'Vintgar nema svoj aerodrom — najbliži je Ljubljana (oko 45 min vožnje).', c:'Vintgar', k:'own', t:'45 min'},
  'kamnik': {nearest:'Ljubljana', note:'Kamnik nema svoj aerodrom — najbliži je Ljubljana (oko 30 min vožnje).', c:'Kamnik', k:'own', t:'30 min'},
  'celje': {nearest:'Ljubljana', note:'Celje nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Celje', k:'own', t:'1h'},
  'novo mesto': {nearest:'Ljubljana', note:'Novo Mesto nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Novo Mesto', k:'own', t:'1h'},
  'rogaška slatina': {nearest:'Ljubljana', note:'Rogaška Slatina nema svoj aerodrom — najbliži je Ljubljana (oko 1h30 vožnje).', c:'Rogaška Slatina', k:'own', t:'1h30'},
  'dolenjske toplice': {nearest:'Ljubljana', note:'Dolenjske Toplice nemaju aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Dolenjske Toplice', k:'plain', t:'1h'},
  'laško': {nearest:'Ljubljana', note:'Laško nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Laško', k:'own', t:'1h'},
  'triglav': {nearest:'Ljubljana', note:'Triglav nema aerodrom u blizini — najbliži je Ljubljana (oko 1h30 vožnje).', c:'Triglav', k:'nearby', t:'1h30'},
  'vogel': {nearest:'Ljubljana', note:'Vogel nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Vogel', k:'own', t:'1h'},
  'krvavec': {nearest:'Ljubljana', note:'Krvavec nema svoj aerodrom — najbliži je Ljubljana (oko 40 min vožnje).', c:'Krvavec', k:'own', t:'40 min'},
  'mangart': {nearest:'Ljubljana', note:'Mangart nema svoj aerodrom — najbliži je Ljubljana (oko 1h30 vožnje).', c:'Mangart', k:'own', t:'1h30'},
  'škofja loka': {nearest:'Ljubljana', note:'Škofja Loka nema svoj aerodrom — najbliži je Ljubljana (oko 30 min vožnje).', c:'Škofja Loka', k:'own', t:'30 min'},
  'nova gorica': {nearest:'Ljubljana', note:'Nova Gorica nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Nova Gorica', k:'own', t:'1h'},
  'jesenice': {nearest:'Ljubljana', note:'Jesenice nema svoj aerodrom — najbliži je Ljubljana (oko 40 min vožnje).', c:'Jesenice', k:'own', t:'40 min'},
  'velenje': {nearest:'Ljubljana', note:'Velenje nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Velenje', k:'own', t:'1h'},
  'čatež': {nearest:'Ljubljana', note:'Čatež nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Čatež', k:'own', t:'1h'},
  'ptuj': {nearest:'Maribor', note:'Ptuj nema svoj aerodrom — najbliži je Maribor (oko 20 min vožnje).', c:'Ptuj', k:'own', t:'20 min'},
  'terme ptuj': {nearest:'Maribor', note:'Terme Ptuj nemaju aerodrom — najbliži je Maribor (oko 20 min vožnje).', c:'Terme Ptuj', k:'plain', t:'20 min'},
  'pohorje': {nearest:'Maribor', note:'Pohorje nema svoj aerodrom — najbliži je Maribor (oko 20 min vožnje).', c:'Pohorje', k:'own', t:'20 min'},
  'slovenj gradec': {nearest:'Maribor', note:'Slovenj Gradec nema svoj aerodrom — najbliži je Maribor (oko 50 min vožnje).', c:'Slovenj Gradec', k:'own', t:'50 min'},
  'murska sobota': {nearest:'Maribor', note:'Murska Sobota nema svoj aerodrom — najbliži je Maribor (oko 1h vožnje).', c:'Murska Sobota', k:'own', t:'1h'},
  'moravske toplice': {nearest:'Maribor', note:'Moravske Toplice nemaju aerodrom — najbliži je Maribor (oko 1h vožnje).', c:'Moravske Toplice', k:'plain', t:'1h'},
  'radenci': {nearest:'Maribor', note:'Radenci nemaju aerodrom — najbliži je Maribor (oko 1h vožnje).', c:'Radenci', k:'plain', t:'1h'},
  'koper': {nearest:'Trst', note:'Koper nema svoj aerodrom — najbliži je Trst u Italiji (oko 30 min vožnje), Ljubljana je alternativa.', c:'Koper', k:'own', t:'30 min', cc:'Italiji', alt:'Ljubljana'},
  'piran': {nearest:'Trst', note:'Piran nema svoj aerodrom — najbliži je Trst u Italiji (oko 40 min vožnje), Ljubljana je alternativa.', c:'Piran', k:'own', t:'40 min', cc:'Italiji', alt:'Ljubljana'},
  'portorož': {nearest:'Trst', note:'Portorož nema svoj aerodrom — najbliži je Trst u Italiji (oko 35 min vožnje), Ljubljana je alternativa.', c:'Portorož', k:'own', t:'35 min', cc:'Italiji', alt:'Ljubljana'},
  'izola': {nearest:'Trst', note:'Izola nema svoj aerodrom — najbliži je Trst u Italiji (oko 35 min vožnje), Ljubljana je alternativa.', c:'Izola', k:'own', t:'35 min', cc:'Italiji', alt:'Ljubljana'},
  'ankaran': {nearest:'Trst', note:'Ankaran nema svoj aerodrom — najbliži je Trst u Italiji (oko 25 min vožnje), Ljubljana je alternativa.', c:'Ankaran', k:'own', t:'25 min', cc:'Italiji', alt:'Ljubljana'},
  // --- Mađarska (relevantno za sever Srbije) ---
  'budimpesta': {hasAirport:true},
  'segedin': {nearest:'Budimpešta', note:'Segedin nema svoj aerodrom — najbliži je Budimpešta (oko 2h vožnje).', c:'Segedin', k:'own', t:'2h'},
  // --- Turska: aerodromi ---
  'istanbul': {hasAirport:true},
  'ankara': {hasAirport:true},
  'izmir': {hasAirport:true},
  'antalija': {hasAirport:true},
  'bodrum': {hasAirport:true},
  'kajseri': {hasAirport:true},
  'adana': {hasAirport:true},
  'gaziantep': {hasAirport:true},
  'trabzon': {hasAirport:true},
  'samsun': {hasAirport:true},
  'konja': {hasAirport:true},
  'denizli': {hasAirport:true},
  'malatja': {hasAirport:true},
  'eskišehir': {hasAirport:true, limited:true},
  'bursa': {hasAirport:true, limited:true},
  'dalaman': {hasAirport:true, limited:true},
  'canakkale': {hasAirport:true, limited:true},
  'sanliurfa': {hasAirport:true, limited:true},
  'nevsehir': {hasAirport:true, limited:true},
  'van': {hasAirport:true, limited:true},
  'dijarbakir': {hasAirport:true, limited:true},
  'erzurum': {hasAirport:true, limited:true},
  'sivas': {hasAirport:true, limited:true},
  'gazipasa': {hasAirport:true, limited:true},
  // --- Turska: bez sopstvenog aerodroma ---
  'mersin': {nearest:'Adana', note:'Mersin nema svoj aerodrom — najbliži je Adana (oko 1h vožnje).', c:'Mersin', k:'own', t:'1h'},
  'kapadokija': {nearest:'Nevsehir'},
  'marmaris': {nearest:'Dalaman', note:'Marmaris nema svoj aerodrom — najbliži je Dalaman (oko 1h vožnje).', c:'Marmaris', k:'own', t:'1h'},
  'fetije': {nearest:'Dalaman', note:'Fetije nema svoj aerodrom — najbliži je Dalaman (oko 50 min vožnje).', c:'Fetije', k:'own', t:'50 min'},
  'side': {nearest:'Antalija', note:'Side nema svoj aerodrom — najbliži je Antalija (oko 1h vožnje).', c:'Side', k:'own', t:'1h'},
  'alanja': {nearest:'Antalija'},
  'kušadasi': {nearest:'Izmir', note:'Kušadasi nema svoj aerodrom — najbliži je Izmir (oko 1h30 vožnje).', c:'Kušadasi', k:'own', t:'1h30'},
  'česme': {nearest:'Izmir', note:'Česme nema svoj aerodrom — najbliži je Izmir (oko 1h vožnje).', c:'Česme', k:'own', t:'1h'},
  'pamukale': {nearest:'Denizli', note:'Pamukale nema svoj aerodrom — najbliži je Denizli (oko 30 min vožnje).', c:'Pamukale', k:'own', t:'30 min'},
  'jalova': {nearest:'Istanbul'},
  'afjon karahisar': {nearest:'Ankara', note:'Afjon Karahisar nema veći aerodrom — najbliži je Ankara (oko 3h vožnje).', c:'Afjon Karahisar', k:'major', t:'3h'},
  'haymana': {nearest:'Ankara', note:'Haymana nema svoj aerodrom — najbliži je Ankara (oko 1h vožnje).', c:'Haymana', k:'own', t:'1h'},
  'kizildžahamam': {nearest:'Ankara', note:'Kizildžahamam nema svoj aerodrom — najbliži je Ankara (oko 1h vožnje).', c:'Kizildžahamam', k:'own', t:'1h'},
  'efes': {nearest:'Izmir', note:'Efes nema svoj aerodrom — najbliži je Izmir (oko 1h vožnje).', c:'Efes', k:'own', t:'1h'},
  'troja': {nearest:'Canakkale', note:'Troja nema svoj aerodrom — najbliži je Čanakale (oko 30 min vožnje).', c:'Troja', k:'own', t:'30 min', nn:'Čanakale'},
  'pergamon': {nearest:'Izmir', note:'Pergamon nema svoj aerodrom — najbliži je Izmir (oko 1h30 vožnje).', c:'Pergamon', k:'own', t:'1h30'},
  'hijerapolis': {nearest:'Denizli', note:'Hijerapolis nema svoj aerodrom — najbliži je Denizli (oko 30 min vožnje).', c:'Hijerapolis', k:'own', t:'30 min'},
  'sumela': {nearest:'Trabzon', note:'Sumela nema svoj aerodrom — najbliži je Trabzon (oko 1h vožnje).', c:'Sumela', k:'own', t:'1h'},
  'nemrut': {nearest:'Malatja', note:'Nemrut nema svoj aerodrom — najbliži je Malatja (oko 2h vožnje).', c:'Nemrut', k:'own', t:'2h'},
  'safranbolu': {nearest:'Ankara', note:'Safranbolu nema veći aerodrom — najbliži je Ankara (oko 3h vožnje).', c:'Safranbolu', k:'major', t:'3h'},
  'gjobekli tepe': {nearest:'Sanliurfa', note:'Gjobekli Tepe nema svoj aerodrom — najbliži je Šanlıurfa (oko 1h vožnje), Gaziantep je alternativa.', c:'Gjobekli Tepe', k:'own', t:'1h', nn:'Šanlıurfa', alt:'Gaziantep'},
  'kaš': {nearest:'Dalaman', note:'Kaš nema svoj aerodrom — najbliži je Dalaman (oko 2h vožnje).', c:'Kaš', k:'own', t:'2h'},
  'kalkan': {nearest:'Dalaman', note:'Kalkan nema svoj aerodrom — najbliži je Dalaman (oko 1h30 vožnje).', c:'Kalkan', k:'own', t:'1h30'},
  'datča': {nearest:'Dalaman', note:'Datča nema svoj aerodrom — najbliži je Dalaman (oko 1h30 vožnje).', c:'Datča', k:'own', t:'1h30'},
  'didim': {nearest:'Izmir', note:'Didim nema svoj aerodrom — najbliži je Izmir (oko 2h vožnje).', c:'Didim', k:'own', t:'2h'},
  'ajvalik': {nearest:'Izmir', note:'Ajvalik nema svoj aerodrom — najbliži je Izmir (oko 2h vožnje).', c:'Ajvalik', k:'own', t:'2h'},
  'silifke': {nearest:'Adana', note:'Silifke nema svoj aerodrom — najbliži je Adana (oko 2h vožnje).', c:'Silifke', k:'own', t:'2h'},
  'foča (turska)': {nearest:'Izmir', note:'Foča nema svoj aerodrom — najbliži je Izmir (oko 1h vožnje).', c:'Foča', k:'own', t:'1h'},
  // --- Portugalija: aerodromi ---
  'lisabon': {hasAirport:true},
  'porto': {hasAirport:true},
  'faro': {hasAirport:true},
  'madeira': {hasAirport:true},
  'azori': {hasAirport:true, limited:true},
  'tersejra': {hasAirport:true, limited:true},
  // --- Portugalija: bez sopstvenog aerodroma ---
  'koimbra': {nearest:'Porto', note:'Koimbra nema svoj aerodrom — najbliži je Porto (oko 1h vožnje), Lisabon je alternativa.', c:'Koimbra', k:'own', t:'1h', alt:'Lisabon'},
  'braga': {nearest:'Porto', note:'Braga nema svoj aerodrom — najbliži je Porto (oko 50 min vožnje).', c:'Braga', k:'own', t:'50 min'},
  'sintra': {nearest:'Lisabon', note:'Sintra nema svoj aerodrom — najbliži je Lisabon (oko 30 min vožnje).', c:'Sintra', k:'own', t:'30 min'},
  'albufeira': {nearest:'Faro', note:'Albufeira nema svoj aerodrom — najbliži je Faro (oko 40 min vožnje).', c:'Albufeira', k:'own', t:'40 min'},
  'evora': {nearest:'Lisabon', note:'Evora nema svoj aerodrom — najbliži je Lisabon (oko 1h30 vožnje).', c:'Evora', k:'own', t:'1h30'},
  'kaskais': {nearest:'Lisabon', note:'Kaskais nema svoj aerodrom — najbliži je Lisabon (oko 30 min vožnje).', c:'Kaskais', k:'own', t:'30 min'},
  'nazare': {nearest:'Lisabon', note:'Nazare nema svoj aerodrom — najbliži je Lisabon (oko 1h30 vožnje).', c:'Nazare', k:'own', t:'1h30'},
  'fatima': {nearest:'Lisabon', note:'Fatima nema svoj aerodrom — najbliži je Lisabon (oko 1h30 vožnje), Porto je alternativa.', c:'Fatima', k:'own', t:'1h30', alt:'Porto'},
  // --- Francuska: aerodromi ---
  'pariz': {hasAirport:true},
  'nica': {hasAirport:true},
  'lion': {hasAirport:true},
  'bordo': {hasAirport:true},
  'marselj': {hasAirport:true},
  // --- Velika Britanija: aerodromi ---
  'london': {hasAirport:true},
  'edinburg': {hasAirport:true},
  'mancester': {hasAirport:true},
  'liverpul': {hasAirport:true, limited:true},
  // --- Holandija: aerodromi ---
  'amsterdam': {hasAirport:true},
  'roterdam': {hasAirport:true, limited:true},
  // --- Nemačka: aerodromi ---
  'berlin': {hasAirport:true},
  'minhen': {hasAirport:true},
  'hamburg': {hasAirport:true},
  'frankfurt': {hasAirport:true},
  'keln': {hasAirport:true},
  'diseldorf': {hasAirport:true},
  'stutgart': {hasAirport:true},
  'drezden': {hasAirport:true, limited:true},
  // --- Poljska: aerodromi ---
  'varsava': {hasAirport:true},
  'krakov': {hasAirport:true},
  'vroclav': {hasAirport:true},
  'gdanjsk': {hasAirport:true},
  'poznanj': {hasAirport:true, limited:true},
  'lodj': {hasAirport:true, limited:true},
  'katovice': {hasAirport:true, limited:true},
  'zesuv': {hasAirport:true, limited:true},
  'scecin': {hasAirport:true, limited:true},
  'bidgosc': {hasAirport:true, limited:true},
  'lublin': {hasAirport:true, limited:true},
  // --- Poljska: bez sopstvenog aerodroma ---
  'zakopane': {nearest:'Krakov', note:'Zakopane nema svoj aerodrom — najbliži je Krakov (oko 2h vožnje).', c:'Zakopane', k:'own', t:'2h'},
  'torunj': {nearest:'Bidgosc', note:'Torunj nema svoj aerodrom — najbliži je Bidgošć (oko 45 min vožnje), Poznanj je alternativa.', c:'Torunj', k:'own', t:'45 min', nn:'Bidgošć', alt:'Poznanj'},
  'vjelicka': {nearest:'Krakov', note:'Vjelička nema svoj aerodrom — najbliži je Krakov (oko 20 min vožnje).', c:'Vjelička', k:'own', t:'20 min'},
  'gdinja': {nearest:'Gdanjsk'},
  'censtohova': {nearest:'Katovice', note:'Čenstohova nema svoj aerodrom — najbliži je Katovice (oko 1h vožnje).', c:'Čenstohova', k:'own', t:'1h'},
  // --- Češka: aerodromi ---
  'prag': {hasAirport:true},
  'brno': {hasAirport:true, limited:true},
  'karlovi vari': {hasAirport:true, limited:true},
  'ostrava': {hasAirport:true, limited:true},
  // --- Češka: bez sopstvenog aerodroma ---
  'plzenj': {nearest:'Prag', note:'Plzenj nema komercijalni aerodrom — najbliži je Prag (oko 1h vožnje).', c:'Plzenj', k:'comm', t:'1h'},
  'ceski krumlov': {nearest:'Linc'},
  'olomouc': {nearest:'Ostrava', note:'Olomouc nema svoj aerodrom — najbliži je Ostrava (oko 40 min vožnje), Brno je alternativa.', c:'Olomouc', k:'own', t:'40 min', alt:'Brno'},
  'kutna hora': {nearest:'Prag', note:'Kutna Hora nema svoj aerodrom — najbliži je Prag (oko 1h vožnje).', c:'Kutna Hora', k:'own', t:'1h'},
  'ceske budejovice': {nearest:'Prag', note:'Češke Budejovice nemaju svoj aerodrom sa redovnim letovima — najbliži je Prag (oko 2h vožnje), Linc je alternativa.', c:'Češke Budejovice', k:'sched', t:'2h', alt:'Linc'},
  'hradec kralove': {nearest:'Prag', note:'Hradec Kralove nema svoj aerodrom — najbliži je Prag (oko 1h30 vožnje).', c:'Hradec Kralove', k:'own', t:'1h30'},
  'liberec': {nearest:'Prag', note:'Liberec nema svoj aerodrom — najbliži je Prag (oko 1h30 vožnje).', c:'Liberec', k:'own', t:'1h30'},
  // --- Švedska: aerodromi ---
  'stokholm': {hasAirport:true},
  'geteborg': {hasAirport:true},
  // --- Švajcarska: aerodromi ---
  'cirih': {hasAirport:true},
  'zeneva': {hasAirport:true},
  // --- Norveška: aerodromi ---
  'oslo': {hasAirport:true},
  // --- Danska: aerodromi ---
  'kopenhagen': {hasAirport:true},
  // --- Finska: aerodromi ---
  'helsinki': {hasAirport:true},
  // --- Irska: aerodromi ---
  'dablin': {hasAirport:true},
  // --- Belgija: aerodromi ---
  'brisel': {hasAirport:true},
  'antverpen': {hasAirport:true, limited:true},
  'sarlroa': {hasAirport:true, limited:true},
  'lijez': {hasAirport:true, limited:true},
  'ostende': {hasAirport:true, limited:true},
  // --- Belgija: bez sopstvenog aerodroma ---
  'briz': {nearest:'Brisel', note:'Briž nema svoj aerodrom — najbliži je Brisel (oko 1h vožnje).', c:'Briž', k:'own', t:'1h'},
  'gent': {nearest:'Brisel', note:'Gent nema svoj aerodrom — najbliži je Brisel (oko 45 min vožnje).', c:'Gent', k:'own', t:'45 min'},
  'namir': {nearest:'Šarlroa', note:'Namir nema svoj aerodrom — najbliži je Šarlroa (oko 45 min vožnje).', c:'Namir', k:'own', t:'45 min'},
  // --- Grčka: aerodromi ---
  'atina': {hasAirport:true},
  'solun': {hasAirport:true},
  'krf': {hasAirport:true},
  'rodos': {hasAirport:true},
  'krit': {hasAirport:true},
  'kos': {hasAirport:true},
  'iraklion': {hasAirport:true},
  'santorini': {hasAirport:true, limited:true},
  'mikonos': {hasAirport:true, limited:true},
  'zakintos': {hasAirport:true, limited:true},
  'kefalonija': {hasAirport:true, limited:true},
  'paros': {hasAirport:true, limited:true},
  'naksos': {hasAirport:true, limited:true},
  'kavala': {hasAirport:true, limited:true},
  'janjina': {hasAirport:true, limited:true},
  'kalamata': {hasAirport:true, limited:true},
  'samos': {hasAirport:true, limited:true},
  'hios': {hasAirport:true, limited:true},
  'skijatos': {hasAirport:true, limited:true},
  'milos': {hasAirport:true, limited:true},
  // --- Grčka: bez sopstvenog aerodroma ---
  'halkidiki': {nearest:'Solun', note:'Halkidiki nema svoj aerodrom — najbliži je Solun (oko 1h vožnje).', c:'Halkidiki', k:'own', t:'1h'},
  'lefkada': {nearest:'Preveza', note:'Lefkada nema svoj aerodrom — najbliži je Preveza/Aktion (oko 30 min vožnje).', c:'Lefkada', k:'own', t:'30 min', nn:'Preveza/Aktion'},
  'volos': {nearest:'Solun'},
  'patra': {nearest:'Araksos', note:'Patra nema svoj aerodrom — najbliži je Araksos (oko 45 min vožnje).', c:'Patra', k:'own', t:'45 min'},
  'larisa': {nearest:'Solun', note:'Larisa nema svoj aerodrom — najbliži je Solun (oko 1h30 vožnje).', c:'Larisa', k:'own', t:'1h30'},
  'lutraki': {nearest:'Atina', note:'Lutraki nema svoj aerodrom — najbliži je Atina (oko 1h vožnje).', c:'Lutraki', k:'own', t:'1h'},
  'edipsos': {nearest:'Atina'},
  'olimp': {nearest:'Solun', note:'Olimp nema svoj aerodrom — najbliži je Solun (oko 1h vožnje).', c:'Olimp', k:'own', t:'1h'},
  'pilion': {nearest:'Solun'},
  'meteori': {nearest:'Solun', note:'Meteori nemaju aerodrom u blizini — najbliži je Solun (oko 2h vožnje).', c:'Meteori', k:'nearby', t:'2h'},
  'delfi': {nearest:'Atina', note:'Delfi nema svoj aerodrom — najbliži je Atina (oko 2h vožnje).', c:'Delfi', k:'own', t:'2h'},
  'nafplion': {nearest:'Atina', note:'Nafplion nema svoj aerodrom — najbliži je Atina (oko 2h vožnje).', c:'Nafplion', k:'own', t:'2h'},
  'tasos': {nearest:'Kavala'},
  'skopelos': {nearest:'Skijatos'},
  'evija': {nearest:'Atina', note:'Evija nema svoj aerodrom — najbliži je Atina (oko 1h30 vožnje).', c:'Evija', k:'own', t:'1h30'},
  'idra': {nearest:'Atina'},
  'spece': {nearest:'Atina'},
  'ios': {nearest:'Santorini'},
  'egina': {nearest:'Atina'},
  'poros': {nearest:'Atina'},
  // --- Bugarska: aerodromi ---
  'sofija': {hasAirport:true},
  'varna': {hasAirport:true},
  'burgas': {hasAirport:true},
  'plovdiv': {hasAirport:true, limited:true},
  // --- Bugarska: bez sopstvenog aerodroma ---
  'nesebar': {nearest:'Burgas', note:'Nesebar nema svoj aerodrom — najbliži je Burgas (oko 40 min vožnje).', c:'Nesebar', k:'own', t:'40 min'},
  'bansko': {nearest:'Sofija', note:'Bansko nema svoj aerodrom — najbliži je Sofija (oko 2h vožnje).', c:'Bansko', k:'own', t:'2h'},
  'ruse': {nearest:'Sofija'},
  'stara zagora': {nearest:'Plovdiv', note:'Stara Zagora nema svoj aerodrom — najbliži je Plovdiv (oko 1h vožnje).', c:'Stara Zagora', k:'own', t:'1h'},
  'pleven': {nearest:'Sofija', note:'Pleven nema svoj aerodrom — najbliži je Sofija (oko 2h vožnje).', c:'Pleven', k:'own', t:'2h'},
  'veliko trnovo': {nearest:'Sofija', note:'Veliko Trnovo nema svoj aerodrom — najbliži je Sofija (oko 2h30 vožnje), Varna je alternativa.', c:'Veliko Trnovo', k:'own', t:'2h30', alt:'Varna'},
  'blagoevgrad': {nearest:'Sofija', note:'Blagoevgrad nema svoj aerodrom — najbliži je Sofija (oko 1h vožnje).', c:'Blagoevgrad', k:'own', t:'1h'},
  'sumen': {nearest:'Varna', note:'Šumen nema svoj aerodrom — najbliži je Varna (oko 1h30 vožnje).', c:'Šumen', k:'own', t:'1h30'},
  'sliven': {nearest:'Burgas', note:'Sliven nema svoj aerodrom — najbliži je Burgas (oko 1h30 vožnje).', c:'Sliven', k:'own', t:'1h30'},
  'vidin': {nearest:'Sofija', note:'Vidin nema svoj aerodrom — najbliži je Sofija (oko 3h vožnje).', c:'Vidin', k:'own', t:'3h'},
  'dobric': {nearest:'Varna', note:'Dobrič nema svoj aerodrom — najbliži je Varna (oko 45 min vožnje).', c:'Dobrič', k:'own', t:'45 min'},
  'kjustendil': {nearest:'Sofija', note:'Kjustendil nema svoj aerodrom — najbliži je Sofija (oko 1h30 vožnje).', c:'Kjustendil', k:'own', t:'1h30'},
  'gabrovo': {nearest:'Sofija', note:'Gabrovo nema svoj aerodrom — najbliži je Sofija (oko 2h30 vožnje), Plovdiv je alternativa.', c:'Gabrovo', k:'own', t:'2h30', alt:'Plovdiv'},
  'haskovo': {nearest:'Plovdiv', note:'Haskovo nema svoj aerodrom — najbliži je Plovdiv (oko 1h vožnje).', c:'Haskovo', k:'own', t:'1h'},
  'sandanski': {nearest:'Sofija', note:'Sandanski nema svoj aerodrom — najbliži je Sofija (oko 2h vožnje).', c:'Sandanski', k:'own', t:'2h'},
  'velingrad': {nearest:'Sofija', note:'Velingrad nema svoj aerodrom — najbliži je Sofija (oko 1h30 vožnje), Plovdiv je alternativa.', c:'Velingrad', k:'own', t:'1h30', alt:'Plovdiv'},
  'hisarja': {nearest:'Plovdiv', note:'Hisarja nema svoj aerodrom — najbliži je Plovdiv (oko 40 min vožnje).', c:'Hisarja', k:'own', t:'40 min'},
  'devin': {nearest:'Plovdiv', note:'Devin nema svoj aerodrom — najbliži je Plovdiv (oko 1h30 vožnje).', c:'Devin', k:'own', t:'1h30'},
  'pavel banja': {nearest:'Plovdiv', note:'Pavel Banja nema svoj aerodrom — najbliži je Plovdiv (oko 1h vožnje).', c:'Pavel Banja', k:'own', t:'1h'},
  'bankja': {nearest:'Sofija', note:'Bankja nema svoj aerodrom — najbliži je Sofija (oko 30 min vožnje).', c:'Bankja', k:'own', t:'30 min'},
  'borovec': {nearest:'Sofija', note:'Borovec nema svoj aerodrom — najbliži je Sofija (oko 1h30 vožnje).', c:'Borovec', k:'own', t:'1h30'},
  'pamporovo': {nearest:'Plovdiv', note:'Pamporovo nema svoj aerodrom — najbliži je Plovdiv (oko 1h30 vožnje).', c:'Pamporovo', k:'own', t:'1h30'},
  'vitosa': {nearest:'Sofija', note:'Vitoša nema svoj aerodrom — najbliži je Sofija (oko 30 min vožnje).', c:'Vitoša', k:'own', t:'30 min'},
  'cepelare': {nearest:'Plovdiv', note:'Čepelare nema svoj aerodrom — najbliži je Plovdiv (oko 1h30 vožnje).', c:'Čepelare', k:'own', t:'1h30'},
  'rila': {nearest:'Sofija', note:'Rila nema svoj aerodrom — najbliži je Sofija (oko 2h vožnje).', c:'Rila', k:'own', t:'2h'},
  'koprivstica': {nearest:'Sofija', note:'Koprivštica nema svoj aerodrom — najbliži je Sofija (oko 1h30 vožnje), Plovdiv je alternativa.', c:'Koprivštica', k:'own', t:'1h30', alt:'Plovdiv'},
  'melnik': {nearest:'Sofija', note:'Melnik nema svoj aerodrom — najbliži je Sofija (oko 2h30 vožnje).', c:'Melnik', k:'own', t:'2h30'},
  'rilski manastir': {nearest:'Sofija', note:'Rilski manastir nema svoj aerodrom — najbliži je Sofija (oko 2h vožnje).', c:'Rilski manastir', k:'own', t:'2h'},
  'trjavna': {nearest:'Sofija', note:'Trjavna nema svoj aerodrom — najbliži je Sofija (oko 2h30 vožnje), Varna je alternativa.', c:'Trjavna', k:'own', t:'2h30', alt:'Varna'},
  'arbanasi': {nearest:'Varna', note:'Arbanasi nema svoj aerodrom — najbliži je Varna (oko 1h30 vožnje), Sofija je alternativa.', c:'Arbanasi', k:'own', t:'1h30', alt:'Sofija'},
  'sozopol': {nearest:'Burgas', note:'Sozopol nema svoj aerodrom — najbliži je Burgas (oko 35 min vožnje).', c:'Sozopol', k:'own', t:'35 min'},
  'suncev breg': {nearest:'Burgas', note:'Sunčev Breg nema svoj aerodrom — najbliži je Burgas (oko 30 min vožnje).', c:'Sunčev Breg', k:'own', t:'30 min'},
  'zlatni pjasci': {nearest:'Varna', note:'Zlatni Pjasci nemaju aerodrom — najbliži je Varna (oko 20 min vožnje).', c:'Zlatni Pjasci', k:'plain', t:'20 min'},
  'primorsko': {nearest:'Burgas', note:'Primorsko nema svoj aerodrom — najbliži je Burgas (oko 1h vožnje).', c:'Primorsko', k:'own', t:'1h'},
  'balcik': {nearest:'Varna', note:'Balčik nema svoj aerodrom — najbliži je Varna (oko 40 min vožnje).', c:'Balčik', k:'own', t:'40 min'},
  'kavarna': {nearest:'Varna', note:'Kavarna nema svoj aerodrom — najbliži je Varna (oko 1h vožnje).', c:'Kavarna', k:'own', t:'1h'},
  'carevo': {nearest:'Burgas', note:'Carevo nema svoj aerodrom — najbliži je Burgas (oko 1h vožnje).', c:'Carevo', k:'own', t:'1h'},
  'pomorije': {nearest:'Burgas', note:'Pomorije nema svoj aerodrom — najbliži je Burgas (oko 20 min vožnje).', c:'Pomorije', k:'own', t:'20 min'},
  'ahtopol': {nearest:'Burgas', note:'Ahtopol nema svoj aerodrom — najbliži je Burgas (oko 1h30 vožnje).', c:'Ahtopol', k:'own', t:'1h30'},
  // --- Rumunija: aerodromi ---
  'bukurest': {hasAirport:true},
  'kluz': {hasAirport:true, limited:true},
  'konstanca': {hasAirport:true, limited:true},
  'sibiu': {hasAirport:true, limited:true},
  'temisvar': {hasAirport:true, limited:true},
  'jasi': {hasAirport:true, limited:true},
  'brasov': {hasAirport:true, limited:true},
  // --- Rumunija: bez sopstvenog aerodroma ---
  'sinaja': {nearest:'Bukurešt'},
  'bran': {nearest:'Brašov', note:'Bran nema svoj aerodrom — najbliži je Brašov (oko 30 min vožnje).', c:'Bran', k:'own', t:'30 min'},
  'mamaja': {nearest:'Konstanca'},
  // --- Italija: aerodromi ---
  'rim': {hasAirport:true},
  'milano': {hasAirport:true},
  'napulj': {hasAirport:true},
  'venecija': {hasAirport:true},
  'bolonja': {hasAirport:true},
  'torino': {hasAirport:true},
  'bari': {hasAirport:true},
  'sicilija': {hasAirport:true},
  'sardinija': {hasAirport:true},
  'kaljari': {hasAirport:true},
  'palermo': {hasAirport:true},
  'katanija': {hasAirport:true},
  'pisa': {hasAirport:true},
  'trst': {hasAirport:true},
  'firenca': {hasAirport:true, limited:true},
  'verona': {hasAirport:true, limited:true},
  'djenova': {hasAirport:true, limited:true},
  'parma': {hasAirport:true, limited:true},
  'perudja': {hasAirport:true, limited:true},
  'rimini': {hasAirport:true, limited:true},
  'bolcano': {hasAirport:true, limited:true},
  'brindizi': {hasAirport:true, limited:true},
  'olbija': {hasAirport:true, limited:true},
  'algero': {hasAirport:true, limited:true},
  'trapani': {hasAirport:true, limited:true},
  'ankona': {hasAirport:true, limited:true},
  'bergamo': {hasAirport:true, limited:true},
  'peskara': {hasAirport:true, limited:true},
  'redjokalabrija': {hasAirport:true, limited:true},
  'lamecijaterme': {hasAirport:true, limited:true},
  // --- Italija: bez sopstvenog aerodroma ---
  'lece': {nearest:'Brindizi', note:'Leče nema svoj aerodrom — najbliži je Brindizi (oko 40 min vožnje).', c:'Leče', k:'own', t:'40 min'},
  'padova': {nearest:'Venecija', note:'Padova nema svoj aerodrom — najbliži je Venecija (oko 40 min vožnje).', c:'Padova', k:'own', t:'40 min'},
  'modena': {nearest:'Bolonja', note:'Modena nema svoj aerodrom — najbliži je Bolonja (oko 40 min vožnje).', c:'Modena', k:'own', t:'40 min'},
  'bresija': {nearest:'Milano', note:'Brešija nema svoj aerodrom — najbliži je Milano (oko 1h vožnje), Verona je alternativa.', c:'Brešija', k:'own', t:'1h', alt:'Verona'},
  'salerno': {nearest:'Napulj', note:'Salerno nema svoj aerodrom — najbliži je Napulj (oko 50 min vožnje).', c:'Salerno', k:'own', t:'50 min'},
  'abano terme': {nearest:'Venecija', note:'Abano Terme nema svoj aerodrom — najbliži je Venecija (oko 50 min vožnje), Padova je alternativa.', c:'Abano Terme', k:'own', t:'50 min', alt:'Padova'},
  'montekatini terme': {nearest:'Firenca', note:'Montekatini Terme nema svoj aerodrom — najbliži je Firenca (oko 50 min vožnje), Pisa je alternativa.', c:'Montekatini Terme', k:'own', t:'50 min', alt:'Pisa'},
  'fjudji': {nearest:'Rim', note:'Fjuđi nema svoj aerodrom — najbliži je Rim (oko 1h vožnje).', c:'Fjuđi', k:'own', t:'1h'},
  'salsomadjore terme': {nearest:'Parma', note:'Salsomađore Terme nema svoj aerodrom — najbliži je Parma (oko 40 min vožnje).', c:'Salsomađore Terme', k:'own', t:'40 min'},
  'dolomiti': {nearest:'Verona', note:'Dolomiti nemaju aerodrom u blizini — najbliži je Verona (oko 2h vožnje), Venecija je alternativa.', c:'Dolomiti', k:'nearby', t:'2h', alt:'Venecija'},
  'kortina d\'ampeco': {nearest:'Verona', note:'Kortina d\'Ampeco nema svoj aerodrom — najbliži je Verona (oko 2h vožnje).', c:'Kortina d\'Ampeco', k:'own', t:'2h'},
  'val gardena': {nearest:'Bolcano'},
  'livinjo': {nearest:'Milano'},
  'etna': {nearest:'Katanija', note:'Etna nema svoj aerodrom — najbliži je Katanija (oko 30 min vožnje).', c:'Etna', k:'own', t:'30 min'},
  'pompeji': {nearest:'Napulj', note:'Pompeji nema svoj aerodrom — najbliži je Napulj (oko 40 min vožnje).', c:'Pompeji', k:'own', t:'40 min'},
  'asizi': {nearest:'Perudja', note:'Asizi nema svoj aerodrom — najbliži je Perudja (oko 30 min vožnje).', c:'Asizi', k:'own', t:'30 min'},
  'sijena': {nearest:'Firenca', note:'Sijena nema svoj aerodrom — najbliži je Firenca (oko 1h vožnje).', c:'Sijena', k:'own', t:'1h'},
  'san djimonjano': {nearest:'Firenca', note:'San Đimonjano nema svoj aerodrom — najbliži je Firenca (oko 1h vožnje).', c:'San Đimonjano', k:'own', t:'1h'},
  'orvieto': {nearest:'Rim', note:'Orvieto nema svoj aerodrom — najbliži je Rim (oko 1h30 vožnje), Perudja je alternativa.', c:'Orvieto', k:'own', t:'1h30', alt:'Perudja'},
  'ravena': {nearest:'Bolonja', note:'Ravena nema svoj aerodrom — najbliži je Bolonja (oko 1h vožnje).', c:'Ravena', k:'own', t:'1h'},
  'amalfi': {nearest:'Napulj', note:'Amalfi nema svoj aerodrom — najbliži je Napulj (oko 1h vožnje).', c:'Amalfi', k:'own', t:'1h'},
  'pozitano': {nearest:'Napulj', note:'Pozitano nema svoj aerodrom — najbliži je Napulj (oko 1h vožnje).', c:'Pozitano', k:'own', t:'1h'},
  'sorento': {nearest:'Napulj', note:'Sorento nema svoj aerodrom — najbliži je Napulj (oko 1h vožnje).', c:'Sorento', k:'own', t:'1h'},
  'kapri': {nearest:'Napulj'},
  'portofino': {nearest:'Đenova', note:'Portofino nema svoj aerodrom — najbliži je Đenova (oko 40 min vožnje).', c:'Portofino', k:'own', t:'40 min'},
  'elba': {nearest:'Pisa'},
  'taormina': {nearest:'Katanija', note:'Taormina nema svoj aerodrom — najbliži je Katanija (oko 45 min vožnje).', c:'Taormina', k:'own', t:'45 min'},
  'luka': {nearest:'Pisa', note:'Luka nema svoj aerodrom — najbliži je Pisa (oko 25 min vožnje).', c:'Luka', k:'own', t:'25 min'},
  'cinkve tere': {nearest:'Đenova', note:'Činkve Tere nema svoj aerodrom — najbliži je Đenova (oko 1h vožnje), Pisa je alternativa.', c:'Činkve Tere', k:'own', t:'1h', alt:'Pisa'},
  'san marino': {nearest:'Rimini', note:'San Marino nema svoj aerodrom — najbliži je Rimini (oko 30 min vožnje).', c:'San Marino', k:'own', t:'30 min'},
  'vatikan': {nearest:'Rim'},
  'mantova': {nearest:'Verona', note:'Mantova nema svoj aerodrom — najbliži je Verona (oko 45 min vožnje).', c:'Mantova', k:'own', t:'45 min'},
  'ferara': {nearest:'Bolonja', note:'Ferara nema svoj aerodrom — najbliži je Bolonja (oko 40 min vožnje).', c:'Ferara', k:'own', t:'40 min'},
  'urbino': {nearest:'Ankona', note:'Urbino nema svoj aerodrom — najbliži je Ankona (oko 1h vožnje).', c:'Urbino', k:'own', t:'1h'},
  'matera': {nearest:'Bari', note:'Matera nema svoj aerodrom — najbliži je Bari (oko 1h vožnje).', c:'Matera', k:'own', t:'1h'},
  'alberobelo': {nearest:'Bari', note:'Alberobelo nema svoj aerodrom — najbliži je Bari (oko 1h vožnje), Brindizi je alternativa.', c:'Alberobelo', k:'own', t:'1h', alt:'Brindizi'},
  'ostuni': {nearest:'Brindizi', note:'Ostuni nema svoj aerodrom — najbliži je Brindizi (oko 40 min vožnje).', c:'Ostuni', k:'own', t:'40 min'},
  'poljinjano a mare': {nearest:'Bari', note:'Poljinjano a Mare nema svoj aerodrom — najbliži je Bari (oko 30 min vožnje).', c:'Poljinjano a Mare', k:'own', t:'30 min'},
  // --- Španija: aerodromi ---
  'barselona': {hasAirport:true},
  'madrid': {hasAirport:true},
  'valensija': {hasAirport:true},
  'malaga': {hasAirport:true},
  'majorka': {hasAirport:true},
  'sevilja': {hasAirport:true},
  'alikante': {hasAirport:true},
  'bilbao': {hasAirport:true},
  'tenerife': {hasAirport:true},
  'gran kanarija': {hasAirport:true},
  'lanzarote': {hasAirport:true},
  'fuerteventura': {hasAirport:true},
  'ibica': {hasAirport:true, limited:true},
  'granada': {hasAirport:true, limited:true},
  'san sebastijan': {hasAirport:true, limited:true},
  'santjago de kompostela': {hasAirport:true, limited:true},
  'saragosa': {hasAirport:true, limited:true},
  'vigo': {hasAirport:true, limited:true},
  'korunja': {hasAirport:true, limited:true},
  'ovijedo': {hasAirport:true, limited:true},
  'santander': {hasAirport:true, limited:true},
  'valjadolid': {hasAirport:true, limited:true},
  'mursija': {hasAirport:true, limited:true},
  'almerija': {hasAirport:true, limited:true},
  'herez': {hasAirport:true, limited:true},
  'reus': {hasAirport:true, limited:true},
  'girona': {hasAirport:true, limited:true},
  'menorka': {hasAirport:true, limited:true},
  'pamplona': {hasAirport:true, limited:true},
  'melilja': {hasAirport:true, limited:true},
  // --- Španija: bez sopstvenog aerodroma ---
  'salamanka': {nearest:'Madrid', note:'Salamanka nema svoj aerodrom sa redovnim letovima — najbliži je Madrid (oko 2h30 vožnje).', c:'Salamanka', k:'sched', t:'2h30'},
  'toledo': {nearest:'Madrid', note:'Toledo nema svoj aerodrom — najbliži je Madrid (oko 1h vožnje).', c:'Toledo', k:'own', t:'1h'},
  'kordoba': {nearest:'Sevilja', note:'Kordoba nema svoj aerodrom — najbliži je Sevilja (oko 1h30 vožnje), Malaga je alternativa.', c:'Kordoba', k:'own', t:'1h30', alt:'Malaga'},
  'segovija': {nearest:'Madrid', note:'Segovija nema svoj aerodrom — najbliži je Madrid (oko 1h vožnje).', c:'Segovija', k:'own', t:'1h'},
  'ronda': {nearest:'Malaga', note:'Ronda nema svoj aerodrom — najbliži je Malaga (oko 2h vožnje).', c:'Ronda', k:'own', t:'2h'},
  'kadiz': {nearest:'Herez', note:'Kadiz nema svoj aerodrom — najbliži je Herez de la Frontera (oko 45 min vožnje), Sevilja je alternativa.', c:'Kadiz', k:'own', t:'45 min', nn:'Herez de la Frontera', alt:'Sevilja'},
  'marbelja': {nearest:'Malaga', note:'Marbelja nema svoj aerodrom — najbliži je Malaga (oko 45 min vožnje).', c:'Marbelja', k:'own', t:'45 min'},
  'kuenka': {nearest:'Madrid', note:'Kuenka nema svoj aerodrom — najbliži je Madrid (oko 1h30 vožnje).', c:'Kuenka', k:'own', t:'1h30'},
  'avila': {nearest:'Madrid', note:'Avila nema svoj aerodrom — najbliži je Madrid (oko 1h vožnje).', c:'Avila', k:'own', t:'1h'},
  // --- Austrija: aerodromi ---
  'bec': {hasAirport:true},
  'salcburg': {hasAirport:true, limited:true},
  'grac': {hasAirport:true, limited:true},
  'insbruk': {hasAirport:true, limited:true},
  'linc': {hasAirport:true, limited:true},
  'klagenfurt': {hasAirport:true, limited:true},
  // --- Austrija: bez sopstvenog aerodroma ---
  'halstat': {nearest:'Salcburg', note:'Halštat nema svoj aerodrom — najbliži je Salcburg (oko 1h vožnje).', c:'Halštat', k:'own', t:'1h'},
  'zeloamze': {nearest:'Salcburg', note:'Cel am Ze nema svoj aerodrom — najbliži je Salcburg (oko 1h15 vožnje).', c:'Cel am Ze', k:'own', t:'1h15'},
  'kicbuel': {nearest:'Insbruk', note:'Kicbuel nema svoj aerodrom — najbliži je Insbruk (oko 1h vožnje), Salcburg je alternativa.', c:'Kicbuel', k:'own', t:'1h', alt:'Salcburg'},
  'sanktanton': {nearest:'Insbruk'},
  'baden kod beca': {nearest:'Beč', note:'Baden kod Beča nema svoj aerodrom — najbliži je Beč (oko 30 min vožnje).', c:'Baden kod Beča', k:'own', t:'30 min'},
  'melk': {nearest:'Beč', note:'Melk nema svoj aerodrom — najbliži je Beč (oko 1h15 vožnje).', c:'Melk', k:'own', t:'1h15'},
  'verfen': {nearest:'Salcburg', note:'Verfen nema svoj aerodrom — najbliži je Salcburg (oko 45 min vožnje).', c:'Verfen', k:'own', t:'45 min'},
  // --- Slovačka: aerodromi ---
  'bratislava': {hasAirport:true},
  'kosice': {hasAirport:true, limited:true},
  'poprad': {hasAirport:true, limited:true},
  // --- Slovačka: bez sopstvenog aerodroma ---
  'banska bistrica': {nearest:'Bratislava', note:'Banska Bistrica nema aerodrom sa redovnim letovima — najbliži je Bratislava (oko 2h30 vožnje).', c:'Banska Bistrica', k:'sched', t:'2h30'},
  'vysoke tatre': {nearest:'Poprad', note:'Visoke Tatre nemaju sopstveni aerodrom — najbliži je Poprad (oko 30 min vožnje).', c:'Visoke Tatre', k:'own', t:'30 min'},
  // --- Baltik: aerodromi ---
  'talin': {hasAirport:true},
  'riga': {hasAirport:true},
  'vilnjus': {hasAirport:true},
  'kaunas': {hasAirport:true, limited:true},
  // --- Malta ---
  'malta': {hasAirport:true},
  // --- Kipar: aerodromi ---
  'larnaka': {hasAirport:true},
  'pafos': {hasAirport:true, limited:true},
  // --- Luksemburg ---
  'luksemburg': {hasAirport:true, limited:true},
  // --- Island ---
  'rejkjavik': {hasAirport:true},
  // --- Moldavija ---
  'kisinjev': {hasAirport:true, limited:true},
  // --- Velika Britanija: dodatni aerodromi ---
  'birmingem': {hasAirport:true},
  'glazgov': {hasAirport:true},
  'belfast': {hasAirport:true, limited:true},
  'bristol': {hasAirport:true, limited:true},
  'lids': {hasAirport:true, limited:true},
  'njukasl': {hasAirport:true, limited:true},
  // --- Velika Britanija: bez sopstvenog aerodroma ---
  'kembridz': {nearest:'London', note:'Kembridž nema svoj aerodrom — najbliži je London (oko 1h vožnje).', c:'Kembridž', k:'own', t:'1h'},
  'oksford': {nearest:'London', note:'Oksford nema svoj aerodrom — najbliži je London (oko 1h30 vožnje).', c:'Oksford', k:'own', t:'1h30'},
  // --- Francuska: dodatni aerodromi ---
  'tuluz': {hasAirport:true},
  'nant': {hasAirport:true, limited:true},
  'strazbur': {hasAirport:true, limited:true},
  'monpelje': {hasAirport:true, limited:true},
  'korzika': {hasAirport:true, limited:true},
  'lil': {hasAirport:true, limited:true},
  'ren': {hasAirport:true, limited:true},
  'brest': {hasAirport:true, limited:true},
  'klermonferan': {hasAirport:true, limited:true},
  'bijaric': {hasAirport:true, limited:true},
  'perpinjan': {hasAirport:true, limited:true},
  'tulon': {hasAirport:true, limited:true},
  'limoz': {hasAirport:true, limited:true},
  'grenobl': {hasAirport:true, limited:true},
  'samberi': {hasAirport:true, limited:true},
  'anesi': {hasAirport:true, limited:true},
  'nansi': {hasAirport:true, limited:true},
  'larosel': {hasAirport:true, limited:true},
  'tur': {hasAirport:true, limited:true},
  // --- Francuska: bez sopstvenog aerodroma ---
  'versaj': {nearest:'Pariz', note:'Versaj nema svoj aerodrom — najbliži je Pariz (oko 30 min vožnje).', c:'Versaj', k:'own', t:'30 min'},
  'kan': {nearest:'Nica', note:'Kan nema svoj aerodrom — najbliži je Nica (oko 30 min vožnje).', c:'Kan', k:'own', t:'30 min'},
  'dizon': {nearest:'Lion', note:'Dižon nema svoj aerodrom — najbliži je Lion (oko 1h30 vožnje).', c:'Dižon', k:'own', t:'1h30'},
  'anze': {nearest:'Nant', note:'Anže nema svoj aerodrom — najbliži je Nant (oko 1h vožnje).', c:'Anže', k:'own', t:'1h'},
  'lemans': {nearest:'Pariz', note:'Le Mans nema svoj aerodrom sa redovnim letovima — najbliži je Pariz (oko 2h vožnje), Tur je alternativa.', c:'Le Mans', k:'sched', t:'2h', alt:'Tur'},
  'amjen': {nearest:'Pariz', note:'Amjen nema svoj aerodrom — najbliži je Pariz (oko 1h30 vožnje).', c:'Amjen', k:'own', t:'1h30'},
  'orlean': {nearest:'Pariz', note:'Orlean nema svoj aerodrom — najbliži je Pariz (oko 1h30 vožnje).', c:'Orlean', k:'own', t:'1h30'},
  'mec': {nearest:'Nansi'},
  // --- Nemačka: dodatni aerodromi ---
  'nirnberg': {hasAirport:true, limited:true},
  'hanover': {hasAirport:true, limited:true},
  'lajpcig': {hasAirport:true, limited:true},
  'bremen': {hasAirport:true, limited:true},
  'dortmund': {hasAirport:true, limited:true},
  'karlsrue': {hasAirport:true, limited:true},
  'minster': {hasAirport:true, limited:true},
  'paderborn': {hasAirport:true, limited:true},
  'zarbriken': {hasAirport:true, limited:true},
  'rostok': {hasAirport:true, limited:true},
  'erfurt': {hasAirport:true, limited:true},
  'fridrihshafen': {hasAirport:true, limited:true},
  'libek': {hasAirport:true, limited:true},
  'memingen': {hasAirport:true, limited:true},
  'kasel': {hasAirport:true, limited:true},
  // --- Nemačka: bez sopstvenog aerodroma ---
  'hajdelberg': {nearest:'Frankfurt', note:'Hajdelberg nema svoj aerodrom — najbliži je Frankfurt (oko 1h vožnje).', c:'Hajdelberg', k:'own', t:'1h'},
  'bon': {nearest:'Keln'},
  'visbaden': {nearest:'Frankfurt', note:'Visbaden nema svoj aerodrom — najbliži je Frankfurt (oko 40 min vožnje).', c:'Visbaden', k:'own', t:'40 min'},
  'majnc': {nearest:'Frankfurt', note:'Majnc nema svoj aerodrom — najbliži je Frankfurt (oko 45 min vožnje).', c:'Majnc', k:'own', t:'45 min'},
  'ahen': {nearest:'Keln', note:'Ahen nema svoj aerodrom — najbliži je Keln/Bon (oko 1h vožnje).', c:'Ahen', k:'own', t:'1h', nn:'Keln/Bon'},
  'regensburg': {nearest:'Nirnberg', note:'Regensburg nema svoj aerodrom — najbliži je Nirnberg (oko 1h20 vožnje).', c:'Regensburg', k:'own', t:'1h20'},
  'vurcburg': {nearest:'Frankfurt', note:'Vurcburg nema svoj aerodrom — najbliži je Frankfurt (oko 1h30 vožnje).', c:'Vurcburg', k:'own', t:'1h30'},
  'trir': {nearest:'Luksemburg', note:'Trir nema svoj aerodrom — najbliži je Luksemburg (oko 1h vožnje).', c:'Trir', k:'own', t:'1h'},
  'potsdam': {nearest:'Berlin', note:'Potsdam nema svoj aerodrom — najbliži je Berlin (oko 30 min vožnje).', c:'Potsdam', k:'own', t:'30 min'},
  'kil': {nearest:'Hamburg', note:'Kil nema svoj aerodrom sa redovnim letovima — najbliži je Hamburg (oko 1h30 vožnje).', c:'Kil', k:'sched', t:'1h30'},
  'magdeburg': {nearest:'Berlin', note:'Magdeburg nema svoj aerodrom — najbliži je Berlin (oko 2h vožnje).', c:'Magdeburg', k:'own', t:'2h'},
  'kemnic': {nearest:'Lajpcig', note:'Kemnic nema svoj aerodrom sa redovnim letovima — najbliži je Lajpcig (oko 1h vožnje).', c:'Kemnic', k:'sched', t:'1h'},
  'ulm': {nearest:'Stutgart', note:'Ulm nema svoj aerodrom — najbliži je Štutgart (oko 1h vožnje).', c:'Ulm', k:'own', t:'1h', nn:'Štutgart'},
  'frajburg': {nearest:'Bazel', note:'Frajburg nema svoj aerodrom — najbliži je Bazel (oko 1h vožnje).', c:'Frajburg', k:'own', t:'1h'},
  'konstanc': {nearest:'Fridrihshafen'},
  // --- Holandija: dodatni aerodromi ---
  'ajndhoven': {hasAirport:true, limited:true},
  'mastriht': {hasAirport:true, limited:true},
  'groningen': {hasAirport:true, limited:true},
  // --- Holandija: bez sopstvenog aerodroma ---
  'hag': {nearest:'Roterdam'},
  'utreht': {nearest:'Amsterdam', note:'Utreht nema svoj aerodrom — najbliži je Amsterdam (oko 30 min vožnje).', c:'Utreht', k:'own', t:'30 min'},
  // --- Norveška: dodatni aerodromi ---
  'bergen': {hasAirport:true, limited:true},
  'trondhajm': {hasAirport:true, limited:true},
  'stavanger': {hasAirport:true, limited:true},
  'tromso': {hasAirport:true, limited:true},
  'bodo': {hasAirport:true, limited:true},
  'olesund': {hasAirport:true, limited:true},
  'kristiansand': {hasAirport:true, limited:true},
  'harstad': {hasAirport:true, limited:true},
  'alta': {hasAirport:true, limited:true},
  'kirkenes': {hasAirport:true, limited:true},
  'svalbard': {hasAirport:true, limited:true},
  // --- Norveška: bez sopstvenog aerodroma ---
  'lilehamer': {nearest:'Oslo', note:'Lilehamer nema svoj aerodrom — najbliži je Oslo (oko 2h vožnje).', c:'Lilehamer', k:'own', t:'2h'},
  'gejrangerfjord': {nearest:'Olesund'},
  // --- Švedska: dodatni aerodromi ---
  'malme': {hasAirport:true, limited:true},
  'umeo': {hasAirport:true, limited:true},
  'lulea': {hasAirport:true, limited:true},
  'vizbi': {hasAirport:true, limited:true},
  'sundsval': {hasAirport:true, limited:true},
  'kalmar': {hasAirport:true, limited:true},
  // --- Švedska: bez sopstvenog aerodroma ---
  'upsala': {nearest:'Stokholm', note:'Upsala nema svoj aerodrom — najbliži je Stokholm (oko 45 min vožnje).', c:'Upsala', k:'own', t:'45 min'},
  'lund': {nearest:'Malme', note:'Lund nema svoj aerodrom — najbliži je Malme (oko 20 min vožnje).', c:'Lund', k:'own', t:'20 min'},
  // --- Danska: dodatni aerodromi ---
  'olborg': {hasAirport:true, limited:true},
  'bilund': {hasAirport:true, limited:true},
  'arhus': {hasAirport:true, limited:true},
  'bornholm': {hasAirport:true, limited:true},
  'esbjerg': {hasAirport:true, limited:true},
  // --- Danska: bez sopstvenog aerodroma ---
  'odense': {nearest:'Bilund', note:'Odense nema svoj aerodrom sa redovnim letovima — najbliži je Bilund (oko 1h vožnje).', c:'Odense', k:'sched', t:'1h'},
  'roskilde': {nearest:'Kopenhagen', note:'Roskilde nema svoj aerodrom sa redovnim letovima — najbliži je Kopenhagen (oko 30 min vožnje).', c:'Roskilde', k:'sched', t:'30 min'},
  'helsingor': {nearest:'Kopenhagen', note:'Helsingor nema svoj aerodrom — najbliži je Kopenhagen (oko 45 min vožnje).', c:'Helsingor', k:'own', t:'45 min'},
  // --- Finska: dodatni aerodromi ---
  'tampere': {hasAirport:true, limited:true},
  'turku': {hasAirport:true, limited:true},
  'rovanijemi': {hasAirport:true, limited:true},
  'ulu': {hasAirport:true, limited:true},
  'vaasa': {hasAirport:true, limited:true},
  'kuopio': {hasAirport:true, limited:true},
  'ivalo': {hasAirport:true, limited:true},
  // --- Finska: bez sopstvenog aerodroma ---
  'lahti': {nearest:'Helsinki', note:'Lahti nema svoj aerodrom — najbliži je Helsinki (oko 1h vožnje).', c:'Lahti', k:'own', t:'1h'},
  // --- Švajcarska: dodatni aerodromi ---
  'bazel': {hasAirport:true, limited:true},
  'bern': {hasAirport:true, limited:true},
  'lugano': {hasAirport:true, limited:true},
  // --- Švajcarska: bez sopstvenog aerodroma ---
  'sankt moric': {nearest:'Cirih', note:'Sankt Moric nema komercijalni aerodrom — najbliži je Cirih (oko 3h vožnje).', c:'Sankt Moric', k:'comm', t:'3h'},
  'lucern': {nearest:'Cirih', note:'Lucern nema svoj aerodrom — najbliži je Cirih (oko 50 min vožnje).', c:'Lucern', k:'own', t:'50 min'},
  'interlaken': {nearest:'Bern', note:'Interlaken nema svoj aerodrom — najbliži je Bern (oko 1h vožnje), Cirih je alternativa.', c:'Interlaken', k:'own', t:'1h', alt:'Cirih'},
  'cermat': {nearest:'Ženeva', note:'Cermat nema svoj aerodrom — najbliži je Ženeva (oko 3h vožnje).', c:'Cermat', k:'own', t:'3h'},
  'davos': {nearest:'Cirih', note:'Davos nema svoj aerodrom — najbliži je Cirih (oko 2h vožnje).', c:'Davos', k:'own', t:'2h'},
  // --- Mađarska: dodatni aerodromi ---
  'debrecin': {hasAirport:true, limited:true},
  // --- Rusija (evropski deo): aerodromi ---
  'moskva': {hasAirport:true},
  'sanktpeterburg': {hasAirport:true},
  'soci': {hasAirport:true, limited:true},
  'kalinjingrad': {hasAirport:true, limited:true},
  'kazanj': {hasAirport:true, limited:true},
  'krasnodar': {hasAirport:true, limited:true},
  // --- Ukrajina: vazdušni prostor zatvoren za civilni saobraćaj od feb. 2022,
  //     nema redovnih putničkih letova ni sa jednog ukrajinskog aerodroma dok
  //     traje rat — zato se ovde ne tretiraju kao hasAirport:true, već se
  //     korisniku predlaže najbliži aerodrom u susednoj zemlji. ---
  'kijev': {nearest:'Varsava'},
  'lavov': {nearest:'Zesuv'},
  'odesa': {nearest:'Kisinjev'},
  'harkov': {nearest:'Varsava'}
};
Object.keys(AIRPORT_DB).forEach(k => { AIRPORT_DB[k].slug = k; });
/* Tekst napomene za grad bez aerodroma, na trenutnom jeziku.
   1) Napomene sa posebnom formulacijom žive u *.json pod
      'airport_note.<slug>' (srpski izvor + prevodi; slug = ključ u AIRPORT_DB).
   2) Ostale: srpski koristi originalni info.note; drugi jezici se sklapaju iz
      strukturiranih polja (c = grad, k = vrsta "nema ...", t = vreme vožnje,
      nn = ime aerodroma ako se razlikuje od `nearest`, cc = država,
      alt = alternativa) preko šablona airport_note_tpl. */
function airportNoteText(info){
  if (!info) return '';
  const lang = getLang();
  const special = info.slug ? 'airport_note.' + info.slug : null;
  if (lang === 'sr') return (special && I18N.sr[special]) || info.note || '';
  if (special && I18N[lang] && I18N[lang][special]) return I18N[lang][special];
  if (info.c && info.k && info.t){
    let near = cityLabel(info.nn || info.nearest);
    if (info.cc){
      const ccName = I18N[lang] && I18N[lang]['country_loc.' + info.cc];
      near += ' ' + t('airport_in') + ' ' + (ccName || info.cc);
    }
    return tf('airport_note_tpl', {
      city: cityLabel(info.c),
      lack: t('airport_lack_' + info.k),
      near: near,
      time: driveTimeLabel(info.t),
      alt: info.alt ? tf('airport_note_alt', {alt: cityLabel(info.alt)}) : ''
    });
  }
  return (special && I18N.sr[special]) || info.note || '';
}
/* Nalazi unos u AIRPORT_DB za dati grad (poredi normalizovano ime, dozvoljava
   da grad bude uneto kao deo dužeg stringa, npr. "Bar, Crna Gora"). Vraća null
   za nepoznat/prazan grad — tada se ne nagađa ni na jednu ni na drugu stranu.
   Dodatno: ako korisnik JOŠ KUCA poznat grad (npr. "Suboti" dok kuca
   "Subotica"), a uneto već NEDVOSMISLENO odgovara tačno jednom gradu u bazi,
   upozorenje se prikazuje odmah — ne tek kad se doda i poslednje slovo. Kraći
   unosi koji odgovaraju više gradova (npr. "su" — Subotica i Sutomore) se
   namerno preskaču dok se ne razdvoje, da ne bi lažno pogodili pogrešan grad. */
function airportInfoFor(cityRaw){
  const norm = normalizeSr((cityRaw || '').trim());
  if (!norm) return null;
  // NAPOMENA: ključevi u AIRPORT_DB su ispisani sa dijakritikom (npr.
  // 'rogaška slatina', 'čatež') dok je `norm` uvek BEZ dijakritike
  // (normalizeSr skida š/č/ž/đ/ć). Poređenje mora ići normalizovan-naspram-
  // normalizovanog, inače svaki grad sa dijakritikom u ključu (Rogaška
  // Slatina, Čatež, Laško, Škofja Loka, Portorož, Škocjanske jame...)
  // NIKAD ne pogodi zapis u bazi — vraća se null kao da grad uopšte nije
  // u AIRPORT_DB, pa nestaje i upozorenje o aerodromu i preusmeravanje na
  // najbliži pravi aerodrom (bio je ovo pravi bag, ne samo teorijski slučaj).
  for (const key in AIRPORT_DB){
    const nkey = normalizeSr(key);
    if (norm === nkey || norm.startsWith(nkey + ' ') || norm.startsWith(nkey + ',') || norm.includes(' ' + nkey)){
      return AIRPORT_DB[key];
    }
  }
  if (norm.length >= 4){
    const candidates = Object.keys(AIRPORT_DB).filter(key => normalizeSr(key).startsWith(norm));
    if (candidates.length === 1) return AIRPORT_DB[candidates[0]];
  }
  return null;
}
/* Za grad POLASKA bez aerodroma, vraća STVARNI aerodrom sa kog bi se letelo.
   Za nepoznat/prazan grad vraća uneti tekst nepromenjen (bez nagađanja). */
function realDepartureAirportFor(originRaw){
  const info = airportInfoFor(originRaw);
  if (info && !info.hasAirport && info.nearest) return info.nearest;
  return (originRaw || '').trim();
}
/* Za grad DESTINACIJE bez aerodroma, vraća STVARNI aerodrom na koji bi se
   sletelo (npr. Bar → Tivat). Za nepoznat/prazan grad ili grad koji ima
   sopstveni aerodrom, vraća uneti tekst nepromenjen. */
function realArrivalAirportFor(destRaw){
  const info = airportInfoFor(destRaw);
  if (info && !info.hasAirport && info.nearest) return info.nearest;
  return (destRaw || '').trim();
}
function isLimitedNetworkOrigin(originRaw){
  const info = airportInfoFor(originRaw);
  return !!(info && info.hasAirport && info.limited);
}
/* ==========================================================
   LOGOVANJE PROMAŠAJA AIRPORT_DB — kad korisnik pokrene pretragu sa
   gradom koji baza ne prepoznaje. Beleži se SAMO na submit pretrage
   (ne na svaki taster dok kuca), da log ne bude zatrpan polu-unetim
   tekstom. Uvek se čuva lokalno (localStorage, po uređaju/pretraživaču)
   kao fallback; ako je Supabase podešen (config.js), šalje se i deljeni
   zapis u tabelu 'airport_db_misses' — best-effort, ćuti ako tabela još
   ne postoji (npr. dok se ne napravi u Supabase-u).
   NAMERNO se ne tretira svaki promašaj kao "rupu" u bazi — mnogi su
   očekivani (Rim, Barselona i sl. su van AIRPORT_DB po dizajnu, nisu
   regionalni gradovi bez aerodroma). Vlasnik sajta ručno pregleda listu
   (showAirportDbMisses() u konzoli) i bira šta stvarno vredi dodati.
========================================================== */
const AIRPORT_MISS_STORAGE_KEY = 'sklopi_airport_misses_v1';
const AIRPORT_MISS_STORAGE_CAP = 300; // ne dozvoli da lokalna lista raste unedogled
function loadAirportMisses(){
  try{
    const raw = localStorage.getItem(AIRPORT_MISS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){ return {}; }
}
function saveAirportMisses(misses){
  try{ localStorage.setItem(AIRPORT_MISS_STORAGE_KEY, JSON.stringify(misses)); }catch(e){}
}
function logAirportDbMiss(cityRaw, field){
  const city = (cityRaw || '').trim();
  if (city.length < 3) return; // prekratko/prazno da bi bilo relevantno
  if (airportInfoFor(city)) return; // prepoznat je — nije promašaj
  const norm = normalizeSr(city);
  const misses = loadAirportMisses();
  const key = field + '|' + norm;
  if (!misses[key]) misses[key] = {city, field, count:0};
  misses[key].city = city; // čuvaj poslednji unet oblik (velika/mala slova)
  misses[key].count += 1;
  misses[key].lastSeen = todayStr();
  const keys = Object.keys(misses);
  if (keys.length > AIRPORT_MISS_STORAGE_CAP){
    keys.sort((a,b) => misses[a].count - misses[b].count);
    delete misses[keys[0]]; // kad lista preraste, izbaci najređi zapis
  }
  saveAirportMisses(misses);
  if (typeof sb !== 'undefined' && sb){
    sb.from('airport_db_misses').insert({city, field, normalized:norm})
      .then(({error}) => {
        if (error) console.warn('[sklopi] Deljeno logovanje promašaja AIRPORT_DB nije uspelo (tabela verovatno ne postoji još):', error.message);
      });
  }
}
/* Konzolni prečac za vlasnika sajta: otvori konzolu i pozovi
   showAirportDbMisses() da vidiš koji gradovi (i koliko puta) nisu
   prepoznati — sortirano od najčešćeg ka najređem. */
window.showAirportDbMisses = function(){
  const rows = Object.values(loadAirportMisses()).sort((a,b) => b.count - a.count);
  console.table(rows);
  return rows;
};
/* ==========================================================
   DELJENA LOGIKA CENA/OPISA — koriste je i 3 gotove kartice
   (fetchFlights/fetchHotel/fetchCar) i "Sastavi svoj paket" builder
   (computeCustomPackage). Pre ovoga su ta dva puta imala SVOJE odvojene
   kopije istih tabela/tekstova — tačno ta vrsta duplikacije je razlog
   zašto je opis kartice (pkgDescText) ranije zaostajao za stvarnim
   ponašanjem fetchFlights-a. Deljenjem ovih tabela/funkcija, izmena na
   jednom mestu se automatski odražava i na drugom, umesto da se dve
   kopije vremenom razminu.
========================================================== */
const FLIGHT_CARRIERS = ['Wizz Air','Air Serbia','Ryanair','Aegean','Lufthansa'];
const FLIGHT_PREF_PRICE_MULT = {direct:1.05, cheapest:0.72, airline:1.15};
const HOTEL_STAR_BASE_PRICE = {3:36, 4:66, 5:122};
const HOTEL_STAR_RATING_BASE = {3:7.7, 4:8.6, 5:9.2};
const CAR_TYPE_BASE_PRICE = {none:0, small:31, suv:57};

// Bira ime avio-kompanije. Zove rng() TAČNO jednom, i to SAMO kad nije
// tražena konkretna kompanija niti prosleđen forceCarrier (npr. Comfort
// tier na kartičnom putu uvek prikazuje istu, "premium" kompaniju umesto
// nasumične) — bilo koja promena broja rng() poziva ovde bi pomerila sve
// naredne random vrednosti (hotel/auto/aktivnost) za jedno mesto, zato
// ovaj obrazac mora ostati identičan na oba mesta koja ga zovu.
function pickCarrierName(rng, opts){
  opts = opts || {};
  if (opts.flightPref === 'airline' && opts.airlineName) return opts.airlineName;
  if (opts.forceCarrier) return opts.forceCarrier;
  return FLIGHT_CARRIERS[Math.floor(rng() * FLIGHT_CARRIERS.length)];
}

// Podnaslov leta (npr. "direktan let · cena za svih 3 putnika"). Pre nego
// što je ovo bilo deljeno, builder kartica NIJE imala ni upozorenje za
// ograničenu avio-mrežu (limitedNetwork) ni napomenu o ceni za više
// putnika, iako let na builder kartici isto tako zavisi od broja putnika.
function flightSubText(opts){
  opts = opts || {};
  // Redosled odlučuje (isti kao ranije): presedanje → ograničena mreža →
  // najbliži aerodrom → direktan let. Tekstovi idu kroz t() (sr/en/ru).
  let sub;
  if (opts.flightPref === 'cheapest') sub = t('flight_sub_stopover');
  else if (opts.limitedNetwork) sub = t('flight_sub_limited');
  else if (opts.arrival !== (opts.destRaw || '').trim()) sub = tf('flight_sub_nearest', {arrival: cityLabel(opts.arrival)});
  else sub = t('flight_sub_direct');
  if (opts.adults > 1) sub += ' · ' + tf('flight_sub_pax', {n: opts.adults});
  return sub;
}

/* ==========================================================
   ŠTA JE UKLJUČENO PO TIER-U (perks) — tri kartice se razlikuju ne samo
   po ceni nego i po SADRŽAJU: prtljag/izmena datuma (let), doručak,
   udaljenost od centra i otkazivanje (hotel), kilometraža i osiguranje
   (auto). Svaki perk je {k: i18n ključ, pos: true|false|null} —
   pos:true je prednost (računa se u qualityScore), false je odricanje,
   null neutralno. Kategorija koju je korisnik tražio (tip leta,
   zvezdice, tip auta) se NE menja — samo ono što ta cena uključuje.
   Ne zove rng() (ne sme da pomeri niz nasumičnih vrednosti).
========================================================== */
function tierPerks(kind, tier, opts){
  opts = opts || {};
  if (kind === 'flight'){
    return [
      tier === 'budget' ? {k:'perk_flight_bag_cabin', pos:false} : {k:'perk_flight_bag_checked', pos:true},
      tier === 'comfort' ? {k:'perk_flight_flex', pos:true} : {k:'perk_flight_fixed', pos:false}
    ];
  }
  if (kind === 'hotel'){
    // "Blizu centra" kao prioritet korisnika važi za sve tri kartice.
    const central = opts.prioritizeLocation || tier === 'comfort';
    return [
      tier === 'budget' ? {k:'perk_hotel_no_breakfast', pos:false} : {k:'perk_hotel_breakfast', pos:true},
      central ? {k:'perk_hotel_central', pos:true}
        : tier === 'best' ? {k:'perk_hotel_dist_mid', pos:null}
        : {k:'perk_hotel_dist_far', pos:false},
      tier === 'budget' ? {k:'perk_hotel_no_cancel', pos:false} : {k:'perk_hotel_free_cancel', pos:true}
    ];
  }
  if (kind === 'car'){
    return [
      tier === 'budget' ? {k:'perk_car_km_limited', pos:false} : {k:'perk_car_km_unlimited', pos:true},
      tier === 'comfort' ? {k:'perk_car_cover_full', pos:true} : {k:'perk_car_cover_basic', pos:false}
    ];
  }
  return [];
}
// Kvalitet iz STVARNOG sadržaja: udeo ostvarenih prednosti među uključenim
// stavkama, preslikan na 55–97 (Budget bez prednosti ≈55, sve prednosti 97).
// Bez ijedne stavke sa perks-ovima vraća staru fiksnu vrednost po tier-u.
function qualityFromPerks(items, tier){
  let possible = 0, earned = 0;
  items.forEach(it => {
    if (!it || !it.perks) return;
    possible += it.perks.length;
    earned += it.perks.filter(pk => pk.pos === true).length;
  });
  if (!possible) return {best:84, budget:58, comfort:97}[tier];
  return Math.round(55 + 42 * earned / possible);
}

function fetchFlights(rng, dest, adults, tier, originCode, prefs, seeds){
  prefs = prefs || {};
  const flightPref = prefs.flightPref || 'direct';
  // `seeds.flightBase`, kad je prosleđen, je IZVUČEN JEDNOM po pretrazi (vidi
  // buildPriceSeeds) i DELI se između sve tri tier kartice — vidi komentar
  // uz buildPriceSeeds za razlog (bez ovoga je redosled cena Budget/Best/
  // Comfort bio samo statistički verovatan, ne garantovan). Fallback na
  // staro ponašanje kad seeds nije prosleđen (npr. poziv sa jednim tier-om).
  const base = (seeds && seeds.flightBase != null) ? seeds.flightBase : 60 + Math.floor(rng()*140);
  const tierMult = {budget:0.72, best:1, comfort:1.55}[tier];
  // Ista logika kao u "Sastavi svoj paket" builderu (computeCustomPackage)
  // — cena stvarno zavisi od TRAŽENOG tipa leta, ne samo od tier-a kartice,
  // tako da "najjeftiniji" izbor u upitniku zaista donese nižu cenu ovde.
  const prefMult = FLIGHT_PREF_PRICE_MULT[flightPref] || 1;
  // Cena zavisi i od RUTE (udaljenost polazište→destinacija, vidi flightRouteMult).
  const price = Math.round(base * tierMult * prefMult * adults * flightRouteMult(originCode, dest));
  const p = PARTNERS.flight;
  // Ako je tražena određena avio-kompanija, kartica STVARNO prikazuje tu
  // kompaniju — ne nasumičnu iz liste.
  const carrier = pickCarrierName(rng, {
    flightPref, airlineName: prefs.airlineName,
    forceCarrier: tier === 'comfort' ? FLIGHT_CARRIERS[FLIGHT_CARRIERS.length-1] : null
  });
  const departure = realDepartureAirportFor(originCode);
  const arrival = realArrivalAirportFor(dest);
  const limitedNetwork = isLimitedNetworkOrigin(originCode);
  // "Direktan" ili "sa presedanjem" sad zavisi od TRAŽENOG tipa leta, ne od
  // tier-a kartice — ko traži najjeftiniji let realno dobija let sa
  // presedanjem (to je i razlog niže cene), a ko traži direktan, dobija ga
  // na sve tri kartice, ne samo na "Comfort".
  // name/sub su getteri: tekst se sklapa u trenutku čitanja, pa prati
  // trenutni jezik (i posle prebacivanja SR/EN/RU) — bez ponovnog računanja
  // cene/rng-a. JSON.stringify i spread ih evaluiraju kao obična polja.
  return {
    provider:p.provider, providerLabel:p.name, type:'flight',
    get name(){ return carrier + (departure ? ' ' + cityLabel(departure) : '') + ' → ' + cityLabel(arrival); },
    get sub(){ return flightSubText({flightPref, arrival, destRaw: dest, adults, limitedNetwork}); },
    price, currency:'EUR',
    perks: tierPerks('flight', tier)
  };
}
function fetchHotel(rng, dest, nights, adults, tier, prefs, seeds){
  prefs = prefs || {};
  const stars = [3,4,5].includes(prefs.hotelStars) ? prefs.hotelStars : 4;
  // Bazna cena i dalje zavisi od tier-a kartice (zato se tri ponude i dalje
  // razlikuju po ceni), ali polazna tačka je sad TRAŽENA kategorija hotela
  // (zvezdice), ne fiksni nivo po tier-u — 3★ izbor se više ne pretvara u
  // 5★ hotel na "Comfort" kartici i obrnuto.
  const tierMult = {budget:0.85, best:1, comfort:1.2}[tier];
  const starBase = HOTEL_STAR_BASE_PRICE[stars];
  let mult = tierMult;
  if (prefs.prioritizeRating) mult += 0.08;
  if (prefs.prioritizeLocation) mult += 0.06;
  // hotelJitter deljen između tier-a (vidi buildPriceSeeds) — inače je ovaj
  // "šum" po noći znao da bude veći od same razlike koju pravi tierMult.
  const jitter = (seeds && seeds.hotelJitter != null) ? seeds.hotelJitter : rng()*14;
  const perNight = Math.round(starBase * mult + jitter);
  const price = Math.round(perNight * nights * Math.ceil(adults/2));
  const p = PARTNERS.hotel;
  let rating = HOTEL_STAR_RATING_BASE[stars] + rng()*0.25;
  if (prefs.prioritizeRating) rating += 0.25;
  rating = Math.min(9.9, rating);
  // Imena sa nazivom grada su funkcije, da grad ide kroz cityLabel() u
  // trenutnom jeziku; broj rng() poziva ostaje isti (jedan izbor iz niza).
  const names = {
    3:[d => d+' Hostel','City Rooms','Studio Plaza'],
    4:[d => d+' Hotel', 'Aegean Suites', 'Old Town Residence'],
    5:[d => 'Grand '+d, 'Royal Palace Hotel', d => d+' Luxury Collection']
  };
  const arr = names[stars];
  const rooms = Math.ceil(adults/2);
  const hotelPick = arr[Math.floor(rng()*arr.length)];
  return {
    provider:p.provider, providerLabel:p.name, type:'hotel',
    get name(){ return typeof hotelPick === 'function' ? hotelPick(cityLabel(dest)) : hotelPick; },
    get sub(){
      return nightsLabel(nights) + ' · ' + stars + '★ · ' + tf('hotel_sub_rating', {r: rating.toFixed(1)})
        + (rooms > 1 ? ' · ' + tf('hotel_sub_rooms', {rooms: roomsLabel(rooms)}) : '');
    },
    price, currency:'EUR',
    // "Centar grada" (prioritizeLocation) sad dolazi kroz perks (i18n).
    perks: tierPerks('hotel', tier, {prioritizeLocation: prefs.prioritizeLocation})
  };
}
function fetchCar(rng, days, tier, prefs, seeds){
  prefs = prefs || {};
  // Tip auta (mali/SUV) je sad STVARNO ono što je korisnik izabrao, ne
  // nasumičan model iz tier-liste — tier i dalje menja cenu (Budget je
  // najjeftiniji), ali ne i kategoriju vozila.
  const carType = prefs.carPref === 'suv' ? 'suv' : 'small';
  const tierMult = {budget:0.85, best:1, comfort:1.25}[tier];
  const typeBase = CAR_TYPE_BASE_PRICE[carType];
  // carJitter deljen između tier-a — isti razlog kao kod hotela iznad.
  const jitter = (seeds && seeds.carJitter != null) ? seeds.carJitter : rng()*10;
  const perDay = Math.round(typeBase * tierMult + jitter);
  const price = Math.round(perDay * days);
  const p = PARTNERS.car;
  const models = {
    small: ['Fiat Panda','Hyundai i10','Kia Picanto','VW Polo'],
    suv:   ['VW Tiguan','Audi Q3','Dacia Duster','Volvo XC40']
  };
  const arr = models[carType];
  return {
    provider:p.provider, providerLabel:p.name, type:'car',
    name: arr[Math.floor(rng()*arr.length)],
    get sub(){ return daysLabel(days) + ' · ' + t('car_sub_gearbox') + (carType==='suv' ? ' · SUV' : ''); },
    price, currency:'EUR',
    perks: tierPerks('car', tier)
  };
}
function fetchActivity(rng, dest, tier, prefs, seeds){
  prefs = prefs || {};
  // Broj aktivnosti je sad STVARNO onaj iz upitnika (podrazumevano 1 ako
  // nije poznat), cena se sabira po broju, ne fiksno za jednu aktivnost.
  const count = Math.max(1, Math.round(prefs.activityCount) || 1);
  const tierMult = {budget:0.85, best:1, comfort:1.3}[tier];
  // activityJitter deljen između tier-a — isti razlog kao kod hotela/auta.
  const jitter = (seeds && seeds.activityJitter != null) ? seeds.activityJitter : rng()*20;
  const perActivity = Math.round((18 + jitter) * tierMult);
  const price = perActivity * count;
  const p = PARTNERS.activity;
  // Ključevi (a ne gotov tekst) — naziv se prevodi pri čitanju; niz i izbor
  // preko rng() ostaju identični kao pre.
  const opts = {
    budget:['act_walk_old_town'],
    best:['act_halfday_tour','act_main_tickets'],
    comfort:['act_private_tour','act_food_tour']
  };
  const arr = opts[tier];
  const labelKey = arr[Math.floor(rng()*arr.length)];
  return {
    provider:p.provider, providerLabel:p.name, type:'activity',
    get name(){
      const label = t(labelKey);
      return (count > 1 ? activitiesLabel(count) + ' (' + t('act_eg') + ' ' + label + ')' : label) + ' — ' + cityLabel(dest);
    },
    get sub(){ return t('act_per_person') + (count > 1 ? ' · ' + activitiesLabel(count) : ''); },
    price, currency:'EUR'
  };
}

/* Baza za jitter/cenu koja se izvlači JEDNOM po pretrazi (ne po tier-u) i
   deli se između Budget/Best/Comfort poziva buildPackage — vidi
   fetchFlights/fetchHotel/fetchCar/fetchActivity iznad. Uzrok bug-a koji je
   ovo zamenilo: svaka tier kartica je ranije izvlačila SVOJU nezavisnu
   nasumičnu "bazu" cene, uporedivu po veličini sa razlikom koju sam
   tier-množilac pravi — pa je Budget na ~47% kombinacija ulaza (izmereno
   preko runBuildPackageInvariantChecks niže) ispadao SKUPLJI od Best Value,
   iako je tier-množilac uvek budget<best<comfort. Sad se taj nasumični deo
   izvlači jednom, a tier i dalje menja SAMO množilac — pa je redosled cena
   garantovan (do na retke, veoma male hotel/car cene gde zaokruživanje na
   ceo broj teorijski može izjednačiti dva tier-a — to je prihvatljivo,
   "jednako" nije kršenje Budget≤Best≤Comfort).
   Carrier/model/naziv hotela i dalje se biraju NEZAVISNO po tier-u (preko
   `rng` direktno, ne preko `seeds`) — to je samo prikazani tekst, ne cena,
   pa razlika u imenu između kartica ostaje (namerna raznovrsnost). */
function buildPriceSeeds(rng){
  return {
    flightBase: 60 + Math.floor(rng()*140),
    hotelJitter: rng()*14,
    carJitter: rng()*10,
    activityJitter: rng()*20
  };
}


const EXTRA_COSTS = {
  best:    {fuel:45, tolls:28, insurance:22, esim:12, transfer:25},
  comfort: {fuel:58, tolls:34, insurance:34, esim:18, transfer:32},
  budget:  {fuel:28, tolls:14, insurance:14, esim:8,  transfer:18}
};

/* ==========================================================
   DEV-ONLY PROVERA KONZISTENTNOSTI: pkg.flight.sub mora odgovarati
   traženom tipu leta (flightPref). Isključena je u produkciji (vidi
   DEV_MODE ispod) — svrha joj je da ulovi baš onu vrstu greške na koju
   upozorava komentar iznad fetchFlights/computeCustomPackage: neko
   promeni fetchFlights (ili flightSubText) i zaboravi da uskladi opis,
   pa "najjeftiniji" let na kartici i dalje piše "direktan let" (ili
   obrnuto). Bez ovoga bi to čekalo sledeću rundu ručne provere — sa
   ovim, konzola prijavi grešku ODMAH čim se to dogodi, u dev okruženju.
   Proverava se i na kartičnom putu (buildPackage) i na builder putu
   (computeCustomPackage) — obe zovu istu flightSubText, ali svaka
   sklapa svoj `sub` iz nje, pa svaka može zasebno da se pokvari.
========================================================== */
const DEV_MODE = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /(^|[?&])debug(=1)?(&|$)/.test(location.search);

function assertFlightSubConsistency(flightPref, sub, sourceLabel){
  if (!DEV_MODE || !sub) return;
  const saysPresedanje = sub.includes(t('flight_sub_stopover')); // jezički neutralno (sr/en/ru)
  const shouldSayPresedanje = flightPref === 'cheapest';
  if (saysPresedanje !== shouldSayPresedanje){
    console.error(
      '[sklopi][dev-check] Neusklađen opis leta! flightPref="' + flightPref + '" '
      + (shouldSayPresedanje
          ? 'treba da pominje "presedanje" u sub-u, ali ne pominje'
          : 'NE treba da pominje "presedanje" u sub-u, ali pominje')
      + ' — sub="' + sub + '" (izvor: ' + sourceLabel + '). '
      + 'Verovatno je fetchFlights/flightSubText promenjen bez usklađivanja negde drugde, ili obrnuto.'
    );
  }
}

/* ==========================================================
   PRICING + SCORE ENGINE
========================================================== */
function buildPackage(rng, dest, nights, days, adults, tier, flags, factor, originCode, seasonMult, seeds){
  factor = factor || 1;
  seasonMult = seasonMult || 1; // sezona (seasonFactor) — samo let/smeštaj/auto
  const flight = flags.flight ? fetchFlights(rng, dest, adults, tier, originCode, flags, seeds) : null;
  const hotel  = flags.hotel  ? fetchHotel(rng, dest, nights, adults, tier, flags, seeds) : null;
  const car    = flags.car    ? fetchCar(rng, days, tier, flags, seeds) : null;
  const activity = flags.activity ? fetchActivity(rng, dest, tier, flags, seeds) : null;
  const extras = EXTRA_COSTS[tier];

  if (flight) assertFlightSubConsistency(flags.flightPref || 'direct', flight.sub, 'buildPackage (' + tier + ')');

  // Tržišni faktor menja samo cenu, ne i ime/opis stavke (ti se biraju
  // gore, iz rng niza, pre ove linije — pa ostaju stabilni iz dana u dan).
  if (flight) flight.price = Math.round(flight.price * factor * seasonMult);
  if (hotel) hotel.price = Math.round(hotel.price * factor * seasonMult);
  if (car) car.price = Math.round(car.price * factor * seasonMult);
  if (activity) activity.price = Math.round(activity.price * factor);

  const fuel = Math.round(((car && extras.fuel) ? extras.fuel : 0) * factor);
  const tolls = Math.round(((car && extras.tolls) ? extras.tolls : 0) * factor);
  // Osiguranje i eSIM više NISU deo osnovne cene — to su dodaci na već
  // kupljenu uslugu, ne "proizvod" koji se pretražuje. Cena im je uvek
  // dostupna (da bi se prikazala uz čekboks u rezultatima), ali se ne
  // sabira u `total` dok ih korisnik svesno ne uključi (vidi toggleAddon).
  const insuranceCost = extras.insurance;
  const esimCost = extras.esim;
  // Transferi (aerodrom–smeštaj) — isti princip kao osiguranje/eSIM: fiksan
  // dodatak po tier-u, uvek dostupan (za prikaz, npr. u price-mix grafikonu),
  // ali se ne sabira u `total` dok ga korisnik svesno ne uključi.
  const transferCost = extras.transfer;

  const total = (flight?flight.price:0) + (hotel?hotel.price:0) + (car?car.price:0)
              + (activity?activity.price:0) + fuel + tolls;

  // Quality score je fiksna vrednost po tier-u (marketinški nivo paketa —
  // Comfort > Best Value > Budget), NE izvedena iz stvarnog sadržaja: tip
  // leta, tip auta i tražena kategorija hotela su isti izbor na sve tri
  // kartice (vidi flags.flightPref/carPref/hotelStars gore), pa razlika
  // između kartica nije u TOME šta je uključeno, već samo u ceni i sitnim
  // razlikama unutar iste kategorije (npr. koji tačno hotel od nekoliko u
  // istoj zvezdičnoj klasi, ili koja avio-kompanija kad korisnik nije
  // tražio konkretnu).
  // Sad izveden iz STVARNIH perks-ova uključenih stavki (vidi qualityFromPerks),
  // a ne iz fiksne konstante po tier-u.
  const qualityScore = qualityFromPerks([flight, hotel, car], tier);

  return {tier, flight, hotel, car, activity, fuel, tolls, insuranceCost, esimCost, transferCost, total, qualityScore,
    // Stvarno tražene kategorije (isti izbor za sve tri kartice — vidi
    // komentar uz `flags` u runSearch) — pkgDescText ih koristi umesto da
    // nagađa tip leta/auta iz tier-a, jer tier više ne menja KATEGORIJU
    // koju je korisnik tražio, samo cenu/kvalitet unutar nje.
    flightPref: flags.flightPref, carPref: flags.carPref};
}

/* ==========================================================
   DEV-ONLY PROVERA: invarijante nad buildPackage.
   Isti mehanizam/razlog kao assertFlightSubConsistency iznad, ali
   umesto da hvata JEDNU vrstu neusklađenosti, prolazi kroz mnogo
   nasumičnih kombinacija ulaza (destinacija/noći/putnici/flags) i
   proverava tri opšta svojstva koja moraju da važe za SVAKU
   kombinaciju, bez obzira na to kako se pricing logika menja u
   budućnosti:
     1) total === zbir uključenih stavki (+ gorivo + putarine) —
        lako se pokvari ako neko doda novo polje u cenu a zaboravi
        da ga uključi u `total`, ili obrnuto.
     2) stavka koju `flags` nije tražio(la) MORA biti null — nema
        "duha" u paketu (npr. auto na kartici kad Auto toggle nije
        uključen).
     3) cena raste Budget ≤ Best ≤ Comfort. Do 19.9. je ovo znalo da
        pukne na ~47% nasumičnih ulaza jer je svaka tier kartica
        nezavisno izvlačila SOPSTVENU nasumičnu "bazu" cene (jitter
        uporediv po veličini sa samim tier-množiocem). Otkriveno baš
        preko ove provere. Popravljeno deljenim `priceSeeds`
        (buildPriceSeeds) koji se izvlače JEDNOM po pretrazi i prosleđuju
        u sve tri buildPackage kartice — sad je redosled matematički
        garantovan (tier-množilac je jedina promenljiva), osim retkog
        teoretskog slučaja gde zaokruživanje na ceo broj izjednači dva
        susedna tier-a (jednako ≠ kršenje ≤). Test i dalje prolazi kroz
        60 različitih ulaza, sad kao regresiona zaštita da se neko opet
        ne vrati na nezavisno izvlačenje po tier-u.
   `rng` se namerno DELI između tri poziva, istim redosledom
   (best → comfort → budget) kao u computePackagesLocally — testira
   se stvarni redosled poziva iz produkcije, ne tri izolovana rng-a.
========================================================== */
function runBuildPackageInvariantChecks(){
  if (!DEV_MODE) return;
  const TIERS_IN_ORDER = ['best', 'comfort', 'budget'];
  const FLAG_COMBOS = [
    {flight:true,  hotel:true,  car:true,  activity:true},
    {flight:true,  hotel:true,  car:false, activity:false},
    {flight:false, hotel:true,  car:false, activity:true},
    {flight:true,  hotel:false, car:true,  activity:false},
    {flight:false, hotel:false, car:false, activity:true}
  ];
  const DESTS = ['Atina', 'Rim', 'Barselona', 'Budva', 'Beč'];
  const TRIALS = 60;
  let failures = 0;

  for (let i = 0; i < TRIALS; i++){
    const seed = 1000 + i * 97;
    const rng = seededRandom(seed);
    const dest = DESTS[i % DESTS.length];
    const nights = 2 + (i % 7);
    const days = nights + 1;
    const adults = 1 + (i % 4);
    const flags = {
      ...FLAG_COMBOS[i % FLAG_COMBOS.length],
      flightPref: ['direct', 'cheapest', 'airline'][i % 3],
      carPref: i % 2 ? 'suv' : 'small',
      hotelStars: [3, 4, 5][i % 3],
      activityCount: 1 + (i % 3)
    };
    const originCode = 'BEG';
    const inputDesc = 'seed=' + seed + ' dest=' + dest + ' nights=' + nights + ' adults=' + adults + ' flags=' + JSON.stringify(flags);
    const priceSeeds = buildPriceSeeds(rng);

    const results = {};
    TIERS_IN_ORDER.forEach(tier => {
      results[tier] = buildPackage(rng, dest, nights, days, adults, tier, flags, 1, originCode, 1, priceSeeds);
    });

    TIERS_IN_ORDER.forEach(tier => {
      const pkg = results[tier];

      // 1) total === zbir uključenih stavki
      const sum = (pkg.flight ? pkg.flight.price : 0) + (pkg.hotel ? pkg.hotel.price : 0)
                + (pkg.car ? pkg.car.price : 0) + (pkg.activity ? pkg.activity.price : 0)
                + pkg.fuel + pkg.tolls;
      if (sum !== pkg.total){
        failures++;
        console.error('[sklopi][invariant] total (' + pkg.total + ') != zbir stavki (' + sum + '). tier=' + tier + ' — ' + inputDesc);
      }

      // 2) nema stavke koju korisnik nije tražio
      ['flight', 'hotel', 'car', 'activity'].forEach(key => {
        const requested = !!flags[key];
        const present = !!pkg[key];
        if (requested !== present){
          failures++;
          console.error('[sklopi][invariant] stavka "' + key + '" ne prati flags (traženo=' + requested + ', prisutno=' + present + '). tier=' + tier + ' — ' + inputDesc);
        }
      });
    });

    // 3) Budget ≤ Best ≤ Comfort
    if (results.budget.total > results.best.total || results.best.total > results.comfort.total){
      failures++;
      console.error('[sklopi][invariant] cena nije Budget≤Best≤Comfort (budget=' + results.budget.total
        + ', best=' + results.best.total + ', comfort=' + results.comfort.total + ') — ' + inputDesc);
    }
  }

  if (failures){
    console.error('[sklopi][invariant] ukupno ' + failures + ' problema u buildPackage invarijantama (vidi gore).');
  } else {
    console.log('[sklopi][invariant] buildPackage: svih ' + TRIALS + ' probnih kombinacija prošlo (total/stavke/redosled cena).');
  }
}
runBuildPackageInvariantChecks();

// label ostaje kao nazivi paketa (Best Value / Comfort / Budget); desc je
// getter koji ide kroz t(), pa uvek prati trenutni jezik (nije keširan pri
// učitavanju skripte).
const TIER_META = {
  best:    {label:'Best Value', get desc(){ return t('tier_best_desc'); }},
  comfort: {label:'Comfort',    get desc(){ return t('tier_comfort_desc'); }},
  budget:  {label:'Budget',     get desc(){ return t('tier_budget_desc'); }}
};

/* Opis kartice ponude mora pratiti stvarni sadržaj paketa — koje usluge
   su STVARNO uključene (let/hotel/auto/aktivnosti) — a ne fiksni tekst po
   tier-u. Korisnik bira usluge preko toggle-a iznad forme (Letovi/Smeštaj/
   Auto/Aktivnosti), pa npr. Comfort ponuda bez izabranog Auto toggle-a ne
   sme da u opisu i dalje piše "prostraniji auto" kad auto nije ni prikazan
   na kartici.
   Tip leta i tip auta su TAKOĐE isti izbor na sve tri kartice (flags.
   flightPref/carPref iz upitnika važe podjednako za best/comfort/budget —
   tier menja samo cenu/kvalitet, ne i kategoriju), pa se ovde opisuju na
   osnovu STVARNOG izbora (pkg.flightPref/pkg.carPref), a ne fiksno po
   tier-u — inače bi npr. Comfort pisao "direktan let" i kad je korisnik
   tražio najjeftiniji let sa presedanjem. Iz istog razloga, odsustvo auta
   (kad Auto toggle nije uključen) važi podjednako za sve tri kartice, pa
   se ne ističe kao posebna "Budget prednost". */
function pkgDescText(pkg){
  const bits = [];
  if (pkg.hotel) bits.push(t(pkg.tier === 'comfort' ? 'pkg_desc_hotel_better' : pkg.tier === 'budget' ? 'pkg_desc_hotel_cheapest' : 'pkg_desc_hotel_verified'));
  if (pkg.flight){
    bits.push(t(pkg.flightPref === 'cheapest' ? 'pkg_desc_flight_stopover'
      : pkg.flightPref === 'airline' ? 'pkg_desc_flight_airline'
      : 'pkg_desc_flight_direct'));
  }
  if (pkg.car) bits.push(t(pkg.carPref === 'suv' ? 'pkg_desc_car_spacious' : 'pkg_desc_car'));
  if (pkg.activity) bits.push(t('pkg_desc_activities'));

  if (!bits.length) return TIER_META[pkg.tier].label;

  let text = bits.length === 1
    ? bits[0]
    : bits.slice(0, -1).join(', ') + ' ' + t('pkg_desc_and') + ' ' + bits[bits.length - 1];
  text = text.charAt(0).toUpperCase() + text.slice(1);

  return text;
}

// Kartice se iscrtavaju jednom (pkgHtml), pa bez ovoga opis i nazivi/podnaslovi
// stavki ostaju na starom jeziku posle prebacivanja SR/EN/RU. Osvežava samo
// tekst (ne ceo rezultat) — statični delovi kartice idu preko data-i18n.
const _prevOnLangChangePkgDesc = window.onLangChange;
window.onLangChange = function(lang){
  if (typeof _prevOnLangChangePkgDesc === 'function') _prevOnLangChangePkgDesc(lang);
  const pkgs = window._lastSearchPkgs;
  if (!Array.isArray(pkgs)) return;
  document.querySelectorAll('.pkg:not(.match-pkg)').forEach(card => {
    const pkg = pkgs.find(p => card.classList.contains(p.tier));
    if (!pkg) return;
    const desc = card.querySelector('.pkg-desc');
    if (desc) desc.textContent = pkgDescText(pkg);
    ['flight', 'hotel', 'car'].forEach(kind => {
      const item = pkg[kind], el = card.querySelector('.item-card.' + kind);
      if (!item || !el) return;
      const nameEl = el.querySelector('.item-name'), subEl = el.querySelector('.item-sub');
      if (nameEl) nameEl.textContent = item.name;
      if (subEl) subEl.textContent = item.sub;
    });
    const actLab = card.querySelector('.activity-extra .lab');
    if (actLab && pkg.activity) actLab.textContent = pkg.activity.name.split(' — ')[0];
  });
};

const ICONS = {
  flight: '<path d="M2 16l6-2 4.5-7 2 .6-2.5 6.9 5 1.5 3-2.4 1.6.5-2 3-5.5 1-1 2.6-1.8-.5.7-2.8-5 1.2-1-1.7z"/>',
  hotel: '<path d="M3 21V6l7-3 7 3v15M3 21h18M9 21v-6h4v6M9 10h.01M13 10h.01M9 6.5h.01M13 6.5h.01"/>',
  car: '<path d="M4 16v-4l2-5h12l2 5v4M4 16h16M4 16v2.5a1 1 0 001 1h1a1 1 0 001-1V16M17 16v2.5a1 1 0 001 1h1a1 1 0 001-1V16M6 12h12"/>',
  activity: '<path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/>',
  fuel: '<path d="M6 21V6a2 2 0 012-2h4a2 2 0 012 2v15M6 21h8M6 10h8M16 9l2.5 2v6a1.4 1.4 0 002.5-.9V9.5L18 6"/>',
  tolls: '<path d="M4 20L11 4h2l7 16M8 15h8"/>',
  insurance: '<path d="M12 2l8 3v6c0 5-3.4 8.5-8 11-4.6-2.5-8-6-8-11V5l8-3z"/>',
  esim: '<path d="M6 8.5a8.5 8.5 0 0112 0M8.7 11.2a4.7 4.7 0 016.6 0M11.4 13.9a1 1 0 011.2 0"/><circle cx="12" cy="17.5" r="1.1" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 3v3M16 3v3"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M2 20c1.2-3.4 3.5-5 7-5s5.8 1.6 7 5M17 8.3a3 3 0 010 5.9M20 20c-.4-1.9-1.2-3.3-2.5-4.2"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  extra: '<circle cx="12" cy="12" r="8"/>'
};
function iconSvg(type){
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(ICONS[type]||ICONS.extra)+'</svg>';
}

/* ==========================================================
   STATE + RENDER
========================================================== */
const state = { searches:0, clicks:0, lastDest:null };
const STATS_STORAGE_KEY = 'sklopi_stats_v1';
/* ---- Minimalne "prikazane" vrednosti za brojače — stvarni state ispod
   se i dalje normalno broji i čuva, ali se na ekranu NIKAD ne prikazuje
   0 (ili prazna poslednja destinacija), da sajt ne deluje prazno/nov
   novom posetiocu ili posle brisanja localStorage-a. ---- */
const STAT_DISPLAY_FLOOR = { searches: 182, clicks: 96 };
const STAT_LAST_DEST_FALLBACK = 'Atina';
function loadStats(){
  try{
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.searches = saved.searches || 0;
    state.clicks = saved.clicks || 0;
    state.lastDest = saved.lastDest || null;
  }catch(e){ /* localStorage nedostupan (privatni mod i sl.) — nastavi sa 0 */ }
}
function saveStats(){
  try{
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify({searches:state.searches, clicks:state.clicks, lastDest:state.lastDest}));
  }catch(e){}
}
loadStats();

/* ==========================================================
   VALUTA — EUR/RSD prikaz

   Sve cene na sajtu su i onako ilustrativna procena (vidi
   disclaimer_illustrative), pa RSD prikaz koristi FIKSAN kurs za
   konverziju, ne uživo/NBS kurs — dovoljno je za "koliko je to
   otprilike u dinarima", ne za tačno plaćanje. Kad affiliate API
   proradi i cene postanu prave, ovde bi trebalo uvesti pravi kurs
   (ili konvertovati na serveru, zavisno od partnera).

   fmtEUR() ostaje pod istim imenom (koristi se na 20+ mesta u
   kodu) da bi se izbeglo preimenovanje svuda — samo je interno
   postala "prikaži cenu u trenutno izabranoj valuti".
========================================================== */
const RSD_PER_EUR = 117; // fiksni prikazni kurs, ažuriraj povremeno rucno
let currentCurrency = (localStorage.getItem('sklopi_currency') === 'RSD') ? 'RSD' : 'EUR';

function fmtEUR(n){
  if (currentCurrency === 'RSD'){
    return Math.round(n * RSD_PER_EUR).toLocaleString('sr-RS') + ' RSD';
  }
  return '€' + n.toLocaleString('de-DE');
}

function applyCurrencyToggleUi(){
  const btn = document.getElementById('currencySwitchBtn');
  if (!btn) return;
  btn.setAttribute('data-currency', currentCurrency);
  btn.setAttribute('aria-pressed', currentCurrency === 'RSD' ? 'true' : 'false');
}

// Ponovo iscrtava VEĆ PRIKAZANE cene u novoj valuti — ne pokreće novu
// pretragu od nule. Builder je jeftin (renderBuilder je sinhron, isti
// deterministički seed → isti brojevi, samo nov format), a gotove
// ponude (Budget/Best/Comfort) prolaze kroz runSearch jer je to jedini
// siguran ulaz koji renderResults ume da pozove sa svim potrebnim
// argumentima (originCode, autoReveal...); isti seed → cene se ne
// menjaju, samo se ponovo formatiraju.
function refreshDisplayedPrices(){
  const builderPanel = document.getElementById('builderPanel');
  if (window._lastBuilderPkg && builderPanel && builderPanel.style.display !== 'none'){
    renderBuilder();
  }
  const results = document.getElementById('results');
  if (window._lastSearchCtx && results && results.classList.contains('visible') && validateSearchInputs().ok){
    runSearch(false); // tiho preskoči ako je forma u međuvremenu izmenjena u neispravno stanje
  }
}

function setCurrency(cur){
  currentCurrency = (cur === 'RSD') ? 'RSD' : 'EUR';
  localStorage.setItem('sklopi_currency', currentCurrency);
  applyCurrencyToggleUi();
  refreshDisplayedPrices();
}

function attachAffiliateLinks(pkg, dest, from, to, adults, extra){
  // extra = {originCode, flags} — polazište i izbori iz upitnika, da link
  // vodi na ono što kartica opisuje (ruta, tip leta, zvezdice, sobe).
  extra = extra || {};
  const f = extra.flags || {};
  const ctx = {
    dest, from, to, adults,
    originCode: extra.originCode || '',
    flightPref: f.flightPref, hotelStars: f.hotelStars,
    prioritizeRating: f.prioritizeRating, prioritizeLocation: f.prioritizeLocation,
    carPref: f.carPref
  };
  pkg.dest = dest; // sačuvano na pkg da bi analitika (GA4 affiliate_click) znala destinaciju/tier klika
  if (pkg.flight)   pkg.flight.bookUrl   = buildAffiliateLink('flight', ctx);
  if (pkg.hotel)    pkg.hotel.bookUrl    = buildAffiliateLink('hotel', ctx);
  if (pkg.car)      pkg.car.bookUrl      = buildAffiliateLink('car', ctx);
  if (pkg.activity) pkg.activity.bookUrl = buildAffiliateLink('activity', ctx);
  // eSIM i osiguranje nisu "fetch-ovane" stavke kao let/hotel/auto/aktivnost
  // (nemaju svoju cenu sa partnerskog API-ja, cena im dolazi iz EXTRA_COSTS) —
  // ali dugme na svakom dodatku i dalje treba pravi link ka partneru.
  pkg.esimBookUrl = buildAffiliateLink('esim', ctx);
  pkg.insuranceBookUrl = buildAffiliateLink('insurance', ctx);
}

/* ==========================================================
   API FEED — poziv ka backendu (server/src/routes/search.js).
   Ako backend nije upaljen (nema hostinga jos, radi se lokalno bez
   servera, ili je pao), automatski se vraca na stari lokalni mock —
   sajt NIKAD ne sme da ostane bez rezultata korisniku.
========================================================== */
// Postavi ovo na URL svog backenda kad ga deploy-ujes, npr:
// window.SKLOPI_API_BASE = 'https://api.sklopi.rs';
const API_BASE = window.SKLOPI_API_BASE || '';

/* ---- Autocomplete destinacije: prvo /api/locations (ako je backend podešen),
   a ako nema backend-a (ili poziv ne uspe) — Open-Meteo geokodiranje, isti
   javni API bez ključa koji se već koristi za vremensku prognozu. ---- */
/* ---- Poznati gradovi/prestonice/turistička mesta — ovo je uvek prvi izvor
   predloga, jer Open-Meteo geokoding ume da vrati nepoznata mesta umesto
   očiglednih (npr. selo umesto prestonice), i loše "pogađa" kad se kuca
   bez kvačica (c/s/z umesto č/š/ž). Tek ako ovde nema dovoljno pogodaka,
   dopunjuje se sa Open-Meteo. ---- */
const POPULAR_DESTINATIONS = [
  // Srbija
  {name:'Beograd', extra:'Srbija'}, {name:'Novi Sad', extra:'Srbija'}, {name:'Niš', extra:'Srbija'},
  {name:'Kragujevac', extra:'Srbija'}, {name:'Subotica', extra:'Srbija'}, {name:'Zlatibor', extra:'Srbija'},
  {name:'Kopaonik', extra:'Srbija'}, {name:'Vrnjačka Banja', extra:'Srbija'},
  {name:'Čačak', extra:'Srbija'}, {name:'Kraljevo', extra:'Srbija'}, {name:'Kruševac', extra:'Srbija'},
  {name:'Šabac', extra:'Srbija'}, {name:'Smederevo', extra:'Srbija'}, {name:'Užice', extra:'Srbija'},
  {name:'Vranje', extra:'Srbija'}, {name:'Leskovac', extra:'Srbija'}, {name:'Zaječar', extra:'Srbija'},
  {name:'Valjevo', extra:'Srbija'}, {name:'Sombor', extra:'Srbija'}, {name:'Zrenjanin', extra:'Srbija'},
  {name:'Pančevo', extra:'Srbija'}, {name:'Vršac', extra:'Srbija'}, {name:'Loznica', extra:'Srbija'},
  {name:'Sremska Mitrovica', extra:'Srbija'}, {name:'Bečej', extra:'Srbija'}, {name:'Kikinda', extra:'Srbija'},
  {name:'Pirot', extra:'Srbija'}, {name:'Jagodina', extra:'Srbija'}, {name:'Paraćin', extra:'Srbija'},
  {name:'Aranđelovac', extra:'Srbija'}, {name:'Požarevac', extra:'Srbija'}, {name:'Bor', extra:'Srbija'},
  {name:'Negotin', extra:'Srbija'}, {name:'Priboj', extra:'Srbija'}, {name:'Prijepolje', extra:'Srbija'},
  {name:'Sjenica', extra:'Srbija'}, {name:'Novi Pazar', extra:'Srbija'}, {name:'Ivanjica', extra:'Srbija'},
  {name:'Gornji Milanovac', extra:'Srbija'}, {name:'Vrbas', extra:'Srbija'}, {name:'Inđija', extra:'Srbija'},
  {name:'Ruma', extra:'Srbija'}, {name:'Sremski Karlovci', extra:'Srbija'}, {name:'Bajina Bašta', extra:'Srbija'},
  // Srbija — planine
  {name:'Tara', extra:'Srbija'}, {name:'Divčibare', extra:'Srbija'}, {name:'Stara Planina', extra:'Srbija'},
  {name:'Golija', extra:'Srbija'}, {name:'Rtanj', extra:'Srbija'}, {name:'Zlatar', extra:'Srbija'},
  {name:'Mokra Gora', extra:'Srbija'}, {name:'Fruška Gora', extra:'Srbija'}, {name:'Vlasina', extra:'Srbija'}, {name:'Goč', extra:'Srbija'},
  // Srbija — banje
  {name:'Sokobanja', extra:'Srbija'}, {name:'Niška Banja', extra:'Srbija'}, {name:'Banja Koviljača', extra:'Srbija'},
  {name:'Banja Vrujci', extra:'Srbija'}, {name:'Banja Kanjiža', extra:'Srbija'}, {name:'Prolom Banja', extra:'Srbija'},
  {name:'Bukovička Banja', extra:'Srbija'}, {name:'Vranjska Banja', extra:'Srbija'}, {name:'Mataruška Banja', extra:'Srbija'},
  {name:'Sijarinska Banja', extra:'Srbija'}, {name:'Josanička Banja', extra:'Srbija'}, {name:'Ribarska Banja', extra:'Srbija'},
  // Srbija — jezera i prirodne atrakcije
  {name:'Palić', extra:'Srbija'}, {name:'Zlatarsko jezero', extra:'Srbija'}, {name:'Perućac', extra:'Srbija'},
  {name:'Srebrno jezero', extra:'Srbija'}, {name:'Borsko jezero', extra:'Srbija'}, {name:'Gružansko jezero', extra:'Srbija'},
  {name:'Đerdap', extra:'Srbija'}, {name:'Uvac', extra:'Srbija'}, {name:'Golubac', extra:'Srbija'},
  {name:'Ćuprija', extra:'Srbija'}, {name:'Prokuplje', extra:'Srbija'}, {name:'Svilajnac', extra:'Srbija'},
  {name:'Senta', extra:'Srbija'}, {name:'Kanjiža', extra:'Srbija'}, {name:'Temerin', extra:'Srbija'},
  // Region
  {name:'Podgorica', extra:'Crna Gora'}, {name:'Budva', extra:'Crna Gora'}, {name:'Kotor', extra:'Crna Gora'},
  {name:'Herceg Novi', extra:'Crna Gora'}, {name:'Igalo', extra:'Crna Gora'}, {name:'Bar', extra:'Crna Gora'},
  {name:'Tivat', extra:'Crna Gora'}, {name:'Petrovac', extra:'Crna Gora'}, {name:'Sutomore', extra:'Crna Gora'},
  {name:'Ulcinj', extra:'Crna Gora'}, {name:'Perast', extra:'Crna Gora'}, {name:'Risan', extra:'Crna Gora'},
  {name:'Žabljak', extra:'Crna Gora'}, {name:'Kolašin', extra:'Crna Gora'}, {name:'Nikšić', extra:'Crna Gora'},
  {name:'Cetinje', extra:'Crna Gora'}, {name:'Rožaje', extra:'Crna Gora'},
  {name:'Bijelo Polje', extra:'Crna Gora'}, {name:'Pljevlja', extra:'Crna Gora'}, {name:'Berane', extra:'Crna Gora'},
  {name:'Plav', extra:'Crna Gora'}, {name:'Mojkovac', extra:'Crna Gora'}, {name:'Danilovgrad', extra:'Crna Gora'},
  {name:'Andrijevica', extra:'Crna Gora'}, {name:'Gusinje', extra:'Crna Gora'}, {name:'Plužine', extra:'Crna Gora'}, {name:'Šavnik', extra:'Crna Gora'},
  {name:'Durmitor', extra:'Crna Gora'}, {name:'Biogradska Gora', extra:'Crna Gora'}, {name:'Lovćen', extra:'Crna Gora'},
  {name:'Skadarsko Jezero', extra:'Crna Gora'},
  {name:'Virpazar', extra:'Crna Gora'}, {name:'Ada Bojana', extra:'Crna Gora'}, {name:'Čanj', extra:'Crna Gora'},
  {name:'Buljarica', extra:'Crna Gora'}, {name:'Prčanj', extra:'Crna Gora'}, {name:'Ostrog', extra:'Crna Gora'},
  {name:'Sarajevo', extra:'Bosna i Hercegovina'}, {name:'Mostar', extra:'Bosna i Hercegovina'}, {name:'Banja Luka', extra:'Bosna i Hercegovina'},
  {name:'Trebinje', extra:'Bosna i Hercegovina'}, {name:'Bihać', extra:'Bosna i Hercegovina'}, {name:'Tuzla', extra:'Bosna i Hercegovina'},
  {name:'Zenica', extra:'Bosna i Hercegovina'},
  {name:'Jajce', extra:'Bosna i Hercegovina'}, {name:'Travnik', extra:'Bosna i Hercegovina'}, {name:'Konjic', extra:'Bosna i Hercegovina'},
  {name:'Neum', extra:'Bosna i Hercegovina'}, {name:'Bijeljina', extra:'Bosna i Hercegovina'}, {name:'Doboj', extra:'Bosna i Hercegovina'},
  {name:'Prijedor', extra:'Bosna i Hercegovina'}, {name:'Brčko', extra:'Bosna i Hercegovina'}, {name:'Foča', extra:'Bosna i Hercegovina'},
  {name:'Višegrad', extra:'Bosna i Hercegovina'},
  {name:'Bjelašnica', extra:'Bosna i Hercegovina'}, {name:'Jahorina', extra:'Bosna i Hercegovina'}, {name:'Vlašić', extra:'Bosna i Hercegovina'}, {name:'Kupres', extra:'Bosna i Hercegovina'},
  {name:'Blagaj', extra:'Bosna i Hercegovina'}, {name:'Počitelj', extra:'Bosna i Hercegovina'}, {name:'Vrelo Bosne', extra:'Bosna i Hercegovina'},
  {name:'Sutjeska', extra:'Bosna i Hercegovina'}, {name:'Una', extra:'Bosna i Hercegovina'}, {name:'Livno', extra:'Bosna i Hercegovina'},
  {name:'Zagreb', extra:'Hrvatska'}, {name:'Split', extra:'Hrvatska'}, {name:'Dubrovnik', extra:'Hrvatska'},
  {name:'Zadar', extra:'Hrvatska'}, {name:'Rijeka', extra:'Hrvatska'}, {name:'Pula', extra:'Hrvatska'}, {name:'Hvar', extra:'Hrvatska'},
  {name:'Makarska', extra:'Hrvatska'}, {name:'Trogir', extra:'Hrvatska'}, {name:'Šibenik', extra:'Hrvatska'}, {name:'Rovinj', extra:'Hrvatska'},
  {name:'Osijek', extra:'Hrvatska'}, {name:'Krk', extra:'Hrvatska'}, {name:'Poreč', extra:'Hrvatska'}, {name:'Umag', extra:'Hrvatska'},
  {name:'Opatija', extra:'Hrvatska'}, {name:'Cavtat', extra:'Hrvatska'}, {name:'Vis', extra:'Hrvatska'},
  {name:'Varaždin', extra:'Hrvatska'}, {name:'Karlovac', extra:'Hrvatska'}, {name:'Sisak', extra:'Hrvatska'},
  {name:'Vukovar', extra:'Hrvatska'}, {name:'Slavonski Brod', extra:'Hrvatska'}, {name:'Vinkovci', extra:'Hrvatska'},
  {name:'Đakovo', extra:'Hrvatska'}, {name:'Čakovec', extra:'Hrvatska'}, {name:'Bjelovar', extra:'Hrvatska'},
  {name:'Koprivnica', extra:'Hrvatska'}, {name:'Požega', extra:'Hrvatska'}, {name:'Virovitica', extra:'Hrvatska'},
  // Hrvatska — obala i ostrva
  {name:'Biograd na Moru', extra:'Hrvatska'}, {name:'Vodice', extra:'Hrvatska'}, {name:'Primošten', extra:'Hrvatska'},
  {name:'Omiš', extra:'Hrvatska'}, {name:'Baška Voda', extra:'Hrvatska'}, {name:'Brela', extra:'Hrvatska'}, {name:'Tučepi', extra:'Hrvatska'},
  {name:'Korčula', extra:'Hrvatska'}, {name:'Vela Luka', extra:'Hrvatska'}, {name:'Supetar', extra:'Hrvatska'}, {name:'Bol', extra:'Hrvatska'},
  {name:'Mali Lošinj', extra:'Hrvatska'}, {name:'Cres', extra:'Hrvatska'}, {name:'Rab', extra:'Hrvatska'}, {name:'Novalja', extra:'Hrvatska'},
  {name:'Pag', extra:'Hrvatska'}, {name:'Vrsar', extra:'Hrvatska'}, {name:'Fažana', extra:'Hrvatska'}, {name:'Kaštela', extra:'Hrvatska'},
  {name:'Mljet', extra:'Hrvatska'}, {name:'Lastovo', extra:'Hrvatska'}, {name:'Šolta', extra:'Hrvatska'},
  // Hrvatska — nacionalni parkovi, planine, banje
  {name:'Plitvička Jezera', extra:'Hrvatska'}, {name:'Krka', extra:'Hrvatska'}, {name:'Paklenica', extra:'Hrvatska'},
  {name:'Učka', extra:'Hrvatska'}, {name:'Medvednica', extra:'Hrvatska'},
  {name:'Varaždinske Toplice', extra:'Hrvatska'}, {name:'Stubičke Toplice', extra:'Hrvatska'},
  {name:'Krapinske Toplice', extra:'Hrvatska'}, {name:'Daruvarske Toplice', extra:'Hrvatska'},
  {name:'Velebit', extra:'Hrvatska'}, {name:'Biokovo', extra:'Hrvatska'},
  {name:'Skoplje', extra:'Severna Makedonija'}, {name:'Ohrid', extra:'Severna Makedonija'},
  {name:'Bitola', extra:'Severna Makedonija'}, {name:'Tetovo', extra:'Severna Makedonija'},
  {name:'Kumanovo', extra:'Severna Makedonija'}, {name:'Prilep', extra:'Severna Makedonija'}, {name:'Strumica', extra:'Severna Makedonija'},
  {name:'Gevgelija', extra:'Severna Makedonija'}, {name:'Veles', extra:'Severna Makedonija'}, {name:'Struga', extra:'Severna Makedonija'},
  {name:'Kruševo', extra:'Severna Makedonija'}, {name:'Mavrovo', extra:'Severna Makedonija'},
  {name:'Priština', extra:'Kosovo'}, {name:'Prizren', extra:'Kosovo'}, {name:'Peć', extra:'Kosovo'},
  {name:'Gnjilane', extra:'Kosovo'}, {name:'Mitrovica', extra:'Kosovo'}, {name:'Đakovica', extra:'Kosovo'}, {name:'Uroševac', extra:'Kosovo'},
  {name:'Brezovica', extra:'Kosovo'}, {name:'Rugova', extra:'Kosovo'}, {name:'Dečani', extra:'Kosovo'}, {name:'Gračanica', extra:'Kosovo'},
  {name:'Ljubljana', extra:'Slovenija'}, {name:'Bled', extra:'Slovenija'}, {name:'Piran', extra:'Slovenija'},
  {name:'Maribor', extra:'Slovenija'}, {name:'Kranjska Gora', extra:'Slovenija'}, {name:'Portorož', extra:'Slovenija'},
  {name:'Kranj', extra:'Slovenija'}, {name:'Celje', extra:'Slovenija'}, {name:'Novo Mesto', extra:'Slovenija'},
  {name:'Koper', extra:'Slovenija'}, {name:'Ptuj', extra:'Slovenija'}, {name:'Škofja Loka', extra:'Slovenija'},
  {name:'Kamnik', extra:'Slovenija'}, {name:'Idrija', extra:'Slovenija'},
  {name:'Postojna', extra:'Slovenija'}, {name:'Bohinj', extra:'Slovenija'}, {name:'Bovec', extra:'Slovenija'},
  {name:'Kobarid', extra:'Slovenija'}, {name:'Logarska Dolina', extra:'Slovenija'}, {name:'Rogaška Slatina', extra:'Slovenija'},
  {name:'Murska Sobota', extra:'Slovenija'}, {name:'Nova Gorica', extra:'Slovenija'}, {name:'Velenje', extra:'Slovenija'},
  {name:'Jesenice', extra:'Slovenija'}, {name:'Slovenj Gradec', extra:'Slovenija'},
  // Slovenija — banje
  {name:'Čatež', extra:'Slovenija'}, {name:'Terme Ptuj', extra:'Slovenija'}, {name:'Dolenjske Toplice', extra:'Slovenija'},
  {name:'Moravske Toplice', extra:'Slovenija'}, {name:'Laško', extra:'Slovenija'}, {name:'Radenci', extra:'Slovenija'},
  // Slovenija — planine
  {name:'Triglav', extra:'Slovenija'}, {name:'Vogel', extra:'Slovenija'}, {name:'Krvavec', extra:'Slovenija'},
  {name:'Pohorje', extra:'Slovenija'}, {name:'Mangart', extra:'Slovenija'},
  // Slovenija — turistički centri
  {name:'Škocjanske jame', extra:'Slovenija'}, {name:'Predjama', extra:'Slovenija'}, {name:'Vintgar', extra:'Slovenija'},
  // Slovenija — primorska mesta
  {name:'Izola', extra:'Slovenija'}, {name:'Ankaran', extra:'Slovenija'},
  {name:'Tirana', extra:'Albanija'}, {name:'Sarande', extra:'Albanija'},
  {name:'Drač', extra:'Albanija'}, {name:'Vlora', extra:'Albanija'}, {name:'Ksamil', extra:'Albanija'},
  {name:'Skadar', extra:'Albanija'}, {name:'Kruja', extra:'Albanija'}, {name:'Berat', extra:'Albanija'},
  {name:'Gjirokastra', extra:'Albanija'}, {name:'Pogradec', extra:'Albanija'},
  {name:'Dhermi', extra:'Albanija'}, {name:'Himara', extra:'Albanija'},
  {name:'Theth', extra:'Albanija'}, {name:'Valbona', extra:'Albanija'},
  {name:'Bukurešt', extra:'Rumunija'}, {name:'Kluž', extra:'Rumunija'}, {name:'Brašov', extra:'Rumunija'}, {name:'Konstanca', extra:'Rumunija'},
  {name:'Sibiu', extra:'Rumunija'}, {name:'Temišvar', extra:'Rumunija'}, {name:'Jaši', extra:'Rumunija'}, {name:'Sinaja', extra:'Rumunija'}, {name:'Bran', extra:'Rumunija'}, {name:'Mamaja', extra:'Rumunija'},
  {name:'Sofija', extra:'Bugarska'}, {name:'Varna', extra:'Bugarska'}, {name:'Burgas', extra:'Bugarska'},
  {name:'Plovdiv', extra:'Bugarska'}, {name:'Nesebar', extra:'Bugarska'}, {name:'Bansko', extra:'Bugarska'},
  {name:'Ruse', extra:'Bugarska'}, {name:'Stara Zagora', extra:'Bugarska'}, {name:'Pleven', extra:'Bugarska'},
  {name:'Veliko Trnovo', extra:'Bugarska'}, {name:'Blagoevgrad', extra:'Bugarska'}, {name:'Šumen', extra:'Bugarska'},
  {name:'Sliven', extra:'Bugarska'}, {name:'Vidin', extra:'Bugarska'}, {name:'Dobrič', extra:'Bugarska'},
  {name:'Kjustendil', extra:'Bugarska'}, {name:'Gabrovo', extra:'Bugarska'}, {name:'Haskovo', extra:'Bugarska'},
  // Bugarska — banje
  {name:'Sandanski', extra:'Bugarska'}, {name:'Velingrad', extra:'Bugarska'}, {name:'Hisarja', extra:'Bugarska'},
  {name:'Devin', extra:'Bugarska'}, {name:'Pavel Banja', extra:'Bugarska'}, {name:'Bankja', extra:'Bugarska'},
  // Bugarska — planine
  {name:'Borovec', extra:'Bugarska'}, {name:'Pamporovo', extra:'Bugarska'}, {name:'Vitoša', extra:'Bugarska'},
  {name:'Čepelare', extra:'Bugarska'}, {name:'Rila', extra:'Bugarska'},
  // Bugarska — turistički centri
  {name:'Koprivštica', extra:'Bugarska'}, {name:'Melnik', extra:'Bugarska'}, {name:'Rilski manastir', extra:'Bugarska'},
  {name:'Trjavna', extra:'Bugarska'}, {name:'Arbanasi', extra:'Bugarska'},
  // Bugarska — primorska mesta
  {name:'Sozopol', extra:'Bugarska'}, {name:'Sunčev Breg', extra:'Bugarska'}, {name:'Zlatni Pjasci', extra:'Bugarska'},
  {name:'Primorsko', extra:'Bugarska'}, {name:'Balčik', extra:'Bugarska'}, {name:'Kavarna', extra:'Bugarska'},
  {name:'Carevo', extra:'Bugarska'}, {name:'Pomorije', extra:'Bugarska'}, {name:'Ahtopol', extra:'Bugarska'},
  // Grčka i Egej
  {name:'Atina', extra:'Grčka'}, {name:'Solun', extra:'Grčka'}, {name:'Krf', extra:'Grčka'},
  {name:'Santorini', extra:'Grčka'}, {name:'Mikonos', extra:'Grčka'}, {name:'Rodos', extra:'Grčka'},
  {name:'Krit', extra:'Grčka'}, {name:'Halkidiki', extra:'Grčka'},
  {name:'Zakintos', extra:'Grčka'}, {name:'Kefalonija', extra:'Grčka'}, {name:'Lefkada', extra:'Grčka'},
  {name:'Paros', extra:'Grčka'}, {name:'Naksos', extra:'Grčka'}, {name:'Kos', extra:'Grčka'}, {name:'Volos', extra:'Grčka'},
  // Grčka — gradovi
  {name:'Patra', extra:'Grčka'}, {name:'Larisa', extra:'Grčka'}, {name:'Kavala', extra:'Grčka'},
  {name:'Janjina', extra:'Grčka'}, {name:'Iraklion', extra:'Grčka'}, {name:'Kalamata', extra:'Grčka'},
  // Grčka — banje
  {name:'Lutraki', extra:'Grčka'}, {name:'Edipsos', extra:'Grčka'},
  // Grčka — planine
  {name:'Olimp', extra:'Grčka'}, {name:'Pilion', extra:'Grčka'},
  // Grčka — turistički centri
  {name:'Meteori', extra:'Grčka'}, {name:'Delfi', extra:'Grčka'}, {name:'Nafplion', extra:'Grčka'},
  // Grčka — primorska mesta i ostrva
  {name:'Tasos', extra:'Grčka'}, {name:'Samos', extra:'Grčka'}, {name:'Hios', extra:'Grčka'},
  {name:'Skijatos', extra:'Grčka'}, {name:'Skopelos', extra:'Grčka'}, {name:'Evija', extra:'Grčka'},
  {name:'Idra', extra:'Grčka'}, {name:'Spece', extra:'Grčka'}, {name:'Milos', extra:'Grčka'},
  {name:'Ios', extra:'Grčka'}, {name:'Egina', extra:'Grčka'}, {name:'Poros', extra:'Grčka'},
  // Italija
  {name:'Rim', extra:'Italija'}, {name:'Milano', extra:'Italija'}, {name:'Napulj', extra:'Italija'},
  {name:'Venecija', extra:'Italija'}, {name:'Firenca', extra:'Italija'}, {name:'Bolonja', extra:'Italija'},
  {name:'Verona', extra:'Italija'}, {name:'Torino', extra:'Italija'}, {name:'Bari', extra:'Italija'}, {name:'Sicilija', extra:'Italija'},
  {name:'Đenova', extra:'Italija'}, {name:'Pisa', extra:'Italija'}, {name:'Trst', extra:'Italija'},
  {name:'Leče', extra:'Italija'}, {name:'Sardinija', extra:'Italija'}, {name:'Kaljari', extra:'Italija'},
  {name:'Palermo', extra:'Italija'}, {name:'Katanija', extra:'Italija'}, {name:'Padova', extra:'Italija'}, {name:'Parma', extra:'Italija'},
  {name:'Modena', extra:'Italija'}, {name:'Perudja', extra:'Italija'}, {name:'Brešija', extra:'Italija'}, {name:'Salerno', extra:'Italija'},
  // Italija — banje
  {name:'Abano Terme', extra:'Italija'}, {name:'Montekatini Terme', extra:'Italija'}, {name:'Fjuđi', extra:'Italija'}, {name:'Salsomađore Terme', extra:'Italija'},
  // Italija — planine
  {name:'Dolomiti', extra:'Italija'}, {name:'Kortina d\'Ampeco', extra:'Italija'}, {name:'Val Gardena', extra:'Italija'}, {name:'Livinjo', extra:'Italija'}, {name:'Etna', extra:'Italija'},
  // Italija — turistički centri
  {name:'Pompeji', extra:'Italija'}, {name:'Asizi', extra:'Italija'}, {name:'Sijena', extra:'Italija'}, {name:'San Đimonjano', extra:'Italija'}, {name:'Orvieto', extra:'Italija'}, {name:'Ravena', extra:'Italija'},
  // Italija — primorska mesta
  {name:'Amalfi', extra:'Italija'}, {name:'Pozitano', extra:'Italija'}, {name:'Sorento', extra:'Italija'}, {name:'Rimini', extra:'Italija'},
  {name:'Kapri', extra:'Italija'}, {name:'Portofino', extra:'Italija'}, {name:'Elba', extra:'Italija'}, {name:'Taormina', extra:'Italija'},
  // Španija i Portugal
  {name:'Barselona', extra:'Španija'}, {name:'Madrid', extra:'Španija'}, {name:'Valensija', extra:'Španija'},
  {name:'Malaga', extra:'Španija'}, {name:'Ibica', extra:'Španija'}, {name:'Majorka', extra:'Španija'}, {name:'Sevilja', extra:'Španija'},
  {name:'Alikante', extra:'Španija'}, {name:'Granada', extra:'Španija'}, {name:'Bilbao', extra:'Španija'},
  {name:'Tenerife', extra:'Španija'}, {name:'Gran Kanarija', extra:'Španija'},
  {name:'San Sebastijan', extra:'Španija'}, {name:'Salamanka', extra:'Španija'}, {name:'Toledo', extra:'Španija'},
  {name:'Santjago de Kompostela', extra:'Španija'}, {name:'Lanzarote', extra:'Španija'}, {name:'Fuerteventura', extra:'Španija'},
  {name:'Lisabon', extra:'Portugalija'}, {name:'Porto', extra:'Portugalija'}, {name:'Faro', extra:'Portugalija'}, {name:'Kordoba', extra:'Španija'},
  {name:'Koimbra', extra:'Portugalija'}, {name:'Braga', extra:'Portugalija'}, {name:'Sintra', extra:'Portugalija'},
  {name:'Albufeira', extra:'Portugalija'}, {name:'Madeira', extra:'Portugalija'}, {name:'Azori', extra:'Portugalija'},
  // Zapadna/Severna Evropa
  {name:'Pariz', extra:'Francuska'}, {name:'Nica', extra:'Francuska'}, {name:'Lion', extra:'Francuska'},
  {name:'Bordo', extra:'Francuska'}, {name:'Marselj', extra:'Francuska'}, {name:'Strazbur', extra:'Francuska'},
  {name:'Tuluz', extra:'Francuska'}, {name:'Kan', extra:'Francuska'}, {name:'Avinjon', extra:'Francuska'},
  {name:'Anesi', extra:'Francuska'}, {name:'Šamoni', extra:'Francuska'}, {name:'Korzika', extra:'Francuska'},
  {name:'London', extra:'Velika Britanija'}, {name:'Edinburg', extra:'Velika Britanija'},
  {name:'Mančester', extra:'Velika Britanija'}, {name:'Liverpul', extra:'Velika Britanija'},
  {name:'Glazgov', extra:'Velika Britanija'}, {name:'Belfast', extra:'Velika Britanija'},
  {name:'Oksford', extra:'Velika Britanija'}, {name:'Kembridž', extra:'Velika Britanija'}, {name:'Bat', extra:'Velika Britanija'},
  {name:'Amsterdam', extra:'Holandija'}, {name:'Roterdam', extra:'Holandija'}, {name:'Hag', extra:'Holandija'},
  {name:'Utreht', extra:'Holandija'}, {name:'Delft', extra:'Holandija'}, {name:'Mastriht', extra:'Holandija'},
  {name:'Berlin', extra:'Nemačka'}, {name:'Minhen', extra:'Nemačka'}, {name:'Hamburg', extra:'Nemačka'}, {name:'Frankfurt', extra:'Nemačka'},
  {name:'Keln', extra:'Nemačka'}, {name:'Diseldorf', extra:'Nemačka'}, {name:'Štutgart', extra:'Nemačka'}, {name:'Drezden', extra:'Nemačka'},
  {name:'Nirnberg', extra:'Nemačka'}, {name:'Lajpcig', extra:'Nemačka'}, {name:'Bremen', extra:'Nemačka'}, {name:'Hanover', extra:'Nemačka'},
  {name:'Beč', extra:'Austrija'}, {name:'Zalcburg', extra:'Austrija'}, {name:'Insbruk', extra:'Austrija'}, {name:'Graz', extra:'Austrija'},
  {name:'Linc', extra:'Austrija'}, {name:'Klagenfurt', extra:'Austrija'}, {name:'Filah', extra:'Austrija'}, {name:'Vels', extra:'Austrija'}, {name:'Sankt Pelten', extra:'Austrija'},
  // Austrija — banje
  {name:'Bad Gastajn', extra:'Austrija'}, {name:'Bad Išl', extra:'Austrija'}, {name:'Bad Ausee', extra:'Austrija'}, {name:'Baden kod Beča', extra:'Austrija'},
  // Austrija — planine i skijališta
  {name:'Kicbil', extra:'Austrija'}, {name:'Zel am Zi', extra:'Austrija'}, {name:'Solden', extra:'Austrija'}, {name:'Išgl', extra:'Austrija'}, {name:'Majrhofen', extra:'Austrija'},
  // Austrija — turistički centri
  {name:'Halštat', extra:'Austrija'}, {name:'Verfen', extra:'Austrija'}, {name:'Melk', extra:'Austrija'},
  // Austrija — jezera
  {name:'Volfgangze', extra:'Austrija'}, {name:'Ahenze', extra:'Austrija'}, {name:'Vertersee', extra:'Austrija'},
  {name:'Prag', extra:'Češka'}, {name:'Brno', extra:'Češka'}, {name:'Budimpešta', extra:'Mađarska'}, {name:'Bratislava', extra:'Slovačka'},
  {name:'Karlovi Vari', extra:'Češka'}, {name:'Češki Krumlov', extra:'Češka'}, {name:'Plzenj', extra:'Češka'}, {name:'Olomouc', extra:'Češka'}, {name:'Kutna Hora', extra:'Češka'},
  {name:'Segedin', extra:'Mađarska'}, {name:'Pečuj', extra:'Mađarska'}, {name:'Debrecin', extra:'Mađarska'}, {name:'Đer', extra:'Mađarska'},
  {name:'Balaton', extra:'Mađarska'}, {name:'Heviz', extra:'Mađarska'}, {name:'Šiofok', extra:'Mađarska'}, {name:'Kečkemet', extra:'Mađarska'},
  {name:'Varšava', extra:'Poljska'}, {name:'Krakov', extra:'Poljska'}, {name:'Vroclav', extra:'Poljska'},
  {name:'Gdanjsk', extra:'Poljska'}, {name:'Poznanj', extra:'Poljska'}, {name:'Lođ', extra:'Poljska'}, {name:'Zakopane', extra:'Poljska'}, {name:'Torunj', extra:'Poljska'}, {name:'Vjelička', extra:'Poljska'},
  {name:'Stokholm', extra:'Švedska'}, {name:'Geteborg', extra:'Švedska'}, {name:'Malme', extra:'Švedska'},
  {name:'Oslo', extra:'Norveška'}, {name:'Bergen', extra:'Norveška'}, {name:'Tromse', extra:'Norveška'}, {name:'Stavanger', extra:'Norveška'}, {name:'Lofoti', extra:'Norveška'},
  {name:'Kopenhagen', extra:'Danska'}, {name:'Arhus', extra:'Danska'}, {name:'Odense', extra:'Danska'},
  {name:'Helsinki', extra:'Finska'}, {name:'Rovanijemi', extra:'Finska'}, {name:'Tampere', extra:'Finska'},
  {name:'Dablin', extra:'Irska'}, {name:'Kork', extra:'Irska'}, {name:'Golvej', extra:'Irska'},
  {name:'Brisel', extra:'Belgija'}, {name:'Briž', extra:'Belgija'}, {name:'Gent', extra:'Belgija'}, {name:'Antverpen', extra:'Belgija'},
  {name:'Cirih', extra:'Švajcarska'}, {name:'Ženeva', extra:'Švajcarska'}, {name:'Bern', extra:'Švajcarska'}, {name:'Lucern', extra:'Švajcarska'},
  {name:'Bazel', extra:'Švajcarska'}, {name:'Cermat', extra:'Švajcarska'}, {name:'Interlaken', extra:'Švajcarska'}, {name:'Lugano', extra:'Švajcarska'},
  // Baltik, Malta, Kipar, Island i mikrodržave
  {name:'Talin', extra:'Estonija'}, {name:'Tartu', extra:'Estonija'},
  {name:'Riga', extra:'Letonija'}, {name:'Jurmala', extra:'Letonija'},
  {name:'Viljnus', extra:'Litvanija'}, {name:'Kaunas', extra:'Litvanija'}, {name:'Klaipeda', extra:'Litvanija'},
  {name:'Valeta', extra:'Malta'}, {name:'Sliema', extra:'Malta'}, {name:'Mdina', extra:'Malta'}, {name:'Gozo', extra:'Malta'},
  {name:'Nikozija', extra:'Kipar'}, {name:'Limasol', extra:'Kipar'}, {name:'Larnaka', extra:'Kipar'}, {name:'Pafos', extra:'Kipar'}, {name:'Ajia Napa', extra:'Kipar'},
  {name:'Rejkjavik', extra:'Island'}, {name:'Akurejri', extra:'Island'},
  {name:'Monako', extra:'Monako'}, {name:'Monte Karlo', extra:'Monako'}, {name:'Luksemburg', extra:'Luksemburg'},
  // Turska, Bliski istok, sever Afrike
  {name:'Istanbul', extra:'Turska'}, {name:'Antalija', extra:'Turska'}, {name:'Bodrum', extra:'Turska'}, {name:'Kapadokija', extra:'Turska'},
  {name:'Marmaris', extra:'Turska'}, {name:'Fetije', extra:'Turska'}, {name:'Izmir', extra:'Turska'}, {name:'Ankara', extra:'Turska'},
  {name:'Alanja', extra:'Turska'}, {name:'Kušadasi', extra:'Turska'}, {name:'Side', extra:'Turska'}, {name:'Pamukale', extra:'Turska'}, {name:'Bursa', extra:'Turska'}, {name:'Česme', extra:'Turska'},
  // Turska — gradovi
  {name:'Adana', extra:'Turska'}, {name:'Konja', extra:'Turska'}, {name:'Gaziantep', extra:'Turska'}, {name:'Kajseri', extra:'Turska'}, {name:'Mersin', extra:'Turska'},
  {name:'Eskišehir', extra:'Turska'}, {name:'Denizli', extra:'Turska'}, {name:'Trabzon', extra:'Turska'}, {name:'Samsun', extra:'Turska'}, {name:'Malatja', extra:'Turska'},
  // Turska — banje
  {name:'Jalova', extra:'Turska'}, {name:'Afjon Karahisar', extra:'Turska'}, {name:'Haymana', extra:'Turska'}, {name:'Kizildžahamam', extra:'Turska'},
  // Turska — turistički centri
  {name:'Efes', extra:'Turska'}, {name:'Troja', extra:'Turska'}, {name:'Pergamon', extra:'Turska'}, {name:'Hijerapolis', extra:'Turska'},
  {name:'Sumela', extra:'Turska'}, {name:'Nemrut', extra:'Turska'}, {name:'Safranbolu', extra:'Turska'}, {name:'Gjobekli Tepe', extra:'Turska'},
  // Turska — primorska mesta
  {name:'Kaš', extra:'Turska'}, {name:'Kalkan', extra:'Turska'}, {name:'Datča', extra:'Turska'}, {name:'Didim', extra:'Turska'},
  {name:'Ajvalik', extra:'Turska'}, {name:'Silifke', extra:'Turska'}, {name:'Foča (Turska)', extra:'Turska'},
  {name:'Tel Aviv', extra:'Izrael'}, {name:'Dubai', extra:'UAE'}, {name:'Abu Dabi', extra:'UAE'},
  {name:'Kairo', extra:'Egipat'}, {name:'Šarm El Šeik', extra:'Egipat'}, {name:'Hurgada', extra:'Egipat'}, {name:'Luksor', extra:'Egipat'},
  {name:'Marakeš', extra:'Maroko'}, {name:'Rabat', extra:'Maroko'}, {name:'Kazablanka', extra:'Maroko'}, {name:'Tanger', extra:'Maroko'},
  // Amerika i Azija (najtraženiji daleki gradovi)
  {name:'Njujork', extra:'SAD'}, {name:'Majami', extra:'SAD'}, {name:'Los Anđeles', extra:'SAD'},
  {name:'Las Vegas', extra:'SAD'}, {name:'Čikago', extra:'SAD'}, {name:'San Francisko', extra:'SAD'},
  {name:'Boston', extra:'SAD'}, {name:'Vašington', extra:'SAD'}, {name:'Orlando', extra:'SAD'}, {name:'Honolulu', extra:'SAD'},
  {name:'Filadelfija', extra:'SAD'}, {name:'Sijetl', extra:'SAD'}, {name:'Denver', extra:'SAD'}, {name:'Atlanta', extra:'SAD'},
  {name:'Toronto', extra:'Kanada'}, {name:'Vankuver', extra:'Kanada'}, {name:'Montreal', extra:'Kanada'}, {name:'Otava', extra:'Kanada'},
  {name:'Meksiko Siti', extra:'Meksiko'}, {name:'Kankun', extra:'Meksiko'},
  {name:'Rio de Žaneiro', extra:'Brazil'}, {name:'Sao Paulo', extra:'Brazil'}, {name:'Buenos Ajres', extra:'Argentina'},
  {name:'Bogota', extra:'Kolumbija'}, {name:'Lima', extra:'Peru'},
  {name:'Bangkok', extra:'Tajland'}, {name:'Puket', extra:'Tajland'}, {name:'Tokio', extra:'Japan'}, {name:'Osaka', extra:'Japan'}, {name:'Kjoto', extra:'Japan'},
  {name:'Bali', extra:'Indonezija'}, {name:'Džakarta', extra:'Indonezija'}, {name:'Singapur', extra:'Singapur'},
  {name:'Ho Ši Min', extra:'Vijetnam'}, {name:'Hanoj', extra:'Vijetnam'},
  {name:'Peking', extra:'Kina'}, {name:'Šangaj', extra:'Kina'}, {name:'Hongkong', extra:'Kina'},
  {name:'Seul', extra:'Južna Koreja'}, {name:'Kuala Lumpur', extra:'Malezija'}, {name:'Manila', extra:'Filipini'},
  {name:'Nju Delhi', extra:'Indija'}, {name:'Mumbaj', extra:'Indija'}, {name:'Male', extra:'Maldivi'},
  {name:'Baku', extra:'Azerbejdžan'}, {name:'Tbilisi', extra:'Gruzija'},
  {name:'Sidnej', extra:'Australija'}, {name:'Melburn', extra:'Australija'}, {name:'Brizbejn', extra:'Australija'},
  {name:'Okland', extra:'Novi Zeland'}, {name:'Velington', extra:'Novi Zeland'},
  {name:'Doha', extra:'Katar'}, {name:'Rijad', extra:'Saudijska Arabija'},
  {name:'Kejptaun', extra:'Južnoafrička Republika'}, {name:'Najrobi', extra:'Kenija'},
];
// Uklanja srpske kvačice (č/ć/š/ž/đ) i standardne akcente, radi poređenja bez
// obzira da li korisnik kuca sa ili bez njih (npr. "Kotor" vs "Beč"/"Bec").
function normalizeSr(str){
  return String(str)
    .replace(/đ/g, 'dj').replace(/Đ/g, 'Dj')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
function matchPopularDestinations(query){
  const q = normalizeSr(query);
  const scored = POPULAR_DESTINATIONS.map(d => {
    const name = normalizeSr(d.name);
    const extra = normalizeSr(d.extra || '');
    let score;
    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (name.includes(q)) score = 2;
    else if (extra.startsWith(q)) score = 3;
    else if (extra.includes(q)) score = 4;
    else score = null;
    return {d, score};
  }).filter(x => x.score !== null);
  scored.sort((a, b) => a.score - b.score);
  return scored.map(x => x.d);
}

/* ---- Provera važenja pasoša za odabranu destinaciju ----
   Srpski biometrijski pasoš je bezvizan za Šengen zonu (90 dana u periodu
   od 180 dana), pa "da li mi treba viza" nije stvarni problem za većinu
   traženih destinacija. Pravi, dokumentovan problem je KOLIKO DUGO pasoš
   mora da važi nakon (ili za Tursku: od) putovanja — turisti bivaju vraćeni
   sa granice ili čekiranja zbog ovoga, iako je sam datum putovanja u redu. */
const SCHENGEN_COUNTRIES = new Set([
  'Austrija','Belgija','Hrvatska','Češka','Danska','Estonija','Finska','Francuska',
  'Nemačka','Grčka','Mađarska','Italija','Letonija','Litvanija','Luksemburg','Malta',
  'Holandija','Poljska','Portugalija','Slovačka','Slovenija','Španija','Švedska',
  'Island','Lihtenštajn','Norveška','Švajcarska'
]);
/* Zemlje van Šengena za koje je državljanima Srbije i dalje potrebna PRAVA VIZA
   (ne samo pasoš) — ovo je veći problem od važenja pasoša jer traži prijavu,
   dokumenta i nedelje čekanja, pa se ističe posebno, pre pravila o pasošu. */
const VISA_REQUIRED_NOTES = {
  'Velika Britanija':'Državljanima Srbije je potrebna prava viza za Veliku Britaniju (uključujući London i tranzit bez izlaska iz aerodroma) — ovo nije samo provera pasoša. Standardna turistička viza obično se obrađuje oko 3 nedelje, pa prijavu treba podneti mnogo pre kupovine nepovratnih karata.',
  'Irska':'Državljanima Srbije je potrebna prava viza za Irsku — stara pogodnost putovanja preko britanske vize je ukinuta 2020. i nije vraćena. Prijavu za vizu treba podneti mnogo pre kupovine nepovratnih karata.',
  'SAD':'Državljanima Srbije je potrebna prava viza za SAD (obično turistička B1/B2) — ovo nije samo provera pasoša. Traži se obavezan intervju u ambasadi u Beogradu, taksa oko 185 USD, a na termin se čeka od par nedelja do više meseci u zavisnosti od perioda. Prijavu treba podneti mnogo pre kupovine nepovratnih karata.',
  'Kanada':'Državljanima Srbije je potrebna prava viza za Kanadu (Kanada nema eTA olakšicu za srpski pasoš) — ovo nije samo provera pasoša. Obrada uključuje biometriju i obično traje oko 2-4 nedelje, pa prijavu treba podneti mnogo pre kupovine nepovratnih karata.'
};
/* Regionalne destinacije za koje državljanima Srbije pasoš UOPŠTE nije
   potreban — ulazi se samo sa važećom biometrijskom ličnom kartom (do 90
   dana boravka u periodu od 6 meseci), na osnovu regionalnog sporazuma o
   tzv. "mini Šengenu" (Srbija–Severna Makedonija–Albanija od 2020/2021,
   Crna Gora i BiH imaju istovetnu praksu sa ličnom kartom). Ako se ovo ne
   prepozna, korisnik dobija generičko "verovatno 6 meseci" upozorenje koje
   je i pogrešno i nepotrebno zabrinjavajuće za ove destinacije. */
const REGIONAL_ID_CARD_COUNTRIES = new Set([
  'Crna Gora', 'Bosna i Hercegovina', 'Severna Makedonija', 'Albanija'
]);
function getPassportRule(country, destVal){
  const c = (country || '').trim();
  const fallbackName = (destVal || '').trim();
  const visaNote = VISA_REQUIRED_NOTES[c] || null;
  let base;
  if (REGIONAL_ID_CARD_COUNTRIES.has(c)){
    base = {basis:'none', months:null, days:null, label:c, confident:true, noPassportNeeded:true,
      why:'Za ' + c + ' pasoš ti uopšte nije potreban — državljani Srbije ulaze samo sa važećom biometrijskom ličnom kartom (do 90 dana boravka u periodu od 6 meseci), na osnovu regionalnog sporazuma o slobodnom kretanju.'};
  } else if (SCHENGEN_COUNTRIES.has(c)){
    base = {basis:'to', months:3, days:null, label:c || 'Šengen zona', confident:true,
      why:'Za Šengen zonu pasoš mora da važi još najmanje 3 meseca nakon planiranog datuma povratka.'};
  } else if (c === 'Turska'){
    base = {basis:'from', months:null, days:150, label:'Turska', confident:true,
      why:'Za Tursku pasoš mora da važi još najmanje 150 dana (cca 5 meseci) od datuma ulaska u zemlju.'};
  } else if (c === 'Egipat' || c === 'Tunis'){
    base = {basis:'to', months:6, days:null, label:c, confident:true,
      why:'Za ' + c + ' pasoš mora da važi još najmanje 6 meseci nakon planiranog datuma povratka.'};
  } else if (c === 'Kina'){
    base = {basis:'to', months:6, days:null, label:'Kina', confident:true,
      why:'Za Kinu državljanima Srbije nije potrebna viza za turistički boravak do 30 dana, ali pasoš mora da važi još najmanje 6 meseci nakon planiranog datuma povratka. (Hongkong i Makao imaju poseban, još slobodniji režim.)'};
  } else {
    const shownName = c || fallbackName || 'ova destinacija';
    const genericWhy = c
      ? 'Nemamo potvrđeno pravilo za zemlju „' + c + '“ — mnoge zemlje van Šengena traže važenje pasoša još 6 meseci nakon povratka, ali ovo obavezno proveri kod ambasade/aviokompanije jer se pravilo razlikuje po zemlji.'
      : 'Ne znamo tačnu zemlju za „' + shownName + '“, pa nemamo potvrđeno pravilo — mnoge zemlje van Šengena traže važenje pasoša još 6 meseci nakon povratka, ali ovo obavezno proveri kod ambasade/aviokompanije jer se pravilo razlikuje po zemlji.';
    base = {basis:'to', months:6, days:null, label:shownName, confident: !!visaNote,
      why: visaNote
        ? 'Uz vizu, pasoš uglavnom mora da važi još najmanje 6 meseci nakon planiranog datuma povratka — konkretan rok proverava ambasada prilikom obrade vize.'
        : genericWhy};
  }
  base.visaNote = visaNote;
  return base;
}
/* ---- Provera da li je za vožnju automobilom (sopstvenim ili u Srbiji
   iznajmljenim) do odabrane destinacije potrebna "zelena karta" —
   međunarodna potvrda auto-osiguranja.
   Srbija je od 2012. članica Multilateralnog garantnog sporazuma Sistema
   zelene karte, pa karton NIJE potreban za vožnju u zemlje EU/Šengena,
   Švajcarsku, Lihtenštajn, Norvešku, Island i Andoru (SCHENGEN_COUNTRIES
   gore), kao ni za Crnu Goru (bilateralni sporazum sa Udruženjem
   osiguravača Srbije) i Bosnu i Hercegovinu (BiH pristupila sporazumu
   19.10.2020, ranije bio potreban). I DALJE je obavezna za Severnu
   Makedoniju (nije potpisnica) i za zemlje van kruga zelene karte
   (Rusija, Belorusija, Ukrajina, Moldavija, Turska, Izrael, Iran,
   Albanija, Tunis, Maroko). Izvor: Udruženje osiguravača Srbije / AMSS. */
const GREEN_CARD_NOT_NEEDED = new Set([
  ...SCHENGEN_COUNTRIES,
  'Crna Gora', 'Bosna i Hercegovina'
]);
const GREEN_CARD_NEEDED_NOTES = {
  'Severna Makedonija':'Za Severnu Makedoniju je zelena karta i dalje obavezna — nije potpisnica Multilateralnog sporazuma sa Srbijom.',
  'Turska':'Za Tursku je zelena karta obavezna.',
  'Albanija':'Za Albaniju je zelena karta obavezna.',
  'Rusija':'Za Rusiju je zelena karta obavezna.',
  'Belorusija':'Za Belorusiju je zelena karta obavezna.',
  'Ukrajina':'Za Ukrajinu je zelena karta obavezna.',
  'Moldavija':'Za Moldaviju je zelena karta obavezna.',
  'Izrael':'Za Izrael je zelena karta obavezna.',
  'Iran':'Za Iran je zelena karta obavezna.',
  'Maroko':'Za Maroko je zelena karta obavezna.',
  'Tunis':'Za Tunis je zelena karta obavezna.'
};
function getGreenCardRule(country){
  const c = (country || '').trim();
  if (!c){
    return {status:'unknown', label:'', confident:false,
      why:'Ne znamo tačnu zemlju za unetu destinaciju, pa ne možemo da proverimo pravilo o zelenoj karti.'};
  }
  if (GREEN_CARD_NOT_NEEDED.has(c)){
    return {status:'ok', label:c, confident:true,
      why:'Za ' + c + ' zelena karta NIJE potrebna za vozila registrovana u Srbiji — registarska tablica je dovoljan dokaz osiguranja.'};
  }
  if (GREEN_CARD_NEEDED_NOTES[c]){
    return {status:'needed', label:c, confident:true, why: GREEN_CARD_NEEDED_NOTES[c]};
  }
  return {status:'unknown', label:c, confident:false,
    why:'Nemamo potvrđeno pravilo za „' + c + '“ — proveri kod svog osiguravača da li ti treba zelena karta pre polaska.'};
}
/* ---------- "Da li si sve pokrio?" — putni checklist ----------
   Sabira već postojeća pravila (pasoš, viza, zelena karta) u jedan
   vizuelni indikator koji se prikazuje UZ rezultate/paket, umesto da
   ostane skriven dok korisnik sam ne otvori documentsModal. Ovo je
   svesno konzervativno: ne izmišlja nova pravila, samo prikazuje ono
   što getPassportRule/getGreenCardRule već znaju, plus generičku
   stavku za putno osiguranje koja uvek ostaje "za proveriti" jer
   nemamo podatke o polisama. */
function travelChecklistHtml(country, includeCar){
  const items = [];
  const p = getPassportRule(country, country);
  items.push({
    ok: !!p.confident,
    icon: p.confident ? '✅' : '◻️',
    title: 'Pasoš',
    text: p.why
  });
  if (p.visaNote){
    items.push({ok:false, icon:'⚠️', title:'Viza', text:p.visaNote});
  } else if (country){
    items.push({ok:true, icon:'✅', title:'Viza',
      text:'Nije potrebna viza za ' + country + ' — proveri ipak tik pred put ako se pravila u međuvremenu promene.'});
  }
  if (includeCar){
    const g = getGreenCardRule(country);
    items.push({
      ok: g.status === 'ok',
      icon: g.status === 'ok' ? '✅' : (g.status === 'needed' ? '⚠️' : '◻️'),
      title: 'Zelena karta',
      text: g.why
    });
  }
  items.push({
    ok:false, icon:'◻️', title:'Putno osiguranje',
    text:'Preporučeno za svaki put van zemlje — proveri ponudu World Nomads ili sličnog partnera pre polaska.'
  });
  const doneCount = items.filter(i => i.ok).length;
  const rows = items.map(i =>
    `<li class="tc-item ${i.ok ? 'tc-ok' : 'tc-todo'}"><span class="tc-ic">${i.icon}</span><div><b>${escapeHtml(i.title)}</b><p>${escapeHtml(i.text)}</p></div></li>`
  ).join('');
  return `<div class="travel-checklist">
    <div class="tc-head"><span class="tc-title">🧳 Da li si sve pokrio?</span><span class="tc-score">${doneCount}/${items.length}</span></div>
    <ul class="tc-list">${rows}</ul>
  </div>`;
}
function resolveCountryForDestination(destValue){
  if (!destValue || !destValue.trim()) return '';
  const matches = matchPopularDestinations(destValue);
  return matches.length ? (matches[0].extra || '') : '';
}
function resolveCanonicalDestName(destValue){
  if (!destValue || !destValue.trim()) return '';
  const matches = matchPopularDestinations(destValue);
  return matches.length ? matches[0].name : '';
}
function addMonthsToDate(date, months){
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
function addDaysToDate(date, days){
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function fmtDateSr(d){
  return d.getDate() + '. ' + d.toLocaleString('sr-Latn', {month:'long'}) + ' ' + d.getFullYear() + '.';
}

/* ==========================================================
   Sopstvena (ne-native) lista predloga mesta za Polazak/Destinaciju.
   Ranije: <input list="..."> + <datalist>. Problem koji je to pravilo
   na Android/Chrome: nativna traka predloga iznad tastature ume da
   "trepće" — zatvori pa ponovo otvori tastaturu pri svakom kucanju
   ili izboru predloga, jer datalist UI nije deo same tastature nego
   posebna traka koju browser umeće/uklanja. Ovde predloge iscrtavamo
   sami u panel-u koji mi kontrolišemo (position:fixed, pozicioniran
   preko getBoundingClientRect), a fokus nikad ne napušta input polje
   (mousedown/touchstart na panelu je preventDefault-ovan), pa tastatura
   ostaje otvorena i mirna od prvog slova do izbora predloga.
========================================================== */
const LOC_DROPDOWN_INPUT_ID = { destSuggestions:'dest', originSuggestions:'origin' };
const _locDropdownState = {
  destSuggestions:{ items:[], activeIndex:-1, suppressNextFetch:false },
  originSuggestions:{ items:[], activeIndex:-1, suppressNextFetch:false }
};
// Koristi visualViewport (kad postoji — svi moderni Android/Chrome) da
// zna GDE se stvarno završava vidljiv deo ekrana kad je tastatura otvorena.
// Bez ovoga se panel računao prema window.innerHeight/scroll poziciji koje
// tastatura ne menja (samo "visual" viewport se smanji), pa je panel visio
// ispod polja i tastatura ga je prekrivala skoro celog — vidljiv je ostajao
// tek delić prvog predloga.
function getVisibleViewportTop(){
  const vv = window.visualViewport;
  return vv ? vv.offsetTop : 0;
}
function getVisibleViewportBottom(){
  const vv = window.visualViewport;
  return vv ? (vv.offsetTop + vv.height) : window.innerHeight;
}
function positionLocDropdown(panel, inputEl){
  const r = inputEl.getBoundingClientRect();
  const gap = 6, margin = 8, minUseful = 120, preferredMax = 264;
  const visTop = getVisibleViewportTop() + margin;
  const visBottom = getVisibleViewportBottom() - margin;
  const spaceBelow = visBottom - (r.bottom + gap);
  const spaceAbove = (r.top - gap) - visTop;
  panel.style.left = r.left + 'px';
  panel.style.width = r.width + 'px';
  if (spaceBelow >= minUseful || spaceBelow >= spaceAbove){
    // dovoljno mesta ispod polja (ili bar više nego iznad) — otvori ispod,
    // ali visinu ograniči na stvarno vidljiv prostor iznad tastature
    panel.style.top = (r.bottom + gap) + 'px';
    panel.style.bottom = 'auto';
    panel.style.maxHeight = Math.max(minUseful, Math.min(preferredMax, spaceBelow)) + 'px';
  } else {
    // tastatura pojela prostor ispod polja — otvori NAVIŠE, iznad polja
    panel.style.top = 'auto';
    panel.style.bottom = (window.innerHeight - r.top + gap) + 'px';
    panel.style.maxHeight = Math.max(minUseful, Math.min(preferredMax, spaceAbove)) + 'px';
  }
}
function closeLocDropdown(datalistId){
  const panel = document.getElementById(datalistId);
  const inputEl = document.getElementById(LOC_DROPDOWN_INPUT_ID[datalistId]);
  const state = _locDropdownState[datalistId];
  if (panel){ panel.classList.remove('open'); panel.innerHTML = ''; }
  if (state){ state.items = []; state.activeIndex = -1; }
  if (inputEl){ inputEl.setAttribute('aria-expanded', 'false'); inputEl.removeAttribute('aria-activedescendant'); }
}
function selectLocSuggestion(datalistId, value){
  const inputEl = document.getElementById(LOC_DROPDOWN_INPUT_ID[datalistId]);
  if (!inputEl) return;
  inputEl.value = value;
  // Sledeći 'input' event (koji dispatch-ujemo ispod, da pokrene regionalne
  // predloge/upozorenje o aerodromu) NE sme ponovo da pokrene pretragu
  // predloga — inače isti tekst ("Budva") opet nađe sam sebe kao pogodak
  // i lista se vrati/ne zatvori 300ms nakon izbora. Ovaj flag preskače
  // TAČNO taj jedan naredni poziv.
  const state = _locDropdownState[datalistId];
  if (state) state.suppressNextFetch = true;
  closeLocDropdown(datalistId);
  inputEl.dispatchEvent(new Event('input', {bubbles:true}));
  inputEl.dispatchEvent(new Event('change', {bubbles:true}));
  // Tastatura se zatvara ODMAH posle izbora, bez obzira na sledeće polje —
  // dok je otvorena, prekriva pola ekrana i baš uneto polje se jedva vidi.
  // Fokus se NE prebacuje automatski na sledeće polje (ni Destinaciju ni
  // datume): korisnik sam dodirne sledeće polje kad bude spreman, i tastatura
  // (ili kalendar) se tad normalno otvori za njega.
  inputEl.blur();
}
function setupLocDropdown(datalistId){
  const panel = document.getElementById(datalistId);
  const inputEl = document.getElementById(LOC_DROPDOWN_INPUT_ID[datalistId]);
  if (!panel || !inputEl) return;

  // KLJUČNO: panel fizički prebacujemo u <body>. U HTML-u je ugnježden unutar
  // .stub-a za Destinaciju/Polazak, a taj .stub ima isolation:isolate (isti
  // razlog zbog kog je i kalendar ranije morao specijalan tretman — vidi
  // komentar uz .cal-card u styles.css). Isolation zarobi SVAKI potomak u
  // sopstveni sloj za crtanje, čak i position:fixed — pa su stubovi koji u
  // DOM-u dolaze POSLE (OD—DO, Putnika) crtani PREKO panela, bez obzira na
  // z-index. Kad je panel direktno dete <body>, taj problem nestaje.
  if (panel.parentElement !== document.body) document.body.appendChild(panel);

  // Sprečava da tap/klik na predlog oduzme fokus input polju pre nego što
  // stigne 'click' — upravo taj gubitak-pa-povratak fokusa je ono što na
  // mobilnom zatvori pa ponovo otvori tastaturu. NAPOMENA: ovo se radi SAMO
  // na 'mousedown' (stiže i posle dodira, kao "kompatibilni" miš-događaj) —
  // preventDefault() na 'touchstart' je ranije bio dodat sa istom namerom,
  // ali on na dodirnim uređajima potpuno ugasi naredni 'click' događaj
  // (deo specifikacije touch-events), pa tap nije radio ništa.
  panel.addEventListener('mousedown', (e) => e.preventDefault());

  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('.loc-dropdown-item');
    if (!btn) return;
    const state = _locDropdownState[datalistId];
    const item = state.items[Number(btn.dataset.idx)];
    if (item) selectLocSuggestion(datalistId, item.name);
  });

  inputEl.addEventListener('keydown', (e) => {
    const state = _locDropdownState[datalistId];
    if (!panel.classList.contains('open') || !state.items.length) return;
    if (e.key === 'ArrowDown'){
      e.preventDefault();
      state.activeIndex = Math.min(state.activeIndex + 1, state.items.length - 1);
    } else if (e.key === 'ArrowUp'){
      e.preventDefault();
      state.activeIndex = Math.max(state.activeIndex - 1, 0);
    } else if (e.key === 'Enter'){
      if (state.activeIndex >= 0){
        e.preventDefault();
        const item = state.items[state.activeIndex];
        if (item) selectLocSuggestion(datalistId, item.name);
      }
      return;
    } else if (e.key === 'Escape'){
      closeLocDropdown(datalistId);
      return;
    } else {
      return;
    }
    const optionEls = panel.querySelectorAll('.loc-dropdown-item');
    optionEls.forEach((el, i) => el.classList.toggle('is-active', i === state.activeIndex));
    const activeEl = optionEls[state.activeIndex];
    if (activeEl){
      activeEl.scrollIntoView({block:'nearest'});
      inputEl.setAttribute('aria-activedescendant', activeEl.id);
    }
  });

  // Malo kašnjenje na blur: ostavlja vremena da 'click' na predlogu (posle
  // mousedown-a iznad) stigne da se obradi pre nego što panel nestane.
  inputEl.addEventListener('blur', () => setTimeout(() => closeLocDropdown(datalistId), 150));

  window.addEventListener('resize', () => { if (panel.classList.contains('open')) positionLocDropdown(panel, inputEl); });
  window.addEventListener('scroll', () => { if (panel.classList.contains('open')) positionLocDropdown(panel, inputEl); }, true);
  // window 'resize' se često NE aktivira kad se otvori/zatvori tastatura
  // (menja se samo visualViewport, ne i layout viewport) — bez ovoga bi
  // panel ostao zaleđen na poziciji izračunatoj PRE nego što je tastatura
  // stigla da se potpuno otvori.
  if (window.visualViewport){
    window.visualViewport.addEventListener('resize', () => { if (panel.classList.contains('open')) positionLocDropdown(panel, inputEl); });
    window.visualViewport.addEventListener('scroll', () => { if (panel.classList.contains('open')) positionLocDropdown(panel, inputEl); });
  }
}

let _destSuggestTimer = null;
let _originSuggestTimer = null;
async function fetchLocationSuggestions(q, datalistId){
  const query = q.trim();
  const inputEl = document.getElementById(LOC_DROPDOWN_INPUT_ID[datalistId]);
  const stubEl = inputEl ? inputEl.closest('.stub') : null;
  if (query.length < 2){ renderLocationSuggestions([], datalistId); if (stubEl) stubEl.classList.remove('is-loading'); return; }
  if (stubEl) stubEl.classList.add('is-loading');

  try {
    const combined = [];
    const seen = new Set();
    function addAll(arr){
      for (const r of arr){
        const key = r.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        combined.push(r);
      }
    }

    addAll(matchPopularDestinations(query));

    if (combined.length < 6 && API_BASE){
      try {
        const res = await fetch(API_BASE + '/api/locations?q=' + encodeURIComponent(query));
        if (res.ok){
          const json = await res.json();
          if (json.results) addAll(json.results.map(r => ({name:r.cityName, extra:r.countryName})));
        }
      } catch(err){
        console.warn('[sklopi] backend predlozi nedostupni, prelazim na Open-Meteo:', err.message);
      }
    }

    if (combined.length < 6){
      const langAttempts = ['sr', 'en', null];
      for (const lang of langAttempts){
        if (combined.length >= 6) break;
        try {
          const langParam = lang ? '&language=' + lang : '';
          const res = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(query) + '&count=10' + langParam + '&format=json');
          if (res.ok){
            const data = await res.json();
            const sorted = rankLocationMatches(data.results || [], query);
            addAll(sorted.map(r => ({name:r.name, extra:[r.admin1, r.country].filter(Boolean).join(', ')})));
          }
        } catch(err){
          console.warn('[sklopi] predlozi mesta (Open-Meteo) nisu uspeli:', err.message);
        }
      }
    }

    renderLocationSuggestions(combined.slice(0, 6), datalistId);
  } finally {
    if (stubEl) stubEl.classList.remove('is-loading');
  }
}
function renderLocationSuggestions(results, datalistId){
  const panel = document.getElementById(datalistId);
  const inputEl = document.getElementById(LOC_DROPDOWN_INPUT_ID[datalistId]);
  if (!panel || !inputEl) return;
  const seen = new Set(); // izbegava duplikate istog naziva grada
  const items = results.filter(r => {
    const key = r.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const state = _locDropdownState[datalistId];
  state.items = items;
  state.activeIndex = -1;
  if (!items.length){ closeLocDropdown(datalistId); return; }
  panel.innerHTML = items.map((r, i) =>
    `<button type="button" class="loc-dropdown-item" role="option" id="${datalistId}-opt-${i}" data-idx="${i}">`
    + escapeHtml(r.name) + (r.extra ? `<span class="ldi-extra">${escapeHtml(r.extra)}</span>` : '')
    + `</button>`
  ).join('');
  positionLocDropdown(panel, inputEl);
  panel.classList.add('open');
  inputEl.setAttribute('aria-expanded', 'true');
}
setupLocDropdown('destSuggestions');
setupLocDropdown('originSuggestions');
function markStubLoading(inputEl, q){
  const stubEl = inputEl.closest('.stub');
  if (!stubEl) return;
  // Upali spinner odmah na kucanje (ne čekaj debounce) — inače 300ms
  // pre samog fetch-a polje izgleda mirno/prazno, kao da nešto ne radi.
  stubEl.classList.toggle('is-loading', q.trim().length >= 2);
}
document.getElementById('dest').addEventListener('input', (e)=>{
  clearTimeout(_destSuggestTimer);
  const q = e.target.value;
  const state = _locDropdownState.destSuggestions;
  if (state && state.suppressNextFetch){ state.suppressNextFetch = false; return; }
  markStubLoading(e.target, q);
  _destSuggestTimer = setTimeout(()=> fetchLocationSuggestions(q, 'destSuggestions'), 300);
});
document.getElementById('origin').addEventListener('input', (e)=>{
  clearTimeout(_originSuggestTimer);
  const q = e.target.value;
  const state = _locDropdownState.originSuggestions;
  if (state && state.suppressNextFetch){ state.suppressNextFetch = false; return; }
  markStubLoading(e.target, q);
  _originSuggestTimer = setTimeout(()=> fetchLocationSuggestions(q, 'originSuggestions'), 300);
});

function escapeHtml(str){
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

async function fetchPackagesFromBackend(payload){
  if (!API_BASE) return null; // backend jos nije deploy-ovan — nema smisla ni pokusavati
  // Tajmaut: spor backend ne sme da drži skeleton unedogled — posle 6 s
  // (ili prekida) pada na lokalnu procenu, isto kao kad je nedostupan.
  const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 6000) : null;
  try {
    const res = await fetch(API_BASE + '/api/search', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    // Prazan ili neispravan odgovor = kao da backend nije odgovorio.
    const pkgs = json && json.packages;
    if (!Array.isArray(pkgs) || !pkgs.length || !pkgs.every(pk => pk && TIER_META[pk.tier])) throw new Error('neispravan odgovor');
    return pkgs;
  } catch(err){
    console.warn('[sklopi] backend nedostupan, koristim lokalni mock:', err.message);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function computePackagesLocally(dest, from, to, nights, days, adults, flags, originCode){
  const seed = hashSeed(dest.toLowerCase()+dest.length+nights+adults);
  const rng = seededRandom(seed);
  const factor = marketFactor(dest, todayStr());
  // Deljena "baza" cene za sve tri tier kartice — vidi buildPriceSeeds.
  const priceSeeds = buildPriceSeeds(rng);

  const pkgs = ['best','comfort','budget'].map(t => buildPackage(rng, dest, nights, days, adults, t, flags, factor, originCode, seasonFactor(dest, from), priceSeeds));
  pkgs.forEach(p => attachAffiliateLinks(p, dest, from, to, adults, {originCode, flags}));

  // Price score is relative to the cheapest of THIS run's three packages —
  // the cheapest always scores highest on price, others drop off the more
  // expensive they are. Combined with the fixed quality score, this decides
  // which package actually gets the "Preporučeno" badge (not just whichever
  // tier is named "Best Value").
  const minTotal = Math.min(...pkgs.map(p => p.total));
  pkgs.forEach(p => {
    const overCheapest = (p.total - minTotal) / minTotal;
    p.priceScore = Math.max(40, Math.round(96 - overCheapest * 140));
    p.score = Math.round(p.priceScore * 0.55 + p.qualityScore * 0.45);
  });
  pkgs.sort((a, b) => b.score - a.score);
  pkgs.forEach((p, i) => { p.recommended = (i === 0); });
  return pkgs;
}

/* ==========================================================
   "PRONAĐI SVOJ IZLET" — pravi alat za odlučivanje, ne kocka.
   Umesto da nasumično bira grad koji se uklapa u budžet, korisnik
   prođe kratak upitnik (sa kim putuje, šta mu znači odmor, budžet)
   i svaki grad iz kurirane MATCH_DESTINATIONS baze se BODUJE po
   poklapanju sa odgovorima + sezonom (mesec iz already-selected
   datuma) + dužinom puta (broj noći iz already-selected datuma) +
   budžetom. Vraćaju se 3 grada sa najvišim skorom i objašnjenjem
   ZAŠTO baš oni odgovaraju — ne samo cenom.
========================================================== */
/* Kurirana baza destinacija sa tagovima za bodovanje (podskup
   POPULAR_DESTINATIONS — namerno manji i pažljivije tagovan, jer je
   ovde tačnost preporuke važnija od broja gradova).
   vibes: 'sea' | 'city' | 'nature' | 'nightlife' (grad može imati više)
   months: meseci (1-12) kad je destinacija najbolja sezona
   distance: 'near' (Balkan/susedne zemlje), 'medium' (ostatak Evrope,
             Turska, sev. Afrika), 'far' (interkontinentalni letovi)
   family: da li je pogodna za porodice sa decom
   nightlife: da li ima jak noćni život/provod */
const MATCH_DESTINATIONS = [
  {name:'Budimpešta', extra:'Mađarska', vibes:['city'], months:[3,4,5,6,9,10,11,12], distance:'near', family:true, nightlife:true},
  {name:'Beč', extra:'Austrija', vibes:['city'], months:[1,2,3,4,5,9,10,11,12], distance:'near', family:true, nightlife:false},
  {name:'Sofija', extra:'Bugarska', vibes:['city','nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Solun', extra:'Grčka', vibes:['city','sea'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:true},
  {name:'Skoplje', extra:'Severna Makedonija', vibes:['city'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Ohrid', extra:'Severna Makedonija', vibes:['sea','nature'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Tirana', extra:'Albanija', vibes:['city'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:true},
  {name:'Sarande', extra:'Albanija', vibes:['sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Budva', extra:'Crna Gora', vibes:['sea','nightlife'], months:[6,7,8,9], distance:'near', family:false, nightlife:true},
  {name:'Kotor', extra:'Crna Gora', vibes:['sea','nature'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:false},
  {name:'Herceg Novi', extra:'Crna Gora', vibes:['sea','nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Dubrovnik', extra:'Hrvatska', vibes:['sea','city'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:false},
  {name:'Split', extra:'Hrvatska', vibes:['sea','city','nightlife'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:true},
  {name:'Hvar', extra:'Hrvatska', vibes:['sea','nightlife'], months:[6,7,8,9], distance:'near', family:false, nightlife:true},
  {name:'Zagreb', extra:'Hrvatska', vibes:['city'], months:[3,4,5,6,9,10,11,12], distance:'near', family:true, nightlife:false},
  {name:'Ljubljana', extra:'Slovenija', vibes:['city','nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Bled', extra:'Slovenija', vibes:['nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Sarajevo', extra:'Bosna i Hercegovina', vibes:['city','nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Mostar', extra:'Bosna i Hercegovina', vibes:['city','nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Bukurešt', extra:'Rumunija', vibes:['city','nightlife'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:true},
  {name:'Varna', extra:'Bugarska', vibes:['sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Istanbul', extra:'Turska', vibes:['city'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:true},
  {name:'Prag', extra:'Češka', vibes:['city','nightlife'], months:[3,4,5,6,9,10,11,12], distance:'medium', family:true, nightlife:true},
  {name:'Bratislava', extra:'Slovačka', vibes:['city'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Krf', extra:'Grčka', vibes:['sea','nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Atina', extra:'Grčka', vibes:['city','sea'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Santorini', extra:'Grčka', vibes:['sea'], months:[5,6,7,8,9,10], distance:'medium', family:false, nightlife:false},
  {name:'Mikonos', extra:'Grčka', vibes:['sea','nightlife'], months:[6,7,8,9], distance:'medium', family:false, nightlife:true},
  {name:'Rodos', extra:'Grčka', vibes:['sea'], months:[5,6,7,8,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Krit', extra:'Grčka', vibes:['sea','nature'], months:[5,6,7,8,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Rim', extra:'Italija', vibes:['city'], months:[3,4,5,9,10,11], distance:'medium', family:true, nightlife:false},
  {name:'Milano', extra:'Italija', vibes:['city','nightlife'], months:[3,4,5,9,10], distance:'medium', family:false, nightlife:true},
  {name:'Venecija', extra:'Italija', vibes:['city'], months:[3,4,5,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Firenca', extra:'Italija', vibes:['city'], months:[4,5,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Barselona', extra:'Španija', vibes:['sea','city','nightlife'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:true},
  {name:'Madrid', extra:'Španija', vibes:['city','nightlife'], months:[4,5,9,10], distance:'medium', family:true, nightlife:true},
  {name:'Malaga', extra:'Španija', vibes:['sea'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Ibica', extra:'Španija', vibes:['sea','nightlife'], months:[6,7,8,9], distance:'medium', family:false, nightlife:true},
  {name:'Lisabon', extra:'Portugalija', vibes:['city','sea','nightlife'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:true},
  {name:'Porto', extra:'Portugalija', vibes:['city'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Pariz', extra:'Francuska', vibes:['city'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Nica', extra:'Francuska', vibes:['sea','city'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'London', extra:'Velika Britanija', vibes:['city','nightlife'], months:[4,5,6,9], distance:'medium', family:true, nightlife:true},
  {name:'Amsterdam', extra:'Holandija', vibes:['city','nightlife'], months:[4,5,6,9], distance:'medium', family:true, nightlife:true},
  {name:'Berlin', extra:'Nemačka', vibes:['city','nightlife'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:true},
  {name:'Minhen', extra:'Nemačka', vibes:['city'], months:[5,6,9], distance:'medium', family:true, nightlife:false},
  {name:'Cirih', extra:'Švajcarska', vibes:['city','nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Antalija', extra:'Turska', vibes:['sea'], months:[5,6,7,8,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Bodrum', extra:'Turska', vibes:['sea','nightlife'], months:[6,7,8,9], distance:'medium', family:false, nightlife:true},
  {name:'Kapadokija', extra:'Turska', vibes:['nature'], months:[4,5,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Tel Aviv', extra:'Izrael', vibes:['sea','city','nightlife'], months:[4,5,6,9,10], distance:'medium', family:false, nightlife:true},
  {name:'Dubai', extra:'UAE', vibes:['city'], months:[11,12,1,2,3], distance:'medium', family:true, nightlife:true},
  {name:'Kairo', extra:'Egipat', vibes:['city','nature'], months:[10,11,12,1,2,3], distance:'medium', family:true, nightlife:false},
  {name:'Šarm El Šeik', extra:'Egipat', vibes:['sea'], months:[10,11,12,1,2,3,4], distance:'medium', family:true, nightlife:false},
  {name:'Marakeš', extra:'Maroko', vibes:['city'], months:[3,4,10,11], distance:'medium', family:true, nightlife:false},
  {name:'Njujork', extra:'SAD', vibes:['city','nightlife'], months:[4,5,9,10,12], distance:'far', family:true, nightlife:true},
  {name:'Majami', extra:'SAD', vibes:['sea','nightlife'], months:[11,12,1,2,3,4], distance:'far', family:true, nightlife:true},
  {name:'Los Anđeles', extra:'SAD', vibes:['city','sea'], months:[3,4,5,9,10], distance:'far', family:true, nightlife:false},
  {name:'Bangkok', extra:'Tajland', vibes:['city','nightlife'], months:[11,12,1,2], distance:'far', family:true, nightlife:true},
  {name:'Puket', extra:'Tajland', vibes:['sea'], months:[11,12,1,2,3], distance:'far', family:true, nightlife:false},
  {name:'Tokio', extra:'Japan', vibes:['city'], months:[3,4,5,10,11], distance:'far', family:true, nightlife:false},
  {name:'Bali', extra:'Indonezija', vibes:['sea','nature'], months:[5,6,7,8,9], distance:'far', family:true, nightlife:false},
  {name:'Singapur', extra:'Singapur', vibes:['city'], months:[1,2,3,4,11,12], distance:'far', family:true, nightlife:true},
  {name:'Sidnej', extra:'Australija', vibes:['city','sea'], months:[10,11,12,1,2,3], distance:'far', family:true, nightlife:false},
  {name:'Kejptaun', extra:'Južnoafrička Republika', vibes:['nature','sea'], months:[10,11,12,1,2,3], distance:'far', family:true, nightlife:false},
  // Skijaški centri — najpoznatije skijalište po zemlji (koristi ih red "Skijaški centri", zamena za "Blizu Srbije").
  {name:'Žabljak', extra:'Crna Gora', vibes:['ski','nature'], months:[12,1,2,3], distance:'near', family:true, nightlife:false},
  {name:'Kitzbühel', extra:'Austrija', vibes:['ski'], months:[12,1,2,3], distance:'near', family:true, nightlife:true},
  {name:'Garmisch-Partenkirchen', extra:'Nemačka', vibes:['ski','nature'], months:[12,1,2,3], distance:'medium', family:true, nightlife:false},
  {name:'Kopaonik', extra:'Srbija', vibes:['ski','nature'], months:[12,1,2,3], distance:'near', family:true, nightlife:false},
  {name:'Chamonix', extra:'Francuska', vibes:['ski','nature'], months:[12,1,2,3], distance:'medium', family:true, nightlife:true},
  {name:'St. Anton am Arlberg', extra:'Austrija', vibes:['ski'], months:[12,1,2,3], distance:'near', family:false, nightlife:true},
  {name:'Kranjska Gora', extra:'Slovenija', vibes:['ski','nature'], months:[12,1,2,3], distance:'near', family:true, nightlife:false},
  {name:'Jahorina', extra:'Bosna i Hercegovina', vibes:['ski','nature'], months:[12,1,2,3], distance:'near', family:true, nightlife:false},
];

// Getteri, pa oznake prate trenutni jezik (koristi ih matchReasonSentence i naslov rezultata).
const MATCH_VIBE_LABELS = {
  get sea(){ return t('mvibe_sea'); }, get city(){ return t('mvibe_city'); }, get nature(){ return t('mvibe_nature'); },
  get nightlife(){ return t('mvibe_nightlife'); }, get mix(){ return t('mvibe_mix'); }
};
// Naziv meseca u obliku koji traži rečenica mreason_season (npr. sr: "sezona za maj",
// ru: predloški padež). Vrednosti su u *.json pod 'match_month.1'..'match_month.12'.
function matchMonthName(month){ return t('match_month.' + month); }

// Deo bodovanja koji NE zavisi od cene (poklapanje sa odgovorima,
// sezonom i dužinom puta) — cena/budžet se dodaje posebno u
// pickMatchDestinations, pošto cena zavisi od već izračunatog pkg-a.
function computeMatchFitScore(cand, answers, nights, month){
  const tags = cand.tags;
  const reasons = [];
  let score = 0;

  // Šta ti znači odmor? (do 34 poena)
  if (answers.vibe === 'mix'){
    score += Math.min(34, 14 + tags.vibes.length * 7);
    reasons.push('vibe_mix');
  } else if (tags.vibes.includes(answers.vibe)){
    score += 34;
    reasons.push('vibe_' + answers.vibe);
  } else {
    score += 6;
  }

  // Sezona — mesec polaska iz već izabranih datuma (do 22 poena)
  if (tags.months.includes(month)){
    score += 22;
    reasons.push('season');
  } else {
    const prev = month === 1 ? 12 : month - 1;
    const next = month === 12 ? 1 : month + 1;
    if (tags.months.includes(prev) || tags.months.includes(next)) score += 11;
  }

  // Dužina puta iz već izabranih datuma vs udaljenost destinacije (do 20 poena)
  // — vikend putovanje ne predlaže interkontinentalni let, dug odmor
  // favorizuje udaljenije destinacije.
  if (nights <= 3){
    if (tags.distance === 'near') { score += 20; reasons.push('near_fit'); }
    else if (tags.distance === 'medium') score += 6;
  } else if (nights <= 7){
    if (tags.distance === 'medium') { score += 18; reasons.push('length_fit'); }
    else if (tags.distance === 'near') score += 14;
    else score += 9;
  } else {
    if (tags.distance === 'far') { score += 20; reasons.push('length_fit'); }
    else score += 13;
  }

  // Sa kim putuješ? (do 14 poena)
  if (answers.companion === 'family'){
    if (tags.family) { score += 14; reasons.push('family'); }
    else score += 2;
  } else if (answers.companion === 'friends'){
    if (tags.nightlife) { score += 14; reasons.push('nightlife'); }
    else score += 6;
  } else if (answers.companion === 'couple'){
    if (tags.vibes.includes('sea') || tags.vibes.includes('city')) { score += 12; reasons.push('romantic'); }
    else score += 6;
  } else {
    score += 10;
  }

  return {score, reasons};
}

function computeMatchCandidates(from, to, adults, flags){
  const nights = nightsBetween(from, to);
  const days = nights;
  // Polazište iz forme — utiče na cenu leta (flightRouteMult) i na deep link.
  const matchOrigin = (document.getElementById('origin') || {}).value || '';
  return MATCH_DESTINATIONS.map(d => {
    const seed = hashSeed(d.name.toLowerCase()+d.name.length+nights+adults);
    const rng = seededRandom(seed);
    const factor = marketFactor(d.name, todayStr());
    const pkg = buildPackage(rng, d.name, nights, days, adults, 'best', flags, factor, matchOrigin, seasonFactor(d.name, from));
    attachAffiliateLinks(pkg, d.name, from, to, adults, {originCode: matchOrigin, flags});
    return {dest:d.name, country:d.extra||'', pkg, tags:d};
  });
}

// Rangira SVE kandidate po poklapanju + budžetu i vraća top `count`,
// plus ceo rangirani pool (za "Drugih 3 predloga" i fino podešavanje
// bez ponovnog otvaranja upitnika).
function pickMatchDestinations(answers, budget, candidates, nights, month, count){
  const scored = candidates.map(c => {
    const fit = computeMatchFitScore(c, answers, nights, month);
    let bonus = 0;
    let fitsBudget = true;
    if (budget){
      const ratio = c.pkg.total / budget;
      fitsBudget = ratio <= 1;
      bonus = fitsBudget ? 10 : Math.max(-24, 10 - (ratio - 1) * 40);
      if (fitsBudget) fit.reasons.push('budget');
    }
    const total = fit.score + bonus;
    const matchPct = Math.max(35, Math.min(98, Math.round(total)));
    return Object.assign({}, c, {matchScore: total, matchPct, reasons: fit.reasons, fitsBudget});
  });
  scored.sort((a, b) => b.matchScore - a.matchScore);
  const usedFallback = !!budget && !scored.slice(0, count).every(s => s.fitsBudget);
  return {picks: scored.slice(0, count), pool: scored, usedFallback};
}

// Kratka rečenica "Zato što…" — objašnjava PREPORUKU umesto da samo
// pokaže cenu, tako da korisnik vidi zašto baš taj grad, ne samo koliko košta.
function matchReasonSentence(pick, answers, month){
  const bits = [];
  const r = pick.reasons;
  if (r.some(x => x.startsWith('vibe_'))) bits.push(tf('mreason_vibe', {vibe: MATCH_VIBE_LABELS[answers.vibe] || t('mvibe_default')}));
  if (r.includes('season')) bits.push(tf('mreason_season', {month: matchMonthName(month)}));
  if (r.includes('near_fit') || r.includes('length_fit')) bits.push(t('mreason_length'));
  if (r.includes('family')) bits.push(t('mreason_family'));
  if (r.includes('nightlife')) bits.push(t('mreason_nightlife'));
  if (r.includes('romantic')) bits.push(t('mreason_romantic'));
  if (r.includes('budget')) bits.push(t('mreason_budget'));
  const top = bits.slice(0, 2);
  if (!top.length) return t('mreason_fallback');
  return tf('mreason_intro', {reasons: top.join(' ' + t('pkg_desc_and') + ' ')});
}

/* ==========================================================
   Loading skeleton — prikazuje se u #resultsBody dok se ponuda
   računa (lokalno ili sa backend-a), umesto praznog ekrana ili
   golog spinnera. Oblik prati stvarne .pkg/.item-card kartice
   (3 paketa x 3 stavke) da ne dođe do skoka layout-a kad prava
   ponuda stigne. ========================================================== */
function skeletonItemHtml(){
  return `
  <div class="skel-item">
    <div class="skel skel-photo"></div>
    <div class="skel-item-body">
      <div class="skel skel-label"></div>
      <div class="skel skel-name"></div>
      <div class="skel skel-sub2"></div>
      <div class="skel skel-price2"></div>
      <div class="skel skel-btn"></div>
    </div>
  </div>`;
}

function skeletonPkgHtml(){
  return `
  <div class="skel-pkg">
    <div class="skel-pkg-head">
      <div>
        <div class="skel skel-badge"></div>
        <div class="skel skel-title"></div>
        <div class="skel skel-sub"></div>
      </div>
      <div>
        <div class="skel skel-price"></div>
        <div class="skel skel-price-cur"></div>
      </div>
    </div>
    <div class="skel-items-row">${skeletonItemHtml()}${skeletonItemHtml()}${skeletonItemHtml()}</div>
  </div>`;
}

function skeletonResultsHtml(loadingText){
  return `
  <div class="skel-packages" role="status" aria-busy="true" aria-live="polite">
    <span class="sr-only">${escapeHtml(loadingText || '')}</span>
    ${skeletonPkgHtml()}${skeletonPkgHtml()}${skeletonPkgHtml()}
  </div>`;
}

/* ==========================================================
   Slajder za pakete (Budget/Comfort/Best Value) — na mobilnom
   se 3 kartice prikazuju kao horizontalni slajder sa snap-om i
   tačkicama umesto naslaganih jedna ispod druge (na širim
   ekranima CSS ih vraća u 3 kolone, vidi @media u styles.css).
========================================================== */
function packagesSliderHtml(cardsHtml){
  const dots = cardsHtml.length > 1
    ? `<div class="packages-dots">${cardsHtml.map((_,i)=>`<button type="button" class="packages-dot${i===0?' active':''}" data-idx="${i}" aria-label="Prikaži ponudu ${i+1}"></button>`).join('')}</div>`
    : '';
  return `<div class="packages-slider-wrap"><div class="packages">${cardsHtml.join('')}</div>${dots}</div>`;
}

function initPackagesSlider(wrap){
  if (!wrap) return;
  const track = wrap.querySelector('.packages');
  const dotsWrap = wrap.querySelector('.packages-dots');
  if (!track || !dotsWrap) return;
  track.scrollLeft = 0;
  const cards = Array.from(track.querySelectorAll('.pkg'));
  const dots = Array.from(dotsWrap.querySelectorAll('.packages-dot'));
  if (cards.length < 2) return;
  const setActive = (idx) => dots.forEach((d,i)=>d.classList.toggle('active', i===idx));
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = Number(dot.dataset.idx);
      const card = cards[idx];
      if (card) card.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'});
    });
  });
  if ('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6){
          const idx = cards.indexOf(entry.target);
          if (idx > -1) setActive(idx);
        }
      });
    }, {root:track, threshold:[0.6]});
    cards.forEach(c => io.observe(c));
  }
}

function rebuildPackagesDots(sliderWrap){
  if (!sliderWrap) return;
  const track = sliderWrap.querySelector('.packages');
  const dotsWrap = sliderWrap.querySelector('.packages-dots');
  if (!track) return;
  const cards = Array.from(track.querySelectorAll('.pkg'));
  if (!dotsWrap) return;
  if (cards.length < 2){ dotsWrap.remove(); return; }
  dotsWrap.innerHTML = cards.map((_,i)=>`<button type="button" class="packages-dot${i===0?' active':''}" data-idx="${i}" aria-label="Prikaži ponudu ${i+1}"></button>`).join('');
  initPackagesSlider(sliderWrap);
}

/* Centrira dati element u vidljivom prostoru ISPOD sticky top bara.
   Native scrollIntoView({block:'center'}) centrira CEO element — a
   #resultsBody (3 kartice u slajderu + tačkice + disclaimer pasus ispod)
   je često viši od ekrana, pa "centriranje" celog bloka gurne njegov vrh
   (deo koji korisnik treba da vidi) gore, ispod/iza sticky menija. Zato
   ovde ciljamo KONKRETAN element (npr. samu prvu karticu ponude) i
   centriramo SAMO njega u prostoru koji ostaje ispod menija. */
function scrollIntoCenterBelowHeader(el){
  if (!el) return;
  const topbarH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 0;
  const rect = el.getBoundingClientRect();
  const availableH = window.innerHeight - topbarH;
  const elH = Math.min(rect.height, availableH);
  const targetTopInViewport = topbarH + Math.max(0, (availableH - elH) / 2);
  const currentY = window.scrollY || window.pageYOffset;
  const elTopAbs = rect.top + currentY;
  window.scrollTo({top: Math.max(0, elTopAbs - targetTopInViewport), behavior:'smooth'});
}

/* ==========================================================
   Rezultati (3 kartice ponuda) kao zaseban prozor na mobilnom
   ==========================================================
   Na širem ekranu #results ostaje običan deo stranice (kao pre).
   Na mobilnom (<=760px) otvara se kao "bottom sheet" preko sadržaja:
   80% visine ekrana, pozadina stranice je zaključana (position:fixed
   trik, isti obrazac kao kod kalendara), a "Nazad" dugme zatvara sheet
   i vraća korisnika tačno tamo gde je bio na sajtu. Bez ovoga je skrol
   prstom unutar kartica u praksi skrolovao CEO sajt, jer su kartice
   bile samo deo obične stranice, a ne svoj prozor.
========================================================== */
let _resultsScrollY = 0;
const isMobileResults = () => window.matchMedia('(max-width:760px)').matches;

let _resultsScrollLocked = false;
// Isti razlog/rešenje kao kod kalendara/putnika (vidi lockPageScroll tamo).
function lockResultsPageScroll(){
  if (_resultsScrollLocked) return;
  _resultsScrollLocked = true;
  _resultsScrollY = window.scrollY;
  setTimeout(() => {
    if (!_resultsScrollLocked) return;
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + _resultsScrollY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }, 0);
}
function unlockResultsPageScroll(){
  _resultsScrollLocked = false;
  setTimeout(() => {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, _resultsScrollY);
  }, 0);
}

function openResultsSheet(){
  const results = document.getElementById('results');
  if (!results) return;
  const wasVisible = results.classList.contains('visible');
  results.classList.add('visible');
  const backdrop = document.getElementById('resultsBackdrop');
  if (isMobileResults()){
    if (backdrop) backdrop.classList.add('open');
    results.setAttribute('role', 'dialog');
    results.setAttribute('aria-modal', 'true');
    if (!wasVisible || !_resultsScrollLocked) lockResultsPageScroll();
    guardOverlayOpen('results', closeResultsSheet);
  }
}

function requestCloseResultsSheet(){
  if (!guardOverlayRequestClose('results')) closeResultsSheet();
}

function closeResultsSheet(){
  const results = document.getElementById('results');
  if (!results) return;
  const backdrop = document.getElementById('resultsBackdrop');
  const wasLocked = _resultsScrollLocked;
  results.classList.remove('visible');
  if (backdrop) backdrop.classList.remove('open');
  results.removeAttribute('role');
  results.removeAttribute('aria-modal');
  if (wasLocked) unlockResultsPageScroll();
  const trigger = document.querySelector('.btn-search-main');
  if (trigger) trigger.focus();
}

(function(){
  const backBtn = document.getElementById('resultsBackBtn');
  const backdrop = document.getElementById('resultsBackdrop');
  if (backBtn) backBtn.addEventListener('click', () => requestCloseResultsSheet());
  if (backdrop) backdrop.addEventListener('click', () => requestCloseResultsSheet());
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const results = document.getElementById('results');
    if (results && results.classList.contains('visible') && isMobileResults()) requestCloseResultsSheet();
  });
  // Ako se ekran "prebaci" preko 760px dok je sheet otvoren (npr. rotacija
  // tableta), skini zaključavanje skrola — na širem ekranu #results više
  // nije fiksni sheet, pa zaključana pozadina ne bi imala smisla.
  window.addEventListener('resize', () => {
    const results = document.getElementById('results');
    if (!results || !results.classList.contains('visible')) return;
    if (!isMobileResults() && _resultsScrollLocked){
      unlockResultsPageScroll();
      const backdrop = document.getElementById('resultsBackdrop');
      if (backdrop) backdrop.classList.remove('open');
      results.removeAttribute('role');
      results.removeAttribute('aria-modal');
      guardOverlayDrop('results');
    }
  });
})();

function showResultsError(){
  const body = document.getElementById('resultsBody');
  if (!body) return;
  body.classList.remove('rb-hidden', 'rb-swap-out');
  body.classList.add('rb-reveal');
  body.innerHTML = '<div class="disclaimer" role="alert" style="text-align:center;padding:18px 12px;">'
    + '<p style="margin:0 0 10px;">' + t('offers_load_error') + '</p>'
    + '<button type="button" class="pkg-alert-btn" onclick="runSearch(false)">' + t('offers_retry') + '</button></div>';
}
// Destinacija koju ne prepoznajemo ni u jednoj našoj bazi — korisniku javljamo
// da je ponuda okvirna, umesto da tiho prikažemo izmišljen "<grad> Hotel".
function isKnownDestination(destRaw){
  const key = normalizeSr(String(destRaw || '').split(',')[0].trim());
  if (!key) return false;
  if (POPULAR_DESTINATIONS.some(d => normalizeSr(d.name) === key)) return true;
  if (MATCH_DESTINATIONS.some(d => normalizeSr(d.name) === key)) return true;
  return !!airportInfoFor(destRaw);
}
async function renderResults(dest, from, to, nights, days, adults, flags, originCode, autoReveal, seq){
  try {
    await renderResultsInner(dest, from, to, nights, days, adults, flags, originCode, autoReveal, seq);
  } catch (err) {
    console.error('[sklopi] prikaz ponuda nije uspeo:', err);
    if (seq !== undefined && seq !== window._searchSeq) return;
    showResultsError();
  }
}
async function renderResultsInner(dest, from, to, nights, days, adults, flags, originCode, autoReveal, seq){
  const backendPkgs = await fetchPackagesFromBackend({
    dest, from, to, adults, originCode, flags
  });
  if (seq !== undefined && seq !== window._searchSeq) return; // stigla je novija pretraga
  const pkgs = backendPkgs || computePackagesLocally(dest, from, to, nights, days, adults, flags, originCode);
  // Ako je korisnik na početnoj izabrao Budžet / Balans / Komfor, taj paket ide prvi i nosi oznaku "Preporučeno".
  if (window.SKLOPI_tierChosen && Array.isArray(pkgs)){
    const want = {budget:'budget', balance:'best', comfort:'comfort'}[window.SKLOPI_tier];
    if (want && pkgs.some(p => p.tier === want)){
      pkgs.sort((x, y) => (y.tier === want) - (x.tier === want));
      pkgs.forEach(p => { p.recommended = (p.tier === want); });
    }
  }

  // Global kontekst za "Sačuvaj ovu ponudu" dugme na svakoj kartici —
  // isti obrazac kao window._lastBuilderPkg za builder.
  window._lastSearchPkgs = pkgs;
  window._lastSearchCtx = {dest, from, to, adults, nights, flags};

  document.getElementById('ctaTitle').textContent = tf('cta_title', {dest: cityLabel(dest)});
  document.getElementById('ctaDesc').textContent = ctaCopy(dest);

  const head = document.getElementById('resultsHead');
  const altNote = altAirportNoteFor(originCode);
  const destNote = destAirportNoteFor(dest);
  const unknownNote = isKnownDestination(dest) ? '' : tf('unknown_dest_note', {dest: dest});
  // Link ka stranici destinacije (destinacija.html): letovi, smeštaj, atrakcije, ruta i saveti za iste datume.
  // Prikazan kao kartica (dest-page-card) iznad ponuda, u istom vizuelnom jeziku kao ostale bele kartice sa senkom.
  const destPageUrl = 'destinacija.html?' + new URLSearchParams({
    od: originCode || 'Beograd', do: dest, polazak: from, povratak: to, putnika: String(adults)
  }).toString();
  const destPageNote = `<a class="dest-page-card" href="${escapeHtml(destPageUrl)}">` +
    `<span class="dpc-ic" aria-hidden="true">🧭</span>` +
    `<span class="dpc-text"><span class="dpc-title">Sve o putu na jednom mestu</span>` +
    `<span class="dpc-sub">Letovi, smeštaj, atrakcije, ruta i saveti za tvoje datume.</span></span>` +
    `<span class="dpc-arrow" aria-hidden="true">→</span></a>`;
  const notes = [
    unknownNote ? `<div class="plan-note">🔎 ${escapeHtml(unknownNote)}</div>` : '',
    altNote ? `<div class="plan-note">✈️ <b>Isplati li se let preko drugog aerodroma?</b><br>${escapeHtml(altNote)}</div>` : '',
    destNote ? `<div class="plan-note">🛬 <b>Pazi na koji aerodrom slećeš</b><br>${escapeHtml(destNote)}</div>` : ''
  ].filter(Boolean).join('');
  head.innerHTML = destPageNote + (notes ? `<div class="plan-notes">${notes}</div>` : '');

  // "Tvoj plan" kartica (naslov, Nastavi dugme i builder link) je uklonjena —
  // paketi se sada prikazuju odmah, bez međukoraka. Zamena skeletona
  // pravim karticama ide kroz kratki fade-out/fade-in (rb-swap-out), da
  // prelaz izgleda smišljeno, a ne kao nagli skok sadržaja.
  const body = document.getElementById('resultsBody');
  const hadSkeleton = !!body.querySelector('.skel-packages');
  body.classList.add('rb-swap-out');
  setTimeout(() => {
    if (seq !== undefined && seq !== window._searchSeq) return;
    try {
      body.innerHTML = `${packagesSliderHtml(pkgs.map(pkgHtml))}${typeof transportCardHtml === 'function' ? transportCardHtml(dest, adults, originCode, flags) : ''}`;
      initPackagesSlider(body.querySelector('.packages-slider-wrap'));
      body.classList.remove('rb-swap-out');
      body.classList.remove('rb-hidden');
      body.classList.add('rb-reveal');

      requestAnimationFrame(() => {
        scrollIntoCenterBelowHeader(body.querySelector('.packages .pkg') || body);
      });
    } catch (err) {
      console.error('[sklopi] iscrtavanje kartica nije uspelo:', err);
      showResultsError();
    }
  }, hadSkeleton ? 180 : 0);
}

/* ---- Vidljiva oznaka "affiliate/sponzorisan link" pored svake CTA
   rezervacije — potrošačka zaštita/transparentnost, ne samo FTC. ---- */
function affBadgeHtml(opts){
  // opts.plain: bez tabindex-a — za oznaku UNUTAR <a> kartice (fokusabilan element u linku nije dobar).
  const focus = (opts && opts.plain) ? '' : ' tabindex="0"';
  return `<span class="aff-badge" title="${escapeHtml(t('aff_badge_title'))}" data-i18n-title="aff_badge_title"${focus}>🔗 <span data-i18n="aff_badge">${escapeHtml(t('aff_badge'))}</span></span>`;
}

function itemCardHtml(item, kind, pkg){
  if (!item) return '';
  const labels = {flight:t('item_label_flight'), hotel:t('item_label_hotel'), car:t('item_label_car')};
  const btnKey = {flight:'btn_search_kayak', hotel:'btn_book_booking', car:'btn_book_booking'};
  return `
  <div class="item-card ${kind}">
    <div class="item-photo ${kind}">${iconSvg(kind)}</div>
    <div class="item-body">
      <div class="item-label"><span data-i18n="item_label_${kind}">${labels[kind]}</span>${item.providerLabel!=='SKLOPI' ? `<span class="item-provider">${escapeHtml(item.providerLabel)}</span>` : ''}</div>
      <div class="item-name">${escapeHtml(item.name)}</div>
      <div class="item-sub">${escapeHtml(item.sub)}</div>
      ${item.perks && item.perks.length ? `<ul class="item-perks">${item.perks.map(pk => `<li class="perk ${pk.pos === true ? 'pos' : pk.pos === false ? 'neg' : 'neu'}" data-i18n="${pk.k}">${escapeHtml(t(pk.k))}</li>`).join('')}</ul>` : ''}
      <div class="item-price tabular">${fmtEUR(item.price)}</div>
      <a class="item-btn ${kind}" href="${escapeHtml(item.bookUrl||'#')}" target="_blank" rel="noopener sponsored" data-kind="${kind}" data-price="${item.price}" data-url="${escapeHtml(item.bookUrl||'')}" data-dest="${escapeHtml(pkg&&pkg.dest||'')}" data-tier="${escapeHtml(pkg&&pkg.tier||'')}" onclick="bookItem(this)" data-i18n="${btnKey[kind]}">${escapeHtml(t(btnKey[kind]))}</a>
      ${affBadgeHtml()}
    </div>
  </div>`;
}

function pkgHtml(pkg){
  const meta = TIER_META[pkg.tier];
  const featured = pkg.recommended;
  const itemsRow = [
    itemCardHtml(pkg.flight,'flight',pkg),
    itemCardHtml(pkg.hotel,'hotel',pkg),
    itemCardHtml(pkg.car,'car',pkg)
  ].filter(Boolean).join('');

  return `
  <div class="pkg ${pkg.tier} ${featured?'featured':''}" data-base-total="${pkg.total}">
    <button type="button" class="pkg-close" onclick="closePkgCard(this)" aria-label="${escapeHtml(t('pkg_close'))}" title="${escapeHtml(t('pkg_close'))}" data-i18n-aria-label="pkg_close" data-i18n-title="pkg_close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
    <div class="pkg-head">
      <div class="pkg-head-main">
        ${featured ? `<span class="pkg-badge" data-i18n="pkg_recommended">${escapeHtml(t('pkg_recommended'))}</span>` : ''}
        <h3>${meta.label}</h3>
        <div class="pkg-desc">${pkgDescText(pkg)}</div>
        <div class="pkg-total">
          <div class="num tabular">${fmtEUR(pkg.total)}</div>
          <div class="cur" data-i18n="builder_total_sub">${escapeHtml(t('builder_total_sub'))}</div>
          <div class="hint" data-i18n="pkg_total_hint">${escapeHtml(t('pkg_total_hint'))}</div>
        </div>
      </div>
      <div class="pkg-score-box score-${pkg.score>=80?'good':pkg.score>=60?'mid':'low'}">
        <div class="score-num tabular">${pkg.score}</div>
        <div class="score-max">/100</div>
        <div class="score-label" data-i18n-html="pkg_score_label">${t('pkg_score_label')}</div>
      </div>
    </div>
    ${itemsRow ? `<div class="items-row">${itemsRow}</div>` : ''}
    ${(() => {
      const extraTiles = [
        pkg.activity ? `<div class="extra activity-extra">${iconSvg('activity')}<div><div class="lab">${escapeHtml(pkg.activity.name.split(' — ')[0])}</div><div class="val tabular">${fmtEUR(pkg.activity.price)}</div></div><a class="extra-btn" href="${escapeHtml(pkg.activity.bookUrl||'#')}" target="_blank" rel="noopener sponsored" data-kind="activity" data-price="${pkg.activity.price}" data-url="${escapeHtml(pkg.activity.bookUrl||'')}" data-dest="${escapeHtml(pkg.dest||'')}" data-tier="${escapeHtml(pkg.tier||'')}" onclick="bookItem(this)">Viator</a>${affBadgeHtml()}</div>` : '',
        pkg.car ? `<div class="extra fuel-extra">${iconSvg('fuel')}<div><div class="lab">${t('fuel_estimate')}</div><div class="val tabular">${fmtEUR(pkg.fuel)}</div></div></div>` : '',
        pkg.car ? `<div class="extra tolls-extra">${iconSvg('tolls')}<div><div class="lab">${t('tolls_estimate')}</div><div class="val tabular">${fmtEUR(pkg.tolls)}</div></div></div>` : ''
        // Osiguranje i eSIM dodaci su uklonjeni sa ovih kartica — sad se
        // biraju u sekciji "Kontrola sadržaja" (builder), da kartice
        // ponude ostanu pregledne. pkg.insuranceCost/esimCost i dalje
        // postoje u pkg objektu (koristi ih builder), samo se ovde ne
        // renderuju.
      ].filter(Boolean).join('');
      return extraTiles ? `<div class="extras-row">${extraTiles}</div>` : '';
    })()}
    <div class="confirm-banner">
      <span>${iconSvg('check')} ${t('base_package_note')}</span>
      <span><span class="amt-lab" data-i18n="pkg_total_line">${escapeHtml(t('pkg_total_line'))}</span><span class="amt tabular">${fmtEUR(pkg.total)}</span></span>
    </div>
    <button type="button" class="pkg-save-btn" onclick="saveSearchPackage('${pkg.tier}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
      <span data-i18n="pkg_save_offer">${escapeHtml(t('pkg_save_offer'))}</span>
    </button>
    <button type="button" class="pkg-alert-btn" onclick="openAlertModal('search', '${pkg.tier}', ${pkg.total})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 3a5 5 0 00-5 5v3.2c0 .9-.35 1.75-.98 2.4L4.6 15h14.8l-1.42-1.4a3.4 3.4 0 01-.98-2.4V8a5 5 0 00-5-5z"/><path d="M9.5 19a2.6 2.6 0 005 0"/></svg>
      <span data-i18n="btn_price_alert">${escapeHtml(t('btn_price_alert'))}</span>
    </button>
  </div>`;
}

function closePkgCard(btn){
  const card = btn.closest('.pkg');
  if (!card) return;
  const wrap = card.parentElement;
  card.style.transition = 'opacity .18s ease, transform .18s ease, margin .18s ease, max-height .18s ease';
  card.style.maxHeight = card.offsetHeight + 'px';
  card.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    card.style.opacity = '0';
    card.style.transform = 'scale(0.97)';
    card.style.maxHeight = '0px';
    card.style.marginBottom = '0px';
    card.style.marginTop = '0px';
  });
  setTimeout(() => {
    card.remove();
    const sliderWrap = wrap && wrap.classList.contains('packages') ? wrap.closest('.packages-slider-wrap') : null;
    if (wrap && wrap.classList.contains('packages') && !wrap.querySelector('.pkg')){
      wrap.innerHTML = '<p class="disclaimer" style="text-align:center;">' + escapeHtml(t('pkg_all_closed')) + ' <button type="button" class="pkg-alert-btn" style="margin-left:6px;" onclick="runSearch(false)">' + escapeHtml(t('pkg_search_again')) + '</button></p>';
      const dotsWrap = sliderWrap && sliderWrap.querySelector('.packages-dots');
      if (dotsWrap) dotsWrap.remove();
    } else if (sliderWrap) {
      rebuildPackagesDots(sliderWrap);
    }
  }, 200);
}

/* ==========================================================
   Prikaz rezultata za "Pronađi svoj izlet" — 3 RAZLIČITE destinacije
   sa procentom poklapanja i objašnjenjem, ne samo cenom. Deli
   #resultsHead/#resultsBody sa običnom pretragom (isti kontejner),
   samo drugačiji sadržaj + poseban jewel-tone match bedž.
========================================================== */
function matchPkgHtml(pick, idx, budget, answers, month){
  const {dest, country, pkg, matchPct, fitsBudget} = pick;
  const featured = idx === 0;
  const itemsRow = [
    itemCardHtml(pkg.flight,'flight',pkg),
    itemCardHtml(pkg.hotel,'hotel',pkg),
    itemCardHtml(pkg.car,'car',pkg)
  ].filter(Boolean).join('');
  // Autobus/voz zanima samo one koji NISU izabrali let — ko je označio avion, ne prikazuje im se.
  // Privremeno isključeno na zahtev ("za sada samo auto") — busTrainNoteFor() ostaje u kodu
  // nedirnut, samo se ne poziva, radi lakšeg vraćanja kasnije.
  const busNote = '';
  const reasonText = matchReasonSentence(pick, answers, month);

  return `
  <div class="pkg match-pkg ${featured?'featured':''}" data-base-total="${pkg.total}">
    <div class="pkg-head">
      <div class="pkg-head-main">
        <span class="pkg-badge match-badge">${escapeHtml(featured ? t('pkg_recommended') : t('match_badge_suggestion'))}</span>
        <h3>${escapeHtml(cityLabel(dest))}</h3>
        <div class="pkg-desc">${escapeHtml(countryLabel(country))} · Best Value</div>
        <div class="pkg-total">
          <div class="num tabular">${fmtEUR(pkg.total)}</div>
          <div class="cur" data-i18n="builder_total_sub">${escapeHtml(t('builder_total_sub'))}</div>
          <div class="hint" data-i18n="pkg_total_hint">${escapeHtml(t('pkg_total_hint'))}</div>
        </div>
      </div>
      <div class="pkg-score-box">
        <div class="score-num tabular">${matchPct}%</div>
        <div class="score-max">${escapeHtml(t('match_score_label'))}</div>
        <div class="score-label">${escapeHtml(t('match_score_sub'))}</div>
      </div>
    </div>
    <div class="match-reason">💡 ${escapeHtml(reasonText)}</div>
    ${(!pkg.flight && typeof transportCompactHtml === 'function' && transportCompactHtml(dest, pick.adults)) || (busNote ? `<div class="alt-airport-box" style="margin:0 0 14px;">🚌 <b>${escapeHtml(t('match_bus_title'))}</b><br>${escapeHtml(busNote)}</div>` : '')}
    ${itemsRow ? `<div class="items-row">${itemsRow}</div>` : ''}
    <div class="confirm-banner">
      <span>${iconSvg('check')} ${budget ? (fitsBudget ? t('fits_budget') + fmtEUR(budget) + '.' : t('over_budget')) : t('match_no_budget')}</span>
      <span><span class="amt-lab" data-i18n="pkg_total_line">${escapeHtml(t('pkg_total_line'))}</span><span class="amt tabular">${fmtEUR(pkg.total)}</span></span>
    </div>
    <button type="button" class="pkg-save-btn" onclick="exploreMatchDestination(${idx})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M9 18l6-6-6-6"/></svg>
      ${escapeHtml(tf('match_build_for', {dest: cityLabel(dest)}))}
    </button>
    <button type="button" class="pkg-save-btn" onclick="saveMatchPackage(${idx})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
      <span data-i18n="pkg_save_offer">${escapeHtml(t('pkg_save_offer'))}</span>
    </button>
    <button type="button" class="pkg-alert-btn" onclick="openAlertModal('search', 'best', ${pkg.total}, '${escapeHtml(dest).replace(/'/g,"\\'")}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 3a5 5 0 00-5 5v3.2c0 .9-.35 1.75-.98 2.4L4.6 15h14.8l-1.42-1.4a3.4 3.4 0 01-.98-2.4V8a5 5 0 00-5-5z"/><path d="M9.5 19a2.6 2.6 0 005 0"/></svg>
      <span data-i18n="btn_price_alert">${escapeHtml(t('btn_price_alert'))}</span>
    </button>
  </div>`;
}

function renderMatchResults(picks, ctxBase, budget, answers, usedFallback){
  // Argumenti se pamte da bi se rezultati mogli ponovo iscrtati kad se promeni jezik.
  window._lastMatchRender = {picks, ctxBase, budget, answers, usedFallback};
  window._lastMatchPicks = picks;
  window._lastMatchCtx = ctxBase;
  window._lastMatchAnswers = answers;

  const month = new Date(ctxBase.from).getMonth() + 1;
  const vibeLab = MATCH_VIBE_LABELS[answers.vibe] || '';
  const head = document.getElementById('resultsHead');
  head.innerHTML = `
    <div class="status-banner match-status-banner">
      <div class="status-left">
        <div class="status-check">🧭</div>
        <div><h3>${escapeHtml(t('match_results_title'))}</h3><p>${escapeHtml(usedFallback ? t('match_results_sub_fallback') : tf('match_results_sub', {vibe: vibeLab ? ' (' + vibeLab + ')' : ''}))}</p></div>
      </div>
      <div class="status-pills">
        <div class="pill">${iconSvg('calendar')} ${fmtDate(ctxBase.from)} – ${fmtDate(ctxBase.to)}</div>
        <div class="pill">${iconSvg('people')} ${ctxBase.adults} ${passengerLabel(ctxBase.adults)}</div>
      </div>
    </div>
  `;

  const body = document.getElementById('resultsBody');
  const hadSkeleton = !!body.querySelector('.skel-packages');
  body.classList.add('rb-swap-out');
  setTimeout(() => {
    body.innerHTML = `
      ${packagesSliderHtml(picks.map((p,i)=>matchPkgHtml(p, i, budget, answers, month)))}
      <div class="match-refine-row">
        <button type="button" class="chip match-refine-chip" onclick="refineMatchSearch('sea')">${escapeHtml(t('match_refine_sea'))}</button>
        <button type="button" class="chip match-refine-chip" onclick="refineMatchSearch('nightlife')">${escapeHtml(t('match_refine_nightlife'))}</button>
        <button type="button" class="chip match-refine-chip" onclick="refineMatchSearch('nature')">${escapeHtml(t('match_refine_nature'))}</button>
        <button type="button" class="chip match-refine-chip" onclick="refineMatchSearch('cheaper')">${escapeHtml(t('match_refine_cheaper'))}</button>
      </div>
      <button type="button" class="btn-alert match-reroll-btn" onclick="runMatchSearch(true)">${escapeHtml(t('match_reroll'))}</button>
    `;
    initPackagesSlider(body.querySelector('.packages-slider-wrap'));
    body.classList.remove('rb-swap-out');
  }, hadSkeleton ? 180 : 0);
}

// Ako su trenutno prikazani rezultati upitnika, iscrtaj ih ponovo u novom jeziku.
const _prevOnLangChangeMatch = window.onLangChange;
window.onLangChange = function(lang){
  if (typeof _prevOnLangChangeMatch === 'function') _prevOnLangChangeMatch(lang);
  const r = window._lastMatchRender;
  if (r && document.querySelector('#resultsBody .match-pkg')){
    renderMatchResults(r.picks, r.ctxBase, r.budget, r.answers, r.usedFallback);
  }
};

// Trenutno stanje upitnika (popunjava se klikom na chip-ove u modalu)
const matchQuizState = { companion:null, vibe:null };

async function runMatchSearch(isReroll){
  const budgetInput = document.getElementById('matchBudget');
  const budget = Number(budgetInput.value) || 0;

  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  const adults = document.getElementById('adults').value || '2';
  const flags = {
    flight:    document.querySelector('.toggle[data-t="flight"]').classList.contains('on'),
    hotel:     document.querySelector('.toggle[data-t="hotel"]').classList.contains('on'),
    car:       document.querySelector('.toggle[data-t="car"]').classList.contains('on'),
    activity:  document.querySelector('.toggle[data-t="activity"]').classList.contains('on'),
    // Iste stvarne preference iz upitnika kao i kod runSearch() — vidi
    // komentar tamo. "Pronađi svoj izlet" predlaže DESTINACIJE, ali
    // paketi koje pravi za njih treba da poštuju isti tip leta/hotela/
    // auta/broj aktivnosti, ne nasumičan sadržaj.
    flightPref: builderState.flightPref,
    airlineName: builderState.airlineName,
    hotelStars: builderState.hotelStars,
    prioritizeRating: builderState.prioritizeRating,
    prioritizeLocation: builderState.prioritizeLocation,
    carPref: builderState.carPref !== 'none' ? builderState.carPref : 'small',
    activityCount: builderState.activityCount > 0 ? builderState.activityCount : 1,
  };
  const answers = Object.assign({}, (isReroll && window._lastMatchAnswers) || matchQuizState);
  if (!answers.companion || !answers.vibe){ showToast('Odgovori na oba pitanja pre pretrage.'); return; }

  // Direktan prelazak na rezultate — vidi komentar uz guardOverlayReplace
  // (zašto NE koristimo requestCloseMatchModal ovde).
  if (!isReroll){
    closeMatchModal();
    guardOverlayReplace('match', 'results', closeResultsSheet);
  }

  const results = document.getElementById('results');
  openResultsSheet();
  if (!isReroll){
    document.getElementById('resultsHead').innerHTML = '';
    document.getElementById('resultsBody').innerHTML = skeletonResultsHtml('Tražimo destinacije koje ti najbolje odgovaraju…');
    if (!isMobileResults()) results.scrollIntoView({behavior:'smooth', block:'start'});
  }

  setTimeout(()=>{
    const nights = nightsBetween(from, to);
    const month = new Date(from).getMonth() + 1;
    const candidates = computeMatchCandidates(from, to, adults, flags).map(c => Object.assign(c, {adults}));
    const excludeNames = isReroll ? (window._lastMatchPicks || []).map(p => p.dest) : [];
    const pool = excludeNames.length ? candidates.filter(c => !excludeNames.includes(c.dest)) : candidates;
    const {picks, usedFallback} = pickMatchDestinations(answers, budget, pool, nights, month, 3);
    // "Poslednja destinacija" u statistici treba da bude GRAD (kao kod obične
    // pretrage), a ne budžet — zato se beleži tek kad su predlozi izračunati.
    bumpSearchStat('🧭 ' + (picks[0] ? picks[0].dest : 'Match'));
    renderMatchResults(picks, {from, to, adults, nights, flags}, budget, answers, usedFallback);
  }, isReroll ? 0 : 700);
}

// Fino podešavanje BEZ ponovnog otvaranja upitnika — menja jedan
// parametar (vibe ili budžet) i odmah ponovo rangira, kao pravi filter.
function refineMatchSearch(kind){
  const ctx = window._lastMatchCtx;
  const answers = Object.assign({}, window._lastMatchAnswers || matchQuizState);
  let budget = Number(document.getElementById('matchBudget').value) || 0;
  if (!ctx){ showToast('Pokreni "Pronađi svoj izlet" ponovo.'); return; }

  if (kind === 'cheaper'){
    budget = budget ? Math.round(budget * 0.75) : 0;
    if (!budget){ showToast('Prvo unesi budžet da bi mogao da ga smanjiš.'); return; }
    document.getElementById('matchBudget').value = budget;
  } else {
    answers.vibe = kind;
  }

  const results = document.getElementById('results');
  openResultsSheet();
  document.getElementById('resultsBody').innerHTML = skeletonResultsHtml('Prilagođavamo predloge…');
  setTimeout(()=>{
    const nights = nightsBetween(ctx.from, ctx.to);
    const month = new Date(ctx.from).getMonth() + 1;
    const candidates = computeMatchCandidates(ctx.from, ctx.to, ctx.adults, ctx.flags).map(c => Object.assign(c, {adults: ctx.adults}));
    const {picks, usedFallback} = pickMatchDestinations(answers, budget, candidates, nights, month, 3);
    renderMatchResults(picks, ctx, budget, answers, usedFallback);
  }, 350);
}

// Klik na "Napravi aranžman za {grad}" — prebacuje na normalnu pretragu
// (sva 3 tier-a) za taj konkretni grad, umesto samo 'best' predloga.
function exploreMatchDestination(idx){
  const pick = (window._lastMatchPicks || [])[idx];
  if (!pick) return;
  document.getElementById('dest').value = pick.dest;
  runSearch(true);
}

async function saveMatchPackage(idx){
  const user = await getCurrentUser();
  if (!user){
    promptLogin('Prijavi se emailom da sačuvaš ponudu.');
    return;
  }
  const pick = (window._lastMatchPicks || [])[idx];
  const ctx = window._lastMatchCtx;
  if (!pick || !ctx){ showToast('Ponuda više nije dostupna — probaj ponovo.'); return; }

  const summaryTags = [
    '🧭 ' + pick.matchPct + '% poklapanje',
    pick.pkg.flight ? pick.pkg.flight.name : 'Bez leta',
    pick.pkg.hotel ? pick.pkg.hotel.name : 'Bez hotela',
    pick.pkg.car ? 'Sa autom' : 'Bez auta'
  ];

  const { error } = await sb.from('trips').insert({
    user_id: user.id,
    dest: pick.dest,
    date_from: ctx.from,
    date_to: ctx.to,
    adults: Number(ctx.adults),
    selection: {kind:'search', tier:'best', tierLabel:'Best Value (Pronađi svoj izlet)', summaryTags},
    total: pick.pkg.total
  });
  if (error){ showToast('Greška pri čuvanju: ' + error.message); return; }
  renderSavedTrips();
  showToast(pick.dest + ' sačuvan (' + fmtEUR(pick.pkg.total) + ').');
}

/* ---- Kviz modal: 3 koraka (sa kim / vibe / budžet), chip-select sa
   auto-napredovanjem na sledeći korak, kao pravi kratak upitnik. ---- */
function goToMatchStep(n){
  document.querySelectorAll('#matchModal .match-step').forEach(el => {
    el.classList.toggle('active', Number(el.dataset.step) === n);
  });
  document.querySelectorAll('#matchModal .match-dot').forEach(el => {
    el.classList.toggle('active', Number(el.dataset.step) === n);
  });
  if (n === 3){
    const btn = document.getElementById('matchModalSubmit');
    if (btn) setTimeout(() => document.getElementById('matchBudget').focus(), 200);
  }
}
function selectMatchChip(group, value, chipEl, nextStep){
  matchQuizState[group] = value;
  chipEl.closest('.match-chip-grid').querySelectorAll('.match-chip').forEach(c => c.classList.remove('on'));
  chipEl.classList.add('on');
  if (nextStep) setTimeout(() => goToMatchStep(nextStep), 260);
}
function openMatchModal(){
  matchQuizState.companion = null;
  matchQuizState.vibe = null;
  document.querySelectorAll('#matchModal .match-chip').forEach(c => c.classList.remove('on'));
  document.getElementById('matchBudget').value = '';
  goToMatchStep(1);
  document.getElementById('matchModalBackdrop').classList.add('open');
  document.getElementById('matchModal').classList.add('open');
  guardOverlayOpen('match', closeMatchModal);
}
function requestCloseMatchModal(){
  if (!guardOverlayRequestClose('match')) closeMatchModal();
}
function closeMatchModal(){
  document.getElementById('matchModalBackdrop').classList.remove('open');
  document.getElementById('matchModal').classList.remove('open');
}

/* Uživo sabiranje dodataka (osiguranje/eSIM) na cenu paketa — bez ponovne
   pretrage. Svaki .pkg pamti svoju osnovnu cenu u data-base-total, a ovde
   se na nju dodaje zbir čekiranih dodataka unutar TOG istog paketa. */
function toggleAddon(checkbox){
  const pkgEl = checkbox.closest('.pkg');
  if (!pkgEl) return;
  const base = Number(pkgEl.dataset.baseTotal) || 0;
  let sum = base;
  pkgEl.querySelectorAll('.addon-checkbox:checked').forEach(cb => { sum += Number(cb.dataset.price) || 0; });
  const totalEl = pkgEl.querySelector('.pkg-total .num');
  const confirmEl = pkgEl.querySelector('.confirm-banner .amt');
  if (totalEl) totalEl.textContent = fmtEUR(sum);
  if (confirmEl) confirmEl.textContent = fmtEUR(sum);
}

/* ==========================================================
   AFFILIATE CLICK SIMULATION
   Mirrors /go/offer123 -> save click -> redirect
========================================================== */
function bookItem(btn){
  const kind = btn.dataset.kind;
  const price = Number(btn.dataset.price);
  const url = btn.dataset.url;
  const dest = btn.dataset.dest || '';
  const tier = btn.dataset.tier || '';
  bumpClickStat();
  trackAffiliateClick(kind, price, dest, tier);
  const labels = {
    flight:   'let na KAYAK-u',
    hotel:    'smeštaj na Booking.com',
    car:      'auto na Booking.com',
    activity: 'aktivnost na Viator-u',
    esim:     'eSIM na Airalo-u'
  };
  showToast('Klik zabeležen za ' + (labels[kind]||kind) + (price > 0 ? ' (' + fmtEUR(price) + ')' : '') + ' · otvaram partnera…');
  // Napomena: ne pozivamo window.open ovde — <a href target="_blank"> sam
  // otvara link. Ranije smo ovde imali window.open(url,'_blank','noopener'),
  // ali JS-generisani popup tabovi znaju da se na mobilnom Chrome-u ne povežu
  // kako treba sa originalnim tabom, pa dugme "nazad" na partnerskom sajtu
  // ume da zatvori ceo browser umesto da vrati korisnika na Skoknicu.
  // Pravi <a> link je pouzdaniji način da se to izbegne.
}

/* ---- GA4: koji partner/destinacija/tier generiše affiliate klikove.
   Ćuti ako GA nije učitan (kolačići odbijeni ili korisnik još nije birao) —
   vidi cookies.js/loadGA(). bumpClickStat() iznad i dalje radi nezavisno
   od ovoga (to je opšti brojač, ne po partneru/destinaciji). ---- */
function trackAffiliateClick(kind, price, dest, tier){
  if (typeof window.gtag !== 'function') return;
  const partner = {flight:'kayak', hotel:'booking', car:'booking', activity:'viator', esim:'airalo', insurance:'worldnomads'}[kind] || kind;
  window.gtag('event', 'affiliate_click', {
    item_kind: kind,
    partner: partner,
    destination: dest,
    tier: tier,
    value: price,
    currency: 'EUR'
  });
}

/* ---- GA4: gornji/srednji dio funnel-a (affiliate_click iznad je već
   dno funnel-a). Isti "ćuti ako GA nije učitan" obrazac kao gore —
   pozivi ispod se dešavaju i kad su kolačići odbijeni, samo bez efekta.
   Tri koraka koje ovo prati:
     search_submit  — korisnik je potvrdio destinaciju/datume (Start)
     builder_open   — otvorio "Napravi svoj aranžman" (custom put)
     offers_view    — dobio 3 gotove ponude (Budget/Best/Comfort put)
   Ovo je namerno odvojeno od bumpSearchStat/bumpClickStat, koji pišu u
   site_stats (javni brojač na sajtu, ne GA/funnel podatak). ---- */
function trackFunnelEvent(name, params){
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, params || {});
}

function showToast(msg){
  const t = document.getElementById('toast');
  document.getElementById('toastText').textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('show'), 3200);
}

function updateStats(){
  const elSearches = document.getElementById('statSearches');
  const elClicks = document.getElementById('statClicks');
  const elLast = document.getElementById('statLast');
  if (elSearches) elSearches.textContent = Math.max(state.searches, STAT_DISPLAY_FLOOR.searches);
  if (elClicks) elClicks.textContent = Math.max(state.clicks, STAT_DISPLAY_FLOOR.clicks);
  if (elLast) elLast.textContent = cityLabelWithPrefix(state.lastDest || STAT_LAST_DEST_FALLBACK);
  saveStats();
}

/* ---- Uvećanje brojača: prvo pokušaj deljeni (Supabase RPC, atomično za
   sve posetioce), a ako ne uspe (sb nedostupan, tabela/funkcija ne postoji,
   mreža) — padni nazad na lokalni brojač kao do sad. ---- */
async function bumpSearchStat(destLabel){
  if (typeof sb !== 'undefined' && sb){
    try{
      const { data, error } = await sb.rpc('increment_search_stat', { p_dest: destLabel });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row){
        state.searches = row.searches;
        state.clicks = row.clicks;
        state.lastDest = row.last_dest || destLabel;
        updateStats();
        return;
      }
    }catch(err){
      console.warn('[sklopi] Deljeni brojač pretraga nije uspeo, koristim lokalni:', err.message);
    }
  }
  state.searches += 1;
  state.lastDest = destLabel;
  updateStats();
}
async function bumpClickStat(){
  if (typeof sb !== 'undefined' && sb){
    try{
      const { data, error } = await sb.rpc('increment_click_stat');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row){
        state.searches = row.searches;
        state.clicks = row.clicks;
        state.lastDest = row.last_dest || state.lastDest;
        updateStats();
        return;
      }
    }catch(err){
      console.warn('[sklopi] Deljeni brojač klikova nije uspeo, koristim lokalni:', err.message);
    }
  }
  state.clicks += 1;
  updateStats();
}

/* ==========================================================
   FORM WIRING
========================================================== */
/* ---- "Polazak" (poreklo/origin) polje je sada TRAJNO vidljivo, bez
   obzira na "Letovi" toggle — korisnik može uneti polazište i kad
   avion nije označen. Required atribut i dalje prati "Letovi" toggle,
   jer je polazište obavezno samo kad se stvarno traži let (vidi i
   validateSearchInputs ispod), dok za hotel/auto/aktivnosti ostaje
   opciono. ---- */
function updateOriginVisibility(showOrigin){
  const originInput = document.getElementById('origin');
  if (!originInput) return;
  if (showOrigin) originInput.setAttribute('required', 'required');
  else originInput.removeAttribute('required');
}

document.querySelectorAll('.toggle').forEach(t=>{
  t.addEventListener('click', (e)=>{
    e.preventDefault();
    const input = t.querySelector('input');
    input.checked = !input.checked;
    t.classList.toggle('on', input.checked);
    if (t.dataset.t === 'flight'){
      updateOriginVisibility(input.checked);
      renderOriginAirportWarning(document.getElementById('origin').value);
      renderDestAirportWarning(document.getElementById('dest').value);
    }
    // BAG: "3 plana" i "Tvoj personalizovani plan" su se osvežavali SAMO na
    // promenu Polaska/datuma/putnika (vidi njihove 'origin'/'dateFrom'/
    // 'dateTo'/'adults' listenere), ne i na Letovi/Smeštaj/R a C/Aktivnost —
    // pa je npr. markiranje sva 4 toggle-a i dalje prikazivalo kartice
    // izračunate za STARO (podrazumevano: samo Smeštaj) stanje, dok
    // korisnik posle toga ne bi dirnuo neko od tih ostalih polja. Ovaj
    // event javlja svima koji zavise od izbora usluga da se osveže odmah.
    document.dispatchEvent(new Event('sklopi:services-changed'));
  });
});

// Postavi početno stanje u skladu sa checkbox-om koji je već markiran u HTML-u
// (trenutno "Letovi" nije uključen po default-u, pa se polje krije od starta).
updateOriginVisibility(document.querySelector('.toggle[data-t="flight"] input').checked);

function localTodayStr(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
/* Provera unosa PRE pokretanja pretrage — umesto tihih zamena (prazna
   destinacija → "Atina") i NaN cena (neispravni datumi). Vraća
   {ok:true} ili {ok:false, msg, focus}. `extra` dozvoljava pozivaocu da
   javi uključivanje auta/aktivnosti koje još nije primenjeno na toggle-ove
   (modal "Prilagodi svoj plan" ih tek postavlja); `checkPast` se traži samo
   za NOVU pretragu — ne i za učitavanje sačuvanog izleta sa starim datumima. */
function validateSearchInputs(extra){
  extra = extra || {};
  const dest = document.getElementById('dest').value.trim();
  const origin = document.getElementById('origin').value.trim();
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  const on = k => { const el = document.querySelector('.toggle[data-t="' + k + '"]'); return !!(el && el.classList.contains('on')); };
  const flight = on('flight'), hotel = on('hotel');
  const car = on('car') || !!extra.car, activity = on('activity') || !!extra.activity;
  const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !isNaN(new Date(v));
  // #dateFrom/#dateTo se PUNE default vrednošću (danas+14 dana) čim se
  // stranica učita — to je samo početna pozicija kalendara, ne stvarni
  // izbor korisnika. Zato datumi ovde NISU validni dok ih korisnik ne
  // potvrdi (dugme "Gotovo" u kalendaru skida "is-empty" — vidi updateDisplay
  // u IIFE-u iznad); bez ove provere je moguće poslati pretragu i dobiti
  // ceo paket a da datumi nikad nisu ni otvoreni, kamoli izabrani.
  const datesConfirmed = !document.getElementById('dateDisplayBtn')?.classList.contains('is-empty');
  const paxConfirmed = !document.getElementById('paxDisplayBtn')?.classList.contains('is-empty');
  if (!dest) return {ok:false, focus:'dest', msg:t('val_dest_missing')};
  if (flight && !origin) return {ok:false, focus:'origin', msg:t('val_origin_missing')};
  if (!datesConfirmed || !isDate(from) || !isDate(to)) return {ok:false, focus:'form', msg:t('val_dates_missing')};
  if (to <= from) return {ok:false, focus:'form', msg:t('val_return_before_departure')};
  if (extra.checkPast && from < localTodayStr()) return {ok:false, focus:'form', msg:t('val_departure_in_past')};
  if (!paxConfirmed) return {ok:false, focus:'form', msg:t('val_passengers_missing')};
  if (!(flight || hotel || car || activity)) return {ok:false, focus:'form', msg:t('val_no_service')};
  return {ok:true};
}
function focusSearchField(which){
  const el = which === 'dest' || which === 'origin' ? document.getElementById(which) : null;
  const form = document.getElementById('searchForm');
  if (form) form.scrollIntoView({behavior:'smooth', block:'center'});
  if (el) setTimeout(() => el.focus({preventScroll:true}), 250);
}

async function runSearch(shouldScroll, autoReveal){
  const check = validateSearchInputs();
  if (!check.ok){ showToast(check.msg); focusSearchField(check.focus); return; }
  const dest = document.getElementById('dest').value.trim();
  const originCode = document.getElementById('origin').value.trim();
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  // Ranije se nights/days ovde NIKAD nisu definisali, pa je poziv u
  // setTimeout-u ispod bacao ReferenceError i skeleton ostajao zauvek.
  const nights = nightsBetween(from, to);
  const days = nights;
  const adults = String(Math.min(9, Math.max(1, Number(document.getElementById('adults').value) || 2)));
  const seq = window._searchSeq = (window._searchSeq || 0) + 1; // samo poslednja pretraga sme da iscrta rezultate
  const flags = {
    flight:    document.querySelector('.toggle[data-t="flight"]').classList.contains('on'),
    hotel:     document.querySelector('.toggle[data-t="hotel"]').classList.contains('on'),
    car:       document.querySelector('.toggle[data-t="car"]').classList.contains('on'),
    activity:  document.querySelector('.toggle[data-t="activity"]').classList.contains('on'),
    // Detaljne preference iz upitnika (builderState) — da tri ponuđene
    // kartice (Best/Comfort/Budget) STVARNO traže ono što je korisnik
    // izabrao (tip leta, zvezdice hotela, tip auta, broj aktivnosti), a
    // ne generišu nasumičan sadržaj po tier-u nezavisno od tih izbora.
    // Tier i dalje menja cenu/kvalitet detalja (npr. koji je hotel u istoj
    // kategoriji zvezdica), ali ne i samu kategoriju koju je korisnik tražio.
    flightPref: builderState.flightPref,
    airlineName: builderState.airlineName,
    hotelStars: builderState.hotelStars,
    prioritizeRating: builderState.prioritizeRating,
    prioritizeLocation: builderState.prioritizeLocation,
    carPref: builderState.carPref !== 'none' ? builderState.carPref : 'small',
    activityCount: builderState.activityCount > 0 ? builderState.activityCount : 1,
  };

  const results = document.getElementById('results');
  openResultsSheet();
  document.getElementById('resultsHead').innerHTML = '';
  const rb = document.getElementById('resultsBody');
  rb.innerHTML = skeletonResultsHtml('Pripremamo tvoj plan…');
  rb.classList.remove('rb-hidden');
  rb.classList.add('rb-reveal');
  if (shouldScroll && !isMobileResults()) results.scrollIntoView({behavior:'smooth', block:'start'});

  bumpSearchStat(dest);
  logAirportDbMiss(originCode, 'origin');
  logAirportDbMiss(dest, 'dest');

  setTimeout(()=>{
    if (seq !== window._searchSeq) return; // u međuvremenu pokrenuta novija pretraga
    renderResults(dest, from, to, nights, days, adults, flags, originCode, autoReveal, seq);
  }, 700);
}

document.getElementById('searchForm').addEventListener('submit', function(e){
  e.preventDefault();
  // Ista provera kao za pravu pretragu (runSearch) — bez ovoga je moguće
  // otvoriti "Prilagodi svoj plan" i dobiti pun paket/3 plana a da polazak,
  // datumi ili broj putnika nikad nisu upisani/potvrđeni (pravi bag: video
  // se npr. sa "Blagaj" bez ijednog drugog polja i bez izabranog leta).
  const check = validateSearchInputs();
  if (!check.ok){ showToast(check.msg); focusSearchField(check.focus); return; }
  trackFunnelEvent('search_submit', {
    destination: document.getElementById('dest').value.trim() || 'Atina'
  });
  openStartPrefsModal();
});

/* ==========================================================
   BUILD-YOUR-OWN ("Napravi svoj aranžman")
========================================================== */
// Jedini izvor default vrednosti — čuvamo posebno od builderState (koji se
// mutira tokom rada) da bismo mogli da RESETUJEMO na siguran default pre
// učitavanja sačuvanog aranžmana (vidi loadSavedTrip). Bez ovog reseta,
// polje koje nedostaje u starom sačuvanom zapisu (npr. jer je dodato tek
// kasnije u builderState) ne bi dobilo fallback — ostalo bi kakvo je bilo
// pre poziva (stanje iz prethodno učitanog aranžmana ili undefined), što bi
// computeCustomPackage moglo da pretvori u NaN cene.
const BUILDER_ADDON_RATES = { insurance: 18, esim: 9, putarina: 18, transferi: 25, touristTax: 2 }; // insurance/esim/transferi po osobi, putarina paušalno, touristTax po osobi po noći
const BUILDER_DEFAULTS = {
  includeFlight: true,
  flightPref: 'direct',
  airlineName: '',
  includeHotel: true,
  hotelStars: 4,
  prioritizeRating: false,
  prioritizeLocation: false,
  carPref: 'none',
  activityCount: 0,
  insurance: false,
  esim: false,
  putarina: false,
  transferi: false,
  touristTax: false,
  budget: null
};
const builderState = Object.assign({}, BUILDER_DEFAULTS);

// Originalno mesto kartice "Tvoj izlet" (#builderSummary) unutar samostalne
// "Kontrola sadržaja" sekcije — čuvamo ga da bismo karticu mogli privremeno
// da premestimo u "Prilagodi svoj plan" modal (klik na Start) i posle vratimo
// tačno gde je bila, bez dupliranja cele te (prilično razgranate) logike.
const BS_ORIGINAL_PARENT = document.getElementById('builderSummary').parentElement;
const BS_ORIGINAL_NEXT = document.getElementById('builderSummary').nextElementSibling;
function restoreBuilderSummaryPosition(){
  const bs = document.getElementById('builderSummary');
  if (!bs || bs.parentElement === BS_ORIGINAL_PARENT) return;
  if (BS_ORIGINAL_NEXT && BS_ORIGINAL_NEXT.parentElement === BS_ORIGINAL_PARENT){
    BS_ORIGINAL_PARENT.insertBefore(bs, BS_ORIGINAL_NEXT);
  } else {
    BS_ORIGINAL_PARENT.appendChild(bs);
  }
  // Vrati "Nastavi" dugme (skriveno dok je kartica bila unutar modala —
  // vidi #spMakeBtn) sad kad je kartica opet na svom originalnom mestu.
  document.getElementById('builderContinueBtn').style.display = '';
}

// Builder panel — zatvoren po default-u (vidi style="display:none" na
// #builderPanel u HTML-u). Jedini ulaz je sada plan-kartica (klik na Start),
// pošto je zasebna teaser kartica "Želiš više kontrole?" uklonjena sa zida
// (početne strane) da se ne dupira sa istim pozivom na akciju.
function openControlPanel(){
  document.getElementById('builderPanel').style.display = 'grid';
}
function closeControlPanel(){
  document.getElementById('builderPanel').style.display = 'none';
}
document.getElementById('builderCloseBtn').addEventListener('click', ()=>{
  closeControlPanel();
  document.getElementById('builderPanel').scrollIntoView({behavior:'smooth', block:'start'});
});

function builderCtx(){
  const dest = document.getElementById('dest').value.trim() || 'Atina';
  const originCode = document.getElementById('origin').value.trim();
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  const adults = Number(document.getElementById('adults').value) || 2;
  const nights = nightsBetween(from, to);
  return {dest, originCode, from, to, nights, days:nights, adults};
}

function computeCustomPackage(sel, ctx){
  // Seed zavisi SAMO od izbora koji stvarno utiču na SASTAV aranžmana
  // (let, hotel, auto, aktivnosti) — budžet je isključen iz istog razloga
  // kao i pre (samo prag za poređenje, ne treba da menja generisane cene).
  // airlineName je TAKOĐE namerno isključen: to je slobodan tekst koji
  // korisnik kuca slovo po slovo, i kad bi bio deo seed-a, svaki novi
  // karakter bi generisao potpuno nov seed → hotel/auto/aktivnosti cene
  // bi "treperele" i menjale se pri svakom tasteru, iako se ništa
  // semantički bitno za njih nije promenilo. Ime avio-kompanije i dalje
  // utiče na PRIKAZ leta (flightName ispod), samo ne na seed generatora.
  const seedSel = {
    flightPref: sel.flightPref,
    hotelStars: sel.hotelStars,
    prioritizeRating: sel.prioritizeRating,
    prioritizeLocation: sel.prioritizeLocation,
    carPref: sel.carPref,
    activityCount: sel.activityCount
  };
  const seedStr = ctx.dest.toLowerCase()+'|'+JSON.stringify(seedSel)+'|'+ctx.nights+'|'+ctx.adults;
  const rng = seededRandom(hashSeed(seedStr));

  // --- Flight ---
  const flightBase = 55 + rng()*130;
  const flightMult = FLIGHT_PREF_PRICE_MULT[sel.flightPref];
  const flightPrice = Math.round(flightBase * flightMult * ctx.adults * flightRouteMult(ctx.originCode, ctx.dest));
  // pickCarrierName zove rng() u IDENTIČNOM obrascu kao na kartičnom putu
  // (fetchFlights) — tačno jednom, i samo kad nije tražena konkretna
  // kompanija. Ne prosleđujemo forceCarrier ovde (builder nema tier-ove).
  const builderArrival = realArrivalAirportFor(ctx.dest);
  // NAPOMENA: ako je flightPref==='airline' i ime je uneto, pickCarrierName
  // NE zove rng() (isto kao pre) — to je namerno, jer inače bi svaki prelaz
  // prazno/popunjeno polje pomerio redosled sledećih rng() poziva (hotel,
  // auto...) za jedno mesto. Pošto je ova grana stabilna za SVAKI neprazan
  // unos (bilo koje slovo znači "preskoči"), cene se ne pomeraju dok
  // korisnik kuca — samo pri prvom i poslednjem karakteru (prazno ↔ nije
  // prazno), što je prihvatljivo i retko.
  const carrierName = pickCarrierName(rng, {flightPref: sel.flightPref, airlineName: sel.airlineName});
  const builderDeparture = realDepartureAirportFor(ctx.originCode);
  const flightName = carrierName + (builderDeparture ? ' ' + builderDeparture : '') + ' → ' + builderArrival;
  // Ista funkcija kao na kartičnom putu — pre deljenja, ovde NIJE bilo ni
  // upozorenja za ograničenu avio-mrežu ni napomene o ceni za više putnika,
  // iako let ovde isto zavisi od broja putnika (vidi flightPrice gore).
  const flightSub = flightSubText({
    flightPref: sel.flightPref, arrival: builderArrival, destRaw: ctx.dest,
    adults: ctx.adults, limitedNetwork: isLimitedNetworkOrigin(ctx.originCode)
  });
  assertFlightSubConsistency(sel.flightPref || 'direct', flightSub, 'computeCustomPackage');

  // --- Hotel ---
  const hotelBasePerNight = HOTEL_STAR_BASE_PRICE[sel.hotelStars] + rng()*22;
  let hotelMult = 1;
  if (sel.prioritizeRating) hotelMult += 0.10;
  if (sel.prioritizeLocation) hotelMult += 0.07;
  const hotelPrice = Math.round(hotelBasePerNight * hotelMult * ctx.nights * Math.ceil(ctx.adults/2));
  let hotelRating = HOTEL_STAR_RATING_BASE[sel.hotelStars] + rng()*0.25;
  if (sel.prioritizeRating) hotelRating += 0.25;
  hotelRating = Math.min(9.9, hotelRating);

  // --- Car ---
  const carPerDay = CAR_TYPE_BASE_PRICE[sel.carPref] + (sel.carPref==='none'?0:rng()*11);
  const carPrice = Math.round(carPerDay * ctx.days);

  // --- Activities ---
  const perActivity = 21 + rng()*17;
  const activityPrice = Math.round(perActivity * sel.activityCount);

  // --- Gorivo i putarine (samo ako je auto uključen) ---
  const carExtras = sel.carPref === 'none' ? 0 : Math.round(18 + rng()*20);

  // --- Osiguranje i eSIM (dodaci, cena po osobi) ---
  // NAPOMENA: namerno NE koristi rng() — ovo su uključi/isključi dodaci
  // (vidi .toggle-chip[data-toggle="insurance"/"esim"]), i pošto nisu deo
  // seedSel, uzimanje rng() ovde bi pomerilo redosled poziva za sve
  // random vrednosti iznad svaki put kad se dodatak uključi/isključi —
  // isti problem opisan gore za airlineName. Fiksna cena po osobi rešava
  // to i drži ostatak paketa stabilnim.
  const insuranceCost = sel.insurance ? BUILDER_ADDON_RATES.insurance * ctx.adults : 0;
  const esimCost = sel.esim ? BUILDER_ADDON_RATES.esim * ctx.adults : 0;
  // Putarine (paušalna procena za celu rutu, nezavisno od rent-a-cara —
  // relevantno i kad se putuje sopstvenim autom ili transferom) i
  // transferi (aerodrom–smeštaj, cena po osobi), isti obrazac kao gore.
  const putarinaCost = sel.putarina ? BUILDER_ADDON_RATES.putarina : 0;
  const transferiCost = sel.transferi ? BUILDER_ADDON_RATES.transferi * ctx.adults : 0;
  // Boravišna taksa (city/tourist tax) — po osobi, po noći; naplaćuje se na
  // licu mesta u hotelu, van same cene smeštaja, zato je poseban dodatak.
  const touristTaxCost = sel.touristTax ? Math.round(BUILDER_ADDON_RATES.touristTax * ctx.adults * ctx.nights) : 0;

  // Isti dnevni tržišni faktor kao u gotovim ponudama (vidi marketFactor) —
  // primenjen na sve stavke osim osiguranja/eSIM-a, koji su fiksni dodaci
  // po osobi, ne tržišna cena koja fluktuira.
  const factor = marketFactor(ctx.dest, todayStr());
  const season = seasonFactor(ctx.dest, ctx.from); // po datumu polaska (vidi seasonFactor)
  const flightPriceF = sel.includeFlight ? Math.round(flightPrice * factor * season) : 0;
  const hotelPriceF = sel.includeHotel ? Math.round(hotelPrice * factor * season) : 0;
  const carPriceF = Math.round(carPrice * factor * season);
  const activityPriceF = Math.round(activityPrice * factor);
  const carExtrasF = Math.round(carExtras * factor);

  const total = flightPriceF + hotelPriceF + carPriceF + activityPriceF + carExtrasF + insuranceCost + esimCost + putarinaCost + transferiCost + touristTaxCost;

  return {
    flight: {price:flightPriceF, name:flightName, sub:flightSub},
    hotel:  {price:hotelPriceF, rating:Number(hotelRating.toFixed(1)), stars:sel.hotelStars},
    car:    {price:carPriceF, pref:sel.carPref},
    activity: {price:activityPriceF, count:sel.activityCount},
    carExtras: {price:carExtrasF},
    insuranceCost, esimCost, putarinaCost, transferiCost, touristTaxCost,
    total
  };
}

function renderBuilder(){
  const ctx = builderCtx();
  const pkg = computeCustomPackage(builderState, ctx);

  const lines = document.getElementById('builderLines');
  const ICONS = {
    flight:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M2 16l6-2 4.5-7 2 .6-2.5 6.9 5 1.5 3-2.4 1.6.5-2 3-5.5 1-1 2.6-1.8-.5.7-2.8-5 1.2-1-1.7z"/></svg>',
    hotel:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 21V6l7-3 7 3v15M3 21h18M9 21v-6h4v6"/></svg>',
    car:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 16v-4l2-5h12l2 5v4M4 16h16M6 16v2.5a1 1 0 001 1h1a1 1 0 001-1V16M15 16v2.5a1 1 0 001 1h1a1 1 0 001-1V16M6 12h12"/></svg>',
    activity:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/></svg>'
  };
  const badge = (kind) => '<span class="lic ic-' + kind + '">' + ICONS[kind] + '</span>';
  const rows = [];
  if (builderState.includeFlight) rows.push([badge('flight'), t('builder_flight_label'), pkg.flight.price]);
  if (builderState.includeHotel) rows.push([badge('hotel'), 'Hotel', pkg.hotel.price]);
  if (builderState.carPref !== 'none') rows.push([badge('car'), 'Auto', pkg.car.price]);
  if (builderState.activityCount > 0) rows.push([badge('activity'), t('builder_activities_label'), pkg.activity.price]);
  if (pkg.carExtras.price > 0) rows.push(['⛽', 'Gorivo i putarine (auto)', pkg.carExtras.price]);
  if (builderState.insurance) rows.push(['🛡️', t('f_insurance_name'), pkg.insuranceCost]);
  if (builderState.putarina) rows.push(['🛣️', t('f_tolls_name'), pkg.putarinaCost]);
  if (builderState.touristTax) rows.push(['🏛️', t('f_tax_name'), pkg.touristTaxCost]);
  if (builderState.esim) rows.push(['📶', 'eSIM', pkg.esimCost]);
  if (builderState.transferi) rows.push(['🚐', t('f_transfer_name'), pkg.transferiCost]);

  lines.innerHTML = rows.map(([ic,name,price]) => `
    <div class="builder-line">
      <span class="lname">${ic} ${name}</span>
      <span class="lval tabular">${fmtEUR(price)}</span>
    </div>`).join('');

  document.getElementById('builderTotal').textContent = fmtEUR(pkg.total);
  document.getElementById('builderTotalSub').textContent =
    'ukupno za ' + ctx.adults + ' osob' + (ctx.adults===1?'u':'e') + ' / ' + ctx.nights + ' dana';

  const statusEl = document.getElementById('builderBudgetStatus');
  if (builderState.budget) {
    statusEl.classList.add('show');
    if (pkg.total <= builderState.budget) {
      statusEl.className = 'builder-budget-status show ok';
      statusEl.innerHTML = '✓ U okviru budžeta od ' + fmtEUR(builderState.budget);
    } else {
      statusEl.className = 'builder-budget-status show over';
      statusEl.innerHTML = '⚠ ' + fmtEUR(pkg.total - builderState.budget) + ' preko budžeta od ' + fmtEUR(builderState.budget);
    }
  } else {
    statusEl.className = 'builder-budget-status';
    statusEl.innerHTML = '';
  }

  document.getElementById('optimizeResult').style.display = 'none';
  window._lastBuilderPkg = pkg;

  // --- Rezervacija po stavci (isti affiliate linkovi kao u gotovim ponudama) ---
  const linkCtx = Object.assign({}, ctx, {
    from: document.getElementById('dateFrom').value,
    to: document.getElementById('dateTo').value,
    flightPref: builderState.flightPref,
    hotelStars: builderState.hotelStars,
    prioritizeRating: builderState.prioritizeRating,
    prioritizeLocation: builderState.prioritizeLocation,
    carPref: builderState.carPref
  });
  const bookBtns = [];
  if (builderState.includeFlight){
    bookBtns.push(`<span class="bbl-item"><a class="item-btn flight" href="${escapeHtml(buildAffiliateLink('flight', linkCtx))}" target="_blank" rel="noopener sponsored" data-kind="flight" data-price="${pkg.flight.price}" data-url="${escapeHtml(buildAffiliateLink('flight', linkCtx))}" data-dest="${escapeHtml(linkCtx.dest||'')}" data-tier="builder" onclick="bookItem(this)">✈️ KAYAK</a>${affBadgeHtml()}</span>`);
  }
  if (builderState.includeHotel){
    bookBtns.push(`<span class="bbl-item"><a class="item-btn hotel" href="${escapeHtml(buildAffiliateLink('hotel', linkCtx))}" target="_blank" rel="noopener sponsored" data-kind="hotel" data-price="${pkg.hotel.price}" data-url="${escapeHtml(buildAffiliateLink('hotel', linkCtx))}" data-dest="${escapeHtml(linkCtx.dest||'')}" data-tier="builder" onclick="bookItem(this)">🏨 Booking.com</a>${affBadgeHtml()}</span>`);
  }
  if (builderState.carPref !== 'none'){
    bookBtns.push(`<span class="bbl-item"><a class="item-btn car" href="${escapeHtml(buildAffiliateLink('car', linkCtx))}" target="_blank" rel="noopener sponsored" data-kind="car" data-price="${pkg.car.price}" data-url="${escapeHtml(buildAffiliateLink('car', linkCtx))}" data-dest="${escapeHtml(linkCtx.dest||'')}" data-tier="builder" onclick="bookItem(this)">🚗 Booking.com</a>${affBadgeHtml()}</span>`);
  }
  if (builderState.activityCount > 0){
    bookBtns.push(`<span class="bbl-item"><a class="item-btn" style="background:var(--aqua);" href="${escapeHtml(buildAffiliateLink('activity', linkCtx))}" target="_blank" rel="noopener sponsored" data-kind="activity" data-price="${pkg.activity.price}" data-url="${escapeHtml(buildAffiliateLink('activity', linkCtx))}" data-dest="${escapeHtml(linkCtx.dest||'')}" data-tier="builder" onclick="bookItem(this)">🎟️ Viator</a>${affBadgeHtml()}</span>`);
  }
  document.getElementById('builderBookLinks').innerHTML =
    '<div class="bbl-label">Rezerviši svaku stavku direktno kod partnera:</div>' +
    '<div class="builder-book-row">' + bookBtns.join('') + '</div>' +
    '<p class="disclaimer" style="margin-top:10px;">' + escapeHtml(affDisc()) + '</p>';
}

function wireChipGroup(groupName, onChange){
  document.querySelectorAll('.chip-row[data-group="'+groupName+'"] .chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      document.querySelectorAll('.chip-row[data-group="'+groupName+'"] .chip').forEach(c=>c.classList.remove('on'));
      chip.classList.add('on');
      onChange(chip.dataset.value);
    });
  });
}

// ---- Upitnik (#builderPanel) — čekboks/radio povezivanje, bez chip
// dugmadi. Svaki .q-row-head checkbox otvara/zatvara svoj .q-sub (klasa
// .checked) i upisuje include-flag u builderState.
function qRow(name){ return document.querySelector('.q-row[data-row="'+name+'"]'); }
function qSyncRow(name, isOpen){ const row = qRow(name); if (row) row.classList.toggle('checked', isOpen); }

/* ==========================================================
   JEDINSTVENO STANJE FORME — builderState + renderFormUI()
   ----------------------------------------------------------
   builderState je JEDINI izvor istine — i za samostalnu "Kontrola
   sadržaja" sekciju (#builderPanel) i za "Prilagodi svoj plan" modal
   (#startPrefsModal, otvara se klikom na Start). Ranije je modal imao
   svoju KOPIJU stanja (startPrefs) koju je trebalo ručno prepisivati
   u builderState i nazad (dve sync funkcije) — svako novo polje se
   moralo ručno dodati na ~4 mesta (default, listener u panelu,
   listener u modalu, OBE sync funkcije). To je tačan obrazac greške
   koju je trebalo ispraviti.

   Sad postoji SAMO builderState + JEDNA renderFormUI() koja iscrtava
   OBA UI-ja iz njega + JEDNA wireFormFields() koja kači listener na
   odgovarajući element u OBA UI-ja (kad element postoji — letovi/
   hotel toggle, osiguranje, eSIM i transferi postoje samo u panelu,
   ne i u brzom modalu; modal id-jevi su isti kao panelovi, samo sa
   "sp" prefiksom). Za novo prosto polje (checkbox/radio): dodaj jedan
   unos u FORM_FIELDS. Auto i aktivnosti imaju poseban obrazac
   (čekboks uključi/isključi + pamćenje poslednje vrednosti), pa su
   ožičeni preko setupToggleRadioField / setupToggleCountField —
   svaki JEDNOM, ne duplirano za panel i modal.
========================================================== */
function setChkVal(id, val){ const el = document.getElementById(id); if (el) el.checked = !!val; }
function setRadioVal(name, val){ document.querySelectorAll('input[name="'+name+'"]').forEach(r=>{ r.checked = (String(r.value) === String(val)); }); }

// Jednostavna polja: jedan checkbox/radio u panelu, po volji i isti tip
// u modalu (modal:null → polje postoji samo u panelu, ne i u brzom modalu).
const FORM_FIELDS = [
  { key:'includeFlight',       type:'checkbox', panel:'flightInclude',         modal:null,                    row:'flight' },
  { key:'includeHotel',        type:'checkbox', panel:'hotelInclude',          modal:null,                    row:'hotel' },
  { key:'hotelStars',          type:'radio',    panel:'hotelStarsRadio',       modal:'spHotelStarsRadio',     numeric:true },
  { key:'prioritizeRating',    type:'checkbox', panel:'prioritizeRatingChk',   modal:'spPrioritizeRatingChk' },
  { key:'prioritizeLocation',  type:'checkbox', panel:'prioritizeLocationChk', modal:'spPrioritizeLocationChk' },
  { key:'insurance',           type:'checkbox', panel:'insuranceChk',          modal:null },
  { key:'putarina',            type:'checkbox', panel:'putarinaChk',           modal:'spPutarinaChk' },
  { key:'touristTax',          type:'checkbox', panel:'touristTaxChk',         modal:'spTouristTaxChk' },
  { key:'esim',                type:'checkbox', panel:'esimChk',               modal:null },
  { key:'transferi',           type:'checkbox', panel:'transferiChk',          modal:null }
];
function renderSimpleField(f){
  const val = builderState[f.key];
  if (f.type === 'checkbox'){
    setChkVal(f.panel, val);
    if (f.modal) setChkVal(f.modal, val);
    if (f.row) qSyncRow(f.row, !!val);
  } else {
    setRadioVal(f.panel, val);
    if (f.modal) setRadioVal(f.modal, val);
  }
}
function wireSimpleField(f){
  const onChange = (raw) => {
    builderState[f.key] = f.numeric ? Number(raw) : raw;
    renderFormUI();
    renderBuilder();
  };
  if (f.type === 'checkbox'){
    [f.panel, f.modal].filter(Boolean).forEach(id=>{
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', ()=> onChange(el.checked));
    });
  } else {
    [f.panel, f.modal].filter(Boolean).forEach(name=>{
      document.querySelectorAll('input[name="'+name+'"]').forEach(r=>{
        r.addEventListener('change', ()=> onChange(r.value));
      });
    });
  }
}

// Let: radio grupa + tekstualno polje za ime kompanije (prikazano samo
// kad je izabrano "Određena kompanija") — u panelu i u modalu odjednom.
const FLIGHT_PREF = { panelRadio:'flightPrefRadio', modalRadio:'spFlightPrefRadio', panelText:'airlineName', modalText:'spAirlineName' };
function renderFlightPrefField(){
  setRadioVal(FLIGHT_PREF.panelRadio, builderState.flightPref);
  setRadioVal(FLIGHT_PREF.modalRadio, builderState.flightPref);
  const showAirline = builderState.flightPref === 'airline';
  [FLIGHT_PREF.panelText, FLIGHT_PREF.modalText].forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = showAirline ? 'block' : 'none';
    if (document.activeElement !== el) el.value = builderState.airlineName || '';
  });
}
function wireFlightPrefField(){
  [FLIGHT_PREF.panelRadio, FLIGHT_PREF.modalRadio].forEach(name=>{
    document.querySelectorAll('input[name="'+name+'"]').forEach(r=>{
      r.addEventListener('change', ()=>{
        builderState.flightPref = r.value;
        renderFormUI();
        renderBuilder();
      });
    });
  });
  [FLIGHT_PREF.panelText, FLIGHT_PREF.modalText].forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', ()=>{
      builderState.airlineName = el.value.trim();
      renderBuilder();
    });
  });
}

// Rent a car / aktivnosti: čekboks uključi/isključi (mapira se na
// carPref==='none' odn. activityCount===0) + radio/broj za detalje.
// Pamti se JEDNA poslednja "uključena" vrednost — ponovno čekiranje u
// BILO KOM od dva UI-ja vraća istu vrednost, ne dve odvojene (ranije:
// _lastCarPref za panel, _spLastCarPref za modal, ručno usklađivane).
function setupToggleRadioField({ key, offValue, defaultOnValue, panelToggleId, modalToggleId, panelRow, modalRow, panelRadioName, modalRadioName }){
  let lastOnValue = builderState[key] !== offValue ? builderState[key] : defaultOnValue;
  function setOn(isOn, radioVal){
    builderState[key] = isOn ? (radioVal || lastOnValue) : offValue;
    if (builderState[key] !== offValue) lastOnValue = builderState[key];
    renderFormUI();
    renderBuilder();
  }
  [panelToggleId, modalToggleId].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', ()=> setOn(el.checked));
  });
  [panelRadioName, modalRadioName].forEach(name=>{
    document.querySelectorAll('input[name="'+name+'"]').forEach(r=>{
      r.addEventListener('change', ()=> setOn(true, r.value));
    });
  });
  return function render(){
    const isOn = builderState[key] !== offValue;
    setChkVal(panelToggleId, isOn);
    setChkVal(modalToggleId, isOn);
    qSyncRow(panelRow, isOn);
    qSyncRow(modalRow, isOn);
    setRadioVal(panelRadioName, isOn ? builderState[key] : lastOnValue);
    setRadioVal(modalRadioName, isOn ? builderState[key] : lastOnValue);
  };
}
function setupToggleCountField({ key, defaultOnValue, min, max, panelToggleId, modalToggleId, panelRow, modalRow, panelInputId, modalInputId }){
  let lastOnValue = builderState[key] > 0 ? builderState[key] : defaultOnValue;
  function setOn(isOn){
    builderState[key] = isOn ? lastOnValue : 0;
    renderFormUI();
    renderBuilder();
  }
  [panelToggleId, modalToggleId].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', ()=> setOn(el.checked));
  });
  [panelInputId, modalInputId].forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('focus', ()=> el.select());
    el.addEventListener('input', ()=>{
      const raw = el.value;
      const n = raw === '' ? 0 : Math.max(min, Math.min(max, Math.floor(Number(raw)) || 0));
      builderState[key] = n;
      if (n > 0) lastOnValue = n;
      renderFormUI();
      renderBuilder();
    });
    el.addEventListener('blur', renderFormUI);
  });
  return function render(){
    const isOn = builderState[key] > 0;
    setChkVal(panelToggleId, isOn);
    setChkVal(modalToggleId, isOn);
    qSyncRow(panelRow, isOn);
    qSyncRow(modalRow, isOn);
    [panelInputId, modalInputId].forEach(id=>{
      const el = document.getElementById(id);
      if (el && document.activeElement !== el) el.value = builderState[key];
    });
  };
}

// Gornja granica je namerno velikodušna (niko realno ne planira izlet
// preko ovoga), samo sprečava apsurdne unose tipa "1e10" ili slučajno
// dodat nepotreban nule. Budžet mora biti ceo broj > 0, ne negativan
// i ne decimalan — sve ostalo se ili odbacuje (null) ili zaokružuje/seče.
// Isto polje ideje u panelu i modalu — pisano jednom, primenjeno na oba.
const MAX_BUDGET = 50000;
function clampBudgetInput(el){
  const raw = el.value;
  if (!raw) { builderState.budget = null; renderBuilder(); return; }
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n <= 0) {
    // Prazno/nevalidno/negativno dok korisnik još kuca (npr. samo "-") —
    // ne diramo polje, samo privremeno ignorišemo budžet u proračunu.
    builderState.budget = null;
  } else {
    const clamped = Math.min(n, MAX_BUDGET);
    // Ako je uneta decimala ili broj veći od granice, ispravi i prikaz
    // u polju da korisnik vidi tačno koja vrednost se zapravo koristi.
    if (String(clamped) !== raw) el.value = clamped;
    builderState.budget = clamped;
  }
  renderBuilder();
}
function wireBudgetField(){
  ['budgetInput','spBudgetInput'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', ()=> clampBudgetInput(el));
  });
}
function renderBudgetField(){
  ['budgetInput','spBudgetInput'].forEach(id=>{
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = builderState.budget || '';
  });
}

let _renderCarField = null;
let _renderActivitiesField = null;

// Kači SVE listenere (panel + modal) odjednom. Poziva se JEDNOM, pri učitavanju.
function wireFormFields(){
  FORM_FIELDS.forEach(wireSimpleField);
  wireFlightPrefField();
  wireBudgetField();
  _renderCarField = setupToggleRadioField({
    key:'carPref', offValue:'none', defaultOnValue:'small',
    panelToggleId:'carInclude', modalToggleId:'spCarInclude',
    panelRow:'car', modalRow:'sp-car',
    panelRadioName:'carPrefRadio', modalRadioName:'spCarPrefRadio'
  });
  _renderActivitiesField = setupToggleCountField({
    key:'activityCount', defaultOnValue:2, min:0, max:10,
    panelToggleId:'activitiesInclude', modalToggleId:'spActivitiesInclude',
    panelRow:'activities', modalRow:'sp-activities',
    panelInputId:'actCountInput', modalInputId:'spActCountInput'
  });
}
// Iscrtava OBA UI-ja (panel i modal) iz builderState. Poziva se posle
// svake izmene stanja (iz bilo kog UI-ja), i posle svake spoljašnje
// izmene builderState (učitavanje sačuvanog izleta, primena optimizacije).
function renderFormUI(){
  FORM_FIELDS.forEach(renderSimpleField);
  renderFlightPrefField();
  renderBudgetField();
  if (_renderCarField) _renderCarField();
  if (_renderActivitiesField) _renderActivitiesField();
}
wireFormFields();
renderFormUI();

// Recalculate live if destination/dates/passengers change up in the ticket
['dest','dateFrom','dateTo','adults'].forEach(id=>{
  document.getElementById(id).addEventListener('input', renderBuilder);
  document.getElementById(id).addEventListener('change', renderBuilder);
});

/* ---- Optimizacija: proba SVE dostupne poluge (hotel, auto, aktivnosti),
   ne samo hotel — i predlaže onu sa najvećom uštedom. "Već optimalno" se
   sada prikazuje samo ako ni jedna poluga stvarno ne postoji ili ni jedna
   ne donosi uštedu, ne čim prva proverena poluga (hotel) padne na 3★. ---- */
document.getElementById('optimizeBtn').addEventListener('click', ()=>{
  const ctx = builderCtx();
  const current = window._lastBuilderPkg || computeCustomPackage(builderState, ctx);
  const candidates = [];

  // Poluga 1: hotel jednu zvezdicu niže.
  if (builderState.hotelStars > 3) {
    const testSel = Object.assign({}, builderState, {hotelStars: builderState.hotelStars - 1});
    const alt = computeCustomPackage(testSel, ctx);
    candidates.push({
      testSel,
      savings: current.total - alt.total,
      message: `Ako promeniš hotel na ${testSel.hotelStars}★, zadržavaš skoro istu lokaciju uz malo nižu ocenu (${alt.hotel.rating} umesto ${current.hotel.rating}).`,
      toastMsg: 'hotel promenjen na ' + testSel.hotelStars + '★.',
      apply(){
        renderFormUI();
      }
    });
  }

  // Poluga 2: manji auto (SUV → mali auto → bez auta).
  const carDowngrade = {suv:'small', small:'none'}[builderState.carPref];
  if (carDowngrade) {
    const testSel = Object.assign({}, builderState, {carPref: carDowngrade});
    const alt = computeCustomPackage(testSel, ctx);
    candidates.push({
      testSel,
      savings: current.total - alt.total,
      message: carDowngrade === 'none'
        ? 'Ako odustaneš od iznajmljivanja auta, gubiš deo fleksibilnosti u kretanju, ali štediš i na gorivu i putarinama.'
        : 'Ako uzmeš manji auto umesto SUV-a, uštedu dobijaš uz nešto manje prtljažnog prostora.',
      toastMsg: 'auto promenjen na ' + (carDowngrade === 'none' ? 'bez auta' : 'mali auto') + '.',
      apply(){
        renderFormUI();
      }
    });
  }

  // Poluga 3: jedna aktivnost manje.
  if (builderState.activityCount > 0) {
    const testSel = Object.assign({}, builderState, {activityCount: builderState.activityCount - 1});
    const alt = computeCustomPackage(testSel, ctx);
    candidates.push({
      testSel,
      savings: current.total - alt.total,
      message: `Ako smanjiš broj aktivnosti na ${testSel.activityCount}, ostaje ti i dalje dovoljno vremena za slobodno istraživanje.`,
      toastMsg: 'broj aktivnosti smanjen na ' + testSel.activityCount + '.',
      apply(){
        renderFormUI();
      }
    });
  }

  const box = document.getElementById('optimizeResult');
  box.style.display = 'block';

  const viable = candidates.filter(c => c.savings > 0).sort((a,b) => b.savings - a.savings);
  if (!viable.length) {
    box.innerHTML = candidates.length
      ? '<span class="save">Izlet je već optimalan</span>Proverili smo hotel, auto i broj aktivnosti — trenutna kombinacija je već najjeftinija za odabrane kriterijume.'
      : '<span class="save">Izlet je već optimalan</span>Već si na najnižim opcijama za sve stavke — nema očiglednog mesta za uštedu bez gubitka udobnosti.';
    return;
  }

  const best = viable[0];
  box.innerHTML = `
    <span class="save">Možeš uštedeti ${fmtEUR(best.savings)}</span>
    ${best.message}
    <button type="button" class="optimize-apply" id="applyOptimize">Primeni ovu izmenu</button>
  `;
  document.getElementById('applyOptimize').addEventListener('click', ()=>{
    Object.assign(builderState, best.testSel);
    best.apply();
    renderBuilder();
    showToast('Izlet ažuriran — ' + best.toastMsg);
  });
});

document.getElementById('makeBuilderBtn').addEventListener('click', ()=>{
  const destInput = document.getElementById('dest');
  if (!destInput.value.trim()){
    showToast('Unesi destinaciju da bismo napravili izlet.');
    destInput.focus();
    destInput.scrollIntoView({behavior:'smooth', block:'center'});
    return;
  }
  renderBuilder();
  document.getElementById('builderSummary').style.display = 'block';
  document.getElementById('builderPlaceholder').style.display = 'none';
  document.getElementById('builderBookLinks').style.display = 'none';
});

// "Nastavi" — otkriva linkove za rezervaciju kod partnera (kayak/booking/
// itd.), koji su već izračunati u renderBuilder() ali ostaju sakriveni dok
// korisnik ne pregleda cenu/optimizaciju i svesno odluči da nastavi.
document.getElementById('builderContinueBtn').addEventListener('click', ()=>{
  const links = document.getElementById('builderBookLinks');
  links.style.display = 'block';
  requestAnimationFrame(() => {
    links.scrollIntoView({behavior:'smooth', block:'center'});
  });
});

/* ==========================================================
   DESTINATION SPOTLIGHT — referentni ekran za Atinu
========================================================== */
(function initDestinationSpotlight(){
  const planBtn = document.getElementById('destinationPlansBtn');
  const buildBtn = document.getElementById('destinationBuildBtn');
  const tabs = document.querySelectorAll('[data-destination-tab]');

  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.toggle('is-active', t === tab));
  }));

  // "3 plana za tvoj grad" su skriveni dok korisnik ne klikne na dugme.
  // Sve ostale funkcije koje vode na planove koriste window.SKLOPI_showDestPlans().
  // OVO je bio pravi propust: dugme je samo otkrivalo već izrađenu sekciju
  // bez ikakve provere, pa je moglo da se klikne (i prikaže pun predlog) i
  // kad polazak/datumi/putnici u formi iznad nisu ni dirnuti — isti bag koji
  // je popravljen za searchForm/spMakeBtn, ovde ostao nepovezan jer je ovo
  // zaseban ulaz u iste planove.
  function showDestPlans(){
    const check = validateSearchInputs();
    if (!check.ok){ showToast(check.msg); focusSearchField(check.focus); return; }
    const plans = document.getElementById('destinationPlans');
    if (!plans) return;
    plans.hidden = false;
    planBtn?.setAttribute('aria-expanded', 'true');
    plans.scrollIntoView({behavior:'smooth', block:'start'});
  }
  window.SKLOPI_showDestPlans = showDestPlans;
  planBtn?.addEventListener('click', showDestPlans);

  /* ---- Fiksni planovi po gradu (podaci: dest-plans.js) ----
     Spotlight prati izabranu destinaciju: klik na karticu u "Popularne destinacije"
     ili tačan naziv grada u polju Destinacija. Grad koji nije u dest-plans.js ne menja
     spotlight. Tri plana dolaze iz šablona ("city"/"sea"); cena je fiksna (c.fixed) ili
     se računa iz builder-a za trenutni polazak/datume/putnike. */
  const CFG = window.SKLOPI_DEST_PLANS || {def:'Atina', arch:{}, cities:{}};
  const $ = id => document.getElementById(id);
  const qs = s => document.querySelector(s);
  const ph = (id, w) => 'https://images.unsplash.com/photo-' + id + '?auto=format&fit=crop&w=' + w + '&q=82';
  const GENERIC_PHOTO = ph('1467269204594-9661b134dd2b', 1200);
  let curCity = CFG.def, curEntry = CFG.cities[CFG.def], curPlans = [], shownCity = null;

  function cityKey(name){
    const n = normalizeSr(String(name || '').trim());
    return n ? (Object.keys(CFG.cities).find(k => normalizeSr(k) === n) || null) : null;
  }
  // Grad iz dest-plans.js -> uredničke stavke; bilo koji drugi grad (iz liste POPULAR_DESTINATIONS
  // ili slobodan unos, o.loose) -> opšta stavka: isti šablon plana, cena iz builder-a, bez izmišljenih detalja.
  function resolveDest(name, o){
    o = o || {};
    const raw = String(name || '').trim(), k = cityKey(raw);
    if (k) return {k, c:CFG.cities[k]};
    if (!o.generic || raw.length < 2) return null;
    const n = normalizeSr(raw);
    const md = MATCH_DESTINATIONS.find(d => normalizeSr(d.name) === n);
    const hit = md || POPULAR_DESTINATIONS.find(d => normalizeSr(d.name) === n);
    if (!hit && !o.loose) return null;
    return {k: hit ? hit.name : raw.charAt(0).toUpperCase() + raw.slice(1),
            c:{arch: archFor(md), country: hit ? (hit.extra || '') : '', reasons: reasonsFor(md), generic:true}};
  }
  // Šablon plana i "Zašto <grad>?" iz podataka koje sajt već ima (MATCH_DESTINATIONS: vibes, distance, family,
  // nightlife) — samo ono što tamo piše, bez izmišljanja; gradovi bez tih podataka nemaju blok "Zašto".
  function archFor(md){
    const v = md ? md.vibes : [];
    if (v.includes('sea') && !v.includes('city')) return 'sea';
    if (v.includes('city') && !v.includes('ski')) return 'city';
    return 'trip';
  }
  function reasonsFor(md){
    if (!md) return [];
    const v = md.vibes, out = [];
    if (v.includes('sea')) out.push('More i plaže');
    if (v.includes('city')) out.push('Kultura, muzeji i gradske šetnje');
    if (v.includes('nature')) out.push('Priroda i izleti');
    if (v.includes('ski')) out.push('Skijanje i zimski sportovi');
    if (md.nightlife) out.push('Živ noćni život');
    if (md.distance === 'near') out.push('Blizu — kratak let ili vožnja');
    if (md.distance === 'far') out.push('Dalje putovanje — isplati se duži boravak');
    if (md.family) out.push('Dobro za porodice');
    return out.slice(0, 4);
  }
  // Slika grada za koji nemamo urednički Unsplash ID: Wikipedia (en, pa sh za srpska imena), keš 7 dana;
  // dok ne stigne, koristi se slika sa kartice ili opšta slika.
  const IMG_KEY = 'sklopi_spot_img_v1', IMG_TTL = 7 * 24 * 3600 * 1000;
  const cityImg = {};
  function readImgCache(){
    try { const c = JSON.parse(localStorage.getItem(IMG_KEY) || 'null'); if (c && c.m && Date.now() - c.ts < IMG_TTL) return c; } catch(e){}
    return {ts:Date.now(), m:{}};
  }
  async function wikiImg(host, title){
    try {
      const r = await fetch('https://' + host + '/api/rest_v1/page/summary/' + encodeURIComponent(title));
      if (!r.ok) return '';
      const d = await r.json();
      if (d.type !== 'standard') return '';          // preskoči stranice za razdvajanje značenja
      const th = d.thumbnail && d.thumbnail.source, o = d.originalimage;
      if (th && o && o.width >= 960) return th.replace(/\/\d+px-/, '/960px-');
      return (o && o.width && o.width <= 1400 && o.source) || th || '';
    } catch(e){ return ''; }
  }
  async function loadCityPhoto(k){
    if (cityImg[k] !== undefined) return;
    cityImg[k] = '';
    const cache = readImgCache();
    let url = cache.m[k] || '';
    if (!url){
      let names = {}; try { names = DEST_EN_NAMES; } catch(e){}
      url = await wikiImg('en.wikipedia.org', (names[k] || k).split(',')[0].trim()) || await wikiImg('sh.wikipedia.org', k);
      if (url){ cache.m[k] = url; try { localStorage.setItem(IMG_KEY, JSON.stringify(cache)); } catch(e){} }
    }
    if (!url) return;
    cityImg[k] = url;
    if (curCity === k) render();
    document.dispatchEvent(new Event('sklopi:city-photo'));
  }
  function heroFor(k, c){
    if (c.photo) return ph(c.photo, 1200);
    if (!cityImg[k]) loadCityPhoto(k);
    return cityImg[k] || fallbackPhoto(k);
  }
  function fallbackPhoto(city){
    const card = Array.from(document.querySelectorAll('.popular-dest-card'))
      .find(c => normalizeSr(c.dataset.dest || '') === normalizeSr(city));
    const im = card && card.querySelector('img');
    return im && im.src ? im.src.replace(/w=\d+/, 'w=1200') : GENERIC_PHOTO;
  }
  function plansTitle(k){
    const c = curEntry, l = getLang(), n = cityLabel(k);
    if (c.generic) return (l === 'sr' ? '3 plana' : l === 'ru' ? '3 плана' : l === 'de' ? '3 Pläne' : '3 plans') + ' \u2014 ' + n;
    if (l === 'sr') return '3 plana za ' + c.acc;
    if (l === 'ru') return '3 плана для вашей поездки ' + c.ru;
    if (l === 'de') return '3 Pläne für dein ' + n;
    return '3 plans for your ' + n;
  }
  function whyTitle(k){
    const l = getLang(), n = cityLabel(k);
    return l === 'sr' ? 'Zašto ' + k + '?' : l === 'ru' ? 'Почему ' + n + '?' : l === 'de' ? 'Warum ' + n + '?' : 'Why ' + n + '?';
  }
  const pickSel = p => ({flightPref:p.flightPref, hotelStars:p.hotelStars, prioritizeLocation:p.prioritizeLocation,
    carPref:p.carPref, activityCount:p.activityCount});
  // Servisi koje je korisnik STVARNO markirao (Letovi/Smeštaj/R a C/Aktivnost
  // ispod forme) — bez ovoga su kartice "3 plana" uvek prikazivale ceo
  // paket (let + hotel + auto + aktivnosti) iz fiksnog šablona, čak i kad je
  // korisnik obeležio samo "Smeštaj" (pravi bag).
  function activeServiceFlags(){
    const on = key => { const el = document.querySelector('.toggle[data-t="' + key + '"]'); return !!(el && el.classList.contains('on')); };
    return {flight:on('flight'), hotel:on('hotel'), car:on('car'), activity:on('activity')};
  }
  window.SKLOPI_activeServiceFlags = activeServiceFlags; // koriste ga i "Sastavi svoj paket"/"Tvoj personalizovani plan"

  function buildPlans(k){
    const c = curEntry, tpl = CFG.arch[c.arch] || CFG.arch.city || [];
    const hero = heroFor(k, c);
    const n = cityLabel(k);
    const plans = tpl.map((t, i) => Object.assign({}, t, {
      dest:k, alt:n + ' \u2014 ' + tx(t.title),
      photo: c.photos ? ph(c.photos[i], 1200) : hero,
      thumb: c.photos ? ph(c.photos[i], 500) : hero.replace(/w=1200/, 'w=500'),
      forWho: (i === 0 && c.forWho1) || t.forWho
    }));
    // Grad BEZ sopstvenog aerodroma (Bled, Rogaška Slatina...): urednički
    // feats iznad uvek pišu "Direktan let" / "Fleksibilan let" i sl. jer su
    // to fiksni šabloni po arhetipu (city/sea), isti za sve destinacije —
    // ne znaju ništa o AIRPORT_DB. Bez ovoga kartica ovde ćuti o tome da let
    // stvarno sleće u drugi grad, iako se ISTA napomena već ispisuje kad
    // korisnik kuca tu destinaciju u polju pretrage (airportInfoFor +
    // airportNoteText, vidi renderDestAirportWarning). Dodajemo je i ovde,
    // istim tekstom, da poruka bude dosledna kroz ceo sajt.
    const apInfo = airportInfoFor(k);
    const noOwnAirport = apInfo && !apInfo.hasAirport && apInfo.nearest;
    const airportNote = noOwnAirport ? airportNoteText(apInfo) : '';
    const svc = activeServiceFlags();
    plans.forEach(p => {
      p.airportNote = airportNote;
      // "Direktan let"/"Fleksibilan let" i sl. opisuju TIP karte (bez
      // presedanja), ne kuda sleće — samo po sebi to zvuči kao direktan let
      // baš u k, što zbunjuje kad grad nema aerodrom. flightArrival se
      // dodaje u cardHtml() uz taj tekst ("... do Tivata"), da kartica ne
      // zvuči kao da protivreči napomeni ispod nje.
      p.flightArrival = noOwnAirport ? apInfo.nearest : null;
      // Šabloni (dest-plans.js) uvek nabrajaju sve 4 stavke (let/hotel/
      // aktivnosti/auto) bez obzira šta je korisnik markirao ispod forme —
      // zato je kartica za "samo Smeštaj" ipak pisala "Direktan let". Ovde
      // sklanjamo stavke za servise koje korisnik NIJE tražio; auto-red je
      // ponekad kombinovan sa brojem aktivnosti ("Auto + 3 aktivnosti"), pa
      // se prikazuje samo ako je auto zaista uključen.
      p.feats = p.feats.filter(f => {
        if (f[0] === '\u2708') return svc.flight;
        if (f[0] === '\u25a3') return svc.hotel;
        if (f[0] === '\u25c7') return svc.activity;
        if (f[0] === '\u25b1') return svc.car;
        return true;
      });
      if (!svc.flight){ p.airportNote = ''; p.flightArrival = null; }
      // Detalj paketa (#planDetail, "Pogledaj detalje") NIJE čitao feats —
      // gradio je red-po-red direktno iz šablona (p.flightT/hotelS/actS/
      // carS), pa je i posle filtriranja feats-a za listu kartica detalj i
      // dalje uvek pisao "Direktan let" i ćutao o aerodromu. Čuvamo svc
      // ovde da renderPlanDetail() zna šta stvarno da prikaže.
      p.svc = svc;
    });
    // Uredničke fiksne cene (c.fixed, npr. Atina) pretpostavljaju PUN paket
    // (let + hotel); ako korisnik nije tražio let i/ili hotel, te cene više
    // ne važe i računamo iz builder-a (ispod), isto kao za sve ostale gradove.
    if (c.fixed && svc.flight && svc.hotel){ plans.forEach((p, i) => { p.price = c.fixed[i]; }); return plans; }
    const ctx = Object.assign({}, builderCtx(), {dest:k});
    const sel = p => {
      const s = Object.assign({}, BUILDER_DEFAULTS, {includeFlight:svc.flight, includeHotel:svc.hotel}, pickSel(p));
      if (!svc.car) s.carPref = 'none';
      if (!svc.activity) s.activityCount = 0;
      return s;
    };
    const a = sel(plans[0]), pkg = computeCustomPackage(a, ctx);
    const derive = window.SKLOPI_derivePerPerson;
    plans.forEach((p, i) => {
      p.price = i === 0 ? Math.round(pkg.total / ctx.adults)
        : (derive ? derive(pkg, a, sel(p), ctx) : Math.round(computeCustomPackage(sel(p), ctx).total / ctx.adults));
    });
    return plans;
  }
  function cardHtml(p, i){
    const ft = p.feats.map(f => {
      // f[0] je '\u2708' (✈) samo za red o letu (uvek prvi u feats, videti
      // dest-plans.js) — tu, i samo tu, dodajemo "do {aerodrom}" kad grad
      // nema sopstveni aerodrom, da red o letu ne izgleda kao da je u
      // suprotnosti sa napomenom ispod (apNote) koja kaže da leti do
      // drugog grada.
      const label = (f[0] === '\u2708' && p.flightArrival)
        ? tx(f[1]) + ' \u2192 ' + cityLabel(p.flightArrival)
        : tx(f[1]);
      return '<li><span class="dpf-ic" aria-hidden="true">' + f[0] + '</span><span>' + escapeHtml(label) + '</span></li>';
    }).join('');
    const apNote = p.airportNote ? '<p class="dest-plan-airport-note">\u2708\ufe0f ' + escapeHtml(p.airportNote) + '</p>' : '';
    return '<article class="dest-plan-card" data-plan="' + i + '"><div class="dest-plan-photo"><img src="' + escapeHtml(p.thumb)
      + '" alt="' + escapeHtml(cityLabel(p.dest)) + '" loading="lazy">'
      + (i === 0 ? '<span class="dest-plan-badge dest-plan-badge--popular">' + escapeHtml(tx(p.badge)) + '</span>' : '')
      + '</div><div class="dest-plan-body"><h3>' + escapeHtml(tx(p.title)) + '</h3><p class="dest-plan-price">'
      + escapeHtml(priceText(p.price)) + ' <span>' + tx('/ osoba') + '</span></p><ul class="dest-plan-features">' + ft
      + '</ul>' + apNote + '<p class="dest-plan-for">' + escapeHtml(tx(p.forWho)) + '</p></div></article>';
  }
  // Tekstovi koje JS preuzima od statičkog (SEO) HTML-a za Atinu: skidamo data-i18n da ih
  // applyStaticI18n() ne vrati na Atinu; osvežavaju se u render() pri promeni grada/jezika.
  const managed = ['.destination-reference-photo img', '.destination-reference-location', '#destinationSpotlightTitle',
    '.destination-reference-title-row p', '.destination-reference-reason .eyebrow', '#destinationPlansBtn span', '#destinationPlansTitle']
    .map(qs).filter(Boolean);
  managed.forEach(el => { el.removeAttribute('data-i18n'); el.removeAttribute('data-i18n-alt'); });

  function render(){
    const k = curCity, c = curEntry;
    if (!c || !$('destPlansList')) return;
    const n = cityLabel(k), img = qs('.destination-reference-photo img');
    if (img){
      const want = heroFor(k, c);
      if (img.dataset.src !== want){ img.dataset.src = want; img.src = want; }
      img.alt = n;
    }
    const set = (sel, txt) => { const el = qs(sel); if (el) el.textContent = txt; };
    const cn = c.country ? countryLabel(c.country) : '';
    set('.destination-reference-location', cn);
    set('.destination-reference-title-row p', cn);
    [qs('.destination-reference-location'), qs('.destination-reference-title-row p')].forEach(el => { if (el) el.hidden = !cn; });
    const rb = qs('.destination-reference-reason');
    if (rb) rb.hidden = !c.reasons.length;   // "Zašto <grad>?" samo za urednički pripremljene gradove
    set('#destinationSpotlightTitle', n);
    if (c.reasons.length) set('.destination-reference-reason .eyebrow', whyTitle(k));
    set('#destinationPlansBtn span', plansTitle(k));
    set('#destinationPlansTitle', plansTitle(k));
    const rating = qs('.destination-reference-rating');
    if (rating) rating.hidden = !c.rating;   // ocena je upisana samo u HTML-u (Atina); za ostale nemamo podatke
    const ul = qs('.destination-reference-reason ul');
    if (ul) ul.innerHTML = c.reasons.map(r => '<li>' + escapeHtml(tx(r)) + '</li>').join('');
    curPlans = buildPlans(k);
    $('destPlansList').innerHTML = curPlans.map(cardHtml).join('');
    // Ove kartice se računaju i prikazuju ČIM se otvori destinacija, pre
    // nego što korisnik uopšte dirne "Sastavi svoj put" formu ispod — cena
    // je zato uvek zasnovana na podrazumevanim vrednostima (2 putnika,
    // orijentacioni datumi), ne na nečemu što je korisnik stvarno izabrao.
    // Napomena ispod naslova to jasno kaže dok god forma nije popunjena;
    // čim JESTE (isti "is-empty" signal kao u validateSearchInputs), kartice
    // već odražavaju stvarne podatke pa napomena više nije potrebna.
    const estNote = $('destPlansEstNote');
    if (estNote){
      const datesConfirmed = !document.getElementById('dateDisplayBtn')?.classList.contains('is-empty');
      const paxConfirmed = !document.getElementById('paxDisplayBtn')?.classList.contains('is-empty');
      estNote.hidden = datesConfirmed && paxConfirmed;
    }
    shownCity = k;
  }
  function setCity(name, o){
    const r = resolveDest(name, o);
    if (!r) return false;
    if (r.k === curCity) return true;
    curCity = r.k; curEntry = r.c;
    const plans = $('destinationPlans');
    if (plans) plans.hidden = true;          // stari planovi/detalji više ne važe za novi grad
    planBtn?.setAttribute('aria-expanded', 'false');
    if (detail) detail.hidden = true;
    if (breakdown) breakdown.hidden = true;
    render();
    return true;
  }
  window.SKLOPI_setSpotlight = setCity;
  // Za "Tvoj personalizovani plan" (konfigurator): da li je unos poznata destinacija i urednička slika grada.
  window.SKLOPI_knownDest = name => !!resolveDest(name, {generic:true});
  window.SKLOPI_destPhoto = (name, w) => {
    const r = resolveDest(name, {generic:true, loose:true});
    if (!r) return null;
    if (r.c.photo) return ph(r.c.photo, w || 400);
    if (!cityImg[r.k]) loadCityPhoto(r.k);
    return cityImg[r.k] || null;
  };

  buildBtn?.addEventListener('click', () => {
    const dest = document.getElementById('dest');
    if (dest) {
      dest.value = curCity;
      dest.dispatchEvent(new Event('input', {bubbles:true}));
    }
    const search = document.getElementById('searchForm');
    if (search) search.scrollIntoView({behavior:'smooth', block:'center'});
    setTimeout(() => document.getElementById('origin')?.focus(), 500);
  });

  // Popuni destinaciju plana u pretragu i skroluj na formu (koristi se za "Rezerviši paket").
  function goToSearchForCity(){
    const dest = document.getElementById('dest');
    const ap = window.SKLOPI_ACTIVE_PLAN;
    if (dest && !(ap && ap.keepDest)) {
      dest.value = (ap && ap.dest) || curCity;
      dest.dispatchEvent(new Event('input', {bubbles:true}));
    }
    const search = document.getElementById('searchForm');
    if (search) search.scrollIntoView({behavior:'smooth', block:'center'});
    setTimeout(() => document.getElementById('origin')?.focus(), 500);
  }

  // Detalj paketa (#planDetail) + razrada (#planBreakdown: let, hotel,
  // aktivnosti, dodatne usluge) za SVE tri kartice iz "3 plana". Klik na
  // karticu upisuje izbor plana u builderState i destinaciju grada, pa
  // razrada ispod (let/hotel/aktivnosti/dodaci) prikazuje baš taj plan.
  const detail = document.getElementById('planDetail');
  const breakdown = document.getElementById('planBreakdown');
  function priceText(n){ return currentCurrency === 'RSD' ? fmtEUR(n) : n.toLocaleString('de-DE') + ' \u20ac'; }

  function renderPlanDetail(){
    const p = window.SKLOPI_ACTIVE_PLAN;
    if (!p || !detail) return;
    const svc = p.svc || {flight:true, hotel:true, car:true, activity:true}; // stariji/keširan plan bez svc -> ponašaj se kao pre
    const lo = Math.round(p.price * 0.935 / 10) * 10, hi = Math.round(p.price * 1.07 / 10) * 10;
    $('planDetailTitle').textContent = tx(p.title);
    const pctx = builderCtx();
    $('planDetailMeta').textContent = cityLabel(pctx.dest) + ' \u2022 ' + daysLabel(pctx.days);
    $('planDetailPrice').innerHTML = escapeHtml(priceText(p.price)) + ' <span>' + tx('/ osoba') + '</span>';
    $('planDetailEst').textContent = tx('Procena: ~') + priceText(lo).replace(' \u20ac','') + '\u2013' + priceText(hi);
    $('planDetailImg').src = p.photo;
    $('planDetailImg').alt = tx(p.alt);
    const badge = $('planDetailBadge');
    badge.textContent = tx(p.badge);
    badge.className = 'plan-detail-badge ' + p.badgeCls;
    $('planDetailFor').textContent = tx(p.forWho);
    const row = (ic, t1, t2) => '<li><span class="pdl-ic" aria-hidden="true">' + ic + '</span><div><b>' + t1 + '</b><small>' + t2 + '</small></div></li>';
    // Isti princip kao za kartice u listi: red se prikazuje SAMO ako je taj
    // servis stvarno tražen, i let dobija "\u2192 <aerodrom>" kad grad nema
    // svoj (ista logika/tekst kao airportInfoFor/airportNoteText svuda drugde).
    const flightTitle = p.flightArrival ? escapeHtml(tx(p.flightT)) + ' \u2192 ' + escapeHtml(cityLabel(p.flightArrival)) : escapeHtml(tx(p.flightT));
    $('planDetailList').innerHTML =
      (svc.flight ? row('\u2708', flightTitle, escapeHtml(tx(p.flightS))) : '') +
      (svc.hotel ? row('\u25a3', tx('Hotel'), escapeHtml(tx(p.hotelS))) : '') +
      (svc.activity ? row('\u25c7', tx('Aktivnosti'), escapeHtml(tx(p.actS))) : '') +
      (svc.car ? row('\u25b1', tx('Prevoz'), escapeHtml(tx(p.carS))) : '');
    const apEl = $('planDetailAirport');
    if (apEl){
      const show = svc.flight && !!p.airportNote;
      apEl.hidden = !show;
      apEl.textContent = show ? ('\u2708\ufe0f ' + p.airportNote) : '';
    }
  }

  function openPlan(key){
    const p = typeof key === 'string' ? curPlans.find(x => x.key === key) : key;
    if (!p || !detail) return;
    window.SKLOPI_ACTIVE_PLAN = p;
    const dest = $('dest');
    if (dest && !p.keepDest){ dest.value = p.dest || curCity; dest.dispatchEvent(new Event('input', {bubbles:true})); }
    // Isto ovde: nekad se builderState (za "razradu"/rezervaciju ispod)
    // uvek postavljao na includeFlight/includeHotel true, bez obzira na
    // stvarno markirane servise — pa je i razrada tražila let za grad bez
    // aerodroma / usluge koje korisnik nikad nije tražio.
    const svc = p.svc || {flight:true, hotel:true, car:true, activity:true};
    Object.assign(builderState, {
      includeFlight:svc.flight, includeHotel:svc.hotel, flightPref:p.flightPref, hotelStars:p.hotelStars,
      prioritizeLocation:p.prioritizeLocation, carPref:svc.car ? p.carPref : 'none', activityCount:svc.activity ? p.activityCount : 0
    });
    renderFormUI();
    document.dispatchEvent(new Event('sklopi:plan-changed'));
    if (breakdown) breakdown.hidden = true;   // razrada se otvara tek na "Pogledaj detalje"
    renderPlanDetail();
    detail.hidden = false;
    detail.scrollIntoView({behavior:'smooth', block:'start'});
  }
  $('destPlansList')?.addEventListener('click', e => {
    const card = e.target.closest('.dest-plan-card');
    if (card) openPlan(curPlans[Number(card.dataset.plan)]);
  });
  window.SKLOPI_openPlan = openPlan;   // koristi ga i "Tvoj personalizovani plan"
  document.addEventListener('sklopi:lang', () => { render(); if (detail && !detail.hidden) renderPlanDetail(); });
  // Cene "računatih" gradova zavise od polaska, datuma i broja putnika.
  let _planTimer = null;
  ['origin','dateFrom','dateTo','adults'].forEach(id => {
    const el = $(id);
    if (!el) return;
    ['input','change'].forEach(ev => el.addEventListener(ev, () => { clearTimeout(_planTimer); _planTimer = setTimeout(render, 250); }));
  });
  // I na promenu Letovi/Smeštaj/R a C/Aktivnost — vidi napomenu uz
  // 'sklopi:services-changed' gore (FORM WIRING) za ceo bag.
  document.addEventListener('sklopi:services-changed', render);

  $('planDetailBack')?.addEventListener('click', () => {
    if (detail) detail.hidden = true;
    if (breakdown) breakdown.hidden = true;
    const ap = window.SKLOPI_ACTIVE_PLAN;
    const backId = (ap && ap.backTo) || 'destinationPlans';
    if (backId === 'destinationPlans') showDestPlans();
    else $(backId)?.scrollIntoView({behavior:'smooth', block:'start'});
  });
  $('planDetailBook')?.addEventListener('click', goToSearchForCity);
  $('planDetailMore')?.addEventListener('click', () => {
    if (!breakdown) return;
    // BAG: "Pogledaj detalje" je otvarao SVE podstranice (let/hotel/
    // aktivnosti) bez obzira na to koje je usluge korisnik stvarno
    // markirao (Letovi/Smeštaj/R a C/Aktivnost) — npr. paket sa samo
    // "Smeštaj" i dalje je prikazivao "Let Beograd → X" (i, pošto Polazak
    // nije bio popunjen jer let nije ni tražen, tiho je pretpostavljao
    // Beograd). Sada sakrivamo podstranicu za svaku uslugu koja nije
    // markirana, isto kao što se već radi za red u planDetailList iznad.
    const p = window.SKLOPI_ACTIVE_PLAN;
    const svc = (p && p.svc) || {flight:true, hotel:true, car:true, activity:true};
    const flightSec = $('flightDetail'), hotelSec = $('hotelDetail'), carSec = $('carDetail'), actSec = $('activitiesDetail');
    if (flightSec) flightSec.hidden = !svc.flight;
    if (hotelSec) hotelSec.hidden = !svc.hotel;
    if (carSec) carSec.hidden = !svc.car;
    if (actSec) actSec.hidden = !svc.activity;
    breakdown.hidden = false;
    document.dispatchEvent(new Event('sklopi:plan-breakdown'));
    breakdown.scrollIntoView({behavior:'smooth', block:'start'});
  });
  $('currencySwitchBtn')?.addEventListener('click', () => setTimeout(() => { render(); if (detail && !detail.hidden) renderPlanDetail(); }, 0));
  render();
})();

/* ==========================================================
   SASTAVI SVOJ PAKET (#customPlanner) — čip izbori (6. ekran sa slike).
   Upisuje izbor u builderState (isti izvor istine kao stari upitnik),
   pa "Sklopi moj put" otvara postojeći builder sa procenom cene.
   Budžet/Balans/Komfor su samo prečice: postave zvezdice hotela i tip
   leta, a korisnik ih posle može da promeni ostalim čipovima.
   Broj aktivnosti: 1-2 → 2, 3-4 → 3, 5+ → 5 (predstavnička vrednost).
========================================================== */
(function initCustomPlanner(){
  const root = document.getElementById('customPlanner');
  const btn = document.getElementById('customPlannerBtn');
  if (!root || !btn) return;
  const TIER_PRESETS = {
    budget:  {stars:'3', flight:'cheapest'},
    balance: {stars:'4', flight:'direct'},
    comfort: {stars:'5', flight:'direct'}
  };
  function setChip(group, value){
    root.querySelectorAll('.cp-group[data-group="' + group + '"] .cp-chip').forEach(c => {
      const on = c.dataset.value === String(value);
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function getChip(group){
    const on = root.querySelector('.cp-group[data-group="' + group + '"] .cp-chip.is-on');
    return on ? on.dataset.value : null;
  }
  root.querySelectorAll('.cp-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const group = chip.closest('.cp-group').dataset.group;
      setChip(group, chip.dataset.value);
      if (group === 'tier'){
        const p = TIER_PRESETS[chip.dataset.value];
        if (p){ setChip('stars', p.stars); setChip('flight', p.flight); }
      }
    });
  });
  btn.addEventListener('click', () => {
    // Ranije se proveravala SAMO destinacija — ista rupa kao kod ostalih
    // dugmadi "Sklopi moj put"/"Napravi izlet": polazak, datumi i broj
    // putnika su mogli ostati prazni. Ista provera kao svuda drugde.
    const check = validateSearchInputs();
    if (!check.ok){ showToast(check.msg); focusSearchField(check.focus); return; }
    const svc = window.SKLOPI_activeServiceFlags ? window.SKLOPI_activeServiceFlags() : {flight:true, hotel:true, car:true, activity:true};
    builderState.includeFlight = svc.flight;
    builderState.includeHotel = svc.hotel;
    builderState.flightPref = getChip('flight') === 'cheapest' ? 'cheapest' : 'direct';
    builderState.hotelStars = Number(getChip('stars')) || 4;
    builderState.carPref = svc.car ? (getChip('car') || 'none') : 'none';
    builderState.activityCount = svc.activity ? (Number(getChip('acts')) || 2) : 0;
    renderFormUI();
    // Rezultat je "Tvoj personalizovani plan" (#personalPlans); builder se
    // otvara tek klikom na "Pogledaj detalje" na nekom od planova.
    document.dispatchEvent(new CustomEvent('sklopi:custom-plan', {detail:{
      tier: getChip('tier'),
      sel: {flightPref: builderState.flightPref, hotelStars: builderState.hotelStars,
            carPref: builderState.carPref, activityCount: builderState.activityCount}
    }}));
    const target = document.getElementById('personalPlans') || document.getElementById('builderPanel');
    if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
  });
})();

/* ==========================================================
   TVOJ PERSONALIZOVANI PLAN (#personalPlans) — 7. ekran sa slike.
   Iz izbora u "Sastavi svoj paket" pravi 3 plana: Najbolji izbor (tvoj
   izbor), Više komfora i Najviše za novac. Osnovnu cenu daje
   computeCustomPackage; Plan 2 i 3 se izvode iz nje istim konstantama
   (množioci leta, cene zvezdica, cena auta), da redosled cena uvek
   bude Najviše za novac < Najbolji izbor < Više komfora.
========================================================== */
(function initPersonalPlans(){
  const section = document.getElementById('personalPlans');
  const list = document.getElementById('ppList');
  const tags = document.getElementById('ppTags');
  if (!section || !list || !tags) return;
  const TIER_LABEL = {budget:'Budžet', balance:'Balans', comfort:'Komfor'};
  const ATHENS_PHOTOS = [
    'https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=400&q=80'
  ];
  let last = null;

  function fmtPrice(n){
    return currentCurrency === 'RSD' ? fmtEUR(n) : n.toLocaleString('de-DE') + ' \u20ac';
  }
  function photosFor(dest){
    if (normalizeSr(dest) === 'atina') return ATHENS_PHOTOS;
    const cur = window.SKLOPI_destPhoto && window.SKLOPI_destPhoto(dest, 400);
    if (cur) return [cur, cur, cur];
    const card = Array.from(document.querySelectorAll('.popular-dest-card'))
      .find(c => normalizeSr(c.dataset.dest || '') === normalizeSr(dest));
    const src = card && card.querySelector('img') ? card.querySelector('img').src : 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=400&q=80';
    return [src, src, src];
  }
  // Procena po osobi za izbor `x`, izvedena iz osnovnog paketa `pkg` (izbor `a`).
  function derivePerPerson(pkg, a, x, ctx){
    const f = marketFactor(ctx.dest, todayStr()) * seasonFactor(ctx.dest, ctx.from);
    const flight = pkg.flight.price * FLIGHT_PREF_PRICE_MULT[x.flightPref] / FLIGHT_PREF_PRICE_MULT[a.flightPref];
    const hotel = pkg.hotel.price * HOTEL_STAR_BASE_PRICE[x.hotelStars] / HOTEL_STAR_BASE_PRICE[a.hotelStars];
    const perAct = a.activityCount > 0 ? pkg.activity.price / a.activityCount : 30 * marketFactor(ctx.dest, todayStr());
    const acts = perAct * x.activityCount;
    let car = 0;
    if (x.carPref !== 'none'){
      car = x.carPref === a.carPref
        ? pkg.car.price + pkg.carExtras.price
        : (CAR_TYPE_BASE_PRICE[x.carPref] + 5.5) * ctx.days * f + 27 * marketFactor(ctx.dest, todayStr());
    }
    return Math.round((flight + hotel + acts + car) / ctx.adults);
  }
  window.SKLOPI_derivePerPerson = derivePerPerson;   // koristi ga i spotlight (fiksni planovi po gradu)
  function flightText(x, ctx, comfortFlex){
    if (x.flightPref === 'cheapest') return 'Let sa presedanjem';
    if (comfortFlex) return 'Fleksibilan let';
    const o = iataFor(realDepartureAirportFor(ctx.originCode));
    const d = iataFor(realArrivalAirportFor(ctx.dest));
    return 'Direktan let' + (ctx.originCode && o && d ? ' (' + o + '\u2013' + d + ')' : '');
  }
  function carText(p){ return p === 'suv' ? 'Auto (SUV)' : p === 'small' ? 'Auto (mali)' : 'Bez auta'; }

  function render(){
    if (!last) return;
    const ctx = builderCtx();
    const svc = window.SKLOPI_activeServiceFlags ? window.SKLOPI_activeServiceFlags() : {flight:true, hotel:true, car:true, activity:true};
    const a = Object.assign({}, builderState, last.sel, {includeFlight:svc.flight, includeHotel:svc.hotel});
    if (!svc.car) a.carPref = 'none';
    if (!svc.activity) a.activityCount = 0;
    const pkg = computeCustomPackage(a, ctx);
    // Grad bez sopstvenog aerodroma (ista baza/tekst kao svuda drugde na
    // sajtu): dodajemo napomenu i "\u2192 <aerodrom>" umesto da kartica ćuti
    // ili tvrdi da let sleće baš u ctx.dest.
    const apInfo = airportInfoFor(ctx.dest);
    const noOwnAirport = svc.flight && apInfo && !apInfo.hasAirport && apInfo.nearest;
    const airportNote = noOwnAirport ? airportNoteText(apInfo) : '';
    const plans = [
      {title:'Plan 1 \u2013 Najbolji izbor', sel:a, flex:false},
      {title:'Plan 2 \u2013 Više komfora', flex:true, sel:Object.assign({}, a, {
        flightPref:'direct', hotelStars:Math.min(5, a.hotelStars + 1),
        carPref: svc.car ? (a.carPref === 'none' ? 'small' : a.carPref) : 'none',
        activityCount: svc.activity ? Math.min(10, a.activityCount + 1) : 0})},
      {title:'Plan 3 \u2013 Najviše za novac', flex:false, sel:Object.assign({}, a, {
        flightPref:'cheapest', hotelStars:Math.max(3, a.hotelStars - 1),
        carPref:'none', activityCount: svc.activity ? Math.max(1, a.activityCount - 1) : 0})}
    ];
    const photos = photosFor(ctx.dest);
    tags.innerHTML = '<span class="pp-tag">' + escapeHtml(tx(TIER_LABEL[last.tier] || 'Balans')) + '</span>'
      + '<span class="pp-tag pp-tag--stars">' + a.hotelStars + '\u2605 ' + tx('hotel') + ' +</span>';
    list.innerHTML = plans.map((p, i) => {
      const price = p.price = i === 0 ? Math.round(pkg.total / ctx.adults) : derivePerPerson(pkg, a, p.sel, ctx);
      const flightLabel = escapeHtml(tx(flightText(p.sel, ctx, p.flex))) + (noOwnAirport ? ' \u2192 ' + escapeHtml(cityLabel(apInfo.nearest)) : '');
      const apNote = airportNote ? '<p class="dest-plan-airport-note">\u2708\ufe0f ' + escapeHtml(airportNote) + '</p>' : '';
      return '<article class="pp-card" data-plan="' + i + '"><div class="pp-card-top"><div class="pp-card-info">'
        + '<h3>' + escapeHtml(tx(p.title)) + '</h3>'
        + '<p class="pp-price">' + fmtPrice(price) + ' <span>' + tx('/ osoba') + '</span></p>'
        + '<ul class="pp-feats">'
        + (svc.flight ? '<li><span class="dpf-ic" aria-hidden="true">\u2708</span>' + flightLabel + '</li>' : '')
        + (svc.hotel ? '<li><span class="dpf-ic" aria-hidden="true">\u25a3</span>' + p.sel.hotelStars + '\u2605 ' + tx('hotel') + ' (' + nightsLabel(ctx.nights) + ')</li>' : '')
        + (svc.activity ? '<li><span class="dpf-ic" aria-hidden="true">\u25c7</span>' + activitiesLabel(p.sel.activityCount) + '</li>' : '')
        + (svc.car ? '<li><span class="dpf-ic" aria-hidden="true">\u25b1</span>' + escapeHtml(tx(carText(p.sel.carPref))) + '</li>' : '')
        + '</ul>' + apNote + '</div><div class="pp-photo"><img src="' + photos[i] + '" alt="" loading="lazy"></div></div>'
        + '<button type="button" class="btn-primary pp-more" data-plan="' + i + '">' + tx('Pogledaj detalje') + '</button></article>';
    }).join('');
    list.querySelectorAll('.pp-more').forEach(btn => btn.addEventListener('click', () => {
      const i = Number(btn.dataset.plan), p = plans[i], c = builderCtx();
      const rooms = p.sel.hotelStars + '\u2605 ' + tx('hotel') + ' (' + nightsLabel(c.nights) + ')';
      if (typeof window.SKLOPI_openPlan !== 'function') return;
      window.SKLOPI_openPlan({
        title:p.title, price:p.price, badge:['Najbolji izbor','Više komfora','Najviše za novac'][i],
        badgeCls:i === 1 ? 'plan-detail-badge--comfort' : '',
        photo:photos[i].replace('w=400', 'w=1200'), alt:p.title,
        flightPref:p.sel.flightPref, hotelStars:p.sel.hotelStars, prioritizeLocation:!!builderState.prioritizeLocation,
        carPref:p.sel.carPref, activityCount:p.sel.activityCount,
        flightT:flightText(p.sel, c, p.flex), flightS:'Povratna karta',
        hotelS:rooms, actS:activitiesLabel(p.sel.activityCount), carS:carText(p.sel.carPref),
        forWho:'Izračunato prema tvojim izborima u \u201eSastavi svoj paket\u201c.',
        keepDest:true, backTo:'personalPlans',
        svc:svc, airportNote:airportNote, flightArrival:noOwnAirport ? apInfo.nearest : null
      });
    }));
    section.hidden = false;
  }
  document.addEventListener('sklopi:custom-plan', e => { last = e.detail; render(); });
  document.addEventListener('sklopi:city-photo', () => { if (last && !section.hidden) render(); });
  // Živo osvežavanje: promena destinacije, polaska, datuma ili broja putnika iznova računa 3 plana
  // (bez ovoga bi ostali stari plani za prethodni grad). Destinacija samo kad je poznata ili posle izbora/Enter.
  let _ppTimer = null;
  const refresh = ms => { clearTimeout(_ppTimer); _ppTimer = setTimeout(() => { if (last && !section.hidden) render(); }, ms); };
  ['origin','dateFrom','dateTo','adults'].forEach(id => {
    const el = document.getElementById(id);
    if (el) ['input','change'].forEach(ev => el.addEventListener(ev, () => refresh(250)));
  });
  // Isti bag/popravka kao za "3 plana" — vidi 'sklopi:services-changed'.
  document.addEventListener('sklopi:services-changed', () => refresh(0));
  const ppDest = document.getElementById('dest');
  if (ppDest){
    ppDest.addEventListener('input', () => { if (window.SKLOPI_knownDest && window.SKLOPI_knownDest(ppDest.value)) refresh(600); });
    ppDest.addEventListener('change', () => { if (ppDest.value.trim()) refresh(0); });
  }
  document.addEventListener('sklopi:lang', () => { if (last && !section.hidden) render(); });
  document.getElementById('currencySwitchBtn')?.addEventListener('click', () => setTimeout(() => { if (!section.hidden) render(); }, 0));
})();

/* ==========================================================
   LET BEOGRAD → ATINA (#flightDetail) — 8. ekran sa slike.
   Otvara se iz "Pogledaj detalje" na paketu (#planBreakdown). Ruta,
   putnici i datumi dolaze iz forme za pretragu (polazak podrazumevano
   Beograd, destinacija Atina); cena po osobi je ilustrativna procena
   iz computeCustomPackage (direktan let). Nema "live cene" ni tačnog
   vremena polaska — nemamo pravi izvor; trajanje je procena iz
   udaljenosti aerodroma. Dugme vodi na KAYAK preko buildAffiliateLink.
========================================================== */
(function initFlightDetail(){
  const box = document.getElementById('planBreakdown');
  const btn = document.getElementById('fdKayakBtn');
  if (!box || !btn) return;
  const $ = id => document.getElementById(id);
  function render(){
    // Ako ovaj paket uopšte nije tražio let (svc.flight === false), sekcija
    // je već sakrivena iz planDetailMore handlera iznad — ovde samo ne
    // trošimo posao i ne prikazujemo je slučajno preko nekog drugog
    // okidača (promena jezika/valute) dok je hidden.
    if (box.hidden || (document.getElementById('flightDetail')?.hidden)) return;
    const ctx = builderCtx();
    // Polazak nije popunjen (let nije ni bio tražen, pa polje nije bilo
    // obavezno) — NE pretvaramo to tiho u "Beograd" kao pravu pretpostavku;
    // jasno označavamo da je polazište nepoznato i tražimo od korisnika
    // da ga upiše, umesto da mu ponudimo let iz grada koji nikad nije uneo.
    const hasOrigin = !!ctx.originCode;
    const originName = hasOrigin ? ctx.originCode : 'Beograd';
    const destName = ctx.dest;
    const c = Object.assign({}, ctx, {originCode: originName});
    const pref = builderState.flightPref === 'cheapest' ? 'cheapest' : 'direct';
    const sel = Object.assign({}, builderState, {flightPref:pref, includeFlight:true});
    const pkg = computeCustomPackage(sel, c);
    const perPerson = Math.round(pkg.flight.price / c.adults);
    const o = iataFor(realDepartureAirportFor(originName));
    const d = iataFor(realArrivalAirportFor(destName));
    let dur = '';
    if (o && d && AIRPORT_COORDS[o] && AIRPORT_COORDS[d] && o !== d){
      const mins = Math.round((haversineKm(AIRPORT_COORDS[o], AIRPORT_COORDS[d]) / 620 * 60 + 35) / 5) * 5;
      dur = tx('oko ') + Math.floor(mins / 60) + 'h ' + String(mins % 60).padStart(2, '0') + 'm';
    }
    const carrier = FLIGHT_CARRIERS.find(n => pkg.flight.name.indexOf(n) === 0) || '';
    $('flightDetailTitle').textContent = tx('Let ') + cityLabel(originName) + ' \u2192 ' + cityLabel(destName);
    $('fdMeta').textContent = tx(pref === 'cheapest' ? 'Najjeftinija kombinacija' : 'Direktan let') + ' \u2022 KAYAK';
    $('fdPrice').innerHTML = (currentCurrency === 'RSD' ? escapeHtml(fmtEUR(perPerson)) : perPerson.toLocaleString('de-DE') + ' \u20ac') + ' <span>' + tx('/ osoba') + '</span>';
    $('fdFrom').textContent = o || '\u2014';
    $('fdTo').textContent = d || '\u2014';
    // Polazak/destinacija bez sopstvenog aerodroma: pokaži aerodrom koji se zaista koristi + isto obaveštenje kao u pretrazi.
    const oInfo = airportInfoFor(originName), dInfo = airportInfoFor(destName);
    const noAp = i => i && !i.hasAirport && i.nearest;
    $('fdFromName').textContent = cityLabel(noAp(oInfo) ? oInfo.nearest : originName);
    $('fdToName').textContent = cityLabel(noAp(dInfo) ? dInfo.nearest : destName);
    const apNote = $('fdAirportNote');
    if (apNote){
      const notes = [oInfo, dInfo].filter(noAp).map(airportNoteText).filter(Boolean);
      // Ako Polazak nije upisan, ne ćutimo o pretpostavci — jasno kažemo
      // da je Beograd samo podrazumevano polazište dok korisnik ne unese svoje.
      if (!hasOrigin) notes.unshift(tx('Polazak nije unet — cena je procena za let iz Beograda. Upiši svoj Polazak za tačniju ponudu.'));
      apNote.textContent = notes.length ? '\u2708\ufe0f ' + notes.join(' ') : '';
      apNote.hidden = !notes.length;
    }
    const stopTxt = tx(pref === 'cheapest' ? 'Moguće presedanje' : 'Direktan let');
    $('fdDur').textContent = dur ? dur + ' \u2022 ' + stopTxt : stopTxt;
    $('fdCarrier').textContent = carrier ? tx('Prevoznik (procena): ') + carrier : '';
    const url = buildAffiliateLink('flight', {
      dest: destName, originCode: originName, from: c.from, to: c.to, adults: c.adults, flightPref: pref
    });
    btn.href = url;
    btn.dataset.url = url;
    btn.dataset.price = String(pkg.flight.price);
    btn.dataset.dest = destName;
  }
  document.addEventListener('sklopi:plan-breakdown', render);
  document.addEventListener('sklopi:lang', () => { if (!box.hidden) render(); });
  document.getElementById('flightDetailBack')?.addEventListener('click', () => {
    box.hidden = true;
    document.getElementById('planDetail')?.scrollIntoView({behavior:'smooth', block:'start'});
  });
  document.getElementById('currencySwitchBtn')?.addEventListener('click', () => setTimeout(() => { if (!box.hidden) render(); }, 0));
})();

/* ==========================================================
   HOTEL U ATINI (#hotelDetail) — 9. ekran sa slike. Isti obrazac kao
   #flightDetail: otvara se sa #planBreakdown, podaci iz forme. Hotel je
   3★ blizu centra (kao paket "Najviše za novac"); cena po noći i ukupno
   su ilustrativna procena iz computeCustomPackage. Namerno bez izmišljenog
   naziva hotela, broja recenzija i liste sadržaja (WiFi/bazen) — nemamo
   te podatke; umesto toga prikazujemo šta procena stvarno pokriva
   (blizu centra, sobe, noći). Dugme vodi na Booking.com (affiliate link).
========================================================== */
(function initHotelDetail(){
  const box = document.getElementById('planBreakdown');
  const btn = document.getElementById('hdBookingBtn');
  if (!box || !btn) return;
  const $ = id => document.getElementById(id);
  const money = n => currentCurrency === 'RSD' ? fmtEUR(n) : n.toLocaleString('de-DE') + ' \u20ac';
  function render(){
    // Isti razlog kao u initFlightDetail: ne prikazuj/računaj ako ovaj
    // paket nije tražio Smeštaj (svc.hotel === false).
    if (box.hidden || (document.getElementById('hotelDetail')?.hidden)) return;
    const ctx = builderCtx();
    const stars = builderState.hotelStars || 3;
    const central = !!builderState.prioritizeLocation;
    const sel = Object.assign({}, builderState, {includeHotel:true, hotelStars:stars});
    const pkg = computeCustomPackage(sel, ctx);
    const rooms = Math.max(1, Math.ceil(ctx.adults / 2));
    const perNight = Math.round(pkg.hotel.price / (ctx.nights * rooms));
    $('hotelDetailTitle').textContent = tx('Hotel u ') + cityLabel(ctx.dest);
    $('hdMeta').textContent = stars + '\u2605 \u2022 ' + tx(central ? 'blizu centra' : 'mirniji deo');
    $('hdPrice').innerHTML = escapeHtml(money(perNight)) + ' <span>' + tx('/ no\u0107') + '</span>';
    $('hdTotal').textContent = tx('(ukupno ') + money(pkg.hotel.price) + ') \u2022 ' + tx('ilustrativna procena');
    $('hdChips').innerHTML = [
      (central ? '\ud83d\udccd ' + tx('Blizu centra') : '\ud83c\udf3f ' + tx('Mirniji deo')),
      '\ud83d\udecf ' + roomsLabel(rooms),
      '\ud83c\udf19 ' + nightsLabel(ctx.nights)
    ].map(s => '<span class="hd-chip">' + s + '</span>').join('');
    const url = buildAffiliateLink('hotel', {
      dest: ctx.dest, from: ctx.from, to: ctx.to, adults: ctx.adults,
      hotelStars: stars, prioritizeLocation: central, prioritizeRating: false
    });
    btn.href = url;
    btn.dataset.url = url;
    btn.dataset.price = String(pkg.hotel.price);
    btn.dataset.dest = ctx.dest;
  }
  document.addEventListener('sklopi:plan-breakdown', render);
  document.addEventListener('sklopi:lang', () => { if (!box.hidden) render(); });
  $('hotelDetailBack')?.addEventListener('click', () => {
    box.hidden = true;
    document.getElementById('planDetail')?.scrollIntoView({behavior:'smooth', block:'start'});
  });
  document.getElementById('currencySwitchBtn')?.addEventListener('click', () => setTimeout(() => { if (!box.hidden) render(); }, 0));
})();

/* ==========================================================
   AUTO (#carDetail) — isti obrazac kao #hotelDetail/#flightDetail:
   otvara se sa #planBreakdown, samo kad je paket stvarno tražio R a C
   (svc.car), podaci iz forme. BAG koji je ovo popravio: R a C nije imao
   NIKAKVU podstranicu u "Pogledaj detalje" (postojale su samo za Let/
   Hotel/Aktivnosti) — auto je ulazio u ukupnu cenu i u "Šta je
   uključeno?" listu, ali korisnik nije mogao da ga vidi/rezerviše kad
   je to bila jedina ili jedna od tri tražene usluge. Cena po danu i
   ukupno (uključujući gorivo/putarine, isto kao u builderu) su
   ilustrativna procena iz computeCustomPackage. Dugme vodi na
   Booking.com Cars (isti partner/provider kao za hotel).
========================================================== */
(function initCarDetail(){
  const box = document.getElementById('planBreakdown');
  const btn = document.getElementById('cdBookingBtn');
  if (!box || !btn) return;
  const $ = id => document.getElementById(id);
  const money = n => currentCurrency === 'RSD' ? fmtEUR(n) : n.toLocaleString('de-DE') + ' \u20ac';
  const carLabel = p => p === 'suv' ? tx('Auto (SUV)') : tx('Auto (mali)');
  function render(){
    if (box.hidden || (document.getElementById('carDetail')?.hidden)) return;
    const ctx = builderCtx();
    const carPref = builderState.carPref !== 'none' ? builderState.carPref : 'small';
    const sel = Object.assign({}, builderState, {carPref});
    const pkg = computeCustomPackage(sel, ctx);
    const perDay = Math.round(pkg.car.price / Math.max(1, ctx.days));
    const totalWithExtras = pkg.car.price + pkg.carExtras.price;
    $('carDetailTitle').textContent = tx('Auto u ') + cityLabel(ctx.dest);
    $('cdMeta').textContent = carLabel(carPref);
    $('cdPrice').innerHTML = escapeHtml(money(perDay)) + ' <span>' + tx('/ dan') + '</span>';
    $('cdTotal').textContent = tx('(ukupno ') + money(totalWithExtras) + ', ' + tx('uklj. gorivo i putarine') + ') \u2022 ' + tx('ilustrativna procena');
    $('cdChips').innerHTML = [
      '\ud83d\udccd ' + cityLabel(ctx.dest),
      '\ud83d\udcc5 ' + daysLabel(ctx.days),
      '\u26fd ' + tx('Gorivo i putarine: ') + money(pkg.carExtras.price)
    ].map(s => '<span class="hd-chip">' + s + '</span>').join('');
    const url = buildAffiliateLink('car', {dest: ctx.dest, from: ctx.from, to: ctx.to, adults: ctx.adults});
    btn.href = url;
    btn.dataset.url = url;
    btn.dataset.price = String(pkg.car.price);
    btn.dataset.dest = ctx.dest;
  }
  document.addEventListener('sklopi:plan-breakdown', render);
  document.addEventListener('sklopi:lang', () => { if (!box.hidden) render(); });
  $('carDetailBack')?.addEventListener('click', () => {
    box.hidden = true;
    document.getElementById('planDetail')?.scrollIntoView({behavior:'smooth', block:'start'});
  });
  document.getElementById('currencySwitchBtn')?.addEventListener('click', () => setTimeout(() => { if (!box.hidden) render(); }, 0));
})();

/* ==========================================================
   NAJPOPULARNIJE AKTIVNOSTI (#activitiesDetail) — 10. ekran sa slike.
   Za Atinu: 3 ručno odabrane aktivnosti (ilustrativne "od" cene).
   Za ostale destinacije: 3 opšte aktivnosti sa cenom izvedenom iz
   computeCustomPackage. Bez ocena i broja recenzija (nemamo podatke).
   "Rezerviši" vodi na Viator pretragu (affiliate), "Pogledaj sve
   aktivnosti" otvara postojeći spisak atrakcija.
========================================================== */
(function initActivitiesDetail(){
  const box = document.getElementById('planBreakdown');
  const list = document.getElementById('adList');
  if (!box || !list) return;
  const ATHENS = [
    {name:'Akropolj i muzej Akropolja', price:35, q:'Acropolis Athens tour', img:'https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=300&q=80'},
    {name:'Obilazak starog grada', price:28, q:'Athens old town walking tour', img:'https://images.unsplash.com/photo-1555993539-1732b0258235?w=300&q=70&auto=format&fit=crop'},
    {name:'Krstarenje zalivom', price:42, q:'Athens bay cruise', img:'https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?auto=format&fit=crop&w=300&q=80'}
  ];
  const money = n => currentCurrency === 'RSD' ? fmtEUR(n) : n.toLocaleString('de-DE') + ' \u20ac';
  function render(){
    // Isti razlog kao u initFlightDetail: ne prikazuj/računaj ako ovaj
    // paket nije tražio Aktivnosti (svc.activity === false).
    if (box.hidden || (document.getElementById('activitiesDetail')?.hidden)) return;
    const ctx = builderCtx();
    let items;
    if (normalizeSr(ctx.dest) === 'atina'){
      items = ATHENS;
    } else {
      const pkg = computeCustomPackage(Object.assign({}, builderState, {activityCount:2}), ctx);
      const base = Math.max(10, Math.round(pkg.activity.price / 2));
      const card = Array.from(document.querySelectorAll('.popular-dest-card'))
        .find(c => normalizeSr(c.dataset.dest || '') === normalizeSr(ctx.dest));
      const img = card && card.querySelector('img') ? card.querySelector('img').src : ATHENS[2].img;
      items = [
        {name:'Ulaznice za glavne znamenitosti', price:Math.round(base * 1.1), q:ctx.dest + ' top attractions tickets', img},
        {name:'Obilazak starog grada', price:Math.round(base * 0.85), q:ctx.dest + ' old town walking tour', img},
        {name:'Vođena tura po gradu', price:Math.round(base * 1.3), q:ctx.dest + ' guided city tour', img}
      ];
    }
    list.innerHTML = items.map(it => {
      const url = buildAffiliateLink('activity', {dest: it.q});
      return '<article class="ad-card"><div class="ad-photo"><img src="' + escapeHtml(it.img) + '" alt="" loading="lazy"></div>'
        + '<div class="ad-info"><h3>' + escapeHtml(tx(it.name)) + '</h3><p class="ad-price">' + tx('od ') + escapeHtml(money(it.price)) + '</p>'
        + '<span class="partner-badge partner-badge--viator">Viator</span></div>'
        + '<a class="ad-book" href="' + escapeHtml(url) + '" target="_blank" rel="noopener sponsored" data-kind="activity" data-price="' + it.price
        + '" data-url="' + escapeHtml(url) + '" data-dest="' + escapeHtml(ctx.dest) + '" data-tier="plan" onclick="bookItem(this)">' + tx('Rezerviši') + '</a></article>';
    }).join('');
  }
  document.addEventListener('sklopi:plan-breakdown', render);
  document.addEventListener('sklopi:lang', () => { if (!box.hidden) render(); });
  document.getElementById('adAllBtn')?.addEventListener('click', () => openAttractionsSheet());
  document.getElementById('currencySwitchBtn')?.addEventListener('click', () => setTimeout(() => { if (!box.hidden) render(); }, 0));
})();

/* ==========================================================
   DODATNE USLUGE (#extrasDetail) — 11. ekran sa slike.
   eSIM: "Dodaj" uključuje eSIM u procenu (builderState.esim, isti
   izvor istine kao builder). Putno osiguranje: samo informacija dok
   nema partnerskog linka (World Nomads ide preko CJ). Price Alert:
   postojeći openAlertModal za trenutni izbor (builderState).
========================================================== */
(function initExtrasDetail(){
  const box = document.getElementById('planBreakdown');
  const esimBtn = document.getElementById('exEsimBtn');
  const alertBtn = document.getElementById('exAlertBtn');
  if (!box || !esimBtn || !alertBtn) return;
  const money = n => currentCurrency === 'RSD' ? fmtEUR(n) : n.toLocaleString('de-DE') + ' \u20ac';
  function render(){
    document.getElementById('exEsimPrice').textContent = tx('od ') + money(BUILDER_ADDON_RATES.esim);
    document.getElementById('exInsPrice').textContent = tx('od ') + money(BUILDER_ADDON_RATES.insurance);
    esimBtn.textContent = tx(builderState.esim ? 'Dodato \u2713' : 'Dodaj');
    esimBtn.setAttribute('aria-pressed', builderState.esim ? 'true' : 'false');
  }
  esimBtn.addEventListener('click', () => {
    builderState.esim = !builderState.esim;
    renderFormUI();
    renderBuilder();
    render();
    document.dispatchEvent(new Event('sklopi:plan-changed'));
    showToast(tx(builderState.esim ? 'eSIM dodat u procenu paketa.' : 'eSIM uklonjen iz procene.'));
  });
  alertBtn.addEventListener('click', () => {
    const pkg = computeCustomPackage(builderState, builderCtx());
    openAlertModal('builder', null, pkg.total);
  });
  document.addEventListener('sklopi:plan-breakdown', render);
  document.addEventListener('sklopi:lang', () => { if (!box.hidden) render(); });
  document.getElementById('currencySwitchBtn')?.addEventListener('click', () => setTimeout(() => { if (!box.hidden) render(); }, 0));
})();

/* ==========================================================
   MOJ PUT (#myTrip) — 13. ekran sa slike. Pregled trenutno izabranog
   plana (builderState + forma): stavke, ukupno, "Pogledaj detalje"
   (otvara builder) i "Preuzmi plan puta" (tekstualni fajl sa procenom
   i partnerskim linkovima). Dok korisnik ne izabere plan, prikazuje
   poruku i dugme ka 3 plana. "Završeni" je prazan (nema istorije).
========================================================== */
(function initMyTrip(){
  const root = document.getElementById('myTrip');
  const body = document.getElementById('mtBody');
  if (!root || !body) return;
  const KEY = 'sklopi_my_trip_v1';
  let ready = false, tab = 'active';
  // "Moj put" pamti IZABRAN plan: grad, izbore (let/hotel/auto/aktivnosti/eSIM), naziv plana i putne podatke
  // (polazak, datumi, putnici). Čuva se u pregledaču (localStorage) pa preživi osvežavanje; grad i izbori se NE
  // menjaju kad korisnik kasnije ukuca drugu destinaciju, a datumi/putnici prate formu dok je plan izabran.
  let trip = null;
  function persist(){ try { localStorage.setItem(KEY, JSON.stringify(trip)); } catch(e){} }
  function restore(){
    try {
      const t = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (t && typeof t.dest === 'string' && t.sel && t.ctx && /^\d{4}-\d{2}-\d{2}$/.test(t.ctx.from) && /^\d{4}-\d{2}-\d{2}$/.test(t.ctx.to)){
        trip = t; ready = true;
      }
    } catch(e){}
  }
  function formCtx(){ const c = builderCtx(); return {originCode:c.originCode, from:c.from, to:c.to, adults:c.adults}; }
  function snap(fromPlan){
    const c = builderCtx(), ap = window.SKLOPI_ACTIVE_PLAN;
    const own = fromPlan && ap && (ap.keepDest || !ap.dest || ap.dest === c.dest);
    trip = {dest:c.dest, sel:Object.assign({}, builderState), ctx:formCtx(), saved:false,
      title: own ? ap.title : '',
      photo: own && ap.photo ? ap.photo : ((window.SKLOPI_destPhoto && window.SKLOPI_destPhoto(c.dest, 300)) || '')};
    persist();
  }
  const isPast = () => !!trip && trip.ctx.to < todayStr();
  const money = n => currentCurrency === 'RSD' ? fmtEUR(n) : n.toLocaleString('de-DE') + ' \u20ac';
  function tripCtx(){
    const tc = trip.ctx, nights = nightsBetween(tc.from, tc.to);
    return {dest:trip.dest, originCode:tc.originCode, from:tc.from, to:tc.to, nights, days:nights, adults:tc.adults};
  }
  function summary(){
    const sel = trip.sel, ctx = tripCtx();
    const pkg = computeCustomPackage(sel, ctx);
    const rows = [];
    if (sel.includeFlight) rows.push(['\u2708', 'Let', pkg.flight.price]);
    if (sel.includeHotel) rows.push(['\u25a3', 'Hotel', pkg.hotel.price]);
    if (sel.activityCount > 0) rows.push(['\u25c7', 'Aktivnosti', pkg.activity.price]);
    rows.push(['\u25b1', 'Prevoz', sel.carPref === 'none' ? 0 : pkg.car.price + pkg.carExtras.price]);
    if (sel.esim) rows.push(['\ud83d\udcf6', 'eSIM', pkg.esimCost]);
    return {ctx, pkg, rows};
  }
  function headHtml(ctx){
    const photo = trip.photo ? trip.photo.replace(/w=\d+/, 'w=300') : '';
    return '<div class="mt-head">'
      + (photo ? '<span class="mt-thumb"><img src="' + escapeHtml(photo) + '" alt="" loading="lazy"></span>' : '')
      + '<div><h3>' + escapeHtml(cityLabel(ctx.dest)) + ' \u2013 ' + daysLabel(ctx.days) + '</h3>'
      + '<p>' + (trip.title ? escapeHtml(tx(trip.title)) + ' \u2022 ' : '') + escapeHtml(fmtDate(ctx.from) + ' \u2013 ' + fmtDate(ctx.to)) + ' \u2022 '
      + ctx.adults + ' ' + pluralWord('adult', ctx.adults) + '</p></div></div>';
  }
  function render(){
    root.querySelectorAll('.mt-tab').forEach(b => {
      b.classList.toggle('is-on', b.dataset.tab === tab);
      b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false');
    });
    if (tab === 'done'){
      if (ready && isPast()){          // putovanju je prošao datum povratka -> "Završeni"
        body.innerHTML = '<article class="mt-card">' + headHtml(tripCtx()) + '</article>'
          + '<button type="button" class="mt-link" id="mtRemove">' + tx('Ukloni plan') + '</button>';
        document.getElementById('mtRemove').addEventListener('click', removeTrip);
      } else {
        body.innerHTML = '<p class="mt-empty">' + tx('Još nemaš završenih putovanja.') + '</p>';
      }
      return;
    }
    if (!ready || isPast()){
      body.innerHTML = '<p class="mt-empty">' + tx('Još nisi sklopio put. Izaberi jedan od planova ili sastavi svoj paket.') + '</p>'
        + '<button type="button" class="btn-primary mt-btn" id="mtChoose">' + tx('Izaberi plan') + '</button>';
      document.getElementById('mtChoose').addEventListener('click', () => {
        if (window.SKLOPI_showDestPlans) window.SKLOPI_showDestPlans();
        else document.getElementById('destinationPlans')?.scrollIntoView({behavior:'smooth', block:'start'});
      });
      return;
    }
    const {ctx, pkg, rows} = summary();
    body.innerHTML = '<article class="mt-card">' + headHtml(ctx)
      + '<ul class="mt-rows">' + rows.map(r => '<li><span aria-hidden="true">' + r[0] + '</span><b>' + escapeHtml(tx(r[1])) + '</b><em>' + escapeHtml(money(r[2])) + '</em></li>').join('') + '</ul>'
      + '<p class="mt-total">' + tx('Ukupno: ') + '<b>' + escapeHtml(money(pkg.total)) + '</b></p>'
      + '<p class="mt-fine">' + tx('Ilustrativna procena za ') + ctx.adults + ' ' + pluralWord('adult', ctx.adults) + '.</p></article>'
      + '<button type="button" class="btn-primary mt-btn" id="mtDetails">' + tx('Pogledaj detalje') + '</button>'
      + '<button type="button" class="mt-link" id="mtSave"' + (trip.saved ? ' disabled' : '') + '>' + tx(trip.saved ? 'Sačuvano u nalogu \u2713' : 'Sačuvaj u nalog') + '</button>'
      + '<button type="button" class="mt-link" id="mtDownload">' + tx('Preuzmi plan puta') + '</button>'
      + '<button type="button" class="mt-link" id="mtRemove">' + tx('Ukloni plan') + '</button>';
    document.getElementById('mtDetails').addEventListener('click', () => {
      // Builder radi nad poljima forme i builderState — vrati ih na izabrani plan pre otvaranja.
      const set = (id, v) => { const el = document.getElementById(id); if (el && v != null && el.value !== String(v)){ el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); } };
      set('dest', trip.dest); set('dateFrom', trip.ctx.from); set('dateTo', trip.ctx.to); set('adults', trip.ctx.adults);
      if (typeof window.syncPaxDisplay === 'function') window.syncPaxDisplay();
      if (typeof window.syncDateDisplay === 'function') window.syncDateDisplay();
      Object.assign(builderState, trip.sel);
      renderFormUI();
      openControlPanel();
      document.getElementById('makeBuilderBtn').click();
      document.getElementById('builderPanel')?.scrollIntoView({behavior:'smooth', block:'start'});
    });
    document.getElementById('mtSave').addEventListener('click', saveToAccount);
    document.getElementById('mtDownload').addEventListener('click', download);
    document.getElementById('mtRemove').addEventListener('click', removeTrip);
  }
  function removeTrip(){
    trip = null; ready = false;
    try { localStorage.removeItem(KEY); } catch(e){}
    render();
  }
  // Isti zapis kao "Sačuvaj izlet" u builderu (selection.kind = 'builder'), pa ga postojeća lista
  // sačuvanih izleta i loadSavedTrip() otvaraju bez izmena. Traži prijavu.
  async function saveToAccount(){
    if (!trip || trip.saved) return;
    const user = await getCurrentUser();
    if (!user){ promptLogin(tx('Prijavi se da sačuvaš izlete')); return; }
    const {ctx, pkg} = summary(), sel = trip.sel;
    const summaryTags = [pkg.flight.name, sel.hotelStars + '\u2605 hotel',
      sel.carPref === 'none' ? 'Bez auta' : (sel.carPref === 'suv' ? 'SUV' : 'Mali auto'), sel.activityCount + ' aktivnosti'];
    try {
      const { error } = await sb.from('trips').insert({
        user_id: user.id, dest: ctx.dest, date_from: ctx.from, date_to: ctx.to, adults: ctx.adults,
        selection: {kind:'builder', builderState: Object.assign({}, sel), summaryTags, tierLabel: trip.title || 'Sopstveni izlet'},
        total: pkg.total
      });
      if (error) throw error;
      trip.saved = true; persist();
      renderSavedTrips();
      showToast('Izlet sačuvan (' + fmtEUR(pkg.total) + ').');
      render();
    } catch(err) {
      console.warn('[sklopi] čuvanje plana iz "Moj put" nije uspelo:', err.message);
      showToast('Čuvanje nije uspelo — pokušaj ponovo.');
    }
  }
  function download(){
    const {ctx, pkg, rows} = summary();
    const sel = trip.sel;
    const linkCtx = {dest:ctx.dest, originCode:ctx.originCode || 'Beograd', from:ctx.from, to:ctx.to, adults:ctx.adults,
      flightPref:sel.flightPref, hotelStars:sel.hotelStars, prioritizeLocation:sel.prioritizeLocation};
    const lines = ['SKLOPI \u2014 plan puta', '',
      cityLabel(ctx.dest) + ' \u2013 ' + daysLabel(ctx.days),
      ctx.from + ' do ' + ctx.to + ', putnika: ' + ctx.adults, ''];
    rows.forEach(r => lines.push(r[1] + ': ' + money(r[2])));
    lines.push('', 'Ukupno (ilustrativna procena): ' + money(pkg.total), '',
      'Rezervacija ide preko partnera (cena i dostupnost se proveravaju kod njih):');
    if (sel.includeFlight) lines.push('KAYAK (let): ' + buildAffiliateLink('flight', linkCtx));
    if (sel.includeHotel) lines.push('Booking.com (hotel): ' + buildAffiliateLink('hotel', linkCtx));
    if (sel.activityCount > 0) lines.push('Viator (aktivnosti): ' + buildAffiliateLink('activity', {dest:ctx.dest}));
    lines.push('', affDisc());
    const url = URL.createObjectURL(new Blob([lines.join('\n')], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url; link.download = 'sklopi-plan-puta.txt';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  root.querySelectorAll('.mt-tab').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
  document.addEventListener('sklopi:lang', render);
  document.addEventListener('sklopi:plan-changed', () => { snap(true); ready = true; render(); });
  document.addEventListener('sklopi:custom-plan', () => { snap(false); ready = true; render(); });
  document.addEventListener('sklopi:city-photo', () => {
    if (ready && trip && !trip.photo && window.SKLOPI_destPhoto){
      trip.photo = window.SKLOPI_destPhoto(trip.dest, 300) || '';
      if (trip.photo){ persist(); if (tab === 'active') render(); }
    }
  });
  // Datumi, polazak i broj putnika prate formu dok je plan izabran.
  ['dateFrom', 'dateTo', 'adults', 'origin'].forEach(id => document.getElementById(id)?.addEventListener('change', () => {
    if (ready && trip){ trip.ctx = formCtx(); trip.saved = false; persist(); render(); }
  }));
  document.getElementById('currencySwitchBtn')?.addEventListener('click', () => setTimeout(render, 0));
  restore();
  render();
})();

(function initFooterYear(){
  const y = document.getElementById('footYear');
  if (y) y.textContent = '\u00a9 ' + new Date().getFullYear();
})();

/* ==========================================================
   POPULARNE DESTINACIJE — statične kartice u HTML-u (SEO sadržaj
   vidljiv i bez JS-a); klik samo puni postojeću formu i pokreće
   isti runSearch() koji se koristi za "Pronađi najbolje putovanje".
   Namerno stoji PRE Supabase inicijalizacije ispod — ako config.js
   nedostane ili baci grešku, ovo i dalje treba da radi.
========================================================== */
document.querySelectorAll('.popular-dest-card').forEach(card => {
  card.addEventListener('click', () => {
    document.getElementById('dest').value = card.dataset.dest;
    if (window.SKLOPI_setSpotlight) window.SKLOPI_setSpotlight(card.dataset.dest, {generic:true, loose:true});
    if (!isMobileResults()) document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
    runSearch(false);
  });
});

/* ==========================================================
   REGIONALNI SIGNAL — "Popularno kod putnika iz [tvog grada]"
   umesto univerzalne top-liste. Ovo je uredničko, ručno sastavljeno
   po realnim navikama iz svakog grada (aerodrom, sezonski čarteri,
   praksa letenja preko bližeg stranog aerodroma) — NIJE uživo
   statistika i ne pretvaramo se da jeste. Ako grad iz polja "Polazak"
   nije prepoznat, ostaje originalni (Beograd-orijentisani) SEO sadržaj
   iz HTML-a, bez ikakve promene.
========================================================== */
const REGIONAL_POPULAR_DESTINATIONS = {
  'beograd': { genitiv:'Beograda', show:6, cards: [
    {dest:'Atina', name:'Atina, Grčka', desc:'Antika, ostrvski trajekti i vrhunska kuhinja — česti direktni letovi iz Beograda.'},
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum, Vatikan i ulična kuhinja — kratak let, grad se obilazi peške.'},
    {dest:'Barselona', name:'Barselona, Španija', desc:'Gaudijeva arhitektura, plaža i tapas bari — omiljena kombinacija grada i mora.'},
    {dest:'Budva', name:'Budva, Crna Gora', desc:'Najbliže more autom — 4-5h vožnje, stara varoš i duge plaže.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, bazari i Bosfor — pristupačan izlet van sezone.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji, kafei i božićne pijace zimi — praktičan gradski izlet za vikend.'},
    {dest:'Solun', name:'Solun, Grčka', desc:'More bez potrebe za letom — oko 6-7h vožnje, popularno van glavne sezone.'},
    {dest:'Budimpešta', name:'Budimpešta, Mađarska', desc:'Kratak let ili vožnja — kupatila, arhitektura i praktičan gradski izlet.'}
  ]},
  'novi sad': { genitiv:'Novog Sada', show:5, cards: [
    {dest:'Budimpešta', name:'Budimpešta, Mađarska', desc:'Oko 2h vožnje — low-cost letovi odatle su često jeftiniji nego iz Beograda.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Direktan voz i autobus iz Novog Sada — praktičan gradski izlet bez presedanja.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Za more i ostrva i dalje se najisplativije leti preko Beograda.'},
    {dest:'Budva', name:'Budva, Crna Gora', desc:'Najbliže more autom — stara varoš i duge plaže.'},
    {dest:'Zagreb', name:'Zagreb, Hrvatska', desc:'Kratka vožnja, praktičan vikend izlet uz adventski sadržaj zimi.'},
    {dest:'Solun', name:'Solun, Grčka', desc:'More bez potrebe za letom — preko Beograda ili direktno autom.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije — let preko Beograda.'}
  ]},
  'nis': { genitiv:'Niša', show:4, cards: [
    {dest:'Solun', name:'Solun, Grčka', desc:'Oko 3h vožnje — najbliže more za vikend izlet, bez potrebe za letom.'},
    {dest:'Skoplje', name:'Skoplje, Sev. Makedonija', desc:'Blizu, praktično autom za kraći izlet.'},
    {dest:'Antalija', name:'Antalija, Turska', desc:'Sezonski čarter letovi direktno sa aerodroma u Nišu, van glavne sezone jeftiniji.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Za većinu daljih destinacija, presedanje preko Beograda ili Istanbula je i dalje najisplativije.'},
    {dest:'Sofija', name:'Sofija, Bugarska', desc:'Blizu, praktično autom ili vozom za kraći izlet.'},
    {dest:'Budva', name:'Budva, Crna Gora', desc:'More autom — nešto duža vožnja, ali bez potrebe za letom.'}
  ]},
  'podgorica': { genitiv:'Podgorice', show:4, cards: [
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije — praktičan let sa podgoričkog aerodroma.'},
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum, Vatikan i ulična kuhinja — kratak let preko mora.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji i kafei — praktičan gradski izlet.'},
    {dest:'Barselona', name:'Barselona, Španija', desc:'Arhitektura, plaža i tapas bari.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Antika i ostrva — let preko mora.'},
    {dest:'Milano', name:'Milano, Italija', desc:'Moda, dizajn i kratak let preko mora.'}
  ]},
  'subotica': { genitiv:'Subotice', show:4, cards: [
    {dest:'Budimpešta', name:'Budimpešta, Mađarska', desc:'Manje od 3h vožnje i blizu granice — često praktičnija polazna tačka nego Beograd.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji, kafei i gradska šetnja — dostupan i preko Budimpešte.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Za more i ostrva, let preko Beograda je i dalje najisplativiji.'},
    {dest:'Zagreb', name:'Zagreb, Hrvatska', desc:'Kraća vožnja, praktičan vikend izlet.'},
    {dest:'Prag', name:'Prag, Češka', desc:'Arhitektura i pivnice — dostupan preko Budimpešte.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, let preko Beograda.'}
  ]},
  'kragujevac': { genitiv:'Kragujevca', show:4, cards: [
    {dest:'Atina', name:'Atina, Grčka', desc:'Antika i ostrva — let preko Beograda, oko 1h vožnje do aerodroma.'},
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum i ulična kuhinja — kratak let iz Beograda.'},
    {dest:'Budva', name:'Budva, Crna Gora', desc:'Najbliže more autom — oko 3h vožnje.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, pristupačan izlet van sezone.'},
    {dest:'Barselona', name:'Barselona, Španija', desc:'Arhitektura, plaža i tapas bari — let preko Beograda.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji i kafei — praktičan gradski izlet.'}
  ]},
  'kraljevo': { genitiv:'Kraljeva', show:4, cards: [
    {dest:'Budva', name:'Budva, Crna Gora', desc:'Jedna od bližih ruta do mora sa juga Srbije — oko 3h vožnje.'},
    {dest:'Solun', name:'Solun, Grčka', desc:'Preko Niša, oko 4h vožnje — more bez potrebe za letom.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Za ostrva i dalje, let preko Beograda ili Niša.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, pristupačan izlet van sezone.'},
    {dest:'Podgorica', name:'Podgorica, Crna Gora', desc:'Alternativni pravac za let ka moru ili dalje.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji i kafei — let preko Beograda.'}
  ]},
  'novi pazar': { genitiv:'Novog Pazara', show:4, cards: [
    {dest:'Budva', name:'Budva, Crna Gora', desc:'Preko Rožaja — jedna od kraćih ruta do mora sa juga Srbije.'},
    {dest:'Podgorica', name:'Podgorica, Crna Gora', desc:'Bliži aerodrom za neke pravce nego Beograd — vredi uporediti oba.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, pristupačan izlet van sezone.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Za ostrva, let preko Beograda ili Podgorice.'},
    {dest:'Sarajevo', name:'Sarajevo, BiH', desc:'Blizu, praktično autom za kraći izlet.'},
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum i ulična kuhinja — let preko Beograda ili Podgorice.'}
  ]},
  'banja luka': { genitiv:'Banje Luke', show:4, cards: [
    {dest:'Zagreb', name:'Zagreb, Hrvatska', desc:'Oko 2h vožnje — mnogo širi izbor letova nego banjalučki aerodrom.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji i kafei — praktičan gradski izlet.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, pristupačan izlet van sezone.'},
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum, Vatikan i ulična kuhinja.'},
    {dest:'Budimpešta', name:'Budimpešta, Mađarska', desc:'Šira mreža letova nego banjalučki aerodrom, oko 4-5h vožnje.'},
    {dest:'Barselona', name:'Barselona, Španija', desc:'Arhitektura, plaža i tapas bari.'}
  ]},
  'sarajevo': { genitiv:'Sarajeva', show:4, cards: [
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije — česti direktni letovi sa sarajevskog aerodroma.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji, kafei i gradska šetnja — kratak let.'},
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum, Vatikan i ulična kuhinja.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Antika, ostrva i vrhunska kuhinja.'},
    {dest:'Barselona', name:'Barselona, Španija', desc:'Arhitektura, plaža i tapas bari.'},
    {dest:'Budimpešta', name:'Budimpešta, Mađarska', desc:'Kratak let ili vožnja preko Hrvatske.'}
  ]},
  'skoplje': { genitiv:'Skoplja', show:4, cards: [
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum i ulična kuhinja — česti low-cost letovi sa skopskog aerodroma.'},
    {dest:'Barselona', name:'Barselona, Španija', desc:'Arhitektura, plaža i tapas bari.'},
    {dest:'Solun', name:'Solun, Grčka', desc:'Blizu, praktično i autom — oko 3h vožnje.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, pristupačan izlet van sezone.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Antika, ostrva i vrhunska kuhinja.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji, kafei i gradska šetnja.'}
  ]}
};
/* ==========================================================
   Podrazumevani ("Gde bi sledeće?") skup — kad polje Polazak nije
   prepoznato ili je prazno. Umesto fiksnih 6 kartica iz HTML-a,
   biramo dnevno-rotirajući podskup iz šireg pool-a (ispod), preko
   dailyPick() — isto za sve posetioce istog dana, drugačije sutra.
   Prevodi idu preko t()/I18N (pd_* ključevi), da poštuje SR/EN.
========================================================== */
const DEFAULT_POPULAR_DEST_POOL = [
  {dest:'Atina', name:'Atina', desc:'Antika, kultura i more — idealan mediteranski city break.', meta:'Grčka · 1h 20m', price:'od 247 €', category:'city', image:'https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=500&q=82'},
  {dest:'Istanbul', name:'Istanbul', desc:'Spoj Evrope i Azije, Bosfor i bogata gradska scena.', meta:'Turska · 2h', price:'od 199 €', category:'city', image:'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=500&q=82'},
  {dest:'Krf', name:'Krf', desc:'Mirnije uvale, more i mediteranski ritam za odmor.', meta:'Grčka · 1h 20m', price:'od 229 €', category:'nature', image:'https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?auto=format&fit=crop&w=500&q=82'},
  {dest:'Pariz', name:'Pariz', desc:'Muzeji, arhitektura i gradske šetnje.', meta:'Francuska · 2h 30m', price:'od 349 €', category:'city', image:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=500&q=82'},
  {dest:'Lisabon', name:'Lisabon', desc:'Vidikovci, tramvaji i Atlantski vazduh.', meta:'Portugal · 3h', price:'od 299 €', category:'city', image:'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=500&q=82'}
];
const POPULAR_DEST_IMAGES = Object.fromEntries(DEFAULT_POPULAR_DEST_POOL.map(x => [normalizeSr(x.dest), x.image]));
const POPULAR_DEST_META = {
  'atina':['Grčka · 1h 20m','od 247 €','city'], 'istanbul':['Turska · 2h','od 199 €','city'],
  'krf':['Grčka · 1h 20m','od 229 €','nature'], 'pariz':['Francuska · 2h 30m','od 349 €','city'],
  'lisabon':['Portugal · 3h','od 299 €','city'], 'rim':['Italija · 1h 40m','od 239 €','city'],
  'barselona':['Španija · 2h 40m','od 289 €','city'], 'budva':['Crna Gora · 1h 10m','od 159 €','weekend'],
  'bec':['Austrija · 1h 25m','od 219 €','city'], 'beč':['Austrija · 1h 25m','od 219 €','city'],
  'solun':['Grčka · 1h 15m','od 189 €','weekend'], 'budimpesta':['Mađarska · 1h 30m','od 179 €','city'],
  'prag':['Češka · 1h 45m','od 259 €','city'], 'zagreb':['Hrvatska · 1h','od 169 €','weekend']
};
// Kartice "Popularne destinacije": naziv države i "od" su fiksni na srpskom u podacima -- prevodi se pri prikazu.
function popularMetaLabel(m){
  const parts = String(m || '').split(/\s*[\u00B7\u2022]\s*/);
  return parts.length > 1 ? [countryLabel(parts[0])].concat(parts.slice(1)).join(' \u00B7 ') : String(m || '');
}
function popularPriceLabel(pr){ return String(pr || '').replace(/^od\s+/i, () => tx('od ')); }
function popularCardData(card){
  const key = normalizeSr(card.dest || '');
  const meta = POPULAR_DEST_META[key] || [card.name || '', '', 'all'];
  return {
    dest: card.dest || '',
    name: cityLabel(card.name || t(card.nameKey || '') || card.dest || ''),
    desc: card.desc || (card.descKey ? t(card.descKey) : ''),
    meta: popularMetaLabel(card.meta || meta[0]),
    price: popularPriceLabel(card.price || meta[1]),
    category: card.category || meta[2] || 'all',
    image: card.image || POPULAR_DEST_IMAGES[key] || 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=500&q=82'
  };
}
function popularCardHtml(card){
  const c = popularCardData(card);
  return '<button type="button" class="popular-dest-card" data-dest="' + escapeHtml(c.dest) + '" data-category="' + escapeHtml(c.category) + '">'
    + '<span class="pd-thumb"><img src="' + escapeHtml(c.image) + '" alt="' + escapeHtml(c.name) + '" loading="lazy"></span>'
    + '<span class="pd-copy"><span class="pd-name">' + escapeHtml(c.name) + '</span>'
    + '<span class="pd-meta">' + escapeHtml(c.meta) + '</span>'
    + '<span class="pd-price">' + escapeHtml(c.price) + '</span></span>'
    + '<span class="pd-arrow" aria-hidden="true">›</span>'
    + '</button>';
}
function attachPopularDestCardHandlers(grid){
  grid.querySelectorAll('.popular-dest-card').forEach(card => {
    card.addEventListener('click', () => {
      document.getElementById('dest').value = card.dataset.dest;
      if (window.SKLOPI_setSpotlight) window.SKLOPI_setSpotlight(card.dataset.dest, {generic:true, loose:true});
      if (!isMobileResults()) document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
      runSearch(false);
    });
  });
  applyPopularDestFilters();
}
function renderDefaultPopularDestinations(){
  const grid = document.getElementById('popularDestGrid');
  const head = document.getElementById('popularDestHead');
  const eyebrow = document.getElementById('popularDestEyebrow');
  if (!grid || !head) return;
  head.textContent = t('h2_popular_dest');
  if (eyebrow) eyebrow.textContent = t('eyebrow_ideas');
  grid.innerHTML = DEFAULT_POPULAR_DEST_POOL.map(c => popularCardHtml(c)).join('');
  attachPopularDestCardHandlers(grid);
}
function renderRegionalPopularDestinations(originRaw){
  const grid = document.getElementById('popularDestGrid');
  const head = document.getElementById('popularDestHead');
  const eyebrow = document.getElementById('popularDestEyebrow');
  if (!grid || !head) return;
  const norm = normalizeSr((originRaw || '').trim());
  let bucket = null;
  let matchedKey = null;
  if (norm){
    for (const key in REGIONAL_POPULAR_DESTINATIONS){
      if (norm === key || norm.startsWith(key + ' ') || norm.startsWith(key + ',') || norm.includes(' ' + key) ){
        bucket = REGIONAL_POPULAR_DESTINATIONS[key];
        matchedKey = key;
        break;
      }
    }
  }
  if (!bucket){
    // Nepoznat ili prazan grad — vrati podrazumevani (dnevno-rotirajući) sadržaj, ne ostavljaj "zaglavljen" prethodni grad.
    renderDefaultPopularDestinations();
    return;
  }
  head.textContent = 'Popularno kod putnika iz ' + bucket.genitiv;
  if (eyebrow) eyebrow.textContent = 'Predlozi prilagođeni tvom polasku';
  const picks = dailyPick(bucket.cards, bucket.show || bucket.cards.length, matchedKey);
  grid.innerHTML = picks.map(c => popularCardHtml(c)).join('');
  attachPopularDestCardHandlers(grid);
}
const popularDestSearch = document.getElementById('popularDestSearch');
const popularDestFilters = document.querySelectorAll('[data-popular-filter]');
function applyPopularDestFilters(){
  const grid = document.getElementById('popularDestGrid');
  if (!grid) return;
  const query = normalizeSr((popularDestSearch?.value || '').trim());
  const active = document.querySelector('[data-popular-filter].is-active')?.dataset.popularFilter || 'all';
  grid.querySelectorAll('.popular-dest-card').forEach(card => {
    const hay = normalizeSr(card.textContent || '');
    const category = card.dataset.category || 'all';
    const matchesQuery = !query || card.dataset.search === '1' || hay.includes(query);
    const matchesFilter = active === 'all' || category === active;
    card.hidden = !(matchesQuery && matchesFilter);
  });
}
/* Pretraga destinacija: traži kroz CELU listu (POPULAR_DESTINATIONS), a ne samo
   kroz 5 kartica koje su trenutno prikazane. Prazno polje vraća regionalni/podrazumevani prikaz. */
function renderPopularSearchResults(rawQuery){
  const grid = document.getElementById('popularDestGrid');
  if (!grid) return;
  const q = (rawQuery || '').trim();
  if (!q){
    renderRegionalPopularDestinations((document.getElementById('origin') || {}).value || '');
    return;
  }
  popularDestFilters.forEach(b => b.classList.toggle('is-active', b.dataset.popularFilter === 'all'));
  const matches = matchPopularDestinations(q).slice(0, 8);
  if (!matches.length){
    grid.innerHTML = '<div class="popular-empty"><p>' + escapeHtml(tx('Nema rezultata za') + ' „' + q + '“') + '</p>'
      + '<button type="button" class="btn-secondary" id="popularEmptySearchBtn">' + escapeHtml(tx('Pretraži ovu destinaciju')) + '</button></div>';
    document.getElementById('popularEmptySearchBtn')?.addEventListener('click', () => {
      document.getElementById('dest').value = q;
      if (!isMobileResults()) document.getElementById('results')?.scrollIntoView({behavior:'smooth', block:'start'});
      runSearch(false);
    });
    return;
  }
  grid.innerHTML = matches.map(d => {
    const meta = POPULAR_DEST_META[normalizeSr(d.name)];
    return popularCardHtml({dest:d.name, name:d.name, meta: meta ? meta[0] : (d.extra || ''), price: meta ? meta[1] : '', category: meta ? meta[2] : 'all'});
  }).join('');
  grid.querySelectorAll('.popular-dest-card').forEach(c => { c.dataset.search = '1'; });
  attachPopularDestCardHandlers(grid);
}
popularDestSearch?.addEventListener('input', () => renderPopularSearchResults(popularDestSearch.value));
popularDestSearch?.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const grid = document.getElementById('popularDestGrid');
  const first = grid && grid.querySelector('.popular-dest-card:not([hidden])');
  if (first) first.click();
  else document.getElementById('popularEmptySearchBtn')?.click();
  popularDestSearch.blur();
});
popularDestFilters.forEach(btn => btn.addEventListener('click', () => {
  popularDestFilters.forEach(b => b.classList.toggle('is-active', b === btn));
  applyPopularDestFilters();
}));

let _originRegionalTimer = null;
const originInputForRegional = document.getElementById('origin');
if (originInputForRegional){
  originInputForRegional.addEventListener('input', (e) => {
    clearTimeout(_originRegionalTimer);
    const val = e.target.value;
    _originRegionalTimer = setTimeout(() => {
      renderRegionalPopularDestinations(val);
      renderOriginAirportWarning(val);
      updateCtaBanner();
    }, 400);
  });
  if (originInputForRegional.value){
    renderRegionalPopularDestinations(originInputForRegional.value);
    renderOriginAirportWarning(originInputForRegional.value);
    updateCtaBanner();
  } else {
    renderDefaultPopularDestinations();
  }
}
let _destAirportTimer = null;
let _spotTimer = null;
const destInputForAirport = document.getElementById('dest');
if (destInputForAirport){
  destInputForAirport.addEventListener('input', (e) => {
    // Reordering nekoliko DOM elemenata je jeftina operacija — radi se
    // odmah, na svaki taster, bez debounce-a. Debounce ostaje samo za
    // renderDestAirportWarning (teža provera protiv AIRPORT_DB), jer
    // deljenje istog tajmera za oba dovodi do toga da reorder radi
    // "na sreću" — samo kad pauza između tastera bude duža od 400ms.
    syncDestTypingWithPopular(e.target.value);
    if (window.SKLOPI_setSpotlight){
      // Urednički gradovi odmah; bilo koja druga poznata destinacija (lista) posle pauze u kucanju.
      window.SKLOPI_setSpotlight(e.target.value);
      clearTimeout(_spotTimer);
      const v = e.target.value;
      _spotTimer = setTimeout(() => window.SKLOPI_setSpotlight(v, {generic:true}), 600);
    }
    clearTimeout(_destAirportTimer);
    const val = e.target.value;
    _destAirportTimer = setTimeout(() => renderDestAirportWarning(val), 400);
  });
  if (destInputForAirport.value) renderDestAirportWarning(destInputForAirport.value);
  // Izbor iz predloga / Enter / napuštanje polja: bilo koji upisan grad dobija spotlight i 3 plana.
  destInputForAirport.addEventListener('change', e => {
    if (window.SKLOPI_setSpotlight) window.SKLOPI_setSpotlight(e.target.value, {generic:true, loose:true});
  });
}

/* ==========================================================
   Dok kucaš u "Destinacija", ako se poklopi sa jednom od kartica
   u "Gde bi sledeće?" gridu — ta kartica skoči na prvo mesto u
   tabeli. CTA baner ("X te čeka.") i stavka "poslednja destinacija"
   se ažuriraju preko updateCtaBanner()/updateStatLastPreview() ispod —
   ODAKLE (Polazak) ima prioritet nad Destinacijom: ako je Polazak
   popunjen, baner prati top preporuku iz regionalnog grida; tek kad
   je Polazak prazan, baner prati ono što je ukucano u Destinaciju.
   Stavka "poslednja destinacija" prati isključivo Destinaciju —
   dok se kuca prikazuje uneti tekst, a kad se polje isprazni vraća
   se na stvarnu (deljenu) poslednju pretragu.
========================================================== */
function syncDestTypingWithPopular(destRaw){
  const grid = document.getElementById('popularDestGrid');
  const val = normalizeSr((destRaw || '').trim());
  if (grid && val){
    const cards = Array.from(grid.querySelectorAll('.popular-dest-card'));
    const match = cards.find(card => normalizeSr(card.dataset.dest || '') === val)
      || cards.find(card => normalizeSr(card.dataset.dest || '').startsWith(val));
    if (match && grid.firstElementChild !== match) grid.insertBefore(match, grid.firstElementChild);
  }
  updateStatLastPreview(destRaw);
  updateCtaBanner();
}
function updateStatLastPreview(destRaw){
  const statLastEl = document.getElementById('statLast');
  if (!statLastEl) return;
  const typed = (destRaw || '').trim();
  statLastEl.textContent = cityLabelWithPrefix(typed || state.lastDest || STAT_LAST_DEST_FALLBACK);
}
function pickCtaDestFromTyping(){
  const originVal = (document.getElementById('origin') || {}).value || '';
  const destVal = (document.getElementById('dest') || {}).value || '';
  const grid = document.getElementById('popularDestGrid');
  if (originVal.trim()){
    if (grid && grid.firstElementChild && grid.firstElementChild.dataset.dest) return grid.firstElementChild.dataset.dest;
    return null;
  }
  if (destVal.trim()){
    const norm = normalizeSr(destVal.trim());
    if (grid){
      const cards = Array.from(grid.querySelectorAll('.popular-dest-card'));
      const named = cards.find(c => normalizeSr(c.dataset.dest || '') === norm)
        || cards.find(c => normalizeSr(c.dataset.dest || '').startsWith(norm));
      if (named) return named.dataset.dest;
    }
    return destVal.trim();
  }
  return null;
}
function updateCtaBanner(){
  const ctaTitleEl = document.getElementById('ctaTitle');
  const ctaDescEl = document.getElementById('ctaDesc');
  const ctaDest = pickCtaDestFromTyping() || state.lastDest || '';
  if (ctaTitleEl){
    ctaTitleEl.textContent = ctaDest
      ? tf('cta_title', {dest: cityLabel(ctaDest)})
      : t('cta_next_destination');
  }
  if (ctaDescEl) ctaDescEl.textContent = ctaCopy(ctaDest);
}

/* ==========================================================
   UPOZORENJE: grad bez aerodroma — predlaže najbliži pravi
   aerodrom umesto grada koji ga uopšte nema, direktno u samoj
   formi za pretragu (ne tek u rezultatima). Radi na OBA polja
   (Polazak i Destinacija), nad istom AIRPORT_DB bazom iznad u
   fajlu. Uredničko znanje o geografiji, ne uživo podatak.
   Prikazuje se ISKLJUČIVO kad je toggle "Letovi" uključen — u
   Smeštaj/R&C/Aktivnost pretragama nema leta, pa napomena o
   aerodromu nema smisla tu.
========================================================== */
function isFlightToggleOn(){
  const el = document.querySelector('.toggle[data-t="flight"]');
  return !!(el && el.classList.contains('on'));
}
function renderAirportWarning(cityRaw, boxId, inputId){
  const box = document.getElementById(boxId);
  if (!box) return;
  if (!isFlightToggleOn()){ box.innerHTML = ''; return; }
  const info = airportInfoFor(cityRaw);
  if (!info || info.hasAirport || !info.nearest){ box.innerHTML = ''; return; }
  const btnId = boxId + 'UseNearestBtn';
  box.innerHTML = '<div class="origin-airport-warning">✈️ ' + escapeHtml(airportNoteText(info))
    + '<br><button type="button" id="' + btnId + '">' + escapeHtml(tf('airport_use_instead', {near: cityLabel(info.nearest)})) + '</button></div>';
  const btn = document.getElementById(btnId);
  if (btn) btn.addEventListener('click', () => {
    const inputEl = document.getElementById(inputId);
    inputEl.value = info.nearest;
    inputEl.dispatchEvent(new Event('input', {bubbles:true}));
    box.innerHTML = '';
  });
}
function renderOriginAirportWarning(originRaw){
  renderAirportWarning(originRaw, 'originAirportWarning', 'origin');
}
function renderDestAirportWarning(destRaw){
  renderAirportWarning(destRaw, 'destAirportWarning', 'dest');
}
// Upozorenje se iscrtava jednom (kad korisnik kuca) — posle promene jezika
// ostalo bi na starom, pa ga osveži.
const _prevOnLangChangeAirport = window.onLangChange;
window.onLangChange = function(lang){
  if (typeof _prevOnLangChangeAirport === 'function') _prevOnLangChangeAirport(lang);
  const o = document.getElementById('origin'), d = document.getElementById('dest');
  if (o && o.value) renderOriginAirportWarning(o.value);
  if (d && d.value) renderDestAirportWarning(d.value);
};

/* ==========================================================
   "ISPLATI LI SE LET PREKO DRUGOG AERODROMA?" — savet u rezultatima
   pretrage za gradove gde je poznata, realna praksa da je jeftinije/
   češće leteti preko obližnjeg stranog aerodroma nego iz sopstvenog
   grada. Uredničko znanje (kao i regionalni signal iznad), ne uživo
   podaci o cenama — zato namerno bez konkretnih brojki koje bismo
   morali da dokazujemo.
========================================================== */
function matchOriginCityKey(originRaw, keysObject){
  const norm = normalizeSr((originRaw || '').trim());
  if (!norm) return null;
  for (const key in keysObject){
    if (norm === key || norm.startsWith(key + ' ') || norm.startsWith(key + ',') || norm.includes(' ' + key)){
      return key;
    }
  }
  return null;
}
const ALT_AIRPORT_NOTES = {
  'novi sad': 'Budimpešta i Beč su oko 2h vožnje od Novog Sada — low-cost aviokompanije tamo često lete češće i jeftinije nego iz Beograda, pa se isplati uporediti pre rezervacije.',
  'nis': 'Solun i Skoplje su 2-3h vožnje od Niša i imaju širu mrežu low-cost letova nego niški aerodrom — vredi uporediti tu cenu sa letom iz Beograda ili sezonskim čarterom direktno iz Niša.',
  'kragujevac': 'Beograd je najbliži veliki aerodrom (oko 1h vožnje) — za širi izbor i niže cene, isplati se poći odatle umesto tražiti direktan let iz manjeg grada.',
  'subotica': 'Subotica je blizu mađarske granice — Budimpešta (oko 2h30 vožnje) ima mnogo širu mrežu low-cost letova i često je isplativija polazna tačka nego Beograd.',
  'kraljevo': 'Kraljevo nema svoj aerodrom — Beograd (oko 2h) ili Niš (oko 1h) su najbliže polazne tačke, u zavisnosti od pravca leta. Vredi uporediti oba pre rezervacije.',
  'novi pazar': 'Novi Pazar nema svoj aerodrom — za neke pravce je Podgorica bliža i praktičnija polazna tačka nego Beograd. Vredi uporediti obe opcije pre rezervacije.',
  'banja luka': 'Banjalučki aerodrom ima ograničen broj linija — Zagreb (oko 2h vožnje) često nudi mnogo širi izbor letova i niže cene.'
};
function altAirportNoteFor(originRaw){
  const key = matchOriginCityKey(originRaw, ALT_AIRPORT_NOTES);
  return key ? ALT_AIRPORT_NOTES[key] : null;
}

/* ==========================================================
   "PAZI NA KOJI AERODROM SLEŽEŠ" — uredničke napomene za evropske
   gradove gde low-cost aviokompanije često slede na aerodrom daleko
   od centra grada (isti pod-brend imena grada, ali sat-dva vožnje
   dalje). Namerno SAMO Evropa — stabilna, opštepoznata geografska
   činjenica, ne uživo podatak, pa je bezbedno da bude urednička.
========================================================== */
const DEST_AIRPORT_NOTES = {
  'london': 'London ima više aerodroma — Hitrou je najbliži centru, ali low-cost kompanije često slede na Stansted ili Luton, 45-75 minuta dalje od grada. Proveri tačan aerodrom pre nego što planiraš prevoz do centra.',
  'pariz': 'Pariz ima tri aerodroma — Šarl de Gol i Orli su blizu grada, ali Ryanair i slične kompanije često koriste Bove (Beauvais), oko 85km severno, sa transferom od preko sat vremena do centra.',
  'brisel': 'Brisel ima glavni aerodrom blizu grada, ali low-cost letovi često slede u Šarlroa, oko 50km južnije — računaj dodatni sat vožnje i trošak prevoza do centra.',
  'frankfurt': 'Frankfurt ima dva aerodroma pod sličnim imenom — glavni je blizu grada, dok je Han (Hahn) oko 120km zapadno, bliže Luksemburgu nego Frankfurtu. Ryanair često leti baš tamo, sa transferom i do 2h.',
  'milano': 'Milano ima tri aerodroma — Malpensa i Linate su praktični, ali Ryanair često leti u Bergamo, oko 45km od centra, sa transferom od preko sat vremena.',
  'barselona': 'Barselona ima glavni aerodrom blizu grada (El Prat), ali neki low-cost letovi slede u Đironu ili Reus, stotinak kilometara dalje, sa transferom od preko sat vremena.',
  'rim': 'Rim ima dva aerodroma — Fjumičino (glavni, malo dalji od centra) i Čampino (bliži centru, manji, koriste ga neke low-cost kompanije).',
  'stokholm': 'Stokholm ima glavni aerodrom Arlanda, ali Ryanair često leti u Skavstu, oko 100km južnije — transfer do centra traje i do sat i po.',
  'oslo': 'Oslo ima glavni aerodrom Gardermoen, ali neki low-cost letovi ka "Oslu" slede u Torp kod Sandefjorda, oko 110km južnije — transfer je i do 2h.',
  'kopenhagen': 'Neki letovi oglašeni ka "Kopenhagenu" zapravo slede u Malme, u Švedskoj, s druge strane mosta — računaj dodatno vreme za prelazak i eventualnu graničnu kontrolu.'
};
function destAirportNoteFor(destRaw){
  const norm = normalizeSr((destRaw || '').trim());
  if (!norm) return null;
  for (const key in DEST_AIRPORT_NOTES){
    if (norm === key || norm.startsWith(key)) return DEST_AIRPORT_NOTES[key];
  }
  return null;
}

/* ==========================================================
   "RAZMISLI I O AUTOBUSU" — alternativa prevoza za bliske regionalne
   destinacije koje veliki deo putnika iz Srbije uglavnom i onako radi
   autobusom (crnogorsko primorje, BiH, Severna Makedonija), a nijedan
   klasičan OTA/metasearch ovo ne poredi sa letom. Namerno samo
   destinacije do ~8h vožnje — dalje od toga autobus prestaje da bude
   realna alternativa letu. Cene/trajanje su ilustrativna procena (isti
   status kao i ostatak sajta u razvoju), ne uživo podatak prevoznika. */
const BUS_TRAIN_ROUTES = {
  'Budva':{hours:7, price:26}, 'Kotor':{hours:7, price:26}, 'Herceg Novi':{hours:8, price:28},
  'Igalo':{hours:8, price:28}, 'Bar':{hours:6.5, price:25}, 'Tivat':{hours:7, price:27},
  'Petrovac':{hours:7, price:26}, 'Sutomore':{hours:6.5, price:25}, 'Ulcinj':{hours:7.5, price:27},
  'Perast':{hours:7, price:26}, 'Risan':{hours:7, price:26}, 'Podgorica':{hours:5.5, price:22},
  'Sarajevo':{hours:6, price:24}, 'Mostar':{hours:7, price:26}, 'Banja Luka':{hours:4.5, price:20},
  'Skoplje':{hours:4, price:18}, 'Ohrid':{hours:6.5, price:24}
};
function busTrainNoteFor(destRaw, adults){
  const canonical = resolveCanonicalDestName(destRaw);
  const route = BUS_TRAIN_ROUTES[canonical];
  if (!route) return null;
  const n = Math.max(1, Number(adults) || 1);
  const oneWay = Math.round(route.price * n);
  const roundTrip = Math.round(route.price * n * 1.8);
  return 'Ovo je oko ' + route.hours + 'h vožnje autobusom iz Srbije (npr. Lasta, FlixBus, Ekol) — procena cene je oko '
    + fmtEUR(route.price) + ' po osobi u jednom pravcu. Za ' + n + ' ' + passengerLabel(n) + ' to je otprilike ' + fmtEUR(oneWay)
    + ' u jednom pravcu, odnosno grubo ' + fmtEUR(roundTrip) + ' povratno. Za kraće izlete i manje grupe ovo često izađe jeftinije od leta — vredi uporediti pre nego što rezervišeš.';
}

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
let sb = null;
try {
  if (window.supabase && window.SKLOPI_SUPABASE_URL && window.SKLOPI_SUPABASE_KEY) {
    sb = window.supabase.createClient(window.SKLOPI_SUPABASE_URL, window.SKLOPI_SUPABASE_KEY);
  } else {
    console.warn('[sklopi] Supabase konfiguracija (config.js) nije pronađena — nalozi i sačuvani izleti su isključeni, ostatak sajta radi normalno.');
  }
} catch (err) {
  console.warn('[sklopi] Supabase inicijalizacija nije uspela:', err.message);
  sb = null;
}

/* ---- Deljeni (globalni) brojači — tabela "site_stats", jedan red (id=1).
   Ako Supabase nije dostupan ili tabela/funkcije ne postoje, ostajemo na
   lokalnom (localStorage) brojaču koji je već učitan preko loadStats(). ---- */
async function loadStatsFromSupabase(){
  if (!sb) return;
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
loadStatsFromSupabase();

/* ---- Trenutni korisnik (keširano da ne zovemo getSession na svaki klik) ---- */
let _cachedUser = undefined; // undefined = još nije provereno, null = nije prijavljen
async function getCurrentUser(){
  if (!sb) return null;
  if (_cachedUser !== undefined) return _cachedUser;
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

if (sb) {
  sb.auth.onAuthStateChange((_event, session) => {
    _cachedUser = session ? session.user : null;
    renderSavedTrips();
    renderAccountMenu();
  });
}

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
  if (!sb) { bar.innerHTML = ''; return; }

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
    if (openBtn) openBtn.addEventListener('click', () => { _authBarExpanded = true; renderAuthBar(user); });
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

  if (!sb) {
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
  if (!sb) return;
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

  if (!sb) {
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
  if (!sb) {
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
      + '</div>';
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
    + '</div>';
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

/* ==========================================================
   "PRILAGODI SVOJ PLAN" — modal koji se otvara klikom na Start
   Nije nezavisan od buildera ("Želiš više kontrole?" sekcije ispod) —
   to je bio izvor bug-a. Oba UI-ja dele ISTO stanje (builderState);
   polja ovog modala su ožičena zajedno sa panelovim gore
   (wireFormFields/renderFormUI). Klik na "Nastavi" prevodi ono što se
   realno odražava na gotove ponude (auto/aktivnosti uključeni ili ne)
   u toggle-row iznad forme, pa pokreće istu pretragu koja bi se
   pokrenula i ranije klikom na Start — samo sad odmah otkriva sve
   3 kartice, bez dodatnog klika na "Nastavi" na plan-kartici.
========================================================== */
function openStartPrefsModal(){
  // Pre otvaranja, ponovo iscrtaj oba UI-ja iz builderState — bez ovoga
  // modal ne bi prikazao stanje ako je builderState u međuvremenu
  // promenjen na neki drugi način (npr. učitavanjem sačuvanog izleta).
  renderFormUI();
  document.getElementById('startPrefsBackdrop').classList.add('open');
  document.getElementById('startPrefsModal').classList.add('open');
  guardOverlayOpen('startPrefs', closeStartPrefsModal);
}
function requestCloseStartPrefsModal(){
  if (!guardOverlayRequestClose('startPrefs')) closeStartPrefsModal();
}
function closeStartPrefsModal(){
  document.getElementById('startPrefsBackdrop').classList.remove('open');
  document.getElementById('startPrefsModal').classList.remove('open');
  // Kartica "Tvoj izlet" (ako je bila premeštena unutar modala) vraća se
  // tačno na svoje originalno mesto — stanje samo (builderState) nije
  // trebalo posebno snimati, jer modal njime i direktno upravlja.
  restoreBuilderSummaryPosition();
}
document.getElementById('startPrefsClose').addEventListener('click', requestCloseStartPrefsModal);
document.getElementById('startPrefsBackdrop').addEventListener('click', requestCloseStartPrefsModal);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('startPrefsModal').classList.contains('open')) requestCloseStartPrefsModal();
});

// Polja ovog modala (let/hotel/auto/aktivnosti/putarine/taksa/budžet) su
// ožičena zajedno sa panelovim ekvivalentima gore, preko wireFormFields() —
// vidi "JEDINSTVENO STANJE FORME". Ovde ostaje samo ono što je specifično
// za PONAŠANJE modala (otvaranje/zatvaranje, "Napravi izlet", "Nastavi").

// Postavlja "on" toggle u transport-row-u SAMO ako trenutno nije već u
// traženom stanju — izbegava suvišan click event (i, za let, suvišan
// updateOriginVisibility poziv) kad se ništa ne menja.
function setTransportToggle(dataT, shouldBeOn){
  const el = document.querySelector('.toggle[data-t="' + dataT + '"]');
  if (!el) return;
  const isOn = el.classList.contains('on');
  if (isOn !== shouldBeOn) el.click();
}

// Dugme "Napravi izlet" UNUTAR "Prilagodi svoj plan" modala (iznad
// "Nastavi") — umesto da vodi na posebnu sekciju niže na strani, kartica
// "Tvoj izlet" (#builderSummary — ista, sa svom svojom logikom: optimizuj/
// sačuvaj/javi mi/rezerviši stavku) se privremeno premesti UNUTAR ovog
// modala i tu se i računa, tako da je sve — izbori i rezultat — jedna
// jedinstvena kartica koja se otvara klikom na Start. Vraća se na svoje
// originalno mesto kad se modal zatvori (restoreBuilderSummaryPosition).
document.getElementById('spMakeBtn').addEventListener('click', () => {
  const destInput = document.getElementById('dest');
  // Ranije se proveravala SAMO destinacija — polazak (ako je let uključen),
  // datumi i broj putnika su mogli ostati prazni/nepotvrđeni, pa je izlet
  // pravljen na osnovu nepotpunog unosa. Ista provera kao za pretragu.
  const check = validateSearchInputs();
  if (!check.ok){ showToast(check.msg); focusSearchField(check.focus); return; }

  trackFunnelEvent('builder_open', {
    destination: destInput.value.trim()
  });

  const slot = document.getElementById('spBuilderSlot');
  const bs = document.getElementById('builderSummary');
  if (slot && bs.parentElement !== slot) slot.appendChild(bs);

  // Unutar modala "Prilagodi svoj plan" ne treba dupli "Nastavi" — modal
  // već ima svoje dugme (#startPrefsContinue) ispod cele forme, pa
  // #builderContinueBtn (koje inače otkriva linkove za rezervaciju) ovde
  // sakrivamo da ne bude dva "Nastavi" jedno ispod drugog.
  document.getElementById('builderContinueBtn').style.display = 'none';

  renderBuilder();
  bs.style.display = 'block';
  document.getElementById('builderPlaceholder').style.display = 'none';
  document.getElementById('builderBookLinks').style.display = 'none';

  requestAnimationFrame(() => {
    bs.scrollIntoView({behavior:'smooth', block:'start'});
  });
});

document.getElementById('startPrefsContinue').addEventListener('click', () => {
  // Validacija PRE zatvaranja modala i history guard-a — ako unos nije
  // ispravan, ne otvaramo rezultate (inače bi ostao "osiroteo" overlay).
  const check = validateSearchInputs({checkPast:true, car: builderState.carPref !== 'none', activity: builderState.activityCount > 0});
  if (!check.ok){
    requestCloseStartPrefsModal();
    showToast(check.msg);
    focusSearchField(check.focus);
    return;
  }
  // Direktan prelazak na rezultate — vidi komentar uz guardOverlayReplace
  // (zašto NE koristimo requestCloseStartPrefsModal ovde).
  closeStartPrefsModal();
  guardOverlayReplace('startPrefs', 'results', closeResultsSheet);
  // Auto/aktivnosti biramo ovde jer stvarno utiču na to koje se stavke
  // pojavljuju u gotovim ponudama (isto polje kao toggle-row iznad forme).
  // Let i hotel ostaju kakvi su već podešeni gore — let namerno ne
  // uključujemo automatski jer bi to iznenada tražilo popunjeno "Polazak"
  // polje koje ovaj modal ne prikuplja.
  setTransportToggle('car', builderState.carPref !== 'none');
  setTransportToggle('activity', builderState.activityCount > 0);
  trackFunnelEvent('offers_view', {
    destination: document.getElementById('dest').value.trim()
  });
  // Odmah skrolujemo ka rezultatima (na loading skeleton) — ranije se ovde
  // NIJE skrolovalo dok se ponude ne učitaju, pa je stranica ostajala pri
  // vrhu, a onda naglo skočila dole na kartice kad se učitavanje završi.
  // Sad je skrol jedan, gladak pokret: ka skeletonu odmah, pa mala
  // dorada pozicije kad prave kartice zamene skeleton (renderResults).
  runSearch(true, false);
});

/* ==========================================================
   VODIČ PO STAVCI — klik na feature-strip (Letovi/Smeštaj/Auto/
   Putarine/Aktivnosti/Osiguranje/eSIM/Transferi) otvara detaljan
   edukativni vodič kao swipeable kartice (isti obrazac kao krajnji
   rezultat "Pronađi svoj izlet" kviza — packagesSliderHtml + dots,
   otvoreno u istom bottom-sheet prozoru na mobilnom). Sadržaj je
   opšte/uredničko znanje (isti duh kao ALT_AIRPORT_NOTES/
   DEST_AIRPORT_NOTES iznad), ne uživo podatak — zato ide sa istom
   napomenom kao i ti saveti.
========================================================== */
const FEATURE_GUIDES = {
  flight: {
    icon: '✈️',
    title: 'Letovi',
    sections: [
      { step: 'Zašto je važno', body: `<p>Let je obično najveća pojedinačna stavka budžeta i najviše varira u ceni — razlika između dobrog i lošeg izbora datuma ili aviokompanije može biti i preko 100€ za isti pravac.</p>` },
      { step: 'Kako uštedeti', body: `<ul>
        <li>Cene su generalno niže utorkom i sredom, a najviše nedeljom i petkom.</li>
        <li>Rezervacija 6–8 nedelja unapred za evropske letove obično daje najbolju cenu — ni previše rano, ni u poslednji čas.</li>
        <li>Uporedi cenu leta iz susednog grada ili susedne zemlje (npr. Budimpešta umesto Novog Sada) — razlika ponekad pokriva trošak vožnje do tamo.</li>
        <li>Kombinovanje aviokompanija (jedan let tamo, drugi nazad) ume da bude jeftinije od povratne karte kod iste kompanije, ali pazi na napomenu ispod.</li>
      </ul>` },
      { step: 'Zamke i trikovi', body: `<ul>
        <li><b>Aerodrom u imenu grada nije uvek taj grad.</b> „Pariz” kod pojedinih low-cost kompanija znači Bove, 85 km od centra. Isto važi za London, Milano, Frankfurt, Stokholm, Brisel i još par gradova.</li>
        <li><b>Prtljag nije uključen u prikazanu cenu</b> kod low-cost kompanija — ručni, predati kofer i izbor sedišta plaćaju se posebno i mogu duplirati početnu cenu.</li>
        <li><b>Kombinovani letovi (dve odvojene karte) ne štite jedan drugi</b> — ako prvi let kasni i propustiš presedanje, aviokompanija drugog leta ti ne duguje ništa.</li>
      </ul>` },
      { step: 'Šta prvo proveriti', body: `<ol>
        <li>Tačan aerodrom sletanja (ne samo ime grada).</li>
        <li>Da li je prtljag uključen, i koliko tačno kilograma/dimenzija.</li>
        <li>Vreme između presedanja — manje od 1h u stranoj zemlji je rizično.</li>
      </ol>` }
    ]
  },
  hotel: {
    icon: '🏠',
    title: 'Smeštaj',
    sections: [
      { step: 'Zašto je važno', body: `<p>Smeštaj je druga najveća stavka i mesto gde se najčešće pojavljuju „iznenadni” troškovi koji nisu bili vidljivi u ceni iz pretrage.</p>` },
      { step: 'Kako uštedeti', body: `<ul>
        <li>Apartman umesto hotela je jeftiniji za boravke duže od 3–4 noći i za grupe/porodice — cena po osobi pada.</li>
        <li>Smeštaj malo van centra (10–15 min javnim prevozom) često je 20–30% jeftiniji uz zanemarljiv gubitak u udobnosti.</li>
        <li>Besplatno otkazivanje (umesto najjeftinije nepovratne opcije) vredi platiti par evra više — daje fleksibilnost ako se planovi promene.</li>
      </ul>` },
      { step: 'Zamke i trikovi', body: `<ul>
        <li><b>Taksa za grad (city tax) i taksa za čišćenje retko su uključene u cenu koju vidiš u pretrazi</b> — mogu dodati 10–15% na ukupan račun, naplaćuju se na licu mesta ili posebno na kraju.</li>
        <li><b>Slike na sajtu mogu biti stare ili iz „sličnog” apartmana u istoj zgradi</b> — proveri da li recenzije pominju da odgovara slikama.</li>
        <li><b>Depozit za štetu</b> se ponekad naplaćuje unapred na kartici i vraća 5–14 dana posle odjave — ne trošak, ali blokira sredstva.</li>
        <li>Ocena 9.0+ sa manje od 20 recenzija je manje pouzdana od ocene 8.3 sa 500 recenzija.</li>
      </ul>` },
      { step: 'Šta prvo proveriti', body: `<ol>
        <li>Da li je city tax/taksa za čišćenje uključena u prikazanu cenu.</li>
        <li>Politiku otkazivanja i rok do kad je besplatno.</li>
        <li>Tačnu lokaciju na mapi (ne samo naziv kvarta).</li>
      </ol>` }
    ]
  },
  car: {
    icon: '🚗',
    title: 'Auto',
    sections: [
      { step: 'Zašto je važno', body: `<p>Rent-a-car je klasičan primer gde se cena „od” iz pretrage znatno razlikuje od cene koju stvarno platiš na šalteru.</p>` },
      { step: 'Kako uštedeti', body: `<ul>
        <li>Preuzimanje van aerodroma (u gradu) je često jeftinije jer izbegava „aerodromsku taksu” koju firme dodaju.</li>
        <li>Manja, poznata lokalna firma ume biti jeftinija od velikih brendova za isti auto, uz malo veći rizik u kvalitetu usluge.</li>
        <li>Plaćanje goriva unapred (full-to-empty) retko se isplati — skoro uvek je jeftinije vratiti auto pun sam.</li>
      </ul>` },
      { step: 'Zamke i trikovi', body: `<ul>
        <li><b>„Besplatno otkazivanje” ne znači i besplatnu promenu datuma</b> — proveri oba uslova posebno.</li>
        <li><b>Osnovno osiguranje uključeno u cenu obično ima visoko učešće u šteti (excess)</b> od 800–1500€ — dodatno osiguranje koje ga svodi na 0 kupuje se posebno, jeftinije kod nezavisnih sajtova nego na šalteru.</li>
        <li><b>Depozit na kartici</b> se blokira pri preuzimanju (često 500–1000€) i vraća se posle vraćanja auta u ispravnom stanju.</li>
        <li>Drugi vozač, dečije sedište i GPS gotovo uvek se naplaćuju dodatno na šalteru, ne u online ceni.</li>
      </ul>` },
      { step: 'Šta prvo proveriti', body: `<ol>
        <li>Iznos učešća u šteti (excess) i da li je dodatno osiguranje isplativije kupiti unapred.</li>
        <li>Tačnu lokaciju preuzimanja (aerodrom vs. grad) i taksu razlike.</li>
        <li>Politiku goriva (full-to-full je skoro uvek najbolja opcija).</li>
      </ol>` }
    ]
  },
  tolls: {
    icon: '🛣️',
    title: 'Putarine',
    sections: [
      { step: 'Zašto je važno', body: `<p>Putarine se skoro nikad ne uračunavaju unapred kod samostalnog planiranja, a mogu značajno promeniti realnu cenu putovanja autom.</p>` },
      { step: 'Kako uštedeti', body: `<ul>
        <li>Neke rute imaju besplatnu alternativu (sporiji, ali bez putarine) koja za kraća rastojanja gubi svega 15–20 minuta.</li>
        <li>Elektronska vinjeta (Austrija, Slovenija, Mađarska, Švajcarska) je jeftinija kupljena unapred onlajn nego na granici, a izbegava se čekanje.</li>
        <li>Za više zemalja na istom putu proveri da li postoji kombinovana vinjeta koja je jeftinija od pojedinačnih.</li>
      </ul>` },
      { step: 'Zamke i trikovi', body: `<ul>
        <li><b>Vinjeta i putarina nisu isto</b> — neke zemlje (Austrija, Slovenija) traže vinjetu za sve auto-puteve, dok druge (Hrvatska, Italija) naplaćuju putarinu po pređenoj deonici na rampama.</li>
        <li><b>Kazna za vožnju bez vinjete je znatno veća od same vinjete</b> — u pojedinim zemljama i nekoliko stotina evra.</li>
        <li>Rentiran auto ponekad već ima elektronsku vinjetu/tag uključen u cenu — proveri pre nego što kupiš duplo.</li>
      </ul>` },
      { step: 'Šta prvo proveriti', body: `<ol>
        <li>Da li zemlje na ruti traže vinjetu, putarinu na rampama, ili oboje.</li>
        <li>Da li rentirani auto već ima vinjetu/tag za putarine uključen.</li>
        <li>Gde tačno kupiti vinjetu unapred (zvanični sajt, ne sumnjivi treći sajtovi sa provizijom).</li>
      </ol>` }
    ]
  },
  activity: {
    icon: '🎟️',
    title: 'Aktivnosti',
    sections: [
      { step: 'Zašto je važno', body: `<p>Popularne atrakcije imaju ograničen broj mesta dnevno — bez rezervacije unapred, gubi se vreme u redu ili se atrakcija propušta u potpunosti.</p>` },
      { step: 'Kako uštedeti', body: `<ul>
        <li>Kombinovane karte (npr. muzej + toranj) su često jeftinije od pojedinačnih ulaznica kupljenih posebno.</li>
        <li>Ulaz rano ujutru ili kasno popodne je ponekad jeftiniji i uvek manje gužve.</li>
        <li>City card (javni prevoz + ulazi u muzeje) isplati se samo ako se planira 3+ atrakcije dnevno — inače je skuplja od pojedinačnih karata.</li>
      </ul>` },
      { step: 'Zamke i trikovi', body: `<ul>
        <li><b>Karte na licu mesta kod top atrakcija (Koloseum, Alhambra, Sagrada Familia) često nisu dostupne istog dana</b> — prodaju se nedeljama unapred u sezoni.</li>
        <li><b>Sajtovi trećih strana prodaju iste karte uz proviziju od 20–40%</b> — proveri prvo zvaničan sajt atrakcije pre poređenja sa posrednicima.</li>
        <li>Besplatan ulaz određenim danima znači i duplo veće gužve — ne uvek prava ušteda ako je vreme dragoceno.</li>
      </ul>` },
      { step: 'Šta prvo proveriti', body: `<ol>
        <li>Da li glavna atrakcija zahteva rezervaciju unapred (i koliko unapred).</li>
        <li>Zvaničan sajt atrakcije, pre poređenja sa posrednicima.</li>
        <li>Da li kombinovana/city karta ima smisla za tvoj konkretan raspored.</li>
      </ol>` }
    ]
  },
  insurance: {
    icon: '🛡️',
    title: 'Osiguranje',
    sections: [
      { step: 'Zašto je važno', body: `<p>Zdravstveni tretman u inostranstvu bez osiguranja može koštati hiljade evra za ozbiljniji slučaj — ovo je stavka gde ušteda od par evra nosi nesrazmeran rizik.</p>` },
      { step: 'Kako uštedeti', body: `<ul>
        <li>Godišnja polisa (ako putuješ više puta godišnje) je gotovo uvek jeftinija po putovanju od kupovine polise za svaki put posebno.</li>
        <li>Neke bankovne kartice (premium paketi) uključuju putno osiguranje besplatno — proveri pre kupovine nove polise.</li>
        <li>Porodična/grupna polisa je jeftinija po osobi od pojedinačnih polisa za isto putovanje.</li>
      </ul>` },
      { step: 'Zamke i trikovi', body: `<ul>
        <li><b>Osnovna polisa često ne pokriva sportske aktivnosti</b> (skijanje, ronjenje, planinarenje) — proveri da li treba dodatak.</li>
        <li><b>Osiguranje za otkazivanje putovanja i zdravstveno osiguranje su dve različite stvari</b> — retko su automatski oba uključena.</li>
        <li><b>Postojeća hronična stanja se ponekad moraju posebno prijaviti</b> — ako se ne prijave, osiguranje može odbiti isplatu baš za taj slučaj.</li>
        <li>EU zdravstvena kartica (gde je primenjivo) pokriva samo javno zdravstvo u EU, ne privatne klinike niti medicinski transport nazad kući.</li>
      </ul>` },
      { step: 'Šta prvo proveriti', body: `<ol>
        <li>Da li polisa pokriva planirane aktivnosti (sport, iznajmljivanje motora/skutera).</li>
        <li>Limit pokrića za medicinski transport nazad u zemlju — najskuplji mogući trošak bez osiguranja.</li>
        <li>Da li bankovna kartica već uključuje putno osiguranje.</li>
      </ol>` }
    ]
  },
  esim: {
    icon: '📶',
    title: 'eSIM',
    sections: [
      { step: 'Zašto je važno', body: `<p>Roming van paketa operatera (van EU, ili van regiona) može biti i desetine puta skuplji od lokalnog interneta — greška ovde je najskuplja u odnosu na trošak izbegavanja.</p>` },
      { step: 'Kako uštedeti', body: `<ul>
        <li>eSIM se kupuje unapred i aktivira tek po sletanju — nema razloga plaćati roming ni jedan dan pre nego što zaista zatreba.</li>
        <li>Fiksni paket (npr. 10GB za 10 dana) jeftiniji je po GB od dnevnih paketa ako putovanje traje duže od 5–6 dana.</li>
        <li>Regionalni eSIM (npr. cela Evropa) isplativ je samo ako se putuje kroz više zemalja — za jednu destinaciju, lokalni je jeftiniji.</li>
      </ul>` },
      { step: 'Zamke i trikovi', body: `<ul>
        <li><b>Ne svi telefoni podržavaju eSIM</b> — proveri pre kupovine (uglavnom noviji modeli od 2019+, ali ne svi).</li>
        <li><b>Aktivacija zahteva internet konekciju</b> (wifi na aerodromu) pre nego što fizička SIM prestane da radi.</li>
        <li>Neki jeftini provajderi imaju slabiju mrežnu pokrivenost od glavnih operatera — proveri recenzije za konkretnu destinaciju, ne samo cenu.</li>
      </ul>` },
      { step: 'Šta prvo proveriti', body: `<ol>
        <li>Da li telefon podržava eSIM (Podešavanja → Mobilna mreža, ili stranica proizvođača).</li>
        <li>Tačnu količinu podataka potrebnu za dužinu putovanja.</li>
        <li>Da li paket pokriva samo jednu zemlju ili je potreban regionalni za rutu kroz više zemalja.</li>
      </ol>` }
    ]
  },
  transfer: {
    icon: '🚕',
    title: 'Transferi',
    sections: [
      { step: 'Zašto je važno', body: `<p>Prevoz od aerodroma do smeštaja je trošak koji se najčešće ne planira unapred, a razlika između opcija zna biti i 5–10 puta u ceni za istu rutu.</p>` },
      { step: 'Kako uštedeti', body: `<ul>
        <li>Javni prevoz od aerodroma je u većini evropskih gradova 5–10x jeftiniji od taksija, uz razliku od 20–30 minuta u vremenu.</li>
        <li>Deljeni šatl je kompromis — jeftiniji od privatnog taksija, brži od čisto javnog prevoza.</li>
        <li>Rezervacija privatnog transfera unapred (fiksna cena) skoro je uvek jeftinija i sigurnija od pregovaranja sa taksistom na licu mesta.</li>
      </ul>` },
      { step: 'Zamke i trikovi', body: `<ul>
        <li><b>Taksi bez taksimetra ili sa „specijalnom turističkom cenom” na aerodromu je čest trik</b> — unapred rezervisan transfer eliminiše taj rizik.</li>
        <li><b>Aplikacije za prevoz (tipa Uber/Bolt) nisu dostupne ili legalne u svim gradovima</b> — proveri unapred da se ne osloniš na nešto što ne postoji po sletanju.</li>
        <li>Cena transfera noću ili rano ujutru (van radnog vremena javnog prevoza) je viša — kod ranih letova bolje rezervisati unapred.</li>
      </ul>` },
      { step: 'Šta prvo proveriti', body: `<ol>
        <li>Da li javni prevoz od aerodroma radi u vreme sletanja (noćni letovi su rizik).</li>
        <li>Da li je taksi u tom gradu poznat po „turističkim cenama” — ako da, rezerviši unapred.</li>
        <li>Tačnu udaljenost/vreme od aerodroma do smeštaja pre biranja opcije.</li>
      </ol>` }
    ]
  }
};
function featureGuideScrollHtml(sections){
  return sections.map(s => `<h4>${escapeHtml(s.step)}</h4>${s.body}`).join('');
}
function openFeatureGuide(key){
  const g = FEATURE_GUIDES[key];
  if (!g) return;
  document.getElementById('featureGuideHead').innerHTML = `
    <div class="status-banner">
      <div class="status-left">
        <div class="status-check">${g.icon}</div>
        <div><h3>${escapeHtml(g.title)}</h3><p>Sve što treba da znaš pre nego što rezervišeš.</p></div>
      </div>
    </div>
  `;
  const body = document.getElementById('featureGuideBody');
  body.innerHTML = `<div class="fg-content fg-scroll">${featureGuideScrollHtml(g.sections)}</div>`
    + `<p class="fg-disclaimer">⚠️ Saveti su opšteg, edukativnog karaktera i mogu se razlikovati po konkretnoj destinaciji, sezoni i propisima zemlje. Uvek proveri aktuelne uslove kod partnera pre rezervacije.</p>`;
  openFeatureGuideSheet();
}
function openFeatureGuideSheet(){
  const sheet = document.getElementById('featureGuideSheet');
  if (!sheet) return;
  sheet.classList.add('visible');
  const backdrop = document.getElementById('featureGuideBackdrop');
  if (isMobileResults()){
    if (backdrop) backdrop.classList.add('open');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    lockResultsPageScroll();
    guardOverlayOpen('featureGuide', closeFeatureGuideSheet);
  }
}
function closeFeatureGuideSheet(){
  const sheet = document.getElementById('featureGuideSheet');
  if (!sheet) return;
  const backdrop = document.getElementById('featureGuideBackdrop');
  const wasLocked = _resultsScrollLocked;
  sheet.classList.remove('visible');
  if (backdrop) backdrop.classList.remove('open');
  sheet.removeAttribute('role');
  sheet.removeAttribute('aria-modal');
  if (wasLocked) unlockResultsPageScroll();
}
// Klik na "Nazad"/pozadinu treba da se ponaša identično fizičkom/gest
// dugmetu telefona — koristi isti univerzalni guard sistem kao ostali
// modali (vidi definiciju guardOverlayOpen/guardOverlayRequestClose na
// vrhu fajla), da postoji jedan jedini put kojim se sheet zatvara.
function requestCloseFeatureGuideSheet(){
  if (!guardOverlayRequestClose('featureGuide')) closeFeatureGuideSheet();
}
document.querySelectorAll('.feature-strip .feature[data-feature]').forEach(el => {
  el.addEventListener('click', () => openFeatureGuide(el.dataset.feature));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openFeatureGuide(el.dataset.feature); }
  });
});
const featureGuideBackBtn = document.getElementById('featureGuideBackBtn');
if (featureGuideBackBtn) featureGuideBackBtn.addEventListener('click', requestCloseFeatureGuideSheet);
const featureGuideBackdropEl = document.getElementById('featureGuideBackdrop');
if (featureGuideBackdropEl) featureGuideBackdropEl.addEventListener('click', requestCloseFeatureGuideSheet);


/* ==========================================================
   INICIJALIZACIJA
========================================================== */
applyStaticI18n();
updateStats();
updateCtaBanner();
renderSavedTrips();
renderAccountMenu();

// Dolazak sa spoljašnjeg linka sa ?dest=Grad (npr. iz vodiča na
// /vodici.html) — prepuni polje Destinacija i skroluj do forme, ali
// NE pokreći pretragu automatski (korisnik i dalje bira datume).
(function prefillDestFromQuery(){
  const params = new URLSearchParams(window.location.search);
  const destParam = params.get('dest');
  if (!destParam) return;
  const destInput = document.getElementById('dest');
  if (!destInput) return;
  destInput.value = destParam;
  requestAnimationFrame(() => {
    document.getElementById('searchForm').scrollIntoView({behavior:'smooth', block:'start'});
  });
})();
// Ako se jezik promeni, ponovo iscrtaj "Gde bi sledeće?" u novom jeziku —
// isti dnevni izbor, samo prevedeni tekst (regionalne kartice po gradu
// polaska ostaju na srpskom, kao i do sada — ovde se menja samo podrazumevani skup).
const _prevOnLangChange = window.onLangChange;
window.onLangChange = function(lang){
  if (typeof _prevOnLangChange === 'function') _prevOnLangChange(lang);
  const originVal = (document.getElementById('origin') || {}).value || '';
  if (!originVal.trim()) renderDefaultPopularDestinations();
  // Osveži CTA baner na novom jeziku (prati istu logiku: uneti tekst →
  // poslednja stvarna destinacija → generički tekst bez imena grada).
  updateCtaBanner();
};

/* ==========================================================
   "Sklopi svoju atrakciju" — slajder + sheet sa filterima
   (Viator partner sekcija). Podaci ispod su PRIMER/MOCK radi
   dizajna i UX toka — pre puštanja u produkciju treba ih
   zameniti stvarnim Viator affiliate API/widget pozivom
   (po zemlji/gradu/kategoriji), sa keširanjem odgovora.
   ========================================================== */
const ATTRACTIONS_DATA = [
  {id:'a1', name:'Vožnja gondolom kroz kanale', city:'Venecija', country:'Italija', category:'gondole', categoryLabel:'Gondole i panorame', img:'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=70&auto=format&fit=crop', price:45, q:'Venice gondola'},
  {id:'a2', name:'Koncert u Bečkoj filharmoniji', city:'Beč', country:'Austrija', category:'muzika', categoryLabel:'Muzika i koncerti', img:'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&q=70&auto=format&fit=crop', price:69, q:'Vienna concert'},
  {id:'a3', name:'Ulaznica za Koloseum sa vodičem', city:'Rim', country:'Italija', category:'kultura', categoryLabel:'Kultura i znamenitosti', img:'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=70&auto=format&fit=crop', price:39, q:'Colosseum tour'},
  {id:'a4', name:'Utakmica na Santiago Bernabeu', city:'Madrid', country:'Španija', category:'arene', categoryLabel:'Arene i sport', img:'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=70&auto=format&fit=crop', price:120, q:'Bernabeu tour'},
  {id:'a5', name:'Ronjenje na Velikom koralnom grebenu', city:'Kerns', country:'Australija', category:'voda', categoryLabel:'Vodene aktivnosti', img:'https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=800&q=70&auto=format&fit=crop', price:159, q:'Great Barrier Reef diving'},
  {id:'a6', name:'Noćna tura po Montmartru', city:'Pariz', country:'Francuska', category:'noc', categoryLabel:'Noćni život', img:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=70&auto=format&fit=crop', price:35, q:'Montmartre night tour'},
  {id:'a7', name:'Paragliding iznad Interlakena', city:'Interlaken', country:'Švajcarska', category:'avantura', categoryLabel:'Avantura', img:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=70&auto=format&fit=crop', price:189, q:'Interlaken paragliding'},
  {id:'a8', name:'Degustacija tapasa u Trijani', city:'Sevilja', country:'Španija', category:'gastro', categoryLabel:'Gastro ture', img:'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=70&auto=format&fit=crop', price:55, q:'Seville tapas tour'},
  {id:'a9', name:'Panoramski točak London Eye', city:'London', country:'Velika Britanija', category:'gondole', categoryLabel:'Gondole i panorame', img:'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=70&auto=format&fit=crop', price:32, q:'London Eye'},
  {id:'a10', name:'DJ set na krovnom baru', city:'Barselona', country:'Španija', category:'noc', categoryLabel:'Noćni život', img:'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=70&auto=format&fit=crop', price:25, q:'Barcelona rooftop bar'},
  {id:'a11', name:'Muzej Akropolja — brza ulaznica', city:'Atina', country:'Grčka', category:'kultura', categoryLabel:'Kultura i znamenitosti', img:'https://images.unsplash.com/photo-1555993539-1732b0258235?w=800&q=70&auto=format&fit=crop', price:28, q:'Acropolis museum'},
  {id:'a12', name:'Rafting na reci Soči', city:'Bovec', country:'Slovenija', category:'avantura', categoryLabel:'Avantura', img:'https://images.unsplash.com/photo-1530866495561-507c9faab8c9?w=800&q=70&auto=format&fit=crop', price:65, q:'Soca rafting'},
  {id:'a13', name:'Jazz klub u podrumu', city:'Njujork', country:'SAD', category:'muzika', categoryLabel:'Muzika i koncerti', img:'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=70&auto=format&fit=crop', price:48, q:'New York jazz club'},
  {id:'a14', name:'Vinska tura kroz Toskanu', city:'Firenca', country:'Italija', category:'gastro', categoryLabel:'Gastro ture', img:'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&q=70&auto=format&fit=crop', price:79, q:'Tuscany wine tour'}
];
// Oznake kategorija dolaze iz I18N (attr_cat_<key>); ovde ostaju samo ključ i emoji.
const ATTRACTIONS_CATEGORIES = [
  {key:'kultura', emoji:'🏛️'},
  {key:'muzika', emoji:'🎵'},
  {key:'gondole', emoji:'🎡'},
  {key:'arene', emoji:'🏟️'},
  {key:'avantura', emoji:'🧗'},
  {key:'voda', emoji:'🌊'},
  {key:'gastro', emoji:'🍷'},
  {key:'noc', emoji:'🎶'}
];
function attractionCategoryLabel(key){ return t('attr_cat_' + key); }
let attractionsActiveCategories = new Set();
let attractionsActiveCountry = '';

// Viator pretraga za atrakciju; affiliate ID dolazi iz config.js (isti builder kao ostale aktivnosti).
function attractionLink(a){ return buildAffiliateLink('activity', {dest: a.q}); }
function attractionCardHtml(a){
  // Naziv iz I18N (attr_<id>), grad/država kroz rečnike; a.name ostaje srpski izvor.
  const name = t('attr_' + a.id);
  return `<a class="attraction-card" data-category="${escapeHtml(a.category)}" href="${escapeHtml(attractionLink(a))}" target="_blank" rel="noopener sponsored">
    <div class="ac-photo">
      <img src="${a.img}" alt="${escapeHtml(name)}" loading="lazy">
      <span class="ac-badge">${escapeHtml(attractionCategoryLabel(a.category))}</span>
    </div>
    <div class="ac-body">
      <span class="ac-name">${escapeHtml(name)}</span>
      <span class="ac-loc">${escapeHtml(cityLabel(a.city))}, ${escapeHtml(countryLabel(a.country))}</span>
      <span class="ac-price"><span>${escapeHtml(t('attr_from'))}</span> €${a.price}</span>
      ${affBadgeHtml({plain:true})}
    </div>
  </a>`;
}

function renderAttractionsSlider(){
  const wrap = document.getElementById('attractionsSlider');
  if (!wrap) return;
  const picks = ATTRACTIONS_DATA.slice(0, 5);
  wrap.innerHTML = picks.map(attractionCardHtml).join('');
  renderAttractionsDots(picks.length);
}
function renderAttractionsDots(count){
  const dotsWrap = document.getElementById('attractionsDots');
  if (!dotsWrap) return;
  dotsWrap.innerHTML = Array.from({length: count}).map((_, i) =>
    `<button type="button" class="a-dot${i === 0 ? ' active' : ''}" data-idx="${i}" aria-label="${escapeHtml(tf('attr_dot_aria', {n: i + 1}))}"></button>`
  ).join('');
}
(function initAttractionsSliderScrollSync(){
  const slider = document.getElementById('attractionsSlider');
  if (!slider) return;
  slider.addEventListener('scroll', () => {
    const cards = slider.querySelectorAll('.attraction-card');
    if (!cards.length) return;
    let closest = 0, minDist = Infinity;
    cards.forEach((c, i) => {
      const dist = Math.abs(c.offsetLeft - slider.scrollLeft);
      if (dist < minDist){ minDist = dist; closest = i; }
    });
    document.querySelectorAll('#attractionsDots .a-dot').forEach((d, i) => d.classList.toggle('active', i === closest));
  }, {passive:true});
})();
document.getElementById('attractionsPrev')?.addEventListener('click', () => {
  document.getElementById('attractionsSlider')?.scrollBy({left:-280, behavior:'smooth'});
});
document.getElementById('attractionsNext')?.addEventListener('click', () => {
  document.getElementById('attractionsSlider')?.scrollBy({left:280, behavior:'smooth'});
});

let _attractionsFiltersWired = false;
// Poziva se pri svakom otvaranju sheet-a i pri promeni jezika: opcije zemalja i
// čipovi kategorija se grade ponovo (na trenutnom jeziku), a slušaoci se
// postavljaju samo jednom. Vrednost opcije ostaje srpski naziv zemlje (filter).
function populateAttractionsFilters(){
  const select = document.getElementById('attractionsCountrySelect');
  if (select){
    const lang = getLang();
    const countries = [...new Set(ATTRACTIONS_DATA.map(a => a.country))]
      .sort((x, y) => String(countryLabel(x)).localeCompare(String(countryLabel(y)), lang));
    while (select.options.length > 1) select.remove(1); // prva opcija ("Sve zemlje") je iz HTML-a
    countries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = countryLabel(c);
      select.appendChild(opt);
    });
    select.value = attractionsActiveCountry;
    if (!_attractionsFiltersWired){
      select.addEventListener('change', () => {
        attractionsActiveCountry = select.value;
        renderAttractionsGrid();
      });
    }
  }
  const chipRow = document.getElementById('attractionsCategoryChips');
  if (chipRow){
    chipRow.innerHTML = ATTRACTIONS_CATEGORIES.map(c =>
      `<button type="button" class="attraction-chip${attractionsActiveCategories.has(c.key) ? ' on' : ''}" data-cat="${c.key}">${c.emoji} ${escapeHtml(attractionCategoryLabel(c.key))}</button>`
    ).join('');
    if (!_attractionsFiltersWired){
      chipRow.addEventListener('click', (e) => {
        const chip = e.target.closest('.attraction-chip');
        if (!chip) return;
        const key = chip.dataset.cat;
        if (attractionsActiveCategories.has(key)){
          attractionsActiveCategories.delete(key);
          chip.classList.remove('on');
        } else {
          attractionsActiveCategories.add(key);
          chip.classList.add('on');
        }
        renderAttractionsGrid();
      });
    }
  }
  _attractionsFiltersWired = true;
}
function renderAttractionsGrid(){
  const grid = document.getElementById('attractionsGrid');
  const empty = document.getElementById('attractionsEmpty');
  if (!grid) return;
  const filtered = ATTRACTIONS_DATA.filter(a => {
    const catOk = attractionsActiveCategories.size === 0 || attractionsActiveCategories.has(a.category);
    const countryOk = !attractionsActiveCountry || a.country === attractionsActiveCountry;
    return catOk && countryOk;
  });
  grid.innerHTML = filtered.map(attractionCardHtml).join('');
  if (empty) empty.hidden = filtered.length > 0;
}

function openAttractionsSheet(){
  populateAttractionsFilters();
  renderAttractionsGrid();
  const sheet = document.getElementById('attractionsSheet');
  if (!sheet) return;
  sheet.classList.add('visible');
  const backdrop = document.getElementById('attractionsSheetBackdrop');
  if (isMobileResults()){
    if (backdrop) backdrop.classList.add('open');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    lockResultsPageScroll();
    guardOverlayOpen('attractionsSheet', closeAttractionsSheet);
  }
}
function closeAttractionsSheet(){
  const sheet = document.getElementById('attractionsSheet');
  if (!sheet) return;
  const backdrop = document.getElementById('attractionsSheetBackdrop');
  const wasLocked = _resultsScrollLocked;
  sheet.classList.remove('visible');
  if (backdrop) backdrop.classList.remove('open');
  sheet.removeAttribute('role');
  sheet.removeAttribute('aria-modal');
  if (wasLocked) unlockResultsPageScroll();
}
function requestCloseAttractionsSheet(){
  if (!guardOverlayRequestClose('attractionsSheet')) closeAttractionsSheet();
}
document.getElementById('attractionsSeeAllBtn')?.addEventListener('click', openAttractionsSheet);
document.getElementById('attractionsSheetBackBtn')?.addEventListener('click', requestCloseAttractionsSheet);
document.getElementById('attractionsSheetBackdrop')?.addEventListener('click', requestCloseAttractionsSheet);

renderAttractionsSlider();

// Promena jezika: slajder i (ako je otvoren) sheet sa filterima se iscrtavaju ponovo,
// a "poslednja destinacija" u statistici dobija preveden naziv grada.
const _prevOnLangChangeAttractions = window.onLangChange;
window.onLangChange = function(lang){
  if (typeof _prevOnLangChangeAttractions === 'function') _prevOnLangChangeAttractions(lang);
  renderAttractionsSlider();
  const sheet = document.getElementById('attractionsSheet');
  if (sheet && sheet.classList.contains('visible')){
    populateAttractionsFilters();
    renderAttractionsGrid();
  }
  updateStatLastPreview((document.getElementById('dest') || {}).value || '');
};

/* ==========================================================
   SEKCIJA "DESTINACIJE" (#destinacije) — slajderi po vrsti odmora.
   Isti princip kao 3 kartice ponude: svaka kartica predlaže PARTNERSKU ponudu i vodi na
   partnera istim buildAffiliateLink() (isti aid/pid iz config.js, dok ih nema — test 'SKLOPI'):
     • "Blizu Srbije" i "More i plaža" → HOTEL na Booking.com. Ime, ocena i cena su ILUSTRATIVNI
       (ista fetchHotel() kao na karticama ponude); dugme otvara PRETRAGU hotela u tom gradu
       (datumi i putnici iz forme, ako su upisani; 4★ kao na kartici).
     • "Gradovi i kultura" i "Priroda i planina" → ATRAKCIJE na Viator-u: dugme otvara Viator
       pretragu (muzeji / priroda) za taj grad. Nema izmišljenih naziva tura ni cena.
   GRADOVI: dok pravi API nije gotov, dolaze iz MATCH_DESTINATIONS (isti gradovi/države
   kao u "Pronađi svoj izlet"). Svaki grad je samo u JEDNOM slajderu (bez ponavljanja).
   FOTOGRAFIJE: samo od partnera (Viator) ili tvoje. Kartica ima gradijent + ikonu vrste odmora
   dok slika ne stigne (ili ako nikad ne stigne). Redosled prvenstva slike:
     item.img (iz DEST_API_URL) → DEST_IMG_OVERRIDES (tvoje slike) → Viator preko Worker-a.
   Viator API ključ stoji SAMO na Worker-u (worker/destination-images.js), nikad u pregledaču.
   Adresa Worker-a: window.SKLOPI_DEST_IMG_URL, ili SKLOPI_ALERT_WORKER_URL + '/go/destination-images'
   (config.js). Dok ni jedno nije podešeno, ništa se ne poziva i kartice ostaju kao sada.
   PRELAZAK NA PRAVI API: upiši adresu u DEST_API_URL. Očekivan oblik odgovora:
     [{key:'sea', title:'More i plaža',   (title je opciono)
       items:[{dest:'Budva', country:'Crna Gora', img:'https://…', partner:'hotel'|'activity'}]}]
   (img i partner su opciono; bez partner-a odlučuje vrsta slajdera — vidi DEST_ROW_PARTNER.)
========================================================== */
const DEST_API_URL = '';
// Tvoje sopstvene fotografije po gradu, npr. {'Budva':'img/destinacije/budva.jpg'}.
// Ključ je naziv grada na srpskom, kao u MATCH_DESTINATIONS.
const DEST_IMG_OVERRIDES = {};
// Srpski naziv → engleski naziv za Viator pretragu (gde se razlikuje).
const DEST_EN_NAMES = {
  'Budimpešta':'Budapest','Beč':'Vienna','Sofija':'Sofia','Solun':'Thessaloniki','Skoplje':'Skopje',
  'Sarande':'Sarandë','Split':'Split, Croatia','Bukurešt':'Bucharest','Prag':'Prague','Krf':'Corfu',
  'Atina':'Athens','Mikonos':'Mykonos','Rodos':'Rhodes','Krit':'Crete','Rim':'Rome','Milano':'Milan',
  'Venecija':'Venice','Firenca':'Florence','Barselona':'Barcelona','Malaga':'Málaga','Ibica':'Ibiza',
  'Lisabon':'Lisbon','Pariz':'Paris','Nica':'Nice','Minhen':'Munich','Cirih':'Zürich','Antalija':'Antalya',
  'Kapadokija':'Cappadocia','Kairo':'Cairo','Šarm El Šeik':'Sharm El Sheikh','Marakeš':'Marrakesh',
  'Njujork':'New York City','Majami':'Miami','Los Anđeles':'Los Angeles','Puket':'Phuket','Tokio':'Tokyo',
  'Singapur':'Singapore','Sidnej':'Sydney','Kejptaun':'Cape Town',
  'St. Anton am Arlberg':'St. Anton am Arlberg'
};
// Šta kartica nudi po vrsti slajdera: 'hotel' (Booking.com) ili 'activity' (Viator).
const DEST_ROW_PARTNER = {ski:'hotel', sea:'hotel', city:'activity', nature:'activity'};
const DEST_ROW_ICON = {ski:'⛷️', sea:'🏖️', city:'🏛️', nature:'🌲'};
// Ključna reč koja se dodaje nazivu grada u Viator pretrazi.
const DEST_VIATOR_KEYWORD = {city:'museums', nature:'nature tours'};
// Viator pretraga za sliku kartice = engleski naziv grada + ključna reč vrste odmora
// (isti izraz kao u Viator linku na kartici, a za "More i plaža" — plaža).
const DEST_IMG_KEYWORD = Object.assign({sea:'beach', ski:'ski resort'}, DEST_VIATOR_KEYWORD);
const DEST_ROW_LIMIT = 8;
const DEST_SPARE_LIMIT = 6; // rezervne destinacije po slajderu, za zamenu kad ponuđena nema sliku
// prio = redosled kojim slajderi "biraju" gradove (da se nijedan ne ponovi); redosled prikaza je redosled niza.
// "ski" (Skijaški centri) je zamenio raniji "near" (Blizu Srbije) red — prvi u prikazu.
const DEST_ROW_DEFS = [
  {key:'ski',    prio:1, test: d => d.vibes.includes('ski')},
  {key:'sea',    prio:2, test: d => d.vibes.includes('sea')},
  {key:'city',   prio:3, test: d => d.vibes.includes('city')},
  {key:'nature', prio:0, test: d => d.vibes.includes('nature') && !d.vibes.includes('city') && !d.vibes.includes('ski')}
];
// Tekstovi sekcije žive ovde (ne u i18n-data.js) da sekcija radi bez izmene prevoda;
// ako nedostaje jezik, pada na srpski kao i t().
const DEST_TXT = {
  sr:{eyebrow:'Odaberi pravac', title:'Destinacije',
      sub:'Prelistaj ideje po vrsti odmora. Klikni na naziv grada i upisujemo ga u pretragu, ili otvori ponudu partnera — datume biraš ti.',
      row_ski:'Skijaški centri', row_sea:'More i plaža', row_city:'Gradovi i kultura', row_nature:'Priroda i planina',
      prev:'Prethodne destinacije', next:'Sledeće destinacije', pick_aria:'Upiši u pretragu: ',
      per_night:'po noći', label_activity:'Atrakcije', btn_viator:'Pogledaj na Viator-u',
      act_city:'Muzeji, pozorišta i galerije', act_nature:'Priroda, parkovi i izleti', act_sub:'Ulaznice i organizovane ture',
      credit:'Cene su ilustrativna procena; tačnu cenu i dostupnost proveri kod partnera. Linkovi ka Booking.com-u i Viator-u su partnerski — SKLOPI može da dobije proviziju, a tebi cena ostaje ista.'},
  en:{eyebrow:'Pick a direction', title:'Destinations',
      sub:'Browse ideas by kind of trip. Tap a city name and we fill it into the search, or open the partner offer — you pick the dates.',
      row_ski:'Ski resorts', row_sea:'Sea and beaches', row_city:'Cities and culture', row_nature:'Nature and mountains',
      prev:'Previous destinations', next:'Next destinations', pick_aria:'Fill into search: ',
      per_night:'per night', label_activity:'Attractions', btn_viator:'View on Viator',
      act_city:'Museums, theatres and galleries', act_nature:'Nature, parks and day trips', act_sub:'Tickets and guided tours',
      credit:'Prices are an illustrative estimate; check the exact price and availability with the partner. Links to Booking.com and Viator are affiliate links — SKLOPI may earn a commission at no extra cost to you.'},
  ru:{eyebrow:'Выбери направление', title:'Направления',
      sub:'Листай идеи по типу отдыха. Нажми на название города — мы подставим его в поиск, или открой предложение партнёра — даты выбираешь ты.',
      row_ski:'Горнолыжные курорты', row_sea:'Море и пляжи', row_city:'Города и культура', row_nature:'Природа и горы',
      prev:'Предыдущие направления', next:'Следующие направления', pick_aria:'Подставить в поиск: ',
      per_night:'за ночь', label_activity:'Впечатления', btn_viator:'Смотреть на Viator',
      act_city:'Музеи, театры и галереи', act_nature:'Природа, парки и экскурсии', act_sub:'Билеты и экскурсии с гидом',
      credit:'Цены — ориентировочная оценка; точную цену и наличие проверяйте у партнёра. Ссылки на Booking.com и Viator партнёрские — SKLOPI может получить комиссию, а цена для вас не меняется.'}
};
function dtx(key){
  const own = DEST_TXT[getLang()];
  const v = (own && own[key] !== undefined) ? own[key] : DEST_TXT.sr[key];
  return v === undefined ? '' : v;
}
function destMockRows(){
  const used = new Set(), byKey = {}, spareKey = {};
  const defsByPrio = DEST_ROW_DEFS.slice().sort((a, b) => a.prio - b.prio);
  // Prvi prolaz: glavnih 8 po slajderu (kao ranije).
  defsByPrio.forEach(def => {
    const picks = MATCH_DESTINATIONS.filter(d => def.test(d) && !used.has(d.name)).slice(0, DEST_ROW_LIMIT);
    picks.forEach(d => used.add(d.name));
    byKey[def.key] = picks.map(d => ({dest:d.name, country:d.extra, row:def.key}));
  });
  // Drugi prolaz (tek kad su svi glavni izbori poznati): rezervne destinacije za zamenu
  // onih kojima slika ne stigne — bez preklapanja sa glavnim izborom bilo kog slajdera.
  defsByPrio.forEach(def => {
    const spares = MATCH_DESTINATIONS.filter(d => def.test(d) && !used.has(d.name)).slice(0, DEST_SPARE_LIMIT);
    spares.forEach(d => used.add(d.name));
    spareKey[def.key] = spares.map(d => ({dest:d.name, country:d.extra, row:def.key}));
  });
  return DEST_ROW_DEFS.map(def => ({key:def.key, items:byKey[def.key], spares:spareKey[def.key]}));
}
async function loadDestinationRows(){
  if (DEST_API_URL){
    try {
      const r = await fetch(DEST_API_URL, {headers:{Accept:'application/json'}});
      if (r.ok){
        const data = await r.json();
        if (Array.isArray(data) && data.length){
          data.forEach(row => (row.items || []).forEach(it => { if (!it.row) it.row = row.key; }));
          return data;
        }
      }
    } catch(e){ console.warn('[sklopi] destinacije: API nije dostupan, koristim test podatke.', e); }
  }
  return destMockRows();
}

/* ---- slike sa Viator-a (preko Worker-a), sa privremenim Wikipedia fallback-om ---- */
const DEST_IMG_CACHE_KEY = 'sklopi_dest_img_v1';
const DEST_IMG_TTL = 3600 * 1000;   // Viator dozvoljava keširanje rezultata pretrage do 1 h
const WIKI_IMG_CACHE_KEY = 'sklopi_dest_img_wiki_v1';
const WIKI_IMG_TTL = 7 * 24 * 3600 * 1000; // Wikipedia slike su stabilne, keš na 7 dana
let _destImgMap = {};               // naziv destinacije → URL slike
let _destImgStarted = false;
function destImgEndpoint(){
  if (window.SKLOPI_DEST_IMG_URL) return window.SKLOPI_DEST_IMG_URL;
  const base = window.SKLOPI_ALERT_WORKER_URL;
  return base ? String(base).replace(/\/$/, '') + '/go/destination-images' : '';
}
function destViatorQuery(it){
  const en = DEST_EN_NAMES[it.dest] || it.dest;
  const kw = DEST_IMG_KEYWORD[it.row] || '';
  return en + (kw ? ' ' + kw : '');
}
// Naslov Wikipedia članka za grad (bez zemlje posle zareza — REST API to ne voli).
function destWikiTitle(it){
  const en = DEST_EN_NAMES[it.dest] || it.dest;
  return en.split(',')[0].trim();
}
function destReadImgCache(key, ttl){
  try {
    const c = JSON.parse(localStorage.getItem(key) || 'null');
    if (c && c.m && Date.now() - c.ts < ttl) return c;
  } catch(e){}
  return {ts: Date.now(), m: {}};
}
function destWriteImgCache(key, c){ try { localStorage.setItem(key, JSON.stringify(c)); } catch(e){} }
// Ubacuje <img> u već iscrtane kartice, bez ponovnog iscrtavanja (čuva skrol slajdera).
function destApplyImages(){
  document.querySelectorAll('#destRows .dest-card').forEach(card => {
    const photo = card.querySelector('.dc-photo');
    const url = _destImgMap[card.dataset.dest];
    if (!photo || !url || photo.querySelector('img')) return;
    const img = document.createElement('img');
    img.alt = ''; img.decoding = 'async'; img.loading = 'lazy'; img.src = url;
    photo.insertBefore(img, photo.firstChild);
  });
}
// PRIVREMENO: Wikipedia REST API (javan, ne traži ključ) dok Viator Worker ne bude spreman.
// Čim SKLOPI_DEST_IMG_URL / SKLOPI_ALERT_WORKER_URL budu podešeni u config.js, Viator
// automatski preuzima prioritet (vidi destLoadImages ispod) — ovo ostaje samo kao rezerva
// ako Viator za neku destinaciju ne vrati sliku.
async function fetchWikiImage(title){
  try {
    const r = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title));
    if (!r.ok) return '';
    const data = await r.json();
    return (data.thumbnail && data.thumbnail.source) || (data.originalimage && data.originalimage.source) || '';
  } catch(e){ return ''; }
}
async function destLoadImagesWiki(rows){
  const items = rows.flatMap(r => r.items || []).filter(it => !it.img && !DEST_IMG_OVERRIDES[it.dest] && !_destImgMap[it.dest]);
  if (!items.length) return;
  const cache = destReadImgCache(WIKI_IMG_CACHE_KEY, WIKI_IMG_TTL);
  const need = [];
  items.forEach(it => { if (cache.m[it.dest]) _destImgMap[it.dest] = cache.m[it.dest]; else need.push(it); });
  destApplyImages();
  if (!need.length) return;
  let next = 0;
  async function worker(){
    while (next < need.length){
      const it = need[next++];
      const url = await fetchWikiImage(destWikiTitle(it));
      if (url){ cache.m[it.dest] = url; _destImgMap[it.dest] = url; }
    }
  }
  await Promise.all(Array.from({length: Math.min(4, need.length)}, worker));
  destWriteImgCache(WIKI_IMG_CACHE_KEY, cache);
  destApplyImages();
}
// Traži sliku za JEDNU destinaciju (Viator ako je Worker podešen, inače/uz to Wikipedia) —
// koristi se pri zameni kartice koja nije dobila sliku.
async function destFetchOneImage(it){
  const endpoint = destImgEndpoint();
  if (endpoint){
    try {
      const r = await fetch(endpoint, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({items:[{d: it.dest, q: destViatorQuery(it)}]})
      });
      if (r.ok){
        const got = ((await r.json()) || {}).images || {};
        if (got[it.dest]) return got[it.dest];
      }
    } catch(e){ /* padamo na Wikipedia ispod */ }
  }
  return fetchWikiImage(destWikiTitle(it));
}
// Ako kartica na poziciji idx u redu nema sliku, zameni je sledećom rezervnom destinacijom
// (do 2 pokušaja — ako ni rezerva nema sliku, probaj sledeću rezervu pa odustani).
async function destTryReplacement(row, idx, triesLeft){
  if (!row.spares || !row.spares.length || triesLeft <= 0) return;
  const oldItem = row.items[idx];
  const spare = row.spares.shift();
  const oldEl = document.querySelector('#destRows .dest-card[data-dest="' + CSS.escape(oldItem.dest) + '"]');
  row.items[idx] = spare;
  if (oldEl) oldEl.outerHTML = destCardHtml(spare);
  const url = await destFetchOneImage(spare);
  if (url){
    _destImgMap[spare.dest] = url;
    destApplyImages();
  } else {
    await destTryReplacement(row, idx, triesLeft - 1);
  }
}
// Prolazi kroz sve redove i menja kartice bez slike rezervnim destinacijama (ako ih ima).
async function destFillMissingImages(rows){
  for (const row of rows){
    if (!row.items || !row.items.length) continue;
    for (let i = 0; i < row.items.length; i++){
      const it = row.items[i];
      if (it.img || DEST_IMG_OVERRIDES[it.dest] || _destImgMap[it.dest]) continue;
      await destTryReplacement(row, i, 2);
    }
  }
}
async function destLoadImages(rows){
  const endpoint = destImgEndpoint();
  if (endpoint){
    const items = rows.flatMap(r => r.items || []).filter(it => !it.img && !DEST_IMG_OVERRIDES[it.dest]);
    if (items.length){
      const cache = destReadImgCache(DEST_IMG_CACHE_KEY, DEST_IMG_TTL);
      const need = [];
      items.forEach(it => { if (cache.m[it.dest]) _destImgMap[it.dest] = cache.m[it.dest]; else need.push(it); });
      destApplyImages();
      if (need.length){
        try {
          const r = await fetch(endpoint, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({items: need.map(it => ({d: it.dest, q: destViatorQuery(it)}))})
          });
          if (!r.ok) throw new Error('HTTP ' + r.status);
          const got = ((await r.json()) || {}).images || {};
          Object.keys(got).forEach(k => { if (got[k]){ cache.m[k] = got[k]; _destImgMap[k] = got[k]; } });
          destWriteImgCache(DEST_IMG_CACHE_KEY, cache);
        } catch(e){ console.warn('[sklopi] destinacije: slike sa Viator-a nisu stigle.', e); }
        destApplyImages();
      }
    }
  }
  await destLoadImagesWiki(rows); // popuni Wikipedia slikom sve što Viator nije pokrio (ili sve, ako Viator još nije podešen)
  await destFillMissingImages(rows); // ono što ni Wikipedia nije pokrila — zameni rezervnom destinacijom
}
// Slike se traže tek kad je sekcija blizu vidnog polja (ne opterećuje početno učitavanje).
function destStartImages(rows){
  if (_destImgStarted) return;
  _destImgStarted = true;
  const sec = document.getElementById('destinacije');
  if (sec && 'IntersectionObserver' in window){
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)){ io.disconnect(); destLoadImages(rows); }
    }, {rootMargin:'600px 0px'});
    io.observe(sec);
  } else destLoadImages(rows);
}

/* ---- partnerska ponuda na kartici ---- */
function destKind(it){ return it.partner || DEST_ROW_PARTNER[it.row] || 'hotel'; }
function destPhotoFor(it){ return it.img || DEST_IMG_OVERRIDES[it.dest] || _destImgMap[it.dest] || ''; }
// Ilustrativni hotel: ista fetchHotel() kao na karticama ponude (4★, 2 osobe, 1 noć),
// seed po gradu — pa je hotel na kartici uvek isti za isti grad.
function destSimHotel(dest){
  const rng = seededRandom(hashSeed('destcard|' + String(dest).toLowerCase()));
  return fetchHotel(rng, dest, 1, 2, 'best', {hotelStars:4}, null);
}
// Link se računa u trenutku klika (datumi u formi su se mogli promeniti od iscrtavanja).
function destPartnerLink(kind, dest, rowKey){
  if (kind === 'hotel'){
    const val = id => (document.getElementById(id) || {}).value || '';
    const from = val('dateFrom'), to = val('dateTo');
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    if (iso.test(from) && iso.test(to) && to > from){
      return buildAffiliateLink('hotel', {dest, from, to, adults: Number(val('adults')) || 2, hotelStars: 4});
    }
    return buildAffiliateLink('hotel', {dest, hotelStars: 4});
  }
  const en = DEST_EN_NAMES[dest] || dest;
  const kw = DEST_VIATOR_KEYWORD[rowKey] || '';
  return buildAffiliateLink('activity', {dest: en + (kw ? ' ' + kw : '')});
}
function destOfferHtml(it, kind){
  const provider = PARTNERS[kind].name;
  if (kind === 'hotel'){
    const h = destSimHotel(it.dest);
    return `<div class="dc-offer">
      <div class="item-label"><span>${escapeHtml(t('item_label_hotel'))}</span><span class="item-provider">${escapeHtml(provider)}</span></div>
      <div class="item-name">${escapeHtml(h.name)}</div>
      <div class="item-sub">${escapeHtml(h.sub)}</div>
      <div class="item-price tabular">${fmtEUR(h.price)} <span class="dc-per">${escapeHtml(dtx('per_night'))}</span></div>
      <div class="dc-actions"><a class="item-btn hotel dc-book" href="${escapeHtml(destPartnerLink('hotel', it.dest, it.row))}" target="_blank" rel="noopener sponsored" data-kind="hotel" data-price="${h.price}" data-url="" data-dest="${escapeHtml(it.dest)}" data-tier="destinacije" onclick="bookItem(this)">${escapeHtml(t('btn_book_booking'))}</a>${affBadgeHtml()}</div>
    </div>`;
  }
  const nameKey = it.row === 'nature' ? 'act_nature' : 'act_city';
  return `<div class="dc-offer">
      <div class="item-label"><span>${escapeHtml(dtx('label_activity'))}</span><span class="item-provider">${escapeHtml(provider)}</span></div>
      <div class="item-name">${escapeHtml(dtx(nameKey))}</div>
      <div class="item-sub">${escapeHtml(dtx('act_sub'))}</div>
      <div class="dc-actions"><a class="item-btn activity dc-book" href="${escapeHtml(destPartnerLink('activity', it.dest, it.row))}" target="_blank" rel="noopener sponsored" data-kind="activity" data-price="0" data-url="" data-dest="${escapeHtml(it.dest)}" data-tier="destinacije" onclick="bookItem(this)">${escapeHtml(dtx('btn_viator'))}</a>${affBadgeHtml()}</div>
    </div>`;
}

/* ---- prikaz ---- */
let _destRowsPromise = null;
function destCardHtml(it){
  const name = cityLabel(it.dest);
  const country = it.country ? countryLabel(it.country) : '';
  const url = destPhotoFor(it);
  const kind = destKind(it);
  const icon = DEST_ROW_ICON[it.row] || (kind === 'hotel' ? '🏨' : '🎟️');
  return `<div class="dest-card dest-card--${kind}" data-dest="${escapeHtml(it.dest)}" data-kind="${kind}" data-row="${escapeHtml(it.row || '')}">
    <button type="button" class="dc-pick" aria-label="${escapeHtml(dtx('pick_aria') + name)}">
      <span class="dc-photo">${url ? `<img src="${escapeHtml(url)}" alt="" loading="lazy" decoding="async">` : `<span class="dc-ico" aria-hidden="true">${icon}</span>`}</span>
      <span class="dc-cap"><span class="dc-name">${escapeHtml(name)}</span>${country ? `<span class="dc-country">${escapeHtml(country)}</span>` : ''}</span>
    </button>
    ${destOfferHtml(it, kind)}
  </div>`;
}
function destRowHtml(row, idx){
  const items = row.items || [];
  if (!items.length) return '';
  const title = row.title || dtx('row_' + row.key) || row.key || '';
  const arrow = (dir, path) => `<button type="button" class="attractions-arrow attractions-arrow--${dir < 0 ? 'prev' : 'next'}" data-dir="${dir}" aria-label="${escapeHtml(dtx(dir < 0 ? 'prev' : 'next'))}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg></button>`;
  return `<div class="dest-row" data-row="${escapeHtml(row.key || '')}">
    <h3 class="dest-row-title" id="destRowTitle${idx}">${escapeHtml(title)}</h3>
    <div class="attractions-slider-wrap">
      ${arrow(-1, 'M15 18l-6-6 6-6')}
      <div class="attractions-slider dest-slider" role="group" aria-labelledby="destRowTitle${idx}">${items.map(destCardHtml).join('')}</div>
      ${arrow(1, 'M9 18l6-6-6-6')}
    </div>
  </div>`;
}
async function renderDestinations(){
  const wrap = document.getElementById('destRows');
  if (!wrap) return;
  [['destSecEyebrow','eyebrow'], ['destSecTitle','title'], ['destSecSub','sub'], ['destCreditText','credit']].forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = dtx(key);
  });
  if (!_destRowsPromise) _destRowsPromise = loadDestinationRows();
  const rows = await _destRowsPromise;
  wrap.innerHTML = rows.map(destRowHtml).join('');
  destStartImages(rows);
}
(function initDestinations(){
  const wrap = document.getElementById('destRows');
  if (!wrap) return;
  // Link ka partneru se osvežava PRE nego što se okine dugme (capture faza), da nosi
  // trenutne datume/putnike iz forme, a GA klik (bookItem) dobije isti URL.
  wrap.addEventListener('click', (e) => {
    const book = e.target.closest && e.target.closest('a.dc-book');
    if (!book) return;
    const card = book.closest('.dest-card');
    if (!card) return;
    book.href = destPartnerLink(card.dataset.kind, card.dataset.dest, card.dataset.row);
    book.dataset.url = book.href;
  }, true);
  wrap.addEventListener('click', (e) => {
    const arrowBtn = e.target.closest('.attractions-arrow');
    if (arrowBtn){
      const slider = arrowBtn.parentElement.querySelector('.dest-slider');
      if (slider) slider.scrollBy({left: Number(arrowBtn.dataset.dir) * Math.max(240, slider.clientWidth * 0.8), behavior:'smooth'});
      return;
    }
    const pick = e.target.closest('.dc-pick');
    if (!pick) return;
    const card = pick.closest('.dest-card');
    if (!card) return;
    // Isti tok kao dolazak sa ?dest= (prefillDestFromQuery): popuni Destinacija i skroluj
    // do forme, BEZ automatske pretrage — datume i putnike korisnik i dalje bira.
    const destInput = document.getElementById('dest');
    if (!destInput) return;
    destInput.value = card.dataset.dest;
    document.getElementById('searchForm')?.scrollIntoView({behavior:'smooth', block:'start'});
  });
  // Fotografija koja ne učita se sakriva, a kartica ostaje čitljiva na gradijentu.
  wrap.addEventListener('error', (e) => {
    if (e.target && e.target.tagName === 'IMG') e.target.classList.add('is-broken');
  }, true);
})();
renderDestinations();
const _prevOnLangChangeDest = window.onLangChange;
window.onLangChange = function(lang){
  if (typeof _prevOnLangChangeDest === 'function') _prevOnLangChangeDest(lang);
  renderDestinations();
};
// Promena valute (EUR/RSD): cena hotela na karticama se iscrtava ponovo.
const _prevRefreshPricesDest = refreshDisplayedPrices;
refreshDisplayedPrices = function(){
  _prevRefreshPricesDest();
  renderDestinations();
};


/* ==========================================================
   HERO: Budžet / Balans / Komfor
   Izbor postavlja preset (zvezdice hotela + tip leta) u builderState,
   sinhronizuje se sa čipovima u "Sastavi svoj paket" i određuje koji
   paket u rezultatima ide prvi (Budžet -> budget, Balans -> best,
   Komfor -> comfort). Izbor se pamti u localStorage.
========================================================== */
(function initHeroTier(){
  const wrap = document.querySelector('.hero-benefits');
  if (!wrap) return;
  const btns = Array.from(wrap.querySelectorAll('.hero-benefit[data-tier]'));
  if (!btns.length) return;
  const PRESETS = {budget:{stars:3, flight:'cheapest'}, balance:{stars:4, flight:'direct'}, comfort:{stars:5, flight:'direct'}};
  const LABEL = {budget:'Budžet', balance:'Balans', comfort:'Komfor'};
  const KEY = 'sklopi_tier';
  let syncing = false;

  function paint(tier){
    btns.forEach(b => {
      const on = b.dataset.tier === tier;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function apply(tier, opts){
    opts = opts || {};
    if (!PRESETS[tier]) return;
    window.SKLOPI_tier = tier;
    window.SKLOPI_tierChosen = true;
    paint(tier);
    const p = PRESETS[tier];
    builderState.hotelStars = p.stars;
    builderState.flightPref = p.flight;
    try { renderFormUI(); } catch (e) {}
    if (!opts.fromPlanner){
      const chip = document.querySelector('#customPlanner .cp-group[data-group="tier"] .cp-chip[data-value="' + tier + '"]');
      if (chip){ syncing = true; try { chip.click(); } finally { syncing = false; } }
    }
    try { localStorage.setItem(KEY, tier); } catch (e) {}
    if (opts.toast && typeof showToast === 'function') showToast(tx('Stil putovanja: ') + tx(LABEL[tier]));
  }

  btns.forEach(b => b.addEventListener('click', () => apply(b.dataset.tier, {toast:true})));

  // Klik na Budžet/Balans/Komfor u "Sastavi svoj paket" pomera i hero izbor.
  document.querySelectorAll('#customPlanner .cp-group[data-group="tier"] .cp-chip').forEach(chip => {
    chip.addEventListener('click', () => { if (!syncing) apply(chip.dataset.value, {fromPlanner:true}); });
  });

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved && PRESETS[saved]) apply(saved);
})();


/* Promena jezika: osvežava delove koji se iscrtavaju iz JS-a (Tvoj personalizovani plan,
   detalj plana, razrada, Moj put). Statički tekst prevodi applyStaticI18n(). */
(function(){
  const prev = window.onLangChange;
  window.onLangChange = function(lang){
    if (typeof prev === 'function') prev(lang);
    document.dispatchEvent(new Event('sklopi:lang'));
  };
})();
