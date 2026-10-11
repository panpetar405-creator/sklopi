/* dest-i18n.js — prevod toka puta na destinacija.html (ponude, "Tvoj put", donja traka, specifikacija).
   Stranica je pisana na srpskom; ovaj fajl prikazani tekst prevodi u en / de / ru čim se pojavi u DOM-u
   (MutationObserver), a podaci u kodu ostaju srpski — pa heševi za podeljene linkove i sačuvan izbor
   ne zavise od jezika. Jezik se bira isto kao u dest-info.js: ?lang=, pa localStorage 'sklopi_lang'.
   Za srpski ne radi ništa. Nove stringove dodaj u EX (tačan tekst) ili RULES (tekst sa brojevima).
   PLACES (gradovi i države) je generisan iz sr.json / en.json / de.json / ru.json. */
(function () {
  'use strict';
  var IDX = { en: 0, de: 1, ru: 2 };
  function curLang() {
    var l = null;
    try { if (typeof window.getLang === 'function') l = window.getLang(); } catch (e) {}
    if (!l || !IDX.hasOwnProperty(l)) { try { l = new URLSearchParams(location.search).get('lang'); } catch (e) {} }
    if (!l || !IDX.hasOwnProperty(l)) { try { l = localStorage.getItem('sklopi_lang'); } catch (e) {} }
    return l;
  }
  var LANG = curLang(), I = IDX.hasOwnProperty(LANG) ? IDX[LANG] : -1;
  window.DI18N = { lang: LANG, tr: function (s) { return s; } };
  if (I < 0) return;

  function P(en, de, ru) { return [en, de, ru][I]; }
  function ru3(n, a, b, c) { var m10 = n % 10, m100 = n % 100; return (m10 === 1 && m100 !== 11) ? a : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) ? b : c; }
  var N = {
    items:  function (n) { return P(n + (n === 1 ? ' item' : ' items'), n + (n === 1 ? ' Leistung' : ' Leistungen'), n + ' ' + ru3(n, 'позиция', 'позиции', 'позиций')); },
    nights: function (n) { return P(n + (n === 1 ? ' night' : ' nights'), n + (n === 1 ? ' Nacht' : ' Nächte'), n + ' ' + ru3(n, 'ночь', 'ночи', 'ночей')); },
    days:   function (n) { return P(n + (n === 1 ? ' day' : ' days'), n + (n === 1 ? ' Tag' : ' Tage'), n + ' ' + ru3(n, 'день', 'дня', 'дней')); },
    rooms:  function (n) { return P(n + (n === 1 ? ' room' : ' rooms'), n + (n === 1 ? ' Zimmer' : ' Zimmer'), n + ' ' + ru3(n, 'комната', 'комнаты', 'комнат')); },
    offers: function (n) { return P(n + (n === 1 ? ' offer' : ' offers'), n + (n === 1 ? ' Angebot' : ' Angebote'), n + ' ' + ru3(n, 'предложение', 'предложения', 'предложений')); },
    pax:    function (n) { return P(n + (n === 1 ? ' traveller' : ' travellers'), n + (n === 1 ? ' Person' : ' Personen'), 'для ' + n + ' ' + (n % 10 === 1 && n % 100 !== 11 ? 'человека' : 'человек')); }
  };

  var PLACES = {"Kerns":["Cairns","Cairns","Кэрнс"],"Adana":["Adana","Adana","Адана"],"Amsterdam":["Amsterdam","Amsterdam","Амстердам"],"Ankara":["Ankara","Ankara","Анкара"],"Ankona":["Ancona","Ancona","Анкона"],"Antalija":["Antalya","Antalya","Анталья"],"Araksos":["Araxos","Araxos","Аракс"],"Atina":["Athens","Athen","Афины"],"Banja Luka":["Banja Luka","Banja Luka","Баня-Лука"],"Bari":["Bari","Bari","Бари"],"Bazel":["Basel","Basel","Базель"],"Beograd":["Belgrade","Belgrad","Белград"],"Berlin":["Berlin","Berlin","Берлин"],"Bern":["Bern","Bern","Берн"],"Beč":["Vienna","Wien","Вена"],"Bidgosc":["Bydgoszcz","Bydgoszcz","Быдгощ"],"Bidgošć":["Bydgoszcz","Bydgoszcz","Быдгощ"],"Bilund":["Billund","Billund","Биллунн"],"Bolcano":["Bolzano","Bozen","Больцано"],"Bolonja":["Bologna","Bologna","Болонья"],"Bratislava":["Bratislava","Bratislava","Братислава"],"Brašov":["Brașov","Brașov","Брашов"],"Brindizi":["Brindisi","Brindisi","Бриндизи"],"Brisel":["Brussels","Brüssel","Брюссель"],"Budimpešta":["Budapest","Budapest","Будапешт"],"Bukurešt":["Bucharest","Bukarest","Бухарест"],"Burgas":["Burgas","Burgas","Бургас"],"Canakkale":["Çanakkale","Çanakkale","Чанаккале"],"Čanakale":["Çanakkale","Çanakkale","Чанаккале"],"Cirih":["Zurich","Zürich","Цюрих"],"Dalaman":["Dalaman","Dalaman","Даламан"],"Denizli":["Denizli","Denizli","Денизли"],"Dubrovnik":["Dubrovnik","Dubrovnik","Дубровник"],"Faro":["Faro","Faro","Фару"],"Firenca":["Florence","Florenz","Флоренция"],"Frankfurt":["Frankfurt","Frankfurt","Франкфурт"],"Fridrihshafen":["Friedrichshafen","Friedrichshafen","Фридрихсхафен"],"Gdanjsk":["Gdańsk","Danzig","Гданьск"],"Hamburg":["Hamburg","Hamburg","Гамбург"],"Helsinki":["Helsinki","Helsinki","Хельсинки"],"Herez":["Jerez","Jerez","Херес"],"Herez de la Frontera":["Jerez de la Frontera","Jerez de la Frontera","Херес-де-ла-Фронтера"],"Insbruk":["Innsbruck","Innsbruck","Инсбрук"],"Istanbul":["Istanbul","Istanbul","Стамбул"],"Izmir":["Izmir","Izmir","Измир"],"Katanija":["Catania","Catania","Катания"],"Katovice":["Katowice","Katowice","Катовице"],"Kavala":["Kavala","Kavala","Кавала"],"Keln":["Cologne","Köln","Кёльн"],"Keln/Bon":["Cologne/Bonn","Köln/Bonn","Кёльн/Бонн"],"Kisinjev":["Chișinău","Chișinău","Кишинёв"],"Kišinjev":["Chișinău","Chișinău","Кишинёв"],"Konstanca":["Constanța","Konstanza","Констанца"],"Kopenhagen":["Copenhagen","Kopenhagen","Копенгаген"],"Krakov":["Kraków","Krakau","Краков"],"Lajpcig":["Leipzig","Leipzig","Лейпциг"],"Linc":["Linz","Linz","Линц"],"Lion":["Lyon","Lyon","Лион"],"Lisabon":["Lisbon","Lissabon","Лиссабон"],"Ljubljana":["Ljubljana","Ljubljana","Любляна"],"London":["London","London","Лондон"],"Luksemburg":["Luxembourg","Luxemburg","Люксембург"],"Madrid":["Madrid","Madrid","Мадрид"],"Malaga":["Málaga","Málaga","Малага"],"Malatja":["Malatya","Malatya","Малатья"],"Malme":["Malmö","Malmö","Мальмё"],"Maribor":["Maribor","Maribor","Марибор"],"Milano":["Milan","Mailand","Милан"],"Nansi":["Nancy","Nancy","Нанси"],"Nant":["Nantes","Nantes","Нант"],"Napulj":["Naples","Neapel","Неаполь"],"Nevsehir":["Nevşehir","Nevşehir","Невшехир"],"Nevšehir":["Nevşehir","Nevşehir","Невшехир"],"Nica":["Nice","Nizza","Ницца"],"Nirnberg":["Nuremberg","Nürnberg","Нюрнберг"],"Niš":["Niš","Niš","Ниш"],"Ohrid":["Ohrid","Ohrid","Охрид"],"Olesund":["Ålesund","Ålesund","Олесунн"],"Osijek":["Osijek","Osijek","Осиек"],"Oslo":["Oslo","Oslo","Осло"],"Ostrava":["Ostrava","Ostrava","Острава"],"Pariz":["Paris","Paris","Париж"],"Parma":["Parma","Parma","Парма"],"Perudja":["Perugia","Perugia","Перуджа"],"Pisa":["Pisa","Pisa","Пиза"],"Plovdiv":["Plovdiv","Plovdiv","Пловдив"],"Podgorica":["Podgorica","Podgorica","Подгорица"],"Poprad":["Poprad","Poprad","Попрад"],"Porto":["Porto","Porto","Порту"],"Prag":["Prague","Prag","Прага"],"Preveza":["Preveza","Preveza","Превеза"],"Preveza/Aktion":["Preveza/Actium","Preveza/Actium","Превеза/Актион"],"Priština":["Pristina","Pristina","Приштина"],"Pula":["Pula","Pula","Пула"],"Rim":["Rome","Rom","Рим"],"Rimini":["Rimini","Rimini","Римини"],"Roterdam":["Rotterdam","Rotterdam","Роттердам"],"Salcburg":["Salzburg","Salzburg","Зальцбург"],"Sanliurfa":["Şanlıurfa","Şanlıurfa","Шанлыурфа"],"Šanlıurfa":["Şanlıurfa","Şanlıurfa","Шанлыурфа"],"Santorini":["Santorini","Santorini","Санторини"],"Sarajevo":["Sarajevo","Sarajevo","Сараево"],"Sevilja":["Seville","Sevilla","Севилья"],"Skijatos":["Skiathos","Skiathos","Скиатос"],"Skoplje":["Skopje","Skopje","Скопье"],"Sofija":["Sofia","Sofia","София"],"Solun":["Thessaloniki","Thessaloniki","Салоники"],"Split":["Split","Split","Сплит"],"Stokholm":["Stockholm","Stockholm","Стокгольм"],"Stutgart":["Stuttgart","Stuttgart","Штутгарт"],"Štutgart":["Stuttgart","Stuttgart","Штутгарт"],"Tirana":["Tirana","Tirana","Тирана"],"Tivat":["Tivat","Tivat","Тиват"],"Trabzon":["Trabzon","Trabzon","Трабзон"],"Trst":["Trieste","Triest","Триест"],"Tuzla":["Tuzla","Tuzla","Тузла"],"Varna":["Varna","Varna","Варна"],"Varsava":["Warsaw","Warschau","Варшава"],"Varšava":["Warsaw","Warschau","Варшава"],"Venecija":["Venice","Venedig","Венеция"],"Verona":["Verona","Verona","Верона"],"Zagreb":["Zagreb","Zagreb","Загреб"],"Zesuv":["Rzeszów","Rzeszów","Жешув"],"Žešuv":["Rzeszów","Rzeszów","Жешув"],"Đenova":["Genoa","Genua","Генуя"],"Šarlroa":["Charleroi","Charleroi","Шарлеруа"],"Ženeva":["Geneva","Genf","Женева"],"Brno":["Brno","Brno","Брно"],"Poznanj":["Poznań","Posen","Познань"],"Gaziantep":["Gaziantep","Gaziantep","Газиантеп"],"Tur":["Tours","Tours","Тур"],"Krf":["Corfu","Korfu","Корфу"],"Naksos":["Naxos","Naxos","Наксос"],"Kajseri":["Kayseri","Kayseri","Кайсери"],"Gazipaša":["Gazipaşa","Gazipaşa","Газипаша"],"Padova":["Padua","Padua","Падуя"],"Zadar":["Zadar","Zadar","Задар"],"Segedin":["Szeged","Szeged","Сегед"],"Mersin":["Mersin","Mersin","Мерсин"],"Kapadokija":["Cappadocia","Kappadokien","Каппадокия"],"Marmaris":["Marmaris","Marmaris","Мармарис"],"Fetije":["Fethiye","Fethiye","Фетхие"],"Side":["Side","Side","Сиде"],"Alanja":["Alanya","Alanya","Аланья"],"Kušadasi":["Kuşadası","Kuşadası","Кушадасы"],"Česme":["Çeşme","Çeşme","Чешме"],"Pamukale":["Pamukkale","Pamukkale","Памуккале"],"Jalova":["Yalova","Yalova","Ялова"],"Afjon Karahisar":["Afyonkarahisar","Afyonkarahisar","Афьонкарахисар"],"Haymana":["Haymana","Haymana","Хаймана"],"Kizildžahamam":["Kızılcahamam","Kızılcahamam","Кызылджахамам"],"Efes":["Ephesus","Ephesos","Эфес"],"Troja":["Troy","Troy","Троя"],"Pergamon":["Pergamon","Pergamon","Пергам"],"Hijerapolis":["Hierapolis","Hierapolis","Иераполис"],"Sumela":["Sumela","Sumela","Сумела"],"Nemrut":["Nemrut","Nemrut","Немрут"],"Safranbolu":["Safranbolu","Safranbolu","Сафранболу"],"Gjobekli Tepe":["Göbekli Tepe","Göbekli Tepe","Гёбекли-Тепе"],"Kaš":["Kaş","Kaş","Каш"],"Kalkan":["Kalkan","Kalkan","Калкан"],"Datča":["Datça","Datça","Датча"],"Didim":["Didim","Didim","Дидим"],"Ajvalik":["Ayvalık","Ayvalık","Айвалык"],"Silifke":["Silifke","Silifke","Силифке"],"Koimbra":["Coimbra","Coimbra","Коимбра"],"Braga":["Braga","Braga","Брага"],"Sintra":["Sintra","Sintra","Синтра"],"Albufeira":["Albufeira","Albufeira","Албуфейра"],"Evora":["Évora","Évora","Эвора"],"Kaskais":["Cascais","Cascais","Кашкайш"],"Nazare":["Nazaré","Nazaré","Назаре"],"Fatima":["Fátima","Fátima","Фатима"],"Zakopane":["Zakopane","Zakopane","Закопане"],"Torunj":["Toruń","Toruń","Торунь"],"Vjelička":["Wieliczka","Wieliczka","Величка"],"Gdinja":["Gdynia","Gdynia","Гдыня"],"Čenstohova":["Częstochowa","Częstochowa","Ченстохова"],"Plzenj":["Plzeň","Pilsen","Пльзень"],"Češki Krumlov":["Český Krumlov","Český Krumlov","Чески-Крумлов"],"Olomouc":["Olomouc","Olomouc","Оломоуц"],"Kutna Hora":["Kutná Hora","Kutná Hora","Кутна-Гора"],"Češke Budejovice":["České Budějovice","Budweis","Ческе-Будеёвице"],"Hradec Kralove":["Hradec Králové","Hradec Králové","Градец-Кралове"],"Liberec":["Liberec","Liberec","Либерец"],"Briž":["Bruges","Brügge","Брюгге"],"Gent":["Ghent","Gent","Гент"],"Namir":["Namur","Namur","Намюр"],"Halkidiki":["Halkidiki","Halkidiki","Халкидики"],"Lefkada":["Lefkada","Lefkada","Лефкада"],"Volos":["Volos","Volos","Волос"],"Patra":["Patras","Patras","Патры"],"Larisa":["Larissa","Larissa","Лариса"],"Lutraki":["Loutraki","Loutraki","Лутраки"],"Edipsos":["Edipsos","Edipsos","Эдипсос"],"Olimp":["Mount Olympus","Olymp","Олимп"],"Pilion":["Pelion","Pilion","Пелион"],"Meteori":["Meteora","Meteora","Метеоры"],"Delfi":["Delphi","Delphi","Дельфы"],"Nafplion":["Nafplio","Nauplia","Нафплион"],"Tasos":["Thasos","Thassos","Тасос"],"Skopelos":["Skopelos","Skopelos","Скопелос"],"Evija":["Evia","Evia","Эвия"],"Idra":["Hydra","Hydra","Идра"],"Spece":["Spetses","Spetses","Спеце"],"Ios":["Ios","Ios","Иос"],"Egina":["Aegina","Ägina","Эгина"],"Poros":["Poros","Poros","Порос"],"Nesebar":["Nessebar","Nessebar","Несебр"],"Bansko":["Bansko","Bansko","Банско"],"Ruse":["Ruse","Ruse","Русе"],"Stara Zagora":["Stara Zagora","Stara Zagora","Стара-Загора"],"Pleven":["Pleven","Pleven","Плевен"],"Veliko Trnovo":["Veliko Tarnovo","Veliko Tarnovo","Велико-Тырново"],"Blagoevgrad":["Blagoevgrad","Blagoevgrad","Благоевград"],"Šumen":["Shumen","Shumen","Шумен"],"Sliven":["Sliven","Sliven","Сливен"],"Vidin":["Vidin","Vidin","Видин"],"Dobrič":["Dobrich","Dobrich","Добрич"],"Kjustendil":["Kyustendil","Kyustendil","Кюстендил"],"Gabrovo":["Gabrovo","Gabrovo","Габрово"],"Haskovo":["Haskovo","Haskovo","Хасково"],"Sandanski":["Sandanski","Sandanski","Сандански"],"Velingrad":["Velingrad","Velingrad","Велинград"],"Hisarja":["Hisarya","Hisarya","Хисаря"],"Devin":["Devin","Devin","Девин"],"Pavel Banja":["Pavel Banya","Pavel Banya","Павел-Баня"],"Bankja":["Bankya","Bankya","Банкя"],"Borovec":["Borovets","Borovets","Боровец"],"Pamporovo":["Pamporovo","Pamporovo","Пампорово"],"Vitoša":["Vitosha","Vitosha","Витоша"],"Čepelare":["Chepelare","Chepelare","Чепеларе"],"Rila":["Rila","Rila","Рила"],"Koprivštica":["Koprivshtitsa","Koprivshtitsa","Копривштица"],"Melnik":["Melnik","Melnik","Мелник"],"Rilski manastir":["Rila Monastery","Rila-Kloster","Рильский монастырь"],"Trjavna":["Tryavna","Tryavna","Трявна"],"Arbanasi":["Arbanasi","Arbanasi","Арбанаси"],"Sozopol":["Sozopol","Sozopol","Созополь"],"Sunčev Breg":["Sunny Beach","Sonnenstrand","Солнечный берег"],"Zlatni Pjasci":["Golden Sands","Goldstrand","Золотые Пески"],"Primorsko":["Primorsko","Primorsko","Приморско"],"Balčik":["Balchik","Balchik","Балчик"],"Kavarna":["Kavarna","Kavarna","Каварна"],"Carevo":["Tsarevo","Tsarevo","Царево"],"Pomorije":["Pomorie","Pomorie","Поморие"],"Ahtopol":["Ahtopol","Ahtopol","Ахтополь"],"Sinaja":["Sinaia","Sinaia","Синая"],"Bran":["Bran","Bran","Бран"],"Mamaja":["Mamaia","Mamaia","Мамая"],"Leče":["Lecce","Lecce","Лечче"],"Modena":["Modena","Modena","Модена"],"Brešija":["Brescia","Brescia","Брешиа"],"Salerno":["Salerno","Salerno","Салерно"],"Abano Terme":["Abano Terme","Abano Terme","Абано-Терме"],"Montekatini Terme":["Montecatini Terme","Montecatini Terme","Монтекатини-Терме"],"Fjuđi":["Fiuggi","Fiuggi","Фьюджи"],"Salsomađore Terme":["Salsomaggiore Terme","Salsomaggiore Terme","Сальсомаджоре-Терме"],"Dolomiti":["The Dolomites","Dolomiten","Доломиты"],"Val Gardena":["Val Gardena","Val Gardena","Валь-Гардена"],"Livinjo":["Livigno","Livigno","Ливиньо"],"Etna":["Mount Etna","Ätna","Этна"],"Pompeji":["Pompeii","Pompeji","Помпеи"],"Asizi":["Assisi","Assisi","Ассизи"],"Sijena":["Siena","Siena","Сиена"],"San Đimonjano":["San Gimignano","San Gimignano","Сан-Джиминьяно"],"Orvieto":["Orvieto","Orvieto","Орвието"],"Ravena":["Ravenna","Ravenna","Равенна"],"Amalfi":["Amalfi","Amalfi","Амальфи"],"Pozitano":["Positano","Positano","Позитано"],"Sorento":["Sorrento","Sorrento","Сорренто"],"Kapri":["Capri","Capri","Капри"],"Portofino":["Portofino","Portofino","Портофино"],"Elba":["Elba","Elba","Эльба"],"Taormina":["Taormina","Taormina","Таормина"],"Luka":["Lucca","Lucca","Лукка"],"Činkve Tere":["Cinque Terre","Cinque Terre","Чинкве-Терре"],"San Marino":["San Marino","San Marino","Сан-Марино"],"Vatikan":["Vatican City","Vatikanstadt","Ватикан"],"Mantova":["Mantua","Mantua","Мантуя"],"Ferara":["Ferrara","Ferrara","Феррара"],"Urbino":["Urbino","Urbino","Урбино"],"Matera":["Matera","Matera","Матера"],"Alberobelo":["Alberobello","Alberobello","Альберобелло"],"Ostuni":["Ostuni","Ostuni","Остуни"],"Poljinjano a Mare":["Polignano a Mare","Polignano a Mare","Полиньяно-а-Маре"],"Salamanka":["Salamanca","Salamanca","Саламанка"],"Toledo":["Toledo","Toledo","Толедо"],"Kordoba":["Córdoba","Córdoba","Кордова"],"Segovija":["Segovia","Segovia","Сеговия"],"Ronda":["Ronda","Ronda","Ронда"],"Kadiz":["Cádiz","Cádiz","Кадис"],"Marbelja":["Marbella","Marbella","Марбелья"],"Kuenka":["Cuenca","Cuenca","Куэнка"],"Avila":["Ávila","Ávila","Авила"],"Halštat":["Hallstatt","Hallstatt","Гальштат"],"Cel am Ze":["Zell am See","Zell am See","Целль-ам-Зее"],"Kicbuel":["Kitzbühel","Kitzbühel","Кицбюэль"],"Sankt Anton am Arlberg":["St. Anton am Arlberg","St. Anton am Arlberg","Санкт-Антон-ам-Арльберг"],"Baden kod Beča":["Baden bei Wien","Baden bei Wien","Баден под Веной"],"Melk":["Melk","Melk","Мельк"],"Verfen":["Werfen","Werfen","Верфен"],"Banska Bistrica":["Banská Bystrica","Banská Bystrica","Банска-Бистрица"],"Visoke Tatre":["High Tatras","Hohe Tatra","Высокие Татры"],"Kembridž":["Cambridge","Cambridge","Кембридж"],"Oksford":["Oxford","Oxford","Оксфорд"],"Versaj":["Versailles","Versailles","Версаль"],"Kan":["Caen","Caen","Кан"],"Dižon":["Dijon","Dijon","Дижон"],"Anže":["Angers","Angers","Анже"],"Le Mans":["Le Mans","Le Mans","Ле-Ман"],"Amjen":["Amiens","Amiens","Амьен"],"Orlean":["Orléans","Orléans","Орлеан"],"Mec":["Metz","Metz","Мец"],"Hajdelberg":["Heidelberg","Heidelberg","Гейдельберг"],"Bon":["Bonn","Bonn","Бонн"],"Visbaden":["Wiesbaden","Wiesbaden","Висбаден"],"Majnc":["Mainz","Mainz","Майнц"],"Ahen":["Aachen","Aachen","Ахен"],"Regensburg":["Regensburg","Regensburg","Регенсбург"],"Vurcburg":["Würzburg","Würzburg","Вюрцбург"],"Trir":["Trier","Trier","Трир"],"Potsdam":["Potsdam","Potsdam","Потсдам"],"Kil":["Kiel","Kiel","Киль"],"Magdeburg":["Magdeburg","Magdeburg","Магдебург"],"Kemnic":["Chemnitz","Chemnitz","Хемниц"],"Ulm":["Ulm","Ulm","Ульм"],"Frajburg":["Freiburg","Freiburg","Фрайбург"],"Konstanc":["Konstanz","Konstanz","Констанц"],"Hag":["The Hague","Den Haag","Гаага"],"Utreht":["Utrecht","Utrecht","Утрехт"],"Lilehamer":["Lillehammer","Lillehammer","Лиллехаммер"],"Gejrangerfjord":["Geirangerfjord","Geirangerfjord","Гейрангер-фьорд"],"Upsala":["Uppsala","Uppsala","Уппсала"],"Lund":["Lund","Lund","Лунд"],"Odense":["Odense","Odense","Оденсе"],"Roskilde":["Roskilde","Roskilde","Роскилле"],"Helsingor":["Helsingør","Helsingør","Хельсингёр"],"Lahti":["Lahti","Lahti","Лахти"],"Sankt Moric":["St. Moritz","St. Moritz","Санкт-Мориц"],"Lucern":["Lucerne","Luzern","Люцерн"],"Interlaken":["Interlaken","Interlaken","Интерлакен"],"Cermat":["Zermatt","Zermatt","Церматт"],"Davos":["Davos","Davos","Давос"],"Kijev":["Kyiv","Kiew","Киев"],"Lavov":["Lviv","Lemberg","Львов"],"Odesa":["Odesa","Odessa","Одесса"],"Harkov":["Kharkiv","Charkiw","Харьков"],"Mostar":["Mostar","Mostar","Мостар"],"Mikonos":["Mykonos","Mykonos","Миконос"],"Rodos":["Rhodes","Rhodos","Родос"],"Krit":["Crete","Kreta","Крит"],"Barselona":["Barcelona","Barcelona","Барселона"],"Ibica":["Ibiza","Ibiza","Ибица"],"Minhen":["Munich","München","Мюнхен"],"Tel Aviv":["Tel Aviv","Tel Aviv","Тель-Авив"],"Dubai":["Dubai","Dubai","Дубай"],"Kairo":["Cairo","Kairo","Каир"],"Šarm El Šeik":["Sharm El Sheikh","Scharm El-Scheich","Шарм-эш-Шейх"],"Marakeš":["Marrakech","Marrakesch","Марракеш"],"Njujork":["New York","New York","Нью-Йорк"],"Majami":["Miami","Miami","Майами"],"Los Anđeles":["Los Angeles","Los Angeles","Лос-Анджелес"],"Bangkok":["Bangkok","Bangkok","Бангкок"],"Puket":["Phuket","Phuket","Пхукет"],"Tokio":["Tokyo","Tokio","Токио"],"Bali":["Bali","Bali","Бали"],"Singapur":["Singapore","Singapur","Сингапур"],"Sidnej":["Sydney","Sydney","Сидней"],"Kejptaun":["Cape Town","Kapstadt","Кейптаун"],"Bodrum":["Bodrum","Bodrum","Бодрум"],"Kortina d'Ampeco":["Cortina d'Ampezzo","Cortina d'Ampezzo","Кортина-д'Ампеццо"],"Novi Sad":["Novi Sad","Novi Sad","Нови-Сад"],"Subotica":["Subotica","Subotica","Суботица"],"Kragujevac":["Kragujevac","Kragujevac","Крагуевац"],"Kraljevo":["Kraljevo","Kraljevo","Кралево"],"Novi Pazar":["Novi Pazar","Novi Pazar","Нови-Пазар"],"Šabac":["Šabac","Šabac","Шабац"],"Zrenjanin":["Zrenjanin","Zrenjanin","Зренянин"],"Pančevo":["Pančevo","Pančevo","Панчево"],"Čačak":["Čačak","Čačak","Чачак"],"Kruševac":["Kruševac","Kruševac","Крушевац"],"Leskovac":["Leskovac","Leskovac","Лесковац"],"Vranje":["Vranje","Vranje","Вранье"],"Užice":["Užice","Užice","Ужице"],"Valjevo":["Valjevo","Valjevo","Валево"],"Smederevo":["Smederevo","Smederevo","Смедерево"],"Sombor":["Sombor","Sombor","Сомбор"],"Zaječar":["Zaječar","Zaječar","Заечар"],"Pirot":["Pirot","Pirot","Пирот"],"Loznica":["Loznica","Loznica","Лозница"],"Požarevac":["Požarevac","Požarevac","Пожаревац"],"Sremska Mitrovica":["Sremska Mitrovica","Sremska Mitrovica","Сремска-Митровица"],"Vršac":["Vršac","Vršac","Вршац"],"Kikinda":["Kikinda","Kikinda","Кикинда"],"Jagodina":["Jagodina","Jagodina","Ягодина"],"Paraćin":["Paraćin","Paraćin","Параджин"],"Bor":["Bor","Bor","Бор"],"Negotin":["Negotin","Negotin","Неготин"],"Prijepolje":["Prijepolje","Prijepolje","Приеполье"],"Priboj":["Priboj","Priboj","Прибой"],"Sjenica":["Sjenica","Sjenica","Сеница"],"Prokuplje":["Prokuplje","Prokuplje","Прокупле"],"Vrnjačka Banja":["Vrnjačka Banja","Vrnjačka Banja","Врнячка-Баня"],"Sokobanja":["Sokobanja","Sokobanja","Сокобаня"],"Aleksinac":["Aleksinac","Aleksinac","Алексинац"],"Vlasotince":["Vlasotince","Vlasotince","Власотинце"],"Surdulica":["Surdulica","Surdulica","Сурдулица"],"Ivanjica":["Ivanjica","Ivanjica","Иваньица"],"Ćuprija":["Ćuprija","Ćuprija","Чуприя"],"Svilajnac":["Svilajnac","Svilajnac","Свилайнац"],"Senta":["Senta","Senta","Сента"],"Bečej":["Bečej","Bečej","Бечей"],"Vrbas":["Vrbas","Vrbas","Врбас"],"Bačka Palanka":["Bačka Palanka","Bačka Palanka","Бачка-Паланка"],"Ruma":["Ruma","Ruma","Рума"],"Inđija":["Inđija","Inđija","Инджия"],"Stara Pazova":["Stara Pazova","Stara Pazova","Стара-Пазова"],"Šid":["Šid","Šid","Шид"],"Budva":["Budva","Budva","Будва"],"Danilovgrad":["Danilovgrad","Danilovgrad","Даниловград"],"Pljevlja":["Pljevlja","Pljevlja","Плевля"],"Berane":["Berane","Berane","Беране"],"Rožaje":["Rožaje","Rožaje","Рожае"],"Bijelo Polje":["Bijelo Polje","Bijelo Polje","Биело-Поле"],"Bar":["Bar","Bar","Бар"],"Herceg Novi":["Herceg Novi","Herceg Novi","Херцег-Нови"],"Igalo":["Igalo","Igalo","Игало"],"Nikšić":["Nikšić","Nikšić","Никшич"],"Cetinje":["Cetinje","Cetinje","Цетине"],"Ulcinj":["Ulcinj","Ulcinj","Ульцинь"],"Petrovac":["Petrovac","Petrovac","Петровац"],"Sutomore":["Sutomore","Sutomore","Сутоморе"],"Perast":["Perast","Perast","Пераст"],"Risan":["Risan","Risan","Рисан"],"Kotor":["Kotor","Kotor","Котор"],"Kolašin":["Kolašin","Kolašin","Колашин"],"Žabljak":["Žabljak","Žabljak","Жабляк"],"Zenica":["Zenica","Zenica","Зеница"],"Prijedor":["Prijedor","Prijedor","Приедор"],"Bihać":["Bihać","Bihać","Бихач"],"Doboj":["Doboj","Doboj","Добой"],"Trebinje":["Trebinje","Trebinje","Требинье"],"Foča":["Foča","Foča","Фоча"],"Bijeljina":["Bijeljina","Bijeljina","Биелина"],"Brčko":["Brčko","Brčko","Брчко"],"Travnik":["Travnik","Travnik","Травник"],"Livno":["Livno","Livno","Ливно"],"Goražde":["Goražde","Goražde","Горажде"],"Vukovar":["Vukovar","Vukovar","Вуковар"],"Slavonski Brod":["Slavonski Brod","Slavonski Brod","Славонски-Брод"],"Varaždin":["Varaždin","Varaždin","Вараждин"],"Knin":["Knin","Knin","Книн"],"Šibenik":["Šibenik","Šibenik","Шибеник"],"Makarska":["Makarska","Makarska","Макарска"],"Trogir":["Trogir","Trogir","Трогир"],"Hvar":["Hvar","Hvar","Хвар"],"Rovinj":["Rovinj","Rovinj","Ровинь"],"Sisak":["Sisak","Sisak","Сисак"],"Karlovac":["Karlovac","Karlovac","Карловац"],"Bitolj":["Bitola","Bitola","Битоль"],"Tetovo":["Tetovo","Tetovo","Тетово"],"Kumanovo":["Kumanovo","Kumanovo","Куманово"],"Gostivar":["Gostivar","Gostivar","Гостивар"],"Strumica":["Strumica","Strumica","Струмица"],"Prilep":["Prilep","Prilep","Прилеп"],"Struga":["Struga","Struga","Струга"],"Veles":["Veles","Veles","Велес"],"Prizren":["Prizren","Prizren","Призрен"],"Peć":["Peć","Peć","Печ"],"Đakovica":["Đakovica","Đakovica","Джяковица"],"Mitrovica":["Mitrovica","Mitrovica","Митровица"],"Skadar":["Shkodër","Shkodër","Шкодер"],"Sarandë":["Sarandë","Sarandë","Саранда"],"Sarande":["Sarandë","Sarandë","Саранда"],"Vlorë":["Vlorë","Vlorë","Влёра"],"Durrës":["Durrës","Durrës","Дуррес"],"Bled":["Bled","Bled","Блед"],"Kranjska Gora":["Kranjska Gora","Kranjska Gora","Краньска-Гора"],"Kranj":["Kranj","Kranj","Крань"],"Bohinj":["Bohinj","Bohinj","Бохинь"],"Bovec":["Bovec","Bovec","Бовец"],"Kobarid":["Kobarid","Kobarid","Кобарид"],"Logarska Dolina":["Logarska Dolina","Logarska Dolina","Логарская долина"],"Idrija":["Idrija","Idrija","Идрия"],"Postojna":["Postojna","Postojna","Постойна"],"Škocjanske jame":["Škocjan Caves","Škocjan Caves","Шкоцянские пещеры"],"Predjama":["Predjama","Predjama","Предъяма"],"Vintgar":["Vintgar","Vintgar","Винтгар"],"Kamnik":["Kamnik","Kamnik","Камник"],"Celje":["Celje","Celje","Целье"],"Novo Mesto":["Novo Mesto","Novo Mesto","Ново-Место"],"Rogaška Slatina":["Rogaška Slatina","Rogaška Slatina","Рогашка-Слатина"],"Dolenjske Toplice":["Dolenjske Toplice","Dolenjske Toplice","Доленьске-Топлице"],"Laško":["Laško","Laško","Лашко"],"Triglav":["Triglav","Triglav","Триглав"],"Vogel":["Vogel","Vogel","Вогел"],"Krvavec":["Krvavec","Krvavec","Крвавец"],"Mangart":["Mangart","Mangart","Мангарт"],"Škofja Loka":["Škofja Loka","Škofja Loka","Шкофья-Лока"],"Nova Gorica":["Nova Gorica","Nova Gorica","Нова-Горица"],"Jesenice":["Jesenice","Jesenice","Есенице"],"Velenje":["Velenje","Velenje","Веленье"],"Čatež":["Čatež","Čatež","Чатеж"],"Ptuj":["Ptuj","Ptuj","Птуй"],"Terme Ptuj":["Terme Ptuj","Terme Ptuj","Терме-Птуй"],"Pohorje":["Pohorje","Pohorje","Похорье"],"Slovenj Gradec":["Slovenj Gradec","Slovenj Gradec","Словень-Градец"],"Murska Sobota":["Murska Sobota","Murska Sobota","Мурска-Собота"],"Moravske Toplice":["Moravske Toplice","Moravske Toplice","Моравске-Топлице"],"Radenci":["Radenci","Radenci","Раденци"],"Koper":["Koper","Koper","Копер"],"Piran":["Piran","Piran","Пиран"],"Portorož":["Portorož","Portorož","Порторож"],"Izola":["Izola","Izola","Изола"],"Ankaran":["Ankaran","Ankaran","Анкаран"],"Albanija":["Albania","Albanien","Албания"],"Argentina":["Argentina","Argentinien","Аргентина"],"Australija":["Australia","Australien","Австралия"],"Austrija":["Austria","Österreich","Австрия"],"Azerbejdžan":["Azerbaijan","Aserbaidschan","Азербайджан"],"Belgija":["Belgium","Belgien","Бельгия"],"Bosna i Hercegovina":["Bosnia and Herzegovina","Bosnien und Herzegowina","Босния и Герцеговина"],"Brazil":["Brazil","Brasilien","Бразилия"],"Bugarska":["Bulgaria","Bulgarien","Болгария"],"Crna Gora":["Montenegro","Montenegro","Черногория"],"Danska":["Denmark","Dänemark","Дания"],"Egipat":["Egypt","Ägypten","Египет"],"Estonija":["Estonia","Estland","Эстония"],"Filipini":["Philippines","Philippinen","Филиппины"],"Finska":["Finland","Finnland","Финляндия"],"Francuska":["France","Frankreich","Франция"],"Gruzija":["Georgia","Georgien","Грузия"],"Grčka":["Greece","Griechenland","Греция"],"Holandija":["Netherlands","Niederlande","Нидерланды"],"Hrvatska":["Croatia","Kroatien","Хорватия"],"Indija":["India","Indien","Индия"],"Indonezija":["Indonesia","Indonesien","Индонезия"],"Irska":["Ireland","Irland","Ирландия"],"Island":["Iceland","Island","Исландия"],"Italija":["Italy","Italien","Италия"],"Izrael":["Israel","Israel","Израиль"],"Japan":["Japan","Japan","Япония"],"Južna Koreja":["South Korea","Südkorea","Южная Корея"],"Južnoafrička Republika":["South Africa","Südafrika","Южно-Африканская Республика"],"Kanada":["Canada","Kanada","Канада"],"Katar":["Qatar","Katar","Катар"],"Kenija":["Kenya","Kenia","Кения"],"Kina":["China","China","Китай"],"Kipar":["Cyprus","Zypern","Кипр"],"Kolumbija":["Colombia","Kolumbien","Колумбия"],"Kosovo":["Kosovo","Kosovo","Косово"],"Letonija":["Latvia","Lettland","Латвия"],"Litvanija":["Lithuania","Litauen","Литва"],"Maldivi":["Maldives","Malediven","Мальдивы"],"Malezija":["Malaysia","Malaysia","Малайзия"],"Malta":["Malta","Malta","Мальта"],"Maroko":["Morocco","Marokko","Марокко"],"Mađarska":["Hungary","Ungarn","Венгрия"],"Meksiko":["Mexico","Mexiko","Мексика"],"Monako":["Monaco","Monaco","Монако"],"Nemačka":["Germany","Deutschland","Германия"],"Norveška":["Norway","Norwegen","Норвегия"],"Novi Zeland":["New Zealand","Neuseeland","Новая Зеландия"],"Peru":["Peru","Peru","Перу"],"Poljska":["Poland","Polen","Польша"],"Portugalija":["Portugal","Portugal","Португалия"],"Rumunija":["Romania","Rumänien","Румыния"],"SAD":["USA","USA","США"],"Saudijska Arabija":["Saudi Arabia","Saudi-Arabien","Саудовская Аравия"],"Severna Makedonija":["North Macedonia","Nordmazedonien","Северная Македония"],"Slovačka":["Slovakia","Slowakei","Словакия"],"Slovenija":["Slovenia","Slowenien","Словения"],"Srbija":["Serbia","Serbien","Сербия"],"Tajland":["Thailand","Thailand","Таиланд"],"Turska":["Turkey","Türkei","Турция"],"UAE":["UAE","VAE","ОАЭ"],"Velika Britanija":["United Kingdom","Großbritannien","Великобритания"],"Vijetnam":["Vietnam","Vietnam","Вьетнам"],"Češka":["Czechia","Tschechien","Чехия"],"Španija":["Spain","Spanien","Испания"],"Švajcarska":["Switzerland","Schweiz","Швейцария"],"Švedska":["Sweden","Schweden","Швеция"]};
  function place(x) {
    return String(x).split(', ').map(function (p) { return PLACES.hasOwnProperty(p) ? PLACES[p][I] : p; }).join(', ');
  }

  /* tačan tekst: sr → [en, de, ru] */
  var EX = {
    /* sekcije i navigacija */
    'Avio prevoz': ['Flights', 'Flüge', 'Авиабилеты'],
    'Smeštaj': ['Accommodation', 'Unterkunft', 'Проживание'],
    'Atrakcije i aktivnosti': ['Attractions & activities', 'Attraktionen & Aktivitäten', 'Достопримечательности и активности'],
    'Rent a car': ['Car rental', 'Mietwagen', 'Аренда авто'],
    'Osiguranje': ['Insurance', 'Reiseversicherung', 'Страховка'],
    'Saveti za putovanje': ['Travel tips', 'Reisetipps', 'Советы для поездки'],
    'Ruta': ['Route', 'Route', 'Маршрут'],
    'Transferi': ['Transfers', 'Transfers', 'Трансферы'],
    'Autobus': ['Bus', 'Bus', 'Автобус'],
    'Praktične informacije': ['Practical information', 'Praktische Informationen', 'Практическая информация'],
    'Ruta · Transferi · Autobus · Saveti': ['Route · Transfers · Bus · Tips', 'Route · Transfers · Bus · Tipps', 'Маршрут · Трансферы · Автобус · Советы'],
    'Let': ['Flight', 'Flug', 'Перелёт'],
    'Atrakcije': ['Attractions', 'Attraktionen', 'Достопримечательности'],
    'Auto': ['Car', 'Auto', 'Авто'],
    'O mestu': ['About', 'Über den Ort', 'О месте'],
    'Praktično': ['Practical', 'Praktisches', 'Практика'],
    'Ovo je afilijacijski (sponzorisan) link — ako rezervišeš preko njega, SKLOPI može ostvariti provizuju od partnera. Cena za tebe ostaje ista.':
      ['This is an affiliate (sponsored) link — if you book through it, SKLOPI may earn a commission from the partner. The price stays the same for you.',
       'Dies ist ein Partnerlink (gesponsert) – wenn du darüber buchst, erhält SKLOPI eventuell eine Provision vom Partner. Für dich bleibt der Preis gleich.',
       'Это партнёрская (спонсорская) ссылка: если ты забронируешь через неё, SKLOPI может получить комиссию от партнёра. Для тебя цена не меняется.'],
    'Prethodne ponude': ['Previous offers', 'Vorherige Angebote', 'Предыдущие предложения'],
    'Sledeće ponude': ['Next offers', 'Nächste Angebote', 'Следующие предложения'],
    'Promeni valutu': ['Change currency', 'Währung ändern', 'Сменить валюту'],
    'Brza navigacija': ['Quick navigation', 'Schnellnavigation', 'Быстрая навигация'],
    'Glavna navigacija': ['Main navigation', 'Hauptnavigation', 'Главная навигация'],
    'Početna': ['Home', 'Start', 'Главная'],
    'Destinacije': ['Destinations', 'Reiseziele', 'Направления'],
    'Vodiči': ['Guides', 'Reiseführer', 'Гайды'],
    'Moj put': ['My trip', 'Meine Reise', 'Моя поездка'],
    'Cene su ilustrativne procene. Dugme otvara pretragu kod partnera sa tvojim datumima, a tačnu cenu i dostupnost potvrđuješ tamo.':
      ['Prices are illustrative estimates. The button opens a search with the partner using your dates, and you confirm the exact price and availability there.',
       'Die Preise sind Richtwerte. Die Schaltfläche öffnet die Suche beim Partner mit deinen Daten – den genauen Preis und die Verfügbarkeit bestätigst du dort.',
       'Цены — ориентировочные. Кнопка открывает поиск у партнёра с твоими датами, точную цену и наличие ты подтверждаешь там.'],
    'Linkovi ka KAYAK-u, Booking.com-u, Viator-u, Airalo-u i World Nomads-u su partnerski: SKLOPI može da dobije proviziju, a tebi cena ostaje ista. Cene i dostupnost potvrđuješ na sajtu partnera.':
      ['Links to KAYAK, Booking.com, Viator, Airalo and World Nomads are affiliate links: SKLOPI may earn a commission, and the price stays the same for you. You confirm prices and availability on the partner’s site.',
       'Die Links zu KAYAK, Booking.com, Viator, Airalo und World Nomads sind Partnerlinks: SKLOPI erhält eventuell eine Provision, für dich bleibt der Preis gleich. Preise und Verfügbarkeit bestätigst du auf der Partnerseite.',
       'Ссылки на KAYAK, Booking.com, Viator, Airalo и World Nomads — партнёрские: SKLOPI может получить комиссию, а для тебя цена не меняется. Цены и наличие ты подтверждаешь на сайте партнёра.'],
    /* ponude */
    'Ponude letova': ['Flight offers', 'Flugangebote', 'Предложения по перелётам'],
    'Ponude smeštaja': ['Accommodation offers', 'Unterkunftsangebote', 'Предложения по проживанию'],
    'Ponude atrakcija': ['Attraction offers', 'Angebote für Attraktionen', 'Предложения по достопримечательностям'],
    'Ponude rent a car': ['Car rental offers', 'Mietwagenangebote', 'Предложения по аренде авто'],
    'primer': ['example', 'Beispiel', 'пример'],
    'test podaci': ['test data', 'Testdaten', 'тестовые данные'],
    'Aviokompanija': ['Airline', 'Fluggesellschaft', 'Авиакомпания'],
    'Prikaži manje': ['Show less', 'Weniger anzeigen', 'Показать меньше'],
    'Afilijacija': ['Affiliate', 'Partnerlink', 'Партнёрская ссылка'],
    'ukupno, povratna karta': ['total, return ticket', 'gesamt, Hin- und Rückflug', 'всего, билет туда-обратно'],
    'Dodaj u put': ['Add to trip', 'Zur Reise hinzufügen', 'Добавить в поездку'],
    'U tvom putu': ['In your trip', 'In deiner Reise', 'В твоей поездке'],
    /* traka, panel, specifikacija */
    'Najjeftiniji let': ['Cheapest flight', 'Günstigster Flug', 'Самый дешёвый перелёт'],
    'Pogledaj letove': ['View flights', 'Flüge ansehen', 'Смотреть перелёты'],
    'Tvoj put': ['Your trip', 'Deine Reise', 'Твоя поездка'],
    'Specifikacija': ['Breakdown', 'Aufstellung', 'Детализация'],
    'Pregled puta': ['Trip overview', 'Reiseübersicht', 'Обзор поездки'],
    'Sakrij specifikaciju': ['Hide breakdown', 'Aufstellung ausblenden', 'Скрыть детализацию'],
    'Podeli': ['Share', 'Teilen', 'Поделиться'],
    'Podeli put': ['Share trip', 'Reise teilen', 'Поделиться поездкой'],
    'Podeli ovaj put': ['Share this trip', 'Diese Reise teilen', 'Поделиться этой поездкой'],
    'Isprazni put': ['Clear trip', 'Reise leeren', 'Очистить поездку'],
    'Zatvori specifikaciju': ['Close breakdown', 'Aufstellung schließen', 'Закрыть детализацию'],
    'Ukloni': ['Remove', 'Entfernen', 'Убрать'],
    'Pogledaj': ['View', 'Ansehen', 'Смотреть'],
    'Dodato u Tvoj put': ['Added to your trip', 'Zur Reise hinzugefügt', 'Добавлено в поездку'],
    'Rezervišeš kod partnera': ['Book with partners', 'Buchung bei Partnern', 'Бронирование у партнёров'],
    'Plaćaš na licu mesta': ['Pay on site', 'Vor Ort zu zahlen', 'Оплата на месте'],
    'Međuzbir': ['Subtotal', 'Zwischensumme', 'Промежуточный итог'],
    'UKUPNO': ['TOTAL', 'GESAMT', 'ИТОГО'],
    'plaća se u smeštaju': ['paid at your accommodation', 'Zahlung in der Unterkunft', 'оплата в месте проживания'],
    'Boravišna taksa (okvirno)': ['Tourist tax (approx.)', 'Kurtaxe (ca.)', 'Туристический сбор (примерно)'],
    'Ilustrativna procena. Aktivnosti, eSIM i boravišna taksa računati su za sve putnike. Tačnu cenu i dostupnost potvrđuješ kod partnera pre rezervacije.':
      ['Illustrative estimate. Activities, eSIM and tourist tax are calculated for all travellers. You confirm the exact price and availability with the partner before booking.',
       'Richtwert. Aktivitäten, eSIM und Kurtaxe sind für alle Reisenden berechnet. Den genauen Preis und die Verfügbarkeit bestätigst du vor der Buchung beim Partner.',
       'Ориентировочная оценка. Активности, eSIM и туристический сбор рассчитаны на всех путешественников. Точную цену и наличие ты подтверждаешь у партнёра перед бронированием.'],
    'Link do tvog puta je kopiran.': ['The link to your trip has been copied.', 'Der Link zu deiner Reise wurde kopiert.', 'Ссылка на твою поездку скопирована.'],
    'Vraćen je tvoj prethodni izbor.': ['Your previous selection has been restored.', 'Deine vorherige Auswahl wurde wiederhergestellt.', 'Твой предыдущий выбор восстановлен.'],
    'Neke stavke iz tvog prethodnog izbora više nisu dostupne.': ['Some items from your previous selection are no longer available.', 'Einige Punkte deiner vorherigen Auswahl sind nicht mehr verfügbar.', 'Некоторые позиции из твоего прошлого выбора больше недоступны.'],
    'Neke stavke iz podeljenog linka više nisu dostupne pa nisu dodate.': ['Some items from the shared link are no longer available, so they were not added.', 'Einige Punkte aus dem geteilten Link sind nicht mehr verfügbar und wurden nicht hinzugefügt.', 'Некоторые позиции из общей ссылки больше недоступны и не были добавлены.'],
    /* kartice: smeštaj, auto, aktivnosti */
    'direktan let': ['direct flight', 'Direktflug', 'прямой рейс'],
    'manuelni menjač': ['manual transmission', 'Schaltgetriebe', 'механическая коробка'],
    'automatski menjač': ['automatic transmission', 'Automatikgetriebe', 'автоматическая коробка'],
    'Pešačka tura starim gradom': ['Old town walking tour', 'Rundgang durch die Altstadt', 'Пешеходная экскурсия по старому городу'],
    'Ulaznice za glavne atrakcije': ['Tickets to the main attractions', 'Tickets für die Hauptattraktionen', 'Билеты на главные достопримечательности'],
    'Poludnevna tura sa vodičem': ['Half-day guided tour', 'Halbtägige Führung', 'Полудневная экскурсия с гидом'],
    'Obilazak grada autobusom (hop-on hop-off)': ['Hop-on hop-off city bus tour', 'Hop-on-hop-off-Stadtrundfahrt im Bus', 'Обзорная экскурсия на автобусе hop-on hop-off'],
    'Obilazak biciklom': ['Bike tour', 'Fahrradtour', 'Велоэкскурсия'],
    'Večernja tura': ['Evening tour', 'Abendtour', 'Вечерняя экскурсия'],
    'Kulinarska tura': ['Food tour', 'Kulinarische Tour', 'Гастрономический тур'],
    'Privatna tura': ['Private tour', 'Privattour', 'Частная экскурсия'],
    'Degustacija vina': ['Wine tasting', 'Weinverkostung', 'Дегустация вина'],
    'Celodnevni izlet iz grada': ['Full-day trip from the city', 'Ganztagsausflug ab der Stadt', 'Однодневная поездка из города']
  };
  var HOTEL_TAG = {
    'najpovoljniji': ['cheapest', 'günstigste', 'самый выгодный'],
    'standard': ['standard', 'Standard', 'стандарт'],
    'blizu centra': ['near the centre', 'zentrumsnah', 'рядом с центром'],
    'povoljniji': ['more affordable', 'preiswerter', 'выгоднее'],
    'najbolji odnos cene i kvaliteta': ['best value for money', 'bestes Preis-Leistungs-Verhältnis', 'лучшее соотношение цены и качества'],
    'najbolje ocenjeni': ['top rated', 'am besten bewertet', 'с лучшими оценками'],
    'više komfora': ['more comfort', 'mehr Komfort', 'больше комфорта'],
    'luksuz': ['luxury', 'Luxus', 'люкс']
  };
  var CAR_CLASS = {
    'Mini': ['Mini', 'Mini', 'Мини'],
    'Ekonomik': ['Economy', 'Economy', 'Эконом'],
    'Kompakt': ['Compact', 'Kompaktklasse', 'Компакт'],
    'Kompakt automatik': ['Compact automatic', 'Kompakt Automatik', 'Компакт автомат'],
    'Kombi': ['Estate', 'Kombi', 'Универсал'],
    'Porodični': ['Family', 'Familie', 'Семейный'],
    'Mali SUV': ['Small SUV', 'Kleiner SUV', 'Малый SUV'],
    'SUV': ['SUV', 'SUV', 'SUV'],
    'Kabriolet': ['Convertible', 'Cabrio', 'Кабриолет'],
    'Premium': ['Premium', 'Premium', 'Премиум']
  };
  var CAR_MODEL = { 'BMW serije 3': ['BMW 3 Series', 'BMW 3er', 'BMW 3 серии'] };
  function lk(map, key) { return map.hasOwnProperty(key) ? map[key][I] : key; }

  /* tekst sa brojevima/promenljivim delovima */
  var RULES = [
    [/^Tvoj put · (\d+) stavk(?:a|e|i)$/, function (m) { return P('Your trip', 'Deine Reise', 'Твоя поездка') + ' · ' + N.items(+m[1]); }],
    [/^Tvoj put, (\d+) stavk(?:a|e|i), (€[\d.,]+)\. Otvori specifikaciju$/, function (m) { return P('Your trip, ', 'Deine Reise, ', 'Твоя поездка, ') + N.items(+m[1]) + ', ' + m[2] + P('. Open breakdown', '. Aufstellung öffnen', '. Открыть детализацию'); }],
    [/^Dodato u Tvoj put: (.+)$/, function (m) { return P('Added to your trip: ', 'Zur Reise hinzugefügt: ', 'Добавлено в поездку: ') + tr(m[1]); }],
    [/^\/ ukupno za (\d+) putnika$/, function (m) { return '/ ' + P('total for ', 'gesamt für ', 'всего ') + N.pax(+m[1]); }],
    [/^ukupno za (\d+) putnika$/, function (m) { return P('total for ', 'gesamt für ', 'всего ') + N.pax(+m[1]); }],
    [/^\/ (\d+) putnik(a)?$/, function (m) { return '/ ' + N.pax(+m[1]); }],
    [/^Procena za (\d+) putnika · (\d+) dan(?:a)?: ?$/, function (m) { return P('Estimate for ', 'Schätzung für ', 'Оценка для ') + (I === 2 ? N.pax(+m[1]).replace(/^для /, '') : N.pax(+m[1])) + ' · ' + N.days(+m[2]) + ':'; }],
    [/^ukupno · ≈ (€[\d.,]+) po noći$/, function (m) { return P('total · ≈ ' + m[1] + ' per night', 'gesamt · ≈ ' + m[1] + ' pro Nacht', 'всего · ≈ ' + m[1] + ' за ночь'); }],
    [/^ukupno · ≈ (€[\d.,]+) dnevno$/, function (m) { return P('total · ≈ ' + m[1] + ' per day', 'gesamt · ≈ ' + m[1] + ' pro Tag', 'всего · ≈ ' + m[1] + ' в день'); }],
    [/^≈ (€[\d.,]+) po osobi$/, function (m) { return P('≈ ' + m[1] + ' per person', '≈ ' + m[1] + ' pro Person', '≈ ' + m[1] + ' на человека'); }],
    [/^po osobi(?: · (€[\d.,]+) za (\d+))?$/, function (m) {
      var base = P('per person', 'pro Person', 'на человека');
      return m[1] ? base + ' · ' + m[1] + ' ' + P('for', 'für', 'за') + ' ' + m[2] : base;
    }],
    [/^Pogledaj na (.+)$/, function (m) { return P('View on ', 'Ansehen bei ', 'Смотреть на ') + m[1]; }],
    [/^Otvori na (.+?)( ↗)?$/, function (m) { return P('Open on ', 'Öffnen bei ', 'Открыть на ') + m[1] + (m[2] || ''); }],
    [/^Prikaži još \((\d+)\)$/, function (m) { return P('Show more (', 'Mehr anzeigen (', 'Показать ещё (') + m[1] + ')'; }],
    [/^(\d+) ponud[ae]$/, function (m) { return N.offers(+m[1]); }],
    [/^Hotel (\d)★ · (.+)$/, function (m) { return P('Hotel ', 'Hotel ', 'Отель ') + m[1] + '★ · ' + lk(HOTEL_TAG, m[2]); }],
    [/^(\d+) noćenj[ea] · (\d+) sob[ae]$/, function (m) { return N.nights(+m[1]) + ' · ' + N.rooms(+m[2]); }],
    [/^(\d+) dan(?:a)? · (manuelni menjač|automatski menjač)$/, function (m) { return N.days(+m[1]) + ' · ' + lk(EX, m[2]); }],
    [/^(.+?) · (.+) ili slično$/, function (m) {
      return lk(CAR_CLASS, m[1]) + ' · ' + lk(CAR_MODEL, m[2]) + P(' or similar', ' oder ähnlich', ' или аналогичный');
    }],
    [/^(.+) → (.+?) · (\d+h \d+min) · direktan let$/, function (m) { return place(m[1]) + ' → ' + place(m[2]) + ' · ' + m[3] + ' · ' + lk(EX, 'direktan let'); }],
    [/^(.+ · \d\d:\d\d – \d\d:\d\d) \(\+1d\)$/, function (m) { return m[1] + P(' (+1 day)', ' (+1 Tag)', ' (+1 день)'); }],
    [/^(\d+) × (\d+) noć\. × (€[\d.,]+)( · procena)?$/, function (m) { return m[1] + ' × ' + m[2] + P(' nights × ', ' Nächte × ', ' ноч. × ') + m[3] + (m[4] ? P(' · estimate', ' · Schätzung', ' · оценка') : ''); }],
    [/^(\d+) × (€[\d.,]+) · (\d+) dan(?:a)?$/, function (m) { return m[1] + ' × ' + m[2] + ' · ' + N.days(+m[3]); }],
    [/^eSIM paket · (.+)$/, function (m) { return P('eSIM plan · ', 'eSIM-Paket · ', 'Пакет eSIM · ') + place(m[1]); }],
    [/^(\d+) stavka je u drugoj valuti i nije uračunata u zbir\.$/, function (m) {
      return P(m[1] + ' item is in another currency and is not included in the total.', m[1] + ' Posten ist in einer anderen Währung und nicht in der Summe enthalten.', m[1] + ' позиция в другой валюте и не включена в итог.');
    }]
  ];

  function core(s) {
    if (EX.hasOwnProperty(s)) return EX[s][I];
    if (PLACES.hasOwnProperty(s)) return PLACES[s][I];
    for (var i = 0; i < RULES.length; i++) { var m = RULES[i][0].exec(s); if (m) return RULES[i][1](m); }
    return null;
  }
  function tr(str) {
    if (typeof str !== 'string' || !str) return str;
    var lead = str.match(/^\s*/)[0], trail = str.match(/\s*$/)[0], s = str.trim();
    if (!s) return str;
    var r = core(s);
    if (r == null) {                                   /* "✈️ Let", "＋ Dodaj u put", "✓ U tvom putu" — emoji/znak ispred teksta */
      var m = /^([^\p{L}\p{N}€]+)(.+)$/u.exec(s);
      if (m) { var r2 = core(m[2]); if (r2 != null) r = m[1] + r2; }
    }
    return r == null ? str : lead + r + trail;
  }
  window.DI18N.tr = tr;

  var ATTRS = ['aria-label', 'title', 'placeholder', 'alt'];
  function fixAttr(el, name) {
    var v = el.getAttribute(name); if (!v) return;
    var r = tr(v); if (r !== v) el.setAttribute(name, r);
  }
  function fixText(node) {
    var v = node.nodeValue; if (!v || !v.trim()) return;
    var r = tr(v); if (r !== v) node.nodeValue = r;
  }
  function walk(node) {
    if (node.nodeType === 3) { fixText(node); return; }
    if (node.nodeType !== 1) return;
    var t = node.nodeName;
    if (t === 'SCRIPT' || t === 'STYLE' || t === 'TEXTAREA' || t === 'NOSCRIPT') return;
    for (var i = 0; i < ATTRS.length; i++) if (node.hasAttribute(ATTRS[i])) fixAttr(node, ATTRS[i]);
    for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
  }
  function start() {
    if (!document.body) return;
    walk(document.body);
    try {
      new MutationObserver(function (list) {
        for (var i = 0; i < list.length; i++) {
          var r = list[i];
          if (r.type === 'childList') { for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]); }
          else if (r.type === 'characterData') fixText(r.target);
          else if (r.type === 'attributes') fixAttr(r.target, r.attributeName);
        }
      }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    } catch (e) {}
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
