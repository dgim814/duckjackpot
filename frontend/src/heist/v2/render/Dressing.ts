import type Phaser from 'phaser'
import type { FloorTheme, LevelDef, Rect, ZoneDef } from '../level/LevelDef'

type G = Phaser.GameObjects.Graphics

export type DressingItem = { r: Rect; paint: (g: G) => void }
export type Sconce = { x: number; y: number; color: number }

const GOLD = 0xc9a227

/** Runner colours per room type: the route between doors reads at a glance. */
const RUNNER: Partial<Record<FloorTheme, { base: number; edge: number; alpha: number }>> = {
  lobby: { base: 0x5a1824, edge: GOLD, alpha: 0.95 },
  marble: { base: 0x4a1a22, edge: GOLD, alpha: 0.9 },
  carpetBlue: { base: 0x1c2a4a, edge: 0x8aa8e0, alpha: 0.9 },
  carpetGreen: { base: 0x1a3a28, edge: 0x9ad0a8, alpha: 0.9 },
  wood: { base: 0x3a2014, edge: GOLD, alpha: 0.9 },
  gold: { base: 0x3a2808, edge: 0xffd65a, alpha: 0.95 },
}

function inColumn(z: ZoneDef, x0: number, x1: number) {
  return z.x <= x0 && z.x + z.w >= x1
}

/**
 * Visual-only set dressing, generated per room type. Nothing here collides;
 * it gives rooms identity and draws the path from door to door.
 */
export function buildDressing(level: LevelDef): { items: DressingItem[]; sconces: Sconce[] } {
  const items: DressingItem[] = []
  const sconces: Sconce[] = []
  if (level.id !== 'bank') return { items, sconces }

  const colX0 = 1330
  const colX1 = 1470
  for (const z of level.zones) {
    if (!inColumn(z, colX0, colX1) || z.h > 1100) continue
    const y0 = z.y + 34
    const y1 = z.y + z.h - 4
    const r: Rect = { x: colX0 + 10, y: y0, w: colX1 - colX0 - 20, h: y1 - y0 }
    const style = RUNNER[z.floor]
    if (style) {
      items.push({
        r,
        paint: (g) => {
          g.fillStyle(0x000000, 0.25)
          g.fillRect(r.x + 2, r.y + 3, r.w, r.h)
          g.fillStyle(style.base, style.alpha)
          g.fillRect(r.x, r.y, r.w, r.h)
          g.fillStyle(style.edge, 0.55)
          g.fillRect(r.x + 6, r.y, 2, r.h)
          g.fillRect(r.x + r.w - 8, r.y, 2, r.h)
          g.fillStyle(style.edge, 0.12)
          for (let yy = r.y + 30; yy < r.y + r.h - 20; yy += 60) g.fillRect(r.x + 16, yy, r.w - 32, 2)
        },
      })
    } else if (z.floor === 'server') {
      items.push({
        r,
        paint: (g) => {
          g.fillStyle(0x0a1018, 0.95)
          g.fillRect(r.x, r.y, r.w, r.h)
          for (let yy = r.y + 8; yy < r.y + r.h; yy += 22) {
            g.fillStyle(0x6ec8ff, 0.18 + ((yy / 22) % 3) * 0.08)
            g.fillRect(r.x + 8, yy, 4, 10)
            g.fillRect(r.x + r.w - 12, yy, 4, 10)
          }
          g.lineStyle(1, 0x6ec8ff, 0.35)
          g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1)
        },
      })
    } else if (z.floor === 'storage' || z.floor === 'concrete') {
      items.push({
        r,
        paint: (g) => {
          g.fillStyle(0x16171a, 0.9)
          g.fillRect(r.x, r.y, r.w, r.h)
          for (const x of [r.x, r.x + r.w - 10]) {
            for (let yy = r.y; yy < r.y + r.h; yy += 20) {
              g.fillStyle(((yy - r.y) / 20) % 2 === 0 ? 0xd8a820 : 0x141414, 0.85)
              g.fillRect(x, yy, 10, 20)
            }
          }
        },
      })
    } else if (z.floor === 'steel' || z.floor === 'tiles') {
      items.push({
        r,
        paint: (g) => {
          g.fillStyle(0x10161e, 0.85)
          g.fillRect(r.x, r.y, r.w, r.h)
          g.lineStyle(2, 0x3a8cff, 0.35)
          g.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8)
        },
      })
    } else if (z.floor === 'vault') {
      items.push({
        r,
        paint: (g) => {
          g.fillStyle(0x1a1408, 0.9)
          g.fillRect(r.x, r.y, r.w, r.h)
          g.lineStyle(2, 0xffd65a, 0.5)
          g.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8)
        },
      })
    }
  }

  // Sconces along the south face of each horizontal wall: warm pools of light every few metres.
  const tone: Record<string, number> = { warm: 0xffc070, cool: 0xa0c8ff, blue: 0x6ec8ff, gold: 0xffd65a, dim: 0x8a8070 }
  for (const s of level.solids) {
    if (s.kind !== 'wall' || s.h > 40 || s.w < 240 || s.y < 60 || s.y > level.h - 80) continue
    for (let x = s.x + 120; x < s.x + s.w - 80; x += 360) {
      const y = s.y + s.h + 2
      const zone = level.zones.find((z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h)
      const color = tone[zone?.light ?? 'warm']
      sconces.push({ x, y, color })
      const r: Rect = { x: x - 10, y: s.y + s.h - 6, w: 20, h: 14 }
      items.push({
        r,
        paint: (g) => {
          g.fillStyle(0x1a1410, 1)
          g.fillRect(x - 8, s.y + s.h - 4, 16, 6)
          g.fillStyle(color, 0.95)
          g.fillEllipse(x, s.y + s.h + 3, 14, 7)
          g.fillStyle(0xffffff, 0.8)
          g.fillEllipse(x, s.y + s.h + 3, 6, 3)
        },
      })
    }
  }
  return { items, sconces }
}
