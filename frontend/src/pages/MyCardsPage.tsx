import { Layers } from 'lucide-react'
import { CollectibleCard } from '../components/CollectibleCard'
import { ScreenHeader } from '../components/ScreenHeader'
import { formatSerial, formatUsdtExact, useCards } from '../cards/CardsProvider'
import { RAFFLE_ORDER, RAFFLES } from '../constants'
import { useI18n } from '../i18n/LanguageProvider'
import { RAFFLE_TITLE_KEY } from '../i18n/raffleLabels'

export function MyCardsPage() {
  const { t, lang } = useI18n()
  const { cards, cardsFor } = useCards()
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'

  return (
    <section className="px-4 pb-6">
      <ScreenHeader title={t('cardsTitle')} subtitle={t('cardsHint')} />

      {cards.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-white/12 bg-[#141218] px-6 py-12 text-center">
          <Layers className="mb-3 text-amber-300/80" size={32} />
          <p className="text-sm text-zinc-400">{t('cardsEmpty')}</p>
        </div>
      ) : (
        <div className="mt-5 space-y-8">
          {RAFFLE_ORDER.map((id) => {
            const group = cardsFor(id)
            if (group.length === 0) return null
            const raffle = RAFFLES[id]
            return (
              <section key={id}>
                <h2 className="mb-3 font-display text-sm font-bold text-amber-200">
                  {t(RAFFLE_TITLE_KEY[id])}
                </h2>
                <ul className="space-y-5">
                  {group.map((card) => {
                    const serial = formatSerial(card.serial, raffle.total)
                    return (
                      <li key={card.id}>
                        <CollectibleCard card={card} />
                        <dl className="mt-3 space-y-2 rounded-2xl border border-white/8 bg-[#141218] px-4 py-3 text-sm">
                          <div className="flex justify-between gap-3">
                            <dt className="text-zinc-500">{t('cardNumberLabel')}</dt>
                            <dd className="font-bold text-amber-200">#{serial}</dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt className="text-zinc-500">{t('cardRaffleLabel')}</dt>
                            <dd className="font-semibold text-zinc-100">{t(RAFFLE_TITLE_KEY[card.raffleId])}</dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt className="text-zinc-500">{t('cardPayCode')}</dt>
                            <dd className="font-mono font-bold text-amber-200">{card.payCode}</dd>
                          </div>
                          {typeof card.usdtExact === 'number' ? (
                            <div className="flex justify-between gap-3">
                              <dt className="text-zinc-500">{t('adminExpectedUsdt')}</dt>
                              <dd className="font-mono font-bold tabular-nums text-amber-200">
                                {formatUsdtExact(card.usdtExact, locale)}
                              </dd>
                            </div>
                          ) : null}
                          <div className="flex justify-between gap-3">
                            <dt className="text-zinc-500">{t('cardStatusLabel')}</dt>
                            <dd
                              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                card.status === 'pending'
                                  ? 'bg-orange-400/15 text-orange-300'
                                  : 'bg-amber-400/15 text-amber-300'
                              }`}
                            >
                              {t(card.status === 'pending' ? 'cardStatusPending' : 'cardStatusActive')}
                            </dd>
                          </div>
                          {card.txHash ? (
                            <div className="flex justify-between gap-3">
                              <dt className="text-zinc-500">{t('payTx')}</dt>
                              <dd className="max-w-[60%] break-all text-right font-mono text-[11px] text-zinc-300">
                                {card.txHash}
                              </dd>
                            </div>
                          ) : null}
                        </dl>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}
