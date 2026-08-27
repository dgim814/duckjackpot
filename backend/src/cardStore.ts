import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'

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
  const nextCard = { ...card, telegramId }
  const index = cards.findIndex((item) => item.id === nextCard.id)
  if (index >= 0) {
    const existing = cards[index]
    const locked = existing.status === 'active' || existing.status === 'rejected'
    cards[index] = locked ? { ...existing, ...nextCard, status: existing.status } : { ...existing, ...nextCard }
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
  cards[index] = { ...cards[index], status, telegramId }
  saveUserCards(telegramId, cards)
  return cards[index]
}

export function mergeUserCards(telegramId: number, incoming: StoredCard[]) {
  let cards = getUserCards(telegramId)
  for (const card of incoming) {
    const nextCard = { ...card, telegramId }
    const index = cards.findIndex((item) => item.id === nextCard.id)
    if (index >= 0) {
      const existing = cards[index]
      const locked = existing.status === 'active' || existing.status === 'rejected'
      cards[index] = locked ? { ...existing, ...nextCard, status: existing.status } : { ...existing, ...nextCard }
    } else {
      cards = [nextCard, ...cards]
    }
  }
  saveUserCards(telegramId, cards)
  return cards
}

export function getActiveCardsForRaffle(raffleId: string): StoredCard[] {
  const store = readStore()
  const cards: StoredCard[] = []
  for (const entry of Object.values(store)) {
    for (const card of entry.cards) {
      if (card.raffleId === raffleId && card.status === 'active' && typeof card.telegramId === 'number') {
        cards.push(card)
      }
    }
  }
  return cards
}

export function listAllCards(): StoredCard[] {
  const store = readStore()
  const cards: StoredCard[] = []
  for (const entry of Object.values(store)) {
    cards.push(...entry.cards)
  }
  return cards.sort((a, b) => b.purchasedAt - a.purchasedAt)
}
