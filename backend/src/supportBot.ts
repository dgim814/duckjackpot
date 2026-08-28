import {
  adminTelegramId,
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

const USER_ACK =
  'Сообщение принято. Напишите код платежа DJ-… и номер карточки. Ответим здесь.'

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

function userLabel(user?: TelegramUser) {
  const username = user?.username ? `@${user.username}` : 'без username'
  const name = user?.first_name?.trim() || '—'
  const id = user?.id ?? 0
  return { username, name, id }
}

function messageBody(message: TelegramMessage) {
  return (message.text ?? message.caption ?? '').trim()
}

async function handleAdminReply(token: string, message: TelegramMessage) {
  const replyId = message.reply_to_message?.message_id
  if (!replyId) return
  const ticket = getSupportTicket(replyId)
  if (!ticket) {
    await sendText(token, message.chat.id, 'Не найден пользователь для этого ответа. Ответьте reply на пересланное обращение.')
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

async function handleUserMessage(token: string, message: TelegramMessage) {
  const adminId = adminTelegramId()
  await sendText(token, message.chat.id, USER_ACK)

  const command = (message.text ?? '').trim().split(/\s+/)[0]?.split('@')[0]
  if (command === '/start') return

  if (!adminId) {
    console.error('[support-bot] ADMIN_TELEGRAM_ID is not set')
    return
  }

  const { username, name, id } = userLabel(message.from)
  const body = messageBody(message) || '(сообщение без текста)'
  const forwarded = await sendText(
    token,
    adminId,
    `Обращение в поддержку\n\nОт: ${username}\nИмя: ${name}\nTelegram ID: ${id}\n\n${body}`,
  )
  rememberSupportTicket(forwarded.message_id, {
    userId: id,
    chatId: message.chat.id,
    username: message.from?.username,
    at: Date.now(),
  })
}

export async function handleSupportUpdate(update: SupportTelegramUpdate) {
  const token = supportBotToken()
  const message = update.message
  if (!token || !message?.from || message.from.is_bot) return

  const adminId = adminTelegramId()
  const fromAdmin = adminId > 0 && message.from.id === adminId
  try {
    if (fromAdmin) {
      await handleAdminReply(token, message)
      return
    }
    await handleUserMessage(token, message)
  } catch (err) {
    console.error('[support-bot message]', err)
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
  if (!adminTelegramId()) {
    console.log('Support bot: ADMIN_TELEGRAM_ID is not set — user messages will not be forwarded')
  }

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
