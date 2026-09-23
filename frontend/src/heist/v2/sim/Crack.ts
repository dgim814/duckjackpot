export type CrackKind = 'door' | 'safe'

export const SAFE_HITS = 3
export const DOOR_HITS = 2
const HIT_LOCK = 0.22
/** Target centres per round, so each round is read fresh instead of by rhythm. */
const CENTERS = [0.5, 0.68, 0.34, 0.6]

/**
 * Timing lock: a marker sweeps 0..1, the player taps inside the zone.
 * Each hit narrows the zone and speeds the marker up; a miss is noise.
 */
export class CrackGame {
  marker = 0.06
  dir = 1
  hits = 0
  lockUntil = 0
  missFlashUntil = 0

  constructor(
    readonly kind: CrackKind,
    readonly targetId: string,
    readonly need: number,
  ) {}

  get zoneWidth() {
    return Math.max(0.12, 0.22 - this.hits * 0.035)
  }

  get zoneCenter() {
    return CENTERS[this.hits % CENTERS.length]
  }

  get speed() {
    return 1.05 + this.hits * 0.3
  }

  step(dt: number) {
    this.marker += this.dir * this.speed * dt
    if (this.marker >= 1) {
      this.marker = 1
      this.dir = -1
    } else if (this.marker <= 0) {
      this.marker = 0
      this.dir = 1
    }
  }

  /** Returns 'hit', 'miss', 'done' or null when the tap is ignored (debounce). */
  tap(time: number): 'hit' | 'miss' | 'done' | null {
    if (time < this.lockUntil) return null
    this.lockUntil = time + HIT_LOCK
    if (Math.abs(this.marker - this.zoneCenter) <= this.zoneWidth / 2) {
      this.hits += 1
      return this.hits >= this.need ? 'done' : 'hit'
    }
    this.missFlashUntil = time + 0.35
    return 'miss'
  }
}
