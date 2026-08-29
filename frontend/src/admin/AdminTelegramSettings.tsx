import { useEffect, useState, type CSSProperties } from 'react'
import { api } from '../api/client'
import { adminHeaders } from './adminApi'
import { useI18n } from '../i18n/LanguageProvider'

type TelegramStatus = {
  configured: boolean
  tokenMasked: string
  webappUrl: string
  botUsername: string | null
}

const fieldStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 52,
  marginTop: 8,
  padding: '12px 16px',
  border: '2px solid #ffc107',
  borderRadius: 12,
  background: '#000',
  color: '#ffe082',
  fontSize: 16,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}

export function AdminTelegramSettings() {
  const { lang } = useI18n()
  const en = lang === 'en'
  const [token, setToken] = useState('')
  const [webappUrl, setWebappUrl] = useState('')
  const [status, setStatus] = useState<TelegramStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const headers = adminHeaders

  const load = async () => {
    try {
      const { data } = await api.get<TelegramStatus>('/admin/telegram', { headers })
      setStatus(data)
      if (!webappUrl && data.webappUrl) setWebappUrl(data.webappUrl)
    } catch {
      setStatus(null)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const { data } = await api.post<TelegramStatus>(
        '/admin/telegram',
        {
          webappUrl,
          ...(token.trim() ? { token: token.trim() } : {}),
        },
        { headers },
      )
      setStatus(data)
      setToken('')
    } catch {
      setError(en ? 'Could not save. Is the API running?' : 'Не удалось сохранить. Запущен ли backend?')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      style={{
        marginBottom: 20,
        padding: 16,
        border: '2px solid #ffc107',
        borderRadius: 16,
        background: '#1c1814',
      }}
    >
      <h2 style={{ margin: 0, color: '#ffc107', fontSize: 20, fontWeight: 800 }}>Telegram-бот</h2>
      <p style={{ margin: '8px 0 0', color: '#c4b59a', fontSize: 13 }}>
        {en
          ? 'Paste the bot token here or in backend/.env as TELEGRAM_BOT_TOKEN. Mini App URL must be HTTPS (except local Telegram testing).'
          : 'Вставьте токен бота сюда или в backend/.env (TELEGRAM_BOT_TOKEN). URL Mini App должен быть HTTPS (кроме локальных тестов Telegram).'}
      </p>
      {status?.configured ? (
        <p style={{ margin: '10px 0 0', color: '#ffe082', fontSize: 13 }}>
          {status.botUsername ? `@${status.botUsername}` : en ? 'Token saved' : 'Токен задан'}
          {status.tokenMasked ? ` · ${status.tokenMasked}` : ''}
        </p>
      ) : (
        <p style={{ margin: '10px 0 0', color: '#9a8f7c', fontSize: 13 }}>
          {en ? 'Bot is not configured yet.' : 'Бот пока не настроен.'}
        </p>
      )}

      <label htmlFor="admin-bot-token" style={{ display: 'block', marginTop: 20, color: '#fff', fontWeight: 700 }}>
        {en ? 'Bot token' : 'Токен бота'}
      </label>
      <input
        id="admin-bot-token"
        type="password"
        autoComplete="off"
        value={token}
        placeholder={status?.tokenMasked || '123456:ABC…'}
        onChange={(e) => setToken(e.target.value)}
        style={fieldStyle}
      />

      <label htmlFor="admin-webapp-url" style={{ display: 'block', marginTop: 20, color: '#fff', fontWeight: 700 }}>
        {en ? 'Mini App URL' : 'URL Mini App'}
      </label>
      <p style={{ margin: '4px 0 0', color: '#9a8f7c', fontSize: 12 }}>
        {en
          ? 'Public HTTPS URL of the frontend, e.g. https://your-domain.com'
          : 'Публичный HTTPS-адрес фронтенда, например https://your-domain.com'}
      </p>
      <input
        id="admin-webapp-url"
        type="url"
        autoComplete="off"
        value={webappUrl}
        placeholder="https://…"
        onChange={(e) => setWebappUrl(e.target.value)}
        style={fieldStyle}
      />

      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="admin-btn"
        style={{ marginTop: 16 }}
      >
        {busy ? (en ? 'Saving…' : 'Сохранение…') : en ? 'Save and start bot' : 'Сохранить и запустить бота'}
      </button>
      {error ? <p style={{ margin: '10px 0 0', color: '#ff8a65', fontSize: 13 }}>{error}</p> : null}
    </section>
  )
}
