import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { makeWallet } from './helpers.js'

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'nft-sale-'))
process.env.NFT_CHAIN = 'sandbox'
process.env.NFT_SANDBOX_DELAY_MS = '150'
process.env.NFT_SALE_ENABLED = 'true'
process.env.NFT_MINT_CONFIRM_TIMEOUT_S = '2'
delete process.env.NODE_ENV

const sale = await import('../../src/nftSale/sale.js')
const store = await import('../../src/nftSale/store.js')
const { getChain } = await import('../../src/nftSale/chainService.js')
const { testPaymentProvider } = await import('../../src/nftSale/payments/testProvider.js')
const chain = await getChain()

let nextUser = 1000
async function buyer() {
  const id = ++nextUser
  const w = await makeWallet()
  await store.setWallet(id, { address: w.address.toRawString(), friendly: w.address.toString({ testOnly: true, bounceable: false }), publicKey: w.publicKey.toString('hex'), network: 'testnet', verifiedAt: Date.now() })
  return { id, wallet: w.address }
}
const pay = async (uid: number, orderId: string) => sale.simulateTestPayment(uid, orderId, 'PAID')
const seqno = async () => (await chain.minterState()).seqno
async function failNextMint() {
  const orig = chain.mintNFT.bind(chain)
  chain.mintNFT = async () => {
    chain.mintNFT = orig
    throw new Error('simulated network failure on send')
  }
}
/** paid order whose mint never got sent → FAILED(mint_not_submitted) after the confirm timeout */
async function failedPaidOrder() {
  const u = await buyer()
  const { order } = await sale.createOrder(u.id)
  await failNextMint()
  await pay(u.id, order.id)
  await sale.kickDelivery()
  await new Promise((r) => setTimeout(r, 2100))
  await sale.kickDelivery()
  const o = store.getOrder(order.id)!
  assert.equal(o.status, 'FAILED')
  assert.equal(o.error, 'mint_not_submitted')
  return { u, o }
}

test('order needs a server-verified wallet', async () => {
  await assert.rejects(sale.createOrder(424242), { code: 'wallet_not_verified' })
})

test('reserve: server picks the next free edition; order → PAYMENT_PENDING', async () => {
  const u = await buyer()
  const { order, existing } = await sale.createOrder(u.id)
  assert.equal(existing, false)
  assert.equal(order.nftId, 1)
  assert.equal(order.status, 'PAYMENT_PENDING')
  assert.equal(order.provider, 'test')
  assert.equal(store.itemStatus(1), 'RESERVED')
  assert.deepEqual(order.history.map((h) => h.status), ['PENDING', 'RESERVED', 'PAYMENT_PENDING'])
})

test('duplicate reservation: a second BUY returns the same open order', async () => {
  const u = await buyer()
  const a = await sale.createOrder(u.id)
  const [b, c] = await Promise.all([sale.createOrder(u.id), sale.createOrder(u.id)])
  assert.equal(b.order.id, a.order.id)
  assert.equal(c.order.id, a.order.id)
  assert.equal(store.ordersOf(u.id).length, 1)
})

test('concurrent reservation: 40 buyers at once → 40 different editions', async () => {
  const users = await Promise.all(Array.from({ length: 40 }, () => buyer()))
  const orders = await Promise.all(users.map((u) => sale.createOrder(u.id)))
  const ids = orders.map((o) => o.order.nftId)
  assert.equal(new Set(ids).size, 40)
  for (const n of ids) assert.equal(store.itemStatus(n), 'RESERVED')
})

test('TEST PAYMENT paid → PAID → MINTING → DELIVERED, owner verified on-chain', async () => {
  const u = await buyer()
  const { order } = await sale.createOrder(u.id)
  const paid = await pay(u.id, order.id)
  assert.ok(['PAID', 'MINTING', 'DELIVERING', 'DELIVERED'].includes(paid.status))
  await sale.kickDelivery()
  const o = store.getOrder(order.id)!
  assert.equal(o.status, 'DELIVERED')
  assert.equal(store.itemStatus(o.nftId), 'DELIVERED')
  assert.match(o.txHash ?? '', /^[0-9a-f]{64}$/)
  assert.equal(await chain.verifyOwnership(o.nftId, u.wallet), true)
  assert.deepEqual(o.history.map((h) => h.status), ['PENDING', 'RESERVED', 'PAYMENT_PENDING', 'PAID', 'MINTING', 'DELIVERING', 'DELIVERED'])
})

test('duplicate webhook / parallel workers → exactly one mint', async () => {
  const u = await buyer()
  const { order } = await sale.createOrder(u.id)
  const before = await seqno()
  await testPaymentProvider.simulate(order.providerOrderId!, 'PAID')
  const results = await Promise.all([1, 2, 3, 4].map(() => sale.handlePaymentUpdate('test', order.providerOrderId!)))
  assert.ok(results.every((r) => r.ok))
  await Promise.all([sale.kickDelivery(), sale.kickDelivery(), sale.kickDelivery()])
  await sale.handlePaymentUpdate('test', order.providerOrderId!) // late duplicate
  await sale.kickDelivery()
  assert.equal(store.getOrder(order.id)!.status, 'DELIVERED')
  assert.equal((await seqno()) - before, 1, 'one mint message only')
  assert.equal(store.getOrder(order.id)!.history.filter((h) => h.status === 'PAID').length, 1)
})

test('payment FAILED → order FAILED, edition released and offered again', async () => {
  const u = await buyer()
  const { order } = await sale.createOrder(u.id)
  const o = await sale.simulateTestPayment(u.id, order.id, 'FAILED')
  assert.equal(o.status, 'FAILED')
  assert.equal(o.error, 'payment_failed')
  assert.equal(store.itemStatus(order.nftId), 'AVAILABLE')
  assert.equal(store.nextAvailable(), order.nftId)
  await assert.rejects(pay(u.id, order.id), { code: 'not_payable' })
})

test('reservation timeout releases the edition; a late payment is refused', async () => {
  process.env.NFT_RESERVATION_TTL_S = '1'
  const u = await buyer()
  const { order } = await sale.createOrder(u.id)
  delete process.env.NFT_RESERVATION_TTL_S
  await new Promise((r) => setTimeout(r, 1100))
  await sale.expireReservations()
  const o = store.getOrder(order.id)!
  assert.equal(o.status, 'FAILED')
  assert.equal(o.error, 'reservation_expired')
  assert.equal(store.itemStatus(order.nftId), 'AVAILABLE')
  await assert.rejects(testPaymentProvider.simulate(order.providerOrderId!, 'PAID'), /cannot_paid_from_failed/)
})

test('other users cannot pay, see or fake someone else\'s order', async () => {
  const a = await buyer()
  const b = await buyer()
  const { order } = await sale.createOrder(a.id)
  await assert.rejects(pay(b.id, order.id), { code: 'not_found' })
  assert.deepEqual(await sale.handlePaymentUpdate('test', 'test_fake'), { ok: false, reason: 'unknown_payment' })
})

test('retry: FAILED + PAID → admin retry mints once → DELIVERED; second retry refused (idempotent)', async () => {
  const { o } = await failedPaidOrder()
  assert.equal(store.itemStatus(o.nftId), 'FAILED', 'edition held for the retry')
  const r = await sale.adminRetry(o.id)
  assert.equal(r.status, 'DELIVERED')
  await assert.rejects(sale.adminRetry(o.id), { code: 'not_failed' })
})

test('retry when the NFT already reached the wallet: no second mint, just DELIVERED', async () => {
  const { u, o } = await failedPaidOrder()
  const s = await chain.mintNFT(o.nftId, u.wallet) // the "lost" mint lands after all
  await chain.waitForSeqnoAbove(s.seqno, 10_000)
  assert.ok(await chain.waitForConfirmation(o.nftId, u.wallet, 10_000))
  const before = await seqno()
  const r = await sale.adminRetry(o.id)
  assert.equal(r.status, 'DELIVERED')
  assert.equal(await seqno(), before, 'retry did not send another mint')
})

test('retry when the edition exists for ANOTHER wallet → FAILED, refund refused (nft_on_chain)', async () => {
  const { o } = await failedPaidOrder()
  const other = (await makeWallet()).address
  const s = await chain.mintNFT(o.nftId, other)
  await chain.waitForSeqnoAbove(s.seqno, 10_000)
  await chain.waitForConfirmation(o.nftId, other, 10_000)
  const r = await sale.adminRetry(o.id)
  assert.equal(r.status, 'FAILED')
  assert.equal(r.error, 'nft_exists_other_owner')
  await assert.rejects(sale.adminRefund(o.id), { code: 'nft_on_chain' })
})

test('refund: FAILED + PAID, not on chain → REFUNDED, edition released', async () => {
  const { o } = await failedPaidOrder()
  const r = await sale.adminRefund(o.id)
  assert.equal(r.status, 'REFUNDED')
  assert.equal(r.paymentStatus, 'REFUNDED')
  assert.equal(store.itemStatus(o.nftId), 'AVAILABLE')
  assert.equal((await testPaymentProvider.getPaymentStatus(o.providerOrderId!)).status, 'REFUNDED')
  await assert.rejects(sale.adminRefund(o.id), { code: 'not_refundable' })
  await assert.rejects(sale.adminRetry(o.id), { code: 'not_failed' })
})

test('inventory counts add up', () => {
  const c = store.inventoryCounts()
  assert.equal(c.supply, 2000)
  assert.equal(c.available + c.reserved + c.minting + c.delivered + c.failed, 2000)
})

test('production: test provider, sandbox and mainnet are refused', async () => {
  const cfg = await import('../../src/nftSale/config.js')
  const { paymentProvider } = await import('../../src/nftSale/payments/provider.js')
  process.env.NODE_ENV = 'production'
  try {
    assert.throws(() => paymentProvider('test'), { code: 'test_provider_disabled_in_production' })
    assert.throws(() => cfg.chainMode(), { code: 'sandbox_blocked_in_production' })
    const u = await buyer()
    await assert.rejects(sale.createOrder(u.id), { code: 'test_provider_disabled_in_production' })
    await assert.rejects(sale.simulateTestPayment(u.id, 'x', 'PAID'), { code: 'test_provider_disabled_in_production' })
    await assert.rejects(testPaymentProvider.simulate('x', 'PAID'), { code: 'test_provider_disabled_in_production' })
  } finally {
    delete process.env.NODE_ENV
  }
  process.env.NFT_NETWORK = 'mainnet'
  try {
    assert.throws(() => cfg.nftNetwork(), { code: 'mainnet_blocked_phase1' })
  } finally {
    delete process.env.NFT_NETWORK
  }
  assert.throws(() => paymentProvider('tonramp'), { code: 'provider_not_connected_phase1' })
})

test('production detection is fail-safe on Railway', async () => {
  const { isProduction } = await import('../../src/nftSale/config.js')
  const keys = ['NODE_ENV', 'RAILWAY_ENVIRONMENT_NAME', 'RAILWAY_ENVIRONMENT', 'RAILWAY_PUBLIC_DOMAIN', 'RAILWAY_PROJECT_ID']
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]))
  const set = (v: Record<string, string>) => {
    for (const k of keys) delete process.env[k]
    Object.assign(process.env, v)
  }
  try {
    set({})
    assert.equal(isProduction(), false, 'local dev')
    set({ RAILWAY_PUBLIC_DOMAIN: 'x.up.railway.app' })
    assert.equal(isProduction(), true, 'Railway without an environment name')
    set({ RAILWAY_PUBLIC_DOMAIN: 'x.up.railway.app', RAILWAY_ENVIRONMENT_NAME: 'production' })
    assert.equal(isProduction(), true)
    set({ RAILWAY_PUBLIC_DOMAIN: 'x.up.railway.app', RAILWAY_ENVIRONMENT_NAME: 'staging' })
    assert.equal(isProduction(), false, 'an explicit non-production Railway environment')
    set({ NODE_ENV: 'production' })
    assert.equal(isProduction(), true)
  } finally {
    set({})
    for (const [k, v] of Object.entries(saved)) if (v !== undefined) process.env[k] = v
  }
})
