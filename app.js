window.addEventListener('error', function(e){ document.title = 'GRESKA: ' + e.message + ' (linija ' + e.lineno + ')'; }, {once:true});
(function(){
  const topbarWrap = document.querySelector('.topbar-wrap');
  if (!topbarWrap) return;
  function syncTopbarHeight(){
    document.documentElement.style.setProperty('--topbar-h', topbarWrap.offsetHeight + 'px');
  }
  syncTopbarHeight();
  window.addEventListener('resize', syncTopbarHeight);
  window.addEventListener('orientationchange', syncTopbarHeight);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncTopbarHeight);
})();
/* ==========================================================
   I18N — srpski (podrazumevano) i engleski
   ==========================================================
   Princip: statički tekst u HTML-u se prevodi preko data-i18n /
   data-i18n-html / data-i18n-placeholder / data-i18n-aria-label
   atributa i primenjuje se applyStaticI18n() funkcijom ispod.
   Za tekst koji JS generiše (rezultati, builder, poruke), koristi
   se t('kljuc') helper.
   NAPOMENA (obim ovog prolaza): pravne stranice (privatnost/uslovi/
   kolačići) i stranica za deljenje (zajedno.html) NISU prevedene —
   ostaju na srpskom dok se ne uradi poseban prolaz za njih.
========================================================== */
const I18N = {
  sr: {
    nav_how:'Kako radi', nav_dest:'Destinacije', nav_about:'O nama',
    aria_account:'Nalog', aria_menu:'Meni',
    hero_title:'Pronađi svoj <span class="accent">IZLET</span>.',
    hero_lede:'Let, smeštaj, prevoz i aktivnosti spojeni u jedan plan i jednu ukupnu cenu.',
    label_origin:'Polazak', placeholder_origin:'npr. Beograd, Niš, Podgorica',
    label_dest:'Destinacija', placeholder_dest:'npr. Atina, Rim, Barselona',
    label_dates:'Od — Do',
    aria_prev_month:'Prethodni mesec', aria_next_month:'Sledeći mesec',
    chip_weekend:'Vikend', chip_week:'Nedelja dana', chip_twoweeks:'Dve nedelje',
    cal_wx_legend:'<span class="lg-exact">☀️</span>prognoza (do 16 dana unapred) &nbsp;·&nbsp; <span class="lg-est">☀️</span>procena za dalje datume, po podacima za isti period prošle godine &nbsp;·&nbsp; <span style="opacity:0.35">build wx-5</span>',
    btn_done:'Gotovo',
    label_passengers:'Putnika',
    opt_1adult:'1 odrasla osoba', opt_2adults:'2 odrasla', opt_3adults:'3 odrasla', opt_4adults:'4 odrasla',
    btn_search:'Pronađi najbolje putovanje',
    toggle_flight:'Letovi', toggle_hotel:'Smeštaj', toggle_car:'Rent a car', toggle_activity:'Aktivnost',
    eyebrow_no_idea:'Nemaš plan', h2_no_idea:'Ne znaš gde bi išao?', sub_no_idea:'Reci nam koliko želiš da potrošiš, a mi ćemo pronaći destinacije koje se uklapaju.',
    btn_no_idea_cta:'🎲 Iznenadi me',
    eyebrow_more_control:'Više kontrole', h2_build_own:'Želiš više kontrole?',
    sub_build_own:'Biraš let, smeštaj, auto i aktivnosti — mi računamo koliko sve zajedno košta.',
    eyebrow_content_control:'Kontrola sadržaja', h2_content_control:'Sam odredi šta ti odgovara',
    control_teaser_sub:'Sam biraš let, hotel, prevoz, aktivnosti, osiguranje i eSIM — cena se sabira uživo.',
    ct_cta:'Otvori builder',
    btn_choose:'Odaberi',
    builder_addons_label:'Dodaci',
    eyebrow_features:'Sve uključeno',
    builder_flight_label:'Let', chip_direct:'Direktan', chip_cheapest:'Najjeftiniji', chip_airline:'Određena kompanija',
    placeholder_airline:'npr. Lufthansa',
    chip_priority_rating:'Prioritet: ocena', chip_priority_location:'Prioritet: lokacija',
    builder_transport_label:'Prevoz', chip_no_car:'Bez auta', chip_small_car:'Mali auto', chip_suv:'SUV',
    builder_activities_label:'Aktivnosti',
    aria_fewer_activities:'Manje aktivnosti', aria_more_activities:'Više aktivnosti',
    builder_budget_label_html:'Budžet <span style="font-weight:400;font-size:12px;color:var(--ink-soft);">(opciono)</span>',
    placeholder_budget:'npr. 700',
    btn_make_arrangement:'Napravi izlet',
    builder_summary_head:'Tvoj izlet', builder_total_sub:'ukupno',
    builder_total_hint:'Zbir procena za let, hotel, auto i aktivnosti — svaka stavka se plaća zasebno kod partnera, ne u jednom plaćanju.',
    disclaimer_illustrative:'⚠️ Ilustrativna procena, ne stvarna ponuda — sajt je u razvoju.',
    btn_optimize:'Optimizuj moj izlet', btn_save_trip:'Sačuvaj izlet', btn_price_alert:'Javi mi kad padne cena',
    builder_placeholder_text:'Ovde ćeš videti procenjenu cenu čim počneš da biraš — promeni bilo koju opciju levo.',
    eyebrow_for_later:'Za kasnije', h2_saved_trips:'Vrati se kad budeš spreman',
    sub_saved_trips:'Sačuvaj opcije koje ti se dopadaju i nastavi kasnije.',
    h2_features:'Sve što ti treba za put', sub_features:'Od leta i smeštaja do auta, aktivnosti, osiguranja i interneta.',
    f_flight_sub:'Direktni i sa presedanjem', f_hotel_sub:'Hoteli, apartmani, hosteli',
    f_car_name:'Auto', f_car_sub:'Preuzimanje na aerodromu',
    f_tolls_name:'Putarine', f_tolls_sub:'Procena po ruti i državi',
    f_activity_name:'Aktivnosti', f_activity_sub:'Karte i ture unapred',
    f_insurance_name:'Osiguranje', f_insurance_sub:'Zdravstveno i za otkazivanje',
    f_esim_sub:'Internet od sletanja',
    postcard_caption:'Uvek postoji sledeći izlet.',
    eyebrow_ideas:'Ideje za sledeći izlet', h2_popular_dest:'Gde bi sledeće?',
    sub_popular_dest:'Pogledaj destinacije koje putnici iz Srbije i regiona najčešće biraju.',
    pd_athens_name:'Atina, Grčka', pd_athens_desc:'Antika, ostrvski trajekti i vrhunska kuhinja — popularna letnja destinacija sa čestim direktnim letovima.',
    pd_rome_name:'Rim, Italija', pd_rome_desc:'Koloseum, Vatikan i ulična kuhinja — grad koji se obilazi peške, uz kratak let iz Beograda.',
    pd_barcelona_name:'Barselona, Španija', pd_barcelona_desc:'Gaudijeva arhitektura, plaža i tapas bary — omiljena kombinacija grada i mora.',
    pd_budva_name:'Budva, Crna Gora', pd_budva_desc:'Najbliže more autom ili autobusom iz Srbije — stara varoš i duge plaže.',
    pd_istanbul_name:'Istanbul, Turska', pd_istanbul_desc:'Spoj Evrope i Azije, bazari i Bosfor — pristupačan izlet van sezone.',
    pd_vienna_name:'Beč, Austrija', pd_vienna_desc:'Muzeji, kafei i božićne pijace zimi — praktičan gradski izlet za vikend.',
    cta_right:'Ceo izlet.<br>Jedna cena.',
    eyebrow_faq:'Pitanja', h2_faq:'Pre nego što rezervišeš',
    sub_faq:'Odgovori na najčešća pitanja o cenama, rezervaciji i promenama.',
    faq_q1:'Da li su prikazane cene stvarne?',
    faq_a1:'Skoknica je trenutno u razvoju. Cene koje vidiš u pretrazi i builderu su ilustrativna procena, generisana radi demonstracije, ne dolaze uživo sa sajtova partnera. Pre rezervacije uvek proveri tačnu cenu i dostupnost direktno kod partnera (KAYAK, Booking.com, Viator).',
    faq_q2:'Kako radi builder izleta?',
    faq_a2:'Sam biraš tip leta, kategoriju hotela, auto i broj aktivnosti, a Skoknica sabira procenjenu cenu za ceo paket. Dugme „Optimizuj moj izlet" predlaže izmenu koja može da smanji cenu uz sličan kvalitet.',
    faq_q3:'Kako se čuvaju moji sačuvani izleti?',
    faq_a3:'Napraviš nalog emailom i lozinkom u sekciji sačuvanih izleta. Tvoji podaci se čuvaju vezano za tvoj nalog, ne za ovaj uređaj, tako da im možeš pristupiti i sa drugog telefona ili računara — samo se prijavi istim emailom i lozinkom.',
    faq_q4:'Da li Skoknica naplaćuje rezervaciju?',
    faq_a4:'Ne. Skoknica ne naplaćuje ništa direktno — klikom na „Rezerviši" ili „Pretraži" odlaziš na sajt partnera (KAYAK, Booking.com ili Viator) gde se rezervacija i plaćanje obavljaju.',
    faq_q5:'Imaš pitanje koje nije ovde?',
    faq_a5:'Piši na <a href="mailto:panpetar405@gmail.com">panpetar405@gmail.com</a> — rado odgovaramo.',
    stat_searches:'pretraga', stat_clicks:'klikova na ponude', stat_last:'poslednja destinacija',
    footer_contact:'Kontakt', footer_privacy:'Privatnost', footer_terms:'Uslovi', footer_cookies:'Kolačići',
    foot_note:'Skoknica — prototip proizvoda u razvoju. Prikazane cene su ilustrativne (simulirane radi demonstracije), ne dolaze uživo od partnera i ne predstavljaju stvarnu ponudu ni obavezu na cenu. · <a href="#" id="cookieSettingsLink">Podešavanja kolačića</a>',
    cookie_text:'<b>Koristimo kolačiće za analitiku</b> (Google Analytics) da bismo razumeli kako se sajt koristi i unapredili ga. Ne koristimo ih za marketing niti ih delimo van Google-a. Detalji u <a href="kolacici.html">Politici kolačića</a>.',
    cookie_decline:'Odbijam', cookie_accept:'Prihvatam',
    aria_close:'Zatvori', label_email:'Email',
    label_alert_threshold:'Javi mi kad ukupna procenjena cena padne ispod', btn_set_alert:'Postavi alert',
    alert_modal_disclaimer:'⚠️ I dalje ilustrativna procena, ne stvarna ponuda partnera. Odjava je moguća bilo kad preko linka u mejlu koji dobiješ.',
    surprise_trigger:'<svg class="dice-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="8.3" cy="8.3" r="1.05" fill="currentColor" stroke="none"/><circle cx="15.7" cy="8.3" r="1.05" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.05" fill="currentColor" stroke="none"/><circle cx="8.3" cy="15.7" r="1.05" fill="currentColor" stroke="none"/><circle cx="15.7" cy="15.7" r="1.05" fill="currentColor" stroke="none"/></svg><span class="st-q">Nemaš ideju kuda?</span><span class="st-cta">Iznenadi me za dati budžet<i class="st-arrow">→</i></span>',
    surprise_modal_title:'Iznenadi me',
    surprise_modal_sub:'Nemaš konkretnu destinaciju na umu? Reci nam samo budžet — probaćemo preko 100 gradova i predložićemo 3 koja se uklapaju. Datumi i broj putnika ostaju kao u formi iznad.',
    surprise_modal_label_budget:'Ukupan budžet (za sve putnike)', placeholder_surprise_budget:'npr. 400',
    surprise_modal_btn:'🎲 Predloži 3 destinacije',
    surprise_modal_disclaimer:'⚠️ Ilustrativna procena cene po gradu, ne stvarna ponuda partnera.',
    share_modal_title:'Podeli sa prijateljima', share_modal_label_link:'Link za deljenje',
    share_modal_copy:'📋 Kopiraj link', share_modal_native:'📤 Podeli preko aplikacija',
    share_modal_disclaimer:'Svako ko otvori link vidi predlog i može da ostavi odgovor (Idem/Možda/Ne mogu) — bez pravljenja naloga.',
    passport_check_link:'🛂 Proveri da li ti pasoš važi za ovaj put',
    passport_modal_sub:'Mnoge zemlje traže da pasoš važi još neko vreme nakon povratka — u suprotnom te mogu vratiti sa granice ili na čekiranju, iako sam datum putovanja nije problem.',
    passport_modal_title:'Da li ti pasoš važi za ovaj put?',
    passport_modal_label_expiry:'Do kog datuma važi tvoj pasoš?',
    passport_modal_btn:'Proveri',
    passport_modal_disclaimer:'⚠️ Opšta pravila po zemlji, radi orijentacije — pred put uvek dodatno proveri na sajtu ambasade/konzulata ili sa aviokompanijom.',
    // ---- dinamički stringovi (koristi ih JS preko t()) ----
    ac_searching:'Tražim…', ac_no_results:'Nema predloga za taj naziv.',
    night:'noć', nights:'noći', passenger:'putnik', passengers:'putnika',
    fuel_estimate:'Gorivo (procena)', tolls_estimate:'Putarine (procena)', insurance:'Osiguranje', esim_internet:'eSIM / internet',
    btn_search_kayak:'Pretraži na KAYAK-u', btn_book_booking:'Rezerviši na Booking.com',
    base_package_note:'Cena osnovnog paketa — dodaj osiguranje ili eSIM po želji.',
    fits_budget:'Uklapa se u tvoj budžet od ', over_budget:'Malo iznad budžeta, ali najbliža opcija koju imamo.',
  },
  en: {
    nav_how:'How it works', nav_dest:'Destinations', nav_about:'About',
    aria_account:'Account', aria_menu:'Menu',
    hero_title:'Enter a place.<br>Get a <span class="accent">whole trip</span>.',
    hero_lede:'Flight, stay, transport and activities combined into one plan and one total price.',
    label_origin:'From', placeholder_origin:'e.g. Belgrade, Niš, Podgorica',
    label_dest:'Destination', placeholder_dest:'e.g. Athens, Rome, Barcelona',
    label_dates:'From — To',
    aria_prev_month:'Previous month', aria_next_month:'Next month',
    chip_weekend:'Weekend', chip_week:'One week', chip_twoweeks:'Two weeks',
    cal_wx_legend:'<span class="lg-exact">☀️</span>forecast (up to 16 days ahead) &nbsp;·&nbsp; <span class="lg-est">☀️</span>estimate for later dates, based on the same period last year &nbsp;·&nbsp; <span style="opacity:0.35">build wx-5</span>',
    btn_done:'Done',
    label_passengers:'Travelers',
    opt_1adult:'1 adult', opt_2adults:'2 adults', opt_3adults:'3 adults', opt_4adults:'4 adults',
    btn_search:'Find the best trip',
    toggle_flight:'Flights', toggle_hotel:'Stay', toggle_car:'Rent a car', toggle_activity:'Activity',
    eyebrow_no_idea:'No plan yet', h2_no_idea:'Not sure where to go?', sub_no_idea:'Tell us how much you want to spend, and we’ll find destinations that fit.',
    btn_no_idea_cta:'🎲 Surprise me',
    eyebrow_more_control:'More control', h2_build_own:'Want more control?',
    eyebrow_content_control:'Content control', h2_content_control:'Decide what works for you',
    control_teaser_sub:'Choose the flight, hotel, transport, activities, insurance and eSIM — the price adds up live.',
    ct_cta:'Open builder',
    btn_choose:'Choose',
    builder_addons_label:'Add-ons',
    eyebrow_features:'All included',
    sub_build_own:'You choose the flight, stay, car and activities — we add up how much it all costs together.',
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
    builder_total_hint:'Sum of estimates for flight, hotel, car and activities — each item is paid separately at the partner, not in one payment.',
    disclaimer_illustrative:'⚠️ Illustrative estimate, not a real offer — the site is in development.',
    btn_optimize:'Optimize my trip', btn_save_trip:'Save trip', btn_price_alert:'Notify me when the price drops',
    builder_placeholder_text:'You’ll see an estimated price here as soon as you start choosing — change any option on the left.',
    eyebrow_for_later:'For later', h2_saved_trips:'Come back when you’re ready',
    sub_saved_trips:'Save the options you like and pick up later.',
    h2_features:'Everything you need for the trip', sub_features:'From flights and stays to cars, activities, insurance and internet.',
    f_flight_sub:'Direct and with stopovers', f_hotel_sub:'Hotels, apartments, hostels',
    f_car_name:'Car', f_car_sub:'Airport pickup',
    f_tolls_name:'Tolls', f_tolls_sub:'Estimated by route and country',
    f_activity_name:'Activities', f_activity_sub:'Tickets and tours in advance',
    f_insurance_name:'Insurance', f_insurance_sub:'Medical and cancellation cover',
    f_esim_sub:'Internet from landing',
    postcard_caption:'There’s always a next trip.',
    eyebrow_ideas:'Ideas for your next trip', h2_popular_dest:'Where to next?',
    sub_popular_dest:'Take a look at the destinations travelers from Serbia and the region pick most often.',
    pd_athens_name:'Athens, Greece', pd_athens_desc:'Antiquity, island ferries and top-notch food — a popular summer destination with frequent direct flights.',
    pd_rome_name:'Rome, Italy', pd_rome_desc:'The Colosseum, the Vatican and street food — a walkable city, a short flight from Belgrade.',
    pd_barcelona_name:'Barcelona, Spain', pd_barcelona_desc:'Gaudí’s architecture, the beach and tapas bars — a favorite city-and-sea combination.',
    pd_budva_name:'Budva, Montenegro', pd_budva_desc:'The closest sea by car or bus from Serbia — an old town and long beaches.',
    pd_istanbul_name:'Istanbul, Turkey', pd_istanbul_desc:'Where Europe meets Asia, bazaars and the Bosphorus — an affordable off-season trip.',
    pd_vienna_name:'Vienna, Austria', pd_vienna_desc:'Museums, cafés and Christmas markets in winter — a practical city break.',
    cta_right:'One trip.<br>One price.',
    eyebrow_faq:'Questions', h2_faq:'Before you book',
    sub_faq:'Answers to the most common questions about prices, booking and changes.',
    faq_q1:'Are the prices shown real?',
    faq_a1:'Skoknica is currently in development. Prices you see in search and the builder are an illustrative estimate, generated for demonstration, and don’t come live from partner sites. Always check the exact price and availability directly with the partner (KAYAK, Booking.com, Viator) before booking.',
    faq_q2:'How does the trip builder work?',
    faq_a2:'You choose the flight type, hotel category, car and number of activities yourself, and Skoknica adds up an estimated price for the whole package. The “Optimize my trip” button suggests a change that can lower the price with similar quality.',
    faq_q3:'How are my saved trips stored?',
    faq_a3:'You create an account with an email and password in the “Saved trips” section. Your data is tied to your account, not this device, so you can access it from another phone or computer too — just log in with the same email and password.',
    faq_q4:'Does Skoknica charge for booking?',
    faq_a4:'No. Skoknica doesn’t charge anything directly — clicking “Book” or “Search” takes you to the partner’s site (KAYAK, Booking.com or Viator) where the booking and payment happen.',
    faq_q5:'Have a question that’s not here?',
    faq_a5:'Write to <a href="mailto:panpetar405@gmail.com">panpetar405@gmail.com</a> — we’re happy to help.',
    stat_searches:'searches', stat_clicks:'clicks on offers', stat_last:'last destination',
    footer_contact:'Contact', footer_privacy:'Privacy', footer_terms:'Terms', footer_cookies:'Cookies',
    foot_note:'Skoknica — a product prototype in development. Prices shown are illustrative (simulated for demonstration), don’t come live from partners, and don’t represent a real offer or price commitment. · <a href="#" id="cookieSettingsLink">Cookie settings</a>',
    cookie_text:'<b>We use cookies for analytics</b> (Google Analytics) to understand how the site is used and improve it. We don’t use them for marketing or share them beyond Google. Details in the <a href="kolacici.html">Cookie Policy</a>.',
    cookie_decline:'Decline', cookie_accept:'Accept',
    aria_close:'Close', label_email:'Email',
    label_alert_threshold:'Notify me when the total estimated price drops below', btn_set_alert:'Set alert',
    alert_modal_disclaimer:'⚠️ Still an illustrative estimate, not a real partner offer. You can unsubscribe anytime via the link in the email you receive.',
    surprise_trigger:'<svg class="dice-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="8.3" cy="8.3" r="1.05" fill="currentColor" stroke="none"/><circle cx="15.7" cy="8.3" r="1.05" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.05" fill="currentColor" stroke="none"/><circle cx="8.3" cy="15.7" r="1.05" fill="currentColor" stroke="none"/><circle cx="15.7" cy="15.7" r="1.05" fill="currentColor" stroke="none"/></svg><span class="st-q">No idea where to go?</span><span class="st-cta">Surprise me for a given budget<i class="st-arrow">→</i></span>',
    surprise_modal_title:'Surprise me',
    surprise_modal_sub:'No specific destination in mind? Just tell us your budget — we’ll try over 100 cities and suggest 3 that fit. Dates and traveler count stay as set in the form above.',
    surprise_modal_label_budget:'Total budget (for all travelers)', placeholder_surprise_budget:'e.g. 400',
    surprise_modal_btn:'🎲 Suggest 3 destinations',
    surprise_modal_disclaimer:'⚠️ Illustrative price estimate per city, not a real partner offer.',
    share_modal_title:'Share with friends', share_modal_label_link:'Share link',
    share_modal_copy:'📋 Copy link', share_modal_native:'📤 Share via apps',
    share_modal_disclaimer:'Anyone who opens the link can see the plan and RSVP (Going/Maybe/Can’t make it) — no account needed.',
    passport_check_link:'🛂 Check if your passport is valid for this trip',
    passport_modal_sub:'Many countries require your passport to stay valid for a while after your return — otherwise you can be turned away at the border or check-in, even if your travel dates themselves are fine.',
    passport_modal_title:'Is your passport valid for this trip?',
    passport_modal_label_expiry:'When does your passport expire?',
    passport_modal_btn:'Check',
    passport_modal_disclaimer:'⚠️ General rules per country, for guidance only — always double-check with the embassy/consulate or your airline before you travel.',
    ac_searching:'Searching…', ac_no_results:'No suggestions for that name.',
    night:'night', nights:'nights', passenger:'traveler', passengers:'travelers',
    fuel_estimate:'Fuel (estimate)', tolls_estimate:'Tolls (estimate)', insurance:'Insurance', esim_internet:'eSIM / internet',
    btn_search_kayak:'Search on KAYAK', btn_book_booking:'Book on Booking.com',
    base_package_note:'Base package price — add insurance or eSIM if you like.',
    fits_budget:'Fits your budget of ', over_budget:'Slightly over budget, but the closest option we have.',
  }
};
function getLang(){ return 'sr'; } // Engleski privremeno isključen — sajt je sada samo na srpskom
function t(key){ const lang = getLang(); return (I18N[lang] && I18N[lang][key]) ?? (I18N.sr[key] ?? key); }
function applyStaticI18n(){
  const lang = getLang();
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label'))); });
  const btn = document.getElementById('langSwitchBtn');
  if (btn) btn.style.display = 'none'; // Engleski isključen — dugme za promenu jezika je sklonjeno
  const titleEl = document.querySelector('title');
  if (titleEl) titleEl.textContent = lang === 'sr' ? 'Skoknica — ceo izlet, jedna cena' : 'Skoknica — one whole trip, one price';
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', lang === 'sr'
    ? 'Skoknica pronalazi let, hotel, auto i aktivnosti za tvoj sledeći izlet i sabira ih u jednu cenu. Napravi sopstveni izlet ili poređaj gotove pakete po budžetu.'
    : 'Skoknica finds flights, hotels, cars and activities for your next trip and adds them into one price. Build your own trip or browse ready packages by budget.');
}
function setLang(lang){
  localStorage.setItem('skoknica_lang', lang === 'en' ? 'en' : 'sr');
  applyStaticI18n();
  // Ponovo iscrtaj dinamički generisan sadržaj (rezultati/builder/auth/saved)
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
/* ==========================================================
   DNEVNA FLUKTUACIJA CENE ("tržišni faktor")
   Ranije je ilustrativna cena bila FIKSNA funkcija (grad+noći+putnici) —
   nikad se nije menjala tokom vremena, pa "Javi mi kad padne cena" nije
   fizički mogao nikad da se ispuni. Ovaj faktor dodaje determinističku
   ali dnevno promenljivu varijaciju (±12%), istu za sve koji tog dana
   gledaju isti grad, nezavisnu od glavnog rng niza (ne pomera redosled
   ostalih random poziva). Isti algoritam se koristi i na serveru
   (Supabase Edge Function) da bi se alert mogao stvarno proveravati.
========================================================== */
function marketFactor(dest, dateStr){
  const f = seededRandom(hashSeed('mkt|' + dest.toLowerCase() + '|' + dateStr));
  return 0.88 + f() * 0.24;
}
function todayStr(){
  return new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
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

/* ---- Kalendar za izbor datuma u "ticket" pretrazi (stub "Od — Do") ---- */
// Open-Meteo geokodiranje ne sortira rezultate po značaju grada, pa "Milano"
// ume da vrati malo selo u Peruu pre Milana u Italiji. Ovde biramo najbolje
// poklapanje: prvo tačan naziv (case-insensitive), pa najveći broj stanovnika,
// pa gradove/prestonice (feature_code) pre manjih naselja.
// (globalna funkcija — koriste je i vremenska prognoza (wx.geocode) i predlozi
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
    return b.pop - a.pop; // veći grad prvo
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
  const calBackdrop = document.getElementById('calBackdrop');
  const calMonths = document.getElementById('calMonths');
  const calGrids = document.getElementById('calGrids');
  const calRangeLabel = document.getElementById('calRangeLabel');
  const prevBtn = document.getElementById('calPrev');
  const nextBtn = document.getElementById('calNext');
  const applyBtn = document.getElementById('calApply');
  if (!displayBtn || !calCard) return;

  const DAY_NAMES = ['Pon','Uto','Sre','Čet','Pet','Sub','Ned'];
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

  /* ---- Vremenska prognoza po danima (Open-Meteo — javno dostupan, besplatan API) ----
     Prava prognoza postoji samo za ~16 dana unapred. Za datume dalje u budućnosti
     ne postoji "tačna" prognoza kod nikog — zato se za njih prikazuje PROCENA na
     osnovu istog perioda prošle godine (arhivski podaci), vizuelno zamućena ikonica,
     da se ne stvori lažan utisak preciznosti. */
  const WMO_ICON = {
    0:'☀️',1:'🌤️',2:'⛅',3:'☁️',
    45:'🌫️',48:'🌫️',
    51:'🌦️',53:'🌦️',55:'🌦️',
    56:'🌧️',57:'🌧️',
    61:'🌧️',63:'🌧️',65:'🌧️',
    66:'🌧️',67:'🌧️',
    71:'🌨️',73:'🌨️',75:'❄️',77:'❄️',
    80:'🌦️',81:'🌧️',82:'⛈️',
    85:'🌨️',86:'🌨️',
    95:'⛈️',96:'⛈️',99:'⛈️'
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
          console.warn('[skoknica] geokodiranje odredišta nije uspelo:', err.message);
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
      // ista opsega dana, samo godinu unazad — kao osnova za procenu
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
    // odmah skini stare ikonice (mogu biti od prethodne destinacije) da ne ostane pogrešan utisak
    cells.forEach(cell => cell.querySelectorAll('.cal-wx').forEach(n => n.remove()));
    setStatus((getLang()==='en' ? 'Looking up weather for “' + city + '”…' : 'Tražim vreme za „' + city + '“…'));

    const {geo, networkError: geoErr} = await wx.geocode(city);
    if (mySeq !== wxRequestSeq) return; // korisnik je u međuvremenu promenio destinaciju — ovaj odgovor je zastareo
    if (!geo){
      setStatus(geoErr
        ? 'Prognoza trenutno nije dostupna — zahtev ka mreži nije uspeo (provera internet konekcije ili pristupa mreži u ovom pregledaču).'
        : 'Nije pronađena lokacija za „' + city + '” — provera pravopisa naziva mesta.');
      return;
    }

    const isoList = cells.map(c => c.dataset.date).sort();
    const minISO = isoList[0], maxISO = isoList[isoList.length - 1];

    const [fRes, cRes] = await Promise.all([
      wx.getForecast(geo),
      wx.getClimateRange(geo, minISO, maxISO)
    ]);
    if (mySeq !== wxRequestSeq) return; // isto — zastareo odgovor, ne crtati preko novijeg stanja
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
      span.title = (exact ? 'Prognoza za ' : 'Procena za ') + iso + ': ' + rec.tmax + '°/' + rec.tmin + '°C' + (exact ? '' : ' (na osnovu iste nedelje prošle godine)');
      cell.appendChild(span);
      painted++;
    });

    if (!painted){
      setStatus((fRes.networkError || cRes.networkError)
        ? 'Prognoza trenutno nije dostupna — zahtev ka mreži nije uspeo (provera internet konekcije ili pristupa mreži u ovom pregledaču).'
        : 'Nema podataka o vremenu za ove datume.');
    } else {
      setStatus('');
    }
  }

  function updateDisplay(){
    const n = nightsCount(selStart, selEnd);
    rangeText.textContent = fmtShort(selStart) + ' – ' + fmtShort(selEnd);
    nightsText.textContent = n + ' ' + nightsWord(n);
    calRangeLabel.innerHTML = fmtShort(selStart) + ' – ' + fmtShort(selEnd) + ' <b>· ' + n + ' ' + nightsWord(n) + '</b>';
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

  const isMobileCal = () => window.matchMedia('(max-width:760px)').matches;
  let calScrollY = 0;
  function lockPageScroll(){
    calScrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + calScrollY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }
  function unlockPageScroll(){
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, calScrollY);
  }

  function openCal(){
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    render();
    calCard.classList.add('open');
    if (calBackdrop) calBackdrop.classList.add('open');
    displayBtn.setAttribute('aria-expanded', 'true');
    if (isMobileCal()) lockPageScroll();
  }
  function closeCal(shouldCommit){
    calCard.classList.remove('open');
    if (calBackdrop) calBackdrop.classList.remove('open');
    displayBtn.setAttribute('aria-expanded', 'false');
    if (document.body.style.position === 'fixed') unlockPageScroll();
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

// Small heuristic list — no geo API here, just enough to stop the CTA
// from promising a beach in landlocked cities like Beograd or Beč.
const COASTAL_DESTINATIONS = [
  'atina','solun','krf','santorini','mikonos','rodos','krit',
  'dubrovnik','split','zadar','budva','kotor','herceg novi',
  'barselona','nica','malaga','valensija','ibica','napulj','venecija',
  'lisabon','porto','tel aviv','antalija','bodrum'
];
function ctaCopy(dest){
  const isCoastal = COASTAL_DESTINATIONS.includes(dest.trim().toLowerCase());
  return isCoastal
    ? 'Istorija, dobra hrana, more i nezaboravni doživljaji — a sad je lakše nego ikad da sve to isplaniraš.'
    : 'Istorija, dobra hrana i nezaboravni doživljaji — a sad je lakše nego ikad da sve to isplaniraš.';
}

const PARTNERS = {
  flight:    {provider:'kayak',      name:'KAYAK'},
  hotel:     {provider:'booking',    name:'Booking.com'},
  car:       {provider:'booking',    name:'Booking.com'},
  activity:  {provider:'viator',     name:'Viator'},
  esim:      {provider:'airalo',     name:'Airalo'},
  insurance: {provider:'worldnomads',name:'World Nomads'}
};

/* ---- Airalo prodaje eSIM po DRŽAVI, ne po gradu (npr. airalo.com/greece-esim),
   dok Skoknica destinaciju vodi kao grad ("Atina"). Mapiramo preko iste liste
   POPULAR_DESTINATIONS koja se već koristi za predloge gradova — svaki unos
   tamo ima "extra" polje sa nazivom države na srpskom, koje ovde prevodimo
   u Airalo-ov URL slug (engleski naziv države, malim slovima, sa crticama).
   NAPOMENA: slug format je potvrđen za par država (italy-esim, greece-esim),
   ostatak je najbolja moguća pretpostavka po istoj šemi — pre pravog
   affiliate ugovora vredi proveriti da li svaka od ovih stranica zaista
   postoji na Airalo sajtu. ---- */
const COUNTRY_SLUG_SR = {
  'Srbija':'serbia', 'Crna Gora':'montenegro', 'Bosna i Hercegovina':'bosnia-and-herzegovina',
  'Hrvatska':'croatia', 'Severna Makedonija':'north-macedonia', 'Kosovo':'kosovo',
  'Slovenija':'slovenia', 'Albanija':'albania', 'Rumunija':'romania', 'Bugarska':'bulgaria',
  'Grčka':'greece', 'Italija':'italy', 'Španija':'spain', 'Portugalija':'portugal',
  'Francuska':'france', 'Velika Britanija':'united-kingdom', 'Holandija':'netherlands',
  'Nemačka':'germany', 'Austrija':'austria', 'Češka':'czech-republic', 'Mađarska':'hungary',
  'Slovačka':'slovakia', 'Poljska':'poland', 'Švedska':'sweden', 'Norveška':'norway',
  'Danska':'denmark', 'Finska':'finland', 'Irska':'ireland', 'Belgija':'belgium',
  'Švajcarska':'switzerland', 'Turska':'turkey', 'Izrael':'israel', 'UAE':'united-arab-emirates',
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
   client-side — replace AFF_ID placeholders with real affiliate IDs
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
      // Ako ne prepoznamo državu iz grada, vodimo na opštu prodavnicu
      // (bolje nego pogrešan/nepostojeći URL za državu).
      return slug
        ? `https://www.airalo.com/${slug}-esim?ref=${AFF_ID}`
        : `https://www.airalo.com/esim?ref=${AFF_ID}`;
    }
    case 'insurance':
      // Za razliku od ostalih partnera, World Nomads nema potvrđen javni
      // URL šablon za deep-link sa unapred popunjenom destinacijom/datumima
      // (proces dobijanja ponude ide kroz njihov sopstveni wizard, ne kroz
      // query parametre na ovoj stranici) — zato vodi na opštu stranicu za
      // ponudu, ne na nešto specifično za ${ctx.dest}. Kad se prijava na
      // affiliate program (preko CJ mreže) odobri, ovaj URL treba zameniti
      // pravim CJ tracking linkom (obično na drugom domenu, ne worldnomads.com).
      // TODO takođe: potvrditi da World Nomads uopšte prodaje rezidentima Srbije
      // pre nego što ovo ide u produkciju — nije potvrđeno u istraživanju.
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
    name: (tier==='comfort' ? carriers[carriers.length-1] : carriers[Math.floor(rng()*carriers.length)]) + ' → ' + dest,
    sub: (tier==='comfort' ? 'direktan let, prtljag uključen' : (tier==='budget' ? 'jedan presedanje' : 'direktan let'))
      + (adults > 1 ? ' · cena za svih ' + adults + ' putnika' : ''),
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
    sub: nights+' noć' + (nights===1?'':'i') + ' · ocena ' + (ratings[tier]+rng()*0.3).toFixed(1)
      + (rooms > 1 ? ' · cena za ' + rooms + ' sobe' : ''),
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
    sub: days+' dana · automatski/ručni menjač',
    price, currency:'EUR'
  };
}
function fetchActivity(rng, dest, tier){
  const price = {budget:18, best:41, comfort:79}[tier] + Math.floor(rng()*20);
  const p = PARTNERS.activity;
  const opts = {
    budget:['Obilazak starog grada peške'],
    best:['Poludnevna tura s vodičem','Ulaznica za glavne znamenitosti'],
    comfort:['Privatna tura s vodičem','Gastronomska tura uz degustaciju']
  };
  const arr = opts[tier];
  return {
    provider:p.provider, providerLabel:p.name, type:'activity',
    name: arr[Math.floor(rng()*arr.length)] + ' — ' + dest,
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
function buildPackage(rng, dest, nights, days, adults, tier, flags, factor){
  factor = factor || 1;
  const flight = flags.flight ? fetchFlights(rng, dest, adults, tier) : null;
  const hotel  = flags.hotel  ? fetchHotel(rng, dest, nights, adults, tier) : null;
  const car    = flags.car    ? fetchCar(rng, days, tier) : null;
  const activity = flags.activity ? fetchActivity(rng, dest, tier) : null;
  const extras = EXTRA_COSTS[tier];

  // Tržišni faktor menja samo cenu, ne i ime/opis stavke (ti se biraju
  // gore, iz rng niza, pre ove linije — pa ostaju stabilni iz dana u dan).
  if (flight) flight.price = Math.round(flight.price * factor);
  if (hotel) hotel.price = Math.round(hotel.price * factor);
  if (car) car.price = Math.round(car.price * factor);
  if (activity) activity.price = Math.round(activity.price * factor);

  const fuel = Math.round(((car && extras.fuel) ? extras.fuel : 0) * factor);
  const tolls = Math.round(((car && extras.tolls) ? extras.tolls : 0) * factor);
  // Osiguranje i eSIM više NISU deo osnovne cene — to su dodaci na već
  // kupljenu uslugu, ne "proizvod" koji se pretražuje. Cena im je uvek
  // dostupna (da bi se prikazala uz čekboks u rezultatima), ali se ne
  // sabira u `total` dok ih korisnik svesno ne uključi (vidi toggleAddon).
  const insuranceCost = extras.insurance;
  const esimCost = extras.esim;

  const total = (flight?flight.price:0) + (hotel?hotel.price:0) + (car?car.price:0)
              + (activity?activity.price:0) + fuel + tolls;

  // Quality is a fixed, structural property of each tier (hotel rating,
  // flight directness, car size) — it doesn't depend on this run's prices.
  const qualityScore = {best:84, budget:58, comfort:97}[tier];

  return {tier, flight, hotel, car, activity, fuel, tolls, insuranceCost, esimCost, total, qualityScore};
}

const TIER_META = {
  best:    {label:'Best Value', desc:'Najbolji odnos cene i kvaliteta'},
  comfort: {label:'Comfort', desc:'Bolji hotel, direktan let, prostraniji auto'},
  budget:  {label:'Budget', desc:'Najniža cena, bez iznajmljivanja auta'}
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
const state = { searches:0, clicks:0, lastDest:null };
const STATS_STORAGE_KEY = 'skoknica_stats_v1';
function loadStats(){
  try{
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.searches = saved.searches || 0;
    state.clicks = saved.clicks || 0;
    state.lastDest = saved.lastDest || null;
  }catch(e){ /* localStorage nedostupan (privatni mod i sl.) — nastavi sa 0 */ }
}
function saveStats(){
  try{
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify({searches:state.searches, clicks:state.clicks, lastDest:state.lastDest}));
  }catch(e){}
}
loadStats();

function fmtEUR(n){ return '€' + n.toLocaleString('de-DE'); }

function attachAffiliateLinks(pkg, dest, from, to, adults){
  const ctx = {dest, from, to, adults};
  if (pkg.flight)   pkg.flight.bookUrl   = buildAffiliateLink('flight', ctx);
  if (pkg.hotel)    pkg.hotel.bookUrl    = buildAffiliateLink('hotel', ctx);
  if (pkg.car)      pkg.car.bookUrl      = buildAffiliateLink('car', ctx);
  if (pkg.activity) pkg.activity.bookUrl = buildAffiliateLink('activity', ctx);
  // eSIM i osiguranje nisu "fetch-ovane" stavke kao let/hotel/auto/aktivnost
  // (nemaju svoju cenu sa partnerskog API-ja, cena im dolazi iz EXTRA_COSTS) —
  // ali dugme na svakom dodatku i dalje treba pravi link ka partneru.
  pkg.esimBookUrl = buildAffiliateLink('esim', ctx);
  pkg.insuranceBookUrl = buildAffiliateLink('insurance', ctx);
}

/* ==========================================================
   API FEED — poziv ka backendu (server/src/routes/search.js).
   Ako backend nije upaljen (nema hostinga jos, radi se lokalno bez
   servera, ili je pao), automatski se vraca na stari lokalni mock —
   sajt NIKAD ne sme da ostane bez rezultata korisniku.
========================================================== */
// Postavi ovo na URL svog backenda kad ga deploy-ujes, npr:
// window.SKOKNICA_API_BASE = 'https://api.skoknica.rs';
const API_BASE = window.SKOKNICA_API_BASE || '';

/* ---- Autocomplete destinacije: prvo /api/locations (ako je backend podešen),
   a ako nema backend-a (ili poziv ne uspe) — Open-Meteo geokodiranje, isti
   javni API bez ključa koji se već koristi za vremensku prognozu. ---- */
/* ---- Poznati gradovi/prestonice/turistička mesta — ovo je uvek prvi izvor
   predloga, jer Open-Meteo geokoding ume da vrati nepoznata mesta umesto
   očiglednih (npr. selo umesto prestonice), i loše "pogađa" kad se kuca
   bez kvačica (c/s/z umesto č/š/ž). Tek ako ovde nema dovoljno pogodaka,
   dopunjuje se sa Open-Meteo. ---- */
const POPULAR_DESTINATIONS = [
  // Srbija
  {name:'Beograd', extra:'Srbija'}, {name:'Novi Sad', extra:'Srbija'}, {name:'Niš', extra:'Srbija'},
  {name:'Kragujevac', extra:'Srbija'}, {name:'Subotica', extra:'Srbija'}, {name:'Zlatibor', extra:'Srbija'},
  {name:'Kopaonik', extra:'Srbija'}, {name:'Vrnjačka Banja', extra:'Srbija'},
  // Region
  {name:'Podgorica', extra:'Crna Gora'}, {name:'Budva', extra:'Crna Gora'}, {name:'Kotor', extra:'Crna Gora'},
  {name:'Herceg Novi', extra:'Crna Gora'}, {name:'Igalo', extra:'Crna Gora'}, {name:'Bar', extra:'Crna Gora'},
  {name:'Tivat', extra:'Crna Gora'}, {name:'Petrovac', extra:'Crna Gora'}, {name:'Sutomore', extra:'Crna Gora'},
  {name:'Ulcinj', extra:'Crna Gora'}, {name:'Perast', extra:'Crna Gora'}, {name:'Risan', extra:'Crna Gora'},
  {name:'Sarajevo', extra:'Bosna i Hercegovina'}, {name:'Mostar', extra:'Bosna i Hercegovina'}, {name:'Banja Luka', extra:'Bosna i Hercegovina'},
  {name:'Zagreb', extra:'Hrvatska'}, {name:'Split', extra:'Hrvatska'}, {name:'Dubrovnik', extra:'Hrvatska'},
  {name:'Zadar', extra:'Hrvatska'}, {name:'Rijeka', extra:'Hrvatska'}, {name:'Pula', extra:'Hrvatska'}, {name:'Hvar', extra:'Hrvatska'},
  {name:'Makarska', extra:'Hrvatska'}, {name:'Trogir', extra:'Hrvatska'}, {name:'Šibenik', extra:'Hrvatska'}, {name:'Rovinj', extra:'Hrvatska'},
  {name:'Skoplje', extra:'Severna Makedonija'}, {name:'Ohrid', extra:'Severna Makedonija'},
  {name:'Priština', extra:'Kosovo'},
  {name:'Ljubljana', extra:'Slovenija'}, {name:'Bled', extra:'Slovenija'}, {name:'Piran', extra:'Slovenija'},
  {name:'Tirana', extra:'Albanija'}, {name:'Sarande', extra:'Albanija'},
  {name:'Bukurešt', extra:'Rumunija'}, {name:'Sofija', extra:'Bugarska'}, {name:'Varna', extra:'Bugarska'}, {name:'Burgas', extra:'Bugarska'},
  // Grčka i Egej
  {name:'Atina', extra:'Grčka'}, {name:'Solun', extra:'Grčka'}, {name:'Krf', extra:'Grčka'},
  {name:'Santorini', extra:'Grčka'}, {name:'Mikonos', extra:'Grčka'}, {name:'Rodos', extra:'Grčka'},
  {name:'Krit', extra:'Grčka'}, {name:'Halkidiki', extra:'Grčka'},
  // Italija
  {name:'Rim', extra:'Italija'}, {name:'Milano', extra:'Italija'}, {name:'Napulj', extra:'Italija'},
  {name:'Venecija', extra:'Italija'}, {name:'Firenca', extra:'Italija'}, {name:'Bolonja', extra:'Italija'},
  {name:'Verona', extra:'Italija'}, {name:'Torino', extra:'Italija'}, {name:'Bari', extra:'Italija'}, {name:'Sicilija', extra:'Italija'},
  // Španija i Portugal
  {name:'Barselona', extra:'Španija'}, {name:'Madrid', extra:'Španija'}, {name:'Valensija', extra:'Španija'},
  {name:'Malaga', extra:'Španija'}, {name:'Ibica', extra:'Španija'}, {name:'Majorka', extra:'Španija'}, {name:'Sevilja', extra:'Španija'},
  {name:'Lisabon', extra:'Portugalija'}, {name:'Porto', extra:'Portugalija'}, {name:'Faro', extra:'Portugalija'},
  // Zapadna/Severna Evropa
  {name:'Pariz', extra:'Francuska'}, {name:'Nica', extra:'Francuska'}, {name:'Lion', extra:'Francuska'},
  {name:'London', extra:'Velika Britanija'}, {name:'Edinburg', extra:'Velika Britanija'},
  {name:'Amsterdam', extra:'Holandija'}, {name:'Roterdam', extra:'Holandija'},
  {name:'Berlin', extra:'Nemačka'}, {name:'Minhen', extra:'Nemačka'}, {name:'Hamburg', extra:'Nemačka'}, {name:'Frankfurt', extra:'Nemačka'},
  {name:'Beč', extra:'Austrija'}, {name:'Zalcburg', extra:'Austrija'}, {name:'Insbruk', extra:'Austrija'},
  {name:'Prag', extra:'Češka'}, {name:'Budimpešta', extra:'Mađarska'}, {name:'Bratislava', extra:'Slovačka'},
  {name:'Varšava', extra:'Poljska'}, {name:'Krakov', extra:'Poljska'},
  {name:'Stokholm', extra:'Švedska'}, {name:'Oslo', extra:'Norveška'}, {name:'Kopenhagen', extra:'Danska'}, {name:'Helsinki', extra:'Finska'},
  {name:'Dablin', extra:'Irska'}, {name:'Brisel', extra:'Belgija'}, {name:'Cirih', extra:'Švajcarska'}, {name:'Ženeva', extra:'Švajcarska'},
  // Turska, Bliski istok, sever Afrike
  {name:'Istanbul', extra:'Turska'}, {name:'Antalija', extra:'Turska'}, {name:'Bodrum', extra:'Turska'}, {name:'Kapadokija', extra:'Turska'},
  {name:'Tel Aviv', extra:'Izrael'}, {name:'Dubai', extra:'UAE'}, {name:'Abu Dabi', extra:'UAE'},
  {name:'Kairo', extra:'Egipat'}, {name:'Šarm El Šeik', extra:'Egipat'}, {name:'Hurgada', extra:'Egipat'}, {name:'Marakeš', extra:'Maroko'},
  // Amerika i Azija (najtraženiji daleki gradovi)
  {name:'Njujork', extra:'SAD'}, {name:'Majami', extra:'SAD'}, {name:'Los Anđeles', extra:'SAD'},
  {name:'Bangkok', extra:'Tajland'}, {name:'Tokio', extra:'Japan'}, {name:'Bali', extra:'Indonezija'}, {name:'Singapur', extra:'Singapur'},
];
// Uklanja srpske kvačice (č/ć/š/ž/đ) i standardne akcente, radi poređenja bez
// obzira da li korisnik kuca sa ili bez njih (npr. "Kotor" vs "Beč"/"Bec").
function normalizeSr(str){
  return String(str)
    .replace(/đ/g, 'dj').replace(/Đ/g, 'Dj')
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

/* ---- Provera važenja pasoša za odabranu destinaciju ----
   Srpski biometrijski pasoš je bezvizan za Šengen zonu (90 dana u periodu
   od 180 dana), pa "da li mi treba viza" nije stvarni problem za većinu
   traženih destinacija. Pravi, dokumentovan problem je KOLIKO DUGO pasoš
   mora da važi nakon (ili za Tursku: od) putovanja — turisti bivaju vraćeni
   sa granice ili čekiranja zbog ovoga, iako je sam datum putovanja u redu. */
const SCHENGEN_COUNTRIES = new Set([
  'Austrija','Belgija','Hrvatska','Češka','Danska','Estonija','Finska','Francuska',
  'Nemačka','Grčka','Mađarska','Italija','Letonija','Litvanija','Luksemburg','Malta',
  'Holandija','Poljska','Portugalija','Slovačka','Slovenija','Španija','Švedska',
  'Island','Lihtenštajn','Norveška','Švajcarska'
]);
function getPassportRule(country){
  const c = (country || '').trim();
  if (SCHENGEN_COUNTRIES.has(c)){
    return {basis:'to', months:3, days:null, label:c || 'Šengen zona', confident:true,
      why:'Za Šengen zonu pasoš mora da važi još najmanje 3 meseca nakon planiranog datuma povratka.'};
  }
  if (c === 'Turska'){
    return {basis:'from', months:null, days:150, label:'Turska', confident:true,
      why:'Za Tursku pasoš mora da važi još najmanje 150 dana (cca 5 meseci) od datuma ulaska u zemlju.'};
  }
  if (c === 'Egipat' || c === 'Tunis'){
    return {basis:'to', months:6, days:null, label:c, confident:true,
      why:'Za ' + c + ' pasoš mora da važi još najmanje 6 meseci nakon planiranog datuma povratka.'};
  }
  return {basis:'to', months:6, days:null, label:c || 'ova destinacija', confident:false,
    why:'Nemamo potvrđeno pravilo za destinaciju „' + (c || 'ova destinacija') + '“ — mnoge zemlje van Šengena traže važenje pasoša još 6 meseci nakon povratka, ali ovo obavezno proveri kod ambasade/aviokompanije jer se pravilo razlikuje po zemlji.'};
}
function resolveCountryForDestination(destValue){
  const matches = matchPopularDestinations(destValue || '');
  return matches.length ? (matches[0].extra || '') : '';
}
function addMonthsToDate(date, months){
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
function addDaysToDate(date, days){
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function fmtDateSr(d){
  return d.getDate() + '. ' + d.toLocaleString('sr-Latn', {month:'long'}) + ' ' + d.getFullYear() + '.';
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
  }).map(r => `<option value="${escapeHtml(r.name)}">${escapeHtml(r.name)}${r.extra ? ' — ' + escapeHtml(r.extra) : ''}</option>`).join('');
}
function markStubLoading(inputEl, q){
  const stubEl = inputEl.closest('.stub');
  if (!stubEl) return;
  // Upali spinner odmah na kucanje (ne čekaj debounce) — inače 300ms
  // pre samog fetch-a polje izgleda mirno/prazno, kao da nešto ne radi.
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
  if (!API_BASE) return null; // backend jos nije deploy-ovan — nema smisla ni pokusavati
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
  const factor = marketFactor(dest, todayStr());

  const pkgs = ['best','comfort','budget'].map(t => buildPackage(rng, dest, nights, days, adults, t, flags, factor));
  pkgs.forEach(p => attachAffiliateLinks(p, dest, from, to, adults));

  // Price score is relative to the cheapest of THIS run's three packages —
  // the cheapest always scores highest on price, others drop off the more
  // expensive they are. Combined with the fixed quality score, this decides
  // which package actually gets the "Preporučeno" badge (not just whichever
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
   "IZNENADI ME" — pretraga samo po budžetu, bez destinacije.
   Korisnik unese samo iznos; sajt proba svih ~100 gradova iz
   POPULAR_DESTINATIONS na 'best' tieru (isti flagovi kao u glavnoj
   formi) i vrati 3 nasumične koje se uklapaju u budžet.

   Namerno koristi ISTI seed kao computePackagesLocally za 'best'
   tier (hashSeed(dest+dest.length+nights+adults), pa rng potrošen
   redom best->comfort->budget) — cena koju "Iznenadi me" pokaže za
   neki grad je BIT-ZA-BIT ista kao kad bi korisnik taj grad ukucao
   ručno u glavnu pretragu. Nema dupliranja logike, samo poziva
   buildPackage direktno za jedan tier umesto sva tri.
========================================================== */
function computeSurpriseCandidates(from, to, adults, flags){
  const nights = nightsBetween(from, to);
  const days = nights;
  return POPULAR_DESTINATIONS.map(d => {
    const seed = hashSeed(d.name.toLowerCase()+d.name.length+nights+adults);
    const rng = seededRandom(seed);
    const factor = marketFactor(d.name, todayStr());
    const pkg = buildPackage(rng, d.name, nights, days, adults, 'best', flags, factor);
    attachAffiliateLinks(pkg, d.name, from, to, adults);
    return {dest:d.name, country:d.extra||'', pkg};
  });
}

// Bira 3 grada. Ako manje od 3 uopšte stane u budžet, umesto da vrati
// prazno (razočaravajuće), vraća 3 NAJJEFTINIJE opcije uz jasnu napomenu —
// sajt nikad ne sme da ostavi korisnika bez ijednog predloga.
function pickSurpriseDestinations(budget, candidates, count){
  const fitting = candidates.filter(c => c.pkg.total <= budget);
  const usedFallback = fitting.length < count;
  const pool = usedFallback ? candidates.slice().sort((a,b)=>a.pkg.total-b.pkg.total).slice(0, Math.max(count*3, count)) : fitting;

  // Obično (Fisher-Yates) mešanje — namerno NIJE seed-ovano kao ostatak
  // cenovne logike, jer ovde želimo da svaki klik na "Probaj ponovo" da
  // drugačiju trojku. Cena svakog grada ostaje deterministička, samo je
  // IZBOR koja 3 grada se prikazuju nasumičan.
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

  // Global kontekst za "Sačuvaj ovu ponudu" dugme na svakoj kartici —
  // isti obrazac kao window._lastBuilderPkg za builder.
  window._lastSearchPkgs = pkgs;
  window._lastSearchCtx = {dest, from, to, adults, nights, flags};

  document.getElementById('ctaTitle').textContent = dest + ' te čeka.';
  document.getElementById('ctaDesc').textContent = ctaCopy(dest);

  // Airalo (eSIM) se dodaje ručno jer nije "fetch-ovana" stavka kao ostali
  // partneri (nema svoju cenu sa API-ja) — ali je i dalje pravi partner
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
        <div class="pill">${iconSvg('calendar')} ${fmtDate(from)} – ${fmtDate(to)}</div>
        <div class="pill">${iconSvg('people')} ${adults} ${passengerLabel(adults)}</div>
      </div>
    </div>
  `;

  const body = document.getElementById('resultsBody');
  body.innerHTML = `<div class="packages">${pkgs.map(pkgHtml).join('')}</div>
    <p class="disclaimer">⚠️ Skoknica je trenutno u razvoju — prikazane cene su ilustrativan primer, generisan lokalno radi demonstracije, i <strong>nisu preuzete uživo</strong> sa partnerskih sajtova. Za stvarnu cenu i dostupnost proveri direktno na sajtu partnera (${providers.join(', ')}) pre rezervacije.</p>`;
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
      <a class="item-btn ${kind}" href="${escapeHtml(item.bookUrl||'#')}" target="_blank" rel="noopener" data-kind="${kind}" data-price="${item.price}" data-url="${escapeHtml(item.bookUrl||'')}" onclick="bookItem(this)">${btnLabel[kind]}</a>
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
    <button type="button" class="pkg-close" onclick="closePkgCard(this)" aria-label="Zatvori ovu ponudu" title="Zatvori ovu ponudu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
    <div class="pkg-head">
      <div>
        ${featured ? `<span class="pkg-badge">★ Preporučeno</span>` : ''}
        <h3>${meta.label}</h3>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;">${meta.desc}</div>
      </div>
      <div class="pkg-total">
        <div class="num tabular">${fmtEUR(pkg.total)}</div>
        <div class="cur">ukupno</div>
        <div class="hint">zbir odvojenih rezervacija, ne jedno plaćanje</div>
      </div>
    </div>
    <div class="pkg-score">
      <span><strong style="color:var(--ink);font-weight:600;">Skor ${pkg.score}/100</strong> — odnos cene i kvaliteta</span>
    </div>
    ${itemsRow ? `<div class="items-row">${itemsRow}</div>` : ''}
    ${(() => {
      const extraTiles = [
        pkg.activity ? `<div class="extra activity-extra">${iconSvg('activity')}<div><div class="lab">${escapeHtml(pkg.activity.name.split(' — ')[0])}</div><div class="val tabular">${fmtEUR(pkg.activity.price)}</div></div><a class="extra-btn" href="${escapeHtml(pkg.activity.bookUrl||'#')}" target="_blank" rel="noopener" data-kind="activity" data-price="${pkg.activity.price}" data-url="${escapeHtml(pkg.activity.bookUrl||'')}" onclick="bookItem(this)">Viator</a></div>` : '',
        pkg.car ? `<div class="extra fuel-extra">${iconSvg('fuel')}<div><div class="lab">${t('fuel_estimate')}</div><div class="val tabular">${fmtEUR(pkg.fuel)}</div></div></div>` : '',
        pkg.car ? `<div class="extra tolls-extra">${iconSvg('tolls')}<div><div class="lab">${t('tolls_estimate')}</div><div class="val tabular">${fmtEUR(pkg.tolls)}</div></div></div>` : ''
        // Osiguranje i eSIM dodaci su uklonjeni sa ovih kartica — sad se
        // biraju u sekciji "Kontrola sadržaja" (builder), da kartice
        // ponude ostanu pregledne. pkg.insuranceCost/esimCost i dalje
        // postoje u pkg objektu (koristi ih builder), samo se ovde ne
        // renderuju.
      ].filter(Boolean).join('');
      return extraTiles ? `<div class="extras-row">${extraTiles}</div>` : '';
    })()}
    <div class="confirm-banner">
      <span>${iconSvg('check')} ${t('base_package_note')}</span>
      <span><span class="amt-lab">Ukupno:</span><span class="amt tabular">${fmtEUR(pkg.total)}</span></span>
    </div>
    <button type="button" class="pkg-save-btn" onclick="saveSearchPackage('${pkg.tier}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
      Sačuvaj ovu ponudu
    </button>
    <button type="button" class="pkg-alert-btn" onclick="openAlertModal('search', '${pkg.tier}', ${pkg.total})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 3a5 5 0 00-5 5v3.2c0 .9-.35 1.75-.98 2.4L4.6 15h14.8l-1.42-1.4a3.4 3.4 0 01-.98-2.4V8a5 5 0 00-5-5z"/><path d="M9.5 19a2.6 2.6 0 005 0"/></svg>
      Javi mi kad padne cena
    </button>
  </div>`;
}

function closePkgCard(btn){
  const card = btn.closest('.pkg');
  if (!card) return;
  const wrap = card.parentElement;
  card.style.transition = 'opacity .18s ease, transform .18s ease, margin .18s ease, max-height .18s ease';
  card.style.maxHeight = card.offsetHeight + 'px';
  card.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    card.style.opacity = '0';
    card.style.transform = 'scale(0.97)';
    card.style.maxHeight = '0px';
    card.style.marginBottom = '0px';
    card.style.marginTop = '0px';
  });
  setTimeout(() => {
    card.remove();
    if (wrap && wrap.classList.contains('packages') && !wrap.querySelector('.pkg')){
      wrap.innerHTML = '<p class="disclaimer" style="text-align:center;">Sklonio si sve ponude sa liste. <button type="button" class="pkg-alert-btn" style="margin-left:6px;" onclick="runSearch(false)">Pretraži ponovo</button></p>';
    }
  }, 200);
}

/* ==========================================================
   Prikaz rezultata za "Iznenadi me" — 3 RAZLIČITE destinacije
   (uvek 'best' tier) umesto 3 tier-a ISTE destinacije. Deli
   #resultsHead/#resultsBody sa običnom pretragom (isti kontejner),
   samo drugačiji sadržaj.
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
        <span class="pkg-badge surprise-badge">🎲 Predlog</span>
        <h3>${escapeHtml(dest)}</h3>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;">${escapeHtml(country)} · Best Value</div>
      </div>
      <div class="pkg-total">
        <div class="num tabular">${fmtEUR(pkg.total)}</div>
        <div class="cur">ukupno</div>
        <div class="hint">zbir odvojenih rezervacija, ne jedno plaćanje</div>
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
      Sačuvaj ovu ponudu
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
        <div class="status-check">🎲</div>
        <div><h3>3 predloga za budžet od ${fmtEUR(budget)}.</h3><p>${usedFallback ? 'Nijedan grad se u potpunosti nije uklopio u budžet — evo 3 najjeftinije opcije koje imamo.' : 'Nasumično odabrano od preko 100 gradova koji se uklapaju u tvoj budžet.'}</p></div>
      </div>
      <div class="status-pills">
        <div class="pill">${iconSvg('calendar')} ${fmtDate(ctxBase.from)} – ${fmtDate(ctxBase.to)}</div>
        <div class="pill">${iconSvg('people')} ${ctxBase.adults} ${passengerLabel(ctxBase.adults)}</div>
      </div>
    </div>
  `;

  const body = document.getElementById('resultsBody');
  body.innerHTML = `
    <div class="packages">${picks.map((p,i)=>surprisePkgHtml(p, i, budget)).join('')}</div>
    <button type="button" class="btn-alert surprise-reroll-btn" onclick="runSurpriseSearch(true)">🎲 Probaj druga 3 predloga</button>
    <p class="disclaimer">⚠️ Skoknica je trenutno u razvoju — prikazane cene su ilustrativan primer, generisan lokalno radi demonstracije, i <strong>nisu preuzete uživo</strong> sa partnerskih sajtova.</p>
  `;
}

async function runSurpriseSearch(isReroll){
  const budget = Number(document.getElementById('surpriseBudget').value);
  if (!budget || budget <= 0){ showToast('Unesi budžet veći od 0.'); return; }

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
    document.getElementById('resultsBody').innerHTML = '<div class="loading"><div class="spin"></div>' + (getLang()==='en' ? 'Searching 3 destinations that fit your budget…' : 'Tražimo 3 destinacije koje se uklapaju u tvoj budžet…') + '</div>';
    results.scrollIntoView({behavior:'smooth', block:'start'});
  }

  bumpSearchStat('🎲 ' + fmtEUR(budget));

  setTimeout(()=>{
    const nights = nightsBetween(from, to);
    const candidates = computeSurpriseCandidates(from, to, adults, flags);
    const {picks, usedFallback} = pickSurpriseDestinations(budget, candidates, 3);
    renderSurpriseResults(picks, {from, to, adults, nights, flags}, budget, usedFallback);
  }, isReroll ? 0 : 700);
}

// Klik na "Vidi sve opcije za {grad}" — prebacuje na normalnu pretragu
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
    showToast('Prijavi se emailom da sačuvaš ponudu.');
    return;
  }
  const pick = (window._lastSurprisePicks || [])[idx];
  const ctx = window._lastSurpriseCtx;
  if (!pick || !ctx){ showToast('Ponuda više nije dostupna — probaj ponovo.'); return; }

  const summaryTags = [
    '🎲 Iznenadi me',
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
  if (error){ showToast('Greška pri čuvanju: ' + error.message); return; }
  renderSavedTrips();
  showToast(pick.dest + ' sačuvan (' + fmtEUR(pick.pkg.total) + ').');
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

/* Uživo sabiranje dodataka (osiguranje/eSIM) na cenu paketa — bez ponovne
   pretrage. Svaki .pkg pamti svoju osnovnu cenu u data-base-total, a ovde
   se na nju dodaje zbir čekiranih dodataka unutar TOG istog paketa. */
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
  bumpClickStat();
  const labels = {
    flight:   'let na KAYAK-u',
    hotel:    'smeštaj na Booking.com',
    car:      'auto na Booking.com',
    activity: 'aktivnost na Viator-u',
    esim:     'eSIM na Airalo-u'
  };
  showToast('Klik zabeležen za ' + (labels[kind]||kind) + ' (' + fmtEUR(price) + ') · otvaram partnera…');
  // Napomena: ne pozivamo window.open ovde — <a href target="_blank"> sam
  // otvara link. Ranije smo ovde imali window.open(url,'_blank','noopener'),
  // ali JS-generisani popup tabovi znaju da se na mobilnom Chrome-u ne povežu
  // kako treba sa originalnim tabom, pa dugme "nazad" na partnerskom sajtu
  // ume da zatvori ceo browser umesto da vrati korisnika na Skoknicu.
  // Pravi <a> link je pouzdaniji način da se to izbegne.
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
  if (state.lastDest) document.getElementById('statLast').textContent = state.lastDest;
  saveStats();
}

/* ---- Uvećanje brojača: prvo pokušaj deljeni (Supabase RPC, atomično za
   sve posetioce), a ako ne uspe (sb nedostupan, tabela/funkcija ne postoji,
   mreža) — padni nazad na lokalni brojač kao do sad. ---- */
async function bumpSearchStat(destLabel){
  if (typeof sb !== 'undefined' && sb){
    try{
      const { data, error } = await sb.rpc('increment_search_stat', { p_dest: destLabel });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row){
        state.searches = row.searches;
        state.clicks = row.clicks;
        state.lastDest = row.last_dest || destLabel;
        updateStats();
        return;
      }
    }catch(err){
      console.warn('[skoknica] Deljeni brojač pretraga nije uspeo, koristim lokalni:', err.message);
    }
  }
  state.searches += 1;
  state.lastDest = destLabel;
  updateStats();
}
async function bumpClickStat(){
  if (typeof sb !== 'undefined' && sb){
    try{
      const { data, error } = await sb.rpc('increment_click_stat');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row){
        state.searches = row.searches;
        state.clicks = row.clicks;
        state.lastDest = row.last_dest || state.lastDest;
        updateStats();
        return;
      }
    }catch(err){
      console.warn('[skoknica] Deljeni brojač klikova nije uspeo, koristim lokalni:', err.message);
    }
  }
  state.clicks += 1;
  updateStats();
}

/* ==========================================================
   FORM WIRING
========================================================== */
/* ---- "Polazak" (poreklo/origin) je bitno SAMO kad se traži let — za
   hotel/auto/aktivnosti nema smisla pitati odakle korisnik kreće. Polje
   se sakriva kad je "Letovi" toggle isključen (i to je podrazumevano
   stanje pri učitavanju stranice), a ponovo se pojavljuje čim se let
   uključi. Required atribut prati isto stanje, da prazno polje ne
   blokira slanje forme kad let uopšte nije deo pretrage. ---- */
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

// Postavi početno stanje u skladu sa checkbox-om koji je već markiran u HTML-u
// (trenutno "Letovi" nije uključen po default-u, pa se polje krije od starta).
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
  document.getElementById('resultsBody').innerHTML = '<div class="loading"><div class="spin"></div>Pretražujemo letove, smeštaj, aute i aktivnosti…</div>';
  if (shouldScroll) results.scrollIntoView({behavior:'smooth', block:'start'});

  bumpSearchStat(dest);

  setTimeout(()=>{
    renderResults(dest, from, to, nights, days, adults, flags, originCode);
  }, 700);
}

document.getElementById('searchForm').addEventListener('submit', function(e){
  e.preventDefault();
  runSearch(true);
});

/* ==========================================================
   BUILD-YOUR-OWN ("Napravi svoj aranžman")
========================================================== */
// Jedini izvor default vrednosti — čuvamo posebno od builderState (koji se
// mutira tokom rada) da bismo mogli da RESETUJEMO na siguran default pre
// učitavanja sačuvanog aranžmana (vidi loadSavedTrip). Bez ovog reseta,
// polje koje nedostaje u starom sačuvanom zapisu (npr. jer je dodato tek
// kasnije u builderState) ne bi dobilo fallback — ostalo bi kakvo je bilo
// pre poziva (stanje iz prethodno učitanog aranžmana ili undefined), što bi
// computeCustomPackage moglo da pretvori u NaN cene.
const BUILDER_ADDON_RATES = { insurance: 18, esim: 9 }; // po osobi
const BUILDER_DEFAULTS = {
  flightPref: 'direct',
  airlineName: '',
  hotelStars: 4,
  prioritizeRating: false,
  prioritizeLocation: false,
  carPref: 'small',
  activityCount: 2,
  insurance: false,
  esim: false,
  budget: null
};
const builderState = Object.assign({}, BUILDER_DEFAULTS);

// Teaser kartica "Želiš više kontrole?" — panel je zatvoren po default-u
// (vidi style="display:none" na #builderPanel u HTML-u) da hero+ova
// sekcija ne deluju pretrpano; klik otvara/zatvara ceo builder.
function openControlPanel(){
  document.getElementById('controlTeaserBtn').setAttribute('aria-expanded', 'true');
  document.getElementById('builderPanel').style.display = 'grid';
}
function closeControlPanel(){
  document.getElementById('controlTeaserBtn').setAttribute('aria-expanded', 'false');
  document.getElementById('builderPanel').style.display = 'none';
}
document.getElementById('controlTeaserBtn').addEventListener('click', ()=>{
  const isOpen = document.getElementById('controlTeaserBtn').getAttribute('aria-expanded') === 'true';
  if (isOpen){ closeControlPanel(); }
  else {
    openControlPanel();
    document.getElementById('builderPanel').scrollIntoView({behavior:'smooth', block:'start'});
  }
});
document.getElementById('controlTeaserSelectBtn').addEventListener('click', ()=>{
  openControlPanel();
  document.getElementById('builderPanel').scrollIntoView({behavior:'smooth', block:'start'});
});
document.getElementById('builderCloseBtn').addEventListener('click', ()=>{
  closeControlPanel();
  document.getElementById('controlTeaserBtn').scrollIntoView({behavior:'smooth', block:'start'});
});

function builderCtx(){
  const dest = document.getElementById('dest').value.trim() || 'Atina';
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  const adults = Number(document.getElementById('adults').value) || 2;
  const nights = nightsBetween(from, to);
  return {dest, nights, days:nights, adults};
}

function computeCustomPackage(sel, ctx){
  // Seed zavisi SAMO od izbora koji stvarno utiču na SASTAV aranžmana
  // (let, hotel, auto, aktivnosti) — budžet je isključen iz istog razloga
  // kao i pre (samo prag za poređenje, ne treba da menja generisane cene).
  // airlineName je TAKOĐE namerno isključen: to je slobodan tekst koji
  // korisnik kuca slovo po slovo, i kad bi bio deo seed-a, svaki novi
  // karakter bi generisao potpuno nov seed → hotel/auto/aktivnosti cene
  // bi "treperele" i menjale se pri svakom tasteru, iako se ništa
  // semantički bitno za njih nije promenilo. Ime avio-kompanije i dalje
  // utiče na PRIKAZ leta (flightName ispod), samo ne na seed generatora.
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
  // NE zove rng() (carriers[...] se preskače) — to je namerno, jer inače
  // bi svaki prelaz prazno/popunjeno polje pomerio redosled sledećih
  // rng() poziva (hotel, auto...) za jedno mesto. Pošto je ova grana
  // stabilna za SVAKI neprazan unos (bilo koje slovo znači "preskoči"),
  // cene se ne pomeraju dok korisnik kuca — samo pri prvom i poslednjem
  // karakteru (prazno ↔ nije prazno), što je prihvatljivo i retko.
  const flightName = sel.flightPref === 'airline' && sel.airlineName
    ? sel.airlineName + ' → ' + ctx.dest
    : carriers[Math.floor(rng()*carriers.length)] + ' → ' + ctx.dest;
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

  // --- Gorivo i putarine (samo ako je auto uključen) ---
  const carExtras = sel.carPref === 'none' ? 0 : Math.round(18 + rng()*20);
  // --- Taksa za rezervaciju ---
  const bookingFee = Math.round(10 + rng()*10);

  // --- Osiguranje i eSIM (dodaci, cena po osobi) ---
  // NAPOMENA: namerno NE koristi rng() — ovo su uključi/isključi dodaci
  // (vidi .toggle-chip[data-toggle="insurance"/"esim"]), i pošto nisu deo
  // seedSel, uzimanje rng() ovde bi pomerilo redosled poziva za sve
  // random vrednosti iznad svaki put kad se dodatak uključi/isključi —
  // isti problem opisan gore za airlineName. Fiksna cena po osobi rešava
  // to i drži ostatak paketa stabilnim.
  const insuranceCost = sel.insurance ? BUILDER_ADDON_RATES.insurance * ctx.adults : 0;
  const esimCost = sel.esim ? BUILDER_ADDON_RATES.esim * ctx.adults : 0;

  // Isti dnevni tržišni faktor kao u gotovim ponudama (vidi marketFactor) —
  // primenjen na sve stavke osim osiguranja/eSIM-a, koji su fiksni dodaci
  // po osobi, ne tržišna cena koja fluktuira.
  const factor = marketFactor(ctx.dest, todayStr());
  const flightPriceF = Math.round(flightPrice * factor);
  const hotelPriceF = Math.round(hotelPrice * factor);
  const carPriceF = Math.round(carPrice * factor);
  const activityPriceF = Math.round(activityPrice * factor);
  const carExtrasF = Math.round(carExtras * factor);
  const bookingFeeF = Math.round(bookingFee * factor);

  const total = flightPriceF + hotelPriceF + carPriceF + activityPriceF + carExtrasF + bookingFeeF + insuranceCost + esimCost;

  return {
    flight: {price:flightPriceF, name:flightName, sub:flightSub},
    hotel:  {price:hotelPriceF, rating:Number(hotelRating.toFixed(1)), stars:sel.hotelStars},
    car:    {price:carPriceF, pref:sel.carPref},
    activity: {price:activityPriceF, count:sel.activityCount},
    carExtras: {price:carExtrasF},
    bookingFee: {price:bookingFeeF},
    insuranceCost, esimCost,
    total
  };
}

function renderBuilder(){
  const ctx = builderCtx();
  const pkg = computeCustomPackage(builderState, ctx);

  const lines = document.getElementById('builderLines');
  const rows = [
    ['✈️', 'Let', pkg.flight.price],
    ['🏨', 'Hotel', pkg.hotel.price],
  ];
  if (builderState.carPref !== 'none') rows.push(['🚗', 'Auto', pkg.car.price]);
  if (builderState.activityCount > 0) rows.push(['🎟️', 'Aktivnosti', pkg.activity.price]);
  if (pkg.carExtras.price > 0) rows.push(['⛽', 'Gorivo i putarine', pkg.carExtras.price]);
  rows.push(['🧾', 'Taksa za rezervaciju', pkg.bookingFee.price]);
  if (builderState.insurance) rows.push(['🛡️', t('f_insurance_name'), pkg.insuranceCost]);
  if (builderState.esim) rows.push(['📶', 'eSIM', pkg.esimCost]);

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
      statusEl.innerHTML = '✓ U okviru budžeta od ' + fmtEUR(builderState.budget);
    } else {
      statusEl.className = 'builder-budget-status show over';
      statusEl.innerHTML = '⚠ ' + fmtEUR(pkg.total - builderState.budget) + ' preko budžeta od ' + fmtEUR(builderState.budget);
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
    `<a class="item-btn flight" href="${escapeHtml(buildAffiliateLink('flight', linkCtx))}" target="_blank" rel="noopener" data-kind="flight" data-price="${pkg.flight.price}" data-url="${escapeHtml(buildAffiliateLink('flight', linkCtx))}" onclick="bookItem(this)">✈️ KAYAK</a>`,
    `<a class="item-btn hotel" href="${escapeHtml(buildAffiliateLink('hotel', linkCtx))}" target="_blank" rel="noopener" data-kind="hotel" data-price="${pkg.hotel.price}" data-url="${escapeHtml(buildAffiliateLink('hotel', linkCtx))}" onclick="bookItem(this)">🏨 Booking.com</a>`
  ];
  if (builderState.carPref !== 'none'){
    bookBtns.push(`<a class="item-btn car" href="${escapeHtml(buildAffiliateLink('car', linkCtx))}" target="_blank" rel="noopener" data-kind="car" data-price="${pkg.car.price}" data-url="${escapeHtml(buildAffiliateLink('car', linkCtx))}" onclick="bookItem(this)">🚗 Booking.com</a>`);
  }
  if (builderState.activityCount > 0){
    bookBtns.push(`<a class="item-btn" style="background:var(--aqua);" href="${escapeHtml(buildAffiliateLink('activity', linkCtx))}" target="_blank" rel="noopener" data-kind="activity" data-price="${pkg.activity.price}" data-url="${escapeHtml(buildAffiliateLink('activity', linkCtx))}" onclick="bookItem(this)">🎟️ Viator</a>`);
  }
  document.getElementById('builderBookLinks').innerHTML =
    '<div class="bbl-label">Rezerviši svaku stavku direktno kod partnera:</div>' +
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

// Gornja granica je namerno velikodušna (niko realno ne planira izlet
// preko ovoga), samo sprečava apsurdne unose tipa "1e10" ili slučajno
// dodat nepotreban nule. Budžet mora biti ceo broj > 0, ne negativan
// i ne decimalan — sve ostalo se ili odbacuje (null) ili zaokružuje/seče.
const MAX_BUDGET = 50000;

document.getElementById('budgetInput').addEventListener('input', (e)=>{
  const raw = e.target.value;
  if (!raw) { builderState.budget = null; renderBuilder(); return; }

  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n <= 0) {
    // Prazno/nevalidno/negativno dok korisnik još kuca (npr. samo "-") —
    // ne diramo polje, samo privremeno ignorišemo budžet u proračunu.
    builderState.budget = null;
  } else {
    const clamped = Math.min(n, MAX_BUDGET);
    // Ako je uneta decimala ili broj veći od granice, ispravi i prikaz
    // u polju da korisnik vidi tačno koja vrednost se zapravo koristi.
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
   ne samo hotel — i predlaže onu sa najvećom uštedom. "Već optimalno" se
   sada prikazuje samo ako ni jedna poluga stvarno ne postoji ili ni jedna
   ne donosi uštedu, ne čim prva proverena poluga (hotel) padne na 3★. ---- */
document.getElementById('optimizeBtn').addEventListener('click', ()=>{
  const ctx = builderCtx();
  const current = window._lastBuilderPkg || computeCustomPackage(builderState, ctx);
  const candidates = [];

  // Poluga 1: hotel jednu zvezdicu niže.
  if (builderState.hotelStars > 3) {
    const testSel = Object.assign({}, builderState, {hotelStars: builderState.hotelStars - 1});
    const alt = computeCustomPackage(testSel, ctx);
    candidates.push({
      testSel,
      savings: current.total - alt.total,
      message: `Ako promeniš hotel na ${testSel.hotelStars}★, zadržavaš skoro istu lokaciju uz malo nižu ocenu (${alt.hotel.rating} umesto ${current.hotel.rating}).`,
      toastMsg: 'hotel promenjen na ' + testSel.hotelStars + '★.',
      apply(){
        document.querySelectorAll('.chip-row[data-group="hotelStars"] .chip').forEach(c=>{
          c.classList.toggle('on', Number(c.dataset.value) === testSel.hotelStars);
        });
      }
    });
  }

  // Poluga 2: manji auto (SUV → mali auto → bez auta).
  const carDowngrade = {suv:'small', small:'none'}[builderState.carPref];
  if (carDowngrade) {
    const testSel = Object.assign({}, builderState, {carPref: carDowngrade});
    const alt = computeCustomPackage(testSel, ctx);
    candidates.push({
      testSel,
      savings: current.total - alt.total,
      message: carDowngrade === 'none'
        ? 'Ako odustaneš od iznajmljivanja auta, gubiš deo fleksibilnosti u kretanju, ali štediš i na gorivu i putarinama.'
        : 'Ako uzmeš manji auto umesto SUV-a, uštedu dobijaš uz nešto manje prtljažnog prostora.',
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
      message: `Ako smanjiš broj aktivnosti na ${testSel.activityCount}, ostaje ti i dalje dovoljno vremena za slobodno istraživanje.`,
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
      ? '<span class="save">Izlet je već optimalan</span>Proverili smo hotel, auto i broj aktivnosti — trenutna kombinacija je već najjeftinija za odabrane kriterijume.'
      : '<span class="save">Izlet je već optimalan</span>Već si na najnižim opcijama za sve stavke — nema očiglednog mesta za uštedu bez gubitka udobnosti.';
    return;
  }

  const best = viable[0];
  box.innerHTML = `
    <span class="save">Možeš uštedeti ${fmtEUR(best.savings)}</span>
    ${best.message}
    <button type="button" class="optimize-apply" id="applyOptimize">Primeni ovu izmenu</button>
  `;
  document.getElementById('applyOptimize').addEventListener('click', ()=>{
    Object.assign(builderState, best.testSel);
    best.apply();
    renderBuilder();
    showToast('Izlet ažuriran — ' + best.toastMsg);
  });
});

document.getElementById('makeBuilderBtn').addEventListener('click', ()=>{
  const destInput = document.getElementById('dest');
  if (!destInput.value.trim()){
    showToast('Unesi destinaciju da bismo napravili izlet.');
    destInput.focus();
    destInput.scrollIntoView({behavior:'smooth', block:'center'});
    return;
  }
  renderBuilder();
  document.getElementById('builderSummary').style.display = 'block';
  document.getElementById('builderPlaceholder').style.display = 'none';
});

/* ==========================================================
   POPULARNE DESTINACIJE — statične kartice u HTML-u (SEO sadržaj
   vidljiv i bez JS-a); klik samo puni postojeću formu i pokreće
   isti runSearch() koji se koristi za "Pronađi najbolje putovanje".
   Namerno stoji PRE Supabase inicijalizacije ispod — ako config.js
   nedostane ili baci grešku, ovo i dalje treba da radi.
========================================================== */
document.querySelectorAll('.popular-dest-card').forEach(card => {
  card.addEventListener('click', () => {
    document.getElementById('dest').value = card.dataset.dest;
    document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
    runSearch(false);
  });
});

/* ==========================================================
   MOJA PUTOVANJA — Supabase (auth.users + trips tabela).
   Prijava je email magic-link (OTP), ne treba Google/OAuth podesavanje.
   Ako Supabase iz nekog razloga ne odgovori (mreza, pogresan kljuc),
   sekcija samo ostaje prazna — ne obara ostatak sajta.

   NAPOMENA O DOPUNI: ovaj fajl je stigao na doradu isečen tačno OVDE
   ("sb = window.su..."), pa je sve od ove tačke pa do kraja fajla
   dopisano da bi sajt uopšte proradio. Šema tabele "trips" (user_id,
   dest, date_from, date_to, adults, selection, total) je preuzeta iz
   poziva koji već postoje gore u fajlu (saveSurprisePackage) — to je
   sigurno tačno. Ime tabele "price_alerts" i imena globalnih promenljivih
   iz config.js (window.SUPABASE_URL / window.SUPABASE_ANON_KEY) NISU
   potvrđena — ako se config.js zove drugačije, ispravi te dve linije
   odmah ispod.
========================================================== */
let sb = null;
try {
  if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  } else {
    console.warn('[skoknica] Supabase konfiguracija (config.js) nije pronađena — nalozi i sačuvani izleti su isključeni, ostatak sajta radi normalno.');
  }
} catch (err) {
  console.warn('[skoknica] Supabase inicijalizacija nije uspela:', err.message);
  sb = null;
}

/* ---- Deljeni (globalni) brojači — tabela "site_stats", jedan red (id=1).
   Ako Supabase nije dostupan ili tabela/funkcije ne postoje, ostajemo na
   lokalnom (localStorage) brojaču koji je već učitan preko loadStats(). ---- */
async function loadStatsFromSupabase(){
  if (!sb) return;
  try{
    const { data, error } = await sb.from('site_stats').select('searches,clicks,last_dest').eq('id', 1).single();
    if (error) throw error;
    if (data){
      state.searches = data.searches || 0;
      state.clicks = data.clicks || 0;
      state.lastDest = data.last_dest || state.lastDest;
      updateStats();
    }
  }catch(err){
    console.warn('[skoknica] Deljena statistika nije dostupna (tabela site_stats?), ostajem na lokalnoj:', err.message);
  }
}
loadStatsFromSupabase();

/* ---- Trenutni korisnik (keširano da ne zovemo getSession na svaki klik) ---- */
let _cachedUser = undefined; // undefined = još nije provereno, null = nije prijavljen
async function getCurrentUser(){
  if (!sb) return null;
  if (_cachedUser !== undefined) return _cachedUser;
  try {
    const { data, error } = await sb.auth.getSession();
    if (error) { console.warn('[skoknica] getSession greška:', error.message); _cachedUser = null; return null; }
    _cachedUser = data.session ? data.session.user : null;
    return _cachedUser;
  } catch(err) {
    console.warn('[skoknica] getSession nije uspeo:', err.message);
    _cachedUser = null;
    return null;
  }
}

if (sb) {
  sb.auth.onAuthStateChange((_event, session) => {
    _cachedUser = session ? session.user : null;
    renderSavedTrips();
    renderAccountMenu();
  });
}

/* ==========================================================
   NALOG — prijava linkom na email (magic link), bez lozinke.
   authBar se prikazuje u sekciji "Sačuvani izleti"; authDropdown je
   mala kartica koja iskače klikom na ikonicu naloga u zaglavlju.
========================================================== */
let _authBarExpanded = false;

function renderAuthBar(user){
  const bar = document.getElementById('authBar');
  if (!bar) return;
  if (!sb) { bar.innerHTML = ''; return; }

  if (user) {
    bar.innerHTML = `
      <div class="auth-logged-in">
        <span>Prijavljen/a kao <strong>${escapeHtml(user.email)}</strong></span>
        <button type="button" class="auth-logout-btn" id="authLogoutBtn">Odjavi se</button>
      </div>`;
    const logoutBtn = document.getElementById('authLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
      await sb.auth.signOut();
      _cachedUser = null;
      showToast('Odjavljen/a.');
      renderSavedTrips();
      renderAccountMenu();
    });
  } else if (_authBarExpanded) {
    bar.innerHTML = `
      <div class="auth-form">
        <input type="email" id="authEmailInput" class="auth-input" placeholder="tvoj@email.com" autocomplete="email" required>
        <button type="button" class="btn-primary" id="authSendLinkBtn">Pošalji link za prijavu</button>
      </div>
      <p class="auth-hint">Nema lozinke — kliknućeš na link koji ti stigne na email.</p>`;
    const sendBtn = document.getElementById('authSendLinkBtn');
    const emailInput = document.getElementById('authEmailInput');
    if (sendBtn) sendBtn.addEventListener('click', async () => {
      const email = (emailInput.value || '').trim();
      if (!email || !email.includes('@')) { showToast('Unesi ispravnu email adresu.'); return; }
      sendBtn.disabled = true;
      sendBtn.textContent = 'Šaljem…';
      try {
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
        if (error) throw error;
        showToast('Link za prijavu je poslat na ' + email + ' — proveri inbox.');
        bar.innerHTML = '<p class="auth-hint">✓ Proveri email (' + escapeHtml(email) + ') i klikni na link za prijavu.</p>';
      } catch(err) {
        console.warn('[skoknica] slanje magic linka nije uspelo:', err.message);
        showToast('Slanje linka nije uspelo — pokušaj ponovo.');
        sendBtn.disabled = false;
        sendBtn.textContent = 'Pošalji link za prijavu';
      }
    });
  } else {
    bar.innerHTML = `<button type="button" class="btn-alert" id="authOpenBtn">Prijavi se da sačuvaš izlete</button>`;
    const openBtn = document.getElementById('authOpenBtn');
    if (openBtn) openBtn.addEventListener('click', () => { _authBarExpanded = true; renderAuthBar(user); });
  }
}

/* ==========================================================
   SAČUVANI IZLETI
========================================================== */
async function renderSavedTrips(){
  const listEl = document.getElementById('savedTripsList');
  if (!listEl) return;
  const user = await getCurrentUser();
  renderAuthBar(user);

  if (!sb) {
    listEl.innerHTML = '<p class="saved-empty">Sačuvani izleti trenutno nisu dostupni.</p>';
    return;
  }
  if (!user) {
    listEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = '<p class="saved-loading">Učitavam sačuvane izlete…</p>';
  try {
    const { data, error } = await sb.from('trips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending:false });
    if (error) throw error;

    if (!data || !data.length) {
      listEl.innerHTML = '<p class="saved-empty">Još nemaš sačuvanih izleta — sačuvaj neku od ponuda gore.</p>';
      return;
    }

    window._savedTripsCache = data;
    listEl.innerHTML = data.map(tripCardHtml).join('');
  } catch(err) {
    console.warn('[skoknica] učitavanje sačuvanih izleta nije uspelo:', err.message);
    listEl.innerHTML = '<p class="saved-empty">Sačuvani izleti trenutno nisu dostupni — probaj ponovo kasnije.</p>';
  }
}

function tripCardHtml(trip){
  const tags = (trip.selection && trip.selection.summaryTags) ? trip.selection.summaryTags : [];
  const tierLabel = (trip.selection && trip.selection.tierLabel) || '';
  return `
  <div class="saved-trip-card" data-trip-id="${trip.id}">
    <div class="saved-trip-head">
      <div>
        <h4>${escapeHtml(trip.dest)}</h4>
        <div class="saved-trip-meta">${fmtDate(trip.date_from)} – ${fmtDate(trip.date_to)} · ${trip.adults} ${passengerLabel(trip.adults)}${tierLabel ? ' · ' + escapeHtml(tierLabel) : ''}</div>
      </div>
      <div class="saved-trip-total tabular">${fmtEUR(trip.total)}</div>
    </div>
    ${tags.length ? `<div class="saved-trip-tags">${tags.map(x=>`<span class="saved-trip-tag">${escapeHtml(x)}</span>`).join('')}</div>` : ''}
    <div class="saved-trip-actions">
      <button type="button" class="saved-trip-btn" onclick="loadSavedTrip('${trip.id}')">Otvori ponovo</button>
      <button type="button" class="saved-trip-btn" onclick="openShareModal('${trip.id}')">Podeli</button>
      <button type="button" class="saved-trip-btn danger" onclick="deleteSavedTrip('${trip.id}')">Obriši</button>
    </div>
  </div>`;
}

async function saveSearchPackage(tier){
  const user = await getCurrentUser();
  if (!user){
    _authBarExpanded = true;
    renderSavedTrips();
    document.getElementById('authBar').scrollIntoView({behavior:'smooth', block:'center'});
    showToast('Prijavi se emailom da sačuvaš ponudu.');
    return;
  }
  const pkgs = window._lastSearchPkgs;
  const ctx = window._lastSearchCtx;
  if (!pkgs || !ctx){ showToast('Ponuda više nije dostupna — probaj ponovo.'); return; }
  const pkg = pkgs.find(p => p.tier === tier);
  if (!pkg){ showToast('Ponuda više nije dostupna — probaj ponovo.'); return; }

  const meta = TIER_META[tier];
  const summaryTags = [
    pkg.flight ? pkg.flight.name : 'Bez leta',
    pkg.hotel ? pkg.hotel.name : 'Bez hotela',
    pkg.car ? 'Sa autom' : 'Bez auta'
  ];

  try {
    const { error } = await sb.from('trips').insert({
      user_id: user.id,
      dest: ctx.dest,
      date_from: ctx.from,
      date_to: ctx.to,
      adults: Number(ctx.adults),
      selection: {kind:'search', tier, tierLabel: meta.label, summaryTags},
      total: pkg.total
    });
    if (error) throw error;
    renderSavedTrips();
    showToast(ctx.dest + ' sačuvan (' + fmtEUR(pkg.total) + ').');
  } catch(err) {
    console.warn('[skoknica] čuvanje ponude nije uspelo:', err.message);
    showToast('Čuvanje nije uspelo — pokušaj ponovo.');
  }
}

document.getElementById('saveTripBtn').addEventListener('click', async () => {
  const user = await getCurrentUser();
  if (!user){
    _authBarExpanded = true;
    renderSavedTrips();
    document.getElementById('authBar').scrollIntoView({behavior:'smooth', block:'center'});
    showToast('Prijavi se emailom da sačuvaš izlet.');
    return;
  }
  const pkg = window._lastBuilderPkg;
  if (!pkg){ showToast('Napravi izlet pre čuvanja.'); return; }
  const ctx = builderCtx();
  const summaryTags = [
    pkg.flight.name,
    builderState.hotelStars + '★ hotel',
    builderState.carPref === 'none' ? 'Bez auta' : (builderState.carPref === 'suv' ? 'SUV' : 'Mali auto'),
    builderState.activityCount + ' aktivnosti'
  ];
  try {
    const { error } = await sb.from('trips').insert({
      user_id: user.id,
      dest: ctx.dest,
      date_from: document.getElementById('dateFrom').value,
      date_to: document.getElementById('dateTo').value,
      adults: ctx.adults,
      selection: {kind:'builder', builderState: Object.assign({}, builderState), summaryTags, tierLabel:'Sopstveni izlet'},
      total: pkg.total
    });
    if (error) throw error;
    renderSavedTrips();
    showToast('Izlet sačuvan (' + fmtEUR(pkg.total) + ').');
  } catch(err) {
    console.warn('[skoknica] čuvanje izleta nije uspelo:', err.message);
    showToast('Čuvanje nije uspelo — pokušaj ponovo.');
  }
});

function loadSavedTrip(tripId){
  const trip = (window._savedTripsCache || []).find(t => String(t.id) === String(tripId));
  if (!trip){ showToast('Izlet više nije dostupan.'); return; }

  document.getElementById('dest').value = trip.dest;
  document.getElementById('dateFrom').value = trip.date_from;
  document.getElementById('dateTo').value = trip.date_to;
  document.getElementById('adults').value = String(trip.adults);
  document.getElementById('dateFrom').dispatchEvent(new Event('change', {bubbles:true}));

  if (trip.selection && trip.selection.kind === 'builder' && trip.selection.builderState){
    Object.assign(builderState, BUILDER_DEFAULTS, trip.selection.builderState);
    document.querySelectorAll('.chip-row[data-group="flightPref"] .chip').forEach(c=>c.classList.toggle('on', c.dataset.value === builderState.flightPref));
    document.getElementById('airlineName').style.display = (builderState.flightPref === 'airline') ? 'block' : 'none';
    document.getElementById('airlineName').value = builderState.airlineName || '';
    document.querySelectorAll('.chip-row[data-group="hotelStars"] .chip').forEach(c=>c.classList.toggle('on', Number(c.dataset.value) === builderState.hotelStars));
    document.querySelectorAll('.chip-row[data-group="carPref"] .chip').forEach(c=>c.classList.toggle('on', c.dataset.value === builderState.carPref));
    document.querySelectorAll('.toggle-chip').forEach(c=>c.classList.toggle('on', !!builderState[c.dataset.toggle]));
    document.getElementById('actCount').textContent = builderState.activityCount;
    document.getElementById('budgetInput').value = builderState.budget || '';
    renderBuilder();
    document.getElementById('builderSummary').style.display = 'block';
    document.getElementById('builderPlaceholder').style.display = 'none';
    openControlPanel();
    document.querySelector('.builder-wrap').scrollIntoView({behavior:'smooth', block:'start'});
  } else {
    document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
    runSearch(false);
  }
  showToast('Izlet za ' + trip.dest + ' učitan.');
}

async function deleteSavedTrip(tripId){
  if (!sb) return;
  try {
    const { error } = await sb.from('trips').delete().eq('id', tripId);
    if (error) throw error;
    renderSavedTrips();
    showToast('Izlet obrisan.');
  } catch(err) {
    console.warn('[skoknica] brisanje nije uspelo:', err.message);
    showToast('Brisanje nije uspelo — pokušaj ponovo.');
  }
}

/* ==========================================================
   PODELI SA PRIJATELJIMA
   Deljeni link vodi na zajedno.html sa ?trip=<id> parametrom;
   ta stranica (van obima ovog prolaza) čita parametar i prikazuje
   RSVP (Idem/Možda/Ne mogu) bez potrebe za nalogom.
========================================================== */
function openShareModal(tripId){
  const trip = (window._savedTripsCache || []).find(t => String(t.id) === String(tripId));
  const link = window.location.origin + '/zajedno.html?trip=' + encodeURIComponent(tripId);
  document.getElementById('shareModalSub').textContent = trip
    ? 'Pošalji predlog za ' + trip.dest + ' prijateljima.'
    : 'Pošalji ovaj predlog prijateljima.';
  document.getElementById('shareModalLink').value = link;
  document.getElementById('shareModalNative').style.display = (navigator.share) ? 'block' : 'none';
  document.getElementById('shareModalBackdrop').classList.add('open');
  document.getElementById('shareModal').classList.add('open');
  window._pendingShareLink = link;
}
function closeShareModal(){
  document.getElementById('shareModalBackdrop').classList.remove('open');
  document.getElementById('shareModal').classList.remove('open');
}
document.getElementById('shareModalClose').addEventListener('click', closeShareModal);
document.getElementById('shareModalBackdrop').addEventListener('click', closeShareModal);
document.getElementById('shareModalCopy').addEventListener('click', async () => {
  const input = document.getElementById('shareModalLink');
  input.select();
  try {
    await navigator.clipboard.writeText(input.value);
    showToast('Link kopiran.');
  } catch(err) {
    document.execCommand('copy');
    showToast('Link kopiran.');
  }
});
document.getElementById('shareModalNative').addEventListener('click', async () => {
  try {
    await navigator.share({ title:'Skoknica — predlog za izlet', url: window._pendingShareLink });
  } catch(err){ /* korisnik je otkazao deljenje — nema potrebe za toast-om */ }
});

/* ==========================================================
   ALERT ZA CENU (Javi mi kad padne cena)
========================================================== */
let _pendingAlert = null;
function openAlertModal(kind, tier, total, destOverride){
  let dest, params;
  if (kind === 'builder') {
    const ctx = builderCtx();
    dest = ctx.dest;
    // Čuvamo CEO izbor iz buildera (builderState) da bi server kasnije
    // mogao da rekonstruiše IDENTIČAN paket i uporedi cenu — bez ovoga
    // ne bi imao dovoljno informacija (builder ima mnogo više opcija
    // od gotove ponude: tip leta, zvezdice hotela, tip auta...).
    params = { kind:'builder', dest: ctx.dest, nights: ctx.nights, days: ctx.days, adults: ctx.adults, sel: builderState };
  } else {
    const isSurprise = !!destOverride;
    const ctx = isSurprise ? window._lastSurpriseCtx : window._lastSearchCtx;
    dest = destOverride || (window._lastSearchCtx && window._lastSearchCtx.dest) || document.getElementById('dest').value.trim() || 'Atina';
    params = ctx ? { kind:'search', dest, tier, nights: ctx.nights, adults: Number(ctx.adults), flags: ctx.flags } : null;
  }
  _pendingAlert = { kind, tier, currentTotal: total, dest, params };
  document.getElementById('alertModalSub').textContent = 'Za ' + dest + ' — trenutna procena je ' + fmtEUR(total) + '.';
  document.getElementById('alertEmail').value = '';
  document.getElementById('alertThreshold').value = Math.max(1, Math.round(total * 0.9));
  document.getElementById('alertModalBackdrop').classList.add('open');
  document.getElementById('alertModal').classList.add('open');
}
function closeAlertModal(){
  document.getElementById('alertModalBackdrop').classList.remove('open');
  document.getElementById('alertModal').classList.remove('open');
}
document.getElementById('alertModalClose').addEventListener('click', closeAlertModal);
document.getElementById('alertModalBackdrop').addEventListener('click', closeAlertModal);
document.getElementById('alertBuilderBtn').addEventListener('click', () => {
  const pkg = window._lastBuilderPkg;
  if (!pkg){ showToast('Napravi izlet pre postavljanja alerta.'); return; }
  openAlertModal('builder', null, pkg.total);
});
document.getElementById('alertModalSubmit').addEventListener('click', async () => {
  const email = document.getElementById('alertEmail').value.trim();
  const threshold = Number(document.getElementById('alertThreshold').value);
  const submitBtn = document.getElementById('alertModalSubmit');
  if (!email || !email.includes('@')){ showToast('Unesi ispravnu email adresu.'); return; }
  if (!threshold || threshold <= 0){ showToast('Unesi ispravan iznos.'); return; }
  if (!_pendingAlert){ closeAlertModal(); return; }

  if (!sb) {
    showToast('Alerti trenutno nisu dostupni — pokušaj kasnije.');
    return;
  }

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = '…';
  try {
    const { error } = await sb.from('price_alerts').insert({
      email,
      dest: _pendingAlert.dest,
      kind: _pendingAlert.kind,
      tier: _pendingAlert.tier,
      threshold,
      current_total: _pendingAlert.currentTotal,
      params: _pendingAlert.params
    });
    if (error) throw error;
    closeAlertModal();
    showToast('Javićemo ti na ' + email + ' kad cena za ' + _pendingAlert.dest + ' padne ispod ' + fmtEUR(threshold) + '.');
  } catch(err) {
    console.warn('[skoknica] čuvanje alerta nije uspelo:', err.message);
    showToast('Postavljanje alerta nije uspelo — pokušaj ponovo.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});

/* ==========================================================
   NALOG — dropdown u zaglavlju + mobilni meni (hamburger)
========================================================== */
function renderAccountMenu(){
  const dropdown = document.getElementById('authDropdown');
  if (!dropdown) return;
  getCurrentUser().then(user => {
    dropdown.innerHTML = user
      ? `<div class="auth-dropdown-inner">
           <div class="auth-dropdown-email">${escapeHtml(user.email)}</div>
           <a href="#" id="dropdownSavedLink">Sačuvani izleti</a>
           <button type="button" id="dropdownLogoutBtn">Odjavi se</button>
         </div>`
      : `<div class="auth-dropdown-inner">
           <p>Prijavi se da sačuvaš izlete i primaš alerte o ceni.</p>
           <button type="button" id="dropdownLoginBtn">Prijavi se</button>
         </div>`;
    const savedLink = document.getElementById('dropdownSavedLink');
    if (savedLink) savedLink.addEventListener('click', (e) => {
      e.preventDefault();
      dropdown.classList.remove('open');
      document.querySelector('.saved-wrap')?.scrollIntoView({behavior:'smooth', block:'start'});
    });
    const logoutBtn = document.getElementById('dropdownLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
      await sb.auth.signOut();
      _cachedUser = null;
      dropdown.classList.remove('open');
      showToast('Odjavljen/a.');
      renderSavedTrips();
      renderAccountMenu();
    });
    const loginBtn = document.getElementById('dropdownLoginBtn');
    if (loginBtn) loginBtn.addEventListener('click', () => {
      dropdown.classList.remove('open');
      _authBarExpanded = true;
      renderSavedTrips();
      document.querySelector('.saved-wrap')?.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });
}

const topAvatarBtn = document.getElementById('topAvatarBtn');
const authDropdown = document.getElementById('authDropdown');
if (topAvatarBtn && authDropdown){
  topAvatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    authDropdown.classList.toggle('open');
    if (authDropdown.classList.contains('open')) renderAccountMenu();
  });
  document.addEventListener('click', () => authDropdown.classList.remove('open'));
  authDropdown.addEventListener('click', (e) => e.stopPropagation());
}

const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobilePanel = document.getElementById('mobilePanel');
if (hamburgerBtn && mobilePanel){
  hamburgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    mobilePanel.classList.toggle('open');
  });
  mobilePanel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobilePanel.classList.remove('open')));
  document.addEventListener('click', (e) => {
    if (mobilePanel.classList.contains('open') && !mobilePanel.contains(e.target)) mobilePanel.classList.remove('open');
  });
}

/* ---- "Iznenadi me" dugme na stranici otvara modal (koristi runSurpriseSearch iznad) ---- */
const noIdeaCtaBtn = document.getElementById('noIdeaCtaBtn');
if (noIdeaCtaBtn) noIdeaCtaBtn.addEventListener('click', openSurpriseModal);
const surpriseModalClose = document.getElementById('surpriseModalClose');
if (surpriseModalClose) surpriseModalClose.addEventListener('click', closeSurpriseModal);
const surpriseModalBackdrop = document.getElementById('surpriseModalBackdrop');
if (surpriseModalBackdrop) surpriseModalBackdrop.addEventListener('click', closeSurpriseModal);
const surpriseModalSubmit = document.getElementById('surpriseModalSubmit');
if (surpriseModalSubmit) surpriseModalSubmit.addEventListener('click', () => runSurpriseSearch(false));

/* ---- Modal: da li pasoš važi za odabranu destinaciju/datume ---- */
function openPassportModal(){
  const destVal = (document.getElementById('dest') || {}).value || '';
  const country = resolveCountryForDestination(destVal);
  const rule = getPassportRule(country);
  const box = document.getElementById('passportRuleBox');
  if (box){
    box.innerHTML = '<div class="passport-rule-box">'
      + '<b>' + escapeHtml(destVal ? (destVal + (country ? ' · ' + country : '')) : 'Destinacija nije uneta') + '</b>'
      + '<br>' + escapeHtml(rule.why)
      + (rule.confident ? '' : '<br><span style="opacity:0.75">(opšte pravilo, ne potvrđeno za ovu zemlju)</span>')
      + '</div>';
  }
  const resultEl = document.getElementById('passportResult');
  if (resultEl){ resultEl.className = ''; resultEl.innerHTML = ''; }
  const submitBtn = document.getElementById('passportCheckSubmit');
  if (submitBtn) submitBtn.dataset.country = country;
  document.getElementById('passportModalBackdrop').classList.add('open');
  document.getElementById('passportModal').classList.add('open');
}
function closePassportModal(){
  document.getElementById('passportModalBackdrop').classList.remove('open');
  document.getElementById('passportModal').classList.remove('open');
}
function runPassportCheck(){
  const expiryVal = (document.getElementById('passportExpiryInput') || {}).value;
  const resultEl = document.getElementById('passportResult');
  if (!resultEl) return;
  if (!expiryVal){
    resultEl.className = 'passport-result warn';
    resultEl.innerHTML = 'Unesi datum isteka pasoša da bismo mogli da proverimo.';
    return;
  }
  const destVal = (document.getElementById('dest') || {}).value || '';
  const country = resolveCountryForDestination(destVal);
  const rule = getPassportRule(country);
  const fromISO = (document.getElementById('dateFrom') || {}).value;
  const toISO = (document.getElementById('dateTo') || {}).value;
  const basisISO = rule.basis === 'from' ? fromISO : toISO;
  if (!basisISO){
    resultEl.className = 'passport-result warn';
    resultEl.innerHTML = 'Nedostaju datumi putovanja — vrati se na formu i izaberi Od — Do.';
    return;
  }
  const [by, bm, bd] = basisISO.split('-').map(Number);
  const basisDate = new Date(by, bm - 1, bd);
  const requiredExpiry = rule.days != null ? addDaysToDate(basisDate, rule.days) : addMonthsToDate(basisDate, rule.months);
  const [ey, em, ed] = expiryVal.split('-').map(Number);
  const expiryDate = new Date(ey, em - 1, ed);
  if (expiryDate.getTime() >= requiredExpiry.getTime()){
    resultEl.className = 'passport-result ok';
    resultEl.innerHTML = '✅ Tvoj pasoš važi dovoljno dugo za ovo putovanje — destinacija „' + escapeHtml(rule.label) + '“.';
  } else {
    resultEl.className = 'passport-result warn';
    resultEl.innerHTML = '⚠️ Tvoj pasoš ističe ' + fmtDateSr(expiryDate) + '. Pravilo za destinaciju „' + escapeHtml(rule.label)
      + '“ traži da važi bar do ' + fmtDateSr(requiredExpiry) + '. Vreme je da obnoviš pasoš — MUP izdaje redovan za oko 30 dana, a uz dokaz o putovanju (kartu ili rezervaciju) moguća je i ubrzana procedura za 48h.';
  }
}
const passportCheckBtn = document.getElementById('passportCheckBtn');
if (passportCheckBtn) passportCheckBtn.addEventListener('click', openPassportModal);
const passportModalClose = document.getElementById('passportModalClose');
if (passportModalClose) passportModalClose.addEventListener('click', closePassportModal);
const passportModalBackdrop = document.getElementById('passportModalBackdrop');
if (passportModalBackdrop) passportModalBackdrop.addEventListener('click', closePassportModal);
const passportCheckSubmit = document.getElementById('passportCheckSubmit');
if (passportCheckSubmit) passportCheckSubmit.addEventListener('click', runPassportCheck);

/* ==========================================================
   INICIJALIZACIJA
========================================================== */
applyStaticI18n();
updateStats();
renderSavedTrips();
renderAccountMenu();
