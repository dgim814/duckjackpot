import type Phaser from 'phaser'
import type { DecorDef, Rect, SolidDef } from '../level/LevelDef'

type G = Phaser.GameObjects.Graphics

const GOLD = 0xc9a227
const INK = 0x06050a

/** Bank vs mansion palettes: same shapes, different materials. */
export type Palette = {
  wallTop: number
  wallEdge: number
  wallFront: number
  wood: number
  woodTop: number
  metal: number
  metalTop: number
  fabric: number
  accent: number
}

export const BANK_PALETTE: Palette = {
  wallTop: 0x2c3546,
  wallEdge: 0x445068,
  wallFront: 0x141925,
  wood: 0x2a3444,
  woodTop: 0x3a4658,
  metal: 0x1c232e,
  metalTop: 0x2e3847,
  fabric: 0x1c2638,
  accent: GOLD,
}

export const MANSION_PALETTE: Palette = {
  wallTop: 0x3a281c,
  wallEdge: 0x5a3e2a,
  wallFront: 0x1e140e,
  wood: 0x4a2e1c,
  woodTop: 0x6a4428,
  metal: 0x2a2420,
  metalTop: 0x3a322c,
  fabric: 0x5a2c28,
  accent: 0xd4a24a,
}

function shadow(g: G, r: Rect, depth = 8, alpha = 0.34) {
  g.fillStyle(INK, alpha)
  g.fillRoundedRect(r.x + 2, r.y + 4, r.w, r.h + depth * 0.4, 4)
  g.fillStyle(INK, alpha * 0.55)
  g.fillRect(r.x + 3, r.y + r.h, r.w - 2, depth)
}

/** 3/4 view block: lighter top, darker front strip, thin highlight. */
function block(g: G, r: Rect, top: number, front: number, frontH: number, radius = 3) {
  const fh = Math.min(frontH, r.h * 0.5)
  g.fillStyle(front, 1)
  g.fillRoundedRect(r.x, r.y, r.w, r.h, radius)
  g.fillStyle(top, 1)
  g.fillRoundedRect(r.x, r.y, r.w, r.h - fh, radius)
  g.fillStyle(0xffffff, 0.06)
  g.fillRect(r.x + 2, r.y + 1, r.w - 4, 2)
}

export function paintWall(g: G, r: Rect, p: Palette) {
  g.fillStyle(INK, 0.42)
  g.fillRect(r.x, r.y + r.h, r.w, 12)
  g.fillStyle(INK, 0.2)
  g.fillRect(r.x, r.y + r.h + 12, r.w, 10)
  g.fillStyle(p.wallFront, 1)
  g.fillRect(r.x, r.y, r.w, r.h)
  const front = Math.min(12, r.h * 0.4)
  g.fillStyle(p.wallTop, 1)
  g.fillRect(r.x, r.y, r.w, r.h - front)
  g.fillStyle(p.wallEdge, 1)
  g.fillRect(r.x, r.y, r.w, 2)
  if (r.w > 60 && r.h < 60) {
    g.fillStyle(p.accent, 0.22)
    g.fillRect(r.x, r.y + r.h - front, r.w, 1.5)
  }
}

export function paintSolid(g: G, s: SolidDef, p: Palette) {
  if (s.kind === 'wall') {
    paintWall(g, s, p)
    return
  }
  const { x, y, w, h } = s
  const cx = x + w / 2
  const cy = y + h / 2
  switch (s.kind) {
    case 'column': {
      const r = Math.min(w, h) / 2
      g.fillStyle(INK, 0.4)
      g.fillEllipse(cx + 2, cy + 8, r * 2.2, r * 1.3)
      g.fillStyle(0x2e3644, 1)
      g.fillCircle(cx, cy, r)
      g.fillStyle(0x465164, 1)
      g.fillCircle(cx - r * 0.15, cy - r * 0.15, r * 0.72)
      g.fillStyle(0xffffff, 0.08)
      g.fillCircle(cx - r * 0.3, cy - r * 0.3, r * 0.3)
      g.lineStyle(3, p.accent, 0.85)
      g.strokeCircle(cx, cy, r - 1.5)
      return
    }
    case 'plant': {
      g.fillStyle(INK, 0.35)
      g.fillEllipse(cx, cy + h * 0.35, w * 1.2, h * 0.5)
      return
    }
    case 'chair': {
      const r = Math.min(w, h) / 2
      g.fillStyle(INK, 0.35)
      g.fillCircle(cx + 1, cy + 4, r)
      g.fillStyle(p.fabric, 1)
      g.fillCircle(cx, cy, r - 1)
      g.fillStyle(0xffffff, 0.05)
      g.fillCircle(cx - 3, cy - 3, r * 0.55)
      g.lineStyle(1.5, p.accent, 0.45)
      g.strokeCircle(cx, cy, r - 1)
      return
    }
    case 'lamp': {
      g.fillStyle(INK, 0.3)
      g.fillEllipse(cx, cy + h * 0.3, w * 1.1, h * 0.35)
      g.fillStyle(0x2a2418, 1)
      g.fillRect(cx - 2, y + 8, 4, h - 8)
      g.fillStyle(0xe8d49a, 1)
      g.fillCircle(cx, y + 8, w * 0.42)
      g.fillStyle(0xfff4c8, 0.9)
      g.fillCircle(cx, y + 7, w * 0.22)
      return
    }
    case 'atm': {
      shadow(g, s)
      block(g, s, 0x1e2632, 0x0e1218, 16, 6)
      g.fillStyle(0x0a1016, 1)
      g.fillRoundedRect(x + 7, y + 8, w - 14, h * 0.36, 3)
      g.fillStyle(0x6ec8ff, 0.85)
      g.fillRoundedRect(x + 9, y + 10, w - 18, h * 0.3, 2)
      g.fillStyle(p.accent, 0.8)
      g.fillRect(x + 12, y + h * 0.56, w - 24, 5)
      return
    }
    case 'counter':
    case 'desk': {
      shadow(g, s)
      block(g, s, p.woodTop, p.wood, 14, 4)
      g.lineStyle(1.5, p.accent, 0.55)
      g.strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, 4)
      if (s.kind === 'desk') {
        g.fillStyle(0x0c1016, 1)
        g.fillRect(x + w * 0.62, y + 6, w * 0.26, h * 0.3)
        g.fillStyle(0x6ec8ff, 0.55)
        g.fillRect(x + w * 0.64, y + 7, w * 0.22, h * 0.22)
        g.fillStyle(0xe8e0c8, 0.8)
        g.fillRect(x + w * 0.14, y + 8, w * 0.2, h * 0.24)
      } else {
        g.fillStyle(p.accent, 0.35)
        g.fillRect(x + 6, y + h * 0.3, w - 12, 2)
      }
      return
    }
    case 'cabinet':
    case 'shelf': {
      shadow(g, s, 10)
      block(g, s, p.metalTop, p.metal, 16, 3)
      const rows = Math.max(2, Math.floor(h / 30))
      for (let i = 1; i < rows; i += 1) {
        g.fillStyle(INK, 0.55)
        g.fillRect(x + 4, y + (i * h) / rows, w - 8, 2)
      }
      if (s.kind === 'shelf') {
        const r = rngFor(x, y)
        for (let i = 0; i < rows; i += 1) {
          for (let j = 0; j < 3; j += 1) {
            g.fillStyle([0x6a3a28, 0x3a5068, 0x8a7a3a, 0x3a6a4a][Math.floor(r() * 4)], 0.9)
            g.fillRect(x + 6 + j * ((w - 12) / 3), y + (i * h) / rows + 4, (w - 12) / 3 - 3, h / rows - 8)
          }
        }
      } else {
        g.fillStyle(p.accent, 0.7)
        for (let i = 0; i < rows; i += 1) g.fillRect(cx - 5, y + ((i + 0.5) * h) / rows - 1, 10, 2)
      }
      return
    }
    case 'bench': {
      shadow(g, s)
      block(g, s, 0x3a2c20, 0x1e160f, 10, 5)
      g.lineStyle(1, p.accent, 0.35)
      for (let xx = x + 16; xx < x + w - 8; xx += 24) g.lineBetween(xx, y + 4, xx, y + h - 10)
      return
    }
    case 'toilet': {
      shadow(g, s)
      g.fillStyle(0xd8e0e8, 1)
      g.fillRoundedRect(x + 4, y, w - 8, h * 0.38, 4)
      g.fillStyle(0xeef2f6, 1)
      g.fillEllipse(cx, y + h * 0.66, w * 0.8, h * 0.58)
      g.fillStyle(0x8aa0b4, 1)
      g.fillEllipse(cx, y + h * 0.68, w * 0.44, h * 0.3)
      return
    }
    case 'sofa': {
      shadow(g, s)
      block(g, s, p.fabric, 0x2e1614, 14, 10)
      g.fillStyle(0x000000, 0.18)
      g.fillRoundedRect(x + 8, y + 8, w * 0.42, h - 22, 6)
      g.fillRoundedRect(x + w * 0.5, y + 8, w * 0.42, h - 22, 6)
      return
    }
    case 'bed': {
      shadow(g, s)
      block(g, s, 0x3a2418, 0x1e120c, 10, 6)
      g.fillStyle(0xd8c8a4, 1)
      g.fillRoundedRect(x + 6, y + 6, w - 12, h * 0.6, 5)
      g.fillStyle(0xf0e6d0, 1)
      g.fillRoundedRect(x + 10, y + 10, w * 0.36, h * 0.2, 4)
      g.fillRoundedRect(x + w * 0.54, y + 10, w * 0.36, h * 0.2, 4)
      return
    }
    case 'stove': {
      shadow(g, s)
      block(g, s, 0x2a2622, 0x121010, 10, 3)
      g.fillStyle(0x0a0a0a, 1)
      g.fillCircle(cx - w * 0.2, cy - 4, 9)
      g.fillCircle(cx + w * 0.2, cy - 4, 9)
      g.lineStyle(1.5, 0xc45a3a, 0.6)
      g.strokeCircle(cx - w * 0.2, cy - 4, 6)
      g.strokeCircle(cx + w * 0.2, cy - 4, 6)
      return
    }
    case 'nightstand': {
      shadow(g, s)
      block(g, s, p.woodTop, p.wood, 8, 3)
      g.fillStyle(p.accent, 0.8)
      g.fillRect(cx - 4, cy, 8, 2)
      return
    }
    case 'piano': {
      shadow(g, s, 10)
      g.fillStyle(0x0a0a0c, 1)
      g.fillRoundedRect(x, y, w, h, { tl: 8, tr: 40, bl: 8, br: 8 })
      g.fillStyle(0x1c1c22, 1)
      g.fillRoundedRect(x + 6, y + 6, w - 12, h - 30, { tl: 6, tr: 34, bl: 4, br: 4 })
      g.fillStyle(0xf2efe6, 1)
      g.fillRect(x + 8, y + h - 22, w - 16, 12)
      g.fillStyle(0x0a0a0c, 1)
      for (let k = x + 14; k < x + w - 12; k += 9) g.fillRect(k, y + h - 22, 4, 7)
      g.lineStyle(1.5, p.accent, 0.7)
      g.strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, 8)
      return
    }
    case 'table': {
      shadow(g, s)
      block(g, s, 0x6a4428, 0x3a2414, 10, 6)
      g.fillStyle(0xf0e6d0, 0.85)
      g.fillRoundedRect(x + 8, y + 6, w - 16, h - 22, 4)
      g.fillStyle(p.accent, 0.9)
      for (let k = 0; k < 3; k += 1) g.fillCircle(x + ((k + 1) * w) / 4, y + h / 2 - 6, 4)
      return
    }
    case 'display': {
      shadow(g, s)
      block(g, s, 0x2a2420, 0x16120e, 12, 4)
      g.fillStyle(0x9ad8ff, 0.18)
      g.fillRect(x + 6, y + 5, w - 12, h - 22)
      g.lineStyle(1.5, 0xd8f0ff, 0.5)
      g.strokeRect(x + 6, y + 5, w - 12, h - 22)
      g.fillStyle(0xffd65a, 0.95)
      g.fillCircle(cx - 12, y + (h - 17) / 2, 5)
      g.fillStyle(0xe06a8a, 0.95)
      g.fillCircle(cx + 12, y + (h - 17) / 2, 4)
      return
    }
    case 'statue': {
      g.fillStyle(INK, 0.35)
      g.fillEllipse(cx + 2, y + h - 4, w * 1.1, 16)
      g.fillStyle(0x3a3430, 1)
      g.fillRect(x + 4, y + h - 16, w - 8, 16)
      g.fillStyle(0xc8c0b0, 1)
      g.fillEllipse(cx, y + h * 0.45, w * 0.55, h * 0.7)
      g.fillStyle(0xe8e2d4, 1)
      g.fillCircle(cx - 2, y + h * 0.18, w * 0.18)
      g.lineStyle(1.5, p.accent, 0.5)
      g.strokeRect(x + 4, y + h - 16, w - 8, 16)
      return
    }
    case 'pedestal': {
      shadow(g, s)
      block(g, s, 0xe8e2d4, 0x9a9486, 14, 4)
      g.fillStyle(0xffd65a, 1)
      g.fillRoundedRect(cx - 14, y + 8, 28, 16, 3)
      g.fillStyle(0xfff4c8, 0.9)
      g.fillRect(cx - 10, y + 10, 8, 4)
      g.lineStyle(1.5, p.accent, 0.8)
      g.strokeRect(x + 1, y + 1, w - 2, h - 2)
      return
    }
    case 'grille': {
      // Heavy vault bars: frame, vertical bars with a lit edge, cross rails.
      g.fillStyle(INK, 0.45)
      g.fillRect(x, y + h, w, 10)
      g.fillStyle(0x1a1c20, 1)
      g.fillRect(x, y, w, h)
      g.fillStyle(0x3a3e46, 1)
      g.fillRect(x, y, w, 5)
      g.fillRect(x, y + h - 5, w, 5)
      for (let bx = x + 10; bx < x + w - 6; bx += 22) {
        g.fillStyle(0x4a505a, 1)
        g.fillRect(bx, y - 150, 8, 150 + h)
        g.fillStyle(0x9aa4b4, 0.9)
        g.fillRect(bx + 1, y - 150, 2, 150 + h)
        g.fillStyle(0x0a0b0e, 0.8)
        g.fillRect(bx + 6, y - 150, 2, 150 + h)
      }
      g.fillStyle(0x5a606a, 1)
      g.fillRect(x, y - 150, w, 6)
      g.fillRect(x, y - 78, w, 5)
      g.lineStyle(2, 0xffd65a, 0.55)
      g.strokeRect(x + 1, y - 150, w - 2, 150 + h)
      return
    }
  }
}

function rngFor(x: number, y: number) {
  let s = (Math.floor(x) * 73856093) ^ (Math.floor(y) * 19349663)
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

const RUG: Record<string, [number, number]> = {
  lobby: [0x5a1c2a, 0x3a1018],
  office: [0x2a3a5a, 0x1a2640],
  cold: [0x1c3040, 0x10202c],
  vault: [0x2a2014, 0x1a140c],
  gold: [0x4a3212, 0x2e1e08],
}

export function paintDecor(g: G, d: DecorDef, mansion: boolean) {
  const { x, y, w, h } = d
  if (d.kind === 'rug' || d.kind === 'runner') {
    const [fill, border] = mansion ? [0x5a2420, 0x3a1410] : (RUG[d.tone ?? 'lobby'] ?? RUG.lobby)
    g.fillStyle(INK, 0.3)
    g.fillRoundedRect(x + 2, y + 3, w, h, 8)
    g.fillStyle(border, 1)
    g.fillRoundedRect(x, y, w, h, 8)
    g.fillStyle(fill, 1)
    g.fillRoundedRect(x + 10, y + 10, w - 20, h - 20, 6)
    g.lineStyle(2, GOLD, 0.5)
    g.strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, 6)
    g.lineStyle(1, GOLD, 0.25)
    g.strokeRoundedRect(x + 18, y + 18, w - 36, h - 36, 4)
    // central medallion
    g.lineStyle(1.5, GOLD, 0.3)
    g.strokeEllipse(x + w / 2, y + h / 2, Math.min(w, h) * 0.5, Math.min(w, h) * 0.34)
    g.fillStyle(GOLD, 0.12)
    g.fillEllipse(x + w / 2, y + h / 2, Math.min(w, h) * 0.3, Math.min(w, h) * 0.2)
    return
  }
  if (d.kind === 'stairs') {
    // Grand staircase going up: steps get lighter towards the landing.
    const steps = 9
    for (let i = 0; i < steps; i += 1) {
      const sy = y + (i * h) / steps
      const shade = 0x2a2018 + (steps - i) * 0x060504
      g.fillStyle(shade, 1)
      g.fillRect(x, sy, w, h / steps - 2)
      g.fillStyle(0xffe6b0, 0.12)
      g.fillRect(x, sy, w, 2)
    }
    g.fillStyle(0x7a1a24, 0.9)
    g.fillRect(x + w * 0.25, y, w * 0.5, h)
    g.lineStyle(3, GOLD, 0.8)
    g.lineBetween(x + 6, y, x + 6, y + h)
    g.lineBetween(x + w - 6, y, x + w - 6, y + h)
    return
  }
  if (d.kind === 'painting') {
    g.fillStyle(0x1a1410, 1)
    g.fillRect(x, y, w, h)
    const inner = [0x3a5068, 0x6a3a28, 0x2f6a3a][Math.abs(Math.floor(x + y)) % 3]
    g.fillStyle(inner, 1)
    g.fillRect(x + 5, y + 5, w - 10, h - 10)
    g.fillStyle(0xffe08a, 0.2)
    g.fillRect(x + 9, y + 9, w * 0.4, h * 0.3)
    g.lineStyle(3, GOLD, 0.9)
    g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3)
    return
  }
  // velvet rope
  g.fillStyle(GOLD, 1)
  g.fillCircle(x + 6, y + 8, 5)
  g.fillCircle(x + w - 6, y + 8, 5)
  g.lineStyle(3, 0x8a1a2a, 0.9)
  g.beginPath()
  g.moveTo(x + 6, y + 8)
  g.lineTo(x + w / 2, y + 14)
  g.lineTo(x + w - 6, y + 8)
  g.strokePath()
}

/** Hiding spots read as a darker, softly outlined patch you can step into. */
export function paintHide(g: G, r: Rect) {
  g.fillStyle(INK, 0.22)
  g.fillRoundedRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4, 8)
  g.lineStyle(1, 0x7ad08a, 0.18)
  g.strokeRoundedRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4, 8)
}

export function paintExit(g: G, r: Rect) {
  const cx = r.x + r.w / 2
  const cy = r.y + r.h / 2
  g.fillStyle(0x0a2016, 1)
  g.fillRoundedRect(r.x - 10, r.y - 10, r.w + 20, r.h + 20, 14)
  g.fillStyle(0x12402a, 1)
  g.fillRoundedRect(r.x, r.y, r.w, r.h, 10)
  g.lineStyle(3, 0x5ee08a, 0.9)
  g.strokeRoundedRect(r.x, r.y, r.w, r.h, 10)
  g.lineStyle(1.5, 0x5ee08a, 0.35)
  for (let i = 1; i < 4; i += 1) g.lineBetween(r.x + (r.w * i) / 4, r.y + 8, r.x + (r.w * i) / 4, r.y + r.h - 8)
  g.fillStyle(0x5ee08a, 0.25)
  g.fillTriangle(cx - 22, cy - 16, cx - 22, cy + 16, cx - 46, cy)
}

export function paintDoorFrame(g: G, r: Rect, p: Palette) {
  g.fillStyle(0x100c08, 1)
  g.fillRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12)
  g.fillStyle(p.accent, 0.6)
  if (r.w >= r.h) {
    g.fillRect(r.x - 10, r.y - 4, 8, r.h + 8)
    g.fillRect(r.x + r.w + 2, r.y - 4, 8, r.h + 8)
  } else {
    g.fillRect(r.x - 4, r.y - 10, r.w + 8, 8)
    g.fillRect(r.x - 4, r.y + r.h + 2, r.w + 8, 8)
  }
  g.fillStyle(0x0a0d12, 1)
  g.fillRect(r.x, r.y, r.w, r.h)
}
