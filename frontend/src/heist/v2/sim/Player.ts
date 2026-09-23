import type { HeistTuning } from '../../tuning'
import type { Box, SolidGrid } from './Collision'
import type { InputSample } from './Input'

export type Gait = 'idle' | 'walk' | 'run' | 'sneak' | 'dash'

/** Hitbox around the duck's feet: independent of how big the sprite is drawn. */
export const PLAYER_HW = 14
export const PLAYER_HH = 9

const NOISE = { idle: 0, sneak: 10, walk: 22, run: 35, dash: 80 } as const
const MOVE_DEADZONE = 0.08
/** Measured speed (px/s) that switches the visual cycle on / off. */
const ANIM_ON = 18
const ANIM_OFF = 8

export type PlayerContext = {
  cfg: HeistTuning['player']
  speedMul: number
  weightMul: number
  noiseMul: number
  silentShoes: boolean
  /** Stick magnitude where walking turns into running. */
  walkCut: number
  hidden: boolean
  locked: boolean
  time: number
  solids: SolidGrid
}

export class Player {
  readonly box: Box
  prevX: number
  prevY: number
  facingX = 1
  facingY = 0
  flip = false
  gait: Gait = 'idle'
  /** What the duck visibly does, derived from real displacement. */
  anim: Gait = 'idle'
  measured = 0
  noise = 0
  dashUntil = -1
  dashReadyAt = 0
  private runLatched = false
  private wasSneak = false
  sneakStarted = false
  dashed = false
  stepTimer = 0
  stepped = false

  constructor(x: number, y: number) {
    this.box = { x, y, hw: PLAYER_HW, hh: PLAYER_HH }
    this.prevX = x
    this.prevY = y
  }

  get x() {
    return this.box.x
  }

  get y() {
    return this.box.y
  }

  dashCooldown(time: number, cfg: HeistTuning['player']) {
    if (time >= this.dashReadyAt) return 0
    return Math.min(1, (this.dashReadyAt - time) / Math.max(0.001, cfg.dashCd / 1000))
  }

  step(dt: number, input: InputSample, ctx: PlayerContext) {
    this.prevX = this.box.x
    this.prevY = this.box.y
    this.dashed = false
    this.sneakStarted = false
    this.stepped = false
    const cfg = ctx.cfg

    if (ctx.locked) {
      this.gait = 'idle'
      this.noise = 0
      this.updateAnim(dt, 0)
      return
    }

    if (input.dash && ctx.time >= this.dashReadyAt) {
      this.dashUntil = ctx.time + cfg.dashMs / 1000
      this.dashReadyAt = ctx.time + cfg.dashCd / 1000
      this.dashed = true
    }

    const moving = input.mag > MOVE_DEADZONE
    let nx = 0
    let ny = 0
    if (moving) {
      nx = input.mx / input.mag
      ny = input.my / input.mag
      this.facingX = nx
      this.facingY = ny
    }
    if (!moving) this.runLatched = false
    else if (input.mag >= ctx.walkCut) this.runLatched = true
    else if (input.mag < ctx.walkCut * 0.7) this.runLatched = false

    const sneaking = input.sneak || ctx.hidden
    if (input.sneak && !this.wasSneak) this.sneakStarted = true
    this.wasSneak = input.sneak

    const dashing = ctx.time < this.dashUntil
    let speed = 0
    let gait: Gait = 'idle'
    if (dashing) {
      gait = 'dash'
      speed = cfg.dash
      if (!moving) {
        nx = this.facingX
        ny = this.facingY
      }
    } else if (moving && sneaking) {
      gait = 'sneak'
      speed = ctx.hidden ? cfg.sneak * cfg.hiddenSneakMul : cfg.sneak
    } else if (moving && !this.runLatched) {
      gait = 'walk'
      speed = cfg.run * cfg.walkMul * ctx.speedMul
    } else if (moving) {
      gait = 'run'
      speed = cfg.run * ctx.speedMul
    }
    if (gait !== 'dash') speed *= ctx.weightMul
    this.gait = gait

    const base = NOISE[gait]
    this.noise = (ctx.silentShoes ? base * 0.65 : base) * ctx.noiseMul

    if (speed > 0) {
      ctx.solids.move(this.box, nx * speed * dt, ny * speed * dt)
    }
    const dist = Math.hypot(this.box.x - this.prevX, this.box.y - this.prevY)
    const actual = dt > 0 ? dist / dt : 0
    if (Math.abs(this.box.x - this.prevX) > 0.05) this.flip = this.box.x < this.prevX
    this.updateAnim(dt, actual)

    if (this.anim !== 'idle' && this.anim !== 'dash') {
      this.stepTimer -= dt
      if (this.stepTimer <= 0) {
        this.stepTimer = this.anim === 'sneak' ? 0.42 : this.anim === 'walk' ? 0.32 : 0.26
        this.stepped = true
      }
    }
  }

  /** Smoothed real speed decides whether the legs move; the gait decides which cycle. */
  private updateAnim(dt: number, actual: number) {
    const k = 1 - Math.exp(-dt / 0.05)
    this.measured += (actual - this.measured) * k
    const was = this.anim !== 'idle'
    const moving = this.measured >= (was ? ANIM_OFF : ANIM_ON)
    if (!moving) this.anim = 'idle'
    else if (this.gait === 'idle') this.anim = 'walk'
    else this.anim = this.gait
  }

  teleport(x: number, y: number) {
    this.box.x = x
    this.box.y = y
    this.prevX = x
    this.prevY = y
    this.measured = 0
    this.anim = 'idle'
  }
}
