import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'
import { DataWriteError, enqueueDataOp, writeJsonAtomic } from './dataQueue.js'
import { getRaffleRound } from './raffleStore.js'

const FILE = join(DATA_DIR, 'cards.json')

export type StoredCard = {
  id: string
  raffleId: string
  serial: number
  paidWith: string
  purchasedAt: number
  status: string
  payCode: string
  usdtExact?: number
  telegramId?: number
  telegramUsername?: string
  round?: number
}

type Store = Record<string, { cards: StoredCard[]; updatedAt: number }>

function readStore(strict = false): Store {
  try {
    if (!existsSync(FILE)) return {}
    const parsed = JSON.parse(readFileSync(FILE, 'utf8')) as Store
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      if (strict) throw new DataWriteError()
      return {}
    }
    return parsed
  } catch (err) {
    if (!strict) return {}
    if (err instanceof DataWriteError) throw err
    throw new DataWriteError()
  }
}

function writeStore(store: Store) {
  writeJsonAtomic(FILE, store)
}

function stampCard(telegramId: number, card: StoredCard): StoredCard {
  return {
    ...card,
    telegramId,
    round: card.round ?? (card.status === 'past' ? 1 : getRaffleRound(card.raffleId)),
  }
}

function saveUserCardsSync(telegramId: number, cards: StoredCard[]) {
  const store = readStore(true)
  store[String(telegramId)] = {
    cards: cards.map((card) => ({ ...card, telegramId })),
    updatedAt: Date.now(),
  }
  writeStore(store)
}

function getUserCardsSync(telegramId: number, strict = false): StoredCard[] {
  return readStore(strict)[String(telegramId)]?.cards ?? []
}

function upsertUserCardSync(telegramId: number, card: StoredCard) {
  const cards = getUserCardsSync(telegramId, true)
  const nextCard = stampCard(telegramId, card)
  const index = cards.findIndex((item) => item.id === nextCard.id)
  if (index >= 0) {
    const existing = cards[index]
    const locked = existing.status === 'active' || existing.status === 'rejected' || existing.status === 'past'
    cards[index] = locked
      ? { ...existing, ...nextCard, status: existing.status, round: existing.round ?? nextCard.round }
      : { ...existing, ...nextCard }
  } else {
    cards.unshift(nextCard)
  }
  saveUserCardsSync(telegramId, cards)
  return cards[index >= 0 ? index : 0]
}

function setUserCardStatusSync(telegramId: number, cardId: string, status: string) {
  const cards = getUserCardsSync(telegramId, true)
  const index = cards.findIndex((item) => item.id === cardId)
  if (index < 0) return null
  if (cards[index].status === 'past') return cards[index]
  cards[index] = { ...cards[index], status, telegramId }
  saveUserCardsSync(telegramId, cards)
  return cards[index]
}

function mergeUserCardsSync(telegramId: number, incoming: StoredCard[]) {
  let cards = getUserCardsSync(telegramId, true)
  for (const card of incoming) {
    const nextCard = stampCard(telegramId, card)
    const index = cards.findIndex((item) => item.id === nextCard.id)
    if (index >= 0) {
      const existing = cards[index]
      const locked = existing.status === 'active' || existing.status === 'rejected' || existing.status === 'past'
      cards[index] = locked
        ? { ...existing, ...nextCard, status: existing.status, round: existing.round ?? nextCard.round }
        : { ...existing, ...nextCard }
    } else {
      cards = [nextCard, ...cards]
    }
  }
  saveUserCardsSync(telegramId, cards)
  return cards
}

function setCardStatusByIdSync(cardId: string, status: string): StoredCard | null {
  const id = cardId.trim()
  const store = readStore(true)
  for (const key of Object.keys(store)) {
    const entry = store[key]
    const index = entry.cards.findIndex((item) => item.id === id || item.payCode === id)
    if (index < 0) continue
    if (entry.cards[index].status === 'past') return entry.cards[index]
    entry.cards[index] = { ...entry.cards[index], status }
    store[key] = { ...entry, updatedAt: Date.now() }
    writeStore(store)
    return entry.cards[index]
  }
  return null
}

function archiveRaffleCardsSync(raffleId: string) {
  const store = readStore(true)
  let changed = false
  for (const key of Object.keys(store)) {
    const entry = store[key]
    let dirty = false
    const cards = entry.cards.map((card) => {
      if (card.raffleId !== raffleId || card.status === 'past') return card
      dirty = true
      return { ...card, status: 'past' }
    })
    if (!dirty) continue
    store[key] = { ...entry, cards, updatedAt: Date.now() }
    changed = true
  }
  if (changed) writeStore(store)
}

export function saveUserCards(telegramId: number, cards: StoredCard[]) {
  return enqueueDataOp('issueCard', cards[0]?.id, () => saveUserCardsSync(telegramId, cards))
}

export function getUserCards(telegramId: number): StoredCard[] {
  return getUserCardsSync(telegramId, false)
}

export function upsertUserCard(telegramId: number, card: StoredCard) {
  return enqueueDataOp('issueCard', card.id, () => upsertUserCardSync(telegramId, card))
}

export function setUserCardStatus(telegramId: number, cardId: string, status: string) {
  return enqueueDataOp('issueCard', cardId, () => setUserCardStatusSync(telegramId, cardId, status))
}

export function mergeUserCards(telegramId: number, incoming: StoredCard[]) {
  return enqueueDataOp('issueCard', incoming[0]?.id, () => mergeUserCardsSync(telegramId, incoming))
}

export function getActiveCardsForRaffle(raffleId: string): StoredCard[] {
  const round = getRaffleRound(raffleId)
  const store = readStore(false)
  const cards: StoredCard[] = []
  for (const entry of Object.values(store)) {
    for (const card of entry.cards) {
      if (card.raffleId !== raffleId || card.status !== 'active' || typeof card.telegramId !== 'number') continue
      if ((card.round ?? 1) !== round) continue
      cards.push(card)
    }
  }
  return cards
}

export function archiveRaffleCards(raffleId: string) {
  return enqueueDataOp('issueCard', raffleId, () => archiveRaffleCardsSync(raffleId))
}

export function listAllCards(): StoredCard[] {
  const store = readStore(false)
  const cards: StoredCard[] = []
  for (const entry of Object.values(store)) {
    cards.push(...entry.cards)
  }
  return cards.sort((a, b) => b.purchasedAt - a.purchasedAt)
}

export function findCardById(cardId: string): StoredCard | null {
  const id = cardId.trim()
  if (!id) return null
  const matches: StoredCard[] = []
  for (const entry of Object.values(readStore(false))) {
    for (const card of entry.cards) {
      if (card.id === id || card.payCode === id) matches.push(card)
    }
  }
  if (!matches.length) return null
  const current = matches.find((card) => card.status !== 'past')
  return current ?? matches.sort((a, b) => b.purchasedAt - a.purchasedAt)[0]
}

export function setCardStatusById(cardId: string, status: string): Promise<StoredCard | null> {
  return enqueueDataOp('issueCard', cardId, () => setCardStatusByIdSync(cardId, status))
}
