import { isAxiosError } from 'axios'
import { useState } from 'react'
import { CONTENT_KEYS, useAdmin } from '../AdminProvider'
import { AdminPayWallets } from '../AdminPayWallets'
import { AdminTelegramSettings } from '../AdminTelegramSettings'
import { adminHeaders } from '../adminApi'
import { api, formatApiError } from '../../api/client'
import { applyLocalGameplayReset } from '../../heist/consumeGameplayReset'
import { useUsdtRate } from '../../hooks/useUsdtRate'
import { messages } from '../../i18n/messages'
import { useI18n } from '../../i18n/LanguageProvider'
import { captureTelegramUser } from '../../telegram/user'

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
      <HuntCooldownReset />
      <PlayerGameplayReset />
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

function HuntCooldownReset() {
  const { t } = useI18n()
  const [telegramId, setTelegramId] = useState('')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
      <h2 className="text-sm font-semibold text-zinc-100">{t('adminHuntResetTitle')}</h2>
      <p className="mt-1 text-xs text-zinc-500">{t('adminHuntResetHint')}</p>
      <label className="mt-3 block text-xs text-zinc-500">{t('adminHuntTelegramId')}</label>
      <div className="mt-1 flex gap-2">
        <input
          inputMode="numeric"
          value={telegramId}
          onChange={(e) => {
            setTelegramId(e.target.value)
            setOk(false)
            setError(null)
          }}
          className="w-44 rounded-lg border border-white/10 bg-black/40 px-2 py-2 font-mono text-sm text-zinc-100"
        />
        <button
          type="button"
          className="admin-btn"
          disabled={busy}
          onClick={() => {
            const id = Number(telegramId.trim())
            if (!Number.isFinite(id) || id <= 0) {
              setError(t('adminHuntTelegramId'))
              return
            }
            setBusy(true)
            setError(null)
            void api
              .post('/admin/hunt/reset', { telegramId: id }, { headers: adminHeaders })
              .then(() => setOk(true))
              .catch((err: unknown) => setError(formatApiError(err)))
              .finally(() => setBusy(false))
          }}
        >
          {t('adminHuntReset')}
        </button>
      </div>
      {ok ? <p className="mt-2 text-[11px] text-emerald-300">{t('adminHuntResetOk')}</p> : null}
      {error ? <p className="mt-2 text-[11px] text-orange-400">{error}</p> : null}
    </section>
  )
}

function parseTelegramId(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (!/^\d+$/.test(trimmed)) return null
  const id = Number(trimmed)
  if (!Number.isFinite(id) || id <= 0) return null
  return id
}

function playerResetError(err: unknown, t: (key: 'adminPlayerResetNeedId' | 'adminPlayerResetNotFound' | 'adminPlayerResetDenied' | 'adminPlayerResetError') => string) {
  if (!isAxiosError(err)) return t('adminPlayerResetError')
  const code =
    err.response?.data && typeof err.response.data === 'object' && 'error' in err.response.data
      ? String((err.response.data as { error: unknown }).error)
      : ''
  if (code === 'invalid_telegram_id') return t('adminPlayerResetNeedId')
  if (code === 'not_found') return t('adminPlayerResetNotFound')
  if (code === 'unauthorized' || err.response?.status === 401) return t('adminPlayerResetDenied')
  return t('adminPlayerResetError')
}

function PlayerGameplayReset() {
  const { t } = useI18n()
  const [telegramId, setTelegramId] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [ok, setOk] = useState(false)
  const [already, setAlready] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedId = parseTelegramId(telegramId)

  const runReset = () => {
    if (!parsedId) {
      setConfirm(false)
      setError(t('adminPlayerResetNeedId'))
      return
    }
    setBusy(true)
    setError(null)
    setOk(false)
    setAlready(false)
    void api
      .post<{ already?: boolean; known?: boolean }>(
        '/admin/player/reset',
        { telegramId: parsedId },
        { headers: adminHeaders },
      )
      .then((res) => {
        const mine = captureTelegramUser()?.telegramId
        const local = mine === parsedId ? applyLocalGameplayReset() : null
        if (local ? local.already && res.data.already : res.data.already) {
          setAlready(true)
          return
        }
        setOk(true)
      })
      .catch((err: unknown) => setError(playerResetError(err, t)))
      .finally(() => {
        setBusy(false)
        setConfirm(false)
      })
  }

  return (
    <section className="rounded-2xl border border-red-500/25 bg-zinc-900/80 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-100">{t('adminPlayerResetTitle')}</h2>
      <p className="mt-1 text-xs text-zinc-500">{t('adminPlayerResetHint')}</p>
      <label className="mt-3 block text-xs text-zinc-500">{t('adminPlayerResetTelegramId')}</label>
      <input
        inputMode="numeric"
        value={telegramId}
        onChange={(e) => {
          setTelegramId(e.target.value)
          setOk(false)
          setAlready(false)
          setError(null)
        }}
        className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 font-mono text-sm text-zinc-100"
      />
      <button
        type="button"
        className="admin-btn mt-3 w-full border-red-500/50 bg-red-950/50 text-red-100"
        disabled={busy}
        onClick={() => {
          if (!parsedId) {
            setError(t('adminPlayerResetNeedId'))
            return
          }
          setError(null)
          setConfirm(true)
        }}
      >
        {t('adminPlayerResetAction')}
      </button>
      <p className="mt-2 text-[11px] text-amber-200/80">⚠ {t('adminPlayerResetWarn')}</p>
      {ok ? (
        <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-950/30 px-3 py-2 text-[11px] leading-relaxed text-emerald-200">
          <p className="font-semibold">{t('adminPlayerResetOk')}</p>
          <p className="mt-1 font-mono text-emerald-100/90">
            {t('adminPlayerResetDuck')}
            <br />
            {t('adminPlayerResetBag')}
            <br />
            {t('adminPlayerResetUpgrades')}
            <br />
            {t('adminPlayerResetBank')}
            <br />
            {t('adminPlayerResetMansion')}
            <br />
            {t('adminPlayerResetRank')}
            <br />
            {t('adminPlayerResetOnboarding')}
          </p>
        </div>
      ) : null}
      {already ? <p className="mt-2 text-[11px] text-amber-200">{t('adminPlayerResetAlready')}</p> : null}
      {error ? <p className="mt-2 text-[11px] text-orange-400">{error}</p> : null}

      {confirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-zinc-950 p-4 shadow-2xl">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-red-100">{t('adminPlayerResetConfirmTitle')}</h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-300">
              {t('adminPlayerResetConfirmBody', { id: parsedId ?? telegramId })}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">{t('adminPlayerResetConfirmList')}</p>
            <p className="mt-2 text-xs leading-relaxed text-amber-200/90">{t('adminPlayerResetConfirmSafe')}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" className="admin-btn flex-1" disabled={busy} onClick={() => setConfirm(false)}>
                {t('adminPlayerResetCancel')}
              </button>
              <button
                type="button"
                className="admin-btn flex-1 border-red-500/50 bg-red-950/60 text-red-100"
                disabled={busy}
                onClick={runReset}
              >
                {t('adminPlayerResetConfirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
