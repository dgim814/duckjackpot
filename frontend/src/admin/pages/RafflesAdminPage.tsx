import { useState } from 'react'
import { useAdmin } from '../AdminProvider'
import { useCards } from '../../cards/CardsProvider'
import { RAFFLE_ORDER, RAFFLES } from '../../constants'
import { useI18n } from '../../i18n/LanguageProvider'
import { RAFFLE_TITLE_KEY } from '../../i18n/raffleLabels'

export function RafflesAdminPage() {
  const { t } = useI18n()
  const admin = useAdmin()
  const { clearRaffleCards } = useCards()
  const [draft, setDraft] = useState<Record<string, string>>({})

  return (
    <div className="space-y-3">
      {RAFFLE_ORDER.map((id) => {
        const raffle = RAFFLES[id]
        const runtime = admin.raffles[id]
        const value = draft[id] ?? String(runtime.soldBase)
        return (
          <section key={id} className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-zinc-100">{t(RAFFLE_TITLE_KEY[id])}</h2>
              <span
                className={[
                  'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                  runtime.status === 'running' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-zinc-700 text-zinc-300',
                ].join(' ')}
              >
                {runtime.status === 'running' ? t('adminRunning') : t('adminStopped')}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {raffle.priceRub} ₽ · {raffle.total} {t('adminCardsUnit')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="admin-btn" onClick={() => admin.setStatus(id, 'running')}>
                {t('adminStart')}
              </button>
              <button type="button" className="admin-btn" onClick={() => admin.setStatus(id, 'stopped')}>
                {t('adminStop')}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={() => {
                  if (window.confirm(t('adminResetConfirm'))) {
                    clearRaffleCards(id)
                    admin.resetRaffle(id)
                  }
                }}
              >
                {t('adminReset')}
              </button>
            </div>
            <label className="mt-4 block text-xs text-zinc-500">{t('adminSoldEdit')}</label>
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                min={0}
                max={raffle.total}
                value={value}
                onChange={(e) => setDraft((prev) => ({ ...prev, [id]: e.target.value }))}
                className="w-28 rounded-lg border border-white/10 bg-black/40 px-2 py-2 font-mono text-sm text-zinc-100"
              />
              <button
                type="button"
                className="admin-btn"
                onClick={() => {
                  admin.setSoldBase(id, Number(value))
                  setDraft((prev) => {
                    const next = { ...prev }
                    delete next[id]
                    return next
                  })
                }}
              >
                {t('adminSave')}
              </button>
            </div>
          </section>
        )
      })}
    </div>
  )
}
