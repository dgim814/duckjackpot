import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeistDuck } from '../heist/HeistDuck'
import { HeistGame, type HeistEnd } from '../heist/HeistGame'
import { useI18n } from '../i18n/LanguageProvider'

const BEST_KEY = 'duckjackpot.heist.best'

function readBest() {
  try {
    return Math.max(0, Number(localStorage.getItem(BEST_KEY) || 0) || 0)
  } catch {
    return 0
  }
}

function writeBest(loot: number) {
  const next = Math.max(readBest(), Math.max(0, Math.round(loot)))
  try {
    localStorage.setItem(BEST_KEY, String(next))
  } catch {
    /* ignore */
  }
  return next
}

type Screen = 'lobby' | 'play' | 'result'

export function HeistPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [screen, setScreen] = useState<Screen>('lobby')
  const [end, setEnd] = useState<HeistEnd | null>(null)
  const [best, setBest] = useState(readBest)
  const [runKey, setRunKey] = useState(0)

  const onDone = (next: HeistEnd) => {
    setEnd(next)
    if (next.verdict === 'escaped') setBest(writeBest(next.loot))
    setScreen('result')
  }

  if (screen === 'play') {
    return (
      <section className="relative h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] overflow-hidden bg-[#120c10]">
        <HeistGame key={runKey} running onDone={onDone} />
      </section>
    )
  }

  if (screen === 'result' && end) {
    const win = end.verdict === 'escaped'
    return (
      <section className="relative flex h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] items-center justify-center overflow-hidden bg-[#120c10] px-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,193,7,0.22),transparent_55%)]" />
        <div className="relative w-full max-w-sm rounded-3xl border border-amber-400/50 bg-[#101014]/92 p-6 text-center">
          <p className="font-display text-4xl font-black text-amber-300">{win ? t('heistEscaped') : t('heistCaught')}</p>
          <p className="mt-4 font-display text-5xl font-black text-white">{end.loot}</p>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200/80">{t('heistLoot')}</p>
          <p className="mt-3 text-sm text-zinc-400">
            {t('heistBest')}: {best || '—'}
          </p>
          <button
            type="button"
            className="buy-btn mt-6 w-full rounded-2xl px-4 py-3 text-zinc-950"
            onClick={() => {
              setEnd(null)
              setRunKey((n) => n + 1)
              setScreen('play')
            }}
          >
            {t('heistAgain')}
          </button>
          <button type="button" className="mt-3 w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-zinc-200" onClick={() => navigate('/')}>
            {t('heistToCards')}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="relative h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] overflow-hidden bg-[#120c10]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,107,0,0.18),transparent_50%)]" />
      <div className="absolute inset-0 flex flex-col items-center justify-end px-5 pb-6">
        <HeistDuck className="mb-2" />
        <div className="w-full max-w-sm rounded-3xl border border-amber-400/35 bg-[#120c10]/88 p-4 backdrop-blur-md">
          <p className="text-center text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-200">{t('heistKicker')}</p>
          <h1 className="font-display mt-1 text-center text-3xl font-black text-amber-50">{t('heistTitle')}</h1>
          <p className="mt-2 text-center text-sm font-semibold text-amber-50/90">{t('heistHint')}</p>
          <button
            type="button"
            className="buy-btn mt-4 w-full rounded-full px-6 py-4 font-display text-2xl font-black tracking-[0.12em] text-zinc-950"
            onClick={() => {
              setEnd(null)
              setRunKey((n) => n + 1)
              setScreen('play')
            }}
          >
            {t('heistPlay')}
          </button>
          <div className="mt-4 flex justify-between text-sm text-zinc-300">
            <span>{t('heistBest')}</span>
            <span className="font-mono font-bold text-amber-200">{best || '—'}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
