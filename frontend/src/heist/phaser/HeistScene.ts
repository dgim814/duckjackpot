import Phaser from 'phaser'
import { punchBackdrop } from '../sprite'
import type { HeistEnd } from '../types'
import { RAID_OBJ_LOOT, RAID_OBJ_TIME_S, raidObjectiveBonus, type HeistRunMods } from '../progress'
import { heistLevelObjectives, type HeistLevelId } from '../heistLevel'
import { applyCoinSpriteSize, coinDef, ensureCoinPlaceholders, loadDuckCoinImages, playCoinIdle, stopCoinIdle, SAFE_REWARD, type DuckCoinKind } from '../coinAssets'
import { heistT } from '../heistI18n'
import { heistSfx, unlockHeistSfx } from '../heistSfx'
import { buildNavGrid, cellCenter, findPath, findPathAroundStuck, nearestWalkable, type NavGrid } from '../guardPath'
import {
  MANSION_CAMS,
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
  MANSION_SPAWN,
  MANSION_W,
  MANSION_WALLS,
} from './mansionLayout'

const W = 1760
const H = 1280
const NOISE = { sneak: 10, run: 35, dash: 80 } as const
const SPEED = { sneak: 70, run: 140, dash: 320 } as const
const DASH_MS = 200
const DASH_CD = 1100
const PICKUP_R = 42
const EXIT_HOLD = 0.62
const BTN_R = 52
const GUARD_VISION = 255
const GUARD_FOV = Phaser.Math.DegToRad(54)
const CAM_VISION = 210
const CAM_FOV = Phaser.Math.DegToRad(46)
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
const SAFE_RANGE = 86
const SAFE_MISS_ALERT = 0.2
const SAFE_HITS = 5
const DOOR_RANGE = 78
const DOOR_HITS = 2

type Wall = { x: number; y: number; w: number; h: number }
type HideZone = Wall
type SolidKind = 'wall' | 'desk' | 'column' | 'cabinet'
type SafeSpot = {
  x: number
  y: number
  opened: boolean
  extraX: number
  extraY: number
  extraKind?: LootKind
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
const GUARD_DISPLAY = 36
const DUCK_SHEET = '/heist/duck_sheet.png'
const DUCK_FRAME = 256
const DUCK_DISPLAY = 64
const DUCK_BODY_W = 20
const DUCK_BODY_H = 22
/** Previous visual size; keep world hitbox identical when display scale changes. */
const DUCK_HITBOX_FROM = 44

function jitter(n: number, amt: number) {
  return n + (Math.random() * 2 - 1) * amt
}

function formatClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export class HeistScene extends Phaser.Scene {
  private onDone: (end: HeistEnd) => void
  private mods: HeistRunMods
  private levelId: HeistLevelId
  private objLoot = RAID_OBJ_LOOT
  private objTimeS = RAID_OBJ_TIME_S
  private player!: Phaser.Physics.Arcade.Sprite
  private duckAnimsReady = false
  private units: GuardUnit[] = []
  private walls!: Phaser.Physics.Arcade.StaticGroup
  private wallRects: Wall[] = []
  private hideZones: HideZone[] = []
  private doors: LockedDoor[] = []
  private mapW = W
  private mapH = H
  private lootGroup!: Phaser.Physics.Arcade.Group
  private lootSpawn = 0
  private exitZone!: Phaser.GameObjects.Rectangle
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
    }
    const slot = map[e.code]
    if (!slot) return
    e.preventDefault()
    this.winKeys[slot] = down
    if (this.safeCrack && down && (slot === 'space' || slot === 'e')) {
      this.trySafeHit()
      return
    }
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
  private lobbyLabel!: Phaser.GameObjects.Text
  private vaultLabel!: Phaser.GameObjects.Text
  private sneakLabel!: Phaser.GameObjects.Text
  private dashLabel!: Phaser.GameObjects.Text
  private safeTitle!: Phaser.GameObjects.Text
  private safeOpenedAt = 0
  private hitHeld = false

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
  }

  private nav!: NavGrid

  constructor(onDone: (end: HeistEnd) => void, mods: HeistRunMods, levelId: HeistLevelId = 'bank') {
    super('HeistScene')
    this.onDone = onDone
    this.mods = mods
    this.levelId = levelId
    const obj = heistLevelObjectives(levelId)
    this.objLoot = obj.loot
    this.objTimeS = obj.timeS
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
    ctx.fillStyle = mansion ? '#1c1410' : '#15131a'
    ctx.fillRect(0, 0, s, s)
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
    const half = distPx * Math.tan(CAM_FOV / 2)
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
      if (punched instanceof HTMLCanvasElement) {
        if (this.textures.exists('duck_play')) this.textures.remove('duck_play')
        this.textures.addCanvas('duck_play', punched)
        return 'duck_play'
      }
    }
    return 'duck'
  }

  private addSolid(x: number, y: number, w: number, h: number, kind: SolidKind) {
    const cx = x + w / 2
    const cy = y + h / 2
    const fill = kind === 'wall' ? 0x1c1a22 : kind === 'column' ? 0x2a2430 : kind === 'cabinet' ? 0x241e28 : 0x2a241c
    this.add.rectangle(cx + 5, cy + 8, w + 2, h + 2, 0x050308, 0.48).setDepth(3)
    const r = this.add.rectangle(cx, cy, w, h, fill).setDepth(4)
    r.setStrokeStyle(1, 0x0a080c, 1)
    const trim = this.add.graphics().setDepth(5)
    trim.lineStyle(1.25, 0xc9a227, kind === 'wall' ? 0.22 : 0.42)
    trim.strokeRect(x + 2, y + 2, w - 4, h - 4)
    trim.fillStyle(0xe8d7a0, 0.14)
    trim.fillRect(x + 2, y + 1, w - 4, 3)
    if (kind === 'wall') {
      trim.fillStyle(0x141218, 0.35)
      if (w >= h && w > 64) {
        for (let px = x + 28; px < x + w - 12; px += 36) trim.fillRect(px, y + 5, 1, h - 10)
      } else if (h > 64) {
        for (let py = y + 28; py < y + h - 12; py += 36) trim.fillRect(x + 5, py, w - 10, 1)
      }
    } else if (kind === 'desk') {
      this.add.rectangle(cx, cy - h / 2 + 8, Math.max(14, w - 12), 9, 0x3a3228).setDepth(5)
      this.add.rectangle(cx, cy - h / 2 + 6, Math.max(10, w - 18), 3, 0xc9a227, 0.45).setDepth(6)
      this.add.rectangle(cx - w / 4, cy + 2, 10, h - 14, 0x1a1614).setDepth(5)
      this.add.rectangle(cx + w / 4, cy + 2, 10, h - 14, 0x1a1614).setDepth(5)
      trim.fillStyle(0x8ab4c8, 0.14)
      trim.fillRect(x + 22, y - 18, w - 44, 18)
      trim.lineStyle(1, 0xc9a227, 0.28)
      trim.strokeRect(x + 22, y - 18, w - 44, 18)
      trim.fillStyle(0xe8d7a0, 0.35)
      trim.fillCircle(cx + 40, cy - h / 2 + 4, 3)
    } else if (kind === 'column') {
      this.add.rectangle(cx, cy, w - 12, h - 12, 0x1a181e).setDepth(5)
      trim.lineStyle(2, 0xc9a227, 0.55)
      trim.strokeRect(x + 6, y + 6, w - 12, h - 12)
      trim.fillStyle(0xc9a227, 0.35)
      trim.fillCircle(cx, cy, 4)
    } else {
      trim.fillStyle(0xc9a227, 0.28)
      trim.fillRect(cx - w / 2 + 8, cy - 8, w - 16, 3)
      trim.lineStyle(1, 0x100c12, 0.65)
      trim.strokeRect(x + 8, y + 14, w - 16, 18)
      trim.strokeRect(x + 8, y + 36, w - 16, 18)
      trim.strokeRect(x + 8, y + 58, w - 16, Math.max(12, h - 72))
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

  private paintDecor() {
    const g = this.add.graphics().setDepth(2)
    const lamps: [number, number][] = [
      [430, 500],
      [1090, 500],
      [430, 820],
      [1090, 820],
      [860, 300],
      [148, 1040],
    ]
    for (const [lx, ly] of lamps) {
      g.fillStyle(0xc9a227, 0.06)
      g.fillCircle(lx, ly, 36)
      g.fillStyle(0x1a181e)
      g.fillCircle(lx, ly, 5)
      g.fillStyle(0xe8d7a0, 0.55)
      g.fillCircle(lx, ly, 2.4)
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
        fontSize: '12px',
        color: '#ffe08a',
      })
      .setOrigin(0.5)
      .setDepth(8)
    this.safePrompt = this.add
      .text(x, y + 62, '', {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '11px',
        color: '#ffe08a',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(16)
  }

  private buildWorld() {
    this.cameras.main.setBackgroundColor(this.levelId === 'mansion' ? 0x140e0c : 0x0c0a10)
    this.mapW = this.levelId === 'mansion' ? MANSION_W : W
    this.mapH = this.levelId === 'mansion' ? MANSION_H : H
    this.physics.world.setBounds(0, 0, this.mapW, this.mapH)
    if (this.levelId === 'mansion') {
      this.buildMansionWorld()
      return
    }
    this.drawFloor()

    this.walls = this.physics.add.staticGroup()
    this.wallRects = []
    this.hideZones = []

    const T = 40

    this.addSolid(0, 0, W, T, 'wall')
    this.addSolid(0, H - T, W, T, 'wall')
    this.addSolid(0, 0, T, H, 'wall')
    this.addSolid(W - T, 0, T, H, 'wall')

    // Lobby divider with 3 routes: west / center / east
    this.addSolid(T, 900, 48, 28, 'wall')
    this.addSolid(196, 900, 228, 28, 'wall')
    this.addSolid(560, 900, 620, 28, 'wall')
    this.addSolid(1328, 900, W - T - 1328, 28, 'wall')

    // West corridor inner wall (gap 500–640)
    this.addSolid(236, T, 28, 460, 'wall')
    this.addSolid(236, 640, 28, 260, 'wall')

    // East corridor inner wall (gap 500–640)
    this.addSolid(1488, T, 28, 460, 'wall')
    this.addSolid(1488, 640, 28, 260, 'wall')

    // Vault wall with center door
    this.addSolid(T, 380, 620, 28, 'wall')
    this.addSolid(980, 380, W - T - 980, 28, 'wall')

    // Hall desks / counters
    this.addSolid(320, 540, 170, 46, 'desk')
    this.addHide(320, 586, 170, 48)
    this.addSolid(320, 730, 170, 46, 'desk')
    this.addHide(320, 776, 170, 48)
    this.addSolid(980, 540, 170, 46, 'desk')
    this.addHide(980, 586, 170, 48)
    this.addSolid(980, 730, 170, 46, 'desk')
    this.addHide(980, 776, 170, 48)

    // Columns
    this.addSolid(620, 620, 46, 46, 'column')
    this.addHide(608, 666, 70, 40)
    this.addSolid(1088, 620, 46, 46, 'column')
    this.addHide(1076, 666, 70, 40)

    // Cabinets
    this.addSolid(64, 180, 72, 150, 'cabinet')
    this.addHide(136, 190, 50, 130)
    this.addSolid(1610, 180, 86, 160, 'cabinet')
    this.addHide(1560, 190, 50, 140)
    this.addSolid(64, 1020, 90, 70, 'cabinet')
    this.addHide(154, 1020, 44, 70)

    this.paintHideMats()
    this.paintDecor()
    this.nav = buildNavGrid(W, H, 24, this.wallRects, 22)

    this.buildSafe()
    this.safes = [{ x: 1188, y: 148, opened: false, extraX: 1280, extraY: 250, extraKind: 'C50' }]

    // EXIT door (overlap only)
    const exitFx = this.add.graphics().setDepth(3)
    exitFx.fillStyle(0x050806, 0.9)
    exitFx.fillRoundedRect(148 - 86, 1188 - 46, 172, 92, 10)
    exitFx.fillStyle(0x14241a)
    exitFx.fillRoundedRect(148 - 76, 1188 - 38, 152, 76, 8)
    this.exitZone = this.add.rectangle(148, 1188, 150, 72, 0x1c3c2a, 0.55)
    this.exitZone.setStrokeStyle(2, 0xc9a227, 0.7)
    this.exitZone.setDepth(3)
    this.physics.add.existing(this.exitZone, true)
    exitFx.lineStyle(2, 0xc9a227, 0.55)
    exitFx.strokeRoundedRect(148 - 76, 1188 - 38, 152, 76, 8)
    exitFx.lineStyle(1, 0xe8d7a0, 0.35)
    exitFx.lineBetween(148, 1188 - 34, 148, 1188 + 34)
    exitFx.fillStyle(0xc9a227, 0.8)
    exitFx.fillCircle(148 - 18, 1188, 3)
    exitFx.fillCircle(148 + 18, 1188, 3)
    this.exitLabel = this.add.text(148, 1188, heistT('heistExit'), {
      fontFamily: 'Unbounded, sans-serif',
      fontSize: '16px',
      color: '#e8d7a0',
    }).setOrigin(0.5).setDepth(4)

    this.lobbyLabel = this.add.text(148, 1108, heistT('heistRoomLobby'), {
      fontFamily: 'Unbounded, sans-serif',
      fontSize: '10px',
      color: '#b49a62',
    }).setOrigin(0.5).setDepth(4)
    this.vaultLabel = this.add.text(860, 200, heistT('heistRoomVault'), {
      fontFamily: 'Unbounded, sans-serif',
      fontSize: '12px',
      color: '#b49a62',
    }).setOrigin(0.5).setDepth(4)

    this.makeDuckTexture()
    const duckKey = this.tryCreateDuckAnims() ? 'duck_sheet' : this.makeDuckTexture()
    try {
      this.player = this.physics.add.sprite(420, 1070, duckKey, duckKey === 'duck_sheet' ? 0 : undefined)
    } catch (err) {
      console.error(err)
      this.duckAnimsReady = false
      this.player = this.physics.add.sprite(420, 1070, this.makeDuckTexture())
    }
    this.player.setOrigin(0.5, 0.5)
    this.pinDuckVisual()
    this.player.setDepth(12)
    this.player.setCollideWorldBounds(true)
    const pb = this.player.body as Phaser.Physics.Arcade.Body
    pb.setMaxVelocity(SPEED.run, SPEED.run)
    pb.setDamping(true)
    pb.setDrag(0.0008, 0.0008)
    this.setMoveAnim('idle')

    const guardKey = this.tryCreateGuardAnims() ? 'guard_sheet' : 'guard'
    const routeA = [
      new Phaser.Math.Vector2(300, 490),
      new Phaser.Math.Vector2(800, 240),
      new Phaser.Math.Vector2(1580, 490),
      new Phaser.Math.Vector2(1580, 780),
      new Phaser.Math.Vector2(800, 820),
      new Phaser.Math.Vector2(500, 1080),
      new Phaser.Math.Vector2(150, 760),
    ]
    const routeB = [
      new Phaser.Math.Vector2(1280, 520),
      new Phaser.Math.Vector2(1100, 220),
      new Phaser.Math.Vector2(780, 200),
      new Phaser.Math.Vector2(1280, 780),
      new Phaser.Math.Vector2(1250, 1100),
      new Phaser.Math.Vector2(1100, 860),
    ]
    this.units = [this.spawnGuard(routeA, 1, guardKey), this.spawnGuard(routeB, 1, guardKey)]

    this.cams = [
      this.makeCam(700, 430, Math.PI / 2, 0.85, 0.55),
      this.makeCam(1320, 70, Math.PI / 2, 0.7, 0.62),
      this.makeCam(1588, 560, Math.PI, 0.9, 0.48),
    ]

    this.lootGroup = this.physics.add.group()
    const slots: [number, number, LootKind][] = [
      [560, 1110, 'C10'],
      [760, 1080, 'C10'],
      [300, 1140, 'C10'],
      [700, 850, 'C10'],
      [410, 500, 'C50'],
      [1120, 780, 'C50'],
      [1610, 620, 'C50'],
      [340, 780, 'C50'],
      [1080, 520, 'C100'],
      [1610, 200, 'C100'],
    ]
    slots.forEach(([sx, sy, kind], i) => {
      this.spawnLoot(Phaser.Math.Clamp(jitter(sx, 12), 70, W - 70), Phaser.Math.Clamp(jitter(sy, 10), 70, H - 70), kind, i)
    })

    this.physics.add.collider(this.player, this.walls)
    for (const u of this.units) this.physics.add.collider(u.sprite, this.walls)

    this.setupPlaySession()
  }

  private setupPlaySession() {
    this.worldGfx = this.add.graphics().setDepth(10)
    this.visionGfx = this.add.graphics().setDepth(2)
    this.uiGfx = this.add.graphics().setScrollFactor(0).setDepth(20)
    this.pauseGfx = this.add.graphics().setScrollFactor(0).setDepth(50)
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
        fontSize: '22px',
        color: '#ffe08a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51)
      .setVisible(false)
    this.pauseResumeLbl = this.add
      .text(0, 0, heistT('heistResume'), {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '14px',
        color: '#120c10',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51)
      .setVisible(false)
    this.pauseAbortLbl = this.add
      .text(0, 0, heistT('heistAbortRaid'), {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '13px',
        color: '#ffe08a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51)
      .setVisible(false)
    this.hud = this.add
      .text(12, 8, '', { fontFamily: 'Unbounded, sans-serif', fontSize: '12px', color: '#f3e6c4' })
      .setScrollFactor(0)
      .setDepth(21)
    this.bagHud = this.add
      .text(12, 26, '', { fontFamily: 'Unbounded, sans-serif', fontSize: '12px', color: '#f3e6c4' })
      .setScrollFactor(0)
      .setDepth(21)
    this.objHud = this.add
      .text(10, 52, '', { fontFamily: 'Unbounded, sans-serif', fontSize: '9px', color: '#d8c49a', lineSpacing: 2 })
      .setScrollFactor(0)
      .setDepth(21)
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

    this.cameras.main.startFollow(this.player, true, 0.14, 0.14)
    this.cameras.main.setBounds(0, 0, this.mapW, this.mapH)
    this.cameras.main.setDeadzone(28, 28)

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
    const cancel = () => this.releaseTouches()
    this.game.canvas.addEventListener('pointercancel', cancel)
    this.game.canvas.addEventListener('touchcancel', cancel)

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
      }
    } else {
      this.keys = { w: off, a: off, s: off, d: off, up: off, left: off, down: off, right: off, shift: off, space: off, e: off }
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

    this.startedAt = this.time.now
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
    pb.setMaxVelocity(SPEED.run, SPEED.run)
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
    this.exitZone = this.add.rectangle(x, y, 150, 72, 0x1c3c2a, 0.55)
    this.exitZone.setStrokeStyle(2, 0xc9a227, 0.7)
    this.exitZone.setDepth(3)
    this.physics.add.existing(this.exitZone, true)
    exitFx.lineStyle(2, 0xc9a227, 0.55)
    exitFx.strokeRoundedRect(x - 76, y - 38, 152, 76, 8)
    exitFx.lineStyle(1, 0xe8d7a0, 0.35)
    exitFx.lineBetween(x, y - 34, x, y + 34)
    exitFx.fillStyle(0xc9a227, 0.8)
    exitFx.fillCircle(x - 18, y, 3)
    exitFx.fillCircle(x + 18, y, 3)
    this.exitLabel = this.add
      .text(x, y, heistT('heistExit'), {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '16px',
        color: '#e8d7a0',
      })
      .setOrigin(0.5)
      .setDepth(4)
  }

  private addLockedDoor(spec: (typeof MANSION_DOORS)[number]): LockedDoor {
    const body = this.addSolid(spec.x, spec.y, spec.w, spec.h, 'wall')
    body.setFillStyle(0x3a2414)
    const cx = spec.x + spec.w / 2
    const cy = spec.y + spec.h / 2
    const lock = this.add.graphics().setDepth(6)
    lock.fillStyle(0xc9a227, 0.85)
    lock.fillCircle(cx, cy, 6)
    lock.fillStyle(0x1a1410, 1)
    lock.fillCircle(cx, cy, 2.4)
    this.add
      .text(cx, cy - (spec.h > spec.w ? 0 : 18), heistT('heistLockpick'), {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '9px',
        color: '#ffe08a',
      })
      .setOrigin(0.5)
      .setDepth(7)
    return { id: spec.id, x: spec.x, y: spec.y, w: spec.w, h: spec.h, opened: false, body }
  }

  private rebuildNav() {
    this.nav = buildNavGrid(this.mapW, this.mapH, 24, this.wallRects, 22)
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
    this.doors = MANSION_DOORS.map((d) => this.addLockedDoor(d))
    for (const f of MANSION_FURNITURE) this.addSolid(f.x, f.y, f.w, f.h, f.kind)
    for (const h of MANSION_HIDES) this.addHide(h.x, h.y, h.w, h.h)
    this.paintHideMats()

    const g = this.add.graphics().setDepth(2)
    for (const [lx, ly] of MANSION_LAMPS) {
      g.fillStyle(0xc9a227, 0.07)
      g.fillCircle(lx, ly, 36)
      g.fillStyle(0x1a181e)
      g.fillCircle(lx, ly, 5)
      g.fillStyle(0xe8d7a0, 0.55)
      g.fillCircle(lx, ly, 2.4)
    }
    this.rebuildNav()

    this.safes = MANSION_SAFES.map((s) => ({
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

    this.placeExit(MANSION_EXIT.x, MANSION_EXIT.y)
    for (const lab of MANSION_LABELS) {
      this.add
        .text(lab.x, lab.y, heistT(lab.key), {
          fontFamily: 'Unbounded, sans-serif',
          fontSize: '10px',
          color: '#b49a62',
        })
        .setOrigin(0.5)
        .setDepth(4)
    }

    this.spawnDuckAt(MANSION_SPAWN.x, MANSION_SPAWN.y)

    const guardKey = this.tryCreateGuardAnims() ? 'guard_sheet' : 'guard'
    this.units = MANSION_GUARD_ROUTES.map((route) =>
      this.spawnGuard(
        route.map((p) => new Phaser.Math.Vector2(p.x, p.y)),
        0,
        guardKey,
      ),
    )

    this.cams = MANSION_CAMS.map((c) => this.makeCam(c.x, c.y, c.base, c.sweep, c.speed))

    this.lootGroup = this.physics.add.group()
    MANSION_LOOT.forEach((slot, i) => this.spawnLoot(slot.x, slot.y, slot.kind, i))

    this.physics.add.collider(this.player, this.walls)
    for (const u of this.units) this.physics.add.collider(u.sprite, this.walls)
    this.setupPlaySession()
  }

  private drawFloor() {
    this.add.tileSprite(W / 2, H / 2, W, H, 'floor_tile').setDepth(0)
    const g = this.add.graphics().setDepth(1)
    g.fillStyle(0x10141c, 0.32)
    g.fillRect(40, 40, 1680, 340)
    g.fillStyle(0x1a1612, 0.26)
    g.fillRect(40, 920, 520, 300)
    g.fillStyle(0x1a1218, 0.22)
    g.fillRoundedRect(280, 430, 1190, 450, 18)
    g.fillStyle(0xc9a227, 0.07)
    g.fillRoundedRect(648, 368, 344, 28, 4)
    g.fillStyle(0xc9a227, 0.05)
    g.fillCircle(860, 200, 210)
    g.fillCircle(700, 650, 190)
    g.fillCircle(148, 1108, 170)
    g.fillCircle(1188, 148, 120)
    g.fillStyle(0x000000, 0.18)
    g.fillRect(0, 0, W, 28)
    g.fillRect(0, H - 28, W, 28)
    g.fillRect(0, 0, 28, H)
    g.fillRect(W - 28, 0, 28, H)
  }

  private makeCam(x: number, y: number, base: number, sweep: number, speed: number): SecCam {
    const beamH = 2 * CAM_VISION * Math.tan(CAM_FOV / 2)
    const beam = this.add.image(x, y, 'cam_beam').setDepth(2)
    beam.setOrigin(0, 0.5)
    beam.setDisplaySize(CAM_VISION, beamH)
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

  private takeLoot(item: Phaser.Physics.Arcade.Sprite) {
    if (!item.active || item.getData('collected')) return
    const room = this.mods.bagCap - this.currentLoot
    if (room <= 0) return
    const value = Number(item.getData('value') || 0)
    const gained = Math.min(value, room)
    item.setData('collected', true)
    item.disableBody(true, false)
    this.currentLoot += gained
    heistSfx.pickup()
    const now = this.gameNow()
    this.combo = now - this.lastPickup < 3800 ? this.combo + 1 : 1
    this.maxCombo = Math.max(this.maxCombo, this.combo)
    this.lastPickup = now
    this.fx?.explode(8, item.x, item.y)
    this.floatGain(gained)
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

  private floatGain(gained: number) {
    const x = this.player.x
    const y = this.player.y - 18
    const label = this.add
      .text(x, y, heistT('heistSafeReward', { n: gained }), {
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '14px',
        color: '#ffe08a',
      })
      .setOrigin(0.5)
      .setDepth(16)
    this.tweens.add({
      targets: label,
      y: y - 42,
      alpha: 0,
      duration: 700,
      onComplete: () => label.destroy(),
    })
    if (this.currentLoot >= this.mods.bagCap) this.bagFullFlash = this.gameNow() + 900
  }

  private collectNearbyLoot() {
    const items = this.lootGroup.getChildren() as Phaser.Physics.Arcade.Sprite[]
    for (const item of items) {
      if (!item.active || item.getData('collected')) continue
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y) <= PICKUP_R) {
        this.takeLoot(item)
      }
    }
  }

  private inExit() {
    return Math.abs(this.player.x - this.exitZone.x) < this.exitZone.width / 2 && Math.abs(this.player.y - this.exitZone.y) < this.exitZone.height / 2
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

  update(_t: number, dtMs: number) {
    if (this.ended || !this.player) return
    if (this.paused) {
      this.syncHeistSfx()
      this.drawUi()
      return
    }
    const dt = Math.min(0.033, dtMs / 1000)
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
    }
    this.updateSafePrompt()
    this.updateCams(dt)
    for (const unit of this.units) this.updateGuard(unit, dt)
    this.updateAlert(dt)
    if (this.alert >= 0.7 || this.anyChase()) this.stealthBroken = true
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

  private hudBarWidth() {
    const pause = this.btnPause()
    const gap = 10
    return Math.min(340, Math.max(148, pause.x - pause.r - gap - 6))
  }
  private btnResume() {
    return { x: this.camW() / 2, y: this.camH() / 2 + 10, w: 220, h: 44 }
  }
  private btnAbort() {
    return { x: this.camW() / 2, y: this.camH() / 2 + 64, w: 220, h: 40 }
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
    if (this.paused) {
      this.pauseShift += this.time.now - this.pauseAt
      this.paused = false
      this.physics.resume()
    }
    this.finish('caught')
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
      heistSfx.safeStart()
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
      this.alert = Math.min(1, this.alert + SAFE_MISS_ALERT)
      heistSfx.safeFail()
    }
  }

  private openDoorReward() {
    this.safeCrack = false
    heistSfx.safeUnlock()
    const door = this.crackDoor
    this.crackDoor = null
    this.hitHeld = false
    this.doorOpenedAt = this.gameNow()
    if (!door || door.opened) return
    door.opened = true
    door.body.setAlpha(0.12)
    const body = door.body.body as Phaser.Physics.Arcade.StaticBody | null
    if (body) body.enable = false
    this.walls.remove(door.body)
    this.wallRects = this.wallRects.filter((r) => !(r.x === door.x && r.y === door.y && r.w === door.w && r.h === door.h))
    this.rebuildNav()
    this.fx?.explode(12, door.x + door.w / 2, door.y + door.h / 2)
  }

  private openSafeReward() {
    this.safeCrack = false
    heistSfx.safeUnlock()
    const spot = this.safes[this.crackI] ?? this.safes[0]
    if (spot) spot.opened = true
    this.safeOpened = true
    this.safeOpenedAt = this.gameNow()
    const room = Math.max(0, this.mods.bagCap - this.currentLoot)
    const gained = Math.min(spot?.reward ?? SAFE_REWARD, room)
    this.hitHeld = false
    this.currentLoot += gained
    if (gained > 0) this.floatGain(gained)
    else this.bagFullFlash = this.gameNow() + 900
    const sx = spot?.x ?? this.safePos.x
    const sy = spot?.y ?? this.safePos.y
    this.fx?.explode(18, sx, sy)
    if (spot?.extraKind) this.spawnLoot(spot.extraX, spot.extraY, spot.extraKind, 20 + this.crackI)
  }

  private spawnLoot(x: number, y: number, kind: LootKind, seed: number) {
    const def = coinDef(kind)
    const s = this.physics.add.sprite(x, y, def.key)
    applyCoinSpriteSize(s, def)
    s.setDepth(6)
    this.lootSpawn += 1
    s.setData('lootId', `loot-${this.lootSpawn}`)
    s.setData('value', def.value)
    s.setData('collected', false)
    const b = s.body as Phaser.Physics.Arcade.Body
    b.setAllowGravity(false)
    b.setImmovable(true)
    b.setCircle(20)
    this.lootGroup.add(s)
    playCoinIdle(this, s, seed)
  }

  private tryDash() {
    if (this.ended || this.paused) return
    const now = this.gameNow()
    if (now < this.dashReady) return
    this.dashUntil = now + DASH_MS
    this.dashReady = now + DASH_CD
  }

  private releaseTouches() {
    this.stick.active = false
    this.stick.id = -1
    this.stick.x = 0
    this.stick.y = 0
    this.sneakHeld = false
    this.sneakId = -1
    this.openHeld = false
    this.openId = -1
    this.hitHeld = false
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
    if (Phaser.Math.Distance.Between(x, y, dash.x, dash.y) < dash.r) {
      this.tryDash()
      return
    }
    if (Phaser.Math.Distance.Between(x, y, sneak.x, sneak.y) < sneak.r) {
      this.sneakHeld = true
      this.sneakId = p.id
      return
    }
    if (x < w * 0.52 && y > h * 0.32 && !this.stick.active) {
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
    this.player.setDisplaySize(DUCK_DISPLAY, DUCK_DISPLAY)
    const pb = this.player.body as Phaser.Physics.Arcade.Body | undefined
    if (!pb) return
    const k = DUCK_HITBOX_FROM / DUCK_DISPLAY
    pb.setSize(DUCK_BODY_W * k, DUCK_BODY_H * k, false)
    pb.setOffset((this.player.width / 2 - DUCK_BODY_W / 2) * k, (this.player.height / 2 - 8) * k)
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
    const now = this.gameNow()
    const space = this.keys.space
    const spaceTap = 'justDown' in space ? Phaser.Input.Keyboard.JustDown(space as Phaser.Input.Keyboard.Key) : false
    if (spaceTap) this.tryDash()
    const sneaking = this.sneakHeld || this.keys.shift.isDown || this.winKeys.shift || this.hidden
    const dashing = now < this.dashUntil
    let spd = 0
    let vx = jx
    let vy = jy
    if (dashing) {
      this.setMoveAnim('dash')
      spd = SPEED.dash
      this.noise = this.noiseOf('dash')
      if (!moving) {
        vx = this.facing.x
        vy = this.facing.y
      }
    } else if ((moving || sneaking) && sneaking && moving) {
      this.setMoveAnim('sneak')
      spd = this.hidden ? SPEED.sneak * 0.82 : SPEED.sneak
      this.noise = this.noiseOf('sneak')
    } else if (moving && mag < 0.55) {
      this.setMoveAnim('walk')
      spd = SPEED.run * 0.72 * this.mods.speedMul
      this.noise = this.noiseOf('walk')
    } else if (moving) {
      this.setMoveAnim('run')
      spd = SPEED.run * this.mods.speedMul
      this.noise = this.noiseOf('run')
    } else {
      this.setMoveAnim('idle')
      this.noise = 0
    }
    this.noiseR = this.noise * 2.15
    const body = this.player.body as Phaser.Physics.Arcade.Body
    if (dashing || moving) {
      this.facing.set(vx, vy).normalize()
      body.setMaxVelocity(spd, spd)
      body.setVelocity(vx * spd, vy * spd)
    } else {
      body.setVelocity(0, 0)
    }
    this.player.setFlipX(this.facing.x < 0)
    void dt
  }

  private noiseOf(mode: 'sneak' | 'run' | 'dash' | 'walk') {
    const base = mode === 'walk' ? 22 : NOISE[mode]
    return this.mods.silentShoes ? base * 0.65 : base
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
    return this.coneSees(u.sprite.x, u.sprite.y, u.facing, GUARD_VISION * this.mods.disguiseMul, GUARD_FOV)
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
    if (s === 'CHASE' && prev !== 'CHASE') heistSfx.chaseStart()
    else if (prev === 'CHASE' && s !== 'CHASE' && !this.anyChase()) heistSfx.chaseStop()
    else if (s === 'INVESTIGATE' && (prev === 'PATROL' || prev === 'RETURN')) heistSfx.investigateStart()
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
    for (const cam of this.cams) {
      cam.facing = cam.base + Math.sin(this.gameNow() / 1000 * cam.speed) * cam.sweep
      cam.sprite.setRotation(cam.facing)
      cam.beam.setRotation(cam.facing)
      cam.beam.setPosition(cam.x, cam.y)
      cam.beam.setTint(cam.hot ? 0xffd2a8 : 0xffffff)
      cam.beam.setAlpha(cam.hot ? 1 : 0.82)
      const seen = this.coneSees(cam.x, cam.y, cam.facing, CAM_VISION * this.mods.disguiseMul, CAM_FOV)
      const hot = seen && !this.hidden
      if (hot && !cam.hot) heistSfx.cameraAlert()
      cam.hot = hot
      cam.led.setPosition(cam.x + Math.cos(cam.facing) * 11, cam.y + Math.sin(cam.facing) * 11)
      cam.led.setFillStyle(cam.hot ? 0xffe08a : 0xc9a227, cam.hot ? 1 : 0.85)
      if (hot) {
        this.camSees = true
        this.alert = Math.min(1, this.alert + dt * 0.42 * this.mods.disguiseMul)
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

    if (u.state === 'PATROL') {
      const wp = u.waypoints[u.wi]
      const d = this.followTo(u, wp.x, wp.y, 86, dt)
      if (d < 18) {
        u.wi = (u.wi + 1) % u.waypoints.length
        u.path = []
      }
    } else if (u.state === 'INVESTIGATE') {
      if (this.followTo(u, u.lastSeen.x, u.lastSeen.y, 118, dt) < 18) this.setG(u, 'SEARCH')
    } else if (u.state === 'CHASE') {
      const targetX = seen ? this.player.x : u.lastSeen.x
      const targetY = seen ? this.player.y : u.lastSeen.y
      this.followTo(u, targetX, targetY, 168, dt)
      if (Phaser.Math.Distance.Between(u.sprite.x, u.sprite.y, this.player.x, this.player.y) < 28) {
        this.finish('caught')
      } else if (!seen && Phaser.Math.Distance.Between(u.sprite.x, u.sprite.y, u.lastSeen.x, u.lastSeen.y) < 22) {
        this.setG(u, 'SEARCH')
      }
    } else if (u.state === 'SEARCH') {
      u.searchT -= dt
      const pt = u.searchPts[u.searchI] ?? u.lastSeen
      if (this.followTo(u, pt.x, pt.y, 86, dt) < 18) {
        u.searchI = (u.searchI + 1) % Math.max(1, u.searchPts.length)
        u.path = []
      }
      if (u.searchT <= 0) this.resumePatrol(u)
    } else if (u.state === 'RETURN') {
      const wp = u.waypoints[u.wi]
      if (this.followTo(u, wp.x, wp.y, 96, dt) < 18) {
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

  private updateAlert(dt: number) {
    if (this.anyChase()) {
      this.alert = Math.min(1, Math.max(this.alert, 0.95))
      return
    }
    if (this.units.some((u) => this.seesPlayer(u))) {
      this.alert = Math.min(1, this.alert + dt * (0.32 + this.maxDetect() * 0.4) * this.mods.disguiseMul)
      return
    }
    if (this.camSees) return
    if (this.units.some((u) => this.hearsPlayer(u))) {
      this.alert = Math.min(1, Math.max(this.alert, 0.22))
      return
    }
    this.alert = Math.max(0, this.alert - dt * (this.hidden ? 0.14 : 0.055))
  }

  private finish(verdict: HeistEnd['verdict']) {
    if (this.ended) return
    this.ended = true
    if (verdict === 'escaped') heistSfx.exit()
    else heistSfx.caught()
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
    const coins = this.currentLoot
    const timeMs = this.gameNow() - this.startedAt
    const bonus = verdict === 'escaped' && this.alert < 0.3 && coins > 0 ? Math.max(5, Math.floor(coins * 0.1)) : 0
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
        GUARD_VISION * this.mods.disguiseMul,
        GUARD_FOV,
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
    this.uiGfx.fillRoundedRect(6, 4, barW, 44, 8)
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
    if (cooling) {
      const t = 1 - (this.dashReady - now) / (DASH_CD - DASH_MS)
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

    const a = Math.round(this.alert * 100)
    const band =
      a < 30
        ? heistT('heistHudSafe')
        : a < 70
          ? heistT('heistHudSuspicious')
          : a < 100 && !this.anyChase()
            ? heistT('heistHudDanger')
            : heistT('heistHudChase')
    const color = a < 30 ? '#b6e3b0' : a < 70 ? '#ffe08a' : '#ff8a6a'
    const full = this.currentLoot >= this.mods.bagCap || this.gameNow() < this.bagFullFlash
    this.hud.setColor(full ? '#ffb070' : '#ffe08a')
    this.hud.setText(
      `${heistT('heistDuckCoin')} ${this.currentLoot}${full ? `   ${heistT('heistBagFull')}` : ''}`,
    )
    this.bagHud.setColor(color)
    const escape = this.escaping ? `    ${heistT('heistEscape')}` : ''
    this.bagHud.setText(
      `${heistT('heistBag')} ${this.currentLoot}/${this.mods.bagCap}    ${heistT('heistAlert')} ${a}% ${band}    ${heistT('heistTime')} ${formatClock(now - this.startedAt)}${escape}`,
    )
    this.drawObjectives(now - this.startedAt)
    this.exitLabel?.setText(heistT('heistExit'))
    if (this.levelId !== 'mansion') {
      this.lobbyLabel?.setText(heistT('heistRoomLobby'))
      this.vaultLabel?.setText(heistT('heistRoomVault'))
    }
    this.safeTitle?.setText(heistT('heistSafeName'))
    this.sneakLabel?.setText(heistT('heistSneak'))
    this.dashLabel?.setText(heistT('heistDash'))
    if (this.safeCrack) {
      this.crackHud.setVisible(true)
      const hits = this.crackKind === 'door' ? DOOR_HITS : SAFE_HITS
      const title = this.crackKind === 'door' ? heistT('heistDoorCrackTitle') : heistT('heistCrackTitle')
      this.crackHud.setText(`${title}\n${heistT('heistRound', { n: Math.min(this.safeHits + 1, hits), total: hits })}`)
      this.crackHint.setVisible(true)
      this.crackHint.setText(heistT('heistHitHint'))
    } else if (this.safeOpened && now - this.safeOpenedAt < 1800) {
      this.crackHud.setVisible(true)
      this.crackHud.setPosition(this.camW() / 2, 46)
      const reward = this.safes[this.crackI]?.reward ?? SAFE_REWARD
      this.crackHud.setText(`${heistT('heistSafeOpenedTitle')}\n${heistT('heistSafeReward', { n: reward })}`)
      this.crackHint.setVisible(false)
    } else if (this.doorOpenedAt > 0 && now - this.doorOpenedAt < 1400) {
      this.crackHud.setVisible(true)
      this.crackHud.setPosition(this.camW() / 2, 46)
      this.crackHud.setText(heistT('heistDoorOpened'))
      this.crackHint.setVisible(false)
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
    const loot = this.currentLoot >= this.objLoot
    const stealth = !this.stealthBroken
    const speed = elapsedMs < this.objTimeS * 1000
    const mark = (ok: boolean) => (ok ? '✓' : '□')
    const w = Math.min(148, Math.max(120, this.camW() - 88))
    this.uiGfx.fillStyle(0x080604, 0.5)
    this.uiGfx.fillRoundedRect(6, 50, w, 58, 8)
    this.objHud.setPosition(12, 53)
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
    this.pauseGfx.fillStyle(0x050308, 0.72)
    this.pauseGfx.fillRect(0, 0, w, h)
    this.pauseGfx.fillStyle(0x120c10, 0.96)
    this.pauseGfx.fillRoundedRect(w / 2 - 130, h / 2 - 92, 260, 196, 16)
    this.pauseGfx.lineStyle(2, 0xc9a227, 0.85)
    this.pauseGfx.strokeRoundedRect(w / 2 - 130, h / 2 - 92, 260, 196, 16)
    const resume = this.btnResume()
    const abort = this.btnAbort()
    this.pauseGfx.fillStyle(0xc9a227, 1)
    this.pauseGfx.fillRoundedRect(resume.x - resume.w / 2, resume.y - resume.h / 2, resume.w, resume.h, 10)
    this.pauseGfx.fillStyle(0x1a1410, 1)
    this.pauseGfx.fillRoundedRect(abort.x - abort.w / 2, abort.y - abort.h / 2, abort.w, abort.h, 10)
    this.pauseGfx.lineStyle(2, 0xc9a227, 0.7)
    this.pauseGfx.strokeRoundedRect(abort.x - abort.w / 2, abort.y - abort.h / 2, abort.w, abort.h, 10)
    this.pauseTitle.setText(heistT('heistPaused'))
    this.pauseTitle.setPosition(w / 2, h / 2 - 52)
    this.pauseTitle.setVisible(true)
    this.pauseResumeLbl.setText(heistT('heistResume'))
    this.pauseResumeLbl.setPosition(resume.x, resume.y)
    this.pauseResumeLbl.setVisible(true)
    this.pauseAbortLbl.setText(heistT('heistAbortRaid'))
    this.pauseAbortLbl.setPosition(abort.x, abort.y)
    this.pauseAbortLbl.setVisible(true)
  }
}
