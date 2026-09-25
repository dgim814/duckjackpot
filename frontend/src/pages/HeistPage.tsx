import { useEffect, useMemo, useState } from 'react'
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
  runMods,
  subscribeGameplayReset,
  type LabStat,
} from '../heist/progress'
import { catalogItem } from '../heist/economy/catalog'
import { requestStarsPurchase, STAR_PACKS } from '../heist/economy/stars'
import { heistSfx, unlockHeistSfx } from '../heist/heistSfx'
import { BANK_ZONE_COUNT, bankCollectedPotential, bankTotalPotential } from '../heist/phaser/bankLayout'
import { HEIST_LEVEL_NAME, HEIST_LEVEL_ORDER, heistLevelBrief, heistLevelCards, isGrandLevel, nextHeistLevel, type HeistLevelId } from '../heist/heistLevel'
import { useI18n } from '../i18n/LanguageProvider'
import { loadNftTrial, nftSkin, nftTrialLeft, type NftTrial } from '../heist/nftTrial'

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

/** Card colours: each building reads as its own place, locked ones as the next goal. */
const CARD_TONE: Record<HeistLevelId, string> = {
  bank: 'border-amber-400/45 bg-[#1a140c]/95',
  mansion: 'border-orange-300/40 bg-[#1a1014]/95',
  level3: 'border-sky-300/40 bg-[#0e1622]/95',
  level4: 'border-red-400/40 bg-[#1a0c0e]/95',
  level5: 'border-yellow-300/60 bg-[#14100a]/95 shadow-[0_0_24px_rgba(255,214,90,0.12)]',
}

/** Deepest zone reached so far (0-based) for the card's progress line. */
function levelDepth(progress: ReturnType<typeof loadProgress>, id: HeistLevelId) {
  if (id === 'bank') return progress.bankDepth ?? 0
  if (id === 'mansion') return progress.mansionDepth ?? 0
  return progress.worlds?.[id]?.depth ?? 0
}

/** "LEVEL 4 · BLACK MARKET — UNLOCKED" with a play button, on a completion screen. */
function NextLevelBox({ id, onPlay }: { id: HeistLevelId; onPlay: () => void }) {
  const { t } = useI18n()
  const n = HEIST_LEVEL_ORDER.indexOf(id) + 1
  return (
    <>
      <div className="mt-5 rounded-2xl border border-orange-300/50 bg-orange-400/10 px-4 py-3">
        <p className="text-[10px] font-extrabold tracking-[0.18em] text-orange-200">{t('heistLevelNum', { n })}</p>
        <p className="font-display mt-1 text-lg font-black text-orange-100">{t('heistLevelNextUnlocked', { level: t(HEIST_LEVEL_NAME[id]) })}</p>
      </div>
      <button type="button" className="buy-btn mt-5 w-full rounded-2xl px-4 py-3 text-zinc-950" onClick={onPlay}>
        {t('heistPlayLevel', { level: t(HEIST_LEVEL_NAME[id]) })}
      </button>
    </>
  )
}

/** Active 24h NFT look on the HUB, ticking; it removes itself when the try-on expires. */
function HubSkinLine({ trial, onDrop }: { trial: NftTrial; onDrop: () => void }) {
  const { t } = useI18n()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  if (now >= trial.expiresAt) return null
  const skin = nftSkin(trial.nftId)
  return (
    <div className="mt-3 rounded-2xl border px-3 py-2 text-center" style={{ borderColor: `${skin.css}66`, background: `${skin.css}14` }}>
      <p className="text-[10px] font-extrabold tracking-[0.18em] text-zinc-300">👑 {t('heistNftSkinHub')}</p>
      <p className="font-display text-sm font-black" style={{ color: skin.css }}>
        {skin.name}
      </p>
      <p className="font-mono text-xs font-bold text-amber-100">{nftTrialLeft(trial, now, true)}</p>
      <button type="button" className="mt-1 text-[11px] font-bold tracking-[0.12em] text-sky-100 underline" onClick={onDrop}>
        {t('heistNftOpenDrop')}
      </button>
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
  const mods = useMemo(() => runMods(progress), [progress])
  const novice = isHeistNovice(progress)
  // Re-read on every HUB render so an expired try-on disappears on its own.
  const skinTrial = screen === 'lobby' ? loadNftTrial() : null

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
  const firstLot = catalogItem('art_sketch')
  const firstLotPrice = firstLot?.purchasePrice ?? 40

  const onDone = (next: HeistEnd) => {
    if (next.verdict === 'aborted') {
      setEnd(null)
      setScreen('lobby')
      navigate('/')
      return
    }
    if (next.verdict === 'escaped') {
      const gained = next.coins + next.bonus + next.objBonus
      let updated = bankCoins(progress, gained, next.objectives)
      if (levelId === 'bank') updated = noteBankEscape(updated)
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

  const playLevel = (id: HeistLevelId) => {
    setJustUnlocked(null)
    unlockHeistSfx()
    heistSfx.uiTap()
    setLevelId(id)
    setEnd(null)
    setRunKey((n) => n + 1)
    setScreen('play')
  }

  const buyLab = (stat: LabStat) => {
    const result = buyLabUpgrade(progress, stat)
    if (result.reason === 'max') {
      setShopMsg(t('heistLabMax'))
      return
    }
    if (result.reason === 'poor') {
            setShopMsg(t('heistNotEnoughStars'))
      return
    }
    setProgress(result.next)
    setShopMsg(null)
    unlockHeistSfx()
    heistSfx.purchase()
  }

  if (screen === 'play') {
    return (
      <section
        className="relative h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] overflow-hidden overscroll-none bg-[#120c10]"
        style={{ touchAction: 'none', overscrollBehavior: 'none' }}
      >
        <HeistGame key={`${levelId}-${runKey}`} running mods={mods} levelId={levelId} novice={novice} onDone={onDone} />
      </section>
    )
  }

  if (screen === 'shop') {
    const tracks: {
      stat: LabStat
      title: string
      names: string[]
      hints: string[]
    }[] = [
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
    ]
    const soon = [
      t('heistLabNightVision'),
      t('heistLabFasterDash'),
      t('heistLabMoneyMagnet'),
      t('heistLabLockpick'),
    ]
    return (
      <section className="relative h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] overflow-y-auto bg-[#120c10] px-5 py-6">
        <div className="mx-auto w-full max-w-sm">
          <p className="text-center text-[11px] font-extrabold tracking-[0.2em] text-amber-200">{t('heistLab')}</p>
          <p className="mt-1 text-center text-[10px] font-extrabold tracking-[0.18em] text-amber-100/70">{t('heistUpgrades')}</p>
          <p className="mt-3 text-center font-display text-4xl font-black text-amber-300">{progress.stars || 0}</p>
          <p className="text-center text-xs font-extrabold tracking-[0.18em] text-amber-100/80">{t('heistStars')}</p>
          <p className="mt-1 text-center text-xs text-zinc-400">
            {t('heistBag')} {bagCap(progress)}
          </p>
          <p className="mt-1 text-center text-[11px] text-zinc-500">{t('heistStarsHint')}</p>
          <button
            type="button"
            className="mt-3 min-h-12 w-full rounded-xl border border-amber-400/30 px-4 py-3 text-sm font-bold text-amber-100"
            onClick={() => {
              const result = requestStarsPurchase(STAR_PACKS[0])
              if (!result.ok) setShopMsg(t('heistStarsSoon'))
            }}
          >
            {t('heistStarsBuy')}
          </button>
          {shopMsg ? <p className="mt-3 text-center text-sm font-bold text-orange-300">{shopMsg}</p> : null}
          <div className="mt-5 space-y-3">
            {tracks.map((track) => {
              const level = progress[track.stat]
              const current = track.names[level] ?? track.names[0]
              const nextName = track.names[level + 1]
              const hint = track.hints[Math.min(level + (nextName ? 1 : 0), track.hints.length - 1)]
              const price = labNextPrice(progress, track.stat)
              const maxed = price == null
              return (
                <div key={track.stat} className="rounded-2xl border border-amber-400/30 bg-[#101014]/90 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-display text-lg font-black text-amber-100">{track.title}</p>
                    <p className="shrink-0 text-[11px] font-extrabold tracking-[0.12em] text-amber-200">
                      {t('heistLabLevel', { n: level + 1, max: 4 })}
                    </p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-amber-50">{t('heistLabCurrent', { name: current })}</p>
                  <p className="mt-1 text-sm text-zinc-400">{t('heistLabNext', { name: maxed ? t('heistLabMax') : nextName })}</p>
                  <p className="mt-1 text-sm text-zinc-500">{hint}</p>
                  <p className="mt-2 font-mono text-sm font-bold text-amber-200">
                    {maxed ? t('heistLabMax') : `${price} ${t('heistStars')}`}
                  </p>
                  <button
                    type="button"
                    disabled={maxed}
                    className="buy-btn mt-3 min-h-12 w-full rounded-xl px-4 py-3 text-sm font-black text-zinc-950 disabled:opacity-50"
                    onClick={() => buyLab(track.stat)}
                  >
                    {maxed ? t('heistLabMax') : t('heistBuy')}
                  </button>
                </div>
              )
            })}
          </div>
          <p className="mt-6 text-center text-[10px] font-extrabold tracking-[0.2em] text-amber-200/70">{t('heistLabSoon')}</p>
          <div className="mt-3 space-y-2">
            {soon.map((name) => (
              <div key={name} className="rounded-2xl border border-white/10 bg-[#101014]/70 p-4 opacity-80">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-base font-black text-amber-100/80">{name}</p>
                  <span className="rounded-full border border-amber-400/30 px-2 py-1 text-[10px] font-extrabold tracking-[0.14em] text-amber-200/80">
                    {t('heistLabSoon')}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">{t('heistLabSoonHint')}</p>
              </div>
            ))}
          </div>
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
    const need = Math.max(0, firstLotPrice - end.banked)
    return (
      <section className="relative flex h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] items-center justify-center overflow-hidden bg-[#120c10] px-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,193,7,0.22),transparent_55%)]" />
        <div className="relative max-h-full w-full max-w-sm overflow-y-auto rounded-3xl border border-amber-400/40 bg-[#101014]/92 p-6 text-center shadow-[0_0_60px_rgba(255,176,40,0.12)]">
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
              <NextLevelBox id="level3" onPlay={() => playLevel('level3')} />
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
                <NextLevelBox id={nextHeistLevel(levelId)!} onPlay={() => playLevel(nextHeistLevel(levelId)!)} />
              ) : (
                <div className="mt-5 flex justify-center gap-1.5 text-lg">
                  {HEIST_LEVEL_ORDER.map((id) => (
                    <span key={id} title={t(HEIST_LEVEL_NAME[id])}>
                      ✓
                    </span>
                  ))}
                </div>
              )}
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
              <p className="mt-2 text-sm font-semibold text-amber-100">{t('heistBankDoneSub')}</p>
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
              <button
                type="button"
                className="buy-btn mt-6 w-full rounded-2xl px-4 py-3 text-zinc-950"
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
              <div className="mt-3 flex items-baseline justify-between gap-3 text-left">
                <span className="text-[11px] font-extrabold tracking-[0.16em] text-zinc-500">{t('heistThiefScore')}</span>
                <span className="font-display text-2xl font-black text-amber-200">{end.banked}</span>
              </div>
              {progress.bankComplete ? (
                <p className="mt-5 text-sm font-semibold text-amber-100">
                  {t('heistBankCompleteTitle')} · {t('heistMansionUnlocked')}
                </p>
              ) : (
                <p className="mt-5 text-sm font-semibold text-zinc-300">
                  {t('heistBankContinue')} · {t('heistBankZone', { n: Math.min(BANK_ZONE_COUNT, Math.max(1, (progress.bankDepth ?? 0) + 1)), max: BANK_ZONE_COUNT })}
                </p>
              )}
              {progress.bankComplete ? (
                <button type="button" className="buy-btn mt-6 w-full rounded-2xl px-4 py-3 text-zinc-950" onClick={() => playLevel('mansion')}>
                  {t('heistPlayMansion')}
                </button>
              ) : end.banked >= firstLotPrice ? (
                <>
                  <p className="mt-5 text-sm font-semibold text-amber-100">{t('heistEnoughRenoir')}</p>
                  <button
                    type="button"
                    className="buy-btn mt-6 w-full rounded-2xl px-4 py-3 text-zinc-950"
                    onClick={() => navigate('/market')}
                  >
                    {t('heistBuyOnMarket')}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full rounded-2xl border border-amber-400/40 px-4 py-3 text-sm font-bold text-amber-100"
                    onClick={() => playLevel('bank')}
                  >
                    {t('heistAgainBank')}
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-5 text-sm font-semibold text-amber-100">{t('heistNeedFirstLot', { n: need })}</p>
                  <button type="button" className="buy-btn mt-6 w-full rounded-2xl px-4 py-3 text-zinc-950" onClick={() => playLevel('bank')}>
                    {t('heistAgainBank')}
                  </button>
                </>
              )}
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
              <p className="font-display text-3xl font-black text-amber-300">{win ? t('heistEscaped') : t('heistCaught')}</p>
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
              <button type="button" className="buy-btn mt-6 w-full rounded-2xl px-4 py-3 text-zinc-950" onClick={() => playLevel(levelId)}>
                {win ? t('heistAgain') : t('heistTryAgain')}
              </button>
              <button
                type="button"
                className="mt-3 w-full rounded-2xl border border-amber-400/40 px-4 py-3 text-sm font-bold text-amber-100"
                onClick={() => {
                  setEnd(null)
                  setShopMsg(null)
                  setScreen('shop')
                }}
              >
                {t('heistUpgrades')}
              </button>
            </>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="relative h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] overflow-y-auto bg-[#120c10]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,107,0,0.18),transparent_50%)]" />
      <div className="relative mx-auto flex min-h-full w-full max-w-sm flex-col items-center px-5 pb-6 pt-4">
        <HeistDuck className="hero-duck mb-1 block" size={120} fit="height" />
        <div className="w-full rounded-3xl border border-amber-400/35 bg-[#120c10]/88 p-4 backdrop-blur-md">
          <div className="mb-3 flex justify-center">
            <LangSwitch gold />
          </div>
          <p className="text-center text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-200">{t('heistKicker')}</p>
          <h1 className="font-display mt-1 text-center text-3xl font-black text-amber-50">{t('heistTitle')}</h1>
          <div className="mt-3 flex justify-between text-sm text-zinc-300">
            <span>{t('heistBanked')}</span>
            <span className="font-mono font-bold text-amber-200">{progress.bankedDuckCoin}</span>
          </div>
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
          {skinTrial ? <HubSkinLine trial={skinTrial} onDrop={() => navigate('/drop')} /> : null}
          <div className="mt-4 space-y-3">
            {heistLevelCards(progress).map((card) => {
              const open = !card.locked
              const done = card.done
              const fresh = open && justUnlocked === card.id
              const badge = done ? t('heistLevelDone') : open && card.id !== 'bank' ? t('heistLevelUnlocked') : open ? t('heistLevelOpen') : t('heistLevelLocked')
              const depth = levelDepth(progress, card.id)
              const tone = !open ? `${CARD_TONE[card.id]} opacity-60 grayscale-[35%]` : CARD_TONE[card.id]
              return (
                <div
                  key={card.n}
                  className={`rounded-2xl border p-3 transition-shadow ${tone}${fresh ? ' animate-pulse ring-2 ring-orange-300/70 shadow-[0_0_28px_rgba(255,170,90,0.35)]' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-extrabold tracking-[0.18em] text-amber-200/80">{t('heistLevelNum', { n: card.n })}</p>
                      <p className="font-display mt-0.5 text-xl font-black text-amber-50">{t(card.nameKey)}</p>
                      <p className="mt-0.5 text-[10px] font-bold tracking-[0.14em] text-zinc-400">
                        {open && !done && card.id !== 'bank' && depth > 0
                          ? t('heistLevelZone', { level: t(card.nameKey), n: Math.min(card.zones, depth + 1), max: card.zones })
                          : t('heistZonesN', { n: card.zones })}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-extrabold tracking-[0.14em] ${
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
                  <LevelBrief id={card.id} cap={bagCap(progress)} />
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
