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
   UNIVERZALNI GUARD ZA FIZIČKO/GEST "NAZAD" DUGME NA TELEFONU
   ----------------------------------------------------------
   Kad se otvori modal/sheet/kartica (kalendar, putnici, match kviz,
   deljenje, alert, dokumenta, start-prefs, rezultati, feature-guide...),
   stranica se tehnički ne menja — nema novog unosa u history. Zato
   "Nazad" dugme ne zna da treba da zatvori TAJ overlay i umesto toga
   izlazi sa celog sajta.
   Rešenje: pri otvaranju svakog overlay-a guramo prazan unos u
   history (guardOverlayOpen). "Nazad" prvo pop-uje TAJ unos — jedini
   popstate handler ispod ga hvata i zatvara najgornji otvoreni
   overlay (raw close funkcija, bez ponovnog diranja historije).
   Kad se overlay zatvara na neki drugi način (X dugme, klik na
   pozadinu, Escape, "Primeni"...), koristi se guardOverlayRequestClose
   — ona samo prosledi na history.back(), da postoji JEDAN jedini put
   kojim se overlay zatvara i history stek ostane čist.
========================================================== */
const _historyOverlays = []; // stek { id, close(rawCloseFn) }

function guardOverlayOpen(id, closeFn){
  // Ako je ovaj overlay (npr. kalendar) već otvoren i gurnut, ne guramo
  // duplo — samo ažuriramo close funkciju (može se promeniti po pozivu).
  const existing = _historyOverlays.find(o => o.id === id);
  if (existing){ existing.close = closeFn; return; }
  _historyOverlays.push({ id, close: closeFn });
  // history.pushState() se NAMERNO odlaže za sledeći tick (setTimeout 0),
  // ne poziva se direktno unutar click/touch handlera. Pozivanje
  // pushState() sinhrono, usred istog dodira koji je otvorio overlay,
  // je pravi uzrok bio zašto je na mobilnom trebalo dva tapa za SVAKU
  // narednu radnju (biranje datuma, brojač putnika, Nastavi...) — mobilni
  // WebKit/Chrome ume da "zaglavi" isporuku sledećeg klika kad se historija
  // menja usred obrade dodira. Odlaganjem za jedan tick, pushState se
  // izvršava tek KAD je browser završio sa obradom trenutnog tapa.
  setTimeout(() => {
    history.pushState({ overlayGuard: true, id }, '');
  }, 0);
}
// Vraća true ako je overlay bio gurnut u historiju (i time preuzima
// zatvaranje preko history.back() → popstate). Vraća false ako nije
// bio gurnut — u tom slučaju pozivač treba sam da zatvori overlay.
function guardOverlayRequestClose(id){
  const entry = _historyOverlays.find(o => o.id === id);
  if (!entry) return false;
  // NE skidamo overlay sa steka ovde — to radi ISKLJUČIVO popstate handler
  // ispod, kad back-navigacija stvarno stigne. history.back() je asinhron
  // (odložen i sam po sebi za jedan tick), pa ako overlay skinemo odmah,
  // popstate koji stigne kasnije ne nađe ništa na steku i nikad ne pozove
  // close() — otud je trebalo DVA klika da se overlay stvarno zatvori
  // (tek drugi klik, kad guard ne nađe overlay, sam direktno zove close()).
  // 'closing' flag samo sprečava da brzi uzastopni klikovi pokrenu više
  // history.back() poziva dok se prvi još ne obradi.
  if (entry.closing) return true;
  entry.closing = true;
  setTimeout(() => {
    history.back();
  }, 0);
  return true;
}
window.addEventListener('popstate', () => {
  const top = _historyOverlays.pop();
  if (top) top.close();
});
// Za slučajeve kad se overlay zatvori "sam od sebe" van normalnog toka
// (npr. rotacija ekrana/promena veličine prozora ugasi mobilni prikaz) —
// samo skida overlay sa steka, BEZ history.back(), da ne bismo nepotrebno
// vratili korisnika na prethodnu stranicu. Unos u historiji ostaje (biće
// tiho pokupljen sledećim "Nazad", bez efekta jer je stek već čist).
function guardOverlayDrop(id){
  const idx = _historyOverlays.findIndex(o => o.id === id);
  if (idx !== -1) _historyOverlays.splice(idx, 1);
}
// Za prelazak SA jednog guarded overlay-a DIREKTNO na drugi (npr. "Nastavi"
// unutar "Prilagodi svoj plan" ili match kviz -> rezultati): korisnik ide
// NAPRED, ne izlazi nazad, pa nema razloga da čekamo history.back()/popstate
// da zatvori stari overlay pre nego što se otvori novi. Kad bi se ovde
// pozvao guardOverlayRequestClose (back) pa odmah zatim guardOverlayOpen
// (push) za novi overlay, oba idu kroz odvojene setTimeout(0) pozive koji se
// mogu izvršiti PRE nego što browser stvarno završi back-navigaciju — novi
// overlay bi već bio na steku kad stigne popstate od starog zatvaranja, pa bi
// popstate handler pogrešno zatvorio NOVI overlay umesto starog (otud je novi
// ekran ostajao otvoren "iza" starog, koji se nikad stvarno nije zatvorio).
// Rešenje: zatvori stari overlay ODMAH, sinhrono (raw close, bez back()), i
// PREPIŠI postojeći history unos (replaceState) da sad predstavlja novi
// overlay — jedan unos u historiji i dalje odgovara jednom otvorenom
// overlay-u, bez ikakve back/push trke.
function guardOverlayReplace(oldId, newId, closeFn){
  const idx = _historyOverlays.findIndex(o => o.id === oldId);
  if (idx === -1) return;
  _historyOverlays[idx] = { id: newId, close: closeFn };
  history.replaceState({ overlayGuard: true, id: newId }, '');
}

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
    hero_kicker:'Pažljivo osmišljena putovanja',
    hero_title:'SKLOPI',
    hero_lede:'Sve u jednu cenu.',
    promo_banner_kicker:'Trenutak za sebe',
    promo_banner_quote:'Neka mesta jednostavno nemaju cenu.',
    partners_label:'Rezervacija ide direktno preko partnera',
    label_origin:'Polazak', placeholder_origin:'npr. Beograd, Niš, Podgorica',
    label_dest:'Destinacija', placeholder_dest:'npr. Atina, Rim, Barselona',
    label_dates:'Od — Do',
    aria_prev_month:'Prethodni mesec', aria_next_month:'Sledeći mesec',
    aria_today:'danas', aria_cal_dialog:'Izbor datuma putovanja',
    chip_weekend:'Vikend', chip_week:'Nedelja dana', chip_twoweeks:'Dve nedelje',
    cal_wx_legend:'<span class="lg-exact">☀️</span>prognoza (do 16 dana unapred) &nbsp;·&nbsp; <span class="lg-est">☀️</span>procena za dalje datume, po podacima za isti period prošle godine &nbsp;·&nbsp; <span style="opacity:0.35">build wx-5</span>',
    btn_done:'Gotovo',
    label_passengers:'Putnika', placeholder_passengers:'Putnika', aria_pax_dialog:'Izbor broja putnika',
    opt_1adult:'1 odrasla osoba', opt_2adults:'2 odrasla', opt_3adults:'3 odrasla', opt_4adults:'4 odrasla',
    btn_search:'Start',
    btn_search_html:'<svg class="btn-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/></svg>Start',
    toggle_flight:'Letovi', toggle_hotel:'Smeštaj', toggle_car:'R a C', toggle_activity:'Aktivnost',
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
    builder_flight_label:'Letovi', chip_direct:'Direktan', chip_cheapest:'Najjeftiniji', chip_airline:'Određena kompanija',
    placeholder_airline:'npr. Lufthansa',
    chip_priority_rating:'Prioritet: ocena', chip_priority_location:'Prioritet: lokacija',
    builder_transport_label:'Rent a car', chip_no_car:'Bez auta', chip_small_car:'Mali auto', chip_suv:'SUV',
    builder_activities_label:'Aktivnosti',
    aria_fewer_activities:'Manje aktivnosti', aria_more_activities:'Više aktivnosti',
    q_flight_desc:'Avionska karta do destinacije i nazad', q_flight_type:'Tip leta',
    q_hotel_desc:'Hotel ili apartman za ceo boravak', q_hotel_category:'Kategorija', q_priority:'Prioritet',
    q_car_desc:'Vozilo za ceo period boravka', q_car_type:'Vozilo',
    q_activities_desc:'Izleti, ulaznice i vođene ture', q_activities_count:'Broj aktivnosti',
    q_budget_desc:'Reci nam okvirni budžet da uporedimo',
    builder_budget_label_html:'Budžet <span style="font-weight:400;font-size:12px;color:var(--ink-soft);">(opciono)</span>',
    placeholder_budget:'npr. 700',
    btn_make_arrangement:'Napravi izlet', btn_show_price:'Prikaži cenu', btn_continue:'Nastavi',
    builder_summary_head:'Tvoj izlet', builder_total_sub:'ukupno',
    builder_total_hint:'Zbir procena za let, hotel, auto i aktivnosti — svaka stavka se plaća zasebno kod partnera, ne u jednom plaćanju.',
    disclaimer_illustrative:'⚠️ Ilustrativna procena, ne stvarna ponuda — sajt je u razvoju.',
    btn_optimize:'Optimizuj cenu', btn_save_trip:'Sačuvaj', btn_price_alert:'Javi mi kad padne cena',
    builder_placeholder_text:'Ovde ćeš videti procenjenu cenu čim počneš da biraš — promeni bilo koju opciju levo.',
    eyebrow_for_later:'Za kasnije', h2_saved_trips:'Vrati se kad budeš spreman',
    sub_saved_trips:'Sačuvaj opcije koje ti se dopadaju i nastavi kasnije.',
    h2_features:'Sve što ti treba za put', sub_features:'Od leta i smeštaja do auta, transfera, aktivnosti, osiguranja i interneta.',
    f_flight_sub:'Direktni i sa presedanjem', f_hotel_sub:'Hoteli, apartmani, hosteli',
    f_car_name:'Auto', f_car_sub:'Preuzimanje na aerodromu',
    f_tolls_name:'Putarine', f_tolls_sub:'Procena po ruti i državi',
    f_tax_name:'Boravišna taksa', f_tax_sub:'Po osobi, po noći — plaća se u hotelu',
    f_activity_name:'Aktivnosti', f_activity_sub:'Karte i ture unapred',
    f_insurance_name:'Osiguranje', f_insurance_sub:'Zdravstveno i za otkazivanje',
    f_esim_sub:'Internet od sletanja',
    f_transfer_name:'Transferi', f_transfer_sub:'Od aerodroma do smeštaja',
    postcard_caption:'Uvek postoji sledeći izlet.',
    eyebrow_attractions:'U partnerstvu sa Viator', h2_attractions:'Sklopi svoje atrakcije.',
    attractions_sub:'Koncerti, gondole, arene, podvodni svetovi i još hiljade doživljaja širom sveta — pronađi svoj i dodaj ga u plan.',
    btn_see_all_attractions:'🧭 Vidi sve atrakcije',
    eyebrow_ideas:'Ideje za sledeći izlet', h2_popular_dest:'Gde bi sledeće?',
    sub_popular_dest:'Pogledaj destinacije koje putnici iz Srbije i regiona najčešće biraju.',
    pd_athens_name:'Atina, Grčka', pd_athens_desc:'Antika, ostrvski trajekti i vrhunska kuhinja — popularna letnja destinacija sa čestim direktnim letovima.',
    pd_rome_name:'Rim, Italija', pd_rome_desc:'Koloseum, Vatikan i ulična kuhinja — grad koji se obilazi peške, uz kratak let iz Beograda.',
    pd_barcelona_name:'Barselona, Španija', pd_barcelona_desc:'Gaudijeva arhitektura, plaža i tapas bary — omiljena kombinacija grada i mora.',
    pd_budva_name:'Budva, Crna Gora', pd_budva_desc:'Najbliže more autom ili autobusom iz Srbije — stara varoš i duge plaže.',
    pd_istanbul_name:'Istanbul, Turska', pd_istanbul_desc:'Spoj Evrope i Azije, bazari i Bosfor — pristupačan izlet van sezone.',
    pd_vienna_name:'Beč, Austrija', pd_vienna_desc:'Muzeji, kafei i božićne pijace zimi — praktičan gradski izlet za vikend.',
    pd_thessaloniki_name:'Solun, Grčka', pd_thessaloniki_desc:'More bez potrebe za letom — praktičan izlet autom ili autobusom.',
    pd_prague_name:'Prag, Češka', pd_prague_desc:'Arhitektura, pivnice i šetnja starim gradom — popularan gradski izlet.',
    pd_budapest_name:'Budimpešta, Mađarska', pd_budapest_desc:'Kupatila, arhitektura i kratak let ili vožnja — praktičan gradski izlet.',
    cta_right:'Ceo izlet.<br>Jedna cena.',
    eyebrow_faq:'Pitanja', h2_faq:'Pre nego što rezervišeš',
    sub_faq:'Odgovori na najčešća pitanja o cenama, rezervaciji i promenama.',
    faq_q1:'Da li su prikazane cene stvarne?',
    faq_a1:'SKLOPI je trenutno u razvoju. Cene koje vidiš u pretrazi i builderu su ilustrativna procena, generisana radi demonstracije, ne dolaze uživo sa sajtova partnera. Pre rezervacije uvek proveri tačnu cenu i dostupnost direktno kod partnera (KAYAK, Booking.com, Viator).',
    faq_q2:'Kako radi builder izleta?',
    faq_a2:'Sam biraš tip leta, kategoriju hotela, auto i broj aktivnosti, a SKLOPI sabira procenjenu cenu za ceo paket. Dugme „Optimizuj moj izlet" predlaže izmenu koja može da smanji cenu uz sličan kvalitet.',
    faq_q3:'Kako se čuvaju moji sačuvani izleti?',
    faq_a3:'Napraviš nalog emailom i lozinkom u sekciji sačuvanih izleta. Tvoji podaci se čuvaju vezano za tvoj nalog, ne za ovaj uređaj, tako da im možeš pristupiti i sa drugog telefona ili računara — samo se prijavi istim emailom i lozinkom.',
    faq_q4:'Da li SKLOPI naplaćuje rezervaciju?',
    faq_a4:'Ne. SKLOPI ne naplaćuje ništa direktno — klikom na „Rezerviši" ili „Pretraži" odlaziš na sajt partnera (KAYAK, Booking.com ili Viator) gde se rezervacija i plaćanje obavljaju.',
    faq_q5:'Imaš pitanje koje nije ovde?',
    faq_a5:'Piši na <a href="mailto:panpetar405@gmail.com">panpetar405@gmail.com</a> — rado odgovaramo.',
    whatsapp_aria:'Piši nam na WhatsApp',
    stat_searches:'pretraga', stat_clicks:'klikova na ponude', stat_last:'poslednja destinacija',
    footer_contact:'Kontakt', footer_privacy:'Privatnost', footer_terms:'Uslovi', footer_cookies:'Kolačići', footer_guides:'Vodiči',
    foot_note:'SKLOPI — prototip proizvoda u razvoju. Prikazane cene su ilustrativne (simulirane radi demonstracije), ne dolaze uživo od partnera i ne predstavljaju stvarnu ponudu ni obavezu na cenu. · <a href="#" id="cookieSettingsLink">Podešavanja kolačića</a>',
    cookie_text:'<b>Koristimo kolačiće za analitiku</b> (Google Analytics) da bismo razumeli kako se sajt koristi i unapredili ga. Ne koristimo ih za marketing niti ih delimo van Google-a. Detalji u <a href="kolacici.html">Politici kolačića</a>.',
    cookie_decline:'Odbijam', cookie_accept:'Prihvatam',
    aria_close:'Zatvori', label_email:'Email',
    label_alert_threshold:'Javi mi kad ukupna procenjena cena padne ispod', btn_set_alert:'Postavi alert',
    alert_modal_disclaimer:'⚠️ I dalje ilustrativna procena, ne stvarna ponuda partnera. Poslaćemo ti mejl da potvrdiš — alert se aktivira tek nakon klika na link u njemu. Odjava je moguća bilo kad preko linka u mejlu koji dobiješ.',
    match_trigger:'<span class="ac-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M14.8 9.2l-2 5.6-5.6 2 2-5.6 5.6-2z"/></svg></span><span class="ac-title">Nemaš ideju kuda?</span><span class="ac-sub">Kratak upitnik od 3 pitanja — pronađi 3 destinacije koje ti stvarno odgovaraju, ne nasumične.</span><span class="match-preview-row"><span class="match-preview-chip">🌊 More</span><span class="match-preview-chip">🏙️ Grad</span><span class="match-preview-chip">🌲 Priroda</span><span class="match-preview-chip">🎉 Provod</span></span><span class="ac-cta"><span class="ac-cta-label">Pronađi mi destinaciju</span><span class="ac-arrow">→</span></span>',
    match_modal_title:'Pronađi svoj izlet',
    match_modal_sub:'Tri kratka pitanja — mi bodujemo preko 60 destinacija po poklapanju sa tobom, sezonom i dužinom puta, ne nasumično. Datumi i broj putnika ostaju kao u formi iznad.',
    match_step1_title:'Sa kim putuješ?',
    match_step2_title:'Šta ti znači odmor?',
    match_step3_title:'Koliki je ukupan budžet?',
    match_label_budget:'Ukupan budžet (za sve putnike, opciono)', placeholder_match_budget:'npr. 400',
    match_modal_btn:'🎯 Pronađi mi 3 destinacije',
    match_modal_disclaimer:'⚠️ Ilustrativna procena cene, kombinovana sa tvojim odgovorima — ne stvarna ponuda partnera.',
    share_modal_title:'Podeli sa prijateljima', share_modal_label_link:'Link za deljenje',
    share_modal_copy:'📋 Kopiraj link', share_modal_native:'📤 Podeli preko aplikacija',
    share_modal_disclaimer:'Svako ko otvori link vidi predlog i može da ostavi odgovor (Idem/Možda/Ne mogu) — bez pravljenja naloga.',
    documents_check_link:'🧳 Proveri dokumenta za put',
    documents_modal_title:'Dokumenta za put',
    documents_modal_sub:'Pasoš i zelena karta — sve na jednom mestu, u par klikova.',
    docs_tab_passport:'🛂 Pasoš',
    docs_tab_greencard:'🪪 Zelena karta',
    passport_check_link:'🛂 Proveri da li ti pasoš važi za ovaj put',
    passport_modal_sub:'Mnoge zemlje traže da pasoš važi još neko vreme nakon povratka — u suprotnom te mogu vratiti sa granice ili na čekiranju, iako sam datum putovanja nije problem.',
    passport_modal_title:'Da li ti pasoš važi za ovaj put?',
    passport_modal_label_expiry:'Do kog datuma važi tvoj pasoš?',
    passport_modal_btn:'Proveri',
    passport_modal_disclaimer:'⚠️ Opšta pravila po zemlji, radi orijentacije — pred put uvek dodatno proveri na sajtu ambasade/konzulata ili sa aviokompanijom.',
    green_card_check_link:'🪪 Proveri da li ti treba zelena karta za ovu rutu',
    green_card_modal_title:'Treba li ti zelena karta za auto?',
    green_card_modal_sub:'Zelena karta je međunarodna potvrda auto-osiguranja. Srbija ima sporazume sa većinom evropskih zemalja pa karton nije potreban, ali za neke destinacije i dalje jeste — i plaća se posebno kod osiguravača, van cene rentakara.',
    green_card_modal_disclaimer:'⚠️ Opšte pravilo za vozila registrovana u Srbiji, radi orijentacije — pred put uvek potvrdi kod svog osiguravača ili AMSS-a, jer se sporazumi povremeno menjaju.',
    green_card_dest_missing:'Prvo upiši kuda putuješ u polje „Destinacija“ iznad, pa se vrati ovde — pravilo zavisi od zemlje.',
    green_card_scope_note:'Odnosi se na vožnju sopstvenim ili u Srbiji iznajmljenim automobilom do granice — ne na rentakar koji preuzimaš tek na destinaciji (fly & drive).',
    // ---- dinamički stringovi (koristi ih JS preko t()) ----
    ac_searching:'Tražim…', ac_no_results:'Nema predloga za taj naziv.',
    results_back:'Nazad', results_back_aria:'Nazad na sajt',
    night:'noć', nights:'noći', passenger:'putnik', passengers:'putnika',
    fuel_estimate:'Gorivo (procena)', tolls_estimate:'Putarine (procena)', insurance:'Osiguranje', esim_internet:'eSIM / internet',
    btn_search_kayak:'Pretraži na KAYAK-u', btn_book_booking:'Rezerviši na Booking.com',
    aff_badge:'Afilijacija', aff_badge_title:'Ovo je afilijacijski (sponzorisan) link — ako rezervišeš preko njega, SKLOPI može ostvariti provizuju od partnera. Cena za tebe ostaje ista.',
    base_package_note:'Cena osnovnog paketa — dodaj osiguranje ili eSIM po želji.',
    fits_budget:'Uklapa se u tvoj budžet od ', over_budget:'Malo iznad budžeta, ali najbliža opcija koju imamo.',
    // --- Opisi paketa (pkgDescText / TIER_META.*.desc) ---
    pkg_desc_hotel_better:'bolji hotel', pkg_desc_hotel_cheapest:'najjeftiniji hotel', pkg_desc_hotel_verified:'provereni hotel',
    pkg_desc_flight_stopover:'let sa presedanjem', pkg_desc_flight_airline:'let odabranom kompanijom', pkg_desc_flight_direct:'direktan let',
    pkg_desc_car_spacious:'prostraniji auto', pkg_desc_car:'auto', pkg_desc_activities:'aktivnosti', pkg_desc_and:'i',
    tier_best_desc:'Najbolji odnos cene i kvaliteta',
    tier_comfort_desc:'Bolji hotel i ostale stavke u istoj kategoriji koju si tražio/la',
    tier_budget_desc:'Najniža cena u istoj kategoriji koju si tražio/la',
    // --- Šta je uključeno u ponudu (perks po tier-u) ---
    perk_flight_bag_cabin:'samo ručni prtljag', perk_flight_bag_checked:'prtljag od 23 kg uključen',
    perk_flight_flex:'izmena datuma bez kazne', perk_flight_fixed:'bez izmene datuma',
    perk_hotel_breakfast:'doručak uključen', perk_hotel_no_breakfast:'bez doručka',
    perk_hotel_central:'u centru grada', perk_hotel_dist_mid:'oko 1,5 km od centra', perk_hotel_dist_far:'oko 3 km od centra',
    perk_hotel_free_cancel:'besplatno otkazivanje', perk_hotel_no_cancel:'nepovratna rezervacija',
    perk_car_km_unlimited:'neograničena kilometraža', perk_car_km_limited:'ograničena kilometraža',
    perk_car_cover_full:'puno osiguranje bez participacije', perk_car_cover_basic:'osnovno osiguranje uz depozit',
  },
  en: {
    nav_how:'How it works', nav_dest:'Destinations', nav_about:'About',
    aria_account:'Account', aria_menu:'Menu',
    hero_kicker:'Thoughtfully designed trips',
    hero_title:'SKLOPI',
    hero_lede:'One price for the whole trip.',
    promo_banner_kicker:'A moment for yourself',
    promo_banner_quote:'Some places simply have no price.',
    partners_label:'Booking goes directly through our partners',
    label_origin:'From', placeholder_origin:'e.g. Belgrade, Niš, Podgorica',
    label_dest:'Destination', placeholder_dest:'e.g. Athens, Rome, Barcelona',
    label_dates:'From — To',
    aria_prev_month:'Previous month', aria_next_month:'Next month',
    aria_today:'today', aria_cal_dialog:'Choose travel dates',
    chip_weekend:'Weekend', chip_week:'One week', chip_twoweeks:'Two weeks',
    cal_wx_legend:'<span class="lg-exact">☀️</span>forecast (up to 16 days ahead) &nbsp;·&nbsp; <span class="lg-est">☀️</span>estimate for later dates, based on the same period last year &nbsp;·&nbsp; <span style="opacity:0.35">build wx-5</span>',
    btn_done:'Done',
    label_passengers:'Travelers', placeholder_passengers:'Travelers', aria_pax_dialog:'Select number of travelers',
    opt_1adult:'1 adult', opt_2adults:'2 adults', opt_3adults:'3 adults', opt_4adults:'4 adults',
    btn_search:'Start',
    btn_search_html:'<svg class="btn-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/></svg>Start',
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
    builder_flight_label:'Flights', chip_direct:'Direct', chip_cheapest:'Cheapest', chip_airline:'Specific airline',
    placeholder_airline:'e.g. Lufthansa',
    chip_priority_rating:'Priority: rating', chip_priority_location:'Priority: location',
    builder_transport_label:'Car rental', chip_no_car:'No car', chip_small_car:'Small car', chip_suv:'SUV',
    builder_activities_label:'Activities',
    aria_fewer_activities:'Fewer activities', aria_more_activities:'More activities',
    q_flight_desc:'Flight to your destination and back', q_flight_type:'Flight type',
    q_hotel_desc:'Hotel or apartment for the whole stay', q_hotel_category:'Category', q_priority:'Priority',
    q_car_desc:'Vehicle for the whole stay', q_car_type:'Vehicle',
    q_activities_desc:'Excursions, tickets and guided tours', q_activities_count:'Number of activities',
    q_budget_desc:'Tell us your rough budget so we can compare',
    builder_budget_label_html:'Budget <span style="font-weight:400;font-size:12px;color:var(--ink-soft);">(optional)</span>',
    placeholder_budget:'e.g. 700',
    btn_make_arrangement:'Build my trip', btn_show_price:'Show price', btn_continue:'Continue',
    builder_summary_head:'Your trip', builder_total_sub:'total',
    builder_total_hint:'Sum of estimates for flight, hotel, car and activities — each item is paid separately at the partner, not in one payment.',
    disclaimer_illustrative:'⚠️ Illustrative estimate, not a real offer — the site is in development.',
    btn_optimize:'Optimize price', btn_save_trip:'Save', btn_price_alert:'Notify me when the price drops',
    builder_placeholder_text:'You’ll see an estimated price here as soon as you start choosing — change any option on the left.',
    eyebrow_for_later:'For later', h2_saved_trips:'Come back when you’re ready',
    sub_saved_trips:'Save the options you like and pick up later.',
    h2_features:'Everything you need for the trip', sub_features:'From flights and stays to cars, transfers, activities, insurance and internet.',
    f_flight_sub:'Direct and with stopovers', f_hotel_sub:'Hotels, apartments, hostels',
    f_car_name:'Car', f_car_sub:'Airport pickup',
    f_tolls_name:'Tolls', f_tolls_sub:'Estimated by route and country',
    f_tax_name:'Tourist tax', f_tax_sub:'Per person, per night — paid at the hotel',
    f_activity_name:'Activities', f_activity_sub:'Tickets and tours in advance',
    f_insurance_name:'Insurance', f_insurance_sub:'Medical and cancellation cover',
    f_esim_sub:'Internet from landing',
    f_transfer_name:'Transfers', f_transfer_sub:'From the airport to your stay',
    postcard_caption:'There’s always a next trip.',
    eyebrow_attractions:'In partnership with Viator', h2_attractions:'Build your own attraction.',
    attractions_sub:'Concerts, gondolas, arenas, underwater worlds and thousands more experiences worldwide — find yours and add it to your plan.',
    btn_see_all_attractions:'🧭 See all attractions',
    eyebrow_ideas:'Ideas for your next trip', h2_popular_dest:'Where to next?',
    sub_popular_dest:'Take a look at the destinations travelers from Serbia and the region pick most often.',
    pd_athens_name:'Athens, Greece', pd_athens_desc:'Antiquity, island ferries and top-notch food — a popular summer destination with frequent direct flights.',
    pd_rome_name:'Rome, Italy', pd_rome_desc:'The Colosseum, the Vatican and street food — a walkable city, a short flight from Belgrade.',
    pd_barcelona_name:'Barcelona, Spain', pd_barcelona_desc:'Gaudí’s architecture, the beach and tapas bars — a favorite city-and-sea combination.',
    pd_budva_name:'Budva, Montenegro', pd_budva_desc:'The closest sea by car or bus from Serbia — an old town and long beaches.',
    pd_istanbul_name:'Istanbul, Turkey', pd_istanbul_desc:'Where Europe meets Asia, bazaars and the Bosphorus — an affordable off-season trip.',
    pd_vienna_name:'Vienna, Austria', pd_vienna_desc:'Museums, cafés and Christmas markets in winter — a practical city break.',
    pd_thessaloniki_name:'Thessaloniki, Greece', pd_thessaloniki_desc:'The sea without needing a flight — an easy trip by car or bus.',
    pd_prague_name:'Prague, Czechia', pd_prague_desc:'Architecture, beer halls and a walk through the old town — a popular city break.',
    pd_budapest_name:'Budapest, Hungary', pd_budapest_desc:'Baths, architecture and a short flight or drive — a practical city break.',
    cta_right:'One trip.<br>One price.',
    eyebrow_faq:'Questions', h2_faq:'Before you book',
    sub_faq:'Answers to the most common questions about prices, booking and changes.',
    faq_q1:'Are the prices shown real?',
    faq_a1:'SKLOPI is currently in development. Prices you see in search and the builder are an illustrative estimate, generated for demonstration, and don’t come live from partner sites. Always check the exact price and availability directly with the partner (KAYAK, Booking.com, Viator) before booking.',
    faq_q2:'How does the trip builder work?',
    faq_a2:'You choose the flight type, hotel category, car and number of activities yourself, and SKLOPI adds up an estimated price for the whole package. The “Optimize my trip” button suggests a change that can lower the price with similar quality.',
    faq_q3:'How are my saved trips stored?',
    faq_a3:'You create an account with an email and password in the “Saved trips” section. Your data is tied to your account, not this device, so you can access it from another phone or computer too — just log in with the same email and password.',
    faq_q4:'Does SKLOPI charge for booking?',
    faq_a4:'No. SKLOPI doesn’t charge anything directly — clicking “Book” or “Search” takes you to the partner’s site (KAYAK, Booking.com or Viator) where the booking and payment happen.',
    faq_q5:'Have a question that’s not here?',
    faq_a5:'Write to <a href="mailto:panpetar405@gmail.com">panpetar405@gmail.com</a> — we’re happy to help.',
    whatsapp_aria:'Message us on WhatsApp',
    stat_searches:'searches', stat_clicks:'clicks on offers', stat_last:'last destination',
    footer_contact:'Contact', footer_privacy:'Privacy', footer_terms:'Terms', footer_cookies:'Cookies', footer_guides:'Guides',
    foot_note:'SKLOPI — a product prototype in development. Prices shown are illustrative (simulated for demonstration), don’t come live from partners, and don’t represent a real offer or price commitment. · <a href="#" id="cookieSettingsLink">Cookie settings</a>',
    cookie_text:'<b>We use cookies for analytics</b> (Google Analytics) to understand how the site is used and improve it. We don’t use them for marketing or share them beyond Google. Details in the <a href="kolacici.html">Cookie Policy</a>.',
    cookie_decline:'Decline', cookie_accept:'Accept',
    aria_close:'Close', label_email:'Email',
    label_alert_threshold:'Notify me when the total estimated price drops below', btn_set_alert:'Set alert',
    alert_modal_disclaimer:'⚠️ Still an illustrative estimate, not a real partner offer. We\u2019ll send you a confirmation email — the alert only becomes active once you click the link in it. You can unsubscribe anytime via the link in the email you receive.',
    match_trigger:'<span class="ac-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M14.8 9.2l-2 5.6-5.6 2 2-5.6 5.6-2z"/></svg></span><span class="ac-title">No idea where to go?</span><span class="ac-sub">A short 3-question quiz — find 3 destinations that actually fit you, not random picks.</span><span class="match-preview-row"><span class="match-preview-chip">🌊 Beach</span><span class="match-preview-chip">🏙️ City</span><span class="match-preview-chip">🌲 Nature</span><span class="match-preview-chip">🎉 Nightlife</span></span><span class="ac-cta"><span class="ac-cta-label">Find my destination</span><span class="ac-arrow">→</span></span>',
    match_modal_title:'Find your trip',
    match_modal_sub:'Three quick questions — we score 60+ destinations by fit with you, the season and trip length, not at random. Dates and traveler count stay as set in the form above.',
    match_step1_title:'Who are you traveling with?',
    match_step2_title:'What does a vacation mean to you?',
    match_step3_title:'What\'s your total budget?',
    match_label_budget:'Total budget (for all travelers, optional)', placeholder_match_budget:'e.g. 400',
    match_modal_btn:'🎯 Find my 3 destinations',
    match_modal_disclaimer:'⚠️ Illustrative price estimate, combined with your answers — not a real partner offer.',
    share_modal_title:'Share with friends', share_modal_label_link:'Share link',
    share_modal_copy:'📋 Copy link', share_modal_native:'📤 Share via apps',
    share_modal_disclaimer:'Anyone who opens the link can see the plan and RSVP (Going/Maybe/Can’t make it) — no account needed.',
    documents_check_link:'🧳 Check your travel documents',
    documents_modal_title:'Travel documents',
    documents_modal_sub:'Passport and Green Card — all in one place, a couple of clicks away.',
    docs_tab_passport:'🛂 Passport',
    docs_tab_greencard:'🪪 Green Card',
    passport_check_link:'🛂 Check if your passport is valid for this trip',
    passport_modal_sub:'Many countries require your passport to stay valid for a while after your return — otherwise you can be turned away at the border or check-in, even if your travel dates themselves are fine.',
    passport_modal_title:'Is your passport valid for this trip?',
    passport_modal_label_expiry:'When does your passport expire?',
    passport_modal_btn:'Check',
    passport_modal_disclaimer:'⚠️ General rules per country, for guidance only — always double-check with the embassy/consulate or your airline before you travel.',
    green_card_check_link:'🪪 Check if you need a Green Card for this route',
    green_card_modal_title:'Do you need a Green Card for the car?',
    green_card_modal_sub:'The Green Card is an international proof of car insurance. Serbia has agreements with most European countries so it isn\'t needed, but some destinations still require it — and it\'s paid separately from the rental price, through your insurer.',
    green_card_modal_disclaimer:'⚠️ General rule for Serbian-registered vehicles, for guidance only — always confirm with your insurer or AMSS before traveling, as agreements change from time to time.',
    green_card_dest_missing:'First enter where you\'re going in the "Destination" field above, then come back here — the rule depends on the country.',
    green_card_scope_note:'Applies to driving your own or a Serbia-rented car across the border — not to a rental car picked up at your destination (fly & drive).',
    ac_searching:'Searching…', ac_no_results:'No suggestions for that name.',
    results_back:'Back', results_back_aria:'Back to site',
    night:'night', nights:'nights', passenger:'traveler', passengers:'travelers',
    fuel_estimate:'Fuel (estimate)', tolls_estimate:'Tolls (estimate)', insurance:'Insurance', esim_internet:'eSIM / internet',
    btn_search_kayak:'Search on KAYAK', btn_book_booking:'Book on Booking.com',
    aff_badge:'Affiliate', aff_badge_title:'This is an affiliate (sponsored) link — if you book through it, SKLOPI may earn a commission from the partner. Your price stays the same.',
    base_package_note:'Base package price — add insurance or eSIM if you like.',
    fits_budget:'Fits your budget of ', over_budget:'Slightly over budget, but the closest option we have.',
    // --- Package descriptions (pkgDescText / TIER_META.*.desc) ---
    pkg_desc_hotel_better:'a better hotel', pkg_desc_hotel_cheapest:'the cheapest hotel', pkg_desc_hotel_verified:'a vetted hotel',
    pkg_desc_flight_stopover:'a flight with a layover', pkg_desc_flight_airline:'a flight with your chosen airline', pkg_desc_flight_direct:'a direct flight',
    pkg_desc_car_spacious:'a roomier car', pkg_desc_car:'a car', pkg_desc_activities:'activities', pkg_desc_and:'and',
    tier_best_desc:'Best balance of price and quality',
    tier_comfort_desc:'A better hotel and other items, in the same category you asked for',
    tier_budget_desc:'Lowest price in the same category you asked for',
    // --- What's included (perks per tier) ---
    perk_flight_bag_cabin:'cabin bag only', perk_flight_bag_checked:'23 kg checked bag included',
    perk_flight_flex:'free date changes', perk_flight_fixed:'no date changes',
    perk_hotel_breakfast:'breakfast included', perk_hotel_no_breakfast:'no breakfast',
    perk_hotel_central:'in the city centre', perk_hotel_dist_mid:'about 1.5 km from the centre', perk_hotel_dist_far:'about 3 km from the centre',
    perk_hotel_free_cancel:'free cancellation', perk_hotel_no_cancel:'non-refundable',
    perk_car_km_unlimited:'unlimited mileage', perk_car_km_limited:'limited mileage',
    perk_car_cover_full:'full coverage, no excess', perk_car_cover_basic:'basic cover with a deposit',
  },
  ru: {
    nav_how:'Как это работает', nav_dest:'Направления', nav_about:'О нас',
    aria_account:'Аккаунт', aria_menu:'Меню',
    hero_kicker:'Продуманные путешествия',
    hero_title:'SKLOPI',
    hero_lede:'Всё включено в одну цену.',
    promo_banner_kicker:'Момент для себя',
    promo_banner_quote:'Некоторые места просто бесценны.',
    partners_label:'Бронирование проходит напрямую через партнёров',
    label_origin:'Откуда', placeholder_origin:'напр. Белград, Ниш, Подгорица',
    label_dest:'Направление', placeholder_dest:'напр. Афины, Рим, Барселона',
    label_dates:'С — По',
    aria_prev_month:'Предыдущий месяц', aria_next_month:'Следующий месяц',
    aria_today:'сегодня', aria_cal_dialog:'Выбор дат поездки',
    chip_weekend:'Выходные', chip_week:'Неделя', chip_twoweeks:'Две недели',
    cal_wx_legend:'<span class="lg-exact">☀️</span>прогноз (до 16 дней вперёд) &nbsp;·&nbsp; <span class="lg-est">☀️</span>оценка для более поздних дат, по данным за тот же период прошлого года &nbsp;·&nbsp; <span style="opacity:0.35">build wx-5</span>',
    btn_done:'Готово',
    label_passengers:'Путешественников', placeholder_passengers:'Путешественников', aria_pax_dialog:'Выбор числа путешественников',
    opt_1adult:'1 взрослый', opt_2adults:'2 взрослых', opt_3adults:'3 взрослых', opt_4adults:'4 взрослых',
    btn_search:'Старт',
    btn_search_html:'<svg class="btn-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/></svg>Старт',
    toggle_flight:'Перелёты', toggle_hotel:'Проживание', toggle_car:'Прокат авто', toggle_activity:'Активность',
    eyebrow_no_idea:'Нет плана', h2_no_idea:'Не знаешь куда поехать?', sub_no_idea:'Скажи нам, сколько хочешь потратить, и мы найдём направления, которые подойдут.',
    btn_no_idea_cta:'🎲 Удиви меня',
    eyebrow_more_control:'Больше контроля', h2_build_own:'Хочешь больше контроля?',
    eyebrow_content_control:'Контроль содержания', h2_content_control:'Сам реши, что тебе подходит',
    control_teaser_sub:'Сам выбираешь перелёт, отель, транспорт, активности, страховку и eSIM — цена суммируется в реальном времени.',
    ct_cta:'Открыть конструктор',
    btn_choose:'Выбрать',
    builder_addons_label:'Дополнения',
    eyebrow_features:'Всё включено',
    sub_build_own:'Сам выбираешь перелёт, проживание, авто и активности — мы считаем, сколько всё это будет стоить вместе.',
    builder_flight_label:'Перелёты', chip_direct:'Прямой', chip_cheapest:'Самый дешёвый', chip_airline:'Определённая авиакомпания',
    placeholder_airline:'напр. Lufthansa',
    chip_priority_rating:'Приоритет: рейтинг', chip_priority_location:'Приоритет: расположение',
    builder_transport_label:'Аренда авто', chip_no_car:'Без авто', chip_small_car:'Маленькое авто', chip_suv:'Внедорожник',
    builder_activities_label:'Активности',
    aria_fewer_activities:'Меньше активностей', aria_more_activities:'Больше активностей',
    q_flight_desc:'Авиабилет до места назначения и обратно', q_flight_type:'Тип перелёта',
    q_hotel_desc:'Отель или апартаменты на весь период', q_hotel_category:'Категория', q_priority:'Приоритет',
    q_car_desc:'Автомобиль на весь период пребывания', q_car_type:'Автомобиль',
    q_activities_desc:'Экскурсии, билеты и туры с гидом', q_activities_count:'Количество активностей',
    q_budget_desc:'Скажи нам примерный бюджет, чтобы сравнить',
    builder_budget_label_html:'Бюджет <span style="font-weight:400;font-size:12px;color:var(--ink-soft);">(необязательно)</span>',
    placeholder_budget:'напр. 700',
    btn_make_arrangement:'Составить поездку', btn_show_price:'Показать цену', btn_continue:'Продолжить',
    builder_summary_head:'Твоя поездка', builder_total_sub:'итого',
    builder_total_hint:'Сумма оценок за перелёт, отель, авто и активности — каждая позиция оплачивается отдельно у партнёра, а не одним платежом.',
    disclaimer_illustrative:'⚠️ Иллюстративная оценка, не реальное предложение — сайт находится в разработке.',
    btn_optimize:'Оптимизировать цену', btn_save_trip:'Сохранить', btn_price_alert:'Сообщить, когда цена упадёт',
    builder_placeholder_text:'Здесь появится примерная цена, как только начнёшь выбирать — измени любую опцию слева.',
    eyebrow_for_later:'На потом', h2_saved_trips:'Вернись, когда будешь готов',
    sub_saved_trips:'Сохрани понравившиеся варианты и продолжи позже.',
    h2_features:'Всё необходимое для поездки', sub_features:'От перелёта и проживания до авто, трансферов, активностей, страховки и интернета.',
    f_flight_sub:'Прямые и с пересадками', f_hotel_sub:'Отели, апартаменты, хостелы',
    f_car_name:'Авто', f_car_sub:'Получение в аэропорту',
    f_tolls_name:'Дорожные сборы', f_tolls_sub:'Оценка по маршруту и стране',
    f_tax_name:'Туристический сбор', f_tax_sub:'На человека, за ночь — оплачивается в отеле',
    f_activity_name:'Активности', f_activity_sub:'Билеты и туры заранее',
    f_insurance_name:'Страховка', f_insurance_sub:'Медицинская и на случай отмены',
    f_esim_sub:'Интернет сразу по прилёту',
    f_transfer_name:'Трансферы', f_transfer_sub:'От аэропорта до места проживания',
    postcard_caption:'Следующая поездка всегда впереди.',
    eyebrow_attractions:'В партнёрстве с Viator', h2_attractions:'Собери свою атракцию.',
    attractions_sub:'Концерты, гондолы, арены, подводные миры и ещё тысячи впечатлений по всему миру — найди своё и добавь в план.',
    btn_see_all_attractions:'🧭 Смотреть все атракции',
    eyebrow_ideas:'Идеи для следующей поездки', h2_popular_dest:'Куда дальше?',
    sub_popular_dest:'Посмотри направления, которые путешественники из Сербии и региона выбирают чаще всего.',
    pd_athens_name:'Афины, Греция', pd_athens_desc:'Античность, паромы на острова и первоклассная кухня — популярное летнее направление с частыми прямыми рейсами.',
    pd_rome_name:'Рим, Италия', pd_rome_desc:'Колизей, Ватикан и уличная еда — город, который стоит обойти пешком, всего в паре часов лёта от Белграда.',
    pd_barcelona_name:'Барселона, Испания', pd_barcelona_desc:'Архитектура Гауди, пляж и тапас-бары — любимое сочетание города и моря.',
    pd_budva_name:'Будва, Черногория', pd_budva_desc:'Ближайшее море на машине или автобусе из Сербии — старый город и длинные пляжи.',
    pd_istanbul_name:'Стамбул, Турция', pd_istanbul_desc:'Встреча Европы и Азии, базары и Босфор — доступная поездка в межсезонье.',
    pd_vienna_name:'Вена, Австрия', pd_vienna_desc:'Музеи, кафе и рождественские ярмарки зимой — удобная городская поездка на выходные.',
    pd_thessaloniki_name:'Салоники, Греция', pd_thessaloniki_desc:'Море без необходимости лететь — удобная поездка на машине или автобусе.',
    pd_prague_name:'Прага, Чехия', pd_prague_desc:'Архитектура, пивные и прогулки по старому городу — популярная городская поездка.',
    pd_budapest_name:'Будапешт, Венгрия', pd_budapest_desc:'Купальни, архитектура и короткий перелёт или поездка на машине — удобная городская поездка.',
    cta_right:'Вся поездка.<br>Одна цена.',
    eyebrow_faq:'Вопросы', h2_faq:'Перед бронированием',
    sub_faq:'Ответы на самые частые вопросы о ценах, бронировании и изменениях.',
    faq_q1:'Реальны ли показанные цены?',
    faq_a1:'SKLOPI сейчас находится в разработке. Цены, которые ты видишь в поиске и конструкторе, — иллюстративная оценка, созданная для демонстрации, и не поступают напрямую с сайтов партнёров. Перед бронированием всегда уточняй точную цену и наличие прямо у партнёра (KAYAK, Booking.com, Viator).',
    faq_q2:'Как работает конструктор поездки?',
    faq_a2:'Ты сам выбираешь тип перелёта, категорию отеля, авто и количество активностей, а SKLOPI суммирует примерную цену за весь пакет. Кнопка «Оптимизировать поездку» предлагает изменение, которое может снизить цену при похожем качестве.',
    faq_q3:'Как хранятся мои сохранённые поездки?',
    faq_a3:'Ты создаёшь аккаунт с email и паролем в разделе сохранённых поездок. Твои данные привязаны к аккаунту, а не к этому устройству, поэтому ты можешь получить к ним доступ и с другого телефона или компьютера — просто войди с тем же email и паролем.',
    faq_q4:'Взимает ли SKLOPI плату за бронирование?',
    faq_a4:'Нет. SKLOPI не берёт плату напрямую — нажатие «Забронировать» или «Искать» переносит тебя на сайт партнёра (KAYAK, Booking.com или Viator), где происходит бронирование и оплата.',
    faq_q5:'Есть вопрос, которого здесь нет?',
    faq_a5:'Напиши на <a href="mailto:panpetar405@gmail.com">panpetar405@gmail.com</a> — мы с радостью поможем.',
    whatsapp_aria:'Напиши нам в WhatsApp',
    stat_searches:'поисков', stat_clicks:'кликов по предложениям', stat_last:'последнее направление',
    footer_contact:'Контакты', footer_privacy:'Конфиденциальность', footer_terms:'Условия', footer_cookies:'Cookie', footer_guides:'Гайды',
    foot_note:'SKLOPI — прототип продукта в разработке. Показанные цены иллюстративны (смоделированы для демонстрации), не поступают напрямую от партнёров и не являются реальным предложением или обязательством по цене. · <a href="#" id="cookieSettingsLink">Настройки cookie</a>',
    cookie_text:'<b>Мы используем cookie для аналитики</b> (Google Analytics), чтобы понять, как используется сайт, и улучшить его. Мы не используем их для маркетинга и не передаём за пределы Google. Подробности в <a href="kolacici.html">Политике использования cookie</a>.',
    cookie_decline:'Отклонить', cookie_accept:'Принять',
    aria_close:'Закрыть', label_email:'Email',
    label_alert_threshold:'Сообщить мне, когда общая примерная цена упадёт ниже', btn_set_alert:'Установить оповещение',
    alert_modal_disclaimer:'⚠️ Всё ещё иллюстративная оценка, не реальное предложение партнёра. Мы пришлём письмо с подтверждением — оповещение включится только после клика по ссылке в нём. Отписаться можно в любой момент по ссылке в письме, которое ты получишь.',
    match_trigger:'<span class="ac-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M14.8 9.2l-2 5.6-5.6 2 2-5.6 5.6-2z"/></svg></span><span class="ac-title">Не знаешь куда?</span><span class="ac-sub">Короткий опрос из 3 вопросов — найди 3 направления, которые действительно тебе подходят, а не случайные.</span><span class="match-preview-row"><span class="match-preview-chip">🌊 Море</span><span class="match-preview-chip">🏙️ Город</span><span class="match-preview-chip">🌲 Природа</span><span class="match-preview-chip">🎉 Тусовка</span></span><span class="ac-cta"><span class="ac-cta-label">Найти мне направление</span><span class="ac-arrow">→</span></span>',
    match_modal_title:'Найди свою поездку',
    match_modal_sub:'Три коротких вопроса — мы оцениваем более 60 направлений по совпадению с тобой, сезоном и длительностью поездки, не наугад. Даты и число путешественников останутся как в форме выше.',
    match_step1_title:'С кем ты путешествуешь?',
    match_step2_title:'Что для тебя значит отдых?',
    match_step3_title:'Какой у тебя общий бюджет?',
    match_label_budget:'Общий бюджет (на всех путешественников, необязательно)', placeholder_match_budget:'напр. 400',
    match_modal_btn:'🎯 Найти мне 3 направления',
    match_modal_disclaimer:'⚠️ Иллюстративная оценка цены, объединённая с твоими ответами, — не реальное предложение партнёра.',
    share_modal_title:'Поделиться с друзьями', share_modal_label_link:'Ссылка для отправки',
    share_modal_copy:'📋 Копировать ссылку', share_modal_native:'📤 Поделиться через приложения',
    share_modal_disclaimer:'Любой, кто откроет ссылку, увидит план и сможет ответить (Еду/Возможно/Не смогу) — без создания аккаунта.',
    documents_check_link:'🧳 Проверь документы для поездки',
    documents_modal_title:'Документы для поездки',
    documents_modal_sub:'Паспорт и зелёная карта — всё в одном месте, в пару кликов.',
    docs_tab_passport:'🛂 Паспорт',
    docs_tab_greencard:'🪪 Зелёная карта',
    passport_check_link:'🛂 Проверь, действителен ли твой паспорт для этой поездки',
    passport_modal_sub:'Многие страны требуют, чтобы паспорт оставался действительным ещё некоторое время после возвращения — иначе тебя могут развернуть на границе или при регистрации, даже если сами даты поездки в порядке.',
    passport_modal_title:'Действителен ли твой паспорт для этой поездки?',
    passport_modal_label_expiry:'До какой даты действителен твой паспорт?',
    passport_modal_btn:'Проверить',
    passport_modal_disclaimer:'⚠️ Общие правила по странам, только для ориентира — перед поездкой всегда дополнительно уточняй в посольстве/консульстве или у авиакомпании.',
    green_card_check_link:'🪪 Проверь, нужна ли зелёная карта для этого маршрута',
    green_card_modal_title:'Нужна ли зелёная карта для авто?',
    green_card_modal_sub:'Зелёная карта — это международное подтверждение автостраховки. У Сербии есть соглашения с большинством европейских стран, поэтому карта не нужна, но для некоторых направлений она всё же требуется — и оплачивается отдельно у страховщика, помимо стоимости аренды.',
    green_card_modal_disclaimer:'⚠️ Общее правило для автомобилей, зарегистрированных в Сербии, только для ориентира — перед поездкой всегда уточняй у своего страховщика или АМСС, так как соглашения время от времени меняются.',
    green_card_dest_missing:'Сначала укажи, куда едешь, в поле «Направление» выше, а затем вернись сюда — правило зависит от страны.',
    green_card_scope_note:'Относится к поездке на собственном или арендованном в Сербии автомобиле через границу — не к прокатному авто, полученному на месте назначения (fly & drive).',
    ac_searching:'Ищем…', ac_no_results:'Нет предложений для такого названия.',
    results_back:'Назад', results_back_aria:'Назад на сайт',
    night:'ночь', nights:'ночей', passenger:'путешественник', passengers:'путешественников',
    fuel_estimate:'Топливо (оценка)', tolls_estimate:'Дорожные сборы (оценка)', insurance:'Страховка', esim_internet:'eSIM / интернет',
    btn_search_kayak:'Искать на KAYAK', btn_book_booking:'Забронировать на Booking.com',
    aff_badge:'Партнёрская ссылка', aff_badge_title:'Это партнёрская (спонсируемая) ссылка — если вы забронируете через неё, SKLOPI может получить комиссию от партнёра. Цена для вас не меняется.',
    base_package_note:'Цена базового пакета — добавь страховку или eSIM по желанию.',
    fits_budget:'Вписывается в твой бюджет ', over_budget:'Немного выше бюджета, но самый близкий вариант, который у нас есть.',
    // --- Описания пакетов (pkgDescText / TIER_META.*.desc) ---
    pkg_desc_hotel_better:'отель классом выше', pkg_desc_hotel_cheapest:'самый дешёвый отель', pkg_desc_hotel_verified:'проверенный отель',
    pkg_desc_flight_stopover:'перелёт с пересадкой', pkg_desc_flight_airline:'перелёт выбранной авиакомпанией', pkg_desc_flight_direct:'прямой перелёт',
    pkg_desc_car_spacious:'более просторный авто', pkg_desc_car:'авто', pkg_desc_activities:'активности', pkg_desc_and:'и',
    tier_best_desc:'Лучшее соотношение цены и качества',
    tier_comfort_desc:'Отель получше и остальное — в той же категории, которую ты выбрал(а)',
    tier_budget_desc:'Самая низкая цена в той же категории, которую ты выбрал(а)',
    // --- Что включено (перки по тарифу) ---
    perk_flight_bag_cabin:'только ручная кладь', perk_flight_bag_checked:'багаж 23 кг включён',
    perk_flight_flex:'бесплатное изменение даты', perk_flight_fixed:'без изменения даты',
    perk_hotel_breakfast:'завтрак включён', perk_hotel_no_breakfast:'без завтрака',
    perk_hotel_central:'в центре города', perk_hotel_dist_mid:'около 1,5 км от центра', perk_hotel_dist_far:'около 3 км от центра',
    perk_hotel_free_cancel:'бесплатная отмена', perk_hotel_no_cancel:'невозвратное бронирование',
    perk_car_km_unlimited:'неограниченный пробег', perk_car_km_limited:'ограниченный пробег',
    perk_car_cover_full:'полная страховка без франшизы', perk_car_cover_basic:'базовая страховка с депозитом',
  }
};
function getLang(){
  try {
    const saved = localStorage.getItem('sklopi_lang');
    if (saved === 'en' || saved === 'sr' || saved === 'ru') return saved;
  } catch(e){}
  return 'sr';
}
function t(key){ const lang = getLang(); return (I18N[lang] && I18N[lang][key]) ?? (I18N.sr[key] ?? key); }
// Mali helper za tekst koji nije u I18N objektu (retki hardkodovani stringovi
// van data-i18n / t() sistema) — bira sr/en/ru granu prema trenutnom jeziku.
function L3(sr, en, ru){
  const lang = getLang();
  if (lang === 'ru') return ru;
  if (lang === 'en') return en;
  return sr;
}
function applyStaticI18n(){
  const lang = getLang();
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label'))); });
  const btn = document.getElementById('langSwitchBtn');
  if (btn){
    btn.classList.toggle('is-en', lang === 'en');
    btn.setAttribute('data-lang', lang);
    btn.setAttribute('aria-pressed', lang !== 'sr' ? 'true' : 'false');
  }
  const titleEl = document.querySelector('title');
  if (titleEl) titleEl.textContent = L3('SKLOPI — ceo izlet, jedna cena', 'SKLOPI — one whole trip, one price', 'SKLOPI — вся поездка, одна цена');
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', L3(
    'SKLOPI pronalazi let, hotel, auto i aktivnosti za tvoj sledeći izlet i sabira ih u jednu cenu. Napravi sopstveni izlet ili poređaj gotove pakete po budžetu.',
    'SKLOPI finds flights, hotels, cars and activities for your next trip and adds them into one price. Build your own trip or browse ready packages by budget.',
    'SKLOPI находит перелёт, отель, авто и активности для твоей следующей поездки и суммирует их в одну цену. Составь собственную поездку или выбери готовый пакет по бюджету.'
  ));
}
function setLang(lang){
  localStorage.setItem('sklopi_lang', (lang === 'en' || lang === 'ru') ? lang : 'sr');
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
/* Deterministička "dnevna" rotacija: isti izbor za sve posetioce istog dana
   (na osnovu UTC datuma + salt), promeni se sledeći dan. Koristi isti
   seededRandom/hashSeed par kao i marketFactor iznad — namerno, radi
   doslednosti i da ne uvodimo drugi RNG algoritam u fajl. */
function dailyShuffle(arr, salt){
  const rand = seededRandom(hashSeed(String(salt) + '|' + todayStr()));
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function dailyPick(arr, count, salt){
  return dailyShuffle(arr, salt).slice(0, Math.min(count, arr.length));
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

/* Sezonski množilac po DATUMU POLASKA (ne po današnjem datumu, kao
   marketFactor koji je dnevna fluktuacija). Za destinacije iz
   MATCH_DESTINATIONS koristi njihove već označene najbolje mesece
   (months) i tip (vibes): u sezoni 1.0, morske destinacije u julu/avgustu
   1.22 i u junu/septembru 1.08, mesec do sezone 0.92, van sezone 0.82
   (ne-morske se mešaju 50/50 sa opštom krivom, vidi dole).
   Ostale destinacije dobijaju opštu evropsku krivu. Novogodišnji period
   (20. dec – 3. jan) dodaje 15%. Primenjuje se na let, smeštaj i auto —
   ne na gorivo/putarine/dodatke. NE zove rng(). Prazan/neispravan
   datum → 1 (staro ponašanje). */
const GENERIC_SEASON_BY_MONTH = [0.88,0.86,0.90,0.97,1.00,1.08,1.20,1.22,1.05,0.97,0.88,0.95];
function seasonFactor(destRaw, fromStr){
  const m = Number(String(fromStr || '').slice(5, 7));
  const d = Number(String(fromStr || '').slice(8, 10)) || 1;
  if (!(m >= 1 && m <= 12)) return 1;
  const key = normalizeSr(String(destRaw || '').split(',')[0].trim());
  const tag = (typeof MATCH_DESTINATIONS !== 'undefined')
    ? MATCH_DESTINATIONS.find(x => normalizeSr(x.name) === key) : null;
  let f;
  if (tag){
    const prev = m === 1 ? 12 : m - 1, next = m === 12 ? 1 : m + 1;
    const sea = tag.vibes.includes('sea');
    if (tag.months.includes(m)) f = sea && (m === 7 || m === 8) ? 1.22 : sea && (m === 6 || m === 9) ? 1.08 : 1.0;
    else if (tag.months.includes(prev) || tag.months.includes(next)) f = 0.92;
    else f = 0.82;
    // "months" je najbolja sezona po vremenu/doživljaju, a ne po potražnji:
    // gradovi (i sve što nije morsko) imaju cene leta koje ipak rastu leti
    // i oko praznika. Zato za ne-morske destinacije mešamo tag sa opštom
    // krivom (50/50), a čisto tagovanje važi samo za morske.
    if (!sea) f = 0.5 * f + 0.5 * GENERIC_SEASON_BY_MONTH[m - 1];
  } else {
    f = GENERIC_SEASON_BY_MONTH[m - 1];
  }
  if ((m === 12 && d >= 20) || (m === 1 && d <= 3)) f *= 1.15;
  return Math.round(f * 100) / 100;
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
  if (getLang() === 'ru') return d.toLocaleString('ru-RU', {day:'numeric', month:'long'});
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

  // Podrazumevani datumi su RELATIVNI na današnji dan (polazak za 14 dana,
  // 4 noći) — ranije su u HTML-u bili tvrdo zadati (2026-10-01/05), pa bi
  // posle tog datuma svaka nova pretraga tražila ručni izbor datuma.
  // Polja su skrivena i pri svakom učitavanju kreću iz HTML default-a, pa
  // ovde uvek postavljamo svež default (izbor korisnika se čuva tek posle
  // učitavanja — kalendar i učitavanje sačuvanog izleta ih posle menjaju).
  (function setRelativeDefaultDates(){
    const isoLocal = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 18);
    hiddenFrom.value = isoLocal(start);
    hiddenTo.value = isoLocal(end);
  })();

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
  // Pun, čitljiv opis datuma za screen reader (aria-label na svakom danu) —
  // npr. "17. oktobar 2026, subota".
  function fmtFullLabel(d){
    const s = d.toLocaleString('sr-Latn', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
    return s.charAt(0).toUpperCase() + s.slice(1);
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
          console.warn('[sklopi] geokodiranje odredišta nije uspelo:', err.message);
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
      } catch(err){ console.warn('[sklopi] prognoza nije uspela:', err.message); return {data:{}, networkError:true}; }
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
        console.warn('[sklopi] istorijski podaci nisu uspeli:', err.message);
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
    setStatus(L3('Tražim vreme za „' + city + '“…', 'Looking up weather for “' + city + '”…', 'Ищем погоду для «' + city + '»…'));

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
    displayBtn.classList.remove('is-empty');
    calRangeLabel.innerHTML = fmtShort(selStart) + ' – ' + fmtShort(selEnd) + ' <b>· ' + n + ' ' + nightsWord(n) + '</b>';
  }

  function commit(){
    hiddenFrom.value = toISODate(selStart);
    hiddenTo.value = toISODate(selEnd);
    hiddenFrom.dispatchEvent(new Event('change', {bubbles:true}));
    hiddenTo.dispatchEvent(new Event('change', {bubbles:true}));
    updateDisplay();
  }

  function buildMonthGrid(year, month, monthLabelText){
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // ponedeljak = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const head = '<div class="cal-grid-head" role="row">' +
      DAY_NAMES.map(d => '<span role="columnheader" aria-hidden="true">' + d + '</span>').join('') +
      '</div>';

    // Skupi sve ćelije (prazan razmak + dani), pa ih iseci na nedelje od po 7
    // radi role="row" (potrebno za role="grid" navigaciju strelicama / SR).
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push('<span class="cal-day is-empty" role="gridcell" aria-hidden="true"></span>');
    for (let day = 1; day <= daysInMonth; day++){
      const d = new Date(year, month, day);
      const iso = toISODate(d);
      const isDisabled = d < today;
      const isToday = sameDay(d, today);
      const isSelected = sameDay(d, selStart) || sameDay(d, selEnd) || (selStart && selEnd && d > selStart && d < selEnd);
      const classes = ['cal-day'];
      if (isDisabled) classes.push('is-disabled');
      if (sameDay(d, selStart)) classes.push('range-start');
      if (sameDay(d, selEnd)) classes.push('range-end');
      if (selStart && selEnd && d > selStart && d < selEnd) classes.push('range-mid');
      if (isToday) classes.push('is-today');
      const label = fmtFullLabel(d) + (isToday ? ', ' + t('aria_today') : '');
      if (isDisabled){
        // Prošli datum — nije klikabilan, pa ostaje neinteraktivan span,
        // ali i dalje sa aria-label/aria-disabled radi screen readera.
        cells.push('<span class="' + classes.join(' ') + '" role="gridcell" aria-disabled="true" aria-label="' + escapeHtml(label) + '">' + day + '</span>');
      } else {
        cells.push('<button type="button" class="' + classes.join(' ') + '" role="gridcell" data-date="' + iso + '" tabindex="-1" aria-selected="' + (isSelected ? 'true' : 'false') + '"' + (isToday ? ' aria-current="date"' : '') + ' aria-label="' + escapeHtml(label) + '">' + day + '</button>');
      }
    }
    while (cells.length % 7 !== 0) cells.push('<span class="cal-day is-empty" role="gridcell" aria-hidden="true"></span>');

    let body = '';
    for (let i = 0; i < cells.length; i += 7){
      body += '<div class="cal-grid-row" role="row">' + cells.slice(i, i + 7).join('') + '</div>';
    }
    body = '<div class="cal-grid-body">' + body + '</div>';

    return '<div class="cal-grid" role="grid" aria-label="' + escapeHtml(monthLabelText) + '">' + head + body + '</div>';
  }

  // Datum koji trenutno "nosi" roving tabindex/fokus u gridu — prati se
  // odvojeno od selStart/selEnd jer se fokus tokom navigacije strelicama
  // može naći na danu koji uopšte nije (još) selektovan.
  let activeDate = null;

  function selectDate(d){
    if (!selStart || (selStart && selEnd)){
      selStart = d; selEnd = null;
    } else if (d < selStart){
      selStart = d;
    } else {
      selEnd = d;
    }
    activeDate = d;
    render();
    if (selStart && selEnd) updateDisplay();
    focusDayButton(d);
  }

  // Fokusira dugme za dati datum AKO je trenutno vidljivo (na mobilnom je
  // drugi mesec u dvomesečnom prikazu sakriven preko CSS-a — display:none
  // elementi se ne mogu fokusirati). Vraća true/false radi fallback logike.
  function focusDayButton(d){
    const btn = calGrids.querySelector('.cal-day[data-date="' + toISODate(d) + '"]');
    if (btn && btn.offsetParent !== null){
      calGrids.querySelectorAll('.cal-day[data-date]').forEach(el => el.setAttribute('tabindex', '-1'));
      btn.setAttribute('tabindex', '0');
      btn.focus();
      return true;
    }
    return false;
  }

  // Posle svakog render()-a DOM se potpuno zameni (innerHTML), pa roving
  // tabindex treba ponovo postaviti na "aktivni" dan (fokus/selekciju),
  // a na sve ostale -1 — inače bi Tab uvek kretao od prvog dana u mesecu.
  function syncRovingTabindex(){
    const pref = activeDate || selStart || today;
    let target = calGrids.querySelector('.cal-day[data-date="' + toISODate(pref) + '"]:not(.is-disabled)');
    if (!target) target = calGrids.querySelector('.cal-day[data-date]:not(.is-disabled)');
    calGrids.querySelectorAll('.cal-day[data-date]').forEach(el => el.setAttribute('tabindex', '-1'));
    if (target) target.setAttribute('tabindex', '0');
  }

  function render(){
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    const monthLabel = (y, m) => {
      const name = new Date(y, m, 1).toLocaleString('sr-Latn', {month:'long'});
      return name.charAt(0).toUpperCase() + name.slice(1) + ' ' + y;
    };
    const label1 = monthLabel(viewYear, viewMonth), label2 = monthLabel(nextY, nextM);
    calMonths.innerHTML = '<span>' + label1 + '</span><span>' + label2 + '</span>';
    calGrids.innerHTML = buildMonthGrid(viewYear, viewMonth, label1) + buildMonthGrid(nextY, nextM, label2);
    calGrids.querySelectorAll('.cal-day:not(.is-empty):not(.is-disabled)').forEach(el => {
      el.addEventListener('click', () => selectDate(parseISODate(el.dataset.date)));
    });
    syncRovingTabindex();
    paintWeather();
    // Sadržaj (broj redova u mreži, prognoza) menja visinu kartice — ako je
    // otvorena na mobilnom, osveži poziciju da i dalje ostane tačno iznad polja.
    if (calCard.classList.contains('open')) positionCalMobile();
  }

  // ---- Pozicioniranje kartice na mobilnom ----
  // Kartica je sad, dok je otvorena, prebačena direktno u <body> (van
  // .ticket-a, van .hero-a) sa punim tamnim overlay-em preko celog ekrana —
  // pravi fullscreen "bottom sheet" modal, a ne više mali dropdown zalepljen
  // uz konkretno polje. Zato više NE računamo visinu prema poziciji polja
  // (to je ranije nepotrebno sažimalo karticu i sekalo mesec/legendu/dugme
  // "Gotovo" van vidljivog dela) — prepuštamo visinu CSS pravilu iz media
  // query-ja (top odmah ispod topbar-a, do skoro dna ekrana), koje već daje
  // maksimalan mogući prostor da ceo mesec stane bez skrolovanja. Ovde samo
  // brišemo eventualne inline stilove koje je ranija verzija postavljala.
  function positionCalMobile(){
    if (!isMobileCal()) return;
    calCard.style.left = '';
    calCard.style.right = '';
    calCard.style.top = '';
    calCard.style.bottom = '';
    calCard.style.maxHeight = '';
  }

  // ---- Navigacija tastaturom po mreži datuma (WAI-ARIA APG "grid" obrazac) ----
  // strelice = dan/nedelja, Home/End = početak/kraj nedelje, PageUp/PageDown =
  // prethodni/sledeći mesec (sa Shift = godina), Enter/Space = izbor datuma.
  const isMobileCal = () => window.matchMedia('(max-width:760px)').matches;

  function isDateInView(d){
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) return true;
    if (isMobileCal()) return false; // drugi mesec je sakriven na mobilnom
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    return d.getFullYear() === nextY && d.getMonth() === nextM;
  }

  function goToDate(d){
    if (d < today) d = new Date(today); // ne dozvoli fokus na onemogućen (prošli) dan
    activeDate = d;
    if (!isDateInView(d)){
      viewYear = d.getFullYear();
      viewMonth = d.getMonth();
      render();
    }
    if (!focusDayButton(d)){
      const fallback = calGrids.querySelector('.cal-day[data-date]:not(.is-disabled)');
      if (fallback){ fallback.setAttribute('tabindex', '0'); fallback.focus(); }
    }
  }

  calGrids.addEventListener('keydown', (e) => {
    const cellBtn = e.target.closest('.cal-day[data-date]');
    if (!cellBtn) return;
    const current = parseISODate(cellBtn.dataset.date);
    let next = null;
    switch (e.key){
      case 'ArrowRight': next = new Date(current); next.setDate(next.getDate() + 1); break;
      case 'ArrowLeft':  next = new Date(current); next.setDate(next.getDate() - 1); break;
      case 'ArrowDown':  next = new Date(current); next.setDate(next.getDate() + 7); break;
      case 'ArrowUp':    next = new Date(current); next.setDate(next.getDate() - 7); break;
      case 'Home': { const dow = (current.getDay() + 6) % 7; next = new Date(current); next.setDate(next.getDate() - dow); break; }
      case 'End':  { const dow = (current.getDay() + 6) % 7; next = new Date(current); next.setDate(next.getDate() + (6 - dow)); break; }
      case 'PageUp':
        next = new Date(current);
        if (e.shiftKey) next.setFullYear(next.getFullYear() - 1); else next.setMonth(next.getMonth() - 1);
        break;
      case 'PageDown':
        next = new Date(current);
        if (e.shiftKey) next.setFullYear(next.getFullYear() + 1); else next.setMonth(next.getMonth() + 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        selectDate(current);
        return;
      default:
        return;
    }
    e.preventDefault();
    goToDate(next);
  });

  let calScrollY = 0;
  let _calScrollLocked = false;
  // Isti uzrok i isto rešenje kao guardOverlayOpen (vidi komentar na vrhu
  // fajla): menjanje body position-a u 'fixed' USRED obrade dodira je
  // drugi (do sada nepopravljeni) razlog zašto je na mobilnom trebalo dva
  // tapa za SVAKU narednu radnju — izbor datuma, X za zatvaranje, Nastavi...
  // Logičko stanje (_calScrollLocked) se ažurira ODMAH da ostatak koda zna
  // je li "zaključano", ali sama promena na <body> se odlaže za sledeći
  // tick, da ne ometa isporuku klika koji je zaključavanje i pokrenuo.
  function lockPageScroll(){
    if (_calScrollLocked) return;
    _calScrollLocked = true;
    calScrollY = window.scrollY;
    setTimeout(() => {
      if (!_calScrollLocked) return; // otključano pre nego što je ovo stiglo
      document.body.style.position = 'fixed';
      document.body.style.top = '-' + calScrollY + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }, 0);
  }
  function unlockPageScroll(){
    _calScrollLocked = false;
    setTimeout(() => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, calScrollY);
    }, 0);
  }

  // .ticket ima backdrop-filter (zbog blur efekta), a to po CSS spec-u
  // pravi NOV containing block za position:fixed potomke — position:fixed
  // se onda ne računa od viewport-a nego od ivice .ticket-a. Zato je kalendar
  // na mobilnom "iskakao" na pogrešno mesto (oko sredine forme, prekrivajući
  // polje za destinaciju) umesto da se otvori tačno iznad polja "Od — Do",
  // sa punim tamnim overlay-em preko celog ekrana. Rešenje: dok je kartica
  // otvorena na mobilnom, privremeno je (i njen backdrop) prebacujemo direktno
  // u <body> — van .ticket-a — gde position:fixed opet radi normalno, prema
  // stvarnom viewport-u. Vraćamo je na originalno mesto pri zatvaranju, da
  // desktop raspored (position:absolute vezan za stub) ostane netaknut.
  let calHomeParent = null, calHomeNext = null;
  let calBackdropHomeParent = null, calBackdropHomeNext = null;
  function detachCalForMobile(){
    if (calCard.parentElement !== document.body){
      calHomeParent = calCard.parentElement;
      calHomeNext = calCard.nextSibling;
      document.body.appendChild(calCard);
    }
    if (calBackdrop && calBackdrop.parentElement !== document.body){
      calBackdropHomeParent = calBackdrop.parentElement;
      calBackdropHomeNext = calBackdrop.nextSibling;
      document.body.appendChild(calBackdrop);
    }
  }
  function reattachCal(){
    if (calHomeParent){
      if (calHomeNext) calHomeParent.insertBefore(calCard, calHomeNext);
      else calHomeParent.appendChild(calCard);
      calHomeParent = null; calHomeNext = null;
    }
    if (calBackdropHomeParent){
      if (calBackdropHomeNext) calBackdropHomeParent.insertBefore(calBackdrop, calBackdropHomeNext);
      else calBackdropHomeParent.appendChild(calBackdrop);
      calBackdropHomeParent = null; calBackdropHomeNext = null;
    }
  }

  function openCal(){
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    activeDate = (selStart && selStart >= today) ? selStart : today;
    render();
    calCard.classList.add('open');
    if (calBackdrop) calBackdrop.classList.add('open');
    displayBtn.setAttribute('aria-expanded', 'true');
    if (isMobileCal()){
      detachCalForMobile(); lockPageScroll(); positionCalMobile();
      guardOverlayOpen('cal', () => closeCal(true));
    }
    // fokus tastature/screen readera ide direktno na selektovani (ili
    // današnji) dan — bez ovoga dijalog se otvara vizuelno, ali korisnik
    // koji ne koristi miša nema signal da se nešto promenilo.
    focusDayButton(activeDate);
  }
  // "Meki" zahtev za zatvaranje (klik na dugme, Escape...) — ako je
  // kartica na mobilnom gurnula unos u historiju, prosleđuje se na
  // "Nazad" da postoji jedan jedini put kojim se zatvara.
  function requestCloseCal(){
    if (!guardOverlayRequestClose('cal')) closeCal(true);
  }
  function closeCal(shouldCommit){
    const wasOpen = calCard.classList.contains('open');
    calCard.classList.remove('open');
    if (calBackdrop) calBackdrop.classList.remove('open');
    displayBtn.setAttribute('aria-expanded', 'false');
    if (_calScrollLocked) unlockPageScroll();
    reattachCal();
    if (shouldCommit && selStart && selEnd){
      commit();
    } else if (!selStart || !selEnd){
      selStart = parseISODate(hiddenFrom.value);
      selEnd = parseISODate(hiddenTo.value);
    }
    // fokus se vraća na dugme koje je otvorilo dijalog — inače se gubi
    // (npr. posle Escape) i tastaturni/SR korisnik "ispadne" iz konteksta.
    if (wasOpen && document.activeElement && calCard.contains(document.activeElement)){
      displayBtn.focus();
    }
  }

  displayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (calCard.classList.contains('open')) requestCloseCal();
    else openCal();
  });
  applyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (selStart && selEnd) requestCloseCal();
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
  // Focus trap — pošto je calCard role="dialog" aria-modal="true", Tab ne
  // sme da izađe u pozadinski sadržaj dok je kalendar otvoren.
  calCard.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = Array.from(calCard.querySelectorAll('button:not([tabindex="-1"]), [tabindex="0"]'))
      .filter(el => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first){
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last){
      e.preventDefault(); first.focus();
    }
  });

  document.addEventListener('click', () => {
    if (calCard.classList.contains('open')) requestCloseCal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && calCard.classList.contains('open')) requestCloseCal();
  });
  window.addEventListener('resize', () => {
    if (calCard.classList.contains('open')) positionCalMobile();
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

  // Polje "Od — Do" na startu prikazuje crtice (placeholder stanje), a ne
  // unapred izračunat opseg/broj noći iz skrivenih polja — updateDisplay()
  // se zove tek kad korisnik stvarno potvrdi datume (Gotovo / brzi izbor).
})();

/* ==========================================================
   BROJ PUTNIKA — kartica po uzoru na kalendar (umesto native <select>,
   koji je ograničavao izbor na najviše 4 osobe i čiji padajući meni
   nije moguće stilizovati). Vrednost i dalje živi u #adults (sad
   <input type="hidden">, isti obrazac kao #dateFrom/#dateTo), pa sav
   ostatak koda koji čita/piše .value nastavlja da radi bez izmena.
   ========================================================== */
(function(){
  const displayBtn = document.getElementById('paxDisplayBtn');
  const displayText = document.getElementById('paxDisplayText');
  const hiddenField = document.getElementById('adults');
  const paxCard = document.getElementById('paxCard');
  const paxBackdrop = document.getElementById('paxBackdrop');
  const paxList = document.getElementById('paxList');
  const applyBtn = document.getElementById('paxApply');
  if (!displayBtn || !paxCard || !hiddenField || !paxList) return;

  const MAX_ADULTS = 30;

  // Gramatički ispravna množina za "odrasla osoba/odrasla/odraslih" —
  // pravilo isto kao za sve brojeve u srpskom (1, 2-4, 5+, sa izuzetkom
  // 11-14 koji uvek idu na "odraslih" bez obzira na poslednju cifru).
  function paxOptionLabel(n){
    if (getLang() === 'en') return n + ' ' + (n === 1 ? 'adult' : 'adults');
    if (getLang() === 'ru') return n + ' ' + (n === 1 ? 'взрослый' : 'взрослых');
    const mod10 = n % 10, mod100 = n % 100;
    let word;
    if (mod100 >= 11 && mod100 <= 14) word = 'odraslih';
    else if (mod10 === 1) word = 'odrasla osoba';
    else if (mod10 >= 2 && mod10 <= 4) word = 'odrasla';
    else word = 'odraslih';
    return n + ' ' + word;
  }

  function buildOptions(){
    const keepVal = hiddenField.value;
    paxList.innerHTML = '';
    for (let n = 1; n <= MAX_ADULTS; n++){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pax-option';
      btn.setAttribute('role', 'option');
      btn.dataset.value = String(n);
      btn.textContent = paxOptionLabel(n);
      const isSel = String(n) === keepVal;
      btn.classList.toggle('is-selected', isSel);
      btn.setAttribute('aria-selected', isSel ? 'true' : 'false');
      btn.addEventListener('click', (e) => { e.stopPropagation(); selectPax(n); });
      paxList.appendChild(btn);
    }
  }

  function updateDisplay(){
    const val = hiddenField.value;
    if (!val){
      displayText.textContent = t('placeholder_passengers');
      displayBtn.classList.add('is-empty');
    } else {
      displayText.textContent = paxOptionLabel(Number(val));
      displayBtn.classList.remove('is-empty');
    }
  }
  // Izloženo van IIFE-a da loadSavedTrip() može da osveži prikaz posle
  // direktnog upisa u #adults.value (isti obrazac kao za ostatak forme).
  window.syncPaxDisplay = updateDisplay;

  function selectPax(n){
    hiddenField.value = String(n);
    paxList.querySelectorAll('.pax-option').forEach(b => {
      const isSel = b.dataset.value === String(n);
      b.classList.toggle('is-selected', isSel);
      b.setAttribute('aria-selected', isSel ? 'true' : 'false');
    });
    updateDisplay();
    hiddenField.dispatchEvent(new Event('input', {bubbles:true}));
    hiddenField.dispatchEvent(new Event('change', {bubbles:true}));
    // Sam klik na broj putnika sad odmah čuva izbor i zatvara karticu — dugme
    // "Gotovo" ostaje kao rezerva, ali izbor više ne zavisi od toga da se do
    // njega dogura (na dužim listama, npr. blizu 30, ranije je bilo van dohvata).
    requestClosePax();
  }

  const isMobilePax = () => window.matchMedia('(max-width:760px)').matches;

  let paxScrollY = 0;
  let _paxScrollLocked = false;
  // Isti razlog/rešenje kao kod kalendara — vidi komentar uz lockPageScroll
  // tamo (odlaganje body position promene za jedan tick, da ne "zaglavi"
  // isporuku sledećeg klika na mobilnom).
  function lockPageScroll(){
    if (_paxScrollLocked) return;
    _paxScrollLocked = true;
    paxScrollY = window.scrollY;
    setTimeout(() => {
      if (!_paxScrollLocked) return;
      document.body.style.position = 'fixed';
      document.body.style.top = '-' + paxScrollY + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }, 0);
  }
  function unlockPageScroll(){
    _paxScrollLocked = false;
    setTimeout(() => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, paxScrollY);
    }, 0);
  }

  // Isti razlog kao kod positionCalMobile gore — kartica je sad fullscreen
  // modal u <body>, pa joj prepuštamo visinu CSS media-query pravilu umesto
  // da je ručno sažimamo prema poziciji polja.
  function positionPaxMobile(){
    if (!isMobilePax()) return;
    paxCard.style.left = '';
    paxCard.style.right = '';
    paxCard.style.top = '';
    paxCard.style.bottom = '';
    paxCard.style.maxHeight = '';
  }

  // Isti razlog i isto rešenje kao kod kalendara (vidi detachCalForMobile
  // gore) — .ticket ima backdrop-filter, što pravi containing block za
  // position:fixed potomke, pa se kartica bez ovoga otvara na pogrešnom
  // mestu na mobilnom umesto tačno iznad polja "Putnika".
  let paxHomeParent = null, paxHomeNext = null;
  let paxBackdropHomeParent = null, paxBackdropHomeNext = null;
  function detachPaxForMobile(){
    if (paxCard.parentElement !== document.body){
      paxHomeParent = paxCard.parentElement;
      paxHomeNext = paxCard.nextSibling;
      document.body.appendChild(paxCard);
    }
    if (paxBackdrop && paxBackdrop.parentElement !== document.body){
      paxBackdropHomeParent = paxBackdrop.parentElement;
      paxBackdropHomeNext = paxBackdrop.nextSibling;
      document.body.appendChild(paxBackdrop);
    }
  }
  function reattachPax(){
    if (paxHomeParent){
      if (paxHomeNext) paxHomeParent.insertBefore(paxCard, paxHomeNext);
      else paxHomeParent.appendChild(paxCard);
      paxHomeParent = null; paxHomeNext = null;
    }
    if (paxBackdropHomeParent){
      if (paxBackdropHomeNext) paxBackdropHomeParent.insertBefore(paxBackdrop, paxBackdropHomeNext);
      else paxBackdropHomeParent.appendChild(paxBackdrop);
      paxBackdropHomeParent = null; paxBackdropHomeNext = null;
    }
  }

  function openPax(){
    paxCard.classList.add('open');
    if (paxBackdrop) paxBackdrop.classList.add('open');
    displayBtn.setAttribute('aria-expanded', 'true');
    if (isMobilePax()){
      detachPaxForMobile(); lockPageScroll(); positionPaxMobile();
      guardOverlayOpen('pax', closePax);
    }
    const focusTarget = paxList.querySelector('.pax-option.is-selected') || paxList.querySelector('.pax-option');
    if (focusTarget) focusTarget.focus();
  }
  function requestClosePax(){
    if (!guardOverlayRequestClose('pax')) closePax();
  }
  function closePax(){
    const wasOpen = paxCard.classList.contains('open');
    paxCard.classList.remove('open');
    if (paxBackdrop) paxBackdrop.classList.remove('open');
    displayBtn.setAttribute('aria-expanded', 'false');
    if (isMobilePax() && _paxScrollLocked) unlockPageScroll();
    reattachPax();
    if (wasOpen && document.activeElement && paxCard.contains(document.activeElement)){
      displayBtn.focus();
    }
  }

  displayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (paxCard.classList.contains('open')) requestClosePax();
    else openPax();
  });
  if (applyBtn) applyBtn.addEventListener('click', (e) => { e.stopPropagation(); requestClosePax(); });
  paxCard.addEventListener('click', (e) => e.stopPropagation());
  // Focus trap dok je "dijalog" otvoren — isti obrazac kao kod kalendara.
  paxCard.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = Array.from(paxCard.querySelectorAll('button')).filter(el => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  });
  document.addEventListener('click', () => {
    if (paxCard.classList.contains('open')) requestClosePax();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && paxCard.classList.contains('open')) requestClosePax();
  });
  window.addEventListener('resize', () => {
    if (paxCard.classList.contains('open')) positionPaxMobile();
  });

  buildOptions();
  updateDisplay();

  // Ako se jezik promeni, prevedi i listu i trenutni prikaz.
  const _prevOnLangChangePax = window.onLangChange;
  window.onLangChange = function(lang){
    if (typeof _prevOnLangChangePax === 'function') _prevOnLangChangePax(lang);
    buildOptions();
    updateDisplay();
  };
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
  if (getLang() === 'en'){
    return isCoastal
      ? 'History, great food, the sea and unforgettable experiences — now easier than ever to plan it all.'
      : 'History, great food and unforgettable experiences — now easier than ever to plan it all.';
  }
  if (getLang() === 'ru'){
    return isCoastal
      ? 'История, отличная еда, море и незабываемые впечатления — теперь спланировать всё это проще, чем когда-либо.'
      : 'История, отличная еда и незабываемые впечатления — теперь спланировать всё это проще, чем когда-либо.';
  }
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
   dok SKLOPI destinaciju vodi kao grad ("Atina"). Mapiramo preko iste liste
   POPULAR_DESTINATIONS koja se već koristi za predloge gradova — svaki unos
   tamo ima "extra" polje sa nazivom države na srpskom, koje ovde prevodimo
   u Airalo-ov URL slug (engleski naziv države, malim slovima, sa crticama).
   Status ovog mapiranja: vidi STATUS PRE PRODUKCIJE blok ispod. ---- */
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
   IATA KODOVI za deep link ka KAYAK-u. Ključ = normalizeSr(grad).
   Uredničko znanje, namerno samo za aerodrome u kojima smo sigurni;
   za sve ostalo iataFor() vraća null i link pada na stari
   "anywhere-<grad>" oblik (ne nagađamo kod). Gradovi bez sopstvenog
   aerodroma se ovde NE mapiraju — pre pretrage prolaze kroz
   realDepartureAirportFor/realArrivalAirportFor (Bar → Tivat, itd.),
   isto kao i tekst na kartici, pa link i kartica pominju isti aerodrom.
========================================================== */
const AIRPORT_IATA = {
  'beograd':'BEG','nis':'INI','podgorica':'TGD','tivat':'TIV','zagreb':'ZAG','split':'SPU','dubrovnik':'DBV',
  'zadar':'ZAD','pula':'PUY','sarajevo':'SJJ','mostar':'OMO','skoplje':'SKP','ohrid':'OHD','pristina':'PRN',
  'ljubljana':'LJU','tirana':'TIA','budimpesta':'BUD','temisvar':'TSR','bukurest':'OTP',
  'sofija':'SOF','varna':'VAR','solun':'SKG','atina':'ATH','krf':'CFU','santorini':'JTR','mikonos':'JMK',
  'rodos':'RHO','krit':'HER','iraklion':'HER','rim':'FCO','milano':'MXP','venecija':'VCE','napulj':'NAP',
  'barselona':'BCN','madrid':'MAD','malaga':'AGP','ibica':'IBZ','lisabon':'LIS','porto':'OPO','pariz':'CDG',
  'nica':'NCE','london':'LON','amsterdam':'AMS','berlin':'BER','minhen':'MUC','frankfurt':'FRA','cirih':'ZRH',
  'bec':'VIE','prag':'PRG','bratislava':'BTS','varsava':'WAW','krakov':'KRK','istanbul':'IST','antalija':'AYT',
  'bodrum':'BJV','tel aviv':'TLV','dubai':'DXB','kairo':'CAI','marakes':'RAK','larnaka':'LCA','valeta':'MLA',
  'majorka':'PMI','kopenhagen':'CPH','stokholm':'ARN','oslo':'OSL','helsinki':'HEL','dablin':'DUB',
  'brisel':'BRU','bazel':'BSL','zeneva':'GVA','njujork':'NYC','bangkok':'BKK','tokio':'TYO'
};
function iataFor(airportNameRaw){
  const norm = normalizeSr(String(airportNameRaw || '').split(',')[0].trim());
  return AIRPORT_IATA[norm] || null;
}

/* ---- Cena leta zavisi od RUTE (polazište → destinacija), ne samo od
   nasumične osnove. Koordinate aerodroma (približne, dovoljne za
   procenu udaljenosti) za IATA kodove iz AIRPORT_IATA. Bez koordinata
   za bilo koji kraj rute, flightRouteMult() vraća 1 (staro ponašanje). ---- */
const AIRPORT_COORDS = {
  BEG:[44.82,20.29], INI:[43.34,21.85], TGD:[42.36,19.25], TIV:[42.40,18.72], ZAG:[45.74,16.07], SPU:[43.54,16.30],
  DBV:[42.56,18.27], ZAD:[44.11,15.35], PUY:[44.89,13.92], SJJ:[43.82,18.33], OMO:[43.29,17.85], SKP:[41.96,21.62],
  OHD:[41.18,20.74], PRN:[42.36,21.03], LJU:[46.22,14.46], TIA:[41.41,19.72], BUD:[47.44,19.26], TSR:[45.81,21.34],
  OTP:[44.57,26.09], SOF:[42.69,23.41], VAR:[43.23,27.83], SKG:[40.52,22.97], ATH:[37.94,23.94], CFU:[39.60,19.91],
  JTR:[36.40,25.48], JMK:[37.44,25.35], RHO:[36.41,28.09], HER:[35.34,25.18], FCO:[41.80,12.25], MXP:[45.63,8.72],
  VCE:[45.51,12.35], NAP:[40.89,14.29], BCN:[41.30,2.08], MAD:[40.47,-3.56], AGP:[36.67,-4.50], IBZ:[38.87,1.37],
  LIS:[38.77,-9.13], OPO:[41.24,-8.68], CDG:[49.01,2.55], NCE:[43.66,7.22], LON:[51.47,-0.45], AMS:[52.31,4.76],
  BER:[52.36,13.50], MUC:[48.35,11.79], FRA:[50.03,8.57], ZRH:[47.46,8.55], VIE:[48.11,16.57], PRG:[50.10,14.26],
  BTS:[48.17,17.21], WAW:[52.17,20.97], KRK:[50.08,19.78], IST:[41.26,28.74], AYT:[36.90,30.80], BJV:[37.25,27.66],
  TLV:[32.01,34.89], DXB:[25.25,55.36], CAI:[30.12,31.41], RAK:[31.61,-8.04], LCA:[34.88,33.63], MLA:[35.86,14.48],
  PMI:[39.55,2.74], CPH:[55.62,12.65], ARN:[59.65,17.93], OSL:[60.19,11.10], HEL:[60.32,24.96], DUB:[53.42,-6.27],
  BRU:[50.90,4.48], BSL:[47.59,7.53], GVA:[46.24,6.11], NYC:[40.64,-73.78], BKK:[13.69,100.75], TYO:[35.55,139.78]
};
function haversineKm(a, b){
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat/2)**2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// Množilac cene leta za konkretnu rutu. 1500 km = referentna (množilac 1);
// kraće rute jeftinije, dalje skuplje (ograničeno 0.6–4). Polazište bez
// sopstvenog aerodroma računa se od NAJBLIŽEG pravog (Novi Sad → Beograd),
// isto kao tekst na kartici. Mala mreža linija (Niš) daje +12% —
// ista okolnost na koju flightSubText već upozorava korisnika.
// NE zove rng() — ne sme da pomeri niz nasumičnih vrednosti.
function flightRouteMult(originRaw, destRaw){
  const o = iataFor(realDepartureAirportFor(originRaw));
  const d = iataFor(realArrivalAirportFor(destRaw));
  if (!o || !d || !AIRPORT_COORDS[o] || !AIRPORT_COORDS[d]) return 1;
  const km = o === d ? 0 : haversineKm(AIRPORT_COORDS[o], AIRPORT_COORDS[d]);
  let m = Math.min(4, Math.max(0.6, 0.5 + 0.5 * (km / 1500)));
  if (isLimitedNetworkOrigin(originRaw)) m *= 1.12;
  return m;
}

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
const AFF_IDS = window.SKLOPI_AFF_IDS || {};
function affId(kind){ return AFF_IDS[PARTNERS[kind].provider] || 'SKLOPI'; }

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
      const stars = [3,4,5].includes(ctx.hotelStars) ? `&nflt=class%3D${ctx.hotelStars}` : '';
      const order = ctx.prioritizeRating ? '&order=review_score_and_price'
                  : ctx.prioritizeLocation ? '&order=distance_from_search' : '';
      return `https://www.booking.com/searchresults.html?ss=${dest}&checkin=${ctx.from}&checkout=${ctx.to}&group_adults=${ctx.adults}&no_rooms=${rooms}${stars}${order}&aid=${affId('hotel')}`;
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
  'novi sad': {nearest:'Beograd', note:'Novi Sad nema svoj aerodrom — najbliži je Beograd (oko 1h vožnje).'},
  'subotica': {nearest:'Budimpešta', note:'Subotica nema svoj aerodrom — najbliži je Budimpešta (oko 2h30 vožnje), bliže nego Beograd.'},
  'kragujevac': {nearest:'Beograd', note:'Kragujevac nema svoj aerodrom — najbliži je Beograd (oko 1h vožnje).'},
  'kraljevo': {nearest:'Niš', note:'Kraljevo nema svoj aerodrom — najbliži je Niš (oko 1h vožnje), Beograd je alternativa za neke pravce.'},
  'novi pazar': {nearest:'Beograd', note:'Novi Pazar nema svoj aerodrom — najbliži veći izbor letova je Beograd, a Podgorica je bliža za neke pravce.'},
  'sabac': {nearest:'Beograd', note:'Šabac nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).'},
  'zrenjanin': {nearest:'Beograd', note:'Zrenjanin nema svoj aerodrom — najbliži je Beograd (oko 1h vožnje).'},
  'pancevo': {nearest:'Beograd', note:'Pančevo nema svoj aerodrom — najbliži je Beograd (oko 30 min vožnje).'},
  'cacak': {nearest:'Beograd', note:'Čačak nema svoj aerodrom — najbliži je Beograd (oko 2h vožnje).'},
  'krusevac': {nearest:'Niš', note:'Kruševac nema svoj aerodrom — najbliži je Niš (oko 1h vožnje).'},
  'leskovac': {nearest:'Niš', note:'Leskovac nema svoj aerodrom — najbliži je Niš (oko 40 min vožnje).'},
  'vranje': {nearest:'Niš', note:'Vranje nema svoj aerodrom — najbliži je Niš (oko 1h vožnje).'},
  'uzice': {nearest:'Beograd', note:'Užice nema svoj aerodrom — najbliži je Beograd (oko 3h vožnje).'},
  'valjevo': {nearest:'Beograd', note:'Valjevo nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).'},
  'smederevo': {nearest:'Beograd', note:'Smederevo nema svoj aerodrom — najbliži je Beograd (oko 45 min vožnje).'},
  'sombor': {nearest:'Beograd', note:'Sombor nema svoj aerodrom — najbliži je Beograd (oko 2h vožnje).'},
  'zajecar': {nearest:'Niš', note:'Zaječar nema svoj aerodrom — najbliži je Niš (oko 1h30 vožnje).'},
  'pirot': {nearest:'Niš', note:'Pirot nema svoj aerodrom — najbliži je Niš (oko 1h vožnje).'},
  'loznica': {nearest:'Beograd', note:'Loznica nema svoj aerodrom — najbliži je Beograd (oko 2h vožnje).'},
  'pozarevac': {nearest:'Beograd', note:'Požarevac nema svoj aerodrom — najbliži je Beograd (oko 1h vožnje).'},
  'sremska mitrovica': {nearest:'Beograd', note:'Sremska Mitrovica nema svoj aerodrom — najbliži je Beograd (oko 1h vožnje).'},
  'vrsac': {nearest:'Beograd', note:'Vršac nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).'},
  'kikinda': {nearest:'Beograd', note:'Kikinda nema svoj aerodrom — najbliži je Beograd (oko 2h vožnje).'},
  'jagodina': {nearest:'Niš', note:'Jagodina nema svoj aerodrom — najbliži je Niš (oko 1h vožnje), Beograd je alternativa.'},
  'paracin': {nearest:'Niš', note:'Paraćin nema svoj aerodrom — najbliži je Niš (oko 1h vožnje).'},
  'bor': {nearest:'Niš', note:'Bor nema svoj aerodrom — najbliži je Niš (oko 1h30 vožnje).'},
  'negotin': {nearest:'Niš', note:'Negotin nema svoj aerodrom — najbliži je Niš (oko 2h vožnje).'},
  'prijepolje': {nearest:'Podgorica', note:'Prijepolje nema svoj aerodrom — najbliži je Podgorica (oko 1h30 vožnje), Beograd je alternativa.'},
  'priboj': {nearest:'Podgorica', note:'Priboj nema svoj aerodrom — najbliži je Podgorica (oko 1h30 vožnje).'},
  'sjenica': {nearest:'Beograd', note:'Sjenica nema svoj aerodrom — najbliži je Beograd (oko 3h vožnje), Podgorica je alternativa.'},
  'prokuplje': {nearest:'Niš', note:'Prokuplje nema svoj aerodrom — najbliži je Niš (oko 40 min vožnje).'},
  'vrnjacka banja': {nearest:'Niš', note:'Vrnjačka Banja nema svoj aerodrom — najbliži je Niš (oko 1h30 vožnje), Beograd je alternativa.'},
  'sokobanja': {nearest:'Niš', note:'Sokobanja nema svoj aerodrom — najbliži je Niš (oko 1h vožnje).'},
  'aleksinac': {nearest:'Niš', note:'Aleksinac nema svoj aerodrom — najbliži je Niš (oko 30 min vožnje).'},
  'vlasotince': {nearest:'Niš', note:'Vlasotince nema svoj aerodrom — najbliži je Niš (oko 1h vožnje).'},
  'surdulica': {nearest:'Niš', note:'Surdulica nema svoj aerodrom — najbliži je Niš (oko 1h30 vožnje).'},
  'ivanjica': {nearest:'Beograd', note:'Ivanjica nema svoj aerodrom — najbliži je Beograd (oko 3h vožnje).'},
  'cuprija': {nearest:'Niš', note:'Ćuprija nema svoj aerodrom — najbliži je Niš (oko 1h vožnje), Beograd je alternativa.'},
  'svilajnac': {nearest:'Beograd', note:'Svilajnac nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).'},
  'senta': {nearest:'Beograd', note:'Senta nema svoj aerodrom — najbliži je Beograd (oko 2h vožnje), Budimpešta je alternativa.'},
  'becej': {nearest:'Beograd', note:'Bečej nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).'},
  'vrbas': {nearest:'Beograd', note:'Vrbas nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).'},
  'backa palanka': {nearest:'Beograd', note:'Bačka Palanka nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje).'},
  'ruma': {nearest:'Beograd', note:'Ruma nema svoj aerodrom — najbliži je Beograd (oko 1h vožnje).'},
  'indjija': {nearest:'Beograd', note:'Inđija nema svoj aerodrom — najbliži je Beograd (oko 40 min vožnje).'},
  'stara pazova': {nearest:'Beograd', note:'Stara Pazova nema svoj aerodrom — najbliži je Beograd (oko 30 min vožnje).'},
  'sid': {nearest:'Beograd', note:'Šid nema svoj aerodrom — najbliži je Beograd (oko 1h30 vožnje), Zagreb je alternativa.'},
  // --- Crna Gora: aerodromi ---
  'podgorica': {hasAirport:true},
  'tivat': {hasAirport:true},
  // --- Crna Gora: bez sopstvenog aerodroma ---
  'budva': {nearest:'Tivat', note:'Budva nema svoj aerodrom — najbliži je Tivat (oko 25 min vožnje).'},
  'danilovgrad': {nearest:'Podgorica', note:'Danilovgrad nema svoj aerodrom — najbliži je Podgorica (oko 20 min vožnje).'},
  'pljevlja': {nearest:'Podgorica', note:'Pljevlja nema svoj aerodrom — najbliži je Podgorica (oko 2h30 vožnje), Sarajevo je alternativa.'},
  'berane': {nearest:'Podgorica', note:'Berane nema svoj aerodrom — najbliži je Podgorica (oko 2h vožnje).'},
  'rozaje': {nearest:'Podgorica', note:'Rožaje nema svoj aerodrom — najbliži je Podgorica (oko 2h30 vožnje).'},
  'bijelo polje': {nearest:'Podgorica', note:'Bijelo Polje nema svoj aerodrom — najbliži je Podgorica (oko 2h vožnje).'},
  'bar': {nearest:'Tivat', note:'Bar nema svoj aerodrom — najbliži je Tivat (oko 40 min vožnje), Podgorica je alternativa (oko 1h).'},
  'herceg novi': {nearest:'Tivat', note:'Herceg Novi nema svoj aerodrom — najbliži je Tivat (oko 35 min vožnje).'},
  'igalo': {nearest:'Tivat', note:'Igalo nema svoj aerodrom — najbliži je Tivat (oko 35 min vožnje).'},
  'niksic': {nearest:'Podgorica', note:'Nikšić nema svoj aerodrom — najbliži je Podgorica (oko 1h vožnje).'},
  'cetinje': {nearest:'Podgorica', note:'Cetinje nema svoj aerodrom — najbliži je Podgorica (oko 30 min vožnje).'},
  'ulcinj': {nearest:'Tivat', note:'Ulcinj nema svoj aerodrom — najbliži je Tivat (oko 1h vožnje), Podgorica je alternativa.'},
  'petrovac': {nearest:'Tivat', note:'Petrovac nema svoj aerodrom — najbliži je Tivat (oko 35 min vožnje).'},
  'sutomore': {nearest:'Tivat', note:'Sutomore nema svoj aerodrom — najbliži je Tivat (oko 45 min vožnje).'},
  'perast': {nearest:'Tivat', note:'Perast nema svoj aerodrom — najbliži je Tivat (oko 20 min vožnje).'},
  'risan': {nearest:'Tivat', note:'Risan nema svoj aerodrom — najbliži je Tivat (oko 25 min vožnje).'},
  'kotor': {nearest:'Tivat', note:'Kotor nema svoj aerodrom — najbliži je Tivat (oko 15 min vožnje).'},
  'kolasin': {nearest:'Podgorica', note:'Kolašin nema svoj aerodrom — najbliži je Podgorica (oko 1h vožnje).'},
  'zabljak': {nearest:'Podgorica', note:'Žabljak nema svoj aerodrom — najbliži je Podgorica (oko 2h vožnje).'},
  // --- Bosna i Hercegovina: aerodromi ---
  'sarajevo': {hasAirport:true},
  'banja luka': {hasAirport:true, limited:true},
  'tuzla': {hasAirport:true},
  'mostar': {hasAirport:true},
  // --- BiH: bez sopstvenog aerodroma ---
  'zenica': {nearest:'Sarajevo', note:'Zenica nema svoj aerodrom — najbliži je Sarajevo (oko 1h vožnje).'},
  'prijedor': {nearest:'Banja Luka', note:'Prijedor nema svoj aerodrom — najbliži je Banja Luka (oko 40 min vožnje).'},
  'bihac': {nearest:'Banja Luka', note:'Bihać nema svoj aerodrom — najbliži je Banja Luka (oko 2h vožnje), Zagreb je alternativa.'},
  'doboj': {nearest:'Banja Luka', note:'Doboj nema svoj aerodrom — najbliži je Banja Luka (oko 1h vožnje), Sarajevo je alternativa.'},
  'trebinje': {nearest:'Dubrovnik', note:'Trebinje nema svoj aerodrom — najbliži je Dubrovnik u Hrvatskoj (oko 40 min vožnje).'},
  'foca': {nearest:'Sarajevo', note:'Foča nema svoj aerodrom — najbliži je Sarajevo (oko 1h30 vožnje).'},
  'bijeljina': {nearest:'Tuzla', note:'Bijeljina nema svoj aerodrom — najbliži je Tuzla (oko 1h vožnje), Beograd je alternativa.'},
  'brcko': {nearest:'Tuzla', note:'Brčko nema svoj aerodrom — najbliži je Tuzla (oko 1h vožnje).'},
  'travnik': {nearest:'Sarajevo', note:'Travnik nema svoj aerodrom — najbliži je Sarajevo (oko 1h30 vožnje).'},
  'livno': {nearest:'Split', note:'Livno nema svoj aerodrom — najbliži je Split u Hrvatskoj (oko 1h30 vožnje), Sarajevo je alternativa.'},
  'gorazde': {nearest:'Sarajevo', note:'Goražde nema svoj aerodrom — najbliži je Sarajevo (oko 1h vožnje).'},
  // --- Hrvatska: aerodromi ---
  'zagreb': {hasAirport:true}, 'split': {hasAirport:true}, 'dubrovnik': {hasAirport:true},
  'zadar': {hasAirport:true}, 'rijeka': {hasAirport:true}, 'pula': {hasAirport:true},
  'osijek': {hasAirport:true, limited:true},
  // --- Hrvatska: bez sopstvenog aerodroma ---
  'vukovar': {nearest:'Osijek', note:'Vukovar nema svoj aerodrom — najbliži je Osijek (oko 40 min vožnje).'},
  'slavonski brod': {nearest:'Zagreb', note:'Slavonski Brod nema svoj aerodrom — najbliži je Zagreb (oko 2h vožnje), Sarajevo je alternativa.'},
  'varazdin': {nearest:'Zagreb', note:'Varaždin nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).'},
  'knin': {nearest:'Split', note:'Knin nema svoj aerodrom — najbliži je Split (oko 1h vožnje), Zadar je alternativa.'},
  'sibenik': {nearest:'Split', note:'Šibenik nema svoj aerodrom — najbliži je Split (oko 1h vožnje), Zadar je alternativa.'},
  'makarska': {nearest:'Split', note:'Makarska nema svoj aerodrom — najbliži je Split (oko 1h vožnje).'},
  'trogir': {nearest:'Split', note:'Trogir nema svoj aerodrom — aerodrom Split je praktično odmah pored (oko 10 min vožnje).'},
  'hvar': {nearest:'Split', note:'Hvar nema svoj aerodrom na ostrvu — do njega se stiže trajektom iz Splita, gde je najbliži aerodrom.'},
  'rovinj': {nearest:'Pula', note:'Rovinj nema svoj aerodrom — najbliži je Pula (oko 40 min vožnje).'},
  'sisak': {nearest:'Zagreb', note:'Sisak nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).'},
  'karlovac': {nearest:'Zagreb', note:'Karlovac nema svoj aerodrom — najbliži je Zagreb (oko 1h vožnje).'},
  // --- Severna Makedonija ---
  'skoplje': {hasAirport:true}, 'ohrid': {hasAirport:true, limited:true},
  'bitola': {nearest:'Ohrid', note:'Bitolj nema svoj aerodrom — najbliži je Ohrid (oko 1h vožnje), Skoplje je alternativa.'},
  'tetovo': {nearest:'Skoplje', note:'Tetovo nema svoj aerodrom — najbliži je Skoplje (oko 30 min vožnje).'},
  'kumanovo': {nearest:'Skoplje', note:'Kumanovo nema svoj aerodrom — najbliži je Skoplje (oko 30 min vožnje).'},
  'gostivar': {nearest:'Skoplje', note:'Gostivar nema svoj aerodrom — najbliži je Skoplje (oko 45 min vožnje).'},
  'strumica': {nearest:'Skoplje', note:'Strumica nema svoj aerodrom — najbliži je Skoplje (oko 1h30 vožnje).'},
  'prilep': {nearest:'Ohrid', note:'Prilep nema svoj aerodrom — najbliži je Ohrid (oko 1h vožnje), Skoplje je alternativa.'},
  'struga': {nearest:'Ohrid', note:'Struga nema svoj aerodrom — najbliži je Ohrid (oko 20 min vožnje).'},
  'veles': {nearest:'Skoplje', note:'Veles nema svoj aerodrom — najbliži je Skoplje (oko 40 min vožnje).'},
  // --- Kosovo ---
  'pristina': {hasAirport:true},
  'prizren': {nearest:'Priština', note:'Prizren nema svoj aerodrom — najbliži je Priština (oko 1h30 vožnje).'},
  'pec': {nearest:'Priština', note:'Peć nema svoj aerodrom — najbliži je Priština (oko 1h30 vožnje), Podgorica je alternativa.'},
  'djakovica': {nearest:'Priština', note:'Đakovica nema svoj aerodrom — najbliži je Priština (oko 1h vožnje).'},
  'mitrovica': {nearest:'Priština', note:'Mitrovica nema svoj aerodrom — najbliži je Priština (oko 40 min vožnje).'},
  // --- Albanija ---
  'tirana': {hasAirport:true},
  'skadar': {nearest:'Podgorica', note:'Skadar nema svoj aerodrom — najbliži je Podgorica u Crnoj Gori (oko 1h vožnje), bliže nego Tirana.'},
  'sarande': {nearest:'Tirana', note:'Sarandë nema svoj aerodrom — najbliži je Tirana (oko 4h vožnje), Krf u Grčkoj je bliža alternativa trajektom.'},
  'vlore': {nearest:'Tirana', note:'Vlorë nema svoj aerodrom — najbliži je Tirana (oko 2h vožnje).'},
  'durres': {nearest:'Tirana', note:'Durrës nema svoj aerodrom — najbliži je Tirana (oko 30 min vožnje).'},
  // --- Slovenija: aerodromi ---
  'ljubljana': {hasAirport:true},
  'maribor': {hasAirport:true, limited:true},
  // --- Slovenija: bez sopstvenog aerodroma ---
  'bled': {nearest:'Ljubljana', note:'Bled nema svoj aerodrom — najbliži je Ljubljana (oko 40 min vožnje).'},
  'kranjska gora': {nearest:'Ljubljana', note:'Kranjska Gora nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).'},
  'kranj': {nearest:'Ljubljana', note:'Kranj nema svoj aerodrom — najbliži je Ljubljana (oko 30 min vožnje).'},
  'bohinj': {nearest:'Ljubljana', note:'Bohinj nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).'},
  'bovec': {nearest:'Ljubljana', note:'Bovec nema svoj aerodrom — najbliži je Ljubljana (oko 1h30 vožnje).'},
  'kobarid': {nearest:'Ljubljana', note:'Kobarid nema svoj aerodrom — najbliži je Ljubljana (oko 1h30 vožnje).'},
  'logarska dolina': {nearest:'Ljubljana', note:'Logarska Dolina nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).'},
  'idrija': {nearest:'Ljubljana', note:'Idrija nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).'},
  'postojna': {nearest:'Ljubljana', note:'Postojna nema svoj aerodrom — najbliži je Ljubljana (oko 45 min vožnje).'},
  'škocjanske jame': {nearest:'Ljubljana', note:'Škocjanske jame nemaju aerodrom u blizini — najbliži je Ljubljana (oko 1h vožnje).'},
  'predjama': {nearest:'Ljubljana', note:'Predjama nema svoj aerodrom — najbliži je Ljubljana (oko 45 min vožnje).'},
  'vintgar': {nearest:'Ljubljana', note:'Vintgar nema svoj aerodrom — najbliži je Ljubljana (oko 45 min vožnje).'},
  'kamnik': {nearest:'Ljubljana', note:'Kamnik nema svoj aerodrom — najbliži je Ljubljana (oko 30 min vožnje).'},
  'celje': {nearest:'Ljubljana', note:'Celje nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).'},
  'novo mesto': {nearest:'Ljubljana', note:'Novo Mesto nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).'},
  'rogaška slatina': {nearest:'Ljubljana', note:'Rogaška Slatina nema svoj aerodrom — najbliži je Ljubljana (oko 1h30 vožnje).'},
  'dolenjske toplice': {nearest:'Ljubljana', note:'Dolenjske Toplice nemaju aerodrom — najbliži je Ljubljana (oko 1h vožnje).'},
  'laško': {nearest:'Ljubljana', note:'Laško nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).'},
  'triglav': {nearest:'Ljubljana', note:'Triglav nema aerodrom u blizini — najbliži je Ljubljana (oko 1h30 vožnje).'},
  'vogel': {nearest:'Ljubljana', note:'Vogel nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).'},
  'krvavec': {nearest:'Ljubljana', note:'Krvavec nema svoj aerodrom — najbliži je Ljubljana (oko 40 min vožnje).'},
  'mangart': {nearest:'Ljubljana', note:'Mangart nema svoj aerodrom — najbliži je Ljubljana (oko 1h30 vožnje).'},
  'škofja loka': {nearest:'Ljubljana', note:'Škofja Loka nema svoj aerodrom — najbliži je Ljubljana (oko 30 min vožnje).'},
  'nova gorica': {nearest:'Ljubljana', note:'Nova Gorica nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).'},
  'jesenice': {nearest:'Ljubljana', note:'Jesenice nema svoj aerodrom — najbliži je Ljubljana (oko 40 min vožnje).'},
  'velenje': {nearest:'Ljubljana', note:'Velenje nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).'},
  'čatež': {nearest:'Ljubljana', note:'Čatež nema svoj aerodrom — najbliži je Ljubljana (oko 1h vožnje).'},
  'ptuj': {nearest:'Maribor', note:'Ptuj nema svoj aerodrom — najbliži je Maribor (oko 20 min vožnje).'},
  'terme ptuj': {nearest:'Maribor', note:'Terme Ptuj nemaju aerodrom — najbliži je Maribor (oko 20 min vožnje).'},
  'pohorje': {nearest:'Maribor', note:'Pohorje nema svoj aerodrom — najbliži je Maribor (oko 20 min vožnje).'},
  'slovenj gradec': {nearest:'Maribor', note:'Slovenj Gradec nema svoj aerodrom — najbliži je Maribor (oko 50 min vožnje).'},
  'murska sobota': {nearest:'Maribor', note:'Murska Sobota nema svoj aerodrom — najbliži je Maribor (oko 1h vožnje).'},
  'moravske toplice': {nearest:'Maribor', note:'Moravske Toplice nemaju aerodrom — najbliži je Maribor (oko 1h vožnje).'},
  'radenci': {nearest:'Maribor', note:'Radenci nemaju aerodrom — najbliži je Maribor (oko 1h vožnje).'},
  'koper': {nearest:'Trst', note:'Koper nema svoj aerodrom — najbliži je Trst u Italiji (oko 30 min vožnje), Ljubljana je alternativa.'},
  'piran': {nearest:'Trst', note:'Piran nema svoj aerodrom — najbliži je Trst u Italiji (oko 40 min vožnje), Ljubljana je alternativa.'},
  'portorož': {nearest:'Trst', note:'Portorož nema svoj aerodrom — najbliži je Trst u Italiji (oko 35 min vožnje), Ljubljana je alternativa.'},
  'izola': {nearest:'Trst', note:'Izola nema svoj aerodrom — najbliži je Trst u Italiji (oko 35 min vožnje), Ljubljana je alternativa.'},
  'ankaran': {nearest:'Trst', note:'Ankaran nema svoj aerodrom — najbliži je Trst u Italiji (oko 25 min vožnje), Ljubljana je alternativa.'},
  // --- Mađarska (relevantno za sever Srbije) ---
  'budimpesta': {hasAirport:true},
  'segedin': {nearest:'Budimpešta', note:'Segedin nema svoj aerodrom — najbliži je Budimpešta (oko 2h vožnje).'},
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
  'mersin': {nearest:'Adana', note:'Mersin nema svoj aerodrom — najbliži je Adana (oko 1h vožnje).'},
  'kapadokija': {nearest:'Nevsehir', note:'Kapadokija nema svoj aerodrom u samom centru — najbliži je Nevšehir (oko 30 min vožnje), Kajseri je alternativa sa više letova.'},
  'marmaris': {nearest:'Dalaman', note:'Marmaris nema svoj aerodrom — najbliži je Dalaman (oko 1h vožnje).'},
  'fetije': {nearest:'Dalaman', note:'Fetije nema svoj aerodrom — najbliži je Dalaman (oko 50 min vožnje).'},
  'side': {nearest:'Antalija', note:'Side nema svoj aerodrom — najbliži je Antalija (oko 1h vožnje).'},
  'alanja': {nearest:'Antalija', note:'Alanja nema svoj aerodrom — najbliži je Gazipaša (oko 45 min vožnje), Antalija je alternativa sa više letova (oko 1h30).'},
  'kušadasi': {nearest:'Izmir', note:'Kušadasi nema svoj aerodrom — najbliži je Izmir (oko 1h30 vožnje).'},
  'česme': {nearest:'Izmir', note:'Česme nema svoj aerodrom — najbliži je Izmir (oko 1h vožnje).'},
  'pamukale': {nearest:'Denizli', note:'Pamukale nema svoj aerodrom — najbliži je Denizli (oko 30 min vožnje).'},
  'jalova': {nearest:'Istanbul', note:'Jalova nema svoj aerodrom — najbliži je Istanbul (oko 1h30 vožnje, uz trajekt preko Mramornog mora).'},
  'afjon karahisar': {nearest:'Ankara', note:'Afjon Karahisar nema veći aerodrom — najbliži je Ankara (oko 3h vožnje).'},
  'haymana': {nearest:'Ankara', note:'Haymana nema svoj aerodrom — najbliži je Ankara (oko 1h vožnje).'},
  'kizildžahamam': {nearest:'Ankara', note:'Kizildžahamam nema svoj aerodrom — najbliži je Ankara (oko 1h vožnje).'},
  'efes': {nearest:'Izmir', note:'Efes nema svoj aerodrom — najbliži je Izmir (oko 1h vožnje).'},
  'troja': {nearest:'Canakkale', note:'Troja nema svoj aerodrom — najbliži je Čanakale (oko 30 min vožnje).'},
  'pergamon': {nearest:'Izmir', note:'Pergamon nema svoj aerodrom — najbliži je Izmir (oko 1h30 vožnje).'},
  'hijerapolis': {nearest:'Denizli', note:'Hijerapolis nema svoj aerodrom — najbliži je Denizli (oko 30 min vožnje).'},
  'sumela': {nearest:'Trabzon', note:'Sumela nema svoj aerodrom — najbliži je Trabzon (oko 1h vožnje).'},
  'nemrut': {nearest:'Malatja', note:'Nemrut nema svoj aerodrom — najbliži je Malatja (oko 2h vožnje).'},
  'safranbolu': {nearest:'Ankara', note:'Safranbolu nema veći aerodrom — najbliži je Ankara (oko 3h vožnje).'},
  'gjobekli tepe': {nearest:'Sanliurfa', note:'Gjobekli Tepe nema svoj aerodrom — najbliži je Šanlıurfa (oko 1h vožnje), Gaziantep je alternativa.'},
  'kaš': {nearest:'Dalaman', note:'Kaš nema svoj aerodrom — najbliži je Dalaman (oko 2h vožnje).'},
  'kalkan': {nearest:'Dalaman', note:'Kalkan nema svoj aerodrom — najbliži je Dalaman (oko 1h30 vožnje).'},
  'datča': {nearest:'Dalaman', note:'Datča nema svoj aerodrom — najbliži je Dalaman (oko 1h30 vožnje).'},
  'didim': {nearest:'Izmir', note:'Didim nema svoj aerodrom — najbliži je Izmir (oko 2h vožnje).'},
  'ajvalik': {nearest:'Izmir', note:'Ajvalik nema svoj aerodrom — najbliži je Izmir (oko 2h vožnje).'},
  'silifke': {nearest:'Adana', note:'Silifke nema svoj aerodrom — najbliži je Adana (oko 2h vožnje).'},
  'foča (turska)': {nearest:'Izmir', note:'Foča nema svoj aerodrom — najbliži je Izmir (oko 1h vožnje).'},
  // --- Portugalija: aerodromi ---
  'lisabon': {hasAirport:true},
  'porto': {hasAirport:true},
  'faro': {hasAirport:true},
  'madeira': {hasAirport:true},
  'azori': {hasAirport:true, limited:true},
  'tersejra': {hasAirport:true, limited:true},
  // --- Portugalija: bez sopstvenog aerodroma ---
  'koimbra': {nearest:'Porto', note:'Koimbra nema svoj aerodrom — najbliži je Porto (oko 1h vožnje), Lisabon je alternativa.'},
  'braga': {nearest:'Porto', note:'Braga nema svoj aerodrom — najbliži je Porto (oko 50 min vožnje).'},
  'sintra': {nearest:'Lisabon', note:'Sintra nema svoj aerodrom — najbliži je Lisabon (oko 30 min vožnje).'},
  'albufeira': {nearest:'Faro', note:'Albufeira nema svoj aerodrom — najbliži je Faro (oko 40 min vožnje).'},
  'evora': {nearest:'Lisabon', note:'Evora nema svoj aerodrom — najbliži je Lisabon (oko 1h30 vožnje).'},
  'kaskais': {nearest:'Lisabon', note:'Kaskais nema svoj aerodrom — najbliži je Lisabon (oko 30 min vožnje).'},
  'nazare': {nearest:'Lisabon', note:'Nazare nema svoj aerodrom — najbliži je Lisabon (oko 1h30 vožnje).'},
  'fatima': {nearest:'Lisabon', note:'Fatima nema svoj aerodrom — najbliži je Lisabon (oko 1h30 vožnje), Porto je alternativa.'},
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
  // --- Poljska: bez sopstvenog aerodroma ---
  'zakopane': {nearest:'Krakov', note:'Zakopane nema svoj aerodrom — najbliži je Krakov (oko 2h vožnje).'},
  'torunj': {nearest:'Bidgosc', note:'Torunj nema svoj aerodrom — najbliži je Bidgošć (oko 45 min vožnje), Poznanj je alternativa.'},
  'vjelicka': {nearest:'Krakov', note:'Vjelička nema svoj aerodrom — najbliži je Krakov (oko 20 min vožnje).'},
  'gdinja': {nearest:'Gdanjsk', note:'Gdinja nema svoj aerodrom — koristi se aerodrom Gdanjsk, deo iste aglomeracije (oko 25 min vožnje).'},
  'censtohova': {nearest:'Katovice', note:'Čenstohova nema svoj aerodrom — najbliži je Katovice (oko 1h vožnje).'},
  // --- Češka: aerodromi ---
  'prag': {hasAirport:true},
  'brno': {hasAirport:true, limited:true},
  'karlovi vari': {hasAirport:true, limited:true},
  'ostrava': {hasAirport:true, limited:true},
  // --- Češka: bez sopstvenog aerodroma ---
  'plzenj': {nearest:'Prag', note:'Plzenj nema komercijalni aerodrom — najbliži je Prag (oko 1h vožnje).'},
  'ceski krumlov': {nearest:'Linc', note:'Češki Krumlov nema svoj aerodrom — najbliži je Linc u Austriji (oko 1h vožnje), Prag je dalja alternativa (oko 2h30).'},
  'olomouc': {nearest:'Ostrava', note:'Olomouc nema svoj aerodrom — najbliži je Ostrava (oko 40 min vožnje), Brno je alternativa.'},
  'kutna hora': {nearest:'Prag', note:'Kutna Hora nema svoj aerodrom — najbliži je Prag (oko 1h vožnje).'},
  'ceske budejovice': {nearest:'Prag', note:'Češke Budejovice nemaju svoj aerodrom sa redovnim letovima — najbliži je Prag (oko 2h vožnje), Linc je alternativa.'},
  'hradec kralove': {nearest:'Prag', note:'Hradec Kralove nema svoj aerodrom — najbliži je Prag (oko 1h30 vožnje).'},
  'liberec': {nearest:'Prag', note:'Liberec nema svoj aerodrom — najbliži je Prag (oko 1h30 vožnje).'},
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
  // --- Belgija: aerodromi ---
  'brisel': {hasAirport:true},
  'antverpen': {hasAirport:true, limited:true},
  'sarlroa': {hasAirport:true, limited:true},
  'lijez': {hasAirport:true, limited:true},
  'ostende': {hasAirport:true, limited:true},
  // --- Belgija: bez sopstvenog aerodroma ---
  'briz': {nearest:'Brisel', note:'Briž nema svoj aerodrom — najbliži je Brisel (oko 1h vožnje).'},
  'gent': {nearest:'Brisel', note:'Gent nema svoj aerodrom — najbliži je Brisel (oko 45 min vožnje).'},
  'namir': {nearest:'Šarlroa', note:'Namir nema svoj aerodrom — najbliži je Šarlroa (oko 45 min vožnje).'},
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
  // --- Grčka: bez sopstvenog aerodroma ---
  'halkidiki': {nearest:'Solun', note:'Halkidiki nema svoj aerodrom — najbliži je Solun (oko 1h vožnje).'},
  'lefkada': {nearest:'Preveza', note:'Lefkada nema svoj aerodrom — najbliži je Preveza/Aktion (oko 30 min vožnje).'},
  'volos': {nearest:'Solun', note:'Volos nema veći aerodrom — najbliži je Solun (oko 2h vožnje), mali regionalni aerodrom Nea Anhialos je bliži ali sa malo letova.'},
  'patra': {nearest:'Araksos', note:'Patra nema svoj aerodrom — najbliži je Araksos (oko 45 min vožnje).'},
  'larisa': {nearest:'Solun', note:'Larisa nema svoj aerodrom — najbliži je Solun (oko 1h30 vožnje).'},
  'lutraki': {nearest:'Atina', note:'Lutraki nema svoj aerodrom — najbliži je Atina (oko 1h vožnje).'},
  'edipsos': {nearest:'Atina', note:'Edipsos nema svoj aerodrom — najbliži je Atina (oko 2h vožnje, uz trajekt).'},
  'olimp': {nearest:'Solun', note:'Olimp nema svoj aerodrom — najbliži je Solun (oko 1h vožnje).'},
  'pilion': {nearest:'Solun', note:'Pilion nema svoj aerodrom — najbliži je Solun (oko 2h vožnje), Volos je bliža alternativa bez redovnih letova.'},
  'meteori': {nearest:'Solun', note:'Meteori nemaju aerodrom u blizini — najbliži je Solun (oko 2h vožnje).'},
  'delfi': {nearest:'Atina', note:'Delfi nema svoj aerodrom — najbliži je Atina (oko 2h vožnje).'},
  'nafplion': {nearest:'Atina', note:'Nafplion nema svoj aerodrom — najbliži je Atina (oko 2h vožnje).'},
  'tasos': {nearest:'Kavala', note:'Tasos nema svoj aerodrom — najbliži je Kavala (oko 1h vožnje, uz trajekt).'},
  'skopelos': {nearest:'Skijatos', note:'Skopelos nema veći aerodrom — najbliži je Skijatos (trajektom oko 1h).'},
  'evija': {nearest:'Atina', note:'Evija nema svoj aerodrom — najbliži je Atina (oko 1h30 vožnje).'},
  'idra': {nearest:'Atina', note:'Idra nema svoj aerodrom — najbliži je Atina (trajektom oko 1h30).'},
  'spece': {nearest:'Atina', note:'Spece nema svoj aerodrom — najbliži je Atina (trajektom oko 2h).'},
  'ios': {nearest:'Santorini', note:'Ios nema svoj aerodrom — najbliži je Santorini (trajektom oko 1h), Naksos je alternativa.'},
  'egina': {nearest:'Atina', note:'Egina nema svoj aerodrom — najbliži je Atina (trajektom oko 1h).'},
  'poros': {nearest:'Atina', note:'Poros nema svoj aerodrom — najbliži je Atina (trajektom oko 2h).'},
  // --- Bugarska: aerodromi ---
  'sofija': {hasAirport:true},
  'varna': {hasAirport:true},
  'burgas': {hasAirport:true},
  'plovdiv': {hasAirport:true, limited:true},
  // --- Bugarska: bez sopstvenog aerodroma ---
  'nesebar': {nearest:'Burgas', note:'Nesebar nema svoj aerodrom — najbliži je Burgas (oko 40 min vožnje).'},
  'bansko': {nearest:'Sofija', note:'Bansko nema svoj aerodrom — najbliži je Sofija (oko 2h vožnje).'},
  'ruse': {nearest:'Sofija', note:'Ruse nema svoj aerodrom — najbliži je Sofija (oko 4h vožnje), Bukurešt u Rumuniji je bliža alternativa preko granice (oko 1h30).'},
  'stara zagora': {nearest:'Plovdiv', note:'Stara Zagora nema svoj aerodrom — najbliži je Plovdiv (oko 1h vožnje).'},
  'pleven': {nearest:'Sofija', note:'Pleven nema svoj aerodrom — najbliži je Sofija (oko 2h vožnje).'},
  'veliko trnovo': {nearest:'Sofija', note:'Veliko Trnovo nema svoj aerodrom — najbliži je Sofija (oko 2h30 vožnje), Varna je alternativa.'},
  'blagoevgrad': {nearest:'Sofija', note:'Blagoevgrad nema svoj aerodrom — najbliži je Sofija (oko 1h vožnje).'},
  'sumen': {nearest:'Varna', note:'Šumen nema svoj aerodrom — najbliži je Varna (oko 1h30 vožnje).'},
  'sliven': {nearest:'Burgas', note:'Sliven nema svoj aerodrom — najbliži je Burgas (oko 1h30 vožnje).'},
  'vidin': {nearest:'Sofija', note:'Vidin nema svoj aerodrom — najbliži je Sofija (oko 3h vožnje).'},
  'dobric': {nearest:'Varna', note:'Dobrič nema svoj aerodrom — najbliži je Varna (oko 45 min vožnje).'},
  'kjustendil': {nearest:'Sofija', note:'Kjustendil nema svoj aerodrom — najbliži je Sofija (oko 1h30 vožnje).'},
  'gabrovo': {nearest:'Sofija', note:'Gabrovo nema svoj aerodrom — najbliži je Sofija (oko 2h30 vožnje), Plovdiv je alternativa.'},
  'haskovo': {nearest:'Plovdiv', note:'Haskovo nema svoj aerodrom — najbliži je Plovdiv (oko 1h vožnje).'},
  'sandanski': {nearest:'Sofija', note:'Sandanski nema svoj aerodrom — najbliži je Sofija (oko 2h vožnje).'},
  'velingrad': {nearest:'Sofija', note:'Velingrad nema svoj aerodrom — najbliži je Sofija (oko 1h30 vožnje), Plovdiv je alternativa.'},
  'hisarja': {nearest:'Plovdiv', note:'Hisarja nema svoj aerodrom — najbliži je Plovdiv (oko 40 min vožnje).'},
  'devin': {nearest:'Plovdiv', note:'Devin nema svoj aerodrom — najbliži je Plovdiv (oko 1h30 vožnje).'},
  'pavel banja': {nearest:'Plovdiv', note:'Pavel Banja nema svoj aerodrom — najbliži je Plovdiv (oko 1h vožnje).'},
  'bankja': {nearest:'Sofija', note:'Bankja nema svoj aerodrom — najbliži je Sofija (oko 30 min vožnje).'},
  'borovec': {nearest:'Sofija', note:'Borovec nema svoj aerodrom — najbliži je Sofija (oko 1h30 vožnje).'},
  'pamporovo': {nearest:'Plovdiv', note:'Pamporovo nema svoj aerodrom — najbliži je Plovdiv (oko 1h30 vožnje).'},
  'vitosa': {nearest:'Sofija', note:'Vitoša nema svoj aerodrom — najbliži je Sofija (oko 30 min vožnje).'},
  'cepelare': {nearest:'Plovdiv', note:'Čepelare nema svoj aerodrom — najbliži je Plovdiv (oko 1h30 vožnje).'},
  'rila': {nearest:'Sofija', note:'Rila nema svoj aerodrom — najbliži je Sofija (oko 2h vožnje).'},
  'koprivstica': {nearest:'Sofija', note:'Koprivštica nema svoj aerodrom — najbliži je Sofija (oko 1h30 vožnje), Plovdiv je alternativa.'},
  'melnik': {nearest:'Sofija', note:'Melnik nema svoj aerodrom — najbliži je Sofija (oko 2h30 vožnje).'},
  'rilski manastir': {nearest:'Sofija', note:'Rilski manastir nema svoj aerodrom — najbliži je Sofija (oko 2h vožnje).'},
  'trjavna': {nearest:'Sofija', note:'Trjavna nema svoj aerodrom — najbliži je Sofija (oko 2h30 vožnje), Varna je alternativa.'},
  'arbanasi': {nearest:'Varna', note:'Arbanasi nema svoj aerodrom — najbliži je Varna (oko 1h30 vožnje), Sofija je alternativa.'},
  'sozopol': {nearest:'Burgas', note:'Sozopol nema svoj aerodrom — najbliži je Burgas (oko 35 min vožnje).'},
  'suncev breg': {nearest:'Burgas', note:'Sunčev Breg nema svoj aerodrom — najbliži je Burgas (oko 30 min vožnje).'},
  'zlatni pjasci': {nearest:'Varna', note:'Zlatni Pjasci nemaju aerodrom — najbliži je Varna (oko 20 min vožnje).'},
  'primorsko': {nearest:'Burgas', note:'Primorsko nema svoj aerodrom — najbliži je Burgas (oko 1h vožnje).'},
  'balcik': {nearest:'Varna', note:'Balčik nema svoj aerodrom — najbliži je Varna (oko 40 min vožnje).'},
  'kavarna': {nearest:'Varna', note:'Kavarna nema svoj aerodrom — najbliži je Varna (oko 1h vožnje).'},
  'carevo': {nearest:'Burgas', note:'Carevo nema svoj aerodrom — najbliži je Burgas (oko 1h vožnje).'},
  'pomorije': {nearest:'Burgas', note:'Pomorije nema svoj aerodrom — najbliži je Burgas (oko 20 min vožnje).'},
  'ahtopol': {nearest:'Burgas', note:'Ahtopol nema svoj aerodrom — najbliži je Burgas (oko 1h30 vožnje).'},
  // --- Rumunija: aerodromi ---
  'bukurest': {hasAirport:true},
  'kluz': {hasAirport:true, limited:true},
  'konstanca': {hasAirport:true, limited:true},
  'sibiu': {hasAirport:true, limited:true},
  'temisvar': {hasAirport:true, limited:true},
  'jasi': {hasAirport:true, limited:true},
  'brasov': {hasAirport:true, limited:true},
  // --- Rumunija: bez sopstvenog aerodroma ---
  'sinaja': {nearest:'Bukurešt', note:'Sinaja nema svoj aerodrom — najbliži je Bukurešt (oko 2h vožnje), Brašov je alternativa (oko 45 min).'},
  'bran': {nearest:'Brašov', note:'Bran nema svoj aerodrom — najbliži je Brašov (oko 30 min vožnje).'},
  'mamaja': {nearest:'Konstanca', note:'Mamaja nema svoj aerodrom — aerodrom Konstanca je praktično odmah pored (oko 10 min vožnje).'},
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
  'lece': {nearest:'Brindizi', note:'Leče nema svoj aerodrom — najbliži je Brindizi (oko 40 min vožnje).'},
  'padova': {nearest:'Venecija', note:'Padova nema svoj aerodrom — najbliži je Venecija (oko 40 min vožnje).'},
  'modena': {nearest:'Bolonja', note:'Modena nema svoj aerodrom — najbliži je Bolonja (oko 40 min vožnje).'},
  'bresija': {nearest:'Milano', note:'Brešija nema svoj aerodrom — najbliži je Milano (oko 1h vožnje), Verona je alternativa.'},
  'salerno': {nearest:'Napulj', note:'Salerno nema svoj aerodrom — najbliži je Napulj (oko 50 min vožnje).'},
  'abano terme': {nearest:'Venecija', note:'Abano Terme nema svoj aerodrom — najbliži je Venecija (oko 50 min vožnje), Padova je alternativa.'},
  'montekatini terme': {nearest:'Firenca', note:'Montekatini Terme nema svoj aerodrom — najbliži je Firenca (oko 50 min vožnje), Pisa je alternativa.'},
  'fjudji': {nearest:'Rim', note:'Fjuđi nema svoj aerodrom — najbliži je Rim (oko 1h vožnje).'},
  'salsomadjore terme': {nearest:'Parma', note:'Salsomađore Terme nema svoj aerodrom — najbliži je Parma (oko 40 min vožnje).'},
  'dolomiti': {nearest:'Verona', note:'Dolomiti nemaju aerodrom u blizini — najbliži je Verona (oko 2h vožnje), Venecija je alternativa.'},
  'kortina d\'ampeco': {nearest:'Verona', note:'Kortina d\'Ampeco nema svoj aerodrom — najbliži je Verona (oko 2h vožnje).'},
  'val gardena': {nearest:'Bolcano', note:'Val Gardena nema svoj aerodrom — najbliži je Bolcano (oko 1h vožnje), Verona je dalja alternativa (oko 2h30).'},
  'livinjo': {nearest:'Milano', note:'Livinjo nema svoj aerodrom — najbliži je Milano (oko 3h vožnje), švajcarski Sankt Moric je bliža alternativa preko granice.'},
  'etna': {nearest:'Katanija', note:'Etna nema svoj aerodrom — najbliži je Katanija (oko 30 min vožnje).'},
  'pompeji': {nearest:'Napulj', note:'Pompeji nema svoj aerodrom — najbliži je Napulj (oko 40 min vožnje).'},
  'asizi': {nearest:'Perudja', note:'Asizi nema svoj aerodrom — najbliži je Perudja (oko 30 min vožnje).'},
  'sijena': {nearest:'Firenca', note:'Sijena nema svoj aerodrom — najbliži je Firenca (oko 1h vožnje).'},
  'san djimonjano': {nearest:'Firenca', note:'San Đimonjano nema svoj aerodrom — najbliži je Firenca (oko 1h vožnje).'},
  'orvieto': {nearest:'Rim', note:'Orvieto nema svoj aerodrom — najbliži je Rim (oko 1h30 vožnje), Perudja je alternativa.'},
  'ravena': {nearest:'Bolonja', note:'Ravena nema svoj aerodrom — najbliži je Bolonja (oko 1h vožnje).'},
  'amalfi': {nearest:'Napulj', note:'Amalfi nema svoj aerodrom — najbliži je Napulj (oko 1h vožnje).'},
  'pozitano': {nearest:'Napulj', note:'Pozitano nema svoj aerodrom — najbliži je Napulj (oko 1h vožnje).'},
  'sorento': {nearest:'Napulj', note:'Sorento nema svoj aerodrom — najbliži je Napulj (oko 1h vožnje).'},
  'kapri': {nearest:'Napulj', note:'Kapri nema svoj aerodrom — do ostrva se stiže trajektom iz Napulja, gde je najbliži aerodrom.'},
  'portofino': {nearest:'Đenova', note:'Portofino nema svoj aerodrom — najbliži je Đenova (oko 40 min vožnje).'},
  'elba': {nearest:'Pisa', note:'Elba nema svoj aerodrom sa redovnim letovima — najbliži je Pisa (oko 1h30 vožnje plus trajekt iz Pjombina).'},
  'taormina': {nearest:'Katanija', note:'Taormina nema svoj aerodrom — najbliži je Katanija (oko 45 min vožnje).'},
  'luka': {nearest:'Pisa', note:'Luka nema svoj aerodrom — najbliži je Pisa (oko 25 min vožnje).'},
  'cinkve tere': {nearest:'Đenova', note:'Činkve Tere nema svoj aerodrom — najbliži je Đenova (oko 1h vožnje), Pisa je alternativa.'},
  'san marino': {nearest:'Rimini', note:'San Marino nema svoj aerodrom — najbliži je Rimini (oko 30 min vožnje).'},
  'vatikan': {nearest:'Rim', note:'Vatikan nema svoj aerodrom — koristi se aerodrom Rim, praktično u samom gradu.'},
  'mantova': {nearest:'Verona', note:'Mantova nema svoj aerodrom — najbliži je Verona (oko 45 min vožnje).'},
  'ferara': {nearest:'Bolonja', note:'Ferara nema svoj aerodrom — najbliži je Bolonja (oko 40 min vožnje).'},
  'urbino': {nearest:'Ankona', note:'Urbino nema svoj aerodrom — najbliži je Ankona (oko 1h vožnje).'},
  'matera': {nearest:'Bari', note:'Matera nema svoj aerodrom — najbliži je Bari (oko 1h vožnje).'},
  'alberobelo': {nearest:'Bari', note:'Alberobelo nema svoj aerodrom — najbliži je Bari (oko 1h vožnje), Brindizi je alternativa.'},
  'ostuni': {nearest:'Brindizi', note:'Ostuni nema svoj aerodrom — najbliži je Brindizi (oko 40 min vožnje).'},
  'poljinjano a mare': {nearest:'Bari', note:'Poljinjano a Mare nema svoj aerodrom — najbliži je Bari (oko 30 min vožnje).'},
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
  'saragosa': {hasAirport:true, limited:true},
  'vigo': {hasAirport:true, limited:true},
  'korunja': {hasAirport:true, limited:true},
  'ovijedo': {hasAirport:true, limited:true},
  'santander': {hasAirport:true, limited:true},
  'valjadolid': {hasAirport:true, limited:true},
  'mursija': {hasAirport:true, limited:true},
  'almerija': {hasAirport:true, limited:true},
  'herez': {hasAirport:true, limited:true},
  'reus': {hasAirport:true, limited:true},
  'girona': {hasAirport:true, limited:true},
  'menorka': {hasAirport:true, limited:true},
  'pamplona': {hasAirport:true, limited:true},
  'melilja': {hasAirport:true, limited:true},
  // --- Španija: bez sopstvenog aerodroma ---
  'salamanka': {nearest:'Madrid', note:'Salamanka nema svoj aerodrom sa redovnim letovima — najbliži je Madrid (oko 2h30 vožnje).'},
  'toledo': {nearest:'Madrid', note:'Toledo nema svoj aerodrom — najbliži je Madrid (oko 1h vožnje).'},
  'kordoba': {nearest:'Sevilja', note:'Kordoba nema svoj aerodrom — najbliži je Sevilja (oko 1h30 vožnje), Malaga je alternativa.'},
  'segovija': {nearest:'Madrid', note:'Segovija nema svoj aerodrom — najbliži je Madrid (oko 1h vožnje).'},
  'ronda': {nearest:'Malaga', note:'Ronda nema svoj aerodrom — najbliži je Malaga (oko 2h vožnje).'},
  'kadiz': {nearest:'Herez', note:'Kadiz nema svoj aerodrom — najbliži je Herez de la Frontera (oko 45 min vožnje), Sevilja je alternativa.'},
  'marbelja': {nearest:'Malaga', note:'Marbelja nema svoj aerodrom — najbliži je Malaga (oko 45 min vožnje).'},
  'kuenka': {nearest:'Madrid', note:'Kuenka nema svoj aerodrom — najbliži je Madrid (oko 1h30 vožnje).'},
  'avila': {nearest:'Madrid', note:'Avila nema svoj aerodrom — najbliži je Madrid (oko 1h vožnje).'},
  // --- Austrija: aerodromi ---
  'bec': {hasAirport:true},
  'salcburg': {hasAirport:true, limited:true},
  'grac': {hasAirport:true, limited:true},
  'insbruk': {hasAirport:true, limited:true},
  'linc': {hasAirport:true, limited:true},
  'klagenfurt': {hasAirport:true, limited:true},
  // --- Austrija: bez sopstvenog aerodroma ---
  'halstat': {nearest:'Salcburg', note:'Halštat nema svoj aerodrom — najbliži je Salcburg (oko 1h vožnje).'},
  'zeloamze': {nearest:'Salcburg', note:'Cel am Ze nema svoj aerodrom — najbliži je Salcburg (oko 1h15 vožnje).'},
  'kicbuel': {nearest:'Insbruk', note:'Kicbuel nema svoj aerodrom — najbliži je Insbruk (oko 1h vožnje), Salcburg je alternativa.'},
  'sanktanton': {nearest:'Insbruk', note:'Sankt Anton am Arlberg nema svoj aerodrom — najbliži je Insbruk (oko 1h15 vožnje), Cirih je alternativa preko granice.'},
  'baden kod beca': {nearest:'Beč', note:'Baden kod Beča nema svoj aerodrom — najbliži je Beč (oko 30 min vožnje).'},
  'melk': {nearest:'Beč', note:'Melk nema svoj aerodrom — najbliži je Beč (oko 1h15 vožnje).'},
  'verfen': {nearest:'Salcburg', note:'Verfen nema svoj aerodrom — najbliži je Salcburg (oko 45 min vožnje).'},
  // --- Slovačka: aerodromi ---
  'bratislava': {hasAirport:true},
  'kosice': {hasAirport:true, limited:true},
  'poprad': {hasAirport:true, limited:true},
  // --- Slovačka: bez sopstvenog aerodroma ---
  'banska bistrica': {nearest:'Bratislava', note:'Banska Bistrica nema aerodrom sa redovnim letovima — najbliži je Bratislava (oko 2h30 vožnje).'},
  'vysoke tatre': {nearest:'Poprad', note:'Visoke Tatre nemaju sopstveni aerodrom — najbliži je Poprad (oko 30 min vožnje).'},
  // --- Baltik: aerodromi ---
  'talin': {hasAirport:true},
  'riga': {hasAirport:true},
  'vilnjus': {hasAirport:true},
  'kaunas': {hasAirport:true, limited:true},
  // --- Malta ---
  'malta': {hasAirport:true},
  // --- Kipar: aerodromi ---
  'larnaka': {hasAirport:true},
  'pafos': {hasAirport:true, limited:true},
  // --- Luksemburg ---
  'luksemburg': {hasAirport:true, limited:true},
  // --- Island ---
  'rejkjavik': {hasAirport:true},
  // --- Moldavija ---
  'kisinjev': {hasAirport:true, limited:true},
  // --- Velika Britanija: dodatni aerodromi ---
  'birmingem': {hasAirport:true},
  'glazgov': {hasAirport:true},
  'belfast': {hasAirport:true, limited:true},
  'bristol': {hasAirport:true, limited:true},
  'lids': {hasAirport:true, limited:true},
  'njukasl': {hasAirport:true, limited:true},
  // --- Velika Britanija: bez sopstvenog aerodroma ---
  'kembridz': {nearest:'London', note:'Kembridž nema svoj aerodrom — najbliži je London (oko 1h vožnje).'},
  'oksford': {nearest:'London', note:'Oksford nema svoj aerodrom — najbliži je London (oko 1h30 vožnje).'},
  // --- Francuska: dodatni aerodromi ---
  'tuluz': {hasAirport:true},
  'nant': {hasAirport:true, limited:true},
  'strazbur': {hasAirport:true, limited:true},
  'monpelje': {hasAirport:true, limited:true},
  'korzika': {hasAirport:true, limited:true},
  'lil': {hasAirport:true, limited:true},
  'ren': {hasAirport:true, limited:true},
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
  'versaj': {nearest:'Pariz', note:'Versaj nema svoj aerodrom — najbliži je Pariz (oko 30 min vožnje).'},
  'kan': {nearest:'Nica', note:'Kan nema svoj aerodrom — najbliži je Nica (oko 30 min vožnje).'},
  'dizon': {nearest:'Lion', note:'Dižon nema svoj aerodrom — najbliži je Lion (oko 1h30 vožnje).'},
  'anze': {nearest:'Nant', note:'Anže nema svoj aerodrom — najbliži je Nant (oko 1h vožnje).'},
  'lemans': {nearest:'Pariz', note:'Le Mans nema svoj aerodrom sa redovnim letovima — najbliži je Pariz (oko 2h vožnje), Tur je alternativa.'},
  'amjen': {nearest:'Pariz', note:'Amjen nema svoj aerodrom — najbliži je Pariz (oko 1h30 vožnje).'},
  'orlean': {nearest:'Pariz', note:'Orlean nema svoj aerodrom — najbliži je Pariz (oko 1h30 vožnje).'},
  'mec': {nearest:'Nansi', note:'Mec deli aerodrom sa Nansijem (Metz-Nancy-Loren), udaljen oko 40 min vožnje.'},
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
  'hajdelberg': {nearest:'Frankfurt', note:'Hajdelberg nema svoj aerodrom — najbliži je Frankfurt (oko 1h vožnje).'},
  'bon': {nearest:'Keln', note:'Bon nema svoj aerodrom — aerodrom Keln praktično nosi i njegovo ime (Keln/Bon), udaljen oko 30 min vožnje.'},
  'visbaden': {nearest:'Frankfurt', note:'Visbaden nema svoj aerodrom — najbliži je Frankfurt (oko 40 min vožnje).'},
  'majnc': {nearest:'Frankfurt', note:'Majnc nema svoj aerodrom — najbliži je Frankfurt (oko 45 min vožnje).'},
  'ahen': {nearest:'Keln', note:'Ahen nema svoj aerodrom — najbliži je Keln/Bon (oko 1h vožnje).'},
  'regensburg': {nearest:'Nirnberg', note:'Regensburg nema svoj aerodrom — najbliži je Nirnberg (oko 1h20 vožnje).'},
  'vurcburg': {nearest:'Frankfurt', note:'Vurcburg nema svoj aerodrom — najbliži je Frankfurt (oko 1h30 vožnje).'},
  'trir': {nearest:'Luksemburg', note:'Trir nema svoj aerodrom — najbliži je Luksemburg (oko 1h vožnje).'},
  'potsdam': {nearest:'Berlin', note:'Potsdam nema svoj aerodrom — najbliži je Berlin (oko 30 min vožnje).'},
  'kil': {nearest:'Hamburg', note:'Kil nema svoj aerodrom sa redovnim letovima — najbliži je Hamburg (oko 1h30 vožnje).'},
  'magdeburg': {nearest:'Berlin', note:'Magdeburg nema svoj aerodrom — najbliži je Berlin (oko 2h vožnje).'},
  'kemnic': {nearest:'Lajpcig', note:'Kemnic nema svoj aerodrom sa redovnim letovima — najbliži je Lajpcig (oko 1h vožnje).'},
  'ulm': {nearest:'Stutgart', note:'Ulm nema svoj aerodrom — najbliži je Štutgart (oko 1h vožnje).'},
  'frajburg': {nearest:'Bazel', note:'Frajburg nema svoj aerodrom — najbliži je Bazel (oko 1h vožnje).'},
  'konstanc': {nearest:'Fridrihshafen', note:'Konstanc nema svoj aerodrom — najbliži je Fridrihshafen (oko 40 min vožnje), Cirih je alternativa preko granice.'},
  // --- Holandija: dodatni aerodromi ---
  'ajndhoven': {hasAirport:true, limited:true},
  'mastriht': {hasAirport:true, limited:true},
  'groningen': {hasAirport:true, limited:true},
  // --- Holandija: bez sopstvenog aerodroma ---
  'hag': {nearest:'Roterdam', note:'Hag deli aerodrom sa Roterdamom (Rotterdam-Hag), udaljen oko 25 min vožnje.'},
  'utreht': {nearest:'Amsterdam', note:'Utreht nema svoj aerodrom — najbliži je Amsterdam (oko 30 min vožnje).'},
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
  // --- Norveška: bez sopstvenog aerodroma ---
  'lilehamer': {nearest:'Oslo', note:'Lilehamer nema svoj aerodrom — najbliži je Oslo (oko 2h vožnje).'},
  'gejrangerfjord': {nearest:'Olesund', note:'Gejrangerfjord nema svoj aerodrom — najbliži je Olesund (oko 2h vožnje, uz trajekt).'},
  // --- Švedska: dodatni aerodromi ---
  'malme': {hasAirport:true, limited:true},
  'umeo': {hasAirport:true, limited:true},
  'lulea': {hasAirport:true, limited:true},
  'vizbi': {hasAirport:true, limited:true},
  'sundsval': {hasAirport:true, limited:true},
  'kalmar': {hasAirport:true, limited:true},
  // --- Švedska: bez sopstvenog aerodroma ---
  'upsala': {nearest:'Stokholm', note:'Upsala nema svoj aerodrom — najbliži je Stokholm (oko 45 min vožnje).'},
  'lund': {nearest:'Malme', note:'Lund nema svoj aerodrom — najbliži je Malme (oko 20 min vožnje).'},
  // --- Danska: dodatni aerodromi ---
  'olborg': {hasAirport:true, limited:true},
  'bilund': {hasAirport:true, limited:true},
  'arhus': {hasAirport:true, limited:true},
  'bornholm': {hasAirport:true, limited:true},
  'esbjerg': {hasAirport:true, limited:true},
  // --- Danska: bez sopstvenog aerodroma ---
  'odense': {nearest:'Bilund', note:'Odense nema svoj aerodrom sa redovnim letovima — najbliži je Bilund (oko 1h vožnje).'},
  'roskilde': {nearest:'Kopenhagen', note:'Roskilde nema svoj aerodrom sa redovnim letovima — najbliži je Kopenhagen (oko 30 min vožnje).'},
  'helsingor': {nearest:'Kopenhagen', note:'Helsingor nema svoj aerodrom — najbliži je Kopenhagen (oko 45 min vožnje).'},
  // --- Finska: dodatni aerodromi ---
  'tampere': {hasAirport:true, limited:true},
  'turku': {hasAirport:true, limited:true},
  'rovanijemi': {hasAirport:true, limited:true},
  'ulu': {hasAirport:true, limited:true},
  'vaasa': {hasAirport:true, limited:true},
  'kuopio': {hasAirport:true, limited:true},
  'ivalo': {hasAirport:true, limited:true},
  // --- Finska: bez sopstvenog aerodroma ---
  'lahti': {nearest:'Helsinki', note:'Lahti nema svoj aerodrom — najbliži je Helsinki (oko 1h vožnje).'},
  // --- Švajcarska: dodatni aerodromi ---
  'bazel': {hasAirport:true, limited:true},
  'bern': {hasAirport:true, limited:true},
  'lugano': {hasAirport:true, limited:true},
  // --- Švajcarska: bez sopstvenog aerodroma ---
  'sankt moric': {nearest:'Cirih', note:'Sankt Moric nema komercijalni aerodrom — najbliži je Cirih (oko 3h vožnje).'},
  'lucern': {nearest:'Cirih', note:'Lucern nema svoj aerodrom — najbliži je Cirih (oko 50 min vožnje).'},
  'interlaken': {nearest:'Bern', note:'Interlaken nema svoj aerodrom — najbliži je Bern (oko 1h vožnje), Cirih je alternativa.'},
  'cermat': {nearest:'Ženeva', note:'Cermat nema svoj aerodrom — najbliži je Ženeva (oko 3h vožnje).'},
  'davos': {nearest:'Cirih', note:'Davos nema svoj aerodrom — najbliži je Cirih (oko 2h vožnje).'},
  // --- Mađarska: dodatni aerodromi ---
  'debrecin': {hasAirport:true, limited:true},
  // --- Rusija (evropski deo): aerodromi ---
  'moskva': {hasAirport:true},
  'sanktpeterburg': {hasAirport:true},
  'soci': {hasAirport:true, limited:true},
  'kalinjingrad': {hasAirport:true, limited:true},
  'kazanj': {hasAirport:true, limited:true},
  'krasnodar': {hasAirport:true, limited:true},
  // --- Ukrajina: vazdušni prostor zatvoren za civilni saobraćaj od feb. 2022,
  //     nema redovnih putničkih letova ni sa jednog ukrajinskog aerodroma dok
  //     traje rat — zato se ovde ne tretiraju kao hasAirport:true, već se
  //     korisniku predlaže najbliži aerodrom u susednoj zemlji. ---
  'kijev': {nearest:'Varsava', note:'Kijev nema aktivan aerodrom — vazdušni prostor Ukrajine je zatvoren za civilni saobraćaj od 2022. Najbliži aktivan aerodrom je Varšava (oko 8h vožnje), realnije je razmotriti voz/autobus preko Poljske.'},
  'lavov': {nearest:'Zesuv', note:'Lavov nema aktivan aerodrom — vazdušni prostor Ukrajine je zatvoren za civilni saobraćaj od 2022. Najbliži aktivan aerodrom je Žešuv u Poljskoj (oko 2h vožnje).'},
  'odesa': {nearest:'Kisinjev', note:'Odesa nema aktivan aerodrom — vazdušni prostor Ukrajine je zatvoren za civilni saobraćaj od 2022. Najbliži aktivan aerodrom je Kišinjev u Moldaviji (oko 3h vožnje).'},
  'harkov': {nearest:'Varsava', note:'Harkov nema aktivan aerodrom — vazdušni prostor Ukrajine je zatvoren za civilni saobraćaj od 2022, a grad je blizu ratne zone.'}
};
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
  for (const key in AIRPORT_DB){
    if (norm === key || norm.startsWith(key + ' ') || norm.startsWith(key + ',') || norm.includes(' ' + key)){
      return AIRPORT_DB[key];
    }
  }
  if (norm.length >= 4){
    const candidates = Object.keys(AIRPORT_DB).filter(key => key.startsWith(norm));
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
  let sub = opts.flightPref === 'cheapest' ? 'jedno presedanje' : 'direktan let';
  if (opts.limitedNetwork && sub.includes('direktan let')){
    sub = sub.replace('direktan let', 'let (proveri sezonske/direktne linije)');
  }
  if (opts.arrival !== (opts.destRaw || '').trim() && sub.includes('direktan let')){
    sub = sub.replace('direktan let', 'let do ' + opts.arrival + ', najbližeg aerodroma');
  }
  if (opts.adults > 1) sub += ' · cena za svih ' + opts.adults + ' putnika';
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
  const sub = flightSubText({flightPref, arrival, destRaw: dest, adults, limitedNetwork});
  return {
    provider:p.provider, providerLabel:p.name, type:'flight',
    name: carrier + (departure ? ' ' + departure : '') + ' → ' + arrival,
    sub, price, currency:'EUR',
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
  const names = {
    3:[dest+' Hostel','City Rooms','Studio Plaza'],
    4:[dest+' Hotel', 'Aegean Suites', 'Old Town Residence'],
    5:['Grand '+dest, 'Royal Palace Hotel', dest+' Luxury Collection']
  };
  const arr = names[stars];
  const rooms = Math.ceil(adults/2);
  return {
    provider:p.provider, providerLabel:p.name, type:'hotel',
    name: arr[Math.floor(rng()*arr.length)],
    sub: nights+' noć' + (nights===1?'':'i') + ' · ' + stars + '★ · ocena ' + rating.toFixed(1)
      + (rooms > 1 ? ' · cena za ' + rooms + ' sobe' : ''),
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
    sub: days+' dana · automatski/ručni menjač' + (carType==='suv' ? ' · SUV' : ''),
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
  const opts = {
    budget:['Obilazak starog grada peške'],
    best:['Poludnevna tura s vodičem','Ulaznica za glavne znamenitosti'],
    comfort:['Privatna tura s vodičem','Gastronomska tura uz degustaciju']
  };
  const arr = opts[tier];
  const label = arr[Math.floor(rng()*arr.length)];
  return {
    provider:p.provider, providerLabel:p.name, type:'activity',
    name: (count > 1 ? count + ' aktivnosti (npr. ' + label + ')' : label) + ' — ' + dest,
    sub: 'po osobi' + (count > 1 ? ' · ' + count + ' aktivnosti' : ''),
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
  best:    {fuel:45, tolls:28, insurance:22, esim:12},
  comfort: {fuel:58, tolls:34, insurance:34, esim:18},
  budget:  {fuel:28, tolls:14, insurance:14, esim:8}
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
  const saysPresedanje = sub.includes('presedanje');
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

/* ==========================================================
   PRICING + SCORE ENGINE
========================================================== */
function buildPackage(rng, dest, nights, days, adults, tier, flags, factor, originCode, seasonMult, seeds){
  factor = factor || 1;
  seasonMult = seasonMult || 1; // sezona (seasonFactor) — samo let/smeštaj/auto
  const flight = flags.flight ? fetchFlights(rng, dest, adults, tier, originCode, flags, seeds) : null;
  const hotel  = flags.hotel  ? fetchHotel(rng, dest, nights, adults, tier, flags, seeds) : null;
  const car    = flags.car    ? fetchCar(rng, days, tier, flags, seeds) : null;
  const activity = flags.activity ? fetchActivity(rng, dest, tier, flags, seeds) : null;
  const extras = EXTRA_COSTS[tier];

  if (flight) assertFlightSubConsistency(flags.flightPref || 'direct', flight.sub, 'buildPackage (' + tier + ')');

  // Tržišni faktor menja samo cenu, ne i ime/opis stavke (ti se biraju
  // gore, iz rng niza, pre ove linije — pa ostaju stabilni iz dana u dan).
  if (flight) flight.price = Math.round(flight.price * factor * seasonMult);
  if (hotel) hotel.price = Math.round(hotel.price * factor * seasonMult);
  if (car) car.price = Math.round(car.price * factor * seasonMult);
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

  // Quality score je fiksna vrednost po tier-u (marketinški nivo paketa —
  // Comfort > Best Value > Budget), NE izvedena iz stvarnog sadržaja: tip
  // leta, tip auta i tražena kategorija hotela su isti izbor na sve tri
  // kartice (vidi flags.flightPref/carPref/hotelStars gore), pa razlika
  // između kartica nije u TOME šta je uključeno, već samo u ceni i sitnim
  // razlikama unutar iste kategorije (npr. koji tačno hotel od nekoliko u
  // istoj zvezdičnoj klasi, ili koja avio-kompanija kad korisnik nije
  // tražio konkretnu).
  // Sad izveden iz STVARNIH perks-ova uključenih stavki (vidi qualityFromPerks),
  // a ne iz fiksne konstante po tier-u.
  const qualityScore = qualityFromPerks([flight, hotel, car], tier);

  return {tier, flight, hotel, car, activity, fuel, tolls, insuranceCost, esimCost, total, qualityScore,
    // Stvarno tražene kategorije (isti izbor za sve tri kartice — vidi
    // komentar uz `flags` u runSearch) — pkgDescText ih koristi umesto da
    // nagađa tip leta/auta iz tier-a, jer tier više ne menja KATEGORIJU
    // koju je korisnik tražio, samo cenu/kvalitet unutar nje.
    flightPref: flags.flightPref, carPref: flags.carPref};
}

/* ==========================================================
   DEV-ONLY PROVERA: invarijante nad buildPackage.
   Isti mehanizam/razlog kao assertFlightSubConsistency iznad, ali
   umesto da hvata JEDNU vrstu neusklađenosti, prolazi kroz mnogo
   nasumičnih kombinacija ulaza (destinacija/noći/putnici/flags) i
   proverava tri opšta svojstva koja moraju da važe za SVAKU
   kombinaciju, bez obzira na to kako se pricing logika menja u
   budućnosti:
     1) total === zbir uključenih stavki (+ gorivo + putarine) —
        lako se pokvari ako neko doda novo polje u cenu a zaboravi
        da ga uključi u `total`, ili obrnuto.
     2) stavka koju `flags` nije tražio(la) MORA biti null — nema
        "duha" u paketu (npr. auto na kartici kad Auto toggle nije
        uključen).
     3) cena raste Budget ≤ Best ≤ Comfort. Do 19.9. je ovo znalo da
        pukne na ~47% nasumičnih ulaza jer je svaka tier kartica
        nezavisno izvlačila SOPSTVENU nasumičnu "bazu" cene (jitter
        uporediv po veličini sa samim tier-množiocem). Otkriveno baš
        preko ove provere. Popravljeno deljenim `priceSeeds`
        (buildPriceSeeds) koji se izvlače JEDNOM po pretrazi i prosleđuju
        u sve tri buildPackage kartice — sad je redosled matematički
        garantovan (tier-množilac je jedina promenljiva), osim retkog
        teoretskog slučaja gde zaokruživanje na ceo broj izjednači dva
        susedna tier-a (jednako ≠ kršenje ≤). Test i dalje prolazi kroz
        60 različitih ulaza, sad kao regresiona zaštita da se neko opet
        ne vrati na nezavisno izvlačenje po tier-u.
   `rng` se namerno DELI između tri poziva, istim redosledom
   (best → comfort → budget) kao u computePackagesLocally — testira
   se stvarni redosled poziva iz produkcije, ne tri izolovana rng-a.
========================================================== */
function runBuildPackageInvariantChecks(){
  if (!DEV_MODE) return;
  const TIERS_IN_ORDER = ['best', 'comfort', 'budget'];
  const FLAG_COMBOS = [
    {flight:true,  hotel:true,  car:true,  activity:true},
    {flight:true,  hotel:true,  car:false, activity:false},
    {flight:false, hotel:true,  car:false, activity:true},
    {flight:true,  hotel:false, car:true,  activity:false},
    {flight:false, hotel:false, car:false, activity:true}
  ];
  const DESTS = ['Atina', 'Rim', 'Barselona', 'Budva', 'Beč'];
  const TRIALS = 60;
  let failures = 0;

  for (let i = 0; i < TRIALS; i++){
    const seed = 1000 + i * 97;
    const rng = seededRandom(seed);
    const dest = DESTS[i % DESTS.length];
    const nights = 2 + (i % 7);
    const days = nights + 1;
    const adults = 1 + (i % 4);
    const flags = {
      ...FLAG_COMBOS[i % FLAG_COMBOS.length],
      flightPref: ['direct', 'cheapest', 'airline'][i % 3],
      carPref: i % 2 ? 'suv' : 'small',
      hotelStars: [3, 4, 5][i % 3],
      activityCount: 1 + (i % 3)
    };
    const originCode = 'BEG';
    const inputDesc = 'seed=' + seed + ' dest=' + dest + ' nights=' + nights + ' adults=' + adults + ' flags=' + JSON.stringify(flags);
    const priceSeeds = buildPriceSeeds(rng);

    const results = {};
    TIERS_IN_ORDER.forEach(tier => {
      results[tier] = buildPackage(rng, dest, nights, days, adults, tier, flags, 1, originCode, 1, priceSeeds);
    });

    TIERS_IN_ORDER.forEach(tier => {
      const pkg = results[tier];

      // 1) total === zbir uključenih stavki
      const sum = (pkg.flight ? pkg.flight.price : 0) + (pkg.hotel ? pkg.hotel.price : 0)
                + (pkg.car ? pkg.car.price : 0) + (pkg.activity ? pkg.activity.price : 0)
                + pkg.fuel + pkg.tolls;
      if (sum !== pkg.total){
        failures++;
        console.error('[sklopi][invariant] total (' + pkg.total + ') != zbir stavki (' + sum + '). tier=' + tier + ' — ' + inputDesc);
      }

      // 2) nema stavke koju korisnik nije tražio
      ['flight', 'hotel', 'car', 'activity'].forEach(key => {
        const requested = !!flags[key];
        const present = !!pkg[key];
        if (requested !== present){
          failures++;
          console.error('[sklopi][invariant] stavka "' + key + '" ne prati flags (traženo=' + requested + ', prisutno=' + present + '). tier=' + tier + ' — ' + inputDesc);
        }
      });
    });

    // 3) Budget ≤ Best ≤ Comfort
    if (results.budget.total > results.best.total || results.best.total > results.comfort.total){
      failures++;
      console.error('[sklopi][invariant] cena nije Budget≤Best≤Comfort (budget=' + results.budget.total
        + ', best=' + results.best.total + ', comfort=' + results.comfort.total + ') — ' + inputDesc);
    }
  }

  if (failures){
    console.error('[sklopi][invariant] ukupno ' + failures + ' problema u buildPackage invarijantama (vidi gore).');
  } else {
    console.log('[sklopi][invariant] buildPackage: svih ' + TRIALS + ' probnih kombinacija prošlo (total/stavke/redosled cena).');
  }
}
runBuildPackageInvariantChecks();

// label ostaje kao nazivi paketa (Best Value / Comfort / Budget); desc je
// getter koji ide kroz t(), pa uvek prati trenutni jezik (nije keširan pri
// učitavanju skripte).
const TIER_META = {
  best:    {label:'Best Value', get desc(){ return t('tier_best_desc'); }},
  comfort: {label:'Comfort',    get desc(){ return t('tier_comfort_desc'); }},
  budget:  {label:'Budget',     get desc(){ return t('tier_budget_desc'); }}
};

/* Opis kartice ponude mora pratiti stvarni sadržaj paketa — koje usluge
   su STVARNO uključene (let/hotel/auto/aktivnosti) — a ne fiksni tekst po
   tier-u. Korisnik bira usluge preko toggle-a iznad forme (Letovi/Smeštaj/
   Auto/Aktivnosti), pa npr. Comfort ponuda bez izabranog Auto toggle-a ne
   sme da u opisu i dalje piše "prostraniji auto" kad auto nije ni prikazan
   na kartici.
   Tip leta i tip auta su TAKOĐE isti izbor na sve tri kartice (flags.
   flightPref/carPref iz upitnika važe podjednako za best/comfort/budget —
   tier menja samo cenu/kvalitet, ne i kategoriju), pa se ovde opisuju na
   osnovu STVARNOG izbora (pkg.flightPref/pkg.carPref), a ne fiksno po
   tier-u — inače bi npr. Comfort pisao "direktan let" i kad je korisnik
   tražio najjeftiniji let sa presedanjem. Iz istog razloga, odsustvo auta
   (kad Auto toggle nije uključen) važi podjednako za sve tri kartice, pa
   se ne ističe kao posebna "Budget prednost". */
function pkgDescText(pkg){
  const bits = [];
  if (pkg.hotel) bits.push(t(pkg.tier === 'comfort' ? 'pkg_desc_hotel_better' : pkg.tier === 'budget' ? 'pkg_desc_hotel_cheapest' : 'pkg_desc_hotel_verified'));
  if (pkg.flight){
    bits.push(t(pkg.flightPref === 'cheapest' ? 'pkg_desc_flight_stopover'
      : pkg.flightPref === 'airline' ? 'pkg_desc_flight_airline'
      : 'pkg_desc_flight_direct'));
  }
  if (pkg.car) bits.push(t(pkg.carPref === 'suv' ? 'pkg_desc_car_spacious' : 'pkg_desc_car'));
  if (pkg.activity) bits.push(t('pkg_desc_activities'));

  if (!bits.length) return TIER_META[pkg.tier].label;

  let text = bits.length === 1
    ? bits[0]
    : bits.slice(0, -1).join(', ') + ' ' + t('pkg_desc_and') + ' ' + bits[bits.length - 1];
  text = text.charAt(0).toUpperCase() + text.slice(1);

  return text;
}

// Kartice se iscrtavaju jednom (pkgHtml), pa bez ovoga opis ostaje na starom
// jeziku posle prebacivanja SR/EN/RU. Osveži samo .pkg-desc, ne ceo rezultat.
const _prevOnLangChangePkgDesc = window.onLangChange;
window.onLangChange = function(lang){
  if (typeof _prevOnLangChangePkgDesc === 'function') _prevOnLangChangePkgDesc(lang);
  const pkgs = window._lastSearchPkgs;
  if (!Array.isArray(pkgs)) return;
  document.querySelectorAll('.pkg .pkg-desc').forEach(el => {
    const card = el.closest('.pkg');
    const pkg = pkgs.find(p => card.classList.contains(p.tier));
    if (pkg) el.textContent = pkgDescText(pkg);
  });
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
const STATS_STORAGE_KEY = 'sklopi_stats_v1';
/* ---- Minimalne "prikazane" vrednosti za brojače — stvarni state ispod
   se i dalje normalno broji i čuva, ali se na ekranu NIKAD ne prikazuje
   0 (ili prazna poslednja destinacija), da sajt ne deluje prazno/nov
   novom posetiocu ili posle brisanja localStorage-a. ---- */
const STAT_DISPLAY_FLOOR = { searches: 182, clicks: 96 };
const STAT_LAST_DEST_FALLBACK = 'Atina';
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

/* ==========================================================
   VALUTA — EUR/RSD prikaz

   Sve cene na sajtu su i onako ilustrativna procena (vidi
   disclaimer_illustrative), pa RSD prikaz koristi FIKSAN kurs za
   konverziju, ne uživo/NBS kurs — dovoljno je za "koliko je to
   otprilike u dinarima", ne za tačno plaćanje. Kad affiliate API
   proradi i cene postanu prave, ovde bi trebalo uvesti pravi kurs
   (ili konvertovati na serveru, zavisno od partnera).

   fmtEUR() ostaje pod istim imenom (koristi se na 20+ mesta u
   kodu) da bi se izbeglo preimenovanje svuda — samo je interno
   postala "prikaži cenu u trenutno izabranoj valuti".
========================================================== */
const RSD_PER_EUR = 117; // fiksni prikazni kurs, ažuriraj povremeno rucno
let currentCurrency = (localStorage.getItem('sklopi_currency') === 'RSD') ? 'RSD' : 'EUR';

function fmtEUR(n){
  if (currentCurrency === 'RSD'){
    return Math.round(n * RSD_PER_EUR).toLocaleString('sr-RS') + ' RSD';
  }
  return '€' + n.toLocaleString('de-DE');
}

function applyCurrencyToggleUi(){
  const btn = document.getElementById('currencySwitchBtn');
  if (!btn) return;
  btn.setAttribute('data-currency', currentCurrency);
  btn.setAttribute('aria-pressed', currentCurrency === 'RSD' ? 'true' : 'false');
}

// Ponovo iscrtava VEĆ PRIKAZANE cene u novoj valuti — ne pokreće novu
// pretragu od nule. Builder je jeftin (renderBuilder je sinhron, isti
// deterministički seed → isti brojevi, samo nov format), a gotove
// ponude (Budget/Best/Comfort) prolaze kroz runSearch jer je to jedini
// siguran ulaz koji renderResults ume da pozove sa svim potrebnim
// argumentima (originCode, autoReveal...); isti seed → cene se ne
// menjaju, samo se ponovo formatiraju.
function refreshDisplayedPrices(){
  const builderPanel = document.getElementById('builderPanel');
  if (window._lastBuilderPkg && builderPanel && builderPanel.style.display !== 'none'){
    renderBuilder();
  }
  const results = document.getElementById('results');
  if (window._lastSearchCtx && results && results.classList.contains('visible') && validateSearchInputs().ok){
    runSearch(false); // tiho preskoči ako je forma u međuvremenu izmenjena u neispravno stanje
  }
}

function setCurrency(cur){
  currentCurrency = (cur === 'RSD') ? 'RSD' : 'EUR';
  localStorage.setItem('sklopi_currency', currentCurrency);
  applyCurrencyToggleUi();
  refreshDisplayedPrices();
}

function attachAffiliateLinks(pkg, dest, from, to, adults, extra){
  // extra = {originCode, flags} — polazište i izbori iz upitnika, da link
  // vodi na ono što kartica opisuje (ruta, tip leta, zvezdice, sobe).
  extra = extra || {};
  const f = extra.flags || {};
  const ctx = {
    dest, from, to, adults,
    originCode: extra.originCode || '',
    flightPref: f.flightPref, hotelStars: f.hotelStars,
    prioritizeRating: f.prioritizeRating, prioritizeLocation: f.prioritizeLocation,
    carPref: f.carPref
  };
  pkg.dest = dest; // sačuvano na pkg da bi analitika (GA4 affiliate_click) znala destinaciju/tier klika
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
// window.SKLOPI_API_BASE = 'https://api.sklopi.rs';
const API_BASE = window.SKLOPI_API_BASE || '';

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
  {name:'Čačak', extra:'Srbija'}, {name:'Kraljevo', extra:'Srbija'}, {name:'Kruševac', extra:'Srbija'},
  {name:'Šabac', extra:'Srbija'}, {name:'Smederevo', extra:'Srbija'}, {name:'Užice', extra:'Srbija'},
  {name:'Vranje', extra:'Srbija'}, {name:'Leskovac', extra:'Srbija'}, {name:'Zaječar', extra:'Srbija'},
  {name:'Valjevo', extra:'Srbija'}, {name:'Sombor', extra:'Srbija'}, {name:'Zrenjanin', extra:'Srbija'},
  {name:'Pančevo', extra:'Srbija'}, {name:'Vršac', extra:'Srbija'}, {name:'Loznica', extra:'Srbija'},
  {name:'Sremska Mitrovica', extra:'Srbija'}, {name:'Bečej', extra:'Srbija'}, {name:'Kikinda', extra:'Srbija'},
  {name:'Pirot', extra:'Srbija'}, {name:'Jagodina', extra:'Srbija'}, {name:'Paraćin', extra:'Srbija'},
  {name:'Aranđelovac', extra:'Srbija'}, {name:'Požarevac', extra:'Srbija'}, {name:'Bor', extra:'Srbija'},
  {name:'Negotin', extra:'Srbija'}, {name:'Priboj', extra:'Srbija'}, {name:'Prijepolje', extra:'Srbija'},
  {name:'Sjenica', extra:'Srbija'}, {name:'Novi Pazar', extra:'Srbija'}, {name:'Ivanjica', extra:'Srbija'},
  {name:'Gornji Milanovac', extra:'Srbija'}, {name:'Vrbas', extra:'Srbija'}, {name:'Inđija', extra:'Srbija'},
  {name:'Ruma', extra:'Srbija'}, {name:'Sremski Karlovci', extra:'Srbija'}, {name:'Bajina Bašta', extra:'Srbija'},
  // Srbija — planine
  {name:'Tara', extra:'Srbija'}, {name:'Divčibare', extra:'Srbija'}, {name:'Stara Planina', extra:'Srbija'},
  {name:'Golija', extra:'Srbija'}, {name:'Rtanj', extra:'Srbija'}, {name:'Zlatar', extra:'Srbija'},
  {name:'Mokra Gora', extra:'Srbija'}, {name:'Fruška Gora', extra:'Srbija'}, {name:'Vlasina', extra:'Srbija'}, {name:'Goč', extra:'Srbija'},
  // Srbija — banje
  {name:'Sokobanja', extra:'Srbija'}, {name:'Niška Banja', extra:'Srbija'}, {name:'Banja Koviljača', extra:'Srbija'},
  {name:'Banja Vrujci', extra:'Srbija'}, {name:'Banja Kanjiža', extra:'Srbija'}, {name:'Prolom Banja', extra:'Srbija'},
  {name:'Bukovička Banja', extra:'Srbija'}, {name:'Vranjska Banja', extra:'Srbija'}, {name:'Mataruška Banja', extra:'Srbija'},
  {name:'Sijarinska Banja', extra:'Srbija'}, {name:'Josanička Banja', extra:'Srbija'}, {name:'Ribarska Banja', extra:'Srbija'},
  // Srbija — jezera i prirodne atrakcije
  {name:'Palić', extra:'Srbija'}, {name:'Zlatarsko jezero', extra:'Srbija'}, {name:'Perućac', extra:'Srbija'},
  {name:'Srebrno jezero', extra:'Srbija'}, {name:'Borsko jezero', extra:'Srbija'}, {name:'Gružansko jezero', extra:'Srbija'},
  {name:'Đerdap', extra:'Srbija'}, {name:'Uvac', extra:'Srbija'}, {name:'Golubac', extra:'Srbija'},
  {name:'Ćuprija', extra:'Srbija'}, {name:'Prokuplje', extra:'Srbija'}, {name:'Svilajnac', extra:'Srbija'},
  {name:'Senta', extra:'Srbija'}, {name:'Kanjiža', extra:'Srbija'}, {name:'Temerin', extra:'Srbija'},
  // Region
  {name:'Podgorica', extra:'Crna Gora'}, {name:'Budva', extra:'Crna Gora'}, {name:'Kotor', extra:'Crna Gora'},
  {name:'Herceg Novi', extra:'Crna Gora'}, {name:'Igalo', extra:'Crna Gora'}, {name:'Bar', extra:'Crna Gora'},
  {name:'Tivat', extra:'Crna Gora'}, {name:'Petrovac', extra:'Crna Gora'}, {name:'Sutomore', extra:'Crna Gora'},
  {name:'Ulcinj', extra:'Crna Gora'}, {name:'Perast', extra:'Crna Gora'}, {name:'Risan', extra:'Crna Gora'},
  {name:'Žabljak', extra:'Crna Gora'}, {name:'Kolašin', extra:'Crna Gora'}, {name:'Nikšić', extra:'Crna Gora'},
  {name:'Cetinje', extra:'Crna Gora'}, {name:'Rožaje', extra:'Crna Gora'},
  {name:'Bijelo Polje', extra:'Crna Gora'}, {name:'Pljevlja', extra:'Crna Gora'}, {name:'Berane', extra:'Crna Gora'},
  {name:'Plav', extra:'Crna Gora'}, {name:'Mojkovac', extra:'Crna Gora'}, {name:'Danilovgrad', extra:'Crna Gora'},
  {name:'Andrijevica', extra:'Crna Gora'}, {name:'Gusinje', extra:'Crna Gora'}, {name:'Plužine', extra:'Crna Gora'}, {name:'Šavnik', extra:'Crna Gora'},
  {name:'Durmitor', extra:'Crna Gora'}, {name:'Biogradska Gora', extra:'Crna Gora'}, {name:'Lovćen', extra:'Crna Gora'},
  {name:'Skadarsko Jezero', extra:'Crna Gora'},
  {name:'Virpazar', extra:'Crna Gora'}, {name:'Ada Bojana', extra:'Crna Gora'}, {name:'Čanj', extra:'Crna Gora'},
  {name:'Buljarica', extra:'Crna Gora'}, {name:'Prčanj', extra:'Crna Gora'}, {name:'Ostrog', extra:'Crna Gora'},
  {name:'Sarajevo', extra:'Bosna i Hercegovina'}, {name:'Mostar', extra:'Bosna i Hercegovina'}, {name:'Banja Luka', extra:'Bosna i Hercegovina'},
  {name:'Trebinje', extra:'Bosna i Hercegovina'}, {name:'Bihać', extra:'Bosna i Hercegovina'}, {name:'Tuzla', extra:'Bosna i Hercegovina'},
  {name:'Zenica', extra:'Bosna i Hercegovina'},
  {name:'Jajce', extra:'Bosna i Hercegovina'}, {name:'Travnik', extra:'Bosna i Hercegovina'}, {name:'Konjic', extra:'Bosna i Hercegovina'},
  {name:'Neum', extra:'Bosna i Hercegovina'}, {name:'Bijeljina', extra:'Bosna i Hercegovina'}, {name:'Doboj', extra:'Bosna i Hercegovina'},
  {name:'Prijedor', extra:'Bosna i Hercegovina'}, {name:'Brčko', extra:'Bosna i Hercegovina'}, {name:'Foča', extra:'Bosna i Hercegovina'},
  {name:'Višegrad', extra:'Bosna i Hercegovina'},
  {name:'Bjelašnica', extra:'Bosna i Hercegovina'}, {name:'Jahorina', extra:'Bosna i Hercegovina'}, {name:'Vlašić', extra:'Bosna i Hercegovina'}, {name:'Kupres', extra:'Bosna i Hercegovina'},
  {name:'Blagaj', extra:'Bosna i Hercegovina'}, {name:'Počitelj', extra:'Bosna i Hercegovina'}, {name:'Vrelo Bosne', extra:'Bosna i Hercegovina'},
  {name:'Sutjeska', extra:'Bosna i Hercegovina'}, {name:'Una', extra:'Bosna i Hercegovina'}, {name:'Livno', extra:'Bosna i Hercegovina'},
  {name:'Zagreb', extra:'Hrvatska'}, {name:'Split', extra:'Hrvatska'}, {name:'Dubrovnik', extra:'Hrvatska'},
  {name:'Zadar', extra:'Hrvatska'}, {name:'Rijeka', extra:'Hrvatska'}, {name:'Pula', extra:'Hrvatska'}, {name:'Hvar', extra:'Hrvatska'},
  {name:'Makarska', extra:'Hrvatska'}, {name:'Trogir', extra:'Hrvatska'}, {name:'Šibenik', extra:'Hrvatska'}, {name:'Rovinj', extra:'Hrvatska'},
  {name:'Osijek', extra:'Hrvatska'}, {name:'Krk', extra:'Hrvatska'}, {name:'Poreč', extra:'Hrvatska'}, {name:'Umag', extra:'Hrvatska'},
  {name:'Opatija', extra:'Hrvatska'}, {name:'Cavtat', extra:'Hrvatska'}, {name:'Vis', extra:'Hrvatska'},
  {name:'Varaždin', extra:'Hrvatska'}, {name:'Karlovac', extra:'Hrvatska'}, {name:'Sisak', extra:'Hrvatska'},
  {name:'Vukovar', extra:'Hrvatska'}, {name:'Slavonski Brod', extra:'Hrvatska'}, {name:'Vinkovci', extra:'Hrvatska'},
  {name:'Đakovo', extra:'Hrvatska'}, {name:'Čakovec', extra:'Hrvatska'}, {name:'Bjelovar', extra:'Hrvatska'},
  {name:'Koprivnica', extra:'Hrvatska'}, {name:'Požega', extra:'Hrvatska'}, {name:'Virovitica', extra:'Hrvatska'},
  // Hrvatska — obala i ostrva
  {name:'Biograd na Moru', extra:'Hrvatska'}, {name:'Vodice', extra:'Hrvatska'}, {name:'Primošten', extra:'Hrvatska'},
  {name:'Omiš', extra:'Hrvatska'}, {name:'Baška Voda', extra:'Hrvatska'}, {name:'Brela', extra:'Hrvatska'}, {name:'Tučepi', extra:'Hrvatska'},
  {name:'Korčula', extra:'Hrvatska'}, {name:'Vela Luka', extra:'Hrvatska'}, {name:'Supetar', extra:'Hrvatska'}, {name:'Bol', extra:'Hrvatska'},
  {name:'Mali Lošinj', extra:'Hrvatska'}, {name:'Cres', extra:'Hrvatska'}, {name:'Rab', extra:'Hrvatska'}, {name:'Novalja', extra:'Hrvatska'},
  {name:'Pag', extra:'Hrvatska'}, {name:'Vrsar', extra:'Hrvatska'}, {name:'Fažana', extra:'Hrvatska'}, {name:'Kaštela', extra:'Hrvatska'},
  {name:'Mljet', extra:'Hrvatska'}, {name:'Lastovo', extra:'Hrvatska'}, {name:'Šolta', extra:'Hrvatska'},
  // Hrvatska — nacionalni parkovi, planine, banje
  {name:'Plitvička Jezera', extra:'Hrvatska'}, {name:'Krka', extra:'Hrvatska'}, {name:'Paklenica', extra:'Hrvatska'},
  {name:'Učka', extra:'Hrvatska'}, {name:'Medvednica', extra:'Hrvatska'},
  {name:'Varaždinske Toplice', extra:'Hrvatska'}, {name:'Stubičke Toplice', extra:'Hrvatska'},
  {name:'Krapinske Toplice', extra:'Hrvatska'}, {name:'Daruvarske Toplice', extra:'Hrvatska'},
  {name:'Velebit', extra:'Hrvatska'}, {name:'Biokovo', extra:'Hrvatska'},
  {name:'Skoplje', extra:'Severna Makedonija'}, {name:'Ohrid', extra:'Severna Makedonija'},
  {name:'Bitola', extra:'Severna Makedonija'}, {name:'Tetovo', extra:'Severna Makedonija'},
  {name:'Kumanovo', extra:'Severna Makedonija'}, {name:'Prilep', extra:'Severna Makedonija'}, {name:'Strumica', extra:'Severna Makedonija'},
  {name:'Gevgelija', extra:'Severna Makedonija'}, {name:'Veles', extra:'Severna Makedonija'}, {name:'Struga', extra:'Severna Makedonija'},
  {name:'Kruševo', extra:'Severna Makedonija'}, {name:'Mavrovo', extra:'Severna Makedonija'},
  {name:'Priština', extra:'Kosovo'}, {name:'Prizren', extra:'Kosovo'}, {name:'Peć', extra:'Kosovo'},
  {name:'Gnjilane', extra:'Kosovo'}, {name:'Mitrovica', extra:'Kosovo'}, {name:'Đakovica', extra:'Kosovo'}, {name:'Uroševac', extra:'Kosovo'},
  {name:'Brezovica', extra:'Kosovo'}, {name:'Rugova', extra:'Kosovo'}, {name:'Dečani', extra:'Kosovo'}, {name:'Gračanica', extra:'Kosovo'},
  {name:'Ljubljana', extra:'Slovenija'}, {name:'Bled', extra:'Slovenija'}, {name:'Piran', extra:'Slovenija'},
  {name:'Maribor', extra:'Slovenija'}, {name:'Kranjska Gora', extra:'Slovenija'}, {name:'Portorož', extra:'Slovenija'},
  {name:'Kranj', extra:'Slovenija'}, {name:'Celje', extra:'Slovenija'}, {name:'Novo Mesto', extra:'Slovenija'},
  {name:'Koper', extra:'Slovenija'}, {name:'Ptuj', extra:'Slovenija'}, {name:'Škofja Loka', extra:'Slovenija'},
  {name:'Kamnik', extra:'Slovenija'}, {name:'Idrija', extra:'Slovenija'},
  {name:'Postojna', extra:'Slovenija'}, {name:'Bohinj', extra:'Slovenija'}, {name:'Bovec', extra:'Slovenija'},
  {name:'Kobarid', extra:'Slovenija'}, {name:'Logarska Dolina', extra:'Slovenija'}, {name:'Rogaška Slatina', extra:'Slovenija'},
  {name:'Murska Sobota', extra:'Slovenija'}, {name:'Nova Gorica', extra:'Slovenija'}, {name:'Velenje', extra:'Slovenija'},
  {name:'Jesenice', extra:'Slovenija'}, {name:'Slovenj Gradec', extra:'Slovenija'},
  // Slovenija — banje
  {name:'Čatež', extra:'Slovenija'}, {name:'Terme Ptuj', extra:'Slovenija'}, {name:'Dolenjske Toplice', extra:'Slovenija'},
  {name:'Moravske Toplice', extra:'Slovenija'}, {name:'Laško', extra:'Slovenija'}, {name:'Radenci', extra:'Slovenija'},
  // Slovenija — planine
  {name:'Triglav', extra:'Slovenija'}, {name:'Vogel', extra:'Slovenija'}, {name:'Krvavec', extra:'Slovenija'},
  {name:'Pohorje', extra:'Slovenija'}, {name:'Mangart', extra:'Slovenija'},
  // Slovenija — turistički centri
  {name:'Škocjanske jame', extra:'Slovenija'}, {name:'Predjama', extra:'Slovenija'}, {name:'Vintgar', extra:'Slovenija'},
  // Slovenija — primorska mesta
  {name:'Izola', extra:'Slovenija'}, {name:'Ankaran', extra:'Slovenija'},
  {name:'Tirana', extra:'Albanija'}, {name:'Sarande', extra:'Albanija'},
  {name:'Drač', extra:'Albanija'}, {name:'Vlora', extra:'Albanija'}, {name:'Ksamil', extra:'Albanija'},
  {name:'Skadar', extra:'Albanija'}, {name:'Kruja', extra:'Albanija'}, {name:'Berat', extra:'Albanija'},
  {name:'Gjirokastra', extra:'Albanija'}, {name:'Pogradec', extra:'Albanija'},
  {name:'Dhermi', extra:'Albanija'}, {name:'Himara', extra:'Albanija'},
  {name:'Theth', extra:'Albanija'}, {name:'Valbona', extra:'Albanija'},
  {name:'Bukurešt', extra:'Rumunija'}, {name:'Kluž', extra:'Rumunija'}, {name:'Brašov', extra:'Rumunija'}, {name:'Konstanca', extra:'Rumunija'},
  {name:'Sibiu', extra:'Rumunija'}, {name:'Temišvar', extra:'Rumunija'}, {name:'Jaši', extra:'Rumunija'}, {name:'Sinaja', extra:'Rumunija'}, {name:'Bran', extra:'Rumunija'}, {name:'Mamaja', extra:'Rumunija'},
  {name:'Sofija', extra:'Bugarska'}, {name:'Varna', extra:'Bugarska'}, {name:'Burgas', extra:'Bugarska'},
  {name:'Plovdiv', extra:'Bugarska'}, {name:'Nesebar', extra:'Bugarska'}, {name:'Bansko', extra:'Bugarska'},
  {name:'Ruse', extra:'Bugarska'}, {name:'Stara Zagora', extra:'Bugarska'}, {name:'Pleven', extra:'Bugarska'},
  {name:'Veliko Trnovo', extra:'Bugarska'}, {name:'Blagoevgrad', extra:'Bugarska'}, {name:'Šumen', extra:'Bugarska'},
  {name:'Sliven', extra:'Bugarska'}, {name:'Vidin', extra:'Bugarska'}, {name:'Dobrič', extra:'Bugarska'},
  {name:'Kjustendil', extra:'Bugarska'}, {name:'Gabrovo', extra:'Bugarska'}, {name:'Haskovo', extra:'Bugarska'},
  // Bugarska — banje
  {name:'Sandanski', extra:'Bugarska'}, {name:'Velingrad', extra:'Bugarska'}, {name:'Hisarja', extra:'Bugarska'},
  {name:'Devin', extra:'Bugarska'}, {name:'Pavel Banja', extra:'Bugarska'}, {name:'Bankja', extra:'Bugarska'},
  // Bugarska — planine
  {name:'Borovec', extra:'Bugarska'}, {name:'Pamporovo', extra:'Bugarska'}, {name:'Vitoša', extra:'Bugarska'},
  {name:'Čepelare', extra:'Bugarska'}, {name:'Rila', extra:'Bugarska'},
  // Bugarska — turistički centri
  {name:'Koprivštica', extra:'Bugarska'}, {name:'Melnik', extra:'Bugarska'}, {name:'Rilski manastir', extra:'Bugarska'},
  {name:'Trjavna', extra:'Bugarska'}, {name:'Arbanasi', extra:'Bugarska'},
  // Bugarska — primorska mesta
  {name:'Sozopol', extra:'Bugarska'}, {name:'Sunčev Breg', extra:'Bugarska'}, {name:'Zlatni Pjasci', extra:'Bugarska'},
  {name:'Primorsko', extra:'Bugarska'}, {name:'Balčik', extra:'Bugarska'}, {name:'Kavarna', extra:'Bugarska'},
  {name:'Carevo', extra:'Bugarska'}, {name:'Pomorije', extra:'Bugarska'}, {name:'Ahtopol', extra:'Bugarska'},
  // Grčka i Egej
  {name:'Atina', extra:'Grčka'}, {name:'Solun', extra:'Grčka'}, {name:'Krf', extra:'Grčka'},
  {name:'Santorini', extra:'Grčka'}, {name:'Mikonos', extra:'Grčka'}, {name:'Rodos', extra:'Grčka'},
  {name:'Krit', extra:'Grčka'}, {name:'Halkidiki', extra:'Grčka'},
  {name:'Zakintos', extra:'Grčka'}, {name:'Kefalonija', extra:'Grčka'}, {name:'Lefkada', extra:'Grčka'},
  {name:'Paros', extra:'Grčka'}, {name:'Naksos', extra:'Grčka'}, {name:'Kos', extra:'Grčka'}, {name:'Volos', extra:'Grčka'},
  // Grčka — gradovi
  {name:'Patra', extra:'Grčka'}, {name:'Larisa', extra:'Grčka'}, {name:'Kavala', extra:'Grčka'},
  {name:'Janjina', extra:'Grčka'}, {name:'Iraklion', extra:'Grčka'}, {name:'Kalamata', extra:'Grčka'},
  // Grčka — banje
  {name:'Lutraki', extra:'Grčka'}, {name:'Edipsos', extra:'Grčka'},
  // Grčka — planine
  {name:'Olimp', extra:'Grčka'}, {name:'Pilion', extra:'Grčka'},
  // Grčka — turistički centri
  {name:'Meteori', extra:'Grčka'}, {name:'Delfi', extra:'Grčka'}, {name:'Nafplion', extra:'Grčka'},
  // Grčka — primorska mesta i ostrva
  {name:'Tasos', extra:'Grčka'}, {name:'Samos', extra:'Grčka'}, {name:'Hios', extra:'Grčka'},
  {name:'Skijatos', extra:'Grčka'}, {name:'Skopelos', extra:'Grčka'}, {name:'Evija', extra:'Grčka'},
  {name:'Idra', extra:'Grčka'}, {name:'Spece', extra:'Grčka'}, {name:'Milos', extra:'Grčka'},
  {name:'Ios', extra:'Grčka'}, {name:'Egina', extra:'Grčka'}, {name:'Poros', extra:'Grčka'},
  // Italija
  {name:'Rim', extra:'Italija'}, {name:'Milano', extra:'Italija'}, {name:'Napulj', extra:'Italija'},
  {name:'Venecija', extra:'Italija'}, {name:'Firenca', extra:'Italija'}, {name:'Bolonja', extra:'Italija'},
  {name:'Verona', extra:'Italija'}, {name:'Torino', extra:'Italija'}, {name:'Bari', extra:'Italija'}, {name:'Sicilija', extra:'Italija'},
  {name:'Đenova', extra:'Italija'}, {name:'Pisa', extra:'Italija'}, {name:'Trst', extra:'Italija'},
  {name:'Leče', extra:'Italija'}, {name:'Sardinija', extra:'Italija'}, {name:'Kaljari', extra:'Italija'},
  {name:'Palermo', extra:'Italija'}, {name:'Katanija', extra:'Italija'}, {name:'Padova', extra:'Italija'}, {name:'Parma', extra:'Italija'},
  {name:'Modena', extra:'Italija'}, {name:'Perudja', extra:'Italija'}, {name:'Brešija', extra:'Italija'}, {name:'Salerno', extra:'Italija'},
  // Italija — banje
  {name:'Abano Terme', extra:'Italija'}, {name:'Montekatini Terme', extra:'Italija'}, {name:'Fjuđi', extra:'Italija'}, {name:'Salsomađore Terme', extra:'Italija'},
  // Italija — planine
  {name:'Dolomiti', extra:'Italija'}, {name:'Kortina d\'Ampeco', extra:'Italija'}, {name:'Val Gardena', extra:'Italija'}, {name:'Livinjo', extra:'Italija'}, {name:'Etna', extra:'Italija'},
  // Italija — turistički centri
  {name:'Pompeji', extra:'Italija'}, {name:'Asizi', extra:'Italija'}, {name:'Sijena', extra:'Italija'}, {name:'San Đimonjano', extra:'Italija'}, {name:'Orvieto', extra:'Italija'}, {name:'Ravena', extra:'Italija'},
  // Italija — primorska mesta
  {name:'Amalfi', extra:'Italija'}, {name:'Pozitano', extra:'Italija'}, {name:'Sorento', extra:'Italija'}, {name:'Rimini', extra:'Italija'},
  {name:'Kapri', extra:'Italija'}, {name:'Portofino', extra:'Italija'}, {name:'Elba', extra:'Italija'}, {name:'Taormina', extra:'Italija'},
  // Španija i Portugal
  {name:'Barselona', extra:'Španija'}, {name:'Madrid', extra:'Španija'}, {name:'Valensija', extra:'Španija'},
  {name:'Malaga', extra:'Španija'}, {name:'Ibica', extra:'Španija'}, {name:'Majorka', extra:'Španija'}, {name:'Sevilja', extra:'Španija'},
  {name:'Alikante', extra:'Španija'}, {name:'Granada', extra:'Španija'}, {name:'Bilbao', extra:'Španija'},
  {name:'Tenerife', extra:'Španija'}, {name:'Gran Kanarija', extra:'Španija'},
  {name:'San Sebastijan', extra:'Španija'}, {name:'Salamanka', extra:'Španija'}, {name:'Toledo', extra:'Španija'},
  {name:'Santjago de Kompostela', extra:'Španija'}, {name:'Lanzarote', extra:'Španija'}, {name:'Fuerteventura', extra:'Španija'},
  {name:'Lisabon', extra:'Portugalija'}, {name:'Porto', extra:'Portugalija'}, {name:'Faro', extra:'Portugalija'}, {name:'Kordoba', extra:'Španija'},
  {name:'Koimbra', extra:'Portugalija'}, {name:'Braga', extra:'Portugalija'}, {name:'Sintra', extra:'Portugalija'},
  {name:'Albufeira', extra:'Portugalija'}, {name:'Madeira', extra:'Portugalija'}, {name:'Azori', extra:'Portugalija'},
  // Zapadna/Severna Evropa
  {name:'Pariz', extra:'Francuska'}, {name:'Nica', extra:'Francuska'}, {name:'Lion', extra:'Francuska'},
  {name:'Bordo', extra:'Francuska'}, {name:'Marselj', extra:'Francuska'}, {name:'Strazbur', extra:'Francuska'},
  {name:'Tuluz', extra:'Francuska'}, {name:'Kan', extra:'Francuska'}, {name:'Avinjon', extra:'Francuska'},
  {name:'Anesi', extra:'Francuska'}, {name:'Šamoni', extra:'Francuska'}, {name:'Korzika', extra:'Francuska'},
  {name:'London', extra:'Velika Britanija'}, {name:'Edinburg', extra:'Velika Britanija'},
  {name:'Mančester', extra:'Velika Britanija'}, {name:'Liverpul', extra:'Velika Britanija'},
  {name:'Glazgov', extra:'Velika Britanija'}, {name:'Belfast', extra:'Velika Britanija'},
  {name:'Oksford', extra:'Velika Britanija'}, {name:'Kembridž', extra:'Velika Britanija'}, {name:'Bat', extra:'Velika Britanija'},
  {name:'Amsterdam', extra:'Holandija'}, {name:'Roterdam', extra:'Holandija'}, {name:'Hag', extra:'Holandija'},
  {name:'Utreht', extra:'Holandija'}, {name:'Delft', extra:'Holandija'}, {name:'Mastriht', extra:'Holandija'},
  {name:'Berlin', extra:'Nemačka'}, {name:'Minhen', extra:'Nemačka'}, {name:'Hamburg', extra:'Nemačka'}, {name:'Frankfurt', extra:'Nemačka'},
  {name:'Keln', extra:'Nemačka'}, {name:'Diseldorf', extra:'Nemačka'}, {name:'Štutgart', extra:'Nemačka'}, {name:'Drezden', extra:'Nemačka'},
  {name:'Nirnberg', extra:'Nemačka'}, {name:'Lajpcig', extra:'Nemačka'}, {name:'Bremen', extra:'Nemačka'}, {name:'Hanover', extra:'Nemačka'},
  {name:'Beč', extra:'Austrija'}, {name:'Zalcburg', extra:'Austrija'}, {name:'Insbruk', extra:'Austrija'}, {name:'Graz', extra:'Austrija'},
  {name:'Linc', extra:'Austrija'}, {name:'Klagenfurt', extra:'Austrija'}, {name:'Filah', extra:'Austrija'}, {name:'Vels', extra:'Austrija'}, {name:'Sankt Pelten', extra:'Austrija'},
  // Austrija — banje
  {name:'Bad Gastajn', extra:'Austrija'}, {name:'Bad Išl', extra:'Austrija'}, {name:'Bad Ausee', extra:'Austrija'}, {name:'Baden kod Beča', extra:'Austrija'},
  // Austrija — planine i skijališta
  {name:'Kicbil', extra:'Austrija'}, {name:'Zel am Zi', extra:'Austrija'}, {name:'Solden', extra:'Austrija'}, {name:'Išgl', extra:'Austrija'}, {name:'Majrhofen', extra:'Austrija'},
  // Austrija — turistički centri
  {name:'Halštat', extra:'Austrija'}, {name:'Verfen', extra:'Austrija'}, {name:'Melk', extra:'Austrija'},
  // Austrija — jezera
  {name:'Volfgangze', extra:'Austrija'}, {name:'Ahenze', extra:'Austrija'}, {name:'Vertersee', extra:'Austrija'},
  {name:'Prag', extra:'Češka'}, {name:'Brno', extra:'Češka'}, {name:'Budimpešta', extra:'Mađarska'}, {name:'Bratislava', extra:'Slovačka'},
  {name:'Karlovi Vari', extra:'Češka'}, {name:'Češki Krumlov', extra:'Češka'}, {name:'Plzenj', extra:'Češka'}, {name:'Olomouc', extra:'Češka'}, {name:'Kutna Hora', extra:'Češka'},
  {name:'Segedin', extra:'Mađarska'}, {name:'Pečuj', extra:'Mađarska'}, {name:'Debrecin', extra:'Mađarska'}, {name:'Đer', extra:'Mađarska'},
  {name:'Balaton', extra:'Mađarska'}, {name:'Heviz', extra:'Mađarska'}, {name:'Šiofok', extra:'Mađarska'}, {name:'Kečkemet', extra:'Mađarska'},
  {name:'Varšava', extra:'Poljska'}, {name:'Krakov', extra:'Poljska'}, {name:'Vroclav', extra:'Poljska'},
  {name:'Gdanjsk', extra:'Poljska'}, {name:'Poznanj', extra:'Poljska'}, {name:'Lođ', extra:'Poljska'}, {name:'Zakopane', extra:'Poljska'}, {name:'Torunj', extra:'Poljska'}, {name:'Vjelička', extra:'Poljska'},
  {name:'Stokholm', extra:'Švedska'}, {name:'Geteborg', extra:'Švedska'}, {name:'Malme', extra:'Švedska'},
  {name:'Oslo', extra:'Norveška'}, {name:'Bergen', extra:'Norveška'}, {name:'Tromse', extra:'Norveška'}, {name:'Stavanger', extra:'Norveška'}, {name:'Lofoti', extra:'Norveška'},
  {name:'Kopenhagen', extra:'Danska'}, {name:'Arhus', extra:'Danska'}, {name:'Odense', extra:'Danska'},
  {name:'Helsinki', extra:'Finska'}, {name:'Rovanijemi', extra:'Finska'}, {name:'Tampere', extra:'Finska'},
  {name:'Dablin', extra:'Irska'}, {name:'Kork', extra:'Irska'}, {name:'Golvej', extra:'Irska'},
  {name:'Brisel', extra:'Belgija'}, {name:'Briž', extra:'Belgija'}, {name:'Gent', extra:'Belgija'}, {name:'Antverpen', extra:'Belgija'},
  {name:'Cirih', extra:'Švajcarska'}, {name:'Ženeva', extra:'Švajcarska'}, {name:'Bern', extra:'Švajcarska'}, {name:'Lucern', extra:'Švajcarska'},
  {name:'Bazel', extra:'Švajcarska'}, {name:'Cermat', extra:'Švajcarska'}, {name:'Interlaken', extra:'Švajcarska'}, {name:'Lugano', extra:'Švajcarska'},
  // Baltik, Malta, Kipar, Island i mikrodržave
  {name:'Talin', extra:'Estonija'}, {name:'Tartu', extra:'Estonija'},
  {name:'Riga', extra:'Letonija'}, {name:'Jurmala', extra:'Letonija'},
  {name:'Viljnus', extra:'Litvanija'}, {name:'Kaunas', extra:'Litvanija'}, {name:'Klaipeda', extra:'Litvanija'},
  {name:'Valeta', extra:'Malta'}, {name:'Sliema', extra:'Malta'}, {name:'Mdina', extra:'Malta'}, {name:'Gozo', extra:'Malta'},
  {name:'Nikozija', extra:'Kipar'}, {name:'Limasol', extra:'Kipar'}, {name:'Larnaka', extra:'Kipar'}, {name:'Pafos', extra:'Kipar'}, {name:'Ajia Napa', extra:'Kipar'},
  {name:'Rejkjavik', extra:'Island'}, {name:'Akurejri', extra:'Island'},
  {name:'Monako', extra:'Monako'}, {name:'Monte Karlo', extra:'Monako'}, {name:'Luksemburg', extra:'Luksemburg'},
  // Turska, Bliski istok, sever Afrike
  {name:'Istanbul', extra:'Turska'}, {name:'Antalija', extra:'Turska'}, {name:'Bodrum', extra:'Turska'}, {name:'Kapadokija', extra:'Turska'},
  {name:'Marmaris', extra:'Turska'}, {name:'Fetije', extra:'Turska'}, {name:'Izmir', extra:'Turska'}, {name:'Ankara', extra:'Turska'},
  {name:'Alanja', extra:'Turska'}, {name:'Kušadasi', extra:'Turska'}, {name:'Side', extra:'Turska'}, {name:'Pamukale', extra:'Turska'}, {name:'Bursa', extra:'Turska'}, {name:'Česme', extra:'Turska'},
  // Turska — gradovi
  {name:'Adana', extra:'Turska'}, {name:'Konja', extra:'Turska'}, {name:'Gaziantep', extra:'Turska'}, {name:'Kajseri', extra:'Turska'}, {name:'Mersin', extra:'Turska'},
  {name:'Eskišehir', extra:'Turska'}, {name:'Denizli', extra:'Turska'}, {name:'Trabzon', extra:'Turska'}, {name:'Samsun', extra:'Turska'}, {name:'Malatja', extra:'Turska'},
  // Turska — banje
  {name:'Jalova', extra:'Turska'}, {name:'Afjon Karahisar', extra:'Turska'}, {name:'Haymana', extra:'Turska'}, {name:'Kizildžahamam', extra:'Turska'},
  // Turska — turistički centri
  {name:'Efes', extra:'Turska'}, {name:'Troja', extra:'Turska'}, {name:'Pergamon', extra:'Turska'}, {name:'Hijerapolis', extra:'Turska'},
  {name:'Sumela', extra:'Turska'}, {name:'Nemrut', extra:'Turska'}, {name:'Safranbolu', extra:'Turska'}, {name:'Gjobekli Tepe', extra:'Turska'},
  // Turska — primorska mesta
  {name:'Kaš', extra:'Turska'}, {name:'Kalkan', extra:'Turska'}, {name:'Datča', extra:'Turska'}, {name:'Didim', extra:'Turska'},
  {name:'Ajvalik', extra:'Turska'}, {name:'Silifke', extra:'Turska'}, {name:'Foča (Turska)', extra:'Turska'},
  {name:'Tel Aviv', extra:'Izrael'}, {name:'Dubai', extra:'UAE'}, {name:'Abu Dabi', extra:'UAE'},
  {name:'Kairo', extra:'Egipat'}, {name:'Šarm El Šeik', extra:'Egipat'}, {name:'Hurgada', extra:'Egipat'}, {name:'Luksor', extra:'Egipat'},
  {name:'Marakeš', extra:'Maroko'}, {name:'Rabat', extra:'Maroko'}, {name:'Kazablanka', extra:'Maroko'}, {name:'Tanger', extra:'Maroko'},
  // Amerika i Azija (najtraženiji daleki gradovi)
  {name:'Njujork', extra:'SAD'}, {name:'Majami', extra:'SAD'}, {name:'Los Anđeles', extra:'SAD'},
  {name:'Las Vegas', extra:'SAD'}, {name:'Čikago', extra:'SAD'}, {name:'San Francisko', extra:'SAD'},
  {name:'Boston', extra:'SAD'}, {name:'Vašington', extra:'SAD'}, {name:'Orlando', extra:'SAD'}, {name:'Honolulu', extra:'SAD'},
  {name:'Filadelfija', extra:'SAD'}, {name:'Sijetl', extra:'SAD'}, {name:'Denver', extra:'SAD'}, {name:'Atlanta', extra:'SAD'},
  {name:'Toronto', extra:'Kanada'}, {name:'Vankuver', extra:'Kanada'}, {name:'Montreal', extra:'Kanada'}, {name:'Otava', extra:'Kanada'},
  {name:'Meksiko Siti', extra:'Meksiko'}, {name:'Kankun', extra:'Meksiko'},
  {name:'Rio de Žaneiro', extra:'Brazil'}, {name:'Sao Paulo', extra:'Brazil'}, {name:'Buenos Ajres', extra:'Argentina'},
  {name:'Bogota', extra:'Kolumbija'}, {name:'Lima', extra:'Peru'},
  {name:'Bangkok', extra:'Tajland'}, {name:'Puket', extra:'Tajland'}, {name:'Tokio', extra:'Japan'}, {name:'Osaka', extra:'Japan'}, {name:'Kjoto', extra:'Japan'},
  {name:'Bali', extra:'Indonezija'}, {name:'Džakarta', extra:'Indonezija'}, {name:'Singapur', extra:'Singapur'},
  {name:'Ho Ši Min', extra:'Vijetnam'}, {name:'Hanoj', extra:'Vijetnam'},
  {name:'Peking', extra:'Kina'}, {name:'Šangaj', extra:'Kina'}, {name:'Hongkong', extra:'Kina'},
  {name:'Seul', extra:'Južna Koreja'}, {name:'Kuala Lumpur', extra:'Malezija'}, {name:'Manila', extra:'Filipini'},
  {name:'Nju Delhi', extra:'Indija'}, {name:'Mumbaj', extra:'Indija'}, {name:'Male', extra:'Maldivi'},
  {name:'Baku', extra:'Azerbejdžan'}, {name:'Tbilisi', extra:'Gruzija'},
  {name:'Sidnej', extra:'Australija'}, {name:'Melburn', extra:'Australija'}, {name:'Brizbejn', extra:'Australija'},
  {name:'Okland', extra:'Novi Zeland'}, {name:'Velington', extra:'Novi Zeland'},
  {name:'Doha', extra:'Katar'}, {name:'Rijad', extra:'Saudijska Arabija'},
  {name:'Kejptaun', extra:'Južnoafrička Republika'}, {name:'Najrobi', extra:'Kenija'},
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
/* Zemlje van Šengena za koje je državljanima Srbije i dalje potrebna PRAVA VIZA
   (ne samo pasoš) — ovo je veći problem od važenja pasoša jer traži prijavu,
   dokumenta i nedelje čekanja, pa se ističe posebno, pre pravila o pasošu. */
const VISA_REQUIRED_NOTES = {
  'Velika Britanija':'Državljanima Srbije je potrebna prava viza za Veliku Britaniju (uključujući London i tranzit bez izlaska iz aerodroma) — ovo nije samo provera pasoša. Standardna turistička viza obično se obrađuje oko 3 nedelje, pa prijavu treba podneti mnogo pre kupovine nepovratnih karata.',
  'Irska':'Državljanima Srbije je potrebna prava viza za Irsku — stara pogodnost putovanja preko britanske vize je ukinuta 2020. i nije vraćena. Prijavu za vizu treba podneti mnogo pre kupovine nepovratnih karata.',
  'SAD':'Državljanima Srbije je potrebna prava viza za SAD (obično turistička B1/B2) — ovo nije samo provera pasoša. Traži se obavezan intervju u ambasadi u Beogradu, taksa oko 185 USD, a na termin se čeka od par nedelja do više meseci u zavisnosti od perioda. Prijavu treba podneti mnogo pre kupovine nepovratnih karata.',
  'Kanada':'Državljanima Srbije je potrebna prava viza za Kanadu (Kanada nema eTA olakšicu za srpski pasoš) — ovo nije samo provera pasoša. Obrada uključuje biometriju i obično traje oko 2-4 nedelje, pa prijavu treba podneti mnogo pre kupovine nepovratnih karata.'
};
/* Regionalne destinacije za koje državljanima Srbije pasoš UOPŠTE nije
   potreban — ulazi se samo sa važećom biometrijskom ličnom kartom (do 90
   dana boravka u periodu od 6 meseci), na osnovu regionalnog sporazuma o
   tzv. "mini Šengenu" (Srbija–Severna Makedonija–Albanija od 2020/2021,
   Crna Gora i BiH imaju istovetnu praksu sa ličnom kartom). Ako se ovo ne
   prepozna, korisnik dobija generičko "verovatno 6 meseci" upozorenje koje
   je i pogrešno i nepotrebno zabrinjavajuće za ove destinacije. */
const REGIONAL_ID_CARD_COUNTRIES = new Set([
  'Crna Gora', 'Bosna i Hercegovina', 'Severna Makedonija', 'Albanija'
]);
function getPassportRule(country, destVal){
  const c = (country || '').trim();
  const fallbackName = (destVal || '').trim();
  const visaNote = VISA_REQUIRED_NOTES[c] || null;
  let base;
  if (REGIONAL_ID_CARD_COUNTRIES.has(c)){
    base = {basis:'none', months:null, days:null, label:c, confident:true, noPassportNeeded:true,
      why:'Za ' + c + ' pasoš ti uopšte nije potreban — državljani Srbije ulaze samo sa važećom biometrijskom ličnom kartom (do 90 dana boravka u periodu od 6 meseci), na osnovu regionalnog sporazuma o slobodnom kretanju.'};
  } else if (SCHENGEN_COUNTRIES.has(c)){
    base = {basis:'to', months:3, days:null, label:c || 'Šengen zona', confident:true,
      why:'Za Šengen zonu pasoš mora da važi još najmanje 3 meseca nakon planiranog datuma povratka.'};
  } else if (c === 'Turska'){
    base = {basis:'from', months:null, days:150, label:'Turska', confident:true,
      why:'Za Tursku pasoš mora da važi još najmanje 150 dana (cca 5 meseci) od datuma ulaska u zemlju.'};
  } else if (c === 'Egipat' || c === 'Tunis'){
    base = {basis:'to', months:6, days:null, label:c, confident:true,
      why:'Za ' + c + ' pasoš mora da važi još najmanje 6 meseci nakon planiranog datuma povratka.'};
  } else if (c === 'Kina'){
    base = {basis:'to', months:6, days:null, label:'Kina', confident:true,
      why:'Za Kinu državljanima Srbije nije potrebna viza za turistički boravak do 30 dana, ali pasoš mora da važi još najmanje 6 meseci nakon planiranog datuma povratka. (Hongkong i Makao imaju poseban, još slobodniji režim.)'};
  } else {
    const shownName = c || fallbackName || 'ova destinacija';
    const genericWhy = c
      ? 'Nemamo potvrđeno pravilo za zemlju „' + c + '“ — mnoge zemlje van Šengena traže važenje pasoša još 6 meseci nakon povratka, ali ovo obavezno proveri kod ambasade/aviokompanije jer se pravilo razlikuje po zemlji.'
      : 'Ne znamo tačnu zemlju za „' + shownName + '“, pa nemamo potvrđeno pravilo — mnoge zemlje van Šengena traže važenje pasoša još 6 meseci nakon povratka, ali ovo obavezno proveri kod ambasade/aviokompanije jer se pravilo razlikuje po zemlji.';
    base = {basis:'to', months:6, days:null, label:shownName, confident: !!visaNote,
      why: visaNote
        ? 'Uz vizu, pasoš uglavnom mora da važi još najmanje 6 meseci nakon planiranog datuma povratka — konkretan rok proverava ambasada prilikom obrade vize.'
        : genericWhy};
  }
  base.visaNote = visaNote;
  return base;
}
/* ---- Provera da li je za vožnju automobilom (sopstvenim ili u Srbiji
   iznajmljenim) do odabrane destinacije potrebna "zelena karta" —
   međunarodna potvrda auto-osiguranja.
   Srbija je od 2012. članica Multilateralnog garantnog sporazuma Sistema
   zelene karte, pa karton NIJE potreban za vožnju u zemlje EU/Šengena,
   Švajcarsku, Lihtenštajn, Norvešku, Island i Andoru (SCHENGEN_COUNTRIES
   gore), kao ni za Crnu Goru (bilateralni sporazum sa Udruženjem
   osiguravača Srbije) i Bosnu i Hercegovinu (BiH pristupila sporazumu
   19.10.2020, ranije bio potreban). I DALJE je obavezna za Severnu
   Makedoniju (nije potpisnica) i za zemlje van kruga zelene karte
   (Rusija, Belorusija, Ukrajina, Moldavija, Turska, Izrael, Iran,
   Albanija, Tunis, Maroko). Izvor: Udruženje osiguravača Srbije / AMSS. */
const GREEN_CARD_NOT_NEEDED = new Set([
  ...SCHENGEN_COUNTRIES,
  'Crna Gora', 'Bosna i Hercegovina'
]);
const GREEN_CARD_NEEDED_NOTES = {
  'Severna Makedonija':'Za Severnu Makedoniju je zelena karta i dalje obavezna — nije potpisnica Multilateralnog sporazuma sa Srbijom.',
  'Turska':'Za Tursku je zelena karta obavezna.',
  'Albanija':'Za Albaniju je zelena karta obavezna.',
  'Rusija':'Za Rusiju je zelena karta obavezna.',
  'Belorusija':'Za Belorusiju je zelena karta obavezna.',
  'Ukrajina':'Za Ukrajinu je zelena karta obavezna.',
  'Moldavija':'Za Moldaviju je zelena karta obavezna.',
  'Izrael':'Za Izrael je zelena karta obavezna.',
  'Iran':'Za Iran je zelena karta obavezna.',
  'Maroko':'Za Maroko je zelena karta obavezna.',
  'Tunis':'Za Tunis je zelena karta obavezna.'
};
function getGreenCardRule(country){
  const c = (country || '').trim();
  if (!c){
    return {status:'unknown', label:'', confident:false,
      why:'Ne znamo tačnu zemlju za unetu destinaciju, pa ne možemo da proverimo pravilo o zelenoj karti.'};
  }
  if (GREEN_CARD_NOT_NEEDED.has(c)){
    return {status:'ok', label:c, confident:true,
      why:'Za ' + c + ' zelena karta NIJE potrebna za vozila registrovana u Srbiji — registarska tablica je dovoljan dokaz osiguranja.'};
  }
  if (GREEN_CARD_NEEDED_NOTES[c]){
    return {status:'needed', label:c, confident:true, why: GREEN_CARD_NEEDED_NOTES[c]};
  }
  return {status:'unknown', label:c, confident:false,
    why:'Nemamo potvrđeno pravilo za „' + c + '“ — proveri kod svog osiguravača da li ti treba zelena karta pre polaska.'};
}
function resolveCountryForDestination(destValue){
  if (!destValue || !destValue.trim()) return '';
  const matches = matchPopularDestinations(destValue);
  return matches.length ? (matches[0].extra || '') : '';
}
function resolveCanonicalDestName(destValue){
  if (!destValue || !destValue.trim()) return '';
  const matches = matchPopularDestinations(destValue);
  return matches.length ? matches[0].name : '';
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

/* ==========================================================
   Sopstvena (ne-native) lista predloga mesta za Polazak/Destinaciju.
   Ranije: <input list="..."> + <datalist>. Problem koji je to pravilo
   na Android/Chrome: nativna traka predloga iznad tastature ume da
   "trepće" — zatvori pa ponovo otvori tastaturu pri svakom kucanju
   ili izboru predloga, jer datalist UI nije deo same tastature nego
   posebna traka koju browser umeće/uklanja. Ovde predloge iscrtavamo
   sami u panel-u koji mi kontrolišemo (position:fixed, pozicioniran
   preko getBoundingClientRect), a fokus nikad ne napušta input polje
   (mousedown/touchstart na panelu je preventDefault-ovan), pa tastatura
   ostaje otvorena i mirna od prvog slova do izbora predloga.
========================================================== */
const LOC_DROPDOWN_INPUT_ID = { destSuggestions:'dest', originSuggestions:'origin' };
const _locDropdownState = {
  destSuggestions:{ items:[], activeIndex:-1, suppressNextFetch:false },
  originSuggestions:{ items:[], activeIndex:-1, suppressNextFetch:false }
};
// Koristi visualViewport (kad postoji — svi moderni Android/Chrome) da
// zna GDE se stvarno završava vidljiv deo ekrana kad je tastatura otvorena.
// Bez ovoga se panel računao prema window.innerHeight/scroll poziciji koje
// tastatura ne menja (samo "visual" viewport se smanji), pa je panel visio
// ispod polja i tastatura ga je prekrivala skoro celog — vidljiv je ostajao
// tek delić prvog predloga.
function getVisibleViewportTop(){
  const vv = window.visualViewport;
  return vv ? vv.offsetTop : 0;
}
function getVisibleViewportBottom(){
  const vv = window.visualViewport;
  return vv ? (vv.offsetTop + vv.height) : window.innerHeight;
}
function positionLocDropdown(panel, inputEl){
  const r = inputEl.getBoundingClientRect();
  const gap = 6, margin = 8, minUseful = 120, preferredMax = 264;
  const visTop = getVisibleViewportTop() + margin;
  const visBottom = getVisibleViewportBottom() - margin;
  const spaceBelow = visBottom - (r.bottom + gap);
  const spaceAbove = (r.top - gap) - visTop;
  panel.style.left = r.left + 'px';
  panel.style.width = r.width + 'px';
  if (spaceBelow >= minUseful || spaceBelow >= spaceAbove){
    // dovoljno mesta ispod polja (ili bar više nego iznad) — otvori ispod,
    // ali visinu ograniči na stvarno vidljiv prostor iznad tastature
    panel.style.top = (r.bottom + gap) + 'px';
    panel.style.bottom = 'auto';
    panel.style.maxHeight = Math.max(minUseful, Math.min(preferredMax, spaceBelow)) + 'px';
  } else {
    // tastatura pojela prostor ispod polja — otvori NAVIŠE, iznad polja
    panel.style.top = 'auto';
    panel.style.bottom = (window.innerHeight - r.top + gap) + 'px';
    panel.style.maxHeight = Math.max(minUseful, Math.min(preferredMax, spaceAbove)) + 'px';
  }
}
function closeLocDropdown(datalistId){
  const panel = document.getElementById(datalistId);
  const inputEl = document.getElementById(LOC_DROPDOWN_INPUT_ID[datalistId]);
  const state = _locDropdownState[datalistId];
  if (panel){ panel.classList.remove('open'); panel.innerHTML = ''; }
  if (state){ state.items = []; state.activeIndex = -1; }
  if (inputEl){ inputEl.setAttribute('aria-expanded', 'false'); inputEl.removeAttribute('aria-activedescendant'); }
}
function selectLocSuggestion(datalistId, value){
  const inputEl = document.getElementById(LOC_DROPDOWN_INPUT_ID[datalistId]);
  if (!inputEl) return;
  inputEl.value = value;
  // Sledeći 'input' event (koji dispatch-ujemo ispod, da pokrene regionalne
  // predloge/upozorenje o aerodromu) NE sme ponovo da pokrene pretragu
  // predloga — inače isti tekst ("Budva") opet nađe sam sebe kao pogodak
  // i lista se vrati/ne zatvori 300ms nakon izbora. Ovaj flag preskače
  // TAČNO taj jedan naredni poziv.
  const state = _locDropdownState[datalistId];
  if (state) state.suppressNextFetch = true;
  closeLocDropdown(datalistId);
  inputEl.dispatchEvent(new Event('input', {bubbles:true}));
  inputEl.dispatchEvent(new Event('change', {bubbles:true}));
  // Tastatura se zatvara ODMAH posle izbora, bez obzira na sledeće polje —
  // dok je otvorena, prekriva pola ekrana i baš uneto polje se jedva vidi.
  // Fokus se NE prebacuje automatski na sledeće polje (ni Destinaciju ni
  // datume): korisnik sam dodirne sledeće polje kad bude spreman, i tastatura
  // (ili kalendar) se tad normalno otvori za njega.
  inputEl.blur();
}
function setupLocDropdown(datalistId){
  const panel = document.getElementById(datalistId);
  const inputEl = document.getElementById(LOC_DROPDOWN_INPUT_ID[datalistId]);
  if (!panel || !inputEl) return;

  // KLJUČNO: panel fizički prebacujemo u <body>. U HTML-u je ugnježden unutar
  // .stub-a za Destinaciju/Polazak, a taj .stub ima isolation:isolate (isti
  // razlog zbog kog je i kalendar ranije morao specijalan tretman — vidi
  // komentar uz .cal-card u styles.css). Isolation zarobi SVAKI potomak u
  // sopstveni sloj za crtanje, čak i position:fixed — pa su stubovi koji u
  // DOM-u dolaze POSLE (OD—DO, Putnika) crtani PREKO panela, bez obzira na
  // z-index. Kad je panel direktno dete <body>, taj problem nestaje.
  if (panel.parentElement !== document.body) document.body.appendChild(panel);

  // Sprečava da tap/klik na predlog oduzme fokus input polju pre nego što
  // stigne 'click' — upravo taj gubitak-pa-povratak fokusa je ono što na
  // mobilnom zatvori pa ponovo otvori tastaturu. NAPOMENA: ovo se radi SAMO
  // na 'mousedown' (stiže i posle dodira, kao "kompatibilni" miš-događaj) —
  // preventDefault() na 'touchstart' je ranije bio dodat sa istom namerom,
  // ali on na dodirnim uređajima potpuno ugasi naredni 'click' događaj
  // (deo specifikacije touch-events), pa tap nije radio ništa.
  panel.addEventListener('mousedown', (e) => e.preventDefault());

  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('.loc-dropdown-item');
    if (!btn) return;
    const state = _locDropdownState[datalistId];
    const item = state.items[Number(btn.dataset.idx)];
    if (item) selectLocSuggestion(datalistId, item.name);
  });

  inputEl.addEventListener('keydown', (e) => {
    const state = _locDropdownState[datalistId];
    if (!panel.classList.contains('open') || !state.items.length) return;
    if (e.key === 'ArrowDown'){
      e.preventDefault();
      state.activeIndex = Math.min(state.activeIndex + 1, state.items.length - 1);
    } else if (e.key === 'ArrowUp'){
      e.preventDefault();
      state.activeIndex = Math.max(state.activeIndex - 1, 0);
    } else if (e.key === 'Enter'){
      if (state.activeIndex >= 0){
        e.preventDefault();
        const item = state.items[state.activeIndex];
        if (item) selectLocSuggestion(datalistId, item.name);
      }
      return;
    } else if (e.key === 'Escape'){
      closeLocDropdown(datalistId);
      return;
    } else {
      return;
    }
    const optionEls = panel.querySelectorAll('.loc-dropdown-item');
    optionEls.forEach((el, i) => el.classList.toggle('is-active', i === state.activeIndex));
    const activeEl = optionEls[state.activeIndex];
    if (activeEl){
      activeEl.scrollIntoView({block:'nearest'});
      inputEl.setAttribute('aria-activedescendant', activeEl.id);
    }
  });

  // Malo kašnjenje na blur: ostavlja vremena da 'click' na predlogu (posle
  // mousedown-a iznad) stigne da se obradi pre nego što panel nestane.
  inputEl.addEventListener('blur', () => setTimeout(() => closeLocDropdown(datalistId), 150));

  window.addEventListener('resize', () => { if (panel.classList.contains('open')) positionLocDropdown(panel, inputEl); });
  window.addEventListener('scroll', () => { if (panel.classList.contains('open')) positionLocDropdown(panel, inputEl); }, true);
  // window 'resize' se često NE aktivira kad se otvori/zatvori tastatura
  // (menja se samo visualViewport, ne i layout viewport) — bez ovoga bi
  // panel ostao zaleđen na poziciji izračunatoj PRE nego što je tastatura
  // stigla da se potpuno otvori.
  if (window.visualViewport){
    window.visualViewport.addEventListener('resize', () => { if (panel.classList.contains('open')) positionLocDropdown(panel, inputEl); });
    window.visualViewport.addEventListener('scroll', () => { if (panel.classList.contains('open')) positionLocDropdown(panel, inputEl); });
  }
}

let _destSuggestTimer = null;
let _originSuggestTimer = null;
async function fetchLocationSuggestions(q, datalistId){
  const query = q.trim();
  const inputEl = document.getElementById(LOC_DROPDOWN_INPUT_ID[datalistId]);
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
        console.warn('[sklopi] backend predlozi nedostupni, prelazim na Open-Meteo:', err.message);
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
          console.warn('[sklopi] predlozi mesta (Open-Meteo) nisu uspeli:', err.message);
        }
      }
    }

    renderLocationSuggestions(combined.slice(0, 6), datalistId);
  } finally {
    if (stubEl) stubEl.classList.remove('is-loading');
  }
}
function renderLocationSuggestions(results, datalistId){
  const panel = document.getElementById(datalistId);
  const inputEl = document.getElementById(LOC_DROPDOWN_INPUT_ID[datalistId]);
  if (!panel || !inputEl) return;
  const seen = new Set(); // izbegava duplikate istog naziva grada
  const items = results.filter(r => {
    const key = r.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const state = _locDropdownState[datalistId];
  state.items = items;
  state.activeIndex = -1;
  if (!items.length){ closeLocDropdown(datalistId); return; }
  panel.innerHTML = items.map((r, i) =>
    `<button type="button" class="loc-dropdown-item" role="option" id="${datalistId}-opt-${i}" data-idx="${i}">`
    + escapeHtml(r.name) + (r.extra ? `<span class="ldi-extra">${escapeHtml(r.extra)}</span>` : '')
    + `</button>`
  ).join('');
  positionLocDropdown(panel, inputEl);
  panel.classList.add('open');
  inputEl.setAttribute('aria-expanded', 'true');
}
setupLocDropdown('destSuggestions');
setupLocDropdown('originSuggestions');
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
  const state = _locDropdownState.destSuggestions;
  if (state && state.suppressNextFetch){ state.suppressNextFetch = false; return; }
  markStubLoading(e.target, q);
  _destSuggestTimer = setTimeout(()=> fetchLocationSuggestions(q, 'destSuggestions'), 300);
});
document.getElementById('origin').addEventListener('input', (e)=>{
  clearTimeout(_originSuggestTimer);
  const q = e.target.value;
  const state = _locDropdownState.originSuggestions;
  if (state && state.suppressNextFetch){ state.suppressNextFetch = false; return; }
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
  // Tajmaut: spor backend ne sme da drži skeleton unedogled — posle 6 s
  // (ili prekida) pada na lokalnu procenu, isto kao kad je nedostupan.
  const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 6000) : null;
  try {
    const res = await fetch(API_BASE + '/api/search', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    // Prazan ili neispravan odgovor = kao da backend nije odgovorio.
    const pkgs = json && json.packages;
    if (!Array.isArray(pkgs) || !pkgs.length || !pkgs.every(pk => pk && TIER_META[pk.tier])) throw new Error('neispravan odgovor');
    return pkgs;
  } catch(err){
    console.warn('[sklopi] backend nedostupan, koristim lokalni mock:', err.message);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function computePackagesLocally(dest, from, to, nights, days, adults, flags, originCode){
  const seed = hashSeed(dest.toLowerCase()+dest.length+nights+adults);
  const rng = seededRandom(seed);
  const factor = marketFactor(dest, todayStr());
  // Deljena "baza" cene za sve tri tier kartice — vidi buildPriceSeeds.
  const priceSeeds = buildPriceSeeds(rng);

  const pkgs = ['best','comfort','budget'].map(t => buildPackage(rng, dest, nights, days, adults, t, flags, factor, originCode, seasonFactor(dest, from), priceSeeds));
  pkgs.forEach(p => attachAffiliateLinks(p, dest, from, to, adults, {originCode, flags}));

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
   "PRONAĐI SVOJ IZLET" — pravi alat za odlučivanje, ne kocka.
   Umesto da nasumično bira grad koji se uklapa u budžet, korisnik
   prođe kratak upitnik (sa kim putuje, šta mu znači odmor, budžet)
   i svaki grad iz kurirane MATCH_DESTINATIONS baze se BODUJE po
   poklapanju sa odgovorima + sezonom (mesec iz already-selected
   datuma) + dužinom puta (broj noći iz already-selected datuma) +
   budžetom. Vraćaju se 3 grada sa najvišim skorom i objašnjenjem
   ZAŠTO baš oni odgovaraju — ne samo cenom.
========================================================== */
/* Kurirana baza destinacija sa tagovima za bodovanje (podskup
   POPULAR_DESTINATIONS — namerno manji i pažljivije tagovan, jer je
   ovde tačnost preporuke važnija od broja gradova).
   vibes: 'sea' | 'city' | 'nature' | 'nightlife' (grad može imati više)
   months: meseci (1-12) kad je destinacija najbolja sezona
   distance: 'near' (Balkan/susedne zemlje), 'medium' (ostatak Evrope,
             Turska, sev. Afrika), 'far' (interkontinentalni letovi)
   family: da li je pogodna za porodice sa decom
   nightlife: da li ima jak noćni život/provod */
const MATCH_DESTINATIONS = [
  {name:'Budimpešta', extra:'Mađarska', vibes:['city'], months:[3,4,5,6,9,10,11,12], distance:'near', family:true, nightlife:true},
  {name:'Beč', extra:'Austrija', vibes:['city'], months:[1,2,3,4,5,9,10,11,12], distance:'near', family:true, nightlife:false},
  {name:'Sofija', extra:'Bugarska', vibes:['city','nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Solun', extra:'Grčka', vibes:['city','sea'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:true},
  {name:'Skoplje', extra:'Severna Makedonija', vibes:['city'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Ohrid', extra:'Severna Makedonija', vibes:['sea','nature'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Tirana', extra:'Albanija', vibes:['city'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:true},
  {name:'Sarande', extra:'Albanija', vibes:['sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Budva', extra:'Crna Gora', vibes:['sea','nightlife'], months:[6,7,8,9], distance:'near', family:false, nightlife:true},
  {name:'Kotor', extra:'Crna Gora', vibes:['sea','nature'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:false},
  {name:'Herceg Novi', extra:'Crna Gora', vibes:['sea','nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Dubrovnik', extra:'Hrvatska', vibes:['sea','city'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:false},
  {name:'Split', extra:'Hrvatska', vibes:['sea','city','nightlife'], months:[5,6,7,8,9,10], distance:'near', family:true, nightlife:true},
  {name:'Hvar', extra:'Hrvatska', vibes:['sea','nightlife'], months:[6,7,8,9], distance:'near', family:false, nightlife:true},
  {name:'Zagreb', extra:'Hrvatska', vibes:['city'], months:[3,4,5,6,9,10,11,12], distance:'near', family:true, nightlife:false},
  {name:'Ljubljana', extra:'Slovenija', vibes:['city','nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Bled', extra:'Slovenija', vibes:['nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Sarajevo', extra:'Bosna i Hercegovina', vibes:['city','nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Mostar', extra:'Bosna i Hercegovina', vibes:['city','nature'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Bukurešt', extra:'Rumunija', vibes:['city','nightlife'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:true},
  {name:'Varna', extra:'Bugarska', vibes:['sea'], months:[6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Istanbul', extra:'Turska', vibes:['city'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:true},
  {name:'Prag', extra:'Češka', vibes:['city','nightlife'], months:[3,4,5,6,9,10,11,12], distance:'medium', family:true, nightlife:true},
  {name:'Bratislava', extra:'Slovačka', vibes:['city'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Krf', extra:'Grčka', vibes:['sea','nature'], months:[5,6,7,8,9], distance:'near', family:true, nightlife:false},
  {name:'Atina', extra:'Grčka', vibes:['city','sea'], months:[4,5,6,9,10], distance:'near', family:true, nightlife:false},
  {name:'Santorini', extra:'Grčka', vibes:['sea'], months:[5,6,7,8,9,10], distance:'medium', family:false, nightlife:false},
  {name:'Mikonos', extra:'Grčka', vibes:['sea','nightlife'], months:[6,7,8,9], distance:'medium', family:false, nightlife:true},
  {name:'Rodos', extra:'Grčka', vibes:['sea'], months:[5,6,7,8,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Krit', extra:'Grčka', vibes:['sea','nature'], months:[5,6,7,8,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Rim', extra:'Italija', vibes:['city'], months:[3,4,5,9,10,11], distance:'medium', family:true, nightlife:false},
  {name:'Milano', extra:'Italija', vibes:['city','nightlife'], months:[3,4,5,9,10], distance:'medium', family:false, nightlife:true},
  {name:'Venecija', extra:'Italija', vibes:['city'], months:[3,4,5,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Firenca', extra:'Italija', vibes:['city'], months:[4,5,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Barselona', extra:'Španija', vibes:['sea','city','nightlife'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:true},
  {name:'Madrid', extra:'Španija', vibes:['city','nightlife'], months:[4,5,9,10], distance:'medium', family:true, nightlife:true},
  {name:'Malaga', extra:'Španija', vibes:['sea'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Ibica', extra:'Španija', vibes:['sea','nightlife'], months:[6,7,8,9], distance:'medium', family:false, nightlife:true},
  {name:'Lisabon', extra:'Portugalija', vibes:['city','sea','nightlife'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:true},
  {name:'Porto', extra:'Portugalija', vibes:['city'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Pariz', extra:'Francuska', vibes:['city'], months:[4,5,6,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Nica', extra:'Francuska', vibes:['sea','city'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'London', extra:'Velika Britanija', vibes:['city','nightlife'], months:[4,5,6,9], distance:'medium', family:true, nightlife:true},
  {name:'Amsterdam', extra:'Holandija', vibes:['city','nightlife'], months:[4,5,6,9], distance:'medium', family:true, nightlife:true},
  {name:'Berlin', extra:'Nemačka', vibes:['city','nightlife'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:true},
  {name:'Minhen', extra:'Nemačka', vibes:['city'], months:[5,6,9], distance:'medium', family:true, nightlife:false},
  {name:'Cirih', extra:'Švajcarska', vibes:['city','nature'], months:[5,6,7,8,9], distance:'medium', family:true, nightlife:false},
  {name:'Antalija', extra:'Turska', vibes:['sea'], months:[5,6,7,8,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Bodrum', extra:'Turska', vibes:['sea','nightlife'], months:[6,7,8,9], distance:'medium', family:false, nightlife:true},
  {name:'Kapadokija', extra:'Turska', vibes:['nature'], months:[4,5,9,10], distance:'medium', family:true, nightlife:false},
  {name:'Tel Aviv', extra:'Izrael', vibes:['sea','city','nightlife'], months:[4,5,6,9,10], distance:'medium', family:false, nightlife:true},
  {name:'Dubai', extra:'UAE', vibes:['city'], months:[11,12,1,2,3], distance:'medium', family:true, nightlife:true},
  {name:'Kairo', extra:'Egipat', vibes:['city','nature'], months:[10,11,12,1,2,3], distance:'medium', family:true, nightlife:false},
  {name:'Šarm El Šeik', extra:'Egipat', vibes:['sea'], months:[10,11,12,1,2,3,4], distance:'medium', family:true, nightlife:false},
  {name:'Marakeš', extra:'Maroko', vibes:['city'], months:[3,4,10,11], distance:'medium', family:true, nightlife:false},
  {name:'Njujork', extra:'SAD', vibes:['city','nightlife'], months:[4,5,9,10,12], distance:'far', family:true, nightlife:true},
  {name:'Majami', extra:'SAD', vibes:['sea','nightlife'], months:[11,12,1,2,3,4], distance:'far', family:true, nightlife:true},
  {name:'Los Anđeles', extra:'SAD', vibes:['city','sea'], months:[3,4,5,9,10], distance:'far', family:true, nightlife:false},
  {name:'Bangkok', extra:'Tajland', vibes:['city','nightlife'], months:[11,12,1,2], distance:'far', family:true, nightlife:true},
  {name:'Puket', extra:'Tajland', vibes:['sea'], months:[11,12,1,2,3], distance:'far', family:true, nightlife:false},
  {name:'Tokio', extra:'Japan', vibes:['city'], months:[3,4,5,10,11], distance:'far', family:true, nightlife:false},
  {name:'Bali', extra:'Indonezija', vibes:['sea','nature'], months:[5,6,7,8,9], distance:'far', family:true, nightlife:false},
  {name:'Singapur', extra:'Singapur', vibes:['city'], months:[1,2,3,4,11,12], distance:'far', family:true, nightlife:true},
  {name:'Sidnej', extra:'Australija', vibes:['city','sea'], months:[10,11,12,1,2,3], distance:'far', family:true, nightlife:false},
  {name:'Kejptaun', extra:'Južnoafrička Republika', vibes:['nature','sea'], months:[10,11,12,1,2,3], distance:'far', family:true, nightlife:false},
];

const MATCH_VIBE_LABELS = {sea:'more i plažu', city:'grad i kulturu', nature:'prirodu i planinu', nightlife:'dobar provod', mix:'kombinaciju svega'};
const MATCH_MONTH_NAMES = ['januar','februar','mart','april','maj','jun','jul','avgust','septembar','oktobar','novembar','decembar'];

// Deo bodovanja koji NE zavisi od cene (poklapanje sa odgovorima,
// sezonom i dužinom puta) — cena/budžet se dodaje posebno u
// pickMatchDestinations, pošto cena zavisi od već izračunatog pkg-a.
function computeMatchFitScore(cand, answers, nights, month){
  const tags = cand.tags;
  const reasons = [];
  let score = 0;

  // Šta ti znači odmor? (do 34 poena)
  if (answers.vibe === 'mix'){
    score += Math.min(34, 14 + tags.vibes.length * 7);
    reasons.push('vibe_mix');
  } else if (tags.vibes.includes(answers.vibe)){
    score += 34;
    reasons.push('vibe_' + answers.vibe);
  } else {
    score += 6;
  }

  // Sezona — mesec polaska iz već izabranih datuma (do 22 poena)
  if (tags.months.includes(month)){
    score += 22;
    reasons.push('season');
  } else {
    const prev = month === 1 ? 12 : month - 1;
    const next = month === 12 ? 1 : month + 1;
    if (tags.months.includes(prev) || tags.months.includes(next)) score += 11;
  }

  // Dužina puta iz već izabranih datuma vs udaljenost destinacije (do 20 poena)
  // — vikend putovanje ne predlaže interkontinentalni let, dug odmor
  // favorizuje udaljenije destinacije.
  if (nights <= 3){
    if (tags.distance === 'near') { score += 20; reasons.push('near_fit'); }
    else if (tags.distance === 'medium') score += 6;
  } else if (nights <= 7){
    if (tags.distance === 'medium') { score += 18; reasons.push('length_fit'); }
    else if (tags.distance === 'near') score += 14;
    else score += 9;
  } else {
    if (tags.distance === 'far') { score += 20; reasons.push('length_fit'); }
    else score += 13;
  }

  // Sa kim putuješ? (do 14 poena)
  if (answers.companion === 'family'){
    if (tags.family) { score += 14; reasons.push('family'); }
    else score += 2;
  } else if (answers.companion === 'friends'){
    if (tags.nightlife) { score += 14; reasons.push('nightlife'); }
    else score += 6;
  } else if (answers.companion === 'couple'){
    if (tags.vibes.includes('sea') || tags.vibes.includes('city')) { score += 12; reasons.push('romantic'); }
    else score += 6;
  } else {
    score += 10;
  }

  return {score, reasons};
}

function computeMatchCandidates(from, to, adults, flags){
  const nights = nightsBetween(from, to);
  const days = nights;
  // Polazište iz forme — utiče na cenu leta (flightRouteMult) i na deep link.
  const matchOrigin = (document.getElementById('origin') || {}).value || '';
  return MATCH_DESTINATIONS.map(d => {
    const seed = hashSeed(d.name.toLowerCase()+d.name.length+nights+adults);
    const rng = seededRandom(seed);
    const factor = marketFactor(d.name, todayStr());
    const pkg = buildPackage(rng, d.name, nights, days, adults, 'best', flags, factor, matchOrigin, seasonFactor(d.name, from));
    attachAffiliateLinks(pkg, d.name, from, to, adults, {originCode: matchOrigin, flags});
    return {dest:d.name, country:d.extra||'', pkg, tags:d};
  });
}

// Rangira SVE kandidate po poklapanju + budžetu i vraća top `count`,
// plus ceo rangirani pool (za "Drugih 3 predloga" i fino podešavanje
// bez ponovnog otvaranja upitnika).
function pickMatchDestinations(answers, budget, candidates, nights, month, count){
  const scored = candidates.map(c => {
    const fit = computeMatchFitScore(c, answers, nights, month);
    let bonus = 0;
    let fitsBudget = true;
    if (budget){
      const ratio = c.pkg.total / budget;
      fitsBudget = ratio <= 1;
      bonus = fitsBudget ? 10 : Math.max(-24, 10 - (ratio - 1) * 40);
      if (fitsBudget) fit.reasons.push('budget');
    }
    const total = fit.score + bonus;
    const matchPct = Math.max(35, Math.min(98, Math.round(total)));
    return Object.assign({}, c, {matchScore: total, matchPct, reasons: fit.reasons, fitsBudget});
  });
  scored.sort((a, b) => b.matchScore - a.matchScore);
  const usedFallback = !!budget && !scored.slice(0, count).every(s => s.fitsBudget);
  return {picks: scored.slice(0, count), pool: scored, usedFallback};
}

// Kratka rečenica "Zato što…" — objašnjava PREPORUKU umesto da samo
// pokaže cenu, tako da korisnik vidi zašto baš taj grad, ne samo koliko košta.
function matchReasonSentence(pick, answers, month){
  const bits = [];
  const r = pick.reasons;
  if (r.some(x => x.startsWith('vibe_'))) bits.push('nudi ' + (MATCH_VIBE_LABELS[answers.vibe] || 'tvoj stil odmora'));
  if (r.includes('season')) bits.push('baš je sezona za ' + MATCH_MONTH_NAMES[month - 1]);
  if (r.includes('near_fit') || r.includes('length_fit')) bits.push('dužina puta se dobro uklapa');
  if (r.includes('family')) bits.push('pogodna je za porodice');
  if (r.includes('nightlife')) bits.push('odlična je za izlazak s društvom');
  if (r.includes('romantic')) bits.push('ima romantičnu atmosferu za parove');
  if (r.includes('budget')) bits.push('uklapa se u budžet');
  const top = bits.slice(0, 2);
  if (!top.length) return 'Solidna opcija u okviru tvog budžeta.';
  return 'Zato što ' + top.join(' i ') + '.';
}

/* ==========================================================
   Loading skeleton — prikazuje se u #resultsBody dok se ponuda
   računa (lokalno ili sa backend-a), umesto praznog ekrana ili
   golog spinnera. Oblik prati stvarne .pkg/.item-card kartice
   (3 paketa x 3 stavke) da ne dođe do skoka layout-a kad prava
   ponuda stigne. ========================================================== */
function skeletonItemHtml(){
  return `
  <div class="skel-item">
    <div class="skel skel-photo"></div>
    <div class="skel-item-body">
      <div class="skel skel-label"></div>
      <div class="skel skel-name"></div>
      <div class="skel skel-sub2"></div>
      <div class="skel skel-price2"></div>
      <div class="skel skel-btn"></div>
    </div>
  </div>`;
}

function skeletonPkgHtml(){
  return `
  <div class="skel-pkg">
    <div class="skel-pkg-head">
      <div>
        <div class="skel skel-badge"></div>
        <div class="skel skel-title"></div>
        <div class="skel skel-sub"></div>
      </div>
      <div>
        <div class="skel skel-price"></div>
        <div class="skel skel-price-cur"></div>
      </div>
    </div>
    <div class="skel-items-row">${skeletonItemHtml()}${skeletonItemHtml()}${skeletonItemHtml()}</div>
  </div>`;
}

function skeletonResultsHtml(loadingText){
  return `
  <div class="skel-packages" role="status" aria-busy="true" aria-live="polite">
    <span class="sr-only">${escapeHtml(loadingText || '')}</span>
    ${skeletonPkgHtml()}${skeletonPkgHtml()}${skeletonPkgHtml()}
  </div>`;
}

/* ==========================================================
   Slajder za pakete (Budget/Comfort/Best Value) — na mobilnom
   se 3 kartice prikazuju kao horizontalni slajder sa snap-om i
   tačkicama umesto naslaganih jedna ispod druge (na širim
   ekranima CSS ih vraća u 3 kolone, vidi @media u styles.css).
========================================================== */
function packagesSliderHtml(cardsHtml){
  const dots = cardsHtml.length > 1
    ? `<div class="packages-dots">${cardsHtml.map((_,i)=>`<button type="button" class="packages-dot${i===0?' active':''}" data-idx="${i}" aria-label="Prikaži ponudu ${i+1}"></button>`).join('')}</div>`
    : '';
  return `<div class="packages-slider-wrap"><div class="packages">${cardsHtml.join('')}</div>${dots}</div>`;
}

function initPackagesSlider(wrap){
  if (!wrap) return;
  const track = wrap.querySelector('.packages');
  const dotsWrap = wrap.querySelector('.packages-dots');
  if (!track || !dotsWrap) return;
  track.scrollLeft = 0;
  const cards = Array.from(track.querySelectorAll('.pkg'));
  const dots = Array.from(dotsWrap.querySelectorAll('.packages-dot'));
  if (cards.length < 2) return;
  const setActive = (idx) => dots.forEach((d,i)=>d.classList.toggle('active', i===idx));
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = Number(dot.dataset.idx);
      const card = cards[idx];
      if (card) card.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'});
    });
  });
  if ('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6){
          const idx = cards.indexOf(entry.target);
          if (idx > -1) setActive(idx);
        }
      });
    }, {root:track, threshold:[0.6]});
    cards.forEach(c => io.observe(c));
  }
}

function rebuildPackagesDots(sliderWrap){
  if (!sliderWrap) return;
  const track = sliderWrap.querySelector('.packages');
  const dotsWrap = sliderWrap.querySelector('.packages-dots');
  if (!track) return;
  const cards = Array.from(track.querySelectorAll('.pkg'));
  if (!dotsWrap) return;
  if (cards.length < 2){ dotsWrap.remove(); return; }
  dotsWrap.innerHTML = cards.map((_,i)=>`<button type="button" class="packages-dot${i===0?' active':''}" data-idx="${i}" aria-label="Prikaži ponudu ${i+1}"></button>`).join('');
  initPackagesSlider(sliderWrap);
}

/* Centrira dati element u vidljivom prostoru ISPOD sticky top bara.
   Native scrollIntoView({block:'center'}) centrira CEO element — a
   #resultsBody (3 kartice u slajderu + tačkice + disclaimer pasus ispod)
   je često viši od ekrana, pa "centriranje" celog bloka gurne njegov vrh
   (deo koji korisnik treba da vidi) gore, ispod/iza sticky menija. Zato
   ovde ciljamo KONKRETAN element (npr. samu prvu karticu ponude) i
   centriramo SAMO njega u prostoru koji ostaje ispod menija. */
function scrollIntoCenterBelowHeader(el){
  if (!el) return;
  const topbarH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 0;
  const rect = el.getBoundingClientRect();
  const availableH = window.innerHeight - topbarH;
  const elH = Math.min(rect.height, availableH);
  const targetTopInViewport = topbarH + Math.max(0, (availableH - elH) / 2);
  const currentY = window.scrollY || window.pageYOffset;
  const elTopAbs = rect.top + currentY;
  window.scrollTo({top: Math.max(0, elTopAbs - targetTopInViewport), behavior:'smooth'});
}

/* ==========================================================
   Rezultati (3 kartice ponuda) kao zaseban prozor na mobilnom
   ==========================================================
   Na širem ekranu #results ostaje običan deo stranice (kao pre).
   Na mobilnom (<=760px) otvara se kao "bottom sheet" preko sadržaja:
   80% visine ekrana, pozadina stranice je zaključana (position:fixed
   trik, isti obrazac kao kod kalendara), a "Nazad" dugme zatvara sheet
   i vraća korisnika tačno tamo gde je bio na sajtu. Bez ovoga je skrol
   prstom unutar kartica u praksi skrolovao CEO sajt, jer su kartice
   bile samo deo obične stranice, a ne svoj prozor.
========================================================== */
let _resultsScrollY = 0;
const isMobileResults = () => window.matchMedia('(max-width:760px)').matches;

let _resultsScrollLocked = false;
// Isti razlog/rešenje kao kod kalendara/putnika (vidi lockPageScroll tamo).
function lockResultsPageScroll(){
  if (_resultsScrollLocked) return;
  _resultsScrollLocked = true;
  _resultsScrollY = window.scrollY;
  setTimeout(() => {
    if (!_resultsScrollLocked) return;
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + _resultsScrollY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }, 0);
}
function unlockResultsPageScroll(){
  _resultsScrollLocked = false;
  setTimeout(() => {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, _resultsScrollY);
  }, 0);
}

function openResultsSheet(){
  const results = document.getElementById('results');
  if (!results) return;
  const wasVisible = results.classList.contains('visible');
  results.classList.add('visible');
  const backdrop = document.getElementById('resultsBackdrop');
  if (isMobileResults()){
    if (backdrop) backdrop.classList.add('open');
    results.setAttribute('role', 'dialog');
    results.setAttribute('aria-modal', 'true');
    if (!wasVisible || !_resultsScrollLocked) lockResultsPageScroll();
    guardOverlayOpen('results', closeResultsSheet);
  }
}

function requestCloseResultsSheet(){
  if (!guardOverlayRequestClose('results')) closeResultsSheet();
}

function closeResultsSheet(){
  const results = document.getElementById('results');
  if (!results) return;
  const backdrop = document.getElementById('resultsBackdrop');
  const wasLocked = _resultsScrollLocked;
  results.classList.remove('visible');
  if (backdrop) backdrop.classList.remove('open');
  results.removeAttribute('role');
  results.removeAttribute('aria-modal');
  if (wasLocked) unlockResultsPageScroll();
  const trigger = document.querySelector('.btn-search-main');
  if (trigger) trigger.focus();
}

(function(){
  const backBtn = document.getElementById('resultsBackBtn');
  const backdrop = document.getElementById('resultsBackdrop');
  if (backBtn) backBtn.addEventListener('click', () => requestCloseResultsSheet());
  if (backdrop) backdrop.addEventListener('click', () => requestCloseResultsSheet());
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const results = document.getElementById('results');
    if (results && results.classList.contains('visible') && isMobileResults()) requestCloseResultsSheet();
  });
  // Ako se ekran "prebaci" preko 760px dok je sheet otvoren (npr. rotacija
  // tableta), skini zaključavanje skrola — na širem ekranu #results više
  // nije fiksni sheet, pa zaključana pozadina ne bi imala smisla.
  window.addEventListener('resize', () => {
    const results = document.getElementById('results');
    if (!results || !results.classList.contains('visible')) return;
    if (!isMobileResults() && _resultsScrollLocked){
      unlockResultsPageScroll();
      const backdrop = document.getElementById('resultsBackdrop');
      if (backdrop) backdrop.classList.remove('open');
      results.removeAttribute('role');
      results.removeAttribute('aria-modal');
      guardOverlayDrop('results');
    }
  });
})();

function showResultsError(){
  const body = document.getElementById('resultsBody');
  if (!body) return;
  body.classList.remove('rb-hidden', 'rb-swap-out');
  body.classList.add('rb-reveal');
  body.innerHTML = '<div class="disclaimer" role="alert" style="text-align:center;padding:18px 12px;">'
    + '<p style="margin:0 0 10px;">' + L3('Nešto nije u redu i ponude se nisu učitale.', 'Something went wrong and the offers didn’t load.', 'Что-то пошло не так, и предложения не загрузились.') + '</p>'
    + '<button type="button" class="pkg-alert-btn" onclick="runSearch(false)">' + L3('Pokušaj ponovo', 'Try again', 'Повторить') + '</button></div>';
}
// Destinacija koju ne prepoznajemo ni u jednoj našoj bazi — korisniku javljamo
// da je ponuda okvirna, umesto da tiho prikažemo izmišljen "<grad> Hotel".
function isKnownDestination(destRaw){
  const key = normalizeSr(String(destRaw || '').split(',')[0].trim());
  if (!key) return false;
  if (POPULAR_DESTINATIONS.some(d => normalizeSr(d.name) === key)) return true;
  if (MATCH_DESTINATIONS.some(d => normalizeSr(d.name) === key)) return true;
  return !!airportInfoFor(destRaw);
}
async function renderResults(dest, from, to, nights, days, adults, flags, originCode, autoReveal, seq){
  try {
    await renderResultsInner(dest, from, to, nights, days, adults, flags, originCode, autoReveal, seq);
  } catch (err) {
    console.error('[sklopi] prikaz ponuda nije uspeo:', err);
    if (seq !== undefined && seq !== window._searchSeq) return;
    showResultsError();
  }
}
async function renderResultsInner(dest, from, to, nights, days, adults, flags, originCode, autoReveal, seq){
  const backendPkgs = await fetchPackagesFromBackend({
    dest, from, to, adults, originCode, flags
  });
  if (seq !== undefined && seq !== window._searchSeq) return; // stigla je novija pretraga
  const pkgs = backendPkgs || computePackagesLocally(dest, from, to, nights, days, adults, flags, originCode);

  // Global kontekst za "Sačuvaj ovu ponudu" dugme na svakoj kartici —
  // isti obrazac kao window._lastBuilderPkg za builder.
  window._lastSearchPkgs = pkgs;
  window._lastSearchCtx = {dest, from, to, adults, nights, flags};

  document.getElementById('ctaTitle').textContent = L3(dest + ' te čeka.', dest + ' is waiting for you.', dest + ' ждёт тебя.');
  document.getElementById('ctaDesc').textContent = ctaCopy(dest);

  const head = document.getElementById('resultsHead');
  const altNote = altAirportNoteFor(originCode);
  const destNote = destAirportNoteFor(dest);
  const unknownNote = isKnownDestination(dest) ? '' : L3(
    'Ne prepoznajemo tačno „' + dest + '“ — proveri pisanje. Ponuda je okvirna, a linkovi vode na opštu pretragu partnera.',
    'We don’t recognise “' + dest + '” exactly — check the spelling. The offer is approximate and links lead to the partner’s general search.',
    'Мы не узнаём «' + dest + '» точно — проверь написание. Предложение приблизительное, а ссылки ведут на общий поиск партнёра.');
  const notes = [
    unknownNote ? `<div class="plan-note">🔎 ${escapeHtml(unknownNote)}</div>` : '',
    altNote ? `<div class="plan-note">✈️ <b>Isplati li se let preko drugog aerodroma?</b><br>${escapeHtml(altNote)}</div>` : '',
    destNote ? `<div class="plan-note">🛬 <b>Pazi na koji aerodrom sležeš</b><br>${escapeHtml(destNote)}</div>` : ''
  ].filter(Boolean).join('');
  head.innerHTML = notes ? `<div class="plan-notes">${notes}</div>` : '';

  // "Tvoj plan" kartica (naslov, Nastavi dugme i builder link) je uklonjena —
  // paketi se sada prikazuju odmah, bez međukoraka. Zamena skeletona
  // pravim karticama ide kroz kratki fade-out/fade-in (rb-swap-out), da
  // prelaz izgleda smišljeno, a ne kao nagli skok sadržaja.
  const body = document.getElementById('resultsBody');
  const hadSkeleton = !!body.querySelector('.skel-packages');
  body.classList.add('rb-swap-out');
  setTimeout(() => {
    if (seq !== undefined && seq !== window._searchSeq) return;
    try {
      body.innerHTML = `${packagesSliderHtml(pkgs.map(pkgHtml))}`;
      initPackagesSlider(body.querySelector('.packages-slider-wrap'));
      body.classList.remove('rb-swap-out');
      body.classList.remove('rb-hidden');
      body.classList.add('rb-reveal');

      requestAnimationFrame(() => {
        scrollIntoCenterBelowHeader(body.querySelector('.packages .pkg') || body);
      });
    } catch (err) {
      console.error('[sklopi] iscrtavanje kartica nije uspelo:', err);
      showResultsError();
    }
  }, hadSkeleton ? 180 : 0);
}

/* ---- Vidljiva oznaka "affiliate/sponzorisan link" pored svake CTA
   rezervacije — potrošačka zaštita/transparentnost, ne samo FTC. ---- */
function affBadgeHtml(){
  return `<span class="aff-badge" title="${escapeHtml(t('aff_badge_title'))}" tabindex="0">🔗 ${escapeHtml(t('aff_badge'))}</span>`;
}

function itemCardHtml(item, kind, pkg){
  if (!item) return '';
  const labels = {flight:'Let', hotel:'Hotel', car:'Auto'};
  const btnLabel = {flight:t('btn_search_kayak'), hotel:t('btn_book_booking'), car:t('btn_book_booking')};
  return `
  <div class="item-card ${kind}">
    <div class="item-photo ${kind}">${iconSvg(kind)}</div>
    <div class="item-body">
      <div class="item-label">${labels[kind]}${item.providerLabel!=='SKLOPI' ? `<span class="item-provider">${escapeHtml(item.providerLabel)}</span>` : ''}</div>
      <div class="item-name">${escapeHtml(item.name)}</div>
      <div class="item-sub">${escapeHtml(item.sub)}</div>
      ${item.perks && item.perks.length ? `<ul class="item-perks">${item.perks.map(pk => `<li class="perk ${pk.pos === true ? 'pos' : pk.pos === false ? 'neg' : 'neu'}" data-i18n="${pk.k}">${escapeHtml(t(pk.k))}</li>`).join('')}</ul>` : ''}
      <div class="item-price tabular">${fmtEUR(item.price)}</div>
      <a class="item-btn ${kind}" href="${escapeHtml(item.bookUrl||'#')}" target="_blank" rel="noopener" data-kind="${kind}" data-price="${item.price}" data-url="${escapeHtml(item.bookUrl||'')}" data-dest="${escapeHtml(pkg&&pkg.dest||'')}" data-tier="${escapeHtml(pkg&&pkg.tier||'')}" onclick="bookItem(this)">${btnLabel[kind]}</a>
      ${affBadgeHtml()}
    </div>
  </div>`;
}

function pkgHtml(pkg){
  const meta = TIER_META[pkg.tier];
  const featured = pkg.recommended;
  const itemsRow = [
    itemCardHtml(pkg.flight,'flight',pkg),
    itemCardHtml(pkg.hotel,'hotel',pkg),
    itemCardHtml(pkg.car,'car',pkg)
  ].filter(Boolean).join('');

  return `
  <div class="pkg ${pkg.tier} ${featured?'featured':''}" data-base-total="${pkg.total}">
    <button type="button" class="pkg-close" onclick="closePkgCard(this)" aria-label="Zatvori ovu ponudu" title="Zatvori ovu ponudu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
    <div class="pkg-head">
      <div class="pkg-head-main">
        ${featured ? `<span class="pkg-badge">★ Preporučeno</span>` : ''}
        <h3>${meta.label}</h3>
        <div class="pkg-desc">${pkgDescText(pkg)}</div>
        <div class="pkg-total">
          <div class="num tabular">${fmtEUR(pkg.total)}</div>
          <div class="cur">ukupno</div>
          <div class="hint">zbir odvojenih rezervacija, ne jedno plaćanje</div>
        </div>
      </div>
      <div class="pkg-score-box score-${pkg.score>=80?'good':pkg.score>=60?'mid':'low'}">
        <div class="score-num tabular">${pkg.score}</div>
        <div class="score-max">/100</div>
        <div class="score-label">odnos cene i&nbsp;kvaliteta</div>
      </div>
    </div>
    ${itemsRow ? `<div class="items-row">${itemsRow}</div>` : ''}
    ${(() => {
      const extraTiles = [
        pkg.activity ? `<div class="extra activity-extra">${iconSvg('activity')}<div><div class="lab">${escapeHtml(pkg.activity.name.split(' — ')[0])}</div><div class="val tabular">${fmtEUR(pkg.activity.price)}</div></div><a class="extra-btn" href="${escapeHtml(pkg.activity.bookUrl||'#')}" target="_blank" rel="noopener" data-kind="activity" data-price="${pkg.activity.price}" data-url="${escapeHtml(pkg.activity.bookUrl||'')}" data-dest="${escapeHtml(pkg.dest||'')}" data-tier="${escapeHtml(pkg.tier||'')}" onclick="bookItem(this)">Viator</a>${affBadgeHtml()}</div>` : '',
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
    const sliderWrap = wrap && wrap.classList.contains('packages') ? wrap.closest('.packages-slider-wrap') : null;
    if (wrap && wrap.classList.contains('packages') && !wrap.querySelector('.pkg')){
      wrap.innerHTML = '<p class="disclaimer" style="text-align:center;">Sklonio si sve ponude sa liste. <button type="button" class="pkg-alert-btn" style="margin-left:6px;" onclick="runSearch(false)">Pretraži ponovo</button></p>';
      const dotsWrap = sliderWrap && sliderWrap.querySelector('.packages-dots');
      if (dotsWrap) dotsWrap.remove();
    } else if (sliderWrap) {
      rebuildPackagesDots(sliderWrap);
    }
  }, 200);
}

/* ==========================================================
   Prikaz rezultata za "Pronađi svoj izlet" — 3 RAZLIČITE destinacije
   sa procentom poklapanja i objašnjenjem, ne samo cenom. Deli
   #resultsHead/#resultsBody sa običnom pretragom (isti kontejner),
   samo drugačiji sadržaj + poseban jewel-tone match bedž.
========================================================== */
function matchPkgHtml(pick, idx, budget, answers, month){
  const {dest, country, pkg, matchPct, fitsBudget} = pick;
  const featured = idx === 0;
  const itemsRow = [
    itemCardHtml(pkg.flight,'flight',pkg),
    itemCardHtml(pkg.hotel,'hotel',pkg),
    itemCardHtml(pkg.car,'car',pkg)
  ].filter(Boolean).join('');
  const busNote = busTrainNoteFor(dest, pick.adults);
  const reasonText = matchReasonSentence(pick, answers, month);

  return `
  <div class="pkg match-pkg ${featured?'featured':''}" data-base-total="${pkg.total}">
    <div class="pkg-head">
      <div class="pkg-head-main">
        <span class="pkg-badge match-badge">${featured ? '★ Preporučeno' : '🧭 Predlog za tebe'}</span>
        <h3>${escapeHtml(dest)}</h3>
        <div class="pkg-desc">${escapeHtml(country)} · Best Value</div>
        <div class="pkg-total">
          <div class="num tabular">${fmtEUR(pkg.total)}</div>
          <div class="cur">ukupno</div>
          <div class="hint">zbir odvojenih rezervacija, ne jedno plaćanje</div>
        </div>
      </div>
      <div class="pkg-score-box">
        <div class="score-num tabular">${matchPct}%</div>
        <div class="score-max">poklapanje</div>
        <div class="score-label">sa tvojim odgovorima</div>
      </div>
    </div>
    <div class="match-reason">💡 ${escapeHtml(reasonText)}</div>
    ${busNote ? `<div class="alt-airport-box" style="margin:0 0 14px;">🚌 <b>Razmisli i o autobusu</b><br>${escapeHtml(busNote)}</div>` : ''}
    ${itemsRow ? `<div class="items-row">${itemsRow}</div>` : ''}
    <div class="confirm-banner">
      <span>${iconSvg('check')} ${budget ? (fitsBudget ? t('fits_budget') + fmtEUR(budget) + '.' : t('over_budget')) : 'Bez zadatog budžeta — rangirano samo po poklapanju.'}</span>
      <span><span class="amt-lab">Ukupno:</span><span class="amt tabular">${fmtEUR(pkg.total)}</span></span>
    </div>
    <button type="button" class="pkg-save-btn" onclick="exploreMatchDestination(${idx})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M9 18l6-6-6-6"/></svg>
      Napravi aranžman za ${escapeHtml(dest)}
    </button>
    <button type="button" class="pkg-save-btn" onclick="saveMatchPackage(${idx})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
      Sačuvaj ovu ponudu
    </button>
    <button type="button" class="pkg-alert-btn" onclick="openAlertModal('search', 'best', ${pkg.total}, '${escapeHtml(dest).replace(/'/g,"\\'")}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 3a5 5 0 00-5 5v3.2c0 .9-.35 1.75-.98 2.4L4.6 15h14.8l-1.42-1.4a3.4 3.4 0 01-.98-2.4V8a5 5 0 00-5-5z"/><path d="M9.5 19a2.6 2.6 0 005 0"/></svg>
      Javi mi kad padne cena
    </button>
  </div>`;
}

function renderMatchResults(picks, ctxBase, budget, answers, usedFallback){
  window._lastMatchPicks = picks;
  window._lastMatchCtx = ctxBase;
  window._lastMatchAnswers = answers;

  const month = new Date(ctxBase.from).getMonth() + 1;
  const vibeLab = MATCH_VIBE_LABELS[answers.vibe] || '';
  const head = document.getElementById('resultsHead');
  head.innerHTML = `
    <div class="status-banner match-status-banner">
      <div class="status-left">
        <div class="status-check">🧭</div>
        <div><h3>3 destinacije koje ti najbolje odgovaraju.</h3><p>${usedFallback ? 'Nijedna se u potpunosti nije uklopila u budžet — evo 3 najbliže opcije po poklapanju i ceni.' : ('Rangirano po tvojim odgovorima' + (vibeLab ? ' (' + vibeLab + ')' : '') + ', sezoni i dužini puta — ne nasumično.')}</p></div>
      </div>
      <div class="status-pills">
        <div class="pill">${iconSvg('calendar')} ${fmtDate(ctxBase.from)} – ${fmtDate(ctxBase.to)}</div>
        <div class="pill">${iconSvg('people')} ${ctxBase.adults} ${passengerLabel(ctxBase.adults)}</div>
      </div>
    </div>
  `;

  const body = document.getElementById('resultsBody');
  const hadSkeleton = !!body.querySelector('.skel-packages');
  body.classList.add('rb-swap-out');
  setTimeout(() => {
    body.innerHTML = `
      ${packagesSliderHtml(picks.map((p,i)=>matchPkgHtml(p, i, budget, answers, month)))}
      <div class="match-refine-row">
        <button type="button" class="chip match-refine-chip" onclick="refineMatchSearch('sea')">🌊 Više plaže</button>
        <button type="button" class="chip match-refine-chip" onclick="refineMatchSearch('nightlife')">🎉 Više provoda</button>
        <button type="button" class="chip match-refine-chip" onclick="refineMatchSearch('nature')">🌲 Više prirode</button>
        <button type="button" class="chip match-refine-chip" onclick="refineMatchSearch('cheaper')">💶 Manji budžet</button>
      </div>
      <button type="button" class="btn-alert match-reroll-btn" onclick="runMatchSearch(true)">🔁 Probaj drugih 3 predloga</button>
    `;
    initPackagesSlider(body.querySelector('.packages-slider-wrap'));
    body.classList.remove('rb-swap-out');
  }, hadSkeleton ? 180 : 0);
}

// Trenutno stanje upitnika (popunjava se klikom na chip-ove u modalu)
const matchQuizState = { companion:null, vibe:null };

async function runMatchSearch(isReroll){
  const budgetInput = document.getElementById('matchBudget');
  const budget = Number(budgetInput.value) || 0;

  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  const adults = document.getElementById('adults').value || '2';
  const flags = {
    flight:    document.querySelector('.toggle[data-t="flight"]').classList.contains('on'),
    hotel:     document.querySelector('.toggle[data-t="hotel"]').classList.contains('on'),
    car:       document.querySelector('.toggle[data-t="car"]').classList.contains('on'),
    activity:  document.querySelector('.toggle[data-t="activity"]').classList.contains('on'),
    // Iste stvarne preference iz upitnika kao i kod runSearch() — vidi
    // komentar tamo. "Pronađi svoj izlet" predlaže DESTINACIJE, ali
    // paketi koje pravi za njih treba da poštuju isti tip leta/hotela/
    // auta/broj aktivnosti, ne nasumičan sadržaj.
    flightPref: builderState.flightPref,
    airlineName: builderState.airlineName,
    hotelStars: builderState.hotelStars,
    prioritizeRating: builderState.prioritizeRating,
    prioritizeLocation: builderState.prioritizeLocation,
    carPref: builderState.carPref !== 'none' ? builderState.carPref : 'small',
    activityCount: builderState.activityCount > 0 ? builderState.activityCount : 1,
  };
  const answers = Object.assign({}, (isReroll && window._lastMatchAnswers) || matchQuizState);
  if (!answers.companion || !answers.vibe){ showToast('Odgovori na oba pitanja pre pretrage.'); return; }

  // Direktan prelazak na rezultate — vidi komentar uz guardOverlayReplace
  // (zašto NE koristimo requestCloseMatchModal ovde).
  if (!isReroll){
    closeMatchModal();
    guardOverlayReplace('match', 'results', closeResultsSheet);
  }

  const results = document.getElementById('results');
  openResultsSheet();
  if (!isReroll){
    document.getElementById('resultsHead').innerHTML = '';
    document.getElementById('resultsBody').innerHTML = skeletonResultsHtml('Tražimo destinacije koje ti najbolje odgovaraju…');
    if (!isMobileResults()) results.scrollIntoView({behavior:'smooth', block:'start'});
  }

  setTimeout(()=>{
    const nights = nightsBetween(from, to);
    const month = new Date(from).getMonth() + 1;
    const candidates = computeMatchCandidates(from, to, adults, flags).map(c => Object.assign(c, {adults}));
    const excludeNames = isReroll ? (window._lastMatchPicks || []).map(p => p.dest) : [];
    const pool = excludeNames.length ? candidates.filter(c => !excludeNames.includes(c.dest)) : candidates;
    const {picks, usedFallback} = pickMatchDestinations(answers, budget, pool, nights, month, 3);
    // "Poslednja destinacija" u statistici treba da bude GRAD (kao kod obične
    // pretrage), a ne budžet — zato se beleži tek kad su predlozi izračunati.
    bumpSearchStat('🧭 ' + (picks[0] ? picks[0].dest : 'Match'));
    renderMatchResults(picks, {from, to, adults, nights, flags}, budget, answers, usedFallback);
  }, isReroll ? 0 : 700);
}

// Fino podešavanje BEZ ponovnog otvaranja upitnika — menja jedan
// parametar (vibe ili budžet) i odmah ponovo rangira, kao pravi filter.
function refineMatchSearch(kind){
  const ctx = window._lastMatchCtx;
  const answers = Object.assign({}, window._lastMatchAnswers || matchQuizState);
  let budget = Number(document.getElementById('matchBudget').value) || 0;
  if (!ctx){ showToast('Pokreni "Pronađi svoj izlet" ponovo.'); return; }

  if (kind === 'cheaper'){
    budget = budget ? Math.round(budget * 0.75) : 0;
    if (!budget){ showToast('Prvo unesi budžet da bi mogao da ga smanjiš.'); return; }
    document.getElementById('matchBudget').value = budget;
  } else {
    answers.vibe = kind;
  }

  const results = document.getElementById('results');
  openResultsSheet();
  document.getElementById('resultsBody').innerHTML = skeletonResultsHtml('Prilagođavamo predloge…');
  setTimeout(()=>{
    const nights = nightsBetween(ctx.from, ctx.to);
    const month = new Date(ctx.from).getMonth() + 1;
    const candidates = computeMatchCandidates(ctx.from, ctx.to, ctx.adults, ctx.flags).map(c => Object.assign(c, {adults: ctx.adults}));
    const {picks, usedFallback} = pickMatchDestinations(answers, budget, candidates, nights, month, 3);
    renderMatchResults(picks, ctx, budget, answers, usedFallback);
  }, 350);
}

// Klik na "Napravi aranžman za {grad}" — prebacuje na normalnu pretragu
// (sva 3 tier-a) za taj konkretni grad, umesto samo 'best' predloga.
function exploreMatchDestination(idx){
  const pick = (window._lastMatchPicks || [])[idx];
  if (!pick) return;
  document.getElementById('dest').value = pick.dest;
  runSearch(true);
}

async function saveMatchPackage(idx){
  const user = await getCurrentUser();
  if (!user){
    promptLogin('Prijavi se emailom da sačuvaš ponudu.');
    return;
  }
  const pick = (window._lastMatchPicks || [])[idx];
  const ctx = window._lastMatchCtx;
  if (!pick || !ctx){ showToast('Ponuda više nije dostupna — probaj ponovo.'); return; }

  const summaryTags = [
    '🧭 ' + pick.matchPct + '% poklapanje',
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
    selection: {kind:'search', tier:'best', tierLabel:'Best Value (Pronađi svoj izlet)', summaryTags},
    total: pick.pkg.total
  });
  if (error){ showToast('Greška pri čuvanju: ' + error.message); return; }
  renderSavedTrips();
  showToast(pick.dest + ' sačuvan (' + fmtEUR(pick.pkg.total) + ').');
}

/* ---- Kviz modal: 3 koraka (sa kim / vibe / budžet), chip-select sa
   auto-napredovanjem na sledeći korak, kao pravi kratak upitnik. ---- */
function goToMatchStep(n){
  document.querySelectorAll('#matchModal .match-step').forEach(el => {
    el.classList.toggle('active', Number(el.dataset.step) === n);
  });
  document.querySelectorAll('#matchModal .match-dot').forEach(el => {
    el.classList.toggle('active', Number(el.dataset.step) === n);
  });
  if (n === 3){
    const btn = document.getElementById('matchModalSubmit');
    if (btn) setTimeout(() => document.getElementById('matchBudget').focus(), 200);
  }
}
function selectMatchChip(group, value, chipEl, nextStep){
  matchQuizState[group] = value;
  chipEl.closest('.match-chip-grid').querySelectorAll('.match-chip').forEach(c => c.classList.remove('on'));
  chipEl.classList.add('on');
  if (nextStep) setTimeout(() => goToMatchStep(nextStep), 260);
}
function openMatchModal(){
  matchQuizState.companion = null;
  matchQuizState.vibe = null;
  document.querySelectorAll('#matchModal .match-chip').forEach(c => c.classList.remove('on'));
  document.getElementById('matchBudget').value = '';
  goToMatchStep(1);
  document.getElementById('matchModalBackdrop').classList.add('open');
  document.getElementById('matchModal').classList.add('open');
  guardOverlayOpen('match', closeMatchModal);
}
function requestCloseMatchModal(){
  if (!guardOverlayRequestClose('match')) closeMatchModal();
}
function closeMatchModal(){
  document.getElementById('matchModalBackdrop').classList.remove('open');
  document.getElementById('matchModal').classList.remove('open');
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
  const dest = btn.dataset.dest || '';
  const tier = btn.dataset.tier || '';
  bumpClickStat();
  trackAffiliateClick(kind, price, dest, tier);
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

/* ---- GA4: koji partner/destinacija/tier generiše affiliate klikove.
   Ćuti ako GA nije učitan (kolačići odbijeni ili korisnik još nije birao) —
   vidi cookies.js/loadGA(). bumpClickStat() iznad i dalje radi nezavisno
   od ovoga (to je opšti brojač, ne po partneru/destinaciji). ---- */
function trackAffiliateClick(kind, price, dest, tier){
  if (typeof window.gtag !== 'function') return;
  const partner = {flight:'kayak', hotel:'booking', car:'booking', activity:'viator', esim:'airalo', insurance:'worldnomads'}[kind] || kind;
  window.gtag('event', 'affiliate_click', {
    item_kind: kind,
    partner: partner,
    destination: dest,
    tier: tier,
    value: price,
    currency: 'EUR'
  });
}

/* ---- GA4: gornji/srednji dio funnel-a (affiliate_click iznad je već
   dno funnel-a). Isti "ćuti ako GA nije učitan" obrazac kao gore —
   pozivi ispod se dešavaju i kad su kolačići odbijeni, samo bez efekta.
   Tri koraka koje ovo prati:
     search_submit  — korisnik je potvrdio destinaciju/datume (Start)
     builder_open   — otvorio "Napravi svoj aranžman" (custom put)
     offers_view    — dobio 3 gotove ponude (Budget/Best/Comfort put)
   Ovo je namerno odvojeno od bumpSearchStat/bumpClickStat, koji pišu u
   site_stats (javni brojač na sajtu, ne GA/funnel podatak). ---- */
function trackFunnelEvent(name, params){
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, params || {});
}

function showToast(msg){
  const t = document.getElementById('toast');
  document.getElementById('toastText').textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('show'), 3200);
}

function updateStats(){
  document.getElementById('statSearches').textContent = Math.max(state.searches, STAT_DISPLAY_FLOOR.searches);
  document.getElementById('statClicks').textContent = Math.max(state.clicks, STAT_DISPLAY_FLOOR.clicks);
  document.getElementById('statLast').textContent = state.lastDest || STAT_LAST_DEST_FALLBACK;
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
      console.warn('[sklopi] Deljeni brojač pretraga nije uspeo, koristim lokalni:', err.message);
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
      console.warn('[sklopi] Deljeni brojač klikova nije uspeo, koristim lokalni:', err.message);
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
    if (t.dataset.t === 'flight'){
      updateOriginVisibility(input.checked);
      renderOriginAirportWarning(document.getElementById('origin').value);
      renderDestAirportWarning(document.getElementById('dest').value);
    }
  });
});

// Postavi početno stanje u skladu sa checkbox-om koji je već markiran u HTML-u
// (trenutno "Letovi" nije uključen po default-u, pa se polje krije od starta).
updateOriginVisibility(document.querySelector('.toggle[data-t="flight"] input').checked);

function localTodayStr(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
/* Provera unosa PRE pokretanja pretrage — umesto tihih zamena (prazna
   destinacija → "Atina") i NaN cena (neispravni datumi). Vraća
   {ok:true} ili {ok:false, msg, focus}. `extra` dozvoljava pozivaocu da
   javi uključivanje auta/aktivnosti koje još nije primenjeno na toggle-ove
   (modal "Prilagodi svoj plan" ih tek postavlja); `checkPast` se traži samo
   za NOVU pretragu — ne i za učitavanje sačuvanog izleta sa starim datumima. */
function validateSearchInputs(extra){
  extra = extra || {};
  const dest = document.getElementById('dest').value.trim();
  const origin = document.getElementById('origin').value.trim();
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  const on = k => { const el = document.querySelector('.toggle[data-t="' + k + '"]'); return !!(el && el.classList.contains('on')); };
  const flight = on('flight'), hotel = on('hotel');
  const car = on('car') || !!extra.car, activity = on('activity') || !!extra.activity;
  const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !isNaN(new Date(v));
  if (!dest) return {ok:false, focus:'dest', msg:L3('Upiši destinaciju da bismo pronašli ponude.', 'Enter a destination so we can find offers.', 'Укажи направление, чтобы мы нашли предложения.')};
  if (flight && !origin) return {ok:false, focus:'origin', msg:L3('Upiši polazak — bez njega ne možemo da izračunamo let.', 'Enter where you depart from — we need it to price the flight.', 'Укажи пункт вылета — без него мы не можем рассчитать перелёт.')};
  if (!isDate(from) || !isDate(to)) return {ok:false, focus:'form', msg:L3('Izaberi datume putovanja.', 'Pick your travel dates.', 'Выбери даты поездки.')};
  if (to <= from) return {ok:false, focus:'form', msg:L3('Datum povratka mora biti posle datuma polaska.', 'The return date must be after the departure date.', 'Дата возвращения должна быть позже даты вылета.')};
  if (extra.checkPast && from < localTodayStr()) return {ok:false, focus:'form', msg:L3('Datum polaska je u prošlosti — izaberi nove datume.', 'The departure date is in the past — pick new dates.', 'Дата вылета уже прошла — выбери новые даты.')};
  if (!(flight || hotel || car || activity)) return {ok:false, focus:'form', msg:L3('Uključi bar jednu uslugu: let, smeštaj, auto ili aktivnosti.', 'Turn on at least one service: flights, stay, car or activities.', 'Включи хотя бы одну услугу: перелёт, жильё, авто или активности.')};
  return {ok:true};
}
function focusSearchField(which){
  const el = which === 'dest' || which === 'origin' ? document.getElementById(which) : null;
  const form = document.getElementById('searchForm');
  if (form) form.scrollIntoView({behavior:'smooth', block:'center'});
  if (el) setTimeout(() => el.focus({preventScroll:true}), 250);
}

async function runSearch(shouldScroll, autoReveal){
  const check = validateSearchInputs();
  if (!check.ok){ showToast(check.msg); focusSearchField(check.focus); return; }
  const dest = document.getElementById('dest').value.trim();
  const originCode = document.getElementById('origin').value.trim();
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  // Ranije se nights/days ovde NIKAD nisu definisali, pa je poziv u
  // setTimeout-u ispod bacao ReferenceError i skeleton ostajao zauvek.
  const nights = nightsBetween(from, to);
  const days = nights;
  const adults = String(Math.min(9, Math.max(1, Number(document.getElementById('adults').value) || 2)));
  const seq = window._searchSeq = (window._searchSeq || 0) + 1; // samo poslednja pretraga sme da iscrta rezultate
  const flags = {
    flight:    document.querySelector('.toggle[data-t="flight"]').classList.contains('on'),
    hotel:     document.querySelector('.toggle[data-t="hotel"]').classList.contains('on'),
    car:       document.querySelector('.toggle[data-t="car"]').classList.contains('on'),
    activity:  document.querySelector('.toggle[data-t="activity"]').classList.contains('on'),
    // Detaljne preference iz upitnika (builderState) — da tri ponuđene
    // kartice (Best/Comfort/Budget) STVARNO traže ono što je korisnik
    // izabrao (tip leta, zvezdice hotela, tip auta, broj aktivnosti), a
    // ne generišu nasumičan sadržaj po tier-u nezavisno od tih izbora.
    // Tier i dalje menja cenu/kvalitet detalja (npr. koji je hotel u istoj
    // kategoriji zvezdica), ali ne i samu kategoriju koju je korisnik tražio.
    flightPref: builderState.flightPref,
    airlineName: builderState.airlineName,
    hotelStars: builderState.hotelStars,
    prioritizeRating: builderState.prioritizeRating,
    prioritizeLocation: builderState.prioritizeLocation,
    carPref: builderState.carPref !== 'none' ? builderState.carPref : 'small',
    activityCount: builderState.activityCount > 0 ? builderState.activityCount : 1,
  };

  const results = document.getElementById('results');
  openResultsSheet();
  document.getElementById('resultsHead').innerHTML = '';
  const rb = document.getElementById('resultsBody');
  rb.innerHTML = skeletonResultsHtml('Pripremamo tvoj plan…');
  rb.classList.remove('rb-hidden');
  rb.classList.add('rb-reveal');
  if (shouldScroll && !isMobileResults()) results.scrollIntoView({behavior:'smooth', block:'start'});

  bumpSearchStat(dest);
  logAirportDbMiss(originCode, 'origin');
  logAirportDbMiss(dest, 'dest');

  setTimeout(()=>{
    if (seq !== window._searchSeq) return; // u međuvremenu pokrenuta novija pretraga
    renderResults(dest, from, to, nights, days, adults, flags, originCode, autoReveal, seq);
  }, 700);
}

document.getElementById('searchForm').addEventListener('submit', function(e){
  e.preventDefault();
  trackFunnelEvent('search_submit', {
    destination: document.getElementById('dest').value.trim() || 'Atina'
  });
  openStartPrefsModal();
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
const BUILDER_ADDON_RATES = { insurance: 18, esim: 9, putarina: 18, transferi: 25, touristTax: 2 }; // insurance/esim/transferi po osobi, putarina paušalno, touristTax po osobi po noći
const BUILDER_DEFAULTS = {
  includeFlight: true,
  flightPref: 'direct',
  airlineName: '',
  includeHotel: true,
  hotelStars: 4,
  prioritizeRating: false,
  prioritizeLocation: false,
  carPref: 'small',
  activityCount: 2,
  insurance: false,
  esim: false,
  putarina: false,
  transferi: false,
  touristTax: false,
  budget: null
};
const builderState = Object.assign({}, BUILDER_DEFAULTS);

// Originalno mesto kartice "Tvoj izlet" (#builderSummary) unutar samostalne
// "Kontrola sadržaja" sekcije — čuvamo ga da bismo karticu mogli privremeno
// da premestimo u "Prilagodi svoj plan" modal (klik na Start) i posle vratimo
// tačno gde je bila, bez dupliranja cele te (prilično razgranate) logike.
const BS_ORIGINAL_PARENT = document.getElementById('builderSummary').parentElement;
const BS_ORIGINAL_NEXT = document.getElementById('builderSummary').nextElementSibling;
function restoreBuilderSummaryPosition(){
  const bs = document.getElementById('builderSummary');
  if (!bs || bs.parentElement === BS_ORIGINAL_PARENT) return;
  if (BS_ORIGINAL_NEXT && BS_ORIGINAL_NEXT.parentElement === BS_ORIGINAL_PARENT){
    BS_ORIGINAL_PARENT.insertBefore(bs, BS_ORIGINAL_NEXT);
  } else {
    BS_ORIGINAL_PARENT.appendChild(bs);
  }
  // Vrati "Nastavi" dugme (skriveno dok je kartica bila unutar modala —
  // vidi #spMakeBtn) sad kad je kartica opet na svom originalnom mestu.
  document.getElementById('builderContinueBtn').style.display = '';
}

// Builder panel — zatvoren po default-u (vidi style="display:none" na
// #builderPanel u HTML-u). Jedini ulaz je sada plan-kartica (klik na Start),
// pošto je zasebna teaser kartica "Želiš više kontrole?" uklonjena sa zida
// (početne strane) da se ne dupira sa istim pozivom na akciju.
function openControlPanel(){
  document.getElementById('builderPanel').style.display = 'grid';
}
function closeControlPanel(){
  document.getElementById('builderPanel').style.display = 'none';
}
document.getElementById('builderCloseBtn').addEventListener('click', ()=>{
  closeControlPanel();
  document.getElementById('builderPanel').scrollIntoView({behavior:'smooth', block:'start'});
});

function builderCtx(){
  const dest = document.getElementById('dest').value.trim() || 'Atina';
  const originCode = document.getElementById('origin').value.trim();
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  const adults = Number(document.getElementById('adults').value) || 2;
  const nights = nightsBetween(from, to);
  return {dest, originCode, from, to, nights, days:nights, adults};
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
  const flightMult = FLIGHT_PREF_PRICE_MULT[sel.flightPref];
  const flightPrice = Math.round(flightBase * flightMult * ctx.adults * flightRouteMult(ctx.originCode, ctx.dest));
  // pickCarrierName zove rng() u IDENTIČNOM obrascu kao na kartičnom putu
  // (fetchFlights) — tačno jednom, i samo kad nije tražena konkretna
  // kompanija. Ne prosleđujemo forceCarrier ovde (builder nema tier-ove).
  const builderArrival = realArrivalAirportFor(ctx.dest);
  // NAPOMENA: ako je flightPref==='airline' i ime je uneto, pickCarrierName
  // NE zove rng() (isto kao pre) — to je namerno, jer inače bi svaki prelaz
  // prazno/popunjeno polje pomerio redosled sledećih rng() poziva (hotel,
  // auto...) za jedno mesto. Pošto je ova grana stabilna za SVAKI neprazan
  // unos (bilo koje slovo znači "preskoči"), cene se ne pomeraju dok
  // korisnik kuca — samo pri prvom i poslednjem karakteru (prazno ↔ nije
  // prazno), što je prihvatljivo i retko.
  const carrierName = pickCarrierName(rng, {flightPref: sel.flightPref, airlineName: sel.airlineName});
  const builderDeparture = realDepartureAirportFor(ctx.originCode);
  const flightName = carrierName + (builderDeparture ? ' ' + builderDeparture : '') + ' → ' + builderArrival;
  // Ista funkcija kao na kartičnom putu — pre deljenja, ovde NIJE bilo ni
  // upozorenja za ograničenu avio-mrežu ni napomene o ceni za više putnika,
  // iako let ovde isto zavisi od broja putnika (vidi flightPrice gore).
  const flightSub = flightSubText({
    flightPref: sel.flightPref, arrival: builderArrival, destRaw: ctx.dest,
    adults: ctx.adults, limitedNetwork: isLimitedNetworkOrigin(ctx.originCode)
  });
  assertFlightSubConsistency(sel.flightPref || 'direct', flightSub, 'computeCustomPackage');

  // --- Hotel ---
  const hotelBasePerNight = HOTEL_STAR_BASE_PRICE[sel.hotelStars] + rng()*22;
  let hotelMult = 1;
  if (sel.prioritizeRating) hotelMult += 0.10;
  if (sel.prioritizeLocation) hotelMult += 0.07;
  const hotelPrice = Math.round(hotelBasePerNight * hotelMult * ctx.nights * Math.ceil(ctx.adults/2));
  let hotelRating = HOTEL_STAR_RATING_BASE[sel.hotelStars] + rng()*0.25;
  if (sel.prioritizeRating) hotelRating += 0.25;
  hotelRating = Math.min(9.9, hotelRating);

  // --- Car ---
  const carPerDay = CAR_TYPE_BASE_PRICE[sel.carPref] + (sel.carPref==='none'?0:rng()*11);
  const carPrice = Math.round(carPerDay * ctx.days);

  // --- Activities ---
  const perActivity = 21 + rng()*17;
  const activityPrice = Math.round(perActivity * sel.activityCount);

  // --- Gorivo i putarine (samo ako je auto uključen) ---
  const carExtras = sel.carPref === 'none' ? 0 : Math.round(18 + rng()*20);

  // --- Osiguranje i eSIM (dodaci, cena po osobi) ---
  // NAPOMENA: namerno NE koristi rng() — ovo su uključi/isključi dodaci
  // (vidi .toggle-chip[data-toggle="insurance"/"esim"]), i pošto nisu deo
  // seedSel, uzimanje rng() ovde bi pomerilo redosled poziva za sve
  // random vrednosti iznad svaki put kad se dodatak uključi/isključi —
  // isti problem opisan gore za airlineName. Fiksna cena po osobi rešava
  // to i drži ostatak paketa stabilnim.
  const insuranceCost = sel.insurance ? BUILDER_ADDON_RATES.insurance * ctx.adults : 0;
  const esimCost = sel.esim ? BUILDER_ADDON_RATES.esim * ctx.adults : 0;
  // Putarine (paušalna procena za celu rutu, nezavisno od rent-a-cara —
  // relevantno i kad se putuje sopstvenim autom ili transferom) i
  // transferi (aerodrom–smeštaj, cena po osobi), isti obrazac kao gore.
  const putarinaCost = sel.putarina ? BUILDER_ADDON_RATES.putarina : 0;
  const transferiCost = sel.transferi ? BUILDER_ADDON_RATES.transferi * ctx.adults : 0;
  // Boravišna taksa (city/tourist tax) — po osobi, po noći; naplaćuje se na
  // licu mesta u hotelu, van same cene smeštaja, zato je poseban dodatak.
  const touristTaxCost = sel.touristTax ? Math.round(BUILDER_ADDON_RATES.touristTax * ctx.adults * ctx.nights) : 0;

  // Isti dnevni tržišni faktor kao u gotovim ponudama (vidi marketFactor) —
  // primenjen na sve stavke osim osiguranja/eSIM-a, koji su fiksni dodaci
  // po osobi, ne tržišna cena koja fluktuira.
  const factor = marketFactor(ctx.dest, todayStr());
  const season = seasonFactor(ctx.dest, ctx.from); // po datumu polaska (vidi seasonFactor)
  const flightPriceF = sel.includeFlight ? Math.round(flightPrice * factor * season) : 0;
  const hotelPriceF = sel.includeHotel ? Math.round(hotelPrice * factor * season) : 0;
  const carPriceF = Math.round(carPrice * factor * season);
  const activityPriceF = Math.round(activityPrice * factor);
  const carExtrasF = Math.round(carExtras * factor);

  const total = flightPriceF + hotelPriceF + carPriceF + activityPriceF + carExtrasF + insuranceCost + esimCost + putarinaCost + transferiCost + touristTaxCost;

  return {
    flight: {price:flightPriceF, name:flightName, sub:flightSub},
    hotel:  {price:hotelPriceF, rating:Number(hotelRating.toFixed(1)), stars:sel.hotelStars},
    car:    {price:carPriceF, pref:sel.carPref},
    activity: {price:activityPriceF, count:sel.activityCount},
    carExtras: {price:carExtrasF},
    insuranceCost, esimCost, putarinaCost, transferiCost, touristTaxCost,
    total
  };
}

function renderBuilder(){
  const ctx = builderCtx();
  const pkg = computeCustomPackage(builderState, ctx);

  const lines = document.getElementById('builderLines');
  const rows = [];
  if (builderState.includeFlight) rows.push(['✈️', t('builder_flight_label'), pkg.flight.price]);
  if (builderState.includeHotel) rows.push(['🏨', 'Hotel', pkg.hotel.price]);
  if (builderState.carPref !== 'none') rows.push(['🚗', 'Auto', pkg.car.price]);
  if (builderState.activityCount > 0) rows.push(['🎟️', t('builder_activities_label'), pkg.activity.price]);
  if (pkg.carExtras.price > 0) rows.push(['⛽', 'Gorivo i putarine (auto)', pkg.carExtras.price]);
  if (builderState.insurance) rows.push(['🛡️', t('f_insurance_name'), pkg.insuranceCost]);
  if (builderState.putarina) rows.push(['🛣️', t('f_tolls_name'), pkg.putarinaCost]);
  if (builderState.touristTax) rows.push(['🏛️', t('f_tax_name'), pkg.touristTaxCost]);
  if (builderState.esim) rows.push(['📶', 'eSIM', pkg.esimCost]);
  if (builderState.transferi) rows.push(['🚐', t('f_transfer_name'), pkg.transferiCost]);

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
    to: document.getElementById('dateTo').value,
    flightPref: builderState.flightPref,
    hotelStars: builderState.hotelStars,
    prioritizeRating: builderState.prioritizeRating,
    prioritizeLocation: builderState.prioritizeLocation,
    carPref: builderState.carPref
  });
  const bookBtns = [];
  if (builderState.includeFlight){
    bookBtns.push(`<span class="bbl-item"><a class="item-btn flight" href="${escapeHtml(buildAffiliateLink('flight', linkCtx))}" target="_blank" rel="noopener" data-kind="flight" data-price="${pkg.flight.price}" data-url="${escapeHtml(buildAffiliateLink('flight', linkCtx))}" data-dest="${escapeHtml(linkCtx.dest||'')}" data-tier="builder" onclick="bookItem(this)">✈️ KAYAK</a>${affBadgeHtml()}</span>`);
  }
  if (builderState.includeHotel){
    bookBtns.push(`<span class="bbl-item"><a class="item-btn hotel" href="${escapeHtml(buildAffiliateLink('hotel', linkCtx))}" target="_blank" rel="noopener" data-kind="hotel" data-price="${pkg.hotel.price}" data-url="${escapeHtml(buildAffiliateLink('hotel', linkCtx))}" data-dest="${escapeHtml(linkCtx.dest||'')}" data-tier="builder" onclick="bookItem(this)">🏨 Booking.com</a>${affBadgeHtml()}</span>`);
  }
  if (builderState.carPref !== 'none'){
    bookBtns.push(`<span class="bbl-item"><a class="item-btn car" href="${escapeHtml(buildAffiliateLink('car', linkCtx))}" target="_blank" rel="noopener" data-kind="car" data-price="${pkg.car.price}" data-url="${escapeHtml(buildAffiliateLink('car', linkCtx))}" data-dest="${escapeHtml(linkCtx.dest||'')}" data-tier="builder" onclick="bookItem(this)">🚗 Booking.com</a>${affBadgeHtml()}</span>`);
  }
  if (builderState.activityCount > 0){
    bookBtns.push(`<span class="bbl-item"><a class="item-btn" style="background:var(--aqua);" href="${escapeHtml(buildAffiliateLink('activity', linkCtx))}" target="_blank" rel="noopener" data-kind="activity" data-price="${pkg.activity.price}" data-url="${escapeHtml(buildAffiliateLink('activity', linkCtx))}" data-dest="${escapeHtml(linkCtx.dest||'')}" data-tier="builder" onclick="bookItem(this)">🎟️ Viator</a>${affBadgeHtml()}</span>`);
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

// ---- Upitnik (#builderPanel) — čekboks/radio povezivanje, bez chip
// dugmadi. Svaki .q-row-head checkbox otvara/zatvara svoj .q-sub (klasa
// .checked) i upisuje include-flag u builderState.
function qRow(name){ return document.querySelector('.q-row[data-row="'+name+'"]'); }
function qSyncRow(name, isOpen){ const row = qRow(name); if (row) row.classList.toggle('checked', isOpen); }

/* ==========================================================
   JEDINSTVENO STANJE FORME — builderState + renderFormUI()
   ----------------------------------------------------------
   builderState je JEDINI izvor istine — i za samostalnu "Kontrola
   sadržaja" sekciju (#builderPanel) i za "Prilagodi svoj plan" modal
   (#startPrefsModal, otvara se klikom na Start). Ranije je modal imao
   svoju KOPIJU stanja (startPrefs) koju je trebalo ručno prepisivati
   u builderState i nazad (dve sync funkcije) — svako novo polje se
   moralo ručno dodati na ~4 mesta (default, listener u panelu,
   listener u modalu, OBE sync funkcije). To je tačan obrazac greške
   koju je trebalo ispraviti.

   Sad postoji SAMO builderState + JEDNA renderFormUI() koja iscrtava
   OBA UI-ja iz njega + JEDNA wireFormFields() koja kači listener na
   odgovarajući element u OBA UI-ja (kad element postoji — letovi/
   hotel toggle, osiguranje, eSIM i transferi postoje samo u panelu,
   ne i u brzom modalu; modal id-jevi su isti kao panelovi, samo sa
   "sp" prefiksom). Za novo prosto polje (checkbox/radio): dodaj jedan
   unos u FORM_FIELDS. Auto i aktivnosti imaju poseban obrazac
   (čekboks uključi/isključi + pamćenje poslednje vrednosti), pa su
   ožičeni preko setupToggleRadioField / setupToggleCountField —
   svaki JEDNOM, ne duplirano za panel i modal.
========================================================== */
function setChkVal(id, val){ const el = document.getElementById(id); if (el) el.checked = !!val; }
function setRadioVal(name, val){ document.querySelectorAll('input[name="'+name+'"]').forEach(r=>{ r.checked = (String(r.value) === String(val)); }); }

// Jednostavna polja: jedan checkbox/radio u panelu, po volji i isti tip
// u modalu (modal:null → polje postoji samo u panelu, ne i u brzom modalu).
const FORM_FIELDS = [
  { key:'includeFlight',       type:'checkbox', panel:'flightInclude',         modal:null,                    row:'flight' },
  { key:'includeHotel',        type:'checkbox', panel:'hotelInclude',          modal:null,                    row:'hotel' },
  { key:'hotelStars',          type:'radio',    panel:'hotelStarsRadio',       modal:'spHotelStarsRadio',     numeric:true },
  { key:'prioritizeRating',    type:'checkbox', panel:'prioritizeRatingChk',   modal:'spPrioritizeRatingChk' },
  { key:'prioritizeLocation',  type:'checkbox', panel:'prioritizeLocationChk', modal:'spPrioritizeLocationChk' },
  { key:'insurance',           type:'checkbox', panel:'insuranceChk',          modal:null },
  { key:'putarina',            type:'checkbox', panel:'putarinaChk',           modal:'spPutarinaChk' },
  { key:'touristTax',          type:'checkbox', panel:'touristTaxChk',         modal:'spTouristTaxChk' },
  { key:'esim',                type:'checkbox', panel:'esimChk',               modal:null },
  { key:'transferi',           type:'checkbox', panel:'transferiChk',          modal:null }
];
function renderSimpleField(f){
  const val = builderState[f.key];
  if (f.type === 'checkbox'){
    setChkVal(f.panel, val);
    if (f.modal) setChkVal(f.modal, val);
    if (f.row) qSyncRow(f.row, !!val);
  } else {
    setRadioVal(f.panel, val);
    if (f.modal) setRadioVal(f.modal, val);
  }
}
function wireSimpleField(f){
  const onChange = (raw) => {
    builderState[f.key] = f.numeric ? Number(raw) : raw;
    renderFormUI();
    renderBuilder();
  };
  if (f.type === 'checkbox'){
    [f.panel, f.modal].filter(Boolean).forEach(id=>{
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', ()=> onChange(el.checked));
    });
  } else {
    [f.panel, f.modal].filter(Boolean).forEach(name=>{
      document.querySelectorAll('input[name="'+name+'"]').forEach(r=>{
        r.addEventListener('change', ()=> onChange(r.value));
      });
    });
  }
}

// Let: radio grupa + tekstualno polje za ime kompanije (prikazano samo
// kad je izabrano "Određena kompanija") — u panelu i u modalu odjednom.
const FLIGHT_PREF = { panelRadio:'flightPrefRadio', modalRadio:'spFlightPrefRadio', panelText:'airlineName', modalText:'spAirlineName' };
function renderFlightPrefField(){
  setRadioVal(FLIGHT_PREF.panelRadio, builderState.flightPref);
  setRadioVal(FLIGHT_PREF.modalRadio, builderState.flightPref);
  const showAirline = builderState.flightPref === 'airline';
  [FLIGHT_PREF.panelText, FLIGHT_PREF.modalText].forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = showAirline ? 'block' : 'none';
    if (document.activeElement !== el) el.value = builderState.airlineName || '';
  });
}
function wireFlightPrefField(){
  [FLIGHT_PREF.panelRadio, FLIGHT_PREF.modalRadio].forEach(name=>{
    document.querySelectorAll('input[name="'+name+'"]').forEach(r=>{
      r.addEventListener('change', ()=>{
        builderState.flightPref = r.value;
        renderFormUI();
        renderBuilder();
      });
    });
  });
  [FLIGHT_PREF.panelText, FLIGHT_PREF.modalText].forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', ()=>{
      builderState.airlineName = el.value.trim();
      renderBuilder();
    });
  });
}

// Rent a car / aktivnosti: čekboks uključi/isključi (mapira se na
// carPref==='none' odn. activityCount===0) + radio/broj za detalje.
// Pamti se JEDNA poslednja "uključena" vrednost — ponovno čekiranje u
// BILO KOM od dva UI-ja vraća istu vrednost, ne dve odvojene (ranije:
// _lastCarPref za panel, _spLastCarPref za modal, ručno usklađivane).
function setupToggleRadioField({ key, offValue, defaultOnValue, panelToggleId, modalToggleId, panelRow, modalRow, panelRadioName, modalRadioName }){
  let lastOnValue = builderState[key] !== offValue ? builderState[key] : defaultOnValue;
  function setOn(isOn, radioVal){
    builderState[key] = isOn ? (radioVal || lastOnValue) : offValue;
    if (builderState[key] !== offValue) lastOnValue = builderState[key];
    renderFormUI();
    renderBuilder();
  }
  [panelToggleId, modalToggleId].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', ()=> setOn(el.checked));
  });
  [panelRadioName, modalRadioName].forEach(name=>{
    document.querySelectorAll('input[name="'+name+'"]').forEach(r=>{
      r.addEventListener('change', ()=> setOn(true, r.value));
    });
  });
  return function render(){
    const isOn = builderState[key] !== offValue;
    setChkVal(panelToggleId, isOn);
    setChkVal(modalToggleId, isOn);
    qSyncRow(panelRow, isOn);
    qSyncRow(modalRow, isOn);
    setRadioVal(panelRadioName, isOn ? builderState[key] : lastOnValue);
    setRadioVal(modalRadioName, isOn ? builderState[key] : lastOnValue);
  };
}
function setupToggleCountField({ key, defaultOnValue, min, max, panelToggleId, modalToggleId, panelRow, modalRow, panelInputId, modalInputId }){
  let lastOnValue = builderState[key] > 0 ? builderState[key] : defaultOnValue;
  function setOn(isOn){
    builderState[key] = isOn ? lastOnValue : 0;
    renderFormUI();
    renderBuilder();
  }
  [panelToggleId, modalToggleId].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', ()=> setOn(el.checked));
  });
  [panelInputId, modalInputId].forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('focus', ()=> el.select());
    el.addEventListener('input', ()=>{
      const raw = el.value;
      const n = raw === '' ? 0 : Math.max(min, Math.min(max, Math.floor(Number(raw)) || 0));
      builderState[key] = n;
      if (n > 0) lastOnValue = n;
      renderFormUI();
      renderBuilder();
    });
    el.addEventListener('blur', renderFormUI);
  });
  return function render(){
    const isOn = builderState[key] > 0;
    setChkVal(panelToggleId, isOn);
    setChkVal(modalToggleId, isOn);
    qSyncRow(panelRow, isOn);
    qSyncRow(modalRow, isOn);
    [panelInputId, modalInputId].forEach(id=>{
      const el = document.getElementById(id);
      if (el && document.activeElement !== el) el.value = builderState[key];
    });
  };
}

// Gornja granica je namerno velikodušna (niko realno ne planira izlet
// preko ovoga), samo sprečava apsurdne unose tipa "1e10" ili slučajno
// dodat nepotreban nule. Budžet mora biti ceo broj > 0, ne negativan
// i ne decimalan — sve ostalo se ili odbacuje (null) ili zaokružuje/seče.
// Isto polje ideje u panelu i modalu — pisano jednom, primenjeno na oba.
const MAX_BUDGET = 50000;
function clampBudgetInput(el){
  const raw = el.value;
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
    if (String(clamped) !== raw) el.value = clamped;
    builderState.budget = clamped;
  }
  renderBuilder();
}
function wireBudgetField(){
  ['budgetInput','spBudgetInput'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', ()=> clampBudgetInput(el));
  });
}
function renderBudgetField(){
  ['budgetInput','spBudgetInput'].forEach(id=>{
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = builderState.budget || '';
  });
}

let _renderCarField = null;
let _renderActivitiesField = null;

// Kači SVE listenere (panel + modal) odjednom. Poziva se JEDNOM, pri učitavanju.
function wireFormFields(){
  FORM_FIELDS.forEach(wireSimpleField);
  wireFlightPrefField();
  wireBudgetField();
  _renderCarField = setupToggleRadioField({
    key:'carPref', offValue:'none', defaultOnValue:'small',
    panelToggleId:'carInclude', modalToggleId:'spCarInclude',
    panelRow:'car', modalRow:'sp-car',
    panelRadioName:'carPrefRadio', modalRadioName:'spCarPrefRadio'
  });
  _renderActivitiesField = setupToggleCountField({
    key:'activityCount', defaultOnValue:2, min:0, max:10,
    panelToggleId:'activitiesInclude', modalToggleId:'spActivitiesInclude',
    panelRow:'activities', modalRow:'sp-activities',
    panelInputId:'actCountInput', modalInputId:'spActCountInput'
  });
}
// Iscrtava OBA UI-ja (panel i modal) iz builderState. Poziva se posle
// svake izmene stanja (iz bilo kog UI-ja), i posle svake spoljašnje
// izmene builderState (učitavanje sačuvanog izleta, primena optimizacije).
function renderFormUI(){
  FORM_FIELDS.forEach(renderSimpleField);
  renderFlightPrefField();
  renderBudgetField();
  if (_renderCarField) _renderCarField();
  if (_renderActivitiesField) _renderActivitiesField();
}
wireFormFields();
renderFormUI();

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
        renderFormUI();
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
        renderFormUI();
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
        renderFormUI();
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
  document.getElementById('builderBookLinks').style.display = 'none';
});

// "Nastavi" — otkriva linkove za rezervaciju kod partnera (kayak/booking/
// itd.), koji su već izračunati u renderBuilder() ali ostaju sakriveni dok
// korisnik ne pregleda cenu/optimizaciju i svesno odluči da nastavi.
document.getElementById('builderContinueBtn').addEventListener('click', ()=>{
  const links = document.getElementById('builderBookLinks');
  links.style.display = 'block';
  requestAnimationFrame(() => {
    links.scrollIntoView({behavior:'smooth', block:'center'});
  });
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
    if (!isMobileResults()) document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
    runSearch(false);
  });
});

/* ==========================================================
   REGIONALNI SIGNAL — "Popularno kod putnika iz [tvog grada]"
   umesto univerzalne top-liste. Ovo je uredničko, ručno sastavljeno
   po realnim navikama iz svakog grada (aerodrom, sezonski čarteri,
   praksa letenja preko bližeg stranog aerodroma) — NIJE uživo
   statistika i ne pretvaramo se da jeste. Ako grad iz polja "Polazak"
   nije prepoznat, ostaje originalni (Beograd-orijentisani) SEO sadržaj
   iz HTML-a, bez ikakve promene.
========================================================== */
const REGIONAL_POPULAR_DESTINATIONS = {
  'beograd': { genitiv:'Beograda', show:6, cards: [
    {dest:'Atina', name:'Atina, Grčka', desc:'Antika, ostrvski trajekti i vrhunska kuhinja — česti direktni letovi iz Beograda.'},
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum, Vatikan i ulična kuhinja — kratak let, grad se obilazi peške.'},
    {dest:'Barselona', name:'Barselona, Španija', desc:'Gaudijeva arhitektura, plaža i tapas bari — omiljena kombinacija grada i mora.'},
    {dest:'Budva', name:'Budva, Crna Gora', desc:'Najbliže more autom — 4-5h vožnje, stara varoš i duge plaže.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, bazari i Bosfor — pristupačan izlet van sezone.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji, kafei i božićne pijace zimi — praktičan gradski izlet za vikend.'},
    {dest:'Solun', name:'Solun, Grčka', desc:'More bez potrebe za letom — oko 6-7h vožnje, popularno van glavne sezone.'},
    {dest:'Budimpešta', name:'Budimpešta, Mađarska', desc:'Kratak let ili vožnja — kupatila, arhitektura i praktičan gradski izlet.'}
  ]},
  'novi sad': { genitiv:'Novog Sada', show:5, cards: [
    {dest:'Budimpešta', name:'Budimpešta, Mađarska', desc:'Oko 2h vožnje — low-cost letovi odatle su često jeftiniji nego iz Beograda.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Direktan voz i autobus iz Novog Sada — praktičan gradski izlet bez presedanja.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Za more i ostrva i dalje se najisplativije leti preko Beograda.'},
    {dest:'Budva', name:'Budva, Crna Gora', desc:'Najbliže more autom — stara varoš i duge plaže.'},
    {dest:'Zagreb', name:'Zagreb, Hrvatska', desc:'Kratka vožnja, praktičan vikend izlet uz adventski sadržaj zimi.'},
    {dest:'Solun', name:'Solun, Grčka', desc:'More bez potrebe za letom — preko Beograda ili direktno autom.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije — let preko Beograda.'}
  ]},
  'nis': { genitiv:'Niša', show:4, cards: [
    {dest:'Solun', name:'Solun, Grčka', desc:'Oko 3h vožnje — najbliže more za vikend izlet, bez potrebe za letom.'},
    {dest:'Skoplje', name:'Skoplje, Sev. Makedonija', desc:'Blizu, praktično autom za kraći izlet.'},
    {dest:'Antalija', name:'Antalija, Turska', desc:'Sezonski čarter letovi direktno sa aerodroma u Nišu, van glavne sezone jeftiniji.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Za većinu daljih destinacija, presedanje preko Beograda ili Istanbula je i dalje najisplativije.'},
    {dest:'Sofija', name:'Sofija, Bugarska', desc:'Blizu, praktično autom ili vozom za kraći izlet.'},
    {dest:'Budva', name:'Budva, Crna Gora', desc:'More autom — nešto duža vožnja, ali bez potrebe za letom.'}
  ]},
  'podgorica': { genitiv:'Podgorice', show:4, cards: [
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije — praktičan let sa podgoričkog aerodroma.'},
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum, Vatikan i ulična kuhinja — kratak let preko mora.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji i kafei — praktičan gradski izlet.'},
    {dest:'Barselona', name:'Barselona, Španija', desc:'Arhitektura, plaža i tapas bari.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Antika i ostrva — let preko mora.'},
    {dest:'Milano', name:'Milano, Italija', desc:'Moda, dizajn i kratak let preko mora.'}
  ]},
  'subotica': { genitiv:'Subotice', show:4, cards: [
    {dest:'Budimpešta', name:'Budimpešta, Mađarska', desc:'Manje od 3h vožnje i blizu granice — često praktičnija polazna tačka nego Beograd.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji, kafei i gradska šetnja — dostupan i preko Budimpešte.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Za more i ostrva, let preko Beograda je i dalje najisplativiji.'},
    {dest:'Zagreb', name:'Zagreb, Hrvatska', desc:'Kraća vožnja, praktičan vikend izlet.'},
    {dest:'Prag', name:'Prag, Češka', desc:'Arhitektura i pivnice — dostupan preko Budimpešte.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, let preko Beograda.'}
  ]},
  'kragujevac': { genitiv:'Kragujevca', show:4, cards: [
    {dest:'Atina', name:'Atina, Grčka', desc:'Antika i ostrva — let preko Beograda, oko 1h vožnje do aerodroma.'},
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum i ulična kuhinja — kratak let iz Beograda.'},
    {dest:'Budva', name:'Budva, Crna Gora', desc:'Najbliže more autom — oko 3h vožnje.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, pristupačan izlet van sezone.'},
    {dest:'Barselona', name:'Barselona, Španija', desc:'Arhitektura, plaža i tapas bari — let preko Beograda.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji i kafei — praktičan gradski izlet.'}
  ]},
  'kraljevo': { genitiv:'Kraljeva', show:4, cards: [
    {dest:'Budva', name:'Budva, Crna Gora', desc:'Jedna od bližih ruta do mora sa juga Srbije — oko 3h vožnje.'},
    {dest:'Solun', name:'Solun, Grčka', desc:'Preko Niša, oko 4h vožnje — more bez potrebe za letom.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Za ostrva i dalje, let preko Beograda ili Niša.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, pristupačan izlet van sezone.'},
    {dest:'Podgorica', name:'Podgorica, Crna Gora', desc:'Alternativni pravac za let ka moru ili dalje.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji i kafei — let preko Beograda.'}
  ]},
  'novi pazar': { genitiv:'Novog Pazara', show:4, cards: [
    {dest:'Budva', name:'Budva, Crna Gora', desc:'Preko Rožaja — jedna od kraćih ruta do mora sa juga Srbije.'},
    {dest:'Podgorica', name:'Podgorica, Crna Gora', desc:'Bliži aerodrom za neke pravce nego Beograd — vredi uporediti oba.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, pristupačan izlet van sezone.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Za ostrva, let preko Beograda ili Podgorice.'},
    {dest:'Sarajevo', name:'Sarajevo, BiH', desc:'Blizu, praktično autom za kraći izlet.'},
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum i ulična kuhinja — let preko Beograda ili Podgorice.'}
  ]},
  'banja luka': { genitiv:'Banje Luke', show:4, cards: [
    {dest:'Zagreb', name:'Zagreb, Hrvatska', desc:'Oko 2h vožnje — mnogo širi izbor letova nego banjalučki aerodrom.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji i kafei — praktičan gradski izlet.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, pristupačan izlet van sezone.'},
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum, Vatikan i ulična kuhinja.'},
    {dest:'Budimpešta', name:'Budimpešta, Mađarska', desc:'Šira mreža letova nego banjalučki aerodrom, oko 4-5h vožnje.'},
    {dest:'Barselona', name:'Barselona, Španija', desc:'Arhitektura, plaža i tapas bari.'}
  ]},
  'sarajevo': { genitiv:'Sarajeva', show:4, cards: [
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije — česti direktni letovi sa sarajevskog aerodroma.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji, kafei i gradska šetnja — kratak let.'},
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum, Vatikan i ulična kuhinja.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Antika, ostrva i vrhunska kuhinja.'},
    {dest:'Barselona', name:'Barselona, Španija', desc:'Arhitektura, plaža i tapas bari.'},
    {dest:'Budimpešta', name:'Budimpešta, Mađarska', desc:'Kratak let ili vožnja preko Hrvatske.'}
  ]},
  'skoplje': { genitiv:'Skoplja', show:4, cards: [
    {dest:'Rim', name:'Rim, Italija', desc:'Koloseum i ulična kuhinja — česti low-cost letovi sa skopskog aerodroma.'},
    {dest:'Barselona', name:'Barselona, Španija', desc:'Arhitektura, plaža i tapas bari.'},
    {dest:'Solun', name:'Solun, Grčka', desc:'Blizu, praktično i autom — oko 3h vožnje.'},
    {dest:'Istanbul', name:'Istanbul, Turska', desc:'Spoj Evrope i Azije, pristupačan izlet van sezone.'},
    {dest:'Atina', name:'Atina, Grčka', desc:'Antika, ostrva i vrhunska kuhinja.'},
    {dest:'Beč', name:'Beč, Austrija', desc:'Muzeji, kafei i gradska šetnja.'}
  ]}
};
/* ==========================================================
   Podrazumevani ("Gde bi sledeće?") skup — kad polje Polazak nije
   prepoznato ili je prazno. Umesto fiksnih 6 kartica iz HTML-a,
   biramo dnevno-rotirajući podskup iz šireg pool-a (ispod), preko
   dailyPick() — isto za sve posetioce istog dana, drugačije sutra.
   Prevodi idu preko t()/I18N (pd_* ključevi), da poštuje SR/EN.
========================================================== */
const DEFAULT_POPULAR_DEST_POOL = [
  {dest:'Atina', nameKey:'pd_athens_name', descKey:'pd_athens_desc'},
  {dest:'Rim', nameKey:'pd_rome_name', descKey:'pd_rome_desc'},
  {dest:'Barselona', nameKey:'pd_barcelona_name', descKey:'pd_barcelona_desc'},
  {dest:'Budva', nameKey:'pd_budva_name', descKey:'pd_budva_desc'},
  {dest:'Istanbul', nameKey:'pd_istanbul_name', descKey:'pd_istanbul_desc'},
  {dest:'Beč', nameKey:'pd_vienna_name', descKey:'pd_vienna_desc'},
  {dest:'Solun', nameKey:'pd_thessaloniki_name', descKey:'pd_thessaloniki_desc'},
  {dest:'Prag', nameKey:'pd_prague_name', descKey:'pd_prague_desc'},
  {dest:'Budimpešta', nameKey:'pd_budapest_name', descKey:'pd_budapest_desc'}
];
function attachPopularDestCardHandlers(grid){
  grid.querySelectorAll('.popular-dest-card').forEach(card => {
    card.addEventListener('click', () => {
      document.getElementById('dest').value = card.dataset.dest;
      if (!isMobileResults()) document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
      runSearch(false);
    });
  });
}
function renderDefaultPopularDestinations(){
  const grid = document.getElementById('popularDestGrid');
  const head = document.getElementById('popularDestHead');
  const eyebrow = document.getElementById('popularDestEyebrow');
  if (!grid || !head) return;
  head.textContent = t('h2_popular_dest');
  if (eyebrow) eyebrow.textContent = t('eyebrow_ideas');
  const picks = dailyPick(DEFAULT_POPULAR_DEST_POOL, 6, 'default');
  grid.innerHTML = picks.map(c =>
    '<button type="button" class="popular-dest-card" data-dest="' + escapeHtml(c.dest) + '">'
    + '<span class="pd-name">' + escapeHtml(t(c.nameKey)) + '</span>'
    + '<span class="pd-desc">' + escapeHtml(t(c.descKey)) + '</span>'
    + '</button>'
  ).join('');
  attachPopularDestCardHandlers(grid);
}
function renderRegionalPopularDestinations(originRaw){
  const grid = document.getElementById('popularDestGrid');
  const head = document.getElementById('popularDestHead');
  const eyebrow = document.getElementById('popularDestEyebrow');
  if (!grid || !head) return;
  const norm = normalizeSr((originRaw || '').trim());
  let bucket = null;
  let matchedKey = null;
  if (norm){
    for (const key in REGIONAL_POPULAR_DESTINATIONS){
      if (norm === key || norm.startsWith(key + ' ') || norm.startsWith(key + ',') || norm.includes(' ' + key) ){
        bucket = REGIONAL_POPULAR_DESTINATIONS[key];
        matchedKey = key;
        break;
      }
    }
  }
  if (!bucket){
    // Nepoznat ili prazan grad — vrati podrazumevani (dnevno-rotirajući) sadržaj, ne ostavljaj "zaglavljen" prethodni grad.
    renderDefaultPopularDestinations();
    return;
  }
  head.textContent = 'Popularno kod putnika iz ' + bucket.genitiv;
  if (eyebrow) eyebrow.textContent = 'Predlozi prilagođeni tvom polasku';
  const picks = dailyPick(bucket.cards, bucket.show || bucket.cards.length, matchedKey);
  grid.innerHTML = picks.map(c =>
    '<button type="button" class="popular-dest-card" data-dest="' + escapeHtml(c.dest) + '">'
    + '<span class="pd-name">' + escapeHtml(c.name) + '</span>'
    + '<span class="pd-desc">' + escapeHtml(c.desc) + '</span>'
    + '</button>'
  ).join('');
  attachPopularDestCardHandlers(grid);
}
let _originRegionalTimer = null;
const originInputForRegional = document.getElementById('origin');
if (originInputForRegional){
  originInputForRegional.addEventListener('input', (e) => {
    clearTimeout(_originRegionalTimer);
    const val = e.target.value;
    _originRegionalTimer = setTimeout(() => {
      renderRegionalPopularDestinations(val);
      renderOriginAirportWarning(val);
      updateCtaBanner();
    }, 400);
  });
  if (originInputForRegional.value){
    renderRegionalPopularDestinations(originInputForRegional.value);
    renderOriginAirportWarning(originInputForRegional.value);
    updateCtaBanner();
  } else {
    renderDefaultPopularDestinations();
  }
}
let _destAirportTimer = null;
const destInputForAirport = document.getElementById('dest');
if (destInputForAirport){
  destInputForAirport.addEventListener('input', (e) => {
    // Reordering nekoliko DOM elemenata je jeftina operacija — radi se
    // odmah, na svaki taster, bez debounce-a. Debounce ostaje samo za
    // renderDestAirportWarning (teža provera protiv AIRPORT_DB), jer
    // deljenje istog tajmera za oba dovodi do toga da reorder radi
    // "na sreću" — samo kad pauza između tastera bude duža od 400ms.
    syncDestTypingWithPopular(e.target.value);
    clearTimeout(_destAirportTimer);
    const val = e.target.value;
    _destAirportTimer = setTimeout(() => renderDestAirportWarning(val), 400);
  });
  if (destInputForAirport.value) renderDestAirportWarning(destInputForAirport.value);
}

/* ==========================================================
   Dok kucaš u "Destinacija", ako se poklopi sa jednom od kartica
   u "Gde bi sledeće?" gridu — ta kartica skoči na prvo mesto u
   tabeli. CTA baner ("X te čeka.") i stavka "poslednja destinacija"
   se ažuriraju preko updateCtaBanner()/updateStatLastPreview() ispod —
   ODAKLE (Polazak) ima prioritet nad Destinacijom: ako je Polazak
   popunjen, baner prati top preporuku iz regionalnog grida; tek kad
   je Polazak prazan, baner prati ono što je ukucano u Destinaciju.
   Stavka "poslednja destinacija" prati isključivo Destinaciju —
   dok se kuca prikazuje uneti tekst, a kad se polje isprazni vraća
   se na stvarnu (deljenu) poslednju pretragu.
========================================================== */
function syncDestTypingWithPopular(destRaw){
  const grid = document.getElementById('popularDestGrid');
  const val = normalizeSr((destRaw || '').trim());
  if (grid && val){
    const cards = Array.from(grid.querySelectorAll('.popular-dest-card'));
    const match = cards.find(card => normalizeSr(card.dataset.dest || '') === val)
      || cards.find(card => normalizeSr(card.dataset.dest || '').startsWith(val));
    if (match && grid.firstElementChild !== match) grid.insertBefore(match, grid.firstElementChild);
  }
  updateStatLastPreview(destRaw);
  updateCtaBanner();
}
function updateStatLastPreview(destRaw){
  const statLastEl = document.getElementById('statLast');
  if (!statLastEl) return;
  const typed = (destRaw || '').trim();
  statLastEl.textContent = typed || state.lastDest || STAT_LAST_DEST_FALLBACK;
}
function pickCtaDestFromTyping(){
  const originVal = (document.getElementById('origin') || {}).value || '';
  const destVal = (document.getElementById('dest') || {}).value || '';
  const grid = document.getElementById('popularDestGrid');
  if (originVal.trim()){
    if (grid && grid.firstElementChild && grid.firstElementChild.dataset.dest) return grid.firstElementChild.dataset.dest;
    return null;
  }
  if (destVal.trim()){
    const norm = normalizeSr(destVal.trim());
    if (grid){
      const cards = Array.from(grid.querySelectorAll('.popular-dest-card'));
      const named = cards.find(c => normalizeSr(c.dataset.dest || '') === norm)
        || cards.find(c => normalizeSr(c.dataset.dest || '').startsWith(norm));
      if (named) return named.dataset.dest;
    }
    return destVal.trim();
  }
  return null;
}
function updateCtaBanner(){
  const ctaTitleEl = document.getElementById('ctaTitle');
  const ctaDescEl = document.getElementById('ctaDesc');
  const ctaDest = pickCtaDestFromTyping() || state.lastDest || '';
  if (ctaTitleEl){
    ctaTitleEl.textContent = ctaDest
      ? L3(ctaDest + ' te čeka.', ctaDest + ' is waiting for you.', ctaDest + ' ждёт тебя.')
      : L3('Sledeća destinacija te čeka.', 'Your next destination is waiting.', 'Следующее направление уже ждёт.');
  }
  if (ctaDescEl) ctaDescEl.textContent = ctaCopy(ctaDest);
}

/* ==========================================================
   UPOZORENJE: grad bez aerodroma — predlaže najbliži pravi
   aerodrom umesto grada koji ga uopšte nema, direktno u samoj
   formi za pretragu (ne tek u rezultatima). Radi na OBA polja
   (Polazak i Destinacija), nad istom AIRPORT_DB bazom iznad u
   fajlu. Uredničko znanje o geografiji, ne uživo podatak.
   Prikazuje se ISKLJUČIVO kad je toggle "Letovi" uključen — u
   Smeštaj/R&C/Aktivnost pretragama nema leta, pa napomena o
   aerodromu nema smisla tu.
========================================================== */
function isFlightToggleOn(){
  const el = document.querySelector('.toggle[data-t="flight"]');
  return !!(el && el.classList.contains('on'));
}
function renderAirportWarning(cityRaw, boxId, inputId){
  const box = document.getElementById(boxId);
  if (!box) return;
  if (!isFlightToggleOn()){ box.innerHTML = ''; return; }
  const info = airportInfoFor(cityRaw);
  if (!info || info.hasAirport || !info.nearest){ box.innerHTML = ''; return; }
  const btnId = boxId + 'UseNearestBtn';
  box.innerHTML = '<div class="origin-airport-warning">✈️ ' + escapeHtml(info.note)
    + '<br><button type="button" id="' + btnId + '">Koristi ' + escapeHtml(info.nearest) + ' umesto</button></div>';
  const btn = document.getElementById(btnId);
  if (btn) btn.addEventListener('click', () => {
    const inputEl = document.getElementById(inputId);
    inputEl.value = info.nearest;
    inputEl.dispatchEvent(new Event('input', {bubbles:true}));
    box.innerHTML = '';
  });
}
function renderOriginAirportWarning(originRaw){
  renderAirportWarning(originRaw, 'originAirportWarning', 'origin');
}
function renderDestAirportWarning(destRaw){
  renderAirportWarning(destRaw, 'destAirportWarning', 'dest');
}

/* ==========================================================
   "ISPLATI LI SE LET PREKO DRUGOG AERODROMA?" — savet u rezultatima
   pretrage za gradove gde je poznata, realna praksa da je jeftinije/
   češće leteti preko obližnjeg stranog aerodroma nego iz sopstvenog
   grada. Uredničko znanje (kao i regionalni signal iznad), ne uživo
   podaci o cenama — zato namerno bez konkretnih brojki koje bismo
   morali da dokazujemo.
========================================================== */
function matchOriginCityKey(originRaw, keysObject){
  const norm = normalizeSr((originRaw || '').trim());
  if (!norm) return null;
  for (const key in keysObject){
    if (norm === key || norm.startsWith(key + ' ') || norm.startsWith(key + ',') || norm.includes(' ' + key)){
      return key;
    }
  }
  return null;
}
const ALT_AIRPORT_NOTES = {
  'novi sad': 'Budimpešta i Beč su oko 2h vožnje od Novog Sada — low-cost aviokompanije tamo često lete češće i jeftinije nego iz Beograda, pa se isplati uporediti pre rezervacije.',
  'nis': 'Solun i Skoplje su 2-3h vožnje od Niša i imaju širu mrežu low-cost letova nego niški aerodrom — vredi uporediti tu cenu sa letom iz Beograda ili sezonskim čarterom direktno iz Niša.',
  'kragujevac': 'Beograd je najbliži veliki aerodrom (oko 1h vožnje) — za širi izbor i niže cene, isplati se poći odatle umesto tražiti direktan let iz manjeg grada.',
  'subotica': 'Subotica je blizu mađarske granice — Budimpešta (oko 2h30 vožnje) ima mnogo širu mrežu low-cost letova i često je isplativija polazna tačka nego Beograd.',
  'kraljevo': 'Kraljevo nema svoj aerodrom — Beograd (oko 2h) ili Niš (oko 1h) su najbliže polazne tačke, u zavisnosti od pravca leta. Vredi uporediti oba pre rezervacije.',
  'novi pazar': 'Novi Pazar nema svoj aerodrom — za neke pravce je Podgorica bliža i praktičnija polazna tačka nego Beograd. Vredi uporediti obe opcije pre rezervacije.',
  'banja luka': 'Banjalučki aerodrom ima ograničen broj linija — Zagreb (oko 2h vožnje) često nudi mnogo širi izbor letova i niže cene.'
};
function altAirportNoteFor(originRaw){
  const key = matchOriginCityKey(originRaw, ALT_AIRPORT_NOTES);
  return key ? ALT_AIRPORT_NOTES[key] : null;
}

/* ==========================================================
   "PAZI NA KOJI AERODROM SLEŽEŠ" — uredničke napomene za evropske
   gradove gde low-cost aviokompanije često slede na aerodrom daleko
   od centra grada (isti pod-brend imena grada, ali sat-dva vožnje
   dalje). Namerno SAMO Evropa — stabilna, opštepoznata geografska
   činjenica, ne uživo podatak, pa je bezbedno da bude urednička.
========================================================== */
const DEST_AIRPORT_NOTES = {
  'london': 'London ima više aerodroma — Hitrou je najbliži centru, ali low-cost kompanije često slede na Stansted ili Luton, 45-75 minuta dalje od grada. Proveri tačan aerodrom pre nego što planiraš prevoz do centra.',
  'pariz': 'Pariz ima tri aerodroma — Šarl de Gol i Orli su blizu grada, ali Ryanair i slične kompanije često koriste Bove (Beauvais), oko 85km severno, sa transferom od preko sat vremena do centra.',
  'brisel': 'Brisel ima glavni aerodrom blizu grada, ali low-cost letovi često slede u Šarlroa, oko 50km južnije — računaj dodatni sat vožnje i trošak prevoza do centra.',
  'frankfurt': 'Frankfurt ima dva aerodroma pod sličnim imenom — glavni je blizu grada, dok je Han (Hahn) oko 120km zapadno, bliže Luksemburgu nego Frankfurtu. Ryanair često leti baš tamo, sa transferom i do 2h.',
  'milano': 'Milano ima tri aerodroma — Malpensa i Linate su praktični, ali Ryanair često leti u Bergamo, oko 45km od centra, sa transferom od preko sat vremena.',
  'barselona': 'Barselona ima glavni aerodrom blizu grada (El Prat), ali neki low-cost letovi slede u Đironu ili Reus, stotinak kilometara dalje, sa transferom od preko sat vremena.',
  'rim': 'Rim ima dva aerodroma — Fjumičino (glavni, malo dalji od centra) i Čampino (bliži centru, manji, koriste ga neke low-cost kompanije).',
  'stokholm': 'Stokholm ima glavni aerodrom Arlanda, ali Ryanair često leti u Skavstu, oko 100km južnije — transfer do centra traje i do sat i po.',
  'oslo': 'Oslo ima glavni aerodrom Gardermoen, ali neki low-cost letovi ka "Oslu" slede u Torp kod Sandefjorda, oko 110km južnije — transfer je i do 2h.',
  'kopenhagen': 'Neki letovi oglašeni ka "Kopenhagenu" zapravo slede u Malme, u Švedskoj, s druge strane mosta — računaj dodatno vreme za prelazak i eventualnu graničnu kontrolu.'
};
function destAirportNoteFor(destRaw){
  const norm = normalizeSr((destRaw || '').trim());
  if (!norm) return null;
  for (const key in DEST_AIRPORT_NOTES){
    if (norm === key || norm.startsWith(key)) return DEST_AIRPORT_NOTES[key];
  }
  return null;
}

/* ==========================================================
   "RAZMISLI I O AUTOBUSU" — alternativa prevoza za bliske regionalne
   destinacije koje veliki deo putnika iz Srbije uglavnom i onako radi
   autobusom (crnogorsko primorje, BiH, Severna Makedonija), a nijedan
   klasičan OTA/metasearch ovo ne poredi sa letom. Namerno samo
   destinacije do ~8h vožnje — dalje od toga autobus prestaje da bude
   realna alternativa letu. Cene/trajanje su ilustrativna procena (isti
   status kao i ostatak sajta u razvoju), ne uživo podatak prevoznika. */
const BUS_TRAIN_ROUTES = {
  'Budva':{hours:7, price:26}, 'Kotor':{hours:7, price:26}, 'Herceg Novi':{hours:8, price:28},
  'Igalo':{hours:8, price:28}, 'Bar':{hours:6.5, price:25}, 'Tivat':{hours:7, price:27},
  'Petrovac':{hours:7, price:26}, 'Sutomore':{hours:6.5, price:25}, 'Ulcinj':{hours:7.5, price:27},
  'Perast':{hours:7, price:26}, 'Risan':{hours:7, price:26}, 'Podgorica':{hours:5.5, price:22},
  'Sarajevo':{hours:6, price:24}, 'Mostar':{hours:7, price:26}, 'Banja Luka':{hours:4.5, price:20},
  'Skoplje':{hours:4, price:18}, 'Ohrid':{hours:6.5, price:24}
};
function busTrainNoteFor(destRaw, adults){
  const canonical = resolveCanonicalDestName(destRaw);
  const route = BUS_TRAIN_ROUTES[canonical];
  if (!route) return null;
  const n = Math.max(1, Number(adults) || 1);
  const oneWay = Math.round(route.price * n);
  const roundTrip = Math.round(route.price * n * 1.8);
  return 'Ovo je oko ' + route.hours + 'h vožnje autobusom iz Srbije (npr. Lasta, FlixBus, Ekol) — procena cene je oko '
    + fmtEUR(route.price) + ' po osobi u jednom pravcu. Za ' + n + ' ' + passengerLabel(n) + ' to je otprilike ' + fmtEUR(oneWay)
    + ' u jednom pravcu, odnosno grubo ' + fmtEUR(roundTrip) + ' povratno. Za kraće izlete i manje grupe ovo često izađe jeftinije od leta — vredi uporediti pre nego što rezervišeš.';
}

/* ==========================================================
   MOJA PUTOVANJA — Supabase (auth.users + trips tabela).
   Prijava je email magic-link (OTP), ne treba Google/OAuth podesavanje.
   Ako Supabase iz nekog razloga ne odgovori (mreza, pogresan kljuc),
   sekcija samo ostaje prazna — ne obara ostatak sajta.

   NAPOMENA O DOPUNI: ovaj fajl je stigao na doradu isečen tačno OVDE
   ("sb = window.su..."), pa je sve od ove tačke pa do kraja fajla
   dopisano da bi sajt uopšte proradio. Šema tabele "trips" (user_id,
   dest, date_from, date_to, adults, selection, total) je preuzeta iz
   poziva koji već postoje gore u fajlu (saveMatchPackage) — to je
   sigurno tačno. Ime tabele "price_alerts" i imena globalnih promenljivih
   iz config.js (window.SUPABASE_URL / window.SUPABASE_ANON_KEY) NISU
   potvrđena — ako se config.js zove drugačije, ispravi te dve linije
   odmah ispod.
========================================================== */
let sb = null;
try {
  if (window.supabase && window.SKLOPI_SUPABASE_URL && window.SKLOPI_SUPABASE_KEY) {
    sb = window.supabase.createClient(window.SKLOPI_SUPABASE_URL, window.SKLOPI_SUPABASE_KEY);
  } else {
    console.warn('[sklopi] Supabase konfiguracija (config.js) nije pronađena — nalozi i sačuvani izleti su isključeni, ostatak sajta radi normalno.');
  }
} catch (err) {
  console.warn('[sklopi] Supabase inicijalizacija nije uspela:', err.message);
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
    console.warn('[sklopi] Deljena statistika nije dostupna (tabela site_stats?), ostajem na lokalnoj:', err.message);
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
    if (error) { console.warn('[sklopi] getSession greška:', error.message); _cachedUser = null; return null; }
    _cachedUser = data.session ? data.session.user : null;
    return _cachedUser;
  } catch(err) {
    console.warn('[sklopi] getSession nije uspeo:', err.message);
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

// Zajednička funkcija za sve "Sačuvaj..." akcije kad korisnik nije
// prijavljen — otvara login karticu u header dropdown-u (dugme za nalog
// gore desno), umesto da skroluje na sekciju "Sačuvani izleti" na sredini
// sajta.
function promptLogin(message){
  _authBarExpanded = true;
  renderAccountMenu();
  const dropdown = document.getElementById('authDropdown');
  if (dropdown) dropdown.classList.add('open');
  window.scrollTo({top:0, behavior:'smooth'});
  if (message) showToast(message);
}

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
        console.warn('[sklopi] slanje magic linka nije uspelo:', err.message);
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
    console.warn('[sklopi] učitavanje sačuvanih izleta nije uspelo:', err.message);
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
    promptLogin('Prijavi se emailom da sačuvaš ponudu.');
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
    console.warn('[sklopi] čuvanje ponude nije uspelo:', err.message);
    showToast('Čuvanje nije uspelo — pokušaj ponovo.');
  }
}

document.getElementById('saveTripBtn').addEventListener('click', async () => {
  const user = await getCurrentUser();
  if (!user){
    promptLogin('Prijavi se emailom da sačuvaš izlet.');
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
    console.warn('[sklopi] čuvanje izleta nije uspelo:', err.message);
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
  if (typeof window.syncPaxDisplay === 'function') window.syncPaxDisplay();
  document.getElementById('dateFrom').dispatchEvent(new Event('change', {bubbles:true}));

  if (trip.selection && trip.selection.kind === 'builder' && trip.selection.builderState){
    Object.assign(builderState, BUILDER_DEFAULTS, trip.selection.builderState);
    renderFormUI();
    renderBuilder();
    document.getElementById('builderSummary').style.display = 'block';
    document.getElementById('builderPlaceholder').style.display = 'none';
    document.getElementById('builderBookLinks').style.display = 'none';
    openControlPanel();
    document.querySelector('.builder-wrap').scrollIntoView({behavior:'smooth', block:'start'});
  } else {
    if (!isMobileResults()) document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
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
    console.warn('[sklopi] brisanje nije uspelo:', err.message);
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
  guardOverlayOpen('share', closeShareModal);
}
function requestCloseShareModal(){
  if (!guardOverlayRequestClose('share')) closeShareModal();
}
function closeShareModal(){
  document.getElementById('shareModalBackdrop').classList.remove('open');
  document.getElementById('shareModal').classList.remove('open');
}
document.getElementById('shareModalClose').addEventListener('click', requestCloseShareModal);
document.getElementById('shareModalBackdrop').addEventListener('click', requestCloseShareModal);
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
    await navigator.share({ title:'SKLOPI — predlog za izlet', url: window._pendingShareLink });
  } catch(err){ /* korisnik je otkazao deljenje — nema potrebe za toast-om */ }
});

/* ==========================================================
   ALERT ZA CENU (Javi mi kad padne cena)
========================================================== */
let _pendingAlert = null;
/* ---- Double opt-in: traži od worker-a da pošalje potvrdni mejl za
   alert koji je upravo upisan kao 'pending_confirmation'. Fire-and-
   -forget — čak i ako ovaj pozit ne uspe (npr. Worker Route još nije
   podešen, vidi SKLOPI_ALERT_WORKER_URL u config.js), red u bazi i
   dalje postoji, samo ostaje pending dok korisnik ne zatraži novi
   alert ili se problem ne reši; ne blokiramo UI čekajući ovo. ---- */
function requestConfirmationEmail(payload){
  const base = window.SKLOPI_ALERT_WORKER_URL;
  if (!base) return;
  fetch(base.replace(/\/$/, '') + '/go/send-confirmation', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  }).catch(err => {
    console.warn('[sklopi] slanje potvrdnog mejla nije uspelo:', err.message);
  });
}

async function openAlertModal(kind, tier, total, destOverride){
  const user = await getCurrentUser();
  if (!user){
    promptLogin('Prijavi se emailom da postaviš alert za cenu.');
    return;
  }
  let dest, dateFrom, dateTo, adults, selection;
  if (kind === 'builder') {
    const ctx = builderCtx();
    dest = ctx.dest;
    dateFrom = ctx.from;
    dateTo = ctx.to;
    adults = ctx.adults;
    // Čuvamo CEO izbor iz buildera (builderState) da bi server kasnije
    // mogao da rekonstruiše IDENTIČAN paket i uporedi cenu (vidi
    // computeBuilderTotal u pricing-core.js, koje očekuje selection sa
    // flightPref/hotelStars/prioritizeRating/prioritizeLocation/carPref/
    // activityCount direktno na objektu — bez ovoga ne bi imao dovoljno
    // informacija: builder ima mnogo više opcija od gotove ponude).
    selection = Object.assign({ kind: 'builder' }, builderState);
  } else {
    const isMatchPick = !!destOverride;
    const ctx = isMatchPick ? window._lastMatchCtx : window._lastSearchCtx;
    dest = destOverride || (window._lastSearchCtx && window._lastSearchCtx.dest) || document.getElementById('dest').value.trim() || 'Atina';
    dateFrom = ctx && ctx.from;
    dateTo = ctx && ctx.to;
    adults = ctx ? Number(ctx.adults) : 2;
    // Worker (pricing-core.js → computeAlertPrice) prepoznaje 'search' po
    // selection.kind i računa cenu preko computeSearchTierTotal(dest,
    // nights, adults, tier) — tier je jedino što mu treba osim onoga što
    // već ima u redu (dest/date_from/date_to/adults).
    selection = { kind: 'search', tier };
  }
  if (!dateFrom || !dateTo) {
    showToast('Nedostaju datumi putovanja — pokušaj ponovo iz pretrage.');
    return;
  }
  _pendingAlert = { dest, dateFrom, dateTo, adults, selection, currentTotal: total };
  document.getElementById('alertModalSub').textContent = 'Za ' + dest + ' — trenutna procena je ' + fmtEUR(total) + '.';
  document.getElementById('alertEmail').value = user.email;
  document.getElementById('alertThreshold').value = Math.max(1, Math.round(total * 0.9));
  document.getElementById('alertModalBackdrop').classList.add('open');
  document.getElementById('alertModal').classList.add('open');
  guardOverlayOpen('alert', closeAlertModal);
}
function requestCloseAlertModal(){
  if (!guardOverlayRequestClose('alert')) closeAlertModal();
}
function closeAlertModal(){
  document.getElementById('alertModalBackdrop').classList.remove('open');
  document.getElementById('alertModal').classList.remove('open');
}
document.getElementById('alertModalClose').addEventListener('click', requestCloseAlertModal);
document.getElementById('alertModalBackdrop').addEventListener('click', requestCloseAlertModal);
document.getElementById('alertBuilderBtn')?.addEventListener('click', () => {
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
  if (!_pendingAlert){ requestCloseAlertModal(); return; }

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
      date_from: _pendingAlert.dateFrom,
      date_to: _pendingAlert.dateTo,
      adults: _pendingAlert.adults,
      selection: _pendingAlert.selection,
      threshold,
      last_price: _pendingAlert.currentTotal
      // Napomena: NE šaljemo status — kolona ima default
      // 'pending_confirmation' (double opt-in, vidi
      // 20260918100005_price_alerts_double_optin.sql). Alert postaje
      // 'active' (i worker ga počinje da proverava) tek kad korisnik
      // klikne link iz mejla koji šaljemo ispod.
    });
    if (error) throw error;

    // Browser nema SELECT pravo na price_alerts (namerno, vidi RLS u
    // price_alerts.sql), pa ne dobijamo nazad confirmation_token iz
    // insert-a — zato worker sam pronalazi red po ovim istim poljima
    // (vidi handleSendConfirmation u price-alert-worker.js).
    requestConfirmationEmail({
      email,
      dest: _pendingAlert.dest,
      date_from: _pendingAlert.dateFrom,
      date_to: _pendingAlert.dateTo,
      threshold
    });

    requestCloseAlertModal();
    showToast('Poslali smo ti mejl na ' + email + ' — potvrdi klikom da aktiviraš alert za ' + _pendingAlert.dest + '.');
  } catch(err) {
    console.warn('[sklopi] čuvanje alerta nije uspelo:', err.message);
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
  if (!sb) {
    dropdown.innerHTML = `<div class="auth-dropdown-inner">
         <p class="auth-hint">Prijava trenutno nije dostupna.</p>
       </div>`;
    return;
  }
  getCurrentUser().then(user => {
    if (user) {
      dropdown.innerHTML = `<div class="auth-dropdown-inner">
           <div class="auth-dropdown-email">${escapeHtml(user.email)}</div>
           <a href="#" id="dropdownSavedLink">Sačuvani izleti</a>
           <button type="button" id="dropdownLogoutBtn">Odjavi se</button>
         </div>`;
    } else if (_authBarExpanded) {
      dropdown.innerHTML = `<div class="auth-dropdown-inner">
           <p>Prijavi se da sačuvaš izlete i primaš alerte o ceni.</p>
           <input type="email" id="dropdownEmailInput" class="auth-input" placeholder="tvoj@email.com" autocomplete="email" required>
           <button type="button" class="btn-primary" id="dropdownSendLinkBtn">Pošalji link za prijavu</button>
           <p class="auth-hint">Nema lozinke — kliknućeš na link koji ti stigne na email.</p>
         </div>`;
    } else {
      dropdown.innerHTML = `<div class="auth-dropdown-inner">
           <p>Prijavi se da sačuvaš izlete i primaš alerte o ceni.</p>
           <button type="button" id="dropdownLoginBtn">Prijavi se</button>
         </div>`;
    }
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
      _authBarExpanded = true;
      renderAccountMenu();
    });
    const sendBtn = document.getElementById('dropdownSendLinkBtn');
    const emailInput = document.getElementById('dropdownEmailInput');
    if (sendBtn) sendBtn.addEventListener('click', async () => {
      const email = (emailInput.value || '').trim();
      if (!email || !email.includes('@')) { showToast('Unesi ispravnu email adresu.'); return; }
      sendBtn.disabled = true;
      sendBtn.textContent = 'Šaljem…';
      try {
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
        if (error) throw error;
        showToast('Link za prijavu je poslat na ' + email + ' — proveri inbox.');
        dropdown.innerHTML = '<div class="auth-dropdown-inner"><p class="auth-hint">✓ Proveri email (' + escapeHtml(email) + ') i klikni na link za prijavu.</p></div>';
      } catch(err) {
        console.warn('[sklopi] slanje magic linka nije uspelo:', err.message);
        showToast('Slanje linka nije uspelo — pokušaj ponovo.');
        sendBtn.disabled = false;
        sendBtn.textContent = 'Pošalji link za prijavu';
      }
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

/* ---- "Pronađi svoj izlet" dugme na stranici otvara kviz modal (koristi runMatchSearch iznad) ---- */
const matchTriggerBtn = document.getElementById('matchTriggerBtn');
if (matchTriggerBtn) matchTriggerBtn.addEventListener('click', openMatchModal);
const matchModalClose = document.getElementById('matchModalClose');
if (matchModalClose) matchModalClose.addEventListener('click', requestCloseMatchModal);
const matchModalBackdrop = document.getElementById('matchModalBackdrop');
if (matchModalBackdrop) matchModalBackdrop.addEventListener('click', requestCloseMatchModal);
const matchModalSubmit = document.getElementById('matchModalSubmit');
if (matchModalSubmit) matchModalSubmit.addEventListener('click', () => runMatchSearch(false));
document.querySelectorAll('#matchModal .match-back').forEach(btn => {
  btn.addEventListener('click', () => goToMatchStep(Number(btn.dataset.back)));
});

/* ---- Jedinstvena kartica "Dokumenta za put": pasoš + zelena karta, sa tabovima i scrollom ---- */
/* docsActionRow (unos datuma + dugme "Proveri") se prikazuje samo na tabu
   "Pasoš" i samo kad je pasoš uopšte relevantan za unetu destinaciju —
   ako destinacija nije uneta ili pasoš nije potreban, red se sakriva
   umesto da ostane vidljiv ali onemogućen (što je izgledalo kao kvar). */
let passportActionApplicable = false;
function updateDocsActionRowVisibility(){
  const row = document.getElementById('docsActionRow');
  const passTab = document.getElementById('docsTabPassport');
  const onPassportTab = !!(passTab && passTab.classList.contains('active'));
  if (row) row.hidden = !(onPassportTab && passportActionApplicable);
}
function fillPassportSection(destVal, country){
  const box = document.getElementById('passportRuleBox');
  const submitBtn = document.getElementById('passportCheckSubmit');
  const expiryInput = document.getElementById('passportExpiryInput');
  const resultEl = document.getElementById('passportResult');
  if (!destVal.trim()){
    if (box){
      box.innerHTML = '<div class="passport-rule-box">'
        + '<b>Destinacija nije uneta</b>'
        + '<br>Prvo upiši kuda putuješ u polje „Destinacija“ iznad, pa se vrati ovde — pravilo o pasošu zavisi od zemlje.'
        + '</div>';
    }
    if (expiryInput) expiryInput.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    if (resultEl){ resultEl.className = ''; resultEl.innerHTML = ''; }
    passportActionApplicable = false;
    updateDocsActionRowVisibility();
    return;
  }
  if (expiryInput) expiryInput.disabled = false;
  if (submitBtn) submitBtn.disabled = false;
  const rule = getPassportRule(country, destVal);
  if (box){
    box.innerHTML = (rule.visaNote
        ? '<div class="passport-visa-box">🛂❗ <b>Potrebna je viza</b><br>' + escapeHtml(rule.visaNote) + '</div>'
        : '')
      + '<div class="passport-rule-box">'
      + '<b>' + escapeHtml(destVal + (country ? ' · ' + country : '')) + '</b>'
      + '<br>' + escapeHtml(rule.why)
      + (rule.confident ? '' : '<br><span style="opacity:0.75">(opšte pravilo, ne potvrđeno za ovu zemlju)</span>')
      + '</div>';
  }
  if (rule.noPassportNeeded){
    if (expiryInput) expiryInput.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    if (resultEl){
      resultEl.className = 'passport-result ok';
      resultEl.innerHTML = '✅ ' + escapeHtml(rule.why);
    }
    passportActionApplicable = false;
  } else {
    if (resultEl){ resultEl.className = ''; resultEl.innerHTML = ''; }
    passportActionApplicable = true;
  }
  if (submitBtn) submitBtn.dataset.country = country;
  updateDocsActionRowVisibility();
}
function fillGreenCardSection(destVal, country){
  const box = document.getElementById('greenCardRuleBox');
  if (!box) return;
  if (!destVal.trim()){
    box.innerHTML = '<div class="passport-rule-box">'
      + '<b>Destinacija nije uneta</b>'
      + '<br>' + escapeHtml(t('green_card_dest_missing'))
      + '</div>';
    return;
  }
  const rule = getGreenCardRule(country);
  const statusBox = rule.status === 'needed'
    ? '<div class="passport-visa-box">🪪❗ <b>Zelena karta je obavezna</b><br>' + escapeHtml(rule.why) + '</div>'
    : rule.status === 'ok'
      ? '<div class="passport-result ok" style="margin-top:0;">✅ ' + escapeHtml(rule.why) + '</div>'
      : '<div class="passport-rule-box"><b>' + escapeHtml(destVal + (country ? ' · ' + country : '')) + '</b><br>' + escapeHtml(rule.why) + '</div>';
  box.innerHTML = statusBox
    + '<div class="passport-rule-box" style="margin-top:10px;">'
    + (rule.status !== 'unknown' ? '<b>' + escapeHtml(destVal + (country ? ' · ' + country : '')) + '</b><br>' : '')
    + '<span style="opacity:0.75">' + escapeHtml(t('green_card_scope_note')) + '</span>'
    + '</div>';
}
function switchDocsTab(which){
  const passTab = document.getElementById('docsTabPassport');
  const gcTab = document.getElementById('docsTabGreenCard');
  const passSection = document.getElementById('docsSectionPassport');
  const gcSection = document.getElementById('docsSectionGreenCard');
  const showPassport = which === 'passport';
  if (passTab){ passTab.classList.toggle('active', showPassport); passTab.setAttribute('aria-selected', showPassport ? 'true' : 'false'); }
  if (gcTab){ gcTab.classList.toggle('active', !showPassport); gcTab.setAttribute('aria-selected', !showPassport ? 'true' : 'false'); }
  if (passSection) passSection.hidden = !showPassport;
  if (gcSection) gcSection.hidden = showPassport;
  updateDocsActionRowVisibility();
  const scrollEl = document.querySelector('#documentsModal .docs-scroll');
  if (scrollEl) scrollEl.scrollTop = 0;
}
function openDocumentsModal(){
  const destVal = (document.getElementById('dest') || {}).value || '';
  const country = destVal.trim() ? resolveCountryForDestination(destVal) : null;
  fillPassportSection(destVal, country);
  fillGreenCardSection(destVal, country);
  switchDocsTab('passport');
  document.getElementById('documentsModalBackdrop').classList.add('open');
  document.getElementById('documentsModal').classList.add('open');
  guardOverlayOpen('documents', closeDocumentsModal);
}
function requestCloseDocumentsModal(){
  if (!guardOverlayRequestClose('documents')) closeDocumentsModal();
}
function closeDocumentsModal(){
  document.getElementById('documentsModalBackdrop').classList.remove('open');
  document.getElementById('documentsModal').classList.remove('open');
}
function runPassportCheck(){
  const destVal = (document.getElementById('dest') || {}).value || '';
  const resultEl = document.getElementById('passportResult');
  if (!resultEl) return;
  if (!destVal.trim()){
    resultEl.className = 'passport-result warn';
    resultEl.innerHTML = 'Prvo upiši destinaciju u formi, pa probaj ponovo.';
    return;
  }
  const expiryVal = (document.getElementById('passportExpiryInput') || {}).value;
  const country = resolveCountryForDestination(destVal);
  const rule = getPassportRule(country, destVal);
  if (rule.noPassportNeeded){
    resultEl.className = 'passport-result ok';
    resultEl.innerHTML = '✅ ' + escapeHtml(rule.why);
    return;
  }
  if (!expiryVal){
    resultEl.className = 'passport-result warn';
    resultEl.innerHTML = 'Unesi datum isteka pasoša da bismo mogli da proverimo.';
    return;
  }
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
const langSwitchBtn = document.getElementById('langSwitchBtn');
if (langSwitchBtn) langSwitchBtn.addEventListener('click', () => {
  const order = ['sr', 'en', 'ru'];
  const next = order[(order.indexOf(getLang()) + 1) % order.length];
  setLang(next);
});

const currencySwitchBtn = document.getElementById('currencySwitchBtn');
if (currencySwitchBtn) currencySwitchBtn.addEventListener('click', () => {
  setCurrency(currentCurrency === 'EUR' ? 'RSD' : 'EUR');
});
applyCurrencyToggleUi(); // odraz sačuvanog izbora (localStorage) pri učitavanju

const documentsCheckBtn = document.getElementById('documentsCheckBtn');
if (documentsCheckBtn) documentsCheckBtn.addEventListener('click', openDocumentsModal);
const documentsModalClose = document.getElementById('documentsModalClose');
if (documentsModalClose) documentsModalClose.addEventListener('click', requestCloseDocumentsModal);
const documentsModalBackdrop = document.getElementById('documentsModalBackdrop');
if (documentsModalBackdrop) documentsModalBackdrop.addEventListener('click', requestCloseDocumentsModal);
const docsTabPassport = document.getElementById('docsTabPassport');
if (docsTabPassport) docsTabPassport.addEventListener('click', () => switchDocsTab('passport'));
const docsTabGreenCard = document.getElementById('docsTabGreenCard');
if (docsTabGreenCard) docsTabGreenCard.addEventListener('click', () => switchDocsTab('greencard'));
const passportCheckSubmit = document.getElementById('passportCheckSubmit');
if (passportCheckSubmit) passportCheckSubmit.addEventListener('click', runPassportCheck);

/* ==========================================================
   "PRILAGODI SVOJ PLAN" — modal koji se otvara klikom na Start
   Nije nezavisan od buildera ("Želiš više kontrole?" sekcije ispod) —
   to je bio izvor bug-a. Oba UI-ja dele ISTO stanje (builderState);
   polja ovog modala su ožičena zajedno sa panelovim gore
   (wireFormFields/renderFormUI). Klik na "Nastavi" prevodi ono što se
   realno odražava na gotove ponude (auto/aktivnosti uključeni ili ne)
   u toggle-row iznad forme, pa pokreće istu pretragu koja bi se
   pokrenula i ranije klikom na Start — samo sad odmah otkriva sve
   3 kartice, bez dodatnog klika na "Nastavi" na plan-kartici.
========================================================== */
function openStartPrefsModal(){
  // Pre otvaranja, ponovo iscrtaj oba UI-ja iz builderState — bez ovoga
  // modal ne bi prikazao stanje ako je builderState u međuvremenu
  // promenjen na neki drugi način (npr. učitavanjem sačuvanog izleta).
  renderFormUI();
  document.getElementById('startPrefsBackdrop').classList.add('open');
  document.getElementById('startPrefsModal').classList.add('open');
  guardOverlayOpen('startPrefs', closeStartPrefsModal);
}
function requestCloseStartPrefsModal(){
  if (!guardOverlayRequestClose('startPrefs')) closeStartPrefsModal();
}
function closeStartPrefsModal(){
  document.getElementById('startPrefsBackdrop').classList.remove('open');
  document.getElementById('startPrefsModal').classList.remove('open');
  // Kartica "Tvoj izlet" (ako je bila premeštena unutar modala) vraća se
  // tačno na svoje originalno mesto — stanje samo (builderState) nije
  // trebalo posebno snimati, jer modal njime i direktno upravlja.
  restoreBuilderSummaryPosition();
}
document.getElementById('startPrefsClose').addEventListener('click', requestCloseStartPrefsModal);
document.getElementById('startPrefsBackdrop').addEventListener('click', requestCloseStartPrefsModal);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('startPrefsModal').classList.contains('open')) requestCloseStartPrefsModal();
});

// Polja ovog modala (let/hotel/auto/aktivnosti/putarine/taksa/budžet) su
// ožičena zajedno sa panelovim ekvivalentima gore, preko wireFormFields() —
// vidi "JEDINSTVENO STANJE FORME". Ovde ostaje samo ono što je specifično
// za PONAŠANJE modala (otvaranje/zatvaranje, "Napravi izlet", "Nastavi").

// Postavlja "on" toggle u transport-row-u SAMO ako trenutno nije već u
// traženom stanju — izbegava suvišan click event (i, za let, suvišan
// updateOriginVisibility poziv) kad se ništa ne menja.
function setTransportToggle(dataT, shouldBeOn){
  const el = document.querySelector('.toggle[data-t="' + dataT + '"]');
  if (!el) return;
  const isOn = el.classList.contains('on');
  if (isOn !== shouldBeOn) el.click();
}

// Dugme "Napravi izlet" UNUTAR "Prilagodi svoj plan" modala (iznad
// "Nastavi") — umesto da vodi na posebnu sekciju niže na strani, kartica
// "Tvoj izlet" (#builderSummary — ista, sa svom svojom logikom: optimizuj/
// sačuvaj/javi mi/rezerviši stavku) se privremeno premesti UNUTAR ovog
// modala i tu se i računa, tako da je sve — izbori i rezultat — jedna
// jedinstvena kartica koja se otvara klikom na Start. Vraća se na svoje
// originalno mesto kad se modal zatvori (restoreBuilderSummaryPosition).
document.getElementById('spMakeBtn').addEventListener('click', () => {
  const destInput = document.getElementById('dest');
  if (!destInput.value.trim()){
    showToast('Unesi destinaciju da bismo napravili izlet.');
    destInput.focus();
    return;
  }

  trackFunnelEvent('builder_open', {
    destination: destInput.value.trim()
  });

  const slot = document.getElementById('spBuilderSlot');
  const bs = document.getElementById('builderSummary');
  if (slot && bs.parentElement !== slot) slot.appendChild(bs);

  // Unutar modala "Prilagodi svoj plan" ne treba dupli "Nastavi" — modal
  // već ima svoje dugme (#startPrefsContinue) ispod cele forme, pa
  // #builderContinueBtn (koje inače otkriva linkove za rezervaciju) ovde
  // sakrivamo da ne bude dva "Nastavi" jedno ispod drugog.
  document.getElementById('builderContinueBtn').style.display = 'none';

  renderBuilder();
  bs.style.display = 'block';
  document.getElementById('builderPlaceholder').style.display = 'none';
  document.getElementById('builderBookLinks').style.display = 'none';

  requestAnimationFrame(() => {
    bs.scrollIntoView({behavior:'smooth', block:'start'});
  });
});

document.getElementById('startPrefsContinue').addEventListener('click', () => {
  // Validacija PRE zatvaranja modala i history guard-a — ako unos nije
  // ispravan, ne otvaramo rezultate (inače bi ostao "osiroteo" overlay).
  const check = validateSearchInputs({checkPast:true, car: builderState.carPref !== 'none', activity: builderState.activityCount > 0});
  if (!check.ok){
    requestCloseStartPrefsModal();
    showToast(check.msg);
    focusSearchField(check.focus);
    return;
  }
  // Direktan prelazak na rezultate — vidi komentar uz guardOverlayReplace
  // (zašto NE koristimo requestCloseStartPrefsModal ovde).
  closeStartPrefsModal();
  guardOverlayReplace('startPrefs', 'results', closeResultsSheet);
  // Auto/aktivnosti biramo ovde jer stvarno utiču na to koje se stavke
  // pojavljuju u gotovim ponudama (isto polje kao toggle-row iznad forme).
  // Let i hotel ostaju kakvi su već podešeni gore — let namerno ne
  // uključujemo automatski jer bi to iznenada tražilo popunjeno "Polazak"
  // polje koje ovaj modal ne prikuplja.
  setTransportToggle('car', builderState.carPref !== 'none');
  setTransportToggle('activity', builderState.activityCount > 0);
  trackFunnelEvent('offers_view', {
    destination: document.getElementById('dest').value.trim()
  });
  // Odmah skrolujemo ka rezultatima (na loading skeleton) — ranije se ovde
  // NIJE skrolovalo dok se ponude ne učitaju, pa je stranica ostajala pri
  // vrhu, a onda naglo skočila dole na kartice kad se učitavanje završi.
  // Sad je skrol jedan, gladak pokret: ka skeletonu odmah, pa mala
  // dorada pozicije kad prave kartice zamene skeleton (renderResults).
  runSearch(true, false);
});

/* ==========================================================
   VODIČ PO STAVCI — klik na feature-strip (Letovi/Smeštaj/Auto/
   Putarine/Aktivnosti/Osiguranje/eSIM/Transferi) otvara detaljan
   edukativni vodič kao swipeable kartice (isti obrazac kao krajnji
   rezultat "Pronađi svoj izlet" kviza — packagesSliderHtml + dots,
   otvoreno u istom bottom-sheet prozoru na mobilnom). Sadržaj je
   opšte/uredničko znanje (isti duh kao ALT_AIRPORT_NOTES/
   DEST_AIRPORT_NOTES iznad), ne uživo podatak — zato ide sa istom
   napomenom kao i ti saveti.
========================================================== */
const FEATURE_GUIDES = {
  flight: {
    icon: '✈️',
    title: 'Letovi',
    sections: [
      { step: 'Zašto je važno', body: `<p>Let je obično najveća pojedinačna stavka budžeta i najviše varira u ceni — razlika između dobrog i lošeg izbora datuma ili aviokompanije može biti i preko 100€ za isti pravac.</p>` },
      { step: 'Kako uštedeti', body: `<ul>
        <li>Cene su generalno niže utorkom i sredom, a najviše nedeljom i petkom.</li>
        <li>Rezervacija 6–8 nedelja unapred za evropske letove obično daje najbolju cenu — ni previše rano, ni u poslednji čas.</li>
        <li>Uporedi cenu leta iz susednog grada ili susedne zemlje (npr. Budimpešta umesto Novog Sada) — razlika ponekad pokriva trošak vožnje do tamo.</li>
        <li>Kombinovanje aviokompanija (jedan let tamo, drugi nazad) ume da bude jeftinije od povratne karte kod iste kompanije, ali pazi na napomenu ispod.</li>
      </ul>` },
      { step: 'Zamke i trikovi', body: `<ul>
        <li><b>Aerodrom u imenu grada nije uvek taj grad.</b> „Pariz” kod pojedinih low-cost kompanija znači Bove, 85 km od centra. Isto važi za London, Milano, Frankfurt, Stokholm, Brisel i još par gradova.</li>
        <li><b>Prtljag nije uključen u prikazanu cenu</b> kod low-cost kompanija — ručni, predati kofer i izbor sedišta plaćaju se posebno i mogu duplirati početnu cenu.</li>
        <li><b>Kombinovani letovi (dve odvojene karte) ne štite jedan drugi</b> — ako prvi let kasni i propustiš presedanje, aviokompanija drugog leta ti ne duguje ništa.</li>
      </ul>` },
      { step: 'Šta prvo proveriti', body: `<ol>
        <li>Tačan aerodrom sletanja (ne samo ime grada).</li>
        <li>Da li je prtljag uključen, i koliko tačno kilograma/dimenzija.</li>
        <li>Vreme između presedanja — manje od 1h u stranoj zemlji je rizično.</li>
      </ol>` }
    ]
  },
  hotel: {
    icon: '🏠',
    title: 'Smeštaj',
    sections: [
      { step: 'Zašto je važno', body: `<p>Smeštaj je druga najveća stavka i mesto gde se najčešće pojavljuju „iznenadni” troškovi koji nisu bili vidljivi u ceni iz pretrage.</p>` },
      { step: 'Kako uštedeti', body: `<ul>
        <li>Apartman umesto hotela je jeftiniji za boravke duže od 3–4 noći i za grupe/porodice — cena po osobi pada.</li>
        <li>Smeštaj malo van centra (10–15 min javnim prevozom) često je 20–30% jeftiniji uz zanemarljiv gubitak u udobnosti.</li>
        <li>Besplatno otkazivanje (umesto najjeftinije nepovratne opcije) vredi platiti par evra više — daje fleksibilnost ako se planovi promene.</li>
      </ul>` },
      { step: 'Zamke i trikovi', body: `<ul>
        <li><b>Taksa za grad (city tax) i taksa za čišćenje retko su uključene u cenu koju vidiš u pretrazi</b> — mogu dodati 10–15% na ukupan račun, naplaćuju se na licu mesta ili posebno na kraju.</li>
        <li><b>Slike na sajtu mogu biti stare ili iz „sličnog” apartmana u istoj zgradi</b> — proveri da li recenzije pominju da odgovara slikama.</li>
        <li><b>Depozit za štetu</b> se ponekad naplaćuje unapred na kartici i vraća 5–14 dana posle odjave — ne trošak, ali blokira sredstva.</li>
        <li>Ocena 9.0+ sa manje od 20 recenzija je manje pouzdana od ocene 8.3 sa 500 recenzija.</li>
      </ul>` },
      { step: 'Šta prvo proveriti', body: `<ol>
        <li>Da li je city tax/taksa za čišćenje uključena u prikazanu cenu.</li>
        <li>Politiku otkazivanja i rok do kad je besplatno.</li>
        <li>Tačnu lokaciju na mapi (ne samo naziv kvarta).</li>
      </ol>` }
    ]
  },
  car: {
    icon: '🚗',
    title: 'Auto',
    sections: [
      { step: 'Zašto je važno', body: `<p>Rent-a-car je klasičan primer gde se cena „od” iz pretrage znatno razlikuje od cene koju stvarno platiš na šalteru.</p>` },
      { step: 'Kako uštedeti', body: `<ul>
        <li>Preuzimanje van aerodroma (u gradu) je često jeftinije jer izbegava „aerodromsku taksu” koju firme dodaju.</li>
        <li>Manja, poznata lokalna firma ume biti jeftinija od velikih brendova za isti auto, uz malo veći rizik u kvalitetu usluge.</li>
        <li>Plaćanje goriva unapred (full-to-empty) retko se isplati — skoro uvek je jeftinije vratiti auto pun sam.</li>
      </ul>` },
      { step: 'Zamke i trikovi', body: `<ul>
        <li><b>„Besplatno otkazivanje” ne znači i besplatnu promenu datuma</b> — proveri oba uslova posebno.</li>
        <li><b>Osnovno osiguranje uključeno u cenu obično ima visoko učešće u šteti (excess)</b> od 800–1500€ — dodatno osiguranje koje ga svodi na 0 kupuje se posebno, jeftinije kod nezavisnih sajtova nego na šalteru.</li>
        <li><b>Depozit na kartici</b> se blokira pri preuzimanju (često 500–1000€) i vraća se posle vraćanja auta u ispravnom stanju.</li>
        <li>Drugi vozač, dečije sedište i GPS gotovo uvek se naplaćuju dodatno na šalteru, ne u online ceni.</li>
      </ul>` },
      { step: 'Šta prvo proveriti', body: `<ol>
        <li>Iznos učešća u šteti (excess) i da li je dodatno osiguranje isplativije kupiti unapred.</li>
        <li>Tačnu lokaciju preuzimanja (aerodrom vs. grad) i taksu razlike.</li>
        <li>Politiku goriva (full-to-full je skoro uvek najbolja opcija).</li>
      </ol>` }
    ]
  },
  tolls: {
    icon: '🛣️',
    title: 'Putarine',
    sections: [
      { step: 'Zašto je važno', body: `<p>Putarine se skoro nikad ne uračunavaju unapred kod samostalnog planiranja, a mogu značajno promeniti realnu cenu putovanja autom.</p>` },
      { step: 'Kako uštedeti', body: `<ul>
        <li>Neke rute imaju besplatnu alternativu (sporiji, ali bez putarine) koja za kraća rastojanja gubi svega 15–20 minuta.</li>
        <li>Elektronska vinjeta (Austrija, Slovenija, Mađarska, Švajcarska) je jeftinija kupljena unapred onlajn nego na granici, a izbegava se čekanje.</li>
        <li>Za više zemalja na istom putu proveri da li postoji kombinovana vinjeta koja je jeftinija od pojedinačnih.</li>
      </ul>` },
      { step: 'Zamke i trikovi', body: `<ul>
        <li><b>Vinjeta i putarina nisu isto</b> — neke zemlje (Austrija, Slovenija) traže vinjetu za sve auto-puteve, dok druge (Hrvatska, Italija) naplaćuju putarinu po pređenoj deonici na rampama.</li>
        <li><b>Kazna za vožnju bez vinjete je znatno veća od same vinjete</b> — u pojedinim zemljama i nekoliko stotina evra.</li>
        <li>Rentiran auto ponekad već ima elektronsku vinjetu/tag uključen u cenu — proveri pre nego što kupiš duplo.</li>
      </ul>` },
      { step: 'Šta prvo proveriti', body: `<ol>
        <li>Da li zemlje na ruti traže vinjetu, putarinu na rampama, ili oboje.</li>
        <li>Da li rentirani auto već ima vinjetu/tag za putarine uključen.</li>
        <li>Gde tačno kupiti vinjetu unapred (zvanični sajt, ne sumnjivi treći sajtovi sa provizijom).</li>
      </ol>` }
    ]
  },
  activity: {
    icon: '🎟️',
    title: 'Aktivnosti',
    sections: [
      { step: 'Zašto je važno', body: `<p>Popularne atrakcije imaju ograničen broj mesta dnevno — bez rezervacije unapred, gubi se vreme u redu ili se atrakcija propušta u potpunosti.</p>` },
      { step: 'Kako uštedeti', body: `<ul>
        <li>Kombinovane karte (npr. muzej + toranj) su često jeftinije od pojedinačnih ulaznica kupljenih posebno.</li>
        <li>Ulaz rano ujutru ili kasno popodne je ponekad jeftiniji i uvek manje gužve.</li>
        <li>City card (javni prevoz + ulazi u muzeje) isplati se samo ako se planira 3+ atrakcije dnevno — inače je skuplja od pojedinačnih karata.</li>
      </ul>` },
      { step: 'Zamke i trikovi', body: `<ul>
        <li><b>Karte na licu mesta kod top atrakcija (Koloseum, Alhambra, Sagrada Familia) često nisu dostupne istog dana</b> — prodaju se nedeljama unapred u sezoni.</li>
        <li><b>Sajtovi trećih strana prodaju iste karte uz proviziju od 20–40%</b> — proveri prvo zvaničan sajt atrakcije pre poređenja sa posrednicima.</li>
        <li>Besplatan ulaz određenim danima znači i duplo veće gužve — ne uvek prava ušteda ako je vreme dragoceno.</li>
      </ul>` },
      { step: 'Šta prvo proveriti', body: `<ol>
        <li>Da li glavna atrakcija zahteva rezervaciju unapred (i koliko unapred).</li>
        <li>Zvaničan sajt atrakcije, pre poređenja sa posrednicima.</li>
        <li>Da li kombinovana/city karta ima smisla za tvoj konkretan raspored.</li>
      </ol>` }
    ]
  },
  insurance: {
    icon: '🛡️',
    title: 'Osiguranje',
    sections: [
      { step: 'Zašto je važno', body: `<p>Zdravstveni tretman u inostranstvu bez osiguranja može koštati hiljade evra za ozbiljniji slučaj — ovo je stavka gde ušteda od par evra nosi nesrazmeran rizik.</p>` },
      { step: 'Kako uštedeti', body: `<ul>
        <li>Godišnja polisa (ako putuješ više puta godišnje) je gotovo uvek jeftinija po putovanju od kupovine polise za svaki put posebno.</li>
        <li>Neke bankovne kartice (premium paketi) uključuju putno osiguranje besplatno — proveri pre kupovine nove polise.</li>
        <li>Porodična/grupna polisa je jeftinija po osobi od pojedinačnih polisa za isto putovanje.</li>
      </ul>` },
      { step: 'Zamke i trikovi', body: `<ul>
        <li><b>Osnovna polisa često ne pokriva sportske aktivnosti</b> (skijanje, ronjenje, planinarenje) — proveri da li treba dodatak.</li>
        <li><b>Osiguranje za otkazivanje putovanja i zdravstveno osiguranje su dve različite stvari</b> — retko su automatski oba uključena.</li>
        <li><b>Postojeća hronična stanja se ponekad moraju posebno prijaviti</b> — ako se ne prijave, osiguranje može odbiti isplatu baš za taj slučaj.</li>
        <li>EU zdravstvena kartica (gde je primenjivo) pokriva samo javno zdravstvo u EU, ne privatne klinike niti medicinski transport nazad kući.</li>
      </ul>` },
      { step: 'Šta prvo proveriti', body: `<ol>
        <li>Da li polisa pokriva planirane aktivnosti (sport, iznajmljivanje motora/skutera).</li>
        <li>Limit pokrića za medicinski transport nazad u zemlju — najskuplji mogući trošak bez osiguranja.</li>
        <li>Da li bankovna kartica već uključuje putno osiguranje.</li>
      </ol>` }
    ]
  },
  esim: {
    icon: '📶',
    title: 'eSIM',
    sections: [
      { step: 'Zašto je važno', body: `<p>Roming van paketa operatera (van EU, ili van regiona) može biti i desetine puta skuplji od lokalnog interneta — greška ovde je najskuplja u odnosu na trošak izbegavanja.</p>` },
      { step: 'Kako uštedeti', body: `<ul>
        <li>eSIM se kupuje unapred i aktivira tek po sletanju — nema razloga plaćati roming ni jedan dan pre nego što zaista zatreba.</li>
        <li>Fiksni paket (npr. 10GB za 10 dana) jeftiniji je po GB od dnevnih paketa ako putovanje traje duže od 5–6 dana.</li>
        <li>Regionalni eSIM (npr. cela Evropa) isplativ je samo ako se putuje kroz više zemalja — za jednu destinaciju, lokalni je jeftiniji.</li>
      </ul>` },
      { step: 'Zamke i trikovi', body: `<ul>
        <li><b>Ne svi telefoni podržavaju eSIM</b> — proveri pre kupovine (uglavnom noviji modeli od 2019+, ali ne svi).</li>
        <li><b>Aktivacija zahteva internet konekciju</b> (wifi na aerodromu) pre nego što fizička SIM prestane da radi.</li>
        <li>Neki jeftini provajderi imaju slabiju mrežnu pokrivenost od glavnih operatera — proveri recenzije za konkretnu destinaciju, ne samo cenu.</li>
      </ul>` },
      { step: 'Šta prvo proveriti', body: `<ol>
        <li>Da li telefon podržava eSIM (Podešavanja → Mobilna mreža, ili stranica proizvođača).</li>
        <li>Tačnu količinu podataka potrebnu za dužinu putovanja.</li>
        <li>Da li paket pokriva samo jednu zemlju ili je potreban regionalni za rutu kroz više zemalja.</li>
      </ol>` }
    ]
  },
  transfer: {
    icon: '🚕',
    title: 'Transferi',
    sections: [
      { step: 'Zašto je važno', body: `<p>Prevoz od aerodroma do smeštaja je trošak koji se najčešće ne planira unapred, a razlika između opcija zna biti i 5–10 puta u ceni za istu rutu.</p>` },
      { step: 'Kako uštedeti', body: `<ul>
        <li>Javni prevoz od aerodroma je u većini evropskih gradova 5–10x jeftiniji od taksija, uz razliku od 20–30 minuta u vremenu.</li>
        <li>Deljeni šatl je kompromis — jeftiniji od privatnog taksija, brži od čisto javnog prevoza.</li>
        <li>Rezervacija privatnog transfera unapred (fiksna cena) skoro je uvek jeftinija i sigurnija od pregovaranja sa taksistom na licu mesta.</li>
      </ul>` },
      { step: 'Zamke i trikovi', body: `<ul>
        <li><b>Taksi bez taksimetra ili sa „specijalnom turističkom cenom” na aerodromu je čest trik</b> — unapred rezervisan transfer eliminiše taj rizik.</li>
        <li><b>Aplikacije za prevoz (tipa Uber/Bolt) nisu dostupne ili legalne u svim gradovima</b> — proveri unapred da se ne osloniš na nešto što ne postoji po sletanju.</li>
        <li>Cena transfera noću ili rano ujutru (van radnog vremena javnog prevoza) je viša — kod ranih letova bolje rezervisati unapred.</li>
      </ul>` },
      { step: 'Šta prvo proveriti', body: `<ol>
        <li>Da li javni prevoz od aerodroma radi u vreme sletanja (noćni letovi su rizik).</li>
        <li>Da li je taksi u tom gradu poznat po „turističkim cenama” — ako da, rezerviši unapred.</li>
        <li>Tačnu udaljenost/vreme od aerodroma do smeštaja pre biranja opcije.</li>
      </ol>` }
    ]
  }
};
function featureGuideScrollHtml(sections){
  return sections.map(s => `<h4>${escapeHtml(s.step)}</h4>${s.body}`).join('');
}
function openFeatureGuide(key){
  const g = FEATURE_GUIDES[key];
  if (!g) return;
  document.getElementById('featureGuideHead').innerHTML = `
    <div class="status-banner">
      <div class="status-left">
        <div class="status-check">${g.icon}</div>
        <div><h3>${escapeHtml(g.title)}</h3><p>Sve što treba da znaš pre nego što rezervišeš.</p></div>
      </div>
    </div>
  `;
  const body = document.getElementById('featureGuideBody');
  body.innerHTML = `<div class="fg-content fg-scroll">${featureGuideScrollHtml(g.sections)}</div>`
    + `<p class="fg-disclaimer">⚠️ Saveti su opšteg, edukativnog karaktera i mogu se razlikovati po konkretnoj destinaciji, sezoni i propisima zemlje. Uvek proveri aktuelne uslove kod partnera pre rezervacije.</p>`;
  openFeatureGuideSheet();
}
function openFeatureGuideSheet(){
  const sheet = document.getElementById('featureGuideSheet');
  if (!sheet) return;
  sheet.classList.add('visible');
  const backdrop = document.getElementById('featureGuideBackdrop');
  if (isMobileResults()){
    if (backdrop) backdrop.classList.add('open');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    lockResultsPageScroll();
    guardOverlayOpen('featureGuide', closeFeatureGuideSheet);
  }
}
function closeFeatureGuideSheet(){
  const sheet = document.getElementById('featureGuideSheet');
  if (!sheet) return;
  const backdrop = document.getElementById('featureGuideBackdrop');
  const wasLocked = _resultsScrollLocked;
  sheet.classList.remove('visible');
  if (backdrop) backdrop.classList.remove('open');
  sheet.removeAttribute('role');
  sheet.removeAttribute('aria-modal');
  if (wasLocked) unlockResultsPageScroll();
}
// Klik na "Nazad"/pozadinu treba da se ponaša identično fizičkom/gest
// dugmetu telefona — koristi isti univerzalni guard sistem kao ostali
// modali (vidi definiciju guardOverlayOpen/guardOverlayRequestClose na
// vrhu fajla), da postoji jedan jedini put kojim se sheet zatvara.
function requestCloseFeatureGuideSheet(){
  if (!guardOverlayRequestClose('featureGuide')) closeFeatureGuideSheet();
}
document.querySelectorAll('.feature-strip .feature[data-feature]').forEach(el => {
  el.addEventListener('click', () => openFeatureGuide(el.dataset.feature));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openFeatureGuide(el.dataset.feature); }
  });
});
const featureGuideBackBtn = document.getElementById('featureGuideBackBtn');
if (featureGuideBackBtn) featureGuideBackBtn.addEventListener('click', requestCloseFeatureGuideSheet);
const featureGuideBackdropEl = document.getElementById('featureGuideBackdrop');
if (featureGuideBackdropEl) featureGuideBackdropEl.addEventListener('click', requestCloseFeatureGuideSheet);


/* ==========================================================
   INICIJALIZACIJA
========================================================== */
applyStaticI18n();
updateStats();
updateCtaBanner();
renderSavedTrips();
renderAccountMenu();

// Dolazak sa spoljašnjeg linka sa ?dest=Grad (npr. iz vodiča na
// /vodici.html) — prepuni polje Destinacija i skroluj do forme, ali
// NE pokreći pretragu automatski (korisnik i dalje bira datume).
(function prefillDestFromQuery(){
  const params = new URLSearchParams(window.location.search);
  const destParam = params.get('dest');
  if (!destParam) return;
  const destInput = document.getElementById('dest');
  if (!destInput) return;
  destInput.value = destParam;
  requestAnimationFrame(() => {
    document.getElementById('searchForm').scrollIntoView({behavior:'smooth', block:'start'});
  });
})();
// Ako se jezik promeni, ponovo iscrtaj "Gde bi sledeće?" u novom jeziku —
// isti dnevni izbor, samo prevedeni tekst (regionalne kartice po gradu
// polaska ostaju na srpskom, kao i do sada — ovde se menja samo podrazumevani skup).
const _prevOnLangChange = window.onLangChange;
window.onLangChange = function(lang){
  if (typeof _prevOnLangChange === 'function') _prevOnLangChange(lang);
  const originVal = (document.getElementById('origin') || {}).value || '';
  if (!originVal.trim()) renderDefaultPopularDestinations();
  // Osveži CTA baner na novom jeziku (prati istu logiku: uneti tekst →
  // poslednja stvarna destinacija → generički tekst bez imena grada).
  updateCtaBanner();
};

/* ==========================================================
   "Sklopi svoju atrakciju" — slajder + sheet sa filterima
   (Viator partner sekcija). Podaci ispod su PRIMER/MOCK radi
   dizajna i UX toka — pre puštanja u produkciju treba ih
   zameniti stvarnim Viator affiliate API/widget pozivom
   (po zemlji/gradu/kategoriji), sa keširanjem odgovora.
   ========================================================== */
const ATTRACTIONS_DATA = [
  {id:'a1', name:'Vožnja gondolom kroz kanale', city:'Venecija', country:'Italija', category:'gondole', categoryLabel:'Gondole i panorame', img:'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=70&auto=format&fit=crop', price:45, link:'https://www.viator.com/searchResults/all?text=Venice%20gondola'},
  {id:'a2', name:'Koncert u Bečkoj filharmoniji', city:'Beč', country:'Austrija', category:'muzika', categoryLabel:'Muzika i koncerti', img:'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&q=70&auto=format&fit=crop', price:69, link:'https://www.viator.com/searchResults/all?text=Vienna%20concert'},
  {id:'a3', name:'Ulaznica za Koloseum sa vodičem', city:'Rim', country:'Italija', category:'kultura', categoryLabel:'Kultura i znamenitosti', img:'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=70&auto=format&fit=crop', price:39, link:'https://www.viator.com/searchResults/all?text=Colosseum%20tour'},
  {id:'a4', name:'Utakmica na Santiago Bernabeu', city:'Madrid', country:'Španija', category:'arene', categoryLabel:'Arene i sport', img:'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=70&auto=format&fit=crop', price:120, link:'https://www.viator.com/searchResults/all?text=Bernabeu%20tour'},
  {id:'a5', name:'Ronjenje na Velikom koralnom grebenu', city:'Kernс', country:'Australija', category:'voda', categoryLabel:'Vodene aktivnosti', img:'https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=800&q=70&auto=format&fit=crop', price:159, link:'https://www.viator.com/searchResults/all?text=Great%20Barrier%20Reef%20diving'},
  {id:'a6', name:'Noćna tura po Montmartru', city:'Pariz', country:'Francuska', category:'noc', categoryLabel:'Noćni život', img:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=70&auto=format&fit=crop', price:35, link:'https://www.viator.com/searchResults/all?text=Montmartre%20night%20tour'},
  {id:'a7', name:'Paragliding iznad Interlakena', city:'Interlaken', country:'Švajcarska', category:'avantura', categoryLabel:'Avantura', img:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=70&auto=format&fit=crop', price:189, link:'https://www.viator.com/searchResults/all?text=Interlaken%20paragliding'},
  {id:'a8', name:'Degustacija tapasa u Trijani', city:'Sevilja', country:'Španija', category:'gastro', categoryLabel:'Gastro ture', img:'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=70&auto=format&fit=crop', price:55, link:'https://www.viator.com/searchResults/all?text=Seville%20tapas%20tour'},
  {id:'a9', name:'Panoramski točak London Eye', city:'London', country:'Velika Britanija', category:'gondole', categoryLabel:'Gondole i panorame', img:'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=70&auto=format&fit=crop', price:32, link:'https://www.viator.com/searchResults/all?text=London%20Eye'},
  {id:'a10', name:'DJ set na krovnom baru', city:'Barselona', country:'Španija', category:'noc', categoryLabel:'Noćni život', img:'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=70&auto=format&fit=crop', price:25, link:'https://www.viator.com/searchResults/all?text=Barcelona%20rooftop%20bar'},
  {id:'a11', name:'Muzej Akropolja — brza ulaznica', city:'Atina', country:'Grčka', category:'kultura', categoryLabel:'Kultura i znamenitosti', img:'https://images.unsplash.com/photo-1555993539-1732b0258235?w=800&q=70&auto=format&fit=crop', price:28, link:'https://www.viator.com/searchResults/all?text=Acropolis%20museum'},
  {id:'a12', name:'Rafting na reci Soči', city:'Bovec', country:'Slovenija', category:'avantura', categoryLabel:'Avantura', img:'https://images.unsplash.com/photo-1530866495561-507c9faab8c9?w=800&q=70&auto=format&fit=crop', price:65, link:'https://www.viator.com/searchResults/all?text=Soca%20rafting'},
  {id:'a13', name:'Jazz klub u podrumu', city:'Njujork', country:'SAD', category:'muzika', categoryLabel:'Muzika i koncerti', img:'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=70&auto=format&fit=crop', price:48, link:'https://www.viator.com/searchResults/all?text=New%20York%20jazz%20club'},
  {id:'a14', name:'Vinska tura kroz Toskanu', city:'Firenca', country:'Italija', category:'gastro', categoryLabel:'Gastro ture', img:'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&q=70&auto=format&fit=crop', price:79, link:'https://www.viator.com/searchResults/all?text=Tuscany%20wine%20tour'}
];
const ATTRACTIONS_CATEGORIES = [
  {key:'kultura', label:'🏛️ Kultura i znamenitosti'},
  {key:'muzika', label:'🎵 Muzika i koncerti'},
  {key:'gondole', label:'🎡 Gondole i panorame'},
  {key:'arene', label:'🏟️ Arene i sport'},
  {key:'avantura', label:'🧗 Avantura'},
  {key:'voda', label:'🌊 Vodene aktivnosti'},
  {key:'gastro', label:'🍷 Gastro ture'},
  {key:'noc', label:'🎶 Noćni život'}
];
let attractionsActiveCategories = new Set();
let attractionsActiveCountry = '';

function attractionCardHtml(a){
  return `<a class="attraction-card" href="${a.link}" target="_blank" rel="noopener sponsored">
    <div class="ac-photo">
      <img src="${a.img}" alt="${escapeHtml(a.name)}" loading="lazy">
      <span class="ac-badge">${escapeHtml(a.categoryLabel)}</span>
    </div>
    <div class="ac-body">
      <span class="ac-name">${escapeHtml(a.name)}</span>
      <span class="ac-loc">${escapeHtml(a.city)}, ${escapeHtml(a.country)}</span>
      <span class="ac-price"><span>od</span> €${a.price}</span>
    </div>
  </a>`;
}

function renderAttractionsSlider(){
  const wrap = document.getElementById('attractionsSlider');
  if (!wrap) return;
  const picks = ATTRACTIONS_DATA.slice(0, 5);
  wrap.innerHTML = picks.map(attractionCardHtml).join('');
  renderAttractionsDots(picks.length);
}
function renderAttractionsDots(count){
  const dotsWrap = document.getElementById('attractionsDots');
  if (!dotsWrap) return;
  dotsWrap.innerHTML = Array.from({length: count}).map((_, i) =>
    `<button type="button" class="a-dot${i === 0 ? ' active' : ''}" data-idx="${i}" aria-label="Atrakcija ${i + 1}"></button>`
  ).join('');
}
(function initAttractionsSliderScrollSync(){
  const slider = document.getElementById('attractionsSlider');
  if (!slider) return;
  slider.addEventListener('scroll', () => {
    const cards = slider.querySelectorAll('.attraction-card');
    if (!cards.length) return;
    let closest = 0, minDist = Infinity;
    cards.forEach((c, i) => {
      const dist = Math.abs(c.offsetLeft - slider.scrollLeft);
      if (dist < minDist){ minDist = dist; closest = i; }
    });
    document.querySelectorAll('#attractionsDots .a-dot').forEach((d, i) => d.classList.toggle('active', i === closest));
  }, {passive:true});
})();
document.getElementById('attractionsPrev')?.addEventListener('click', () => {
  document.getElementById('attractionsSlider')?.scrollBy({left:-280, behavior:'smooth'});
});
document.getElementById('attractionsNext')?.addEventListener('click', () => {
  document.getElementById('attractionsSlider')?.scrollBy({left:280, behavior:'smooth'});
});

function populateAttractionsFilters(){
  const select = document.getElementById('attractionsCountrySelect');
  if (select && select.options.length <= 1){
    const countries = [...new Set(ATTRACTIONS_DATA.map(a => a.country))].sort();
    countries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      attractionsActiveCountry = select.value;
      renderAttractionsGrid();
    });
  }
  const chipRow = document.getElementById('attractionsCategoryChips');
  if (chipRow && !chipRow.dataset.built){
    chipRow.dataset.built = '1';
    chipRow.innerHTML = ATTRACTIONS_CATEGORIES.map(c =>
      `<button type="button" class="attraction-chip" data-cat="${c.key}">${c.label}</button>`
    ).join('');
    chipRow.querySelectorAll('.attraction-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const key = chip.dataset.cat;
        if (attractionsActiveCategories.has(key)){
          attractionsActiveCategories.delete(key);
          chip.classList.remove('on');
        } else {
          attractionsActiveCategories.add(key);
          chip.classList.add('on');
        }
        renderAttractionsGrid();
      });
    });
  }
}
function renderAttractionsGrid(){
  const grid = document.getElementById('attractionsGrid');
  const empty = document.getElementById('attractionsEmpty');
  if (!grid) return;
  const filtered = ATTRACTIONS_DATA.filter(a => {
    const catOk = attractionsActiveCategories.size === 0 || attractionsActiveCategories.has(a.category);
    const countryOk = !attractionsActiveCountry || a.country === attractionsActiveCountry;
    return catOk && countryOk;
  });
  grid.innerHTML = filtered.map(attractionCardHtml).join('');
  if (empty) empty.hidden = filtered.length > 0;
}

function openAttractionsSheet(){
  populateAttractionsFilters();
  renderAttractionsGrid();
  const sheet = document.getElementById('attractionsSheet');
  if (!sheet) return;
  sheet.classList.add('visible');
  const backdrop = document.getElementById('attractionsSheetBackdrop');
  if (isMobileResults()){
    if (backdrop) backdrop.classList.add('open');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    lockResultsPageScroll();
    guardOverlayOpen('attractionsSheet', closeAttractionsSheet);
  }
}
function closeAttractionsSheet(){
  const sheet = document.getElementById('attractionsSheet');
  if (!sheet) return;
  const backdrop = document.getElementById('attractionsSheetBackdrop');
  const wasLocked = _resultsScrollLocked;
  sheet.classList.remove('visible');
  if (backdrop) backdrop.classList.remove('open');
  sheet.removeAttribute('role');
  sheet.removeAttribute('aria-modal');
  if (wasLocked) unlockResultsPageScroll();
}
function requestCloseAttractionsSheet(){
  if (!guardOverlayRequestClose('attractionsSheet')) closeAttractionsSheet();
}
document.getElementById('attractionsSeeAllBtn')?.addEventListener('click', openAttractionsSheet);
document.getElementById('attractionsSheetBackBtn')?.addEventListener('click', requestCloseAttractionsSheet);
document.getElementById('attractionsSheetBackdrop')?.addEventListener('click', requestCloseAttractionsSheet);

renderAttractionsSlider();
