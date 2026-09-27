import { trackScreen } from '../analytics/track'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeistDuck } from '../heist/HeistDuck'
import { HeistGame, type HeistEnd } from '../heist/HeistGame'
import { bindHeistI18n } from '../heist/heistI18n'
import { LangSwitch } from '../components/LangSwitch'
import {
  RAID_OBJ_ALL,
  RAID_OBJ_REWARD,
  bagCap,
  bankCoins,
  buyLabUpgrade,
  isHeistNovice,
  labNextPrice,
  loadProgress,
  noteBankEscape,
  bankValuables,
  buyStarItem,
  consumeStarItem,
  markOnboardingSeen,
  runMods,
  type Currency,
  type HeistRunMods,
  subscribeGameplayReset,
  type LabStat,
} from '../heist/progress'
import { STAR_ITEMS, type StarItemId } from '../heist/economy/balance'
import type { MessageKey } from '../i18n/messages'
import { discardSuspendedRaid, suspendedRaid } from '../heist/v2/ui/HeistGameV2'
import { pendingNotifications } from '../heist/notify'
import { GoalCard } from '../heist/economy/GoalCard'
import { goalProgress } from '../heist/progress'
import { fetchStarsCatalog, syncStarsPurchases, type StarsCatalog } from '../heist/economy/stars'
import { StarsBuyButton } from '../heist/economy/StarsBuyButton'
import { labCueActive, noteLabOpened, noteSuccessfulExit, takeResultCta, trackCtaClick, useCtaView } from '../heist/economy/starsDiscovery'
import { heistSfx, unlockHeistSfx } from '../heist/heistSfx'
import { BANK_ZONE_COUNT, bankCollectedPotential, bankTotalPotential } from '../heist/phaser/bankLayout'
import { HEIST_LEVEL_NAME, HEIST_LEVEL_ORDER, continueLevel, heistLevelBrief, heistLevelCards, isGrandLevel, nextHeistLevel, type HeistLevelId } from '../heist/heistLevel'
import { useI18n } from '../i18n/LanguageProvider'
import { ThiefStatus } from '../heist/economy/ThiefStatus'

/** Goal, guards and cameras of a level, so the player picks the risk knowingly. */
function LevelBrief({ id, cap }: { id: HeistLevelId; cap: number }) {
  const { t } = useI18n()
  const brief = heistLevelBrief(id)
  const items = [
    `${t('heistObjLoot', { n: Math.min(brief.loot, cap) })}`,
    t('heistBriefGuards', { n: brief.guards }),
    t('heistBriefCams', { n: brief.cams }),
    t('heistBriefSafes', { n: brief.safes }),
  ]
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] font-bold tracking-[0.06em] text-zinc-300"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

/** Deeper level = better reward: the loot line on each card. */
const REWARD_KEY: Record<HeistLevelId, MessageKey> = {
  bank: 'heistReward1',
  mansion: 'heistReward2',
  level3: 'heistReward3',
  level4: 'heistReward4',
  level5: 'heistReward5',
  level6: 'heistReward6',
  level7: 'heistReward7',
  level8: 'heistReward8',
}

/** Each deep level brings its own mechanic. */
const FEATURE_KEY: Partial<Record<HeistLevelId, MessageKey>> = {
  level6: 'heistFeatLifts',
  level7: 'heistFeatEscalators',
  level8: 'heistFeatLasers',
}

/** 💰 DUCK COIN and ⭐ Stars side by side, never mixed. */
function Wallet({ coins }: { coins: number }) {
  const { t } = useI18n()
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <div className="rounded-xl border border-amber-400/30 bg-black/30 px-3 py-2 text-center">
        <p className="text-[9px] font-extrabold tracking-[0.16em] text-amber-200/80">💰 DUCK COIN</p>
        <p className="font-display text-lg font-black text-amber-100">{coins.toLocaleString()}</p>
        <p className="text-[9px] leading-tight text-amber-100/55">{t('coinRole')}</p>
      </div>
      {/* Telegram Stars live in Telegram, not in the game: no in-game "Stars 0" balance. */}
      <div className="flex flex-col justify-center rounded-xl border border-sky-300/30 bg-black/30 px-3 py-2 text-center">
        <p className="text-[9px] font-extrabold tracking-[0.16em] text-sky-200/80">{t('labStarsChip')}</p>
        <p className="mt-1 text-[11px] font-bold leading-tight text-sky-100">{t('labStarsChipSub')}</p>
      </div>
    </div>
  )
}

/** ⭐ DUCK LAB on the hub: always there, small; a one-time glow after the first successful EXIT. */
function DuckLabEntry({ cue, onOpen }: { cue: boolean; onOpen: () => void }) {
  const { t } = useI18n()
  const ref = useCtaView('hub')
  return (
    <div ref={ref} className={`duck-lab-entry mt-3 rounded-2xl border px-3 py-3 text-left ${cue ? 'is-cue border-sky-300/70 bg-sky-400/10' : 'border-sky-300/35 bg-sky-400/[0.06]'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold tracking-[0.16em] text-sky-200">⭐ DUCK LAB</p>
        {cue ? <span className="rounded-full bg-sky-300 px-2 py-0.5 text-[9px] font-black tracking-[0.08em] text-zinc-950">{t('labNew')}</span> : null}
      </div>
      <p className="font-display mt-1 text-base font-black text-white">{t('labTitle')}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-sky-100/80">{t('labTracks')}</p>
      <p className="mt-0.5 text-[11px] text-sky-100/60">{t('labFast')}</p>
      <button
        type="button"
        className="mt-2 min-h-11 w-full rounded-xl border border-sky-300/50 bg-sky-300/15 px-3 py-2 text-[13px] font-black text-sky-50"
        onClick={() => {
          trackCtaClick('hub')
          onOpen()
        }}
      >
        {t('labOpen')}
      </button>
    </div>
  )
}

/** ⭐ On a successful EXIT, before the player has ever opened DUCK LAB (capped, never a modal). */
function StarsResultCta({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n()
  const ref = useCtaView('result')
  return (
    <div ref={ref} className="mb-3 rounded-2xl border border-sky-300/40 bg-sky-400/[0.07] px-3 py-3 text-left">
      <p className="text-[12px] font-black tracking-[0.06em] text-sky-100">{t('labCtaTitle')}</p>
      <p className="mt-1 text-[12px] leading-snug text-sky-100/75">{t('labCtaText')}</p>
      <button
        type="button"
        className="mt-2 min-h-11 w-full rounded-xl border border-sky-300/50 bg-sky-300/15 px-3 py-2 text-[13px] font-black text-sky-50"
        onClick={() => {
          trackCtaClick('result')
          onOpen()
        }}
      >
        {t('labCtaOpen')}
      </button>
    </div>
  )
}

/** The whole loop in six lines: steal → get out → upgrade → buy → go deeper → NFT Drop. */
function Onboarding({ onOk }: { onOk: () => void }) {
  const { t } = useI18n()
  // Steal → get out → pick YOUR goal → buy → upgrade → go deeper → collect → NFT Drop.
  const steps: MessageKey[] = ['heistOnb1', 'heistOnb2', 'heistOnb7', 'heistOnb4', 'heistOnb3', 'heistOnb5', 'heistOnb8', 'heistOnb6']
  return (
    <div className="mt-3 rounded-2xl border border-amber-300/40 bg-gradient-to-b from-amber-400/10 to-transparent p-3">
      <p className="font-display text-center text-[15px] font-black tracking-[0.06em] text-amber-200">{t('heistOnbTitle')}</p>
      <p className="mt-1 text-center text-[12px] font-semibold text-amber-50/90">{t('heistOnbIntro')}</p>
      <ol className="mt-2 space-y-1.5">
        {steps.map((k, i) => (
          <li key={k} className="flex items-start gap-2 text-[12px] font-semibold leading-snug text-amber-50">
            <span className="mt-0.5 shrink-0 text-[10px] font-black text-amber-300">{i + 1}</span>
            <span>{t(k)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 rounded-xl border border-amber-300/30 bg-black/25 px-3 py-2 text-center text-[11px] font-semibold leading-snug text-amber-100">{t('heistOnbOutro')}</p>
      <button type="button" className="buy-btn mt-3 min-h-11 w-full rounded-xl px-4 py-2 text-sm font-black text-zinc-950" onClick={onOk}>
        {t('heistOnbOk')}
      </button>
    </div>
  )
}

/** Card colours: each building reads as its own place, locked ones as the next goal. */
const CARD_TONE: Record<HeistLevelId, string> = {
  bank: 'border-amber-400/45 bg-[#1a140c]/95',
  mansion: 'border-orange-300/40 bg-[#1a1014]/95',
  level3: 'border-sky-300/40 bg-[#0e1622]/95',
  level4: 'border-red-400/40 bg-[#1a0c0e]/95',
  level5: 'border-yellow-300/60 bg-[#14100a]/95 shadow-[0_0_24px_rgba(255,214,90,0.12)]',
  level6: 'border-cyan-200/50 bg-[#0c141c]/95',
  level7: 'border-fuchsia-400/50 bg-[#140a16]/95 shadow-[0_0_22px_rgba(255,60,180,0.12)]',
  level8: 'border-red-400/50 bg-[#0e080a]/95 shadow-[0_0_24px_rgba(255,58,58,0.12)]',
}

/** Deepest zone reached so far (0-based) for the card's progress line. */
function levelDepth(progress: ReturnType<typeof loadProgress>, id: HeistLevelId) {
  if (id === 'bank') return progress.bankDepth ?? 0
  if (id === 'mansion') return progress.mansionDepth ?? 0
  return progress.worlds?.[id]?.depth ?? 0
}

/** "LEVEL 4 · BLACK MARKET — UNLOCKED" with a play button, on a completion screen. */
function NextLevelBox({ id, onPlay }: { id: HeistLevelId; onPlay?: () => void }) {
  const { t } = useI18n()
  const n = HEIST_LEVEL_ORDER.indexOf(id) + 1
  return (
    <>
      <div className="mt-5 rounded-2xl border border-orange-300/50 bg-orange-400/10 px-4 py-3">
        <p className="text-[10px] font-extrabold tracking-[0.18em] text-orange-200">{t('heistLevelNum', { n })}</p>
        <p className="font-display mt-1 text-lg font-black text-orange-100">{t('heistLevelNextUnlocked', { level: t(HEIST_LEVEL_NAME[id]) })}</p>
      </div>
      {onPlay ? (
        <button type="button" className="buy-btn mt-5 w-full rounded-2xl px-4 py-3 text-zinc-950" onClick={onPlay}>
          {t('heistPlayLevel', { level: t(HEIST_LEVEL_NAME[id]) })}
        </button>
      ) : null}
    </>
  )
}

/**
 * BANK after a successful EXIT: what the zones mean. Zones already reached have given
 * their loot; the next loot is deeper; the job is all 20. Reads the saved depth only.
 */
function BankProgress({ depth, banked }: { depth: number; banked: number }) {
  const { t } = useI18n()
  const n = Math.min(BANK_ZONE_COUNT, Math.max(1, depth + 1))
  const next = n + 1
  const nextLine =
    n >= BANK_ZONE_COUNT
      ? t('bankFinalLoot', { n: BANK_ZONE_COUNT })
      : next === BANK_ZONE_COUNT
        ? t('bankLastZone', { n: next })
        : t('bankNextLoot', { n: next })
  return (
    <div className="mt-5 space-y-2 text-left">
      <div className="rounded-2xl border border-amber-400/35 bg-[#16120c] px-3 py-3">
        <p className="text-[11px] font-extrabold tracking-[0.14em] text-emerald-300">{t('bankZoneCleared', { n })}</p>
        <p className="font-display mt-0.5 text-base font-black text-amber-100">{nextLine}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500" style={{ width: `${(n / BANK_ZONE_COUNT) * 100}%` }} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.14em] text-zinc-500">{t('bankProgressLabel')}</p>
            <p className="font-display text-lg font-black text-white">{t('bankProgressZones', { n, max: BANK_ZONE_COUNT })}</p>
          </div>
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.14em] text-zinc-500">{t('bankSavedLabel')}</p>
            <p className="font-display text-lg font-black text-amber-200">
              {banked} <span className="text-[10px] tracking-[0.12em] text-amber-300/80">DUCK COIN</span>
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <p className="text-[11px] font-extrabold tracking-[0.14em] text-zinc-300">{t('bankClearedTitle')}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-zinc-400">{t('bankClearedText')}</p>
      </div>
      <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 px-3 py-2.5">
        <p className="text-[11px] font-extrabold tracking-[0.14em] text-amber-200">{t('bankTaskTitle')}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-amber-50/85">{t('bankTaskText', { max: BANK_ZONE_COUNT })}</p>
      </div>
    </div>
  )
}

/**
 * What next after a successful EXIT: fortune, the player's own goal, then one clear
 * order of actions — ▶ keep raiding (a NEW raid, not a resume), Black Market, upgrades.
 */
function RaidNext({
  progress,
  gained,
  onMarket,
  onUpgrades,
  starsCta = false,
}: {
  progress: ReturnType<typeof loadProgress>
  gained: number
  starsCta?: boolean
  onMarket: () => void
  onUpgrades: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="raid-next">
      {starsCta ? <StarsResultCta onOpen={onUpgrades} /> : null}
      <ThiefStatus progress={progress} compact />
      <GoalCard progress={progress} gained={gained} onMarket={onMarket} actions={false} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className="min-h-14 rounded-2xl border border-amber-400/45 bg-amber-400/10 px-2 py-2 text-amber-100" onClick={onMarket}>
          <span className="block text-[12px] font-black">{t('raidMarketBtn')}</span>
          <span className="block text-[9px] font-semibold text-amber-100/60">{t('raidMarketSub')}</span>
        </button>
        <button type="button" className="min-h-14 rounded-2xl border border-sky-300/40 bg-sky-400/10 px-2 py-2 text-sky-100" onClick={onUpgrades}>
          <span className="block text-[12px] font-black">{t('raidUpgradesBtn')}</span>
          <span className="block text-[9px] font-semibold text-sky-100/60">{t('raidUpgradesSub')}</span>
        </button>
      </div>
    </div>
  )
}

/**
 * ▶ KEEP RAIDING, pinned to the bottom of the result card: always fully on screen,
 * whatever the phone height; the rest of the result scrolls above it.
 */
function ContinueBar({ progress, levelId, hint, onContinue }: { progress: ReturnType<typeof loadProgress>; levelId: HeistLevelId; hint?: string; onContinue: (id: HeistLevelId) => void }) {
  const { t } = useI18n()
  const target = continueLevel(progress, levelId)
  const goal = goalProgress(progress)
  return (
    <div className="shrink-0 border-t border-amber-400/20 bg-[#101014] px-5 pb-4 pt-3">
      <button type="button" className="buy-btn raid-continue w-full rounded-2xl px-4 py-3.5 text-[15px] font-black text-zinc-950" onClick={() => onContinue(target)}>
        {target === levelId ? t('raidContinue') : t('raidContinueNext', { level: t(HEIST_LEVEL_NAME[target]) })}
      </button>
      <p className="mt-1.5 text-center text-[11px] font-semibold text-amber-100/75">{hint ?? (goal && !goal.reached ? t('raidContinueHint') : t('raidContinueHintNoGoal'))}</p>
    </div>
  )
}

function formatTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

type Screen = 'lobby' | 'play' | 'result' | 'shop'

export function HeistPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  bindHeistI18n(t)
  const [progress, setProgress] = useState(loadProgress)
  const [end, setEnd] = useState<HeistEnd | null>(null)
  const [runKey, setRunKey] = useState(0)
  const [levelId, setLevelId] = useState<HeistLevelId>('bank')
  const [shopMsg, setShopMsg] = useState<string | null>(null)
  /** Set by the raid that just finished the BANK: the HUB highlights MANSION once. */
  const [justUnlocked, setJustUnlocked] = useState<HeistLevelId | null>(null)
  const [screen, setScreen] = useState<Screen>(() => (isHeistNovice(loadProgress()) ? 'play' : 'lobby'))
  const [raidMods, setRaidMods] = useState<HeistRunMods>(() => runMods(loadProgress()))
  const [resumeRun, setResumeRun] = useState(false)
  const [showOnb, setShowOnb] = useState(false)
  const [labCue, setLabCue] = useState(() => labCueActive(loadProgress().bankEscapes ?? 0))
  const [resultCta, setResultCta] = useState(false)
  useEffect(() => {
    if (screen !== 'shop') return
    trackScreen('stars_open')
    // Opening DUCK LAB once ends the discovery cues for good.
    noteLabOpened()
    setLabCue(false)
  }, [screen])
  /** ⭐ Telegram Stars: server catalog, and gear the server says was already paid for. */
  const [starsCatalog, setStarsCatalog] = useState<StarsCatalog | null>(null)
  useEffect(() => {
    let live = true
    fetchStarsCatalog()
      .then((c) => live && setStarsCatalog(c))
      .catch(() => live && setStarsCatalog(null))
    syncStarsPurchases()
      .then((r) => {
        if (live && r?.raised.length) setProgress(r.progress)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [])
  const novice = isHeistNovice(progress)
  const levelCards = heistLevelCards(progress)
  /** The first locked level: shown as the next goal (with its brief and a ⭐ preview). */
  const nextLocked = levelCards.find((c) => c.locked)?.id ?? null
  const parked = screen === 'lobby' ? suspendedRaid() : null
  // One in-app notification at most (the park card and the loot banner cover the others).
  const topNote = pendingNotifications(progress, { raidParked: Boolean(parked) })[0] ?? null

  useEffect(
    () =>
      subscribeGameplayReset(() => {
        const live = loadProgress()
        setProgress(live)
        setEnd(null)
        setRunKey((n) => n + 1)
        setScreen(isHeistNovice(live) ? 'play' : 'lobby')
      }),
    [],
  )
  // First goal: the cheapest lot actually on sale (Renoir is now a long-term goal, see balance.ts).
  /** Black Market; a reached goal opens straight on its lot. */
  const openMarket = () => {
    const g = goalProgress(loadProgress())
    navigate('/market', g?.reached ? { state: { open: g.item.id } } : undefined)
  }

  const onDone = (next: HeistEnd) => {
    if (next.verdict === 'aborted') {
      setEnd(null)
      setScreen('lobby')
      navigate('/')
      return
    }
    setResultCta(false)
    if (next.verdict === 'escaped') {
      noteSuccessfulExit()
      setResultCta(!next.preview && takeResultCta())
      setLabCue(labCueActive(1))
      const gained = next.coins + next.bonus + next.objBonus
      let updated = bankCoins(progress, gained, next.objectives)
      if (levelId === 'bank') updated = noteBankEscape(updated)
      // Special loot carried out goes to the Black Market fence inventory.
      if (next.valuables?.length) bankValuables(next.valuables)
      updated = loadProgress()
      setProgress(updated)
      if (next.levelCompleted) setJustUnlocked(nextHeistLevel(levelId))
      setEnd({ ...next, banked: updated.bankedDuckCoin })
    } else {
      const live = loadProgress()
      setProgress(live)
      setEnd({ ...next, banked: live.bankedDuckCoin })
    }
    setScreen('result')
  }

  const playLevel = (id: HeistLevelId, opts: { preview?: boolean; resume?: boolean } = {}) => {
    setJustUnlocked(null)
    unlockHeistSfx()
    heistSfx.uiTap()
    if (!opts.resume) discardSuspendedRaid()
    // Gear + one-raid boosts: owned boosts are used up by this raid.
    const live = loadProgress()
    setRaidMods(opts.resume ? raidMods : { ...runMods(live, true), preview: Boolean(opts.preview) })
    setResumeRun(Boolean(opts.resume))
    setProgress(loadProgress())
    setLevelId(id)
    setEnd(null)
    setRunKey((n) => n + 1)
    setScreen('play')
  }

  const openUpgrades = () => {
    setEnd(null)
    setShopMsg(null)
    setScreen('shop')
  }
  /** The result's "what next" block; the ▶ continue button it implies goes to the pinned footer. */
  let pinned: { hint?: string } | null = null
  const raidNext = (gained: number, hint?: string) => {
    pinned = { hint }
    return <RaidNext progress={progress} gained={gained} onMarket={openMarket} onUpgrades={openUpgrades} starsCta={resultCta} />
  }

  const buyLab = (stat: LabStat, currency: Currency) => {
    const result = buyLabUpgrade(progress, stat, currency)
    if (result.reason === 'max') {
      setShopMsg(t('heistLabMax'))
      return
    }
    if (result.reason === 'poor') {
      setShopMsg(currency === 'stars' ? t('heistNotEnoughStars') : t('heistNotEnoughCoins'))
      return
    }
    setProgress(result.next)
    // Clear feedback in the currency that was actually spent.
    setShopMsg(currency === 'stars' ? t('heistSpentStars', { n: result.price }) : t('heistSpentCoins', { n: result.price.toLocaleString() }))
    unlockHeistSfx()
    if (currency === 'stars') heistSfx.starPurchase()
    heistSfx.upgrade()
  }

  const buyItem = (id: StarItemId) => {
    const result = buyStarItem(id)
    if (!result.ok) {
      setShopMsg(t('heistNotEnoughStars'))
      return
    }
    setProgress(result.next)
    setShopMsg(t('heistSpentStars', { n: result.price }))
    unlockHeistSfx()
    heistSfx.starPurchase()
  }

  /** PREVIEW of the next locked level: first floor only, never completes it. Stars only. */
  const playPreview = (id: HeistLevelId) => {
    if (!consumeStarItem('previewPass')) {
      const bought = buyStarItem('previewPass')
      if (!bought.ok || !consumeStarItem('previewPass')) {
        setShopMsg(t('heistNotEnoughStars'))
        return
      }
      heistSfx.starPurchase()
    }
    playLevel(id, { preview: true })
  }

  if (screen === 'play') {
    return (
      <section
        className="relative h-[calc(100dvh-4.75rem-var(--safe-bottom))] overflow-hidden overscroll-none bg-[#120c10]"
        style={{ touchAction: 'none', overscrollBehavior: 'none' }}
      >
        <HeistGame
          key={`${levelId}-${runKey}`}
          running
          mods={raidMods}
          levelId={levelId}
          novice={novice}
          onDone={onDone}
          resume={resumeRun}
          onSuspend={() => {
            setResumeRun(false)
            setProgress(loadProgress())
            setScreen('lobby')
          }}
        />
      </section>
    )
  }

  if (screen === 'shop') {
    const tracks: { stat: LabStat; title: string; names: string[]; hints: string[] }[] = [
      {
        stat: 'bagLevel',
        title: t('heistLabBag'),
        names: [t('heistBagLv0'), t('heistBagLv1'), t('heistBagLv2'), t('heistBagLv3')],
        hints: [t('heistBagLv0Hint'), t('heistBagLv1Hint'), t('heistBagLv2Hint'), t('heistBagLv3Hint')],
      },
      {
        stat: 'disguiseLevel',
        title: t('heistLabDisguise'),
        names: [t('heistDisguiseLv0'), t('heistDisguiseLv1'), t('heistDisguiseLv2'), t('heistDisguiseLv3')],
        hints: [t('heistDisguiseLv0Hint'), t('heistDisguiseLv1Hint'), t('heistDisguiseLv2Hint'), t('heistDisguiseLv3Hint')],
      },
      {
        stat: 'shoesLevel',
        title: t('heistLabShoes'),
        names: [t('heistShoesLv0'), t('heistShoesLv1'), t('heistShoesLv2'), t('heistShoesLv3')],
        hints: [t('heistShoesLv0Hint'), t('heistShoesLv1Hint'), t('heistShoesLv2Hint'), t('heistShoesLv3Hint')],
      },
      {
        stat: 'dashLevel',
        title: t('heistLabDash'),
        names: [t('heistDashLv0'), t('heistDashLv1'), t('heistDashLv2'), t('heistDashLv3')],
        hints: [t('heistDashLv0Hint'), t('heistDashLv1Hint'), t('heistDashLv2Hint'), t('heistDashLv3Hint')],
      },
      {
        stat: 'lockpickLevel',
        title: t('heistLabLock'),
        names: [t('heistLockLv0'), t('heistLockLv1'), t('heistLockLv2'), t('heistLockLv3')],
        hints: [t('heistLockLv0Hint'), t('heistLockLv1Hint'), t('heistLockLv2Hint'), t('heistLockLv3Hint')],
      },
      {
        stat: 'magnetLevel',
        title: t('heistLabMagnet'),
        names: [t('heistMagnetLv0'), t('heistMagnetLv1'), t('heistMagnetLv2'), t('heistMagnetLv3')],
        hints: [t('heistMagnetLv0Hint'), t('heistMagnetLv1Hint'), t('heistMagnetLv2Hint'), t('heistMagnetLv3Hint')],
      },
    ]
    const starItems: { id: StarItemId; name: MessageKey }[] = [
      { id: 'continueRaid', name: 'heistItemContinueRaid' },
      { id: 'boostBag', name: 'heistItemBoostBag' },
      { id: 'boostStealth', name: 'heistItemBoostStealth' },
      { id: 'boostSpeed', name: 'heistItemBoostSpeed' },
      { id: 'boostSilent', name: 'heistItemBoostSilent' },
      { id: 'elevatorPass', name: 'heistItemElevatorPass' },
      { id: 'escalatorPass', name: 'heistItemEscalatorPass' },
      { id: 'previewPass', name: 'heistItemPreviewPass' },
    ]
    return (
      <section className="relative h-[calc(100dvh-4.75rem-var(--safe-bottom))] overflow-y-auto bg-[#120c10] px-5 pb-6 pt-[calc(var(--safe-top)+24px)]">
        <div className="mx-auto w-full max-w-sm">
          <p className="text-center text-[11px] font-extrabold tracking-[0.2em] text-amber-200">{t('heistLab')}</p>
          <p className="mt-1 text-center text-[10px] font-extrabold tracking-[0.18em] text-amber-100/70">{t('heistUpgrades')}</p>
          <Wallet coins={progress.bankedDuckCoin} />
          <p className="mt-2 text-center text-[11px] font-semibold text-amber-100/70">{t('starsFreeHint')}</p>
          {shopMsg ? <p className="mt-3 text-center text-sm font-bold text-orange-300">{shopMsg}</p> : null}
          <div className="mt-5 space-y-3">
            {tracks.map((track) => {
              const level = progress[track.stat]
              const current = track.names[level] ?? track.names[0]
              const nextName = track.names[level + 1]
              const hint = track.hints[Math.min(level + (nextName ? 1 : 0), track.hints.length - 1)]
              const coinPrice = labNextPrice(progress, track.stat, 'coin')
              const starPrice = labNextPrice(progress, track.stat, 'stars')
              const maxed = coinPrice == null
              return (
                <div key={track.stat} className="rounded-2xl border border-amber-400/30 bg-[#101014]/90 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-display text-lg font-black text-amber-100">{track.title}</p>
                    <p className="shrink-0 text-[11px] font-extrabold tracking-[0.12em] text-amber-200">{t('heistLabLevel', { n: level + 1, max: 4 })}</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-amber-50">{t('heistLabCurrent', { name: current })}</p>
                  <p className="mt-1 text-sm text-zinc-400">{t('heistLabNext', { name: maxed ? t('heistLabMax') : nextName })}</p>
                  <p className="mt-1 text-sm text-zinc-500">{hint}</p>
                  {maxed ? (
                    <p className="mt-3 text-center font-mono text-sm font-bold text-amber-200">{t('heistLabMax')}</p>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={progress.bankedDuckCoin < (coinPrice ?? 0)}
                        className="min-h-12 rounded-xl border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-sm font-black text-amber-100 disabled:opacity-45"
                        onClick={() => buyLab(track.stat, 'coin')}
                      >
                        {t('heistBuyCoins', { n: (coinPrice ?? 0).toLocaleString() })}
                      </button>
                      {(() => {
                        // ⭐ Real Telegram Stars for the tracks the server sells; the rest keep the old button.
                        const product = starsCatalog?.products.find((p) => p.stat === track.stat)
                        if (starsCatalog && product) {
                          return (
                            <StarsBuyButton
                              key={`${product.id}-${level}`}
                              product={product}
                              catalog={starsCatalog}
                              level={level}
                              onDelivered={(next) => setProgress(next)}
                              onMessage={setShopMsg}
                            />
                          )
                        }
                        return (
                          <button
                            type="button"
                            disabled={(progress.stars || 0) < (starPrice ?? 0)}
                            className="buy-btn min-h-12 rounded-xl px-3 py-2 text-sm font-black text-zinc-950 disabled:opacity-45"
                            onClick={() => buyLab(track.stat, 'stars')}
                          >
                            {t('heistBuyStars', { n: starPrice ?? 0 })}
                          </button>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="mt-6 text-center text-[10px] font-extrabold tracking-[0.2em] text-amber-200">{t('heistStarShop')}</p>
          <p className="mt-1 text-center text-[11px] text-zinc-500">{t('heistStarShopHint')}</p>
          <div className="mt-3 space-y-2">
            {starItems.map((it) => {
              const price = STAR_ITEMS[it.id].stars
              const owned = progress.starItems?.[it.id] ?? 0
              return (
                <div key={it.id} className="flex items-center justify-between gap-3 rounded-2xl border border-amber-400/20 bg-[#101014]/80 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-amber-50">{t(it.name)}</p>
                    {owned > 0 ? <p className="text-[11px] text-emerald-300">{t('heistItemOwned', { n: owned })}</p> : null}
                  </div>
                  <button
                    type="button"
                    disabled={(progress.stars || 0) < price}
                    className="buy-btn min-h-11 shrink-0 rounded-xl px-3 text-sm font-black text-zinc-950 disabled:opacity-45"
                    onClick={() => buyItem(it.id)}
                  >
                    ⭐ {price}
                  </button>
                </div>
              )
            })}
          </div>
          <p className="mt-6 text-center text-[11px] text-zinc-500">{t('heistNightVisionSoon')}</p>
          <button
            type="button"
            className="mt-5 min-h-12 w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-zinc-200"
            onClick={() => {
              setShopMsg(null)
              setScreen('lobby')
            }}
          >
            {t('heistHome')}
          </button>
        </div>
      </section>
    )
  }

  if (screen === 'result' && end) {
    const win = end.verdict === 'escaped'
    const mansionDone = levelId === 'mansion' && win && end.mansionCompleted
    const grandDone = isGrandLevel(levelId) && win && end.levelCompleted
    const bankRun = levelId === 'bank'
    const gained = end.coins + end.bonus + end.objBonus
    const content = (
      <>
          {mansionDone ? (
            <>
              <p className="text-4xl">🏆</p>
              <p className="font-display mt-2 text-3xl font-black text-amber-300">{t('heistMansionDoneTitle')}</p>
              <p className="mt-2 text-sm font-semibold text-amber-100">{t('heistMansionDoneSub')}</p>
              <div className="mt-6 flex items-baseline justify-between gap-3 text-left">
                <span className="text-[11px] font-extrabold tracking-[0.16em] text-zinc-500">{t('heistCarriedOut')}</span>
                <span className="font-display text-2xl font-black text-white">
                  {gained} {t('heistDuckCoin')}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-3 text-left">
                <span className="text-[11px] font-extrabold tracking-[0.16em] text-zinc-500">{t('heistThiefScore')}</span>
                <span className="font-display text-2xl font-black text-amber-200">{end.banked}</span>
              </div>
              <NextLevelBox id="level3" />
              {raidNext(gained)}
              <button
                type="button"
                className="mt-3 w-full rounded-2xl border border-amber-400/40 px-4 py-3 text-sm font-bold text-amber-100"
                onClick={() => {
                  setEnd(null)
                  setScreen('lobby')
                }}
              >
                {t('heistToHub')}
              </button>
            </>
          ) : grandDone ? (
            <>
              <p className="text-4xl">{levelId === 'level5' ? '👑' : '🏆'}</p>
              {levelId === 'level5' ? (
                <>
                  <p className="mt-1 text-[11px] font-extrabold tracking-[0.24em] text-emerald-300">{t('heistGameDoneBadge')}</p>
                  <p className="font-display mt-1 text-3xl font-black text-amber-300">{t('heistGameDoneTitle')}</p>
                  <p className="mt-2 text-sm font-semibold text-amber-100">{t('heistGameDoneSub')}</p>
                </>
              ) : (
                <>
                  <p className="font-display mt-2 text-3xl font-black text-amber-300">{t('heistLevelDoneTitle', { level: t(HEIST_LEVEL_NAME[levelId]) })}</p>
                  <p className="mt-2 text-sm font-semibold text-amber-100">{t('heistLevelDoneSub')}</p>
                </>
              )}
              <div className="mt-6 flex items-baseline justify-between gap-3 text-left">
                <span className="text-[11px] font-extrabold tracking-[0.16em] text-zinc-500">{t('heistCarriedOut')}</span>
                <span className="font-display text-2xl font-black text-white">
                  {gained} {t('heistDuckCoin')}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-3 text-left">
                <span className="text-[11px] font-extrabold tracking-[0.16em] text-zinc-500">{t('heistThiefScore')}</span>
                <span className="font-display text-2xl font-black text-amber-200">{end.banked}</span>
              </div>
              {nextHeistLevel(levelId) ? (
                <NextLevelBox id={nextHeistLevel(levelId)!} />
              ) : (
                <div className="mt-5 flex justify-center gap-1.5 text-lg">
                  {HEIST_LEVEL_ORDER.map((id) => (
                    <span key={id} title={t(HEIST_LEVEL_NAME[id])}>
                      ✓
                    </span>
                  ))}
                </div>
              )}
              {raidNext(gained)}
              <button
                type="button"
                className="mt-3 w-full rounded-2xl border border-amber-400/40 px-4 py-3 text-sm font-bold text-amber-100"
                onClick={() => {
                  setEnd(null)
                  setScreen('lobby')
                }}
              >
                {t('heistToHub')}
              </button>
            </>
          ) : bankRun && win && end.bankCompleted ? (
            <>
              <p className="text-4xl">🏆</p>
              <p className="font-display mt-2 text-3xl font-black text-amber-300">{t('heistBankDoneTitle')}</p>
              <p className="mt-2 text-sm font-semibold text-amber-100">{t('heistBankDoneSub', { max: BANK_ZONE_COUNT })}</p>
              <div className="mt-6 flex items-baseline justify-between gap-3 text-left">
                <span className="text-[11px] font-extrabold tracking-[0.16em] text-zinc-500">{t('heistCarriedOut')}</span>
                <span className="font-display text-2xl font-black text-white">
                  {gained} {t('heistDuckCoin')}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-3 text-left">
                <span className="text-[11px] font-extrabold tracking-[0.16em] text-zinc-500">{t('heistThiefScore')}</span>
                <span className="font-display text-2xl font-black text-amber-200">{end.banked}</span>
              </div>
              <div className="mt-5 rounded-2xl border border-orange-300/50 bg-orange-400/10 px-4 py-3">
                <p className="text-[10px] font-extrabold tracking-[0.18em] text-orange-200">{t('heistMansionUnlocked')}</p>
                <p className="font-display mt-1 text-lg font-black text-orange-100">{t('heistBankDoneNext')}</p>
              </div>
              {raidNext(gained)}
              <button
                type="button"
                className="mt-3 w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-zinc-300"
                onClick={() => {
                  setEnd(null)
                  setScreen('lobby')
                }}
              >
                {t('heistToHub')}
              </button>
            </>
          ) : bankRun && win ? (
            <>
              <p className="font-display text-3xl font-black text-amber-300">{t('heistBankWin')}</p>
              <div className="mt-6 flex items-baseline justify-between gap-3 text-left">
                <span className="text-[11px] font-extrabold tracking-[0.16em] text-zinc-500">{t('heistCarriedOut')}</span>
                <span className="font-display text-2xl font-black text-white">
                  {gained} {t('heistDuckCoin')}
                </span>
              </div>
              {progress.bankComplete ? (
                <>
                  <div className="mt-3 flex items-baseline justify-between gap-3 text-left">
                    <span className="text-[11px] font-extrabold tracking-[0.16em] text-zinc-500">{t('heistThiefScore')}</span>
                    <span className="font-display text-2xl font-black text-amber-200">{end.banked}</span>
                  </div>
                  <p className="mt-5 text-sm font-semibold text-amber-100">
                    {t('heistBankCompleteTitle')} · {t('heistMansionUnlocked')}
                  </p>
                </>
              ) : (
                <BankProgress depth={progress.bankDepth ?? 0} banked={end.banked} />
              )}
              {/* The player's own goal — never one the game picked for them. */}
              {raidNext(gained, progress.bankComplete ? undefined : t('bankContinueHint'))}
            </>
          ) : bankRun ? (
            <>
              <p className="font-display text-3xl font-black text-orange-300">{t('heistCaughtBagLost')}</p>
              <p className="mt-6 text-sm text-zinc-300">{t('heistBagHad', { n: end.coins })}</p>
              <p className="mt-2 text-sm text-zinc-300">{t('heistBankPlusZero')}</p>
              <p className="mt-2 text-sm text-amber-100">
                {t('heistThiefScore')} {end.banked}
              </p>
              <button type="button" className="buy-btn mt-6 w-full rounded-2xl px-4 py-3 text-zinc-950" onClick={() => playLevel('bank')}>
                {t('heistRetryBank')}
              </button>
            </>
          ) : (
            <>
              <p className="font-display text-3xl font-black text-amber-300">{win ? t('resRaidDone') : t('heistCaught')}</p>
              {win ? (
                <>
                  <p className="mt-5 font-display text-5xl font-black text-white">+{gained}</p>
                  <p className="text-xs font-extrabold tracking-[0.18em] text-amber-200">{t('heistDuckCoin')}</p>
                  <p className="mt-3 text-sm text-zinc-300">
                    {t('heistBanked')}: {end.banked}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-zinc-200">
                    <div>
                      <p className="text-[10px] font-extrabold tracking-[0.14em] text-zinc-500">{t('heistTime')}</p>
                      <p className="font-display text-xl font-black">{formatTime(end.timeMs)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold tracking-[0.14em] text-zinc-500">{t('heistCoinsCollected')}</p>
                      <p className="font-display text-xl font-black">{end.coins}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold tracking-[0.14em] text-zinc-500">{t('heistAlert')}</p>
                      <p className="font-display text-xl font-black">{Math.round(end.alert * 100)}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold tracking-[0.14em] text-zinc-500">{t('heistBonus')}</p>
                      <p className="font-display text-xl font-black">{end.bonus + end.objBonus}</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-amber-400/25 bg-[#120c10]/80 p-3 text-left">
                    <p className="text-center text-[10px] font-extrabold tracking-[0.18em] text-amber-200">{t('heistObjectives')}</p>
                    <p className={`mt-2 text-sm ${end.objectives.loot ? 'text-amber-100' : 'text-zinc-500'}`}>
                      {end.objectives.loot ? '✓' : '□'} {t('heistObjLoot', { n: end.lootGoal })}
                      {end.objectives.loot ? `  +${RAID_OBJ_REWARD}` : ''}
                    </p>
                    <p className={`mt-1 text-sm ${end.objectives.stealth ? 'text-amber-100' : 'text-zinc-500'}`}>
                      {end.objectives.stealth ? '✓' : '□'} {t('heistObjStealth')}
                      {end.objectives.stealth ? `  +${RAID_OBJ_REWARD}` : ''}
                    </p>
                    <p className={`mt-1 text-sm ${end.objectives.speed ? 'text-amber-100' : 'text-zinc-500'}`}>
                      {end.objectives.speed ? '✓' : '□'} {t('heistObjSpeed', { n: end.speedGoalS })}
                      {end.objectives.speed ? `  +${RAID_OBJ_REWARD}` : ''}
                    </p>
                    {end.objectives.loot && end.objectives.stealth && end.objectives.speed ? (
                      <p className="mt-2 text-center text-sm font-bold text-amber-200">{t('heistObjAll', { n: RAID_OBJ_ALL })}</p>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-5 text-xs font-extrabold tracking-[0.2em] text-orange-300/80">{t('heistLostRun')}</p>
                  <p className="font-display text-4xl font-black text-orange-200">{end.coins}</p>
                  <p className="mt-3 text-sm text-zinc-300">
                    {t('heistBanked')}: {end.banked}
                  </p>
                </>
              )}
              {win ? (
                raidNext(gained)
              ) : (
                <>
                  <button type="button" className="buy-btn mt-6 w-full rounded-2xl px-4 py-3 text-zinc-950" onClick={() => playLevel(levelId)}>
                    {t('heistTryAgain')}
                  </button>
                  <button type="button" className="mt-3 w-full rounded-2xl border border-amber-400/40 px-4 py-3 text-sm font-bold text-amber-100" onClick={openUpgrades}>
                    {t('heistUpgrades')}
                  </button>
                </>
              )}
            </>
          )}
      </>
    )
    const bar = pinned as { hint?: string } | null
    return (
      <section className="relative flex h-[calc(100dvh-4.75rem-var(--safe-bottom))] flex-col items-center justify-center overflow-hidden bg-[#120c10] px-4 pb-3 pt-[calc(var(--safe-top)+12px)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,193,7,0.22),transparent_55%)]" />
        {/* The result scrolls inside the card; ▶ continue stays pinned at its bottom, never under the nav. */}
        <div className="relative flex max-h-full min-h-0 w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-amber-400/40 bg-[#101014]/92 text-center shadow-[0_0_60px_rgba(255,176,40,0.12)]">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-5">{content}</div>
          {bar ? <ContinueBar progress={progress} levelId={levelId} hint={bar.hint} onContinue={(id) => playLevel(id)} /> : null}
        </div>
      </section>
    )
  }

  return (
    <section className="relative h-[calc(100dvh-4.75rem-var(--safe-bottom))] overflow-y-auto bg-[#120c10]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,107,0,0.18),transparent_50%)]" />
      <div className="relative mx-auto flex min-h-full w-full max-w-sm flex-col items-center px-5 pb-6 pt-[calc(var(--safe-top)+16px)]">
        <HeistDuck className="hero-duck mb-1 block" size={120} fit="height" />
        <div className="w-full rounded-3xl border border-amber-400/35 bg-[#120c10]/88 p-4 backdrop-blur-md">
          <div className="mb-3 flex justify-center">
            <LangSwitch gold />
          </div>
          <p className="text-center text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-200">{t('heistKicker')}</p>
          <h1 className="font-display mt-1 text-center text-3xl font-black text-amber-50">{t('heistTitle')}</h1>
          <Wallet coins={progress.bankedDuckCoin} />
          <DuckLabEntry
            cue={labCue}
            onOpen={() => {
              setShopMsg(null)
              setScreen('shop')
            }}
          />
          <ThiefStatus progress={progress} />
          <GoalCard progress={progress} onMarket={openMarket} collection />
          <div className="mt-1 flex justify-between text-sm text-zinc-300">
            <span>{t('heistBag')}</span>
            <span className="font-mono font-bold text-amber-200">{bagCap(progress)}</span>
          </div>
          <p className="mt-3 text-center text-[11px] font-extrabold tracking-[0.14em] text-amber-200">
            {progress.bankComplete
              ? t('heistBankCompleteTitle')
              : t('heistBankZone', { n: Math.min(BANK_ZONE_COUNT, Math.max(1, (progress.bankDepth ?? 0) + 1)), max: BANK_ZONE_COUNT })}
          </p>
          <p className="mt-1 text-center text-[11px] text-zinc-400">
            {t('heistBankCollected', {
              n: bankCollectedPotential(progress.bankLootTaken ?? [], progress.bankOpenedSafes ?? []),
              total: bankTotalPotential(),
            })}
          </p>
          {!progress.onboardingSeen || showOnb ? (
            <Onboarding
              onOk={() => {
                markOnboardingSeen()
                setShowOnb(false)
                setProgress(loadProgress())
              }}
            />
          ) : (
            <button type="button" className="mt-2 w-full text-center text-[11px] font-bold text-amber-200/80 underline" onClick={() => setShowOnb(true)}>
              {t('heistOnbAgain')}
            </button>
          )}
          {parked ? (
            <button
              type="button"
              className="buy-btn mt-3 w-full rounded-2xl px-4 py-3 text-left text-zinc-950"
              onClick={() => playLevel(parked.levelId, { resume: true })}
            >
              <span className="block font-display text-base font-black">▶ {t('heistContinueRaid')}</span>
              <span className="block text-[11px] font-bold">
                {t('heistSuspendedHint', { level: t(HEIST_LEVEL_NAME[parked.levelId]), n: parked.zone, bag: parked.bag })}
              </span>
            </button>
          ) : null}
          {progress.valuables.length ? (
            <div className="mt-3 rounded-2xl border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-center">
              <p className="text-[12px] font-bold text-amber-100">
                {t('heistValuablesHub', { n: progress.valuables.length, v: progress.valuables.reduce((a, v) => a + v.value, 0).toLocaleString() })}
              </p>
              <button type="button" className="mt-1 text-[11px] font-extrabold tracking-[0.12em] text-amber-200 underline" onClick={() => navigate('/market')}>
                {t('heistOpenMarket')}
              </button>
            </div>
          ) : null}
          {shopMsg ? <p className="mt-2 text-center text-sm font-bold text-orange-300">{shopMsg}</p> : null}
          {topNote && topNote.kind === 'upgrade' ? (
            <button type="button" className="mt-2 w-full rounded-xl border border-sky-300/30 bg-sky-300/5 px-3 py-2 text-[12px] font-bold text-sky-100" onClick={() => setScreen('shop')}>
              {t(topNote.key)}
            </button>
          ) : null}
          <div className="mt-4 space-y-3">
            {levelCards.map((card) => {
              const open = !card.locked
              const done = card.done
              const fresh = open && justUnlocked === card.id
              const badge = done ? t('heistLevelDone') : open && card.id !== 'bank' ? t('heistLevelUnlocked') : open ? t('heistLevelOpen') : t('heistLevelLocked')
              const depth = levelDepth(progress, card.id)
              const tone = open ? CARD_TONE[card.id] : card.id === nextLocked ? `${CARD_TONE[card.id]} opacity-90` : `${CARD_TONE[card.id]} opacity-60 grayscale-[35%]`
              return (
                <div
                  key={card.n}
                  className={`rounded-2xl border p-3 transition-shadow ${tone}${fresh ? ' animate-pulse ring-2 ring-orange-300/70 shadow-[0_0_28px_rgba(255,170,90,0.35)]' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold tracking-[0.18em] text-amber-200/80">{t('heistLevelNum', { n: card.n })}</p>
                      <p className="font-display mt-0.5 text-xl font-black text-amber-50">{t(card.nameKey)}</p>
                      <p className="mt-0.5 text-[10px] font-bold tracking-[0.14em] text-zinc-400">
                        {open && !done && card.id !== 'bank' && depth > 0
                          ? t('heistLevelZone', { level: t(card.nameKey), n: Math.min(card.zones, depth + 1), max: card.zones })
                          : t('heistZonesN', { n: card.zones })}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-extrabold tracking-[0.08em] ${
                        done
                          ? 'border border-emerald-400/50 text-emerald-300'
                          : open
                            ? 'border border-amber-400/40 text-amber-200'
                            : 'border border-white/15 text-zinc-500'
                      }`}
                    >
                      {badge}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-bold text-amber-100/80">
                    {t('heistRewardTier', { tier: t(REWARD_KEY[card.id]) })}
                    {FEATURE_KEY[card.id] ? ` · ${t(FEATURE_KEY[card.id]!)}` : ''}
                  </p>
                  {open || card.id === nextLocked ? <LevelBrief id={card.id} cap={bagCap(progress)} /> : null}
                  {!open && card.id === nextLocked ? (
                    <button
                      type="button"
                      className="mt-3 min-h-11 w-full rounded-xl border border-sky-300/50 bg-sky-300/10 px-4 py-2.5 text-sm font-extrabold tracking-[0.12em] text-sky-100"
                      onClick={() => playPreview(card.id)}
                    >
                      {(progress.starItems?.previewPass ?? 0) > 0 ? t('heistPreviewUse') : t('heistPreviewPlay', { n: STAR_ITEMS.previewPass.stars })}
                      <span className="block text-[10px] font-bold text-sky-200/80">{t('heistPreviewHint')}</span>
                    </button>
                  ) : null}
                  {open ? (
                    <button
                      type="button"
                      className="buy-btn mt-3 min-h-12 w-full rounded-xl px-4 py-3 font-display text-lg font-black tracking-[0.12em] text-zinc-950"
                      onClick={() => playLevel(card.id)}
                    >
                      {t(card.id === 'bank' ? 'hubEnterBank' : 'heistPlay')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="mt-3 min-h-11 w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-extrabold tracking-[0.14em] text-zinc-500"
                    >
                      🔒 {card.needs ? t('heistLevelNeeds', { level: t(HEIST_LEVEL_NAME[card.needs]) }) : t('heistLevelLocked')}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <button
            type="button"
            className="mt-3 w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-zinc-200"
            onClick={() => {
              setShopMsg(null)
              setScreen('shop')
            }}
          >
            {t('heistUpgrades')}
          </button>
        </div>
      </div>
    </section>
  )
}
