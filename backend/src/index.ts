import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { botIdentity, createStarsInvoiceLink, starsBotState, notifyPaymentClaimed, notifyPaymentConfirmed, notifyPaymentRejected, notifyTelegramUser, startBot } from './bot.js'
import { archiveRaffleCards, findCardById, getUserCards, listAllCards, mergeUserCards, setCardStatusById, setUserCardStatus, upsertUserCard, type StoredCard } from './cardStore.js'
import { adminPassword, channelId, channelUrl, DATA_DIR, getTelegramSettings, maskToken, saveTelegramSettings } from './config.js'
import { deleteNftFile, getNftFile, isNftRaffleId, listNftMeta, saveNftFile } from './nftStore.js'
import { handleSupportUpdate, isSupportWebhookAuthorized, startSupportBot, type SupportTelegramUpdate } from './supportBot.js'
import { getPayWallets, isTonPayAddress, isTronPayAddress, loadWalletsFromDisk, savePayWallets, walletsFilePath } from './walletsStore.js'
import { drawBonus, drawRaffle, publicRaffleSnapshot, refreshRafflePhase } from './draw.js'
import { hideDraw, hideKnownTestDraws, listDraws, listPublicDraws, setDrawWinnerPaid } from './drawStore.js'
import { addBonusUser, isBonusUser, listBonusUsers, syncBonusUsersFromCards } from './bonusStore.js'
import { setRafflePhase, setTestSold, startNextRaffleRound } from './raffleStore.js'
import { RAFFLE_TOTALS } from './prizes.js'
import { isDataWriteError, WRITE_RETRY_MESSAGE } from './dataQueue.js'
import { getChat } from './chatStore.js'
import { getPayment, listPayments, setPaymentNotify, setPaymentStatus, upsertClaim } from './paymentStore.js'
import { finishHuntAttempt, huntStatus, lastHuntAttempt, resetHuntCooldown, startHuntAttempt } from './huntStore.js'
import {
  consumeGameplayReset,
  hasGameplayResetHistory,
  hasPendingGameplayReset,
  queueGameplayReset,
} from './playerResetStore.js'
import { verifyInitData } from './verifyInitData.js'
import { allOrders, createOrder, ordersOf, saveOrder, STARS_PRODUCTS, type StarsOrder } from './starsStore.js'
import { analyticsSummary, recordEvents, userKey, type AnalyticsRange, type IncomingEvent } from './analyticsStore.js'
import { claimDaily, dailyStatus, dailyUsers, isNonce } from './dailyRewardStore.js'
import {
  backfillOnce,
  claimGrant,
  INVITEE_COINS,
  INVITER_COINS,
  backfillMissionProgress,
  MISSION_COINS,
  STARS_PAYOUT_BLOCK,
  STARS_PER_REFERRAL,
  listPayouts,
  migrateStarsModel,
  notePayoutNotify,
  requestPayout,
  settlePayout,
  starsProgressOf,
  type PayoutStatus,
  type StarsAccrual,
  inviteOf,
  invitesBy,
  inviteStatus,
  isRaidId,
  leaderboard,
  markChannelVerified,
  pendingGrants,
  refCodeOf,
  referralSummary,
  reportRaid,
  setMuted,
  setWriteAccess,
  touchSession,
  type Invite,
  type RaidReport,
} from './retentionStore.js'
import { notifyPayoutPaid, notifyLog, notifyReferralCompleted, notifyTick, setNotificationsEnabled, startNotifier, textFor, type NotifKind } from './notifyService.js'
import { botUsername, channelHealth, checkChannelMember, prepareInviteMessage, sendRetentionMessage } from './bot.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT) || 3001

const DEFAULT_CORS_ORIGINS = [
  'https://duckjackpot.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]

function corsOrigins() {
  const extra = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean)
  return new Set([...DEFAULT_CORS_ORIGINS, ...extra])
}

const allowedOrigins = corsOrigins()

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true)
        return
      }
      if (allowedOrigins.has(origin.replace(/\/$/, ''))) {
        callback(null, true)
        return
      }
      callback(new Error(`CORS blocked origin: ${origin}`))
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-password', 'X-Telegram-Init-Data'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
)
// NFT images arrive as base64 JSON: a 6 MB file is ~8 MB of base64, so leave headroom for
// saveNftFile's own 6 MB check to answer with a clear `too_large` instead of the parser.
app.use(express.json({ limit: '10mb' }))

app.get('/', (_req, res) => {
  res.json({ ok: true })
})

function resolveTelegramUser(body: { initData?: string; telegramId?: number; telegramUsername?: string }) {
  const { token } = getTelegramSettings()
  const verified = typeof body.initData === 'string' ? verifyInitData(body.initData, token) : null
  const telegramId = verified?.id ?? (typeof body.telegramId === 'number' ? body.telegramId : undefined)
  const telegramUsername = verified?.username ?? (typeof body.telegramUsername === 'string' ? body.telegramUsername : undefined)
  return { telegramId, telegramUsername }
}

function asStoredCard(raw: Partial<StoredCard>, telegramId?: number): StoredCard | null {
  if (!raw || typeof raw.id !== 'string' || typeof raw.serial !== 'number') return null
  return {
    id: raw.id,
    raffleId: String(raw.raffleId ?? 'classic'),
    serial: raw.serial,
    paidWith: typeof raw.paidWith === 'string' ? raw.paidWith : 'USDT',
    purchasedAt: typeof raw.purchasedAt === 'number' ? raw.purchasedAt : Date.now(),
    status: typeof raw.status === 'string' ? raw.status : 'pending',
    payCode: typeof raw.payCode === 'string' ? raw.payCode : '',
    usdtExact: typeof raw.usdtExact === 'number' ? raw.usdtExact : undefined,
    telegramId,
    telegramUsername: typeof raw.telegramUsername === 'string' ? raw.telegramUsername : undefined,
    round: typeof raw.round === 'number' && raw.round >= 1 ? Math.round(raw.round) : undefined,
  }
}

function requireAdmin(req: express.Request, res: express.Response) {
  const password = String(req.header('x-admin-password') ?? req.body?.adminPassword ?? req.body?.password ?? '').trim()
  const expected = adminPassword()
  if (!expected || !password || password !== expected) {
    res.status(401).json({ error: 'unauthorized' })
    return false
  }
  return true
}

function replyWriteFailed(res: express.Response) {
  res.status(503).json({ error: WRITE_RETRY_MESSAGE })
}

app.post('/api/admin/login', (req, res) => {
  const password = String(req.body?.password ?? req.header('x-admin-password') ?? '').trim()
  const expected = adminPassword()
  if (!expected || !password || password !== expected) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  res.json({ ok: true })
})

app.get('/api/wallets', (_req, res) => {
  res.json(getPayWallets())
})

app.get('/api/admin/wallets', (req, res) => {
  if (!requireAdmin(req, res)) return
  res.json(getPayWallets())
})

function readWalletBody(req: express.Request) {
  const tonAddress = String(req.body?.tonAddress ?? req.body?.merchantWallet ?? '').trim()
  const usdtTrc20Address = String(req.body?.usdtTrc20Address ?? '').trim()
  return { tonAddress, usdtTrc20Address }
}

function saveAdminWallets(req: express.Request, res: express.Response) {
  if (!requireAdmin(req, res)) return
  const { tonAddress, usdtTrc20Address } = readWalletBody(req)
  if (usdtTrc20Address && !isTronPayAddress(usdtTrc20Address)) {
    res.status(400).json({ error: 'invalid_usdt_address' })
    return
  }
  if (tonAddress && !isTonPayAddress(tonAddress)) {
    res.status(400).json({ error: 'invalid_ton_address' })
    return
  }
  try {
    res.json({ ok: true, ...savePayWallets({ tonAddress, usdtTrc20Address }) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'write_failed'
    res.status(500).json({ error: message })
  }
}

app.put('/api/admin/wallets', saveAdminWallets)
app.post('/api/admin/wallets', saveAdminWallets)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/hunt/status', (req, res) => {
  const { telegramId } = resolveTelegramUser(req.body ?? {})
  if (!telegramId) {
    res.status(401).json({ error: 'invalid_init_data' })
    return
  }
  const status = huntStatus(telegramId)
  res.json({
    canPlay: status.canPlay,
    nextAt: status.nextAt,
    last: status.last,
  })
})

app.post('/api/hunt/start', (req, res) => {
  const { telegramId } = resolveTelegramUser(req.body ?? {})
  if (!telegramId) {
    res.status(401).json({ error: 'invalid_init_data' })
    return
  }
  try {
    const attempt = startHuntAttempt(telegramId)
    res.json({ ok: true, attempt })
  } catch (err) {
    const nextAt = err && typeof err === 'object' && 'nextAt' in err ? Number((err as { nextAt: number }).nextAt) : Date.now()
    res.status(429).json({ error: 'cooldown', nextAt })
  }
})

app.post('/api/hunt/finish', (req, res) => {
  const { telegramId } = resolveTelegramUser(req.body ?? {})
  if (!telegramId) {
    res.status(401).json({ error: 'invalid_init_data' })
    return
  }
  const attempt = finishHuntAttempt(telegramId, {
    id: typeof req.body?.id === 'string' ? req.body.id : undefined,
    levelsPassed: Number(req.body?.levelsPassed ?? 0),
    shots: Number(req.body?.shots ?? 0),
    hits: Number(req.body?.hits ?? 0),
    win: req.body?.win === true,
  })
  if (!attempt) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  res.json({ ok: true, attempt })
})

app.post('/api/admin/hunt/reset', (req, res) => {
  if (!requireAdmin(req, res)) return
  const telegramId = Number(req.body?.telegramId)
  if (!Number.isFinite(telegramId) || telegramId <= 0) {
    res.status(400).json({ error: 'invalid_telegram_id' })
    return
  }
  res.json(resetHuntCooldown(telegramId))
})

function playerKnown(telegramId: number) {
  if (getChat(telegramId)) return true
  if (getUserCards(telegramId).length > 0) return true
  if (lastHuntAttempt(telegramId)) return true
  if (isBonusUser(telegramId)) return true
  if (hasGameplayResetHistory(telegramId)) return true
  if (listPayments().some((row) => row.telegramId === telegramId)) return true
  return false
}

const GAMEPLAY_RESET_SNAPSHOT = {
  duckCoin: 0,
  bag: 'BASIC 100',
  upgrades: 0,
  bank: 'ZONE 1',
  mansion: 'LOCKED',
  rank: 'ROOKIE',
  onboarding: 'NEW PLAYER',
} as const

app.post('/api/admin/player/reset', (req, res) => {
  if (!requireAdmin(req, res)) return
  const telegramId = Number(req.body?.telegramId)
  if (!Number.isFinite(telegramId) || telegramId <= 0) {
    res.status(400).json({ error: 'invalid_telegram_id' })
    return
  }
  try {
    const known = playerKnown(telegramId)
    const queued = queueGameplayReset(telegramId)
    if (queued.alreadyPending) {
      res.json({
        ok: true,
        already: true,
        telegramId,
        known,
        snapshot: GAMEPLAY_RESET_SNAPSHOT,
      })
      return
    }
    res.json({
      ok: true,
      already: false,
      telegramId,
      known,
      snapshot: GAMEPLAY_RESET_SNAPSHOT,
    })
  } catch {
    res.status(500).json({ error: 'reset_failed' })
  }
})

app.post('/api/heist/gameplay-reset/pending', (req, res) => {
  const { telegramId } = resolveTelegramUser(req.body ?? {})
  if (!telegramId || !Number.isFinite(telegramId) || telegramId <= 0) {
    res.status(400).json({ error: 'invalid_telegram_id' })
    return
  }
  res.json({ pending: hasPendingGameplayReset(telegramId), telegramId })
})

app.post('/api/heist/gameplay-reset/consume', (req, res) => {
  const { telegramId } = resolveTelegramUser(req.body ?? {})
  if (!telegramId || !Number.isFinite(telegramId) || telegramId <= 0) {
    res.status(400).json({ error: 'invalid_telegram_id' })
    return
  }
  try {
    res.json({ ...consumeGameplayReset(telegramId), telegramId })
  } catch {
    res.status(500).json({ error: 'reset_failed' })
  }
})

app.post('/api/support-bot/webhook', (req, res) => {
  console.log('[support-bot] webhook route', {
    update_id: req.body?.update_id,
    fromId: req.body?.message?.from?.id,
    text: req.body?.message?.text ?? req.body?.message?.caption ?? null,
  })
  if (!isSupportWebhookAuthorized(req.get('X-Telegram-Bot-Api-Secret-Token') ?? undefined)) {
    console.error('[support-bot] webhook unauthorized')
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  const body = req.body as { update_id?: number; message?: SupportTelegramUpdate['message'] }
  if (body.update_id == null) {
    console.error('[support-bot] webhook missing update_id')
    res.status(400).json({ error: 'bad_update' })
    return
  }
  const update: SupportTelegramUpdate = {
    update_id: body.update_id,
    message: body.message,
  }
  void handleSupportUpdate(update)
    .then(() => console.log('[support-bot] handler done', update.update_id))
    .catch((err) => console.error('[support-bot] handler error', err))
  res.json({ ok: true })
})

// ---------- analytics ----------
/** Signed initData → the verified Telegram id (cached briefly; the HMAC is cheap but batches are frequent). */
const initDataCache = new Map<string, { id: number | null; at: number }>()
function analyticsTelegramId(initData: unknown): number | null {
  if (typeof initData !== 'string' || !initData) return null
  const hit = initDataCache.get(initData)
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.id
  // A Mini App can stay open for days: accept a validly signed initData up to 7 days old.
  const id = verifyInitData(initData, getTelegramSettings().token, 7 * 86_400)?.id ?? null
  if (initDataCache.size > 5000) initDataCache.clear()
  initDataCache.set(initData, { id, at: Date.now() })
  return id
}

/** Events from the game. The player is the verified Telegram user; a client-sent id is never trusted. */
app.post('/api/analytics/events', (req, res) => {
  const body = (req.body ?? {}) as { initData?: unknown; anonId?: unknown; sessionId?: unknown; events?: unknown }
  const user = userKey(analyticsTelegramId(body.initData), body.anonId)
  if (!user || !Array.isArray(body.events)) {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  try {
    const stored = recordEvents(user, body.sessionId, body.events as IncomingEvent[], Date.now(), true)
    res.json({ ok: true, stored })
  } catch (err) {
    console.error('[analytics] write failed', err)
    res.status(503).json({ error: 'write_failed' })
  }
})

app.get('/api/admin/analytics', (req, res) => {
  if (!requireAdmin(req, res)) return
  const r = String(req.query.range ?? '7d')
  const range: AnalyticsRange = r === 'today' || r === '7d' || r === '30d' || r === 'all' ? r : '7d'
  try {
    const sum = analyticsSummary(range, Date.now(), allOrders())
    res.json({ ...sum, referrals: referralSummary(sum.from, sum.notifications.linksCreated) })
  } catch (err) {
    console.error('[analytics] summary failed', err)
    res.status(500).json({ error: 'server_error' })
  }
})

// ---------- Telegram Stars ----------
/** The verified Telegram id for a Stars request, or null (then: 401). Never a client-sent id. */
function starsUser(req: express.Request): number | null {
  const raw = req.header('x-telegram-init-data') ?? (typeof req.body?.initData === 'string' ? req.body.initData : '')
  if (!raw) return null
  return verifyInitData(raw, getTelegramSettings().token)?.id ?? null
}

const publicOrder = (o: StarsOrder) => ({
  orderId: o.id,
  productId: o.productId,
  tier: o.tier,
  starsAmount: o.starsAmount,
  status: o.status,
  createdAt: o.createdAt,
  purchasedAt: o.deliveredAt ?? null,
})

/** Catalog with server prices (read-only; the client shows them, the server charges them). */
app.get('/api/stars/products', (_req, res) => {
  const bot = starsBotState()
  res.json({
    enabled: bot.configured && bot.polling,
    products: Object.values(STARS_PRODUCTS).map((p) => ({ id: p.id, stat: p.stat, prices: p.prices, title: p.title, tiers: p.tiers })),
  })
})

app.post('/api/stars/create-invoice', async (req, res) => {
  const telegramUserId = starsUser(req)
  if (!telegramUserId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  const bot = starsBotState()
  if (!bot.configured) {
    res.status(503).json({ error: 'bot_not_configured' })
    return
  }
  const lang = req.body?.lang === 'en' ? 'en' : 'ru'
  const made = createOrder(telegramUserId, String(req.body?.productId ?? ''), req.body?.level, lang)
  if ('error' in made) {
    res.status(made.error === 'unknown_product' ? 400 : 409).json({ error: made.error })
    return
  }
  const order = made.order
  try {
    await saveOrder(order)
    const invoiceUrl = await createStarsInvoiceLink(order)
    order.status = 'invoice_created'
    order.invoiceCreatedAt = Date.now()
    await saveOrder(order)
    recordEvents(`tg:${telegramUserId}`, 'server', [{ name: 'stars_invoice_created', props: { productId: order.productId, starsAmount: order.starsAmount, orderId: order.id, tier: String(order.tier) } }])
    res.json({ orderId: order.id, invoiceUrl, productId: order.productId, tier: order.tier, starsAmount: order.starsAmount })
  } catch (err) {
    console.error('[stars] create invoice failed', { order: order.id, err: err instanceof Error ? err.message : String(err) })
    order.status = 'failed'
    order.failReason = 'invoice_failed'
    await saveOrder(order).catch(() => undefined)
    recordEvents(`tg:${telegramUserId}`, 'server', [{ name: 'stars_purchase_error', props: { productId: order.productId, orderId: order.id, error: 'invoice_failed' } }])
    res.status(502).json({ error: 'invoice_failed' })
  }
})

/** This player's Stars orders — only theirs — and the tier they own per product. */
app.get('/api/stars/purchases', (req, res) => {
  const telegramUserId = starsUser(req)
  if (!telegramUserId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  const orders = ordersOf(telegramUserId)
  const owned: Record<string, number> = {}
  for (const o of orders) if (o.status === 'delivered') owned[o.productId] = Math.max(owned[o.productId] ?? 0, o.tier)
  res.json({ purchases: orders.slice(0, 50).map(publicOrder), owned })
})

/** Admin: latest Stars orders with payer id and charge id (for support and refunds). */
app.get('/api/admin/stars/orders', (req, res) => {
  if (!requireAdmin(req, res)) return
  res.json({ orders: allOrders().slice(0, 200), bot: starsBotState() })
})

// ---------- 🎁 daily reward ----------
/** Verified Telegram id only (a Mini App may stay open for days: signed initData up to 7 days old). */
function dailyUser(req: express.Request): number | null {
  const raw = req.header('x-telegram-init-data') ?? (typeof req.body?.initData === 'string' ? req.body.initData : '')
  if (!raw) return null
  return verifyInitData(raw, getTelegramSettings().token, 7 * 86_400)?.id ?? null
}

app.post('/api/daily-reward/status', async (req, res) => {
  const telegramId = dailyUser(req)
  if (!telegramId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  try {
    const { firstAvailable, ...status } = await dailyStatus(telegramId)
    if (firstAvailable) recordEvents(`tg:${telegramId}`, 'server', [{ name: 'daily_reward_available', props: { reward: status.amount, currency: 'DUCK_COIN' } }])
    res.json(status)
  } catch (err) {
    console.error('[daily] status failed', err)
    res.status(503).json({ error: 'unavailable' })
  }
})

/** +150 DUCK COIN once per 24 h. The server decides; the client credits only a granted claim id. */
app.post('/api/daily-reward/claim', async (req, res) => {
  const telegramId = dailyUser(req)
  if (!telegramId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  const nonce = req.body?.nonce
  if (!isNonce(nonce)) {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  try {
    const result = await claimDaily(telegramId, nonce)
    if (result.granted && !result.replay) {
      recordEvents(`tg:${telegramId}`, 'server', [{ name: 'daily_reward_claimed', props: { reward: result.amount, currency: 'DUCK_COIN' } }])
    }
    res.json(result)
  } catch (err) {
    console.error('[daily] claim failed', err)
    res.status(503).json({ error: 'unavailable' })
  }
})

// ---------- 👥 referrals, 🔔 notifications, 🏆 ranking ----------
/** The verified Telegram user (signed initData, up to 7 days old). Never a client-sent id. */
function tgUser(req: express.Request) {
  const raw = req.header('x-telegram-init-data') ?? (typeof req.body?.initData === 'string' ? req.body.initData : '')
  if (!raw) return null
  return verifyInitData(raw, getTelegramSettings().token, 7 * 86_400)
}
const ev = (id: number, name: string, props?: Record<string, string | number | boolean>) => {
  try {
    recordEvents(`tg:${id}`, 'server', [{ name, ...(props ? { props } : {}) }])
  } catch (err) {
    console.error('[analytics] server event failed', err)
  }
}
const NOTIF_KINDS: NotifKind[] = ['daily', 'overtaken', 'leader', 'raid_return', 'invite', 'referral_inviter', 'referral_invitee']
const STATUS_ORDER = ['opened', 'verified', 'played', 'exited', 'rewarded'] as const
const channelInfo = () => ({ configured: Boolean(channelId()), url: channelUrl() })
const rewardsInfo = () => ({ missionCoins: MISSION_COINS, inviterCoins: INVITER_COINS, inviteeCoins: INVITEE_COINS, stars: { available: true, manual: true, perFriend: STARS_PER_REFERRAL, payout: STARS_PAYOUT_BLOCK, inviter: STARS_PER_REFERRAL, invitee: 0 } })
const inviteView = (i: Invite | null) =>
  i
    ? { status: inviteStatus(i), channelVerified: Boolean(i.channelVerifiedAt), firstRaid: Boolean(i.firstRaidAt), firstExit: Boolean(i.firstExitAt), completed: Boolean(i.completedAt), completedAt: i.completedAt ?? null, progress: Math.min(i.progressCoins ?? 0, MISSION_COINS), target: MISSION_COINS }
    : null

async function afterCompletion(completed: { invitee: { telegramId: number; coins: number }; inviter: { telegramId: number; coins: number }; stars: StarsAccrual | null } | null) {
  if (!completed) return
  ev(completed.invitee.telegramId, 'referral_reward_pending', { coins: completed.invitee.coins, kind: 'invitee' })
  ev(completed.inviter.telegramId, 'referral_reward_pending', { coins: completed.inviter.coins, kind: 'inviter' })
  const a = completed.stars
  if (a) {
    ev(a.inviterId, 'successful_referral', { stars: STARS_PER_REFERRAL })
    ev(a.inviterId, 'referral_stars_earned', { stars: STARS_PER_REFERRAL, coins: a.earned })
    for (const p of a.newPayouts) ev(a.inviterId, 'referral_payout_ready', { stars: p.stars, orderId: p.id })
    if (a.firstBlock) ev(a.inviterId, 'referral_first_50_reached', { stars: STARS_PAYOUT_BLOCK })
  }
  void notifyReferralCompleted(completed.invitee.telegramId, completed.inviter.telegramId, a)
}

/** The device's Black Market goal (display only: it words a reminder, never a reward). */
function readGoal(raw: unknown): { name: string; left: number } | null | undefined {
  if (raw === null) return null
  if (!raw || typeof raw !== 'object') return undefined
  const g = raw as { name?: unknown; left?: unknown }
  if (typeof g.name !== 'string' || !g.name.trim() || typeof g.left !== 'number' || !Number.isFinite(g.left)) return undefined
  return { name: g.name.trim(), left: g.left }
}

/** App opened: register the player, apply a referral from the signed start_param once. */
app.post('/api/me/session', async (req, res) => {
  const u = tgUser(req)
  if (!u) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  const m = /^ref_([A-Za-z0-9]{6,16})$/.exec(u.startParam ?? '')
  try {
    const r = await touchSession({ id: u.id, name: u.firstName, username: u.username, allowsWriteToPm: u.allowsWriteToPm, lang: u.languageCode, refCode: m?.[1], via: 'startapp', novice: typeof req.body?.novice === 'boolean' ? req.body.novice : undefined, goal: readGoal(req.body?.goal) })
    if (m) {
      if (r.freshInvite) {
        ev(u.id, 'referral_opened')
        ev(u.id, 'referral_registered')
      } else if (r.referral.kind === 'refused') ev(u.id, 'referral_opened', { error: r.referral.reason })
    }
    const n = String(req.body?.n ?? '')
    if ((NOTIF_KINDS as string[]).includes(n)) ev(u.id, 'notification_opened', { kind: n })
    res.json({ invitee: inviteView(r.invite), canWrite: r.player.canWrite && !r.player.writeBlocked, muted: Boolean(r.player.muted), grants: pendingGrants(u.id), rewards: rewardsInfo(), channel: channelInfo(), starsProgress: starsProgressOf(u.id) })
  } catch (err) {
    console.error('[retention] session failed', err)
    res.status(503).json({ error: 'unavailable' })
  }
})

app.get('/api/referral/me', async (req, res) => {
  const u = tgUser(req)
  if (!u) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  try {
    const { code, first } = await refCodeOf(u.id)
    const bot = await botUsername()
    if (first) ev(u.id, 'referral_link_created')
    const mine = invitesBy(u.id)
    const reached = (s: (typeof STATUS_ORDER)[number]) => mine.list.filter((i) => STATUS_ORDER.indexOf(inviteStatus(i)) >= STATUS_ORDER.indexOf(s)).length
    res.json({
      // Opens the bot chat (/start ref_<code>), so the chat stays in the player's list and the bot may write.
      link: bot ? `https://t.me/${bot}?start=ref_${code}` : null,
      code,
      rewards: rewardsInfo(),
      stats: { invited: mine.list.length, subscribed: reached('verified'), played: reached('played'), exited: reached('exited'), rewarded: reached('rewarded') },
      coins: { received: mine.rewardedCoins, pending: mine.pendingCoins },
      invites: mine.list.slice(0, 50).map((i) => ({ name: i.inviteeName ?? null, username: i.inviteeUsername ?? null, status: inviteStatus(i), openedAt: i.openedAt, progress: Math.min(i.progressCoins ?? 0, MISSION_COINS), target: MISSION_COINS })),
      invitee: inviteView(inviteOf(u.id)),
      grants: pendingGrants(u.id),
      channel: channelInfo(),
      starsProgress: starsProgressOf(u.id),
    })
  } catch (err) {
    console.error('[referral] me failed', err)
    res.status(503).json({ error: 'unavailable' })
  }
})

/** Native share: a prepared message with a ▶ button (Telegram shareMessage). */
app.post('/api/referral/share', async (req, res) => {
  const u = tgUser(req)
  if (!u) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  try {
    const { code, first } = await refCodeOf(u.id)
    if (first) ev(u.id, 'referral_link_created')
    const bot = await botUsername()
    if (!bot) throw new Error('bot_not_configured')
    // /start ref_<code>: the bot chat opens first (and stays in the list), then its button starts the game.
    const url = `https://t.me/${bot}?start=ref_${code}`
    const ru = req.body?.lang !== 'en'
    const text = ru
      ? `🦆 DUCKJACKPOT\n\nПриглашай друзей и получай ⭐${STARS_PER_REFERRAL}\nза каждого друга, который выполнит миссию.\n\n🎁 Собери ${STARS_PAYOUT_BLOCK} ⭐ и получи первую выплату.\n\nТвоя ссылка:\n${url}`
      : `🦆 DUCKJACKPOT\n\nInvite friends and get ⭐${STARS_PER_REFERRAL}\nfor every friend who completes the mission.\n\n🎁 Collect ${STARS_PAYOUT_BLOCK} ⭐ and get your first payout.\n\nYour link:\n${url}`
    // 📢 opens the channel only; the server still checks the real subscription later.
    const buttons = [
      { text: ru ? '📢 ПОДПИСАТЬСЯ НА КАНАЛ' : '📢 FOLLOW THE CHANNEL', url: channelUrl() },
      { text: ru ? '🦆 ИГРАТЬ' : '🦆 PLAY', url },
    ]
    const id = await prepareInviteMessage(u.id, { title: 'DUCKJACKPOT', text, buttons })
    // Plain-share fallback (no buttons there): the channel link goes into the text.
    res.json({ id, url, text: `${text}\n\n📢 ${channelUrl()}`, buttons })
  } catch (err) {
    console.error('[referral] share failed', err instanceof Error ? err.message : err)
    res.status(502).json({ error: 'share_unavailable' })
  }
})

/** getChatMember on the configured channel for the verified user. Never trusts the client. */
app.post('/api/referral/check-channel', async (req, res) => {
  const u = tgUser(req)
  if (!u) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  ev(u.id, 'referral_channel_check_started')
  const check = await checkChannelMember(u.id)
  if (!check.ok) {
    res.status(503).json({ error: check.error })
    return
  }
  if (!check.subscribed) {
    res.json({ subscribed: false, status: check.status })
    return
  }
  try {
    const r = await markChannelVerified(u.id)
    if (r.first) ev(u.id, 'referral_channel_verified')
    await afterCompletion(r.completed)
    res.json({ subscribed: true, status: check.status, invitee: inviteView(r.invite), grants: pendingGrants(u.id) })
  } catch (err) {
    console.error('[referral] verify failed', err)
    res.status(503).json({ error: 'unavailable' })
  }
})

/** Raid start / end from the game (fire-and-forget on the client). */
app.post('/api/player/raid', async (req, res) => {
  const u = tgUser(req)
  if (!u) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  const b = (req.body ?? {}) as Record<string, unknown>
  if (!isRaidId(b.raidId) || (b.event !== 'start' && b.event !== 'end')) {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  const verdict = b.verdict === 'escaped' || b.verdict === 'caught' || b.verdict === 'aborted' ? b.verdict : null
  const report: RaidReport =
    b.event === 'start'
      ? { event: 'start', raidId: b.raidId, level: typeof b.level === 'string' ? b.level : 'bank', preview: b.preview === true }
      : { event: 'end', raidId: b.raidId, verdict: verdict ?? 'aborted', loot: Number(b.loot) || 0, preview: b.preview === true }
  try {
    const r = await reportRaid(u.id, report)
    if (r.firstRaid) ev(u.id, 'referral_first_raid')
    if (r.firstExit) ev(u.id, 'referral_first_exit')
    await afterCompletion(r.completed)
    res.json({ ok: true, counted: r.counted, rejected: r.rejected, invitee: inviteView(r.invite), grants: r.completed ? pendingGrants(u.id) : undefined })
  } catch (err) {
    console.error('[raid] report failed', err)
    res.status(503).json({ error: 'unavailable' })
  }
})

/** Claim a server-granted DUCK COIN reward once (nonce-idempotent, like the daily reward). */
app.post('/api/rewards/claim', async (req, res) => {
  const u = tgUser(req)
  if (!u) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  const grantId = String(req.body?.grantId ?? '')
  const nonce = req.body?.nonce
  if (!/^[a-f0-9]{18}$/.test(grantId) || !isNonce(nonce)) {
    res.status(400).json({ error: 'bad_request' })
    return
  }
  try {
    const r = await claimGrant(u.id, grantId, nonce)
    if (!r.ok) {
      res.status(r.error === 'not_found' ? 404 : 409).json({ error: r.error })
      return
    }
    if (!r.replay) ev(u.id, 'referral_reward_success', { coins: r.grant.coins, kind: r.grant.reason === 'referral_inviter' ? 'inviter' : 'invitee' })
    res.json({ granted: true, replay: r.replay, claimId: r.grant.id, amount: r.grant.coins, reason: r.grant.reason })
  } catch (err) {
    console.error('[rewards] claim failed', err)
    res.status(503).json({ error: 'unavailable' })
  }
})

const dailyCoinsMap = () => new Map(dailyUsers().map((d) => [d.telegramId, d.totalCoins]))

app.get('/api/leaderboard', (req, res) => {
  const u = tgUser(req)
  const board = leaderboard(dailyCoinsMap())
  const me = u ? board.find((r) => r.id === u.id) : undefined
  res.json({
    top: board.slice(0, 10).map((r) => ({ rank: r.rank, name: r.name, wealth: r.wealth, me: r.id === u?.id })),
    me: u ? { rank: me?.rank ?? null, wealth: me?.wealth ?? 0 } : null,
    players: board.length,
  })
})

app.post('/api/notifications/access', async (req, res) => {
  const u = tgUser(req)
  if (!u) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  const granted = req.body?.granted === true || u.allowsWriteToPm === true
  const canWrite = await setWriteAccess(u.id, granted)
  if (granted) ev(u.id, 'notification_permission_granted')
  res.json({ canWrite })
})

app.post('/api/notifications/prefs', async (req, res) => {
  const u = tgUser(req)
  if (!u) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  res.json({ muted: await setMuted(u.id, req.body?.muted === true) })
})

// ---------- ⭐ referral payouts (blocks of 50 ⭐, paid by hand by the operator) ----------
/** The player asks for a ready payout (their own): READY_FOR_PAYOUT → PENDING. */
app.post('/api/referral/payouts/:id/request', async (req, res) => {
  const u = tgUser(req)
  if (!u) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  try {
    const r = await requestPayout(u.id, String(req.params.id))
    if (!r.ok) {
      res.status(r.error === 'not_found' ? 404 : 409).json({ error: r.error })
      return
    }
    if (r.first) ev(u.id, 'referral_payout_requested', { stars: r.payout.stars })
    res.json({ ok: true, payout: r.payout, starsProgress: starsProgressOf(u.id) })
  } catch (err) {
    console.error('[payout] request failed', err)
    res.status(503).json({ error: 'unavailable' })
  }
})

const PAYOUT_STATUSES: PayoutStatus[] = ['READY_FOR_PAYOUT', 'PENDING', 'PAID', 'CANCELLED']
app.get('/api/admin/referral-payouts', (req, res) => {
  if (!requireAdmin(req, res)) return
  const q = String(req.query.status ?? '').toUpperCase() as PayoutStatus
  res.json(listPayouts(PAYOUT_STATUSES.includes(q) ? q : undefined))
})

const operatorOf = (raw: unknown) => (typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, 40) : 'admin')

/** The operator really sent the Stars from their own Telegram balance: → PAID once, then tell the player. */
app.post('/api/admin/referral-payouts/:id/paid', async (req, res) => {
  if (!requireAdmin(req, res)) return
  if (req.body?.confirm !== true) {
    res.status(400).json({ error: 'confirm_required' })
    return
  }
  try {
    const r = await settlePayout(String(req.params.id), 'PAID', operatorOf(req.body?.operator))
    if (!r.ok) {
      res.status(r.error === 'not_found' ? 404 : 409).json({ error: r.error })
      return
    }
    const p = r.payout
    ev(p.telegramId, 'referral_payout_paid', { stars: p.stars, orderId: p.id })
    const notify = await notifyPayoutPaid(p.telegramId, p.stars).catch(() => 'failed')
    await notePayoutNotify(p.id, notify)
    res.json({ ok: true, payout: { ...p, notifyResult: notify } })
  } catch (err) {
    console.error('[payout] paid failed', err)
    res.status(503).json({ error: 'unavailable' })
  }
})

app.post('/api/admin/referral-payouts/:id/cancel', async (req, res) => {
  if (!requireAdmin(req, res)) return
  try {
    const r = await settlePayout(String(req.params.id), 'CANCELLED', operatorOf(req.body?.operator), typeof req.body?.reason === 'string' ? req.body.reason : undefined)
    if (!r.ok) {
      res.status(r.error === 'not_found' ? 404 : 409).json({ error: r.error })
      return
    }
    ev(r.payout.telegramId, 'referral_payout_cancelled', { stars: r.payout.stars, orderId: r.payout.id })
    res.json({ ok: true, payout: r.payout })
  } catch (err) {
    console.error('[payout] cancel failed', err)
    res.status(503).json({ error: 'unavailable' })
  }
})

app.get('/api/admin/retention', async (req, res) => {
  if (!requireAdmin(req, res)) return
  const r = String(req.query.range ?? 'all')
  const range: AnalyticsRange = r === 'today' || r === '7d' || r === '30d' || r === 'all' ? r : 'all'
  const sum = analyticsSummary(range, Date.now(), allOrders())
  res.json({ referrals: referralSummary(sum.from, sum.notifications.linksCreated), notifications: { ...sum.notifications, ...notifyLog() }, channel: await channelHealth(), leaderboard: leaderboard(dailyCoinsMap()).slice(0, 20) })
})

/** Admin: send one notification to a given Telegram id now (to test on your own account). */
app.post('/api/admin/notifications/test', async (req, res) => {
  if (!requireAdmin(req, res)) return
  // Empty id → the admin's own Telegram (ADMIN_TELEGRAM_ID). A test is sent even while reminders are off.
  const id = Number(req.body?.telegramId || process.env.ADMIN_TELEGRAM_ID)
  const kind = String(req.body?.kind ?? 'daily') as NotifKind
  if (!Number.isInteger(id) || id <= 0 || !NOTIF_KINDS.includes(kind)) {
    res.status(400).json({ error: req.body?.telegramId ? 'bad_request' : 'no_admin_telegram_id' })
    return
  }
  const t = textFor(kind, { lang: req.body?.lang === 'en' ? 'en' : 'ru' })
  const result = await sendRetentionMessage(id, t.text, { text: t.button, query: `n=${kind}` })
  console.log('[notify] admin test', { kind, result })
  res.json({ result, to: id === Number(process.env.ADMIN_TELEGRAM_ID) ? 'admin' : 'custom' })
})

app.get('/api/admin/notifications/settings', (req, res) => {
  if (!requireAdmin(req, res)) return
  res.json(notifyLog())
})

/** Admin switch for automatic notifications (NOTIFICATIONS_ENABLED=1/0 in the environment wins). */
app.post('/api/admin/notifications/settings', (req, res) => {
  if (!requireAdmin(req, res)) return
  const on = setNotificationsEnabled(req.body?.enabled === true)
  res.json({ ...notifyLog(), enabled: on })
})

/** Public, no secrets: is the channel check usable right now (the bot is an admin there)? */
let channelCache: { at: number; v: Awaited<ReturnType<typeof channelHealth>> } | null = null
app.get('/api/referral/channel-status', async (_req, res) => {
  if (!channelCache || Date.now() - channelCache.at > 60_000) channelCache = { at: Date.now(), v: await channelHealth() }
  const h = channelCache.v as { configured: boolean; channel?: string; botStatus?: string; botIsAdmin?: boolean; error?: string }
  res.json({ channel: channelId(), url: channelUrl(), botStatus: h.botStatus ?? null, botIsAdmin: Boolean(h.botIsAdmin), subscriptionCheck: Boolean(h.botIsAdmin) ? 'available' : 'unavailable', error: h.botIsAdmin ? undefined : h.error })
})

/** Admin / tests: run one notification pass now. */
app.post('/api/admin/notifications/tick', async (req, res) => {
  if (!requireAdmin(req, res)) return
  const now = Number(req.body?.now) || Date.now()
  res.json(await notifyTick(now))
})

app.get('/api/nft', (_req, res) => {
  res.json({ images: listNftMeta() })
})

app.get('/api/nft/:raffleId', (req, res) => {
  const raffleId = String(req.params.raffleId ?? '')
  if (!isNftRaffleId(raffleId)) {
    res.status(400).json({ error: 'unknown_raffle' })
    return
  }
  const file = getNftFile(raffleId)
  if (!file) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  res.setHeader('Content-Type', file.mime)
  res.setHeader('Cache-Control', 'public, max-age=60')
  res.sendFile(file.path)
})

app.post('/api/admin/nft/:raffleId', (req, res) => {
  if (!requireAdmin(req, res)) return
  const raffleId = String(req.params.raffleId ?? '')
  if (!isNftRaffleId(raffleId)) {
    res.status(400).json({ error: 'unknown_raffle' })
    return
  }
  const mime = String(req.body?.mime ?? '').trim().toLowerCase()
  const raw = String(req.body?.data ?? '')
  const base64 = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw
  if (!base64) {
    res.status(400).json({ error: 'empty_file' })
    return
  }
  try {
    const buffer = Buffer.from(base64, 'base64')
    const saved = saveNftFile(raffleId, mime, buffer)
    res.json({ ok: true, raffleId, updatedAt: saved.updatedAt })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'write_failed'
    const status = message === 'unsupported_type' || message === 'empty_file' || message === 'too_large' ? 400 : 500
    res.status(status).json({ error: message })
  }
})

app.delete('/api/admin/nft/:raffleId', (req, res) => {
  if (!requireAdmin(req, res)) return
  const raffleId = String(req.params.raffleId ?? '')
  if (!isNftRaffleId(raffleId)) {
    res.status(400).json({ error: 'unknown_raffle' })
    return
  }
  deleteNftFile(raffleId)
  res.json({ ok: true, raffleId })
})

app.get('/api/admin/telegram', async (req, res) => {
  if (!requireAdmin(req, res)) return
  const settings = getTelegramSettings()
  const identity = await botIdentity()
  res.json({
    configured: Boolean(settings.token),
    tokenMasked: maskToken(settings.token),
    webappUrl: settings.webappUrl,
    botUsername: identity?.username ?? null,
  })
})

app.post('/api/admin/telegram', async (req, res) => {
  if (!requireAdmin(req, res)) return
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : undefined
  const webappUrl = typeof req.body?.webappUrl === 'string' ? req.body.webappUrl.trim() : undefined
  const settings = saveTelegramSettings({
    ...(token !== undefined ? { token } : {}),
    ...(webappUrl !== undefined ? { webappUrl } : {}),
  })
  try {
    await startBot()
    const identity = await botIdentity()
    res.json({
      ok: true,
      configured: Boolean(settings.token),
      tokenMasked: maskToken(settings.token),
      webappUrl: settings.webappUrl,
      botUsername: identity?.username ?? null,
    })
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'bot_start_failed',
    })
  }
})

app.post('/api/me/cards', async (req, res) => {
  const { telegramId, telegramUsername } = resolveTelegramUser(req.body ?? {})
  if (!telegramId) {
    res.status(401).json({ error: 'invalid_init_data' })
    return
  }
  const incoming = Array.isArray(req.body?.cards) ? (req.body.cards as StoredCard[]) : []
  try {
    const cards = await mergeUserCards(
      telegramId,
      incoming
        .map((card) => asStoredCard(card, telegramId))
        .filter((card): card is StoredCard => Boolean(card))
        .map((card) => ({ ...card, telegramUsername: card.telegramUsername ?? telegramUsername })),
    )
    res.json({ ok: true, count: cards.length, telegramId, cards })
  } catch (err) {
    if (isDataWriteError(err)) {
      replyWriteFailed(res)
      return
    }
    res.status(500).json({ error: WRITE_RETRY_MESSAGE })
  }
})

app.post('/api/me/cards/fetch', (req, res) => {
  const { telegramId } = resolveTelegramUser(req.body ?? {})
  if (!telegramId) {
    res.status(401).json({ error: 'invalid_init_data' })
    return
  }
  res.json({ telegramId, cards: getUserCards(telegramId) })
})

app.post('/api/payments/claim', async (req, res) => {
  const { telegramId, telegramUsername } = resolveTelegramUser(req.body ?? {})
  const card = asStoredCard(req.body?.card ?? {}, telegramId)
  if (!card) {
    res.status(400).json({ error: 'invalid_card' })
    return
  }
  try {
    const payment = await upsertClaim({
      id: card.id,
      payCode: card.payCode,
      usdtExact: card.usdtExact,
      raffleId: card.raffleId,
      serial: card.serial,
      telegramId,
      telegramUsername,
      createdAt: card.purchasedAt,
      paidWith: card.paidWith || 'USDT',
    })
    if (telegramId) {
      await upsertUserCard(telegramId, {
        ...card,
        status: payment.status === 'pending' ? 'pending' : card.status,
        telegramUsername,
      })
    }
    res.json({ ok: true, payment })
    if (payment.status === 'pending') {
      void notifyPaymentClaimed(payment).catch((err) => {
        console.error('[payments claim notify]', err)
      })
    }
  } catch (err) {
    console.error('[payments claim]', { paymentId: card.id, err })
    replyWriteFailed(res)
  }
})

app.get('/api/admin/payments', (req, res) => {
  if (!requireAdmin(req, res)) return
  const status = typeof req.query.status === 'string' ? req.query.status : 'pending'
  const raffleId = typeof req.query.raffleId === 'string' ? req.query.raffleId : 'all'
  res.json({ payments: listPayments({ status, raffleId }) })
})

app.get('/api/admin/cards', (req, res) => {
  if (!requireAdmin(req, res)) return
  res.json({ cards: listAllCards() })
})

function paymentFromCard(card: StoredCard): Parameters<typeof upsertClaim>[0] {
  return {
    id: card.id,
    payCode: card.payCode,
    usdtExact: card.usdtExact,
    raffleId: card.raffleId,
    serial: card.serial,
    telegramId: card.telegramId,
    telegramUsername: card.telegramUsername,
    createdAt: card.purchasedAt,
    paidWith: card.paidWith || 'USDT',
  }
}

async function resolvePayment(rawId: unknown) {
  const id = decodeURIComponent(String(rawId ?? '')).trim()
  if (!id) return null
  const existing = getPayment(id)
  if (existing) return existing
  const card = findCardById(id)
  if (!card) return null
  return upsertClaim(paymentFromCard(card))
}

async function confirmPayment(req: express.Request, res: express.Response) {
  if (!requireAdmin(req, res)) return
  try {
    const before = await resolvePayment(req.params.id)
    if (!before) {
      res.status(404).json({ error: 'not_found' })
      return
    }
    const changed = before.status === 'pending'
    const payment = (await setPaymentStatus(before.id, 'confirmed')) ?? before
    if (changed) {
      const stored = findCardById(payment.id)
      if (stored?.status !== 'past') {
        await setCardStatusById(payment.id, 'active')
        if (payment.telegramId) {
          await setUserCardStatus(payment.telegramId, payment.id, 'active')
        }
      }
      try {
        const notifyStatus = await notifyPaymentConfirmed(payment)
        if (notifyStatus !== 'sent') {
          console.log('[telegram notify] confirm not delivered', payment.telegramId, notifyStatus)
        }
        await setPaymentNotify(payment.id, notifyStatus)
      } catch (err) {
        console.error('[telegram notify] confirm failed', err)
      }
      try {
        refreshRafflePhase(payment.raffleId)
        if (payment.telegramId) {
          const { added } = addBonusUser(payment.telegramId, payment.telegramUsername)
          if (added) {
            const bonusStatus = await notifyTelegramUser(
              payment.telegramId,
              'Вы в полугодовом розыгрыше. Не отключайте уведомления.',
            )
            if (bonusStatus !== 'sent') {
              console.log('[telegram notify] bonus enroll skip', payment.telegramId, bonusStatus)
            }
          }
        }
      } catch (err) {
        console.error('[bonus enroll]', err)
      }
    }
    res.json({ ok: true, changed, payment: getPayment(payment.id) ?? payment })
  } catch (err) {
    console.error('[payments confirm]', { paymentId: req.params.id, err })
    replyWriteFailed(res)
  }
}

async function rejectPayment(req: express.Request, res: express.Response) {
  if (!requireAdmin(req, res)) return
  try {
    const before = await resolvePayment(req.params.id)
    if (!before) {
      res.status(404).json({ error: 'not_found' })
      return
    }
    const changed = before.status === 'pending'
    const payment = (await setPaymentStatus(before.id, 'rejected')) ?? before
    if (changed) {
      const stored = findCardById(payment.id)
      if (stored?.status !== 'past') {
        await setCardStatusById(payment.id, 'rejected')
        if (payment.telegramId) {
          await setUserCardStatus(payment.telegramId, payment.id, 'rejected')
        }
      }
      try {
        const notifyStatus = await notifyPaymentRejected(payment)
        if (notifyStatus !== 'sent') {
          console.log('[telegram notify] reject not delivered', payment.telegramId, notifyStatus)
        }
        await setPaymentNotify(payment.id, notifyStatus)
      } catch (err) {
        console.error('[telegram notify] reject failed', err)
      }
    }
    res.json({ ok: true, changed, payment: getPayment(payment.id) ?? payment })
  } catch (err) {
    console.error('[payments reject]', { paymentId: req.params.id, err })
    replyWriteFailed(res)
  }
}

app.post('/api/admin/payments/:id/confirm', (req, res) => {
  void confirmPayment(req, res)
})
app.post('/api/admin/payments/:id/reject', (req, res) => {
  void rejectPayment(req, res)
})

app.get('/api/raffles', (_req, res) => {
  res.json({ raffles: publicRaffleSnapshot() })
})

app.put('/api/admin/raffles/:raffleId', (req, res) => {
  if (!requireAdmin(req, res)) return
  const raffleId = String(req.params.raffleId ?? '')
  const total = RAFFLE_TOTALS[raffleId]
  if (!total) {
    res.status(400).json({ error: 'unknown_raffle' })
    return
  }
  try {
    if (req.body?.sold != null) {
      const sold = Math.max(0, Math.min(total, Math.round(Number(req.body.sold))))
      if (!Number.isFinite(sold)) {
        res.status(400).json({ error: 'invalid_sold' })
        return
      }
      setTestSold(raffleId, sold)
    }
    const status = req.body?.status
    if (status === 'running' || status === 'stopped' || status === 'awaiting_draw' || status === 'drawn') {
      setRafflePhase(raffleId, status)
    }
    refreshRafflePhase(raffleId)
    res.json({ ok: true, raffles: publicRaffleSnapshot() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'save_failed'
    res.status(500).json({ error: message })
  }
})

app.post('/api/admin/raffles/:raffleId/reset', async (req, res) => {
  if (!requireAdmin(req, res)) return
  const raffleId = String(req.params.raffleId ?? '')
  if (!RAFFLE_TOTALS[raffleId]) {
    res.status(400).json({ error: 'unknown_raffle' })
    return
  }
  try {
    await archiveRaffleCards(raffleId)
    startNextRaffleRound(raffleId)
    refreshRafflePhase(raffleId)
    res.json({ ok: true, raffles: publicRaffleSnapshot() })
  } catch (err) {
    if (isDataWriteError(err)) {
      replyWriteFailed(res)
      return
    }
    const message = err instanceof Error ? err.message : 'reset_failed'
    res.status(500).json({ error: message })
  }
})

app.get('/api/draws', (_req, res) => {
  res.json({ draws: listPublicDraws() })
})

app.get('/api/admin/draws', (req, res) => {
  if (!requireAdmin(req, res)) return
  res.json({ draws: listDraws() })
})

app.post('/api/admin/draws/:drawId/hide', (req, res) => {
  if (!requireAdmin(req, res)) return
  const draw = hideDraw(String(req.params.drawId ?? ''))
  if (!draw) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  res.json({ ok: true, draw, draws: listDraws() })
})

app.post('/api/admin/draws/:drawId/paid', (req, res) => {
  if (!requireAdmin(req, res)) return
  const place = Number(req.body?.place)
  const paid = req.body?.paid === true
  if (!Number.isInteger(place) || place < 1) {
    res.status(400).json({ error: 'invalid_place' })
    return
  }
  const draw = setDrawWinnerPaid(String(req.params.drawId ?? ''), place, paid)
  if (!draw) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  res.json({ ok: true, draw, draws: listDraws() })
})

app.post('/api/me/bonus', (req, res) => {
  const { telegramId } = resolveTelegramUser(req.body ?? {})
  if (!telegramId) {
    res.json({ participating: false })
    return
  }
  syncBonusUsersFromCards()
  res.json({ participating: isBonusUser(telegramId) })
})

app.get('/api/admin/bonus', (req, res) => {
  if (!requireAdmin(req, res)) return
  syncBonusUsersFromCards()
  res.json({
    users: listBonusUsers(),
    draws: listDraws().filter((draw) => draw.kind === 'bonus'),
  })
})

app.post('/api/admin/bonus/draw', async (req, res) => {
  if (!requireAdmin(req, res)) return
  const prizes = Array.isArray(req.body?.prizes) ? req.body.prizes : []
  try {
    const result = await drawBonus(prizes)
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'draw_failed'
    const status = message === 'no_prizes' || message === 'no_tickets' ? 400 : 500
    res.status(status).json({ error: message })
  }
})

app.post('/api/admin/raffles/:raffleId/draw', async (req, res) => {
  if (!requireAdmin(req, res)) return
  const raffleId = String(req.params.raffleId ?? '')
  try {
    const result = await drawRaffle(raffleId)
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'draw_failed'
    const status =
      message === 'unknown_raffle' ||
      message === 'not_sold_out' ||
      message === 'already_drawn' ||
      message === 'no_tickets'
        ? 400
        : 500
    res.status(status).json({ error: message })
  }
})

// Every failure answers JSON (never Express's HTML page with a stack trace), so the
// admin sees the real reason: oversized upload, bad JSON or a blocked origin.
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    next(err)
    return
  }
  const e = err as { type?: string; status?: number; message?: string }
  if (e?.type === 'entity.too.large') {
    res.status(413).json({ error: 'too_large' })
    return
  }
  if (e?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'bad_json' })
    return
  }
  if (typeof e?.message === 'string' && e.message.startsWith('CORS blocked origin')) {
    res.status(403).json({ error: 'cors_blocked' })
    return
  }
  console.error('[api] unhandled error', err)
  res.status(typeof e?.status === 'number' ? e.status : 500).json({ error: 'server_error' })
})

// Players known before referrals existed are "old": queued first, before any session can run.
void backfillOnce({ dailyIds: dailyUsers().map((d) => d.telegramId), starsIds: [...new Set(allOrders().map((o) => o.telegramUserId))] })
  .then((r) => console.log('[retention] backfill', r))
  .catch((err) => console.error('[retention] backfill failed', err))
void backfillMissionProgress().then((n) => n && console.log('[retention] mission progress backfilled', n))
void migrateStarsModel().then((r) => r.done && console.log('[retention] stars model v2', r))
startNotifier()

app.listen(port, '0.0.0.0', () => {
  loadWalletsFromDisk()
  hideKnownTestDraws()
  console.log(`DuckJackpot API listening on 0.0.0.0:${port}`)
  console.log(`DATA_DIR ${DATA_DIR}`)
  console.log(`WALLETS ${walletsFilePath()}`)
  void startBot()
  void startSupportBot()
})
