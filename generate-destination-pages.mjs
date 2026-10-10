// Generiše putovanje-<grad>.html (stranica po destinaciji) iz dest-plans.js + dest-pages.json + vodic-<grad>.html.
//   npm run pages          upiše stranice i doda link iz vodiča (idempotentno)
//   npm run pages:check    exit 1 ako neka stranica nije ažurna (za CI)
// Šta je odakle: planovi i razlozi ("Zašto grad?") iz dest-plans.js; slika, og:image i 2 pitanja iz vodiča;
// zaglavlje/podnožje iz vodic-atina.html (isti izgled i ?v= žigovi). Cene se prikazuju samo za gradove
// koji u dest-plans.js imaju `fixed` (danas samo Atina) — za ostale cena ne postoji, pa je ne izmišljamo.
// Nakon pokretanja: npm run stamp && npm run sitemap.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const root = new URL('.', import.meta.url).pathname;
const check = process.argv.includes('--check');
const SITE = 'https://sklopi.rs';
const rd = (f) => readFileSync(join(root, f), 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const win = {}; vm.runInNewContext(rd('dest-plans.js'), { window: win, console });
const DP = win.SKLOPI_DEST_PLANS;
const cfg = JSON.parse(rd('dest-pages.json'));
const cities = Object.keys(cfg).filter((k) => !k.startsWith('_') && DP.cities[k] && existsSync(join(root, `vodic-${cfg[k].slug}.html`)));

// šablon: zaglavlje (topbar) i podnožje iz vodiča za Atinu
const tpl = rd('vodic-atina.html');
const pre = tpl.slice(tpl.indexOf('<body'), tpl.indexOf('<div class="legal-wrap"'));
const post = tpl.slice(tpl.indexOf('<footer id="about">'));
const css = tpl.slice(0, tpl.indexOf('</head>')).split('\n')
  .filter((l) => /rel="(icon|shortcut icon|apple-touch-icon|stylesheet|preconnect)"|theme-color/.test(l)).join('\n');

const fits = (arr, max) => arr.find((s) => s.length <= max) || arr[arr.length - 1];
const pageOf = (c) => `putovanje-${cfg[c].slug}.html`;
const acc = (c) => DP.cities[c].acc.replace(/^tvoj[u]?\s+/, '');
const phrase = (c) => `${cfg[c].prep} ${acc(c)}`;

function guideInfo(c) {
  const g = rd(`vodic-${cfg[c].slug}.html`);
  const img = /<img class="guide-img" src="([^"]+)" alt="([^"]*)"[^>]*?width="(\d+)" height="(\d+)"/.exec(g);
  const og = /<meta property="og:image" content="([^"]+)"/.exec(g)?.[1];
  const ogw = /<meta property="og:image:width" content="(\d+)"/.exec(g)?.[1];
  const ogh = /<meta property="og:image:height" content="(\d+)"/.exec(g)?.[1];
  let faq = [];
  for (const m of g.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1]);
      const f = (j['@graph'] || [j]).find((x) => x['@type'] === 'FAQPage');
      if (f) faq = f.mainEntity.slice(0, 2).map((q) => [q.name, q.acceptedAnswer.text]);
    } catch (e) { /* preskoči */ }
  }
  return { img, og, ogw, ogh, faq };
}

function build(c) {
  const city = DP.cities[c], P = phrase(c), A = acc(c), slug = cfg[c].slug, url = `${SITE}/${pageOf(c)}`;
  const gi = guideInfo(c);
  const [first, comfort, value] = DP.arch[city.arch];
  const order = [value, first, comfort];
  const price = (p) => (city.fixed ? city.fixed[[first, comfort, value].indexOf(p)] : null);
  const title = fits([`Putovanje ${P} — let + hotel, 3 plana i cena | SKLOPI`, `Putovanje ${P} — let, hotel i 3 plana | SKLOPI`, `Putovanje ${P} | SKLOPI`], 60);
  const desc = fits([`Putovanje ${P}: tri gotova plana (Budžet, Balans, Komfor) sa letom, hotelom i aktivnostima u jednoj procenjenoj ceni. Prilagodi datume i broj putnika.`,
    `Putovanje ${P}: tri plana (Budžet, Balans, Komfor) sa letom, hotelom i aktivnostima u jednoj procenjenoj ceni.`], 160);
  const h1 = `Putovanje ${P}: let, hotel i aktivnosti u jednoj ceni`;
  const cta = `index.html?dest=${encodeURIComponent(c)}`;

  const carPlans = order.filter((p) => p.carPref && p.carPref !== 'none').map((p) => p.title);
  const faq = [];
  faq.push([`Koliko košta putovanje ${P}?`, city.fixed
    ? `U SKLOPI planeru ilustrativna procena za pun paket (let i hotel) kreće od ${price(value)} € po osobi za plan Budžet, ${price(first)} € za Balans i ${price(comfort)} € za Komfor. Stvarna cena zavisi od datuma, sezone i broja putnika, zato u planeru unesi svoje termine.`
    : `Cena zavisi od datuma, sezone i broja putnika. U SKLOPI planeru uneseš termine i dobiješ procenu ukupne cene za pun paket (let, hotel i aktivnosti), pa možeš da uporediš tri plana.`]);
  faq.push([`Koji plan za ${A} da izaberem?`, `${first.title} je najpopularniji plan: ${first.feats.map((f) => f[1].replace(/^[A-ZŠĐČĆŽ]/, (x) => x.toLowerCase())).join(', ')}. ${first.forWho}.`]);
  faq.push([`Da li mi treba auto za putovanje ${P}?`, carPlans.length
    ? `Auto je uključen samo u ${carPlans.length > 1 ? 'planove' : 'plan'} ${carPlans.join(' i ')}. Ostali planovi su bez auta.`
    : 'Nijedan od tri plana ne uključuje auto.']);
  faq.push(...gi.faq);

  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': url + '#webpage', url, name: title.replace(' | SKLOPI', ''), description: desc, inLanguage: 'sr',
      image: gi.og, isPartOf: { '@id': SITE + '/#website' }, about: { '@type': 'City', name: c, containedInPlace: { '@type': 'Country', name: city.country } } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SKLOPI', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: `Putovanje ${P}`, item: url }] },
    { '@type': 'FAQPage', '@id': url + '#faq', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ] };

  const cards = order.map((p) => {
    const pr = price(p);
    return `<div style="border:1px solid rgba(0,0,0,.1);border-radius:14px;padding:16px 18px;"><p style="margin:0 0 4px;font-size:.8rem;opacity:.7;">${esc(p.badge)}</p><h3 style="margin:0 0 6px;">${esc(p.title)}</h3>` +
      (pr ? `<p style="margin:0 0 8px;font-size:1.25rem;font-weight:700;">od ${pr} € <span style="font-size:.8rem;font-weight:400;">po osobi</span></p>` : '') +
      `<p style="margin:0 0 6px;">${esc(p.feats.map((f) => f[1]).join(' · '))}</p><p style="margin:0;font-size:.9rem;opacity:.8;">${esc(p.forWho)}.</p></div>\n`;
  }).join('');
  const priceNote = city.fixed
    ? 'Cene su ilustrativne procene po osobi za pun paket (let i hotel). SKLOPI je prototip, pa one ne dolaze uživo od partnera i ne predstavljaju stvarnu ponudu.'
    : 'Tačnu procenu za svoje datume i broj putnika dobijaš u planeru. SKLOPI je prototip, pa prikazane cene nisu stvarna ponuda partnera.';
  const others = cities.filter((x) => x !== c).map((x) => `<li><a href="${pageOf(x)}">Putovanje ${esc(phrase(x))}</a></li>`).join('\n');
  const faqHtml = faq.map(([q, a]) => `<p><strong>${esc(q)}</strong><br>${esc(a)}</p>`).join('\n');
  const reasons = (city.reasons || []).map((r) => `<li>${esc(r)}</li>`).join('\n');

  const head = `<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="SKLOPI">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(gi.og)}">
${gi.ogw ? `<meta property="og:image:width" content="${gi.ogw}">\n<meta property="og:image:height" content="${gi.ogh}">\n` : ''}<meta property="og:image:alt" content="${esc(`Putovanje ${P}`)}">
<meta property="og:locale" content="sr_RS">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(gi.og)}">
<script type="application/ld+json">
${JSON.stringify(ld, null, 1)}
</script>
${css}
</head>

`;
  const body = `<div class="legal-wrap" id="main" role="main" tabindex="-1">
<p class="legal-updated"><a href="index.html">SKLOPI</a> / Putovanje ${esc(P)}</p>
<h1>${esc(h1)}</h1>
<p>SKLOPI za ${esc(A)} sastavlja tri gotova plana putovanja. Svaki sabira let, smeštaj i aktivnosti u jednu procenjenu cenu, pa ne moraš sam da upoređuješ desetine ponuda. Izabereš plan, uneseš datume i broj putnika, a ostalo možeš da prilagodiš.</p>
${gi.img ? `<img class="guide-img" src="${gi.img[1]}" alt="${gi.img[2]}" width="${gi.img[3]}" height="${gi.img[4]}" fetchpriority="high">\n` : ''}
<h2>Tri plana ${cfg[c].prep === 'na' ? 'za' : 'za'} ${esc(A)}: Budžet, Balans i Komfor</h2>
<div style="display:grid;gap:12px;margin:14px 0;">
${cards}</div>
<p style="font-size:.85rem;opacity:.8;">${priceNote}</p>
<p style="margin:18px 0;"><a href="${cta}" class="btn-primary" style="display:inline-block;text-decoration:none;">Isplaniraj put ${esc(P)} na SKLOPI →</a></p>

${reasons ? `<h2>Zašto baš ${esc(c)}</h2>\n<ul>\n${reasons}\n</ul>\n\n` : ''}<h2>Šta ulazi u cenu putovanja</h2>
<ul>
<li><strong>Let</strong> — povratna karta. Plan Budžet traži najjeftiniju kombinaciju, Balans direktan let, a Komfor fleksibilan termin.</li>
<li><strong>Smeštaj</strong> — hotel od 3★ do 4★, ${first.hotelS && /plaž/.test(first.hotelS) ? 'u Balansu blizu plaže' : 'u Budžetu i Balansu blizu centra'}, a u Komforu u mirnijem delu.</li>
<li><strong>Aktivnosti</strong> — dve do tri odabrane ture.</li>
<li><strong>Auto</strong> — ${carPlans.length ? `samo u ${carPlans.length > 1 ? 'planovima' : 'planu'} ${esc(carPlans.join(' i '))}.` : 'nije uključen ni u jedan plan.'}</li>
</ul>

${cfg[c].season ? `<h2>Kad ići i šta utiče na cenu</h2>\n<p>${esc(cfg[c].season)}</p>\n\n` : ''}<h2>Pre puta: vodič ${esc(cfg[c].prep === 'na' ? 'za' : 'za')} ${esc(A)}</h2>
<p>Put od aerodroma do centra, kuda ići i na šta paziti pre rezervacije opisali smo u <a href="vodic-${slug}.html">vodiču ${esc(P.replace(/^(u|na) /, 'za '))}</a>.</p>

<h2>Najčešća pitanja o putovanju ${esc(P)}</h2>
${faqHtml}
<p style="margin:24px 0;"><a href="${cta}" class="btn-primary" style="display:inline-block;text-decoration:none;">Izračunaj cenu puta ${esc(P)} →</a></p>

<div class="related-guides" style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(0,0,0,.08);">
<h2 style="font-size:1.05rem;">Druge destinacije</h2>
<ul style="list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:10px 18px;margin:12px 0 0;">
${others}
</ul>
</div>
</div>
`;
  return head + pre + body + post;
}

// link iz vodiča (posle glavnog dugmeta), idempotentno
function guideLink(c) {
  const f = `vodic-${cfg[c].slug}.html`, g = rd(f);
  if (g.includes(pageOf(c))) return null;
  const re = /(<p[^>]*>\s*<a href="index\.html\?dest=[^"]*"[^>]*class="btn-primary"[\s\S]*?<\/a><\/p>)/;
  if (!re.test(g)) { console.warn(`⚠ ${f}: nema CTA paragrafa, link nije dodat`); return null; }
  return [f, g.replace(re, `$1\n<p>Pogledaj i <a href="${pageOf(c)}">tri plana za putovanje ${phrase(c)}</a> sa letom, hotelom i aktivnostima u jednoj ceni.</p>`)];
}

let stale = 0;
for (const c of cities) {
  const out = [[pageOf(c), build(c)], guideLink(c)].filter(Boolean);
  for (const [f, html] of out) {
    const same = existsSync(join(root, f)) && rd(f) === html;
    if (same) continue;
    stale++;
    if (!check) writeFileSync(join(root, f), html);
    console.log(`${check ? '✗ nije ažurno' : '✓ upisano'}: ${f}`);
  }
}
const skipped = Object.keys(cfg).filter((k) => !k.startsWith('_') && !cities.includes(k));
if (skipped.length) console.log('preskočeno (nema grada u dest-plans.js ili vodiča): ' + skipped.join(', '));
if (check && stale) { console.error('Pokreni: npm run pages'); process.exit(1); }
console.log(stale ? '' : '= sve stranice ažurne');
