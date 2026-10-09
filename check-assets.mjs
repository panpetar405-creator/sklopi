// Proverava da nijedan server/dev fajl ne bi završio u assets deploy-u.
// Pokretanje: npm run check:assets   (ili: node check-assets.mjs)
// Izlaz != 0 ako nešto što ne sme biti javno nije pokriveno .assetsignore-om,
// ili ako je neki fajl koji pregledač treba greškom ignorisan.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const lines = readFileSync(join(root, '.assetsignore'), 'utf8').split(/\r?\n/)
  .map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

// Minimalan gitignore matcher: dovoljan za obrasce koje koristimo
// (ime, *.ext, dir/, ime.*, bez negacija).
function toRegex(p) {
  const dirOnly = p.endsWith('/');
  if (dirOnly) p = p.slice(0, -1);
  const anchored = p.startsWith('/');
  if (anchored) p = p.slice(1);
  const hasSlash = p.includes('/');
  const body = p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
  const prefix = anchored || hasSlash ? '^' : '(^|/)';
  return new RegExp(prefix + body + (dirOnly ? '/' : '(/|$)'));
}
const rules = lines.map(toRegex);
const ignored = (rel) => rules.some((r) => r.test(rel));

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (n === '.git' || n === 'node_modules') continue;
    const p = join(dir, n);
    statSync(p).isDirectory() ? walk(p, out) : out.push(relative(root, p).split(sep).join('/'));
  }
  return out;
}
const files = walk(root);

// 1) Ovo NE sme biti javno (ako postoji u repou).
const mustHide = [
  'worker.js', 'worker-dest-info.js', 'price-alert-worker.js', 'viator-activities.js',
  'destination-images.js', 'pricing-core.js', 'rate-limit.js', 'city-image.js', 'wrangler.toml', 'package.json',
  '.assetsignore', 'assetsignore.txt', 'README.txt', 'translate.yml', 'translate.mjs',
  'sr.json', 'en.json', 'de.json', 'ru.json', 'languages.json', '_glossary.json', '_notes.json',
  'transport-sr-keys.json', 'check-assets.mjs',
];
// 1b) po tipu: SQL, markdown, mjs, kao i .env/.dev.vars
const mustHideRe = [/\.sql$/, /\.md$/, /\.mjs$/, /(^|\/)\.env(\..*)?$/, /(^|\/)\.dev\.vars$/];

// 2) Ovo MORA biti javno (pregledač ga učitava).
// app.js je razbijen na app-01-…app-11-*.js (redosled učitavanja je u index.html).
const APP_PARTS = files.filter((f) => /^app-\d+-.+\.js$/.test(f));
if (APP_PARTS.length === 0) { console.error('✗ nema app-*.js fajlova'); process.exit(1); }
const mustServe = [
  'index.html', ...APP_PARTS, 'styles.css', 'i18n-data.js', 'i18n-extra.js', 'config.js', 'contact.js',
  'cookies.js', 'affiliate.js', 'price-mix.js', 'transport.js', 'transport-i18n.js', 'dest-info.js',
  'dest-info.css', 'dest-plans.js', 'guide-lang.js', 'fonts.css', 'sw.js', 'manifest.json', 'robots.txt', 'sitemap.xml', '_headers',
];

// jezički fajlovi (i18n-en.js, i18n-ru.js...) učitavaju se dinamički, ali MORAJU biti javni
const LANG_FILES = files.filter((f) => /^i18n-[a-z]{2,3}\.js$/.test(f));
let bad = 0;
for (const f of files) {
  const shouldHide = mustHide.includes(f) || mustHideRe.some((r) => r.test(f));
  if (shouldHide && !ignored(f)) { console.error('✗ JAVNO a ne sme: ' + f); bad++; }
}
for (const f of [...mustServe, ...LANG_FILES]) {
  if (files.includes(f) && ignored(f)) { console.error('✗ IGNORISANO a pregledač ga treba: ' + f); bad++; }
}

// 3) Svaka lokalna slika na koju HTML/JS/CSS upućuje mora da postoji.
import { existsSync } from 'node:fs';
const refRe = /(?:^|["'(=\s])((?:\.\/)?img\/[A-Za-z0-9_.-]+\.(?:webp|jpe?g|png|svg))/g;
const missingImgs = new Map();
for (const f of files.filter((x) => /\.(html|js|css)$/.test(x) && !ignored(x))) {
  const txt = readFileSync(join(root, f), 'utf8');
  for (const m of txt.matchAll(refRe)) {
    const ref = m[1].replace(/^\.\//, '');
    if (!existsSync(join(root, ref))) { if (!missingImgs.has(ref)) missingImgs.set(ref, new Set()); missingImgs.get(ref).add(f); }
  }
}
for (const [ref, from] of missingImgs) { console.error('✗ SLIKA FALI: ' + ref + '  (u: ' + [...from].join(', ') + ')'); bad++; }

// 3b) Svaki woff2 iz fonts.css mora da postoji (npm run fetch:fonts ih preuzima).
if (existsSync(join(root, 'fonts.css'))) {
  const fcss = readFileSync(join(root, 'fonts.css'), 'utf8');
  for (const m of fcss.matchAll(/url\(([^)]+\.woff2)\)/g)) {
    if (!existsSync(join(root, m[1]))) { console.error('✗ FONT FALI: ' + m[1] + '  (pokreni: npm run fetch:fonts)'); bad++; }
  }
}
// 3c) Nijedna stranica ne sme da vuče Google Fonts (self-host).
for (const f of files.filter((x) => /\.html$/.test(x) && !ignored(x))) {
  if (/fonts\.(googleapis|gstatic)\.com/.test(readFileSync(join(root, f), 'utf8'))) { console.error('✗ Google Fonts u: ' + f); bad++; }
}

// 3d) Svaki lokalni <script src> / <link href> iz HTML-a mora da postoji na disku
//     (hvata npr. skriptu koja je nekad bila u repou pa je obrisana, a tag ostao).
const tagRe = /<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+)"/g;
for (const f of files.filter((x) => /\.html$/.test(x) && !ignored(x))) {
  const txt = readFileSync(join(root, f), 'utf8');
  for (const m of txt.matchAll(tagRe)) {
    const u = m[1].split(/[?#]/)[0];
    if (!u || /['+]/.test(u) || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\{|\$)/i.test(u)) continue;   // ' i + = putanja sklapana u JS-u (npr. i18n-'+l+'.js)     // http:, data:, mailto:, //cdn...
    if (!/\.(?:js|css|json|webmanifest|ico|png|svg|webp|jpe?g|woff2?)$/i.test(u)) continue;   // stranice (.html) i rute preskačemo
    const rel = u.replace(/^\.?\//, '');
    if (!existsSync(join(root, rel))) { console.error('✗ FAJL FALI: ' + rel + '  (u: ' + f + ')'); bad++; }
  }
}

// 3e) Mapa jezičkih fajlova u index.html (window.I18N_V) mora da se poklapa sa fajlovima na disku.
{
  const idx = existsSync(join(root, 'index.html')) ? readFileSync(join(root, 'index.html'), 'utf8') : '';
  const mm = /\/\*I18N_V\*\/([\s\S]*?)\/\*\/I18N_V\*\//.exec(idx);
  if (mm) {
    const { createHash } = await import('node:crypto');
    let map = {};
    try { map = JSON.parse(mm[1]); } catch (e) { console.error('✗ I18N_V u index.html nije ispravan JSON'); bad++; }
    for (const code of Object.keys(map)) {
      const fp = join(root, 'i18n-' + code + '.js');
      if (!existsSync(fp)) { console.error('✗ FAJL FALI: i18n-' + code + '.js (a u I18N_V je)'); bad++; continue; }
      const v = createHash('sha1').update(readFileSync(fp)).digest('hex').slice(0, 8);
      if (v !== map[code]) { console.error('✗ I18N_V[' + code + '] je zastareo (' + map[code] + ' ≠ ' + v + ') — pokreni: npm run i18n:build'); bad++; }
    }
    for (const f of LANG_FILES) { const code = f.slice(5, -3); if (!(code in map)) { console.error('✗ ' + f + ' postoji, a nije u I18N_V — pokreni: npm run i18n:build'); bad++; } }
  }
}

const pub = files.filter((f) => !ignored(f));
console.log('Javno: ' + pub.length + ' fajlova, ignorisano: ' + (files.length - pub.length));
const rest = pub.filter((f) => !/\.(html|png|webp|jpe?g|svg|ico)$/i.test(f)).sort();
console.log('Javni ne-medijski fajlovi:\n  ' + rest.join('\n  '));
if (bad) { console.error('\nGreške: ' + bad); process.exit(1); }
console.log('\nOK');
