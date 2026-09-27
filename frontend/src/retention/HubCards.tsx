import { useEffect, useState, type ReactNode } from 'react'
import { track } from '../analytics/track'
import { useI18n } from '../i18n/LanguageProvider'
import type { MessageKey } from '../i18n/messages'
import {
  checkChannel,
  inTelegram,
  leaderboardApi,
  patchSession,
  prepareShare,
  referralMe,
  reportWriteAccess,
  tg,
  type Board,
  type Channel,
  type InviteeView,
  type ReferralMe,
  type Rewards,
  type StarsView,
} from './api'

/** A bottom sheet over the hub (closes on the backdrop), clear of the nav and the home indicator. */
function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="max-h-[82dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#141218] px-4 pt-4 pb-[calc(var(--safe-bottom)+16px)]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        <button type="button" onClick={onClose} className="mt-4 min-h-11 w-full rounded-xl border border-white/15 text-[13px] font-black text-zinc-200">
          {t('refClose')}
        </button>
      </div>
    </div>
  )
}

/**
 * 🎁 The referral mission of an invited player: follow the channel (checked by the server) and
 * bank MISSION DUCK COIN through successful EXITs (counted by the server, never by the device).
 */
export function ReferralMissionCard({
  invitee,
  channel,
  rewards,
  starsPaid,
  onUpdate,
}: {
  invitee: InviteeView
  channel: Channel
  rewards: Rewards
  starsPaid: boolean
  onUpdate: (v: InviteeView) => void
}) {
  const { t } = useI18n()
  const [phase, setPhase] = useState<'idle' | 'checking' | 'missing' | 'error'>('idle')
  const target = invitee.target ?? rewards.missionCoins ?? 650
  const progress = Math.min(target, invitee.progress ?? 0)
  if (invitee.completed && starsPaid) return null
  if (invitee.completed) {
    return (
      <section className="channel-step mission-card mt-3 rounded-2xl border border-emerald-300/40 bg-emerald-400/[0.07] px-3 py-3 text-left">
        <p className="text-[12px] font-black tracking-[0.04em] text-emerald-300">{t('misDone')}</p>
        {rewards.stars.invitee > 0 ? <p className="mt-1 text-[13px] font-bold text-sky-100">{t('misStarsOk', { n: rewards.stars.invitee })}</p> : null}
        <p className="text-[13px] font-bold text-amber-100">{t('misCoinsOk', { n: rewards.inviteeCoins })}</p>
        {rewards.stars.invitee > 0 ? <p className="mt-1 text-[11px] text-zinc-400">{t('misStarsNote')}</p> : null}
      </section>
    )
  }
  const verified = invitee.channelVerified
  const check = async () => {
    if (phase === 'checking') return
    setPhase('checking')
    try {
      const r = await checkChannel()
      if (r.subscribed && r.invitee) {
        onUpdate(r.invitee)
        setPhase('idle')
      } else setPhase('missing')
    } catch {
      setPhase('error')
    }
  }
  return (
    <section className="channel-step mission-card mt-3 rounded-2xl border border-sky-300/40 bg-sky-400/[0.07] px-3 py-3 text-left">
      <p className="text-[12px] font-black tracking-[0.06em] text-sky-100">{t('misTitle')}</p>
      <p className="mt-1 text-[12px] leading-snug text-sky-100/80">{t('misText', { n: target })}</p>
      {verified ? (
        <p className="mt-2 text-[12px] font-black text-emerald-300">{t('chOk')}</p>
      ) : channel.url ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" className="min-h-11 rounded-xl bg-sky-300 px-2 text-[12px] font-black text-zinc-950" onClick={() => tg().openTelegramLink(channel.url!)}>
            {t('chSubscribe')}
          </button>
          <button type="button" disabled={phase === 'checking'} className="min-h-11 rounded-xl border border-sky-300/50 bg-sky-300/10 px-2 text-[12px] font-black text-sky-50 disabled:opacity-60" onClick={() => void check()}>
            {phase === 'checking' ? t('chChecking') : t('chCheck')}
          </button>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-zinc-400">{t('chSoon')}</p>
      )}
      {phase === 'missing' ? <p className="mt-2 text-[12px] font-bold text-orange-300">{t('chNotFound')}</p> : null}
      {phase === 'error' ? <p className="mt-2 text-[12px] font-bold text-orange-300">{t('chUnavailable')}</p> : null}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="mission-bar h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
          <div className="progress-fill h-full rounded-full" style={{ width: `${Math.round((progress / target) * 100)}%` }} />
        </div>
        <span className="mission-count shrink-0 font-mono text-[12px] font-bold text-amber-100">
          {progress} / {target}
        </span>
      </div>
      <p className="mt-1 text-[10px] text-zinc-500">{t('misHint')}</p>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-black text-amber-200">{t('misInProgress')}</p>
          {rewards.stars.invitee > 0 ? <p className="text-[12px] font-bold text-sky-100">{t('refStars', { n: rewards.stars.invitee })}</p> : null}
          <p className="text-[12px] font-bold text-amber-50">{t('refCoins', { n: rewards.inviteeCoins })}</p>
        </div>
        <p className="shrink-0 text-right text-[11px] font-bold text-zinc-300">{t('misLeft', { n: Math.max(0, target - progress) })}</p>
      </div>
    </section>
  )
}

const STATUS_KEY: Record<string, MessageKey> = {
  opened: 'refSt_opened',
  verified: 'refSt_verified',
  played: 'refSt_played',
  exited: 'refSt_exited',
  rewarded: 'refSt_rewarded',
}

function MyInvites({ data, onClose }: { data: ReferralMe | null; onClose: () => void }) {
  const { t } = useI18n()
  return (
    <Sheet onClose={onClose}>
      <p className="font-display text-lg font-black text-amber-50">{t('refMineTitle')}</p>
      {!data ? (
        <p className="mt-3 text-sm text-zinc-400">{t('lbLoading')}</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 text-left">
            {(
              [
                ['refInvited', data.stats.invited],
                ['refSubscribed', data.stats.subscribed],
                ['refPlayed', data.stats.played],
                ['refExited', data.stats.exited],
              ] as [MessageKey, number][]
            ).map(([k, n]) => (
              <div key={k} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <p className="text-[10px] font-extrabold tracking-[0.1em] text-zinc-400">{t(k)}</p>
                <p className="font-display text-xl font-black text-amber-50">{n}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] font-extrabold tracking-[0.12em] text-amber-200">{t('refRewards')}</p>
          <p className="mt-1 text-[13px] font-bold text-emerald-300">{t('refReceived', { n: data.coins.received })}</p>
          <p className="text-[13px] font-bold text-amber-100/80">{t('refPending', { n: data.coins.pending })}</p>
          {(() => {
            const mine = (data.stars ?? []).filter((r) => r.role === 'inviter')
            const sum = (st: StarsView['status']) => mine.filter((r) => r.status === st).reduce((a, r) => a + r.stars, 0)
            return mine.length ? (
              <>
                <p className="mt-1 text-[13px] font-bold text-emerald-300">{t('refStarsPaid', { n: sum('PAID') })}</p>
                <p className="text-[13px] font-bold text-sky-100/80">{t('refStarsPending', { n: sum('PENDING') })}</p>
              </>
            ) : null
          })()}
          <ul className="mt-3 space-y-1.5">
            {data.invites.length ? (
              data.invites.map((i, k) => (
                <li key={k} className="flex items-center justify-between gap-2 rounded-xl bg-black/30 px-3 py-2">
                  <span className="min-w-0 truncate text-[13px] font-bold text-zinc-100">{i.name || (i.username ? `@${i.username}` : t('refFriend'))}</span>
                  <span className="shrink-0 text-right text-[11px] font-black text-amber-200">
                    {t(STATUS_KEY[i.status])}
                    {i.status !== 'rewarded' && i.target ? <span className="block font-mono text-[10px] text-zinc-400">{i.progress ?? 0} / {i.target}</span> : null}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-[12px] text-zinc-400">{t('refNone')}</li>
            )}
          </ul>
        </>
      )}
    </Sheet>
  )
}

/** 👥 Invite a friend: the rewards shown are only the ones the server really gives. */
export function ReferralCard({ rewards, friends = [] }: { rewards: Rewards; friends?: ReferralMe['invites'] }) {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<ReferralMe | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const load = () =>
    referralMe()
      .then((d) => {
        setData(d)
        return d
      })
      .catch(() => null)
  const invite = async () => {
    if (!inTelegram()) {
      setNote(t('refOnlyTg'))
      return
    }
    const app = tg() as unknown as { shareMessage?: (id: string, cb?: (sent: boolean) => void) => void; isVersionAtLeast?: (v: string) => boolean; openTelegramLink: (u: string) => void }
    try {
      const p = await prepareShare(lang === 'ru' ? 'ru' : 'en')
      if (typeof app.shareMessage === 'function' && app.isVersionAtLeast?.('8.0')) {
        app.shareMessage(p.id)
        return
      }
      app.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(p.url)}&text=${encodeURIComponent(p.text)}`)
    } catch {
      const d = data ?? (await load())
      if (!d?.link) {
        setNote(t('refOnlyTg'))
        return
      }
      app.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(d.link)}`)
    }
  }
  return (
    <section className="referral-card mt-3 rounded-2xl border border-amber-400/30 bg-[#16120c] px-3 py-3 text-left">
      <p className="text-[12px] font-black tracking-[0.06em] text-amber-100">{t('refTitle')}</p>
      <p className="mt-0.5 text-[12px] text-zinc-300">{t('refText')}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-black/30 px-2.5 py-1.5">
          <p className="text-[10px] font-bold text-zinc-400">{t('refYouGet')}</p>
          {rewards.stars.inviter > 0 ? <p className="font-display text-[13px] font-black text-sky-100">{t('refStars', { n: rewards.stars.inviter })}</p> : null}
          <p className="font-display text-[13px] font-black text-amber-50">{t('refCoins', { n: rewards.inviterCoins })}</p>
        </div>
        <div className="rounded-xl bg-black/30 px-2.5 py-1.5">
          <p className="text-[10px] font-bold text-zinc-400">{t('refFriendGets')}</p>
          {rewards.stars.invitee > 0 ? <p className="font-display text-[13px] font-black text-sky-100">{t('refStars', { n: rewards.stars.invitee })}</p> : null}
          <p className="font-display text-[13px] font-black text-amber-50">{t('refCoins', { n: rewards.inviteeCoins })}</p>
        </div>
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-zinc-500">{t('refRuleMission', { n: rewards.missionCoins ?? 650 })}</p>
      {rewards.stars.available ? <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">{t('refStarsNote')}</p> : null}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" className="buy-btn min-h-11 rounded-xl px-2 text-[12px] font-black text-zinc-950" onClick={() => void invite()}>
          {t('refInvite')}
        </button>
        <button
          type="button"
          className="min-h-11 rounded-xl border border-amber-400/40 px-2 text-[12px] font-black text-amber-100"
          onClick={() => {
            setOpen(true)
            void load()
          }}
        >
          {t('refMine')}
        </button>
      </div>
      {friends.filter((f) => f.status !== 'rewarded').slice(0, 3).map((f, k) => (
        <div key={k} className="friend-mission mt-2 rounded-xl bg-black/30 px-2.5 py-2">
          <p className="text-[11px] font-black text-sky-100">
            {t('friendDoing')} · {f.name || (f.username ? `@${f.username}` : t('refFriend'))}
          </p>
          <p className="font-mono text-[11px] text-amber-100">{t('friendProgress', { n: f.progress ?? 0, max: f.target ?? rewards.missionCoins ?? 650 })}</p>
        </div>
      ))}
      {note ? <p className="mt-2 text-[11px] font-bold text-orange-300">{note}</p> : null}
      {open ? <MyInvites data={data} onClose={() => setOpen(false)} /> : null}
    </section>
  )
}

/** 🏆 Server ranking: top 10 and the player's own place. */
export function LeaderboardSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const [board, setBoard] = useState<Board | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    track('leaderboard_opened')
    leaderboardApi()
      .then(setBoard)
      .catch(() => setFailed(true))
  }, [])
  return (
    <Sheet onClose={onClose}>
      <p className="font-display text-lg font-black text-amber-50">{t('lbTitle')}</p>
      {!board ? (
        <p className="mt-3 text-sm text-zinc-400">{failed ? t('chUnavailable') : t('lbLoading')}</p>
      ) : (
        <>
          <ol className="mt-3 space-y-1.5">
            {board.top.length ? (
              board.top.map((r) => (
                <li key={r.rank} className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${r.me ? 'bg-amber-400/15 ring-1 ring-amber-300/50' : 'bg-black/30'}`}>
                  <span className="min-w-0 truncate text-[13px] font-bold text-zinc-100">
                    {r.rank}. {r.me ? `${r.name} (${t('lbYou')})` : r.name}
                  </span>
                  <span className="shrink-0 font-display text-[13px] font-black text-amber-100">{r.wealth.toLocaleString()} 🪙</span>
                </li>
              ))
            ) : (
              <li className="text-[12px] text-zinc-400">{t('lbEmpty')}</li>
            )}
          </ol>
          {board.me ? (
            <div className="mt-3 rounded-xl border border-amber-300/40 bg-amber-400/10 px-3 py-2">
              <p className="text-[11px] font-extrabold tracking-[0.12em] text-amber-200">{t('lbYou')}</p>
              <p className="font-display text-base font-black text-amber-50">
                {board.me.rank ? `#${board.me.rank} · ${board.me.wealth.toLocaleString()} 🪙` : t('lbNoRank')}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-[12px] text-zinc-400">{t('lbOnlyTg')}</p>
          )}
          <p className="mt-2 text-[10px] leading-snug text-zinc-500">{t('lbHint')}</p>
        </>
      )}
    </Sheet>
  )
}

/**
 * 🔔 Ask Telegram (official requestWriteAccess) whether the bot may write, after the player has
 * just claimed a reward. Shown only when the bot cannot write yet.
 */
export function NotifyOptIn({ canWrite }: { canWrite: boolean }) {
  const { t } = useI18n()
  const [on, setOn] = useState(canWrite)
  const app = tg() as unknown as { requestWriteAccess?: (cb?: (granted: boolean) => void) => void; isVersionAtLeast?: (v: string) => boolean }
  if (!inTelegram() || typeof app.requestWriteAccess !== 'function' || !app.isVersionAtLeast?.('6.9')) return null
  if (on) return <p className="mt-1 text-[10px] font-bold text-emerald-300/80">{t('notifyOn')}</p>
  return (
    <button
      type="button"
      className="mt-1 text-[11px] font-bold text-sky-200 underline"
      onClick={() => {
        track('notification_permission_requested')
        app.requestWriteAccess?.((granted) => {
          if (!granted) return
          setOn(true)
          patchSession({ canWrite: true })
          void reportWriteAccess(true).catch(() => undefined)
        })
      }}
    >
      {t('notifyAsk')}
    </button>
  )
}

/**
 * ⭐ Stars this player is owed for a referral. Never shown as received until the operator
 * marked the payout as sent (PAID); a paid notice stays for a week.
 */
export function StarsRewardNotice({ rewards }: { rewards: StarsView[] }) {
  const { t } = useI18n()
  // An invited player's pending Stars are shown on the mission card itself.
  const recent = rewards.filter((r) => (r.status === 'PENDING' && r.role === 'inviter') || (r.status === 'PAID' && Date.now() - (r.paidAt ?? 0) < 7 * 86_400_000))
  if (!recent.length) return null
  return (
    <section className="stars-notice mt-3 space-y-2">
      {recent.map((r) =>
        r.status === 'PENDING' ? (
          <div key={r.id} className="rounded-2xl border border-sky-300/40 bg-sky-400/[0.07] px-3 py-2.5 text-left">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-black text-sky-100">{r.role === 'inviter' ? t('friendDone') : t('starsOwedTitle')}</p>
              <span className="shrink-0 rounded-full bg-amber-300/20 px-2 py-0.5 text-[10px] font-black text-amber-200">{t('starsPending')}</span>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-sky-100/80">{t('starsOwedText', { n: r.stars })}</p>
          </div>
        ) : (
          <div key={r.id} className="rounded-2xl border border-emerald-300/40 bg-emerald-400/[0.07] px-3 py-2.5 text-left">
            <p className="text-[12px] font-black text-emerald-300">{t('starsPaid', { n: r.stars })}</p>
          </div>
        ),
      )}
    </section>
  )
}
