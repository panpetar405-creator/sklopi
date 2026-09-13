/* ==========================================================
   I18N вЂ” srpski (podrazumevano) i engleski
   ==========================================================
   Princip: statiДЌki tekst u HTML-u se prevodi preko data-i18n /
   data-i18n-html / data-i18n-placeholder / data-i18n-aria-label
   atributa i primenjuje se applyStaticI18n() funkcijom ispod.
   Za tekst koji JS generiЕЎe (rezultati, builder, poruke), koristi
   se t('kljuc') helper.
   NAPOMENA (obim ovog prolaza): pravne stranice (privatnost/uslovi/
   kolaДЌiД‡i) i stranica za deljenje (zajedno.html) NISU prevedene вЂ”
   ostaju na srpskom dok se ne uradi poseban prolaz za njih.
========================================================== */
const I18N = {
  sr: {
    nav_how:'Kako radi', nav_dest:'Destinacije', nav_about:'O nama',
    aria_account:'Nalog', aria_menu:'Meni',
    hero_title:'UneseЕЎ mesto.<br>DobijeЕЎ <span class="accent">ceo izlet</span>.',
    hero_lede:'Let, smeЕЎtaj, prevoz i aktivnosti spojeni u jedan plan i jednu ukupnu cenu.',
    label_origin:'Polazak', placeholder_origin:'npr. Beograd, NiЕЎ, Podgorica',
    label_dest:'Destinacija', placeholder_dest:'npr. Atina, Rim, Barselona',
    label_dates:'Od вЂ” Do',
    aria_prev_month:'Prethodni mesec', aria_next_month:'SledeД‡i mesec',
    chip_weekend:'Vikend', chip_week:'Nedelja dana', chip_twoweeks:'Dve nedelje',
    cal_wx_legend:'<span class="lg-exact">вЂпёЏ</span>prognoza (do 16 dana unapred) &nbsp;В·&nbsp; <span class="lg-est">вЂпёЏ</span>procena za dalje datume, po podacima za isti period proЕЎle godine &nbsp;В·&nbsp; <span style="opacity:0.35">build wx-5</span>',
    btn_done:'Gotovo',
    label_passengers:'Putnika',
    opt_1adult:'1 odrasla osoba', opt_2adults:'2 odrasla', opt_3adults:'3 odrasla', opt_4adults:'4 odrasla',
    btn_search:'PronaД‘i najbolje putovanje',
    toggle_flight:'Letovi', toggle_hotel:'SmeЕЎtaj', toggle_car:'Rent a car', toggle_activity:'Aktivnost',
    surprise_trigger:'рџЋІ NemaЕЎ ideju kuda? <span>Iznenadi me za dati budЕѕet в†’</span>',
    h2_no_idea:'Ne znaЕЎ gde bi iЕЎao?', sub_no_idea:'Reci nam koliko ЕѕeliЕЎ da potroЕЎiЕЎ, a mi Д‡emo pronaД‡i destinacije koje se uklapaju.',
    btn_no_idea_cta:'рџЋІ Iznenadi me',
    eyebrow_more_control:'ViЕЎe kontrole', h2_build_own:'ЕЅeliЕЎ viЕЎe kontrole?',
    sub_build_own:'BiraЕЎ let, smeЕЎtaj, auto i aktivnosti вЂ” mi raДЌunamo koliko sve zajedno koЕЎta.',
    builder_flight_label:'Let', chip_direct:'Direktan', chip_cheapest:'Najjeftiniji', chip_airline:'OdreД‘ena kompanija',
    placeholder_airline:'npr. Lufthansa',
    chip_priority_rating:'Prioritet: ocena', chip_priority_location:'Prioritet: lokacija',
    builder_transport_label:'Prevoz', chip_no_car:'Bez auta', chip_small_car:'Mali auto', chip_suv:'SUV',
    builder_activities_label:'Aktivnosti',
    aria_fewer_activities:'Manje aktivnosti', aria_more_activities:'ViЕЎe aktivnosti',
    builder_budget_label_html:'BudЕѕet <span style="font-weight:400;font-size:12px;color:var(--ink-soft);">(opciono)</span>',
    placeholder_budget:'npr. 700',
    btn_make_arrangement:'Napravi aranЕѕman',
    builder_summary_head:'Tvoj aranЕѕman', builder_total_sub:'ukupno',
    builder_total_hint:'Zbir procena za let, hotel, auto i aktivnosti вЂ” svaka stavka se plaД‡a zasebno kod partnera, ne u jednom plaД‡anju.',
    disclaimer_illustrative:'вљ пёЏ Ilustrativna procena, ne stvarna ponuda вЂ” sajt je u razvoju.',
    btn_optimize:'Optimizuj moj aranЕѕman', btn_save_trip:'SaДЌuvaj aranЕѕman', btn_price_alert:'Javi mi kad padne cena',
    builder_placeholder_text:'Ovde Д‡eЕЎ videti procenjenu cenu ДЌim poДЌneЕЎ da biraЕЎ вЂ” promeni bilo koju opciju levo.',
    eyebrow_for_later:'Za kasnije', h2_saved_trips:'Vrati se kad budeЕЎ spreman',
    sub_saved_trips:'SaДЌuvaj opcije koje ti se dopadaju i nastavi kasnije.',
    h2_features:'Sve ЕЎto ti treba za put', sub_features:'Od leta i smeЕЎtaja do auta, aktivnosti, osiguranja i interneta.',
    f_flight_sub:'Najbolje cene', f_hotel_sub:'Provereni objekti',
    f_car_name:'Auto', f_car_sub:'Pouzdani rentвЂ‘aвЂ‘car',
    f_tolls_name:'Putarine', f_tolls_sub:'TaДЌna kalkulacija',
    f_activity_name:'Aktivnosti', f_activity_sub:'Top doЕѕivljaji',
    f_insurance_name:'Osiguranje', f_insurance_sub:'Sigurnost na putu',
    f_esim_sub:'Internet od sletanja',
    postcard_caption:'Uvek postoji sledeД‡i izlet.',
    eyebrow_ideas:'Ideje za sledeД‡i izlet', h2_popular_dest:'Gde bi sledeД‡e?',
    sub_popular_dest:'Pogledaj destinacije koje putnici iz Srbije i regiona najДЌeЕЎД‡e biraju.',
    pd_athens_name:'Atina, GrДЌka', pd_athens_desc:'Antika, ostrvski trajekti i vrhunska kuhinja вЂ” popularna letnja destinacija sa ДЌestim direktnim letovima.',
    pd_rome_name:'Rim, Italija', pd_rome_desc:'Koloseum, Vatikan i uliДЌna kuhinja вЂ” grad koji se obilazi peЕЎke, uz kratak let iz Beograda.',
    pd_barcelona_name:'Barselona, Е panija', pd_barcelona_desc:'Gaudijeva arhitektura, plaЕѕa i tapas bary вЂ” omiljena kombinacija grada i mora.',
    pd_budva_name:'Budva, Crna Gora', pd_budva_desc:'NajbliЕѕe more autom ili autobusom iz Srbije вЂ” stara varoЕЎ i duge plaЕѕe.',
    pd_istanbul_name:'Istanbul, Turska', pd_istanbul_desc:'Spoj Evrope i Azije, bazari i Bosfor вЂ” pristupaДЌan izlet van sezone.',
    pd_vienna_name:'BeДЌ, Austrija', pd_vienna_desc:'Muzeji, kafei i boЕѕiД‡ne pijace zimi вЂ” praktiДЌan gradski izlet za vikend.',
    cta_right:'Ceo izlet.<br>Jedna cena.',
    eyebrow_faq:'Pitanja', h2_faq:'Pre nego ЕЎto rezerviЕЎeЕЎ',
    sub_faq:'Odgovori na najДЌeЕЎД‡a pitanja o cenama, rezervaciji i promenama.',
    faq_q1:'Da li su prikazane cene stvarne?',
    faq_a1:'Skoknica je trenutno u razvoju. Cene koje vidiЕЎ u pretrazi i builderu su ilustrativna procena, generisana radi demonstracije, ne dolaze uЕѕivo sa sajtova partnera. Pre rezervacije uvek proveri taДЌnu cenu i dostupnost direktno kod partnera (KAYAK, Booking.com, Viator).',
    faq_q2:'Kako radi builder aranЕѕmana?',
    faq_a2:'Sam biraЕЎ tip leta, kategoriju hotela, auto i broj aktivnosti, a Skoknica sabira procenjenu cenu za ceo paket. Dugme вЂћOptimizuj moj aranЕѕman" predlaЕѕe izmenu koja moЕѕe da smanji cenu uz sliДЌan kvalitet.',
    faq_q3:'Kako se ДЌuvaju moji saДЌuvani aranЕѕmani?',
    faq_a3:'NapraviЕЎ nalog emailom i lozinkom u sekciji вЂћSaДЌuvani aranЕѕmani". Tvoji podaci se ДЌuvaju vezano za tvoj nalog, ne za ovaj ureД‘aj, tako da im moЕѕeЕЎ pristupiti i sa drugog telefona ili raДЌunara вЂ” samo se prijavi istim emailom i lozinkom.',
    faq_q4:'Da li Skoknica naplaД‡uje rezervaciju?',
    faq_a4:'Ne. Skoknica ne naplaД‡uje niЕЎta direktno вЂ” klikom na вЂћRezerviЕЎi" ili вЂћPretraЕѕi" odlaziЕЎ na sajt partnera (KAYAK, Booking.com ili Viator) gde se rezervacija i plaД‡anje obavljaju.',
    faq_q5:'ImaЕЎ pitanje koje nije ovde?',
    faq_a5:'PiЕЎi na <a href="mailto:panpetar405@gmail.com">panpetar405@gmail.com</a> вЂ” rado odgovaramo.',
    stat_searches:'pretraga', stat_clicks:'klikova na ponude', stat_revenue:'procenjena provizija', stat_last:'poslednja destinacija',
    footer_contact:'Kontakt', footer_privacy:'Privatnost', footer_terms:'Uslovi', footer_cookies:'KolaДЌiД‡i',
    foot_note:'Skoknica вЂ” prototip proizvoda u razvoju. Prikazane cene su ilustrativne (simulirane radi demonstracije), ne dolaze uЕѕivo od partnera i ne predstavljaju stvarnu ponudu ni obavezu na cenu. В· <a href="#" id="cookieSettingsLink">PodeЕЎavanja kolaДЌiД‡a</a>',
    cookie_text:'<b>Koristimo kolaДЌiД‡e za analitiku</b> (Google Analytics) da bismo razumeli kako se sajt koristi i unapredili ga. Ne koristimo ih za marketing niti ih delimo van Google-a. Detalji u <a href="kolacici.html">Politici kolaДЌiД‡a</a>.',
    cookie_decline:'Odbijam', cookie_accept:'Prihvatam',
    aria_close:'Zatvori', label_email:'Email',
    label_alert_threshold:'Javi mi kad ukupna procenjena cena padne ispod', btn_set_alert:'Postavi alert',
    alert_modal_disclaimer:'вљ пёЏ I dalje ilustrativna procena, ne stvarna ponuda partnera. Odjava je moguД‡a bilo kad preko linka u mejlu koji dobijeЕЎ.',
    surprise_modal_title:'Iznenadi me',
    surprise_modal_sub:'NemaЕЎ konkretnu destinaciju na umu? Reci nam samo budЕѕet вЂ” probaД‡emo preko 100 gradova i predloЕѕiД‡emo 3 koja se uklapaju. Datumi i broj putnika ostaju kao u formi iznad.',
    surprise_modal_label_budget:'Ukupan budЕѕet (za sve putnike)', placeholder_surprise_budget:'npr. 400',
    surprise_modal_btn:'рџЋІ PredloЕѕi 3 destinacije',
    surprise_modal_disclaimer:'вљ пёЏ Ilustrativna procena cene po gradu, ne stvarna ponuda partnera.',
    share_modal_title:'Podeli sa prijateljima', share_modal_label_link:'Link za deljenje',
    share_modal_copy:'рџ“‹ Kopiraj link', share_modal_native:'рџ“¤ Podeli preko aplikacija',
    share_modal_disclaimer:'Svako ko otvori link vidi predlog i moЕѕe da ostavi odgovor (Idem/MoЕѕda/Ne mogu) вЂ” bez pravljenja naloga.',
    // ---- dinamiДЌki stringovi (koristi ih JS preko t()) ----
    ac_searching:'TraЕѕimвЂ¦', ac_no_results:'Nema predloga za taj naziv.',
    night:'noД‡', nights:'noД‡i', passenger:'putnik', passengers:'putnika',
    fuel_estimate:'Gorivo (procena)', tolls_estimate:'Putarine (procena)', insurance:'Osiguranje', esim_internet:'eSIM / internet',
    btn_search_kayak:'PretraЕѕi na KAYAK-u', btn_book_booking:'RezerviЕЎi na Booking.com',
    base_package_note:'Cena osnovnog paketa вЂ” dodaj osiguranje ili eSIM po Еѕelji.',
    fits_budget:'Uklapa se u tvoj budЕѕet od ', over_budget:'Malo iznad budЕѕeta, ali najbliЕѕa opcija koju imamo.',
  },
  en: {
    nav_how:'How it works', nav_dest:'Destinations', nav_about:'About',
    aria_account:'Account', aria_menu:'Menu',
    hero_title:'Enter a place.<br>Get a <span class="accent">whole trip</span>.',
    hero_lede:'Flight, stay, transport and activities combined into one plan and one total price.',
    label_origin:'From', placeholder_origin:'e.g. Belgrade, NiЕЎ, Podgorica',
    label_dest:'Destination', placeholder_dest:'e.g. Athens, Rome, Barcelona',
    label_dates:'From вЂ” To',
    aria_prev_month:'Previous month', aria_next_month:'Next month',
    chip_weekend:'Weekend', chip_week:'One week', chip_twoweeks:'Two weeks',
    cal_wx_legend:'<span class="lg-exact">вЂпёЏ</span>forecast (up to 16 days ahead) &nbsp;В·&nbsp; <span class="lg-est">вЂпёЏ</span>estimate for later dates, based on the same period last year &nbsp;В·&nbsp; <span style="opacity:0.35">build wx-5</span>',
    btn_done:'Done',
    label_passengers:'Travelers',
    opt_1adult:'1 adult', opt_2adults:'2 adults', opt_3adults:'3 adults', opt_4adults:'4 adults',
    btn_search:'Find the best trip',
    toggle_flight:'Flights', toggle_hotel:'Stay', toggle_car:'Rent a car', toggle_activity:'Activity',
    surprise_trigger:'рџЋІ No idea where to go? <span>Surprise me for a budget в†’</span>',
    h2_no_idea:'Not sure where to go?', sub_no_idea:'Tell us how much you want to spend, and weвЂ™ll find destinations that fit.',
    btn_no_idea_cta:'рџЋІ Surprise me',
    eyebrow_more_control:'More control', h2_build_own:'Want more control?',
    sub_build_own:'You choose the flight, stay, car and activities вЂ” we add up how much it all costs together.',
    builder_flight_label:'Flight', chip_direct:'Direct', chip_cheapest:'Cheapest', chip_airline:'Specific airline',
    placeholder_airline:'e.g. Lufthansa',
    chip_priority_rating:'Priority: rating', chip_priority_location:'Priority: location',
    builder_transport_label:'Transport', chip_no_car:'No car', chip_small_car:'Small car', chip_suv:'SUV',
    builder_activities_label:'Activities',
    aria_fewer_activities:'Fewer activities', aria_more_activities:'More activities',
    builder_budget_label_html:'Budget <span style="font-weight:400;font-size:12px;color:var(--ink-soft);">(optional)</span>',
    placeholder_budget:'e.g. 700',
    btn_make_arrangement:'Build my trip',
    builder_summary_head:'Your trip', builder_total_sub:'total',
    builder_total_hint:'Sum of estimates for flight, hotel, car and activities вЂ” each item is paid separately at the partner, not in one payment.',
    disclaimer_illustrative:'вљ пёЏ Illustrative estimate, not a real offer вЂ” the site is in development.',
    btn_optimize:'Optimize my trip', btn_save_trip:'Save trip', btn_price_alert:'Notify me when the price drops',
    builder_placeholder_text:'YouвЂ™ll see an estimated price here as soon as you start choosing вЂ” change any option on the left.',
    eyebrow_for_later:'For later', h2_saved_trips:'Come back when youвЂ™re ready',
    sub_saved_trips:'Save the options you like and pick up later.',
    h2_features:'Everything you need for the trip', sub_features:'From flights and stays to cars, activities, insurance and internet.',
    f_flight_sub:'Best prices', f_hotel_sub:'Verified properties',
    f_car_name:'Car', f_car_sub:'Reliable rentвЂ‘aвЂ‘car',
    f_tolls_name:'Tolls', f_tolls_sub:'Accurate calculation',
    f_activity_name:'Activities', f_activity_sub:'Top experiences',
    f_insurance_name:'Insurance', f_insurance_sub:'Safety on the road',
    f_esim_sub:'Internet from landing',
    postcard_caption:'ThereвЂ™s always a next trip.',
    eyebrow_ideas:'Ideas for your next trip', h2_popular_dest:'Where to next?',
    sub_popular_dest:'Take a look at the destinations travelers from Serbia and the region pick most often.',
    pd_athens_name:'Athens, Greece', pd_athens_desc:'Antiquity, island ferries and top-notch food вЂ” a popular summer destination with frequent direct flights.',
    pd_rome_name:'Rome, Italy', pd_rome_desc:'The Colosseum, the Vatican and street food вЂ” a walkable city, a short flight from Belgrade.',
    pd_barcelona_name:'Barcelona, Spain', pd_barcelona_desc:'GaudГ­вЂ™s architecture, the beach and tapas bars вЂ” a favorite city-and-sea combination.',
    pd_budva_name:'Budva, Montenegro', pd_budva_desc:'The closest sea by car or bus from Serbia вЂ” an old town and long beaches.',
    pd_istanbul_name:'Istanbul, Turkey', pd_istanbul_desc:'Where Europe meets Asia, bazaars and the Bosphorus вЂ” an affordable off-season trip.',
    pd_vienna_name:'Vienna, Austria', pd_vienna_desc:'Museums, cafГ©s and Christmas markets in winter вЂ” a practical city break.',
    cta_right:'One trip.<br>One price.',
    eyebrow_faq:'Questions', h2_faq:'Before you book',
    sub_faq:'Answers to the most common questions about prices, booking and changes.',
    faq_q1:'Are the prices shown real?',
    faq_a1:'Skoknica is currently in development. Prices you see in search and the builder are an illustrative estimate, generated for demonstration, and donвЂ™t come live from partner sites. Always check the exact price and availability directly with the partner (KAYAK, Booking.com, Viator) before booking.',
    faq_q2:'How does the trip builder work?',
    faq_a2:'You choose the flight type, hotel category, car and number of activities yourself, and Skoknica adds up an estimated price for the whole package. The вЂњOptimize my tripвЂќ button suggests a change that can lower the price with similar quality.',
    faq_q3:'How are my saved trips stored?',
    faq_a3:'You create an account with an email and password in the вЂњSaved tripsвЂќ section. Your data is tied to your account, not this device, so you can access it from another phone or computer too вЂ” just log in with the same email and password.',
    faq_q4:'Does Skoknica charge for booking?',
    faq_a4:'No. Skoknica doesnвЂ™t charge anything directly вЂ” clicking вЂњBookвЂќ or вЂњSearchвЂќ takes you to the partnerвЂ™s site (KAYAK, Booking.com or Viator) where the booking and payment happen.',
    faq_q5:'Have a question thatвЂ™s not here?',
    faq_a5:'Write to <a href="mailto:panpetar405@gmail.com">panpetar405@gmail.com</a> вЂ” weвЂ™re happy to help.',
    stat_searches:'searches', stat_clicks:'clicks on offers', stat_revenue:'estimated commission', stat_last:'last destination',
    footer_contact:'Contact', footer_privacy:'Privacy', footer_terms:'Terms', footer_cookies:'Cookies',
    foot_note:'Skoknica вЂ” a product prototype in development. Prices shown are illustrative (simulated for demonstration), donвЂ™t come live from partners, and donвЂ™t represent a real offer or price commitment. В· <a href="#" id="cookieSettingsLink">Cookie settings</a>',
    cookie_text:'<b>We use cookies for analytics</b> (Google Analytics) to understand how the site is used and improve it. We donвЂ™t use them for marketing or share them beyond Google. Details in the <a href="kolacici.html">Cookie Policy</a>.',
    cookie_decline:'Decline', cookie_accept:'Accept',
    aria_close:'Close', label_email:'Email',
    label_alert_threshold:'Notify me when the total estimated price drops below', btn_set_alert:'Set alert',
    alert_modal_disclaimer:'вљ пёЏ Still an illustrative estimate, not a real partner offer. You can unsubscribe anytime via the link in the email you receive.',
    surprise_modal_title:'Surprise me',
    surprise_modal_sub:'No specific destination in mind? Just tell us your budget вЂ” weвЂ™ll try over 100 cities and suggest 3 that fit. Dates and traveler count stay as set in the form above.',
    surprise_modal_label_budget:'Total budget (for all travelers)', placeholder_surprise_budget:'e.g. 400',
    surprise_modal_btn:'рџЋІ Suggest 3 destinations',
    surprise_modal_disclaimer:'вљ пёЏ Illustrative price estimate per city, not a real partner offer.',
    share_modal_title:'Share with friends', share_modal_label_link:'Share link',
    share_modal_copy:'рџ“‹ Copy link', share_modal_native:'рџ“¤ Share via apps',
    share_modal_disclaimer:'Anyone who opens the link can see the plan and RSVP (Going/Maybe/CanвЂ™t make it) вЂ” no account needed.',
    ac_searching:'SearchingвЂ¦', ac_no_results:'No suggestions for that name.',
    night:'night', nights:'nights', passenger:'traveler', passengers:'travelers',
    fuel_estimate:'Fuel (estimate)', tolls_estimate:'Tolls (estimate)', insurance:'Insurance', esim_internet:'eSIM / internet',
    btn_search_kayak:'Search on KAYAK', btn_book_booking:'Book on Booking.com',
    base_package_note:'Base package price вЂ” add insurance or eSIM if you like.',
    fits_budget:'Fits your budget of ', over_budget:'Slightly over budget, but the closest option we have.',
  }
};
function getLang(){ return localStorage.getItem('skoknica_lang') === 'en' ? 'en' : 'sr'; }
function t(key){ const lang = getLang(); return (I18N[lang] && I18N[lang][key]) ?? (I18N.sr[key] ?? key); }
function applyStaticI18n(){
  const lang = getLang();
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label'))); });
  const btn = document.getElementById('langSwitchBtn');
  if (btn) btn.innerHTML = lang === 'sr' ? '<b>SR</b><span class="ls-sep">/</span>EN' : 'SR<span class="ls-sep">/</span><b>EN</b>';
  const titleEl = document.querySelector('title');
  if (titleEl) titleEl.textContent = lang === 'sr' ? 'Skoknica вЂ” ceo izlet, jedna cena' : 'Skoknica вЂ” one whole trip, one price';
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', lang === 'sr'
    ? 'Skoknica pronalazi let, hotel, auto i aktivnosti za tvoj sledeД‡i izlet i sabira ih u jednu cenu. Napravi sopstveni aranЕѕman ili poreД‘aj gotove pakete po budЕѕetu.'
    : 'Skoknica finds flights, hotels, cars and activities for your next trip and adds them into one price. Build your own trip or browse ready packages by budget.');
}
function setLang(lang){
  localStorage.setItem('skoknica_lang', lang === 'en' ? 'en' : 'sr');
  applyStaticI18n();
  // Ponovo iscrtaj dinamiДЌki generisan sadrЕѕaj (rezultati/builder/auth/saved)
  // u novom jeziku, ako trenutno postoji na strani.
  if (typeof window.onLangChange === 'function') window.onLangChange(lang);
}


function seededRandom(seed){
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function(){
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
function hashSeed(str){
  let h = 0;
  for (let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) | 0; }
  return Math.abs(h) || 1;
}
function nightsBetween(a,b){
  const ms = new Date(b) - new Date(a);
  return Math.max(1, Math.round(ms / 86400000));
}
function fmtDate(iso){
  const d = new Date(iso);
  if (getLang() === 'en') return d.toLocaleString('en-GB', {day:'numeric', month:'short'});
  return d.getDate() + '. ' + d.toLocaleString('sr-Latn', {month:'long'});
}
function passengerLabel(adults){
  const n = String(adults);
  return n === '1' ? t('passenger') : t('passengers');
}

/* ---- Kalendar za izbor datuma u "ticket" pretrazi (stub "Od вЂ” Do") ---- */
// Open-Meteo geokodiranje ne sortira rezultate po znaДЌaju grada, pa "Milano"
// ume da vrati malo selo u Peruu pre Milana u Italiji. Ovde biramo najbolje
// poklapanje: prvo taДЌan naziv (case-insensitive), pa najveД‡i broj stanovnika,
// pa gradove/prestonice (feature_code) pre manjih naselja.
// (globalna funkcija вЂ” koriste je i vremenska prognoza (wx.geocode) i predlozi
// gradova u poljima Polazak/Destinacija (fetchLocationSuggestions), pa mora
// biti van svih IIFE-ova da bi bila vidljiva na oba mesta.)
function rankLocationMatches(results, query){
  const q = query.trim().toLowerCase();
  const featureRank = {PPLC:0, PPLA:1, PPLA2:2, PPL:3}; // prestonica > regionalni centar > selo
  const scored = results.map(r => {
    const exact = r.name.trim().toLowerCase() === q ? 0 : 1;
    const feat = featureRank[r.feature_code] ?? 4;
    const pop = r.population || 0;
    return {r, exact, feat, pop};
  });
  scored.sort((a, b) => {
    if (a.exact !== b.exact) return a.exact - b.exact;
    if (a.feat !== b.feat) return a.feat - b.feat;
    return b.pop - a.pop; // veД‡i grad prvo
  });
  return scored.map(s => s.r);
}
function pickBestLocationMatch(results, query){
  return rankLocationMatches(results, query)[0];
}

(function(){
  const displayBtn = document.getElementById('dateDisplayBtn');
  const rangeText = document.getElementById('dateDisplayText');
  const nightsText = document.getElementById('dateNightsText');
  const hiddenFrom = document.getElementById('dateFrom');
  const hiddenTo = document.getElementById('dateTo');
  const calCard = document.getElementById('calCard');
  const calMonths = document.getElementById('calMonths');
  const calGrids = document.getElementById('calGrids');
  const calRangeLabel = document.getElementById('calRangeLabel');
  const prevBtn = document.getElementById('calPrev');
  const nextBtn = document.getElementById('calNext');
  const applyBtn = document.getElementById('calApply');
  if (!displayBtn || !calCard) return;

  const DAY_NAMES = ['Pon','Uto','Sre','ДЊet','Pet','Sub','Ned'];
  const today = new Date(); today.setHours(0,0,0,0);

  function parseISODate(iso){
    const [y,m,d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function toISODate(d){
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function fmtShort(d){
    return d.getDate() + '. ' + d.toLocaleString('sr-Latn', {month:'short'}).replace('.', '');
  }
  function sameDay(a,b){ return !!a && !!b && a.getTime() === b.getTime(); }
  function nightsCount(a,b){ return Math.max(1, Math.round((b - a) / 86400000)); }
  function nightsWord(n){ return n === 1 ? t('night') : t('nights'); }

  let selStart = parseISODate(hiddenFrom.value);
  let selEnd = parseISODate(hiddenTo.value);
  let viewYear = selStart.getFullYear();
  let viewMonth = selStart.getMonth();

  /* ---- Vremenska prognoza po danima (Open-Meteo вЂ” javno dostupan, besplatan API) ----
     Prava prognoza postoji samo za ~16 dana unapred. Za datume dalje u buduД‡nosti
     ne postoji "taДЌna" prognoza kod nikog вЂ” zato se za njih prikazuje PROCENA na
     osnovu istog perioda proЕЎle godine (arhivski podaci), vizuelno zamuД‡ena ikonica,
     da se ne stvori laЕѕan utisak preciznosti. */
  const WMO_ICON = {
    0:'вЂпёЏ',1:'рџЊ¤пёЏ',2:'в›…',3:'вЃпёЏ',
    45:'рџЊ«пёЏ',48:'рџЊ«пёЏ',
    51:'рџЊ¦пёЏ',53:'рџЊ¦пёЏ',55:'рџЊ¦пёЏ',
    56:'рџЊ§пёЏ',57:'рџЊ§пёЏ',
    61:'рџЊ§пёЏ',63:'рџЊ§пёЏ',65:'рџЊ§пёЏ',
    66:'рџЊ§пёЏ',67:'рџЊ§пёЏ',
    71:'рџЊЁпёЏ',73:'рџЊЁпёЏ',75:'вќ„пёЏ',77:'вќ„пёЏ',
    80:'рџЊ¦пёЏ',81:'рџЊ§пёЏ',82:'в›€пёЏ',
    85:'рџЊЁпёЏ',86:'рџЊЁпёЏ',
    95:'в›€пёЏ',96:'в›€пёЏ',99:'в›€пёЏ'
  };
  function wxIcon(code){ return WMO_ICON[code] || ''; }

  const wx = {
    geoCache: {},
    forecastCache: {}, // key: "lat,lon" -> {iso: {code,tmax,tmin}}
    climateCache: {},  // key: "lat,lon|minISO|maxISO" -> {iso: {code,tmax,tmin}}
    async geocode(city){
      const key = city.trim().toLowerCase();
      if (!key) return {geo:null, networkError:false};
      if (this.geoCache[key]) return {geo:this.geoCache[key], networkError:false};
      const attempts = [
        'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city) + '&count=10&language=sr&format=json',
        'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city) + '&count=10&language=en&format=json',
        'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city) + '&count=10&format=json'
      ];
      let networkError = false;
      for (const url of attempts){
        try{
          const res = await fetch(url);
          if (!res.ok){ networkError = true; continue; }
          const data = await res.json();
          if (data && data.results && data.results.length){
            const r = pickBestLocationMatch(data.results, city);
            const geo = {lat: Math.round(r.latitude*100)/100, lon: Math.round(r.longitude*100)/100};
            this.geoCache[key] = geo;
            return {geo, networkError:false};
          }
        } catch(err){
          networkError = true;
          console.warn('[skoknica] geokodiranje odrediЕЎta nije uspelo:', err.message);
        }
      }
      return {geo:null, networkError};
    },
    async getForecast(geo){
      const key = geo.lat + ',' + geo.lon;
      if (this.forecastCache[key]) return {data:this.forecastCache[key], networkError:false};
      try{
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + geo.lat + '&longitude=' + geo.lon + '&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=16');
        if (!res.ok) return {data:{}, networkError:true};
        const data = await res.json();
        const out = {};
        if (data && data.daily){
          data.daily.time.forEach((iso, i) => {
            out[iso] = {code: data.daily.weathercode[i], tmax: Math.round(data.daily.temperature_2m_max[i]), tmin: Math.round(data.daily.temperature_2m_min[i])};
          });
        }
        this.forecastCache[key] = out;
        return {data:out, networkError:false};
      } catch(err){ console.warn('[skoknica] prognoza nije uspela:', err.message); return {data:{}, networkError:true}; }
    },
    async getClimateRange(geo, minISO, maxISO){
      const key = geo.lat + ',' + geo.lon + '|' + minISO + '|' + maxISO;
      if (this.climateCache[key]) return {data:this.climateCache[key], networkError:false};
      // ista opsega dana, samo godinu unazad вЂ” kao osnova za procenu
      const shiftYear = (iso, delta) => { const d = parseISODate(iso); d.setFullYear(d.getFullYear() + delta); return d; };
      const startLastYear = shiftYear(minISO, -1);
      const endLastYear = shiftYear(maxISO, -1);
      const out = {};
      try{
        const res = await fetch('https://archive-api.open-meteo.com/v1/archive?latitude=' + geo.lat + '&longitude=' + geo.lon +
          '&start_date=' + toISODate(startLastYear) + '&end_date=' + toISODate(endLastYear) +
          '&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto');
        if (!res.ok) return {data:{}, networkError:true};
        const data = await res.json();
        if (data && data.daily){
          data.daily.time.forEach((lastYearISO, i) => {
            const d = parseISODate(lastYearISO); d.setFullYear(d.getFullYear() + 1);
            out[toISODate(d)] = {code: data.daily.weathercode[i], tmax: Math.round(data.daily.temperature_2m_max[i]), tmin: Math.round(data.daily.temperature_2m_min[i])};
          });
        }
        this.climateCache[key] = out;
        return {data:out, networkError:false};
      } catch(err){
        console.warn('[skoknica] istorijski podaci nisu uspeli:', err.message);
        return {data:out, networkError:true};
      }
    }
  };

  let wxRequestSeq = 0;
  async function paintWeather(){
    const cells = Array.from(calGrids.querySelectorAll('.cal-day[data-date]:not(.is-disabled)'));
    if (!cells.length) return;
    const destInput = document.getElementById('dest');
    const city = (destInput && destInput.value.trim()) || 'Atina';
    const statusEl = document.getElementById('calWxStatus');
    const setStatus = (msg) => { if (statusEl){ statusEl.textContent = msg; statusEl.style.display = msg ? 'block' : 'none'; } };

    const mySeq = ++wxRequestSeq;
    // odmah skini stare ikonice (mogu biti od prethodne destinacije) da ne ostane pogreЕЎan utisak
    cells.forEach(cell => cell.querySelectorAll('.cal-wx').forEach(n => n.remove()));
    setStatus((getLang()==='en' ? 'Looking up weather for вЂњ' + city + 'вЂќвЂ¦' : 'TraЕѕim vreme za вЂћ' + city + 'вЂњвЂ¦'));

    const {geo, networkError: geoErr} = await wx.geocode(city);
    if (mySeq !== wxRequestSeq) return; // korisnik je u meД‘uvremenu promenio destinaciju вЂ” ovaj odgovor je zastareo
    if (!geo){
      setStatus(geoErr
        ? 'Prognoza trenutno nije dostupna вЂ” zahtev ka mreЕѕi nije uspeo (provera internet konekcije ili pristupa mreЕѕi u ovom pregledaДЌu).'
        : 'Nije pronaД‘ena lokacija za вЂћ' + city + 'вЂќ вЂ” provera pravopisa naziva mesta.');
      return;
    }

    const isoList = cells.map(c => c.dataset.date).sort();
    const minISO = isoList[0], maxISO = isoList[isoList.length - 1];

    const [fRes, cRes] = await Promise.all([
      wx.getForecast(geo),
      wx.getClimateRange(geo, minISO, maxISO)
    ]);
    if (mySeq !== wxRequestSeq) return; // isto вЂ” zastareo odgovor, ne crtati preko novijeg stanja
    const forecast = fRes.data, climate = cRes.data;

    let painted = 0;
    cells.forEach(cell => {
      cell.querySelectorAll('.cal-wx').forEach(n => n.remove());
      const iso = cell.dataset.date;
      let rec = forecast[iso];
      let exact = true;
      if (!rec){ rec = climate[iso]; exact = false; }
      if (!rec) return;
      const icon = wxIcon(rec.code);
      if (!icon) return;
      const span = document.createElement('span');
      span.className = 'cal-wx' + (exact ? '' : ' cal-wx-est');
      span.textContent = icon;
      span.title = (exact ? 'Prognoza za ' : 'Procena za ') + iso + ': ' + rec.tmax + 'В°/' + rec.tmin + 'В°C' + (exact ? '' : ' (na osnovu iste nedelje proЕЎle godine)');
      cell.appendChild(span);
      painted++;
    });

    if (!painted){
      setStatus((fRes.networkError || cRes.networkError)
        ? 'Prognoza trenutno nije dostupna вЂ” zahtev ka mreЕѕi nije uspeo (provera internet konekcije ili pristupa mreЕѕi u ovom pregledaДЌu).'
        : 'Nema podataka o vremenu za ove datume.');
    } else {
      setStatus('');
    }
  }

  function updateDisplay(){
    const n = nightsCount(selStart, selEnd);
    rangeText.textContent = fmtShort(selStart) + ' вЂ“ ' + fmtShort(selEnd);
    nightsText.textContent = n + ' ' + nightsWord(n);
    calRangeLabel.innerHTML = fmtShort(selStart) + ' вЂ“ ' + fmtShort(selEnd) + ' <b>В· ' + n + ' ' + nightsWord(n) + '</b>';
  }

  function commit(){
    hiddenFrom.value = toISODate(selStart);
    hiddenTo.value = toISODate(selEnd);
    hiddenFrom.dispatchEvent(new Event('change', {bubbles:true}));
    hiddenTo.dispatchEvent(new Event('change', {bubbles:true}));
    updateDisplay();
  }

  function buildMonthGrid(year, month){
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // ponedeljak = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let head = '<div class="cal-grid-head">' + DAY_NAMES.map(d => '<span>' + d + '</span>').join('') + '</div>';
    let body = '<div class="cal-grid-body">';
    for (let i = 0; i < startOffset; i++) body += '<span class="cal-day is-empty"></span>';
    for (let day = 1; day <= daysInMonth; day++){
      const d = new Date(year, month, day);
      const classes = ['cal-day'];
      if (d < today) classes.push('is-disabled');
      if (sameDay(d, selStart)) classes.push('range-start');
      if (sameDay(d, selEnd)) classes.push('range-end');
      if (selStart && selEnd && d > selStart && d < selEnd) classes.push('range-mid');
      if (sameDay(d, today)) classes.push('is-today');
      body += '<span class="' + classes.join(' ') + '" data-date="' + toISODate(d) + '">' + day + '</span>';
    }
    body += '</div>';
    return '<div class="cal-grid">' + head + body + '</div>';
  }

  function render(){
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    const monthLabel = (y, m) => {
      const name = new Date(y, m, 1).toLocaleString('sr-Latn', {month:'long'});
      return name.charAt(0).toUpperCase() + name.slice(1) + ' ' + y;
    };
    calMonths.innerHTML = '<span>' + monthLabel(viewYear, viewMonth) + '</span><span>' + monthLabel(nextY, nextM) + '</span>';
    calGrids.innerHTML = buildMonthGrid(viewYear, viewMonth) + buildMonthGrid(nextY, nextM);
    calGrids.querySelectorAll('.cal-day:not(.is-empty):not(.is-disabled)').forEach(el => {
      el.addEventListener('click', () => {
        const d = parseISODate(el.dataset.date);
        if (!selStart || (selStart && selEnd)){
          selStart = d; selEnd = null;
        } else if (d < selStart){
          selStart = d;
        } else {
          selEnd = d;
        }
        render();
        if (selStart && selEnd) updateDisplay();
      });
    });
    paintWeather();
  }

  function openCal(){
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    render();
    calCard.classList.add('open');
    displayBtn.setAttribute('aria-expanded', 'true');
  }
  function closeCal(shouldCommit){
    calCard.classList.remove('open');
    displayBtn.setAttribute('aria-expanded', 'false');
    if (shouldCommit && selStart && selEnd){
      commit();
    } else if (!selStart || !selEnd){
      selStart = parseISODate(hiddenFrom.value);
      selEnd = parseISODate(hiddenTo.value);
    }
  }

  displayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (calCard.classList.contains('open')) closeCal(true);
    else openCal();
  });
  applyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (selStart && selEnd) closeCal(true);
  });
  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    viewMonth -= 1;
    if (viewMonth < 0){ viewMonth = 11; viewYear -= 1; }
    render();
  });
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    viewMonth += 1;
    if (viewMonth > 11){ viewMonth = 0; viewYear += 1; }
    render();
  });
  calCard.querySelectorAll('[data-quick]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const base = (selStart && selStart >= today) ? new Date(selStart) : new Date(today);
      let s, en;
      if (btn.dataset.quick === 'weekend'){
        s = new Date(today);
        const offset = (5 - s.getDay() + 7) % 7 || 7;
        s.setDate(s.getDate() + offset);
        en = new Date(s); en.setDate(en.getDate() + 2);
      } else if (btn.dataset.quick === 'week'){
        s = base; en = new Date(s); en.setDate(en.getDate() + 7);
      } else {
        s = base; en = new Date(s); en.setDate(en.getDate() + 14);
      }
      selStart = s; selEnd = en;
      viewYear = s.getFullYear(); viewMonth = s.getMonth();
      render();
      updateDisplay();
    });
  });
  calCard.addEventListener('click', (e) => e.stopPropagation());

  document.addEventListener('click', () => {
    if (calCard.classList.contains('open')) closeCal(true);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && calCard.classList.contains('open')) closeCal(true);
  });

  const destInputEl = document.getElementById('dest');
  if (destInputEl){
    let destDebounce;
    destInputEl.addEventListener('input', () => {
      clearTimeout(destDebounce);
      destDebounce = setTimeout(() => {
        if (calCard.classList.contains('open')) paintWeather();
      }, 500);
    });
  }

  updateDisplay();
})();

// Small heuristic list вЂ” no geo API here, just enough to stop the CTA
// from promising a beach in landlocked cities like Beograd or BeДЌ.
const COASTAL_DESTINATIONS = [
  'atina','solun','krf','santorini','mikonos','rodos','krit',
  'dubrovnik','split','zadar','budva','kotor','herceg novi',
  'barselona','nica','malaga','valensija','ibica','napulj','venecija',
  'lisabon','porto','tel aviv','antalija','bodrum'
];
function ctaCopy(dest){
  const isCoastal = COASTAL_DESTINATIONS.includes(dest.trim().toLowerCase());
  return isCoastal
    ? 'Istorija, dobra hrana, more i nezaboravni doЕѕivljaji вЂ” a sad je lakЕЎe nego ikad da sve to isplaniraЕЎ.'
    : 'Istorija, dobra hrana i nezaboravni doЕѕivljaji вЂ” a sad je lakЕЎe nego ikad da sve to isplaniraЕЎ.';
}

const PARTNERS = {
  flight:    {provider:'kayak',      name:'KAYAK'},
  hotel:     {provider:'booking',    name:'Booking.com'},
  car:       {provider:'booking',    name:'Booking.com'},
  activity:  {provider:'viator',     name:'Viator'},
  esim:      {provider:'airalo',     name:'Airalo'},
  insurance: {provider:'worldnomads',name:'World Nomads'}
};

/* ---- Airalo prodaje eSIM po DRЕЅAVI, ne po gradu (npr. airalo.com/greece-esim),
   dok Skoknica destinaciju vodi kao grad ("Atina"). Mapiramo preko iste liste
   POPULAR_DESTINATIONS koja se veД‡ koristi za predloge gradova вЂ” svaki unos
   tamo ima "extra" polje sa nazivom drЕѕave na srpskom, koje ovde prevodimo
   u Airalo-ov URL slug (engleski naziv drЕѕave, malim slovima, sa crticama).
   NAPOMENA: slug format je potvrД‘en za par drЕѕava (italy-esim, greece-esim),
   ostatak je najbolja moguД‡a pretpostavka po istoj ЕЎemi вЂ” pre pravog
   affiliate ugovora vredi proveriti da li svaka od ovih stranica zaista
   postoji na Airalo sajtu. ---- */
const COUNTRY_SLUG_SR = {
  'Srbija':'serbia', 'Crna Gora':'montenegro', 'Bosna i Hercegovina':'bosnia-and-herzegovina',
  'Hrvatska':'croatia', 'Severna Makedonija':'north-macedonia', 'Kosovo':'kosovo',
  'Slovenija':'slovenia', 'Albanija':'albania', 'Rumunija':'romania', 'Bugarska':'bulgaria',
  'GrДЌka':'greece', 'Italija':'italy', 'Е panija':'spain', 'Portugalija':'portugal',
  'Francuska':'france', 'Velika Britanija':'united-kingdom', 'Holandija':'netherlands',
  'NemaДЌka':'germany', 'Austrija':'austria', 'ДЊeЕЎka':'czech-republic', 'MaД‘arska':'hungary',
  'SlovaДЌka':'slovakia', 'Poljska':'poland', 'Е vedska':'sweden', 'NorveЕЎka':'norway',
  'Danska':'denmark', 'Finska':'finland', 'Irska':'ireland', 'Belgija':'belgium',
  'Е vajcarska':'switzerland', 'Turska':'turkey', 'Izrael':'israel', 'UAE':'united-arab-emirates',
  'Egipat':'egypt', 'Maroko':'morocco', 'SAD':'united-states', 'Tajland':'thailand',
  'Japan':'japan', 'Indonezija':'indonesia', 'Singapur':'singapore'
};
function airaloCountrySlug(destName){
  const match = POPULAR_DESTINATIONS.find(d => normalizeSr(d.name) === normalizeSr(destName));
  if (!match) return null;
  return COUNTRY_SLUG_SR[match.extra] || null;
}

/* ==========================================================
   AFFILIATE DEEP LINKS
   Builds a real search URL on the partner's own site, pre-filled
   with destination/dates/passengers. No live pricing API is called
   client-side вЂ” replace AFF_ID placeholders with real affiliate IDs
   once each partner program is approved.
========================================================== */
const AFF_ID = 'SKOKNICA'; // TODO: replace per-partner with real affiliate/tracking IDs

function buildAffiliateLink(kind, ctx){
  const enc = encodeURIComponent;
  const dest = enc(ctx.dest);
  switch(kind){
    case 'flight':
      // Kayak supports "anywhere-<city>" as an origin placeholder when no origin airport is known.
      return `https://www.kayak.com/flights/anywhere-${dest}/${ctx.from}/${ctx.to}?adults=${ctx.adults}&sort=bestflight_a&ref=${AFF_ID}`;
    case 'hotel':
      return `https://www.booking.com/searchresults.html?ss=${dest}&checkin=${ctx.from}&checkout=${ctx.to}&group_adults=${ctx.adults}&no_rooms=1&aid=${AFF_ID}`;
    case 'car':
      return `https://www.booking.com/cars/results.html?ss=${dest}&pickupDate=${ctx.from}&dropoffDate=${ctx.to}&aid=${AFF_ID}`;
    case 'activity':
      return `https://www.viator.com/searchResults/all?text=${dest}&pid=${AFF_ID}`;
    case 'esim': {
      const slug = airaloCountrySlug(ctx.dest);
      // Ako ne prepoznamo drЕѕavu iz grada, vodimo na opЕЎtu prodavnicu
      // (bolje nego pogreЕЎan/nepostojeД‡i URL za drЕѕavu).
      return slug
        ? `https://www.airalo.com/${slug}-esim?ref=${AFF_ID}`
        : `https://www.airalo.com/esim?ref=${AFF_ID}`;
    }
    case 'insurance':
      // Za razliku od ostalih partnera, World Nomads nema potvrД‘en javni
      // URL ЕЎablon za deep-link sa unapred popunjenom destinacijom/datumima
      // (proces dobijanja ponude ide kroz njihov sopstveni wizard, ne kroz
      // query parametre na ovoj stranici) вЂ” zato vodi na opЕЎtu stranicu za
      // ponudu, ne na neЕЎto specifiДЌno za ${ctx.dest}. Kad se prijava na
      // affiliate program (preko CJ mreЕѕe) odobri, ovaj URL treba zameniti
      // pravim CJ tracking linkom (obiДЌno na drugom domenu, ne worldnomads.com).
      // TODO takoД‘e: potvrditi da World Nomads uopЕЎte prodaje rezidentima Srbije
      // pre nego ЕЎto ovo ide u produkciju вЂ” nije potvrД‘eno u istraЕѕivanju.
      return `https://www.worldnomads.com/travel-insurance?ref=${AFF_ID}`;
  }
}

function fetchFlights(rng, dest, adults, tier){
  const base = 60 + Math.floor(rng()*140);
  const tierMult = {budget:0.72, best:1, comfort:1.55}[tier];
  const price = Math.round(base * tierMult * adults);
  const p = PARTNERS.flight;
  const carriers = ['Wizz Air','Air Serbia','Ryanair','Aegean','Lufthansa'];
  return {
    provider:p.provider, providerLabel:p.name, type:'flight',
    name: (tier==='comfort' ? carriers[carriers.length-1] : carriers[Math.floor(rng()*carriers.length)]) + ' в†’ ' + dest,
    sub: (tier==='comfort' ? 'direktan let, prtljag ukljuДЌen' : (tier==='budget' ? 'jedan presedanje' : 'direktan let'))
      + (adults > 1 ? ' В· cena za svih ' + adults + ' putnika' : ''),
    price, currency:'EUR'
  };
}
function fetchHotel(rng, dest, nights, adults, tier){
  const perNight = {budget:32, best:71, comfort:138}[tier] + Math.floor(rng()*24);
  const price = Math.round(perNight * nights * Math.ceil(adults/2));
  const p = PARTNERS.hotel;
  const ratings = {budget:7.6, best:8.7, comfort:9.3};
  const names = {
    budget:['Hostel Centar','City Rooms','Studio Plaza'],
    best:[dest+' Hotel', 'Aegean Suites', 'Old Town Residence'],
    comfort:['Grand '+dest, 'Royal Palace Hotel', dest+' Luxury Collection']
  };
  const arr = names[tier];
  const rooms = Math.ceil(adults/2);
  return {
    provider:p.provider, providerLabel:p.name, type:'hotel',
    name: arr[Math.floor(rng()*arr.length)],
    sub: nights+' noД‡' + (nights===1?'':'i') + ' В· ocena ' + (ratings[tier]+rng()*0.3).toFixed(1)
      + (rooms > 1 ? ' В· cena za ' + rooms + ' sobe' : ''),
    price, currency:'EUR'
  };
}
function fetchCar(rng, days, tier){
  if (tier==='budget') return null; // budget package skips a car, per the brief
  const perDay = {best:34, comfort:58}[tier] + Math.floor(rng()*12);
  const price = Math.round(perDay * days);
  const p = PARTNERS.car;
  const models = {best:['Fiat 500','VW Polo','Opel Corsa'], comfort:['VW Tiguan','Audi A4','Volvo XC40']};
  const arr = models[tier];
  return {
    provider:p.provider, providerLabel:p.name, type:'car',
    name: arr[Math.floor(rng()*arr.length)],
    sub: days+' dana В· automatski/ruДЌni menjaДЌ',
    price, currency:'EUR'
  };
}
function fetchActivity(rng, dest, tier){
  const price = {budget:18, best:41, comfort:79}[tier] + Math.floor(rng()*20);
  const p = PARTNERS.activity;
  const opts = {
    budget:['Obilazak starog grada peЕЎke'],
    best:['Poludnevna tura s vodiДЌem','Ulaznica za glavne znamenitosti'],
    comfort:['Privatna tura s vodiДЌem','Gastronomska tura uz degustaciju']
  };
  const arr = opts[tier];
  return {
    provider:p.provider, providerLabel:p.name, type:'activity',
    name: arr[Math.floor(rng()*arr.length)] + ' вЂ” ' + dest,
    sub: 'po osobi',
    price, currency:'EUR'
  };
}

const EXTRA_COSTS = {
  best:    {fuel:45, tolls:28, insurance:22, esim:12},
  comfort: {fuel:58, tolls:34, insurance:34, esim:18},
  budget:  {fuel:0,  tolls:0,  insurance:14, esim:8}
};

/* ==========================================================
   PRICING + SCORE ENGINE
========================================================== */
function buildPackage(rng, dest, nights, days, adults, tier, flags){
  const flight = flags.flight ? fetchFlights(rng, dest, adults, tier) : null;
  const hotel  = flags.hotel  ? fetchHotel(rng, dest, nights, adults, tier) : null;
  const car    = flags.car    ? fetchCar(rng, days, tier) : null;
  const activity = flags.activity ? fetchActivity(rng, dest, tier) : null;
  const extras = EXTRA_COSTS[tier];

  const fuel = (car && extras.fuel) ? extras.fuel : 0;
  const tolls = (car && extras.tolls) ? extras.tolls : 0;
  // Osiguranje i eSIM viЕЎe NISU deo osnovne cene вЂ” to su dodaci na veД‡
  // kupljenu uslugu, ne "proizvod" koji se pretraЕѕuje. Cena im je uvek
  // dostupna (da bi se prikazala uz ДЌekboks u rezultatima), ali se ne
  // sabira u `total` dok ih korisnik svesno ne ukljuДЌi (vidi toggleAddon).
  const insuranceCost = extras.insurance;
  const esimCost = extras.esim;

  const total = (flight?flight.price:0) + (hotel?hotel.price:0) + (car?car.price:0)
              + (activity?activity.price:0) + fuel + tolls;

  // Quality is a fixed, structural property of each tier (hotel rating,
  // flight directness, car size) вЂ” it doesn't depend on this run's prices.
  const qualityScore = {best:84, budget:58, comfort:97}[tier];

  return {tier, flight, hotel, car, activity, fuel, tolls, insuranceCost, esimCost, total, qualityScore};
}

const TIER_META = {
  best:    {label:'Best Value', desc:'Najbolji odnos cene i kvaliteta'},
  comfort: {label:'Comfort', desc:'Bolji hotel, direktan let, prostraniji auto'},
  budget:  {label:'Budget', desc:'NajniЕѕa cena, bez iznajmljivanja auta'}
};

const ICONS = {
  flight: '<path d="M2 16l6-2 4.5-7 2 .6-2.5 6.9 5 1.5 3-2.4 1.6.5-2 3-5.5 1-1 2.6-1.8-.5.7-2.8-5 1.2-1-1.7z"/>',
  hotel: '<path d="M3 21V6l7-3 7 3v15M3 21h18M9 21v-6h4v6M9 10h.01M13 10h.01M9 6.5h.01M13 6.5h.01"/>',
  car: '<path d="M4 16v-4l2-5h12l2 5v4M4 16h16M4 16v2.5a1 1 0 001 1h1a1 1 0 001-1V16M17 16v2.5a1 1 0 001 1h1a1 1 0 001-1V16M6 12h12"/>',
  activity: '<path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/>',
  fuel: '<path d="M6 21V6a2 2 0 012-2h4a2 2 0 012 2v15M6 21h8M6 10h8M16 9l2.5 2v6a1.4 1.4 0 002.5-.9V9.5L18 6"/>',
  tolls: '<path d="M4 20L11 4h2l7 16M8 15h8"/>',
  insurance: '<path d="M12 2l8 3v6c0 5-3.4 8.5-8 11-4.6-2.5-8-6-8-11V5l8-3z"/>',
  esim: '<path d="M6 8.5a8.5 8.5 0 0112 0M8.7 11.2a4.7 4.7 0 016.6 0M11.4 13.9a1 1 0 011.2 0"/><circle cx="12" cy="17.5" r="1.1" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 3v3M16 3v3"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M2 20c1.2-3.4 3.5-5 7-5s5.8 1.6 7 5M17 8.3a3 3 0 010 5.9M20 20c-.4-1.9-1.2-3.3-2.5-4.2"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  extra: '<circle cx="12" cy="12" r="8"/>'
};
function iconSvg(type){
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(ICONS[type]||ICONS.extra)+'</svg>';
}

/* ==========================================================
   STATE + RENDER
========================================================== */
const state = { searches:0, clicks:0, revenue:0 };

function fmtEUR(n){ return 'в‚¬' + n.toLocaleString('de-DE'); }

function attachAffiliateLinks(pkg, dest, from, to, adults){
  const ctx = {dest, from, to, adults};
  if (pkg.flight)   pkg.flight.bookUrl   = buildAffiliateLink('flight', ctx);
  if (pkg.hotel)    pkg.hotel.bookUrl    = buildAffiliateLink('hotel', ctx);
  if (pkg.car)      pkg.car.bookUrl      = buildAffiliateLink('car', ctx);
  if (pkg.activity) pkg.activity.bookUrl = buildAffiliateLink('activity', ctx);
  // eSIM i osiguranje nisu "fetch-ovane" stavke kao let/hotel/auto/aktivnost
  // (nemaju svoju cenu sa partnerskog API-ja, cena im dolazi iz EXTRA_COSTS) вЂ”
  // ali dugme na svakom dodatku i dalje treba pravi link ka partneru.
  pkg.esimBookUrl = buildAffiliateLink('esim', ctx);
  pkg.insuranceBookUrl = buildAffiliateLink('insurance', ctx);
}

/* ==========================================================
   API FEED вЂ” poziv ka backendu (server/src/routes/search.js).
   Ako backend nije upaljen (nema hostinga jos, radi se lokalno bez
   servera, ili je pao), automatski se vraca na stari lokalni mock вЂ”
   sajt NIKAD ne sme da ostane bez rezultata korisniku.
========================================================== */
// Postavi ovo na URL svog backenda kad ga deploy-ujes, npr:
// window.SKOKNICA_API_BASE = 'https://api.skoknica.rs';
const API_BASE = window.SKOKNICA_API_BASE || '';

/* ---- Autocomplete destinacije: prvo /api/locations (ako je backend podeЕЎen),
   a ako nema backend-a (ili poziv ne uspe) вЂ” Open-Meteo geokodiranje, isti
   javni API bez kljuДЌa koji se veД‡ koristi za vremensku prognozu. ---- */
/* ---- Poznati gradovi/prestonice/turistiДЌka mesta вЂ” ovo je uvek prvi izvor
   predloga, jer Open-Meteo geokoding ume da vrati nepoznata mesta umesto
   oДЌiglednih (npr. selo umesto prestonice), i loЕЎe "pogaД‘a" kad se kuca
   bez kvaДЌica (c/s/z umesto ДЌ/ЕЎ/Еѕ). Tek ako ovde nema dovoljno pogodaka,
   dopunjuje se sa Open-Meteo. ---- */
const POPULAR_DESTINATIONS = [
  // Srbija
  {name:'Beograd', extra:'Srbija'}, {name:'Novi Sad', extra:'Srbija'}, {name:'NiЕЎ', extra:'Srbija'},
  {name:'Kragujevac', extra:'Srbija'}, {name:'Subotica', extra:'Srbija'}, {name:'Zlatibor', extra:'Srbija'},
  {name:'Kopaonik', extra:'Srbija'}, {name:'VrnjaДЌka Banja', extra:'Srbija'},
  // Region
  {name:'Podgorica', extra:'Crna Gora'}, {name:'Budva', extra:'Crna Gora'}, {name:'Kotor', extra:'Crna Gora'},
  {name:'Herceg Novi', extra:'Crna Gora'}, {name:'Igalo', extra:'Crna Gora'}, {name:'Bar', extra:'Crna Gora'},
  {name:'Tivat', extra:'Crna Gora'}, {name:'Petrovac', extra:'Crna Gora'}, {name:'Sutomore', extra:'Crna Gora'},
  {name:'Ulcinj', extra:'Crna Gora'}, {name:'Perast', extra:'Crna Gora'}, {name:'Risan', extra:'Crna Gora'},
  {name:'Sarajevo', extra:'Bosna i Hercegovina'}, {name:'Mostar', extra:'Bosna i Hercegovina'}, {name:'Banja Luka', extra:'Bosna i Hercegovina'},
  {name:'Zagreb', extra:'Hrvatska'}, {name:'Split', extra:'Hrvatska'}, {name:'Dubrovnik', extra:'Hrvatska'},
  {name:'Zadar', extra:'Hrvatska'}, {name:'Rijeka', extra:'Hrvatska'}, {name:'Pula', extra:'Hrvatska'}, {name:'Hvar', extra:'Hrvatska'},
  {name:'Makarska', extra:'Hrvatska'}, {name:'Trogir', extra:'Hrvatska'}, {name:'Е ibenik', extra:'Hrvatska'}, {name:'Rovinj', extra:'Hrvatska'},
  {name:'Skoplje', extra:'Severna Makedonija'}, {name:'Ohrid', extra:'Severna Makedonija'},
  {name:'PriЕЎtina', extra:'Kosovo'},
  {name:'Ljubljana', extra:'Slovenija'}, {name:'Bled', extra:'Slovenija'}, {name:'Piran', extra:'Slovenija'},
  {name:'Tirana', extra:'Albanija'}, {name:'Sarande', extra:'Albanija'},
  {name:'BukureЕЎt', extra:'Rumunija'}, {name:'Sofija', extra:'Bugarska'}, {name:'Varna', extra:'Bugarska'}, {name:'Burgas', extra:'Bugarska'},
  // GrДЌka i Egej
  {name:'Atina', extra:'GrДЌka'}, {name:'Solun', extra:'GrДЌka'}, {name:'Krf', extra:'GrДЌka'},
  {name:'Santorini', extra:'GrДЌka'}, {name:'Mikonos', extra:'GrДЌka'}, {name:'Rodos', extra:'GrДЌka'},
  {name:'Krit', extra:'GrДЌka'}, {name:'Halkidiki', extra:'GrДЌka'},
  // Italija
  {name:'Rim', extra:'Italija'}, {name:'Milano', extra:'Italija'}, {name:'Napulj', extra:'Italija'},
  {name:'Venecija', extra:'Italija'}, {name:'Firenca', extra:'Italija'}, {name:'Bolonja', extra:'Italija'},
  {name:'Verona', extra:'Italija'}, {name:'Torino', extra:'Italija'}, {name:'Bari', extra:'Italija'}, {name:'Sicilija', extra:'Italija'},
  // Е panija i Portugal
  {name:'Barselona', extra:'Е panija'}, {name:'Madrid', extra:'Е panija'}, {name:'Valensija', extra:'Е panija'},
  {name:'Malaga', extra:'Е panija'}, {name:'Ibica', extra:'Е panija'}, {name:'Majorka', extra:'Е panija'}, {name:'Sevilja', extra:'Е panija'},
  {name:'Lisabon', extra:'Portugalija'}, {name:'Porto', extra:'Portugalija'}, {name:'Faro', extra:'Portugalija'},
  // Zapadna/Severna Evropa
  {name:'Pariz', extra:'Francuska'}, {name:'Nica', extra:'Francuska'}, {name:'Lion', extra:'Francuska'},
  {name:'London', extra:'Velika Britanija'}, {name:'Edinburg', extra:'Velika Britanija'},
  {name:'Amsterdam', extra:'Holandija'}, {name:'Roterdam', extra:'Holandija'},
  {name:'Berlin', extra:'NemaДЌka'}, {name:'Minhen', extra:'NemaДЌka'}, {name:'Hamburg', extra:'NemaДЌka'}, {name:'Frankfurt', extra:'NemaДЌka'},
  {name:'BeДЌ', extra:'Austrija'}, {name:'Zalcburg', extra:'Austrija'}, {name:'Insbruk', extra:'Austrija'},
  {name:'Prag', extra:'ДЊeЕЎka'}, {name:'BudimpeЕЎta', extra:'MaД‘arska'}, {name:'Bratislava', extra:'SlovaДЌka'},
  {name:'VarЕЎava', extra:'Poljska'}, {name:'Krakov', extra:'Poljska'},
  {name:'Stokholm', extra:'Е vedska'}, {name:'Oslo', extra:'NorveЕЎka'}, {name:'Kopenhagen', extra:'Danska'}, {name:'Helsinki', extra:'Finska'},
  {name:'Dablin', extra:'Irska'}, {name:'Brisel', extra:'Belgija'}, {name:'Cirih', extra:'Е vajcarska'}, {name:'ЕЅeneva', extra:'Е vajcarska'},
  // Turska, Bliski istok, sever Afrike
  {name:'Istanbul', extra:'Turska'}, {name:'Antalija', extra:'Turska'}, {name:'Bodrum', extra:'Turska'}, {name:'Kapadokija', extra:'Turska'},
  {name:'Tel Aviv', extra:'Izrael'}, {name:'Dubai', extra:'UAE'}, {name:'Abu Dabi', extra:'UAE'},
  {name:'Kairo', extra:'Egipat'}, {name:'Е arm El Е eik', extra:'Egipat'}, {name:'Hurgada', extra:'Egipat'}, {name:'MarakeЕЎ', extra:'Maroko'},
  // Amerika i Azija (najtraЕѕeniji daleki gradovi)
  {name:'Njujork', extra:'SAD'}, {name:'Majami', extra:'SAD'}, {name:'Los AnД‘eles', extra:'SAD'},
  {name:'Bangkok', extra:'Tajland'}, {name:'Tokio', extra:'Japan'}, {name:'Bali', extra:'Indonezija'}, {name:'Singapur', extra:'Singapur'},
];
// Uklanja srpske kvaДЌice (ДЌ/Д‡/ЕЎ/Еѕ/Д‘) i standardne akcente, radi poreД‘enja bez
// obzira da li korisnik kuca sa ili bez njih (npr. "Kotor" vs "BeДЌ"/"Bec").
function normalizeSr(str){
  return String(str)
    .replace(/Д‘/g, 'dj').replace(/Дђ/g, 'Dj')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
function matchPopularDestinations(query){
  const q = normalizeSr(query);
  const scored = POPULAR_DESTINATIONS.map(d => {
    const name = normalizeSr(d.name);
    const extra = normalizeSr(d.extra || '');
    let score;
    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (name.includes(q)) score = 2;
    else if (extra.startsWith(q)) score = 3;
    else if (extra.includes(q)) score = 4;
    else score = null;
    return {d, score};
  }).filter(x => x.score !== null);
  scored.sort((a, b) => a.score - b.score);
  return scored.map(x => x.d);
}

let _destSuggestTimer = null;
let _originSuggestTimer = null;
async function fetchLocationSuggestions(q, datalistId){
  const query = q.trim();
  const inputEl = document.querySelector(`input[list="${datalistId}"]`);
  const stubEl = inputEl ? inputEl.closest('.stub') : null;
  if (query.length < 2){ renderLocationSuggestions([], datalistId); if (stubEl) stubEl.classList.remove('is-loading'); return; }
  if (stubEl) stubEl.classList.add('is-loading');

  try {
    const combined = [];
    const seen = new Set();
    function addAll(arr){
      for (const r of arr){
        const key = r.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        combined.push(r);
      }
    }

    addAll(matchPopularDestinations(query));

    if (combined.length < 6 && API_BASE){
      try {
        const res = await fetch(API_BASE + '/api/locations?q=' + encodeURIComponent(query));
        if (res.ok){
          const json = await res.json();
          if (json.results) addAll(json.results.map(r => ({name:r.cityName, extra:r.countryName})));
        }
      } catch(err){
        console.warn('[skoknica] backend predlozi nedostupni, prelazim na Open-Meteo:', err.message);
      }
    }

    if (combined.length < 6){
      const langAttempts = ['sr', 'en', null];
      for (const lang of langAttempts){
        if (combined.length >= 6) break;
        try {
          const langParam = lang ? '&language=' + lang : '';
          const res = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(query) + '&count=10' + langParam + '&format=json');
          if (res.ok){
            const data = await res.json();
            const sorted = rankLocationMatches(data.results || [], query);
            addAll(sorted.map(r => ({name:r.name, extra:[r.admin1, r.country].filter(Boolean).join(', ')})));
          }
        } catch(err){
          console.warn('[skoknica] predlozi mesta (Open-Meteo) nisu uspeli:', err.message);
        }
      }
    }

    renderLocationSuggestions(combined.slice(0, 6), datalistId);
  } finally {
    if (stubEl) stubEl.classList.remove('is-loading');
  }
}
function renderLocationSuggestions(results, datalistId){
  const list = document.getElementById(datalistId);
  if (!list) return;
  if (!results.length){ list.innerHTML = ''; return; }
  const seen = new Set(); // izbegava duplikate istog naziva grada
  list.innerHTML = results.filter(r => {
    const key = r.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(r => `<option value="${escapeHtml(r.name)}">${escapeHtml(r.name)}${r.extra ? ' вЂ” ' + escapeHtml(r.extra) : ''}</option>`).join('');
}
function markStubLoading(inputEl, q){
  const stubEl = inputEl.closest('.stub');
  if (!stubEl) return;
  // Upali spinner odmah na kucanje (ne ДЌekaj debounce) вЂ” inaДЌe 300ms
  // pre samog fetch-a polje izgleda mirno/prazno, kao da neЕЎto ne radi.
  stubEl.classList.toggle('is-loading', q.trim().length >= 2);
}
document.getElementById('dest').addEventListener('input', (e)=>{
  clearTimeout(_destSuggestTimer);
  const q = e.target.value;
  markStubLoading(e.target, q);
  _destSuggestTimer = setTimeout(()=> fetchLocationSuggestions(q, 'destSuggestions'), 300);
});
document.getElementById('origin').addEventListener('input', (e)=>{
  clearTimeout(_originSuggestTimer);
  const q = e.target.value;
  markStubLoading(e.target, q);
  _originSuggestTimer = setTimeout(()=> fetchLocationSuggestions(q, 'originSuggestions'), 300);
});

function escapeHtml(str){
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

async function fetchPackagesFromBackend(payload){
  if (!API_BASE) return null; // backend jos nije deploy-ovan вЂ” nema smisla ni pokusavati
  try {
    const res = await fetch(API_BASE + '/api/search', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    return json.packages;
  } catch(err){
    console.warn('[skoknica] backend nedostupan, koristim lokalni mock:', err.message);
    return null;
  }
}

function computePackagesLocally(dest, from, to, nights, days, adults, flags){
  const seed = hashSeed(dest.toLowerCase()+dest.length+nights+adults);
  const rng = seededRandom(seed);

  const pkgs = ['best','comfort','budget'].map(t => buildPackage(rng, dest, nights, days, adults, t, flags));
  pkgs.forEach(p => attachAffiliateLinks(p, dest, from, to, adults));

  // Price score is relative to the cheapest of THIS run's three packages вЂ”
  // the cheapest always scores highest on price, others drop off the more
  // expensive they are. Combined with the fixed quality score, this decides
  // which package actually gets the "PreporuДЌeno" badge (not just whichever
  // tier is named "Best Value").
  const minTotal = Math.min(...pkgs.map(p => p.total));
  pkgs.forEach(p => {
    const overCheapest = (p.total - minTotal) / minTotal;
    p.priceScore = Math.max(40, Math.round(96 - overCheapest * 140));
    p.score = Math.round(p.priceScore * 0.55 + p.qualityScore * 0.45);
  });
  pkgs.sort((a, b) => b.score - a.score);
  pkgs.forEach((p, i) => { p.recommended = (i === 0); });
  return pkgs;
}

/* ==========================================================
   "IZNENADI ME" вЂ” pretraga samo po budЕѕetu, bez destinacije.
   Korisnik unese samo iznos; sajt proba svih ~100 gradova iz
   POPULAR_DESTINATIONS na 'best' tieru (isti flagovi kao u glavnoj
   formi) i vrati 3 nasumiДЌne koje se uklapaju u budЕѕet.

   Namerno koristi ISTI seed kao computePackagesLocally za 'best'
   tier (hashSeed(dest+dest.length+nights+adults), pa rng potroЕЎen
   redom best->comfort->budget) вЂ” cena koju "Iznenadi me" pokaЕѕe za
   neki grad je BIT-ZA-BIT ista kao kad bi korisnik taj grad ukucao
   ruДЌno u glavnu pretragu. Nema dupliranja logike, samo poziva
   buildPackage direktno za jedan tier umesto sva tri.
========================================================== */
function computeSurpriseCandidates(from, to, adults, flags){
  const nights = nightsBetween(from, to);
  const days = nights;
  return POPULAR_DESTINATIONS.map(d => {
    const seed = hashSeed(d.name.toLowerCase()+d.name.length+nights+adults);
    const rng = seededRandom(seed);
    const pkg = buildPackage(rng, d.name, nights, days, adults, 'best', flags);
    attachAffiliateLinks(pkg, d.name, from, to, adults);
    return {dest:d.name, country:d.extra||'', pkg};
  });
}

// Bira 3 grada. Ako manje od 3 uopЕЎte stane u budЕѕet, umesto da vrati
// prazno (razoДЌaravajuД‡e), vraД‡a 3 NAJJEFTINIJE opcije uz jasnu napomenu вЂ”
// sajt nikad ne sme da ostavi korisnika bez ijednog predloga.
function pickSurpriseDestinations(budget, candidates, count){
  const fitting = candidates.filter(c => c.pkg.total <= budget);
  const usedFallback = fitting.length < count;
  const pool = usedFallback ? candidates.slice().sort((a,b)=>a.pkg.total-b.pkg.total).slice(0, Math.max(count*3, count)) : fitting;

  // ObiДЌno (Fisher-Yates) meЕЎanje вЂ” namerno NIJE seed-ovano kao ostatak
  // cenovne logike, jer ovde Еѕelimo da svaki klik na "Probaj ponovo" da
  // drugaДЌiju trojku. Cena svakog grada ostaje deterministiДЌka, samo je
  // IZBOR koja 3 grada se prikazuju nasumiДЌan.
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return {picks: shuffled.slice(0, count), usedFallback};
}

async function renderResults(dest, from, to, nights, days, adults, flags, originCode){
  const backendPkgs = await fetchPackagesFromBackend({
    dest, from, to, adults, originCode, flags
  });
  const pkgs = backendPkgs || computePackagesLocally(dest, from, to, nights, days, adults, flags);

  // Global kontekst za "SaДЌuvaj ovu ponudu" dugme na svakoj kartici вЂ”
  // isti obrazac kao window._lastBuilderPkg za builder.
  window._lastSearchPkgs = pkgs;
  window._lastSearchCtx = {dest, from, to, adults};

  document.getElementById('ctaTitle').textContent = dest + ' te ДЌeka.';
  document.getElementById('ctaDesc').textContent = ctaCopy(dest);

  // Airalo (eSIM) se dodaje ruДЌno jer nije "fetch-ovana" stavka kao ostali
  // partneri (nema svoju cenu sa API-ja) вЂ” ali je i dalje pravi partner
  // sa affiliate linkom, pa treba da stoji u napomeni ispod paketa.
  const providers = [...new Set(pkgs.flatMap(p=>[p.flight,p.hotel,p.car,p.activity].filter(Boolean).map(i=>i.providerLabel)))].concat('Airalo');

  const head = document.getElementById('resultsHead');
  head.innerHTML = `
    <div class="status-banner">
      <div class="status-left">
        <div class="status-check">${iconSvg('check')}</div>
        <div><h3>Tvoj plan za ${escapeHtml(dest)}</h3><p>Tri gotove opcije, od najpovoljnije do komfornije. Izaberi onu koja ti odgovara.</p></div>
      </div>
      <div class="status-pills">
        <div class="pill">${iconSvg('calendar')} ${fmtDate(from)} вЂ“ ${fmtDate(to)}</div>
        <div class="pill">${iconSvg('people')} ${adults} ${passengerLabel(adults)}</div>
      </div>
    </div>
  `;

  const body = document.getElementById('resultsBody');
  body.innerHTML = `<div class="packages">${pkgs.map(pkgHtml).join('')}</div>
    <p class="disclaimer">вљ пёЏ Skoknica je trenutno u razvoju вЂ” prikazane cene su ilustrativan primer, generisan lokalno radi demonstracije, i <strong>nisu preuzete uЕѕivo</strong> sa partnerskih sajtova. Za stvarnu cenu i dostupnost proveri direktno na sajtu partnera (${providers.join(', ')}) pre rezervacije.</p>`;
}

function itemCardHtml(item, kind){
  if (!item) return '';
  const labels = {flight:'Let', hotel:'Hotel', car:'Auto'};
  const btnLabel = {flight:t('btn_search_kayak'), hotel:t('btn_book_booking'), car:t('btn_book_booking')};
  return `
  <div class="item-card ${kind}">
    <div class="item-photo ${kind}">${iconSvg(kind)}</div>
    <div class="item-body">
      <div class="item-label">${labels[kind]}${item.providerLabel!=='Skoknica' ? `<span class="item-provider">${escapeHtml(item.providerLabel)}</span>` : ''}</div>
      <div class="item-name">${escapeHtml(item.name)}</div>
      <div class="item-sub">${escapeHtml(item.sub)}</div>
      <div class="item-price tabular">${fmtEUR(item.price)}</div>
      <button class="item-btn ${kind}" data-kind="${kind}" data-price="${item.price}" data-url="${escapeHtml(item.bookUrl||'')}" onclick="bookItem(this)">${btnLabel[kind]}</button>
    </div>
  </div>`;
}

function pkgHtml(pkg){
  const meta = TIER_META[pkg.tier];
  const featured = pkg.recommended;
  const itemsRow = [
    itemCardHtml(pkg.flight,'flight'),
    itemCardHtml(pkg.hotel,'hotel'),
    itemCardHtml(pkg.car,'car')
  ].filter(Boolean).join('');

  return `
  <div class="pkg ${pkg.tier} ${featured?'featured':''}" data-base-total="${pkg.total}">
    <div class="pkg-head">
      <div>
        ${featured ? `<span class="pkg-badge">в… PreporuДЌeno</span>` : ''}
        <h3>${meta.label}</h3>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;">${meta.desc}</div>
      </div>
      <div class="pkg-total">
        <div class="num tabular">${fmtEUR(pkg.total)}</div>
        <div class="cur">ukupno</div>
        <div class="hint">zbir odvojenih rezervacija, ne jedno plaД‡anje</div>
      </div>
    </div>
    <div class="pkg-score">
      <span><strong style="color:var(--ink);font-weight:600;">Skor ${pkg.score}/100</strong> вЂ” odnos cene i kvaliteta</span>
    </div>
    ${itemsRow ? `<div class="items-row">${itemsRow}</div>` : ''}
    ${(() => {
      const extraTiles = [
        pkg.activity ? `<div class="extra activity-extra">${iconSvg('activity')}<div><div class="lab">${escapeHtml(pkg.activity.name.split(' вЂ” ')[0])}</div><div class="val tabular">${fmtEUR(pkg.activity.price)}</div></div><button class="extra-btn" data-kind="activity" data-price="${pkg.activity.price}" data-url="${escapeHtml(pkg.activity.bookUrl||'')}" onclick="bookItem(this)">Viator</button></div>` : '',
        pkg.car ? `<div class="extra fuel-extra">${iconSvg('fuel')}<div><div class="lab">${t('fuel_estimate')}</div><div class="val tabular">${fmtEUR(pkg.fuel)}</div></div></div>` : '',
        pkg.car ? `<div class="extra tolls-extra">${iconSvg('tolls')}<div><div class="lab">${t('tolls_estimate')}</div><div class="val tabular">${fmtEUR(pkg.tolls)}</div></div></div>` : '',
        `<label class="extra insurance-extra addon-extra">${iconSvg('insurance')}<div><div class="lab">${t('insurance')}</div><div class="val tabular">+${fmtEUR(pkg.insuranceCost)}</div></div><input type="checkbox" class="addon-checkbox" data-price="${pkg.insuranceCost}" onchange="toggleAddon(this)"></label>`,
        `<div class="extra esim-extra addon-extra"><label class="addon-label"><input type="checkbox" class="addon-checkbox" data-price="${pkg.esimCost}" onchange="toggleAddon(this)">${iconSvg('esim')}<div><div class="lab">${t('esim_internet')}</div><div class="val tabular">+${fmtEUR(pkg.esimCost)}</div></div></label><button type="button" class="extra-btn" data-kind="esim" data-price="${pkg.esimCost}" data-url="${escapeHtml(pkg.esimBookUrl||'')}" onclick="bookItem(this)">Airalo</button></div>`
      ].filter(Boolean).join('');
      return extraTiles ? `<div class="extras-row">${extraTiles}</div>` : '';
    })()}
    <div class="confirm-banner">
      <span>${iconSvg('check')} ${t('base_package_note')}</span>
      <span><span class="amt-lab">Ukupno:</span><span class="amt tabular">${fmtEUR(pkg.total)}</span></span>
    </div>
    <button type="button" class="pkg-save-btn" onclick="saveSearchPackage('${pkg.tier}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
      SaДЌuvaj ovu ponudu
    </button>
    <button type="button" class="pkg-alert-btn" onclick="openAlertModal('search', '${pkg.tier}', ${pkg.total})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 3a5 5 0 00-5 5v3.2c0 .9-.35 1.75-.98 2.4L4.6 15h14.8l-1.42-1.4a3.4 3.4 0 01-.98-2.4V8a5 5 0 00-5-5z"/><path d="M9.5 19a2.6 2.6 0 005 0"/></svg>
      Javi mi kad padne cena
    </button>
  </div>`;
}

/* ==========================================================
   Prikaz rezultata za "Iznenadi me" вЂ” 3 RAZLIДЊITE destinacije
   (uvek 'best' tier) umesto 3 tier-a ISTE destinacije. Deli
   #resultsHead/#resultsBody sa obiДЌnom pretragom (isti kontejner),
   samo drugaДЌiji sadrЕѕaj.
========================================================== */
function surprisePkgHtml(pick, idx, budget){
  const {dest, country, pkg} = pick;
  const itemsRow = [
    itemCardHtml(pkg.flight,'flight'),
    itemCardHtml(pkg.hotel,'hotel'),
    itemCardHtml(pkg.car,'car')
  ].filter(Boolean).join('');
  const fits = pkg.total <= budget;

  return `
  <div class="pkg surprise-pkg" data-base-total="${pkg.total}">
    <div class="pkg-head">
      <div>
        <span class="pkg-badge surprise-badge">рџЋІ Predlog</span>
        <h3>${escapeHtml(dest)}</h3>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;">${escapeHtml(country)} В· Best Value</div>
      </div>
      <div class="pkg-total">
        <div class="num tabular">${fmtEUR(pkg.total)}</div>
        <div class="cur">ukupno</div>
        <div class="hint">zbir odvojenih rezervacija, ne jedno plaД‡anje</div>
      </div>
    </div>
    ${itemsRow ? `<div class="items-row">${itemsRow}</div>` : ''}
    <div class="confirm-banner">
      <span>${iconSvg('check')} ${fits ? t('fits_budget') + fmtEUR(budget) + '.' : t('over_budget')}</span>
      <span><span class="amt-lab">Ukupno:</span><span class="amt tabular">${fmtEUR(pkg.total)}</span></span>
    </div>
    <button type="button" class="pkg-save-btn" onclick="exploreSurpriseDestination(${idx})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M9 18l6-6-6-6"/></svg>
      Vidi sve opcije za ${escapeHtml(dest)}
    </button>
    <button type="button" class="pkg-save-btn" onclick="saveSurprisePackage(${idx})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
      SaДЌuvaj ovu ponudu
    </button>
    <button type="button" class="pkg-alert-btn" onclick="openAlertModal('search', 'best', ${pkg.total}, '${escapeHtml(dest).replace(/'/g,"\\'")}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 3a5 5 0 00-5 5v3.2c0 .9-.35 1.75-.98 2.4L4.6 15h14.8l-1.42-1.4a3.4 3.4 0 01-.98-2.4V8a5 5 0 00-5-5z"/><path d="M9.5 19a2.6 2.6 0 005 0"/></svg>
      Javi mi kad padne cena
    </button>
  </div>`;
}

function renderSurpriseResults(picks, ctxBase, budget, usedFallback){
  window._lastSurprisePicks = picks;
  window._lastSurpriseCtx = ctxBase;

  const head = document.getElementById('resultsHead');
  head.innerHTML = `
    <div class="status-banner">
      <div class="status-left">
        <div class="status-check">рџЋІ</div>
        <div><h3>3 predloga za budЕѕet od ${fmtEUR(budget)}.</h3><p>${usedFallback ? 'Nijedan grad se u potpunosti nije uklopio u budЕѕet вЂ” evo 3 najjeftinije opcije koje imamo.' : 'NasumiДЌno odabrano od preko 100 gradova koji se uklapaju u tvoj budЕѕet.'}</p></div>
      </div>
      <div class="status-pills">
        <div class="pill">${iconSvg('calendar')} ${fmtDate(ctxBase.from)} вЂ“ ${fmtDate(ctxBase.to)}</div>
        <div class="pill">${iconSvg('people')} ${ctxBase.adults} ${passengerLabel(ctxBase.adults)}</div>
      </div>
    </div>
  `;

  const body = document.getElementById('resultsBody');
  body.innerHTML = `
    <div class="packages">${picks.map((p,i)=>surprisePkgHtml(p, i, budget)).join('')}</div>
    <button type="button" class="btn-alert surprise-reroll-btn" onclick="runSurpriseSearch(true)">рџЋІ Probaj druga 3 predloga</button>
    <p class="disclaimer">вљ пёЏ Skoknica je trenutno u razvoju вЂ” prikazane cene su ilustrativan primer, generisan lokalno radi demonstracije, i <strong>nisu preuzete uЕѕivo</strong> sa partnerskih sajtova.</p>
  `;
}

async function runSurpriseSearch(isReroll){
  const budget = Number(document.getElementById('surpriseBudget').value);
  if (!budget || budget <= 0){ showToast('Unesi budЕѕet veД‡i od 0.'); return; }

  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  const adults = document.getElementById('adults').value;
  const flags = {
    flight:    document.querySelector('.toggle[data-t="flight"]').classList.contains('on'),
    hotel:     document.querySelector('.toggle[data-t="hotel"]').classList.contains('on'),
    car:       document.querySelector('.toggle[data-t="car"]').classList.contains('on'),
    activity:  document.querySelector('.toggle[data-t="activity"]').classList.contains('on'),
  };

  if (!isReroll) closeSurpriseModal();

  const results = document.getElementById('results');
  results.classList.add('visible');
  if (!isReroll){
    document.getElementById('resultsHead').innerHTML = '';
    document.getElementById('resultsBody').innerHTML = '<div class="loading"><div class="spin"></div>' + (getLang()==='en' ? 'Searching 3 destinations that fit your budgetвЂ¦' : 'TraЕѕimo 3 destinacije koje se uklapaju u tvoj budЕѕetвЂ¦') + '</div>';
    results.scrollIntoView({behavior:'smooth', block:'start'});
  }

  state.searches += 1;
  document.getElementById('statLast').textContent = 'рџЋІ ' + fmtEUR(budget);
  updateStats();

  setTimeout(()=>{
    const candidates = computeSurpriseCandidates(from, to, adults, flags);
    const {picks, usedFallback} = pickSurpriseDestinations(budget, candidates, 3);
    renderSurpriseResults(picks, {from, to, adults}, budget, usedFallback);
  }, isReroll ? 0 : 700);
}

// Klik na "Vidi sve opcije za {grad}" вЂ” prebacuje na normalnu pretragu
// (sva 3 tier-a) za taj konkretni grad, umesto samo 'best' predloga.
function exploreSurpriseDestination(idx){
  const pick = (window._lastSurprisePicks || [])[idx];
  if (!pick) return;
  document.getElementById('dest').value = pick.dest;
  runSearch(true);
}

async function saveSurprisePackage(idx){
  const user = await getCurrentUser();
  if (!user){
    _authBarExpanded = true;
    renderSavedTrips();
    document.getElementById('authBar').scrollIntoView({behavior:'smooth', block:'center'});
    showToast('Prijavi se emailom da saДЌuvaЕЎ ponudu.');
    return;
  }
  const pick = (window._lastSurprisePicks || [])[idx];
  const ctx = window._lastSurpriseCtx;
  if (!pick || !ctx){ showToast('Ponuda viЕЎe nije dostupna вЂ” probaj ponovo.'); return; }

  const summaryTags = [
    'рџЋІ Iznenadi me',
    pick.pkg.flight ? pick.pkg.flight.name : 'Bez leta',
    pick.pkg.hotel ? pick.pkg.hotel.name : 'Bez hotela',
    pick.pkg.car ? 'Sa autom' : 'Bez auta'
  ];

  const { error } = await sb.from('trips').insert({
    user_id: user.id,
    dest: pick.dest,
    date_from: ctx.from,
    date_to: ctx.to,
    adults: Number(ctx.adults),
    selection: {kind:'search', tier:'best', tierLabel:'Best Value (Iznenadi me)', summaryTags},
    total: pick.pkg.total
  });
  if (error){ showToast('GreЕЎka pri ДЌuvanju: ' + error.message); return; }
  renderSavedTrips();
  showToast(pick.dest + ' saДЌuvan (' + fmtEUR(pick.pkg.total) + ').');
}

function openSurpriseModal(){
  document.getElementById('surpriseBudget').value = '';
  document.getElementById('surpriseModalBackdrop').classList.add('open');
  document.getElementById('surpriseModal').classList.add('open');
  document.getElementById('surpriseBudget').focus();
}
function closeSurpriseModal(){
  document.getElementById('surpriseModalBackdrop').classList.remove('open');
  document.getElementById('surpriseModal').classList.remove('open');
}

/* UЕѕivo sabiranje dodataka (osiguranje/eSIM) na cenu paketa вЂ” bez ponovne
   pretrage. Svaki .pkg pamti svoju osnovnu cenu u data-base-total, a ovde
   se na nju dodaje zbir ДЌekiranih dodataka unutar TOG istog paketa. */
function toggleAddon(checkbox){
  const pkgEl = checkbox.closest('.pkg');
  if (!pkgEl) return;
  const base = Number(pkgEl.dataset.baseTotal) || 0;
  let sum = base;
  pkgEl.querySelectorAll('.addon-checkbox:checked').forEach(cb => { sum += Number(cb.dataset.price) || 0; });
  const totalEl = pkgEl.querySelector('.pkg-total .num');
  const confirmEl = pkgEl.querySelector('.confirm-banner .amt');
  if (totalEl) totalEl.textContent = fmtEUR(sum);
  if (confirmEl) confirmEl.textContent = fmtEUR(sum);
}

/* ==========================================================
   AFFILIATE CLICK SIMULATION
   Mirrors /go/offer123 -> save click -> redirect
========================================================== */
function bookItem(btn){
  const kind = btn.dataset.kind;
  const price = Number(btn.dataset.price);
  const url = btn.dataset.url;
  state.clicks += 1;
  state.revenue += Math.round(price * 0.04); // mock ~4% affiliate commission
  updateStats();
  const labels = {
    flight:   'let na KAYAK-u',
    hotel:    'smeЕЎtaj na Booking.com',
    car:      'auto na Booking.com',
    activity: 'aktivnost na Viator-u',
    esim:     'eSIM na Airalo-u'
  };
  showToast('Klik zabeleЕѕen za ' + (labels[kind]||kind) + ' (' + fmtEUR(price) + ') В· otvaram partneraвЂ¦');
  if (url) window.open(url, '_blank', 'noopener');
}

function showToast(msg){
  const t = document.getElementById('toast');
  document.getElementById('toastText').textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('show'), 3200);
}

function updateStats(){
  document.getElementById('statSearches').textContent = state.searches;
  document.getElementById('statClicks').textContent = state.clicks;
  document.getElementById('statRevenue').textContent = fmtEUR(state.revenue);
}

/* ==========================================================
   FORM WIRING
========================================================== */
/* ---- "Polazak" (poreklo/origin) je bitno SAMO kad se traЕѕi let вЂ” za
   hotel/auto/aktivnosti nema smisla pitati odakle korisnik kreД‡e. Polje
   se sakriva kad je "Letovi" toggle iskljuДЌen (i to je podrazumevano
   stanje pri uДЌitavanju stranice), a ponovo se pojavljuje ДЌim se let
   ukljuДЌi. Required atribut prati isto stanje, da prazno polje ne
   blokira slanje forme kad let uopЕЎte nije deo pretrage. ---- */
function updateOriginVisibility(showOrigin){
  const stub = document.getElementById('originStub');
  const originInput = document.getElementById('origin');
  if (!stub || !originInput) return;
  stub.style.display = showOrigin ? '' : 'none';
  if (showOrigin) originInput.setAttribute('required', 'required');
  else originInput.removeAttribute('required');
}

document.querySelectorAll('.toggle').forEach(t=>{
  t.addEventListener('click', (e)=>{
    e.preventDefault();
    const input = t.querySelector('input');
    input.checked = !input.checked;
    t.classList.toggle('on', input.checked);
    if (t.dataset.t === 'flight') updateOriginVisibility(input.checked);
  });
});

// Postavi poДЌetno stanje u skladu sa checkbox-om koji je veД‡ markiran u HTML-u
// (trenutno "Letovi" nije ukljuДЌen po default-u, pa se polje krije od starta).
updateOriginVisibility(document.querySelector('.toggle[data-t="flight"] input').checked);

async function runSearch(shouldScroll){
  const dest = document.getElementById('dest').value.trim() || 'Atina';
  const originCode = document.getElementById('origin').value.trim();
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  const adults = document.getElementById('adults').value;
  const flags = {
    flight:    document.querySelector('.toggle[data-t="flight"]').classList.contains('on'),
    hotel:     document.querySelector('.toggle[data-t="hotel"]').classList.contains('on'),
    car:       document.querySelector('.toggle[data-t="car"]').classList.contains('on'),
    activity:  document.querySelector('.toggle[data-t="activity"]').classList.contains('on'),
  };
  const nights = nightsBetween(from, to);
  const days = nights;

  const results = document.getElementById('results');
  results.classList.add('visible');
  document.getElementById('resultsHead').innerHTML = '';
  document.getElementById('resultsBody').innerHTML = '<div class="loading"><div class="spin"></div>PretraЕѕujemo letove, smeЕЎtaj, aute i aktivnostiвЂ¦</div>';
  if (shouldScroll) results.scrollIntoView({behavior:'smooth', block:'start'});

  state.searches += 1;
  document.getElementById('statLast').textContent = dest;
  updateStats();

  setTimeout(()=>{
    renderResults(dest, from, to, nights, days, adults, flags, originCode);
  }, 700);
}

document.getElementById('searchForm').addEventListener('submit', function(e){
  e.preventDefault();
  runSearch(true);
});

/* ==========================================================
   BUILD-YOUR-OWN ("Napravi svoj aranЕѕman")
========================================================== */
// Jedini izvor default vrednosti вЂ” ДЌuvamo posebno od builderState (koji se
// mutira tokom rada) da bismo mogli da RESETUJEMO na siguran default pre
// uДЌitavanja saДЌuvanog aranЕѕmana (vidi loadSavedTrip). Bez ovog reseta,
// polje koje nedostaje u starom saДЌuvanom zapisu (npr. jer je dodato tek
// kasnije u builderState) ne bi dobilo fallback вЂ” ostalo bi kakvo je bilo
// pre poziva (stanje iz prethodno uДЌitanog aranЕѕmana ili undefined), ЕЎto bi
// computeCustomPackage moglo da pretvori u NaN cene.
const BUILDER_DEFAULTS = {
  flightPref: 'direct',
  airlineName: '',
  hotelStars: 4,
  prioritizeRating: false,
  prioritizeLocation: false,
  carPref: 'small',
  activityCount: 2,
  budget: null
};
const builderState = Object.assign({}, BUILDER_DEFAULTS);

function builderCtx(){
  const dest = document.getElementById('dest').value.trim() || 'Atina';
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  const adults = Number(document.getElementById('adults').value) || 2;
  const nights = nightsBetween(from, to);
  return {dest, nights, days:nights, adults};
}

function computeCustomPackage(sel, ctx){
  // Seed zavisi SAMO od izbora koji stvarno utiДЌu na SASTAV aranЕѕmana
  // (let, hotel, auto, aktivnosti) вЂ” budЕѕet je iskljuДЌen iz istog razloga
  // kao i pre (samo prag za poreД‘enje, ne treba da menja generisane cene).
  // airlineName je TAKOДђE namerno iskljuДЌen: to je slobodan tekst koji
  // korisnik kuca slovo po slovo, i kad bi bio deo seed-a, svaki novi
  // karakter bi generisao potpuno nov seed в†’ hotel/auto/aktivnosti cene
  // bi "treperele" i menjale se pri svakom tasteru, iako se niЕЎta
  // semantiДЌki bitno za njih nije promenilo. Ime avio-kompanije i dalje
  // utiДЌe na PRIKAZ leta (flightName ispod), samo ne na seed generatora.
  const seedSel = {
    flightPref: sel.flightPref,
    hotelStars: sel.hotelStars,
    prioritizeRating: sel.prioritizeRating,
    prioritizeLocation: sel.prioritizeLocation,
    carPref: sel.carPref,
    activityCount: sel.activityCount
  };
  const seedStr = ctx.dest.toLowerCase()+'|'+JSON.stringify(seedSel)+'|'+ctx.nights+'|'+ctx.adults;
  const rng = seededRandom(hashSeed(seedStr));

  // --- Flight ---
  const flightBase = 55 + rng()*130;
  const flightMult = {direct:1.05, cheapest:0.72, airline:1.15}[sel.flightPref];
  const flightPrice = Math.round(flightBase * flightMult * ctx.adults);
  const carriers = ['Wizz Air','Air Serbia','Ryanair','Aegean','Lufthansa'];
  // NAPOMENA: ako je flightPref==='airline' i ime je uneto, grana ispod
  // NE zove rng() (carriers[...] se preskaДЌe) вЂ” to je namerno, jer inaДЌe
  // bi svaki prelaz prazno/popunjeno polje pomerio redosled sledeД‡ih
  // rng() poziva (hotel, auto...) za jedno mesto. PoЕЎto je ova grana
  // stabilna za SVAKI neprazan unos (bilo koje slovo znaДЌi "preskoДЌi"),
  // cene se ne pomeraju dok korisnik kuca вЂ” samo pri prvom i poslednjem
  // karakteru (prazno в†” nije prazno), ЕЎto je prihvatljivo i retko.
  const flightName = sel.flightPref === 'airline' && sel.airlineName
    ? sel.airlineName + ' в†’ ' + ctx.dest
    : carriers[Math.floor(rng()*carriers.length)] + ' в†’ ' + ctx.dest;
  const flightSub = sel.flightPref === 'cheapest' ? 'jedno presedanje' : 'direktan let';

  // --- Hotel ---
  const hotelBasePerNight = {3:36, 4:66, 5:122}[sel.hotelStars] + rng()*22;
  let hotelMult = 1;
  if (sel.prioritizeRating) hotelMult += 0.10;
  if (sel.prioritizeLocation) hotelMult += 0.07;
  const hotelPrice = Math.round(hotelBasePerNight * hotelMult * ctx.nights * Math.ceil(ctx.adults/2));
  let hotelRating = {3:7.7, 4:8.6, 5:9.2}[sel.hotelStars] + rng()*0.25;
  if (sel.prioritizeRating) hotelRating += 0.25;
  hotelRating = Math.min(9.9, hotelRating);

  // --- Car ---
  const carPerDay = {none:0, small:31, suv:57}[sel.carPref] + (sel.carPref==='none'?0:rng()*11);
  const carPrice = Math.round(carPerDay * ctx.days);

  // --- Activities ---
  const perActivity = 21 + rng()*17;
  const activityPrice = Math.round(perActivity * sel.activityCount);

  // --- Gorivo i putarine (samo ako je auto ukljuДЌen) ---
  const carExtras = sel.carPref === 'none' ? 0 : Math.round(18 + rng()*20);
  // --- Taksa za rezervaciju ---
  const bookingFee = Math.round(10 + rng()*10);

  const total = flightPrice + hotelPrice + carPrice + activityPrice + carExtras + bookingFee;

  return {
    flight: {price:flightPrice, name:flightName, sub:flightSub},
    hotel:  {price:hotelPrice, rating:Number(hotelRating.toFixed(1)), stars:sel.hotelStars},
    car:    {price:carPrice, pref:sel.carPref},
    activity: {price:activityPrice, count:sel.activityCount},
    carExtras: {price:carExtras},
    bookingFee: {price:bookingFee},
    total
  };
}

function renderBuilder(){
  const ctx = builderCtx();
  const pkg = computeCustomPackage(builderState, ctx);

  const lines = document.getElementById('builderLines');
  const rows = [
    ['вњ€пёЏ', 'Let', pkg.flight.price],
    ['рџЏЁ', 'Hotel', pkg.hotel.price],
  ];
  if (builderState.carPref !== 'none') rows.push(['рџљ—', 'Auto', pkg.car.price]);
  if (builderState.activityCount > 0) rows.push(['рџЋџпёЏ', 'Aktivnosti', pkg.activity.price]);
  if (pkg.carExtras.price > 0) rows.push(['в›Ѕ', 'Gorivo i putarine', pkg.carExtras.price]);
  rows.push(['рџ§ѕ', 'Taksa za rezervaciju', pkg.bookingFee.price]);

  lines.innerHTML = rows.map(([ic,name,price]) => `
    <div class="builder-line">
      <span class="lname">${ic} ${name}</span>
      <span class="lval tabular">${fmtEUR(price)}</span>
    </div>`).join('');

  document.getElementById('builderTotal').textContent = fmtEUR(pkg.total);
  document.getElementById('builderTotalSub').textContent =
    'ukupno za ' + ctx.adults + ' osob' + (ctx.adults===1?'u':'e') + ' / ' + ctx.nights + ' dana';

  const statusEl = document.getElementById('builderBudgetStatus');
  if (builderState.budget) {
    statusEl.classList.add('show');
    if (pkg.total <= builderState.budget) {
      statusEl.className = 'builder-budget-status show ok';
      statusEl.innerHTML = 'вњ“ U okviru budЕѕeta od ' + fmtEUR(builderState.budget);
    } else {
      statusEl.className = 'builder-budget-status show over';
      statusEl.innerHTML = 'вљ  ' + fmtEUR(pkg.total - builderState.budget) + ' preko budЕѕeta od ' + fmtEUR(builderState.budget);
    }
  } else {
    statusEl.className = 'builder-budget-status';
    statusEl.innerHTML = '';
  }

  document.getElementById('optimizeResult').style.display = 'none';
  window._lastBuilderPkg = pkg;

  // --- Rezervacija po stavci (isti affiliate linkovi kao u gotovim ponudama) ---
  const linkCtx = Object.assign({}, ctx, {
    from: document.getElementById('dateFrom').value,
    to: document.getElementById('dateTo').value
  });
  const bookBtns = [
    `<button type="button" class="item-btn flight" data-kind="flight" data-price="${pkg.flight.price}" data-url="${escapeHtml(buildAffiliateLink('flight', linkCtx))}" onclick="bookItem(this)">вњ€пёЏ KAYAK</button>`,
    `<button type="button" class="item-btn hotel" data-kind="hotel" data-price="${pkg.hotel.price}" data-url="${escapeHtml(buildAffiliateLink('hotel', linkCtx))}" onclick="bookItem(this)">рџЏЁ Booking.com</button>`
  ];
  if (builderState.carPref !== 'none'){
    bookBtns.push(`<button type="button" class="item-btn car" data-kind="car" data-price="${pkg.car.price}" data-url="${escapeHtml(buildAffiliateLink('car', linkCtx))}" onclick="bookItem(this)">рџљ— Booking.com</button>`);
  }
  if (builderState.activityCount > 0){
    bookBtns.push(`<button type="button" class="item-btn" style="background:var(--aqua);" data-kind="activity" data-price="${pkg.activity.price}" data-url="${escapeHtml(buildAffiliateLink('activity', linkCtx))}" onclick="bookItem(this)">рџЋџпёЏ Viator</button>`);
  }
  document.getElementById('builderBookLinks').innerHTML =
    '<div class="bbl-label">RezerviЕЎi svaku stavku direktno kod partnera:</div>' +
    '<div class="builder-book-row">' + bookBtns.join('') + '</div>';
}

function wireChipGroup(groupName, onChange){
  document.querySelectorAll('.chip-row[data-group="'+groupName+'"] .chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      document.querySelectorAll('.chip-row[data-group="'+groupName+'"] .chip').forEach(c=>c.classList.remove('on'));
      chip.classList.add('on');
      onChange(chip.dataset.value);
    });
  });
}

wireChipGroup('flightPref', (val)=>{
  builderState.flightPref = val;
  document.getElementById('airlineName').style.display = (val === 'airline') ? 'block' : 'none';
  renderBuilder();
});
document.getElementById('airlineName').addEventListener('input', (e)=>{
  builderState.airlineName = e.target.value.trim();
  renderBuilder();
});

wireChipGroup('hotelStars', (val)=>{
  builderState.hotelStars = Number(val);
  renderBuilder();
});

wireChipGroup('carPref', (val)=>{
  builderState.carPref = val;
  renderBuilder();
});

document.querySelectorAll('.toggle-chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    chip.classList.toggle('on');
    builderState[chip.dataset.toggle] = chip.classList.contains('on');
    renderBuilder();
  });
});

document.getElementById('actMinus').addEventListener('click', ()=>{
  builderState.activityCount = Math.max(0, builderState.activityCount - 1);
  document.getElementById('actCount').textContent = builderState.activityCount;
  renderBuilder();
});
document.getElementById('actPlus').addEventListener('click', ()=>{
  builderState.activityCount = Math.min(8, builderState.activityCount + 1);
  document.getElementById('actCount').textContent = builderState.activityCount;
  renderBuilder();
});

// Gornja granica je namerno velikoduЕЎna (niko realno ne planira izlet
// preko ovoga), samo spreДЌava apsurdne unose tipa "1e10" ili sluДЌajno
// dodat nepotreban nule. BudЕѕet mora biti ceo broj > 0, ne negativan
// i ne decimalan вЂ” sve ostalo se ili odbacuje (null) ili zaokruЕѕuje/seДЌe.
const MAX_BUDGET = 50000;

document.getElementById('budgetInput').addEventListener('input', (e)=>{
  const raw = e.target.value;
  if (!raw) { builderState.budget = null; renderBuilder(); return; }

  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n <= 0) {
    // Prazno/nevalidno/negativno dok korisnik joЕЎ kuca (npr. samo "-") вЂ”
    // ne diramo polje, samo privremeno ignoriЕЎemo budЕѕet u proraДЌunu.
    builderState.budget = null;
  } else {
    const clamped = Math.min(n, MAX_BUDGET);
    // Ako je uneta decimala ili broj veД‡i od granice, ispravi i prikaz
    // u polju da korisnik vidi taДЌno koja vrednost se zapravo koristi.
    if (String(clamped) !== raw) e.target.value = clamped;
    builderState.budget = clamped;
  }
  renderBuilder();
});

// Recalculate live if destination/dates/passengers change up in the ticket
['dest','dateFrom','dateTo','adults'].forEach(id=>{
  document.getElementById(id).addEventListener('input', renderBuilder);
  document.getElementById(id).addEventListener('change', renderBuilder);
});

/* ---- Optimizacija: proba SVE dostupne poluge (hotel, auto, aktivnosti),
   ne samo hotel вЂ” i predlaЕѕe onu sa najveД‡om uЕЎtedom. "VeД‡ optimalno" se
   sada prikazuje samo ako ni jedna poluga stvarno ne postoji ili ni jedna
   ne donosi uЕЎtedu, ne ДЌim prva proverena poluga (hotel) padne na 3в…. ---- */
document.getElementById('optimizeBtn').addEventListener('click', ()=>{
  const ctx = builderCtx();
  const current = window._lastBuilderPkg || computeCustomPackage(builderState, ctx);
  const candidates = [];

  // Poluga 1: hotel jednu zvezdicu niЕѕe.
  if (builderState.hotelStars > 3) {
    const testSel = Object.assign({}, builderState, {hotelStars: builderState.hotelStars - 1});
    const alt = computeCustomPackage(testSel, ctx);
    candidates.push({
      testSel,
      savings: current.total - alt.total,
      message: `Ako promeniЕЎ hotel na ${testSel.hotelStars}в…, zadrЕѕavaЕЎ skoro istu lokaciju uz malo niЕѕu ocenu (${alt.hotel.rating} umesto ${current.hotel.rating}).`,
      toastMsg: 'hotel promenjen na ' + testSel.hotelStars + 'в….',
      apply(){
        document.querySelectorAll('.chip-row[data-group="hotelStars"] .chip').forEach(c=>{
          c.classList.toggle('on', Number(c.dataset.value) === testSel.hotelStars);
        });
      }
    });
  }

  // Poluga 2: manji auto (SUV в†’ mali auto в†’ bez auta).
  const carDowngrade = {suv:'small', small:'none'}[builderState.carPref];
  if (carDowngrade) {
    const testSel = Object.assign({}, builderState, {carPref: carDowngrade});
    const alt = computeCustomPackage(testSel, ctx);
    candidates.push({
      testSel,
      savings: current.total - alt.total,
      message: carDowngrade === 'none'
        ? 'Ako odustaneЕЎ od iznajmljivanja auta, gubiЕЎ deo fleksibilnosti u kretanju, ali ЕЎtediЕЎ i na gorivu i putarinama.'
        : 'Ako uzmeЕЎ manji auto umesto SUV-a, uЕЎtedu dobijaЕЎ uz neЕЎto manje prtljaЕѕnog prostora.',
      toastMsg: 'auto promenjen na ' + (carDowngrade === 'none' ? 'bez auta' : 'mali auto') + '.',
      apply(){
        document.querySelectorAll('.chip-row[data-group="carPref"] .chip').forEach(c=>{
          c.classList.toggle('on', c.dataset.value === testSel.carPref);
        });
      }
    });
  }

  // Poluga 3: jedna aktivnost manje.
  if (builderState.activityCount > 0) {
    const testSel = Object.assign({}, builderState, {activityCount: builderState.activityCount - 1});
    const alt = computeCustomPackage(testSel, ctx);
    candidates.push({
      testSel,
      savings: current.total - alt.total,
      message: `Ako smanjiЕЎ broj aktivnosti na ${testSel.activityCount}, ostaje ti i dalje dovoljno vremena za slobodno istraЕѕivanje.`,
      toastMsg: 'broj aktivnosti smanjen na ' + testSel.activityCount + '.',
      apply(){
        document.getElementById('actCount').textContent = testSel.activityCount;
      }
    });
  }

  const box = document.getElementById('optimizeResult');
  box.style.display = 'block';

  const viable = candidates.filter(c => c.savings > 0).sort((a,b) => b.savings - a.savings);
  if (!viable.length) {
    box.innerHTML = candidates.length
      ? '<span class="save">AranЕѕman je veД‡ optimalan</span>Proverili smo hotel, auto i broj aktivnosti вЂ” trenutna kombinacija je veД‡ najjeftinija za odabrane kriterijume.'
      : '<span class="save">AranЕѕman je veД‡ optimalan</span>VeД‡ si na najniЕѕim opcijama za sve stavke вЂ” nema oДЌiglednog mesta za uЕЎtedu bez gubitka udobnosti.';
    return;
  }

  const best = viable[0];
  box.innerHTML = `
    <span class="save">MoЕѕeЕЎ uЕЎtedeti ${fmtEUR(best.savings)}</span>
    ${best.message}
    <button type="button" class="optimize-apply" id="applyOptimize">Primeni ovu izmenu</button>
  `;
  document.getElementById('applyOptimize').addEventListener('click', ()=>{
    Object.assign(builderState, best.testSel);
    best.apply();
    renderBuilder();
    showToast('AranЕѕman aЕѕuriran вЂ” ' + best.toastMsg);
  });
});

document.getElementById('makeBuilderBtn').addEventListener('click', ()=>{
  const destInput = document.getElementById('dest');
  if (!destInput.value.trim()){
    showToast('Unesi destinaciju da bismo napravili aranЕѕman.');
    destInput.focus();
    destInput.scrollIntoView({behavior:'smooth', block:'center'});
    return;
  }
  renderBuilder();
  document.getElementById('builderSummary').style.display = 'block';
  document.getElementById('builderPlaceholder').style.display = 'none';
});

/* ==========================================================
   POPULARNE DESTINACIJE вЂ” statiДЌne kartice u HTML-u (SEO sadrЕѕaj
   vidljiv i bez JS-a); klik samo puni postojeД‡u formu i pokreД‡e
   isti runSearch() koji se koristi za "PronaД‘i najbolje putovanje".
   Namerno stoji PRE Supabase inicijalizacije ispod вЂ” ako config.js
   nedostane ili baci greЕЎku, ovo i dalje treba da radi.
========================================================== */
document.querySelectorAll('.popular-dest-card').forEach(card => {
  card.addEventListener('click', () => {
    document.getElementById('dest').value = card.dataset.dest;
    document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
    runSearch(false);
  });
});

/* ==========================================================
   MOJA PUTOVANJA вЂ” Supabase (auth.users + trips tabela).
   Prijava je email magic-link (OTP), ne treba Google/OAuth podesavanje.
   Ako Supabase iz nekog razloga ne odgovori (mreza, pogresan kljuc),
   sekcija samo ostaje prazna вЂ” ne obara ostatak sajta.
========================================================== */
let sb = null;
try {
  sb = window.supabase.createClient(window.SKOKNICA_SUPABASE_URL, window.SKOKNICA_SUPABASE_KEY);
} catch (err) {
  console.warn('[skoknica] Supabase init nije uspeo вЂ” nalog/saДЌuvani aranЕѕmani neД‡e raditi, ali ostatak sajta hoД‡e:', err.message);
}

async function getCurrentUser(){
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getUser();
    return (data && data.user) || null;
  } catch(err){
    console.warn('[skoknica] auth nedostupan:', err.message);
    return null;
  }
}

let _authBarExpanded = false;
function renderAuthPanel(containerId, user){
  const bar = document.getElementById(containerId);
  if (!bar) return;
  const emailId = containerId + '_email';
  const loginBtnId = containerId + '_loginBtn';
  const logoutBtnId = containerId + '_logoutBtn';
  // U glavnoj sekciji ("authBar") ne guramo email formu odmah u lice вЂ”
  // prvo je tih link, forma se otvara tek kad korisnik zaista hoД‡e da saДЌuva.
  // U dropdown-u iz topbar-a (containerId "authDropdown") forma je uvek otvorena,
  // jer je korisnik tamo veД‡ svesno kliknuo na ikonicu naloga.
  const compact = containerId === 'authBar';
  if (user){
    bar.innerHTML = `
      <div class="auth-row">
        <span class="auth-status">Ulogovan kao <strong>${escapeHtml(user.email)}</strong></span>
        <button type="button" class="auth-btn" id="${logoutBtnId}">Izloguj se</button>
      </div>`;
    document.getElementById(logoutBtnId).addEventListener('click', async ()=>{
      await sb.auth.signOut();
      renderSavedTrips();
    });
  } else if (compact && !_authBarExpanded){
    bar.innerHTML = `<button type="button" class="auth-link" id="${loginBtnId}_reveal">Prijavi se da saДЌuvaЕЎ aranЕѕmane в†’</button>`;
    document.getElementById(loginBtnId + '_reveal').addEventListener('click', ()=>{
      _authBarExpanded = true;
      renderAuthPanel(containerId, user);
    });
  } else {
    const pwId = emailId + '_pw';
    bar.innerHTML = `
      <div class="auth-row">
        <input type="email" id="${emailId}" class="auth-input" placeholder="tvoj@email.com" autocomplete="email">
        <input type="password" id="${pwId}" class="auth-input" placeholder="lozinka (min 6 karaktera)" autocomplete="current-password">
        <button type="button" class="auth-btn" id="${loginBtnId}">Prijavi se / Napravi nalog</button>
      </div>
      <p class="auth-hint">Prva prijava sa ovim emailom i lozinkom automatski pravi nalog вЂ” zapamti lozinku, nema linka za oporavak dok sajt ne bude na pravom domenu.</p>`;
    document.getElementById(emailId).focus();
    document.getElementById(loginBtnId).addEventListener('click', async ()=>{
      const email = document.getElementById(emailId).value.trim();
      const password = document.getElementById(pwId).value;
      if (!email || !password){ showToast('Unesi email i lozinku.'); return; }
      if (password.length < 6){ showToast('Lozinka mora imati bar 6 karaktera.'); return; }

      const { error: signInError } = await sb.auth.signInWithPassword({ email, password });
      if (!signInError){
        renderSavedTrips();
        showToast('Prijavljen kao ' + email + '.');
        return;
      }

      // Ako prijava ne uspe (nalog jos ne postoji), probaj da ga napravis odmah.
      const { error: signUpError } = await sb.auth.signUp({ email, password });
      if (signUpError){ showToast('GreЕЎka: ' + signUpError.message); return; }
      renderSavedTrips();
      showToast('Nalog napravljen i prijavljen kao ' + email + '.');
    });
  }
}

/* ---- Topbar: hamburger meni (mobilni) + dropdown za prijavu ---- */
const mobilePanel = document.getElementById('mobilePanel');
const authDropdown = document.getElementById('authDropdown');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const topAvatarBtn = document.getElementById('topAvatarBtn');

hamburgerBtn.addEventListener('click', ()=>{
  authDropdown.classList.remove('open');
  mobilePanel.classList.toggle('open');
  hamburgerBtn.classList.toggle('open', mobilePanel.classList.contains('open'));
});
topAvatarBtn.addEventListener('click', ()=>{
  mobilePanel.classList.remove('open');
  hamburgerBtn.classList.remove('open');
  authDropdown.classList.toggle('open');
});
document.addEventListener('click', (e)=>{
  if (!e.target.closest('#authDropdown') && !e.target.closest('#topAvatarBtn')) authDropdown.classList.remove('open');
  if (!e.target.closest('#mobilePanel') && !e.target.closest('#hamburgerBtn')){
    mobilePanel.classList.remove('open');
    hamburgerBtn.classList.remove('open');
  }
});


function tierLabelsForSaved(sel){
  if (sel.summaryTags) return sel.summaryTags;
  const flightLabels = {direct:'Direktan let', cheapest:'Najjeftiniji let', airline: sel.airlineName || 'OdreД‘ena kompanija'};
  const carLabels = {none:'Bez auta', small:'Mali auto', suv:'SUV'};
  return [
    flightLabels[sel.flightPref] || 'Let',
    sel.hotelStars + 'в… hotel',
    carLabels[sel.carPref] || 'Auto',
    sel.activityCount + ' aktivnosti'
  ];
}

/* ---------- PoreД‘enje saДЌuvanih aranЕѕmana ----
   Korisnik ДЌekira do 3 kartice; ДЌim su 2+ ДЌekirane, ispod liste se
   pojavljuje tabela koja ih uporeД‘uje jednu pored druge. Ne pravi se
   novi network poziv pri ДЌekiranju вЂ” koristi se _lastSavedTripsCache
   iz poslednjeg fetchSavedTrips() poziva. ---------- */
let compareIds = new Set();
let _lastSavedTripsCache = [];
const COMPARE_MAX = 3;

function renderCompareTable(){
  const wrap = document.getElementById('compareWrap');
  if (!wrap) return;
  const selected = _lastSavedTripsCache.filter(t => compareIds.has(t.id));
  if (selected.length < 2){
    wrap.style.display = 'none';
    wrap.innerHTML = '';
    return;
  }
  const cheapest = Math.min(...selected.map(t => t.total));
  wrap.style.display = 'block';
  wrap.innerHTML = `
    <div class="compare-head">
      <div class="eyebrow">PoreД‘enje</div>
      <h3>Uporedi ${selected.length} saДЌuvana aranЕѕmana</h3>
    </div>
    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead>
          <tr>
            <th></th>
            ${selected.map(t => `<th>${escapeHtml(t.dest)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr><td>Datumi</td>${selected.map(t => `<td>${fmtDate(t.from)} вЂ“ ${fmtDate(t.to)}</td>`).join('')}</tr>
          <tr><td>Putnika</td>${selected.map(t => `<td>${t.adults}</td>`).join('')}</tr>
          <tr><td>Detalji</td>${selected.map(t => `<td>${tierLabelsForSaved(t.sel).map(l => escapeHtml(l)).join('<br>')}</td>`).join('')}</tr>
          <tr class="compare-total-row">
            <td>Procenjeno ukupno</td>
            ${selected.map(t => `<td class="tabular${t.total === cheapest ? ' compare-best' : ''}">${fmtEUR(t.total)}${t.total === cheapest ? '<span class="compare-badge">najjeftinije</span>' : ''}</td>`).join('')}
          </tr>
        </tbody>
      </table>
    </div>
    <button type="button" class="compare-clear" id="compareClearBtn">OДЌisti poreД‘enje</button>
  `;
  document.getElementById('compareClearBtn').addEventListener('click', () => {
    compareIds.clear();
    renderSavedTripsMarkup(_lastSavedTripsCache);
  });
}

function renderSavedTripsMarkup(trips){
  const wrap = document.getElementById('savedTripsList');
  if (!trips.length){
    wrap.innerHTML = '<div class="saved-empty">JoЕЎ nema saДЌuvanih aranЕѕmana. Podesi izbore u builderu iznad i klikni <strong>вЂћSaДЌuvaj aranЕѕmanвЂњ</strong>.</div>';
    renderCompareTable();
    return;
  }
  wrap.innerHTML = '<div class="saved-grid">' + trips.map(t => `
    <div class="saved-card" data-id="${t.id}">
      <label class="sc-compare">
        <input type="checkbox" class="sc-compare-cb" data-id="${t.id}"
          ${compareIds.has(t.id) ? 'checked' : ''}
          ${(!compareIds.has(t.id) && compareIds.size >= COMPARE_MAX) ? 'disabled' : ''}>
        <span>Uporedi</span>
      </label>
      <div class="sc-dest">${escapeHtml(t.dest)}</div>
      <div class="sc-meta">${fmtDate(t.from)} вЂ“ ${fmtDate(t.to)} В· ${t.adults} ${passengerLabel(t.adults)}</div>
      <div class="sc-tags">${tierLabelsForSaved(t.sel).map(l => `<span class="sc-tag">${escapeHtml(l)}</span>`).join('')}</div>
      <div class="sc-total"><span class="lab">procenjeno ukupno</span><span class="num tabular">${fmtEUR(t.total)}</span></div>
      <div class="sc-actions">
        <button type="button" class="sc-btn load" onclick="loadSavedTrip('${t.id}')">UДЌitaj</button>
        <button type="button" class="sc-btn share" onclick="shareTrip('${t.id}')">рџ”— Podeli</button>
        <button type="button" class="sc-btn del" onclick="deleteSavedTrip('${t.id}')">ObriЕЎi</button>
      </div>
    </div>`).join('') + '</div>';

  wrap.querySelectorAll('.sc-compare-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) compareIds.add(cb.dataset.id);
      else compareIds.delete(cb.dataset.id);
      renderSavedTripsMarkup(_lastSavedTripsCache);
    });
  });

  renderCompareTable();
}

async function fetchSavedTrips(){
  const { data, error } = await sb.from('trips').select('*').order('created_at', {ascending:false});
  if (error){ console.warn('[skoknica] ucitavanje putovanja nije uspelo:', error.message); return []; }
  return data.map(row => ({
    id: row.id,
    dest: row.dest,
    from: row.date_from,
    to: row.date_to,
    adults: String(row.adults),
    sel: row.selection,
    total: row.total,
    shareToken: row.share_token || null
  }));
}

async function renderSavedTrips(){
  const user = await getCurrentUser();
  renderAuthPanel('authBar', user);
  renderAuthPanel('authDropdown', user);
  topAvatarBtn.classList.toggle('logged-in', !!user);
  const wrap = document.getElementById('savedTripsList');

  if (!user){
    wrap.innerHTML = '<div class="saved-empty">Prijavi se emailom iznad da vidiЕЎ i ДЌuvaЕЎ svoje aranЕѕmane вЂ” ДЌuvaju se na nalogu, ne u ovom pregledaДЌu.</div>';
    _lastSavedTripsCache = [];
    compareIds.clear();
    renderCompareTable();
    return;
  }

  const trips = await fetchSavedTrips();
  _lastSavedTripsCache = trips;
  // ukloni iz poreД‘enja sve id-jeve koji viЕЎe ne postoje (npr. obrisan aranЕѕman)
  const stillExists = new Set(trips.map(t => t.id));
  compareIds.forEach(id => { if (!stillExists.has(id)) compareIds.delete(id); });

  renderSavedTripsMarkup(trips);
}

async function saveSavedTrip(){
  const user = await getCurrentUser();
  if (!user){
    _authBarExpanded = true;
    renderSavedTrips();
    document.getElementById('authBar').scrollIntoView({behavior:'smooth', block:'center'});
    showToast('Prijavi se emailom da saДЌuvaЕЎ aranЕѕman.');
    return;
  }
  const ctx = builderCtx();
  const pkg = window._lastBuilderPkg || computeCustomPackage(builderState, ctx);
  const { error } = await sb.from('trips').insert({
    user_id: user.id,
    dest: ctx.dest,
    date_from: document.getElementById('dateFrom').value,
    date_to: document.getElementById('dateTo').value,
    adults: Number(document.getElementById('adults').value),
    selection: Object.assign({kind:'builder'}, builderState),
    total: pkg.total
  });
  if (error){ showToast('GreЕЎka pri ДЌuvanju: ' + error.message); return; }
  renderSavedTrips();
  showToast('AranЕѕman za ' + ctx.dest + ' saДЌuvan (' + fmtEUR(pkg.total) + ').');
}

/* ---- ДЊuvanje jedne od 3 gotove ponude iz pretrage (Budget/Best/Comfort) ----
   Za razliku od buildera, ovde nema builderState da se saДЌuva/vrati вЂ” pamtimo
   samo prikazne oznake (summaryTags) i tier, dovoljno da se kartica lepo prikaЕѕe
   na listi. "UДЌitaj" za ovaj tip ponovo pokreД‡e pretragu sa istim parametrima,
   umesto da puni builder (jer selekcija nije builder-oblika). */
async function saveSearchPackage(tier){
  const user = await getCurrentUser();
  if (!user){
    _authBarExpanded = true;
    renderSavedTrips();
    document.getElementById('authBar').scrollIntoView({behavior:'smooth', block:'center'});
    showToast('Prijavi se emailom da saДЌuvaЕЎ ponudu.');
    return;
  }
  const pkg = (window._lastSearchPkgs || []).find(p => p.tier === tier);
  const ctx = window._lastSearchCtx;
  if (!pkg || !ctx){ showToast('Ponuda viЕЎe nije dostupna вЂ” pretraЕѕi ponovo.'); return; }

  const summaryTags = [
    TIER_META[tier].label,
    pkg.flight ? pkg.flight.name : 'Bez leta',
    pkg.hotel ? pkg.hotel.name : 'Bez hotela',
    pkg.car ? 'Sa autom' : 'Bez auta'
  ];

  const { error } = await sb.from('trips').insert({
    user_id: user.id,
    dest: ctx.dest,
    date_from: ctx.from,
    date_to: ctx.to,
    adults: Number(ctx.adults),
    selection: {kind:'search', tier, tierLabel: TIER_META[tier].label, summaryTags},
    total: pkg.total
  });
  if (error){ showToast('GreЕЎka pri ДЌuvanju: ' + error.message); return; }
  renderSavedTrips();
  showToast(TIER_META[tier].label + ' ponuda za ' + ctx.dest + ' saДЌuvana (' + fmtEUR(pkg.total) + ').');
}

async function loadSavedTrip(id){
  const trips = await fetchSavedTrips();
  const t = trips.find(x => x.id === id);
  if (!t) return;

  document.getElementById('dest').value = t.dest;
  document.getElementById('dateFrom').value = t.from;
  document.getElementById('dateTo').value = t.to;
  document.getElementById('adults').value = t.adults;

  // SaДЌuvane ponude iz pretrage (Budget/Best/Comfort) nisu builder-oblika вЂ”
  // za njih nema ЕЎta da se "vrati" u builder chipove, samo ponovo pretraЕѕujemo
  // sa istim parametrima i korisnik opet vidi sve 3 ponude.
  if (t.sel && t.sel.kind === 'search'){
    document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
    showToast('Ponovo pretraЕѕujem za ' + t.dest + ' (' + (t.sel.tierLabel||'') + ')вЂ¦');
    runSearch(false);
    return;
  }

  // Prvo reset na BUILDER_DEFAULTS, pa tek onda t.sel preko toga вЂ” tako
  // svako polje koje nedostaje u starom saДЌuvanom zapisu dobije siguran
  // fallback umesto da nasledi stanje iz prethodno uДЌitanog aranЕѕmana.
  Object.assign(builderState, BUILDER_DEFAULTS, t.sel);

  document.querySelectorAll('.chip-row[data-group="flightPref"] .chip').forEach(c=>{
    c.classList.toggle('on', c.dataset.value === builderState.flightPref);
  });
  document.getElementById('airlineName').style.display = (builderState.flightPref === 'airline') ? 'block' : 'none';
  document.getElementById('airlineName').value = builderState.airlineName || '';

  document.querySelectorAll('.chip-row[data-group="hotelStars"] .chip').forEach(c=>{
    c.classList.toggle('on', Number(c.dataset.value) === builderState.hotelStars);
  });
  document.querySelectorAll('.chip-row[data-group="carPref"] .chip').forEach(c=>{
    c.classList.toggle('on', c.dataset.value === builderState.carPref);
  });
  document.querySelectorAll('.toggle-chip').forEach(chip=>{
    chip.classList.toggle('on', !!builderState[chip.dataset.toggle]);
  });
  document.getElementById('actCount').textContent = builderState.activityCount;

  renderBuilder();
  document.getElementById('builderSummary').style.display = 'block';
  document.getElementById('builderPlaceholder').style.display = 'none';
  document.querySelector('.builder-wrap').scrollIntoView({behavior:'smooth', block:'start'});
  showToast('UДЌitan saДЌuvani aranЕѕman za ' + t.dest + '.');
}

async function deleteSavedTrip(id){
  const { error } = await sb.from('trips').delete().eq('id', id);
  if (error){ showToast('GreЕЎka pri brisanju: ' + error.message); return; }
  renderSavedTrips();
}

document.getElementById('saveTripBtn').addEventListener('click', saveSavedTrip);
if (sb) sb.auth.onAuthStateChange(()=> renderSavedTrips());
renderSavedTrips();

/* ==========================================================
   PRICE ALERTS вЂ” "Javi mi kad padne cena"
   Otvara se sa dugmeta na svakoj gotovoj ponudi (Budget/Best/Comfort)
   ili sa dugmeta u builderu. Upisuje red direktno u price_alerts preko
   anon kljuДЌa (RLS na toj tabeli dozvoljava SAMO insert вЂ” vidi
   supabase/price_alerts.sql), bez potrebe za nalogom/prijavom.
   PeriodiДЌnu proveru i slanje mejla radi poseban Cloudflare Worker
   (worker/price-alert-worker.js), ne ovaj fajl.
========================================================== */
let _alertCtx = null;

function openAlertModal(kind, tierOrNull, currentPrice, destOverride){
  const ctx = builderCtx();
  const dest = destOverride || ctx.dest;
  const selection = (kind === 'search')
    ? {kind:'search', tier:tierOrNull, tierLabel:(TIER_META[tierOrNull]||{}).label || ''}
    : Object.assign({kind:'builder'}, builderState);

  _alertCtx = {
    dest: dest,
    from: document.getElementById('dateFrom').value,
    to: document.getElementById('dateTo').value,
    adults: Number(document.getElementById('adults').value) || 2,
    selection,
    price: Math.round(currentPrice)
  };

  document.getElementById('alertModalSub').textContent =
    'Trenutna procena za ' + dest + ': ' + fmtEUR(_alertCtx.price) + '. JaviД‡emo ti mejlom kad procenjena cena padne ispod praga koji postaviЕЎ.';
  document.getElementById('alertThreshold').value = Math.max(1, Math.round(_alertCtx.price * 0.9));
  document.getElementById('alertEmail').value = '';

  document.getElementById('alertModalBackdrop').classList.add('open');
  document.getElementById('alertModal').classList.add('open');
  document.getElementById('alertEmail').focus();
}

function closeAlertModal(){
  document.getElementById('alertModalBackdrop').classList.remove('open');
  document.getElementById('alertModal').classList.remove('open');
}

document.getElementById('alertBuilderBtn').addEventListener('click', ()=>{
  const ctx = builderCtx();
  const pkg = window._lastBuilderPkg || computeCustomPackage(builderState, ctx);
  openAlertModal('builder', null, pkg.total);
});

document.getElementById('alertModalBackdrop').addEventListener('click', closeAlertModal);
document.getElementById('alertModalClose').addEventListener('click', closeAlertModal);
document.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape' && document.getElementById('alertModal').classList.contains('open')) closeAlertModal();
});

document.getElementById('alertModalSubmit').addEventListener('click', async ()=>{
  if (!_alertCtx) return;
  const email = document.getElementById('alertEmail').value.trim();
  const threshold = Number(document.getElementById('alertThreshold').value);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ showToast('Unesi ispravan email.'); return; }
  if (!threshold || threshold <= 0){ showToast('Unesi ispravan prag u evrima.'); return; }

  const submitBtn = document.getElementById('alertModalSubmit');
  submitBtn.disabled = true;

  const { error } = await sb.from('price_alerts').insert({
    email,
    dest: _alertCtx.dest,
    date_from: _alertCtx.from,
    date_to: _alertCtx.to,
    adults: _alertCtx.adults,
    selection: _alertCtx.selection,
    threshold,
    last_price: _alertCtx.price
  });

  submitBtn.disabled = false;

  if (error){ showToast('GreЕЎka pri postavljanju alerta: ' + error.message); return; }

  closeAlertModal();
  showToast('Gotovo вЂ” javiД‡emo ti na ' + email + ' kad cena padne ispod ' + fmtEUR(threshold) + '.');
});

/* ==========================================================
   "IZNENADI ME" вЂ” wiring dugmeta i modala
========================================================== */
document.getElementById('surpriseModalBackdrop').addEventListener('click', closeSurpriseModal);
document.getElementById('surpriseModalClose').addEventListener('click', closeSurpriseModal);
document.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape' && document.getElementById('surpriseModal').classList.contains('open')) closeSurpriseModal();
});
document.getElementById('surpriseTriggerBtn').addEventListener('click', openSurpriseModal);
document.getElementById('surpriseSectionBtn').addEventListener('click', openSurpriseModal);
document.getElementById('surpriseModalSubmit').addEventListener('click', ()=> runSurpriseSearch(false));
document.getElementById('surpriseBudget').addEventListener('keydown', (e)=>{
  if (e.key === 'Enter'){ e.preventDefault(); runSurpriseSearch(false); }
});

/* ==========================================================
   DELJENJE SA PRIJATELJIMA ("рџ”— Podeli")
   GeneriЕЎe (ili ponovo koristi) share_token na saДЌuvanom aranЕѕmanu i
   pravi javni link ka zajedno.html вЂ” ta stranica radi bez naloga i
   bez app.js (sopstveni inline skript), pristupa bazi iskljuДЌivo
   preko RPC funkcija iz supabase/share_trip.sql.
========================================================== */
function buildShareUrl(token){
  const base = location.href.replace(/[^/]*$/, ''); // sve posle poslednjeg "/" (fajl + query) odseca
  return base + 'zajedno.html?t=' + token;
}

async function shareTrip(id){
  const trip = (_lastSavedTripsCache || []).find(t => t.id === id);
  if (!trip){ showToast('AranЕѕman viЕЎe nije dostupan вЂ” osveЕѕi listu.'); return; }

  let token = trip.shareToken;
  if (!token){
    token = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
    const { error } = await sb.from('trips').update({share_token: token}).eq('id', id);
    if (error){ showToast('GreЕЎka pri pravljenju linka: ' + error.message); return; }
    trip.shareToken = token; // aЕѕuriraj keЕЎ da ne pravi novi token pri sledeД‡em kliku
  }

  const url = buildShareUrl(token);
  document.getElementById('shareModalLink').value = url;
  document.getElementById('shareModalSub').textContent =
    'PoЕЎalji ovaj link prijateljima za ' + trip.dest + ' вЂ” mogu da vide predlog i jave se (Idem/MoЕѕda/Ne mogu) bez pravljenja naloga.';
  document.getElementById('shareModalBackdrop').classList.add('open');
  document.getElementById('shareModal').classList.add('open');
}

function closeShareModal(){
  document.getElementById('shareModalBackdrop').classList.remove('open');
  document.getElementById('shareModal').classList.remove('open');
}

async function copyShareLink(){
  const input = document.getElementById('shareModalLink');
  input.select();
  input.setSelectionRange(0, 99999);
  try {
    await navigator.clipboard.writeText(input.value);
    showToast('Link kopiran u clipboard.');
  } catch(err){
    showToast('Nije uspelo automatsko kopiranje вЂ” kopiraj ruДЌno iz polja.');
  }
}

document.getElementById('shareModalBackdrop').addEventListener('click', closeShareModal);
document.getElementById('shareModalClose').addEventListener('click', closeShareModal);
document.getElementById('shareModalCopy').addEventListener('click', copyShareLink);
document.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape' && document.getElementById('shareModal').classList.contains('open')) closeShareModal();
});
// Web Share API вЂ” na mobilnom otvara sistemski meni za deljenje (WhatsApp,
// Viber, SMS...) umesto samo kopiranja linka. Dugme se prikazuje samo ako
// pregledaДЌ to podrЕѕava (uglavnom mobilni).
if (navigator.share){
  document.getElementById('shareModalNative').style.display = '';
  document.getElementById('shareModalNative').addEventListener('click', async ()=>{
    try {
      await navigator.share({title:'Predlog putovanja вЂ” Skoknica', url: document.getElementById('shareModalLink').value});
    } catch(err){ /* korisnik otkazao deljenje вЂ” nema potrebe za toast-om */ }
  });
}

/* ---- Jezik: primeni sacuvani izbor pri ucitavanju i kaci toggle dugme ---- */
applyStaticI18n();
document.getElementById('langSwitchBtn').addEventListener('click', ()=>{
  setLang(getLang() === 'sr' ? 'en' : 'sr');
});
// Ponovo iscrtaj vec prikazane dinamicke delove (builder / sacuvani aranzmani /
// auth panel) u novom jeziku. Rezultati pretrage (#resultsBody) namerno NISU
// ovde вЂ” retroaktivni re-render bez ponovnog pretrazivanja bio bi rizican za
// odrzavanje; nova pretraga ce vec biti na izabranom jeziku.
window.onLangChange = async function(){
  if (document.getElementById('builderSummary').style.display !== 'none'){
    renderBuilder();
  }
  if (document.getElementById('savedTripsList').innerHTML.trim() !== ''){
    renderSavedTrips();
  }
  const user = await getCurrentUser();
  renderAuthPanel('authBar', user);
  if (document.getElementById('authDropdown').innerHTML.trim() !== ''){
    renderAuthPanel('authDropdown', user);
  }
};

 