import { useI18n } from '../i18n/LanguageProvider'

export function BetaBadge() {
  const { t } = useI18n()
  return (
    <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-extrabold tracking-[0.18em] text-amber-300">
      {t('beta')}
    </span>
  )
}
