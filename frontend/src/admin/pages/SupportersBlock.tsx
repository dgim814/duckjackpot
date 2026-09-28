import { useEffect, useState } from 'react'
import { api } from '../../api/client'

/** 💎 SUPPORTERS: real Supporter Pack payments only (no payment secrets shown). */
type RangeStats = { purchases: number; stars: number; uniqueSupporters: number; avgPurchase: number; packages: Record<string, number>; topPackage: number | null; storeOpens: number; invoices: number; cancelled: number }
type Admin = {
  totalStars: number
  purchases: number
  uniqueSupporters: number
  avgPurchase: number
  refunded: number
  last: { orderId: string; telegramId: number; username: string | null; name: string | null; packId: string; stars: number; date: number; status: 'PAID' | 'REFUNDED' }[]
}

const T = {
  ru: {
    title: '💎 SUPPORTERS',
    range: 'За выбранный период',
    all: 'За всё время',
    purchases: 'Покупок',
    stars: 'Support Stars',
    unique: 'Уникальных supporters',
    avg: 'Средняя покупка',
    packages: 'Пакеты',
    top: 'Топ-пакет',
    funnel: 'Открыли магазин / счетов / отмен',
    last: 'Последние 20 покупок',
    none: 'Покупок пока нет.',
    refunded: 'Возвратов',
  },
  en: {
    title: '💎 SUPPORTERS',
    range: 'Selected period',
    all: 'All time',
    purchases: 'Purchases',
    stars: 'Support Stars',
    unique: 'Unique supporters',
    avg: 'Average purchase',
    packages: 'Packages',
    top: 'Top package',
    funnel: 'Store opens / invoices / cancels',
    last: 'Last 20 purchases',
    none: 'No purchases yet.',
    refunded: 'Refunded',
  },
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <p className="font-display text-lg font-black text-amber-50">{value}</p>
    </div>
  )
}

export function SupportersBlock({ stats, lang }: { stats?: RangeStats; lang: string }) {
  const tx = lang === 'ru' ? T.ru : T.en
  const [d, setD] = useState<Admin | null>(null)
  useEffect(() => {
    api
      .get<Admin>('/admin/supporters')
      .then((r) => setD(r.data))
      .catch(() => setD(null))
  }, [])
  return (
    <section className="supporters-admin rounded-2xl border border-amber-300/40 bg-zinc-900/80 p-4">
      <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-200">{tx.title}</h3>
      {stats ? (
        <>
          <p className="mt-2 text-[11px] font-bold text-zinc-400">{tx.range}</p>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <Stat label={tx.purchases} value={stats.purchases} />
            <Stat label={tx.stars} value={`${stats.stars} ⭐`} />
            <Stat label={tx.unique} value={stats.uniqueSupporters} />
            <Stat label={tx.avg} value={`${stats.avgPurchase} ⭐`} />
          </div>
          <p className="mt-2 text-sm text-zinc-200">
            {tx.packages}: {Object.entries(stats.packages).map(([k, n]) => `${k}⭐ × ${n}`).join(' · ')}
          </p>
          <p className="text-sm text-zinc-200">
            {tx.top}: <b>{stats.topPackage ? `${stats.topPackage} ⭐` : '—'}</b>
          </p>
          <p className="text-[12px] text-zinc-400">
            {tx.funnel}: {stats.storeOpens} / {stats.invoices} / {stats.cancelled}
          </p>
        </>
      ) : null}
      {d ? (
        <>
          <p className="mt-3 text-[11px] font-bold text-zinc-400">{tx.all}</p>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <Stat label={tx.stars} value={`${d.totalStars} ⭐`} />
            <Stat label={tx.purchases} value={d.purchases} />
            <Stat label={tx.unique} value={d.uniqueSupporters} />
            <Stat label={tx.avg} value={`${d.avgPurchase} ⭐`} />
          </div>
          {d.refunded ? <p className="mt-1 text-[12px] text-zinc-400">{tx.refunded}: {d.refunded}</p> : null}
          <p className="mt-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-zinc-300">{tx.last}</p>
          <ul className="mt-1 space-y-1">
            {d.last.length ? (
              d.last.map((p) => (
                <li key={p.orderId} className="supporter-row rounded-lg bg-black/30 px-3 py-1.5 text-[12px] text-zinc-300">
                  <b className="text-zinc-100">{p.username ? `@${p.username}` : p.name ?? '—'}</b> · {p.telegramId} · {p.packId.replace('support_', '').toUpperCase()} · ⭐{p.stars} · {new Date(p.date).toLocaleString()} · {p.status}
                </li>
              ))
            ) : (
              <li className="text-[12px] text-zinc-500">{tx.none}</li>
            )}
          </ul>
        </>
      ) : null}
    </section>
  )
}
