import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'

export const HUNT_COOLDOWN_MS = 24 * 60 * 60 * 1000

export type HuntAttempt = {
  id: string
  userId: number
  startedAt: number
  finishedAt?: number
  levelsPassed: number
  shots: number
  hits: number
  win: boolean
}

const FILE = join(DATA_DIR, 'hunt.json')

type Store = { attempts: HuntAttempt[] }

function readStore(): Store {
  try {
    if (!existsSync(FILE)) return { attempts: [] }
    const parsed = JSON.parse(readFileSync(FILE, 'utf8')) as Store
    if (!parsed || !Array.isArray(parsed.attempts)) return { attempts: [] }
    return parsed
  } catch {
    return { attempts: [] }
  }
}

function writeStore(store: Store) {
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(FILE, JSON.stringify(store, null, 2))
}

export function lastHuntAttempt(userId: number): HuntAttempt | undefined {
  return readStore()
    .attempts.filter((item) => item.userId === userId)
    .sort((a, b) => b.startedAt - a.startedAt)[0]
}

export function huntStatus(userId: number) {
  const last = lastHuntAttempt(userId)
  if (!last) {
    return { canPlay: true, nextAt: 0 as number, last: null as HuntAttempt | null }
  }
  const nextAt = last.startedAt + HUNT_COOLDOWN_MS
  return { canPlay: Date.now() >= nextAt, nextAt, last }
}

export function startHuntAttempt(userId: number) {
  const status = huntStatus(userId)
  if (!status.canPlay) {
    const err = new Error('cooldown') as Error & { nextAt: number; last: HuntAttempt | null }
    err.nextAt = status.nextAt
    err.last = status.last
    throw err
  }
  const attempt: HuntAttempt = {
    id: randomUUID(),
    userId,
    startedAt: Date.now(),
    levelsPassed: 0,
    shots: 0,
    hits: 0,
    win: false,
  }
  const store = readStore()
  store.attempts.unshift(attempt)
  writeStore(store)
  return attempt
}

export function finishHuntAttempt(
  userId: number,
  patch: { id?: string; levelsPassed: number; shots: number; hits: number; win: boolean },
) {
  const store = readStore()
  const index = store.attempts.findIndex((item) => {
    if (item.userId !== userId) return false
    if (patch.id) return item.id === patch.id
    return !item.finishedAt
  })
  if (index < 0) return null
  const current = store.attempts[index]
  if (current.finishedAt) return current
  const updated: HuntAttempt = {
    ...current,
    finishedAt: Date.now(),
    levelsPassed: Math.max(0, Math.min(3, Math.round(patch.levelsPassed))),
    shots: Math.max(0, Math.round(patch.shots)),
    hits: Math.max(0, Math.round(patch.hits)),
    win: patch.win === true,
  }
  store.attempts[index] = updated
  writeStore(store)
  return updated
}

export function resetHuntCooldown(userId: number) {
  const store = readStore()
  const next = store.attempts.filter((item) => item.userId !== userId)
  writeStore({ attempts: next })
  return { ok: true, removed: store.attempts.length - next.length }
}
