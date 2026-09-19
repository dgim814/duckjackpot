/** Catalog, collection and marketplace types for the Black Market loop.
 *  DUCK COIN buys collection items. Telegram Stars stay on gameplay upgrades.
 *  No fake online leaderboard — collectionValue is local until a server exists.
 */

export type ItemRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC'
export type ItemCategory = 'painting' | 'vase' | 'watch' | 'jewelry' | 'car' | 'artifact'

export type CatalogItem = {
  id: string
  name: { ru: string; en: string }
  rarity: ItemRarity
  category: ItemCategory
  duckCoinValue: number
  /** If set, only this many copies exist in the whole game. */
  limited?: number
}

export const CATALOG: readonly CatalogItem[] = [
  { id: 'vase_clay', name: { ru: 'Глиняная ваза', en: 'Clay vase' }, rarity: 'COMMON', category: 'vase', duckCoinValue: 400 },
  { id: 'watch_brass', name: { ru: 'Латунные часы', en: 'Brass watch' }, rarity: 'RARE', category: 'watch', duckCoinValue: 1800 },
  { id: 'painting_salon', name: { ru: 'Салонный этюд', en: 'Salon study' }, rarity: 'RARE', category: 'painting', duckCoinValue: 3200 },
  { id: 'jewel_emerald', name: { ru: 'Изумруд', en: 'Emerald' }, rarity: 'EPIC', category: 'jewelry', duckCoinValue: 9000 },
  { id: 'renoir', name: { ru: 'Ренуар', en: 'Renoir' }, rarity: 'LEGENDARY', category: 'painting', duckCoinValue: 25000, limited: 100 },
  { id: 'rembrandt', name: { ru: 'Рембрандт', en: 'Rembrandt' }, rarity: 'LEGENDARY', category: 'painting', duckCoinValue: 42000, limited: 40 },
  { id: 'rolls', name: { ru: 'Rolls-Royce', en: 'Rolls-Royce' }, rarity: 'MYTHIC', category: 'car', duckCoinValue: 120000, limited: 12 },
  { id: 'crown', name: { ru: 'Корона утки', en: 'Duck crown' }, rarity: 'MYTHIC', category: 'artifact', duckCoinValue: 250000, limited: 1 },
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

/** Future rank metric: collection first, cash second. Not wired to UI yet. */
export function prestigeScore(bankedDuckCoin: number, owned: OwnedCollection) {
  return collectionValue(owned) + Math.max(0, Math.floor(bankedDuckCoin * 0.15))
}

export type MarketListing = {
  id: string
  itemId: string
  ownerId: string
  priceDuckCoin: number
  createdAt: number
}

export type MarketAction = 'BUY' | 'SELL' | 'LIST'
