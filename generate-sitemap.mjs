// Generiše sitemap.xml iz *.html fajlova — više se ne piše ručno.
//   npm run sitemap          upiše sitemap.xml (+ sitemap-lastmod.json)
//   npm run sitemap:check    exit 1 ako sitemap.xml nije ažuran (za CI / pre commit-a)
//
// Šta ulazi: svaki *.html u korenu KOJI NEMA <meta name="robots" content="...noindex...">.
// URL = <link rel="canonical"> stranice (ili https://sklopi.rs/<fajl>; index.html → /).
// Jezičke verzije = <link rel="alternate" hreflang> koje stranica SAMA već navodi
//   (jedan izvor istine; generator ih samo prepiše i prijavi ako nisu uzajamne).
// lastmod: dan kad se SADRŽAJ stranice poslednji put promenio. Čuva se u sitemap-lastmod.json
//   (hash sadržaja bez ?v=… žigova → promena styles.css ne "osvežava" sve stranice).
//   Ne zavisi od git istorije ni od vremena fajla (u CI-ju su oba nepouzdana).
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const SITE = 'https://sklopi.rs';
const root = new URL('.', import.meta.url).pathname;
const check = process.argv.includes('--check');
const today = new Date().toISOString().slice(0, 10);

// Prioritet / učestalost po obrascu imena (prvi pogodak pobeđuje).
const RULES = [
  { re: /^index\.html$/,            priority: '1.0', changefreq: 'weekly' },
  { re: /^destinacija\.html$/,      priority: '0.8', changefreq: 'weekly' },
  { re: /^vodici\.html$/,           priority: '0.6', changefreq: 'weekly' },
  { re: /^putovanje-.+\.html$/,    priority: '0.7', changefreq: 'weekly' },
  { re: /^vodic-.+-(en|ru|de)\.html$/, priority: '0.4', changefreq: 'monthly' },
  { re: /^vodic-.+\.html$/,         priority: '0.5', changefreq: 'monthly' },
];
const DEFAULT = { priority: '0.3', changefreq: 'monthly' };

const attr = (tag, name) => new RegExp('\\b' + name + '\\s*=\\s*"([^"]*)"', 'i').exec(tag)?.[1];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const sha = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10);

// Staro stanje: manifest, a ako ga nema, lastmod iz postojećeg sitemap.xml (da prvi run ne promeni sve datume).
const mfPath = join(root, 'sitemap-lastmod.json');
const manifest = existsSync(mfPath) ? JSON.parse(readFileSync(mfPath, 'utf8')) : {};
const oldLastmod = new Map();
if (existsSync(join(root, 'sitemap.xml'))) {
  for (const m of readFileSync(join(root, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) oldLastmod.set(m[1], m[2]);
}

const pages = [];
const skipped = [];
for (const file of readdirSync(root).filter((f) => f.endsWith('.html')).sort()) {
  const html = readFileSync(join(root, file), 'utf8');
  const head = html.slice(0, html.indexOf('</head>') > 0 ? html.indexOf('</head>') : 8000);
  const robots = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]).find((t) => /name\s*=\s*"robots"/i.test(t));
  if (robots && /noindex/i.test(attr(robots, 'content') || '')) { skipped.push(file + ' (noindex)'); continue; }

  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const canon = links.find((t) => /rel\s*=\s*"canonical"/i.test(t));
  const loc = canon ? attr(canon, 'href') : SITE + (file === 'index.html' ? '/' : '/' + file);
  const alts = links.filter((t) => /rel\s*=\s*"alternate"/i.test(t) && attr(t, 'hreflang'))
    .map((t) => ({ lang: attr(t, 'hreflang'), href: attr(t, 'href') }));

  const stable = html.replace(/\?v=[0-9a-f]{6,10}/g, '');          // bez žigova iz stamp-assets.mjs
  const hash = sha(stable);
  const prev = manifest[file];
  const lastmod = prev && prev.hash === hash ? prev.lastmod : (prev ? today : (oldLastmod.get(loc) || today));
  manifest[file] = { hash, lastmod };
  pages.push({ file, loc, alts, lastmod, ...(RULES.find((r) => r.re.test(file)) || DEFAULT) });
}
pages.sort((a, b) => b.priority.localeCompare(a.priority) || a.file.localeCompare(b.file));   // glavna stranica prva
// Obriši iz manifesta fajlove kojih više nema.
for (const k of Object.keys(manifest)) if (!existsSync(join(root, k))) delete manifest[k];

// Provere: alternate treba da pokazuje na stranicu koja je i sama u sitemap-u (query ?lang= se ignoriše za index).
const locs = new Set(pages.map((p) => p.loc));
const warn = [];
for (const p of pages) for (const a of p.alts) {
  if (!a.href.startsWith(SITE)) warn.push(`${p.file}: hreflang ${a.lang} ne pokazuje na ${SITE}`);
  else if (!locs.has(a.href) && !a.href.includes('?')) warn.push(`${p.file}: hreflang ${a.lang} → ${a.href} nije u sitemap-u (noindex ili ne postoji?)`);
}

const urls = pages.map((p) => {
  const xl = p.alts.map((a) => `    <xhtml:link rel="alternate" hreflang="${esc(a.lang)}" href="${esc(a.href)}"/>`).join('\n');
  return `  <url>\n    <loc>${esc(p.loc)}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>${xl ? '\n' + xl : ''}\n  </url>`;
}).join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- AUTOMATSKI GENERISANO (generate-sitemap.mjs) — ne menjaj ručno. Pokretanje: npm run sitemap -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
const mf = JSON.stringify(manifest, null, 2) + '\n';

const xmlPath = join(root, 'sitemap.xml');
const xmlChanged = !existsSync(xmlPath) || readFileSync(xmlPath, 'utf8') !== xml;
const mfChanged = !existsSync(mfPath) || readFileSync(mfPath, 'utf8') !== mf;

warn.forEach((w) => console.warn('⚠ ' + w));
if (check) {
  if (xmlChanged || mfChanged) { console.error('✗ sitemap.xml nije ažuran — pokreni: npm run sitemap'); process.exit(1); }
  console.log(`= sitemap.xml ažuran (${pages.length} stranica)`); process.exit(0);
}
if (xmlChanged) writeFileSync(xmlPath, xml);
if (mfChanged) writeFileSync(mfPath, mf);
console.log(`${xmlChanged ? '✓ sitemap.xml upisan' : '= sitemap.xml nepromenjen'}: ${pages.length} stranica` +
  (skipped.length ? `, preskočeno: ${skipped.join(', ')}` : ''));
