import { Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { HuntGame } from '../hunt/HuntGame'
import { HUNT_BREAK_MS, HUNT_LEVELS } from '../hunt/levels'
import { huntFailSound, huntSoundEnabled, huntWinSound, setHuntSoundEnabled } from '../hunt/sound'
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

export function HuntPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [soundOn, setSoundOn] = useState(huntSoundEnabled)
  const [phase, setPhase] = useState<Phase>('idle')
  const [canPlay, setCanPlay] = useState(true)
  const [nextAt, setNextAt] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [levelIndex, setLevelIndex] = useState(0)
  const [hud, setHud] = useState({ remaining: HUNT_LEVELS[0].seconds, hits: 0, required: HUNT_LEVELS[0].required })
  const [hits, setHits] = useState(0)
  const [levelsPassed, setLevelsPassed] = useState(0)
  const [win, setWin] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [now, setNow] = useState(Date.now)
  const shotsRef = useRef(0)
  const hitsRef = useRef(0)
  const attemptRef = useRef<HuntAttempt | null>(null)
  const startedAtRef = useRef(0)
  const introTimer = useRef(0)
  const levelIndexRef = useRef(0)
  const roundLockRef = useRef(false)

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await api.post<{ canPlay?: boolean; nextAt?: number }>('/hunt/status', authBody())
      setCanPlay(data.canPlay !== false)
      setNextAt(typeof data.nextAt === 'number' ? data.nextAt : 0)
      setError(null)
    } catch {
      setCanPlay(true)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  useEffect(() => () => window.clearTimeout(introTimer.current), [])

  useEffect(() => {
    if (canPlay) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [canPlay])

  const finish = async (passed: number, isWin: boolean) => {
    if (isWin && passed < 3) return
    if (isWin) huntWinSound()
    else huntFailSound()
    setHits(hitsRef.current)
    setLevelsPassed(passed)
    setWin(isWin && passed >= 3)
    setElapsed(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)))
    setPhase('result')
    try {
      await api.post('/hunt/finish', {
        ...authBody(),
        id: attemptRef.current?.id,
        levelsPassed: passed,
        shots: shotsRef.current,
        hits: hitsRef.current,
        win: isWin && passed >= 3,
      })
      await loadStatus()
    } catch {
      await loadStatus()
    }
  }

  const startRound = (index: number) => {
    levelIndexRef.current = index
    roundLockRef.current = false
    setLevelIndex(index)
    setHud({ remaining: HUNT_LEVELS[index].seconds, hits: 0, required: HUNT_LEVELS[index].required })
    setPhase('play')
  }

  const start = async () => {
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
      startedAtRef.current = Date.now()
      roundLockRef.current = false
      levelIndexRef.current = 0
      setLevelIndex(0)
      setHits(0)
      setLevelsPassed(0)
      setWin(false)
      setHud({ remaining: HUNT_LEVELS[0].seconds, hits: 0, required: HUNT_LEVELS[0].required })
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
  const goal = HUNT_LEVELS[levelIndex]?.required ?? HUNT_LEVELS[0].required

  return (
    <section className="relative h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] overflow-hidden bg-[#120c10]">
      <HuntGame
        key={`hunt-${attemptRef.current?.id ?? 'idle'}-${levelIndex}-${phase === 'play' ? 'play' : 'wait'}`}
        running={phase === 'play'}
        levelIndex={levelIndex}
        onShot={() => {
          shotsRef.current += 1
        }}
        onHit={() => {
          hitsRef.current += 1
        }}
        onHud={setHud}
        onClear={() => {
          if (phase !== 'play' || roundLockRef.current) return
          roundLockRef.current = true
          const passed = levelIndexRef.current + 1
          setLevelsPassed(passed)
          if (passed >= 3) {
            void finish(3, true)
            return
          }
          setLevelIndex(passed)
          levelIndexRef.current = passed
          setHud({
            remaining: HUNT_LEVELS[passed].seconds,
            hits: 0,
            required: HUNT_LEVELS[passed].required,
          })
          setPhase('break')
          window.clearTimeout(introTimer.current)
          introTimer.current = window.setTimeout(() => startRound(passed), HUNT_BREAK_MS)
        }}
        onFail={() => {
          if (phase !== 'play' || roundLockRef.current) return
          roundLockRef.current = true
          void finish(levelIndexRef.current, false)
        }}
      />

      <button
        type="button"
        onClick={() => {
          const next = !soundOn
          setHuntSoundEnabled(next)
          setSoundOn(next)
        }}
        className="absolute right-3 top-[max(10px,env(safe-area-inset-top))] z-20 inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-black/45 px-3 py-1.5 text-[11px] font-bold text-amber-200 backdrop-blur-sm"
      >
        {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
        {soundOn ? t('huntSoundOn') : t('huntSoundOff')}
      </button>

      {phase === 'play' ? (
        <div className="pointer-events-none absolute inset-x-0 top-[max(44px,calc(env(safe-area-inset-top)+36px))] z-10 px-4 text-center">
          <p className="font-display text-2xl font-extrabold tracking-wide text-amber-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {t('huntLevelBanner', { n: String(levelIndex + 1) })}
          </p>
          <p className="mt-1 font-display text-4xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
            {t('huntGoal', { n: String(goal) })}
          </p>
          <p className="mt-1 font-mono text-4xl font-black tabular-nums text-amber-200 drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
            {Math.ceil(hud.remaining)}
          </p>
          <p className="mt-1 font-display text-lg font-extrabold text-amber-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {t('huntShotDown', { x: String(hud.hits), y: String(hud.required) })}
          </p>
        </div>
      ) : null}

      {phase === 'intro' || phase === 'break' ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/55 px-6 text-center">
          {phase === 'break' ? (
            <p className="font-display text-3xl font-black text-emerald-300 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
              {t('huntLevelCleared', { n: String(levelIndex) })}
            </p>
          ) : null}
          <p className="mt-3 font-display text-5xl font-black text-amber-200 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
            {t('huntLevelBanner', { n: String(levelIndex + 1) })}
          </p>
          <p className="mt-4 font-display text-3xl font-extrabold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
            {t('huntGoal', { n: String(HUNT_LEVELS[levelIndex]?.required ?? 8) })}
          </p>
        </div>
      ) : null}

      {phase === 'idle' ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6">
          <p className="mb-5 max-w-[16rem] text-center text-sm font-semibold leading-snug text-amber-50/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
            {t('huntRulesShort')}
          </p>
          {error ? <p className="mb-3 text-center text-sm text-orange-300">{error}</p> : null}
          {locked ? (
            <p className="pointer-events-auto rounded-full border border-amber-400/40 bg-black/55 px-5 py-3 text-center font-display text-lg font-extrabold text-amber-200">
              {t('huntCooldown', { time: formatRemain(remainCd) })}
            </p>
          ) : (
            <button
              type="button"
              className="buy-btn pointer-events-auto min-w-[13rem] rounded-full px-10 py-5 font-display text-2xl font-black tracking-[0.12em] text-zinc-950 shadow-[0_12px_40px_rgba(255,193,7,0.35)]"
              onClick={() => void start()}
            >
              {t('huntPlay')}
            </button>
          )}
        </div>
      ) : null}

      {phase === 'result' ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/35 px-6">
          <div className="w-full max-w-sm rounded-3xl border border-amber-400/40 bg-[#120c10]/88 p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-md">
            <p className="font-display text-3xl font-black text-amber-200">{win ? t('huntWin') : t('huntFail')}</p>
            <dl className="mt-5 space-y-2 text-left text-base">
              <div className="flex justify-between text-zinc-200">
                <dt>{t('huntTime')}</dt>
                <dd className="font-mono font-bold text-amber-200">{elapsed}s</dd>
              </div>
              <div className="flex justify-between text-zinc-200">
                <dt>{t('huntHits')}</dt>
                <dd className="font-mono font-bold text-amber-200">{hits}</dd>
              </div>
              <div className="flex justify-between text-zinc-200">
                <dt>{t('huntLevels')}</dt>
                <dd className="font-mono font-bold text-amber-200">{levelsPassed}/3</dd>
              </div>
            </dl>
            <button
              type="button"
              className="buy-btn mt-6 w-full rounded-2xl px-4 py-3 text-zinc-950"
              onClick={() => navigate('/')}
            >
              {t('huntToCards')}
            </button>
            {win ? <p className="mt-4 font-display text-lg font-extrabold text-amber-200">{t('huntTomorrow')}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
