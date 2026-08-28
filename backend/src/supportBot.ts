import {
  supportBotToken,
  supportBotWebhookSecret,
  supportBotWebhookUrl,
} from './config.js'
import { getSupportTicket, rememberSupportTicket } from './supportStore.js'

type TelegramUser = {
  id: number
  is_bot?: boolean
  first_name?: string
  username?: string
}

type TelegramMessage = {
  message_id: number
  from?: TelegramUser
  chat: { id: number; type?: string }
  text?: string
  caption?: string
  reply_to_message?: TelegramMessage
}

export type SupportTelegramUpdate = {
  update_id: number
  message?: TelegramMessage
}

type ApiResult<T> = { ok: true; result: T } | { ok: false; description?: string }

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

async function sendText(token: string, chatId: number, text: string) {
  return telegramApi<{ message_id: number }>(token, 'sendMessage', {
    chat_id: chatId,
    text,
  })
}

function messageBody(message: TelegramMessage) {
  return (message.text ?? message.caption ?? '').trim()
}

async function handleAdminReply(token: string, message: TelegramMessage) {
  const replyId = message.reply_to_message?.message_id
  if (!replyId) return
  const ticket = getSupportTicket(replyId)
  if (!ticket) {
    await sendText(
      token,
      message.chat.id,
      'Не найден пользователь для этого ответа. Ответьте reply на пересланное обращение.',
    )
    return
  }
  const text = messageBody(message)
  if (text) {
    await sendText(token, ticket.chatId, text)
    return
  }
  await telegramApi(token, 'copyMessage', {
    chat_id: ticket.chatId,
    from_chat_id: message.chat.id,
    message_id: message.message_id,
  })
}

async function notifyAdminOnline(token: string) {
  const adminId = Number(process.env.ADMIN_TELEGRAM_ID)
  console.log('[support-bot] ADMIN_TELEGRAM_ID', adminId)
  if (!Number.isFinite(adminId) || adminId === 0) {
    console.error('[support-bot] ADMIN_TELEGRAM_ID is missing or invalid')
    return
  }
  try {
    await sendText(token, adminId, 'Support bot online')
    console.log('[support-bot] sent online ping to admin', adminId)
  } catch (err) {
    console.error('[support-bot] online ping failed — admin must /start the support bot first', err)
  }
}

export async function handleSupportUpdate(update: SupportTelegramUpdate) {
  const token = supportBotToken()
  const message = update.message
  const adminId = Number(process.env.ADMIN_TELEGRAM_ID)
  console.log('[support-bot] incoming', {
    update_id: update.update_id,
    hasToken: Boolean(token),
    adminId,
    chatId: message?.chat?.id,
    fromId: message?.from?.id,
    username: message?.from?.username ?? null,
    text: message?.text ?? message?.caption ?? null,
  })
  if (update.update_id == null) return
  if (!token) {
    console.error('[support-bot] SUPPORT_BOT_TOKEN is empty')
    return
  }
  if (!message) {
    console.log('[support-bot] update without message, skip')
    return
  }
  if (message.from?.is_bot) {
    console.log('[support-bot] skip bot sender')
    return
  }

  try {
    if (message.from?.id === adminId && message.reply_to_message) {
      await handleAdminReply(token, message)
      return
    }

    const username = message.from?.username ? `@${message.from.username}` : '@unknown'
    const userId = message.from?.id ?? message.chat.id
    const text = messageBody(message) || '(без текста)'
    const adminText = `Поддержка: ${username} / ${userId} / ${text}`

    if (!Number.isFinite(adminId) || adminId === 0) {
      console.error('[support-bot] cannot notify admin, ADMIN_TELEGRAM_ID=', process.env.ADMIN_TELEGRAM_ID)
    } else {
      const forwarded = await sendText(token, adminId, adminText)
      console.log('[support-bot] forwarded to admin', adminId, 'msg', forwarded.message_id)
      rememberSupportTicket(forwarded.message_id, {
        userId,
        chatId: message.chat.id,
        username: message.from?.username,
        at: Date.now(),
      })
    }

    await sendText(token, message.chat.id, 'Сообщение принято')
  } catch (err) {
    console.error('[support-bot] handle failed', err)
  }
}

export function isSupportWebhookAuthorized(header: string | undefined) {
  const secret = supportBotWebhookSecret()
  if (!secret) return true
  return header === secret
}

export async function stopSupportBot() {
  stopPolling?.()
  stopPolling = null
  if (pollLoop) {
    await pollLoop.catch(() => undefined)
    pollLoop = null
  }
}

export async function startSupportBot() {
  await stopSupportBot()
  const token = supportBotToken()
  if (!token) {
    console.log('Support bot: no SUPPORT_BOT_TOKEN — skipping')
    return
  }
  console.log('[support-bot] ADMIN_TELEGRAM_ID', Number(process.env.ADMIN_TELEGRAM_ID))

  const webhookUrl = supportBotWebhookUrl()
  if (webhookUrl) {
    try {
      const secret = supportBotWebhookSecret()
      await telegramApi(token, 'setWebhook', {
        url: webhookUrl,
        allowed_updates: ['message'],
        drop_pending_updates: false,
        ...(secret ? { secret_token: secret } : {}),
      })
      console.log(`Support bot webhook ${webhookUrl}`)
      await notifyAdminOnline(token)
      return
    } catch (err) {
      console.error('[support-bot webhook]', err)
      console.log('Support bot: falling back to polling')
    }
  }

  try {
    await telegramApi(token, 'deleteWebhook', { drop_pending_updates: false })
  } catch (err) {
    console.error('[support-bot deleteWebhook]', err)
  }

  let offset = 0
  let running = true
  const abort = new AbortController()
  stopPolling = () => {
    running = false
    abort.abort()
  }

  pollLoop = (async () => {
    console.log('Support bot polling started')
    await notifyAdminOnline(token)
    while (running) {
      try {
        const updates = await telegramApi<SupportTelegramUpdate[]>(
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
          await handleSupportUpdate(update)
        }
      } catch (err) {
        if (!running || abort.signal.aborted) break
        console.error('[support-bot poll]', err)
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
    }
  })()
}
