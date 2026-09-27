import { createHmac } from 'node:crypto'

export type TelegramWebUser = {
  id: number
  username?: string
  firstName?: string
  /** Signed start_param of the launch link (t.me/<bot>?startapp=…), if any. */
  startParam?: string
  /** Signed: the user allows the bot to message them. */
  allowsWriteToPm?: boolean
  languageCode?: string
}

export function verifyInitData(initData: string, botToken: string, maxAgeS = 86_400): TelegramWebUser | null {
  if (!initData || !botToken) return null
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null
  params.delete('hash')
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const check = createHmac('sha256', secret).update(dataCheckString).digest('hex')
  if (check !== hash) return null

  const authDate = Number(params.get('auth_date') ?? 0)
  if (!Number.isFinite(authDate) || authDate <= 0) return null
  if (Date.now() / 1000 - authDate > maxAgeS) return null

  const raw = params.get('user')
  if (!raw) return null
  try {
    const user = JSON.parse(raw) as { id?: number; username?: string; first_name?: string; allows_write_to_pm?: boolean; language_code?: string }
    if (typeof user.id !== 'number' || user.id <= 0) return null
    const startParam = params.get('start_param')
    return {
      id: user.id,
      username: typeof user.username === 'string' ? user.username : undefined,
      firstName: typeof user.first_name === 'string' ? user.first_name : undefined,
      startParam: startParam && /^[A-Za-z0-9_-]{1,64}$/.test(startParam) ? startParam : undefined,
      allowsWriteToPm: user.allows_write_to_pm === true,
      languageCode: typeof user.language_code === 'string' ? user.language_code.slice(0, 8) : undefined,
    }
  } catch {
    return null
  }
}
