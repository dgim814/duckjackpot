import { CATALOG, collectionValue, type CatalogItem, type OwnedCollection } from './catalog'

export type CollectionEntry = CatalogItem & { count: number }

export function ownedEntries(owned: OwnedCollection): CollectionEntry[] {
  return CATALOG.map((item) => ({ ...item, count: Math.max(0, Math.floor(owned[item.id] ?? 0)) })).filter(
    (item) => item.count > 0,
  )
}

export function addToCollection(owned: OwnedCollection, itemId: string, count = 1): OwnedCollection {
  const next = { ...owned }
  next[itemId] = Math.max(0, Math.floor(next[itemId] ?? 0) + Math.max(1, Math.floor(count)))
  return next
}

export { collectionValue }
