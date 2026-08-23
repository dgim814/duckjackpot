import { CONTENT_KEYS, useAdmin } from '../AdminProvider'
import { AdminPayWallets } from '../AdminPayWallets'
import { AdminTelegramSettings } from '../AdminTelegramSettings'
import { useUsdtRate } from '../../hooks/useUsdtRate'
import { messages } from '../../i18n/messages'
import { useI18n } from '../../i18n/LanguageProvider'

export function AdminSettingsPage() {
  const { t, lang } = useI18n()
  const { rateOverride, setRateOverride, content, setContent, testPayMode, setTestPayMode } = useAdmin()
  const { rate, liveRate, source, status, refresh } = useUsdtRate()
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  const liveLabel = liveRate
    ? liveRate.toLocaleString(locale, { maximumFractionDigits: 2 })
    : status === 'loading'
      ? '…'
      : '—'

  return (
    <div className="space-y-5">
      <AdminTelegramSettings />
      <AdminPayWallets idPrefix="admin-settings" />

      <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
        <h2 className="text-sm font-semibold text-zinc-100">{t('adminPayTitle')}</h2>
        <p className="mt-1 text-xs text-zinc-500">{t('adminPayHint')}</p>
        <label className="mt-4 flex items-center gap-3 text-sm text-zinc-200">
          <input
            type="checkbox"
            checked={testPayMode}
            onChange={(e) => setTestPayMode(e.target.checked)}
            className="h-4 w-4 accent-amber-400"
          />
          {t('adminTestPay')}
        </label>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
        <h2 className="text-sm font-semibold text-zinc-100">{t('adminRateTitle')}</h2>
        <p className="mt-1 text-xs text-zinc-500">{t('adminRateHint')}</p>
        <p className="mt-3 text-sm text-zinc-300">
          {t('adminRateLive')}: <span className="font-mono text-amber-200">{liveLabel}</span> ₽
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {t('adminRateActive')}: {rate.toLocaleString(locale, { maximumFractionDigits: 2 })} ₽ ·{' '}
          {source === 'manual' ? t('rateSourceManual') : source === 'live' ? t('rateSourceLive') : t('rateSourceFallback')}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-zinc-400">1 USDT ≈</span>
          <input
            type="number"
            min={1}
            step={0.01}
            value={rateOverride ?? ''}
            placeholder={liveLabel === '—' || liveLabel === '…' ? String(rate) : liveLabel}
            onChange={(e) => {
              const value = e.target.value
              if (value === '') setRateOverride(null)
              else setRateOverride(Number(value))
            }}
            className="w-28 rounded-lg border border-white/10 bg-black/40 px-2 py-2 font-mono text-sm text-zinc-100"
          />
          <span className="text-sm text-zinc-400">₽</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="admin-btn" onClick={() => setRateOverride(null)}>
            {t('adminRateAuto')}
          </button>
          <button type="button" className="admin-btn" onClick={() => refresh()}>
            {t('adminRateRefresh')}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
        <h2 className="text-sm font-semibold text-zinc-100">{t('adminTextsTitle')}</h2>
        <p className="mt-1 text-xs text-zinc-500">{t('adminTextsHint')}</p>
        <div className="mt-4 space-y-4">
          {CONTENT_KEYS.map((key) => {
            const fallback = messages[lang][key]
            const value = content[lang]?.[key] ?? fallback
            return (
              <label key={key} className="block">
                <span className="text-[11px] font-mono text-zinc-500">{key}</span>
                <textarea
                  value={value}
                  rows={3}
                  onChange={(e) => setContent(lang, key, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm leading-relaxed text-zinc-100"
                />
              </label>
            )
          })}
        </div>
      </section>
    </div>
  )
}
