import type Phaser from 'phaser'
import type { FloorTheme } from '../level/LevelDef'

export const FLOOR_TILE = 128

type Ctx = CanvasRenderingContext2D

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('2d canvas unavailable')
  return [c, ctx]
}

/** Deterministic noise so every build of the level looks the same. */
function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function speckle(ctx: Ctx, n: number, color: string, size: number, seed: number) {
  const r = rng(seed)
  ctx.fillStyle = color
  for (let i = 0; i < n; i += 1) ctx.fillRect(r() * FLOOR_TILE, r() * FLOOR_TILE, size, size)
}

function grid(ctx: Ctx, step: number, color: string, width = 1) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  for (let i = 0; i <= FLOOR_TILE; i += step) {
    ctx.beginPath()
    ctx.moveTo(i + 0.5, 0)
    ctx.lineTo(i + 0.5, FLOOR_TILE)
    ctx.moveTo(0, i + 0.5)
    ctx.lineTo(FLOOR_TILE, i + 0.5)
    ctx.stroke()
  }
}

function veins(ctx: Ctx, color: string, seed: number, count = 3) {
  const r = rng(seed)
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  for (let i = 0; i < count; i += 1) {
    ctx.beginPath()
    let x = r() * FLOOR_TILE
    let y = 0
    ctx.moveTo(x, y)
    while (y < FLOOR_TILE) {
      x += (r() - 0.5) * 26
      y += 12 + r() * 18
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

/** Tileable 128px floor per room type. Dark on purpose: lights and rugs bring the colour. */
function paintFloor(theme: FloorTheme): HTMLCanvasElement {
  const [c, ctx] = canvas(FLOOR_TILE, FLOOR_TILE)
  const T = FLOOR_TILE
  switch (theme) {
    case 'lobby': {
      for (let y = 0; y < 2; y += 1)
        for (let x = 0; x < 2; x += 1) {
          ctx.fillStyle = (x + y) % 2 === 0 ? '#1d2230' : '#161a25'
          ctx.fillRect(x * 64, y * 64, 64, 64)
        }
      veins(ctx, 'rgba(160,170,196,0.07)', 11)
      grid(ctx, 64, 'rgba(201,162,39,0.16)')
      break
    }
    case 'marble': {
      ctx.fillStyle = '#20232c'
      ctx.fillRect(0, 0, T, T)
      veins(ctx, 'rgba(200,205,220,0.08)', 7, 4)
      grid(ctx, 64, 'rgba(0,0,0,0.35)')
      grid(ctx, 64, 'rgba(255,255,255,0.03)')
      break
    }
    case 'carpetBlue':
    case 'carpetGreen': {
      ctx.fillStyle = theme === 'carpetBlue' ? '#18203a' : '#15261f'
      ctx.fillRect(0, 0, T, T)
      speckle(ctx, 900, 'rgba(255,255,255,0.025)', 1, theme === 'carpetBlue' ? 3 : 5)
      speckle(ctx, 500, 'rgba(0,0,0,0.25)', 1, 9)
      ctx.strokeStyle = theme === 'carpetBlue' ? 'rgba(120,150,230,0.07)' : 'rgba(120,200,150,0.06)'
      for (let i = -T; i < T * 2; i += 16) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i + T, T)
        ctx.stroke()
      }
      break
    }
    case 'tiles': {
      ctx.fillStyle = '#26303a'
      ctx.fillRect(0, 0, T, T)
      for (let y = 0; y < T; y += 32)
        for (let x = 0; x < T; x += 32) {
          ctx.fillStyle = ((x + y) / 32) % 2 === 0 ? '#2c3844' : '#29343f'
          ctx.fillRect(x + 1, y + 1, 30, 30)
        }
      grid(ctx, 32, 'rgba(10,14,18,0.8)', 2)
      break
    }
    case 'concrete': {
      ctx.fillStyle = '#1e1f22'
      ctx.fillRect(0, 0, T, T)
      speckle(ctx, 700, 'rgba(255,255,255,0.03)', 2, 21)
      speckle(ctx, 700, 'rgba(0,0,0,0.3)', 2, 22)
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'
      ctx.beginPath()
      ctx.moveTo(0, 64.5)
      ctx.lineTo(T, 64.5)
      ctx.stroke()
      break
    }
    case 'wood':
    case 'mansionWood': {
      const base = theme === 'wood' ? ['#2a1d15', '#251910', '#2e2016', '#21170f'] : ['#3a2618', '#33211a', '#3f2a1b', '#2e1d13']
      for (let i = 0; i < 8; i += 1) {
        ctx.fillStyle = base[i % base.length]
        ctx.fillRect(0, i * 16, T, 16)
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fillRect(0, i * 16 + 15, T, 1)
        ctx.fillRect(((i * 53) % T) | 0, i * 16, 1, 16)
      }
      speckle(ctx, 300, 'rgba(255,220,160,0.035)', 1, 31)
      break
    }
    case 'steel': {
      ctx.fillStyle = '#161b22'
      ctx.fillRect(0, 0, T, T)
      ctx.fillStyle = 'rgba(160,190,220,0.06)'
      for (let y = 0; y < T; y += 16)
        for (let x = (y / 16) % 2 === 0 ? 0 : 8; x < T; x += 16) {
          ctx.save()
          ctx.translate(x + 4, y + 4)
          ctx.rotate(Math.PI / 4)
          ctx.fillRect(-4, -1.2, 8, 2.4)
          ctx.restore()
        }
      grid(ctx, 64, 'rgba(0,0,0,0.6)', 2)
      break
    }
    case 'server': {
      ctx.fillStyle = '#10161d'
      ctx.fillRect(0, 0, T, T)
      for (let y = 0; y < T; y += 64)
        for (let x = 0; x < T; x += 64) {
          ctx.fillStyle = '#141c25'
          ctx.fillRect(x + 2, y + 2, 60, 60)
          ctx.fillStyle = 'rgba(110,200,255,0.1)'
          for (let py = 10; py < 60; py += 8) for (let px = 10; px < 60; px += 8) ctx.fillRect(x + px, y + py, 2, 2)
        }
      grid(ctx, 64, 'rgba(110,200,255,0.12)')
      break
    }
    case 'storage': {
      ctx.fillStyle = '#1b1c1f'
      ctx.fillRect(0, 0, T, T)
      speckle(ctx, 600, 'rgba(255,255,255,0.025)', 2, 41)
      ctx.fillStyle = 'rgba(214,170,40,0.12)'
      ctx.fillRect(0, 0, T, 4)
      break
    }
    case 'vault': {
      ctx.fillStyle = '#15171b'
      ctx.fillRect(0, 0, T, T)
      grid(ctx, 64, 'rgba(0,0,0,0.7)', 3)
      grid(ctx, 64, 'rgba(201,162,39,0.14)')
      ctx.fillStyle = 'rgba(201,162,39,0.35)'
      for (let y = 8; y < T; y += 64) for (let x = 8; x < T; x += 64) {
        ctx.fillRect(x, y, 3, 3)
        ctx.fillRect(x + 45, y, 3, 3)
        ctx.fillRect(x, y + 45, 3, 3)
        ctx.fillRect(x + 45, y + 45, 3, 3)
      }
      break
    }
    case 'gold': {
      for (let y = 0; y < 2; y += 1)
        for (let x = 0; x < 2; x += 1) {
          ctx.fillStyle = (x + y) % 2 === 0 ? '#1c160c' : '#100d08'
          ctx.fillRect(x * 64, y * 64, 64, 64)
        }
      veins(ctx, 'rgba(232,196,106,0.09)', 51, 4)
      grid(ctx, 64, 'rgba(201,162,39,0.3)')
      break
    }
    case 'mansionStone': {
      ctx.fillStyle = '#231c18'
      ctx.fillRect(0, 0, T, T)
      grid(ctx, 32, 'rgba(0,0,0,0.4)', 2)
      break
    }
  }
  return c
}

function radial(size: number, stops: [number, string][]) {
  const [c, ctx] = canvas(size, size)
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  for (const [o, col] of stops) g.addColorStop(o, col)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return c
}

/** Soft cone used for guard and camera vision; origin at the left middle. */
function cone(fovDeg: number) {
  const len = 256
  const half = len * Math.tan((fovDeg * Math.PI) / 360)
  const h = Math.ceil(half * 2) + 4
  const [c, ctx] = canvas(len, h)
  const oy = h / 2
  ctx.beginPath()
  ctx.moveTo(0, oy)
  ctx.lineTo(len, oy - half)
  ctx.arc(0, oy, len, -Math.atan2(half, len), Math.atan2(half, len))
  ctx.closePath()
  ctx.save()
  ctx.clip()
  const g = ctx.createRadialGradient(0, oy, 0, 0, oy, len)
  g.addColorStop(0, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.55, 'rgba(255,255,255,0.28)')
  g.addColorStop(1, 'rgba(255,255,255,0.04)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, len, h)
  ctx.restore()
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, oy)
  ctx.lineTo(len * 0.98, oy - half * 0.98)
  ctx.moveTo(0, oy)
  ctx.lineTo(len * 0.98, oy + half * 0.98)
  ctx.stroke()
  return c
}

function plant(size: number, tall: boolean, flowers: boolean) {
  const w = size
  const h = tall ? Math.round(size * 1.5) : size
  const [c, ctx] = canvas(w, h)
  const cx = w / 2
  // pot
  const potW = w * 0.42
  const potH = h * 0.26
  const potY = h - potH - 2
  const pg = ctx.createLinearGradient(cx - potW / 2, 0, cx + potW / 2, 0)
  pg.addColorStop(0, '#2a1a10')
  pg.addColorStop(0.5, '#5a3a22')
  pg.addColorStop(1, '#21140c')
  ctx.fillStyle = pg
  ctx.beginPath()
  ctx.moveTo(cx - potW / 2, potY)
  ctx.lineTo(cx + potW / 2, potY)
  ctx.lineTo(cx + potW * 0.38, h - 2)
  ctx.lineTo(cx - potW * 0.38, h - 2)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(201,162,39,0.8)'
  ctx.fillRect(cx - potW / 2, potY, potW, 3)
  // leaves
  const r = rng(Math.round(size * 7 + (tall ? 1 : 0)))
  const leafTop = tall ? h * 0.06 : h * 0.1
  const leafBot = potY + 4
  const cols = ['#173a22', '#1f4d2c', '#2b6a3a', '#3d8a4a', '#58a860']
  for (let layer = 0; layer < cols.length; layer += 1) {
    ctx.fillStyle = cols[layer]
    const n = 7 - layer
    for (let i = 0; i < n; i += 1) {
      const ly = leafTop + r() * (leafBot - leafTop) * (0.85 - layer * 0.12)
      const lx = cx + (r() - 0.5) * w * (0.8 - layer * 0.1)
      ctx.beginPath()
      ctx.ellipse(lx, ly, w * (0.2 - layer * 0.022), h * (tall ? 0.12 : 0.16) - layer * 1.2, (r() - 0.5) * 1.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  if (flowers) {
    ctx.fillStyle = '#e07a8a'
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath()
      ctx.arc(cx + (r() - 0.5) * w * 0.5, leafTop + r() * (leafBot - leafTop) * 0.6, 2.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  return c
}

function safeTex(open: boolean) {
  const S = 128
  const [c, ctx] = canvas(S, S)
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(10, 18, 112, 106)
  const body = ctx.createLinearGradient(0, 8, 0, 118)
  body.addColorStop(0, '#3a4452')
  body.addColorStop(1, '#1a2028')
  ctx.fillStyle = body
  ctx.fillRect(6, 6, 112, 110)
  ctx.strokeStyle = '#c9a227'
  ctx.lineWidth = 3
  ctx.strokeRect(7.5, 7.5, 109, 107)
  if (open) {
    ctx.fillStyle = '#07090c'
    ctx.fillRect(16, 16, 92, 90)
    ctx.fillStyle = '#e8c46a'
    for (let i = 0; i < 6; i += 1) ctx.fillRect(24 + (i % 3) * 26, 70 + Math.floor(i / 3) * 14, 20, 10)
    ctx.fillStyle = '#2a323c'
    ctx.fillRect(100, 14, 18, 94)
    ctx.strokeStyle = '#c9a227'
    ctx.strokeRect(100.5, 14.5, 17, 93)
    return c
  }
  ctx.fillStyle = '#0f141a'
  ctx.beginPath()
  ctx.arc(64, 62, 32, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#e0c56a'
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.strokeStyle = 'rgba(160,176,190,0.6)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(64, 62, 22, 0, Math.PI * 2)
  ctx.stroke()
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2
    ctx.fillStyle = '#c9a227'
    ctx.fillRect(64 + Math.cos(a) * 27 - 1, 62 + Math.sin(a) * 27 - 1, 2, 2)
  }
  ctx.fillStyle = '#9aa8b4'
  ctx.beginPath()
  ctx.arc(64, 62, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#c9a227'
  ctx.fillRect(98, 40, 8, 44)
  return c
}

function icon(glyph: string, fg: string, bg: string) {
  const S = 48
  const [c, ctx] = canvas(S, S)
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, S / 2 - 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.fillStyle = fg
  ctx.font = '900 30px Unbounded, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(glyph, S / 2, S / 2 + 2)
  return c
}

function add(scene: Phaser.Scene, key: string, c: HTMLCanvasElement) {
  if (scene.textures.exists(key)) scene.textures.remove(key)
  scene.textures.addCanvas(key, c)
}

export const FLOOR_THEMES: FloorTheme[] = [
  'marble',
  'lobby',
  'carpetBlue',
  'carpetGreen',
  'tiles',
  'concrete',
  'wood',
  'steel',
  'server',
  'storage',
  'vault',
  'gold',
  'mansionWood',
  'mansionStone',
]

export function floorKey(theme: FloorTheme) {
  return `v2_floor_${theme}`
}

/** Street outside the building: asphalt with faint lane marks, so the camera can pass the walls. */
function street() {
  const [c, ctx] = canvas(FLOOR_TILE, FLOOR_TILE)
  ctx.fillStyle = '#0d0e12'
  ctx.fillRect(0, 0, FLOOR_TILE, FLOOR_TILE)
  speckle(ctx, 900, 'rgba(255,255,255,0.03)', 1, 77)
  speckle(ctx, 500, 'rgba(0,0,0,0.5)', 2, 78)
  ctx.fillStyle = 'rgba(214,190,120,0.08)'
  ctx.fillRect(60, 0, 8, 40)
  return c
}

export function buildTextures(scene: Phaser.Scene, guardFov: number, camFov: number) {
  for (const t of FLOOR_THEMES) add(scene, floorKey(t), paintFloor(t))
  add(scene, 'v2_street', street())
  add(scene, 'v2_glow', radial(256, [[0, 'rgba(255,255,255,0.9)'], [0.35, 'rgba(255,255,255,0.32)'], [1, 'rgba(255,255,255,0)']]))
  add(scene, 'v2_shadow', radial(64, [[0, 'rgba(0,0,0,0.55)'], [0.6, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0)']]))
  add(scene, 'v2_cone_guard', cone(guardFov))
  add(scene, 'v2_cone_cam', cone(camFov))
  add(scene, 'v2_plant_s', plant(64, false, false))
  add(scene, 'v2_plant_f', plant(80, false, true))
  add(scene, 'v2_plant_t', plant(72, true, false))
  add(scene, 'v2_safe', safeTex(false))
  add(scene, 'v2_safe_open', safeTex(true))
  add(scene, 'v2_icon_q', icon('?', '#1a1208', '#ffd65a'))
  add(scene, 'v2_icon_x', icon('!', '#ffffff', '#e0452e'))
  add(scene, 'v2_spark', radial(16, [[0, 'rgba(255,240,190,1)'], [0.5, 'rgba(255,214,90,0.8)'], [1, 'rgba(255,214,90,0)']]))
  add(scene, 'v2_pixel', radial(4, [[0, '#ffffff'], [1, '#ffffff']]))
}
