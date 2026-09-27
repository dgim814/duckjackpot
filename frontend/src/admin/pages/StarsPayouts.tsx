import { useEffect, useState } from 'react'
import { api } from '../../api/client'

/**
 * ⭐ REFERRAL PAYOUTS. Inviters earn ⭐5 per successful friend; every full 50 ⭐ is one payout record
 * (READY_FOR_PAYOUT → PENDING when the player asks → PAID / CANCELLED). The operator sends the Stars
 * by hand from their own Telegram balance, then marks the record PAID here — once; the server
 * refuses a second payout. The recipient is always the Telegram id; the username is a snapshot.
 */
type Status = 'READY_FOR_PAYOUT' | 'PENDING' | 'PAID' | 'CANCELLED'
type Payout = {
  id: string
  telegramId: number
  usernameSnapshot: string | null
  nameSnapshot: string | null
  usernameNow: string | null
  stars: number
  block: number
  referralCount: number
  earned: number
  successful: number
  status: Status
  createdAt: number
  requestedAt?: number
  paidAt?: number
  paidBy?: string
  cancelledAt?: number
  cancelledBy?: string
  cancelReason?: string
  notifyResult?: string
}
type Legacy = { id: string; recipientTelegramId: number; usernameSnapshot: string | null; rewardStars: number; role: string; status: string; createdAt: number; paidAt?: number; cancelReason?: string }
type Data = {
  summary: {
    perFriend: number
    block: number
    successfulReferrals: number
    starsAccrued: number
    starsReady: number
    starsPending: number
    starsPaid: number
    readyCount: number
    pendingCount: number
    paidCount: number
    cancelledCount: number
    avgSuccessfulPerInviter: number
  }
  payouts: Payout[]
  accruing: { telegramId: number; username: string | null; name: string | null; successful: number; earned: number; balance: number }[]
  legacy: Legacy[]
}

const T = {
  ru: {
    title: '⭐ REFERRAL PAYOUTS',
    note: '⭐5 за каждого успешного друга, выплата блоками по 50 ⭐. Отправь Stars вручную со своего Telegram-баланса, затем отметь выплату здесь.',
    s: {
      successful: 'Успешных рефералов',
      accrued: 'Stars накоплено',
      ready: 'Stars готово к выплате',
      pending: 'Stars ожидают (запрошено)',
      paid: 'Stars выплачено',
      queue: 'Выплат в очереди',
      avg: 'Успешных рефералов на пригласившего',
    },
    operator: 'Оператор (кто отмечает выплаты)',
    empty: 'Нет выплат в этом списке.',
    open: 'ОТКРЫТЬ ПРОФИЛЬ',
    copy: 'СКОПИРОВАТЬ ID',
    copied: 'ID скопирован',
    paid: '✓ STARS ОТПРАВЛЕНЫ',
    cancel: 'ОТМЕНИТЬ',
    confirm: (n: number, who: string) => `Вы действительно отправили ⭐${n} Stars этому пользователю?\n\n${who}`,
    reason: 'Причина отмены (необязательно):',
    accrued: (n: number) => `Накоплено: ${n} ⭐`,
    available: (n: number) => `Доступно к выплате: ${n} ⭐`,
    refs: (n: number) => `Referral count: ${n}`,
    st: { READY_FOR_PAYOUT: '🟢 READY_FOR_PAYOUT', PENDING: '🟡 PENDING (запрошено)', PAID: '✓ PAID', CANCELLED: '❌ CANCELLED' } as Record<Status, string>,
    accruing: '⭐ НАКАПЛИВАЮТ',
    accRow: (s: number, e: number, b: number, block: number) => `${s} друзей · накоплено ${e} ⭐ · к следующей выплате ${b} / ${block}`,
    history: '⭐ ИСТОРИЯ ВЫПЛАТ',
    filters: { READY_FOR_PAYOUT: 'ГОТОВЫ', PENDING: 'ЗАПРОШЕНЫ', PAID: 'ВЫПЛАЧЕНО', CANCELLED: 'ОТМЕНЕНО', ALL: 'ВСЕ' },
    by: 'оператор',
    notified: (r?: string) => (r === 'sent' ? 'уведомление отправлено' : r ? `уведомление: ${r}` : ''),
    legacy: 'Старая модель (10/5 ⭐) — только история',
    err: (e: string) => (e === 'already_paid' ? 'Уже выплачено — повторная выплата заблокирована' : e === 'already_cancelled' ? 'Запись уже отменена' : `Ошибка: ${e}`),
  },
  en: {
    title: '⭐ REFERRAL PAYOUTS',
    note: '⭐5 per successful friend, paid out in blocks of 50 ⭐. Send the Stars by hand from your own Telegram balance, then mark the payout here.',
    s: {
      successful: 'Successful referrals',
      accrued: 'Stars accrued',
      ready: 'Stars ready for payout',
      pending: 'Stars requested',
      paid: 'Stars paid',
      queue: 'Payouts in queue',
      avg: 'Successful referrals per inviter',
    },
    operator: 'Operator (who marks payouts)',
    empty: 'No payouts in this list.',
    open: 'OPEN PROFILE',
    copy: 'COPY ID',
    copied: 'ID copied',
    paid: '✓ STARS SENT',
    cancel: 'CANCEL',
    confirm: (n: number, who: string) => `Did you really send ⭐${n} Stars to this user?\n\n${who}`,
    reason: 'Cancel reason (optional):',
    accrued: (n: number) => `Accrued: ${n} ⭐`,
    available: (n: number) => `Available for payout: ${n} ⭐`,
    refs: (n: number) => `Referral count: ${n}`,
    st: { READY_FOR_PAYOUT: '🟢 READY_FOR_PAYOUT', PENDING: '🟡 PENDING (requested)', PAID: '✓ PAID', CANCELLED: '❌ CANCELLED' } as Record<Status, string>,
    accruing: '⭐ ACCRUING',
    accRow: (s: number, e: number, b: number, block: number) => `${s} friends · accrued ${e} ⭐ · toward next payout ${b} / ${block}`,
    history: '⭐ PAYOUT HISTORY',
    filters: { READY_FOR_PAYOUT: 'READY', PENDING: 'REQUESTED', PAID: 'PAID', CANCELLED: 'CANCELLED', ALL: 'ALL' },
    by: 'operator',
    notified: (r?: string) => (r === 'sent' ? 'notification sent' : r ? `notification: ${r}` : ''),
    legacy: 'Old model (10/5 ⭐) — history only',
    err: (e: string) => (e === 'already_paid' ? 'Already paid — a second payout is blocked' : e === 'already_cancelled' ? 'Already cancelled' : `Error: ${e}`),
  },
}

const OP_KEY = 'duckjackpot.admin.operator'
const handle = (p: Payout) => p.usernameNow ?? p.usernameSnapshot
const who = (p: Payout) => `${handle(p) ? `@${handle(p)}` : p.nameSnapshot ?? '—'} · ID ${p.telegramId}`
const profileUrl = (p: Payout) => (handle(p) ? `https://t.me/${handle(p)}` : `tg://user?id=${p.telegramId}`)

export function StarsPayouts({ lang }: { lang: string }) {
  const tx = lang === 'ru' ? T.ru : T.en
  const [data, setData] = useState<Data | null>(null)
  const [filter, setFilter] = useState<Status | 'ALL'>('PAID')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [operator, setOperator] = useState(() => {
    try {
      return localStorage.getItem(OP_KEY) || ''
    } catch {
      return ''
    }
  })
  const load = () =>
    api
      .get<Data>('/admin/referral-payouts')
      .then((r) => setData(r.data))
      .catch(() => setData(null))
  useEffect(() => {
    void load()
  }, [])
  const act = async (p: Payout, kind: 'paid' | 'cancel') => {
    if (busy) return
    if (kind === 'paid' && !window.confirm(tx.confirm(p.stars, who(p)))) return
    let reason: string | null = null
    if (kind === 'cancel') {
      reason = window.prompt(tx.reason, '')
      if (reason === null) return
    }
    setBusy(p.id)
    setMsg(null)
    try {
      await api.post(`/admin/referral-payouts/${p.id}/${kind}`, kind === 'paid' ? { confirm: true, operator } : { operator, reason })
    } catch (err) {
      const e = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'error'
      setMsg(tx.err(e))
    } finally {
      setBusy(null)
      void load()
    }
  }
  if (!data) return null
  const sm = data.summary
  const queue = data.payouts.filter((p) => p.status === 'READY_FOR_PAYOUT' || p.status === 'PENDING').sort((a, b) => (a.status === 'PENDING' ? -1 : 1) - (b.status === 'PENDING' ? -1 : 1) || a.createdAt - b.createdAt)
  const history = data.payouts.filter((p) => filter === 'ALL' || p.status === filter)
  const stat = (label: string, value: number | string) => (
    <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <p className="font-display text-lg font-black text-amber-50">{value}</p>
    </div>
  )
  return (
    <>
      <section className="stars-payouts rounded-2xl border border-sky-300/40 bg-zinc-900/80 p-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-200">{tx.title}</h3>
        <p className="mt-1 text-[12px] text-zinc-400">{tx.note}</p>
        <div className="payout-summary mt-3 grid grid-cols-2 gap-2">
          {stat(tx.s.successful, sm.successfulReferrals)}
          {stat(tx.s.accrued, sm.starsAccrued)}
          {stat(tx.s.ready, sm.starsReady)}
          {stat(tx.s.pending, sm.starsPending)}
          {stat(tx.s.paid, sm.starsPaid)}
          {stat(tx.s.queue, sm.readyCount + sm.pendingCount)}
          {stat(tx.s.avg, sm.avgSuccessfulPerInviter)}
        </div>
        <label className="mt-3 block text-[11px] text-zinc-400">
          {tx.operator}
          <input
            value={operator}
            onChange={(e) => {
              setOperator(e.target.value)
              try {
                localStorage.setItem(OP_KEY, e.target.value)
              } catch {
                /* ignore */
              }
            }}
            className="mt-1 w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        {msg ? <p className="mt-2 text-[12px] font-bold text-orange-300">{msg}</p> : null}
        <ul className="mt-3 space-y-2">
          {queue.length ? (
            queue.map((p) => (
              <li key={p.id} className="payout-row rounded-xl border border-white/10 bg-black/30 p-3">
                <p className="text-sm font-black text-zinc-100">👤 {handle(p) ? `@${handle(p)}` : p.nameSnapshot ?? '—'}</p>
                <p className="font-mono text-[12px] text-zinc-300">🆔 {p.telegramId}</p>
                <p className="text-[12px] text-zinc-300">{tx.accrued(p.earned)}</p>
                <p className="text-sm font-bold text-sky-100">{tx.available(p.stars)}</p>
                <p className="text-[12px] text-zinc-300">{tx.refs(p.successful)}</p>
                <p className="text-[11px] text-zinc-500">
                  {new Date(p.createdAt).toLocaleString()} · #{p.block} · {tx.st[p.status]}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <a href={profileUrl(p)} target="_blank" rel="noreferrer" className="min-h-10 rounded-lg border border-white/15 px-2 py-2 text-center text-[11px] font-black text-zinc-100">
                    {tx.open}
                  </a>
                  <button
                    type="button"
                    className="min-h-10 rounded-lg border border-white/15 px-2 text-[11px] font-black text-zinc-100"
                    onClick={() => {
                      void navigator.clipboard?.writeText(String(p.telegramId)).then(() => setMsg(tx.copied))
                    }}
                  >
                    {tx.copy}
                  </button>
                  <button type="button" disabled={busy !== null} className="payout-paid min-h-10 rounded-lg bg-emerald-300 px-2 text-[11px] font-black text-zinc-950 disabled:opacity-50" onClick={() => void act(p, 'paid')}>
                    {tx.paid}
                  </button>
                  <button type="button" disabled={busy !== null} className="payout-cancel min-h-10 rounded-lg border border-red-400/50 px-2 text-[11px] font-black text-red-200 disabled:opacity-50" onClick={() => void act(p, 'cancel')}>
                    {tx.cancel}
                  </button>
                </div>
              </li>
            ))
          ) : (
            <li className="text-[12px] text-zinc-500">{tx.empty}</li>
          )}
        </ul>
      </section>
      <section className="payout-accruing rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-200">{tx.accruing}</h3>
        <ul className="mt-2 space-y-1">
          {data.accruing.length ? (
            data.accruing.map((a) => (
              <li key={a.telegramId} className="rounded-lg bg-black/30 px-3 py-1.5 text-[12px] text-zinc-300">
                <b className="text-zinc-100">{a.username ? `@${a.username}` : a.name ?? '—'}</b> · {a.telegramId} · {tx.accRow(a.successful, a.earned, a.balance, sm.block)}
              </li>
            ))
          ) : (
            <li className="text-[12px] text-zinc-500">{tx.empty}</li>
          )}
        </ul>
      </section>
      <section className="payout-history rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-200">{tx.history}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(['READY_FOR_PAYOUT', 'PENDING', 'PAID', 'CANCELLED', 'ALL'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-[11px] font-black ${filter === f ? 'bg-amber-300 text-zinc-950' : 'border border-white/15 text-zinc-300'}`}
            >
              {tx.filters[f]}
            </button>
          ))}
        </div>
        <ul className="mt-3 space-y-1.5">
          {history.length ? (
            history.map((p) => (
              <li key={p.id} className="rounded-lg bg-black/30 px-3 py-2 text-[12px] text-zinc-300">
                <p className="font-bold text-zinc-100">
                  {tx.st[p.status]} · ⭐{p.stars} · {who(p)}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {new Date(p.paidAt ?? p.cancelledAt ?? p.requestedAt ?? p.createdAt).toLocaleString()} · #{p.block} · {tx.refs(p.referralCount)}
                  {p.paidBy || p.cancelledBy ? ` · ${tx.by}: ${p.paidBy ?? p.cancelledBy}` : ''}
                  {p.cancelReason ? ` · ${p.cancelReason}` : ''}
                  {p.status === 'PAID' && p.notifyResult ? ` · ${tx.notified(p.notifyResult)}` : ''}
                </p>
              </li>
            ))
          ) : (
            <li className="text-[12px] text-zinc-500">{tx.empty}</li>
          )}
        </ul>
        {data.legacy.length ? (
          <>
            <p className="mt-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-zinc-500">{tx.legacy}</p>
            <ul className="mt-1 space-y-1">
              {data.legacy.map((l) => (
                <li key={l.id} className="text-[11px] text-zinc-500">
                  {new Date(l.createdAt).toLocaleString()} · {l.usernameSnapshot ? `@${l.usernameSnapshot}` : l.recipientTelegramId} · ⭐{l.rewardStars} · {l.role} · {l.status}
                  {l.cancelReason ? ` · ${l.cancelReason}` : ''}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </>
  )
}
