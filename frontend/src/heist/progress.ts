import type { OwnedCollection } from './economy/catalog'
import { catalogItem } from './economy/catalog'
import { addToCollection } from './economy/collection'
import { adoptOrphanListings, cancelListing, listItem, loadListings, localPlayerId } from './economy/marketStore'

export type OwnedMeta = Record<string, { acquiredAt: number }>

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
  /** Collection counts. Never wipe this on migrate. */
  ownedArt: OwnedCollection
  ownedMeta: OwnedMeta
  /** Telegram Stars for gameplay upgrades. Never mixed with DUCK COIN. */
  stars: number
  /** Successful BANK exits. 0 means first-time onboarding. Never wipe. */
  bankEscapes: number
  /** Persistent BANK heist. Missing fields migrate empty; never wipe the wallet. */
  bankLootTaken: string[]
  bankOpenedSafes: string[]
  bankOpenedDoors: string[]
  bankDepth: number
  bankReachedFinal: boolean
  bankComplete: boolean
  /** Persistent MANSION heist, same rules as BANK. Missing fields migrate empty. */
  mansionLootTaken: string[]
  mansionOpenedSafes: string[]
  mansionOpenedDoors: string[]
  mansionDepth: number
  mansionReachedFinal: boolean
  mansionComplete: boolean
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

/** Gameplay upgrades: Telegram Stars only. */
export const BAG_STAR_PRICES = [50, 150, 400] as const
export const DISGUISE_STAR_PRICES = [75, 200, 450] as const
export const SHOES_STAR_PRICES = [80, 220, 500] as const

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
  ownedArt: {},
  ownedMeta: {},
  stars: 0,
  bankEscapes: 0,
  bankLootTaken: [],
  bankOpenedSafes: [],
  bankOpenedDoors: [],
  bankDepth: 0,
  bankReachedFinal: false,
  bankComplete: false,
  mansionLootTaken: [],
  mansionOpenedSafes: [],
  mansionOpenedDoors: [],
  mansionDepth: 0,
  mansionReachedFinal: false,
  mansionComplete: false,
})

function readOwned(raw: unknown): OwnedCollection {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: OwnedCollection = {}
  for (const [id, count] of Object.entries(raw as Record<string, unknown>)) {
    const n = Math.floor(Number(count) || 0)
    if (n > 0) out[id] = n
  }
  return out
}

function readMeta(raw: unknown, owned: OwnedCollection): OwnedMeta {
  const out: OwnedMeta = {}
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [id, row] of Object.entries(raw as Record<string, { acquiredAt?: unknown }>)) {
      const at = Math.floor(Number(row?.acquiredAt) || 0)
      if (at > 0) out[id] = { acquiredAt: at }
    }
  }
  const now = Date.now()
  for (const id of Object.keys(owned)) {
    if (!out[id]) out[id] = { acquiredAt: now }
  }
  return out
}

function clampLevel(n: unknown, max = LAB_MAX) {
  const v = Math.floor(Number(n) || 0)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(max, v))
}

function readIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const id = String(item ?? '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

function mergeIds(a: readonly string[] | undefined, b: readonly string[] | undefined) {
  return readIdList([...(a ?? []), ...(b ?? [])])
}

function migrateBankDoors(ids: string[]) {
  const mapped = ids.map((id) => (id === 'bankVaultB' ? 'bankStorageB' : id))
  return readIdList(mapped)
}

/** ACTIVE lots used to leave the vault. Restore those copies so listings match ownedArt. */
function restoreListedCopies(owned: OwnedCollection): OwnedCollection {
  try {
    adoptOrphanListings()
    const listed: OwnedCollection = {}
    for (const row of loadListings()) {
      if (row.status !== 'ACTIVE') continue
      if (!catalogItem(row.itemId)) continue
      listed[row.itemId] = (listed[row.itemId] ?? 0) + 1
    }
    const next = { ...owned }
    for (const [id, n] of Object.entries(listed)) {
      if ((next[id] ?? 0) < n) next[id] = n
    }
    return next
  } catch {
    return owned
  }
}

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyProgress()
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>
    const ownedArt = restoreListedCopies(readOwned(parsed.ownedArt))
    const next: PlayerProgress = {
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
      ownedArt,
      ownedMeta: readMeta(parsed.ownedMeta, ownedArt),
      stars: Math.max(0, Math.floor(Number((parsed as { stars?: unknown }).stars) || 0)),
      bankEscapes: Math.max(0, Math.floor(Number((parsed as { bankEscapes?: unknown }).bankEscapes) || 0)),
      bankLootTaken: readIdList((parsed as { bankLootTaken?: unknown }).bankLootTaken),
      bankOpenedSafes: readIdList((parsed as { bankOpenedSafes?: unknown }).bankOpenedSafes),
      bankOpenedDoors: migrateBankDoors(readIdList((parsed as { bankOpenedDoors?: unknown }).bankOpenedDoors)),
      bankDepth: Math.max(0, Math.floor(Number((parsed as { bankDepth?: unknown }).bankDepth) || 0)),
      bankReachedFinal: Boolean((parsed as { bankReachedFinal?: unknown }).bankReachedFinal),
      bankComplete: Boolean((parsed as { bankComplete?: unknown }).bankComplete),
      mansionLootTaken: readIdList((parsed as { mansionLootTaken?: unknown }).mansionLootTaken),
      mansionOpenedSafes: readIdList((parsed as { mansionOpenedSafes?: unknown }).mansionOpenedSafes),
      mansionOpenedDoors: readIdList((parsed as { mansionOpenedDoors?: unknown }).mansionOpenedDoors),
      mansionDepth: Math.max(0, Math.floor(Number((parsed as { mansionDepth?: unknown }).mansionDepth) || 0)),
      mansionReachedFinal: Boolean((parsed as { mansionReachedFinal?: unknown }).mansionReachedFinal),
      mansionComplete: Boolean((parsed as { mansionComplete?: unknown }).mansionComplete),
    }
    const before = JSON.stringify(readOwned(parsed.ownedArt))
    if (before !== JSON.stringify(ownedArt)) saveProgress(next)
    return next
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

export function isHeistNovice(progress: PlayerProgress) {
  return Math.max(0, Math.floor(progress.bankEscapes ?? 0)) <= 0
}

/** True when gameplay fields match a brand-new heist player. Wallet/NFT fields are ignored. */
export function isGameplayFresh(progress: PlayerProgress) {
  return (
    Math.max(0, Math.floor(progress.bankedDuckCoin || 0)) === 0 &&
    clampLevel(progress.bagLevel) === 0 &&
    clampLevel(progress.disguiseLevel) === 0 &&
    clampLevel(progress.shoesLevel) === 0 &&
    clampLevel(progress.nightVisionLevel, 1) === 0 &&
    clampLevel(progress.dashLevel, 1) === 0 &&
    clampLevel(progress.magnetLevel, 1) === 0 &&
    clampLevel(progress.lockpickLevel, 1) === 0 &&
    !progress.objLoot &&
    !progress.objStealth &&
    !progress.objSpeed &&
    Math.max(0, Math.floor(progress.bankEscapes ?? 0)) === 0 &&
    readIdList(progress.bankLootTaken).length === 0 &&
    readIdList(progress.bankOpenedSafes).length === 0 &&
    migrateBankDoors(readIdList(progress.bankOpenedDoors)).length === 0 &&
    Math.max(0, Math.floor(progress.bankDepth ?? 0)) === 0 &&
    !progress.bankReachedFinal &&
    !progress.bankComplete &&
    readIdList(progress.mansionLootTaken).length === 0 &&
    readIdList(progress.mansionOpenedSafes).length === 0 &&
    readIdList(progress.mansionOpenedDoors).length === 0 &&
    Math.max(0, Math.floor(progress.mansionDepth ?? 0)) === 0 &&
    !progress.mansionComplete
  )
}

/**
 * Official gameplay reset for the current device.
 * Keeps ownedArt / ownedMeta / stars. Never touches playerId, listings, or other keys.
 */
export function resetGameplayProgress(): PlayerProgress {
  const live = loadProgress()
  const next: PlayerProgress = {
    ...emptyProgress(),
    ...keepWallet(live),
  }
  saveProgress(next)
  return next
}

export const GAMEPLAY_RESET_EVENT = 'duckjackpot:gameplay-reset'

export function notifyGameplayReset() {
  try {
    window.dispatchEvent(new Event(GAMEPLAY_RESET_EVENT))
  } catch {
    /* ignore */
  }
}

export function subscribeGameplayReset(onReset: () => void) {
  const handler = () => onReset()
  window.addEventListener(GAMEPLAY_RESET_EVENT, handler)
  return () => window.removeEventListener(GAMEPLAY_RESET_EVENT, handler)
}

export function noteBankEscape(progress: PlayerProgress) {
  const live = loadProgress()
  const next: PlayerProgress = {
    ...live,
    ...keepWallet(live),
    bankEscapes: Math.max(0, Math.floor(live.bankEscapes ?? 0)) + 1,
    bankedDuckCoin: Math.max(live.bankedDuckCoin, progress.bankedDuckCoin),
  }
  saveProgress(next)
  return next
}

export function persistBankWorld(patch: {
  lootTaken?: readonly string[]
  openedSafes?: readonly string[]
  openedDoors?: readonly string[]
  depth?: number
  reachedFinal?: boolean
  complete?: boolean
}) {
  const live = loadProgress()
  const next: PlayerProgress = {
    ...live,
    ...keepWallet(live),
    bankLootTaken: mergeIds(live.bankLootTaken, patch.lootTaken),
    bankOpenedSafes: mergeIds(live.bankOpenedSafes, patch.openedSafes),
    bankOpenedDoors: migrateBankDoors(mergeIds(live.bankOpenedDoors, patch.openedDoors)),
    bankDepth: Math.max(live.bankDepth ?? 0, Math.max(0, Math.floor(patch.depth ?? 0))),
    bankReachedFinal: Boolean(live.bankReachedFinal || patch.reachedFinal),
    bankComplete: Boolean(live.bankComplete || patch.complete),
  }
  saveProgress(next)
  return next
}

/** Same rules as persistBankWorld: ids and depth only grow, completion never resets. */
export function persistMansionWorld(patch: {
  lootTaken?: readonly string[]
  openedSafes?: readonly string[]
  openedDoors?: readonly string[]
  depth?: number
  reachedFinal?: boolean
  complete?: boolean
}) {
  const live = loadProgress()
  const next: PlayerProgress = {
    ...live,
    ...keepWallet(live),
    mansionLootTaken: mergeIds(live.mansionLootTaken, patch.lootTaken),
    mansionOpenedSafes: mergeIds(live.mansionOpenedSafes, patch.openedSafes),
    mansionOpenedDoors: mergeIds(live.mansionOpenedDoors, patch.openedDoors),
    mansionDepth: Math.max(live.mansionDepth ?? 0, Math.max(0, Math.floor(patch.depth ?? 0))),
    mansionReachedFinal: Boolean(live.mansionReachedFinal || patch.reachedFinal),
    mansionComplete: Boolean(live.mansionComplete || patch.complete),
  }
  saveProgress(next)
  return next
}

export function isMansionUnlocked(progress: PlayerProgress) {
  return Boolean(progress.bankComplete)
}

export function bagCap(progress: PlayerProgress) {
  return BAG_CAPS[clampLevel(progress.bagLevel)] ?? BAG_BASIC
}

export function labPrices(stat: LabStat): readonly number[] {
  if (stat === 'bagLevel') return BAG_STAR_PRICES
  if (stat === 'disguiseLevel') return DISGUISE_STAR_PRICES
  return SHOES_STAR_PRICES
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
  const stars = Math.max(0, Math.floor(progress.stars || 0))
  if (stars < price) return { ok: false as const, reason: 'poor' as const, next: progress }
  const next: PlayerProgress = {
    ...progress,
    stars: stars - price,
    ownedArt: progress.ownedArt ?? {},
    ownedMeta: progress.ownedMeta ?? {},
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

function keepWallet(progress: PlayerProgress): Pick<PlayerProgress, 'ownedArt' | 'ownedMeta' | 'stars'> {
  return {
    ownedArt: progress.ownedArt ?? {},
    ownedMeta: progress.ownedMeta ?? {},
    stars: Math.max(0, Math.floor(progress.stars || 0)),
  }
}

export function bankCoins(progress: PlayerProgress, gained: number, objectives?: { loot: boolean; stealth: boolean; speed: boolean }) {
  const live = loadProgress()
  const next: PlayerProgress = {
    ...live,
    ...keepWallet(live),
    bankedDuckCoin: live.bankedDuckCoin + Math.max(0, Math.floor(gained)),
    objLoot: live.objLoot || progress.objLoot || Boolean(objectives?.loot),
    objStealth: live.objStealth || progress.objStealth || Boolean(objectives?.stealth),
    objSpeed: live.objSpeed || progress.objSpeed || Boolean(objectives?.speed),
  }
  saveProgress(next)
  return next
}

export function buyCatalogItem(progress: PlayerProgress, itemId: string) {
  const item = catalogItem(itemId)
  if (!item) return { ok: false as const, reason: 'missing' as const, next: progress }
  if (progress.bankedDuckCoin < item.purchasePrice) return { ok: false as const, reason: 'poor' as const, next: progress }
  const next: PlayerProgress = {
    ...progress,
    ...keepWallet(progress),
    bankedDuckCoin: progress.bankedDuckCoin - item.purchasePrice,
    ownedArt: addToCollection(progress.ownedArt ?? {}, itemId),
    ownedMeta: { ...(progress.ownedMeta ?? {}), [itemId]: { acquiredAt: Date.now() } },
  }
  saveProgress(next)
  return { ok: true as const, reason: 'ok' as const, next }
}

export function listOwnedItem(progress: PlayerProgress, itemId: string, priceDuckCoin: number) {
  const have = Math.max(0, Math.floor((progress.ownedArt ?? {})[itemId] ?? 0))
  if (have <= 0) return { ok: false as const, reason: 'none' as const, next: progress, listing: null }
  const me = localPlayerId()
  const listed = loadListings().filter((row) => row.sellerId === me && row.status === 'ACTIVE' && row.itemId === itemId).length
  if (listed >= have) return { ok: false as const, reason: 'listed' as const, next: progress, listing: null }
  const listing = listItem(itemId, priceDuckCoin)
  if (!listing) return { ok: false as const, reason: 'bad' as const, next: progress, listing: null }
  return { ok: true as const, reason: 'ok' as const, next: progress, listing }
}

export function recallListing(progress: PlayerProgress, listingId: string) {
  const listing = cancelListing(listingId)
  if (!listing) return { ok: false as const, reason: 'gone' as const, next: progress }
  return { ok: true as const, reason: 'ok' as const, next: progress }
}
