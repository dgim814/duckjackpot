import { api } from '../api/client'
import { captureTelegramUser, telegramInitData } from '../telegram/user'
import {
  isGameplayFresh,
  loadProgress,
  notifyGameplayReset,
  resetGameplayProgress,
} from './progress'

function identityBody() {
  const user = captureTelegramUser()
  return {
    initData: telegramInitData(),
    telegramId: user?.telegramId,
    telegramUsername: user?.telegramUsername,
  }
}

/** Apply a pending admin gameplay reset for the current Telegram ID. */
export async function consumePendingGameplayReset() {
  const user = captureTelegramUser()
  if (!user) return false
  try {
    const { data } = await api.post<{ pending?: boolean }>('/heist/gameplay-reset/pending', identityBody())
    if (!data.pending) return false
    if (!isGameplayFresh(loadProgress())) resetGameplayProgress()
    notifyGameplayReset()
    await api.post('/heist/gameplay-reset/consume', identityBody())
    return true
  } catch {
    return false
  }
}

export function applyLocalGameplayReset() {
  const already = isGameplayFresh(loadProgress())
  if (!already) resetGameplayProgress()
  notifyGameplayReset()
  return { already }
}
