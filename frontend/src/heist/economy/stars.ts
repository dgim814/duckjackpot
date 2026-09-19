/** Telegram Stars purchase seam. Lab upgrades spend an owned Stars balance.
 *  There is no live Telegram invoice yet — do not fake a successful pay. */

export type StarSku = {
  id: string
  stars: number
}

export type StarPurchaseResult = { ok: false; reason: 'unavailable' }

export const STAR_PACKS: readonly StarSku[] = [
  { id: 'stars_50', stars: 50 },
  { id: 'stars_150', stars: 150 },
  { id: 'stars_400', stars: 400 },
]

export function requestStarsPurchase(_sku: StarSku): StarPurchaseResult {
  return { ok: false, reason: 'unavailable' }
}

export function starsPaymentsReady() {
  return false
}
