import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import { hasCompletedPreAml, writePreAml } from '../legal/preAml'
import { useI18n } from '../i18n/LanguageProvider'

type Flags = {
  age18: boolean
  ownBehalf: boolean
  notSanctioned: boolean
  lawfulSource: boolean
}

const empty: Flags = {
  age18: false,
  ownBehalf: false,
  notSanctioned: false,
  lawfulSource: false,
}

export function PreAmlPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const done = hasCompletedPreAml()
  const [flags, setFlags] = useState<Flags>(empty)
  const [error, setError] = useState(false)

  const toggle = (key: keyof Flags) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }))
    setError(false)
  }

  const submit = () => {
    if (!flags.age18 || !flags.ownBehalf || !flags.notSanctioned || !flags.lawfulSource) {
      setError(true)
      return
    }
    writePreAml({ acceptedAt: Date.now(), ...flags })
    navigate('/', { replace: true })
  }

  return (
    <section className="px-4 pb-6">
      <ScreenHeader title={t('preAmlTitle')} subtitle={t('preAmlLead')} />
      <Link to="/terms" className="mt-3 inline-block text-xs font-semibold text-amber-300">
        {t('legalBack')}
      </Link>

      <div className="mt-4 space-y-3 rounded-2xl border border-white/8 bg-[#141218] p-4 text-sm leading-relaxed text-zinc-300">
        <p>{t('preAmlP1')}</p>
        <p>{t('preAmlP2')}</p>
        <p>{t('preAmlP3')}</p>
      </div>

      {done ? (
        <p className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {t('preAmlDone')}
        </p>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            {(
              [
                ['age18', 'preAmlAge'],
                ['ownBehalf', 'preAmlBehalf'],
                ['notSanctioned', 'preAmlSanctions'],
                ['lawfulSource', 'preAmlSource'],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-start gap-3 rounded-2xl border border-white/8 bg-[#141218] p-4 text-sm text-zinc-200"
              >
                <input
                  type="checkbox"
                  checked={flags[key]}
                  onChange={() => toggle(key)}
                  className="mt-1 h-4 w-4 accent-amber-400"
                />
                <span>{t(label)}</span>
              </label>
            ))}
          </div>
          {error ? <p className="mt-2 text-xs text-orange-400">{t('preAmlMustCheck')}</p> : null}
          <button type="button" onClick={submit} className="buy-btn mt-5 w-full rounded-2xl px-4 py-3 text-zinc-950">
            <span className="font-display text-sm font-extrabold">{t('preAmlSubmit')}</span>
          </button>
        </>
      )}
    </section>
  )
}
