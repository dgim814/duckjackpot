import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { track } from '../analytics/track'
import { ScreenHeader } from '../components/ScreenHeader'
import { HeistDuck } from '../heist/HeistDuck'
import { currentEnergy, ENERGY_MAX } from '../heist/energy'
import { DailyHeistCard } from '../heist/hub/DailyHeistCard'
import { NextRaidCard } from '../heist/hub/NextRaidCard'
import { collectionValue } from '../heist/economy/catalog'
import { DuckLabEntry } from '../heist/economy/DuckLabEntry'
import { labCueActive } from '../heist/economy/starsDiscovery'
import { formatLeft, useDailyReward, type DailyPhase } from '../heist/dailyReward'
import { HEIST_LEVEL_NAME, HEIST_LEVEL_ZONES, currentHeistLevel, heistLevelDepth, type HeistLevelId } from '../heist/heistLevel'
import { loadProgress, subscribeGameplayReset, type PlayerProgress } from '../heist/progress'
import { heistRank } from '../heist/rank'
import { heistSfx, unlockHeistSfx } from '../heist/heistSfx'
import { suspendedRaid } from '../heist/v2/ui/HeistGameV2'
import { useI18n } from '../i18n/LanguageProvider'
import { perfMark, perfMarkPainted } from '../perf/transition'
import { inTelegram, launchNotification, onSession, patchSession, referralMe, type ReferralMe, type Session } from '../retention/api'
import { claimGrants } from '../retention/grants'
import { LeaderboardSheet, NotifyOptIn, ReferralCard, ReferralMissionCard } from '../retention/HubCards'

/** What the hub's one main button does: resume a parked raid, or play the current level. */
function primaryAction(progress: PlayerProgress) {
  const parked = suspendedRaid()
  if (parked) return { level: parked.levelId, resume: true, started: true }
  const level = currentHeistLevel(progress)
  const started = level === 'bank' ? (progress.bankEscapes ?? 0) > 0 || (progress.bankDepth ?? 0) > 0 : heistLevelDepth(progress, level) > 0
  return { level, resume: false, started }
}

/** hub_primary_cta_view once per app session, when the button is really on screen. */
let primaryViewed = false
function usePrimaryView(level: HeistLevelId) {
  const ref = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || primaryViewed) return
    const fire = () => {
      if (primaryViewed) return
      primaryViewed = true
      track('hub_primary_cta_view', { level })
    }
    if (typeof IntersectionObserver === 'undefined') {
      fire()
      return
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.6)) {
        fire()
        io.disconnect()
      }
    }, { threshold: [0.6] })
    io.observe(el)
    return () => io.disconnect()
  }, [level])
  return ref
}

/** 🎁 +150 DUCK COIN a day: a claim card while it is due, one quiet line after. */
function DailyRewardCard({ phase, nextAt, amount, onClaim, canWrite }: { phase: DailyPhase; nextAt: number | null; amount: number; onClaim: () => void; canWrite: boolean }) {
  const { t, lang } = useI18n()
  const [, tick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 30_000)
    return () => window.clearInterval(id)
  }, [])
  if (phase === 'off') return null
  const next = nextAt ? t('dailyNext', { time: formatLeft(nextAt - Date.now(), lang) }) : ''
  if (phase === 'available' || phase === 'claiming') {
    return (
      <section className="daily-card is-due mt-3 flex items-center justify-between gap-3 rounded-2xl border border-emerald-300/50 bg-emerald-400/10 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold tracking-[0.06em] text-emerald-200">{t('dailyRemindTitle')}</p>
          <p className="font-display text-lg font-black leading-tight text-emerald-50">{t('dailyAmount', { n: amount })}</p>
        </div>
        <button
          type="button"
          disabled={phase === 'claiming'}
          onClick={onClaim}
          className="daily-claim min-h-11 shrink-0 rounded-xl bg-emerald-300 px-4 py-2 text-[14px] font-black tracking-[0.08em] text-zinc-950 disabled:opacity-70"
        >
          {phase === 'claiming' ? t('dailyClaiming') : t('dailyClaim')}
        </button>
      </section>
    )
  }
  if (phase === 'claimed') {
    return (
      <section className="daily-card mt-3 flex items-center justify-between gap-3 rounded-2xl border border-emerald-300/35 bg-emerald-400/[0.06] px-3 py-2">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold tracking-[0.1em] text-emerald-200">{t('dailyDone')}</p>
          <p className="text-[11px] text-emerald-100/60">{next}</p>
          <NotifyOptIn canWrite={canWrite} />
        </div>
        <p className="shrink-0 font-display text-lg font-black text-emerald-100">+{amount}</p>
      </section>
    )
  }
  // waiting (claimed earlier) or still loading: one compact line, same height either way
  return (
    <section className="daily-card mt-3 min-h-[2.75rem] rounded-2xl border border-white/10 bg-[#141218] px-3 py-2">
      <p className="text-[11px] font-extrabold tracking-[0.1em] text-zinc-300">{phase === 'waiting' ? `✓ ${t('dailyTitle').replace('🎁 ', '')}` : t('dailyTitle')}</p>
      <p className="text-[11px] text-zinc-500">{phase === 'waiting' ? next : '…'}</p>
    </section>
  )
}

export function GameHomePage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [progress, setProgress] = useState(loadProgress)
  const [gain, setGain] = useState<{ n: number; key: number } | null>(null)
  useEffect(() => subscribeGameplayReset(() => setProgress(loadProgress())), [])
  useEffect(() => {
    perfMark('HUB_MOUNT')
    perfMarkPainted('HUB_FIRST_RENDER')
  }, [])
  const [session, setSession] = useState<Session | null>(null)
  const [lbOpen, setLbOpen] = useState(false)
  const [grantNote, setGrantNote] = useState<string | null>(null)
  const [friends, setFriends] = useState<ReferralMe['invites']>([])
  // Each hub visit: the server's mission progress, friends' progress, rewards (async, never blocks the hub).
  useEffect(() => {
    if (!inTelegram()) return
    let live = true
    referralMe()
      .then((me) => {
        if (!live) return
        setFriends(me.invites)
        patchSession({ invitee: me.invitee, starsProgress: me.starsProgress, ...(me.grants.length ? { grants: me.grants } : {}) })
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [])
  // Referral rewards the server granted are claimed as soon as the hub knows about them.
  useEffect(
    () =>
      onSession((s) => {
        setSession(s)
        if (s.grants.length)
          void claimGrants(s.grants, (next, g) => {
            setProgress(next)
            setGain({ n: g.coins, key: Date.now() })
            setGrantNote(t('grantGot', { n: g.coins }))
            patchSession({ grants: [] })
          })
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const daily = useDailyReward((next, amount) => {
    if (launchNotification() === 'daily') track('notification_action_clicked', { kind: 'daily' })
    setProgress(next)
    setGain({ n: amount, key: Date.now() })
    unlockHeistSfx()
    heistSfx.upgrade()
  })
  useEffect(() => {
    if (!gain) return
    const id = window.setTimeout(() => setGain(null), 1800)
    return () => window.clearTimeout(id)
  }, [gain])

  const rank = heistRank(progress)
  const value = collectionValue(progress.ownedArt ?? {})
  const action = primaryAction(progress)
  const levelName = t(HEIST_LEVEL_NAME[action.level])
  const zones = HEIST_LEVEL_ZONES[action.level]
  const zone = Math.min(zones, heistLevelDepth(progress, action.level) + 1)
  const primaryRef = usePrimaryView(action.level)
  const primaryLabel = action.resume ? t('hubPlayResume') : t(action.started ? 'hubPlayContinue' : 'hubPlayEnter', { level: levelName })
  const labCue = labCueActive(progress.bankEscapes ?? 0)

  const tap = (path: string, state?: unknown) => {
    unlockHeistSfx()
    heistSfx.uiTap()
    navigate(path, state ? { state } : undefined)
  }
  const play = () => {
    perfMark('HUB_CLICK')
    track('hub_primary_cta_click', { level: action.level })
    // Straight into the raid: no lobby to read or scroll through first.
    tap('/heist', { play: action.level, resume: action.resume })
  }

  return (
    <div className="overflow-x-hidden px-4 pb-4">
      <ScreenHeader kicker={t('hubKicker')} title={t('hubTitle')} />

      {/* PRIMARY: coins → daily reward → the one main button → DUCK LAB */}
      <section className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/35 bg-[#16110c] px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-200">💰 {t('heistDuckCoin')}</p>
          <p className={`hub-coins gold-text font-display text-[2.2rem] font-black leading-none ${gain ? 'coin-bump' : ''}`}>{progress.bankedDuckCoin.toLocaleString()}</p>
        </div>
        {gain ? (
          <span key={gain.key} className="coin-gain shrink-0 font-display text-xl font-black text-emerald-300">
            +{gain.n}
          </span>
        ) : null}
      </section>

      <DailyRewardCard phase={daily.phase} nextAt={daily.nextAt} amount={daily.amount} onClaim={daily.claim} canWrite={Boolean(session?.canWrite)} />
      {grantNote ? <p className="mt-2 text-center text-[12px] font-black text-emerald-300">{grantNote}</p> : null}

      <section className="hero-stage relative mt-3 overflow-hidden rounded-3xl border border-amber-400/40 px-4 pb-4 pt-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-[6.5rem] w-[6.5rem] shrink-0 items-end justify-center">
            <div className="hero-glow pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full" />
            <HeistDuck className="hero-duck relative z-[1]" size={104} fit="height" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold tracking-[0.16em] text-amber-200/80">{t('hubZone', { n: zone, max: zones })}</p>
            <p className="font-display text-[1.7rem] font-black leading-none text-amber-50">{levelName}</p>
            <p className="mt-1.5 text-[12px] font-semibold leading-snug text-amber-100/75">{t('hubGoal')}</p>
          </div>
        </div>
        <button
          ref={primaryRef}
          type="button"
          onClick={play}
          className={`hub-primary buy-btn relative mt-3 min-h-[3.75rem] w-full rounded-2xl px-3 py-3 font-display font-black leading-tight text-zinc-950 ${
            primaryLabel.length > 16 ? 'text-[1.05rem] tracking-[0.02em]' : 'text-[1.35rem] tracking-[0.08em]'
          }`}
        >
          {primaryLabel}
        </button>
      </section>

      <DuckLabEntry cue={labCue} onOpen={() => tap('/heist', { open: 'lab' })} />

      {session?.invitee ? (
        <ReferralMissionCard
          invitee={session.invitee}
          channel={session.channel}
          rewards={session.rewards}
          onUpdate={(v) => patchSession({ invitee: v })}
        />
      ) : null}
      {inTelegram() ? <ReferralCard friends={friends} progress={session?.starsProgress} onProgress={(p) => patchSession({ starsProgress: p })} rewards={session?.rewards ?? { inviterCoins: 300, inviteeCoins: 150, stars: { available: true, manual: true, perFriend: 5, payout: 50, inviter: 5, invitee: 0 }, missionCoins: 650 }} /> : null}

      {/* SECONDARY: short labels only; details live in their own screens */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => tap('/collection')} className="rounded-2xl border border-white/10 bg-[#141218] px-2 py-2.5 text-left">
          <p className="text-[9px] font-extrabold tracking-[0.14em] text-amber-200/80">{t('hubStatRank')}</p>
          <p className="mt-0.5 truncate font-display text-[13px] font-black text-amber-50">{t(rank.nameKey)}</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div className="progress-fill h-full rounded-full" style={{ width: `${Math.round(rank.progress * 100)}%` }} />
          </div>
        </button>
        <button type="button" onClick={() => tap('/collection')} className="rounded-2xl border border-white/10 bg-[#141218] px-2 py-2.5 text-left">
          <p className="text-[9px] font-extrabold tracking-[0.14em] text-amber-200/80">{t('hubStatCollection')}</p>
          <p className="mt-0.5 truncate font-display text-[13px] font-black text-amber-50">{value.toLocaleString()}</p>
        </button>
        <div className="rounded-2xl border border-white/10 bg-[#141218] px-2 py-2.5 text-left">
          <p className="text-[9px] font-extrabold tracking-[0.14em] text-amber-200/80">{t('hubStatEnergy')}</p>
          <p className="mt-0.5 font-display text-[13px] font-black text-amber-50">
            {currentEnergy()}/{ENERGY_MAX}
          </p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => tap('/market')} className="min-h-11 rounded-2xl border border-amber-400/30 bg-[#141218] px-2 py-2 font-display text-[11px] font-black text-amber-100">
          {t('marketTitle')}
        </button>
        <button type="button" onClick={() => tap('/collection')} className="min-h-11 rounded-2xl border border-amber-400/30 bg-[#141218] px-2 py-2 font-display text-[11px] font-black text-amber-100">
          {t('collectionTitle')}
        </button>
        <button type="button" onClick={() => setLbOpen(true)} className="min-h-11 rounded-2xl border border-white/10 bg-[#141218] px-2 py-2 font-display text-[11px] font-black text-amber-100">
          {t('lbMine')}
        </button>
      </div>

      <NextRaidCard progress={progress} onPlay={() => tap('/heist')} />
      <DailyHeistCard onOpen={() => tap('/heist')} />
      {lbOpen ? <LeaderboardSheet onClose={() => setLbOpen(false)} /> : null}
    </div>
  )
}
