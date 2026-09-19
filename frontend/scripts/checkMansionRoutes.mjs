// Dev-only sanity check: flood fill the mansion before and after the siren.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as esbuild from 'esbuild'

const src = readFileSync(new URL('../src/heist/phaser/mansionLayout.ts', import.meta.url), 'utf8')
const out = esbuild.transformSync(src, { loader: 'ts', format: 'esm' }).code
const dir = mkdtempSync(join(tmpdir(), 'mansion-'))
const file = join(dir, 'layout.mjs')
writeFileSync(file, out)
const L = await import(file)

const T = 40
const CELL = 24
const PAD = 22

function baseWalls({ siren }) {
  const rects = [
    { x: 0, y: 0, w: L.MANSION_W, h: T },
    { x: 0, y: L.MANSION_H - T, w: L.MANSION_W, h: T },
    { x: 0, y: 0, w: T, h: L.MANSION_H },
    { x: L.MANSION_W - T, y: 0, w: T, h: L.MANSION_H },
    ...L.MANSION_WALLS,
    ...L.MANSION_FURNITURE,
  ]
  if (!siren) rects.push(...L.MANSION_SIREN.openWalls)
  if (siren) rects.push(...L.MANSION_SIREN.close)
  return rects
}

function walkable(rects, px, py) {
  for (const r of rects) {
    if (px > r.x - PAD && px < r.x + r.w + PAD && py > r.y - PAD && py < r.y + r.h + PAD) return false
  }
  return true
}

function reach(rects, from, to) {
  return dist(rects, from, to) >= 0
}

/** Manhattan grid distance in pixels, -1 when unreachable. */
function dist(rects, from, to) {
  const cols = Math.ceil(L.MANSION_W / CELL)
  const rows = Math.ceil(L.MANSION_H / CELL)
  const idx = (c, r) => r * cols + c
  const seen = new Uint8Array(cols * rows)
  const cell = (p) => [Math.floor(p.x / CELL), Math.floor(p.y / CELL)]
  const [sc, sr] = cell(from)
  const [tc, tr] = cell(to)
  const queue = [[sc, sr, 0]]
  seen[idx(sc, sr)] = 1
  while (queue.length) {
    const [c, r, d] = queue.shift()
    if (c === tc && r === tr) return d * CELL
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc
      const nr = r + dr
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue
      if (seen[idx(nc, nr)]) continue
      seen[idx(nc, nr)] = 1
      if (!walkable(rects, nc * CELL + CELL / 2, nr * CELL + CELL / 2)) continue
      queue.push([nc, nr, d + 1])
    }
  }
  return -1
}

const doorsOpen = (ids) => L.MANSION_DOORS.filter((d) => !ids.includes(d.id))
const spawn = L.MANSION_SPAWN
const exit = L.MANSION_EXIT
const safeA = { x: L.MANSION_SAFES[0].x + 90, y: L.MANSION_SAFES[0].y + 90 }
const safeB = { x: L.MANSION_SAFES[1].x - 120, y: L.MANSION_SAFES[1].y }

const cases = [
  ['quiet: spawn -> exit (all doors locked)', baseWalls({ siren: false }).concat(L.MANSION_DOORS), spawn, exit],
  ['quiet: spawn -> storage A door area', baseWalls({ siren: false }).concat(L.MANSION_DOORS), spawn, { x: 210, y: 500 }],
  ['quiet: spawn -> safe A (storageA open)', baseWalls({ siren: false }).concat(doorsOpen(['storageA'])), spawn, safeA],
  ['quiet: spawn -> safe B (storageB open)', baseWalls({ siren: false }).concat(doorsOpen(['storageB'])), spawn, safeB],
  ['siren: safe B -> exit', baseWalls({ siren: true }).concat(doorsOpen(['storageB', 'treasure'])), safeB, exit],
  ['siren: safe A -> exit', baseWalls({ siren: true }).concat(doorsOpen(['storageA', 'treasure'])), safeA, exit],
  ['siren: spawn -> exit', baseWalls({ siren: true }).concat(doorsOpen(['treasure'])), spawn, exit],
  ['siren: exit sealed on old route', baseWalls({ siren: true }).concat(L.MANSION_DOORS), { x: 2700, y: 760 }, exit],
]

for (const [name, rects, from, to] of cases) {
  const d = dist(rects, from, to)
  const walkS = d < 0 ? '' : `  ~${d}px  ~${Math.round(d / 98)}s at loaded run speed`
  console.log(`${reach(rects, from, to) ? 'REACHABLE ' : 'BLOCKED   '} ${name}${walkS}`)
}

for (const [i, route] of L.MANSION_GUARD_ROUTES.entries()) {
  const rects = baseWalls({ siren: false }).concat(L.MANSION_DOORS)
  const bad = route.filter((p) => !walkable(rects, p.x, p.y))
  if (bad.length) console.log(`guard ${i} waypoints inside geometry:`, bad)
}
for (const plan of L.MANSION_SIREN.redeploy) {
  const rects = baseWalls({ siren: true }).concat(doorsOpen(['treasure']))
  const bad = plan.route.filter((p) => !walkable(rects, p.x, p.y))
  if (bad.length) console.log(`redeploy guard ${plan.guard} waypoints inside geometry:`, bad)
}
