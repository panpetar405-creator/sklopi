# Postavljanje (10 min)

```bash
cd worker
npx wrangler kv namespace create PRICES        # upiši dobijeni id u wrangler.toml
npx wrangler secret put TP_TOKEN                # token sa travelpayouts.com (besplatna registracija → Data API)
npx wrangler deploy
```
Zatim u `config.js` sajta: `window.SKLOPI_API_BASE = 'https://sklopi-price-mix.<nalog>.workers.dev';`
Ako već imaš backend na `API_BASE`, dodaj Worker rutu `api.tvoj-domen.rs/api/price-mix*`.

## Kad neka cena poskupi / pojeftini (hotel, rentakar, aktivnosti, osiguranje, eSIM...)
Menjaš samo promenjene ključeve (ostali ostaju podrazumevani), i grafikon se osveži u roku od ≤ 6 h
(ili odmah, ako obrišeš keš: `npx wrangler kv key delete payload --binding PRICES --remote`):

```bash
npx wrangler kv key put manual '{"hotel_night_4":84,"car_day":41}' --binding PRICES --remote
```
Ključevi: hotel_night_4, car_day, km_trip, l_per_100km, fuel_eur_l, toll_eur_km, activity_each, transfer, insurance, esim, flight_fallback.
Gorivo: svakog četvrtka pogledaj Euro-super 95 u EU Oil Bulletin-u i upiši `fuel_eur_l`.
Strelica ▲/▼ na sajtu pokazuje promenu u odnosu na snimak od pre ≥ 20 h.


## Affiliate ID-jevi (kad odobrenja stignu)
Menja se SAMO `config.js` → `window.SKLOPI_AFF_IDS`. Ostali fajlovi čitaju ID-jeve preko `affiliate.js`.

1. Upiši pravi ID umesto `'SKLOPI'` (kayak `a=`, booking `aid=`, viator `pid=`, airalo `ref=`).
2. Omio: nalepi CEO tracking link iz Travelpayouts panela u `omio` (prazno = običan link bez oznake).
3. World Nomads: ne radi sa `ref=` — program ide preko CJ, treba pravi CJ tracking link (vidi komentar u `app.js`).
4. Proveri: otvori sajt sa `?affcheck` u adresi (ili `SKLOPI_AFF.status()` u konzoli) — ispiše LIVE / čeka odobrenje.
5. Svaki partnerski link automatski dobija `rel="sponsored"` i oznaku "Afilijacija"; napomena o proviziji je u `affDisc()` (app.js) i `.dp-disclosure` (destinacija.html). Ako dodaš NOVOG partnera, dodaj ga i u te napomene.
