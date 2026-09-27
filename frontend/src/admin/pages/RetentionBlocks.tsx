import { useEffect, useState } from 'react'
import { api } from '../../api/client'

/** 👥 REFERRALS, 🔔 notifications and the channel/bot check, from /api/admin/retention. */
type Retention = {
  referrals: {
    linksCreated: number
    opened: number
    registered: number
    refused: Record<string, number>
    channelVerified: number
    firstRaid: number
    firstExit: number
    successful: number
    rewardsIssued: number
    rewardsPending: number
    rewardsFailed: number
    coinsIssued: number
    coinsPending: number
    starsIssued: number
    conversion: Record<'openedToRegistered' | 'registeredToVerified' | 'verifiedToFirstRaid' | 'firstRaidToFirstExit' | 'firstExitToReward', number>
    players: number
    reachable: number
  }
  notifications: {
    enabled: boolean
    sent: Record<string, number>
    opened: Record<string, number>
    actions: Record<string, number>
    permissionRequested: number
    permissionGranted: number
    leaderboardOpened: number
    recent: { t: number; to: number; kind: string; result: string }[]
  }
  channel: { configured: boolean; channel?: string; botStatus?: string; botIsAdmin?: boolean; error?: string }
  leaderboard: { rank: number; name: string; wealth: number }[]
}

const T = {
  ru: {
    ref: '👥 REFERRALS',
    links: 'Ссылок создано',
    opened: 'Открыли ссылку',
    registered: 'Зарегистрированы',
    verified: 'Подписались на канал',
    firstRaid: 'Первый рейд',
    firstExit: 'Первый EXIT',
    successful: 'Успешные приглашения',
    issued: 'Наград выдано',
    pending: 'Наград ожидает',
    failed: 'Наград с ошибкой',
    refused: 'Отклонено',
    conv: { openedToRegistered: 'Открыли → зарегистрированы', registeredToVerified: 'Зарегистрированы → канал', verifiedToFirstRaid: 'Канал → первый рейд', firstRaidToFirstExit: 'Первый рейд → первый EXIT', firstExitToReward: 'Первый EXIT → награда' },
    coins: '🪙 DUCK COIN за приглашения',
    coinsVal: (a: number, b: number) => `выдано ${a.toLocaleString()} · ожидает ${b.toLocaleString()}`,
    stars: '⭐ Stars за приглашения',
    starsVal: '0 — Bot API не умеет начислять Stars пользователям',
    notif: '🔔 УВЕДОМЛЕНИЯ',
    mode: (on: boolean) => (on ? 'Отправка включена (NOTIFICATIONS_ENABLED=1)' : 'Dry-run: сообщения не отправляются (NOTIFICATIONS_ENABLED не равен 1)'),
    sent: 'Отправлено',
    openedN: 'Открыли',
    perm: 'Разрешение запрошено / выдано',
    reach: 'Можно писать (игроков)',
    lb: 'Открыли рейтинг',
    channel: '📢 КАНАЛ',
    chOk: (c: string) => `${c}: бот — администратор ✓`,
    chBad: 'Бот не администратор канала — подписку проверить нельзя',
    chNone: 'TELEGRAM_CHANNEL_ID не задан',
    recent: 'Последние решения',
  },
  en: {
    ref: '👥 REFERRALS',
    links: 'Links created',
    opened: 'Links opened',
    registered: 'Registered',
    verified: 'Channel verified',
    firstRaid: 'First raid',
    firstExit: 'First EXIT',
    successful: 'Successful referrals',
    issued: 'Rewards issued',
    pending: 'Pending rewards',
    failed: 'Failed rewards',
    refused: 'Refused',
    conv: { openedToRegistered: 'Opened → Registered', registeredToVerified: 'Registered → Channel verified', verifiedToFirstRaid: 'Verified → First raid', firstRaidToFirstExit: 'First raid → First EXIT', firstExitToReward: 'First EXIT → Reward' },
    coins: '🪙 DUCK COIN rewards',
    coinsVal: (a: number, b: number) => `issued ${a.toLocaleString()} · pending ${b.toLocaleString()}`,
    stars: '⭐ Stars rewards',
    starsVal: '0 — the Bot API cannot credit Stars to users',
    notif: '🔔 NOTIFICATIONS',
    mode: (on: boolean) => (on ? 'Sending is ON (NOTIFICATIONS_ENABLED=1)' : 'Dry run: nothing is sent (NOTIFICATIONS_ENABLED is not 1)'),
    sent: 'Sent',
    openedN: 'Opened',
    perm: 'Permission requested / granted',
    reach: 'Reachable players',
    lb: 'Ranking opened',
    channel: '📢 CHANNEL',
    chOk: (c: string) => `${c}: bot is an administrator ✓`,
    chBad: 'The bot is not a channel admin — subscriptions cannot be checked',
    chNone: 'TELEGRAM_CHANNEL_ID is not set',
    recent: 'Recent decisions',
  },
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <p className="font-display text-lg font-black text-amber-50">{value}</p>
    </div>
  )
}

const kinds = (m: Record<string, number>) =>
  Object.entries(m)
    .map(([k, n]) => `${k}: ${n}`)
    .join(' · ') || '—'

export function RetentionBlocks({ range, lang }: { range: string; lang: string }) {
  const tx = lang === 'ru' ? T.ru : T.en
  const [d, setD] = useState<Retention | null>(null)
  useEffect(() => {
    api
      .get<Retention>('/admin/retention', { params: { range } })
      .then((r) => setD(r.data))
      .catch(() => setD(null))
  }, [range])
  if (!d) return null
  const r = d.referrals
  const n = d.notifications
  return (
    <>
      <section className="retention-admin rounded-2xl border border-amber-400/30 bg-zinc-900/80 p-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-200">{tx.ref}</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label={tx.links} value={r.linksCreated} />
          <Stat label={tx.opened} value={r.opened} />
          <Stat label={tx.registered} value={r.registered} />
          <Stat label={tx.verified} value={r.channelVerified} />
          <Stat label={tx.firstRaid} value={r.firstRaid} />
          <Stat label={tx.firstExit} value={r.firstExit} />
          <Stat label={tx.successful} value={r.successful} />
          <Stat label={tx.issued} value={r.rewardsIssued} />
          <Stat label={tx.pending} value={r.rewardsPending} />
          <Stat label={tx.failed} value={r.rewardsFailed} />
        </div>
        <ul className="mt-3 space-y-1.5">
          {(Object.keys(tx.conv) as (keyof typeof tx.conv)[]).map((k) => (
            <li key={k} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-zinc-300">{tx.conv[k]}</span>
              <span className="font-display font-black text-emerald-300">{r.conversion[k]}%</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] text-zinc-300">
          {tx.refused}: {kinds(r.refused)}
        </p>
        <p className="mt-2 text-sm text-zinc-200">
          {tx.coins}: <b>{tx.coinsVal(r.coinsIssued, r.coinsPending)}</b>
        </p>
        <p className="mt-1 text-sm text-zinc-200">
          {tx.stars}: <b>{tx.starsVal}</b>
        </p>
      </section>
      <section className="rounded-2xl border border-sky-300/30 bg-zinc-900/80 p-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-200">{tx.notif}</h3>
        <p className={`mt-1 text-[12px] font-bold ${n.enabled ? 'text-emerald-300' : 'text-orange-300'}`}>{tx.mode(n.enabled)}</p>
        <p className="mt-2 text-sm text-zinc-200">
          {tx.sent}: {kinds(n.sent)}
        </p>
        <p className="mt-1 text-sm text-zinc-200">
          {tx.openedN}: {kinds(n.opened)}
        </p>
        <p className="mt-1 text-sm text-zinc-200">
          {tx.perm}: {n.permissionRequested} / {n.permissionGranted}
        </p>
        <p className="mt-1 text-sm text-zinc-200">
          {tx.reach}: {r.reachable} / {r.players}
        </p>
        <p className="mt-1 text-sm text-zinc-200">
          {tx.lb}: {n.leaderboardOpened}
        </p>
        {n.recent.length ? (
          <>
            <p className="mt-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-zinc-400">{tx.recent}</p>
            <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto font-mono text-[11px] text-zinc-400">
              {n.recent
                .slice(-20)
                .reverse()
                .map((x, i) => (
                  <li key={i}>
                    {new Date(x.t).toLocaleString()} · {x.to} · {x.kind} · {x.result}
                  </li>
                ))}
            </ul>
          </>
        ) : null}
      </section>
      <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-200">{tx.channel}</h3>
        <p className={`mt-1 text-sm font-bold ${d.channel.botIsAdmin ? 'text-emerald-300' : 'text-orange-300'}`}>
          {!d.channel.configured ? tx.chNone : d.channel.botIsAdmin ? tx.chOk(d.channel.channel ?? '') : `${tx.chBad}${d.channel.error ? ` (${d.channel.error})` : ''}`}
        </p>
      </section>
    </>
  )
}
