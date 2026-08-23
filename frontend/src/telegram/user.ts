import WebApp from '@twa-dev/sdk'
import { STORAGE_KEYS } from '../constants'

export type TelegramBuyer = {
  telegramId: number
  telegramUsername?: string
}

export function captureTelegramUser(): TelegramBuyer | undefined {
  const user = WebApp.initDataUnsafe?.user
  if (!user?.id) {
    try {
      const stored = Number(localStorage.getItem(STORAGE_KEYS.telegramId))
      if (Number.isFinite(stored) && stored > 0) {
        const username = localStorage.getItem(STORAGE_KEYS.telegramUsername) || undefined
        return { telegramId: stored, telegramUsername: username || undefined }
      }
    } catch {
      /* ignore */
    }
    return undefined
  }
  try {
    localStorage.setItem(STORAGE_KEYS.telegramId, String(user.id))
    if (user.username) localStorage.setItem(STORAGE_KEYS.telegramUsername, user.username)
  } catch {
    /* ignore */
  }
  return {
    telegramId: user.id,
    telegramUsername: user.username || undefined,
  }
}

export function telegramInitData() {
  return WebApp.initData || ''
}
