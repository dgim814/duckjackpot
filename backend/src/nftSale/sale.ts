import { Address } from '@ton/core'
import { nftSaleFunnel, recordEvents } from '../analyticsStore.js'
import { COLLECTION_NAME, isProduction, mintConfirmTimeoutMs, NFT_SUPPLY, reservationTtlMs, saleEnabled, TEST_PRICE, testPaymentsAllowed } from './config.js'
import { chainStatus, getChain } from './chainService.js'
import { activeProvider, paymentProvider, PaymentProviderError } from './payments/provider.js'
import { testPaymentProvider } from './payments/testProvider.js'
import {
  allOrders,
  findOrderByProviderRef,
  getOrder,
  getWallet,
  inventoryCounts,
  nextAvailable,
  ordersOf,
  patchOrder,
  reserveOrder,
  transition,
  type NftOrder,
} from './store.js'

/**
 * NFT Sale core: order state machine, payment updates, delivery (mint) worker, reservation expiry.
 *
 *   PENDING → RESERVED → PAYMENT_PENDING → PAID → MINTING → DELIVERING → DELIVERED
 *                              ↘ FAILED (payment failed / reservation expired)   ↘ FAILED (mint) → [admin retry] → PAID
 *                                                                                  ↘ [admin refund] → REFUNDED
 * Inventory: AVAILABLE → RESERVED → MINTING → DELIVERED | FAILED (held for retry) | back to AVAILABLE.
 * Delivery = the item exists on-chain AND get_nft_data owner == the buyer's proven wallet.
 */

export class SaleError extends Error {
  constructor(
    readonly code: string,
    readonly http = 400,
  ) {
    super(code)
    this.name = 'SaleError'
  }
}

function track(telegramUserId: number, name: string, props?: Record<string, string | number>) {
  try {
    recordEvents(`tg:${telegramUserId}`, undefined, [{ name, props }])
  } catch {
    /* analytics never breaks the sale */
  }
}

// ---------- views (what a client may see) ----------

async function explorer(address?: string) {
  if (!address) return null
  try {
    return (await getChain()).explorerUrl(address)
  } catch {
    return null
  }
}

export async function userOrderView(o: NftOrder) {
  return {
    id: o.id,
    nftId: o.nftId,
    edition: `${o.nftId} / ${NFT_SUPPLY}`,
    status: o.status,
    network: o.network,
    wallet: o.walletFriendly,
    provider: o.provider,
    createdAt: o.createdAt,
    reservedUntil: o.reservedUntil,
    paidAt: o.paidAt ?? null,
    deliveredAt: o.deliveredAt ?? null,
    itemAddress: o.itemAddress ?? null,
    txHash: o.txHash ?? null,
    explorerUrl: o.status === 'DELIVERED' ? await explorer(o.itemAddress) : null,
    error: o.error ?? null,
  }
}

export async function publicConfig() {
  if (!saleEnabled()) return { enabled: false as const }
  const counts = inventoryCounts()
  const chain = await chainStatus()
  let collection: { address: string; explorerUrl: string | null } | null = null
  if (chain.ready) {
    const c = await getChain()
    const address = c.collectionAddress!.toString({ testOnly: true })
    collection = { address, explorerUrl: c.explorerUrl(address) }
  }
  return {
    enabled: true as const,
    phase: 1,
    network: 'testnet' as const,
    name: COLLECTION_NAME,
    supply: NFT_SUPPLY,
    available: counts.available,
    nextNumber: nextAvailable(),
    priceLabel: 'TESTNET ONLY',
    testPayments: testPaymentsAllowed(),
    chainReady: chain.ready,
    collection,
  }
}

export async function myNftSale(telegramUserId: number) {
  const orders = ordersOf(telegramUserId)
  const wallet = getWallet(telegramUserId)
  return {
    wallet: wallet ? { address: wallet.friendly, network: wallet.network, verifiedAt: wallet.verifiedAt } : null,
    orders: await Promise.all(orders.slice(0, 20).map(userOrderView)),
    nfts: await Promise.all(orders.filter((o) => o.status === 'DELIVERED').map(userOrderView)),
  }
}

// ---------- orders ----------

export async function createOrder(telegramUserId: number) {
  const wallet = getWallet(telegramUserId)
  if (!wallet) throw new SaleError('wallet_not_verified', 403)
  let provider
  try {
    provider = activeProvider()
  } catch (err) {
    throw new SaleError(err instanceof PaymentProviderError ? err.code : 'payments_unavailable', 503)
  }
  const chain = await chainStatus()
  if (!chain.ready) throw new SaleError('chain_not_ready', 503)
  const r = await reserveOrder({
    telegramUserId,
    walletAddress: wallet.address,
    walletFriendly: wallet.friendly,
    provider: provider.id,
    price: TEST_PRICE.amount,
    currency: TEST_PRICE.currency,
    ttlMs: reservationTtlMs(),
  })
  if ('error' in r) throw new SaleError(r.error ?? 'sold_out', 409)
  if (r.existing) return { order: r.order, existing: true }
  track(telegramUserId, 'nft_order_created', { orderId: r.order.id, edition: r.order.nftId })
  try {
    const pay = await provider.createPayment({ orderId: r.order.id, telegramUserId, amount: r.order.price, currency: r.order.currency, description: `${COLLECTION_NAME} #${r.order.nftId} (testnet)` })
    const t = await transition(r.order.id, ['RESERVED'], 'PAYMENT_PENDING', { provider: provider.id, providerOrderId: pay.providerOrderId, paymentId: pay.paymentId, paymentStatus: 'PENDING' })
    return { order: t.order ?? r.order, existing: false }
  } catch (err) {
    console.error('[nft-sale] payment create failed', err instanceof Error ? err.message : err)
    await transition(r.order.id, ['RESERVED'], 'FAILED', { error: 'payment_create_failed' }, null)
    throw new SaleError('payment_create_failed', 503)
  }
}

/**
 * A payment changed at the provider (webhook, simulator or sweeper). The provider is ASKED for the
 * status; nothing in a webhook body is trusted. Safe to call any number of times.
 */
export async function handlePaymentUpdate(providerId: string, providerOrderId: string) {
  const order = findOrderByProviderRef(providerId, providerOrderId)
  if (!order) return { ok: false as const, reason: 'unknown_payment' }
  const provider = paymentProvider(providerId)
  const v = await provider.verifyPayment(providerOrderId, { orderId: order.id, amount: order.price, currency: order.currency })
  if (!v.ok) {
    console.warn('[nft-sale] payment verification refused', { orderId: order.id, reason: v.reason })
    return { ok: false as const, reason: v.reason ?? 'not_verified' }
  }
  if (v.status === 'PAID') {
    const t = await transition(order.id, ['RESERVED', 'PAYMENT_PENDING'], 'PAID', { paidAt: Date.now(), paymentStatus: 'PAID' }, 'MINTING')
    if (t.ok) {
      track(order.telegramUserId, 'nft_payment_confirmed', { orderId: order.id, edition: order.nftId })
      kickDelivery()
    } else if (t.order?.status === 'FAILED' && t.order.paymentStatus !== 'PAID') {
      // paid after the reservation expired: money must go back (admin refund), nothing is minted
      await patchOrder(order.id, { paymentStatus: 'PAID', error: 'paid_after_expiry' })
    }
    return { ok: true as const, status: (t.order ?? order).status }
  }
  if (v.status === 'FAILED') {
    const t = await transition(order.id, ['RESERVED', 'PAYMENT_PENDING'], 'FAILED', { paymentStatus: 'FAILED', error: 'payment_failed' }, null)
    if (t.ok) track(order.telegramUserId, 'nft_payment_failed', { orderId: order.id, edition: order.nftId })
    return { ok: true as const, status: (t.order ?? order).status }
  }
  if (v.status === 'REFUNDED' && order.paymentStatus !== 'REFUNDED') await patchOrder(order.id, { paymentStatus: 'REFUNDED' })
  return { ok: true as const, status: order.status }
}

/** TEST PAYMENT (dev/test only): the buyer's own order is paid or failed by the simulator. */
export async function simulateTestPayment(telegramUserId: number, orderId: string, outcome: 'PAID' | 'FAILED') {
  if (!testPaymentsAllowed()) throw new SaleError('test_provider_disabled_in_production', 403)
  const order = getOrder(orderId)
  if (!order || order.telegramUserId !== telegramUserId) throw new SaleError('not_found', 404)
  if (order.provider !== 'test' || !order.providerOrderId) throw new SaleError('not_a_test_order', 409)
  if (order.status !== 'PAYMENT_PENDING') throw new SaleError('not_payable', 409)
  try {
    await testPaymentProvider.simulate(order.providerOrderId, outcome)
  } catch (err) {
    throw new SaleError(err instanceof PaymentProviderError ? err.code : 'payment_error', 409)
  }
  await handlePaymentUpdate('test', order.providerOrderId)
  return getOrder(orderId)!
}

/** Unpaid reservations older than the TTL go back to AVAILABLE (after asking the provider once more). */
export async function expireReservations(now = Date.now()) {
  const due = allOrders().filter((o) => (o.status === 'RESERVED' || o.status === 'PAYMENT_PENDING') && o.reservedUntil <= now)
  for (const o of due) {
    try {
      if (o.providerOrderId) {
        const provider = paymentProvider(o.provider)
        try {
          await provider.cancel(o.providerOrderId)
        } catch {
          /* already paid or failed: the status below decides */
        }
        const st = await provider.getPaymentStatus(o.providerOrderId)
        if (st.status === 'PAID') {
          await handlePaymentUpdate(o.provider, o.providerOrderId)
          continue
        }
      }
      await transition(o.id, ['RESERVED', 'PAYMENT_PENDING'], 'FAILED', { error: 'reservation_expired', paymentStatus: o.providerOrderId ? 'FAILED' : undefined }, null)
    } catch (err) {
      console.error('[nft-sale] expiry failed', o.id, err instanceof Error ? err.message : err)
    }
  }
  return due.length
}

// ---------- delivery (mint) worker ----------

let running: Promise<void> | null = null
let again = false

/** Runs the delivery pass now (or right after the current one). One mint at a time: one wallet, one seqno. */
export function kickDelivery() {
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    do {
      again = false
      await processDeliveries()
    } while (again)
  })().finally(() => {
    running = null
  })
  return running
}

async function processDeliveries() {
  const todo = allOrders()
    .filter((o) => o.status === 'PAID' || o.status === 'MINTING' || o.status === 'DELIVERING')
    .sort((a, b) => (a.paidAt ?? 0) - (b.paidAt ?? 0))
  if (!todo.length) return
  let chain
  try {
    chain = await getChain()
  } catch (err) {
    console.error('[nft-sale] chain unavailable, delivery waits:', err instanceof Error ? err.message : err)
    return
  }
  for (const o of todo) {
    try {
      await processOrder(chain, o.id)
    } catch (err) {
      // network / indexer trouble: the order keeps its status and is retried on the next pass
      console.error('[nft-sale] delivery pass error', o.id, err instanceof Error ? err.message : err)
    }
  }
}

async function fail(o: NftOrder, error: string) {
  const t = await transition(o.id, ['PAID', 'MINTING', 'DELIVERING'], 'FAILED', { error }, 'FAILED')
  if (t.ok) track(o.telegramUserId, 'nft_delivery_failed', { orderId: o.id, edition: o.nftId, error })
}

async function deliver(chain: Awaited<ReturnType<typeof getChain>>, o: NftOrder, nft: { address: string; txHash: string | null }) {
  const d = await transition(o.id, ['PAID', 'MINTING'], 'DELIVERING', { itemAddress: nft.address, txHash: nft.txHash ?? undefined })
  if (!d.ok && d.order?.status !== 'DELIVERING') return
  track(o.telegramUserId, 'nft_mint_confirmed', { orderId: o.id, edition: o.nftId })
  // OWNER VERIFIED — re-read the chain right before marking the order delivered
  if (!(await chain.verifyOwnership(o.nftId, Address.parse(o.walletAddress)))) return fail(o, 'owner_not_verified')
  const done = await transition(o.id, ['DELIVERING'], 'DELIVERED', { deliveredAt: Date.now(), error: undefined }, 'DELIVERED')
  if (done.ok) track(o.telegramUserId, 'nft_delivery_success', { orderId: o.id, edition: o.nftId })
}

async function processOrder(chain: Awaited<ReturnType<typeof getChain>>, orderId: string) {
  const o = getOrder(orderId)
  if (!o) return
  const owner = Address.parse(o.walletAddress)
  if (o.status === 'DELIVERING') {
    const nft = await chain.getNFT(o.nftId)
    return nft.exists ? deliver(chain, o, nft) : fail(o, 'nft_missing')
  }
  // Before ANY mint: what does the chain say? (idempotent retry, no double mint)
  const nft = await chain.getNFT(o.nftId)
  if (nft.exists) {
    if (nft.owner === owner.toRawString()) return deliver(chain, o, nft)
    return fail(o, 'nft_exists_other_owner')
  }
  if (o.status === 'MINTING') {
    const since = o.mintSubmittedAt ?? o.mintStartedAt ?? o.updatedAt
    if (Date.now() - since < mintConfirmTimeoutMs()) return // SUBMITTED, not confirmed yet: wait
    return fail(o, o.mintSubmittedAt ? 'mint_not_confirmed' : 'mint_not_submitted')
  }
  // PAID and the item does not exist: mint it to the buyer's proven wallet
  const m = await transition(o.id, ['PAID'], 'MINTING', { mintStartedAt: Date.now(), attempts: o.attempts + 1 }, 'MINTING')
  if (!m.ok) return
  track(o.telegramUserId, 'nft_mint_started', { orderId: o.id, edition: o.nftId })
  const sub = await chain.mintNFT(o.nftId, owner)
  await patchOrder(o.id, { mintSeqno: sub.seqno, mintSubmittedAt: sub.submittedAt })
  // keep the lock until the wallet took this message, so the next mint gets the next seqno
  await chain.waitForSeqnoAbove(sub.seqno, 75_000)
  const confirmed = await chain.waitForConfirmation(o.nftId, owner, 30_000)
  if (confirmed) {
    if ('ownerMismatch' in confirmed) return fail(o, 'nft_exists_other_owner')
    return deliver(chain, o, confirmed)
  }
  // not visible yet: the next pass checks again until mintConfirmTimeoutMs
}

// ---------- admin ----------

export async function adminRetry(orderId: string) {
  const o = getOrder(orderId)
  if (!o) throw new SaleError('not_found', 404)
  if (o.status !== 'FAILED') throw new SaleError('not_failed', 409)
  if (o.paymentStatus !== 'PAID') throw new SaleError('not_paid', 409)
  if (o.error === 'paid_after_expiry') throw new SaleError('refund_required', 409)
  const t = await transition(o.id, ['FAILED'], 'PAID', { error: undefined }, 'MINTING', 'admin retry')
  if (!t.ok) throw new SaleError('not_failed', 409)
  await kickDelivery()
  return getOrder(orderId)!
}

export async function adminRefund(orderId: string) {
  const o = getOrder(orderId)
  if (!o) throw new SaleError('not_found', 404)
  if (o.status !== 'FAILED' || o.paymentStatus !== 'PAID' || !o.providerOrderId) throw new SaleError('not_refundable', 409)
  // never refund an edition that exists on-chain: retry delivery instead
  const chain = await getChain()
  if ((await chain.getNFT(o.nftId)).exists) throw new SaleError('nft_on_chain', 409)
  try {
    await paymentProvider(o.provider).refund(o.providerOrderId)
  } catch (err) {
    throw new SaleError(err instanceof PaymentProviderError ? err.code : 'refund_failed', 409)
  }
  const t = await transition(o.id, ['FAILED'], 'REFUNDED', { paymentStatus: 'REFUNDED' }, null)
  if (!t.ok) throw new SaleError('not_refundable', 409)
  return t.order!
}

export async function adminOverview(filter?: string) {
  const orders = allOrders()
  const list = filter && filter !== 'ALL' ? orders.filter((o) => o.status === filter) : orders
  const chain = await chainStatus()
  let minter: { address: string; balance: string; seqno: number } | null = null
  let collection: string | null = null
  if (chain.ready || chain.reason === 'collection_not_deployed') {
    try {
      const c = await getChain()
      const s = await c.minterState()
      minter = { address: s.address, balance: (Number(s.balance) / 1e9).toFixed(3), seqno: s.seqno }
      collection = c.collectionAddress?.toString({ testOnly: true }) ?? null
    } catch (err) {
      minter = null
      console.error('[nft-sale] admin chain read failed', err instanceof Error ? err.message : err)
    }
  }
  const byStatus: Record<string, number> = {}
  for (const o of orders) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1
  return {
    enabled: saleEnabled(),
    network: 'testnet',
    environment: isProduction() ? 'production' : 'non-production',
    testPayments: testPaymentsAllowed(),
    chain,
    minter,
    collection,
    inventory: inventoryCounts(),
    orders: { total: orders.length, byStatus },
    revenue: { testnet: true, real: 0, note: 'TESTNET / ZERO REAL REVENUE' },
    funnel: nftSaleFunnel('all').events,
    list: list.slice(0, 200),
  }
}

let timer: NodeJS.Timeout | null = null
/** Background pass: expiry + delivery. Runs even with the sale switched off, so paid orders finish. */
export function startNftSaleWorker(intervalMs = Number(process.env.NFT_WORKER_INTERVAL_MS ?? 5000)) {
  if (timer) return
  timer = setInterval(() => {
    void expireReservations()
      .then(() => kickDelivery())
      .catch((err) => console.error('[nft-sale] worker', err instanceof Error ? err.message : err))
  }, intervalMs)
  timer.unref()
}
