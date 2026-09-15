import { Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { HuntGame, type HuntHud } from '../hunt/HuntGame'
import { HUNT_WAVE_COUNT } from '../hunt/levels'
import { addHuntXp, huntXpBar, readHuntBest, readHuntXp, writeHuntBest } from '../hunt/progress'
import { huntFailSound, huntSoundEnabled, huntWinSound, setHuntSoundEnabled } from '../hunt/sound'
import { type HuntWeaponId } from '../hunt/weapons'
import { useI18n } from '../i18n/LanguageProvider'
import { captureTelegramUser, telegramInitData } from '../telegram/user'

type HuntAttempt = { id: string; startedAt: number }
type Screen = 'lobby' | 'hunt' | 'result'

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
  const [screen, setScreen] = useState<Screen>('lobby')
  const [canPlay, setCanPlay] = useState(true)
  const [nextAt, setNextAt] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [weaponId, setWeaponId] = useState<HuntWeaponId>('blaster')
  const [hud, setHud] = useState<HuntHud>({ remaining: 45, hits: 0, ammo: 3, ammoMax: 3, score: 0, combo: 0, wave: 1 })
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(readHuntBest)
  const [xp, setXp] = useState(readHuntXp)
  const [hitsDisplay, setHitsDisplay] = useState(0)
  const [comboMax, setComboMax] = useState(0)
  const [verdict, setVerdict] = useState<'perfect' | 'close'>('close')
  const [now, setNow] = useState(Date.now)
  const shotsRef = useRef(0)
  const hitsRef = useRef(0)
  const scoreRef = useRef(0)
  const comboMaxRef = useRef(0)
  const attemptRef = useRef<HuntAttempt | null>(null)
  const finishedRef = useRef(false)

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
    setBest(readHuntBest())
    setXp(readHuntXp())
  }, [loadStatus])

  useEffect(() => {
    if (canPlay) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [canPlay])

  const finish = async (nextVerdict: 'perfect' | 'close') => {
    if (finishedRef.current) return
    finishedRef.current = true
    const dayWin = nextVerdict === 'perfect'
    if (dayWin) huntWinSound()
    else huntFailSound()
    const gained = addHuntXp(30 + hitsRef.current * 3 + (dayWin ? 80 : 0))
    setXp(gained)
    setBest(writeHuntBest(scoreRef.current))
    setHitsDisplay(hitsRef.current)
    setComboMax(comboMaxRef.current)
    setScore(scoreRef.current)
    setVerdict(nextVerdict)
    setScreen('result')
    try {
      await api.post('/hunt/finish', {
        ...authBody(),
        id: attemptRef.current?.id,
        levelsPassed: HUNT_WAVE_COUNT,
        shots: shotsRef.current,
        hits: hitsRef.current,
        win: dayWin,
      })
      await loadStatus()
    } catch {
      await loadStatus()
    }
  }

  const startHunt = async () => {
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
      comboMaxRef.current = 0
      finishedRef.current = false
      setScore(0)
      setScreen('hunt')
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
  const xpView = huntXpBar(xp)

  if (screen === 'hunt') {
    return (
      <section className="relative h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] overflow-hidden bg-[#5ec8ff]">
        <HuntGame
          key={attemptRef.current?.id ?? 'hunt'}
          running
          weaponId={weaponId}
          onShot={() => {
            shotsRef.current += 1
          }}
          onHit={(points, combo) => {
            hitsRef.current += 1
            scoreRef.current += points
            comboMaxRef.current = Math.max(comboMaxRef.current, combo)
            setScore(scoreRef.current)
          }}
          onHud={setHud}
          onDone={(next) => {
            void finish(next)
          }}
        />
        <span className="sr-only">{hud.remaining}</span>
      </section>
    )
  }

  if (screen === 'result') {
    return (
      <section className="relative flex h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] items-center justify-center overflow-hidden bg-[#0b1c28] px-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,193,7,0.28),transparent_55%)]" />
        <div className="relative w-full max-w-sm rounded-3xl border border-amber-400/50 bg-[#101820]/90 p-6 text-center shadow-[0_0_80px_rgba(255,193,7,0.25)]">
          <p className="font-display text-4xl font-black text-amber-300">{verdict === 'perfect' ? t('huntPerfect') : t('huntSoClose')}</p>
          <p className="mt-4 font-display text-5xl font-black text-white">{score}</p>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200/80">{t('huntScore')}</p>
          <div className="mt-5 grid grid-cols-2 gap-2 text-center">
            <Stat label={t('huntHits')} value={String(hitsDisplay)} />
            <Stat label="COMBO" value={`x${comboMax}`} />
          </div>
          <button type="button" className="buy-btn mt-6 w-full rounded-2xl px-4 py-3 text-zinc-950" onClick={() => navigate('/')}>
            {t('huntToCards')}
          </button>
          <p className="mt-3 font-display text-lg font-extrabold text-amber-200">{t('huntTomorrow')}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="relative h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] overflow-hidden bg-[#120c10]">
      <button
        type="button"
        onClick={() => {
          const next = !soundOn
          setHuntSoundEnabled(next)
          setSoundOn(next)
        }}
        className="absolute right-3 top-[max(8px,env(safe-area-inset-top))] z-20 inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-black/45 px-3 py-1.5 text-[11px] font-bold text-amber-200"
      >
        {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
      </button>
      <div className="absolute inset-0 flex flex-col items-center justify-end px-5 pb-6">
        <div className="mb-8 w-full max-w-sm rounded-3xl border border-amber-400/35 bg-[#120c10]/88 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.45)] backdrop-blur-md">
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
              onClick={() => void startHunt()}
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
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-amber-400/20 bg-black/30 py-2">
      <p className="text-[10px] font-bold uppercase text-zinc-500">{label}</p>
      <p className="font-mono text-lg font-black text-amber-200">{value}</p>
    </div>
  )
}
