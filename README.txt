SKLOPI — UPDATE: uklanjanje stare verzije, korak 1 i 2

PATCH — menja index.html i app.js. styles.css nije menjan (stare CSS klase ostaju neiskorišćene, bezopasno).

UKLONJENO SA SAJTA:
1) Kartica "Nemaš ideju kuda? / Pronađi mi destinaciju" (.action-cards-wrap, dugme #matchTriggerBtn). app.js proverava da dugme postoji, pa nema grešaka. Modal "Pronađi svoj izlet" ostaje u HTML-u, ali sada nema dugmeta koje ga otvara.

2) Brojači (#heroStats — "182 pretraga / 96 klikova na ponude / poslednja destinacija / 8 stavki / 5 partnera / 700+ lokacija"). U app.js dodata provera (if (el)) u updateStats() da ne baca grešku jer elementi statSearches/statClicks/statLast više ne postoje.

3) Sekcija "Destinacije" (#destinacije — redovi kartica po vrsti odmora: skijaški centri, more i plaža...). Povezane JS funkcije (renderDestinations, destStartImages, initDestinations) već su imale proveru (if (!wrap) return;), pa nisu dirane.

4) Sekcija "Sklopi svoje atrakcije" (#attractions — Viator slajder sa strelicama i tačkicama). Povezane JS funkcije (renderAttractionsSlider, renderAttractionsDots, initAttractionsSliderScrollSync) već su imale proveru (if (!wrap) return;), pa nisu dirane.

5) Grafikon cena (#priceMixSection — "Od čega se sastoji cena paketa", raspodela troškova po %). U ovom kodu div je bio prazan (nijedna JS funkcija ga nije punila), tako da je uklanjanje bilo bez rizika.

Napomena: linkovi u meniju ("Destinacije" u gornjoj navigaciji i u mobilnom panelu) su ranije vodili na #destinacije koji više ne postoji — preusmereni su na postojeću sekciju #popular-destinations ("Popularne destinacije"), da meni ne vodi u prazno. Donja traka (bottom-nav) nije dirana — njeno dugme "Destinacije" već vodi na #popular-destinations.

SKLOPI — UPDATE: uklanjanje stare verzije, korak 1-2 + redizajn 4 sekcije (korak 3)

PATCH — menja index.html i app.js (koraci 1-2, vidi gore) i sada dodatno index.html + styles.css (korak 3, redizajn). app.js nije dalje menjan u ovom koraku.

KORAK 3 — REDIZAJN PO MOCKAPU (1:1):
Restilizovane 4 sekcije da vizuelno odgovaraju priloženom mockapu (bela pozadina, tamno-petrolej akcenti, senke na karticama):

1) FAQ (#faq) — uklonjen eyebrow "Pitanja", naslov sada samo "Česta pitanja" (hardkodovano, van i18n sistema jer je i18n-data.js van ovog patch-a — ako se doda prevod, dodati poseban i18n ključ i data-i18n atribut natrag). Kartice pitanja dobile bele zaobljene ivice sa senkom i sitan chevron indikator umesto "+/–" kružića. Baner na dnu ("Nema savršenog putovanja...") sada ima pravu fotografiju u pozadini sa tamnim overlay-em i planinsku ikonicu iznad "SKLOPI", po uzoru na cta-banner tehniku koja se već koristi na sajtu.

2) Footer (#about) — potpuno restrukturiran po mockapu: velika ikonica + "SKLOPI" wordmark centrirano, tagline, social ikonice (IG/FB/YouTube/TikTok — zamenjen stari Twitter/X set), linija razdvajanja, navigacioni linkovi (O nama / Kako funkcioniše / Partneri / Kontakt), copyright + pravni linkovi (Privatnost / Uslovi / Disclosure), i nov red sa "logotipovima" partnera (KAYAK, Booking.com, viator, Airalo, World Nomads — stilizovani tekst, ne prave logo slike, jer stvarni brend-logo fajlovi nisu dostupni/licencirani za direktnu upotrebu). Pozadina je sada fotografija (more/planina) sa tamnim petrolej overlay-em umesto pune boje.
Napomena: linkovi "O nama" i "Kako funkcioniše" su hardkodovani (bez i18n) iz istog razloga kao FAQ naslov — i18n-data.js nije deo ovog patch-a pa nisam mogao proveriti/dodati nove prevodne ključeve.

3) Vodiči i saveti (#guidesTeaser) — poslednje dve kartice ("Šta poneti na put?", "Kako uštedeti na putovanju?") su ranije koristile emoji ikonice; sada imaju prave foto-thumbnail slike kao i prve dve kartice, po uzoru na mockap gde su sve 4 kartice fotografske.

4) Moj put (#myTrip) — sadržaj koji generiše app.js (mt-card, mt-rows sa ikonicom/nazivom/cenom, mt-total, dugmad "Pogledaj detalje" / "Preuzmi plan puta") je već strukturno i vizuelno gotovo identičan mockapu (bela kartica sa senkom, pill tabovi Aktivni/Završeni) — nije menjano, samo potvrđeno da odgovara.

NAPOMENA O SLIKAMA: sve nove fotografije su sa Unsplash-a (privremeni placeholderi, isti pristup kao ostatak sajta) — po želji zameniti finalnim/licenciranim fotografijama.

SLEDECI KORACI (redom): 6) baner sa jezerom, 7) traka funkcija (Letovi/Smeštaj/Auto/Putarine...), 8) "Sačuvani aranžmani", 9) baner "Sledeća destinacija te čeka".
