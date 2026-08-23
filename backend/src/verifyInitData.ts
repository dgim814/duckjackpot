import { createHmac } from 'node:crypto'

export type TelegramWebUser = {
  id: number
  username?: string
  firstName?: string
}

export function verifyInitData(initData: string, botToken: string): TelegramWebUser | null {
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
  if (Date.now() / 1000 - authDate > 86_400) return null

  const raw = params.get('user')
  if (!raw) return null
  try {
    const user = JSON.parse(raw) as { id?: number; username?: string; first_name?: string }
    if (typeof user.id !== 'number' || user.id <= 0) return null
    return {
      id: user.id,
      username: typeof user.username === 'string' ? user.username : undefined,
      firstName: typeof user.first_name === 'string' ? user.first_name : undefined,
    }
  } catch {
    return null
  }
}
