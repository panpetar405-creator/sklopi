SKLOPI — UPDATE: detalji za SVE 3 plana + razrada odmah ispod

PATCH — menja index.html (styles.css?v=33, app.js?v=31), styles.css (par redova na kraju) i app.js (initDestinationSpotlight prepravljen; initFlightDetail i initHotelDetail čitaju izbor plana). Ostali fajlovi ostaju isti; paket sadrzi i sve prethodne izmene.

STA JE PROMENJENO:
- Klik na bilo koju od 3 kartice ("Gradski vikend", "Komforniji odmor", "Najviše za novac") otvara #planDetail sa podacima TOG plana: naslov, cena, procena, fotka, oznaka (Popularno / Više komfora / Najpovoljnije), "Šta je uključeno?" i "Za koga". Ranije je radila samo "Najviše za novac".
- Klik na karticu upisuje Atinu u pretragu i izbor plana u builderState (tip leta, zvezdice, lokacija hotela, auto, aktivnosti), pa "Pogledaj detalje" otvara razradu (Let → Hotel → Aktivnosti → Dodatne usluge) za taj plan: Najviše za novac = najjeftinija kombinacija leta + 3★; Gradski vikend = direktan let + 4★ blizu centra; Komforniji odmor = 4★ u mirnijem delu + mali auto + 3 aktivnosti.
- #planBreakdown je premešten ODMAH ISPOD #planDetail (ranije je bio posle "Tvoj personalizovani plan", daleko od mesta gde se otvara).
- Cene u detaljima planova (529 / 689 / 449 €) su iste kao na karticama; cene leta/hotela u razradi su ilustrativna procena iz buildera.
- Napomena: klik na karticu prepisuje izbor iz "Sastavi svoj paket" u builderState.

NIJE MENJANO: "Pogledaj detalje" u "Tvoj personalizovani plan" i dalje otvara builder.
