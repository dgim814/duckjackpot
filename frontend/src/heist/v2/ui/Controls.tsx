import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { heistT } from '../../heistI18n'
import type { InputController } from '../sim/Input'
import { useHud, shallowEqual, type HudStore } from './store'

/** Capture can throw when the pointer is already gone (cancel race on some WebViews): never let it break input. */
function capture(el: Element, id: number) {
  try {
    el.setPointerCapture(id)
  } catch {
    /* pointer already released */
  }
}

const KNOB_TRAVEL = 46
const BASE_R = 60

type Stick = { id: number; ox: number; oy: number; kx: number; ky: number } | null

/**
 * Floating joystick: the thumb lands anywhere on the left side and the stick
 * appears under it. One pointer id owns it until up / cancel / lost capture.
 */
export function Joystick({ input }: { input: InputController }) {
  const zone = useRef<HTMLDivElement>(null)
  const [stick, setStick] = useState<Stick>(null)
  const owner = useRef<number | null>(null)

  const release = () => {
    owner.current = null
    input.setStick(0, 0)
    setStick(null)
  }

  useEffect(() => release, [])

  const move = (e: ReactPointerEvent, s: NonNullable<Stick>) => {
    const dx = e.clientX - s.ox
    const dy = e.clientY - s.oy
    const len = Math.hypot(dx, dy)
    const k = len > KNOB_TRAVEL ? KNOB_TRAVEL / len : 1
    const kx = dx * k
    const ky = dy * k
    input.setStick(kx / KNOB_TRAVEL, ky / KNOB_TRAVEL)
    setStick({ ...s, kx, ky })
  }

  return (
    <div
      ref={zone}
      className="v2-stick-zone"
      onPointerDown={(e) => {
        if (owner.current !== null) return
        owner.current = e.pointerId
        capture(e.currentTarget, e.pointerId)
        const rect = e.currentTarget.getBoundingClientRect()
        const ox = Math.max(rect.left + BASE_R + 6, Math.min(e.clientX, rect.right - BASE_R - 6))
        const oy = Math.max(rect.top + BASE_R + 6, Math.min(e.clientY, rect.bottom - BASE_R - 6))
        const s = { id: e.pointerId, ox, oy, kx: 0, ky: 0 }
        setStick(s)
        move(e, s)
      }}
      onPointerMove={(e) => {
        if (owner.current !== e.pointerId || !stick) return
        move(e, stick)
      }}
      onPointerUp={(e) => {
        if (owner.current === e.pointerId) release()
      }}
      onPointerCancel={(e) => {
        if (owner.current === e.pointerId) release()
      }}
      onLostPointerCapture={(e) => {
        if (owner.current === e.pointerId) release()
      }}
    >
      {stick ? (
        <div className="v2-stick" style={{ left: stick.ox, top: stick.oy }}>
          <div className="v2-stick-knob" style={{ transform: `translate(${stick.kx}px, ${stick.ky}px)` }} />
        </div>
      ) : (
        <div className="v2-stick v2-stick-idle">
          <div className="v2-stick-knob" />
        </div>
      )}
    </div>
  )
}

type HoldProps = {
  className: string
  onDown: () => void
  onUp?: () => void
  children: ReactNode
  style?: React.CSSProperties
}

/** Button with a proper pointer lifecycle: capture on down, release on up/cancel/lost capture. */
function HoldButton({ className, onDown, onUp, children, style }: HoldProps) {
  const owner = useRef<number | null>(null)
  const [down, setDown] = useState(false)
  const end = () => {
    if (owner.current === null) return
    owner.current = null
    setDown(false)
    onUp?.()
  }
  useEffect(() => () => end(), [])
  return (
    <button
      type="button"
      className={`${className}${down ? ' is-down' : ''}`}
      style={style}
      onPointerDown={(e) => {
        e.preventDefault()
        if (owner.current !== null) return
        owner.current = e.pointerId
        capture(e.currentTarget, e.pointerId)
        setDown(true)
        onDown()
      }}
      onPointerUp={(e) => owner.current === e.pointerId && end()}
      onPointerCancel={(e) => owner.current === e.pointerId && end()}
      onLostPointerCapture={(e) => owner.current === e.pointerId && end()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  )
}

export function ActionButtons({ input, hud }: { input: InputController; hud: HudStore }) {
  const s = useHud(
    hud,
    (h) => ({
      prompt: h.prompt,
      cracking: h.cracking,
      canDrop: h.canDrop,
      dashCd: h.dashCd,
      dashing: h.dashing,
      sneaking: h.sneaking,
      heavy: h.heavy,
      paused: h.paused,
    }),
    shallowEqual,
  )
  if (s.paused) return null
  const showAction = s.cracking || s.prompt !== null
  const actionLabel = s.cracking ? heistT('heistHit') : s.prompt === 'door' ? heistT('heistLockpick') : heistT('heistOpen')
  const ring = s.dashCd > 0 ? `conic-gradient(rgba(255,214,90,0.9) ${(1 - s.dashCd) * 360}deg, rgba(0,0,0,0) 0)` : undefined
  return (
    <div className="v2-buttons">
      {s.canDrop && !s.cracking && (
        <HoldButton className={`v2-btn v2-btn-drop${s.heavy ? ' is-hot' : ''}`} onDown={() => input.pressDrop()}>
          <span>{s.heavy ? heistT('heistHeavy') : heistT('heistDrop')}</span>
        </HoldButton>
      )}
      {showAction && (
        <HoldButton
          className={`v2-btn v2-btn-action${s.cracking ? ' is-crack' : ''}`}
          onDown={() => input.setAction(true)}
          onUp={() => input.setAction(false)}
        >
          <span>{actionLabel}</span>
        </HoldButton>
      )}
      {!s.cracking && (
        <HoldButton
          className={`v2-btn v2-btn-sneak${s.sneaking ? ' is-on' : ''}`}
          onDown={() => input.setSneak(true)}
          onUp={() => input.setSneak(false)}
        >
          <span>{heistT('heistSneak')}</span>
        </HoldButton>
      )}
      {!s.cracking && (
        <HoldButton
          className={`v2-btn v2-btn-dash${s.dashing ? ' is-on' : ''}${s.dashCd > 0 ? ' is-cooling' : ''}`}
          onDown={() => input.pressDash()}
        >
          {ring && <i className="v2-ring" style={{ background: ring }} />}
          <span>{heistT('heistDash')}</span>
        </HoldButton>
      )}
    </div>
  )
}
