import { useEffect, useState } from 'react'
import { api } from '../../api/client'

/**
 * ⭐ Referral Stars payouts. The operator sends the Stars by hand from their own Telegram balance,
 * then marks the record PAID here (once — the server refuses a second payout). The recipient is
 * always the Telegram id; the username is only a snapshot for convenience.
 */
type Status = 'PENDING' | 'PAID' | 'CANCELLED'
type Reward = {
  id: string
  recipientTelegramId: number
  usernameSnapshot: string | null
  nameSnapshot: string | null
  rewardStars: number
  role: 'inviter' | 'invitee'
  referralId: string
  status: Status
  createdAt: number
  verifiedAt: number
  paidAt?: number
  paidBy?: string
  cancelledAt?: number
  cancelledBy?: string
  cancelReason?: string
  notifyResult?: string
}
type Data = { summary: { pendingCount: number; pendingStars: number; paidCount: number; paidStars: number; cancelledCount: number }; rewards: Reward[] }

const T = {
  ru: {
    title: '⭐ ВЫПЛАТЫ STARS',
    note: 'Отправь Stars вручную со своего Telegram-баланса, затем отметь выплату здесь.',
    pending: (n: number) => `Ожидают выплат: ${n}`,
    total: (n: number) => `Всего Stars к выплате: ⭐${n}`,
    operator: 'Оператор (кто отмечает выплаты)',
    empty: 'Нет выплат в этом списке.',
    open: 'ОТКРЫТЬ ПРОФИЛЬ',
    copy: 'СКОПИРОВАТЬ ID',
    copied: 'ID скопирован',
    paid: '✓ STARS ОТПРАВЛЕНЫ',
    cancel: 'ОТМЕНИТЬ',
    confirm: (n: number, who: string) => `Вы действительно отправили ⭐${n} Stars этому пользователю?\n\n${who}`,
    reason: 'Причина отмены (необязательно):',
    role: { inviter: 'пригласил друга', invitee: 'новый игрок' },
    st: { PENDING: '🟡 ОЖИДАЕТ', PAID: '✓ ВЫПЛАЧЕНО', CANCELLED: '❌ ОТМЕНЕНО' } as Record<Status, string>,
    history: '⭐ ИСТОРИЯ ВЫПЛАТ',
    filters: { PENDING: 'ОЖИДАЮТ', PAID: 'ВЫПЛАЧЕНО', CANCELLED: 'ОТМЕНЕНО', ALL: 'ВСЕ' },
    by: 'оператор',
    notified: (r?: string) => (r === 'sent' ? 'уведомление отправлено' : r ? `уведомление: ${r}` : ''),
    err: (e: string) => (e === 'already_paid' ? 'Уже выплачено — повторная выплата заблокирована' : e === 'already_cancelled' ? 'Запись уже отменена' : `Ошибка: ${e}`),
  },
  en: {
    title: '⭐ STARS PAYOUTS',
    note: 'Send the Stars by hand from your own Telegram balance, then mark the payout here.',
    pending: (n: number) => `Awaiting payout: ${n}`,
    total: (n: number) => `Total Stars to pay: ⭐${n}`,
    operator: 'Operator (who marks payouts)',
    empty: 'No payouts in this list.',
    open: 'OPEN PROFILE',
    copy: 'COPY ID',
    copied: 'ID copied',
    paid: '✓ STARS SENT',
    cancel: 'CANCEL',
    confirm: (n: number, who: string) => `Did you really send ⭐${n} Stars to this user?\n\n${who}`,
    reason: 'Cancel reason (optional):',
    role: { inviter: 'invited a friend', invitee: 'new player' },
    st: { PENDING: '🟡 PENDING', PAID: '✓ PAID', CANCELLED: '❌ CANCELLED' } as Record<Status, string>,
    history: '⭐ PAYOUT HISTORY',
    filters: { PENDING: 'PENDING', PAID: 'PAID', CANCELLED: 'CANCELLED', ALL: 'ALL' },
    by: 'operator',
    notified: (r?: string) => (r === 'sent' ? 'notification sent' : r ? `notification: ${r}` : ''),
    err: (e: string) => (e === 'already_paid' ? 'Already paid — a second payout is blocked' : e === 'already_cancelled' ? 'Already cancelled' : `Error: ${e}`),
  },
}

const OP_KEY = 'duckjackpot.admin.operator'
const who = (r: Reward) => `${r.usernameSnapshot ? `@${r.usernameSnapshot}` : r.nameSnapshot ?? '—'} · ID ${r.recipientTelegramId}`
const profileUrl = (r: Reward) => (r.usernameSnapshot ? `https://t.me/${r.usernameSnapshot}` : `tg://user?id=${r.recipientTelegramId}`)

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
      .get<Data>('/admin/stars-rewards')
      .then((r) => setData(r.data))
      .catch(() => setData(null))
  useEffect(() => {
    void load()
  }, [])
  const act = async (r: Reward, kind: 'paid' | 'cancel') => {
    if (busy) return
    if (kind === 'paid' && !window.confirm(tx.confirm(r.rewardStars, who(r)))) return
    let reason: string | null = null
    if (kind === 'cancel') {
      reason = window.prompt(tx.reason, '')
      if (reason === null) return
    }
    setBusy(r.id)
    setMsg(null)
    try {
      await api.post(`/admin/stars-rewards/${r.id}/${kind}`, kind === 'paid' ? { confirm: true, operator } : { operator, reason })
    } catch (err) {
      const e = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'error'
      setMsg(tx.err(e))
    } finally {
      setBusy(null)
      void load()
    }
  }
  if (!data) return null
  const pending = data.rewards.filter((r) => r.status === 'PENDING')
  const history = data.rewards.filter((r) => filter === 'ALL' || r.status === filter)
  return (
    <>
      <section className="stars-payouts rounded-2xl border border-sky-300/40 bg-zinc-900/80 p-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-200">{tx.title}</h3>
        <p className="mt-1 text-[12px] text-zinc-400">{tx.note}</p>
        <p className="mt-2 text-sm font-bold text-amber-100">{tx.pending(data.summary.pendingCount)}</p>
        <p className="text-sm font-bold text-amber-100">{tx.total(data.summary.pendingStars)}</p>
        <label className="mt-2 block text-[11px] text-zinc-400">
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
          {pending.length ? (
            pending.map((r) => (
              <li key={r.id} className="payout-row rounded-xl border border-white/10 bg-black/30 p-3">
                <p className="text-sm font-black text-zinc-100">👤 {r.usernameSnapshot ? `@${r.usernameSnapshot}` : r.nameSnapshot ?? '—'}</p>
                <p className="font-mono text-[12px] text-zinc-300">🆔 {r.recipientTelegramId}</p>
                <p className="text-sm font-bold text-sky-100">
                  ⭐ {r.rewardStars} Stars · {tx.role[r.role]}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {new Date(r.verifiedAt).toLocaleString()} · {r.referralId} · {tx.st[r.status]}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <a href={profileUrl(r)} target="_blank" rel="noreferrer" className="min-h-10 rounded-lg border border-white/15 px-2 py-2 text-center text-[11px] font-black text-zinc-100">
                    {tx.open}
                  </a>
                  <button
                    type="button"
                    className="min-h-10 rounded-lg border border-white/15 px-2 text-[11px] font-black text-zinc-100"
                    onClick={() => {
                      void navigator.clipboard?.writeText(String(r.recipientTelegramId)).then(() => setMsg(tx.copied))
                    }}
                  >
                    {tx.copy}
                  </button>
                  <button type="button" disabled={busy !== null} className="payout-paid min-h-10 rounded-lg bg-emerald-300 px-2 text-[11px] font-black text-zinc-950 disabled:opacity-50" onClick={() => void act(r, 'paid')}>
                    {tx.paid}
                  </button>
                  <button type="button" disabled={busy !== null} className="payout-cancel min-h-10 rounded-lg border border-red-400/50 px-2 text-[11px] font-black text-red-200 disabled:opacity-50" onClick={() => void act(r, 'cancel')}>
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
      <section className="payout-history rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-200">{tx.history}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(['PENDING', 'PAID', 'CANCELLED', 'ALL'] as const).map((f) => (
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
            history.map((r) => (
              <li key={r.id} className="rounded-lg bg-black/30 px-3 py-2 text-[12px] text-zinc-300">
                <p className="font-bold text-zinc-100">
                  {tx.st[r.status]} · ⭐{r.rewardStars} · {who(r)}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {new Date(r.paidAt ?? r.cancelledAt ?? r.createdAt).toLocaleString()} · {r.referralId}
                  {r.paidBy || r.cancelledBy ? ` · ${tx.by}: ${r.paidBy ?? r.cancelledBy}` : ''}
                  {r.cancelReason ? ` · ${r.cancelReason}` : ''}
                  {r.status === 'PAID' && r.notifyResult ? ` · ${tx.notified(r.notifyResult)}` : ''}
                </p>
              </li>
            ))
          ) : (
            <li className="text-[12px] text-zinc-500">{tx.empty}</li>
          )}
        </ul>
      </section>
    </>
  )
}
