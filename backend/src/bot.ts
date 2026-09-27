import { getChat, rememberChat } from './chatStore.js'
import { getUserCards, type StoredCard } from './cardStore.js'
import { channelId, getTelegramSettings } from './config.js'
import { recordEvents } from './analyticsStore.js'
import { touchSession } from './retentionStore.js'
import { applySuccessfulPayment, checkPreCheckout, invoiceTexts, STARS_PRODUCTS, type PreCheckout, type StarsOrder, type SuccessfulPayment } from './starsStore.js'

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
  successful_payment?: SuccessfulPayment
}

type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
  pre_checkout_query?: PreCheckout
}

/** Telegram Bot API base; overridable only so tests can point it at a local mock. */
const API_BASE = (process.env.TELEGRAM_API_BASE ?? 'https://api.telegram.org').replace(/\/$/, '')

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
  const res = await fetch(`${API_BASE}/bot${token}/${method}`, {
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

/** Stars payment done: deliver once (idempotent), record analytics, tell the player. */
async function handleSuccessfulPayment(token: string, message: TelegramMessage) {
  const p = message.successful_payment!
  const outcome = await applySuccessfulPayment(message.from?.id, p)
  const o = outcome.order
  console.log('[stars] successful_payment', { result: outcome.result, order: o?.id, product: o?.productId, reason: outcome.result === 'rejected' ? outcome.reason : undefined })
  if (outcome.result === 'delivered' && o) {
    try {
      recordEvents(`tg:${o.telegramUserId}`, 'bot', [
        {
          name: 'stars_payment_success',
          props: { productId: o.productId, starsAmount: o.starsAmount, orderId: o.id, telegramPaymentChargeId: o.telegramPaymentChargeId, purchaseStatus: o.status, tier: String(o.tier) },
        },
      ])
    } catch (err) {
      console.error('[stars] analytics failed', err)
    }
    const name = STARS_PRODUCTS[o.productId]?.title[o.lang] ?? o.productId
    const text =
      o.lang === 'ru'
        ? `✓ Оплата получена: ${name} (уровень ${o.tier + 1}). Улучшение уже в игре — откройте Duck Heist.`
        : `✓ Payment received: ${name} (level ${o.tier + 1}). The upgrade is in your game — open Duck Heist.`
    await sendMessage(token, message.chat.id, text, '/heist').catch((err) => console.error('[stars] notify failed', err))
  } else if (outcome.result === 'rejected') {
    await sendMessage(token, message.chat.id, 'Оплата получена, но заказ не удалось выдать автоматически. Напишите /paysupport — мы разберёмся.').catch(() => undefined)
  }
}

async function handleMessage(token: string, message: TelegramMessage) {
  if (message.successful_payment) {
    await handleSuccessfulPayment(token, message)
    return
  }
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
    // t.me/<bot>?start=ref_<code>: Telegram itself says who pressed it (message.from), so it is verified.
    const payload = text.split(/\s+/)[1] ?? ''
    const ref = /^ref_([A-Za-z0-9]{6,16})$/.exec(payload)
    if (ref && message.from?.id && !message.from.is_bot) {
      try {
        const r = await touchSession({ id: message.from.id, name: message.from.first_name, username: message.from.username, refCode: ref[1], via: 'start', allowsWriteToPm: true })
        if (r.referral.kind === 'opened') recordEvents(`tg:${message.from.id}`, 'bot', [{ name: 'referral_opened', props: { step: 'start' } }])
      } catch (err) {
        console.error('[referral] /start failed', err)
      }
    }
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
    return
  }
  if (command === '/paysupport') {
    await sendMessage(
      token,
      chatId,
      'Вопросы по оплате Telegram Stars: напишите в @DuckJackpotSupportBot. Укажите дату покупки, товар и, если есть, номер платежа из чека Telegram. Мы ответим и разберём каждый случай. Автоматических возвратов сейчас нет — возврат делается вручную после проверки.',
    )
    return
  }
  if (command === '/heist') {
    await sendMessage(
      token,
      chatId,
      'Duck Heist — ограбление банка. Камера, охранник, лут. Уйти или идти дальше. Откройте Mini App.',
      '/heist',
    )
  }
}

async function applyMenuAndCommands(token: string) {
  await telegramApi(token, 'setMyCommands', {
    commands: [
      { command: 'start', description: 'Открыть DuckJackpot' },
      { command: 'cards', description: 'Мои карточки' },
      { command: 'heist', description: 'Duck Heist' },
      { command: 'paysupport', description: 'Вопросы по оплате Stars' },
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
            allowed_updates: ['message', 'pre_checkout_query'],
          },
          abort.signal,
        )
        for (const update of updates) {
          offset = update.update_id + 1
          if (update.pre_checkout_query) {
            const q = update.pre_checkout_query
            const verdict = checkPreCheckout(q)
            try {
              await telegramApi(token, 'answerPreCheckoutQuery', verdict.ok ? { pre_checkout_query_id: q.id, ok: true } : { pre_checkout_query_id: q.id, ok: false, error_message: verdict.error })
            } catch (err) {
              console.error('[stars] answerPreCheckoutQuery failed', err)
            }
            console.log('[stars] pre_checkout', { ok: verdict.ok, payload: q.invoice_payload })
            continue
          }
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

/** Stars invoice link for an order (currency XTR, one price, no provider token). */
export async function createStarsInvoiceLink(order: StarsOrder) {
  const { token } = getTelegramSettings()
  if (!token) throw new Error('bot_not_configured')
  const t = invoiceTexts(order)
  return telegramApi<string>(token, 'createInvoiceLink', {
    title: t.title,
    description: t.description,
    payload: order.payload,
    currency: 'XTR',
    prices: [{ label: t.label, amount: order.starsAmount }],
  })
}

/** Whether this server can sell Stars: a bot token is configured and the update poller runs. */
export function starsBotState() {
  return { configured: Boolean(getTelegramSettings().token), polling: pollLoop !== null }
}

// ---------- retention: notifications, channel check, share ----------

export type SendResult = 'sent' | 'blocked' | 'failed' | 'no_bot'

/** A short bot message with one button that opens the Mini App (web_app) at `query`. */
export async function sendRetentionMessage(telegramId: number, text: string, button: { text: string; query: string }): Promise<SendResult> {
  const { token, webappUrl } = getTelegramSettings()
  if (!token) return 'no_bot'
  const base = webappUrl.replace(/\/$/, '')
  const reply_markup = base ? { inline_keyboard: [[{ text: button.text, web_app: { url: `${base}/?${button.query}` } }]] } : undefined
  try {
    await telegramApi(token, 'sendMessage', { chat_id: getChat(telegramId)?.chatId ?? telegramId, text, reply_markup })
    return 'sent'
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/forbidden|blocked|chat not found|can't initiate|deactivated/i.test(message)) return 'blocked'
    console.error('[notify] send failed', message)
    return 'failed'
  }
}

export type ChannelCheck = { ok: true; subscribed: boolean; status: string } | { ok: false; error: string }

/** Official check: getChatMember on the configured channel. The bot must be an admin there. */
export async function checkChannelMember(userId: number): Promise<ChannelCheck> {
  const { token } = getTelegramSettings()
  const channel = channelId()
  if (!token) return { ok: false, error: 'bot_not_configured' }
  if (!channel) return { ok: false, error: 'channel_not_configured' }
  try {
    const m = await telegramApi<{ status: string; is_member?: boolean }>(token, 'getChatMember', { chat_id: channel, user_id: userId })
    const subscribed = m.status === 'member' || m.status === 'administrator' || m.status === 'creator' || (m.status === 'restricted' && m.is_member === true)
    return { ok: true, subscribed, status: m.status }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // "user not found" for a channel = the user is not in it.
    if (/user not found|PARTICIPANT_ID_INVALID/i.test(message)) return { ok: true, subscribed: false, status: 'left' }
    console.error('[channel] getChatMember failed', message)
    return { ok: false, error: /not enough rights|member list is inaccessible|administrator|chat not found|bot is not a member/i.test(message) ? 'bot_not_admin' : 'telegram_error' }
  }
}

/** Channel health for the admin: does the channel exist and is the bot an administrator there? */
export async function channelHealth() {
  const { token } = getTelegramSettings()
  const channel = channelId()
  if (!token) return { configured: false, error: 'bot_not_configured' }
  if (!channel) return { configured: false, error: 'TELEGRAM_CHANNEL_ID is not set' }
  try {
    const me = await telegramApi<{ id: number }>(token, 'getMe')
    const m = await telegramApi<{ status: string }>(token, 'getChatMember', { chat_id: channel, user_id: me.id })
    return { configured: true, channel, botStatus: m.status, botIsAdmin: m.status === 'administrator' || m.status === 'creator' }
  } catch (err) {
    return { configured: true, channel, error: err instanceof Error ? err.message : String(err) }
  }
}

let cachedUsername: string | null = null
export async function botUsername() {
  if (cachedUsername) return cachedUsername
  const me = await botIdentity()
  cachedUsername = me?.username ?? null
  return cachedUsername
}

/** A share-ready invite (message + ▶ button) the player sends with Telegram's native share sheet. */
export async function prepareInviteMessage(userId: number, t: { title: string; text: string; url: string; button: string }) {
  const { token } = getTelegramSettings()
  if (!token) throw new Error('bot_not_configured')
  const r = await telegramApi<{ id: string }>(token, 'savePreparedInlineMessage', {
    user_id: userId,
    result: {
      type: 'article',
      id: `inv${Date.now().toString(36)}`,
      title: t.title,
      input_message_content: { message_text: t.text },
      reply_markup: { inline_keyboard: [[{ text: t.button, url: t.url }]] },
    },
    allow_user_chats: true,
    allow_group_chats: true,
  })
  return r.id
}
