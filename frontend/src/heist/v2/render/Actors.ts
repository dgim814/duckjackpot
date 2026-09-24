import Phaser from 'phaser'
import type { Guard } from '../sim/Guards'
import type { Gait, Player } from '../sim/Player'
import type { NftSkinDef, NftSkinGait } from '../../nftTrial'

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

export function nftSkinTextureKey(skin: NftSkinDef) {
  return `v2_nftskin_${skin.id}`
}

/** Animations of a full NFT skin sheet (only when that sheet is loaded). Returns gait → anim key. */
function createSkinAnims(scene: Phaser.Scene, skin: NftSkinDef): Partial<Record<Gait, string>> {
  const tex = nftSkinTextureKey(skin)
  if (!skin.sheet || !skin.anims || !scene.textures.exists(tex)) return {}
  const out: Partial<Record<Gait, string>> = {}
  for (const gait of Object.keys(skin.anims) as NftSkinGait[]) {
    const def = skin.anims[gait]
    if (!def) continue
    const key = `v2-nftskin-${skin.id}-${gait}`
    if (!scene.anims.exists(key)) {
      scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(tex, { start: def.start, end: def.end }), frameRate: def.fps, repeat: -1 })
    }
    out[gait] = key
  }
  // A skin without its own run cycle runs like it walks, as the normal duck does.
  if (!out.run && out.walk) out.run = out.walk
  return out
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export class DuckView {
  readonly sprite: Phaser.GameObjects.Sprite
  private shadow: Phaser.GameObjects.Image
  private aura: Phaser.GameObjects.Image
  private crown: Phaser.GameObjects.Image
  private skin: NftSkinDef | null = null
  private skinAnims: Partial<Record<Gait, string>> = {}
  private key = ''
  x = 0
  y = 0

  constructor(private scene: Phaser.Scene) {
    this.shadow = scene.add.image(0, 0, 'v2_shadow').setDisplaySize(64, 22).setAlpha(0.9)
    this.aura = scene.add.image(0, 0, 'v2_glow').setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(150, 150).setVisible(false)
    this.sprite = scene.add.sprite(0, 0, 'duck_sheet', 0).setOrigin(0.5, 0.9)
    const k = DUCK_DISPLAY / 256
    this.sprite.setScale(k)
    this.crown = scene.add.image(0, 0, 'v2_crown').setDisplaySize(40, 30).setOrigin(0.5, 1).setVisible(false)
  }

  /**
   * NFT try-on look. With a loaded skin sheet the duck plays that NFT's own
   * animations; otherwise it stays the normal duck. Aura and crown follow the
   * skin's flags in its colour. null = plain duck.
   */
  setSkin(skin: NftSkinDef | null) {
    this.skin = skin
    this.skinAnims = skin ? createSkinAnims(this.scene, skin) : {}
    this.key = ''
    this.aura.setVisible(Boolean(skin?.aura))
    this.crown.setVisible(Boolean(skin?.crown))
    if (skin) {
      this.aura.setTint(skin.color)
      this.crown.setTint(skin.color)
    }
  }

  update(p: Player, alpha: number, hidden: boolean) {
    this.x = lerp(p.prevX, p.x, alpha)
    this.y = lerp(p.prevY, p.y, alpha)
    this.sprite.setPosition(this.x, this.y + 4)
    this.sprite.setDepth(actorDepth(this.y))
    this.shadow.setPosition(this.x, this.y + 2).setDepth(actorDepth(this.y) - 0.00001)
    this.sprite.setFlipX(p.flip)
    const key = this.skinAnims[p.anim] ?? DUCK_ANIM[p.anim]
    if (key !== this.key) {
      this.key = key
      this.sprite.play(key, true)
    }
    this.sprite.setAlpha(hidden ? 0.62 : 1)
    if (this.skin && (this.skin.aura || this.skin.crown)) {
      const d = actorDepth(this.y)
      const dir = p.flip ? -1 : 1
      const bob = p.anim === 'idle' ? 0 : Math.sin(this.sprite.anims.currentFrame?.index ?? 0) * 1.5
      this.aura.setPosition(this.x, this.y - 44).setDepth(d - 0.00002).setAlpha(hidden ? 0.2 : 0.42)
      this.crown.setPosition(this.x + dir * 14, this.y - 80 + bob).setDepth(d + 0.00001).setFlipX(p.flip).setAlpha(hidden ? 0.62 : 1)
    }
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
