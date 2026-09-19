import type { DuckCoinKind } from './coinAssets'
import type { HeistLevelId } from './heistLevel'

export type HeistTuning = {
  player: {
    sneak: number
    run: number
    dash: number
    walkMul: number
    hiddenSneakMul: number
    dashMs: number
    dashCd: number
  }
  guard: {
    patrol: number
    investigate: number
    chase: number
    search: number
    returning: number
    catchDist: number
  }
  vision: {
    guardDist: number
    guardFovDeg: number
    camDist: number
    camFovDeg: number
  }
  alert: {
    sightBase: number
    sightDetect: number
    cam: number
    hearFloor: number
    chaseFloor: number
    decay: number
    decayHidden: number
    bandSuspicious: number
    bandDanger: number
    safeMiss: number
    /** Raid phases: stepped decay plus world, guard and HUD reactions. */
    phasesEnabled: boolean
    /** Quiet seconds required at a step floor before ALERT drops into the band below. */
    stepHoldS: { chase: number; danger: number; suspicious: number }
    /** Hiding shortens the hold at every step. */
    hiddenHoldMul: number
    guardSpeedMul: { safe: number; suspicious: number; danger: number; chase: number }
    camSpeedMul: { safe: number; suspicious: number; danger: number; chase: number }
    /** On entering DANGER guards within this radius sweep towards the player. */
    sweepRadius: number
  }
  /** Weight never limits pickup, the DUCK COIN bag does. */
  weight: {
    enabled: boolean
    item: Record<DuckCoinKind, number>
    prize: number
    caps: readonly number[]
    penaltyStart: number
    maxSpeedPenalty: number
    maxNoiseBonus: number
    dropEnabled: boolean
    /** Guards within this radius of a dropped item go look at it. */
    dropLureRadius: number
    dropCooldownMs: number
    /** How long a dropped item stays unpickable, so it is not grabbed back instantly. */
    dropRepickupMs: number
    /** A chasing guard is distracted only when it has lost sight of the player. */
    dropDistractsChase: boolean
  }
  /** Safe climax: siren, forced ALERT, escape countdown and the changed route out. */
  escape: {
    enabled: boolean
    timerS: number
    /** ALERT is pushed at least this high the moment the safe pops. */
    sirenAlert: number
    hitStopMs: number
    /** Close the usual way out and open the emergency passage. */
    routeChange: boolean
  }
  /** null keeps every guard and camera defined by the level. */
  counts: {
    guards: number | null
    cams: number | null
  }
  camera: {
    /** Below 1 shows more of the map; the HUD keeps its own unzoomed camera. */
    zoom: number
  }
}

export type TuningPatch = {
  [K in keyof HeistTuning]?: Partial<HeistTuning[K]>
}

export const DEFAULT_TUNING: HeistTuning = {
  player: {
    sneak: 70,
    run: 140,
    dash: 320,
    walkMul: 0.72,
    hiddenSneakMul: 0.82,
    dashMs: 200,
    dashCd: 1100,
  },
  guard: {
    patrol: 86,
    investigate: 118,
    chase: 168,
    search: 86,
    returning: 96,
    catchDist: 28,
  },
  vision: {
    guardDist: 255,
    guardFovDeg: 54,
    camDist: 210,
    camFovDeg: 46,
  },
  alert: {
    sightBase: 0.32,
    sightDetect: 0.4,
    cam: 0.42,
    hearFloor: 0.22,
    chaseFloor: 0.95,
    decay: 0.055,
    decayHidden: 0.14,
    bandSuspicious: 0.3,
    bandDanger: 0.7,
    safeMiss: 0.2,
    phasesEnabled: false,
    stepHoldS: { chase: 5, danger: 4, suspicious: 2.5 },
    hiddenHoldMul: 0.6,
    guardSpeedMul: { safe: 1, suspicious: 1.06, danger: 1.14, chase: 1 },
    camSpeedMul: { safe: 1, suspicious: 1.15, danger: 1.3, chase: 1.3 },
    sweepRadius: 420,
  },
  weight: {
    enabled: false,
    item: { C5: 1, C10: 2, C50: 4, C100: 6 },
    prize: 8,
    caps: [20, 26, 32, 38],
    penaltyStart: 0.5,
    maxSpeedPenalty: 0.3,
    maxNoiseBonus: 0.4,
    dropEnabled: true,
    dropLureRadius: 280,
    dropCooldownMs: 450,
    dropRepickupMs: 1400,
    dropDistractsChase: true,
  },
  escape: {
    enabled: false,
    timerS: 70,
    sirenAlert: 0.75,
    hitStopMs: 220,
    routeChange: true,
  },
  counts: {
    guards: null,
    cams: null,
  },
  camera: {
    zoom: 0.5,
  },
}

/** Zoom out ~25% from 0.64, then nudge by phone size so iPhone SE and Pro Max both read. */
export function adaptiveCameraZoom(viewW: number, viewH: number, base = DEFAULT_TUNING.camera.zoom) {
  const short = Math.min(viewW, viewH)
  const long = Math.max(viewW, viewH)
  const aspect = long / Math.max(1, short)
  let zoom = base
  if (short < 360) zoom = base * 0.92
  else if (short < 390) zoom = base * 0.97
  else if (short >= 430) zoom = base * 1.06
  if (aspect > 2.05) zoom *= 0.95
  return Math.max(0.4, Math.min(0.6, zoom))
}

/**
 * Bank teaches the full loop with softer numbers, mansion is the real thing.
 */
const LEVEL_TUNING: Record<HeistLevelId, TuningPatch> = {
  bank: {
    weight: { enabled: true, penaltyStart: 0.6, maxSpeedPenalty: 0.18, maxNoiseBonus: 0.25 },
    alert: { phasesEnabled: true, stepHoldS: { chase: 3.5, danger: 2.8, suspicious: 1.8 } },
    escape: { enabled: true, timerS: 50, sirenAlert: 0.72, routeChange: false },
  },
  mansion: { weight: { enabled: true }, alert: { phasesEnabled: true }, escape: { enabled: true } },
}

export function mergeTuning(base: HeistTuning, patch?: TuningPatch): HeistTuning {
  if (!patch) return base
  const out = { ...base }
  for (const key of Object.keys(patch) as (keyof HeistTuning)[]) {
    const section = patch[key]
    if (!section) continue
    Object.assign(out, { [key]: { ...base[key], ...section } })
  }
  return out
}

export function levelTuning(id: HeistLevelId, debug?: TuningPatch): HeistTuning {
  return mergeTuning(mergeTuning(DEFAULT_TUNING, LEVEL_TUNING[id]), debug)
}
