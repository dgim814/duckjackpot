import { catalogItem, type ListingStatus, type MarketListing } from './catalog'

const KEY = 'duckjackpot.heist.market.v1'
const PLAYER_KEY = 'duckjackpot.heist.playerId.v1'

export function localPlayerId() {
  try {
    const existing = localStorage.getItem(PLAYER_KEY)
    if (existing) return existing
    const id = `duck_${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(PLAYER_KEY, id)
    return id
  } catch {
    return 'duck_local'
  }
}

function asListing(row: Partial<MarketListing> & { itemId?: string }): MarketListing | null {
  if (!row || !row.itemId || !catalogItem(row.itemId)) return null
  const price = Math.floor(Number(row.price ?? row.priceDuckCoin) || 0)
  if (price <= 0) return null
  const seller = String(row.sellerId || row.ownerId || '')
  if (!seller) return null
  const id = String(row.id || row.listingId || `lst_${row.itemId}_${row.createdAt || Date.now()}`)
  const status = (row.status as ListingStatus) || 'ACTIVE'
  if (status !== 'ACTIVE' && status !== 'SOLD' && status !== 'CANCELLED') return null
  return {
    id,
    listingId: id,
    itemId: row.itemId,
    sellerId: seller,
    ownerId: seller,
    price,
    priceDuckCoin: price,
    createdAt: Number(row.createdAt) || Date.now(),
    status,
  }
}

function readList(): MarketListing[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((row) => asListing(row as Partial<MarketListing>)).filter((row): row is MarketListing => Boolean(row))
  } catch {
    return []
  }
}

function writeList(rows: MarketListing[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows))
  } catch {
    /* ignore */
  }
}

export function loadListings() {
  return readList()
}

export function activeListings() {
  return readList().filter((row) => row.status === 'ACTIVE')
}

export function listItem(itemId: string, priceDuckCoin: number, ownerId = localPlayerId()): MarketListing | null {
  const item = catalogItem(itemId)
  const price = Math.floor(priceDuckCoin)
  if (!item || !item.tradable || price <= 0) return null
  const id = `lst_${itemId}_${Date.now()}`
  const listing: MarketListing = {
    id,
    listingId: id,
    itemId,
    sellerId: ownerId,
    ownerId,
    price,
    priceDuckCoin: price,
    createdAt: Date.now(),
    status: 'ACTIVE',
  }
  writeList([...readList(), listing])
  return listing
}

export function cancelListing(id: string, ownerId = localPlayerId()) {
  const rows = readList()
  const hit = rows.find((row) => row.id === id && row.status === 'ACTIVE')
  if (!hit || hit.sellerId !== ownerId) return null
  writeList(rows.map((row) => (row.id === id ? { ...row, status: 'CANCELLED' as const } : row)))
  return { ...hit, status: 'CANCELLED' as const }
}

/** Local mock only. Not a live player-to-player market. */
export function buyListing(id: string, buyerId: string): MarketListing | null {
  const rows = readList()
  const hit = rows.find((row) => row.id === id && row.status === 'ACTIVE')
  if (!hit || hit.sellerId === buyerId) return null
  writeList(rows.map((row) => (row.id === id ? { ...row, status: 'SOLD' as const } : row)))
  return { ...hit, status: 'SOLD' }
}

export { catalogItem }
