import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'

/**
 * Product analytics: append-only daily NDJSON files on the data volume
 * (DATA_DIR/analytics/events-YYYY-MM-DD.ndjson). The player is identified only by a
 * Telegram id verified from Mini App initData on the server; without valid initData the
 * event is kept under an anonymous device id and never under a client-claimed Telegram id.
 */
const DIR = join(DATA_DIR, 'analytics')

export const ANALYTICS_EVENTS = [
  'app_open',
  'game_start',
  'tutorial_start',
  'tutorial_step',
  'first_coin',
  'first_exit',
  'raid_start',
  'raid_exit',
  'raid_caught',
  'second_raid',
  'level_start',
  'level_complete',
  'black_market_open',
  'black_market_goal_selected',
  'black_market_purchase',
  'nft_open',
  'nft_drop_open',
  'stars_open',
  'stars_invoice_created',
  'stars_payment_success',
  'stars_invoice_cancelled',
  'stars_purchase_error',
  'stars_cta_view',
  'stars_cta_click',
  'daily_reward_available',
  'daily_reward_claimed',
  'hub_primary_cta_view',
  'hub_primary_cta_click',
  'referral_link_created',
  'referral_opened',
  'referral_registered',
  'referral_channel_check_started',
  'referral_channel_verified',
  'referral_first_raid',
  'referral_first_exit',
  'referral_reward_pending',
  'referral_reward_success',
  'referral_reward_failed',
  'notification_permission_requested',
  'notification_permission_granted',
  'notification_sent',
  'notification_opened',
  'notification_action_clicked',
  'daily_reward_notification_sent',
  'referral_notification_sent',
  'overtaken_notification_sent',
  'raid_return_notification_sent',
  'leaderboard_opened',
  'leaderboard_position_changed',
  'stars_reward_pending',
  'stars_reward_paid',
  'stars_reward_cancelled',
  'successful_referral',
  'referral_stars_earned',
  'referral_payout_ready',
  'referral_payout_requested',
  'referral_payout_paid',
  'referral_payout_cancelled',
  'referral_first_50_reached',
] as const
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number]

/** Only these properties are kept; everything else a client sends is dropped. */
const PROPS: Record<string, 'str' | 'num' | 'bool'> = {
  level: 'str',
  zone: 'num',
  raidId: 'str',
  duckCoinLoot: 'num',
  exitResult: 'str',
  catchReason: 'str',
  durationMs: 'num',
  levelCompleted: 'bool',
  step: 'str',
  itemId: 'str',
  price: 'num',
  tier: 'str',
  raffleId: 'str',
  item: 'str',
  stars: 'num',
  productId: 'str',
  starsAmount: 'num',
  orderId: 'str',
  telegramPaymentChargeId: 'str',
  purchaseStatus: 'str',
  error: 'str',
  placement: 'str',
  reward: 'num',
  currency: 'str',
  kind: 'str',
  rank: 'num',
  prevRank: 'num',
  coins: 'num',
}

export type StoredEvent = {
  /** server time, ms */
  t: number
  e: AnalyticsEventName
  /** "tg:<telegram id>" (verified) or "anon:<device id>" */
  u: string
  s?: string
  p?: Record<string, string | number | boolean>
}

export type IncomingEvent = { name?: unknown; props?: unknown }

function cleanProps(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out: Record<string, string | number | boolean> = {}
  for (const [k, kind] of Object.entries(PROPS)) {
    const v = (raw as Record<string, unknown>)[k]
    if (kind === 'str' && typeof v === 'string' && v.length > 0) out[k] = v.slice(0, 64)
    else if (kind === 'num' && typeof v === 'number' && Number.isFinite(v)) out[k] = Math.round(v * 100) / 100
    else if (kind === 'bool' && typeof v === 'boolean') out[k] = v
  }
  return Object.keys(out).length ? out : undefined
}

function dayOf(t: number) {
  return new Date(t).toISOString().slice(0, 10)
}

/** One app_open per player per 30 minutes: re-renders, reloads and double mounts are not new opens. */
const OPEN_WINDOW_MS = 30 * 60_000
const lastOpen = new Map<string, number>()

export function userKey(telegramId: number | null, anonId: unknown) {
  if (telegramId) return `tg:${telegramId}`
  if (typeof anonId === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(anonId)) return `anon:${anonId}`
  return null
}

/** Only the server may record these (invoice made, payment confirmed by Telegram, server errors). */
const SERVER_ONLY = new Set<string>(['stars_invoice_created', 'stars_payment_success', 'daily_reward_available', 'daily_reward_claimed', 'referral_link_created', 'referral_opened', 'referral_registered', 'referral_channel_verified', 'referral_first_raid', 'referral_first_exit', 'referral_reward_pending', 'referral_reward_success', 'referral_reward_failed', 'notification_sent', 'daily_reward_notification_sent', 'referral_notification_sent', 'overtaken_notification_sent', 'raid_return_notification_sent', 'leaderboard_position_changed', 'notification_opened', 'stars_reward_pending', 'stars_reward_paid', 'stars_reward_cancelled', 'successful_referral', 'referral_stars_earned', 'referral_payout_ready', 'referral_payout_requested', 'referral_payout_paid', 'referral_payout_cancelled', 'referral_first_50_reached'])

/** Validate and append a batch. Returns how many events were stored. */
export function recordEvents(user: string, sessionId: unknown, events: IncomingEvent[], now = Date.now(), fromClient = false) {
  const s = typeof sessionId === 'string' && /^[A-Za-z0-9_-]{4,64}$/.test(sessionId) ? sessionId : undefined
  const rows: StoredEvent[] = []
  for (const ev of events.slice(0, 50)) {
    const name = ev?.name
    if (typeof name !== 'string' || !(ANALYTICS_EVENTS as readonly string[]).includes(name)) continue
    if (fromClient && SERVER_ONLY.has(name)) continue
    if (name === 'app_open') {
      const prev = lastOpen.get(user) ?? 0
      if (now - prev < OPEN_WINDOW_MS) continue
      lastOpen.set(user, now)
    }
    const p = cleanProps(ev.props)
    rows.push({ t: now, e: name as AnalyticsEventName, u: user, ...(s ? { s } : {}), ...(p ? { p } : {}) })
  }
  if (!rows.length) return 0
  mkdirSync(DIR, { recursive: true })
  appendFileSync(join(DIR, `events-${dayOf(now)}.ndjson`), rows.map((r) => JSON.stringify(r)).join('\n') + '\n')
  return rows.length
}

function readAll(fromDay?: string): StoredEvent[] {
  if (!existsSync(DIR)) return []
  const out: StoredEvent[] = []
  for (const f of readdirSync(DIR).sort()) {
    const m = /^events-(\d{4}-\d{2}-\d{2})\.ndjson$/.exec(f)
    if (!m || (fromDay && m[1] < fromDay)) continue
    for (const line of readFileSync(join(DIR, f), 'utf8').split('\n')) {
      if (!line) continue
      try {
        out.push(JSON.parse(line) as StoredEvent)
      } catch {
        /* a torn last line after a crash: skip it */
      }
    }
  }
  return out
}

export type AnalyticsRange = 'today' | '7d' | '30d' | 'all'

function rangeStart(range: AnalyticsRange, now: number) {
  if (range === 'all') return 0
  const d = new Date(now)
  d.setUTCHours(0, 0, 0, 0)
  const days = range === 'today' ? 0 : range === '7d' ? 6 : 29
  return d.getTime() - days * 86_400_000
}

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d
const pct = (a: number, b: number) => (b > 0 ? round((a / b) * 100) : 0)

/** Everything the admin dashboard shows, from stored events only (no estimates). */
/** Stars orders, as the summary needs them (kept structural to avoid a store dependency). */
export type OrderLike = { telegramUserId: number; productId: string; starsAmount: number; status: string; deliveredAt?: number }

export function analyticsSummary(range: AnalyticsRange, now = Date.now(), orders: OrderLike[] = []) {
  const all = readAll()
  const from = rangeStart(range, now)
  const inRange = all.filter((e) => e.t >= from)

  const usersWith = (name: AnalyticsEventName, pred?: (e: StoredEvent) => boolean) => {
    const s = new Set<string>()
    for (const e of inRange) if (e.e === name && (!pred || pred(e))) s.add(e.u)
    return s
  }
  const both = (a: Set<string>, b: Set<string>) => {
    let n = 0
    for (const u of a) if (b.has(u)) n += 1
    return n
  }

  const opened = usersWith('app_open')
  const started = usersWith('game_start')
  const firstCoin = usersWith('first_coin')
  const firstExit = usersWith('first_exit')
  const secondRaid = usersWith('second_raid')
  const bankDone = usersWith('level_complete', (e) => e.p?.level === 'bank')
  const payments = inRange.filter((e) => e.e === 'stars_payment_success')

  const funnel = {
    appOpen: opened.size,
    gameStart: started.size,
    firstCoin: firstCoin.size,
    firstExit: firstExit.size,
    secondRaid: secondRaid.size,
    bankComplete: bankDone.size,
    blackMarketOpen: usersWith('black_market_open').size,
    goalSelected: usersWith('black_market_goal_selected').size,
    nftDropOpen: usersWith('nft_drop_open').size,
    starsOpen: usersWith('stars_open').size,
    starsPayments: payments.length,
    starsPayers: new Set(payments.map((e) => e.u)).size,

  }
  const conversion = {
    openToStart: pct(both(opened, started), opened.size),
    startToFirstCoin: pct(both(started, firstCoin), started.size),
    firstCoinToFirstExit: pct(both(firstCoin, firstExit), firstCoin.size),
    firstExitToSecondRaid: pct(both(firstExit, secondRaid), firstExit.size),
    secondRaidToBankComplete: pct(both(secondRaid, bankDone), secondRaid.size),
  }

  // activity (always relative to now, independent of the range filter)
  const activeSince = (ms: number) => new Set(all.filter((e) => e.t >= ms).map((e) => e.u)).size
  const today0 = rangeStart('today', now)
  const active = { dau: activeSince(today0), wau: activeSince(now - 7 * 86_400_000), mau: activeSince(now - 30 * 86_400_000) }

  // new vs returning within the range
  const firstSeen = new Map<string, number>()
  for (const e of all) if (!firstSeen.has(e.u) || e.t < firstSeen.get(e.u)!) firstSeen.set(e.u, e.t)
  const daysActive = new Map<string, Set<string>>()
  for (const e of inRange) {
    if (!daysActive.has(e.u)) daysActive.set(e.u, new Set())
    daysActive.get(e.u)!.add(dayOf(e.t))
  }
  let newPlayers = 0
  let returning = 0
  for (const [u, days] of daysActive) {
    const isNew = (firstSeen.get(u) ?? 0) >= from
    if (isNew) newPlayers += 1
    if (!isNew || days.size >= 2) returning += 1
  }

  // raids
  const raidStarts = inRange.filter((e) => e.e === 'raid_start')
  const raiders = new Set(raidStarts.map((e) => e.u)).size
  const escapes = inRange.filter((e) => e.e === 'raid_exit' && e.p?.exitResult === 'escaped')
  const caught = inRange.filter((e) => e.e === 'raid_caught')
  const finished = [...escapes, ...caught]
  const avg = (xs: number[]) => (xs.length ? round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0)
  const levels: Record<string, number> = {}
  for (const e of raidStarts) {
    const l = typeof e.p?.level === 'string' ? e.p.level : 'unknown'
    levels[l] = (levels[l] ?? 0) + 1
  }

  // ⭐ Telegram Stars: opens and invoices from analytics, payments from the orders (source of truth)
  const paid = orders.filter((o) => o.status === 'delivered' && (o.deliveredAt ?? 0) >= from)
  const starsOpenUsers = usersWith('stars_open')
  const invoiceUsers = usersWith('stars_invoice_created')
  const payerKeys = new Set(paid.map((o) => `tg:${o.telegramUserId}`))
  const starsSold = paid.reduce((a, o) => a + o.starsAmount, 0)
  const perProduct = new Map<string, { purchases: number; payers: Set<number>; stars: number }>()
  for (const o of paid) {
    const row = perProduct.get(o.productId) ?? { purchases: 0, payers: new Set<number>(), stars: 0 }
    row.purchases += 1
    row.payers.add(o.telegramUserId)
    row.stars += o.starsAmount
    perProduct.set(o.productId, row)
  }
  const ctaViewUsers = usersWith('stars_cta_view')
  const ctaClickUsers = usersWith('stars_cta_click')
  const stars = {
    ctaShown: ctaViewUsers.size,
    ctaClicked: ctaClickUsers.size,
    ctaClickPct: pct(both(ctaViewUsers, ctaClickUsers), ctaViewUsers.size),
    ctaToOpen: pct(both(ctaViewUsers, starsOpenUsers), ctaViewUsers.size),
    opens: inRange.filter((e) => e.e === 'stars_open').length,
    openUsers: starsOpenUsers.size,
    invoices: inRange.filter((e) => e.e === 'stars_invoice_created').length,
    payments: paid.length,
    payers: payerKeys.size,
    starsSold,
    avgStars: paid.length ? round(starsSold / paid.length) : 0,
    openToInvoice: pct(both(starsOpenUsers, invoiceUsers), starsOpenUsers.size),
    invoiceToPayment: pct(both(invoiceUsers, payerKeys), invoiceUsers.size),
    openToPayment: pct(both(starsOpenUsers, payerKeys), starsOpenUsers.size),
    products: [...perProduct.entries()]
      .map(([productId, r]) => ({ productId, purchases: r.purchases, payers: r.payers.size, stars: r.stars }))
      .sort((a, b) => b.stars - a.stars),
  }

  // 🎁 daily reward: both events are written by the server only (status check / confirmed grant)
  const dailyAvailUsers = usersWith('daily_reward_available')
  const dailyClaims = inRange.filter((e) => e.e === 'daily_reward_claimed')
  const dailyClaimUsers = new Set(dailyClaims.map((e) => e.u))
  const daily = {
    available: dailyAvailUsers.size,
    claimed: dailyClaimUsers.size,
    claims: dailyClaims.length,
    conversion: pct(both(dailyAvailUsers, dailyClaimUsers), dailyAvailUsers.size),
    coins: dailyClaims.reduce((a, e) => a + Number(e.p?.reward ?? 0), 0),
  }
  // ▶ the hub's one main button (ENTER BANK / the current level)
  const hubViewUsers = usersWith('hub_primary_cta_view')
  const hubClickUsers = usersWith('hub_primary_cta_click')
  const hub = {
    ctaShown: hubViewUsers.size,
    ctaClicked: hubClickUsers.size,
    clicks: inRange.filter((e) => e.e === 'hub_primary_cta_click').length,
    conversion: pct(both(hubViewUsers, hubClickUsers), hubViewUsers.size),
  }

  // 🔔 notifications (sent / opened by kind) and ranking views
  const byKind = (name: AnalyticsEventName) => {
    const out: Record<string, number> = {}
    for (const e of inRange) if (e.e === name) out[String(e.p?.kind ?? 'other')] = (out[String(e.p?.kind ?? 'other')] ?? 0) + 1
    return out
  }
  const notifications = {
    sent: byKind('notification_sent'),
    opened: byKind('notification_opened'),
    actions: byKind('notification_action_clicked'),
    permissionRequested: usersWith('notification_permission_requested').size,
    permissionGranted: usersWith('notification_permission_granted').size,
    leaderboardOpened: usersWith('leaderboard_opened').size,
    linksCreated: usersWith('referral_link_created').size,
  }

  return {
    range,
    stars,
    daily,
    notifications,
    hub,
    from,
    generatedAt: now,
    players: daysActive.size,
    verifiedPlayers: [...daysActive.keys()].filter((u) => u.startsWith('tg:')).length,
    events: inRange.length,
    funnel,
    conversion,
    active,
    newPlayers,
    returningPlayers: returning,
    raids: {
      started: raidStarts.length,
      avgPerPlayer: raiders ? round(raidStarts.length / raiders) : 0,
      escaped: escapes.length,
      caught: caught.length,
      caughtPct: pct(caught.length, finished.length),
      avgCoinsPerExit: avg(escapes.map((e) => Number(e.p?.duckCoinLoot ?? 0))),
      avgDurationS: round(avg(finished.map((e) => Number(e.p?.durationMs ?? 0))) / 1000),
      popularLevels: Object.entries(levels)
        .sort((a, b) => b[1] - a[1])
        .map(([level, raids]) => ({ level, raids })),
    },
  }
}
