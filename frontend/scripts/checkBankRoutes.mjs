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
const safeA = { x: L.BANK_SAFES[0].x + 80, y: L.BANK_SAFES[0].y - 80 }
const safeB = { x: L.BANK_SAFES[1].x - 80, y: L.BANK_SAFES[1].y - 80 }
const final = { x: 1400, y: 280 }

if (L.BANK_FINAL_EXIT) {
  console.log('FAIL  BANK_FINAL_EXIT still exists — BANK must have one lobby EXIT')
  process.exit(1)
}

const cases = [
  ['one EXIT: spawn -> lobby EXIT', locked, spawn, lobbyExit, true],
  ['doors locked: spawn -> hall is sealed', locked, spawn, { x: 1400, y: 6000 }, false],
  ['doors locked: spawn -> offices is sealed', locked, spawn, { x: 1400, y: 5040 }, false],
  ['doors locked: spawn -> security is sealed', locked, spawn, { x: 1400, y: 4160 }, false],
  ['doors locked: spawn -> final is sealed', locked, spawn, final, false],
  ['doors locked: spawn -> safe A is sealed', locked, spawn, safeA, false],
  ['doors open: spawn -> hall', open, spawn, { x: 1400, y: 6000 }, true],
  ['doors open: spawn -> offices', open, spawn, { x: 1400, y: 5040 }, true],
  ['doors open: spawn -> safe A', open, spawn, safeA, true],
  ['doors open: spawn -> safe B', open, spawn, safeB, true],
  ['doors open: spawn -> zone 20', open, spawn, final, true],
  ['long walk back: zone 20 -> lobby EXIT', open, final, lobbyExit, true],
  ['doors locked: spawn -> west is sealed', locked, spawn, { x: 360, y: 5520 }, false],
  ['doors open: spawn -> west loot', open, spawn, { x: 360, y: 5520 }, true],
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
} else console.log('ok    20 real zones')

if (L.BANK_DOORS.length < 15) {
  failed += 1
  console.log('FAIL  expected several zone doors, got', L.BANK_DOORS.length)
} else console.log('ok   ', L.BANK_DOORS.length, 'lockpick doors')

if ((L.BANK_FOLIAGE?.length ?? 0) < 16) {
  failed += 1
  console.log('FAIL  expected plant hide foliage')
} else console.log('ok   ', L.BANK_FOLIAGE.length, 'plant hides')

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
  console.log(
    'FAIL  loot inside geometry or unreachable:',
    badLoot.map((p) => p.id),
  )
}

const deepLoot = L.BANK_LOOT.filter((p) => p.y < 3640).reduce((sum, p) => sum + (VALUE[p.kind] ?? 0), 0)
const floor = L.BANK_LOOT.reduce((sum, p) => sum + (VALUE[p.kind] ?? 0), 0)
const safes = L.BANK_SAFES.reduce((sum, s) => sum + s.reward + (s.extraKind ? VALUE[s.extraKind] ?? 0 : 0), 0)
const total = floor + safes
const byZone = Array.from({ length: 20 }, () => 0)
for (const p of L.BANK_LOOT) {
  const z = L.bankZoneAt(p.x, p.y)
  byZone[z.i] += VALUE[p.kind] ?? 0
}
console.log('loot total', total, { floor, safes, deepLoot }, 'doors', L.BANK_DOORS.length, 'cams', L.BANK_CAMS.length, 'guards', L.BANK_GUARD_ROUTES.length)
console.log('loot by zone', byZone.map((n, i) => `${i + 1}:${n}`).join(' '))
if (total < 2500 || total > 9000) {
  failed += 1
  console.log('FAIL  loot total outside 2500-9000')
}
if (deepLoot < 1400) {
  failed += 1
  console.log('FAIL  not enough loot after zone 10', deepLoot)
}
const emptyDeep = byZone.slice(10).filter((n) => n <= 0)
if (emptyDeep.length) {
  failed += 1
  console.log('FAIL  empty deep zones', byZone)
}
if (L.BANK_GUARD_ROUTES.length < 12) {
  failed += 1
  console.log('FAIL  not enough guard routes', L.BANK_GUARD_ROUTES.length)
}

if (failed) {
  console.error('bank layout check failed')
  process.exit(1)
}
console.log('bank layout check passed')
