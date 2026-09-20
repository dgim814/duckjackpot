import Phaser from 'phaser'
import { cropOpaque, punchBackdrop } from '../sprite'
import type { HeistEnd } from '../types'
import { persistBankWorld, RAID_OBJ_LOOT, RAID_OBJ_TIME_S, raidObjectiveBonus, loadProgress, type HeistRunMods } from '../progress'
import { heistLevelObjectives, type HeistLevelId } from '../heistLevel'
import { applyCoinSpriteSize, coinDef, ensureCoinPlaceholders, loadDuckCoinImages, playCoinIdle, stopCoinIdle, SAFE_REWARD, type DuckCoinKind } from '../coinAssets'
import { heistT } from '../heistI18n'
import { heistSfx, unlockHeistSfx } from '../heistSfx'
import { buildNavGrid, cellCenter, findPath, findPathAroundStuck, nearestWalkable, type NavGrid } from '../guardPath'
import { debugTuningVersion, exposeDebugTuning, resolveTuning } from '../debugConfig'
import { adaptiveCameraZoom, type HeistTuning } from '../tuning'
import type { MessageKey } from '../../i18n/messages'
import { paintDecor, paintFoliage, paintFurniture, type FurnKind } from './furniture'
import {
  BANK_CAMS,
  BANK_DECOR,
  BANK_DOORS,
  BANK_EXIT,
  BANK_FLOORS,
  BANK_FOLIAGE,
  BANK_FURNITURE,
  BANK_GUARD_ROUTES,
  BANK_H,
  BANK_HIDES,
  BANK_LABELS,
  BANK_LAMPS,
  BANK_LOOT,
  BANK_SAFES,
  BANK_SPAWN,
  BANK_W,
  BANK_WALLS,
  BANK_ZONE_COUNT,
  bankZoneAt,
} from './bankLayout'
import {
  MANSION_CAMS,
  MANSION_DECOR,
  MANSION_DOORS,
  MANSION_EXIT,
  MANSION_FLOORS,
  MANSION_FURNITURE,
  MANSION_GUARD_ROUTES,
  MANSION_H,
  MANSION_HIDES,
  MANSION_LABELS,
  MANSION_LAMPS,
  MANSION_LOOT,
  MANSION_SAFES,
  MANSION_SIREN,
  MANSION_SPAWN,
  MANSION_W,
  MANSION_WALLS,
} from './mansionLayout'

const NOISE = { sneak: 10, run: 35, dash: 80 } as const
const PICKUP_R = 42
const EXIT_HOLD = 0.62
const BTN_R = 52
const DEBUG = import.meta.env.DEV

type GuardState = 'PATROL' | 'INVESTIGATE' | 'CHASE' | 'SEARCH' | 'RETURN'
type GuardUnit = {
  sprite: Phaser.Physics.Arcade.Sprite
  state: GuardState
  waypoints: Phaser.Math.Vector2[]
  wi: number
  searchT: number
  searchPts: Phaser.Math.Vector2[]
  searchI: number
  lastSeen: Phaser.Math.Vector2
  facing: number
  path: Phaser.Math.Vector2[]
  pathDest: Phaser.Math.Vector2
  repathAt: number
  stuckT: number
  stuckTries: number
  lastPos: Phaser.Math.Vector2
  detect: number
}
type MoveAnim = 'idle' | 'walk' | 'run' | 'sneak' | 'dash'
type LootKind = DuckCoinKind
type CarriedLoot = { kind: LootKind; value: number; weight: number; persistId?: string }
type RaidPhase = 'SAFE' | 'SUSPICIOUS' | 'DANGER' | 'CHASE'
const PHASE_RANK: Record<RaidPhase, number> = { SAFE: 0, SUSPICIOUS: 1, DANGER: 2, CHASE: 3 }
const PHASE_KEY: Record<RaidPhase, 'safe' | 'suspicious' | 'danger' | 'chase'> = {
  SAFE: 'safe',
  SUSPICIOUS: 'suspicious',
  DANGER: 'danger',
  CHASE: 'chase',
}
const PHASE_LABEL: Record<RaidPhase, 'heistHudSafe' | 'heistHudSuspicious' | 'heistHudDanger' | 'heistHudChase'> = {
  SAFE: 'heistHudSafe',
  SUSPICIOUS: 'heistHudSuspicious',
  DANGER: 'heistHudDanger',
  CHASE: 'heistHudChase',
}
const PHASE_COLOR: Record<RaidPhase, string> = {
  SAFE: '#b6e3b0',
  SUSPICIOUS: '#ffe08a',
  DANGER: '#ff8a6a',
  CHASE: '#ff8a6a',
}
const PHASE_TINT: Record<RaidPhase, { color: number; alpha: number }> = {
  SAFE: { color: 0x000000, alpha: 0 },
  SUSPICIOUS: { color: 0xc9a227, alpha: 0.05 },
  DANGER: { color: 0xc4432a, alpha: 0.1 },
  CHASE: { color: 0xc4432a, alpha: 0.16 },
}
const SAFE_RANGE = 86
const SAFE_HITS = 5
const DOOR_RANGE = 78
const DOOR_HITS = 2

type Wall = { x: number; y: number; w: number; h: number }
type HideZone = Wall
type SolidKind = 'wall' | FurnKind
type SafeSpot = {
  id: string
  x: number
  y: number
  opened: boolean
  extraX: number
  extraY: number
  extraKind?: LootKind
  extraId?: string
  reward?: number
}
type LockedDoor = {
  id: string
  x: number
  y: number
  w: number
  h: number
  opened: boolean
  body: Phaser.GameObjects.Rectangle
  lock: Phaser.GameObjects.Graphics
  label: Phaser.GameObjects.Text
}
type SecCam = {
  x: number
  y: number
  facing: number
  base: number
  sweep: number
  speed: number
  sprite: Phaser.GameObjects.Image
  beam: Phaser.GameObjects.Image
  led: Phaser.GameObjects.Arc
  hot: boolean
}

/** Top-down still used as fallback texture on disk; walk cycle is `guard_sheet`. */
const GUARD_PNG = '/heist/guard.png'
const GUARD_SHEET = '/heist/guard_sheet.png'
const GUARD_FRAME = 256
const GUARD_DISPLAY = 60
const DUCK_SHEET = '/heist/duck_sheet.png'
const DUCK_FRAME = 256
const DUCK_DISPLAY = 104
const DUCK_BODY_W = 20
const DUCK_BODY_H = 22
/** Previous visual size; keep world hitbox identical when display scale changes. */
const DUCK_HITBOX_FROM = 44

function formatClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export class HeistScene extends Phaser.Scene {
  private onDone: (end: HeistEnd) => void
  private mods: HeistRunMods
  private levelId: HeistLevelId
  private novice = false
  private objLoot = RAID_OBJ_LOOT
  private objTimeS = RAID_OBJ_TIME_S
  private player!: Phaser.Physics.Arcade.Sprite
  private duckAnimsReady = false
  private units: GuardUnit[] = []
  private walls!: Phaser.Physics.Arcade.StaticGroup
  private wallRects: Wall[] = []
  private hideZones: HideZone[] = []
  private doors: LockedDoor[] = []
  private mapW = BANK_W
  private mapH = BANK_H
  private lootGroup!: Phaser.Physics.Arcade.Group
  private lootSpawn = 0
  private exitZone!: Phaser.GameObjects.Rectangle
  private exitZones: Phaser.GameObjects.Rectangle[] = []
  private exitLabels: Phaser.GameObjects.Text[] = []
  private visionGfx!: Phaser.GameObjects.Graphics
  private worldGfx!: Phaser.GameObjects.Graphics
  private uiGfx!: Phaser.GameObjects.Graphics
  private hud!: Phaser.GameObjects.Text
  private bagHud!: Phaser.GameObjects.Text
  private objHud!: Phaser.GameObjects.Text
  private crackHud!: Phaser.GameObjects.Text
  private crackHint!: Phaser.GameObjects.Text
  private fx?: Phaser.GameObjects.Particles.ParticleEmitter

  private stick = { active: false, x: 0, y: 0, id: -1, ox: 0, oy: 0 }
  private sneakHeld = false
  private sneakId = -1
  private dashUntil = 0
  private dashReady = 0
  private exitHold = 0
  private escaping = false
  private camSees = false
  private winKeys = {
    w: false,
    a: false,
    s: false,
    d: false,
    up: false,
    left: false,
    down: false,
    right: false,
    shift: false,
    space: false,
    e: false,
    q: false,
  }
  private onWinKey = (e: KeyboardEvent, down: boolean) => {
    if (e.code === 'KeyC') {
      if (down) {
        e.preventDefault()
        unlockHeistSfx()
        heistSfx.toggleChasePreview()
      }
      return
    }
    if (e.code === 'Escape') {
      if (down) {
        e.preventDefault()
        unlockHeistSfx()
        this.togglePause()
      }
      return
    }
    if (this.paused) {
      e.preventDefault()
      return
    }
    const map: Record<string, keyof typeof this.winKeys> = {
      KeyW: 'w',
      KeyA: 'a',
      KeyS: 's',
      KeyD: 'd',
      ArrowUp: 'up',
      ArrowLeft: 'left',
      ArrowDown: 'down',
      ArrowRight: 'right',
      ShiftLeft: 'shift',
      ShiftRight: 'shift',
      Space: 'space',
      KeyE: 'e',
      KeyQ: 'q',
    }
    const slot = map[e.code]
    if (!slot) return
    e.preventDefault()
    this.winKeys[slot] = down
    if (this.safeCrack && down && (slot === 'space' || slot === 'e')) {
      this.trySafeHit()
      return
    }
    if (slot === 'q' && down) this.tryDropLoot()
    if (slot === 'e' && down) this.tryOpenSafe()
    if (slot === 'space' && down && !this.safeCrack) this.tryDash()
  }
  private facing = new Phaser.Math.Vector2(1, 0)
  private noise = 0
  private noiseR = 0
  private currentLoot = 0
  private alert = 0
  private hidden = false
  private ended = false
  private paused = false
  private pauseAt = 0
  private pauseShift = 0
  private pauseGfx!: Phaser.GameObjects.Graphics
  private pauseHudLbl!: Phaser.GameObjects.Text
  private pauseTitle!: Phaser.GameObjects.Text
  private pauseResumeLbl!: Phaser.GameObjects.Text
  private pauseAbortLbl!: Phaser.GameObjects.Text
  private stealthBroken = false
  private startedAt = 0
  private combo = 0
  private maxCombo = 0
  private lastPickup = 0
  private cams: SecCam[] = []
  private safes: SafeSpot[] = []
  private crackI = 0
  private safePos = new Phaser.Math.Vector2(1188, 148)
  private safeOpened = false
  private safeCrack = false
  private crackKind: 'safe' | 'door' = 'safe'
  private crackDoor: LockedDoor | null = null
  private doorOpenedAt = 0
  private safeHits = 0
  private safeMarker = 0
  private safeDir = 1
  private safeHitLock = 0
  private safePrompt!: Phaser.GameObjects.Text
  private openHeld = false
  private openId = -1
  private bagFullFlash = 0
  private openLabel!: Phaser.GameObjects.Text
  private exitLabel!: Phaser.GameObjects.Text
  private roomLabels: { obj: Phaser.GameObjects.Text; key: MessageKey }[] = []
  private sneakLabel!: Phaser.GameObjects.Text
  private dashLabel!: Phaser.GameObjects.Text
  private safeTitle!: Phaser.GameObjects.Text
  private safeOpenedAt = 0
  private hitHeld = false
  private carried: CarriedLoot[] = []
  private dropReadyAt = 0
  private dropLabel!: Phaser.GameObjects.Text
  private stickRunHeld = false
  private firstLootAt = 0
  private lootIdleS = 0
  private onboardUntil = 0
  private runLootIds: string[] = []
  private runDropSprites: Phaser.Physics.Arcade.Sprite[] = []
  private bankDepth = 0
  private bankZoneNow = 0
  private bankReachedFinal = false
  private bankTaken = new Set<string>()
  private bankOpenedSafes = new Set<string>()
  private bankOpenedDoors = new Set<string>()
  private raidPhase: RaidPhase = 'SAFE'
  private phaseChangedAt = -9999
  private phaseRising = false
  private quietT = 0
  private camClock = 0
  private phaseHud!: Phaser.GameObjects.Text
  private phaseTint!: Phaser.GameObjects.Rectangle
  private sirenOn = false
  private escapeUntil = 0
  private hitStopUntil = 0
  private routeNoticeAt = -9999
  private sirenPanels: { x: number; y: number; w: number; h: number; opened: boolean; body: Phaser.GameObjects.Rectangle }[] = []

  private keys!: {
    w: { isDown: boolean }
    a: { isDown: boolean }
    s: { isDown: boolean }
    d: { isDown: boolean }
    up: { isDown: boolean }
    left: { isDown: boolean }
    down: { isDown: boolean }
    right: { isDown: boolean }
    shift: { isDown: boolean }
    space: Phaser.Input.Keyboard.Key | { isDown: boolean }
    e: Phaser.Input.Keyboard.Key | { isDown: boolean }
    q: Phaser.Input.Keyboard.Key | { isDown: boolean }
  }

  private nav!: NavGrid
  private cfg: HeistTuning
  private cfgV = -1
  private uiCam?: Phaser.Cameras.Scene2D.Camera

  constructor(onDone: (end: HeistEnd) => void, mods: HeistRunMods, levelId: HeistLevelId = 'bank', novice = false) {
    super('HeistScene')
    this.onDone = onDone
    this.mods = mods
    this.levelId = levelId
    this.novice = novice
    this.cfg = resolveTuning(levelId)
    this.cfgV = debugTuningVersion()
    if (levelId === 'bank') {
      const world = loadProgress()
      this.bankTaken = new Set(world.bankLootTaken ?? [])
      this.bankOpenedSafes = new Set(world.bankOpenedSafes ?? [])
      this.bankOpenedDoors = new Set(world.bankOpenedDoors ?? [])
      this.bankDepth = Math.max(0, Math.floor(world.bankDepth ?? 0))
      this.bankReachedFinal = Boolean(world.bankReachedFinal)
    }
    const obj = heistLevelObjectives(levelId)
    // A goal above the bag capacity can never be met, so a small bag lowers it.
    this.objLoot = Math.min(obj.loot, mods.bagCap)
    this.objTimeS = obj.timeS
  }

  private refreshTuning() {
    this.cfg = resolveTuning(this.levelId)
    this.cfgV = debugTuningVersion()
  }

  private guardFov() {
    return Phaser.Math.DegToRad(this.cfg.vision.guardFovDeg)
  }

  private camFov() {
    return Phaser.Math.DegToRad(this.cfg.vision.camFovDeg)
  }

  private limitCount<T>(items: readonly T[], max: number | null) {
    return max === null ? items : items.slice(0, Math.max(0, max))
  }

  /**
   * The world camera is zoomed out so the player can read the room ahead, while
   * a second unzoomed camera keeps the HUD and touch controls at full size.
   */
  private setupCameras() {
    const ui: (Phaser.GameObjects.GameObject | undefined)[] = [
      this.phaseTint,
      this.uiGfx,
      this.hud,
      this.bagHud,
      this.objHud,
      this.crackHud,
      this.crackHint,
      this.phaseHud,
      this.sneakLabel,
      this.dashLabel,
      this.openLabel,
      this.dropLabel,
      this.pauseGfx,
      this.pauseHudLbl,
      this.pauseTitle,
      this.pauseResumeLbl,
      this.pauseAbortLbl,
    ]
    const uiList = ui.filter((o): o is Phaser.GameObjects.GameObject => Boolean(o))
    const uiSet = new Set(uiList)

    this.cameras.main.setZoom(adaptiveCameraZoom(this.scale.width, this.scale.height, this.cfg.camera.zoom))
    this.cameras.main.setBounds(0, 0, this.mapW, this.mapH)
    this.cameras.main.ignore(uiList)

    this.uiCam = this.cameras.add(0, 0, this.scale.width, this.scale.height)
    this.uiCam.setName('hud')
    this.uiCam.setScroll(0, 0)
    this.uiCam.ignore(this.children.list.filter((o) => !uiSet.has(o)))

    this.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, this.onWorldObjectAdded)
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onScaleResize)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, this.onWorldObjectAdded)
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onScaleResize)
    })
  }

  /** Everything spawned after setup (loot, effects, shutters) belongs to the world. */
  private onWorldObjectAdded = (obj: Phaser.GameObjects.GameObject) => {
    this.uiCam?.ignore(obj)
  }

  private onScaleResize = (size: Phaser.Structs.Size) => {
    this.uiCam?.setSize(size.width, size.height)
    this.cameras.main.setZoom(adaptiveCameraZoom(size.width, size.height, this.cfg.camera.zoom))
    this.cameras.main.setBounds(0, 0, this.mapW, this.mapH)
    this.applyCameraFollow()
  }

  /** Keep the duck in the lower-centre of the canvas, below the Mini App HUD. */
  private applyCameraFollow() {
    if (!this.player) return
    this.cameras.main.startFollow(this.player, true, 0.22, 0.22)
    this.cameras.main.setDeadzone(36, 52)
    this.cameras.main.setFollowOffset(0, 88)
    this.cameras.main.setBounds(0, 0, this.mapW, this.mapH)
  }

  preload() {
    this.load.image('duck', '/heist/duck.png')
    this.load.spritesheet('duck_sheet', DUCK_SHEET, { frameWidth: DUCK_FRAME, frameHeight: DUCK_FRAME })
    this.load.image('guard', GUARD_PNG)
    this.load.spritesheet('guard_sheet', GUARD_SHEET, { frameWidth: GUARD_FRAME, frameHeight: GUARD_FRAME })
    loadDuckCoinImages(this)
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: { key?: string }) => {
      if (file?.key === 'duck_sheet') this.duckAnimsReady = false
    })
  }

  create() {
    try {
      this.buildTextures()
      this.buildWorld()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.add
        .text(16, 16, `HEIST ERROR\n${msg}`, { fontSize: '14px', color: '#ff8080', wordWrap: { width: 360 } })
        .setScrollFactor(0)
        .setDepth(1000)
      console.error(err)
    }
  }

  private tex(key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) {
    const g = this.add.graphics()
    draw(g)
    g.generateTexture(key, w, h)
    g.destroy()
  }

  private buildTextures() {
    this.makeFloorTexture()
    this.tex('cam_mount', 36, 36, (g) => {
      g.fillStyle(0x0a090e)
      g.fillRoundedRect(4, 4, 28, 28, 4)
      g.lineStyle(1.5, 0xc9a227, 0.5)
      g.strokeRoundedRect(5, 5, 26, 26, 3)
      g.fillStyle(0x16141c)
      g.fillCircle(18, 18, 9)
      g.fillStyle(0x0c0c12)
      g.fillCircle(18, 18, 5)
    })
    this.tex('cam', 80, 40, (g) => {
      g.fillStyle(0x0e0c12)
      g.fillRoundedRect(2, 12, 18, 16, 3)
      g.fillStyle(0x1a1820)
      g.fillRoundedRect(16, 9, 30, 22, 5)
      g.lineStyle(1.5, 0xc9a227, 0.75)
      g.strokeRoundedRect(16, 9, 30, 22, 5)
      g.fillStyle(0x0a0c10)
      g.fillCircle(64, 20, 14)
      g.lineStyle(2, 0xa8883a, 0.9)
      g.strokeCircle(64, 20, 14)
      g.fillStyle(0x1c2830)
      g.fillCircle(64, 20, 9)
      g.fillStyle(0x4a5a66)
      g.fillCircle(64, 20, 5.5)
      g.fillStyle(0xd8eef8, 0.5)
      g.fillCircle(67, 17, 2)
      g.fillStyle(0xc9a227)
      g.fillCircle(24, 14, 2.2)
    })
    this.makeCamBeamTexture()
    ensureCoinPlaceholders(this)
    this.tex('spark', 6, 6, (g) => {
      g.fillStyle(0xffe08a)
      g.fillCircle(3, 3, 3)
    })
  }

  private makeFloorTexture() {
    const s = 256
    const c = document.createElement('canvas')
    c.width = s
    c.height = s
    const ctx = c.getContext('2d')
    if (!ctx) return
    const mansion = this.levelId === 'mansion'
    ctx.fillStyle = mansion ? '#1c1410' : '#1a222c'
    ctx.fillRect(0, 0, s, s)
    if (mansion) {
      ctx.strokeStyle = 'rgba(90,58,32,0.22)'
      ctx.lineWidth = 2
      for (let y = 0; y < s; y += 32) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(s, y)
        ctx.stroke()
      }
    } else {
      ctx.strokeStyle = 'rgba(180,198,214,0.08)'
      ctx.lineWidth = 1
      for (let i = 0; i <= s; i += 64) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i, s)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, i)
        ctx.lineTo(s, i)
        ctx.stroke()
      }
    }
    for (let i = 0; i < 48; i += 1) {
      const x = (i * 53) % s
      const y = (i * 97) % s
      const rad = 16 + (i % 7) * 7
      const grad = ctx.createRadialGradient(x, y, 0, x, y, rad)
      grad.addColorStop(0, mansion
        ? i % 2 === 0
          ? 'rgba(56,36,24,0.5)'
          : 'rgba(18,10,8,0.45)'
        : i % 2 === 0
          ? 'rgba(36,32,44,0.5)'
          : 'rgba(10,8,14,0.45)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(x, y, rad, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = mansion ? 'rgba(201,162,39,0.045)' : 'rgba(201,162,39,0.028)'
    for (let i = 0; i < 60; i += 1) {
      ctx.fillRect((i * 37) % s, (i * 71) % s, 2, 1)
    }
    if (this.textures.exists('floor_tile')) this.textures.remove('floor_tile')
    this.textures.addCanvas('floor_tile', c)
  }

  private makeCamBeamTexture() {
    const distPx = 256
    const half = distPx * Math.tan(this.camFov() / 2)
    const w = distPx
    const h = Math.ceil(half * 2)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    if (!ctx) return
    const oy = h / 2
    ctx.beginPath()
    ctx.moveTo(0, oy)
    ctx.lineTo(w, oy - half)
    ctx.lineTo(w, oy + half)
    ctx.closePath()
    ctx.clip()
    const along = ctx.createLinearGradient(0, oy, w, oy)
    along.addColorStop(0, 'rgba(232, 196, 106, 0.32)')
    along.addColorStop(0.1, 'rgba(201, 162, 39, 0.2)')
    along.addColorStop(0.4, 'rgba(201, 162, 39, 0.08)')
    along.addColorStop(0.75, 'rgba(201, 162, 39, 0.03)')
    along.addColorStop(1, 'rgba(201, 162, 39, 0)')
    ctx.fillStyle = along
    ctx.fillRect(0, 0, w, h)
    const across = ctx.createLinearGradient(0, 0, 0, h)
    across.addColorStop(0, 'rgba(0,0,0,1)')
    across.addColorStop(0.18, 'rgba(0,0,0,0.35)')
    across.addColorStop(0.5, 'rgba(0,0,0,0)')
    across.addColorStop(0.82, 'rgba(0,0,0,0.35)')
    across.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = across
    ctx.fillRect(0, 0, w, h)
    if (this.textures.exists('cam_beam')) this.textures.remove('cam_beam')
    this.textures.addCanvas('cam_beam', c)
  }

  private makeDuckTexture() {
    const src = this.textures.get('duck').getSourceImage()
    if (src instanceof HTMLImageElement) {
      const punched = punchBackdrop(src)
      const cropped = cropOpaque(punched instanceof HTMLCanvasElement ? punched : src)
      if (cropped instanceof HTMLCanvasElement) {
        if (this.textures.exists('duck_play')) this.textures.remove('duck_play')
        this.textures.addCanvas('duck_play', cropped)
        return 'duck_play'
      }
    }
    return 'duck'
  }

  private addSolid(x: number, y: number, w: number, h: number, kind: SolidKind) {
    const cx = x + w / 2
    const cy = y + h / 2
    if (kind !== 'wall') {
      paintFurniture(this, { x, y, w, h, kind }, this.levelId === 'mansion' ? 'mansion' : 'bank')
      const r = this.add.rectangle(cx, cy, w, h, 0x000000, 0).setDepth(4)
      this.physics.add.existing(r, true)
      this.walls.add(r)
      this.wallRects.push({ x, y, w, h })
      return r
    }
    const mansion = this.levelId === 'mansion'
    const fill = mansion ? 0x2a1c14 : 0x1c2430
    this.add.rectangle(cx + 5, cy + 8, w + 2, h + 2, 0x050308, 0.48).setDepth(3)
    const r = this.add.rectangle(cx, cy, w, h, fill).setDepth(4)
    r.setStrokeStyle(1, 0x0a080c, 1)
    const trim = this.add.graphics().setDepth(5)
    trim.lineStyle(1.25, mansion ? 0xb8894a : 0x8aa0b4, mansion ? 0.28 : 0.2)
    trim.strokeRect(x + 2, y + 2, w - 4, h - 4)
    trim.fillStyle(mansion ? 0xe8d7a0 : 0xc5d4e0, 0.12)
    trim.fillRect(x + 2, y + 1, w - 4, 3)
    trim.fillStyle(mansion ? 0x1a100c : 0x101820, 0.35)
    if (w >= h && w > 64) {
      for (let px = x + 28; px < x + w - 12; px += 36) trim.fillRect(px, y + 5, 1, h - 10)
    } else if (h > 64) {
      for (let py = y + 28; py < y + h - 12; py += 36) trim.fillRect(x + 5, py, w - 10, 1)
    }
    this.physics.add.existing(r, true)
    this.walls.add(r)
    this.wallRects.push({ x, y, w, h })
    return r
  }

  private addHide(x: number, y: number, w: number, h: number) {
    this.hideZones.push({ x, y, w, h })
  }

  private paintHideMats() {
    const g = this.add.graphics().setDepth(1)
    for (const z of this.hideZones) {
      g.fillStyle(0x0a080c, 0.5)
      g.fillRoundedRect(z.x + 2, z.y + 2, z.w - 4, z.h - 4, 6)
    }
  }

  private paintLamps(lamps: readonly ([number, number] | { x: number; y: number; color?: number; alpha?: number })[]) {
    const g = this.add.graphics().setDepth(2)
    const mansion = this.levelId === 'mansion'
    for (const lamp of lamps) {
      const lx = Array.isArray(lamp) ? lamp[0] : lamp.x
      const ly = Array.isArray(lamp) ? lamp[1] : lamp.y
      const color = !Array.isArray(lamp) && lamp.color != null ? lamp.color : mansion ? 0xd4a24a : 0xc9a227
      const alpha = !Array.isArray(lamp) && lamp.alpha != null ? lamp.alpha : mansion ? 0.08 : 0.08
      g.fillStyle(color, alpha)
      g.fillCircle(lx, ly, mansion ? 48 : 72)
      g.fillStyle(color, alpha * 0.55)
      g.fillCircle(lx, ly, mansion ? 28 : 40)
      g.fillStyle(mansion ? 0x3a2418 : 0x1a2430)
      g.fillCircle(lx, ly, 7)
      g.lineStyle(1.5, 0xc9a227, 0.55)
      g.strokeCircle(lx, ly, 7)
      g.fillStyle(0xffe08a, 0.7)
      g.fillCircle(lx, ly, 2.8)
    }
  }

  private buildSafe(x = this.safePos.x, y = this.safePos.y) {
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0x050308, 0.55)
    g.fillRoundedRect(x - 70, y - 52, 148, 122, 12)
    g.fillStyle(0x141820)
    g.fillRoundedRect(x - 62, y - 48, 124, 108, 10)
    g.fillStyle(0x2a323c)
    g.fillRoundedRect(x - 54, y - 42, 108, 94, 8)
    g.lineStyle(3, 0xc9a227, 1)
    g.strokeRoundedRect(x - 54, y - 42, 108, 94, 8)
    g.lineStyle(1.5, 0xe8d7a0, 0.35)
    g.strokeRoundedRect(x - 48, y - 36, 96, 82, 6)
    g.fillStyle(0x0e1218)
    g.fillCircle(x, y + 4, 36)
    g.lineStyle(4, 0xe0c56a, 0.95)
    g.strokeCircle(x, y + 4, 36)
    g.lineStyle(2, 0x8a9aa8, 0.65)
    g.strokeCircle(x, y + 4, 26)
    g.lineStyle(3, 0xc9a227, 0.85)
    g.beginPath()
    g.moveTo(x, y + 4)
    g.lineTo(x + 22, y - 8)
    g.strokePath()
    g.fillStyle(0xc9a227)
    g.fillCircle(x + 18, y + 4, 8)
    g.fillStyle(0x1a1410)
    g.fillCircle(x + 18, y + 4, 3.5)
    g.fillStyle(0x9aa8b4)
    g.fillCircle(x, y + 4, 6)
    g.fillStyle(0x1a2228)
    g.fillRoundedRect(x - 62, y - 28, 10, 18, 2)
    g.fillRoundedRect(x - 62, y + 16, 10, 18, 2)
    g.fillStyle(0xc9a227, 0.7)
    g.fillCircle(x - 57, y - 19, 2)
    g.fillCircle(x - 57, y + 25, 2)
    for (const [dx, dy] of [
      [-40, -26],
      [40, -26],
      [-40, 36],
      [40, 36],
    ] as const) {
      g.fillStyle(0x1a2228)
      g.fillCircle(x + dx, y + dy, 5)
      g.fillStyle(0xc9a227, 0.8)
      g.fillCircle(x + dx, y + dy, 2.2)
    }
    this.safeTitle = this.add
      .text(x, y - 58, heistT('heistSafeName'), {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '15px',
        color: '#ffe08a',
      })
      .setOrigin(0.5)
      .setDepth(8)
    this.safePrompt = this.add
      .text(x, y + 62, '', {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '14px',
        color: '#ffe08a',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(16)
  }

  private buildWorld() {
    this.cameras.main.setBackgroundColor(this.levelId === 'mansion' ? 0x140e0c : 0x0c0a10)
    this.mapW = this.levelId === 'mansion' ? MANSION_W : BANK_W
    this.mapH = this.levelId === 'mansion' ? MANSION_H : BANK_H
    this.physics.world.setBounds(0, 0, this.mapW, this.mapH)
    if (this.levelId === 'mansion') {
      this.buildMansionWorld()
      return
    }
    this.buildBankWorld()
  }

  private setupPlaySession() {
    this.worldGfx = this.add.graphics().setDepth(10)
    this.visionGfx = this.add.graphics().setDepth(2)
    this.uiGfx = this.add.graphics().setScrollFactor(0).setDepth(20)
    this.pauseGfx = this.add.graphics().setScrollFactor(0).setDepth(80)
    this.pauseHudLbl = this.add
      .text(0, 0, heistT('heistPause'), {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '8px',
        color: '#ffe08a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51)
    this.pauseTitle = this.add
      .text(0, 0, heistT('heistPaused'), {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '24px',
        color: '#ffe08a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(81)
      .setVisible(false)
    this.pauseResumeLbl = this.add
      .text(0, 0, heistT('heistResume'), {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '16px',
        color: '#120c10',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(81)
      .setVisible(false)
    this.pauseAbortLbl = this.add
      .text(0, 0, heistT('heistAbortRaid'), {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '15px',
        color: '#ffe08a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(81)
      .setVisible(false)
    this.hud = this.add
      .text(12, 9, '', { fontFamily: 'Unbounded, sans-serif', fontSize: '11px', color: '#f3e6c4' })
      .setScrollFactor(0)
      .setDepth(21)
    this.bagHud = this.add
      .text(12, 26, '', { fontFamily: 'Unbounded, sans-serif', fontSize: '11px', color: '#f3e6c4' })
      .setScrollFactor(0)
      .setDepth(21)
    this.objHud = this.add
      .text(10, 52, '', { fontFamily: 'Unbounded, sans-serif', fontSize: '9px', color: '#d8c49a', lineSpacing: 2 })
      .setScrollFactor(0)
      .setDepth(21)
    this.phaseTint = this.add
      .rectangle(this.camW() / 2, this.camH() / 2, this.camW(), this.camH(), 0xc4432a, 0)
      .setScrollFactor(0)
      .setDepth(19)
      .setVisible(false)
    this.phaseHud = this.add
      .text(this.camW() / 2, 78, '', {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '15px',
        color: '#ffe08a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(23)
      .setVisible(false)
    this.crackHud = this.add
      .text(0, 36, '', {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '13px',
        color: '#ffe08a',
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(24)
      .setVisible(false)
    this.crackHint = this.add
      .text(0, 148, '', {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '10px',
        color: '#d8c49a',
        align: 'center',
        wordWrap: { width: 280 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(24)
      .setVisible(false)

    try {
      this.fx = this.add.particles(0, 0, 'spark', {
        frame: '__BASE',
        speed: { min: 40, max: 120 },
        lifespan: 420,
        scale: { start: 1, end: 0 },
        emitting: false,
      })
      this.fx.setDepth(14)
    } catch (err) {
      console.error(err)
    }

    this.cameras.main.startFollow(this.player, true, 0.22, 0.22)
    this.applyCameraFollow()

    this.input.addPointer(3)
    this.input.setTopOnly(false)
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p))
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p))
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.onUp(p))
    this.input.on('gameout', () => this.releaseTouches())
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.paused) return
      if (this.stick.active && p.id === this.stick.id) this.setStick(p.x, p.y)
    })
    const cancel = () => this.onInputCancel()
    this.game.canvas.addEventListener('pointercancel', cancel)
    this.game.canvas.addEventListener('touchcancel', cancel)
    this.input.on('pointercancel', (p: Phaser.Input.Pointer) => this.onPointerCancel(p))

    const off = { isDown: false }
    const kb = this.input.keyboard
    if (kb) {
      kb.addCapture(['W', 'A', 'S', 'D', 'SHIFT', 'SPACE', 'E'])
      this.keys = {
        w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
        left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
        right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
        shift: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
        space: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        e: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
        q: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      }
    } else {
      this.keys = { w: off, a: off, s: off, d: off, up: off, left: off, down: off, right: off, shift: off, space: off, e: off, q: off }
    }

    this.sneakLabel = this.add
      .text(this.camW() - 62, this.camH() - 158, heistT('heistSneak'), {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '9px',
        color: '#ffe08a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(22)
    this.dashLabel = this.add
      .text(this.camW() - 62, this.camH() - 78, heistT('heistDash'), {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '9px',
        color: '#ffe08a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(22)
    this.openLabel = this.add
      .text(this.camW() - 62, this.camH() - 238, heistT('heistOpen'), {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '9px',
        color: '#ffe08a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(22)
      .setVisible(false)
    this.dropLabel = this.add
      .text(this.camW() - 62, this.camH() - 318, heistT('heistDrop'), {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '9px',
        color: '#ffb070',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(22)
      .setVisible(false)

    this.setupCameras()

    this.startedAt = this.time.now
    if (this.novice && this.levelId === 'bank') this.onboardUntil = this.gameNow() + 2000
    this.game.canvas.setAttribute('tabindex', '0')
    this.game.canvas.style.outline = 'none'
    this.game.canvas.focus()
    const down = (e: KeyboardEvent) => this.onWinKey(e, true)
    const up = (e: KeyboardEvent) => this.onWinKey(e, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      this.game.canvas.removeEventListener('pointercancel', cancel)
      this.game.canvas.removeEventListener('touchcancel', cancel)
      const w = window as Window & { __heist?: HeistScene }
      if (w.__heist === this) delete w.__heist
    })
    if (DEBUG) {
      ;(window as Window & { __heist?: HeistScene }).__heist = this
      exposeDebugTuning(this.levelId)
    }
  }

  private spawnDuckAt(x: number, y: number) {
    this.makeDuckTexture()
    const duckKey = this.tryCreateDuckAnims() ? 'duck_sheet' : this.makeDuckTexture()
    try {
      this.player = this.physics.add.sprite(x, y, duckKey, duckKey === 'duck_sheet' ? 0 : undefined)
    } catch (err) {
      console.error(err)
      this.duckAnimsReady = false
      this.player = this.physics.add.sprite(x, y, this.makeDuckTexture())
    }
    this.player.setOrigin(0.5, 0.5)
    this.pinDuckVisual()
    this.player.setDepth(12)
    this.player.setCollideWorldBounds(true)
    const pb = this.player.body as Phaser.Physics.Arcade.Body
    pb.setMaxVelocity(this.cfg.player.run, this.cfg.player.run)
    pb.setDamping(true)
    pb.setDrag(0.0008, 0.0008)
    this.setMoveAnim('idle')
  }

  private placeExit(x: number, y: number) {
    const exitFx = this.add.graphics().setDepth(3)
    exitFx.fillStyle(0x050806, 0.9)
    exitFx.fillRoundedRect(x - 86, y - 46, 172, 92, 10)
    exitFx.fillStyle(0x14241a)
    exitFx.fillRoundedRect(x - 76, y - 38, 152, 76, 8)
    const zone = this.add.rectangle(x, y, 150, 72, 0x1c3c2a, 0.55)
    zone.setStrokeStyle(2, 0xc9a227, 0.7)
    zone.setDepth(3)
    this.physics.add.existing(zone, true)
    exitFx.lineStyle(2, 0xc9a227, 0.55)
    exitFx.strokeRoundedRect(x - 76, y - 38, 152, 76, 8)
    exitFx.lineStyle(1, 0xe8d7a0, 0.35)
    exitFx.lineBetween(x, y - 34, x, y + 34)
    exitFx.fillStyle(0xc9a227, 0.8)
    exitFx.fillCircle(x - 18, y, 3)
    exitFx.fillCircle(x + 18, y, 3)
    const label = this.add
      .text(x, y, heistT('heistExit'), {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '20px',
        color: '#e8d7a0',
      })
      .setOrigin(0.5)
      .setDepth(4)
    this.exitZones.push(zone)
    this.exitLabels.push(label)
    if (this.exitZones.length === 1) {
      this.exitZone = zone
      this.exitLabel = label
    }
  }

  private addLockedDoor(spec: { id: string; x: number; y: number; w: number; h: number }): LockedDoor {
    const body = this.addSolid(spec.x, spec.y, spec.w, spec.h, 'wall')
    body.setFillStyle(0x3a2414)
    const cx = spec.x + spec.w / 2
    const cy = spec.y + spec.h / 2
    const lock = this.add.graphics().setDepth(6)
    lock.fillStyle(0xc9a227, 0.85)
    lock.fillCircle(cx, cy, 6)
    lock.fillStyle(0x1a1410, 1)
    lock.fillCircle(cx, cy, 2.4)
    const label = this.add
      .text(cx, cy - (spec.h > spec.w ? 0 : 18), heistT('heistLockpick'), {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '12px',
        color: '#ffe08a',
      })
      .setOrigin(0.5)
      .setDepth(7)
    return { id: spec.id, x: spec.x, y: spec.y, w: spec.w, h: spec.h, opened: false, body, lock, label }
  }

  private hideDoorPrompt(door: LockedDoor) {
    door.lock.setVisible(false)
    door.label.setVisible(false)
    door.label.setText('')
  }

  private rebuildNav() {
    this.nav = buildNavGrid(this.mapW, this.mapH, 24, this.wallRects, 22)
  }

  private addRoomLabel(x: number, y: number, key: MessageKey) {
    const obj = this.add
      .text(x, y, heistT(key), {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '13px',
        color: '#b49a62',
      })
      .setOrigin(0.5)
      .setDepth(4)
    this.roomLabels.push({ obj, key })
  }

  /**
   * LEVEL 1 BANK: long south-to-north heist. Lobby EXIT is always open so a
   * first raid can leave with pocket change; later raids keep going deeper.
   */
  private buildBankWorld() {
    this.drawFloor()

    this.walls = this.physics.add.staticGroup()
    this.wallRects = []
    this.hideZones = []
    this.doors = []
    this.roomLabels = []
    const T = 40
    this.addSolid(0, 0, BANK_W, T, 'wall')
    this.addSolid(0, BANK_H - T, BANK_W, T, 'wall')
    this.addSolid(0, 0, T, BANK_H, 'wall')
    this.addSolid(BANK_W - T, 0, T, BANK_H, 'wall')
    for (const w of BANK_WALLS) this.addSolid(w.x, w.y, w.w, w.h, 'wall')
    this.doors = BANK_DOORS.map((d) => this.addLockedDoor(d))
    for (const door of this.doors) {
      if (!this.bankOpenedDoors.has(door.id)) continue
      door.opened = true
      this.openSolid(door.body, door)
      this.hideDoorPrompt(door)
    }
    for (const f of BANK_FURNITURE) this.addSolid(f.x, f.y, f.w, f.h, f.kind)
    const theme = 'bank' as const
    for (const d of BANK_DECOR) paintDecor(this, d, theme)
    for (const leaf of BANK_FOLIAGE) paintFoliage(this, leaf)
    for (const h of BANK_HIDES) this.addHide(h.x, h.y, h.w, h.h)
    this.paintHideMats()
    this.paintLamps(BANK_LAMPS)
    this.rebuildNav()

    this.safes = BANK_SAFES.map((s) => ({
      id: s.id,
      x: s.x,
      y: s.y,
      opened: this.bankOpenedSafes.has(s.id),
      extraX: s.extraX,
      extraY: s.extraY,
      extraKind: s.extraKind,
      extraId: s.extraId,
      reward: s.reward,
    }))
    this.safePos.set(this.safes[0].x, this.safes[0].y)
    for (const s of this.safes) this.buildSafe(s.x, s.y)

    this.exitZones = []
    this.exitLabels = []
    this.placeExit(BANK_EXIT.x, BANK_EXIT.y)
    for (const lab of BANK_LABELS) this.addRoomLabel(lab.x, lab.y, lab.key)

    this.spawnDuckAt(BANK_SPAWN.x, BANK_SPAWN.y)

    const guardKey = this.tryCreateGuardAnims() ? 'guard_sheet' : 'guard'
    this.units = this.limitCount(BANK_GUARD_ROUTES, this.cfg.counts.guards).map((route) =>
      this.spawnGuard(
        route.map((p) => new Phaser.Math.Vector2(p.x, p.y)),
        0,
        guardKey,
      ),
    )

    this.cams = this.limitCount(BANK_CAMS, this.cfg.counts.cams).map((c) =>
      this.makeCam(c.x, c.y, c.base, c.sweep, c.speed),
    )

    this.lootGroup = this.physics.add.group()
    BANK_LOOT.forEach((slot, i) => {
      if (this.bankTaken.has(slot.id)) return
      this.spawnLoot(slot.x, slot.y, slot.kind, i, { id: slot.id })
    })
    for (const safe of BANK_SAFES) {
      if (!this.bankOpenedSafes.has(safe.id) || !safe.extraKind) continue
      if (this.bankTaken.has(safe.extraId)) continue
      this.spawnLoot(safe.extraX, safe.extraY, safe.extraKind, 30, { id: safe.extraId })
    }

    this.physics.add.collider(this.player, this.walls)
    for (const u of this.units) this.physics.add.collider(u.sprite, this.walls)
    this.setupPlaySession()
  }

  private buildMansionWorld() {
    this.add.tileSprite(this.mapW / 2, this.mapH / 2, this.mapW, this.mapH, 'floor_tile').setDepth(0)
    const floor = this.add.graphics().setDepth(1)
    for (const f of MANSION_FLOORS) {
      floor.fillStyle(f.color, f.alpha)
      floor.fillRect(f.x, f.y, f.w, f.h)
    }
    floor.fillStyle(0x000000, 0.18)
    floor.fillRect(0, 0, this.mapW, 28)
    floor.fillRect(0, this.mapH - 28, this.mapW, 28)
    floor.fillRect(0, 0, 28, this.mapH)
    floor.fillRect(this.mapW - 28, 0, 28, this.mapH)

    this.walls = this.physics.add.staticGroup()
    this.wallRects = []
    this.hideZones = []
    this.doors = []
    const T = 40
    this.addSolid(0, 0, this.mapW, T, 'wall')
    this.addSolid(0, this.mapH - T, this.mapW, T, 'wall')
    this.addSolid(0, 0, T, this.mapH, 'wall')
    this.addSolid(this.mapW - T, 0, T, this.mapH, 'wall')
    for (const w of MANSION_WALLS) this.addSolid(w.x, w.y, w.w, w.h, 'wall')
    // Service panels: solid walls until the siren blows them open.
    this.sirenPanels = MANSION_SIREN.openWalls.map((r) => {
      const body = this.addSolid(r.x, r.y, r.w, r.h, 'wall')
      body.setFillStyle(0x2a1c14)
      return { ...r, opened: false, body }
    })
    this.doors = MANSION_DOORS.map((d) => this.addLockedDoor(d))
    for (const f of MANSION_FURNITURE) this.addSolid(f.x, f.y, f.w, f.h, f.kind)
    for (const d of MANSION_DECOR) paintDecor(this, d, 'mansion')
    for (const h of MANSION_HIDES) this.addHide(h.x, h.y, h.w, h.h)
    this.paintHideMats()

    this.paintLamps(MANSION_LAMPS)
    this.rebuildNav()

    this.safes = MANSION_SAFES.map((s) => ({
      id: `mansion-${s.x}-${s.y}`,
      x: s.x,
      y: s.y,
      opened: false,
      extraX: s.extraX,
      extraY: s.extraY,
      extraKind: s.extraKind,
      reward: s.reward,
    }))
    this.safePos.set(this.safes[0].x, this.safes[0].y)
    for (const s of this.safes) this.buildSafe(s.x, s.y)

    this.exitZones = []
    this.exitLabels = []
    this.placeExit(MANSION_EXIT.x, MANSION_EXIT.y)
    this.roomLabels = []
    for (const lab of MANSION_LABELS) this.addRoomLabel(lab.x, lab.y, lab.key)

    this.spawnDuckAt(MANSION_SPAWN.x, MANSION_SPAWN.y)

    const guardKey = this.tryCreateGuardAnims() ? 'guard_sheet' : 'guard'
    const routes = this.limitCount(MANSION_GUARD_ROUTES, this.cfg.counts.guards)
    this.units = routes.map((route) =>
      this.spawnGuard(
        route.map((p) => new Phaser.Math.Vector2(p.x, p.y)),
        0,
        guardKey,
      ),
    )

    this.cams = this.limitCount(MANSION_CAMS, this.cfg.counts.cams).map((c) =>
      this.makeCam(c.x, c.y, c.base, c.sweep, c.speed),
    )

    this.lootGroup = this.physics.add.group()
    MANSION_LOOT.forEach((slot, i) => this.spawnLoot(slot.x, slot.y, slot.kind, i))

    this.physics.add.collider(this.player, this.walls)
    for (const u of this.units) this.physics.add.collider(u.sprite, this.walls)
    this.setupPlaySession()
  }

  private drawFloor() {
    this.add.tileSprite(BANK_W / 2, BANK_H / 2, BANK_W, BANK_H, 'floor_tile').setDepth(0)
    const g = this.add.graphics().setDepth(1)
    for (const f of BANK_FLOORS) {
      g.fillStyle(f.color, f.alpha)
      g.fillRect(f.x, f.y, f.w, f.h)
    }
    g.fillStyle(0xc9a227, 0.05)
    g.fillCircle(BANK_EXIT.x, BANK_EXIT.y, 170)
    g.fillCircle(BANK_SPAWN.x, BANK_SPAWN.y, 150)
    g.fillStyle(0x000000, 0.18)
    g.fillRect(0, 0, BANK_W, 28)
    g.fillRect(0, BANK_H - 28, BANK_W, 28)
    g.fillRect(0, 0, 28, BANK_H)
    g.fillRect(BANK_W - 28, 0, 28, BANK_H)
  }

  private makeCam(x: number, y: number, base: number, sweep: number, speed: number): SecCam {
    const beamH = 2 * this.cfg.vision.camDist * Math.tan(this.camFov() / 2)
    const beam = this.add.image(x, y, 'cam_beam').setDepth(2)
    beam.setOrigin(0, 0.5)
    beam.setDisplaySize(this.cfg.vision.camDist, beamH)
    beam.setRotation(base)
    beam.setAlpha(0.95)
    this.add.image(x, y, 'cam_mount').setDepth(8).setDisplaySize(18, 18)
    const sprite = this.add.image(x, y, 'cam').setDepth(9)
    sprite.setOrigin(0.22, 0.5)
    sprite.setDisplaySize(38, 20)
    sprite.setRotation(base)
    const led = this.add.circle(x, y, 2.6, 0xc9a227).setDepth(10)
    return { x, y, facing: base, base, sweep, speed, sprite, beam, led, hot: false }
  }

  private weightOn() {
    return this.cfg.weight.enabled
  }

  private weightCap() {
    const caps = this.cfg.weight.caps
    if (caps.length === 0) return 0
    return caps[Phaser.Math.Clamp(this.mods.bagLevel, 0, caps.length - 1)]
  }

  private carriedWeight() {
    let sum = 0
    for (const item of this.carried) sum += item.weight
    return sum
  }

  private lootWeight(kind: LootKind) {
    return this.cfg.weight.item[kind] ?? 1
  }

  /** 0 below the penalty threshold, 1 at full load; never grows past the cap. */
  private weightOver() {
    if (!this.weightOn()) return 0
    const cap = this.weightCap()
    if (cap <= 0) return 0
    const load = Phaser.Math.Clamp(this.carriedWeight() / cap, 0, 1)
    const start = Phaser.Math.Clamp(this.cfg.weight.penaltyStart, 0, 0.99)
    return Phaser.Math.Clamp((load - start) / (1 - start), 0, 1)
  }

  private weightSpeedMul() {
    return 1 - this.cfg.weight.maxSpeedPenalty * this.weightOver()
  }

  private weightNoiseMul() {
    return 1 + this.cfg.weight.maxNoiseBonus * this.weightOver()
  }

  private canDrop() {
    const w = this.cfg.weight
    if (!w.enabled || !w.dropEnabled || this.carried.length === 0 || this.safeCrack) return false
    if (this.levelId === 'bank' && this.carried.length < 2 && this.weightOver() <= 0) return false
    return true
  }

  private dropSpot() {
    const x = Phaser.Math.Clamp(this.player.x - this.facing.x * 36, 24, this.mapW - 24)
    const y = Phaser.Math.Clamp(this.player.y - this.facing.y * 36, 24, this.mapH - 24)
    const blocked = this.wallRects.some((w) => x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h)
    return blocked ? { x: this.player.x, y: this.player.y } : { x, y }
  }

  private tryDropLoot() {
    if (this.ended || this.paused || !this.canDrop()) return
    const w = this.cfg.weight
    const now = this.gameNow()
    if (now < this.dropReadyAt) return
    let idx = 0
    for (let i = 1; i < this.carried.length; i += 1) {
      if (this.carried[i].weight > this.carried[idx].weight) idx = i
    }
    const item = this.carried.splice(idx, 1)[0]
    this.dropReadyAt = now + w.dropCooldownMs
    this.currentLoot = Math.max(0, this.currentLoot - item.value)
    if (item.persistId) {
      this.runLootIds = this.runLootIds.filter((id) => id !== item.persistId)
    }
    const spot = this.dropSpot()
    const dropped = this.spawnLoot(spot.x, spot.y, item.kind, 40 + this.lootSpawn, {
      value: item.value,
      weight: item.weight,
      lockMs: w.dropRepickupMs,
      id: item.persistId,
      runDrop: true,
    })
    this.runDropSprites.push(dropped)
    heistSfx.safeClick()
    this.fx?.explode(6, spot.x, spot.y)
    this.lureGuards(spot.x, spot.y)
    this.floatGain(-item.value)
  }

  /** Dropped loot is a noise source: nearby guards go and look at it. */
  private lureGuards(x: number, y: number) {
    const w = this.cfg.weight
    for (const u of this.units) {
      if (Phaser.Math.Distance.Between(u.sprite.x, u.sprite.y, x, y) > w.dropLureRadius) continue
      if (u.state === 'CHASE' && (!w.dropDistractsChase || this.seesPlayer(u))) continue
      u.lastSeen.set(x, y)
      u.path = []
      this.setG(u, 'INVESTIGATE')
    }
  }

  private takeLoot(item: Phaser.Physics.Arcade.Sprite) {
    if (!item.active || item.getData('collected')) return
    const room = this.mods.bagCap - this.currentLoot
    if (room <= 0) return
    const value = Number(item.getData('value') || 0)
    const gained = Math.min(value, room)
    item.setData('collected', true)
    item.disableBody(true, false)
    this.currentLoot += gained
    const kind = (item.getData('kind') as LootKind) ?? 'C5'
    const weight = Number(item.getData('weight') ?? this.lootWeight(kind))
    const lootId = String(item.getData('lootId') || '')
    const persistId = this.levelId === 'bank' && lootId && !lootId.startsWith('loot-') ? lootId : undefined
    if (gained > 0) this.carried.push({ kind, value: gained, weight, persistId })
    if (persistId) {
      if (!this.runLootIds.includes(persistId)) this.runLootIds.push(persistId)
      this.bankTaken.add(persistId)
    }
    this.runDropSprites = this.runDropSprites.filter((sprite) => sprite !== item)
    if (this.novice && this.levelId === 'bank' && this.carried.length === 1) {
      this.firstLootAt = this.gameNow()
      this.lootIdleS = 0
      this.pulseExit()
    }
    heistSfx.pickup()
    const glow = item.getData('glow') as Phaser.GameObjects.Arc | undefined
    if (glow) {
      this.tweens.add({
        targets: glow,
        alpha: 0,
        scale: 1.6,
        duration: 180,
        onComplete: () => glow.destroy(),
      })
    }
    const now = this.gameNow()
    this.combo = now - this.lastPickup < 3800 ? this.combo + 1 : 1
    this.maxCombo = Math.max(this.maxCombo, this.combo)
    this.lastPickup = now
    this.fx?.explode(8, item.x, item.y)
    this.floatGain(gained, kind)
    stopCoinIdle(this, item)
    const sc = item.scale
    this.tweens.add({
      targets: item,
      scale: sc * 1.2,
      duration: 80,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: item,
          scale: sc * 0.18,
          alpha: 0,
          duration: 150,
          onComplete: () => item.destroy(),
        })
      },
    })
  }

  /** Short gold popup: +5 DUCK COIN. Bigger for rare coins. */
  private floatGain(gained: number, kind?: LootKind) {
    const x = this.player.x
    const y = this.player.y - 22
    const dropped = gained < 0
    const amount = Math.abs(gained)
    const big = kind === 'C100' || amount >= 100
    const mid = kind === 'C50' || amount >= 50
    const color = dropped ? '#ffb070' : big ? '#fff8d6' : mid ? '#ffe08a' : '#f6d56a'
    const label = this.add
      .text(x, y, `${dropped ? '−' : '+'}${amount} DUCK COIN`, {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: big ? '20px' : mid ? '17px' : '15px',
        color,
        stroke: '#1a1008',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(16)
    this.tweens.add({
      targets: label,
      y: y - 46,
      alpha: 0,
      duration: 780,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    })
    if (this.currentLoot >= this.mods.bagCap) this.bagFullFlash = this.gameNow() + 900
  }

  private collectNearbyLoot() {
    const items = this.lootGroup.getChildren() as Phaser.Physics.Arcade.Sprite[]
    const now = this.gameNow()
    for (const item of items) {
      if (!item.active || item.getData('collected')) continue
      if (now < Number(item.getData('pickupAt') || 0)) continue
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y) <= PICKUP_R) {
        this.takeLoot(item)
      }
    }
  }

  private insideExit(zone: Phaser.GameObjects.Rectangle) {
    return Math.abs(this.player.x - zone.x) < zone.width / 2 && Math.abs(this.player.y - zone.y) < zone.height / 2
  }

  private inExit() {
    const zones = this.exitZones.length ? this.exitZones : this.exitZone ? [this.exitZone] : []
    return zones.some((zone) => this.insideExit(zone))
  }

  private updateExit(dt: number) {
    if (!this.inExit()) {
      this.exitHold = 0
      this.escaping = false
      return
    }
    this.escaping = true
    this.exitHold += dt
    if (this.exitHold >= EXIT_HOLD) this.finish('escaped')
  }

  private pulseExit() {
    if (!this.exitLabel || !this.exitZone) return
    this.tweens.killTweensOf(this.exitLabel)
    this.tweens.killTweensOf(this.exitZone)
    this.exitLabel.setScale(1)
    this.exitZone.setAlpha(0.55)
    this.tweens.add({
      targets: this.exitLabel,
      scale: 1.16,
      duration: 260,
      yoyo: true,
      repeat: 4,
      ease: 'Sine.easeInOut',
    })
    this.tweens.add({
      targets: this.exitZone,
      alpha: 1,
      duration: 260,
      yoyo: true,
      repeat: 4,
      ease: 'Sine.easeInOut',
    })
  }

  private updateNoviceExitHint(dt: number) {
    if (!this.novice || this.levelId !== 'bank' || this.firstLootAt <= 0 || this.ended) return
    const moving = Math.hypot(this.stick.x, this.stick.y) > 0.08
    if (moving || this.inExit()) {
      this.lootIdleS = 0
      return
    }
    this.lootIdleS += dt
    if (this.lootIdleS >= 8) {
      this.lootIdleS = 0
      this.pulseExit()
    }
  }

  private updateBankProgress() {
    if (this.levelId !== 'bank' || this.ended || !this.player) return
    const zone = bankZoneAt(this.player.x, this.player.y)
    this.bankZoneNow = zone.i
    if (zone.i > this.bankDepth) {
      this.bankDepth = zone.i
      persistBankWorld({ depth: this.bankDepth, reachedFinal: this.bankReachedFinal || zone.i >= BANK_ZONE_COUNT - 1 })
    }
    if (zone.i >= BANK_ZONE_COUNT - 1 && !this.bankReachedFinal) {
      this.bankReachedFinal = true
      persistBankWorld({ depth: this.bankDepth, reachedFinal: true })
    }
  }

  update(_t: number, dtMs: number) {
    if (this.ended || !this.player) return
    if (this.paused) {
      this.syncHeistSfx()
      this.drawUi()
      return
    }
    const dt = Math.min(0.033, dtMs / 1000)
    if (DEBUG && debugTuningVersion() !== this.cfgV) this.refreshTuning()
    if (this.gameNow() < this.hitStopUntil) {
      const frozen = this.player.body as Phaser.Physics.Arcade.Body
      frozen.setVelocity(0, 0)
      for (const u of this.units) (u.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0)
      this.syncHeistSfx()
      this.drawWorldFx()
      this.drawUi()
      return
    }
    this.updateHidden()
    if (this.safeCrack) {
      const body = this.player.body as Phaser.Physics.Arcade.Body
      body.setVelocity(0, 0)
      this.noise = 0
      this.noiseR = 0
      this.updateSafeCrack(dt)
    } else {
      this.updatePlayer(dt)
      this.collectNearbyLoot()
      this.updateExit(dt)
      this.updateNoviceExitHint(dt)
      this.updateBankProgress()
    }
    this.updateSafePrompt()
    this.updateCams(dt)
    for (const unit of this.units) this.updateGuard(unit, dt)
    this.updateAlert(dt)
    this.updateRaidPhase()
    if (this.escapeUntil > 0 && this.gameNow() >= this.escapeUntil) {
      this.finish('caught')
      return
    }
    if (this.alert >= this.cfg.alert.bandDanger || this.anyChase()) this.stealthBroken = true
    this.syncHeistSfx()
    this.drawWorldFx()
    this.drawUi()
  }

  private camH() {
    return this.scale.height
  }
  private camW() {
    return this.scale.width
  }

  private btnPause() {
    const w = this.camW()
    const r = 20
    const inset = w < 440 ? Math.max(r + 8, 22) : 34
    return { x: w - inset, y: w < 440 ? 24 : 28, r }
  }

  private hudPanelH() {
    return this.showWeightHud() ? 62 : 52
  }

  private showWeightHud() {
    if (!this.weightOn()) return false
    if (this.levelId !== 'bank') return true
    return this.weightOver() > 0 || this.carried.length >= 2
  }

  /** Short raid message on its own plate, so it stays readable over the level art. */
  private showBanner(text: string) {
    const x = this.bannerX()
    const y = this.bannerY()
    this.crackHud.setVisible(true)
    this.crackHud.setPosition(x, y)
    this.crackHud.setText(text)
    this.crackHint.setVisible(false)
    const w = this.crackHud.width + 24
    const h = this.crackHud.height + 14
    this.uiGfx.fillStyle(0x080604, 0.78)
    this.uiGfx.fillRoundedRect(x - w / 2, y - 7, w, h, 9)
    this.uiGfx.lineStyle(1.5, 0xc9a227, 0.45)
    this.uiGfx.strokeRoundedRect(x - w / 2, y - 7, w, h, 9)
  }

  /** Banners live under the HUD and right of the objectives panel. */
  private bannerX() {
    return Math.min(this.camW() - 90, (164 + this.camW()) / 2)
  }

  private bannerY() {
    return this.hudPanelH() + 44
  }

  /** Alarm and carried weight as bars: mid raid nobody parses two more numbers. */
  private drawHudBars() {
    const x = 12
    const w = this.hudBarWidth() - 12
    const y = 44
    this.uiGfx.fillStyle(0x000000, 0.45)
    this.uiGfx.fillRoundedRect(x, y, w, 5, 2.5)
    this.uiGfx.fillStyle(this.raidPhase === 'SAFE' ? 0x6fbf73 : PHASE_TINT[this.raidPhase].color || 0xc9a227, 0.95)
    this.uiGfx.fillRoundedRect(x, y, Math.max(4, w * Phaser.Math.Clamp(this.alert, 0, 1)), 5, 2.5)
    if (!this.showWeightHud()) return
    const wy = y + 10
    const load = Phaser.Math.Clamp(this.carriedWeight() / this.weightCap(), 0, 1)
    this.uiGfx.fillStyle(0x000000, 0.45)
    this.uiGfx.fillRoundedRect(x, wy, w, 5, 2.5)
    this.uiGfx.fillStyle(this.weightOver() > 0 ? 0xff8a4a : 0xc9a227, 0.95)
    this.uiGfx.fillRoundedRect(x, wy, Math.max(4, w * load), 5, 2.5)
    // where the speed and noise penalty starts
    this.uiGfx.fillStyle(0xf3e6c4, 0.75)
    this.uiGfx.fillRect(x + w * this.cfg.weight.penaltyStart, wy - 2, 1.5, 9)
  }

  private hudBarWidth() {
    const pause = this.btnPause()
    const gap = 10
    return Math.min(340, Math.max(148, pause.x - pause.r - gap - 6))
  }

  private pausePanel() {
    const w = Math.min(320, Math.max(268, this.camW() - 28))
    return { x: this.camW() / 2, y: this.camH() / 2 - 8, w, h: 276 }
  }

  private btnResume() {
    const panel = this.pausePanel()
    return { x: panel.x, y: panel.y - 6, w: panel.w - 36, h: 58 }
  }

  private btnAbort() {
    const panel = this.pausePanel()
    return { x: panel.x, y: panel.y + 68, w: panel.w - 36, h: 58 }
  }

  private gameNow() {
    if (this.paused) return this.pauseAt - this.pauseShift
    return this.time.now - this.pauseShift
  }

  private inUiRect(x: number, y: number, btn: { x: number; y: number; w: number; h: number }) {
    return x >= btn.x - btn.w / 2 && x <= btn.x + btn.w / 2 && y >= btn.y - btn.h / 2 && y <= btn.y + btn.h / 2
  }

  private togglePause() {
    if (this.ended) return
    this.setPaused(!this.paused)
  }

  private setPaused(on: boolean) {
    if (this.ended || this.paused === on) return
    if (on) {
      heistSfx.pause()
      this.pauseAt = this.time.now
      this.paused = true
      this.releaseTouches()
      const body = this.player.body as Phaser.Physics.Arcade.Body
      body.setVelocity(0, 0)
      for (const u of this.units) {
        const gb = u.sprite.body as Phaser.Physics.Arcade.Body
        gb.setVelocity(0, 0)
      }
      this.physics.pause()
      this.tweens.pauseAll()
      this.anims.pauseAll()
    } else {
      this.pauseShift += this.time.now - this.pauseAt
      this.paused = false
      this.physics.resume()
      this.tweens.resumeAll()
      this.anims.resumeAll()
    }
  }

  private abortHeist() {
    if (this.ended) return
    this.finish('aborted')
  }

  private btnSneak() {
    return { x: this.camW() - 62, y: this.camH() - 158, r: BTN_R }
  }
  private btnDash() {
    return { x: this.camW() - 62, y: this.camH() - 78, r: BTN_R }
  }
  private btnOpen() {
    return { x: this.camW() - 62, y: this.camH() - 238, r: BTN_R }
  }
  private btnDrop() {
    return { x: this.camW() - 62, y: this.camH() - 318, r: BTN_R }
  }

  private nearSafe() {
    return this.nearestUnopenedSafe() != null || this.nearestLockedDoor() != null
  }

  private nearestLockedDoor() {
    let best: LockedDoor | null = null
    let bestD = DOOR_RANGE
    for (const d of this.doors) {
      if (d.opened) continue
      const qx = Phaser.Math.Clamp(this.player.x, d.x, d.x + d.w)
      const qy = Phaser.Math.Clamp(this.player.y, d.y, d.y + d.h)
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, qx, qy)
      if (dist <= bestD) {
        bestD = dist
        best = d
      }
    }
    return best
  }

  private nearestUnopenedSafe() {
    let best: SafeSpot | null = null
    let bestD = SAFE_RANGE
    for (const s of this.safes) {
      if (s.opened) continue
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y)
      if (d <= bestD) {
        bestD = d
        best = s
      }
    }
    return best
  }

  private nearestSafe() {
    let best = this.safes[0]
    let bestD = Number.POSITIVE_INFINITY
    for (const s of this.safes) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y)
      if (d < bestD) {
        bestD = d
        best = s
      }
    }
    return best
  }

  private updateSafePrompt() {
    if (!this.safePrompt || !this.openLabel) return
    const btn = this.btnOpen()
    this.openLabel.setPosition(btn.x, btn.y)
    const door = this.nearestLockedDoor()
    const near = this.nearestSafe()
    if (near) this.safePrompt.setPosition(near.x, near.y + 62)
    if (this.safeCrack) {
      this.safePrompt.setText('')
      this.openLabel.setText(heistT('heistHit'))
      this.openLabel.setVisible(true)
      return
    }
    if (door) {
      this.safePrompt.setPosition(door.x + door.w / 2, door.y + door.h / 2 + 36)
      this.safePrompt.setText(heistT('heistDoorCrackTitle'))
      this.safePrompt.setColor('#ffe08a')
      this.openLabel.setText(heistT('heistLockpick'))
      this.openLabel.setVisible(true)
      if (this.openHeld || this.winKeys.e || this.keys.e.isDown) this.tryOpenSafe()
      return
    }
    const unopened = this.nearestUnopenedSafe()
    if (unopened == null && near && near.opened) {
      this.safePrompt.setText(heistT('heistSafeOpenedTitle'))
      this.safePrompt.setColor('#b6e3b0')
      this.openLabel.setVisible(false)
      this.hitHeld = false
      return
    }
    const show = unopened != null
    this.safePrompt.setText(show ? heistT('heistSafeName') : '')
    this.safePrompt.setColor('#ffe08a')
    this.openLabel.setText(heistT('heistOpen'))
    this.openLabel.setVisible(show)
    if (show && (this.openHeld || this.winKeys.e || this.keys.e.isDown)) this.tryOpenSafe()
  }

  private tryOpenSafe() {
    if (this.ended || this.paused || this.safeCrack) return
    const door = this.nearestLockedDoor()
    if (door) {
      this.crackKind = 'door'
      this.crackDoor = door
      this.safeCrack = true
      heistSfx.doorHack()
      this.safeHits = 0
      this.safeMarker = 0.08
      this.safeDir = 1
      this.safeHitLock = 0
      this.openHeld = false
      this.releaseTouches()
      return
    }
    const target = this.nearestUnopenedSafe()
    if (!target) return
    this.crackKind = 'safe'
    this.crackDoor = null
    this.crackI = this.safes.indexOf(target)
    this.safePos.set(target.x, target.y)
    this.safeCrack = true
    heistSfx.safeStart()
    this.safeHits = 0
    this.safeMarker = 0.08
    this.safeDir = 1
    this.safeHitLock = 0
    this.openHeld = false
    this.releaseTouches()
  }

  private updateSafeCrack(dt: number) {
    const speed = 1.15 + this.safeHits * 0.28
    this.safeMarker += this.safeDir * speed * dt
    if (this.safeMarker >= 1) {
      this.safeMarker = 1
      this.safeDir = -1
    } else if (this.safeMarker <= 0) {
      this.safeMarker = 0
      this.safeDir = 1
    }
  }

  private safeZone() {
    const width = Math.max(0.11, 0.2 - this.safeHits * 0.02)
    return { center: 0.5, width }
  }

  private trySafeHit() {
    if (!this.safeCrack || this.ended || this.paused) return
    if (this.gameNow() < this.safeHitLock) return
    this.safeHitLock = this.gameNow() + 220
    const zone = this.safeZone()
    if (Math.abs(this.safeMarker - zone.center) <= zone.width / 2) {
      this.safeHits += 1
      heistSfx.safeClick()
      if (this.safeHits >= (this.crackKind === 'door' ? DOOR_HITS : SAFE_HITS)) {
        if (this.crackKind === 'door') this.openDoorReward()
        else this.openSafeReward()
      }
    } else {
      this.addAlert(this.cfg.alert.safeMiss)
      heistSfx.safeFail()
    }
  }

  private openDoorReward() {
    this.safeCrack = false
    heistSfx.doorUnlock()
    const door = this.crackDoor
    this.crackDoor = null
    this.hitHeld = false
    this.doorOpenedAt = this.gameNow()
    if (!door || door.opened) return
    door.opened = true
    this.openSolid(door.body, door)
    this.hideDoorPrompt(door)
    this.rebuildNav()
    if (this.levelId === 'bank') {
      this.bankOpenedDoors.add(door.id)
      persistBankWorld({ openedDoors: [door.id], depth: this.bankDepth, reachedFinal: this.bankReachedFinal })
    }
  }

  /** Turns a solid rectangle into a passage: body off, nav rebuilt by the caller. */
  private openSolid(body: Phaser.GameObjects.Rectangle, rect: { x: number; y: number; w: number; h: number }) {
    body.setAlpha(0.12)
    const phys = body.body as Phaser.Physics.Arcade.StaticBody | null
    if (phys) phys.enable = false
    this.walls.remove(body)
    this.wallRects = this.wallRects.filter((r) => !(r.x === rect.x && r.y === rect.y && r.w === rect.w && r.h === rect.h))
    this.fx?.explode(12, rect.x + rect.w / 2, rect.y + rect.h / 2)
  }

  private openSafeReward() {
    this.safeCrack = false
    heistSfx.safeUnlock()
    const spot = this.safes[this.crackI] ?? this.safes[0]
    if (spot) spot.opened = true
    this.safeOpened = true
    this.safeOpenedAt = this.gameNow()
    if (this.levelId === 'bank' && spot?.id) {
      this.bankOpenedSafes.add(spot.id)
      persistBankWorld({ openedSafes: [spot.id], depth: this.bankDepth, reachedFinal: this.bankReachedFinal })
    }
    const room = Math.max(0, this.mods.bagCap - this.currentLoot)
    const gained = Math.min(spot?.reward ?? SAFE_REWARD, room)
    this.hitHeld = false
    this.currentLoot += gained
    if (gained > 0) this.carried.push({ kind: 'C100', value: gained, weight: this.cfg.weight.prize })
    if (gained > 0) this.floatGain(gained)
    else this.bagFullFlash = this.gameNow() + 900
    const sx = spot?.x ?? this.safePos.x
    const sy = spot?.y ?? this.safePos.y
    this.fx?.explode(18, sx, sy)
    if (spot?.extraKind) this.spawnLoot(spot.extraX, spot.extraY, spot.extraKind, 20 + this.crackI, { id: spot.extraId })
    this.triggerSiren()
  }

  /** Getting caught drops the bag as flavour. Run-stash is already wiped. */
  private spillCarried() {
    if (!this.weightOn() || this.carried.length === 0) return
    const items = this.carried.slice(-6)
    this.carried = []
    items.forEach((item, i) => {
      const a = (Math.PI * 2 * i) / items.length
      this.spawnLoot(this.player.x + Math.cos(a) * 46, this.player.y + Math.sin(a) * 46, item.kind, 60 + i, {
        value: item.value,
        weight: item.weight,
        lockMs: 999999,
      })
    })
    this.fx?.explode(16, this.player.x, this.player.y)
  }

  private destroyRunDrops() {
    for (const sprite of this.runDropSprites) {
      if (!sprite.active) continue
      const glow = sprite.getData('glow') as Phaser.GameObjects.Arc | undefined
      glow?.destroy()
      stopCoinIdle(this, sprite)
      sprite.destroy()
    }
    this.runDropSprites = []
  }

  /** The safe is the turning point of the raid: siren, alarm level, countdown, new route. */
  private triggerSiren() {
    const ec = this.cfg.escape
    if (!ec.enabled || this.sirenOn) return
    const now = this.gameNow()
    this.sirenOn = true
    this.hitStopUntil = now + ec.hitStopMs
    this.escapeUntil = now + ec.timerS * 1000
    this.raiseAlertTo(Math.max(this.cfg.alert.bandDanger, ec.sirenAlert))
    this.updateRaidPhase()
    heistSfx.siren()
    this.cameras.main.shake(260, 0.006)
    this.cameras.main.flash(180, 196, 64, 40)
    this.phaseChangedAt = now
    this.phaseRising = true
    this.phaseHud?.setText(heistT('heistSiren'))
    this.phaseHud?.setColor('#ff8a6a')
    if (ec.routeChange && this.levelId === 'mansion') this.applySirenPlan()
  }

  /** Mansion siren plan: seal the usual way out, open the service passage, move two guards. */
  private applySirenPlan() {
    for (const r of MANSION_SIREN.close) {
      const shutter = this.addSolid(r.x, r.y, r.w, r.h, 'wall')
      shutter.setFillStyle(0x3a1a14)
      this.fx?.explode(10, r.x + r.w / 2, r.y + r.h / 2)
    }
    for (const panel of this.sirenPanels) {
      if (panel.opened) continue
      panel.opened = true
      this.openSolid(panel.body, panel)
    }
    for (const id of MANSION_SIREN.unlockDoors) {
      const door = this.doors.find((d) => d.id === id)
      if (!door || door.opened) continue
      door.opened = true
      this.openSolid(door.body, door)
      this.hideDoorPrompt(door)
    }
    for (const plan of MANSION_SIREN.redeploy) {
      const u = this.units[plan.guard]
      if (!u) continue
      u.waypoints = plan.route.map((p) => new Phaser.Math.Vector2(p.x, p.y))
      u.wi = 0
      u.path = []
      if (u.state === 'PATROL') this.setG(u, 'RETURN')
    }
    this.rebuildNav()
    this.routeNoticeAt = this.gameNow()
  }

  private spawnLoot(
    x: number,
    y: number,
    kind: LootKind,
    seed: number,
    opts?: { value?: number; weight?: number; lockMs?: number; id?: string; runDrop?: boolean },
  ) {
    const def = coinDef(kind)
    const glow = this.add.circle(x, y, def.size * 0.72, kind === 'C100' ? 0xffe08a : 0xc9a227, kind === 'C100' ? 0.28 : 0.16)
    glow.setDepth(5)
    const s = this.physics.add.sprite(x, y, def.key)
    applyCoinSpriteSize(s, def)
    s.setDepth(6)
    s.setData('glow', glow)
    this.lootSpawn += 1
    s.setData('lootId', opts?.id ?? `loot-${this.lootSpawn}`)
    s.setData('value', opts?.value ?? def.value)
    s.setData('kind', kind)
    s.setData('weight', opts?.weight ?? this.lootWeight(kind))
    s.setData('pickupAt', opts?.lockMs ? this.gameNow() + opts.lockMs : 0)
    s.setData('collected', false)
    s.setData('runDrop', Boolean(opts?.runDrop))
    const b = s.body as Phaser.Physics.Arcade.Body
    b.setAllowGravity(false)
    b.setImmovable(true)
    b.setCircle(20)
    this.lootGroup.add(s)
    playCoinIdle(this, s, seed)
    return s
  }

  private tryDash() {
    if (this.ended || this.paused) return
    const now = this.gameNow()
    if (now < this.dashReady) return
    this.dashUntil = now + this.cfg.player.dashMs
    this.dashReady = now + this.cfg.player.dashCd
    heistSfx.dash()
  }

  private releaseTouches() {
    this.stick.active = false
    this.stick.id = -1
    this.stick.x = 0
    this.stick.y = 0
    this.stickRunHeld = false
    this.sneakHeld = false
    this.sneakId = -1
    this.openHeld = false
    this.openId = -1
    this.hitHeld = false
  }

  /** iPhone/Telegram may fire cancel on first pickup while the thumb is still down. */
  private onPointerCancel(p: Phaser.Input.Pointer) {
    if (this.ended) return
    if (this.stick.active && p.id === this.stick.id) return
    this.onUp(p)
  }

  private onInputCancel() {
    if (this.ended) return
    if (this.stick.active) return
    this.releaseTouches()
  }

  private onDown(p: Phaser.Input.Pointer) {
    unlockHeistSfx()
    if (this.ended) return
    const x = p.x
    const y = p.y
    const pause = this.btnPause()
    if (Phaser.Math.Distance.Between(x, y, pause.x, pause.y) < pause.r) {
      this.togglePause()
      return
    }
    if (this.paused) {
      if (this.inUiRect(x, y, this.btnResume())) this.setPaused(false)
      else if (this.inUiRect(x, y, this.btnAbort())) this.abortHeist()
      return
    }
    const open = this.btnOpen()
    if (this.safeCrack) {
      if (Phaser.Math.Distance.Between(x, y, open.x, open.y) < open.r) {
        this.hitHeld = true
        this.openId = p.id
        this.trySafeHit()
      }
      return
    }
    const w = this.camW()
    const h = this.camH()
    const dash = this.btnDash()
    const sneak = this.btnSneak()
    if (this.nearSafe() && Phaser.Math.Distance.Between(x, y, open.x, open.y) < open.r) {
      this.openHeld = true
      this.openId = p.id
      this.tryOpenSafe()
      return
    }
    const drop = this.btnDrop()
    if (this.canDrop() && Phaser.Math.Distance.Between(x, y, drop.x, drop.y) < drop.r) {
      this.tryDropLoot()
      return
    }
    if (Phaser.Math.Distance.Between(x, y, dash.x, dash.y) < dash.r) {
      this.tryDash()
      return
    }
    if (Phaser.Math.Distance.Between(x, y, sneak.x, sneak.y) < sneak.r) {
      this.sneakHeld = true
      this.sneakId = p.id
      heistSfx.sneak()
      return
    }
    if (x < w * 0.52 && y > h * 0.32) {
      this.stick.active = true
      this.stick.id = p.id
      this.stick.ox = Phaser.Math.Clamp(x, 48, w * 0.46)
      this.stick.oy = Phaser.Math.Clamp(y, h * 0.38, h - 48)
      this.setStick(p.x, p.y)
    }
  }

  private onUp(p: Phaser.Input.Pointer) {
    if (p.id === this.stick.id) {
      this.stick.active = false
      this.stick.id = -1
      this.stick.x = 0
      this.stick.y = 0
      this.stickRunHeld = false
    }
    if (p.id === this.sneakId) {
      this.sneakHeld = false
      this.sneakId = -1
    }
    if (p.id === this.openId) {
      this.openHeld = false
      this.openId = -1
      this.hitHeld = false
    }
  }

  private setStick(px: number, py: number) {
    const dx = px - this.stick.ox
    const dy = py - this.stick.oy
    const len = Math.hypot(dx, dy) || 1
    const max = 48
    const k = Math.min(1, len / max)
    this.stick.x = (dx / len) * k
    this.stick.y = (dy / len) * k
  }

  private kdir() {
    let x = 0
    let y = 0
    if (!this.keys) return { x: 0, y: 0 }
    if (this.keys.a.isDown || this.keys.left.isDown || this.winKeys.a || this.winKeys.left) x -= 1
    if (this.keys.d.isDown || this.keys.right.isDown || this.winKeys.d || this.winKeys.right) x += 1
    if (this.keys.w.isDown || this.keys.up.isDown || this.winKeys.w || this.winKeys.up) y -= 1
    if (this.keys.s.isDown || this.keys.down.isDown || this.winKeys.s || this.winKeys.down) y += 1
    const l = Math.hypot(x, y)
    if (l > 0) return { x: x / l, y: y / l }
    return { x: 0, y: 0 }
  }

  private setMoveAnim(next: MoveAnim) {
    this.player.setData('moveState', next)
    if (!this.duckAnimsReady) return
    let key = 'duck-idle'
    if (next === 'dash') key = 'duck-run'
    else if (next === 'sneak') key = 'duck-sneak'
    else if (next !== 'idle') key = 'duck-walk'
    if (!this.anims.exists(key)) return
    try {
      if (this.player.anims.currentAnim?.key !== key) {
        this.player.play(key, true)
        this.pinDuckVisual()
      }
    } catch (err) {
      console.error(err)
      this.duckAnimsReady = false
    }
  }

  private pinDuckVisual() {
    const fw = this.player.frame.width || DUCK_DISPLAY
    const fh = this.player.frame.height || DUCK_DISPLAY
    const k = DUCK_DISPLAY / Math.max(fw, fh)
    this.player.setDisplaySize(Math.round(fw * k), Math.round(fh * k))
    const pb = this.player.body as Phaser.Physics.Arcade.Body | undefined
    if (!pb) return
    const hit = DUCK_HITBOX_FROM / DUCK_DISPLAY
    pb.setSize(DUCK_BODY_W * hit, DUCK_BODY_H * hit, false)
    pb.setOffset((this.player.width / 2 - DUCK_BODY_W / 2) * hit, (this.player.height / 2 - 8) * hit)
  }

  private inRect(z: HideZone, x: number, y: number) {
    return x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h
  }

  private updateHidden() {
    this.hidden = this.hideZones.some((z) => this.inRect(z, this.player.x, this.player.y))
  }

  private updatePlayer(dt: number) {
    if (this.stick.active) {
      const pts = [this.input.pointer1, this.input.pointer2, this.input.pointer3, this.input.mousePointer]
      for (const pt of pts) {
        if (pt && pt.id === this.stick.id && pt.isDown) this.setStick(pt.x, pt.y)
      }
    }
    const kd = this.kdir()
    let jx = this.stick.x
    let jy = this.stick.y
    if (Math.hypot(kd.x, kd.y) > 0.1) {
      jx = kd.x
      jy = kd.y
    }
    const mag = Math.hypot(jx, jy)
    const moving = mag > 0.08
    const walkCut = this.levelId === 'bank' ? 0.28 : 0.55
    if (!moving) this.stickRunHeld = false
    else if (this.levelId === 'bank') {
      if (mag >= walkCut) this.stickRunHeld = true
      else if (mag < 0.2) this.stickRunHeld = false
    }
    const now = this.gameNow()
    const space = this.keys.space
    const spaceTap = 'justDown' in space ? Phaser.Input.Keyboard.JustDown(space as Phaser.Input.Keyboard.Key) : false
    if (spaceTap) this.tryDash()
    const qKey = this.keys.q
    if ('justDown' in qKey && Phaser.Input.Keyboard.JustDown(qKey as Phaser.Input.Keyboard.Key)) this.tryDropLoot()
    const sneaking = this.sneakHeld || this.keys.shift.isDown || this.winKeys.shift || this.hidden
    const dashing = now < this.dashUntil
    let spd = 0
    let vx = jx
    let vy = jy
    const pc = this.cfg.player
    if (dashing) {
      this.setMoveAnim('dash')
      spd = pc.dash
      this.noise = this.noiseOf('dash')
      if (!moving) {
        vx = this.facing.x
        vy = this.facing.y
      }
    } else if ((moving || sneaking) && sneaking && moving) {
      this.setMoveAnim('sneak')
      spd = this.hidden ? pc.sneak * pc.hiddenSneakMul : pc.sneak
      this.noise = this.noiseOf('sneak')
    } else if (moving && mag < walkCut && !this.stickRunHeld) {
      this.setMoveAnim('walk')
      spd = pc.run * pc.walkMul * this.mods.speedMul
      this.noise = this.noiseOf('walk')
    } else if (moving) {
      this.setMoveAnim('run')
      spd = pc.run * this.mods.speedMul
      this.noise = this.noiseOf('run')
    } else {
      this.setMoveAnim('idle')
      this.noise = 0
    }
    spd *= this.weightSpeedMul()
    this.noiseR = this.noise * 2.15
    const body = this.player.body as Phaser.Physics.Arcade.Body
    if (dashing || moving) {
      this.facing.set(vx, vy).normalize()
      body.setMaxVelocity(spd, spd)
      body.setVelocity(vx * spd, vy * spd)
      if (!dashing) heistSfx.step(sneaking)
    } else {
      body.setVelocity(0, 0)
    }
    this.player.setFlipX(this.facing.x < 0)
    void dt
  }

  private noiseOf(mode: 'sneak' | 'run' | 'dash' | 'walk') {
    const base = mode === 'walk' ? 22 : NOISE[mode]
    const shoes = this.mods.silentShoes ? base * 0.65 : base
    return shoes * this.weightNoiseMul()
  }

  private los(ax: number, ay: number, bx: number, by: number) {
    const steps = 12
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps
      const x = ax + (bx - ax) * t
      const y = ay + (by - ay) * t
      for (const w of this.wallRects) {
        if (x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h) return false
      }
    }
    return true
  }

  private coneSees(ox: number, oy: number, facing: number, distMax: number, fov: number) {
    const dx = this.player.x - ox
    const dy = this.player.y - oy
    const dist = Math.hypot(dx, dy)
    if (dist < 10) return true
    if (dist > distMax) return false
    const ang = Math.atan2(dy, dx)
    const diff = Math.abs(Phaser.Math.Angle.Wrap(ang - facing))
    if (diff > fov / 2) return false
    if (!this.los(ox, oy, this.player.x, this.player.y)) return false
    return true
  }

  private spawnGuard(waypoints: Phaser.Math.Vector2[], startWi: number, key: string): GuardUnit {
    const start = waypoints[0]
    const sprite = this.physics.add.sprite(start.x, start.y, key, key === 'guard_sheet' ? 0 : undefined)
    sprite.setOrigin(0.5, 0.5)
    sprite.setDisplaySize(GUARD_DISPLAY, GUARD_DISPLAY)
    sprite.setDepth(11)
    const gb = sprite.body as Phaser.Physics.Arcade.Body
    gb.setAllowGravity(false)
    gb.setDamping(false)
    gb.setDrag(0, 0)
    gb.setMaxVelocity(220, 220)
    gb.setSize(16, 16)
    gb.setOffset(sprite.width / 2 - 8, sprite.height / 2 - 8)
    if (this.anims.exists('guard-idle')) sprite.play('guard-idle')
    return {
      sprite,
      state: 'PATROL',
      waypoints,
      wi: startWi,
      searchT: 0,
      searchPts: [],
      searchI: 0,
      lastSeen: new Phaser.Math.Vector2(),
      facing: 0,
      path: [],
      pathDest: new Phaser.Math.Vector2(),
      repathAt: 0,
      stuckT: 0,
      stuckTries: 0,
      lastPos: new Phaser.Math.Vector2(start.x, start.y),
      detect: 0,
    }
  }

  private anyChase() {
    return this.units.some((u) => u.state === 'CHASE')
  }

  private syncHeistSfx(ended = this.ended) {
    heistSfx.sync({
      alert: this.alert,
      cameraHot: this.camSees,
      investigating: this.units.some((u) => u.state === 'INVESTIGATE' || u.state === 'SEARCH'),
      chasing: this.anyChase(),
      cracking: this.safeCrack,
      paused: this.paused,
      ended,
    })
  }

  private maxDetect() {
    return this.units.reduce((m, u) => Math.max(m, u.detect), 0)
  }

  private seesPlayer(u: GuardUnit) {
    return this.coneSees(u.sprite.x, u.sprite.y, u.facing, this.cfg.vision.guardDist * this.mods.disguiseMul, this.guardFov())
  }

  private hearsPlayer(u: GuardUnit) {
    const dist = Phaser.Math.Distance.Between(u.sprite.x, u.sprite.y, this.player.x, this.player.y)
    return this.noiseR > 8 && dist < this.noiseR + 36
  }

  private setG(u: GuardUnit, s: GuardState) {
    if (u.state === s) return
    const prev = u.state
    u.state = s
    u.path = []
    u.repathAt = 0
    u.stuckTries = 0
    if (s === 'CHASE' && prev !== 'CHASE') {
      heistSfx.chaseStart()
      this.updateRaidPhase()
    } else if (prev === 'CHASE' && s !== 'CHASE' && !this.anyChase()) {
      heistSfx.chaseStop()
      this.updateRaidPhase()
    } else if (s === 'INVESTIGATE' && (prev === 'PATROL' || prev === 'RETURN')) {
      heistSfx.investigateStart()
    }
    if (s === 'SEARCH') {
      u.searchT = 5.2
      u.searchI = 0
      u.searchPts = this.makeSearchPts(u.lastSeen)
    }
  }

  private makeSearchPts(origin: Phaser.Math.Vector2) {
    const offs = [
      [0, 0],
      [72, 0],
      [0, 72],
      [-72, 0],
      [0, -72],
      [52, 52],
      [-52, 52],
    ] as const
    const pts: Phaser.Math.Vector2[] = []
    for (const [dx, dy] of offs) {
      const c = nearestWalkable(this.nav, origin.x + dx, origin.y + dy)
      const q = cellCenter(this.nav, c.x, c.y)
      if (Phaser.Math.Distance.Between(origin.x, origin.y, q.x, q.y) > 110) continue
      if (pts.some((p) => Phaser.Math.Distance.Between(p.x, p.y, q.x, q.y) < 28)) continue
      pts.push(new Phaser.Math.Vector2(q.x, q.y))
    }
    return pts.length ? pts : [origin.clone()]
  }

  private resumePatrol(u: GuardUnit) {
    let best = 0
    let bestD = Number.POSITIVE_INFINITY
    u.waypoints.forEach((wp, i) => {
      const d = Phaser.Math.Distance.Between(u.sprite.x, u.sprite.y, wp.x, wp.y)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    u.wi = best
    this.setG(u, 'RETURN')
  }

  private steerGuard(u: GuardUnit, tx: number, ty: number, speed: number) {
    const dx = tx - u.sprite.x
    const dy = ty - u.sprite.y
    const dist = Math.max(0.001, Math.hypot(dx, dy))
    const body = u.sprite.body as Phaser.Physics.Arcade.Body
    u.facing = Math.atan2(dy, dx)
    body.setMaxVelocity(speed, speed)
    body.setVelocity((dx / dist) * speed, (dy / dist) * speed)
    return dist
  }

  private snapGuardWalkable(u: GuardUnit) {
    const cell = nearestWalkable(this.nav, u.sprite.x, u.sprite.y)
    const pos = cellCenter(this.nav, cell.x, cell.y)
    u.sprite.setPosition(pos.x, pos.y)
    const body = u.sprite.body as Phaser.Physics.Arcade.Body
    body.reset(pos.x, pos.y)
    u.lastPos.set(pos.x, pos.y)
    u.path = []
    u.stuckT = 0
    u.stuckTries = 0
  }

  private skipUnreachable(u: GuardUnit) {
    this.snapGuardWalkable(u)
    u.path = []
    u.repathAt = 0
  }

  private followTo(u: GuardUnit, tx: number, ty: number, speed: number, dt: number) {
    const gx = u.sprite.x
    const gy = u.sprite.y
    const distGoal = Phaser.Math.Distance.Between(gx, gy, tx, ty)
    const body = u.sprite.body as Phaser.Physics.Arcade.Body
    if (distGoal < 18) {
      u.path = []
      body.setVelocity(0, 0)
      u.stuckT = 0
      u.stuckTries = 0
      u.lastPos.set(gx, gy)
      return distGoal
    }

    const now = this.gameNow()
    const destMoved = Phaser.Math.Distance.Between(u.pathDest.x, u.pathDest.y, tx, ty) > 48
    const chase = u.state === 'CHASE'
    const repathDue = u.path.length === 0 || destMoved || (chase && now >= u.repathAt) || u.stuckT > 0.7
    if (repathDue) {
      const raw =
        u.stuckTries > 0 ? findPathAroundStuck(this.nav, gx, gy, tx, ty, u.stuckTries) : findPath(this.nav, gx, gy, tx, ty)
      u.path = raw ? raw.map((p) => new Phaser.Math.Vector2(p.x, p.y)) : []
      u.pathDest.set(tx, ty)
      u.repathAt = now + (chase ? 280 : 1e9)
      if (u.stuckT > 0.7) {
        u.stuckT = 0
        u.stuckTries += 1
      }
    }

    while (u.path.length && Phaser.Math.Distance.Between(gx, gy, u.path[0].x, u.path[0].y) < 12) {
      u.path.shift()
    }

    const moved = Phaser.Math.Distance.Between(u.lastPos.x, u.lastPos.y, gx, gy)
    u.lastPos.set(gx, gy)
    if (moved < 1.2 && distGoal > 22) u.stuckT += dt
    else {
      u.stuckT = 0
      u.stuckTries = 0
    }

    const next = u.path[0]
    if (next) this.steerGuard(u, next.x, next.y, speed)
    else this.steerGuard(u, tx, ty, speed)
    return distGoal
  }

  private updateCams(dt: number) {
    this.camSees = false
    // Phase-driven sweeps run on their own clock so a speed change does not snap the beam.
    this.camClock += dt * this.phaseCamMul()
    const t = this.cfg.alert.phasesEnabled ? this.camClock : this.gameNow() / 1000
    for (const cam of this.cams) {
      cam.facing = cam.base + Math.sin(t * cam.speed) * cam.sweep
      cam.sprite.setRotation(cam.facing)
      cam.beam.setRotation(cam.facing)
      cam.beam.setPosition(cam.x, cam.y)
      cam.beam.setTint(cam.hot ? 0xffd2a8 : 0xffffff)
      cam.beam.setAlpha(cam.hot ? 1 : 0.82)
      const seen = this.coneSees(cam.x, cam.y, cam.facing, this.cfg.vision.camDist * this.mods.disguiseMul, this.camFov())
      const hot = seen && !this.hidden
      if (hot && !cam.hot) heistSfx.cameraAlert()
      cam.hot = hot
      cam.led.setPosition(cam.x + Math.cos(cam.facing) * 11, cam.y + Math.sin(cam.facing) * 11)
      cam.led.setFillStyle(cam.hot ? 0xffe08a : 0xc9a227, cam.hot ? 1 : 0.85)
      if (hot) {
        this.camSees = true
        this.addAlert(dt * this.cfg.alert.cam * this.mods.disguiseMul)
        for (const u of this.units) {
          u.lastSeen.set(this.player.x, this.player.y)
          if (u.state === 'PATROL' || u.state === 'RETURN') this.setG(u, 'INVESTIGATE')
          if (this.alert >= 1 && u.state !== 'CHASE') this.setG(u, 'CHASE')
        }
      }
    }
  }

  private updateGuard(u: GuardUnit, dt: number) {
    const seen = this.seesPlayer(u)
    const hideMul = this.hidden ? 0.22 : 1
    if (seen) {
      u.lastSeen.set(this.player.x, this.player.y)
      u.detect = Math.min(1, u.detect + dt * (1.05 + this.noise / 90) * hideMul * this.mods.disguiseMul)
      if (u.detect >= 1 || u.state === 'SEARCH' || u.state === 'CHASE') this.setG(u, 'CHASE')
      else if (u.state === 'PATROL' || u.state === 'RETURN') this.setG(u, 'INVESTIGATE')
    } else if (u.state !== 'CHASE') {
      u.detect = Math.max(0, u.detect - dt * 0.32)
    }
    if (!seen && this.hearsPlayer(u) && u.state !== 'CHASE') {
      u.lastSeen.set(this.player.x, this.player.y)
      this.setG(u, 'INVESTIGATE')
    }
    if (this.alert >= 1 && u.state !== 'CHASE') {
      this.setG(u, 'CHASE')
    }

    const gc = this.cfg.guard
    const pm = this.phaseGuardMul()
    if (u.state === 'PATROL') {
      const wp = u.waypoints[u.wi]
      const d = this.followTo(u, wp.x, wp.y, gc.patrol * pm, dt)
      if (d < 18 || u.stuckTries >= 5) {
        if (u.stuckTries >= 5) this.skipUnreachable(u)
        u.wi = (u.wi + 1) % u.waypoints.length
        u.path = []
      }
    } else if (u.state === 'INVESTIGATE') {
      if (this.followTo(u, u.lastSeen.x, u.lastSeen.y, gc.investigate * pm, dt) < 18 || u.stuckTries >= 5) {
        if (u.stuckTries >= 5) this.skipUnreachable(u)
        this.setG(u, 'SEARCH')
      }
    } else if (u.state === 'CHASE') {
      const targetX = seen ? this.player.x : u.lastSeen.x
      const targetY = seen ? this.player.y : u.lastSeen.y
      this.followTo(u, targetX, targetY, gc.chase, dt)
      if (u.stuckTries >= 5) this.skipUnreachable(u)
      if (Phaser.Math.Distance.Between(u.sprite.x, u.sprite.y, this.player.x, this.player.y) < gc.catchDist) {
        this.finish('caught')
      } else if (!seen && Phaser.Math.Distance.Between(u.sprite.x, u.sprite.y, u.lastSeen.x, u.lastSeen.y) < 22) {
        this.setG(u, 'SEARCH')
      }
    } else if (u.state === 'SEARCH') {
      u.searchT -= dt
      const pt = u.searchPts[u.searchI] ?? u.lastSeen
      if (this.followTo(u, pt.x, pt.y, gc.search * pm, dt) < 18 || u.stuckTries >= 5) {
        if (u.stuckTries >= 5) this.skipUnreachable(u)
        u.searchI = (u.searchI + 1) % Math.max(1, u.searchPts.length)
        u.path = []
      }
      if (u.searchT <= 0) this.resumePatrol(u)
    } else if (u.state === 'RETURN') {
      const wp = u.waypoints[u.wi]
      if (this.followTo(u, wp.x, wp.y, gc.returning * pm, dt) < 18 || u.stuckTries >= 5) {
        if (u.stuckTries >= 5) this.skipUnreachable(u)
        u.wi = (u.wi + 1) % u.waypoints.length
        this.setG(u, 'PATROL')
      }
    }
    this.syncGuardAnim(u)
  }

  private duckSheetReady() {
    return this.sheetReady('duck_sheet')
  }

  private tryCreateDuckAnims() {
    if (!this.duckSheetReady()) {
      this.duckAnimsReady = false
      return false
    }
    try {
      this.createDuckAnims()
      this.duckAnimsReady = this.anims.exists('duck-idle')
      return this.duckAnimsReady
    } catch (err) {
      console.error(err)
      this.duckAnimsReady = false
      return false
    }
  }

  private createDuckAnims() {
    if (this.anims.exists('duck-idle')) return
    this.anims.create({
      key: 'duck-idle',
      frames: this.anims.generateFrameNumbers('duck_sheet', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
      skipMissedFrames: false,
    })
    this.anims.create({
      key: 'duck-walk',
      frames: this.anims.generateFrameNumbers('duck_sheet', { start: 4, end: 11 }),
      frameRate: 9,
      repeat: -1,
      skipMissedFrames: false,
    })
    this.anims.create({
      key: 'duck-sneak',
      frames: this.anims.generateFrameNumbers('duck_sheet', { start: 4, end: 11 }),
      frameRate: 5,
      repeat: -1,
      skipMissedFrames: false,
    })
    this.anims.create({
      key: 'duck-run',
      frames: this.anims.generateFrameNumbers('duck_sheet', { start: 12, end: 15 }),
      frameRate: 11,
      repeat: -1,
      skipMissedFrames: false,
    })
  }

  private sheetReady(key: string) {
    if (!this.textures.exists(key)) return false
    const tex = this.textures.get(key)
    const src = tex.getSourceImage() as HTMLImageElement | undefined
    if (!src || src.width !== 256 * 4 || src.height !== 256 * 4) return false
    return tex.getFrameNames(false).length >= 16
  }

  private tryCreateGuardAnims() {
    if (!this.sheetReady('guard_sheet')) return false
    try {
      this.createGuardAnims()
      return this.anims.exists('guard-idle')
    } catch (err) {
      console.error(err)
      return false
    }
  }

  private createGuardAnims() {
    if (this.anims.exists('guard-idle')) return
    this.anims.create({
      key: 'guard-idle',
      frames: this.anims.generateFrameNumbers('guard_sheet', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    })
    this.anims.create({
      key: 'guard-walk',
      frames: this.anims.generateFrameNumbers('guard_sheet', { start: 4, end: 11 }),
      frameRate: 9,
      repeat: -1,
    })
    this.anims.create({
      key: 'guard-run',
      frames: this.anims.generateFrameNumbers('guard_sheet', { start: 12, end: 15 }),
      frameRate: 11,
      repeat: -1,
    })
  }

  private syncGuardAnim(u: GuardUnit) {
    if (!u.sprite?.active) return
    const body = u.sprite.body as Phaser.Physics.Arcade.Body
    const moving = Math.hypot(body.velocity.x, body.velocity.y) > 10
    let key = 'guard-idle'
    if (moving) {
      key = u.state === 'CHASE' ? 'guard-run' : 'guard-walk'
    }
    if (!this.anims.exists(key)) return
    if (u.sprite.anims.currentAnim?.key !== key) u.sprite.play(key, true)
    const vx = body.velocity.x
    if (Math.abs(vx) > 6) u.sprite.setFlipX(vx < 0)
    else if (Math.abs(Math.cos(u.facing)) > 0.2) u.sprite.setFlipX(Math.cos(u.facing) < 0)
  }

  /** Single entry point for alert gains; scripted spikes (safe siren) will reuse it. */
  private raiseAlertTo(min: number) {
    this.quietT = 0
    this.alert = Phaser.Math.Clamp(Math.max(this.alert, min), 0, 1)
  }

  private addAlert(delta: number) {
    this.quietT = 0
    this.alert = Phaser.Math.Clamp(this.alert + delta, 0, 1)
  }

  /** Ladder ALERT falls down: 1.00 → 0.95 → 0.70 → 0.30 → 0, with a quiet hold at every step. */
  private alertStep() {
    const ac = this.cfg.alert
    const steps = [
      { floor: ac.chaseFloor, hold: ac.stepHoldS.chase },
      { floor: ac.bandDanger, hold: ac.stepHoldS.danger },
      { floor: ac.bandSuspicious, hold: ac.stepHoldS.suspicious },
    ]
    for (const step of steps) {
      if (this.alert > step.floor) return step
    }
    return { floor: 0, hold: 0 }
  }

  private updateAlert(dt: number) {
    const ac = this.cfg.alert
    if (this.anyChase()) {
      this.raiseAlertTo(ac.chaseFloor)
      return
    }
    if (this.units.some((u) => this.seesPlayer(u))) {
      this.addAlert(dt * (ac.sightBase + this.maxDetect() * ac.sightDetect) * this.mods.disguiseMul)
      return
    }
    if (this.camSees) {
      this.quietT = 0
      return
    }
    if (this.units.some((u) => this.hearsPlayer(u))) {
      this.raiseAlertTo(ac.hearFloor)
      return
    }
    const rate = this.hidden ? ac.decayHidden : ac.decay
    if (!ac.phasesEnabled) {
      this.alert = Math.max(0, this.alert - dt * rate)
      return
    }
    this.quietT += dt
    const step = this.alertStep()
    this.alert = Math.max(step.floor, this.alert - dt * rate)
    if (step.floor <= 0) return
    const hold = step.hold * (this.hidden ? ac.hiddenHoldMul : 1)
    if (this.alert <= step.floor + 1e-4 && this.quietT >= hold) {
      this.alert = Math.max(0, step.floor - 0.005)
      this.quietT = 0
    }
  }

  private phaseOf(): RaidPhase {
    const a = Math.round(this.alert * 100)
    if (this.anyChase()) return 'CHASE'
    if (a >= this.cfg.alert.bandDanger * 100) return 'DANGER'
    if (a >= this.cfg.alert.bandSuspicious * 100) return 'SUSPICIOUS'
    return 'SAFE'
  }

  private updateRaidPhase() {
    const next = this.phaseOf()
    if (next === this.raidPhase) return
    const prev = this.raidPhase
    this.raidPhase = next
    this.phaseRising = PHASE_RANK[next] > PHASE_RANK[prev]
    this.phaseChangedAt = this.gameNow()
    if (!this.cfg.alert.phasesEnabled) return
    this.phaseHud?.setText(heistT(PHASE_LABEL[next]))
    this.phaseHud?.setColor(PHASE_COLOR[next])
    if (this.phaseRising && next === 'DANGER') {
      heistSfx.investigateStart()
      this.sweepGuards()
    }
  }

  /** DANGER makes the house look for the player instead of waiting for him. */
  private sweepGuards() {
    const r = this.cfg.alert.sweepRadius
    for (const u of this.units) {
      if (u.state !== 'PATROL' && u.state !== 'RETURN') continue
      if (Phaser.Math.Distance.Between(u.sprite.x, u.sprite.y, this.player.x, this.player.y) > r) continue
      u.lastSeen.set(this.player.x, this.player.y)
      u.path = []
      this.setG(u, 'INVESTIGATE')
    }
  }

  private phaseGuardMul() {
    const ac = this.cfg.alert
    return ac.phasesEnabled ? (ac.guardSpeedMul[PHASE_KEY[this.raidPhase]] ?? 1) : 1
  }

  private phaseCamMul() {
    const ac = this.cfg.alert
    return ac.phasesEnabled ? (ac.camSpeedMul[PHASE_KEY[this.raidPhase]] ?? 1) : 1
  }

  private drawPhaseFx(now: number) {
    if (!this.phaseTint || !this.phaseHud) return
    if (!this.cfg.alert.phasesEnabled) {
      this.phaseTint.setVisible(false)
      this.phaseHud.setVisible(false)
      return
    }
    const chasing = this.anyChase()
    const visual: RaidPhase = chasing ? 'CHASE' : this.raidPhase === 'CHASE' ? 'DANGER' : this.raidPhase
    const tint = PHASE_TINT[visual]
    const pulse = chasing ? 1 + Math.sin(now / 140) * 0.25 : 1
    this.phaseTint.setVisible(tint.alpha > 0)
    this.phaseTint.setPosition(this.camW() / 2, this.camH() / 2)
    this.phaseTint.setDisplaySize(this.camW(), this.camH())
    this.phaseTint.setFillStyle(tint.color, tint.alpha * pulse)

    const age = now - this.phaseChangedAt
    const show = age < 1600 && (this.phaseRising || this.raidPhase === 'SAFE')
    this.phaseHud.setVisible(show)
    if (!show) return
    this.phaseHud.setPosition(this.bannerX(), this.hudPanelH() + 12)
    this.phaseHud.setAlpha(age < 1100 ? 1 : 1 - (age - 1100) / 500)
  }

  private finish(verdict: HeistEnd['verdict']) {
    if (this.ended) return
    this.ended = true
    if (this.levelId === 'bank' && verdict === 'caught') this.destroyRunDrops()
    if (verdict === 'caught') this.spillCarried()
    if (verdict === 'escaped') heistSfx.exit()
    else if (verdict === 'caught') heistSfx.caught()
    this.syncHeistSfx(true)
    this.releaseTouches()
    this.input.enabled = false
    const body = this.player.body as Phaser.Physics.Arcade.Body
    body.setVelocity(0, 0)
    body.setAcceleration(0, 0)
    for (const u of this.units) {
      const gb = u.sprite.body as Phaser.Physics.Arcade.Body
      gb.setVelocity(0, 0)
      gb.setAcceleration(0, 0)
    }
    this.physics.pause()
    if (this.levelId === 'bank' && verdict !== 'aborted') {
      const complete = verdict === 'escaped' && this.bankReachedFinal
      persistBankWorld({
        lootTaken: verdict === 'escaped' ? this.runLootIds : [],
        openedDoors: [...this.bankOpenedDoors],
        openedSafes: [...this.bankOpenedSafes],
        depth: this.bankDepth,
        reachedFinal: this.bankReachedFinal,
        complete,
      })
    }
    const coins = verdict === 'aborted' ? 0 : this.currentLoot
    const timeMs = this.gameNow() - this.startedAt
    const bonus =
      verdict === 'escaped' && this.alert < this.cfg.alert.bandSuspicious && coins > 0
        ? Math.max(5, Math.floor(coins * 0.1))
        : 0
    const objectives = {
      loot: coins >= this.objLoot,
      stealth: !this.stealthBroken,
      speed: timeMs < this.objTimeS * 1000,
    }
    const objBonus = raidObjectiveBonus(verdict === 'escaped', objectives.loot, objectives.stealth, objectives.speed)
    this.onDone({
      verdict,
      coins,
      bonus,
      objBonus,
      objectives,
      lootGoal: this.objLoot,
      speedGoalS: this.objTimeS,
      banked: 0,
      timeMs,
      alert: this.alert,
    })
  }

  private drawCone(ox: number, oy: number, facing: number, dist: number, fov: number, color: number, alpha: number, edge: number) {
    this.visionGfx.fillStyle(color, alpha)
    this.visionGfx.beginPath()
    this.visionGfx.moveTo(ox, oy)
    const steps = 14
    for (let i = 0; i <= steps; i += 1) {
      const a = facing - fov / 2 + (fov * i) / steps
      this.visionGfx.lineTo(ox + Math.cos(a) * dist, oy + Math.sin(a) * dist)
    }
    this.visionGfx.closePath()
    this.visionGfx.fillPath()
    this.visionGfx.lineStyle(1.5, edge, 0.28)
    this.visionGfx.strokePath()
  }

  private drawWorldFx() {
    this.visionGfx.clear()
    for (const u of this.units) {
      const hot = u.state === 'CHASE' || u.detect > 0.5
      this.drawCone(
        u.sprite.x,
        u.sprite.y,
        u.facing,
        this.cfg.vision.guardDist * this.mods.disguiseMul,
        this.guardFov(),
        hot ? 0xc45a3a : 0xc9a227,
        hot ? 0.12 : 0.07,
        hot ? 0xff8a6a : 0xe8c36a,
      )
    }
    this.worldGfx.clear()
    this.worldGfx.fillStyle(0x000000, 0.32)
    this.worldGfx.fillEllipse(this.player.x, this.player.y + 16, 30, 12)
    for (const u of this.units) this.worldGfx.fillEllipse(u.sprite.x, u.sprite.y + 12, 20, 10)
  }

  private drawUi() {
    const h = this.camH()
    this.uiGfx.clear()
    this.uiGfx.fillStyle(0x080604, 0.55)
    const barW = this.hudBarWidth()
    this.uiGfx.fillRoundedRect(6, 4, barW, this.hudPanelH(), 8)
    this.hud.setWordWrapWidth(barW - 14, true)
    this.bagHud.setWordWrapWidth(barW - 14, true)
    const sx = this.stick.active ? this.stick.ox : 72
    const sy = this.stick.active ? this.stick.oy : h - 86
    this.uiGfx.fillStyle(0x000000, 0.32)
    this.uiGfx.fillCircle(sx, sy, 54)
    this.uiGfx.lineStyle(2, 0xc9a227, 0.55)
    this.uiGfx.strokeCircle(sx, sy, 54)
    this.uiGfx.fillStyle(0xffe08a, 0.95)
    this.uiGfx.fillCircle(sx + this.stick.x * 36, sy + this.stick.y * 36, 18)

    const sneak = this.btnSneak()
    const dash = this.btnDash()
    const open = this.btnOpen()
    this.uiGfx.fillStyle(this.sneakHeld || this.keys.shift.isDown || this.winKeys.shift ? 0xc9a227 : 0x1a1410, 0.82)
    this.uiGfx.fillCircle(sneak.x, sneak.y, 36)
    this.uiGfx.lineStyle(2, 0xc9a227, 0.7)
    this.uiGfx.strokeCircle(sneak.x, sneak.y, 36)
    const now = this.gameNow()
    const cooling = now < this.dashReady && now >= this.dashUntil
    this.uiGfx.fillStyle(now < this.dashUntil ? 0xff6a4a : cooling ? 0x2a2018 : 0x1a1410, 0.82)
    this.uiGfx.fillCircle(dash.x, dash.y, 38)
    this.uiGfx.strokeCircle(dash.x, dash.y, 38)
    const showOpen = this.nearSafe() && !this.safeCrack
    const showHit = this.safeCrack
    if (showOpen || showHit) {
      this.uiGfx.fillStyle(this.openHeld || this.hitHeld || this.winKeys.e ? 0xc9a227 : 0x1a1410, 0.86)
      this.uiGfx.fillCircle(open.x, open.y, 38)
      this.uiGfx.strokeCircle(open.x, open.y, 38)
    }
    const showDrop = this.canDrop()
    if (showDrop) {
      const drop = this.btnDrop()
      const heavy = this.weightOver() > 0
      const pulse = heavy ? 0.55 + Math.sin(now / 140) * 0.35 : 0.82
      this.uiGfx.fillStyle(now < this.dropReadyAt ? 0x2a2018 : heavy ? 0x5a2a14 : 0x1a1410, pulse)
      this.uiGfx.fillCircle(drop.x, drop.y, 34)
      this.uiGfx.lineStyle(2, heavy ? 0xff8a4a : 0xffb070, heavy ? 0.95 : 0.7)
      this.uiGfx.strokeCircle(drop.x, drop.y, 34)
      this.uiGfx.lineStyle(2, 0xc9a227, 0.7)
      this.dropLabel?.setPosition(drop.x, drop.y)
      this.dropLabel?.setColor(heavy ? '#ff8a4a' : '#ffb070')
      this.dropLabel?.setText(heavy ? heistT('heistHeavy') : heistT('heistDrop'))
    }
    this.dropLabel?.setVisible(showDrop)
    if (cooling) {
      const t = 1 - (this.dashReady - now) / (this.cfg.player.dashCd - this.cfg.player.dashMs)
      this.uiGfx.lineStyle(4, 0xc9a227, 0.9)
      this.uiGfx.beginPath()
      this.uiGfx.arc(dash.x, dash.y, 38, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Phaser.Math.Clamp(t, 0, 1), false)
      this.uiGfx.strokePath()
    }

    if (this.safeCrack) {
      const ox = this.camW() / 2
      const oy = Math.min(128, Math.max(108, this.camH() * 0.18))
      this.uiGfx.fillStyle(0x000000, 0.78)
      this.uiGfx.fillRoundedRect(ox - 154, oy - 58, 308, 128, 12)
      this.uiGfx.lineStyle(2, 0xc9a227, 0.9)
      this.uiGfx.strokeRoundedRect(ox - 154, oy - 58, 308, 128, 12)
      const barX = ox - 120
      const barY = oy + 10
      const barW = 240
      this.uiGfx.fillStyle(0x1a1410, 1)
      this.uiGfx.fillRoundedRect(barX, barY, barW, 18, 8)
      const zone = this.safeZone()
      this.uiGfx.fillStyle(0x3d8a4a, 0.95)
      this.uiGfx.fillRect(barX + (zone.center - zone.width / 2) * barW, barY, zone.width * barW, 18)
      this.uiGfx.fillStyle(0xffe08a, 1)
      this.uiGfx.fillRect(barX + this.safeMarker * barW - 3, barY - 5, 6, 28)
      this.crackHud.setPosition(ox, oy - 52)
      this.crackHint.setPosition(ox, oy + 36)
    }

    this.drawPhaseFx(now)
    const hudPhase: RaidPhase = this.anyChase() ? 'CHASE' : this.raidPhase === 'CHASE' ? 'DANGER' : this.raidPhase
    const band = heistT(PHASE_LABEL[hudPhase])
    const color = PHASE_COLOR[hudPhase]
    const full = this.currentLoot >= this.mods.bagCap || this.gameNow() < this.bagFullFlash
    this.hud.setColor(full ? '#ffb070' : '#ffe08a')
    const escape = this.escaping ? `   ${heistT('heistEscape')}` : ''
    this.hud.setText(
      `${heistT('heistDuckCoin')} ${this.currentLoot}   ${formatClock(now - this.startedAt)}   ${band}${escape}`,
    )
    const heavy = this.weightOver() > 0
    this.bagHud.setColor(heavy ? '#ff8a4a' : color)
    const police =
      this.escapeUntil > 0
        ? `   ${heistT('heistPolice')} ${formatClock(Math.max(0, this.escapeUntil - now))}`
        : ''
    const load = this.showWeightHud()
      ? `${heistT('heistLoad')} ${Math.round(this.carriedWeight())}/${this.weightCap()}${heavy ? ` ${heistT('heistHeavy')}` : ''}   `
      : ''
    this.bagHud.setText(
      `${load}${heistT('heistBag')} ${this.currentLoot}/${this.mods.bagCap}${full ? ` ${heistT('heistBagFull')}` : ''}${police}`,
    )
    this.drawHudBars()
    this.drawObjectives(now - this.startedAt)
    this.exitLabel?.setText(heistT('heistExit'))
    for (const label of this.exitLabels) label.setText(heistT('heistExit'))
    for (const lab of this.roomLabels) lab.obj.setText(heistT(lab.key))
    for (const door of this.doors) {
      if (door.opened) this.hideDoorPrompt(door)
      else door.label.setText(heistT('heistLockpick'))
    }
    this.safeTitle?.setText(heistT('heistSafeName'))
    this.sneakLabel?.setText(heistT('heistSneak'))
    this.dashLabel?.setText(heistT('heistDash'))
    if (!this.canDrop()) this.dropLabel?.setText(heistT('heistDrop'))
    if (this.safeCrack) {
      this.crackHud.setVisible(true)
      const hits = this.crackKind === 'door' ? DOOR_HITS : SAFE_HITS
      const title = this.crackKind === 'door' ? heistT('heistDoorCrackTitle') : heistT('heistCrackTitle')
      this.crackHud.setText(`${title}\n${heistT('heistRound', { n: Math.min(this.safeHits + 1, hits), total: hits })}`)
      this.crackHint.setVisible(true)
      this.crackHint.setText(heistT('heistHitHint'))
    } else if (this.safeOpened && now - this.safeOpenedAt < 1800) {
      const reward = this.safes[this.crackI]?.reward ?? SAFE_REWARD
      this.showBanner(`${heistT('heistSafeOpenedTitle')}\n${heistT('heistSafeReward', { n: reward })}`)
    } else if (this.routeNoticeAt > 0 && now - this.routeNoticeAt < 4200) {
      this.showBanner(`${heistT('heistRouteBlocked')}\n${heistT('heistRouteOpen')}`)
    } else if (this.doorOpenedAt > 0 && now - this.doorOpenedAt < 1400) {
      this.showBanner(heistT('heistDoorOpened'))
    } else if (this.novice && this.levelId === 'bank' && now < this.onboardUntil) {
      this.showBanner(heistT('heistBankOnboard'))
    } else {
      this.crackHud.setVisible(false)
      this.crackHint.setVisible(false)
    }
    this.drawPauseUi()
  }

  private drawObjectives(elapsedMs: number) {
    if (this.safeCrack) {
      this.objHud.setVisible(false)
      return
    }
    this.objHud.setVisible(true)
    const w = Math.min(148, Math.max(120, this.camW() - 88))
    const top = this.hudPanelH() + 8
    this.uiGfx.fillStyle(0x080604, 0.5)
    if (this.levelId === 'bank') {
      const zone = Math.min(BANK_ZONE_COUNT, Math.max(1, this.bankZoneNow + 1))
      this.uiGfx.fillRoundedRect(6, top, w, 42, 8)
      const barX = 14
      const barY = top + 26
      const barW = w - 16
      this.uiGfx.fillStyle(0x000000, 0.45)
      this.uiGfx.fillRoundedRect(barX, barY, barW, 6, 3)
      this.uiGfx.fillStyle(0xc9a227, 0.95)
      this.uiGfx.fillRoundedRect(barX, barY, Math.max(4, (barW * zone) / BANK_ZONE_COUNT), 6, 3)
      this.objHud.setPosition(12, top + 6)
      this.objHud.setWordWrapWidth(w - 12, true)
      this.objHud.setText(heistT('heistBankZone', { n: zone, max: BANK_ZONE_COUNT }))
      return
    }
    const loot = this.currentLoot >= this.objLoot
    const stealth = !this.stealthBroken
    const speed = elapsedMs < this.objTimeS * 1000
    const mark = (ok: boolean) => (ok ? '✓' : '□')
    this.uiGfx.fillRoundedRect(6, top, w, 58, 8)
    this.objHud.setPosition(12, top + 3)
    this.objHud.setWordWrapWidth(w - 12, true)
    this.objHud.setText(
      `${heistT('heistObjectives')}\n${mark(loot)} ${heistT('heistObjLoot', { n: this.objLoot })}\n${mark(stealth)} ${heistT('heistObjStealth')}\n${mark(speed)} ${heistT('heistObjSpeed', { n: this.objTimeS })}`,
    )
  }

  private drawPauseUi() {
    const pause = this.btnPause()
    this.uiGfx.fillStyle(0x1a1410, 0.92)
    this.uiGfx.fillCircle(pause.x, pause.y, pause.r)
    this.uiGfx.lineStyle(2, 0xc9a227, 0.85)
    this.uiGfx.strokeCircle(pause.x, pause.y, pause.r)
    this.uiGfx.fillStyle(0xffe08a, 0.95)
    this.uiGfx.fillRect(pause.x - 5, pause.y - 7, 3.5, 14)
    this.uiGfx.fillRect(pause.x + 1.5, pause.y - 7, 3.5, 14)
    this.pauseHudLbl.setPosition(pause.x, pause.y + 22)
    this.pauseHudLbl.setText(heistT('heistPause'))
    this.pauseGfx.clear()
    if (!this.paused) {
      this.pauseTitle.setVisible(false)
      this.pauseResumeLbl.setVisible(false)
      this.pauseAbortLbl.setVisible(false)
      return
    }
    const w = this.camW()
    const h = this.camH()
    const panel = this.pausePanel()
    this.pauseGfx.fillStyle(0x050308, 0.78)
    this.pauseGfx.fillRect(0, 0, w, h)
    this.pauseGfx.fillStyle(0x120c10, 0.98)
    this.pauseGfx.fillRoundedRect(panel.x - panel.w / 2, panel.y - panel.h / 2, panel.w, panel.h, 18)
    this.pauseGfx.lineStyle(2, 0xc9a227, 0.9)
    this.pauseGfx.strokeRoundedRect(panel.x - panel.w / 2, panel.y - panel.h / 2, panel.w, panel.h, 18)
    const resume = this.btnResume()
    const abort = this.btnAbort()
    this.pauseGfx.fillStyle(0xc9a227, 1)
    this.pauseGfx.fillRoundedRect(resume.x - resume.w / 2, resume.y - resume.h / 2, resume.w, resume.h, 14)
    this.pauseGfx.fillStyle(0x1a1410, 1)
    this.pauseGfx.fillRoundedRect(abort.x - abort.w / 2, abort.y - abort.h / 2, abort.w, abort.h, 14)
    this.pauseGfx.lineStyle(2, 0xc9a227, 0.85)
    this.pauseGfx.strokeRoundedRect(abort.x - abort.w / 2, abort.y - abort.h / 2, abort.w, abort.h, 14)
    this.pauseTitle.setText(heistT('heistPaused'))
    this.pauseTitle.setPosition(panel.x, panel.y - 92)
    this.pauseTitle.setVisible(true)
    this.pauseResumeLbl.setText(heistT('heistResume'))
    this.pauseResumeLbl.setPosition(resume.x, resume.y)
    this.pauseResumeLbl.setVisible(true)
    this.pauseAbortLbl.setText(heistT('heistAbortRaid'))
    this.pauseAbortLbl.setPosition(abort.x, abort.y)
    this.pauseAbortLbl.setVisible(true)
  }
}
