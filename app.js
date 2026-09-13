window.addEventListener('error', function(e){ document.title = 'GRESKA: ' + e.message + ' (linija ' + e.lineno + ')'; }, {once:true});
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
    hero_title:'TEST 999 вЂ” ako ovo vidiЕЎ, radi!<br><span class="accent">ceo izlet</span>.',
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
    eyebrow_no_idea:'NemaЕЎ plan', h2_no_idea:'Ne znaЕЎ gde bi iЕЎao?', sub_no_idea:'Reci nam koliko ЕѕeliЕЎ da potroЕЎiЕЎ, a mi Д‡emo pronaД‡i destinacije koje se uklapaju.',
    btn_no_idea_cta:'рџЋІ Iznenadi me',
    eyebrow_more_control:'ViЕЎe kontrole', h2_build_own:'ЕЅeliЕЎ viЕЎe kontrole?',
    sub_build_own:'BiraЕЎ let, smeЕЎtaj, auto i aktivnosti вЂ” mi raДЌunamo koliko sve zajedno koЕЎta.',
    eyebrow_features:'Sve ukljuДЌeno',
    builder_flight_label:'Let', chip_direct:'Direktan', chip_cheapest:'Najjeftiniji', chip_airline:'OdreД‘ena kompanija',
    placeholder_airline:'npr. Lufthansa',
    chip_priority_rating:'Prioritet: ocena', chip_priority_location:'Prioritet: lokacija',
    builder_transport_label:'Prevoz', chip_no_car:'Bez auta', chip_small_car:'Mali auto', chip_suv:'SUV',
    builder_activities_label:'Aktivnosti',
    aria_fewer_activities:'Manje aktivnosti', aria_more_activities:'ViЕЎe aktivnosti',
    builder_budget_label_html:'BudЕѕet <span style="font-weight:400;font-size:12px;color:var(--ink-soft);">(opciono)</span>',
    placeholder_budget:'npr. 700',
    btn_make_arrangement:'Napravi izlet',
    builder_summary_head:'Tvoj izlet', builder_total_sub:'ukupno',
    builder_total_hint:'Zbir procena za let, hotel, auto i aktivnosti вЂ” svaka stavka se plaД‡a zasebno kod partnera, ne u jednom plaД‡anju.',
    disclaimer_illustrative:'вљ пёЏ Ilustrativna procena, ne stvarna ponuda вЂ” sajt je u razvoju.',
    btn_optimize:'Optimizuj moj izlet', btn_save_trip:'SaДЌuvaj izlet', btn_price_alert:'Javi mi kad padne cena',
    builder_placeholder_text:'Ovde Д‡eЕЎ videti procenjenu cenu ДЌim poДЌneЕЎ da biraЕЎ вЂ” promeni bilo koju opciju levo.',
    eyebrow_for_later:'Za kasnije', h2_saved_trips:'Vrati se kad budeЕЎ spreman',
    sub_saved_trips:'SaДЌuvaj opcije koje ti se dopadaju i nastavi kasnije.',
    h2_features:'Sve ЕЎto ti treba za put', sub_features:'Od leta i smeЕЎtaja do auta, aktivnosti, osiguranja i interneta.',
    f_flight_sub:'Direktni i sa presedanjem', f_hotel_sub:'Hoteli, apartmani, hosteli',
    f_car_name:'Auto', f_car_sub:'Preuzimanje na aerodromu',
    f_tolls_name:'Putarine', f_tolls_sub:'Procena po ruti i drЕѕavi',
    f_activity_name:'Aktivnosti', f_activity_sub:'Karte i ture unapred',
    f_insurance_name:'Osiguranje', f_insurance_sub:'Zdravstveno i za otkazivanje',
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
    faq_q2:'Kako radi builder izleta?',
    faq_a2:'Sam biraЕЎ tip leta, kategoriju hotela, auto i broj aktivnosti, a Skoknica sabira procenjenu cenu za ceo paket. Dugme вЂћOptimizuj moj izlet" predlaЕѕe izmenu koja moЕѕe da smanji cenu uz sliДЌan kvalitet.',
    faq_q3:'Kako se ДЌuvaju moji saДЌuvani izleti?',
    faq_a3:'NapraviЕЎ nalog emailom i lozinkom u sekciji saДЌuvanih izleta. Tvoji podaci se ДЌuvaju vezano za tvoj nalog, ne za ovaj ureД‘aj, tako da im moЕѕeЕЎ pristupiti i sa drugog telefona ili raДЌunara вЂ” samo se prijavi istim emailom i lozinkom.',
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
    eyebrow_no_idea:'No plan yet', h2_no_idea:'Not sure where to go?', sub_no_idea:'Tell us how much you want to spend, and weвЂ™ll find destinations that fit.',
    btn_no_idea_cta:'рџЋІ Surprise me',
    eyebrow_more_control:'More control', h2_build_own:'Want more control?',
    eyebrow_features:'All included',
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
    f_flight_sub:'Direct and with stopovers', f_hotel_sub:'Hotels, apartments, hostels',
    f_car_name:'Car', f_car_sub:'Airport pickup',
    f_tolls_name:'Tolls', f_tolls_sub:'Estimated by route and country',
    f_activity_name:'Activities', f_activity_sub:'Tickets and tours in advance',
    f_insurance_name:'Insurance', f_insurance_sub:'Medical and cancellation cover',
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
          adults: Number(ctx.adults),
      selection: {kind:'search', tier, tierLabel: meta.label, summaryTags},
      total: pkg.total
    });
    if (error) throw error;
    renderSavedTrips();
    showToast(ctx.dest + ' saДЌuvan (' + fmtEUR(pkg.total) + ').');
  } catch(err) {
    console.warn('[skoknica] ДЌuvanje ponude nije uspelo:', err.message);
    showToast('ДЊuvanje nije uspelo вЂ” pokuЕЎaj ponovo.');
  }
}

document.getElementById('saveTripBtn').addEventListener('click', async () => {
  const user = await getCurrentUser();
  if (!user){
    _authBarExpanded = true;
    renderSavedTrips();
    document.getElementById('authBar').scrollIntoView({behavior:'smooth', block:'center'});
    showToast('Prijavi se emailom da saДЌuvaЕЎ izlet.');
    return;
  }
  const pkg = window._lastBuilderPkg;
  if (!pkg){ showToast('Napravi izlet pre ДЌuvanja.'); return; }
  const ctx = builderCtx();
  const summaryTags = [
    pkg.flight.name,
    builderState.hotelStars + 'в… hotel',
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
    showToast('Izlet saДЌuvan (' + fmtEUR(pkg.total) + ').');
  } catch(err) {
    console.warn('[skoknica] ДЌuvanje izleta nije uspelo:', err.message);
    showToast('ДЊuvanje nije uspelo вЂ” pokuЕЎaj ponovo.');
  }
});

function loadSavedTrip(tripId){
  const trip = (window._savedTripsCache || []).find(t => String(t.id) === String(tripId));
  if (!trip){ showToast('Izlet viЕЎe nije dostupan.'); return; }

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
    document.querySelector('.builder-wrap').scrollIntoView({behavior:'smooth', block:'start'});
  } else {
    document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
    runSearch(false);
  }
  showToast('Izlet za ' + trip.dest + ' uДЌitan.');
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
    showToast('Brisanje nije uspelo вЂ” pokuЕЎaj ponovo.');
  }
}

/* ==========================================================
   PODELI SA PRIJATELJIMA
   Deljeni link vodi na zajedno.html sa ?trip=<id> parametrom;
   ta stranica (van obima ovog prolaza) ДЌita parametar i prikazuje
   RSVP (Idem/MoЕѕda/Ne mogu) bez potrebe za nalogom.
========================================================== */
function openShareModal(tripId){
  const trip = (window._savedTripsCache || []).find(t => String(t.id) === String(tripId));
  const link = window.location.origin + '/zajedno.html?trip=' + encodeURIComponent(tripId);
  document.getElementById('shareModalSub').textContent = trip
    ? 'PoЕЎalji predlog za ' + trip.dest + ' prijateljima.'
    : 'PoЕЎalji ovaj predlog prijateljima.';
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
    await navigator.share({ title:'Skoknica вЂ” predlog za izlet', url: window._pendingShareLink });
  } catch(err){ /* korisnik je otkazao deljenje вЂ” nema potrebe za toast-om */ }
});

/* ==========================================================
   ALERT ZA CENU (Javi mi kad padne cena)
========================================================== */
let _pendingAlert = null;
function openAlertModal(kind, tier, total, destOverride){
  const dest = destOverride || document.getElementById('dest').value.trim() || 'Atina';
  _pendingAlert = { kind, tier, currentTotal: total, dest };
  document.getElementById('alertModalSub').textContent = 'Za ' + dest + ' вЂ” trenutna procena je ' + fmtEUR(total) + '.';
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
  if (!email || !email.includes('@')){ showToast('Unesi ispravnu email adresu.'); return; }
  if (!threshold || threshold <= 0){ showToast('Unesi ispravan iznos.'); return; }
  if (!_pendingAlert){ closeAlertModal(); return; }

  if (sb) {
    try {
      const { error } = await sb.from('price_alerts').insert({
        email,
        dest: _pendingAlert.dest,
        kind: _pendingAlert.kind,
        tier: _pendingAlert.tier,
        threshold,
        current_total: _pendingAlert.currentTotal
      });
      if (error) throw error;
    } catch(err) {
      console.warn('[skoknica] ДЌuvanje alerta nije uspelo (tabela price_alerts moЕѕda ne postoji):', err.message);
    }
  }
  closeAlertModal();
  showToast('JaviД‡emo ti na ' + email + ' kad cena za ' + _pendingAlert.dest + ' padne ispod ' + fmtEUR(threshold) + '.');
});

/* ==========================================================
   NALOG вЂ” dropdown u zaglavlju + mobilni meni (hamburger)
========================================================== */
function renderAccountMenu(){
  const dropdown = document.getElementById('authDropdown');
  if (!dropdown) return;
  getCurrentUser().then(user => {
    dropdown.innerHTML = user
      ? `<div class="auth-dropdown-inner">
           <div class="auth-dropdown-email">${escapeHtml(user.email)}</div>
           <a href="#" id="dropdownSavedLink">SaДЌuvani izleti</a>
           <button type="button" id="dropdownLogoutBtn">Odjavi se</button>
         </div>`
      : `<div class="auth-dropdown-inner">
           <p>Prijavi se da saДЌuvaЕЎ izlete i primaЕЎ alerte o ceni.</p>
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

/* ==========================================================
   INICIJALIZACIJA
========================================================== */
applyStaticI18n();
updateStats();
renderSavedTrips();
renderAccountMenu(); 