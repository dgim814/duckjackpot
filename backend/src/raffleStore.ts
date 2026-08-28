import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'

export type RafflePhase = 'running' | 'stopped' | 'awaiting_draw' | 'drawn'

export type RaffleRecord = {
  status: RafflePhase
  testSold: number
  updatedAt: number
}

type Store = Record<string, RaffleRecord>

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

function normalize(raffleId: string, raw?: Partial<RaffleRecord>): RaffleRecord {
  const testSold = typeof raw?.testSold === 'number' && Number.isFinite(raw.testSold) ? Math.max(0, Math.round(raw.testSold)) : 0
  const status =
    raw?.status === 'stopped' || raw?.status === 'awaiting_draw' || raw?.status === 'drawn' || raw?.status === 'running'
      ? raw.status
      : 'running'
  return {
    status,
    testSold,
    updatedAt: raw?.updatedAt ?? Date.now(),
  }
}

export function getRaffleRecord(raffleId: string): RaffleRecord {
  return normalize(raffleId, readStore()[raffleId])
}

export function getRafflePhase(raffleId: string): RafflePhase {
  return getRaffleRecord(raffleId).status
}

export function getTestSold(raffleId: string) {
  return getRaffleRecord(raffleId).testSold
}

export function patchRaffle(raffleId: string, patch: { status?: RafflePhase; testSold?: number }) {
  const store = readStore()
  const current = normalize(raffleId, store[raffleId])
  const next: RaffleRecord = {
    status: patch.status ?? current.status,
    testSold: typeof patch.testSold === 'number' ? Math.max(0, Math.round(patch.testSold)) : current.testSold,
    updatedAt: Date.now(),
  }
  store[raffleId] = next
  writeStore(store)
  return next
}

export function setRafflePhase(raffleId: string, status: RafflePhase) {
  return patchRaffle(raffleId, { status })
}

export function setTestSold(raffleId: string, testSold: number) {
  return patchRaffle(raffleId, { testSold })
}

export function listRafflePhases() {
  return readStore()
}
