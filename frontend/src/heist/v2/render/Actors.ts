import Phaser from 'phaser'
import type { Guard } from '../sim/Guards'
import type { Gait, Player } from '../sim/Player'

export const DUCK_DISPLAY = 104
export const GUARD_DISPLAY = 80
const ACTOR_DEPTH = 10

/** Actors sort by their feet so the duck walks in front of and behind guards naturally. */
export function actorDepth(y: number) {
  return ACTOR_DEPTH + y / 100000
}

const DUCK_ANIM: Record<Gait, string> = {
  idle: 'v2-duck-idle',
  walk: 'v2-duck-walk',
  run: 'v2-duck-walk',
  sneak: 'v2-duck-sneak',
  dash: 'v2-duck-dash',
}

export function createActorAnims(scene: Phaser.Scene) {
  const a = scene.anims
  const mk = (key: string, tex: string, start: number, end: number, fps: number) => {
    if (a.exists(key)) return
    a.create({ key, frames: a.generateFrameNumbers(tex, { start, end }), frameRate: fps, repeat: -1 })
  }
  mk('v2-duck-idle', 'duck_sheet', 0, 3, 4)
  mk('v2-duck-walk', 'duck_sheet', 4, 11, 9)
  mk('v2-duck-sneak', 'duck_sheet', 4, 11, 5)
  mk('v2-duck-dash', 'duck_sheet', 12, 15, 11)
  mk('v2-guard-idle', 'guard_sheet', 0, 3, 4)
  mk('v2-guard-walk', 'guard_sheet', 4, 11, 9)
  mk('v2-guard-run', 'guard_sheet', 12, 15, 11)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export class DuckView {
  readonly sprite: Phaser.GameObjects.Sprite
  private shadow: Phaser.GameObjects.Image
  private key = ''
  x = 0
  y = 0

  constructor(scene: Phaser.Scene) {
    this.shadow = scene.add.image(0, 0, 'v2_shadow').setDisplaySize(64, 22).setAlpha(0.9)
    this.sprite = scene.add.sprite(0, 0, 'duck_sheet', 0).setOrigin(0.5, 0.9)
    const k = DUCK_DISPLAY / 256
    this.sprite.setScale(k)
  }

  update(p: Player, alpha: number, hidden: boolean) {
    this.x = lerp(p.prevX, p.x, alpha)
    this.y = lerp(p.prevY, p.y, alpha)
    this.sprite.setPosition(this.x, this.y + 4)
    this.sprite.setDepth(actorDepth(this.y))
    this.shadow.setPosition(this.x, this.y + 2).setDepth(actorDepth(this.y) - 0.00001)
    this.sprite.setFlipX(p.flip)
    const key = DUCK_ANIM[p.anim]
    if (key !== this.key) {
      this.key = key
      this.sprite.play(key, true)
    }
    this.sprite.setAlpha(hidden ? 0.62 : 1)
  }
}

export class GuardView {
  private sprite: Phaser.GameObjects.Sprite
  private shadow: Phaser.GameObjects.Image
  private cone: Phaser.GameObjects.Image
  private icon: Phaser.GameObjects.Image
  private key = ''

  constructor(
    scene: Phaser.Scene,
    private coneLen: number,
  ) {
    this.cone = scene.add.image(0, 0, 'v2_cone_guard').setOrigin(0, 0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(3)
    this.shadow = scene.add.image(0, 0, 'v2_shadow').setDisplaySize(50, 17)
    this.sprite = scene.add.sprite(0, 0, 'guard_sheet', 0).setOrigin(0.5, 0.88).setScale(GUARD_DISPLAY / 256)
    this.icon = scene.add.image(0, 0, 'v2_icon_q').setDisplaySize(26, 26).setDepth(40).setVisible(false)
  }

  update(g: Guard, alpha: number, time: number, visible: boolean) {
    this.sprite.setVisible(visible)
    this.shadow.setVisible(visible)
    this.cone.setVisible(visible)
    if (!visible) {
      this.icon.setVisible(false)
      return
    }
    const x = lerp(g.prevX, g.box.x, alpha)
    const y = lerp(g.prevY, g.box.y, alpha)
    this.sprite.setPosition(x, y + 3).setDepth(actorDepth(y))
    this.shadow.setPosition(x, y + 2).setDepth(actorDepth(y) - 0.00001)
    const dx = g.box.x - g.prevX
    if (Math.abs(dx) > 0.05) this.sprite.setFlipX(dx < 0)
    else if (Math.abs(Math.cos(g.facing)) > 0.25) this.sprite.setFlipX(Math.cos(g.facing) < 0)
    const key = !g.moving ? 'v2-guard-idle' : g.state === 'CHASE' ? 'v2-guard-run' : 'v2-guard-walk'
    if (key !== this.key) {
      this.key = key
      this.sprite.play(key, true)
    }

    const chase = g.state === 'CHASE'
    const alarmed = chase || g.detect > 0.5
    const curious = g.state === 'INVESTIGATE' || g.state === 'SEARCH'
    this.cone.setPosition(x, y - 18)
    this.cone.setRotation(g.facing)
    this.cone.setScale(this.coneLen / 256)
    this.cone.setTint(chase ? 0xff3a2a : alarmed ? 0xff8a3a : curious ? 0xffc040 : 0xffe6a0)
    this.cone.setAlpha(chase ? 0.5 : alarmed ? 0.42 : curious ? 0.34 : 0.22)

    const showIcon = chase || curious
    this.icon.setVisible(showIcon)
    if (showIcon) {
      this.icon.setTexture(chase ? 'v2_icon_x' : 'v2_icon_q').setDisplaySize(26, 26)
      this.icon.setPosition(x, y - GUARD_DISPLAY - 8 + Math.sin(time * 7) * 3)
    }
  }
}
