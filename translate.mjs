#!/usr/bin/env node
/* ==========================================================================
   SKLOPI — automatski prevod sa srpskog (locales/sr.json) na ostale jezike
   ==========================================================================
   Piše se SAMO locales/sr.json. Ova skripta:
     1) nađe ključeve koji fale (ili su im se srpski tekst promenio) u svakom
        jeziku iz locales/languages.json,
     2) prevede ih preko Claude API-ja (ANTHROPIC_API_KEY),
     3) proveri prevod (placeholderi {n}, HTML tagovi, brendovi, oblici množine),
     4) upiše locales/<jezik>.json + locales/_state.json,
     5) generiše i18n-data.js (to je jedino što sajt učitava).

   Ručno ispravljen prevod skripta NE prepisuje: ako se posle toga promeni
   srpski tekst, ključ se samo prijavi kao "proveri ručno" (vidi --retranslate-changed).

   Upotreba:
     node scripts/translate.mjs                  prevedi sve što fali + generiši i18n-data.js
     node scripts/translate.mjs --dry-run        samo prikaži šta bi se prevodilo
     node scripts/translate.mjs --check          bez API-ja; izlaz 1 ako nešto fali/nije ispravno
     node scripts/translate.mjs --build          samo generiši i18n-data.js (bez API-ja)
     node scripts/translate.mjs --lang de        samo taj jezik
     node scripts/translate.mjs --retranslate-changed   ponovo prevedi i ručne prevode kojima se izvor promenio
     node scripts/translate.mjs --retranslate kljuc1,kljuc2   ponovo prevedi navedene ključeve
     node scripts/translate.mjs --prune          obriši ključeve koji više ne postoje u sr.json
     node scripts/translate.mjs --mock           lažni prevod (za testiranje, bez API-ja)
   Okruženje: ANTHROPIC_API_KEY (obavezno za prevod), ANTHROPIC_MODEL (podrazumevano claude-sonnet-5).
   ========================================================================== */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes('--' + n);
const opt = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };

const HERE = path.dirname(fileURLToPath(import.meta.url));
/* Radi u oba rasporeda: skripta u scripts/ + locales/ (kao u PREVODI.md), ili sve u korenu repoa. */
const ROOT = path.resolve(opt('root') || (path.basename(HERE) === 'scripts' ? path.join(HERE, '..') : HERE));
const LOC = fs.existsSync(path.join(ROOT, 'locales')) ? path.join(ROOT, 'locales') : ROOT;
const F = {
  langs: path.join(LOC, 'languages.json'),
  state: path.join(LOC, '_state.json'),
  notes: path.join(LOC, '_notes.json'),
  glossary: path.join(LOC, '_glossary.json'),
  data: path.join(ROOT, 'i18n-data.js'),
  html: path.join(ROOT, 'index.html'),
};

/* ---------- .env (opciono; nikad ne commituj) ---------- */
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

/* ---------- pomoćnici ---------- */
const readJson = (f, fallback) => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : fallback;
const writeJson = (f, obj) => fs.writeFileSync(f, JSON.stringify(obj, null, 2) + '\n');
const h = (s) => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 10);
const log = (...a) => console.log(...a);

const cfg = readJson(F.langs);
if (!cfg) { console.error('Nedostaje locales/languages.json'); process.exit(2); }
const SRC = cfg.source || 'sr';
const LANGS = cfg.languages;
const langInfo = (code) => LANGS.find((l) => l.code === code);
if (!langInfo(SRC)) { console.error('Izvorni jezik ' + SRC + ' nije u languages.json'); process.exit(2); }

const notes = readJson(F.notes, {});
const glossary = readJson(F.glossary, { keep: [] });
const state = readJson(F.state, {});

const sr = readJson(path.join(LOC, SRC + '.json'), {});
const srKeys = Object.keys(sr);

/* ---------- grupe ključeva ---------- */
const PLACE_PREFIXES = ['city.', 'country.', 'country_loc.'];
const groupOf = (key) =>
  key.startsWith('plural.') ? 'plural'
  : PLACE_PREFIXES.some((p) => key.startsWith(p)) ? 'place'
  : 'ui';

const PLURAL_ORDER = ['zero', 'one', 'two', 'few', 'many', 'other'];
function pluralCategories(code) {
  let pr;
  try { pr = new Intl.PluralRules(code); } catch { pr = new Intl.PluralRules('en'); }
  return pr.resolvedOptions().pluralCategories.slice().sort((a, b) => PLURAL_ORDER.indexOf(a) - PLURAL_ORDER.indexOf(b));
}

/* ---------- validacija prevoda ---------- */
const placeholders = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(',');
const tagSeq = (s) => (String(s).match(/<\/?[a-zA-Z][a-zA-Z0-9]*/g) || []).map((t) => t.toLowerCase()).sort().join(',');
// &nbsp; je samo tipografska sitnica (srpski je koristi da veznik ne ostane sam na kraju reda) — ne proverava se
const entities = (s) => (String(s).match(/&[a-zA-Z#0-9]+;/g) || []).filter((e) => e !== '&nbsp;').sort().join(',');
function validate(key, srText, out, code) {
  if (typeof out !== 'string' || out.trim() === '') return 'prazan prevod';
  if (placeholders(out) !== placeholders(srText)) return `placeholderi se ne poklapaju (izvor {${placeholders(srText)}}, prevod {${placeholders(out)}})`;
  if (tagSeq(out) !== tagSeq(srText)) return 'HTML tagovi se ne poklapaju';
  if (entities(out) !== entities(srText)) return 'HTML entiteti se ne poklapaju';
  for (const brand of glossary.keep || []) {
    if (srText.includes(brand) && !out.includes(brand)) return `naziv "${brand}" mora ostati nepromenjen`;
  }
  if (groupOf(key) === 'plural') {
    const n = pluralCategories(code).length;
    const got = out.split('|').length;
    if (got !== n) return `množina: očekivano ${n} oblika odvojenih sa "|", dobijeno ${got}`;
    if (out.split('|').some((x) => x.trim() === '')) return 'množina: prazan oblik';
  }
  if (groupOf(key) === 'place' && /[\n{}<>]/.test(out)) return 'naziv mesta ne sme imati nove redove, {} ni HTML';
  return null;
}

/* ---------- Claude API ---------- */
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
async function callClaude(system, userObj) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Nedostaje ANTHROPIC_API_KEY (postavi promenljivu okruženja ili fajl .env u korenu projekta).');
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 8000,
          system,
          messages: [{ role: 'user', content: JSON.stringify(userObj) }],
        }),
      });
      if (res.status === 429 || res.status >= 500) throw new Error('HTTP ' + res.status + ' (privremeno)');
      if (!res.ok) { const body = await res.text(); const e = new Error('HTTP ' + res.status + ': ' + body.slice(0, 300)); e.fatal = true; throw e; }
      const data = await res.json();
      const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
      const a = text.indexOf('{'), b = text.lastIndexOf('}');
      if (a === -1 || b === -1) throw new Error('odgovor nije JSON');
      return JSON.parse(text.slice(a, b + 1));
    } catch (e) {
      lastErr = e;
      if (e.fatal) throw e;
      const wait = 1500 * 2 ** (attempt - 1);
      log(`   ⚠ pokušaj ${attempt}/4 nije uspeo (${e.message}); ponavljam za ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

function buildSystemPrompt(code, group) {
  const li = langInfo(code);
  const tone = li.tone || 'Friendly, concise, informal UI voice. Use the informal second person singular where the language distinguishes it (the Serbian source uses "ti").';
  let s = `You are a professional translator localizing the website UI of SKLOPI, a travel-package builder (flights + hotel + rental car + activities combined into one estimated price). Users are travellers from the Balkans and beyond.
Source language: Serbian (Latin script). Target language: ${li.name} (code "${code}", locale ${li.locale}).
Voice: ${tone}

Rules:
- Translate the meaning naturally for a native reader; do not translate word by word. Keep it as short as the source.
- Keep EXACTLY as in the source: {placeholders} such as {n} or {city}, HTML tags and their attributes, HTML entities, emoji, and line breaks.
- Never translate these brand/product names: ${(glossary.keep || []).join(', ') || 'SKLOPI'}.
- Do not add explanations. Do not add or remove placeholders or HTML tags.
- Each item may carry a "note" with context from the developer — follow it. An "en" field, when present, is an existing English translation to use as a reference for meaning and tone (still translate from the Serbian).
- Reply with ONLY one JSON object mapping every input key to its translation. No markdown, no commentary, no extra keys.`;
  if (group === 'place') {
    s += `
- These items are place names (cities, regions, countries). Return the standard name used in ${li.name} (the usual exonym, e.g. Serbian "Beograd" -> English "Belgrade"). If ${li.name} uses the same name, return it unchanged. For keys starting with "country_loc.", the Serbian source is a country name in the locative case (as in "u Hrvatskoj"); return just the country name in the form that directly follows the word for "in" in the target language.`;
  }
  if (group === 'plural') {
    const cats = pluralCategories(code);
    s += `
- These items are plural sets of ONE noun (or noun phrase). The source lists the forms separated by "|" in CLDR order for Serbian (one|few|other). For ${li.name} return EXACTLY ${cats.length} forms separated by "|", in this CLDR plural-category order: ${cats.join(' | ')}. The forms are used after an integer (e.g. "1 <one>", "3 <few>", "25 <other/many>"). Forms may repeat if the language uses the same word for several categories.`;
  }
  return s;
}

function noteFor(key) {
  if (notes[key]) return notes[key];
  const p = Object.keys(notes).filter((k) => k.endsWith('.') && key.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  return p ? notes[p] : undefined;
}

/* ---------- lažni prevod (--mock) ---------- */
function mockTranslate(code, items) {
  const out = {};
  for (const it of items) {
    if (groupOf(it.key) === 'plural') {
      const n = pluralCategories(code).length;
      const base = it.sr.split('|');
      out[it.key] = Array.from({ length: n }, (_, i) => `[${code}] ${base[Math.min(i, base.length - 1)]}`).join('|');
    } else out[it.key] = `[${code}] ${it.sr}`;
  }
  return out;
}

/* ---------- prevod jedne serije (sa jednim ponavljanjem za neispravne) ---------- */
async function translateBatch(code, group, items, enRef) {
  const system = buildSystemPrompt(code, group);
  const toInput = (list, errs = {}) => {
    const o = {};
    for (const it of list) {
      o[it.key] = { sr: it.sr };
      if (enRef && enRef[it.key] && code !== 'en') o[it.key].en = enRef[it.key];
      const n = noteFor(it.key); if (n) o[it.key].note = n;
      if (errs[it.key]) o[it.key].previous_answer_was_invalid = errs[it.key];
    }
    return { items: o };
  };
  const run = async (list, errs) => (flag('mock') ? mockTranslate(code, list) : callClaude(system, toInput(list, errs)));

  let res = await run(items, {});
  const good = {}, bad = [];
  const errs = {};
  for (const it of items) {
    const err = validate(it.key, it.sr, res[it.key], code);
    if (err) { bad.push(it); errs[it.key] = err; } else good[it.key] = res[it.key];
  }
  if (bad.length) {
    log(`   ↻ ${bad.length} ključeva nije prošlo proveru, pokušavam ponovo`);
    const res2 = await run(bad, errs);
    for (const it of bad) {
      const err = validate(it.key, it.sr, res2[it.key], code);
      if (err) log(`   ✗ ${it.key}: ${err}`); else good[it.key] = res2[it.key];
    }
  }
  return good;
}

const BATCH = { ui: 25, place: 80, plural: 20 };
function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/* ---------- glavni tok ---------- */
const targets = LANGS.map((l) => l.code).filter((c) => c !== SRC).filter((c) => !opt('lang') || c === opt('lang'));
// 'en' ide prvi da bi služio kao referenca za ostale jezike
targets.sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : 0));

const forced = new Set((opt('retranslate') || '').split(',').map((s) => s.trim()).filter(Boolean));
const report = {};
let exitCode = 0;

function planLang(code, data) {
  const st = (state[code] ||= {});
  const todo = [], stale = [], orphans = [];
  let adopted = 0;
  for (const key of srKeys) {
    const sh = h(sr[key]);
    const cur = data[key];
    const s = st[key];
    if (forced.has(key)) { todo.push({ key, sr: sr[key], why: 'forsirano' }); continue; }
    if (cur === undefined || cur === '') { todo.push({ key, sr: sr[key], why: 'novo' }); continue; }
    if (!s) { st[key] = { s: sh, o: null }; adopted++; continue; }   // postojeći (ručni) prevod
    if (s.s !== sh) {
      if (s.o && h(cur) === s.o) todo.push({ key, sr: sr[key], why: 'izvor promenjen' });
      else if (flag('retranslate-changed')) todo.push({ key, sr: sr[key], why: 'izvor promenjen (ručni prevod, forsirano)' });
      else stale.push(key);
    }
  }
  for (const key of Object.keys(data)) if (!(key in sr)) orphans.push(key);
  return { todo, stale, orphans, adopted };
}

function orderedLangData(data) {
  const out = {};
  for (const k of srKeys) if (k in data) out[k] = data[k];
  for (const k of Object.keys(data)) if (!(k in out)) out[k] = data[k];   // siročići (ako nisu obrisani)
  return out;
}

for (const code of targets) {
  const file = path.join(LOC, code + '.json');
  const data = readJson(file, {});
  const plan = planLang(code, data);

  if (flag('prune') && plan.orphans.length) {
    plan.orphans.forEach((k) => { delete data[k]; delete (state[code] || {})[k]; });
    log(`[${code}] obrisano ${plan.orphans.length} ključeva kojih nema u ${SRC}.json`);
    plan.orphans = [];
  }

  const invalid = [];
  for (const key of srKeys) {
    if (data[key] !== undefined && data[key] !== '') {
      const e = validate(key, sr[key], data[key], code);
      if (e) invalid.push(`${key}: ${e}`);
    }
  }

  report[code] = { todo: plan.todo.length, stale: plan.stale.length, orphans: plan.orphans.length, invalid: invalid.length };
  log(`\n[${code}] ${langInfo(code).name}: fali/za prevod ${plan.todo.length}, ručni prevodi sa promenjenim izvorom ${plan.stale.length}, viška ${plan.orphans.length}, neispravnih ${invalid.length}`);
  if (plan.adopted) log(`   (${plan.adopted} postojećih prevoda preuzeto kao ručno napisani)`);
  if (plan.stale.length) { log('   proveri ručno (srpski se promenio, prevod nije):'); plan.stale.slice(0, 30).forEach((k) => log('     - ' + k)); if (plan.stale.length > 30) log(`     … i još ${plan.stale.length - 30}`); }
  if (plan.orphans.length) log(`   ključevi kojih nema u ${SRC}.json (obriši sa --prune): ${plan.orphans.slice(0, 10).join(', ')}${plan.orphans.length > 10 ? ' …' : ''}`);
  if (invalid.length) { log('   neispravni prevodi:'); invalid.slice(0, 20).forEach((x) => log('     - ' + x)); }

  if (flag('check') || flag('build')) {
    if (flag('check') && (plan.todo.length || invalid.length)) exitCode = 1;
    continue;
  }
  if (flag('dry-run')) { plan.todo.slice(0, 40).forEach((t) => log(`     • ${t.key} (${t.why})`)); if (plan.todo.length > 40) log(`     … i još ${plan.todo.length - 40}`); continue; }

  // ---- prevod
  const enRef = readJson(path.join(LOC, 'en.json'), {});
  const st = state[code];
  const groups = { ui: [], place: [], plural: [] };
  plan.todo.forEach((t) => groups[groupOf(t.key)].push(t));
  let done = 0, failed = 0;
  for (const g of ['ui', 'plural', 'place']) {
    for (const part of chunk(groups[g], BATCH[g])) {
      log(`   → ${g}: ${part.length} ključeva (${done + failed}/${plan.todo.length})`);
      let good;
      try { good = await translateBatch(code, g, part, code === 'en' ? null : enRef); }
      catch (e) { console.error('   ✗ greška: ' + e.message); process.exitCode = 1; failed += part.length; if (e.fatal || /ANTHROPIC_API_KEY/.test(e.message)) { writeJson(F.state, state); throw e; } continue; }
      for (const t of part) {
        if (good[t.key] !== undefined) { data[t.key] = good[t.key]; st[t.key] = { s: h(sr[t.key]), o: h(good[t.key]) }; done++; }
        else failed++;
      }
      writeJson(file, orderedLangData(data));   // upis posle svake serije — prekid ne gubi rad
      writeJson(F.state, state);
    }
  }
  writeJson(file, orderedLangData(data));
  writeJson(F.state, state);
  log(`   ✓ [${code}] prevedeno ${done}${failed ? `, NIJE uspelo ${failed} (pokreni ponovo)` : ''}`);
  if (failed) exitCode = 1;
}

/* ---------- generisanje i18n-data.js ---------- */
if (!flag('check') && !flag('dry-run')) {
  const out = {};
  for (const l of LANGS) {
    const data = l.code === SRC ? sr : readJson(path.join(LOC, l.code + '.json'), {});
    const o = {};
    for (const k of srKeys) if (k in data && data[k] !== '') o[k] = data[k];   // fali → t() pada na srpski
    out[l.code] = o;
  }
  const meta = LANGS.map((l) => ({ code: l.code, short: l.short, name: l.name, locale: l.locale, ...(l.dateMonth ? { dateMonth: l.dateMonth } : {}) }));
  const body =
`/* AUTOMATSKI GENERISANO iz locales/*.json — NE MENJAJ RUČNO.
   Ažuriranje: node scripts/translate.mjs   (vidi PREVODI.md) */
const I18N_LANGS = ${JSON.stringify(meta)};
const I18N = {
${LANGS.map((l) => `  ${JSON.stringify(l.code)}: ${JSON.stringify(out[l.code])}`).join(',\n')}
};
`;
  const changed = !fs.existsSync(F.data) || fs.readFileSync(F.data, 'utf8') !== body;
  if (changed) fs.writeFileSync(F.data, body);
  log(`\n${changed ? '✓ generisan' : '= nepromenjen'} i18n-data.js (${LANGS.map((l) => l.code + ':' + Object.keys(out[l.code]).length).join(', ')})`);

  // keš-bust: i18n-data.js?v=<hash> u index.html
  if (fs.existsSync(F.html)) {
    const html = fs.readFileSync(F.html, 'utf8');
    const v = h(body).slice(0, 8);
    const next = html.replace(/i18n-data\.js(\?v=[^"']*)?/, 'i18n-data.js?v=' + v);
    if (next !== html) { fs.writeFileSync(F.html, next); log('✓ index.html: i18n-data.js?v=' + v); }
  }
}

if (flag('check')) log(exitCode ? '\n✗ Provera nije prošla.' : '\n✓ Provera prošla: svi prevodi postoje i ispravni su.');
process.exit(exitCode);
