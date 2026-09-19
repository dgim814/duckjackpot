import { RAID_OBJ_LOOT, RAID_OBJ_TIME_S } from './progress'
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
  return { loot: RAID_OBJ_LOOT, timeS: RAID_OBJ_TIME_S }
}
