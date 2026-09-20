import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'

const FILE = join(DATA_DIR, 'player-gameplay-reset.json')

export type GameplayResetRecord = {
  telegramId: number
  requestedAt: number
  consumedAt?: number
}

type Store = { pending: Record<string, GameplayResetRecord> }

function readStore(): Store {
  try {
    if (!existsSync(FILE)) return { pending: {} }
    const parsed = JSON.parse(readFileSync(FILE, 'utf8')) as Store
    if (!parsed || typeof parsed.pending !== 'object' || Array.isArray(parsed.pending)) return { pending: {} }
    return { pending: parsed.pending }
  } catch {
    return { pending: {} }
  }
}

function writeStore(store: Store) {
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(FILE, JSON.stringify(store, null, 2))
}

export function hasPendingGameplayReset(telegramId: number) {
  const row = readStore().pending[String(telegramId)]
  return Boolean(row && !row.consumedAt)
}

export function hasGameplayResetHistory(telegramId: number) {
  return Boolean(readStore().pending[String(telegramId)])
}

export function queueGameplayReset(telegramId: number) {
  const store = readStore()
  const prev = store.pending[String(telegramId)]
  const alreadyPending = Boolean(prev && !prev.consumedAt)
  store.pending[String(telegramId)] = {
    telegramId,
    requestedAt: Date.now(),
  }
  writeStore(store)
  return { alreadyPending, record: store.pending[String(telegramId)] }
}

export function consumeGameplayReset(telegramId: number) {
  const store = readStore()
  const prev = store.pending[String(telegramId)]
  if (!prev || prev.consumedAt) {
    return { consumed: false as const, pending: false as const }
  }
  store.pending[String(telegramId)] = { ...prev, consumedAt: Date.now() }
  writeStore(store)
  return { consumed: true as const, pending: false as const }
}
