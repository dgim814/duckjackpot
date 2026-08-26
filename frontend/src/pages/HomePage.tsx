import { useState } from 'react'
import { useCards } from '../cards/CardsProvider'
import { BuySheet } from '../components/BuySheet'
import { CollectibleCard } from '../components/CollectibleCard'
import { RafflePicker } from '../components/RafflePicker'
import { ScreenHeader } from '../components/ScreenHeader'
import { UsdtRateNote } from '../components/UsdtRateNote'
import { formatCardPrice, useUsdtRate } from '../hooks/useUsdtRate'
import { getRaffle } from '../constants'
import { useI18n } from '../i18n/LanguageProvider'

export function HomePage() {
  const { t, lang } = useI18n()
  const { raffleId, soldCount, isRunning } = useCards()
  const raffle = getRaffle(raffleId)
  const { rate } = useUsdtRate()
  const [buyOpen, setBuyOpen] = useState(false)
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  const progress = Math.min(100, (soldCount / raffle.total) * 100)
  const jackpot = raffle.prizes[0]?.amount ?? '—'

  return (
    <div className="px-4 pb-4">
      <ScreenHeader kicker={t('homeKicker')} title={t('homeTitle')} />

      <RafflePicker />

      <p className="mt-3 text-center text-[12px] leading-snug text-zinc-400">
        {t('homePrizeHint')}
      </p>
      <p className="mt-1 text-center font-display text-base font-extrabold text-amber-200">
        {t('homeJackpot', { amount: jackpot })}
      </p>

      <section className="mt-3 rounded-2xl border border-white/8 bg-[#1c1814] px-3 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-sm font-bold text-amber-200">{t('prizePool')}</h2>
          <p className="text-[10px] text-zinc-500">{t('prizePoolHint', { total: raffle.total })}</p>
        </div>
        <ul className="mt-1.5 space-y-0.5">
          {raffle.prizes.map((prize) => (
            <li key={prize.place} className="flex items-center justify-between rounded-lg bg-black/25 px-2.5 py-1">
              <span className="flex items-center gap-1.5 text-xs text-zinc-300">
                <span
                  className={[
                    'inline-flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-extrabold',
                    prize.place === 1
                      ? 'bg-amber-400 text-zinc-950'
                      : prize.place === 2
                        ? 'bg-zinc-300 text-zinc-950'
                        : prize.place === 3
                          ? 'bg-orange-700 text-amber-50'
                          : 'bg-zinc-800 text-amber-200',
                  ].join(' ')}
                >
                  {prize.place}
                </span>
                {t('placeN', { n: prize.place })}
              </span>
              <span className="text-xs font-extrabold text-amber-300">{prize.amount}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-3">
        <CollectibleCard raffleId={raffleId} compact />
      </section>

      <section className="mt-3 rounded-2xl border border-amber-400/20 bg-[#141218] px-3 py-2.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-300">
              {t('limitedDrop')}
            </p>
            <p className="mt-1 text-xs font-semibold text-zinc-200">
              {t('soldProgress', {
                sold: soldCount.toLocaleString(locale),
                total: raffle.total.toLocaleString(locale),
              })}
            </p>
          </div>
          <span className="text-xs font-bold text-amber-300">{Math.round(progress)}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="progress-fill h-full rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <UsdtRateNote />

      <button
        type="button"
        onClick={() => setBuyOpen(true)}
        disabled={!isRunning}
        className="buy-btn sticky bottom-[calc(4.85rem+env(safe-area-inset-bottom))] z-20 mt-3 w-full rounded-2xl px-4 py-3.5 text-zinc-950 shadow-[0_8px_24px_rgba(0,0,0,0.45)] disabled:opacity-50"
      >
        <span className="block font-display text-lg font-extrabold leading-tight">
          {isRunning ? t('buyCta') : t('buyPaused')}
        </span>
        <span className="mt-0.5 block text-sm font-bold opacity-80">
          {formatCardPrice(raffle.priceRub, rate, lang)}
        </span>
      </button>

      <BuySheet open={buyOpen} onClose={() => setBuyOpen(false)} />
    </div>
  )
}
