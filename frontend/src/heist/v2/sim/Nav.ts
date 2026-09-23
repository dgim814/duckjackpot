import type { Rect, Vec } from '../level/LevelDef'
import type { SolidGrid } from './Collision'

const SQRT2 = Math.SQRT2
const DIRS: readonly [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, SQRT2],
  [1, -1, SQRT2],
  [-1, 1, SQRT2],
  [-1, -1, SQRT2],
]

/**
 * Walkability grid for guards plus an allocation-free A*. The grid is built
 * from the spatial hash, and a door opening only recomputes the cells near it.
 */
export class Nav {
  readonly cols: number
  readonly rows: number
  readonly blocked: Uint8Array
  private g: Float32Array
  private f: Float32Array
  private came: Int32Array
  private gen: Uint32Array
  private closedGen: Uint32Array
  private heap: Int32Array
  private heapN = 0
  private stamp = 0

  constructor(
    private solids: SolidGrid,
    readonly cell: number,
    private pad: number,
  ) {
    this.cols = Math.ceil(solids.width / cell)
    this.rows = Math.ceil(solids.height / cell)
    const n = this.cols * this.rows
    this.blocked = new Uint8Array(n)
    this.g = new Float32Array(n)
    this.f = new Float32Array(n)
    this.came = new Int32Array(n)
    this.gen = new Uint32Array(n)
    this.closedGen = new Uint32Array(n)
    this.heap = new Int32Array(n * 8)
    this.rebuildArea({ x: 0, y: 0, w: solids.width, h: solids.height })
  }

  /** Recompute blocked flags for cells overlapping the rect (grown by pad). */
  rebuildArea(r: Rect) {
    const c = this.cell
    const x0 = Math.max(0, Math.floor((r.x - this.pad) / c))
    const x1 = Math.min(this.cols - 1, Math.floor((r.x + r.w + this.pad) / c))
    const y0 = Math.max(0, Math.floor((r.y - this.pad) / c))
    const y1 = Math.min(this.rows - 1, Math.floor((r.y + r.h + this.pad) / c))
    const pad = this.pad
    for (let gy = y0; gy <= y1; gy += 1) {
      for (let gx = x0; gx <= x1; gx += 1) {
        const cx = (gx + 0.5) * c
        const cy = (gy + 0.5) * c
        let hit = 0
        this.solids.forEachIn(cx - pad, cy - pad, cx + pad, cy + pad, (s) => {
          const qx = Math.max(s.x, Math.min(cx, s.x + s.w))
          const qy = Math.max(s.y, Math.min(cy, s.y + s.h))
          if ((cx - qx) ** 2 + (cy - qy) ** 2 < pad * pad) {
            hit = 1
            return true
          }
          return false
        })
        this.blocked[gy * this.cols + gx] = hit
      }
    }
  }

  walkableCell(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows && this.blocked[y * this.cols + x] === 0
  }

  walkableAt(wx: number, wy: number) {
    return this.walkableCell(Math.floor(wx / this.cell), Math.floor(wy / this.cell))
  }

  nearestWalkable(wx: number, wy: number): Vec {
    const sx = Math.max(0, Math.min(this.cols - 1, Math.floor(wx / this.cell)))
    const sy = Math.max(0, Math.min(this.rows - 1, Math.floor(wy / this.cell)))
    if (this.walkableCell(sx, sy)) return this.center(sx, sy)
    for (let r = 1; r < 24; r += 1) {
      for (let dy = -r; dy <= r; dy += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue
          if (this.walkableCell(sx + dx, sy + dy)) return this.center(sx + dx, sy + dy)
        }
      }
    }
    return this.center(sx, sy)
  }

  center(cx: number, cy: number): Vec {
    return { x: (cx + 0.5) * this.cell, y: (cy + 0.5) * this.cell }
  }

  /** Grid ray: true when every cell under the segment is walkable. */
  lineWalkable(ax: number, ay: number, bx: number, by: number) {
    const c = this.cell
    let x = Math.floor(ax / c)
    let y = Math.floor(ay / c)
    const tx = Math.floor(bx / c)
    const ty = Math.floor(by / c)
    const dx = Math.abs(tx - x)
    const dy = Math.abs(ty - y)
    const sx = x < tx ? 1 : -1
    const sy = y < ty ? 1 : -1
    let err = dx - dy
    for (let guard = 0; guard < 4096; guard += 1) {
      if (!this.walkableCell(x, y)) return false
      if (x === tx && y === ty) return true
      const e2 = 2 * err
      if (e2 > -dy) {
        err -= dy
        x += sx
      }
      if (e2 < dx) {
        err += dx
        y += sy
      }
    }
    return false
  }

  /**
   * A* from world point to world point. Returns a smoothed list of waypoints
   * (without the start), or null when unreachable within the node budget.
   */
  findPath(ax: number, ay: number, bx: number, by: number, budget = 5000): Vec[] | null {
    const start = this.nearestWalkable(ax, ay)
    const goal = this.nearestWalkable(bx, by)
    const c = this.cell
    const sx = Math.floor(start.x / c)
    const sy = Math.floor(start.y / c)
    const gx = Math.floor(goal.x / c)
    const gy = Math.floor(goal.y / c)
    if (sx === gx && sy === gy) return [goal]
    if (this.lineWalkable(ax, ay, goal.x, goal.y)) return [goal]

    this.stamp += 1
    if (this.stamp === 0xffffffff) {
      this.gen.fill(0)
      this.closedGen.fill(0)
      this.stamp = 1
    }
    const cols = this.cols
    const startI = sy * cols + sx
    const goalI = gy * cols + gx
    this.heapN = 0
    this.touch(startI, 0, this.h(sx, sy, gx, gy), -1)
    this.push(startI)

    let found = false
    let expanded = 0
    while (this.heapN > 0) {
      const cur = this.pop()
      if (this.closedGen[cur] === this.stamp) continue
      this.closedGen[cur] = this.stamp
      if (cur === goalI) {
        found = true
        break
      }
      if ((expanded += 1) > budget) break
      const cx = cur % cols
      const cy = (cur / cols) | 0
      const gc = this.g[cur]
      for (const [dx, dy, cost] of DIRS) {
        const nx = cx + dx
        const ny = cy + dy
        if (!this.walkableCell(nx, ny)) continue
        if (dx !== 0 && dy !== 0 && (!this.walkableCell(cx + dx, cy) || !this.walkableCell(cx, cy + dy))) continue
        const ni = ny * cols + nx
        if (this.closedGen[ni] === this.stamp) continue
        const ng = gc + cost
        if (this.gen[ni] === this.stamp && ng >= this.g[ni]) continue
        this.touch(ni, ng, ng + this.h(nx, ny, gx, gy), cur)
        this.push(ni)
      }
    }
    if (!found) return null

    const cells: Vec[] = []
    let cur = goalI
    for (let guard = 0; cur !== -1 && guard < 100000; guard += 1) {
      cells.push(this.center(cur % cols, (cur / cols) | 0))
      if (cur === startI) break
      cur = this.came[cur]
    }
    cells.reverse()
    return this.smooth(ax, ay, cells)
  }

  /** String pulling: keep only corners the guard cannot see past. */
  private smooth(ax: number, ay: number, cells: Vec[]): Vec[] {
    const out: Vec[] = []
    let from = { x: ax, y: ay }
    let i = 0
    while (i < cells.length) {
      let far = i
      for (let j = i + 1; j < cells.length; j += 1) {
        if (!this.lineWalkable(from.x, from.y, cells[j].x, cells[j].y)) break
        far = j
      }
      out.push(cells[far])
      from = cells[far]
      i = far + 1
    }
    return out
  }

  private h(x: number, y: number, gx: number, gy: number) {
    const dx = Math.abs(x - gx)
    const dy = Math.abs(y - gy)
    return dx + dy + (SQRT2 - 2) * Math.min(dx, dy)
  }

  private touch(i: number, g: number, f: number, from: number) {
    this.gen[i] = this.stamp
    this.g[i] = g
    this.f[i] = f
    this.came[i] = from
  }

  private push(i: number) {
    const heap = this.heap
    const f = this.f
    if (this.heapN >= heap.length) return
    let k = this.heapN
    this.heapN += 1
    heap[k] = i
    while (k > 0) {
      const p = (k - 1) >> 1
      if (f[heap[p]] <= f[i]) break
      heap[k] = heap[p]
      k = p
    }
    heap[k] = i
  }

  private pop() {
    const heap = this.heap
    const f = this.f
    const top = heap[0]
    this.heapN -= 1
    const last = heap[this.heapN]
    let k = 0
    const n = this.heapN
    while (true) {
      const l = 2 * k + 1
      if (l >= n) break
      const r = l + 1
      const c = r < n && f[heap[r]] < f[heap[l]] ? r : l
      if (f[heap[c]] >= f[last]) break
      heap[k] = heap[c]
      k = c
    }
    heap[k] = last
    return top
  }
}
