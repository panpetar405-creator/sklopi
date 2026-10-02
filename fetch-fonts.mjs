// Preuzima Sora + Inter (varijabilni woff2) sa Google Fonts u ./fonts/ — JEDNOM, pa se commit-uju.
// Pokretanje: npm run fetch:fonts   (treba internet; Node >= 18)
// Posle toga sajt NE zove fonts.googleapis.com / fonts.gstatic.com.
// Fontovi su pod SIL Open Font License (slobodno za self-host i komercijalnu upotrebu).
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const out = join(root, 'fonts');
mkdirSync(out, { recursive: true });

// Moderan UA -> Google vraća woff2 (i varijabilne fajlove za opsege težina).
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const WANT = { Sora: ['latin', 'latin-ext'], Inter: ['latin', 'latin-ext', 'cyrillic'] };
const cssUrl = 'https://fonts.googleapis.com/css2?family=Sora:wght@400..800&family=Inter:wght@400..800&display=swap';

const css = await (await fetch(cssUrl, { headers: { 'User-Agent': UA } })).text();
// Blokovi: /* subset */ @font-face { font-family: 'X'; ... src: url(...) ... }
const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)];
let bad = 0, n = 0;
for (const [, subset, body] of blocks) {
  const fam = /font-family:\s*'([^']+)'/.exec(body)?.[1];
  const url = /url\(([^)]+)\)/.exec(body)?.[1];
  if (!fam || !url || !(WANT[fam] || []).includes(subset)) continue;
  const file = join(out, `${fam.toLowerCase()}-${subset}.woff2`);
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  if (buf.subarray(0, 4).toString() !== 'wOF2') { console.error('✗ nije woff2: ' + file); bad++; continue; }
  writeFileSync(file, buf);
  console.log(`✓ ${fam.toLowerCase()}-${subset}.woff2  ${(buf.length / 1024).toFixed(1)} KB`);
  n++;
}
const expected = Object.values(WANT).flat().length;
if (n !== expected || bad) { console.error(`✗ preuzeto ${n}/${expected} fajlova — proveri izlaz iznad`); process.exit(1); }
console.log('Gotovo. Sad: npm run check:assets, pa commit fonts/.');
