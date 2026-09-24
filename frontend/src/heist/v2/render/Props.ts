import Phaser from 'phaser'
import { coinDef } from '../../coinAssets'
import { getRaffle } from '../../../constants'
import { heistT } from '../../heistI18n'
import type { LevelDef, NftVaultDef, Rect } from '../level/LevelDef'
import type { Door, Raid, Safe } from '../sim/Raid'
import type { Coin } from '../sim/Loot'
import type { SecCam } from '../sim/SecurityCams'
import { actorDepth } from './Actors'
import { buildDressing } from './Dressing'
import { floorKey } from './textures'

/** World units painted as street around the building, so the camera never shows void. */
export const OUTSIDE = 600

export const DEPTH = {
  floor: 0,
  mood: 1,
  static: 2,
  cones: 3,
  glow: 4,
  coins: 5,
  props: 6,
  canopy: 20,
  labels: 25,
  fx: 30,
}

const MOOD: Record<string, { color: number; alpha: number; blend: number }> = {
  warm: { color: 0xffb060, alpha: 0.05, blend: Phaser.BlendModes.ADD },
  cool: { color: 0x80b0ff, alpha: 0.05, blend: Phaser.BlendModes.ADD },
  blue: { color: 0x3a8cff, alpha: 0.08, blend: Phaser.BlendModes.ADD },
  gold: { color: 0xffc04a, alpha: 0.08, blend: Phaser.BlendModes.ADD },
  dim: { color: 0x000000, alpha: 0.28, blend: Phaser.BlendModes.NORMAL },
}

/** Floors, room mood light and lamp glows: all static, created once. */
export function buildGround(scene: Phaser.Scene, level: LevelDef) {
  scene.add
    .tileSprite(-OUTSIDE, -OUTSIDE, level.w + OUTSIDE * 2, level.h + OUTSIDE * 2, 'v2_street')
    .setOrigin(0, 0)
    .setDepth(DEPTH.floor - 1)
  // Curb light along the facade.
  scene.add.rectangle(-12, -12, level.w + 24, level.h + 24).setOrigin(0, 0).setStrokeStyle(10, 0x2a2418, 1).setDepth(DEPTH.floor - 0.5)
  // Zones can overlap (rooms inside halls): paint big ones first.
  const zones = [...level.zones].sort((a, b) => b.w * b.h - a.w * a.h)
  for (const z of zones) {
    scene.add.tileSprite(z.x, z.y, z.w, z.h, floorKey(z.floor)).setOrigin(0, 0).setDepth(DEPTH.floor)
    const mood = MOOD[z.light]
    if (mood) scene.add.rectangle(z.x, z.y, z.w, z.h, mood.color, mood.alpha).setOrigin(0, 0).setDepth(DEPTH.mood).setBlendMode(mood.blend)
  }
  for (const s of buildDressing(level).sconces) {
    scene.add
      .image(s.x, s.y + 30, 'v2_glow')
      .setDisplaySize(170, 120)
      .setTint(s.color)
      .setAlpha(0.28)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.glow)
  }
  for (const l of level.lamps) {
    scene.add
      .image(l.x, l.y, 'v2_glow')
      .setDisplaySize(420, 420)
      .setTint(l.color)
      .setAlpha(Math.min(0.5, l.alpha * 3.2))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.glow)
  }
}

export class CamView {
  private beam: Phaser.GameObjects.Image
  private head: Phaser.GameObjects.Container
  private led: Phaser.GameObjects.Arc

  constructor(
    scene: Phaser.Scene,
    cam: SecCam,
    private len: number,
  ) {
    this.beam = scene.add
      .image(cam.x, cam.y, 'v2_cone_cam')
      .setOrigin(0, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.cones)
      .setScale(len / 256)
    const mount = scene.add.circle(0, 0, 9, 0x0c0e14).setStrokeStyle(2, 0xc9a227, 0.8)
    const body = scene.add.rectangle(12, 0, 26, 14, 0x1c222c).setStrokeStyle(1.5, 0xc9a227, 0.7)
    const lens = scene.add.circle(26, 0, 6, 0x0a0c10).setStrokeStyle(2, 0x9aa8b4, 0.9)
    this.head = scene.add.container(cam.x, cam.y, [mount, body, lens]).setDepth(DEPTH.props + 1)
    this.led = scene.add.circle(cam.x, cam.y, 3, 0xc9a227).setDepth(DEPTH.props + 2)
  }

  update(cam: SecCam, time: number, visible: boolean) {
    this.beam.setVisible(visible)
    this.head.setVisible(visible)
    this.led.setVisible(visible)
    if (!visible) return
    this.beam.setRotation(cam.facing)
    this.head.setRotation(cam.facing)
    this.beam.setTint(cam.hot ? 0xff4a3a : 0xffe6a0)
    this.beam.setAlpha(cam.hot ? 0.55 : 0.26)
    this.beam.setScale(this.len / 256)
    const blink = cam.hot || Math.sin(time * 5) > 0.6
    this.led.setFillStyle(cam.hot ? 0xff3a2a : 0xffd65a, blink ? 1 : 0.25)
    this.led.setPosition(cam.x - Math.cos(cam.facing) * 4, cam.y - Math.sin(cam.facing) * 4)
  }
}

export class DoorView {
  private leaf: Phaser.GameObjects.Rectangle
  private lock: Phaser.GameObjects.Arc
  private stripe: Phaser.GameObjects.Rectangle
  private horizontal: boolean

  constructor(
    scene: Phaser.Scene,
    private door: Door,
  ) {
    this.horizontal = door.w >= door.h
    const cx = door.x + door.w / 2
    const cy = door.y + door.h / 2
    this.leaf = scene.add.rectangle(cx, cy, door.w, door.h, 0x5a3418).setStrokeStyle(2, 0xc9a227, 0.9).setDepth(DEPTH.props)
    this.stripe = scene.add
      .rectangle(cx, cy, this.horizontal ? door.w - 16 : 4, this.horizontal ? 4 : door.h - 16, 0xc9a227, 0.5)
      .setDepth(DEPTH.props)
    this.lock = scene.add.circle(cx, cy, 7, 0xffd65a).setStrokeStyle(2, 0x3a2410).setDepth(DEPTH.props + 1)
  }

  update(time: number) {
    const d = this.door
    const cx = d.x + d.w / 2
    const cy = d.y + d.h / 2
    let t = 0
    if (d.state === 'OPEN') t = d.openedAt < 0 ? 1 : Math.min(1, (time - d.openedAt) / 0.35)
    const ease = 1 - (1 - t) ** 3
    const ox = this.horizontal ? -d.w * 0.92 * ease : 0
    const oy = this.horizontal ? 0 : -d.h * 0.92 * ease
    this.leaf.setPosition(cx + ox, cy + oy).setAlpha(1 - ease * 0.35)
    this.stripe.setPosition(cx + ox, cy + oy).setAlpha(0.5 - ease * 0.3)
    this.lock.setVisible(t < 1)
    this.lock.setPosition(cx + ox, cy + oy)
    const hacking = d.state === 'HACKING'
    this.lock.setFillStyle(hacking ? (Math.sin(time * 18) > 0 ? 0xff8a3a : 0xffd65a) : 0xffd65a)
    this.leaf.setFillStyle(hacking ? 0x6a3a18 : 0x5a3418)
  }
}

export class SafeView {
  private img: Phaser.GameObjects.Image
  private glow: Phaser.GameObjects.Image
  private label: Phaser.GameObjects.Text

  constructor(
    scene: Phaser.Scene,
    private safe: Safe,
  ) {
    this.glow = scene.add
      .image(safe.x, safe.y, 'v2_glow')
      .setDisplaySize(300, 300)
      .setTint(0xffc04a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.glow)
    this.img = scene.add.image(safe.x, safe.y, 'v2_safe').setDisplaySize(124, 124).setDepth(actorDepth(safe.y + 50))
    this.label = scene.add
      .text(safe.x, safe.y - 82, heistT('heistSafeName'), {
        fontFamily: 'Unbounded, system-ui, sans-serif',
        fontSize: '22px',
        color: '#ffe08a',
        stroke: '#120c06',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.labels)
  }

  update(time: number) {
    const open = this.safe.opened
    this.img.setTexture(open ? 'v2_safe_open' : 'v2_safe').setDisplaySize(124, 124)
    this.glow.setAlpha(open ? 0.12 : 0.22 + Math.sin(time * 3) * 0.08)
    this.label.setVisible(!open)
  }
}

export class ExitView {
  private glow: Phaser.GameObjects.Image
  private label: Phaser.GameObjects.Text
  private emphasis = 0

  constructor(scene: Phaser.Scene, r: Rect) {
    const cx = r.x + r.w / 2
    const cy = r.y + r.h / 2
    this.glow = scene.add
      .image(cx, cy, 'v2_glow')
      .setDisplaySize(r.w * 2.6, r.h * 3)
      .setTint(0x4ae080)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.glow)
    this.label = scene.add
      .text(cx, cy, heistT('heistExit'), {
        fontFamily: 'Unbounded, system-ui, sans-serif',
        fontSize: '34px',
        color: '#c8ffd8',
        stroke: '#062010',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.labels)
  }

  /** After the first coin the exit calls the player for a while. */
  emphasize(seconds: number) {
    this.emphasis = Math.max(this.emphasis, seconds)
  }

  update(time: number, dt: number, hasLoot: boolean) {
    this.emphasis = Math.max(0, this.emphasis - dt)
    const call = this.emphasis > 0 ? 1 : hasLoot ? 0.5 : 0.2
    const pulse = 0.5 + 0.5 * Math.sin(time * (this.emphasis > 0 ? 7 : 3))
    this.glow.setAlpha(0.18 + call * 0.4 * pulse)
    this.label.setScale(1 + (this.emphasis > 0 ? 0.12 * pulse : 0.03 * pulse))
  }
}

export function buildLabels(scene: Phaser.Scene, level: LevelDef) {
  for (const l of level.labels) {
    scene.add
      .text(l.x, l.y, heistT(l.key).toUpperCase(), {
        fontFamily: 'Unbounded, system-ui, sans-serif',
        fontSize: '20px',
        color: '#c9a86a',
        stroke: '#0a0806',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setAlpha(0.5)
      .setDepth(DEPTH.props - 0.5)
  }
}

/** Big plants above the actors: step into one and the duck is under the leaves. */
export class FoliageLayer {
  private items: { r: Rect; img: Phaser.GameObjects.Image }[] = []

  constructor(scene: Phaser.Scene, level: LevelDef) {
    for (const f of level.foliage) {
      const tall = f.h >= 70
      const key = tall ? 'v2_plant_t' : f.w >= 68 ? 'v2_plant_f' : 'v2_plant_s'
      const w = f.w * 1.25
      const h = tall ? f.h * 1.25 : f.h * 1.35
      const img = scene.add
        .image(f.x + f.w / 2, f.y + f.h, key)
        .setOrigin(0.5, 0.95)
        .setDisplaySize(w, h)
        .setDepth(DEPTH.canopy)
      this.items.push({ r: f, img })
    }
    for (const s of level.solids) {
      if (s.kind !== 'plant') continue
      const img = scene.add
        .image(s.x + s.w / 2, s.y + s.h, 'v2_plant_s')
        .setOrigin(0.5, 0.95)
        .setDisplaySize(s.w * 1.9, s.w * 1.9)
        .setDepth(actorDepth(s.y + s.h))
      this.items.push({ r: s, img })
    }
  }

  /** Leaves over the duck turn see-through so the player never loses the hero. */
  update(px: number, py: number) {
    for (const it of this.items) {
      const r = it.r
      const inside = px > r.x - 16 && px < r.x + r.w + 16 && py > r.y - 30 && py < r.y + r.h + 20
      it.img.setAlpha(inside ? 0.55 : 1)
    }
  }
}

type CoinSprite = { img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; coin: Coin | null }

/** Pooled coin images: only coins near the camera exist as sprites. */
export class CoinLayer {
  private pool: CoinSprite[] = []
  private used = 0

  constructor(private scene: Phaser.Scene) {}

  private get(i: number): CoinSprite {
    let s = this.pool[i]
    if (!s) {
      const glow = this.scene.add
        .image(0, 0, 'v2_glow')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.coins - 0.1)
        .setTint(0xffd65a)
      const img = this.scene.add.image(0, 0, 'dc_5').setDepth(DEPTH.coins)
      s = { img, glow, coin: null }
      this.pool[i] = s
    }
    return s
  }

  update(raid: Raid, view: Rect, time: number) {
    let n = 0
    const pad = 80
    raid.loot.forEachNear(view.x - pad, view.y - pad, view.x + view.w + pad, view.y + view.h + pad, (c) => {
      if (c.taken) return
      const s = this.get(n)
      n += 1
      if (s.coin !== c) {
        s.coin = c
        const def = coinDef(c.kind)
        s.img.setTexture(def.key)
        const tw = s.img.frame.width || def.size
        const th = s.img.frame.height || def.size
        const k = (def.size * 0.9) / Math.max(tw, th)
        s.img.setScale(k)
        const big = c.kind === 'C100' || c.kind === 'C50'
        s.glow.setDisplaySize(def.size * (big ? 3.2 : 2), def.size * (big ? 3.2 : 2))
      }
      const locked = time < c.lockedUntil
      const bob = Math.sin(time * 2.6 + c.uid * 1.7) * 3
      s.img.setVisible(true).setPosition(c.x, c.y - 6 + bob).setAlpha(locked ? 0.55 : 1)
      const big = c.kind === 'C100' || c.kind === 'C50'
      s.glow
        .setVisible(true)
        .setPosition(c.x, c.y - 4)
        .setAlpha((big ? 0.32 : 0.14) + Math.sin(time * 3 + c.uid) * 0.05)
    })
    for (let i = n; i < this.used; i += 1) {
      const s = this.pool[i]
      s.img.setVisible(false)
      s.glow.setVisible(false)
      s.coin = null
    }
    this.used = n
  }
}

/** Top prize of the main NFT Drop as "5,000" — read from the draw config, never invented. */
export function nftWinAmount() {
  const raw = getRaffle('classic').prizes[0]?.amount ?? ''
  const n = Number.parseInt(raw.replace(/[^0-9]/g, ''), 10)
  return Number.isFinite(n) ? n.toLocaleString('en-US') : raw
}

export function nftTextureKey(raffle: string) {
  return `v2_nft_${raffle}`
}

/** NFT cards behind the vault bars: lit, floating a little, clearly out of reach. */
export class NftVaultView {
  private cards: { img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; y: number; phase: number }[] = []

  constructor(scene: Phaser.Scene, vault: NftVaultDef) {
    const back = scene.add
      .rectangle(vault.grille.x, vault.grille.y - 190, vault.grille.w, 190, 0x04060c, 0.75)
      .setOrigin(0, 0)
      .setDepth(DEPTH.mood + 0.1)
    back.setBlendMode(Phaser.BlendModes.NORMAL)
    vault.cards.forEach((c, i) => {
      const glow = scene.add
        .image(c.x, c.y, 'v2_glow')
        .setDisplaySize(230, 230)
        .setTint(i === 1 ? 0xffd65a : 0x7ac8ff)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.45)
        .setDepth(DEPTH.mood + 0.2)
      const key = scene.textures.exists(nftTextureKey(c.raffle)) ? nftTextureKey(c.raffle) : 'v2_nft_default'
      const img = scene.add.image(c.x, c.y, key).setDepth(DEPTH.mood + 0.3)
      const size = i === 1 ? 118 : 96
      const k = size / Math.max(img.width || size, img.height || size)
      img.setScale(k)
      this.cards.push({ img, glow, y: c.y, phase: i * 1.7 })
    })
    const cx = vault.grille.x + vault.grille.w / 2
    scene.add
      .text(cx, vault.view.y + vault.view.h + 34, heistT('heistNftVault'), {
        fontFamily: 'Unbounded, system-ui, sans-serif',
        fontSize: '30px',
        color: '#bfe8ff',
        stroke: '#04060c',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.labels)
    scene.add
      .text(cx, vault.view.y + vault.view.h + 74, heistT('heistNftWinTitle', { amount: nftWinAmount() }), {
        fontFamily: 'Unbounded, system-ui, sans-serif',
        fontSize: '26px',
        color: '#ffd65a',
        stroke: '#1a1006',
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.labels)
  }

  update(time: number) {
    for (const c of this.cards) {
      const bob = Math.sin(time * 1.6 + c.phase) * 4
      c.img.setY(c.y + bob)
      c.glow.setAlpha(0.35 + Math.sin(time * 2 + c.phase) * 0.12)
    }
  }
}
