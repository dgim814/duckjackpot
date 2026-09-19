export type PlayerProgress = {
  bankedDuckCoin: number
  bagLevel: number
  disguiseLevel: number
  shoesLevel: number
  nightVisionLevel: number
  dashLevel: number
  magnetLevel: number
  lockpickLevel: number
  objLoot: boolean
  objStealth: boolean
  objSpeed: boolean
}

export type HeistRunMods = {
  bagCap: number
  bagLevel: number
  disguiseMul: number
  silentShoes: boolean
  speedMul: number
}

export type LabStat = 'bagLevel' | 'disguiseLevel' | 'shoesLevel'

const KEY = 'duckjackpot.heist.progress.v1'
const LAB_MAX = 3

export const BAG_BASIC = 100
export const BAG_BIG = 250
export const BAG_MASTER = 500
export const BAG_MEGA = 1000
export const BAG_CAPS = [BAG_BASIC, BAG_BIG, BAG_MASTER, BAG_MEGA] as const
export const DISGUISE_MUL = [1, 0.75, 0.6, 0.45] as const
export const SPEED_MUL = [1, 1, 1.15, 1.3] as const

export const BAG_PRICES = [500, 1600, 4200] as const
export const DISGUISE_PRICES = [750, 1800, 3600] as const
export const SHOES_PRICES = [1000, 2200, 4500] as const

export const PRICE_BIG_BAG = BAG_PRICES[0]
export const PRICE_DISGUISE = DISGUISE_PRICES[0]
export const PRICE_SHOES = SHOES_PRICES[0]

export const RAID_OBJ_LOOT = 100
export const RAID_OBJ_TIME_S = 120
export const RAID_OBJ_REWARD = 25
export const RAID_OBJ_ALL = 50

const emptyProgress = (): PlayerProgress => ({
  bankedDuckCoin: 0,
  bagLevel: 0,
  disguiseLevel: 0,
  shoesLevel: 0,
  nightVisionLevel: 0,
  dashLevel: 0,
  magnetLevel: 0,
  lockpickLevel: 0,
  objLoot: false,
  objStealth: false,
  objSpeed: false,
})

function clampLevel(n: unknown, max = LAB_MAX) {
  const v = Math.floor(Number(n) || 0)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(max, v))
}

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyProgress()
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>
    return {
      bankedDuckCoin: Math.max(0, Math.floor(Number(parsed.bankedDuckCoin) || 0)),
      bagLevel: clampLevel(parsed.bagLevel),
      disguiseLevel: clampLevel(parsed.disguiseLevel),
      shoesLevel: clampLevel(parsed.shoesLevel),
      nightVisionLevel: clampLevel(parsed.nightVisionLevel, 1),
      dashLevel: clampLevel(parsed.dashLevel, 1),
      magnetLevel: clampLevel(parsed.magnetLevel, 1),
      lockpickLevel: clampLevel(parsed.lockpickLevel, 1),
      objLoot: Boolean(parsed.objLoot),
      objStealth: Boolean(parsed.objStealth),
      objSpeed: Boolean(parsed.objSpeed),
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
  return BAG_CAPS[clampLevel(progress.bagLevel)] ?? BAG_BASIC
}

export function labPrices(stat: LabStat): readonly number[] {
  if (stat === 'bagLevel') return BAG_PRICES
  if (stat === 'disguiseLevel') return DISGUISE_PRICES
  return SHOES_PRICES
}

export function labNextPrice(progress: PlayerProgress, stat: LabStat) {
  const level = clampLevel(progress[stat])
  const prices = labPrices(stat)
  if (level >= prices.length) return null
  return prices[level]
}

export function buyLabUpgrade(progress: PlayerProgress, stat: LabStat) {
  const price = labNextPrice(progress, stat)
  if (price == null) return { ok: false as const, reason: 'max' as const, next: progress }
  if (progress.bankedDuckCoin < price) return { ok: false as const, reason: 'poor' as const, next: progress }
  const next: PlayerProgress = {
    ...progress,
    bankedDuckCoin: progress.bankedDuckCoin - price,
    [stat]: clampLevel(progress[stat] + 1),
  }
  saveProgress(next)
  return { ok: true as const, reason: 'ok' as const, next }
}

export function runMods(progress: PlayerProgress): HeistRunMods {
  const bag = clampLevel(progress.bagLevel)
  const disguise = clampLevel(progress.disguiseLevel)
  const shoes = clampLevel(progress.shoesLevel)
  return {
    bagCap: BAG_CAPS[bag] ?? BAG_BASIC,
    bagLevel: bag,
    disguiseMul: DISGUISE_MUL[disguise] ?? 1,
    silentShoes: shoes === 1,
    speedMul: SPEED_MUL[shoes] ?? 1,
  }
}

export function raidObjectiveBonus(escaped: boolean, loot: boolean, stealth: boolean, speed: boolean) {
  if (!escaped) return 0
  const n = Number(loot) + Number(stealth) + Number(speed)
  return n * RAID_OBJ_REWARD + (n === 3 ? RAID_OBJ_ALL : 0)
}

export function bankCoins(progress: PlayerProgress, gained: number, objectives?: { loot: boolean; stealth: boolean; speed: boolean }) {
  const next: PlayerProgress = {
    ...progress,
    bankedDuckCoin: progress.bankedDuckCoin + Math.max(0, Math.floor(gained)),
    objLoot: progress.objLoot || Boolean(objectives?.loot),
    objStealth: progress.objStealth || Boolean(objectives?.stealth),
    objSpeed: progress.objSpeed || Boolean(objectives?.speed),
  }
  saveProgress(next)
  return next
}
