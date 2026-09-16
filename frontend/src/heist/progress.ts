export type PlayerProgress = {
  bankedDuckCoin: number
  bagLevel: number
  disguiseLevel: number
  shoesLevel: number
}

export type HeistRunMods = {
  bagCap: number
  disguiseMul: number
  silentShoes: boolean
}

const KEY = 'duckjackpot.heist.progress.v1'

export const BAG_BASIC = 100
export const BAG_BIG = 250
export const PRICE_BIG_BAG = 500
export const PRICE_DISGUISE = 750
export const PRICE_SHOES = 1000

const emptyProgress = (): PlayerProgress => ({
  bankedDuckCoin: 0,
  bagLevel: 0,
  disguiseLevel: 0,
  shoesLevel: 0,
})

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyProgress()
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>
    return {
      bankedDuckCoin: Math.max(0, Math.floor(Number(parsed.bankedDuckCoin) || 0)),
      bagLevel: Number(parsed.bagLevel) >= 1 ? 1 : 0,
      disguiseLevel: Number(parsed.disguiseLevel) >= 1 ? 1 : 0,
      shoesLevel: Number(parsed.shoesLevel) >= 1 ? 1 : 0,
    }
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(next: PlayerProgress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

export function bagCap(progress: PlayerProgress) {
  return progress.bagLevel >= 1 ? BAG_BIG : BAG_BASIC
}

export function runMods(progress: PlayerProgress): HeistRunMods {
  return {
    bagCap: bagCap(progress),
    disguiseMul: progress.disguiseLevel >= 1 ? 0.75 : 1,
    silentShoes: progress.shoesLevel >= 1,
  }
}

export function bankCoins(progress: PlayerProgress, gained: number) {
  const next = { ...progress, bankedDuckCoin: progress.bankedDuckCoin + Math.max(0, Math.floor(gained)) }
  saveProgress(next)
  return next
}
