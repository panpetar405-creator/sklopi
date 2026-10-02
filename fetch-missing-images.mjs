// Preuzima slike koje vodiči traže a nema ih u img/ (Node >= 18, bez zavisnosti).
// Pokretanje:  node fetch-missing-images.mjs        (ili: npm run fetch:images)
//
// Unsplash vraća WebP direktno (fm=webp), 1400×933 — isti format kao ostale slike u img/.
// Fajl koji već postoji se NE prepisuje. Za stavke bez 'photo' ID-a (null) skripta samo
// ispiše šta fali: nađi fotku na Unsplash-u (link ispod), iz njenog URL-a uzmi ID
// (deo posle "photo-", npr. 1741354125422-bdcdd4bb7070) i upiši ga ovde.
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;
const IMG_DIR = join(ROOT, 'img');

const MISSING = [
  // ID-jevi su iz starih img/vodic-*.html kopija (te slike su ranije bile hotlink sa Unsplash-a).
  { file: 'barselona-sagrada-1400.webp',      photo: '1741354125422-bdcdd4bb7070', alt: 'Sagrada Familija na zalasku sunca' },
  { file: 'budimpesta-parlament-1400.webp',   photo: '1725004240581-d4d6e08da60a', alt: 'Parlament na Dunavu' },
  { file: 'budimpesta-bastion-1400.webp',     photo: '1661247374773-29f7e75d2b35', alt: 'Ribarski bastion' },
  { file: 'rim-koloseum-1400.webp',           photo: '1514896856000-91cb6de818e0', alt: 'Koloseum, kasno popodnevno svetlo' },
  { file: 'rim-forum-1400.webp',              photo: '1725114217244-d08d44e9ca1e', alt: 'Rimski forum, hramovi i kolone' },
  // Za ove NEMAŠ izvor — izaberi fotku i upiši ID:
  { file: 'barselona-park-guell-1400.webp',   photo: null, alt: 'Mozaici i terasa u Park Güellu',          search: 'https://unsplash.com/s/photos/park-guell' },
  { file: 'herceg-novi-stari-grad-1400.webp', photo: null, alt: 'Stari grad Herceg Novog sa tvrđavom',     search: 'https://unsplash.com/s/photos/herceg-novi' },
  { file: 'herceg-novi-zaliv-1400.webp',      photo: null, alt: 'Pogled na Bokokotorski zaliv iz Herceg Novog', search: 'https://unsplash.com/s/photos/bay-of-kotor' },
];

const url = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&h=933&q=80&fm=webp`;
const isWebp = (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';

mkdirSync(IMG_DIR, { recursive: true });
let ok = 0, skipped = 0, todo = 0, failed = 0;
for (const m of MISSING) {
  const dest = join(IMG_DIR, m.file);
  if (existsSync(dest)) { console.log('= već postoji   ' + m.file); skipped++; continue; }
  if (!m.photo) { console.log('? treba ID      ' + m.file + '  (' + m.alt + ')\n                 traži: ' + m.search); todo++; continue; }
  try {
    const r = await fetch(url(m.photo), { redirect: 'follow' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    if (!isWebp(buf)) throw new Error('odgovor nije WebP (' + (r.headers.get('content-type') || '?') + ')');
    if (buf.length < 20000) throw new Error('sumnjivo mala slika (' + buf.length + ' B)');
    writeFileSync(dest, buf);
    console.log('✓ preuzeto      ' + m.file + '  ' + Math.round(buf.length / 1024) + ' KB');
    ok++;
  } catch (e) {
    console.error('✗ greška        ' + m.file + ' — ' + e.message);
    failed++;
  }
}
console.log(`\nPreuzeto: ${ok}, već postojalo: ${skipped}, čeka ID: ${todo}, greške: ${failed}`);
process.exit(failed ? 1 : 0);
