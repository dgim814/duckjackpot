import type { MessageKey } from '../../i18n/messages'
import { RANK_THRESHOLDS } from './balance'

/** Price bands for Black Market lots. UI and stock use these; tweak here, not in pages. */
export const RARITY_BANDS = {
  COMMON: { min: 10, max: 100 },
  UNCOMMON: { min: 100, max: 500 },
  LUX: { min: 10, max: 500 },
  RARE: { min: 500, max: 2000 },
  EPIC: { min: 2000, max: 10000 },
  LEGENDARY: { min: 10000, max: 100000 },
  ICONIC: { min: 100000, max: 50_000_000 },
} as const

/** Collection-value ranks. Score is collection value only, never banked DUCK COIN. */
export const COLLECTION_RANKS: { nameKey: MessageKey; from: number }[] = (
  ['hubRank1', 'hubRank2', 'hubRank3', 'hubRank4', 'hubRank5', 'hubRank6', 'hubRank7'] as const
).map((nameKey, i) => ({ nameKey, from: RANK_THRESHOLDS[i] }))

export const STOCK_RULES = {
  dailyEntry: 4,
  dailyArt: 3,
  dailyWatch: 3,
  dailyCars: 3,
  dailyOther: 3,
  dailyRare: 3,
  dailyEpic: 2,
  dailyLegendary: 1,
  iconicEveryDays: 7,
}

/** Markup from purchase to collection value when a lot does not set its own. */
export const COLLECTION_MARKUP = 1.12
