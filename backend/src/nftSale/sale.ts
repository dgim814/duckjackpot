import { Address } from '@ton/core'
import { nftSaleFunnel, recordEvents } from '../analyticsStore.js'
import {
  COLLECTION_NAME,
  isProduction,
  mintConfirmTimeoutMs,
  mintHardTimeoutMs,
  NFT_SUPPLY,
  PLACEHOLDER_NOTICE,
  reservationTtlMs,
  saleEnabled,
  TEST_PRICE,
  testnetPriceTon,
  testPaymentsAllowed,
  TESTNET_EXPLORER,
} from './config.js'
import { chainStatus, getChain } from './chainService.js'
import { collectionMetadataUrl, itemMetadataUrl } from './metadata.js'
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
 *   PENDING → RESERVED → PAYMENT_PENDING → PAID → MINTING → DELIVERING → OWNER_VERIFIED → DELIVERED
 *                              ↘ FAILED (payment failed / reservation expired)   ↘ FAILED (mint) → [admin retry] → PAID
 *                                                                                  ↘ [admin refund] → REFUNDED
 * Inventory: AVAILABLE → RESERVED → MINTING → DELIVERED | FAILED (held for retry) | back to AVAILABLE.
 * Delivery = the item exists on-chain AND get_nft_data owner == the buyer's proven wallet.
 * A submitted mint that is not visible yet stays MINTING (never delivered) until it appears or the
 * hard timeout; it is FAILED earlier only when the wallet provably never took the message.
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

/** Server analytics. Props never contain keys, mnemonics or provider secrets. */
function track(telegramUserId: number, name: string, props?: Record<string, string | number>) {
  try {
    recordEvents(`tg:${telegramUserId}`, undefined, [{ name, props }])
  } catch {
    /* analytics never breaks the sale */
  }
}
const shortAddr = (a?: string) => (a && a.length > 16 ? `${a.slice(0, 6)}…${a.slice(-6)}` : a ?? '')
function log(o: NftOrder, msg: string, extra: Record<string, unknown> = {}) {
  console.log(`[nft-sale] #${o.nftId} order ${o.id} ${msg}`, { wallet: shortAddr(o.walletFriendly), ...extra })
}

// ---------- views (what a client may see) ----------

type Chain = Awaited<ReturnType<typeof getChain>>
async function chainOrNull(): Promise<Chain | null> {
  try {
    return await getChain()
  } catch {
    return null
  }
}

function links(chain: Chain | null, o: NftOrder) {
  if (!chain || chain.backend.kind !== 'toncenter') return { item: null, collection: null, paymentTx: null, mintTx: null, itemTx: null }
  const collection = chain.collectionAddress?.toString({ testOnly: true })
  return {
    item: o.itemAddress ? chain.explorerUrl(o.itemAddress) : null,
    collection: collection ? chain.explorerUrl(collection) : null,
    paymentTx: o.paymentTxHash ? chain.txExplorerUrl(o.paymentTxHash) : null,
    mintTx: o.mintTxHash ? chain.txExplorerUrl(o.mintTxHash) : null,
    itemTx: o.itemTxHash ? chain.txExplorerUrl(o.itemTxHash) : null,
  }
}

export async function userOrderView(o: NftOrder) {
  const chain = await chainOrNull()
  const l = links(chain, o)
  return {
    id: o.id,
    nftId: o.nftId,
    edition: `${o.nftId} / ${NFT_SUPPLY}`,
    status: o.status,
    network: o.network,
    wallet: o.walletFriendly,
    provider: o.provider,
    price: o.price,
    currency: o.currency,
    createdAt: o.createdAt,
    reservedUntil: o.reservedUntil,
    paymentInstructions: o.status === 'PAYMENT_PENDING' ? o.paymentInstructions ?? null : null,
    paidAt: o.paidAt ?? null,
    deliveredAt: o.deliveredAt ?? null,
    itemAddress: o.itemAddress ?? null,
    collectionAddress: chain?.collectionAddress?.toString({ testOnly: true }) ?? null,
    paymentTxHash: o.paymentTxHash ?? null,
    mintTxHash: o.mintTxHash ?? null,
    txHash: o.itemTxHash ?? o.txHash ?? null,
    explorerUrl: o.status === 'DELIVERED' ? l.item : null,
    links: o.status === 'DELIVERED' ? l : { ...l, item: null, itemTx: null },
    metadataUrl: o.status === 'DELIVERED' ? itemMetadataUrl(o.nftId) : null,
    mintWarning: o.mintWarning ?? null,
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
  let provider: string | null = null
  try {
    provider = activeProvider().id
  } catch {
    provider = null
  }
  return {
    enabled: true as const,
    phase: 2,
    network: 'testnet' as const,
    networkLabel: 'TON TESTNET',
    name: COLLECTION_NAME,
    supply: NFT_SUPPLY,
    available: counts.available,
    nextNumber: nextAvailable(),
    priceLabel: 'TESTNET ONLY',
    artNotice: PLACEHOLDER_NOTICE,
    testPayments: testPaymentsAllowed(),
    provider,
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
    throw new SaleError(err instanceof PaymentProviderError ? err.code : err instanceof Error ? err.message : 'payments_unavailable', 503)
  }
  const chain = await chainStatus()
  if (!chain.ready) throw new SaleError('chain_not_ready', 503)
  const price = provider.id === 'ton_testnet' ? { amount: testnetPriceTon(), currency: 'TON_TESTNET' } : TEST_PRICE
  const r = await reserveOrder({
    telegramUserId,
    walletAddress: wallet.address,
    walletFriendly: wallet.friendly,
    provider: provider.id,
    price: price.amount,
    currency: price.currency,
    ttlMs: reservationTtlMs(),
  })
  if ('error' in r) throw new SaleError(r.error ?? 'sold_out', 409)
  if (r.existing) return { order: r.order, existing: true }
  track(telegramUserId, 'nft_sale_testnet_order_created', { orderId: r.order.id, edition: r.order.nftId })
  log(r.order, 'reserved')
  try {
    const pay = await provider.createPayment({
      orderId: r.order.id,
      telegramUserId,
      amount: r.order.price,
      currency: r.order.currency,
      description: `${COLLECTION_NAME} #${r.order.nftId} (testnet)`,
      payer: wallet.address,
      notAfter: r.order.reservedUntil,
    })
    const t = await transition(r.order.id, ['RESERVED'], 'PAYMENT_PENDING', {
      provider: provider.id,
      providerOrderId: pay.providerOrderId,
      paymentId: pay.paymentId,
      paymentStatus: 'PENDING',
      paymentInstructions: pay.instructions,
    })
    return { order: t.order ?? r.order, existing: false }
  } catch (err) {
    console.error('[nft-sale] payment create failed', err instanceof Error ? err.message : err)
    await transition(r.order.id, ['RESERVED'], 'FAILED', { error: 'payment_create_failed' }, null)
    throw new SaleError('payment_create_failed', 503)
  }
}

/**
 * A payment changed at the provider (chain scan, webhook, simulator or sweeper). The provider is
 * ASKED for the status; nothing a client or webhook body claims is trusted. Idempotent.
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
    const st = await provider.getPaymentStatus(providerOrderId)
    const t = await transition(order.id, ['RESERVED', 'PAYMENT_PENDING'], 'PAID', { paidAt: Date.now(), paymentStatus: 'PAID', paymentTxHash: st.txHash, paymentFrom: st.from }, 'MINTING')
    if (t.ok) {
      track(order.telegramUserId, 'nft_sale_testnet_payment_verified', { orderId: order.id, edition: order.nftId })
      log(order, 'payment verified', { tx: st.txHash })
      void kickDelivery()
    } else if (t.order?.status === 'FAILED' && t.order.paymentStatus !== 'PAID') {
      // paid after the reservation expired: money must go back (admin refund), nothing is minted
      await patchOrder(order.id, { paymentStatus: 'PAID', paymentTxHash: st.txHash, error: 'paid_after_expiry' })
    }
    return { ok: true as const, status: (t.order ?? order).status }
  }
  if (v.status === 'FAILED') {
    const t = await transition(order.id, ['RESERVED', 'PAYMENT_PENDING'], 'FAILED', { paymentStatus: 'FAILED', error: 'payment_failed' }, null)
    if (t.ok) track(order.telegramUserId, 'nft_sale_testnet_failed', { orderId: order.id, edition: order.nftId, error: 'payment_failed' })
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

/** The buyer says "I sent it": the server looks at the chain itself (the client's claim proves nothing). */
const lastCheck = new Map<string, number>()
export async function userCheckPayment(telegramUserId: number, orderId: string) {
  const order = getOrder(orderId)
  if (!order || order.telegramUserId !== telegramUserId) throw new SaleError('not_found', 404)
  if (order.status === 'PAYMENT_PENDING' && order.providerOrderId && Date.now() - (lastCheck.get(order.id) ?? 0) > 3000) {
    lastCheck.set(order.id, Date.now())
    await handlePaymentUpdate(order.provider, order.providerOrderId)
  }
  return getOrder(orderId)!
}

/** Worker: on-chain payments are found by polling the merchant wallet (no webhook for testnet). */
export async function checkPendingPayments() {
  const pending = allOrders().filter((o) => o.status === 'PAYMENT_PENDING' && o.provider === 'ton_testnet' && o.providerOrderId && o.reservedUntil > Date.now())
  for (const o of pending) {
    if (Date.now() - (lastCheck.get(o.id) ?? 0) < 8000) continue
    lastCheck.set(o.id, Date.now())
    try {
      await handlePaymentUpdate(o.provider, o.providerOrderId!)
    } catch (err) {
      console.error('[nft-sale] payment check failed', o.id, err instanceof Error ? err.message : err)
    }
  }
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

const IN_DELIVERY: NftOrder['status'][] = ['PAID', 'MINTING', 'DELIVERING', 'OWNER_VERIFIED']

async function processDeliveries() {
  const todo = allOrders()
    .filter((o) => IN_DELIVERY.includes(o.status))
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
  const t = await transition(o.id, IN_DELIVERY, 'FAILED', { error }, 'FAILED')
  if (t.ok) {
    track(o.telegramUserId, 'nft_sale_testnet_failed', { orderId: o.id, edition: o.nftId, error })
    log(o, 'FAILED', { error })
  }
}

/** Item confirmed on-chain → DELIVERING → owner re-read from the chain → OWNER_VERIFIED → DELIVERED. */
async function deliver(chain: Chain, o: NftOrder, nft: { address: string; txHash: string | null }) {
  const d = await transition(o.id, ['PAID', 'MINTING'], 'DELIVERING', { itemAddress: nft.address, txHash: nft.txHash ?? undefined, mintWarning: undefined })
  if (d.ok) {
    track(o.telegramUserId, 'nft_sale_testnet_mint_confirmed', { orderId: o.id, edition: o.nftId })
    track(o.telegramUserId, 'nft_sale_testnet_delivery_started', { orderId: o.id, edition: o.nftId })
  } else if (d.order?.status !== 'DELIVERING' && d.order?.status !== 'OWNER_VERIFIED') return
  const cur = getOrder(o.id)!
  if (cur.status === 'DELIVERING') {
    // the SERVER reads the owner from the chain; nothing from the client
    if (!(await chain.verifyOwnership(o.nftId, Address.parse(o.walletAddress)))) return fail(o, 'owner_not_verified')
    const v = await transition(o.id, ['DELIVERING'], 'OWNER_VERIFIED', { ownerVerifiedAt: Date.now() })
    if (v.ok) {
      track(o.telegramUserId, 'nft_sale_testnet_owner_verified', { orderId: o.id, edition: o.nftId })
      log(o, 'owner verified', { item: nft.address })
    }
  }
  // transaction references for the explorer (best effort: never blocks delivery)
  const refs: Partial<NftOrder> = {}
  try {
    const mintTx = cur.mintTxHash ? null : await chain.findMintTx(o.nftId)
    if (mintTx) refs.mintTxHash = mintTx.hash
    const itemTx = await chain.itemDeployTx(o.nftId)
    if (itemTx) refs.itemTxHash = itemTx.hash
  } catch (err) {
    console.warn('[nft-sale] tx lookup failed', o.id, err instanceof Error ? err.message : err)
  }
  const done = await transition(o.id, ['OWNER_VERIFIED'], 'DELIVERED', { deliveredAt: Date.now(), error: undefined, ...refs }, 'DELIVERED')
  if (done.ok) {
    track(o.telegramUserId, 'nft_sale_testnet_delivered', { orderId: o.id, edition: o.nftId })
    log(o, 'DELIVERED', { mintTx: refs.mintTxHash, itemTx: refs.itemTxHash })
  }
}

async function processOrder(chain: Chain, orderId: string) {
  const o = getOrder(orderId)
  if (!o) return
  const owner = Address.parse(o.walletAddress)
  // Before ANY mint: what does the chain say? (idempotent retry, no double mint)
  const nft = await chain.getNFT(o.nftId)
  if (o.status === 'DELIVERING' || o.status === 'OWNER_VERIFIED') {
    return nft.exists ? deliver(chain, o, nft) : fail(o, 'nft_missing')
  }
  if (nft.exists) {
    if (nft.owner === owner.toRawString()) return deliver(chain, o, nft)
    return fail(o, 'nft_exists_other_owner')
  }
  if (o.status === 'MINTING') {
    const now = Date.now()
    if (!o.mintSubmittedAt) {
      // the send itself failed: nothing can land later → safe to fail (admin retry re-checks the chain)
      if (now - (o.mintStartedAt ?? o.updatedAt) >= mintConfirmTimeoutMs()) return fail(o, 'mint_not_submitted')
      return
    }
    if (now - o.mintSubmittedAt < mintConfirmTimeoutMs()) return // SUBMITTED, not confirmed yet: wait
    const { seqno } = await chain.minterState()
    const accepted = o.mintSeqno !== undefined && seqno > o.mintSeqno
    if (!accepted && now > (o.mintValidUntil ?? 0) * 1000 + 30_000) return fail(o, 'mint_not_submitted') // expired unsent: can never land
    if (now - o.mintSubmittedAt >= mintHardTimeoutMs()) return fail(o, 'mint_not_confirmed')
    // submitted (maybe accepted) but not visible: stay MINTING, never delivered
    if (o.mintWarning !== 'confirmation_delayed') await patchOrder(o.id, { mintWarning: 'confirmation_delayed' })
    return
  }
  // PAID and the item does not exist: mint it to the buyer's proven wallet
  const m = await transition(o.id, ['PAID'], 'MINTING', { mintStartedAt: Date.now(), attempts: o.attempts + 1, mintSubmittedAt: undefined, mintSeqno: undefined, mintValidUntil: undefined, mintWarning: undefined }, 'MINTING')
  if (!m.ok) return
  track(o.telegramUserId, 'nft_sale_testnet_mint_started', { orderId: o.id, edition: o.nftId })
  const sub = await chain.mintNFT(o.nftId, owner)
  await patchOrder(o.id, { mintSeqno: sub.seqno, mintSubmittedAt: sub.submittedAt, mintValidUntil: sub.validUntil })
  log(o, 'mint submitted', { seqno: sub.seqno })
  // keep the lock until the wallet took this message, so the next mint gets the next seqno
  await chain.waitForSeqnoAbove(sub.seqno, 75_000)
  const confirmed = await chain.waitForConfirmation(o.nftId, owner, 30_000)
  if (confirmed) {
    if ('ownerMismatch' in confirmed) return fail(o, 'nft_exists_other_owner')
    return deliver(chain, o, confirmed)
  }
  // not visible yet: the next pass checks again
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

async function httpJson(url: string) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    const body = r.ok ? ((await r.json()) as Record<string, unknown>) : null
    return { url, status: r.status, ok: r.ok, body }
  } catch (err) {
    return { url, status: 0, ok: false, body: null, error: err instanceof Error ? err.message : 'fetch_failed' }
  }
}

/** VERIFY TESTNET COLLECTION — everything read from the chain, plus the metadata over real HTTP. */
export async function adminVerifyCollection() {
  const chain = await getChain()
  const address = chain.collectionAddress
  if (!address) return { ok: false, reason: 'collection_not_deployed' }
  const c = await chain.getCollection()
  const ref = chain.referenceHashes()
  const codeHash = await chain.codeHash(address)
  const contentUrl = c?.deployed ? await chain.collectionContentUrl() : null
  const meta = contentUrl ? await httpJson(contentUrl) : null
  const checks = {
    deployed: Boolean(c?.deployed),
    referenceCode: codeHash === ref.collection,
    ownerIsMinter: Boolean(c?.deployed && c.owner.equals(chain.minterAddress)),
    nextItemIndex: c?.deployed ? c.nextItemIndex.toString() : null,
    contentUrlMatches: contentUrl === collectionMetadataUrl(),
    metadataHttp200: Boolean(meta?.ok),
    metadataName: (meta?.body?.name as string | undefined) ?? null,
  }
  return {
    ok: checks.deployed && checks.referenceCode && checks.ownerIsMinter && checks.contentUrlMatches && checks.metadataHttp200,
    network: 'testnet',
    collection: address.toString({ testOnly: true }),
    minter: chain.minterAddress.toString({ testOnly: true, bounceable: false }),
    codeHash,
    contentUrl,
    checks,
    explorer: chain.explorerUrl(address.toString({ testOnly: true })),
  }
}

/** VERIFY TEST NFT — order, NFT, owner, collection, metadata, transactions, delivery status. */
export async function adminVerifyNft(orderId?: string) {
  const chain = await getChain()
  const o = orderId ? getOrder(orderId) : allOrders().find((x) => x.status === 'DELIVERED') ?? allOrders()[0]
  if (!o) return { ok: false, reason: 'no_orders' }
  const nft = await chain.getNFT(o.nftId)
  const contentUrl = nft.exists ? await chain.itemContentUrl(o.nftId) : null
  const meta = contentUrl ? await httpJson(contentUrl) : null
  const itemCodeHash = nft.exists ? await chain.codeHash(Address.parse(nft.address)) : null
  const checks = {
    exists: nft.exists,
    ownerIsBuyer: nft.exists && nft.owner === Address.parse(o.walletAddress).toRawString(),
    index: nft.index,
    referenceItemCode: itemCodeHash === chain.referenceHashes().item,
    metadataUrlMatches: contentUrl === itemMetadataUrl(o.nftId),
    metadataHttp200: Boolean(meta?.ok),
    metadataName: (meta?.body?.name as string | undefined) ?? null,
    orderDelivered: o.status === 'DELIVERED',
    paymentConfirmed: o.paymentStatus === 'PAID',
  }
  return {
    ok: Object.values(checks).every((v) => v !== false),
    order: { id: o.id, status: o.status, telegramUserId: o.telegramUserId, paymentStatus: o.paymentStatus, error: o.error ?? null },
    nft: { edition: o.nftId, index: nft.index, address: nft.address, owner: nft.owner ? Address.parse(nft.owner).toString({ testOnly: true, bounceable: false }) : null },
    collection: chain.collectionAddress?.toString({ testOnly: true }) ?? null,
    buyer: o.walletFriendly,
    metadata: { url: contentUrl, body: meta?.body ?? null },
    transactions: { payment: o.paymentTxHash ?? null, mint: o.mintTxHash ?? null, item: o.itemTxHash ?? null },
    links: links(chain, o),
    checks,
  }
}

export async function adminOverview(filter?: string) {
  const orders = allOrders()
  const list = filter && filter !== 'ALL' ? orders.filter((o) => o.status === filter) : orders
  const chain = await chainStatus()
  let minter: { address: string; balance: string; seqno: number; explorerUrl: string | null } | null = null
  let collection: string | null = null
  let collectionUrl: string | null = null
  let c: Chain | null = null
  if (chain.ready || chain.reason === 'collection_not_deployed') {
    try {
      c = await getChain()
      const s = await c.minterState()
      minter = { address: s.address, balance: (Number(s.balance) / 1e9).toFixed(3), seqno: s.seqno, explorerUrl: c.explorerUrl(s.address) }
      collection = c.collectionAddress?.toString({ testOnly: true }) ?? null
      collectionUrl = collection ? c.explorerUrl(collection) : null
    } catch (err) {
      minter = null
      console.error('[nft-sale] admin chain read failed', err instanceof Error ? err.message : err)
    }
  }
  const byStatus: Record<string, number> = {}
  for (const o of orders) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1
  const last = orders.find((o) => o.status === 'DELIVERED') ?? null
  const lastTx = orders.find((o) => o.itemTxHash || o.mintTxHash || o.paymentTxHash) ?? null
  return {
    enabled: saleEnabled(),
    network: 'testnet',
    environment: isProduction() ? 'production' : 'non-production',
    testPayments: testPaymentsAllowed(),
    chain,
    minter,
    collection,
    collectionUrl,
    explorer: TESTNET_EXPLORER,
    inventory: inventoryCounts(),
    orders: { total: orders.length, byStatus },
    lastTestMint: last ? { orderId: last.id, edition: last.nftId, owner: last.walletFriendly, deliveredAt: last.deliveredAt ?? null, itemAddress: last.itemAddress ?? null, links: links(c, last) } : null,
    lastTransaction: lastTx ? { orderId: lastTx.id, hash: lastTx.itemTxHash ?? lastTx.mintTxHash ?? lastTx.paymentTxHash, links: links(c, lastTx) } : null,
    revenue: { testnet: true, real: 0, note: 'TESTNET / ZERO REAL REVENUE' },
    funnel: nftSaleFunnel('all').events,
    list: list.slice(0, 200),
  }
}

let timer: NodeJS.Timeout | null = null
/** Background pass: payments, expiry, delivery. Runs even with the sale off, so paid orders finish. */
export function startNftSaleWorker(intervalMs = Number(process.env.NFT_WORKER_INTERVAL_MS ?? 5000)) {
  if (timer) return
  timer = setInterval(() => {
    void checkPendingPayments()
      .then(() => expireReservations())
      .then(() => kickDelivery())
      .catch((err) => console.error('[nft-sale] worker', err instanceof Error ? err.message : err))
  }, intervalMs)
  timer.unref()
}
