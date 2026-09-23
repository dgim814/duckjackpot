import type { Rect } from '../level/LevelDef'

export type Solid = Rect & { id: number; active: boolean }

/** Axis-aligned box described by its centre, used for movers (feet of the duck, guards). */
export type Box = { x: number; y: number; hw: number; hh: number }

export type MoveResult = { dx: number; dy: number; hitX: boolean; hitY: boolean }

const CELL = 128
const EPS = 0.001

/**
 * Static solids in a uniform spatial hash. Moves and line-of-sight only look at
 * the handful of rectangles in nearby cells, never the whole building.
 */
export class SolidGrid {
  readonly cols: number
  readonly rows: number
  private cells: Solid[][]
  private solids: Solid[] = []
  private stamp = 0
  private seen: Uint32Array = new Uint32Array(64)

  constructor(readonly width: number, readonly height: number) {
    this.cols = Math.ceil(width / CELL)
    this.rows = Math.ceil(height / CELL)
    this.cells = Array.from({ length: this.cols * this.rows }, () => [])
  }

  add(r: Rect): Solid {
    const s: Solid = { x: r.x, y: r.y, w: r.w, h: r.h, id: this.solids.length, active: true }
    this.solids.push(s)
    if (this.seen.length < this.solids.length) {
      const next = new Uint32Array(this.seen.length * 2)
      next.set(this.seen)
      this.seen = next
    }
    const c0 = this.col(s.x)
    const c1 = this.col(s.x + s.w)
    const r0 = this.row(s.y)
    const r1 = this.row(s.y + s.h)
    for (let cy = r0; cy <= r1; cy += 1) {
      for (let cx = c0; cx <= c1; cx += 1) this.cells[cy * this.cols + cx].push(s)
    }
    return s
  }

  all(): readonly Solid[] {
    return this.solids
  }

  activeRects(): Rect[] {
    return this.solids.filter((s) => s.active)
  }

  private col(x: number) {
    return Math.max(0, Math.min(this.cols - 1, Math.floor(x / CELL)))
  }

  private row(y: number) {
    return Math.max(0, Math.min(this.rows - 1, Math.floor(y / CELL)))
  }

  /** Calls fn for each active solid touching the area, once per solid. */
  forEachIn(x0: number, y0: number, x1: number, y1: number, fn: (s: Solid) => boolean | void) {
    this.stamp += 1
    if (this.stamp === 0xffffffff) {
      this.seen.fill(0)
      this.stamp = 1
    }
    const c0 = this.col(Math.min(x0, x1))
    const c1 = this.col(Math.max(x0, x1))
    const r0 = this.row(Math.min(y0, y1))
    const r1 = this.row(Math.max(y0, y1))
    for (let cy = r0; cy <= r1; cy += 1) {
      for (let cx = c0; cx <= c1; cx += 1) {
        const list = this.cells[cy * this.cols + cx]
        for (let i = 0; i < list.length; i += 1) {
          const s = list[i]
          if (!s.active || this.seen[s.id] === this.stamp) continue
          this.seen[s.id] = this.stamp
          if (fn(s) === true) return
        }
      }
    }
  }

  boxBlocked(b: Box) {
    let hit = false
    this.forEachIn(b.x - b.hw, b.y - b.hh, b.x + b.hw, b.y + b.hh, (s) => {
      if (overlaps(b, s)) {
        hit = true
        return true
      }
      return false
    })
    return hit
  }

  pointBlocked(x: number, y: number) {
    let hit = false
    this.forEachIn(x, y, x, y, (s) => {
      if (x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h) {
        hit = true
        return true
      }
      return false
    })
    return hit
  }

  /**
   * Move a box by (dx, dy), sliding along walls. Each axis is resolved on its
   * own, and long moves are split so a dash can never skip through a wall.
   */
  move(b: Box, dx: number, dy: number): MoveResult {
    const maxStep = Math.max(1, Math.min(b.hw, b.hh))
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / maxStep))
    const sx = dx / steps
    const sy = dy / steps
    let hitX = false
    let hitY = false
    const x0 = b.x
    const y0 = b.y
    for (let i = 0; i < steps; i += 1) {
      if (sx !== 0 && !hitX) hitX = this.sweepAxis(b, sx, 'x')
      if (sy !== 0 && !hitY) hitY = this.sweepAxis(b, sy, 'y')
    }
    return { dx: b.x - x0, dy: b.y - y0, hitX, hitY }
  }

  private sweepAxis(b: Box, d: number, axis: 'x' | 'y') {
    if (axis === 'x') b.x += d
    else b.y += d
    let hit = false
    this.forEachIn(b.x - b.hw, b.y - b.hh, b.x + b.hw, b.y + b.hh, (s) => {
      if (!overlaps(b, s)) return false
      hit = true
      if (axis === 'x') b.x = d > 0 ? s.x - b.hw - EPS : s.x + s.w + b.hw + EPS
      else b.y = d > 0 ? s.y - b.hh - EPS : s.y + s.h + b.hh + EPS
      return false
    })
    return hit
  }

  /** True when nothing solid crosses the segment. */
  segmentClear(ax: number, ay: number, bx: number, by: number) {
    let clear = true
    this.forEachIn(ax, ay, bx, by, (s) => {
      if (segmentHitsRect(ax, ay, bx, by, s)) {
        clear = false
        return true
      }
      return false
    })
    return clear
  }
}

export function overlaps(b: Box, r: Rect) {
  return b.x + b.hw > r.x && b.x - b.hw < r.x + r.w && b.y + b.hh > r.y && b.y - b.hh < r.y + r.h
}

/** Liang–Barsky clip of the segment against the rectangle interior. */
export function segmentHitsRect(ax: number, ay: number, bx: number, by: number, r: Rect) {
  let t0 = 0
  let t1 = 1
  const dx = bx - ax
  const dy = by - ay
  const p = [-dx, dx, -dy, dy]
  const q = [ax - r.x, r.x + r.w - ax, ay - r.y, r.y + r.h - ay]
  for (let i = 0; i < 4; i += 1) {
    if (p[i] === 0) {
      if (q[i] <= 0) return false
      continue
    }
    const t = q[i] / p[i]
    if (p[i] < 0) {
      if (t > t1) return false
      if (t > t0) t0 = t
    } else {
      if (t < t0) return false
      if (t < t1) t1 = t
    }
  }
  return t1 - t0 > 1e-6
}

export function pointInRect(x: number, y: number, r: Rect) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
}

export function distToRect(x: number, y: number, r: Rect) {
  const qx = Math.max(r.x, Math.min(x, r.x + r.w))
  const qy = Math.max(r.y, Math.min(y, r.y + r.h))
  return Math.hypot(x - qx, y - qy)
}
