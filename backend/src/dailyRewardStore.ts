import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'
import { enqueueDataOp, writeJsonAtomic } from './dataQueue.js'

/**
 * 🎁 Daily reward: +150 DUCK COIN at most once per 24 h per verified Telegram player.
 * The server is the only judge: it keeps lastDailyRewardAt per Telegram id on the data volume
 * and every claim runs through the shared data queue (one at a time), so two simultaneous
 * requests can never both pass the 24 h check. The client credits its wallet only for a claim
 * id the server granted, once (see frontend heist/dailyReward.ts).
 *
 * A claim carries a client nonce: if the response was lost, the same device retrying with the
 * same nonce gets the same grant back (replay) instead of a refusal — and never a second grant.
 */
export const DAILY_REWARD = 150
export const DAILY_REWARD_MS = 24 * 60 * 60_000

export type DailyUser = {
  telegramId: number
  /** ms of the last granted claim (lastDailyRewardAt) */
  lastDailyRewardAt: number
  lastClaimId: string
  lastNonce: string
  claims: number
  totalCoins: number
  /** lastDailyRewardAt of the window already reported as "available" (0 = before the first claim) */
  availableNotedFor?: number
}

type Store = { users: Record<string, DailyUser> }

const DIR = join(DATA_DIR, 'daily')
const FILE = join(DIR, 'rewards.json')

function read(): Store {
  try {
    if (!existsSync(FILE)) return { users: {} }
    const s = JSON.parse(readFileSync(FILE, 'utf8')) as Store
    return { users: s.users ?? {} }
  } catch (err) {
    // Never start from empty over a broken file: that would hand out rewards again.
    console.error('[daily] rewards.json unreadable', err)
    throw new Error('daily_store_unreadable')
  }
}

function write(s: Store) {
  mkdirSync(DIR, { recursive: true })
  writeJsonAtomic(FILE, s)
}

export const isNonce = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(v)

export type DailyView = {
  amount: number
  available: boolean
  /** when the next claim opens (ms); null while available */
  nextAt: number | null
  lastClaimAt: number | null
}

function view(u: DailyUser | undefined, now: number): DailyView {
  const last = u?.lastDailyRewardAt ?? 0
  const available = !u || now - last >= DAILY_REWARD_MS
  return { amount: DAILY_REWARD, available, nextAt: available ? null : last + DAILY_REWARD_MS, lastClaimAt: u ? last : null }
}

/**
 * Status for the hub. `firstAvailable` is true once per availability window, so the caller can
 * log daily_reward_available without duplicates across reloads and devices.
 */
export function dailyStatus(telegramId: number, now = Date.now()) {
  return enqueueDataOp('daily:status', undefined, () => {
    const s = read()
    const key = String(telegramId)
    const u = s.users[key]
    const v = view(u, now)
    let firstAvailable = false
    if (v.available) {
      const windowKey = u?.lastDailyRewardAt ?? 0
      if (u?.availableNotedFor !== windowKey) {
        firstAvailable = true
        // A player who never claimed gets a stub row only to remember that this window was reported.
        s.users[key] = u
          ? { ...u, availableNotedFor: windowKey }
          : { telegramId, lastDailyRewardAt: 0, lastClaimId: '', lastNonce: '', claims: 0, totalCoins: 0, availableNotedFor: 0 }
        write(s)
      }
    }
    return { ...v, firstAvailable }
  })
}

export type ClaimResult =
  | { granted: true; replay: boolean; claimId: string; amount: number; claimedAt: number; nextAt: number }
  | { granted: false; amount: number; nextAt: number }

/** Grant +150 if 24 h passed since lastDailyRewardAt. Serialised: check and update are one step. */
export function claimDaily(telegramId: number, nonce: string, now = Date.now()) {
  return enqueueDataOp('daily:claim', undefined, (): ClaimResult => {
    const s = read()
    const key = String(telegramId)
    const u = s.users[key]
    const last = u?.lastDailyRewardAt ?? 0
    // The same device retrying a claim whose answer it never got: hand back that same grant.
    if (u && u.lastClaimId && u.lastNonce === nonce && now - last < DAILY_REWARD_MS) {
      return { granted: true, replay: true, claimId: u.lastClaimId, amount: DAILY_REWARD, claimedAt: last, nextAt: last + DAILY_REWARD_MS }
    }
    if (u && u.lastClaimId && now - last < DAILY_REWARD_MS) return { granted: false, amount: DAILY_REWARD, nextAt: last + DAILY_REWARD_MS }
    const claimId = randomBytes(9).toString('hex')
    s.users[key] = {
      telegramId,
      lastDailyRewardAt: now,
      lastClaimId: claimId,
      lastNonce: nonce,
      claims: (u?.claims ?? 0) + 1,
      totalCoins: (u?.totalCoins ?? 0) + DAILY_REWARD,
      availableNotedFor: u?.availableNotedFor,
    }
    write(s)
    return { granted: true, replay: false, claimId, amount: DAILY_REWARD, claimedAt: now, nextAt: now + DAILY_REWARD_MS }
  })
}
