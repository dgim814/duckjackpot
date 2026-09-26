import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { heistT } from '../../heistI18n'
import type { MessageKey } from '../../../i18n/messages'
import type { TutorialStep } from '../../tutorial'
import { useHud, type HudStore, type TutorialHint } from './store'

const TEXT: Record<TutorialStep, { title: MessageKey; body: MessageKey }> = {
  coin: { title: 'heistTutCoinT', body: 'heistTutCoinB' },
  goal: { title: 'heistTutGoalT', body: 'heistTutGoalB' },
  guard: { title: 'heistTutGuardT', body: 'heistTutGuardB' },
  camera: { title: 'heistTutCamT', body: 'heistTutCamB' },
  door: { title: 'heistTutDoorT', body: 'heistTutDoorB' },
  safe: { title: 'heistTutSafeT', body: 'heistTutSafeB' },
  lift: { title: 'heistTutLiftT', body: 'heistTutLiftB' },
  dash: { title: 'heistTutDashT', body: 'heistTutDashB' },
  exit: { title: 'heistTutExitT', body: 'heistTutExitB' },
}

function lines(h: TutorialHint): { title: string; body: string; extra: string | null } {
  if (h.step === 'door' && h.variant === 'stars') return { title: heistT('heistTutGateT'), body: heistT('heistTutGateB'), extra: null }
  const t = TEXT[h.step]
  const body = heistT(t.body, { pick: heistT('heistLockpick'), hit: heistT('heistHit'), btn: heistT('heistDash') })
  const extra =
    h.step === 'goal'
      ? heistT('heistTutGoalLoop')
      : h.step === 'guard'
        ? heistT('heistTutGuardSneak', { btn: heistT('heistSneak') })
        : h.step === 'lift' && h.variant === 'stars'
          ? heistT('heistTutLiftStars')
          : null
  return { title: heistT(t.title), body, extra }
}

const sameHint = (a: TutorialHint | null, b: TutorialHint | null) => JSON.stringify(a) === JSON.stringify(b)

/**
 * In-raid tutorial hint. The raid is frozen underneath (Raid.hold); the object stays
 * visible in a soft spotlight with a gold ring and an arrow. One tap anywhere continues.
 */
export function TutorialOverlay({ hud, onDismiss }: { hud: HudStore; onDismiss: () => boolean }) {
  const hint = useHud(hud, (h) => h.tutorial, sameHint)
  const paused = useHud(hud, (h) => h.paused)
  const rootRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ w: number; h: number; dom: { x: number; y: number } | null }>({ w: 0, h: 0, dom: null })
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  // Measure the view (and the HUD button the hint may point at) in pixels.
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el || !hint) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      let dom: { x: number; y: number } | null = null
      if (hint.dom === 'dash') {
        const b = document.querySelector('.v2-btn-dash')?.getBoundingClientRect()
        if (b && b.width > 0) dom = { x: b.left + b.width / 2 - r.left, y: b.top + b.height / 2 - r.top }
      }
      setBox({ w: r.width, h: r.height, dom })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [hint])

  // Desktop: Enter / Space / Esc continue too — and never reach the game's own key handling.
  useEffect(() => {
    if (!hint || paused) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Enter' && e.code !== 'Space' && e.code !== 'Escape') return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (!e.repeat) dismissRef.current()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [hint, paused])

  if (!hint || paused) return null
  const { title, body, extra } = lines(hint)
  const W = box.w || 1
  const H = box.h || 1
  const target = hint.dom ? box.dom : { x: hint.x * W, y: hint.y * H }
  const cover = hint.x2 != null && hint.y2 != null ? { x: hint.x2 * W, y: hint.y2 * H } : null
  // The card sits on the half of the screen away from the object.
  const cardTop = target ? target.y > H * 0.5 : false
  const anchor = { x: W / 2, y: cardTop ? H * 0.3 : H * 0.7 }
  let arrow: { x: number; y: number; deg: number } | null = null
  if (target) {
    const dx = target.x - anchor.x
    const dy = target.y - anchor.y
    const d = Math.max(1, Math.hypot(dx, dy))
    const off = Math.min(62, d * 0.45)
    arrow = { x: target.x - (dx / d) * off, y: target.y - (dy / d) * off, deg: (Math.atan2(dy, dx) * 180) / Math.PI }
  }
  const spot = target
    ? `radial-gradient(circle at ${target.x}px ${target.y}px, rgba(4,3,8,0) 0, rgba(4,3,8,0) 64px, rgba(4,3,8,0.64) 150px)`
    : 'rgba(4,3,8,0.6)'

  return (
    <div
      ref={rootRef}
      className="v2-tut"
      style={{ background: spot }}
      role="dialog"
      aria-live="polite"
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        dismissRef.current()
      }}
    >
      {target && <i className={`v2-tut-ring${hint.edge ? ' is-edge' : ''}`} style={{ left: target.x, top: target.y }} />}
      {cover && (
        <i className="v2-tut-ring is-cover" style={{ left: cover.x, top: cover.y }}>
          <b>{heistT('heistTutCover')}</b>
        </i>
      )}
      {arrow && (
        <i className="v2-tut-arrow" style={{ left: arrow.x, top: arrow.y, transform: `translate(-50%, -50%) rotate(${arrow.deg}deg)` }}>
          <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden>
            <path d="M6 24h28M24 12l14 12-14 12" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </i>
      )}
      <div className={`v2-tut-card ${cardTop ? 'is-top' : 'is-bottom'}`}>
        <div className="v2-tut-title">{title}</div>
        <div className="v2-tut-body">{body}</div>
        {extra && <div className="v2-tut-extra">{extra}</div>}
        <div className="v2-tut-tap">{heistT('heistTutTap')}</div>
      </div>
    </div>
  )
}
