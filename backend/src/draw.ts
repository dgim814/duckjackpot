import { randomBytes, randomUUID } from 'node:crypto'
import { notifyTelegramUser } from './bot.js'
import { getActiveCardsForRaffle, type StoredCard } from './cardStore.js'
import { getChat } from './chatStore.js'
import { RAFFLE_PRIZES } from './prizes.js'

export type NotifyStatus = 'sent' | 'no_chat' | 'failed'

export type DrawnWinner = {
  id: string
  raffleId: string
  place: number
  amount: string
  telegramId: number
  telegramUsername?: string
  name: string
  payCode: string
  serial: number
  notifyStatus: NotifyStatus
}

function shuffle<T>(items: T[]) {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const bytes = randomBytes(4)
    const j = bytes.readUInt32BE(0) % (i + 1)
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
  }
  return next
}

function winnerText(place: number, amount: string) {
  return `Поздравляем! Вы заняли ${place} место в розыгрыше DuckJackpot. Приз: ${amount}. Мы свяжемся с вами для выплаты.`
}

export async function drawRaffle(raffleId: string) {
  const prizes = RAFFLE_PRIZES[raffleId]
  if (!prizes) throw new Error('unknown_raffle')
  const tickets = shuffle(getActiveCardsForRaffle(raffleId))
  const used = new Set<number>()
  const picked: StoredCard[] = []
  for (const card of tickets) {
    const telegramId = card.telegramId
    if (!telegramId || used.has(telegramId)) continue
    used.add(telegramId)
    picked.push(card)
    if (picked.length >= prizes.length) break
  }

  const winners: DrawnWinner[] = []
  for (let i = 0; i < prizes.length; i += 1) {
    const prize = prizes[i]
    const card = picked[i]
    if (!card || !card.telegramId) {
      continue
    }
    const chat = getChat(card.telegramId)
    const name = chat?.firstName
      ? `${chat.firstName}${chat.username ? ` @${chat.username}` : ''}`
      : chat?.username
        ? `@${chat.username}`
        : `Telegram ${card.telegramId}`
    const notifyStatus = await notifyTelegramUser(card.telegramId, winnerText(prize.place, prize.amount))
    winners.push({
      id: randomUUID(),
      raffleId,
      place: prize.place,
      amount: prize.amount,
      telegramId: card.telegramId,
      telegramUsername: chat?.username,
      name,
      payCode: card.payCode,
      serial: card.serial,
      notifyStatus,
    })
  }

  return {
    raffleId,
    eligible: tickets.length,
    winners,
  }
}
