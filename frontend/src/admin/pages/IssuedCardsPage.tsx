import { useCallback, useEffect, useState } from 'react'
import { adminHeaders } from '../adminApi'
import { api, formatApiError } from '../../api/client'
import { formatSerial, formatUsdtExact } from '../../cards/CardsProvider'
import { getRaffle, type RaffleId } from '../../constants'
import { useI18n } from '../../i18n/LanguageProvider'
import { RAFFLE_TITLE_KEY } from '../../i18n/raffleLabels'

type IssuedCard = {
  id: string
  raffleId: RaffleId | string
  serial: number
  payCode: string
  usdtExact?: number
  telegramId?: number
  telegramUsername?: string
  purchasedAt: number
  status: string
}

export function IssuedCardsPage() {
  const { t, lang } = useI18n()
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  const [cards, setCards] = useState<IssuedCard[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<{ cards: IssuedCard[] }>('/admin/cards', { headers: adminHeaders })
      setCards(data.cards ?? [])
      setError(null)
    } catch (err) {
      setError(formatApiError(err))
      setCards([])
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 8_000)
    return () => window.clearInterval(timer)
  }, [load])

  const act = async (id: string, action: 'confirm' | 'reject') => {
    setBusyId(id)
    try {
      await api.post(`/admin/payments/${id}/${action}`, {}, { headers: adminHeaders })
      await load()
      setError(null)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">{t('adminIssuedHint')}</p>
      {error ? <p className="text-sm text-orange-400 break-all">{error}</p> : null}
      {cards.length === 0 && !error ? (
        <p className="text-sm text-zinc-500">{t('adminNoIssued')}</p>
      ) : cards.length === 0 ? null : (
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
                const raffleId =
                  card.raffleId === 'classic' || card.raffleId === 'fast200' || card.raffleId === 'fast100'
                    ? card.raffleId
                    : 'classic'
                const raffle = getRaffle(raffleId)
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
                    <td className="px-3 py-2">{t(RAFFLE_TITLE_KEY[raffleId])}</td>
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
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={busyId === card.id}
                            onClick={() => void act(card.id, 'confirm')}
                            className="rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-zinc-950 disabled:opacity-50"
                          >
                            {t('adminConfirmPay')}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === card.id}
                            onClick={() => void act(card.id, 'reject')}
                            className="rounded-xl border border-white/15 px-3 py-1.5 text-xs font-bold text-zinc-300 disabled:opacity-50"
                          >
                            {t('adminRejectPay')}
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
