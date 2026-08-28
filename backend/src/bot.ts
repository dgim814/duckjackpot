import { getChat, rememberChat } from './chatStore.js'
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
  if (message.from?.id && !message.from.is_bot) {
    rememberChat({
      telegramId: message.from.id,
      chatId: message.chat.id,
      username: message.from.username,
      firstName: message.from.first_name,
    })
  }
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

export async function notifyTelegramUser(
  telegramId: number,
  text: string,
): Promise<'sent' | 'no_chat' | 'failed'> {
  const { token } = getTelegramSettings()
  if (!token) {
    console.log('[telegram notify] no TELEGRAM_BOT_TOKEN, skip user', telegramId)
    return 'failed'
  }
  const chatId = getChat(telegramId)?.chatId ?? telegramId
  try {
    await sendMessage(token, chatId, text)
    return 'sent'
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/forbidden|chat not found|blocked|can't initiate|deactivated/i.test(message)) {
      console.log('[telegram notify] cannot message user', telegramId, message)
      return 'no_chat'
    }
    console.error('[telegram notify]', err)
    return 'failed'
  }
}

export async function notifyTelegramAdmin(text: string): Promise<'sent' | 'failed'> {
  const { token } = getTelegramSettings()
  const adminId = Number(process.env.ADMIN_TELEGRAM_ID)
  if (!token) {
    console.error('[telegram admin] no TELEGRAM_BOT_TOKEN')
    return 'failed'
  }
  if (!Number.isFinite(adminId) || adminId === 0) {
    console.error('[telegram admin] invalid ADMIN_TELEGRAM_ID', process.env.ADMIN_TELEGRAM_ID)
    return 'failed'
  }
  try {
    await telegramApi(token, 'sendMessage', { chat_id: adminId, text })
    return 'sent'
  } catch (err) {
    console.error('[telegram admin] send failed', err)
    return 'failed'
  }
}

function raffleLabel(raffleId: string) {
  return RAFFLE_LABEL[raffleId] ?? raffleId
}

function cardNumber(serial: number) {
  return `#${String(serial).padStart(4, '0')}`
}

export type PaymentNotifyInput = {
  payCode?: string
  usdtExact?: number
  raffleId: string
  serial: number
  telegramId?: number
  telegramUsername?: string
}

export async function notifyPaymentClaimed(payment: PaymentNotifyInput) {
  const code = payment.payCode?.trim() || 'DJ-…'
  const amount = typeof payment.usdtExact === 'number' ? String(payment.usdtExact) : '—'
  const username = payment.telegramUsername ? `@${payment.telegramUsername}` : '@unknown'
  const telegramId = payment.telegramId ?? '—'
  const card = cardNumber(payment.serial)
  try {
    await notifyTelegramAdmin(
      [
        'Новая заявка',
        `Код: ${code}`,
        `Сумма: ${amount} USDT`,
        `Коллекция: ${raffleLabel(payment.raffleId)}`,
        `Карточка: ${card}`,
        `Telegram: ${username} / ${telegramId}`,
      ].join('\n'),
    )
  } catch (err) {
    console.error('[telegram notify] admin claim failed', err)
  }
  if (typeof payment.telegramId !== 'number') return
  rememberChat({
    telegramId: payment.telegramId,
    chatId: getChat(payment.telegramId)?.chatId ?? payment.telegramId,
    username: payment.telegramUsername,
  })
  const status = await notifyTelegramUser(
    payment.telegramId,
    `Заявка ${code} принята. Когда админ подтвердит перевод, карточка появится в «Мои карточки».`,
  )
  if (status !== 'sent') {
    console.log('[telegram notify] user claim not delivered', payment.telegramId, status)
  }
}

export async function notifyPaymentConfirmed(payment: PaymentNotifyInput) {
  if (typeof payment.telegramId !== 'number') {
    console.log('[telegram notify] confirm: no telegramId')
    return 'no_chat' as const
  }
  const code = payment.payCode?.trim() || 'DJ-…'
  const card = cardNumber(payment.serial)
  return notifyTelegramUser(payment.telegramId, `Оплата ${code} подтверждена. Карточка ${card} выдана.`)
}

export async function notifyPaymentRejected(payment: PaymentNotifyInput) {
  if (typeof payment.telegramId !== 'number') {
    console.log('[telegram notify] reject: no telegramId')
    return 'no_chat' as const
  }
  const code = payment.payCode?.trim() || 'DJ-…'
  return notifyTelegramUser(payment.telegramId, `Заявка ${code} отклонена. Напишите в Поддержку.`)
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
