import { CATALOG, catalogItem, collectionValue, type CatalogItem, type OwnedCollection } from './catalog'

export type CollectionEntry = CatalogItem & { count: number; acquiredAt?: number }

export function ownedEntries(owned: OwnedCollection, meta?: Record<string, { acquiredAt?: number }>): CollectionEntry[] {
  return CATALOG.map((item) => ({
    ...item,
    count: Math.max(0, Math.floor(owned[item.id] ?? 0)),
    acquiredAt: meta?.[item.id]?.acquiredAt,
  })).filter((item) => item.count > 0)
}

export function addToCollection(owned: OwnedCollection, itemId: string, count = 1): OwnedCollection {
  const next = { ...owned }
  next[itemId] = Math.max(0, Math.floor(next[itemId] ?? 0) + Math.max(1, Math.floor(count)))
  return next
}

export function removeFromCollection(owned: OwnedCollection, itemId: string, count = 1): OwnedCollection | null {
  const have = Math.max(0, Math.floor(owned[itemId] ?? 0))
  const n = Math.max(1, Math.floor(count))
  if (have < n) return null
  const next = { ...owned }
  const left = have - n
  if (left <= 0) delete next[itemId]
  else next[itemId] = left
  return next
}

export function countOwned(owned: OwnedCollection) {
  let n = 0
  for (const count of Object.values(owned ?? {})) n += Math.max(0, Math.floor(count))
  return n
}

export function canAfford(itemId: string, duckCoin: number) {
  const item = catalogItem(itemId)
  return Boolean(item && duckCoin >= item.purchasePrice)
}

export { collectionValue }
