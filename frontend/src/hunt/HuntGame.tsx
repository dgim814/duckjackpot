import { useEffect, useRef } from 'react'
import { huntLevel } from './levels'
import { huntHitSound, huntMissSound, huntShotSound } from './sound'
import { huntWeapon, type HuntWeaponId } from './weapons'

type Duck = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  phase: number
  flap: number
  dir: 1 | -1
  state: 'fly' | 'fall'
  rot: number
  life: number
  gold: boolean
  turnIn: number
}

type Particle = { x: number; y: number; vx: number; vy: number; t: number; color: string }
type Floater = { x: number; y: number; t: number; text: string }
type Cloud = { x: number; y: number; s: number; v: number }

export type HuntHud = {
  remaining: number
  hits: number
  required: number
  ammo: number
  ammoMax: number
  score: number
  combo: number
}

type HuntGameProps = {
  running: boolean
  levelIndex: number
  weaponId: HuntWeaponId
  onShot: () => void
  onHit: (points: number, combo: number) => void
  onHud: (hud: HuntHud) => void
  onClear: () => void
  onFail: () => void
}

function drawField(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, shake: number, clouds: Cloud[]) {
  const ox = shake * Math.sin(t * 40)
  const oy = shake * Math.cos(t * 32)
  ctx.save()
  ctx.translate(ox, oy)
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72)
  sky.addColorStop(0, '#5ec8ff')
  sky.addColorStop(0.55, '#8ad4ff')
  sky.addColorStop(1, '#c8ecff')
  ctx.fillStyle = sky
  ctx.fillRect(-8, -8, w + 16, h + 16)
  ctx.fillStyle = '#ffe08a'
  ctx.beginPath()
  ctx.arc(w * 0.82, h * 0.12, 34, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (const c of clouds) {
    ctx.beginPath()
    ctx.ellipse(c.x, c.y, 42 * c.s, 16 * c.s, 0, 0, Math.PI * 2)
    ctx.ellipse(c.x + 28 * c.s, c.y + 4, 30 * c.s, 14 * c.s, 0, 0, Math.PI * 2)
    ctx.ellipse(c.x - 24 * c.s, c.y + 6, 24 * c.s, 12 * c.s, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  const swamp = h * 0.78
  const grass = h * 0.68
  ctx.fillStyle = '#3aa0c8'
  ctx.fillRect(-8, swamp, w + 16, h * 0.08)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fillRect(-8, swamp + 6, w + 16, 3)
  const hill = ctx.createLinearGradient(0, grass, 0, swamp)
  hill.addColorStop(0, '#4bb34a')
  hill.addColorStop(1, '#2d7a32')
  ctx.fillStyle = hill
  ctx.fillRect(-8, grass, w + 16, swamp - grass)
  ctx.fillStyle = '#2f6b28'
  ctx.beginPath()
  ctx.moveTo(-10, grass + 8)
  ctx.quadraticCurveTo(w * 0.2, grass - 18, w * 0.45, grass + 10)
  ctx.quadraticCurveTo(w * 0.7, grass - 12, w + 10, grass + 14)
  ctx.lineTo(w + 10, grass + 22)
  ctx.lineTo(-10, grass + 22)
  ctx.fill()
  ctx.fillStyle = '#1e4a18'
  ctx.fillRect(w * 0.08, grass - 78, 10, 86)
  ctx.fillStyle = '#2f8a28'
  ctx.beginPath()
  ctx.arc(w * 0.08 + 5, grass - 88, 36, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#247a22'
  ctx.beginPath()
  ctx.arc(w * 0.08 - 16, grass - 70, 22, 0, Math.PI * 2)
  ctx.arc(w * 0.08 + 26, grass - 72, 20, 0, Math.PI * 2)
  ctx.fill()
  for (let i = 0; i < 9; i += 1) {
    const x = w * (0.22 + i * 0.09)
    ctx.fillStyle = i % 2 ? '#1f6a24' : '#2a7d2c'
    ctx.beginPath()
    ctx.moveTo(x, grass + 10)
    ctx.lineTo(x - 11, grass - 22 - (i % 3) * 6)
    ctx.lineTo(x + 13, grass + 10)
    ctx.fill()
  }
  ctx.fillStyle = '#c4a24a'
  ctx.fillRect(-8, swamp, w + 16, 3)
  ctx.restore()
}

function drawDuck(ctx: CanvasRenderingContext2D, duck: Duck) {
  ctx.save()
  ctx.translate(duck.x, duck.y)
  ctx.rotate(duck.rot)
  ctx.scale(duck.dir, 1)
  const s = duck.size / 110
  ctx.scale(s, s)
  const flap = Math.sin(duck.flap) * 0.7
  ctx.fillStyle = duck.gold ? '#ffe082' : '#f6b000'
  ctx.beginPath()
  ctx.ellipse(-16, 0, 22, 11, 0.55 + flap, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = duck.gold ? '#ffd54f' : '#ffca28'
  ctx.beginPath()
  ctx.ellipse(0, 8, 46, 26, -0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = duck.gold ? '#ffecb3' : '#ffb300'
  ctx.beginPath()
  ctx.ellipse(-8, 4, 16, 14, 0.3 + flap, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = duck.gold ? '#fff8e1' : '#ffe082'
  ctx.beginPath()
  ctx.arc(26, -10, 20, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ff6f00'
  ctx.beginPath()
  ctx.ellipse(44, -6, 14, 7, 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1a120c'
  ctx.beginPath()
  ctx.arc(30, -16, 3.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffc107'
  ctx.beginPath()
  ctx.moveTo(16, -26)
  ctx.lineTo(26, -46)
  ctx.lineTo(36, -26)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawDog(ctx: CanvasRenderingContext2D, w: number, h: number, show: number) {
  if (show <= 0) return
  const grass = h * 0.68
  ctx.save()
  ctx.globalAlpha = Math.min(1, show)
  ctx.translate(w * 0.5, grass + 18)
  ctx.fillStyle = '#6b3a12'
  ctx.beginPath()
  ctx.ellipse(0, 0, 34, 20, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#c47a2a'
  ctx.beginPath()
  ctx.ellipse(8, 5, 14, 10, 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#8a4a18'
  ctx.beginPath()
  ctx.arc(16, -18, 14, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#4a240c'
  ctx.beginPath()
  ctx.ellipse(-18, -8, 8, 14, 0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#e0a020'
  ctx.fillRect(-4, -8, 24, 5)
  ctx.beginPath()
  ctx.arc(8, -6, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#7a1fa2'
  ctx.beginPath()
  ctx.arc(8, -6, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffc107'
  ctx.beginPath()
  ctx.moveTo(2, -32)
  ctx.lineTo(10, -44)
  ctx.lineTo(18, -32)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawWeaponIcon(ctx: CanvasRenderingContext2D, w: number, h: number, id: HuntWeaponId) {
  const x = w / 2
  const y = h - 28
  ctx.fillStyle = 'rgba(10,20,30,0.45)'
  ctx.fillRect(x - 28, y - 16, 56, 28)
  ctx.strokeStyle = '#ffc107'
  ctx.lineWidth = 2
  ctx.strokeRect(x - 28, y - 16, 56, 28)
  ctx.fillStyle = '#ffc107'
  if (id === 'sling') {
    ctx.beginPath()
    ctx.arc(x, y, 8, 0, Math.PI * 2)
    ctx.fill()
  } else if (id === 'thunder') {
    ctx.beginPath()
    ctx.moveTo(x - 6, y - 10)
    ctx.lineTo(x + 4, y - 2)
    ctx.lineTo(x - 2, y - 2)
    ctx.lineTo(x + 8, y + 10)
    ctx.lineTo(x - 2, y + 2)
    ctx.lineTo(x + 4, y + 2)
    ctx.closePath()
    ctx.fill()
  } else {
    ctx.fillRect(x - 14, y - 4, 28, 8)
    ctx.fillRect(x + 8, y - 8, 8, 16)
  }
}

function cueText(cue: number, n: number) {
  if (cue < 0.4) return `ROUND ${n}`
  if (cue < 0.75) return 'READY'
  if (cue < 1.05) return '3'
  if (cue < 1.35) return '2'
  if (cue < 1.65) return '1'
  if (cue < 2.05) return 'HUNT'
  return ''
}

export function HuntGame({ running, levelIndex, weaponId, onShot, onHit, onHud, onClear, onFail }: HuntGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const onShotRef = useRef(onShot)
  const onHitRef = useRef(onHit)
  const onHudRef = useRef(onHud)
  const onClearRef = useRef(onClear)
  const onFailRef = useRef(onFail)
  onShotRef.current = onShot
  onHitRef.current = onHit
  onHudRef.current = onHud
  onClearRef.current = onClear
  onFailRef.current = onFail

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const level = huntLevel(levelIndex)
    const weapon = huntWeapon(weaponId)
    const ducks: Duck[] = []
    const parts: Particle[] = []
    const floats: Floater[] = []
    const clouds: Cloud[] = [
      { x: 40, y: 48, s: 1, v: 12 },
      { x: 180, y: 72, s: 1.3, v: 8 },
      { x: 300, y: 40, s: 0.8, v: 15 },
    ]
    let hits = 0
    let score = 0
    let combo = 0
    let ammo = weapon.ammo
    let ended = false
    let last = performance.now()
    let elapsed = 0
    let cool = 0
    let raf = 0
    let shake = 0
    let slow = 0
    let recoil = 0
    let flash = 0
    let dog = 0
    let cue = 0
    let waveReady = true
    let aim = { x: 0, y: 0 }
    let clock = 0

    const resize = () => {
      const parent = canvas.parentElement
      const w = parent?.clientWidth ?? 360
      const h = parent?.clientHeight ?? 640
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!aim.x) {
        aim.x = w / 2
        aim.y = h * 0.36
      }
    }
    resize()
    window.addEventListener('resize', resize)
    const size = () => ({ w: canvas.clientWidth, h: canvas.clientHeight })

    const spawn = (gold = false) => {
      const { w, h } = size()
      const fromLeft = Math.random() > 0.5
      const dir: 1 | -1 = fromLeft ? 1 : -1
      const fly = level.flyMin + Math.random() * (level.flyMax - level.flyMin)
      ducks.push({
        x: fromLeft ? -40 : w + 40,
        y: h * 0.16 + Math.random() * (h * 0.32),
        vx: dir * ((w + 80) / fly),
        vy: (Math.random() - 0.5) * 50,
        size: gold ? level.size + 10 : level.size,
        phase: Math.random() * 6,
        flap: Math.random() * 8,
        dir,
        state: 'fly',
        rot: 0,
        life: 1,
        gold,
        turnIn: 0.6 + Math.random() * 1.1,
      })
    }

    const startWave = () => {
      ammo = weapon.ammo
      waveReady = false
      const n = running ? level.ducks : 1
      for (let i = 0; i < n; i += 1) spawn(running && Math.random() < level.gold)
    }
    startWave()

    const burst = (x: number, y: number, gold: boolean) => {
      for (let i = 0; i < 14; i += 1) {
        const a = (i / 14) * Math.PI * 2
        parts.push({
          x,
          y,
          vx: Math.cos(a) * (80 + Math.random() * 90),
          vy: Math.sin(a) * (80 + Math.random() * 90),
          t: 0.45,
          color: gold ? '#ffe082' : '#ffca28',
        })
      }
    }

    const tick = (now: number) => {
      const raw = Math.min(0.05, (now - last) / 1000)
      last = now
      const dt = raw * (slow > 0 ? 0.32 : 1)
      slow = Math.max(0, slow - raw)
      clock += dt
      const { w, h } = size()
      if (running && !ended) {
        elapsed += dt
        cue += raw
      }
      cool = Math.max(0, cool - raw)
      recoil = Math.max(0, recoil - raw * 8)
      flash = Math.max(0, flash - raw * 8)
      shake = Math.max(0, shake - raw * 10)
      dog = Math.max(0, dog - raw)
      for (const c of clouds) {
        c.x += c.v * dt * 0.35
        if (c.x > w + 80) c.x = -80
      }
      drawField(ctx, w, h, clock, shake, clouds)

      const skyMax = h * 0.62
      for (const duck of ducks) {
        duck.flap += dt * 16
        duck.phase += dt * 7
        if (duck.state === 'fall') {
          duck.vy += 620 * dt
          duck.y += duck.vy * dt
          duck.x += duck.vx * dt * 0.2
          duck.rot += dt * 7 * duck.dir
          duck.life -= dt * 1.2
        } else {
          duck.turnIn -= dt
          if (duck.turnIn <= 0) {
            duck.vx *= -1
            duck.dir = duck.vx >= 0 ? 1 : -1
            duck.vy = (Math.random() - 0.5) * 90 * (0.4 + level.turn)
            duck.turnIn = Math.max(0.35, 1.4 - level.turn * 0.4 + Math.random() * 0.5)
          }
          duck.x += duck.vx * dt
          duck.y += duck.vy * dt + Math.sin(duck.phase) * 18 * dt
          duck.y = Math.max(36, Math.min(skyMax, duck.y))
        }
      }
      for (let i = ducks.length - 1; i >= 0; i -= 1) {
        const duck = ducks[i]
        if (duck.x < -60 || duck.x > w + 60 || duck.y > h + 40 || duck.life <= 0) ducks.splice(i, 1)
      }
      for (const duck of ducks) drawDuck(ctx, duck)
      if (dog > 0) drawDog(ctx, w, h, dog)

      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i]
        p.t -= dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 120 * dt
        if (p.t <= 0) {
          parts.splice(i, 1)
          continue
        }
        ctx.globalAlpha = Math.max(0, p.t * 2)
        ctx.fillStyle = p.color
        ctx.fillRect(p.x, p.y, 4, 4)
        ctx.globalAlpha = 1
      }
      for (let i = floats.length - 1; i >= 0; i -= 1) {
        const f = floats[i]
        f.t -= dt
        f.y -= 40 * dt
        if (f.t <= 0) {
          floats.splice(i, 1)
          continue
        }
        ctx.globalAlpha = Math.min(1, f.t * 3)
        ctx.fillStyle = '#fff8e1'
        ctx.font = '800 22px ui-sans-serif, system-ui'
        ctx.textAlign = 'center'
        ctx.fillText(f.text, f.x, f.y)
        ctx.globalAlpha = 1
      }

      const flying = ducks.filter((d) => d.state === 'fly')
      if (running && !ended) {
        if (flying.length === 0 && ducks.length === 0) {
          if (!waveReady) {
            dog = 1.15
            waveReady = true
          } else if (dog <= 0) startWave()
        }
        const remaining = Math.max(0, level.seconds - elapsed)
        onHudRef.current({ remaining, hits, required: level.required, ammo, ammoMax: weapon.ammo, score, combo })
        if (remaining <= 0) {
          ended = true
          if (hits >= level.required) onClearRef.current()
          else onFailRef.current()
        }
      }

      ctx.fillStyle = 'rgba(8,18,28,0.38)'
      ctx.fillRect(0, 0, w, 46)
      ctx.fillStyle = '#fff8e1'
      ctx.font = '800 13px ui-sans-serif, system-ui'
      ctx.textAlign = 'left'
      ctx.fillText(`SCORE ${score}`, 12, 20)
      ctx.textAlign = 'center'
      ctx.fillText(`TIME ${Math.ceil(Math.max(0, level.seconds - elapsed))}`, w / 2, 20)
      ctx.textAlign = 'right'
      ctx.fillText('SHOTS', w - 12, 18)
      const dots = weapon.ammo
      for (let i = 0; i < dots; i += 1) {
        ctx.beginPath()
        ctx.fillStyle = i < ammo ? '#ffc107' : 'rgba(255,255,255,0.25)'
        ctx.arc(w - 18 - (dots - 1 - i) * 14, 34, 5, 0, Math.PI * 2)
        ctx.fill()
      }
      drawWeaponIcon(ctx, w, h, weaponId)

      const banner = running && levelIndex === 0 ? cueText(cue, 1) : running && cue < 2 ? `ROUND ${levelIndex + 1}` : ''
      if (banner) {
        ctx.fillStyle = 'rgba(0,0,0,0.28)'
        ctx.fillRect(0, h * 0.38, w, 64)
        ctx.fillStyle = '#fff8e1'
        ctx.font = '900 42px ui-sans-serif, system-ui'
        ctx.textAlign = 'center'
        ctx.fillText(banner, w / 2, h * 0.38 + 46)
      }

      const ax = aim.x
      const ay = aim.y - recoil * 10
      ctx.strokeStyle = `rgba(20,20,20,0.85)`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(ax, ay, 16, 0, Math.PI * 2)
      ctx.moveTo(ax - 24, ay)
      ctx.lineTo(ax - 8, ay)
      ctx.moveTo(ax + 8, ay)
      ctx.lineTo(ax + 24, ay)
      ctx.moveTo(ax, ay - 24)
      ctx.lineTo(ax, ay - 8)
      ctx.moveTo(ax, ay + 8)
      ctx.lineTo(ax, ay + 24)
      ctx.stroke()
      if (flash > 0) {
        ctx.fillStyle = `rgba(255, 220, 80, ${flash})`
        ctx.beginPath()
        ctx.arc(ax, ay, 18 + (1 - flash) * 16, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = window.requestAnimationFrame(tick)
    }

    const shoot = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      aim = { x: clientX - rect.left, y: clientY - rect.top }
      if (!running || ended || ammo <= 0 || cool > 0) return
      ammo -= 1
      cool = weapon.cooldown
      recoil = 1
      flash = 1
      huntShotSound()
      onShotRef.current()
      const hit = [...ducks].reverse().find((duck) => {
        if (duck.state !== 'fly') return false
        const r = duck.size * weapon.radius
        return (aim.x - duck.x) ** 2 + (aim.y - duck.y) ** 2 <= r * r
      })
      if (!hit) {
        huntMissSound()
        combo = 0
        floats.push({ x: aim.x, y: aim.y, t: 0.45, text: 'MISS' })
        return
      }
      hit.state = 'fall'
      hit.vy = 30
      hits += 1
      combo += 1
      const points = (hit.gold ? 300 : 100) * Math.max(1, combo)
      score += points
      shake = 1.2
      slow = 0.16
      burst(hit.x, hit.y, hit.gold)
      floats.push({ x: hit.x, y: hit.y - 12, t: 0.7, text: hit.gold ? `HIT +${points}` : `HIT +${points}` })
      huntHitSound()
      onHitRef.current(points, combo)
    }

    const onDown = (event: PointerEvent) => {
      event.preventDefault()
      canvas.setPointerCapture(event.pointerId)
      shoot(event.clientX, event.clientY)
    }
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      aim = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    raf = window.requestAnimationFrame(tick)
    return () => {
      ended = true
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
    }
  }, [running, levelIndex, weaponId])

  return <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none" />
}
