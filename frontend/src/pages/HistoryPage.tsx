import { History } from 'lucide-react'
import { useCards } from '../cards/CardsProvider'
import { ScreenHeader } from '../components/ScreenHeader'
import { RAFFLE_ORDER, RAFFLES } from '../constants'
import { useI18n } from '../i18n/LanguageProvider'
import { RAFFLE_TITLE_KEY } from '../i18n/raffleLabels'

export function HistoryPage() {
  const { t, lang } = useI18n()
  const { soldCountFor } = useCards()
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'

  return (
    <section className="px-4 pb-6">
      <ScreenHeader title={t('historyTitle')} />

      <div className="mt-5 space-y-3">
        {RAFFLE_ORDER.map((id) => {
          const raffle = RAFFLES[id]
          const sold = soldCountFor(id)
          return (
            <div key={id} className="rounded-2xl border border-amber-500/20 bg-[#1c1814] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-400/80">
                {t('historyCurrent')}
              </p>
              <p className="mt-1 font-semibold text-zinc-100">{t(RAFFLE_TITLE_KEY[id])}</p>
              <p className="mt-1 text-xs text-zinc-400">{t('historyCurrentStatus')}</p>
              <p className="mt-2 text-sm text-amber-200">
                {t('historySold', {
                  sold: sold.toLocaleString(locale),
                  total: raffle.total.toLocaleString(locale),
                })}
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-white/12 bg-[#141218] px-6 py-12 text-center">
        <History className="mb-3 text-amber-300/80" size={32} />
        <p className="text-sm text-zinc-400">{t('historyEmpty')}</p>
      </div>
    </section>
  )
}
