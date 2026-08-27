import { useEffect, useState, type CSSProperties } from 'react'
import { ADMIN_PASSWORD, isTonPayAddress, isTronPayAddress } from '../constants'
import { api } from '../api/client'
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
  merchantWallet?: string
  usdtTrc20Address?: string
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
    setTon(typeof data.merchantWallet === 'string' ? data.merchantWallet : '')
    setUsdt(typeof data.usdtTrc20Address === 'string' ? data.usdtTrc20Address : '')
  }

  useEffect(() => {
    let cancelled = false
    void api
      .get<WalletPayload>('/admin/wallets', { headers })
      .then(({ data }) => {
        if (cancelled) return
        applyLoaded(data)
        applyPayWallets({
          merchantWallet: data.merchantWallet ?? '',
          usdtTrc20Address: data.usdtTrc20Address ?? '',
        })
      })
      .catch(() => {
        void api
          .get<WalletPayload>('/wallets')
          .then(({ data }) => {
            if (cancelled) return
            applyLoaded(data)
          })
          .catch(() => undefined)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = async () => {
    const merchantWallet = ton.trim()
    const usdtTrc20Address = usdt.trim()
    if (usdtTrc20Address && !isTronPayAddress(usdtTrc20Address)) {
      setError(t('adminUsdtInvalid'))
      setSaved(false)
      return
    }
    if (merchantWallet && !isTonPayAddress(merchantWallet)) {
      setError(t('adminTonInvalid'))
      setSaved(false)
      return
    }
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const { data } = await api.post<WalletPayload>('/admin/wallets', { merchantWallet, usdtTrc20Address }, { headers })
      const next = {
        merchantWallet: data.merchantWallet ?? merchantWallet,
        usdtTrc20Address: data.usdtTrc20Address ?? usdtTrc20Address,
      }
      applyLoaded(next)
      applyPayWallets(next)
      setSaved(true)
    } catch {
      setError(t('adminWalletsSaveError'))
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
      {error ? <p style={{ margin: '10px 0 0', color: '#ff8a65', fontSize: 13 }}>{error}</p> : null}
    </section>
  )
}
