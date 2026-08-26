import { useCards } from '../cards/CardsProvider'
import { RAFFLE_ORDER } from '../constants'
import { useI18n } from '../i18n/LanguageProvider'
import { RAFFLE_TITLE_KEY } from '../i18n/raffleLabels'

export function RafflePicker() {
  const { t } = useI18n()
  const { raffleId, setRaffleId } = useCards()

  return (
    <section className="mt-3">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-400/80">
        {t('rafflePick')}
      </h2>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {RAFFLE_ORDER.map((id) => {
          const active = raffleId === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setRaffleId(id)}
              className={[
                'rounded-xl border px-1.5 py-2 text-center transition-colors',
                active
                  ? 'border-amber-400/70 bg-amber-400/12 text-amber-100'
                  : 'border-white/8 bg-[#141218] text-zinc-400',
              ].join(' ')}
            >
              <p className="font-display text-[11px] font-bold leading-tight">{t(RAFFLE_TITLE_KEY[id])}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
