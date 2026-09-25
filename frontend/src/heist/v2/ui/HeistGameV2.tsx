import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Phaser from 'phaser'
import WebApp from '@twa-dev/sdk'
import type { HeistEnd } from '../../types'
import type { HeistRunMods } from '../../progress'
import type { HeistLevelId } from '../../heistLevel'
import { bindHeistI18n, heistT } from '../../heistI18n'
import { haltHeistSfx, heistSfx, unlockHeistSfx } from '../../heistSfx'
import { useI18n } from '../../../i18n/LanguageProvider'
import { useAdmin } from '../../../admin/AdminProvider'
import { useCards } from '../../../cards/CardsProvider'
import type { RaffleId } from '../../../constants'
import { loadNftTrial, nftSkin, nftTrialLeft, startNftTrial, type NftTrial } from '../../nftTrial'
import { InputController } from '../sim/Input'
import { Raid } from '../sim/Raid'
import { HeistV2Scene } from '../render/HeistV2Scene'
import { ActionButtons, Joystick } from './Controls'
import { CrackPanel, ExitArrow, ExtrasChip, PauseMenu, SafeFlyLayer, StatusLayer, Toasts, TopBar } from './Hud'
import { NftVaultPanel } from './NftVault'
import { ContinuePanel, LiftPanel, NftCtaPanel, PassPanel } from './RaidPanels'
import { CONTINUE_KEEP, NFT_CTA, STAR_ITEMS } from '../../economy/balance'
import { buyStarItem, consumeStarItem, loadProgress, markNftCta } from '../../progress'
import { HudStore } from './store'
import './v2.css'

type Props = {
  running: boolean
  mods: HeistRunMods
  levelId?: HeistLevelId
  novice?: boolean
  onDone: (end: HeistEnd) => void
  /** Continue a raid that was left through PAUSE → HUB (same Raid object, same state). */
  resume?: boolean
  onSuspend?: () => void
}

type Panel = 'nft' | 'lift' | 'pass' | 'continue' | 'cta' | null

/** A raid parked through PAUSE → HUB. Kept in memory for this session only. */
let suspended: { raid: Raid; levelId: HeistLevelId } | null = null

export function suspendedRaid() {
  const s = suspended
  if (!s || s.raid.ended) return null
  return { levelId: s.levelId, zone: s.raid.zoneNow + 1, bag: s.raid.bag }
}

/** Starting another raid drops the parked one (its unbanked bag is lost, like an abort). */
export function discardSuspendedRaid() {
  suspended = null
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

export function HeistGameV2({ running, mods, levelId = 'bank', novice = false, onDone, resume = false, onSuspend }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const { t } = useI18n()
  bindHeistI18n(t)
  const hud = useMemo(() => new HudStore(), [])
  const input = useMemo(() => new InputController(), [])
  const raidRef = useRef<Raid | null>(null)
  const sceneRef = useRef<HeistV2Scene | null>(null)
  const { cardArt } = useAdmin()
  const { setRaffleId } = useCards()
  const navigate = useNavigate()
  const [panel, setPanelState] = useState<Panel>(null)
  const panelRef = useRef<Panel>(null)
  const setPanel = (p: Panel) => {
    panelRef.current = p
    setPanelState(p)
  }
  const nftOpen = panel === 'nft'
  const pendingEndRef = useRef<HeistEnd | null>(null)
  const endedRef = useRef(false)
  const onSuspendRef = useRef(onSuspend)
  onSuspendRef.current = onSuspend
  const [liftTick, setLiftTick] = useState(0)
  const [trial, setTrial] = useState<NftTrial | null>(() => loadNftTrial())
  const cardArtRef = useRef(cardArt)
  cardArtRef.current = cardArt

  useEffect(() => {
    const host = canvasRef.current
    const root = rootRef.current
    if (!host || !root || !running) return
    destroyLive()

    // PAUSE → HUB parked this raid: pick it up exactly where it was.
    const parked = resume && suspended?.levelId === levelId && !suspended.raid.ended ? suspended.raid : null
    suspended = null
    const raid = parked ?? new Raid(levelId, mods, novice)
    if (parked) raid.setPaused(false)
    raidRef.current = raid
    endedRef.current = false
    let ctaShown = false
    input.attachKeyboard()
    const togglePause = () => {
      if (raid.ended || panelRef.current) return
      raid.setPaused(!raid.paused)
      input.releaseAll()
      if (raid.paused) heistSfx.pause()
    }
    input.onPause = togglePause

    const res = Math.max(1, Math.min(MAX_RES, window.devicePixelRatio || 1))
    const w = Math.max(1, host.clientWidth || 390)
    const h = Math.max(1, host.clientHeight || 700)
    const openPanel = (p: Panel) => {
      if (raid.ended) return
      if (!raid.paused) raid.setPaused(true)
      input.releaseAll()
      setPanel(p)
    }
    const scene = new HeistV2Scene({
      raid,
      input,
      hud,
      resolution: res,
      nftArt: { classic: cardArtRef.current('classic'), fast200: cardArtRef.current('fast200'), fast100: cardArtRef.current('fast100') },
      skin: (() => {
        const tr = loadNftTrial()
        return tr ? nftSkin(tr.nftId) : null
      })(),
      onNftView: () => openPanel('nft'),
      onLiftOpen: () => {
        setLiftTick((n) => n + 1)
        openPanel('lift')
      },
      onNeedPass: () => openPanel('pass'),
      onEnd: (end) => {
        if (endedRef.current) return
        // CAUGHT: offer the ⭐ continue once per raid, if the player can afford it.
        if (end.verdict === 'caught' && !raid.revived && !raid.mods.preview) {
          const p = loadProgress()
          const canContinue = (p.starItems?.continueRaid ?? 0) > 0 || (p.stars || 0) >= STAR_ITEMS.continueRaid.stars
          if (canContinue) {
            pendingEndRef.current = end
            setPanel('continue')
            return
          }
        }
        endedRef.current = true
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
    sceneRef.current = scene

    // NFT Drop offer: after a good stretch of active play, at most once per 24 h, never mid-panel.
    const cta = window.setInterval(() => {
      if (ctaShown || raid.ended || raid.paused || panelRef.current || raid.time < NFT_CTA.afterActiveS) return
      const now = Date.now()
      if (now - (loadProgress().nftCtaAt || 0) < NFT_CTA.everyMs) {
        ctaShown = true
        return
      }
      ctaShown = true
      markNftCta(now)
      openPanel('cta')
    }, 1000)

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

    // Block page rubber-banding over the game, but let the NFT viewer scroll (iOS).
    const stop = (e: TouchEvent) => {
      if (e.target instanceof Element && e.target.closest('.v2-nft-menu')) return
      e.preventDefault()
    }
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
      window.clearInterval(cta)
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
      sceneRef.current = null
      setPanel(null)
      try {
        ;(telegramApp() as { enableVerticalSwipes?: () => void }).enableVerticalSwipes?.()
      } catch {
        /* ignore */
      }
      if (import.meta.env.DEV) delete (window as Window & { __v2?: unknown }).__v2
    }
  }, [running, mods, levelId, novice, hud, input, resume])

  const pause = () => {
    const raid = raidRef.current
    if (!raid || raid.ended || panelRef.current) return
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

  // A try-on that runs out mid-raid takes the look off the duck.
  useEffect(() => {
    if (!trial) return
    const left = trial.expiresAt - Date.now()
    const id = window.setTimeout(() => {
      setTrial(loadNftTrial())
      sceneRef.current?.setSkin(null)
    }, Math.max(0, Math.min(left, 2 ** 31 - 1)))
    return () => window.clearTimeout(id)
  }, [trial])

  const closePanel = () => {
    setPanel(null)
    const raid = raidRef.current
    if (raid && !raid.ended && raid.paused) raid.setPaused(false)
    input.releaseAll()
  }
  const closeNft = closePanel
  /** PAUSE → HUB: park the raid in memory; the HUB offers to continue it. */
  const toHub = () => {
    const raid = raidRef.current
    if (!raid || raid.ended) return
    raid.setPaused(true)
    suspended = { raid, levelId }
    onSuspendRef.current?.()
  }
  /** Use an owned ⭐ item, or buy one with Stars and use it. */
  const spendStarItem = (id: 'elevatorPass' | 'escalatorPass' | 'continueRaid') => {
    if (consumeStarItem(id)) return true
    const bought = buyStarItem(id)
    if (!bought.ok) return false
    heistSfx.starPurchase()
    return consumeStarItem(id)
  }
  const rideLift = (id: string, premium: boolean) => {
    const raid = raidRef.current
    if (!raid) return
    if (premium && !raid.elevatorPass) {
      if (!spendStarItem('elevatorPass')) return
      raid.elevatorPass = true
    }
    if (raid.useLift(id, premium)) closePanel()
  }
  const useEscalatorPass = () => {
    const raid = raidRef.current
    if (!raid) return
    if (!spendStarItem('escalatorPass')) return
    raid.escalatorPass = true
    closePanel()
  }
  const continueRaid = () => {
    const raid = raidRef.current
    if (!raid || !spendStarItem('continueRaid')) return
    if (raid.revive()) {
      pendingEndRef.current = null
      sceneRef.current?.rearm()
      setPanel(null)
      input.releaseAll()
    }
  }
  const endAfterCaught = () => {
    const end = pendingEndRef.current
    pendingEndRef.current = null
    setPanel(null)
    if (!end || endedRef.current) return
    endedRef.current = true
    onDoneRef.current(end)
  }
  const ctaOpenDrop = () => {
    setPanel(null)
    navigate('/drop')
  }
  /** Try-on keeps the raid: skin on, viewer closed, the same run continues where it paused. */
  const tryNft = (id: RaffleId) => {
    const next = startNftTrial(id)
    setTrial(next)
    const scene = sceneRef.current
    scene?.setSkin(nftSkin(id))
    closeNft()
    scene?.notify('good', heistT('heistNftSkinOn'), `${nftSkin(id).name} · ${nftTrialLeft(next)}`, 3)
  }
  const openDrop = (id: RaffleId) => {
    setRaffleId(id)
    setPanel(null)
    // Leaving unmounts the raid: the unbanked bag is lost, opened doors stay open.
    navigate('/drop')
  }
  const vaultIds: RaffleId[] = ['classic', 'fast200', 'fast100']

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
        {/* Over the banners, under the bag chip: the coins read as dropping into the bag. */}
        <SafeFlyLayer hud={hud} />
        <TopBar hud={hud} onPause={pause} />
        <ExtrasChip hud={hud} />
        {!panel && <PauseMenu hud={hud} onResume={pause} onAbort={abort} onToHub={onSuspend ? toHub : undefined} />}
        {nftOpen && <NftVaultPanel ids={vaultIds} trial={trial} onTry={tryNft} onOpenDrop={openDrop} onClose={closeNft} />}
        {panel === 'lift' && raidRef.current && (
          <LiftPanel
            key={liftTick}
            floor={Math.floor(raidRef.current.zoneNow / 10)}
            options={raidRef.current.liftOptions()}
            passActive={raidRef.current.elevatorPass}
            onRide={rideLift}
            onClose={closePanel}
          />
        )}
        {panel === 'pass' && <PassPanel onUse={useEscalatorPass} onClose={closePanel} />}
        {panel === 'continue' && <ContinuePanel keep={Math.floor((raidRef.current?.bag ?? 0) * CONTINUE_KEEP)} onContinue={continueRaid} onEnd={endAfterCaught} />}
        {panel === 'cta' && <NftCtaPanel onOpen={ctaOpenDrop} onContinue={closePanel} />}
      </div>
    </div>
  )
}
