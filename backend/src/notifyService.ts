import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { recordEvents } from './analyticsStore.js'
import { DATA_DIR } from './config.js'
import { sendRetentionMessage, type SendResult } from './bot.js'
import { DAILY_REWARD, DAILY_REWARD_MS, dailyUsers } from './dailyRewardStore.js'
import { allState, INVITEE_COINS, INVITER_COINS, leaderboard, markWriteBlocked, STARS_PAYOUT_BLOCK, STARS_PER_REFERRAL, updateNotif, type Player, type StarsAccrual } from './retentionStore.js'

/**
 * Telegram bot notifications, never spam:
 *  - only players who allow the bot to write (signed allows_write_to_pm / requestWriteAccess),
 *    not muted, not blocked (a 403 stops it until they open the app again);
 *  - reminders ("retention") at most once per RETENTION_GAP per player, never while they are
 *    active (seen in the last ACTIVE_MS), never at night (Moscow time by default);
 *  - each kind has its own rule: daily once per reward cycle, overtaken only on a real drop in
 *    the server ranking and at most daily, raid return only after a long absence.
 * Event messages (a referral completed) go once, when it happens.
 * Nothing is sent unless NOTIFICATIONS_ENABLED=1; otherwise every decision is only logged (dry run).
 */
const H = 3_600_000
export const RETENTION_GAP = 20 * H
export const ACTIVE_MS = 2 * H
const RAID_RETURN_AFTER = 48 * H
const RAID_RETURN_COOLDOWN = 72 * H
const OVERTAKEN_COOLDOWN = 24 * H
const LEADER_COOLDOWN = 7 * 24 * H
const INVITE_NUDGE_COOLDOWN = 14 * 24 * H
const BOARD_WATCH = 50

export type NotifKind = 'daily' | 'overtaken' | 'leader' | 'raid_return' | 'invite' | 'referral_inviter' | 'referral_invitee'

/**
 * On/off: NOTIFICATIONS_ENABLED=1 / 0 in the environment wins; otherwise the admin switch
 * (DATA_DIR/retention/notify.json), off by default.
 */
const SETTINGS = join(DATA_DIR, 'retention', 'notify.json')
function adminSwitch() {
  try {
    return existsSync(SETTINGS) && (JSON.parse(readFileSync(SETTINGS, 'utf8')) as { enabled?: boolean }).enabled === true
  } catch {
    return false
  }
}
export function notifySource(): 'env' | 'admin' {
  const env = (process.env.NOTIFICATIONS_ENABLED ?? '').trim()
  return env === '1' || env === '0' ? 'env' : 'admin'
}
const enabled = () => {
  const env = (process.env.NOTIFICATIONS_ENABLED ?? '').trim()
  if (env === '1') return true
  if (env === '0') return false
  return adminSwitch()
}
export function setNotificationsEnabled(on: boolean) {
  mkdirSync(join(DATA_DIR, 'retention'), { recursive: true })
  writeFileSync(SETTINGS, JSON.stringify({ enabled: on, at: Date.now() }))
  return enabled()
}
const dryLog: { t: number; to: number; kind: NotifKind; result: string }[] = []
export function notifyLog() {
  return { enabled: enabled(), source: notifySource(), recent: dryLog.slice(-100) }
}

const TEXT: Record<NotifKind, Record<'ru' | 'en', { text: string; button: string }>> = {
  daily: {
    ru: { text: `🎁 НЕ ЗАБУДЬ ЗАБРАТЬ НАГРАДУ\n\nТвои +${DAILY_REWARD} DUCK COIN уже ждут тебя.`, button: '🎁 ЗАБРАТЬ НАГРАДУ' },
    en: { text: `🎁 DON'T FORGET YOUR REWARD\n\nYour +${DAILY_REWARD} DUCK COIN are waiting for you.`, button: '🎁 CLAIM REWARD' },
  },
  overtaken: {
    ru: { text: '🔔 DUCKJACKPOT\n\n💰 ТЕБЯ ОБОГНАЛИ\n\nДругой вор накопил больше DUCK COIN.\nВернись и попробуй вернуть своё место.', button: '🏆 МОЙ РЕЙТИНГ' },
    en: { text: '🔔 DUCKJACKPOT\n\n💰 YOU WERE OVERTAKEN\n\nAnother thief now has more DUCK COIN.\nCome back and take your place back.', button: '🏆 MY RANK' },
  },
  leader: {
    ru: { text: '🔔 DUCKJACKPOT\n\n🏆 ТЫ ВПЕРЕДИ\n\nТы сейчас один из самых богатых воров DuckJackpot.\nСколько ещё сможешь украсть?', button: '🦆 ИГРАТЬ' },
    en: { text: "🔔 DUCKJACKPOT\n\n🏆 YOU'RE AHEAD\n\nYou are one of the richest thieves in DuckJackpot.\nHow much more can you steal?", button: '🦆 PLAY' },
  },
  raid_return: {
    ru: { text: '🔔 DUCKJACKPOT\n\n🦆 ПОРА НА ОГРАБЛЕНИЕ\n\nBANK ждёт.\nСколько DUCK COIN ты сможешь вынести сегодня?', button: '🦆 ИГРАТЬ' },
    en: { text: '🔔 DUCKJACKPOT\n\n🦆 TIME FOR A HEIST\n\nThe BANK is waiting.\nHow much DUCK COIN can you carry out today?', button: '🦆 PLAY' },
  },
  invite: {
    ru: { text: `🔔 DUCKJACKPOT\n\n👥 ПРИГЛАСИ ДРУГА\n\nДруг получит 🪙 ${INVITEE_COINS} DUCK COIN,\nа ты — 🪙 ${INVITER_COINS} DUCK COIN.`, button: '👥 ПРИГЛАСИТЬ' },
    en: { text: `🔔 DUCKJACKPOT\n\n👥 INVITE A FRIEND\n\nYour friend gets 🪙 ${INVITEE_COINS} DUCK COIN,\nand you get 🪙 ${INVITER_COINS} DUCK COIN.`, button: '👥 INVITE' },
  },
  referral_inviter: {
    ru: { text: `🎉 ДРУГ ВЫПОЛНИЛ МИССИЮ!\n\nТы получил ⭐${STARS_PER_REFERRAL} к реферальной награде.\n🪙 +${INVITER_COINS} DUCK COIN`, button: '🎁 ОТКРЫТЬ' },
    en: { text: `🎉 YOUR FRIEND COMPLETED THE MISSION!\n\nYou got ⭐${STARS_PER_REFERRAL} toward your referral reward.\n🪙 +${INVITER_COINS} DUCK COIN`, button: '🎁 OPEN' },
  },
  referral_invitee: {
    ru: { text: `🎉 РЕФЕРАЛЬНАЯ МИССИЯ ВЫПОЛНЕНА\n\n🪙 ${INVITEE_COINS} DUCK COIN — начислено`, button: '🎁 ЗАБРАТЬ НАГРАДУ' },
    en: { text: `🎉 REFERRAL MISSION COMPLETE\n\n🪙 ${INVITEE_COINS} DUCK COIN — credited`, button: '🎁 CLAIM REWARD' },
  },
}

const EVENT_NAME: Partial<Record<NotifKind, string>> = {
  daily: 'daily_reward_notification_sent',
  overtaken: 'overtaken_notification_sent',
  raid_return: 'raid_return_notification_sent',
  referral_inviter: 'referral_notification_sent',
  referral_invitee: 'referral_notification_sent',
}

function reachable(p: Player) {
  return p.canWrite && !p.writeBlocked && !p.muted
}

/** Quiet hours 22:00–09:00 in NOTIFY_TZ_OFFSET hours from UTC (default +3, Moscow). */
export function quietHours(now: number) {
  const off = Number(process.env.NOTIFY_TZ_OFFSET ?? 3)
  const h = new Date(now + off * H).getUTCHours()
  return h >= 22 || h < 9
}

/** The message for a kind; "time for a heist" becomes "keep saving for your goal" when the player has one. */
export function textFor(kind: NotifKind, p?: Pick<Player, 'lang' | 'goal'>) {
  const lang = p?.lang ?? 'ru'
  const g = p?.goal
  if (kind === 'raid_return' && g && g.left > 0) {
    return lang === 'ru'
      ? { text: `💎 ПРОДОЛЖИ КОПИТЬ НА ЦЕЛЬ\n\n${g.name}\nОсталось: 🪙 ${g.left.toLocaleString('ru-RU')} DUCK COIN\n\nBANK ждёт.`, button: '🦆 ИГРАТЬ' }
      : { text: `💎 KEEP SAVING FOR YOUR GOAL\n\n${g.name}\nLeft: 🪙 ${g.left.toLocaleString('en-US')} DUCK COIN\n\nThe BANK is waiting.`, button: '🦆 PLAY' }
  }
  return TEXT[kind][lang]
}

async function deliver(p: Player, kind: NotifKind, now: number, custom?: { text: string; button: string }): Promise<SendResult | 'dry_run'> {
  const t = custom ?? textFor(kind, p)
  let result: SendResult | 'dry_run' = 'dry_run'
  if (enabled()) result = await sendRetentionMessage(p.id, t.text, { text: t.button, query: `n=${kind}` })
  dryLog.push({ t: now, to: p.id, kind, result })
  if (dryLog.length > 500) dryLog.splice(0, 250)
  if (result === 'blocked') await markWriteBlocked(p.id)
  if (result === 'sent') {
    const names = ['notification_sent', ...(EVENT_NAME[kind] ? [EVENT_NAME[kind]!] : [])]
    recordEvents(`tg:${p.id}`, 'server', names.map((name) => ({ name, props: { kind } })))
  }
  console.log('[notify]', { to: p.id, kind, result })
  return result
}

/** The inviter's message: ⭐ progress toward the next payout, or a full block ready. */
export function inviterText(a: StarsAccrual, lang: 'ru' | 'en') {
  const ru = lang === 'ru'
  if (a.newPayouts.length) {
    const n = a.newPayouts.length * STARS_PAYOUT_BLOCK
    return ru
      ? { text: `🎉 ТЫ НАКОПИЛ ${n} ⭐!\n\n${a.firstBlock ? 'Первая выплата доступна.' : 'Новая выплата доступна.'}\n\n🪙 +${INVITER_COINS} DUCK COIN за друга`, button: `⭐ ПОЛУЧИТЬ ${STARS_PAYOUT_BLOCK} ⭐` }
      : { text: `🎉 YOU COLLECTED ${n} ⭐!\n\n${a.firstBlock ? 'Your first payout is available.' : 'A new payout is available.'}\n\n🪙 +${INVITER_COINS} DUCK COIN for your friend`, button: `⭐ GET ${STARS_PAYOUT_BLOCK} ⭐` }
  }
  const left = Math.ceil((STARS_PAYOUT_BLOCK - a.balance) / STARS_PER_REFERRAL)
  const first = a.earned < STARS_PAYOUT_BLOCK
  return ru
    ? { text: `🎉 ДРУГ ВЫПОЛНИЛ МИССИЮ!\n\nТы получил ⭐${STARS_PER_REFERRAL} к реферальной награде.\n🪙 +${INVITER_COINS} DUCK COIN\n\n⭐ ${a.balance} / ${STARS_PAYOUT_BLOCK}\n\nЕщё ${left} успешных друзей → ${first ? 'первая выплата' : 'следующая выплата'}.`, button: '👥 ПРИГЛАСИТЬ ЕЩЁ' }
    : { text: `🎉 YOUR FRIEND COMPLETED THE MISSION!\n\nYou got ⭐${STARS_PER_REFERRAL} toward your referral reward.\n🪙 +${INVITER_COINS} DUCK COIN\n\n⭐ ${a.balance} / ${STARS_PAYOUT_BLOCK}\n\n${left} more successful friends → ${first ? 'first payout' : 'next payout'}.`, button: '👥 INVITE MORE' }
}

/** Referral completed: tell both players once (event messages, outside the reminder budget). */
export async function notifyReferralCompleted(inviteeId: number, inviterId: number, accrual: StarsAccrual | null, now = Date.now()) {
  const s = allState()
  const invitee = s.players[String(inviteeId)]
  if (invitee && reachable(invitee)) await deliver(invitee, 'referral_invitee', now).catch((err) => console.error('[notify] referral', err))
  const inviter = s.players[String(inviterId)]
  if (inviter && reachable(inviter)) await deliver(inviter, 'referral_inviter', now, accrual ? inviterText(accrual, inviter.lang ?? 'ru') : undefined).catch((err) => console.error('[notify] referral', err))
}

/** One scheduler pass: at most one reminder per reachable player, following every rule above. */
export async function notifyTick(now = Date.now()) {
  const s = allState()
  const daily = new Map(dailyUsers().map((u) => [u.telegramId, u]))
  const board = leaderboard(new Map([...daily.values()].map((u) => [u.telegramId, u.totalCoins])))
  const rankOf = new Map(board.map((r) => [r.id, r.rank]))
  const wealthOf = new Map(board.map((r) => [r.id, r.wealth]))
  const quiet = quietHours(now)
  const plan: { p: Player; kind: NotifKind }[] = []
  const rankUpdates: { id: number; rank: number; prev?: number }[] = []
  for (const p of Object.values(s.players)) {
    const rank = rankOf.get(p.id)
    const prevRank = p.notif?.lastRank
    if (rank && rank !== prevRank && (rank <= BOARD_WATCH || (prevRank ?? 999) <= BOARD_WATCH)) rankUpdates.push({ id: p.id, rank, prev: prevRank })
    if (!reachable(p) || quiet) continue
    const n = p.notif ?? {}
    if (now - p.lastSeenAt < ACTIVE_MS) continue
    if (n.lastRetentionAt && now - n.lastRetentionAt < RETENTION_GAP) continue
    const d = daily.get(p.id)
    let kind: NotifKind | null = null
    // 1) the daily reward is available again and this cycle was not reminded yet
    if (d && now - d.lastDailyRewardAt >= DAILY_REWARD_MS && n.dailyCycle !== d.lastDailyRewardAt && p.lastSeenAt < d.lastDailyRewardAt + DAILY_REWARD_MS) kind = 'daily'
    // 2) a real drop in the server ranking since the last pass (someone passed them)
    else if (rank && prevRank && rank > prevRank && prevRank <= BOARD_WATCH && (!n.overtakenAt || now - n.overtakenAt >= OVERTAKEN_COOLDOWN)) kind = 'overtaken'
    // 3) just entered the top 3
    else if (rank && rank <= 3 && prevRank !== undefined && prevRank > 3 && (wealthOf.get(p.id) ?? 0) > 0 && (!n.leaderAt || now - n.leaderAt >= LEADER_COOLDOWN)) kind = 'leader'
    // 4) away for a long time
    else if (p.raids > 0 && now - p.lastSeenAt >= RAID_RETURN_AFTER && (!n.raidReturnAt || now - n.raidReturnAt >= RAID_RETURN_COOLDOWN)) kind = 'raid_return'
    // 5) plays regularly and never invited anyone
    else if (p.escapes >= 3 && !Object.values(s.invites).some((i) => i.inviterId === p.id) && (!n.inviteNudgeAt || now - n.inviteNudgeAt >= INVITE_NUDGE_COOLDOWN)) kind = 'invite'
    if (kind) plan.push({ p, kind })
  }
  for (const u of rankUpdates) {
    await updateNotif(u.id, (n) => {
      n.lastRank = u.rank
    })
    if (u.prev) recordEvents(`tg:${u.id}`, 'server', [{ name: 'leaderboard_position_changed', props: { rank: u.rank, prevRank: u.prev } }])
  }
  const sent: { to: number; kind: NotifKind; result: string }[] = []
  for (const { p, kind } of plan) {
    const result = await deliver(p, kind, now)
    sent.push({ to: p.id, kind, result })
    // A dry run books the reminder too, so enabling sends later never replays old reminders.
    if (result === 'sent' || result === 'dry_run') {
      await updateNotif(p.id, (n) => {
        n.lastRetentionAt = now
        n.sent = (n.sent ?? 0) + 1
        if (kind === 'daily') n.dailyCycle = daily.get(p.id)?.lastDailyRewardAt
        if (kind === 'overtaken') n.overtakenAt = now
        if (kind === 'leader') n.leaderAt = now
        if (kind === 'raid_return') n.raidReturnAt = now
        if (kind === 'invite') n.inviteNudgeAt = now
      })
    }
  }
  return { planned: plan.length, sent, rankChanges: rankUpdates.length }
}

let timer: NodeJS.Timeout | null = null
export function startNotifier() {
  if (timer) return
  const every = Math.max(10_000, Number(process.env.NOTIFY_INTERVAL_MS ?? 10 * 60_000))
  timer = setInterval(() => {
    notifyTick().catch((err) => console.error('[notify] tick failed', err))
  }, every)
  console.log('[notify] scheduler', { everyMs: every, enabled: enabled() })
}

/** Sent once, only after the operator confirmed the payout was really sent (a transactional message). */
export async function notifyPayoutPaid(to: number, stars: number) {
  const p = allState().players[String(to)]
  const ru = (p?.lang ?? 'ru') === 'ru'
  const text = ru ? `✓ ${stars} ⭐ ВЫПЛАЧЕНО!\n\nТебе отправлено ⭐${stars} Stars.\n\nСпасибо, что приглашаешь друзей! 🦆` : `✓ ${stars} ⭐ PAID!\n\nYou were sent ⭐${stars} Stars.\n\nThanks for inviting friends! 🦆`
  const result = await sendRetentionMessage(to, text, { text: '🦆 DUCKJACKPOT', query: 'n=stars_paid' })
  if (result === 'blocked') await markWriteBlocked(to)
  if (result === 'sent') recordEvents(`tg:${to}`, 'server', [{ name: 'notification_sent', props: { kind: 'stars_paid' } }])
  return result
}
