import { RAID_OBJ_TIME_S, isMansionUnlocked, type PlayerProgress } from './progress'
import type { MessageKey } from '../i18n/messages'
import { MANSION40_ZONES, mansion40 } from './v2/level/mansion40'

export type HeistLevelId = 'bank' | 'mansion'

export type HeistLevelCard = {
  n: number
  id: HeistLevelId | null
  nameKey: MessageKey
  locked: boolean
  tone: 'bank' | 'mansion' | 'locked'
  /** Zones in the level. LEVEL 3+ are planned only: the number is data, the level is not built. */
  zones: number
}

/**
 * Level ladder. BANK is the shipped 20-zone bank (its layout is unchanged);
 * MANSION is 40 zones; the later levels grow by 10 and stay LOCKED until built.
 */
export const HEIST_LEVEL_ZONES = { bank: 20, mansion: MANSION40_ZONES, level3: 50, level4: 60, level5: 70 } as const

export function heistLevelCards(progress: PlayerProgress): readonly HeistLevelCard[] {
  return [
    { n: 1, id: 'bank', nameKey: 'heistMapBank', locked: false, tone: 'bank', zones: HEIST_LEVEL_ZONES.bank },
    { n: 2, id: 'mansion', nameKey: 'heistMapMansion', locked: !isMansionUnlocked(progress), tone: 'mansion', zones: HEIST_LEVEL_ZONES.mansion },
    { n: 3, id: null, nameKey: 'heistMapSoon', locked: true, tone: 'locked', zones: HEIST_LEVEL_ZONES.level3 },
    { n: 4, id: null, nameKey: 'heistMapSoon', locked: true, tone: 'locked', zones: HEIST_LEVEL_ZONES.level4 },
    { n: 5, id: null, nameKey: 'heistMapSoon', locked: true, tone: 'locked', zones: HEIST_LEVEL_ZONES.level5 },
  ]
}

export const HEIST_LEVEL_CARDS: readonly HeistLevelCard[] = heistLevelCards({ bankComplete: false } as PlayerProgress)

export function heistLevelObjectives(id: HeistLevelId) {
  // 40 zones over 4 floors: the speed goal is sized for a deep run, not a 150 s dash.
  if (id === 'mansion') return { loot: 250, timeS: 420 }
  return { loot: 100, timeS: RAID_OBJ_TIME_S }
}

/** Shown on the level card so the risk is known before the raid starts. */
export function heistLevelBrief(id: HeistLevelId) {
  const obj = heistLevelObjectives(id)
  if (id === 'mansion') {
    const L = mansion40()
    return { ...obj, guards: L.guardRoutes.length, cams: L.cams.length, safes: L.safes.length }
  }
  return { ...obj, guards: 13, cams: 16, safes: 2 }
}
