import { useCallback, useEffect, useRef, useState } from 'react'
import { useTonConnectUI } from '@tonconnect/ui-react'
import { track, trackScreen } from '../analytics/track'
import { ScreenHeader } from '../components/ScreenHeader'
import { createOrder, orderStatus, saleConfig, saleMe, SaleApiError, shortAddress, testPay, verifyWallet, walletNonce, type SaleConfig, type SaleMe, type SaleOrder } from './api'
import { useSaleText } from './i18n'
import { NftCard, NftViewerOverlay } from './NftViewer'

const OPEN: SaleOrder['status'][] = ['PENDING', 'RESERVED', 'PAYMENT_PENDING', 'PAID', 'MINTING', 'DELIVERING']
const errCode = (e: unknown) => (e instanceof SaleApiError ? e.message : 'default')

function useCountdown(until: number | null) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!until) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [until])
  if (!until) return ''
  const s = Math.max(0, Math.round((until - now) / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Progress of one order: reserved → paid → mint → owner verified. Server statuses only. */
function OrderSteps({ order }: { order: SaleOrder }) {
  const { d } = useSaleText()
  // how many steps are complete; the next one pulses while the server works on it
  const doneCount: Record<SaleOrder['status'], number> = { PENDING: 0, RESERVED: 1, PAYMENT_PENDING: 1, PAID: 2, MINTING: 2, DELIVERING: 3, DELIVERED: 4, FAILED: 0, REFUNDED: 0 }
  const n = doneCount[order.status]
  const working = order.status === 'PAID' || order.status === 'MINTING' || order.status === 'DELIVERING'
  const steps = [d.stepReserved, d.stepPaid, d.stepMint, d.stepOwner]
  return (
    <div className="mt-3 space-y-2">
      {steps.map((label, i) => {
        const done = i < n
        const active = working && i === n
        return (
          <p key={label} className={`nfts-step ${done ? 'is-done' : active ? 'is-active' : ''}`}>
            <span className="nfts-dot" />
            {label}
          </p>
        )
      })}
    </div>
  )
}

export function NftSalePage() {
  const { d, err, fmt } = useSaleText()
  const [tonConnectUI] = useTonConnectUI()
  const [config, setConfig] = useState<SaleConfig | null>(null)
  const [me, setMe] = useState<SaleMe | null>(null)
  const [order, setOrder] = useState<SaleOrder | null>(null)
  const [busy, setBusy] = useState<'connect' | 'buy' | 'pay' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewer, setViewer] = useState<SaleOrder | null>(null)
  const awaitingProof = useRef(false)
  const left = useCountdown(order && (order.status === 'RESERVED' || order.status === 'PAYMENT_PENDING') ? order.reservedUntil : null)

  const refresh = useCallback(async () => {
    const c = await saleConfig(true)
    setConfig(c)
    if (!c.enabled) return
    try {
      const m = await saleMe()
      setMe(m)
      setOrder((cur) => cur ?? m.orders.find((o) => OPEN.includes(o.status)) ?? null)
    } catch (e) {
      setError(errCode(e))
    }
  }, [])

  useEffect(() => {
    trackScreen('nft_sale_open')
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (config?.enabled) trackScreen('nft_product_view', { edition: config.nextNumber ?? 0 })
  }, [config])

  // ton_proof: the wallet answers the server nonce; only a proof the SERVER verified links the wallet
  useEffect(() => {
    const offStatus = tonConnectUI.onStatusChange((w) => {
      if (!awaitingProof.current || !w) return
      awaitingProof.current = false
      tonConnectUI.setConnectRequestParameters(null)
      const tp = w.connectItems?.tonProof
      if (!tp || !('proof' in tp)) {
        setBusy(null)
        setError('proof_rejected')
        return
      }
      void verifyWallet({
        account: { address: w.account.address, chain: w.account.chain, publicKey: w.account.publicKey, walletStateInit: w.account.walletStateInit },
        proof: tp.proof,
        walletApp: w.device.appName,
      })
        .then(() => refresh())
        .catch((e) => setError(errCode(e)))
        .finally(() => setBusy(null))
    })
    const offModal = tonConnectUI.onModalStateChange((s) => {
      if (s.status === 'closed' && awaitingProof.current && !tonConnectUI.connected) {
        awaitingProof.current = false
        tonConnectUI.setConnectRequestParameters(null)
        setBusy(null)
      }
    })
    return () => {
      offStatus()
      offModal()
    }
  }, [tonConnectUI, refresh])

  const connect = async () => {
    setError(null)
    setBusy('connect')
    track('nft_wallet_connect_started')
    try {
      // a proof is only given at connect time: reconnect if a wallet is already connected
      if (tonConnectUI.connected) await tonConnectUI.disconnect()
      tonConnectUI.setConnectRequestParameters({ state: 'loading' })
      const { payload } = await walletNonce()
      tonConnectUI.setConnectRequestParameters({ state: 'ready', value: { tonProof: payload } })
      awaitingProof.current = true
      await tonConnectUI.openModal()
    } catch (e) {
      awaitingProof.current = false
      tonConnectUI.setConnectRequestParameters(null)
      setError(errCode(e))
      setBusy(null)
    }
  }

  const buy = async () => {
    setError(null)
    setBusy('buy')
    try {
      const r = await createOrder()
      setOrder(r.order)
    } catch (e) {
      setError(errCode(e))
    } finally {
      setBusy(null)
    }
  }

  const pay = async (outcome: 'PAID' | 'FAILED') => {
    if (!order) return
    setError(null)
    setBusy('pay')
    track('nft_payment_started', { orderId: order.id, edition: order.nftId })
    try {
      const r = await testPay(order.id, outcome)
      setOrder(r.order)
    } catch (e) {
      setError(errCode(e))
    } finally {
      setBusy(null)
    }
  }

  // follow the order on the server until it is final
  useEffect(() => {
    if (!order || !OPEN.includes(order.status) || order.status === 'PAYMENT_PENDING' || order.status === 'RESERVED') return
    const id = window.setInterval(() => {
      void orderStatus(order.id)
        .then((r) => {
          setOrder(r.order)
          if (r.order.status === 'DELIVERED') void refresh()
        })
        .catch(() => undefined)
    }, 2500)
    return () => window.clearInterval(id)
  }, [order, refresh])

  if (!config) return <section className="px-4 pb-6"><ScreenHeader kicker={d.kicker} title={d.title} /></section>

  if (!config.enabled) {
    return (
      <section className="px-4 pb-6">
        <ScreenHeader kicker="NFT SALE" title={d.title} />
        <div className="mt-6 rounded-2xl border border-amber-400/25 bg-[#141009] p-5 text-center">
          <p className="font-display text-xl font-black text-amber-100">{d.soon}</p>
          <p className="mt-2 text-sm text-zinc-400">{d.soonHint}</p>
        </div>
      </section>
    )
  }

  const wallet = me?.wallet ?? null
  const showEdition = order && !['DELIVERED', 'FAILED', 'REFUNDED'].includes(order.status) ? order.nftId : order?.status === 'DELIVERED' ? order.nftId : config.nextNumber
  const finished = order && ['DELIVERED', 'FAILED', 'REFUNDED'].includes(order.status)

  return (
    <section className="overflow-x-hidden px-4 pb-6">
      <ScreenHeader kicker={d.kicker} title={d.title} />
      <p className="mt-3 rounded-xl border border-amber-300/30 bg-amber-400/[0.07] px-3 py-2 text-[12px] font-semibold text-amber-100/90">⚠️ {d.testnetBanner}</p>

      <div className="mx-auto mt-4 max-w-[22rem]">
        <NftCard edition={showEdition ?? null} supply={config.supply} onOpen={order?.status === 'DELIVERED' ? () => setViewer(order) : undefined} />
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-[#141218] px-4 py-3">
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.18em] text-amber-200/70">{d.price}</p>
          <p className="font-display text-base font-black text-amber-50">{config.priceLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-extrabold tracking-[0.18em] text-amber-200/70">{d.next}</p>
          <p className="font-display text-base font-black text-amber-50">{config.nextNumber ? `#${config.nextNumber} / ${config.supply}` : '—'}</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-zinc-500">{d.collectible}</p>

      {/* wallet */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-[#141218] p-4">
        {wallet ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold tracking-[0.18em] text-amber-200/70">{d.wallet}</p>
              <p className="nfts-wallet truncate font-mono text-sm text-amber-50">{shortAddress(wallet.address)}</p>
              <p className="text-[10px] font-bold text-emerald-300">✓ ton_proof · TESTNET</p>
            </div>
            <button type="button" disabled={busy !== null} onClick={connect} className="shrink-0 text-[11px] font-bold text-zinc-400 underline decoration-zinc-600">
              {d.changeWallet}
            </button>
          </div>
        ) : (
          <>
            <button type="button" disabled={busy !== null} onClick={connect} className="buy-btn nfts-connect min-h-12 w-full rounded-2xl px-3 font-display text-[1.05rem] font-black tracking-[0.08em] text-zinc-950 disabled:opacity-70">
              {busy === 'connect' ? d.connecting : d.connect}
            </button>
            <p className="mt-2 text-center text-[11px] text-zinc-500">{d.connectHint}</p>
          </>
        )}
      </div>

      {/* order */}
      {wallet && (!order || finished) ? (
        <button
          type="button"
          disabled={busy !== null || !config.nextNumber || !config.chainReady}
          onClick={buy}
          className="buy-btn nfts-buy mt-4 min-h-[3.5rem] w-full rounded-2xl px-3 font-display text-[1.25rem] font-black tracking-[0.1em] text-zinc-950 disabled:opacity-60"
        >
          {busy === 'buy' ? d.buying : !config.nextNumber ? d.soldOut : d.buy}
        </button>
      ) : null}

      {order ? (
        <div className="nfts-order mt-4 rounded-2xl border border-amber-400/30 bg-[#16110c] p-4" data-status={order.status}>
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-display text-lg font-black text-amber-50">HEIST #{order.nftId}</p>
            <p className="text-[11px] font-extrabold tracking-[0.12em] text-amber-200">{d.statusName[order.status]}</p>
          </div>
          {left ? <p className="text-[12px] text-zinc-400">{fmt(d.reservedFor, { time: left })}</p> : null}
          {order.status !== 'FAILED' && order.status !== 'REFUNDED' ? <OrderSteps order={order} /> : null}

          {order.status === 'PAYMENT_PENDING' ? (
            <div className="mt-3 rounded-xl border border-dashed border-amber-300/40 p-3">
              <p className="text-[10px] font-extrabold tracking-[0.2em] text-amber-300">{d.testPayTitle}</p>
              {config.testPayments ? (
                <>
                  <p className="mt-1 text-[12px] text-zinc-400">{d.testPayHint}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" disabled={busy !== null} onClick={() => pay('PAID')} className="buy-btn nfts-testpay min-h-11 rounded-xl px-2 font-display text-[12px] font-black text-zinc-950 disabled:opacity-60">
                      {d.testPay}
                    </button>
                    <button type="button" disabled={busy !== null} onClick={() => pay('FAILED')} className="min-h-11 rounded-xl border border-white/15 px-2 text-[12px] font-bold text-zinc-300 disabled:opacity-60">
                      {d.testFail}
                    </button>
                  </div>
                </>
              ) : (
                <p className="mt-1 text-[12px] text-zinc-400">{d.testPayOff}</p>
              )}
            </div>
          ) : null}

          {order.status === 'DELIVERED' ? (
            <div className="mt-3">
              <p className="font-display text-base font-black text-emerald-300">✓ {d.delivered}</p>
              <p className="mt-1 break-all font-mono text-[11px] text-zinc-400">
                {d.owner}: {shortAddress(order.wallet)}
              </p>
              {order.explorerUrl ? (
                <a href={order.explorerUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[12px] font-bold text-amber-300 underline">
                  {d.viewOnTon} ↗
                </a>
              ) : null}
            </div>
          ) : null}
          {order.status === 'FAILED' ? (
            <p className="mt-2 text-[12px] text-orange-300">
              {d.failed}: {order.error ?? '—'}. {d.retryLater}
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="nfts-error mt-3 text-center text-[12px] font-bold text-orange-300">{err(error)}</p> : null}
      {viewer ? <NftViewerOverlay nft={viewer} onClose={() => setViewer(null)} /> : null}
    </section>
  )
}
