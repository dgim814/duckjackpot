// Dev-only sanity check: flood fill the 20-zone bank and validate placement.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as esbuild from 'esbuild'

const src = readFileSync(new URL('../src/heist/phaser/bankLayout.ts', import.meta.url), 'utf8')
const out = esbuild.transformSync(src, { loader: 'ts', format: 'esm' }).code
const dir = mkdtempSync(join(tmpdir(), 'bank-'))
const file = join(dir, 'layout.mjs')
writeFileSync(file, out)
const L = await import(file)

const T = 40
const CELL = 24
const PAD = 22
const VALUE = { C5: 5, C10: 10, C50: 50, C100: 100 }

function baseWalls() {
  return [
    { x: 0, y: 0, w: L.BANK_W, h: T },
    { x: 0, y: L.BANK_H - T, w: L.BANK_W, h: T },
    { x: 0, y: 0, w: T, h: L.BANK_H },
    { x: L.BANK_W - T, y: 0, w: T, h: L.BANK_H },
    ...L.BANK_WALLS,
    ...L.BANK_FURNITURE,
  ]
}

function walkable(rects, px, py) {
  for (const r of rects) {
    if (px > r.x - PAD && px < r.x + r.w + PAD && py > r.y - PAD && py < r.y + r.h + PAD) return false
  }
  return true
}

function dist(rects, from, to) {
  const cols = Math.ceil(L.BANK_W / CELL)
  const rows = Math.ceil(L.BANK_H / CELL)
  const idx = (c, r) => r * cols + c
  const cell = (p) => [Math.floor(p.x / CELL), Math.floor(p.y / CELL)]
  const [sc, sr] = cell(from)
  const [tc, tr] = cell(to)
  const seen = new Uint8Array(cols * rows)
  const queue = [[sc, sr, 0]]
  seen[idx(sc, sr)] = 1
  let head = 0
  while (head < queue.length) {
    const [c, r, d] = queue[head]
    head += 1
    if (c === tc && r === tr) return d * CELL
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
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

const locked = baseWalls().concat(L.BANK_DOORS)
const open = baseWalls()
const spawn = L.BANK_SPAWN
const lobbyExit = L.BANK_EXIT
const finalExit = L.BANK_FINAL_EXIT
const safeA = { x: L.BANK_SAFES[0].x + 80, y: L.BANK_SAFES[0].y - 80 }
const safeB = { x: L.BANK_SAFES[1].x - 80, y: L.BANK_SAFES[1].y - 80 }

const cases = [
  ['early extract: spawn -> lobby EXIT', locked, spawn, lobbyExit, true],
  ['doors locked: spawn -> hall', locked, spawn, { x: 1400, y: 6000 }, true],
  ['doors locked: spawn -> offices', locked, spawn, { x: 1400, y: 5040 }, true],
  ['doors locked: spawn -> closed offices is sealed', locked, spawn, { x: 1400, y: 3000 }, false],
  ['doors locked: spawn -> safe A is sealed', locked, spawn, safeA, false],
  ['doors locked: spawn -> final EXIT is sealed', locked, spawn, finalExit, false],
  ['doors open: spawn -> safe A', open, spawn, safeA, true],
  ['doors open: spawn -> safe B', open, spawn, safeB, true],
  ['doors open: spawn -> final EXIT', open, spawn, finalExit, true],
  ['doors open: final EXIT -> lobby EXIT', open, finalExit, lobbyExit, true],
  ['west corridor: spawn -> west loot', locked, spawn, { x: 360, y: 5520 }, true],
  ['east corridor: spawn -> east loot', locked, spawn, { x: 2440, y: 5520 }, true],
]

let failed = 0
for (const [name, rects, from, to, expectReach] of cases) {
  const d = dist(rects, from, to)
  const reachable = d >= 0
  const ok = reachable === expectReach
  if (!ok) failed += 1
  const walkS = reachable ? `  ~${d}px  ~${Math.round(d / 98)}s` : ''
  console.log(`${reachable ? 'REACHABLE ' : 'BLOCKED   '} ${ok ? 'ok ' : 'FAIL '} ${name}${walkS}`)
}

if (L.BANK_ZONE_COUNT !== 20 || L.BANK_ZONES.length !== 20) {
  failed += 1
  console.log('FAIL  expected 20 real zones, got', L.BANK_ZONE_COUNT, L.BANK_ZONES.length)
} else {
  console.log('ok    20 real zones')
}

const area = L.BANK_W * L.BANK_H
if (area < 2200 * 3840 * 2) {
  failed += 1
  console.log('FAIL  map smaller than 2x previous', L.BANK_W, L.BANK_H)
} else {
  console.log(`ok    map ${L.BANK_W}x${L.BANK_H} (${(area / (2200 * 3840)).toFixed(2)}x previous)`)
}

if (spawn.x === lobbyExit.x && spawn.y === lobbyExit.y) {
  failed += 1
  console.log('FAIL  spawn equals lobby EXIT')
}

for (const [i, route] of L.BANK_GUARD_ROUTES.entries()) {
  const bad = route.filter((p) => !walkable(open, p.x, p.y))
  if (bad.length) {
    failed += 1
    console.log(`FAIL  guard ${i} waypoints inside geometry:`, bad)
  }
  const unreachable = route.filter((p) => dist(open, route[0], p) < 0)
  if (unreachable.length) {
    failed += 1
    console.log(`FAIL  guard ${i} waypoints unreachable:`, unreachable)
  }
}

const ids = new Set(L.BANK_LOOT.map((p) => p.id))
if (ids.size !== L.BANK_LOOT.length) {
  failed += 1
  console.log('FAIL  duplicate loot ids')
}

const badLoot = L.BANK_LOOT.filter((p) => !walkable(open, p.x, p.y) || dist(open, spawn, p) < 0)
if (badLoot.length) {
  failed += 1
  console.log('FAIL  loot inside geometry or unreachable:', badLoot.map((p) => p.id))
}

const floor = L.BANK_LOOT.reduce((sum, p) => sum + (VALUE[p.kind] ?? 0), 0)
const safes = L.BANK_SAFES.reduce(
  (sum, s) => sum + s.reward + (s.extraKind ? VALUE[s.extraKind] ?? 0 : 0),
  0,
)
const total = floor + safes
console.log('loot total', total, { floor, safes }, 'guards', L.BANK_GUARD_ROUTES.length, 'cams', L.BANK_CAMS.length)
if (total < 800 || total > 1500) {
  failed += 1
  console.log('FAIL  loot total outside 800-1500')
}

if (failed) {
  console.error('bank layout check failed')
  process.exit(1)
}
console.log('bank layout check passed')
