import type { MessageKey } from '../../i18n/messages'
import type { DuckCoinKind } from '../coinAssets'

/**
 * LEVEL 1 BANK — one long heist, south start to north vault.
 *
 *   START / LOBBY     y 3280..3800
 *   MAIN HALL         y 2560..3280
 *   OFFICES           y 2080..2560
 *   SECURITY          y 1640..2080
 *   STORAGE A         y 1160..1640  (locked)
 *   DEEP CORRIDOR     y  860..1160
 *   SECOND WING       y  520..860
 *   STORAGE B / FINAL y   40..520   (locked)
 *
 * EXIT stays in the lobby so a deep run always walks back with the bag.
 */
export const BANK_W = 2200
export const BANK_H = 3840
export const BANK_SPAWN = { x: 1960, y: 3660 }
export const BANK_EXIT = { x: 200, y: 3660 }
export const BANK_ZONE_COUNT = 10

export type BankRect = { x: number; y: number; w: number; h: number }
export type BankDoor = BankRect & { id: string }
export type BankFurn = BankRect & {
  kind: 'desk' | 'cabinet' | 'column' | 'atm' | 'chair' | 'counter' | 'shelf' | 'plant' | 'bench' | 'lamp' | 'toilet'
}
export type BankDecor = BankRect & { kind: 'rug' | 'painting' | 'rope' }
export type BankLoot = { id: string; x: number; y: number; kind: DuckCoinKind }
export type BankSafe = {
  id: string
  x: number
  y: number
  extraX: number
  extraY: number
  extraKind?: DuckCoinKind
  extraId: string
  reward: number
}
export type BankZone = {
  i: number
  id: string
  key: MessageKey
  x: number
  y: number
  w: number
  h: number
  spawn: { x: number; y: number }
}

const T = 40
const WH = 28
const INNER_L = T
const INNER_R = BANK_W - T

function hw(x: number, y: number, w: number): BankRect {
  return { x, y, w, h: WH }
}
function vw(x: number, y: number, h: number): BankRect {
  return { x, y, w: WH, h }
}

/** Horizontal divider with open gaps [x0, x1). */
function divider(y: number, gaps: readonly (readonly [number, number])[]): BankRect[] {
  const out: BankRect[] = []
  let x = INNER_L
  for (const [a, b] of [...gaps].sort((l, r) => l[0] - r[0])) {
    if (a > x) out.push(hw(x, y, a - x))
    x = Math.max(x, b)
  }
  if (x < INNER_R) out.push(hw(x, y, INNER_R - x))
  return out
}

const GAP_W: readonly [number, number] = [88, 228]
const GAP_C: readonly [number, number] = [980, 1220]
const GAP_E: readonly [number, number] = [1972, 2112]
const GAP_DOOR: readonly [number, number] = [1030, 1170]
const OPEN3 = [GAP_W, GAP_C, GAP_E] as const

export const BANK_WALLS: BankRect[] = [
  ...divider(3280, OPEN3),
  ...divider(2560, OPEN3),
  ...divider(2080, OPEN3),
  ...divider(1640, [GAP_DOOR]),
  ...divider(1160, [GAP_W, GAP_E]),
  ...divider(860, OPEN3),
  ...divider(520, [GAP_DOOR]),

  // offices: west rooms, centre hall, east meeting
  vw(520, 2080 + WH, 180),
  vw(520, 2380, 180),
  vw(900, 2080 + WH, 180),
  vw(900, 2380, 180),
  vw(1300, 2080 + WH, 180),
  vw(1300, 2380, 180),
  vw(1680, 2080 + WH, 180),
  vw(1680, 2380, 180),

  // security / toilet / archive
  vw(400, 1640 + WH, 150),
  vw(400, 1910, 170),
  vw(760, 1640 + WH, 150),
  vw(760, 1910, 170),
  vw(1480, 1640 + WH, 150),
  vw(1480, 1910, 170),

  // storage A inner shelf wall
  vw(640, 1160 + WH, 160),
  vw(640, 1460, 180),

  // deep corridor pinch (keep 120px west and east routes)
  hw(320, 1010, 620),
  hw(1260, 1010, 620),

  // second wing rooms
  vw(560, 520 + WH, 120),
  vw(560, 740, 120),
  vw(1640, 520 + WH, 120),
  vw(1640, 740, 120),

  // final vault inner
  vw(760, 40, 200),
  vw(1480, 40, 220),
]

export const BANK_DOORS: BankDoor[] = [
  { id: 'bankStorageA', x: GAP_DOOR[0], y: 1640, w: GAP_DOOR[1] - GAP_DOOR[0], h: WH },
  { id: 'bankVaultB', x: GAP_DOOR[0], y: 520, w: GAP_DOOR[1] - GAP_DOOR[0], h: WH },
]

export const BANK_FURNITURE: BankFurn[] = [
  // lobby
  { x: 360, y: 3440, w: 180, h: 46, kind: 'counter' },
  { x: 700, y: 3520, w: 140, h: 40, kind: 'bench' },
  { x: 980, y: 3488, w: 52, h: 64, kind: 'atm' },
  { x: 1050, y: 3488, w: 52, h: 64, kind: 'atm' },
  { x: 1320, y: 3440, w: 170, h: 46, kind: 'desk' },
  { x: 80, y: 3480, w: 40, h: 48, kind: 'plant' },
  { x: 2100, y: 3480, w: 40, h: 48, kind: 'plant' },
  { x: 400, y: 3490, w: 36, h: 32, kind: 'chair' },
  { x: 1360, y: 3490, w: 36, h: 32, kind: 'chair' },
  // start desk
  { x: 1720, y: 3520, w: 120, h: 46, kind: 'counter' },
  { x: 2080, y: 3680, w: 56, h: 70, kind: 'cabinet' },

  // main hall tellers + columns
  { x: 320, y: 2780, w: 170, h: 46, kind: 'counter' },
  { x: 320, y: 3020, w: 170, h: 46, kind: 'counter' },
  { x: 1480, y: 2780, w: 170, h: 46, kind: 'desk' },
  { x: 1480, y: 3020, w: 170, h: 46, kind: 'desk' },
  { x: 300, y: 2830, w: 36, h: 32, kind: 'chair' },
  { x: 1524, y: 2830, w: 36, h: 32, kind: 'chair' },
  { x: 700, y: 2880, w: 46, h: 46, kind: 'column' },
  { x: 1454, y: 2880, w: 46, h: 46, kind: 'column' },
  { x: 1100, y: 2700, w: 46, h: 46, kind: 'column' },
  { x: 80, y: 2860, w: 70, h: 110, kind: 'cabinet' },
  { x: 2050, y: 2860, w: 70, h: 110, kind: 'cabinet' },

  // offices
  { x: 120, y: 2200, w: 150, h: 46, kind: 'desk' },
  { x: 160, y: 2250, w: 36, h: 32, kind: 'chair' },
  { x: 580, y: 2200, w: 150, h: 46, kind: 'desk' },
  { x: 620, y: 2250, w: 36, h: 32, kind: 'chair' },
  { x: 1360, y: 2200, w: 150, h: 46, kind: 'desk' },
  { x: 1740, y: 2180, w: 150, h: 46, kind: 'counter' },
  { x: 80, y: 2360, w: 70, h: 100, kind: 'cabinet' },
  { x: 2050, y: 2360, w: 70, h: 100, kind: 'shelf' },
  { x: 1100, y: 2320, w: 46, h: 46, kind: 'column' },

  // toilet / utility / security / archive
  { x: 80, y: 1760, w: 52, h: 70, kind: 'toilet' },
  { x: 160, y: 1760, w: 52, h: 70, kind: 'toilet' },
  { x: 80, y: 1940, w: 70, h: 90, kind: 'shelf' },
  { x: 480, y: 1760, w: 70, h: 90, kind: 'cabinet' },
  { x: 860, y: 1760, w: 170, h: 46, kind: 'desk' },
  { x: 900, y: 1810, w: 36, h: 32, kind: 'chair' },
  { x: 1100, y: 1880, w: 46, h: 46, kind: 'column' },
  { x: 1560, y: 1760, w: 80, h: 120, kind: 'shelf' },
  { x: 1760, y: 1760, w: 80, h: 120, kind: 'shelf' },
  { x: 1960, y: 1860, w: 70, h: 90, kind: 'cabinet' },

  // storage A
  { x: 80, y: 1280, w: 80, h: 140, kind: 'shelf' },
  { x: 200, y: 1280, w: 80, h: 140, kind: 'cabinet' },
  { x: 720, y: 1280, w: 80, h: 140, kind: 'shelf' },
  { x: 1680, y: 1280, w: 80, h: 140, kind: 'cabinet' },
  { x: 1880, y: 1280, w: 80, h: 140, kind: 'shelf' },
  { x: 1100, y: 1400, w: 46, h: 46, kind: 'column' },
  { x: 400, y: 1500, w: 150, h: 46, kind: 'desk' },

  // deep corridor lockers
  { x: 80, y: 920, w: 70, h: 70, kind: 'cabinet' },
  { x: 2050, y: 920, w: 70, h: 70, kind: 'shelf' },
  { x: 1100, y: 940, w: 28, h: 40, kind: 'lamp' },

  // second wing
  { x: 120, y: 620, w: 150, h: 46, kind: 'desk' },
  { x: 160, y: 670, w: 36, h: 32, kind: 'chair' },
  { x: 1720, y: 620, w: 150, h: 46, kind: 'desk' },
  { x: 80, y: 720, w: 70, h: 90, kind: 'cabinet' },
  { x: 2050, y: 720, w: 70, h: 90, kind: 'cabinet' },
  { x: 1100, y: 680, w: 46, h: 46, kind: 'column' },

  // final vault
  { x: 80, y: 80, w: 80, h: 140, kind: 'cabinet' },
  { x: 200, y: 80, w: 80, h: 140, kind: 'shelf' },
  { x: 840, y: 80, w: 80, h: 140, kind: 'cabinet' },
  { x: 1560, y: 80, w: 80, h: 140, kind: 'shelf' },
  { x: 1960, y: 80, w: 80, h: 140, kind: 'cabinet' },
  { x: 400, y: 300, w: 150, h: 46, kind: 'desk' },
  { x: 1100, y: 240, w: 46, h: 46, kind: 'column' },
]

export const BANK_DECOR: BankDecor[] = [
  { x: 520, y: 3560, w: 280, h: 160, kind: 'rug' },
  { x: 700, y: 2840, w: 260, h: 180, kind: 'rug' },
  { x: 980, y: 2200, w: 240, h: 160, kind: 'rug' },
  { x: 900, y: 1760, w: 220, h: 140, kind: 'rug' },
  { x: 900, y: 1280, w: 240, h: 160, kind: 'rug' },
  { x: 980, y: 620, w: 240, h: 140, kind: 'rug' },
  { x: 980, y: 160, w: 240, h: 160, kind: 'rug' },
  { x: 90, y: 3310, w: 70, h: 46, kind: 'painting' },
  { x: 2040, y: 3310, w: 70, h: 46, kind: 'painting' },
  { x: 700, y: 2588, w: 64, h: 40, kind: 'painting' },
  { x: 1500, y: 2588, w: 64, h: 40, kind: 'painting' },
  { x: 1020, y: 1610, w: 160, h: 18, kind: 'rope' },
  { x: 1020, y: 490, w: 160, h: 18, kind: 'rope' },
]

export const BANK_HIDES: BankRect[] = [
  { x: 360, y: 3486, w: 180, h: 48 },
  { x: 1320, y: 3486, w: 170, h: 48 },
  { x: 1720, y: 3566, w: 120, h: 48 },
  { x: 320, y: 2826, w: 170, h: 48 },
  { x: 320, y: 3066, w: 170, h: 48 },
  { x: 1480, y: 2826, w: 170, h: 48 },
  { x: 1480, y: 3066, w: 170, h: 48 },
  { x: 688, y: 2926, w: 70, h: 40 },
  { x: 1442, y: 2926, w: 70, h: 40 },
  { x: 150, y: 2870, w: 50, h: 90 },
  { x: 1990, y: 2870, w: 50, h: 90 },
  { x: 120, y: 2246, w: 150, h: 46 },
  { x: 580, y: 2246, w: 150, h: 46 },
  { x: 1360, y: 2246, w: 150, h: 46 },
  { x: 860, y: 1806, w: 170, h: 48 },
  { x: 80, y: 1940, w: 70, h: 90 },
  { x: 1560, y: 1760, w: 80, h: 120 },
  { x: 400, y: 1546, w: 150, h: 46 },
  { x: 80, y: 1280, w: 80, h: 140 },
  { x: 120, y: 666, w: 150, h: 46 },
  { x: 1720, y: 666, w: 150, h: 46 },
  { x: 400, y: 346, w: 150, h: 46 },
  { x: 80, y: 80, w: 80, h: 140 },
]

export const BANK_LOOT: BankLoot[] = [
  // start / lobby ~40
  { id: 'bl-01', x: 1820, y: 3660, kind: 'C5' },
  { id: 'bl-02', x: 1680, y: 3540, kind: 'C5' },
  { id: 'bl-03', x: 1480, y: 3680, kind: 'C5' },
  { id: 'bl-04', x: 1200, y: 3600, kind: 'C5' },
  { id: 'bl-05', x: 860, y: 3680, kind: 'C5' },
  { id: 'bl-06', x: 520, y: 3580, kind: 'C10' },
  { id: 'bl-07', x: 340, y: 3700, kind: 'C5' },
  // hall ~40
  { id: 'bl-08', x: 240, y: 3100, kind: 'C10' },
  { id: 'bl-09', x: 560, y: 2920, kind: 'C10' },
  { id: 'bl-10', x: 1100, y: 2800, kind: 'C10' },
  { id: 'bl-11', x: 1640, y: 2920, kind: 'C10' },
  { id: 'bl-12', x: 1960, y: 3100, kind: 'C5' },
  { id: 'bl-13', x: 1100, y: 3140, kind: 'C5' },
  // offices ~70
  { id: 'bl-14', x: 240, y: 2320, kind: 'C10' },
  { id: 'bl-15', x: 700, y: 2320, kind: 'C10' },
  { id: 'bl-16', x: 1100, y: 2160, kind: 'C10' },
  { id: 'bl-17', x: 1540, y: 2320, kind: 'C50' },
  { id: 'bl-18', x: 1900, y: 2160, kind: 'C10' },
  // security / utility ~40
  { id: 'bl-19', x: 220, y: 1880, kind: 'C10' },
  { id: 'bl-20', x: 1100, y: 1760, kind: 'C10' },
  { id: 'bl-21', x: 1680, y: 1960, kind: 'C10' },
  { id: 'bl-22', x: 1960, y: 1760, kind: 'C10' },
  // storage A ~100
  { id: 'bl-23', x: 360, y: 1360, kind: 'C50' },
  { id: 'bl-24', x: 880, y: 1320, kind: 'C50' },
  { id: 'bl-25', x: 1800, y: 1480, kind: 'C10' },
  // deep corridor ~60
  { id: 'bl-26', x: 240, y: 980, kind: 'C10' },
  { id: 'bl-27', x: 1600, y: 1060, kind: 'C50' },
  // second wing ~100
  { id: 'bl-28', x: 280, y: 700, kind: 'C50' },
  { id: 'bl-29', x: 1860, y: 700, kind: 'C50' },
  // storage B / final ~250 coins on floor
  { id: 'bl-30', x: 360, y: 180, kind: 'C50' },
  { id: 'bl-31', x: 1100, y: 360, kind: 'C100' },
  { id: 'bl-32', x: 1860, y: 180, kind: 'C100' },
]

export const BANK_SAFES: BankSafe[] = [
  {
    id: 'bankSafeA',
    x: 280,
    y: 1500,
    extraX: 480,
    extraY: 1380,
    extraKind: 'C50',
    extraId: 'bl-safe-a',
    reward: 100,
  },
  {
    id: 'bankSafeB',
    x: 1860,
    y: 320,
    extraX: 1680,
    extraY: 220,
    extraKind: 'C100',
    extraId: 'bl-safe-b',
    reward: 150,
  },
]

export const BANK_CAMS: { x: number; y: number; base: number; sweep: number; speed: number }[] = [
  { x: 1100, y: 3320, base: Math.PI / 2, sweep: 0.7, speed: 0.42 },
  { x: 2040, y: 2920, base: Math.PI, sweep: 0.8, speed: 0.48 },
  { x: 160, y: 2920, base: 0, sweep: 0.8, speed: 0.44 },
  { x: 1100, y: 2120, base: Math.PI / 2, sweep: 0.75, speed: 0.46 },
  { x: 1100, y: 1680, base: Math.PI / 2, sweep: 0.55, speed: 0.5 },
  { x: 1880, y: 1220, base: Math.PI, sweep: 0.7, speed: 0.45 },
  { x: 1100, y: 560, base: Math.PI / 2, sweep: 0.7, speed: 0.42 },
]

export const BANK_GUARD_ROUTES: { x: number; y: number }[][] = [
  [
    { x: 400, y: 2920 },
    { x: 1100, y: 2720 },
    { x: 1700, y: 2920 },
    { x: 1100, y: 3120 },
  ],
  [
    { x: 300, y: 2320 },
    { x: 1100, y: 2320 },
    { x: 1100, y: 1840 },
    { x: 500, y: 1840 },
  ],
  [
    { x: 300, y: 1400 },
    { x: 1100, y: 1400 },
    { x: 1800, y: 1400 },
    { x: 1800, y: 980 },
    { x: 300, y: 980 },
  ],
  [
    { x: 300, y: 700 },
    { x: 1100, y: 700 },
    { x: 1800, y: 700 },
    { x: 1100, y: 400 },
  ],
]

export const BANK_ZONES: BankZone[] = [
  { i: 0, id: 'start', key: 'heistRoomStart', x: 1400, y: 3280, w: 760, h: 520, spawn: { x: 1960, y: 3660 } },
  { i: 1, id: 'lobby', key: 'heistRoomLobby', x: 40, y: 3280, w: 1360, h: 520, spawn: { x: 700, y: 3600 } },
  { i: 2, id: 'hall', key: 'heistRoomHall', x: 40, y: 2560, w: 2120, h: 720, spawn: { x: 1100, y: 3000 } },
  { i: 3, id: 'offices', key: 'heistRoomOffices', x: 40, y: 2080, w: 2120, h: 480, spawn: { x: 1100, y: 2360 } },
  { i: 4, id: 'security', key: 'heistRoomSecurity', x: 40, y: 1640, w: 2120, h: 440, spawn: { x: 1100, y: 1880 } },
  { i: 5, id: 'storageA', key: 'heistRoomStorageA', x: 40, y: 1160, w: 2120, h: 480, spawn: { x: 1100, y: 1480 } },
  { i: 6, id: 'deep', key: 'heistRoomDeep', x: 40, y: 860, w: 2120, h: 300, spawn: { x: 1100, y: 1000 } },
  { i: 7, id: 'wing', key: 'heistRoomWing', x: 40, y: 520, w: 2120, h: 340, spawn: { x: 1100, y: 700 } },
  { i: 8, id: 'storageB', key: 'heistRoomStorageB', x: 40, y: 280, w: 2120, h: 240, spawn: { x: 1100, y: 400 } },
  { i: 9, id: 'final', key: 'heistRoomFinal', x: 40, y: 40, w: 2120, h: 240, spawn: { x: 1100, y: 180 } },
]

export const BANK_LABELS: { x: number; y: number; key: MessageKey }[] = [
  { x: 1960, y: 3520, key: 'heistRoomStart' },
  { x: 200, y: 3520, key: 'heistRoomLobby' },
  { x: 1100, y: 2920, key: 'heistRoomHall' },
  { x: 300, y: 2180, key: 'heistRoomOffices' },
  { x: 1740, y: 2140, key: 'heistRoomMeeting' },
  { x: 200, y: 1700, key: 'heistRoomToilet' },
  { x: 500, y: 1700, key: 'heistRoomUtility' },
  { x: 1100, y: 1720, key: 'heistRoomSecurity' },
  { x: 1760, y: 1700, key: 'heistRoomArchive' },
  { x: 1100, y: 1240, key: 'heistRoomStorageA' },
  { x: 1100, y: 920, key: 'heistRoomDeep' },
  { x: 1100, y: 640, key: 'heistRoomWing' },
  { x: 1100, y: 360, key: 'heistRoomStorageB' },
  { x: 1100, y: 90, key: 'heistRoomFinal' },
]

export const BANK_LAMPS: [number, number][] = [
  [1960, 3600],
  [1100, 3600],
  [200, 3600],
  [1100, 2920],
  [200, 2920],
  [2000, 2920],
  [1100, 2320],
  [1100, 1840],
  [1100, 1400],
  [200, 1000],
  [2000, 1000],
  [1100, 700],
  [1100, 180],
  [1860, 320],
]

export const BANK_FLOORS: { x: number; y: number; w: number; h: number; color: number; alpha: number }[] = [
  { x: 40, y: 3280, w: 2120, h: 520, color: 0x1a2438, alpha: 0.38 },
  { x: 40, y: 2560, w: 2120, h: 720, color: 0x141820, alpha: 0.28 },
  { x: 40, y: 2080, w: 2120, h: 480, color: 0x182028, alpha: 0.3 },
  { x: 40, y: 1640, w: 2120, h: 440, color: 0x1a1814, alpha: 0.32 },
  { x: 40, y: 1160, w: 2120, h: 480, color: 0x1a1614, alpha: 0.4 },
  { x: 40, y: 860, w: 2120, h: 300, color: 0x14141c, alpha: 0.34 },
  { x: 40, y: 520, w: 2120, h: 340, color: 0x18141a, alpha: 0.34 },
  { x: 40, y: 40, w: 2120, h: 480, color: 0x1c1410, alpha: 0.46 },
]

const COIN_VALUE: Record<DuckCoinKind, number> = { C5: 5, C10: 10, C50: 50, C100: 100 }

export function bankLootCatalog() {
  return BANK_LOOT.map((slot) => ({ id: slot.id, value: COIN_VALUE[slot.kind] }))
}

export function bankTotalPotential() {
  const loot = BANK_LOOT.reduce((sum, slot) => sum + COIN_VALUE[slot.kind], 0)
  const safes = BANK_SAFES.reduce((sum, s) => sum + s.reward + (s.extraKind ? COIN_VALUE[s.extraKind] : 0), 0)
  return loot + safes
}

export function bankCollectedPotential(taken: readonly string[], openedSafes: readonly string[]) {
  let n = 0
  const takenSet = new Set(taken)
  const opened = new Set(openedSafes)
  for (const slot of BANK_LOOT) {
    if (takenSet.has(slot.id)) n += COIN_VALUE[slot.kind]
  }
  for (const safe of BANK_SAFES) {
    if (!opened.has(safe.id)) continue
    n += safe.reward
    if (takenSet.has(safe.extraId) && safe.extraKind) n += COIN_VALUE[safe.extraKind]
  }
  return n
}

export function bankZoneAt(x: number, y: number) {
  for (let i = BANK_ZONES.length - 1; i >= 0; i -= 1) {
    const z = BANK_ZONES[i]
    if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z
  }
  return BANK_ZONES[0]
}

export function bankResumeSpawn(depth: number) {
  const i = Math.max(0, Math.min(BANK_ZONES.length - 1, Math.floor(depth)))
  return BANK_ZONES[i]?.spawn ?? BANK_SPAWN
}
