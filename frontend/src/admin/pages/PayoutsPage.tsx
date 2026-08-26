import { useAdmin, type NotifyStatus } from '../AdminProvider'
import { useI18n } from '../../i18n/LanguageProvider'
import { RAFFLE_TITLE_KEY } from '../../i18n/raffleLabels'
import type { MessageKey } from '../../i18n/messages'

const NOTIFY_KEY: Record<NotifyStatus, MessageKey> = {
  sent: 'adminNotifySent',
  no_chat: 'adminNotifyNoChat',
  failed: 'adminNotifyFailed',
  pending: 'adminNotifyPending',
}

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
              {winner.telegramId ? (
                <p className="mt-1 font-mono text-[11px] text-zinc-500">
                  ID {winner.telegramId}
                  {winner.telegramUsername ? ` · @${winner.telegramUsername}` : ''}
                </p>
              ) : null}
              {winner.payCode ? (
                <p className="mt-0.5 font-mono text-[11px] text-amber-200">{winner.payCode}</p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={[
                  'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                  winner.paid ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-200',
                ].join(' ')}
              >
                {winner.paid ? t('adminPaid') : t('adminUnpaid')}
              </span>
              <span
                className={[
                  'max-w-[11rem] rounded-full px-2 py-0.5 text-right text-[10px] font-semibold',
                  winner.notifyStatus === 'sent'
                    ? 'bg-emerald-400/10 text-emerald-300'
                    : winner.notifyStatus === 'no_chat'
                      ? 'bg-orange-400/15 text-orange-300'
                      : winner.notifyStatus === 'failed'
                        ? 'bg-red-400/15 text-red-300'
                        : 'bg-zinc-800 text-zinc-400',
                ].join(' ')}
              >
                {t(NOTIFY_KEY[winner.notifyStatus])}
              </span>
            </div>
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
