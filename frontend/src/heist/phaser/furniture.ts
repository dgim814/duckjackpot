import type Phaser from 'phaser'

export type FurnKind =
  | 'desk'
  | 'cabinet'
  | 'column'
  | 'atm'
  | 'chair'
  | 'sofa'
  | 'bed'
  | 'plant'
  | 'stove'
  | 'counter'
  | 'shelf'
  | 'toilet'
  | 'nightstand'
  | 'bench'
  | 'lamp'

const BANK = {
  wood: 0x3a4554,
  woodDark: 0x243040,
  brass: 0xc9a227,
  marble: 0x8aa0b4,
  screen: 0x6ec8ff,
  seat: 0x1a2430,
}
const HOME = {
  wood: 0x5a3a24,
  woodDark: 0x2a1810,
  brass: 0xd4a24a,
  cloth: 0x6a3a32,
  plant: 0x2f6a3a,
  linen: 0xc8b48a,
}

/** Top-down furniture so BANK reads as a bank and MANSION as a house. */
export function paintFurniture(
  scene: Phaser.Scene,
  spec: { x: number; y: number; w: number; h: number; kind: FurnKind },
  theme: 'bank' | 'mansion',
) {
  const { x, y, w, h, kind } = spec
  const cx = x + w / 2
  const cy = y + h / 2
  const pal = theme === 'bank' ? BANK : HOME
  const g = scene.add.graphics().setDepth(5)

  if (kind === 'column') {
    const r = Math.min(w, h) / 2
    g.fillStyle(0x050308, 0.4)
    g.fillCircle(cx + 3, cy + 5, r)
    g.fillStyle(theme === 'bank' ? 0x9aa8b8 : 0x4a3424)
    g.fillCircle(cx, cy, r)
    g.lineStyle(2, pal.brass, 0.7)
    g.strokeCircle(cx, cy, r - 3)
    g.fillStyle(pal.brass, 0.35)
    g.fillCircle(cx, cy, 4)
    return
  }

  if (kind === 'atm') {
    g.fillStyle(0x050308, 0.45)
    g.fillRoundedRect(x + 4, y + 6, w, h, 6)
    g.fillStyle(0x121820)
    g.fillRoundedRect(x, y, w, h, 6)
    g.lineStyle(1.5, pal.brass, 0.65)
    g.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 5)
    g.fillStyle(0x0a1016)
    g.fillRoundedRect(x + 8, y + 10, w - 16, h * 0.38, 3)
    g.fillStyle(BANK.screen, 0.8)
    g.fillRoundedRect(x + 10, y + 12, w - 20, h * 0.32, 2)
    g.fillStyle(pal.brass, 0.7)
    g.fillRoundedRect(x + 12, y + h * 0.58, w - 24, 6, 2)
    return
  }

  if (kind === 'chair') {
    g.fillStyle(0x050308, 0.35)
    g.fillCircle(cx + 2, cy + 4, Math.min(w, h) / 2)
    g.fillStyle(BANK.seat)
    g.fillCircle(cx, cy, Math.min(w, h) / 2 - 2)
    g.lineStyle(1.5, pal.brass, 0.4)
    g.strokeCircle(cx, cy, Math.min(w, h) / 2 - 6)
    return
  }

  if (kind === 'sofa') {
    g.fillStyle(0x050308, 0.4)
    g.fillRoundedRect(x + 5, y + 8, w, h, 10)
    g.fillStyle(HOME.cloth)
    g.fillRoundedRect(x, y, w, h, 10)
    g.fillStyle(0x4a2824)
    g.fillRoundedRect(x + 8, y + 8, w * 0.42, h - 16, 6)
    g.fillRoundedRect(x + w * 0.5, y + 8, w * 0.42, h - 16, 6)
    g.lineStyle(1.5, pal.brass, 0.35)
    g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 8)
    return
  }

  if (kind === 'bed') {
    g.fillStyle(0x050308, 0.35)
    g.fillRoundedRect(x + 4, y + 6, w, h, 6)
    g.fillStyle(HOME.woodDark)
    g.fillRoundedRect(x, y, w, h, 6)
    g.fillStyle(HOME.linen)
    g.fillRoundedRect(x + 6, y + 6, w - 12, h * 0.55, 4)
    g.fillStyle(0xe8dcc4)
    g.fillRoundedRect(x + 8, y + h * 0.62, w - 16, h * 0.28, 5)
    g.lineStyle(1.5, pal.brass, 0.3)
    g.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 5)
    return
  }

  if (kind === 'plant') {
    g.fillStyle(0x050308, 0.3)
    g.fillCircle(cx + 2, cy + 4, Math.min(w, h) / 2)
    g.fillStyle(0x4a2a18)
    g.fillRoundedRect(cx - 8, cy + 4, 16, Math.max(10, h * 0.28), 3)
    g.fillStyle(HOME.plant)
    g.fillCircle(cx, cy - 4, Math.min(w, h) * 0.38)
    g.fillStyle(0x4a8a48, 0.8)
    g.fillCircle(cx - 6, cy - 8, 7)
    g.fillCircle(cx + 7, cy - 6, 6)
    return
  }

  if (kind === 'stove') {
    g.fillStyle(0x121010)
    g.fillRoundedRect(x, y, w, h, 4)
    g.fillStyle(0x2a2420)
    g.fillCircle(cx - w * 0.18, cy - 2, 10)
    g.fillCircle(cx + w * 0.18, cy - 2, 10)
    g.lineStyle(1.5, 0x6a6058, 0.8)
    g.strokeCircle(cx - w * 0.18, cy - 2, 10)
    g.strokeCircle(cx + w * 0.18, cy - 2, 10)
    g.fillStyle(0xc45a2a, 0.35)
    g.fillRoundedRect(x + 8, y + h - 16, w - 16, 8, 2)
    return
  }

  if (kind === 'counter') {
    g.fillStyle(0x050308, 0.4)
    g.fillRoundedRect(x + 4, y + 6, w, h, 4)
    g.fillStyle(theme === 'bank' ? BANK.wood : HOME.wood)
    g.fillRoundedRect(x, y, w, h, 4)
    g.fillStyle(theme === 'bank' ? 0x5a6a78 : 0x3a2418)
    g.fillRect(x + 6, y + 4, w - 12, 8)
    g.lineStyle(1.5, pal.brass, 0.45)
    g.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 3)
    return
  }

  if (kind === 'shelf') {
    g.fillStyle(0x050308, 0.35)
    g.fillRoundedRect(x + 4, y + 6, w, h, 3)
    g.fillStyle(theme === 'bank' ? 0x2a3848 : HOME.wood)
    g.fillRoundedRect(x, y, w, h, 3)
    g.lineStyle(1.25, pal.brass, 0.45)
    g.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 2)
    const rows = Math.max(2, Math.floor(h / 22))
    for (let i = 1; i < rows; i += 1) {
      const yy = y + (h / rows) * i
      g.lineStyle(1.5, pal.brass, 0.35)
      g.lineBetween(x + 6, yy, x + w - 6, yy)
      g.fillStyle(theme === 'bank' ? 0x6ec8ff : 0xc45a2a, 0.25)
      g.fillRect(x + 10, yy - 8, 10, 6)
    }
    return
  }

  if (kind === 'toilet') {
    g.fillStyle(0x050308, 0.3)
    g.fillRoundedRect(x + 3, y + 5, w, h, 8)
    g.fillStyle(0xd8d4cc)
    g.fillRoundedRect(x, y, w, h, 8)
    g.fillStyle(0x8aa0b0)
    g.fillCircle(cx, cy - 2, Math.min(w, h) * 0.28)
    g.fillStyle(0x4a5a66)
    g.fillCircle(cx, cy - 2, Math.min(w, h) * 0.14)
    return
  }

  if (kind === 'nightstand') {
    g.fillStyle(0x050308, 0.35)
    g.fillRoundedRect(x + 3, y + 5, w, h, 4)
    g.fillStyle(HOME.wood)
    g.fillRoundedRect(x, y, w, h, 4)
    g.lineStyle(1.25, pal.brass, 0.4)
    g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 3)
    g.fillStyle(pal.brass, 0.7)
    g.fillCircle(cx, cy, 2.4)
    g.fillStyle(0xffe08a, 0.35)
    g.fillCircle(cx, y - 6, 5)
    return
  }

  if (kind === 'bench') {
    g.fillStyle(0x050308, 0.35)
    g.fillRoundedRect(x + 4, y + 6, w, h, 6)
    g.fillStyle(theme === 'bank' ? 0x3a4554 : 0x6a3a32)
    g.fillRoundedRect(x, y, w, h, 6)
    g.fillStyle(theme === 'bank' ? 0x243040 : 0x4a2824)
    g.fillRoundedRect(x + 8, y + 6, w * 0.38, h - 12, 4)
    g.fillRoundedRect(x + w * 0.52, y + 6, w * 0.38, h - 12, 4)
    g.lineStyle(1.25, pal.brass, 0.35)
    g.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 5)
    return
  }

  if (kind === 'lamp') {
    g.fillStyle(0x050308, 0.25)
    g.fillCircle(cx + 2, cy + 4, 10)
    g.fillStyle(theme === 'bank' ? 0x243044 : 0x3a2418)
    g.fillRoundedRect(cx - 4, cy - 2, 8, Math.max(12, h * 0.4), 2)
    g.fillStyle(0xffe08a, 0.55)
    g.fillCircle(cx, cy - 8, 8)
    g.fillStyle(0xfff3c4, 0.35)
    g.fillCircle(cx, cy - 8, 14)
    return
  }

  if (kind === 'cabinet') {
    g.fillStyle(0x050308, 0.4)
    g.fillRoundedRect(x + 4, y + 6, w, h, 4)
    g.fillStyle(theme === 'bank' ? 0x243044 : HOME.woodDark)
    g.fillRoundedRect(x, y, w, h, 4)
    g.lineStyle(1.25, pal.brass, 0.5)
    g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 3)
    const rows = Math.max(1, Math.floor(h / 28))
    for (let i = 0; i < rows; i += 1) {
      const yy = y + 10 + i * (h / rows)
      g.lineStyle(1, 0x100c12, 0.65)
      g.strokeRoundedRect(x + 8, yy, w - 16, Math.max(12, h / rows - 10), 2)
      g.fillStyle(pal.brass, 0.7)
      g.fillCircle(cx + w * 0.28, yy + 8, 2)
    }
    return
  }

  // desk / teller
  g.fillStyle(0x050308, 0.4)
  g.fillRoundedRect(x + 5, y + 8, w, h, 4)
  g.fillStyle(theme === 'bank' ? BANK.wood : HOME.wood)
  g.fillRoundedRect(x, y, w, h, 4)
  g.fillStyle(theme === 'bank' ? 0x8aa0b0 : 0x3a2418)
  g.fillRect(x + 6, y + 3, w - 12, 7)
  g.lineStyle(1.5, pal.brass, 0.45)
  g.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 3)
  if (theme === 'bank') {
    g.fillStyle(0x101820)
    g.fillRoundedRect(cx + w * 0.12, y - 14, 28, 18, 3)
    g.fillStyle(BANK.screen, 0.75)
    g.fillRect(cx + w * 0.12 + 3, y - 11, 22, 12)
  } else {
    g.fillStyle(0x8ab4c8, 0.2)
    g.fillRect(x + 18, y - 16, w - 36, 16)
  }
}

export type DecorKind = 'rug' | 'painting' | 'rope'
export function paintDecor(
  scene: Phaser.Scene,
  spec: { x: number; y: number; w: number; h: number; kind: DecorKind },
  theme: 'bank' | 'mansion',
) {
  const { x, y, w, h, kind } = spec
  const g = scene.add.graphics().setDepth(1)
  if (kind === 'rug') {
    g.fillStyle(theme === 'bank' ? 0x1a3048 : 0x5a2420, 0.5)
    g.fillRoundedRect(x, y, w, h, 8)
    g.lineStyle(2, 0xc9a227, 0.28)
    g.strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, 6)
    g.lineStyle(1, 0xc9a227, 0.12)
    g.strokeRoundedRect(x + 14, y + 14, w - 28, h - 28, 4)
    return
  }
  if (kind === 'painting') {
    g.fillStyle(0x1a1410, 1)
    g.fillRect(x, y, w, h)
    const inner = theme === 'bank' ? [0x3a5068, 0xc9a227, 0x6a3a28] : [0x6a3a28, 0xc9a227, 0x2f6a3a]
    g.fillStyle(inner[(Math.abs(x + y) | 0) % inner.length], 1)
    g.fillRect(x + 4, y + 4, w - 8, h - 8)
    g.fillStyle(0xffe08a, 0.18)
    g.fillRect(x + 8, y + 8, w * 0.35, h * 0.25)
    g.lineStyle(2, 0xc9a227, 0.75)
    g.strokeRect(x + 1, y + 1, w - 2, h - 2)
    return
  }
  g.fillStyle(0xc9a227, 0.8)
  g.fillCircle(x + 6, y + 6, 5)
  g.fillCircle(x + w - 6, y + 6, 5)
  g.lineStyle(2, 0xc9a227, 0.55)
  g.lineBetween(x + 6, y + 6, x + w - 6, y + 6)
}
