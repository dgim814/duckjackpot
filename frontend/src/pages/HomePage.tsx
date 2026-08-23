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

  const onBuy = () => {
    setBuyOpen(true)
  }

  return (
    <div className="px-4 pb-6">
      <ScreenHeader
        kicker={t('homeKicker')}
        title={t('homeTitle')}
        subtitle={t('homeSubtitle')}
      />

      <p className="mt-4 rounded-full border border-amber-400/35 bg-gradient-to-r from-amber-400/15 to-orange-500/10 px-3 py-2 text-center text-[11px] font-extrabold uppercase tracking-[0.12em] text-amber-200">
        {t('homePrizeBadge')}
      </p>

      <RafflePicker />

      <section className="mt-5">
        <CollectibleCard raffleId={raffleId} />
      </section>

      <section className="mt-5 rounded-2xl border border-amber-400/20 bg-[#141218] p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-300">
          {t('limitedDrop')}
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-200">
              {t('soldProgress', {
                sold: soldCount.toLocaleString(locale),
                total: raffle.total.toLocaleString(locale),
              })}
            </p>
            <p className="mt-1 font-display text-lg font-extrabold text-amber-200">
              {t('cardsLeft', { count: (raffle.total - soldCount).toLocaleString(locale) })}
            </p>
          </div>
          <span className="text-xs font-bold text-amber-300">{Math.round(progress)}%</span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-zinc-800">
          <div className="progress-fill h-full rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-white/8 bg-[#1c1814] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {t('prizeBonusKicker')}
        </p>
        <h2 className="font-display mt-1 text-lg font-bold text-amber-200">{t('prizePool')}</h2>
        <p className="mt-1 text-xs text-zinc-400">{t('prizePoolHint', { total: raffle.total })}</p>
        <ul className="mt-4 space-y-2">
          {raffle.prizes.map((prize) => (
            <li
              key={prize.place}
              className="flex items-center justify-between rounded-xl bg-black/25 px-3 py-2.5"
            >
              <span className="flex items-center gap-2 text-sm text-zinc-300">
                <span
                  className={[
                    'inline-flex h-6 min-w-6 items-center justify-center rounded-full text-[11px] font-extrabold',
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
              <span className="text-sm font-extrabold text-amber-300">{prize.amount}</span>
            </li>
          ))}
        </ul>
        <UsdtRateNote />
      </section>

      <button
        type="button"
        onClick={onBuy}
        disabled={!isRunning}
        className="buy-btn mt-6 w-full rounded-2xl px-4 py-4 text-zinc-950 disabled:opacity-50"
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
