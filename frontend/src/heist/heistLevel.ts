import { RAID_OBJ_TIME_S, isLevelComplete, isLevelUnlocked, type PlayerProgress } from './progress'
import type { MessageKey } from '../i18n/messages'
import { MANSION40_ZONES, mansion40 } from './v2/level/mansion40'
import { GRAND_ZONES, grandLevel } from './v2/level/grandLevels'

/** LEVEL 3 PRIVATE BANK, LEVEL 4 BLACK MARKET, LEVEL 5 GRAND VAULT. */
export type GrandLevelId = 'level3' | 'level4' | 'level5' | 'level6' | 'level7' | 'level8'
export type HeistLevelId = 'bank' | 'mansion' | GrandLevelId

export const GRAND_LEVEL_IDS: readonly GrandLevelId[] = ['level3', 'level4', 'level5', 'level6', 'level7', 'level8']

export function isGrandLevel(id: HeistLevelId): id is GrandLevelId {
  return id === 'level3' || id === 'level4' || id === 'level5' || id === 'level6' || id === 'level7' || id === 'level8'
}

/** The ladder, in play order. Each level unlocks when the previous one is complete. */
export const HEIST_LEVEL_ORDER: readonly HeistLevelId[] = ['bank', 'mansion', 'level3', 'level4', 'level5', 'level6', 'level7', 'level8']

export const HEIST_LEVEL_NAME: Record<HeistLevelId, MessageKey> = {
  bank: 'heistMapBank',
  mansion: 'heistMapMansion',
  level3: 'heistMapL3',
  level4: 'heistMapL4',
  level5: 'heistMapL5',
  level6: 'heistMapL6',
  level7: 'heistMapL7',
  level8: 'heistMapL8',
}

export type HeistLevelCard = {
  n: number
  id: HeistLevelId
  nameKey: MessageKey
  locked: boolean
  done: boolean
  tone: HeistLevelId
  zones: number
  /** Level that has to be completed first (for the locked card). */
  needs: HeistLevelId | null
}

export const HEIST_LEVEL_ZONES: Record<HeistLevelId, number> = {
  bank: 20,
  mansion: MANSION40_ZONES,
  level3: GRAND_ZONES.level3,
  level4: GRAND_ZONES.level4,
  level5: GRAND_ZONES.level5,
  level6: GRAND_ZONES.level6,
  level7: GRAND_ZONES.level7,
  level8: GRAND_ZONES.level8,
}

export function nextHeistLevel(id: HeistLevelId): HeistLevelId | null {
  const i = HEIST_LEVEL_ORDER.indexOf(id)
  return HEIST_LEVEL_ORDER[i + 1] ?? null
}

export function heistLevelCards(progress: PlayerProgress): readonly HeistLevelCard[] {
  return HEIST_LEVEL_ORDER.map((id, i) => ({
    n: i + 1,
    id,
    nameKey: HEIST_LEVEL_NAME[id],
    locked: !isLevelUnlocked(progress, id),
    done: isLevelComplete(progress, id),
    tone: id,
    zones: HEIST_LEVEL_ZONES[id],
    needs: i > 0 ? HEIST_LEVEL_ORDER[i - 1] : null,
  }))
}

export function heistLevelObjectives(id: HeistLevelId) {
  // Speed goals are sized for a deep run through the whole building.
  if (id === 'mansion') return { loot: 250, timeS: 420 }
  if (id === 'level3') return { loot: 300, timeS: 540 }
  if (id === 'level4') return { loot: 350, timeS: 660 }
  if (id === 'level5') return { loot: 400, timeS: 780 }
  if (id === 'level6') return { loot: 450, timeS: 900 }
  if (id === 'level7') return { loot: 500, timeS: 1020 }
  if (id === 'level8') return { loot: 550, timeS: 1140 }
  return { loot: 100, timeS: RAID_OBJ_TIME_S }
}

/** Shown on the level card so the risk is known before the raid starts. */
export function heistLevelBrief(id: HeistLevelId) {
  const obj = heistLevelObjectives(id)
  if (id === 'mansion' || isGrandLevel(id)) {
    const L = id === 'mansion' ? mansion40() : grandLevel(id)
    return { ...obj, guards: L.guardRoutes.length, cams: L.cams.length, safes: L.safes.length }
  }
  return { ...obj, guards: 13, cams: 16, safes: 2 }
}
