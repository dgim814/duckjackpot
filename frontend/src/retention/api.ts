import WebApp from '@twa-dev/sdk'
import { API_ORIGIN } from '../api/client'
import { telegramInitData } from '../telegram/user'

/**
 * Referral / ranking / notification client. The server identifies the player from the signed
 * Telegram initData only and decides every reward; this module never sends a user id.
 * Nothing here is awaited on the way into or out of a raid.
 */
export type InviteStatus = 'opened' | 'verified' | 'played' | 'exited' | 'rewarded'
export type InviteeView = { status: InviteStatus; channelVerified: boolean; firstRaid: boolean; firstExit: boolean; completed: boolean }
export type Grant = { id: string; coins: number; reason: 'referral_invitee' | 'referral_inviter' }
export type Rewards = { inviterCoins: number; inviteeCoins: number; stars: { available: boolean; inviter: number; invitee: number } }
export type Channel = { configured: boolean; url: string | null }
export type Session = { invitee: InviteeView | null; canWrite: boolean; muted: boolean; grants: Grant[]; rewards: Rewards; channel: Channel }
export type ReferralMe = {
  link: string | null
  code: string
  rewards: Rewards
  stats: { invited: number; subscribed: number; played: number; exited: number; rewarded: number }
  coins: { received: number; pending: number }
  invites: { name: string | null; username: string | null; status: InviteStatus; openedAt: number }[]
  invitee: InviteeView | null
  grants: Grant[]
  channel: Channel
}
export type Board = { top: { rank: number; name: string; wealth: number; me: boolean }[]; me: { rank: number | null; wealth: number } | null; players: number }

export const inTelegram = () => Boolean(telegramInitData())

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_ORIGIN}/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': telegramInitData(), ...(init.headers ?? {}) },
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw Object.assign(new Error(data.error || `http_${res.status}`), { status: res.status })
  return data
}
const post = <T>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) })

export function tg() {
  return (window as Window & { Telegram?: { WebApp?: typeof WebApp } }).Telegram?.WebApp ?? WebApp
}

// ---------- session (once per app launch, fire-and-forget) ----------
let session: Promise<Session | null> | null = null
const listeners = new Set<(s: Session) => void>()
let last: Session | null = null

/** Notification kind this launch came from (web_app button url ?n=<kind>). */
export function launchNotification() {
  try {
    const n = new URLSearchParams(window.location.search).get('n') ?? ''
    return /^[a-z_]{3,20}$/.test(n) ? n : null
  } catch {
    return null
  }
}

export function startSession(novice: boolean) {
  if (session || !inTelegram()) return session
  session = post<Session>('/me/session', { novice, n: launchNotification() })
    .then((s) => {
      last = s
      for (const l of listeners) l(s)
      return s
    })
    .catch(() => null)
  return session
}

export function onSession(cb: (s: Session) => void) {
  if (last) cb(last)
  listeners.add(cb)
  return () => void listeners.delete(cb)
}

export function patchSession(p: Partial<Session>) {
  if (!last) return
  last = { ...last, ...p }
  for (const l of listeners) l(last)
}

export const referralMe = () => api<ReferralMe>('/referral/me')
export const checkChannel = () => post<{ subscribed: boolean; status: string; invitee?: InviteeView; grants?: Grant[] }>('/referral/check-channel', {})
export const leaderboardApi = () => api<Board>('/leaderboard')
export const prepareShare = (lang: string) => post<{ id: string; url: string; text: string }>('/referral/share', { lang })
export const reportWriteAccess = (granted: boolean) => post<{ canWrite: boolean }>('/notifications/access', { granted })

/** Raid start / end → server (ranking + referral progress). Never awaited by the game. */
export function reportRaid(body: { event: 'start' | 'end'; raidId: string; level?: string; verdict?: string; loot?: number; preview?: boolean }) {
  if (!inTelegram()) return
  try {
    void fetch(`${API_ORIGIN}/api/player/raid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': telegramInitData() },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => undefined)
  } catch {
    /* offline: the raid simply does not count toward the ranking */
  }
}

/** The raid being reported (kept across PAUSE → HUB → resume, which is the same raid). */
let raidReportId: string | null = null
let raidReportAt = 0
export function reportRaidStart(level: string, preview: boolean) {
  // A double mount (StrictMode) must not replace the raid the server already opened.
  if (raidReportId && Date.now() - raidReportAt < 2000) return
  raidReportAt = Date.now()
  raidReportId = Math.random().toString(36).slice(2, 12).padEnd(8, '0')
  reportRaid({ event: 'start', raidId: raidReportId, level, preview })
}
export function reportRaidEnd(verdict: string, loot: number, preview: boolean) {
  if (!raidReportId) return
  reportRaid({ event: 'end', raidId: raidReportId, verdict, loot, preview })
  raidReportId = null
}
