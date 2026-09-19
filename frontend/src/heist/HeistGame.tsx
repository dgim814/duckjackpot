import { useEffect, useRef } from 'react'
import WebApp from '@twa-dev/sdk'
import { createHeistGame } from './phaser/createHeistGame'
import type { HeistEnd } from './types'
import type { HeistRunMods } from './progress'
import type { HeistLevelId } from './heistLevel'
import { bindHeistI18n } from './heistI18n'
import { haltHeistSfx, unlockHeistSfx } from './heistSfx'
import { useI18n } from '../i18n/LanguageProvider'

export type { HeistEnd }

type HeistGameProps = {
  running: boolean
  mods: HeistRunMods
  levelId?: HeistLevelId
  onDone: (end: HeistEnd) => void
}

function telegramApp() {
  const tg = (window as Window & { Telegram?: { WebApp?: typeof WebApp } }).Telegram?.WebApp
  return tg ?? WebApp
}

export function HeistGame({ running, mods, levelId = 'bank', onDone }: HeistGameProps) {
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

    const game = createHeistGame(wrap, (end) => onDoneRef.current(end), mods, levelId)

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
  }, [running, mods, levelId])

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full touch-none overscroll-none"
      style={{ touchAction: 'none', overscrollBehavior: 'none' }}
    />
  )
}
