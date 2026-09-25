import type { LotDraft } from '../catalog'

/**
 * Entry-level ART and JEWELRY: generic, unattributed pieces (a type of object,
 * not a specific historical one), so the facts are general truths about the
 * technique or style — nothing invented about a real work. Priced directly.
 */
function A(
  id: string,
  category: LotDraft['category'],
  rarity: LotDraft['rarity'],
  price: number,
  ru: [string, string, string, string, string],
  en: [string, string, string, string, string],
): LotDraft {
  return {
    id,
    name: { ru: ru[0], en: en[0] },
    maker: { ru: 'неизвестный мастер', en: 'unattributed' },
    artist: { ru: 'неизвестный мастер', en: 'unattributed' },
    year: { ru: ru[1], en: en[1] },
    blurb: { ru: ru[2], en: en[2] },
    fact: { ru: ru[3], en: en[3] },
    significance: { ru: ru[4], en: en[4] },
    rarity,
    category,
    purchasePrice: price,
    collectionValue: Math.round(price * 1.15),
    fixedPrice: true,
  }
}

export const ACCESSIBLE_LOTS: LotDraft[] = [
  A('art_litho_belle', 'ART', 'COMMON', 180,
    ['Литография Belle Époque', 'рубеж XIX–XX веков', 'Афишная литография парижской «прекрасной эпохи».', 'Литографию изобрёл Алоис Зенефельдер в 1796 году.', 'Тиражная графика — самый доступный вход в коллекцию искусства.'],
    ['Belle Époque lithograph', 'turn of the 20th century', 'A poster lithograph from Paris’s “beautiful era”.', 'Lithography was invented by Alois Senefelder in 1796.', 'Printed art is the most affordable way into an art collection.']),
  A('art_engraving_port', 'ART', 'COMMON', 260,
    ['Гравюра старого порта', 'XVIII век', 'Корабли, мачты и набережная, вырезанные на металле.', 'До фотографии гравюры были главным способом тиражировать изображения.', 'Такие листы — окно в то, как выглядели города до камер.'],
    ['Old harbour engraving', '18th century', 'Ships, masts and a quay cut into metal.', 'Before photography, engravings were the main way to reproduce images.', 'These prints show what cities looked like before cameras.']),
  A('art_watercolor_paris', 'ART', 'RARE', 450,
    ['Акварель парижской улицы', 'начало XX века', 'Лёгкий этюд уличного кафе прозрачными красками.', 'В акварели белый цвет обычно даёт сама бумага — его оставляют нетронутым.', 'Акварель нельзя переписать: каждая удачная работа уникальна.'],
    ['Paris street watercolour', 'early 20th century', 'A light sketch of a street café in transparent paint.', 'In watercolour the white usually comes from the paper itself, left untouched.', 'Watercolour cannot be painted over: every good sheet is one of a kind.']),
  A('art_salon_landscape', 'ART', 'RARE', 900,
    ['Салонный пейзаж XIX века', 'XIX век', 'Лесная поляна в тяжёлой золочёной раме.', 'В XIX веке парижский Салон был главной выставкой, где художники искали признания.', 'Академическая школа — фундамент, от которого оттолкнулись импрессионисты.'],
    ['19th-century salon landscape', '19th century', 'A forest glade in a heavy gilt frame.', 'In the 19th century the Paris Salon was the main exhibition where artists sought recognition.', 'The academic school is the ground the Impressionists pushed away from.']),
  A('art_still_life_study', 'ART', 'RARE', 1300,
    ['Этюд натюрморта', 'XIX век', 'Фрукты, кувшин и складки скатерти на тёмном фоне.', 'Натюрморт — жанр изображения неодушевлённых предметов: цветов, фруктов, посуды.', 'На натюрморте художники учились свету и фактуре.'],
    ['Still-life study', '19th century', 'Fruit, a jug and folds of cloth on a dark ground.', 'Still life is the genre of painting inanimate things: flowers, fruit, tableware.', 'Still life is where painters learned light and texture.']),
  A('art_portrait_school', 'ART', 'EPIC', 2400,
    ['Портрет круга старых мастеров', 'XVII век', 'Строгий портрет в чёрном на тёмном фоне.', '«Круг» или «школа» мастера — так называют работы учеников и последователей, а не самого художника.', 'Честная атрибуция — главное, что определяет цену старой живописи.'],
    ['Portrait, circle of the old masters', '17th century', 'A sober portrait in black against a dark ground.', '“Circle of” or “school of” a master means the work of pupils and followers, not the master himself.', 'Honest attribution is what sets the price of an old painting.']),
  A('jewel_silver_ring', 'LUXURY', 'COMMON', 220,
    ['Серебряное кольцо ар-деко', '1920–1930-е', 'Геометрическое кольцо с чёрной эмалью.', 'Стиль ар-деко расцвёл в 1920–1930-х годах: геометрия, контраст, чистые линии.', 'Ар-деко — стиль, в котором роскошь впервые стала графичной.'],
    ['Art Deco silver ring', '1920s–1930s', 'A geometric ring with black enamel.', 'Art Deco flourished in the 1920s–1930s: geometry, contrast, clean lines.', 'Art Deco is where luxury first turned graphic.']),
  A('jewel_cameo_brooch', 'LUXURY', 'RARE', 520,
    ['Брошь-камея', 'XIX век', 'Профиль, вырезанный в раковине, в золотой оправе.', 'Камею вырезают рельефом из камня или раковины, используя слои разного цвета.', 'Каждая камея вырезана вручную — двух одинаковых нет.'],
    ['Cameo brooch', '19th century', 'A profile carved in shell, set in gold.', 'A cameo is carved in relief from stone or shell, using layers of different colours.', 'Every cameo is hand-carved — no two are the same.']),
  A('jewel_garnet_necklace', 'LUXURY', 'RARE', 760,
    ['Гранатовое ожерелье', 'XIX век', 'Тёмно-красные камни в плотной огранке.', 'Гранат — это не один камень, а группа минералов; самые известные — тёмно-красные.', 'Гранатовые украшения — классика ювелирного XIX века.'],
    ['Garnet necklace', '19th century', 'Deep red stones, closely set.', 'Garnet is not one stone but a group of minerals; the best known are deep red.', 'Garnet jewellery is a classic of the 19th century.']),
]
