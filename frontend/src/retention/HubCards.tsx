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

/** 📢 For a player who came through an invite: follow the channel (checked by the server). */
export function ChannelStepCard({ invitee, channel, rewards, onUpdate }: { invitee: InviteeView; channel: Channel; rewards: Rewards; onUpdate: (v: InviteeView) => void }) {
  const { t } = useI18n()
  const [phase, setPhase] = useState<'idle' | 'checking' | 'missing' | 'error'>('idle')
  if (invitee.completed) return null
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
    <section className="channel-step mt-3 rounded-2xl border border-sky-300/40 bg-sky-400/[0.07] px-3 py-3 text-left">
      {verified ? (
        <>
          <p className="text-[12px] font-black tracking-[0.06em] text-emerald-300">{t('chOk')}</p>
          <p className="mt-1 text-[12px] text-sky-100/80">{t('chNextExit')}</p>
        </>
      ) : (
        <>
          <p className="text-[12px] font-black tracking-[0.06em] text-sky-100">{t('chTitle')}</p>
          <p className="mt-1 text-[12px] leading-snug text-sky-100/75">{t('chText')}</p>
          <p className="mt-1 font-display text-[15px] font-black text-amber-100">{t('refCoins', { n: rewards.inviteeCoins })}</p>
          {channel.url ? (
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
        </>
      )}
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
          <ul className="mt-3 space-y-1.5">
            {data.invites.length ? (
              data.invites.map((i, k) => (
                <li key={k} className="flex items-center justify-between gap-2 rounded-xl bg-black/30 px-3 py-2">
                  <span className="min-w-0 truncate text-[13px] font-bold text-zinc-100">{i.name || (i.username ? `@${i.username}` : t('refFriend'))}</span>
                  <span className="shrink-0 text-[11px] font-black text-amber-200">{t(STATUS_KEY[i.status])}</span>
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
export function ReferralCard({ rewards }: { rewards: Rewards }) {
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
          <p className="font-display text-[13px] font-black text-amber-50">{t('refCoins', { n: rewards.inviterCoins })}</p>
        </div>
        <div className="rounded-xl bg-black/30 px-2.5 py-1.5">
          <p className="text-[10px] font-bold text-zinc-400">{t('refFriendGets')}</p>
          <p className="font-display text-[13px] font-black text-amber-50">{t('refCoins', { n: rewards.inviteeCoins })}</p>
        </div>
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-zinc-500">{t('refRule')}</p>
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
