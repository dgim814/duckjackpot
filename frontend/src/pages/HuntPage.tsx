import { Crosshair, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { ScreenHeader } from '../components/ScreenHeader'
import { HuntGame } from '../hunt/HuntGame'
import { HUNT_LEVELS } from '../hunt/levels'
import { huntFailSound, huntSoundEnabled, huntWinSound, setHuntSoundEnabled } from '../hunt/sound'
import { useI18n } from '../i18n/LanguageProvider'
import { captureTelegramUser, telegramInitData } from '../telegram/user'

type HuntAttempt = {
  id: string
  userId: number
  startedAt: number
  finishedAt?: number
  levelsPassed: number
  shots: number
  hits: number
  win: boolean
}

type Phase = 'idle' | 'play' | 'result'

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

function levelNameKey(id: string) {
  if (id === 'hard') return 'huntLevelHard' as const
  if (id === 'extreme') return 'huntLevelExtreme' as const
  return 'huntLevelMedium' as const
}

export function HuntPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [soundOn, setSoundOn] = useState(huntSoundEnabled)
  const [phase, setPhase] = useState<Phase>('idle')
  const [canPlay, setCanPlay] = useState(true)
  const [nextAt, setNextAt] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState<HuntAttempt | null>(null)
  const [levelIndex, setLevelIndex] = useState(0)
  const [hits, setHits] = useState(0)
  const [win, setWin] = useState(false)
  const [endedAt, setEndedAt] = useState(0)
  const [now, setNow] = useState(Date.now)
  const shotsRef = useRef(0)
  const hitsRef = useRef(0)
  const attemptRef = useRef<HuntAttempt | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await api.post<{ canPlay?: boolean; nextAt?: number }>('/hunt/status', authBody())
      setCanPlay(data.canPlay !== false)
      setNextAt(typeof data.nextAt === 'number' ? data.nextAt : 0)
      setError(null)
    } catch {
      setError(t('huntNeedTelegram'))
    }
  }, [t])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (canPlay || nextAt <= Date.now()) return
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [canPlay, nextAt])

  const finish = async (passed: number, isWin: boolean) => {
    if (isWin) huntWinSound()
    else huntFailSound()
    const shotCount = shotsRef.current
    const hitCount = hitsRef.current
    setHits(hitCount)
    setWin(isWin)
    setEndedAt(Date.now())
    setPhase('result')
    try {
      await api.post('/hunt/finish', {
        ...authBody(),
        id: attemptRef.current?.id,
        levelsPassed: passed,
        shots: shotCount,
        hits: hitCount,
        win: isWin,
      })
      await loadStatus()
    } catch {
      /* start already consumed the daily attempt */
    }
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
      setAttempt(data.attempt)
      setLevelIndex(0)
      setHits(0)
      setWin(false)
      setPhase('play')
    } catch (err) {
      const payload = (err as { response?: { data?: { nextAt?: number; error?: string } } })?.response?.data
      if (payload?.error === 'cooldown') {
        setCanPlay(false)
        setNextAt(payload.nextAt ?? Date.now())
        return
      }
      if (payload?.error === 'invalid_init_data') setError(t('huntNeedTelegram'))
      else setError(t('huntStartError'))
    }
  }

  const remain = Math.max(0, nextAt - now)
  const resultSeconds = attempt && endedAt ? Math.max(1, Math.round((endedAt - attempt.startedAt) / 1000)) : 0

  return (
    <section className="px-4 pb-6">
      <ScreenHeader kicker={t('huntKicker')} title={t('huntTitle')} subtitle={t('huntHint')} />
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => {
            const next = !soundOn
            setHuntSoundEnabled(next)
            setSoundOn(next)
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#141218] px-3 py-1.5 text-[11px] font-bold text-amber-200"
        >
          {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
          {soundOn ? t('huntSoundOn') : t('huntSoundOff')}
        </button>
      </div>

      {phase === 'idle' ? (
        <div className="mt-5 rounded-2xl border border-amber-400/25 bg-[#1a1410] p-4">
          <p className="text-sm text-zinc-300">{t('huntRules')}</p>
          {error ? <p className="mt-3 text-sm text-orange-400">{error}</p> : null}
          {!canPlay && remain > 0 ? (
            <p className="mt-4 text-sm text-amber-200">{t('huntCooldown', { time: formatRemain(remain) })}</p>
          ) : (
            <button type="button" className="buy-btn mt-5 w-full rounded-2xl px-4 py-3 text-zinc-950" onClick={() => void start()}>
              {t('huntStart')}
            </button>
          )}
        </div>
      ) : null}

      {phase === 'play' ? (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-200">
            <Crosshair size={16} />
            {t('huntLevel', { n: String(levelIndex + 1), name: t(levelNameKey(HUNT_LEVELS[levelIndex].id)) })}
          </p>
          <HuntGame
            levelIndex={levelIndex}
            onShot={() => {
              shotsRef.current += 1
            }}
            onHit={() => {
              hitsRef.current += 1
            }}
            onClear={() => {
              const passed = levelIndex + 1
              if (passed >= 3) {
                void finish(3, true)
                return
              }
              setLevelIndex(passed)
            }}
            onFail={() => {
              void finish(levelIndex, false)
            }}
          />
        </div>
      ) : null}

      {phase === 'result' ? (
        <div className="mt-5 rounded-2xl border border-amber-400/30 bg-[#1a1410] p-5 text-center">
          <p className="font-display text-xl font-extrabold text-amber-200">{win ? t('huntWin') : t('huntFail')}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-zinc-300">
              <dt>{t('huntTime')}</dt>
              <dd className="font-mono text-amber-200">{resultSeconds}s</dd>
            </div>
            <div className="flex justify-between text-zinc-300">
              <dt>{t('huntHits')}</dt>
              <dd className="font-mono text-amber-200">{hits}</dd>
            </div>
          </dl>
          <button
            type="button"
            className="buy-btn mt-5 w-full rounded-2xl px-4 py-3 text-zinc-950"
            onClick={() => navigate('/')}
          >
            {t('huntToCards')}
          </button>
        </div>
      ) : null}
    </section>
  )
}
