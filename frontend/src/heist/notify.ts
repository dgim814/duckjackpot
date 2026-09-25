import type { MessageKey } from '../i18n/messages'
import { UPGRADES, type UpgradeId } from './economy/balance'
import type { PlayerProgress } from './progress'

/**
 * Notifications, architecture-ready. Today they are shown in-app (HUB banner);
 * a Telegram bot message or a native push is a new `NotificationSink`, the
 * rules below stay the same. Nothing here sends anything off the device.
 */
export type NotificationKind = 'raidWaits' | 'nftDrop' | 'upgrade' | 'reward' | 'referral'

export type HeistNotification = { kind: NotificationKind; key: MessageKey; priority: number }

export const NOTIFICATION_TEXT: Record<NotificationKind, MessageKey> = {
  raidWaits: 'notifyRaidWaits',
  nftDrop: 'notifyNftDrop',
  upgrade: 'notifyUpgrade',
  reward: 'notifyReward',
  referral: 'notifyReferral',
}

/** A delivery channel. The in-app HUB banner is one; a Telegram bot sink can be added later. */
export interface NotificationSink {
  deliver(n: HeistNotification): void
}

const TRACKS: UpgradeId[] = ['bagLevel', 'disguiseLevel', 'shoesLevel', 'dashLevel', 'lockpickLevel', 'magnetLevel']

/** In-app rules, evaluated from the save. Highest priority first. */
export function pendingNotifications(p: PlayerProgress, ctx: { raidParked: boolean }): HeistNotification[] {
  const out: HeistNotification[] = []
  if (ctx.raidParked) out.push({ kind: 'raidWaits', key: NOTIFICATION_TEXT.raidWaits, priority: 3 })
  if (p.valuables.length > 0) out.push({ kind: 'reward', key: NOTIFICATION_TEXT.reward, priority: 2 })
  const affordable = TRACKS.some((id) => {
    const lvl = Math.max(0, Math.min(3, Math.floor(p[id] || 0)))
    if (lvl >= 3) return false
    return p.bankedDuckCoin >= UPGRADES[id].coin[lvl] || (p.stars || 0) >= UPGRADES[id].stars[lvl]
  })
  if (affordable) out.push({ kind: 'upgrade', key: NOTIFICATION_TEXT.upgrade, priority: 1 })
  return out.sort((a, b) => b.priority - a.priority)
}
