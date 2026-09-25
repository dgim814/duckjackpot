import type { MessageKey } from '../../i18n/messages'
import { CATALOG, type CatalogItem } from './catalog'
import type { Tier } from './balance'

/**
 * Black Market sections — data-driven: a new lot appears in the right shelf by
 * its id prefix / tier, no UI change needed. A MASTERPIECE also shows in its
 * own shelf (MASTERPIECES) as well as in its category.
 */
export type SectionId = 'WATCHES' | 'JEWELRY' | 'ART' | 'ANTIQUES' | 'COLLECTIBLES' | 'CARS' | 'RARE' | 'MASTERPIECES'

export type Section = { id: SectionId; icon: string; name: MessageKey; match: (i: CatalogItem) => boolean }

const starts = (i: CatalogItem, ...p: string[]) => p.some((x) => i.id.startsWith(x))

export const SECTIONS: Section[] = [
  { id: 'WATCHES', icon: '⌚', name: 'bmSecWatches', match: (i) => starts(i, 'watch_') || i.id === 'antique_breguet_pocket' },
  { id: 'JEWELRY', icon: '💎', name: 'bmSecJewelry', match: (i) => starts(i, 'jewel_') },
  { id: 'ART', icon: '🖼️', name: 'bmSecArt', match: (i) => starts(i, 'art_') },
  { id: 'ANTIQUES', icon: '🏺', name: 'bmSecAntiques', match: (i) => (starts(i, 'antique_', 'sci_', 'book_') && i.id !== 'antique_breguet_pocket') },
  { id: 'COLLECTIBLES', icon: '👑', name: 'bmSecCollectibles', match: (i) => starts(i, 'tech_', 'music_', 'fashion_') },
  { id: 'CARS', icon: '🚗', name: 'bmSecCars', match: (i) => starts(i, 'car_') },
  { id: 'RARE', icon: '💰', name: 'bmSecRare', match: (i) => starts(i, 'rare_', 'special_') },
  { id: 'MASTERPIECES', icon: '🎨', name: 'bmSecMasterpieces', match: (i) => i.tier === 'MASTERPIECE' },
]

/** Everything on sale (legacy lots stay owned-only). */
export function marketItems(): CatalogItem[] {
  return CATALOG.filter((i) => i.market !== false)
}

export function sectionItems(id: SectionId): CatalogItem[] {
  const s = SECTIONS.find((x) => x.id === id)
  return s ? marketItems().filter(s.match) : []
}

export const TIER_RANK: Record<Tier, number> = { COMMON: 0, RARE: 1, EPIC: 2, LEGENDARY: 3, MASTERPIECE: 4 }
