## Alert za pad cene — šta je urađeno i šta je ostalo na tebi

## Šta sam napravio
- **`pricing-core.js`** — cenovni algoritam izdvojen iz app.js (isti brojevi, verno prekopirano iz `fetchFlights/fetchHotel/fetchCar/fetchActivity/buildPackage` i `computeCustomPackage`), tako da frontend i server računaju istu cenu za isti dan.
- **`supabase/functions/_shared/pricing-core.ts`** — Deno kopija istog algoritma (edge funkcije ne mogu lako da uvezu UMD browser fajl, pa je namerno dupliran — isti obrazac koji već koristiš za `tierLabelsForSaved` između app.js i zajedno.html).
- **`supabase/functions/check-price-alerts/index.ts`** — edge funkcija koja: učita sve aktivne alerte, ponovo izračuna cenu za svaki, i ako je pala ispod praga — pošalje mejl (preko Resend-a) i ugasi alert (`active=false`) da ne spamuje.
- **`supabase/functions/unsubscribe-alert/index.ts`** — javna funkcija za link "Odjavi se" iz mejla.
- **`supabase/migrations/20260918120000_price_alert_engine.sql`** — dodaje kolone koje su nedostajale (`active`, `unsubscribe_token`, `last_checked_at`, `triggered_at`) i pripremljen (zakomentarisan) `pg_cron` raspored.
- **`app.js`** — izmenjena jedna linija: kad se pretraga (ne builder) sačuva kao alert, sad se čuva i `flags` (koje usluge su bile uključene), jer bez toga server ne bi znao da li da računa cenu auta koji korisnik nikad nije tražio.

## Šta MORAŠ ručno da uradiš (nisam mogao odavde — nemam pristup tvom Supabase projektu ni internetu iz ovog razgovora)
1. **Proveri stvarnu šemu `price_alerts` tabele** — autor originalnog koda je sam napisao da nije 100% siguran da su imena kolona tačna. Pokreni SQL migraciju tek pošto uporediš kolone.
2. **Deploy edge funkcija:**
   ```
   supabase functions deploy check-price-alerts
   supabase functions deploy unsubscribe-alert --no-verify-jwt
   ```
3. **Postavi secrets:**
   ```
   supabase secrets set RESEND_API_KEY=...
   supabase secrets set ALERT_FROM_EMAIL="Skoknica <alerti@skoknica.rs>"
   supabase secrets set SITE_URL=https://skoknica.rs
   ```
   (Resend je samo predlog — zameni `sendEmail()` pozivom ka svom provajderu ako koristiš drugi.)
4. **Registruj i verifikuj domen kod Resend-a** (ili šta god provajder koristiš) — bez verifikovanog domena mejlovi neće ni krenuti.
5. **Uključi `pg_cron` i `pg_net` ekstenzije** u Supabase dashboardu, sačuvaj URL projekta i service role ključ u Vault (koraci su u komentaru na vrhu SQL migracije), pa otkomentariši i pokreni `cron.schedule(...)` blok.
6. **Postavi rutu `/api/unsubscribe-alert`** na frontend hostingu da prosleđuje ka edge funkciji (ili pošalji direktan Supabase functions URL u mejlu umesto lepog `/api/...` linka — trenutno `SITE_URL` env promenljiva pretpostavlja da imaš taj redirect).
7. **Testiraj ručno** pre nego pustiš cron: pozovi `check-price-alerts` endpoint direktno (npr. `curl`) sa test alertom u bazi čiji je threshold namerno visok, proveri da li se `last_price`/`last_checked_at` ažuriraju, pa sa niskim thresholdom proveri da li mejl stvarno stigne.

## Poznato ograničenje
Cena zavisi od dnevnog "tržišnog faktora" (±12%, determinističan po danu) — to znači da će alert nekad okinuti čisto zbog dnevne fluktuacije, ne zato što je nešto stvarno pojeftinilo. To je isto ograničenje koje već postoji u prikazu cena na sajtu (nije nova mana ovog dela), samo sad prvi put ima stvarnu posledicu (mejl korisniku), pa vredi da budeš svestan/svesna toga.

---

# Deljeni izlet / RSVP (zajedno.html) — šta je urađeno i šta je ostalo na tebi

## Bag koji je ovo blokirao
`app.js` je pravio link kao `zajedno.html?trip=<id>` (naziv parametra `trip`, vrednost = sirov primarni ključ iz `trips` tabele). `zajedno.html` čita `params.get('t')`. Naziv se nije poklapao — **svaki deljeni link je do sada prikazivao "link nije potpun", bez obzira na bazu.** Dodatno, slanje sirovog `id` u URL kao "tajni" token je rizično ako `id` nije UUID (moglo bi da se redom pogađaju tuđi izleti).

## Šta sam napravio
- **`supabase/share_trip.sql`** — dodaje `share_token` kolonu (nasumičan UUID, odvojen od primarnog ključa), tabelu `trip_responses`, i sve tri RPC funkcije koje `zajedno.html` već zove: `get_shared_trip`, `get_trip_responses`, `add_trip_response` — sve `SECURITY DEFINER`, tako da anonimni posetioci mogu da ih pozovu bez direktnog pristupa tabelama (isti model koji je već najavljen u komentaru na vrhu `zajedno.html`).
- **`app.js`** — `openShareModal` sad šalje `?t=<trip.share_token>` umesto `?trip=<id>`.

## Šta MORAŠ ručno da uradiš
1. **Proveri da `trips` tabela ima tačno ove kolone**: `id, user_id, dest, date_from, date_to, adults, selection (jsonb), total, created_at`. Migracija pretpostavlja ovo na osnovu `app.js` insert poziva — ako se razlikuje, prilagodi SQL pre pokretanja.
2. **Pokreni `supabase/share_trip.sql`** (SQL editor u dashboardu ili `supabase db push` ako ga uvrstiš u migracije).
3. **Testiraj ceo tok ručno**: sačuvaj izlet → "Podeli" → otvori link u drugom browseru/inkognito prozoru → potvrdi da se izlet učita i da RSVP forma radi (Idem/Možda/Ne mogu + komentar) → osveži i proveri da se odgovor pojavljuje u listi.
4. **Razmisli o spamu**: `add_trip_response` trenutno nema rate limit — svako sa linkom teoretski može da pošalje neograničen broj odgovora. Za prototip je OK, ali pre javnog lansiranja vredi dodati ograničenje.
5. Postojeći redovi u `trips` tabeli (izleti sačuvani PRE ove migracije) automatski dobijaju `share_token` kroz `default gen_random_uuid()` — ne treba ih ručno popunjavati, ali stari share linkovi (ako su ikad negde zalepljeni/poslati) su svejedno bili neispravni pa nema šta da se "pokvari" dodatno.
