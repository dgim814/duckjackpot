import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'

export type SupportTicket = {
  userId: number
  chatId: number
  username?: string
  at: number
}

const FILE = join(DATA_DIR, 'support-tickets.json')
const MAX_TICKETS = 2000

type Store = Record<string, SupportTicket>

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
  const entries = Object.entries(store).sort((a, b) => b[1].at - a[1].at)
  const trimmed = Object.fromEntries(entries.slice(0, MAX_TICKETS))
  writeFileSync(FILE, JSON.stringify(trimmed))
}

export function rememberSupportTicket(adminMessageId: number, ticket: SupportTicket) {
  const store = readStore()
  store[String(adminMessageId)] = ticket
  writeStore(store)
}

export function getSupportTicket(adminMessageId: number): SupportTicket | undefined {
  return readStore()[String(adminMessageId)]
}
