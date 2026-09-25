import type { LocaleText } from '../catalog'

/**
 * «📖 ИСТОРИЯ» for every lot that did not have one yet. Documented facts only,
 * written conservatively; no auction records. Generic lots (unattributed
 * pieces) describe the history of the type or technique. DuckJackpot lore is
 * explicitly framed as fiction.
 */
const H = (ru: string, en: string): LocaleText => ({ ru, en })

export const LOT_HISTORY_MORE: Record<string, LocaleText> = {
  // ⌚ WATCHES
  watch_rolex_daytona: H(
    'Cosmograph Daytona появился в 1963 году и получил имя гоночной трассы Дейтона-Бич во Флориде. Ранние версии заводились вручную; автоматический калибр пришёл в 1988 году — сначала на основе механизма Zenith El Primero, а с 2000 года Rolex ставит собственный калибр.',
    'The Cosmograph Daytona appeared in 1963 and took its name from the Daytona Beach circuit in Florida. Early versions were hand-wound; an automatic calibre arrived in 1988 — first based on the Zenith El Primero, and from 2000 Rolex fitted its own movement.',
  ),
  watch_rolex_gmt: H(
    'GMT-Master представлен в 1955 году; его связывают с авиакомпанией Pan Am, пилотам которой нужно было видеть время двух часовых поясов. Сине-красный безель коллекционеры прозвали «Пепси».',
    'The GMT-Master was introduced in 1955 and is associated with Pan Am, whose pilots needed to read two time zones. Collectors nicknamed its blue-and-red bezel the “Pepsi”.',
  ),
  watch_rolex_gmt2: H(
    'GMT-Master II вышел в 1982 году. Главное отличие от первой модели — часовую стрелку можно переставлять отдельно, не останавливая часы, поэтому смена пояса в поездке занимает секунды.',
    'The GMT-Master II came out in 1982. The key change from the original: the hour hand can be set on its own without stopping the watch, so switching time zone on a trip takes seconds.',
  ),
  watch_rolex_datejust: H(
    'Datejust представили в 1945 году к 40-летию компании: это первые автоматические наручные часы с водонепроницаемым корпусом, где дата сама меняется в окошке циферблата. Увеличительная линза «Циклоп» над датой появилась в 1950-х.',
    'The Datejust was launched in 1945 for the company’s 40th anniversary: the first self-winding waterproof wristwatch with a date that changes by itself in a dial window. The “Cyclops” magnifier over the date arrived in the 1950s.',
  ),
  watch_rolex_daydate: H(
    'Day-Date появился в 1956 году и впервые показал на циферблате день недели полностью, словом. Модель выпускается только в драгоценных металлах, а браслет «President» был создан специально для неё.',
    'The Day-Date appeared in 1956 and was the first to spell out the weekday in full on the dial. It is made only in precious metals, and the “President” bracelet was created for it.',
  ),
  watch_rolex_explorer: H(
    'Explorer вышел в 1953 году — в год первого восхождения на Эверест Эдмунда Хиллари и Тенцинга Норгея; Rolex снабжала часами участников гималайских экспедиций. Принцип модели — максимальная читаемость: цифры 3, 6 и 9 на чёрном циферблате.',
    'The Explorer came out in 1953, the year Edmund Hillary and Tenzing Norgay first climbed Everest; Rolex supplied watches to Himalayan expeditions. The design is about legibility: 3, 6 and 9 on a black dial.',
  ),
  watch_rolex_explorer2: H(
    'Explorer II выпущен в 1971 году для спелеологов и полярников: в пещере или полярной ночью легко потерять счёт дню и ночи, а 24-часовая стрелка это показывает.',
    'The Explorer II was released in 1971 for cavers and polar explorers: in a cave or the polar night it is easy to lose track of day and night, and the 24-hour hand shows it.',
  ),
  watch_rolex_milgauss: H(
    'Название — от латинского mille («тысяча») и гаусс: часы рассчитаны на магнитное поле до 1000 гаусс. Механизм защищён внутренним экраном из мягкого железа, как клеткой Фарадея. Модель появилась в 1956 году для учёных и инженеров.',
    'The name comes from Latin mille (“thousand”) and gauss: the watch resists magnetic fields up to 1,000 gauss. The movement sits inside a soft-iron shield, like a Faraday cage. It appeared in 1956 for scientists and engineers.',
  ),
  watch_rolex_seadweller: H(
    'Sea-Dweller создан в 1967 году для профессиональных сатурационных погружений. Гелиевый клапан выпускает газ, проникший в корпус за время жизни в барокамере, чтобы стекло не выбило при декомпрессии.',
    'The Sea-Dweller was made in 1967 for professional saturation diving. Its helium escape valve lets out gas that seeps into the case during time in a pressure chamber, so the crystal is not blown off during decompression.',
  ),
  watch_patek_nautilus: H(
    'Nautilus 1976 года нарисовал Джеральд Жента — по его собственному рассказу, эскиз он сделал за несколько минут в ресторане. Форма корпуса вдохновлена иллюминатором корабля; стальные часы по цене золотых поначалу казались рынку дерзостью.',
    'The 1976 Nautilus was designed by Gérald Genta, who said he sketched it in a few minutes in a restaurant. The case was inspired by a ship’s porthole; a steel watch priced like gold at first looked audacious to the market.',
  ),
  watch_patek_calatrava: H(
    'Первый Calatrava — референс 96 1932 года, вышедший вскоре после того, как Patek Philippe перешла к семье Штерн. Дизайн следует идеям Баухауса: ничего лишнего. Название — от креста Калатравы, эмблемы марки.',
    'The first Calatrava, reference 96, appeared in 1932, soon after the Stern family took over Patek Philippe. Its design follows Bauhaus ideas: nothing superfluous. The name comes from the Calatrava cross, the brand’s emblem.',
  ),
  watch_ap_royal_oak: H(
    'Royal Oak 1972 года — тоже работа Джеральда Жента. Восьмиугольный безель с винтами напоминает водолазный шлем, а название взято у кораблей британского флота HMS Royal Oak. Стальные часы по цене золотых в 1972 году казались безумием.',
    'The 1972 Royal Oak is another Gérald Genta design. The screwed octagonal bezel recalls a diving helmet, and the name comes from the Royal Navy ships HMS Royal Oak. In 1972 a steel watch priced like gold seemed mad.',
  ),
  watch_ap_offshore: H(
    'Royal Oak Offshore представили в 1993 году; его нарисовал дизайнер Эмманюэль Гюэ. Корпус 42 мм в то время казался огромным, и часы прозвали «Зверем».',
    'The Royal Oak Offshore was launched in 1993, designed by Emmanuel Gueit. Its 42 mm case looked huge at the time, and the watch was nicknamed “The Beast”.',
  ),
  watch_rm_011: H(
    'Ришар Милль основал марку в 2001 году с идеей «гоночный болид на запястье». RM 011 — автоматический хронограф с функцией флайбэк и годовым календарём; модель связана с пилотом Формулы-1 Фелипе Массой.',
    'Richard Mille founded the brand in 2001 around the idea of “a racing car on the wrist”. The RM 011 is an automatic flyback chronograph with an annual calendar; the model is linked to Formula 1 driver Felipe Massa.',
  ),
  watch_rm_27: H(
    'RM 027 создан в 2010 году для Рафаэля Надаля: турбийон весит около 20 граммов вместе с ремешком. Надаль играл в этих часах официальные матчи, в том числе на турнирах Большого шлема.',
    'The RM 027 was made in 2010 for Rafael Nadal: a tourbillon weighing about 20 grams including the strap. Nadal wore it in official matches, including Grand Slam tournaments.',
  ),
  watch_vc_overseas: H(
    'Vacheron Constantin основан в Женеве в 1755 году и считается старейшей часовой мануфактурой с непрерывной историей. Линия Overseas 1996 года продолжила спортивную модель 222 1977 года.',
    'Vacheron Constantin was founded in Geneva in 1755 and is considered the oldest watch manufacture with an unbroken history. The 1996 Overseas line continued the sporty 222 of 1977.',
  ),
  watch_vc_patrimony: H(
    'Patrimony — линия минималистичных круглых часов дома, опирающаяся на тонкие модели 1950-х годов из архива. Главная роскошь здесь — пропорции и тонкость корпуса, а не декор.',
    'Patrimony is the house’s line of minimalist round watches, based on slim 1950s models from its archive. The luxury here is proportion and thinness, not decoration.',
  ),
  watch_cartier_santos: H(
    'Бразильский авиатор Альберто Сантос-Дюмон пожаловался другу Луи Картье, что в полёте неудобно доставать карманные часы. В 1904 году Картье сделал для него наручные часы, а в продажу модель Santos поступила в 1911 году.',
    'Brazilian aviator Alberto Santos-Dumont told his friend Louis Cartier that pulling out a pocket watch in flight was awkward. In 1904 Cartier made him a wristwatch, and the Santos went on sale in 1911.',
  ),
  watch_omega_seamaster: H(
    'Seamaster появился в 1948 году, к столетию Omega, и опирался на водонепроницаемые часы военного времени. Начиная с фильма «Золотой глаз» (1995) Джеймс Бонд носит именно Seamaster.',
    'The Seamaster appeared in 1948, for Omega’s centenary, building on wartime waterproof watches. Since GoldenEye (1995), James Bond has worn a Seamaster.',
  ),
  watch_jlc_reverso: H(
    'Британские офицеры, игравшие в поло в Индии, попросили часы, стекло которых не разбивалось бы мячом. Ответом стал корпус, переворачивающийся на 180 градусов; патент получили в 1931 году.',
    'British officers playing polo in India asked for a watch whose crystal would survive a hit from the ball. The answer was a case that flips over 180 degrees, patented in 1931.',
  ),
  watch_lange_1: H(
    'Дом A. Lange & Söhne основан в Гласхютте в 1845 году; после Второй мировой войны его национализировали в ГДР. Вальтер Ланге, правнук основателя, возродил марку в 1990 году, а в 1994-м вышел Lange 1.',
    'A. Lange & Söhne was founded in Glashütte in 1845 and nationalised in East Germany after the Second World War. Walter Lange, the founder’s great-grandson, revived the brand in 1990, and the Lange 1 came out in 1994.',
  ),
  watch_breguet_classique: H(
    'Абрахам-Луи Бреге (1747–1823) работал в Париже; в 1801 году он запатентовал турбийон, а в 1810 году сделал одни из первых наручных часов — для королевы Неаполя Каролины Мюрат. Classique повторяет его приёмы: гильоше и стрелки с «яблочком» на конце.',
    'Abraham-Louis Breguet (1747–1823) worked in Paris; he patented the tourbillon in 1801 and in 1810 made one of the first wristwatches, for Caroline Murat, Queen of Naples. The Classique repeats his signatures: guilloché and hands with a hollow “apple” tip.',
  ),
  watch_hublot_bigbang: H(
    'Hublot основан в 1980 году и первым соединил золотой корпус с каучуковым ремешком. Big Bang представил в 2005 году Жан-Клод Бивер с концепцией «искусство соединения» — золото, керамика и каучук в одних часах.',
    'Hublot was founded in 1980 and was the first to pair a gold case with a rubber strap. Jean-Claude Biver launched the Big Bang in 2005 around the “art of fusion” — gold, ceramic and rubber in one watch.',
  ),
  watch_tag_monaco: H(
    'Heuer Monaco 1969 года — один из первых автоматических хронографов (калибр 11 «Chronomatic») и первый с водонепроницаемым квадратным корпусом. Стив Маккуин носил его в фильме «Ле-Ман» 1971 года.',
    'The 1969 Heuer Monaco was one of the first automatic chronographs (Calibre 11 “Chronomatic”) and the first with a waterproof square case. Steve McQueen wore it in the 1971 film Le Mans.',
  ),
  watch_iwc_portugieser: H(
    'В конце 1930-х двое португальских торговцев заказали IWC наручные часы с точностью морского хронометра. Решением стал большой карманный механизм в корпусе около 43 мм — огромном для той эпохи.',
    'In the late 1930s two Portuguese merchants asked IWC for a wristwatch as accurate as a marine chronometer. The answer was a large pocket-watch movement in a case of about 43 mm — huge for the era.',
  ),
  watch_zenith_elprimero: H(
    'Zenith представил El Primero в январе 1969 года. В годы кварцевого кризиса владельцы приказали уничтожить оснастку, но инженер Шарль Вермо тайно спрятал её на чердаке фабрики — это позволило возобновить выпуск калибра в 1980-е.',
    'Zenith unveiled the El Primero in January 1969. During the quartz crisis the owners ordered the tooling destroyed, but engineer Charles Vermot secretly hid it in the factory attic — which let the calibre return in the 1980s.',
  ),
  watch_panerai_luminor: H(
    'Флорентийская фирма Panerai делала точные инструменты для итальянского флота, а с 1930-х — часы для боевых пловцов. Название Luminor — от светящегося состава на основе трития, запатентованного в 1949 году; гражданские продажи начались в 1993 году.',
    'The Florentine firm Panerai made precision instruments for the Italian navy and, from the 1930s, watches for its combat divers. The name Luminor comes from a tritium-based lume patented in 1949; civilian sales began in 1993.',
  ),
  watch_patek_grand: H(
    'Гранд-сложные часы объединяют бой, календарь и хронограф. Самые известные — карманные часы Patek Philippe для банкира Генри Грейвса, законченные в 1933 году: 24 усложнения, рекорд механики, который держался до 1989 года.',
    'A grand complication combines a chime, a calendar and a chronograph. The most famous is the Patek Philippe pocket watch for banker Henry Graves, completed in 1933: 24 complications, a record that stood until 1989.',
  ),
  antique_breguet_pocket: H(
    'Мастерская Breguet продолжала работать и после смерти основателя; каждой паре часов присваивали номер и записывали в регистр, поэтому историю многих экземпляров можно проследить по архиву. Против подделок Бреге с 1795 года ставил на эмаль почти невидимую «секретную подпись».',
    'The Breguet workshop carried on after the founder’s death; every watch received a number in the register, so many pieces can be traced in the archive. From 1795 Breguet put a nearly invisible “secret signature” on the enamel to fight fakes.',
  ),

  // 💎 JEWELRY
  jewel_cartier_love: H(
    'Браслет Love придумал дизайнер Альдо Чипулло для Cartier в Нью-Йорке в 1969 году. Он закрывается на винты маленькой отвёрткой из комплекта — снять его в одиночку непросто, в этом и смысл.',
    'The Love bracelet was designed by Aldo Cipullo for Cartier in New York in 1969. It closes with screws and a small screwdriver that comes with it — hard to take off alone, which is the point.',
  ),
  jewel_cartier_panthere: H(
    'Пантера впервые появилась у Cartier в 1914 году — как пятнистый узор на часах. Жанна Туссен, руководившая ювелирным направлением с 1933 года, сделала объёмную пантеру символом дома; знаменитая брошь 1948 года была создана для герцогини Виндзорской.',
    'The panther first appeared at Cartier in 1914, as a spotted pattern on a watch. Jeanne Toussaint, head of fine jewellery from 1933, turned the three-dimensional panther into the house emblem; the famous 1948 brooch was made for the Duchess of Windsor.',
  ),
  jewel_tiffany_diamond: H(
    'Жёлтый алмаз нашли в 1877 году в Кимберли (Южная Африка), а в 1878 году его купил Чарльз Льюис Тиффани. Из камня в 287 карат получилась огранка 128,54 карата с 82 гранями; за всю историю его надевали лишь несколько человек.',
    'The yellow diamond was found in 1877 at Kimberley, South Africa, and bought by Charles Lewis Tiffany in 1878. The 287-carat rough was cut to 128.54 carats with 82 facets; only a handful of people have ever worn it.',
  ),
  jewel_tiffany_setting: H(
    'В 1886 году Tiffany & Co. представила кольцо с шестью крапанами, которые поднимают бриллиант над шинкой. Свет проходит через камень со всех сторон — поэтому такая закрепка стала стандартом помолвочных колец.',
    'In 1886 Tiffany & Co. introduced a ring with six prongs lifting the diamond above the band. Light reaches the stone from every side, which is why the setting became the standard for engagement rings.',
  ),
  jewel_bulgari_serpenti: H(
    'Змея — древний символ вечности и обновления. Bulgari делает браслеты-змеи с 1940-х годов; гибкая конструкция Tubogas позволяет золотой спирали обвивать запястье. На съёмках «Клеопатры» в начале 1960-х часы Serpenti носила Элизабет Тейлор.',
    'The snake is an ancient symbol of eternity and renewal. Bulgari has made serpent bracelets since the 1940s; the flexible Tubogas construction lets a gold coil wrap the wrist. Elizabeth Taylor wore a Serpenti watch while filming Cleopatra in the early 1960s.',
  ),
  jewel_vca_alhambra: H(
    'Первое ожерелье Alhambra Van Cleef & Arpels выпустил в 1968 году. Четырёхлистный клевер — символ удачи; каждый мотив обрамлён рядом золотых «бусин».',
    'Van Cleef & Arpels released the first Alhambra necklace in 1968. The four-leaf clover is a symbol of luck, and each motif is framed by a row of gold beads.',
  ),
  jewel_winston: H(
    'Гарри Уинстон (1896–1978) — нью-йоркский ювелир, прозванный «королём бриллиантов». В 1958 году он передал алмаз «Надежда» в Смитсоновский институт, отправив его обычной заказной почтой.',
    'Harry Winston (1896–1978) was a New York jeweller known as the “King of Diamonds”. In 1958 he donated the Hope Diamond to the Smithsonian, sending it by ordinary registered mail.',
  ),
  jewel_graff: H(
    'Лоуренс Графф основал компанию в Лондоне в 1960 году. Дом известен работой с крупнейшими необработанными алмазами — например, огранкой камня Lesedi La Rona, найденного в Ботсване в 2015 году.',
    'Laurence Graff founded his company in London in 1960. The house is known for cutting some of the largest rough diamonds, such as the Lesedi La Rona, found in Botswana in 2015.',
  ),
  jewel_artdeco_brooch: H(
    'Стиль ар-деко получил имя от Парижской выставки декоративных искусств 1925 года. Ювелиры перешли на платину: прочный металл позволял делать тонкие ажурные оправы, почти невидимые рядом с бриллиантами.',
    'Art Deco takes its name from the 1925 Paris exhibition of decorative arts. Jewellers switched to platinum: the strong metal allowed fine openwork mounts that almost disappear beside the diamonds.',
  ),
  jewel_victorian_emerald: H(
    'Помолвочное кольцо королевы Виктории от принца Альберта было в форме змеи с изумрудом. Викторианцы любили «говорящие» украшения: камни и гравировка передавали личные послания.',
    'Queen Victoria’s engagement ring from Prince Albert was a serpent set with an emerald. Victorians loved jewels that “spoke”: stones and engravings carried personal messages.',
  ),
  jewel_sapphire_ring: H(
    'Сапфир — разновидность минерала корунда, как и рубин; синий цвет дают примеси железа и титана. Самое известное кольцо такого типа — помолвочное кольцо принцессы Дианы 1981 года с цейлонским сапфиром в окружении бриллиантов.',
    'Sapphire is a variety of corundum, like ruby; its blue comes from traces of iron and titanium. The most famous ring of this kind is Princess Diana’s 1981 engagement ring, a Ceylon sapphire surrounded by diamonds.',
  ),
  jewel_ruby_necklace: H(
    'Рубин — красный корунд, один из самых твёрдых камней (9 по шкале Мооса); цвет ему даёт хром. В эпоху ар-деко рубины часто сочетали с бриллиантами и ониксом в строгой геометрии.',
    'Ruby is red corundum, one of the hardest gems (9 on the Mohs scale); chromium gives it its colour. In the Art Deco era rubies were often set with diamonds and onyx in strict geometry.',
  ),
  jewel_pearl_necklace: H(
    'Долгое время все жемчужины были природными. Японец Кокити Микимото получил первые культивированные жемчужины в 1893 году, и в 1920-е годы массовый культивированный жемчуг обрушил цены на природный.',
    'For centuries every pearl was natural. Japan’s Kokichi Mikimoto produced the first cultured pearls in 1893, and in the 1920s mass-produced cultured pearls brought down the price of natural ones.',
  ),
  jewel_emerald_cocktail: H(
    'Коктейльные кольца вошли в моду в США в годы сухого закона (1920–1933): крупное кольцо на вечеринке было заявлением. Изумруд — зелёная разновидность берилла; почти у каждого камня есть включения, которые ювелиры называют «садом».',
    'Cocktail rings became fashionable in the USA during Prohibition (1920–1933): a big ring at a party was a statement. Emerald is green beryl; almost every stone has inclusions, which jewellers call its “garden”.',
  ),
  jewel_diamond_tiara: H(
    'Тиары расцвели при европейских дворах XIX века, когда Наполеон и императрица Жозефина вернули в моду античные венцы. В британской аристократической традиции тиару надевали замужние женщины на вечерние приёмы.',
    'Tiaras flourished at 19th-century European courts after Napoleon and Empress Joséphine revived the classical diadem. In British aristocratic custom, tiaras were worn by married women at evening receptions.',
  ),
  jewel_vca_high: H(
    'В 1933 году Van Cleef & Arpels запатентовали «невидимую закрепку» (Serti Mystérieux): камни вставляются в золотые рельсы так, что сверху не видно металла. На одну такую брошь уходят сотни часов работы.',
    'In 1933 Van Cleef & Arpels patented the “Mystery Set” (Serti Mystérieux): stones slide onto gold rails so no metal shows from above. A single brooch takes hundreds of hours.',
  ),
  jewel_cartier_high: H(
    'Cartier называли «ювелиром королей и королём ювелиров» — фразу приписывают королю Эдуарду VII. К его коронации в 1902 году дом получил большой заказ на тиары от британской аристократии.',
    'Cartier was called “the jeweller of kings and the king of jewellers” — a phrase attributed to King Edward VII. For his coronation in 1902 the house received a large order of tiaras from the British aristocracy.',
  ),
  jewel_artdeco_rare: H(
    'Ар-деко продлился недолго — примерно с 1920 по 1939 год. Многие украшения той эпохи позже разобрали, а камни переставили в новые оправы, поэтому нетронутые оригиналы встречаются редко.',
    'Art Deco was short-lived — roughly 1920 to 1939. Many jewels of the period were later broken up and the stones reset, so untouched originals are rare.',
  ),
  jewel_silver_ring: H(
    'Стерлинговое серебро — сплав 92,5 % серебра с медью для прочности. В 1920–30-е годы серебро с чёрной эмалью и ониксом было недорогим способом носить модную геометрию ар-деко.',
    'Sterling silver is 92.5% silver alloyed with copper for strength. In the 1920s–30s silver with black enamel or onyx was an affordable way to wear fashionable Art Deco geometry.',
  ),
  jewel_cameo_brooch: H(
    'Камеи резали ещё в Античности; мода на них вернулась в XVIII–XIX веках, и итальянский город Торре-дель-Греко близ Неаполя стал центром резьбы по раковине.',
    'Cameos were carved in antiquity; they came back into fashion in the 18th–19th centuries, and Torre del Greco near Naples became the centre of shell carving.',
  ),
  jewel_garnet_necklace: H(
    'Центром гранатовых украшений XIX века была Богемия (нынешняя Чехия): мелкие красные пиропы ставили вплотную, чтобы украшение сверкало как единое целое.',
    'The 19th-century centre of garnet jewellery was Bohemia (today’s Czech Republic): small red pyropes were set close together so the piece sparkled as one.',
  ),
}
