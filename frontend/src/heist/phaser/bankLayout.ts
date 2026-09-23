import type { MessageKey } from '../../i18n/messages'
import type { DuckCoinKind } from '../coinAssets'

/**
 * LEVEL 1 BANK — 20 real rooms, south entrance to north vault.
 * Spawn and the only EXIT share the lobby. Deeper loot means a long walk back.
 */
export const BANK_W = 2800
export const BANK_H = 7200
export const BANK_SPAWN = { x: 2520, y: 6960 }
export const BANK_EXIT = { x: 220, y: 6960 }
export const BANK_ZONE_COUNT = 20

export type BankRect = { x: number; y: number; w: number; h: number }
export type BankDoor = BankRect & { id: string }
export type BankFurn = BankRect & {
  kind: 'desk' | 'cabinet' | 'column' | 'atm' | 'chair' | 'counter' | 'shelf' | 'plant' | 'bench' | 'lamp' | 'toilet'
}
export type BankDecor = BankRect & { kind: 'rug' | 'runner' | 'painting' | 'rope'; tone?: 'lobby' | 'office' | 'cold' | 'vault' | 'gold' }
export type BankFoliage = BankRect
export type BankLamp = { x: number; y: number; color: number; alpha: number }
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
  ...divider(6760, [GAP_DOOR]),
  ...divider(6320, OPEN3),
  ...divider(5720, [GAP_DOOR]),
  ...divider(5280, [GAP_DOOR]),
  ...divider(4840, [GAP_DOOR]),
  ...divider(4440, [GAP_DOOR]),
  ...divider(4000, [GAP_DOOR]),
  ...divider(3640, [GAP_DOOR]),
  ...divider(3240, [GAP_DOOR]),
  ...divider(2800, [GAP_DOOR]),
  ...divider(2360, [GAP_DOOR]),
  ...divider(1920, [GAP_DOOR]),
  ...divider(1480, [GAP_DOOR]),
  ...divider(1040, [GAP_DOOR]),
  ...divider(560, [GAP_DOOR]),

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

function doorAt(id: string, y: number): BankDoor {
  return { id, x: GAP_DOOR[0], y, w: GAP_DOOR[1] - GAP_DOOR[0], h: WH }
}

function vGapY(y0: number, y1: number, gap = 180) {
  const top = y0 + WH
  const inner = y1 - top
  return top + Math.floor((inner - gap) / 2)
}

function vDoor(id: string, x: number, y0: number, y1: number): BankDoor {
  return { id, x, y: vGapY(y0, y1), w: WH, h: 180 }
}

export const BANK_DOORS: BankDoor[] = [
  doorAt('bankLobby', 6760),
  doorAt('bankApproach', 5720),
  vDoor('bankWest', 900, 5280, 5720),
  vDoor('bankEast', 1900, 5280, 5720),
  doorAt('bankOffices', 5280),
  doorAt('bankAnnex', 4840),
  doorAt('bankWatch', 4440),
  doorAt('bankSecurity', 4000),
  doorAt('bankServer', 3640),
  doorAt('bankClosed', 3240),
  doorAt('bankStorageA', 2800),
  doorAt('bankDeep', 2360),
  doorAt('bankWing', 1920),
  doorAt('bankStorageB', 1480),
  doorAt('bankFinal', 1040),
  doorAt('bankVault', 560),
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
  { x: 1104, y: 5880, w: 28, h: 22, kind: 'plant' },
  { x: 1620, y: 5880, w: 28, h: 22, kind: 'plant' },
  { x: 1104, y: 6180, w: 28, h: 22, kind: 'plant' },
  { x: 1620, y: 6180, w: 28, h: 22, kind: 'plant' },
  { x: 700, y: 5840, w: 160, h: 40, kind: 'bench' },

  // corridors
  { x: 80, y: 5440, w: 72, h: 110, kind: 'cabinet' },
  { x: 2688, y: 5440, w: 72, h: 110, kind: 'shelf' },
  { x: 1180, y: 5480, w: 28, h: 40, kind: 'lamp' },
  { x: 1104, y: 5488, w: 28, h: 22, kind: 'plant' },
  { x: 1620, y: 5488, w: 28, h: 22, kind: 'plant' },
  { x: 400, y: 5360, w: 28, h: 40, kind: 'lamp' },
  { x: 2360, y: 5360, w: 28, h: 40, kind: 'lamp' },

  // offices
  { x: 160, y: 5000, w: 160, h: 46, kind: 'desk' },
  { x: 200, y: 5050, w: 36, h: 32, kind: 'chair' },
  { x: 860, y: 5000, w: 160, h: 46, kind: 'desk' },
  { x: 2260, y: 5000, w: 160, h: 46, kind: 'desk' },
  { x: 80, y: 5120, w: 72, h: 100, kind: 'cabinet' },
  { x: 2648, y: 5120, w: 72, h: 100, kind: 'cabinet' },
  { x: 1104, y: 4980, w: 28, h: 22, kind: 'plant' },
  { x: 1620, y: 4980, w: 28, h: 22, kind: 'plant' },
  { x: 1480, y: 5000, w: 160, h: 46, kind: 'desk' },
  { x: 1520, y: 5050, w: 36, h: 32, kind: 'chair' },
  { x: 400, y: 4920, w: 28, h: 40, kind: 'lamp' },

  // toilet / utility / archive
  { x: 120, y: 4560, w: 52, h: 70, kind: 'toilet' },
  { x: 200, y: 4560, w: 52, h: 70, kind: 'toilet' },
  { x: 120, y: 4700, w: 72, h: 90, kind: 'shelf' },
  { x: 760, y: 4560, w: 72, h: 100, kind: 'cabinet' },
  { x: 1320, y: 4560, w: 160, h: 46, kind: 'desk' },
  { x: 2260, y: 4560, w: 80, h: 140, kind: 'shelf' },
  { x: 2480, y: 4560, w: 80, h: 140, kind: 'shelf' },
  { x: 1104, y: 4580, w: 28, h: 22, kind: 'plant' },
  { x: 1620, y: 4580, w: 28, h: 22, kind: 'plant' },
  { x: 1560, y: 4680, w: 160, h: 46, kind: 'desk' },

  // security
  { x: 920, y: 4160, w: 180, h: 46, kind: 'desk' },
  { x: 1400, y: 4240, w: 50, h: 50, kind: 'column' },
  { x: 2160, y: 4160, w: 80, h: 120, kind: 'cabinet' },
  { x: 160, y: 4160, w: 72, h: 100, kind: 'cabinet' },
  { x: 1104, y: 4080, w: 28, h: 22, kind: 'plant' },
  { x: 1620, y: 4080, w: 28, h: 22, kind: 'plant' },
  { x: 400, y: 4080, w: 28, h: 40, kind: 'lamp' },

  // server
  { x: 160, y: 3760, w: 80, h: 140, kind: 'shelf' },
  { x: 2560, y: 3760, w: 80, h: 140, kind: 'shelf' },
  { x: 1400, y: 3800, w: 50, h: 50, kind: 'column' },
  { x: 400, y: 3680, w: 80, h: 120, kind: 'shelf' },
  { x: 2320, y: 3680, w: 80, h: 120, kind: 'cabinet' },
  { x: 1104, y: 3720, w: 28, h: 22, kind: 'plant' },
  { x: 1620, y: 3720, w: 28, h: 22, kind: 'plant' },

  // central + closed offices
  { x: 160, y: 3360, w: 160, h: 46, kind: 'desk' },
  { x: 2260, y: 3360, w: 160, h: 46, kind: 'desk' },
  { x: 1104, y: 3380, w: 28, h: 22, kind: 'plant' },
  { x: 1620, y: 3380, w: 28, h: 22, kind: 'plant' },
  { x: 980, y: 3480, w: 50, h: 50, kind: 'column' },
  { x: 1770, y: 3480, w: 50, h: 50, kind: 'column' },
  { x: 160, y: 2960, w: 160, h: 46, kind: 'desk' },
  { x: 880, y: 2960, w: 160, h: 46, kind: 'desk' },
  { x: 2260, y: 2960, w: 160, h: 46, kind: 'desk' },
  { x: 80, y: 3080, w: 72, h: 100, kind: 'cabinet' },
  { x: 2648, y: 3080, w: 72, h: 100, kind: 'cabinet' },
  { x: 1104, y: 2980, w: 28, h: 22, kind: 'plant' },
  { x: 1620, y: 2980, w: 28, h: 22, kind: 'plant' },
  { x: 1480, y: 2960, w: 160, h: 46, kind: 'desk' },

  // storage A / safe A
  { x: 120, y: 2480, w: 80, h: 140, kind: 'shelf' },
  { x: 240, y: 2480, w: 80, h: 140, kind: 'cabinet' },
  { x: 920, y: 2480, w: 80, h: 140, kind: 'shelf' },
  { x: 2260, y: 2480, w: 80, h: 140, kind: 'cabinet' },
  { x: 2480, y: 2480, w: 80, h: 140, kind: 'shelf' },
  { x: 1400, y: 2600, w: 50, h: 50, kind: 'column' },
  { x: 1104, y: 2520, w: 28, h: 22, kind: 'plant' },
  { x: 1620, y: 2520, w: 28, h: 22, kind: 'plant' },
  { x: 1680, y: 2480, w: 80, h: 140, kind: 'shelf' },

  // deep / wing
  { x: 120, y: 2040, w: 72, h: 80, kind: 'cabinet' },
  { x: 2608, y: 2040, w: 72, h: 80, kind: 'shelf' },
  { x: 400, y: 1980, w: 72, h: 90, kind: 'cabinet' },
  { x: 2320, y: 1980, w: 72, h: 90, kind: 'shelf' },
  { x: 1104, y: 2080, w: 28, h: 22, kind: 'plant' },
  { x: 1620, y: 2080, w: 28, h: 22, kind: 'plant' },
  { x: 980, y: 2140, w: 50, h: 50, kind: 'column' },
  { x: 1770, y: 2000, w: 50, h: 50, kind: 'column' },
  { x: 160, y: 1640, w: 160, h: 46, kind: 'desk' },
  { x: 2260, y: 1640, w: 160, h: 46, kind: 'desk' },
  { x: 1400, y: 1680, w: 50, h: 50, kind: 'column' },
  { x: 1104, y: 1640, w: 28, h: 22, kind: 'plant' },
  { x: 1620, y: 1640, w: 28, h: 22, kind: 'plant' },
  { x: 880, y: 1640, w: 160, h: 46, kind: 'desk' },
  { x: 400, y: 1560, w: 28, h: 40, kind: 'lamp' },

  // storage B / safe B / final
  { x: 120, y: 1160, w: 80, h: 140, kind: 'cabinet' },
  { x: 240, y: 1160, w: 80, h: 140, kind: 'shelf' },
  { x: 920, y: 1160, w: 80, h: 140, kind: 'shelf' },
  { x: 2160, y: 1160, w: 80, h: 140, kind: 'cabinet' },
  { x: 1104, y: 1180, w: 28, h: 22, kind: 'plant' },
  { x: 1620, y: 1180, w: 28, h: 22, kind: 'plant' },
  { x: 120, y: 120, w: 80, h: 140, kind: 'cabinet' },
  { x: 980, y: 120, w: 80, h: 140, kind: 'shelf' },
  { x: 2060, y: 120, w: 80, h: 140, kind: 'cabinet' },
  { x: 2480, y: 120, w: 80, h: 140, kind: 'shelf' },
  { x: 1400, y: 360, w: 50, h: 50, kind: 'column' },
  { x: 400, y: 320, w: 160, h: 46, kind: 'desk' },
  { x: 1104, y: 480, w: 28, h: 22, kind: 'plant' },
  { x: 1620, y: 480, w: 28, h: 22, kind: 'plant' },
  { x: 2260, y: 320, w: 160, h: 46, kind: 'desk' },
  { x: 980, y: 720, w: 50, h: 50, kind: 'column' },
  { x: 1770, y: 720, w: 50, h: 50, kind: 'column' },
  { x: 1104, y: 720, w: 28, h: 22, kind: 'plant' },
  { x: 1620, y: 720, w: 28, h: 22, kind: 'plant' },
  { x: 2480, y: 2880, w: 72, h: 100, kind: 'shelf' },
  { x: 400, y: 2200, w: 72, h: 80, kind: 'cabinet' },
  { x: 80, y: 3480, w: 72, h: 90, kind: 'cabinet' },
  { x: 2480, y: 3360, w: 72, h: 90, kind: 'shelf' },
  { x: 280, y: 3200, w: 28, h: 40, kind: 'lamp' },
  { x: 880, y: 2080, w: 160, h: 46, kind: 'desk' },
  { x: 2480, y: 1760, w: 72, h: 90, kind: 'cabinet' },
  { x: 1680, y: 1160, w: 80, h: 140, kind: 'shelf' },
  { x: 1680, y: 320, w: 72, h: 90, kind: 'cabinet' },
]

export const BANK_DECOR: BankDecor[] = [
  { x: 200, y: 6880, w: 320, h: 180, kind: 'rug', tone: 'lobby' },
  { x: 1180, y: 6480, w: 440, h: 220, kind: 'rug', tone: 'lobby' },
  { x: 180, y: 5360, w: 220, h: 140, kind: 'rug', tone: 'office' },
  { x: 2400, y: 5360, w: 220, h: 140, kind: 'rug', tone: 'office' },
  { x: 160, y: 4980, w: 240, h: 140, kind: 'rug', tone: 'office' },
  { x: 80, y: 4480, w: 200, h: 120, kind: 'rug', tone: 'cold' },
  { x: 180, y: 3340, w: 240, h: 140, kind: 'rug', tone: 'office' },
  { x: 2240, y: 2940, w: 240, h: 140, kind: 'rug', tone: 'office' },
  { x: 80, y: 2480, w: 240, h: 160, kind: 'rug', tone: 'vault' },
  { x: 2140, y: 1100, w: 280, h: 180, kind: 'rug', tone: 'gold' },
  { x: 1180, y: 180, w: 440, h: 220, kind: 'rug', tone: 'gold' },
  { x: 180, y: 180, w: 260, h: 160, kind: 'rug', tone: 'gold' },
  { x: 90, y: 6788, w: 70, h: 46, kind: 'painting' },
  { x: 2640, y: 6788, w: 70, h: 46, kind: 'painting' },
  { x: 90, y: 5080, w: 70, h: 46, kind: 'painting' },
  { x: 2640, y: 3000, w: 70, h: 46, kind: 'painting' },
  { x: 1330, y: 4812, w: 160, h: 18, kind: 'rope' },
  { x: 1330, y: 5252, w: 160, h: 18, kind: 'rope' },
  { x: 1330, y: 4412, w: 160, h: 18, kind: 'rope' },
  { x: 1330, y: 3972, w: 160, h: 18, kind: 'rope' },
  { x: 1330, y: 3612, w: 160, h: 18, kind: 'rope' },
  { x: 1330, y: 3212, w: 160, h: 18, kind: 'rope' },
  { x: 1330, y: 2772, w: 160, h: 18, kind: 'rope' },
  { x: 1330, y: 2332, w: 160, h: 18, kind: 'rope' },
  { x: 1330, y: 1892, w: 160, h: 18, kind: 'rope' },
  { x: 1330, y: 1452, w: 160, h: 18, kind: 'rope' },
  { x: 1330, y: 1012, w: 160, h: 18, kind: 'rope' },
  { x: 1330, y: 532, w: 160, h: 18, kind: 'rope' },
]

export const BANK_FOLIAGE: BankFoliage[] = [
  { x: 1088, y: 5848, w: 56, h: 52 },
  { x: 1604, y: 5848, w: 56, h: 52 },
  { x: 1088, y: 6148, w: 56, h: 52 },
  { x: 1604, y: 6148, w: 56, h: 52 },
  { x: 1088, y: 5456, w: 56, h: 52 },
  { x: 1604, y: 5456, w: 56, h: 52 },
  { x: 1088, y: 4948, w: 56, h: 52 },
  { x: 1604, y: 4948, w: 56, h: 52 },
  { x: 1088, y: 4548, w: 56, h: 52 },
  { x: 1604, y: 4548, w: 56, h: 52 },
  { x: 1088, y: 4048, w: 56, h: 52 },
  { x: 1604, y: 4048, w: 56, h: 52 },
  { x: 1088, y: 3688, w: 56, h: 52 },
  { x: 1604, y: 3688, w: 56, h: 52 },
  { x: 1088, y: 3348, w: 56, h: 52 },
  { x: 1604, y: 3348, w: 56, h: 52 },
  { x: 1088, y: 2948, w: 56, h: 52 },
  { x: 1604, y: 2948, w: 56, h: 52 },
  { x: 1088, y: 2488, w: 56, h: 52 },
  { x: 1604, y: 2488, w: 56, h: 52 },
  { x: 1088, y: 2048, w: 56, h: 52 },
  { x: 1604, y: 2048, w: 56, h: 52 },
  { x: 1088, y: 1608, w: 56, h: 52 },
  { x: 1604, y: 1608, w: 56, h: 52 },
  { x: 1088, y: 1148, w: 56, h: 52 },
  { x: 1604, y: 1148, w: 56, h: 52 },
  { x: 1088, y: 688, w: 56, h: 52 },
  { x: 1604, y: 688, w: 56, h: 52 },
  { x: 80, y: 3920, w: 72, h: 68 },
  { x: 2648, y: 3920, w: 72, h: 68 },
  { x: 80, y: 2860, w: 72, h: 68 },
  { x: 2648, y: 2860, w: 72, h: 68 },
  { x: 80, y: 2200, w: 72, h: 68 },
  { x: 2648, y: 2200, w: 72, h: 68 },
  { x: 80, y: 800, w: 72, h: 68 },
  { x: 2648, y: 800, w: 72, h: 68 },
  { x: 80, y: 6080, w: 36, h: 78 },
  { x: 2684, y: 1640, w: 36, h: 78 },
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
  { x: 160, y: 3366, w: 160, h: 46 },
  { x: 160, y: 3006, w: 160, h: 46 },
  { x: 120, y: 2480, w: 80, h: 140 },
  { x: 160, y: 1686, w: 160, h: 46 },
  { x: 120, y: 1160, w: 80, h: 140 },
  { x: 400, y: 366, w: 160, h: 46 },
  { x: 120, y: 120, w: 80, h: 140 },
  { x: 968, y: 3468, w: 74, h: 44 },
  { x: 1758, y: 3468, w: 74, h: 44 },
  { x: 968, y: 2128, w: 74, h: 44 },
  { x: 1758, y: 1988, w: 74, h: 44 },
  { x: 968, y: 708, w: 74, h: 44 },
  { x: 1758, y: 708, w: 74, h: 44 },
  { x: 2480, y: 3360, w: 72, h: 90 },
  { x: 880, y: 2080, w: 160, h: 46 },
  { x: 2480, y: 1760, w: 72, h: 90 },
  { x: 1680, y: 1160, w: 80, h: 140 },
  ...BANK_FOLIAGE.map((leaf) => ({ x: leaf.x, y: leaf.y + 8, w: leaf.w, h: leaf.h - 6 })),
]

export const BANK_LOOT: BankLoot[] = []

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
  { x: 1400, y: 3680, base: Math.PI / 2, sweep: 0.55, speed: 0.48 },
  { x: 1400, y: 3280, base: Math.PI / 2, sweep: 0.5, speed: 0.5 },
  { x: 1400, y: 3000, base: Math.PI / 2, sweep: 0.55, speed: 0.46 },
  { x: 2520, y: 2480, base: Math.PI, sweep: 0.7, speed: 0.44 },
  { x: 220, y: 2140, base: 0, sweep: 0.7, speed: 0.42 },
  { x: 1400, y: 1960, base: Math.PI / 2, sweep: 0.6, speed: 0.44 },
  { x: 1400, y: 1520, base: Math.PI / 2, sweep: 0.65, speed: 0.46 },
  { x: 1400, y: 1080, base: Math.PI / 2, sweep: 0.55, speed: 0.46 },
  { x: 1400, y: 800, base: Math.PI / 2, sweep: 0.6, speed: 0.44 },
  { x: 1400, y: 600, base: Math.PI / 2, sweep: 0.7, speed: 0.42 },
  { x: 1400, y: 4480, base: Math.PI / 2, sweep: 0.55, speed: 0.44 },
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
    { x: 2260, y: 5080 },
    { x: 1400, y: 4960 },
  ],
  [
    { x: 500, y: 4200 },
    { x: 1400, y: 4120 },
    { x: 2400, y: 4320 },
    { x: 700, y: 4320 },
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
    { x: 1500, y: 2520 },
  ],
  [
    { x: 600, y: 2240 },
    { x: 1400, y: 2240 },
    { x: 2480, y: 2240 },
    { x: 1400, y: 2280 },
  ],
  [
    { x: 400, y: 1200 },
    { x: 1400, y: 1200 },
    { x: 1800, y: 1200 },
    { x: 1400, y: 1120 },
  ],
  [
    { x: 400, y: 280 },
    { x: 1400, y: 280 },
    { x: 2260, y: 280 },
    { x: 1400, y: 160 },
  ],
  [
    { x: 400, y: 4680 },
    { x: 1400, y: 4680 },
    { x: 2400, y: 4760 },
    { x: 900, y: 4680 },
  ],
  [
    { x: 500, y: 3840 },
    { x: 1400, y: 3920 },
    { x: 2200, y: 3840 },
    { x: 1400, y: 3720 },
  ],
  [
    { x: 400, y: 3120 },
    { x: 1400, y: 3120 },
    { x: 2400, y: 3120 },
    { x: 1400, y: 3040 },
  ],
  [
    { x: 400, y: 1760 },
    { x: 1400, y: 1760 },
    { x: 2400, y: 1760 },
    { x: 1400, y: 1840 },
  ],
  [
    { x: 400, y: 800 },
    { x: 1400, y: 800 },
    { x: 2400, y: 800 },
    { x: 1400, y: 880 },
  ],
]

export const BANK_ZONES: BankZone[] = [
  { i: 0, id: 'start', key: 'heistRoomStart', x: 40, y: 6760, w: 2720, h: 440 },
  { i: 1, id: 'lobby', key: 'heistRoomLobby', x: 40, y: 6320, w: 2720, h: 440 },
  { i: 2, id: 'hall', key: 'heistRoomHall', x: 40, y: 5280, w: 2720, h: 1040 },
  { i: 3, id: 'west', key: 'heistRoomWest', x: 40, y: 5280, w: 860, h: 440 },
  { i: 4, id: 'east', key: 'heistRoomEast', x: 1900, y: 5280, w: 860, h: 440 },
  { i: 5, id: 'offices', key: 'heistRoomOffices', x: 40, y: 4840, w: 2720, h: 440 },
  { i: 6, id: 'toilet', key: 'heistRoomToilet', x: 40, y: 4440, w: 580, h: 400 },
  { i: 7, id: 'utility', key: 'heistRoomUtility', x: 620, y: 4440, w: 1480, h: 400 },
  { i: 8, id: 'archive', key: 'heistRoomArchive', x: 2100, y: 4440, w: 660, h: 400 },
  { i: 9, id: 'security', key: 'heistRoomSecurity', x: 40, y: 4000, w: 2720, h: 440 },
  { i: 10, id: 'server', key: 'heistRoomServer', x: 40, y: 3640, w: 2720, h: 360 },
  { i: 11, id: 'central', key: 'heistRoomCentral', x: 40, y: 3240, w: 2720, h: 400 },
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
  { x: 1400, y: 3400, key: 'heistRoomCentral' },
  { x: 1400, y: 3000, key: 'heistRoomClosed' },
  { x: 1600, y: 2520, key: 'heistRoomStorageA' },
  { x: 280, y: 2520, key: 'heistRoomSafeA' },
  { x: 1400, y: 2080, key: 'heistRoomDeep' },
  { x: 1400, y: 1680, key: 'heistRoomWing' },
  { x: 800, y: 1200, key: 'heistRoomStorageB' },
  { x: 2360, y: 1200, key: 'heistRoomSafeB' },
  { x: 1400, y: 280, key: 'heistRoomFinal' },
]

export const BANK_LAMPS: BankLamp[] = [
  { x: 2520, y: 6960, color: 0xc9a227, alpha: 0.1 },
  { x: 1400, y: 6560, color: 0xc9a227, alpha: 0.1 },
  { x: 220, y: 6960, color: 0xc9a227, alpha: 0.12 },
  { x: 1400, y: 6000, color: 0xd4b56a, alpha: 0.1 },
  { x: 220, y: 5480, color: 0xd4b56a, alpha: 0.08 },
  { x: 2580, y: 5480, color: 0xd4b56a, alpha: 0.08 },
  { x: 1400, y: 5040, color: 0xe0c48a, alpha: 0.1 },
  { x: 280, y: 4560, color: 0x8aa0b4, alpha: 0.07 },
  { x: 880, y: 4560, color: 0x8aa0b4, alpha: 0.06 },
  { x: 1400, y: 4200, color: 0x6ec8ff, alpha: 0.07 },
  { x: 1400, y: 3760, color: 0x6ec8ff, alpha: 0.08 },
  { x: 1400, y: 3400, color: 0xe0c48a, alpha: 0.08 },
  { x: 1400, y: 3000, color: 0xc9a227, alpha: 0.07 },
  { x: 1400, y: 2560, color: 0xe0a24a, alpha: 0.08 },
  { x: 220, y: 2560, color: 0xffe08a, alpha: 0.12 },
  { x: 220, y: 2080, color: 0x8aa0b4, alpha: 0.06 },
  { x: 2580, y: 2080, color: 0x8aa0b4, alpha: 0.06 },
  { x: 1400, y: 1680, color: 0xe0c48a, alpha: 0.09 },
  { x: 2360, y: 1200, color: 0xffe08a, alpha: 0.12 },
  { x: 800, y: 1200, color: 0x8aa0b4, alpha: 0.06 },
  { x: 1400, y: 800, color: 0xe0a24a, alpha: 0.1 },
  { x: 1400, y: 280, color: 0xffe08a, alpha: 0.16 },
]

export const BANK_FLOORS: { x: number; y: number; w: number; h: number; color: number; alpha: number }[] = [
  { x: 40, y: 6320, w: 2720, h: 840, color: 0x1a2438, alpha: 0.38 },
  { x: 40, y: 5280, w: 2720, h: 1040, color: 0x1a2018, alpha: 0.26 },
  { x: 40, y: 4440, w: 2720, h: 840, color: 0x241c14, alpha: 0.28 },
  { x: 40, y: 4000, w: 2720, h: 440, color: 0x101820, alpha: 0.36 },
  { x: 40, y: 3640, w: 2720, h: 360, color: 0x0c1820, alpha: 0.4 },
  { x: 40, y: 2800, w: 2720, h: 840, color: 0x1a1814, alpha: 0.34 },
  { x: 40, y: 1920, w: 2720, h: 880, color: 0x161210, alpha: 0.4 },
  { x: 40, y: 1040, w: 2720, h: 880, color: 0x1a1410, alpha: 0.44 },
  { x: 40, y: 40, w: 2720, h: 1000, color: 0x20140c, alpha: 0.5 },
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
  let best = BANK_ZONES[0]
  let bestD = Number.POSITIVE_INFINITY
  for (const z of BANK_ZONES) {
    const cx = Math.max(z.x, Math.min(z.x + z.w, x))
    const cy = Math.max(z.y, Math.min(z.y + z.h, y))
    const d = (cx - x) * (cx - x) + (cy - y) * (cy - y)
    if (d < bestD) {
      bestD = d
      best = z
    }
  }
  return best
}

export function bankFinalLootIds() {
  return BANK_LOOT.filter((slot) => bankZoneAt(slot.x, slot.y).i >= BANK_ZONE_COUNT - 1).map((slot) => slot.id)
}

/**
 * Loot curve by zone (index = zone number − 1). Early rooms pay a little but
 * never nothing; value climbs with depth and peaks in the final vault.
 */
const LOOT_MIX: { c5: number; c10: number; c50: number; c100: number }[] = [
  { c5: 8, c10: 2, c50: 0, c100: 0 }, // 1 start      60
  { c5: 8, c10: 3, c50: 0, c100: 0 }, // 2 lobby      70
  { c5: 10, c10: 5, c50: 1, c100: 0 }, // 3 hall      150
  { c5: 5, c10: 3, c50: 1, c100: 0 }, // 4 west      105
  { c5: 5, c10: 4, c50: 1, c100: 0 }, // 5 east      115
  { c5: 8, c10: 5, c50: 1, c100: 0 }, // 6 offices   140
  { c5: 5, c10: 4, c50: 1, c100: 0 }, // 7 toilet    115
  { c5: 6, c10: 5, c50: 2, c100: 0 }, // 8 utility   180
  { c5: 5, c10: 5, c50: 2, c100: 1 }, // 9 archive   275
  { c5: 8, c10: 6, c50: 3, c100: 1 }, // 10 security 350
  { c5: 8, c10: 6, c50: 3, c100: 1 }, // 11 server   350
  { c5: 8, c10: 6, c50: 3, c100: 1 }, // 12 central  350
  { c5: 8, c10: 6, c50: 4, c100: 1 }, // 13 closed   400
  { c5: 6, c10: 5, c50: 3, c100: 1 }, // 14 storageA 330
  { c5: 6, c10: 5, c50: 4, c100: 2 }, // 15 safeA    480
  { c5: 8, c10: 6, c50: 4, c100: 2 }, // 16 deep     500
  { c5: 8, c10: 7, c50: 4, c100: 2 }, // 17 wing     510
  { c5: 6, c10: 5, c50: 4, c100: 2 }, // 18 storageB 480
  { c5: 6, c10: 5, c50: 4, c100: 3 }, // 19 safeB    580
  { c5: 10, c10: 8, c50: 5, c100: 3 }, // 20 final   680
]

/**
 * Loot layout version. Bumping it gives every coin a new id, so saves drained
 * by the V1 bug (coins marked taken on pickup even when caught) start with a
 * full building once. Coins taken from this layout stay taken as before.
 */
const LOOT_LAYOUT = 'bl2'
/** About one phone screen of world width: every column gets its share of coins. */
const LOOT_COLUMN_W = 700
const LOOT_MIN_GAP = 96

function lootBlocked() {
  return [
    { x: 0, y: 0, w: BANK_W, h: 40 },
    { x: 0, y: BANK_H - 40, w: BANK_W, h: 40 },
    { x: 0, y: 0, w: 40, h: BANK_H },
    { x: BANK_W - 40, y: 0, w: 40, h: BANK_H },
    ...BANK_WALLS,
    ...BANK_FURNITURE,
    ...BANK_DOORS,
  ]
}

function lootWalkable(rects: BankRect[], x: number, y: number, pad = 26) {
  for (const r of rects) {
    if (x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad) return false
  }
  return true
}

function hash(x: number, y: number, seed: number) {
  let h = (Math.floor(x) * 73856093) ^ (Math.floor(y) * 19349663) ^ (seed * 83492791)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff
}

/**
 * Spread each room's coins over screen-wide columns so wherever the duck
 * stands a few targets are in view; within a column keep coins apart.
 */
function fillBankLoot() {
  const blocked = lootBlocked()
  const out: BankLoot[] = []
  for (const zone of BANK_ZONES) {
    const mix = LOOT_MIX[zone.i] ?? { c5: 4, c10: 2, c50: 1, c100: 0 }
    const kinds: DuckCoinKind[] = [
      ...Array.from({ length: mix.c5 }, () => 'C5' as const),
      ...Array.from({ length: mix.c10 }, () => 'C10' as const),
      ...Array.from({ length: mix.c50 }, () => 'C50' as const),
      ...Array.from({ length: mix.c100 }, () => 'C100' as const),
    ]
    const seed = (zone.i + 1) * 31
    // Interleave values so no column is all pennies or all jackpots.
    const order = kinds.map((kind, i) => ({ kind, r: hash(i, 7, seed) })).sort((p, q) => p.r - q.r)
    for (let i = 0; i < kinds.length; i += 1) kinds[i] = order[i].kind

    const cols = Math.max(1, Math.round(zone.w / LOOT_COLUMN_W))
    const colW = zone.w / cols
    const buckets: { x: number; y: number; r: number }[][] = Array.from({ length: cols }, () => [])
    const area = zone.w * zone.h
    const step = area > 900000 ? 64 : area > 400000 ? 48 : 32
    for (let x = zone.x + 56; x < zone.x + zone.w - 56; x += step) {
      for (let y = zone.y + 48; y < zone.y + zone.h - 48; y += step) {
        if (!lootWalkable(blocked, x, y, 34)) continue
        if (bankZoneAt(x, y).i !== zone.i) continue
        const c = Math.min(cols - 1, Math.floor((x - zone.x) / colW))
        buckets[c].push({ x, y, r: hash(x, y, seed) })
      }
    }
    // The start room greets the player: its coins line up nearest the spawn first.
    const home = bankZoneAt(BANK_SPAWN.x, BANK_SPAWN.y).i === zone.i
    if (home) {
      for (const b of buckets) for (const q of b) q.r = Math.hypot(q.x - BANK_SPAWN.x, (q.y - BANK_SPAWN.y) * 1.6) + q.r * 120
    }
    for (const b of buckets) b.sort((a, c) => a.r - c.r)
    const firstCol = home ? Math.min(cols - 1, Math.floor((BANK_SPAWN.x - zone.x) / colW)) : 0

    const placed: { x: number; y: number }[] = []
    const pick = (c: number, gap: number) => {
      for (const cand of buckets[c]) {
        if (placed.some((p) => Math.hypot(p.x - cand.x, p.y - cand.y) < gap)) continue
        return cand
      }
      return null
    }
    let n = 0
    for (let k = 0; k < kinds.length; k += 1) {
      // Round-robin over columns; small rooms fall back to a tighter gap so no coin is dropped.
      let spot: { x: number; y: number } | null = null
      // The first few start-room coins sit around the spawn: the player sees loot at once.
      const base = home && k < 4 ? firstCol - k : firstCol
      for (const gap of [LOOT_MIN_GAP, LOOT_MIN_GAP * 0.6, LOOT_MIN_GAP * 0.4]) {
        for (let tries = 0; tries < cols && !spot; tries += 1) spot = pick((((base + k + tries) % cols) + cols) % cols, gap)
        if (spot) break
      }
      if (!spot) continue
      placed.push(spot)
      out.push({ id: `${LOOT_LAYOUT}-z${zone.i}-${n}`, x: spot.x, y: spot.y, kind: kinds[k] })
      n += 1
    }
  }
  BANK_LOOT.push(...out)
}

fillBankLoot()
