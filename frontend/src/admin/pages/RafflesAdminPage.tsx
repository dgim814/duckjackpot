import { useState } from 'react'
import { isAxiosError } from 'axios'
import { useAdmin } from '../AdminProvider'
import { AdminDrawCard, useAdminDraws } from '../AdminDrawCard'
import { useCards } from '../../cards/CardsProvider'
import { formatApiError } from '../../api/client'
import { RAFFLE_ORDER, RAFFLES, type RaffleId } from '../../constants'
import { useI18n } from '../../i18n/LanguageProvider'
import { RAFFLE_TITLE_KEY } from '../../i18n/raffleLabels'

export function RafflesAdminPage() {
  const { t } = useI18n()
  const admin = useAdmin()
  const { archiveRaffleCards } = useCards()
  const { draws, setDraws, load: loadDraws } = useAdminDraws()
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState<Record<string, string>>({})
  const [saveOk, setSaveOk] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  return (
    <div className="relative z-10 space-y-3">
      {RAFFLE_ORDER.map((id) => {
        const raffle = RAFFLES[id]
        const runtime = admin.raffles[id]
        const value = draft[id] ?? String(runtime.soldBase)
        const sold = runtime.soldBase
        const canDraw = sold >= raffle.total && runtime.status !== 'drawn'
        return (
          <section key={id} className="relative z-10 rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-zinc-100">{t(RAFFLE_TITLE_KEY[id])}</h2>
              <span
                className={[
                  'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                  runtime.status === 'running'
                    ? 'bg-emerald-400/15 text-emerald-300'
                    : runtime.status === 'awaiting_draw'
                      ? 'bg-amber-400/15 text-amber-200'
                      : runtime.status === 'drawn'
                        ? 'bg-sky-400/15 text-sky-200'
                        : 'bg-zinc-700 text-zinc-300',
                ].join(' ')}
              >
                {runtime.status === 'running'
                  ? t('adminRunning')
                  : runtime.status === 'awaiting_draw'
                    ? t('adminAwaitingDraw')
                    : runtime.status === 'drawn'
                      ? t('adminDrawn')
                      : t('adminStopped')}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {raffle.priceRub} ₽ · {sold} / {raffle.total} {t('adminCardsUnit')}
            </p>
            <div className="relative z-20 mt-3 flex flex-wrap gap-2">
              <button type="button" className="admin-btn" onClick={() => admin.setStatus(id, 'running')}>
                {t('adminStart')}
              </button>
              <button type="button" className="admin-btn" onClick={() => admin.setStatus(id, 'stopped')}>
                {t('adminStop')}
              </button>
              <DrawButton raffleId={id} enabled={canDraw} sold={sold} total={raffle.total} onDrawn={() => void loadDraws()} />
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={() => {
                  if (!window.confirm(t('adminResetConfirm'))) return
                  setSaveError((prev) => ({ ...prev, [id]: '' }))
                  void admin
                    .resetRaffle(id)
                    .then(() => {
                      archiveRaffleCards(id)
                    })
                    .catch((err: unknown) => {
                      setSaveError((prev) => ({ ...prev, [id]: formatApiError(err) }))
                    })
                }}
              >
                {t('adminReset')}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">{t('adminDrawHint')}</p>
            <label className="mt-4 block text-xs text-zinc-500">{t('adminSoldEdit')}</label>
            <div className="relative z-20 mt-1 flex gap-2">
              <input
                type="number"
                min={0}
                max={raffle.total}
                value={value}
                onChange={(e) => {
                  setDraft((prev) => ({ ...prev, [id]: e.target.value }))
                  setSaveOk((prev) => ({ ...prev, [id]: false }))
                }}
                className="w-28 rounded-lg border border-white/10 bg-black/40 px-2 py-2 font-mono text-sm text-zinc-100"
              />
              <button
                type="button"
                className="admin-btn"
                disabled={Boolean(saving[id])}
                onClick={() => {
                  setSaving((prev) => ({ ...prev, [id]: true }))
                  setSaveError((prev) => ({ ...prev, [id]: '' }))
                  void admin
                    .setSoldBase(id, Number(value))
                    .then(() => {
                      setDraft((prev) => {
                        const next = { ...prev }
                        delete next[id]
                        return next
                      })
                      setSaveOk((prev) => ({ ...prev, [id]: true }))
                    })
                    .catch((err: unknown) => {
                      setSaveError((prev) => ({ ...prev, [id]: formatApiError(err) }))
                      setSaveOk((prev) => ({ ...prev, [id]: false }))
                    })
                    .finally(() => setSaving((prev) => ({ ...prev, [id]: false })))
                }}
              >
                {saving[id] ? '…' : t('adminSave')}
              </button>
            </div>
            {saveOk[id] ? <p className="mt-1 text-[11px] text-emerald-300">{t('adminSoldSaved')}</p> : null}
            {saveError[id] ? <p className="mt-1 text-[11px] text-orange-400">{saveError[id]}</p> : null}
            {(() => {
              const records = draws.filter((draw) => draw.kind === 'collection' && draw.raffleId === id)
              if (!records.length) return null
              return (
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{t('adminDrawRecords')}</p>
                  {records.map((draw) => (
                    <AdminDrawCard key={draw.id} draw={draw} onChanged={setDraws} />
                  ))}
                </div>
              )
            })()}
          </section>
        )
      })}
    </div>
  )
}

function DrawButton({
  raffleId,
  enabled,
  sold,
  total,
  onDrawn,
}: {
  raffleId: RaffleId
  enabled: boolean
  sold: number
  total: number
  onDrawn?: () => void
}) {
  const { t } = useI18n()
  const { drawRaffle } = useAdmin()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        className="admin-btn"
        disabled={busy || !enabled}
        onClick={() => {
          const testLaunch = sold >= total
          const ok = window.confirm(testLaunch ? t('adminDrawTestWarn') : t('adminDrawConfirm'))
          if (!ok) return
          setBusy(true)
          setError(null)
          void drawRaffle(raffleId)
            .then((result) => {
              if (!result.winners.length) setError(t('adminDrawNoCards'))
              onDrawn?.()
            })
            .catch((err: unknown) => {
              const code = isAxiosError(err) ? String(err.response?.data?.error ?? '') : ''
              if (code === 'not_sold_out') setError(t('adminDrawNotSold'))
              else if (code === 'already_drawn') setError(t('adminDrawAlready'))
              else if (code === 'no_tickets') setError(t('adminDrawNoCards'))
              else setError(formatApiError(err) || t('adminDrawError'))
            })
            .finally(() => setBusy(false))
        }}
      >
        {busy ? '…' : t('adminDraw')}
      </button>
      {!enabled && sold < total ? (
        <span className="text-[11px] text-zinc-500">{t('adminDrawNeedSold', { sold: String(sold), total: String(total) })}</span>
      ) : null}
      {error ? <span className="text-[11px] text-orange-400">{error}</span> : null}
    </span>
  )
}
