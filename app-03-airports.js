/* app-03-airports.js — deo nekadašnjeg app.js (deo 3/11): Affiliate deep linkovi, baza aerodroma, perks po tier-u.
   Klasična skripta: deli globalni opseg sa ostalim app-*.js fajlovima; redosled učitavanja u index.html je bitan. */
/* ==========================================================
   AFFILIATE DEEP LINKS — STATUS PRE PRODUKCIJE
   Jedino mesto gde treba gledati šta je spremno, umesto komentara
   rasutih kroz fajl. Pravi ID-jevi idu u config.js
   (window.SKLOPI_AFF_IDS) — dok tamo za neki partner stoji
   'SKLOPI', taj link vodi na partnera ali NE PRATI proviziju.

   ✅ POTVRĐENO protiv partnerske dokumentacije:
      - Airalo slug za Italiju i Grčku (italy-esim, greece-esim)
      - World Nomads PRODAJE rezidentima Srbije: "Serbia" se pojavljuje
        kao opcija u njihovom "country of residence" izborniku na
        service.worldnomads.com i worldnomads.com/eu (help centar),
        provereno 2026-09-18. Srbija nije u EU (za koju trenutno imaju
        posebno ograničenje) ni na listi sankcionisanih zemalja
        (Iran/Sirija/Sudan/S.Koreja/Krim/Kuba) — rezidentska strana
        pitanja više NIJE blokator.
      - Kayak: PARAMETAR JE BIO POGREŠAN, sad ispravljen. Zvanični
        KAYAK Affiliate help centar (help.affiliates.kayak.com) kaže
        eksplicitno: "please ensure that all your affiliate links
        include your unique affiliate ID 'a' at the very least" — dakle
        parametar se zove 'a', NE 'ref' (staro ${'&ref='} nikad ne bi
        pratilo proviziju, ni sa pravim ID-jem). Napomena istog help
        centra: pravi (portal) deep-link generator dodaje i granularne
        tracking parametre (Click ID/Label, Location ID) — 'a' je samo
        apsolutni minimum, korisno je jednom kad se odobri nalog
        proveriti i njihov Deeplink Generator za bolju atribuciju.
      - Booking.com: 'aid=' je potvrđen kao ispravan naziv parametra
        (potvrđeno kroz primer stvarnog linka trećeg partnera). Njihov
        zvanični link generator dodaje i 'label=' za finiju kampanjsku
        atribuciju — nije obavezno, ali vredi dodati kad se nalog odobri.
      - Viator: 'pid=' je potvrđen kao ispravan (stvaran primer iz
        njihove API dokumentacije: ...?mcid=42383&pid=P00063937...).
        NAPOMENA: taj isti primer ima i 'mcid=' (Viator-ov marketing
        campaign ID, poseban broj koji ONI dodeljuju) pored pid-a — kad
        se nalog odobri, pitati account managera da li je mcid obavezan
        i za osnovni link, ili samo za API pozive.

   ⚠️ NAJBOLJA PRETPOSTAVKA — provera pre produkcije:
      - Airalo     airalo.com/<drzava>-esim?ref= — slug za SVE ostale
        države (osim Italije/Grčke) je pretpostavka po istoj šemi,
        nije provereno da stranica zaista postoji za svaku od njih;
        parametar 'ref=' za Airalo takođe nije potvrđen (nije nađena
        zvanična dokumentacija affiliate linka, samo da program postoji)

   ⚠️ NOVI PARAMETRI DEEP LINKA (pretpostavka, proveri ručno jednom
      pre produkcije — otvori po jedan link i vidi da filteri stvarno
      uhvate): KAYAK ruta BEG-ATH/…, `fs=stops%3D0` (samo direktni),
      `sort=price_a`; Booking `nflt=class%3D<3|4|5>`,
      `order=review_score_and_price` / `distance_from_search`,
      `no_rooms=ceil(adults/2)`. Tip auta i konkretna avio-kompanija se
      i dalje NE prosleđuju (nema potvrđenog parametra / mape kodova).

   ❌ NIJE SPREMNO — ne puštati u produkciju dok se ne reši:
      - World Nomads: rezidentska strana je ✅ rešena (vidi gore), ali
        AFFILIATE LINK i dalje nije. Program je od nov. 2022 EXKLUZIVNO
        preko CJ Affiliate (Commission Junction) — stari direktni
        worldnomads.com referral linkovi NE PRATE proviziju. Potreban
        je stvarni ljudski korak, ne kod: (1) registruj se kao Publisher
        na cj.com, (2) potraži "World Nomads" i prijavi se na program,
        (3) nakon odobrenja, generiši prave tracking linkove kroz CJ
        Account Manager (Links → Search) — ti linkovi idu preko CJ-jevog
        sopstvenog tracking domena, ne direktno na worldnomads.com/?ref=.
        Dok se to ne uradi, trenutni URL ispod je samo placeholder koji
        VODI na sajt ali NE DONOSI proviziju.
        Trenutni rizik je nizak: insurance dugme/CTA se generiše
        (pkg.insuranceBookUrl) ali se NIGDE ne renderuje u UI-ju
        (uklonjeno sa kartica — vidi pkgHtml), tako da ovaj link
        još nije user-facing.
========================================================== */
/* Obaveštenje o partnerskim linkovima (builder + rezultati). Isti obrazac kao
   DEST_TXT: tekst živi ovde (sr/en/ru), pada na srpski ako jezika nema.
   Pokriva partnere čiji se linkovi stvarno prikazuju: KAYAK (let),
   Booking.com (hotel/auto), Viator (aktivnosti). Ako se Airalo ili osiguranje
   ikad prikažu u UI-ju, dodaj ih i ovde. */
function affDisc(){
  // Spisak partnera prati šta se STVARNO prikazuje sa provizijom: KAYAK, Booking.com,
  // Viator uvek; Omio tek kad u config.js dobije pravi tracking link (SKLOPI_AFF.isLive).
  // Ako se Airalo ili osiguranje ikad prikažu na glavnoj stranici, dodaj ih i ovde.
  const omio = !!(window.SKLOPI_AFF && window.SKLOPI_AFF.isLive('omio'));
  const list = (names, and) => names.length < 2 ? names.join('')
    : names.slice(0, -1).join(', ') + ' ' + and + ' ' + names[names.length - 1];
  const base = ['KAYAK', 'Booking.com', 'Viator'].concat(omio ? ['Omio'] : []);
  const D = {
    sr:'Linkovi ka ' + list(base.map(n => n + '-u'), 'i') + ' su partnerski: SKLOPI može da dobije proviziju, a tebi cena ostaje ista. Cene i dostupnost potvrđuješ na sajtu partnera.',
    en:'Links to ' + list(base, 'and') + ' are affiliate links: SKLOPI may earn a commission at no extra cost to you. Confirm prices and availability on the partner\'s site.',
    ru:'Ссылки на ' + list(base, 'и') + ' партнёрские: SKLOPI может получить комиссию, а цена для вас не меняется. Цены и наличие проверяйте на сайте партнёра.'
  };
  return D[getLang()] || D.sr;
}
// ID-jevi se čitaju SAMO preko affiliate.js (a upisuju samo u config.js → SKLOPI_AFF_IDS).
function affId(kind){ return window.SKLOPI_AFF.id(PARTNERS[kind].provider); }

function buildAffiliateLink(kind, ctx){
  const enc = encodeURIComponent;
  const dest = enc(ctx.dest);
  switch(kind){
    case 'flight': {
      // Parametar je 'a' (affiliate ID), NE 'ref' — potvrđeno na
      // help.affiliates.kayak.com. Vidi STATUS PRE PRODUKCIJE iznad.
      // Ruta: kad znamo IATA i polazišta i odredišta (posle preslikavanja
      // grada bez aerodroma na najbliži pravi — isto kao na kartici),
      // link nosi TAČNU rutu; inače pada na stari "anywhere-<grad>".
      const oIata = iataFor(realDepartureAirportFor(ctx.originCode));
      const dIata = iataFor(realArrivalAirportFor(ctx.dest));
      const route = (oIata && dIata) ? `${oIata}-${dIata}` : `anywhere-${dest}`;
      const pref = ctx.flightPref || 'direct';
      // direktan → samo direktni letovi; najjeftiniji → sortirano po ceni;
      // konkretna kompanija se NE prosleđuje (KAYAK traži kod kompanije,
      // a nemamo mapu naziv → kod, pa ne nagađamo).
      const sort = pref === 'cheapest' ? 'price_a' : 'bestflight_a';
      const stops = pref === 'direct' ? '&fs=stops%3D0' : '';
      return `https://www.kayak.com/flights/${route}/${ctx.from}/${ctx.to}?adults=${ctx.adults}&sort=${sort}${stops}&a=${affId('flight')}`;
    }
    case 'hotel': {
      // Broj soba isti kao na kartici (ceil(adults/2)), zvezdice kao
      // filter kategorije (class=3/4/5), a prioritet ocene/lokacije kao
      // redosled rezultata — da link otvara ono što kartica opisuje.
      const rooms = Math.max(1, Math.ceil((Number(ctx.adults) || 2) / 2));
      // Datumi i broj gostiju su opcioni: bez njih (destinacije pre izbora datuma)
      // link ostaje obična pretraga grada, ali i dalje nosi affiliate ID.
      const dates = (ctx.from && ctx.to) ? `&checkin=${ctx.from}&checkout=${ctx.to}` : '';
      const guests = (ctx.adults != null) ? `&group_adults=${ctx.adults}&no_rooms=${rooms}` : '';
      const stars = [3,4,5].includes(ctx.hotelStars) ? `&nflt=class%3D${ctx.hotelStars}` : '';
      const order = ctx.prioritizeRating ? '&order=review_score_and_price'
                  : ctx.prioritizeLocation ? '&order=distance_from_search' : '';
      return `https://www.booking.com/searchresults.html?ss=${dest}${dates}${guests}${stars}${order}&aid=${affId('hotel')}`;
    }
    case 'car':
      return `https://www.booking.com/cars/results.html?ss=${dest}&pickupDate=${ctx.from}&dropoffDate=${ctx.to}&aid=${affId('car')}`;
    case 'activity':
      return `https://www.viator.com/searchResults/all?text=${dest}&pid=${affId('activity')}`;
    case 'esim': {
      const slug = airaloCountrySlug(ctx.dest);
      // Ako ne prepoznamo državu iz grada, vodimo na opštu prodavnicu
      // (bolje nego pogrešan/nepostojeći URL za državu).
      return slug
        ? `https://www.airalo.com/${slug}-esim?ref=${affId('esim')}`
        : `https://www.airalo.com/esim?ref=${affId('esim')}`;
    }
    case 'insurance':
      // Vidi STATUS PRE PRODUKCIJE iznad — ova stavka je ❌ nije spremna.
      return `https://www.worldnomads.com/travel-insurance?ref=${affId('insurance')}`;
  }
}

/* ==========================================================
   JEDINSTVENA BAZA AERODROMA — gradovi Srbije i regiona koji
   IMAJU sopstveni aerodrom (hasAirport:true, uz limited:true ako
   je mreža linija ograničena/sezonska) i gradovi koji NEMAJU
   sopstveni aerodrom (nearest + note = najbliži pravi aerodrom).
   Namerno JEDNA baza za oba polja forme (Polazak i Destinacija) —
   koristi se i za upozorenje dok korisnik kuca, i za sam prikaz
   ponude (stvarni aerodrom umesto grada koji ga nema). Uredničko
   geografsko znanje, ne uživo podatak o letovima/linijama.
   NAPOMENA: obuhvata veći broj manjih gradova regiona, ali i dalje
   nije iscrpna lista svakog mesta. Kad sajt bude live, vredi ovo
   dalje širiti na osnovu stvarnih pretraga korisnika koje promaše
   bazu (npr. praćenjem koji gradovi u polju Polazak/Destinacija
   vrate null iz airportInfoFor() ispod).
========================================================== */
const AIRPORT_DB = {
  // --- Srbija: aerodromi ---
  'beograd': {hasAirport:true},
  'nis': {hasAirport:true, limited:true},
  // --- Srbija: bez sopstvenog aerodroma ---
  'niska banja': {nearest:'Niš', note:'Niška Banja nema svoj aerodrom — najbliži je Niš (oko 15 min vožnje).', c:'Niška Banja', k:'own', t:'15 min'},
  'novi sad': {nearest:'Beograd', note:'Novi Sad nema svoj aerodrom — najbliži je Beograd (oko 1h vožnje).', c:'Novi Sad', k:'own', t:'1h'},
  'subotica': {nearest:'Budimpešta'},
  'kragujevac': {nearest:'Beograd', note:'Kragujevac nema svoj aerodrom — najbliži je Beograd (oko 1h vožnje).', c:'Kragujevac', k:'own', t:'1h'},
  'kraljevo': {nearest:'Niš'},
  'novi pazar': {nearest:'Beograd'},
  'sabac': {nearest:'Beograd', note:'Šabac nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).', c:'Šabac', k:'own', t:'1h30'},
  'zrenjanin': {nearest:'Beograd', note:'Zrenjanin nema svoj aerodrom — najbliži je Beograd (oko 1h vožnje).', c:'Zrenjanin', k:'own', t:'1h'},
  'pancevo': {nearest:'Beograd', note:'Pančevo nema svoj aerodrom — najbliži je Beograd (oko 30 min vožnje).', c:'Pančevo', k:'own', t:'30 min'},
  'cacak': {nearest:'Beograd', note:'Čačak nema svoj aerodrom — najbliži je Beograd (oko 2h vožnje).', c:'Čačak', k:'own', t:'2h'},
  'krusevac': {nearest:'Niš', note:'Kruševac nema svoj aerodrom — najbliži je Niš (oko 1h vožnje).', c:'Kruševac', k:'own', t:'1h'},
  'leskovac': {nearest:'Niš', note:'Leskovac nema svoj aerodrom — najbliži je Niš (oko 40 min vožnje).', c:'Leskovac', k:'own', t:'40 min'},
  'vranje': {nearest:'Niš', note:'Vranje nema svoj aerodrom — najbliži je Niš (oko 1h vožnje).', c:'Vranje', k:'own', t:'1h'},
  'uzice': {nearest:'Beograd', note:'Užice nema svoj aerodrom — najbliži je Beograd (oko 3h vožnje).', c:'Užice', k:'own', t:'3h'},
  'valjevo': {nearest:'Beograd', note:'Valjevo nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).', c:'Valjevo', k:'own', t:'1h30'},
  'smederevo': {nearest:'Beograd', note:'Smederevo nema svoj aerodrom — najbliži je Beograd (oko 45 min vožnje).', c:'Smederevo', k:'own', t:'45 min'},
  'sombor': {nearest:'Beograd', note:'Sombor nema svoj aerodrom — najbliži je Beograd (oko 2h vožnje).', c:'Sombor', k:'own', t:'2h'},
  'zajecar': {nearest:'Niš', note:'Zaječar nema svoj aerodrom — najbliži je Niš (oko 1h30 vožnje).', c:'Zaječar', k:'own', t:'1h30'},
  'pirot': {nearest:'Niš', note:'Pirot nema svoj aerodrom — najbliži je Niš (oko 1h vožnje).', c:'Pirot', k:'own', t:'1h'},
  'loznica': {nearest:'Beograd', note:'Loznica nema svoj aerodrom — najbliži je Beograd (oko 2h vožnje).', c:'Loznica', k:'own', t:'2h'},
  'pozarevac': {nearest:'Beograd', note:'Požarevac nema svoj aerodrom — najbliži je Beograd (oko 1h vožnje).', c:'Požarevac', k:'own', t:'1h'},
  'sremska mitrovica': {nearest:'Beograd', note:'Sremska Mitrovica nema svoj aerodrom — najbliži je Beograd (oko 1h vožnje).', c:'Sremska Mitrovica', k:'own', t:'1h'},
  'vrsac': {nearest:'Beograd', note:'Vršac nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).', c:'Vršac', k:'own', t:'1h30'},
  'kikinda': {nearest:'Beograd', note:'Kikinda nema svoj aerodrom — najbliži je Beograd (oko 2h vožnje).', c:'Kikinda', k:'own', t:'2h'},
  'jagodina': {nearest:'Niš', note:'Jagodina nema svoj aerodrom — najbliži je Niš (oko 1h vožnje), Beograd je alternativa.', c:'Jagodina', k:'own', t:'1h', alt:'Beograd'},
  'paracin': {nearest:'Niš', note:'Paraćin nema svoj aerodrom — najbliži je Niš (oko 1h vožnje).', c:'Paraćin', k:'own', t:'1h'},
  'bor': {nearest:'Niš', note:'Bor nema svoj aerodrom — najbliži je Niš (oko 1h30 vožnje).', c:'Bor', k:'own', t:'1h30'},
  'negotin': {nearest:'Niš', note:'Negotin nema svoj aerodrom — najbliži je Niš (oko 2h vožnje).', c:'Negotin', k:'own', t:'2h'},
  'prijepolje': {nearest:'Podgorica', note:'Prijepolje nema svoj aerodrom — najbliži je Podgorica (oko 1h30 vožnje), Beograd je alternativa.', c:'Prijepolje', k:'own', t:'1h30', alt:'Beograd'},
  'priboj': {nearest:'Podgorica', note:'Priboj nema svoj aerodrom — najbliži je Podgorica (oko 1h30 vožnje).', c:'Priboj', k:'own', t:'1h30'},
  'sjenica': {nearest:'Beograd', note:'Sjenica nema svoj aerodrom — najbliži je Beograd (oko 3h vožnje), Podgorica je alternativa.', c:'Sjenica', k:'own', t:'3h', alt:'Podgorica'},
  'prokuplje': {nearest:'Niš', note:'Prokuplje nema svoj aerodrom — najbliži je Niš (oko 40 min vožnje).', c:'Prokuplje', k:'own', t:'40 min'},
  'vrnjacka banja': {nearest:'Niš', note:'Vrnjačka Banja nema svoj aerodrom — najbliži je Niš (oko 1h30 vožnje), Beograd je alternativa.', c:'Vrnjačka Banja', k:'own', t:'1h30', alt:'Beograd'},
  'sokobanja': {nearest:'Niš', note:'Sokobanja nema svoj aerodrom — najbliži je Niš (oko 1h vožnje).', c:'Sokobanja', k:'own', t:'1h'},
  'aleksinac': {nearest:'Niš', note:'Aleksinac nema svoj aerodrom — najbliži je Niš (oko 30 min vožnje).', c:'Aleksinac', k:'own', t:'30 min'},
  'vlasotince': {nearest:'Niš', note:'Vlasotince nema svoj aerodrom — najbliži je Niš (oko 1h vožnje).', c:'Vlasotince', k:'own', t:'1h'},
  'surdulica': {nearest:'Niš', note:'Surdulica nema svoj aerodrom — najbliži je Niš (oko 1h30 vožnje).', c:'Surdulica', k:'own', t:'1h30'},
  'ivanjica': {nearest:'Beograd', note:'Ivanjica nema svoj aerodrom — najbliži je Beograd (oko 3h vožnje).', c:'Ivanjica', k:'own', t:'3h'},
  'cuprija': {nearest:'Niš', note:'Ćuprija nema svoj aerodrom — najbliži je Niš (oko 1h vožnje), Beograd je alternativa.', c:'Ćuprija', k:'own', t:'1h', alt:'Beograd'},
  'svilajnac': {nearest:'Beograd', note:'Svilajnac nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).', c:'Svilajnac', k:'own', t:'1h30'},
  'senta': {nearest:'Beograd', note:'Senta nema svoj aerodrom — najbliži je Beograd (oko 2h vožnje), Budimpešta je alternativa.', c:'Senta', k:'own', t:'2h', alt:'Budimpešta'},
  'becej': {nearest:'Beograd', note:'Bečej nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).', c:'Bečej', k:'own', t:'1h30'},
  'vrbas': {nearest:'Beograd', note:'Vrbas nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).', c:'Vrbas', k:'own', t:'1h30'},
  'backa palanka': {nearest:'Beograd', note:'Bačka Palanka nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).', c:'Bačka Palanka', k:'own', t:'1h30'},
  'ruma': {nearest:'Beograd', note:'Ruma nema svoj aerodrom — najbliži je Beograd (oko 1h vožnje).', c:'Ruma', k:'own', t:'1h'},
  'indjija': {nearest:'Beograd', note:'Inđija nema svoj aerodrom — najbliži je Beograd (oko 40 min vožnje).', c:'Inđija', k:'own', t:'40 min'},
  'stara pazova': {nearest:'Beograd', note:'Stara Pazova nema svoj aerodrom — najbliži je Beograd (oko 30 min vožnje).', c:'Stara Pazova', k:'own', t:'30 min'},
  'sid': {nearest:'Beograd', note:'Šid nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje), Zagreb je alternativa.', c:'Šid', k:'own', t:'1h30', alt:'Zagreb'},
  // --- Crna Gora: aerodromi ---
  'podgorica': {hasAirport:true},
  'tivat': {hasAirport:true},
  // --- Crna Gora: bez sopstvenog aerodroma ---
  'budva': {nearest:'Tivat', note:'Budva nema svoj aerodrom — najbliži je Tivat (oko 25 min vožnje).', c:'Budva', k:'own', t:'25 min'},
  'danilovgrad': {nearest:'Podgorica', note:'Danilovgrad nema svoj aerodrom — najbliži je Podgorica (oko 20 min vožnje).', c:'Danilovgrad', k:'own', t:'20 min'},
  'pljevlja': {nearest:'Podgorica', note:'Pljevlja nema svoj aerodrom — najbliži je Podgorica (oko 2h30 vožnje), Sarajevo je alternativa.', c:'Pljevlja', k:'own', t:'2h30', alt:'Sarajevo'},
  'berane': {nearest:'Podgorica', note:'Berane nema svoj aerodrom — najbliži je Podgorica (oko 2h vožnje).', c:'Berane', k:'own', t:'2h'},
  'rozaje': {nearest:'Podgorica', note:'Rožaje nema svoj aerodrom — najbliži je Podgorica (oko 2h30 vožnje).', c:'Rožaje', k:'own', t:'2h30'},
  'bijelo polje': {nearest:'Podgorica', note:'Bijelo Polje nema svoj aerodrom — najbliži je Podgorica (oko 2h vožnje).', c:'Bijelo Polje', k:'own', t:'2h'},
  'bar': {nearest:'Tivat'},
  'herceg novi': {nearest:'Tivat', note:'Herceg Novi nema svoj aerodrom — najbliži je Tivat (oko 35 min vožnje).', c:'Herceg Novi', k:'own', t:'35 min'},
  'igalo': {nearest:'Tivat', note:'Igalo nema svoj aerodrom — najbliži je Tivat (oko 35 min vožnje).', c:'Igalo', k:'own', t:'35 min'},
  'niksic': {nearest:'Podgorica', note:'Nikšić nema svoj aerodrom — najbliži je Podgorica (oko 1h vožnje).', c:'Nikšić', k:'own', t:'1h'},
  'cetinje': {nearest:'Podgorica', note:'Cetinje nema svoj aerodrom — najbliži je Podgorica (oko 30 min vožnje).', c:'Cetinje', k:'own', t:'30 min'},
  'ulcinj': {nearest:'Tivat', note:'Ulcinj nema svoj aerodrom — najbliži je Tivat (oko 1h vožnje), Podgorica je alternativa.', c:'Ulcinj', k:'own', t:'1h', alt:'Podgorica'},
  'petrovac': {nearest:'Tivat', note:'Petrovac nema svoj aerodrom — najbliži je Tivat (oko 35 min vožnje).', c:'Petrovac', k:'own', t:'35 min'},
  'sutomore': {nearest:'Tivat', note:'Sutomore nema svoj aerodrom — najbliži je Tivat (oko 45 min vožnje).', c:'Sutomore', k:'own', t:'45 min'},
  'perast': {nearest:'Tivat', note:'Perast nema svoj aerodrom — najbliži je Tivat (oko 20 min vožnje).', c:'Perast', k:'own', t:'20 min'},
  'risan': {nearest:'Tivat', note:'Risan nema svoj aerodrom — najbliži je Tivat (oko 25 min vožnje).', c:'Risan', k:'own', t:'25 min'},
  'kotor': {nearest:'Tivat', note:'Kotor nema svoj aerodrom — najbliži je Tivat (oko 15 min vožnje).', c:'Kotor', k:'own', t:'15 min'},
  'kolasin': {nearest:'Podgorica', note:'Kolašin nema svoj aerodrom — najbliži je Podgorica (oko 1h vožnje).', c:'Kolašin', k:'own', t:'1h'},
  'zabljak': {nearest:'Podgorica', note:'Žabljak nema svoj aerodrom — najbliži je Podgorica (oko 2h vožnje).', c:'Žabljak', k:'own', t:'2h'},
  // --- Crna Gora: priobalje (Bokokotorski zaliv i okolina) ---
  'sveti stefan': {nearest:'Tivat', note:'Sveti Stefan nema svoj aerodrom — najbliži je Tivat (oko 25 min vožnje).', c:'Sveti Stefan', k:'own', t:'25 min'},
  'przno': {nearest:'Tivat', note:'Pržno nema svoj aerodrom — najbliži je Tivat (oko 25 min vožnje).', c:'Pržno', k:'own', t:'25 min'},
  'rafailovici': {nearest:'Tivat', note:'Rafailovići nemaju aerodrom — najbliži je Tivat (oko 25 min vožnje).', c:'Rafailovići', k:'own', t:'25 min'},
  'becici': {nearest:'Tivat', note:'Bečići nemaju aerodrom — najbliži je Tivat (oko 20 min vožnje).', c:'Bečići', k:'own', t:'20 min'},
  'milocer': {nearest:'Tivat', note:'Miločer nema aerodrom u blizini — najbliži je Tivat (oko 25 min vožnje).', c:'Miločer', k:'nearby', t:'25 min'},
  'jaz': {nearest:'Tivat', note:'Plaža Jaz nema aerodrom u blizini — najbliži je Tivat (oko 25 min vožnje).', c:'Jaz', k:'nearby', t:'25 min'},
  'dobrota': {nearest:'Tivat', note:'Dobrota nema svoj aerodrom — najbliži je Tivat (oko 15 min vožnje).', c:'Dobrota', k:'own', t:'15 min'},
  'muo': {nearest:'Tivat', note:'Muo nema svoj aerodrom — najbliži je Tivat (oko 15 min vožnje).', c:'Muo', k:'own', t:'15 min'},
  'skaljari': {nearest:'Tivat', note:'Škaljari nemaju aerodrom — najbliži je Tivat (oko 15 min vožnje).', c:'Škaljari', k:'own', t:'15 min'},
  'stoliv': {nearest:'Tivat', note:'Stoliv nema svoj aerodrom — najbliži je Tivat (oko 20 min vožnje).', c:'Stoliv', k:'own', t:'20 min'},
  'orahovac (crna gora)': {nearest:'Tivat', note:'Orahovac nema svoj aerodrom — najbliži je Tivat (oko 25 min vožnje).', c:'Orahovac', k:'own', t:'25 min'},
  'morinj': {nearest:'Tivat', note:'Morinj nema svoj aerodrom — najbliži je Tivat (oko 25 min vožnje).', c:'Morinj', k:'own', t:'25 min'},
  'kamenari': {nearest:'Tivat', note:'Kamenari nemaju aerodrom — najbliži je Tivat (oko 30 min vožnje).', c:'Kamenari', k:'own', t:'30 min'},
  'baosici': {nearest:'Tivat', note:'Baošići nemaju aerodrom — najbliži je Tivat (oko 30 min vožnje).', c:'Baošići', k:'own', t:'30 min'},
  'djenovici': {nearest:'Tivat', note:'Đenovići nemaju aerodrom — najbliži je Tivat (oko 35 min vožnje).', c:'Đenovići', k:'own', t:'35 min'},
  'bijela (crna gora)': {nearest:'Tivat', note:'Bijela nema svoj aerodrom — najbliži je Tivat (oko 35 min vožnje).', c:'Bijela', k:'own', t:'35 min'},
  'zelenika': {nearest:'Tivat', note:'Zelenika nema svoj aerodrom — najbliži je Tivat (oko 35 min vožnje).', c:'Zelenika', k:'own', t:'35 min'},
  'meljine': {nearest:'Tivat', note:'Meljine nemaju aerodrom — najbliži je Tivat (oko 35 min vožnje).', c:'Meljine', k:'own', t:'35 min'},
  'kumbor': {nearest:'Tivat', note:'Kumbor nema svoj aerodrom — najbliži je Tivat (oko 35 min vožnje).', c:'Kumbor', k:'own', t:'35 min'},
  'njivice (crna gora)': {nearest:'Tivat', note:'Njivice nemaju aerodrom — najbliži je Tivat (oko 35 min vožnje).', c:'Njivice', k:'own', t:'35 min'},
  'donja lastva': {nearest:'Tivat', note:'Donja Lastva nema svoj aerodrom — najbliži je Tivat (oko 10 min vožnje).', c:'Donja Lastva', k:'own', t:'10 min'},
  'lepetane': {nearest:'Tivat', note:'Lepetane nemaju aerodrom — najbliži je Tivat (oko 20 min vožnje).', c:'Lepetane', k:'own', t:'20 min'},
  'lustica': {nearest:'Tivat', note:'Poluostrvo Luštica nema aerodrom u blizini — najbliži je Tivat (oko 30 min vožnje).', c:'Luštica', k:'nearby', t:'30 min'},
  'lastva grbaljska': {nearest:'Tivat', note:'Lastva Grbaljska nema svoj aerodrom — najbliži je Tivat (oko 15 min vožnje).', c:'Lastva Grbaljska', k:'own', t:'15 min'},
  'mamula': {nearest:'Tivat', note:'Ostrvo-tvrđava Mamula nema aerodrom u blizini — najbliži je Tivat (oko 35 min vožnje).', c:'Mamula', k:'nearby', t:'35 min'},
  'rose': {nearest:'Tivat', note:'Rose (vrh Luštice) nema aerodrom u blizini — najbliži je Tivat (oko 45 min vožnje).', c:'Rose', k:'nearby', t:'45 min'},
  'zanjic': {nearest:'Tivat', note:'Plaža Žanjic nema aerodrom u blizini — najbliži je Tivat (oko 40 min vožnje).', c:'Žanjic', k:'nearby', t:'40 min'},
  'orjen': {nearest:'Tivat', note:'Planina Orjen nema aerodrom u blizini — najbliži je Tivat (oko 45 min vožnje).', c:'Orjen', k:'nearby', t:'45 min'},
  'prcanj': {nearest:'Tivat', note:'Prčanj nema svoj aerodrom — najbliži je Tivat (oko 20 min vožnje).', c:'Prčanj', k:'own', t:'20 min'},
  // --- Crna Gora: južno primorje (Bar/Ulcinj) ---
  'stari bar': {nearest:'Tivat', note:'Stari Bar nema svoj aerodrom — najbliži je Tivat (oko 1h05 vožnje), Podgorica je alternativa.', c:'Stari Bar', k:'own', t:'1h05', alt:'Podgorica'},
  'susanj': {nearest:'Tivat', note:'Šušanj nema svoj aerodrom — najbliži je Tivat (oko 1h vožnje), Podgorica je alternativa.', c:'Šušanj', k:'own', t:'1h', alt:'Podgorica'},
  'dobra voda': {nearest:'Tivat', note:'Dobra Voda nema svoj aerodrom — najbliži je Tivat (oko 1h10 vožnje), Podgorica je alternativa.', c:'Dobra Voda', k:'own', t:'1h10', alt:'Podgorica'},
  'velika plaza': {nearest:'Tivat', note:'Velika Plaža nema aerodrom u blizini — najbliži je Tivat (oko 1h10 vožnje), Podgorica je alternativa.', c:'Velika Plaža', k:'nearby', t:'1h10', alt:'Podgorica'},
  'stoj': {nearest:'Tivat', note:'Štoj nema aerodrom u blizini — najbliži je Tivat (oko 1h15 vožnje), Podgorica je alternativa.', c:'Štoj', k:'nearby', t:'1h15', alt:'Podgorica'},
  'valdanos': {nearest:'Tivat', note:'Valdanos nema aerodrom u blizini — najbliži je Tivat (oko 1h15 vožnje), Podgorica je alternativa.', c:'Valdanos', k:'nearby', t:'1h15', alt:'Podgorica'},
  'ada bojana': {nearest:'Tivat', note:'Ada Bojana nema aerodrom u blizini — najbliži je Tivat (oko 1h20 vožnje), Podgorica je alternativa.', c:'Ada Bojana', k:'nearby', t:'1h20', alt:'Podgorica'},
  'canj': {nearest:'Tivat', note:'Čanj nema svoj aerodrom — najbliži je Tivat (oko 50 min vožnje).', c:'Čanj', k:'own', t:'50 min'},
  'buljarica': {nearest:'Tivat', note:'Buljarica nema aerodrom u blizini — najbliži je Tivat (oko 45 min vožnje).', c:'Buljarica', k:'nearby', t:'45 min'},
  // --- Crna Gora: unutrašnjost ---
  'sasko jezero': {nearest:'Tivat', note:'Šasko jezero nema aerodrom u blizini — najbliži je Tivat (oko 1h vožnje), Podgorica je alternativa.', c:'Šasko jezero', k:'nearby', t:'1h', alt:'Podgorica'},
  'pivsko jezero': {nearest:'Podgorica', note:'Pivsko jezero nema aerodrom u blizini — najbliži je Podgorica (oko 1h45 vožnje).', c:'Pivsko jezero', k:'nearby', t:'1h45'},
  'durmitor': {nearest:'Podgorica', note:'Durmitor nema aerodrom u blizini — najbliži je Podgorica (oko 2h vožnje).', c:'Durmitor', k:'nearby', t:'2h'},
  'biogradska gora': {nearest:'Podgorica', note:'Nacionalni park Biogradska gora nema aerodrom u blizini — najbliži je Podgorica (oko 1h vožnje).', c:'Biogradska gora', k:'nearby', t:'1h'},
  'lovcen': {nearest:'Podgorica', note:'Planina Lovćen nema aerodrom u blizini — najbliži je Podgorica (oko 45 min vožnje), Tivat je alternativa.', c:'Lovćen', k:'nearby', t:'45 min', alt:'Tivat'},
  'crno jezero': {nearest:'Podgorica', note:'Crno jezero (Durmitor) nema aerodrom u blizini — najbliži je Podgorica (oko 2h vožnje).', c:'Crno jezero', k:'nearby', t:'2h'},
  'biogradsko jezero': {nearest:'Podgorica', note:'Biogradsko jezero nema aerodrom u blizini — najbliži je Podgorica (oko 1h vožnje).', c:'Biogradsko jezero', k:'nearby', t:'1h'},
  'tara (crna gora)': {nearest:'Podgorica', note:'Kanjon Tare nema aerodrom u blizini — najbliži je Podgorica (oko 1h30 vožnje).', c:'Tara', k:'nearby', t:'1h30'},
  'virpazar': {nearest:'Podgorica', note:'Virpazar nema svoj aerodrom — najbliži je Podgorica (oko 30 min vožnje).', c:'Virpazar', k:'own', t:'30 min'},
  'ostrog': {nearest:'Podgorica', note:'Manastir Ostrog nema aerodrom u blizini — najbliži je Podgorica (oko 50 min vožnje).', c:'Ostrog', k:'nearby', t:'50 min'},
  'bjelasica': {nearest:'Podgorica', note:'Planina Bjelasica nema aerodrom u blizini — najbliži je Podgorica (oko 1h vožnje).', c:'Bjelasica', k:'nearby', t:'1h'},
  'komovi': {nearest:'Podgorica', note:'Planina Komovi nema aerodrom u blizini — najbliži je Podgorica (oko 1h30 vožnje).', c:'Komovi', k:'nearby', t:'1h30'},
  'sinjajevina': {nearest:'Podgorica', note:'Planina Sinjajevina nema aerodrom u blizini — najbliži je Podgorica (oko 1h45 vožnje).', c:'Sinjajevina', k:'nearby', t:'1h45'},
  'rumija': {nearest:'Podgorica', note:'Planina Rumija nema aerodrom u blizini — najbliži je Podgorica (oko 40 min vožnje), Tivat je alternativa.', c:'Rumija', k:'nearby', t:'40 min', alt:'Tivat'},
  'prokletije (crna gora)': {nearest:'Podgorica', note:'Prokletije nemaju aerodrom u blizini — najbliži je Podgorica (oko 2h30 vožnje).', c:'Prokletije', k:'nearby', t:'2h30'},
  'hajla': {nearest:'Podgorica', note:'Planina Hajla nema aerodrom u blizini — najbliži je Podgorica (oko 2h30 vožnje).', c:'Hajla', k:'nearby', t:'2h30'},
  'moraca': {nearest:'Podgorica', note:'Kanjon Morače nema aerodrom u blizini — najbliži je Podgorica (oko 1h vožnje).', c:'Morača', k:'nearby', t:'1h'},
  'lim (crna gora)': {nearest:'Podgorica', note:'Reka Lim nema aerodrom u blizini — najbliži je Podgorica (oko 2h vožnje), kod Bijelog Polja i Berana.', c:'Lim', k:'nearby', t:'2h'},
  'zeta': {nearest:'Podgorica', note:'Reka Zeta nema aerodrom u blizini — najbliži je Podgorica (oko 20 min vožnje).', c:'Zeta', k:'nearby', t:'20 min'},
  'piva': {nearest:'Podgorica', note:'Kanjon Pive nema aerodrom u blizini — najbliži je Podgorica (oko 1h45 vožnje).', c:'Piva', k:'nearby', t:'1h45'},
  'cehotina': {nearest:'Podgorica', note:'Reka Ćehotina nema aerodrom u blizini — najbliži je Podgorica (oko 2h30 vožnje), kod Pljevalja.', c:'Ćehotina', k:'nearby', t:'2h30'},
  'mojkovac': {nearest:'Podgorica', note:'Mojkovac nema svoj aerodrom — najbliži je Podgorica (oko 1h15 vožnje).', c:'Mojkovac', k:'own', t:'1h15'},
  'plav': {nearest:'Podgorica', note:'Plav nema svoj aerodrom — najbliži je Podgorica (oko 2h30 vožnje).', c:'Plav', k:'own', t:'2h30'},
  'gusinje': {nearest:'Podgorica', note:'Gusinje nema svoj aerodrom — najbliži je Podgorica (oko 2h30 vožnje).', c:'Gusinje', k:'own', t:'2h30'},
  'pluzine': {nearest:'Podgorica', note:'Plužine nemaju aerodrom — najbliži je Podgorica (oko 1h45 vožnje).', c:'Plužine', k:'own', t:'1h45'},
  'savnik': {nearest:'Podgorica', note:'Šavnik nema svoj aerodrom — najbliži je Podgorica (oko 1h30 vožnje).', c:'Šavnik', k:'own', t:'1h30'},
  'petnjica': {nearest:'Podgorica', note:'Petnjica nema svoj aerodrom — najbliži je Podgorica (oko 2h vožnje).', c:'Petnjica', k:'own', t:'2h'},
  'tuzi': {nearest:'Podgorica', note:'Tuzi nema svoj aerodrom — najbliži je Podgorica (oko 15 min vožnje).', c:'Tuzi', k:'own', t:'15 min'},
  'andrijevica': {nearest:'Podgorica', note:'Andrijevica nema svoj aerodrom — najbliži je Podgorica (oko 2h vožnje).', c:'Andrijevica', k:'own', t:'2h'},
  'cijevna': {nearest:'Podgorica', note:'Kanjon Cijevne nema aerodrom u blizini — najbliži je Podgorica (oko 20 min vožnje).', c:'Cijevna', k:'nearby', t:'20 min'},
  'bistrica (crna gora)': {nearest:'Podgorica', note:'Reka Bistrica nema aerodrom u blizini — najbliži je Podgorica (oko 1h45 vožnje), kod Berana.', c:'Bistrica', k:'nearby', t:'1h45'},
  'plavsko jezero': {nearest:'Podgorica', note:'Plavsko jezero nema aerodrom u blizini — najbliži je Podgorica (oko 2h30 vožnje).', c:'Plavsko jezero', k:'nearby', t:'2h30'},
  'slansko jezero': {nearest:'Podgorica', note:'Slansko jezero nema aerodrom u blizini — najbliži je Podgorica (oko 1h vožnje), kod Nikšića.', c:'Slansko jezero', k:'nearby', t:'1h'},
  'lipska pecina': {nearest:'Podgorica', note:'Lipska pećina nema aerodrom u blizini — najbliži je Podgorica (oko 35 min vožnje), kod Cetinja.', c:'Lipska pećina', k:'nearby', t:'35 min'},
  // --- Bosna i Hercegovina: aerodromi ---
  'sarajevo': {hasAirport:true},
  'banja luka': {hasAirport:true, limited:true},
  'tuzla': {hasAirport:true},
  'mostar': {hasAirport:true},
  'blagaj': {nearest:'Mostar', note:'Blagaj nema svoj aerodrom — najbliži je Mostar (oko 15 min vožnje).', c:'Blagaj', k:'own', t:'15 min'},
  'pocitelj': {nearest:'Mostar', note:'Počitelj nema svoj aerodrom — najbliži je Mostar (oko 30 min vožnje).', c:'Počitelj', k:'own', t:'30 min'},
  'medjugorje': {nearest:'Mostar', note:'Međugorje nema svoj aerodrom — najbliži je Mostar (oko 25 min vožnje).', c:'Međugorje', k:'own', t:'25 min'},
  // --- BiH: bez sopstvenog aerodroma ---
  'zenica': {nearest:'Sarajevo', note:'Zenica nema svoj aerodrom — najbliži je Sarajevo (oko 1h vožnje).', c:'Zenica', k:'own', t:'1h'},
  'prijedor': {nearest:'Banja Luka', note:'Prijedor nema svoj aerodrom — najbliži je Banja Luka (oko 40 min vožnje).', c:'Prijedor', k:'own', t:'40 min'},
  'bihac': {nearest:'Banja Luka', note:'Bihać nema svoj aerodrom — najbliži je Banja Luka (oko 2h vožnje), Zagreb je alternativa.', c:'Bihać', k:'own', t:'2h', alt:'Zagreb'},
  'doboj': {nearest:'Banja Luka', note:'Doboj nema svoj aerodrom — najbliži je Banja Luka (oko 1h vožnje), Sarajevo je alternativa.', c:'Doboj', k:'own', t:'1h', alt:'Sarajevo'},
  'trebinje': {nearest:'Dubrovnik', note:'Trebinje nema svoj aerodrom — najbliži je Dubrovnik u Hrvatskoj (oko 40 min vožnje).', c:'Trebinje', k:'own', t:'40 min', cc:'Hrvatskoj'},
  // NAPOMENA: 'foca (turska)' MORA stajati PRE bosanskog 'foca' unosa — inače
  // airportInfoFor() pogrešno uhvati "Foča (Turska)" preko startsWith('foca ')
  // na bosanskom ključu i vrati Sarajevo umesto Izmira (grad u Turskoj kod Izmira).
  'foca (turska)': {nearest:'Izmir', note:'Foča (Turska) nema svoj aerodrom — najbliži je Izmir (oko 1h vožnje).', c:'Foča (Turska)', k:'own', t:'1h'},
  'foca': {nearest:'Sarajevo', note:'Foča nema svoj aerodrom — najbliži je Sarajevo (oko 1h30 vožnje).', c:'Foča', k:'own', t:'1h30'},
  'bijeljina': {nearest:'Tuzla', note:'Bijeljina nema svoj aerodrom — najbliži je Tuzla (oko 1h vožnje), Beograd je alternativa.', c:'Bijeljina', k:'own', t:'1h', alt:'Beograd'},
  'brcko': {nearest:'Tuzla', note:'Brčko nema svoj aerodrom — najbliži je Tuzla (oko 1h vožnje).', c:'Brčko', k:'own', t:'1h'},
  'travnik': {nearest:'Sarajevo', note:'Travnik nema svoj aerodrom — najbliži je Sarajevo (oko 1h30 vožnje).', c:'Travnik', k:'own', t:'1h30'},
  'livno': {nearest:'Split', note:'Livno nema svoj aerodrom — najbliži je Split u Hrvatskoj (oko 1h30 vožnje), Sarajevo je alternativa.', c:'Livno', k:'own', t:'1h30', cc:'Hrvatskoj', alt:'Sarajevo'},
  'gorazde': {nearest:'Sarajevo', note:'Goražde nema svoj aerodrom — najbliži je Sarajevo (oko 1h vožnje).', c:'Goražde', k:'own', t:'1h'},
  'vrelo bosne': {nearest:'Sarajevo', note:'Vrelo Bosne nema svoj aerodrom — najbliži je Sarajevo (oko 20 min vožnje).', c:'Vrelo Bosne', k:'own', t:'20 min'},
  'konjic': {nearest:'Sarajevo', note:'Konjic nema svoj aerodrom — najbliži je Sarajevo (oko 45 min vožnje), Mostar je alternativa.', c:'Konjic', k:'own', t:'45 min', alt:'Mostar'},
  'jajce': {nearest:'Banja Luka', note:'Jajce nema svoj aerodrom — najbliži je Banja Luka (oko 1h30 vožnje), Sarajevo je alternativa.', c:'Jajce', k:'own', t:'1h30', alt:'Sarajevo'},
  'neum': {nearest:'Dubrovnik', note:'Neum nema svoj aerodrom — najbliži je Dubrovnik u Hrvatskoj (oko 30 min vožnje), Mostar je alternativa.', c:'Neum', k:'own', t:'30 min', cc:'Hrvatskoj', alt:'Mostar'},
  'bjelasnica': {nearest:'Sarajevo', note:'Bjelašnica nema svoj aerodrom — najbliži je Sarajevo (oko 30 min vožnje).', c:'Bjelašnica', k:'own', t:'30 min'},
  'jahorina': {nearest:'Sarajevo', note:'Jahorina nema svoj aerodrom — najbliži je Sarajevo (oko 40 min vožnje).', c:'Jahorina', k:'own', t:'40 min'},
  'vlasic': {nearest:'Banja Luka', note:'Vlašić nema svoj aerodrom — najbliži je Banja Luka (oko 1h30 vožnje), Sarajevo je alternativa.', c:'Vlašić', k:'own', t:'1h30', alt:'Sarajevo'},
  'kupres': {nearest:'Split', note:'Kupres nema svoj aerodrom — najbliži je Split u Hrvatskoj (oko 1h30 vožnje), Mostar je alternativa.', c:'Kupres', k:'own', t:'1h30', cc:'Hrvatskoj', alt:'Mostar'},
  'sutjeska': {nearest:'Sarajevo', note:'Nacionalni park Sutjeska nema svoj aerodrom — najbliži je Sarajevo (oko 2h30 vožnje).', c:'Sutjeska', k:'own', t:'2h30'},
  'una': {nearest:'Banja Luka', note:'Nacionalni park Una nema svoj aerodrom — najbliži je Banja Luka (oko 2h vožnje).', c:'Una', k:'own', t:'2h'},
  // --- Hrvatska: aerodromi ---
  'zagreb': {hasAirport:true}, 'split': {hasAirport:true}, 'dubrovnik': {hasAirport:true},
  'zadar': {hasAirport:true}, 'rijeka': {hasAirport:true}, 'pula': {hasAirport:true},
  'osijek': {hasAirport:true, limited:true},
  // --- Hrvatska: bez sopstvenog aerodroma ---
  'vukovar': {nearest:'Osijek', note:'Vukovar nema svoj aerodrom — najbliži je Osijek (oko 40 min vožnje).', c:'Vukovar', k:'own', t:'40 min'},
  'slavonski brod': {nearest:'Zagreb', note:'Slavonski Brod nema svoj aerodrom — najbliži je Zagreb (oko 2h vožnje), Sarajevo je alternativa.', c:'Slavonski Brod', k:'own', t:'2h', alt:'Sarajevo'},
  'varazdin': {nearest:'Zagreb', note:'Varaždin nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Varaždin', k:'own', t:'1h'},
  'knin': {nearest:'Split', note:'Knin nema svoj aerodrom — najbliži je Split (oko 1h vožnje), Zadar je alternativa.', c:'Knin', k:'own', t:'1h', alt:'Zadar'},
  'sibenik': {nearest:'Split', note:'Šibenik nema svoj aerodrom — najbliži je Split (oko 1h vožnje), Zadar je alternativa.', c:'Šibenik', k:'own', t:'1h', alt:'Zadar'},
  'makarska': {nearest:'Split', note:'Makarska nema svoj aerodrom — najbliži je Split (oko 1h vožnje).', c:'Makarska', k:'own', t:'1h'},
  'trogir': {nearest:'Split'},
  'hvar': {nearest:'Split'},
  'rovinj': {nearest:'Pula', note:'Rovinj nema svoj aerodrom — najbliži je Pula (oko 40 min vožnje).', c:'Rovinj', k:'own', t:'40 min'},
  'sisak': {nearest:'Zagreb', note:'Sisak nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Sisak', k:'own', t:'1h'},
  'karlovac': {nearest:'Zagreb', note:'Karlovac nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Karlovac', k:'own', t:'1h'},
  // --- Hrvatska: mali/sezonski aerodromi ---
  'mali losinj': {hasAirport:true, limited:true},
  'brac': {hasAirport:true, limited:true},
  // --- Hrvatska: Istra (bez sopstvenog aerodroma) ---
  'porec': {nearest:'Pula', note:'Poreč nema svoj aerodrom — najbliži je Pula (oko 1h vožnje).', c:'Poreč', k:'own', t:'1h'},
  'umag': {nearest:'Pula', note:'Umag nema svoj aerodrom — najbliži je Pula (oko 1h15 vožnje), Trst je alternativa.', c:'Umag', k:'own', t:'1h15', alt:'Trst'},
  'vodnjan': {nearest:'Pula', note:'Vodnjan nema svoj aerodrom — najbliži je Pula (oko 15 min vožnje).', c:'Vodnjan', k:'own', t:'15 min'},
  'buje': {nearest:'Pula', note:'Buje nema svoj aerodrom — najbliži je Pula (oko 1h vožnje).', c:'Buje', k:'own', t:'1h'},
  'novigrad': {nearest:'Pula', note:'Novigrad nema svoj aerodrom — najbliži je Pula (oko 50 min vožnje).', c:'Novigrad', k:'own', t:'50 min'},
  'buzet': {nearest:'Pula', note:'Buzet nema svoj aerodrom — najbliži je Pula (oko 1h vožnje).', c:'Buzet', k:'own', t:'1h'},
  'labin': {nearest:'Pula', note:'Labin nema svoj aerodrom — najbliži je Pula (oko 40 min vožnje).', c:'Labin', k:'own', t:'40 min'},
  'pazin': {nearest:'Pula', note:'Pazin nema svoj aerodrom — najbliži je Pula (oko 45 min vožnje).', c:'Pazin', k:'own', t:'45 min'},
  'rabac': {nearest:'Pula', note:'Rabac nema svoj aerodrom — najbliži je Pula (oko 45 min vožnje).', c:'Rabac', k:'own', t:'45 min'},
  'motovun': {nearest:'Pula', note:'Motovun nema svoj aerodrom — najbliži je Pula (oko 1h vožnje).', c:'Motovun', k:'own', t:'1h'},
  'medulin': {nearest:'Pula', note:'Medulin nema svoj aerodrom — najbliži je Pula (oko 20 min vožnje).', c:'Medulin', k:'own', t:'20 min'},
  'barban': {nearest:'Pula', note:'Barban nema svoj aerodrom — najbliži je Pula (oko 30 min vožnje).', c:'Barban', k:'own', t:'30 min'},
  'vrsar': {nearest:'Pula', note:'Vrsar nema svoj aerodrom — najbliži je Pula (oko 40 min vožnje).', c:'Vrsar', k:'own', t:'40 min'},
  'fazana': {nearest:'Pula', note:'Fažana nema svoj aerodrom — najbliži je Pula (oko 15 min vožnje).', c:'Fažana', k:'own', t:'15 min'},
  // --- Hrvatska: Kvarner (bez sopstvenog aerodroma) ---
  'krk': {nearest:'Rijeka', note:'Krk nema svoj aerodrom — najbliži je Rijeka (na samom ostrvu Krku, oko 20 min vožnje).', c:'Krk', k:'own', t:'20 min'},
  'opatija': {nearest:'Rijeka', note:'Opatija nema svoj aerodrom — najbliži je Rijeka (oko 20 min vožnje).', c:'Opatija', k:'own', t:'20 min'},
  'crikvenica': {nearest:'Rijeka', note:'Crikvenica nema svoj aerodrom — najbliži je Rijeka (oko 30 min vožnje).', c:'Crikvenica', k:'own', t:'30 min'},
  'novi vinodolski': {nearest:'Rijeka', note:'Novi Vinodolski nema svoj aerodrom — najbliži je Rijeka (oko 40 min vožnje).', c:'Novi Vinodolski', k:'own', t:'40 min'},
  'kastav': {nearest:'Rijeka', note:'Kastav nema svoj aerodrom — najbliži je Rijeka (oko 10 min vožnje).', c:'Kastav', k:'own', t:'10 min'},
  'bakar': {nearest:'Rijeka', note:'Bakar nema svoj aerodrom — najbliži je Rijeka (oko 15 min vožnje).', c:'Bakar', k:'own', t:'15 min'},
  'kraljevica': {nearest:'Rijeka', note:'Kraljevica nema svoj aerodrom — najbliži je Rijeka (oko 25 min vožnje).', c:'Kraljevica', k:'own', t:'25 min'},
  'senj': {nearest:'Rijeka', note:'Senj nema svoj aerodrom — najbliži je Rijeka (oko 1h vožnje), Zadar je alternativa.', c:'Senj', k:'own', t:'1h', alt:'Zadar'},
  'delnice': {nearest:'Rijeka', note:'Delnice nema svoj aerodrom — najbliži je Rijeka (oko 45 min vožnje).', c:'Delnice', k:'own', t:'45 min'},
  'vrbovsko': {nearest:'Rijeka', note:'Vrbovsko nema svoj aerodrom — najbliži je Rijeka (oko 1h vožnje), Zagreb je alternativa.', c:'Vrbovsko', k:'own', t:'1h', alt:'Zagreb'},
  'cabar': {nearest:'Rijeka', note:'Čabar nema svoj aerodrom — najbliži je Rijeka (oko 1h30 vožnje), Ljubljana je alternativa.', c:'Čabar', k:'own', t:'1h30', alt:'Ljubljana'},
  'punat': {nearest:'Rijeka', note:'Punat nema svoj aerodrom — najbliži je Rijeka (na ostrvu Krku, oko 20 min vožnje).', c:'Punat', k:'own', t:'20 min'},
  'vrbnik': {nearest:'Rijeka', note:'Vrbnik nema svoj aerodrom — najbliži je Rijeka (na ostrvu Krku, oko 30 min vožnje).', c:'Vrbnik', k:'own', t:'30 min'},
  'baska': {nearest:'Rijeka', note:'Baška nema svoj aerodrom — najbliži je Rijeka (na ostrvu Krku, oko 40 min vožnje).', c:'Baška', k:'own', t:'40 min'},
  'malinska': {nearest:'Rijeka', note:'Malinska nema svoj aerodrom — najbliži je Rijeka (na ostrvu Krku, oko 20 min vožnje).', c:'Malinska', k:'own', t:'20 min'},
  'cres': {nearest:'Rijeka', note:'Cres nema svoj aerodrom — najbliži je Rijeka (trajekt i vožnja, oko 1h).', c:'Cres', k:'own', t:'1h'},
  'susak': {nearest:'Mali Lošinj', note:'Susak nema svoj aerodrom — najbliži je Mali Lošinj (trajektom, oko 30 min).', c:'Susak', k:'own', t:'30 min'},
  'ilovik': {nearest:'Mali Lošinj', note:'Ilovik nema svoj aerodrom — najbliži je Mali Lošinj (trajektom, oko 40 min).', c:'Ilovik', k:'own', t:'40 min'},
  'unije': {nearest:'Mali Lošinj', note:'Unije nema svoj aerodrom — najbliži je Mali Lošinj (trajektom, oko 1h).', c:'Unije', k:'own', t:'1h'},
  'rab': {nearest:'Rijeka', note:'Rab nema svoj aerodrom — najbliži je Rijeka (trajekt i vožnja, oko 1h30), Zadar je alternativa.', c:'Rab', k:'own', t:'1h30', alt:'Zadar'},
  'gospic': {nearest:'Zadar', note:'Gospić nema svoj aerodrom — najbliži je Zadar (oko 1h30 vožnje), Rijeka je alternativa.', c:'Gospić', k:'own', t:'1h30', alt:'Rijeka'},
  'otocac': {nearest:'Rijeka', note:'Otočac nema svoj aerodrom — najbliži je Rijeka (oko 1h vožnje), Zadar je alternativa.', c:'Otočac', k:'own', t:'1h', alt:'Zadar'},
  'korenica': {nearest:'Zadar', note:'Korenica (Plitvička jezera) nema svoj aerodrom — najbliži je Zadar (oko 1h30 vožnje), Zagreb je alternativa.', c:'Korenica', k:'own', t:'1h30', alt:'Zagreb'},
  'udbina': {nearest:'Zadar', note:'Udbina nema svoj aerodrom — najbliži je Zadar (oko 1h20 vožnje).', c:'Udbina', k:'own', t:'1h20'},
  'slunj': {nearest:'Zagreb', note:'Slunj nema svoj aerodrom — najbliži je Zagreb (oko 1h20 vožnje).', c:'Slunj', k:'own', t:'1h20'},
  'ogulin': {nearest:'Rijeka', note:'Ogulin nema svoj aerodrom — najbliži je Rijeka (oko 1h vožnje), Zagreb je alternativa.', c:'Ogulin', k:'own', t:'1h', alt:'Zagreb'},
  'duga resa': {nearest:'Zagreb', note:'Duga Resa nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Duga Resa', k:'own', t:'1h'},
  'ozalj': {nearest:'Zagreb', note:'Ozalj nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Ozalj', k:'own', t:'1h'},
  // --- Hrvatska: severna Dalmacija (bez sopstvenog aerodroma) ---
  'biograd na moru': {nearest:'Zadar', note:'Biograd na Moru nema svoj aerodrom — najbliži je Zadar (oko 30 min vožnje).', c:'Biograd na Moru', k:'own', t:'30 min'},
  'vodice': {nearest:'Zadar', note:'Vodice nema svoj aerodrom — najbliži je Zadar (oko 1h vožnje), Split je alternativa.', c:'Vodice', k:'own', t:'1h', alt:'Split'},
  'primosten': {nearest:'Split', note:'Primošten nema svoj aerodrom — najbliži je Split (oko 1h vožnje), Zadar je alternativa.', c:'Primošten', k:'own', t:'1h', alt:'Zadar'},
  'nin': {nearest:'Zadar', note:'Nin nema svoj aerodrom — najbliži je Zadar (oko 20 min vožnje).', c:'Nin', k:'own', t:'20 min'},
  'pakostane': {nearest:'Zadar', note:'Pakoštane nema svoj aerodrom — najbliži je Zadar (oko 30 min vožnje).', c:'Pakoštane', k:'own', t:'30 min'},
  'pirovac': {nearest:'Zadar', note:'Pirovac nema svoj aerodrom — najbliži je Zadar (oko 45 min vožnje).', c:'Pirovac', k:'own', t:'45 min'},
  'murter': {nearest:'Zadar', note:'Murter nema svoj aerodrom — najbliži je Zadar (oko 50 min vožnje).', c:'Murter', k:'own', t:'50 min'},
  'tisno': {nearest:'Zadar', note:'Tisno nema svoj aerodrom — najbliži je Zadar (oko 55 min vožnje), Split je alternativa.', c:'Tisno', k:'own', t:'55 min', alt:'Split'},
  'benkovac': {nearest:'Zadar', note:'Benkovac nema svoj aerodrom — najbliži je Zadar (oko 30 min vožnje).', c:'Benkovac', k:'own', t:'30 min'},
  'obrovac': {nearest:'Zadar', note:'Obrovac nema svoj aerodrom — najbliži je Zadar (oko 45 min vožnje).', c:'Obrovac', k:'own', t:'45 min'},
  'skradin': {nearest:'Zadar', note:'Skradin nema svoj aerodrom — najbliži je Zadar (oko 1h vožnje), Split je alternativa.', c:'Skradin', k:'own', t:'1h', alt:'Split'},
  'drnis': {nearest:'Split', note:'Drniš nema svoj aerodrom — najbliži je Split (oko 1h vožnje), Zadar je alternativa.', c:'Drniš', k:'own', t:'1h', alt:'Zadar'},
  'vir': {nearest:'Zadar', note:'Vir nema svoj aerodrom — najbliži je Zadar (oko 30 min vožnje).', c:'Vir', k:'own', t:'30 min'},
  'ugljan': {nearest:'Zadar', note:'Ugljan nema svoj aerodrom — najbliži je Zadar (trajekt, oko 30 min).', c:'Ugljan', k:'own', t:'30 min'},
  'pasman': {nearest:'Zadar', note:'Pašman nema svoj aerodrom — najbliži je Zadar (trajekt, oko 40 min).', c:'Pašman', k:'own', t:'40 min'},
  'dugi otok': {nearest:'Zadar', note:'Dugi Otok nema svoj aerodrom — najbliži je Zadar (trajektom, oko 1h).', c:'Dugi Otok', k:'own', t:'1h'},
  'iz': {nearest:'Zadar', note:'Iž nema svoj aerodrom — najbliži je Zadar (trajektom, oko 1h).', c:'Iž', k:'own', t:'1h'},
  'molat': {nearest:'Zadar', note:'Molat nema svoj aerodrom — najbliži je Zadar (trajektom, oko 1h30).', c:'Molat', k:'own', t:'1h30'},
  'silba': {nearest:'Zadar', note:'Silba nema svoj aerodrom — najbliži je Zadar (trajektom, oko 1h30).', c:'Silba', k:'own', t:'1h30'},
  'kornati': {nearest:'Zadar', note:'Kornati nema svoj aerodrom — najbliži je Zadar (brodom, oko 1h30).', c:'Kornati', k:'own', t:'1h30'},
  'pag': {nearest:'Zadar', note:'Pag nema svoj aerodrom — najbliži je Zadar (oko 1h vožnje), Rijeka je alternativa.', c:'Pag', k:'own', t:'1h', alt:'Rijeka'},
  'novalja': {nearest:'Zadar', note:'Novalja nema svoj aerodrom — najbliži je Zadar (oko 1h30 vožnje), Rijeka je alternativa.', c:'Novalja', k:'own', t:'1h30', alt:'Rijeka'},
  // --- Hrvatska: srednja Dalmacija (bez sopstvenog aerodroma) ---
  'kastela': {nearest:'Split', note:'Kaštela nema svoj aerodrom — najbliži je Split (oko 15 min vožnje).', c:'Kaštela', k:'own', t:'15 min'},
  'omis': {nearest:'Split', note:'Omiš nema svoj aerodrom — najbliži je Split (oko 40 min vožnje).', c:'Omiš', k:'own', t:'40 min'},
  'baska voda': {nearest:'Split', note:'Baška Voda nema svoj aerodrom — najbliži je Split (oko 1h vožnje).', c:'Baška Voda', k:'own', t:'1h'},
  'brela': {nearest:'Split', note:'Brela nema svoj aerodrom — najbliži je Split (oko 1h vožnje).', c:'Brela', k:'own', t:'1h'},
  'tucepi': {nearest:'Split', note:'Tučepi nema svoj aerodrom — najbliži je Split (oko 1h vožnje).', c:'Tučepi', k:'own', t:'1h'},
  'vela luka': {nearest:'Split', note:'Vela Luka nema svoj aerodrom — najbliži je Split (trajekt i vožnja, oko 2h30), Dubrovnik je alternativa.', c:'Vela Luka', k:'own', t:'2h30', alt:'Dubrovnik'},
  'supetar': {nearest:'Split', note:'Supetar nema svoj aerodrom — najbliži je Split (trajektom, oko 1h).', c:'Supetar', k:'own', t:'1h'},
  'bol': {nearest:'Brač', note:'Bol nema svoj aerodrom — najbliži je aerodrom Brač (oko 30 min vožnje), Split je alternativa preko trajekta.', c:'Bol', k:'own', t:'30 min', alt:'Split'},
  'milna': {nearest:'Split', note:'Milna nema svoj aerodrom — najbliži je Split (trajektom, oko 1h15).', c:'Milna', k:'own', t:'1h15'},
  'postira': {nearest:'Brač', note:'Postira nema svoj aerodrom — najbliži je aerodrom Brač (oko 15 min vožnje).', c:'Postira', k:'own', t:'15 min'},
  'jelsa': {nearest:'Split', note:'Jelsa nema svoj aerodrom — najbliži je Split (trajektom, oko 1h30), Hvar je bliža luka.', c:'Jelsa', k:'own', t:'1h30'},
  'stari grad': {nearest:'Split', note:'Stari Grad nema svoj aerodrom — najbliži je Split (trajektom, oko 1h).', c:'Stari Grad', k:'own', t:'1h'},
  'rogoznica': {nearest:'Split', note:'Rogoznica nema svoj aerodrom — najbliži je Split (oko 45 min vožnje).', c:'Rogoznica', k:'own', t:'45 min'},
  'dugi rat': {nearest:'Split', note:'Dugi Rat nema svoj aerodrom — najbliži je Split (oko 30 min vožnje).', c:'Dugi Rat', k:'own', t:'30 min'},
  'trilj': {nearest:'Split', note:'Trilj nema svoj aerodrom — najbliži je Split (oko 1h vožnje).', c:'Trilj', k:'own', t:'1h'},
  'sinj': {nearest:'Split', note:'Sinj nema svoj aerodrom — najbliži je Split (oko 45 min vožnje).', c:'Sinj', k:'own', t:'45 min'},
  'imotski': {nearest:'Split', note:'Imotski nema svoj aerodrom — najbliži je Split (oko 1h vožnje), Mostar je alternativa.', c:'Imotski', k:'own', t:'1h', alt:'Mostar'},
  'solta': {nearest:'Split', note:'Šolta nema svoj aerodrom — najbliži je Split (trajektom, oko 1h).', c:'Šolta', k:'own', t:'1h'},
  'bisevo': {nearest:'Split', note:'Biševo nema svoj aerodrom — najbliži je Split (trajektom preko Visa, oko 3h).', c:'Biševo', k:'own', t:'3h'},
  'vis': {nearest:'Split', note:'Vis nema svoj aerodrom — najbliži je Split (trajektom, oko 2h30).', c:'Vis', k:'own', t:'2h30'},
  // --- Hrvatska: južna Dalmacija (bez sopstvenog aerodroma) ---
  'cavtat': {nearest:'Dubrovnik', note:'Cavtat nema svoj aerodrom — najbliži je Dubrovnik (oko 5 min vožnje).', c:'Cavtat', k:'own', t:'5 min'},
  'ston': {nearest:'Dubrovnik', note:'Ston nema svoj aerodrom — najbliži je Dubrovnik (oko 1h vožnje).', c:'Ston', k:'own', t:'1h'},
  'slano': {nearest:'Dubrovnik', note:'Slano nema svoj aerodrom — najbliži je Dubrovnik (oko 45 min vožnje).', c:'Slano', k:'own', t:'45 min'},
  'orebic': {nearest:'Dubrovnik', note:'Orebić nema svoj aerodrom — najbliži je Dubrovnik (trajekt i vožnja, oko 2h), Split je alternativa.', c:'Orebić', k:'own', t:'2h', alt:'Split'},
  'opuzen': {nearest:'Dubrovnik', note:'Opuzen nema svoj aerodrom — najbliži je Dubrovnik (oko 1h vožnje), Split je alternativa.', c:'Opuzen', k:'own', t:'1h', alt:'Split'},
  'metkovic': {nearest:'Dubrovnik', note:'Metković nema svoj aerodrom — najbliži je Dubrovnik (oko 1h vožnje), Split je alternativa.', c:'Metković', k:'own', t:'1h', alt:'Split'},
  'ploce': {nearest:'Split', note:'Ploče nema svoj aerodrom — najbliži je Split (oko 1h vožnje), Dubrovnik je alternativa.', c:'Ploče', k:'own', t:'1h', alt:'Dubrovnik'},
  'vrgorac': {nearest:'Split', note:'Vrgorac nema svoj aerodrom — najbliži je Split (oko 1h vožnje), Dubrovnik je alternativa.', c:'Vrgorac', k:'own', t:'1h', alt:'Dubrovnik'},
  'korcula': {nearest:'Dubrovnik', note:'Korčula nema svoj aerodrom — najbliži je Dubrovnik (trajekt i vožnja, oko 2h), Split je alternativa.', c:'Korčula', k:'own', t:'2h', alt:'Split'},
  'blato': {nearest:'Dubrovnik', note:'Blato nema svoj aerodrom — najbliži je Dubrovnik (trajekt i vožnja, oko 2h30), Split je alternativa.', c:'Blato', k:'own', t:'2h30', alt:'Split'},
  'lastovo': {nearest:'Dubrovnik', note:'Lastovo nema svoj aerodrom — najbliži je Dubrovnik (trajektom, oko 2h30).', c:'Lastovo', k:'own', t:'2h30'},
  'mljet': {nearest:'Dubrovnik', note:'Mljet nema svoj aerodrom — najbliži je Dubrovnik (trajektom/brodom, oko 1h30).', c:'Mljet', k:'own', t:'1h30'},
  // --- Hrvatska: kontinent — manja mesta (bez sopstvenog aerodroma) ---
  'velika gorica': {nearest:'Zagreb', note:'Velika Gorica nema svoj aerodrom — najbliži je Zagreb (oko 15 min vožnje, odmah pored).', c:'Velika Gorica', k:'own', t:'15 min'},
  'zapresic': {nearest:'Zagreb', note:'Zaprešić nema svoj aerodrom — najbliži je Zagreb (oko 25 min vožnje).', c:'Zaprešić', k:'own', t:'25 min'},
  'samobor': {nearest:'Zagreb', note:'Samobor nema svoj aerodrom — najbliži je Zagreb (oko 30 min vožnje).', c:'Samobor', k:'own', t:'30 min'},
  'dugo selo': {nearest:'Zagreb', note:'Dugo Selo nema svoj aerodrom — najbliži je Zagreb (oko 25 min vožnje).', c:'Dugo Selo', k:'own', t:'25 min'},
  'ivanic-grad': {nearest:'Zagreb', note:'Ivanić-Grad nema svoj aerodrom — najbliži je Zagreb (oko 30 min vožnje).', c:'Ivanić-Grad', k:'own', t:'30 min'},
  'sveti ivan zelina': {nearest:'Zagreb', note:'Sveti Ivan Zelina nema svoj aerodrom — najbliži je Zagreb (oko 35 min vožnje).', c:'Sveti Ivan Zelina', k:'own', t:'35 min'},
  'jastrebarsko': {nearest:'Zagreb', note:'Jastrebarsko nema svoj aerodrom — najbliži je Zagreb (oko 30 min vožnje).', c:'Jastrebarsko', k:'own', t:'30 min'},
  'kutina': {nearest:'Zagreb', note:'Kutina nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Kutina', k:'own', t:'1h'},
  'novska': {nearest:'Zagreb', note:'Novska nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Novska', k:'own', t:'1h'},
  'petrinja': {nearest:'Zagreb', note:'Petrinja nema svoj aerodrom — najbliži je Zagreb (oko 45 min vožnje).', c:'Petrinja', k:'own', t:'45 min'},
  'glina': {nearest:'Zagreb', note:'Glina nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Glina', k:'own', t:'1h'},
  'krapina': {nearest:'Zagreb', note:'Krapina nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Krapina', k:'own', t:'1h'},
  'zabok': {nearest:'Zagreb', note:'Zabok nema svoj aerodrom — najbliži je Zagreb (oko 45 min vožnje).', c:'Zabok', k:'own', t:'45 min'},
  'klanjec': {nearest:'Zagreb', note:'Klanjec nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Klanjec', k:'own', t:'1h'},
  'pregrada': {nearest:'Zagreb', note:'Pregrada nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Pregrada', k:'own', t:'1h'},
  'donja stubica': {nearest:'Zagreb', note:'Donja Stubica nema svoj aerodrom — najbliži je Zagreb (oko 30 min vožnje).', c:'Donja Stubica', k:'own', t:'30 min'},
  'marija bistrica': {nearest:'Zagreb', note:'Marija Bistrica nema svoj aerodrom — najbliži je Zagreb (oko 40 min vožnje).', c:'Marija Bistrica', k:'own', t:'40 min'},
  'bjelovar': {nearest:'Zagreb', note:'Bjelovar nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Bjelovar', k:'own', t:'1h'},
  'koprivnica': {nearest:'Zagreb', note:'Koprivnica nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Koprivnica', k:'own', t:'1h'},
  'cazma': {nearest:'Zagreb', note:'Čazma nema svoj aerodrom — najbliži je Zagreb (oko 50 min vožnje).', c:'Čazma', k:'own', t:'50 min'},
  'garesnica': {nearest:'Zagreb', note:'Garešnica nema svoj aerodrom — najbliži je Zagreb (oko 1h20 vožnje).', c:'Garešnica', k:'own', t:'1h20'},
  'grubisno polje': {nearest:'Zagreb', note:'Grubišno Polje nema svoj aerodrom — najbliži je Zagreb (oko 1h30 vožnje).', c:'Grubišno Polje', k:'own', t:'1h30'},
  'daruvar': {nearest:'Zagreb', note:'Daruvar nema svoj aerodrom — najbliži je Zagreb (oko 1h30 vožnje).', c:'Daruvar', k:'own', t:'1h30'},
  'pakrac': {nearest:'Zagreb', note:'Pakrac nema svoj aerodrom — najbliži je Zagreb (oko 1h30 vožnje).', c:'Pakrac', k:'own', t:'1h30'},
  'nova gradiska': {nearest:'Zagreb', note:'Nova Gradiška nema svoj aerodrom — najbliži je Zagreb (oko 1h45 vožnje), Osijek je alternativa.', c:'Nova Gradiška', k:'own', t:'1h45', alt:'Osijek'},
  'pozega': {nearest:'Osijek', note:'Požega nema svoj aerodrom — najbliži je Osijek (oko 1h30 vožnje), Zagreb je alternativa.', c:'Požega', k:'own', t:'1h30', alt:'Zagreb'},
  'virovitica': {nearest:'Zagreb', note:'Virovitica nema svoj aerodrom — najbliži je Zagreb (oko 1h45 vožnje), Osijek je alternativa.', c:'Virovitica', k:'own', t:'1h45', alt:'Osijek'},
  'djurdjevac': {nearest:'Zagreb', note:'Đurđevac nema svoj aerodrom — najbliži je Zagreb (oko 1h20 vožnje).', c:'Đurđevac', k:'own', t:'1h20'},
  'ludbreg': {nearest:'Varaždin', note:'Ludbreg nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Ludbreg', k:'own', t:'1h'},
  'prelog': {nearest:'Varaždin', note:'Prelog nema svoj aerodrom — najbliži je Zagreb (oko 1h15 vožnje).', c:'Prelog', k:'own', t:'1h15'},
  'mursko sredisce': {nearest:'Varaždin', note:'Mursko Središće nema svoj aerodrom — najbliži je Zagreb (oko 1h20 vožnje).', c:'Mursko Središće', k:'own', t:'1h20'},
  'cakovec': {nearest:'Varaždin', note:'Čakovec nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Čakovec', k:'own', t:'1h'},
  'sveti martin na muri': {nearest:'Varaždin', note:'Sveti Martin na Muri nema svoj aerodrom — najbliži je Zagreb (oko 1h15 vožnje).', c:'Sveti Martin na Muri', k:'own', t:'1h15'},
  'vinkovci': {nearest:'Osijek', note:'Vinkovci nema svoj aerodrom — najbliži je Osijek (oko 30 min vožnje).', c:'Vinkovci', k:'own', t:'30 min'},
  'djakovo': {nearest:'Osijek', note:'Đakovo nema svoj aerodrom — najbliži je Osijek (oko 30 min vožnje).', c:'Đakovo', k:'own', t:'30 min'},
  'valpovo': {nearest:'Osijek', note:'Valpovo nema svoj aerodrom — najbliži je Osijek (oko 20 min vožnje).', c:'Valpovo', k:'own', t:'20 min'},
  'belisce': {nearest:'Osijek', note:'Belišće nema svoj aerodrom — najbliži je Osijek (oko 20 min vožnje).', c:'Belišće', k:'own', t:'20 min'},
  'zupanja': {nearest:'Osijek', note:'Županja nema svoj aerodrom — najbliži je Osijek (oko 45 min vožnje).', c:'Županja', k:'own', t:'45 min'},
  'ilok': {nearest:'Osijek', note:'Ilok nema svoj aerodrom — najbliži je Osijek (oko 1h vožnje), Novi Sad je alternativa.', c:'Ilok', k:'own', t:'1h', alt:'Novi Sad'},
  'otok': {nearest:'Osijek', note:'Otok nema svoj aerodrom — najbliži je Osijek (oko 40 min vožnje).', c:'Otok', k:'own', t:'40 min'},
  'slatina': {nearest:'Osijek', note:'Slatina nema svoj aerodrom — najbliži je Osijek (oko 1h vožnje), Zagreb je alternativa.', c:'Slatina', k:'own', t:'1h', alt:'Zagreb'},
  'orahovica': {nearest:'Osijek', note:'Orahovica nema svoj aerodrom — najbliži je Osijek (oko 1h vožnje).', c:'Orahovica', k:'own', t:'1h'},
  'nasice': {nearest:'Osijek', note:'Našice nema svoj aerodrom — najbliži je Osijek (oko 30 min vožnje).', c:'Našice', k:'own', t:'30 min'},
  // --- Hrvatska: nacionalni parkovi, planine, banje (bez sopstvenog aerodroma) ---
  'plitvicka jezera': {nearest:'Zagreb', note:'Plitvička jezera nemaju svoj aerodrom — najbliži je Zagreb (oko 2h vožnje), Zadar je alternativa.', c:'Plitvička jezera', k:'own', t:'2h', alt:'Zadar'},
  'krka': {nearest:'Zadar', note:'Nacionalni park Krka nema svoj aerodrom — najbliži je Zadar (oko 50 min vožnje), Split je alternativa.', c:'Krka', k:'own', t:'50 min', alt:'Split'},
  'paklenica': {nearest:'Zadar', note:'Nacionalni park Paklenica nema svoj aerodrom — najbliži je Zadar (oko 45 min vožnje).', c:'Paklenica', k:'own', t:'45 min'},
  'vransko jezero': {nearest:'Zadar', note:'Vransko jezero nema svoj aerodrom — najbliži je Zadar (oko 30 min vožnje).', c:'Vransko jezero', k:'own', t:'30 min'},
  'velebit': {nearest:'Zadar', note:'Velebit nema svoj aerodrom — najbliži je Zadar (oko 1h vožnje), Rijeka je alternativa.', c:'Velebit', k:'own', t:'1h', alt:'Rijeka'},
  'biokovo': {nearest:'Split', note:'Biokovo nema svoj aerodrom — najbliži je Split (oko 1h vožnje).', c:'Biokovo', k:'own', t:'1h'},
  'risnjak': {nearest:'Rijeka', note:'Nacionalni park Risnjak nema svoj aerodrom — najbliži je Rijeka (oko 45 min vožnje).', c:'Risnjak', k:'own', t:'45 min'},
  'dinara': {nearest:'Split', note:'Dinara nema svoj aerodrom — najbliži je Split (oko 1h30 vožnje), Zadar je alternativa.', c:'Dinara', k:'own', t:'1h30', alt:'Zadar'},
  'papuk': {nearest:'Osijek', note:'Papuk nema svoj aerodrom — najbliži je Osijek (oko 1h vožnje), Zagreb je alternativa.', c:'Papuk', k:'own', t:'1h', alt:'Zagreb'},
  'psunj': {nearest:'Osijek', note:'Psunj nema svoj aerodrom — najbliži je Osijek (oko 1h15 vožnje), Zagreb je alternativa.', c:'Psunj', k:'own', t:'1h15', alt:'Zagreb'},
  'ucka': {nearest:'Rijeka', note:'Učka nema svoj aerodrom — najbliži je Rijeka (oko 30 min vožnje).', c:'Učka', k:'own', t:'30 min'},
  'medvednica': {nearest:'Zagreb', note:'Medvednica nema svoj aerodrom — najbliži je Zagreb (oko 20 min vožnje).', c:'Medvednica', k:'own', t:'20 min'},
  'varazdinske toplice': {nearest:'Zagreb', note:'Varaždinske Toplice nemaju svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Varaždinske Toplice', k:'own', t:'1h'},
  'stubicke toplice': {nearest:'Zagreb', note:'Stubičke Toplice nemaju svoj aerodrom — najbliži je Zagreb (oko 30 min vožnje).', c:'Stubičke Toplice', k:'own', t:'30 min'},
  'krapinske toplice': {nearest:'Zagreb', note:'Krapinske Toplice nemaju svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Krapinske Toplice', k:'own', t:'1h'},
  'daruvarske toplice': {nearest:'Zagreb', note:'Daruvarske Toplice nemaju svoj aerodrom — najbliži je Zagreb (oko 1h30 vožnje).', c:'Daruvarske Toplice', k:'own', t:'1h30'},
  'tuheljske toplice': {nearest:'Zagreb', note:'Tuheljske Toplice nemaju svoj aerodrom — najbliži je Zagreb (oko 40 min vožnje).', c:'Tuheljske Toplice', k:'own', t:'40 min'},
  'lipik': {nearest:'Zagreb', note:'Lipik nema svoj aerodrom — najbliži je Zagreb (oko 1h30 vožnje), Osijek je alternativa.', c:'Lipik', k:'own', t:'1h30', alt:'Osijek'},
  'cetina': {nearest:'Split', note:'Reka Cetina nema svoj aerodrom — najbliži je Split (oko 40 min vožnje).', c:'Cetina', k:'own', t:'40 min'},
  'zrmanja': {nearest:'Zadar', note:'Reka Zrmanja nema svoj aerodrom — najbliži je Zadar (oko 1h vožnje).', c:'Zrmanja', k:'own', t:'1h'},
  'mirna': {nearest:'Pula', note:'Reka Mirna nema svoj aerodrom — najbliži je Pula (oko 40 min vožnje).', c:'Mirna', k:'own', t:'40 min'},
  'kupa': {nearest:'Zagreb', note:'Reka Kupa nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).', c:'Kupa', k:'own', t:'1h'},
  'drava': {nearest:'Osijek', note:'Reka Drava nema svoj aerodrom — najbliži je Osijek (oko 1h vožnje), Zagreb je alternativa.', c:'Drava', k:'own', t:'1h', alt:'Zagreb'},
  // --- Severna Makedonija ---
  'skoplje': {hasAirport:true}, 'ohrid': {hasAirport:true, limited:true},
  'bitola': {nearest:'Ohrid', note:'Bitolj nema svoj aerodrom — najbliži je Ohrid (oko 1h vožnje), Skoplje je alternativa.', c:'Bitolj', k:'own', t:'1h', alt:'Skoplje'},
  'tetovo': {nearest:'Skoplje', note:'Tetovo nema svoj aerodrom — najbliži je Skoplje (oko 30 min vožnje).', c:'Tetovo', k:'own', t:'30 min'},
  'kumanovo': {nearest:'Skoplje', note:'Kumanovo nema svoj aerodrom — najbliži je Skoplje (oko 30 min vožnje).', c:'Kumanovo', k:'own', t:'30 min'},
  'gostivar': {nearest:'Skoplje', note:'Gostivar nema svoj aerodrom — najbliži je Skoplje (oko 45 min vožnje).', c:'Gostivar', k:'own', t:'45 min'},
  'strumica': {nearest:'Skoplje', note:'Strumica nema svoj aerodrom — najbliži je Skoplje (oko 1h30 vožnje).', c:'Strumica', k:'own', t:'1h30'},
  'prilep': {nearest:'Ohrid', note:'Prilep nema svoj aerodrom — najbliži je Ohrid (oko 1h vožnje), Skoplje je alternativa.', c:'Prilep', k:'own', t:'1h', alt:'Skoplje'},
  'struga': {nearest:'Ohrid', note:'Struga nema svoj aerodrom — najbliži je Ohrid (oko 20 min vožnje).', c:'Struga', k:'own', t:'20 min'},
  'veles': {nearest:'Skoplje', note:'Veles nema svoj aerodrom — najbliži je Skoplje (oko 40 min vožnje).', c:'Veles', k:'own', t:'40 min'},
  // --- Kosovo ---
  'pristina': {hasAirport:true},
  'prizren': {nearest:'Priština', note:'Prizren nema svoj aerodrom — najbliži je Priština (oko 1h30 vožnje).', c:'Prizren', k:'own', t:'1h30'},
  'pec': {nearest:'Priština', note:'Peć nema svoj aerodrom — najbliži je Priština (oko 1h30 vožnje), Podgorica je alternativa.', c:'Peć', k:'own', t:'1h30', alt:'Podgorica'},
  'djakovica': {nearest:'Priština', note:'Đakovica nema svoj aerodrom — najbliži je Priština (oko 1h vožnje).', c:'Đakovica', k:'own', t:'1h'},
  'mitrovica': {nearest:'Priština', note:'Mitrovica nema svoj aerodrom — najbliži je Priština (oko 40 min vožnje).', c:'Mitrovica', k:'own', t:'40 min'},
  // --- Albanija ---
  'tirana': {hasAirport:true},
  'skadar': {nearest:'Podgorica'},
  'skadarsko jezero': {nearest:'Podgorica', note:'Skadarsko jezero nema svoj aerodrom — najbliži je Podgorica (oko 30 min vožnje).', c:'Skadarsko jezero', k:'own', t:'30 min'},
  'sarande': {nearest:'Tirana'},
  'vlore': {nearest:'Tirana', note:'Vlorë nema svoj aerodrom — najbliži je Tirana (oko 2h vožnje).', c:'Vlorë', k:'own', t:'2h'},
  'durres': {nearest:'Tirana', note:'Durrës nema svoj aerodrom — najbliži je Tirana (oko 30 min vožnje).', c:'Durrës', k:'own', t:'30 min'},
  'kruja': {nearest:'Tirana', note:'Kruja nema svoj aerodrom — najbliži je Tirana (oko 30 min vožnje).', c:'Kruja', k:'own', t:'30 min'},
  'fushe-kruja': {nearest:'Tirana', note:'Fushë-Kruja nema svoj aerodrom — najbliži je Tirana (oko 25 min vožnje).', c:'Fushë-Kruja', k:'own', t:'25 min'},
  'vora': {nearest:'Tirana', note:'Vorë nema svoj aerodrom — najbliži je Tirana (oko 15 min vožnje).', c:'Vorë', k:'own', t:'15 min'},
  'lac': {nearest:'Tirana', note:'Laç nema svoj aerodrom — najbliži je Tirana (oko 45 min vožnje).', c:'Laç', k:'own', t:'45 min'},
  'lezha': {nearest:'Tirana', note:'Lezha nema svoj aerodrom — najbliži je Tirana (oko 1h vožnje).', c:'Lezha', k:'own', t:'1h'},
  'shengjin': {nearest:'Tirana', note:'Shëngjin nema svoj aerodrom — najbliži je Tirana (oko 1h vožnje).', c:'Shëngjin', k:'own', t:'1h'},
  'patok': {nearest:'Tirana', note:'Patok nema svoj aerodrom — najbliži je Tirana (oko 1h vožnje).', c:'Patok', k:'own', t:'1h'},
  'velipoja': {nearest:'Podgorica', note:'Velipoja nema svoj aerodrom — najbliži je Podgorica (oko 1h vožnje), Tirana je alternativa.', c:'Velipoja', k:'own', t:'1h', alt:'Tirana'},
  'kavaja': {nearest:'Tirana', note:'Kavaja nema svoj aerodrom — najbliži je Tirana (oko 45 min vožnje).', c:'Kavaja', k:'own', t:'45 min'},
  'peqin': {nearest:'Tirana', note:'Peqin nema svoj aerodrom — najbliži je Tirana (oko 50 min vožnje).', c:'Peqin', k:'own', t:'50 min'},
  'elbasan': {nearest:'Tirana', note:'Elbasan nema svoj aerodrom — najbliži je Tirana (oko 1h vožnje).', c:'Elbasan', k:'own', t:'1h'},
  'librazhd': {nearest:'Tirana', note:'Librazhd nema svoj aerodrom — najbliži je Tirana (oko 1h30 vožnje).', c:'Librazhd', k:'own', t:'1h30'},
  'bulqiza': {nearest:'Tirana', note:'Bulqiza nema svoj aerodrom — najbliži je Tirana (oko 1h30 vožnje).', c:'Bulqiza', k:'own', t:'1h30'},
  'burrel': {nearest:'Tirana', note:'Burrel nema svoj aerodrom — najbliži je Tirana (oko 1h15 vožnje).', c:'Burrel', k:'own', t:'1h15'},
  'rreshen': {nearest:'Tirana', note:'Rrëshen nema svoj aerodrom — najbliži je Tirana (oko 1h30 vožnje).', c:'Rrëshen', k:'own', t:'1h30'},
  'puka': {nearest:'Tirana', note:'Puka nema svoj aerodrom — najbliži je Tirana (oko 2h vožnje).', c:'Puka', k:'own', t:'2h'},
  'kruma': {nearest:'Tirana', note:'Kruma nema svoj aerodrom — najbliži je Tirana (oko 2h30 vožnje).', c:'Kruma', k:'own', t:'2h30'},
  'kukes': {nearest:'Tirana', note:'Kukës ima sopstveni aerodrom, ali bez redovnih letova — najbliži aktivan je Tirana (oko 2h vožnje).', c:'Kukës', k:'own', t:'2h'},
  'peshkopia': {nearest:'Tirana', note:'Peshkopia nema aktivan aerodrom — najbliži je Tirana (oko 3h vožnje).', c:'Peshkopia', k:'own', t:'3h'},
  'korab': {nearest:'Tirana', note:'Korab (planina) nema aerodrom u blizini — najbliži je Tirana (oko 3h vožnje), polazna tačka je Peshkopia.', c:'Korab', k:'nearby', t:'3h'},
  'lura': {nearest:'Tirana', note:'Nacionalni park Lura nema aerodrom u blizini — najbliži je Tirana (oko 2h30 vožnje).', c:'Lura', k:'nearby', t:'2h30'},
  'bovilla': {nearest:'Tirana', note:'Jezero Bovilla nema aerodrom u blizini — najbliži je Tirana (oko 30 min vožnje).', c:'Bovilla', k:'nearby', t:'30 min'},
  'gramsh': {nearest:'Tirana', note:'Gramsh nema svoj aerodrom — najbliži je Tirana (oko 2h vožnje).', c:'Gramsh', k:'own', t:'2h'},
  'korça': {nearest:'Tirana', note:'Korça nema svoj aerodrom — najbliži je Tirana (oko 3h vožnje).', c:'Korça', k:'own', t:'3h'},
  'bilisht': {nearest:'Tirana', note:'Bilisht nema svoj aerodrom — najbliži je Tirana (oko 3h30 vožnje).', c:'Bilisht', k:'own', t:'3h30'},
  'maliq': {nearest:'Tirana', note:'Maliq nema svoj aerodrom — najbliži je Tirana (oko 3h vožnje).', c:'Maliq', k:'own', t:'3h'},
  'pogradec': {nearest:'Tirana', note:'Pogradec nema svoj aerodrom — najbliži je Tirana (oko 2h30 vožnje).', c:'Pogradec', k:'own', t:'2h30'},
  'prespansko jezero': {nearest:'Tirana', note:'Prespansko jezero nema aerodrom u blizini — najbliži je Tirana (oko 3h15 vožnje).', c:'Prespansko jezero', k:'nearby', t:'3h15'},
  'fier': {nearest:'Tirana', note:'Fier nema svoj aerodrom — najbliži je Tirana (oko 2h vožnje).', c:'Fier', k:'own', t:'2h'},
  'lushnja': {nearest:'Tirana', note:'Lushnja nema svoj aerodrom — najbliži je Tirana (oko 1h30 vožnje).', c:'Lushnja', k:'own', t:'1h30'},
  'kuçova': {nearest:'Tirana', note:'Kuçova nema svoj aerodrom — najbliži je Tirana (oko 1h45 vožnje).', c:'Kuçova', k:'own', t:'1h45'},
  'ballsh': {nearest:'Tirana', note:'Ballsh nema svoj aerodrom — najbliži je Tirana (oko 2h15 vožnje).', c:'Ballsh', k:'own', t:'2h15'},
  'patos': {nearest:'Tirana', note:'Patos nema svoj aerodrom — najbliži je Tirana (oko 2h15 vožnje).', c:'Patos', k:'own', t:'2h15'},
  'berat': {nearest:'Tirana', note:'Berat nema svoj aerodrom — najbliži je Tirana (oko 2h vožnje).', c:'Berat', k:'own', t:'2h'},
  'tepelena': {nearest:'Tirana', note:'Tepelena nema svoj aerodrom — najbliži je Tirana (oko 2h45 vožnje).', c:'Tepelena', k:'own', t:'2h45'},
  'permet': {nearest:'Tirana', note:'Përmet nema svoj aerodrom — najbliži je Tirana (oko 3h vožnje).', c:'Përmet', k:'own', t:'3h'},
  'benja': {nearest:'Tirana', note:'Termalno kupatilo Benja (kod Përmeta) nema aerodrom u blizini — najbliži je Tirana (oko 3h vožnje).', c:'Benja', k:'nearby', t:'3h'},
  'gjirokastra': {nearest:'Tirana', note:'Gjirokastra nema svoj aerodrom — najbliži je Tirana (oko 3h30 vožnje).', c:'Gjirokastra', k:'own', t:'3h30'},
  'delvina': {nearest:'Tirana', note:'Delvina nema svoj aerodrom — najbliži je Tirana (oko 3h45 vožnje).', c:'Delvina', k:'own', t:'3h45'},
  'konispol': {nearest:'Tirana', note:'Konispol nema svoj aerodrom — najbliži je Tirana (oko 4h vožnje).', c:'Konispol', k:'own', t:'4h'},
  'ksamil': {nearest:'Tirana', note:'Ksamil nema svoj aerodrom — najbliži je Tirana (oko 4h vožnje).', c:'Ksamil', k:'own', t:'4h'},
  'cika': {nearest:'Tirana', note:'Planina Çika nema aerodrom u blizini — najbliži je Tirana (oko 2h30 vožnje).', c:'Çika', k:'nearby', t:'2h30'},
  'himare': {nearest:'Tirana', note:'Himara nema svoj aerodrom — najbliži je Tirana (oko 2h45 vožnje).', c:'Himara', k:'own', t:'2h45'},
  'dhermi': {nearest:'Tirana', note:'Dhërmi nema svoj aerodrom — najbliži je Tirana (oko 2h30 vožnje).', c:'Dhërmi', k:'own', t:'2h30'},
  'radhime': {nearest:'Tirana', note:'Radhimë nema svoj aerodrom — najbliži je Tirana (oko 2h15 vožnje).', c:'Radhimë', k:'own', t:'2h15'},
  'orikum': {nearest:'Tirana', note:'Orikum nema svoj aerodrom — najbliži je Tirana (oko 2h15 vožnje).', c:'Orikum', k:'own', t:'2h15'},
  'palase': {nearest:'Tirana', note:'Palasë nema aerodrom u blizini — najbliži je Tirana (oko 2h30 vožnje).', c:'Palasë', k:'nearby', t:'2h30'},
  'drymades': {nearest:'Tirana', note:'Drymades nema aerodrom u blizini — najbliži je Tirana (oko 2h30 vožnje).', c:'Drymades', k:'nearby', t:'2h30'},
  'gjipe': {nearest:'Tirana', note:'Plaža Gjipe nema aerodrom u blizini — najbliži je Tirana (oko 2h30 vožnje).', c:'Gjipe', k:'nearby', t:'2h30'},
  'currila': {nearest:'Tirana', note:'Currila (plaža kod Drača) nema aerodrom u blizini — najbliži je Tirana (oko 30 min vožnje).', c:'Currila', k:'nearby', t:'30 min'},
  'theth': {nearest:'Tirana', note:'Theth nema svoj aerodrom — najbliži je Tirana (oko 3h vožnje), Podgorica je alternativa.', c:'Theth', k:'own', t:'3h', alt:'Podgorica'},
  'valbona': {nearest:'Tirana', note:'Valbona nema svoj aerodrom — najbliži je Tirana (oko 3h30 vožnje), Podgorica je alternativa.', c:'Valbona', k:'own', t:'3h30', alt:'Podgorica'},
  'jezerca': {nearest:'Tirana', note:'Planina Jezercë nema aerodrom u blizini — najbliži je Tirana (oko 3h30 vožnje), Podgorica je alternativa.', c:'Jezercë', k:'nearby', t:'3h30', alt:'Podgorica'},
  // --- Slovenija: aerodromi ---
  'ljubljana': {hasAirport:true},
  'maribor': {hasAirport:true, limited:true},
  // --- Slovenija: bez sopstvenog aerodroma ---
  'bled': {nearest:'Ljubljana', note:'Bled nema svoj aerodrom — najbliži je Ljubljana (oko 40 min vožnje).', c:'Bled', k:'own', t:'40 min'},
  'kranjska gora': {nearest:'Ljubljana', note:'Kranjska Gora nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Kranjska Gora', k:'own', t:'1h'},
  'kranj': {nearest:'Ljubljana', note:'Kranj nema svoj aerodrom — najbliži je Ljubljana (oko 30 min vožnje).', c:'Kranj', k:'own', t:'30 min'},
  'bohinj': {nearest:'Ljubljana', note:'Bohinj nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Bohinj', k:'own', t:'1h'},
  'bovec': {nearest:'Ljubljana', note:'Bovec nema svoj aerodrom — najbliži je Ljubljana (oko 1h30 vožnje).', c:'Bovec', k:'own', t:'1h30'},
  'kobarid': {nearest:'Ljubljana', note:'Kobarid nema svoj aerodrom — najbliži je Ljubljana (oko 1h30 vožnje).', c:'Kobarid', k:'own', t:'1h30'},
  'logarska dolina': {nearest:'Ljubljana', note:'Logarska Dolina nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Logarska Dolina', k:'own', t:'1h'},
  'idrija': {nearest:'Ljubljana', note:'Idrija nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Idrija', k:'own', t:'1h'},
  'postojna': {nearest:'Ljubljana', note:'Postojna nema svoj aerodrom — najbliži je Ljubljana (oko 45 min vožnje).', c:'Postojna', k:'own', t:'45 min'},
  'škocjanske jame': {nearest:'Ljubljana', note:'Škocjanske jame nemaju aerodrom u blizini — najbliži je Ljubljana (oko 1h vožnje).', c:'Škocjanske jame', k:'nearby', t:'1h'},
  'predjama': {nearest:'Ljubljana', note:'Predjama nema svoj aerodrom — najbliži je Ljubljana (oko 45 min vožnje).', c:'Predjama', k:'own', t:'45 min'},
  'vintgar': {nearest:'Ljubljana', note:'Vintgar nema svoj aerodrom — najbliži je Ljubljana (oko 45 min vožnje).', c:'Vintgar', k:'own', t:'45 min'},
  'kamnik': {nearest:'Ljubljana', note:'Kamnik nema svoj aerodrom — najbliži je Ljubljana (oko 30 min vožnje).', c:'Kamnik', k:'own', t:'30 min'},
  'celje': {nearest:'Ljubljana', note:'Celje nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Celje', k:'own', t:'1h'},
  'novo mesto': {nearest:'Ljubljana', note:'Novo Mesto nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Novo Mesto', k:'own', t:'1h'},
  'rogaška slatina': {nearest:'Ljubljana', note:'Rogaška Slatina nema svoj aerodrom — najbliži je Ljubljana (oko 1h30 vožnje).', c:'Rogaška Slatina', k:'own', t:'1h30'},
  'dolenjske toplice': {nearest:'Ljubljana', note:'Dolenjske Toplice nemaju aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Dolenjske Toplice', k:'plain', t:'1h'},
  'laško': {nearest:'Ljubljana', note:'Laško nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Laško', k:'own', t:'1h'},
  'triglav': {nearest:'Ljubljana', note:'Triglav nema aerodrom u blizini — najbliži je Ljubljana (oko 1h30 vožnje).', c:'Triglav', k:'nearby', t:'1h30'},
  'vogel': {nearest:'Ljubljana', note:'Vogel nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Vogel', k:'own', t:'1h'},
  'krvavec': {nearest:'Ljubljana', note:'Krvavec nema svoj aerodrom — najbliži je Ljubljana (oko 40 min vožnje).', c:'Krvavec', k:'own', t:'40 min'},
  'mangart': {nearest:'Ljubljana', note:'Mangart nema svoj aerodrom — najbliži je Ljubljana (oko 1h30 vožnje).', c:'Mangart', k:'own', t:'1h30'},
  'škofja loka': {nearest:'Ljubljana', note:'Škofja Loka nema svoj aerodrom — najbliži je Ljubljana (oko 30 min vožnje).', c:'Škofja Loka', k:'own', t:'30 min'},
  'nova gorica': {nearest:'Ljubljana', note:'Nova Gorica nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Nova Gorica', k:'own', t:'1h'},
  'jesenice': {nearest:'Ljubljana', note:'Jesenice nema svoj aerodrom — najbliži je Ljubljana (oko 40 min vožnje).', c:'Jesenice', k:'own', t:'40 min'},
  'velenje': {nearest:'Ljubljana', note:'Velenje nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Velenje', k:'own', t:'1h'},
  'čatež': {nearest:'Ljubljana', note:'Čatež nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Čatež', k:'own', t:'1h'},
  'ptuj': {nearest:'Maribor', note:'Ptuj nema svoj aerodrom — najbliži je Maribor (oko 20 min vožnje).', c:'Ptuj', k:'own', t:'20 min'},
  'terme ptuj': {nearest:'Maribor', note:'Terme Ptuj nemaju aerodrom — najbliži je Maribor (oko 20 min vožnje).', c:'Terme Ptuj', k:'plain', t:'20 min'},
  'pohorje': {nearest:'Maribor', note:'Pohorje nema svoj aerodrom — najbliži je Maribor (oko 20 min vožnje).', c:'Pohorje', k:'own', t:'20 min'},
  'slovenj gradec': {nearest:'Maribor', note:'Slovenj Gradec nema svoj aerodrom — najbliži je Maribor (oko 50 min vožnje).', c:'Slovenj Gradec', k:'own', t:'50 min'},
  'murska sobota': {nearest:'Maribor', note:'Murska Sobota nema svoj aerodrom — najbliži je Maribor (oko 1h vožnje).', c:'Murska Sobota', k:'own', t:'1h'},
  'moravske toplice': {nearest:'Maribor', note:'Moravske Toplice nemaju aerodrom — najbliži je Maribor (oko 1h vožnje).', c:'Moravske Toplice', k:'plain', t:'1h'},
  'radenci': {nearest:'Maribor', note:'Radenci nemaju aerodrom — najbliži je Maribor (oko 1h vožnje).', c:'Radenci', k:'plain', t:'1h'},
  'koper': {nearest:'Trst', note:'Koper nema svoj aerodrom — najbliži je Trst u Italiji (oko 30 min vožnje), Ljubljana je alternativa.', c:'Koper', k:'own', t:'30 min', cc:'Italiji', alt:'Ljubljana'},
  'piran': {nearest:'Trst', note:'Piran nema svoj aerodrom — najbliži je Trst u Italiji (oko 40 min vožnje), Ljubljana je alternativa.', c:'Piran', k:'own', t:'40 min', cc:'Italiji', alt:'Ljubljana'},
  'portorož': {nearest:'Trst', note:'Portorož nema svoj aerodrom — najbliži je Trst u Italiji (oko 35 min vožnje), Ljubljana je alternativa.', c:'Portorož', k:'own', t:'35 min', cc:'Italiji', alt:'Ljubljana'},
  'izola': {nearest:'Trst', note:'Izola nema svoj aerodrom — najbliži je Trst u Italiji (oko 35 min vožnje), Ljubljana je alternativa.', c:'Izola', k:'own', t:'35 min', cc:'Italiji', alt:'Ljubljana'},
  'ankaran': {nearest:'Trst', note:'Ankaran nema svoj aerodrom — najbliži je Trst u Italiji (oko 25 min vožnje), Ljubljana je alternativa.', c:'Ankaran', k:'own', t:'25 min', cc:'Italiji', alt:'Ljubljana'},
  'sečovlje': {nearest:'Trst', note:'Sečovlje nemaju svoj aerodrom — najbliži je Trst u Italiji (oko 30 min vožnje), Ljubljana je alternativa.', c:'Sečovlje', k:'own', t:'30 min', cc:'Italiji', alt:'Ljubljana'},
  'sežana': {nearest:'Trst', note:'Sežana nema svoj aerodrom — najbliži je Trst u Italiji (oko 30 min vožnje), Ljubljana je alternativa.', c:'Sežana', k:'own', t:'30 min', cc:'Italiji', alt:'Ljubljana'},
  // --- Slovenija: okolina Ljubljane i jugozapad (bez sopstvenog aerodroma) ---
  'domžale': {nearest:'Ljubljana', note:'Domžale nema svoj aerodrom — najbliži je Ljubljana (oko 15 min vožnje).', c:'Domžale', k:'own', t:'15 min'},
  'vrhnika': {nearest:'Ljubljana', note:'Vrhnika nema svoj aerodrom — najbliži je Ljubljana (oko 20 min vožnje).', c:'Vrhnika', k:'own', t:'20 min'},
  'logatec': {nearest:'Ljubljana', note:'Logatec nema svoj aerodrom — najbliži je Ljubljana (oko 30 min vožnje).', c:'Logatec', k:'own', t:'30 min'},
  'cerknica': {nearest:'Ljubljana', note:'Cerknica nema svoj aerodrom — najbliži je Ljubljana (oko 40 min vožnje).', c:'Cerknica', k:'own', t:'40 min'},
  'cerkniško jezero': {nearest:'Ljubljana', note:'Cerkniško jezero nema svoj aerodrom — najbliži je Ljubljana (oko 40 min vožnje).', c:'Cerkniško jezero', k:'own', t:'40 min'},
  'ilirska bistrica': {nearest:'Ljubljana', note:'Ilirska Bistrica nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje), Rijeka je alternativa.', c:'Ilirska Bistrica', k:'own', t:'1h', alt:'Rijeka'},
  'ajdovščina': {nearest:'Ljubljana', note:'Ajdovščina nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje), Trst je alternativa.', c:'Ajdovščina', k:'own', t:'1h', alt:'Trst'},
  'tolmin': {nearest:'Ljubljana', note:'Tolmin nema svoj aerodrom — najbliži je Ljubljana (oko 1h30 vožnje).', c:'Tolmin', k:'own', t:'1h30'},
  'radovljica': {nearest:'Ljubljana', note:'Radovljica nema svoj aerodrom — najbliži je Ljubljana (oko 40 min vožnje).', c:'Radovljica', k:'own', t:'40 min'},
  'stol': {nearest:'Ljubljana', note:'Stol nema svoj aerodrom — najbliži je Ljubljana (oko 50 min vožnje).', c:'Stol', k:'own', t:'50 min'},
  'storžič': {nearest:'Ljubljana', note:'Storžič nema svoj aerodrom — najbliži je Ljubljana (oko 45 min vožnje).', c:'Storžič', k:'own', t:'45 min'},
  'grintovec': {nearest:'Ljubljana', note:'Grintovec nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Grintovec', k:'own', t:'1h'},
  'pokljuka': {nearest:'Ljubljana', note:'Pokljuka nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Pokljuka', k:'own', t:'1h'},
  'soča': {nearest:'Ljubljana', note:'Reka Soča nema svoj aerodrom — najbliži je Ljubljana (oko 1h30 vožnje).', c:'Soča', k:'own', t:'1h30'},
  'kolpa': {nearest:'Ljubljana', note:'Reka Kolpa nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Kolpa', k:'own', t:'1h'},
  // --- Slovenija: centar, jug i Zasavje (bez sopstvenog aerodroma) ---
  'litija': {nearest:'Ljubljana', note:'Litija nema svoj aerodrom — najbliži je Ljubljana (oko 30 min vožnje).', c:'Litija', k:'own', t:'30 min'},
  'trbovlje': {nearest:'Ljubljana', note:'Trbovlje nema svoj aerodrom — najbliži je Ljubljana (oko 45 min vožnje).', c:'Trbovlje', k:'own', t:'45 min'},
  'zagorje ob savi': {nearest:'Ljubljana', note:'Zagorje ob Savi nema svoj aerodrom — najbliži je Ljubljana (oko 45 min vožnje).', c:'Zagorje ob Savi', k:'own', t:'45 min'},
  'hrastnik': {nearest:'Ljubljana', note:'Hrastnik nema svoj aerodrom — najbliži je Ljubljana (oko 50 min vožnje).', c:'Hrastnik', k:'own', t:'50 min'},
  'krško': {nearest:'Ljubljana', note:'Krško nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Krško', k:'own', t:'1h'},
  'brežice': {nearest:'Ljubljana', note:'Brežice nema svoj aerodrom — najbliži je Ljubljana (oko 1h10 vožnje), Zagreb je alternativa.', c:'Brežice', k:'own', t:'1h10', alt:'Zagreb'},
  'sevnica': {nearest:'Ljubljana', note:'Sevnica nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Sevnica', k:'own', t:'1h'},
  'trebnje': {nearest:'Ljubljana', note:'Trebnje nema svoj aerodrom — najbliži je Ljubljana (oko 45 min vožnje).', c:'Trebnje', k:'own', t:'45 min'},
  'črnomelj': {nearest:'Ljubljana', note:'Črnomelj nema svoj aerodrom — najbliži je Ljubljana (oko 1h15 vožnje), Zagreb je alternativa.', c:'Črnomelj', k:'own', t:'1h15', alt:'Zagreb'},
  'metlika': {nearest:'Ljubljana', note:'Metlika nema svoj aerodrom — najbliži je Ljubljana (oko 1h15 vožnje), Zagreb je alternativa.', c:'Metlika', k:'own', t:'1h15', alt:'Zagreb'},
  'kočevje': {nearest:'Ljubljana', note:'Kočevje nema svoj aerodrom — najbliži je Ljubljana (oko 50 min vožnje).', c:'Kočevje', k:'own', t:'50 min'},
  'ribnica': {nearest:'Ljubljana', note:'Ribnica nema svoj aerodrom — najbliži je Ljubljana (oko 40 min vožnje).', c:'Ribnica', k:'own', t:'40 min'},
  'grosuplje': {nearest:'Ljubljana', note:'Grosuplje nema svoj aerodrom — najbliži je Ljubljana (oko 20 min vožnje).', c:'Grosuplje', k:'own', t:'20 min'},
  'ivančna gorica': {nearest:'Ljubljana', note:'Ivančna Gorica nema svoj aerodrom — najbliži je Ljubljana (oko 30 min vožnje).', c:'Ivančna Gorica', k:'own', t:'30 min'},
  'rimske toplice': {nearest:'Ljubljana', note:'Rimske Toplice nemaju svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).', c:'Rimske Toplice', k:'own', t:'1h'},
  // --- Slovenija: istok (Štajerska, Koroška, Prekmurje — bez sopstvenog aerodroma) ---
  'šentjur': {nearest:'Ljubljana', note:'Šentjur nema svoj aerodrom — najbliži je Ljubljana (oko 1h10 vožnje), Maribor je alternativa.', c:'Šentjur', k:'own', t:'1h10', alt:'Maribor'},
  'rogatec': {nearest:'Maribor', note:'Rogatec nema svoj aerodrom — najbliži je Maribor (oko 50 min vožnje).', c:'Rogatec', k:'own', t:'50 min'},
  'slovenske konjice': {nearest:'Maribor', note:'Slovenske Konjice nema svoj aerodrom — najbliži je Maribor (oko 30 min vožnje).', c:'Slovenske Konjice', k:'own', t:'30 min'},
  'žalec': {nearest:'Maribor', note:'Žalec nema svoj aerodrom — najbliži je Maribor (oko 40 min vožnje), Ljubljana je alternativa.', c:'Žalec', k:'own', t:'40 min', alt:'Ljubljana'},
  'šoštanj': {nearest:'Ljubljana', note:'Šoštanj nema svoj aerodrom — najbliži je Ljubljana (oko 1h20 vožnje), Maribor je alternativa.', c:'Šoštanj', k:'own', t:'1h20', alt:'Maribor'},
  'mozirje': {nearest:'Ljubljana', note:'Mozirje nema svoj aerodrom — najbliži je Ljubljana (oko 1h10 vožnje).', c:'Mozirje', k:'own', t:'1h10'},
  'topolšica': {nearest:'Ljubljana', note:'Topolšica nema svoj aerodrom — najbliži je Ljubljana (oko 1h20 vožnje), Maribor je alternativa.', c:'Topolšica', k:'own', t:'1h20', alt:'Maribor'},
  'golte': {nearest:'Ljubljana', note:'Golte nema svoj aerodrom — najbliži je Ljubljana (oko 1h10 vožnje), Maribor je alternativa.', c:'Golte', k:'own', t:'1h10', alt:'Maribor'},
  'podčetrtek': {nearest:'Maribor', note:'Podčetrtek nema svoj aerodrom — najbliži je Maribor (oko 50 min vožnje), Ljubljana je alternativa.', c:'Podčetrtek', k:'own', t:'50 min', alt:'Ljubljana'},
  'rogla': {nearest:'Maribor', note:'Rogla nema svoj aerodrom — najbliži je Maribor (oko 40 min vožnje).', c:'Rogla', k:'own', t:'40 min'},
  'slovenska bistrica': {nearest:'Maribor', note:'Slovenska Bistrica nema svoj aerodrom — najbliži je Maribor (oko 20 min vožnje).', c:'Slovenska Bistrica', k:'own', t:'20 min'},
  'ruše': {nearest:'Maribor', note:'Ruše nema svoj aerodrom — najbliži je Maribor (oko 15 min vožnje).', c:'Ruše', k:'own', t:'15 min'},
  'dravograd': {nearest:'Maribor', note:'Dravograd nema svoj aerodrom — najbliži je Maribor (oko 1h vožnje).', c:'Dravograd', k:'own', t:'1h'},
  'ravne na koroškem': {nearest:'Maribor', note:'Ravne na Koroškem nema svoj aerodrom — najbliži je Maribor (oko 50 min vožnje).', c:'Ravne na Koroškem', k:'own', t:'50 min'},
  'mislinja': {nearest:'Maribor', note:'Mislinja nema svoj aerodrom — najbliži je Maribor (oko 40 min vožnje).', c:'Mislinja', k:'own', t:'40 min'},
  'prevalje': {nearest:'Maribor', note:'Prevalje nema svoj aerodrom — najbliži je Maribor (oko 55 min vožnje).', c:'Prevalje', k:'own', t:'55 min'},
  'črna na koroškem': {nearest:'Maribor', note:'Črna na Koroškem nema svoj aerodrom — najbliži je Maribor (oko 1h vožnje).', c:'Črna na Koroškem', k:'own', t:'1h'},
  'šmarje pri jelšah': {nearest:'Maribor', note:'Šmarje pri Jelšah nema svoj aerodrom — najbliži je Maribor (oko 50 min vožnje).', c:'Šmarje pri Jelšah', k:'own', t:'50 min'},
  'gornja radgona': {nearest:'Maribor', note:'Gornja Radgona nema svoj aerodrom — najbliži je Maribor (oko 40 min vožnje).', c:'Gornja Radgona', k:'own', t:'40 min'},
  'lendava': {nearest:'Maribor', note:'Lendava nema svoj aerodrom — najbliži je Maribor (oko 1h vožnje).', c:'Lendava', k:'own', t:'1h'},
  'ljutomer': {nearest:'Maribor', note:'Ljutomer nema svoj aerodrom — najbliži je Maribor (oko 30 min vožnje).', c:'Ljutomer', k:'own', t:'30 min'},
  'ormož': {nearest:'Maribor', note:'Ormož nema svoj aerodrom — najbliži je Maribor (oko 30 min vožnje).', c:'Ormož', k:'own', t:'30 min'},
  // --- Mađarska (relevantno za sever Srbije) ---
  'budimpesta': {hasAirport:true},
  'segedin': {nearest:'Budimpešta', note:'Segedin nema svoj aerodrom — najbliži je Budimpešta (oko 2h vožnje).', c:'Segedin', k:'own', t:'2h'},
  // --- Turska: aerodromi ---
  'istanbul': {hasAirport:true},
  'ankara': {hasAirport:true},
  'izmir': {hasAirport:true},
  'antalija': {hasAirport:true},
  'bodrum': {hasAirport:true},
  'kajseri': {hasAirport:true},
  'adana': {hasAirport:true},
  'gaziantep': {hasAirport:true},
  'trabzon': {hasAirport:true},
  'samsun': {hasAirport:true},
  'konja': {hasAirport:true},
  'denizli': {hasAirport:true},
  'malatja': {hasAirport:true},
  'eskišehir': {hasAirport:true, limited:true},
  'bursa': {hasAirport:true, limited:true},
  'dalaman': {hasAirport:true, limited:true},
  'canakkale': {hasAirport:true, limited:true},
  'sanliurfa': {hasAirport:true, limited:true},
  'nevsehir': {hasAirport:true, limited:true},
  'van': {hasAirport:true, limited:true},
  'dijarbakir': {hasAirport:true, limited:true},
  'erzurum': {hasAirport:true, limited:true},
  'sivas': {hasAirport:true, limited:true},
  'gazipasa': {hasAirport:true, limited:true},
  // --- Turska: bez sopstvenog aerodroma ---
  'mersin': {nearest:'Adana', note:'Mersin nema svoj aerodrom — najbliži je Adana (oko 1h vožnje).', c:'Mersin', k:'own', t:'1h'},
  'kapadokija': {nearest:'Nevsehir'},
  'marmaris': {nearest:'Dalaman', note:'Marmaris nema svoj aerodrom — najbliži je Dalaman (oko 1h vožnje).', c:'Marmaris', k:'own', t:'1h'},
  'fetije': {nearest:'Dalaman', note:'Fetije nema svoj aerodrom — najbliži je Dalaman (oko 50 min vožnje).', c:'Fetije', k:'own', t:'50 min'},
  'side': {nearest:'Antalija', note:'Side nema svoj aerodrom — najbliži je Antalija (oko 1h vožnje).', c:'Side', k:'own', t:'1h'},
  'alanja': {nearest:'Antalija'},
  'kušadasi': {nearest:'Izmir', note:'Kušadasi nema svoj aerodrom — najbliži je Izmir (oko 1h30 vožnje).', c:'Kušadasi', k:'own', t:'1h30'},
  'česme': {nearest:'Izmir', note:'Česme nema svoj aerodrom — najbliži je Izmir (oko 1h vožnje).', c:'Česme', k:'own', t:'1h'},
  'pamukale': {nearest:'Denizli', note:'Pamukale nema svoj aerodrom — najbliži je Denizli (oko 30 min vožnje).', c:'Pamukale', k:'own', t:'30 min'},
  'jalova': {nearest:'Istanbul'},
  'afjon karahisar': {nearest:'Ankara', note:'Afjon Karahisar nema veći aerodrom — najbliži je Ankara (oko 3h vožnje).', c:'Afjon Karahisar', k:'major', t:'3h'},
  'haymana': {nearest:'Ankara', note:'Haymana nema svoj aerodrom — najbliži je Ankara (oko 1h vožnje).', c:'Haymana', k:'own', t:'1h'},
  'kizildžahamam': {nearest:'Ankara', note:'Kizildžahamam nema svoj aerodrom — najbliži je Ankara (oko 1h vožnje).', c:'Kizildžahamam', k:'own', t:'1h'},
  'efes': {nearest:'Izmir', note:'Efes nema svoj aerodrom — najbliži je Izmir (oko 1h vožnje).', c:'Efes', k:'own', t:'1h'},
  'troja': {nearest:'Canakkale', note:'Troja nema svoj aerodrom — najbliži je Čanakale (oko 30 min vožnje).', c:'Troja', k:'own', t:'30 min', nn:'Čanakale'},
  'pergamon': {nearest:'Izmir', note:'Pergamon nema svoj aerodrom — najbliži je Izmir (oko 1h30 vožnje).', c:'Pergamon', k:'own', t:'1h30'},
  'hijerapolis': {nearest:'Denizli', note:'Hijerapolis nema svoj aerodrom — najbliži je Denizli (oko 30 min vožnje).', c:'Hijerapolis', k:'own', t:'30 min'},
  'sumela': {nearest:'Trabzon', note:'Sumela nema svoj aerodrom — najbliži je Trabzon (oko 1h vožnje).', c:'Sumela', k:'own', t:'1h'},
  'nemrut': {nearest:'Malatja', note:'Nemrut nema svoj aerodrom — najbliži je Malatja (oko 2h vožnje).', c:'Nemrut', k:'own', t:'2h'},
  'safranbolu': {nearest:'Ankara', note:'Safranbolu nema veći aerodrom — najbliži je Ankara (oko 3h vožnje).', c:'Safranbolu', k:'major', t:'3h'},
  'gjobekli tepe': {nearest:'Sanliurfa', note:'Gjobekli Tepe nema svoj aerodrom — najbliži je Šanlıurfa (oko 1h vožnje), Gaziantep je alternativa.', c:'Gjobekli Tepe', k:'own', t:'1h', nn:'Šanlıurfa', alt:'Gaziantep'},
  'kaš': {nearest:'Dalaman', note:'Kaš nema svoj aerodrom — najbliži je Dalaman (oko 2h vožnje).', c:'Kaš', k:'own', t:'2h'},
  'kalkan': {nearest:'Dalaman', note:'Kalkan nema svoj aerodrom — najbliži je Dalaman (oko 1h30 vožnje).', c:'Kalkan', k:'own', t:'1h30'},
  'datča': {nearest:'Dalaman', note:'Datča nema svoj aerodrom — najbliži je Dalaman (oko 1h30 vožnje).', c:'Datča', k:'own', t:'1h30'},
  'didim': {nearest:'Izmir', note:'Didim nema svoj aerodrom — najbliži je Izmir (oko 2h vožnje).', c:'Didim', k:'own', t:'2h'},
  'ajvalik': {nearest:'Izmir', note:'Ajvalik nema svoj aerodrom — najbliži je Izmir (oko 2h vožnje).', c:'Ajvalik', k:'own', t:'2h'},
  'silifke': {nearest:'Adana', note:'Silifke nema svoj aerodrom — najbliži je Adana (oko 2h vožnje).', c:'Silifke', k:'own', t:'2h'},
  'kusadasi': {nearest:'Izmir', note:'Kušadasi nema svoj aerodrom — najbliži je Izmir (oko 1h15 vožnje).', c:'Kušadasi', k:'own', t:'1h15'},
  'cesme': {nearest:'Izmir', note:'Česme nema svoj aerodrom — najbliži je Izmir (oko 1h vožnje).', c:'Česme', k:'own', t:'1h'},
  'eskisehir': {hasAirport:true, limited:true},
  'kizildzahamam': {nearest:'Ankara', note:'Kizildžahamam nema svoj aerodrom — najbliži je Ankara (oko 1h vožnje).', c:'Kizildžahamam', k:'own', t:'1h'},
  'kas': {nearest:'Dalaman', note:'Kaš nema svoj aerodrom — najbliži je Dalaman (oko 2h vožnje), Antalija je alternativa.', c:'Kaš', k:'own', t:'2h', alt:'Antalija'},
  'datca': {nearest:'Dalaman', note:'Datča nema svoj aerodrom — najbliži je Dalaman (oko 1h45 vožnje).', c:'Datča', k:'own', t:'1h45'},
  'foča (turska)': {nearest:'Izmir', note:'Foča nema svoj aerodrom — najbliži je Izmir (oko 1h vožnje).', c:'Foča', k:'own', t:'1h'},
  // --- Turska: ski centri ---
  'uludag': {nearest:'Bursa', note:'Uludağ ski centar — najbliži aerodrom Bursa (oko 1h), ili Istanbul (oko 3h). Najpoznatije tursko skijalište, direktno iznad Burse žičarom.', c:'Uludağ', k:'own', t:'1h'},
  'kartalkaja': {nearest:'Ankara', note:'Kartalkaya ski centar (Bolu) — oko 3h od Ankare ili Istanbula. Nema sopstvenog aerodroma.', c:'Kartalkaya', k:'own', t:'3h'},
  'palandoken': {nearest:'Erzurum', note:'Palandöken ski centar — neposredno uz Erzurum, aerodrom je udaljen svega 4 km. Direktnih letova iz Srbije nema — presedanje u Istanbulu.', c:'Palandöken', k:'own', t:'15 min'},
  'ercijes': {nearest:'Kajseri', note:'Erciyes ski centar — neposredno uz Kayseri, aerodrom je udaljen oko 25 km. Iz Srbije presedanje u Istanbulu.', c:'Erciyes', k:'own', t:'25 min'},
  'saklikent': {nearest:'Antalija', note:'Saklıkent ski centar — oko 1h od antalijskog aerodroma. Jedinstven zbog blizine mora — ski i more isti dan.', c:'Saklıkent', k:'own', t:'1h'},
  // --- Turska: jezera i reke ---
  'jezero van': {nearest:'Van', note:'Jezero Van — aerodrom Van je direktno uz jezero. Direktnih letova iz Srbije nema — presedanje u Istanbulu.', c:'Jezero Van', k:'own', t:'15 min'},
  'jezero tuz': {nearest:'Ankara', note:'Jezero Tuz (slano) — oko 1h30min od Ankare. Nema aerodroma u blizini.', c:'Jezero Tuz', k:'own', t:'1h30'},
  'jezero bejsehir': {nearest:'Konja', note:'Jezero Beyşehir — oko 1h od Konje. Nema aerodroma u blizini.', c:'Jezero Beyşehir', k:'own', t:'1h'},
  'jezero egirdir': {nearest:'Antalija', note:'Jezero Eğirdir — oko 2h30min od Antalije ili Denizlija.', c:'Jezero Eğirdir', k:'own', t:'2h30'},
  'reka manavgat': {nearest:'Antalija', note:'Reka Manavgat i vodopad — oko 1h od Antalije. Popularna izletnička tačka tokom letnjih charter paketa.', c:'Manavgat', k:'own', t:'1h'},
  'reka daljan': {nearest:'Dalaman', note:'Reka Dalyan — oko 30 min od Dalamana. Popularna tačka uz Marmaris i Fetije paketiće.', c:'Dalyan', k:'own', t:'30 min'},
  // --- Turska: istok i unutrašnjost ---
  'dogubayazit': {nearest:'Agri', note:'Doğubayazıt (planina Ağrı/Ararat) — najbliži aerodrom Ağrı (oko 35 km). Direktnih letova iz Srbije nema.', c:'Doğubayazıt', k:'own', t:'35 min'},
  'diyarbakir': {nearest:'Dijarbakir', note:'Diyarbakır ima sopstveni aerodrom sa letovima iz Istanbula. Direktnih letova iz Srbije nema.', c:'Diyarbakır', k:'sched', t:'1h iz IST'},
  'şanliurfa': {nearest:'Sanliurfa', note:'Şanlıurfa ima aerodrom sa letovima iz Istanbula. Polazna tačka za Göbekli Tepe.', c:'Şanlıurfa', k:'sched', t:'1h iz IST'},
  // --- Portugalija: aerodromi ---
  'lisabon': {hasAirport:true},
  'porto': {hasAirport:true},
  'faro': {hasAirport:true},
  'madeira': {hasAirport:true},
  'azori': {hasAirport:true, limited:true},
  'tersejra': {hasAirport:true, limited:true},
  // --- Portugalija: bez sopstvenog aerodroma ---
  'koimbra': {nearest:'Porto', note:'Koimbra nema svoj aerodrom — najbliži je Porto (oko 1h vožnje), Lisabon je alternativa.', c:'Koimbra', k:'own', t:'1h', alt:'Lisabon'},
  'braga': {nearest:'Porto', note:'Braga nema svoj aerodrom — najbliži je Porto (oko 50 min vožnje).', c:'Braga', k:'own', t:'50 min'},
  'sintra': {nearest:'Lisabon', note:'Sintra nema svoj aerodrom — najbliži je Lisabon (oko 30 min vožnje).', c:'Sintra', k:'own', t:'30 min'},
  'albufeira': {nearest:'Faro', note:'Albufeira nema svoj aerodrom — najbliži je Faro (oko 40 min vožnje).', c:'Albufeira', k:'own', t:'40 min'},
  'evora': {nearest:'Lisabon', note:'Evora nema svoj aerodrom — najbliži je Lisabon (oko 1h30 vožnje).', c:'Evora', k:'own', t:'1h30'},
  'kaskais': {nearest:'Lisabon', note:'Kaskais nema svoj aerodrom — najbliži je Lisabon (oko 30 min vožnje).', c:'Kaskais', k:'own', t:'30 min'},
  'nazare': {nearest:'Lisabon', note:'Nazare nema svoj aerodrom — najbliži je Lisabon (oko 1h30 vožnje).', c:'Nazare', k:'own', t:'1h30'},
  'fatima': {nearest:'Lisabon', note:'Fatima nema svoj aerodrom — najbliži je Lisabon (oko 1h30 vožnje), Porto je alternativa.', c:'Fatima', k:'own', t:'1h30', alt:'Porto'},
  'aveiro': {nearest:'Porto', note:'Aveiro nema svoj aerodrom — najbliži je Porto (oko 1h vožnje).', c:'Aveiro', k:'own', t:'1h'},
  'guimaraes': {nearest:'Porto', note:'Guimarães nema svoj aerodrom — najbliži je Porto (oko 50 min vožnje).', c:'Guimarães', k:'own', t:'50 min'},
  'setubal': {nearest:'Lisabon', note:'Setúbal nema svoj aerodrom — najbliži je Lisabon (oko 45 min vožnje).', c:'Setúbal', k:'own', t:'45 min'},
  'viseu': {nearest:'Porto', note:'Viseu nema svoj aerodrom — najbliži je Porto (oko 1h30 vožnje), Koimbra je alternativa.', c:'Viseu', k:'own', t:'1h30', alt:'Koimbra'},
  'obidos': {nearest:'Lisabon', note:'Óbidos nema svoj aerodrom — najbliži je Lisabon (oko 1h vožnje).', c:'Óbidos', k:'own', t:'1h'},
  'tomar': {nearest:'Lisabon', note:'Tomar nema svoj aerodrom — najbliži je Lisabon (oko 1h30 vožnje), Koimbra je alternativa.', c:'Tomar', k:'own', t:'1h30', alt:'Koimbra'},
  'elvas': {nearest:'Lisabon', note:'Elvas nema svoj aerodrom — najbliži je Lisabon (oko 2h vožnje).', c:'Elvas', k:'own', t:'2h'},
  'marvao': {nearest:'Lisabon', note:'Marvão nema svoj aerodrom — najbliži je Lisabon (oko 2h vožnje).', c:'Marvão', k:'own', t:'2h'},
  'monsaraz': {nearest:'Faro', note:'Monsaraz nema svoj aerodrom — najbliži je Faro (oko 2h vožnje), Lisabon je alternativa.', c:'Monsaraz', k:'own', t:'2h', alt:'Lisabon'},
  'caldas da rainha': {nearest:'Lisabon', note:'Caldas da Rainha nema svoj aerodrom — najbliži je Lisabon (oko 1h vožnje).', c:'Caldas da Rainha', k:'own', t:'1h'},
  'termas de sao pedro do sul': {nearest:'Porto', note:'Termas de São Pedro do Sul nemaju aerodrom — najbliži je Porto (oko 1h30 vožnje).', c:'Termas de São Pedro do Sul', k:'own', t:'1h30'},
  'caldas do geres': {nearest:'Porto', note:'Caldas do Gerês nemaju aerodrom — najbliži je Porto (oko 1h30 vožnje).', c:'Caldas do Gerês', k:'own', t:'1h30'},
  'monfortinho': {nearest:'Lisabon', note:'Monfortinho nema svoj aerodrom — najbliži je Lisabon (oko 3h vožnje).', c:'Monfortinho', k:'own', t:'3h'},
  'serra da estrela': {nearest:'Koimbra', note:'Serra da Estrela nema aerodrom u blizini — najbliži je Koimbra (oko 1h30 vožnje).', c:'Serra da Estrela', k:'nearby', t:'1h30'},
  'peneda-geres': {nearest:'Porto', note:'Peneda-Gerês nema aerodrom u blizini — najbliži je Porto (oko 1h30 vožnje).', c:'Peneda-Gerês', k:'nearby', t:'1h30'},
  'monchique': {nearest:'Faro', note:'Monchique nema svoj aerodrom — najbliži je Faro (oko 1h vožnje).', c:'Monchique', k:'own', t:'1h'},
  'ericeira': {nearest:'Lisabon', note:'Ericeira nema svoj aerodrom — najbliži je Lisabon (oko 40 min vožnje).', c:'Ericeira', k:'own', t:'40 min'},
  'peniche': {nearest:'Lisabon', note:'Peniche nema svoj aerodrom — najbliži je Lisabon (oko 1h15 vožnje).', c:'Peniche', k:'own', t:'1h15'},
  // NAPOMENA: 'lagos (nigerija)' MORA stajati PRE portugalskog 'lagos' unosa —
  // inače airportInfoFor() pogrešno uhvati "Lagos (Nigerija)" preko
  // startsWith('lagos ') na portugalskom ključu i vrati Faro umesto sopstvenog
  // aerodroma u Lagosu (Nigerija).
  'lagos (nigerija)': {hasAirport:true},
  'lagos': {nearest:'Faro', note:'Lagos nema svoj aerodrom — najbliži je Faro (oko 1h vožnje).', c:'Lagos', k:'own', t:'1h'},
  'portimao': {nearest:'Faro', note:'Portimão nema svoj aerodrom — najbliži je Faro (oko 40 min vožnje).', c:'Portimão', k:'own', t:'40 min'},
  'tavira': {nearest:'Faro', note:'Tavira nema svoj aerodrom — najbliži je Faro (oko 30 min vožnje).', c:'Tavira', k:'own', t:'30 min'},
  'vilamoura': {nearest:'Faro', note:'Vilamoura nema svoj aerodrom — najbliži je Faro (oko 25 min vožnje).', c:'Vilamoura', k:'own', t:'25 min'},
  'sesimbra': {nearest:'Lisabon', note:'Sesimbra nema svoj aerodrom — najbliži je Lisabon (oko 40 min vožnje).', c:'Sesimbra', k:'own', t:'40 min'},
  'costa da caparica': {nearest:'Lisabon', note:'Costa da Caparica nema svoj aerodrom — najbliži je Lisabon (oko 30 min vožnje).', c:'Costa da Caparica', k:'own', t:'30 min'},
  'alqueva': {nearest:'Faro', note:'Alqueva nema aerodrom u blizini — najbliži je Faro (oko 1h30 vožnje), Lisabon je alternativa.', c:'Alqueva', k:'nearby', t:'1h30', alt:'Lisabon'},
  'jezero sedam gradova': {nearest:'Azori', note:'Jezero Sedam Gradova nema aerodrom u blizini — najbliži je aerodrom na Azorima, Ponta Delgada (oko 30 min vožnje).', c:'Jezero Sedam Gradova', k:'nearby', t:'30 min'},
  'jezero furnas': {nearest:'Azori', note:'Jezero Furnas nema aerodrom u blizini — najbliži je aerodrom na Azorima, Ponta Delgada (oko 45 min vožnje).', c:'Jezero Furnas', k:'nearby', t:'45 min'},
  // --- Francuska: aerodromi ---
  'pariz': {hasAirport:true},
  'nica': {hasAirport:true},
  'lion': {hasAirport:true},
  'bordo': {hasAirport:true},
  'marselj': {hasAirport:true},
  // --- Velika Britanija: aerodromi ---
  'london': {hasAirport:true},
  'edinburg': {hasAirport:true},
  'mancester': {hasAirport:true},
  'liverpul': {hasAirport:true, limited:true},
  // --- Holandija: aerodromi ---
  'amsterdam': {hasAirport:true},
  'roterdam': {hasAirport:true, limited:true},
  // --- Nemačka: aerodromi ---
  'berlin': {hasAirport:true},
  'minhen': {hasAirport:true},
  'hamburg': {hasAirport:true},
  'frankfurt': {hasAirport:true},
  'keln': {hasAirport:true},
  'diseldorf': {hasAirport:true},
  'stutgart': {hasAirport:true},
  'drezden': {hasAirport:true, limited:true},
  // --- Poljska: aerodromi ---
  'varsava': {hasAirport:true},
  'krakov': {hasAirport:true},
  'vroclav': {hasAirport:true},
  'gdanjsk': {hasAirport:true},
  'poznanj': {hasAirport:true, limited:true},
  'lodj': {hasAirport:true, limited:true},
  'katovice': {hasAirport:true, limited:true},
  'zesuv': {hasAirport:true, limited:true},
  'scecin': {hasAirport:true, limited:true},
  'bidgosc': {hasAirport:true, limited:true},
  'lublin': {hasAirport:true, limited:true},
  'olstin': {hasAirport:true, limited:true},
  // --- Poljska: bez sopstvenog aerodroma ---
  'zakopane': {nearest:'Krakov', note:'Zakopane nema svoj aerodrom — najbliži je Krakov (oko 2h vožnje).', c:'Zakopane', k:'own', t:'2h'},
  'torunj': {nearest:'Bidgosc', note:'Torunj nema svoj aerodrom — najbliži je Bidgošć (oko 45 min vožnje), Poznanj je alternativa.', c:'Torunj', k:'own', t:'45 min', nn:'Bidgošć', alt:'Poznanj'},
  'vjelicka': {nearest:'Krakov', note:'Vjelička nema svoj aerodrom — najbliži je Krakov (oko 20 min vožnje).', c:'Vjelička', k:'own', t:'20 min'},
  'gdinja': {nearest:'Gdanjsk'},
  'censtohova': {nearest:'Katovice', note:'Čenstohova nema svoj aerodrom — najbliži je Katovice (oko 1h vožnje).', c:'Čenstohova', k:'own', t:'1h'},
  'zelena gora': {nearest:'Poznanj', note:'Zelena Gora ima aerodrom ali bez redovnih letova — najbliži je Poznanj (oko 1h30 vožnje).', c:'Zelena Gora', k:'sched', t:'1h30'},
  'bjalistok': {nearest:'Varsava', note:'Bjalistok nema svoj aerodrom — najbliži je Varšava (oko 2h vožnje).', c:'Bjalistok', k:'own', t:'2h'},
  'kalis': {nearest:'Poznanj', note:'Kališ nema svoj aerodrom — najbliži je Poznanj (oko 1h30 vožnje), Lođ je alternativa.', c:'Kališ', k:'own', t:'1h30', alt:'Lođ'},
  'krinica zdruj': {nearest:'Krakov', note:'Krinica Zdruj nema svoj aerodrom — najbliži je Krakov (oko 2h vožnje).', c:'Krinica Zdruj', k:'own', t:'2h'},
  'kudova zdruj': {nearest:'Vroclav', note:'Kudova Zdruj nema svoj aerodrom — najbliži je Vroclav (oko 1h30 vožnje).', c:'Kudova Zdruj', k:'own', t:'1h30'},
  'poljanica zdruj': {nearest:'Vroclav', note:'Poljanica Zdruj nema svoj aerodrom — najbliži je Vroclav (oko 1h30 vožnje).', c:'Poljanica Zdruj', k:'own', t:'1h30'},
  'cechocinek': {nearest:'Bidgosc', note:'Čechocinek nema svoj aerodrom — najbliži je Bidgošć (oko 15 min vožnje).', c:'Čechocinek', k:'own', t:'15 min'},
  'nalecov': {nearest:'Lublin', note:'Naleczov nema svoj aerodrom — najbliži je Lublin (oko 25 min vožnje).', c:'Naleczov', k:'own', t:'25 min'},
  'karkonose': {nearest:'Vroclav', note:'Karkonoše (poljska strana) nemaju aerodrom u blizini — najbliži je Vroclav (oko 1h30 vožnje).', c:'Karkonoše', k:'nearby', t:'1h30'},
  'bescadi': {nearest:'Zesuv', note:'Beščadi nemaju aerodrom u blizini — najbliži je Žešuv (oko 1h30 vožnje).', c:'Beščadi', k:'nearby', t:'1h30'},
  'mazurska jezera': {nearest:'Olstin', note:'Mazurska jezera nemaju aerodrom u samom regionu — najbliži je Olštin (oko 1h vožnje), sa ograničenom mrežom letova.', c:'Mazurska Jezera', k:'nearby', t:'1h'},
  'ausvic-birkenau': {nearest:'Krakov', note:'Aušvic-Birkenau nema aerodrom u blizini — najbliži je Krakov (oko 1h vožnje).', c:'Aušvic-Birkenau', k:'nearby', t:'1h'},
  'malburk': {nearest:'Gdanjsk', note:'Malburk nema svoj aerodrom — najbliži je Gdanjsk (oko 1h vožnje).', c:'Malburk', k:'own', t:'1h'},
  'bjalovjeska suma': {nearest:'Varsava', note:'Bjalovješka šuma nema aerodrom u blizini — najbliži je Varšava (oko 2h30 vožnje).', c:'Bjalovješka Šuma', k:'nearby', t:'2h30'},
  'sopot': {nearest:'Gdanjsk'},
  'kolobzeg': {nearest:'Scecin', note:'Kolobžeg nema aerodrom u blizini — najbliži je Ščećin (oko 1h30 vožnje).', c:'Kolobžeg', k:'nearby', t:'1h30'},
  'hel': {nearest:'Gdanjsk', note:'Hel nema aerodrom u blizini — najbliži je Gdanjsk (oko 1h30 vožnje).', c:'Hel', k:'nearby', t:'1h30'},
  'ustka': {nearest:'Scecin', note:'Ustka nema aerodrom u blizini — najbliži je Ščećin (oko 2h vožnje), Gdanjsk je alternativa.', c:'Ustka', k:'nearby', t:'2h', alt:'Gdanjsk'},
  // --- Češka: aerodromi ---
  'prag': {hasAirport:true},
  'brno': {hasAirport:true, limited:true},
  'karlovi vari': {hasAirport:true, limited:true},
  'ostrava': {hasAirport:true, limited:true},
  // --- Češka: bez sopstvenog aerodroma ---
  'plzenj': {nearest:'Prag', note:'Plzenj nema komercijalni aerodrom — najbliži je Prag (oko 1h vožnje).', c:'Plzenj', k:'comm', t:'1h'},
  'ceski krumlov': {nearest:'Linc'},
  'olomouc': {nearest:'Ostrava', note:'Olomouc nema svoj aerodrom — najbliži je Ostrava (oko 40 min vožnje), Brno je alternativa.', c:'Olomouc', k:'own', t:'40 min', alt:'Brno'},
  'kutna hora': {nearest:'Prag', note:'Kutna Hora nema svoj aerodrom — najbliži je Prag (oko 1h vožnje).', c:'Kutna Hora', k:'own', t:'1h'},
  'ceske budejovice': {nearest:'Prag', note:'Češke Budejovice nemaju svoj aerodrom sa redovnim letovima — najbliži je Prag (oko 2h vožnje), Linc je alternativa.', c:'Češke Budejovice', k:'sched', t:'2h', alt:'Linc'},
  'hradec kralove': {nearest:'Prag', note:'Hradec Kralove nema svoj aerodrom — najbliži je Prag (oko 1h30 vožnje).', c:'Hradec Kralove', k:'own', t:'1h30'},
  'liberec': {nearest:'Prag', note:'Liberec nema svoj aerodrom — najbliži je Prag (oko 1h30 vožnje).', c:'Liberec', k:'own', t:'1h30'},
  'pardubice': {nearest:'Prag', note:'Pardubice nemaju svoj aerodrom sa redovnim letovima — najbliži je Prag (oko 1h vožnje).', c:'Pardubice', k:'sched', t:'1h'},
  'zlin': {nearest:'Brno', note:'Zlin nema svoj aerodrom sa redovnim letovima — najbliži je Brno (oko 1h vožnje).', c:'Zlin', k:'sched', t:'1h'},
  'telc': {nearest:'Brno', note:'Telč nema svoj aerodrom — najbliži je Brno (oko 1h vožnje), Prag je alternativa.', c:'Telč', k:'own', t:'1h', alt:'Prag'},
  'mikulov': {nearest:'Brno', note:'Mikulov nema svoj aerodrom — najbliži je Brno (oko 45 min vožnje).', c:'Mikulov', k:'own', t:'45 min'},
  'kromeriz': {nearest:'Brno', note:'Kroměříž nema svoj aerodrom — najbliži je Brno (oko 1h vožnje).', c:'Kroměříž', k:'own', t:'1h'},
  'litomysl': {nearest:'Prag', note:'Litomyšl nema svoj aerodrom — najbliži je Prag (oko 2h vožnje).', c:'Litomyšl', k:'own', t:'2h'},
  'terezin': {nearest:'Prag', note:'Terezin nema svoj aerodrom — najbliži je Prag (oko 1h vožnje).', c:'Terezin', k:'own', t:'1h'},
  'marianske lazne': {nearest:'Prag', note:'Mariánske Lazne nemaju svoj aerodrom — najbliži je Prag (oko 2h vožnje), Karlovi Vari su alternativa.', c:'Mariánske Lazne', k:'own', t:'2h', alt:'Karlovi Vari'},
  'frantiskove lazne': {nearest:'Karlovi Vari', note:'Františkove Lazne nemaju svoj aerodrom — najbliži je Karlovi Vari (oko 30 min vožnje).', c:'Františkove Lazne', k:'own', t:'30 min'},
  'luhacovice': {nearest:'Brno', note:'Luhačovice nemaju svoj aerodrom — najbliži je Brno (oko 1h30 vožnje).', c:'Luhačovice', k:'own', t:'1h30'},
  'krkonose': {nearest:'Prag', note:'Krkonoše nemaju aerodrom u blizini — najbliži je Prag (oko 2h vožnje), Liberec je polazna tačka.', c:'Krkonoše', k:'nearby', t:'2h'},
  'sumava': {nearest:'Prag', note:'Šumava nema aerodrom u blizini — najbliži je Prag (oko 2h vožnje), Linc je alternativa.', c:'Šumava', k:'nearby', t:'2h', alt:'Linc'},
  'jeseniky': {nearest:'Ostrava', note:'Jeseniky nemaju aerodrom u blizini — najbliži je Ostrava (oko 1h vožnje).', c:'Jeseniky', k:'nearby', t:'1h'},
  'lipno jezero': {nearest:'Prag', note:'Lipno jezero nema aerodrom u blizini — najbliži je Prag (oko 2h30 vožnje), Linc je alternativa.', c:'Lipno jezero', k:'nearby', t:'2h30', alt:'Linc'},
  'macha jezero': {nearest:'Prag', note:'Mácha jezero nema aerodrom u blizini — najbliži je Prag (oko 1h vožnje).', c:'Mácha jezero', k:'nearby', t:'1h'},
  'konopiste dvorac': {nearest:'Prag', note:'Konopište dvorac nema svoj aerodrom — najbliži je Prag (oko 45 min vožnje).', c:'Konopište dvorac', k:'own', t:'45 min'},
  'karlstejn dvorac': {nearest:'Prag', note:'Karlštejn dvorac nema svoj aerodrom — najbliži je Prag (oko 30 min vožnje).', c:'Karlštejn dvorac', k:'own', t:'30 min'},
  // --- Švedska: aerodromi ---
  'stokholm': {hasAirport:true},
  'geteborg': {hasAirport:true},
  // --- Švajcarska: aerodromi ---
  'cirih': {hasAirport:true},
  'zeneva': {hasAirport:true},
  // --- Norveška: aerodromi ---
  'oslo': {hasAirport:true},
  // --- Danska: aerodromi ---
  'kopenhagen': {hasAirport:true},
  // --- Finska: aerodromi ---
  'helsinki': {hasAirport:true},
  // --- Irska: aerodromi ---
  'dablin': {hasAirport:true},
  'kork': {hasAirport:true},
  'senon': {hasAirport:true, limited:true},
  // --- Belgija: aerodromi ---
  'brisel': {hasAirport:true},
  'antverpen': {hasAirport:true, limited:true},
  'sarlroa': {hasAirport:true, limited:true},
  'lijez': {hasAirport:true, limited:true},
  'ostende': {hasAirport:true, limited:true},
  // --- Belgija: bez sopstvenog aerodroma ---
  'briz': {nearest:'Brisel', note:'Briž nema svoj aerodrom — najbliži je Brisel (oko 1h vožnje).', c:'Briž', k:'own', t:'1h'},
  'gent': {nearest:'Brisel', note:'Gent nema svoj aerodrom — najbliži je Brisel (oko 45 min vožnje).', c:'Gent', k:'own', t:'45 min'},
  'namir': {nearest:'Šarlroa', note:'Namir nema svoj aerodrom — najbliži je Šarlroa (oko 45 min vožnje).', c:'Namir', k:'own', t:'45 min'},
  // --- Grčka: aerodromi ---
  'atina': {hasAirport:true},
  'solun': {hasAirport:true},
  'krf': {hasAirport:true},
  'rodos': {hasAirport:true},
  'krit': {hasAirport:true},
  'kos': {hasAirport:true},
  'iraklion': {hasAirport:true},
  'santorini': {hasAirport:true, limited:true},
  'mikonos': {hasAirport:true, limited:true},
  'zakintos': {hasAirport:true, limited:true},
  'kefalonija': {hasAirport:true, limited:true},
  'paros': {hasAirport:true, limited:true},
  'naksos': {hasAirport:true, limited:true},
  'kavala': {hasAirport:true, limited:true},
  'janjina': {hasAirport:true, limited:true},
  'kalamata': {hasAirport:true, limited:true},
  'samos': {hasAirport:true, limited:true},
  'hios': {hasAirport:true, limited:true},
  'skijatos': {hasAirport:true, limited:true},
  'milos': {hasAirport:true, limited:true},
  'aleksandrupolj': {hasAirport:true, limited:true},
  'kozani': {hasAirport:true, limited:true},
  'kastorija': {hasAirport:true, limited:true},
  'siros': {hasAirport:true, limited:true},
  'kalimnos': {hasAirport:true, limited:true},
  'leros': {hasAirport:true, limited:true},
  'lezbos': {hasAirport:true, limited:true},
  'limnos': {hasAirport:true, limited:true},
  'kitira': {hasAirport:true, limited:true},
  'karpatos': {hasAirport:true, limited:true},
  // --- Grčka: bez sopstvenog aerodroma ---
  'halkidiki': {nearest:'Solun', note:'Halkidiki nema svoj aerodrom — najbliži je Solun (oko 1h vožnje).', c:'Halkidiki', k:'own', t:'1h'},
  'lefkada': {nearest:'Preveza', note:'Lefkada nema svoj aerodrom — najbliži je Preveza/Aktion (oko 30 min vožnje).', c:'Lefkada', k:'own', t:'30 min', nn:'Preveza/Aktion'},
  'volos': {nearest:'Solun'},
  'patra': {nearest:'Araksos', note:'Patra nema svoj aerodrom — najbliži je Araksos (oko 45 min vožnje).', c:'Patra', k:'own', t:'45 min'},
  'larisa': {nearest:'Solun', note:'Larisa nema svoj aerodrom — najbliži je Solun (oko 1h30 vožnje).', c:'Larisa', k:'own', t:'1h30'},
  'lutraki': {nearest:'Atina', note:'Lutraki nema svoj aerodrom — najbliži je Atina (oko 1h vožnje).', c:'Lutraki', k:'own', t:'1h'},
  'edipsos': {nearest:'Atina'},
  'olimp': {nearest:'Solun', note:'Olimp nema svoj aerodrom — najbliži je Solun (oko 1h vožnje).', c:'Olimp', k:'own', t:'1h'},
  'pilion': {nearest:'Solun'},
  'meteori': {nearest:'Solun', note:'Meteori nemaju aerodrom u blizini — najbliži je Solun (oko 2h vožnje).', c:'Meteori', k:'nearby', t:'2h'},
  'delfi': {nearest:'Atina', note:'Delfi nema svoj aerodrom — najbliži je Atina (oko 2h vožnje).', c:'Delfi', k:'own', t:'2h'},
  'nafplion': {nearest:'Atina', note:'Nafplion nema svoj aerodrom — najbliži je Atina (oko 2h vožnje).', c:'Nafplion', k:'own', t:'2h'},
  'tasos': {nearest:'Kavala'},
  'skopelos': {nearest:'Skijatos'},
  'evija': {nearest:'Atina', note:'Evija nema svoj aerodrom — najbliži je Atina (oko 1h30 vožnje).', c:'Evija', k:'own', t:'1h30'},
  'idra': {nearest:'Atina'},
  'spece': {nearest:'Atina'},
  'ios': {nearest:'Santorini'},
  'egina': {nearest:'Atina'},
  'poros': {nearest:'Atina'},
  'ser': {nearest:'Solun', note:'Ser nema svoj aerodrom sa redovnim letovima — najbliži je Solun (oko 1h vožnje).', c:'Ser', k:'sched', t:'1h'},
  'ksanti': {nearest:'Kavala', note:'Ksanti nema svoj aerodrom — najbliži je Kavala (oko 30 min vožnje).', c:'Ksanti', k:'own', t:'30 min'},
  'komotini': {nearest:'Aleksandrupolj', note:'Komotini nema svoj aerodrom — najbliži je Aleksandrupolj (oko 1h vožnje).', c:'Komotini', k:'own', t:'1h'},
  'trikala': {nearest:'Solun', note:'Trikala nema svoj aerodrom — najbliži je Solun (oko 2h vožnje).', c:'Trikala', k:'own', t:'2h'},
  'kardica': {nearest:'Solun', note:'Kardica nema svoj aerodrom — najbliži je Solun (oko 2h vožnje).', c:'Kardica', k:'own', t:'2h'},
  'lamija': {nearest:'Atina', note:'Lamija nema svoj aerodrom — najbliži je Atina (oko 2h vožnje).', c:'Lamija', k:'own', t:'2h'},
  'halkida': {nearest:'Atina', note:'Halkida nema svoj aerodrom — najbliži je Atina (oko 1h vožnje).', c:'Halkida', k:'own', t:'1h'},
  'florina': {nearest:'Kastorija', note:'Florina nema svoj aerodrom — najbliži je Kastorija (oko 45 min vožnje).', c:'Florina', k:'own', t:'45 min'},
  'verija': {nearest:'Solun', note:'Verija nema svoj aerodrom — najbliži je Solun (oko 45 min vožnje).', c:'Verija', k:'own', t:'45 min'},
  'katerini': {nearest:'Solun', note:'Katerini nema svoj aerodrom — najbliži je Solun (oko 45 min vožnje).', c:'Katerini', k:'own', t:'45 min'},
  'drama': {nearest:'Kavala', note:'Drama nema svoj aerodrom sa redovnim letovima — najbliži je Kavala (oko 40 min vožnje).', c:'Drama', k:'sched', t:'40 min'},
  'edesa': {nearest:'Solun', note:'Edesa nema svoj aerodrom — najbliži je Solun (oko 1h30 vožnje).', c:'Edesa', k:'own', t:'1h30'},
  'sparta': {nearest:'Kalamata', note:'Sparta nema svoj aerodrom — najbliži je Kalamata (oko 1h vožnje).', c:'Sparta', k:'own', t:'1h'},
  'tripoli': {nearest:'Atina', note:'Tripoli nema svoj aerodrom — najbliži je Atina (oko 2h vožnje), Kalamata je alternativa.', c:'Tripoli', k:'own', t:'2h', alt:'Kalamata'},
  'korint': {nearest:'Atina', note:'Korint nema svoj aerodrom — najbliži je Atina (oko 1h vožnje).', c:'Korint', k:'own', t:'1h'},
  'argos': {nearest:'Atina', note:'Argos nema svoj aerodrom — najbliži je Atina (oko 2h vožnje), Kalamata je alternativa.', c:'Argos', k:'own', t:'2h', alt:'Kalamata'},
  'andros': {nearest:'Atina'},
  'tinos': {nearest:'Mikonos'},
  'amorgos': {nearest:'Naksos'},
  'folegandros': {nearest:'Santorini'},
  'sifnos': {nearest:'Milos'},
  'simi': {nearest:'Rodos'},
  'patmos': {nearest:'Leros'},
  'antiparos': {nearest:'Paros'},
  'serifos': {nearest:'Milos'},
  'tajget': {nearest:'Kalamata', note:'Tajget nema aerodrom u blizini — najbliži je Kalamata (oko 40 min vožnje).', c:'Tajget', k:'nearby', t:'40 min'},
  'parnas': {nearest:'Atina', note:'Parnas nema aerodrom u blizini — najbliži je Atina (oko 2h vožnje).', c:'Parnas', k:'nearby', t:'2h'},
  'vardusija': {nearest:'Atina', note:'Vardusija nema aerodrom u blizini — najbliži je Atina (oko 2h30 vožnje).', c:'Vardusija', k:'nearby', t:'2h30'},
  'kamena vurla': {nearest:'Atina', note:'Kamena Vurla nema svoj aerodrom — najbliži je Atina (oko 2h vožnje).', c:'Kamena Vurla', k:'own', t:'2h'},
  'vikos': {nearest:'Janjina', note:'Vikos nema aerodrom u blizini — najbliži je Janjina (oko 1h vožnje).', c:'Vikos', k:'nearby', t:'1h'},
  'samarija': {nearest:'Krit', note:'Samarija nema aerodrom u blizini — najbliži je Krit (oko 1h30 vožnje).', c:'Samarija', k:'nearby', t:'1h30'},
  'parga': {nearest:'Preveza', note:'Parga nema svoj aerodrom — najbliži je Preveza/Aktion (oko 30 min vožnje).', c:'Parga', k:'own', t:'30 min', nn:'Preveza/Aktion'},
  'sivota': {nearest:'Preveza', note:'Sivota nema svoj aerodrom — najbliži je Preveza/Aktion (oko 45 min vožnje).', c:'Sivota', k:'own', t:'45 min', nn:'Preveza/Aktion'},
  'jezero plastira': {nearest:'Solun', note:'Jezero Plastira nema aerodrom u blizini — najbliži je Solun (oko 2h vožnje).', c:'Jezero Plastira', k:'nearby', t:'2h'},
  'jezero kerkini': {nearest:'Solun', note:'Jezero Kerkini nema aerodrom u blizini — najbliži je Solun (oko 1h vožnje).', c:'Jezero Kerkini', k:'nearby', t:'1h'},
  'jezero prespa': {nearest:'Kastorija', note:'Jezero Prespa nema aerodrom u blizini — najbliži je Kastorija (oko 1h vožnje).', c:'Jezero Prespa', k:'nearby', t:'1h'},
  // --- Bugarska: aerodromi ---
  'sofija': {hasAirport:true},
  'varna': {hasAirport:true},
  'burgas': {hasAirport:true},
  'plovdiv': {hasAirport:true, limited:true},
  // --- Bugarska: bez sopstvenog aerodroma ---
  'nesebar': {nearest:'Burgas', note:'Nesebar nema svoj aerodrom — najbliži je Burgas (oko 40 min vožnje).', c:'Nesebar', k:'own', t:'40 min'},
  'bansko': {nearest:'Sofija', note:'Bansko nema svoj aerodrom — najbliži je Sofija (oko 2h vožnje).', c:'Bansko', k:'own', t:'2h'},
  'ruse': {nearest:'Sofija'},
  'stara zagora': {nearest:'Plovdiv', note:'Stara Zagora nema svoj aerodrom — najbliži je Plovdiv (oko 1h vožnje).', c:'Stara Zagora', k:'own', t:'1h'},
  'pleven': {nearest:'Sofija', note:'Pleven nema svoj aerodrom — najbliži je Sofija (oko 2h vožnje).', c:'Pleven', k:'own', t:'2h'},
  'veliko trnovo': {nearest:'Sofija', note:'Veliko Trnovo nema svoj aerodrom — najbliži je Sofija (oko 2h30 vožnje), Varna je alternativa.', c:'Veliko Trnovo', k:'own', t:'2h30', alt:'Varna'},
  'blagoevgrad': {nearest:'Sofija', note:'Blagoevgrad nema svoj aerodrom — najbliži je Sofija (oko 1h vožnje).', c:'Blagoevgrad', k:'own', t:'1h'},
  'sumen': {nearest:'Varna', note:'Šumen nema svoj aerodrom — najbliži je Varna (oko 1h30 vožnje).', c:'Šumen', k:'own', t:'1h30'},
  'sliven': {nearest:'Burgas', note:'Sliven nema svoj aerodrom — najbliži je Burgas (oko 1h30 vožnje).', c:'Sliven', k:'own', t:'1h30'},
  'vidin': {nearest:'Sofija', note:'Vidin nema svoj aerodrom — najbliži je Sofija (oko 3h vožnje).', c:'Vidin', k:'own', t:'3h'},
  'dobric': {nearest:'Varna', note:'Dobrič nema svoj aerodrom — najbliži je Varna (oko 45 min vožnje).', c:'Dobrič', k:'own', t:'45 min'},
  'kjustendil': {nearest:'Sofija', note:'Kjustendil nema svoj aerodrom — najbliži je Sofija (oko 1h30 vožnje).', c:'Kjustendil', k:'own', t:'1h30'},
  'gabrovo': {nearest:'Sofija', note:'Gabrovo nema svoj aerodrom — najbliži je Sofija (oko 2h30 vožnje), Plovdiv je alternativa.', c:'Gabrovo', k:'own', t:'2h30', alt:'Plovdiv'},
  'haskovo': {nearest:'Plovdiv', note:'Haskovo nema svoj aerodrom — najbliži je Plovdiv (oko 1h vožnje).', c:'Haskovo', k:'own', t:'1h'},
  'sandanski': {nearest:'Sofija', note:'Sandanski nema svoj aerodrom — najbliži je Sofija (oko 2h vožnje).', c:'Sandanski', k:'own', t:'2h'},
  'velingrad': {nearest:'Sofija', note:'Velingrad nema svoj aerodrom — najbliži je Sofija (oko 1h30 vožnje), Plovdiv je alternativa.', c:'Velingrad', k:'own', t:'1h30', alt:'Plovdiv'},
  'hisarja': {nearest:'Plovdiv', note:'Hisarja nema svoj aerodrom — najbliži je Plovdiv (oko 40 min vožnje).', c:'Hisarja', k:'own', t:'40 min'},
  'devin': {nearest:'Plovdiv', note:'Devin nema svoj aerodrom — najbliži je Plovdiv (oko 1h30 vožnje).', c:'Devin', k:'own', t:'1h30'},
  'pavel banja': {nearest:'Plovdiv', note:'Pavel Banja nema svoj aerodrom — najbliži je Plovdiv (oko 1h vožnje).', c:'Pavel Banja', k:'own', t:'1h'},
  'bankja': {nearest:'Sofija', note:'Bankja nema svoj aerodrom — najbliži je Sofija (oko 30 min vožnje).', c:'Bankja', k:'own', t:'30 min'},
  'borovec': {nearest:'Sofija', note:'Borovec nema svoj aerodrom — najbliži je Sofija (oko 1h30 vožnje).', c:'Borovec', k:'own', t:'1h30'},
  'pamporovo': {nearest:'Plovdiv', note:'Pamporovo nema svoj aerodrom — najbliži je Plovdiv (oko 1h30 vožnje).', c:'Pamporovo', k:'own', t:'1h30'},
  'vitosa': {nearest:'Sofija', note:'Vitoša nema svoj aerodrom — najbliži je Sofija (oko 30 min vožnje).', c:'Vitoša', k:'own', t:'30 min'},
  'cepelare': {nearest:'Plovdiv', note:'Čepelare nema svoj aerodrom — najbliži je Plovdiv (oko 1h30 vožnje).', c:'Čepelare', k:'own', t:'1h30'},
  'rila': {nearest:'Sofija', note:'Rila nema svoj aerodrom — najbliži je Sofija (oko 2h vožnje).', c:'Rila', k:'own', t:'2h'},
  'koprivstica': {nearest:'Sofija', note:'Koprivštica nema svoj aerodrom — najbliži je Sofija (oko 1h30 vožnje), Plovdiv je alternativa.', c:'Koprivštica', k:'own', t:'1h30', alt:'Plovdiv'},
  'melnik': {nearest:'Sofija', note:'Melnik nema svoj aerodrom — najbliži je Sofija (oko 2h30 vožnje).', c:'Melnik', k:'own', t:'2h30'},
  'rilski manastir': {nearest:'Sofija', note:'Rilski manastir nema svoj aerodrom — najbliži je Sofija (oko 2h vožnje).', c:'Rilski manastir', k:'own', t:'2h'},
  'trjavna': {nearest:'Sofija', note:'Trjavna nema svoj aerodrom — najbliži je Sofija (oko 2h30 vožnje), Varna je alternativa.', c:'Trjavna', k:'own', t:'2h30', alt:'Varna'},
  'arbanasi': {nearest:'Varna', note:'Arbanasi nema svoj aerodrom — najbliži je Varna (oko 1h30 vožnje), Sofija je alternativa.', c:'Arbanasi', k:'own', t:'1h30', alt:'Sofija'},
  'sozopol': {nearest:'Burgas', note:'Sozopol nema svoj aerodrom — najbliži je Burgas (oko 35 min vožnje).', c:'Sozopol', k:'own', t:'35 min'},
  'suncev breg': {nearest:'Burgas', note:'Sunčev Breg nema svoj aerodrom — najbliži je Burgas (oko 30 min vožnje).', c:'Sunčev Breg', k:'own', t:'30 min'},
  'zlatni pjasci': {nearest:'Varna', note:'Zlatni Pjasci nemaju aerodrom — najbliži je Varna (oko 20 min vožnje).', c:'Zlatni Pjasci', k:'plain', t:'20 min'},
  'primorsko': {nearest:'Burgas', note:'Primorsko nema svoj aerodrom — najbliži je Burgas (oko 1h vožnje).', c:'Primorsko', k:'own', t:'1h'},
  'balcik': {nearest:'Varna', note:'Balčik nema svoj aerodrom — najbliži je Varna (oko 40 min vožnje).', c:'Balčik', k:'own', t:'40 min'},
  'kavarna': {nearest:'Varna', note:'Kavarna nema svoj aerodrom — najbliži je Varna (oko 1h vožnje).', c:'Kavarna', k:'own', t:'1h'},
  'carevo': {nearest:'Burgas', note:'Carevo nema svoj aerodrom — najbliži je Burgas (oko 1h vožnje).', c:'Carevo', k:'own', t:'1h'},
  'pomorije': {nearest:'Burgas', note:'Pomorije nema svoj aerodrom — najbliži je Burgas (oko 20 min vožnje).', c:'Pomorije', k:'own', t:'20 min'},
  'ahtopol': {nearest:'Burgas', note:'Ahtopol nema svoj aerodrom — najbliži je Burgas (oko 1h30 vožnje).', c:'Ahtopol', k:'own', t:'1h30'},
  'karlovo': {nearest:'Plovdiv', note:'Karlovo nema svoj aerodrom — najbliži je Plovdiv (oko 1h vožnje).', c:'Karlovo', k:'own', t:'1h'},
  'kazanlak': {nearest:'Plovdiv', note:'Kazanlak nema svoj aerodrom — najbliži je Plovdiv (oko 1h30 vožnje), Sofija je alternativa.', c:'Kazanlak', k:'own', t:'1h30', alt:'Sofija'},
  'smoljan': {nearest:'Plovdiv', note:'Smoljan nema svoj aerodrom — najbliži je Plovdiv (oko 2h vožnje).', c:'Smoljan', k:'own', t:'2h'},
  'kardzali': {nearest:'Plovdiv', note:'Kardžali nema svoj aerodrom — najbliži je Plovdiv (oko 1h30 vožnje).', c:'Kardžali', k:'own', t:'1h30'},
  'vraca': {nearest:'Sofija', note:'Vraca nema svoj aerodrom — najbliži je Sofija (oko 1h vožnje).', c:'Vraca', k:'own', t:'1h'},
  'pernik': {nearest:'Sofija', note:'Pernik nema svoj aerodrom — najbliži je Sofija (oko 30 min vožnje).', c:'Pernik', k:'own', t:'30 min'},
  'trojan': {nearest:'Sofija', note:'Trojan nema svoj aerodrom — najbliži je Sofija (oko 2h vožnje), Plovdiv je alternativa.', c:'Trojan', k:'own', t:'2h', alt:'Plovdiv'},
  'asenovgrad': {nearest:'Plovdiv', note:'Asenovgrad nema svoj aerodrom — najbliži je Plovdiv (oko 30 min vožnje).', c:'Asenovgrad', k:'own', t:'30 min'},
  // --- Bugarska: reke i jezera (bez sopstvenog aerodroma) ---
  'marica': {nearest:'Plovdiv', note:'Reka Marica nema svoj aerodrom — najbliži je Plovdiv (oko 20 min vožnje).', c:'Marica', k:'own', t:'20 min'},
  'iskar': {nearest:'Sofija', note:'Reka Iskar nema svoj aerodrom — najbliži je Sofija (oko 40 min vožnje).', c:'Iskar', k:'own', t:'40 min'},
  'struma': {nearest:'Sofija', note:'Reka Struma nema svoj aerodrom — najbliži je Sofija (oko 1h vožnje).', c:'Struma', k:'own', t:'1h'},
  'tundza': {nearest:'Burgas', note:'Reka Tundža nema svoj aerodrom — najbliži je Burgas (oko 1h30 vožnje), Plovdiv je alternativa.', c:'Tundža', k:'own', t:'1h30', alt:'Plovdiv'},
  'sedam rilskih jezera': {nearest:'Sofija', note:'Sedam Rilskih Jezera nemaju aerodrom — najbliži je Sofija (oko 2h vožnje).', c:'Sedam Rilskih Jezera', k:'own', t:'2h'},
  'srebarno jezero': {nearest:'Varna', note:'Srebarno Jezero nema svoj aerodrom — najbliži je Varna (oko 2h vožnje).', c:'Srebarno Jezero', k:'own', t:'2h'},
  'pancarevsko jezero': {nearest:'Sofija', note:'Pančarevsko Jezero nema svoj aerodrom — najbliži je Sofija (oko 20 min vožnje).', c:'Pančarevsko Jezero', k:'own', t:'20 min'},
  'batacko jezero': {nearest:'Plovdiv', note:'Batačko Jezero nema svoj aerodrom — najbliži je Plovdiv (oko 1h30 vožnje).', c:'Batačko Jezero', k:'own', t:'1h30'},
  // --- Rumunija: aerodromi ---
  'bukurest': {hasAirport:true},
  'kluz': {hasAirport:true, limited:true},
  'konstanca': {hasAirport:true, limited:true},
  'sibiu': {hasAirport:true, limited:true},
  'temisvar': {hasAirport:true, limited:true},
  'jasi': {hasAirport:true, limited:true},
  'brasov': {hasAirport:true, limited:true},
  'krajova': {hasAirport:true, limited:true},
  'oradea': {hasAirport:true, limited:true},
  'arad': {hasAirport:true, limited:true},
  'bakau': {hasAirport:true, limited:true},
  'satu mare': {hasAirport:true, limited:true},
  'baja mare': {hasAirport:true, limited:true},
  'targu mures': {hasAirport:true, limited:true},
  // --- Rumunija: bez sopstvenog aerodroma ---
  'sinaja': {nearest:'Bukurešt', note:'Sinaja nema svoj aerodrom — najbliži je Bukurešt (oko 2h vožnje).', c:'Sinaja', k:'own', t:'2h'},
  'bran': {nearest:'Brašov', note:'Bran nema svoj aerodrom — najbliži je Brašov (oko 30 min vožnje).', c:'Bran', k:'own', t:'30 min'},
  'mamaja': {nearest:'Konstanca', note:'Mamaja nema svoj aerodrom — najbliži je Konstanca (oko 15 min vožnje).', c:'Mamaja', k:'own', t:'15 min'},
  'plojesti': {nearest:'Bukurešt', note:'Ploješti nema svoj aerodrom — najbliži je Bukurešt (oko 1h vožnje).', c:'Ploješti', k:'own', t:'1h'},
  'pitesti': {nearest:'Bukurešt', note:'Pitešti nema svoj aerodrom — najbliži je Bukurešt (oko 1h30 vožnje).', c:'Pitešti', k:'own', t:'1h30'},
  'galac': {nearest:'Jaši', note:'Galac nema svoj aerodrom — najbliži je Jaši (oko 1h30 vožnje), Bukurešt je alternativa.', c:'Galac', k:'own', t:'1h30', alt:'Bukurešt'},
  'sighisoara': {nearest:'Targu Mureš', note:'Sighišoara nema svoj aerodrom — najbliži je Targu Mureš (oko 1h vožnje), Brašov je alternativa.', c:'Sighišoara', k:'own', t:'1h', alt:'Brašov'},
  'alba julija': {nearest:'Sibiu', note:'Alba Julija nema svoj aerodrom — najbliži je Sibiu (oko 1h vožnje).', c:'Alba Julija', k:'own', t:'1h'},
  'sfantu georgije': {nearest:'Brašov', note:'Sfantu Georgije nema svoj aerodrom — najbliži je Brašov (oko 30 min vožnje).', c:'Sfantu Georgije', k:'own', t:'30 min'},
  'deva': {nearest:'Arad', note:'Deva nema svoj aerodrom — najbliži je Arad (oko 1h30 vožnje), Sibiu je alternativa.', c:'Deva', k:'own', t:'1h30', alt:'Sibiu'},
  'resica': {nearest:'Temišvar', note:'Rešica nema svoj aerodrom — najbliži je Temišvar (oko 1h30 vožnje).', c:'Rešica', k:'own', t:'1h30'},
  'zalau': {nearest:'Kluž', note:'Zalau nema svoj aerodrom — najbliži je Kluž (oko 1h vožnje).', c:'Zalau', k:'own', t:'1h'},
  'buzau': {nearest:'Bukurešt', note:'Buzau nema svoj aerodrom — najbliži je Bukurešt (oko 1h30 vožnje).', c:'Buzau', k:'own', t:'1h30'},
  'foksani': {nearest:'Bakau', note:'Fokšani nema svoj aerodrom — najbliži je Bakau (oko 1h vožnje), Jaši je alternativa.', c:'Fokšani', k:'own', t:'1h', alt:'Jaši'},
  'targoviste': {nearest:'Bukurešt', note:'Targovište nema svoj aerodrom — najbliži je Bukurešt (oko 1h30 vožnje).', c:'Targovište', k:'own', t:'1h30'},
  'bajle herkulane': {nearest:'Temišvar', note:'Bajle Herkulane nema svoj aerodrom — najbliži je Temišvar (oko 2h vožnje).', c:'Bajle Herkulane', k:'own', t:'2h'},
  'sovata': {nearest:'Targu Mureš', note:'Sovata nema svoj aerodrom — najbliži je Targu Mureš (oko 1h vožnje).', c:'Sovata', k:'own', t:'1h'},
  'bajle feliks': {nearest:'Oradea', note:'Bajle Feliks nema svoj aerodrom — najbliži je Oradea (oko 30 min vožnje).', c:'Bajle Feliks', k:'own', t:'30 min'},
  'vatra dornei': {nearest:'Kluž', note:'Vatra Dornei nema svoj aerodrom — najbliži je Kluž (oko 2h30 vožnje).', c:'Vatra Dornei', k:'own', t:'2h30'},
  'kovasna': {nearest:'Brašov', note:'Kovasna nema svoj aerodrom — najbliži je Brašov (oko 1h vožnje).', c:'Kovasna', k:'own', t:'1h'},
  'slanik moldova': {nearest:'Bakau', note:'Slanik Moldova nema svoj aerodrom — najbliži je Bakau (oko 1h30 vožnje).', c:'Slanik Moldova', k:'own', t:'1h30'},
  'predeal': {nearest:'Brašov', note:'Predeal nema svoj aerodrom — najbliži je Brašov (oko 30 min vožnje).', c:'Predeal', k:'own', t:'30 min'},
  'poiana brasov': {nearest:'Brašov', note:'Poiana Brašov nema svoj aerodrom — najbliži je Brašov (oko 20 min vožnje).', c:'Poiana Brašov', k:'own', t:'20 min'},
  'busteni': {nearest:'Brašov', note:'Bušteni nema svoj aerodrom — najbliži je Brašov (oko 40 min vožnje), Bukurešt je alternativa.', c:'Bušteni', k:'own', t:'40 min', alt:'Bukurešt'},
  'semenic': {nearest:'Temišvar', note:'Semenic nema svoj aerodrom — najbliži je Temišvar (oko 1h30 vožnje).', c:'Semenic', k:'own', t:'1h30'},
  'paltinis': {nearest:'Sibiu', note:'Paltiniš nema svoj aerodrom — najbliži je Sibiu (oko 45 min vožnje).', c:'Paltiniš', k:'own', t:'45 min'},
  'peles dvorac': {nearest:'Bukurešt', note:'Peleš dvorac nema svoj aerodrom — najbliži je Bukurešt (oko 2h vožnje).', c:'Peleš dvorac', k:'own', t:'2h'},
  'risnov': {nearest:'Brašov', note:'Rišnov nema svoj aerodrom — najbliži je Brašov (oko 20 min vožnje).', c:'Rišnov', k:'own', t:'20 min'},
  'maramures': {nearest:'Baja Mare', note:'Maramureš nema svoj aerodrom — najbliži je Baja Mare (oko 1h vožnje).', c:'Maramureš', k:'own', t:'1h'},
  'bukovina': {nearest:'Jaši', note:'Bukovina nema svoj aerodrom — najbliži je Jaši (oko 2h30 vožnje), Kluž je alternativa.', c:'Bukovina', k:'own', t:'2h30', alt:'Kluž'},
  'eforie nord': {nearest:'Konstanca', note:'Eforie Nord nema svoj aerodrom — najbliži je Konstanca (oko 15 min vožnje).', c:'Eforie Nord', k:'own', t:'15 min'},
  'eforie sud': {nearest:'Konstanca', note:'Eforie Sud nema svoj aerodrom — najbliži je Konstanca (oko 20 min vožnje).', c:'Eforie Sud', k:'own', t:'20 min'},
  'vama vekje': {nearest:'Konstanca', note:'Vama Vekje nema svoj aerodrom — najbliži je Konstanca (oko 45 min vožnje).', c:'Vama Vekje', k:'own', t:'45 min'},
  'neptun': {nearest:'Konstanca', note:'Neptun nema svoj aerodrom — najbliži je Konstanca (oko 30 min vožnje).', c:'Neptun', k:'own', t:'30 min'},
  'kostinesti': {nearest:'Konstanca', note:'Kostinešti nema svoj aerodrom — najbliži je Konstanca (oko 25 min vožnje).', c:'Kostinešti', k:'own', t:'25 min'},
  'mangalija': {nearest:'Konstanca', note:'Mangalija nema svoj aerodrom — najbliži je Konstanca (oko 40 min vožnje).', c:'Mangalija', k:'own', t:'40 min'},
  'navodari': {nearest:'Konstanca', note:'Navodari nema svoj aerodrom — najbliži je Konstanca (oko 20 min vožnje).', c:'Navodari', k:'own', t:'20 min'},
  // --- Rumunija: reke i jezera (bez sopstvenog aerodroma) ---
  'mures': {nearest:'Targu Mureš', note:'Reka Mureš nema svoj aerodrom — najbliži je Targu Mureš (oko 20 min vožnje).', c:'Mureš', k:'own', t:'20 min'},
  'olt': {nearest:'Sibiu', note:'Reka Olt nema svoj aerodrom — najbliži je Sibiu (oko 1h vožnje).', c:'Olt', k:'own', t:'1h'},
  'prut': {nearest:'Jaši', note:'Reka Prut nema svoj aerodrom — najbliži je Jaši (oko 1h vožnje).', c:'Prut', k:'own', t:'1h'},
  'siret': {nearest:'Bakau', note:'Reka Siret nema svoj aerodrom — najbliži je Bakau (oko 1h vožnje).', c:'Siret', k:'own', t:'1h'},
  'crveno jezero': {nearest:'Brašov', note:'Crveno Jezero nema svoj aerodrom — najbliži je Brašov (oko 2h vožnje), Targu Mureš je alternativa.', c:'Crveno Jezero', k:'own', t:'2h', alt:'Targu Mureš'},
  'jezero bikaz': {nearest:'Bakau', note:'Jezero Bikaz nema svoj aerodrom — najbliži je Bakau (oko 1h30 vožnje).', c:'Jezero Bikaz', k:'own', t:'1h30'},
  'jezero sveta ana': {nearest:'Brašov', note:'Jezero Sveta Ana nema svoj aerodrom — najbliži je Brašov (oko 1h vožnje).', c:'Jezero Sveta Ana', k:'own', t:'1h'},
  'jezero vidraru': {nearest:'Bukurešt', note:'Jezero Vidraru nema svoj aerodrom — najbliži je Bukurešt (oko 2h30 vožnje).', c:'Jezero Vidraru', k:'own', t:'2h30'},
  'delta dunava': {nearest:'Konstanca', note:'Delta Dunava nema svoj aerodrom — najbliži je Konstanca (oko 2h vožnje); Tulča ima manji lokalni aerodrom sa ograničenim brojem letova.', c:'Delta Dunava', k:'own', t:'2h'},
  // --- Italija: aerodromi ---
  'rim': {hasAirport:true},
  'milano': {hasAirport:true},
  'napulj': {hasAirport:true},
  'venecija': {hasAirport:true},
  'bolonja': {hasAirport:true},
  'torino': {hasAirport:true},
  'bari': {hasAirport:true},
  'sicilija': {hasAirport:true},
  'sardinija': {hasAirport:true},
  'kaljari': {hasAirport:true},
  'palermo': {hasAirport:true},
  'katanija': {hasAirport:true},
  'pisa': {hasAirport:true},
  'trst': {hasAirport:true},
  'firenca': {hasAirport:true, limited:true},
  'verona': {hasAirport:true, limited:true},
  'djenova': {hasAirport:true, limited:true},
  'parma': {hasAirport:true, limited:true},
  'perudja': {hasAirport:true, limited:true},
  'rimini': {hasAirport:true, limited:true},
  'bolcano': {hasAirport:true, limited:true},
  'brindizi': {hasAirport:true, limited:true},
  'olbija': {hasAirport:true, limited:true},
  'algero': {hasAirport:true, limited:true},
  'trapani': {hasAirport:true, limited:true},
  'ankona': {hasAirport:true, limited:true},
  'bergamo': {hasAirport:true, limited:true},
  'peskara': {hasAirport:true, limited:true},
  'redjokalabrija': {hasAirport:true, limited:true},
  'lamecijaterme': {hasAirport:true, limited:true},
  // --- Italija: bez sopstvenog aerodroma ---
  'lece': {nearest:'Brindizi', note:'Leče nema svoj aerodrom — najbliži je Brindizi (oko 40 min vožnje).', c:'Leče', k:'own', t:'40 min'},
  'padova': {nearest:'Venecija', note:'Padova nema svoj aerodrom — najbliži je Venecija (oko 40 min vožnje).', c:'Padova', k:'own', t:'40 min'},
  'modena': {nearest:'Bolonja', note:'Modena nema svoj aerodrom — najbliži je Bolonja (oko 40 min vožnje).', c:'Modena', k:'own', t:'40 min'},
  'bresija': {nearest:'Milano', note:'Brešija nema svoj aerodrom — najbliži je Milano (oko 1h vožnje), Verona je alternativa.', c:'Brešija', k:'own', t:'1h', alt:'Verona'},
  'salerno': {nearest:'Napulj', note:'Salerno nema svoj aerodrom — najbliži je Napulj (oko 50 min vožnje).', c:'Salerno', k:'own', t:'50 min'},
  'abano terme': {nearest:'Venecija', note:'Abano Terme nema svoj aerodrom — najbliži je Venecija (oko 50 min vožnje), Padova je alternativa.', c:'Abano Terme', k:'own', t:'50 min', alt:'Padova'},
  'montekatini terme': {nearest:'Firenca', note:'Montekatini Terme nema svoj aerodrom — najbliži je Firenca (oko 50 min vožnje), Pisa je alternativa.', c:'Montekatini Terme', k:'own', t:'50 min', alt:'Pisa'},
  'fjudji': {nearest:'Rim', note:'Fjuđi nema svoj aerodrom — najbliži je Rim (oko 1h vožnje).', c:'Fjuđi', k:'own', t:'1h'},
  'salsomadjore terme': {nearest:'Parma', note:'Salsomađore Terme nema svoj aerodrom — najbliži je Parma (oko 40 min vožnje).', c:'Salsomađore Terme', k:'own', t:'40 min'},
  'dolomiti': {nearest:'Verona', note:'Dolomiti nemaju aerodrom u blizini — najbliži je Verona (oko 2h vožnje), Venecija je alternativa.', c:'Dolomiti', k:'nearby', t:'2h', alt:'Venecija'},
  'kortina d\'ampeco': {nearest:'Verona', note:'Kortina d\'Ampeco nema svoj aerodrom — najbliži je Verona (oko 2h vožnje).', c:'Kortina d\'Ampeco', k:'own', t:'2h'},
  'val gardena': {nearest:'Bolcano'},
  'livinjo': {nearest:'Milano'},
  'etna': {nearest:'Katanija', note:'Etna nema svoj aerodrom — najbliži je Katanija (oko 30 min vožnje).', c:'Etna', k:'own', t:'30 min'},
  'pompeji': {nearest:'Napulj', note:'Pompeji nema svoj aerodrom — najbliži je Napulj (oko 40 min vožnje).', c:'Pompeji', k:'own', t:'40 min'},
  'asizi': {nearest:'Perudja', note:'Asizi nema svoj aerodrom — najbliži je Perudja (oko 30 min vožnje).', c:'Asizi', k:'own', t:'30 min'},
  'sijena': {nearest:'Firenca', note:'Sijena nema svoj aerodrom — najbliži je Firenca (oko 1h vožnje).', c:'Sijena', k:'own', t:'1h'},
  'san djimonjano': {nearest:'Firenca', note:'San Đimonjano nema svoj aerodrom — najbliži je Firenca (oko 1h vožnje).', c:'San Đimonjano', k:'own', t:'1h'},
  'orvieto': {nearest:'Rim', note:'Orvieto nema svoj aerodrom — najbliži je Rim (oko 1h30 vožnje), Perudja je alternativa.', c:'Orvieto', k:'own', t:'1h30', alt:'Perudja'},
  'ravena': {nearest:'Bolonja', note:'Ravena nema svoj aerodrom — najbliži je Bolonja (oko 1h vožnje).', c:'Ravena', k:'own', t:'1h'},
  'amalfi': {nearest:'Napulj', note:'Amalfi nema svoj aerodrom — najbliži je Napulj (oko 1h vožnje).', c:'Amalfi', k:'own', t:'1h'},
  'pozitano': {nearest:'Napulj', note:'Pozitano nema svoj aerodrom — najbliži je Napulj (oko 1h vožnje).', c:'Pozitano', k:'own', t:'1h'},
  'sorento': {nearest:'Napulj', note:'Sorento nema svoj aerodrom — najbliži je Napulj (oko 1h vožnje).', c:'Sorento', k:'own', t:'1h'},
  'kapri': {nearest:'Napulj'},
  'portofino': {nearest:'Đenova', note:'Portofino nema svoj aerodrom — najbliži je Đenova (oko 40 min vožnje).', c:'Portofino', k:'own', t:'40 min'},
  'elba': {nearest:'Pisa'},
  'taormina': {nearest:'Katanija', note:'Taormina nema svoj aerodrom — najbliži je Katanija (oko 45 min vožnje).', c:'Taormina', k:'own', t:'45 min'},
  'luka': {nearest:'Pisa', note:'Luka nema svoj aerodrom — najbliži je Pisa (oko 25 min vožnje).', c:'Luka', k:'own', t:'25 min'},
  'cinkve tere': {nearest:'Đenova', note:'Činkve Tere nema svoj aerodrom — najbliži je Đenova (oko 1h vožnje), Pisa je alternativa.', c:'Činkve Tere', k:'own', t:'1h', alt:'Pisa'},
  'san marino': {nearest:'Rimini', note:'San Marino nema svoj aerodrom — najbliži je Rimini (oko 30 min vožnje).', c:'San Marino', k:'own', t:'30 min'},
  'vatikan': {nearest:'Rim'},
  'andora': {nearest:'Barselona', note:'Andora nema svoj aerodrom — najbliži je Barselona (oko 3h vožnje), Tuluz je alternativa.', c:'Andora', k:'own', t:'3h', alt:'Tuluz'},
  'soldeu': {nearest:'Barselona', note:'Soldeu nema svoj aerodrom — najbliži je Barselona (oko 3h vožnje), Tuluz je alternativa.', c:'Soldeu', k:'own', t:'3h', alt:'Tuluz'},
  'pas de la kasa': {nearest:'Tuluz', note:'Pas de la Kasa nema svoj aerodrom — najbliži je Tuluz (oko 2h vožnje), Barselona je alternativa.', c:'Pas de la Kasa', k:'own', t:'2h', alt:'Barselona'},
  'mantova': {nearest:'Verona', note:'Mantova nema svoj aerodrom — najbliži je Verona (oko 45 min vožnje).', c:'Mantova', k:'own', t:'45 min'},
  'ferara': {nearest:'Bolonja', note:'Ferara nema svoj aerodrom — najbliži je Bolonja (oko 40 min vožnje).', c:'Ferara', k:'own', t:'40 min'},
  'urbino': {nearest:'Ankona', note:'Urbino nema svoj aerodrom — najbliži je Ankona (oko 1h vožnje).', c:'Urbino', k:'own', t:'1h'},
  'matera': {nearest:'Bari', note:'Matera nema svoj aerodrom — najbliži je Bari (oko 1h vožnje).', c:'Matera', k:'own', t:'1h'},
  'alberobelo': {nearest:'Bari', note:'Alberobelo nema svoj aerodrom — najbliži je Bari (oko 1h vožnje), Brindizi je alternativa.', c:'Alberobelo', k:'own', t:'1h', alt:'Brindizi'},
  'ostuni': {nearest:'Brindizi', note:'Ostuni nema svoj aerodrom — najbliži je Brindizi (oko 40 min vožnje).', c:'Ostuni', k:'own', t:'40 min'},
  'poljinjano a mare': {nearest:'Bari', note:'Poljinjano a Mare nema svoj aerodrom — najbliži je Bari (oko 30 min vožnje).', c:'Poljinjano a Mare', k:'own', t:'30 min'},
  // --- Italija: alias-i za imena kako stoje u listi destinacija (usklađivanje transkripcije) ---
  'poliljano a mare': {nearest:'Bari', note:'Poliljano a Mare nema svoj aerodrom — najbliži je Bari (oko 30 min vožnje).', c:'Poliljano a Mare', k:'own', t:'30 min'},
  'redjo di kalabrija': {hasAirport:true, limited:true},
  // --- Italija: dodatni gradovi ---
  'trevizo': {hasAirport:true, limited:true},
  'komo': {nearest:'Milano', note:'Komo nema svoj aerodrom — najbliži je Milano (oko 1h vožnje).', c:'Komo', k:'own', t:'1h'},
  'udine': {nearest:'Trst', note:'Udine nema svoj aerodrom sa redovnim letovima — najbliži je Trst (oko 40 min vožnje).', c:'Udine', k:'own', t:'40 min'},
  'redjo emilija': {nearest:'Bolonja', note:'Ređo Emilija nema svoj aerodrom — najbliži je Bolonja (oko 30 min vožnje), Parma je alternativa.', c:'Ređo Emilija', k:'own', t:'30 min', alt:'Parma'},
  'livorno': {nearest:'Pisa', note:'Livorno nema svoj aerodrom — najbliži je Pisa (oko 25 min vožnje).', c:'Livorno', k:'own', t:'25 min'},
  'trento': {nearest:'Verona', note:'Trento nema svoj aerodrom — najbliži je Verona (oko 1h15 vožnje), Bolcano je alternativa.', c:'Trento', k:'own', t:'1h15', alt:'Bolcano'},
  'aosta': {nearest:'Torino', note:'Aosta nema svoj aerodrom — najbliži je Torino (oko 1h15 vožnje).', c:'Aosta', k:'own', t:'1h15'},
  'la specija': {nearest:'Pisa', note:'La Specija nema svoj aerodrom — najbliži je Pisa (oko 1h vožnje), Đenova je alternativa.', c:'La Specija', k:'own', t:'1h', alt:'Đenova'},
  'savona': {nearest:'Đenova', note:'Savona nema svoj aerodrom — najbliži je Đenova (oko 30 min vožnje).', c:'Savona', k:'own', t:'30 min'},
  'kozenca': {nearest:'Lamezia Terme', note:'Kozenca nema svoj aerodrom — najbliži je Lamezia Terme (oko 40 min vožnje).', c:'Kozenca', k:'own', t:'40 min'},
  // --- Italija: planine ---
  'vezuv': {nearest:'Napulj', note:'Vezuv nema svoj aerodrom — najbliži je Napulj (oko 30 min vožnje).', c:'Vezuv', k:'own', t:'30 min'},
  'gran paradizo': {nearest:'Torino', note:'Gran Paradizo nema svoj aerodrom — najbliži je Torino (oko 1h30 vožnje).', c:'Gran Paradizo', k:'own', t:'1h30'},
  'monblan': {nearest:'Torino', note:'Monblan (italijanska strana) nema svoj aerodrom — najbliži je Torino (oko 2h vožnje).', c:'Monblan', k:'own', t:'2h'},
  'stelvio': {nearest:'Bolcano', note:'Stelvio nema svoj aerodrom — najbliži je Bolcano (oko 1h30 vožnje).', c:'Stelvio', k:'own', t:'1h30'},
  // --- Italija: jezera ---
  'gardsko jezero': {nearest:'Verona', note:'Gardsko jezero nema svoj aerodrom — najbliži je Verona (oko 40 min vožnje).', c:'Gardsko jezero', k:'own', t:'40 min'},
  'jezero madjore': {nearest:'Milano', note:'Jezero Mađore nema svoj aerodrom — najbliži je Milano (oko 1h vožnje).', c:'Jezero Mađore', k:'own', t:'1h'},
  'komsko jezero': {nearest:'Milano', note:'Komsko jezero nema svoj aerodrom — najbliži je Milano (oko 1h vožnje).', c:'Komsko jezero', k:'own', t:'1h'},
  // --- Italija: primorska mesta ---
  'san remo': {nearest:'Đenova', note:'San Remo nema svoj aerodrom — najbliži je Đenova (oko 1h30 vožnje), Nica je alternativa preko granice.', c:'San Remo', k:'own', t:'1h30', alt:'Nica'},
  'vijaredjo': {nearest:'Pisa', note:'Vijaređo nema svoj aerodrom — najbliži je Pisa (oko 30 min vožnje).', c:'Vijaređo', k:'own', t:'30 min'},
  'forte dei marmi': {nearest:'Pisa', note:'Forte dei Marmi nema svoj aerodrom — najbliži je Pisa (oko 40 min vožnje).', c:'Forte dei Marmi', k:'own', t:'40 min'},
  'ostija': {nearest:'Rim', note:'Ostija nema svoj aerodrom — najbliži je Rim (oko 30 min vožnje).', c:'Ostija', k:'own', t:'30 min'},
  'otranto': {nearest:'Brindizi', note:'Otranto nema svoj aerodrom — najbliži je Brindizi (oko 1h vožnje).', c:'Otranto', k:'own', t:'1h'},
  'sirakuza': {nearest:'Katanija', note:'Sirakuza nema svoj aerodrom — najbliži je Katanija (oko 1h vožnje).', c:'Sirakuza', k:'own', t:'1h'},
  'agridjento': {nearest:'Palermo', note:'Agriđento nema svoj aerodrom — najbliži je Palermo (oko 2h vožnje), Katanija je alternativa.', c:'Agriđento', k:'own', t:'2h', alt:'Katanija'},
  'cefalu': {nearest:'Palermo', note:'Ćefalu nema svoj aerodrom — najbliži je Palermo (oko 1h vožnje).', c:'Ćefalu', k:'own', t:'1h'},
  'san vito lo kapo': {nearest:'Trapani', note:'San Vito Lo Kapo nema svoj aerodrom — najbliži je Trapani (oko 40 min vožnje), Palermo je alternativa.', c:'San Vito Lo Kapo', k:'own', t:'40 min', alt:'Palermo'},
  'lipari': {nearest:'Katanija', note:'Lipari nema svoj aerodrom — najbliži je Katanija (trajekt i vožnja, oko 2h), Palermo je alternativa.', c:'Lipari', k:'own', t:'2h', alt:'Palermo'},
  'iskija': {nearest:'Napulj', note:'Iskija nema svoj aerodrom — najbliži je Napulj (trajektom, oko 1h).', c:'Iskija', k:'own', t:'1h'},
  'procida': {nearest:'Napulj', note:'Pročida nema svoj aerodrom — najbliži je Napulj (trajektom, oko 1h).', c:'Pročida', k:'own', t:'1h'},
  'ustika': {nearest:'Palermo', note:'Ustika nema svoj aerodrom — najbliži je Palermo (trajektom, oko 2h).', c:'Ustika', k:'own', t:'2h'},
  // --- Španija: aerodromi ---
  'barselona': {hasAirport:true},
  'madrid': {hasAirport:true},
  'valensija': {hasAirport:true},
  'malaga': {hasAirport:true},
  'majorka': {hasAirport:true},
  'sevilja': {hasAirport:true},
  'alikante': {hasAirport:true},
  'bilbao': {hasAirport:true},
  'tenerife': {hasAirport:true},
  'gran kanarija': {hasAirport:true},
  'lanzarote': {hasAirport:true},
  'fuerteventura': {hasAirport:true},
  'ibica': {hasAirport:true, limited:true},
  'granada': {hasAirport:true, limited:true},
  'san sebastijan': {hasAirport:true, limited:true},
  'santjago de kompostela': {hasAirport:true, limited:true},
  'zaragoza': {hasAirport:true, limited:true},
  'vigo': {hasAirport:true, limited:true},
  'korunja': {hasAirport:true, limited:true},
  'ovijedo': {hasAirport:true, limited:true},
  'santander': {hasAirport:true, limited:true},
  'valjadolid': {hasAirport:true, limited:true},
  'murcija': {hasAirport:true, limited:true},
  'almerija': {hasAirport:true, limited:true},
  'herez': {hasAirport:true, limited:true},
  'reus': {hasAirport:true, limited:true},
  'girona': {hasAirport:true, limited:true},
  'menorka': {hasAirport:true, limited:true},
  'pamplona': {hasAirport:true, limited:true},
  'melilja': {hasAirport:true, limited:true},
  // --- Španija: bez sopstvenog aerodroma ---
  'salamanka': {nearest:'Madrid', note:'Salamanka nema svoj aerodrom sa redovnim letovima — najbliži je Madrid (oko 2h30 vožnje).', c:'Salamanka', k:'sched', t:'2h30'},
  'toledo': {nearest:'Madrid', note:'Toledo nema svoj aerodrom — najbliži je Madrid (oko 1h vožnje).', c:'Toledo', k:'own', t:'1h'},
  'kordoba': {nearest:'Sevilja', note:'Kordoba nema svoj aerodrom — najbliži je Sevilja (oko 1h30 vožnje), Malaga je alternativa.', c:'Kordoba', k:'own', t:'1h30', alt:'Malaga'},
  'segovija': {nearest:'Madrid', note:'Segovija nema svoj aerodrom — najbliži je Madrid (oko 1h vožnje).', c:'Segovija', k:'own', t:'1h'},
  'ronda': {nearest:'Malaga', note:'Ronda nema svoj aerodrom — najbliži je Malaga (oko 2h vožnje).', c:'Ronda', k:'own', t:'2h'},
  'kadiz': {nearest:'Herez', note:'Kadiz nema svoj aerodrom — najbliži je Herez de la Frontera (oko 45 min vožnje), Sevilja je alternativa.', c:'Kadiz', k:'own', t:'45 min', nn:'Herez de la Frontera', alt:'Sevilja'},
  'marbelja': {nearest:'Malaga', note:'Marbelja nema svoj aerodrom — najbliži je Malaga (oko 45 min vožnje).', c:'Marbelja', k:'own', t:'45 min'},
  'benidorm': {nearest:'Alikante', note:'Benidorm nema svoj aerodrom — najbliži je Alikante (oko 45 min vožnje).', c:'Benidorm', k:'own', t:'45 min'},
  'kuenka': {nearest:'Madrid', note:'Kuenka nema svoj aerodrom — najbliži je Madrid (oko 1h30 vožnje).', c:'Kuenka', k:'own', t:'1h30'},
  'avila': {nearest:'Madrid', note:'Avila nema svoj aerodrom — najbliži je Madrid (oko 1h vožnje).', c:'Avila', k:'own', t:'1h'},
  'panticosa': {nearest:'Zaragoza', note:'Panticosa nema svoj aerodrom — najbliži je Zaragoza (oko 2h30 vožnje).', c:'Panticosa', k:'own', t:'2h30'},
  'archena': {nearest:'Murcija', note:'Archena nema svoj aerodrom — najbliži je Murcija (oko 30 min vožnje).', c:'Archena', k:'own', t:'30 min'},
  'alama de aragon': {nearest:'Zaragoza', note:'Alama de Aragon nema svoj aerodrom — najbliži je Zaragoza (oko 1h30 vožnje).', c:'Alama de Aragon', k:'own', t:'1h30'},
  'jezera kovadonga': {nearest:'Ovijedo', note:'Jezera Kovadonga nemaju aerodrom u blizini — najbliži je Ovijedo (oko 1h15 vožnje).', c:'Jezera Kovadonga', k:'nearby', t:'1h15'},
  'jezero sanabija': {nearest:'Valjadolid', note:'Jezero Sanabija nema aerodrom u blizini — najbliži je Valjadolid (oko 2h vožnje).', c:'Jezero Sanabija', k:'nearby', t:'2h'},
  'jezero banjoles': {nearest:'Girona', note:'Jezero Banjoles nema svoj aerodrom — najbliži je Girona (oko 20 min vožnje).', c:'Jezero Banjoles', k:'own', t:'20 min'},
  // --- Austrija: aerodromi ---
  'bec': {hasAirport:true},
  'salcburg': {hasAirport:true, limited:true},
  'grac': {hasAirport:true, limited:true},
  'graz': {hasAirport:true, limited:true},
  'insbruk': {hasAirport:true, limited:true},
  'linc': {hasAirport:true, limited:true},
  'klagenfurt': {hasAirport:true, limited:true},
  // --- Austrija: bez sopstvenog aerodroma ---
  'halstat': {nearest:'Salcburg', note:'Halštat nema svoj aerodrom — najbliži je Salcburg (oko 1h vožnje).', c:'Halštat', k:'own', t:'1h'},
  'zeloamze': {nearest:'Salcburg', note:'Cel am Ze nema svoj aerodrom — najbliži je Salcburg (oko 1h15 vožnje).', c:'Cel am Ze', k:'own', t:'1h15'},
  'kicbuel': {nearest:'Insbruk', note:'Kicbuel nema svoj aerodrom — najbliži je Insbruk (oko 1h vožnje), Salcburg je alternativa.', c:'Kicbuel', k:'own', t:'1h', alt:'Salcburg'},
  'sanktanton': {nearest:'Insbruk'},
  'baden kod beca': {nearest:'Beč', note:'Baden kod Beča nema svoj aerodrom — najbliži je Beč (oko 30 min vožnje).', c:'Baden kod Beča', k:'own', t:'30 min'},
  'melk': {nearest:'Beč', note:'Melk nema svoj aerodrom — najbliži je Beč (oko 1h15 vožnje).', c:'Melk', k:'own', t:'1h15'},
  'verfen': {nearest:'Salcburg', note:'Verfen nema svoj aerodrom — najbliži je Salcburg (oko 45 min vožnje).', c:'Verfen', k:'own', t:'45 min'},
  // --- Austrija: alias-i za imena kako stoje u listi destinacija (usklađivanje transkripcije) ---
  'zalcburg': {hasAirport:true, limited:true},
  'zel am zi': {nearest:'Salcburg', note:'Zel am Ze nema svoj aerodrom — najbliži je Salcburg (oko 1h15 vožnje).', c:'Zel am Ze', k:'own', t:'1h15'},
  'kicbil': {nearest:'Insbruk', note:'Kicbil nema svoj aerodrom — najbliži je Insbruk (oko 1h vožnje), Salcburg je alternativa.', c:'Kicbil', k:'own', t:'1h', alt:'Salcburg'},
  // --- Austrija: veći gradovi bez sopstvenog aerodroma ---
  'filah': {nearest:'Klagenfurt', note:'Filah nema svoj aerodrom — najbliži je Klagenfurt (oko 40 min vožnje).', c:'Filah', k:'own', t:'40 min'},
  'vels': {nearest:'Linc', note:'Vels nema svoj aerodrom — najbliži je Linc (oko 20 min vožnje).', c:'Vels', k:'own', t:'20 min'},
  'sankt pelten': {nearest:'Beč', note:'Sankt Pelten nema svoj aerodrom — najbliži je Beč (oko 1h vožnje).', c:'Sankt Pelten', k:'own', t:'1h'},
  'ajzenstat': {nearest:'Beč', note:'Ajzenštat nema svoj aerodrom — najbliži je Beč (oko 50 min vožnje).', c:'Ajzenštat', k:'own', t:'50 min'},
  'dornbirn': {nearest:'Cirih', note:'Dornbirn nema svoj aerodrom — najbliži je Cirih u Švajcarskoj (oko 1h15 vožnje), Insbruk je alternativa.', c:'Dornbirn', k:'own', t:'1h15', cc:'Švajcarskoj', alt:'Insbruk'},
  'bregenc': {nearest:'Cirih', note:'Bregenc nema svoj aerodrom — najbliži je Cirih u Švajcarskoj (oko 1h vožnje), Insbruk je alternativa.', c:'Bregenc', k:'own', t:'1h', cc:'Švajcarskoj', alt:'Insbruk'},
  'feldkirh': {nearest:'Cirih', note:'Feldkirh nema svoj aerodrom — najbliži je Cirih u Švajcarskoj (oko 1h vožnje), Insbruk je alternativa.', c:'Feldkirh', k:'own', t:'1h', cc:'Švajcarskoj', alt:'Insbruk'},
  'viner nojstat': {nearest:'Beč', note:'Viner Nojštat nema svoj aerodrom — najbliži je Beč (oko 40 min vožnje).', c:'Viner Nojštat', k:'own', t:'40 min'},
  'krems na dunavu': {nearest:'Beč', note:'Krems na Dunavu nema svoj aerodrom — najbliži je Beč (oko 1h vožnje).', c:'Krems na Dunavu', k:'own', t:'1h'},
  'klosternojburg': {nearest:'Beč', note:'Klosternojburg nema svoj aerodrom — najbliži je Beč (oko 20 min vožnje).', c:'Klosternojburg', k:'own', t:'20 min'},
  'leoben': {nearest:'Grac', note:'Leoben nema svoj aerodrom — najbliži je Grac (oko 45 min vožnje).', c:'Leoben', k:'own', t:'45 min'},
  'stajer': {nearest:'Linc', note:'Štajer nema svoj aerodrom — najbliži je Linc (oko 30 min vožnje).', c:'Štajer', k:'own', t:'30 min'},
  'amsteten': {nearest:'Beč', note:'Amšteten nema svoj aerodrom — najbliži je Beč (oko 1h15 vožnje), Linc je alternativa.', c:'Amšteten', k:'own', t:'1h15', alt:'Linc'},
  'kufstajn': {nearest:'Insbruk', note:'Kufštajn nema svoj aerodrom — najbliži je Insbruk (oko 1h vožnje), Minhen je alternativa.', c:'Kufštajn', k:'own', t:'1h', alt:'Minhen'},
  'vergl': {nearest:'Insbruk', note:'Vergl nema svoj aerodrom — najbliži je Insbruk (oko 50 min vožnje).', c:'Vergl', k:'own', t:'50 min'},
  'svac': {nearest:'Insbruk', note:'Švac nema svoj aerodrom — najbliži je Insbruk (oko 30 min vožnje).', c:'Švac', k:'own', t:'30 min'},
  'lienc': {nearest:'Klagenfurt', note:'Lienc nema svoj aerodrom — najbliži je Klagenfurt (oko 1h30 vožnje), Insbruk je alternativa.', c:'Lienc', k:'own', t:'1h30', alt:'Insbruk'},
  // --- Austrija: banje ---
  'bad gastajn': {nearest:'Salcburg', note:'Bad Gastajn nema svoj aerodrom — najbliži je Salcburg (oko 1h15 vožnje).', c:'Bad Gastajn', k:'own', t:'1h15'},
  'bad isl': {nearest:'Salcburg', note:'Bad Išl nema svoj aerodrom — najbliži je Salcburg (oko 1h vožnje).', c:'Bad Išl', k:'own', t:'1h'},
  'bad ausee': {nearest:'Salcburg', note:'Bad Ausee nema svoj aerodrom — najbliži je Salcburg (oko 1h15 vožnje).', c:'Bad Ausee', k:'own', t:'1h15'},
  'bad hofgastajn': {nearest:'Salcburg', note:'Bad Hofgastajn nema svoj aerodrom — najbliži je Salcburg (oko 1h10 vožnje).', c:'Bad Hofgastajn', k:'own', t:'1h10'},
  'bad klajnkirhajm': {nearest:'Klagenfurt', note:'Bad Klajnkirhajm nema svoj aerodrom — najbliži je Klagenfurt (oko 1h vožnje).', c:'Bad Klajnkirhajm', k:'own', t:'1h'},
  'lojpersdorf': {nearest:'Grac', note:'Lojpersdorf nema svoj aerodrom — najbliži je Grac (oko 45 min vožnje).', c:'Lojpersdorf', k:'own', t:'45 min'},
  // --- Austrija: planine i skijališta ---
  'solden': {nearest:'Insbruk', note:'Solden nema svoj aerodrom — najbliži je Insbruk (oko 1h15 vožnje).', c:'Solden', k:'own', t:'1h15'},
  'isgl': {nearest:'Insbruk', note:'Išgl nema svoj aerodrom — najbliži je Insbruk (oko 1h30 vožnje), Cirih je alternativa.', c:'Išgl', k:'own', t:'1h30', alt:'Cirih'},
  'majrhofen': {nearest:'Insbruk', note:'Majrhofen nema svoj aerodrom — najbliži je Insbruk (oko 1h vožnje).', c:'Majrhofen', k:'own', t:'1h'},
  'lech': {nearest:'Insbruk', note:'Lech nema svoj aerodrom — najbliži je Insbruk (oko 1h30 vožnje), Cirih je alternativa.', c:'Lech', k:'own', t:'1h30', alt:'Cirih'},
  'cirs': {nearest:'Insbruk', note:'Cirs nema svoj aerodrom — najbliži je Insbruk (oko 1h30 vožnje), Cirih je alternativa.', c:'Cirs', k:'own', t:'1h30', alt:'Cirih'},
  'obertauern': {nearest:'Salcburg', note:'Obertauern nema svoj aerodrom — najbliži je Salcburg (oko 1h15 vožnje).', c:'Obertauern', k:'own', t:'1h15'},
  'sladming': {nearest:'Salcburg', note:'Šladming nema svoj aerodrom — najbliži je Salcburg (oko 1h vožnje), Grac je alternativa.', c:'Šladming', k:'own', t:'1h', alt:'Grac'},
  'zalbah': {nearest:'Salcburg', note:'Zalbah nema svoj aerodrom — najbliži je Salcburg (oko 1h vožnje).', c:'Zalbah', k:'own', t:'1h'},
  'kaprun': {nearest:'Salcburg', note:'Kaprun nema svoj aerodrom — najbliži je Salcburg (oko 1h10 vožnje).', c:'Kaprun', k:'own', t:'1h10'},
  'bisofshofen': {nearest:'Salcburg', note:'Bišofshofen nema svoj aerodrom — najbliži je Salcburg (oko 45 min vožnje).', c:'Bišofshofen', k:'own', t:'45 min'},
  'sankt johan im pongau': {nearest:'Salcburg', note:'Sankt Johan im Pongau nema svoj aerodrom — najbliži je Salcburg (oko 50 min vožnje).', c:'Sankt Johan im Pongau', k:'own', t:'50 min'},
  'grosglokner': {nearest:'Salcburg', note:'Grosglokner nema svoj aerodrom — najbliži je Salcburg (oko 1h30 vožnje), Klagenfurt je alternativa.', c:'Grosglokner', k:'own', t:'1h30', alt:'Klagenfurt'},
  'dahstajn': {nearest:'Salcburg', note:'Dahštajn nema svoj aerodrom — najbliži je Salcburg (oko 1h15 vožnje).', c:'Dahštajn', k:'own', t:'1h15'},
  'semering': {nearest:'Beč', note:'Semering nema svoj aerodrom — najbliži je Beč (oko 1h15 vožnje), Grac je alternativa.', c:'Semering', k:'own', t:'1h15', alt:'Grac'},
  // --- Austrija: turistički centri ---
  'vahau': {nearest:'Beč', note:'Vahau nema svoj aerodrom — najbliži je Beč (oko 1h vožnje).', c:'Vahau', k:'own', t:'1h'},
  // --- Austrija: jezera ---
  'volfgangze': {nearest:'Salcburg', note:'Volfgangze nema svoj aerodrom — najbliži je Salcburg (oko 45 min vožnje).', c:'Volfgangze', k:'own', t:'45 min'},
  'ahenze': {nearest:'Insbruk', note:'Ahenze nema svoj aerodrom — najbliži je Insbruk (oko 45 min vožnje).', c:'Ahenze', k:'own', t:'45 min'},
  'vertersee': {nearest:'Klagenfurt', note:'Vertersee nema svoj aerodrom — najbliži je Klagenfurt (oko 20 min vožnje).', c:'Vertersee', k:'own', t:'20 min'},
  'atersee': {nearest:'Salcburg', note:'Atersee nema svoj aerodrom — najbliži je Salcburg (oko 1h vožnje).', c:'Atersee', k:'own', t:'1h'},
  'mondzee': {nearest:'Salcburg', note:'Mondzee nema svoj aerodrom — najbliži je Salcburg (oko 30 min vožnje).', c:'Mondzee', k:'own', t:'30 min'},
  'traunzee': {nearest:'Linc', note:'Traunzee nema svoj aerodrom — najbliži je Linc (oko 40 min vožnje).', c:'Traunzee', k:'own', t:'40 min'},
  'nojzidlersko jezero': {nearest:'Beč', note:'Nojzidlersko jezero nema svoj aerodrom — najbliži je Beč (oko 50 min vožnje).', c:'Nojzidlersko jezero', k:'own', t:'50 min'},
  // --- Slovačka: aerodromi ---
  'bratislava': {hasAirport:true},
  'kosice': {hasAirport:true, limited:true},
  'poprad': {hasAirport:true, limited:true},
  // --- Slovačka: bez sopstvenog aerodroma ---
  'banska bistrica': {nearest:'Bratislava', note:'Banska Bistrica nema aerodrom sa redovnim letovima — najbliži je Bratislava (oko 2h30 vožnje).', c:'Banska Bistrica', k:'sched', t:'2h30'},
  'vysoke tatre': {nearest:'Poprad', note:'Visoke Tatre nemaju sopstveni aerodrom — najbliži je Poprad (oko 30 min vožnje).', c:'Visoke Tatre', k:'own', t:'30 min'},
  'zilina': {nearest:'Bratislava', note:'Žilina nema svoj aerodrom sa redovnim letovima — najbliži je Bratislava (oko 2h vožnje).', c:'Žilina', k:'sched', t:'2h'},
  'presov': {nearest:'Košice', note:'Prešov nema svoj aerodrom — najbliži je Košice (oko 30 min vožnje).', c:'Prešov', k:'own', t:'30 min'},
  'nitra': {nearest:'Bratislava', note:'Nitra nema svoj aerodrom — najbliži je Bratislava (oko 1h vožnje).', c:'Nitra', k:'own', t:'1h'},
  'trnava': {nearest:'Bratislava', note:'Trnava nema svoj aerodrom — najbliži je Bratislava (oko 45 min vožnje).', c:'Trnava', k:'own', t:'45 min'},
  'levoca': {nearest:'Poprad', note:'Levoča nema svoj aerodrom — najbliži je Poprad (oko 30 min vožnje).', c:'Levoča', k:'own', t:'30 min'},
  'bardejov': {nearest:'Košice', note:'Bardejov nema svoj aerodrom — najbliži je Košice (oko 1h30 vožnje).', c:'Bardejov', k:'own', t:'1h30'},
  'kezmarok': {nearest:'Poprad', note:'Kežmarok nema svoj aerodrom — najbliži je Poprad (oko 20 min vožnje).', c:'Kežmarok', k:'own', t:'20 min'},
  'trencin': {nearest:'Bratislava', note:'Trenčín nema svoj aerodrom — najbliži je Bratislava (oko 1h30 vožnje).', c:'Trenčín', k:'own', t:'1h30'},
  'piestany': {nearest:'Bratislava', note:'Piešťany nemaju svoj aerodrom — najbliži je Bratislava (oko 1h vožnje).', c:'Piešťany', k:'own', t:'1h'},
  'bardejovske kupele': {nearest:'Košice', note:'Bardejovske Kupele nemaju svoj aerodrom — najbliži je Košice (oko 1h30 vožnje).', c:'Bardejovske Kupele', k:'own', t:'1h30'},
  'dudince': {nearest:'Bratislava', note:'Dudince nemaju svoj aerodrom sa redovnim letovima — najbliži je Bratislava (oko 2h vožnje).', c:'Dudince', k:'sched', t:'2h'},
  'niske tatre': {nearest:'Poprad', note:'Niske Tatre nemaju aerodrom u blizini — najbliži je Poprad (oko 1h vožnje).', c:'Niske Tatre', k:'nearby', t:'1h'},
  'mala fatra': {nearest:'Bratislava', note:'Mala Fatra nema aerodrom u blizini — najbliži je Bratislava (oko 2h vožnje), Žilina je polazna tačka.', c:'Mala Fatra', k:'nearby', t:'2h'},
  'strbske pleso': {nearest:'Poprad', note:'Štrbske Pleso nema svoj aerodrom — najbliži je Poprad (oko 30 min vožnje).', c:'Štrbske Pleso', k:'own', t:'30 min'},
  'domasa jezero': {nearest:'Košice', note:'Domaša jezero nema aerodrom u blizini — najbliži je Košice (oko 1h vožnje).', c:'Domaša jezero', k:'nearby', t:'1h'},
  'oravska priehrada': {nearest:'Žilina', note:'Oravska priehrada nema aerodrom u blizini — najbliži je Bratislava (oko 2h30 vožnje).', c:'Oravska priehrada', k:'nearby', t:'2h30'},
  'spisski hrad': {nearest:'Poprad', note:'Spišski hrad nema svoj aerodrom — najbliži je Poprad (oko 30 min vožnje).', c:'Spišski hrad', k:'own', t:'30 min'},
  'demanovska jaskinja': {nearest:'Poprad', note:'Demänovska jaskinja nema aerodrom u blizini — najbliži je Poprad (oko 1h vožnje).', c:'Demänovska jaskinja', k:'nearby', t:'1h'},
  'oravski hrad': {nearest:'Žilina', note:'Oravski hrad nema aerodrom u blizini — najbliži je Bratislava (oko 2h30 vožnje).', c:'Oravski hrad', k:'nearby', t:'2h30'},
  // --- Baltik: aerodromi ---
  'talin': {hasAirport:true},
  'riga': {hasAirport:true},
  'vilnjus': {hasAirport:true},
  'kaunas': {hasAirport:true, limited:true},
  'palanga': {hasAirport:true, limited:true},
  // --- Malta ---
  'malta': {hasAirport:true},
  // --- Kipar: aerodromi ---
  'larnaka': {hasAirport:true},
  'pafos': {hasAirport:true, limited:true},
  // --- Luksemburg ---
  'luksemburg': {hasAirport:true, limited:true},
  // --- Island ---
  'rejkjavik': {hasAirport:true},
  'akurejri': {hasAirport:true, limited:true},
  'keflavik': {hasAirport:true},
  'egilsstadir': {hasAirport:true, limited:true},
  'isafjordur': {hasAirport:true, limited:true},
  'vestmanaeyjar': {hasAirport:true, limited:true},
  'hofn': {hasAirport:true, limited:true},
  // --- Island: bez sopstvenog aerodroma ---
  'selfos': {nearest:'Rejkjavik', note:'Selfos nema svoj aerodrom — najbliži je Rejkjavik (oko 1h vožnje).', c:'Selfos', k:'own', t:'1h'},
  'husavik': {nearest:'Akurejri', note:'Husavik nema svoj aerodrom — najbliži je Akurejri (oko 1h vožnje).', c:'Husavik', k:'own', t:'1h'},
  'vik': {nearest:'Rejkjavik', note:'Vik nema svoj aerodrom — najbliži je Rejkjavik (oko 2h30 vožnje).', c:'Vik', k:'own', t:'2h30'},
  'borganes': {nearest:'Rejkjavik', note:'Borganes nema svoj aerodrom — najbliži je Rejkjavik (oko 1h vožnje).', c:'Borganes', k:'own', t:'1h'},
  'stikisholmur': {nearest:'Rejkjavik', note:'Stikisholmur nema svoj aerodrom — najbliži je Rejkjavik (oko 2h vožnje).', c:'Stikisholmur', k:'own', t:'2h'},
  'grindavik': {nearest:'Keflavik', note:'Grindavik nema svoj aerodrom — najbliži je Keflavik (oko 15 min vožnje).', c:'Grindavik', k:'own', t:'15 min'},
  'hafnarfjordur': {nearest:'Rejkjavik', note:'Hafnarfjordur nema svoj aerodrom — najbliži je Rejkjavik (oko 15 min vožnje).', c:'Hafnarfjordur', k:'own', t:'15 min'},
  'gulfos': {nearest:'Rejkjavik', note:'Vodopad Gulfos nema aerodrom u blizini — najbliži je Rejkjavik (oko 1h30 vožnje).', c:'Gulfos', k:'nearby', t:'1h30'},
  'skogafos': {nearest:'Rejkjavik', note:'Vodopad Skogafos nema aerodrom u blizini — najbliži je Rejkjavik (oko 2h vožnje).', c:'Skogafos', k:'nearby', t:'2h'},
  'seljalandsfos': {nearest:'Rejkjavik', note:'Vodopad Seljalandsfos nema aerodrom u blizini — najbliži je Rejkjavik (oko 2h vožnje).', c:'Seljalandsfos', k:'nearby', t:'2h'},
  'detifos': {nearest:'Akurejri', note:'Vodopad Detifos nema aerodrom u blizini — najbliži je Akurejri (oko 1h30 vožnje).', c:'Detifos', k:'nearby', t:'1h30'},
  'fjadrargljufur': {nearest:'Rejkjavik', note:'Kanjon Fjadrargljufur nema aerodrom u blizini — najbliži je Rejkjavik (oko 3h vožnje).', c:'Fjadrargljufur', k:'nearby', t:'3h'},
  'rejnisfjara': {nearest:'Rejkjavik', note:'Crna plaža Rejnisfjara nema aerodrom u blizini — najbliži je Rejkjavik (oko 2h30 vožnje).', c:'Rejnisfjara', k:'nearby', t:'2h30'},
  'dijamantska plaza': {nearest:'Hofn', note:'Dijamantska plaža nema aerodrom u blizini — najbliži je Hofn (oko 1h vožnje), Rejkjavik je dalja alternativa.', c:'Dijamantska plaža', k:'nearby', t:'1h', alt:'Rejkjavik'},
  'hverir': {nearest:'Akurejri', note:'Geotermalno polje Hverir nema aerodrom u blizini — najbliži je Akurejri (oko 1h vožnje).', c:'Hverir', k:'nearby', t:'1h'},
  'plava laguna': {nearest:'Keflavik', note:'Plava Laguna nema aerodrom u blizini — najbliži je Keflavik (oko 20 min vožnje).', c:'Plava Laguna', k:'nearby', t:'20 min'},
  'terme mivatn': {nearest:'Akurejri', note:'Terme Mivatn nemaju aerodrom u blizini — najbliži je Akurejri (oko 1h vožnje).', c:'Terme Mivatn', k:'nearby', t:'1h'},
  'tajna laguna': {nearest:'Rejkjavik', note:'Tajna Laguna nema aerodrom u blizini — najbliži je Rejkjavik (oko 1h30 vožnje).', c:'Tajna Laguna', k:'nearby', t:'1h30'},
  'sky laguna': {nearest:'Rejkjavik', note:'Sky Laguna nema aerodrom u blizini — najbliži je Rejkjavik (oko 15 min vožnje).', c:'Sky Laguna', k:'nearby', t:'15 min'},
  'snajfelsjokul': {nearest:'Rejkjavik', note:'Snajfelsjokul nema aerodrom u blizini — najbliži je Rejkjavik (oko 2h30 vožnje).', c:'Snajfelsjokul', k:'nearby', t:'2h30'},
  'kirkjufel': {nearest:'Rejkjavik', note:'Planina Kirkjufel nema aerodrom u blizini — najbliži je Rejkjavik (oko 2h vožnje).', c:'Kirkjufel', k:'nearby', t:'2h'},
  'hekla': {nearest:'Rejkjavik', note:'Vulkan Hekla nema aerodrom u blizini — najbliži je Rejkjavik (oko 2h vožnje).', c:'Hekla', k:'nearby', t:'2h'},
  'herdubreid': {nearest:'Akurejri', note:'Herdubreid nema aerodrom u blizini — najbliži je Akurejri (oko 3h vožnje).', c:'Herdubreid', k:'nearby', t:'3h'},
  'ejafjatlajokul': {nearest:'Rejkjavik', note:'Ejafjatlajokul nema aerodrom u blizini — najbliži je Rejkjavik (oko 2h vožnje).', c:'Ejafjatlajokul', k:'nearby', t:'2h'},
  'askja': {nearest:'Akurejri', note:'Askja nema aerodrom u blizini — najbliži je Akurejri (oko 3h30 vožnje, samo leti terenskim putem).', c:'Askja', k:'nearby', t:'3h30'},
  'jokulsarlon': {nearest:'Hofn', note:'Jokulsarlon nema aerodrom u blizini — najbliži je Hofn (oko 1h vožnje), Rejkjavik je dalja alternativa.', c:'Jokulsarlon', k:'nearby', t:'1h', alt:'Rejkjavik'},
  'mivatn': {nearest:'Akurejri', note:'Jezero Mivatn nema aerodrom u blizini — najbliži je Akurejri (oko 1h vožnje).', c:'Mivatn', k:'nearby', t:'1h'},
  'vatnajokul': {nearest:'Hofn', note:'Glečer Vatnajokul nema aerodrom u blizini — najbliži je Hofn (oko 1h vožnje).', c:'Vatnajokul', k:'nearby', t:'1h'},
  'tingvelir': {nearest:'Rejkjavik', note:'Nacionalni park Tingvelir nema aerodrom u blizini — najbliži je Rejkjavik (oko 45 min vožnje).', c:'Tingvelir', k:'nearby', t:'45 min'},
  'landmanalaugar': {nearest:'Rejkjavik', note:'Landmanalaugar nema aerodrom u blizini — najbliži je Rejkjavik (oko 3h30 vožnje, samo leti terenskim putem).', c:'Landmanalaugar', k:'nearby', t:'3h30'},
  'torsmork': {nearest:'Rejkjavik', note:'Torsmork nema aerodrom u blizini — najbliži je Rejkjavik (oko 3h vožnje, terenskim putem).', c:'Torsmork', k:'nearby', t:'3h'},
  'skaftafel': {nearest:'Rejkjavik', note:'Nacionalni park Skaftafel nema aerodrom u blizini — najbliži je Rejkjavik (oko 4h vožnje), Hofn je bliža alternativa.', c:'Skaftafel', k:'nearby', t:'4h', alt:'Hofn'},
  'snajfelsnes': {nearest:'Rejkjavik', note:'Poluostrvo Snajfelsnes nema aerodrom u blizini — najbliži je Rejkjavik (oko 2h vožnje).', c:'Snajfelsnes', k:'nearby', t:'2h'},
  'vestfjordi': {nearest:'Isafjordur', note:'Region Vestfjordi nema veliki aerodrom — najbliži je Isafjordur (varira po mestu).', c:'Vestfjordi', k:'nearby', t:'varira'},
  'kerid': {nearest:'Rejkjavik', note:'Krater Kerid nema aerodrom u blizini — najbliži je Rejkjavik (oko 1h vožnje).', c:'Kerid', k:'nearby', t:'1h'},
  // --- Moldavija ---
  'kisinjev': {hasAirport:true, limited:true},
  // --- Velika Britanija: dodatni aerodromi ---
  'birmingem': {hasAirport:true},
  'glazgov': {hasAirport:true},
  'belfast': {hasAirport:true, limited:true},
  'bristol': {hasAirport:true, limited:true},
  'lids': {hasAirport:true, limited:true},
  'njukasl': {hasAirport:true, limited:true},
  'kardif': {hasAirport:true, limited:true},
  'aberdin': {hasAirport:true, limited:true},
  // --- Velika Britanija: bez sopstvenog aerodroma ---
  'kembridz': {nearest:'London', note:'Kembridž nema svoj aerodrom — najbliži je London (oko 1h vožnje).', c:'Kembridž', k:'own', t:'1h'},
  'oksford': {nearest:'London', note:'Oksford nema svoj aerodrom — najbliži je London (oko 1h30 vožnje).', c:'Oksford', k:'own', t:'1h30'},
  // --- Francuska: dodatni aerodromi ---
  'tuluz': {hasAirport:true},
  'nant': {hasAirport:true, limited:true},
  'strazbur': {hasAirport:true, limited:true},
  'monpelje': {hasAirport:true, limited:true},
  'korzika': {hasAirport:true, limited:true},
  'lil': {hasAirport:true, limited:true},
  'ren': {hasAirport:true, limited:true},
  // NAPOMENA: 'brest (belorusija)' MORA stajati PRE francuskog 'brest' unosa —
  // inače airportInfoFor() pogrešno uhvati "Brest (Belorusija)" preko
  // startsWith('brest ') na francuskom ključu i vrati Brest (Francuska)
  // umesto Minska.
  'brest (belorusija)': {nearest:'Minsk', note:'Brest (Belorusija) nema redovne komercijalne letove — najbliži je Minsk (oko 4h vožnje).', c:'Brest (Belorusija)', k:'own', t:'4h'},
  'brest': {hasAirport:true, limited:true},
  'klermonferan': {hasAirport:true, limited:true},
  'bijaric': {hasAirport:true, limited:true},
  'perpinjan': {hasAirport:true, limited:true},
  'tulon': {hasAirport:true, limited:true},
  'limoz': {hasAirport:true, limited:true},
  'grenobl': {hasAirport:true, limited:true},
  'samberi': {hasAirport:true, limited:true},
  'anesi': {hasAirport:true, limited:true},
  'nansi': {hasAirport:true, limited:true},
  'larosel': {hasAirport:true, limited:true},
  'tur': {hasAirport:true, limited:true},
  // --- Francuska: bez sopstvenog aerodroma ---
  'versaj': {nearest:'Pariz', note:'Versaj nema svoj aerodrom — najbliži je Pariz (oko 30 min vožnje).', c:'Versaj', k:'own', t:'30 min'},
  'kan': {nearest:'Nica', note:'Kan nema svoj aerodrom — najbliži je Nica (oko 30 min vožnje).', c:'Kan', k:'own', t:'30 min'},
  'dizon': {nearest:'Lion', note:'Dižon nema svoj aerodrom — najbliži je Lion (oko 1h30 vožnje).', c:'Dižon', k:'own', t:'1h30'},
  'anze': {nearest:'Nant', note:'Anže nema svoj aerodrom — najbliži je Nant (oko 1h vožnje).', c:'Anže', k:'own', t:'1h'},
  'lemans': {nearest:'Pariz', note:'Le Mans nema svoj aerodrom sa redovnim letovima — najbliži je Pariz (oko 2h vožnje), Tur je alternativa.', c:'Le Mans', k:'sched', t:'2h', alt:'Tur'},
  'amjen': {nearest:'Pariz', note:'Amjen nema svoj aerodrom — najbliži je Pariz (oko 1h30 vožnje).', c:'Amjen', k:'own', t:'1h30'},
  'orlean': {nearest:'Pariz', note:'Orlean nema svoj aerodrom — najbliži je Pariz (oko 1h30 vožnje).', c:'Orlean', k:'own', t:'1h30'},
  'mec': {nearest:'Nansi'},
  'kursel': {nearest:'Samberi', note:'Kuršel nema svoj aerodrom — najbliži je Samberi (oko 1h30 vožnje), Ženeva je alternativa.', c:'Kuršel', k:'own', t:'1h30', alt:'Ženeva'},
  'val d\'izer': {nearest:'Samberi', note:'Val d\'Izer nema svoj aerodrom — najbliži je Samberi (oko 2h vožnje), Ženeva je alternativa.', c:'Val d\'Izer', k:'own', t:'2h', alt:'Ženeva'},
  'val toran': {nearest:'Samberi', note:'Val Toran nema svoj aerodrom — najbliži je Samberi (oko 1h30 vožnje).', c:'Val Toran', k:'own', t:'1h30'},
  'meribel': {nearest:'Samberi', note:'Meribel nema svoj aerodrom — najbliži je Samberi (oko 1h15 vožnje).', c:'Meribel', k:'own', t:'1h15'},
  'tinj': {nearest:'Samberi', note:'Tinj nema svoj aerodrom — najbliži je Samberi (oko 2h vožnje), Ženeva je alternativa.', c:'Tinj', k:'own', t:'2h', alt:'Ženeva'},
  'mezev': {nearest:'Ženeva', note:'Mežev nema svoj aerodrom — najbliži je Ženeva (oko 1h vožnje).', c:'Mežev', k:'own', t:'1h'},
  // --- Nemačka: dodatni aerodromi ---
  'nirnberg': {hasAirport:true, limited:true},
  'hanover': {hasAirport:true, limited:true},
  'lajpcig': {hasAirport:true, limited:true},
  'bremen': {hasAirport:true, limited:true},
  'dortmund': {hasAirport:true, limited:true},
  'karlsrue': {hasAirport:true, limited:true},
  'minster': {hasAirport:true, limited:true},
  'paderborn': {hasAirport:true, limited:true},
  'zarbriken': {hasAirport:true, limited:true},
  'rostok': {hasAirport:true, limited:true},
  'erfurt': {hasAirport:true, limited:true},
  'fridrihshafen': {hasAirport:true, limited:true},
  'libek': {hasAirport:true, limited:true},
  'memingen': {hasAirport:true, limited:true},
  'kasel': {hasAirport:true, limited:true},
  // --- Nemačka: bez sopstvenog aerodroma ---
  'hajdelberg': {nearest:'Frankfurt', note:'Hajdelberg nema svoj aerodrom — najbliži je Frankfurt (oko 1h vožnje).', c:'Hajdelberg', k:'own', t:'1h'},
  'bon': {nearest:'Keln'},
  'visbaden': {nearest:'Frankfurt', note:'Visbaden nema svoj aerodrom — najbliži je Frankfurt (oko 40 min vožnje).', c:'Visbaden', k:'own', t:'40 min'},
  'majnc': {nearest:'Frankfurt', note:'Majnc nema svoj aerodrom — najbliži je Frankfurt (oko 45 min vožnje).', c:'Majnc', k:'own', t:'45 min'},
  'ahen': {nearest:'Keln', note:'Ahen nema svoj aerodrom — najbliži je Keln/Bon (oko 1h vožnje).', c:'Ahen', k:'own', t:'1h', nn:'Keln/Bon'},
  'regensburg': {nearest:'Nirnberg', note:'Regensburg nema svoj aerodrom — najbliži je Nirnberg (oko 1h20 vožnje).', c:'Regensburg', k:'own', t:'1h20'},
  'vurcburg': {nearest:'Frankfurt', note:'Vurcburg nema svoj aerodrom — najbliži je Frankfurt (oko 1h30 vožnje).', c:'Vurcburg', k:'own', t:'1h30'},
  'trir': {nearest:'Luksemburg', note:'Trir nema svoj aerodrom — najbliži je Luksemburg (oko 1h vožnje).', c:'Trir', k:'own', t:'1h'},
  'potsdam': {nearest:'Berlin', note:'Potsdam nema svoj aerodrom — najbliži je Berlin (oko 30 min vožnje).', c:'Potsdam', k:'own', t:'30 min'},
  'kil': {nearest:'Hamburg', note:'Kil nema svoj aerodrom sa redovnim letovima — najbliži je Hamburg (oko 1h30 vožnje).', c:'Kil', k:'sched', t:'1h30'},
  'magdeburg': {nearest:'Berlin', note:'Magdeburg nema svoj aerodrom — najbliži je Berlin (oko 2h vožnje).', c:'Magdeburg', k:'own', t:'2h'},
  'kemnic': {nearest:'Lajpcig', note:'Kemnic nema svoj aerodrom sa redovnim letovima — najbliži je Lajpcig (oko 1h vožnje).', c:'Kemnic', k:'sched', t:'1h'},
  'ulm': {nearest:'Stutgart', note:'Ulm nema svoj aerodrom — najbliži je Štutgart (oko 1h vožnje).', c:'Ulm', k:'own', t:'1h', nn:'Štutgart'},
  'frajburg': {nearest:'Bazel', note:'Frajburg nema svoj aerodrom — najbliži je Bazel (oko 1h vožnje).', c:'Frajburg', k:'own', t:'1h'},
  'konstanc': {nearest:'Fridrihshafen'},
  // --- Nemačka: alias-i za imena kako stoje u listi destinacija (usklađivanje transkripcije) ---
  'lubek': {hasAirport:true, limited:true},
  'vircburg': {nearest:'Frankfurt', note:'Vircburg nema svoj aerodrom — najbliži je Frankfurt (oko 1h30 vožnje).', c:'Vircburg', k:'own', t:'1h30'},
  // --- Nemačka: dodatni gradovi bez sopstvenog aerodroma ---
  'esen': {nearest:'Diseldorf', note:'Esen nema svoj aerodrom — najbliži je Diseldorf (oko 30 min vožnje), Dortmund je alternativa.', c:'Esen', k:'own', t:'30 min', alt:'Dortmund'},
  'duizburg': {nearest:'Diseldorf', note:'Duizburg nema svoj aerodrom — najbliži je Diseldorf (oko 20 min vožnje).', c:'Duizburg', k:'own', t:'20 min'},
  'bohum': {nearest:'Dortmund', note:'Bohum nema svoj aerodrom — najbliži je Dortmund (oko 20 min vožnje).', c:'Bohum', k:'own', t:'20 min'},
  'vupertal': {nearest:'Diseldorf', note:'Vupertal nema svoj aerodrom — najbliži je Diseldorf (oko 30 min vožnje), Keln je alternativa.', c:'Vupertal', k:'own', t:'30 min', alt:'Keln'},
  'bilefeld': {nearest:'Paderborn', note:'Bilefeld nema svoj aerodrom — najbliži je Paderborn (oko 45 min vožnje), Hanover je alternativa.', c:'Bilefeld', k:'own', t:'45 min', alt:'Hanover'},
  'manhajm': {nearest:'Frankfurt', note:'Manhajm nema svoj aerodrom — najbliži je Frankfurt (oko 1h vožnje), Štutgart je alternativa.', c:'Manhajm', k:'own', t:'1h', alt:'Štutgart'},
  'augsburg': {nearest:'Minhen', note:'Augsburg nema svoj aerodrom sa redovnim letovima — najbliži je Minhen (oko 45 min vožnje).', c:'Augsburg', k:'sched', t:'45 min'},
  'vajmar': {nearest:'Erfurt', note:'Vajmar nema svoj aerodrom — najbliži je Erfurt (oko 30 min vožnje), Lajpcig je alternativa.', c:'Vajmar', k:'own', t:'30 min', alt:'Lajpcig'},
  'koblenc': {nearest:'Frankfurt', note:'Koblenc nema svoj aerodrom — najbliži je Frankfurt (oko 1h15 vožnje), Keln je alternativa.', c:'Koblenc', k:'own', t:'1h15', alt:'Keln'},
  'bamberg': {nearest:'Nirnberg', note:'Bamberg nema svoj aerodrom — najbliži je Nirnberg (oko 1h vožnje).', c:'Bamberg', k:'own', t:'1h'},
  // --- Nemačka: banje ---
  'baden-baden': {nearest:'Karlsrue', note:'Baden-Baden nema svoj aerodrom — najbliži je Karlsrue (oko 30 min vožnje), Štutgart je alternativa.', c:'Baden-Baden', k:'own', t:'30 min', alt:'Štutgart'},
  'bad homburg': {nearest:'Frankfurt', note:'Bad Homburg nema svoj aerodrom — najbliži je Frankfurt (oko 30 min vožnje).', c:'Bad Homburg', k:'own', t:'30 min'},
  // --- Nemačka: planine i priroda ---
  'cugspice': {nearest:'Minhen', note:'Cugšpice nema svoj aerodrom — najbliži je Minhen (oko 1h30 vožnje), Memingen je alternativa.', c:'Cugšpice', k:'own', t:'1h30', alt:'Memingen'},
  'svarcvald': {nearest:'Bazel', note:'Švarcvald nema svoj aerodrom — najbliži je Bazel u Švajcarskoj (oko 1h vožnje), Štutgart je alternativa.', c:'Švarcvald', k:'own', t:'1h', cc:'Švajcarskoj', alt:'Štutgart'},
  'harc': {nearest:'Lajpcig', note:'Harc nema svoj aerodrom — najbliži je Lajpcig (oko 1h30 vožnje), Hanover je alternativa.', c:'Harc', k:'own', t:'1h30', alt:'Hanover'},
  'bodensko jezero': {nearest:'Fridrihshafen', note:'Bodensko jezero nema svoj aerodrom — najbliži je Fridrihshafen (oko 30 min vožnje), Konstanc je alternativa.', c:'Bodensko jezero', k:'own', t:'30 min', alt:'Konstanc'},
  'kimzee': {nearest:'Minhen', note:'Kimzee nema svoj aerodrom — najbliži je Minhen (oko 1h vožnje).', c:'Kimzee', k:'own', t:'1h'},
  'zilt': {hasAirport:true, limited:true},
  'rugen': {nearest:'Rostok', note:'Rugen nema svoj aerodrom sa redovnim letovima — najbliži je Rostok (oko 1h30 vožnje).', c:'Rugen', k:'sched', t:'1h30'},
  // --- Nemačka: dodata poznata mesta/znamenitosti ---
  'garmisch-partenkirchen': {nearest:'Minhen', note:'Garmisch-Partenkirchen nema svoj aerodrom — najbliži je Minhen (oko 1h30 vožnje), Insbruk je alternativa.', c:'Garmisch-Partenkirchen', k:'own', t:'1h30', alt:'Insbruk'},
  'nojsvanstajn': {nearest:'Memingen', note:'Nojšvanštajn nema svoj aerodrom — najbliži je Memingen (oko 45 min vožnje), Minhen je alternativa.', c:'Nojšvanštajn', k:'own', t:'45 min', alt:'Minhen'},
  'rotenburg na tauberu': {nearest:'Nirnberg', note:'Rotenburg na Tauberu nema svoj aerodrom — najbliži je Nirnberg (oko 1h15 vožnje), Frankfurt je alternativa.', c:'Rotenburg na Tauberu', k:'own', t:'1h15', alt:'Frankfurt'},
  // --- Holandija: dodatni aerodromi ---
  'ajndhoven': {hasAirport:true, limited:true},
  'mastriht': {hasAirport:true, limited:true},
  'groningen': {hasAirport:true, limited:true},
  // --- Holandija: bez sopstvenog aerodroma ---
  'hag': {nearest:'Roterdam'},
  'utreht': {nearest:'Amsterdam', note:'Utreht nema svoj aerodrom — najbliži je Amsterdam (oko 30 min vožnje).', c:'Utreht', k:'own', t:'30 min'},
  // --- Norveška: dodatni aerodromi ---
  'bergen': {hasAirport:true, limited:true},
  'trondhajm': {hasAirport:true, limited:true},
  'stavanger': {hasAirport:true, limited:true},
  'tromso': {hasAirport:true, limited:true},
  'bodo': {hasAirport:true, limited:true},
  'olesund': {hasAirport:true, limited:true},
  'kristiansand': {hasAirport:true, limited:true},
  'harstad': {hasAirport:true, limited:true},
  'alta': {hasAirport:true, limited:true},
  'kirkenes': {hasAirport:true, limited:true},
  'svalbard': {hasAirport:true, limited:true},
  'tromse': {hasAirport:true, limited:true},  // alias za normalizovani oblik 'tromso'
  'voss': {hasAirport:true, limited:true},
  'kvitfjell': {hasAirport:true, limited:true},
  // --- Norveška: bez sopstvenog aerodroma ---
  'lilehamer': {nearest:'Oslo', note:'Lilehamer nema svoj aerodrom — najbliži je Oslo (oko 2h vožnje).', c:'Lilehamer', k:'own', t:'2h'},
  'lofoti': {nearest:'Bodo', note:'Lofotska ostrva nemaju direktne letove iz Srbije — najbliži aerodrom je Bodo (Bodø), odakle se nastavlja brodom ili lokalnim letom. Postoje i manji aerodromu na ostrvima (Svolvær, Leknes) sa sezonskim unutrašnjim letovima.', c:'Lofoti', k:'own', t:'1h+brod'},
  'gejrangerfjord': {nearest:'Olesund'},
  'sognefjord': {nearest:'Bergen', note:'Sognefjord nema aerodrom — polazi se iz Bergena (2-3h autobusom ili brodom).', c:'Sognefjord', k:'own', t:'2-3h'},
  'nærojfjord': {nearest:'Bergen', note:'Nærojfjord je deo Sognefjorda — polazna tačka Flåm, dostupna iz Bergena.', c:'Nærojfjord', k:'own', t:'2-3h'},
  'narojfjord': {nearest:'Bergen', note:'Nærojfjord je deo Sognefjorda — polazna tačka Flåm, dostupna iz Bergena.', c:'Nærojfjord', k:'own', t:'2-3h'},
  'preikestolen': {nearest:'Stavanger', note:'Preikestolen je dostupan iz Stavangera — oko 1h20min vožnje + 4-5h pešačenje.', c:'Preikestolen', k:'own', t:'1h20min'},
  'trolltunga': {nearest:'Bergen', note:'Trolltunga je dostupna iz Bergena (oko 3h). Planinska tura, sezona jun–sep.', c:'Trolltunga', k:'own', t:'3h'},
  'nordkapp': {nearest:'Tromso', note:'Nordkapp — najbliži aerodrom Alta ili Honningsvåg (lokalni). Iz Srbije najčešće via Tromse + rent-a-car.', c:'Nordkapp', k:'own', t:'2h'},
  'flom': {nearest:'Bergen', note:'Flåm nema aerodrom — dolazi se iz Bergena vozom/autobusom (2-3h).', c:'Flom', k:'own', t:'2-3h'},
  'geiranger': {nearest:'Olesund', note:'Geiranger nema aerodrom — najbliži je Ålesund (oko 1h30min). Sezona maj–oktobar.', c:'Geiranger', k:'own', t:'1h30min'},
  'jotunheimen': {nearest:'Oslo', note:'Jotunheimen nema aerodroma — ulaz iz Osla (3-4h vožnje) ili Bergena.', c:'Jotunheimen', k:'own', t:'3-4h'},
  'hemsedal': {nearest:'Oslo', note:'Hemsedal ski centar — oko 3h od Osla (Gardermoen).', c:'Hemsedal', k:'own', t:'3h'},
  'geilo': {nearest:'Oslo', note:'Geilo ski centar — oko 3h od Osla, dostupan i vozom (linija Bergen–Oslo).', c:'Geilo', k:'own', t:'3h'},
  'trysil': {nearest:'Oslo', note:'Trysil ski centar — oko 3h od Osla. Nema aerodroma u blizini.', c:'Trysil', k:'own', t:'3h'},
  'mjosa': {nearest:'Oslo', note:'Jezero Mjøsa — dostupno iz Osla (1-1h30min vozom; Hamar, Gjøvik, Lillehammer).', c:'Mjøsa', k:'own', t:'1h30min'},
  // --- Švedska: dodatni aerodromi ---
  'malme': {hasAirport:true, limited:true},
  'umeo': {hasAirport:true, limited:true},
  'lulea': {hasAirport:true, limited:true},
  'kiruna': {hasAirport:true, limited:true},
  'vizbi': {hasAirport:true, limited:true},
  'sundsval': {hasAirport:true, limited:true},
  'kalmar': {hasAirport:true, limited:true},
  // --- Švedska: bez sopstvenog aerodroma ---
  'upsala': {nearest:'Stokholm', note:'Upsala nema svoj aerodrom — najbliži je Stokholm (oko 45 min vožnje).', c:'Upsala', k:'own', t:'45 min'},
  'lund': {nearest:'Malme', note:'Lund nema svoj aerodrom — najbliži je Malme (oko 20 min vožnje).', c:'Lund', k:'own', t:'20 min'},
  'are': {nearest:'Stokholm', note:'Åre ski centar — najbliži aerodrom Östersund (1h). Presedanje u Stokholmu iz Srbije.', c:'Åre', k:'own', t:'1h'},
  'salen': {nearest:'Stokholm', note:'Sälen ski centri — oko 4h od Stokholma. Nema aerodroma u blizini.', c:'Sälen', k:'own', t:'4h'},
  'idre fjall': {nearest:'Stokholm', note:'Idre Fjäll ski centar — oko 5h od Stokholma ili 3h od Östersunda.', c:'Idre Fjäll', k:'own', t:'5h'},
  'abisko': {nearest:'Kiruna', note:'Abisko — najbliži aerodrom Kiruna (1h30min vozom). Iz Srbije let do Kiruне ili Tromse + transfer.', c:'Abisko', k:'own', t:'1h30min'},
  'gotland': {nearest:'Stokholm', note:'Gotland ima aerodrom Visby — letovi iz Stokholma (45 min). Može i trajektom iz Nynäshamna (3h).', c:'Gotland', k:'sched', t:'45 min'},
  'visby': {nearest:'Stokholm', note:'Visby ima aerodrom sa letovima iz Stokholma (45 min) i Geteborga.', c:'Visby', k:'sched', t:'45 min'},
  'dalarna': {nearest:'Stokholm', note:'Dalarna — vozom iz Stokholma (2-3h, pravac Mora). Closest airport Dala Airport (Borlänge).', c:'Dalarna', k:'own', t:'2-3h'},
  'siljan': {nearest:'Stokholm', note:'Jezero Siljan (Dalarna) — vozom iz Stokholma (2-3h, stanice Mora, Rättvik).', c:'Siljan', k:'own', t:'2-3h'},
  'vänern': {nearest:'Geteborg', note:'Jezero Vänern — 1h30min od Geteborga ili Karlstad Airport.', c:'Vänern', k:'own', t:'1h30min'},
  'vanern': {nearest:'Geteborg', note:'Jezero Vänern — 1h30min od Geteborga ili Karlstad Airport.', c:'Vänern', k:'own', t:'1h30min'},
  'vättern': {nearest:'Stokholm', note:'Jezero Vättern — polazišta Jönköping ili Örebro, iz Stokholma 2-3h.', c:'Vättern', k:'own', t:'2h'},
  'vattern': {nearest:'Stokholm', note:'Jezero Vättern — polazišta Jönköping ili Örebro, iz Stokholma 2-3h.', c:'Vättern', k:'own', t:'2h'},
  // --- Danska: dodatni aerodromi ---
  'olborg': {hasAirport:true, limited:true},
  'bilund': {hasAirport:true, limited:true},
  'arhus': {hasAirport:true, limited:true},
  'bornholm': {hasAirport:true, limited:true},
  'esbjerg': {hasAirport:true, limited:true},
  // --- Danska: bez sopstvenog aerodroma ---
  'odense': {nearest:'Bilund', note:'Odense nema svoj aerodrom sa redovnim letovima — najbliži je Bilund (oko 1h vožnje).', c:'Odense', k:'sched', t:'1h'},
  'roskilde': {nearest:'Kopenhagen', note:'Roskilde nema svoj aerodrom sa redovnim letovima — najbliži je Kopenhagen (oko 30 min vožnje).', c:'Roskilde', k:'sched', t:'30 min'},
  'helsingor': {nearest:'Kopenhagen', note:'Helsingor nema svoj aerodrom — najbliži je Kopenhagen (oko 45 min vožnje).', c:'Helsingor', k:'own', t:'45 min'},
  'skagen': {nearest:'Olborg', note:'Skagen nema aerodrom — najbliži je Ålborg (oko 1h vožnje). Može i vozom iz Kopenhagena (4-5h).', c:'Skagen', k:'own', t:'1h'},
  'ribe': {nearest:'Bilund', note:'Ribe (najstariji grad Danske) nema aerodrom — najbliži je Billund (oko 1h). Esbjerg je alternativa.', c:'Ribe', k:'own', t:'1h'},
  'silkeborg': {nearest:'Arhus', note:'Silkeborg i Silkeborg jezera — najbliži aerodrom Aarhus (oko 45 min vožnje) ili Billund (45 min).', c:'Silkeborg', k:'own', t:'45 min'},
  'faroe ostrva': {nearest:'Kopenhagen', note:'Farska ostrva imaju aerodrom Vágar — direktnih letova iz Srbije nema. Presedanje u Kopenhagenu (Atlantic Airways ili SAS).', c:'Faroe ostrva', k:'sched', t:'2h od CPH'},
  'bornholm': {nearest:'Kopenhagen', note:'Bornholm ima aerodrom Rønne — letovi iz Kopenhagena (25 min) ili trajektom iz Malmea (1h20min). Iz Srbije via Kopenhagen.', c:'Bornholm', k:'sched', t:'25 min od CPH'},
  'gudena': {nearest:'Arhus', note:'Reka Gudenå — polazišta u okolini Silkeborgа i Randers, iz Arusa (45 min vožnje).', c:'Gudenå', k:'own', t:'45 min'},
  // --- Finska: dodatni aerodromi ---
  'tampere': {hasAirport:true, limited:true},
  'turku': {hasAirport:true, limited:true},
  'rovanijemi': {hasAirport:true, limited:true},
  'ulu': {hasAirport:true, limited:true},
  'vaasa': {hasAirport:true, limited:true},
  'kuopio': {hasAirport:true, limited:true},
  'ivalo': {hasAirport:true, limited:true},
  // --- Finska: bez sopstvenog aerodroma ---
  'lahti': {nearest:'Helsinki', note:'Lahti nema svoj aerodrom — najbliži je Helsinki (oko 1h vožnje).', c:'Lahti', k:'own', t:'1h'},
  // --- Švajcarska: dodatni aerodromi ---
  'bazel': {hasAirport:true, limited:true},
  'bern': {hasAirport:true, limited:true},
  'lugano': {hasAirport:true, limited:true},
  // --- Švajcarska: bez sopstvenog aerodroma ---
  'sankt moric': {nearest:'Cirih', note:'Sankt Moric nema komercijalni aerodrom — najbliži je Cirih (oko 3h vožnje).', c:'Sankt Moric', k:'comm', t:'3h'},
  'lucern': {nearest:'Cirih', note:'Lucern nema svoj aerodrom — najbliži je Cirih (oko 50 min vožnje).', c:'Lucern', k:'own', t:'50 min'},
  'interlaken': {nearest:'Bern', note:'Interlaken nema svoj aerodrom — najbliži je Bern (oko 1h vožnje), Cirih je alternativa.', c:'Interlaken', k:'own', t:'1h', alt:'Cirih'},
  'cermat': {nearest:'Ženeva', note:'Cermat nema svoj aerodrom — najbliži je Ženeva (oko 3h vožnje).', c:'Cermat', k:'own', t:'3h'},
  'sen moric': {nearest:'Cirih', note:'Sen Moric nema svoj aerodrom — najbliži je Cirih (oko 3h vožnje), ima i mali lokalni aerodrom za privatne letove.', c:'Sen Moric', k:'own', t:'3h'},
  'verbije': {nearest:'Ženeva', note:'Verbije nema svoj aerodrom — najbliži je Ženeva (oko 2h vožnje).', c:'Verbije', k:'own', t:'2h'},
  'davos': {nearest:'Cirih', note:'Davos nema svoj aerodrom — najbliži je Cirih (oko 2h vožnje).', c:'Davos', k:'own', t:'2h'},
  'grindelvald': {nearest:'Bern', note:'Grindelvald nema svoj aerodrom — najbliži je Bern (oko 1h15 vožnje), Cirih je alternativa.', c:'Grindelvald', k:'own', t:'1h15', alt:'Cirih'},
  // --- Mađarska: dodatni aerodromi ---
  'debrecin': {hasAirport:true, limited:true},
  // --- Rusija: aerodromi ---
  'moskva': {hasAirport:true},
  'sanktpeterburg': {hasAirport:true},
  'soci': {hasAirport:true, limited:true},
  'kalinjingrad': {hasAirport:true, limited:true},
  'kazanj': {hasAirport:true, limited:true},
  'krasnodar': {hasAirport:true, limited:true},
  'jekaterinburg': {hasAirport:true, limited:true},
  'novosibirsk': {hasAirport:true, limited:true},
  'vladivostok': {hasAirport:true, limited:true},
  'niznji novgorod': {hasAirport:true, limited:true},
  'samara': {hasAirport:true, limited:true},
  'rostov na donu': {hasAirport:true, limited:true},
  'ufa': {hasAirport:true, limited:true},
  'krasnojarsk': {hasAirport:true, limited:true},
  'irkutsk': {hasAirport:true, limited:true},
  'volgograd': {hasAirport:true, limited:true},
  'perm': {hasAirport:true, limited:true},
  'voronjez': {hasAirport:true, limited:true},
  'petrozavodsk': {hasAirport:true, limited:true},
  'ulan-ude': {hasAirport:true, limited:true},
  'petropavlovsk-kamcatski': {hasAirport:true, limited:true},
  'murmansk': {hasAirport:true, limited:true},
  'arhangelsk': {hasAirport:true, limited:true},
  'mineralne vode': {hasAirport:true, limited:true},
  'anapa': {hasAirport:true, limited:true},
  'gelendzik': {hasAirport:true, limited:true},
  'gorno-altajsk': {hasAirport:true, limited:true},
  'pskov': {hasAirport:true, limited:true},
  // --- Rusija: manja mesta bez sopstvenog aerodroma ---
  'suzdalj': {nearest:'Moskva', note:'Suzdalj nema svoj aerodrom — najbliži je Moskva (oko 3h30 vožnje).', c:'Suzdalj', k:'own', t:'3h30'},
  'vladimir': {nearest:'Moskva', note:'Vladimir nema svoj aerodrom — najbliži je Moskva (oko 2h30 vožnje).', c:'Vladimir', k:'own', t:'2h30'},
  'jaroslavlj': {nearest:'Moskva', note:'Jaroslavlj nema redovne komercijalne letove — najbliži veći aerodrom je Moskva (oko 3h vožnje).', c:'Jaroslavlj', k:'own', t:'3h'},
  'kostroma': {nearest:'Jaroslavlj', note:'Kostroma nema redovne komercijalne letove — najbliži veći grad sa aerodromom je Jaroslavlj (oko 1h30 vožnje).', c:'Kostroma', k:'own', t:'1h30'},
  'rostov veliki': {nearest:'Jaroslavlj', note:'Rostov Veliki nema svoj aerodrom — najbliži je Jaroslavlj (oko 1h vožnje).', c:'Rostov Veliki', k:'own', t:'1h'},
  'pereslavlj-zaleski': {nearest:'Moskva', note:'Pereslavlj-Zaleski nema svoj aerodrom — najbliži je Moskva (oko 2h vožnje).', c:'Pereslavlj-Zaleski', k:'own', t:'2h'},
  'sergijev posad': {nearest:'Moskva', note:'Sergijev Posad nema svoj aerodrom — najbliži je Moskva (oko 1h15 vožnje).', c:'Sergijev Posad', k:'own', t:'1h15'},
  'uglic': {nearest:'Jaroslavlj', note:'Uglič nema svoj aerodrom — najbliži je Jaroslavlj (oko 1h30 vožnje).', c:'Uglič', k:'own', t:'1h30'},
  'kolomna': {nearest:'Moskva', note:'Kolomna nema svoj aerodrom — najbliži je Moskva (oko 1h30 vožnje).', c:'Kolomna', k:'own', t:'1h30'},
  'zvenigorod': {nearest:'Moskva', note:'Zvenigorod nema svoj aerodrom — najbliži je Moskva (oko 1h vožnje).', c:'Zvenigorod', k:'own', t:'1h'},
  'tver': {nearest:'Moskva', note:'Tver nema svoj aerodrom — najbliži je Moskva (oko 2h30 vožnje).', c:'Tver', k:'own', t:'2h30'},
  'smolensk': {nearest:'Moskva', note:'Smolensk nema redovne komercijalne letove — najbliži veći aerodrom je Moskva (oko 4h vožnje).', c:'Smolensk', k:'own', t:'4h'},
  'veliki novgorod': {nearest:'Sankt Peterburg', note:'Veliki Novgorod nema redovne komercijalne letove — najbliži je Sankt Peterburg (oko 2h30 vožnje).', c:'Veliki Novgorod', k:'own', t:'2h30'},
  'vyborg': {nearest:'Sankt Peterburg', note:'Vyborg nema svoj aerodrom — najbliži je Sankt Peterburg (oko 2h vožnje).', c:'Vyborg', k:'own', t:'2h'},
  'petergof': {nearest:'Sankt Peterburg', note:'Petergof nema svoj aerodrom — najbliži je Sankt Peterburg (oko 40 min vožnje).', c:'Petergof', k:'own', t:'40 min'},
  'puskin': {nearest:'Sankt Peterburg', note:'Puškin (Carsko Selo) nema svoj aerodrom — najbliži je Sankt Peterburg (oko 30 min vožnje).', c:'Puškin', k:'own', t:'30 min'},
  'kronstat': {nearest:'Sankt Peterburg', note:'Kronštat nema svoj aerodrom — najbliži je Sankt Peterburg (oko 45 min vožnje).', c:'Kronštat', k:'own', t:'45 min'},
  // --- Rusija: planine i banje (bez sopstvenog aerodroma) ---
  'elbrus': {nearest:'Mineralne Vode', note:'Elbrus nema aerodrom u blizini — najbliži je Mineralne Vode (oko 3h vožnje).', c:'Elbrus', k:'nearby', t:'3h'},
  'dombaj': {nearest:'Mineralne Vode', note:'Dombaj nema svoj aerodrom — najbliži je Mineralne Vode (oko 3h vožnje).', c:'Dombaj', k:'own', t:'3h'},
  'sereges': {nearest:'Novokuznjeck', note:'Šeregeš nema svoj aerodrom — najbliži je Novokuznjeck (oko 2h30 vožnje).', c:'Šeregeš', k:'own', t:'2h30'},
  'pjatigorsk': {nearest:'Mineralne Vode', note:'Pjatigorsk nema svoj aerodrom — najbliži je Mineralne Vode (oko 25 min vožnje).', c:'Pjatigorsk', k:'own', t:'25 min'},
  'kislovodsk': {nearest:'Mineralne Vode', note:'Kislovodsk nema svoj aerodrom — najbliži je Mineralne Vode (oko 40 min vožnje).', c:'Kislovodsk', k:'own', t:'40 min'},
  'zeleznovodsk': {nearest:'Mineralne Vode', note:'Železnovodsk nema svoj aerodrom — najbliži je Mineralne Vode (oko 30 min vožnje).', c:'Železnovodsk', k:'own', t:'30 min'},
  'jesentuki': {nearest:'Mineralne Vode', note:'Jesentuki nema svoj aerodrom — najbliži je Mineralne Vode (oko 20 min vožnje).', c:'Jesentuki', k:'own', t:'20 min'},
  // --- Rusija: jezera i primorska mesta (bez sopstvenog aerodroma) ---
  'bajkalsko jezero': {nearest:'Irkutsk', note:'Bajkalsko jezero nema aerodrom u blizini — najbliži je Irkutsk (oko 1h15 vožnje do zapadne obale).', c:'Bajkalsko jezero', k:'nearby', t:'1h15'},
  'listvjanka': {nearest:'Irkutsk', note:'Listvjanka nema svoj aerodrom — najbliži je Irkutsk (oko 1h15 vožnje).', c:'Listvjanka', k:'own', t:'1h15'},
  'olhon ostrvo': {nearest:'Irkutsk', note:'Olhon ostrvo nema aerodrom u blizini — najbliži je Irkutsk (oko 5-6h vožnje i trajektom).', c:'Olhon ostrvo', k:'nearby', t:'5-6h'},
  'ladosko jezero': {nearest:'Sankt Peterburg', note:'Ladoško jezero nema aerodrom u blizini — najbliži je Sankt Peterburg (oko 1h30 vožnje).', c:'Ladoško jezero', k:'nearby', t:'1h30'},
  'onjesko jezero': {nearest:'Petrozavodsk', note:'Onješko jezero nema aerodrom u blizini — najbliži je Petrozavodsk (oko 30 min vožnje).', c:'Onješko jezero', k:'nearby', t:'30 min'},
  'teletsko jezero': {nearest:'Gorno-Altajsk', note:'Teletsko jezero nema aerodrom u blizini — najbliži je Gorno-Altajsk (oko 3h30 vožnje).', c:'Teletsko jezero', k:'nearby', t:'3h30'},
  'tuapse': {nearest:'Soči', note:'Tuapse nema svoj aerodrom — najbliži je Soči (oko 1h30 vožnje), Krasnodar je alternativa.', c:'Tuapse', k:'own', t:'1h30', alt:'Krasnodar'},
  'svetlogorsk': {nearest:'Kalinjingrad', note:'Svetlogorsk nema svoj aerodrom — najbliži je Kalinjingrad (oko 40 min vožnje).', c:'Svetlogorsk', k:'own', t:'40 min'},
  'zelenogradsk': {nearest:'Kalinjingrad', note:'Zelenogradsk nema svoj aerodrom — najbliži je Kalinjingrad (oko 30 min vožnje).', c:'Zelenogradsk', k:'own', t:'30 min'},
  'kurska kosa': {nearest:'Kalinjingrad', note:'Kurška kosa nema aerodrom u blizini — najbliži je Kalinjingrad (oko 40 min vožnje).', c:'Kurška kosa', k:'nearby', t:'40 min'},
  // --- Ukrajina: vazdušni prostor zatvoren za civilni saobraćaj od feb. 2022,
  //     nema redovnih putničkih letova ni sa jednog ukrajinskog aerodroma dok
  //     traje rat — zato se ovde ne tretiraju kao hasAirport:true, već se
  //     korisniku predlaže najbliži aerodrom u susednoj zemlji. ---
  'kijev': {nearest:'Varsava'},
  'lavov': {nearest:'Zesuv'},
  'odesa': {nearest:'Kisinjev'},
  'harkov': {nearest:'Varsava'},
  // --- Čile: aerodromi ---
  'santiago': {hasAirport:true},
  'konsepsion': {hasAirport:true, limited:true},
  'la serena': {hasAirport:true, limited:true},
  'puerto montt': {hasAirport:true, limited:true},
  'punta arenas': {hasAirport:true, limited:true},
  'antofagasta': {hasAirport:true, limited:true},
  'ikike': {hasAirport:true, limited:true},
  'arika': {hasAirport:true, limited:true},
  'kalama': {hasAirport:true, limited:true},
  'temuko': {hasAirport:true, limited:true},
  'uskrsnje ostrvo': {hasAirport:true, limited:true},
  // --- Čile: bez sopstvenog aerodroma ---
  'pukon': {nearest:'Temuko', note:'Pukon nema svoj aerodrom — najbliži je Temuko (oko 1h vožnje).', c:'Pukon', k:'own', t:'1h'},
  'san pedro de atakama': {nearest:'Kalama', note:'San Pedro de Atakama nema svoj aerodrom — najbliži je Kalama (oko 1h30 vožnje).', c:'San Pedro de Atakama', k:'own', t:'1h30'},
  'puerto varas': {nearest:'Puerto Montt', note:'Puerto Varas nema svoj aerodrom — najbliži je Puerto Montt (oko 30 min vožnje).', c:'Puerto Varas', k:'own', t:'30 min'},
  'viljarika': {nearest:'Temuko', note:'Viljarika nema svoj aerodrom — najbliži je Temuko (oko 1h15 vožnje).', c:'Viljarika', k:'own', t:'1h15'},
  'ciloe': {nearest:'Puerto Montt', note:'Čiloe nema svoj aerodrom — najbliži je Puerto Montt (oko 1h vožnje plus trajekt).', c:'Čiloe', k:'own', t:'1h + trajekt'},
  'terme pujehue': {nearest:'Puerto Montt', note:'Terme Pujehue nemaju svoj aerodrom — najbliži je Puerto Montt (oko 2h vožnje).', c:'Terme Pujehue', k:'own', t:'2h'},
  'terme ciljan': {nearest:'Konsepsion', note:'Terme Čiljan nemaju svoj aerodrom — najbliži je Konsepsion (oko 2h vožnje).', c:'Terme Čiljan', k:'own', t:'2h'},
  'terme kolina': {nearest:'Santiago', note:'Terme Kolina nemaju svoj aerodrom — najbliži je Santiago (oko 1h30 vožnje).', c:'Terme Kolina', k:'own', t:'1h30'},
  'vale nevado': {nearest:'Santiago', note:'Vale Nevado nema svoj aerodrom — najbliži je Santiago (oko 1h vožnje).', c:'Vale Nevado', k:'own', t:'1h'},
  'vulkan viljarika': {nearest:'Temuko', note:'Vulkan Viljarika nema aerodrom u blizini — najbliži je Temuko (oko 1h15 vožnje).', c:'Vulkan Viljarika', k:'nearby', t:'1h15'},
  'portiljo': {nearest:'Santiago', note:'Portiljo nema svoj aerodrom — najbliži je Santiago (oko 2h vožnje).', c:'Portiljo', k:'own', t:'2h'},
  'jezero ljankiue': {nearest:'Puerto Montt', note:'Jezero Ljankiue nema aerodrom u blizini — najbliži je Puerto Montt (oko 45 min vožnje).', c:'Jezero Ljankiue', k:'nearby', t:'45 min'},
  'jezero viljarika': {nearest:'Temuko', note:'Jezero Viljarika nema aerodrom u blizini — najbliži je Temuko (oko 1h15 vožnje).', c:'Jezero Viljarika', k:'nearby', t:'1h15'},
  'jezero djeneral karera': {nearest:'Puerto Montt', note:'Jezero Đeneral Karera nema aerodrom u blizini — najbliži je Puerto Montt (oko 8h vožnje, region se najčešće obilazi preko lokalnih letova).', c:'Jezero Đeneral Karera', k:'nearby', t:'8h'},
  'jezero todos los santos': {nearest:'Puerto Montt', note:'Jezero Todos los Santos nema aerodrom u blizini — najbliži je Puerto Montt (oko 1h vožnje).', c:'Jezero Todos los Santos', k:'nearby', t:'1h'},
  'tores del pajne': {nearest:'Punta Arenas', note:'Tores del Pajne nemaju aerodrom u blizini — najbliži je Punta Arenas (oko 5h vožnje).', c:'Tores del Pajne', k:'nearby', t:'5h'},
  'dolina meseca': {nearest:'Kalama', note:'Dolina Meseca nema svoj aerodrom — najbliži je Kalama (oko 1h30 vožnje).', c:'Dolina Meseca', k:'own', t:'1h30'},
  'atakama pustinja': {nearest:'Kalama', note:'Atakama pustinja nema aerodrom u blizini — najbliži je Kalama (oko 1h30 vožnje).', c:'Atakama pustinja', k:'nearby', t:'1h30'},
  'valparaiso': {nearest:'Santiago', note:'Valparaiso nema svoj aerodrom — najbliži je Santiago (oko 1h15 vožnje).', c:'Valparaiso', k:'own', t:'1h15'},
  'vinja del mar': {nearest:'Santiago', note:'Vinja del Mar nema svoj aerodrom — najbliži je Santiago (oko 1h15 vožnje), Valparaiso je alternativa.', c:'Vinja del Mar', k:'own', t:'1h15', alt:'Valparaiso'},
  'picilemu': {nearest:'Santiago', note:'Pičilemu nema svoj aerodrom — najbliži je Santiago (oko 3h vožnje).', c:'Pičilemu', k:'own', t:'3h'},
  // --- Indija, Indonezija, Šri Lanka, Brazil, Kolumbija, Ekvador: glavni hub-ovi ---
  'nju delhi': {hasAirport:true},
  'mumbaj': {hasAirport:true},
  'goa': {hasAirport:true, limited:true},
  'bali': {hasAirport:true},
  'dzakarta': {hasAirport:true},
  'kolombo': {hasAirport:true},
  'rio de zaneiro': {hasAirport:true},
  'sao paulo': {hasAirport:true},
  'bogota': {hasAirport:true},
  'kartahena': {hasAirport:true, limited:true},
  'kito': {hasAirport:true},
  'galapagos ostrva': {hasAirport:true, limited:true},
  'san hoze': {hasAirport:true},
  'liberija (kostarika)': {hasAirport:true, limited:true},
  'havana': {hasAirport:true},
  'varadero': {hasAirport:true, limited:true},
  'punta kana': {hasAirport:true, limited:true},
  'santo domingo': {hasAirport:true},
  'puerto plata': {hasAirport:true, limited:true},
  'samana': {hasAirport:true, limited:true},
  // --- Brazil: dodatni aerodromi ---
  'vodopadi iguasu': {hasAirport:true, limited:true},
  'salvador': {hasAirport:true},
  'florijanopolis': {hasAirport:true, limited:true},
  'manaus': {hasAirport:true},
  'brazilija': {hasAirport:true},
  'fortaleza': {hasAirport:true, limited:true},
  'resife': {hasAirport:true, limited:true},
  // --- Argentina: dodatni aerodromi ---
  'bariloce': {hasAirport:true, limited:true},
  'mendoza': {hasAirport:true, limited:true},
  'iguasu (argentina)': {hasAirport:true, limited:true},
  'usuaja': {hasAirport:true, limited:true},
  'el kalafate': {hasAirport:true, limited:true},
  'salta': {hasAirport:true, limited:true},
  'kordoba': {hasAirport:true, limited:true},
  // --- Kolumbija: dodatni aerodromi ---
  'medeljin': {hasAirport:true},
  'san andres': {hasAirport:true, limited:true},
  'santa marta': {hasAirport:true, limited:true},
  // --- Peru: dodatni aerodromi ---
  'arekipa': {hasAirport:true, limited:true},
  // --- Peru: bez sopstvenog aerodroma ---
  'puno': {nearest:'Hulijaka', note:'Puno nema svoj aerodrom — najbliži je Hulijaka (oko 1h vožnje).', c:'Puno', k:'own', t:'1h'},
  'ika-uakacina': {nearest:'Lima', note:'Ika i Uakačina nemaju svoj aerodrom — najbliži je Lima (oko 4h vožnje).', c:'Ika-Uakačina', k:'own', t:'4h'},
  'naska linije': {nearest:'Ika-Uakačina', note:'Naska linije nemaju aerodrom u blizini — obično se stiže iz Ike ili Lime (oko 3h vožnje od Lime, panoramski let iz Nazce).', c:'Naska linije', k:'nearby', t:'3h'},
  // --- Kostarika i Panama: bez sopstvenog aerodroma ---
  'manuel antonio': {nearest:'San Hoze', note:'Manuel Antonio nema veliki aerodrom — najbliži je San Hoze (oko 3h vožnje), postoji i mali lokalni aerodrom u Kiposu.', c:'Manuel Antonio', k:'own', t:'3h'},
  'montverde': {nearest:'San Hoze', note:'Montverde nema svoj aerodrom — najbliži je San Hoze (oko 3h vožnje).', c:'Montverde', k:'own', t:'3h'},
  'arenal-la fortuna': {nearest:'San Hoze', note:'Arenal/La Fortuna nema svoj aerodrom — najbliži je San Hoze (oko 3h vožnje), Liberija je alternativa.', c:'Arenal-La Fortuna', k:'own', t:'3h', alt:'Liberija (Kostarika)'},
  'tamarindo': {nearest:'Liberija (Kostarika)', note:'Tamarindo ima mali aerodrom sa ograničenim letovima — najbliži veći je Liberija (oko 1h vožnje).', c:'Tamarindo', k:'nearby', t:'1h'},
  'bokas del toro': {hasAirport:true, limited:true},
  'san blas ostrva': {nearest:'Panama Siti', note:'San Blas ostrva nemaju veliki aerodrom — obično se stiže malim avionom iz Panama Sitija (oko 30 min leta).', c:'San Blas ostrva', k:'nearby', t:'30 min'},
  // --- Kuba: bez sopstvenog aerodroma ---
  'trinidad (kuba)': {nearest:'Havana', note:'Trinidad nema svoj aerodrom — najbliži je Havana (oko 5h vožnje), Santa Klara je bliža regionalna opcija.', c:'Trinidad (Kuba)', k:'own', t:'5h'},
  'vinjales': {nearest:'Havana', note:'Vinjales nema svoj aerodrom — najbliži je Havana (oko 3h vožnje).', c:'Vinjales', k:'own', t:'3h'},
  // --- Jamajka: bez sopstvenog aerodroma ---
  'negril': {nearest:'Montego Bej', note:'Negril nema svoj aerodrom — najbliži je Montego Bej (oko 1h30 vožnje).', c:'Negril', k:'own', t:'1h30'},
  'oco rios': {nearest:'Montego Bej', note:'Očo Rios nema svoj aerodrom — najbliži je Montego Bej (oko 1h30 vožnje).', c:'Očo Rios', k:'own', t:'1h30'},
  // --- Tajland: aerodromi ---
  'bangkok': {hasAirport:true},
  'puket': {hasAirport:true},
  'cijang maj': {hasAirport:true},
  'cijang raj': {hasAirport:true, limited:true},
  'krabi': {hasAirport:true, limited:true},
  'ko samui': {hasAirport:true, limited:true},
  'pataja': {hasAirport:true, limited:true},
  'hua hin': {hasAirport:true, limited:true},
  'sukotaj': {hasAirport:true, limited:true},
  // --- Tajland: bez sopstvenog aerodroma ---
  'ajutaja': {nearest:'Bangkok', note:'Ajutaja nema svoj aerodrom — najbliži je Bangkok (oko 1h15 vožnje).', c:'Ajutaja', k:'own', t:'1h15'},
  'ko pangan': {nearest:'Ko Samui', note:'Ko Pangan nema svoj aerodrom — najbliži je Ko Samui (trajektom, oko 30 min).', c:'Ko Pangan', k:'own', t:'30 min'},
  'ko tao': {nearest:'Ko Samui', note:'Ko Tao nema svoj aerodrom — najbliži je Ko Samui (trajektom, oko 1h30).', c:'Ko Tao', k:'own', t:'1h30'},
  'ko pi pi': {nearest:'Krabi', note:'Ko Pi Pi nema svoj aerodrom — najbliži je Krabi (trajektom, oko 1h30), Puket je alternativa.', c:'Ko Pi Pi', k:'own', t:'1h30', alt:'Puket'},
  'ko lanta': {nearest:'Krabi', note:'Ko Lanta nema svoj aerodrom — najbliži je Krabi (oko 2h, vožnja i trajekt).', c:'Ko Lanta', k:'own', t:'2h'},
  // --- Australija: aerodromi ---
  'sidnej': {hasAirport:true},
  'melburn': {hasAirport:true},
  'brizbejn': {hasAirport:true},
  'pert': {hasAirport:true},
  'adelejd': {hasAirport:true},
  'gold coast': {hasAirport:true, limited:true},
  'kernz': {hasAirport:true, limited:true},
  'darvin': {hasAirport:true, limited:true},
  'hobart': {hasAirport:true, limited:true},
  'kanbera': {hasAirport:true, limited:true},
  'uluru': {hasAirport:true, limited:true},
  // --- Kina: aerodromi ---
  'peking': {hasAirport:true},
  'sangaj': {hasAirport:true},
  'hongkong': {hasAirport:true},
  'guangdzou': {hasAirport:true},
  'sendzen': {hasAirport:true},
  'cengdu': {hasAirport:true},
  'hangdzou': {hasAirport:true},
  'sian': {hasAirport:true, limited:true},
  'guilin': {hasAirport:true, limited:true},
  'makao': {hasAirport:true, limited:true},
  'lasa': {hasAirport:true, limited:true},
  // --- Belorusija, Moldavija, Jermenija, Centralna Azija: aerodromi ---
  'minsk': {hasAirport:true},
  'jerevan': {hasAirport:true},
  'almati': {hasAirport:true},
  'astana': {hasAirport:true},
  'taskent': {hasAirport:true},
  'samarkand': {hasAirport:true, limited:true},
  'buhara': {hasAirport:true, limited:true},
  'biskek': {hasAirport:true},
  'ulan bator': {hasAirport:true},
  // --- Belorusija, Jermenija, Kirgistan, Butan: bez sopstvenog aerodroma ---
  'jezero sevan': {nearest:'Jerevan', note:'Jezero Sevan nema aerodrom u blizini — najbliži je Jerevan (oko 1h vožnje).', c:'Jezero Sevan', k:'nearby', t:'1h'},
  'jezero isik-kulj': {nearest:'Biškek', note:'Jezero Isik-kulj nema aerodrom u blizini — najbliži je Biškek (oko 3h vožnje).', c:'Jezero Isik-kulj', k:'nearby', t:'3h'},
  'timpu': {nearest:'Paro', note:'Timpu nema svoj aerodrom — najbliži je Paro, jedini međunarodni aerodrom Butana (oko 1h vožnje).', c:'Timpu', k:'own', t:'1h'},
  // --- Južna Azija, Jugoistočna Azija: aerodromi ---
  'islamabad': {hasAirport:true},
  'lahore': {hasAirport:true},
  'karaci': {hasAirport:true},
  'daka': {hasAirport:true},
  'jangon': {hasAirport:true},
  'bagan': {hasAirport:true, limited:true},
  'vijentijan': {hasAirport:true},
  'luang prabang': {hasAirport:true, limited:true},
  // --- Okeanija, Grenland: aerodromi ---
  'nadi': {hasAirport:true},
  'suva': {hasAirport:true, limited:true},
  'apija': {hasAirport:true},
  'tahiti': {hasAirport:true, limited:true},
  'bora bora': {hasAirport:true, limited:true},
  'port morsbi': {hasAirport:true},
  'nuk': {hasAirport:true, limited:true},
  // --- Južna Amerika: aerodromi ---
  'montevideo': {hasAirport:true},
  'punta del este': {hasAirport:true, limited:true},
  'la paz': {hasAirport:true},
  'sukre': {hasAirport:true, limited:true},
  'salar de ujuni': {hasAirport:true, limited:true},
  'asunsion': {hasAirport:true},
  'karakas': {hasAirport:true},
  // --- Južna Amerika: bez sopstvenog aerodroma ---
  'angelski slap': {nearest:'Karakas', note:'Angelski slap nema aerodrom u blizini — obično se stiže unutrašnjim letom preko Sijudad Bolivara (oko 1h leta od Karakasa).', c:'Angelski slap', k:'nearby', t:'1h'},
  // --- Centralna Amerika i Karibi: aerodromi ---
  'panama siti': {hasAirport:true},
  'gvatemala siti': {hasAirport:true},
  'belize siti': {hasAirport:true},
  'roatan': {hasAirport:true, limited:true},
  'kingston': {hasAirport:true},
  'montego bej': {hasAirport:true},
  'nasau': {hasAirport:true},
  'bridztaun': {hasAirport:true},
  'san huan': {hasAirport:true},
  // --- Centralna Amerika: bez sopstvenog aerodroma ---
  'antigva gvatemala': {nearest:'Gvatemala Siti', note:'Antigva Gvatemala nema svoj aerodrom — najbliži je Gvatemala Siti (oko 1h vožnje).', c:'Antigva Gvatemala', k:'own', t:'1h'},
  'tikal': {nearest:'Flores', note:'Tikal nema aerodrom u blizini — najbliži je Flores/Santa Elena (oko 1h vožnje).', c:'Tikal', k:'nearby', t:'1h'},
  // --- Afrika: aerodromi ---
  'akra': {hasAirport:true},
  'abudza': {hasAirport:true},
  'adis abeba': {hasAirport:true},
  'kigali': {hasAirport:true},
  'gaboron': {hasAirport:true, limited:true},
  'livingston': {hasAirport:true, limited:true},
  'harare': {hasAirport:true, limited:true},
  'maputo': {hasAirport:true, limited:true},
  'alzir': {hasAirport:true, limited:true},
  // --- Afrika: bez sopstvenog aerodroma ---
  'kampala': {nearest:'Entebe', note:'Kampala nema svoj aerodrom — najbliži je Entebe (oko 40 min vožnje).', c:'Kampala', k:'own', t:'40 min'},
  'delta okavango': {nearest:'Maun', note:'Delta Okavango nema aerodrom u blizini — najbliži je Maun, odakle se dalje leti malim avionima do kampova (oko 1h leta).', c:'Delta Okavango', k:'nearby', t:'1h'},
  'vodopadi viktorija': {hasAirport:true, limited:true},
  // --- Bliski istok: aerodromi ---
  'manama': {hasAirport:true},
  'kuvajt siti': {hasAirport:true},
  'dubai': {hasAirport:true},
  'abu dabi': {hasAirport:true},
  'doha': {hasAirport:true},
  'rijad': {hasAirport:true},
  'aman': {hasAirport:true},
  'akaba': {hasAirport:true, limited:true},
  'bejrut': {hasAirport:true},
  'muskat': {hasAirport:true},
  // --- Bliski istok: bez sopstvenog aerodroma ---
  'petra': {nearest:'Aman', note:'Petra nema svoj aerodrom — najbliži je Aman (oko 3h vožnje), Akaba je alternativa.', c:'Petra', k:'own', t:'3h', alt:'Akaba'},
  // --- Egipat: aerodromi ---
  'kairo': {hasAirport:true},
  'sarm el seik': {hasAirport:true, limited:true},
  'hurgada': {hasAirport:true, limited:true},
  'luksor': {hasAirport:true, limited:true},
  // --- Maroko: aerodromi ---
  'marakes': {hasAirport:true},
  'kazablanka': {hasAirport:true},
  'rabat': {hasAirport:true, limited:true},
  'tanger': {hasAirport:true, limited:true},
  // --- Tunis: aerodromi ---
  'tunis grad': {hasAirport:true},
  'monastir': {hasAirport:true, limited:true},
  'djerba': {hasAirport:true, limited:true},
  // --- Tunis: bez sopstvenog aerodroma ---
  'hamamet': {nearest:'Monastir', note:'Hamamet nema svoj aerodrom — najbliži je Monastir (oko 45 min vožnje), Tunis (grad) je alternativa.', c:'Hamamet', k:'own', t:'45 min', alt:'Tunis grad'},
  'sus': {nearest:'Monastir', note:'Sus nema svoj aerodrom — najbliži je Monastir (oko 20 min vožnje).', c:'Sus', k:'own', t:'20 min'},
  // --- Istočna Afrika: aerodromi ---
  'najrobi': {hasAirport:true},
  'tel aviv': {hasAirport:true},
  // --- Izrael: bez sopstvenog aerodroma ---
  'jerusalim': {nearest:'Tel Aviv', note:'Jerusalim nema svoj aerodrom — najbliži je Tel Aviv (oko 45 min vožnje).', c:'Jerusalim', k:'own', t:'45 min'},
  'mrtvo more': {nearest:'Tel Aviv', note:'Mrtvo More nema aerodrom u blizini — najbliži je Tel Aviv (oko 1h30 vožnje), Aman (Jordan) je alternativa sa druge obale.', c:'Mrtvo More', k:'nearby', t:'1h30', alt:'Aman'},
  'kilimandzaro': {hasAirport:true, limited:true},
  // --- Ikonične svetske znamenitosti: bez sopstvenog aerodroma ---
  'agra (tadz mahal)': {nearest:'Nju Delhi', note:'Agra (Tadž Mahal) nema veliki aerodrom — najbliži je Nju Delhi (oko 4h vožnje, ili voz za oko 2h).', c:'Agra (Tadž Mahal)', k:'own', t:'4h'},
  'kineski zid': {nearest:'Peking', note:'Kineski zid nema aerodrom u blizini — najbliži je Peking (oko 1h30 vožnje, deonica Badaling/Mutianju).', c:'Kineski zid', k:'nearby', t:'1h30'},
  'lukla': {nearest:'Katmandu', note:'Lukla ima mali aerodrom (jedan od najizazovnijih na svetu) sa letovima iz Katmandua (oko 35 min leta).', c:'Lukla', k:'nearby', t:'35 min leta'},
  'everest baza kamp': {nearest:'Lukla', note:'Everest baza kamp nema aerodrom u blizini — polazna tačka je Lukla (odatle višednevni trek), do koje se stiže letom iz Katmandua.', c:'Everest baza kamp', k:'nearby', t:'35 min leta + trek'},
  'stonehendz': {nearest:'London', note:'Stonehendž nema aerodrom u blizini — najbliži je London (oko 2h vožnje), Bristol je alternativa.', c:'Stonehendž', k:'nearby', t:'2h', alt:'Bristol'},
  'veliki koralni greben': {nearest:'Kernz', note:'Veliki Koralni Greben nema sopstveni aerodrom — najbliži je Kernz (Cairns), odakle polaze izleti na greben.', c:'Veliki Koralni Greben', k:'nearby', t:'30 min brodom'},
  'serengeti': {nearest:'Kilimandžaro', note:'Nacionalni park Serengeti nema veliki aerodrom u blizini — najbliži veći je Kilimandžaro (oko 4h vožnje), postoje i mali safari aerodromi u parku.', c:'Serengeti', k:'nearby', t:'4h'},
  'sahara (merzuga)': {nearest:'Marakeš', note:'Sahara (Merzuga) nema aerodrom u blizini — najbliži je Marakeš (oko 8h vožnje), Fes je bliža alternativa.', c:'Sahara (Merzuga)', k:'nearby', t:'8h', alt:'Fes'},
  'zanzibar': {hasAirport:true, limited:true},
  'mahe': {hasAirport:true, limited:true},
  // --- Severna Amerika: aerodromi ---
  'njujork': {hasAirport:true},
  'majami': {hasAirport:true},
  'los andjeles': {hasAirport:true},
  'las vegas': {hasAirport:true},
  'cikago': {hasAirport:true},
  'san francisko': {hasAirport:true},
  'boston': {hasAirport:true},
  'vasington': {hasAirport:true},
  'orlando': {hasAirport:true},
  'honolulu': {hasAirport:true},
  'filadelfija': {hasAirport:true, limited:true},
  'sijetl': {hasAirport:true},
  'denver': {hasAirport:true},
  'atlanta': {hasAirport:true},
  'nju orleans': {hasAirport:true},
  'nesvil': {hasAirport:true},
  'san dijego': {hasAirport:true},
  'ostin': {hasAirport:true},
  'dalas': {hasAirport:true},
  'hjuston': {hasAirport:true},
  'feniks': {hasAirport:true},
  'portland': {hasAirport:true},
  'maui': {hasAirport:true, limited:true},
  'aspen': {hasAirport:true, limited:true},
  'vejl': {hasAirport:true, limited:true},
  'dzekson houl': {hasAirport:true, limited:true},
  // --- SAD: bez sopstvenog aerodroma (ski) ---
  'park siti': {nearest:'Solt Lejk Siti', note:'Park Siti nema svoj aerodrom — najbliži je Solt Lejk Siti (oko 40 min vožnje).', c:'Park Siti', k:'own', t:'40 min'},
  'toronto': {hasAirport:true},
  'vankuver': {hasAirport:true},
  'montreal': {hasAirport:true},
  'otava': {hasAirport:true, limited:true},
  'kvebek siti': {hasAirport:true, limited:true},
  'kalgari': {hasAirport:true},
  // --- Severna Amerika: bez sopstvenog aerodroma ---
  'grand kanjon': {nearest:'Las Vegas', note:'Grand Kanjon nema aerodrom u blizini — najbliži je Las Vegas (oko 4h30 vožnje), Feniks je alternativa.', c:'Grand Kanjon', k:'nearby', t:'4h30', alt:'Feniks'},
  'jeloustoun': {nearest:'Denver', note:'Nacionalni park Jeloustoun nema veliki aerodrom u blizini — najbliži veći je Denver (oko 6h vožnje).', c:'Jeloustoun', k:'nearby', t:'6h'},
  'jozemit': {nearest:'San Francisko', note:'Nacionalni park Jozemit nema aerodrom u blizini — najbliži je San Francisko (oko 4h vožnje).', c:'Jozemit', k:'nearby', t:'4h'},
  'banf': {nearest:'Kalgari', note:'Banf nema svoj aerodrom — najbliži je Kalgari (oko 1h30 vožnje).', c:'Banf', k:'own', t:'1h30'},
  'niagarini vodopadi': {nearest:'Toronto', note:'Niagarini vodopadi nemaju svoj aerodrom — najbliži je Toronto (oko 1h30 vožnje).', c:'Niagarini vodopadi', k:'own', t:'1h30'},
  'vistler': {nearest:'Vankuver', note:'Vistler nema svoj aerodrom — najbliži je Vankuver (oko 2h vožnje).', c:'Vistler', k:'own', t:'2h'},
  // --- Meksiko i Karibi: aerodromi ---
  'meksiko siti': {hasAirport:true},
  'kankun': {hasAirport:true},
  'tulum': {hasAirport:true},
  'kozumel': {hasAirport:true, limited:true},
  'puerto valjarta': {hasAirport:true},
  'los kabos': {hasAirport:true},
  'masatlan': {hasAirport:true, limited:true},
  'akapulko': {hasAirport:true, limited:true},
  'uatulko': {hasAirport:true, limited:true},
  'istapa-sivataneho': {hasAirport:true, limited:true},
  'gvadalahara': {hasAirport:true},
  'monterej': {hasAirport:true},
  'oahaka': {hasAirport:true, limited:true},
  'merida': {hasAirport:true},
  'keretaro': {hasAirport:true, limited:true},
  'zakatekas': {hasAirport:true, limited:true},
  'kampece': {hasAirport:true, limited:true},
  'gvanahvato': {hasAirport:true, limited:true},
  'tukstla gutijeres': {hasAirport:true, limited:true},
  'bilja ermosa': {hasAirport:true, limited:true},
  'čivava': {hasAirport:true, limited:true},
  'četumal': {hasAirport:true, limited:true},
  'leon': {hasAirport:true, limited:true},
  'la pas': {hasAirport:true, limited:true},
  'loreto': {hasAirport:true, limited:true},
  'puerto eskondido': {hasAirport:true, limited:true},
  'tihuana': {hasAirport:true, limited:true},
  'kolima': {hasAirport:true, limited:true},
  // --- Meksiko: bez sopstvenog aerodroma ---
  'plaja del karmen': {nearest:'Kankun', note:'Plaja del Karmen nema svoj aerodrom — najbliži je Kankun (oko 1h vožnje).', c:'Plaja del Karmen', k:'own', t:'1h'},
  'isla muheres': {nearest:'Kankun', note:'Isla Muheres nema svoj aerodrom — najbliži je Kankun (oko 30 min vožnje plus trajekt).', c:'Isla Muheres', k:'own', t:'30 min + trajekt'},
  'holboks': {nearest:'Kankun', note:'Holboks nema svoj aerodrom — najbliži je Kankun (oko 2h vožnje plus trajekt).', c:'Holboks', k:'own', t:'2h + trajekt'},
  'puebla': {nearest:'Meksiko Siti', note:'Puebla nema veliki međunarodni aerodrom — najbliži je Meksiko Siti (oko 2h vožnje).', c:'Puebla', k:'own', t:'2h'},
  'san migel de aljende': {nearest:'Keretaro', note:'San Migel de Aljende nema svoj aerodrom — najbliži je Keretaro (oko 1h15 vožnje), Leon/Gvanahvato je alternativa.', c:'San Migel de Aljende', k:'own', t:'1h15', alt:'Gvanahvato'},
  'morelija': {nearest:'Meksiko Siti', note:'Morelija ima mali regionalni aerodrom sa ograničenim letovima — najbliži veći je Meksiko Siti (oko 3h vožnje).', c:'Morelija', k:'own', t:'3h'},
  'čičen ica': {nearest:'Merida', note:'Čičen Ica nema aerodrom u blizini — najbliži je Merida (oko 1h30 vožnje), Kankun je alternativa.', c:'Čičen Ica', k:'nearby', t:'1h30', alt:'Kankun'},
  'palenke': {nearest:'Bilja Ermosa', note:'Palenke ima mali aerodrom sa vrlo ograničenim letovima — najbliži veći je Bilja Ermosa (oko 2h vožnje).', c:'Palenke', k:'nearby', t:'2h'},
  'san kristobal de las kasas': {nearest:'Tukstla Gutijeres', note:'San Kristobal de las Kasas nema svoj aerodrom — najbliži je Tukstla Gutijeres (oko 1h vožnje).', c:'San Kristobal de las Kasas', k:'own', t:'1h'},
  'tekila': {nearest:'Gvadalahara', note:'Tekila nema svoj aerodrom — najbliži je Gvadalahara (oko 1h vožnje).', c:'Tekila', k:'own', t:'1h'},
  'taska': {nearest:'Meksiko Siti', note:'Taska nema svoj aerodrom — najbliži je Meksiko Siti (oko 2h30 vožnje).', c:'Taska', k:'own', t:'2h30'},
  'valjadolid': {nearest:'Kankun', note:'Valjadolid nema svoj aerodrom — najbliži je Kankun (oko 2h vožnje), Merida je alternativa.', c:'Valjadolid', k:'own', t:'2h', alt:'Merida'},
  'tepostlan': {nearest:'Meksiko Siti', note:'Tepostlan nema svoj aerodrom — najbliži je Meksiko Siti (oko 1h30 vožnje).', c:'Tepostlan', k:'own', t:'1h30'},
  'real de katorse': {nearest:'Meksiko Siti', note:'Real de Katorse nema aerodrom u blizini — najbliži veći je Meksiko Siti (oko 6h vožnje), San Luis Potosi je bliža regionalna opcija.', c:'Real de Katorse', k:'own', t:'6h'},
  'čolula': {nearest:'Puebla', note:'Čolula nema svoj aerodrom — najbliži je Puebla (oko 20 min vožnje).', c:'Čolula', k:'own', t:'20 min'},
  'sajulita': {nearest:'Puerto Valjarta', note:'Sajulita nema svoj aerodrom — najbliži je Puerto Valjarta (oko 45 min vožnje).', c:'Sajulita', k:'own', t:'45 min'},
  'ensenada': {nearest:'Tihuana', note:'Ensenada nema svoj aerodrom — najbliži je Tihuana (oko 1h30 vožnje).', c:'Ensenada', k:'own', t:'1h30'},
  'todos santos': {nearest:'Los Kabos', note:'Todos Santos nema svoj aerodrom — najbliži je Los Kabos (oko 1h vožnje), La Pas je alternativa.', c:'Todos Santos', k:'own', t:'1h', alt:'La Pas'},
  'valje de bravo': {nearest:'Meksiko Siti', note:'Valje de Bravo nema svoj aerodrom — najbliži je Meksiko Siti (oko 2h vožnje).', c:'Valje de Bravo', k:'own', t:'2h'},
  'jezero pacskuaro': {nearest:'Morelija', note:'Jezero Pacskuaro nema aerodrom u blizini — najbliži je Morelija (oko 1h vožnje).', c:'Jezero Pacskuaro', k:'nearby', t:'1h'},
  'grutas de tolantongo': {nearest:'Meksiko Siti', note:'Grutas de Tolantongo (termalni izvori) nemaju aerodrom u blizini — najbliži je Meksiko Siti (oko 3h vožnje).', c:'Grutas de Tolantongo', k:'nearby', t:'3h'},
  'hierve el agua': {nearest:'Oahaka', note:'Hierve el Agua nema aerodrom u blizini — najbliži je Oahaka (oko 1h vožnje).', c:'Hierve el Agua', k:'nearby', t:'1h'},
  'kabo pulmo': {nearest:'Los Kabos', note:'Kabo Pulmo nema svoj aerodrom — najbliži je Los Kabos (oko 1h15 vožnje).', c:'Kabo Pulmo', k:'own', t:'1h15'},
  'uksmal': {nearest:'Merida', note:'Uksmal nema aerodrom u blizini — najbliži je Merida (oko 1h vožnje).', c:'Uksmal', k:'nearby', t:'1h'},
  'teotivakan': {nearest:'Meksiko Siti', note:'Teotivakan nema aerodrom u blizini — najbliži je Meksiko Siti (oko 1h vožnje).', c:'Teotivakan', k:'nearby', t:'1h'},
  'monte alban': {nearest:'Oahaka', note:'Monte Alban nema aerodrom u blizini — najbliži je Oahaka (oko 20 min vožnje).', c:'Monte Alban', k:'nearby', t:'20 min'},
  'kalakmul': {nearest:'Kampece', note:'Kalakmul nema aerodrom u blizini — najbliži je Kampece (oko 3h vožnje).', c:'Kalakmul', k:'nearby', t:'3h'},
  'kanjon sumidero': {nearest:'Tukstla Gutijeres', note:'Kanjon Sumidero nema aerodrom u blizini — najbliži je Tukstla Gutijeres (oko 30 min vožnje).', c:'Kanjon Sumidero', k:'nearby', t:'30 min'},
  'bakalar': {nearest:'Četumal', note:'Bakalar nema svoj aerodrom — najbliži je Četumal (oko 45 min vožnje).', c:'Bakalar', k:'own', t:'45 min'},
  'čapala jezero': {nearest:'Gvadalahara', note:'Jezero Čapala nema aerodrom u blizini — najbliži je Gvadalahara (oko 45 min vožnje).', c:'Čapala jezero', k:'nearby', t:'45 min'},
  'kanjon bakra': {nearest:'Čivava', note:'Kanjon Bakra (Barranca del Cobre) nema aerodrom u blizini — najbliži je Čivava (oko 4-5h vožnje, ili voz iz El Fuertea).', c:'Kanjon Bakra', k:'nearby', t:'4-5h'},
  'popokatepetl': {nearest:'Meksiko Siti', note:'Popokatepetl nema aerodrom u blizini — najbliži je Meksiko Siti (oko 1h30 vožnje), Puebla je alternativa.', c:'Popokatepetl', k:'nearby', t:'1h30', alt:'Puebla'},
  'ikstasivatl': {nearest:'Meksiko Siti', note:'Ikstasivatl nema aerodrom u blizini — najbliži je Meksiko Siti (oko 1h30 vožnje).', c:'Ikstasivatl', k:'nearby', t:'1h30'},
  'piko de oriaba': {nearest:'Meksiko Siti', note:'Piko de Oriaba nema aerodrom u blizini — najbliži je Meksiko Siti (oko 3h vožnje), Puebla je alternativa.', c:'Piko de Oriaba', k:'nearby', t:'3h', alt:'Puebla'},
  'istapan de la sal': {nearest:'Meksiko Siti', note:'Istapan de la Sal (banjsko mesto) nema svoj aerodrom — najbliži je Meksiko Siti (oko 2h vožnje).', c:'Istapan de la Sal', k:'own', t:'2h'},
  // --- Južna Amerika: dodatni aerodromi ---
  'buenos ajres': {hasAirport:true},
  'lima': {hasAirport:true},
  'kusko': {hasAirport:true, limited:true},
  // --- Južna Amerika: bez sopstvenog aerodroma (dopuna) ---
  'macu picu': {nearest:'Kusko', note:'Maču Pikču nema aerodrom u blizini — najbliži je Kusko (odatle voz/bus do lokacije, oko 1h30 leta iz Lime pa dalje kopnom).', c:'Maču Pikču', k:'nearby', t:'1h30 + voz'},
  // --- Istočna Azija: aerodromi ---
  'tokio': {hasAirport:true},
  'osaka': {hasAirport:true},
  'seul': {hasAirport:true},
  'katmandu': {hasAirport:true},
  // --- Istočna Azija: bez sopstvenog aerodroma ---
  'kjoto': {nearest:'Osaka', note:'Kjoto nema svoj aerodrom — najbliži je Osaka (oko 1h vožnje).', c:'Kjoto', k:'own', t:'1h'},
  // --- Jugoistočna Azija: dodatni aerodromi ---
  'singapur': {hasAirport:true},
  'ho si min': {hasAirport:true},
  'hanoj': {hasAirport:true},
  'kuala lumpur': {hasAirport:true},
  'manila': {hasAirport:true},
  'male': {hasAirport:true}
};
Object.keys(AIRPORT_DB).forEach(k => { AIRPORT_DB[k].slug = k; });
/* Tekst napomene za grad bez aerodroma, na trenutnom jeziku.
   1) Napomene sa posebnom formulacijom žive u *.json pod
      'airport_note.<slug>' (srpski izvor + prevodi; slug = ključ u AIRPORT_DB).
   2) Ostale: srpski koristi originalni info.note; drugi jezici se sklapaju iz
      strukturiranih polja (c = grad, k = vrsta "nema ...", t = vreme vožnje,
      nn = ime aerodroma ako se razlikuje od `nearest`, cc = država,
      alt = alternativa) preko šablona airport_note_tpl. */
function airportNoteText(info){
  if (!info) return '';
  const lang = getLang();
  const special = info.slug ? 'airport_note.' + info.slug : null;
  if (lang === 'sr') return (special && I18N.sr[special]) || info.note || '';
  if (special && I18N[lang] && I18N[lang][special]) return I18N[lang][special];
  if (info.c && info.k && info.t){
    let near = cityLabel(info.nn || info.nearest);
    if (info.cc){
      const ccName = I18N[lang] && I18N[lang]['country_loc.' + info.cc];
      near += ' ' + t('airport_in') + ' ' + (ccName || info.cc);
    }
    return tf('airport_note_tpl', {
      city: cityLabel(info.c),
      lack: t('airport_lack_' + info.k),
      near: near,
      time: driveTimeLabel(info.t),
      alt: info.alt ? tf('airport_note_alt', {alt: cityLabel(info.alt)}) : ''
    });
  }
  return (special && I18N.sr[special]) || info.note || '';
}
/* Nalazi unos u AIRPORT_DB za dati grad (poredi normalizovano ime, dozvoljava
   da grad bude uneto kao deo dužeg stringa, npr. "Bar, Crna Gora"). Vraća null
   za nepoznat/prazan grad — tada se ne nagađa ni na jednu ni na drugu stranu.
   Dodatno: ako korisnik JOŠ KUCA poznat grad (npr. "Suboti" dok kuca
   "Subotica"), a uneto već NEDVOSMISLENO odgovara tačno jednom gradu u bazi,
   upozorenje se prikazuje odmah — ne tek kad se doda i poslednje slovo. Kraći
   unosi koji odgovaraju više gradova (npr. "su" — Subotica i Sutomore) se
   namerno preskaču dok se ne razdvoje, da ne bi lažno pogodili pogrešan grad. */
function airportInfoFor(cityRaw){
  const norm = normalizeSr((cityRaw || '').trim());
  if (!norm) return null;
  // NAPOMENA: ključevi u AIRPORT_DB su ispisani sa dijakritikom (npr.
  // 'rogaška slatina', 'čatež') dok je `norm` uvek BEZ dijakritike
  // (normalizeSr skida š/č/ž/đ/ć). Poređenje mora ići normalizovan-naspram-
  // normalizovanog, inače svaki grad sa dijakritikom u ključu (Rogaška
  // Slatina, Čatež, Laško, Škofja Loka, Portorož, Škocjanske jame...)
  // NIKAD ne pogodi zapis u bazi — vraća se null kao da grad uopšte nije
  // u AIRPORT_DB, pa nestaje i upozorenje o aerodromu i preusmeravanje na
  // najbliži pravi aerodrom (bio je ovo pravi bag, ne samo teorijski slučaj).
  for (const key in AIRPORT_DB){
    const nkey = normalizeSr(key);
    if (norm === nkey || norm.startsWith(nkey + ' ') || norm.startsWith(nkey + ',') || norm.includes(' ' + nkey)){
      return AIRPORT_DB[key];
    }
  }
  if (norm.length >= 4){
    const candidates = Object.keys(AIRPORT_DB).filter(key => normalizeSr(key).startsWith(norm));
    if (candidates.length === 1) return AIRPORT_DB[candidates[0]];
  }
  return null;
}
/* Za grad POLASKA bez aerodroma, vraća STVARNI aerodrom sa kog bi se letelo.
   Za nepoznat/prazan grad vraća uneti tekst nepromenjen (bez nagađanja). */
function realDepartureAirportFor(originRaw){
  const info = airportInfoFor(originRaw);
  if (info && !info.hasAirport && info.nearest) return info.nearest;
  return (originRaw || '').trim();
}
/* Za grad DESTINACIJE bez aerodroma, vraća STVARNI aerodrom na koji bi se
   sletelo (npr. Bar → Tivat). Za nepoznat/prazan grad ili grad koji ima
   sopstveni aerodrom, vraća uneti tekst nepromenjen. */
function realArrivalAirportFor(destRaw){
  const info = airportInfoFor(destRaw);
  if (info && !info.hasAirport && info.nearest) return info.nearest;
  return (destRaw || '').trim();
}
function isLimitedNetworkOrigin(originRaw){
  const info = airportInfoFor(originRaw);
  return !!(info && info.hasAirport && info.limited);
}
/* ==========================================================
   LOGOVANJE PROMAŠAJA AIRPORT_DB — kad korisnik pokrene pretragu sa
   gradom koji baza ne prepoznaje. Beleži se SAMO na submit pretrage
   (ne na svaki taster dok kuca), da log ne bude zatrpan polu-unetim
   tekstom. Uvek se čuva lokalno (localStorage, po uređaju/pretraživaču)
   kao fallback; ako je Supabase podešen (config.js), šalje se i deljeni
   zapis u tabelu 'airport_db_misses' — best-effort, ćuti ako tabela još
   ne postoji (npr. dok se ne napravi u Supabase-u).
   NAMERNO se ne tretira svaki promašaj kao "rupu" u bazi — mnogi su
   očekivani (Rim, Barselona i sl. su van AIRPORT_DB po dizajnu, nisu
   regionalni gradovi bez aerodroma). Vlasnik sajta ručno pregleda listu
   (showAirportDbMisses() u konzoli) i bira šta stvarno vredi dodati.
========================================================== */
const AIRPORT_MISS_STORAGE_KEY = 'sklopi_airport_misses_v1';
const AIRPORT_MISS_STORAGE_CAP = 300; // ne dozvoli da lokalna lista raste unedogled
function loadAirportMisses(){
  try{
    const raw = localStorage.getItem(AIRPORT_MISS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){ return {}; }
}
function saveAirportMisses(misses){
  try{ localStorage.setItem(AIRPORT_MISS_STORAGE_KEY, JSON.stringify(misses)); }catch(e){}
}
function logAirportDbMiss(cityRaw, field){
  const city = (cityRaw || '').trim();
  if (city.length < 3) return; // prekratko/prazno da bi bilo relevantno
  if (airportInfoFor(city)) return; // prepoznat je — nije promašaj
  const norm = normalizeSr(city);
  const misses = loadAirportMisses();
  const key = field + '|' + norm;
  if (!misses[key]) misses[key] = {city, field, count:0};
  misses[key].city = city; // čuvaj poslednji unet oblik (velika/mala slova)
  misses[key].count += 1;
  misses[key].lastSeen = todayStr();
  const keys = Object.keys(misses);
  if (keys.length > AIRPORT_MISS_STORAGE_CAP){
    keys.sort((a,b) => misses[a].count - misses[b].count);
    delete misses[keys[0]]; // kad lista preraste, izbaci najređi zapis
  }
  saveAirportMisses(misses);
  if (typeof sb !== 'undefined' && sb){
    sb.from('airport_db_misses').insert({city, field, normalized:norm})
      .then(({error}) => {
        if (error) console.warn('[sklopi] Deljeno logovanje promašaja AIRPORT_DB nije uspelo (tabela verovatno ne postoji još):', error.message);
      });
  }
}
/* Konzolni prečac za vlasnika sajta: otvori konzolu i pozovi
   showAirportDbMisses() da vidiš koji gradovi (i koliko puta) nisu
   prepoznati — sortirano od najčešćeg ka najređem. */
window.showAirportDbMisses = function(){
  const rows = Object.values(loadAirportMisses()).sort((a,b) => b.count - a.count);
  console.table(rows);
  return rows;
};
/* ==========================================================
   DELJENA LOGIKA CENA/OPISA — koriste je i 3 gotove kartice
   (fetchFlights/fetchHotel/fetchCar) i "Sastavi svoj paket" builder
   (computeCustomPackage). Pre ovoga su ta dva puta imala SVOJE odvojene
   kopije istih tabela/tekstova — tačno ta vrsta duplikacije je razlog
   zašto je opis kartice (pkgDescText) ranije zaostajao za stvarnim
   ponašanjem fetchFlights-a. Deljenjem ovih tabela/funkcija, izmena na
   jednom mestu se automatski odražava i na drugom, umesto da se dve
   kopije vremenom razminu.
========================================================== */
const FLIGHT_CARRIERS = ['Wizz Air','Air Serbia','Ryanair','Aegean','Lufthansa'];
const FLIGHT_PREF_PRICE_MULT = {direct:1.05, cheapest:0.72, airline:1.15};
const HOTEL_STAR_BASE_PRICE = {3:36, 4:66, 5:122};
const HOTEL_STAR_RATING_BASE = {3:7.7, 4:8.6, 5:9.2};
const CAR_TYPE_BASE_PRICE = {none:0, small:31, suv:57};

// Bira ime avio-kompanije. Zove rng() TAČNO jednom, i to SAMO kad nije
// tražena konkretna kompanija niti prosleđen forceCarrier (npr. Comfort
// tier na kartičnom putu uvek prikazuje istu, "premium" kompaniju umesto
// nasumične) — bilo koja promena broja rng() poziva ovde bi pomerila sve
// naredne random vrednosti (hotel/auto/aktivnost) za jedno mesto, zato
// ovaj obrazac mora ostati identičan na oba mesta koja ga zovu.
function pickCarrierName(rng, opts){
  opts = opts || {};
  if (opts.flightPref === 'airline' && opts.airlineName) return opts.airlineName;
  if (opts.forceCarrier) return opts.forceCarrier;
  return FLIGHT_CARRIERS[Math.floor(rng() * FLIGHT_CARRIERS.length)];
}

// Podnaslov leta (npr. "direktan let · cena za svih 3 putnika"). Pre nego
// što je ovo bilo deljeno, builder kartica NIJE imala ni upozorenje za
// ograničenu avio-mrežu (limitedNetwork) ni napomenu o ceni za više
// putnika, iako let na builder kartici isto tako zavisi od broja putnika.
function flightSubText(opts){
  opts = opts || {};
  // Redosled odlučuje (isti kao ranije): presedanje → ograničena mreža →
  // najbliži aerodrom → direktan let. Tekstovi idu kroz t() (sr/en/ru).
  let sub;
  if (opts.flightPref === 'cheapest') sub = t('flight_sub_stopover');
  else if (opts.limitedNetwork) sub = t('flight_sub_limited');
  else if (opts.arrival !== (opts.destRaw || '').trim()) sub = tf('flight_sub_nearest', {arrival: cityLabel(opts.arrival)});
  else sub = t('flight_sub_direct');
  if (opts.adults > 1) sub += ' · ' + tf('flight_sub_pax', {n: opts.adults});
  return sub;
}

/* ==========================================================
   ŠTA JE UKLJUČENO PO TIER-U (perks) — tri kartice se razlikuju ne samo
   po ceni nego i po SADRŽAJU: prtljag/izmena datuma (let), doručak,
   udaljenost od centra i otkazivanje (hotel), kilometraža i osiguranje
   (auto). Svaki perk je {k: i18n ključ, pos: true|false|null} —
   pos:true je prednost (računa se u qualityScore), false je odricanje,
   null neutralno. Kategorija koju je korisnik tražio (tip leta,
   zvezdice, tip auta) se NE menja — samo ono što ta cena uključuje.
   Ne zove rng() (ne sme da pomeri niz nasumičnih vrednosti).
========================================================== */
function tierPerks(kind, tier, opts){
  opts = opts || {};
  if (kind === 'flight'){
    return [
      tier === 'budget' ? {k:'perk_flight_bag_cabin', pos:false} : {k:'perk_flight_bag_checked', pos:true},
      tier === 'comfort' ? {k:'perk_flight_flex', pos:true} : {k:'perk_flight_fixed', pos:false}
    ];
  }
  if (kind === 'hotel'){
    // "Blizu centra" kao prioritet korisnika važi za sve tri kartice.
    const central = opts.prioritizeLocation || tier === 'comfort';
    return [
      tier === 'budget' ? {k:'perk_hotel_no_breakfast', pos:false} : {k:'perk_hotel_breakfast', pos:true},
      central ? {k:'perk_hotel_central', pos:true}
        : tier === 'best' ? {k:'perk_hotel_dist_mid', pos:null}
        : {k:'perk_hotel_dist_far', pos:false},
      tier === 'budget' ? {k:'perk_hotel_no_cancel', pos:false} : {k:'perk_hotel_free_cancel', pos:true}
    ];
  }
  if (kind === 'car'){
    return [
      tier === 'budget' ? {k:'perk_car_km_limited', pos:false} : {k:'perk_car_km_unlimited', pos:true},
      tier === 'comfort' ? {k:'perk_car_cover_full', pos:true} : {k:'perk_car_cover_basic', pos:false}
    ];
  }
  return [];
}
// Kvalitet iz STVARNOG sadržaja: udeo ostvarenih prednosti među uključenim
// stavkama, preslikan na 55–97 (Budget bez prednosti ≈55, sve prednosti 97).
// Bez ijedne stavke sa perks-ovima vraća staru fiksnu vrednost po tier-u.
function qualityFromPerks(items, tier){
  let possible = 0, earned = 0;
  items.forEach(it => {
    if (!it || !it.perks) return;
    possible += it.perks.length;
    earned += it.perks.filter(pk => pk.pos === true).length;
  });
  if (!possible) return {best:84, budget:58, comfort:97}[tier];
  return Math.round(55 + 42 * earned / possible);
}

function fetchFlights(rng, dest, adults, tier, originCode, prefs, seeds){
  prefs = prefs || {};
  const flightPref = prefs.flightPref || 'direct';
  // `seeds.flightBase`, kad je prosleđen, je IZVUČEN JEDNOM po pretrazi (vidi
  // buildPriceSeeds) i DELI se između sve tri tier kartice — vidi komentar
  // uz buildPriceSeeds za razlog (bez ovoga je redosled cena Budget/Best/
  // Comfort bio samo statistički verovatan, ne garantovan). Fallback na
  // staro ponašanje kad seeds nije prosleđen (npr. poziv sa jednim tier-om).
  const base = (seeds && seeds.flightBase != null) ? seeds.flightBase : 60 + Math.floor(rng()*140);
  const tierMult = {budget:0.72, best:1, comfort:1.55}[tier];
  // Ista logika kao u "Sastavi svoj paket" builderu (computeCustomPackage)
  // — cena stvarno zavisi od TRAŽENOG tipa leta, ne samo od tier-a kartice,
  // tako da "najjeftiniji" izbor u upitniku zaista donese nižu cenu ovde.
  const prefMult = FLIGHT_PREF_PRICE_MULT[flightPref] || 1;
  // Cena zavisi i od RUTE (udaljenost polazište→destinacija, vidi flightRouteMult).
  const price = Math.round(base * tierMult * prefMult * adults * flightRouteMult(originCode, dest));
  const p = PARTNERS.flight;
  // Ako je tražena određena avio-kompanija, kartica STVARNO prikazuje tu
  // kompaniju — ne nasumičnu iz liste.
  const carrier = pickCarrierName(rng, {
    flightPref, airlineName: prefs.airlineName,
    forceCarrier: tier === 'comfort' ? FLIGHT_CARRIERS[FLIGHT_CARRIERS.length-1] : null
  });
  const departure = realDepartureAirportFor(originCode);
  const arrival = realArrivalAirportFor(dest);
  const limitedNetwork = isLimitedNetworkOrigin(originCode);
  // "Direktan" ili "sa presedanjem" sad zavisi od TRAŽENOG tipa leta, ne od
  // tier-a kartice — ko traži najjeftiniji let realno dobija let sa
  // presedanjem (to je i razlog niže cene), a ko traži direktan, dobija ga
  // na sve tri kartice, ne samo na "Comfort".
  // name/sub su getteri: tekst se sklapa u trenutku čitanja, pa prati
  // trenutni jezik (i posle prebacivanja SR/EN/RU) — bez ponovnog računanja
  // cene/rng-a. JSON.stringify i spread ih evaluiraju kao obična polja.
  return {
    provider:p.provider, providerLabel:p.name, type:'flight',
    get name(){ return carrier + (departure ? ' ' + cityLabel(departure) : '') + ' → ' + cityLabel(arrival); },
    get sub(){ return flightSubText({flightPref, arrival, destRaw: dest, adults, limitedNetwork}); },
    price, currency:'EUR',
    perks: tierPerks('flight', tier)
  };
}
function fetchHotel(rng, dest, nights, adults, tier, prefs, seeds){
  prefs = prefs || {};
  const stars = [3,4,5].includes(prefs.hotelStars) ? prefs.hotelStars : 4;
  // Bazna cena i dalje zavisi od tier-a kartice (zato se tri ponude i dalje
  // razlikuju po ceni), ali polazna tačka je sad TRAŽENA kategorija hotela
  // (zvezdice), ne fiksni nivo po tier-u — 3★ izbor se više ne pretvara u
  // 5★ hotel na "Comfort" kartici i obrnuto.
  const tierMult = {budget:0.85, best:1, comfort:1.2}[tier];
  const starBase = HOTEL_STAR_BASE_PRICE[stars];
  let mult = tierMult;
  if (prefs.prioritizeRating) mult += 0.08;
  if (prefs.prioritizeLocation) mult += 0.06;
  // hotelJitter deljen između tier-a (vidi buildPriceSeeds) — inače je ovaj
  // "šum" po noći znao da bude veći od same razlike koju pravi tierMult.
  const jitter = (seeds && seeds.hotelJitter != null) ? seeds.hotelJitter : rng()*14;
  const perNight = Math.round(starBase * mult + jitter);
  const price = Math.round(perNight * nights * Math.ceil(adults/2));
  const p = PARTNERS.hotel;
  let rating = HOTEL_STAR_RATING_BASE[stars] + rng()*0.25;
  if (prefs.prioritizeRating) rating += 0.25;
  rating = Math.min(9.9, rating);
  // Imena sa nazivom grada su funkcije, da grad ide kroz cityLabel() u
  // trenutnom jeziku; broj rng() poziva ostaje isti (jedan izbor iz niza).
  const names = {
    3:[d => d+' Hostel','City Rooms','Studio Plaza'],
    4:[d => d+' Hotel', 'Aegean Suites', 'Old Town Residence'],
    5:[d => 'Grand '+d, 'Royal Palace Hotel', d => d+' Luxury Collection']
  };
  const arr = names[stars];
  const rooms = Math.ceil(adults/2);
  const hotelPick = arr[Math.floor(rng()*arr.length)];
  return {
    provider:p.provider, providerLabel:p.name, type:'hotel',
    get name(){ return typeof hotelPick === 'function' ? hotelPick(cityLabel(dest)) : hotelPick; },
    get sub(){
      return nightsLabel(nights) + ' · ' + stars + '★ · ' + tf('hotel_sub_rating', {r: rating.toFixed(1)})
        + (rooms > 1 ? ' · ' + tf('hotel_sub_rooms', {rooms: roomsLabel(rooms)}) : '');
    },
    price, currency:'EUR',
    // "Centar grada" (prioritizeLocation) sad dolazi kroz perks (i18n).
    perks: tierPerks('hotel', tier, {prioritizeLocation: prefs.prioritizeLocation})
  };
}
function fetchCar(rng, days, tier, prefs, seeds){
  prefs = prefs || {};
  // Tip auta (mali/SUV) je sad STVARNO ono što je korisnik izabrao, ne
  // nasumičan model iz tier-liste — tier i dalje menja cenu (Budget je
  // najjeftiniji), ali ne i kategoriju vozila.
  const carType = prefs.carPref === 'suv' ? 'suv' : 'small';
  const tierMult = {budget:0.85, best:1, comfort:1.25}[tier];
  const typeBase = CAR_TYPE_BASE_PRICE[carType];
  // carJitter deljen između tier-a — isti razlog kao kod hotela iznad.
  const jitter = (seeds && seeds.carJitter != null) ? seeds.carJitter : rng()*10;
  const perDay = Math.round(typeBase * tierMult + jitter);
  const price = Math.round(perDay * days);
  const p = PARTNERS.car;
  const models = {
    small: ['Fiat Panda','Hyundai i10','Kia Picanto','VW Polo'],
    suv:   ['VW Tiguan','Audi Q3','Dacia Duster','Volvo XC40']
  };
  const arr = models[carType];
  return {
    provider:p.provider, providerLabel:p.name, type:'car',
    name: arr[Math.floor(rng()*arr.length)],
    get sub(){ return daysLabel(days) + ' · ' + t('car_sub_gearbox') + (carType==='suv' ? ' · SUV' : ''); },
    price, currency:'EUR',
    perks: tierPerks('car', tier)
  };
}
function fetchActivity(rng, dest, tier, prefs, seeds){
  prefs = prefs || {};
  // Broj aktivnosti je sad STVARNO onaj iz upitnika (podrazumevano 1 ako
  // nije poznat), cena se sabira po broju, ne fiksno za jednu aktivnost.
  const count = Math.max(1, Math.round(prefs.activityCount) || 1);
  const tierMult = {budget:0.85, best:1, comfort:1.3}[tier];
  // activityJitter deljen između tier-a — isti razlog kao kod hotela/auta.
  const jitter = (seeds && seeds.activityJitter != null) ? seeds.activityJitter : rng()*20;
  const perActivity = Math.round((18 + jitter) * tierMult);
  const price = perActivity * count;
  const p = PARTNERS.activity;
  // Ključevi (a ne gotov tekst) — naziv se prevodi pri čitanju; niz i izbor
  // preko rng() ostaju identični kao pre.
  const opts = {
    budget:['act_walk_old_town'],
    best:['act_halfday_tour','act_main_tickets'],
    comfort:['act_private_tour','act_food_tour']
  };
  const arr = opts[tier];
  const labelKey = arr[Math.floor(rng()*arr.length)];
  return {
    provider:p.provider, providerLabel:p.name, type:'activity',
    get name(){
      const label = t(labelKey);
      return (count > 1 ? activitiesLabel(count) + ' (' + t('act_eg') + ' ' + label + ')' : label) + ' — ' + cityLabel(dest);
    },
    get sub(){ return t('act_per_person') + (count > 1 ? ' · ' + activitiesLabel(count) : ''); },
    price, currency:'EUR'
  };
}

/* Baza za jitter/cenu koja se izvlači JEDNOM po pretrazi (ne po tier-u) i
   deli se između Budget/Best/Comfort poziva buildPackage — vidi
   fetchFlights/fetchHotel/fetchCar/fetchActivity iznad. Uzrok bug-a koji je
   ovo zamenilo: svaka tier kartica je ranije izvlačila SVOJU nezavisnu
   nasumičnu "bazu" cene, uporedivu po veličini sa razlikom koju sam
   tier-množilac pravi — pa je Budget na ~47% kombinacija ulaza (izmereno
   preko runBuildPackageInvariantChecks niže) ispadao SKUPLJI od Best Value,
   iako je tier-množilac uvek budget<best<comfort. Sad se taj nasumični deo
   izvlači jednom, a tier i dalje menja SAMO množilac — pa je redosled cena
   garantovan (do na retke, veoma male hotel/car cene gde zaokruživanje na
   ceo broj teorijski može izjednačiti dva tier-a — to je prihvatljivo,
   "jednako" nije kršenje Budget≤Best≤Comfort).
   Carrier/model/naziv hotela i dalje se biraju NEZAVISNO po tier-u (preko
   `rng` direktno, ne preko `seeds`) — to je samo prikazani tekst, ne cena,
   pa razlika u imenu između kartica ostaje (namerna raznovrsnost). */
function buildPriceSeeds(rng){
  return {
    flightBase: 60 + Math.floor(rng()*140),
    hotelJitter: rng()*14,
    carJitter: rng()*10,
    activityJitter: rng()*20
  };
}


const EXTRA_COSTS = {
  best:    {fuel:45, tolls:28, insurance:22, esim:12, transfer:25},
  comfort: {fuel:58, tolls:34, insurance:34, esim:18, transfer:32},
  budget:  {fuel:28, tolls:14, insurance:14, esim:8,  transfer:18}
};

/* ==========================================================
   DEV-ONLY PROVERA KONZISTENTNOSTI: pkg.flight.sub mora odgovarati
   traženom tipu leta (flightPref). Isključena je u produkciji (vidi
   DEV_MODE ispod) — svrha joj je da ulovi baš onu vrstu greške na koju
   upozorava komentar iznad fetchFlights/computeCustomPackage: neko
   promeni fetchFlights (ili flightSubText) i zaboravi da uskladi opis,
   pa "najjeftiniji" let na kartici i dalje piše "direktan let" (ili
   obrnuto). Bez ovoga bi to čekalo sledeću rundu ručne provere — sa
   ovim, konzola prijavi grešku ODMAH čim se to dogodi, u dev okruženju.
   Proverava se i na kartičnom putu (buildPackage) i na builder putu
   (computeCustomPackage) — obe zovu istu flightSubText, ali svaka
   sklapa svoj `sub` iz nje, pa svaka može zasebno da se pokvari.
========================================================== */
const DEV_MODE = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /(^|[?&])debug(=1)?(&|$)/.test(location.search);

function assertFlightSubConsistency(flightPref, sub, sourceLabel){
  if (!DEV_MODE || !sub) return;
  const saysPresedanje = sub.includes(t('flight_sub_stopover')); // jezički neutralno (sr/en/ru)
  const shouldSayPresedanje = flightPref === 'cheapest';
  if (saysPresedanje !== shouldSayPresedanje){
    console.error(
      '[sklopi][dev-check] Neusklađen opis leta! flightPref="' + flightPref + '" '
      + (shouldSayPresedanje
          ? 'treba da pominje "presedanje" u sub-u, ali ne pominje'
          : 'NE treba da pominje "presedanje" u sub-u, ali pominje')
      + ' — sub="' + sub + '" (izvor: ' + sourceLabel + '). '
      + 'Verovatno je fetchFlights/flightSubText promenjen bez usklađivanja negde drugde, ili obrnuto.'
    );
  }
}

