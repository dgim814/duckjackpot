import type { MessageKey } from '../i18n/messages'
import { collectionValue } from './economy/catalog'
import { COLLECTION_RANKS } from './economy/config'
import type { PlayerProgress } from './progress'

export type HeistRank = {
  index: number
  nameKey: MessageKey
  nextNameKey: MessageKey | null
  toNext: number
  progress: number
  score: number
}

export function collectionRankScore(progress: PlayerProgress) {
  return collectionValue(progress.ownedArt ?? {})
}

export function heistRank(progress: PlayerProgress): HeistRank {
  const score = collectionRankScore(progress)
  let index = 0
  for (let i = 0; i < COLLECTION_RANKS.length; i += 1) {
    if (score >= COLLECTION_RANKS[i].from) index = i
  }
  const current = COLLECTION_RANKS[index]
  const next = COLLECTION_RANKS[index + 1] ?? null
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
