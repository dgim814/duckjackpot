import type { MessageKey } from '../i18n/messages'

const TASKS: MessageKey[] = ['hubDailyTask1', 'hubDailyTask2', 'hubDailyTask3', 'hubDailyTask4']

const DAY_MS = 24 * 60 * 60 * 1000

function dayIndex(now: Date) {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.floor(midnight.getTime() / DAY_MS)
}

export function dailyTaskKey(now = new Date()): MessageKey {
  const i = dayIndex(now) % TASKS.length
  return TASKS[(i + TASKS.length) % TASKS.length]
}

export function msUntilDailyReset(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return Math.max(0, next.getTime() - now.getTime())
}

export function formatResetIn(ms: number) {
  const total = Math.floor(ms / 60000)
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
