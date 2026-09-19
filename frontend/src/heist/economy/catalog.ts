/** Black Market catalog. DUCK COIN buys lots. Stars stay on character upgrades.
 *  Famous-painting lots are in-game collectibles, not real-world sales. */

import { COLLECTION_MARKUP } from './config'
import { ART_LOTS, CAR_LOTS, COLLECTIBLE_LOTS, WATCH_LOTS } from './lots'

export type ItemRarity = 'COMMON' | 'UNCOMMON' | 'LUX' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'ICONIC'
export type ItemCategory = 'ART' | 'LUXURY' | 'INTERIOR' | 'CARS' | 'SPECIAL'

export const MARKET_CATEGORIES: ItemCategory[] = ['ART', 'LUXURY', 'INTERIOR', 'CARS', 'SPECIAL']

export type LocaleText = { ru: string; en: string }

export type CatalogItem = {
  id: string
  name: LocaleText
  blurb: LocaleText
  rarity: ItemRarity
  category: ItemCategory
  purchasePrice: number
  collectionValue: number
  tradable: boolean
  limited?: number
  artist?: LocaleText
  maker?: LocaleText
  year?: LocaleText
  fact?: LocaleText
  significance?: LocaleText
  engine?: LocaleText
  /** False keeps a save-compatible id off the rotating market. */
  market?: boolean
  /** Local public asset for lot preview. Optional — most lots still use LotArt marks. */
  image?: string
  /** Same as purchasePrice. Kept so older call sites keep compiling. */
  duckCoinValue: number
}

export type LotDraft = Omit<CatalogItem, 'collectionValue' | 'tradable' | 'duckCoinValue'> & {
  collectionValue?: number
  tradable?: boolean
}

export function lot(draft: LotDraft): CatalogItem {
  const purchasePrice = Math.max(1, Math.floor(draft.purchasePrice))
  const collectionValue = Math.max(purchasePrice, Math.floor(draft.collectionValue ?? purchasePrice * COLLECTION_MARKUP))
  const maker = draft.maker ?? draft.artist
  return {
    ...draft,
    maker,
    artist: draft.artist ?? maker,
    purchasePrice,
    collectionValue,
    tradable: draft.tradable !== false,
    market: draft.market !== false,
    duckCoinValue: purchasePrice,
  }
}

export const LEGACY_LOTS: CatalogItem[] = [
  lot({
    id: 'art_velvet',
    name: { ru: 'Ночной бархат', en: 'Night velvet' },
    blurb: { ru: 'Тёмный салонный холст для закрытой стены.', en: 'A dark salon canvas for a private wall.' },
    rarity: 'LUX',
    category: 'ART',
    purchasePrice: 96,
    collectionValue: 118,
  }),
  lot({
    id: 'lux_lighter',
    name: { ru: 'Зажигалка «Салон»', en: 'Salon lighter' },
    blurb: { ru: 'Латунь и чёрный лак. Тихий luxury-лот.', en: 'Brass and black lacquer. A quiet luxury lot.' },
    rarity: 'LUX',
    category: 'LUXURY',
    purchasePrice: 64,
    collectionValue: 76,
  }),
  lot({
    id: 'rare_cameo',
    name: { ru: 'Камея «Полночь»', en: 'Midnight cameo' },
    blurb: { ru: 'Редкий резной профиль. Не каждый день на столе.', en: 'A rare carved profile. Not on the table every day.' },
    rarity: 'RARE',
    category: 'LUXURY',
    purchasePrice: 720,
    collectionValue: 860,
  }),
  lot({
    id: 'interior_cup',
    name: { ru: 'Чаша «Искра»', en: 'Spark cup' },
    blurb: { ru: 'Маленький лот для полки. Один удачный рейд.', en: 'A shelf lot. One clean raid away.' },
    rarity: 'COMMON',
    category: 'INTERIOR',
    purchasePrice: 28,
    collectionValue: 34,
  }),
  lot({
    id: 'luxury_pin',
    name: { ru: 'Брошь Dusk', en: 'Dusk pin' },
    blurb: { ru: 'Тихий старт в luxury. Хватит добычи с BANK.', en: 'A quiet luxury start. BANK loot is enough.' },
    rarity: 'COMMON',
    category: 'LUXURY',
    purchasePrice: 80,
    collectionValue: 92,
  }),
  lot({
    id: 'art_studio',
    name: { ru: 'Студийный этюд', en: 'Studio study' },
    blurb: { ru: 'Ещё пара рейдов — и холст ваш.', en: 'A couple more raids and it is yours.' },
    rarity: 'UNCOMMON',
    category: 'ART',
    purchasePrice: 180,
    collectionValue: 210,
  }),
  lot({
    id: 'luxury_chain',
    name: { ru: 'Цепь «Тень»', en: 'Shadow chain' },
    blurb: { ru: 'MANSION начинает открывать такие лоты.', en: 'MANSION is where these lots open up.' },
    rarity: 'UNCOMMON',
    category: 'LUXURY',
    purchasePrice: 320,
    collectionValue: 365,
  }),
  lot({
    id: 'interior_lamp',
    name: { ru: 'Лампа «Салон»', en: 'Salon lamp' },
    blurb: { ru: 'Тёплый свет для коллекции интерьера.', en: 'Warm light for an interior vault.' },
    rarity: 'UNCOMMON',
    category: 'INTERIOR',
    purchasePrice: 220,
    collectionValue: 250,
  }),
  lot({
    id: 'painting_study',
    name: { ru: 'Этюд янтаря', en: 'Amber study' },
    blurb: { ru: 'Салонный холст. Ради него стоит идти глубже в BANK.', en: 'A salon canvas. Worth pushing deeper into BANK.' },
    rarity: 'RARE',
    category: 'ART',
    purchasePrice: 1000,
    collectionValue: 1120,
  }),
  lot({
    id: 'vase_clay',
    name: { ru: 'Янтарная урна', en: 'Amber urn' },
    blurb: { ru: 'Тёплая керамика с золотой каймой.', en: 'Warm ceramic with a gold lip.' },
    rarity: 'RARE',
    category: 'INTERIOR',
    purchasePrice: 1000,
    collectionValue: 1120,
  }),
  lot({
    id: 'vase_amber',
    name: { ru: 'Ваза «Дым»', en: 'Smoke vase' },
    blurb: { ru: 'Тонкое стекло, которое ловит свет лампы.', en: 'Thin glass that catches lamplight.' },
    rarity: 'RARE',
    category: 'INTERIOR',
    purchasePrice: 1200,
    collectionValue: 1350,
  }),
  lot({
    id: 'special_token',
    name: { ru: 'Жетон сейфа', en: 'Vault token' },
    blurb: { ru: 'Лимитированный знак. Появляется не каждый день.', en: 'A limited mark. Not in stock every day.' },
    rarity: 'RARE',
    category: 'SPECIAL',
    purchasePrice: 900,
    collectionValue: 1080,
    limited: 500,
  }),
  lot({
    id: 'watch_brass',
    name: { ru: 'Хронограф Dusk', en: 'Dusk chronograph' },
    blurb: { ru: 'Латунный корпус и тёмный циферблат.', en: 'Brass case, dark face, quiet tick.' },
    rarity: 'EPIC',
    category: 'LUXURY',
    purchasePrice: 10000,
    collectionValue: 11200,
  }),
  lot({
    id: 'sculpture_bust',
    name: { ru: 'Бюст «Тень»', en: 'Shadow bust' },
    blurb: { ru: 'Камень с золотой инкрустацией.', en: 'Stone with a gold inlay.' },
    rarity: 'EPIC',
    category: 'INTERIOR',
    purchasePrice: 10000,
    collectionValue: 11400,
  }),
  lot({
    id: 'painting_salon',
    name: { ru: 'Салонный свет', en: 'Salon light' },
    blurb: { ru: 'Тёплый интерьер, ради которого стоит рискнуть ещё одним рейдом.', en: 'A warm interior worth one more raid.' },
    rarity: 'EPIC',
    category: 'ART',
    purchasePrice: 10000,
    collectionValue: 11500,
  }),
  lot({
    id: 'watch_dusk',
    name: { ru: 'Часы «Полночь»', en: 'Midnight watch' },
    blurb: { ru: 'Редкие стрелки и сапфировое стекло.', en: 'Rare hands and sapphire glass.' },
    rarity: 'LEGENDARY',
    category: 'LUXURY',
    purchasePrice: 12000,
    collectionValue: 13800,
  }),
  lot({
    id: 'car_city',
    name: { ru: 'CITY CLASSIC', en: 'CITY CLASSIC' },
    blurb: { ru: 'Первый автомобиль коллекции. Уже статус.', en: 'The first car in a vault. Status starts here.' },
    rarity: 'EPIC',
    category: 'CARS',
    purchasePrice: 8000,
    collectionValue: 9200,
  }),
  lot({
    id: 'car_sedan',
    name: { ru: 'LUXURY SEDAN', en: 'LUXURY SEDAN' },
    blurb: { ru: 'Тихий седан для тех, кто уже грабит особняки.', en: 'A quiet sedan for players who already hit mansions.' },
    rarity: 'LEGENDARY',
    category: 'CARS',
    purchasePrice: 28000,
    collectionValue: 32200,
  }),
  lot({
    id: 'jewel_emerald',
    name: { ru: 'Изумрудная петля', en: 'Emerald coil' },
    blurb: { ru: 'Камень, который поднимает стоимость всей коллекции.', en: 'A stone that lifts the whole vault.' },
    rarity: 'LEGENDARY',
    category: 'LUXURY',
    purchasePrice: 50000,
    collectionValue: 57500,
  }),
  lot({
    id: 'painting_harbor',
    name: { ru: 'ROYAL BLUE', en: 'ROYAL BLUE' },
    blurb: { ru: 'Глубокий синий холст. Уже статус.', en: 'Deep blue canvas. Status, not pocket change.' },
    rarity: 'LEGENDARY',
    category: 'ART',
    purchasePrice: 50000,
    collectionValue: 56000,
  }),
  lot({
    id: 'sculpture_wing',
    name: { ru: 'Крыло из бронзы', en: 'Bronze wing' },
    blurb: { ru: 'Тяжёлая скульптура для главного зала.', en: 'A heavy piece for the great hall.' },
    rarity: 'LEGENDARY',
    category: 'INTERIOR',
    purchasePrice: 52000,
    collectionValue: 59000,
  }),
  lot({
    id: 'art_golden',
    name: { ru: 'GOLDEN PORTRAIT', en: 'GOLDEN PORTRAIT' },
    blurb: { ru: 'Портрет, ради которого идут в MANSION.', en: 'A portrait worth running MANSION for.' },
    rarity: 'LEGENDARY',
    category: 'ART',
    purchasePrice: 42000,
    collectionValue: 48000,
  }),
  lot({
    id: 'car_tourer',
    name: { ru: 'GRAND TOURER', en: 'GRAND TOURER' },
    blurb: { ru: 'Длинный капот и золотая решётка. Символ удачных рейдов.', en: 'Long hood, gold grille. A mark of clean raids.' },
    rarity: 'LEGENDARY',
    category: 'CARS',
    purchasePrice: 88000,
    collectionValue: 99000,
  }),
  lot({
    id: 'renoir',
    name: { ru: 'IMPRESSIONIST MASTER', en: 'IMPRESSIONIST MASTER' },
    blurb: { ru: 'Легендарный импрессионистский холст. Всего 100 экземпляров.', en: 'A legendary impressionist canvas. Only 100 exist.' },
    rarity: 'ICONIC',
    category: 'ART',
    purchasePrice: 250000,
    collectionValue: 280000,
    limited: 100,
  }),
  lot({
    id: 'rembrandt',
    name: { ru: 'MIDNIGHT GALLERY', en: 'MIDNIGHT GALLERY' },
    blurb: { ru: 'Тёмный мастерский портрет. 40 экземпляров.', en: 'A dark master portrait. 40 copies.' },
    rarity: 'ICONIC',
    category: 'ART',
    purchasePrice: 280000,
    collectionValue: 322000,
    limited: 40,
  }),
  lot({
    id: 'painting_crown',
    name: { ru: 'RENAISSANCE MASTER', en: 'RENAISSANCE MASTER' },
    blurb: { ru: 'Картина, ради которой грабят банки.', en: 'The painting banks get robbed for.' },
    rarity: 'ICONIC',
    category: 'ART',
    purchasePrice: 250000,
    collectionValue: 287000,
    limited: 80,
  }),
  lot({
    id: 'art_collector',
    name: { ru: 'THE DUCK COLLECTOR', en: 'THE DUCK COLLECTOR' },
    blurb: { ru: 'Портрет для вершины зала. Лимит 24.', en: 'A hall-piece portrait. Limited to 24.' },
    rarity: 'ICONIC',
    category: 'ART',
    purchasePrice: 410000,
    collectionValue: 470000,
    limited: 24,
  }),
  lot({
    id: 'car_super',
    name: { ru: 'SUPER CAR', en: 'SUPER CAR' },
    blurb: { ru: 'Миллион DUCK COIN. Символ, а не покупка на вечер.', en: 'A million DUCK COIN. A symbol, not an evening buy.' },
    rarity: 'ICONIC',
    category: 'CARS',
    purchasePrice: 1_000_000,
    collectionValue: 1_150_000,
    limited: 20,
  }),
  lot({
    id: 'rolls',
    name: { ru: 'ROYAL MOTOR', en: 'ROYAL MOTOR' },
    blurb: { ru: 'Мифический автомобиль. 12 экземпляров на весь мир.', en: 'A mythic coupe. 12 exist in the world.' },
    rarity: 'ICONIC',
    category: 'CARS',
    purchasePrice: 500000,
    collectionValue: 575000,
    limited: 12,
  }),
  lot({
    id: 'car_iconic',
    name: { ru: 'ICONIC COLLECTION', en: 'ICONIC COLLECTION' },
    blurb: { ru: 'Десять миллионов. Ради этого играют месяцами.', en: 'Ten million. The reason to keep raiding.' },
    rarity: 'ICONIC',
    category: 'CARS',
    purchasePrice: 10_000_000,
    collectionValue: 11_500_000,
    limited: 3,
  }),
  lot({
    id: 'crown',
    name: { ru: 'Золотой клюв', en: 'Gilded quack' },
    blurb: { ru: 'Единственный экземпляр. Вершина коллекции.', en: 'One copy. The top of the vault.' },
    rarity: 'ICONIC',
    category: 'SPECIAL',
    purchasePrice: 1_000_000,
    collectionValue: 1_200_000,
    limited: 1,
  }),
]

export const CATALOG: readonly CatalogItem[] = [
  ...[...ART_LOTS, ...WATCH_LOTS, ...CAR_LOTS, ...COLLECTIBLE_LOTS].map(lot),
  ...LEGACY_LOTS.map((item) => ({ ...item, market: false })),
]

export function catalogItem(id: string) {
  return CATALOG.find((item) => item.id === id) ?? null
}

export type OwnedCollection = Record<string, number>

export function collectionValue(owned: OwnedCollection) {
  let sum = 0
  for (const [id, count] of Object.entries(owned ?? {})) {
    const item = catalogItem(id)
    if (!item || count <= 0) continue
    sum += item.collectionValue * count
  }
  return sum
}

/** Rank and prestige use collection value only. Banked DUCK COIN does not count. */
export function prestigeScore(_bankedDuckCoin: number, owned: OwnedCollection) {
  return collectionValue(owned)
}

export type ListingStatus = 'ACTIVE' | 'SOLD' | 'CANCELLED'

export type MarketListing = {
  id: string
  listingId: string
  itemId: string
  sellerId: string
  ownerId: string
  price: number
  priceDuckCoin: number
  createdAt: number
  status: ListingStatus
}

export type MarketAction = 'BUY' | 'SELL' | 'LIST'
