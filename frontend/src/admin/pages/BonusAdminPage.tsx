import { useEffect, useState } from 'react'
import { api, formatApiError } from '../../api/client'
import { adminHeaders } from '../adminApi'
import { useI18n } from '../../i18n/LanguageProvider'

type BonusUser = {
  telegramId: number
  telegramUsername?: string
  firstConfirmedAt: number
  cards: number
}

type PrizeRow = { place: string; amount: string }

export function BonusAdminPage() {
  const { t, lang } = useI18n()
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  const [users, setUsers] = useState<BonusUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [prizes, setPrizes] = useState<PrizeRow[]>([
    { place: '1', amount: '500 USDT' },
    { place: '2', amount: '200 USDT' },
    { place: '3', amount: '100 USDT' },
  ])

  const load = () => {
    void api
      .get<{ users?: BonusUser[] }>('/admin/bonus', { headers: adminHeaders })
      .then(({ data }) => setUsers(data.users ?? []))
      .catch((err: unknown) => setError(formatApiError(err)))
  }

  useEffect(() => {
    load()
  }, [])

  const run = async () => {
    if (!window.confirm(t('adminBonusDrawConfirm'))) return
    setBusy(true)
    setError(null)
    try {
      await api.post(
        '/admin/bonus/draw',
        {
          prizes: prizes
            .map((row) => ({ place: Number(row.place), amount: row.amount.trim() }))
            .filter((row) => row.place > 0 && row.amount),
        },
        { headers: adminHeaders },
      )
      load()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">{t('adminBonusHint')}</p>
      <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
        <h2 className="font-semibold text-zinc-100">{t('adminBonusPrizes')}</h2>
        <div className="mt-3 space-y-2">
          {prizes.map((row, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="number"
                min={1}
                value={row.place}
                onChange={(e) =>
                  setPrizes((prev) => prev.map((item, i) => (i === index ? { ...item, place: e.target.value } : item)))
                }
                className="w-16 rounded-lg border border-white/10 bg-black/40 px-2 py-2 font-mono text-sm text-zinc-100"
              />
              <input
                value={row.amount}
                onChange={(e) =>
                  setPrizes((prev) => prev.map((item, i) => (i === index ? { ...item, amount: e.target.value } : item)))
                }
                className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-zinc-100"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="admin-btn mt-3"
          onClick={() => setPrizes((prev) => [...prev, { place: String(prev.length + 1), amount: '' }])}
        >
          {t('adminBonusAddPlace')}
        </button>
        <button type="button" className="admin-btn mt-3 ml-2" disabled={busy} onClick={() => void run()}>
          {busy ? '…' : t('adminBonusDraw')}
        </button>
        {error ? <p className="mt-2 text-xs text-orange-400">{error}</p> : null}
      </section>
      <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
        <h2 className="font-semibold text-zinc-100">
          {t('adminBonusUsers')} · {users.length}
        </h2>
        <ul className="mt-3 max-h-96 space-y-1 overflow-auto text-sm">
          {users.map((user) => (
            <li key={user.telegramId} className="flex justify-between gap-2 rounded-lg bg-black/30 px-2 py-1.5">
              <span className="font-mono text-zinc-300">
                {user.telegramUsername ? `@${user.telegramUsername}` : '—'} / {user.telegramId}
              </span>
              <span className="text-xs text-zinc-500">
                {user.cards} · {new Date(user.firstConfirmedAt).toLocaleDateString(locale)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
