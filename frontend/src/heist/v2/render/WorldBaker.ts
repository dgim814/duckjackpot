import type Phaser from 'phaser'
import type { LevelDef, Rect } from '../level/LevelDef'
import { buildDressing } from './Dressing'
import { BANK_PALETTE, MANSION_PALETTE, paintDecor, paintDoorFrame, paintExit, paintHide, paintSolid } from './Painter'

const CHUNK = 512
const MARGIN = 32
const MAX_BAKES_PER_FRAME = 2
const KEEP = 30

type Painter = (g: Phaser.GameObjects.Graphics) => void
type Item = { r: Rect; order: number; paint: Painter }
type Chunk = { rt: Phaser.GameObjects.RenderTexture; lastSeen: number }

function intersects(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/**
 * Static geometry (rugs, hide mats, exit pad, walls, furniture) is painted once
 * into 512px chunk textures that are baked lazily near the camera and released
 * when far away. A frame draws a handful of images instead of thousands of shapes.
 */
export class WorldBaker {
  private cols: number
  private rows: number
  private buckets: Item[][]
  private chunks = new Map<number, Chunk>()
  private frame = 0
  private gfx: Phaser.GameObjects.Graphics

  constructor(
    private scene: Phaser.Scene,
    level: LevelDef,
    private depth: number,
  ) {
    this.cols = Math.ceil(level.w / CHUNK)
    this.rows = Math.ceil(level.h / CHUNK)
    this.buckets = Array.from({ length: this.cols * this.rows }, () => [])
    this.gfx = scene.make.graphics({}, false)
    const mansion = level.id === 'mansion'
    const pal = mansion ? MANSION_PALETTE : BANK_PALETTE

    let order = 0
    const dressing = buildDressing(level)
    for (const it of dressing.items) this.addItem(it.r, (order += 1), it.paint)
    for (const d of level.decor) this.addItem(d, (order += 1), (g) => paintDecor(g, d, mansion))
    for (const h of level.hides) this.addItem(h, (order += 1), (g) => paintHide(g, h))
    this.addItem(level.exit, (order += 1), (g) => paintExit(g, level.exit))
    for (const d of level.doors) this.addItem(d, (order += 1), (g) => paintDoorFrame(g, d, pal))
    // Solids back-to-front so southern furniture overlaps northern walls.
    const solids = [...level.solids].sort((a, b) => a.y + a.h - (b.y + b.h))
    for (const s of solids) this.addItem(s, 100000 + (order += 1), (g) => paintSolid(g, s, pal))
  }

  private addItem(r: Rect, order: number, paint: Painter) {
    const item: Item = { r, order, paint }
    const x0 = Math.max(0, Math.floor((r.x - MARGIN) / CHUNK))
    const x1 = Math.min(this.cols - 1, Math.floor((r.x + r.w + MARGIN) / CHUNK))
    const y0 = Math.max(0, Math.floor((r.y - MARGIN) / CHUNK))
    const y1 = Math.min(this.rows - 1, Math.floor((r.y + r.h + MARGIN) / CHUNK))
    for (let cy = y0; cy <= y1; cy += 1) for (let cx = x0; cx <= x1; cx += 1) this.buckets[cy * this.cols + cx].push(item)
  }

  /** Bake chunks covering the view (nearest first, a few per frame) and release far ones. */
  update(view: Rect) {
    this.frame += 1
    const x0 = Math.max(0, Math.floor((view.x - CHUNK / 2) / CHUNK))
    const x1 = Math.min(this.cols - 1, Math.floor((view.x + view.w + CHUNK / 2) / CHUNK))
    const y0 = Math.max(0, Math.floor((view.y - CHUNK / 2) / CHUNK))
    const y1 = Math.min(this.rows - 1, Math.floor((view.y + view.h + CHUNK / 2) / CHUNK))
    const cx = view.x + view.w / 2
    const cy = view.y + view.h / 2
    const missing: { i: number; d: number }[] = []
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const i = y * this.cols + x
        const ch = this.chunks.get(i)
        if (ch) {
          ch.lastSeen = this.frame
          continue
        }
        missing.push({ i, d: Math.hypot((x + 0.5) * CHUNK - cx, (y + 0.5) * CHUNK - cy) })
      }
    }
    missing.sort((a, b) => a.d - b.d)
    // Chunks actually on screen are baked immediately; margin chunks are rate-limited.
    let budget = MAX_BAKES_PER_FRAME
    for (const m of missing) {
      const onScreen = this.chunkRect(m.i)
      if (!intersects(onScreen, view) && budget <= 0) break
      this.bake(m.i)
      budget -= 1
    }
    if (this.chunks.size > KEEP) this.evict()
  }

  private chunkRect(i: number): Rect {
    return { x: (i % this.cols) * CHUNK, y: Math.floor(i / this.cols) * CHUNK, w: CHUNK, h: CHUNK }
  }

  private bake(i: number) {
    const r = this.chunkRect(i)
    const g = this.gfx
    g.clear()
    const items = [...this.buckets[i]].sort((a, b) => a.order - b.order)
    for (const it of items) it.paint(g)
    const rt = this.scene.add.renderTexture(r.x, r.y, CHUNK, CHUNK).setOrigin(0, 0).setDepth(this.depth)
    rt.draw(g, -r.x, -r.y)
    g.clear()
    this.chunks.set(i, { rt, lastSeen: this.frame })
  }

  private evict() {
    const list = [...this.chunks.entries()].sort((a, b) => a[1].lastSeen - b[1].lastSeen)
    while (list.length > KEEP) {
      const [i, ch] = list.shift()!
      if (ch.lastSeen === this.frame) break
      ch.rt.destroy()
      this.chunks.delete(i)
    }
  }

  bakedCount() {
    return this.chunks.size
  }

  destroy() {
    for (const ch of this.chunks.values()) ch.rt.destroy()
    this.chunks.clear()
    this.gfx.destroy()
  }
}
