import type { HeistTuning } from '../../tuning'
import type { RaidPhase } from './events'

const RANK: Record<RaidPhase, number> = { SAFE: 0, SUSPICIOUS: 1, DANGER: 2, CHASE: 3 }

export type AlertInputs = {
  chasing: boolean
  /** Strongest guard detection among guards that see the player right now (0 when none). */
  sightDetect: number
  anySight: boolean
  camSees: boolean
  heard: boolean
  hidden: boolean
  disguiseMul: number
}

/**
 * Raid alarm 0..1 and the phase derived from it. ALERT climbs on sight and
 * cameras and falls down a ladder of floors, each held for a few quiet seconds.
 */
export class Alert {
  value = 0
  phase: RaidPhase = 'SAFE'
  private quietT = 0
  changed: { phase: RaidPhase; rising: boolean } | null = null

  constructor(private cfg: HeistTuning['alert']) {}

  add(delta: number) {
    this.quietT = 0
    this.value = Math.max(0, Math.min(1, this.value + delta))
  }

  raiseTo(min: number) {
    this.quietT = 0
    this.value = Math.max(0, Math.min(1, Math.max(this.value, min)))
  }

  step(dt: number, s: AlertInputs) {
    const ac = this.cfg
    this.changed = null
    if (s.chasing) this.raiseTo(ac.chaseFloor)
    else if (s.anySight) this.add(dt * (ac.sightBase + s.sightDetect * ac.sightDetect) * s.disguiseMul)
    else if (s.camSees) this.quietT = 0
    else if (s.heard) this.raiseTo(ac.hearFloor)
    else this.decay(dt, s.hidden)
    this.updatePhase(s.chasing)
  }

  private decay(dt: number, hidden: boolean) {
    const ac = this.cfg
    const rate = hidden ? ac.decayHidden : ac.decay
    if (!ac.phasesEnabled) {
      this.value = Math.max(0, this.value - dt * rate)
      return
    }
    this.quietT += dt
    const steps = [
      { floor: ac.chaseFloor, hold: ac.stepHoldS.chase },
      { floor: ac.bandDanger, hold: ac.stepHoldS.danger },
      { floor: ac.bandSuspicious, hold: ac.stepHoldS.suspicious },
    ]
    const step = steps.find((st) => this.value > st.floor) ?? { floor: 0, hold: 0 }
    this.value = Math.max(step.floor, this.value - dt * rate)
    if (step.floor <= 0) return
    const hold = step.hold * (hidden ? ac.hiddenHoldMul : 1)
    if (this.value <= step.floor + 1e-4 && this.quietT >= hold) {
      this.value = Math.max(0, step.floor - 0.005)
      this.quietT = 0
    }
  }

  updatePhase(chasing: boolean) {
    const a = Math.round(this.value * 100)
    let next: RaidPhase = 'SAFE'
    if (chasing) next = 'CHASE'
    else if (a >= this.cfg.bandDanger * 100) next = 'DANGER'
    else if (a >= this.cfg.bandSuspicious * 100) next = 'SUSPICIOUS'
    if (next === this.phase) return
    const rising = RANK[next] > RANK[this.phase]
    this.phase = next
    this.changed = { phase: next, rising }
  }

  guardSpeedMul() {
    const ac = this.cfg
    if (!ac.phasesEnabled) return 1
    const key = this.phase === 'SAFE' ? 'safe' : this.phase === 'SUSPICIOUS' ? 'suspicious' : this.phase === 'DANGER' ? 'danger' : 'chase'
    return ac.guardSpeedMul[key] ?? 1
  }

  camSpeedMul() {
    const ac = this.cfg
    if (!ac.phasesEnabled) return 1
    const key = this.phase === 'SAFE' ? 'safe' : this.phase === 'SUSPICIOUS' ? 'suspicious' : this.phase === 'DANGER' ? 'danger' : 'chase'
    return ac.camSpeedMul[key] ?? 1
  }
}
