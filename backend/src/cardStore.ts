import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'
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

function readStore(): Store {
  try {
    if (!existsSync(FILE)) return {}
    const parsed = JSON.parse(readFileSync(FILE, 'utf8')) as Store
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: Store) {
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(FILE, JSON.stringify(store, null, 2))
}

export function saveUserCards(telegramId: number, cards: StoredCard[]) {
  const store = readStore()
  store[String(telegramId)] = {
    cards: cards.map((card) => ({ ...card, telegramId })),
    updatedAt: Date.now(),
  }
  writeStore(store)
}

export function getUserCards(telegramId: number): StoredCard[] {
  return readStore()[String(telegramId)]?.cards ?? []
}

export function upsertUserCard(telegramId: number, card: StoredCard) {
  const cards = getUserCards(telegramId)
  const nextCard = {
    ...card,
    telegramId,
    round: card.round ?? (card.status === 'past' ? 1 : getRaffleRound(card.raffleId)),
  }
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
  saveUserCards(telegramId, cards)
  return cards[index >= 0 ? index : 0]
}

export function setUserCardStatus(telegramId: number, cardId: string, status: string) {
  const cards = getUserCards(telegramId)
  const index = cards.findIndex((item) => item.id === cardId)
  if (index < 0) return null
  if (cards[index].status === 'past') return cards[index]
  cards[index] = { ...cards[index], status, telegramId }
  saveUserCards(telegramId, cards)
  return cards[index]
}

export function mergeUserCards(telegramId: number, incoming: StoredCard[]) {
  let cards = getUserCards(telegramId)
  for (const card of incoming) {
    const nextCard = {
      ...card,
      telegramId,
      round: card.round ?? (card.status === 'past' ? 1 : getRaffleRound(card.raffleId)),
    }
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
  saveUserCards(telegramId, cards)
  return cards
}

export function getActiveCardsForRaffle(raffleId: string): StoredCard[] {
  const round = getRaffleRound(raffleId)
  const store = readStore()
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
  const store = readStore()
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

export function listAllCards(): StoredCard[] {
  const store = readStore()
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
  for (const entry of Object.values(readStore())) {
    for (const card of entry.cards) {
      if (card.id === id || card.payCode === id) matches.push(card)
    }
  }
  if (!matches.length) return null
  const current = matches.find((card) => card.status !== 'past')
  return current ?? matches.sort((a, b) => b.purchasedAt - a.purchasedAt)[0]
}

export function setCardStatusById(cardId: string, status: string): StoredCard | null {
  const id = cardId.trim()
  const store = readStore()
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
