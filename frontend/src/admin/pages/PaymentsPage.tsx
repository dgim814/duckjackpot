import { useCallback, useEffect, useState } from 'react'
import { useAdmin } from '../AdminProvider'
import { adminHeaders } from '../adminApi'
import { api } from '../../api/client'
import { formatSerial, formatUsdtExact } from '../../cards/CardsProvider'
import { RAFFLE_ORDER, getRaffle, type RaffleId } from '../../constants'
import { useI18n } from '../../i18n/LanguageProvider'
import { RAFFLE_TITLE_KEY } from '../../i18n/raffleLabels'

type PaymentStatus = 'pending' | 'confirmed' | 'rejected'

type Payment = {
  id: string
  payCode: string
  usdtExact?: number
  raffleId: RaffleId | string
  serial: number
  telegramId?: number
  telegramUsername?: string
  createdAt: number
  claimedAt: number
  status: PaymentStatus
}

export function PaymentsPage() {
  const { t, lang } = useI18n()
  const { incrementSold } = useAdmin()
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending')
  const [raffleFilter, setRaffleFilter] = useState<'all' | RaffleId>('all')
  const [payments, setPayments] = useState<Payment[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const { data } = await api.get<{ payments: Payment[] }>('/admin/payments', {
        headers: adminHeaders,
        params: { status: statusFilter, raffleId: raffleFilter },
      })
      setPayments(data.payments ?? [])
    } catch {
      setError(t('adminPaymentsLoadError'))
      setPayments([])
    }
  }, [raffleFilter, statusFilter, t])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 8_000)
    return () => window.clearInterval(timer)
  }, [load])

  const act = async (id: string, action: 'confirm' | 'reject') => {
    setBusyId(id)
    setError(null)
    try {
      const { data } = await api.post<{ changed?: boolean }>(
        `/admin/payments/${encodeURIComponent(id)}/${action}`,
        {},
        { headers: adminHeaders },
      )
      if (action === 'confirm' && data.changed !== false) {
        const payment = payments.find((item) => item.id === id)
        if (payment && (payment.raffleId === 'classic' || payment.raffleId === 'fast200' || payment.raffleId === 'fast100')) {
          incrementSold(payment.raffleId)
        }
      }
      await load()
    } catch {
      setError(t('adminPaymentsActError'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-zinc-100">
          {statusFilter === 'pending' ? t('adminPaymentsTitle') : t('adminNavPayments')}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">{t('adminPaymentsHint')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['pending', 'all'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={[
              'rounded-lg px-3 py-1.5 text-xs font-bold',
              statusFilter === value ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-900 text-zinc-400',
            ].join(' ')}
          >
            {value === 'pending' ? t('adminPaymentsFilterPending') : t('adminPaymentsFilterAll')}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRaffleFilter('all')}
          className={[
            'rounded-lg px-3 py-1.5 text-xs font-bold',
            raffleFilter === 'all' ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-zinc-400',
          ].join(' ')}
        >
          {t('adminPaymentsFilterRaffleAll')}
        </button>
        {RAFFLE_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setRaffleFilter(id)}
            className={[
              'rounded-lg px-3 py-1.5 text-xs font-bold',
              raffleFilter === id ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-zinc-400',
            ].join(' ')}
          >
            {t(RAFFLE_TITLE_KEY[id])}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-orange-400">{error}</p> : null}

      {payments.length === 0 && !error ? (
        <p className="text-sm text-zinc-500">{t('adminPaymentsEmpty')}</p>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => {
            const raffle = getRaffle(
              payment.raffleId === 'classic' || payment.raffleId === 'fast200' || payment.raffleId === 'fast100'
                ? payment.raffleId
                : 'classic',
            )
            return (
              <section key={payment.id} className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-lg font-extrabold text-amber-200">{payment.payCode}</p>
                    <p className="mt-1 text-sm font-bold text-zinc-100">
                      {typeof payment.usdtExact === 'number' ? formatUsdtExact(payment.usdtExact, locale) : '—'}
                    </p>
                  </div>
                  <StatusBadge status={payment.status} />
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between gap-3 text-zinc-400">
                    <dt>{t('cardRaffleLabel')}</dt>
                    <dd className="text-zinc-200">{t(RAFFLE_TITLE_KEY[raffle.id])}</dd>
                  </div>
                  <div className="flex justify-between gap-3 text-zinc-400">
                    <dt>{t('cardNumberLabel')}</dt>
                    <dd className="font-mono text-zinc-200">#{formatSerial(payment.serial, raffle.total)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 text-zinc-400">
                    <dt>{t('adminTelegramId')}</dt>
                    <dd className="text-right font-mono text-xs text-zinc-200">
                      {payment.telegramId ?? '—'}
                      {payment.telegramUsername ? (
                        <span className="mt-0.5 block text-zinc-500">@{payment.telegramUsername}</span>
                      ) : null}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 text-zinc-400">
                    <dt>{t('adminIssuedAt')}</dt>
                    <dd className="text-zinc-300">{new Date(payment.claimedAt || payment.createdAt).toLocaleString(locale)}</dd>
                  </div>
                </dl>
                {payment.status === 'pending' ? (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === payment.id}
                      onClick={() => void act(payment.id, 'confirm')}
                      className="flex-1 rounded-xl bg-amber-400 px-3 py-2 text-sm font-extrabold text-zinc-950 disabled:opacity-50"
                    >
                      {t('adminConfirmPay')}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === payment.id}
                      onClick={() => void act(payment.id, 'reject')}
                      className="flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm font-bold text-zinc-300 disabled:opacity-50"
                    >
                      {t('adminRejectPay')}
                    </button>
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const { t } = useI18n()
  const label =
    status === 'pending'
      ? t('adminPayStatusPending')
      : status === 'rejected'
        ? t('adminPayStatusRejected')
        : t('adminPayStatusConfirmed')
  const className =
    status === 'pending'
      ? 'bg-orange-400/15 text-orange-300'
      : status === 'rejected'
        ? 'bg-zinc-700 text-zinc-300'
        : 'bg-emerald-400/15 text-emerald-300'
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${className}`}>{label}</span>
}
