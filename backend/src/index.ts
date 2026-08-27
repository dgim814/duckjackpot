import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { botIdentity, notifyTelegramUser, startBot } from './bot.js'
import { getUserCards, listAllCards, mergeUserCards, setUserCardStatus, upsertUserCard, type StoredCard } from './cardStore.js'
import { adminPassword, DATA_DIR, getTelegramSettings, maskToken, saveTelegramSettings } from './config.js'
import { deleteNftFile, getNftFile, isNftRaffleId, listNftMeta, saveNftFile } from './nftStore.js'
import { getPayWallets, isTonPayAddress, isTronPayAddress, savePayWallets } from './walletsStore.js'
import { drawRaffle } from './draw.js'
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

app.post('/api/me/cards', (req, res) => {
  const { telegramId, telegramUsername } = resolveTelegramUser(req.body ?? {})
  if (!telegramId) {
    res.status(401).json({ error: 'invalid_init_data' })
    return
  }
  const incoming = Array.isArray(req.body?.cards) ? (req.body.cards as StoredCard[]) : []
  const cards = mergeUserCards(
    telegramId,
    incoming
      .map((card) => asStoredCard(card, telegramId))
      .filter((card): card is StoredCard => Boolean(card))
      .map((card) => ({ ...card, telegramUsername: card.telegramUsername ?? telegramUsername })),
  )
  res.json({ ok: true, count: cards.length, telegramId, cards })
})

app.post('/api/me/cards/fetch', (req, res) => {
  const { telegramId } = resolveTelegramUser(req.body ?? {})
  if (!telegramId) {
    res.status(401).json({ error: 'invalid_init_data' })
    return
  }
  res.json({ telegramId, cards: getUserCards(telegramId) })
})

app.post('/api/payments/claim', (req, res) => {
  const { telegramId, telegramUsername } = resolveTelegramUser(req.body ?? {})
  const card = asStoredCard(req.body?.card ?? {}, telegramId)
  if (!card) {
    res.status(400).json({ error: 'invalid_card' })
    return
  }
  const payment = upsertClaim({
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
    upsertUserCard(telegramId, {
      ...card,
      status: payment.status === 'pending' ? 'pending' : card.status,
      telegramUsername,
    })
  }
  res.json({ ok: true, payment })
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

app.post('/api/admin/payments/:id/confirm', async (req, res) => {
  if (!requireAdmin(req, res)) return
  const id = String(req.params.id ?? '')
  const before = getPayment(id)
  if (!before) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  const changed = before.status === 'pending'
  const payment = setPaymentStatus(id, 'confirmed') ?? before
  if (changed && payment.telegramId) {
    setUserCardStatus(payment.telegramId, payment.id, 'active')
    const serial = String(payment.serial).padStart(4, '0')
    const notifyStatus = await notifyTelegramUser(
      payment.telegramId,
      `Оплата подтверждена, карточка №${serial} добавлена.`,
    )
    setPaymentNotify(payment.id, notifyStatus)
  }
  res.json({ ok: true, changed, payment: getPayment(id) ?? payment })
})

app.post('/api/admin/payments/:id/reject', (req, res) => {
  if (!requireAdmin(req, res)) return
  const id = String(req.params.id ?? '')
  const before = getPayment(id)
  if (!before) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  const changed = before.status === 'pending'
  const payment = setPaymentStatus(id, 'rejected') ?? before
  if (changed && payment.telegramId) {
    setUserCardStatus(payment.telegramId, payment.id, 'rejected')
  }
  res.json({ ok: true, changed, payment })
})

app.post('/api/admin/raffles/:raffleId/draw', async (req, res) => {
  if (!requireAdmin(req, res)) return
  const raffleId = String(req.params.raffleId ?? '')
  try {
    const result = await drawRaffle(raffleId)
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'draw_failed'
    const status = message === 'unknown_raffle' ? 400 : 500
    res.status(status).json({ error: message })
  }
})

app.listen(port, '0.0.0.0', () => {
  console.log(`DuckJackpot API listening on 0.0.0.0:${port}`)
  console.log(`DATA_DIR ${DATA_DIR}`)
  void startBot()
})
