import { useEffect, useRef } from 'react'
import { track } from '../../analytics/track'

/**
 * ⭐ Stars discovery, never pushy. One flag: after the first successful EXIT the DUCK LAB entry
 * gets a one-time "new upgrades" cue and the result screen shows a small CTA; opening DUCK LAB
 * once ends both for good. The result CTA is also capped, so it can never follow every raid.
 */
const KEY = 'duckjackpot.starsDiscovery.v1'
const RESULT_CTA_MAX = 3

type State = { exitSeen: boolean; labOpened: boolean; resultCtas: number }

function read(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<State>
    return { exitSeen: Boolean(s.exitSeen), labOpened: Boolean(s.labOpened), resultCtas: Math.max(0, Math.floor(s.resultCtas ?? 0)) }
  } catch {
    return { exitSeen: false, labOpened: false, resultCtas: 0 }
  }
}

function write(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable: the cue just shows again next time */
  }
}

/** A successful EXIT happened (players who escaped before this build count too). */
export function noteSuccessfulExit(hadEscapes = true) {
  const s = read()
  if (hadEscapes && !s.exitSeen) write({ ...s, exitSeen: true })
}

export function noteLabOpened() {
  const s = read()
  if (!s.labOpened) write({ ...s, labOpened: true })
}

/** The one-time glow + "NEW UPGRADES" on the hub's DUCK LAB entry. */
export function labCueActive(bankEscapes: number) {
  const s = read()
  return !s.labOpened && (s.exitSeen || bankEscapes > 0)
}

/** Decide once per result screen whether the result CTA is shown (and count it). */
export function takeResultCta() {
  const s = read()
  if (s.labOpened || s.resultCtas >= RESULT_CTA_MAX) return false
  write({ ...s, exitSeen: true, resultCtas: s.resultCtas + 1 })
  return true
}

/** stars_cta_view once per placement per app session, and only when the block is really on screen. */
const viewed = new Set<string>()
export function useCtaView(placement: 'hub' | 'result', enabled = true) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled || viewed.has(placement)) return
    const fire = () => {
      if (viewed.has(placement)) return
      viewed.add(placement)
      track('stars_cta_view', { placement })
    }
    if (typeof IntersectionObserver === 'undefined') {
      fire()
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.5)) {
          fire()
          io.disconnect()
        }
      },
      { threshold: [0.5] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [placement, enabled])
  return ref
}

export function trackCtaClick(placement: 'hub' | 'result') {
  track('stars_cta_click', { placement })
}
