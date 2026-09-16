import { useEffect, useRef } from 'react'
import WebApp from '@twa-dev/sdk'
import { createHeistGame } from './phaser/createHeistGame'
import type { HeistEnd } from './types'
import type { HeistRunMods } from './progress'

export type { HeistEnd }

type HeistGameProps = {
  running: boolean
  mods: HeistRunMods
  onDone: (end: HeistEnd) => void
}

function telegramApp() {
  const tg = (window as Window & { Telegram?: { WebApp?: typeof WebApp } }).Telegram?.WebApp
  return tg ?? WebApp
}

export function HeistGame({ running, mods, onDone }: HeistGameProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

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
    try {
      const tg = telegramApp()
      tg.expand?.()
      const disable = (tg as { disableVerticalSwipes?: () => void }).disableVerticalSwipes
      disable?.()
    } catch {
      /* ignore */
    }

    const game = createHeistGame(wrap, (end) => onDoneRef.current(end), mods)

    return () => {
      game.destroy(true)
      wrap.removeEventListener('touchmove', stop)
      document.removeEventListener('touchmove', stop)
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
  }, [running, mods])

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full touch-none overscroll-none"
      style={{ touchAction: 'none', overscrollBehavior: 'none' }}
    />
  )
}
