import type { MessageKey } from '../../i18n/messages'
import type { DuckCoinKind } from '../coinAssets'

export const MANSION_W = 3520
export const MANSION_H = 2560
export const MANSION_SPAWN = { x: 240, y: 2340 }
export const MANSION_EXIT = { x: 3280, y: 260 }

export type MansionRect = { x: number; y: number; w: number; h: number }
export type MansionDoor = MansionRect & { id: 'storageA' | 'storageB' | 'treasure' }
export type MansionFurn = MansionRect & {
  kind: 'desk' | 'cabinet' | 'column' | 'sofa' | 'bed' | 'plant' | 'stove'
}
export type MansionDecor = MansionRect & { kind: 'rug' | 'painting' | 'rope' }

/** Inner walls only. Outer bounds and locked doors are added by the scene. */
export const MANSION_WALLS: MansionRect[] = [
  { x: 40, y: 2080, w: 140, h: 28 },
  { x: 320, y: 2080, w: 320, h: 28 },
  { x: 640, y: 2080, w: 28, h: 440 },
  { x: 640, y: 2080, w: 360, h: 28 },
  { x: 1000, y: 2080, w: 28, h: 440 },
  { x: 420, y: 1280, w: 28, h: 300 },
  { x: 420, y: 1720, w: 28, h: 160 },
  { x: 420, y: 2020, w: 28, h: 60 },
  { x: 420, y: 1760, w: 360, h: 28 },
  { x: 920, y: 1760, w: 80, h: 28 },
  { x: 720, y: 1760, w: 28, h: 120 },
  { x: 720, y: 2020, w: 28, h: 60 },
  { x: 1000, y: 1760, w: 28, h: 320 },
  { x: 420, y: 880, w: 28, h: 220 },
  { x: 420, y: 1240, w: 28, h: 240 },
  { x: 420, y: 1480, w: 140, h: 28 },
  { x: 720, y: 1480, w: 560, h: 28 },
  { x: 1460, y: 1480, w: 640, h: 28 },
  { x: 2240, y: 1480, w: 240, h: 28 },
  { x: 420, y: 880, w: 140, h: 28 },
  { x: 720, y: 880, w: 460, h: 28 },
  { x: 1360, y: 880, w: 1120, h: 28 },
  { x: 40, y: 400, w: 100, h: 28 },
  { x: 280, y: 400, w: 140, h: 28 },
  { x: 420, y: 40, w: 28, h: 360 },
  { x: 1000, y: 40, w: 28, h: 440 },
  { x: 1000, y: 620, w: 28, h: 260 },
  { x: 1760, y: 40, w: 28, h: 200 },
  { x: 1760, y: 400, w: 28, h: 480 },
  { x: 2480, y: 40, w: 28, h: 260 },
  { x: 2480, y: 460, w: 28, h: 420 },
  { x: 2480, y: 880, w: 28, h: 220 },
  { x: 2480, y: 1260, w: 28, h: 220 },
  { x: 2480, y: 640, w: 600, h: 28 },
  { x: 3240, y: 640, w: 240, h: 28 },
  { x: 2920, y: 880, w: 28, h: 200 },
  { x: 2920, y: 1240, w: 28, h: 320 },
  { x: 2920, y: 880, w: 560, h: 28 },
  { x: 2920, y: 1560, w: 560, h: 28 },
  { x: 2480, y: 1480, w: 440, h: 28 },
  { x: 1960, y: 1480, w: 28, h: 120 },
  { x: 1960, y: 1740, w: 28, h: 100 },
  { x: 1960, y: 1840, w: 28, h: 240 },
  { x: 1960, y: 2080, w: 520, h: 28 },
  { x: 2480, y: 1480, w: 28, h: 600 },
  { x: 1000, y: 1480, w: 28, h: 100 },
  { x: 1000, y: 1700, w: 28, h: 140 },
  { x: 1000, y: 1840, w: 960, h: 28 },
  { x: 2920, y: 40, w: 28, h: 260 },
  { x: 2920, y: 460, w: 28, h: 180 },
]

/**
 * Siren plan: the safe alarm seals the usual way to EXIT and opens the service
 * passage that runs from the treasure room straight into the exit hall.
 */
export const MANSION_SIREN: {
  close: MansionRect[]
  openWalls: MansionRect[]
  unlockDoors: MansionDoor['id'][]
  redeploy: { guard: number; route: { x: number; y: number }[] }[]
} = {
  close: [{ x: 3080, y: 640, w: 160, h: 28 }],
  openWalls: [
    { x: 2480, y: 300, w: 28, h: 160 },
    { x: 2920, y: 300, w: 28, h: 160 },
  ],
  unlockDoors: ['treasure'],
  redeploy: [
    {
      guard: 0,
      route: [
        { x: 1260, y: 1020 },
        { x: 1260, y: 700 },
        { x: 1560, y: 540 },
        { x: 1260, y: 960 },
      ],
    },
    {
      guard: 3,
      route: [
        { x: 2040, y: 620 },
        { x: 2300, y: 360 },
        { x: 2040, y: 200 },
      ],
    },
  ],
}

export const MANSION_DOORS: MansionDoor[] = [
  { id: 'storageA', x: 140, y: 400, w: 140, h: 28 },
  { id: 'storageB', x: 2920, y: 1080, w: 28, h: 160 },
  { id: 'treasure', x: 1760, y: 240, w: 28, h: 160 },
]

export const MANSION_FURNITURE: MansionFurn[] = [
  { x: 70, y: 2180, w: 90, h: 70, kind: 'cabinet' },
  { x: 180, y: 2188, w: 44, h: 52, kind: 'plant' },
  { x: 560, y: 1788, w: 64, h: 120, kind: 'cabinet' },
  { x: 780, y: 1920, w: 80, h: 100, kind: 'cabinet' },
  { x: 460, y: 1600, w: 150, h: 46, kind: 'stove' },
  { x: 1120, y: 1520, w: 170, h: 70, kind: 'sofa' },
  { x: 1520, y: 1700, w: 190, h: 78, kind: 'sofa' },
  { x: 780, y: 1020, w: 170, h: 46, kind: 'desk' },
  { x: 1580, y: 1220, w: 170, h: 46, kind: 'desk' },
  { x: 1080, y: 1120, w: 46, h: 46, kind: 'column' },
  { x: 1780, y: 1280, w: 46, h: 46, kind: 'column' },
  { x: 1320, y: 980, w: 48, h: 56, kind: 'plant' },
  { x: 480, y: 80, w: 160, h: 90, kind: 'bed' },
  { x: 1220, y: 80, w: 180, h: 100, kind: 'bed' },
  { x: 70, y: 80, w: 90, h: 70, kind: 'cabinet' },
  { x: 3320, y: 940, w: 90, h: 80, kind: 'cabinet' },
  { x: 1820, y: 80, w: 90, h: 140, kind: 'cabinet' },
  { x: 3180, y: 80, w: 90, h: 70, kind: 'cabinet' },
  { x: 2100, y: 1680, w: 48, h: 56, kind: 'plant' },
  { x: 3000, y: 200, w: 48, h: 56, kind: 'plant' },
]

export const MANSION_DECOR: MansionDecor[] = [
  { x: 1280, y: 1640, w: 320, h: 200, kind: 'rug' },
  { x: 1100, y: 1040, w: 360, h: 220, kind: 'rug' },
  { x: 70, y: 2100, w: 70, h: 46, kind: 'painting' },
  { x: 1860, y: 900, w: 80, h: 52, kind: 'painting' },
  { x: 700, y: 900, w: 80, h: 52, kind: 'painting' },
]

export const MANSION_HIDES: MansionRect[] = [
  { x: 162, y: 2180, w: 44, h: 70 },
  { x: 626, y: 1788, w: 50, h: 120 },
  { x: 862, y: 1920, w: 50, h: 100 },
  { x: 460, y: 1646, w: 150, h: 48 },
  { x: 1120, y: 1566, w: 170, h: 48 },
  { x: 780, y: 1066, w: 170, h: 48 },
  { x: 1068, y: 1166, w: 70, h: 40 },
  { x: 1768, y: 1326, w: 70, h: 40 },
  { x: 480, y: 126, w: 160, h: 48 },
  { x: 162, y: 80, w: 44, h: 70 },
  { x: 3268, y: 940, w: 50, h: 80 },
  { x: 1912, y: 80, w: 48, h: 140 },
]

export const MANSION_LOOT: { x: number; y: number; kind: DuckCoinKind }[] = [
  { x: 180, y: 2300, kind: 'C5' },
  { x: 300, y: 2440, kind: 'C5' },
  { x: 460, y: 2280, kind: 'C5' },
  { x: 360, y: 2188, kind: 'C10' },
  { x: 540, y: 1960, kind: 'C5' },
  { x: 620, y: 2040, kind: 'C10' },
  { x: 820, y: 1960, kind: 'C5' },
  { x: 900, y: 2040, kind: 'C10' },
  { x: 180, y: 1900, kind: 'C5' },
  { x: 280, y: 1760, kind: 'C5' },
  { x: 160, y: 1600, kind: 'C5' },
  { x: 300, y: 1450, kind: 'C5' },
  { x: 540, y: 1680, kind: 'C5' },
  { x: 820, y: 1600, kind: 'C5' },
  { x: 640, y: 1540, kind: 'C10' },
  { x: 1140, y: 1700, kind: 'C5' },
  { x: 1500, y: 1760, kind: 'C5' },
  { x: 1720, y: 1580, kind: 'C5' },
  { x: 1320, y: 1550, kind: 'C5' },
  { x: 1400, y: 1650, kind: 'C10' },
  { x: 720, y: 1200, kind: 'C5' },
  { x: 1020, y: 1000, kind: 'C5' },
  { x: 1620, y: 1320, kind: 'C5' },
  { x: 1920, y: 1100, kind: 'C5' },
  { x: 2220, y: 1260, kind: 'C5' },
  { x: 900, y: 1400, kind: 'C5' },
  { x: 1400, y: 1180, kind: 'C10' },
  { x: 200, y: 1000, kind: 'C5' },
  { x: 300, y: 800, kind: 'C5' },
  { x: 180, y: 620, kind: 'C5' },
  { x: 240, y: 520, kind: 'C10' },
  { x: 540, y: 400, kind: 'C5' },
  { x: 800, y: 700, kind: 'C5' },
  { x: 620, y: 220, kind: 'C5' },
  { x: 880, y: 300, kind: 'C10' },
  { x: 1220, y: 320, kind: 'C5' },
  { x: 1500, y: 620, kind: 'C5' },
  { x: 1600, y: 200, kind: 'C10' },
  { x: 1320, y: 700, kind: 'C50' },
  { x: 2100, y: 1700, kind: 'C5' },
  { x: 2300, y: 1900, kind: 'C5' },
  { x: 2600, y: 760, kind: 'C5' },
  { x: 3000, y: 720, kind: 'C5' },
  { x: 2700, y: 1300, kind: 'C10' },
  { x: 2600, y: 1000, kind: 'C50' },
  { x: 240, y: 280, kind: 'C50' },
  { x: 2100, y: 300, kind: 'C100' },
]

export const MANSION_SAFES: {
  x: number
  y: number
  extraX: number
  extraY: number
  extraKind?: DuckCoinKind
  reward: number
}[] = [
  { x: 180, y: 180, extraX: 260, extraY: 260, reward: 50 },
  { x: 3220, y: 1180, extraX: 3340, extraY: 1320, reward: 100 },
]

export const MANSION_CAMS: { x: number; y: number; base: number; sweep: number; speed: number }[] = [
  { x: 1400, y: 900, base: Math.PI / 2, sweep: 0.7, speed: 0.48 },
  { x: 200, y: 1580, base: 0, sweep: 0.55, speed: 0.4 },
  { x: 420, y: 1160, base: Math.PI, sweep: 0.6, speed: 0.42 },
  { x: 2480, y: 1180, base: 0, sweep: 0.65, speed: 0.44 },
  { x: 300, y: 500, base: Math.PI / 2, sweep: 0.55, speed: 0.38 },
  { x: 2700, y: 1160, base: 0, sweep: 0.55, speed: 0.4 },
]

export const MANSION_GUARD_ROUTES: { x: number; y: number }[][] = [
  [
    { x: 800, y: 1180 },
    { x: 1400, y: 1100 },
    { x: 2000, y: 1220 },
    { x: 1400, y: 1360 },
  ],
  [
    { x: 300, y: 1180 },
    { x: 240, y: 900 },
    { x: 360, y: 700 },
  ],
  [
    { x: 2600, y: 1180 },
    { x: 2700, y: 1000 },
    { x: 2600, y: 1360 },
  ],
  [
    { x: 700, y: 500 },
    { x: 1200, y: 500 },
    { x: 1500, y: 700 },
  ],
  [
    { x: 260, y: 1680 },
    { x: 260, y: 1920 },
    { x: 220, y: 1480 },
  ],
]

export const MANSION_LABELS: { x: number; y: number; key: MessageKey }[] = [
  { x: 340, y: 2480, key: 'heistRoomStart' },
  { x: 560, y: 1980, key: 'heistRoomToilet' },
  { x: 860, y: 1980, key: 'heistRoomUtility' },
  { x: 700, y: 1620, key: 'heistRoomKitchen' },
  { x: 1480, y: 1760, key: 'heistRoomLiving' },
  { x: 1400, y: 1180, key: 'heistRoomGreatHall' },
  { x: 700, y: 480, key: 'heistRoomBedroom' },
  { x: 1380, y: 480, key: 'heistRoomMaster' },
  { x: 2100, y: 480, key: 'heistRoomTreasure' },
  { x: 230, y: 240, key: 'heistRoomStorageA' },
  { x: 3200, y: 1420, key: 'heistRoomStorageB' },
  { x: 2200, y: 1880, key: 'heistRoomHall' },
]

export const MANSION_LAMPS: [number, number][] = [
  [240, 2300],
  [560, 1960],
  [860, 1960],
  [240, 1700],
  [700, 1600],
  [1400, 1660],
  [1400, 1180],
  [700, 500],
  [1400, 400],
  [2100, 400],
  [240, 700],
  [2700, 1180],
  [3280, 260],
]

export const MANSION_FLOORS: { x: number; y: number; w: number; h: number; color: number; alpha: number }[] = [
  { x: 40, y: 2080, w: 600, h: 440, color: 0x1a120c, alpha: 0.3 },
  { x: 420, y: 1760, w: 300, h: 320, color: 0x16120e, alpha: 0.34 },
  { x: 720, y: 1760, w: 280, h: 320, color: 0x18140c, alpha: 0.3 },
  { x: 420, y: 880, w: 2060, h: 600, color: 0x20140c, alpha: 0.22 },
  { x: 40, y: 40, w: 380, h: 360, color: 0x24160e, alpha: 0.32 },
  { x: 2920, y: 880, w: 560, h: 680, color: 0x24160e, alpha: 0.32 },
  { x: 1760, y: 40, w: 720, h: 840, color: 0x2a1810, alpha: 0.28 },
  { x: 2920, y: 40, w: 560, h: 600, color: 0x142018, alpha: 0.28 },
]
