/** Catalog for the Black Market. DUCK COIN buys collection items. Stars stay on upgrades.
 *  Names are fictional luxury pieces so we never ship real artwork or trademarks.
 */

export type ItemRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC'
export type ItemCategory = 'painting' | 'vase' | 'watch' | 'jewelry' | 'car' | 'artifact' | 'sculpture'

export type CatalogItem = {
  id: string
  name: { ru: string; en: string }
  blurb: { ru: string; en: string }
  rarity: ItemRarity
  category: ItemCategory
  duckCoinValue: number
  limited?: number
}

export const CATALOG: readonly CatalogItem[] = [
  {
    id: 'painting_study',
    name: { ru: 'Этюд янтаря', en: 'Amber study' },
    blurb: { ru: 'Небольшой салонный холст. Первый шаг в коллекцию.', en: 'A small salon canvas. The first step into a vault.' },
    rarity: 'COMMON',
    category: 'painting',
    duckCoinValue: 1000,
  },
  {
    id: 'vase_clay',
    name: { ru: 'Янтарная урна', en: 'Amber urn' },
    blurb: { ru: 'Тёплая керамика с золотой каймой.', en: 'Warm ceramic with a gold lip.' },
    rarity: 'COMMON',
    category: 'vase',
    duckCoinValue: 1000,
  },
  {
    id: 'vase_amber',
    name: { ru: 'Ваза «Дым»', en: 'Smoke vase' },
    blurb: { ru: 'Тонкое стекло, которое ловит свет лампы.', en: 'Thin glass that catches lamplight.' },
    rarity: 'COMMON',
    category: 'vase',
    duckCoinValue: 1200,
  },
  {
    id: 'watch_brass',
    name: { ru: 'Хронограф Dusk', en: 'Dusk chronograph' },
    blurb: { ru: 'Латунный корпус и тёмный циферблат.', en: 'Brass case, dark face, quiet tick.' },
    rarity: 'RARE',
    category: 'watch',
    duckCoinValue: 10000,
  },
  {
    id: 'sculpture_bust',
    name: { ru: 'Бюст «Тень»', en: 'Shadow bust' },
    blurb: { ru: 'Камень с золотой инкрустацией.', en: 'Stone with a gold inlay.' },
    rarity: 'RARE',
    category: 'sculpture',
    duckCoinValue: 10000,
  },
  {
    id: 'painting_salon',
    name: { ru: 'Салонный свет', en: 'Salon light' },
    blurb: { ru: 'Тёплый интерьер, ради которого стоит рискнуть ещё одним рейдом.', en: 'A warm interior worth one more raid.' },
    rarity: 'RARE',
    category: 'painting',
    duckCoinValue: 10000,
  },
  {
    id: 'watch_dusk',
    name: { ru: 'Часы «Полночь»', en: 'Midnight watch' },
    blurb: { ru: 'Редкие стрелки и сапфировое стекло.', en: 'Rare hands and sapphire glass.' },
    rarity: 'RARE',
    category: 'watch',
    duckCoinValue: 12000,
  },
  {
    id: 'jewel_emerald',
    name: { ru: 'Изумрудная петля', en: 'Emerald coil' },
    blurb: { ru: 'Камень, который поднимает стоимость всей коллекции.', en: 'A stone that lifts the whole vault.' },
    rarity: 'EPIC',
    category: 'jewelry',
    duckCoinValue: 50000,
  },
  {
    id: 'painting_harbor',
    name: { ru: 'Ночная гавань', en: 'Night harbor' },
    blurb: { ru: 'Глубокий синий холст. Уже статус.', en: 'Deep blue canvas. Status, not pocket change.' },
    rarity: 'EPIC',
    category: 'painting',
    duckCoinValue: 50000,
  },
  {
    id: 'sculpture_wing',
    name: { ru: 'Крыло из бронзы', en: 'Bronze wing' },
    blurb: { ru: 'Тяжёлая скульптура для главного зала.', en: 'A heavy piece for the great hall.' },
    rarity: 'EPIC',
    category: 'sculpture',
    duckCoinValue: 52000,
  },
  {
    id: 'renoir',
    name: { ru: 'Сад на закате', en: 'Sunset garden' },
    blurb: { ru: 'Легендарный импрессионистский холст. Всего 100 экземпляров.', en: 'A legendary impressionist canvas. Only 100 exist.' },
    rarity: 'LEGENDARY',
    category: 'painting',
    duckCoinValue: 250000,
    limited: 100,
  },
  {
    id: 'rembrandt',
    name: { ru: 'Ночная галерея', en: 'Night gallery' },
    blurb: { ru: 'Тёмный мастерский портрет. 40 экземпляров.', en: 'A dark master portrait. 40 copies.' },
    rarity: 'LEGENDARY',
    category: 'painting',
    duckCoinValue: 280000,
    limited: 40,
  },
  {
    id: 'painting_crown',
    name: { ru: 'Корона зала', en: 'Hall crown' },
    blurb: { ru: 'Картина, ради которой грабят банки.', en: 'The painting banks get robbed for.' },
    rarity: 'LEGENDARY',
    category: 'painting',
    duckCoinValue: 250000,
    limited: 80,
  },
  {
    id: 'rolls',
    name: { ru: 'Phantom Coupe', en: 'Phantom Coupe' },
    blurb: { ru: 'Мифический автомобиль. 12 экземпляров на весь мир.', en: 'A mythic coupe. 12 exist in the world.' },
    rarity: 'MYTHIC',
    category: 'car',
    duckCoinValue: 500000,
    limited: 12,
  },
  {
    id: 'crown',
    name: { ru: 'Золотой клюв', en: 'Gilded quack' },
    blurb: { ru: 'Единственный экземпляр. Вершина коллекции.', en: 'One copy. The top of the vault.' },
    rarity: 'MYTHIC',
    category: 'artifact',
    duckCoinValue: 1000000,
    limited: 1,
  },
]

export function catalogItem(id: string) {
  return CATALOG.find((item) => item.id === id) ?? null
}

export type OwnedCollection = Record<string, number>

export function collectionValue(owned: OwnedCollection) {
  let sum = 0
  for (const [id, count] of Object.entries(owned)) {
    const item = catalogItem(id)
    if (!item || count <= 0) continue
    sum += item.duckCoinValue * count
  }
  return sum
}

export function prestigeScore(bankedDuckCoin: number, owned: OwnedCollection) {
  return collectionValue(owned) + Math.max(0, Math.floor(bankedDuckCoin * 0.05))
}

export type MarketListing = {
  id: string
  itemId: string
  ownerId: string
  priceDuckCoin: number
  createdAt: number
}

export type MarketAction = 'BUY' | 'SELL' | 'LIST'
