#!/usr/bin/env node
/* Traži srpski tekst upisan direktno u kod (izvan t()/tf()/locales) — to se NE prevodi automatski.
   Heuristika: linije sa string literalom koji sadrži č ć š ž đ (komentari se preskaču).
   Pokretanje: node scripts/find-hardcoded.mjs [app.js] [--all]   (bez --all prikazuje prvih 60) */
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
/* Radi u oba rasporeda: skripta u scripts/ (pa je app.js jedan nivo iznad), ili sve u korenu repoa
   (isti princip kao u translate.mjs). */
const root = path.basename(here) === 'scripts' ? path.join(here, '..') : here;
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--')) || path.join(root, 'app.js');
let s = fs.readFileSync(file, 'utf8');
s = s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
const src = fs.readFileSync(file, 'utf8').split('\n');
const hits = [];
s.split('\n').map((l) => l.replace(/(^|\s)\/\/.*$/, '$1')).forEach((l, i) => {
  if (/(['"`])[^'"`]*[čćšžđČĆŠŽĐ][^'"`]*\1/.test(l)) hits.push(i + 1);
});
console.log(`${path.basename(file)}: ${hits.length} linija sa srpskim tekstom u stringu (deo su podaci — imena mesta, opisi paketa — a deo poruke).`);
(args.includes('--all') ? hits : hits.slice(0, 60)).forEach((n) => console.log(`${String(n).padStart(6)}: ${src[n - 1].trim().slice(0, 120)}`));
if (!args.includes('--all') && hits.length > 60) console.log(`… još ${hits.length - 60} (--all za sve)`);
