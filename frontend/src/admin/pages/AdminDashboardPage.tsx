import { revenueRub, useAdmin } from '../AdminProvider'
import { useCards } from '../../cards/CardsProvider'
import { RAFFLE_ORDER, RAFFLES } from '../../constants'
import { useI18n } from '../../i18n/LanguageProvider'
import { RAFFLE_TITLE_KEY } from '../../i18n/raffleLabels'

export function AdminDashboardPage() {
  const { t, lang } = useI18n()
  const { raffles } = useAdmin()
  const { cards } = useCards()
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  const revenue = revenueRub(raffles)
  const users = cards.length > 0 ? 1 : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat label={t('adminRevenue')} value={`${revenue.toLocaleString(locale)} ₽`} />
        <Stat label={t('adminUsers')} value={String(users)} hint={t('adminUsersHint')} />
      </div>
      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t('adminSoldByRaffle')}</h2>
        <ul className="mt-3 space-y-3">
          {RAFFLE_ORDER.map((id) => {
            const raffle = RAFFLES[id]
            const sold = raffles[id].soldBase
            const pct = Math.round((sold / raffle.total) * 100)
            return (
              <li key={id}>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-200">{t(RAFFLE_TITLE_KEY[id])}</span>
                  <span className="font-mono text-amber-200">
                    {sold} / {raffle.total}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {raffles[id].status === 'running' ? t('adminRunning') : t('adminStopped')}
                </p>
              </li>
            )
          })}
        </ul>
      </div>
      <p className="text-[11px] text-zinc-600">{t('adminLocalNote')}</p>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-zinc-50">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-zinc-600">{hint}</p> : null}
    </div>
  )
}
