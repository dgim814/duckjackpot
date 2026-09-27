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
  requestPayout,
  tg,
  type Board,
  type Channel,
  type InviteeView,
  type ReferralMe,
  type Rewards,
  type StarsProgress,
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
  onUpdate,
}: {
  invitee: InviteeView
  channel: Channel
  rewards: Rewards
  onUpdate: (v: InviteeView) => void
}) {
  const { t } = useI18n()
  const [phase, setPhase] = useState<'idle' | 'checking' | 'missing' | 'error'>('idle')
  const target = invitee.target ?? rewards.missionCoins ?? 650
  const progress = Math.min(target, invitee.progress ?? 0)
  // A completed mission stays on the hub for three days.
  if (invitee.completed && invitee.completedAt && Date.now() - invitee.completedAt > 3 * 86_400_000) return null
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
          {data.starsProgress ? (
            <>
              <p className="mt-1 text-[13px] font-bold text-sky-100">{t('rfEarned', { n: data.starsProgress.earned })}</p>
              <p className="text-[13px] font-bold text-emerald-300">
                {t('rfPaidTotal', { n: data.starsProgress.payouts.filter((x) => x.status === 'PAID').reduce((a, x) => a + x.stars, 0) })}
              </p>
            </>
          ) : null}
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

/** ⭐ Payout status (ready / requested / paid) or the progress toward the next block of 50. */
function StarsBlock({ progress, onChange }: { progress: StarsProgress; onChange: (p: StarsProgress) => void }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const ready = progress.payouts.find((x) => x.status === 'READY_FOR_PAYOUT')
  const pending = progress.payouts.find((x) => x.status === 'PENDING')
  const paid = progress.payouts.filter((x) => x.status === 'PAID' && Date.now() - (x.paidAt ?? 0) < 7 * 86_400_000)
  const firstBlock = progress.payouts.length <= 1
  const left = Math.max(1, Math.ceil((progress.block - progress.balance) / progress.perFriend))
  return (
    <div className="stars-block mt-2 space-y-2">
      {ready ? (
        <div className="payout-ready rounded-xl border border-emerald-300/50 bg-emerald-400/10 px-3 py-2.5">
          <p className="text-[13px] font-black text-emerald-300">{t('rfReadyTitle', { n: ready.stars })}</p>
          <p className="mt-0.5 text-[11px] text-emerald-100/80">{firstBlock ? t('rfReadyFirst') : t('rfReadyNext')}</p>
          <button
            type="button"
            disabled={busy}
            className="payout-get mt-2 min-h-11 w-full rounded-xl bg-emerald-300 text-[13px] font-black text-zinc-950 disabled:opacity-60"
            onClick={() => {
              setBusy(true)
              requestPayout(ready.id)
                .then((r) => onChange(r.starsProgress))
                .catch(() => undefined)
                .finally(() => setBusy(false))
            }}
          >
            {t('rfGet', { n: ready.stars })}
          </button>
        </div>
      ) : null}
      {pending ? <p className="payout-pending rounded-xl bg-amber-300/10 px-3 py-2 text-[12px] font-black text-amber-200">{t('rfPending', { n: pending.stars })}</p> : null}
      {paid.map((x) => (
        <p key={x.id} className="payout-paid rounded-xl bg-emerald-400/10 px-3 py-2 text-[12px] font-black text-emerald-300">
          {t('rfPaid', { n: x.stars })}
        </p>
      ))}
      <div className="rounded-xl bg-black/30 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="stars-balance font-display text-[15px] font-black text-sky-100">{t('rfBalance', { n: progress.balance, max: progress.block })}</p>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="progress-fill h-full rounded-full" style={{ width: `${Math.round((progress.balance / progress.block) * 100)}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] font-bold text-zinc-300">
          {progress.earned < progress.block ? t('rfLeftFirst', { n: left, max: progress.block }) : t('rfLeftNext', { n: left, max: progress.block })}
        </p>
      </div>
    </div>
  )
}

/** 🎁 Invite friends: ⭐5 per successful friend toward payouts of 50 ⭐ (plus the DUCK COIN reward). */
export function ReferralCard({
  rewards,
  friends = [],
  progress,
  onProgress,
}: {
  rewards: Rewards
  friends?: ReferralMe['invites']
  progress?: StarsProgress
  onProgress?: (p: StarsProgress) => void
}) {
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
      <p className="text-[12px] font-black tracking-[0.06em] text-amber-100">{t('rfTitle')}</p>
      <p className="mt-0.5 text-[12px] text-zinc-300">{t('rfText', { n: rewards.stars.perFriend ?? 5 })}</p>
      <p className="text-[11px] text-amber-100/80">{t('rfCoins', { n: rewards.inviterCoins })}</p>
      <StarsBlock
        progress={progress ?? { perFriend: rewards.stars.perFriend ?? 5, block: rewards.stars.payout ?? 50, earned: 0, balance: 0, successful: 0, payouts: [] }}
        onChange={(p) => onProgress?.(p)}
      />
      <p className="mt-1.5 text-[10px] leading-snug text-zinc-500">{t('refRuleMission', { n: rewards.missionCoins ?? 650 })}</p>
      <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">{t('rfNote')}</p>
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
