import Phaser from 'phaser'
import { ensureCoinPlaceholders, loadDuckCoinImages } from '../../coinAssets'
import { heistT } from '../../heistI18n'
import type { HeistEnd } from '../../types'
import { zoneAt } from '../level/LevelDef'
import type { RaidEvent } from '../sim/events'
import type { InputController } from '../sim/Input'
import { Raid, SIM_DT } from '../sim/Raid'
import type { HudSnapshot, HudStore, Toast } from '../ui/store'
import { DuckView, GuardView, createActorAnims } from './Actors'
import { AudioBridge } from './AudioBridge'
import { CameraRig } from './CameraRig'
import { FxLayer } from './Fx'
import { CamView, CoinLayer, DEPTH, DoorView, ExitView, FoliageLayer, NftVaultView, SafeView, buildGround, buildLabels, nftTextureKey } from './Props'
import { buildTextures } from './textures'
import { WorldBaker } from './WorldBaker'

const MAX_STEPS = 5
const END_DELAY = 0.9
const VIEW_PAD = 160
const CAM_MARGIN = 360

export type SceneDeps = {
  raid: Raid
  input: InputController
  hud: HudStore
  resolution: number
  onEnd: (end: HeistEnd) => void
  /** Card art URLs for the MANSION NFT vault, by raffle id. */
  nftArt?: Partial<Record<string, string>>
  /** Colour of an active 24h NFT try-on, or null. Cosmetic only. */
  skin?: number | null
  onNftView?: () => void
}

/** Zones (1-based) where MANSION suggests heading back, once per raid each. */
const FAR_HINTS = [15, 25, 35]

/**
 * Thin Phaser scene: it owns no game rules. Each frame it advances the fixed
 * 60 Hz simulation, interpolates what it draws between the last two sim
 * states, and turns sim events into effects, toasts and sound.
 */
export class HeistV2Scene extends Phaser.Scene {
  private deps: SceneDeps
  private acc = 0
  private rig!: CameraRig
  private baker!: WorldBaker
  private duck!: DuckView
  private guardViews: GuardView[] = []
  private camViews: CamView[] = []
  private doorViews: DoorView[] = []
  private safeViews: SafeView[] = []
  private exitView!: ExitView
  private foliage!: FoliageLayer
  private coins!: CoinLayer
  private fx!: FxLayer
  private audio = new AudioBridge()
  private toasts: Toast[] = []
  private toastId = 0
  private clock = 0
  private endAt = -1
  private delivered = false
  private animsPaused = false
  private lastSnap: HudSnapshot | null = null
  private depthAtStart = 0
  private nftView: NftVaultView | null = null
  private farShown = new Set<number>()
  stepsLastFrame = 0

  constructor(deps: SceneDeps) {
    super('HeistV2')
    this.deps = deps
  }

  get raid() {
    return this.deps.raid
  }

  preload() {
    this.load.spritesheet('duck_sheet', '/heist/duck_sheet.png', { frameWidth: 256, frameHeight: 256 })
    this.load.spritesheet('guard_sheet', '/heist/guard_sheet.png', { frameWidth: 256, frameHeight: 256 })
    loadDuckCoinImages(this)
    this.load.image('v2_nft_default', '/duck-jackpot.jpg')
    const vault = this.raid.level.nftVault
    if (vault) {
      // Admin art may live on another host; a failed load falls back to the default card.
      this.load.setCORS('anonymous')
      for (const c of vault.cards) {
        const url = this.deps.nftArt?.[c.raffle]
        if (url && !this.textures.exists(nftTextureKey(c.raffle))) this.load.image(nftTextureKey(c.raffle), url)
      }
    }
  }

  create() {
    const raid = this.raid
    const L = raid.level
    const v = raid.cfg.vision
    buildTextures(this, v.guardFovDeg, v.camFovDeg)
    ensureCoinPlaceholders(this)
    createActorAnims(this)

    this.cameras.main.setBackgroundColor(L.background)
    buildGround(this, L)
    this.baker = new WorldBaker(this, L, DEPTH.static)
    buildLabels(this, L)
    this.exitView = new ExitView(this, L.exit)
    this.doorViews = raid.doors.map((d) => new DoorView(this, d))
    this.safeViews = raid.safes.map((s) => new SafeView(this, s))
    this.camViews = raid.cams.cams.map((c) => new CamView(this, c, v.camDist * raid.mods.disguiseMul))
    this.coins = new CoinLayer(this)
    this.duck = new DuckView(this)
    this.duck.setSkin(this.deps.skin ?? null)
    if (L.nftVault) this.nftView = new NftVaultView(this, L.nftVault)
    this.guardViews = raid.guards.guards.map(() => new GuardView(this, v.guardDist * raid.mods.disguiseMul))
    this.foliage = new FoliageLayer(this, L)
    this.fx = new FxLayer(this)

    // The camera may look past the walls (onto the street) so the duck is never framed under the thumbs.
    this.rig = new CameraRig(this.cameras.main, { x: -CAM_MARGIN, y: -CAM_MARGIN, w: L.w + CAM_MARGIN * 2, h: L.h + CAM_MARGIN * 2 }, this.deps.resolution)
    this.rig.update(0, raid.player.x, raid.player.y, 0, 0)
    this.depthAtStart = raid.depthBest
    if (raid.novice && raid.levelId === 'bank') this.toast('intro', heistT('heistV2Intro'), heistT('heistV2IntroSub'), 4.2)
    else this.toast('info', zoneTitle(raid), heistT('heistV2Record', { n: raid.depthBest + 1 }), 2.2)

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this)
      this.baker.destroy()
    })
    this.renderFrame(0, 1)
  }

  private onResize(size: Phaser.Structs.Size) {
    this.cameras.main.setSize(size.width, size.height)
  }

  /** Apply or clear the cosmetic NFT try-on look on the duck. */
  setSkin(color: number | null) {
    this.deps.skin = color
    this.duck?.setSkin(color)
  }

  setResolution(res: number) {
    this.deps.resolution = res
    this.rig?.setResolution(res)
  }

  update(_time: number, deltaMs: number) {
    const raid = this.raid
    const dt = Math.min(0.25, Math.max(0, deltaMs / 1000))
    this.clock += dt

    if (raid.paused !== this.animsPaused) {
      this.animsPaused = raid.paused
      if (raid.paused) this.anims.pauseAll()
      else this.anims.resumeAll()
    }

    let steps = 0
    if (!raid.paused && !raid.ended) {
      this.acc += dt
      while (this.acc >= SIM_DT && steps < MAX_STEPS) {
        raid.step(this.deps.input.sample())
        this.acc -= SIM_DT
        steps += 1
        if (raid.ended) break
      }
      if (steps >= MAX_STEPS) this.acc = 0
    } else {
      this.acc = 0
    }
    this.stepsLastFrame = steps

    for (const e of raid.events.splice(0)) this.onEvent(e)
    this.audio.sync(raid)

    if (raid.ended && this.endAt < 0) this.endAt = this.clock + END_DELAY
    if (this.endAt > 0 && this.clock >= this.endAt && !this.delivered && raid.result) {
      this.delivered = true
      this.deps.onEnd(raid.result)
    }

    const alpha = raid.paused || raid.ended ? 1 : Math.min(1, this.acc / SIM_DT)
    this.renderFrame(dt, alpha)
  }

  private renderFrame(dt: number, alpha: number) {
    const raid = this.raid
    const p = raid.player
    this.duck.update(p, alpha, raid.hidden)
    const vx = (p.x - p.prevX) / SIM_DT
    const vy = (p.y - p.prevY) / SIM_DT
    this.rig.update(dt, this.duck.x, this.duck.y, vx, vy)
    const view = this.rig.view()
    const pad = { x: view.x - VIEW_PAD, y: view.y - VIEW_PAD, w: view.w + VIEW_PAD * 2, h: view.h + VIEW_PAD * 2 }
    this.baker.update(view)
    const t = raid.time
    raid.guards.guards.forEach((g, i) => {
      const vis = g.box.x > pad.x && g.box.x < pad.x + pad.w && g.box.y > pad.y && g.box.y < pad.y + pad.h
      this.guardViews[i].update(g, alpha, this.clock, vis)
    })
    raid.cams.cams.forEach((c, i) => {
      const vis = c.x > pad.x - 200 && c.x < pad.x + pad.w + 200 && c.y > pad.y - 200 && c.y < pad.y + pad.h + 200
      this.camViews[i].update(c, this.clock, vis)
    })
    for (const d of this.doorViews) d.update(t)
    for (const s of this.safeViews) s.update(this.clock)
    this.exitView.update(this.clock, dt, raid.bag > 0)
    this.coins.update(raid, view, t)
    this.foliage.update(this.duck.x, this.duck.y)
    this.nftView?.update(this.clock)
    this.fx.update(dt)
    this.publishHud(view)
  }

  // ---------- events → feel ----------

  private onEvent(e: RaidEvent) {
    this.audio.handle(e)
    const raid = this.raid
    switch (e.t) {
      case 'pickup': {
        const tone = e.value >= 100 ? 'big' : e.value >= 50 ? 'mid' : 'small'
        this.fx.float(this.duck.x, this.duck.y - 110, `+${e.value}`, tone)
        this.fx.burst(e.x, e.y - 6, e.value >= 50 ? 16 : 7)
        break
      }
      case 'firstLoot':
        this.exitView.emphasize(5)
        if (raid.novice) this.toast('good', heistT('heistV2FirstLoot'), heistT('heistV2FirstLootSub'), 4.5)
        break
      case 'bagFull':
        this.toast('warn', heistT('heistBagFull'), heistT('heistFleeNow'), 2.4)
        this.exitView.emphasize(3)
        break
      case 'drop':
        this.fx.float(e.x, e.y - 60, `−${e.value}`, 'loss')
        break
      case 'crackMiss':
        this.toast('warn', heistT('heistV2CrackMiss'), undefined, 1.2)
        this.rig.shake(0.18, 10)
        break
      case 'doorOpened': {
        const d = raid.doors.find((x) => x.id === e.id)
        if (d) this.fx.burst(d.x + d.w / 2, d.y + d.h / 2, 14)
        this.toast('good', heistT('heistDoorOpened'), undefined, 1.4)
        break
      }
      case 'safeOpened':
        this.fx.burst(e.x, e.y, 34, 320)
        if (e.reward > 0) this.fx.float(e.x, e.y - 90, `+${e.reward}`, 'big')
        this.rig.shake(0.35, 18)
        this.toast(
          'good',
          heistT('heistSafeOpenedTitle'),
          e.reward > 0 ? heistT('heistSafeReward', { n: e.reward }) : heistT('heistBagFull'),
          2.2,
        )
        break
      case 'siren':
        this.rig.shake(0.4, 22)
        this.toast('danger', heistT('heistSiren'), heistT('heistFleeNow'), 3)
        break
      case 'chaseStart':
        this.toast('danger', heistT('heistV2Seen'), undefined, 1.6)
        break
      case 'chaseStop':
        if (!raid.ended) this.toast('good', heistT('heistV2Lost'), undefined, 1.6)
        break
      case 'zone': {
        if (!e.deeper) break
        const z = raid.level.zones[e.i]
        const name = z ? heistT(z.key) : ''
        if (raid.levelId === 'mansion') {
          this.mansionZoneToast(e.i, name)
          break
        }
        if (e.i > this.depthAtStart) {
          this.depthAtStart = e.i
          this.toast('good', heistT('heistV2NewDepth', { n: e.i + 1 }), name, 2.2)
        } else {
          this.toast('info', heistT('heistV2Zone', { n: e.i + 1 }), name, 1.6)
        }
        break
      }
      case 'nftView':
        this.deps.onNftView?.()
        break
      case 'ended':
        if (e.verdict === 'caught') this.rig.shake(0.3, 16)
        break
      default:
        break
    }
  }

  /** MANSION: new floor / new record / "time to go" — one banner, never a stream. */
  private mansionZoneToast(i: number, name: string) {
    const raid = this.raid
    const n = i + 1
    const far = FAR_HINTS.find((z) => n >= z && !this.farShown.has(z))
    if (far !== undefined && raid.bag > 0 && n < raid.level.zones.length) {
      for (const z of FAR_HINTS) if (z <= n) this.farShown.add(z)
      this.toast('warn', heistT('heistV2FarIn'), heistT('heistV2TimeToGo'), 3)
      this.exitView.emphasize(3)
      return
    }
    const max = raid.level.zones.length
    if (i > this.depthAtStart) {
      this.depthAtStart = i
      const newFloor = i % 10 === 0
      this.toast('good', newFloor ? heistT('heistV2Floor', { n: i / 10 + 1 }) : heistT('heistMansionZone', { n, max }), name, 2.2)
    } else {
      this.toast('info', heistT('heistMansionZone', { n, max }), name, 1.4)
    }
  }

  private toast(kind: Toast['kind'], title: string, sub: string | undefined, seconds: number) {
    this.toastId += 1
    // One banner per kind at a time; the newest wins.
    this.toasts = this.toasts.filter((t) => t.kind !== kind && t.until > this.clock).slice(-1)
    this.toasts.push({ id: this.toastId, kind, title, sub, until: this.clock + seconds })
  }

  // ---------- HUD ----------

  private publishHud(view: { x: number; y: number; w: number; h: number }) {
    const raid = this.raid
    const L = raid.level
    this.toasts = this.toasts.filter((t) => t.until > this.clock)
    const crack = raid.crack
    const p = raid.player
    const ex = L.exit.x + L.exit.w / 2
    const ey = L.exit.y + L.exit.h / 2
    const exitVisible = ex > view.x + 40 && ex < view.x + view.w - 40 && ey > view.y + 60 && ey < view.y + view.h - 60
    const dx = ex - this.duck.x
    const dy = ey - this.duck.y
    const zone = zoneAt(L, p.x, p.y)
    const cfg = raid.cfg.player
    const load = raid.weightCap() > 0 ? Math.min(1, raid.carriedWeight() / raid.weightCap()) : 0
    const heavy = raid.weightOver() > 0
    const prev = this.lastSnap
    const toasts = prev && sameToasts(prev.toasts, this.toasts) ? prev.toasts : [...this.toasts]
    const snap: HudSnapshot = {
      bag: raid.bag,
      bagCap: raid.mods.bagCap,
      full: raid.bag >= raid.mods.bagCap,
      alert: Math.round(raid.alert.value * 100) / 100,
      phase: raid.alert.phase,
      zone: zone.i + 1,
      zoneMax: raid.zoneMax + 1,
      zoneCount: L.zones.length,
      depthBest: Math.max(raid.depthBest, raid.zoneMax) + 1,
      zoneName: heistT(zone.key),
      level: raid.levelId,
      heavy,
      load: Math.round(load * 50) / 50,
      showWeight: raid.weightOn() && (heavy || raid.carried.length >= 2),
      canDrop: raid.canDrop(),
      prompt: raid.prompt?.kind ?? null,
      cracking: crack !== null,
      crack: crack
        ? {
            kind: crack.kind,
            marker: crack.marker,
            center: crack.zoneCenter,
            width: crack.zoneWidth,
            hits: crack.hits,
            need: crack.need,
            miss: raid.time < crack.missFlashUntil,
          }
        : null,
      dashCd: Math.round(p.dashCooldown(raid.time, cfg) * 40) / 40,
      dashing: p.gait === 'dash',
      sneaking: p.gait === 'sneak',
      hidden: raid.hidden,
      exitHold: Math.round(Math.min(1, raid.exitHold / 0.6) * 20) / 20,
      escapeLeft: raid.escapeUntil > 0 ? Math.max(0, Math.ceil(raid.escapeUntil - raid.time)) : null,
      exitArrow: !exitVisible && raid.bag > 0 ? { angle: Math.round(Math.atan2(dy, dx) * 20) / 20, dist: Math.round(Math.hypot(dx, dy) / 50) * 50 } : null,
      paused: raid.paused,
      ended: raid.ended,
      toasts,
      timeS: Math.floor(raid.time),
    }
    if (prev && sameSnap(prev, snap)) return
    this.lastSnap = snap
    this.deps.hud.set(snap)
  }

  debugState() {
    return {
      baked: this.baker.bakedCount(),
      objects: this.children.list.length,
      steps: this.stepsLastFrame,
    }
  }
}

function zoneTitle(raid: Raid) {
  const max = raid.level.zones.length
  return raid.levelId === 'bank' ? heistT('heistBankZone', { n: 1, max }) : heistT('heistMansionZone', { n: 1, max })
}

function sameToasts(a: Toast[], b: Toast[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) if (a[i].id !== b[i].id) return false
  return true
}

function sameSnap(a: HudSnapshot, b: HudSnapshot) {
  for (const k of Object.keys(b) as (keyof HudSnapshot)[]) {
    const x = a[k]
    const y = b[k]
    if (x === y) continue
    if (x && y && typeof x === 'object' && typeof y === 'object') {
      if (JSON.stringify(x) !== JSON.stringify(y)) return false
      continue
    }
    return false
  }
  return true
}
