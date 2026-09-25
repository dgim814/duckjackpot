import type { OwnedCollection } from './economy/catalog'
import { catalogItem } from './economy/catalog'
import { addToCollection } from './economy/collection'
import { BOOSTS, CONTINUE_KEEP, FENCE_RATE, STAR_ITEMS, UPGRADES, UPGRADE_EFFECTS, type StarItemId, type UpgradeId } from './economy/balance'
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
  /** Persistent LEVEL 3–8 heists (same rules as MANSION), keyed by level. Missing = untouched. */
  worlds: Partial<Record<WorldId, WorldProgress>>
  /** ⭐ one-off items owned (passes, boosts, continues). Never DUCK COIN, never NFT. */
  starItems: Partial<Record<StarItemId, number>>
  /** Special loot carried out of raids, waiting for the Black Market fence. */
  valuables: Valuable[]
  /** Last time the in-raid NFT Drop offer was shown (ms). 0 = never. */
  nftCtaAt: number
  /** The short "how the game works" card was dismissed. */
  onboardingSeen: boolean
  /** 🎯 MY GOAL: the Black Market lot the player chose to save up for. null = none chosen. */
  myGoalId: string | null
}

export type ValuableKind = 'watch' | 'jewel' | 'art' | 'relic' | 'crown'
export type Valuable = { id: string; kind: ValuableKind; value: number; level: string }

export type WorldId = 'level3' | 'level4' | 'level5' | 'level6' | 'level7' | 'level8'

export type WorldProgress = {
  lootTaken: string[]
  openedSafes: string[]
  openedDoors: string[]
  depth: number
  reachedFinal: boolean
  complete: boolean
}

const WORLD_IDS: readonly WorldId[] = ['level3', 'level4', 'level5', 'level6', 'level7', 'level8']

export type HeistRunMods = {
  bagCap: number
  bagLevel: number
  disguiseMul: number
  silentShoes: boolean
  speedMul: number
  /** Gear + boosts (optional so older callers/tests keep working; missing = 1 / 0). */
  noiseMul?: number
  dashCdMul?: number
  dashMul?: number
  lockWidthMul?: number
  pickupBonus?: number
  /** Star items owned at raid start that the raid may use (passes, continue). */
  passes?: { elevator: boolean; escalator: boolean; continues: number }
  /** A PREVIEW PASS raid: only the first floor, no completion. */
  preview?: boolean
  /** One-raid boosts consumed for this raid (for the HUD/summary). */
  boosts?: string[]
}

export type LabStat = UpgradeId

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
  worlds: {},
  starItems: {},
  valuables: [],
  nftCtaAt: 0,
  onboardingSeen: false,
  myGoalId: null,
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

/** A goal must still be a lot on sale; anything else reads as "no goal". */
function readGoal(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const item = catalogItem(raw)
  return item && item.market !== false ? raw : null
}

function readStarItems(raw: unknown): Partial<Record<StarItemId, number>> {
  const out: Partial<Record<StarItemId, number>> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const id of Object.keys(STAR_ITEMS) as StarItemId[]) {
    const n = Math.max(0, Math.floor(Number((raw as Record<string, unknown>)[id]) || 0))
    if (n > 0) out[id] = n
  }
  return out
}

const VALUABLE_KINDS: readonly ValuableKind[] = ['watch', 'jewel', 'art', 'relic', 'crown']

function readValuables(raw: unknown): Valuable[] {
  if (!Array.isArray(raw)) return []
  const out: Valuable[] = []
  for (const v of raw) {
    if (!v || typeof v !== 'object') continue
    const r = v as Record<string, unknown>
    const kind = VALUABLE_KINDS.find((k) => k === r.kind)
    const value = Math.max(0, Math.floor(Number(r.value) || 0))
    if (typeof r.id !== 'string' || !kind || value <= 0) continue
    out.push({ id: r.id, kind, value, level: typeof r.level === 'string' ? r.level : '' })
  }
  return out
}

function readWorld(raw: unknown): WorldProgress | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const w = raw as Partial<Record<keyof WorldProgress, unknown>>
  return {
    lootTaken: readIdList(w.lootTaken),
    openedSafes: readIdList(w.openedSafes),
    openedDoors: readIdList(w.openedDoors),
    depth: Math.max(0, Math.floor(Number(w.depth) || 0)),
    reachedFinal: Boolean(w.reachedFinal),
    complete: Boolean(w.complete),
  }
}

function readWorlds(raw: unknown): Partial<Record<WorldId, WorldProgress>> {
  const out: Partial<Record<WorldId, WorldProgress>> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const id of WORLD_IDS) {
    const w = readWorld((raw as Record<string, unknown>)[id])
    if (w) out[id] = w
  }
  return out
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
      dashLevel: clampLevel(parsed.dashLevel),
      magnetLevel: clampLevel(parsed.magnetLevel),
      lockpickLevel: clampLevel(parsed.lockpickLevel),
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
      worlds: readWorlds((parsed as { worlds?: unknown }).worlds),
      starItems: readStarItems((parsed as { starItems?: unknown }).starItems),
      valuables: readValuables((parsed as { valuables?: unknown }).valuables),
      nftCtaAt: Math.max(0, Number((parsed as { nftCtaAt?: unknown }).nftCtaAt) || 0),
      onboardingSeen: Boolean((parsed as { onboardingSeen?: unknown }).onboardingSeen),
      myGoalId: readGoal((parsed as { myGoalId?: unknown }).myGoalId),
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
    !progress.mansionComplete &&
    WORLD_IDS.every((id) => {
      const w = progress.worlds?.[id]
      return !w || (w.lootTaken.length === 0 && w.openedSafes.length === 0 && w.openedDoors.length === 0 && w.depth === 0 && !w.complete)
    })
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

/** Same rules as the BANK/MANSION saves: ids and depth only grow, completion never resets. */
export function persistWorld(
  id: WorldId,
  patch: {
    lootTaken?: readonly string[]
    openedSafes?: readonly string[]
    openedDoors?: readonly string[]
    depth?: number
    reachedFinal?: boolean
    complete?: boolean
  },
) {
  const live = loadProgress()
  const cur = live.worlds?.[id] ?? { lootTaken: [], openedSafes: [], openedDoors: [], depth: 0, reachedFinal: false, complete: false }
  const next: PlayerProgress = {
    ...live,
    ...keepWallet(live),
    worlds: {
      ...live.worlds,
      [id]: {
        lootTaken: mergeIds(cur.lootTaken, patch.lootTaken),
        openedSafes: mergeIds(cur.openedSafes, patch.openedSafes),
        openedDoors: mergeIds(cur.openedDoors, patch.openedDoors),
        depth: Math.max(cur.depth, Math.max(0, Math.floor(patch.depth ?? 0))),
        reachedFinal: Boolean(cur.reachedFinal || patch.reachedFinal),
        complete: Boolean(cur.complete || patch.complete),
      },
    },
  }
  saveProgress(next)
  return next
}

export function isMansionUnlocked(progress: PlayerProgress) {
  return Boolean(progress.bankComplete)
}

/** BANK is always open; every later level opens when the one before it is complete. */
export function isLevelComplete(progress: PlayerProgress, id: 'bank' | 'mansion' | WorldId) {
  if (id === 'bank') return Boolean(progress.bankComplete)
  if (id === 'mansion') return Boolean(progress.mansionComplete)
  return Boolean(progress.worlds?.[id]?.complete)
}

const PREVIOUS: Record<WorldId, 'mansion' | WorldId> = {
  level3: 'mansion',
  level4: 'level3',
  level5: 'level4',
  level6: 'level5',
  level7: 'level6',
  level8: 'level7',
}

export function isLevelUnlocked(progress: PlayerProgress, id: 'bank' | 'mansion' | WorldId) {
  if (id === 'bank') return true
  if (id === 'mansion') return isMansionUnlocked(progress)
  return isLevelComplete(progress, PREVIOUS[id])
}

export function bagCap(progress: PlayerProgress) {
  return BAG_CAPS[clampLevel(progress.bagLevel)] ?? BAG_BASIC
}

export function labPrices(stat: LabStat, currency: Currency = 'stars'): readonly number[] {
  return currency === 'coin' ? UPGRADES[stat].coin : UPGRADES[stat].stars
}

export type Currency = 'stars' | 'coin'

export function labNextPrice(progress: PlayerProgress, stat: LabStat, currency: Currency = 'stars') {
  const level = clampLevel(progress[stat])
  const prices = labPrices(stat, currency)
  if (level >= prices.length) return null
  return prices[level]
}

/**
 * Gear upgrade with ⭐ Stars (fast) or DUCK COIN (the long way). The two
 * balances never mix: a Stars purchase never touches DUCK COIN and vice versa.
 */
export function buyLabUpgrade(_progress: PlayerProgress, stat: LabStat, currency: Currency = 'stars') {
  const live = loadProgress()
  const price = labNextPrice(live, stat, currency)
  if (price == null) return { ok: false as const, reason: 'max' as const, next: live, price: 0 }
  const stars = Math.max(0, Math.floor(live.stars || 0))
  if (currency === 'stars' ? stars < price : live.bankedDuckCoin < price) return { ok: false as const, reason: 'poor' as const, next: live, price }
  const next: PlayerProgress = {
    ...live,
    ...keepWallet(live),
    stars: currency === 'stars' ? stars - price : stars,
    bankedDuckCoin: currency === 'coin' ? live.bankedDuckCoin - price : live.bankedDuckCoin,
    [stat]: clampLevel(live[stat] + 1),
  }
  saveProgress(next)
  return { ok: true as const, reason: 'ok' as const, next, price }
}

/** Buy one ⭐ item (pass, boost, continue). Stars only. */
export function buyStarItem(id: StarItemId) {
  const live = loadProgress()
  const price = STAR_ITEMS[id].stars
  const stars = Math.max(0, Math.floor(live.stars || 0))
  if (stars < price) return { ok: false as const, reason: 'poor' as const, next: live, price }
  const next: PlayerProgress = {
    ...live,
    ...keepWallet(live),
    stars: stars - price,
    starItems: { ...live.starItems, [id]: (live.starItems?.[id] ?? 0) + 1 },
  }
  saveProgress(next)
  return { ok: true as const, reason: 'ok' as const, next, price }
}

/** Use up one owned ⭐ item. Returns false when none is owned. */
export function consumeStarItem(id: StarItemId) {
  const live = loadProgress()
  const have = live.starItems?.[id] ?? 0
  if (have <= 0) return false
  saveProgress({ ...live, ...keepWallet(live), starItems: { ...live.starItems, [id]: have - 1 } })
  return true
}

/** Special loot carried out through EXIT goes to the fence inventory. */
export function bankValuables(list: readonly Valuable[]) {
  const live = loadProgress()
  if (list.length === 0) return live
  const have = new Set(live.valuables.map((v) => v.id))
  const next: PlayerProgress = { ...live, ...keepWallet(live), valuables: [...live.valuables, ...list.filter((v) => !have.has(v.id))] }
  saveProgress(next)
  return next
}

/** Sell one special loot item to the Black Market fence for DUCK COIN. */
export function sellValuable(id: string) {
  const live = loadProgress()
  const item = live.valuables.find((v) => v.id === id)
  if (!item) return { ok: false as const, next: live, coins: 0 }
  const coins = Math.floor(item.value * FENCE_RATE)
  const next: PlayerProgress = {
    ...live,
    ...keepWallet(live),
    bankedDuckCoin: live.bankedDuckCoin + coins,
    valuables: live.valuables.filter((v) => v.id !== id),
  }
  saveProgress(next)
  return { ok: true as const, next, coins }
}

export function markNftCta(now = Date.now()) {
  const live = loadProgress()
  saveProgress({ ...live, ...keepWallet(live), nftCtaAt: now })
}

export function markOnboardingSeen() {
  const live = loadProgress()
  saveProgress({ ...live, ...keepWallet(live), onboardingSeen: true })
}

/**
 * Raid modifiers from gear, plus the one-raid boosts the player owns (each
 * owned boost is used up when `consume` is true, i.e. when a raid starts).
 */
export function runMods(progress: PlayerProgress, consume = false): HeistRunMods {
  const bag = clampLevel(progress.bagLevel)
  const disguise = clampLevel(progress.disguiseLevel)
  const shoes = clampLevel(progress.shoesLevel)
  const dash = clampLevel(progress.dashLevel)
  const lock = clampLevel(progress.lockpickLevel)
  const magnet = clampLevel(progress.magnetLevel)
  const E = UPGRADE_EFFECTS
  const items = progress.starItems ?? {}
  const boosts: StarItemId[] = []
  let speedMul: number = E.shoesSpeedMul[shoes] ?? 1
  let disguiseMul: number = E.disguiseMul[disguise] ?? 1
  let bagCap: number = E.bagCap[bag] ?? BAG_BASIC
  let noiseMul: number = E.shoesNoiseMul[shoes] ?? 1
  if ((items.boostSpeed ?? 0) > 0) {
    speedMul *= BOOSTS.boostSpeed.speedMul
    boosts.push('boostSpeed')
  }
  if ((items.boostStealth ?? 0) > 0) {
    disguiseMul *= BOOSTS.boostStealth.disguiseMul
    boosts.push('boostStealth')
  }
  if ((items.boostBag ?? 0) > 0) {
    bagCap = Math.round(bagCap * BOOSTS.boostBag.bagMul)
    boosts.push('boostBag')
  }
  if ((items.boostSilent ?? 0) > 0) {
    noiseMul *= BOOSTS.boostSilent.noiseMul
    boosts.push('boostSilent')
  }
  if (consume) for (const b of boosts) consumeStarItem(b)
  return {
    bagCap,
    bagLevel: bag,
    disguiseMul,
    // Shoes quiet the step on every tier through noiseMul; the old tier-1-only flag stays off.
    silentShoes: false,
    speedMul,
    noiseMul,
    dashCdMul: E.dashCdMul[dash] ?? 1,
    dashMul: E.dashMul[dash] ?? 1,
    lockWidthMul: E.lockWidthMul[lock] ?? 1,
    pickupBonus: E.magnetPx[magnet] ?? 0,
    passes: { elevator: (items.elevatorPass ?? 0) > 0, escalator: (items.escalatorPass ?? 0) > 0, continues: items.continueRaid ?? 0 },
    boosts,
  }
}

export { CONTINUE_KEEP }

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

export function buyCatalogItem(_progress: PlayerProgress, itemId: string) {
  const live = loadProgress()
  const item = catalogItem(itemId)
  if (!item) return { ok: false as const, reason: 'missing' as const, next: live, goalReached: false }
  if (live.bankedDuckCoin < item.purchasePrice) return { ok: false as const, reason: 'poor' as const, next: live, goalReached: false }
  // Buying the goal completes it: the player then picks a new one themselves.
  const goalReached = live.myGoalId === itemId
  const next: PlayerProgress = {
    ...live,
    ...keepWallet(live),
    bankedDuckCoin: live.bankedDuckCoin - item.purchasePrice,
    ownedArt: addToCollection(live.ownedArt ?? {}, itemId),
    ownedMeta: { ...(live.ownedMeta ?? {}), [itemId]: { acquiredAt: Date.now() } },
    myGoalId: goalReached ? null : live.myGoalId,
  }
  saveProgress(next)
  return { ok: true as const, reason: 'ok' as const, next, goalReached }
}

/** 🎯 The player — never the game — picks the goal. Replacing it costs nothing. */
export function setMyGoal(itemId: string | null) {
  const live = loadProgress()
  const id = itemId && catalogItem(itemId)?.market !== false ? itemId : null
  const next: PlayerProgress = { ...live, ...keepWallet(live), myGoalId: id }
  saveProgress(next)
  return next
}

/** Progress towards the chosen goal (null when none is chosen). */
export function goalProgress(p: PlayerProgress) {
  const item = p.myGoalId ? catalogItem(p.myGoalId) : null
  if (!item) return null
  const have = Math.max(0, p.bankedDuckCoin)
  const price = item.purchasePrice
  return { item, have, price, left: Math.max(0, price - have), pct: Math.min(100, Math.floor((have / price) * 100)), reached: have >= price }
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
