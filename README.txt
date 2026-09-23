SKLOPI — UPDATE: sekcija "Dodatne usluge za tvoj put"

PATCH — menja samo index.html (nov #extrasDetail u #planBreakdown; styles.css?v=31, app.js?v=30), styles.css (blok na kraju) i app.js (novi initExtrasDetail). Ostali fajlovi ostaju isti; paket sadrzi i sve prethodne izmene.

STA JE URADJENO (11. ekran sa slike):
- Ispod aktivnosti (u #planBreakdown): "Dodatne usluge za tvoj put" sa 3 kartice + banner "Putovanje je lakše kada imaš sve na jednom mestu."
- eSIM internet (od 9 € po osobi, iz BUILDER_ADDON_RATES): "Dodaj" uključuje eSIM u procenu paketa (builderState.esim), dugme prelazi u "Dodato ✓"; ponovni klik uklanja.
- Putno osiguranje (od 18 € po osobi): samo informacija, dugme "Uskoro" je onemogućeno — partnerski link za World Nomads još nije spreman (program ide preko CJ Affiliate, vidi STATUS PRE PRODUKCIJE u app.js).
- Price Alert: "Aktiviraj" otvara postojeći modal za alert (openAlertModal, traži prijavu emailom) za trenutni izbor iz buildera.
- Cene na slici (eSIM 12 €, osiguranje 9 €) zamenjene su vrednostima koje sajt već koristi u proceni, da zbir u builderu bude isti.

SLEDECA SEKCIJA: "Vodiči i saveti" (kartice vodiča — sajt već ima vodici.html).
