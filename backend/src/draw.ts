import { randomUUID } from 'node:crypto'
import { notifyTelegramAdmin, notifyTelegramUser } from './bot.js'
import { getActiveCardsForRaffle, type StoredCard } from './cardStore.js'
import { getChat } from './chatStore.js'
import { listBonusUsers, type BonusUser } from './bonusStore.js'
import { saveDraw, type DrawWinner, type NotifyStatus } from './drawStore.js'
import { fetchFairSeed, seededShuffle } from './fairSeed.js'
import { RAFFLE_PRIZES, RAFFLE_TOTALS } from './prizes.js'
import { getRafflePhase, getTestSold, setRafflePhase } from './raffleStore.js'

export type { NotifyStatus }

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

function displayName(telegramId: number, username?: string) {
  const chat = getChat(telegramId)
  if (chat?.firstName) {
    return `${chat.firstName}${chat.username ? ` @${chat.username}` : ''}`
  }
  const handle = username || chat?.username
  return handle ? `@${handle}` : `Telegram ${telegramId}`
}

function raffleLabel(raffleId: string) {
  if (raffleId === 'classic') return 'Основной'
  if (raffleId === 'fast200') return 'Быстрый · 200'
  if (raffleId === 'fast100') return 'Быстрый · 100'
  return raffleId
}

function uniqueActiveCards(raffleId: string) {
  const seen = new Set<number>()
  const cards: StoredCard[] = []
  for (const card of getActiveCardsForRaffle(raffleId).sort((a, b) => a.serial - b.serial)) {
    if (seen.has(card.serial)) continue
    seen.add(card.serial)
    cards.push(card)
  }
  return cards
}

export function soldCountFor(raffleId: string) {
  return uniqueActiveCards(raffleId).length
}

export function displaySoldFor(raffleId: string) {
  const total = RAFFLE_TOTALS[raffleId] ?? Number.POSITIVE_INFINITY
  return Math.min(total, Math.max(getTestSold(raffleId), soldCountFor(raffleId)))
}

export function refreshRafflePhase(raffleId: string) {
  const total = RAFFLE_TOTALS[raffleId]
  if (!total) return getRafflePhase(raffleId)
  const phase = getRafflePhase(raffleId)
  if (phase === 'drawn') return phase
  if (displaySoldFor(raffleId) >= total) {
    setRafflePhase(raffleId, 'awaiting_draw')
    return 'awaiting_draw'
  }
  return phase
}

function winnerLine(serial: number, place: number, amount: string) {
  return `Ваша карточка #${String(serial).padStart(4, '0')} выиграла ${place} место, приз ${amount}`
}

async function notifyAdminWinners(title: string, seed: string, winners: DrawWinner[]) {
  const lines = [
    title,
    `Seed: ${seed}`,
    '',
    ...winners.map((winner) => {
      const card = winner.serial != null ? `карточка #${String(winner.serial).padStart(4, '0')}` : 'участник'
      const user = winner.telegramUsername ? `@${winner.telegramUsername}` : '—'
      return `${winner.place} место — ${card} — ${user} / ${winner.telegramId} — ${winner.amount}`
    }),
    '',
    'Призы выплачиваются вручную.',
  ]
  await notifyTelegramAdmin(lines.join('\n'))
}

export async function drawRaffle(raffleId: string) {
  const prizes = RAFFLE_PRIZES[raffleId]
  const total = RAFFLE_TOTALS[raffleId]
  if (!prizes || !total) throw new Error('unknown_raffle')
  refreshRafflePhase(raffleId)
  const sold = displaySoldFor(raffleId)
  if (sold < total) throw new Error('not_sold_out')
  if (getRafflePhase(raffleId) === 'drawn') throw new Error('already_drawn')

  const tickets = uniqueActiveCards(raffleId)
  if (tickets.length === 0) throw new Error('no_tickets')

  const seedInfo = await fetchFairSeed()
  const shuffled = seededShuffle(tickets, seedInfo.seed)
  const picked = shuffled.slice(0, prizes.length)

  const drawWinners: DrawWinner[] = []
  const winners: DrawnWinner[] = []
  for (let i = 0; i < prizes.length; i += 1) {
    const prize = prizes[i]
    const card = picked[i]
    if (!card?.telegramId) continue
    const notifyStatus = await notifyTelegramUser(
      card.telegramId,
      winnerLine(card.serial, prize.place, prize.amount),
    )
    const username = card.telegramUsername || getChat(card.telegramId)?.username
    drawWinners.push({
      place: prize.place,
      amount: prize.amount,
      serial: card.serial,
      cardId: card.id,
      payCode: card.payCode,
      telegramId: card.telegramId,
      telegramUsername: username,
      notifyStatus,
    })
    winners.push({
      id: randomUUID(),
      raffleId,
      place: prize.place,
      amount: prize.amount,
      telegramId: card.telegramId,
      telegramUsername: username,
      name: displayName(card.telegramId, username),
      payCode: card.payCode,
      serial: card.serial,
      notifyStatus,
    })
  }

  const draw = saveDraw({
    id: randomUUID(),
    kind: 'collection',
    raffleId,
    at: seedInfo.at,
    seed: seedInfo.seed,
    seedSource: seedInfo.source,
    blockSeqno: seedInfo.blockSeqno,
    blockHash: seedInfo.blockHash,
    timestamp: seedInfo.timestamp,
    eligible: tickets.length,
    winners: drawWinners,
  })
  setRafflePhase(raffleId, 'drawn')
  try {
    await notifyAdminWinners(`Розыгрыш коллекции: ${raffleLabel(raffleId)}`, seedInfo.seed, drawWinners)
  } catch (err) {
    console.error('[draw] admin notify failed', err)
  }

  return {
    raffleId,
    eligible: tickets.length,
    seed: seedInfo.seed,
    seedSource: seedInfo.source,
    drawId: draw.id,
    winners,
  }
}

export type BonusPrize = { place: number; amount: string }

export async function drawBonus(prizes: BonusPrize[]) {
  const cleaned = prizes
    .map((prize) => ({
      place: Number(prize.place),
      amount: String(prize.amount ?? '').trim(),
    }))
    .filter((prize) => Number.isInteger(prize.place) && prize.place > 0 && prize.amount)
    .sort((a, b) => a.place - b.place)
  if (!cleaned.length) throw new Error('no_prizes')

  const users = listBonusUsers()
  if (!users.length) throw new Error('no_tickets')

  const seedInfo = await fetchFairSeed()
  const shuffled = seededShuffle(users, `${seedInfo.seed}:bonus`)
  const picked: BonusUser[] = []
  const used = new Set<number>()
  for (const user of shuffled) {
    if (used.has(user.telegramId)) continue
    used.add(user.telegramId)
    picked.push(user)
    if (picked.length >= cleaned.length) break
  }

  const drawWinners: DrawWinner[] = []
  for (let i = 0; i < cleaned.length; i += 1) {
    const prize = cleaned[i]
    const user = picked[i]
    if (!user) continue
    const notifyStatus = await notifyTelegramUser(
      user.telegramId,
      `Вы выиграли ${prize.place} место в полугодовом розыгрыше, приз ${prize.amount}`,
    )
    drawWinners.push({
      place: prize.place,
      amount: prize.amount,
      telegramId: user.telegramId,
      telegramUsername: user.telegramUsername,
      notifyStatus,
    })
  }

  const draw = saveDraw({
    id: randomUUID(),
    kind: 'bonus',
    at: seedInfo.at,
    seed: seedInfo.seed,
    seedSource: seedInfo.source,
    blockSeqno: seedInfo.blockSeqno,
    blockHash: seedInfo.blockHash,
    timestamp: seedInfo.timestamp,
    eligible: users.length,
    winners: drawWinners,
  })
  try {
    await notifyAdminWinners('Полугодовой бонусный розыгрыш', seedInfo.seed, drawWinners)
  } catch (err) {
    console.error('[draw] bonus admin notify failed', err)
  }

  return {
    kind: 'bonus' as const,
    eligible: users.length,
    seed: seedInfo.seed,
    seedSource: seedInfo.source,
    drawId: draw.id,
    winners: drawWinners,
  }
}

export function publicRaffleSnapshot() {
  const ids = Object.keys(RAFFLE_TOTALS)
  const raffles: Record<string, { status: string; sold: number; confirmed: number; total: number }> = {}
  for (const id of ids) {
    const status = refreshRafflePhase(id)
    raffles[id] = {
      status,
      sold: displaySoldFor(id),
      confirmed: soldCountFor(id),
      total: RAFFLE_TOTALS[id],
    }
  }
  return raffles
}
