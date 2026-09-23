SKLOPI — UPDATE: završetak (personalizovani planovi → detalji, Moj put, FAQ, footer, donja navigacija)

PATCH — menja index.html (styles.css?v=34, app.js?v=32), styles.css (blok na kraju) i app.js. Ostali fajlovi ostaju isti; paket sadrzi sve prethodne izmene.

1) "Tvoj personalizovani plan": "Pogledaj detalje" sada otvara isti detalj plana (#planDetail) i razradu (let → hotel → aktivnosti → dodatne usluge) za izabrani plan, umesto buildera. Detalj radi za bilo koju destinaciju iz forme; "← Planovi" vraća na personalizovane planove.
2) "Moj put" (#myTrip, pre banera i FAQ-a): tabovi Aktivni/Završeni; kartica sa destinacijom, datumima, putnicima, stavkama (let, hotel, aktivnosti, prevoz, eSIM ako je dodat), Ukupno, "Pogledaj detalje" (builder) i "Preuzmi plan puta" (sklopi-plan-puta.txt sa procenom i partnerskim linkovima). Dok nema izabranog plana prikazuje poruku i dugme "Izaberi plan". "Završeni" je prazan.
3) FAQ: dodata 4 pitanja (affiliate linkovi, promena plana, razlika u odnosu na Booking/Skyscanner, aplikacija) + baner "Nema savršenog putovanja. Samo dobro isplaniranog." Ista pitanja dodata i u FAQPage JSON-LD. (Pitanja o cenama i plaćanju već postoje.) Nova pitanja su na srpskom u HTML-u, van i18n.
4) Footer: dodat slogan "Sklopi put koji ti odgovara. / Let + smeštaj + aktivnosti + prevoz. Jedan plan, prilagođen tebi.", link "Partneri", red "© <godina> SKLOPI. Sva prava zadržana. · Privatnost · Uslovi korišćenja · Disclosure".
5) Donja navigacija (samo telefon ≤700px): Početna, Destinacije, Vodiči, Moj put. WhatsApp dugme je podignuto iznad nje.

NAPOMENE: "Vodiči" kartice i dalje vode na vodici.html (nemam taj fajl). Sve ilustrativne cene su procene, kao na celom sajtu.
