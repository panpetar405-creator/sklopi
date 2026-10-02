/* app-10-planner-init.js — deo nekadašnjeg app.js (deo 10/11): Prilagodi plan, vodič po stavci, inicijalizacija.
   Klasična skripta: deli globalni opseg sa ostalim app-*.js fajlovima; redosled učitavanja u index.html je bitan. */
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
  // Ranije se proveravala SAMO destinacija — polazak (ako je let uključen),
  // datumi i broj putnika su mogli ostati prazni/nepotvrđeni, pa je izlet
  // pravljen na osnovu nepotpunog unosa. Ista provera kao za pretragu.
  const check = validateSearchInputs();
  if (!check.ok){ showToast(check.msg); focusSearchField(check.focus); return; }

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

