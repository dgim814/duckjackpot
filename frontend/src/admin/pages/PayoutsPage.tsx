import { useAdmin } from '../AdminProvider'
import { useI18n } from '../../i18n/LanguageProvider'
import { RAFFLE_TITLE_KEY } from '../../i18n/raffleLabels'

export function PayoutsPage() {
  const { t } = useI18n()
  const { winners, markPaid, updateWinnerNote } = useAdmin()

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">{t('adminPayoutsHint')}</p>
      {winners.map((winner) => (
        <section key={winner.id} className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-zinc-100">{winner.name}</p>
              <p className="text-xs text-zinc-500">
                {t(RAFFLE_TITLE_KEY[winner.raffleId])} · {t('placeN', { n: winner.place })} · {winner.amount}
              </p>
            </div>
            <span
              className={[
                'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                winner.paid ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-200',
              ].join(' ')}
            >
              {winner.paid ? t('adminPaid') : t('adminUnpaid')}
            </span>
          </div>
          <label className="mt-3 block text-[11px] text-zinc-500">{t('adminTxNote')}</label>
          <input
            value={winner.note}
            onChange={(e) => updateWinnerNote(winner.id, e.target.value)}
            placeholder={t('adminTxPlaceholder')}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100"
          />
          <button
            type="button"
            className="admin-btn mt-3"
            onClick={() => markPaid(winner.id, !winner.paid)}
          >
            {winner.paid ? t('adminMarkUnpaid') : t('adminMarkPaid')}
          </button>
        </section>
      ))}
    </div>
  )
}
