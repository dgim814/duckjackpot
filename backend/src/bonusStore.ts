import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'
import { listAllCards } from './cardStore.js'

export type BonusUser = {
  telegramId: number
  telegramUsername?: string
  firstConfirmedAt: number
  cards: number
}

const FILE = join(DATA_DIR, 'bonus_users.json')

type Store = { users: Record<string, BonusUser> }

function readStore(): Store {
  try {
    if (!existsSync(FILE)) return { users: {} }
    const parsed = JSON.parse(readFileSync(FILE, 'utf8')) as Store
    if (!parsed || typeof parsed !== 'object' || !parsed.users) return { users: {} }
    return parsed
  } catch {
    return { users: {} }
  }
}

function writeStore(store: Store) {
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(FILE, JSON.stringify(store, null, 2))
}

export function listBonusUsers(): BonusUser[] {
  return Object.values(readStore().users).sort((a, b) => a.firstConfirmedAt - b.firstConfirmedAt)
}

export function isBonusUser(telegramId: number) {
  return Boolean(readStore().users[String(telegramId)])
}

export function addBonusUser(telegramId: number, telegramUsername?: string): { added: boolean; user: BonusUser } {
  const store = readStore()
  const key = String(telegramId)
  const existing = store.users[key]
  if (existing) {
    existing.cards += 1
    if (telegramUsername) existing.telegramUsername = telegramUsername
    store.users[key] = existing
    writeStore(store)
    return { added: false, user: existing }
  }
  const user: BonusUser = {
    telegramId,
    telegramUsername,
    firstConfirmedAt: Date.now(),
    cards: 1,
  }
  store.users[key] = user
  writeStore(store)
  return { added: true, user }
}

export function syncBonusUsersFromCards() {
  const store = readStore()
  let changed = false
  for (const card of listAllCards()) {
    if (card.status !== 'active' || typeof card.telegramId !== 'number') continue
    const key = String(card.telegramId)
    if (store.users[key]) continue
    store.users[key] = {
      telegramId: card.telegramId,
      telegramUsername: card.telegramUsername,
      firstConfirmedAt: card.purchasedAt || Date.now(),
      cards: 1,
    }
    changed = true
  }
  if (changed) writeStore(store)
}
