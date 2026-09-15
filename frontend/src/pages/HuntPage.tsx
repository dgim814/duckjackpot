import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { HuntGame, type HuntHud } from '../hunt/HuntGame'
import { HUNT_BREAK_MS, HUNT_MIN_DAY_SCORE, HUNT_ROUND_COUNT, huntRoundConfig } from '../hunt/levels'
import { addHuntXp, huntXpBar, readHuntBest, readHuntXp, writeHuntBest } from '../hunt/progress'
import { huntFailSound, huntSoundEnabled, huntWinSound, setHuntSoundEnabled } from '../hunt/sound'
import { type HuntWeaponId } from '../hunt/weapons'
import { useI18n } from '../i18n/LanguageProvider'
import { captureTelegramUser, telegramInitData } from '../telegram/user'

type HuntAttempt = {
  id: string
  startedAt: number
}

type Phase = 'idle' | 'intro' | 'play' | 'break' | 'result'

function authBody() {
  const buyer = captureTelegramUser()
  return {
    initData: telegramInitData(),
    telegramId: buyer?.telegramId,
    telegramUsername: buyer?.telegramUsername,
  }
}

function formatRemain(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  return `${h}:${String(m).padStart(2, '0')}`
}

function formatClock(totalSec: number) {
  const sec = Math.max(0, Math.floor(totalSec))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function dayPart(roundIndex: number): 'huntDayMorning' | 'huntDayNoon' | 'huntDayEvening' {
  if (roundIndex < 7) return 'huntDayMorning'
  if (roundIndex < 14) return 'huntDayNoon'
  return 'huntDayEvening'
}

export function HuntPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [soundOn, setSoundOn] = useState(huntSoundEnabled)
  const [phase, setPhase] = useState<Phase>('idle')
  const [paused, setPaused] = useState(false)
  const [canPlay, setCanPlay] = useState(true)
  const [nextAt, setNextAt] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [roundIndex, setRoundIndex] = useState(0)
  const [weaponId, setWeaponId] = useState<HuntWeaponId>('blaster')
  const [hud, setHud] = useState<HuntHud>({
    remaining: 80,
    hits: 0,
    required: 8,
    ammo: 3,
    ammoMax: 3,
    waveDucks: 2,
  })
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(readHuntBest)
  const [xp, setXp] = useState(readHuntXp)
  const [roundsPassed, setRoundsPassed] = useState(0)
  const [hitsDisplay, setHitsDisplay] = useState(0)
  const [win, setWin] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [now, setNow] = useState(Date.now)
  const [sessionTick, setSessionTick] = useState(0)
  const shotsRef = useRef(0)
  const hitsRef = useRef(0)
  const scoreRef = useRef(0)
  const attemptRef = useRef<HuntAttempt | null>(null)
  const startedAtRef = useRef(0)
  const introTimer = useRef(0)
  const roundIndexRef = useRef(0)
  const roundLockRef = useRef(false)
  const finishedRef = useRef(false)

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await api.post<{ canPlay?: boolean; nextAt?: number; last?: { hits?: number } }>('/hunt/status', authBody())
      setCanPlay(data.canPlay !== false)
      setNextAt(typeof data.nextAt === 'number' ? data.nextAt : 0)
      setError(null)
    } catch {
      setCanPlay(true)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
    setBest(readHuntBest())
    setXp(readHuntXp())
  }, [loadStatus])

  useEffect(() => () => window.clearTimeout(introTimer.current), [])

  useEffect(() => {
    if (canPlay && phase === 'idle') return
    const timer = window.setInterval(() => {
      setNow(Date.now())
      setSessionTick(Date.now())
    }, 1000)
    return () => window.clearInterval(timer)
  }, [canPlay, phase])

  const finish = async (passed: number, isWin: boolean) => {
    if (finishedRef.current) return
    finishedRef.current = true
    const dayWin = isWin && passed >= HUNT_ROUND_COUNT && scoreRef.current >= HUNT_MIN_DAY_SCORE
    if (dayWin) huntWinSound()
    else huntFailSound()
    const nextBest = writeHuntBest(scoreRef.current)
    setBest(nextBest)
    setHitsDisplay(hitsRef.current)
    setRoundsPassed(passed)
    setWin(dayWin)
    setElapsed(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)))
    setPaused(false)
    setPhase('result')
    try {
      await api.post('/hunt/finish', {
        ...authBody(),
        id: attemptRef.current?.id,
        levelsPassed: passed,
        shots: shotsRef.current,
        hits: hitsRef.current,
        win: dayWin,
      })
      await loadStatus()
    } catch {
      await loadStatus()
    }
  }

  const startRound = (index: number) => {
    roundIndexRef.current = index
    roundLockRef.current = false
    setRoundIndex(index)
    const cfg = huntRoundConfig(index)
    setHud({ remaining: cfg.seconds, hits: 0, required: cfg.required, ammo: hud.ammoMax, ammoMax: hud.ammoMax, waveDucks: cfg.ducks })
    setPhase('play')
  }

  const startDay = async () => {
    setError(null)
    try {
      const { data } = await api.post<{ attempt?: HuntAttempt; nextAt?: number }>('/hunt/start', authBody())
      if (!data.attempt) {
        setCanPlay(false)
        setNextAt(data.nextAt ?? Date.now() + 86_400_000)
        return
      }
      attemptRef.current = data.attempt
      shotsRef.current = 0
      hitsRef.current = 0
      scoreRef.current = 0
      finishedRef.current = false
      startedAtRef.current = Date.now()
      roundLockRef.current = false
      roundIndexRef.current = 0
      setRoundIndex(0)
      setScore(0)
      setHitsDisplay(0)
      setRoundsPassed(0)
      setWin(false)
      setPaused(false)
      setHud({ remaining: 80, hits: 0, required: 8, ammo: 3, ammoMax: 3, waveDucks: 2 })
      setPhase('intro')
      window.clearTimeout(introTimer.current)
      introTimer.current = window.setTimeout(() => startRound(0), HUNT_BREAK_MS)
    } catch (err) {
      const payload = (err as { response?: { data?: { nextAt?: number; error?: string } } })?.response?.data
      if (payload?.error === 'cooldown') {
        setCanPlay(false)
        setNextAt(payload.nextAt ?? Date.now())
        return
      }
      setError(payload?.error === 'invalid_init_data' ? t('huntNeedTelegram') : t('huntStartError'))
    }
  }

  const remainCd = Math.max(0, nextAt - now)
  const locked = !canPlay && remainCd > 0
  const sessionSec = startedAtRef.current ? (sessionTick - startedAtRef.current) / 1000 : 0
  const xpView = huntXpBar(xp)
  const cfg = huntRoundConfig(roundIndex)
  const inDay = phase === 'play' || phase === 'intro' || phase === 'break'

  return (
    <section className="relative h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] overflow-hidden bg-[#120c10]">
      <HuntGame
        key={`hunt-${attemptRef.current?.id ?? 'idle'}-${phase === 'play' ? roundIndex : 'wait'}`}
        running={phase === 'play'}
        paused={paused}
        roundIndex={roundIndex}
        weaponId={weaponId}
        onShot={() => {
          shotsRef.current += 1
        }}
        onHit={(points) => {
          hitsRef.current += 1
          scoreRef.current += points
          setScore(scoreRef.current)
        }}
        onHud={setHud}
        onClear={() => {
          if (roundLockRef.current) return
          roundLockRef.current = true
          const passed = roundIndexRef.current + 1
          const gained = addHuntXp(20 + hud.hits * 4)
          setXp(gained)
          setRoundsPassed(passed)
          if (passed >= HUNT_ROUND_COUNT) {
            void finish(passed, true)
            return
          }
          setRoundIndex(passed)
          roundIndexRef.current = passed
          setPhase('break')
          window.clearTimeout(introTimer.current)
          introTimer.current = window.setTimeout(() => startRound(passed), HUNT_BREAK_MS)
        }}
        onFail={() => {
          if (roundLockRef.current) return
          roundLockRef.current = true
          void finish(roundIndexRef.current, false)
        }}
      />

      <div className="absolute right-3 top-[max(8px,env(safe-area-inset-top))] z-20 flex gap-2">
        {inDay ? (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-black/45 px-3 py-1.5 text-[11px] font-bold text-amber-200 backdrop-blur-sm"
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
            {paused ? t('huntResume') : t('huntPause')}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            const next = !soundOn
            setHuntSoundEnabled(next)
            setSoundOn(next)
          }}
          className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-black/45 px-3 py-1.5 text-[11px] font-bold text-amber-200 backdrop-blur-sm"
        >
          {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </button>
      </div>

      {phase === 'play' && !paused ? (
        <div className="pointer-events-none absolute inset-x-0 top-[max(40px,calc(env(safe-area-inset-top)+32px))] z-10 px-3 text-center">
          <p className="font-mono text-sm font-bold text-amber-100/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
            {t('huntSessionTime')}: {formatClock(sessionSec)}
          </p>
        </div>
      ) : null}

      {inDay ? (
        <div className="absolute inset-x-0 bottom-0 z-20 border-t border-amber-400/25 bg-[#120c10]/92 px-3 py-2 backdrop-blur-md">
          <div className="grid grid-cols-5 gap-1 text-center">
            <HudCell label={t('huntAmmo')} value={`${hud.ammo}/${hud.ammoMax}`} />
            <HudCell label={t('huntScore')} value={String(score)} />
            <HudCell label={t('huntRound')} value={`${roundIndex + 1}/${HUNT_ROUND_COUNT}`} />
            <HudCell label={t('huntDucks')} value={`${hud.hits}/${hud.required}`} />
            <HudCell label={t('huntDayClock')} value={t(dayPart(roundIndex))} />
          </div>
          <p className="mt-1 text-center font-mono text-lg font-black tabular-nums text-amber-200">{Math.ceil(hud.remaining)}s</p>
        </div>
      ) : null}

      {phase === 'intro' || phase === 'break' ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/55 px-6 text-center">
          {phase === 'break' ? (
            <p className="font-display text-3xl font-black text-emerald-300 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
              {t('huntRoundCleared', { n: String(roundIndex) })}
            </p>
          ) : null}
          <p className="mt-3 font-display text-5xl font-black text-amber-200 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
            {t('huntRoundBanner', { n: String(roundIndex + 1) })}
          </p>
          <p className="mt-4 font-display text-2xl font-extrabold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
            {t('huntGoal', { n: String(cfg.required) })}
          </p>
        </div>
      ) : null}

      {paused && phase === 'play' ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/65 px-6 text-center">
          <p className="font-display text-4xl font-black text-amber-200">{t('huntPaused')}</p>
          <button type="button" className="buy-btn mt-6 min-w-[12rem] rounded-full px-8 py-3 text-zinc-950" onClick={() => setPaused(false)}>
            {t('huntResume')}
          </button>
          <button
            type="button"
            className="mt-3 rounded-full border border-white/20 px-6 py-2 text-sm font-bold text-zinc-200"
            onClick={() => void finish(roundsPassed, false)}
          >
            {t('huntExitMenu')}
          </button>
        </div>
      ) : null}

      {phase === 'idle' ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-end px-5 pb-6">
          <div className="pointer-events-auto mb-[4.5rem] w-full max-w-sm rounded-3xl border border-amber-400/35 bg-[#120c10]/88 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <p className="text-center text-sm font-semibold text-amber-50/90">{t('huntRulesShort')}</p>
            {error ? <p className="mt-2 text-center text-sm text-orange-300">{error}</p> : null}
            {locked ? (
              <p className="mt-4 rounded-full border border-amber-400/40 bg-black/55 px-4 py-3 text-center font-display text-lg font-extrabold text-amber-200">
                {t('huntCooldown', { time: formatRemain(remainCd) })}
              </p>
            ) : (
              <button
                type="button"
                className="buy-btn mt-4 w-full rounded-full px-6 py-4 font-display text-2xl font-black tracking-[0.12em] text-zinc-950"
                onClick={() => void startDay()}
              >
                {t('huntPlay')}
              </button>
            )}
            <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-wide text-zinc-500">{t('huntWeaponPick')}</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['sling', 'blaster', 'thunder'] as HuntWeaponId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setWeaponId(id)}
                  className={`rounded-2xl border px-2 py-2 text-center text-[11px] font-extrabold ${
                    weaponId === id ? 'border-amber-400 bg-amber-400/15 text-amber-200' : 'border-white/10 text-zinc-300'
                  }`}
                >
                  {t(id === 'sling' ? 'huntWeaponSling' : id === 'blaster' ? 'huntWeaponBlaster' : 'huntWeaponThunder')}
                </button>
              ))}
            </div>
            <p className="mt-2 text-center text-[11px] text-zinc-500">{t('huntWeaponHint')}</p>
            <div className="mt-4 flex justify-between text-sm text-zinc-300">
              <span>{t('huntScore')}</span>
              <span className="font-mono font-bold text-amber-200">{score || '—'}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm text-zinc-300">
              <span>{t('huntBest')}</span>
              <span className="font-mono font-bold text-amber-200">{best || '—'}</span>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] font-bold text-amber-200">
                <span>XP {xpView.level}</span>
                <span>
                  {xpView.into}/{xpView.need}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/50">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${xpView.into}%` }} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {phase === 'result' ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/35 px-6">
          <div className="w-full max-w-sm rounded-3xl border border-amber-400/40 bg-[#120c10]/88 p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-md">
            <p className="font-display text-3xl font-black text-amber-200">{win ? t('huntWin') : t('huntDayOver')}</p>
            <dl className="mt-5 space-y-2 text-left text-base">
              <div className="flex justify-between text-zinc-200">
                <dt>{t('huntTime')}</dt>
                <dd className="font-mono font-bold text-amber-200">{formatClock(elapsed)}</dd>
              </div>
              <div className="flex justify-between text-zinc-200">
                <dt>{t('huntScore')}</dt>
                <dd className="font-mono font-bold text-amber-200">{score}</dd>
              </div>
              <div className="flex justify-between text-zinc-200">
                <dt>{t('huntHits')}</dt>
                <dd className="font-mono font-bold text-amber-200">{hitsDisplay}</dd>
              </div>
              <div className="flex justify-between text-zinc-200">
                <dt>{t('huntRound')}</dt>
                <dd className="font-mono font-bold text-amber-200">
                  {roundsPassed}/{HUNT_ROUND_COUNT}
                </dd>
              </div>
            </dl>
            <div className="mt-4">
              <div className="flex justify-between text-[11px] font-bold text-amber-200">
                <span>XP {xpView.level}</span>
                <span>
                  {xpView.into}/{xpView.need}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/50">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${xpView.into}%` }} />
              </div>
            </div>
            <button type="button" className="buy-btn mt-6 w-full rounded-2xl px-4 py-3 text-zinc-950" onClick={() => navigate('/')}>
              {t('huntToCards')}
            </button>
            <p className="mt-4 font-display text-lg font-extrabold text-amber-200">{t('huntTomorrow')}</p>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function HudCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="font-mono text-xs font-black text-amber-100">{value}</p>
    </div>
  )
}
