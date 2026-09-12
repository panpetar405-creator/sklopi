# "Javi mi kad padne cena" — šta je urađeno i kako da pustiš u pogon

## Izmenjeni/novi fajlovi

**Frontend (izmenjeno):**
- `index.html` — dugme "Javi mi kad padne cena" u builderu + modal za email/prag
- `app.js` — dugme na svakoj od 3 gotove ponude (Budget/Best/Comfort) + JS logika modala (`openAlertModal`, upis u `price_alerts`)
- `styles.css` — stilovi za modal i nova dugmad, u istom vizuelnom jeziku kao ostatak sajta

**Backend (novo):**
- `supabase/price_alerts.sql` — SQL migracija (tabela + RLS)
- `worker/pricing-core.js` — čista (bez DOM-a) kopija formula za cenu, za ponovni izračun na serveru
- `worker/price-alert-worker.js` — Cloudflare Worker: cron provera + slanje mejla + `/unsubscribe`
- `worker/wrangler.toml` — konfiguracija Worker-a

## Koraci za puštanje u rad

1. **Supabase** — u SQL Editor-u pokreni `supabase/price_alerts.sql`.
2. **Resend (ili sličan servis)** — napravi nalog, verifikuj domen sa kog šalješ mejlove (`alerti@skoknica.rs` ili slično), uzmi API ključ. Supabase Auth NE može ovo da radi — to je samo za auth mejlove.
3. **Cloudflare Worker:**
   ```
   cd worker
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # iz Supabase → Project Settings → API (NE anon key!)
   wrangler secret put RESEND_API_KEY
   wrangler deploy
   ```
4. Proveri da `SITE_URL` i `SUPABASE_URL` u `wrangler.toml` odgovaraju pravim vrednostima kad domen bude zakupljen.
5. (Opciono, kasnije) Podesi Cloudflare Route tako da `skoknica.rs/go/unsubscribe` prosleđuje na Worker, ili zameni `unsubUrl` u `price-alert-worker.js` direktnom `*.workers.dev` adresom dok to ne uradiš.

## Poznata ograničenja (namerno, za ovu fazu)

- **"Drift" cena je simulacija.** Pošto je cena na sajtu čisto deterministička (isti upit = ista cena, zauvek), `pricing-core.js` dodaje mali dnevni množilac (±8%) SAMO za potrebe alert-provere, da uopšte ima šta da "padne". Kad affiliate API proradi i cene postanu prave, ukloni `driftMultiplier()` iz `computeAlertPrice()`.
- **Nema potvrde emaila (double opt-in).** Za MVP je insert odmah aktivan alert. Ako uvedeš double opt-in kasnije, doda se `status='pending_confirmation'` + potvrdni mejl pre `'active'`.
- **RLS na `price_alerts` nema select/update za anon/authenticated** — namerno, da niko iz browsera ne može čitati tuđe mejlove/pragove. Sve izmene (uključujući odjavu) idu isključivo preko Worker-a sa `service_role` ključem.
- Ne zaboravi da dodaš novi red o `price_alerts` u `privatnost.html` (nova kategorija prikupljanja — email za obaveštenja) i checkbox za pristanak u samom modalu ako budeš hteo formalniji consent pre javnog lansiranja.
