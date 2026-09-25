import type { MessageKey } from '../../../i18n/messages'
import type { DuckCoinKind } from '../../coinAssets'
import type { GrandLevelId } from '../../heistLevel'
import type {
  CamDef,
  DecorDef,
  DoorDef,
  EscalatorDef,
  FloorTheme,
  FurnitureKind,
  LampDef,
  LaserDef,
  LevelDef,
  LiftDef,
  LightTone,
  LootDef,
  PanelDef,
  Rect,
  SafeDef,
  SolidDef,
  ValuableDef,
  Vec,
  ZoneDef,
} from './LevelDef'

/**
 * LEVELS 3–5 — the same building grammar as the 40-zone MANSION, scaled by a
 * spec: every floor is 5 bands (full hall, 2 rooms, 3 rooms, 3 rooms, full
 * stair hall) = 10 zones, a central door column runs through all bands and
 * side rooms open off it through doorways. Floors are joined by two locked
 * doors in a row; deeper floors lock more of the column, and side arches give
 * a way round some of those locks. One EXIT, in the entrance hall.
 *
 * Everything is generated deterministically (hash-based), so a level is the
 * same on every device and persistent ids (doors, safes, loot) never change.
 */
const W = 3000
const T = 40
const WH = 28
const BAND = 480
const COL_X0 = 1410
const COL_X1 = 1590
const PATH: readonly [number, number] = [1300, 1700]
const SIDE_ARCH_W: readonly [number, number] = [190, 370]
const SIDE_ARCH_E: readonly [number, number] = [2630, 2810]
const DOORWAY = 180

export type GrandKit =
  | 'lobby'
  | 'checkpoint'
  | 'reception'
  | 'atrium'
  | 'lounge'
  | 'guardPost'
  | 'cashHall'
  | 'deposit'
  | 'corridor'
  | 'stairs'
  | 'office'
  | 'boardroom'
  | 'openOffice'
  | 'archive'
  | 'server'
  | 'control'
  | 'laser'
  | 'safeRoom'
  | 'bullion'
  | 'gallery'
  | 'collection'
  | 'jewels'
  | 'bar'
  | 'casino'
  | 'cellar'
  | 'bunker'
  | 'crates'
  | 'lab'
  | 'barracks'
  | 'vaultRow'
  | 'secret'
  | 'fountain'
  | 'library'
  | 'maze'
  | 'treasury'
  | 'finale'

export type GrandRoom = { key: MessageKey; kit: GrandKit; floor: FloorTheme; light: LightTone }

export type GrandSpec = {
  id: GrandLevelId
  /** Prefix of every persistent id (doors, safes, loot): never change it once shipped. */
  prefix: string
  floors: number
  rooms: GrandRoom[]
  /** Where the two-room band splits on each floor. */
  splitByFloor: number[]
  /** Which dividers are locked doors: (floor, k) where k = divider index in the floor 0..4. */
  lockAt: (floor: number, k: number) => boolean
  /** Divider arches beside the column: a way round some locks. */
  archAt: (floor: number, k: number) => boolean
  /** Side rooms (zone numbers) behind locked doors. */
  lockedSide: number[]
  safes: { zone: number; reward: number; extra: DuckCoinKind }[]
  /** Loot counts [C5, C10, C50, C100] for zone i (0-based). */
  loot: (i: number, depth: number) => [number, number, number, number]
  /** Cameras on the door column per band (0..2) by floor, plus one watching every safe. */
  camsPerBand: (floor: number, k: number) => number
  camSpeed: (floor: number) => number
  /** Patrol routes per band (0..2) by floor. */
  guardsPerBand: (floor: number, k: number) => number
  background: number
  runner: { base: number; gold: number; edge: number }
  /** LEVELS 6–8: each level adds its own mechanic set on top of the building grammar. */
  features?: {
    /** SKYLINE: a lift cabin in every floor's entrance hall. */
    lifts?: boolean
    /** UNDERGROUND CITY: free down-escalators in side arches + ⭐ express escalators between floors. */
    escalators?: { free: boolean; express: boolean }
    /** GRAND COLLECTION: timed beams across the column corridor from `fromFloor`, and laser vault rooms. */
    lasers?: { fromFloor: number; doubleFromFloor: number; vaultZones: number[] }
    /** Special loot rooms: value rises with depth. */
    valuables?: { zones: number[]; min: number; max: number }
  }
}

const VALUABLE_KINDS: ValuableDef['kind'][] = ['watch', 'jewel', 'art', 'relic', 'crown']

function hash(x: number, y: number, seed: number) {
  let h = (Math.floor(x) * 73856093) ^ (Math.floor(y) * 19349663) ^ (seed * 83492791)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff
}

function rectsHit(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

type Room = { i: number; spec: GrandRoom; r: Rect; inner: Rect; band: number; slot: 'full' | 'W' | 'C' | 'E' }

const cache = new Map<GrandLevelId, LevelDef>()

export function buildGrandLevel(spec: GrandSpec): LevelDef {
  const hit = cache.get(spec.id)
  if (hit) return hit
  const BANDS = spec.floors * 5
  const H = BANDS * BAND
  const zonesTotal = spec.floors * 10
  if (spec.rooms.length !== zonesTotal) throw new Error(`${spec.id}: ${spec.rooms.length} rooms for ${zonesTotal} zones`)
  const bandTop = (g: number) => H - (g + 1) * BAND
  const P = spec.prefix

  const solids: SolidDef[] = []
  const doors: DoorDef[] = []
  const decor: DecorDef[] = []
  const foliage: Rect[] = []
  const hides: Rect[] = []
  const lamps: LampDef[] = []
  const cams: CamDef[] = []
  const zones: ZoneDef[] = []
  const labels: { x: number; y: number; key: MessageKey }[] = []
  const guardRoutes: Vec[][] = []
  const safes: SafeDef[] = []
  const keepClear: Rect[] = []
  const rooms: Room[] = []

  solids.push(
    { x: 0, y: 0, w: W, h: T, kind: 'wall' },
    { x: 0, y: H - T, w: W, h: T, kind: 'wall' },
    { x: 0, y: 0, w: T, h: H, kind: 'wall' },
    { x: W - T, y: 0, w: T, h: H, kind: 'wall' },
  )
  keepClear.push({ x: PATH[0], y: 0, w: PATH[1] - PATH[0], h: H })

  const doorFloor: Record<string, number> = {}
  const passDoors: Record<string, 'escalator'> = {}
  const escalators: EscalatorDef[] = []
  const F = spec.features ?? {}

  // ---- horizontal dividers (between band g and g+1) ----
  for (let g = 0; g < BANDS - 1; g += 1) {
    const floor = Math.floor(g / 5)
    const k = g % 5
    const y = bandTop(g)
    const gaps: [number, number][] = [[COL_X0, COL_X1]]
    // ⭐ Express escalator between floors: an extra east opening, gated by a pass door.
    if (k === 4 && F.escalators?.express) {
      gaps.push([SIDE_ARCH_E[0], SIDE_ARCH_E[1]])
      const id = `${P}Express${g}`
      doors.push({ id, x: SIDE_ARCH_E[0], y, w: SIDE_ARCH_E[1] - SIDE_ARCH_E[0], h: WH })
      passDoors[id] = 'escalator'
      doorFloor[id] = floor + 1
      escalators.push({ id: `${P}ExpEsc${g}`, x: SIDE_ARCH_E[0] + 10, y: y - 230, w: SIDE_ARCH_E[1] - SIDE_ARCH_E[0] - 20, h: WH + 460, dx: 0, dy: 1, speed: 190, premium: true })
    }
    // No arches across a floor boundary (k = 4): stairs are the only way up.
    if (k !== 4 && spec.archAt(floor, k)) gaps.push([SIDE_ARCH_W[0], SIDE_ARCH_W[1]], [SIDE_ARCH_E[0], SIDE_ARCH_E[1]])
    gaps.sort((a, b) => a[0] - b[0])
    let x = T
    for (const [a, b] of gaps) {
      if (a > x) solids.push({ x, y, w: a - x, h: WH, kind: 'wall' })
      x = b
      keepClear.push({ x: a - 20, y: y - 110, w: b - a + 40, h: WH + 220 })
    }
    if (x < W - T) solids.push({ x, y, w: W - T - x, h: WH, kind: 'wall' })
    // Floor stairs (k 3 and 4) are always locked; the rest follows the level's depth rule.
    const locked = k === 3 || k === 4 || spec.lockAt(floor, k)
    if (locked) {
      doors.push({ id: `${P}Door${g}`, x: COL_X0, y, w: COL_X1 - COL_X0, h: WH })
      // The stair door at the top of a floor belongs to the next floor.
      doorFloor[`${P}Door${g}`] = k === 4 ? floor + 1 : floor
    }
    // Free down-escalators in the west arches: an optional quicker way back towards EXIT.
    if (F.escalators?.free && k !== 4 && floor >= 1 && spec.archAt(floor, k) && (k === 1 || k === 2)) {
      escalators.push({ id: `${P}Esc${g}`, x: SIDE_ARCH_W[0] + 10, y: y - 170, w: SIDE_ARCH_W[1] - SIDE_ARCH_W[0] - 20, h: WH + 340, dx: 0, dy: 1, speed: 170, premium: false })
    }
  }
  for (const e of escalators) keepClear.push({ x: e.x - 30, y: e.y, w: e.w + 60, h: e.h })

  // ---- bands → rooms ----
  let zi = 0
  for (let g = 0; g < BANDS; g += 1) {
    const floor = Math.floor(g / 5)
    const k = g % 5
    const top = bandTop(g)
    const innerTop = g === BANDS - 1 ? T : top + WH
    const innerBot = g === 0 ? H - T : top + BAND
    const split = spec.splitByFloor[floor % spec.splitByFloor.length]
    let xs: number[]
    let slots: Room['slot'][]
    if (k === 0 || k === 4) {
      xs = [T, W - T]
      slots = ['full']
    } else if (k === 1) {
      xs = [T, split, W - T]
      slots = ['W', 'E']
    } else {
      xs = [T, 1000, 2000, W - T]
      slots = ['W', 'C', 'E']
    }
    for (let s = 0; s < slots.length; s += 1) {
      const rs = spec.rooms[zi]
      const x0 = xs[s]
      const x1 = xs[s + 1]
      const r: Rect = { x: s === 0 ? 0 : x0, y: top, w: (s === slots.length - 1 ? W : x1) - (s === 0 ? 0 : x0), h: BAND }
      const inner: Rect = {
        x: x0 + (s === 0 ? 0 : WH / 2),
        y: innerTop,
        w: x1 - x0 - (s === 0 ? 0 : WH / 2) - (s === slots.length - 1 ? 0 : WH / 2),
        h: innerBot - innerTop,
      }
      rooms.push({ i: zi, spec: rs, r, inner, band: g, slot: slots[s] })
      zones.push({ i: zi, id: `${P}z${zi + 1}`, key: rs.key, x: r.x, y: r.y, w: r.w, h: r.h, floor: rs.floor, light: rs.light })
      const onRoute = inner.x < COL_X0 && inner.x + inner.w > COL_X1
      labels.push({ x: inner.x + inner.w / 2 + (onRoute ? 330 : 0), y: inner.y + 60, key: rs.key })
      zi += 1
    }
    for (let s = 1; s < xs.length - 1; s += 1) {
      const x = xs[s] - WH / 2
      const gapTop = Math.floor((innerTop + innerBot) / 2) - DOORWAY / 2
      solids.push({ x, y: innerTop, w: WH, h: gapTop - innerTop, kind: 'wall' })
      solids.push({ x, y: gapTop + DOORWAY, w: WH, h: innerBot - gapTop - DOORWAY, kind: 'wall' })
      keepClear.push({ x: x - 150, y: gapTop - 30, w: WH + 300, h: DOORWAY + 60 })
    }
  }

  // Side rooms locked from the centre (safes, secrets): W rooms lock on their east split, E rooms on the west one.
  const lockedRooms = new Set<number>()
  for (const zone of spec.lockedSide) {
    const room = rooms[zone - 1]
    if (!room || room.slot === 'C' || room.slot === 'full') continue
    const g = room.band
    const floor = Math.floor(g / 5)
    const top = bandTop(g)
    const innerTop = top + WH
    const innerBot = top + BAND
    const mid = Math.floor((innerTop + innerBot) / 2)
    const k = g % 5
    const splitX = k === 1 ? spec.splitByFloor[floor % spec.splitByFloor.length] : room.slot === 'W' ? 1000 : 2000
    doors.push({ id: `${P}Side${zone}`, x: splitX - WH / 2, y: mid - DOORWAY / 2, w: WH, h: DOORWAY })
    doorFloor[`${P}Side${zone}`] = floor
    lockedRooms.add(room.i)
  }

  // ---- spawn, exit (the only one) ----
  const spawn: Vec = { x: 1500, y: H - T - 120 }
  const exit: Rect = { x: 150, y: H - T - 150, w: 170, h: 96 }
  keepClear.push({ x: spawn.x - 180, y: spawn.y - 160, w: 360, h: 240 }, { x: exit.x - 60, y: exit.y - 80, w: exit.w + 120, h: exit.h + 120 })

  // ---- SKYLINE lifts: a cabin in the top-right of every floor's entrance hall ----
  const lifts: LiftDef[] = []
  if (F.lifts) {
    for (let f = 0; f < spec.floors; f += 1) {
      const hall = rooms.find((r) => r.band === f * 5)!
      const R = hall.inner
      const lift: LiftDef = { id: `${P}Lift${f}`, x: R.x + R.w - 330, y: R.y + 26, w: 170, h: 120, floor: f, zone: hall.i }
      lifts.push(lift)
      keepClear.push({ x: lift.x - 60, y: lift.y - 10, w: lift.w + 120, h: lift.h + 150 })
    }
  }

  // ---- GRAND COLLECTION lasers: corridor beams + laser vault rooms, each floor with a panel ----
  const lasers: LaserDef[] = []
  const panels: PanelDef[] = []
  if (F.lasers) {
    for (let f = F.lasers.fromFloor; f < spec.floors; f += 1) {
      const band = f * 5 + 2
      const c = rooms.find((r) => r.band === band && r.slot === 'C')
      if (!c) continue
      const R = c.inner
      const group = `${P}Grid${f}`
      const mid = Math.round(R.y + R.h / 2)
      // Readable rhythm: 1.5 s on, 1.5 s off; deeper floors add a second beam half a cycle apart.
      lasers.push({ id: `${P}Beam${f}a`, x: R.x, y: mid - 40, w: R.w, h: 6, period: 3, on: 1.5, phase: (f * 0.37) % 3, group })
      if (f >= F.lasers.doubleFromFloor) lasers.push({ id: `${P}Beam${f}b`, x: R.x, y: mid + 60, w: R.w, h: 6, period: 3, on: 1.5, phase: (f * 0.37 + 1.5) % 3, group })
      const panel: PanelDef = { id: `${P}Panel${f}`, x: R.x + 70, y: R.y + R.h - 70, group }
      panels.push(panel)
      keepClear.push({ x: panel.x - 50, y: panel.y - 60, w: 100, h: 110 }, { x: R.x, y: mid - 70, w: R.w, h: 170 })
    }
    for (const zone of F.lasers.vaultZones) {
      const room = rooms[zone - 1]
      if (!room) continue
      const R = room.inner
      const group = `${P}Vault${zone}`
      for (const [i, fx] of [0.34, 0.62].entries()) {
        lasers.push({ id: `${P}VBeam${zone}${i}`, x: Math.round(R.x + R.w * fx), y: R.y + 12, w: 6, h: R.h - 24, period: 2.6, on: 1.4, phase: i * 1.3, group })
      }
      keepClear.push({ x: R.x + R.w * 0.3, y: R.y, w: R.w * 0.4, h: R.h })
    }
  }

  // ---- special loot (placed before furniture; laser vaults keep it at the far wall) ----
  const valuables: ValuableDef[] = []
  if (F.valuables) {
    const zs = F.valuables.zones
    zs.forEach((zone, n) => {
      const room = rooms[zone - 1]
      if (!room) return
      const R = room.inner
      const t = zs.length > 1 ? n / (zs.length - 1) : 1
      const value = Math.round((F.valuables!.min + t * (F.valuables!.max - F.valuables!.min)) / 10) * 10
      const inVault = F.lasers?.vaultZones.includes(zone)
      const farLeft = room.slot === 'W' || (room.slot !== 'E' && hash(zone, 5, 9) < 0.5)
      const x = inVault ? (farLeft ? R.x + 110 : R.x + R.w - 110) : Math.round(R.x + R.w * (0.25 + 0.5 * hash(zone, 2, 7)))
      const y = Math.round(R.y + R.h * 0.5)
      valuables.push({ id: `${P}V${zone}`, x, y, kind: VALUABLE_KINDS[n % VALUABLE_KINDS.length], value })
      keepClear.push({ x: x - 70, y: y - 70, w: 140, h: 140 })
    })
  }

  // ---- safes (placed before furniture so furniture keeps clear of them) ----
  for (const s of spec.safes) {
    const room = rooms[s.zone - 1]
    const R = room.inner
    const onPath = R.x < PATH[1] && R.x + R.w > PATH[0]
    const x = onPath ? (R.x + R.w / 2 < 1500 ? R.x + 180 : R.x + R.w - 180) : R.x + R.w / 2
    const y = R.y + 90
    safes.push({ id: `${P}Safe${s.zone}`, x, y, reward: s.reward, extra: { id: `${P}-safe-${s.zone}`, x: x + (x < 1500 ? 150 : -150), y: y + 110, kind: s.extra } })
    keepClear.push({ x: x - 90, y: y - 70, w: 180, h: 260 })
  }

  // ---- furniture kits ----
  const place = (room: Room, kind: FurnitureKind, w: number, h: number, fx: number, fy: number, hide = false) => {
    const R = room.inner
    const pad = 36
    const x = Math.round(R.x + pad + fx * Math.max(0, R.w - w - pad * 2))
    const y = Math.round(R.y + 30 + fy * Math.max(0, R.h - h - 60))
    const f: Rect = { x, y, w, h }
    if (keepClear.some((c) => rectsHit(c, f))) return
    if (solids.some((s) => s.kind !== 'wall' && rectsHit({ x: s.x - 24, y: s.y - 24, w: s.w + 48, h: s.h + 48 }, f))) return
    solids.push({ ...f, kind })
    if (hide) {
      const hr: Rect = { x: x - 4, y: y + h + 2, w: w + 8, h: 44 }
      if (!keepClear.some((c) => rectsHit(c, hr))) hides.push(hr)
    }
  }
  const plant = (room: Room, fx: number, fy: number, big = false) => {
    const R = room.inner
    const w = big ? 72 : 56
    const h = big ? 70 : 52
    const x = Math.round(R.x + 40 + fx * (R.w - w - 80))
    const y = Math.round(R.y + 30 + fy * (R.h - h - 60))
    const f: Rect = { x, y, w, h }
    if (keepClear.some((c) => rectsHit(c, f))) return
    if (solids.some((s) => rectsHit({ x: s.x - 16, y: s.y - 16, w: s.w + 32, h: s.h + 32 }, f))) return
    foliage.push(f)
    hides.push({ x: f.x, y: f.y + 8, w: f.w, h: f.h - 6 })
  }
  const rug = (room: Room, fx: number, fy: number, w: number, h: number, tone: string) => {
    const R = room.inner
    decor.push({ x: Math.round(R.x + fx * (R.w - w)), y: Math.round(R.y + fy * (R.h - h)), w, h, kind: 'rug', tone })
  }
  const paintings = (room: Room, n: number) => {
    const R = room.inner
    for (let i = 0; i < n; i += 1) {
      const x = R.x + ((i + 0.5) / n) * R.w - 36
      if (x + 72 > PATH[0] && x < PATH[1]) continue
      decor.push({ x, y: R.y - 18, w: 72, h: 30, kind: 'painting' })
    }
  }

  for (const room of rooms) {
    switch (room.spec.kit) {
      case 'lobby':
        place(room, 'column', 52, 52, 0.28, 0.2)
        place(room, 'column', 52, 52, 0.72, 0.2)
        place(room, 'counter', 220, 50, 0.86, 0.55, true)
        place(room, 'bench', 170, 42, 0.12, 0.25)
        plant(room, 0.02, 0.15, true)
        plant(room, 0.98, 0.15, true)
        rug(room, 0.5, 0.45, 520, 260, 'lobby')
        paintings(room, 6)
        break
      case 'checkpoint':
        place(room, 'counter', 160, 46, 0.15, 0.3, true)
        place(room, 'atm', 44, 60, 0.85, 0.1)
        place(room, 'cabinet', 70, 90, 0.95, 0.7)
        break
      case 'reception':
        place(room, 'counter', 200, 50, 0.3, 0.3, true)
        place(room, 'chair', 36, 34, 0.35, 0.7)
        place(room, 'sofa', 170, 64, 0.9, 0.2)
        plant(room, 0.02, 0.85)
        break
      case 'atrium':
        for (let i = 0; i < 4; i += 1) place(room, 'column', 52, 52, 0.08 + i * 0.28, 0.15)
        place(room, 'statue', 50, 50, 0.3, 0.75)
        plant(room, 0.02, 0.8, true)
        plant(room, 0.98, 0.8, true)
        paintings(room, 4)
        break
      case 'lounge':
        place(room, 'sofa', 180, 70, 0.1, 0.2, true)
        place(room, 'sofa', 180, 70, 0.1, 0.8, true)
        place(room, 'table', 90, 60, 0.6, 0.5)
        place(room, 'lamp', 28, 40, 0.95, 0.1)
        rug(room, 0.2, 0.5, 280, 200, 'lobby')
        break
      case 'guardPost':
        place(room, 'desk', 180, 56, 0.15, 0.15, true)
        place(room, 'cabinet', 70, 110, 0.95, 0.1)
        place(room, 'chair', 36, 34, 0.2, 0.55)
        break
      case 'cashHall':
        place(room, 'counter', 200, 50, 0.1, 0.2, true)
        place(room, 'counter', 200, 50, 0.9, 0.2, true)
        place(room, 'atm', 44, 60, 0.05, 0.85)
        place(room, 'atm', 44, 60, 0.95, 0.85)
        break
      case 'deposit':
        for (let i = 0; i < 4; i += 1) place(room, 'cabinet', 70, 120, 0.05 + i * 0.3, 0.05, i === 1)
        place(room, 'table', 120, 60, 0.5, 0.8)
        break
      case 'corridor':
        place(room, 'bench', 150, 40, 0.1, 0.1)
        plant(room, 0.95, 0.85)
        paintings(room, 4)
        break
      case 'stairs':
        place(room, 'column', 50, 50, 0.25, 0.1)
        place(room, 'column', 50, 50, 0.75, 0.1)
        place(room, 'statue', 50, 50, 0.08, 0.7)
        place(room, 'statue', 50, 50, 0.92, 0.7)
        plant(room, 0.4, 0.8)
        plant(room, 0.6, 0.8)
        paintings(room, 4)
        decor.push({ x: COL_X0 - 80, y: room.inner.y, w: COL_X1 - COL_X0 + 160, h: 200, kind: 'stairs' })
        break
      case 'office':
        place(room, 'desk', 180, 56, 0.4, 0.5, true)
        place(room, 'chair', 36, 34, 0.45, 0.85)
        place(room, 'shelf', 80, 140, 0.05, 0.05)
        rug(room, 0.4, 0.55, 260, 160, 'office')
        break
      case 'boardroom':
        place(room, 'table', 280, 90, 0.5, 0.45, true)
        for (let i = 0; i < 3; i += 1) place(room, 'chair', 36, 34, 0.3 + i * 0.2, 0.15)
        paintings(room, 3)
        break
      case 'openOffice':
        for (let i = 0; i < 3; i += 1) place(room, 'desk', 150, 48, 0.08 + i * 0.42, 0.15, i === 0)
        for (let i = 0; i < 3; i += 1) place(room, 'desk', 150, 48, 0.08 + i * 0.42, 0.8)
        break
      case 'archive':
        for (let i = 0; i < 4; i += 1) place(room, 'shelf', 70, 140, 0.05 + i * 0.3, i % 2 ? 0.6 : 0.05, i === 1)
        break
      case 'server':
        for (let i = 0; i < 5; i += 1) place(room, 'cabinet', 70, 150, 0.05 + i * 0.22, i % 2 ? 0.75 : 0.05, i === 2)
        break
      case 'control':
        place(room, 'desk', 220, 56, 0.5, 0.1, true)
        place(room, 'cabinet', 70, 130, 0.02, 0.1)
        place(room, 'cabinet', 70, 130, 0.98, 0.1)
        place(room, 'chair', 36, 34, 0.45, 0.45)
        break
      case 'laser':
        // Open floor on purpose: cameras and patrols do the work here.
        for (let i = 0; i < 3; i += 1) place(room, 'pedestal', 44, 44, 0.1 + i * 0.4, 0.5)
        break
      case 'safeRoom':
        place(room, 'display', 90, 60, 0.1, 0.8)
        place(room, 'display', 90, 60, 0.9, 0.8)
        place(room, 'shelf', 70, 130, 0.02, 0.05, true)
        break
      case 'bullion':
        for (let i = 0; i < 3; i += 1) place(room, 'pedestal', 60, 60, 0.08 + i * 0.42, 0.15, i === 0)
        place(room, 'display', 100, 60, 0.9, 0.8)
        break
      case 'gallery':
        paintings(room, 8)
        place(room, 'bench', 160, 40, 0.15, 0.5, true)
        place(room, 'bench', 160, 40, 0.85, 0.5, true)
        place(room, 'statue', 50, 50, 0.4, 0.2)
        decor.push({ x: room.inner.x + 80, y: room.inner.y + 40, w: 180, h: 18, kind: 'rope' })
        break
      case 'collection':
        for (let i = 0; i < 3; i += 1) place(room, 'display', 90, 60, 0.1 + i * 0.4, 0.2)
        place(room, 'statue', 50, 50, 0.2, 0.75)
        place(room, 'statue', 50, 50, 0.8, 0.75)
        paintings(room, 6)
        break
      case 'jewels':
        place(room, 'display', 90, 60, 0.1, 0.8)
        place(room, 'display', 90, 60, 0.9, 0.8, true)
        place(room, 'display', 90, 60, 0.5, 0.15)
        break
      case 'bar':
        place(room, 'counter', 240, 50, 0.5, 0.08, true)
        place(room, 'table', 80, 60, 0.15, 0.7)
        place(room, 'table', 80, 60, 0.85, 0.7)
        place(room, 'chair', 36, 34, 0.3, 0.75)
        break
      case 'casino':
        place(room, 'table', 160, 90, 0.15, 0.25, true)
        place(room, 'table', 160, 90, 0.85, 0.25, true)
        place(room, 'table', 160, 90, 0.15, 0.8)
        place(room, 'table', 160, 90, 0.85, 0.8)
        rug(room, 0.5, 0.5, 420, 220, 'gold')
        break
      case 'cellar':
        for (let i = 0; i < 4; i += 1) place(room, 'shelf', 70, 130, 0.05 + i * 0.3, i % 2 ? 0.65 : 0.05, i === 2)
        break
      case 'bunker':
        place(room, 'column', 60, 60, 0.3, 0.3)
        place(room, 'column', 60, 60, 0.7, 0.7)
        place(room, 'shelf', 70, 130, 0.02, 0.1, true)
        break
      case 'crates':
        for (let i = 0; i < 4; i += 1) place(room, 'cabinet', 90, 70, 0.06 + i * 0.29, i % 2 ? 0.75 : 0.12, i === 1)
        break
      case 'lab':
        place(room, 'counter', 200, 50, 0.1, 0.1, true)
        place(room, 'counter', 200, 50, 0.9, 0.6)
        place(room, 'cabinet', 70, 110, 0.5, 0.85)
        break
      case 'barracks':
        for (let i = 0; i < 3; i += 1) place(room, 'bed', 70, 120, 0.08 + i * 0.4, 0.08, i === 1)
        place(room, 'table', 120, 60, 0.5, 0.8)
        break
      case 'vaultRow':
        for (let i = 0; i < 4; i += 1) place(room, 'cabinet', 64, 120, 0.04 + i * 0.3, 0.05, i === 3)
        place(room, 'pedestal', 56, 56, 0.5, 0.75)
        break
      case 'secret':
        place(room, 'statue', 44, 60, 0.1, 0.5, true)
        place(room, 'shelf', 70, 130, 0.9, 0.1)
        break
      case 'fountain':
        place(room, 'statue', 64, 64, 0.72, 0.4)
        plant(room, 0.6, 0.1, true)
        plant(room, 0.85, 0.1, true)
        plant(room, 0.05, 0.85)
        paintings(room, 4)
        break
      case 'library':
        for (let i = 0; i < 4; i += 1) place(room, 'shelf', 70, 150, 0.08 + i * 0.28, 0.05, i % 2 === 0)
        place(room, 'sofa', 160, 64, 0.5, 0.85)
        rug(room, 0.5, 0.8, 300, 150, 'office')
        break
      case 'maze':
        for (let r = 0; r < 2; r += 1) for (let c = 0; c < 4; c += 1) place(room, 'column', 50, 50, 0.06 + c * 0.29, 0.2 + r * 0.55, (r + c) % 3 === 0)
        break
      case 'treasury':
        for (let i = 0; i < 4; i += 1) place(room, 'pedestal', 64, 64, 0.08 + i * 0.28, 0.12, i === 0)
        place(room, 'display', 100, 60, 0.15, 0.8)
        place(room, 'display', 100, 60, 0.85, 0.8)
        rug(room, 0.5, 0.55, 420, 200, 'gold')
        break
      case 'finale':
        // The climax: pedestals of gold around a huge carpet, statues guarding the corners.
        for (let i = 0; i < 5; i += 1) place(room, 'pedestal', 64, 64, 0.04 + i * 0.23, 0.1)
        place(room, 'statue', 56, 64, 0.12, 0.8)
        place(room, 'statue', 56, 64, 0.88, 0.8)
        rug(room, 0.5, 0.55, 760, 300, 'gold')
        paintings(room, 6)
        break
    }
    const tone = room.spec.light
    const color = tone === 'blue' ? 0x6ec8ff : tone === 'cool' ? 0xa0c8ff : tone === 'gold' ? 0xffd65a : tone === 'dim' ? 0x8a7a60 : 0xffc070
    const lx = room.inner.x + room.inner.w / 2 + (room.slot === 'full' || room.slot === 'C' ? 300 : 0)
    lamps.push({ x: lx, y: room.inner.y + room.inner.h / 2, color, alpha: tone === 'dim' ? 0.06 : 0.11 })
  }

  // ---- security cameras: the door column, side walls deeper in, and every safe ----
  for (let g = 1; g < BANDS; g += 1) {
    const floor = Math.floor(g / 5)
    const k = g % 5
    const n = spec.camsPerBand(floor, k)
    const top = bandTop(g) + WH + 16
    const sp = spec.camSpeed(floor)
    if (n >= 1) cams.push({ x: COL_X1 + 40, y: top, base: Math.PI * 0.6, sweep: 0.55 + Math.min(0.25, floor * 0.04), speed: sp })
    if (n >= 2) cams.push({ x: g % 2 ? T + 40 : W - T - 40, y: top, base: g % 2 ? Math.PI * 0.25 : Math.PI * 0.75, sweep: 0.5, speed: sp + 0.02 })
  }
  for (const s of safes) {
    const onLeft = s.x < 1500
    cams.push({ x: onLeft ? s.x + 150 : s.x - 150, y: s.y - 50, base: onLeft ? Math.PI * 0.85 : Math.PI * 0.15, sweep: 0.45, speed: 0.36 })
  }

  // ---- guards: patrols across the bands, avoiding locked side rooms ----
  const bandRooms = (g: number) => rooms.filter((r) => r.band === g)
  for (let g = 2; g < BANDS; g += 1) {
    const floor = Math.floor(g / 5)
    const k = g % 5
    const n = spec.guardsPerBand(floor, k)
    if (n <= 0) continue
    const mid = bandTop(g) + BAND / 2 + 14
    const open = bandRooms(g).filter((r) => !lockedRooms.has(r.i))
    if (open.length === 0) continue
    const xs = open.map((r) => Math.round(r.inner.x + r.inner.w / 2))
    // A full-width hall is walked end to end; a lone open room (its neighbours locked) is patrolled inside.
    const wide = open.length === 1 ? (open[0].slot === 'full' ? [500, 1500, 2500] : [xs[0] - 250, xs[0] + 250]) : xs
    const dy = 50 + Math.round(hash(g, 3, 11) * 60)
    const route = wide.map((x, i) => ({ x, y: mid + (i % 2 ? dy : -dy) }))
    guardRoutes.push(g % 2 ? route : [...route].reverse())
    if (n >= 2) {
      const back = wide.length >= 3 ? [wide[wide.length - 1], wide[1]] : [wide[0] + 120, wide[wide.length - 1] - 120]
      guardRoutes.push(back.map((x, i) => ({ x, y: mid + (i % 2 ? -dy / 2 : dy / 2) })))
    }
  }

  // ---- loot: MANSION's column spread, value rising with depth ----
  const blocked: Rect[] = [...solids, ...doors, ...valuables.map((v) => ({ x: v.x - 40, y: v.y - 40, w: 80, h: 80 })), ...lifts, ...panels.map((p) => ({ x: p.x - 30, y: p.y - 30, w: 60, h: 60 }))]
  const free = (x: number, y: number, pad: number) => !blocked.some((r) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad)
  const zoneOf = (x: number, y: number) => {
    for (let i = zones.length - 1; i >= 0; i -= 1) {
      const z = zones[i]
      if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z.i
    }
    return -1
  }
  const loot: LootDef[] = []
  for (const room of rooms) {
    const [c5, c10, c50, c100] = spec.loot(room.i, room.i / (zonesTotal - 1))
    const kinds: DuckCoinKind[] = [
      ...Array<DuckCoinKind>(c5).fill('C5'),
      ...Array<DuckCoinKind>(c10).fill('C10'),
      ...Array<DuckCoinKind>(c50).fill('C50'),
      ...Array<DuckCoinKind>(c100).fill('C100'),
    ]
    const seed = (room.i + 1) * 41 + spec.floors
    const order = kinds.map((kind, i) => ({ kind, r: hash(i, 7, seed) })).sort((a, b) => a.r - b.r)
    const R = room.inner
    const cols = Math.max(1, Math.round(R.w / 700))
    const colW = R.w / cols
    const buckets: { x: number; y: number; r: number }[][] = Array.from({ length: cols }, () => [])
    for (let x = R.x + 50; x < R.x + R.w - 50; x += 40) {
      for (let y = R.y + 40; y < R.y + R.h - 36; y += 40) {
        if (!free(x, y, 30) || zoneOf(x, y) !== room.i) continue
        if (room.i === 0 && Math.hypot(x - spawn.x, y - spawn.y) < 70) continue
        const c = Math.min(cols - 1, Math.floor((x - R.x) / colW))
        buckets[c].push({ x, y, r: hash(x, y, seed) })
      }
    }
    for (const b of buckets) b.sort((a, c) => a.r - c.r)
    const placed: Vec[] = []
    let n = 0
    order.forEach((o, k) => {
      let spot: Vec | null = null
      for (const gap of [96, 60, 40]) {
        for (let t = 0; t < cols && !spot; t += 1) {
          for (const cand of buckets[(k + t) % cols]) {
            if (placed.some((p) => Math.hypot(p.x - cand.x, p.y - cand.y) < gap)) continue
            spot = cand
            break
          }
        }
        if (spot) break
      }
      if (!spot) return
      placed.push(spot)
      loot.push({ id: `${P}-z${room.i}-${n}`, x: spot.x, y: spot.y, kind: o.kind, persistent: true })
      n += 1
    })
  }

  const level: LevelDef = {
    id: spec.id,
    w: W,
    h: H,
    spawn,
    exit,
    solids,
    doors,
    decor,
    foliage,
    hides,
    loot,
    safes,
    cams,
    guardRoutes,
    zones,
    labels,
    lamps,
    finalZone: zonesTotal - 1,
    background: spec.background,
    runner: spec.runner,
    doorFloor,
    ...(F.lifts ? { lifts } : {}),
    ...(escalators.length ? { escalators } : {}),
    ...(lasers.length ? { lasers, panels } : {}),
    ...(valuables.length ? { valuables } : {}),
    ...(Object.keys(passDoors).length ? { passDoors } : {}),
  }
  cache.set(spec.id, level)
  return level
}
