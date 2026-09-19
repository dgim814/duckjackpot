import { DEFAULT_TUNING, levelTuning, mergeTuning, type HeistTuning, type TuningPatch } from './tuning'
import type { HeistLevelId } from './heistLevel'

let overrides: TuningPatch = {}
let version = 0

export function debugTuning(): TuningPatch {
  return overrides
}

export function debugTuningVersion() {
  return version
}

export function setDebugTuning(patch: TuningPatch) {
  const next: TuningPatch = { ...overrides }
  for (const key of Object.keys(patch) as (keyof HeistTuning)[]) {
    const section = patch[key]
    if (!section) continue
    Object.assign(next, { [key]: { ...overrides[key], ...section } })
  }
  overrides = next
  version += 1
  return overrides
}

export function resetDebugTuning() {
  overrides = {}
  version += 1
}

export function resolveTuning(id: HeistLevelId) {
  return levelTuning(id, overrides)
}

type DebugApi = {
  get: (id?: HeistLevelId) => HeistTuning
  defaults: () => HeistTuning
  set: (patch: TuningPatch) => TuningPatch
  reset: () => void
}

export function exposeDebugTuning(id: HeistLevelId) {
  const w = window as Window & { __heistCfg?: DebugApi }
  w.__heistCfg = {
    get: (level = id) => resolveTuning(level),
    defaults: () => mergeTuning(DEFAULT_TUNING),
    set: (patch) => setDebugTuning(patch),
    reset: () => resetDebugTuning(),
  }
}
