import { useState } from 'react'
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

function formatTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

type Screen = 'lobby' | 'play' | 'result'

export function HeistPage() {
  const { t } = useI18n()
  const [screen, setScreen] = useState<Screen>('lobby')
  const [end, setEnd] = useState<HeistEnd | null>(null)
  const [best, setBest] = useState(readBest)
  const [runKey, setRunKey] = useState(0)
  const [record, setRecord] = useState(false)

  const onDone = (next: HeistEnd) => {
    setEnd(next)
    if (next.verdict === 'escaped') {
      const prev = readBest()
      const beat = next.loot > prev
      setBest(writeBest(next.loot))
      setRecord(beat)
    } else {
      setRecord(false)
    }
    setScreen('result')
  }

  const playAgain = () => {
    setEnd(null)
    setRecord(false)
    setRunKey((n) => n + 1)
    setScreen('play')
  }

  if (screen === 'play') {
    return (
      <section
        className="relative h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] overflow-hidden overscroll-none bg-[#120c10]"
        style={{ touchAction: 'none', overscrollBehavior: 'none' }}
      >
        <HeistGame key={runKey} running onDone={onDone} />
      </section>
    )
  }

  if (screen === 'result' && end) {
    const win = end.verdict === 'escaped'
    return (
      <section className="relative flex h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] items-center justify-center overflow-hidden bg-[#120c10] px-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,193,7,0.22),transparent_55%)]" />
        <div className="relative w-full max-w-sm rounded-3xl border border-amber-400/40 bg-[#101014]/92 p-6 text-center shadow-[0_0_60px_rgba(255,176,40,0.12)]">
          <p className="font-display text-3xl font-black text-amber-300">{win ? t('heistEscaped') : t('heistCaught')}</p>
          {win ? (
            <>
              <p className="mt-5 text-xs font-extrabold tracking-[0.2em] text-amber-200/80">{t('heistLoot')}</p>
              <p className="font-display text-5xl font-black text-white">${end.loot}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-zinc-200">
                <div>
                  <p className="text-[10px] font-extrabold tracking-[0.14em] text-zinc-500">{t('heistCombo')}</p>
                  <p className="font-display text-xl font-black">{end.combo}x</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold tracking-[0.14em] text-zinc-500">{t('heistTime')}</p>
                  <p className="font-display text-xl font-black">{formatTime(end.timeMs)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold tracking-[0.14em] text-zinc-500">{t('heistXp')}</p>
                  <p className="font-display text-xl font-black">{end.xp}</p>
                </div>
              </div>
              {record ? (
                <p className="mt-4 font-display text-sm font-black tracking-[0.18em] text-amber-300">{t('heistNewRecord')}</p>
              ) : null}
            </>
          ) : (
            <>
              <p className="mt-5 text-xs font-extrabold tracking-[0.2em] text-orange-300/80">{t('heistLootLost')}</p>
              <p className="font-display text-4xl font-black text-orange-200">${end.loot}</p>
            </>
          )}
          <p className="mt-3 text-sm text-zinc-400">
            {t('heistBest')}: {best || '—'}
          </p>
          <button type="button" className="buy-btn mt-6 w-full rounded-2xl px-4 py-3 text-zinc-950" onClick={playAgain}>
            {win ? t('heistAgain') : t('heistTryAgain')}
          </button>
          <button
            type="button"
            className="mt-3 w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-zinc-200"
            onClick={() => {
              setEnd(null)
              setScreen('lobby')
            }}
          >
            {t('heistHome')}
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
              setRecord(false)
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
