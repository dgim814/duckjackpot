import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import { SupportBlock } from '../components/SupportBlock'
import { UsdtRateNote } from '../components/UsdtRateNote'
import { useI18n } from '../i18n/LanguageProvider'

const LINKS = [
  { to: '/legal/user-agreement', titleKey: 'legalUserAgreement', hintKey: 'legalUserAgreementHint' },
  { to: '/legal/privacy', titleKey: 'legalPrivacy', hintKey: 'legalPrivacyHint' },
  { to: '/legal/kyc-aml', titleKey: 'legalKycAml', hintKey: 'legalKycAmlHint' },
  { to: '/legal/pre-aml', titleKey: 'legalPreAml', hintKey: 'legalPreAmlHint' },
] as const

export function TermsPage() {
  const { t } = useI18n()

  return (
    <section className="px-4 pb-6">
      <ScreenHeader title={t('legalHubTitle')} subtitle={t('legalHubLead')} />

      <div className="mt-5">
        <SupportBlock />
      </div>

      <ul className="mt-5 space-y-2">
        {LINKS.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-[#141218] px-4 py-3"
            >
              <span>
                <span className="block text-sm font-semibold text-amber-100">{t(item.titleKey)}</span>
                <span className="mt-0.5 block text-xs text-zinc-500">{t(item.hintKey)}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-zinc-500" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-5 space-y-3 rounded-2xl border border-white/8 bg-[#141218] p-4 text-sm leading-relaxed text-zinc-300">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-zinc-500">
          {t('termsShortTitle')}
        </p>
        <p>{t('termsP1')}</p>
        <p>{t('termsP2')}</p>
        <p>{t('termsP3')}</p>
        <p>{t('termsP4')}</p>
        <UsdtRateNote />
        <Link to="/agreement" className="inline-block font-semibold text-amber-300">
          {t('termsLinkOffer')}
        </Link>
      </div>
    </section>
  )
}
