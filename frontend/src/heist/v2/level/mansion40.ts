import type { MessageKey } from '../../../i18n/messages'
import type { DuckCoinKind } from '../../coinAssets'
import type {
  CamDef,
  DecorDef,
  DoorDef,
  FloorTheme,
  FurnitureKind,
  LampDef,
  LevelDef,
  LightTone,
  LootDef,
  NftVaultDef,
  Rect,
  SafeDef,
  SolidDef,
  Vec,
  ZoneDef,
} from './LevelDef'

/**
 * LEVEL 2 MANSION — 40 zones on 4 floors (10 each), one building.
 * The only EXIT is in the vestibule; the NFT vault sits at the very top,
 * so every big haul has to be carried all the way back down.
 *
 * Each floor is 5 bands (bottom → top): a full hall, 2 rooms, 3 rooms,
 * 3 rooms and a full stair hall. A central door column runs through every
 * band; side rooms open off it through doorways. Floors are joined by two
 * locked doors in a row (stair hall + landing).
 */
export const MANSION40_W = 3000
export const MANSION40_H = 9600
export const MANSION40_ZONES = 40
const T = 40
const WH = 28
const BAND = 480
const BANDS = 20
const COL_X0 = 1410
const COL_X1 = 1590
/** Keep the main route between doors free of furniture. */
const PATH: readonly [number, number] = [1300, 1700]
const SIDE_ARCH_W: readonly [number, number] = [190, 370]
const SIDE_ARCH_E: readonly [number, number] = [2630, 2810]
const SPLIT_BY_FLOOR = [1000, 1000, 1000, 2000]
const DOORWAY = 180

type RoomKit =
  | 'vestibule'
  | 'cloak'
  | 'drawing'
  | 'hall'
  | 'dining'
  | 'kitchen'
  | 'service'
  | 'study'
  | 'library'
  | 'stairs'
  | 'gallery'
  | 'music'
  | 'ballroom'
  | 'lounge'
  | 'conservatory'
  | 'office'
  | 'archive'
  | 'offices'
  | 'server'
  | 'safeRoom'
  | 'collection'
  | 'jewels'
  | 'clocks'
  | 'armoury'
  | 'undercroft'
  | 'secret'
  | 'vault'
  | 'gold'
  | 'security'
  | 'nftGallery'
  | 'nftVault'
  | 'treasure'

type RoomSpec = { key: MessageKey; kit: RoomKit; floor: FloorTheme; light: LightTone }

/** Zone 1..40 in order: band by band, west to east. */
const ROOMS: RoomSpec[] = [
  // floor 1 — entrance
  { key: 'heistMz1', kit: 'vestibule', floor: 'marbleWhite', light: 'warm' },
  { key: 'heistMz2', kit: 'cloak', floor: 'parquet', light: 'warm' },
  { key: 'heistMz3', kit: 'drawing', floor: 'carpetRed', light: 'warm' },
  { key: 'heistMz4', kit: 'hall', floor: 'marbleWhite', light: 'warm' },
  { key: 'heistMz5', kit: 'dining', floor: 'parquet', light: 'warm' },
  { key: 'heistMz6', kit: 'kitchen', floor: 'tiles', light: 'cool' },
  { key: 'heistMz7', kit: 'service', floor: 'mansionStone', light: 'dim' },
  { key: 'heistMz8', kit: 'study', floor: 'mansionWood', light: 'warm' },
  { key: 'heistMz9', kit: 'library', floor: 'mansionWood', light: 'warm' },
  { key: 'heistMz10', kit: 'stairs', floor: 'marbleWhite', light: 'warm' },
  // floor 2 — the rich rooms
  { key: 'heistMz11', kit: 'gallery', floor: 'parquet', light: 'warm' },
  { key: 'heistMz12', kit: 'music', floor: 'mansionWood', light: 'warm' },
  { key: 'heistMz13', kit: 'ballroom', floor: 'ballroom', light: 'gold' },
  { key: 'heistMz14', kit: 'lounge', floor: 'carpetRed', light: 'warm' },
  { key: 'heistMz15', kit: 'conservatory', floor: 'greenhouse', light: 'cool' },
  { key: 'heistMz16', kit: 'office', floor: 'mansionWood', light: 'warm' },
  { key: 'heistMz17', kit: 'archive', floor: 'parquet', light: 'dim' },
  { key: 'heistMz18', kit: 'offices', floor: 'carpetBlue', light: 'dim' },
  { key: 'heistMz19', kit: 'server', floor: 'server', light: 'blue' },
  { key: 'heistMz20', kit: 'safeRoom', floor: 'vault', light: 'gold' },
  // floor 3 — guarded collections
  { key: 'heistMz21', kit: 'collection', floor: 'marbleWhite', light: 'gold' },
  { key: 'heistMz22', kit: 'jewels', floor: 'carpetRed', light: 'gold' },
  { key: 'heistMz23', kit: 'clocks', floor: 'mansionWood', light: 'warm' },
  { key: 'heistMz24', kit: 'gallery', floor: 'parquet', light: 'dim' },
  { key: 'heistMz25', kit: 'armoury', floor: 'mansionStone', light: 'cool' },
  { key: 'heistMz26', kit: 'undercroft', floor: 'concrete', light: 'dim' },
  { key: 'heistMz27', kit: 'archive', floor: 'parquet', light: 'dim' },
  { key: 'heistMz28', kit: 'safeRoom', floor: 'vault', light: 'gold' },
  { key: 'heistMz29', kit: 'secret', floor: 'mansionStone', light: 'dim' },
  { key: 'heistMz30', kit: 'vault', floor: 'vault', light: 'gold' },
  // floor 4 — treasury
  { key: 'heistMz31', kit: 'gold', floor: 'gold', light: 'gold' },
  { key: 'heistMz32', kit: 'gold', floor: 'gold', light: 'gold' },
  { key: 'heistMz33', kit: 'safeRoom', floor: 'vault', light: 'gold' },
  { key: 'heistMz34', kit: 'security', floor: 'steel', light: 'blue' },
  { key: 'heistMz35', kit: 'gallery', floor: 'carpetRed', light: 'dim' },
  { key: 'heistMz36', kit: 'collection', floor: 'marbleWhite', light: 'gold' },
  { key: 'heistMz37', kit: 'nftGallery', floor: 'ballroom', light: 'blue' },
  { key: 'heistMz38', kit: 'security', floor: 'steel', light: 'blue' },
  { key: 'heistMz39', kit: 'nftVault', floor: 'vault', light: 'blue' },
  { key: 'heistMz40', kit: 'treasure', floor: 'gold', light: 'gold' },
]

/** Loot per zone [C5, C10, C50, C100]: pocket change at the door, fortunes at the top. */
const LOOT_MIX: readonly (readonly [number, number, number, number])[] = [
  [8, 2, 0, 0], [5, 3, 0, 0], [8, 4, 1, 0], [6, 3, 0, 0], [7, 4, 1, 0],
  [6, 4, 1, 0], [5, 3, 1, 0], [6, 4, 1, 1], [6, 5, 1, 0], [6, 4, 2, 0],
  [8, 6, 2, 0], [5, 4, 2, 0], [8, 6, 2, 1], [6, 5, 2, 1], [6, 5, 2, 1],
  [5, 4, 2, 1], [6, 5, 2, 1], [6, 5, 3, 1], [6, 5, 3, 1], [8, 6, 3, 2],
  [6, 6, 3, 2], [4, 4, 3, 2], [6, 6, 3, 2], [5, 5, 3, 2], [6, 6, 4, 2],
  [5, 5, 3, 2], [5, 5, 3, 2], [6, 6, 4, 3], [4, 4, 3, 2], [6, 6, 4, 3],
  [6, 6, 4, 3], [6, 6, 5, 4], [4, 4, 4, 3], [5, 5, 4, 3], [5, 5, 4, 4],
  [5, 5, 4, 4], [5, 5, 5, 4], [5, 5, 5, 4], [4, 4, 4, 4], [6, 6, 6, 6],
]

/** Safes by zone number: few and small downstairs, the big ones near the top. */
const SAFES: { zone: number; reward: number; extra: DuckCoinKind }[] = [
  { zone: 8, reward: 100, extra: 'C50' },
  { zone: 16, reward: 150, extra: 'C50' },
  { zone: 20, reward: 200, extra: 'C100' },
  { zone: 22, reward: 250, extra: 'C100' },
  { zone: 28, reward: 300, extra: 'C100' },
  { zone: 30, reward: 250, extra: 'C100' },
  { zone: 31, reward: 350, extra: 'C100' },
  { zone: 33, reward: 500, extra: 'C100' },
  { zone: 36, reward: 350, extra: 'C100' },
]

type Room = { i: number; spec: RoomSpec; r: Rect; inner: Rect; band: number; slot: 'full' | 'W' | 'C' | 'E' }

function bandTop(g: number) {
  return MANSION40_H - (g + 1) * BAND
}

function rectsHit(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function hash(x: number, y: number, seed: number) {
  let h = (Math.floor(x) * 73856093) ^ (Math.floor(y) * 19349663) ^ (seed * 83492791)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff
}

/** Which dividers get side archways: extra routes on the upper floors. */
function hasSideArches(g: number) {
  const k = g % 5
  const floor = Math.floor(g / 5)
  if (floor === 0) return false
  if (floor === 1) return k === 2
  return k === 1 || k === 2 || k === 3
}

/** Band of the NFT vault (zone 39, east room). Its bars must not be walkable round. */
const VAULT_BAND = 18

/** Top of the doorway in a vertical split. The vault's is kept low, in front of the bars. */
function doorwayTop(g: number, splitIndex: number, innerTop: number, innerBot: number) {
  if (g === VAULT_BAND && splitIndex === 2) return innerBot - DOORWAY - 16
  return Math.floor((innerTop + innerBot) / 2) - DOORWAY / 2
}

let cache: LevelDef | null = null

export function mansion40(): LevelDef {
  if (cache) return cache
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

  const W = MANSION40_W
  const H = MANSION40_H
  solids.push(
    { x: 0, y: 0, w: W, h: T, kind: 'wall' },
    { x: 0, y: H - T, w: W, h: T, kind: 'wall' },
    { x: 0, y: 0, w: T, h: H, kind: 'wall' },
    { x: W - T, y: 0, w: T, h: H, kind: 'wall' },
  )
  keepClear.push({ x: PATH[0], y: 0, w: PATH[1] - PATH[0], h: H })

  // ---- horizontal dividers (between band g and g+1) ----
  const lockedCenter = new Map<number, string>([
    [3, 'mStair1'],
    [4, 'mLanding1'],
    [6, 'mBallroom'],
    [8, 'mStair2'],
    [9, 'mLanding2'],
    [11, 'mArmoury'],
    [13, 'mStair3'],
    [14, 'mLanding3'],
    [16, 'mGoldRoom'],
    [17, 'mNftApproach'],
    [18, 'mTreasure'],
  ])
  for (let g = 0; g < BANDS - 1; g += 1) {
    const y = bandTop(g)
    const gaps: [number, number][] = [[COL_X0, COL_X1]]
    if (hasSideArches(g)) {
      gaps.push([SIDE_ARCH_W[0], SIDE_ARCH_W[1]])
      // No east arch over the vault: the only way in is the locked door, in front of the bars.
      if (g !== VAULT_BAND) gaps.push([SIDE_ARCH_E[0], SIDE_ARCH_E[1]])
    }
    gaps.sort((a, b) => a[0] - b[0])
    let x = T
    for (const [a, b] of gaps) {
      if (a > x) solids.push({ x, y, w: a - x, h: WH, kind: 'wall' })
      x = b
      keepClear.push({ x: a - 20, y: y - 110, w: b - a + 40, h: WH + 220 })
    }
    if (x < W - T) solids.push({ x, y, w: W - T - x, h: WH, kind: 'wall' })
    const id = lockedCenter.get(g)
    if (id) doors.push({ id, x: COL_X0, y, w: COL_X1 - COL_X0, h: WH })
  }

  // ---- bands → rooms ----
  let zi = 0
  for (let g = 0; g < BANDS; g += 1) {
    const floor = Math.floor(g / 5)
    const k = g % 5
    const top = bandTop(g)
    const innerTop = g === BANDS - 1 ? T : top + WH
    const innerBot = g === 0 ? H - T : top + BAND
    const split = SPLIT_BY_FLOOR[floor]
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
      const spec = ROOMS[zi]
      const x0 = xs[s]
      const x1 = xs[s + 1]
      const r: Rect = { x: s === 0 ? 0 : x0, y: top, w: (s === slots.length - 1 ? W : x1) - (s === 0 ? 0 : x0), h: BAND }
      const inner: Rect = { x: x0 + (s === 0 ? 0 : WH / 2), y: innerTop, w: x1 - x0 - (s === 0 ? 0 : WH / 2) - (s === slots.length - 1 ? 0 : WH / 2), h: innerBot - innerTop }
      rooms.push({ i: zi, spec, r, inner, band: g, slot: slots[s] })
      zones.push({ i: zi, id: `m${zi + 1}`, key: spec.key, x: r.x, y: r.y, w: r.w, h: r.h, floor: spec.floor, light: spec.light })
      // Rooms crossed by the door column get their name beside the route, not on it.
      const onRoute = inner.x < COL_X0 && inner.x + inner.w > COL_X1
      // The vault draws its own title in front of the bars.
      if (spec.kit !== 'nftVault') labels.push({ x: inner.x + inner.w / 2 + (onRoute ? 330 : 0), y: inner.y + 60, key: spec.key })
      zi += 1
    }
    // vertical splits with a doorway in the middle; some are locked doors
    for (let s = 1; s < xs.length - 1; s += 1) {
      const x = xs[s] - WH / 2
      const gapTop = doorwayTop(g, s, innerTop, innerBot)
      solids.push({ x, y: innerTop, w: WH, h: gapTop - innerTop, kind: 'wall' })
      solids.push({ x, y: gapTop + DOORWAY, w: WH, h: innerBot - gapTop - DOORWAY, kind: 'wall' })
      keepClear.push({ x: x - 150, y: gapTop - 30, w: WH + 300, h: DOORWAY + 60 })
    }
  }

  // Side rooms that hide a safe or the NFT vault are behind locked doors.
  const lockedSide: Record<number, string> = { 8: 'mStudy', 16: 'mOwner', 22: 'mJewels', 33: 'mMasterSafe', 39: 'mNftVault' }
  for (const room of rooms) {
    const id = lockedSide[room.i + 1]
    if (!id || room.slot === 'C' || room.slot === 'full') continue
    const g = room.band
    const floor = Math.floor(g / 5)
    const top = bandTop(g)
    const innerTop = top + WH
    const innerBot = top + BAND
    const k = g % 5
    const splitX = k === 1 ? SPLIT_BY_FLOOR[floor] : room.slot === 'W' ? 1000 : 2000
    const splitIndex = k === 1 ? 1 : room.slot === 'W' ? 1 : 2
    doors.push({ id, x: splitX - WH / 2, y: doorwayTop(g, splitIndex, innerTop, innerBot), w: WH, h: DOORWAY })
  }

  // ---- spawn, exit ----
  const spawn: Vec = { x: 1500, y: H - T - 120 }
  const exit: Rect = { x: 150, y: H - T - 150, w: 170, h: 96 }
  keepClear.push({ x: spawn.x - 180, y: spawn.y - 160, w: 360, h: 240 }, { x: exit.x - 60, y: exit.y - 80, w: exit.w + 120, h: exit.h + 120 })

  // ---- NFT vault (zone 39): grille across the room, cards behind it ----
  const vaultRoom = rooms[38]
  const vIn = vaultRoom.inner
  const grille: Rect = { x: vIn.x, y: vIn.y + 190, w: vIn.w, h: 22 }
  const nftVault: NftVaultDef = {
    grille,
    view: { x: vIn.x + 60, y: grille.y + grille.h, w: vIn.w - 120, h: 110 },
    cards: [
      { raffle: 'fast100', x: vIn.x + vIn.w * 0.22, y: vIn.y + 95 },
      { raffle: 'classic', x: vIn.x + vIn.w * 0.5, y: vIn.y + 88 },
      { raffle: 'fast200', x: vIn.x + vIn.w * 0.78, y: vIn.y + 95 },
    ],
  }
  solids.push({ ...grille, kind: 'grille' })
  // The vault interior behind the bars: unreachable, nothing spawns there.
  const vaultInterior: Rect = { x: vIn.x, y: vIn.y, w: vIn.w, h: 190 }
  keepClear.push({ ...nftVault.view, y: nftVault.view.y - 10, h: nftVault.view.h + 40 })

  // ---- furniture kits ----
  const place = (room: Room, kind: FurnitureKind, w: number, h: number, fx: number, fy: number, hide = false) => {
    const R = room.inner
    const pad = 36
    const x = Math.round(R.x + pad + fx * Math.max(0, R.w - w - pad * 2))
    const y = Math.round(R.y + 30 + fy * Math.max(0, R.h - h - 60))
    const f: Rect = { x, y, w, h }
    if (keepClear.some((c) => rectsHit(c, f))) return
    if (solids.some((s) => s.kind !== 'wall' && rectsHit({ x: s.x - 24, y: s.y - 24, w: s.w + 48, h: s.h + 48 }, f))) return
    if (room.i === 38 && rectsHit(f, { x: vaultInterior.x, y: vaultInterior.y, w: vaultInterior.w, h: vaultInterior.h + 60 })) return
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
      case 'vestibule':
        place(room, 'column', 52, 52, 0.3, 0.2)
        place(room, 'column', 52, 52, 0.7, 0.2)
        place(room, 'counter', 200, 50, 0.85, 0.55, true)
        place(room, 'bench', 170, 42, 0.12, 0.2)
        plant(room, 0.02, 0.15, true)
        plant(room, 0.98, 0.15, true)
        rug(room, 0.5, 0.45, 520, 260, 'lobby')
        paintings(room, 6)
        break
      case 'cloak':
        place(room, 'cabinet', 80, 130, 0.05, 0.1, true)
        place(room, 'cabinet', 80, 130, 0.35, 0.1)
        place(room, 'bench', 150, 40, 0.5, 0.85)
        plant(room, 0.9, 0.1)
        break
      case 'drawing':
        place(room, 'sofa', 180, 70, 0.08, 0.2, true)
        place(room, 'sofa', 180, 70, 0.92, 0.2, true)
        place(room, 'table', 120, 60, 0.9, 0.7)
        place(room, 'chair', 36, 34, 0.12, 0.8)
        place(room, 'lamp', 28, 40, 0.02, 0.9)
        rug(room, 0.12, 0.5, 360, 220, 'lobby')
        paintings(room, 5)
        break
      case 'hall':
        place(room, 'column', 50, 50, 0.3, 0.3)
        place(room, 'statue', 50, 50, 0.7, 0.3)
        plant(room, 0.05, 0.8)
        paintings(room, 3)
        break
      case 'dining':
        place(room, 'table', 260, 80, 0.1, 0.45, true)
        place(room, 'table', 260, 80, 0.9, 0.45, true)
        place(room, 'cabinet', 90, 60, 0.05, 0.05)
        place(room, 'cabinet', 90, 60, 0.95, 0.05)
        paintings(room, 3)
        break
      case 'kitchen':
        place(room, 'stove', 120, 60, 0.15, 0.05)
        place(room, 'counter', 180, 50, 0.6, 0.05)
        place(room, 'counter', 180, 50, 0.4, 0.7, true)
        place(room, 'cabinet', 80, 100, 0.95, 0.6)
        break
      case 'service':
        place(room, 'shelf', 80, 140, 0.05, 0.1, true)
        place(room, 'shelf', 80, 140, 0.95, 0.5)
        place(room, 'cabinet', 70, 90, 0.5, 0.05)
        break
      case 'study':
        place(room, 'desk', 180, 56, 0.2, 0.55, true)
        place(room, 'chair', 36, 34, 0.25, 0.85)
        place(room, 'shelf', 80, 140, 0.95, 0.1)
        rug(room, 0.2, 0.6, 280, 160, 'office')
        break
      case 'library':
        for (let i = 0; i < 4; i += 1) place(room, 'shelf', 70, 150, 0.08 + i * 0.28, 0.05, i % 2 === 0)
        place(room, 'sofa', 160, 64, 0.5, 0.85)
        place(room, 'lamp', 28, 40, 0.95, 0.85)
        rug(room, 0.5, 0.8, 300, 150, 'office')
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
      case 'gallery':
        paintings(room, 8)
        place(room, 'bench', 160, 40, 0.15, 0.5, true)
        place(room, 'bench', 160, 40, 0.85, 0.5, true)
        place(room, 'statue', 50, 50, 0.4, 0.2)
        decor.push({ x: room.inner.x + 80, y: room.inner.y + 40, w: 180, h: 18, kind: 'rope' })
        plant(room, 0.02, 0.9)
        break
      case 'music':
        place(room, 'piano', 150, 100, 0.2, 0.3, true)
        place(room, 'chair', 36, 34, 0.7, 0.3)
        place(room, 'chair', 36, 34, 0.7, 0.7)
        rug(room, 0.3, 0.5, 300, 200, 'lobby')
        break
      case 'ballroom':
        for (let i = 0; i < 4; i += 1) place(room, 'column', 52, 52, 0.08 + i * 0.3, 0.12)
        for (let i = 0; i < 4; i += 1) place(room, 'column', 52, 52, 0.08 + i * 0.3, 0.88)
        place(room, 'piano', 150, 100, 0.9, 0.5, true)
        plant(room, 0.02, 0.5, true)
        break
      case 'lounge':
        place(room, 'sofa', 180, 70, 0.1, 0.2, true)
        place(room, 'sofa', 180, 70, 0.1, 0.8, true)
        place(room, 'counter', 160, 50, 0.9, 0.3)
        place(room, 'table', 90, 60, 0.6, 0.5)
        rug(room, 0.2, 0.5, 280, 200, 'lobby')
        break
      case 'conservatory':
        for (let i = 0; i < 5; i += 1) plant(room, 0.05 + i * 0.22, i % 2 ? 0.15 : 0.75, true)
        for (let i = 0; i < 4; i += 1) plant(room, 0.15 + i * 0.22, i % 2 ? 0.75 : 0.15)
        break
      case 'office':
        place(room, 'desk', 180, 56, 0.4, 0.5, true)
        place(room, 'chair', 36, 34, 0.45, 0.85)
        place(room, 'shelf', 80, 140, 0.05, 0.05)
        rug(room, 0.4, 0.55, 260, 160, 'office')
        break
      case 'archive':
        for (let i = 0; i < 4; i += 1) place(room, 'shelf', 70, 140, 0.05 + i * 0.3, i % 2 ? 0.6 : 0.05, i === 1)
        break
      case 'offices':
        place(room, 'desk', 160, 50, 0.1, 0.2, true)
        place(room, 'desk', 160, 50, 0.9, 0.2, true)
        place(room, 'desk', 160, 50, 0.1, 0.8)
        place(room, 'desk', 160, 50, 0.9, 0.8)
        break
      case 'server':
        for (let i = 0; i < 5; i += 1) place(room, 'cabinet', 70, 150, 0.05 + i * 0.22, i % 2 ? 0.75 : 0.05, i === 2)
        break
      case 'safeRoom':
        place(room, 'display', 90, 60, 0.1, 0.8)
        place(room, 'display', 90, 60, 0.9, 0.8)
        place(room, 'shelf', 70, 130, 0.02, 0.05, true)
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
        break
      case 'clocks':
        for (let i = 0; i < 3; i += 1) place(room, 'statue', 44, 70, 0.08 + i * 0.35, 0.05)
        place(room, 'display', 90, 60, 0.9, 0.7, true)
        rug(room, 0.15, 0.55, 260, 160, 'office')
        break
      case 'armoury':
        for (let i = 0; i < 3; i += 1) place(room, 'statue', 50, 60, 0.1 + i * 0.4, 0.08)
        place(room, 'display', 100, 60, 0.15, 0.8, true)
        place(room, 'display', 100, 60, 0.85, 0.8)
        break
      case 'undercroft':
        place(room, 'shelf', 70, 130, 0.05, 0.1, true)
        place(room, 'shelf', 70, 130, 0.95, 0.5)
        place(room, 'column', 50, 50, 0.5, 0.2)
        break
      case 'secret':
        place(room, 'statue', 44, 60, 0.1, 0.5, true)
        place(room, 'shelf', 70, 130, 0.9, 0.1)
        break
      case 'vault':
        place(room, 'pedestal', 60, 60, 0.1, 0.3)
        place(room, 'pedestal', 60, 60, 0.9, 0.3)
        place(room, 'column', 52, 52, 0.25, 0.8)
        place(room, 'column', 52, 52, 0.75, 0.8)
        break
      case 'gold':
        for (let i = 0; i < 3; i += 1) place(room, 'pedestal', 60, 60, 0.08 + i * 0.4, 0.15, i === 0)
        place(room, 'display', 100, 60, 0.9, 0.8)
        break
      case 'security':
        place(room, 'desk', 180, 56, 0.1, 0.1, true)
        place(room, 'cabinet', 70, 110, 0.95, 0.1)
        place(room, 'cabinet', 70, 110, 0.05, 0.75)
        break
      case 'nftGallery':
        for (let i = 0; i < 3; i += 1) place(room, 'pedestal', 60, 60, 0.1 + i * 0.4, 0.2, i === 1)
        paintings(room, 3)
        break
      case 'nftVault':
        break
      case 'treasure':
        for (let i = 0; i < 4; i += 1) place(room, 'pedestal', 64, 64, 0.08 + i * 0.28, 0.1)
        place(room, 'statue', 50, 60, 0.15, 0.8)
        place(room, 'statue', 50, 60, 0.85, 0.8)
        rug(room, 0.5, 0.55, 640, 300, 'gold')
        break
    }
    // Warm light for every room, brighter in treasure rooms.
    const tone = room.spec.light
    const color = tone === 'blue' ? 0x6ec8ff : tone === 'cool' ? 0xa0c8ff : tone === 'gold' ? 0xffd65a : tone === 'dim' ? 0x8a7a60 : 0xffc070
    const lx = room.inner.x + room.inner.w / 2 + (room.slot === 'full' || room.slot === 'C' ? 300 : 0)
    lamps.push({ x: lx, y: room.inner.y + room.inner.h / 2, color, alpha: tone === 'dim' ? 0.06 : 0.11 })
  }

  // ---- safes ----
  for (const s of SAFES) {
    const room = rooms[s.zone - 1]
    const R = room.inner
    const onPath = R.x < PATH[1] && R.x + R.w > PATH[0]
    const x = onPath ? (R.x + R.w / 2 < 1500 ? R.x + 180 : R.x + R.w - 180) : R.x + R.w / 2
    const y = R.y + 90
    safes.push({
      id: `mSafe${s.zone}`,
      x,
      y,
      reward: s.reward,
      extra: { id: `m40-safe-${s.zone}`, x: x + (x < 1500 ? 150 : -150), y: y + 110, kind: s.extra },
    })
    keepClear.push({ x: x - 90, y: y - 70, w: 180, h: 260 })
  }

  // ---- security cameras: door column first, side rooms deeper in ----
  const camAt = (x: number, y: number, base: number, sweep: number, speed: number) => cams.push({ x, y, base, sweep, speed })
  const camBands: Record<number, number[]> = {
    0: [1, 3],
    1: [5, 6, 8, 9],
    2: [10, 11, 12, 13, 14],
    3: [15, 16, 17, 18],
  }
  for (const [floorS, bands] of Object.entries(camBands)) {
    const floor = Number(floorS)
    for (const g of bands) {
      const top = bandTop(g) + WH + 16
      camAt(COL_X1 + 40, top, Math.PI * 0.6, 0.55 + floor * 0.05, 0.4 + floor * 0.03)
      if (floor >= 2 && g % 2 === 0) camAt(T + 40, top, Math.PI * 0.25, 0.5, 0.42)
      if (floor >= 3) camAt(W - T - 40, top, Math.PI * 0.75, 0.5, 0.44)
    }
  }

  // ---- guards: patrols across the bands, more of them higher up ----
  const route = (g: number, xs: number[], dy = 0) => {
    const top = bandTop(g)
    const mid = top + BAND / 2 + 14
    return xs.map((x, i) => ({ x, y: mid + (i % 2 ? dy : -dy) }))
  }
  const guardBands: [number, number[], number][] = [
    [2, [500, 1500, 2500], 60],
    [3, [2500, 1500, 500], 50],
    [4, [700, 1500, 2300], 80],
    [5, [400, 1500, 2600], 90],
    [6, [2400, 1500], 60],
    [7, [500, 1500, 2500], 70],
    [8, [2500, 1500, 500], 60],
    [9, [800, 2200], 90],
    [10, [400, 1500, 2600], 80],
    [11, [600, 1500, 2400], 60],
    [12, [2500, 1500, 500], 70],
    [13, [500, 1500, 2500], 50],
    [13, [2600, 1600], 40],
    [14, [600, 2400], 100],
    [15, [400, 1500, 2600], 100],
    [16, [700, 1500], 60],
    [17, [500, 1500, 2500], 60],
    [17, [2500, 1500], 40],
    [18, [500, 1600], 60],
    [19, [500, 1500, 2500], 110],
  ]
  for (const [g, xs, dy] of guardBands) guardRoutes.push(route(g, xs, dy))

  // ---- loot: same screen-column spread as BANK ----
  const blocked: Rect[] = [...solids, ...doors, vaultInterior]
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
    const [c5, c10, c50, c100] = LOOT_MIX[room.i]
    const kinds: DuckCoinKind[] = [
      ...Array<DuckCoinKind>(c5).fill('C5'),
      ...Array<DuckCoinKind>(c10).fill('C10'),
      ...Array<DuckCoinKind>(c50).fill('C50'),
      ...Array<DuckCoinKind>(c100).fill('C100'),
    ]
    const seed = (room.i + 1) * 37
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
      loot.push({ id: `m40-z${room.i}-${n}`, x: spot.x, y: spot.y, kind: o.kind, persistent: true })
      n += 1
    })
  }

  cache = {
    id: 'mansion',
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
    finalZone: MANSION40_ZONES - 1,
    background: 0x140e0c,
    nftVault,
  }
  return cache
}
