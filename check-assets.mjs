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
  'destination-images.js', 'pricing-core.js', 'rate-limit.js', 'wrangler.toml', 'package.json',
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
  'dest-info.css', 'dest-plans.js', 'sw.js', 'manifest.json', 'robots.txt', 'sitemap.xml', '_headers',
];

let bad = 0;
for (const f of files) {
  const shouldHide = mustHide.includes(f) || mustHideRe.some((r) => r.test(f));
  if (shouldHide && !ignored(f)) { console.error('✗ JAVNO a ne sme: ' + f); bad++; }
}
for (const f of mustServe) {
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

const pub = files.filter((f) => !ignored(f));
console.log('Javno: ' + pub.length + ' fajlova, ignorisano: ' + (files.length - pub.length));
const rest = pub.filter((f) => !/\.(html|png|webp|jpe?g|svg|ico)$/i.test(f)).sort();
console.log('Javni ne-medijski fajlovi:\n  ' + rest.join('\n  '));
if (bad) { console.error('\nGreške: ' + bad); process.exit(1); }
console.log('\nOK');
