import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
export const DATA_DIR = join(root, 'data')
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
