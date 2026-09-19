// Dev-only sanity check: flood fill the bank and validate loot/guard placement.
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

/** Manhattan grid distance in pixels, -1 when unreachable. */
function dist(rects, from, to) {
  const cols = Math.ceil(L.BANK_W / CELL)
  const rows = Math.ceil(L.BANK_H / CELL)
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

const locked = baseWalls().concat(L.BANK_DOORS)
const open = baseWalls()
const spawn = L.BANK_SPAWN
const exit = L.BANK_EXIT
const safe = { x: L.BANK_SAFES[0].x - 110, y: L.BANK_SAFES[0].y }

const cases = [
  ['vault door locked: spawn -> exit', locked, spawn, exit],
  ['vault door locked: spawn -> hall centre', locked, spawn, { x: 860, y: 700 }],
  ['vault door locked: spawn -> vault is sealed', locked, spawn, safe],
  ['vault door open: spawn -> safe', open, spawn, safe],
  ['vault door open: safe -> exit (escape run)', open, safe, exit],
  ['west corridor: spawn -> west corridor loot', locked, spawn, { x: 170, y: 540 }],
  ['east corridor: spawn -> east corridor loot', locked, spawn, { x: 1560, y: 520 }],
]

let failed = 0
for (const [name, rects, from, to] of cases) {
  const d = dist(rects, from, to)
  const walkS = d < 0 ? '' : `  ~${d}px  ~${Math.round(d / 98)}s at loaded run speed`
  const sealed = name.includes('vault is sealed')
  const ok = sealed ? d < 0 : d >= 0
  if (!ok) failed += 1
  console.log(`${d >= 0 ? 'REACHABLE ' : 'BLOCKED   '} ${ok ? 'ok ' : 'FAIL '} ${name}${walkS}`)
}

for (const [i, route] of L.BANK_GUARD_ROUTES.entries()) {
  const bad = route.filter((p) => !walkable(open, p.x, p.y))
  if (bad.length) console.log(`guard ${i} waypoints inside geometry:`, bad)
  const unreachable = route.filter((p) => dist(open, route[0], p) < 0)
  if (unreachable.length) console.log(`guard ${i} waypoints unreachable:`, unreachable)
}

const badLoot = L.BANK_LOOT.filter((p) => !walkable(open, p.x, p.y) || dist(open, spawn, p) < 0)
if (badLoot.length) console.log('loot inside geometry or unreachable:', badLoot)
const badCams = L.BANK_CAMS.filter((c) => dist(open, spawn, { x: c.x, y: c.y }) < 0 && walkable(open, c.x, c.y))
if (badCams.length) console.log('cameras in sealed space:', badCams)

const total = L.BANK_LOOT.reduce((sum, p) => sum + Number(p.kind.slice(1)), 0)
const byKind = {}
for (const p of L.BANK_LOOT) byKind[p.kind] = (byKind[p.kind] ?? 0) + 1
console.log('floor loot', total, byKind, '+ safe', L.BANK_SAFES[0].reward)

// how much loot sits in each zone (y bands)
const zone = (p) => (p.y < 380 ? 'vault' : p.y < 900 ? 'hall' : 'lobby')
const zones = {}
for (const p of L.BANK_LOOT) zones[zone(p)] = (zones[zone(p)] ?? 0) + Number(p.kind.slice(1))
console.log('loot by zone', zones)

if (failed || badLoot.length) {
  console.error('bank layout check failed')
  process.exit(1)
}
