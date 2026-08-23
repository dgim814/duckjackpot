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
  writeFileSync(FILE, JSON.stringify(store))
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
