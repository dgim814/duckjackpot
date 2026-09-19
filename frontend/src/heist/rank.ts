import type { MessageKey } from '../i18n/messages'
import { collectionValue } from './economy/catalog'
import type { PlayerProgress } from './progress'

export type HeistRank = {
  index: number
  nameKey: MessageKey
  nextNameKey: MessageKey | null
  toNext: number
  progress: number
  score: number
}

const RANKS: { nameKey: MessageKey; from: number }[] = [
  { nameKey: 'hubRank1', from: 0 },
  { nameKey: 'hubRank2', from: 1000 },
  { nameKey: 'hubRank3', from: 10000 },
  { nameKey: 'hubRank4', from: 50000 },
  { nameKey: 'hubRank5', from: 250000 },
  { nameKey: 'hubRank6', from: 500000 },
]

export function collectionRankScore(progress: PlayerProgress) {
  return collectionValue(progress.ownedArt ?? {})
}

export function heistRank(progress: PlayerProgress): HeistRank {
  const score = collectionRankScore(progress)
  let index = 0
  for (let i = 0; i < RANKS.length; i += 1) {
    if (score >= RANKS[i].from) index = i
  }
  const current = RANKS[index]
  const next = RANKS[index + 1] ?? null
  if (!next) {
    return { index, nameKey: current.nameKey, nextNameKey: null, toNext: 0, progress: 1, score }
  }
  const span = next.from - current.from
  const done = score - current.from
  return {
    index,
    nameKey: current.nameKey,
    nextNameKey: next.nameKey,
    toNext: Math.max(0, next.from - score),
    progress: span > 0 ? Math.min(1, Math.max(0, done / span)) : 0,
    score,
  }
}
