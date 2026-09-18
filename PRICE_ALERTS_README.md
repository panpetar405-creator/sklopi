# "Javi mi kad padne cena" — šta je urađeno i kako da pustiš u pogon

## Izmenjeni/novi fajlovi

**Frontend (izmenjeno):**
- `index.html` — dugme "Javi mi kad padne cena" u builderu + modal za email/prag
- `app.js` — dugme na svakoj od 3 gotove ponude (Budget/Best/Comfort) + JS logika modala (`openAlertModal`, upis u `price_alerts`)
- `styles.css` — stilovi za modal i nova dugmad, u istom vizuelnom jeziku kao ostatak sajta

**Backend (novo):**
- `price_alerts.sql` — SQL migracija (tabela + RLS) — jedina važeća šema za `price_alerts`
- `pricing-core.js` — čista (bez DOM-a) kopija formula za cenu, za ponovni izračun na serveru
- `price-alert-worker.js` — Cloudflare Worker: cron provera + slanje mejla + `/unsubscribe`
- `wrangler` — konfiguracija Worker-a (wrangler.toml)

**Napomena:** `price_alerts-2.sql` i `check-price-alerts.ts` (Supabase Edge Function) su bili napušteni pokušaji iste funkcije, sa drugačijom šemom (`kind`/`tier`/`params`/`current_total`/`active`) koja se kosi sa šemom gore i sa onim što `app.js` sada upisuje. Uklonjeni su iz repoa — ne koristi ih. Ako ipak želiš Edge Function umesto Cloudflare Worker-a, treba ga prepisati protiv `price_alerts.sql` šeme.

## Koraci za puštanje u rad

1. **Supabase** — u SQL Editor-u pokreni, tim redosledom:
   1. `trips.sql` (tabela sačuvanih izleta — preduslov za `share_trip.sql`)
   2. `price_alerts.sql`
   3. `share_trip.sql` (deljenje sačuvanog izleta sa prijateljima; zavisi od `trips.sql`)
   4. `supabase_site_stats.sql`
2. **Resend (ili sličan servis)** — napravi nalog, verifikuj domen sa kog šalješ mejlove (`alerti@sklopi.rs` ili slično), uzmi API ključ. Supabase Auth NE može ovo da radi — to je samo za auth mejlove.
3. **Cloudflare Worker:**
   ```
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # iz Supabase → Project Settings → API (NE anon key!)
   wrangler secret put RESEND_API_KEY
   wrangler deploy
   ```
4. Proveri da `SITE_URL` i `SUPABASE_URL` u `wrangler` (wrangler.toml) odgovaraju pravim vrednostima kad domen bude zakupljen.
5. (Opciono, kasnije) Podesi Cloudflare Route tako da `sklopi.rs/go/unsubscribe` prosleđuje na Worker, ili zameni `unsubUrl` u `price-alert-worker.js` direktnom `*.workers.dev` adresom dok to ne uradiš.

## Poznata ograničenja (namerno, za ovu fazu)

- **"Drift" cena je simulacija.** Pošto je cena na sajtu čisto deterministička (isti upit = ista cena, zauvek), `pricing-core.js` dodaje mali dnevni množilac (±8%) SAMO za potrebe alert-provere, da uopšte ima šta da "padne". Kad affiliate API proradi i cene postanu prave, ukloni `driftMultiplier()` iz `computeAlertPrice()`.
- **Nema potvrde emaila (double opt-in).** Za MVP je insert odmah aktivan alert. Ako uvedeš double opt-in kasnije, doda se `status='pending_confirmation'` + potvrdni mejl pre `'active'`.
- **RLS na `price_alerts` nema select/update za anon/authenticated** — namerno, da niko iz browsera ne može čitati tuđe mejlove/pragove. Sve izmene (uključujući odjavu) idu isključivo preko Worker-a sa `service_role` ključem.
- Ne zaboravi da dodaš novi red o `price_alerts` u `privatnost.html` (nova kategorija prikupljanja — email za obaveštenja) i checkbox za pristanak u samom modalu ako budeš hteo formalniji consent pre javnog lansiranja.

