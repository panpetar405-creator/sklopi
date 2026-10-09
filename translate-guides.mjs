/* ==========================================================
   SKLOPI — translate-guides.mjs
   Automatski prevodi vodiče (vodic-<grad>.html + vodici.html) na sve jezike iz languages.json,
   isto kao translate.mjs za aplikaciju. Piše se samo srpski; ostalo nastaje skriptom.

     ANTHROPIC_API_KEY=sk-ant-...  node translate-guides.mjs

   Rezultat: vodic-<grad>-<kod>.html i vodici-<kod>.html (npr. vodic-rim-de.html), sa ispravnim
   <html lang>, canonical, hreflang (na SVIM verzijama), og:*, JSON-LD i linkovima na prevedene stranice.
   Posle: npm run stamp && npm run sitemap && npm run check:assets

   Kako radi (bez zavisnosti): iz HTML-a izvuče tekstualne blokove (h1-h6, p, li, a, time...) i
   atribute (alt, aria-label, title, meta), pošalje ih Claude-u kao JSON, proveri da je svaki
   segment zadržao ISTE inline tagove, pa ih vrati na isto mesto — struktura stranice se ne menja.

   Opcije:
     --lang de,en       samo ti jezici             --only rim,pariz   samo ti vodiči (slug iz imena fajla)
     --dry-run          samo prikaže šta bi radio  --check           izlaz 1 ako nešto fali/zastarelo (bez API-ja)
     --force            prepiše i RUČNO napisane prevode (podrazumevano se ne diraju)
     --fake             lažni prevod "[de] ..." za test strukture (bez API-ja; piše u ./_guides_fake/)
   Okruženje: ANTHROPIC_API_KEY, ANTHROPIC_MODEL (podrazumevano claude-sonnet-5). Može i .env u korenu.
========================================================== */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = new URL('.', import.meta.url).pathname;
const SITE = 'https://sklopi.rs';
const args = process.argv.slice(2);
const flag = (n) => args.includes('--' + n);
const opt = (n) => { const i = args.indexOf('--' + n); return i >= 0 ? (args[i + 1] || '').split(',').filter(Boolean) : null; };
const FAKE = flag('fake'), DRY = flag('dry-run'), CHECK = flag('check'), FORCE = flag('force');
const OUT = FAKE ? join(ROOT, '_guides_fake') : ROOT;
if (FAKE) mkdirSync(OUT, { recursive: true });

if (existsSync(join(ROOT, '.env'))) {
  for (const l of readFileSync(join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*)$/.exec(l);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const cfg = JSON.parse(readFileSync(join(ROOT, 'languages.json'), 'utf8'));
const LANGS = cfg.languages.filter((l) => l.code !== cfg.source).filter((l) => !opt('lang') || opt('lang').includes(l.code));
const ALL_CODES = cfg.languages.map((l) => l.code);
const OG = { sr: 'sr_RS', en: 'en_GB', ru: 'ru_RU', de: 'de_DE' };
const statePath = join(ROOT, '_guides_state.json');
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {};
const sha = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);

/* ---------- izvorni fajlovi: vodic-<slug>.html (bez jezičkog sufiksa) + vodici.html ---------- */
const suffixRe = new RegExp('-(' + ALL_CODES.filter((c) => c !== cfg.source).join('|') + ')\\.html$');
const sources = readdirSync(ROOT).filter((f) => /^vodic-[a-z0-9-]+\.html$/.test(f) && !suffixRe.test(f)).concat('vodici.html')
  .filter((f) => !opt('only') || opt('only').some((s) => f === 'vodic-' + s + '.html' || (s === 'vodici' && f === 'vodici.html')));
const targetName = (src, code) => src.replace(/\.html$/, '') + '-' + code + '.html';
// stabilan hash izvora: bez ?v= žigova, hreflang blokova i skripte za jezik (da ih npm run stamp ne "menja")
const srcHash = (html) => sha(html.replace(/\?v=[0-9a-f]+/g, '').replace(/<link rel="alternate" hreflang[^>]*>\s*/g, '').replace(/<script src="guide-lang\.js[^>]*><\/script>\s*/g, ''));

/* ---------- izvlačenje segmenata ---------- */
const BLOCK = /<(h[1-6]|p|li|time|figcaption|dt|dd|summary|label|button|a)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
const TAG = /<[a-z][^>]*>/gi;
const ATTRS = ['alt', 'aria-label', 'title', 'placeholder'];
const META = /<meta\b[^>]*\b(?:name|property)="(?:description|og:title|og:description|twitter:title|twitter:description)"[^>]*>/gi;
const hasLetters = (s) => /\p{L}/u.test(s.replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, ''));
const inlineTags = (s) => (s.match(/<\/?[a-z][a-z0-9]*/gi) || []).join(',').toLowerCase();

function maskAll(html) {
  const stash = [];
  const out = html.replace(/<(script|style|svg|noscript)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->/gi, (m) => { stash.push(m); return '\u0001' + (stash.length - 1) + '\u0002'; });
  return { out, stash };
}
const unmask = (s, stash) => s.replace(/\u0001(\d+)\u0002/g, (_, i) => stash[+i]);

/** Jedan prolaz: fn(tekst) → zamena (ili undefined = ne diraj). Isti redosled u collect i apply modu. */
function walk(html, fn) {
  const { out, stash } = maskAll(html);
  let s = out;
  s = s.replace(/<title>([\s\S]*?)<\/title>/i, (m, t) => { const r = hasLetters(t) ? fn(t, 'title') : undefined; return r === undefined ? m : '<title>' + r + '</title>'; });
  s = s.replace(META, (tag) => tag.replace(/(\bcontent=")([^"]*)(")/i, (m, a, v, b) => { const r = fn(v, 'meta'); return r === undefined ? m : a + r + b; }));
  s = s.replace(BLOCK, (m, tag, attrs, inner) => {
    if (/\u0001/.test(inner) || !hasLetters(inner) || /^\s*SKLOPI\b/.test(inner.replace(/<[^>]*>/g, ''))) return m;
    const r = fn(inner, 'block:' + tag.toLowerCase());
    return r === undefined ? m : '<' + tag + attrs + '>' + r + '</' + tag + '>';
  });
  s = s.replace(TAG, (tag) => {
    let t = tag;
    for (const a of ATTRS) t = t.replace(new RegExp('(\\b' + a + '=")([^"]*)(")', 'i'), (m, x, v, y) => { if (!hasLetters(v)) return m; const r = fn(v, 'attr:' + a); return r === undefined ? m : x + r + y; });
    return t;
  });
  return unmask(s, stash);
}

/* ---------- JSON-LD (headline/name/description) ---------- */
function mapLd(html, fn, rewrite) {
  return html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (m, a, body, b) => {
    let j; try { j = JSON.parse(body); } catch (e) { return m; }
    const visit = (o) => {
      if (Array.isArray(o)) return o.forEach(visit);
      if (o && typeof o === 'object') for (const k of Object.keys(o)) {
        if (typeof o[k] === 'string') {
          if (['headline', 'description'].includes(k) || (k === 'name' && o[k] !== 'SKLOPI')) { const r = fn(o[k]); if (r !== undefined) o[k] = r; }
          if (rewrite) o[k] = rewrite(k, o[k]);
        } else visit(o[k]);
      }
    };
    visit(j);
    return a + '\n' + JSON.stringify(j, null, 2) + '\n' + b;
  });
}

/* ---------- Claude ---------- */
async function callClaude(lang, batch) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw Object.assign(new Error('Nedostaje ANTHROPIC_API_KEY (promenljiva okruženja ili .env).'), { fatal: true });
  const sys = 'You translate a Serbian (Latin script) travel-guide web page for the Serbian travel site SKLOPI (sklopi.rs) into ' + lang.name + ' (' + lang.code + '). '
    + 'Input is a JSON object {"id": "html fragment"}. Return ONLY a JSON object with exactly the same ids. Rules: keep ALL HTML tags and their order unchanged (<strong>, <br>, <a ...>, <em> ...); '
    + 'translate only the human-readable text and attribute-free text between tags; never translate or alter URLs, numbers with units, currency symbols (€), dates format may follow the target language; '
    + 'keep brand names unchanged (SKLOPI, Booking.com, KAYAK, Viator, WhatsApp, eSIM); use the normal target-language names of cities/places (e.g. Atina → Athens/Athen/Афины); '
    + 'natural, accurate, helpful tone for travellers, SEO titles up to ~60 chars, meta descriptions up to ~160 chars. No commentary, no markdown fences.';
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 8000, system: sys, messages: [{ role: 'user', content: JSON.stringify(batch) }] })
    });
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 2500 * (attempt + 1))); continue; }
    if (!res.ok) throw Object.assign(new Error('Claude HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200)), { fatal: res.status === 401 });
    const data = await res.json();
    const txt = (data.content || []).map((c) => c.text || '').join('');
    try { return JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1)); } catch (e) { /* ponovi */ }
  }
  throw new Error('Claude nije vratio ispravan JSON.');
}

async function translateSegments(lang, texts) {
  if (FAKE) return texts.map((t) => t.replace(/^([^<]*)/, '[' + lang.code + '] $1'));
  const out = new Array(texts.length);
  let i = 0;
  while (i < texts.length) {
    const ids = []; let size = 0;
    while (i + ids.length < texts.length && ids.length < 40 && size < 9000) { size += texts[i + ids.length].length; ids.push(i + ids.length); }
    const batch = Object.fromEntries(ids.map((n) => [String(n), texts[n]]));
    let got = await callClaude(lang, batch);
    // validacija: svaki segment mora zadržati iste inline tagove; neispravne ponovi pojedinačno (1 put)
    for (const n of ids) {
      let v = got[String(n)];
      if (typeof v !== 'string' || inlineTags(v) !== inlineTags(texts[n])) {
        const again = await callClaude(lang, { [String(n)]: texts[n] }).catch(() => ({}));
        v = again[String(n)];
        if (typeof v !== 'string' || inlineTags(v) !== inlineTags(texts[n])) throw new Error('Segment ' + n + ' nema iste tagove posle prevoda: ' + texts[n].slice(0, 60));
      }
      out[n] = v;
    }
    i += ids.length;
  }
  return out;
}

/* ---------- linkovi, head, hreflang ---------- */
function rewriteLinks(html, code) {
  return html.replace(/(\bhref=")([^"]*)(")/g, (m, a, href, b) => {
    let h = href;
    if (/^(https?:|mailto:|tel:|#)/.test(h)) return m;
    const mm = /^(vodic-[a-z0-9-]+|vodici)\.html(.*)$/.exec(h);
    if (mm && !suffixRe.test(mm[1] + '.html')) h = mm[1] + '-' + code + '.html' + mm[2];
    else if (/^index\.html/.test(h)) {
      const [, q = '', hash = ''] = /^index\.html(\?[^#]*)?(#.*)?$/.exec(h) || [];
      h = 'index.html' + (q ? q + '&lang=' + code : '?lang=' + code) + hash;
    }
    return a + h + b;
  });
}
const abs = (f) => SITE + '/' + f;
function setHead(html, file, code, variants /* {code: file} */) {
  let s = html.replace(/<html lang="[^"]*"/i, '<html lang="' + code + '"');
  s = s.replace(/<link rel="alternate" hreflang[^>]*>\s*/g, '');
  const alt = Object.keys(variants).sort((a, b) => ALL_CODES.indexOf(a) - ALL_CODES.indexOf(b))
    .map((c) => '<link rel="alternate" hreflang="' + c + '" href="' + abs(variants[c]) + '">').join('\n')
    + '\n<link rel="alternate" hreflang="x-default" href="' + abs(variants[cfg.source]) + '">\n';
  if (/<link rel="canonical"[^>]*>\s*/i.test(s)) s = s.replace(/(<link rel="canonical"[^>]*>\s*)/i, '<link rel="canonical" href="' + abs(file) + '">\n' + alt);
  s = s.replace(/(<meta property="og:url" content=")[^"]*(")/i, '$1' + abs(file) + '$2');
  s = s.replace(/(<meta property="og:locale" content=")[^"]*(")/i, '$1' + (OG[code] || 'en_GB') + '$2');
  s = mapLd(s, () => undefined, (k, v) => {
    if (k === 'inLanguage') return code;
    if (typeof v === 'string' && v.startsWith(SITE + '/vodic') && !suffixRe.test(v.split('#')[0])) {
      const [u, h = ''] = v.split('#'); const base = u.replace(SITE + '/', '').replace(/\.html$/, '');
      return code === cfg.source ? v : SITE + '/' + base + '-' + code + '.html' + (h ? '#' + h : '');
    }
    return v;
  });
  if (!/guide-lang\.js/.test(s)) s = s.replace(/(<script src="contact\.js)/, '<script src="guide-lang.js"></script>\n$1');
  return s;
}

/* ---------- glavni tok ---------- */
const today = new Date().toISOString().slice(0, 10);
let made = 0, skipped = 0, stale = 0, failed = 0;
const need = [];
for (const src of sources) {
  const html = readFileSync(join(ROOT, src), 'utf8');
  const h = srcHash(html);
  for (const lang of LANGS) {
    const tgt = targetName(src, lang.code);
    const exists = existsSync(join(ROOT, tgt));
    const st = state[tgt];
    if (exists && !st && !FORCE) { console.log('= ručno napisan  ' + tgt + '  (ne diram; --force da prepišem)'); skipped++; continue; }
    if (exists && st && st.src === h && !FORCE) { skipped++; continue; }
    need.push({ src, tgt, lang, html, h, outdated: exists });
    if (exists) stale++;
  }
}
if (CHECK) { for (const n of need) console.error('✗ ' + (n.outdated ? 'zastareo ' : 'nedostaje ') + n.tgt); console.log(need.length ? '\nFali/zastareva: ' + need.length : 'OK — svi vodiči prevedeni.'); process.exit(need.length ? 1 : 0); }
if (DRY) { for (const n of need) console.log((n.outdated ? '↻ ' : '+ ') + n.tgt); console.log('\nZa prevod: ' + need.length + ', preskočeno: ' + skipped); process.exit(0); }

for (const n of need) {
  try {
    const texts = []; walk(n.html, (t) => { texts.push(t); return undefined; });
    const ldTexts = []; mapLd(n.html, (t) => { ldTexts.push(t); return undefined; });
    const all = texts.concat(ldTexts);
    const tr = await translateSegments(n.lang, all);
    let i = 0;
    let out = walk(n.html, () => tr[i++]);
    let j = texts.length;
    out = mapLd(out, () => tr[j++]);
    out = rewriteLinks(out, n.lang.code);
    writeFileSync(join(OUT, n.tgt), out);
    state[n.tgt] = { src: n.h, lang: n.lang.code, at: today, model: FAKE ? 'fake' : MODEL };
    console.log('✓ ' + n.tgt + '  (' + all.length + ' segmenata)');
    made++;
  } catch (e) {
    console.error('✗ ' + n.tgt + ' — ' + e.message); failed++;
    if (e.fatal) break;
  }
}

/* head + hreflang na SVIM verzijama (srpski izvor i prevodi) */
if (!FAKE) {
  for (const src of sources) {
    const variants = { [cfg.source]: src };
    for (const l of cfg.languages) if (l.code !== cfg.source && existsSync(join(ROOT, targetName(src, l.code)))) variants[l.code] = targetName(src, l.code);
    for (const [code, file] of Object.entries(variants)) {
      const p = join(ROOT, file); const cur = readFileSync(p, 'utf8');
      const next = setHead(cur, file, code, variants);
      if (next !== cur) writeFileSync(p, next);
    }
  }
  writeFileSync(statePath, JSON.stringify(state, null, 1) + '\n');
} else {
  // u fake modu head se ne sinhronizuje; samo pokaži da struktura prolazi
  for (const n of need) { const p = join(OUT, n.tgt); if (existsSync(p)) writeFileSync(p, setHead(readFileSync(p, 'utf8'), n.tgt, n.lang.code, { sr: n.src, [n.lang.code]: n.tgt })); }
}
console.log('\nPrevedeno: ' + made + ', preskočeno: ' + skipped + (failed ? ', GREŠKE: ' + failed : '') + (stale ? ', ponovo prevedeno zastarelih: ' + stale : ''));
if (!FAKE && made) console.log('Sledeće: npm run stamp && npm run sitemap && npm run check:assets');
process.exit(failed ? 1 : 0);
