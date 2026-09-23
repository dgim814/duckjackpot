import { heistT } from '../../heistI18n'
import type { RaidPhase } from '../sim/events'
import { useHud, shallowEqual, type HudStore } from './store'

const PHASE_LABEL: Record<RaidPhase, 'heistHudSafe' | 'heistHudSuspicious' | 'heistHudDanger' | 'heistHudChase'> = {
  SAFE: 'heistHudSafe',
  SUSPICIOUS: 'heistHudSuspicious',
  DANGER: 'heistHudDanger',
  CHASE: 'heistHudChase',
}

function clock(s: number) {
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function TopBar({ hud, onPause }: { hud: HudStore; onPause: () => void }) {
  const s = useHud(
    hud,
    (h) => ({
      bag: h.bag,
      cap: h.bagCap,
      full: h.full,
      alert: h.alert,
      phase: h.phase,
      zone: h.zone,
      zoneCount: h.zoneCount,
      best: h.depthBest,
      level: h.level,
      showWeight: h.showWeight,
      load: h.load,
      heavy: h.heavy,
      paused: h.paused,
    }),
    shallowEqual,
  )
  const bagPct = Math.min(100, (s.bag / Math.max(1, s.cap)) * 100)
  return (
    <div className="v2-top">
      <div className={`v2-chip v2-bag${s.full ? ' is-full' : ''}`}>
        <img src="/heist/coin_10.png" alt="" className="v2-coin" draggable={false} />
        <div className="v2-bag-body">
          <div className="v2-bag-num">
            <b>{s.bag}</b>
            <span>/{s.cap}</span>
          </div>
          <div className="v2-bar">
            <i style={{ width: `${bagPct}%` }} />
          </div>
          {s.showWeight && (
            <div className={`v2-bar v2-bar-load${s.heavy ? ' is-hot' : ''}`}>
              <i style={{ width: `${s.load * 100}%` }} />
            </div>
          )}
        </div>
      </div>
      <div className={`v2-chip v2-alert v2-phase-${s.phase.toLowerCase()}`}>
        <div className="v2-alert-label">{heistT(PHASE_LABEL[s.phase])}</div>
        <div className="v2-bar v2-bar-alert">
          <i style={{ width: `${Math.max(4, s.alert * 100)}%` }} />
        </div>
      </div>
      <div className="v2-chip v2-zone">
        {s.level === 'bank' ? (
          <>
            <div className="v2-zone-num">
              {s.zone}
              <span>/{s.zoneCount}</span>
            </div>
            <div className="v2-zone-best">{heistT('heistV2Record', { n: s.best })}</div>
          </>
        ) : (
          <div className="v2-zone-num">{heistT('heistMapMansion')}</div>
        )}
      </div>
      <button type="button" className="v2-pause" onPointerDown={(e) => { e.preventDefault(); onPause() }} aria-label={heistT('heistPause')}>
        <i />
        <i />
      </button>
    </div>
  )
}

export function Toasts({ hud }: { hud: HudStore }) {
  const toasts = useHud(hud, (h) => h.toasts)
  const escape = useHud(hud, (h) => h.escapeLeft)
  return (
    <div className="v2-toasts">
      {escape !== null && (
        <div className="v2-siren">
          <b>{heistT('heistPolice')}</b> {clock(escape)}
        </div>
      )}
      {toasts.map((t) => (
        <div key={t.id} className={`v2-toast v2-toast-${t.kind}`}>
          <div className="v2-toast-title">{t.title}</div>
          {t.sub && <div className="v2-toast-sub">{t.sub}</div>}
        </div>
      ))}
    </div>
  )
}

export function ExitArrow({ hud }: { hud: HudStore }) {
  const arrow = useHud(hud, (h) => h.exitArrow, (a, b) => a?.angle === b?.angle && a?.dist === b?.dist)
  if (!arrow) return null
  // Marker on an ellipse around the duck, kept inside the band between the HUD and the thumbs.
  const x = Math.max(14, Math.min(86, 50 + Math.cos(arrow.angle) * 36))
  const y = Math.max(20, Math.min(60, 40 + Math.sin(arrow.angle) * 22))
  return (
    <div className="v2-exit-arrow" style={{ left: `${x}%`, top: `${y}%` }}>
      <i style={{ transform: `rotate(${arrow.angle}rad)` }} />
      <span>{heistT('heistExit')}</span>
    </div>
  )
}

export function StatusLayer({ hud }: { hud: HudStore }) {
  const s = useHud(hud, (h) => ({ hidden: h.hidden, exitHold: h.exitHold, phase: h.phase }), shallowEqual)
  return (
    <>
      <div className={`v2-vignette v2-vig-${s.phase.toLowerCase()}`} />
      {s.hidden && <div className="v2-hidden">{heistT('heistV2Hidden')}</div>}
      {s.exitHold > 0 && (
        <div className="v2-leave">
          <div className="v2-leave-ring" style={{ background: `conic-gradient(#5ee08a ${s.exitHold * 360}deg, rgba(255,255,255,0.12) 0)` }} />
          <span>{heistT('heistV2Leaving')}</span>
        </div>
      )}
    </>
  )
}

export function CrackPanel({ hud }: { hud: HudStore }) {
  const c = useHud(hud, (h) => h.crack, (a, b) => JSON.stringify(a) === JSON.stringify(b))
  if (!c) return null
  const title = c.kind === 'door' ? heistT('heistDoorCrackTitle') : heistT('heistCrackTitle')
  return (
    <div className={`v2-crack${c.miss ? ' is-miss' : ''}`}>
      <div className="v2-crack-title">{title}</div>
      <div className="v2-crack-round">{heistT('heistRound', { n: Math.min(c.hits + 1, c.need), total: c.need })}</div>
      <div className="v2-crack-bar">
        <div className="v2-crack-zone" style={{ left: `${(c.center - c.width / 2) * 100}%`, width: `${c.width * 100}%` }} />
        <div className="v2-crack-marker" style={{ left: `${c.marker * 100}%` }} />
      </div>
      <div className="v2-crack-pips">
        {Array.from({ length: c.need }, (_, i) => (
          <i key={i} className={i < c.hits ? 'is-on' : ''} />
        ))}
      </div>
      <div className="v2-crack-hint">{heistT('heistHitHint')}</div>
    </div>
  )
}

export function PauseMenu({ hud, onResume, onAbort }: { hud: HudStore; onResume: () => void; onAbort: () => void }) {
  const paused = useHud(hud, (h) => h.paused)
  if (!paused) return null
  return (
    <div className="v2-pause-menu">
      <div className="v2-pause-card">
        <div className="v2-pause-title">{heistT('heistPaused')}</div>
        <button type="button" className="v2-pause-resume" onClick={onResume}>
          {heistT('heistResume')}
        </button>
        <button type="button" className="v2-pause-abort" onClick={onAbort}>
          {heistT('heistAbortRaid')}
        </button>
      </div>
    </div>
  )
}
