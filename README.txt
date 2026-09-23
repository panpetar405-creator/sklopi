SKLOPI — UPDATE: uklanjanje stare verzije, korak 1 i 2

PATCH — menja index.html i app.js. styles.css nije menjan (stare CSS klase ostaju neiskorišćene, bezopasno).

UKLONJENO SA SAJTA:
1) Kartica "Nemaš ideju kuda? / Pronađi mi destinaciju" (.action-cards-wrap, dugme #matchTriggerBtn). app.js proverava da dugme postoji, pa nema grešaka. Modal "Pronađi svoj izlet" ostaje u HTML-u, ali sada nema dugmeta koje ga otvara.

2) Brojači (#heroStats — "182 pretraga / 96 klikova na ponude / poslednja destinacija / 8 stavki / 5 partnera / 700+ lokacija"). U app.js dodata provera (if (el)) u updateStats() da ne baca grešku jer elementi statSearches/statClicks/statLast više ne postoje.

3) Sekcija "Destinacije" (#destinacije — redovi kartica po vrsti odmora: skijaški centri, more i plaža...). Povezane JS funkcije (renderDestinations, destStartImages, initDestinations) već su imale proveru (if (!wrap) return;), pa nisu dirane.

4) Sekcija "Sklopi svoje atrakcije" (#attractions — Viator slajder sa strelicama i tačkicama). Povezane JS funkcije (renderAttractionsSlider, renderAttractionsDots, initAttractionsSliderScrollSync) već su imale proveru (if (!wrap) return;), pa nisu dirane.

5) Grafikon cena (#priceMixSection — "Od čega se sastoji cena paketa", raspodela troškova po %). U ovom kodu div je bio prazan (nijedna JS funkcija ga nije punila), tako da je uklanjanje bilo bez rizika.

Napomena: linkovi u meniju ("Destinacije" u gornjoj navigaciji i u mobilnom panelu) su ranije vodili na #destinacije koji više ne postoji — preusmereni su na postojeću sekciju #popular-destinations ("Popularne destinacije"), da meni ne vodi u prazno. Donja traka (bottom-nav) nije dirana — njeno dugme "Destinacije" već vodi na #popular-destinations.

SLEDECI KORACI (redom): 6) baner sa jezerom, 7) traka funkcija (Letovi/Smeštaj/Auto/Putarine...), 8) "Sačuvani aranžmani", 9) baner "Sledeća destinacija te čeka".
