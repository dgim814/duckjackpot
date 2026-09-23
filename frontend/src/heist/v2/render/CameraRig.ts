import type Phaser from 'phaser'
import type { Rect } from '../level/LevelDef'

/** World units shown per CSS pixel is 1 / VIEW_ZOOM: the same framing as V1 (0.5). */
export const VIEW_ZOOM = 0.5
const LOOKAHEAD = 70
const LOOK_TAU = 0.45
/** Thumbs cover the bottom of the phone: keep the duck a little above centre. */
const BIAS_Y = 80

/**
 * The camera is pure math: it centres on the interpolated duck position plus a
 * smoothed look-ahead, clamps to the map, and writes scroll directly. There is
 * no rounding and no Phaser follow, so the image moves exactly as the duck does.
 */
export class CameraRig {
  private lookX = 0
  private lookY = 0
  private shakeT = 0
  private shakeAmp = 0
  private seeded = false
  cx = 0
  cy = 0

  constructor(
    private cam: Phaser.Cameras.Scene2D.Camera,
    private bounds: Rect,
    resolution: number,
  ) {
    cam.setZoom(VIEW_ZOOM * resolution)
    cam.setRoundPixels(false)
    cam.useBounds = false
  }

  setResolution(res: number) {
    this.cam.setZoom(VIEW_ZOOM * res)
  }

  shake(seconds: number, amp: number) {
    this.shakeT = Math.max(this.shakeT, seconds)
    this.shakeAmp = Math.max(this.shakeAmp, amp)
  }

  update(dt: number, x: number, y: number, vx: number, vy: number) {
    const speed = Math.hypot(vx, vy)
    const tx = speed > 20 ? (vx / speed) * LOOKAHEAD : 0
    const ty = speed > 20 ? (vy / speed) * LOOKAHEAD : 0
    const k = this.seeded ? 1 - Math.exp(-dt / LOOK_TAU) : 1
    this.seeded = true
    this.lookX += (tx - this.lookX) * k
    this.lookY += (ty - this.lookY) * k

    const cam = this.cam
    const halfW = cam.width / cam.zoom / 2
    const halfH = cam.height / cam.zoom / 2
    let cx = x + this.lookX
    let cy = y + this.lookY + BIAS_Y
    const b = this.bounds
    cx = b.w <= halfW * 2 ? b.x + b.w / 2 : Math.max(b.x + halfW, Math.min(b.x + b.w - halfW, cx))
    cy = b.h <= halfH * 2 ? b.y + b.h / 2 : Math.max(b.y + halfH, Math.min(b.y + b.h - halfH, cy))

    if (this.shakeT > 0) {
      this.shakeT = Math.max(0, this.shakeT - dt)
      const a = this.shakeAmp * (this.shakeT > 0 ? 1 : 0)
      cx += (Math.random() - 0.5) * a
      cy += (Math.random() - 0.5) * a
      if (this.shakeT === 0) this.shakeAmp = 0
    }
    this.cx = cx
    this.cy = cy
    cam.centerOn(cx, cy)
  }

  /** Visible world rectangle for culling and chunk baking. */
  view(): Rect {
    const cam = this.cam
    const w = cam.width / cam.zoom
    const h = cam.height / cam.zoom
    return { x: this.cx - w / 2, y: this.cy - h / 2, w, h }
  }
}
