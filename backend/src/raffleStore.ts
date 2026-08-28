import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'

export type RafflePhase = 'running' | 'stopped' | 'awaiting_draw' | 'drawn'

type Store = Record<string, { status: RafflePhase; updatedAt: number }>

const FILE = join(DATA_DIR, 'raffles.json')

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

export function getRafflePhase(raffleId: string): RafflePhase {
  return readStore()[raffleId]?.status ?? 'running'
}

export function setRafflePhase(raffleId: string, status: RafflePhase) {
  const store = readStore()
  store[raffleId] = { status, updatedAt: Date.now() }
  writeStore(store)
  return store[raffleId]
}

export function listRafflePhases() {
  return readStore()
}
