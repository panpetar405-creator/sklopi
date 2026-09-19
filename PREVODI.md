# SKLOPI — automatski prevodi

Pišeš samo **srpski** (`locales/sr.json`). Ostali jezici nastaju skriptom, a sajt učitava jedan generisani fajl: `i18n-data.js`.

```
locales/sr.json  ──►  scripts/translate.mjs  ──►  locales/en.json, ru.json, de.json …
                        (Claude API)          └─►  i18n-data.js  (učitava ga index.html pre app.js)
```

## Svakodnevni rad

1. Dodaj ili izmeni tekst u `locales/sr.json` (ključ → srpski tekst).
   - Statički tekst u HTML-u: `<span data-i18n="moj_kljuc">…</span>`
   - Tekst iz JS-a: `t('moj_kljuc')` ili `tf('moj_kljuc', {ime: vrednost})` za `{ime}` u tekstu.
2. Pokreni prevod:
   ```
   ANTHROPIC_API_KEY=sk-ant-...  node scripts/translate.mjs
   ```
   (ili stavi `ANTHROPIC_API_KEY=...` u fajl `.env` u korenu — on je u `.gitignore`).
3. Commituj: `locales/*.json`, `locales/_state.json`, `i18n-data.js`, `index.html` (skripta sama osveži `?v=` iza `i18n-data.js`).

Prvo pokretanje ne poziva API (sve što postoji već je prevedeno) — samo upiše `locales/_state.json`, koji beleži šta je ručno napisano a šta automatski prevedeno.

## Novi jezik

Dodaj red u `locales/languages.json`, npr.:

```json
{"code": "de", "short": "DE", "name": "Deutsch", "locale": "de-DE"}
```

i pokreni `node scripts/translate.mjs`. To je sve: prekidač jezika, datumi, množina i nazivi gradova preuzimaju se iz tog reda i iz `locales/de.json`. (Opciono polje `"tone"` menja stil prevoda, `"dateMonth":"short"` skraćuje mesec u datumima.) Kad jezika bude više od 4–5, prekidač bi trebalo pretvoriti u padajući meni.

## Ručne ispravke

Slobodno menjaj `locales/en.json`, `ru.json`, … Skripta **ne prepisuje** ručno ispravljen prevod. Ako posle toga promeniš srpski tekst, ključ se samo prijavi kao „proveri ručno". Ako želiš da ga ipak ponovo prevede: `--retranslate-changed` (ili `--retranslate kljuc1,kljuc2`).

## Naredbe

| Naredba | Šta radi |
|---|---|
| `node scripts/translate.mjs` | prevede šta fali/promenjeno, generiše `i18n-data.js` |
| `… --dry-run` | samo prikaže šta bi se prevodilo |
| `… --check` | bez API-ja, izlaz 1 ako nešto fali ili je neispravno (za proveru pre objave) |
| `… --build` | samo generiše `i18n-data.js` |
| `… --lang de` | samo jedan jezik |
| `… --prune` | briše ključeve kojih više nema u `sr.json` |
| `node scripts/selftest.mjs` | samotest skripte (lažni prevod, bez API-ja) |
| `node scripts/find-hardcoded.mjs` | izlista srpski tekst upisan direktno u kod |

Skripta proverava svaki prevod: isti `{placeholderi}`, isti HTML tagovi, brendovi (`SKLOPI`, `KAYAK`, `Booking.com`, `Viator`, `WhatsApp`) ostaju nepromenjeni, broj oblika množine odgovara jeziku. Neispravan prevod se pokuša još jednom, pa se ne upisuje i prijavi se.

## Šta je u `sr.json` osim običnih tekstova

- `plural.*` — oblici množine odvojeni sa `|` (npr. `noć|noći|noći`). Broj oblika zavisi od jezika (en 2, ru 4, pl 4, ja 1) — skripta to sama određuje.
- `city.*`, `country.*`, `country_loc.*` — nazivi gradova i država (`"city.Rim": "Rim"`). **Novi grad/država: dodaj red u `sr.json`**, ostalo je automatski.
- `airport_note.<slug>` — napomene o aerodromima sa posebnom formulacijom (slug = ključ u `AIRPORT_DB`).
- `match_month.1…12` — meseci u obliku koji traži rečenica `mreason_season`.
- `locales/_notes.json` — kontekst za prevodioca po ključu ili prefiksu (npr. „SEO naslov, do ~60 znakova"). `locales/_glossary.json` — reči koje se ne prevode.

## Ograničenja (šta ovo NE pokriva)

- Srpski tekst upisan direktno u kod izvan `t()`/`tf()` ostaje na srpskom (opisi ponuđenih paketa, poruke o pasošu, naslovi „Isplati li se let preko drugog aerodroma?" …). `node scripts/find-hardcoded.mjs` ih izlista; prebacuješ ih postepeno u `sr.json`.
- Pravne stranice (privatnost, uslovi, kolačići) i `zajedno.html` nisu prevedene; za pravne tekstove preporučujem ljudsku proveru.
- Svaki drugi HTML koji učitava `app.js` mora pre njega da učita `i18n-data.js`.
- Predlozi gradova u polju Destinacija (Open-Meteo) i dalje se traže na `sr`/`en`.
- Automatski prevod je dobar početak, ali za tekstove koji prodaju (naslovi, opisi) vredi da ih pročita neko ko zna jezik.
