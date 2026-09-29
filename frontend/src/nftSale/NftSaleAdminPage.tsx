import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

type AdminOrder = {
  id: string
  telegramUserId: number
  walletAddress: string
  walletFriendly: string
  nftId: number
  status: string
  provider: string
  providerOrderId?: string
  paymentId?: string
  paymentStatus?: string
  createdAt: number
  paidAt?: number
  deliveredAt?: number
  itemAddress?: string
  txHash?: string
  paymentTxHash?: string
  mintTxHash?: string
  itemTxHash?: string
  mintWarning?: string
  error?: string
  attempts: number
  history: { status: string; at: number; note?: string }[]
}
type Links = { item: string | null; collection: string | null; paymentTx: string | null; mintTx: string | null; itemTx: string | null }
type Overview = {
  enabled: boolean
  network: string
  environment: string
  testPayments: boolean
  chain: { ready: boolean; mode: string; reason?: string }
  minter: { address: string; balance: string; seqno: number; explorerUrl: string | null } | null
  collection: string | null
  collectionUrl: string | null
  lastTestMint: { orderId: string; edition: number; owner: string; deliveredAt: number | null; itemAddress: string | null; links: Links } | null
  lastTransaction: { orderId: string; hash: string; links: Links } | null
  inventory: { supply: number; available: number; reserved: number; minting: number; delivered: number; failed: number }
  orders: { total: number; byStatus: Record<string, number> }
  revenue: { note: string }
  funnel: Record<string, number>
  list: AdminOrder[]
}

const FILTERS = ['ALL', 'PENDING', 'PAID', 'MINTING', 'DELIVERED', 'FAILED'] as const
/** PENDING in the admin = everything still waiting for payment. */
const matches = (f: (typeof FILTERS)[number], s: string) =>
  f === 'ALL' || (f === 'PENDING' ? ['PENDING', 'RESERVED', 'PAYMENT_PENDING'].includes(s) : f === 'MINTING' ? ['MINTING', 'DELIVERING', 'OWNER_VERIFIED'].includes(s) : s === f)
const time = (t?: number) => (t ? new Date(t).toLocaleString() : '—')

/** 🖼 NFT SALE ADMIN (testnet). Read + retry delivery (idempotent) + test refund. */
export function NftSaleAdminPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL')
  const [openId, setOpenId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [verify, setVerify] = useState<{ title: string; body: unknown } | null>(null)

  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get<Overview>('/admin/nft-sale/overview')
      setData(d)
    } catch {
      setMsg('Не удалось загрузить NFT SALE')
    }
  }, [])
  useEffect(() => {
    void load()
    const id = window.setInterval(() => void load(), 10_000)
    return () => window.clearInterval(id)
  }, [load])

  const act = async (path: string, label: string) => {
    setBusy(true)
    setMsg(null)
    try {
      await api.post(path, {})
      setMsg(`${label}: OK`)
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } }
      setMsg(`${label}: ${e.response?.data?.error ?? 'error'}`)
    } finally {
      setBusy(false)
      void load()
    }
  }

  const runVerify = async (path: string, title: string) => {
    setBusy(true)
    setVerify({ title, body: 'Проверяем блокчейн…' })
    try {
      const { data: v } = await api.post(path, {})
      setVerify({ title, body: v })
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } }
      setVerify({ title, body: { error: e.response?.data?.error ?? 'error' } })
    } finally {
      setBusy(false)
    }
  }
  const linkRow = (l?: Links | null) =>
    l ? (
      <span className="flex flex-wrap gap-x-3">
        {l.item ? <a href={l.item} target="_blank" rel="noreferrer" className="text-amber-300 underline">NFT ↗</a> : null}
        {l.paymentTx ? <a href={l.paymentTx} target="_blank" rel="noreferrer" className="text-amber-300 underline">payment tx ↗</a> : null}
        {l.mintTx ? <a href={l.mintTx} target="_blank" rel="noreferrer" className="text-amber-300 underline">mint tx ↗</a> : null}
        {l.itemTx ? <a href={l.itemTx} target="_blank" rel="noreferrer" className="text-amber-300 underline">transfer tx ↗</a> : null}
      </span>
    ) : null

  if (!data) return <p className="text-sm text-zinc-400">{msg ?? 'Загрузка…'}</p>
  const inv = data.inventory
  const stat = (label: string, v: number | string) => (
    <div className="rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2">
      <p className="text-[10px] font-bold tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="font-display text-lg font-black text-zinc-100">{v}</p>
    </div>
  )
  const list = data.list.filter((o) => matches(filter, o.status))

  return (
    <div className="nfts-admin space-y-3">
      <section className="rounded-2xl border border-amber-400/30 bg-zinc-900/80 p-4 text-sm">
        <p className="font-display text-base font-black text-amber-100">🖼 NFT SALE · {data.network.toUpperCase()}</p>
        <p className="mt-1 text-zinc-400">
          Продажа: <b className={data.enabled ? 'text-emerald-300' : 'text-zinc-300'}>{data.enabled ? 'ВКЛ (NFT_SALE_ENABLED)' : 'ВЫКЛ'}</b> · Mainnet: <b className="text-orange-300">заблокирован</b> · Реальные платежи: <b className="text-orange-300">заблокированы</b>
        </p>
        <p className="text-zinc-400">
          Среда: <b>{data.environment}</b> · TEST PAYMENT: <b className={data.testPayments ? 'text-amber-300' : 'text-zinc-300'}>{data.testPayments ? 'доступен' : 'отключён'}</b>
        </p>
        <p className="text-zinc-400">
          Chain: {data.chain.mode} · {data.chain.ready ? <span className="text-emerald-300">готов</span> : <span className="text-orange-300">{data.chain.reason}</span>}
        </p>
        {data.minter ? (
          <p className="break-all font-mono text-[11px] text-zinc-500">
            Minter {data.minter.address} · {data.minter.balance} TON (testnet) · seqno {data.minter.seqno}{' '}
            {data.minter.explorerUrl ? <a href={data.minter.explorerUrl} target="_blank" rel="noreferrer" className="text-amber-300 underline">explorer ↗</a> : null}
          </p>
        ) : null}
        <p className="break-all font-mono text-[11px] text-zinc-500">
          Collection {data.collection ?? '—'} {data.collectionUrl ? <a href={data.collectionUrl} target="_blank" rel="noreferrer" className="text-amber-300 underline">explorer ↗</a> : null}
        </p>
        {data.lastTestMint ? (
          <p className="break-all text-[11px] text-zinc-400">
            Last test mint: #{data.lastTestMint.edition} → {data.lastTestMint.owner} · {time(data.lastTestMint.deliveredAt ?? undefined)} {linkRow(data.lastTestMint.links)}
          </p>
        ) : null}
        {data.lastTransaction ? (
          <p className="break-all font-mono text-[11px] text-zinc-500">Last transaction: {data.lastTransaction.hash}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" disabled={busy || !data.collection} onClick={() => runVerify('/admin/nft-sale/verify/collection', 'VERIFY TESTNET COLLECTION')} className="nfts-verify-collection rounded-xl border border-amber-400/50 px-3 py-2 text-xs font-black text-amber-100 disabled:opacity-50">
            VERIFY TESTNET COLLECTION
          </button>
          <button type="button" disabled={busy || !data.orders.total} onClick={() => runVerify('/admin/nft-sale/verify/nft', 'VERIFY TEST NFT')} className="nfts-verify-nft rounded-xl border border-amber-400/50 px-3 py-2 text-xs font-black text-amber-100 disabled:opacity-50">
            VERIFY TEST NFT
          </button>
        </div>
        {verify ? (
          <div className="nfts-verify-result mt-2 rounded-xl border border-white/10 bg-black/40 p-2">
            <p className="text-[11px] font-black text-amber-200">{verify.title}</p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all text-[10px] text-zinc-300">{typeof verify.body === 'string' ? verify.body : JSON.stringify(verify.body, null, 2)}</pre>
          </div>
        ) : null}
        {data.chain.reason === 'collection_not_deployed' ? (
          <button type="button" disabled={busy} onClick={() => act('/admin/nft-sale/collection/deploy', 'Deploy collection')} className="mt-2 rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-zinc-950 disabled:opacity-60">
            Deploy testnet collection
          </button>
        ) : null}
        <p className="mt-1 text-[11px] font-bold text-amber-300">{data.revenue.note}</p>
      </section>

      <div className="grid grid-cols-3 gap-2">
        {stat('SUPPLY', inv.supply)}
        {stat('AVAILABLE', inv.available)}
        {stat('RESERVED', inv.reserved)}
        {stat('MINTING', inv.minting)}
        {stat('DELIVERED', inv.delivered)}
        {stat('FAILED', inv.failed)}
      </div>
      {stat('ORDERS', data.orders.total)}

      {Object.keys(data.funnel).length ? (
        <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-3 text-[12px] text-zinc-400">
          <p className="mb-1 font-bold text-zinc-300">Analytics (events)</p>
          {Object.entries(data.funnel).map(([k, v]) => (
            <p key={k} className="flex justify-between font-mono">
              <span>{k}</span>
              <span className="text-zinc-200">{v}</span>
            </p>
          ))}
        </section>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-[11px] font-bold ${filter === f ? 'bg-amber-400 text-zinc-950' : 'border border-white/15 text-zinc-300'}`}>
            {f}
          </button>
        ))}
      </div>
      {msg ? <p className="text-sm text-amber-200">{msg}</p> : null}

      {list.map((o) => (
        <section key={o.id} className="nfts-admin-order rounded-2xl border border-white/10 bg-zinc-900/80 p-3 text-[12px]" data-order={o.id}>
          <button type="button" onClick={() => setOpenId(openId === o.id ? null : o.id)} className="flex w-full items-center justify-between text-left">
            <span className="font-display font-black text-zinc-100">#{o.nftId}</span>
            <span className="font-mono text-zinc-400">{o.status}</span>
          </button>
          {openId === o.id ? (
            <div className="mt-2 space-y-0.5 break-all text-zinc-400">
              <p>Order: <span className="font-mono">{o.id}</span></p>
              <p>Telegram ID: <span className="font-mono">{o.telegramUserId}</span></p>
              <p>Wallet: <span className="font-mono">{o.walletFriendly}</span></p>
              <p>NFT: #{o.nftId} / 2000</p>
              <p>Payment: {o.provider} · {o.paymentId ?? '—'} · {o.paymentStatus ?? '—'}</p>
              <p>Payment tx: <span className="font-mono">{o.paymentTxHash ?? '—'}</span></p>
              <p>Mint tx: <span className="font-mono">{o.mintTxHash ?? '—'}</span></p>
              <p>Tx hash: <span className="font-mono">{o.itemTxHash ?? o.txHash ?? '—'}</span></p>
              {o.mintWarning ? <p className="text-amber-300">Mint: {o.mintWarning} (не доставлен)</p> : null}
              <p>Item: <span className="font-mono">{o.itemAddress ?? '—'}</span></p>
              <p>Created {time(o.createdAt)} · Paid {time(o.paidAt)} · Delivered {time(o.deliveredAt)} · attempts {o.attempts}</p>
              {o.error ? <p className="text-orange-300">Error: {o.error}</p> : null}
              <p className="text-zinc-500">{o.history.map((h) => `${h.status}${h.note ? ` (${h.note})` : ''}`).join(' → ')}</p>
              {o.status === 'FAILED' && o.paymentStatus === 'PAID' ? (
                <div className="mt-2 flex gap-2">
                  {o.error !== 'paid_after_expiry' ? (
                    <button type="button" disabled={busy} onClick={() => act(`/admin/nft-sale/orders/${o.id}/retry`, 'RETRY DELIVERY')} className="nfts-retry rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-zinc-950 disabled:opacity-60">
                      RETRY DELIVERY
                    </button>
                  ) : null}
                  <button type="button" disabled={busy} onClick={() => act(`/admin/nft-sale/orders/${o.id}/refund`, 'REFUND (TEST)')} className="rounded-xl border border-white/20 px-3 py-2 text-xs font-bold text-zinc-200 disabled:opacity-60">
                    REFUND (TEST)
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ))}
      {!list.length ? <p className="text-sm text-zinc-500">—</p> : null}
    </div>
  )
}
