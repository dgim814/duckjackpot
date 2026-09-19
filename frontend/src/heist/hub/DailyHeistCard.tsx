import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n/LanguageProvider'
import { dailyTaskKey, formatResetIn, msUntilDailyReset } from '../daily'

export function DailyHeistCard({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n()
  const [left, setLeft] = useState(() => msUntilDailyReset())

  useEffect(() => {
    const id = window.setInterval(() => setLeft(msUntilDailyReset()), 60000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <section className="mt-3 rounded-2xl border border-amber-400/30 bg-[#1a1410] px-3 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-sm font-bold text-amber-200">{t('hubDaily')}</h2>
        <span className="font-mono text-[11px] text-zinc-400">{t('hubDailyResets', { time: formatResetIn(left) })}</span>
      </div>
      <p className="mt-1.5 text-sm font-semibold text-amber-50">{t(dailyTaskKey())}</p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-2.5 min-h-11 w-full rounded-xl border border-amber-400/40 px-4 py-2.5 text-sm font-extrabold tracking-[0.12em] text-amber-100"
      >
        {t('hubDailyGo')}
      </button>
    </section>
  )
}
