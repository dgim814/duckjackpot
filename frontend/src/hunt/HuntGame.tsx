import { useEffect, useRef } from 'react'
import { HUNT_LEVELS } from './levels'
import { huntHitSound, huntShotSound } from './sound'

type Duck = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  phase: number
  dir: 1 | -1
  state: 'fly' | 'fall'
  rot: number
  life: number
}

type Flash = { x: number; y: number; t: number; hit: boolean }

type HuntGameProps = {
  running: boolean
  levelIndex: number
  onShot: () => void
  onHit: () => void
  onHud: (hud: { remaining: number; hits: number; required: number }) => void
  onClear: () => void
  onFail: () => void
}

function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#140c18')
  sky.addColorStop(0.42, '#2a1520')
  sky.addColorStop(0.72, '#1c2414')
  sky.addColorStop(1, '#0c140a')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#ffb300'
  ctx.beginPath()
  ctx.arc(w * 0.82, h * 0.16, 28, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 193, 7, 0.12)'
  ctx.beginPath()
  ctx.arc(w * 0.82, h * 0.16, 54, 0, Math.PI * 2)
  ctx.fill()
}

function drawReeds(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const ground = h * 0.78
  const grass = ctx.createLinearGradient(0, ground, 0, h)
  grass.addColorStop(0, '#1f4a18')
  grass.addColorStop(1, '#0b1c0a')
  ctx.fillStyle = grass
  ctx.fillRect(0, ground, w, h - ground)
  ctx.fillStyle = '#c9a227'
  ctx.fillRect(0, ground, w, 3)
  for (let i = 0; i < 18; i += 1) {
    const x = (i + 0.3) * (w / 18)
    const tall = 36 + (i % 4) * 10
    ctx.fillStyle = i % 2 ? '#2d6a22' : '#3a7d28'
    ctx.beginPath()
    ctx.moveTo(x, ground + 8)
    ctx.lineTo(x - 5, ground - tall)
    ctx.lineTo(x + 6, ground + 8)
    ctx.fill()
    ctx.fillStyle = '#ffc107'
    ctx.fillRect(x - 1, ground - tall - 6, 3, 8)
  }
}

function drawDuck(ctx: CanvasRenderingContext2D, duck: Duck) {
  ctx.save()
  ctx.translate(duck.x, duck.y)
  ctx.rotate(duck.rot)
  ctx.scale(duck.dir, 1)
  const s = duck.size / 110
  ctx.scale(s, s)
  ctx.fillStyle = '#ffca28'
  ctx.beginPath()
  ctx.ellipse(0, 8, 48, 28, -0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffb300'
  ctx.beginPath()
  ctx.ellipse(-8, 4, 22, 18, 0.4 + Math.sin(duck.phase) * 0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffd54f'
  ctx.beginPath()
  ctx.arc(28, -10, 22, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ff6f00'
  ctx.beginPath()
  ctx.ellipse(48, -6, 16, 8, 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1a120c'
  ctx.beginPath()
  ctx.arc(32, -16, 4.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff8e1'
  ctx.beginPath()
  ctx.arc(33.2, -17.2, 1.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffc107'
  ctx.beginPath()
  ctx.moveTo(18, -28)
  ctx.lineTo(28, -46)
  ctx.lineTo(38, -28)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(28, -28)
  ctx.lineTo(36, -42)
  ctx.lineTo(44, -26)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(12, -26)
  ctx.lineTo(20, -40)
  ctx.lineTo(28, -26)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#ffe082'
  ctx.beginPath()
  ctx.arc(28, -28, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawCrosshair(ctx: CanvasRenderingContext2D, x: number, y: number, hot: number) {
  const a = 0.45 + hot * 0.55
  ctx.strokeStyle = `rgba(255, 193, 7, ${a})`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y, 16, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y, 5, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 26, y)
  ctx.lineTo(x - 10, y)
  ctx.moveTo(x + 10, y)
  ctx.lineTo(x + 26, y)
  ctx.moveTo(x, y - 26)
  ctx.lineTo(x, y - 10)
  ctx.moveTo(x, y + 10)
  ctx.lineTo(x, y + 26)
  ctx.stroke()
}

export function HuntGame({ running, levelIndex, onShot, onHit, onHud, onClear, onFail }: HuntGameProps) {
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
    const ducks: Duck[] = []
    const flashes: Flash[] = []
    let hits = 0
    let ended = false
    let last = performance.now()
    let spawnAt = 0
    let elapsed = 0
    let raf = 0
    let aim = { x: 0, y: 0, hot: 0 }
    const level = HUNT_LEVELS[Math.max(0, Math.min(HUNT_LEVELS.length - 1, levelIndex))]

    const resize = () => {
      const parent = canvas.parentElement
      const w = parent?.clientWidth ?? 360
      const h = parent?.clientHeight ?? 480
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!aim.x) {
        aim.x = w / 2
        aim.y = h * 0.42
      }
    }
    resize()
    window.addEventListener('resize', resize)
    const size = () => ({ w: canvas.clientWidth, h: canvas.clientHeight })

    const flyingCount = () => ducks.filter((duck) => duck.state === 'fly').length

    const spawn = (attract: boolean) => {
      const { w, h } = size()
      const sizePx = attract ? 110 : level.size
      const fly = attract ? 3.8 : level.flyMin + Math.random() * (level.flyMax - level.flyMin)
      const lane = Math.floor(Math.random() * 3)
      const dir: 1 | -1 = lane === 1 ? -1 : 1
      let x = dir > 0 ? -sizePx : w + sizePx
      let y = h * 0.16 + Math.random() * (h * 0.4)
      let vx = dir * ((w + sizePx * 1.5) / fly)
      let vy = (Math.random() - 0.5) * (attract ? 36 : 70)
      if (lane === 2) {
        x = w * (0.15 + Math.random() * 0.7)
        y = -sizePx
        vx = (Math.random() > 0.5 ? 1 : -1) * (w * 0.35) / fly
        vy = (h * 0.55) / fly
      }
      ducks.push({
        x,
        y,
        vx,
        vy,
        size: sizePx,
        phase: Math.random() * Math.PI * 2,
        dir: vx >= 0 ? 1 : -1,
        state: 'fly',
        rot: 0,
        life: 1,
      })
    }

    const keepFlock = () => {
      if (ended) return
      const minAlive = running ? level.minAlive : 2
      const maxAlive = running ? level.maxAlive : 3
      while (flyingCount() < minAlive) spawn(!running)
      const spawnEvery = running ? level.spawnMs : 2200
      if (spawnAt >= spawnEvery && flyingCount() < maxAlive) {
        spawnAt = 0
        spawn(!running)
      }
    }
    keepFlock()

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const { w, h } = size()
      if (running && !ended) elapsed += dt
      aim.hot = Math.max(0, aim.hot - dt * 3)
      spawnAt += dt * 1000
      keepFlock()

      drawSky(ctx, w, h)
      for (const duck of ducks) {
        duck.phase += dt * 8
        if (duck.state === 'fall') {
          duck.vy += 520 * dt
          duck.y += duck.vy * dt
          duck.x += duck.vx * dt * 0.25
          duck.rot += dt * 6 * duck.dir
          duck.life -= dt * 1.3
        } else {
          duck.x += duck.vx * dt
          duck.y += duck.vy * dt + Math.sin(duck.phase) * 22 * dt
        }
      }
      for (let i = ducks.length - 1; i >= 0; i -= 1) {
        const duck = ducks[i]
        const gone = duck.x < -duck.size * 1.5 || duck.x > w + duck.size * 1.5 || duck.y > h + 40 || duck.life <= 0
        if (gone) ducks.splice(i, 1)
      }
      for (const duck of ducks) drawDuck(ctx, duck)
      drawReeds(ctx, w, h)

      for (let i = flashes.length - 1; i >= 0; i -= 1) {
        const flash = flashes[i]
        flash.t -= dt
        if (flash.t <= 0) {
          flashes.splice(i, 1)
          continue
        }
        ctx.fillStyle = flash.hit ? `rgba(255, 236, 150, ${flash.t})` : `rgba(255, 255, 255, ${flash.t * 0.45})`
        ctx.beginPath()
        ctx.arc(flash.x, flash.y, 10 + (1 - flash.t) * 28, 0, Math.PI * 2)
        ctx.fill()
      }
      drawCrosshair(ctx, aim.x, aim.y, aim.hot)

      if (running && !ended) {
        const remaining = Math.max(0, level.seconds - elapsed)
        onHudRef.current({ remaining, hits, required: level.required })
        if (hits >= level.required) {
          ended = true
          onClearRef.current()
        } else if (remaining <= 0) {
          ended = true
          onFailRef.current()
        }
      }
      raf = window.requestAnimationFrame(tick)
    }

    const shoot = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      aim = { x, y, hot: 1 }
      huntShotSound()
      flashes.push({ x, y, t: 0.28, hit: false })
      if (!running || ended) return
      onShotRef.current()
      const hit = [...ducks].reverse().find((duck) => {
        if (duck.state !== 'fly') return false
        const r = duck.size * 0.58
        return (x - duck.x) ** 2 + (y - duck.y) ** 2 <= r * r
      })
      if (!hit) return
      hit.state = 'fall'
      hit.vy = 40
      hits += 1
      huntHitSound()
      flashes.push({ x: hit.x, y: hit.y, t: 0.4, hit: true })
      onHitRef.current()
      onHudRef.current({ remaining: Math.max(0, level.seconds - elapsed), hits, required: level.required })
      if (hits >= level.required) {
        ended = true
        onClearRef.current()
      }
    }

    const onPointer = (event: PointerEvent) => {
      event.preventDefault()
      shoot(event.clientX, event.clientY)
    }
    canvas.addEventListener('pointerdown', onPointer)
    raf = window.requestAnimationFrame(tick)
    return () => {
      ended = true
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', onPointer)
    }
  }, [running, levelIndex])

  return <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none" />
}
