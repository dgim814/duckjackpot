import { History } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAdmin } from '../admin/AdminProvider'
import { api } from '../api/client'
import { useCards } from '../cards/CardsProvider'
import { ScreenHeader } from '../components/ScreenHeader'
import { RAFFLE_ORDER, RAFFLES, type RaffleId } from '../constants'
import { useI18n } from '../i18n/LanguageProvider'
import { RAFFLE_TITLE_KEY } from '../i18n/raffleLabels'

type DrawWinner = {
  place: number
  amount: string
  serial?: number
  telegramId: number
  telegramUsername?: string
}

type StoredDraw = {
  id: string
  kind: 'collection' | 'bonus'
  raffleId?: string
  at: number
  seed: string
  seedSource: string
  blockSeqno?: number
  winners: DrawWinner[]
}

export function HistoryPage() {
  const { t, lang } = useI18n()
  const { soldCountFor } = useCards()
  const { raffles } = useAdmin()
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  const [draws, setDraws] = useState<StoredDraw[]>([])

  useEffect(() => {
    void api
      .get<{ draws?: StoredDraw[] }>('/draws')
      .then(({ data }) => setDraws(data.draws ?? []))
      .catch(() => undefined)
  }, [])

  return (
    <section className="px-4 pb-6">
      <ScreenHeader title={t('historyTitle')} />

      <div className="mt-5 space-y-3">
        {RAFFLE_ORDER.map((id) => {
          const raffle = RAFFLES[id]
          const sold = soldCountFor(id)
          const status = raffles[id]?.status
          const statusText =
            status === 'awaiting_draw'
              ? t('historyAwaiting')
              : status === 'drawn'
                ? t('historyDrawn')
                : t('historyCurrentStatus')
          return (
            <div key={id} className="rounded-2xl border border-amber-500/20 bg-[#1c1814] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-400/80">
                {t('historyCurrent')}
              </p>
              <p className="mt-1 font-semibold text-zinc-100">{t(RAFFLE_TITLE_KEY[id])}</p>
              <p className="mt-1 text-xs text-zinc-400">{statusText}</p>
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

      {draws.length ? (
        <div className="mt-5 space-y-3">
          {draws.map((draw) => (
            <article key={draw.id} className="rounded-2xl border border-white/10 bg-[#141218] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
                {draw.kind === 'bonus'
                  ? t('historyBonusDraw')
                  : t(RAFFLE_TITLE_KEY[(draw.raffleId as RaffleId) || 'classic'])}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{new Date(draw.at).toLocaleString(locale)}</p>
              <p className="mt-2 break-all font-mono text-[11px] text-zinc-400">
                {t('historySeed')}: {draw.seed}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                {draw.blockSeqno != null
                  ? `TON seqno ${draw.blockSeqno}`
                  : t('historySeedFallback')}
              </p>
              <ul className="mt-3 space-y-1.5">
                {draw.winners.map((winner) => (
                  <li key={`${draw.id}-${winner.place}`} className="rounded-lg bg-black/30 px-2.5 py-1.5 text-sm">
                    <span className="font-semibold text-amber-200">
                      {t('placeN', { n: winner.place })} · {winner.amount}
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-300">
                      {winner.serial != null ? `#${String(winner.serial).padStart(4, '0')} · ` : ''}
                      {winner.telegramUsername ? `@${winner.telegramUsername}` : '—'} / {winner.telegramId}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-white/12 bg-[#141218] px-6 py-12 text-center">
          <History className="mb-3 text-amber-300/80" size={32} />
          <p className="text-sm text-zinc-400">{t('historyEmpty')}</p>
        </div>
      )}
    </section>
  )
}
