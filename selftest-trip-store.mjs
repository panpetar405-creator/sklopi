// Provera trip-store.js bez pregledača:  npm run test:store
// Učitava fajl u izolovan vm kontekst sa lažnim window/document (sa i bez Buffer-a, kao u pregledaču).
import vm from 'node:vm';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('./trip-store.js', import.meta.url), 'utf8');
let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.error('  ✗ ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + (JSON.stringify(a) === JSON.stringify(b) ? '' : '  → ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)));
const tick = () => new Promise((r) => setTimeout(r, 0));

const DEFAULTS = { includeFlight: true, flightPref: 'direct', airlineName: '', includeHotel: true, hotelStars: 4,
  prioritizeRating: false, prioritizeLocation: false, carPref: 'none', activityCount: 0, insurance: false,
  esim: false, putarina: false, transferi: false, touristTax: true, budget: null };

function makeEnv({ buffer }) {
  const fields = { dest: 'Atina', origin: 'Beograd', dateFrom: '2026-10-01', dateTo: '2026-10-05', adults: '' };
  const handlers = {};
  const sb = {
    console, Promise, JSON, Object, Number, String, Array, Math, Date, isFinite, Proxy, setTimeout, escape, unescape, decodeURIComponent, encodeURIComponent,
    location: { hostname: 'sklopi.rs', search: '' },
    document: {
      getElementById: (id) => (id in fields ? { id, value: fields[id] } : null),
      addEventListener: (ev, fn) => { (handlers[ev] = handlers[ev] || []).push(fn); }
    },
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary')
  };
  if (buffer) sb.Buffer = Buffer;
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(src, sb);
  return { sb, fields, handlers, TS: sb.TripStore };
}

for (const buffer of [true, false]) {
  console.log(`\n== ${buffer ? 'Node (Buffer)' : 'pregledač (btoa/atob)'} ==`);
  const { sb, fields, handlers, TS } = makeEnv({ buffer });
  const state = TS.bindSelection(Object.assign({}, DEFAULTS));

  // --- snapshot čita DOM u trenutku poziva
  let s = TS.snapshot();
  eq([s.dest, s.origin, s.from, s.to, s.adults], ['Atina', 'Beograd', '2026-10-01', '2026-10-05', 2], 'snapshot čita polja pretrage (prazan #adults → 2, kao builderCtx)');
  fields.dest = 'Solun'; fields.adults = '3';
  s = TS.snapshot();
  eq([s.dest, s.adults], ['Solun', 3], 'snapshot odražava promenu polja bez keširanja');
  s.sel.hotelStars = 99;
  eq(state.hotelStars, 4, 'snapshot je kopija (izmena kopije ne dira izbor)');

  // --- Proxy: grupisanje i detekcija stvarne promene
  const calls = [];
  const off = TS.subscribe((snap, changed) => calls.push(changed.slice().sort().join(',')));
  state.hotelStars = 5; state.carPref = 'suv'; Object.assign(state, { activityCount: 2, esim: true });
  await tick();
  eq(calls, ['selection'], 'više upisa u istom ciklusu → JEDAN poziv pretplatniku');
  eq([state.hotelStars, state.carPref, state.activityCount, state.esim], [5, 'suv', 2, true], 'Object.assign i direktan upis menjaju izbor kao i pre');
  state.hotelStars = 5; await tick();
  eq(calls.length, 1, 'upis iste vrednosti ne javlja promenu');
  eq(Object.keys(Object.assign({}, state)).length, Object.keys(DEFAULTS).length, 'Object.assign({}, builderState) kopira sve ključeve');
  eq(JSON.parse(JSON.stringify(state)).hotelStars, 5, 'JSON.stringify(builderState) radi (čuvanje u trips.selection)');

  // --- accessori za plan i procenu
  sb.window.SKLOPI_ACTIVE_PLAN = { key: 'balans', dest: 'Solun' };
  sb.window._lastBuilderPkg = { total: 412.6, flight: {} };
  await tick();
  s = TS.snapshot();
  eq([s.planKey, s.total], ['balans', 412.6], 'SKLOPI_ACTIVE_PLAN i _lastBuilderPkg se vide u snapshot-u');
  eq(calls.slice(1), ['estimate,plan'], 'plan + procena u istom ciklusu → jedan poziv sa oba imena');
  sb.window.SKLOPI_ACTIVE_PLAN = undefined; ok(sb.window.SKLOPI_ACTIVE_PLAN === undefined, 'plan se može obrisati'); await tick();

  // --- događaji forme
  (handlers.input || []).forEach((fn) => fn({ target: { id: 'dest' } }));
  (handlers.input || []).forEach((fn) => fn({ target: { id: 'nesto-drugo' } }));
  await tick();
  eq(calls.slice(3), ['form'], 'input na #dest javlja "form", a na tuđem polju ne');
  off(); state.hotelStars = 3; await tick();
  eq(calls.length, 4, 'posle unsubscribe nema poziva');
  state.hotelStars = 4;

  // --- parse: validacija nepoverljivog ulaza
  const good = { v: 1, dest: 'Beč', origin: 'Beograd', from: '2026-10-01', to: '2026-10-05', adults: 2, sel: { hotelStars: 4, budget: 800 }, planKey: 'balans', total: 412.6 };
  const p = TS.parse(good);
  eq([p.dest, p.adults, p.from, p.to, p.planKey, p.total, p.sel.budget], ['Beč', 2, '2026-10-01', '2026-10-05', 'balans', 413, 800], 'ispravan zapis prolazi');
  ok(TS.parse(null) === null && TS.parse('nije json') === null && TS.parse([]) === null && TS.parse(42) === null, 'null / loš JSON / niz / broj → null');
  ok(TS.parse({ ...good, v: 2 }) === null, 'nepoznata verzija → null');
  ok(TS.parse({ ...good, dest: '' }) === null && TS.parse({ ...good, dest: 'x'.repeat(61) }) === null && TS.parse({ ...good, dest: 7 }) === null, 'prazna / predugačka / ne-string destinacija → null');
  eq(TS.parse({ ...good, dest: '<img src=x onerror=alert(1)>Rim' }).dest, 'img src=x onerror=alert(1)Rim', '< > i kontrolni znakovi se uklanjaju iz teksta');
  eq([0, 21, 2.5, 'x', -1].map((a) => TS.parse({ ...good, adults: a }).adults), [2, 2, 2, 2, 2], 'adults van 1–20 ili ne-ceo → podrazumevano 2');
  eq(TS.parse({ ...good, adults: 20 }).adults, 20, 'adults = 20 je dozvoljeno');
  ok(!('from' in TS.parse({ ...good, from: '2026-10-09', to: '2026-10-05' })), 'datumi u obrnutom redosledu se odbacuju');
  ok(!('from' in TS.parse({ ...good, from: '2026-10-01', to: '2027-03-01' })), 'putovanje duže od 60 dana se odbacuje');
  ok(!('from' in TS.parse({ ...good, from: '01.10.2026', to: '05.10.2026' })), 'datum van ISO formata se odbacuje');
  ok(!('from' in TS.parse({ ...good, from: '2026-13-45', to: '2026-14-50' })), 'nepostojeći datum se odbacuje');
  const dirty = TS.parse({ ...good, sel: { hotelStars: '5', carPref: 7, evil: true, __proto__: { polluted: 1 }, constructor: 1, esim: true, activityCount: 999, budget: -5, airlineName: 'x'.repeat(100) } });
  eq(dirty.sel, { esim: true }, 'sel: samo poznati ključevi sa tačnim tipom i opsegom (ostalo odbačeno)');
  ok(({}).polluted === undefined && Object.prototype.polluted === undefined, 'nema zagađenja prototipa');
  const viaJson = TS.parse('{"v":1,"dest":"Rim","sel":{"__proto__":{"polluted":1}}}');
  ok(viaJson && ({}).polluted === undefined && Object.keys(viaJson.sel).length === 0, 'JSON sa "__proto__" u sel ne zagađuje i ne prolazi');
  ok(TS.parse({ ...good, planKey: 'a b<c' }).planKey === null && TS.parse({ ...good, total: -1 }).total === null && TS.parse({ ...good, total: 1e9 }).total === null, 'planKey sa lošim znacima i total van opsega → null');

  // --- hash (deljenje bez naloga)
  for (const dest of ['Beč', 'Београд', 'Zürich', 'Atina']) {
    const h = TS.toHash({ ...good, dest });
    const back = TS.fromHash(h);
    ok(h.startsWith('#t=') && !/[+/=]/.test(h.slice(3)) && back && back.dest === dest, `hash round-trip: ${dest} (${h.length} znakova, URL-bezbedan)`);
  }
  ok(TS.fromHash('#t=!!!') === null && TS.fromHash('') === null && TS.fromHash('#x=abc') === null && TS.fromHash('#t=' + 'A'.repeat(4001)) === null, 'loš / prazan / predugačak hash → null');
  ok(TS.fromHash('#t=' + Buffer.from('{"v":1,"dest":"<b>"}').toString('base64url')).dest === 'b', 'hash sa HTML-om prolazi kroz isto čišćenje');

  // --- applySelection
  TS.applySelection(TS.parse({ ...good, sel: { hotelStars: 3, carPref: 'small', evil: 1 } })); await tick();
  eq([state.hotelStars, state.carPref, 'evil' in state], [3, 'small', false], 'applySelection primenjuje samo validirane izbore');
  const roundtrip = TS.parse(TS.serialize());
  ok(roundtrip && roundtrip.dest === 'Solun' && roundtrip.sel.hotelStars === 3, 'serialize() → parse() vraća isto putovanje');
}

console.log(`\n${failed ? '✗' : '✓'} ${passed} provera prošlo${failed ? ', ' + failed + ' palo' : ''}`);
process.exit(failed ? 1 : 0);
