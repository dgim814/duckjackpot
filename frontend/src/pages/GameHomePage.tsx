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
    <div className="px-4 pb-4">
      <ScreenHeader kicker={t('hubKicker')} title={t('hubTitle')} subtitle={t('hubSubtitle')} />

      <section className="mt-3 overflow-hidden rounded-2xl border border-amber-400/40 bg-[#1a1410] px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-200">{t('heistDuckCoin')}</p>
            <p className="font-display text-4xl font-black leading-tight text-amber-300">{progress.bankedDuckCoin}</p>
            <p className="mt-1 text-[11px] text-zinc-400">
              {t('heistBag')} {bagCap(progress)}
            </p>
          </div>
          <HeistDuck className="-my-4 max-h-28 w-auto shrink-0" />
        </div>

        <button
          type="button"
          onClick={openHeist}
          className="buy-btn mt-3 min-h-14 w-full rounded-2xl px-4 py-3 text-zinc-950"
        >
          <span className="block font-display text-lg font-extrabold leading-tight tracking-[0.12em]">{t('heistPlay')}</span>
          <span className="mt-0.5 block text-xs font-bold opacity-80">{t('hubPlayHint')}</span>
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
