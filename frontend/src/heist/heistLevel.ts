import { RAID_OBJ_TIME_S, isMansionUnlocked, type PlayerProgress } from './progress'
import type { MessageKey } from '../i18n/messages'

export type HeistLevelId = 'bank' | 'mansion'

export type HeistLevelCard = {
  n: number
  id: HeistLevelId | null
  nameKey: MessageKey
  locked: boolean
  tone: 'bank' | 'mansion' | 'locked'
}

export function heistLevelCards(progress: PlayerProgress): readonly HeistLevelCard[] {
  return [
    { n: 1, id: 'bank', nameKey: 'heistMapBank', locked: false, tone: 'bank' },
    { n: 2, id: 'mansion', nameKey: 'heistMapMansion', locked: !isMansionUnlocked(progress), tone: 'mansion' },
    { n: 3, id: null, nameKey: 'heistMapSoon', locked: true, tone: 'locked' },
    { n: 4, id: null, nameKey: 'heistMapSoon', locked: true, tone: 'locked' },
  ]
}

export const HEIST_LEVEL_CARDS: readonly HeistLevelCard[] = heistLevelCards({ bankComplete: false } as PlayerProgress)

export function heistLevelObjectives(id: HeistLevelId) {
  if (id === 'mansion') return { loot: 250, timeS: 150 }
  return { loot: 100, timeS: RAID_OBJ_TIME_S }
}

/** Shown on the level card so the risk is known before the raid starts. */
export function heistLevelBrief(id: HeistLevelId) {
  const obj = heistLevelObjectives(id)
  if (id === 'mansion') return { ...obj, guards: 5, cams: 6, safes: 2 }
  return { ...obj, guards: 5, cams: 12, safes: 2 }
}
