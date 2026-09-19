import { catalogItem, type MarketListing } from './catalog'
import { listItem, cancelListing } from './marketStore'

export type ListingDraft = {
  itemId: string
  ownerId: string
  priceDuckCoin: number
}

export function makeListing(draft: ListingDraft, now = Date.now()): MarketListing | null {
  const item = catalogItem(draft.itemId)
  const price = Math.floor(draft.priceDuckCoin)
  if (!item || !item.tradable || price <= 0 || !draft.ownerId) return null
  const id = `lst_${draft.itemId}_${now}`
  return {
    id,
    listingId: id,
    itemId: draft.itemId,
    sellerId: draft.ownerId,
    ownerId: draft.ownerId,
    price,
    priceDuckCoin: price,
    createdAt: now,
    status: 'ACTIVE',
  }
}

export function listingRarity(listing: MarketListing) {
  return catalogItem(listing.itemId)?.rarity ?? null
}

export function listingCollectionValue(listing: MarketListing) {
  return catalogItem(listing.itemId)?.collectionValue ?? 0
}

export { listItem, cancelListing }
