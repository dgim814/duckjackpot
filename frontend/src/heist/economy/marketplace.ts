import { catalogItem, type ItemRarity, type MarketListing } from './catalog'

/** Local listing shape for a future P2P Black Market. No auto-buyback. */
export type ListingDraft = {
  itemId: string
  ownerId: string
  priceDuckCoin: number
}

export function makeListing(draft: ListingDraft, now = Date.now()): MarketListing | null {
  const item = catalogItem(draft.itemId)
  const price = Math.floor(draft.priceDuckCoin)
  if (!item || price <= 0 || !draft.ownerId) return null
  return {
    id: `lst_${draft.itemId}_${now}`,
    itemId: draft.itemId,
    ownerId: draft.ownerId,
    priceDuckCoin: price,
    createdAt: now,
  }
}

export function listingRarity(listing: MarketListing): ItemRarity | null {
  return catalogItem(listing.itemId)?.rarity ?? null
}

export function listingCollectionValue(listing: MarketListing) {
  return catalogItem(listing.itemId)?.duckCoinValue ?? 0
}
