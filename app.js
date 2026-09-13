window.onerror = function(msg, src, line, col){ if
(location.search.includes(вЂdebug=1вЂ™)) alert(вЂGRESKA:вЂ™ + msg + вЂ™ | linija
вЂ™ + line + вЂ:вЂ™ + col); console.error(вЂ[skoknica]вЂ™, msg, вЂ| linijaвЂ™,
line + вЂ:вЂ™ + col); };

/* ========================================================== I18N вЂ”
srpski (podrazumevano) i engleski
========================================================== Princip:
statiДЌki tekst u HTML-u se prevodi preko data-i18n / data-i18n-html /
data-i18n-placeholder / data-i18n-aria-label atributa i primenjuje se
applyStaticI18n() funkcijom ispod. Za tekst koji JS generiЕЎe (rezultati,
builder, poruke), koristi se t(вЂkljucвЂ™) helper. NAPOMENA (obim ovog
prolaza): pravne stranice (privatnost/uslovi/ kolaДЌiД‡i) i stranica za
deljenje (zajedno.html) NISU prevedene вЂ” ostaju na srpskom dok se ne
uradi poseban prolaz za njih.
========================================================== */ const I18N
= { sr: { nav_how:вЂKako radiвЂ™, nav_dest:вЂDestinacijeвЂ™, nav_about:вЂO
namaвЂ™, aria_account:вЂNalogвЂ™, aria_menu:вЂMeniвЂ™, hero_title:вЂUneseЕЎ
mesto.DobijeЕЎ ceo izlet.вЂ™, hero_lede:вЂLet, hotel, auto i aktivnosti вЂ”
sastavljeni u tri gotova paketa, s jednom cenom na dnu. Bez otvaranja
deset kartica u pretraЕѕivaДЌu.вЂ™, label_origin:вЂPolazakвЂ™,
placeholder_origin:вЂnpr. Beograd, NiЕЎ, PodgoricaвЂ™,
label_dest:вЂDestinacijaвЂ™, placeholder_dest:вЂnpr. Atina, Rim, BarselonaвЂ™,
label_dates:вЂOd вЂ” DoвЂ™, aria_prev_month:вЂPrethodni mesecвЂ™,
aria_next_month:вЂSledeД‡i mesecвЂ™, chip_weekend:вЂVikendвЂ™,
chip_week:вЂNedelja danaвЂ™, chip_twoweeks:вЂDve nedeljeвЂ™,
cal_wx_legend:вЂвЂпёЏprognoza (do 16 dana unapred) В В·В  вЂпёЏprocena za dalje
datume, po podacima za isti period proЕЎle godine В В·В  build wx-5вЂ™,
btn_done:вЂGotovoвЂ™, label_passengers:вЂPutnikaвЂ™, opt_1adult:вЂ1 odrasla
osobaвЂ™, opt_2adults:вЂ2 odraslaвЂ™, opt_3adults:вЂ3 odraslaвЂ™, opt_4adults:вЂ4
odraslaвЂ™, btn_search:вЂPronaД‘i najbolje putovanjeвЂ™,
toggle_flight:вЂLetoviвЂ™, toggle_hotel:вЂSmeЕЎtajвЂ™, toggle_car:вЂRent a carвЂ™,
toggle_activity:вЂAktivnostвЂ™, surprise_trigger:вЂрџЋІ NemaЕЎ ideju kuda?
Iznenadi me za dati budЕѕet в†’вЂ™, eyebrow_more_control:вЂViЕЎe kontroleвЂ™,
h2_build_own:вЂNapravi svoj aranЕѕmanвЂ™, builder_flight_label:вЂLetвЂ™,
chip_direct:вЂDirektanвЂ™, chip_cheapest:вЂNajjeftinijiвЂ™,
chip_airline:вЂOdreД‘ena kompanijaвЂ™, placeholder_airline:вЂnpr. LufthansaвЂ™,
chip_priority_rating:вЂPrioritet: ocenaвЂ™,
chip_priority_location:вЂPrioritet: lokacijaвЂ™,
builder_transport_label:вЂPrevozвЂ™, chip_no_car:вЂBez autaвЂ™,
chip_small_car:вЂMali autoвЂ™, chip_suv:вЂSUVвЂ™,
builder_activities_label:вЂAktivnostiвЂ™, aria_fewer_activities:вЂManje
aktivnostiвЂ™, aria_more_activities:вЂViЕЎe aktivnostiвЂ™,
builder_budget_label_html:вЂBudЕѕet (opciono)вЂ™, placeholder_budget:вЂnpr.
700вЂ™, btn_make_arrangement:вЂNapravi aranЕѕmanвЂ™,
builder_summary_head:вЂTvoj aranЕѕmanвЂ™, builder_total_sub:вЂukupnoвЂ™,
builder_total_hint:вЂZbir procena za let, hotel, auto i aktivnosti вЂ”
svaka stavka se plaД‡a zasebno kod partnera, ne u jednom plaД‡anju.вЂ™,
disclaimer_illustrative:вЂвљ пёЏ Ilustrativna procena, ne stvarna ponuda вЂ”
sajt je u razvoju.вЂ™, btn_optimize:вЂOptimizuj moj aranЕѕmanвЂ™,
btn_save_trip:вЂSaДЌuvaj aranЕѕmanвЂ™, btn_price_alert:вЂJavi mi kad padne
cenaвЂ™, builder_placeholder_text:вЂOvde Д‡eЕЎ videti procenjenu cenu ДЌim
poДЌneЕЎ da biraЕЎ вЂ” promeni bilo koju opciju levo.вЂ™, eyebrow_for_later:вЂZa
kasnijeвЂ™, h2_saved_trips:вЂSaДЌuvani aranЕѕmaniвЂ™, f_flight_sub:вЂNajbolje
ceneвЂ™, f_hotel_sub:вЂProvereni objektiвЂ™, f_car_name:вЂAutoвЂ™,
f_car_sub:вЂPouzdani rentвЂ‘aвЂ‘carвЂ™, f_tolls_name:вЂPutarineвЂ™,
f_tolls_sub:вЂTaДЌna kalkulacijaвЂ™, f_activity_name:вЂAktivnostiвЂ™,
f_activity_sub:вЂTop doЕѕivljajiвЂ™, f_insurance_name:вЂOsiguranjeвЂ™,
f_insurance_sub:вЂSigurnost na putuвЂ™, f_esim_sub:вЂInternet od sletanjaвЂ™,
postcard_caption:вЂUvek postoji sledeД‡i izlet.вЂ™, eyebrow_ideas:вЂIdeje za
sledeД‡i izletвЂ™, h2_popular_dest:вЂPopularne destinacije iz Srbije i
regionaвЂ™, pd_athens_name:вЂAtina, GrДЌkaвЂ™, pd_athens_desc:вЂAntika,
ostrvski trajekti i vrhunska kuhinja вЂ” popularna letnja destinacija sa
ДЌestim direktnim letovima.вЂ™, pd_rome_name:вЂRim, ItalijaвЂ™,
pd_rome_desc:вЂKoloseum, Vatikan i uliДЌna kuhinja вЂ” grad koji se obilazi
peЕЎke, uz kratak let iz Beograda.вЂ™, pd_barcelona_name:вЂBarselona,
Е panijaвЂ™, pd_barcelona_desc:вЂGaudijeva arhitektura, plaЕѕa i tapas bary вЂ”
omiljena kombinacija grada i mora.вЂ™, pd_budva_name:вЂBudva, Crna GoraвЂ™,
pd_budva_desc:вЂNajbliЕѕe more autom ili autobusom iz Srbije вЂ” stara varoЕЎ
i duge plaЕѕe.вЂ™, pd_istanbul_name:вЂIstanbul, TurskaвЂ™,
pd_istanbul_desc:вЂSpoj Evrope i Azije, bazari i Bosfor вЂ” pristupaДЌan
izlet van sezone.вЂ™, pd_vienna_name:вЂBeДЌ, AustrijaвЂ™,
pd_vienna_desc:вЂMuzeji, kafei i boЕѕiД‡ne pijace zimi вЂ” praktiДЌan gradski
izlet za vikend.вЂ™, cta_right:вЂCeo izlet.Jedna cena.вЂ™,
eyebrow_faq:вЂPitanjaвЂ™, h2_faq:вЂPomoД‡ i FAQвЂ™, faq_q1:вЂDa li su prikazane
cene stvarne?вЂ™, faq_a1:вЂSkoknica je trenutno u razvoju. Cene koje vidiЕЎ
u pretrazi i builderu su ilustrativna procena, generisana radi
demonstracije, ne dolaze uЕѕivo sa sajtova partnera. Pre rezervacije uvek
proveri taДЌnu cenu i dostupnost direktno kod partnera (KAYAK,
Booking.com, Viator).вЂ™, faq_q2:вЂKako radi builder aranЕѕmana?вЂ™,
faq_a2:вЂSam biraЕЎ tip leta, kategoriju hotela, auto i broj aktivnosti, a
Skoknica sabira procenjenu cenu za ceo paket. Dugme вЂћOptimizuj moj
aranЕѕmanвЂќ predlaЕѕe izmenu koja moЕѕe da smanji cenu uz sliДЌan kvalitet.вЂ™,
faq_q3:вЂKako se ДЌuvaju moji saДЌuvani aranЕѕmani?вЂ™, faq_a3:вЂNapraviЕЎ nalog
emailom i lozinkom u sekciji вЂћSaДЌuvani aranЕѕmaniвЂќ. Tvoji podaci se
ДЌuvaju vezano za tvoj nalog, ne za ovaj ureД‘aj, tako da im moЕѕeЕЎ
pristupiti i sa drugog telefona ili raДЌunara вЂ” samo se prijavi istim
emailom i lozinkom.вЂ™, faq_q4:вЂDa li Skoknica naplaД‡uje rezervaciju?вЂ™,
faq_a4:вЂNe. Skoknica ne naplaД‡uje niЕЎta direktno вЂ” klikom na вЂћRezerviЕЎiвЂќ
ili вЂћPretraЕѕiвЂќ odlaziЕЎ na sajt partnera (KAYAK, Booking.com ili Viator)
gde se rezervacija i plaД‡anje obavljaju.вЂ™, faq_q5:вЂImaЕЎ pitanje koje
nije ovde?вЂ™, faq_a5:вЂPiЕЎi na panpetar405@gmail.com вЂ” rado odgovaramo.вЂ™,
stat_searches:вЂpretragaвЂ™, stat_clicks:вЂklikova na ponudeвЂ™,
stat_revenue:вЂprocenjena provizijaвЂ™, stat_last:вЂposlednja destinacijaвЂ™,
footer_contact:вЂKontaktвЂ™, footer_privacy:вЂPrivatnostвЂ™,
footer_terms:вЂUsloviвЂ™, footer_cookies:вЂKolaДЌiД‡iвЂ™, foot_note:вЂSkoknica вЂ”
prototip proizvoda u razvoju. Prikazane cene su ilustrativne (simulirane
radi demonstracije), ne dolaze uЕѕivo od partnera i ne predstavljaju
stvarnu ponudu ni obavezu na cenu. В· PodeЕЎavanja kolaДЌiД‡aвЂ™,
cookie_text:вЂKoristimo kolaДЌiД‡e za analitiku (Google Analytics) da bismo
razumeli kako se sajt koristi i unapredili ga. Ne koristimo ih za
marketing niti ih delimo van Google-a. Detalji u Politici kolaДЌiД‡a.вЂ™,
cookie_decline:вЂOdbijamвЂ™, cookie_accept:вЂPrihvatamвЂ™,
aria_close:вЂZatvoriвЂ™, label_email:вЂEmailвЂ™, label_alert_threshold:вЂJavi
mi kad ukupna procenjena cena padne ispodвЂ™, btn_set_alert:вЂPostavi
alertвЂ™, alert_modal_disclaimer:вЂвљ пёЏ I dalje ilustrativna procena, ne
stvarna ponuda partnera. Odjava je moguД‡a bilo kad preko linka u mejlu
koji dobijeЕЎ.вЂ™, surprise_modal_title:вЂIznenadi meвЂ™,
surprise_modal_sub:вЂNemaЕЎ konkretnu destinaciju na umu? Reci nam samo
budЕѕet вЂ” probaД‡emo preko 100 gradova i predloЕѕiД‡emo 3 koja se uklapaju.
Datumi i broj putnika ostaju kao u formi iznad.вЂ™,
surprise_modal_label_budget:вЂUkupan budЕѕet (za sve putnike)вЂ™,
placeholder_surprise_budget:вЂnpr. 400вЂ™, surprise_modal_btn:вЂрџЋІ PredloЕѕi
3 destinacijeвЂ™, surprise_modal_disclaimer:вЂвљ пёЏ Ilustrativna procena cene
po gradu, ne stvarna ponuda partnera.вЂ™, share_modal_title:вЂPodeli sa
prijateljimaвЂ™, share_modal_label_link:вЂLink za deljenjeвЂ™,
share_modal_copy:вЂрџ“‹ Kopiraj linkвЂ™, share_modal_native:вЂрџ“¤ Podeli preko
aplikacijaвЂ™, share_modal_disclaimer:вЂSvako ko otvori link vidi predlog i
moЕѕe da ostavi odgovor (Idem/MoЕѕda/Ne mogu) вЂ” bez pravljenja naloga.вЂ™,
// вЂ”- dinamiДЌki stringovi (koristi ih JS preko t()) вЂ”-
ac_searching:вЂTraЕѕimвЂ¦вЂ™, ac_no_results:вЂNema predloga za taj naziv.вЂ™,
night:вЂnoД‡вЂ™, nights:вЂnoД‡iвЂ™, passenger:вЂputnikвЂ™, passengers:вЂputnikaвЂ™,
fuel_estimate:вЂGorivo (procena)вЂ™, tolls_estimate:вЂPutarine (procena)вЂ™,
insurance:вЂOsiguranjeвЂ™, esim_internet:вЂeSIM / internetвЂ™,
btn_search_kayak:вЂPretraЕѕi na KAYAK-uвЂ™, btn_book_booking:вЂRezerviЕЎi na
Booking.comвЂ™, base_package_note:вЂCena osnovnog paketa вЂ” dodaj osiguranje
ili eSIM po Еѕelji.вЂ™, fits_budget:вЂUklapa se u tvoj budЕѕet odвЂ™,
over_budget:вЂMalo iznad budЕѕeta, ali najbliЕѕa opcija koju imamo.вЂ™, },
en: { nav_how:вЂHow it worksвЂ™, nav_dest:вЂDestinationsвЂ™,
nav_about:вЂAboutвЂ™, aria_account:вЂAccountвЂ™, aria_menu:вЂMenuвЂ™,
hero_title:вЂEnter a place.Get a whole trip.вЂ™, hero_lede:вЂFlight, hotel,
car and activities вЂ” bundled into three ready packages, with one price
at the bottom. No opening ten browser tabs.вЂ™, label_origin:вЂFromвЂ™,
placeholder_origin:вЂe.g.В Belgrade, NiЕЎ, PodgoricaвЂ™,
label_dest:вЂDestinationвЂ™, placeholder_dest:вЂe.g.В Athens, Rome,
BarcelonaвЂ™, label_dates:вЂFrom вЂ” ToвЂ™, aria_prev_month:вЂPrevious monthвЂ™,
aria_next_month:вЂNext monthвЂ™, chip_weekend:вЂWeekendвЂ™, chip_week:вЂOne
weekвЂ™, chip_twoweeks:вЂTwo weeksвЂ™, cal_wx_legend:вЂвЂпёЏforecast (up to 16
days ahead) В В·В  вЂпёЏestimate for later dates, based on the same period
last year В В·В  build wx-5вЂ™, btn_done:вЂDoneвЂ™,
label_passengers:вЂTravelersвЂ™, opt_1adult:вЂ1 adultвЂ™, opt_2adults:вЂ2
adultsвЂ™, opt_3adults:вЂ3 adultsвЂ™, opt_4adults:вЂ4 adultsвЂ™,
btn_search:вЂFind the best tripвЂ™, toggle_flight:вЂFlightsвЂ™,
toggle_hotel:вЂStayвЂ™, toggle_car:вЂRent a carвЂ™,
toggle_activity:вЂActivityвЂ™, surprise_trigger:вЂрџЋІ No idea where to go?
Surprise me for a budget в†’вЂ™, eyebrow_more_control:вЂMore controlвЂ™,
h2_build_own:вЂBuild your own tripвЂ™, builder_flight_label:вЂFlightвЂ™,
chip_direct:вЂDirectвЂ™, chip_cheapest:вЂCheapestвЂ™, chip_airline:вЂSpecific
airlineвЂ™, placeholder_airline:вЂe.g.В LufthansaвЂ™,
chip_priority_rating:вЂPriority: ratingвЂ™,
chip_priority_location:вЂPriority: locationвЂ™,
builder_transport_label:вЂTransportвЂ™, chip_no_car:вЂNo carвЂ™,
chip_small_car:вЂSmall carвЂ™, chip_suv:вЂSUVвЂ™,
builder_activities_label:вЂActivitiesвЂ™, aria_fewer_activities:вЂFewer
activitiesвЂ™, aria_more_activities:вЂMore activitiesвЂ™,
builder_budget_label_html:вЂBudget (optional)вЂ™,
placeholder_budget:вЂe.g.В 700вЂ™, btn_make_arrangement:вЂBuild my tripвЂ™,
builder_summary_head:вЂYour tripвЂ™, builder_total_sub:вЂtotalвЂ™,
builder_total_hint:вЂSum of estimates for flight, hotel, car and
activities вЂ” each item is paid separately at the partner, not in one
payment.вЂ™, disclaimer_illustrative:вЂвљ пёЏ Illustrative estimate, not a real
offer вЂ” the site is in development.вЂ™, btn_optimize:вЂOptimize my tripвЂ™,
btn_save_trip:вЂSave tripвЂ™, btn_price_alert:вЂNotify me when the price
dropsвЂ™, builder_placeholder_text:вЂYouвЂ™ll see an estimated price here as
soon as you start choosing вЂ” change any option on the left.вЂ™,
eyebrow_for_later:вЂFor laterвЂ™, h2_saved_trips:вЂSaved tripsвЂ™,
f_flight_sub:вЂBest pricesвЂ™, f_hotel_sub:вЂVerified propertiesвЂ™,
f_car_name:вЂCarвЂ™, f_car_sub:вЂReliable rentвЂ‘aвЂ‘carвЂ™, f_tolls_name:вЂTollsвЂ™,
f_tolls_sub:вЂAccurate calculationвЂ™, f_activity_name:вЂActivitiesвЂ™,
f_activity_sub:вЂTop experiencesвЂ™, f_insurance_name:вЂInsuranceвЂ™,
f_insurance_sub:вЂSafety on the roadвЂ™, f_esim_sub:вЂInternet from
landingвЂ™, postcard_caption:вЂThereвЂ™s always a next trip.вЂ™,
eyebrow_ideas:вЂIdeas for your next tripвЂ™, h2_popular_dest:вЂPopular
destinations from Serbia and the regionвЂ™, pd_athens_name:вЂAthens,
GreeceвЂ™, pd_athens_desc:вЂAntiquity, island ferries and top-notch food вЂ”
a popular summer destination with frequent direct flights.вЂ™,
pd_rome_name:вЂRome, ItalyвЂ™, pd_rome_desc:вЂThe Colosseum, the Vatican and
street food вЂ” a walkable city, a short flight from Belgrade.вЂ™,
pd_barcelona_name:вЂBarcelona, SpainвЂ™, pd_barcelona_desc:вЂGaudГ­вЂ™s
architecture, the beach and tapas bars вЂ” a favorite city-and-sea
combination.вЂ™, pd_budva_name:вЂBudva, MontenegroвЂ™, pd_budva_desc:вЂThe
closest sea by car or bus from Serbia вЂ” an old town and long beaches.вЂ™,
pd_istanbul_name:вЂIstanbul, TurkeyвЂ™, pd_istanbul_desc:вЂWhere Europe
meets Asia, bazaars and the Bosphorus вЂ” an affordable off-season trip.вЂ™,
pd_vienna_name:вЂVienna, AustriaвЂ™, pd_vienna_desc:вЂMuseums, cafГ©s and
Christmas markets in winter вЂ” a practical city break.вЂ™, cta_right:вЂOne
trip.One price.вЂ™, eyebrow_faq:вЂQuestionsвЂ™, h2_faq:вЂHelp & FAQвЂ™,
faq_q1:вЂAre the prices shown real?вЂ™, faq_a1:вЂSkoknica is currently in
development. Prices you see in search and the builder are an
illustrative estimate, generated for demonstration, and donвЂ™t come live
from partner sites. Always check the exact price and availability
directly with the partner (KAYAK, Booking.com, Viator) before booking.вЂ™,
faq_q2:вЂHow does the trip builder work?вЂ™, faq_a2:вЂYou choose the flight
type, hotel category, car and number of activities yourself, and
Skoknica adds up an estimated price for the whole package. The вЂњOptimize
my tripвЂќ button suggests a change that can lower the price with similar
quality.вЂ™, faq_q3:вЂHow are my saved trips stored?вЂ™, faq_a3:вЂYou create
an account with an email and password in the вЂњSaved tripsвЂќ section. Your
data is tied to your account, not this device, so you can access it from
another phone or computer too вЂ” just log in with the same email and
password.вЂ™, faq_q4:вЂDoes Skoknica charge for booking?вЂ™,
faq_a4:вЂNo.В Skoknica doesnвЂ™t charge anything directly вЂ” clicking вЂњBookвЂќ
or вЂњSearchвЂќ takes you to the partnerвЂ™s site (KAYAK, Booking.com or
Viator) where the booking and payment happen.вЂ™, faq_q5:вЂHave a question
thatвЂ™s not here?вЂ™, faq_a5:вЂWrite to panpetar405@gmail.com вЂ” weвЂ™re happy
to help.вЂ™, stat_searches:вЂsearchesвЂ™, stat_clicks:вЂclicks on offersвЂ™,
stat_revenue:вЂestimated commissionвЂ™, stat_last:вЂlast destinationвЂ™,
footer_contact:вЂContactвЂ™, footer_privacy:вЂPrivacyвЂ™,
footer_terms:вЂTermsвЂ™, footer_cookies:вЂCookiesвЂ™, foot_note:вЂSkoknica вЂ” a
product prototype in development. Prices shown are illustrative
(simulated for demonstration), donвЂ™t come live from partners, and donвЂ™t
represent a real offer or price commitment. В· Cookie settingsвЂ™,
cookie_text:вЂWe use cookies for analytics (Google Analytics) to
understand how the site is used and improve it. We donвЂ™t use them for
marketing or share them beyond Google. Details in the Cookie Policy.вЂ™,
cookie_decline:вЂDeclineвЂ™, cookie_accept:вЂAcceptвЂ™, aria_close:вЂCloseвЂ™,
label_email:вЂEmailвЂ™, label_alert_threshold:вЂNotify me when the total
estimated price drops belowвЂ™, btn_set_alert:вЂSet alertвЂ™,
alert_modal_disclaimer:вЂвљ пёЏ Still an illustrative estimate, not a real
partner offer. You can unsubscribe anytime via the link in the email you
receive.вЂ™, surprise_modal_title:вЂSurprise meвЂ™, surprise_modal_sub:вЂNo
specific destination in mind? Just tell us your budget вЂ” weвЂ™ll try over
100 cities and suggest 3 that fit. Dates and traveler count stay as set
in the form above.вЂ™, surprise_modal_label_budget:вЂTotal budget (for all
travelers)вЂ™, placeholder_surprise_budget:вЂe.g.В 400вЂ™,
surprise_modal_btn:вЂрџЋІ Suggest 3 destinationsвЂ™,
surprise_modal_disclaimer:вЂвљ пёЏ Illustrative price estimate per city, not
a real partner offer.вЂ™, share_modal_title:вЂShare with friendsвЂ™,
share_modal_label_link:вЂShare linkвЂ™, share_modal_copy:вЂрџ“‹ Copy linkвЂ™,
share_modal_native:вЂрџ“¤ Share via appsвЂ™, share_modal_disclaimer:вЂAnyone
who opens the link can see the plan and RSVP (Going/Maybe/CanвЂ™t make it)
вЂ” no account needed.вЂ™, ac_searching:вЂSearchingвЂ¦вЂ™, ac_no_results:вЂNo
suggestions for that name.вЂ™, night:вЂnightвЂ™, nights:вЂnightsвЂ™,
passenger:вЂtravelerвЂ™, passengers:вЂtravelersвЂ™, fuel_estimate:вЂFuel
(estimate)вЂ™, tolls_estimate:вЂTolls (estimate)вЂ™, insurance:вЂInsuranceвЂ™,
esim_internet:вЂeSIM / internetвЂ™, btn_search_kayak:вЂSearch on KAYAKвЂ™,
btn_book_booking:вЂBook on Booking.comвЂ™, base_package_note:вЂBase package
price вЂ” add insurance or eSIM if you like.вЂ™, fits_budget:вЂFits your
budget ofвЂ™, over_budget:вЂSlightly over budget, but the closest option we
have.вЂ™, } }; function getLang(){ return
localStorage.getItem(вЂskoknica_langвЂ™) === вЂenвЂ™ ? вЂenвЂ™ : вЂsrвЂ™; } function
t(key){ const lang = getLang(); return (I18N[lang] && I18N[lang][key])
?? (I18N.sr[key] ?? key); } function applyStaticI18n(){ const lang =
getLang(); document.documentElement.lang = lang;
document.querySelectorAll(вЂ[data-i18n]вЂ™).forEach(el => { el.textContent
= t(el.getAttribute(вЂdata-i18nвЂ™)); });
document.querySelectorAll(вЂ[data-i18n-html]вЂ™).forEach(el => {
el.innerHTML = t(el.getAttribute(вЂdata-i18n-htmlвЂ™)); });
document.querySelectorAll(вЂ[data-i18n-placeholder]вЂ™).forEach(el => {
el.placeholder = t(el.getAttribute(вЂdata-i18n-placeholderвЂ™)); });
document.querySelectorAll(вЂ[data-i18n-aria-label]вЂ™).forEach(el => {
el.setAttribute(вЂaria-labelвЂ™,
t(el.getAttribute(вЂdata-i18n-aria-labelвЂ™))); }); const btn =
document.getElementById(вЂlangSwitchBtnвЂ™); if (btn) btn.innerHTML = lang
=== вЂsrвЂ™ ? вЂSR/ENвЂ™ : вЂSR/ENвЂ™; const titleEl =
document.querySelector(вЂtitleвЂ™); if (titleEl) titleEl.textContent = lang
=== вЂsrвЂ™ ? вЂSkoknica вЂ” ceo izlet, jedna cenaвЂ™ : вЂSkoknica вЂ” one whole
trip, one priceвЂ™; const metaDesc =
document.querySelector(вЂmeta[name=вЂњdescriptionвЂќ]вЂ™); if (metaDesc)
metaDesc.setAttribute(вЂcontentвЂ™, lang === вЂsrвЂ™ ? вЂSkoknica pronalazi
let, hotel, auto i aktivnosti za tvoj sledeД‡i izlet i sabira ih u jednu
cenu. Napravi sopstveni aranЕѕman ili poreД‘aj gotove pakete po budЕѕetu.вЂ™
: вЂSkoknica finds flights, hotels, cars and activities for your next
trip and adds them into one price. Build your own trip or browse ready
packages by budget.вЂ™); } function setLang(lang){
localStorage.setItem(вЂskoknica_langвЂ™, lang === вЂenвЂ™ ? вЂenвЂ™ : вЂsrвЂ™);
applyStaticI18n(); // Ponovo iscrtaj dinamiДЌki generisan sadrЕѕaj
(rezultati/builder/auth/saved) // u novom jeziku, ako trenutno postoji
na strani. if (typeof window.onLangChange === вЂfunctionвЂ™)
window.onLangChange(lang); }

function seededRandom(seed){ let s = seed % 2147483647; if (s <= 0) s +=
2147483646; return function(){ s = (s * 16807) % 2147483647; return
(s - 1) / 2147483646; }; } function hashSeed(str){ let h = 0; for (let
i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) | 0; } return
Math.abs(h) || 1; } function nightsBetween(a,b){ const ms = new
Date(b) - new Date(a); return Math.max(1, Math.round(ms / 86400000)); }
function fmtDate(iso){ const d = new Date(iso); if (getLang() === вЂenвЂ™)
return d.toLocaleString(вЂen-GBвЂ™, {day:вЂnumericвЂ™, month:вЂshortвЂ™}); return
d.getDate() + вЂ.вЂ™ + d.toLocaleString(вЂsr-LatnвЂ™, {month:вЂlongвЂ™}); }
function passengerLabel(adults){ const n = String(adults); return n ===
вЂ1вЂ™ ? t(вЂpassengerвЂ™) : t(вЂpassengersвЂ™); }

/* вЂ”- Kalendar za izbor datuma u вЂњticketвЂќ pretrazi (stub вЂњOd вЂ” DoвЂќ) вЂ”-
*/ // Open-Meteo geokodiranje ne sortira rezultate po znaДЌaju grada, pa
вЂњMilanoвЂќ // ume da vrati malo selo u Peruu pre Milana u Italiji. Ovde
biramo najbolje // poklapanje: prvo taДЌan naziv (case-insensitive), pa
najveД‡i broj stanovnika, // pa gradove/prestonice (feature_code) pre
manjih naselja. // (globalna funkcija вЂ” koriste je i vremenska prognoza
(wx.geocode) i predlozi // gradova u poljima Polazak/Destinacija
(fetchLocationSuggestions), pa mora // biti van svih IIFE-ova da bi bila
vidljiva na oba mesta.) function rankLocationMatches(results, query){
const q = query.trim().toLowerCase(); const featureRank = {PPLC:0,
PPLA:1, PPLA2:2, PPL:3}; // prestonica > regionalni centar > selo const
scored = results.map(r => { const exact = r.name.trim().toLowerCase()
=== q ? 0 : 1; const feat = featureRank[r.feature_code] ?? 4; const pop
= r.population || 0; return {r, exact, feat, pop}; }); scored.sort((a,
b) => { if (a.exact !== b.exact) return a.exact - b.exact; if (a.feat
!== b.feat) return a.feat - b.feat; return b.pop - a.pop; // veД‡i grad
prvo }); return scored.map(s => s.r); } function
pickBestLocationMatch(results, query){ return
rankLocationMatches(results, query)[0]; }

(function(){ const displayBtn =
document.getElementById(вЂdateDisplayBtnвЂ™); const rangeText =
document.getElementById(вЂdateDisplayTextвЂ™); const nightsText =
document.getElementById(вЂdateNightsTextвЂ™); const hiddenFrom =
document.getElementById(вЂdateFromвЂ™); const hiddenTo =
document.getElementById(вЂdateToвЂ™); const calCard =
document.getElementById(вЂcalCardвЂ™); const calMonths =
document.getElementById(вЂcalMonthsвЂ™); const calGrids =
document.getElementById(вЂcalGridsвЂ™); const calRangeLabel =
document.getElementById(вЂcalRangeLabelвЂ™); const prevBtn =
document.getElementById(вЂcalPrevвЂ™); const nextBtn =
document.getElementById(вЂcalNextвЂ™); const applyBtn =
document.getElementById(вЂcalApplyвЂ™); if (!displayBtn || !calCard)
return;

const DAY_NAMES = [вЂPonвЂ™,вЂUtoвЂ™,вЂSreвЂ™,вЂДЊetвЂ™,вЂPetвЂ™,вЂSubвЂ™,вЂNedвЂ™]; const
today = new Date(); today.setHours(0,0,0,0);

function parseISODate(iso){ const [y,m,d] = iso.split(вЂ-вЂ™).map(Number);
return new Date(y, m - 1, d); } function toISODate(d){ return
d.getFullYear() + вЂ-вЂ™ + String(d.getMonth()+1).padStart(2,вЂ0вЂ™) + вЂ-вЂ™ +
String(d.getDate()).padStart(2,вЂ0вЂ™); } function fmtShort(d){ return
d.getDate() + вЂ.вЂ™ + d.toLocaleString(вЂsr-LatnвЂ™,
{month:вЂshortвЂ™}).replace(вЂ.вЂ™, вЂ™вЂ); } function sameDay(a,b){ return !!a
&& !!b && a.getTime() === b.getTime(); } function nightsCount(a,b){
return Math.max(1, Math.round((b - a) / 86400000)); } function
nightsWord(n){ return n === 1 ? t(вЂ™nightвЂ™) : t(вЂnightsвЂ™); }

let selStart = parseISODate(hiddenFrom.value); let selEnd =
parseISODate(hiddenTo.value); let viewYear = selStart.getFullYear(); let
viewMonth = selStart.getMonth();

/* вЂ”- Vremenska prognoza po danima (Open-Meteo вЂ” javno dostupan,
besplatan API) вЂ”- Prava prognoza postoji samo za ~16 dana unapred. Za
datume dalje u buduД‡nosti ne postoji вЂњtaДЌnaвЂќ prognoza kod nikog вЂ” zato
se za njih prikazuje PROCENA na osnovu istog perioda proЕЎle godine
(arhivski podaci), vizuelno zamuД‡ena ikonica, da se ne stvori laЕѕan
utisak preciznosti. */ const WMO_ICON = { 0:вЂвЂпёЏвЂ™,1:вЂрџЊ¤пёЏвЂ™,2:вЂв›…вЂ™,3:вЂвЃпёЏвЂ™,
45:вЂрџЊ«пёЏвЂ™,48:вЂрџЊ«пёЏвЂ™, 51:вЂрџЊ¦пёЏвЂ™,53:вЂрџЊ¦пёЏвЂ™,55:вЂрџЊ¦пёЏвЂ™, 56:вЂрџЊ§пёЏвЂ™,57:вЂрџЊ§пёЏвЂ™,
61:вЂрџЊ§пёЏвЂ™,63:вЂрџЊ§пёЏвЂ™,65:вЂрџЊ§пёЏвЂ™, 66:вЂрџЊ§пёЏвЂ™,67:вЂрџЊ§пёЏвЂ™,
71:вЂрџЊЁпёЏвЂ™,73:вЂрџЊЁпёЏвЂ™,75:вЂвќ„пёЏвЂ™,77:вЂвќ„пёЏвЂ™, 80:вЂрџЊ¦пёЏвЂ™,81:вЂрџЊ§пёЏвЂ™,82:вЂв›€пёЏвЂ™,
85:вЂрџЊЁпёЏвЂ™,86:вЂрџЊЁпёЏвЂ™, 95:вЂв›€пёЏвЂ™,96:вЂв›€пёЏвЂ™,99:вЂв›€пёЏвЂ™ }; function wxIcon(code){
return WMO_ICON[code] || вЂ™вЂ™; }

const wx = { geoCache: {}, forecastCache: {}, // key: вЂњlat,lonвЂќ -> {iso:
{code,tmax,tmin}} climateCache: {}, // key: вЂњlat,lon|minISO|maxISOвЂќ ->
{iso: {code,tmax,tmin}} async geocode(city){ const key =
city.trim().toLowerCase(); if (!key) return {geo:null,
networkError:false}; if (this.geoCache[key]) return
{geo:this.geoCache[key], networkError:false}; const attempts = [
вЂhttps://geocoding-api.open-meteo.com/v1/search?name=вЂ™ +
encodeURIComponent(city) + вЂ&count=10&language=sr&format=jsonвЂ™,
вЂhttps://geocoding-api.open-meteo.com/v1/search?name=вЂ™ +
encodeURIComponent(city) + вЂ&count=10&language=en&format=jsonвЂ™,
вЂhttps://geocoding-api.open-meteo.com/v1/search?name=вЂ™ +
encodeURIComponent(city) + вЂ&count=10&format=jsonвЂ™ ]; let networkError =
false; for (const url of attempts){ try{ const res = await fetch(url);
if (!res.ok){ networkError = true; continue; } const data = await
res.json(); if (data && data.results && data.results.length){ const r =
pickBestLocationMatch(data.results, city); const geo = {lat:
Math.round(r.latitude100)/100, lon: Math.round(r.longitude100)/100};
this.geoCache[key] = geo; return {geo, networkError:false}; } }
catch(err){ networkError = true; console.warn(вЂ[skoknica] geokodiranje
odrediЕЎta nije uspelo:вЂ™, err.message); } } return {geo:null,
networkError}; }, async getForecast(geo){ const key = geo.lat + вЂ,вЂ™ +
geo.lon; if (this.forecastCache[key]) return
{data:this.forecastCache[key], networkError:false}; try{ const res =
await fetch(вЂhttps://api.open-meteo.com/v1/forecast?latitude=вЂ™ +
geo.lat + вЂ&longitude=вЂ™ + geo.lon +
вЂ&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=16вЂ™);
if (!res.ok) return {data:{}, networkError:true}; const data = await
res.json(); const out = {}; if (data && data.daily){
data.daily.time.forEach((iso, i) => { out[iso] = {code:
data.daily.weathercode[i], tmax:
Math.round(data.daily.temperature_2m_max[i]), tmin:
Math.round(data.daily.temperature_2m_min[i])}; }); }
this.forecastCache[key] = out; return {data:out, networkError:false}; }
catch(err){ console.warn(вЂ[skoknica] prognoza nije uspela:вЂ™,
err.message); return {data:{}, networkError:true}; } }, async
getClimateRange(geo, minISO, maxISO){ const key = geo.lat + вЂ,вЂ™ +
geo.lon + вЂ|вЂ™ + minISO + вЂ|вЂ™ + maxISO; if (this.climateCache[key])
return {data:this.climateCache[key], networkError:false}; // ista opsega
dana, samo godinu unazad вЂ” kao osnova za procenu const shiftYear = (iso,
delta) => { const d = parseISODate(iso); d.setFullYear(d.getFullYear() +
delta); return d; }; const startLastYear = shiftYear(minISO, -1); const
endLastYear = shiftYear(maxISO, -1); const out = {}; try{ const res =
await fetch(вЂhttps://archive-api.open-meteo.com/v1/archive?latitude=вЂ™ +
geo.lat + вЂ&longitude=вЂ™ + geo.lon + вЂ&start_date=вЂ™ +
toISODate(startLastYear) + вЂ&end_date=вЂ™ + toISODate(endLastYear) +
вЂ&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=autoвЂ™);
if (!res.ok) return {data:{}, networkError:true}; const data = await
res.json(); if (data && data.daily){
data.daily.time.forEach((lastYearISO, i) => { const d =
parseISODate(lastYearISO); d.setFullYear(d.getFullYear() + 1);
out[toISODate(d)] = {code: data.daily.weathercode[i], tmax:
Math.round(data.daily.temperature_2m_max[i]), tmin:
Math.round(data.daily.temperature_2m_min[i])}; }); }
this.climateCache[key] = out; return {data:out, networkError:false}; }
catch(err){ console.warn(вЂ[skoknica] istorijski podaci nisu uspeli:вЂ™,
err.message); return {data:out, networkError:true}; } } };

let wxRequestSeq = 0; async function paintWeather(){ const cells =
Array.from(calGrids.querySelectorAll(вЂ.cal-day[data-date]:not(.is-disabled)вЂ™));
if (!cells.length) return; const destInput =
document.getElementById(вЂdestвЂ™); const city = (destInput &&
destInput.value.trim()) || вЂAtinaвЂ™; const statusEl =
document.getElementById(вЂcalWxStatusвЂ™); const setStatus = (msg) => { if
(statusEl){ statusEl.textContent = msg; statusEl.style.display = msg ?
вЂblockвЂ™ : вЂnoneвЂ™; } };

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

function updateDisplay(){ const n = nightsCount(selStart, selEnd);
rangeText.textContent = fmtShort(selStart) + вЂ™ вЂ“ вЂ™ + fmtShort(selEnd);
nightsText.textContent = n + вЂ™ вЂ™ + nightsWord(n);
calRangeLabel.innerHTML = fmtShort(selStart) + вЂ™ вЂ“ вЂ™ +
fmtShort(selEnd) + вЂ™ В· вЂ™ + n + вЂ™ вЂ™ + nightsWord(n) + вЂвЂ™; }

function commit(){ hiddenFrom.value = toISODate(selStart);
hiddenTo.value = toISODate(selEnd); hiddenFrom.dispatchEvent(new
Event(вЂchangeвЂ™, {bubbles:true})); hiddenTo.dispatchEvent(new
Event(вЂchangeвЂ™, {bubbles:true})); updateDisplay(); }

function buildMonthGrid(year, month){ const first = new Date(year,
month, 1); const startOffset = (first.getDay() + 6) % 7; // ponedeljak =
0 const daysInMonth = new Date(year, month + 1, 0).getDate();

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

function render(){ const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
const nextY = viewMonth === 11 ? viewYear + 1 : viewYear; const
monthLabel = (y, m) => { const name = new Date(y, m,
1).toLocaleString(вЂsr-LatnвЂ™, {month:вЂlongвЂ™}); return
name.charAt(0).toUpperCase() + name.slice(1) + вЂ™ вЂ™ + y; };
calMonths.innerHTML = вЂвЂ™ + monthLabel(viewYear, viewMonth) + вЂ™вЂ™ +
monthLabel(nextY, nextM) + вЂ™вЂ™; calGrids.innerHTML =
buildMonthGrid(viewYear, viewMonth) + buildMonthGrid(nextY, nextM);
calGrids.querySelectorAll(вЂ.cal-day:not(.is-empty):not(.is-disabled)вЂ™).forEach(el
=> { el.addEventListener(вЂclickвЂ™, () => { const d =
parseISODate(el.dataset.date); if (!selStart || (selStart && selEnd)){
selStart = d; selEnd = null; } else if (d < selStart){ selStart = d; }
else { selEnd = d; } render(); if (selStart && selEnd) updateDisplay();
}); }); paintWeather(); }

function openCal(){ viewYear = today.getFullYear(); viewMonth =
today.getMonth(); render(); calCard.classList.add(вЂopenвЂ™);
displayBtn.setAttribute(вЂaria-expandedвЂ™, вЂtrueвЂ™); } function
closeCal(shouldCommit){ calCard.classList.remove(вЂopenвЂ™);
displayBtn.setAttribute(вЂaria-expandedвЂ™, вЂfalseвЂ™); if (shouldCommit &&
selStart && selEnd){ commit(); } else if (!selStart || !selEnd){
selStart = parseISODate(hiddenFrom.value); selEnd =
parseISODate(hiddenTo.value); } }

displayBtn.addEventListener(вЂclickвЂ™, (e) => { e.stopPropagation(); if
(calCard.classList.contains(вЂopenвЂ™)) closeCal(true); else openCal(); });
applyBtn.addEventListener(вЂclickвЂ™, (e) => { e.stopPropagation(); if
(selStart && selEnd) closeCal(true); });
prevBtn.addEventListener(вЂclickвЂ™, (e) => { e.stopPropagation();
viewMonth -= 1; if (viewMonth < 0){ viewMonth = 11; viewYear -= 1; }
render(); }); nextBtn.addEventListener(вЂclickвЂ™, (e) => {
e.stopPropagation(); viewMonth += 1; if (viewMonth > 11){ viewMonth = 0;
viewYear += 1; } render(); });
calCard.querySelectorAll(вЂ[data-quick]вЂ™).forEach(btn => {
btn.addEventListener(вЂclickвЂ™, (e) => { e.stopPropagation(); const base =
(selStart && selStart >= today) ? new Date(selStart) : new Date(today);
let s, en; if (btn.dataset.quick === вЂweekendвЂ™){ s = new Date(today);
const offset = (5 - s.getDay() + 7) % 7 || 7; s.setDate(s.getDate() +
offset); en = new Date(s); en.setDate(en.getDate() + 2); } else if
(btn.dataset.quick === вЂweekвЂ™){ s = base; en = new Date(s);
en.setDate(en.getDate() + 7); } else { s = base; en = new Date(s);
en.setDate(en.getDate() + 14); } selStart = s; selEnd = en; viewYear =
s.getFullYear(); viewMonth = s.getMonth(); render(); updateDisplay();
}); }); calCard.addEventListener(вЂclickвЂ™, (e) => e.stopPropagation());

document.addEventListener(вЂclickвЂ™, () => { if
(calCard.classList.contains(вЂopenвЂ™)) closeCal(true); });
document.addEventListener(вЂkeydownвЂ™, (e) => { if (e.key === вЂEscapeвЂ™ &&
calCard.classList.contains(вЂopenвЂ™)) closeCal(true); });

const destInputEl = document.getElementById(вЂdestвЂ™); if (destInputEl){
let destDebounce; destInputEl.addEventListener(вЂinputвЂ™, () => {
clearTimeout(destDebounce); destDebounce = setTimeout(() => { if
(calCard.classList.contains(вЂopenвЂ™)) paintWeather(); }, 500); }); }

updateDisplay(); })();

// Small heuristic list вЂ” no geo API here, just enough to stop the CTA
// from promising a beach in landlocked cities like Beograd or BeДЌ.
const COASTAL_DESTINATIONS = [
вЂatinaвЂ™,вЂsolunвЂ™,вЂkrfвЂ™,вЂsantoriniвЂ™,вЂmikonosвЂ™,вЂrodosвЂ™,вЂkritвЂ™,
вЂdubrovnikвЂ™,вЂsplitвЂ™,вЂzadarвЂ™,вЂbudvaвЂ™,вЂkotorвЂ™,вЂherceg noviвЂ™,
вЂbarselonaвЂ™,вЂnicaвЂ™,вЂmalagaвЂ™,вЂvalensijaвЂ™,вЂibicaвЂ™,вЂnapuljвЂ™,вЂvenecijaвЂ™,
вЂlisabonвЂ™,вЂportoвЂ™,вЂtel avivвЂ™,вЂantalijaвЂ™,вЂbodrumвЂ™]; function
ctaCopy(dest){ const isCoastal =
COASTAL_DESTINATIONS.includes(dest.trim().toLowerCase()); return
isCoastal ? вЂIstorija, dobra hrana, more i nezaboravni doЕѕivljaji вЂ” a
sad je lakЕЎe nego ikad da sve to isplaniraЕЎ.вЂ™ : вЂIstorija, dobra hrana i
nezaboravni doЕѕivljaji вЂ” a sad je lakЕЎe nego ikad da sve to
isplaniraЕЎ.вЂ™; }

const PARTNERS = { flight: {provider:вЂkayakвЂ™, name:вЂKAYAKвЂ™}, hotel:
{provider:вЂbookingвЂ™, name:вЂBooking.comвЂ™}, car: {provider:вЂbookingвЂ™,
name:вЂBooking.comвЂ™}, activity: {provider:вЂviatorвЂ™, name:вЂViatorвЂ™}, esim:
{provider:вЂairaloвЂ™, name:вЂAiraloвЂ™}, insurance:
{provider:вЂworldnomadsвЂ™,name:вЂWorld NomadsвЂ™} };

/* вЂ”- Airalo prodaje eSIM po DRЕЅAVI, ne po gradu (npr.
airalo.com/greece-esim), dok Skoknica destinaciju vodi kao grad
(вЂњAtinaвЂќ). Mapiramo preko iste liste POPULAR_DESTINATIONS koja se veД‡
koristi za predloge gradova вЂ” svaki unos tamo ima вЂњextraвЂќ polje sa
nazivom drЕѕave na srpskom, koje ovde prevodimo u Airalo-ov URL slug
(engleski naziv drЕѕave, malim slovima, sa crticama). NAPOMENA: slug
format je potvrД‘en za par drЕѕava (italy-esim, greece-esim), ostatak je
najbolja moguД‡a pretpostavka po istoj ЕЎemi вЂ” pre pravog affiliate
ugovora vredi proveriti da li svaka od ovih stranica zaista postoji na
Airalo sajtu. вЂ”- */ const COUNTRY_SLUG_SR = { вЂSrbijaвЂ™:вЂserbiaвЂ™, вЂCrna
GoraвЂ™:вЂmontenegroвЂ™, вЂBosna i HercegovinaвЂ™:вЂbosnia-and-herzegovinaвЂ™,
вЂHrvatskaвЂ™:вЂcroatiaвЂ™, вЂSeverna MakedonijaвЂ™:вЂnorth-macedoniaвЂ™,
вЂKosovoвЂ™:вЂkosovoвЂ™, вЂSlovenijaвЂ™:вЂsloveniaвЂ™, вЂAlbanijaвЂ™:вЂalbaniaвЂ™,
вЂRumunijaвЂ™:вЂromaniaвЂ™, вЂBugarskaвЂ™:вЂbulgariaвЂ™, вЂGrДЌkaвЂ™:вЂgreeceвЂ™,
вЂItalijaвЂ™:вЂitalyвЂ™, вЂЕ panijaвЂ™:вЂspainвЂ™, вЂPortugalijaвЂ™:вЂportugalвЂ™,
вЂFrancuskaвЂ™:вЂfranceвЂ™, вЂVelika BritanijaвЂ™:вЂunited-kingdomвЂ™,
вЂHolandijaвЂ™:вЂnetherlandsвЂ™, вЂNemaДЌkaвЂ™:вЂgermanyвЂ™, вЂAustrijaвЂ™:вЂaustriaвЂ™,
вЂДЊeЕЎkaвЂ™:вЂczech-republicвЂ™, вЂMaД‘arskaвЂ™:вЂhungaryвЂ™, вЂSlovaДЌkaвЂ™:вЂslovakiaвЂ™,
вЂPoljskaвЂ™:вЂpolandвЂ™, вЂЕ vedskaвЂ™:вЂswedenвЂ™, вЂNorveЕЎkaвЂ™:вЂnorwayвЂ™,
вЂDanskaвЂ™:вЂdenmarkвЂ™, вЂFinskaвЂ™:вЂfinlandвЂ™, вЂIrskaвЂ™:вЂirelandвЂ™,
вЂBelgijaвЂ™:вЂbelgiumвЂ™, вЂЕ vajcarskaвЂ™:вЂswitzerlandвЂ™, вЂTurskaвЂ™:вЂturkeyвЂ™,
вЂIzraelвЂ™:вЂisraelвЂ™, вЂUAEвЂ™:вЂunited-arab-emiratesвЂ™, вЂEgipatвЂ™:вЂegyptвЂ™,
вЂMarokoвЂ™:вЂmoroccoвЂ™, вЂSADвЂ™:вЂunited-statesвЂ™, вЂTajlandвЂ™:вЂthailandвЂ™,
вЂJapanвЂ™:вЂjapanвЂ™, вЂIndonezijaвЂ™:вЂindonesiaвЂ™, вЂSingapurвЂ™:вЂsingaporeвЂ™ };
function airaloCountrySlug(destName){ const match =
POPULAR_DESTINATIONS.find(d => normalizeSr(d.name) ===
normalizeSr(destName)); if (!match) return null; return
COUNTRY_SLUG_SR[match.extra] || null; }

/* ========================================================== AFFILIATE
DEEP LINKS Builds a real search URL on the partnerвЂ™s own site,
pre-filled with destination/dates/passengers. No live pricing API is
called client-side вЂ” replace AFF_ID placeholders with real affiliate IDs
once each partner program is approved.
========================================================== */ const
AFF_ID = вЂSKOKNICAвЂ™; // TODO: replace per-partner with real
affiliate/tracking IDs

function buildAffiliateLink(kind, ctx){ const enc = encodeURIComponent;
const dest = enc(ctx.dest); switch(kind){ case вЂflightвЂ™: // Kayak
supports вЂњanywhere-вЂќ as an origin placeholder when no origin airport is
known. return
https://www.kayak.com/flights/anywhere-${dest}/${ctx.from}/${ctx.to}?adults=${ctx.adults}&sort=bestflight_a&ref=${AFF_ID};
case вЂhotelвЂ™: return
https://www.booking.com/searchresults.html?ss=${dest}&checkin=${ctx.from}&checkout=${ctx.to}&group_adults=${ctx.adults}&no_rooms=1&aid=${AFF_ID};
case вЂcarвЂ™: return
https://www.booking.com/cars/results.html?ss=${dest}&pickupDate=${ctx.from}&dropoffDate=${ctx.to}&aid=${AFF_ID};
case вЂactivityвЂ™: return
https://www.viator.com/searchResults/all?text=${dest}&pid=${AFF_ID};
case вЂesimвЂ™: { const slug = airaloCountrySlug(ctx.dest); // Ako ne
prepoznamo drЕѕavu iz grada, vodimo na opЕЎtu prodavnicu // (bolje nego
pogreЕЎan/nepostojeД‡i URL za drЕѕavu). return slug ?
https://www.airalo.com/${slug}-esim?ref=${AFF_ID} :
https://www.airalo.com/esim?ref=${AFF_ID}; } case вЂinsuranceвЂ™: // Za
razliku od ostalih partnera, World Nomads nema potvrД‘en javni // URL
ЕЎablon za deep-link sa unapred popunjenom destinacijom/datumima //
(proces dobijanja ponude ide kroz njihov sopstveni wizard, ne kroz //
query parametre na ovoj stranici) вЂ” zato vodi na opЕЎtu stranicu za //
ponudu, ne na neЕЎto specifiДЌno za ${ctx.dest}. Kad se prijava na
      // affiliate program (preko CJ mreЕѕe) odobri, ovaj URL treba zameniti
      // pravim CJ tracking linkom (obiДЌno na drugom domenu, ne worldnomads.com).
      // TODO takoД‘e: potvrditi da World Nomads uopЕЎte prodaje rezidentima Srbije
      // pre nego ЕЎto ovo ide u produkciju вЂ” nije potvrД‘eno u istraЕѕivanju.
      return `https://www.worldnomads.com/travel-insurance?ref=${AFF_ID}`;
} }

function fetchFlights(rng, dest, adults, tier){ const base = 60 +
Math.floor(rng()140); const tierMult = {budget:0.72, best:1,
comfort:1.55}[tier]; const price = Math.round(base tierMult * adults);
const p = PARTNERS.flight; const carriers = [вЂWizz AirвЂ™,вЂAir
SerbiaвЂ™,вЂRyanairвЂ™,вЂAegeanвЂ™,вЂLufthansaвЂ™]; return { provider:p.provider,
providerLabel:p.name, type:вЂflightвЂ™, name: (tier===вЂcomfortвЂ™ ?
carriers[carriers.length-1] :
carriers[Math.floor(rng()*carriers.length)]) + вЂ™ в†’ вЂ™ + dest, sub:
(tier===вЂcomfortвЂ™ ? вЂdirektan let, prtljag ukljuДЌenвЂ™ : (tier===вЂbudgetвЂ™
? вЂjedan presedanjeвЂ™ : вЂdirektan letвЂ™)) + (adults > 1 ? вЂ™ В· cena za svih
вЂ™ + adults + вЂ™ putnikaвЂ™ : вЂ™вЂ), price, currency:вЂ™EURвЂ™ }; } function
fetchHotel(rng, dest, nights, adults, tier){ const perNight =
{budget:32, best:71, comfort:138}[tier] + Math.floor(rng()24); const
price = Math.round(perNight nights * Math.ceil(adults/2)); const p =
PARTNERS.hotel; const ratings = {budget:7.6, best:8.7, comfort:9.3};
const names = { budget:[вЂHostel CentarвЂ™,вЂCity RoomsвЂ™,вЂStudio PlazaвЂ™],
best:[dest+вЂ™ HotelвЂ™, вЂAegean SuitesвЂ™, вЂOld Town ResidenceвЂ™],
comfort:[вЂGrandвЂ™+dest, вЂRoyal Palace HotelвЂ™, dest+вЂ™ Luxury CollectionвЂ™]
}; const arr = names[tier]; const rooms = Math.ceil(adults/2); return {
provider:p.provider, providerLabel:p.name, type:вЂhotelвЂ™, name:
arr[Math.floor(rng()*arr.length)], sub: nights+вЂ™ noД‡вЂ™ +
(nights===1?вЂ™вЂ:вЂ™iвЂ™) + вЂ™ В· ocena вЂ™ +
(ratings[tier]+rng()0.3).toFixed(1) + (rooms > 1 ? вЂ™ В· cena za вЂ™ +
rooms + вЂ™ sobeвЂ™ : вЂ™вЂ), price, currency:вЂ™EURвЂ™ }; } function fetchCar(rng,
days, tier){ if (tier===вЂbudgetвЂ™) return null; // budget package skips a
car, per the brief const perDay = {best:34, comfort:58}[tier] +
Math.floor(rng()12); const price = Math.round(perDay * days); const p =
PARTNERS.car; const models = {best:[вЂFiat 500вЂ™,вЂVW PoloвЂ™,вЂOpel CorsaвЂ™],
comfort:[вЂVW TiguanвЂ™,вЂAudi A4вЂ™,вЂVolvo XC40вЂ™]}; const arr = models[tier];
return { provider:p.provider, providerLabel:p.name, type:вЂcarвЂ™, name:
arr[Math.floor(rng()*arr.length)], sub: days+вЂ™ dana В· automatski/ruДЌni
menjaДЌвЂ™, price, currency:вЂEURвЂ™ }; } function fetchActivity(rng, dest,
tier){ const price = {budget:18, best:41, comfort:79}[tier] +
Math.floor(rng()*20); const p = PARTNERS.activity; const opts = {
budget:[вЂObilazak starog grada peЕЎkeвЂ™], best:[вЂPoludnevna tura s
vodiДЌemвЂ™,вЂUlaznica za glavne znamenitostiвЂ™], comfort:[вЂPrivatna tura s
vodiДЌemвЂ™,вЂGastronomska tura uz degustacijuвЂ™] }; const arr = opts[tier];
return { provider:p.provider, providerLabel:p.name, type:вЂactivityвЂ™,
name: arr[Math.floor(rng()*arr.length)] + вЂ™ вЂ” вЂ™ + dest, sub: вЂpo osobiвЂ™,
price, currency:вЂEURвЂ™ }; }

const EXTRA_COSTS = { best: {fuel:45, tolls:28, insurance:22, esim:12},
comfort: {fuel:58, tolls:34, insurance:34, esim:18}, budget: {fuel:0,
tolls:0, insurance:14, esim:8} };

/* ========================================================== PRICING +
SCORE ENGINE ==========================================================
*/ function buildPackage(rng, dest, nights, days, adults, tier, flags){
const flight = flags.flight ? fetchFlights(rng, dest, adults, tier) :
null; const hotel = flags.hotel ? fetchHotel(rng, dest, nights, adults,
tier) : null; const car = flags.car ? fetchCar(rng, days, tier) : null;
const activity = flags.activity ? fetchActivity(rng, dest, tier) : null;
const extras = EXTRA_COSTS[tier];

const fuel = (car && extras.fuel) ? extras.fuel : 0; const tolls = (car
&& extras.tolls) ? extras.tolls : 0; // Osiguranje i eSIM viЕЎe NISU deo
osnovne cene вЂ” to su dodaci na veД‡ // kupljenu uslugu, ne вЂњproizvodвЂќ
koji se pretraЕѕuje. Cena im je uvek // dostupna (da bi se prikazala uz
ДЌekboks u rezultatima), ali se ne // sabira u total dok ih korisnik
svesno ne ukljuДЌi (vidi toggleAddon). const insuranceCost =
extras.insurance; const esimCost = extras.esim;

const total = (flight?flight.price:0) + (hotel?hotel.price:0) +
(car?car.price:0) + (activity?activity.price:0) + fuel + tolls;

// Quality is a fixed, structural property of each tier (hotel rating,
// flight directness, car size) вЂ” it doesnвЂ™t depend on this runвЂ™s
prices. const qualityScore = {best:84, budget:58, comfort:97}[tier];

return {tier, flight, hotel, car, activity, fuel, tolls, insuranceCost,
esimCost, total, qualityScore}; }

const TIER_META = { best: {label:вЂBest ValueвЂ™, desc:вЂNajbolji odnos cene
i kvalitetaвЂ™}, comfort: {label:вЂComfortвЂ™, desc:вЂBolji hotel, direktan
let, prostraniji autoвЂ™}, budget: {label:вЂBudgetвЂ™, desc:вЂNajniЕѕa cena,
bez iznajmljivanja autaвЂ™} };

const ICONS = { flight: вЂвЂ™, hotel: вЂвЂ™, car: вЂвЂ™, activity: вЂвЂ™, fuel: вЂвЂ™,
tolls: вЂвЂ™, insurance: вЂвЂ™, esim: вЂвЂ™, calendar: вЂвЂ™, people: вЂвЂ™, check: вЂвЂ™,
extra: вЂвЂ™ }; function iconSvg(type){ return
вЂвЂ™+(ICONS[type]||ICONS.extra)+вЂвЂ™; }

/* ========================================================== STATE +
RENDER ========================================================== */
const state = { searches:0, clicks:0, revenue:0 };

function fmtEUR(n){ return вЂв‚¬вЂ™ + n.toLocaleString(вЂde-DEвЂ™); }

function attachAffiliateLinks(pkg, dest, from, to, adults){ const ctx =
{dest, from, to, adults}; if (pkg.flight) pkg.flight.bookUrl =
buildAffiliateLink(вЂflightвЂ™, ctx); if (pkg.hotel) pkg.hotel.bookUrl =
buildAffiliateLink(вЂhotelвЂ™, ctx); if (pkg.car) pkg.car.bookUrl =
buildAffiliateLink(вЂcarвЂ™, ctx); if (pkg.activity) pkg.activity.bookUrl =
buildAffiliateLink(вЂactivityвЂ™, ctx); // eSIM i osiguranje nisu
вЂњfetch-ovaneвЂќ stavke kao let/hotel/auto/aktivnost // (nemaju svoju cenu
sa partnerskog API-ja, cena im dolazi iz EXTRA_COSTS) вЂ” // ali dugme na
svakom dodatku i dalje treba pravi link ka partneru. pkg.esimBookUrl =
buildAffiliateLink(вЂesimвЂ™, ctx); pkg.insuranceBookUrl =
buildAffiliateLink(вЂinsuranceвЂ™, ctx); }

/* ========================================================== API FEED вЂ”
poziv ka backendu (server/src/routes/search.js). Ako backend nije
upaljen (nema hostinga jos, radi se lokalno bez servera, ili je pao),
automatski se vraca na stari lokalni mock вЂ” sajt NIKAD ne sme da ostane
bez rezultata korisniku.
========================================================== */ // Postavi
ovo na URL svog backenda kad ga deploy-ujes, npr: //
window.SKOKNICA_API_BASE = вЂhttps://api.skoknica.rsвЂ™; const API_BASE =
window.SKOKNICA_API_BASE || вЂ™вЂ™;

/* вЂ”- Autocomplete destinacije: prvo /api/locations (ako je backend
podeЕЎen), a ako nema backend-a (ili poziv ne uspe) вЂ” Open-Meteo
geokodiranje, isti javni API bez kljuДЌa koji se veД‡ koristi za vremensku
prognozu. вЂ”- / / вЂ”- Poznati gradovi/prestonice/turistiДЌka mesta вЂ” ovo je
uvek prvi izvor predloga, jer Open-Meteo geokoding ume da vrati
nepoznata mesta umesto oДЌiglednih (npr. selo umesto prestonice), i loЕЎe
вЂњpogaД‘aвЂќ kad se kuca bez kvaДЌica (c/s/z umesto ДЌ/ЕЎ/Еѕ). Tek ako ovde nema
dovoljno pogodaka, dopunjuje se sa Open-Meteo. вЂ”- */ const
POPULAR_DESTINATIONS = [ // Srbija {name:вЂBeogradвЂ™, extra:вЂSrbijaвЂ™},
{name:вЂNovi SadвЂ™, extra:вЂSrbijaвЂ™}, {name:вЂNiЕЎвЂ™, extra:вЂSrbijaвЂ™},
{name:вЂKragujevacвЂ™, extra:вЂSrbijaвЂ™}, {name:вЂSuboticaвЂ™, extra:вЂSrbijaвЂ™},
{name:вЂZlatiborвЂ™, extra:вЂSrbijaвЂ™}, {name:вЂKopaonikвЂ™, extra:вЂSrbijaвЂ™},
{name:вЂVrnjaДЌka BanjaвЂ™, extra:вЂSrbijaвЂ™}, // Region {name:вЂPodgoricaвЂ™,
extra:вЂCrna GoraвЂ™}, {name:вЂBudvaвЂ™, extra:вЂCrna GoraвЂ™}, {name:вЂKotorвЂ™,
extra:вЂCrna GoraвЂ™}, {name:вЂHerceg NoviвЂ™, extra:вЂCrna GoraвЂ™},
{name:вЂIgaloвЂ™, extra:вЂCrna GoraвЂ™}, {name:вЂBarвЂ™, extra:вЂCrna GoraвЂ™},
{name:вЂTivatвЂ™, extra:вЂCrna GoraвЂ™}, {name:вЂPetrovacвЂ™, extra:вЂCrna GoraвЂ™},
{name:вЂSutomoreвЂ™, extra:вЂCrna GoraвЂ™}, {name:вЂUlcinjвЂ™, extra:вЂCrna
GoraвЂ™}, {name:вЂPerastвЂ™, extra:вЂCrna GoraвЂ™}, {name:вЂRisanвЂ™, extra:вЂCrna
GoraвЂ™}, {name:вЂSarajevoвЂ™, extra:вЂBosna i HercegovinaвЂ™}, {name:вЂMostarвЂ™,
extra:вЂBosna i HercegovinaвЂ™}, {name:вЂBanja LukaвЂ™, extra:вЂBosna i
HercegovinaвЂ™}, {name:вЂZagrebвЂ™, extra:вЂHrvatskaвЂ™}, {name:вЂSplitвЂ™,
extra:вЂHrvatskaвЂ™}, {name:вЂDubrovnikвЂ™, extra:вЂHrvatskaвЂ™}, {name:вЂZadarвЂ™,
extra:вЂHrvatskaвЂ™}, {name:вЂRijekaвЂ™, extra:вЂHrvatskaвЂ™}, {name:вЂPulaвЂ™,
extra:вЂHrvatskaвЂ™}, {name:вЂHvarвЂ™, extra:вЂHrvatskaвЂ™}, {name:вЂMakarskaвЂ™,
extra:вЂHrvatskaвЂ™}, {name:вЂTrogirвЂ™, extra:вЂHrvatskaвЂ™}, {name:вЂЕ ibenikвЂ™,
extra:вЂHrvatskaвЂ™}, {name:вЂRovinjвЂ™, extra:вЂHrvatskaвЂ™}, {name:вЂSkopljeвЂ™,
extra:вЂSeverna MakedonijaвЂ™}, {name:вЂOhridвЂ™, extra:вЂSeverna MakedonijaвЂ™},
{name:вЂPriЕЎtinaвЂ™, extra:вЂKosovoвЂ™}, {name:вЂLjubljanaвЂ™,
extra:вЂSlovenijaвЂ™}, {name:вЂBledвЂ™, extra:вЂSlovenijaвЂ™}, {name:вЂPiranвЂ™,
extra:вЂSlovenijaвЂ™}, {name:вЂTiranaвЂ™, extra:вЂAlbanijaвЂ™}, {name:вЂSarandeвЂ™,
extra:вЂAlbanijaвЂ™}, {name:вЂBukureЕЎtвЂ™, extra:вЂRumunijaвЂ™}, {name:вЂSofijaвЂ™,
extra:вЂBugarskaвЂ™}, {name:вЂVarnaвЂ™, extra:вЂBugarskaвЂ™}, {name:вЂBurgasвЂ™,
extra:вЂBugarskaвЂ™}, // GrДЌka i Egej {name:вЂAtinaвЂ™, extra:вЂGrДЌkaвЂ™},
{name:вЂSolunвЂ™, extra:вЂGrДЌkaвЂ™}, {name:вЂKrfвЂ™, extra:вЂGrДЌkaвЂ™},
{name:вЂSantoriniвЂ™, extra:вЂGrДЌkaвЂ™}, {name:вЂMikonosвЂ™, extra:вЂGrДЌkaвЂ™},
{name:вЂRodosвЂ™, extra:вЂGrДЌkaвЂ™}, {name:вЂKritвЂ™, extra:вЂGrДЌkaвЂ™},
{name:вЂHalkidikiвЂ™, extra:вЂGrДЌkaвЂ™}, // Italija {name:вЂRimвЂ™,
extra:вЂItalijaвЂ™}, {name:вЂMilanoвЂ™, extra:вЂItalijaвЂ™}, {name:вЂNapuljвЂ™,
extra:вЂItalijaвЂ™}, {name:вЂVenecijaвЂ™, extra:вЂItalijaвЂ™}, {name:вЂFirencaвЂ™,
extra:вЂItalijaвЂ™}, {name:вЂBolonjaвЂ™, extra:вЂItalijaвЂ™}, {name:вЂVeronaвЂ™,
extra:вЂItalijaвЂ™}, {name:вЂTorinoвЂ™, extra:вЂItalijaвЂ™}, {name:вЂBariвЂ™,
extra:вЂItalijaвЂ™}, {name:вЂSicilijaвЂ™, extra:вЂItalijaвЂ™}, // Е panija i
Portugal {name:вЂBarselonaвЂ™, extra:вЂЕ panijaвЂ™}, {name:вЂMadridвЂ™,
extra:вЂЕ panijaвЂ™}, {name:вЂValensijaвЂ™, extra:вЂЕ panijaвЂ™}, {name:вЂMalagaвЂ™,
extra:вЂЕ panijaвЂ™}, {name:вЂIbicaвЂ™, extra:вЂЕ panijaвЂ™}, {name:вЂMajorkaвЂ™,
extra:вЂЕ panijaвЂ™}, {name:вЂSeviljaвЂ™, extra:вЂЕ panijaвЂ™}, {name:вЂLisabonвЂ™,
extra:вЂPortugalijaвЂ™}, {name:вЂPortoвЂ™, extra:вЂPortugalijaвЂ™}, {name:вЂFaroвЂ™,
extra:вЂPortugalijaвЂ™}, // Zapadna/Severna Evropa {name:вЂParizвЂ™,
extra:вЂFrancuskaвЂ™}, {name:вЂNicaвЂ™, extra:вЂFrancuskaвЂ™}, {name:вЂLionвЂ™,
extra:вЂFrancuskaвЂ™}, {name:вЂLondonвЂ™, extra:вЂVelika BritanijaвЂ™},
{name:вЂEdinburgвЂ™, extra:вЂVelika BritanijaвЂ™}, {name:вЂAmsterdamвЂ™,
extra:вЂHolandijaвЂ™}, {name:вЂRoterdamвЂ™, extra:вЂHolandijaвЂ™},
{name:вЂBerlinвЂ™, extra:вЂNemaДЌkaвЂ™}, {name:вЂMinhenвЂ™, extra:вЂNemaДЌkaвЂ™},
{name:вЂHamburgвЂ™, extra:вЂNemaДЌkaвЂ™}, {name:вЂFrankfurtвЂ™, extra:вЂNemaДЌkaвЂ™},
{name:вЂBeДЌвЂ™, extra:вЂAustrijaвЂ™}, {name:вЂZalcburgвЂ™, extra:вЂAustrijaвЂ™},
{name:вЂInsbrukвЂ™, extra:вЂAustrijaвЂ™}, {name:вЂPragвЂ™, extra:вЂДЊeЕЎkaвЂ™},
{name:вЂBudimpeЕЎtaвЂ™, extra:вЂMaД‘arskaвЂ™}, {name:вЂBratislavaвЂ™,
extra:вЂSlovaДЌkaвЂ™}, {name:вЂVarЕЎavaвЂ™, extra:вЂPoljskaвЂ™}, {name:вЂKrakovвЂ™,
extra:вЂPoljskaвЂ™}, {name:вЂStokholmвЂ™, extra:вЂЕ vedskaвЂ™}, {name:вЂOsloвЂ™,
extra:вЂNorveЕЎkaвЂ™}, {name:вЂKopenhagenвЂ™, extra:вЂDanskaвЂ™},
{name:вЂHelsinkiвЂ™, extra:вЂFinskaвЂ™}, {name:вЂDablinвЂ™, extra:вЂIrskaвЂ™},
{name:вЂBriselвЂ™, extra:вЂBelgijaвЂ™}, {name:вЂCirihвЂ™, extra:вЂЕ vajcarskaвЂ™},
{name:вЂЕЅenevaвЂ™, extra:вЂЕ vajcarskaвЂ™}, // Turska, Bliski istok, sever
Afrike {name:вЂIstanbulвЂ™, extra:вЂTurskaвЂ™}, {name:вЂAntalijaвЂ™,
extra:вЂTurskaвЂ™}, {name:вЂBodrumвЂ™, extra:вЂTurskaвЂ™}, {name:вЂKapadokijaвЂ™,
extra:вЂTurskaвЂ™}, {name:вЂTel AvivвЂ™, extra:вЂIzraelвЂ™}, {name:вЂDubaiвЂ™,
extra:вЂUAEвЂ™}, {name:вЂAbu DabiвЂ™, extra:вЂUAEвЂ™}, {name:вЂKairoвЂ™,
extra:вЂEgipatвЂ™}, {name:вЂЕ arm El Е eikвЂ™, extra:вЂEgipatвЂ™}, {name:вЂHurgadaвЂ™,
extra:вЂEgipatвЂ™}, {name:вЂMarakeЕЎвЂ™, extra:вЂMarokoвЂ™}, // Amerika i Azija
(najtraЕѕeniji daleki gradovi) {name:вЂNjujorkвЂ™, extra:вЂSADвЂ™},
{name:вЂMajamiвЂ™, extra:вЂSADвЂ™}, {name:вЂLos AnД‘elesвЂ™, extra:вЂSADвЂ™},
{name:вЂBangkokвЂ™, extra:вЂTajlandвЂ™}, {name:вЂTokioвЂ™, extra:вЂJapanвЂ™},
{name:вЂBaliвЂ™, extra:вЂIndonezijaвЂ™}, {name:вЂSingapurвЂ™,
extra:вЂSingapurвЂ™},]; // Uklanja srpske kvaДЌice (ДЌ/Д‡/ЕЎ/Еѕ/Д‘) i standardne
akcente, radi poreД‘enja bez // obzira da li korisnik kuca sa ili bez
njih (npr. вЂњKotorвЂќ vs вЂњBeДЌвЂќ/вЂњBecвЂќ). function normalizeSr(str){ return
String(str) .replace(/Д‘/g, вЂdjвЂ™).replace(/Дђ/g, вЂDjвЂ™)
.normalize(вЂNFDвЂ™).replace(/[300-36f]/g, вЂ™вЂ) .toLowerCase(); } function
matchPopularDestinations(query){ const q = normalizeSr(query); const
scored = POPULAR_DESTINATIONS.map(d => { const name =
normalizeSr(d.name); const extra = normalizeSr(d.extra ||вЂ™вЂ™); let score;
if (name === q) score = 0; else if (name.startsWith(q)) score = 1; else
if (name.includes(q)) score = 2; else if (extra.startsWith(q)) score =
3; else if (extra.includes(q)) score = 4; else score = null; return {d,
score}; }).filter(x => x.score !== null); scored.sort((a, b) =>
a.score - b.score); return scored.map(x => x.d); }

let _destSuggestTimer = null; let _originSuggestTimer = null; async
function fetchLocationSuggestions(q, datalistId){ const query =
q.trim(); const inputEl =
document.querySelector(input[list="${datalistId}"]); const stubEl =
inputEl ? inputEl.closest(вЂ.stubвЂ™) : null; if (query.length < 2){
renderLocationSuggestions([], datalistId); if (stubEl)
stubEl.classList.remove(вЂis-loadingвЂ™); return; } if (stubEl)
stubEl.classList.add(вЂis-loadingвЂ™);

try { const combined = []; const seen = new Set(); function addAll(arr){
for (const r of arr){ const key = r.name.toLowerCase(); if
(seen.has(key)) continue; seen.add(key); combined.push(r); } }

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

} finally { if (stubEl) stubEl.classList.remove(вЂis-loadingвЂ™); } }
function renderLocationSuggestions(results, datalistId){ const list =
document.getElementById(datalistId); if (!list) return; if
(!results.length){ list.innerHTML = вЂ™вЂ; return; } const seen = new
Set(); // izbegava duplikate istog naziva grada list.innerHTML =
results.filter(r => { const key = r.name.toLowerCase(); if
(seen.has(key)) return false; seen.add(key); return true; }).map(r =>
<option value="${escapeHtml(r.name)}">${escapeHtml(r.name)}${r.extra ? ' вЂ” ' + escapeHtml(r.extra) : ''}</option>).join(вЂ™вЂ);
} function markStubLoading(inputEl, q){ const stubEl =
inputEl.closest(вЂ™.stubвЂ™); if (!stubEl) return; // Upali spinner odmah na
kucanje (ne ДЌekaj debounce) вЂ” inaДЌe 300ms // pre samog fetch-a polje
izgleda mirno/prazno, kao da neЕЎto ne radi.
stubEl.classList.toggle(вЂis-loadingвЂ™, q.trim().length >= 2); }
document.getElementById(вЂdestвЂ™).addEventListener(вЂinputвЂ™, (e)=>{
clearTimeout(_destSuggestTimer); const q = e.target.value;
markStubLoading(e.target, q); _destSuggestTimer = setTimeout(()=>
fetchLocationSuggestions(q, вЂdestSuggestionsвЂ™), 300); });
document.getElementById(вЂoriginвЂ™).addEventListener(вЂinputвЂ™, (e)=>{
clearTimeout(_originSuggestTimer); const q = e.target.value;
markStubLoading(e.target, q); _originSuggestTimer = setTimeout(()=>
fetchLocationSuggestions(q, вЂoriginSuggestionsвЂ™), 300); });

function escapeHtml(str){ return String(str)
.replace(/&/g,вЂ&вЂ™).replace(/</g,вЂ<вЂ™).replace(/>/g,вЂ>вЂ™)
.replace(/вЂњ/g,вЂ"вЂ™).replace(/вЂ/g,вЂ™'вЂ™); }

async function fetchPackagesFromBackend(payload){ if (!API_BASE) return
null; // backend jos nije deploy-ovan вЂ” nema smisla ni pokusavati try {
const res = await fetch(API_BASE + вЂ/api/searchвЂ™, { method:вЂPOSTвЂ™,
headers:{вЂContent-TypeвЂ™:вЂapplication/jsonвЂ™}, body:
JSON.stringify(payload) }); if (!res.ok) throw new Error(вЂHTTPвЂ™ +
res.status); const json = await res.json(); return json.packages; }
catch(err){ console.warn(вЂ[skoknica] backend nedostupan, koristim
lokalni mock:вЂ™, err.message); return null; } }

function computePackagesLocally(dest, from, to, nights, days, adults,
flags){ const seed =
hashSeed(dest.toLowerCase()+dest.length+nights+adults); const rng =
seededRandom(seed);

const pkgs = [вЂbestвЂ™,вЂcomfortвЂ™,вЂbudgetвЂ™].map(t => buildPackage(rng,
dest, nights, days, adults, t, flags)); pkgs.forEach(p =>
attachAffiliateLinks(p, dest, from, to, adults));

// Price score is relative to the cheapest of THIS runвЂ™s three packages
вЂ” // the cheapest always scores highest on price, others drop off the
more // expensive they are. Combined with the fixed quality score, this
decides // which package actually gets the вЂњPreporuДЌenoвЂќ badge (not just
whichever // tier is named вЂњBest ValueвЂќ). const minTotal =
Math.min(вЂ¦pkgs.map(p => p.total)); pkgs.forEach(p => { const
overCheapest = (p.total - minTotal) / minTotal; p.priceScore =
Math.max(40, Math.round(96 - overCheapest * 140)); p.score =
Math.round(p.priceScore * 0.55 + p.qualityScore * 0.45); });
pkgs.sort((a, b) => b.score - a.score); pkgs.forEach((p, i) => {
p.recommended = (i === 0); }); return pkgs; }

/* ========================================================== вЂњIZNENADI
MEвЂќ вЂ” pretraga samo po budЕѕetu, bez destinacije. Korisnik unese samo
iznos; sajt proba svih ~100 gradova iz POPULAR_DESTINATIONS na вЂbestвЂ™
tieru (isti flagovi kao u glavnoj formi) i vrati 3 nasumiДЌne koje se
uklapaju u budЕѕet.

Namerno koristi ISTI seed kao computePackagesLocally za вЂbestвЂ™ tier
(hashSeed(dest+dest.length+nights+adults), pa rng potroЕЎen redom
best->comfort->budget) вЂ” cena koju вЂњIznenadi meвЂќ pokaЕѕe za neki grad je
BIT-ZA-BIT ista kao kad bi korisnik taj grad ukucao ruДЌno u glavnu
pretragu. Nema dupliranja logike, samo poziva buildPackage direktno za
jedan tier umesto sva tri.
========================================================== */ function
computeSurpriseCandidates(from, to, adults, flags){ const nights =
nightsBetween(from, to); const days = nights; return
POPULAR_DESTINATIONS.map(d => { const seed =
hashSeed(d.name.toLowerCase()+d.name.length+nights+adults); const rng =
seededRandom(seed); const pkg = buildPackage(rng, d.name, nights, days,
adults, вЂbestвЂ™, flags); attachAffiliateLinks(pkg, d.name, from, to,
adults); return {dest:d.name, country:d.extra||вЂ™вЂ™, pkg}; }); }

// Bira 3 grada. Ako manje od 3 uopЕЎte stane u budЕѕet, umesto da vrati
// prazno (razoДЌaravajuД‡e), vraД‡a 3 NAJJEFTINIJE opcije uz jasnu
napomenu вЂ” // sajt nikad ne sme da ostavi korisnika bez ijednog
predloga. function pickSurpriseDestinations(budget, candidates, count){
const fitting = candidates.filter(c => c.pkg.total <= budget); const
usedFallback = fitting.length < count; const pool = usedFallback ?
candidates.slice().sort((a,b)=>a.pkg.total-b.pkg.total).slice(0,
Math.max(count*3, count)) : fitting;

// ObiДЌno (Fisher-Yates) meЕЎanje вЂ” namerno NIJE seed-ovano kao ostatak
// cenovne logike, jer ovde Еѕelimo da svaki klik na вЂњProbaj ponovoвЂќ da
// drugaДЌiju trojku. Cena svakog grada ostaje deterministiДЌka, samo je
// IZBOR koja 3 grada se prikazuju nasumiДЌan. const shuffled =
pool.slice(); for (let i = shuffled.length - 1; i > 0; iвЂ“){ const j =
Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] =
[shuffled[j], shuffled[i]]; } return {picks: shuffled.slice(0, count),
usedFallback}; }

async function renderResults(dest, from, to, nights, days, adults,
flags, originCode){ const backendPkgs = await fetchPackagesFromBackend({
dest, from, to, adults, originCode, flags }); const pkgs = backendPkgs
|| computePackagesLocally(dest, from, to, nights, days, adults, flags);

// Global kontekst za вЂњSaДЌuvaj ovu ponuduвЂќ dugme na svakoj kartici вЂ” //
isti obrazac kao window._lastBuilderPkg za builder.
window._lastSearchPkgs = pkgs; window._lastSearchCtx = {dest, from, to,
adults};

document.getElementById(вЂctaTitleвЂ™).textContent = dest + вЂ™ te ДЌeka.вЂ™;
document.getElementById(вЂctaDescвЂ™).textContent = ctaCopy(dest);

// Airalo (eSIM) se dodaje ruДЌno jer nije вЂњfetch-ovanaвЂќ stavka kao
ostali // partneri (nema svoju cenu sa API-ja) вЂ” ali je i dalje pravi
partner // sa affiliate linkom, pa treba da stoji u napomeni ispod
paketa. const providers = [вЂ¦new
Set(pkgs.flatMap(p=>[p.flight,p.hotel,p.car,p.activity].filter(Boolean).map(i=>i.providerLabel)))].concat(вЂAiraloвЂ™);

const head = document.getElementById(вЂresultsHeadвЂ™); head.innerHTML =
<div class="status-banner">       <div class="status-left">         <div class="status-check">${iconSvg('check')}</div>         <div><h3>Tvoje putovanje je spremno.</h3><p>Evo 3 paЕѕljivo odabrane kombinacije za tvoj trip u ${escapeHtml(dest)}.</p></div>       </div>       <div class="status-pills">         <div class="pill">${iconSvg('calendar')} ${fmtDate(from)} вЂ“ ${fmtDate(to)}</div>         <div class="pill">${iconSvg('people')} ${adults} ${passengerLabel(adults)}</div>       </div>     </div>;

const body = document.getElementById(вЂresultsBodyвЂ™); body.innerHTML =
<div class="packages">${pkgs.map(pkgHtml).join('')}</div>     <p class="disclaimer">вљ пёЏ Skoknica je trenutno u razvoju вЂ” prikazane cene su ilustrativan primer, generisan lokalno radi demonstracije, i <strong>nisu preuzete uЕѕivo</strong> sa partnerskih sajtova. Za stvarnu cenu i dostupnost proveri direktno na sajtu partnera (${providers.join(', ')}) pre rezervacije.</p>;
}

function itemCardHtml(item, kind){ if (!item) return вЂ™вЂ; const labels =
{flight:вЂ™LetвЂ™, hotel:вЂHotelвЂ™, car:вЂAutoвЂ™}; const btnLabel =
{flight:t(вЂbtn_search_kayakвЂ™), hotel:t(вЂbtn_book_bookingвЂ™),
car:t(вЂbtn_book_bookingвЂ™)}; return
<div class="item-card ${kind}">     <div class="item-photo ${kind}">${iconSvg(kind)}</div>     <div class="item-body">       <div class="item-label">${labels[kind]}${item.providerLabel!=='Skoknica' ?${escapeHtml(item.providerLabel)}</span>` : ''}</div>
      <div class="item-name">${escapeHtml(item.name)}
      <div class="item-sub">${escapeHtml(item.sub)}</div>
      <div class="item-price tabular">${fmtEUR(item.price)}</div>
      <button class="item-btn ${kind}" data-kind="${kind}" data-price="${item.price}" data-url="${escapeHtml(item.bookUrl||'')}" onclick="bookItem(this)">${btnLabel[kind]}</button>
    </div>

`; }

function pkgHtml(pkg){ const meta = TIER_META[pkg.tier]; const featured
= pkg.recommended; const itemsRow = [ itemCardHtml(pkg.flight,вЂflightвЂ™),
itemCardHtml(pkg.hotel,вЂhotelвЂ™), itemCardHtml(pkg.car,вЂcarвЂ™)
].filter(Boolean).join(вЂ™вЂ™);

return
<div class="pkg ${pkg.tier} ${featured?'featured':''}" data-base-total="${pkg.total}">     <div class="pkg-head">       <div>         ${featured ?в…
PreporuДЌeno: ''}         <h3>${meta.label}</h3>         <div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;">${meta.desc}</div>       </div>       <div class="pkg-total">         <div class="num tabular">${fmtEUR(pkg.total)}</div>         <div class="cur">ukupno</div>         <div class="hint">zbir odvojenih rezervacija, ne jedno plaД‡anje</div>       </div>     </div>     <div class="pkg-score">       <span><strong style="color:var(--ink);font-weight:600;">Skor ${pkg.score}/100</strong> вЂ” odnos cene i kvaliteta</span>     </div>     ${itemsRow ?

${itemsRow}

: ''}     ${(() => {       const extraTiles = [         pkg.activity ?

${iconSvg('activity')}<div><div class="lab">${escapeHtml(pkg.activity.name.split(вЂ™
вЂ” вЂ™)[0])}

${fmtEUR(pkg.activity.price)}</div></div><button class="extra-btn" data-kind="activity" data-price="${pkg.activity.price}вЂќ
data-url=вЂњ${escapeHtml(pkg.activity.bookUrl||'')}" onclick="bookItem(this)">Viator</button></div>` : '',
        pkg.car ? `<div class="extra fuel-extra">${iconSvg(вЂfuelвЂ™)}

${t('fuel_estimate')}</div><div class="val tabular">${fmtEUR(pkg.fuel)}

: '',         pkg.car ?

${iconSvg('tolls')}<div><div class="lab">${t(вЂtolls_estimateвЂ™)}

${fmtEUR(pkg.tolls)}</div></div></div>` : '',
        `<label class="extra insurance-extra addon-extra">${iconSvg(вЂinsuranceвЂ™)}

${t('insurance')}</div><div class="val tabular">+${fmtEUR(pkg.insuranceCost)}

,

${iconSvg('esim')}<div><div class="lab">${t(вЂesim_internetвЂ™)}

+${fmtEUR(pkg.esimCost)}</div></div></label><button type="button" class="extra-btn" data-kind="esim" data-price="${pkg.esimCost}вЂќ
data-url=вЂњ${escapeHtml(pkg.esimBookUrl||'')}" onclick="bookItem(this)">Airalo</button></div>`
      ].filter(Boolean).join('');
      return extraTiles ? `<div class="extras-row">${extraTiles}

: '';     })()}     <div class="confirm-banner">       <span>${iconSvg('check')} ${t('base_package_note')}</span>       <span><span class="amt-lab">Ukupno:</span><span class="amt tabular">${fmtEUR(pkg.total)}</span></span>     </div>     <button type="button" class="pkg-save-btn" onclick="saveSearchPackage('${pkg.tier}')">       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>       SaДЌuvaj ovu ponudu     </button>     <button type="button" class="pkg-alert-btn" onclick="openAlertModal('search', '${pkg.tier}', ${pkg.total})">       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 3a5 5 0 00-5 5v3.2c0 .9-.35 1.75-.98 2.4L4.6 15h14.8l-1.42-1.4a3.4 3.4 0 01-.98-2.4V8a5 5 0 00-5-5z"/><path d="M9.5 19a2.6 2.6 0 005 0"/></svg>       Javi mi kad padne cena     </button>   </div>;
}

/* ========================================================== Prikaz
rezultata za вЂњIznenadi meвЂќ вЂ” 3 RAZLIДЊITE destinacije (uvek вЂbestвЂ™ tier)
umesto 3 tier-a ISTE destinacije. Deli #resultsHead/#resultsBody sa
obiДЌnom pretragom (isti kontejner), samo drugaДЌiji sadrЕѕaj.
========================================================== */ function
surprisePkgHtml(pick, idx, budget){ const {dest, country, pkg} = pick;
const itemsRow = [ itemCardHtml(pkg.flight,вЂflightвЂ™),
itemCardHtml(pkg.hotel,вЂhotelвЂ™), itemCardHtml(pkg.car,вЂcarвЂ™)
].filter(Boolean).join(вЂ™вЂ™); const fits = pkg.total <= budget;

return
<div class="pkg surprise-pkg" data-base-total="${pkg.total}">     <div class="pkg-head">       <div>         <span class="pkg-badge surprise-badge">рџЋІ Predlog</span>         <h3>${escapeHtml(dest)}</h3>         <div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;">${escapeHtml(country)} В· Best Value</div>       </div>       <div class="pkg-total">         <div class="num tabular">${fmtEUR(pkg.total)}</div>         <div class="cur">ukupno</div>         <div class="hint">zbir odvojenih rezervacija, ne jedno plaД‡anje</div>       </div>     </div>     ${itemsRow ?

${itemsRow}</div>` : ''}
    <div class="confirm-banner">
      <span>${iconSvg(вЂcheckвЂ™)}
${fits ? t('fits_budget') + fmtEUR(budget) + '.' : t('over_budget')}</span>
      <span><span class="amt-lab">Ukupno:</span><span class="amt tabular">${fmtEUR(pkg.total)}

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

`; }

function renderSurpriseResults(picks, ctxBase, budget, usedFallback){
window._lastSurprisePicks = picks; window._lastSurpriseCtx = ctxBase;

const head = document.getElementById(вЂresultsHeadвЂ™); head.innerHTML =
<div class="status-banner">       <div class="status-left">         <div class="status-check">рџЋІ</div>         <div><h3>3 predloga za budЕѕet od ${fmtEUR(budget)}.</h3><p>${usedFallback ? 'Nijedan grad se u potpunosti nije uklopio u budЕѕet вЂ” evo 3 najjeftinije opcije koje imamo.' : 'NasumiДЌno odabrano od preko 100 gradova koji se uklapaju u tvoj budЕѕet.'}</p></div>       </div>       <div class="status-pills">         <div class="pill">${iconSvg('calendar')} ${fmtDate(ctxBase.from)} вЂ“ ${fmtDate(ctxBase.to)}</div>         <div class="pill">${iconSvg('people')} ${ctxBase.adults} ${passengerLabel(ctxBase.adults)}</div>       </div>     </div>;

const body = document.getElementById(вЂresultsBodyвЂ™); body.innerHTML =
<div class="packages">${picks.map((p,i)=>surprisePkgHtml(p, i, budget)).join('')}</div>     <button type="button" class="btn-alert surprise-reroll-btn" onclick="runSurpriseSearch(true)">рџЋІ Probaj druga 3 predloga</button>     <p class="disclaimer">вљ пёЏ Skoknica je trenutno u razvoju вЂ” prikazane cene su ilustrativan primer, generisan lokalno radi demonstracije, i <strong>nisu preuzete uЕѕivo</strong> sa partnerskih sajtova.</p>;
}

async function runSurpriseSearch(isReroll){ const budget =
Number(document.getElementById(вЂsurpriseBudgetвЂ™).value); if (!budget ||
budget <= 0){ showToast(вЂUnesi budЕѕet veД‡i od 0.вЂ™); return; }

const from = document.getElementById(вЂdateFromвЂ™).value; const to =
document.getElementById(вЂdateToвЂ™).value; const adults =
document.getElementById(вЂadultsвЂ™).value; const flags = { flight:
document.querySelector(вЂ.toggle[data-t=вЂњflightвЂќ]вЂ™).classList.contains(вЂonвЂ™),
hotel:
document.querySelector(вЂ.toggle[data-t=вЂњhotelвЂќ]вЂ™).classList.contains(вЂonвЂ™),
car:
document.querySelector(вЂ.toggle[data-t=вЂњcarвЂќ]вЂ™).classList.contains(вЂonвЂ™),
activity:
document.querySelector(вЂ.toggle[data-t=вЂњactivityвЂќ]вЂ™).classList.contains(вЂonвЂ™),
};

if (!isReroll) closeSurpriseModal();

const results = document.getElementById(вЂresultsвЂ™);
results.classList.add(вЂvisibleвЂ™); if (!isReroll){
document.getElementById(вЂresultsHeadвЂ™).innerHTML = вЂ™вЂ;
document.getElementById(вЂ™resultsBodyвЂ™).innerHTML = вЂ™

вЂ™ + (getLang()===вЂenвЂ™ ? вЂSearching 3 destinations that fit your budgetвЂ¦вЂ™
: вЂTraЕѕimo 3 destinacije koje se uklapaju u tvoj budЕѕetвЂ¦вЂ™) + вЂ™

вЂ; results.scrollIntoView({behavior:вЂ™smoothвЂ™, block:вЂstartвЂ™}); }

state.searches += 1; document.getElementById(вЂstatLastвЂ™).textContent =
вЂрџЋІвЂ™ + fmtEUR(budget); updateStats();

setTimeout(()=>{ const candidates = computeSurpriseCandidates(from, to,
adults, flags); const {picks, usedFallback} =
pickSurpriseDestinations(budget, candidates, 3);
renderSurpriseResults(picks, {from, to, adults}, budget, usedFallback);
}, isReroll ? 0 : 700); }

// Klik na вЂњVidi sve opcije za {grad}вЂќ вЂ” prebacuje na normalnu pretragu
// (sva 3 tier-a) za taj konkretni grad, umesto samo вЂbestвЂ™ predloga.
function exploreSurpriseDestination(idx){ const pick =
(window._lastSurprisePicks || [])[idx]; if (!pick) return;
document.getElementById(вЂdestвЂ™).value = pick.dest; runSearch(true); }

async function saveSurprisePackage(idx){ const user = await
getCurrentUser(); if (!user){ _authBarExpanded = true;
renderSavedTrips();
document.getElementById(вЂauthBarвЂ™).scrollIntoView({behavior:вЂsmoothвЂ™,
block:вЂcenterвЂ™}); showToast(вЂPrijavi se emailom da saДЌuvaЕЎ ponudu.вЂ™);
return; } const pick = (window._lastSurprisePicks || [])[idx]; const ctx
= window._lastSurpriseCtx; if (!pick || !ctx){ showToast(вЂPonuda viЕЎe
nije dostupna вЂ” probaj ponovo.вЂ™); return; }

const summaryTags = [ вЂрџЋІ Iznenadi meвЂ™, pick.pkg.flight ?
pick.pkg.flight.name : вЂBez letaвЂ™, pick.pkg.hotel ? pick.pkg.hotel.name
: вЂBez hotelaвЂ™, pick.pkg.car ? вЂSa automвЂ™ : вЂBez autaвЂ™ ];

const { error } = await sb.from(вЂtripsвЂ™).insert({ user_id: user.id,
dest: pick.dest, date_from: ctx.from, date_to: ctx.to, adults:
Number(ctx.adults), selection: {kind:вЂsearchвЂ™, tier:вЂbestвЂ™,
tierLabel:вЂBest Value (Iznenadi me)вЂ™, summaryTags}, total:
pick.pkg.total }); if (error){ showToast(вЂGreЕЎka pri ДЌuvanju:вЂ™ +
error.message); return; } renderSavedTrips(); showToast(pick.dest + вЂ™
saДЌuvan (вЂ™ + fmtEUR(pick.pkg.total) + вЂ).вЂ™); }

function openSurpriseModal(){
document.getElementById(вЂsurpriseBudgetвЂ™).value = вЂ™вЂ;
document.getElementById(вЂ™surpriseModalBackdropвЂ™).classList.add(вЂopenвЂ™);
document.getElementById(вЂsurpriseModalвЂ™).classList.add(вЂopenвЂ™);
document.getElementById(вЂsurpriseBudgetвЂ™).focus(); } function
closeSurpriseModal(){
document.getElementById(вЂsurpriseModalBackdropвЂ™).classList.remove(вЂopenвЂ™);
document.getElementById(вЂsurpriseModalвЂ™).classList.remove(вЂopenвЂ™); }

/* UЕѕivo sabiranje dodataka (osiguranje/eSIM) na cenu paketa вЂ” bez
ponovne pretrage. Svaki .pkg pamti svoju osnovnu cenu u data-base-total,
a ovde se na nju dodaje zbir ДЌekiranih dodataka unutar TOG istog paketa.
*/ function toggleAddon(checkbox){ const pkgEl =
checkbox.closest(вЂ.pkgвЂ™); if (!pkgEl) return; const base =
Number(pkgEl.dataset.baseTotal) || 0; let sum = base;
pkgEl.querySelectorAll(вЂ.addon-checkbox:checkedвЂ™).forEach(cb => { sum +=
Number(cb.dataset.price) || 0; }); const totalEl =
pkgEl.querySelector(вЂ.pkg-total .numвЂ™); const confirmEl =
pkgEl.querySelector(вЂ.confirm-banner .amtвЂ™); if (totalEl)
totalEl.textContent = fmtEUR(sum); if (confirmEl) confirmEl.textContent
= fmtEUR(sum); }

/* ========================================================== AFFILIATE
CLICK SIMULATION Mirrors /go/offer123 -> save click -> redirect
========================================================== / function
bookItem(btn){ const kind = btn.dataset.kind; const price =
Number(btn.dataset.price); const url = btn.dataset.url; state.clicks +=
1; state.revenue += Math.round(price 0.04); // mock ~4% affiliate
commission updateStats(); const labels = { flight: вЂlet na KAYAK-uвЂ™,
hotel: вЂsmeЕЎtaj na Booking.comвЂ™, car: вЂauto na Booking.comвЂ™, activity:
вЂaktivnost na Viator-uвЂ™, esim: вЂeSIM na Airalo-uвЂ™ }; showToast(вЂKlik
zabeleЕѕen zaвЂ™ + (labels[kind]||kind) + вЂ™ (вЂ™ + fmtEUR(price) + вЂ) В·
otvaram partneraвЂ¦вЂ™); if (url) window.open(url, вЂ™_blankвЂ™, вЂnoopenerвЂ™); }

function showToast(msg){ const t = document.getElementById(вЂtoastвЂ™);
document.getElementById(вЂtoastTextвЂ™).textContent = msg;
t.classList.add(вЂshowвЂ™); clearTimeout(window._toastTimer);
window._toastTimer = setTimeout(()=>t.classList.remove(вЂshowвЂ™), 3200); }

function updateStats(){
document.getElementById(вЂstatSearchesвЂ™).textContent = state.searches;
document.getElementById(вЂstatClicksвЂ™).textContent = state.clicks;
document.getElementById(вЂstatRevenueвЂ™).textContent =
fmtEUR(state.revenue); }

/* ========================================================== FORM
WIRING ========================================================== / / вЂ”-
вЂњPolazakвЂќ (poreklo/origin) je bitno SAMO kad se traЕѕi let вЂ” za
hotel/auto/aktivnosti nema smisla pitati odakle korisnik kreД‡e. Polje se
sakriva kad je вЂњLetoviвЂќ toggle iskljuДЌen (i to je podrazumevano stanje
pri uДЌitavanju stranice), a ponovo se pojavljuje ДЌim se let ukljuДЌi.
Required atribut prati isto stanje, da prazno polje ne blokira slanje
forme kad let uopЕЎte nije deo pretrage. вЂ”- */ function
updateOriginVisibility(showOrigin){ const stub =
document.getElementById(вЂoriginStubвЂ™); const originInput =
document.getElementById(вЂoriginвЂ™); if (!stub || !originInput) return;
stub.style.display = showOrigin ? вЂ™вЂ™ : вЂnoneвЂ™; if (showOrigin)
originInput.setAttribute(вЂrequiredвЂ™, вЂrequiredвЂ™); else
originInput.removeAttribute(вЂrequiredвЂ™); }

document.querySelectorAll(вЂ.toggleвЂ™).forEach(t=>{
t.addEventListener(вЂclickвЂ™, (e)=>{ e.preventDefault(); const input =
t.querySelector(вЂinputвЂ™); input.checked = !input.checked;
t.classList.toggle(вЂonвЂ™, input.checked); if (t.dataset.t === вЂflightвЂ™)
updateOriginVisibility(input.checked); }); });

// Postavi poДЌetno stanje u skladu sa checkbox-om koji je veД‡ markiran u
HTML-u // (trenutno вЂњLetoviвЂќ nije ukljuДЌen po default-u, pa se polje
krije od starta).
updateOriginVisibility(document.querySelector(вЂ.toggle[data-t=вЂњflightвЂќ]
inputвЂ™).checked);

async function runSearch(shouldScroll){ const dest =
document.getElementById(вЂdestвЂ™).value.trim() || вЂAtinaвЂ™; const
originCode = document.getElementById(вЂoriginвЂ™).value.trim(); const from
= document.getElementById(вЂdateFromвЂ™).value; const to =
document.getElementById(вЂdateToвЂ™).value; const adults =
document.getElementById(вЂadultsвЂ™).value; const flags = { flight:
document.querySelector(вЂ.toggle[data-t=вЂњflightвЂќ]вЂ™).classList.contains(вЂonвЂ™),
hotel:
document.querySelector(вЂ.toggle[data-t=вЂњhotelвЂќ]вЂ™).classList.contains(вЂonвЂ™),
car:
document.querySelector(вЂ.toggle[data-t=вЂњcarвЂќ]вЂ™).classList.contains(вЂonвЂ™),
activity:
document.querySelector(вЂ.toggle[data-t=вЂњactivityвЂќ]вЂ™).classList.contains(вЂonвЂ™),
}; const nights = nightsBetween(from, to); const days = nights;

const results = document.getElementById(вЂresultsвЂ™);
results.classList.add(вЂvisibleвЂ™);
document.getElementById(вЂresultsHeadвЂ™).innerHTML = вЂ™вЂ;
document.getElementById(вЂ™resultsBodyвЂ™).innerHTML = вЂ™

PretraЕѕujemo letove, smeЕЎtaj, aute i aktivnostiвЂ¦

вЂ; if (shouldScroll) results.scrollIntoView({behavior:вЂ™smoothвЂ™,
block:вЂstartвЂ™});

state.searches += 1; document.getElementById(вЂstatLastвЂ™).textContent =
dest; updateStats();

setTimeout(()=>{ renderResults(dest, from, to, nights, days, adults,
flags, originCode); }, 700); }

document.getElementById(вЂsearchFormвЂ™).addEventListener(вЂsubmitвЂ™,
function(e){ e.preventDefault(); runSearch(true); });

/* ==========================================================
BUILD-YOUR-OWN (вЂњNapravi svoj aranЕѕmanвЂќ)
========================================================== */ // Jedini
izvor default vrednosti вЂ” ДЌuvamo posebno od builderState (koji se //
mutira tokom rada) da bismo mogli da RESETUJEMO na siguran default pre
// uДЌitavanja saДЌuvanog aranЕѕmana (vidi loadSavedTrip). Bez ovog reseta,
// polje koje nedostaje u starom saДЌuvanom zapisu (npr. jer je dodato
tek // kasnije u builderState) ne bi dobilo fallback вЂ” ostalo bi kakvo
je bilo // pre poziva (stanje iz prethodno uДЌitanog aranЕѕmana ili
undefined), ЕЎto bi // computeCustomPackage moglo da pretvori u NaN cene.
const BUILDER_DEFAULTS = { flightPref: вЂdirectвЂ™, airlineName: вЂ™вЂ,
hotelStars: 4, prioritizeRating: false, prioritizeLocation: false,
carPref: вЂ™smallвЂ™, activityCount: 2, budget: null }; const builderState =
Object.assign({}, BUILDER_DEFAULTS);

function builderCtx(){ const dest =
document.getElementById(вЂdestвЂ™).value.trim() || вЂAtinaвЂ™; const from =
document.getElementById(вЂdateFromвЂ™).value; const to =
document.getElementById(вЂdateToвЂ™).value; const adults =
Number(document.getElementById(вЂadultsвЂ™).value) || 2; const nights =
nightsBetween(from, to); return {dest, nights, days:nights, adults}; }

function computeCustomPackage(sel, ctx){ // Seed zavisi SAMO od izbora
koji stvarno utiДЌu na SASTAV aranЕѕmana // (let, hotel, auto, aktivnosti)
вЂ” budЕѕet je iskljuДЌen iz istog razloga // kao i pre (samo prag za
poreД‘enje, ne treba da menja generisane cene). // airlineName je TAKOДђE
namerno iskljuДЌen: to je slobodan tekst koji // korisnik kuca slovo po
slovo, i kad bi bio deo seed-a, svaki novi // karakter bi generisao
potpuno nov seed в†’ hotel/auto/aktivnosti cene // bi вЂњtrepereleвЂќ i
menjale se pri svakom tasteru, iako se niЕЎta // semantiДЌki bitno za njih
nije promenilo. Ime avio-kompanije i dalje // utiДЌe na PRIKAZ leta
(flightName ispod), samo ne na seed generatora. const seedSel = {
flightPref: sel.flightPref, hotelStars: sel.hotelStars,
prioritizeRating: sel.prioritizeRating, prioritizeLocation:
sel.prioritizeLocation, carPref: sel.carPref, activityCount:
sel.activityCount }; const seedStr =
ctx.dest.toLowerCase()+вЂ|вЂ™+JSON.stringify(seedSel)+вЂ|вЂ™+ctx.nights+вЂ|вЂ™+ctx.adults;
const rng = seededRandom(hashSeed(seedStr));

// вЂ” Flight вЂ” const flightBase = 55 + rng()130; const flightMult =
{direct:1.05, cheapest:0.72, airline:1.15}[sel.flightPref]; const
flightPrice = Math.round(flightBase flightMult * ctx.adults); const
carriers = [вЂWizz AirвЂ™,вЂAir SerbiaвЂ™,вЂRyanairвЂ™,вЂAegeanвЂ™,вЂLufthansaвЂ™]; //
NAPOMENA: ako je flightPref===вЂairlineвЂ™ i ime je uneto, grana ispod //
NE zove rng() (carriers[вЂ¦] se preskaДЌe) вЂ” to je namerno, jer inaДЌe // bi
svaki prelaz prazno/popunjeno polje pomerio redosled sledeД‡ih // rng()
poziva (hotel, autoвЂ¦) za jedno mesto. PoЕЎto je ova grana // stabilna za
SVAKI neprazan unos (bilo koje slovo znaДЌi вЂњpreskoДЌiвЂќ), // cene se ne
pomeraju dok korisnik kuca вЂ” samo pri prvom i poslednjem // karakteru
(prazno в†” nije prazno), ЕЎto je prihvatljivo i retko. const flightName =
sel.flightPref === вЂairlineвЂ™ && sel.airlineName ? sel.airlineName + вЂ™ в†’
вЂ™ + ctx.dest : carriers[Math.floor(rng()*carriers.length)] + вЂ™ в†’ вЂ™ +
ctx.dest; const flightSub = sel.flightPref === вЂcheapestвЂ™ ? вЂjedno
presedanjeвЂ™ : вЂdirektan letвЂ™;

// вЂ” Hotel вЂ” const hotelBasePerNight = {3:36, 4:66,
5:122}[sel.hotelStars] + rng()22; let hotelMult = 1; if
(sel.prioritizeRating) hotelMult += 0.10; if (sel.prioritizeLocation)
hotelMult += 0.07; const hotelPrice = Math.round(hotelBasePerNight
hotelMult * ctx.nights * Math.ceil(ctx.adults/2)); let hotelRating =
{3:7.7, 4:8.6, 5:9.2}[sel.hotelStars] + rng()*0.25; if
(sel.prioritizeRating) hotelRating += 0.25; hotelRating = Math.min(9.9,
hotelRating);

// вЂ” Car вЂ” const carPerDay = {none:0, small:31, suv:57}[sel.carPref] +
(sel.carPref===вЂnoneвЂ™?0:rng()11); const carPrice = Math.round(carPerDay
ctx.days);

// вЂ” Activities вЂ” const perActivity = 21 + rng()17; const activityPrice
= Math.round(perActivity sel.activityCount);

// вЂ” Gorivo i putarine (samo ako je auto ukljuДЌen) вЂ” const carExtras =
sel.carPref === вЂnoneвЂ™ ? 0 : Math.round(18 + rng()20); // вЂ” Taksa za
rezervaciju вЂ” const bookingFee = Math.round(10 + rng()10);

const total = flightPrice + hotelPrice + carPrice + activityPrice +
carExtras + bookingFee;

return { flight: {price:flightPrice, name:flightName, sub:flightSub},
hotel: {price:hotelPrice, rating:Number(hotelRating.toFixed(1)),
stars:sel.hotelStars}, car: {price:carPrice, pref:sel.carPref},
activity: {price:activityPrice, count:sel.activityCount}, carExtras:
{price:carExtras}, bookingFee: {price:bookingFee}, total }; }

function renderBuilder(){ const ctx = builderCtx(); const pkg =
computeCustomPackage(builderState, ctx);

const lines = document.getElementById(вЂbuilderLinesвЂ™); const rows = [
[вЂвњ€пёЏвЂ™, вЂLetвЂ™, pkg.flight.price], [вЂрџЏЁвЂ™, вЂHotelвЂ™, pkg.hotel.price], ]; if
(builderState.carPref !== вЂnoneвЂ™) rows.push([вЂрџљ—вЂ™, вЂAutoвЂ™,
pkg.car.price]); if (builderState.activityCount > 0) rows.push([вЂрџЋџпёЏвЂ™,
вЂAktivnostiвЂ™, pkg.activity.price]); if (pkg.carExtras.price > 0)
rows.push([вЂв›ЅвЂ™, вЂGorivo i putarineвЂ™, pkg.carExtras.price]);
rows.push([вЂрџ§ѕвЂ™, вЂTaksa za rezervacijuвЂ™, pkg.bookingFee.price]);

lines.innerHTML = rows.map(([ic,name,price]) =>
<div class="builder-line">       <span class="lname">${ic} ${name}</span>       <span class="lval tabular">${fmtEUR(price)}</span>     </div>).join(вЂ™вЂ™);

document.getElementById(вЂbuilderTotalвЂ™).textContent = fmtEUR(pkg.total);
document.getElementById(вЂbuilderTotalSubвЂ™).textContent = вЂukupno zaвЂ™ +
ctx.adults + вЂ™ osobвЂ™ + (ctx.adults===1?вЂuвЂ™:вЂeвЂ™) + вЂ™ / вЂ™ + ctx.nights + вЂ™
danaвЂ™;

const statusEl = document.getElementById(вЂbuilderBudgetStatusвЂ™); if
(builderState.budget) { statusEl.classList.add(вЂshowвЂ™); if (pkg.total <=
builderState.budget) { statusEl.className = вЂbuilder-budget-status show
okвЂ™; statusEl.innerHTML = вЂвњ“ U okviru budЕѕeta odвЂ™ +
fmtEUR(builderState.budget); } else { statusEl.className =
вЂbuilder-budget-status show overвЂ™; statusEl.innerHTML = вЂвљ вЂ™ +
fmtEUR(pkg.total - builderState.budget) + вЂ™ preko budЕѕeta od вЂ™ +
fmtEUR(builderState.budget); } } else { statusEl.className =
вЂbuilder-budget-statusвЂ™; statusEl.innerHTML = вЂ™вЂ™; }

document.getElementById(вЂoptimizeResultвЂ™).style.display = вЂnoneвЂ™;
window._lastBuilderPkg = pkg;

// вЂ” Rezervacija po stavci (isti affiliate linkovi kao u gotovim
ponudama) вЂ” const linkCtx = Object.assign({}, ctx, { from:
document.getElementById(вЂdateFromвЂ™).value, to:
document.getElementById(вЂdateToвЂ™).value }); const bookBtns = [
<button type="button" class="item-btn flight" data-kind="flight" data-price="${pkg.flight.price}" data-url="${escapeHtml(buildAffiliateLink('flight', linkCtx))}" onclick="bookItem(this)">вњ€пёЏ KAYAK</button>,
<button type="button" class="item-btn hotel" data-kind="hotel" data-price="${pkg.hotel.price}" data-url="${escapeHtml(buildAffiliateLink('hotel', linkCtx))}" onclick="bookItem(this)">рџЏЁ Booking.com</button>
]; if (builderState.carPref !== вЂnoneвЂ™){
bookBtns.push(<button type="button" class="item-btn car" data-kind="car" data-price="${pkg.car.price}" data-url="${escapeHtml(buildAffiliateLink('car', linkCtx))}" onclick="bookItem(this)">рџљ— Booking.com</button>);
} if (builderState.activityCount > 0){
bookBtns.push(<button type="button" class="item-btn" style="background:var(--aqua);" data-kind="activity" data-price="${pkg.activity.price}" data-url="${escapeHtml(buildAffiliateLink('activity', linkCtx))}" onclick="bookItem(this)">рџЋџпёЏ Viator</button>);
} document.getElementById(вЂbuilderBookLinksвЂ™).innerHTML = вЂ™

RezerviЕЎi svaku stavku direktno kod partnera:

вЂ™ + вЂ™

вЂ™ + bookBtns.join(вЂ™вЂ) +вЂ™

вЂ™; }

function wireChipGroup(groupName, onChange){
document.querySelectorAll(вЂ.chip-row[data-group=вЂњвЂ+groupName+вЂ™вЂќ]
.chipвЂ™).forEach(chip=>{ chip.addEventListener(вЂclickвЂ™, ()=>{
document.querySelectorAll(вЂ.chip-row[data-group=вЂњвЂ+groupName+вЂ™вЂќ]
.chipвЂ™).forEach(c=>c.classList.remove(вЂonвЂ™)); chip.classList.add(вЂonвЂ™);
onChange(chip.dataset.value); }); }); }

wireChipGroup(вЂflightPrefвЂ™, (val)=>{ builderState.flightPref = val;
document.getElementById(вЂairlineNameвЂ™).style.display = (val ===
вЂairlineвЂ™) ? вЂblockвЂ™ : вЂnoneвЂ™; renderBuilder(); });
document.getElementById(вЂairlineNameвЂ™).addEventListener(вЂinputвЂ™, (e)=>{
builderState.airlineName = e.target.value.trim(); renderBuilder(); });

wireChipGroup(вЂhotelStarsвЂ™, (val)=>{ builderState.hotelStars =
Number(val); renderBuilder(); });

wireChipGroup(вЂcarPrefвЂ™, (val)=>{ builderState.carPref = val;
renderBuilder(); });

document.querySelectorAll(вЂ.toggle-chipвЂ™).forEach(chip=>{
chip.addEventListener(вЂclickвЂ™, ()=>{ chip.classList.toggle(вЂonвЂ™);
builderState[chip.dataset.toggle] = chip.classList.contains(вЂonвЂ™);
renderBuilder(); }); });

document.getElementById(вЂactMinusвЂ™).addEventListener(вЂclickвЂ™, ()=>{
builderState.activityCount = Math.max(0, builderState.activityCount -
1); document.getElementById(вЂactCountвЂ™).textContent =
builderState.activityCount; renderBuilder(); });
document.getElementById(вЂactPlusвЂ™).addEventListener(вЂclickвЂ™, ()=>{
builderState.activityCount = Math.min(8, builderState.activityCount +
1); document.getElementById(вЂactCountвЂ™).textContent =
builderState.activityCount; renderBuilder(); });

// Gornja granica je namerno velikoduЕЎna (niko realno ne planira izlet
// preko ovoga), samo spreДЌava apsurdne unose tipa вЂњ1e10вЂќ ili sluДЌajno
// dodat nepotreban nule. BudЕѕet mora biti ceo broj > 0, ne negativan //
i ne decimalan вЂ” sve ostalo se ili odbacuje (null) ili zaokruЕѕuje/seДЌe.
const MAX_BUDGET = 50000;

document.getElementById(вЂbudgetInputвЂ™).addEventListener(вЂinputвЂ™, (e)=>{
const raw = e.target.value; if (!raw) { builderState.budget = null;
renderBuilder(); return; }

const n = Math.floor(Number(raw)); if (!Number.isFinite(n) || n <= 0) {
// Prazno/nevalidno/negativno dok korisnik joЕЎ kuca (npr. samo вЂњ-вЂќ) вЂ” //
ne diramo polje, samo privremeno ignoriЕЎemo budЕѕet u proraДЌunu.
builderState.budget = null; } else { const clamped = Math.min(n,
MAX_BUDGET); // Ako je uneta decimala ili broj veД‡i od granice, ispravi
i prikaz // u polju da korisnik vidi taДЌno koja vrednost se zapravo
koristi. if (String(clamped) !== raw) e.target.value = clamped;
builderState.budget = clamped; } renderBuilder(); });

// Recalculate live if destination/dates/passengers change up in the
ticket [вЂdestвЂ™,вЂdateFromвЂ™,вЂdateToвЂ™,вЂadultsвЂ™].forEach(id=>{
document.getElementById(id).addEventListener(вЂinputвЂ™, renderBuilder);
document.getElementById(id).addEventListener(вЂchangeвЂ™, renderBuilder);
});

/* вЂ”- Optimizacija: proba SVE dostupne poluge (hotel, auto, aktivnosti),
ne samo hotel вЂ” i predlaЕѕe onu sa najveД‡om uЕЎtedom. вЂњVeД‡ optimalnoвЂќ se
sada prikazuje samo ako ni jedna poluga stvarno ne postoji ili ni jedna
ne donosi uЕЎtedu, ne ДЌim prva proverena poluga (hotel) padne na 3в…. вЂ”-
*/ document.getElementById(вЂoptimizeBtnвЂ™).addEventListener(вЂclickвЂ™,
()=>{ const ctx = builderCtx(); const current = window._lastBuilderPkg
|| computeCustomPackage(builderState, ctx); const candidates = [];

// Poluga 1: hotel jednu zvezdicu niЕѕe. if (builderState.hotelStars > 3)
{ const testSel = Object.assign({}, builderState, {hotelStars:
builderState.hotelStars - 1}); const alt = computeCustomPackage(testSel,
ctx); candidates.push({ testSel, savings: current.total - alt.total,
message:
Ako promeniЕЎ hotel na ${testSel.hotelStars}в…, zadrЕѕavaЕЎ skoro istu lokaciju uz malo niЕѕu ocenu (${alt.hotel.rating} umesto ${current.hotel.rating}).,
toastMsg: вЂhotel promenjen naвЂ™ + testSel.hotelStars + вЂв….вЂ™, apply(){
document.querySelectorAll(вЂ.chip-row[data-group=вЂњhotelStarsвЂќ]
.chipвЂ™).forEach(c=>{ c.classList.toggle(вЂonвЂ™, Number(c.dataset.value)
=== testSel.hotelStars); }); } }); }

// Poluga 2: manji auto (SUV в†’ mali auto в†’ bez auta). const carDowngrade
= {suv:вЂsmallвЂ™, small:вЂnoneвЂ™}[builderState.carPref]; if (carDowngrade) {
const testSel = Object.assign({}, builderState, {carPref:
carDowngrade}); const alt = computeCustomPackage(testSel, ctx);
candidates.push({ testSel, savings: current.total - alt.total, message:
carDowngrade === вЂnoneвЂ™ ? вЂAko odustaneЕЎ od iznajmljivanja auta, gubiЕЎ
deo fleksibilnosti u kretanju, ali ЕЎtediЕЎ i na gorivu i putarinama.вЂ™ :
вЂAko uzmeЕЎ manji auto umesto SUV-a, uЕЎtedu dobijaЕЎ uz neЕЎto manje
prtljaЕѕnog prostora.вЂ™, toastMsg: вЂauto promenjen naвЂ™ + (carDowngrade ===
вЂnoneвЂ™ ? вЂbez autaвЂ™ : вЂmali autoвЂ™) + вЂ.вЂ™, apply(){
document.querySelectorAll(вЂ.chip-row[data-group=вЂњcarPrefвЂќ]
.chipвЂ™).forEach(c=>{ c.classList.toggle(вЂonвЂ™, c.dataset.value ===
testSel.carPref); }); } }); }

// Poluga 3: jedna aktivnost manje. if (builderState.activityCount > 0)
{ const testSel = Object.assign({}, builderState, {activityCount:
builderState.activityCount - 1}); const alt =
computeCustomPackage(testSel, ctx); candidates.push({ testSel, savings:
current.total - alt.total, message:
Ako smanjiЕЎ broj aktivnosti na ${testSel.activityCount}, ostaje ti i dalje dovoljno vremena za slobodno istraЕѕivanje.,
toastMsg: вЂbroj aktivnosti smanjen naвЂ™ + testSel.activityCount + вЂ.вЂ™,
apply(){ document.getElementById(вЂactCountвЂ™).textContent =
testSel.activityCount; } }); }

const box = document.getElementById(вЂoptimizeResultвЂ™); box.style.display
= вЂblockвЂ™;

const viable = candidates.filter(c => c.savings > 0).sort((a,b) =>
b.savings - a.savings); if (!viable.length) { box.innerHTML =
candidates.length ? вЂAranЕѕman je veД‡ optimalanProverili smo hotel, auto
i broj aktivnosti вЂ” trenutna kombinacija je veД‡ najjeftinija za odabrane
kriterijume.вЂ™ : вЂAranЕѕman je veД‡ optimalanVeД‡ si na najniЕѕim opcijama za
sve stavke вЂ” nema oДЌiglednog mesta za uЕЎtedu bez gubitka udobnosti.вЂ™;
return; }

const best = viable[0]; box.innerHTML =
<span class="save">MoЕѕeЕЎ uЕЎtedeti ${fmtEUR(best.savings)}</span>     ${best.message}     <button type="button" class="optimize-apply" id="applyOptimize">Primeni ovu izmenu</button>;
document.getElementById(вЂapplyOptimizeвЂ™).addEventListener(вЂclickвЂ™, ()=>{
Object.assign(builderState, best.testSel); best.apply();
renderBuilder(); showToast(вЂAranЕѕman aЕѕuriran вЂ”вЂ™ + best.toastMsg); });
});

document.getElementById(вЂmakeBuilderBtnвЂ™).addEventListener(вЂclickвЂ™,
()=>{ const destInput = document.getElementById(вЂdestвЂ™); if
(!destInput.value.trim()){ showToast(вЂUnesi destinaciju da bismo
napravili aranЕѕman.вЂ™); destInput.focus();
destInput.scrollIntoView({behavior:вЂsmoothвЂ™, block:вЂcenterвЂ™}); return; }
renderBuilder(); document.getElementById(вЂbuilderSummaryвЂ™).style.display
= вЂblockвЂ™; document.getElementById(вЂbuilderPlaceholderвЂ™).style.display =
вЂnoneвЂ™; });

/* ========================================================== POPULARNE
DESTINACIJE вЂ” statiДЌne kartice u HTML-u (SEO sadrЕѕaj vidljiv i bez
JS-a); klik samo puni postojeД‡u formu i pokreД‡e isti runSearch() koji se
koristi za вЂњPronaД‘i najbolje putovanjeвЂќ. Namerno stoji PRE Supabase
inicijalizacije ispod вЂ” ako config.js nedostane ili baci greЕЎku, ovo i
dalje treba da radi.
========================================================== */
document.querySelectorAll(вЂ.popular-dest-cardвЂ™).forEach(card => {
card.addEventListener(вЂclickвЂ™, () => {
document.getElementById(вЂdestвЂ™).value = card.dataset.dest;
document.getElementById(вЂresultsвЂ™).scrollIntoView({behavior:вЂsmoothвЂ™,
block:вЂstartвЂ™}); runSearch(false); }); });

/* ========================================================== MOJA
PUTOVANJA вЂ” Supabase (auth.users + trips tabela). Prijava je email
magic-link (OTP), ne treba Google/OAuth podesavanje. Ako Supabase iz
nekog razloga ne odgovori (mreza, pogresan kljuc), sekcija samo ostaje
prazna вЂ” ne obara ostatak sajta.
========================================================== */ let sb =
null; try { sb =
window.supabase.createClient(window.SKOKNICA_SUPABASE_URL,
window.SKOKNICA_SUPABASE_KEY); } catch (err) { console.warn(вЂ[skoknica]
Supabase init nije uspeo вЂ” nalog/saДЌuvani aranЕѕmani neД‡e raditi, ali
ostatak sajta hoД‡e:вЂ™, err.message); }

async function getCurrentUser(){ if (!sb) return null; try { const {
data } = await sb.auth.getUser(); return (data && data.user) || null; }
catch(err){ console.warn(вЂ[skoknica] auth nedostupan:вЂ™, err.message);
return null; } }

let _authBarExpanded = false; function renderAuthPanel(containerId,
user){ const bar = document.getElementById(containerId); if (!bar)
return; const emailId = containerId + вЂ™_emailвЂ™; const loginBtnId =
containerId + вЂ™_loginBtnвЂ™; const logoutBtnId = containerId +
вЂ™_logoutBtnвЂ™; // U glavnoj sekciji (вЂњauthBarвЂќ) ne guramo email formu
odmah u lice вЂ” // prvo je tih link, forma se otvara tek kad korisnik
zaista hoД‡e da saДЌuva. // U dropdown-u iz topbar-a (containerId
вЂњauthDropdownвЂќ) forma je uvek otvorena, // jer je korisnik tamo veД‡
svesno kliknuo na ikonicu naloga. const compact = containerId ===
вЂauthBarвЂ™; if (user){ bar.innerHTML =
<div class="auth-row">         <span class="auth-status">Ulogovan kao <strong>${escapeHtml(user.email)}</strong></span>         <button type="button" class="auth-btn" id="${logoutBtnId}">Izloguj se</button>       </div>;
document.getElementById(logoutBtnId).addEventListener(вЂclickвЂ™, async
()=>{ await sb.auth.signOut(); renderSavedTrips(); }); } else if
(compact && !_authBarExpanded){ bar.innerHTML =
<button type="button" class="auth-link" id="${loginBtnId}_reveal">Prijavi se da saДЌuvaЕЎ aranЕѕmane в†’</button>;
document.getElementById(loginBtnId +
вЂ™_revealвЂ™).addEventListener(вЂclickвЂ™, ()=>{ _authBarExpanded = true;
renderAuthPanel(containerId, user); }); } else { const pwId = emailId +
вЂ™_pwвЂ™; bar.innerHTML =
<div class="auth-row">         <input type="email" id="${emailId}" class="auth-input" placeholder="tvoj@email.com" autocomplete="email">         <input type="password" id="${pwId}" class="auth-input" placeholder="lozinka (min 6 karaktera)" autocomplete="current-password">         <button type="button" class="auth-btn" id="${loginBtnId}">Prijavi se / Napravi nalog</button>       </div>       <p class="auth-hint">Prva prijava sa ovim emailom i lozinkom automatski pravi nalog вЂ” zapamti lozinku, nema linka za oporavak dok sajt ne bude na pravom domenu.</p>;
document.getElementById(emailId).focus();
document.getElementById(loginBtnId).addEventListener(вЂclickвЂ™, async
()=>{ const email = document.getElementById(emailId).value.trim(); const
password = document.getElementById(pwId).value; if (!email ||
!password){ showToast(вЂUnesi email i lozinku.вЂ™); return; } if
(password.length < 6){ showToast(вЂLozinka mora imati bar 6 karaktera.вЂ™);
return; }

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

} }

/* вЂ”- Topbar: hamburger meni (mobilni) + dropdown za prijavu вЂ”- */ const
mobilePanel = document.getElementById(вЂmobilePanelвЂ™); const authDropdown
= document.getElementById(вЂauthDropdownвЂ™); const hamburgerBtn =
document.getElementById(вЂhamburgerBtnвЂ™); const topAvatarBtn =
document.getElementById(вЂtopAvatarBtnвЂ™);

hamburgerBtn.addEventListener(вЂclickвЂ™, ()=>{
authDropdown.classList.remove(вЂopenвЂ™);
mobilePanel.classList.toggle(вЂopenвЂ™);
hamburgerBtn.classList.toggle(вЂopenвЂ™,
mobilePanel.classList.contains(вЂopenвЂ™)); });
topAvatarBtn.addEventListener(вЂclickвЂ™, ()=>{
mobilePanel.classList.remove(вЂopenвЂ™);
hamburgerBtn.classList.remove(вЂopenвЂ™);
authDropdown.classList.toggle(вЂopenвЂ™); });
document.addEventListener(вЂclickвЂ™, (e)=>{ if
(!e.target.closest(вЂ#authDropdownвЂ™) &&
!e.target.closest(вЂ#topAvatarBtnвЂ™))
authDropdown.classList.remove(вЂopenвЂ™); if
(!e.target.closest(вЂ#mobilePanelвЂ™) &&
!e.target.closest(вЂ#hamburgerBtnвЂ™)){
mobilePanel.classList.remove(вЂopenвЂ™);
hamburgerBtn.classList.remove(вЂopenвЂ™); } });

function tierLabelsForSaved(sel){ if (sel.summaryTags) return
sel.summaryTags; const flightLabels = {direct:вЂDirektan letвЂ™,
cheapest:вЂNajjeftiniji letвЂ™, airline: sel.airlineName || вЂOdreД‘ena
kompanijaвЂ™}; const carLabels = {none:вЂBez autaвЂ™, small:вЂMali autoвЂ™,
suv:вЂSUVвЂ™}; return [ flightLabels[sel.flightPref] || вЂLetвЂ™,
sel.hotelStars + вЂв… hotelвЂ™, carLabels[sel.carPref] || вЂAutoвЂ™,
sel.activityCount + вЂ™ aktivnostiвЂ™ ]; }

/* вЂ”вЂ”вЂ”- PoreД‘enje saДЌuvanih aranЕѕmana вЂ”- Korisnik ДЌekira do 3 kartice;
ДЌim su 2+ ДЌekirane, ispod liste se pojavljuje tabela koja ih uporeД‘uje
jednu pored druge. Ne pravi se novi network poziv pri ДЌekiranju вЂ”
koristi se _lastSavedTripsCache iz poslednjeg fetchSavedTrips() poziva.
вЂ”вЂ”вЂ”- */ let compareIds = new Set(); let _lastSavedTripsCache = []; const
COMPARE_MAX = 3;

function renderCompareTable(){ const wrap =
document.getElementById(вЂcompareWrapвЂ™); if (!wrap) return; const
selected = _lastSavedTripsCache.filter(t => compareIds.has(t.id)); if
(selected.length < 2){ wrap.style.display = вЂnoneвЂ™; wrap.innerHTML = вЂ™вЂ;
return; } const cheapest = Math.min(вЂ¦selected.map(t => t.total));
wrap.style.display = вЂ™blockвЂ™; wrap.innerHTML =
<div class="compare-head">       <div class="eyebrow">PoreД‘enje</div>       <h3>Uporedi ${selected.length} saДЌuvana aranЕѕmana</h3>     </div>     <div class="compare-table-wrap">       <table class="compare-table">         <thead>           <tr>             <th></th>             ${selected.map(t =>
${escapeHtml(t.dest)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr><td>Datumi</td>${selected.map(t =>
<td>${fmtDate(t.from)} вЂ“ ${fmtDate(t.to)}</td>).join(вЂ™вЂ™)}
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

`; document.getElementById(вЂcompareClearBtnвЂ™).addEventListener(вЂclickвЂ™,
() => { compareIds.clear();
renderSavedTripsMarkup(_lastSavedTripsCache); }); }

function renderSavedTripsMarkup(trips){ const wrap =
document.getElementById(вЂsavedTripsListвЂ™); if (!trips.length){
wrap.innerHTML = вЂ™

JoЕЎ nema saДЌuvanih aranЕѕmana. Podesi izbore u builderu iznad i klikni
вЂћSaДЌuvaj aranЕѕmanвЂњ.

вЂ; renderCompareTable(); return; } wrap.innerHTML =вЂ™

вЂ™ + trips.map(t =>
<div class="saved-card" data-id="${t.id}">       <label class="sc-compare">         <input type="checkbox" class="sc-compare-cb" data-id="${t.id}"           ${compareIds.has(t.id) ? 'checked' : ''}           ${(!compareIds.has(t.id) && compareIds.size >= COMPARE_MAX) ? 'disabled' : ''}>         <span>Uporedi</span>       </label>       <div class="sc-dest">${escapeHtml(t.dest)}</div>       <div class="sc-meta">${fmtDate(t.from)} вЂ“ ${fmtDate(t.to)} В· ${t.adults} ${passengerLabel(t.adults)}</div>       <div class="sc-tags">${tierLabelsForSaved(t.sel).map(l =>${escapeHtml(l)}</span>`).join('')}</div>
      <div class="sc-total"><span class="lab">procenjeno ukupno</span><span class="num tabular">${fmtEUR(t.total)}

      <div class="sc-actions">
        <button type="button" class="sc-btn load" onclick="loadSavedTrip('${t.id}')">UДЌitaj</button>
        <button type="button" class="sc-btn share" onclick="shareTrip('${t.id}')">рџ”— Podeli</button>
        <button type="button" class="sc-btn del" onclick="deleteSavedTrip('${t.id}')">ObriЕЎi</button>
      </div>
    </div>`).join('') + '</div>';

wrap.querySelectorAll(вЂ.sc-compare-cbвЂ™).forEach(cb => {
cb.addEventListener(вЂchangeвЂ™, () => { if (cb.checked)
compareIds.add(cb.dataset.id); else compareIds.delete(cb.dataset.id);
renderSavedTripsMarkup(_lastSavedTripsCache); }); });

renderCompareTable(); }

async function fetchSavedTrips(){ const { data, error } = await
sb.from(вЂtripsвЂ™).select(вЂ™*вЂ).order(вЂ™created_atвЂ™, {ascending:false}); if
(error){ console.warn(вЂ[skoknica] ucitavanje putovanja nije uspelo:вЂ™,
error.message); return []; } return data.map(row => ({ id: row.id, dest:
row.dest, from: row.date_from, to: row.date_to, adults:
String(row.adults), sel: row.selection, total: row.total, shareToken:
row.share_token || null })); }

async function renderSavedTrips(){ const user = await getCurrentUser();
renderAuthPanel(вЂauthBarвЂ™, user); renderAuthPanel(вЂauthDropdownвЂ™, user);
topAvatarBtn.classList.toggle(вЂlogged-inвЂ™, !!user); const wrap =
document.getElementById(вЂsavedTripsListвЂ™);

if (!user){ wrap.innerHTML = вЂ™

Prijavi se emailom iznad da vidiЕЎ i ДЌuvaЕЎ svoje aranЕѕmane вЂ” ДЌuvaju se na
nalogu, ne u ovom pregledaДЌu.

вЂ™; _lastSavedTripsCache = []; compareIds.clear(); renderCompareTable();
return; }

const trips = await fetchSavedTrips(); _lastSavedTripsCache = trips; //
ukloni iz poreД‘enja sve id-jeve koji viЕЎe ne postoje (npr. obrisan
aranЕѕman) const stillExists = new Set(trips.map(t => t.id));
compareIds.forEach(id => { if (!stillExists.has(id))
compareIds.delete(id); });

renderSavedTripsMarkup(trips); }

async function saveSavedTrip(){ const user = await getCurrentUser(); if
(!user){ _authBarExpanded = true; renderSavedTrips();
document.getElementById(вЂauthBarвЂ™).scrollIntoView({behavior:вЂsmoothвЂ™,
block:вЂcenterвЂ™}); showToast(вЂPrijavi se emailom da saДЌuvaЕЎ aranЕѕman.вЂ™);
return; } const ctx = builderCtx(); const pkg = window._lastBuilderPkg
|| computeCustomPackage(builderState, ctx); const { error } = await
sb.from(вЂtripsвЂ™).insert({ user_id: user.id, dest: ctx.dest, date_from:
document.getElementById(вЂdateFromвЂ™).value, date_to:
document.getElementById(вЂdateToвЂ™).value, adults:
Number(document.getElementById(вЂadultsвЂ™).value), selection:
Object.assign({kind:вЂbuilderвЂ™}, builderState), total: pkg.total }); if
(error){ showToast(вЂGreЕЎka pri ДЌuvanju:вЂ™ + error.message); return; }
renderSavedTrips(); showToast(вЂAranЕѕman zaвЂ™ + ctx.dest + вЂ™ saДЌuvan (вЂ™ +
fmtEUR(pkg.total) + вЂ).вЂ™); }

/* вЂ”- ДЊuvanje jedne od 3 gotove ponude iz pretrage (Budget/Best/Comfort)
вЂ”- Za razliku od buildera, ovde nema builderState da se saДЌuva/vrati вЂ”
pamtimo samo prikazne oznake (summaryTags) i tier, dovoljno da se
kartica lepo prikaЕѕe na listi. вЂњUДЌitajвЂќ za ovaj tip ponovo pokreД‡e
pretragu sa istim parametrima, umesto da puni builder (jer selekcija
nije builder-oblika). */ async function saveSearchPackage(tier){ const
user = await getCurrentUser(); if (!user){ _authBarExpanded = true;
renderSavedTrips();
document.getElementById(вЂauthBarвЂ™).scrollIntoView({behavior:вЂsmoothвЂ™,
block:вЂcenterвЂ™}); showToast(вЂPrijavi se emailom da saДЌuvaЕЎ ponudu.вЂ™);
return; } const pkg = (window._lastSearchPkgs || []).find(p => p.tier
=== tier); const ctx = window._lastSearchCtx; if (!pkg || !ctx){
showToast(вЂPonuda viЕЎe nije dostupna вЂ” pretraЕѕi ponovo.вЂ™); return; }

const summaryTags = [ TIER_META[tier].label, pkg.flight ?
pkg.flight.name : вЂBez letaвЂ™, pkg.hotel ? pkg.hotel.name : вЂBez hotelaвЂ™,
pkg.car ? вЂSa automвЂ™ : вЂBez autaвЂ™ ];

const { error } = await sb.from(вЂtripsвЂ™).insert({ user_id: user.id,
dest: ctx.dest, date_from: ctx.from, date_to: ctx.to, adults:
Number(ctx.adults), selection: {kind:вЂsearchвЂ™, tier, tierLabel:
TIER_META[tier].label, summaryTags}, total: pkg.total }); if (error){
showToast(вЂGreЕЎka pri ДЌuvanju:вЂ™ + error.message); return; }
renderSavedTrips(); showToast(TIER_META[tier].label + вЂ™ ponuda za вЂ™ +
ctx.dest + вЂ™ saДЌuvana (вЂ™ + fmtEUR(pkg.total) + вЂ).вЂ™); }

async function loadSavedTrip(id){ const trips = await fetchSavedTrips();
const t = trips.find(x => x.id === id); if (!t) return;

document.getElementById(вЂdestвЂ™).value = t.dest;
document.getElementById(вЂdateFromвЂ™).value = t.from;
document.getElementById(вЂdateToвЂ™).value = t.to;
document.getElementById(вЂadultsвЂ™).value = t.adults;

// SaДЌuvane ponude iz pretrage (Budget/Best/Comfort) nisu builder-oblika
вЂ” // za njih nema ЕЎta da se вЂњvratiвЂќ u builder chipove, samo ponovo
pretraЕѕujemo // sa istim parametrima i korisnik opet vidi sve 3 ponude.
if (t.sel && t.sel.kind === вЂsearchвЂ™){
document.getElementById(вЂresultsвЂ™).scrollIntoView({behavior:вЂsmoothвЂ™,
block:вЂstartвЂ™}); showToast(вЂPonovo pretraЕѕujem zaвЂ™ + t.dest + вЂ™ (вЂ™ +
(t.sel.tierLabel||вЂ™вЂ) +вЂ™)вЂ¦вЂ™); runSearch(false); return; }

// Prvo reset na BUILDER_DEFAULTS, pa tek onda t.sel preko toga вЂ” tako
// svako polje koje nedostaje u starom saДЌuvanom zapisu dobije siguran
// fallback umesto da nasledi stanje iz prethodno uДЌitanog aranЕѕmana.
Object.assign(builderState, BUILDER_DEFAULTS, t.sel);

document.querySelectorAll(вЂ.chip-row[data-group=вЂњflightPrefвЂќ]
.chipвЂ™).forEach(c=>{ c.classList.toggle(вЂonвЂ™, c.dataset.value ===
builderState.flightPref); });
document.getElementById(вЂairlineNameвЂ™).style.display =
(builderState.flightPref === вЂairlineвЂ™) ? вЂblockвЂ™ : вЂnoneвЂ™;
document.getElementById(вЂairlineNameвЂ™).value = builderState.airlineName
|| вЂ™вЂ™;

document.querySelectorAll(вЂ.chip-row[data-group=вЂњhotelStarsвЂќ]
.chipвЂ™).forEach(c=>{ c.classList.toggle(вЂonвЂ™, Number(c.dataset.value)
=== builderState.hotelStars); });
document.querySelectorAll(вЂ.chip-row[data-group=вЂњcarPrefвЂќ]
.chipвЂ™).forEach(c=>{ c.classList.toggle(вЂonвЂ™, c.dataset.value ===
builderState.carPref); });
document.querySelectorAll(вЂ.toggle-chipвЂ™).forEach(chip=>{
chip.classList.toggle(вЂonвЂ™, !!builderState[chip.dataset.toggle]); });
document.getElementById(вЂactCountвЂ™).textContent =
builderState.activityCount;

renderBuilder(); document.getElementById(вЂbuilderSummaryвЂ™).style.display
= вЂblockвЂ™; document.getElementById(вЂbuilderPlaceholderвЂ™).style.display =
вЂnoneвЂ™;
document.querySelector(вЂ.builder-wrapвЂ™).scrollIntoView({behavior:вЂsmoothвЂ™,
block:вЂstartвЂ™}); showToast(вЂUДЌitan saДЌuvani aranЕѕman zaвЂ™ + t.dest +
вЂ.вЂ™); }

async function deleteSavedTrip(id){ const { error } = await
sb.from(вЂtripsвЂ™).delete().eq(вЂidвЂ™, id); if (error){ showToast(вЂGreЕЎka
pri brisanju:вЂ™ + error.message); return; } renderSavedTrips(); }

document.getElementById(вЂsaveTripBtnвЂ™).addEventListener(вЂclickвЂ™,
saveSavedTrip); if (sb) sb.auth.onAuthStateChange(()=>
renderSavedTrips()); renderSavedTrips();

/* ========================================================== PRICE
ALERTS вЂ” вЂњJavi mi kad padne cenaвЂќ Otvara se sa dugmeta na svakoj gotovoj
ponudi (Budget/Best/Comfort) ili sa dugmeta u builderu. Upisuje red
direktno u price_alerts preko anon kljuДЌa (RLS na toj tabeli dozvoljava
SAMO insert вЂ” vidi supabase/price_alerts.sql), bez potrebe za
nalogom/prijavom. PeriodiДЌnu proveru i slanje mejla radi poseban
Cloudflare Worker (worker/price-alert-worker.js), ne ovaj fajl.
========================================================== */ let
_alertCtx = null;

function openAlertModal(kind, tierOrNull, currentPrice, destOverride){
const ctx = builderCtx(); const dest = destOverride || ctx.dest; const
selection = (kind === вЂsearchвЂ™) ? {kind:вЂsearchвЂ™, tier:tierOrNull,
tierLabel:(TIER_META[tierOrNull]||{}).label || вЂ™вЂ} :
Object.assign({kind:вЂ™builderвЂ™}, builderState);

_alertCtx = { dest: dest, from:
document.getElementById(вЂdateFromвЂ™).value, to:
document.getElementById(вЂdateToвЂ™).value, adults:
Number(document.getElementById(вЂadultsвЂ™).value) || 2, selection, price:
Math.round(currentPrice) };

document.getElementById(вЂalertModalSubвЂ™).textContent = вЂTrenutna procena
zaвЂ™ + dest + вЂ:вЂ™ + fmtEUR(_alertCtx.price) + вЂ. JaviД‡emo ti mejlom kad
procenjena cena padne ispod praga koji postaviЕЎ.вЂ™;
document.getElementById(вЂalertThresholdвЂ™).value = Math.max(1,
Math.round(_alertCtx.price * 0.9));
document.getElementById(вЂalertEmailвЂ™).value = вЂ™вЂ™;

document.getElementById(вЂalertModalBackdropвЂ™).classList.add(вЂopenвЂ™);
document.getElementById(вЂalertModalвЂ™).classList.add(вЂopenвЂ™);
document.getElementById(вЂalertEmailвЂ™).focus(); }

function closeAlertModal(){
document.getElementById(вЂalertModalBackdropвЂ™).classList.remove(вЂopenвЂ™);
document.getElementById(вЂalertModalвЂ™).classList.remove(вЂopenвЂ™); }

document.getElementById(вЂalertBuilderBtnвЂ™).addEventListener(вЂclickвЂ™,
()=>{ const ctx = builderCtx(); const pkg = window._lastBuilderPkg ||
computeCustomPackage(builderState, ctx); openAlertModal(вЂbuilderвЂ™, null,
pkg.total); });

document.getElementById(вЂalertModalBackdropвЂ™).addEventListener(вЂclickвЂ™,
closeAlertModal);
document.getElementById(вЂalertModalCloseвЂ™).addEventListener(вЂclickвЂ™,
closeAlertModal); document.addEventListener(вЂkeydownвЂ™, (e)=>{ if (e.key
=== вЂEscapeвЂ™ &&
document.getElementById(вЂalertModalвЂ™).classList.contains(вЂopenвЂ™))
closeAlertModal(); });

document.getElementById(вЂalertModalSubmitвЂ™).addEventListener(вЂclickвЂ™,
async ()=>{ if (!_alertCtx) return; const email =
document.getElementById(вЂalertEmailвЂ™).value.trim(); const threshold =
Number(document.getElementById(вЂalertThresholdвЂ™).value);

if (!email || !/[1]+@[^\s@]+.[^\s@]+$/.test(email)){ showToast(вЂUnesi
ispravan email.вЂ™); return; } if (!threshold || threshold <= 0){
showToast(вЂUnesi ispravan prag u evrima.вЂ™); return; }

const submitBtn = document.getElementById(вЂalertModalSubmitвЂ™);
submitBtn.disabled = true;

const { error } = await sb.from(вЂprice_alertsвЂ™).insert({ email, dest:
_alertCtx.dest, date_from: _alertCtx.from, date_to: _alertCtx.to,
adults: _alertCtx.adults, selection: _alertCtx.selection, threshold,
last_price: _alertCtx.price });

submitBtn.disabled = false;

if (error){ showToast(вЂGreЕЎka pri postavljanju alerta:вЂ™ +
error.message); return; }

closeAlertModal(); showToast(вЂGotovo вЂ” javiД‡emo ti naвЂ™ + email + вЂ™ kad
cena padne ispod вЂ™ + fmtEUR(threshold) + вЂ.вЂ™); });

/* ========================================================== вЂњIZNENADI
MEвЂќ вЂ” wiring dugmeta i modala
========================================================== */
document.getElementById(вЂsurpriseModalBackdropвЂ™).addEventListener(вЂclickвЂ™,
closeSurpriseModal);
document.getElementById(вЂsurpriseModalCloseвЂ™).addEventListener(вЂclickвЂ™,
closeSurpriseModal); document.addEventListener(вЂkeydownвЂ™, (e)=>{ if
(e.key === вЂEscapeвЂ™ &&
document.getElementById(вЂsurpriseModalвЂ™).classList.contains(вЂopenвЂ™))
closeSurpriseModal(); });
document.getElementById(вЂsurpriseTriggerBtnвЂ™).addEventListener(вЂclickвЂ™,
openSurpriseModal);
document.getElementById(вЂsurpriseModalSubmitвЂ™).addEventListener(вЂclickвЂ™,
()=> runSurpriseSearch(false));
document.getElementById(вЂsurpriseBudgetвЂ™).addEventListener(вЂkeydownвЂ™,
(e)=>{ if (e.key === вЂEnterвЂ™){ e.preventDefault();
runSurpriseSearch(false); } });

/* ========================================================== DELJENJE
SA PRIJATELJIMA (вЂњрџ”— PodeliвЂќ) GeneriЕЎe (ili ponovo koristi) share_token
na saДЌuvanom aranЕѕmanu i pravi javni link ka zajedno.html вЂ” ta stranica
radi bez naloga i bez app.js (sopstveni inline skript), pristupa bazi
iskljuДЌivo preko RPC funkcija iz supabase/share_trip.sql.
========================================================== / function
buildShareUrl(token){ const base = location.href.replace(/[^/]$/, вЂ™вЂ);
// sve posle poslednjeg вЂњ/вЂќ (fajl + query) odseca return base +
вЂ™zajedno.html?t=вЂ™ + token; }

async function shareTrip(id){ const trip = (_lastSavedTripsCache ||
[]).find(t => t.id === id); if (!trip){ showToast(вЂAranЕѕman viЕЎe nije
dostupan вЂ” osveЕѕi listu.вЂ™); return; }

let token = trip.shareToken; if (!token){ token = (crypto.randomUUID ?
crypto.randomUUID() : String(Date.now()) +
Math.random().toString(16).slice(2)); const { error } = await
sb.from(вЂtripsвЂ™).update({share_token: token}).eq(вЂidвЂ™, id); if (error){
showToast(вЂGreЕЎka pri pravljenju linka:вЂ™ + error.message); return; }
trip.shareToken = token; // aЕѕuriraj keЕЎ da ne pravi novi token pri
sledeД‡em kliku }

const url = buildShareUrl(token);
document.getElementById(вЂshareModalLinkвЂ™).value = url;
document.getElementById(вЂshareModalSubвЂ™).textContent = вЂPoЕЎalji ovaj
link prijateljima zaвЂ™ + trip.dest + вЂ™ вЂ” mogu da vide predlog i jave se
(Idem/MoЕѕda/Ne mogu) bez pravljenja naloga.вЂ™;
document.getElementById(вЂshareModalBackdropвЂ™).classList.add(вЂopenвЂ™);
document.getElementById(вЂshareModalвЂ™).classList.add(вЂopenвЂ™); }

function closeShareModal(){
document.getElementById(вЂshareModalBackdropвЂ™).classList.remove(вЂopenвЂ™);
document.getElementById(вЂshareModalвЂ™).classList.remove(вЂopenвЂ™); }

async function copyShareLink(){ const input =
document.getElementById(вЂshareModalLinkвЂ™); input.select();
input.setSelectionRange(0, 99999); try { await
navigator.clipboard.writeText(input.value); showToast(вЂLink kopiran u
clipboard.вЂ™); } catch(err){ showToast(вЂNije uspelo automatsko kopiranje
вЂ” kopiraj ruДЌno iz polja.вЂ™); } }

document.getElementById(вЂshareModalBackdropвЂ™).addEventListener(вЂclickвЂ™,
closeShareModal);
document.getElementById(вЂshareModalCloseвЂ™).addEventListener(вЂclickвЂ™,
closeShareModal);
document.getElementById(вЂshareModalCopyвЂ™).addEventListener(вЂclickвЂ™,
copyShareLink); document.addEventListener(вЂkeydownвЂ™, (e)=>{ if (e.key
=== вЂEscapeвЂ™ &&
document.getElementById(вЂshareModalвЂ™).classList.contains(вЂopenвЂ™))
closeShareModal(); }); // Web Share API вЂ” na mobilnom otvara sistemski
meni za deljenje (WhatsApp, // Viber, SMSвЂ¦) umesto samo kopiranja linka.
Dugme se prikazuje samo ako // pregledaДЌ to podrЕѕava (uglavnom mobilni).
if (navigator.share){
document.getElementById(вЂshareModalNativeвЂ™).style.display = вЂ™вЂ;
document.getElementById(вЂ™shareModalNativeвЂ™).addEventListener(вЂclickвЂ™,
async ()=>{ try { await navigator.share({title:вЂPredlog putovanja вЂ”
SkoknicaвЂ™, url: document.getElementById(вЂshareModalLinkвЂ™).value}); }
catch(err){ /* korisnik otkazao deljenje вЂ” nema potrebe za toast-om */ }
}); }

/* вЂ”- Jezik: primeni sacuvani izbor pri ucitavanju i kaci toggle dugme
вЂ”- */ applyStaticI18n();
document.getElementById(вЂlangSwitchBtnвЂ™).addEventListener(вЂclickвЂ™, ()=>{
setLang(getLang() === вЂsrвЂ™ ? вЂenвЂ™ : вЂsrвЂ™); }); // Ponovo iscrtaj vec
prikazane dinamicke delove (builder / sacuvani aranzmani / // auth
panel) u novom jeziku. Rezultati pretrage (#resultsBody) namerno NISU //
ovde вЂ” retroaktivni re-render bez ponovnog pretrazivanja bio bi rizican
za // odrzavanje; nova pretraga ce vec biti na izabranom jeziku.
window.onLangChange = async function(){ if
(document.getElementById(вЂbuilderSummaryвЂ™).style.display !== вЂnoneвЂ™){
renderBuilder(); } if
(document.getElementById(вЂsavedTripsListвЂ™).innerHTML.trim() !== вЂ™вЂ){
renderSavedTrips(); } const user = await getCurrentUser();
renderAuthPanel(вЂ™authBarвЂ™, user); if
(document.getElementById(вЂauthDropdownвЂ™).innerHTML.trim() !== вЂ™вЂ){
renderAuthPanel(вЂ™authDropdownвЂ™, user); } };

[1] ^