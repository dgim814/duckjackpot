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
  paid?: boolean
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
  hidden?: boolean
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

function yekatClock(at: number) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Yekaterinburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(at))
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return {
    day: value('day'),
    month: value('month'),
    year: value('year'),
    hour: Number(value('hour')),
    minute: Number(value('minute')),
  }
}

function minutesOnDay(at: number) {
  const clock = yekatClock(at)
  if (clock.year !== '2026' || clock.month !== '08' || clock.day !== '28') return null
  return clock.hour * 60 + clock.minute
}

function utcMinutesOnDay(at: number) {
  const date = new Date(at)
  if (date.getUTCFullYear() !== 2026 || date.getUTCMonth() !== 7 || date.getUTCDate() !== 28) return null
  return date.getUTCHours() * 60 + date.getUTCMinutes()
}

function nearTime(minutes: number | null, target: number) {
  return minutes != null && Math.abs(minutes - target) <= 2
}

export function isKnownTestDraw(draw: StoredDraw) {
  const local = minutesOnDay(draw.at)
  const utc = utcMinutesOnDay(draw.at)
  if (draw.kind === 'collection' && draw.raffleId === 'fast200' && (nearTime(local, 19 * 60 + 54) || nearTime(utc, 19 * 60 + 54))) {
    return true
  }
  if (draw.kind === 'bonus' && (nearTime(local, 19 * 60 + 29) || nearTime(utc, 19 * 60 + 29))) return true
  return false
}

function withUnpaid(draw: StoredDraw): StoredDraw {
  return {
    ...draw,
    winners: draw.winners.map((winner) => ({ ...winner, paid: false })),
  }
}

export function listDraws() {
  hideKnownTestDraws()
  return readAll().sort((a, b) => b.at - a.at)
}

export function listPublicDraws() {
  return listDraws().filter((draw) => !draw.hidden)
}

export function saveDraw(draw: StoredDraw) {
  const draws = readAll()
  draws.unshift({ ...draw, hidden: draw.hidden === true })
  writeAll(draws)
  return draws[0]
}

export function hideDraw(id: string) {
  const draws = readAll()
  const index = draws.findIndex((item) => item.id === id)
  if (index < 0) return null
  const current = draws[index]
  const next = {
    ...current,
    hidden: true,
    winners: isKnownTestDraw(current) ? withUnpaid(current).winners : current.winners,
  }
  draws[index] = next
  writeAll(draws)
  return next
}

export function setDrawWinnerPaid(drawId: string, place: number, paid: boolean) {
  const draws = readAll()
  const index = draws.findIndex((item) => item.id === drawId)
  if (index < 0) return null
  const current = draws[index]
  draws[index] = {
    ...current,
    winners: current.winners.map((winner) => (winner.place === place ? { ...winner, paid } : winner)),
  }
  writeAll(draws)
  return draws[index]
}

export function hideKnownTestDraws() {
  const draws = readAll()
  let changed = false
  const next = draws.map((draw) => {
    if (!isKnownTestDraw(draw)) return draw
    if (draw.hidden === true && draw.winners.every((winner) => !winner.paid)) return draw
    changed = true
    return { ...withUnpaid(draw), hidden: true }
  })
  if (changed) writeAll(next)
}
