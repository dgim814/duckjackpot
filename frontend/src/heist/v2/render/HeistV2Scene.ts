import Phaser from 'phaser'
import { ensureCoinPlaceholders, loadDuckCoinImages } from '../../coinAssets'
import { heistT } from '../../heistI18n'
import type { HeistEnd } from '../../types'
import { zoneAt } from '../level/LevelDef'
import { HEIST_LEVEL_NAME, isGrandLevel } from '../../heistLevel'
import type { MessageKey } from '../../../i18n/messages'
import type { RaidEvent } from '../sim/events'
import type { InputController } from '../sim/Input'
import { Raid, SIM_DT } from '../sim/Raid'
import type { HudSnapshot, HudStore, SafeFly, Toast } from '../ui/store'
import type { NftSkinDef } from '../../nftTrial'
import { DuckView, GuardView, createActorAnims, nftSkinTextureKey } from './Actors'
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
  /** Active 24h NFT try-on look, or null. Cosmetic only. */
  skin?: NftSkinDef | null
  onNftView?: () => void
}

/** Zones (1-based) where deep levels suggest heading back, once per raid each: 15, 25, 35… */
function farHints(zones: number) {
  const out: number[] = []
  for (let n = 15; n < zones; n += 10) out.push(n)
  return out
}
/** How long the police pill spells out why the timer started. */
const SIREN_INTRO_S = 3.6

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
  private farHints: number[] = []
  /** Big maps (LEVELS 3–5): ground tiles, lamps and labels drawn only near the camera. */
  private culled: { obj: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible; r: { x: number; y: number; w: number; h: number } }[] = []
  private cullFrame = 0
  /** Last cracked safe, for the coins that fly to the bag chip (held briefly in the HUD). */
  private safeFly: (SafeFly & { until: number }) | null = null
  private safeFlyId = 0
  private sirenBySafe = false
  private sirenAt = -1
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
    const skin = this.deps.skin
    if (skin?.sheet) this.load.spritesheet(nftSkinTextureKey(skin), skin.sheet.url, { frameWidth: skin.sheet.frameWidth, frameHeight: skin.sheet.frameHeight })
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
    this.farHints = farHints(L.zones.length)
    const before = this.children.list.length
    buildGround(this, L)
    this.baker = new WorldBaker(this, L, DEPTH.static)
    buildLabels(this, L)
    if (isGrandLevel(raid.levelId)) this.collectCulled(before)
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

  /**
   * Apply or clear the cosmetic NFT try-on look mid-raid. The fallback look is
   * shown at once; a full skin sheet, if the NFT has one, swaps in once loaded.
   */
  setSkin(skin: NftSkinDef | null) {
    this.deps.skin = skin
    this.duck?.setSkin(skin)
    if (!skin?.sheet || this.textures.exists(nftSkinTextureKey(skin))) return
    this.load.spritesheet(nftSkinTextureKey(skin), skin.sheet.url, { frameWidth: skin.sheet.frameWidth, frameHeight: skin.sheet.frameHeight })
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      if (this.deps.skin === skin) this.duck?.setSkin(skin)
    })
    this.load.start()
  }

  /** A banner from outside the simulation (e.g. the NFT try-on confirmation). */
  notify(kind: Toast['kind'], title: string, sub: string | undefined, seconds: number) {
    this.toast(kind, title, sub, seconds)
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
    this.cull(view)
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
      case 'safeOpened': {
        // The safe's own payout, told apart from floor coins: gold flash, burst, a big number,
        // a dedicated banner with the exact amount and coins flying into the bag chip.
        this.fx.burst(e.x, e.y, 34, 320)
        this.safeFlash(e.x, e.y)
        if (e.total > 0) this.fx.float(e.x, e.y - 90, `+${e.total}`, 'big')
        this.rig.shake(0.35, 18)
        // A bag overflow from this safe is explained on the safe banner itself: no second "bag full" banner.
        this.toasts = this.toasts.filter((t) => !(t.kind === 'warn' && t.until > this.clock + 2))
        this.toast(
          'safe',
          heistT('heistSafeBanner'),
          heistT('heistSafeReward', { n: e.total }),
          3.2,
          e.spilled > 0 ? heistT('heistSafeSpilled', { n: e.spilled }) : undefined,
        )
        if (e.reward > 0) {
          const cam = this.cameras.main
          const wv = cam.worldView
          this.safeFlyId += 1
          this.safeFly = {
            id: this.safeFlyId,
            x: Math.min(0.95, Math.max(0.05, (e.x - wv.x) / Math.max(1, wv.width))),
            y: Math.min(0.9, Math.max(0.1, (e.y - 40 - wv.y) / Math.max(1, wv.height))),
            amount: e.reward,
            until: this.clock + 1.4,
          }
        }
        this.sirenBySafe = true
        break
      }
      case 'siren':
        this.rig.shake(0.4, 22)
        // A safe-triggered siren is explained by the police timer pill itself (see Toasts).
        this.sirenAt = this.clock
        if (!this.sirenBySafe) this.toast('danger', heistT('heistSiren'), heistT('heistFleeNow'), 3)
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
        if (raid.levelId !== 'bank') {
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

  /** MANSION and LEVELS 3–5: new floor / new record / "time to go" — one banner, never a stream. */
  private mansionZoneToast(i: number, name: string) {
    const raid = this.raid
    const n = i + 1
    const far = this.farHints.find((z) => n >= z && !this.farShown.has(z))
    if (far !== undefined && raid.bag > 0 && n < raid.level.zones.length) {
      for (const z of this.farHints) if (z <= n) this.farShown.add(z)
      this.toast('warn', heistT('heistV2FarIn'), heistT('heistV2TimeToGo'), 3)
      this.exitView.emphasize(3)
      return
    }
    if (i > this.depthAtStart) {
      this.depthAtStart = i
      const newFloor = i % 10 === 0
      this.toast('good', newFloor ? sectionTitle(raid, i / 10) : zoneLabel(raid, n), name, 2.2)
    } else {
      this.toast('info', zoneLabel(raid, n), name, 1.4)
    }
  }

  /** Every object the ground/label builders just added, with its world bounds, for view culling. */
  private collectCulled(from: number) {
    for (const obj of this.children.list.slice(from)) {
      const o = obj as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible & { getBounds?: () => Phaser.Geom.Rectangle }
      if (!o.getBounds || typeof o.setVisible !== 'function') continue
      const b = o.getBounds()
      // The street and the facade outline cover the whole map: always drawn.
      if (b.width >= this.raid.level.w && b.height >= this.raid.level.h) continue
      this.culled.push({ obj: o, r: { x: b.x, y: b.y, w: b.width, h: b.height } })
    }
  }

  /** Cheap visibility pass a few times a second (static objects only; the camera moves slowly). */
  private cull(view: { x: number; y: number; w: number; h: number }) {
    if (this.culled.length === 0) return
    this.cullFrame += 1
    if (this.cullFrame % 6 !== 1) return
    const m = 700
    const x0 = view.x - m
    const x1 = view.x + view.w + m
    const y0 = view.y - m
    const y1 = view.y + view.h + m
    for (const c of this.culled) {
      const on = c.r.x < x1 && c.r.x + c.r.w > x0 && c.r.y < y1 && c.r.y + c.r.h > y0
      if (c.obj.visible !== on) c.obj.setVisible(on)
    }
  }

  private toast(kind: Toast['kind'], title: string, sub: string | undefined, seconds: number, note?: string) {
    this.toastId += 1
    // One banner per kind at a time; the newest wins.
    this.toasts = this.toasts.filter((t) => t.kind !== kind && t.until > this.clock).slice(-1)
    this.toasts.push({ id: this.toastId, kind, title, sub, note, until: this.clock + seconds })
  }

  /** One short additive gold bloom on the safe (single sprite, destroyed after). */
  private safeFlash(x: number, y: number) {
    const glow = this.add
      .image(x, y - 20, 'v2_glow')
      .setTint(0xffd65a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.fx)
      .setDisplaySize(120, 120)
      .setAlpha(0.95)
    this.tweens.add({ targets: glow, displayWidth: 380, displayHeight: 380, alpha: 0, duration: 750, ease: 'Cubic.easeOut', onComplete: () => glow.destroy() })
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
      escapeBySafe: raid.escapeUntil > 0 && this.sirenBySafe,
      escapeIntro: raid.escapeUntil > 0 && this.sirenBySafe && this.clock - this.sirenAt < SIREN_INTRO_S,
      safeFly: this.safeFly && this.safeFly.until > this.clock ? { id: this.safeFly.id, x: this.safeFly.x, y: this.safeFly.y, amount: this.safeFly.amount } : null,
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
  return raid.levelId === 'bank' ? heistT('heistBankZone', { n: 1, max }) : zoneLabel(raid, 1)
}

/** "MANSION · ЗОНА 7/40", "PRIVATE BANK · ЗОНА 7/50"… */
function zoneLabel(raid: Raid, n: number) {
  const max = raid.level.zones.length
  if (raid.levelId === 'mansion') return heistT('heistMansionZone', { n, max })
  return heistT('heistLevelZone', { level: heistT(HEIST_LEVEL_NAME[raid.levelId]), n, max })
}

/** New floor banner: MANSION counts floors, LEVELS 3–5 name their sections. */
function sectionTitle(raid: Raid, floor: number) {
  if (isGrandLevel(raid.levelId)) {
    const lv = raid.levelId === 'level3' ? 'L3' : raid.levelId === 'level4' ? 'L4' : 'L5'
    return heistT(`heist${lv}s${floor + 1}` as MessageKey)
  }
  return heistT('heistV2Floor', { n: floor + 1 })
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
