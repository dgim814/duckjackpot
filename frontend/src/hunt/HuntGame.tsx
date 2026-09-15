import { useEffect, useRef } from 'react'
import { huntRoundConfig } from './levels'
import { huntHitSound, huntMissSound, huntShotSound } from './sound'
import { huntWeapon, type HuntWeaponId } from './weapons'

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
  flap: number
}

type Flash = { x: number; y: number; t: number; hit: boolean }
type DogMood = 'idle' | 'happy' | 'scratch'

export type HuntHud = {
  remaining: number
  hits: number
  required: number
  ammo: number
  ammoMax: number
  waveDucks: number
}

type HuntGameProps = {
  running: boolean
  paused: boolean
  roundIndex: number
  weaponId: HuntWeaponId
  onShot: () => void
  onHit: (points: number) => void
  onHud: (hud: HuntHud) => void
  onClear: () => void
  onFail: () => void
}

function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#1a1030')
  sky.addColorStop(0.38, '#3a2248')
  sky.addColorStop(0.68, '#2a3a28')
  sky.addColorStop(1, '#142010')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#ffb300'
  ctx.beginPath()
  ctx.arc(w * 0.84, h * 0.14, 26, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 193, 7, 0.14)'
  ctx.beginPath()
  ctx.arc(w * 0.84, h * 0.14, 50, 0, Math.PI * 2)
  ctx.fill()
}

function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grass = h * 0.7
  const dirt = h * 0.82
  const grassGrad = ctx.createLinearGradient(0, grass, 0, dirt)
  grassGrad.addColorStop(0, '#2f6b24')
  grassGrad.addColorStop(1, '#1a3e14')
  ctx.fillStyle = grassGrad
  ctx.fillRect(0, grass, w, dirt - grass)
  const soil = ctx.createLinearGradient(0, dirt, 0, h)
  soil.addColorStop(0, '#5a3a1c')
  soil.addColorStop(1, '#2a180c')
  ctx.fillStyle = soil
  ctx.fillRect(0, dirt, w, h - dirt)
  ctx.fillStyle = '#d4a017'
  ctx.fillRect(0, grass, w, 3)
  for (let i = 0; i < 16; i += 1) {
    const x = (i + 0.25) * (w / 16)
    const tall = 28 + (i % 5) * 8
    ctx.fillStyle = i % 2 ? '#3d7a2c' : '#4a8d34'
    ctx.beginPath()
    ctx.moveTo(x, grass + 6)
    ctx.lineTo(x - 4, grass - tall)
    ctx.lineTo(x + 5, grass + 6)
    ctx.fill()
  }
}

function drawDuck(ctx: CanvasRenderingContext2D, duck: Duck) {
  ctx.save()
  ctx.translate(duck.x, duck.y)
  ctx.rotate(duck.rot)
  ctx.scale(duck.dir, 1)
  const s = duck.size / 110
  ctx.scale(s, s)
  const flap = Math.sin(duck.flap) * 0.55
  ctx.fillStyle = '#f4b400'
  ctx.beginPath()
  ctx.ellipse(-18, 2, 20, 12, 0.5 + flap, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffca28'
  ctx.beginPath()
  ctx.ellipse(0, 8, 48, 28, -0.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffb300'
  ctx.beginPath()
  ctx.ellipse(-6, 4, 18, 16, 0.35 + flap, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffe082'
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
  ctx.lineTo(28, -48)
  ctx.lineTo(38, -28)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(12, -26)
  ctx.lineTo(18, -42)
  ctx.lineTo(26, -26)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#ffe082'
  ctx.beginPath()
  ctx.arc(28, -28, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawDog(ctx: CanvasRenderingContext2D, w: number, h: number, mood: DogMood, t: number) {
  const dirt = h * 0.82
  const x = w * 0.5
  const bounce = mood === 'happy' ? Math.abs(Math.sin(t * 8)) * 10 : 0
  const y = dirt - 8 - bounce
  ctx.save()
  ctx.translate(x, y)
  if (mood === 'scratch') ctx.rotate(-0.12)
  ctx.fillStyle = '#6b3a12'
  ctx.beginPath()
  ctx.ellipse(0, 0, 38, 24, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#c47a2a'
  ctx.beginPath()
  ctx.ellipse(6, 6, 18, 12, 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#4a240c'
  ctx.beginPath()
  ctx.ellipse(-22, -10, 10, 16, 0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(10, -18, 12, 10, -0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#8a4a18'
  ctx.beginPath()
  ctx.arc(18, -22, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1a120c'
  ctx.beginPath()
  ctx.arc(24, -26, 2.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ff8a65'
  ctx.beginPath()
  ctx.ellipse(30, -18, 7, 4, 0.3, 0, Math.PI * 2)
  ctx.fill()
  if (mood === 'happy') {
    ctx.fillStyle = '#ff6b8a'
    ctx.beginPath()
    ctx.ellipse(28, -12, 5, 8, 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#e0a020'
  ctx.fillRect(-8, -8, 28, 6)
  ctx.beginPath()
  ctx.arc(6, -5, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#7a1fa2'
  ctx.beginPath()
  ctx.arc(6, -5, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffc107'
  ctx.beginPath()
  ctx.moveTo(-4, -38)
  ctx.lineTo(6, -52)
  ctx.lineTo(16, -38)
  ctx.closePath()
  ctx.fill()
  if (mood === 'scratch') {
    ctx.strokeStyle = '#4a240c'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(22, 8)
    ctx.quadraticCurveTo(34, -6, 24, -28)
    ctx.stroke()
  }
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

export function HuntGame({
  running,
  paused,
  roundIndex,
  weaponId,
  onShot,
  onHit,
  onHud,
  onClear,
  onFail,
}: HuntGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const onShotRef = useRef(onShot)
  const onHitRef = useRef(onHit)
  const onHudRef = useRef(onHud)
  const onClearRef = useRef(onClear)
  const onFailRef = useRef(onFail)
  const pausedRef = useRef(paused)
  onShotRef.current = onShot
  onHitRef.current = onHit
  onHudRef.current = onHud
  onClearRef.current = onClear
  onFailRef.current = onFail
  pausedRef.current = paused

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const round = huntRoundConfig(roundIndex)
    const weapon = huntWeapon(weaponId)
    const ducks: Duck[] = []
    const flashes: Flash[] = []
    let hits = 0
    let ammo = weapon.ammo
    let ended = false
    let last = performance.now()
    let elapsed = 0
    let cool = 0
    let raf = 0
    let dog: DogMood = 'idle'
    let dogT = 0
    let react = 0
    let waveHits = 0
    let aim = { x: 0, y: 0, hot: 0 }
    let waveReady = true

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
        aim.y = h * 0.38
      }
    }
    resize()
    window.addEventListener('resize', resize)
    const size = () => ({ w: canvas.clientWidth, h: canvas.clientHeight })

    const spawnOne = (attract: boolean) => {
      const { w, h } = size()
      const sizePx = attract ? 120 : round.size
      const fly = attract ? 4.4 : round.flyMin + Math.random() * (round.flyMax - round.flyMin)
      const fromLeft = Math.random() > 0.5
      const dir: 1 | -1 = fromLeft ? 1 : -1
      ducks.push({
        x: fromLeft ? -sizePx : w + sizePx,
        y: h * 0.14 + Math.random() * (h * 0.38),
        vx: dir * ((w + sizePx * 1.6) / fly),
        vy: (Math.random() - 0.5) * 42,
        size: sizePx,
        phase: Math.random() * Math.PI * 2,
        dir,
        state: 'fly',
        rot: 0,
        life: 1,
        flap: Math.random() * 8,
      })
    }

    const startWave = () => {
      const count = running ? round.ducks : 2
      ammo = running ? weapon.ammo : 99
      waveHits = 0
      waveReady = false
      for (let i = 0; i < count; i += 1) spawnOne(!running)
    }

    const flying = () => ducks.filter((duck) => duck.state === 'fly')
    startWave()

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const { w, h } = size()
      const live = running && !pausedRef.current && !ended
      if (live) elapsed += dt
      cool = Math.max(0, cool - dt)
      dogT += dt
      aim.hot = Math.max(0, aim.hot - dt * 3)
      if (react > 0 && !pausedRef.current) react = Math.max(0, react - dt)

      drawSky(ctx, w, h)
      for (const duck of ducks) {
        duck.phase += dt * 8
        duck.flap += dt * (duck.state === 'fly' ? 14 : 4)
        if (!pausedRef.current) {
          if (duck.state === 'fall') {
            duck.vy += 520 * dt
            duck.y += duck.vy * dt
            duck.x += duck.vx * dt * 0.2
            duck.rot += dt * 6 * duck.dir
            duck.life -= dt * 1.15
          } else {
            duck.x += duck.vx * dt
            duck.y += duck.vy * dt + Math.sin(duck.phase) * 18 * dt
          }
        }
      }
      for (let i = ducks.length - 1; i >= 0; i -= 1) {
        const duck = ducks[i]
        const gone = duck.x < -duck.size * 1.6 || duck.x > w + duck.size * 1.6 || duck.y > h + 50 || duck.life <= 0
        if (gone) ducks.splice(i, 1)
      }
      for (const duck of ducks) drawDuck(ctx, duck)
      drawGround(ctx, w, h)
      drawDog(ctx, w, h, dog, dogT)

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

      if (live) {
        if (flying().length === 0 && ducks.length === 0 && react <= 0) {
          if (!waveReady) {
            dog = waveHits > 0 ? 'happy' : 'scratch'
            react = 1.15
            waveReady = true
          } else {
            startWave()
          }
        }
        const remaining = Math.max(0, round.seconds - elapsed)
        onHudRef.current({
          remaining,
          hits,
          required: round.required,
          ammo: Math.min(ammo, weapon.ammo),
          ammoMax: weapon.ammo,
          waveDucks: flying().length,
        })
        if (remaining <= 0) {
          ended = true
          if (hits >= round.required) onClearRef.current()
          else onFailRef.current()
        }
      } else if (!running) {
        if (flying().length === 0 && ducks.length === 0) startWave()
        onHudRef.current({
          remaining: round.seconds,
          hits: 0,
          required: round.required,
          ammo: weapon.ammo,
          ammoMax: weapon.ammo,
          waveDucks: flying().length,
        })
      }
      raf = window.requestAnimationFrame(tick)
    }

    const shoot = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      aim = { x, y, hot: 1 }
      if (!running || pausedRef.current || ended) return
      if (ammo <= 0 || cool > 0) return
      ammo -= 1
      cool = weapon.cooldown
      huntShotSound()
      flashes.push({ x, y, t: 0.28, hit: false })
      onShotRef.current()
      const hit = [...ducks].reverse().find((duck) => {
        if (duck.state !== 'fly') return false
        const r = duck.size * weapon.radius
        return (x - duck.x) ** 2 + (y - duck.y) ** 2 <= r * r
      })
      if (!hit) {
        huntMissSound()
        return
      }
      hit.state = 'fall'
      hit.vy = 36
      hits += 1
      waveHits += 1
      huntHitSound()
      flashes.push({ x: hit.x, y: hit.y, t: 0.4, hit: true })
      onHitRef.current(100)
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
  }, [running, roundIndex, weaponId])

  return <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none" />
}
