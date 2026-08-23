import { useCards } from '../cards/CardsProvider'
import { RAFFLE_ORDER, RAFFLES } from '../constants'
import { formatCardPrice, useUsdtRate } from '../hooks/useUsdtRate'
import { useI18n } from '../i18n/LanguageProvider'
import { RAFFLE_HINT_KEY, RAFFLE_TITLE_KEY } from '../i18n/raffleLabels'

export function RafflePicker() {
  const { t, lang } = useI18n()
  const { raffleId, setRaffleId } = useCards()
  const { rate } = useUsdtRate()

  return (
    <section className="mt-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400/80">
        {t('rafflePick')}
      </h2>
      <div className="mt-3 grid gap-2">
        {RAFFLE_ORDER.map((id) => {
          const raffle = RAFFLES[id]
          const active = raffleId === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setRaffleId(id)}
              className={[
                'rounded-2xl border px-4 py-3 text-left transition-colors',
                active
                  ? 'border-amber-400/70 bg-amber-400/12 shadow-[0_0_24px_rgba(255,193,7,0.12)]'
                  : 'border-white/8 bg-[#141218]',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-sm font-bold text-amber-100">{t(RAFFLE_TITLE_KEY[id])}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{t(RAFFLE_HINT_KEY[id])}</p>
                </div>
                <p className="shrink-0 text-right text-xs font-extrabold leading-tight text-amber-300">
                  {formatCardPrice(raffle.priceRub, rate, lang)}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
