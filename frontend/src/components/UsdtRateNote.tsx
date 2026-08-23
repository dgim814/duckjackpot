import { useUsdtRate } from '../hooks/useUsdtRate'
import { useI18n } from '../i18n/LanguageProvider'

export function UsdtRateNote() {
  const { t, lang } = useI18n()
  const { rate, source, status } = useUsdtRate()
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  const shown = rate.toLocaleString(locale, { maximumFractionDigits: 2 })
  const sourceLabel =
    source === 'manual' ? t('rateSourceManual') : source === 'live' ? t('rateSourceLive') : t('rateSourceFallback')

  return (
    <p className="mt-3 text-[11px] text-zinc-500">
      {t('usdtRatePrefix')} {shown} {t('usdtRateSuffix')}
      <span className="text-zinc-600"> · {status === 'loading' ? t('rateLoading') : sourceLabel}</span>
    </p>
  )
}
