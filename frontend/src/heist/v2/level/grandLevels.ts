import type { GrandLevelId } from '../../heistLevel'
import type { DuckCoinKind } from '../../coinAssets'
import type { LevelDef } from './LevelDef'
import { buildGrandLevel, type GrandRoom, type GrandSpec } from './grand'

/*
 * LEVEL 3 PRIVATE BANK (50) → LEVEL 4 BLACK MARKET (60) → LEVEL 5 GRAND VAULT (70).
 * Each step: more floors, more of the door column locked, more and richer
 * safes, a denser camera net and a few more patrols — never a wall of guards.
 */

function hashN(i: number, seed: number) {
  let h = (i * 73856093) ^ (seed * 19349663)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff
}

/** Loot curve: pocket change at the door, fortunes at the bottom; full-width halls carry a bit more. */
function lootCurve(base: { c50: [number, number]; c100: [number, number]; finale: [number, number] }, zones: number, seed: number) {
  return (i: number, d: number): [number, number, number, number] => {
    const idx = i % 10
    const big = idx === 0 || idx === 9 ? 1.3 : 1
    const n = hashN(i, seed) - 0.5
    const c5 = Math.max(1, Math.round((6 - 2.5 * d + n) * big))
    const c10 = Math.max(1, Math.round((4 + 2 * d - n) * big))
    let c50 = Math.max(0, Math.round((base.c50[0] + base.c50[1] * d + n) * big))
    let c100 = Math.max(0, Math.round((base.c100[0] + base.c100[1] * d - n) * big))
    if (i === zones - 1) {
      c50 += base.finale[0]
      c100 += base.finale[1]
    }
    return [c5, c10, c50, c100]
  }
}

type SafeRow = [number, number, DuckCoinKind]
const safes = (rows: SafeRow[]) => rows.map(([zone, reward, extra]) => ({ zone, reward, extra }))

const L3_ROOMS: GrandRoom[] = [
  { key: 'heistL3z1', kit: 'lobby', floor: 'marble', light: 'warm' },
  { key: 'heistL3z2', kit: 'checkpoint', floor: 'tiles', light: 'cool' },
  { key: 'heistL3z3', kit: 'reception', floor: 'glass', light: 'cool' },
  { key: 'heistL3z4', kit: 'atrium', floor: 'marbleWhite', light: 'warm' },
  { key: 'heistL3z5', kit: 'lounge', floor: 'carpetBlue', light: 'warm' },
  { key: 'heistL3z6', kit: 'guardPost', floor: 'steel', light: 'blue' },
  { key: 'heistL3z7', kit: 'cashHall', floor: 'marble', light: 'warm' },
  { key: 'heistL3z8', kit: 'deposit', floor: 'vault', light: 'gold' },
  { key: 'heistL3z9', kit: 'corridor', floor: 'tiles', light: 'dim' },
  { key: 'heistL3z10', kit: 'stairs', floor: 'glass', light: 'cool' },
  { key: 'heistL3z11', kit: 'atrium', floor: 'marbleWhite', light: 'gold' },
  { key: 'heistL3z12', kit: 'office', floor: 'wood', light: 'warm' },
  { key: 'heistL3z13', kit: 'lounge', floor: 'carpetBlue', light: 'warm' },
  { key: 'heistL3z14', kit: 'office', floor: 'glass', light: 'cool' },
  { key: 'heistL3z15', kit: 'lounge', floor: 'wood', light: 'dim' },
  { key: 'heistL3z16', kit: 'deposit', floor: 'vault', light: 'gold' },
  { key: 'heistL3z17', kit: 'gallery', floor: 'glass', light: 'cool' },
  { key: 'heistL3z18', kit: 'archive', floor: 'carpetBlue', light: 'dim' },
  { key: 'heistL3z19', kit: 'cashHall', floor: 'gold', light: 'gold' },
  { key: 'heistL3z20', kit: 'stairs', floor: 'glass', light: 'cool' },
  { key: 'heistL3z21', kit: 'openOffice', floor: 'carpetBlue', light: 'cool' },
  { key: 'heistL3z22', kit: 'boardroom', floor: 'wood', light: 'warm' },
  { key: 'heistL3z23', kit: 'openOffice', floor: 'carpetBlue', light: 'cool' },
  { key: 'heistL3z24', kit: 'office', floor: 'wood', light: 'warm' },
  { key: 'heistL3z25', kit: 'archive', floor: 'carpetBlue', light: 'dim' },
  { key: 'heistL3z26', kit: 'office', floor: 'glass', light: 'cool' },
  { key: 'heistL3z27', kit: 'archive', floor: 'tiles', light: 'dim' },
  { key: 'heistL3z28', kit: 'safeRoom', floor: 'vault', light: 'gold' },
  { key: 'heistL3z29', kit: 'lounge', floor: 'glass', light: 'cool' },
  { key: 'heistL3z30', kit: 'stairs', floor: 'marbleWhite', light: 'warm' },
  { key: 'heistL3z31', kit: 'control', floor: 'steel', light: 'blue' },
  { key: 'heistL3z32', kit: 'server', floor: 'server', light: 'blue' },
  { key: 'heistL3z33', kit: 'server', floor: 'steel', light: 'cool' },
  { key: 'heistL3z34', kit: 'control', floor: 'steel', light: 'blue' },
  { key: 'heistL3z35', kit: 'safeRoom', floor: 'server', light: 'blue' },
  { key: 'heistL3z36', kit: 'corridor', floor: 'steel', light: 'dim' },
  { key: 'heistL3z37', kit: 'laser', floor: 'glass', light: 'blue' },
  { key: 'heistL3z38', kit: 'control', floor: 'steel', light: 'blue' },
  { key: 'heistL3z39', kit: 'server', floor: 'server', light: 'blue' },
  { key: 'heistL3z40', kit: 'stairs', floor: 'steel', light: 'cool' },
  { key: 'heistL3z41', kit: 'atrium', floor: 'vault', light: 'gold' },
  { key: 'heistL3z42', kit: 'bullion', floor: 'gold', light: 'gold' },
  { key: 'heistL3z43', kit: 'vaultRow', floor: 'vault', light: 'gold' },
  { key: 'heistL3z44', kit: 'jewels', floor: 'marbleWhite', light: 'gold' },
  { key: 'heistL3z45', kit: 'vaultRow', floor: 'vault', light: 'dim' },
  { key: 'heistL3z46', kit: 'laser', floor: 'steel', light: 'blue' },
  { key: 'heistL3z47', kit: 'bullion', floor: 'gold', light: 'gold' },
  { key: 'heistL3z48', kit: 'safeRoom', floor: 'vault', light: 'gold' },
  { key: 'heistL3z49', kit: 'maze', floor: 'steel', light: 'cool' },
  { key: 'heistL3z50', kit: 'finale', floor: 'gold', light: 'gold' },
]

const L4_ROOMS: GrandRoom[] = [
  { key: 'heistL4z1', kit: 'lobby', floor: 'bunker', light: 'dim' },
  { key: 'heistL4z2', kit: 'reception', floor: 'wood', light: 'warm' },
  { key: 'heistL4z3', kit: 'corridor', floor: 'carpetRed', light: 'warm' },
  { key: 'heistL4z4', kit: 'checkpoint', floor: 'bunker', light: 'dim' },
  { key: 'heistL4z5', kit: 'lounge', floor: 'wood', light: 'dim' },
  { key: 'heistL4z6', kit: 'guardPost', floor: 'concrete', light: 'cool' },
  { key: 'heistL4z7', kit: 'bar', floor: 'wood', light: 'warm' },
  { key: 'heistL4z8', kit: 'casino', floor: 'carpetRed', light: 'warm' },
  { key: 'heistL4z9', kit: 'corridor', floor: 'mansionStone', light: 'dim' },
  { key: 'heistL4z10', kit: 'stairs', floor: 'bunker', light: 'dim' },
  { key: 'heistL4z11', kit: 'lounge', floor: 'carpetRed', light: 'warm' },
  { key: 'heistL4z12', kit: 'gallery', floor: 'wood', light: 'gold' },
  { key: 'heistL4z13', kit: 'casino', floor: 'carpetRed', light: 'warm' },
  { key: 'heistL4z14', kit: 'lounge', floor: 'carpetRed', light: 'dim' },
  { key: 'heistL4z15', kit: 'cellar', floor: 'mansionStone', light: 'dim' },
  { key: 'heistL4z16', kit: 'office', floor: 'wood', light: 'warm' },
  { key: 'heistL4z17', kit: 'jewels', floor: 'marbleWhite', light: 'gold' },
  { key: 'heistL4z18', kit: 'gallery', floor: 'carpetRed', light: 'dim' },
  { key: 'heistL4z19', kit: 'casino', floor: 'ballroom', light: 'gold' },
  { key: 'heistL4z20', kit: 'stairs', floor: 'carpetRed', light: 'warm' },
  { key: 'heistL4z21', kit: 'bunker', floor: 'bunker', light: 'dim' },
  { key: 'heistL4z22', kit: 'bunker', floor: 'concrete', light: 'dim' },
  { key: 'heistL4z23', kit: 'crates', floor: 'storage', light: 'dim' },
  { key: 'heistL4z24', kit: 'crates', floor: 'storage', light: 'dim' },
  { key: 'heistL4z25', kit: 'lab', floor: 'concrete', light: 'cool' },
  { key: 'heistL4z26', kit: 'lab', floor: 'tiles', light: 'cool' },
  { key: 'heistL4z27', kit: 'crates', floor: 'steel', light: 'cool' },
  { key: 'heistL4z28', kit: 'secret', floor: 'mansionStone', light: 'dim' },
  { key: 'heistL4z29', kit: 'crates', floor: 'steel', light: 'dim' },
  { key: 'heistL4z30', kit: 'stairs', floor: 'bunker', light: 'dim' },
  { key: 'heistL4z31', kit: 'barracks', floor: 'concrete', light: 'dim' },
  { key: 'heistL4z32', kit: 'control', floor: 'steel', light: 'blue' },
  { key: 'heistL4z33', kit: 'laser', floor: 'bunker', light: 'dim' },
  { key: 'heistL4z34', kit: 'control', floor: 'steel', light: 'blue' },
  { key: 'heistL4z35', kit: 'server', floor: 'server', light: 'blue' },
  { key: 'heistL4z36', kit: 'office', floor: 'steel', light: 'cool' },
  { key: 'heistL4z37', kit: 'control', floor: 'bunker', light: 'dim' },
  { key: 'heistL4z38', kit: 'maze', floor: 'steel', light: 'dim' },
  { key: 'heistL4z39', kit: 'checkpoint', floor: 'steel', light: 'cool' },
  { key: 'heistL4z40', kit: 'stairs', floor: 'bunker', light: 'dim' },
  { key: 'heistL4z41', kit: 'vaultRow', floor: 'vault', light: 'gold' },
  { key: 'heistL4z42', kit: 'collection', floor: 'vault', light: 'gold' },
  { key: 'heistL4z43', kit: 'collection', floor: 'mansionStone', light: 'dim' },
  { key: 'heistL4z44', kit: 'jewels', floor: 'vault', light: 'gold' },
  { key: 'heistL4z45', kit: 'jewels', floor: 'marbleWhite', light: 'gold' },
  { key: 'heistL4z46', kit: 'bullion', floor: 'vault', light: 'gold' },
  { key: 'heistL4z47', kit: 'gallery', floor: 'vault', light: 'dim' },
  { key: 'heistL4z48', kit: 'safeRoom', floor: 'vault', light: 'dim' },
  { key: 'heistL4z49', kit: 'secret', floor: 'mansionStone', light: 'dim' },
  { key: 'heistL4z50', kit: 'stairs', floor: 'vault', light: 'gold' },
  { key: 'heistL4z51', kit: 'maze', floor: 'bunker', light: 'dim' },
  { key: 'heistL4z52', kit: 'archive', floor: 'wood', light: 'dim' },
  { key: 'heistL4z53', kit: 'bullion', floor: 'gold', light: 'gold' },
  { key: 'heistL4z54', kit: 'jewels', floor: 'marbleWhite', light: 'gold' },
  { key: 'heistL4z55', kit: 'office', floor: 'carpetRed', light: 'warm' },
  { key: 'heistL4z56', kit: 'treasury', floor: 'gold', light: 'gold' },
  { key: 'heistL4z57', kit: 'collection', floor: 'gold', light: 'gold' },
  { key: 'heistL4z58', kit: 'guardPost', floor: 'steel', light: 'blue' },
  { key: 'heistL4z59', kit: 'maze', floor: 'vault', light: 'cool' },
  { key: 'heistL4z60', kit: 'finale', floor: 'gold', light: 'gold' },
]

const L5_ROOMS: GrandRoom[] = [
  { key: 'heistL5z1', kit: 'lobby', floor: 'blackMarble', light: 'gold' },
  { key: 'heistL5z2', kit: 'reception', floor: 'gold', light: 'gold' },
  { key: 'heistL5z3', kit: 'atrium', floor: 'blackMarble', light: 'warm' },
  { key: 'heistL5z4', kit: 'fountain', floor: 'blackMarble', light: 'gold' },
  { key: 'heistL5z5', kit: 'reception', floor: 'carpetRed', light: 'warm' },
  { key: 'heistL5z6', kit: 'guardPost', floor: 'blackMarble', light: 'cool' },
  { key: 'heistL5z7', kit: 'corridor', floor: 'marbleWhite', light: 'warm' },
  { key: 'heistL5z8', kit: 'fountain', floor: 'blackMarble', light: 'gold' },
  { key: 'heistL5z9', kit: 'corridor', floor: 'carpetRed', light: 'warm' },
  { key: 'heistL5z10', kit: 'stairs', floor: 'blackMarble', light: 'gold' },
  { key: 'heistL5z11', kit: 'atrium', floor: 'gold', light: 'gold' },
  { key: 'heistL5z12', kit: 'lounge', floor: 'ballroom', light: 'gold' },
  { key: 'heistL5z13', kit: 'casino', floor: 'carpetRed', light: 'gold' },
  { key: 'heistL5z14', kit: 'casino', floor: 'ballroom', light: 'warm' },
  { key: 'heistL5z15', kit: 'bullion', floor: 'gold', light: 'gold' },
  { key: 'heistL5z16', kit: 'lounge', floor: 'carpetRed', light: 'warm' },
  { key: 'heistL5z17', kit: 'library', floor: 'wood', light: 'warm' },
  { key: 'heistL5z18', kit: 'library', floor: 'wood', light: 'gold' },
  { key: 'heistL5z19', kit: 'safeRoom', floor: 'gold', light: 'gold' },
  { key: 'heistL5z20', kit: 'stairs', floor: 'gold', light: 'gold' },
  { key: 'heistL5z21', kit: 'collection', floor: 'blackMarble', light: 'gold' },
  { key: 'heistL5z22', kit: 'atrium', floor: 'marbleWhite', light: 'warm' },
  { key: 'heistL5z23', kit: 'gallery', floor: 'parquet', light: 'warm' },
  { key: 'heistL5z24', kit: 'jewels', floor: 'blackMarble', light: 'gold' },
  { key: 'heistL5z25', kit: 'collection', floor: 'wood', light: 'warm' },
  { key: 'heistL5z26', kit: 'jewels', floor: 'marbleWhite', light: 'gold' },
  { key: 'heistL5z27', kit: 'bullion', floor: 'vault', light: 'gold' },
  { key: 'heistL5z28', kit: 'safeRoom', floor: 'vault', light: 'gold' },
  { key: 'heistL5z29', kit: 'secret', floor: 'carpetRed', light: 'dim' },
  { key: 'heistL5z30', kit: 'stairs', floor: 'blackMarble', light: 'gold' },
  { key: 'heistL5z31', kit: 'control', floor: 'steel', light: 'blue' },
  { key: 'heistL5z32', kit: 'control', floor: 'steel', light: 'blue' },
  { key: 'heistL5z33', kit: 'laser', floor: 'blackMarble', light: 'blue' },
  { key: 'heistL5z34', kit: 'laser', floor: 'steel', light: 'blue' },
  { key: 'heistL5z35', kit: 'barracks', floor: 'steel', light: 'cool' },
  { key: 'heistL5z36', kit: 'checkpoint', floor: 'steel', light: 'blue' },
  { key: 'heistL5z37', kit: 'laser', floor: 'glass', light: 'blue' },
  { key: 'heistL5z38', kit: 'maze', floor: 'vault', light: 'dim' },
  { key: 'heistL5z39', kit: 'secret', floor: 'blackMarble', light: 'dim' },
  { key: 'heistL5z40', kit: 'stairs', floor: 'steel', light: 'cool' },
  { key: 'heistL5z41', kit: 'vaultRow', floor: 'vault', light: 'gold' },
  { key: 'heistL5z42', kit: 'maze', floor: 'steel', light: 'dim' },
  { key: 'heistL5z43', kit: 'vaultRow', floor: 'vault', light: 'gold' },
  { key: 'heistL5z44', kit: 'bullion', floor: 'marbleWhite', light: 'cool' },
  { key: 'heistL5z45', kit: 'maze', floor: 'vault', light: 'dim' },
  { key: 'heistL5z46', kit: 'deposit', floor: 'vault', light: 'gold' },
  { key: 'heistL5z47', kit: 'jewels', floor: 'mansionStone', light: 'gold' },
  { key: 'heistL5z48', kit: 'safeRoom', floor: 'vault', light: 'gold' },
  { key: 'heistL5z49', kit: 'corridor', floor: 'steel', light: 'dim' },
  { key: 'heistL5z50', kit: 'stairs', floor: 'vault', light: 'gold' },
  { key: 'heistL5z51', kit: 'treasury', floor: 'gold', light: 'gold' },
  { key: 'heistL5z52', kit: 'bullion', floor: 'gold', light: 'gold' },
  { key: 'heistL5z53', kit: 'lab', floor: 'steel', light: 'gold' },
  { key: 'heistL5z54', kit: 'lab', floor: 'gold', light: 'gold' },
  { key: 'heistL5z55', kit: 'office', floor: 'blackMarble', light: 'gold' },
  { key: 'heistL5z56', kit: 'vaultRow', floor: 'marbleWhite', light: 'cool' },
  { key: 'heistL5z57', kit: 'archive', floor: 'wood', light: 'gold' },
  { key: 'heistL5z58', kit: 'safeRoom', floor: 'gold', light: 'gold' },
  { key: 'heistL5z59', kit: 'maze', floor: 'blackMarble', light: 'gold' },
  { key: 'heistL5z60', kit: 'stairs', floor: 'gold', light: 'gold' },
  { key: 'heistL5z61', kit: 'atrium', floor: 'blackMarble', light: 'gold' },
  { key: 'heistL5z62', kit: 'corridor', floor: 'gold', light: 'gold' },
  { key: 'heistL5z63', kit: 'treasury', floor: 'gold', light: 'gold' },
  { key: 'heistL5z64', kit: 'jewels', floor: 'blackMarble', light: 'gold' },
  { key: 'heistL5z65', kit: 'bullion', floor: 'gold', light: 'gold' },
  { key: 'heistL5z66', kit: 'treasury', floor: 'blackMarble', light: 'gold' },
  { key: 'heistL5z67', kit: 'guardPost', floor: 'blackMarble', light: 'blue' },
  { key: 'heistL5z68', kit: 'treasury', floor: 'gold', light: 'gold' },
  { key: 'heistL5z69', kit: 'maze', floor: 'blackMarble', light: 'gold' },
  { key: 'heistL5z70', kit: 'finale', floor: 'gold', light: 'gold' },
]

export const GRAND_SPECS: Record<GrandLevelId, GrandSpec> = {
  level3: {
    id: 'level3',
    prefix: 'l3',
    floors: 5,
    rooms: L3_ROOMS,
    splitByFloor: [1000, 1000, 2000, 1000, 1000],
    lockAt: (f, k) => (k === 1 && f >= 1) || (k === 2 && f >= 3),
    archAt: (f, k) => (f >= 1 && (k === 1 || k === 2)) || (f >= 2 && k === 3),
    lockedSide: [16, 24, 33, 39, 42, 47],
    safes: safes([
      [8, 150, 'C50'], [16, 200, 'C50'], [19, 200, 'C100'], [24, 250, 'C100'], [28, 300, 'C100'], [33, 300, 'C100'],
      [35, 350, 'C100'], [39, 350, 'C100'], [42, 400, 'C100'], [45, 450, 'C100'], [47, 500, 'C100'], [48, 600, 'C100'],
    ]),
    loot: lootCurve({ c50: [1, 4.5], c100: [0.4, 4.6], finale: [4, 6] }, 50, 3),
    camsPerBand: (f, k) => (f === 0 ? (k === 1 || k === 3 ? 1 : 0) : f >= 3 && (k === 2 || k === 3) ? 2 : 1),
    camSpeed: (f) => 0.4 + f * 0.03,
    guardsPerBand: (f, k) => (f === 0 ? (k >= 2 ? 1 : 0) : f >= 3 && (k === 2 || k === 3) ? 2 : 1),
    background: 0x0a0e16,
    runner: { base: 0x14243a, gold: 0x2a3a52, edge: 0x8ec8f0 },
  },
  level4: {
    id: 'level4',
    prefix: 'l4',
    floors: 6,
    rooms: L4_ROOMS,
    splitByFloor: [1000, 1000, 2000, 1000, 2000, 2000],
    lockAt: (f, k) => (k === 1 && f >= 1) || (k === 2 && f >= 2) || (k === 0 && f >= 4),
    archAt: (f, k) => (f >= 1 && k === 2) || (f >= 2 && (k === 1 || k === 3)),
    lockedSide: [12, 17, 26, 37, 44, 46, 53, 56],
    safes: safes([
      [8, 200, 'C50'], [12, 200, 'C50'], [17, 250, 'C100'], [19, 300, 'C100'], [26, 300, 'C100'], [28, 350, 'C100'],
      [35, 400, 'C100'], [37, 400, 'C100'], [42, 450, 'C100'], [44, 450, 'C100'], [46, 500, 'C100'], [48, 550, 'C100'],
      [53, 600, 'C100'], [56, 700, 'C100'], [57, 800, 'C100'],
    ]),
    loot: lootCurve({ c50: [1.5, 5], c100: [0.8, 5.4], finale: [5, 8] }, 60, 4),
    camsPerBand: (f, k) => (f === 0 ? (k === 1 || k === 3 ? 1 : 0) : f >= 2 && (k === 2 || k === 3) ? 2 : 1),
    camSpeed: (f) => 0.42 + f * 0.03,
    guardsPerBand: (f, k) => (f === 0 ? (k >= 2 ? 1 : 0) : f >= 2 && (k === 2 || k === 3) ? 2 : f === 2 && k === 3 ? 2 : 1),
    background: 0x0c0909,
    runner: { base: 0x3a0c10, gold: 0x2a0a0c, edge: 0xc8323a },
  },
  level5: {
    id: 'level5',
    prefix: 'l5',
    floors: 7,
    rooms: L5_ROOMS,
    splitByFloor: [1000, 2000, 1000, 2000, 2000, 1000, 2000],
    lockAt: (f, k) => k === 1 || (k === 2 && f >= 1) || (k === 0 && f >= 3),
    archAt: (f, k) => (f >= 1 && k === 1) || (f >= 2 && (k === 2 || k === 3)),
    lockedSide: [19, 24, 26, 36, 43, 46, 47, 52, 54, 63],
    safes: safes([
      [8, 250, 'C50'], [15, 300, 'C100'], [19, 350, 'C100'], [24, 350, 'C100'], [26, 400, 'C100'], [28, 450, 'C100'],
      [36, 450, 'C100'], [38, 500, 'C100'], [43, 500, 'C100'], [46, 550, 'C100'], [47, 600, 'C100'], [48, 650, 'C100'],
      [52, 700, 'C100'], [54, 750, 'C100'], [58, 800, 'C100'], [63, 900, 'C100'], [65, 950, 'C100'], [68, 1000, 'C100'],
    ]),
    loot: lootCurve({ c50: [2, 5.5], c100: [1, 6.5], finale: [6, 10] }, 70, 5),
    camsPerBand: (f, k) => (f === 0 ? (k === 1 || k === 3 ? 1 : 0) : (k === 2 || k === 3) && f >= 1 ? 2 : 1),
    camSpeed: (f) => 0.44 + f * 0.03,
    guardsPerBand: (f, k) => (f === 0 ? (k >= 2 ? 1 : 0) : f >= 3 && (k === 2 || k === 3) ? 2 : f >= 5 && k === 1 ? 2 : 1),
    background: 0x0a0805,
    runner: { base: 0x120e08, gold: 0x3a2808, edge: 0xffd65a },
  },
}

export const GRAND_ZONES: Record<GrandLevelId, number> = { level3: 50, level4: 60, level5: 70 }

export function grandLevel(id: GrandLevelId): LevelDef {
  return buildGrandLevel(GRAND_SPECS[id])
}
