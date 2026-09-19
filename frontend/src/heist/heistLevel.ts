import { RAID_OBJ_TIME_S } from './progress'
import type { MessageKey } from '../i18n/messages'

export type HeistLevelId = 'bank' | 'mansion'

export type HeistLevelCard = {
  n: number
  id: HeistLevelId | null
  nameKey: MessageKey
  locked: boolean
  tone: 'bank' | 'mansion' | 'locked'
}

export const HEIST_LEVEL_CARDS: readonly HeistLevelCard[] = [
  { n: 1, id: 'bank', nameKey: 'heistMapBank', locked: false, tone: 'bank' },
  { n: 2, id: 'mansion', nameKey: 'heistMapMansion', locked: false, tone: 'mansion' },
  { n: 3, id: null, nameKey: 'heistMapSoon', locked: true, tone: 'locked' },
  { n: 4, id: null, nameKey: 'heistMapSoon', locked: true, tone: 'locked' },
]

export function heistLevelObjectives(id: HeistLevelId) {
  if (id === 'mansion') return { loot: 250, timeS: 150 }
  // Bank: the lobby alone is not enough, the hall has to be worked.
  return { loot: 150, timeS: RAID_OBJ_TIME_S }
}

/** Shown on the level card so the risk is known before the raid starts. */
export function heistLevelBrief(id: HeistLevelId) {
  const obj = heistLevelObjectives(id)
  if (id === 'mansion') return { ...obj, guards: 5, cams: 6, safes: 2 }
  return { ...obj, guards: 3, cams: 5, safes: 1 }
}
