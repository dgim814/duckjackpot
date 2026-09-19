import type { MessageKey } from '../../i18n/messages'

/** Price bands for Black Market lots. UI and stock use these; tweak here, not in pages. */
export const RARITY_BANDS = {
  COMMON: { min: 10, max: 100 },
  UNCOMMON: { min: 100, max: 500 },
  RARE: { min: 500, max: 2000 },
  EPIC: { min: 2000, max: 10000 },
  LEGENDARY: { min: 10000, max: 100000 },
  ICONIC: { min: 100000, max: 50_000_000 },
} as const

/** Collection-value ranks. Score is collection value only, never banked DUCK COIN. */
export const COLLECTION_RANKS: { nameKey: MessageKey; from: number }[] = [
  { nameKey: 'hubRank1', from: 0 },
  { nameKey: 'hubRank2', from: 10_000 },
  { nameKey: 'hubRank3', from: 100_000 },
  { nameKey: 'hubRank4', from: 500_000 },
  { nameKey: 'hubRank5', from: 1_000_000 },
  { nameKey: 'hubRank6', from: 10_000_000 },
  { nameKey: 'hubRank7', from: 100_000_000 },
]

export const STOCK_RULES = {
  always: ['COMMON', 'UNCOMMON'] as const,
  dailyRare: 3,
  dailyEpic: 2,
  dailyLegendary: 1,
  iconicEveryDays: 7,
}

/** Markup from purchase to collection value when a lot does not set its own. */
export const COLLECTION_MARKUP = 1.12
