import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import { HeistDuck } from '../heist/HeistDuck'
import { currentEnergy } from '../heist/energy'
import { DailyHeistCard } from '../heist/hub/DailyHeistCard'
import { EnergyBar } from '../heist/hub/EnergyBar'
import { NextRaidCard } from '../heist/hub/NextRaidCard'
import { bagCap, loadProgress } from '../heist/progress'
import { heistRank } from '../heist/rank'
import { useI18n } from '../i18n/LanguageProvider'

export function GameHomePage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [progress] = useState(loadProgress)
  const rank = heistRank(progress)
  const openHeist = () => navigate('/heist')

  return (
    <div className="overflow-x-hidden px-4 pb-4">
      <ScreenHeader kicker={t('hubKicker')} title={t('hubTitle')} subtitle={t('hubSubtitle')} />

      <section className="hero-stage relative mt-3 overflow-hidden rounded-3xl border border-amber-400/40 px-4 pb-5 pt-5">
        <p className="text-center text-[11px] font-extrabold uppercase tracking-[0.22em] text-amber-200">{t('heistDuckCoin')}</p>
        <p className="gold-text font-display text-center text-[3rem] font-black leading-none">{progress.bankedDuckCoin}</p>
        <p className="mt-1 text-center text-[11px] text-zinc-400">
          {t('heistBag')} {bagCap(progress)}
        </p>

        <div className="relative mx-auto mt-3 flex justify-center">
          <div className="hero-glow pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full" />
          <HeistDuck className="hero-duck relative" size={176} />
          <div className="hero-shadow pointer-events-none absolute inset-x-8 -bottom-1 h-3 rounded-full" />
        </div>

        <button
          type="button"
          onClick={openHeist}
          className="buy-btn relative mt-5 min-h-[4.35rem] w-full rounded-2xl px-4 py-3.5 text-zinc-950"
        >
          <span className="block font-display text-[1.85rem] font-black leading-none tracking-[0.16em]">{t('heistPlay')}</span>
          <span className="mt-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] opacity-80">{t('hubPlayHint')}</span>
        </button>
      </section>

      <section className="mt-3 rounded-2xl border border-white/8 bg-[#141218] px-3 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-200">{t('hubRank')}</h2>
          <span className="font-display text-sm font-black text-amber-100">{t(rank.nameKey)}</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-800">
          <div className="progress-fill h-full rounded-full" style={{ width: `${Math.round(rank.progress * 100)}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">
          {rank.nextNameKey
            ? t('hubRankNext', { n: rank.toNext, name: t(rank.nextNameKey) })
            : t('hubRankMax')}
        </p>
      </section>

      <EnergyBar value={currentEnergy()} />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={openHeist}
          className="rounded-2xl border border-amber-400/30 bg-[#141218] px-3 py-3 text-left"
        >
          <p className="font-display text-sm font-black text-amber-100">{t('hubLab')}</p>
          <p className="mt-1 text-[11px] leading-snug text-zinc-400">{t('hubLabHint')}</p>
        </button>
        <div className="rounded-2xl border border-white/10 bg-[#141218]/70 px-3 py-3 opacity-70">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-sm font-black text-amber-100/80">{t('hubVault')}</p>
            <span className="rounded-full border border-amber-400/30 px-2 py-0.5 text-[9px] font-extrabold tracking-[0.14em] text-amber-200/80">
              {t('heistLabSoon')}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-zinc-500">{t('hubVaultHint')}</p>
        </div>
      </div>

      <DailyHeistCard onOpen={openHeist} />

      <NextRaidCard progress={progress} onPlay={openHeist} />
    </div>
  )
}
