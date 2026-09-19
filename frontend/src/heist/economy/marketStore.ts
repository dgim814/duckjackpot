import { catalogItem, type MarketListing } from './catalog'

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

function readList(): MarketListing[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as MarketListing[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((row) => row && catalogItem(row.itemId) && row.priceDuckCoin > 0)
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

export function listItem(itemId: string, priceDuckCoin: number, ownerId = localPlayerId()): MarketListing | null {
  const item = catalogItem(itemId)
  const price = Math.floor(priceDuckCoin)
  if (!item || price <= 0) return null
  const listing: MarketListing = {
    id: `lst_${itemId}_${Date.now()}`,
    itemId,
    ownerId,
    priceDuckCoin: price,
    createdAt: Date.now(),
  }
  writeList([...readList(), listing])
  return listing
}

export function cancelListing(id: string, ownerId = localPlayerId()) {
  const rows = readList()
  const hit = rows.find((row) => row.id === id)
  if (!hit || hit.ownerId !== ownerId) return null
  writeList(rows.filter((row) => row.id !== id))
  return hit
}

export function buyListing(id: string, buyerId: string): MarketListing | null {
  const rows = readList()
  const hit = rows.find((row) => row.id === id)
  if (!hit || hit.ownerId === buyerId) return null
  writeList(rows.filter((row) => row.id !== id))
  return hit
}

export { catalogItem }
