import { useEffect, useState, type CSSProperties } from 'react'
import { ADMIN_PASSWORD, isTonPayAddress, isTronPayAddress } from '../constants'
import { api, formatApiError } from '../api/client'
import { useAdmin } from './AdminProvider'
import { useI18n } from '../i18n/LanguageProvider'

const fieldStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 72,
  marginTop: 8,
  padding: '14px 16px',
  border: '2px solid #ffc107',
  borderRadius: 12,
  background: '#000',
  color: '#ffe082',
  fontSize: 16,
  lineHeight: 1.4,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  wordBreak: 'break-all',
  overflowWrap: 'anywhere',
  resize: 'vertical',
}

type WalletPayload = {
  tonAddress?: string
  merchantWallet?: string
  usdtTrc20Address?: string
}

function fromPayload(data: WalletPayload) {
  const tonAddress = (data.tonAddress ?? data.merchantWallet ?? '').trim()
  const usdtTrc20Address = (data.usdtTrc20Address ?? '').trim()
  return { tonAddress, usdtTrc20Address, merchantWallet: tonAddress }
}

export function AdminPayWallets({ idPrefix = 'admin' }: { idPrefix?: string }) {
  const { t, lang } = useI18n()
  const { applyPayWallets } = useAdmin()
  const en = lang === 'en'
  const [ton, setTon] = useState('')
  const [usdt, setUsdt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const headers = { 'x-admin-password': ADMIN_PASSWORD }

  const applyLoaded = (data: WalletPayload) => {
    const next = fromPayload(data)
    setTon(next.tonAddress)
    setUsdt(next.usdtTrc20Address)
    return next
  }

  useEffect(() => {
    let cancelled = false
    void api
      .get<WalletPayload>('/admin/wallets', { headers })
      .then(({ data }) => {
        if (cancelled) return
        applyPayWallets(applyLoaded(data))
      })
      .catch((err: unknown) => {
        void api
          .get<WalletPayload>('/wallets')
          .then(({ data }) => {
            if (cancelled) return
            applyPayWallets(applyLoaded(data))
          })
          .catch(() => {
            if (!cancelled) setError(formatApiError(err))
          })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = async () => {
    const tonAddress = ton.trim()
    const usdtTrc20Address = usdt.trim()
    if (usdtTrc20Address && !isTronPayAddress(usdtTrc20Address)) {
      setError(t('adminUsdtInvalid'))
      setSaved(false)
      return
    }
    if (tonAddress && !isTonPayAddress(tonAddress)) {
      setError(t('adminTonInvalid'))
      setSaved(false)
      return
    }
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const { data } = await api.put<WalletPayload>(
        '/admin/wallets',
        { tonAddress, usdtTrc20Address },
        { headers },
      )
      applyPayWallets(applyLoaded(data))
      setSaved(true)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      id={`${idPrefix}-pay-wallets`}
      style={{
        display: 'block',
        marginBottom: 20,
        padding: 16,
        border: '2px solid #ffc107',
        borderRadius: 16,
        background: '#1c1814',
      }}
    >
      <h2
        style={{
          margin: 0,
          color: '#ffc107',
          fontSize: 20,
          fontWeight: 800,
        }}
      >
        {t('adminWalletsTitle')}
      </h2>
      <p style={{ margin: '8px 0 0', color: '#c4b59a', fontSize: 13 }}>{t('adminWalletsHint')}</p>

      <div style={{ marginTop: 20 }}>
        <label htmlFor={`${idPrefix}-ton-wallet`} style={{ display: 'block', color: '#fff', fontSize: 16, fontWeight: 700 }}>
          {t('adminMerchant')}
        </label>
        <p style={{ margin: '4px 0 0', color: '#9a8f7c', fontSize: 12 }}>{t('adminMerchantHint')}</p>
        <textarea
          id={`${idPrefix}-ton-wallet`}
          data-testid={`${idPrefix}-ton-wallet`}
          value={ton}
          rows={2}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(e) => {
            setSaved(false)
            setTon(e.target.value)
          }}
          style={fieldStyle}
        />
      </div>

      <div style={{ marginTop: 24 }}>
        <label htmlFor={`${idPrefix}-usdt-trc20`} style={{ display: 'block', color: '#fff', fontSize: 16, fontWeight: 700 }}>
          {t('adminMerchantUsdt')}
        </label>
        <p style={{ margin: '4px 0 0', color: '#9a8f7c', fontSize: 12 }}>{t('adminMerchantUsdtHint')}</p>
        <textarea
          id={`${idPrefix}-usdt-trc20`}
          data-testid={`${idPrefix}-usdt-trc20`}
          value={usdt}
          rows={2}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(e) => {
            setSaved(false)
            setUsdt(e.target.value)
          }}
          style={fieldStyle}
        />
      </div>

      <button type="button" disabled={busy} onClick={() => void save()} className="admin-btn" style={{ marginTop: 16 }}>
        {busy ? (en ? 'Saving…' : 'Сохранение…') : t('adminSave')}
      </button>
      {saved ? <p style={{ margin: '10px 0 0', color: '#c8e6c9', fontSize: 13 }}>{t('adminWalletSaved')}</p> : null}
      {error ? (
        <p style={{ margin: '10px 0 0', color: '#ff8a65', fontSize: 13, wordBreak: 'break-all' }}>{error}</p>
      ) : null}
    </section>
  )
}
