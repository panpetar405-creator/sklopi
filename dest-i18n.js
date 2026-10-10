/* dest-i18n.js — prevodi stranicu destinacija.html (EN / RU / DE).
   Ova stranica ima tekstove ugrađene na srpskom, pa ih ovde prevodimo "u hodu":
   čita jezik iz localStorage ('sklopi_lang', isti ključ kao u aplikaciji) ili iz ?lang=,
   pa menja tekst (i aria-label / title / placeholder) čim se pojavi na stranici —
   i onaj koji stranica doda kasnije (ponude, specifikacija puta, obaveštenja).
   Srpski (sr) = ništa se ne menja.
   Dugme SR/EN/RU/DE u zaglavlju menja jezik (ponovo učitava stranicu).
   Dodavanje/ispravka prevoda: samo menjaj T(...) linije ili pravila (RULES) ispod. */
(function () {
  'use strict';
  var LANGS = ['sr', 'en', 'ru', 'de'];
  var L = 'sr';
  try { var u = new URLSearchParams(location.search).get('lang'); if (u && LANGS.indexOf(u) > -1) L = u; } catch (e) {}
  if (L === 'sr') { try { var s = localStorage.getItem('sklopi_lang'); if (s && LANGS.indexOf(s) > -1) L = s; } catch (e) {} }
  var IDX = { en: 0, ru: 1, de: 2 }[L];

  /* ---------- dugme za jezik (radi i na srpskom) ---------- */
  function wireLangButton() {
    var b = document.querySelector('button[data-lang]');
    if (!b || b.getAttribute('data-i18n-wired')) return;
    b.setAttribute('data-i18n-wired', '1');
    b.textContent = L.toUpperCase();
    b.setAttribute('data-lang', L);
    b.addEventListener('click', function () {
      var next = LANGS[(LANGS.indexOf(L) + 1) % LANGS.length];
      try { localStorage.setItem('sklopi_lang', next); } catch (e) {}
      var q = new URLSearchParams(location.search); q.delete('lang');
      location.replace(location.pathname + (q.toString() ? '?' + q.toString() : '') + location.hash);
    });
  }
  document.documentElement.setAttribute('lang', L === 'sr' ? 'sr' : L);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireLangButton); else wireLangButton();
  if (L === 'sr') return;

  /* ---------- rečnik: T(srpski, en, ru, de) ---------- */
  var E = Object.create(null);
  function T(sr, en, ru, de) { E[sr] = [en, ru, de]; }

  /* interfejs */
  T(`Preskoči na sadržaj`, `Skip to content`, `Перейти к содержимому`, `Zum Inhalt springen`);
  T(`Nazad na pretragu`, `Back to search`, `Назад к поиску`, `Zurück zur Suche`);
  T(`Tvoje putovanje`, `Your trip`, `Ваша поездка`, `Deine Reise`);
  T(`Polazak:`, `Departure:`, `Вылет:`, `Abflug:`);
  T(`Polazak iz`, `Departing from`, `Вылет из`, `Abflug von`);
  T(`Destinacija`, `Destination`, `Направление`, `Reiseziel`);
  T(`Polazak`, `Departure`, `Вылет`, `Abflug`);
  T(`Povratak`, `Return`, `Возвращение`, `Rückreise`);
  T(`Broj putnika`, `Travelers`, `Количество путешественников`, `Anzahl der Reisenden`);
  T(`Prikaži ponude`, `Show offers`, `Показать предложения`, `Angebote anzeigen`);
  T(`Kuda putuješ?`, `Where are you going?`, `Куда едете?`, `Wohin geht die Reise?`);
  T(`Upiši destinaciju.`, `Enter a destination.`, `Введите направление.`, `Gib ein Reiseziel ein.`);
  T(`Izaberi datum polaska i povratka.`, `Choose your departure and return dates.`, `Выберите даты вылета и возвращения.`, `Wähle Hin- und Rückreisedatum.`);
  T(`Datum polaska je u prošlosti.`, `The departure date is in the past.`, `Дата вылета уже прошла.`, `Das Abflugdatum liegt in der Vergangenheit.`);
  T(`Povratak mora biti posle polaska.`, `The return must be after the departure.`, `Возвращение должно быть после вылета.`, `Die Rückreise muss nach dem Abflug liegen.`);
  T(`npr. Atina`, `e.g. Athens`, `напр. Афины`, `z. B. Athen`);
  T(`npr. Beograd`, `e.g. Belgrade`, `напр. Белград`, `z. B. Belgrad`);
  T(`Procena cene putovanja po destinaciji | SKLOPI`, `Trip price estimate by destination | SKLOPI`, `Оценка стоимости поездки по направлению | SKLOPI`, `Reisepreis-Schätzung nach Reiseziel | SKLOPI`);

  /* dokumenta za put */
  T(`Dokumenta za put`, `Travel documents`, `Документы для поездки`, `Reisedokumente`);
  T(`Da li si sve pokrio?`, `Have you covered everything?`, `Всё ли вы предусмотрели?`, `Hast du an alles gedacht?`);
  T(`Pasoš`, `Passport`, `Паспорт`, `Reisepass`);
  T(`Viza`, `Visa`, `Виза`, `Visum`);
  T(`Zelena karta`, `Green Card`, `Зелёная карта`, `Grüne Karte`);
  T(`Zelena karta.`, `Green Card.`, `Зелёная карта.`, `Grüne Karte.`);
  T(`Putno osiguranje`, `Travel insurance`, `Туристическая страховка`, `Reiseversicherung`);
  T(`Preporučeno za svaki put van zemlje — proveri ponudu World Nomads ili sličnog partnera pre polaska.`, `Recommended for every trip abroad — check the offer from World Nomads or a similar partner before you go.`, `Рекомендуется для любой поездки за границу — перед отъездом посмотрите предложение World Nomads или похожего партнёра.`, `Für jede Auslandsreise empfohlen — prüfe vor der Abreise das Angebot von World Nomads oder einem ähnlichen Partner.`);
  T(`Pravila ažurirana:`, `Rules updated:`, `Правила обновлены:`, `Regeln aktualisiert:`);
  T(`Uslovi ulaska se menjaju — proveri kod ambasade ili MUP-a pre puta.`, `Entry requirements change — check with the embassy or the Serbian Ministry of Interior (MUP) before you travel.`, `Условия въезда меняются — перед поездкой уточните в посольстве или в МВД Сербии (MUP).`, `Einreisebestimmungen ändern sich — erkundige dich vor der Reise bei der Botschaft oder dem serbischen Innenministerium (MUP).`);
  T(`Viza je obavezna`, `Visa required`, `Требуется виза`, `Visum erforderlich`);
  T(`Za Šengen zonu potreban je pasoš, a on mora da važi još najmanje 3 meseca nakon planiranog datuma povratka. Bez viza, do 90 dana u periodu od 180 dana.`, `A passport is required for the Schengen area, and it must be valid for at least 3 months after your planned return date. Visa-free for up to 90 days in any 180-day period.`, `Для Шенгенской зоны нужен паспорт, действительный ещё не менее 3 месяцев после планируемой даты возвращения. Без визы — до 90 дней в течение 180 дней.`, `Für den Schengen-Raum ist ein Reisepass nötig, der noch mindestens 3 Monate nach dem geplanten Rückreisedatum gültig sein muss. Ohne Visum bis zu 90 Tage innerhalb von 180 Tagen.`);
  T(`Za Tursku pasoš mora da važi još najmanje 150 dana (oko 5 meseci) od dana ulaska u zemlju.`, `For Turkey, your passport must be valid for at least 150 more days (about 5 months) from the day you enter the country.`, `Для Турции паспорт должен быть действителен ещё не менее 150 дней (около 5 месяцев) со дня въезда в страну.`, `Für die Türkei muss der Reisepass ab dem Einreisetag noch mindestens 150 Tage (ca. 5 Monate) gültig sein.`);
  T(`Za Kinu državljanima Srbije nije potrebna viza za turistički boravak do 30 dana, ali pasoš mora da važi još najmanje 6 meseci nakon povratka.`, `For China, Serbian citizens don’t need a visa for tourist stays of up to 30 days, but the passport must be valid for at least 6 months after your return.`, `Для Китая гражданам Сербии виза для туристической поездки до 30 дней не нужна, но паспорт должен быть действителен ещё не менее 6 месяцев после возвращения.`, `Für China brauchen serbische Staatsbürger für touristische Aufenthalte bis 30 Tage kein Visum, der Reisepass muss aber nach der Rückkehr noch mindestens 6 Monate gültig sein.`);
  T(`Uz vizu, pasoš uglavnom mora da važi još najmanje 6 meseci nakon planiranog povratka — konkretan rok proverava ambasada.`, `With a visa, the passport usually must be valid for at least 6 months after your planned return — the embassy checks the exact deadline.`, `При визе паспорт обычно должен быть действителен ещё не менее 6 месяцев после планируемого возвращения — точный срок уточняет посольство.`, `Bei einem Visum muss der Reisepass meist noch mindestens 6 Monate nach der geplanten Rückreise gültig sein — die genaue Frist prüft die Botschaft.`);
  T(`Ne znamo tačno u kojoj je zemlji ova destinacija, pa nemamo potvrđeno pravilo za dokumenta. Proveri uslove ulaska kod ambasade ili aviokompanije.`, `We don’t know exactly which country this destination is in, so we have no confirmed document rule. Check the entry requirements with the embassy or your airline.`, `Мы точно не знаем, в какой стране находится это направление, поэтому у нас нет подтверждённых правил по документам. Уточните условия въезда в посольстве или у авиакомпании.`, `Wir wissen nicht genau, in welchem Land dieses Reiseziel liegt, daher haben wir keine bestätigte Dokumentenregel. Prüfe die Einreisebedingungen bei der Botschaft oder deiner Fluggesellschaft.`);
  T(`Ne znamo u kojoj je zemlji ova destinacija, pa ne možemo da proverimo da li je potrebna zelena karta.`, `We don’t know which country this destination is in, so we can’t check whether a Green Card is required.`, `Мы не знаем, в какой стране находится это направление, поэтому не можем проверить, нужна ли зелёная карта.`, `Wir wissen nicht, in welchem Land dieses Reiseziel liegt, und können daher nicht prüfen, ob eine Grüne Karte nötig ist.`);
  T(`Državljanima Srbije je potrebna prava viza za Veliku Britaniju (uključujući London i tranzit bez izlaska iz aerodroma) — ovo nije samo provera pasoša. Standardna turistička viza obično se obrađuje oko 3 nedelje, pa prijavu treba podneti mnogo pre kupovine nepovratnih karata.`, `Serbian citizens need a real visa for the United Kingdom (including London and transit without leaving the airport) — this is not just a passport check. A standard tourist visa usually takes about 3 weeks to process, so apply well before buying non-refundable tickets.`, `Гражданам Сербии нужна настоящая виза в Великобританию (включая Лондон и транзит без выхода из аэропорта) — это не просто проверка паспорта. Обычная туристическая виза обрабатывается около 3 недель, поэтому подавать заявление нужно задолго до покупки невозвратных билетов.`, `Serbische Staatsbürger brauchen für das Vereinigte Königreich ein echtes Visum (auch für London und für den Transit ohne Verlassen des Flughafens) — das ist nicht nur eine Passkontrolle. Ein normales Touristenvisum wird meist in etwa 3 Wochen bearbeitet, beantrage es daher lange vor dem Kauf nicht erstattbarer Tickets.`);
  T(`Državljanima Srbije je potrebna prava viza za Irsku — stara pogodnost putovanja preko britanske vize je ukinuta 2020. i nije vraćena. Prijavu za vizu treba podneti mnogo pre kupovine nepovratnih karata.`, `Serbian citizens need a real visa for Ireland — the old option of travelling on a British visa was abolished in 2020 and has not been restored. Apply for the visa well before buying non-refundable tickets.`, `Гражданам Сербии нужна настоящая виза в Ирландию — прежняя возможность ездить по британской визе отменена в 2020 году и не возвращена. Заявление на визу нужно подавать задолго до покупки невозвратных билетов.`, `Serbische Staatsbürger brauchen für Irland ein echtes Visum — die frühere Möglichkeit, mit einem britischen Visum einzureisen, wurde 2020 abgeschafft und nicht wieder eingeführt. Beantrage das Visum lange vor dem Kauf nicht erstattbarer Tickets.`);
  T(`Državljanima Srbije je potrebna prava viza za SAD (obično turistička B1/B2) — ovo nije samo provera pasoša. Traži se obavezan intervju u ambasadi u Beogradu, taksa oko 185 USD, a na termin se čeka od par nedelja do više meseci u zavisnosti od perioda. Prijavu treba podneti mnogo pre kupovine nepovratnih karata.`, `Serbian citizens need a real visa for the USA (usually a B1/B2 tourist visa) — this is not just a passport check. A mandatory interview at the embassy in Belgrade is required, the fee is about 185 USD, and the wait for an appointment ranges from a couple of weeks to several months depending on the period. Apply well before buying non-refundable tickets.`, `Гражданам Сербии нужна настоящая виза в США (обычно туристическая B1/B2) — это не просто проверка паспорта. Обязательно собеседование в посольстве в Белграде, сбор около 185 USD, а ожидание записи — от пары недель до нескольких месяцев в зависимости от периода. Заявление нужно подавать задолго до покупки невозвратных билетов.`, `Serbische Staatsbürger brauchen für die USA ein echtes Visum (meist ein B1/B2-Touristenvisum) — das ist nicht nur eine Passkontrolle. Erforderlich ist ein Pflichtinterview in der Botschaft in Belgrad, die Gebühr beträgt etwa 185 USD, und auf einen Termin wartet man je nach Zeitraum von ein paar Wochen bis zu mehreren Monaten. Beantrage es lange vor dem Kauf nicht erstattbarer Tickets.`);
  T(`Državljanima Srbije je potrebna prava viza za Kanadu (Kanada nema eTA olakšicu za srpski pasoš) — ovo nije samo provera pasoša. Obrada uključuje biometriju i obično traje oko 2-4 nedelje, pa prijavu treba podneti mnogo pre kupovine nepovratnih karata.`, `Serbian citizens need a real visa for Canada (Canada has no eTA exemption for the Serbian passport) — this is not just a passport check. Processing includes biometrics and usually takes about 2–4 weeks, so apply well before buying non-refundable tickets.`, `Гражданам Сербии нужна настоящая виза в Канаду (для сербского паспорта упрощённого режима eTA нет) — это не просто проверка паспорта. Обработка включает биометрию и обычно занимает около 2–4 недель, поэтому подавать заявление нужно задолго до покупки невозвратных билетов.`, `Serbische Staatsbürger brauchen für Kanada ein echtes Visum (für den serbischen Pass gibt es keine eTA-Erleichterung) — das ist nicht nur eine Passkontrolle. Die Bearbeitung umfasst biometrische Daten und dauert meist etwa 2–4 Wochen, beantrage es daher lange vor dem Kauf nicht erstattbarer Tickets.`);
  T(`Za Severnu Makedoniju je zelena karta i dalje obavezna — nije potpisnica Multilateralnog sporazuma sa Srbijom.`, `For North Macedonia, the Green Card is still mandatory — it is not a party to the Multilateral Agreement with Serbia.`, `Для Северной Македонии зелёная карта по-прежнему обязательна — она не участвует в Многостороннем соглашении с Сербией.`, `Für Nordmazedonien ist die Grüne Karte weiterhin Pflicht — das Land ist nicht Vertragspartei des Multilateralen Abkommens mit Serbien.`);

  /* ponude i kartice */
  T(`Najjeftiniji let`, `Cheapest flight`, `Самый дешёвый рейс`, `Günstigster Flug`);
  T(`Pogledaj letove`, `View flights`, `Смотреть рейсы`, `Flüge ansehen`);
  T(`Pregled puta`, `Trip overview`, `Обзор поездки`, `Reiseübersicht`);
  T(`Podeli`, `Share`, `Поделиться`, `Teilen`);
  T(`Afilijacija`, `Affiliate`, `Партнёрская ссылка`, `Partnerlink`);
  T(`Ovo je afilijacijski (sponzorisan) link — ako rezervišeš preko njega, SKLOPI može ostvariti provizuju od partnera. Cena za tebe ostaje ista.`, `This is an affiliate (sponsored) link — if you book through it, SKLOPI may earn a commission from the partner. The price stays the same for you.`, `Это партнёрская (спонсируемая) ссылка — если вы забронируете через неё, SKLOPI может получить комиссию от партнёра. Для вас цена остаётся прежней.`, `Dies ist ein Affiliate-Link (gesponsert) — wenn du darüber buchst, kann SKLOPI eine Provision vom Partner erhalten. Der Preis bleibt für dich gleich.`);
  T(`Let`, `Flight`, `Рейс`, `Flug`);
  T(`Smeštaj`, `Accommodation`, `Проживание`, `Unterkunft`);
  T(`Atrakcije`, `Attractions`, `Достопримечательности`, `Attraktionen`);
  T(`Auto`, `Car`, `Авто`, `Auto`);
  T(`Osiguranje`, `Insurance`, `Страховка`, `Versicherung`);
  T(`O mestu`, `About`, `О месте`, `Über den Ort`);
  T(`Praktično`, `Practical`, `Практика`, `Praktisches`);
  T(`Cene su ilustrativne procene. Dugme otvara pretragu kod partnera sa tvojim datumima, a tačnu cenu i dostupnost potvrđuješ tamo.`, `Prices are illustrative estimates. The button opens a search with the partner using your dates, and you confirm the exact price and availability there.`, `Цены — ориентировочные оценки. Кнопка открывает поиск у партнёра с вашими датами, а точную цену и наличие вы подтверждаете там.`, `Die Preise sind illustrative Schätzungen. Die Schaltfläche öffnet die Suche beim Partner mit deinen Daten; den genauen Preis und die Verfügbarkeit bestätigst du dort.`);
  T(`Sve što treba da znaš pre polaska.`, `Everything you need to know before you go.`, `Всё, что нужно знать перед поездкой.`, `Alles, was du vor der Abreise wissen musst.`);
  T(`Avio prevoz`, `Flights`, `Авиаперелёты`, `Flüge`);
  T(`Atrakcije i aktivnosti`, `Attractions & activities`, `Достопримечательности и активности`, `Attraktionen & Aktivitäten`);
  T(`Rent a car`, `Car rental`, `Аренда авто`, `Mietwagen`);
  T(`primer`, `example`, `пример`, `Beispiel`);
  T(`test podaci`, `test data`, `тестовые данные`, `Testdaten`);
  T(`Dodaj u put`, `Add to trip`, `Добавить в поездку`, `Zur Reise hinzufügen`);
  T(`U tvom putu`, `In your trip`, `В вашей поездке`, `In deiner Reise`);
  T(`Prikaži manje`, `Show less`, `Свернуть`, `Weniger anzeigen`);
  T(`Aviokompanija`, `Airline`, `Авиакомпания`, `Fluggesellschaft`);
  T(`Tražimo letove za tvoje datume…`, `Searching flights for your dates…`, `Ищем рейсы на ваши даты…`, `Wir suchen Flüge für deine Daten…`);
  T(`ukupno, povratna karta`, `total, round trip`, `итого, туда и обратно`, `gesamt, Hin- und Rückflug`);
  T(`po osobi`, `per person`, `на человека`, `pro Person`);
  T(`Mini`, `Mini`, `Мини`, `Mini`);

  /* smeštaj / aktivnosti / rent a car */
  T(`Pešačka tura starim gradom`, `Walking tour of the old town`, `Пешеходная экскурсия по старому городу`, `Rundgang durch die Altstadt`);
  T(`Ulaznice za glavne atrakcije`, `Tickets to the main attractions`, `Билеты на главные достопримечательности`, `Eintrittskarten für die Hauptattraktionen`);
  T(`Poludnevna tura sa vodičem`, `Half-day guided tour`, `Полудневная экскурсия с гидом`, `Halbtägige geführte Tour`);
  T(`Obilazak biciklom`, `Bike tour`, `Велотур`, `Radtour`);
  T(`Obilazak grada autobusom (hop-on hop-off)`, `City bus tour (hop-on hop-off)`, `Обзорная экскурсия на автобусе (hop-on hop-off)`, `Stadtrundfahrt mit dem Bus (Hop-on-Hop-off)`);
  T(`Večernja tura`, `Evening tour`, `Вечерняя экскурсия`, `Abendtour`);
  T(`Kulinarska tura`, `Food tour`, `Гастрономический тур`, `Kulinarische Tour`);
  T(`Privatna tura`, `Private tour`, `Частная экскурсия`, `Private Tour`);
  T(`Degustacija vina`, `Wine tasting`, `Дегустация вин`, `Weinverkostung`);
  T(`Celodnevni izlet iz grada`, `Full-day trip from the city`, `Однодневная поездка из города`, `Ganztagsausflug ab der Stadt`);
  var HOTEL = {
    'najpovoljniji': ['cheapest', 'самый выгодный', 'günstigster'],
    'standard': ['standard', 'стандарт', 'Standard'],
    'blizu centra': ['near the centre', 'рядом с центром', 'zentrumsnah'],
    'povoljniji': ['more affordable', 'более доступный', 'preiswerter'],
    'najbolji odnos cene i kvaliteta': ['best value for money', 'лучшее соотношение цены и качества', 'bestes Preis-Leistungs-Verhältnis'],
    'najbolje ocenjeni': ['top rated', 'с лучшими оценками', 'am besten bewertet'],
    'više komfora': ['more comfort', 'больше комфорта', 'mehr Komfort'],
    'luksuz': ['luxury', 'люкс', 'Luxus']
  };
  var CARCLASS = {
    'Mini': ['Mini', 'Мини', 'Mini'], 'Ekonomik': ['Economy', 'Эконом', 'Economy'], 'Kompakt': ['Compact', 'Компакт', 'Kompakt'],
    'Kompakt automatik': ['Compact automatic', 'Компакт, автомат', 'Kompakt Automatik'], 'Kombi': ['Estate', 'Универсал', 'Kombi'],
    'Porodični': ['Family', 'Семейный', 'Familie'], 'Mali SUV': ['Small SUV', 'Малый SUV', 'Kleiner SUV'], 'SUV': ['SUV', 'SUV', 'SUV'],
    'Kabriolet': ['Convertible', 'Кабриолет', 'Cabrio'], 'Premium': ['Premium', 'Премиум', 'Premium']
  };

  /* praktične informacije */
  T(`Praktične informacije`, `Practical information`, `Практическая информация`, `Praktische Informationen`);
  T(`Ruta · Transferi · Autobus · Saveti`, `Route · Transfers · Bus · Tips`, `Маршрут · Трансферы · Автобус · Советы`, `Route · Transfers · Bus · Tipps`);
  T(`Ruta`, `Route`, `Маршрут`, `Route`);
  T(`Ako voziš do destinacije`, `If you’re driving there`, `Если вы едете на машине`, `Wenn du mit dem Auto anreist`);
  T(`Otvori rutu`, `Open route`, `Открыть маршрут`, `Route öffnen`);
  T(`Transferi`, `Transfers`, `Трансферы`, `Transfers`);
  T(`Nema sopstveni aerodrom`, `No airport of its own`, `Нет собственного аэропорта`, `Kein eigener Flughafen`);
  T(`Pazi na koji aerodrom slećeš`, `Watch which airport you land at`, `Обратите внимание, в какой аэропорт вы прилетаете`, `Achte darauf, an welchem Flughafen du landest`);
  T(`Kako uštedeti`, `How to save`, `Как сэкономить`, `So sparst du`);
  T(`Javni prevoz od aerodroma je u većini evropskih gradova 5–10x jeftiniji od taksija, uz razliku od 20–30 minuta u vremenu. Deljeni šatl je kompromis, a privatni transfer rezervisan unapred (fiksna cena) skoro je uvek jeftiniji i sigurniji od pregovaranja sa taksistom na licu mesta.`, `Public transport from the airport is 5–10x cheaper than a taxi in most European cities, at a cost of 20–30 extra minutes. A shared shuttle is a compromise, and a private transfer booked in advance (fixed price) is almost always cheaper and safer than haggling with a taxi driver on the spot.`, `Общественный транспорт из аэропорта в большинстве европейских городов в 5–10 раз дешевле такси, при разнице во времени 20–30 минут. Групповой шаттл — компромисс, а частный трансфер, заказанный заранее (фиксированная цена), почти всегда дешевле и безопаснее, чем торговаться с таксистом на месте.`, `Öffentliche Verkehrsmittel vom Flughafen sind in den meisten europäischen Städten 5–10-mal günstiger als ein Taxi, bei einem Zeitunterschied von 20–30 Minuten. Ein Shuttle-Bus ist ein Kompromiss, und ein im Voraus gebuchter privater Transfer (Festpreis) ist fast immer günstiger und sicherer als das Feilschen mit dem Taxifahrer vor Ort.`);
  T(`Zamka na koju paziti`, `A trap to watch out for`, `Ловушка, на которую стоит обратить внимание`, `Eine Falle, auf die du achten solltest`);
  T(`Taksi bez taksimetra ili sa „specijalnom turističkom cenom" na aerodromu je čest trik na mnogim destinacijama — unapred rezervisan transfer ili proverena aplikacija (gde je dostupna) eliminišu taj rizik.`, `A taxi without a meter, or with a “special tourist price”, at the airport is a common trick in many destinations — a pre-booked transfer or a trusted app (where available) removes that risk.`, `Такси без счётчика или со «специальной туристической ценой» в аэропорту — частый трюк во многих направлениях; заранее заказанный трансфер или проверенное приложение (где доступно) устраняют этот риск.`, `Ein Taxi ohne Taxameter oder mit einem „speziellen Touristenpreis“ am Flughafen ist an vielen Reisezielen ein häufiger Trick — ein vorab gebuchter Transfer oder eine vertrauenswürdige App (wo verfügbar) beseitigt dieses Risiko.`);
  T(`Autobus`, `Bus`, `Автобус`, `Bus`);
  T(`Autobus kao alternativa`, `Bus as an alternative`, `Автобус как альтернатива`, `Bus als Alternative`);
  T(`Za ovu destinaciju autobus je sporija, ali obično znatno jeftinija alternativa letu. Međugradski i međunarodni prevoznici (npr. FlixBus i regionalne linije) često voze direktno iz Beograda ili obližnjih gradova.`, `For this destination the bus is a slower but usually much cheaper alternative to flying. Intercity and international carriers (e.g. FlixBus and regional lines) often run directly from Belgrade or nearby cities.`, `Для этого направления автобус — более медленная, но обычно значительно более дешёвая альтернатива перелёту. Междугородные и международные перевозчики (например, FlixBus и региональные линии) часто ходят напрямую из Белграда или ближайших городов.`, `Für dieses Reiseziel ist der Bus eine langsamere, aber meist deutlich günstigere Alternative zum Flug. Fernbus- und internationale Anbieter (z. B. FlixBus und regionale Linien) fahren oft direkt ab Belgrad oder aus nahe gelegenen Städten.`);
  T(`Kada se isplati`, `When it pays off`, `Когда это выгодно`, `Wann es sich lohnt`);
  T(`Autobus najviše ima smisla za putovanja do 8–10h vožnje, ili kad je razlika u ceni prema letu velika — za duže rute vreme provedeno na putu obično nadmaši uštedu.`, `The bus makes the most sense for trips of up to 8–10 hours of driving, or when the price difference compared with flying is large — on longer routes the time spent travelling usually outweighs the savings.`, `Автобус больше всего имеет смысл для поездок до 8–10 часов в пути или когда разница в цене с перелётом велика — на более длинных маршрутах время в дороге обычно перевешивает экономию.`, `Der Bus lohnt sich vor allem bei Fahrten bis zu 8–10 Stunden oder wenn der Preisunterschied zum Flug groß ist — auf längeren Strecken überwiegt die verlorene Reisezeit meist die Ersparnis.`);
  T(`Nije realna opcija iz Srbije`, `Not a realistic option from Serbia`, `Нереалистичный вариант из Сербии`, `Keine realistische Option ab Serbien`);
  T(`Do ovog ostrva se ne stiže autobusom iz Srbije — do najbližeg kopna ili luke ideš avionom ili trajektom, a autobus dolazi u obzir tek na samom ostrvu.`, `You can’t reach this island by bus from Serbia — you take a plane or ferry to the nearest mainland or port, and a bus only comes into play on the island itself.`, `До этого острова нельзя добраться на автобусе из Сербии — до ближайшего материка или порта вы летите самолётом или плывёте на пароме, а автобус нужен только на самом острове.`, `Diese Insel ist ab Serbien nicht mit dem Bus erreichbar — bis zum nächsten Festland oder Hafen fliegst du oder nimmst die Fähre, und der Bus kommt erst auf der Insel selbst in Frage.`);
  T(`Do ove destinacije se ne stiže autobusom iz Srbije zbog udaljenosti — let je jedina praktična opcija.`, `This destination can’t be reached by bus from Serbia because of the distance — flying is the only practical option.`, `До этого направления нельзя добраться на автобусе из Сербии из-за расстояния — единственный практичный вариант — перелёт.`, `Dieses Reiseziel ist ab Serbien wegen der Entfernung nicht mit dem Bus erreichbar — ein Flug ist die einzige praktische Option.`);
  T(`Do ovog ostrva se ide avionom ili trajektom, pa auto obično iznajmljuješ tek na licu mesta.`, `This island is reached by plane or ferry, so you usually rent a car only on the spot.`, `До этого острова добираются самолётом или паромом, поэтому машину обычно арендуют уже на месте.`, `Diese Insel erreicht man per Flugzeug oder Fähre, deshalb mietest du ein Auto meist erst vor Ort.`);
  T(`Do ove destinacije se ne stiže automobilom iz Srbije, pa auto iznajmljuješ na licu mesta.`, `This destination can’t be reached by car from Serbia, so you rent a car on the spot.`, `До этого направления нельзя добраться на машине из Сербии, поэтому авто арендуют на месте.`, `Dieses Reiseziel ist ab Serbien nicht mit dem Auto erreichbar, daher mietest du ein Auto vor Ort.`);
  T(`Ovu destinaciju još nemamo u bazi saveta, pa su prikazani samo opšti podaci.`, `We don’t have this destination in our tips database yet, so only general information is shown.`, `Этого направления пока нет в нашей базе советов, поэтому показана только общая информация.`, `Dieses Reiseziel ist noch nicht in unserer Tipp-Datenbank, daher werden nur allgemeine Angaben angezeigt.`);

  /* osiguranje i eSIM */
  T(`Zašto je važno`, `Why it matters`, `Почему это важно`, `Warum das wichtig ist`);
  T(`Zdravstveni tretman u inostranstvu bez osiguranja može koštati hiljade evra za ozbiljniji slučaj — ovo je stavka gde ušteda od par evra nosi nesrazmeran rizik.`, `Medical treatment abroad without insurance can cost thousands of euros in a serious case — this is an item where saving a few euros carries a disproportionate risk.`, `Лечение за границей без страховки в серьёзном случае может стоить тысячи евро — здесь экономия в пару евро несёт несоразмерный риск.`, `Eine medizinische Behandlung im Ausland ohne Versicherung kann bei einem ernsteren Fall Tausende Euro kosten — hier birgt die Ersparnis von ein paar Euro ein unverhältnismäßiges Risiko.`);
  T(`Pre kupovine nove polise`, `Before buying a new policy`, `Перед покупкой нового полиса`, `Bevor du eine neue Police kaufst`);
  T(`Neke bankovne kartice (premium paketi) uključuju putno osiguranje besplatno — proveri to pre nego što platiš novu polisu.`, `Some bank cards (premium packages) include travel insurance for free — check that before you pay for a new policy.`, `Некоторые банковские карты (премиум-пакеты) включают туристическую страховку бесплатно — проверьте это, прежде чем платить за новый полис.`, `Manche Bankkarten (Premium-Pakete) enthalten eine Reiseversicherung kostenlos — prüfe das, bevor du eine neue Police bezahlst.`);
  T(`Uporedi ponude na World Nomads`, `Compare offers on World Nomads`, `Сравнить предложения на World Nomads`, `Angebote bei World Nomads vergleichen`);
  T(`Uz vizu`, `With a visa`, `Для визы`, `Beim Visum`);
  T(`Roming van paketa operatera (van EU ili van regiona) može biti i desetine puta skuplji od lokalnog interneta. eSIM se kupuje unapred i aktivira tek po sletanju.`, `Roaming outside your operator’s plan (outside the EU or the region) can be tens of times more expensive than local data. An eSIM is bought in advance and only activated after landing.`, `Роуминг вне пакета оператора (за пределами ЕС или региона) может быть в десятки раз дороже местного интернета. eSIM покупают заранее и активируют только после приземления.`, `Roaming außerhalb des Pakets deines Anbieters (außerhalb der EU oder der Region) kann um ein Vielfaches teurer sein als lokales Internet. Die eSIM kauft man im Voraus und aktiviert sie erst nach der Landung.`);
  T(`Pre kupovine proveri`, `Check before you buy`, `Проверьте перед покупкой`, `Vor dem Kauf prüfen`);
  T(`Da li telefon podržava eSIM (uglavnom noviji modeli od 2019+), i da li ti je za ovu dužinu putovanja isplativiji fiksni paket (npr. 10GB/10 dana) od dnevnog.`, `Whether your phone supports eSIM (mostly newer models from 2019 onwards), and whether a fixed package (e.g. 10GB/10 days) is better value than a daily plan for this trip length.`, `Поддерживает ли ваш телефон eSIM (в основном модели 2019 года и новее) и выгоднее ли для такой длительности поездки фиксированный пакет (например, 10 ГБ/10 дней), чем посуточный тариф.`, `Ob dein Handy eSIM unterstützt (meist neuere Modelle ab 2019) und ob sich für diese Reisedauer ein Festpaket (z. B. 10 GB/10 Tage) eher lohnt als ein Tagestarif.`);
  T(`Pogledaj pakete na Airalo`, `View packages on Airalo`, `Смотреть пакеты на Airalo`, `Pakete bei Airalo ansehen`);
  T(`Napomena`, `Note`, `Примечание`, `Hinweis`);
  T(`Saveti za putovanje`, `Travel tips`, `Советы путешественникам`, `Reisetipps`);
  T(`Dokumenta`, `Documents`, `Документы`, `Dokumente`);
  T(`Najbolje vreme za posetu`, `Best time to visit`, `Лучшее время для поездки`, `Beste Reisezeit`);
  T(`Valuta`, `Currency`, `Валюта`, `Währung`);
  T(`Linkovi ka KAYAK-u, Booking.com-u, Viator-u, Airalo-u i World Nomads-u su partnerski: SKLOPI može da dobije proviziju, a tebi cena ostaje ista. Cene i dostupnost potvrđuješ na sajtu partnera.`, `Links to KAYAK, Booking.com, Viator, Airalo and World Nomads are affiliate links: SKLOPI may receive a commission, and the price stays the same for you. You confirm prices and availability on the partner’s site.`, `Ссылки на KAYAK, Booking.com, Viator, Airalo и World Nomads — партнёрские: SKLOPI может получить комиссию, а для вас цена остаётся прежней. Цены и наличие вы подтверждаете на сайте партнёра.`, `Links zu KAYAK, Booking.com, Viator, Airalo und World Nomads sind Partnerlinks: SKLOPI kann eine Provision erhalten, für dich bleibt der Preis gleich. Preise und Verfügbarkeit bestätigst du auf der Seite des Partners.`);

  /* zbir puta (donja traka i specifikacija) */
  T(`Tvoj put`, `Your trip`, `Ваша поездка`, `Deine Reise`);
  T(`Pogledaj`, `View`, `Смотреть`, `Ansehen`);
  T(`Specifikacija`, `Breakdown`, `Детали`, `Aufschlüsselung`);
  T(`Sakrij specifikaciju`, `Hide breakdown`, `Скрыть детали`, `Aufschlüsselung ausblenden`);
  T(`Zatvori specifikaciju`, `Close breakdown`, `Закрыть детали`, `Aufschlüsselung schließen`);
  T(`Rezervišeš kod partnera`, `You book with partners`, `Бронируете у партнёров`, `Du buchst bei Partnern`);
  T(`Plaćaš na licu mesta`, `You pay on site`, `Оплачиваете на месте`, `Du zahlst vor Ort`);
  T(`Međuzbir`, `Subtotal`, `Промежуточный итог`, `Zwischensumme`);
  T(`UKUPNO`, `TOTAL`, `ИТОГО`, `GESAMT`);
  T(`Podeli put`, `Share trip`, `Поделиться поездкой`, `Reise teilen`);
  T(`Isprazni put`, `Clear trip`, `Очистить поездку`, `Reise leeren`);
  T(`Ukloni`, `Remove`, `Удалить`, `Entfernen`);
  T(`Podeli ovaj put`, `Share this trip`, `Поделиться этой поездкой`, `Diese Reise teilen`);
  T(`Boravišna taksa (okvirno)`, `Tourist tax (approx.)`, `Курортный сбор (ориентировочно)`, `Kurtaxe (ca.)`);
  T(`plaća se u smeštaju`, `paid at the accommodation`, `оплачивается в месте проживания`, `wird in der Unterkunft bezahlt`);
  T(`Ilustrativna procena. Aktivnosti, eSIM i boravišna taksa računati su za sve putnike. Tačnu cenu i dostupnost potvrđuješ kod partnera pre rezervacije.`, `Illustrative estimate. Activities, eSIM and tourist tax are calculated for all travelers. You confirm the exact price and availability with the partner before booking.`, `Ориентировочная оценка. Активности, eSIM и курортный сбор рассчитаны на всех путешественников. Точную цену и наличие вы подтверждаете у партнёра перед бронированием.`, `Illustrative Schätzung. Aktivitäten, eSIM und Kurtaxe sind für alle Reisenden berechnet. Den genauen Preis und die Verfügbarkeit bestätigst du vor der Buchung beim Partner.`);
  T(`Neke stavke iz tvog prethodnog izbora više nisu dostupne.`, `Some items from your previous selection are no longer available.`, `Некоторые позиции из вашего предыдущего выбора больше недоступны.`, `Einige Positionen aus deiner früheren Auswahl sind nicht mehr verfügbar.`);
  T(`Neke stavke iz podeljenog linka više nisu dostupne pa nisu dodate.`, `Some items from the shared link are no longer available, so they were not added.`, `Некоторые позиции из общей ссылки больше недоступны, поэтому они не добавлены.`, `Einige Positionen aus dem geteilten Link sind nicht mehr verfügbar und wurden nicht hinzugefügt.`);
  T(`Vraćen je tvoj prethodni izbor.`, `Your previous selection has been restored.`, `Ваш предыдущий выбор восстановлен.`, `Deine frühere Auswahl wurde wiederhergestellt.`);
  T(`Link do tvog puta je kopiran.`, `The link to your trip has been copied.`, `Ссылка на вашу поездку скопирована.`, `Der Link zu deiner Reise wurde kopiert.`);

  /* podnožje i navigacija */
  T(`Pomoć i FAQ`, `Help & FAQ`, `Помощь и FAQ`, `Hilfe & FAQ`);
  T(`Vodiči`, `Guides`, `Гайды`, `Reiseführer`);
  T(`Kontakt`, `Contact`, `Контакты`, `Kontakt`);
  T(`Privatnost`, `Privacy`, `Конфиденциальность`, `Datenschutz`);
  T(`Uslovi`, `Terms`, `Условия`, `Nutzungsbedingungen`);
  T(`Kolačići`, `Cookies`, `Cookie`, `Cookies`);
  T(`SKLOPI — prototip proizvoda u razvoju. Prikazane cene su ilustrativne (simulirane radi demonstracije), ne dolaze uživo od partnera i ne predstavljaju stvarnu ponudu ni obavezu na cenu.`, `SKLOPI — a product prototype in development. Prices shown are illustrative (simulated for demonstration), don’t come live from partners, and don’t represent a real offer or price commitment.`, `SKLOPI — прототип продукта в разработке. Показанные цены иллюстративны (смоделированы для демонстрации), не поступают напрямую от партнёров и не являются реальным предложением или обязательством по цене.`, `SKLOPI – ein Produktprototyp im Aufbau. Die angezeigten Preise sind beispielhaft (zu Demonstrationszwecken simuliert), kommen nicht live von Partnern und stellen kein echtes Angebot und keine Preisgarantie dar.`);
  T(`Početna`, `Home`, `Главная`, `Start`);
  T(`Destinacije`, `Destinations`, `Направления`, `Reiseziele`);
  T(`Moj put`, `My trip`, `Моя поездка`, `Meine Reise`);
  T(`Glavna navigacija`, `Main navigation`, `Главная навигация`, `Hauptnavigation`);
  T(`Brza navigacija`, `Quick navigation`, `Быстрая навигация`, `Schnellnavigation`);
  T(`SKLOPI — početna`, `SKLOPI — home`, `SKLOPI — главная`, `SKLOPI — Startseite`);
  T(`Promeni valutu`, `Change currency`, `Сменить валюту`, `Währung wechseln`);
  T(`Prethodne ponude`, `Previous offers`, `Предыдущие предложения`, `Vorherige Angebote`);
  T(`Sledeće ponude`, `Next offers`, `Следующие предложения`, `Nächste Angebote`);
  T(`Ponude letova`, `Flight offers`, `Предложения по рейсам`, `Flugangebote`);
  T(`Ponude smeštaja`, `Accommodation offers`, `Предложения по проживанию`, `Unterkunftsangebote`);
  T(`Ponude atrakcija`, `Attraction offers`, `Предложения по достопримечательностям`, `Attraktionsangebote`);
  T(`Ponude rent a car`, `Car rental offers`, `Предложения по аренде авто`, `Mietwagenangebote`);

  /* airport notes */
  T(`London ima više aerodroma — Hitrou je najbliži centru, ali low-cost kompanije često slede na Stansted ili Luton, 45-75 minuta dalje od grada. Proveri tačan aerodrom pre nego što planiraš prevoz do centra.`, `London has several airports — Heathrow is the closest to the centre, but low-cost airlines often land at Stansted or Luton, 45–75 minutes from the city. Check the exact airport before planning your transfer to the centre.`, `В Лондоне несколько аэропортов — Хитроу ближе всего к центру, но лоукостеры часто садятся в Станстед или Лутон, в 45–75 минутах от города. Уточните аэропорт, прежде чем планировать трансфер в центр.`, `London hat mehrere Flughäfen — Heathrow liegt dem Zentrum am nächsten, aber Low-Cost-Airlines landen oft in Stansted oder Luton, 45–75 Minuten von der Stadt entfernt. Prüfe den genauen Flughafen, bevor du den Transfer ins Zentrum planst.`);
  T(`Pariz ima tri aerodroma — Šarl de Gol i Orli su blizu grada, ali Ryanair i slične kompanije često koriste Bove (Beauvais), oko 85km severno, sa transferom od preko sat vremena do centra.`, `Paris has three airports — Charles de Gaulle and Orly are close to the city, but Ryanair and similar airlines often use Beauvais, about 85 km to the north, with a transfer of over an hour to the centre.`, `В Париже три аэропорта — Шарль-де-Голль и Орли находятся рядом с городом, но Ryanair и похожие компании часто используют Бове (Beauvais) примерно в 85 км к северу, с трансфером до центра более часа.`, `Paris hat drei Flughäfen — Charles de Gaulle und Orly liegen nahe der Stadt, aber Ryanair und ähnliche Airlines nutzen oft Beauvais, etwa 85 km nördlich, mit über einer Stunde Transfer ins Zentrum.`);
  T(`Brisel ima glavni aerodrom blizu grada, ali low-cost letovi često slede u Šarlroa, oko 50km južnije — računaj dodatni sat vožnje i trošak prevoza do centra.`, `Brussels has a main airport close to the city, but low-cost flights often land at Charleroi, about 50 km further south — allow an extra hour of travel and the cost of getting to the centre.`, `В Брюсселе есть главный аэропорт рядом с городом, но лоукост-рейсы часто садятся в Шарлеруа, примерно в 50 км южнее — рассчитывайте дополнительный час дороги и расходы на проезд до центра.`, `Brüssel hat einen Hauptflughafen nahe der Stadt, aber Low-Cost-Flüge landen oft in Charleroi, etwa 50 km weiter südlich — plane eine zusätzliche Stunde Fahrt und die Transferkosten ins Zentrum ein.`);
  T(`Frankfurt ima dva aerodroma pod sličnim imenom — glavni je blizu grada, dok je Han (Hahn) oko 120km zapadno, bliže Luksemburgu nego Frankfurtu. Ryanair često leti baš tamo, sa transferom i do 2h.`, `Frankfurt has two airports with similar names — the main one is close to the city, while Hahn is about 120 km to the west, closer to Luxembourg than to Frankfurt. Ryanair often flies exactly there, with a transfer of up to 2 hours.`, `У Франкфурта два аэропорта с похожими названиями — главный находится рядом с городом, а Хан (Hahn) — примерно в 120 км к западу, ближе к Люксембургу, чем к Франкфурту. Ryanair часто летает именно туда, трансфер занимает до 2 часов.`, `Frankfurt hat zwei Flughäfen mit ähnlichem Namen — der Hauptflughafen liegt nahe der Stadt, Hahn dagegen etwa 120 km westlich, näher an Luxemburg als an Frankfurt. Ryanair fliegt oft genau dorthin, mit bis zu 2 Stunden Transfer.`);
  T(`Barselona ima glavni aerodrom blizu grada (El Prat), ali neki low-cost letovi slede u Đironu ili Reus, stotinak kilometara dalje, sa transferom od preko sat vremena.`, `Barcelona has a main airport close to the city (El Prat), but some low-cost flights land at Girona or Reus, about a hundred kilometres away, with a transfer of over an hour.`, `В Барселоне есть главный аэропорт рядом с городом (Эль-Прат), но некоторые лоукост-рейсы садятся в Жироне или Реусе, примерно в сотне километров, с трансфером более часа.`, `Barcelona hat einen Hauptflughafen nahe der Stadt (El Prat), aber manche Low-Cost-Flüge landen in Girona oder Reus, etwa hundert Kilometer entfernt, mit über einer Stunde Transfer.`);
  T(`Rim ima dva aerodroma — Fjumičino (glavni, malo dalji od centra) i Čampino (bliži centru, manji, koriste ga neke low-cost kompanije).`, `Rome has two airports — Fiumicino (the main one, a bit further from the centre) and Ciampino (closer to the centre, smaller, used by some low-cost airlines).`, `В Риме два аэропорта — Фьюмичино (главный, немного дальше от центра) и Чампино (ближе к центру, меньше, им пользуются некоторые лоукост-компании).`, `Rom hat zwei Flughäfen — Fiumicino (der Hauptflughafen, etwas weiter vom Zentrum) und Ciampino (näher am Zentrum, kleiner, von einigen Low-Cost-Airlines genutzt).`);
  T(`Stokholm ima glavni aerodrom Arlanda, ali Ryanair često leti u Skavstu, oko 100km južnije — transfer do centra traje i do sat i po.`, `Stockholm’s main airport is Arlanda, but Ryanair often flies to Skavsta, about 100 km to the south — the transfer to the centre takes up to an hour and a half.`, `Главный аэропорт Стокгольма — Арланда, но Ryanair часто летает в Скавсту, примерно в 100 км южнее — трансфер до центра занимает до полутора часов.`, `Stockholms Hauptflughafen ist Arlanda, aber Ryanair fliegt oft nach Skavsta, etwa 100 km südlich — der Transfer ins Zentrum dauert bis zu anderthalb Stunden.`);
  T(`Oslo ima glavni aerodrom Gardermoen, ali neki low-cost letovi ka "Oslu" slede u Torp kod Sandefjorda, oko 110km južnije — transfer je i do 2h.`, `Oslo’s main airport is Gardermoen, but some low-cost flights to “Oslo” land at Torp near Sandefjord, about 110 km to the south — the transfer takes up to 2 hours.`, `Главный аэропорт Осло — Гардермуэн, но некоторые лоукост-рейсы «в Осло» садятся в Торп близ Сандефьорда, примерно в 110 км южнее — трансфер занимает до 2 часов.`, `Oslos Hauptflughafen ist Gardermoen, aber manche Low-Cost-Flüge nach „Oslo“ landen in Torp bei Sandefjord, etwa 110 km südlich — der Transfer dauert bis zu 2 Stunden.`);
  T(`Neki letovi oglašeni ka "Kopenhagenu" zapravo slede u Malme, u Švedskoj, s druge strane mosta — računaj dodatno vreme za prelazak i eventualnu graničnu kontrolu.`, `Some flights advertised to “Copenhagen” actually land in Malmö, Sweden, on the other side of the bridge — allow extra time for the crossing and a possible border check.`, `Некоторые рейсы, объявленные «в Копенгаген», на самом деле садятся в Мальмё, в Швеции, по другую сторону моста — рассчитывайте дополнительное время на переезд и возможный пограничный контроль.`, `Manche Flüge, die als „nach Kopenhagen“ beworben werden, landen tatsächlich in Malmö in Schweden, auf der anderen Seite der Brücke — plane zusätzliche Zeit für die Überquerung und eine mögliche Grenzkontrolle ein.`);

  /* ---------- pomoćne funkcije ---------- */
  function pl(n, en, ru, de) {
    if (L === 'ru') { var m10 = n % 10, m100 = n % 100; return n + ' ' + ((m10 === 1 && m100 !== 11) ? ru[0] : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) ? ru[1] : ru[2]); }
    if (L === 'de') return n + ' ' + (n === 1 ? de[0] : de[1]);
    return n + ' ' + (n === 1 ? en[0] : en[1]);
  }
  var W = {
    nights: [['night', 'nights'], ['ночь', 'ночи', 'ночей'], ['Nacht', 'Nächte']],
    days: [['day', 'days'], ['день', 'дня', 'дней'], ['Tag', 'Tage']],
    trav: [['traveler', 'travelers'], ['путешественник', 'путешественника', 'путешественников'], ['Person', 'Personen']],
    rooms: [['room', 'rooms'], ['номер', 'номера', 'номеров'], ['Zimmer', 'Zimmer']],
    offers: [['offer', 'offers'], ['предложение', 'предложения', 'предложений'], ['Angebot', 'Angebote']],
    items: [['item', 'items'], ['позиция', 'позиции', 'позиций'], ['Position', 'Positionen']]
  };
  function P(kind, n) { var w = W[kind]; return pl(+n, w[0], w[1], w[2]); }
  function word(kind, n) { return P(kind, n).replace(/^\d+\s/, ''); }

  var MS = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], ru: ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'], de: ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'] };
  var SRM = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'];
  var MF = { en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], ru: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'], de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'] };
  var SRMF = ['januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'];
  function monShort(sr) { var i = SRM.indexOf(sr); return i < 0 ? sr : MS[L][i]; }
  function months(str) { return str.replace(/(januar|februar|mart|april|maj|jun|jul|avgust|septembar|oktobar|novembar|decembar)/g, function (m) { return MF[L][SRMF.indexOf(m)]; }); }

  var CC = { 'Albanija': 'AL', 'Albaniju': 'AL', 'Argentina': 'AR', 'Australija': 'AU', 'Austrija': 'AT', 'Azerbejdžan': 'AZ', 'Belgija': 'BE', 'Bosna i Hercegovina': 'BA', 'Brazil': 'BR', 'Bugarska': 'BG', 'Crna Gora': 'ME', 'Danska': 'DK', 'Egipat': 'EG', 'Estonija': 'EE', 'Filipini': 'PH', 'Finska': 'FI', 'Francuska': 'FR', 'Gruzija': 'GE', 'Grčka': 'GR', 'Holandija': 'NL', 'Hrvatska': 'HR', 'Indija': 'IN', 'Indonezija': 'ID', 'Irska': 'IE', 'Irsku': 'IE', 'Island': 'IS', 'Italija': 'IT', 'Izrael': 'IL', 'Japan': 'JP', 'Južna Koreja': 'KR', 'Južnoafrička Republika': 'ZA', 'Kanada': 'CA', 'Kanadu': 'CA', 'Katar': 'QA', 'Kenija': 'KE', 'Kina': 'CN', 'Kinu': 'CN', 'Kipar': 'CY', 'Kolumbija': 'CO', 'Kosovo': 'XK', 'Letonija': 'LV', 'Lihtenštajn': 'LI', 'Litvanija': 'LT', 'Luksemburg': 'LU', 'Maldivi': 'MV', 'Malezija': 'MY', 'Malta': 'MT', 'Maroko': 'MA', 'Mađarska': 'HU', 'Meksiko': 'MX', 'Moldavija': 'MD', 'Moldaviju': 'MD', 'Monako': 'MC', 'Nemačka': 'DE', 'Norveška': 'NO', 'Novi Zeland': 'NZ', 'Peru': 'PE', 'Poljska': 'PL', 'Portugalija': 'PT', 'Rumunija': 'RO', 'Rusija': 'RU', 'Rusiju': 'RU', 'Belorusija': 'BY', 'Belorusiju': 'BY', 'Ukrajina': 'UA', 'Ukrajinu': 'UA', 'Iran': 'IR', 'Tunis': 'TN', 'SAD': 'US', 'Saudijska Arabija': 'SA', 'Severna Makedonija': 'MK', 'Severnu Makedoniju': 'MK', 'Singapur': 'SG', 'Slovačka': 'SK', 'Slovenija': 'SI', 'Srbija': 'RS', 'Tajland': 'TH', 'Turska': 'TR', 'Tursku': 'TR', 'UAE': 'AE', 'Velika Britanija': 'GB', 'Veliku Britaniju': 'GB', 'Vijetnam': 'VN', 'Češka': 'CZ', 'Španija': 'ES', 'Švajcarska': 'CH', 'Švedska': 'SE' };
  var _rn = null;
  function country(name) {
    var code = CC[name]; if (!code) return name;
    try { if (!_rn) _rn = new Intl.DisplayNames([L], { type: 'region' }); return _rn.of(code) || name; } catch (e) { return name; }
  }
  var _cn = null;
  function currency(name, code) {
    if (code === '€') code = 'EUR';
    try { if (!_cn) _cn = new Intl.DisplayNames([L], { type: 'currency' }); var n = _cn.of(code); if (n && n !== code) { n = n.charAt(0).toUpperCase() + n.slice(1); return n + ' (' + (code === 'EUR' && name.indexOf('€') > -1 ? '€' : code) + ').'; } } catch (e) {}
    return null;
  }
  var DIR = { en: 'direct flight', ru: 'прямой рейс', de: 'Direktflug' };
  var OR = { en: 'or similar', ru: 'или аналог', de: 'oder ähnlich' };
  var GEAR = { 'manuelni menjač': ['manual transmission', 'механическая коробка', 'Schaltgetriebe'], 'automatski menjač': ['automatic transmission', 'автоматическая коробка', 'Automatik'] };
  function g3(a) { return a[IDX]; }

  /* ---------- pravila za dinamične tekstove ---------- */
  var RULES = [
    [/^(\d+)(?:\. ([a-z]{3}))? – (\d+)\. ([a-z]{3})$/, function (m) {
      var a = m[1], am = m[2], b = m[3], bm = monShort(m[4]);
      if (L === 'de') return a + '.' + (am ? ' ' + monShort(am) : '') + ' – ' + b + '. ' + bm;
      return a + (am ? ' ' + monShort(am) : '') + ' – ' + b + ' ' + bm;
    }],
    [/^· (\d+) noćenj[ea]$/, function (m) { return '· ' + P('nights', m[1]); }],
    [/^(\d+) noćenj[ea] · (\d+) sob[ae]$/, function (m) { return P('nights', m[1]) + ' · ' + P('rooms', m[2]); }],
    [/^\(?(\d+) noćenj[ea]\)?$/, function (m) { return P('nights', m[1]); }],
    [/^(\d+) noć\. × (.+)$/, function (m) { return m[1] + ' ' + word('nights', m[1]) + ' × ' + m[2]; }],
    [/^(\d+) dan(?:a)? · (manuelni menjač|automatski menjač)$/, function (m) { return P('days', m[1]) + ' · ' + g3(GEAR[m[2]]); }],
    [/^(\d+) (?:ponuda|ponude)$/, function (m) { return P('offers', m[1]); }],
    [/^Prikaži još \((\d+)\)$/, function (m) { return ({ en: 'Show more', ru: 'Показать ещё', de: 'Mehr anzeigen' })[L] + ' (' + m[1] + ')'; }],
    [/^(\d+)\/(\d+) spremno$/, function (m) { return m[1] + '/' + m[2] + ' ' + ({ en: 'ready', ru: 'готово', de: 'erledigt' })[L]; }],
    [/^putnik(?:a)?$/, function (m, node) {
      var n = 2; var p = node && node.previousSibling; if (p && /^\d+$/.test((p.textContent || '').trim())) n = +p.textContent.trim();
      return word('trav', n);
    }],
    [/^\/ (\d+) putnik(?:a)?$/, function (m) { return '/ ' + P('trav', m[1]); }],
    [/^\/ ukupno za (\d+) putnika$/, function (m) { return '/ ' + ({ en: 'total for', ru: 'всего за', de: 'gesamt für' })[L] + ' ' + P('trav', m[1]); }],
    [/^ukupno za (\d+) putnika$/, function (m) { return ({ en: 'total for', ru: 'всего за', de: 'gesamt für' })[L] + ' ' + P('trav', m[1]); }],
    [/^Procena za (\d+) putnik(?:a)? · (\d+) dan(?:a)?:$/, function (m) { return ({ en: 'Estimate for', ru: 'Оценка для', de: 'Schätzung für' })[L] + ' ' + P('trav', m[1]) + ' · ' + P('days', m[2]) + ':'; }],
    [/^Tvoj put · (\d+) stavk[aei]$/, function (m) { return ({ en: 'Your trip', ru: 'Ваша поездка', de: 'Deine Reise' })[L] + ' · ' + P('items', m[1]); }],
    [/^Tvoj put, (\d+) stavk[aei], (.+)\. Otvori specifikaciju$/, function (m) { return ({ en: 'Your trip', ru: 'Ваша поездка', de: 'Deine Reise' })[L] + ', ' + P('items', m[1]) + ', ' + m[2] + '. ' + ({ en: 'Open breakdown', ru: 'Открыть детали', de: 'Aufschlüsselung öffnen' })[L]; }],
    [/^(\d+) stavka je u drugoj valuti i nije uračunata u zbir\.$/, function (m) { return ({ en: P('items', m[1]) + ' in another currency is not included in the total.', ru: P('items', m[1]) + ' в другой валюте не включена в итог.', de: P('items', m[1]) + ' in anderer Währung ist in der Summe nicht enthalten.' })[L]; }],
    [/^ukupno · ≈ (.+) po noći$/, function (m) { return ({ en: 'total · ≈ ' + m[1] + ' per night', ru: 'итого · ≈ ' + m[1] + ' за ночь', de: 'gesamt · ≈ ' + m[1] + ' pro Nacht' })[L]; }],
    [/^ukupno · ≈ (.+) dnevno$/, function (m) { return ({ en: 'total · ≈ ' + m[1] + ' per day', ru: 'итого · ≈ ' + m[1] + ' в день', de: 'gesamt · ≈ ' + m[1] + ' pro Tag' })[L]; }],
    [/^po osobi · (.+) za (\d+)$/, function (m) { return ({ en: 'per person · ' + m[1] + ' for ' + m[2], ru: 'на человека · ' + m[1] + ' за ' + m[2], de: 'pro Person · ' + m[1] + ' für ' + m[2] })[L]; }],
    [/^≈ (.+) po osobi$/, function (m) { return '≈ ' + m[1] + ' ' + g3(['per person', 'на человека', 'pro Person']); }],
    [/^(.+) → (.+) · (\d+h \d+min) · direktan let$/, function (m) { return m[1] + ' → ' + m[2] + ' · ' + m[3] + ' · ' + DIR[L]; }],
    [/^(.+) \(\+1d\)$/, function (m) { return m[1] + ({ en: ' (+1d)', ru: ' (+1 д.)', de: ' (+1 T.)' })[L]; }],
    [/^Hotel (\d★) · (.+)$/, function (m) { var s = HOTEL[m[2]]; return 'Hotel ' + m[1] + ' · ' + (s ? g3(s) : m[2]); }],
    [/^(.+) · (.+) ili slično$/, function (m) {
      var cls = CARCLASS[m[1]]; var model = m[2].replace('BMW serije 3', ({ en: 'BMW 3 Series', ru: 'BMW 3-й серии', de: 'BMW 3er' })[L]);
      return (cls ? g3(cls) : m[1]) + ' · ' + model + ' ' + OR[L];
    }],
    [/^Pogledaj na (.+)$/, function (m) { return ({ en: 'View on ', ru: 'Смотреть на ', de: 'Auf ' + m[1] + ' ansehen' })[L] + (L === 'de' ? '' : m[1]); }],
    [/^Otvori na (.+)$/, function (m) { return ({ en: 'Open on ', ru: 'Открыть на ', de: 'Auf ' + m[1] + ' öffnen' })[L] + (L === 'de' ? '' : m[1]); }],
    [/^Dodato u Tvoj put(?:: (.+))?$/, function (m) { return ({ en: 'Added to your trip', ru: 'Добавлено в вашу поездку', de: 'Zu deiner Reise hinzugefügt' })[L] + (m[1] ? ': ' + m[1] : ''); }],
    [/^eSIM paket · (.+)$/, function (m) { return 'eSIM ' + g3(['package', 'пакет', 'Paket']) + ' · ' + country(m[1]); }],
    [/^O destinaciji — (.+)$/, function (m) { return ({ en: 'About the destination — ', ru: 'О направлении — ', de: 'Über das Reiseziel — ' })[L] + m[1]; }],
    [/^(\d+)\. (januar|februar|mart|april|maj|jun|jul|avgust|septembar|oktobar|novembar|decembar) (\d{4})\.$/, function (m) {
      var i = SRMF.indexOf(m[2]);
      if (L === 'en') return m[1] + ' ' + MF.en[i] + ' ' + m[3];
      if (L === 'de') return m[1] + '. ' + MF.de[i] + ' ' + m[3];
      var gen = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
      return m[1] + ' ' + gen[i] + ' ' + m[3] + ' г.';
    }],
    [/^Najbolja sezona: (.+)\. Tvoj termin \((.+)\) (spada u najbolju sezonu|je van glavne sezone — proveri vreme i radno vreme atrakcija)\.$/, function (m) {
      var inSeason = m[3] === 'spada u najbolju sezonu';
      var best = months(m[1]), mo = months(m[2]);
      if (L === 'en') return 'Best season: ' + best + '. Your dates (' + mo + ') ' + (inSeason ? 'fall within the best season.' : 'are outside the main season — check the weather and attraction opening hours.');
      if (L === 'ru') return 'Лучший сезон: ' + best + '. Ваши даты (' + mo + ') ' + (inSeason ? 'приходятся на лучший сезон.' : 'вне основного сезона — проверьте погоду и часы работы достопримечательностей.');
      return 'Beste Saison: ' + best + '. Dein Reisezeitraum (' + mo + ') ' + (inSeason ? 'liegt in der besten Saison.' : 'liegt außerhalb der Hauptsaison — prüfe das Wetter und die Öffnungszeiten der Attraktionen.');
    }],
    [/^(.+) \(([A-Z]{3}|€)\)\.$/, function (m) { return currency(m[0], m[2]) || m[0]; }],
    [/^Nije potrebna viza za (.+) — proveri ipak tik pred put ako se pravila u međuvremenu promene\.$/, function (m) {
      var c = country(m[1]);
      return ({ en: 'No visa is required for ' + c + ' — still check shortly before you travel in case the rules have changed.', ru: 'Виза не требуется (' + c + ') — всё же проверьте перед поездкой, не изменились ли правила.', de: 'Für ' + c + ' ist kein Visum nötig — prüfe aber kurz vor der Reise, ob sich die Regeln geändert haben.' })[L];
    }],
    [/^Za (.+) je zelena karta obavezna\.$/, function (m) { var c = country(m[1]); return ({ en: 'A Green Card is mandatory for ' + c + '.', ru: c + ': зелёная карта обязательна.', de: 'Für ' + c + ' ist die Grüne Karte Pflicht.' })[L]; }],
    [/^(.+): zelena karta nije potrebna za vozila registrovana u Srbiji\.$/, function (m) { var c = country(m[1]); return ({ en: c + ': a Green Card is not required for vehicles registered in Serbia.', ru: c + ': зелёная карта не требуется для автомобилей, зарегистрированных в Сербии.', de: c + ': Für in Serbien zugelassene Fahrzeuge ist keine Grüne Karte nötig.' })[L]; }],
    [/^(.+): pasoš nije potreban\. Državljani Srbije ulaze sa važećom biometrijskom ličnom kartom \(do 90 dana boravka u periodu od 6 meseci\)\.$/, function (m) { var c = country(m[1]); return ({ en: c + ': no passport needed. Serbian citizens enter with a valid biometric ID card (up to 90 days of stay in a 6-month period).', ru: c + ': паспорт не нужен. Граждане Сербии въезжают по действующей биометрической ID-карте (до 90 дней пребывания в течение 6 месяцев).', de: c + ': kein Reisepass nötig. Serbische Staatsbürger reisen mit einem gültigen biometrischen Personalausweis ein (bis zu 90 Tage Aufenthalt innerhalb von 6 Monaten).' })[L]; }],
    [/^(.+): pasoš mora da važi još najmanje 6 meseci nakon planiranog datuma povratka\.$/, function (m) { var c = country(m[1]); return ({ en: c + ': the passport must be valid for at least 6 months after your planned return date.', ru: c + ': паспорт должен быть действителен ещё не менее 6 месяцев после планируемой даты возвращения.', de: c + ': Der Reisepass muss nach dem geplanten Rückreisedatum noch mindestens 6 Monate gültig sein.' })[L]; }],
    [/^Nemamo potvrđeno pravilo za zemlju „(.+)“\. Mnoge zemlje van Šengena traže da pasoš važi još 6 meseci nakon povratka, ali obavezno proveri kod ambasade ili aviokompanije\.$/, function (m) { var c = country(m[1]); return ({ en: 'We have no confirmed rule for “' + c + '”. Many non-Schengen countries require the passport to be valid for 6 more months after your return, but be sure to check with the embassy or your airline.', ru: 'У нас нет подтверждённого правила для страны «' + c + '». Многие страны вне Шенгена требуют, чтобы паспорт был действителен ещё 6 месяцев после возвращения, но обязательно уточните в посольстве или у авиакомпании.', de: 'Für „' + c + '“ haben wir keine bestätigte Regel. Viele Länder außerhalb des Schengen-Raums verlangen, dass der Reisepass nach der Rückkehr noch 6 Monate gültig ist — prüfe das unbedingt bei der Botschaft oder deiner Fluggesellschaft.' })[L]; }],
    [/^Nemamo potvrđeno pravilo za „(.+)“ — proveri kod osiguravača da li ti treba zelena karta\.$/, function (m) { var c = country(m[1]); return ({ en: 'We have no confirmed rule for “' + c + '” — check with your insurer whether you need a Green Card.', ru: 'У нас нет подтверждённого правила для «' + c + '» — уточните у страховщика, нужна ли вам зелёная карта.', de: 'Für „' + c + '“ haben wir keine bestätigte Regel — frage bei deinem Versicherer nach, ob du eine Grüne Karte brauchst.' })[L]; }],
    [/^Ambasada zna da traži dokaz o putnom zdravstvenom osiguranju kao deo vizne prijave za (.+) — proveri pre podnošenja dokumenata\.$/, function (m) { var c = country(m[1]); return ({ en: 'Embassies often ask for proof of travel health insurance as part of a visa application for ' + c + ' — check before submitting your documents.', ru: 'При подаче визового заявления посольства часто требуют подтверждение туристической медицинской страховки (' + c + ') — проверьте это перед подачей документов.', de: 'Botschaften verlangen oft einen Nachweis über eine Reisekrankenversicherung als Teil des Visumantrags für ' + c + ' — prüfe das, bevor du die Unterlagen einreichst.' })[L]; }],
    [/^(.+) nema svoj aerodrom — najbliži je (.+)\. Transfer do konačnog odredišta računaj kao poseban trošak i vreme, ne kao deo cene leta\.$/, function (m) { return ({ en: m[1] + ' has no airport of its own — the nearest is ' + m[2] + '. Count the transfer to your final destination as a separate cost and time, not as part of the flight price.', ru: 'В ' + m[1] + ' нет собственного аэропорта — ближайший: ' + m[2] + '. Трансфер до конечного пункта учитывайте как отдельные расходы и время, а не как часть цены перелёта.', de: m[1] + ' hat keinen eigenen Flughafen — der nächste ist ' + m[2] + '. Rechne den Transfer zum Endziel als gesonderte Kosten und Zeit, nicht als Teil des Flugpreises.' })[L]; }],
    [/^(.+?) nema svoj aerodrom, najbliži je: (.+?)\.\s*/, function (m, node, full) {
      var one = function (a, b) { return ({ en: a + ' has no airport of its own; the nearest is: ' + b + '.', ru: 'В ' + a + ' нет собственного аэропорта, ближайший: ' + b + '.', de: a + ' hat keinen eigenen Flughafen, der nächste ist: ' + b + '.' })[L]; };
      var res = full.replace(/(.+?) nema svoj aerodrom, najbliži je: (.+?)\.\s*/g, function (_, a, b) { return one(a, b) + ' '; });
      return res.trim();
    }, true],
    [/^(Ako se do ovog mesta stiže kopnom: )?Trasa (.+) – (.+) sa vremenom vožnje i putarinama u Google Maps-u\.$/, function (m) {
      var pre = m[1] ? ({ en: 'If this place can be reached by land: ', ru: 'Если до этого места можно добраться по суше: ', de: 'Falls dieser Ort auf dem Landweg erreichbar ist: ' })[L] : '';
      var rt = ({ en: 'The route ' + m[2] + ' – ' + m[3] + ' with driving time and tolls in Google Maps.', ru: 'Маршрут ' + m[2] + ' – ' + m[3] + ' со временем в пути и платными дорогами в Google Maps.', de: 'Die Route ' + m[2] + ' – ' + m[3] + ' mit Fahrzeit und Mautkosten in Google Maps.' })[L];
      return pre + rt;
    }],
    [/^Ne znamo tačno u kojoj je državi ova destinacija, pa link vodi na opštu Airalo prodavnicu — potraži tamo „(.+)“ ili državu u kojoj se nalazi\.$/, function (m) { return ({ en: 'We don’t know exactly which country this destination is in, so the link goes to the general Airalo store — look for “' + m[1] + '” or the country it is in.', ru: 'Мы точно не знаем, в какой стране находится это направление, поэтому ссылка ведёт в общий магазин Airalo — найдите там «' + m[1] + '» или страну, в которой оно находится.', de: 'Wir wissen nicht genau, in welchem Land dieses Reiseziel liegt, daher führt der Link in den allgemeinen Airalo-Shop — suche dort nach „' + m[1] + '“ oder dem Land, in dem es liegt.' })[L]; }],
    [/^(.+) — procena cene putovanja \| SKLOPI$/, function (m) { return m[1] + ({ en: ' — trip price estimate | SKLOPI', ru: ' — оценка стоимости поездки | SKLOPI', de: ' — Reisepreis-Schätzung | SKLOPI' })[L]; }]
  ];

  /* ---------- primena ---------- */
  var out = new WeakMap();
  function lookup(text, node) {
    var hit = E[text]; if (hit) return hit[IDX];
    for (var i = 0; i < RULES.length; i++) {
      var r = RULES[i], m = r[0].exec(text);
      if (m) { var v = r[2] ? r[1](m, node, text) : r[1](m, node); if (v && v !== text) return v; }
    }
    return null;
  }
  function tr(text, node) {
    var t = text.replace(/\s+/g, ' ').trim(); if (!t) return null;
    var v = lookup(t, node); if (v) return v;
    /* simboli/emotikoni ispred teksta (✈️, ＋, 🧳 ...) i iza njega (↗, ›) ostaju */
    var m = /^([^\p{L}\p{N}€"„]+\s*)(.*?)(\s*[^\p{L}\p{N}.!?)€"“]*)$/su.exec(t);
    if (m && m[2]) { v = lookup(m[2], node); if (v) return m[1] + v + m[3]; }
    return null;
  }
  function doText(n) {
    var p = n.parentNode; if (!p) return;
    var tag = p.nodeName; if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA') return;
    var cur = n.nodeValue; if (out.get(n) === cur) return;
    var v = tr(cur, n); if (!v) return;
    var lead = /^\s*/.exec(cur)[0], trail = /\s*$/.exec(cur)[0];
    var res = lead + v + trail; out.set(n, res); n.nodeValue = res;
  }
  var ATTRS = ['aria-label', 'title', 'placeholder', 'alt'];
  function doAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i]; if (!el.hasAttribute || !el.hasAttribute(a)) continue;
      var cur = el.getAttribute(a), v = tr(cur, null);
      if (v && v !== cur) el.setAttribute(a, v);
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) doAttrs(root);
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null), n;
    while ((n = tw.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  var mo = new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (r.type === 'characterData') doText(r.target);
      else if (r.type === 'attributes') doAttrs(r.target);
      else for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  function all() { walk(document.documentElement); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', all); else all();
})();
