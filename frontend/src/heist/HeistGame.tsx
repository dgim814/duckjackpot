import { useEffect, useRef } from 'react'
import WebApp from '@twa-dev/sdk'
import { useI18n } from '../i18n/LanguageProvider'
import { punchBackdrop } from './sprite'

const SPRITE = '/heist/duck.png'
const COLS = 8
const ROWS = 8
const SPEED = 2.35
const LOOT_VALUES = [120, 400, 900]

type Pt = { x: number; y: number }
type Mode = 'play' | 'choice' | 'flee' | 'done'

export type HeistEnd = { verdict: 'escaped' | 'caught'; loot: number }

type HeistGameProps = {
  running: boolean
  onDone: (end: HeistEnd) => void
}

function telegramApp() {
  const tg = (window as Window & { Telegram?: { WebApp?: typeof WebApp } }).Telegram?.WebApp
  return tg ?? WebApp
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function normAngle(a: number) {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

function canSee(eye: Pt, facing: number, fov: number, range: number, target: Pt) {
  const dx = target.x - eye.x
  const dy = target.y - eye.y
  const dist = Math.hypot(dx, dy)
  if (dist > range || dist < 0.12) return false
  return Math.abs(normAngle(Math.atan2(dy, dx) - facing)) < fov / 2
}

export function HeistGame({ running, onDone }: HeistGameProps) {
  const { t } = useI18n()
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const tRef = useRef(t)
  tRef.current = t

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const sprite = new Image()
    let spriteOk = false
    let spriteGfx: CanvasImageSource | null = null
    const useSprite = () => {
      if (sprite.naturalWidth <= 0) return
      spriteOk = true
      spriteGfx = punchBackdrop(sprite)
    }
    const waitSprite = () => {
      if (sprite.naturalWidth > 0) useSprite()
      else requestAnimationFrame(waitSprite)
    }
    sprite.onload = waitSprite
    sprite.src = SPRITE
    waitSprite()

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let W = 390
    let H = 640
    let floor = {
      bl: { x: 0, y: 0 },
      br: { x: 0, y: 0 },
      fl: { x: 0, y: 0 },
      fr: { x: 0, y: 0 },
    }
    let wallH = 70

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const toScreen = (wx: number, wy: number, z = 0) => {
      const u = wx / COLS
      const v = wy / ROWS
      const topX = lerp(floor.bl.x, floor.br.x, u)
      const botX = lerp(floor.fl.x, floor.fr.x, u)
      const topY = lerp(floor.bl.y, floor.br.y, u)
      const botY = lerp(floor.fl.y, floor.fr.y, u)
      return {
        x: lerp(topX, botX, v),
        y: lerp(topY, botY, v) - z,
      }
    }

    const toWorld = (sx: number, sy: number): Pt => {
      const v = clamp((sy - floor.bl.y) / Math.max(8, floor.fl.y - floor.bl.y), 0, 1)
      const left = lerp(floor.bl.x, floor.fl.x, v)
      const right = lerp(floor.br.x, floor.fr.x, v)
      const u = clamp((sx - left) / Math.max(8, right - left), 0, 1)
      return { x: u * COLS, y: v * ROWS }
    }

    const player = { x: 2.35, y: 6.45, facing: 1 as 1 | -1 }
    const target = { x: 2.35, y: 6.45 }
    const lootTaken = [false, false, false]
    let lootTotal = 0
    let deepest = 0
    let mode: Mode = 'play'
    let ended: HeistEnd | null = null
    let time = 0
    let choiceDepth = 0
    let escapeArmed = false

    const camera = { x: 4, y: 0.35, facing: Math.PI / 2 }
    const guard = { x: 1.6, y: 4.2, dir: 1, wait: 0, facing: 0 }
    const lootSpots: Pt[] = [
      { x: 3.35, y: 4.7 },
      { x: 5.2, y: 2.35 },
      { x: 5.85, y: 1.65 },
    ]
    const safe = { x: 6.55, y: 0.95 }
    const exit = { x: 0.55, y: 6.55 }

    const rebuild = () => {
      const rect = wrap.getBoundingClientRect()
      W = Math.max(280, Math.floor(rect.width))
      H = Math.max(420, Math.floor(rect.height))
      canvas.width = Math.floor(W * dpr)
      canvas.height = Math.floor(H * dpr)
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      wallH = 68
      const top = 52 + wallH
      const bot = H - 64
      floor = {
        bl: { x: W * 0.14, y: top },
        br: { x: W * 0.86, y: top },
        fl: { x: W * 0.05, y: bot },
        fr: { x: W * 0.95, y: bot },
      }
    }

    rebuild()
    const ro = new ResizeObserver(rebuild)
    ro.observe(wrap)

    const html = document.documentElement
    const body = document.body
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
    }
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    html.style.overscrollBehavior = 'none'
    body.style.overscrollBehavior = 'none'
    const tg = telegramApp()
    try {
      tg.expand?.()
      const disable = (tg as { disableVerticalSwipes?: () => void }).disableVerticalSwipes
      disable?.()
    } catch {
      /* ignore */
    }

    const snapTile = (p: Pt) => ({
      x: clamp(Math.floor(p.x) + 0.5, 0.5, COLS - 0.5),
      y: clamp(Math.floor(p.y) + 0.5, 0.5, ROWS - 0.5),
    })

    const toLocal = (e: PointerEvent): Pt => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    const lootScreen = (i: number) => {
      const p = lootSpots[i]
      return toScreen(p.x, p.y, 10)
    }

    const onTap = (e: PointerEvent) => {
      if (mode === 'choice' || mode === 'done') return
      e.preventDefault()
      const p = toLocal(e)
      for (let i = 0; i <= Math.min(deepest, 2); i += 1) {
        if (lootTaken[i]) continue
        const s = lootScreen(i)
        if (Math.hypot(p.x - s.x, p.y - s.y) < 36) {
          target.x = lootSpots[i].x
          target.y = lootSpots[i].y
          if (Math.hypot(player.x - lootSpots[i].x, player.y - lootSpots[i].y) < 0.55) tryTakeLoot()
          return
        }
      }
      const tile = snapTile(toWorld(p.x, p.y))
      target.x = tile.x
      target.y = tile.y
    }

    const stopTouchScroll = (e: TouchEvent) => {
      e.preventDefault()
    }

    canvas.addEventListener('pointerdown', onTap)
    wrap.addEventListener('touchmove', stopTouchScroll, { passive: false })
    canvas.addEventListener('touchmove', stopTouchScroll, { passive: false })
    document.addEventListener('touchmove', stopTouchScroll, { passive: false })

    const finish = (verdict: HeistEnd['verdict']) => {
      if (ended) return
      ended = { verdict, loot: lootTotal }
      mode = 'done'
      onDoneRef.current(ended)
    }

    const panel = wrap.querySelector<HTMLElement>('.heist-choice')
    const hintEl = wrap.querySelector<HTMLElement>('[data-heist-hint]')
    const vaultEl = wrap.querySelector<HTMLElement>('[data-heist-vault]')
    const deeperBtn = wrap.querySelector<HTMLElement>('[data-heist="deeper"]')
    const choiceGrid = wrap.querySelector<HTMLElement>('[data-heist-grid]')

    const syncChoiceUi = () => {
      if (!panel) return
      const show = mode === 'choice'
      panel.classList.toggle('hidden', !show)
      panel.setAttribute('aria-hidden', show ? 'false' : 'true')
      if (!show) return
      const last = choiceDepth >= 2
      hintEl?.classList.toggle('hidden', last)
      vaultEl?.classList.toggle('hidden', !last)
      deeperBtn?.classList.toggle('hidden', last)
      choiceGrid?.classList.toggle('grid-cols-2', !last)
      choiceGrid?.classList.toggle('grid-cols-1', last)
    }

    const tryTakeLoot = () => {
      if (mode !== 'play') return
      for (let i = 0; i <= Math.min(deepest, 2); i += 1) {
        if (lootTaken[i]) continue
        const p = lootSpots[i]
        if (Math.hypot(player.x - p.x, player.y - p.y) > 0.5) continue
        lootTaken[i] = true
        lootTotal += LOOT_VALUES[i]
        choiceDepth = i
        mode = 'choice'
        syncChoiceUi()
      }
    }

    const onChoiceClick = (e: MouseEvent) => {
      const node = e.target as HTMLElement | null
      const act = node?.closest('[data-heist]')?.getAttribute('data-heist')
      if (!act || mode !== 'choice') return
      if (act === 'leave') {
        escapeArmed = false
        mode = 'flee'
        target.x = exit.x
        target.y = exit.y
      }
      if (act === 'deeper') {
        deepest = Math.max(deepest, choiceDepth + 1)
        mode = 'play'
      }
      syncChoiceUi()
    }
    wrap.addEventListener('click', onChoiceClick)

    const blockAt = (x: number, y: number) => {
      if (x < 0.4 || y < 0.4 || x > COLS - 0.4 || y > ROWS - 0.4) return true
      if (Math.hypot(x - safe.x, y - safe.y) < 0.62) return true
      return false
    }

    const moveToward = (ent: Pt, dest: Pt, speed: number, dt: number) => {
      const dx = dest.x - ent.x
      const dy = dest.y - ent.y
      const dist = Math.hypot(dx, dy)
      if (dist < 0.04) return 0
      const step = Math.min(dist, speed * dt)
      const nx = ent.x + (dx / dist) * step
      const ny = ent.y + (dy / dist) * step
      if (!blockAt(nx, ent.y)) ent.x = nx
      if (!blockAt(ent.x, ny)) ent.y = ny
      return dx
    }

    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      if (!running || mode === 'done') {
        draw()
        return
      }
      time += dt
      camera.facing = Math.PI / 2 + Math.sin(time * 0.7) * 0.72

      if (guard.wait > 0) guard.wait -= dt
      else {
        guard.x += guard.dir * 1.15 * dt
        if (guard.x > 6.2) {
          guard.x = 6.2
          guard.dir = -1
          guard.wait = 0.4
        }
        if (guard.x < 1.5) {
          guard.x = 1.5
          guard.dir = 1
          guard.wait = 0.4
        }
        guard.facing = guard.dir > 0 ? 0 : Math.PI
      }

      if (mode === 'play' || mode === 'flee') {
        const dx = moveToward(player, target, SPEED, dt)
        if (Math.abs(dx) > 0.002) player.facing = dx >= 0 ? 1 : -1
        tryTakeLoot()
        if (mode === 'flee') {
          if (Math.hypot(player.x - exit.x, player.y - exit.y) > 0.7) escapeArmed = true
          if (escapeArmed && Math.hypot(player.x - exit.x, player.y - exit.y) < 0.45) finish('escaped')
        }
      }

      if (mode === 'play' || mode === 'flee') {
        const camRange = 2.45
        const guardRange = 1.85
        if (canSee(camera, camera.facing, 0.7, camRange, player)) finish('caught')
        else if (canSee(guard, guard.facing, 1.05, guardRange, player)) finish('caught')
      }

      draw()
    }

    function diamond(i: number, j: number) {
      return [toScreen(i, j), toScreen(i + 1, j), toScreen(i + 1, j + 1), toScreen(i, j + 1)]
    }

    function fillPoly(pts: Pt[], fill: string, stroke?: string) {
      if (!ctx) return
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.closePath()
      ctx.fillStyle = fill
      ctx.fill()
      if (stroke) {
        ctx.strokeStyle = stroke
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    function drawFloorCone(eye: Pt, facing: number, fov: number, range: number, color: string) {
      if (!ctx) return
      ctx.save()
      ctx.fillStyle = color
      ctx.beginPath()
      const o = toScreen(eye.x, eye.y, 2)
      ctx.moveTo(o.x, o.y)
      const steps = 14
      for (let i = 0; i <= steps; i += 1) {
        const a = facing - fov / 2 + (fov * i) / steps
        const p = toScreen(eye.x + Math.cos(a) * range, eye.y + Math.sin(a) * range, 2)
        ctx.lineTo(p.x, p.y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    function drawBox(wx: number, wy: number, sx: number, sy: number, hz: number, top: string, left: string, right: string) {
      const a = toScreen(wx, wy, 0)
      const b = toScreen(wx + sx, wy, 0)
      const c = toScreen(wx + sx, wy + sy, 0)
      const d = toScreen(wx, wy + sy, 0)
      const a2 = { x: a.x, y: a.y - hz }
      const b2 = { x: b.x, y: b.y - hz }
      const c2 = { x: c.x, y: c.y - hz }
      const d2 = { x: d.x, y: d.y - hz }
      fillPoly([d, c, c2, d2], left)
      fillPoly([b, c, c2, b2], right)
      fillPoly([a2, b2, c2, d2], top)
    }

    function draw() {
      if (!ctx) return
      const tt = tRef.current
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#24160f')
      bg.addColorStop(1, '#09080c')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      for (let j = 0; j < ROWS; j += 1) {
        for (let i = 0; i < COLS; i += 1) {
          const light = (i + j) % 2 === 0
          fillPoly(diamond(i, j), light ? '#3a322c' : '#2a2420', 'rgba(0,0,0,0.25)')
        }
      }

      for (let i = 0; i < COLS; i += 1) {
        const a = toScreen(i, 0)
        const b = toScreen(i + 1, 0)
        fillPoly(
          [
            { x: a.x, y: a.y },
            { x: b.x, y: b.y },
            { x: b.x, y: b.y - wallH },
            { x: a.x, y: a.y - wallH },
          ],
          i % 2 ? '#5a4638' : '#4a3a30',
          '#2a2018',
        )
      }
      for (let j = 0; j < ROWS; j += 1) {
        const a = toScreen(0, j)
        const b = toScreen(0, j + 1)
        fillPoly(
          [
            { x: a.x, y: a.y },
            { x: b.x, y: b.y },
            { x: b.x, y: b.y - wallH },
            { x: a.x, y: a.y - wallH },
          ],
          j % 2 ? '#3d312a' : '#342922',
          '#211810',
        )
        const c = toScreen(COLS, j)
        const d = toScreen(COLS, j + 1)
        fillPoly(
          [
            { x: c.x, y: c.y },
            { x: d.x, y: d.y },
            { x: d.x, y: d.y - wallH },
            { x: c.x, y: c.y - wallH },
          ],
          j % 2 ? '#4a3c32' : '#40342c',
          '#211810',
        )
      }

      const camRange = 2.45
      const guardRange = 1.85
      drawFloorCone(camera, camera.facing, 0.7, camRange, 'rgba(255, 64, 64, 0.28)')
      drawFloorCone(guard, guard.facing, 1.05, guardRange, 'rgba(255, 170, 40, 0.16)')

      const door = toScreen(exit.x, exit.y, 0)
      ctx.fillStyle = '#1b3d28'
      ctx.fillRect(door.x - 16, door.y - 52, 32, 56)
      ctx.fillStyle = '#7dffb0'
      ctx.font = '800 10px Unbounded, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('EXIT', door.x, door.y - 58)

      drawBox(safe.x - 0.35, safe.y - 0.28, 0.8, 0.7, 34, '#c9a227', '#8a7018', '#6e5810')
      ctx.fillStyle = '#2a1c08'
      const safeTop = toScreen(safe.x, safe.y, 34)
      ctx.font = '800 13px Unbounded, sans-serif'
      ctx.fillText('SAFE', safeTop.x, safeTop.y + 4)

      const cam = toScreen(camera.x, camera.y, wallH - 10)
      ctx.fillStyle = '#1a1a1e'
      ctx.fillRect(cam.x - 11, cam.y - 8, 22, 14)
      ctx.fillStyle = '#ff3b3b'
      ctx.fillRect(cam.x - 5, cam.y - 3, 10, 7)

      for (let i = 0; i <= Math.min(deepest, 2); i += 1) {
        if (lootTaken[i]) continue
        const s = lootScreen(i)
        ctx.fillStyle = '#e0b43a'
        ctx.beginPath()
        ctx.roundRect(s.x - 14, s.y - 12, 28, 22, 4)
        ctx.fill()
        ctx.fillStyle = '#2a1c08'
        ctx.font = '800 14px Unbounded, sans-serif'
        ctx.fillText('$', s.x, s.y + 5)
      }

      const gs = toScreen(guard.x, guard.y, 0)
      const gh = Math.max(28, (floor.fl.y - floor.bl.y) * 0.07)
      ctx.fillStyle = '#2a3340'
      ctx.fillRect(gs.x - gh * 0.28, gs.y - gh, gh * 0.56, gh)
      ctx.fillStyle = '#d7c38a'
      ctx.fillRect(gs.x - gh * 0.2, gs.y - gh * 1.32, gh * 0.4, gh * 0.36)
      ctx.fillStyle = '#111'
      ctx.fillRect(gs.x - gh * 0.22, gs.y - gh * 1.12, gh * 0.44, gh * 0.14)

      if (spriteOk && spriteGfx) {
        const s = toScreen(player.x, player.y, 0)
        const h = Math.round(Math.max(72, (floor.fl.y - floor.bl.y) * 0.2))
        const w = h
        ctx.save()
        ctx.translate(s.x, s.y)
        ctx.scale(player.facing, 1)
        ctx.drawImage(spriteGfx, -w / 2, -h * 0.92, w, h)
        ctx.restore()
      }

      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(0, 0, W, 44)
      ctx.fillStyle = '#ffd54f'
      ctx.font = '800 13px Unbounded, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('BANK', 12, 28)
      ctx.textAlign = 'right'
      ctx.fillText(`${tt('heistLoot')} ${lootTotal}`, W - 12, 28)

      if (mode === 'choice') {
        ctx.fillStyle = 'rgba(8,6,8,0.55)'
        ctx.fillRect(0, 0, W, H)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      wrap.removeEventListener('click', onChoiceClick)
      wrap.removeEventListener('touchmove', stopTouchScroll)
      canvas.removeEventListener('pointerdown', onTap)
      canvas.removeEventListener('touchmove', stopTouchScroll)
      document.removeEventListener('touchmove', stopTouchScroll)
      html.style.overflow = prev.htmlOverflow
      body.style.overflow = prev.bodyOverflow
      html.style.overscrollBehavior = prev.htmlOverscroll
      body.style.overscrollBehavior = prev.bodyOverscroll
      try {
        const enable = (telegramApp() as { enableVerticalSwipes?: () => void }).enableVerticalSwipes
        enable?.()
      } catch {
        /* ignore */
      }
    }
  }, [running])

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full touch-none overscroll-none select-none"
      style={{ touchAction: 'none', overscrollBehavior: 'none' }}
    >
      <canvas ref={canvasRef} className="block h-full w-full touch-none overscroll-none" style={{ touchAction: 'none', overscrollBehavior: 'none' }} />
      <ChoiceOverlay />
    </div>
  )
}

function ChoiceOverlay() {
  const { t } = useI18n()
  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-[max(18px,env(safe-area-inset-bottom))] z-10 flex flex-col items-center">
      <div className="heist-choice pointer-events-auto hidden w-full max-w-sm rounded-2xl border border-amber-400/40 bg-[#120c10]/92 p-3 text-center backdrop-blur-md" aria-hidden>
        <p data-heist-hint className="text-xs font-semibold text-amber-50/90">
          {t('heistChoiceHint')}
        </p>
        <p data-heist-vault className="hidden text-xs font-semibold text-amber-50/90">
          {t('heistVaultHint')}
        </p>
        <div data-heist-grid className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" data-heist="leave" className="rounded-xl border border-white/15 px-3 py-3 text-sm font-black text-zinc-100">
            {t('heistLeave')}
          </button>
          <button type="button" data-heist="deeper" className="buy-btn rounded-xl px-3 py-3 text-sm font-black text-zinc-950">
            {t('heistDeeper')}
          </button>
        </div>
      </div>
    </div>
  )
}
