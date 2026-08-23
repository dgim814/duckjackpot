import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import { useAgreement } from '../i18n/AgreementProvider'
import { useI18n } from '../i18n/LanguageProvider'

export function AgreementPage() {
  const { t } = useI18n()
  const { accepted, accept } = useAgreement()
  const [checked, setChecked] = useState(accepted)
  const [error, setError] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname

  const goIn = () => {
    navigate(from && from !== '/agreement' ? from : '/', { replace: true })
  }

  const onSubmit = () => {
    if (accepted) {
      goIn()
      return
    }
    if (!checked) {
      setError(true)
      return
    }
    accept()
    goIn()
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-10">
      <ScreenHeader title={t('offerTitle')} subtitle={t('offerLead')} />

      <div className="mt-5 space-y-3 rounded-2xl border border-amber-500/20 bg-[#1c1814] p-4 text-sm leading-relaxed text-zinc-300">
        <p>{t('offerBody1')}</p>
        <p>{t('offerBody2')}</p>
        <p>{t('offerBody3')}</p>
        <p>{t('offerBody4')}</p>
        <p>{t('offerBody5')}</p>
      </div>

      {accepted ? null : (
        <>
          <label className="mt-5 flex items-start gap-3 rounded-2xl border border-white/8 bg-[#141218] p-4 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                setChecked(e.target.checked)
                setError(false)
              }}
              className="mt-1 h-4 w-4 accent-amber-400"
            />
            <span>{t('offerCheck')}</span>
          </label>
          {error ? <p className="mt-2 text-xs text-orange-400">{t('offerMustCheck')}</p> : null}
        </>
      )}

      <button type="button" onClick={onSubmit} className="buy-btn mt-6 w-full rounded-2xl px-4 py-4 text-zinc-950">
        <span className="block font-display text-base font-extrabold">
          {accepted ? t('offerContinue') : t('offerAccept')}
        </span>
      </button>
    </div>
  )
}
