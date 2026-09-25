import { RAID_OBJ_TIME_S, isLevelComplete, isLevelUnlocked, type PlayerProgress } from './progress'
import type { MessageKey } from '../i18n/messages'
import { MANSION40_ZONES, mansion40 } from './v2/level/mansion40'
import { GRAND_ZONES, grandLevel } from './v2/level/grandLevels'

/** LEVEL 3 PRIVATE BANK, LEVEL 4 BLACK MARKET, LEVEL 5 GRAND VAULT. */
export type GrandLevelId = 'level3' | 'level4' | 'level5'
export type HeistLevelId = 'bank' | 'mansion' | GrandLevelId

export const GRAND_LEVEL_IDS: readonly GrandLevelId[] = ['level3', 'level4', 'level5']

export function isGrandLevel(id: HeistLevelId): id is GrandLevelId {
  return id === 'level3' || id === 'level4' || id === 'level5'
}

/** The ladder, in play order. Each level unlocks when the previous one is complete. */
export const HEIST_LEVEL_ORDER: readonly HeistLevelId[] = ['bank', 'mansion', 'level3', 'level4', 'level5']

export const HEIST_LEVEL_NAME: Record<HeistLevelId, MessageKey> = {
  bank: 'heistMapBank',
  mansion: 'heistMapMansion',
  level3: 'heistMapL3',
  level4: 'heistMapL4',
  level5: 'heistMapL5',
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
