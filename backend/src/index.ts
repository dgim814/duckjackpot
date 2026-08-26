import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { botIdentity, startBot } from './bot.js'
import { saveUserCards, type StoredCard } from './cardStore.js'
import { adminPassword, getTelegramSettings, maskToken, saveTelegramSettings } from './config.js'
import { verifyInitData } from './verifyInitData.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT ?? 3001)

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
app.use(express.json({ limit: '1mb' }))

function requireAdmin(req: express.Request, res: express.Response) {
  const password = String(req.header('x-admin-password') ?? req.body?.adminPassword ?? '')
  if (password !== adminPassword()) {
    res.status(401).json({ error: 'unauthorized' })
    return false
  }
  return true
}

app.get('/api/health', (_req, res) => {
  const settings = getTelegramSettings()
  res.json({
    status: 'ok',
    app: 'DuckJackpot',
    telegram: Boolean(settings.token),
  })
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
  const initData = typeof req.body?.initData === 'string' ? req.body.initData : ''
  const { token } = getTelegramSettings()
  const user = verifyInitData(initData, token)
  if (!user) {
    res.status(401).json({ error: 'invalid_init_data' })
    return
  }
  const incoming = Array.isArray(req.body?.cards) ? (req.body.cards as StoredCard[]) : []
  const cards = incoming.filter((card) => card && typeof card.id === 'string' && typeof card.serial === 'number')
  saveUserCards(user.id, cards)
  res.json({ ok: true, count: cards.length, telegramId: user.id })
})

app.listen(port, () => {
  console.log(`DuckJackpot API listening on http://localhost:${port}`)
  void startBot()
})
