import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { botIdentity, notifyPaymentClaimed, notifyPaymentConfirmed, notifyPaymentRejected, notifyTelegramUser, startBot } from './bot.js'
import { archiveRaffleCards, findCardById, getUserCards, listAllCards, mergeUserCards, setCardStatusById, setUserCardStatus, upsertUserCard, type StoredCard } from './cardStore.js'
import { adminPassword, DATA_DIR, getTelegramSettings, maskToken, saveTelegramSettings } from './config.js'
import { deleteNftFile, getNftFile, isNftRaffleId, listNftMeta, saveNftFile } from './nftStore.js'
import { handleSupportUpdate, isSupportWebhookAuthorized, startSupportBot, type SupportTelegramUpdate } from './supportBot.js'
import { getPayWallets, isTonPayAddress, isTronPayAddress, loadWalletsFromDisk, savePayWallets, walletsFilePath } from './walletsStore.js'
import { drawBonus, drawRaffle, publicRaffleSnapshot, refreshRafflePhase } from './draw.js'
import { listDraws } from './drawStore.js'
import { addBonusUser, isBonusUser, listBonusUsers, syncBonusUsersFromCards } from './bonusStore.js'
import { setRafflePhase, setTestSold, startNextRaffleRound } from './raffleStore.js'
import { RAFFLE_TOTALS } from './prizes.js'
import { isDataWriteError, WRITE_RETRY_MESSAGE } from './dataQueue.js'
import { getPayment, listPayments, setPaymentNotify, setPaymentStatus, upsertClaim } from './paymentStore.js'
import { verifyInitData } from './verifyInitData.js'

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
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-password'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
)
app.use(express.json({ limit: '8mb' }))

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
  const password = String(req.header('x-admin-password') ?? req.body?.adminPassword ?? '')
  if (password !== adminPassword()) {
    res.status(401).json({ error: 'unauthorized' })
    return false
  }
  return true
}

function replyWriteFailed(res: express.Response) {
  res.status(503).json({ error: WRITE_RETRY_MESSAGE })
}

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
  res.json({ draws: listDraws() })
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

app.listen(port, '0.0.0.0', () => {
  loadWalletsFromDisk()
  console.log(`DuckJackpot API listening on 0.0.0.0:${port}`)
  console.log(`DATA_DIR ${DATA_DIR}`)
  console.log(`WALLETS ${walletsFilePath()}`)
  void startBot()
  void startSupportBot()
})
