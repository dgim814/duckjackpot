import type { CSSProperties } from 'react'
import { useAdmin } from './AdminProvider'
import { useI18n } from '../i18n/LanguageProvider'

const fieldStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 56,
  marginTop: 8,
  padding: '14px 16px',
  border: '2px solid #ffc107',
  borderRadius: 12,
  background: '#000',
  color: '#ffe082',
  fontSize: 16,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}

export function AdminPayWallets({ idPrefix = 'admin' }: { idPrefix?: string }) {
  const { lang } = useI18n()
  const { merchantWallet, setMerchantWallet, usdtTrc20Address, setUsdtTrc20Address } = useAdmin()
  const en = lang === 'en'

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
        {en ? 'Payment' : 'Оплата'}
      </h2>
      <p style={{ margin: '8px 0 0', color: '#c4b59a', fontSize: 13 }}>
        {en
          ? 'Receiving wallets. Saved automatically.'
          : 'Кошельки приёма. Сохраняются автоматически.'}
      </p>

      <div style={{ marginTop: 20 }}>
        <label htmlFor={`${idPrefix}-ton-wallet`} style={{ display: 'block', color: '#fff', fontSize: 16, fontWeight: 700 }}>
          {en ? 'TON / GRAM receiving wallet' : 'Кошелёк приёма TON / GRAM'}
        </label>
        <p style={{ margin: '4px 0 0', color: '#9a8f7c', fontSize: 12 }}>
          {en
            ? 'TON address (EQ…) for TON / GRAM payments via TON Connect.'
            : 'Адрес в сети TON (EQ…), на который приходит оплата TON / GRAM через TON Connect.'}
        </p>
        <input
          id={`${idPrefix}-ton-wallet`}
          data-testid={`${idPrefix}-ton-wallet`}
          type="text"
          value={merchantWallet}
          placeholder="EQ…"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setMerchantWallet(e.target.value)}
          style={fieldStyle}
        />
      </div>

      <div style={{ marginTop: 24 }}>
        <label htmlFor={`${idPrefix}-usdt-trc20`} style={{ display: 'block', color: '#fff', fontSize: 16, fontWeight: 700 }}>
          {en ? 'USDT (TRC-20) receiving wallet' : 'Кошелёк приёма USDT (TRC-20)'}
        </label>
        <p style={{ margin: '4px 0 0', color: '#9a8f7c', fontSize: 12 }}>
          {en
            ? 'TRON address starting with T. This is the primary USDT payment address.'
            : 'Адрес в сети TRON, начинается с T. Это основной адрес для оплаты USDT.'}
        </p>
        <input
          id={`${idPrefix}-usdt-trc20`}
          data-testid={`${idPrefix}-usdt-trc20`}
          type="text"
          value={usdtTrc20Address}
          placeholder="T…"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setUsdtTrc20Address(e.target.value)}
          style={fieldStyle}
        />
      </div>
    </section>
  )
}
