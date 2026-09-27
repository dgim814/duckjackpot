import { createHmac, randomBytes } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'
import { enqueueDataOp, writeJsonAtomic } from './dataQueue.js'

/**
 * Retention state on the data volume (DATA_DIR/retention/state.json): players the server has
 * seen (verified Telegram ids only), referrals, reward grants, notification bookkeeping and the
 * server-side thief ranking. Every write goes through the shared data queue, so a check and its
 * update are one step — two simultaneous requests can never both pass a "only once" check.
 * Reward transactions are also appended to DATA_DIR/retention/rewards.ndjson.
 */
const DIR = join(DATA_DIR, 'retention')
const FILE = join(DIR, 'state.json')
const LEDGER = join(DIR, 'rewards.ndjson')

export const INVITEE_COINS = Math.max(0, Math.floor(Number(process.env.REFERRAL_INVITEE_COINS ?? 150) || 0))
export const INVITER_COINS = Math.max(0, Math.floor(Number(process.env.REFERRAL_INVITER_COINS ?? 300) || 0))
/** Most DUCK COIN one raid can really bank (bag 1000 + 10 % clean bonus + objectives), with margin. */
export const RAID_LOOT_CAP = 1300
/** A raid shorter than this is not a real raid (the first BANK zone alone takes longer). */
export const MIN_RAID_MS = 15_000
/** Escapes per day that may count toward the ranking. */
const DAILY_ESCAPE_CAP = 80

export type NotifState = {
  lastRetentionAt?: number
  /** lastDailyRewardAt of the cycle already reminded */
  dailyCycle?: number
  raidReturnAt?: number
  overtakenAt?: number
  leaderAt?: number
  inviteNudgeAt?: number
  lastRank?: number
  sent?: number
}

export type Player = {
  id: number
  name?: string
  username?: string
  lang?: 'ru' | 'en'
  firstSeenAt: number
  lastSeenAt: number
  /** signed allows_write_to_pm, or an explicit grant from requestWriteAccess */
  canWrite: boolean
  /** Telegram answered 403 to a message: never retried until the player opens the app again */
  writeBlocked?: boolean
  muted?: boolean
  raids: number
  escapes: number
  lastRaidAt?: number
  openRaid?: { id: string; startedAt: number; level: string }
  /** DUCK COIN from validated raid escapes (the ranking's raid part) */
  raidCoins: number
  escapeDay?: string
  escapeDayCount?: number
  refCode: string
  notif: NotifState
}

export type InviteStatus = 'opened' | 'verified' | 'played' | 'exited' | 'rewarded'

export type Invite = {
  inviteeId: number
  inviterId: number
  inviteeName?: string
  inviteeUsername?: string
  openedAt: number
  via: 'startapp' | 'start'
  channelVerifiedAt?: number
  firstRaidAt?: number
  firstExitAt?: number
  completedAt?: number
  inviteeGrantId?: string
  inviterGrantId?: string
}

export type Grant = {
  id: string
  telegramId: number
  coins: number
  reason: 'referral_invitee' | 'referral_inviter'
  inviteeId: number
  createdAt: number
  claimedAt?: number
  nonce?: string
}

type State = {
  v: 1
  players: Record<string, Player>
  invites: Record<string, Invite>
  /** referral attempts that were refused (self, not new, …) — kept so they can never be retried */
  refused: Record<string, { inviterId: number; at: number; reason: string }>
  grants: Record<string, Grant>
  codes: Record<string, number>
  linkCreated: Record<string, number>
  backfilledAt?: number
}

function empty(): State {
  return { v: 1, players: {}, invites: {}, refused: {}, grants: {}, codes: {}, linkCreated: {} }
}

function read(): State {
  try {
    if (!existsSync(FILE)) return empty()
    const s = JSON.parse(readFileSync(FILE, 'utf8')) as Partial<State>
    return { ...empty(), ...s, v: 1 } as State
  } catch (err) {
    // Never start over a broken file: referral rewards depend on it.
    console.error('[retention] state.json unreadable', err)
    throw new Error('retention_store_unreadable')
  }
}

function write(s: State) {
  mkdirSync(DIR, { recursive: true })
  writeJsonAtomic(FILE, s)
}

export function logReward(row: Record<string, unknown>) {
  try {
    mkdirSync(DIR, { recursive: true })
    appendFileSync(LEDGER, JSON.stringify({ t: Date.now(), ...row }) + '\n')
  } catch (err) {
    console.error('[retention] ledger write failed', err)
  }
}

/** Opaque, stable invite code for a Telegram id (the link never exposes the id itself). */
function codeFor(id: number) {
  const secret = process.env.REFERRAL_SECRET || process.env.TELEGRAM_BOT_TOKEN || 'duckjackpot'
  return createHmac('sha256', secret).update(`ref:${id}`).digest('base64url').replace(/[^A-Za-z0-9]/g, '').slice(0, 10)
}

function newPlayer(id: number, now: number): Player {
  return { id, firstSeenAt: now, lastSeenAt: now, canWrite: false, raids: 0, escapes: 0, raidCoins: 0, refCode: codeFor(id), notif: {} }
}

function ensure(s: State, id: number, now: number) {
  const key = String(id)
  let p = s.players[key]
  if (!p) {
    p = newPlayer(id, now)
    s.players[key] = p
  }
  if (!p.refCode) p.refCode = codeFor(id)
  if (!p.notif) p.notif = {}
  s.codes[p.refCode] = id
  return p
}

const dayOf = (t: number) => new Date(t).toISOString().slice(0, 10)

// ---------- backfill: everyone the server already knew before this feature is an old player ----------

/**
 * One time: players known from analytics (verified tg ids), daily rewards and Stars orders become
 * "old" players; validated historical escapes seed the ranking.
 */
export function backfillOnce(extra: { dailyIds: number[]; starsIds: number[] }) {
  return enqueueDataOp('retention:backfill', undefined, () => {
    const s = read()
    if (s.backfilledAt) return { done: false, players: Object.keys(s.players).length }
    const now = Date.now()
    const dir = join(DATA_DIR, 'analytics')
    const seen = new Map<number, number>()
    const coins = new Map<number, number>()
    const escapes = new Map<number, number>()
    if (existsSync(dir)) {
      for (const f of readdirSync(dir).sort()) {
        if (!/^events-\d{4}-\d{2}-\d{2}\.ndjson$/.test(f)) continue
        for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) {
          if (!line) continue
          try {
            const e = JSON.parse(line) as { t: number; e: string; u: string; p?: Record<string, unknown> }
            const m = /^tg:(\d+)$/.exec(e.u)
            if (!m) continue
            const id = Number(m[1])
            if (!seen.has(id) || e.t < seen.get(id)!) seen.set(id, e.t)
            if (e.e === 'raid_exit' && e.p?.exitResult === 'escaped') {
              const loot = Math.floor(Number(e.p?.duckCoinLoot ?? 0))
              if (loot > 0 && loot <= RAID_LOOT_CAP) coins.set(id, (coins.get(id) ?? 0) + loot)
              escapes.set(id, (escapes.get(id) ?? 0) + 1)
            }
          } catch {
            /* torn line */
          }
        }
      }
    }
    for (const id of [...extra.dailyIds, ...extra.starsIds]) if (!seen.has(id)) seen.set(id, now)
    for (const [id, at] of seen) {
      const p = ensure(s, id, at)
      p.firstSeenAt = Math.min(p.firstSeenAt, at)
      p.raidCoins = Math.max(p.raidCoins, coins.get(id) ?? 0)
      p.escapes = Math.max(p.escapes, escapes.get(id) ?? 0)
    }
    s.backfilledAt = now
    write(s)
    return { done: true, players: Object.keys(s.players).length }
  })
}

// ---------- session ----------

export type SessionInput = {
  id: number
  name?: string
  username?: string
  allowsWriteToPm?: boolean
  lang?: string
  /** a verified referral code from the signed start_param or a /start payload */
  refCode?: string
  via?: 'startapp' | 'start'
  /** client hint: no escape yet and nothing banked (required in addition to the server check) */
  novice?: boolean
}

export type ReferralOutcome =
  | { kind: 'none' }
  | { kind: 'opened'; inviterId: number }
  | { kind: 'refused'; reason: 'self' | 'not_new' | 'unknown_code' | 'already_invited' | 'not_novice' }

/**
 * A verified player opened the app (or /start). Records them and, the first time only, the
 * invite that brought them. A referrer is fixed forever once set; nothing here grants a reward.
 */
export function touchSession(input: SessionInput, now = Date.now()) {
  return enqueueDataOp('retention:session', undefined, () => {
    const s = read()
    const key = String(input.id)
    const known = s.players[key]
    let referral: ReferralOutcome = { kind: 'none' }
    if (input.refCode) {
      const inviterId = s.codes[input.refCode]
      const existing = s.invites[key]
      if (existing) referral = existing.inviterId === inviterId ? { kind: 'opened', inviterId } : { kind: 'refused', reason: 'already_invited' }
      else if (s.refused[key]) referral = { kind: 'refused', reason: 'already_invited' }
      else if (!inviterId) referral = { kind: 'refused', reason: 'unknown_code' }
      else if (inviterId === input.id) referral = { kind: 'refused', reason: 'self' }
      // New = the server never saw this Telegram id play (backfilled history included) …
      else if (known && (known.raids > 0 || known.escapes > 0 || now - known.firstSeenAt > 10 * 60_000)) referral = { kind: 'refused', reason: 'not_new' }
      // … and the device agrees it is a fresh game.
      else if (input.novice === false) referral = { kind: 'refused', reason: 'not_novice' }
      else {
        s.invites[key] = { inviteeId: input.id, inviterId, inviteeName: input.name, inviteeUsername: input.username, openedAt: now, via: input.via ?? 'startapp' }
        referral = { kind: 'opened', inviterId }
      }
      if (referral.kind === 'refused' && referral.reason !== 'already_invited' && !s.refused[key] && !existing) {
        s.refused[key] = { inviterId: inviterId ?? 0, at: now, reason: referral.reason }
      }
    }
    const p = ensure(s, input.id, now)
    p.lastSeenAt = now
    if (input.name) p.name = input.name.slice(0, 64)
    if (input.username) p.username = input.username.slice(0, 64)
    if (input.lang) p.lang = /^ru|^uk|^be|^kk/i.test(input.lang) ? 'ru' : 'en'
    if (input.allowsWriteToPm) p.canWrite = true
    // Opening the app again after a 403 means the chat may work again: try once more later.
    if (input.allowsWriteToPm) p.writeBlocked = false
    write(s)
    const inv = s.invites[key]
    return { referral, isNewRecord: !known, player: p, invite: inv ?? null, freshInvite: Boolean(inv && inv.openedAt === now) }
  })
}

export function setWriteAccess(id: number, granted: boolean) {
  return enqueueDataOp('retention:write', undefined, () => {
    const s = read()
    const p = ensure(s, id, Date.now())
    if (granted) {
      p.canWrite = true
      p.writeBlocked = false
    }
    write(s)
    return p.canWrite
  })
}

export function setMuted(id: number, muted: boolean) {
  return enqueueDataOp('retention:mute', undefined, () => {
    const s = read()
    const p = ensure(s, id, Date.now())
    p.muted = muted
    write(s)
    return p.muted
  })
}

// ---------- referral progress ----------

export function markChannelVerified(id: number, now = Date.now()) {
  return enqueueDataOp('retention:channel', undefined, () => {
    const s = read()
    const inv = s.invites[String(id)]
    let first = false
    if (inv && !inv.channelVerifiedAt) {
      inv.channelVerifiedAt = now
      first = true
    }
    const completed = inv ? completeIfReady(s, inv, now) : null
    write(s)
    return { invite: inv ?? null, first, completed }
  })
}

/** Both conditions met (channel verified + a real first EXIT): create the two grants once. */
function completeIfReady(s: State, inv: Invite, now: number) {
  if (inv.completedAt || !inv.channelVerifiedAt || !inv.firstExitAt) return null
  inv.completedAt = now
  const mk = (telegramId: number, coins: number, reason: Grant['reason']): Grant => ({
    id: randomBytes(9).toString('hex'),
    telegramId,
    coins,
    reason,
    inviteeId: inv.inviteeId,
    createdAt: now,
  })
  const a = mk(inv.inviteeId, INVITEE_COINS, 'referral_invitee')
  const b = mk(inv.inviterId, INVITER_COINS, 'referral_inviter')
  s.grants[a.id] = a
  s.grants[b.id] = b
  inv.inviteeGrantId = a.id
  inv.inviterGrantId = b.id
  logReward({ kind: 'grant_created', grant: a.id, to: a.telegramId, coins: a.coins, reason: a.reason, invitee: inv.inviteeId })
  logReward({ kind: 'grant_created', grant: b.id, to: b.telegramId, coins: b.coins, reason: b.reason, invitee: inv.inviteeId })
  return { invitee: a, inviter: b }
}

export type RaidReport =
  | { event: 'start'; raidId: string; level: string; preview?: boolean }
  | { event: 'end'; raidId: string; verdict: 'escaped' | 'caught' | 'aborted'; loot: number; preview?: boolean }

export const isRaidId = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9]{6,24}$/.test(v)

/**
 * Raid start / end from the verified player. The game itself runs on the device, so the server
 * checks what it can: the end must close the raid this player started, it must have lasted a real
 * raid, loot above what one raid can carry is not counted, and escapes per day are capped.
 */
export function reportRaid(id: number, r: RaidReport, now = Date.now()) {
  return enqueueDataOp('retention:raid', undefined, () => {
    const s = read()
    const p = ensure(s, id, now)
    p.lastSeenAt = now
    const inv = s.invites[String(id)]
    let firstRaid = false
    let firstExit = false
    let counted = 0
    let completed: ReturnType<typeof completeIfReady> = null
    let rejected: string | null = null
    if (r.preview) rejected = 'preview'
    else if (r.event === 'start') {
      if (p.lastRaidAt && now - p.lastRaidAt < 3000) rejected = 'too_fast'
      else {
        p.openRaid = { id: r.raidId, startedAt: now, level: r.level.slice(0, 16) }
        p.raids += 1
        p.lastRaidAt = now
        if (inv && !inv.firstRaidAt) {
          inv.firstRaidAt = now
          firstRaid = true
        }
      }
    } else {
      const open = p.openRaid
      if (!open || open.id !== r.raidId) rejected = 'unknown_raid'
      else {
        p.openRaid = undefined
        const long = now - open.startedAt >= MIN_RAID_MS
        if (r.verdict === 'escaped' && !long) rejected = 'too_short'
        else if (r.verdict === 'escaped') {
          p.escapes += 1
          const day = dayOf(now)
          if (p.escapeDay !== day) {
            p.escapeDay = day
            p.escapeDayCount = 0
          }
          p.escapeDayCount = (p.escapeDayCount ?? 0) + 1
          const loot = Math.floor(Number(r.loot) || 0)
          if (loot > RAID_LOOT_CAP) rejected = 'loot_over_cap'
          else if ((p.escapeDayCount ?? 0) <= DAILY_ESCAPE_CAP && loot > 0) {
            p.raidCoins += loot
            counted = loot
          }
          if (inv && !inv.firstExitAt && inv.firstRaidAt) {
            inv.firstExitAt = now
            firstExit = true
            completed = completeIfReady(s, inv, now)
          }
        }
      }
    }
    write(s)
    return { firstRaid, firstExit, counted, rejected, completed, invite: inv ?? null }
  })
}

// ---------- grants (the DUCK COIN part of referral rewards) ----------

export type GrantView = { id: string; coins: number; reason: Grant['reason'] }

export function pendingGrants(id: number): GrantView[] {
  const s = read()
  return Object.values(s.grants)
    .filter((g) => g.telegramId === id && !g.claimedAt)
    .map((g) => ({ id: g.id, coins: g.coins, reason: g.reason }))
}

/**
 * Claim a grant once. The first nonce wins; the same nonce replays the same grant (a lost answer
 * is retry-safe); any other nonce after that gets "already claimed".
 */
export function claimGrant(id: number, grantId: string, nonce: string, now = Date.now()) {
  return enqueueDataOp('retention:claim', undefined, () => {
    const s = read()
    const g = s.grants[grantId]
    if (!g || g.telegramId !== id) return { ok: false as const, error: 'not_found' as const }
    if (g.claimedAt) {
      if (g.nonce === nonce) return { ok: true as const, replay: true, grant: { id: g.id, coins: g.coins, reason: g.reason } }
      return { ok: false as const, error: 'already_claimed' as const }
    }
    g.claimedAt = now
    g.nonce = nonce
    write(s)
    logReward({ kind: 'grant_claimed', grant: g.id, to: g.telegramId, coins: g.coins, reason: g.reason })
    return { ok: true as const, replay: false, grant: { id: g.id, coins: g.coins, reason: g.reason } }
  })
}

// ---------- views ----------

export function playerOf(id: number) {
  return read().players[String(id)] ?? null
}

export function refCodeOf(id: number) {
  return enqueueDataOp('retention:code', undefined, () => {
    const s = read()
    const p = ensure(s, id, Date.now())
    const first = !s.linkCreated[String(id)]
    if (first) s.linkCreated[String(id)] = Date.now()
    write(s)
    return { code: p.refCode, first }
  })
}

export function inviteOf(id: number) {
  return read().invites[String(id)] ?? null
}

export function inviteStatus(inv: Invite): InviteStatus {
  if (inv.completedAt) return 'rewarded'
  if (inv.firstExitAt) return 'exited'
  if (inv.firstRaidAt) return 'played'
  if (inv.channelVerifiedAt) return 'verified'
  return 'opened'
}

export function invitesBy(inviterId: number) {
  const s = read()
  const list = Object.values(s.invites).filter((i) => i.inviterId === inviterId)
  const grants = list.map((i) => (i.inviterGrantId ? s.grants[i.inviterGrantId] : undefined))
  return {
    list: list.sort((a, b) => b.openedAt - a.openedAt),
    rewardedCoins: grants.reduce((a, g) => a + (g?.claimedAt ? g.coins : 0), 0),
    pendingCoins:
      grants.reduce((a, g) => a + (g && !g.claimedAt ? g.coins : 0), 0) + list.filter((i) => !i.completedAt).length * INVITER_COINS,
  }
}

/** Claimed referral DUCK COIN per player (part of the ranking: coins the server itself granted). */
function grantCoins(s: State) {
  const out = new Map<number, number>()
  for (const g of Object.values(s.grants)) if (g.claimedAt) out.set(g.telegramId, (out.get(g.telegramId) ?? 0) + g.coins)
  return out
}

export type BoardRow = { id: number; name: string; wealth: number; rank: number }

/**
 * Server ranking. TOTAL WEALTH = DUCK COIN the server itself can account for: validated raid
 * escapes + daily rewards it granted + referral rewards it granted. A wealth number sent by the
 * device is never used.
 */
export function leaderboard(dailyCoins: Map<number, number>): BoardRow[] {
  const s = read()
  const extra = grantCoins(s)
  const rows = Object.values(s.players)
    .map((p) => ({ id: p.id, name: publicName(p), wealth: p.raidCoins + (dailyCoins.get(p.id) ?? 0) + (extra.get(p.id) ?? 0) }))
    .filter((r) => r.wealth > 0)
    .sort((a, b) => b.wealth - a.wealth || a.id - b.id)
  return rows.map((r, i) => ({ ...r, rank: i + 1 }))
}

function publicName(p: Player) {
  const n = (p.name || '').trim()
  if (n) return n.length > 14 ? `${n.slice(0, 13)}…` : n
  return `Thief #${String(p.id).slice(-4)}`
}

export function allState() {
  return read()
}

/** Update notification bookkeeping for one player (inside the queue). */
export function updateNotif(id: number, patch: (n: NotifState, p: Player) => void) {
  return enqueueDataOp('retention:notif', undefined, () => {
    const s = read()
    const p = s.players[String(id)]
    if (!p) return null
    patch(p.notif, p)
    write(s)
    return p.notif
  })
}

export function markWriteBlocked(id: number) {
  return enqueueDataOp('retention:blocked', undefined, () => {
    const s = read()
    const p = s.players[String(id)]
    if (p) {
      p.writeBlocked = true
      write(s)
    }
  })
}

const pctOf = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0)

/** Admin: the referral funnel from the store (source of truth), for invites opened since `from`. */
export function referralSummary(from: number, linksCreated: number) {
  const s = read()
  const inv = Object.values(s.invites).filter((i) => i.openedAt >= from)
  const refused = Object.values(s.refused).filter((r) => r.at >= from)
  const verified = inv.filter((i) => i.channelVerifiedAt).length
  const played = inv.filter((i) => i.firstRaidAt).length
  const exited = inv.filter((i) => i.firstExitAt).length
  const done = inv.filter((i) => i.completedAt).length
  const grants = Object.values(s.grants).filter((g) => g.createdAt >= from)
  const issued = grants.filter((g) => g.claimedAt)
  return {
    linksCreated,
    opened: inv.length + refused.length,
    registered: inv.length,
    refused: refused.reduce<Record<string, number>>((a, r) => ((a[r.reason] = (a[r.reason] ?? 0) + 1), a), {}),
    channelVerified: verified,
    firstRaid: played,
    firstExit: exited,
    successful: done,
    rewardsIssued: issued.length,
    rewardsPending: grants.length - issued.length,
    rewardsFailed: 0,
    coinsIssued: issued.reduce((a, g) => a + g.coins, 0),
    coinsPending: grants.filter((g) => !g.claimedAt).reduce((a, g) => a + g.coins, 0),
    /** real Telegram Stars cannot be credited to users through the Bot API (see report) */
    starsIssued: 0,
    conversion: {
      openedToRegistered: pctOf(inv.length, inv.length + refused.length),
      registeredToVerified: pctOf(verified, inv.length),
      verifiedToFirstRaid: pctOf(inv.filter((i) => i.channelVerifiedAt && i.firstRaidAt).length, verified),
      firstRaidToFirstExit: pctOf(exited, played),
      firstExitToReward: pctOf(done, exited),
    },
    players: Object.keys(s.players).length,
    reachable: Object.values(s.players).filter((p) => p.canWrite && !p.writeBlocked && !p.muted).length,
  }
}
