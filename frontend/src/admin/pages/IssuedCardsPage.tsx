import { useCards, formatSerial, formatUsdtExact } from '../../cards/CardsProvider'
import { getRaffle } from '../../constants'
import { useI18n } from '../../i18n/LanguageProvider'
import { RAFFLE_TITLE_KEY } from '../../i18n/raffleLabels'

export function IssuedCardsPage() {
  const { t, lang } = useI18n()
  const { cards, confirmCardPayment } = useCards()
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'

  if (cards.length === 0) {
    return <p className="text-sm text-zinc-500">{t('adminNoIssued')}</p>
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[780px] text-left text-sm">
        <thead className="bg-zinc-900 text-[11px] uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-3 py-2 font-semibold">{t('cardNumberLabel')}</th>
            <th className="px-3 py-2 font-semibold">{t('cardPayCode')}</th>
            <th className="px-3 py-2 font-semibold">{t('adminTelegramId')}</th>
            <th className="px-3 py-2 font-semibold">{t('adminExpectedUsdt')}</th>
            <th className="px-3 py-2 font-semibold">{t('cardRaffleLabel')}</th>
            <th className="px-3 py-2 font-semibold">{t('cardStatusLabel')}</th>
            <th className="px-3 py-2 font-semibold">{t('adminIssuedAt')}</th>
            <th className="px-3 py-2 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => {
            const raffle = getRaffle(card.raffleId)
            return (
              <tr key={card.id} className="border-t border-white/8 text-zinc-200">
                <td className="px-3 py-2 font-mono">#{formatSerial(card.serial, raffle.total)}</td>
                <td className="px-3 py-2 font-mono font-bold text-amber-200">{card.payCode}</td>
                <td className="px-3 py-2 font-mono text-xs text-zinc-300">
                  {card.telegramId ? (
                    <>
                      {card.telegramId}
                      {card.telegramUsername ? (
                        <span className="block text-zinc-500">@{card.telegramUsername}</span>
                      ) : null}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2 font-mono tabular-nums">
                  {typeof card.usdtExact === 'number' ? formatUsdtExact(card.usdtExact, locale) : '—'}
                </td>
                <td className="px-3 py-2">{t(RAFFLE_TITLE_KEY[card.raffleId])}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      card.status === 'pending'
                        ? 'bg-orange-400/15 text-orange-300'
                        : card.status === 'rejected'
                          ? 'bg-zinc-700 text-zinc-400'
                          : 'bg-emerald-400/15 text-emerald-300'
                    }`}
                  >
                    {t(
                      card.status === 'pending'
                        ? 'adminPayStatusPending'
                        : card.status === 'rejected'
                          ? 'adminPayStatusRejected'
                          : 'adminPayStatusConfirmed',
                    )}
                  </span>
                </td>
                <td className="px-3 py-2 text-zinc-400">{new Date(card.purchasedAt).toLocaleString(locale)}</td>
                <td className="px-3 py-2">
                  {card.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => confirmCardPayment(card.id)}
                      className="rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-zinc-950"
                    >
                      {t('adminConfirmPay')}
                    </button>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
