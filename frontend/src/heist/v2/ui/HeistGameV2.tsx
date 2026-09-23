import { useEffect, useMemo, useRef } from 'react'
import Phaser from 'phaser'
import WebApp from '@twa-dev/sdk'
import type { HeistEnd } from '../../types'
import type { HeistRunMods } from '../../progress'
import type { HeistLevelId } from '../../heistLevel'
import { bindHeistI18n } from '../../heistI18n'
import { haltHeistSfx, heistSfx, unlockHeistSfx } from '../../heistSfx'
import { useI18n } from '../../../i18n/LanguageProvider'
import { InputController } from '../sim/Input'
import { Raid } from '../sim/Raid'
import { HeistV2Scene } from '../render/HeistV2Scene'
import { ActionButtons, Joystick } from './Controls'
import { CrackPanel, ExitArrow, PauseMenu, StatusLayer, Toasts, TopBar } from './Hud'
import { HudStore } from './store'
import './v2.css'

type Props = {
  running: boolean
  mods: HeistRunMods
  levelId?: HeistLevelId
  novice?: boolean
  onDone: (end: HeistEnd) => void
}

/** Crisp on retina without paying for 3× fill on the phone GPU. */
const MAX_RES = 2

function telegramApp() {
  const tg = (window as Window & { Telegram?: { WebApp?: typeof WebApp } }).Telegram?.WebApp
  return tg ?? WebApp
}

type Live = { game: Phaser.Game; raid: Raid; scene: HeistV2Scene; input: InputController }
/** At most one V2 game exists; a new mount destroys any leftover first. */
let live: Live | null = null

function destroyLive() {
  if (!live) return
  const l = live
  live = null
  l.input.dispose()
  l.game.destroy(true)
}

export function HeistGameV2({ running, mods, levelId = 'bank', novice = false, onDone }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const { t } = useI18n()
  bindHeistI18n(t)
  const hud = useMemo(() => new HudStore(), [])
  const input = useMemo(() => new InputController(), [])
  const raidRef = useRef<Raid | null>(null)

  useEffect(() => {
    const host = canvasRef.current
    const root = rootRef.current
    if (!host || !root || !running) return
    destroyLive()

    const raid = new Raid(levelId, mods, novice)
    raidRef.current = raid
    input.attachKeyboard()
    const togglePause = () => {
      if (raid.ended) return
      raid.setPaused(!raid.paused)
      input.releaseAll()
      if (raid.paused) heistSfx.pause()
    }
    input.onPause = togglePause

    const res = Math.max(1, Math.min(MAX_RES, window.devicePixelRatio || 1))
    const w = Math.max(1, host.clientWidth || 390)
    const h = Math.max(1, host.clientHeight || 700)
    let ended = false
    const scene = new HeistV2Scene({
      raid,
      input,
      hud,
      resolution: res,
      onEnd: (end) => {
        if (ended) return
        ended = true
        onDoneRef.current(end)
      },
    })
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      width: Math.round(w * res),
      height: Math.round(h * res),
      backgroundColor: '#0b0a10',
      scale: { mode: Phaser.Scale.NONE, zoom: 1 / res },
      render: { antialias: true, roundPixels: false, powerPreference: 'high-performance', pixelArt: false },
      input: { keyboard: false, mouse: false, touch: false, gamepad: false },
      audio: { noAudio: true },
      banner: false,
      scene,
    })
    live = { game, raid, scene, input }

    const ro = new ResizeObserver(() => {
      const cw = Math.max(1, host.clientWidth)
      const ch = Math.max(1, host.clientHeight)
      game.scale.resize(Math.round(cw * res), Math.round(ch * res))
    })
    ro.observe(host)

    const onVis = () => {
      if (document.visibilityState === 'hidden' && !raid.paused && !raid.ended) togglePause()
    }
    document.addEventListener('visibilitychange', onVis)

    const stop = (e: TouchEvent) => e.preventDefault()
    root.addEventListener('touchmove', stop, { passive: false })
    const unlock = () => unlockHeistSfx()
    root.addEventListener('pointerdown', unlock)
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = 'hidden'
    try {
      const tg = telegramApp()
      tg.expand?.()
      ;(tg as { disableVerticalSwipes?: () => void }).disableVerticalSwipes?.()
    } catch {
      /* not in Telegram */
    }
    if (import.meta.env.DEV) (window as Window & { __v2?: unknown }).__v2 = { raid, scene, game, input, hud }

    return () => {
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      root.removeEventListener('touchmove', stop)
      root.removeEventListener('pointerdown', unlock)
      html.style.overflow = prevOverflow
      haltHeistSfx()
      if (live?.game === game) destroyLive()
      else {
        input.dispose()
        game.destroy(true)
      }
      raidRef.current = null
      try {
        ;(telegramApp() as { enableVerticalSwipes?: () => void }).enableVerticalSwipes?.()
      } catch {
        /* ignore */
      }
      if (import.meta.env.DEV) delete (window as Window & { __v2?: unknown }).__v2
    }
  }, [running, mods, levelId, novice, hud, input])

  const pause = () => {
    const raid = raidRef.current
    if (!raid || raid.ended) return
    raid.setPaused(!raid.paused)
    input.releaseAll()
    if (raid.paused) heistSfx.pause()
  }
  const abort = () => {
    const raid = raidRef.current
    if (!raid) return
    raid.setPaused(false)
    raid.abort()
  }

  return (
    <div ref={rootRef} className="v2-root">
      <div ref={canvasRef} className="v2-canvas" />
      <div className="v2-overlay">
        <StatusLayer hud={hud} />
        <Joystick input={input} />
        <ActionButtons input={input} hud={hud} />
        <ExitArrow hud={hud} />
        <CrackPanel hud={hud} />
        <Toasts hud={hud} />
        <TopBar hud={hud} onPause={pause} />
        <PauseMenu hud={hud} onResume={pause} onAbort={abort} />
      </div>
    </div>
  )
}
