import { useEffect, useRef } from 'react'
import WebApp from '@twa-dev/sdk'
import { createHeistGame } from './phaser/createHeistGame'
import type { HeistEnd } from './types'
import type { HeistRunMods } from './progress'
import { isGrandLevel, type HeistLevelId } from './heistLevel'
import { bindHeistI18n } from './heistI18n'
import { haltHeistSfx, unlockHeistSfx } from './heistSfx'
import { useI18n } from '../i18n/LanguageProvider'
import { HeistGameV2 } from './v2/ui/HeistGameV2'

export type { HeistEnd }

type HeistGameProps = {
  running: boolean
  mods: HeistRunMods
  levelId?: HeistLevelId
  novice?: boolean
  onDone: (end: HeistEnd) => void
  resume?: boolean
  onSuspend?: () => void
}

function telegramApp() {
  const tg = (window as Window & { Telegram?: { WebApp?: typeof WebApp } }).Telegram?.WebApp
  return tg ?? WebApp
}

const ENGINE_KEY = 'duckjackpot.heist.engine'

/** V2 is the default on this branch; `?engine=v1` (or localStorage) keeps the old game for comparison. */
function useLegacyEngine() {
  try {
    const q = new URLSearchParams(window.location.search).get('engine')
    if (q === 'v1' || q === 'v2') localStorage.setItem(ENGINE_KEY, q)
    return (q ?? localStorage.getItem(ENGINE_KEY)) === 'v1'
  } catch {
    return false
  }
}

export function HeistGame(props: HeistGameProps) {
  const legacy = useLegacyEngine()
  // The legacy engine only has BANK and MANSION: LEVELS 3–5 always run on V2.
  return legacy && !isGrandLevel(props.levelId ?? 'bank') ? <HeistGameV1 {...props} /> : <HeistGameV2 {...props} />
}

function HeistGameV1({ running, mods, levelId = 'bank', novice = false, onDone }: HeistGameProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const { t } = useI18n()
  bindHeistI18n(t)

  useEffect(() => {
    bindHeistI18n(t)
  }, [t])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || !running) return

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
    const stop = (e: TouchEvent) => e.preventDefault()
    wrap.addEventListener('touchmove', stop, { passive: false })
    document.addEventListener('touchmove', stop, { passive: false })
    const unlock = () => unlockHeistSfx()
    wrap.addEventListener('pointerdown', unlock)
    wrap.addEventListener('touchstart', unlock, { passive: true })
    try {
      const tg = telegramApp()
      tg.expand?.()
      const disable = (tg as { disableVerticalSwipes?: () => void }).disableVerticalSwipes
      disable?.()
    } catch {
      /* ignore */
    }

    const game = createHeistGame(wrap, (end) => onDoneRef.current(end), mods, levelId, novice)

    return () => {
      haltHeistSfx()
      game.destroy(true)
      wrap.removeEventListener('touchmove', stop)
      document.removeEventListener('touchmove', stop)
      wrap.removeEventListener('pointerdown', unlock)
      wrap.removeEventListener('touchstart', unlock)
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
  }, [running, mods, levelId, novice])

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full touch-none overscroll-none"
      style={{ touchAction: 'none', overscrollBehavior: 'none' }}
    />
  )
}
