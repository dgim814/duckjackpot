import Phaser from 'phaser'
import { heistT } from '../../heistI18n'
import type { EscalatorDef, LaserDef, LevelDef, LiftDef, PanelDef, ValuableDef } from '../level/LevelDef'
import type { Raid } from '../sim/Raid'
import { actorDepth } from './Actors'
import { DEPTH } from './Props'

type View = { x: number; y: number; w: number; h: number }
const near = (r: { x: number; y: number; w: number; h: number }, v: View, m = 300) =>
  r.x < v.x + v.w + m && r.x + r.w > v.x - m && r.y < v.y + v.h + m && r.y + r.h > v.y - m

/** SKYLINE lift cabin: steel frame, glowing doors, floor number. Static except the call light. */
class LiftView {
  private light: Phaser.GameObjects.Image
  private objs: Phaser.GameObjects.GameObject[] = []

  constructor(scene: Phaser.Scene, private lift: LiftDef) {
    const { x, y, w, h } = lift
    const g = scene.add.graphics().setDepth(DEPTH.static + 0.4)
    g.fillStyle(0x0c1016, 0.95)
    g.fillRoundedRect(x, y, w, h, 8)
    g.fillStyle(0x2a3644, 1)
    g.fillRect(x + 10, y + 16, w / 2 - 12, h - 26)
    g.fillRect(x + w / 2 + 2, y + 16, w / 2 - 12, h - 26)
    g.fillStyle(0xbfe8ff, 0.22)
    g.fillRect(x + w / 2 - 2, y + 16, 4, h - 26)
    g.lineStyle(3, 0xbfe8ff, 0.8)
    g.strokeRoundedRect(x, y, w, h, 8)
    this.light = scene.add.image(x + w / 2, y + h / 2, 'v2_glow').setDisplaySize(w * 1.6, h * 1.6).setTint(0x8fd8ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.glow).setAlpha(0.3)
    const label = scene.add
      .text(x + w / 2, y + 8, `${heistT('heistLiftTitle')} · ${lift.floor + 1}`, { fontFamily: 'Unbounded, system-ui, sans-serif', fontSize: '15px', color: '#dff4ff', stroke: '#06101a', strokeThickness: 5 })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.labels)
    this.objs.push(g, this.light, label)
  }

  update(time: number, vis: boolean) {
    for (const o of this.objs) (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(vis)
    if (vis) this.light.setAlpha(0.22 + Math.sin(time * 2) * 0.06)
  }

  get rect() {
    return this.lift
  }
}

/** Escalator: a scrolling tread strip with rails; gold rails on the ⭐ express ones. */
class EscalatorView {
  private strip: Phaser.GameObjects.TileSprite
  private rails: Phaser.GameObjects.Graphics
  private label: Phaser.GameObjects.Text | null = null

  constructor(scene: Phaser.Scene, private e: EscalatorDef) {
    this.strip = scene.add.tileSprite(e.x, e.y, e.w, e.h, 'v2_steps').setOrigin(0, 0).setDepth(DEPTH.static + 0.3).setAlpha(0.95)
    const rail = e.premium ? 0xffd65a : 0xff3cb4
    this.rails = scene.add.graphics().setDepth(DEPTH.static + 0.35)
    this.rails.fillStyle(rail, 0.85)
    this.rails.fillRect(e.x - 4, e.y, 5, e.h)
    this.rails.fillRect(e.x + e.w - 1, e.y, 5, e.h)
    // chevrons point the way the escalator carries you
    this.rails.fillStyle(rail, 0.35)
    for (let yy = e.y + 30; yy < e.y + e.h - 20; yy += 70) {
      const cx = e.x + e.w / 2
      this.rails.fillTriangle(cx - 16, yy, cx + 16, yy, cx, yy + 16 * Math.sign(e.dy || 1))
    }
    if (e.premium) {
      this.label = scene.add
        .text(e.x + e.w / 2, e.y + e.h / 2, heistT('heistExpressTitle'), { fontFamily: 'Unbounded, system-ui, sans-serif', fontSize: '13px', color: '#ffe08a', stroke: '#140c02', strokeThickness: 5 })
        .setOrigin(0.5)
        .setAngle(90)
        .setDepth(DEPTH.labels)
    }
  }

  update(dt: number, vis: boolean) {
    this.strip.setVisible(vis)
    this.rails.setVisible(vis)
    this.label?.setVisible(vis)
    if (vis) this.strip.tilePositionY -= this.e.dy * this.e.speed * dt * 0.5
  }

  get rect() {
    return this.e
  }
}

/** Laser beam: bright pulsing red when live, a faint dotted line when off. Emitters at both ends. */
class LaserView {
  private beam: Phaser.GameObjects.Rectangle
  private glow: Phaser.GameObjects.Rectangle
  private ends: Phaser.GameObjects.Arc[]

  constructor(scene: Phaser.Scene, private l: LaserDef) {
    const d = DEPTH.props + 0.5
    const horizontal = l.w > l.h
    // Drawn a little thicker than the hit area so it reads at phone zoom; the hit rect is unchanged.
    const bw = horizontal ? l.w : Math.max(l.w, 12)
    const bh = horizontal ? Math.max(l.h, 12) : l.h
    this.glow = scene.add.rectangle(l.x + l.w / 2, l.y + l.h / 2, horizontal ? l.w : 44, horizontal ? 44 : l.h, 0xff2a2a, 0.18).setBlendMode(Phaser.BlendModes.ADD).setDepth(d)
    this.beam = scene.add.rectangle(l.x + l.w / 2, l.y + l.h / 2, bw, bh, 0xff4a3a, 0.9).setBlendMode(Phaser.BlendModes.ADD).setDepth(d + 0.01)
    const horiz = l.w > l.h
    const a = horiz ? { x: l.x, y: l.y + l.h / 2 } : { x: l.x + l.w / 2, y: l.y }
    const b = horiz ? { x: l.x + l.w, y: l.y + l.h / 2 } : { x: l.x + l.w / 2, y: l.y + l.h }
    this.ends = [a, b].map((p) => scene.add.circle(p.x, p.y, 9, 0x2a0c0c).setStrokeStyle(3, 0xc9a227, 1).setDepth(d + 0.02))
  }

  update(raid: Raid, time: number, vis: boolean) {
    this.beam.setVisible(vis)
    this.glow.setVisible(vis)
    for (const e of this.ends) e.setVisible(vis)
    if (!vis) return
    const on = raid.laserActive(this.l)
    const off = raid.laserGroupOffLeft(this.l.group) > 0
    // Live: bright, pulsing. Cycle off: faint so the player sees where it will be. Panel off: gone green.
    this.beam.setFillStyle(off ? 0x3aff8a : 0xff4a3a, on ? 0.75 + Math.sin(time * 24) * 0.15 : off ? 0.12 : 0.16)
    this.glow.setAlpha(on ? 0.3 + Math.sin(time * 12) * 0.06 : 0.03)
    for (const e of this.ends) e.setFillStyle(on ? 0xff3a3a : off ? 0x1c6a3a : 0x3a1010)
  }

  get rect() {
    return this.l
  }
}

/** Security panel on the wall: red LED while armed, green while the lasers are off. */
class PanelView {
  private body: Phaser.GameObjects.Rectangle
  private led: Phaser.GameObjects.Arc
  private label: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, private p: PanelDef) {
    this.body = scene.add.rectangle(p.x, p.y, 44, 56, 0x14161c).setStrokeStyle(3, 0xc9a227, 1).setDepth(actorDepth(p.y) - 0.001)
    this.led = scene.add.circle(p.x, p.y - 12, 7, 0xff3a3a).setDepth(actorDepth(p.y))
    this.label = scene.add
      .text(p.x, p.y + 44, heistT('heistPanelTitle'), { fontFamily: 'Unbounded, system-ui, sans-serif', fontSize: '13px', color: '#ffb4a0', stroke: '#140606', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(DEPTH.labels)
  }

  update(raid: Raid, vis: boolean) {
    this.body.setVisible(vis)
    this.led.setVisible(vis)
    this.label.setVisible(vis)
    if (vis) this.led.setFillStyle(raid.laserGroupOffLeft(this.p.group) > 0 ? 0x3aff8a : 0xff3a3a)
  }

  get rect() {
    return { x: this.p.x - 30, y: this.p.y - 40, w: 60, h: 80 }
  }
}

/** Special loot on a lit pedestal, bobbing a little; gone once picked up. */
class ValuableView {
  private glow: Phaser.GameObjects.Image
  private icon: Phaser.GameObjects.Image
  private tag: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, private v: ValuableDef) {
    this.glow = scene.add.image(v.x, v.y, 'v2_glow').setDisplaySize(170, 170).setTint(0xffd65a).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.glow).setAlpha(0.5)
    this.icon = scene.add.image(v.x, v.y, `v2_val_${v.kind}`).setDisplaySize(64, 64).setDepth(actorDepth(v.y))
    this.tag = scene.add
      .text(v.x, v.y - 52, `${v.value}`, { fontFamily: 'Unbounded, system-ui, sans-serif', fontSize: '15px', color: '#ffe08a', stroke: '#140c02', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(DEPTH.labels)
  }

  update(time: number, vis: boolean, present: boolean) {
    const on = vis && present
    this.glow.setVisible(on)
    this.icon.setVisible(on)
    this.tag.setVisible(on)
    if (!on) return
    const bob = Math.sin(time * 2.4 + this.v.x) * 4
    this.icon.setY(this.v.y + bob)
    this.glow.setAlpha(0.4 + Math.sin(time * 3 + this.v.y) * 0.12)
  }

  get id() {
    return this.v.id
  }
}

/** Every LEVELS 6–8 mechanic view; nothing is created for levels without them. */
export class MechanicsLayer {
  private lifts: LiftView[]
  private escalators: EscalatorView[]
  private lasers: LaserView[]
  private panels: PanelView[]
  private valuables: ValuableView[]

  constructor(scene: Phaser.Scene, level: LevelDef) {
    this.lifts = (level.lifts ?? []).map((l) => new LiftView(scene, l))
    this.escalators = (level.escalators ?? []).map((e) => new EscalatorView(scene, e))
    this.lasers = (level.lasers ?? []).map((l) => new LaserView(scene, l))
    this.panels = (level.panels ?? []).map((p) => new PanelView(scene, p))
    this.valuables = (level.valuables ?? []).map((v) => new ValuableView(scene, v))
  }

  update(raid: Raid, view: View, time: number, dt: number) {
    for (const l of this.lifts) l.update(time, near(l.rect, view))
    for (const e of this.escalators) e.update(dt, near(e.rect, view))
    for (const l of this.lasers) l.update(raid, time, near(l.rect, view))
    for (const p of this.panels) p.update(raid, near(p.rect, view))
    if (this.valuables.length) {
      const present = new Set(raid.valuablesOnFloor.map((v) => v.id))
      for (const v of this.valuables) v.update(time, true, present.has(v.id))
    }
  }
}
