import { Link } from 'react-router-dom'
import { TonConnectButton } from '@tonconnect/ui-react'
import WebApp from '@twa-dev/sdk'
import { User } from 'lucide-react'
import { ScreenHeader } from '../components/ScreenHeader'
import { useAgreement } from '../i18n/AgreementProvider'
import { useI18n } from '../i18n/LanguageProvider'

export function ProfilePage() {
  const { t } = useI18n()
  const { accepted, reset } = useAgreement()
  const user = WebApp.initDataUnsafe.user
  const name = user?.first_name
    ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`
    : t('profileGuest')

  return (
    <section className="px-4 pb-6">
      <ScreenHeader title={t('profileTitle')} />

      <div className="mt-5 rounded-2xl border border-white/8 bg-[#141218] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
            <User size={22} />
          </div>
          <div>
            <p className="font-semibold">{name}</p>
            <p className="text-sm text-zinc-500">
              {user?.username ? `@${user.username}` : t('profileOpenInTelegram')}
            </p>
            {user?.id ? (
              <p className="mt-1 font-mono text-[11px] text-zinc-500">ID {user.id}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-[#141218] p-5">
        <p className="mb-1 text-sm font-semibold text-zinc-300">{t('profileWallet')}</p>
        <p className="mb-3 text-xs text-zinc-500">{t('profileWalletHint')}</p>
        <div className="flex justify-center">
          <TonConnectButton />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-[#141218] p-2">
        <Link
          to="/terms"
          className="block rounded-xl px-3 py-3 text-sm font-semibold text-amber-200"
        >
          {t('legalHubTitle')}
        </Link>
        <Link to="/legal/user-agreement" className="block rounded-xl px-3 py-2 text-sm text-zinc-400">
          {t('legalUserAgreement')}
        </Link>
        <Link to="/legal/privacy" className="block rounded-xl px-3 py-2 text-sm text-zinc-400">
          {t('legalPrivacy')}
        </Link>
        <Link to="/legal/kyc-aml" className="block rounded-xl px-3 py-2 text-sm text-zinc-400">
          {t('legalKycAml')}
        </Link>
        <Link to="/legal/pre-aml" className="block rounded-xl px-3 py-2 text-sm text-zinc-400">
          {t('legalPreAml')}
        </Link>
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-[#141218] p-5 text-sm text-zinc-400">
        <p>
          {t('profileAgreementAccepted')}:{' '}
          <span className="font-semibold text-amber-300">{accepted ? '✓' : '—'}</span>
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-3 text-left text-xs text-zinc-500 underline decoration-zinc-600"
        >
          {t('profileResetAgreement')}
        </button>
        <Link
          to="/admin"
          className="mt-4 inline-block text-[10px] uppercase tracking-[0.16em] text-zinc-600"
        >
          {t('profileAdmin')}
        </Link>
      </div>
    </section>
  )
}
