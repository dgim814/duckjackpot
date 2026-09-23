import type { DuckCoinKind } from '../../coinAssets'

export type RaidPhase = 'SAFE' | 'SUSPICIOUS' | 'DANGER' | 'CHASE'

/**
 * Everything the outside world (render, audio, HUD) may react to. The
 * simulation only appends; consumers drain the queue once per frame.
 */
export type RaidEvent =
  | { t: 'pickup'; x: number; y: number; value: number; kind: DuckCoinKind }
  | { t: 'bagFull' }
  | { t: 'drop'; x: number; y: number; value: number }
  | { t: 'dash' }
  | { t: 'step'; sneak: boolean }
  | { t: 'sneakStart' }
  | { t: 'crackStart'; kind: 'door' | 'safe' }
  | { t: 'crackHit'; hits: number; need: number }
  | { t: 'crackMiss' }
  | { t: 'doorOpened'; id: string }
  | { t: 'safeOpened'; id: string; reward: number; x: number; y: number }
  | { t: 'siren' }
  | { t: 'cameraAlert' }
  | { t: 'investigate' }
  | { t: 'chaseStart' }
  | { t: 'chaseStop' }
  | { t: 'phase'; phase: RaidPhase; rising: boolean }
  | { t: 'zone'; i: number; deeper: boolean }
  | { t: 'firstLoot' }
  | { t: 'exitHold'; progress: number }
  | { t: 'ended'; verdict: 'escaped' | 'caught' | 'aborted' }
