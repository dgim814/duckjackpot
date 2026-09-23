import type { MessageKey } from '../../../i18n/messages'
import type { DuckCoinKind } from '../../coinAssets'
import type { HeistLevelId } from '../../heistLevel'
import {
  BANK_CAMS,
  BANK_DECOR,
  BANK_DOORS,
  BANK_EXIT,
  BANK_FOLIAGE,
  BANK_FURNITURE,
  BANK_GUARD_ROUTES,
  BANK_H,
  BANK_HIDES,
  BANK_LABELS,
  BANK_LAMPS,
  BANK_LOOT,
  BANK_SAFES,
  BANK_SPAWN,
  BANK_W,
  BANK_WALLS,
  BANK_ZONES,
} from '../../phaser/bankLayout'
import {
  MANSION_CAMS,
  MANSION_DECOR,
  MANSION_DOORS,
  MANSION_EXIT,
  MANSION_FURNITURE,
  MANSION_GUARD_ROUTES,
  MANSION_H,
  MANSION_HIDES,
  MANSION_LABELS,
  MANSION_LAMPS,
  MANSION_LOOT,
  MANSION_SAFES,
  MANSION_SPAWN,
  MANSION_W,
  MANSION_WALLS,
} from '../../phaser/mansionLayout'

export type Rect = { x: number; y: number; w: number; h: number }
export type Vec = { x: number; y: number }

export type FloorTheme =
  | 'marble'
  | 'lobby'
  | 'carpetBlue'
  | 'carpetGreen'
  | 'tiles'
  | 'concrete'
  | 'wood'
  | 'steel'
  | 'server'
  | 'storage'
  | 'vault'
  | 'gold'
  | 'mansionWood'
  | 'mansionStone'

export type LightTone = 'warm' | 'cool' | 'blue' | 'dim' | 'gold'

export type ZoneDef = Rect & {
  i: number
  id: string
  key: MessageKey
  floor: FloorTheme
  light: LightTone
}

export type FurnitureKind =
  | 'desk'
  | 'cabinet'
  | 'column'
  | 'atm'
  | 'chair'
  | 'counter'
  | 'shelf'
  | 'plant'
  | 'bench'
  | 'lamp'
  | 'toilet'
  | 'sofa'
  | 'bed'
  | 'stove'
  | 'nightstand'

export type SolidDef = Rect & { kind: 'wall' | FurnitureKind }
export type DoorDef = Rect & { id: string }
export type DecorDef = Rect & { kind: 'rug' | 'runner' | 'painting' | 'rope'; tone?: string }
export type LootDef = { id: string; x: number; y: number; kind: DuckCoinKind; persistent: boolean }
export type SafeDef = {
  id: string
  x: number
  y: number
  reward: number
  extra?: { id: string; x: number; y: number; kind: DuckCoinKind }
}
export type CamDef = { x: number; y: number; base: number; sweep: number; speed: number }
export type LampDef = { x: number; y: number; color: number; alpha: number }

export type LevelDef = {
  id: HeistLevelId
  w: number
  h: number
  spawn: Vec
  exit: Rect
  solids: SolidDef[]
  doors: DoorDef[]
  decor: DecorDef[]
  foliage: Rect[]
  hides: Rect[]
  loot: LootDef[]
  safes: SafeDef[]
  cams: CamDef[]
  guardRoutes: Vec[][]
  zones: ZoneDef[]
  labels: { x: number; y: number; key: MessageKey }[]
  lamps: LampDef[]
  /** Zone index a raid must reach for the level to count as "final". */
  finalZone: number
  background: number
}

const WALL_T = 40
const EXIT_W = 170
const EXIT_H = 96

function border(w: number, h: number): SolidDef[] {
  return [
    { x: 0, y: 0, w, h: WALL_T, kind: 'wall' },
    { x: 0, y: h - WALL_T, w, h: WALL_T, kind: 'wall' },
    { x: 0, y: 0, w: WALL_T, h, kind: 'wall' },
    { x: w - WALL_T, y: 0, w: WALL_T, h, kind: 'wall' },
  ]
}

function exitRect(p: Vec): Rect {
  return { x: p.x - EXIT_W / 2, y: p.y - EXIT_H / 2, w: EXIT_W, h: EXIT_H }
}

/** One building, twenty rooms: each room gets a floor and light that says what it is. */
const BANK_THEME: Record<string, { floor: FloorTheme; light: LightTone }> = {
  start: { floor: 'lobby', light: 'warm' },
  lobby: { floor: 'lobby', light: 'warm' },
  hall: { floor: 'marble', light: 'warm' },
  west: { floor: 'carpetGreen', light: 'warm' },
  east: { floor: 'carpetGreen', light: 'warm' },
  offices: { floor: 'carpetBlue', light: 'warm' },
  toilet: { floor: 'tiles', light: 'cool' },
  utility: { floor: 'concrete', light: 'dim' },
  archive: { floor: 'wood', light: 'warm' },
  security: { floor: 'steel', light: 'blue' },
  server: { floor: 'server', light: 'blue' },
  central: { floor: 'marble', light: 'warm' },
  closed: { floor: 'carpetBlue', light: 'dim' },
  storageA: { floor: 'storage', light: 'dim' },
  safeA: { floor: 'vault', light: 'gold' },
  deep: { floor: 'concrete', light: 'dim' },
  wing: { floor: 'wood', light: 'warm' },
  storageB: { floor: 'storage', light: 'dim' },
  safeB: { floor: 'vault', light: 'gold' },
  final: { floor: 'gold', light: 'gold' },
}

let bankCache: LevelDef | null = null
let mansionCache: LevelDef | null = null

function bankLevel(): LevelDef {
  if (bankCache) return bankCache
  const safeExtraIds = new Set(BANK_SAFES.map((s) => s.extraId))
  bankCache = {
    id: 'bank',
    w: BANK_W,
    h: BANK_H,
    spawn: { ...BANK_SPAWN },
    exit: exitRect(BANK_EXIT),
    solids: [
      ...border(BANK_W, BANK_H),
      ...BANK_WALLS.map((r) => ({ ...r, kind: 'wall' as const })),
      ...BANK_FURNITURE.map((f) => ({ ...f })),
    ],
    doors: BANK_DOORS.map((d) => ({ ...d })),
    decor: BANK_DECOR.map((d) => ({ ...d })),
    foliage: BANK_FOLIAGE.map((f) => ({ ...f })),
    hides: BANK_HIDES.map((h) => ({ ...h })),
    loot: BANK_LOOT.filter((l) => !safeExtraIds.has(l.id)).map((l) => ({ ...l, persistent: true })),
    safes: BANK_SAFES.map((s) => ({
      id: s.id,
      x: s.x,
      y: s.y,
      reward: s.reward,
      extra: s.extraKind ? { id: s.extraId, x: s.extraX, y: s.extraY, kind: s.extraKind } : undefined,
    })),
    cams: BANK_CAMS.map((c) => ({ ...c })),
    guardRoutes: BANK_GUARD_ROUTES.map((r) => r.map((p) => ({ ...p }))),
    zones: BANK_ZONES.map((z) => ({ ...z, ...(BANK_THEME[z.id] ?? { floor: 'marble' as const, light: 'warm' as const }) })),
    labels: BANK_LABELS.map((l) => ({ ...l })),
    lamps: BANK_LAMPS.map((l) => ({ ...l })),
    finalZone: BANK_ZONES.length - 1,
    background: 0x0b0a10,
  }
  return bankCache
}

function mansionLevel(): LevelDef {
  if (mansionCache) return mansionCache
  mansionCache = {
    id: 'mansion',
    w: MANSION_W,
    h: MANSION_H,
    spawn: { ...MANSION_SPAWN },
    exit: exitRect(MANSION_EXIT),
    solids: [
      ...border(MANSION_W, MANSION_H),
      ...MANSION_WALLS.map((r) => ({ ...r, kind: 'wall' as const })),
      ...MANSION_FURNITURE.map((f) => ({ ...f })),
    ],
    doors: MANSION_DOORS.map((d) => ({ ...d })),
    decor: MANSION_DECOR.map((d) => ({ ...d })),
    foliage: [],
    hides: MANSION_HIDES.map((h) => ({ ...h })),
    loot: MANSION_LOOT.map((l, i) => ({ id: `mansion-loot-${i}`, x: l.x, y: l.y, kind: l.kind, persistent: false })),
    safes: MANSION_SAFES.map((s) => ({
      id: `mansion-${s.x}-${s.y}`,
      x: s.x,
      y: s.y,
      reward: s.reward,
      extra: s.extraKind ? { id: `mansion-extra-${s.x}-${s.y}`, x: s.extraX, y: s.extraY, kind: s.extraKind } : undefined,
    })),
    cams: MANSION_CAMS.map((c) => ({ ...c })),
    guardRoutes: MANSION_GUARD_ROUTES.map((r) => r.map((p) => ({ ...p }))),
    zones: [
      {
        i: 0,
        id: 'mansion',
        key: 'heistMapMansion',
        x: 0,
        y: 0,
        w: MANSION_W,
        h: MANSION_H,
        floor: 'mansionWood',
        light: 'warm',
      },
    ],
    labels: MANSION_LABELS.map((l) => ({ ...l })),
    lamps: MANSION_LAMPS.map(([x, y]) => ({ x, y, color: 0xd4a24a, alpha: 0.1 })),
    finalZone: 0,
    background: 0x140e0c,
  }
  return mansionCache
}

export function levelDef(id: HeistLevelId): LevelDef {
  return id === 'mansion' ? mansionLevel() : bankLevel()
}

/** Last matching zone wins, so small rooms carved out of a big hall resolve to the room. */
export function zoneAt(level: LevelDef, x: number, y: number): ZoneDef {
  for (let i = level.zones.length - 1; i >= 0; i -= 1) {
    const z = level.zones[i]
    if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z
  }
  let best = level.zones[0]
  let bestD = Number.POSITIVE_INFINITY
  for (const z of level.zones) {
    const cx = Math.max(z.x, Math.min(z.x + z.w, x))
    const cy = Math.max(z.y, Math.min(z.y + z.h, y))
    const d = (cx - x) ** 2 + (cy - y) ** 2
    if (d < bestD) {
      bestD = d
      best = z
    }
  }
  return best
}
