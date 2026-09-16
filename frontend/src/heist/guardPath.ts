export type NavWall = { x: number; y: number; w: number; h: number }

export type NavGrid = {
  cols: number
  rows: number
  cell: number
  blocked: Uint8Array
}

const CARDINALS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

function distPointRect(px: number, py: number, wall: NavWall) {
  const qx = Math.max(wall.x, Math.min(px, wall.x + wall.w))
  const qy = Math.max(wall.y, Math.min(py, wall.y + wall.h))
  return Math.hypot(px - qx, py - qy)
}

export function buildNavGrid(width: number, height: number, cell: number, walls: NavWall[], pad: number): NavGrid {
  const cols = Math.ceil(width / cell)
  const rows = Math.ceil(height / cell)
  const blocked = new Uint8Array(cols * rows)
  for (let gy = 0; gy < rows; gy += 1) {
    for (let gx = 0; gx < cols; gx += 1) {
      const cx = (gx + 0.5) * cell
      const cy = (gy + 0.5) * cell
      let hit = false
      for (const wall of walls) {
        if (distPointRect(cx, cy, wall) < pad) {
          hit = true
          break
        }
      }
      if (hit) blocked[gy * cols + gx] = 1
    }
  }
  return { cols, rows, cell, blocked }
}

function idx(grid: NavGrid, x: number, y: number) {
  return y * grid.cols + x
}

export function walkable(grid: NavGrid, x: number, y: number) {
  if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) return false
  return grid.blocked[idx(grid, x, y)] === 0
}

export function worldToCell(grid: NavGrid, x: number, y: number) {
  return {
    x: Math.max(0, Math.min(grid.cols - 1, Math.floor(x / grid.cell))),
    y: Math.max(0, Math.min(grid.rows - 1, Math.floor(y / grid.cell))),
  }
}

export function cellCenter(grid: NavGrid, x: number, y: number) {
  return { x: (x + 0.5) * grid.cell, y: (y + 0.5) * grid.cell }
}

export function nearestWalkable(grid: NavGrid, x: number, y: number) {
  const start = worldToCell(grid, x, y)
  if (walkable(grid, start.x, start.y)) return start
  const max = Math.max(grid.cols, grid.rows)
  for (let r = 1; r < max; r += 1) {
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue
        const nx = start.x + dx
        const ny = start.y + dy
        if (walkable(grid, nx, ny)) return { x: nx, y: ny }
      }
    }
  }
  return start
}

export function gridLineClear(grid: NavGrid, ax: number, ay: number, bx: number, by: number) {
  let x0 = worldToCell(grid, ax, ay).x
  let y0 = worldToCell(grid, ax, ay).y
  const x1 = worldToCell(grid, bx, by).x
  const y1 = worldToCell(grid, bx, by).y
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy
  while (true) {
    if (!walkable(grid, x0, y0)) return false
    if (x0 === x1 && y0 === y1) return true
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x0 += sx
    }
    if (e2 < dx) {
      err += dx
      y0 += sy
    }
  }
}

export function findPath(grid: NavGrid, sx: number, sy: number, tx: number, ty: number) {
  const start = nearestWalkable(grid, sx, sy)
  const goal = nearestWalkable(grid, tx, ty)
  if (start.x === goal.x && start.y === goal.y) {
    return [cellCenter(grid, goal.x, goal.y)]
  }

  const n = grid.cols * grid.rows
  const came = new Int32Array(n)
  const gScore = new Float32Array(n)
  const closed = new Uint8Array(n)
  came.fill(-1)
  gScore.fill(1e9)

  const open: number[] = []
  const startI = idx(grid, start.x, start.y)
  const goalI = idx(grid, goal.x, goal.y)
  if (!walkable(grid, start.x, start.y) || !walkable(grid, goal.x, goal.y)) return null
  gScore[startI] = 0
  open.push(startI)

  const heur = (x: number, y: number) => Math.abs(x - goal.x) + Math.abs(y - goal.y)

  while (open.length) {
    let best = 0
    let bestF = gScore[open[0]] + heur(open[0] % grid.cols, (open[0] / grid.cols) | 0)
    for (let i = 1; i < open.length; i += 1) {
      const id = open[i]
      const f = gScore[id] + heur(id % grid.cols, (id / grid.cols) | 0)
      if (f < bestF) {
        bestF = f
        best = i
      }
    }
    const current = open[best]
    open[best] = open[open.length - 1]
    open.pop()
    if (closed[current]) continue
    closed[current] = 1
    if (current === goalI) break
    const cx = current % grid.cols
    const cy = (current / grid.cols) | 0
    for (const [dx, dy] of CARDINALS) {
      const nx = cx + dx
      const ny = cy + dy
      if (!walkable(grid, nx, ny)) continue
      const ni = idx(grid, nx, ny)
      if (closed[ni]) continue
      const tentative = gScore[current] + 1
      if (tentative >= gScore[ni]) continue
      came[ni] = current
      gScore[ni] = tentative
      open.push(ni)
    }
  }

  if (came[goalI] < 0 && startI !== goalI) return null

  const cells: { x: number; y: number }[] = []
  let cur = goalI
  cells.push({ x: goal.x, y: goal.y })
  while (cur !== startI && came[cur] >= 0) {
    cur = came[cur]
    cells.push({ x: cur % grid.cols, y: (cur / grid.cols) | 0 })
  }
  cells.reverse()
  return cells.map((c) => cellCenter(grid, c.x, c.y))
}

const STUCK_OFFSETS = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [2, 0],
  [-2, 0],
  [0, 2],
  [0, -2],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

export function findPathAroundStuck(grid: NavGrid, sx: number, sy: number, tx: number, ty: number, tryIndex: number) {
  const start = nearestWalkable(grid, sx, sy)
  const off = STUCK_OFFSETS[tryIndex % STUCK_OFFSETS.length]
  const fromX = (start.x + off[0] + 0.5) * grid.cell
  const fromY = (start.y + off[1] + 0.5) * grid.cell
  return findPath(grid, fromX, fromY, tx, ty)
}
