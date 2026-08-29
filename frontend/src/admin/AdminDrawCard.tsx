import { useCallback, useEffect, useState } from 'react'
import { api, formatApiError } from '../api/client'
import { adminHeaders } from './adminApi'
import { useAdmin } from './AdminProvider'
import { useI18n } from '../i18n/LanguageProvider'
import { RAFFLE_TITLE_KEY } from '../i18n/raffleLabels'
import type { RaffleId } from '../constants'

export type AdminDrawWinner = {
  place: number
  amount: string
  serial?: number
  telegramId: number
  telegramUsername?: string
  notifyStatus?: string
  paid?: boolean
}

export type AdminDraw = {
  id: string
  kind: 'collection' | 'bonus'
  raffleId?: string
  at: number
  seed: string
  hidden?: boolean
  winners: AdminDrawWinner[]
}

export function useAdminDraws() {
  const [draws, setDraws] = useState<AdminDraw[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<{ draws?: AdminDraw[] }>('/admin/draws', { headers: adminHeaders })
      setDraws(data.draws ?? [])
      setError(null)
    } catch (err) {
      setError(formatApiError(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { draws, error, load, setDraws }
}

export function AdminDrawCard({
  draw,
  showPaid,
  onChanged,
}: {
  draw: AdminDraw
  showPaid?: boolean
  onChanged?: (draws: AdminDraw[]) => void
}) {
  const { t, lang } = useI18n()
  const { winners, markPaid } = useAdmin()
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const title =
    draw.kind === 'bonus' ? t('historyBonusDraw') : t(RAFFLE_TITLE_KEY[(draw.raffleId as RaffleId) || 'classic'])

  const applyDraws = (next: AdminDraw[]) => {
    onChanged?.(next)
  }

  const hide = async () => {
    if (draw.hidden) return
    if (!window.confirm(t('adminHideFromHistoryConfirm'))) return
    setBusy(true)
    setError(null)
    try {
      const { data } = await api.post<{ draws?: AdminDraw[] }>(
        `/admin/draws/${encodeURIComponent(draw.id)}/hide`,
        {},
        { headers: adminHeaders },
      )
      if (data.draws) applyDraws(data.draws)
      const updated = (data.draws ?? []).find((item) => item.id === draw.id) ?? { ...draw, hidden: true }
      for (const winner of winners) {
        const row = updated.winners.find(
          (item) =>
            item.telegramId === winner.telegramId &&
            item.place === winner.place &&
            (draw.kind === 'bonus' || winner.raffleId === draw.raffleId),
        )
        if (row && !row.paid && winner.paid) markPaid(winner.id, false)
      }
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  const togglePaid = async (place: number, paid: boolean) => {
    setBusy(true)
    setError(null)
    try {
      const { data } = await api.post<{ draws?: AdminDraw[] }>(
        `/admin/draws/${encodeURIComponent(draw.id)}/paid`,
        { place, paid },
        { headers: adminHeaders },
      )
      if (data.draws) applyDraws(data.draws)
      const row = draw.winners.find((item) => item.place === place)
      for (const winner of winners) {
        if (row && winner.telegramId === row.telegramId && winner.place === place) {
          markPaid(winner.id, paid)
        }
      }
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="rounded-xl border border-white/10 bg-black/25 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-100">{title}</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">{new Date(draw.at).toLocaleString(locale)}</p>
        </div>
        {draw.hidden ? (
          <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-300">
            {t('adminHiddenTest')}
          </span>
        ) : (
          <button type="button" className="admin-btn admin-btn-danger" disabled={busy} onClick={() => void hide()}>
            {t('adminHideFromHistory')}
          </button>
        )}
      </div>
      <ul className="mt-2 space-y-1.5">
        {draw.winners.map((winner) => (
          <li key={`${draw.id}-${winner.place}`} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-zinc-300">
              {t('placeN', { n: winner.place })} · {winner.amount}
              <span className="mt-0.5 block text-[11px] text-zinc-500">
                {winner.serial != null ? `#${String(winner.serial).padStart(4, '0')} · ` : ''}
                {winner.telegramUsername ? `@${winner.telegramUsername}` : '—'} / {winner.telegramId}
              </span>
            </span>
            {showPaid ? (
              <button
                type="button"
                className="admin-btn"
                disabled={busy}
                onClick={() => void togglePaid(winner.place, !winner.paid)}
              >
                {winner.paid ? t('adminPaid') : t('adminUnpaid')}
              </button>
            ) : winner.paid ? (
              <span className="text-[10px] font-bold uppercase text-zinc-500">{t('adminPaid')}</span>
            ) : null}
          </li>
        ))}
      </ul>
      {error ? <p className="mt-2 text-[11px] text-orange-400">{error}</p> : null}
    </article>
  )
}
