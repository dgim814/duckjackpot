import { getUserCards, type StoredCard } from './cardStore.js'
import { getTelegramSettings } from './config.js'

type TelegramUser = {
  id: number
  is_bot?: boolean
  first_name?: string
  username?: string
}

type TelegramMessage = {
  message_id: number
  from?: TelegramUser
  chat: { id: number }
  text?: string
}

type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
}

type ApiResult<T> = { ok: true; result: T } | { ok: false; description?: string }

const RAFFLE_LABEL: Record<string, string> = {
  classic: 'Основной',
  fast200: 'Быстрый · 200',
  fast100: 'Быстрый · 100',
}

let stopPolling: (() => void) | null = null
let pollLoop: Promise<void> | null = null

async function telegramApi<T>(
  token: string,
  method: string,
  body?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })
  const data = (await res.json()) as ApiResult<T>
  if (!data.ok) throw new Error(data.description || method)
  return data.result
}

function publicWebappUrl(path = '/') {
  const base = getTelegramSettings().webappUrl.replace(/\/$/, '')
  if (!base) return ''
  if (path === '/' || path === '') return `${base}/`
  const hashPath = path.startsWith('/') ? path : `/${path}`
  return `${base}/#${hashPath}`
}

function webAppKeyboard(path = '/') {
  const url = publicWebappUrl(path)
  if (!url) return undefined
  return {
    inline_keyboard: [[{ text: 'Открыть Mini App', web_app: { url } }]],
  }
}

function formatCard(card: StoredCard) {
  const raffle = RAFFLE_LABEL[card.raffleId] ?? card.raffleId
  const status = card.status === 'pending' ? 'ожидает оплату' : 'подтверждена'
  return `${card.payCode} · ${raffle} · №${card.serial} · ${status}`
}

async function sendMessage(token: string, chatId: number, text: string, path?: string) {
  await telegramApi(token, 'sendMessage', {
    chat_id: chatId,
    text,
    reply_markup: webAppKeyboard(path ?? '/'),
  })
}

async function handleMessage(token: string, message: TelegramMessage) {
  const text = (message.text ?? '').trim()
  const chatId = message.chat.id
  const command = text.split(/\s+/)[0]?.split('@')[0]
  if (command === '/start') {
    const name = message.from?.first_name ? `, ${message.from.first_name}` : ''
    await sendMessage(
      token,
      chatId,
      `Привет${name}! Это DuckJackpot.\n\nКоллекционные карточки и розыгрыш призов в USDT. Нажмите кнопку, чтобы открыть Mini App.`,
      '/',
    )
    return
  }
  if (command === '/cards') {
    const userId = message.from?.id
    if (!userId) return
    const cards = getUserCards(userId)
    if (cards.length === 0) {
      await sendMessage(
        token,
        chatId,
        'Пока нет карточек, привязанных к вашему Telegram. Откройте Mini App, купите карточку — и они появятся здесь.',
        '/cards',
      )
      return
    }
    const list = cards
      .slice(0, 20)
      .map((card) => `• ${formatCard(card)}`)
      .join('\n')
    const extra = cards.length > 20 ? `\n\n…и ещё ${cards.length - 20}` : ''
    await sendMessage(token, chatId, `Ваши карточки:\n\n${list}${extra}`, '/cards')
  }
}

async function applyMenuAndCommands(token: string) {
  await telegramApi(token, 'setMyCommands', {
    commands: [
      { command: 'start', description: 'Открыть DuckJackpot' },
      { command: 'cards', description: 'Мои карточки' },
    ],
  })
  const url = publicWebappUrl('/')
  if (url) {
    await telegramApi(token, 'setChatMenuButton', {
      menu_button: {
        type: 'web_app',
        text: 'Mini App',
        web_app: { url },
      },
    })
  }
}

export async function stopBot() {
  stopPolling?.()
  stopPolling = null
  if (pollLoop) {
    await pollLoop.catch(() => undefined)
    pollLoop = null
  }
}

export async function startBot() {
  await stopBot()
  const { token, webappUrl } = getTelegramSettings()
  if (!token) {
    console.log('Telegram bot: no TELEGRAM_BOT_TOKEN — skipping')
    return
  }
  try {
    await applyMenuAndCommands(token)
  } catch (err) {
    console.error('Telegram menu/commands failed:', err)
  }

  let offset = 0
  let running = true
  const abort = new AbortController()
  stopPolling = () => {
    running = false
    abort.abort()
  }

  pollLoop = (async () => {
    console.log('Telegram bot polling started')
    if (!webappUrl) console.log('Set TELEGRAM_WEBAPP_URL to enable Menu Button and Mini App links')
    while (running) {
      try {
        const updates = await telegramApi<TelegramUpdate[]>(
          token,
          'getUpdates',
          {
            offset,
            timeout: 25,
            allowed_updates: ['message'],
          },
          abort.signal,
        )
        for (const update of updates) {
          offset = update.update_id + 1
          if (update.message) {
            try {
              await handleMessage(token, update.message)
            } catch (err) {
              console.error('[telegram message]', err)
            }
          }
        }
      } catch (err) {
        if (!running || abort.signal.aborted) break
        console.error('[telegram poll]', err)
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
    }
  })()
}

export async function botIdentity() {
  const { token } = getTelegramSettings()
  if (!token) return null
  try {
    const me = await telegramApi<{ id: number; username?: string }>(token, 'getMe')
    return { username: me.username, id: me.id }
  } catch {
    return null
  }
}
