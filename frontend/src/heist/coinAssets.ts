import type Phaser from 'phaser'

export type DuckCoinKind = 'C5' | 'C10' | 'C50' | 'C100'

export type DuckCoinDef = {
  kind: DuckCoinKind
  value: 5 | 10 | 50 | 100
  /** Phaser texture key. Load a real sprite with this same key to replace the placeholder. */
  key: string
  size: number
  file?: string
}

export const DUCK_COIN_DEFS: DuckCoinDef[] = [
  { kind: 'C5', value: 5, key: 'dc_5', size: 34, file: '/heist/coin_5.png' },
  { kind: 'C10', value: 10, key: 'dc_10', size: 44, file: '/heist/coin_10.png' },
  { kind: 'C50', value: 50, key: 'dc_50', size: 56, file: '/heist/coin_50.png' },
  { kind: 'C100', value: 100, key: 'dc_100', size: 68, file: '/heist/coin_100.png' },
]

export const SAFE_REWARD = 100

export function coinDef(kind: DuckCoinKind) {
  return DUCK_COIN_DEFS.find((d) => d.kind === kind) ?? DUCK_COIN_DEFS[0]
}

export function loadDuckCoinImages(scene: Phaser.Scene) {
  for (const def of DUCK_COIN_DEFS) {
    if (def.file) scene.load.image(def.key, def.file)
  }
}

export function applyCoinSpriteSize(sprite: Phaser.GameObjects.Sprite, def: DuckCoinDef) {
  const w = sprite.width || def.size
  const h = sprite.height || def.size
  const k = def.size / Math.max(w, h)
  sprite.setDisplaySize(w * k, h * k)
}

export function stopCoinIdle(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite) {
  const tweens = sprite.getData('coinIdleTweens') as Phaser.Tweens.Tween[] | undefined
  if (Array.isArray(tweens)) {
    tweens.forEach((tw) => tw.stop())
  }
  sprite.setData('coinIdleTweens', [])
  const idle = sprite.getData('coinIdle')
  if (idle) scene.tweens.killTweensOf(idle)
  scene.tweens.killTweensOf(sprite)
}

export function playCoinIdle(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, seed: number) {
  stopCoinIdle(scene, sprite)
  const body = sprite.body as Phaser.Physics.Arcade.Body | undefined
  if (body) {
    body.moves = false
    body.enable = false
  }
  sprite.setOrigin(0.5, 0.5)
  const baseY = sprite.y
  const idle = { bob: 0, tilt: 0, shine: 1 }
  sprite.setData('idleBaseY', baseY)
  sprite.setData('coinIdle', idle)
  const motion = scene.tweens.add({
    targets: idle,
    bob: 4,
    tilt: 1,
    duration: 1520 + seed * 90,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
    delay: seed * 45,
    onUpdate: () => {
      if (!sprite.active) return
      sprite.y = baseY - idle.bob
      sprite.angle = -6 + idle.tilt * 12
    },
  })
  const shine = scene.tweens.add({
    targets: idle,
    shine: 0.9,
    duration: 1180 + seed * 50,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
    delay: seed * 35,
    onUpdate: () => {
      if (!sprite.active) return
      sprite.alpha = idle.shine
    },
  })
  sprite.setData('coinIdleTweens', [motion, shine])
}

/** Fallback if a PNG fails to load. Keeps the same family of gold/copper rims. */
function paintCoinPlaceholder(ctx: CanvasRenderingContext2D, size: number, value: number) {
  const c = size / 2
  const r = size / 2 - 1.5
  const big = value >= 50
  const rim = big ? '#e0a92a' : '#c98a3c'
  const rimDark = big ? '#8a5f10' : '#6f4416'
  const face = big ? '#ffe08a' : '#f0c98d'
  const faceLow = big ? '#d4a017' : '#c08a4a'
  ctx.clearRect(0, 0, size, size)

  ctx.beginPath()
  ctx.arc(c, c + size * 0.05, r, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(c, c, r, 0, Math.PI * 2)
  ctx.fillStyle = rim
  ctx.fill()
  ctx.lineWidth = Math.max(2, size * 0.07)
  ctx.strokeStyle = rimDark
  ctx.stroke()

  const grad = ctx.createLinearGradient(0, c - r, 0, c + r)
  grad.addColorStop(0, face)
  grad.addColorStop(1, faceLow)
  ctx.beginPath()
  ctx.arc(c, c, r * 0.76, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = rimDark
  ctx.stroke()

  ctx.beginPath()
  ctx.ellipse(c - r * 0.25, c - r * 0.35, r * 0.3, r * 0.16, -0.5, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fill()

  ctx.fillStyle = rimDark
  ctx.font = `800 ${Math.floor(size * 0.46)}px Unbounded, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(value), c, c + size * 0.04)
}

export function ensureCoinPlaceholders(scene: Phaser.Scene) {
  for (const def of DUCK_COIN_DEFS) {
    if (scene.textures.exists(def.key)) {
      const src = scene.textures.get(def.key).getSourceImage()
      if (src instanceof HTMLImageElement) continue
    }
    const canvas = document.createElement('canvas')
    canvas.width = def.size
    canvas.height = def.size
    const ctx = canvas.getContext('2d')
    if (!ctx) continue
    paintCoinPlaceholder(ctx, def.size, def.value)
    if (scene.textures.exists(def.key)) scene.textures.remove(def.key)
    scene.textures.addCanvas(def.key, canvas)
  }
}
