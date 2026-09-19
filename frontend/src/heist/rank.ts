import type { MessageKey } from '../i18n/messages'
import type { PlayerProgress } from './progress'

export type HeistRank = {
  index: number
  nameKey: MessageKey
  nextNameKey: MessageKey | null
  toNext: number
  progress: number
}

const RANKS: { nameKey: MessageKey; from: number }[] = [
  { nameKey: 'hubRank1', from: 0 },
  { nameKey: 'hubRank2', from: 250 },
  { nameKey: 'hubRank3', from: 750 },
  { nameKey: 'hubRank4', from: 2000 },
  { nameKey: 'hubRank5', from: 5000 },
  { nameKey: 'hubRank6', from: 12000 },
]

export function heistRank(progress: PlayerProgress): HeistRank {
  const banked = Math.max(0, Math.floor(progress.bankedDuckCoin))
  let index = 0
  for (let i = 0; i < RANKS.length; i += 1) {
    if (banked >= RANKS[i].from) index = i
  }
  const current = RANKS[index]
  const next = RANKS[index + 1] ?? null
  if (!next) {
    return { index, nameKey: current.nameKey, nextNameKey: null, toNext: 0, progress: 1 }
  }
  const span = next.from - current.from
  const done = banked - current.from
  return {
    index,
    nameKey: current.nameKey,
    nextNameKey: next.nameKey,
    toNext: Math.max(0, next.from - banked),
    progress: span > 0 ? Math.min(1, Math.max(0, done / span)) : 0,
  }
}
