import Phaser from 'phaser'
import { punchBackdrop } from '../sprite'
import type { HeistEnd } from '../types'
import type { HeistRunMods } from '../progress'
import { applyCoinSpriteSize, coinDef, ensureCoinPlaceholders, loadDuckCoinImages, playCoinIdle, stopCoinIdle, SAFE_REWARD, type DuckCoinKind } from '../coinAssets'
import { heistT } from '../heistI18n'
import { buildNavGrid, cellCenter, findPath, findPathAroundStuck, nearestWalkable, type NavGrid } from '../guardPath'

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
type MoveAnim = 'idle' | 'walk' | 'run' | 'sneak' | 'dash'
type LootKind = DuckCoinKind
const SAFE_RANGE = 86
const SAFE_MISS_ALERT = 0.2
const SAFE_HITS = 3

type Wall = { x: number; y: number; w: number; h: number }
type HideZone = Wall
type SolidKind = 'wall' | 'desk' | 'column' | 'cabinet'
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
  private player!: Phaser.Physics.Arcade.Sprite
  private duckAnimsReady = false
  private guard!: Phaser.Physics.Arcade.Sprite
  private walls!: Phaser.Physics.Arcade.StaticGroup
  private wallRects: Wall[] = []
  private hideZones: HideZone[] = []
  private lootGroup!: Phaser.Physics.Arcade.Group
  private exitZone!: Phaser.GameObjects.Rectangle
  private visionGfx!: Phaser.GameObjects.Graphics
  private worldGfx!: Phaser.GameObjects.Graphics
  private uiGfx!: Phaser.GameObjects.Graphics
  private hud!: Phaser.GameObjects.Text
  private bagHud!: Phaser.GameObjects.Text
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
  private detect = 0
  private hidden = false
  private ended = false
  private startedAt = 0
  private combo = 0
  private maxCombo = 0
  private lastPickup = 0
  private cams: SecCam[] = []
  private safePos = new Phaser.Math.Vector2(1188, 148)
  private safeOpened = false
  private safeCrack = false
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

  private gState: GuardState = 'PATROL'
  private gWaypoints: Phaser.Math.Vector2[] = []
  private gWi = 0
  private gSearchT = 0
  private gSearchPts: Phaser.Math.Vector2[] = []
  private gSearchI = 0
  private gLastSeen = new Phaser.Math.Vector2()
  private gFacing = 0
  private nav!: NavGrid
  private gPath: Phaser.Math.Vector2[] = []
  private gPathDest = new Phaser.Math.Vector2()
  private gRepathAt = 0
  private gStuckT = 0
  private gStuckTries = 0
  private gLastPos = new Phaser.Math.Vector2()

  constructor(onDone: (end: HeistEnd) => void, mods: HeistRunMods) {
    super('HeistScene')
    this.onDone = onDone
    this.mods = mods
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
    ctx.fillStyle = '#15131a'
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 48; i += 1) {
      const x = (i * 53) % s
      const y = (i * 97) % s
      const rad = 16 + (i % 7) * 7
      const grad = ctx.createRadialGradient(x, y, 0, x, y, rad)
      grad.addColorStop(0, i % 2 === 0 ? 'rgba(36,32,44,0.5)' : 'rgba(10,8,14,0.45)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(x, y, rad, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(201,162,39,0.028)'
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

  private buildSafe() {
    const x = this.safePos.x
    const y = this.safePos.y
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
    this.cameras.main.setBackgroundColor(0x0c0a10)
    this.physics.world.setBounds(0, 0, W, H)
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

    this.gWaypoints = [
      new Phaser.Math.Vector2(300, 490),
      new Phaser.Math.Vector2(800, 240),
      new Phaser.Math.Vector2(1580, 490),
      new Phaser.Math.Vector2(1580, 780),
      new Phaser.Math.Vector2(800, 820),
      new Phaser.Math.Vector2(500, 1080),
      new Phaser.Math.Vector2(150, 760),
    ]
    this.gWi = 1
    const guardKey = this.tryCreateGuardAnims() ? 'guard_sheet' : 'guard'
    this.guard = this.physics.add.sprite(this.gWaypoints[0].x, this.gWaypoints[0].y, guardKey, guardKey === 'guard_sheet' ? 0 : undefined)
    this.guard.setOrigin(0.5, 0.5)
    this.guard.setDisplaySize(GUARD_DISPLAY, GUARD_DISPLAY)
    this.guard.setDepth(11)
    const gb = this.guard.body as Phaser.Physics.Arcade.Body
    gb.setAllowGravity(false)
    gb.setDamping(false)
    gb.setDrag(0, 0)
    gb.setMaxVelocity(220, 220)
    gb.setSize(16, 16)
    gb.setOffset(this.guard.width / 2 - 8, this.guard.height / 2 - 8)
    this.gFacing = 0
    this.gLastPos.set(this.guard.x, this.guard.y)
    if (this.anims.exists('guard-idle')) this.guard.play('guard-idle')

    this.cams = [
      this.makeCam(700, 430, Math.PI / 2, 0.85, 0.55),
      this.makeCam(1320, 70, Math.PI / 2, 0.7, 0.62),
      this.makeCam(1588, 560, Math.PI, 0.9, 0.48),
    ]

    this.lootGroup = this.physics.add.group()
    const slots: [number, number, LootKind][] = [
      [300, 1080, 'C10'],
      [200, 1120, 'C10'],
      [120, 760, 'C50'],
      [400, 660, 'C50'],
      [860, 800, 'C50'],
      [1620, 760, 'C50'],
      [120, 250, 'C100'],
      [720, 240, 'C100'],
      [1020, 220, 'C100'],
    ]
    slots.forEach(([sx, sy, kind], i) => {
      const def = coinDef(kind)
      const x = Phaser.Math.Clamp(jitter(sx, 22), 70, W - 70)
      const y = Phaser.Math.Clamp(jitter(sy, 16), 70, H - 70)
      const s = this.physics.add.sprite(x, y, def.key)
      applyCoinSpriteSize(s, def)
      s.setDepth(6)
      s.setData('lootId', `loot-${i}`)
      s.setData('value', def.value)
      s.setData('collected', false)
      const b = s.body as Phaser.Physics.Arcade.Body
      b.setAllowGravity(false)
      b.setImmovable(true)
      b.setCircle(20)
      this.lootGroup.add(s)
      playCoinIdle(this, s, i)
    })

    this.physics.add.collider(this.player, this.walls)
    this.physics.add.collider(this.guard, this.walls)

    this.worldGfx = this.add.graphics().setDepth(10)
    this.visionGfx = this.add.graphics().setDepth(2)
    this.uiGfx = this.add.graphics().setScrollFactor(0).setDepth(20)
    this.hud = this.add
      .text(12, 8, '', { fontFamily: 'Unbounded, sans-serif', fontSize: '12px', color: '#f3e6c4' })
      .setScrollFactor(0)
      .setDepth(21)
    this.bagHud = this.add
      .text(12, 26, '', { fontFamily: 'Unbounded, sans-serif', fontSize: '12px', color: '#f3e6c4' })
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
    this.cameras.main.setBounds(0, 0, W, H)
    this.cameras.main.setDeadzone(28, 28)

    this.input.addPointer(3)
    this.input.setTopOnly(false)
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p))
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p))
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.onUp(p))
    this.input.on('gameout', () => this.releaseTouches())
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
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
    const now = this.time.now
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
    if (this.currentLoot >= this.mods.bagCap) this.bagFullFlash = this.time.now + 900
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
    this.updateGuard(dt)
    this.updateAlert(dt)
    this.drawWorldFx()
    this.drawUi()
  }

  private camH() {
    return this.scale.height
  }
  private camW() {
    return this.scale.width
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
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, this.safePos.x, this.safePos.y) <= SAFE_RANGE
  }

  private updateSafePrompt() {
    if (!this.safePrompt || !this.openLabel) return
    const btn = this.btnOpen()
    this.openLabel.setPosition(btn.x, btn.y)
    if (this.safeOpened) {
      this.safePrompt.setText(heistT('heistSafeOpenedTitle'))
      this.safePrompt.setColor('#b6e3b0')
      this.openLabel.setVisible(false)
      this.hitHeld = false
      return
    }
    if (this.safeCrack) {
      this.safePrompt.setText('')
      this.openLabel.setText(heistT('heistHit'))
      this.openLabel.setVisible(true)
      return
    }
    const show = this.nearSafe()
    this.safePrompt.setText(show ? heistT('heistSafeName') : '')
    this.safePrompt.setColor('#ffe08a')
    this.openLabel.setText(heistT('heistOpen'))
    this.openLabel.setVisible(show)
    if (show && (this.openHeld || this.winKeys.e || this.keys.e.isDown)) this.tryOpenSafe()
  }

  private tryOpenSafe() {
    if (this.ended || this.safeOpened || this.safeCrack || !this.nearSafe()) return
    this.safeCrack = true
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
    if (!this.safeCrack || this.ended) return
    if (this.time.now < this.safeHitLock) return
    this.safeHitLock = this.time.now + 220
    const zone = this.safeZone()
    if (Math.abs(this.safeMarker - zone.center) <= zone.width / 2) {
      this.safeHits += 1
      if (this.safeHits >= SAFE_HITS) this.openSafeReward()
    } else {
      this.alert = Math.min(1, this.alert + SAFE_MISS_ALERT)
    }
  }

  private openSafeReward() {
    this.safeCrack = false
    this.safeOpened = true
    this.safeOpenedAt = this.time.now
    const room = Math.max(0, this.mods.bagCap - this.currentLoot)
    const gained = Math.min(SAFE_REWARD, room)
    this.hitHeld = false
    this.currentLoot += gained
    if (gained > 0) this.floatGain(gained)
    else this.bagFullFlash = this.time.now + 900
    this.fx?.explode(18, this.safePos.x, this.safePos.y)
  }

  private tryDash() {
    if (this.ended) return
    const now = this.time.now
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
    if (this.ended) return
    const x = p.x
    const y = p.y
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
    if (this.nearSafe() && !this.safeOpened && Phaser.Math.Distance.Between(x, y, open.x, open.y) < open.r) {
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
    const now = this.time.now
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
      spd = SPEED.run * 0.72
      this.noise = this.noiseOf('walk')
    } else if (moving) {
      this.setMoveAnim('run')
      spd = SPEED.run
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
    if (!this.mods.silentShoes) {
      if (mode === 'walk') return 22
      return NOISE[mode]
    }
    if (mode === 'sneak') return 5
    if (mode === 'run') return 20
    if (mode === 'dash') return 60
    return 12
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

  private seesPlayer() {
    return this.coneSees(this.guard.x, this.guard.y, this.gFacing, GUARD_VISION, GUARD_FOV)
  }

  private hearsPlayer() {
    const dist = Phaser.Math.Distance.Between(this.guard.x, this.guard.y, this.player.x, this.player.y)
    return this.noiseR > 8 && dist < this.noiseR + 36
  }

  private setG(s: GuardState) {
    if (this.gState === s) return
    this.gState = s
    this.gPath = []
    this.gRepathAt = 0
    this.gStuckTries = 0
    if (s === 'SEARCH') {
      this.gSearchT = 5.2
      this.gSearchI = 0
      this.gSearchPts = this.makeSearchPts()
    }
  }

  private makeSearchPts() {
    const origin = this.gLastSeen
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

  private resumePatrol() {
    let best = 0
    let bestD = Number.POSITIVE_INFINITY
    this.gWaypoints.forEach((wp, i) => {
      const d = Phaser.Math.Distance.Between(this.guard.x, this.guard.y, wp.x, wp.y)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    this.gWi = best
    this.setG('RETURN')
  }

  private steerGuard(tx: number, ty: number, speed: number) {
    const dx = tx - this.guard.x
    const dy = ty - this.guard.y
    const dist = Math.max(0.001, Math.hypot(dx, dy))
    const body = this.guard.body as Phaser.Physics.Arcade.Body
    this.gFacing = Math.atan2(dy, dx)
    body.setMaxVelocity(speed, speed)
    body.setVelocity((dx / dist) * speed, (dy / dist) * speed)
    return dist
  }

  private followTo(tx: number, ty: number, speed: number, dt: number) {
    const gx = this.guard.x
    const gy = this.guard.y
    const distGoal = Phaser.Math.Distance.Between(gx, gy, tx, ty)
    const body = this.guard.body as Phaser.Physics.Arcade.Body
    if (distGoal < 18) {
      this.gPath = []
      body.setVelocity(0, 0)
      this.gStuckT = 0
      this.gStuckTries = 0
      this.gLastPos.set(gx, gy)
      return distGoal
    }

    const now = this.time.now
    const destMoved = Phaser.Math.Distance.Between(this.gPathDest.x, this.gPathDest.y, tx, ty) > 48
    const chase = this.gState === 'CHASE'
    const repathDue =
      this.gPath.length === 0 || destMoved || (chase && now >= this.gRepathAt) || this.gStuckT > 0.7
    if (repathDue) {
      const raw =
        this.gStuckTries > 0
          ? findPathAroundStuck(this.nav, gx, gy, tx, ty, this.gStuckTries)
          : findPath(this.nav, gx, gy, tx, ty)
      this.gPath = raw ? raw.map((p) => new Phaser.Math.Vector2(p.x, p.y)) : []
      this.gPathDest.set(tx, ty)
      this.gRepathAt = now + (chase ? 280 : 1e9)
      if (this.gStuckT > 0.7) {
        this.gStuckT = 0
        this.gStuckTries += 1
      }
    }

    while (this.gPath.length && Phaser.Math.Distance.Between(gx, gy, this.gPath[0].x, this.gPath[0].y) < 12) {
      this.gPath.shift()
    }

    const moved = Phaser.Math.Distance.Between(this.gLastPos.x, this.gLastPos.y, gx, gy)
    this.gLastPos.set(gx, gy)
    if (moved < 1.2 && distGoal > 22) this.gStuckT += dt
    else {
      this.gStuckT = 0
      this.gStuckTries = 0
    }

    const next = this.gPath[0]
    if (next) this.steerGuard(next.x, next.y, speed)
    else this.steerGuard(tx, ty, speed)
    return distGoal
  }

  private updateCams(dt: number) {
    this.camSees = false
    for (const cam of this.cams) {
      cam.facing = cam.base + Math.sin(this.time.now / 1000 * cam.speed) * cam.sweep
      cam.sprite.setRotation(cam.facing)
      cam.beam.setRotation(cam.facing)
      cam.beam.setPosition(cam.x, cam.y)
      cam.beam.setTint(cam.hot ? 0xffd2a8 : 0xffffff)
      cam.beam.setAlpha(cam.hot ? 1 : 0.82)
      const seen = this.coneSees(cam.x, cam.y, cam.facing, CAM_VISION, CAM_FOV)
      cam.hot = seen && !this.hidden
      cam.led.setPosition(cam.x + Math.cos(cam.facing) * 11, cam.y + Math.sin(cam.facing) * 11)
      cam.led.setFillStyle(cam.hot ? 0xffe08a : 0xc9a227, cam.hot ? 1 : 0.85)
      if (seen && !this.hidden) {
        this.camSees = true
        this.alert = Math.min(1, this.alert + dt * 0.42 * this.mods.disguiseMul)
        this.gLastSeen.set(this.player.x, this.player.y)
        if (this.gState === 'PATROL' || this.gState === 'RETURN') this.setG('INVESTIGATE')
        if (this.alert >= 1 && this.gState !== 'CHASE') this.setG('CHASE')
      }
    }
  }

  private updateGuard(dt: number) {
    const seen = this.seesPlayer()
    const hideMul = this.hidden ? 0.22 : 1
    if (seen) {
      this.gLastSeen.set(this.player.x, this.player.y)
      this.detect = Math.min(1, this.detect + dt * (1.05 + this.noise / 90) * hideMul * this.mods.disguiseMul)
      if (this.detect >= 1 || this.gState === 'SEARCH' || this.gState === 'CHASE') this.setG('CHASE')
      else if (this.gState === 'PATROL' || this.gState === 'RETURN') this.setG('INVESTIGATE')
    } else if (this.gState !== 'CHASE') {
      this.detect = Math.max(0, this.detect - dt * 0.32)
    }
    if (!seen && this.hearsPlayer() && this.gState !== 'CHASE') {
      this.gLastSeen.set(this.player.x, this.player.y)
      this.setG('INVESTIGATE')
    }
    if (this.alert >= 1 && this.gState !== 'CHASE') {
      this.setG('CHASE')
    }

    if (this.gState === 'PATROL') {
      const wp = this.gWaypoints[this.gWi]
      const d = this.followTo(wp.x, wp.y, 86, dt)
      if (d < 18) {
        this.gWi = (this.gWi + 1) % this.gWaypoints.length
        this.gPath = []
      }
    } else if (this.gState === 'INVESTIGATE') {
      if (this.followTo(this.gLastSeen.x, this.gLastSeen.y, 118, dt) < 18) this.setG('SEARCH')
    } else if (this.gState === 'CHASE') {
      const targetX = seen ? this.player.x : this.gLastSeen.x
      const targetY = seen ? this.player.y : this.gLastSeen.y
      this.followTo(targetX, targetY, 168, dt)
      if (Phaser.Math.Distance.Between(this.guard.x, this.guard.y, this.player.x, this.player.y) < 28) {
        this.finish('caught')
      } else if (
        !seen &&
        Phaser.Math.Distance.Between(this.guard.x, this.guard.y, this.gLastSeen.x, this.gLastSeen.y) < 22
      ) {
        this.setG('SEARCH')
      }
    } else if (this.gState === 'SEARCH') {
      this.gSearchT -= dt
      const pt = this.gSearchPts[this.gSearchI] ?? this.gLastSeen
      if (this.followTo(pt.x, pt.y, 86, dt) < 18) {
        this.gSearchI = (this.gSearchI + 1) % Math.max(1, this.gSearchPts.length)
        this.gPath = []
      }
      if (this.gSearchT <= 0) this.resumePatrol()
    } else if (this.gState === 'RETURN') {
      const wp = this.gWaypoints[this.gWi]
      if (this.followTo(wp.x, wp.y, 96, dt) < 18) {
        this.gWi = (this.gWi + 1) % this.gWaypoints.length
        this.setG('PATROL')
      }
    }
    this.syncGuardAnim()
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

  private syncGuardAnim() {
    if (!this.guard?.active) return
    const body = this.guard.body as Phaser.Physics.Arcade.Body
    const moving = Math.hypot(body.velocity.x, body.velocity.y) > 10
    let key = 'guard-idle'
    if (moving) {
      key = this.gState === 'CHASE' ? 'guard-run' : 'guard-walk'
    }
    if (!this.anims.exists(key)) return
    if (this.guard.anims.currentAnim?.key !== key) this.guard.play(key, true)
    const vx = body.velocity.x
    if (Math.abs(vx) > 6) this.guard.setFlipX(vx < 0)
    else if (Math.abs(Math.cos(this.gFacing)) > 0.2) this.guard.setFlipX(Math.cos(this.gFacing) < 0)
  }

  private updateAlert(dt: number) {
    if (this.gState === 'CHASE') {
      this.alert = Math.min(1, Math.max(this.alert, 0.95))
      return
    }
    if (this.seesPlayer()) {
      this.alert = Math.min(1, this.alert + dt * (0.32 + this.detect * 0.4) * this.mods.disguiseMul)
      return
    }
    if (this.camSees) return
    if (this.hearsPlayer()) {
      this.alert = Math.min(1, Math.max(this.alert, 0.22))
      return
    }
    this.alert = Math.max(0, this.alert - dt * (this.hidden ? 0.14 : 0.055))
  }

  private finish(verdict: HeistEnd['verdict']) {
    if (this.ended) return
    this.ended = true
    this.releaseTouches()
    this.input.enabled = false
    const body = this.player.body as Phaser.Physics.Arcade.Body
    body.setVelocity(0, 0)
    body.setAcceleration(0, 0)
    const gb = this.guard.body as Phaser.Physics.Arcade.Body
    gb.setVelocity(0, 0)
    gb.setAcceleration(0, 0)
    this.physics.pause()
    const coins = this.currentLoot
    const timeMs = this.time.now - this.startedAt
    const bonus = verdict === 'escaped' && this.alert < 0.3 && coins > 0 ? Math.max(5, Math.floor(coins * 0.1)) : 0
    this.onDone({
      verdict,
      coins,
      bonus,
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
    const hot = this.gState === 'CHASE' || this.detect > 0.5
    this.drawCone(
      this.guard.x,
      this.guard.y,
      this.gFacing,
      GUARD_VISION,
      GUARD_FOV,
      hot ? 0xc45a3a : 0xc9a227,
      hot ? 0.12 : 0.07,
      hot ? 0xff8a6a : 0xe8c36a,
    )
    this.worldGfx.clear()
    this.worldGfx.fillStyle(0x000000, 0.32)
    this.worldGfx.fillEllipse(this.player.x, this.player.y + 16, 30, 12)
    this.worldGfx.fillEllipse(this.guard.x, this.guard.y + 12, 20, 10)
  }

  private drawUi() {
    const h = this.camH()
    this.uiGfx.clear()
    this.uiGfx.fillStyle(0x080604, 0.55)
    this.uiGfx.fillRoundedRect(6, 4, Math.min(this.camW() - 12, 360), 44, 8)
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
    const now = this.time.now
    const cooling = now < this.dashReady && now >= this.dashUntil
    this.uiGfx.fillStyle(now < this.dashUntil ? 0xff6a4a : cooling ? 0x2a2018 : 0x1a1410, 0.82)
    this.uiGfx.fillCircle(dash.x, dash.y, 38)
    this.uiGfx.strokeCircle(dash.x, dash.y, 38)
    const showOpen = this.nearSafe() && !this.safeOpened && !this.safeCrack
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
          : a < 100 && this.gState !== 'CHASE'
            ? heistT('heistHudDanger')
            : heistT('heistHudChase')
    const color = a < 30 ? '#b6e3b0' : a < 70 ? '#ffe08a' : '#ff8a6a'
    const full = this.currentLoot >= this.mods.bagCap || this.time.now < this.bagFullFlash
    this.hud.setColor(full ? '#ffb070' : '#ffe08a')
    this.hud.setText(
      `${heistT('heistDuckCoin')} ${this.currentLoot}${full ? `   ${heistT('heistBagFull')}` : ''}`,
    )
    this.bagHud.setColor(color)
    const escape = this.escaping ? `    ${heistT('heistEscape')}` : ''
    this.bagHud.setText(
      `${heistT('heistBag')} ${this.currentLoot}/${this.mods.bagCap}    ${heistT('heistAlert')} ${a}% ${band}    ${heistT('heistTime')} ${formatClock(now - this.startedAt)}${escape}`,
    )
    this.exitLabel?.setText(heistT('heistExit'))
    this.lobbyLabel?.setText(heistT('heistRoomLobby'))
    this.vaultLabel?.setText(heistT('heistRoomVault'))
    this.safeTitle?.setText(heistT('heistSafeName'))
    this.sneakLabel?.setText(heistT('heistSneak'))
    this.dashLabel?.setText(heistT('heistDash'))
    if (this.safeCrack) {
      this.crackHud.setVisible(true)
      this.crackHud.setText(
        `${heistT('heistCrackTitle')}\n${heistT('heistRound', { n: Math.min(this.safeHits + 1, SAFE_HITS), total: SAFE_HITS })}`,
      )
      this.crackHint.setVisible(true)
      this.crackHint.setText(heistT('heistHitHint'))
    } else if (this.safeOpened && now - this.safeOpenedAt < 1800) {
      this.crackHud.setVisible(true)
      this.crackHud.setPosition(this.camW() / 2, 46)
      this.crackHud.setText(`${heistT('heistSafeOpenedTitle')}\n${heistT('heistSafeReward', { n: SAFE_REWARD })}`)
      this.crackHint.setVisible(false)
    } else {
      this.crackHud.setVisible(false)
      this.crackHint.setVisible(false)
    }
  }
}
