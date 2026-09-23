import type { HeistTuning } from '../../tuning'
import type { CamDef, Vec } from '../level/LevelDef'
import type { SolidGrid } from './Collision'
import { wrapAngle } from './Guards'

export type SecCam = CamDef & { facing: number; hot: boolean; active: boolean }

/**
 * Sweeping cameras. Only cameras within reach of the player run the cone
 * test; the rest just keep sweeping for the renderer.
 */
export class CamSystem {
  readonly cams: SecCam[]
  private clock = 0
  sees = false
  newlyHot = false

  constructor(defs: CamDef[]) {
    this.cams = defs.map((c) => ({ ...c, facing: c.base, hot: false, active: false }))
  }

  step(dt: number, cfg: HeistTuning, player: Vec, hidden: boolean, disguiseMul: number, speedMul: number, solids: SolidGrid) {
    this.clock += dt * speedMul
    this.sees = false
    this.newlyHot = false
    const dist = cfg.vision.camDist * disguiseMul
    const half = (cfg.vision.camFovDeg * Math.PI) / 360
    const reach = cfg.vision.camDist + 60
    for (const cam of this.cams) {
      cam.facing = cam.base + Math.sin(this.clock * cam.speed) * cam.sweep
      cam.active = Math.abs(cam.x - player.x) < reach && Math.abs(cam.y - player.y) < reach
      if (!cam.active) {
        cam.hot = false
        continue
      }
      const dx = player.x - cam.x
      const dy = player.y - cam.y
      const d = Math.hypot(dx, dy)
      let seen = d < 10
      if (!seen && d <= dist && Math.abs(wrapAngle(Math.atan2(dy, dx) - cam.facing)) <= half) {
        seen = solids.segmentClear(cam.x, cam.y, player.x, player.y)
      }
      const hot = seen && !hidden
      if (hot && !cam.hot) this.newlyHot = true
      cam.hot = hot
      if (hot) this.sees = true
    }
  }
}
