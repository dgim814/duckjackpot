import type { MessageKey } from '../../i18n/messages'
import type { DuckCoinKind } from '../coinAssets'

/**
 * LEVEL 1 BANK — 20 real rooms, south entrance to north vault.
 * Spawn is always the south-east START. Lobby EXIT is the early extract;
 * FINAL EXIT is the deep extract for BANK COMPLETE.
 */
export const BANK_W = 2800
export const BANK_H = 7200
export const BANK_SPAWN = { x: 2520, y: 6960 }
export const BANK_EXIT = { x: 220, y: 6960 }
export const BANK_FINAL_EXIT = { x: 1400, y: 180 }
export const BANK_ZONE_COUNT = 20

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

/** Leave a 180px walking gap so the joystick can turn through a split wall. */
function vSplit(x: number, y0: number, y1: number, gap = 180): BankRect[] {
  const top = y0 + WH
  const bottom = y1
  const inner = bottom - top
  if (inner <= gap + 48) return []
  const gapStart = top + Math.floor((inner - gap) / 2)
  const upper = gapStart - top
  const lowerY = gapStart + gap
  const lower = bottom - lowerY
  const out: BankRect[] = []
  if (upper > 24) out.push(vw(x, top, upper))
  if (lower > 24) out.push(vw(x, lowerY, lower))
  return out
}

/** 180px corridors so the duck + joystick can turn. */
const GAP_W: readonly [number, number] = [120, 300]
const GAP_C: readonly [number, number] = [1260, 1540]
const GAP_E: readonly [number, number] = [2500, 2680]
const GAP_DOOR: readonly [number, number] = [1310, 1490]
const OPEN3 = [GAP_W, GAP_C, GAP_E] as const

export const BANK_WALLS: BankRect[] = [
  ...divider(6760, OPEN3),
  ...divider(6320, OPEN3),
  ...divider(5720, OPEN3),
  ...divider(5280, OPEN3),
  ...divider(4840, OPEN3),
  ...divider(4440, [GAP_W, GAP_C, GAP_E]),
  ...divider(4000, OPEN3),
  ...divider(3640, OPEN3),
  ...divider(3240, [GAP_DOOR]),
  ...divider(2800, [GAP_DOOR]),
  ...divider(2360, [GAP_W, GAP_E]),
  ...divider(1920, OPEN3),
  ...divider(1480, [GAP_DOOR]),
  ...divider(1040, OPEN3),
  ...divider(560, OPEN3),

  ...vSplit(900, 5280, 5720),
  ...vSplit(1900, 5280, 5720),
  ...vSplit(700, 4840, 5280),
  ...vSplit(2100, 4840, 5280),
  ...vSplit(620, 4440, 4840),
  ...vSplit(1180, 4440, 4840),
  ...vSplit(2100, 4440, 4840),
  ...vSplit(780, 4000, 4440),
  ...vSplit(2020, 4000, 4440),
  ...vSplit(860, 3640, 4000),
  ...vSplit(1940, 3640, 4000),
  ...vSplit(720, 2800, 3240),
  ...vSplit(2080, 2800, 3240),
  ...vSplit(780, 2360, 2800),

  // deep pinch — west and east remain 180px
  hw(400, 2140, 720),
  hw(1680, 2140, 720),

  ...vSplit(760, 1480, 1920),
  ...vSplit(2040, 1480, 1920),
  ...vSplit(1960, 1040, 1480),

  // final vault inner
  vw(860, 40, 220),
  vw(1940, 40, 260),
]

export const BANK_DOORS: BankDoor[] = [
  { id: 'bankClosed', x: GAP_DOOR[0], y: 3240, w: GAP_DOOR[1] - GAP_DOOR[0], h: WH },
  { id: 'bankStorageA', x: GAP_DOOR[0], y: 2800, w: GAP_DOOR[1] - GAP_DOOR[0], h: WH },
  { id: 'bankStorageB', x: GAP_DOOR[0], y: 1480, w: GAP_DOOR[1] - GAP_DOOR[0], h: WH },
]

export const BANK_FURNITURE: BankFurn[] = [
  // start / lobby
  { x: 2280, y: 6880, w: 140, h: 46, kind: 'counter' },
  { x: 360, y: 6880, w: 180, h: 46, kind: 'counter' },
  { x: 1260, y: 6520, w: 52, h: 64, kind: 'atm' },
  { x: 1340, y: 6520, w: 52, h: 64, kind: 'atm' },
  { x: 700, y: 6560, w: 160, h: 40, kind: 'bench' },
  { x: 80, y: 6880, w: 44, h: 52, kind: 'plant' },
  { x: 2700, y: 6880, w: 44, h: 52, kind: 'plant' },
  { x: 400, y: 6930, w: 36, h: 32, kind: 'chair' },
  { x: 2320, y: 6930, w: 36, h: 32, kind: 'chair' },

  // hall
  { x: 360, y: 5960, w: 180, h: 46, kind: 'counter' },
  { x: 360, y: 6160, w: 180, h: 46, kind: 'counter' },
  { x: 2260, y: 5960, w: 180, h: 46, kind: 'desk' },
  { x: 2260, y: 6160, w: 180, h: 46, kind: 'desk' },
  { x: 980, y: 6000, w: 50, h: 50, kind: 'column' },
  { x: 1770, y: 6000, w: 50, h: 50, kind: 'column' },
  { x: 1400, y: 5840, w: 50, h: 50, kind: 'column' },
  { x: 80, y: 6000, w: 72, h: 120, kind: 'cabinet' },
  { x: 2648, y: 6000, w: 72, h: 120, kind: 'cabinet' },

  // corridors
  { x: 80, y: 5440, w: 72, h: 110, kind: 'cabinet' },
  { x: 2688, y: 5440, w: 72, h: 110, kind: 'shelf' },
  { x: 1180, y: 5480, w: 28, h: 40, kind: 'lamp' },

  // offices
  { x: 160, y: 5000, w: 160, h: 46, kind: 'desk' },
  { x: 200, y: 5050, w: 36, h: 32, kind: 'chair' },
  { x: 860, y: 5000, w: 160, h: 46, kind: 'desk' },
  { x: 2260, y: 5000, w: 160, h: 46, kind: 'desk' },
  { x: 80, y: 5120, w: 72, h: 100, kind: 'cabinet' },
  { x: 2648, y: 5120, w: 72, h: 100, kind: 'cabinet' },

  // toilet / utility / archive
  { x: 120, y: 4560, w: 52, h: 70, kind: 'toilet' },
  { x: 200, y: 4560, w: 52, h: 70, kind: 'toilet' },
  { x: 120, y: 4700, w: 72, h: 90, kind: 'shelf' },
  { x: 760, y: 4560, w: 72, h: 100, kind: 'cabinet' },
  { x: 1320, y: 4560, w: 160, h: 46, kind: 'desk' },
  { x: 2260, y: 4560, w: 80, h: 140, kind: 'shelf' },
  { x: 2480, y: 4560, w: 80, h: 140, kind: 'shelf' },

  // security
  { x: 920, y: 4160, w: 180, h: 46, kind: 'desk' },
  { x: 1400, y: 4240, w: 50, h: 50, kind: 'column' },
  { x: 2160, y: 4160, w: 80, h: 120, kind: 'cabinet' },

  // server
  { x: 160, y: 3760, w: 80, h: 140, kind: 'shelf' },
  { x: 2560, y: 3760, w: 80, h: 140, kind: 'shelf' },
  { x: 1400, y: 3800, w: 50, h: 50, kind: 'column' },

  // closed offices
  { x: 160, y: 2960, w: 160, h: 46, kind: 'desk' },
  { x: 880, y: 2960, w: 160, h: 46, kind: 'desk' },
  { x: 2260, y: 2960, w: 160, h: 46, kind: 'desk' },
  { x: 80, y: 3080, w: 72, h: 100, kind: 'cabinet' },

  // storage A / safe A
  { x: 120, y: 2480, w: 80, h: 140, kind: 'shelf' },
  { x: 240, y: 2480, w: 80, h: 140, kind: 'cabinet' },
  { x: 920, y: 2480, w: 80, h: 140, kind: 'shelf' },
  { x: 2260, y: 2480, w: 80, h: 140, kind: 'cabinet' },
  { x: 2480, y: 2480, w: 80, h: 140, kind: 'shelf' },
  { x: 1400, y: 2600, w: 50, h: 50, kind: 'column' },

  // deep / wing
  { x: 120, y: 2040, w: 72, h: 80, kind: 'cabinet' },
  { x: 2608, y: 2040, w: 72, h: 80, kind: 'shelf' },
  { x: 160, y: 1640, w: 160, h: 46, kind: 'desk' },
  { x: 2260, y: 1640, w: 160, h: 46, kind: 'desk' },
  { x: 1400, y: 1680, w: 50, h: 50, kind: 'column' },

  // storage B / safe B / final
  { x: 120, y: 1160, w: 80, h: 140, kind: 'cabinet' },
  { x: 240, y: 1160, w: 80, h: 140, kind: 'shelf' },
  { x: 2160, y: 1160, w: 80, h: 140, kind: 'cabinet' },
  { x: 120, y: 120, w: 80, h: 140, kind: 'cabinet' },
  { x: 980, y: 120, w: 80, h: 140, kind: 'shelf' },
  { x: 2060, y: 120, w: 80, h: 140, kind: 'cabinet' },
  { x: 2480, y: 120, w: 80, h: 140, kind: 'shelf' },
  { x: 1400, y: 360, w: 50, h: 50, kind: 'column' },
  { x: 400, y: 320, w: 160, h: 46, kind: 'desk' },
]

export const BANK_DECOR: BankDecor[] = [
  { x: 620, y: 6880, w: 280, h: 160, kind: 'rug' },
  { x: 1260, y: 5960, w: 280, h: 180, kind: 'rug' },
  { x: 1260, y: 5000, w: 240, h: 140, kind: 'rug' },
  { x: 1260, y: 4160, w: 240, h: 140, kind: 'rug' },
  { x: 1260, y: 2480, w: 240, h: 160, kind: 'rug' },
  { x: 1260, y: 1640, w: 240, h: 140, kind: 'rug' },
  { x: 1260, y: 200, w: 280, h: 180, kind: 'rug' },
  { x: 90, y: 6788, w: 70, h: 46, kind: 'painting' },
  { x: 2640, y: 6788, w: 70, h: 46, kind: 'painting' },
  { x: 1330, y: 3212, w: 160, h: 18, kind: 'rope' },
  { x: 1330, y: 2772, w: 160, h: 18, kind: 'rope' },
  { x: 1330, y: 1452, w: 160, h: 18, kind: 'rope' },
]

export const BANK_HIDES: BankRect[] = [
  { x: 360, y: 6926, w: 180, h: 48 },
  { x: 2280, y: 6926, w: 140, h: 48 },
  { x: 360, y: 6006, w: 180, h: 48 },
  { x: 2260, y: 6006, w: 180, h: 48 },
  { x: 968, y: 6050, w: 74, h: 44 },
  { x: 1758, y: 6050, w: 74, h: 44 },
  { x: 160, y: 5046, w: 160, h: 46 },
  { x: 2260, y: 5046, w: 160, h: 46 },
  { x: 120, y: 4700, w: 72, h: 90 },
  { x: 2260, y: 4560, w: 80, h: 140 },
  { x: 920, y: 4206, w: 180, h: 48 },
  { x: 160, y: 3760, w: 80, h: 140 },
  { x: 160, y: 3006, w: 160, h: 46 },
  { x: 120, y: 2480, w: 80, h: 140 },
  { x: 160, y: 1686, w: 160, h: 46 },
  { x: 120, y: 1160, w: 80, h: 140 },
  { x: 400, y: 366, w: 160, h: 46 },
  { x: 120, y: 120, w: 80, h: 140 },
]

export const BANK_LOOT: BankLoot[] = [
  // 1-2 start/lobby ~40
  { id: 'bl-01', x: 2380, y: 6960, kind: 'C5' },
  { id: 'bl-02', x: 2140, y: 6840, kind: 'C5' },
  { id: 'bl-03', x: 1800, y: 7000, kind: 'C5' },
  { id: 'bl-04', x: 1400, y: 6680, kind: 'C5' },
  { id: 'bl-05', x: 900, y: 6960, kind: 'C5' },
  { id: 'bl-06', x: 520, y: 7040, kind: 'C10' },
  { id: 'bl-07', x: 380, y: 7040, kind: 'C5' },
  // 3 hall ~40
  { id: 'bl-08', x: 240, y: 6120, kind: 'C10' },
  { id: 'bl-09', x: 700, y: 5920, kind: 'C10' },
  { id: 'bl-10', x: 1400, y: 6040, kind: 'C10' },
  { id: 'bl-11', x: 2260, y: 6120, kind: 'C10' },
  // 4-5 corridors ~20
  { id: 'bl-12', x: 360, y: 5520, kind: 'C10' },
  { id: 'bl-13', x: 2440, y: 5520, kind: 'C10' },
  // 6 offices ~50
  { id: 'bl-14', x: 320, y: 5080, kind: 'C50' },
  { id: 'bl-15', x: 1100, y: 4960, kind: 'C10' },
  // 7-9 side rooms ~40
  { id: 'bl-16', x: 280, y: 4640, kind: 'C10' },
  { id: 'bl-17', x: 1400, y: 4680, kind: 'C10' },
  { id: 'bl-18', x: 2400, y: 4720, kind: 'C10' },
  { id: 'bl-19', x: 2680, y: 4680, kind: 'C10' },
  // 10 security ~50
  { id: 'bl-20', x: 1400, y: 4160, kind: 'C50' },
  { id: 'bl-21', x: 400, y: 4240, kind: 'C10' },
  // 11 server ~50
  { id: 'bl-22', x: 1400, y: 3760, kind: 'C50' },
  // 12 central ~20
  { id: 'bl-23', x: 400, y: 3400, kind: 'C10' },
  { id: 'bl-24', x: 2400, y: 3400, kind: 'C10' },
  // 13 closed offices ~50
  { id: 'bl-25', x: 400, y: 3000, kind: 'C50' },
  // 14-15 storage A ~100
  { id: 'bl-26', x: 400, y: 2560, kind: 'C50' },
  { id: 'bl-27', x: 1100, y: 2480, kind: 'C50' },
  // 16 deep ~50
  { id: 'bl-28', x: 2400, y: 2080, kind: 'C50' },
  // 17 wing ~100
  { id: 'bl-29', x: 480, y: 1760, kind: 'C50' },
  { id: 'bl-30', x: 2480, y: 1680, kind: 'C50' },
  // 18 storage B ~150
  { id: 'bl-31', x: 400, y: 1200, kind: 'C50' },
  { id: 'bl-32', x: 1400, y: 1160, kind: 'C100' },
  // 19-20 deep / final ~150 floor
  { id: 'bl-33', x: 400, y: 720, kind: 'C50' },
  { id: 'bl-34', x: 1400, y: 520, kind: 'C100' },
]

export const BANK_SAFES: BankSafe[] = [
  {
    id: 'bankSafeA',
    x: 280,
    y: 2680,
    extraX: 480,
    extraY: 2520,
    extraKind: 'C50',
    extraId: 'bl-safe-a',
    reward: 100,
  },
  {
    id: 'bankSafeB',
    x: 2360,
    y: 1200,
    extraX: 2160,
    extraY: 1120,
    extraKind: 'C100',
    extraId: 'bl-safe-b',
    reward: 150,
  },
]

export const BANK_CAMS: { x: number; y: number; base: number; sweep: number; speed: number }[] = [
  { x: 1400, y: 6360, base: Math.PI / 2, sweep: 0.55, speed: 0.4 },
  { x: 2580, y: 6000, base: Math.PI, sweep: 0.75, speed: 0.46 },
  { x: 220, y: 5480, base: 0, sweep: 0.7, speed: 0.42 },
  { x: 1400, y: 4880, base: Math.PI / 2, sweep: 0.7, speed: 0.44 },
  { x: 1400, y: 4040, base: Math.PI / 2, sweep: 0.6, speed: 0.48 },
  { x: 1400, y: 3280, base: Math.PI / 2, sweep: 0.5, speed: 0.5 },
  { x: 2520, y: 2480, base: Math.PI, sweep: 0.7, speed: 0.44 },
  { x: 220, y: 2140, base: 0, sweep: 0.7, speed: 0.42 },
  { x: 1400, y: 1520, base: Math.PI / 2, sweep: 0.65, speed: 0.46 },
  { x: 1400, y: 600, base: Math.PI / 2, sweep: 0.7, speed: 0.42 },
]

export const BANK_GUARD_ROUTES: { x: number; y: number }[][] = [
  [
    { x: 620, y: 6100 },
    { x: 1400, y: 6120 },
    { x: 2180, y: 6100 },
    { x: 1400, y: 6220 },
  ],
  [
    { x: 400, y: 5080 },
    { x: 1400, y: 5080 },
    { x: 1400, y: 4200 },
    { x: 500, y: 4200 },
  ],
  [
    { x: 400, y: 3440 },
    { x: 1400, y: 3440 },
    { x: 2400, y: 3440 },
    { x: 1400, y: 3520 },
  ],
  [
    { x: 400, y: 2560 },
    { x: 1400, y: 2560 },
    { x: 2400, y: 2560 },
    { x: 1600, y: 2480 },
  ],
  [
    { x: 400, y: 1200 },
    { x: 1400, y: 1200 },
    { x: 1800, y: 1200 },
    { x: 1400, y: 800 },
  ],
]

export const BANK_ZONES: BankZone[] = [
  { i: 0, id: 'start', key: 'heistRoomStart', x: 40, y: 6760, w: 2720, h: 400 },
  { i: 1, id: 'lobby', key: 'heistRoomLobby', x: 40, y: 6320, w: 2720, h: 440 },
  { i: 2, id: 'hall', key: 'heistRoomHall', x: 40, y: 5280, w: 2720, h: 1040 },
  { i: 3, id: 'west', key: 'heistRoomWest', x: 40, y: 5280, w: 860, h: 440 },
  { i: 4, id: 'east', key: 'heistRoomEast', x: 1900, y: 5280, w: 860, h: 440 },
  { i: 5, id: 'offices', key: 'heistRoomOffices', x: 40, y: 4440, w: 2720, h: 840 },
  { i: 6, id: 'toilet', key: 'heistRoomToilet', x: 40, y: 4440, w: 580, h: 400 },
  { i: 7, id: 'utility', key: 'heistRoomUtility', x: 620, y: 4440, w: 560, h: 400 },
  { i: 8, id: 'archive', key: 'heistRoomArchive', x: 2100, y: 4440, w: 660, h: 400 },
  { i: 9, id: 'security', key: 'heistRoomSecurity', x: 40, y: 4000, w: 2720, h: 440 },
  { i: 10, id: 'server', key: 'heistRoomServer', x: 40, y: 3640, w: 2720, h: 360 },
  { i: 11, id: 'central', key: 'heistRoomHall', x: 40, y: 3240, w: 2720, h: 400 },
  { i: 12, id: 'closed', key: 'heistRoomClosed', x: 40, y: 2800, w: 2720, h: 440 },
  { i: 13, id: 'storageA', key: 'heistRoomStorageA', x: 780, y: 2360, w: 1980, h: 440 },
  { i: 14, id: 'safeA', key: 'heistRoomSafeA', x: 40, y: 2360, w: 740, h: 440 },
  { i: 15, id: 'deep', key: 'heistRoomDeep', x: 40, y: 1920, w: 2720, h: 440 },
  { i: 16, id: 'wing', key: 'heistRoomWing', x: 40, y: 1480, w: 2720, h: 440 },
  { i: 17, id: 'storageB', key: 'heistRoomStorageB', x: 40, y: 1040, w: 1920, h: 440 },
  { i: 18, id: 'safeB', key: 'heistRoomSafeB', x: 1960, y: 1040, w: 800, h: 440 },
  { i: 19, id: 'final', key: 'heistRoomFinal', x: 40, y: 40, w: 2720, h: 1000 },
]

export const BANK_LABELS: { x: number; y: number; key: MessageKey }[] = [
  { x: 2520, y: 6840, key: 'heistRoomStart' },
  { x: 220, y: 6840, key: 'heistRoomLobby' },
  { x: 1400, y: 6000, key: 'heistRoomHall' },
  { x: 400, y: 5480, key: 'heistRoomWest' },
  { x: 2400, y: 5480, key: 'heistRoomEast' },
  { x: 1400, y: 5040, key: 'heistRoomOffices' },
  { x: 280, y: 4520, key: 'heistRoomToilet' },
  { x: 880, y: 4520, key: 'heistRoomUtility' },
  { x: 2400, y: 4520, key: 'heistRoomArchive' },
  { x: 1400, y: 4160, key: 'heistRoomSecurity' },
  { x: 1400, y: 3760, key: 'heistRoomServer' },
  { x: 1400, y: 3400, key: 'heistRoomHall' },
  { x: 1400, y: 3000, key: 'heistRoomClosed' },
  { x: 1600, y: 2520, key: 'heistRoomStorageA' },
  { x: 280, y: 2520, key: 'heistRoomSafeA' },
  { x: 1400, y: 2080, key: 'heistRoomDeep' },
  { x: 1400, y: 1680, key: 'heistRoomWing' },
  { x: 800, y: 1200, key: 'heistRoomStorageB' },
  { x: 2360, y: 1200, key: 'heistRoomSafeB' },
  { x: 1400, y: 280, key: 'heistRoomFinal' },
]

export const BANK_LAMPS: [number, number][] = [
  [2520, 6960],
  [1400, 6560],
  [220, 6960],
  [1400, 6000],
  [220, 5480],
  [2580, 5480],
  [1400, 5040],
  [1400, 4200],
  [1400, 3760],
  [1400, 3400],
  [1400, 2560],
  [220, 2080],
  [2580, 2080],
  [1400, 1680],
  [1400, 800],
  [1400, 180],
  [2360, 1200],
]

export const BANK_FLOORS: { x: number; y: number; w: number; h: number; color: number; alpha: number }[] = [
  { x: 40, y: 6320, w: 2720, h: 840, color: 0x1a2438, alpha: 0.38 },
  { x: 40, y: 5280, w: 2720, h: 1040, color: 0x141820, alpha: 0.28 },
  { x: 40, y: 4000, w: 2720, h: 1280, color: 0x182028, alpha: 0.3 },
  { x: 40, y: 2800, w: 2720, h: 1200, color: 0x1a1814, alpha: 0.34 },
  { x: 40, y: 1480, w: 2720, h: 1320, color: 0x1a1614, alpha: 0.4 },
  { x: 40, y: 40, w: 2720, h: 1440, color: 0x1c1410, alpha: 0.46 },
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
