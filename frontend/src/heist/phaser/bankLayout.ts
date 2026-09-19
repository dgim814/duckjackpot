import type { MessageKey } from '../../i18n/messages'
import type { DuckCoinKind } from '../coinAssets'

/**
 * LEVEL 1 BANK.
 *
 * Three floors of risk stacked bottom to top:
 *   LOBBY  (start, safe, small change)      y 928..1240
 *   HALL   (guards, cameras, C10/C50)       y 408..900
 *   VAULT  (locked door, C100 and the safe) y  40..380
 *
 * START sits in the south east service entrance, EXIT in the south west lobby,
 * so every deep run has to come all the way back through the hall.
 */
export const BANK_W = 1760
export const BANK_H = 1280
export const BANK_SPAWN = { x: 1560, y: 1150 }
export const BANK_EXIT = { x: 148, y: 1188 }

export type BankRect = { x: number; y: number; w: number; h: number }
export type BankDoor = BankRect & { id: 'bankVault' }
export type BankFurn = BankRect & { kind: 'desk' | 'cabinet' | 'column' }

/** Inner walls only; outer bounds and the locked door are added by the scene. */
export const BANK_WALLS: BankRect[] = [
  // vault wall: locked door gap 800..940, narrow service gap 1400..1460
  { x: 40, y: 380, w: 760, h: 28 },
  { x: 940, y: 380, w: 460, h: 28 },
  { x: 1460, y: 380, w: 260, h: 28 },
  // vault inner dividers
  { x: 560, y: 40, w: 28, h: 150 },
  { x: 1180, y: 40, w: 28, h: 200 },
  // west corridor (gap 500..640)
  { x: 236, y: 408, w: 28, h: 92 },
  { x: 236, y: 640, w: 28, h: 260 },
  // east corridor (gap 500..640)
  { x: 1488, y: 408, w: 28, h: 92 },
  { x: 1488, y: 640, w: 28, h: 260 },
  // lobby divider: west 88..196, centre 424..560, east 1180..1328
  { x: 40, y: 900, w: 48, h: 28 },
  { x: 196, y: 900, w: 228, h: 28 },
  { x: 560, y: 900, w: 620, h: 28 },
  { x: 1328, y: 900, w: 392, h: 28 },
]

export const BANK_DOORS: BankDoor[] = [{ id: 'bankVault', x: 800, y: 380, w: 140, h: 28 }]

export const BANK_FURNITURE: BankFurn[] = [
  // hall counters
  { x: 320, y: 540, w: 170, h: 46, kind: 'desk' },
  { x: 320, y: 730, w: 170, h: 46, kind: 'desk' },
  { x: 980, y: 540, w: 170, h: 46, kind: 'desk' },
  { x: 980, y: 730, w: 170, h: 46, kind: 'desk' },
  { x: 620, y: 620, w: 46, h: 46, kind: 'column' },
  { x: 1088, y: 620, w: 46, h: 46, kind: 'column' },
  // corridor lockers to wait a patrol out
  { x: 64, y: 600, w: 72, h: 120, kind: 'cabinet' },
  { x: 1624, y: 600, w: 72, h: 120, kind: 'cabinet' },
  // lobby counters
  { x: 240, y: 980, w: 170, h: 46, kind: 'desk' },
  { x: 1380, y: 980, w: 170, h: 46, kind: 'desk' },
  // vault deposit cabinets
  { x: 1000, y: 60, w: 80, h: 120, kind: 'cabinet' },
  { x: 300, y: 250, w: 150, h: 46, kind: 'desk' },
]

export const BANK_HIDES: BankRect[] = [
  { x: 320, y: 586, w: 170, h: 48 },
  { x: 320, y: 776, w: 170, h: 48 },
  { x: 980, y: 586, w: 170, h: 48 },
  { x: 980, y: 776, w: 170, h: 48 },
  { x: 608, y: 666, w: 70, h: 40 },
  { x: 1076, y: 666, w: 70, h: 40 },
  { x: 136, y: 610, w: 50, h: 100 },
  { x: 1574, y: 610, w: 50, h: 100 },
  { x: 240, y: 1026, w: 170, h: 48 },
  { x: 1380, y: 1026, w: 170, h: 48 },
  { x: 1080, y: 70, w: 46, h: 100 },
  { x: 300, y: 296, w: 150, h: 46 },
]

/** Small change near the start, C50 in the hall, C100 behind the vault door. */
export const BANK_LOOT: { x: number; y: number; kind: DuckCoinKind }[] = [
  // lobby
  { x: 1450, y: 1150, kind: 'C5' },
  { x: 1300, y: 1060, kind: 'C5' },
  { x: 1120, y: 1180, kind: 'C5' },
  { x: 900, y: 1120, kind: 'C10' },
  { x: 620, y: 1160, kind: 'C5' },
  { x: 430, y: 1070, kind: 'C5' },
  { x: 300, y: 1150, kind: 'C10' },
  // corridors
  { x: 150, y: 760, kind: 'C10' },
  { x: 150, y: 460, kind: 'C5' },
  { x: 1610, y: 760, kind: 'C5' },
  { x: 1610, y: 460, kind: 'C10' },
  // hall
  { x: 420, y: 640, kind: 'C5' },
  { x: 700, y: 560, kind: 'C5' },
  { x: 860, y: 700, kind: 'C10' },
  { x: 1200, y: 660, kind: 'C5' },
  { x: 520, y: 840, kind: 'C5' },
  { x: 1000, y: 470, kind: 'C10' },
  { x: 760, y: 840, kind: 'C5' },
  { x: 380, y: 500, kind: 'C50' },
  // vault
  { x: 300, y: 140, kind: 'C50' },
  { x: 620, y: 300, kind: 'C10' },
  { x: 900, y: 140, kind: 'C50' },
  { x: 1320, y: 120, kind: 'C100' },
]

export const BANK_SAFES: {
  x: number
  y: number
  extraX: number
  extraY: number
  extraKind?: DuckCoinKind
  reward: number
}[] = [{ x: 1520, y: 150, extraX: 1400, extraY: 270, extraKind: 'C50', reward: 100 }]

export const BANK_CAMS: { x: number; y: number; base: number; sweep: number; speed: number }[] = [
  { x: 860, y: 430, base: Math.PI / 2, sweep: 0.85, speed: 0.5 },
  { x: 1588, y: 560, base: Math.PI, sweep: 0.8, speed: 0.48 },
  { x: 180, y: 560, base: 0, sweep: 0.8, speed: 0.44 },
  { x: 1430, y: 300, base: Math.PI / 2, sweep: 0.5, speed: 0.52 },
  { x: 700, y: 120, base: Math.PI / 2, sweep: 0.75, speed: 0.42 },
]

export const BANK_GUARD_ROUTES: { x: number; y: number }[][] = [
  [
    { x: 420, y: 655 },
    { x: 860, y: 470 },
    { x: 1180, y: 560 },
    { x: 860, y: 800 },
    { x: 420, y: 820 },
  ],
  [
    { x: 700, y: 1040 },
    { x: 480, y: 980 },
    { x: 900, y: 830 },
    { x: 1240, y: 830 },
    { x: 1240, y: 1080 },
  ],
  [
    { x: 760, y: 300 },
    { x: 300, y: 180 },
    { x: 1080, y: 300 },
    { x: 1500, y: 300 },
  ],
]

export const BANK_LABELS: { x: number; y: number; key: MessageKey }[] = [
  { x: 1560, y: 1052, key: 'heistRoomStart' },
  { x: 148, y: 1108, key: 'heistRoomLobby' },
  { x: 860, y: 620, key: 'heistRoomHall' },
  { x: 400, y: 70, key: 'heistRoomVault' },
]

export const BANK_LAMPS: [number, number][] = [
  [1500, 1080],
  [900, 1080],
  [300, 1080],
  [860, 620],
  [400, 500],
  [1300, 500],
  [700, 120],
  [1450, 120],
  [150, 700],
  [1600, 700],
]

export const BANK_FLOORS: { x: number; y: number; w: number; h: number; color: number; alpha: number }[] = [
  { x: 40, y: 928, w: 1680, h: 312, color: 0x151018, alpha: 0.32 },
  { x: 264, y: 408, w: 1224, h: 492, color: 0x121016, alpha: 0.22 },
  { x: 40, y: 40, w: 1680, h: 340, color: 0x1c1410, alpha: 0.3 },
]
