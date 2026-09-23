export type InputSample = {
  /** Normalised direction, length 0..1 (analog stick keeps its magnitude). */
  mx: number
  my: number
  mag: number
  sneak: boolean
  dash: boolean
  action: boolean
  actionHeld: boolean
  drop: boolean
}

type Edge = 'dash' | 'action' | 'drop' | 'pause'

const KEY_DIRS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
}

/**
 * Every input device writes here; the simulation reads one consistent sample
 * per step. Button presses are edges that survive until the next step reads
 * them, so a tap shorter than a frame is never lost.
 */
export class InputController {
  private stickX = 0
  private stickY = 0
  private keys = new Set<string>()
  private sneakTouch = false
  private actionTouch = false
  private edges = new Set<Edge>()
  private detach: (() => void) | null = null
  onPause: (() => void) | null = null

  attachKeyboard(target: Window = window) {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) {
        if (KEY_DIRS[e.code] || e.code.startsWith('Shift')) e.preventDefault()
        return
      }
      if (this.handleKey(e.code, true)) e.preventDefault()
    }
    const up = (e: KeyboardEvent) => {
      if (this.handleKey(e.code, false)) e.preventDefault()
    }
    const blur = () => this.releaseAll()
    const vis = () => {
      if (document.visibilityState === 'hidden') this.releaseAll()
    }
    target.addEventListener('keydown', down)
    target.addEventListener('keyup', up)
    target.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', vis)
    this.detach = () => {
      target.removeEventListener('keydown', down)
      target.removeEventListener('keyup', up)
      target.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', vis)
    }
  }

  dispose() {
    this.detach?.()
    this.detach = null
    this.onPause = null
    this.releaseAll()
  }

  private handleKey(code: string, down: boolean) {
    if (KEY_DIRS[code] || code === 'ShiftLeft' || code === 'ShiftRight') {
      if (down) this.keys.add(code)
      else this.keys.delete(code)
      return true
    }
    if (!down) {
      if (code === 'KeyE') this.keys.delete(code)
      return code === 'KeyE'
    }
    switch (code) {
      case 'Space':
        this.edges.add('dash')
        return true
      case 'KeyE':
      case 'Enter':
        this.keys.add('KeyE')
        this.edges.add('action')
        return true
      case 'KeyQ':
        this.edges.add('drop')
        return true
      case 'Escape':
      case 'KeyP':
        this.onPause?.()
        return true
      default:
        return false
    }
  }

  /** Virtual stick, already normalised to the knob radius (length ≤ 1). */
  setStick(x: number, y: number) {
    const len = Math.hypot(x, y)
    const k = len > 1 ? 1 / len : 1
    this.stickX = x * k
    this.stickY = y * k
  }

  setSneak(on: boolean) {
    this.sneakTouch = on
  }

  pressDash() {
    this.edges.add('dash')
  }

  pressDrop() {
    this.edges.add('drop')
  }

  setAction(on: boolean) {
    if (on && !this.actionTouch) this.edges.add('action')
    this.actionTouch = on
  }

  releaseAll() {
    this.stickX = 0
    this.stickY = 0
    this.keys.clear()
    this.sneakTouch = false
    this.actionTouch = false
    this.edges.clear()
  }

  /** Read by the fixed-step simulation. Edges are consumed. */
  sample(): InputSample {
    let kx = 0
    let ky = 0
    for (const code of this.keys) {
      const d = KEY_DIRS[code]
      if (!d) continue
      kx += d[0]
      ky += d[1]
    }
    let mx = this.stickX
    let my = this.stickY
    const kl = Math.hypot(kx, ky)
    if (kl > 0) {
      mx = kx / kl
      my = ky / kl
    }
    const mag = Math.min(1, Math.hypot(mx, my))
    const out: InputSample = {
      mx,
      my,
      mag,
      sneak: this.sneakTouch || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
      dash: this.edges.has('dash'),
      action: this.edges.has('action'),
      actionHeld: this.actionTouch || this.keys.has('KeyE'),
      drop: this.edges.has('drop'),
    }
    this.edges.clear()
    return out
  }
}
