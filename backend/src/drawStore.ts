import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'

export type NotifyStatus = 'sent' | 'no_chat' | 'failed'

export type DrawKind = 'collection' | 'bonus'

export type DrawWinner = {
  place: number
  amount: string
  serial?: number
  cardId?: string
  payCode?: string
  telegramId: number
  telegramUsername?: string
  notifyStatus: NotifyStatus
}

export type StoredDraw = {
  id: string
  kind: DrawKind
  raffleId?: string
  at: number
  seed: string
  seedSource: string
  blockSeqno?: number
  blockHash?: string
  timestamp?: string
  eligible: number
  winners: DrawWinner[]
}

const FILE = join(DATA_DIR, 'draws.json')

function readAll(): StoredDraw[] {
  try {
    if (!existsSync(FILE)) return []
    const parsed = JSON.parse(readFileSync(FILE, 'utf8')) as StoredDraw[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(draws: StoredDraw[]) {
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(FILE, JSON.stringify(draws, null, 2))
}

export function listDraws() {
  return readAll().sort((a, b) => b.at - a.at)
}

export function saveDraw(draw: StoredDraw) {
  const draws = readAll()
  draws.unshift(draw)
  writeAll(draws)
  return draw
}
