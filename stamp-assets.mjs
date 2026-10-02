// Automatski "keš-bust" — više NEMA ručnog menjanja ?v=52 i CACHE_VERSION.
//   npm run stamp         upiše ?v=<hash sadržaja> u SVE *.html za lokalne .css/.js
//                         i upiše PRECACHE + BUILD u sw.js
//   npm run stamp:check   samo proveri (exit 1 ako treba stamp) — za CI / pre commit-a
// Hash = prvih 8 hex sha1 sadržaja fajla (isto kao translate.mjs za i18n-data.js),
// pa menja se samo kad se fajl stvarno promeni.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const root = new URL('.', import.meta.url).pathname;
const check = process.argv.includes('--check');
const sha = (buf) => createHash('sha1').update(buf).digest('hex').slice(0, 8);
const hashOf = new Map();
function fileHash(rel) {
  if (!hashOf.has(rel)) hashOf.set(rel, existsSync(join(root, rel)) ? sha(readFileSync(join(root, rel))) : null);
  return hashOf.get(rel);
}

// <link ... href="x.css?v=1"> / <script ... src="x.js?v=1"> — samo lokalni, relativni ili /apsolutni putevi.
const REF = /(<(?:link|script)\b[^>]*?\b(?:href|src)=")(\/?[A-Za-z0-9_./-]+\.(?:css|js))(?:\?v=[^"]*)?(")/g;
const SKIP = new Set(['sw.js']);

let stale = 0;
const htmlFiles = readdirSync(root).filter((f) => f.endsWith('.html'));
const precache = new Set(['/', '/index.html', '/manifest.json']);

for (const f of htmlFiles) {
  const src = readFileSync(join(root, f), 'utf8');
  const next = src.replace(REF, (m, pre, path, post) => {
    const rel = path.replace(/^\//, '');
    if (SKIP.has(rel)) return m;
    const h = fileHash(rel);
    if (!h) return m;                       // fajl ne postoji — ne diramo
    if (f === 'index.html') precache.add('/' + rel + '?v=' + h);
    return pre + path + '?v=' + h + post;
  });
  if (f === 'index.html') {                 // fontovi koji se preload-uju = deo shell-a
    for (const m of src.matchAll(/rel="preload"[^>]*href="\/?(fonts\/[A-Za-z0-9_.-]+\.woff2)"/g)) precache.add('/' + m[1]);
  }
  if (next !== src) {
    stale++;
    if (!check) writeFileSync(join(root, f), next);
    console.log((check ? '✗ treba stamp: ' : '✓ ') + f);
  }
}

// ---- sw.js ----
const list = [...precache].sort();
const build = sha(list.join('\n') + list.filter((p) => p.includes('?v=')).length);
const swPath = join(root, 'sw.js');
const sw = readFileSync(swPath, 'utf8');
const block = `/* STAMP:BEGIN (generiše stamp-assets.mjs — ne menjaj ručno) */\nconst BUILD = '${build}';\nconst PRECACHE = ${JSON.stringify(list, null, 2)};\n/* STAMP:END */`;
const nextSw = sw.replace(/\/\* STAMP:BEGIN[\s\S]*?STAMP:END \*\//, block);
if (!/STAMP:BEGIN/.test(sw)) { console.error('✗ sw.js nema STAMP:BEGIN/END blok'); process.exit(1); }
if (nextSw !== sw) {
  stale++;
  if (!check) writeFileSync(swPath, nextSw);
  console.log((check ? '✗ treba stamp: ' : '✓ ') + 'sw.js (BUILD ' + build + ', ' + list.length + ' fajlova u shell-u)');
}

if (check && stale) { console.error('\nPokreni: npm run stamp'); process.exit(1); }
console.log(stale ? '\nGotovo.' : '= sve već ažurno');
