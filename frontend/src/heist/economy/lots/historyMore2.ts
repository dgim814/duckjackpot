import type { LocaleText } from '../catalog'

/** «📖 ИСТОРИЯ» continued: cars, antiques, books, instruments, collectibles, lore. */
const H = (ru: string, en: string): LocaleText => ({ ru, en })

export const LOT_HISTORY_MORE2: Record<string, LocaleText> = {
  // 🚗 CARS
  car_ferrari_250_gto: H(
    'В 1962–1964 годах построили всего 36 машин. GTO значит Gran Turismo Omologato: машину делали для омологации в гоночном классе GT, и она приносила Ferrari победы в чемпионате GT этих лет.',
    'Only 36 were built in 1962–1964. GTO stands for Gran Turismo Omologato: the car was made to homologate Ferrari for GT racing, and it won the GT championship for Ferrari in those years.',
  ),
  car_ferrari_f40: H(
    'F40 вышел в 1987 году к 40-летию Ferrari и стал последней новой моделью, представленной при жизни Энцо Феррари (он умер в 1988 году). Его называют первым серийным автомобилем, заявленная скорость которого превысила 320 км/ч.',
    'The F40 arrived in 1987 for Ferrari’s 40th anniversary and was the last new model launched in Enzo Ferrari’s lifetime (he died in 1988). It is described as the first production car with a claimed top speed above 200 mph.',
  ),
  car_ferrari_enzo: H(
    'Назван в честь основателя компании. Выпустили 399 машин, а ещё одну, 400-ю, Ferrari передала папе Иоанну Павлу II для благотворительного аукциона. Углепластиковый кузов и электроника пришли из Формулы-1.',
    'Named after the company’s founder. 399 were built, and one more, the 400th, was given to Pope John Paul II for a charity auction. The carbon body and electronics came from Formula 1.',
  ),
  car_ferrari_laferrari: H(
    'Выпущено 499 купе, и ещё одна машина была собрана для благотворительного аукциона после землетрясения в Италии 2016 года. Гибридная система HY-KERS пришла из Формулы-1.',
    '499 coupés were built, plus one more for a charity auction after the 2016 earthquake in Italy. The HY-KERS hybrid system came from Formula 1.',
  ),
  car_lambo_miura: H(
    'Miura показали в 1966 году в Женеве; кузов нарисовал Марчелло Гандини из ателье Bertone. Название — фамилия испанского заводчика боевых быков, а поперечный V12 за спиной водителя задал схему будущих суперкаров.',
    'The Miura was shown at Geneva in 1966; Marcello Gandini of Bertone drew the body. The name is that of a Spanish fighting-bull breeder, and the transverse V12 behind the driver set the layout for supercars to come.',
  ),
  car_lambo_countach: H(
    'Прототип показали в 1971 году в Женеве, серийный выпуск шёл с 1974 года. Название — восклицание восхищения на пьемонтском диалекте. Двери-«ножницы» с тех пор стали фирменным знаком флагманов Lamborghini.',
    'The prototype was shown at Geneva in 1971, and production ran from 1974. The name is an exclamation of amazement in Piedmontese dialect. Scissor doors have been the mark of Lamborghini flagships ever since.',
  ),
  car_lambo_diablo: H(
    'Diablo вышел в 1990 году, когда Lamborghini принадлежала Chrysler. Имя снова взято у знаменитого боевого быка XIX века. Это первый серийный Lamborghini с заявленной скоростью выше 320 км/ч.',
    'The Diablo arrived in 1990, when Lamborghini was owned by Chrysler. The name again comes from a famous 19th-century fighting bull. It was the first production Lamborghini claimed to exceed 200 mph.',
  ),
  car_lambo_aventador: H(
    'Aventador представили в 2011 году с цельным углепластиковым монококом. Имя — у быка, прославившегося на корриде в Сарагосе в 1993 году. Выпуск закончился в 2022 году — это последний Lamborghini с атмосферным V12 без гибрида.',
    'The Aventador was launched in 2011 with a one-piece carbon monocoque. The name belongs to a bull famed in the Zaragoza ring in 1993. Production ended in 2022 — the last Lamborghini with a non-hybrid naturally aspirated V12.',
  ),
  car_porsche_911: H(
    '911 представили во Франкфурте в 1963 году под именем 901; название поменяли, потому что Peugeot считал своими трёхзначные номера с нулём посередине. Оппозитный мотор сзади модель сохраняет уже шесть десятилетий.',
    'The 911 was shown at Frankfurt in 1963 as the 901; the name changed because Peugeot claimed three-digit numbers with a zero in the middle. It has kept a rear flat-six for six decades.',
  ),
  car_porsche_959: H(
    '959 разрабатывали для раллийной Группы B; после её закрытия в 1986 году машина в том же году выиграла ралли Париж—Дакар. Электронный полный привод и два турбонагнетателя сделали её одной из самых технологичных машин своего времени.',
    'The 959 was developed for Group B rallying; after that class was cancelled in 1986, the car won the Paris–Dakar the same year. Electronic all-wheel drive and twin turbos made it one of the most advanced cars of its time.',
  ),
  car_porsche_carrera_gt: H(
    'Мотор V10 для Carrera GT изначально создавали для гоночного проекта Porsche в Ле-Мане, который закрыли. В 2004–2007 годах выпустили 1270 машин, все — только с механической коробкой и керамическим сцеплением.',
    'The Carrera GT’s V10 was first designed for a cancelled Porsche Le Mans programme. 1,270 cars were built in 2004–2007, all with a manual gearbox and a ceramic clutch.',
  ),
  car_porsche_918: H(
    'Тираж 918 Spyder — 918 машин. В 2013 году он прошёл Северную петлю Нюрбургринга за 6:57 — первым из серийных машин быстрее семи минут.',
    'The 918 Spyder was limited to 918 cars. In 2013 it lapped the Nürburgring Nordschleife in 6:57 — the first production car under seven minutes.',
  ),
  car_mb_300sl: H(
    'Дорожный 300 SL вырос из гоночного W194 1952 года. Трубчатая рама проходила высоко по бокам, обычные двери не помещались — отсюда «крылья чайки». Это одна из первых серийных машин с непосредственным впрыском топлива.',
    'The road 300 SL grew out of the 1952 W194 racer. Its tubular frame ran high along the sides, leaving no room for normal doors — hence the gullwings. It was one of the first production cars with direct fuel injection.',
  ),
  car_mb_300slr: H(
    'В 1955 году Стирлинг Мосс и штурман Денис Дженкинсон выиграли на 300 SLR гонку «Милле Милья» с рекордным временем. В том же году в Ле-Мане произошла самая страшная авария в истории автоспорта с участием 300 SLR Пьера Левега, и Mercedes ушёл из гонок.',
    'In 1955 Stirling Moss and navigator Denis Jenkinson won the Mille Miglia in a 300 SLR in record time. That year the 300 SLR of Pierre Levegh was involved in the worst crash in motor-racing history at Le Mans, and Mercedes withdrew from racing.',
  ),
  car_mb_540k: H(
    '540K выпускался в 1936–1940 годах; буква K означает Kompressor — нагнетатель включался при полностью нажатой педали газа. Кузова делали в Зиндельфингене, и многие машины были почти уникальными.',
    'The 540K was built in 1936–1940; K stands for Kompressor — the supercharger engaged with the throttle floored. Bodies were made at Sindelfingen, and many cars were practically one-offs.',
  ),
  car_mb_slr: H(
    'Совместный проект Mercedes-Benz и McLaren собирали в Уокинге (Англия) в 2003–2010 годах. Дизайн отсылает к гоночному 300 SLR 1955 года, а двери открываются вверх и вперёд.',
    'The joint Mercedes-Benz and McLaren project was built in Woking, England, in 2003–2010. The design nods to the 1955 300 SLR racer, and the doors swing up and forward.',
  ),
  car_am_db5: H(
    'DB5 выпускали в 1963–1965 годах; буквы DB — инициалы Дэвида Брауна, владельца компании. В фильме «Голдфингер» (1964) машина Бонда получила пулемёты и катапульту и стала самым известным автомобилем кино.',
    'The DB5 was built in 1963–1965; DB are the initials of owner David Brown. In Goldfinger (1964) Bond’s car got machine guns and an ejector seat and became the most famous car in cinema.',
  ),
  car_am_db9: H(
    'DB9 (2004–2016) — первая модель, собранная на новом заводе Aston Martin в Гейдоне. Её рисовали Хенрик Фискер и Ян Каллум; имя DB8 пропустили, чтобы не намекать на V8 — у DB9 был V12.',
    'The DB9 (2004–2016) was the first model built at Aston Martin’s new Gaydon factory. It was drawn by Henrik Fisker and Ian Callum; the DB8 name was skipped to avoid suggesting a V8 — the DB9 had a V12.',
  ),
  car_am_valkyrie: H(
    'Валькирию проектировал Эдриан Ньюи, главный конструктор Red Bull Racing. Атмосферный V12 от Cosworth раскручивается до 11 100 об/мин, а днище создаёт прижимную силу, как у гоночного прототипа.',
    'The Valkyrie was designed by Adrian Newey, Red Bull Racing’s chief designer. Its naturally aspirated Cosworth V12 revs to 11,100 rpm, and the underbody makes downforce like a racing prototype.',
  ),
  car_jaguar_etype: H(
    'E-Type представили в марте 1961 года в Женеве. Он стоил заметно дешевле сопоставимых Ferrari и Aston Martin; родстер E-Type входит в постоянную коллекцию Нью-Йоркского музея современного искусства (MoMA).',
    'The E-Type was unveiled at Geneva in March 1961. It cost far less than comparable Ferraris and Aston Martins; an E-Type roadster is in the permanent collection of New York’s Museum of Modern Art.',
  ),
  car_jaguar_xj220: H(
    'Концепт 1988 года обещал V12 и полный привод, но серийная машина 1992 года получила V6 битурбо и задний привод, и часть покупателей судилась с Jaguar. Тем не менее XJ220 развил 341,7 км/ч и какое-то время был самой быстрой серийной машиной.',
    'The 1988 concept promised a V12 and all-wheel drive, but the 1992 production car had a twin-turbo V6 and rear drive, and some buyers sued Jaguar. Still, the XJ220 reached 212 mph and was for a while the fastest production car.',
  ),
  car_mclaren_f1: H(
    'Конструктор Гордон Мюррей посадил водителя в центр, а пассажиров — по бокам чуть позади. Моторный отсек выстлан золотой фольгой как лучшим отражателем тепла. В 1998 году F1 разогнался до 386,4 км/ч, а в 1995-м гоночная версия выиграла Ле-Ман.',
    'Designer Gordon Murray put the driver in the centre with passengers either side slightly behind. The engine bay is lined with gold foil, the best heat reflector. In 1998 the F1 reached 240.1 mph, and in 1995 the racing version won Le Mans.',
  ),
  car_mclaren_p1: H(
    'P1 (2013–2015) выпустили тиражом 375 машин. Вместе с Porsche 918 и LaFerrari он составил «святую троицу» гибридных гиперкаров 2010-х.',
    'The P1 (2013–2015) was limited to 375 cars. With the Porsche 918 and LaFerrari it formed the “holy trinity” of 2010s hybrid hypercars.',
  ),
  car_bugatti_veyron: H(
    'Volkswagen купил марку Bugatti в 1998 году, а Veyron вышел в 2005-м. Модель названа в честь гонщика Пьера Вейрона, выигравшего Ле-Ман 1939 года на Bugatti. Мотор W16 с четырьмя турбинами развивал 1001 л. с.',
    'Volkswagen bought the Bugatti name in 1998, and the Veyron arrived in 2005. It is named after Pierre Veyron, who won Le Mans in 1939 for Bugatti. Its quad-turbo W16 made 1,001 hp.',
  ),
  car_bugatti_chiron: H(
    'Chiron назван в честь гонщика Луи Широна. В 2019 году доработанный прототип Chiron первым из автомобилей на базе серийных превысил 300 миль в час — 490,48 км/ч.',
    'The Chiron is named after racing driver Louis Chiron. In 2019 a modified Chiron prototype became the first production-based car to exceed 300 mph — 304.77 mph.',
  ),
  car_bugatti_atlantic: H(
    'Построили всего четыре Type 57SC Atlantic; дизайн — Жан Бугатти, сын основателя. Кузов прототипа был из магниевого сплава, который плохо сваривается, поэтому панели соединили заклёпками по гребню. Одна машина пропала во время Второй мировой войны и до сих пор не найдена.',
    'Only four Type 57SC Atlantics were built, designed by Jean Bugatti, the founder’s son. The prototype’s body was a magnesium alloy that is hard to weld, so the panels were riveted along a dorsal seam. One car vanished during the Second World War and has never been found.',
  ),
  car_rr_phantom: H(
    'Первый Phantom появился в 1925 году, и с тех пор имя носили восемь поколений. Современный Phantom собирают вручную в Гудвуде; на решётке радиатора — статуэтка «Дух экстаза», созданная в 1911 году скульптором Чарльзом Сайксом.',
    'The first Phantom appeared in 1925, and eight generations have carried the name. Today’s Phantom is hand-built at Goodwood; the grille carries the Spirit of Ecstasy mascot, sculpted by Charles Sykes in 1911.',
  ),
  car_rr_silver_ghost: H(
    'Имя сначала носила одна машина 1907 года — серебристая и бесшумная, «как призрак». Она прошла почти 15 000 миль почти без поломок, и это создало марке репутацию надёжности.',
    'The name first belonged to one 1907 car — silver and silent “like a ghost”. It covered almost 15,000 miles with hardly a breakdown, building the marque’s reputation for reliability.',
  ),
  car_bentley_continental: H(
    'Continental GT 2003 года — первая новая модель Bentley после перехода марки к Volkswagen в 1998 году. Машины по-прежнему собирают в Крю (Англия).',
    'The 2003 Continental GT was the first new Bentley after Volkswagen took over the marque in 1998. The cars are still built in Crewe, England.',
  ),
  car_ford_gt40: H(
    'После того как сделка о покупке Ferrari сорвалась в 1963 году, Генри Форд II решил обыграть её в Ле-Мане. GT40 выиграл «24 часа Ле-Мана» четыре раза подряд — в 1966–1969 годах; «40» — высота машины в дюймах.',
    'After a deal to buy Ferrari collapsed in 1963, Henry Ford II set out to beat it at Le Mans. The GT40 won the 24 Hours four years running, 1966–1969; “40” is its height in inches.',
  ),
  car_shelby_cobra: H(
    'Кэрролл Шелби поставил американский V8 Ford в лёгкий британский родстер AC Ace. В 1965 году купе Shelby Daytona на базе Cobra принесло США чемпионат мира среди машин класса GT.',
    'Carroll Shelby put a Ford V8 into the light British AC Ace roadster. In 1965 the Cobra-based Shelby Daytona coupé won the World Sportscar Championship GT title for the USA.',
  ),
  car_toyota_2000gt: H(
    'Toyota 2000GT создан вместе с Yamaha; выпустили около 350 машин. Для фильма «Живёшь только дважды» (1967) сделали две машины без крыши — высокий Шон Коннери не помещался в купе.',
    'The Toyota 2000GT was developed with Yamaha; about 350 were built. For You Only Live Twice (1967) two open cars were made, because the tall Sean Connery did not fit in the coupé.',
  ),
  car_nissan_r34: H(
    'Skyline GT-R R34 выпускали в 1999–2002 годах с мотором RB26DETT и полным приводом ATTESA. Прозвище «Годзилла» закрепилось за GT-R ещё со времён R32. В США R34 долго был недоступен из-за правил импорта.',
    'The Skyline GT-R R34 was built in 1999–2002 with the RB26DETT engine and ATTESA all-wheel drive. The “Godzilla” nickname dates back to the R32. In the USA the R34 long stayed off-limits under import rules.',
  ),
  car_bmw_507: H(
    'Родстер нарисовал Альбрехт фон Гёрц; собрали около 250 машин, и каждая продавалась в убыток. Элвис Пресли купил белый 507 во время армейской службы в Германии; позже BMW нашла и восстановила эту машину.',
    'The roadster was drawn by Albrecht von Goertz; about 250 were built, each sold at a loss. Elvis Presley bought a white 507 while serving in the army in Germany; BMW later found and restored that car.',
  ),
  car_bmw_m1: H(
    'M1 (1978–1981) — первая модель подразделения BMW Motorsport и единственный серийный BMW M с центральным мотором. Кузов нарисовал Джорджетто Джуджаро; для гонок устроили серию Procar, где пилоты Формулы-1 соревновались на одинаковых M1.',
    'The M1 (1978–1981) was the first car from BMW Motorsport and the only mid-engined production BMW M. Giorgetto Giugiaro drew the body; the Procar series had Formula 1 drivers race identical M1s.',
  ),
  car_audi_quattro: H(
    'Audi Quattro показали в 1980 году в Женеве. Правила ралли только что разрешили полный привод, и Quattro быстро доказал его преимущество, выиграв чемпионат мира по ралли.',
    'The Audi Quattro was shown at Geneva in 1980. Rally rules had just allowed four-wheel drive, and the Quattro quickly proved its advantage by winning the World Rally Championship.',
  ),
  car_delorean: H(
    'Кузов из нержавеющей стали не красили. Компания Джона Делореана выпустила около 9000 машин на заводе в Северной Ирландии и обанкротилась в 1982 году; бессмертие машине подарил фильм «Назад в будущее» (1985).',
    'The stainless-steel body was left unpainted. John DeLorean’s company built about 9,000 cars in Northern Ireland and went bankrupt in 1982; Back to the Future (1985) made the car immortal.',
  ),
  car_citroen_ds: H(
    'DS показали на Парижском автосалоне 1955 года, и в первый же день он собрал тысячи заказов. Гидропневматическая подвеска держала кузов ровно; в 1962 году при покушении на генерала де Голля DS уехал с места на пробитых шинах.',
    'The DS was shown at the 1955 Paris Motor Show and took thousands of orders on the first day. Its hydropneumatic suspension kept the body level; in 1962, during an assassination attempt on General de Gaulle, his DS drove away on punctured tyres.',
  ),
  car_lancia_stratos: H(
    'Stratos (1973–1978) — первая машина, созданная специально для ралли. Кузов нарисовали в Bertone, мотор V6 взяли у Ferrari Dino. Lancia выигрывала с ней чемпионат мира по ралли в 1974, 1975 и 1976 годах.',
    'The Stratos (1973–1978) was the first car designed purely for rallying. Bertone drew the body and the V6 came from the Ferrari Dino. Lancia won the World Rally Championship with it in 1974, 1975 and 1976.',
  ),
  car_alfa_33_stradale: H(
    'Дорожную версию гоночного Tipo 33 выпустили тиражом 18 машин в 1967–1969 годах; кузов нарисовал Франко Скальоне. Это одна из первых машин с дверями, открывающимися вверх, как крылья бабочки.',
    'The road version of the Tipo 33 racer was built in just 18 examples in 1967–1969, with a body by Franco Scaglione. It was one of the first cars with doors that open upward like butterfly wings.',
  ),

  // 🏺 ANTIQUES
  antique_bronze_candlestick: H(
    'Во Франции XIX века бронзу часто золотили огневым способом — ртутью, что было очень опасно для мастеров. Подсвечники делали парами, и полная пара ценится выше одного предмета.',
    'In 19th-century France bronze was often fire-gilded with mercury, which was very dangerous for the craftsmen. Candlesticks were made in pairs, and a complete pair is worth more than a single one.',
  ),
  antique_victorian_box: H(
    'В викторианской Англии шкатулки служили для украшений, писем и швейных принадлежностей. Популярны были отделка маркетри и папье-маше; во многих шкатулках делали потайные отделения.',
    'In Victorian England caskets held jewellery, letters and sewing kits. Marquetry and papier-mâché finishes were popular, and many boxes had secret compartments.',
  ),
  antique_artdeco_clock: H(
    'Каминные часы ар-деко делали из хромированного металла, бакелита и мрамора. Геометрию подсказали небоскрёбы и океанские лайнеры 1920-х; многие такие часы уже были электрическими.',
    'Art Deco mantel clocks were made of chrome, Bakelite and marble. Their geometry echoed 1920s skyscrapers and ocean liners, and many were already electric.',
  ),
  antique_porcelain_vase: H(
    'Секрет твёрдого фарфора в Европе раскрыли в Саксонии: в 1710 году в Мейсене открылась первая европейская фарфоровая мануфактура. До этого фарфор привозили из Китая и Японии.',
    'The secret of hard-paste porcelain was cracked in Saxony: in 1710 the first European porcelain manufactory opened at Meissen. Before that, porcelain was imported from China and Japan.',
  ),
  antique_ming_vase: H(
    'Династия Мин правила Китаем в 1368–1644 годах. Сине-белый фарфор расписывали кобальтом под прозрачной глазурью; главные печи работали в Цзиндэчжэне, а изделия императорских печей помечали марками годов правления.',
    'The Ming dynasty ruled China from 1368 to 1644. Blue-and-white porcelain was painted in cobalt under a clear glaze; the main kilns were at Jingdezhen, and imperial wares carried reign marks.',
  ),
  antique_japan_ceramic: H(
    'Японская чайная церемония ценит простую и неровную посуду; стиль раку связан с мастерской семьи Тёдзиро XVI века. Трещины чинят методом кинцуги — золотым лаком, делая ремонт частью красоты.',
    'The Japanese tea ceremony prizes simple, uneven wares; raku is linked to the 16th-century Chōjirō workshop. Cracks are mended with kintsugi — gold lacquer that makes the repair part of the beauty.',
  ),
  antique_samurai_box: H(
    'Японский лак делают из сока лакового дерева; слоёв наносят десятки, и каждый сохнет днями. Техника маки-э — это рисунок из золотого порошка, посыпанного на влажный лак.',
    'Japanese lacquer is made from the sap of the lacquer tree; dozens of coats are applied, each drying for days. Maki-e is a design made by sprinkling gold powder onto wet lacquer.',
  ),
  antique_silver_snuff: H(
    'Нюхательный табак был модой XVIII века при европейских дворах. Серебряные и золотые табакерки дарили как дипломатические подарки, а под крышкой нередко прятали миниатюрный портрет.',
    'Snuff was an 18th-century fashion at European courts. Silver and gold snuffboxes were given as diplomatic gifts, often with a miniature portrait hidden inside the lid.',
  ),
  antique_silver_service: H(
    'Английское серебро маркируют клеймами: знак пробы (лев), город, буква года и мастер. По этим знакам можно узнать, где и в каком году сделан предмет.',
    'English silver carries hallmarks: the standard mark (a lion), the assay office, a date letter and the maker. Together they tell where and in which year a piece was made.',
  ),
  antique_globe: H(
    'Старейший сохранившийся земной глобус — «Земное яблоко» Мартина Бехайма 1492 года. В XVIII–XIX веках глобусы часто продавали парами: земной и небесный.',
    'The oldest surviving terrestrial globe is Martin Behaim’s “Erdapfel” of 1492. In the 18th–19th centuries globes were often sold in pairs: terrestrial and celestial.',
  ),
  antique_telescope: H(
    'Галилей направил телескоп в небо в 1609 году. В XVIII–XIX веках латунные телескопы на треногах стали украшением кабинета любителя науки.',
    'Galileo turned a telescope to the sky in 1609. In the 18th–19th centuries brass telescopes on tripods became a fixture of the amateur scientist’s study.',
  ),
  antique_typewriter: H(
    'Первой коммерчески успешной машинкой стала Sholes & Glidden 1874 года, выпущенная фирмой Remington; от неё пошла раскладка QWERTY. Машинка открыла женщинам массовую профессию машинистки.',
    'The first commercially successful typewriter was the 1874 Sholes & Glidden, made by Remington; the QWERTY layout comes from it. The typewriter opened up the typist profession to women on a mass scale.',
  ),
  antique_artdeco_lamp: H(
    'В 1920-е годы электричество пришло в городские дома, и дизайнеры стали делать лампы как скульптуры. Французские мастера стекла, например Рене Лалик, создавали светильники из матового рельефного стекла.',
    'In the 1920s electricity reached city homes and designers began making lamps as sculpture. French glass masters such as René Lalique made lights of frosted relief glass.',
  ),
  antique_music_box: H(
    'Механические музыкальные шкатулки появились в Швейцарии в конце XVIII века: штифты вращающегося цилиндра задевают зубцы стальной гребёнки. В XIX веке появились модели со сменными дисками — предшественники граммофона.',
    'Mechanical music boxes appeared in Switzerland in the late 18th century: pins on a turning cylinder pluck the teeth of a steel comb. In the 19th century models with interchangeable discs appeared — ancestors of the gramophone.',
  ),
  antique_automaton: H(
    'В XVIII веке Жак де Вокансон показывал механическую утку, а Пьер Жаке-Дро построил куклу-писца, которая до сих пор пишет пером (музей Невшателя). В XIX веке клетки с поющими механическими птичками стали модой салонов.',
    'In the 18th century Jacques de Vaucanson showed a mechanical duck, and Pierre Jaquet-Droz built a writing doll that still writes with a quill (Neuchâtel museum). In the 19th century cages with singing mechanical birds were a salon fashion.',
  ),
  antique_leica_camera: H(
    'Инженер Оскар Барнак создал первую Leica под 35-мм киноплёнку; серийная Leica I вышла в 1925 году. Маленькая камера позволила снимать улицу незаметно — так родился современный фоторепортаж.',
    'Engineer Oskar Barnack built the first Leica for 35 mm cine film; the production Leica I came out in 1925. A small camera made unobtrusive street photography possible — the birth of modern photojournalism.',
  ),
  antique_compass: H(
    'Магнитный компас пришёл в Европу в XII–XIII веках. Карманные компасы XVIII–XIX веков часто совмещали с солнечными часами, чтобы в пути определять и направление, и время.',
    'The magnetic compass reached Europe in the 12th–13th centuries. Pocket compasses of the 18th–19th centuries were often combined with a sundial to give both direction and time on a journey.',
  ),
  antique_bronze_figure: H(
    'В XIX веке станок Коласа позволил точно уменьшать скульптуры, и бронзу стали отливать сериями для гостиных. Французские «анималисты», например Антуан-Луи Бари, прославились фигурами зверей.',
    'In the 19th century Collas’s reducing machine allowed sculptures to be scaled down accurately, and bronzes were cast in editions for the home. French animaliers such as Antoine-Louis Barye became famous for their animal figures.',
  ),
  antique_world_map: H(
    'Проекция Меркатора 1569 года сохраняет углы и поэтому удобна мореплавателям, но сильно увеличивает земли у полюсов. На некоторых старых картах Калифорнию рисовали островом.',
    'Mercator’s 1569 projection preserves angles, which made it ideal for navigators, but greatly enlarges lands near the poles. Some old maps show California as an island.',
  ),
  book_gatsby: H(
    '«Великий Гэтсби» вышел в апреле 1925 года в издательстве Scribner. При жизни Фицджеральда роман продавался плохо; знаменитую обложку с глазами над ночным городом нарисовал художник Франсис Кугат.',
    'The Great Gatsby was published by Scribner in April 1925. It sold poorly in Fitzgerald’s lifetime; the famous jacket with eyes above a night city was painted by Francis Cugat.',
  ),
  book_hobbit: H(
    '«Хоббит» вышел 21 сентября 1937 года тиражом 1500 экземпляров; иллюстрации и суперобложку нарисовал сам Толкин. Первый тираж разошёлся к Рождеству.',
    'The Hobbit was published on 21 September 1937 in a run of 1,500 copies; Tolkien drew the illustrations and the dust jacket himself. The first printing sold out by Christmas.',
  ),
  book_potter: H(
    'Первый тираж «Философского камня» (1997) в твёрдой обложке — всего 500 экземпляров, около 300 из них ушли в библиотеки. Признак первого издания — строка цифр «10 9 8 7 6 5 4 3 2 1» на обороте титула.',
    'The first hardback printing of Philosopher’s Stone (1997) was only 500 copies, about 300 of which went to libraries. A first edition shows the number line “10 9 8 7 6 5 4 3 2 1” on the copyright page.',
  ),
  book_atlas: H(
    'Первым современным атласом считают «Theatrum Orbis Terrarum» Абрахама Ортелия (1570). Само слово «атлас» ввёл Герард Меркатор — так назывался его сборник карт, изданный в 1595 году.',
    'Abraham Ortelius’s Theatrum Orbis Terrarum (1570) is considered the first modern atlas. The word “atlas” itself was introduced by Gerardus Mercator for his collection of maps published in 1595.',
  ),
  book_victorian_illust: H(
    'В XIX веке новые технологии печати удешевили иллюстрации, и художники вроде Джона Тенниела («Алиса в Стране чудес», 1865) сделали картинку равной тексту. Такие книги дарили на Рождество в переплётах с золотым тиснением.',
    'In the 19th century new printing methods made illustrations cheaper, and artists like John Tenniel (Alice’s Adventures in Wonderland, 1865) made the picture equal to the text. Such books were Christmas gifts in gilt-stamped bindings.',
  ),
  book_verne: H(
    'Парижский издатель Пьер-Жюль Этцель выпускал романы Жюля Верна в серии «Необыкновенные путешествия». Подарочные издания в красных переплётах с тиснением дарили детям — сегодня их собирают по рисункам на крышке.',
    'Paris publisher Pierre-Jules Hetzel issued Jules Verne’s novels as the Voyages extraordinaires. Gift editions in red stamped bindings were given to children — today they are collected by their cover designs.',
  ),
  book_doyle: H(
    'Шерлок Холмс впервые появился в повести «Этюд в багровых тонах», напечатанной в «Рождественском ежегоднике Битона» за 1887 год. Сохранившихся экземпляров этого выпуска известно немного.',
    'Sherlock Holmes first appeared in A Study in Scarlet, printed in Beeton’s Christmas Annual for 1887. Few copies of that issue are known to survive.',
  ),
  book_russian_classic: H(
    'Орфографическая реформа 1918 года убрала из алфавита буквы ять, фиту и «i десятеричное», поэтому дореформенные издания сразу узнаются по шрифту. Прижизненные издания Пушкина, Толстого и Достоевского собирают особенно ценно.',
    'The 1918 spelling reform removed the letters yat, fita and the decimal i, so pre-reform editions are recognisable at a glance. Editions published in the lifetimes of Pushkin, Tolstoy and Dostoevsky are especially prized.',
  ),
  sci_astro_globe: H(
    'Небесный глобус показывает звёзды как бы снаружи сферы, поэтому созвездия на нём зеркальны тому, что мы видим с Земли. Такие глобусы часто выпускали в пару к земным.',
    'A celestial globe shows the stars as if from outside the sphere, so the constellations are mirrored compared with the view from Earth. They were often made as a pair with a terrestrial globe.',
  ),
  sci_microscope: H(
    'Антони ван Левенгук в XVII веке первым увидел микроорганизмы в капле воды. В викторианской Англии микроскоп стал модным хобби, и к нему продавали наборы готовых стеклянных препаратов.',
    'In the 17th century Antonie van Leeuwenhoek was the first to see microorganisms in a drop of water. In Victorian England the microscope became a fashionable hobby, sold with sets of prepared glass slides.',
  ),
  sci_chronometer: H(
    'Джон Харрисон создал морской хронометр H4 (1759), который решил проблему долготы: сравнивая местное время с временем порта отправления, штурман вычислял положение корабля.',
    'John Harrison’s marine chronometer H4 (1759) solved the longitude problem: comparing local time with the home port’s time let a navigator work out the ship’s position.',
  ),
  sci_nav_compass: H(
    'Картушка корабельного компаса плавает в жидкости, которая гасит качку, а сам компас висит в карданном подвесе. Роза ветров с 32 румбами досталась от средиземноморских морских карт.',
    'A ship’s compass card floats in liquid that damps the rolling, and the whole compass hangs in gimbals. The 32-point compass rose comes from Mediterranean sea charts.',
  ),
  sci_diving_helmet: H(
    'Братья Чарльз и Джон Дин и Огастес Зибе создали в 1830-е годы водолазное снаряжение с медным шлемом и подачей воздуха насосом с поверхности. Такие шлемы использовали больше ста лет.',
    'In the 1830s the brothers Charles and John Deane and Augustus Siebe developed diving gear with a copper helmet and air pumped from the surface. Helmets like this were used for over a century.',
  ),
  sci_medical_set: H(
    'Хирургия XIX века изменилась после эфирного наркоза (1846) и антисептики Джозефа Листера (1867). Инструменты тогда делали с деревянными и костяными ручками, которые трудно было стерилизовать.',
    'Surgery changed in the 19th century with ether anaesthesia (1846) and Joseph Lister’s antiseptics (1867). Instruments then had wooden and bone handles that were hard to sterilise.',
  ),
  sci_lab_kit: H(
    'Горелку Бунзена стали широко использовать с 1850-х годов. Викторианские любители науки ставили опыты дома — химия была популярным развлечением образованной публики.',
    'The Bunsen burner came into wide use from the 1850s. Victorian amateurs performed experiments at home — chemistry was a popular pastime of the educated public.',
  ),
  sci_survey: H(
    'Теодолит измеряет горизонтальные и вертикальные углы. Великая тригонометрическая съёмка Индии, начатая в 1802 году, такими инструментами измерила в том числе высоту Эвереста.',
    'A theodolite measures horizontal and vertical angles. The Great Trigonometrical Survey of India, begun in 1802, used such instruments — among other things to measure the height of Everest.',
  ),
  sci_sextant: H(
    'Секстант изобрели в середине XVIII века; первый сделал английский мастер Джон Бёрд около 1757 года. Зеркала «сводят» светило к линии горизонта, и по углу штурман определяет широту.',
    'The sextant was invented in the mid-18th century; the first was made by English instrument-maker John Bird around 1757. Its mirrors bring a star down to the horizon, and the angle gives the navigator the latitude.',
  ),
  sci_astro_rare: H(
    'Астролябия — античный инструмент, который усовершенствовали учёные исламского мира: по ней определяли время по звёздам и высоту светил. Армиллярные сферы показывали главные круги небесной сферы.',
    'The astrolabe is an ancient instrument refined by scholars of the Islamic world: it told time by the stars and measured their altitude. Armillary spheres showed the main circles of the celestial sphere.',
  ),

  // 👑 COLLECTIBLES
  fashion_birkin: H(
    'В 1984 году глава Hermès Жан-Луи Дюма оказался в самолёте рядом с актрисой Джейн Биркин, у которой из соломенной корзины рассыпались вещи. Он набросал для неё сумку прямо в полёте. Каждую Birkin вручную собирает один мастер.',
    'In 1984 Hermès chairman Jean-Louis Dumas sat next to actress Jane Birkin on a flight as her straw basket spilled its contents. He sketched a bag for her on the plane. Each Birkin is made by hand by a single artisan.',
  ),
  fashion_kelly: H(
    'Сумка Hermès выпускалась с 1930-х годов. В 1956 году Грейс Келли, уже княгиня Монако, прикрыла ею живот от фотографов, снимок облетел журналы, и сумку стали называть «Келли»; официально имя закрепили в 1977 году.',
    'The Hermès bag existed from the 1930s. In 1956 Grace Kelly, by then Princess of Monaco, shielded her pregnancy from photographers with it, the picture went round the magazines, and the bag became the “Kelly”; the name was made official in 1977.',
  ),
  fashion_chanel_255: H(
    'Коко Шанель выпустила сумку в феврале 1955 года — отсюда название. Цепочка освободила руки: сумку можно было носить на плече. Замок с логотипом CC появился позже, при Карле Лагерфельде.',
    'Coco Chanel released the bag in February 1955 — hence the name. The chain freed the hands so it could be worn on the shoulder. The CC-logo clasp came later, under Karl Lagerfeld.',
  ),
  fashion_lv_trunk: H(
    'Луи Виттон открыл мастерскую в Париже в 1854 году. Его плоские сундуки с водостойким холстом можно было ставить друг на друга в вагонах и трюмах. Монограмму LV придумал его сын Жорж в 1896 году, чтобы бороться с подделками.',
    'Louis Vuitton opened his Paris workshop in 1854. His flat trunks in water-resistant canvas could be stacked in train cars and ship holds. His son Georges created the LV monogram in 1896 to fight counterfeits.',
  ),
  fashion_lv_steamer: H(
    'Сундуки-гардеробы для океанских лайнеров открывались как шкаф: с одной стороны вешалки, с другой — ящики. Замок Tumbler, запатентованный в 1886 году, позволял одним ключом открывать все сундуки владельца.',
    'Wardrobe trunks for ocean liners opened like a cupboard: hangers on one side, drawers on the other. The Tumbler lock, patented in 1886, let one key open all of an owner’s trunks.',
  ),
  fashion_gucci_bamboo: H(
    'После Второй мировой войны в Италии не хватало кожи и металла. Мастера Gucci сделали ручку из бамбука, изогнутого над огнём, и сумку выпустили в 1947 году.',
    'After the Second World War Italy was short of leather and metal. Gucci’s craftsmen made a handle from bamboo bent over a flame, and the bag was released in 1947.',
  ),
  fashion_lady_dior: H(
    'Сумку с узором «каннаж», вдохновлённым плетёными стульями на показах Кристиана Диора, в 1995 году подарили принцессе Диане. Она носила её так часто, что в 1996 году модель официально назвали Lady Dior.',
    'The bag with “cannage” stitching, inspired by the cane chairs at Christian Dior’s shows, was given to Princess Diana in 1995. She carried it so often that it was officially named Lady Dior in 1996.',
  ),
  fashion_fendi_baguette: H(
    'Сильвия Вентурини Фенди создала Baguette в 1997 году: сумку носят под мышкой, как французский батон. Её прославил сериал «Секс в большом городе»; вариантов отделки выпущено больше тысячи.',
    'Silvia Venturini Fendi created the Baguette in 1997: it is carried under the arm like a French loaf. Sex and the City made it famous; more than a thousand versions have been made.',
  ),
  fashion_hermes_scarf: H(
    'Первый шёлковый платок Hermès — «Jeu des omnibus et dames blanches» 1937 года. Классическое каре — 90 × 90 см; рисунок печатают десятками цветов, каждый — отдельной рамкой.',
    'The first Hermès silk scarf, “Jeu des omnibus et dames blanches”, dates from 1937. The classic carré is 90 × 90 cm; designs are printed in dozens of colours, each with its own screen.',
  ),
  fashion_chanel_tweed: H(
    'В 1954 году, в 71 год, Шанель вернулась в моду и выпустила твидовый костюм без жёсткой конструкции. Цепочка, пришитая по подолу изнутри, заставляла пиджак ровно висеть.',
    'In 1954, aged 71, Chanel returned to fashion with a tweed suit without rigid structure. A chain sewn inside the hem made the jacket hang straight.',
  ),
  fashion_rolex_case: H(
    'Rolex выпускала фирменные коробки к часам, и их вид менялся с эпохами. Для коллекционера оригинальная коробка и документы — часть «полного комплекта», который заметно ценнее одних часов.',
    'Rolex made branded boxes for its watches, and their look changed with the decades. For collectors, the original box and papers are part of a “full set”, worth notably more than the watch alone.',
  ),
  tech_leica_m3: H(
    'Leica M3 представили в 1954 году на выставке Photokina. Байонет M позволял быстро менять объективы, а светлый видоискатель совмещал дальномер с рамками кадра. Такой камерой снимал, в частности, Анри Картье-Брессон.',
    'The Leica M3 was introduced at Photokina in 1954. The M bayonet made lens changes quick, and the bright viewfinder combined the rangefinder with frame lines. Henri Cartier-Bresson was among those who used it.',
  ),
  tech_leica_m6: H(
    'M6 выпускали в 1984–2002 годах; она получила встроенный экспонометр со светодиодами в видоискателе. В 2022 году Leica вернула M6 в производство — редкий случай для плёночной камеры.',
    'The M6 was made from 1984 to 2002 and added a built-in light meter with LEDs in the viewfinder. In 2022 Leica put the M6 back into production — rare for a film camera.',
  ),
  tech_hasselblad_500c: H(
    'Виктор Хассельблад основал компанию в Гётеборге; 500C вышла в 1957 году. В 1962 году астронавт Уолли Ширра взял купленную в магазине 500C в полёт по программе «Меркурий», и с тех пор Hasselblad стал камерой NASA — в том числе на Луне в 1969 году.',
    'Victor Hasselblad’s company was based in Gothenburg; the 500C came out in 1957. In 1962 astronaut Wally Schirra took a shop-bought 500C on his Mercury flight, and Hasselblad became NASA’s camera — including on the Moon in 1969.',
  ),
  tech_polaroid_sx70: H(
    'Эдвин Лэнд придумал мгновенную фотографию, когда его дочь спросила, почему нельзя сразу увидеть снимок. SX-70 1972 года складывалась в плоский корпус, а карточка проявлялась прямо в руках, без отделения слоёв.',
    'Edwin Land conceived instant photography when his daughter asked why she couldn’t see a picture right away. The 1972 SX-70 folded flat, and the print developed in your hand with nothing to peel apart.',
  ),
  tech_mac_128k: H(
    'Macintosh представили 24 января 1984 года; рекламу «1984» режиссёра Ридли Скотта показали во время Супербоула. Внутри корпуса отлиты подписи команды разработчиков.',
    'The Macintosh was unveiled on 24 January 1984; Ridley Scott’s “1984” advert aired during the Super Bowl. The signatures of the development team are moulded inside the case.',
  ),
  tech_walkman: H(
    'Walkman TPS-L2 поступил в продажу 1 июля 1979 года в Японии. У первой модели было два гнезда для наушников и кнопка «hotline», чтобы двое могли переговариваться, не снимая наушники.',
    'The Walkman TPS-L2 went on sale in Japan on 1 July 1979. The first model had two headphone jacks and a “hotline” button so two listeners could talk without taking their headphones off.',
  ),
  tech_gameboy: H(
    'Game Boy вышел в 1989 году; разработкой руководил Гумпэй Ёкои. Во многих странах его продавали в комплекте с «Тетрисом». Монохромный экран уступал конкурентам по картинке, но выигрывал по времени работы от батареек.',
    'The Game Boy launched in 1989, developed under Gunpei Yokoi. In many countries it came bundled with Tetris. Its monochrome screen lost to rivals on picture but won on battery life.',
  ),
  tech_atari_2600: H(
    'Atari VCS (позже 2600) вышла в 1977 году. Её успех, а затем переизбыток низкокачественных игр привели к краху рынка видеоигр в США в 1983 году.',
    'The Atari VCS (later the 2600) came out in 1977. Its success, and then a glut of poor-quality games, led to the 1983 crash of the US video game market.',
  ),
  tech_ibm_model_m: H(
    'IBM выпустила Model M в 1985 году. Под каждой клавишей — изгибающаяся пружина, которая щёлкает при нажатии; клавиатура весит около двух килограммов. Выпуск по той же технологии продолжила компания Unicomp.',
    'IBM released the Model M in 1985. Under each key is a buckling spring that clicks when pressed; the keyboard weighs about two kilograms. Unicomp continued making it with the same technology.',
  ),
  tech_braun_sk4: H(
    'Braun SK 4 1956 года разработали Ханс Гугелот и Дитер Рамс. Прозрачная крышка из оргстекла была смелым решением: до этого радиолы прятали в деревянные шкафы. Модель прозвали «гробом Белоснежки».',
    'The 1956 Braun SK 4 was designed by Hans Gugelot and Dieter Rams. Its clear acrylic lid was bold: radiograms had been hidden in wooden cabinets. It was nicknamed “Snow White’s Coffin”.',
  ),
  tech_beogram: H(
    'Beogram 4000 (1972) дизайнера Якоба Йенсена получил тангенциальный тонарм: игла идёт по прямой к центру пластинки, как резец при записи. Проигрыватели Bang & Olufsen есть в коллекции MoMA.',
    'Jacob Jensen’s Beogram 4000 (1972) had a tangential tonearm: the stylus travels in a straight line to the centre, like the cutting head that made the record. Bang & Olufsen turntables are in MoMA’s collection.',
  ),
  tech_marshall_amp: H(
    'Джим Маршалл держал музыкальный магазин в Лондоне и в 1962 году начал делать усилители по просьбам гитаристов. «Стек» из головы и кабинетов стал символом громкого рока; им пользовались Джими Хендрикс и Пит Таунсенд.',
    'Jim Marshall ran a music shop in London and began building amplifiers in 1962 at guitarists’ request. The “stack” of head and cabinets became the symbol of loud rock, used by Jimi Hendrix and Pete Townshend.',
  ),
  tech_technics_1200: H(
    'SL-1200 вышел в 1972 году как домашний проигрыватель. Мощный прямой привод и точная регулировка скорости сделали его главным инструментом диджеев хип-хопа и клубной музыки.',
    'The SL-1200 came out in 1972 as a home turntable. Its strong direct drive and precise pitch control made it the main instrument of hip-hop and club DJs.',
  ),
  music_strat_50s: H(
    'Stratocaster представил Лео Фендер в 1954 году. Скошенный корпус сделал гитару удобнее, а три звукоснимателя и тремоло дали новые звуки. На «Страте» играли Бадди Холли, Джими Хендрикс и Эрик Клэптон.',
    'Leo Fender introduced the Stratocaster in 1954. Its contoured body was more comfortable, and three pickups plus a vibrato gave new sounds. Buddy Holly, Jimi Hendrix and Eric Clapton played Strats.',
  ),
  music_lespaul_59: H(
    'Gibson выпускал Les Paul Standard в окраске «санбёрст» в 1958–1960 годах, около 1700 гитар. Продажи шли слабо, и модель сняли, а в 1960-е её заново «открыли» британские блюз-рокеры.',
    'Gibson made the sunburst Les Paul Standard in 1958–1960, about 1,700 guitars. Sales were weak and it was dropped, then rediscovered in the 1960s by British blues-rock players.',
  ),
  music_flying_v: H(
    'Flying V показали в 1958 году вместе с моделью Explorer, и обе почти не продались — Flying V сделали чуть меньше сотни. Позже необычную форму полюбили хард-рок- и метал-гитаристы.',
    'The Flying V was shown in 1958 alongside the Explorer, and both barely sold — just under a hundred Vs were made. Later its unusual shape was embraced by hard-rock and metal guitarists.',
  ),
  music_p_bass: H(
    'Лео Фендер выпустил Precision Bass в 1951 году. Лады давали точную, «прецизионную» высоту звука — отсюда название, а компактная бас-гитара вытеснила громоздкий контрабас со сцены.',
    'Leo Fender released the Precision Bass in 1951. Frets gave precise pitch — hence the name — and the compact bass guitar pushed the bulky double bass off the stage.',
  ),
  music_steinway: H(
    'Немецкий мастер Генрих Штейнвег эмигрировал в Нью-Йорк и в 1853 году основал Steinway & Sons. Сегодня фабрики работают в Нью-Йорке и Гамбурге; концертный рояль делают около года.',
    'German piano maker Heinrich Steinweg emigrated to New York and founded Steinway & Sons in 1853. Today the factories are in New York and Hamburg; a concert grand takes about a year to build.',
  ),
  music_vintage_mic: H(
    'Конденсаторный Neumann U 47 (1949) и ленточный RCA 44 — легенды студий середины века. U 47 использовали, в частности, на записях The Beatles в студии Abbey Road.',
    'The Neumann U 47 condenser (1949) and the RCA 44 ribbon are mid-century studio legends. The U 47 was used, among others, on The Beatles’ recordings at Abbey Road.',
  ),
  music_tube_amp: H(
    'До транзисторов усилители работали на электронных лампах. Перегруженная лампа искажает сигнал мягко — этот «грязный» звук стал основой рок-гитары; Vox AC30 1958 года звучал на ранних записях The Beatles.',
    'Before transistors, amplifiers used vacuum tubes. An overdriven tube distorts gently — that “dirty” sound became the basis of rock guitar; the 1958 Vox AC30 is heard on early Beatles records.',
  ),
  music_turntable: H(
    'Долгоиграющую пластинку на 33⅓ оборота Columbia представила в 1948 году. Вращающийся диск, тонарм и игла — простая механика, которая снова популярна: в XXI веке продажи винила выросли.',
    'Columbia introduced the 33⅓ rpm long-playing record in 1948. A spinning platter, tonearm and stylus — simple mechanics that are popular again: vinyl sales have grown in the 21st century.',
  ),
  music_rare_vinyl: H(
    'Ценность пластинке дают первые тиражи, ошибки печати и отозванные обложки. Например, обложку альбома The Beatles «Yesterday and Today» (1966) с «мясниками» отозвали и заклеили новой — такие экземпляры высоко ценятся.',
    'Records gain value from first pressings, printing errors and withdrawn sleeves. For example, The Beatles’ Yesterday and Today (1966) “butcher cover” was recalled and pasted over — such copies are highly prized.',
  ),

  // 🖼️ ART — entry-level genre pieces (history of the technique)
  art_litho_belle: H(
    'В 1890-е годы Альфонс Муха и Анри де Тулуз-Лотрек превратили литографский плакат в искусство. Плакаты печатали тиражами и клеили на улицах Парижа, поэтому хорошо сохранившихся листов немного.',
    'In the 1890s Alphonse Mucha and Henri de Toulouse-Lautrec turned the lithographic poster into an art form. Posters were printed in runs and pasted on Paris streets, so few well-preserved sheets survive.',
  ),
  art_engraving_port: H(
    'Гравюра на меди появилась в Европе в XV веке. Мастер вырезал линии резцом, заполнял их краской и прокатывал лист под прессом — с одной доски можно было напечатать сотни оттисков.',
    'Copper engraving appeared in Europe in the 15th century. The engraver cut lines with a burin, filled them with ink and ran the sheet through a press — one plate could print hundreds of impressions.',
  ),
  art_watercolor_paris: H(
    'Как самостоятельная техника акварель расцвела в Англии XVIII–XIX веков — ею пользовались путешественники и топографы. В начале XX века художники Монмартра писали акварелью улицы и кафе Парижа.',
    'Watercolour flourished as an art in its own right in 18th–19th-century England, used by travellers and topographers. In the early 20th century Montmartre artists painted the streets and cafés of Paris in watercolour.',
  ),
  art_salon_landscape: H(
    'Парижский Салон проходил с XVII века. В 1863 году отвергнутые работы показали на «Салоне отверженных» — с этого раскола начался путь импрессионистов.',
    'The Paris Salon ran from the 17th century. In 1863 rejected works were shown at the “Salon des Refusés” — the split from which the Impressionists’ path began.',
  ),
  art_still_life_study: H(
    'Натюрморт стал самостоятельным жанром в Нидерландах XVII века. Предметы часто несли символы: догорающая свеча или увядающий цветок напоминали о быстротечности жизни (vanitas).',
    'Still life became a genre of its own in the 17th-century Netherlands. Objects often carried symbols: a guttering candle or a wilting flower recalled the brevity of life (vanitas).',
  ),
  art_portrait_school: H(
    'В мастерских старых мастеров, например у Рембрандта, работали ученики, перенимавшие манеру учителя. Поэтому в каталогах пишут «круг», «мастерская» или «школа» — это честно указывает, что автор не сам мастер.',
    'Old masters such as Rembrandt ran workshops where pupils learned the master’s manner. That is why catalogues say “circle of”, “workshop of” or “school of” — an honest note that the author is not the master himself.',
  ),

  // 💰 SPECIALS & DUCKJACKPOT LORE (fiction, labelled as such)
  special_mystery: H(
    'Вымышленный лот DuckJackpot: его происхождение намеренно скрыто до сделки. На настоящих аукционах вещи без атрибуции тоже встречаются — их честно продают с пометкой «неизвестный мастер».',
    'A fictional DuckJackpot lot: its origin is deliberately hidden until the deal. Real auctions also sell unattributed pieces — honestly labelled “unknown maker”.',
  ),
  rare_first_duckcoin: H(
    'Вымышленная история DuckJackpot: с этой монеты начался путь утки-вора. Её так и не положили в банк — она хранится отдельно, как талисман первого рейда.',
    'DuckJackpot fiction: the duck thief’s career began with this coin. It was never banked — it is kept apart as the lucky charm of the first raid.',
  ),
  rare_vault_key: H(
    'Вымышленная история DuckJackpot: номер на ключе совпадает с номером хранилища BANK. После первого рейда замки сменили, и ключ стал просто трофеем.',
    'DuckJackpot fiction: the number on the key matches a BANK vault. After the first raid the locks were changed, and the key became a mere trophy.',
  ),
  rare_mansion_seal: H(
    'Вымышленная история DuckJackpot: хозяин MANSION запечатывал этой печатью письма о сделках с NFT Vault. После рейда письма стали уликой, а печать — редкостью чёрного рынка.',
    'DuckJackpot fiction: the MANSION owner sealed letters about NFT Vault deals with it. After the raid the letters became evidence and the seal a black-market rarity.',
  ),
  rare_gold_bar: H(
    'Вымышленная история DuckJackpot: слитки «Duck Reserve» отливали для хранилища GRAND VAULT. На каждом выбита утка и номер партии.',
    'DuckJackpot fiction: “Duck Reserve” bars were cast for the GRAND VAULT. Each is stamped with a duck and a batch number.',
  ),
  rare_laser_prism: H(
    'Вымышленная история DuckJackpot: призма разводила красный луч по всему лазерному залу GRAND COLLECTION. Без неё коридор погас — так воры узнали, откуда идёт свет.',
    'DuckJackpot fiction: this prism split the red beam across the whole laser hall of the GRAND COLLECTION. Without it the corridor went dark — that is how thieves learned where the light came from.',
  ),
  rare_black_ledger: H(
    'Вымышленная история DuckJackpot: в книгу записывали каждую сделку чёрного рынка — кто продал, кто купил и за сколько. Её владелец знает цену всему.',
    'DuckJackpot fiction: every black-market deal was written in this book — who sold, who bought and for how much. Its owner knows the price of everything.',
  ),
  rare_skyline_crown: H(
    'Вымышленная история DuckJackpot: корону хранили в сейфе на крыше SKYLINE TOWER, куда доходят немногие. На чёрном рынке её называют «короной высоты».',
    'DuckJackpot fiction: the crown was kept in the rooftop safe of SKYLINE TOWER, which few reach. On the black market it is called “the crown of height”.',
  ),
  rare_grand_vault_key: H(
    'Вымышленная история DuckJackpot: ключ открывает последнюю дверь всей игры — сердце Grand Vault. Считается, что существует только один.',
    'DuckJackpot fiction: this key opens the last door in the whole game — the heart of the Grand Vault. Only one is believed to exist.',
  ),
}
