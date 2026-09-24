#!/usr/bin/env node
/* Samotest skripte za prevod — koristi lažni prevod (--mock), ne zove API i ne dira tvoje fajlove
   (radi u privremenom folderu). Pokretanje: node scripts/selftest.mjs */
import fs from 'fs'; import os from 'os'; import path from 'path'; import assert from 'assert';
import { spawnSync } from 'child_process'; import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
/* Radi u oba rasporeda: skripta u scripts/ + locales/ (kao u PREVODI.md), ili sve u korenu repoa
   (isti princip kao u translate.mjs). */
const root = path.basename(here) === 'scripts' ? path.join(here, '..') : here;
const realLoc = fs.existsSync(path.join(root, 'locales')) ? path.join(root, 'locales') : root;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sklopi-i18n-'));
fs.mkdirSync(path.join(tmp, 'locales'));
for (const f of fs.readdirSync(realLoc)) if (f.endsWith('.json') && f !== '_state.json') fs.copyFileSync(path.join(realLoc, f), path.join(tmp, 'locales', f));

const J = (f) => JSON.parse(fs.readFileSync(path.join(tmp, 'locales', f), 'utf8'));
const W = (f, o) => fs.writeFileSync(path.join(tmp, 'locales', f), JSON.stringify(o, null, 2) + '\n');
const run = (...a) => spawnSync('node', [path.join(here, 'translate.mjs'), '--root', tmp, ...a], { encoding: 'utf8' });
let n = 0; const ok = (cond, msg) => { assert(cond, msg); n++; console.log('  ✓ ' + msg); };

// 1) novi jezici: nl (2 oblika množine), pl (4), ja (1)
const cfg = J('languages.json');
cfg.languages.push({ code: 'nl', short: 'NL', name: 'Nederlands', locale: 'nl-NL' },
                   { code: 'pl', short: 'PL', name: 'Polski', locale: 'pl-PL' },
                   { code: 'ja', short: 'JA', name: '日本語', locale: 'ja-JP' });
W('languages.json', cfg);
let r = run('--mock');
ok(r.status === 0, 'prevod novih jezika (mock) prolazi: ' + (r.stderr || '').slice(0, 100));
const sr = J('sr.json'), de = J('nl.json');
ok(Object.keys(de).length === Object.keys(sr).length, 'nl.json ima sve ključeve iz sr.json');
ok(de['plural.night'].split('|').length === 2 && J('pl.json')['plural.night'].split('|').length === 4 && J('ja.json')['plural.night'].split('|').length === 1,
   'broj oblika množine prati jezik (nl 2, pl 4, ja 1)');
ok(run('--check').status === 0, '--check prolazi');
ok(/\bconst I18N\b/.test(fs.readFileSync(path.join(tmp, 'i18n-data.js'), 'utf8')) && fs.readFileSync(path.join(tmp, 'i18n-data.js'), 'utf8').includes('"nl"'), 'i18n-data.js sadrži nove jezike');

// 2) promena srpskog teksta
sr.hero_lede = sr.hero_lede + ' (izmena)';
W('sr.json', sr);
const deEdit = J('nl.json'); deEdit.nav_how = 'RUČNO POPRAVLJEN'; W('nl.json', deEdit);
sr.nav_how = sr.nav_how + ' (izmena)'; W('sr.json', sr);
r = run('--mock');
ok(J('nl.json').hero_lede.includes('(izmena)'), 'automatski prevod se osvežava kad se srpski promeni');
ok(J('nl.json').nav_how === 'RUČNO POPRAVLJEN', 'ručno ispravljen prevod se NE prepisuje');
ok(J('en.json').hero_lede === (JSON.parse(fs.readFileSync(path.join(realLoc, 'en.json'), 'utf8')).hero_lede), 'postojeći ručni en prevod ostaje, prijavljen kao "proveri ručno"');
ok(/proveri ručno/.test(r.stdout), 'izveštaj navodi ključeve za ručnu proveru');
r = run('--mock', '--retranslate-changed');
ok(J('nl.json').nav_how.includes('(izmena)'), '--retranslate-changed prepisuje i ručni prevod');

// 3) obrisan ključ
delete sr.hero_lede; W('sr.json', sr);
ok(/kojih nema/.test(run('--check').stdout), 'ključ kojeg više nema u sr.json se prijavljuje');
run('--mock', '--prune');
ok(!('hero_lede' in J('nl.json')), '--prune briše višak');

// 4) nedostajući ključ se ponovo dopunjuje
const de2 = J('nl.json'); delete de2.nav_dest; W('nl.json', de2);
ok(run('--check').status === 1, '--check javlja grešku kad prevod fali');
run('--mock');
ok(!!J('nl.json').nav_dest, 'ključ koji fali se dopunjuje');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nSve provere prošle (${n}).`);
