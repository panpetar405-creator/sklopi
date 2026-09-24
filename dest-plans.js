/* SKLOPI — fiksni ("urednički") planovi "3 plana za tvoj grad".
   Ovde se DODAJE novi grad: jedan red u `cities` (naziv ISTI kao u polju Destinacija / kartici),
   pa nema potrebe da diraš app.js. Tekstovi su na srpskom; tx() ih prevodi (i18n-extra.js).
   - arch: 'city' (gradski odmor) ili 'sea' (odmor uz more) — bira set od 3 plana (ispod)
   - acc:  "3 plana za <acc>" (srpski, akuzativ)     - ru: "... поездки <ru>" (ruski predlog + grad)
   - reasons: 4 kratka razloga za "Zašto <grad>?"
   - photo: Unsplash ID (bez parametara) — bez njega se koristi slika sa kartice destinacije
   - rating: true samo ako ocenu (u HTML-u) stvarno imaš; za ostale gradove se ne prikazuje
   - fixed: fiksne cene po osobi [plan1, plan2, plan3]; bez toga se cena računa iz builder-a
     (computeCustomPackage) za trenutni polazak, datume i broj putnika. */
window.SKLOPI_DEST_PLANS = (function(){
  var H = 'Bogata istorija i kultura', W = 'Idealna za vikend putovanja';
  var FOOD = 'Odlična kuhinja i ulična hrana', NIGHT = 'Živ noćni život', WALK = 'Grad se obilazi peške',
      ARCH = 'Arhitektura i muzeji', BEACH = 'Plaže i kristalno more', NATURE = 'Mirne uvale i priroda',
      SPA = 'Termalna kupatila', CAFE = 'Kafei i gradska šetnja', MARKET = 'Pijace i shopping',
      PRICE = 'Povoljno za vikend', VIEW = 'Vidikovci i panorame', SHORT = 'Blizu — kratak let ili vožnja';
  var U = 'https://images.unsplash.com/photo-';
  var comfort = {key:'comfort', title:'Komforniji odmor', price:0, badge:'Više komfora', badgeCls:'plan-detail-badge--comfort',
      flightPref:'direct', hotelStars:4, prioritizeLocation:false, carPref:'small', activityCount:3,
      feats:[['\u2708','Fleksibilan let'],['\u25a3','4\u2605 hotel u mirnijem delu'],['\u25b1','Auto + 3 aktivnosti']],
      flightT:'Fleksibilan let', flightS:'Povratna karta \u2022 Fleksibilan termin', hotelS:'4\u2605 \u2022 Mirniji deo',
      actS:'3 pažljivo odabrane ture', carS:'Auto (mali)', forWho:'Za koga: želiš više komfora i slobode'};
  var value = {key:'best-value', title:'Najviše za novac', badge:'Najpovoljnije', badgeCls:'',
      flightPref:'cheapest', hotelStars:3, prioritizeLocation:true, carPref:'none', activityCount:2,
      feats:[['\u2708','Najjeftinija kombinacija'],['\u25a3','3\u2605 hotel'],['\u25b1','Bez auta \u00b7 ključne aktivnosti']],
      flightT:'Najjeftinija kombinacija', flightS:'Povratna karta \u2022 Ekonomija', hotelS:'3\u2605 \u2022 Blizu centra',
      actS:'2 pažljivo odabrane ture', carS:'Bez auta', forWho:'Za koga: maksimalno rastezanje budžeta'};
  var cityFirst = {key:'city-weekend', title:'Gradski vikend', badge:'Popularno', badgeCls:'plan-detail-badge--popular',
      flightPref:'direct', hotelStars:4, prioritizeLocation:true, carPref:'none', activityCount:2,
      feats:[['\u2708','Direktan let'],['\u25a3','4\u2605 hotel blizu centra'],['\u25c7','2 aktivnosti'],['\u25b1','Bez auta']],
      flightT:'Direktan let', flightS:'Povratna karta \u2022 Ekonomija', hotelS:'4\u2605 \u2022 Blizu centra',
      actS:'2 pažljivo odabrane ture', carS:'Bez auta', forWho:'Za koga: prvi put u gradu / city break'};
  var seaFirst = {key:'sea-holiday', title:'Odmor uz more', badge:'Popularno', badgeCls:'plan-detail-badge--popular',
      flightPref:'direct', hotelStars:4, prioritizeLocation:true, carPref:'small', activityCount:2,
      feats:[['\u2708','Direktan let'],['\u25a3','4\u2605 hotel blizu plaže'],['\u25b1','Auto + 2 aktivnosti']],
      flightT:'Direktan let', flightS:'Povratna karta \u2022 Ekonomija', hotelS:'4\u2605 \u2022 Blizu plaže',
      actS:'2 pažljivo odabrane ture', carS:'Auto (mali)', forWho:'Za koga: klasičan odmor uz more'};
  return {
    def: 'Atina',
    arch: {city:[cityFirst, comfort, value], sea:[seaFirst, comfort, value]},
    cities: {
      'Atina': {arch:'city', country:'Grčka', acc:'tvoju Atinu', ru:'в Афины', photo:'1603565816030-6b389eeb23cb',
        rating:true, fixed:[529, 689, 449],
        photos:['1603565816030-6b389eeb23cb','1530841377377-3ff06c0ca713','1555881400-74d7acaacd8b'],
        forWho1:'Za koga: prvi put u Atini / city break',
        reasons:[H,'Odlična mediteranska kuhinja','Provod i život i smeštaj',W]},
      'Istanbul': {arch:'city', country:'Turska', acc:'tvoj Istanbul', ru:'в Стамбул', photo:'1524231757912-21f4fe3a7200', reasons:[H,FOOD,MARKET,ARCH]},
      'Krf': {arch:'sea', country:'Grčka', acc:'tvoj Krf', ru:'на Корфу', photo:'1530841377377-3ff06c0ca713', reasons:[BEACH,NATURE,FOOD,H]},
      'Pariz': {arch:'city', country:'Francuska', acc:'tvoj Pariz', ru:'в Париж', photo:'1502602898657-3e91760cbb34', reasons:[ARCH,WALK,FOOD,CAFE]},
      'Lisabon': {arch:'city', country:'Portugalija', acc:'tvoj Lisabon', ru:'в Лиссабон', photo:'1555881400-74d7acaacd8b', reasons:[VIEW,FOOD,WALK,NIGHT]},
      'Rim': {arch:'city', country:'Italija', acc:'tvoj Rim', ru:'в Рим', photo:'1552832230-c0197dd311b5', reasons:[H,FOOD,WALK,ARCH]},
      'Barselona': {arch:'city', country:'Španija', acc:'tvoju Barselonu', ru:'в Барселону', reasons:[ARCH,BEACH,NIGHT,FOOD]},
      'Budva': {arch:'sea', country:'Crna Gora', acc:'tvoju Budvu', ru:'в Будву', reasons:[BEACH,NIGHT,SHORT,PRICE]},
      'Beč': {arch:'city', country:'Austrija', acc:'tvoj Beč', ru:'в Вену', reasons:[ARCH,CAFE,WALK,W]},
      'Solun': {arch:'city', country:'Grčka', acc:'tvoj Solun', ru:'в Салоники', reasons:[H,FOOD,SHORT,PRICE]},
      'Budimpešta': {arch:'city', country:'Mađarska', acc:'tvoju Budimpeštu', ru:'в Будапешт', reasons:[SPA,ARCH,NIGHT,PRICE]},
      'Prag': {arch:'city', country:'Češka', acc:'tvoj Prag', ru:'в Прагу', reasons:[ARCH,WALK,NIGHT,PRICE]},
      'Zagreb': {arch:'city', country:'Hrvatska', acc:'tvoj Zagreb', ru:'в Загреб', reasons:[CAFE,WALK,SHORT,W]}
    },
    unsplash: U
  };
})();
