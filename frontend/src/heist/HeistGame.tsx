import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n/LanguageProvider'

const SPRITE = '/heist/duck.png'
const PLAYER_R = 18
const SPEED = 165
const LOOT_VALUES = [120, 350, 900]

type Rect = { x: number; y: number; w: number; h: number }
type Pt = { x: number; y: number }

export type HeistEnd = { verdict: 'escaped' | 'caught'; loot: number }

type HeistGameProps = {
  running: boolean
  onDone: (end: HeistEnd) => void
}

type Mode = 'play' | 'choice' | 'flee' | 'done'

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function normAngle(a: number) {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

function inRect(p: Pt, r: Rect, pad = 0) {
  return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad
}

function resolveWalls(p: Pt, r: number, walls: Rect[]) {
  let { x, y } = p
  for (const w of walls) {
    const nx = clamp(x, w.x, w.x + w.w)
    const ny = clamp(y, w.y, w.y + w.h)
    let dx = x - nx
    let dy = y - ny
    const d2 = dx * dx + dy * dy
    if (d2 >= r * r) continue
    if (d2 < 0.0001) {
      const left = x - w.x
      const right = w.x + w.w - x
      const top = y - w.y
      const bottom = w.y + w.h - y
      const m = Math.min(left, right, top, bottom)
      if (m === left) x = w.x - r
      else if (m === right) x = w.x + w.w + r
      else if (m === top) y = w.y - r
      else y = w.y + w.h + r
      continue
    }
    const d = Math.sqrt(d2)
    x += (dx / d) * (r - d)
    y += (dy / d) * (r - d)
  }
  return { x, y }
}

function losBlocked(a: Pt, b: Pt, walls: Rect[]) {
  const steps = 18
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps
    const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    for (const w of walls) {
      if (inRect(p, w, -1)) return true
    }
  }
  return false
}

function canSee(eye: Pt, facing: number, fov: number, range: number, target: Pt, walls: Rect[]) {
  const dx = target.x - eye.x
  const dy = target.y - eye.y
  const dist = Math.hypot(dx, dy)
  if (dist > range || dist < 6) return false
  if (Math.abs(normAngle(Math.atan2(dy, dx) - facing)) > fov / 2) return false
  return !losBlocked(eye, target, walls)
}

function drawCone(
  ctx: CanvasRenderingContext2D,
  eye: Pt,
  facing: number,
  fov: number,
  range: number,
  color: string,
) {
  ctx.save()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(eye.x, eye.y)
  ctx.arc(eye.x, eye.y, range, facing - fov / 2, facing + fov / 2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function punchBackdrop(img: HTMLImageElement) {
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const x = c.getContext('2d')
  if (!x) return img
  x.drawImage(img, 0, 0)
  const data = x.getImageData(0, 0, c.width, c.height)
  const d = data.data
  const w = c.width
  const h = c.height
  const white = (i: number) => d[i + 3] > 8 && d[i] > 232 && d[i + 1] > 232 && d[i + 2] > 232
  const seen = new Uint8Array(w * h)
  const stack: number[] = []
  const push = (px: number, py: number) => {
    if (px < 0 || py < 0 || px >= w || py >= h) return
    stack.push(py * w + px)
  }
  for (let i = 0; i < w; i += 1) {
    push(i, 0)
    push(i, h - 1)
  }
  for (let j = 0; j < h; j += 1) {
    push(0, j)
    push(w - 1, j)
  }
  while (stack.length) {
    const p = stack.pop()
    if (p === undefined || seen[p]) continue
    seen[p] = 1
    const i = p * 4
    if (!white(i) && d[i + 3] > 16) continue
    d[i + 3] = 0
    const px = p % w
    const py = (p / w) | 0
    push(px + 1, py)
    push(px - 1, py)
    push(px, py + 1)
    push(px, py - 1)
  }
  x.putImageData(data, 0, 0)
  return c
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
    sprite.onload = useSprite
    sprite.src = SPRITE
    if (sprite.complete) useSprite()

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let W = 390
    let H = 640
    const layout = {
      rooms: [] as Rect[],
      walls: [] as Rect[],
      doorGaps: [] as Rect[],
      exit: { x: 0, y: 0, w: 0, h: 0 } as Rect,
    }

    const player = { x: 70, y: 320, facing: 1 as 1 | -1 }
    const target = { x: 70, y: 320 }
    let pointer: Pt | null = null
    const lootTaken = [false, false, false]
    let lootTotal = 0
    let deepest = 0
    let mode: Mode = 'play'
    let ended: HeistEnd | null = null
    let time = 0
    let choiceRoom = 0
    let escapeArmed = false

    const camera = { x: 0, y: 0, facing: 0.4 }
    const guard = { x: 0, y: 0, dir: 1, wait: 0, facing: 0 }

    const rebuild = () => {
      const rect = wrap.getBoundingClientRect()
      W = Math.max(280, Math.floor(rect.width))
      H = Math.max(420, Math.floor(rect.height))
      canvas.width = Math.floor(W * dpr)
      canvas.height = Math.floor(H * dpr)
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const pad = 10
      const top = 52
      const bot = 10
      const innerW = W - pad * 2
      const innerH = H - top - bot
      const rw = innerW / 3
      layout.rooms = [
        { x: pad, y: top, w: rw, h: innerH },
        { x: pad + rw, y: top, w: rw, h: innerH },
        { x: pad + rw * 2, y: top, w: rw, h: innerH },
      ]
      const [a, b] = layout.rooms
      const thick = 10
      const doorH = Math.min(92, innerH * 0.28)
      const doorY = a.y + innerH * 0.52 - doorH / 2
      layout.doorGaps = [
        { x: a.x + a.w - thick / 2, y: doorY, w: thick, h: doorH },
        { x: b.x + b.w - thick / 2, y: doorY, w: thick, h: doorH },
      ]
      layout.walls = [
        { x: pad - thick, y: top - thick, w: innerW + thick * 2, h: thick },
        { x: pad - thick, y: top + innerH, w: innerW + thick * 2, h: thick },
        { x: pad - thick, y: top, w: thick, h: innerH },
        { x: pad + innerW, y: top, w: thick, h: innerH },
        { x: a.x + a.w - thick / 2, y: a.y, w: thick, h: doorY - a.y },
        { x: a.x + a.w - thick / 2, y: doorY + doorH, w: thick, h: a.y + a.h - (doorY + doorH) },
        { x: b.x + b.w - thick / 2, y: b.y, w: thick, h: doorY - b.y },
        { x: b.x + b.w - thick / 2, y: doorY + doorH, w: thick, h: b.y + b.h - (doorY + doorH) },
      ]
      layout.exit = { x: a.x + 6, y: a.y + a.h * 0.62, w: 34, h: 28 }
      camera.x = a.x + a.w * 0.55
      camera.y = a.y + 22
      guard.x = b.x + b.w * 0.5
      guard.y = b.y + b.h * 0.35
      if (time === 0) {
        player.x = a.x + 52
        player.y = a.y + a.h * 0.82
        target.x = player.x
        target.y = player.y
      }
    }

    rebuild()
    const ro = new ResizeObserver(rebuild)
    ro.observe(wrap)

    const toLocal = (e: PointerEvent): Pt => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    const onDown = (e: PointerEvent) => {
      if (mode === 'choice' || mode === 'done') return
      canvas.setPointerCapture(e.pointerId)
      pointer = toLocal(e)
      target.x = pointer.x
      target.y = pointer.y
    }
    const onMove = (e: PointerEvent) => {
      if (!pointer) return
      pointer = toLocal(e)
      target.x = pointer.x
      target.y = pointer.y
    }
    const onUp = () => {
      pointer = null
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)

    const wallsNow = () => {
      const extra: Rect[] = []
      if (deepest < 1) extra.push(layout.doorGaps[0])
      if (deepest < 2) extra.push(layout.doorGaps[1])
      return [...layout.walls, ...extra]
    }

    const lootPos = (i: number): Pt => {
      const room = layout.rooms[i]
      if (i === 0) return { x: room.x + room.w * 0.72, y: room.y + room.h * 0.28 }
      if (i === 1) return { x: room.x + room.w * 0.28, y: room.y + room.h * 0.22 }
      return { x: room.x + room.w * 0.62, y: room.y + room.h * 0.48 }
    }

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
      const vault = choiceRoom >= 2
      hintEl?.classList.toggle('hidden', vault)
      vaultEl?.classList.toggle('hidden', !vault)
      deeperBtn?.classList.toggle('hidden', vault)
      choiceGrid?.classList.toggle('grid-cols-2', !vault)
      choiceGrid?.classList.toggle('grid-cols-1', vault)
    }

    const tryTakeLoot = () => {
      if (mode !== 'play') return
      for (let i = 0; i <= Math.min(deepest, 2); i += 1) {
        if (lootTaken[i]) continue
        const p = lootPos(i)
        if (Math.hypot(player.x - p.x, player.y - p.y) > 28) continue
        lootTaken[i] = true
        lootTotal += LOOT_VALUES[i]
        choiceRoom = i
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
      }
      if (act === 'deeper') {
        deepest = Math.max(deepest, choiceRoom + 1)
        mode = 'play'
      }
      syncChoiceUi()
    }
    wrap.addEventListener('click', onChoiceClick)

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

      const walls = wallsNow()
      camera.facing = 0.55 + Math.sin(time * 0.85) * 1.05
      const hall = layout.rooms[1]
      if (guard.wait > 0) guard.wait -= dt
      else {
        guard.y += guard.dir * 70 * dt
        if (guard.y > hall.y + hall.h * 0.82) {
          guard.y = hall.y + hall.h * 0.82
          guard.dir = -1
          guard.wait = 0.45
        }
        if (guard.y < hall.y + hall.h * 0.22) {
          guard.y = hall.y + hall.h * 0.22
          guard.dir = 1
          guard.wait = 0.45
        }
        guard.facing = guard.dir > 0 ? Math.PI / 2 : -Math.PI / 2
      }

      if (mode === 'play' || mode === 'flee') {
        const dx = target.x - player.x
        const dy = target.y - player.y
        const dist = Math.hypot(dx, dy)
        if (dist > 3) {
          const step = Math.min(dist, SPEED * dt)
          player.x += (dx / dist) * step
          player.y += (dy / dist) * step
          if (Math.abs(dx) > 4) player.facing = dx >= 0 ? 1 : -1
        }
        const next = resolveWalls(player, PLAYER_R, walls)
        player.x = next.x
        player.y = next.y
        tryTakeLoot()
        if (mode === 'flee') {
          if (!inRect(player, layout.exit, 10)) escapeArmed = true
          if (escapeArmed && inRect(player, layout.exit, 4)) finish('escaped')
        }
      }

      if (mode === 'play' || mode === 'flee') {
        const camRange = Math.min(layout.rooms[0].w * 0.72, 150)
        const guardRange = Math.min(layout.rooms[1].w * 0.7, 130)
        if (canSee(camera, camera.facing, 0.72, camRange, player, walls)) finish('caught')
        else if (canSee(guard, guard.facing, 0.95, guardRange, player, walls)) finish('caught')
      }

      draw()
    }

    function draw() {
      if (!ctx) return
      const tt = tRef.current
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#1a1210')
      bg.addColorStop(1, '#0b0809')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      const names = [tt('heistRoomLobby'), tt('heistRoomHall'), tt('heistRoomVault')]
      layout.rooms.forEach((room, i) => {
        ctx.fillStyle = i === 2 ? '#2a2114' : i === 1 ? '#1c181c' : '#1a2024'
        ctx.fillRect(room.x, room.y, room.w, room.h)
        ctx.fillStyle = 'rgba(255,193,7,0.06)'
        for (let y = room.y + 16; y < room.y + room.h; y += 22) {
          ctx.fillRect(room.x + 6, y, room.w - 12, 1)
        }
        ctx.fillStyle = '#c9a227'
        ctx.font = '700 11px Unbounded, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(i === 2 ? 'VAULT' : i === 0 ? 'BANK' : names[i].toUpperCase(), room.x + room.w / 2, room.y + 18)
      })

      const camRange = Math.min(layout.rooms[0].w * 0.72, 150)
      const guardRange = Math.min(layout.rooms[1].w * 0.7, 130)
      drawCone(ctx, camera, camera.facing, 0.72, camRange, 'rgba(255, 70, 70, 0.22)')
      drawCone(ctx, guard, guard.facing, 0.95, guardRange, 'rgba(255, 160, 40, 0.2)')

      ctx.fillStyle = '#3a3a42'
      for (const w of wallsNow()) ctx.fillRect(w.x, w.y, w.w, w.h)
      ctx.fillStyle = '#6a6458'
      for (const w of layout.walls) ctx.fillRect(w.x, w.y, w.w, w.h)

      const doorOpen = (gap: Rect, open: boolean) => {
        if (open) {
          ctx.fillStyle = 'rgba(80, 220, 140, 0.35)'
          ctx.fillRect(gap.x - 2, gap.y, gap.w + 4, gap.h)
        }
      }
      doorOpen(layout.doorGaps[0], deepest >= 1)
      doorOpen(layout.doorGaps[1], deepest >= 2)

      ctx.fillStyle = '#14301c'
      ctx.fillRect(layout.exit.x, layout.exit.y, layout.exit.w, layout.exit.h)
      ctx.fillStyle = '#7dffb0'
      ctx.font = '800 10px Unbounded, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('EXIT', layout.exit.x + layout.exit.w / 2, layout.exit.y + layout.exit.h / 2 + 3)

      ctx.fillStyle = '#1a1a1e'
      ctx.beginPath()
      ctx.roundRect(camera.x - 10, camera.y - 8, 20, 14, 3)
      ctx.fill()
      ctx.fillStyle = '#ff4d4d'
      ctx.fillRect(camera.x - 4, camera.y - 3, 8, 6)

      ctx.fillStyle = '#2a3340'
      ctx.beginPath()
      ctx.roundRect(guard.x - 12, guard.y - 16, 24, 32, 4)
      ctx.fill()
      ctx.fillStyle = '#d7c38a'
      ctx.fillRect(guard.x - 7, guard.y - 22, 14, 10)
      ctx.fillStyle = '#111'
      ctx.fillRect(guard.x - 8, guard.y - 18, 16, 5)

      for (let i = 0; i < 3; i += 1) {
        if (lootTaken[i]) continue
        const p = lootPos(i)
        ctx.fillStyle = '#c9a227'
        ctx.beginPath()
        ctx.roundRect(p.x - 14, p.y - 10, 28, 22, 4)
        ctx.fill()
        ctx.fillStyle = '#3a2a10'
        ctx.font = '800 14px Unbounded, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('$', p.x, p.y + 6)
      }

      if (spriteOk && spriteGfx) {
        const h = 70
        const nw = 'naturalWidth' in spriteGfx ? sprite.naturalWidth : sprite.width
        const nh = 'naturalHeight' in spriteGfx ? sprite.naturalHeight : sprite.height
        const w = h * (nw / nh)
        ctx.save()
        ctx.translate(player.x, player.y)
        ctx.scale(player.facing, 1)
        ctx.drawImage(spriteGfx, -w / 2, -h / 2, w, h)
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
        ctx.fillStyle = 'rgba(8,6,8,0.62)'
        ctx.fillRect(0, 0, W, H)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      wrap.removeEventListener('click', onChoiceClick)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
    }
  }, [running])

  return (
    <div ref={wrapRef} className="relative h-full w-full touch-none select-none">
      <canvas ref={canvasRef} className="block h-full w-full" />
      <ChoiceOverlay />
    </div>
  )
}

function ChoiceOverlay() {
  const { t } = useI18n()
  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-[max(18px,env(safe-area-inset-bottom))] z-10 flex flex-col items-center">
      <ChoiceButtons leave={t('heistLeave')} deeper={t('heistDeeper')} hint={t('heistChoiceHint')} vault={t('heistVaultHint')} />
    </div>
  )
}

function ChoiceButtons({
  leave,
  deeper,
  hint,
  vault,
}: {
  leave: string
  deeper: string
  hint: string
  vault: string
}) {
  return (
    <div className="heist-choice pointer-events-auto hidden w-full max-w-sm rounded-2xl border border-amber-400/40 bg-[#120c10]/92 p-3 text-center backdrop-blur-md" aria-hidden>
      <p data-heist-hint className="text-xs font-semibold text-amber-50/90">
        {hint}
      </p>
      <p data-heist-vault className="hidden text-xs font-semibold text-amber-50/90">
        {vault}
      </p>
      <div data-heist-grid className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" data-heist="leave" className="rounded-xl border border-white/15 px-3 py-3 text-sm font-black text-zinc-100">
          {leave}
        </button>
        <button type="button" data-heist="deeper" className="buy-btn rounded-xl px-3 py-3 text-sm font-black text-zinc-950">
          {deeper}
        </button>
      </div>
    </div>
  )
}
