import { useEffect, useRef } from 'react'
import { HUNT_LEVELS, type HuntLevelId } from './levels'
import { huntHitSound, huntMissSound, huntShotSound } from './sound'

type Duck = {
  x: number
  y: number
  vx: number
  vy: number
  w: number
  h: number
  phase: number
  alive: boolean
}

type HuntGameProps = {
  levelIndex: number
  onShot: () => void
  onHit: () => void
  onClear: (id: HuntLevelId) => void
  onFail: (id: HuntLevelId) => void
}

export function HuntGame({ levelIndex, onShot, onHit, onClear, onFail }: HuntGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const onShotRef = useRef(onShot)
  const onHitRef = useRef(onHit)
  const onClearRef = useRef(onClear)
  const onFailRef = useRef(onFail)
  onShotRef.current = onShot
  onHitRef.current = onHit
  onClearRef.current = onClear
  onFailRef.current = onFail

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const level = HUNT_LEVELS[levelIndex]
    const ducks: Duck[] = []
    const duckImg = new Image()
    duckImg.src = '/duck.svg'
    let spawned = 0
    let hits = 0
    let escaped = 0
    let ended = false
    let last = performance.now()
    let spawnAt = 0
    let raf = 0
    const flashes: { x: number; y: number; t: number }[] = []

    const resize = () => {
      const parent = canvas.parentElement
      const w = parent?.clientWidth ?? 360
      const h = Math.max(280, Math.round(w * 0.72))
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const size = () => ({ w: canvas.clientWidth, h: canvas.clientHeight })

    const spawn = () => {
      if (spawned >= level.spawn) return
      const { w, h } = size()
      const fromLeft = spawned % 2 === 0
      const duckW = 56
      const duckH = 56
      const speed = level.speed * (0.88 + Math.random() * 0.28)
      ducks.push({
        x: fromLeft ? -duckW : w + 8,
        y: 28 + Math.random() * (h * 0.55),
        vx: (fromLeft ? 1 : -1) * speed,
        vy: (Math.random() - 0.5) * 40,
        w: duckW,
        h: duckH,
        phase: Math.random() * Math.PI * 2,
        alive: true,
      })
      spawned += 1
    }

    const finishWin = () => {
      if (ended) return
      ended = true
      onClearRef.current(level.id)
    }
    const finishFail = () => {
      if (ended) return
      ended = true
      huntMissSound()
      onFailRef.current(level.id)
    }

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const { w, h } = size()
      ctx.fillStyle = '#0f1a12'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#16301c'
      ctx.fillRect(0, h * 0.78, w, h * 0.22)
      ctx.fillStyle = '#c9a227'
      ctx.fillRect(0, h * 0.78, w, 3)

      spawnAt += dt * 1000
      if (spawnAt >= level.spawnMs) {
        spawnAt = 0
        spawn()
      }

      for (const duck of ducks) {
        if (!duck.alive) continue
        duck.phase += dt * level.flap
        duck.x += duck.vx * dt
        duck.y += duck.vy * dt + Math.sin(duck.phase) * 18 * dt * 8
        if (duck.y < 8) duck.y = 8
        if (duck.y > h * 0.62) duck.y = h * 0.62
        const gone = duck.vx > 0 ? duck.x > w + 8 : duck.x + duck.w < -8
        if (gone) {
          duck.alive = false
          escaped += 1
          if (hits + (level.spawn - escaped - hits) < level.required) finishFail()
        }
      }

      for (const duck of ducks) {
        if (!duck.alive) continue
        ctx.save()
        ctx.translate(duck.x + duck.w / 2, duck.y + duck.h / 2)
        ctx.scale(duck.vx < 0 ? -1 : 1, 1)
        if (duckImg.complete && duckImg.naturalWidth > 0) {
          ctx.drawImage(duckImg, -duck.w / 2, -duck.h / 2, duck.w, duck.h)
        } else {
          ctx.fillStyle = '#ffc107'
          ctx.beginPath()
          ctx.ellipse(0, 4, 22, 16, 0, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }

      for (let i = flashes.length - 1; i >= 0; i -= 1) {
        const flash = flashes[i]
        flash.t -= dt
        if (flash.t <= 0) {
          flashes.splice(i, 1)
          continue
        }
        ctx.strokeStyle = `rgba(255, 236, 179, ${flash.t * 2})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(flash.x, flash.y, 14 + (1 - flash.t) * 18, 0, Math.PI * 2)
        ctx.stroke()
      }

      ctx.fillStyle = '#ffe082'
      ctx.font = '700 13px ui-sans-serif, system-ui'
      ctx.fillText(`${hits} / ${level.required}`, 12, 22)

      if (!ended && hits >= level.required) finishWin()
      if (!ended && spawned >= level.spawn && ducks.every((duck) => !duck.alive) && hits < level.required) {
        finishFail()
      }
      if (!ended) raf = window.requestAnimationFrame(tick)
    }

    const shoot = (clientX: number, clientY: number) => {
      if (ended) return
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      huntShotSound()
      onShotRef.current()
      flashes.push({ x, y, t: 0.22 })
      const hit = [...ducks].reverse().find(
        (duck) => duck.alive && x >= duck.x && x <= duck.x + duck.w && y >= duck.y && y <= duck.y + duck.h,
      )
      if (hit) {
        hit.alive = false
        hits += 1
        huntHitSound()
        onHitRef.current()
        if (hits >= level.required) finishWin()
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
  }, [levelIndex])

  return (
    <canvas
      ref={canvasRef}
      className="block w-full touch-none rounded-2xl border border-amber-400/30 bg-[#0f1a12]"
    />
  )
}
