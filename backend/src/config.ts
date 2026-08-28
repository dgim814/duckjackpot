import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

function resolveDataDir() {
  const fromEnv = (process.env.DATA_DIR ?? process.env.RAILWAY_VOLUME_MOUNT_PATH ?? '').trim()
  if (fromEnv) {
    mkdirSync(fromEnv, { recursive: true })
    return resolve(fromEnv)
  }
  if (existsSync('/data')) return '/data'
  return join(backendRoot, 'data')
}

export const DATA_DIR = resolveDataDir()
mkdirSync(DATA_DIR, { recursive: true })

const SETTINGS_FILE = join(DATA_DIR, 'telegram.json')

export type TelegramSettings = {
  token: string
  webappUrl: string
}

function readFileSettings(): Partial<TelegramSettings> {
  try {
    if (!existsSync(SETTINGS_FILE)) return {}
    const parsed = JSON.parse(readFileSync(SETTINGS_FILE, 'utf8')) as Partial<TelegramSettings>
    return {
      token: typeof parsed.token === 'string' ? parsed.token.trim() : '',
      webappUrl: typeof parsed.webappUrl === 'string' ? parsed.webappUrl.trim() : '',
    }
  } catch {
    return {}
  }
}

export function getTelegramSettings(): TelegramSettings {
  const file = readFileSettings()
  return {
    token: file.token || (process.env.TELEGRAM_BOT_TOKEN ?? '').trim(),
    webappUrl: file.webappUrl || (process.env.TELEGRAM_WEBAPP_URL ?? '').trim(),
  }
}

export function saveTelegramSettings(patch: Partial<TelegramSettings>) {
  mkdirSync(DATA_DIR, { recursive: true })
  const current = getTelegramSettings()
  const next: TelegramSettings = {
    token: (patch.token ?? current.token).trim(),
    webappUrl: (patch.webappUrl ?? current.webappUrl).trim(),
  }
  writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2))
  return next
}

export function adminPassword() {
  return (process.env.ADMIN_PASSWORD ?? 'duckadmin2026').trim()
}

export function maskToken(token: string) {
  if (!token) return ''
  if (token.length < 12) return '••••'
  return `${token.slice(0, 6)}…${token.slice(-4)}`
}

export function supportBotToken() {
  return (process.env.SUPPORT_BOT_TOKEN ?? '').trim()
}

export function adminTelegramId() {
  const raw = (process.env.ADMIN_TELEGRAM_ID ?? '').trim()
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : 0
}

export function supportBotWebhookUrl() {
  const explicit = (process.env.SUPPORT_BOT_WEBHOOK_URL ?? '').trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const domain = (process.env.RAILWAY_PUBLIC_DOMAIN ?? '').trim()
  if (domain) return `https://${domain.replace(/^https?:\/\//, '')}/api/support-bot/webhook`
  return ''
}

export function supportBotWebhookSecret() {
  return (process.env.SUPPORT_BOT_WEBHOOK_SECRET ?? '').trim()
}
