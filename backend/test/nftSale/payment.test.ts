import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { Address, beginCell, internal, SendMode, toNano } from '@ton/core'
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto'
import { WalletContractV4 } from '@ton/ton'

/**
 * Phase 2: REAL on-chain payments (TON transfers signed by test buyer wallets) on the official TVM
 * sandbox, verified by the ton_testnet provider exactly as on the TON testnet.
 */
const DATA = mkdtempSync(join(tmpdir(), 'nft-pay-'))
process.env.DATA_DIR = DATA
process.env.NFT_CHAIN = 'sandbox'
process.env.NFT_SANDBOX_DELAY_MS = '150'
process.env.NFT_SALE_ENABLED = 'true'
process.env.NFT_MINT_CONFIRM_TIMEOUT_S = '2'
process.env.NFT_MINT_HARD_TIMEOUT_S = '600'
delete process.env.NFT_PAYMENT_PROVIDER
delete process.env.NODE_ENV

const sale = await import('../../src/nftSale/sale.js')
const store = await import('../../src/nftSale/store.js')
const { getChain } = await import('../../src/nftSale/chainService.js')
const ton = await import('../../src/nftSale/payments/tonTestnetProvider.js')
const chain = await getChain()
const backend = chain.backend as typeof chain.backend & { fund(a: Address, t: string): Promise<void> }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Buyer = { id: number; wallet: WalletContractV4; secretKey: Buffer }
let nextId = 5000
async function newWallet() {
  const keys = await mnemonicToPrivateKey(await mnemonicNew(24))
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keys.publicKey })
  await backend.fund(wallet.address, '10')
  return { wallet, secretKey: keys.secretKey }
}
async function buyer(): Promise<Buyer> {
  const w = await newWallet()
  const id = ++nextId
  await store.setWallet(id, { address: w.wallet.address.toRawString(), friendly: w.wallet.address.toString({ testOnly: true, bounceable: false }), publicKey: '', network: 'testnet', verifiedAt: Date.now() })
  return { id, ...w }
}
/** A real signed transfer from a wallet (what TON Connect makes the wallet app do). */
async function send(from: { wallet: WalletContractV4; secretKey: Buffer }, to: Address | string, amountTon: string, comment?: string) {
  const p = backend.provider(from.wallet.address, from.wallet.init)
  const seqno = (await p.getState()).state.type === 'active' ? await from.wallet.getSeqno(p) : 0
  await from.wallet.sendTransfer(p, {
    seqno,
    secretKey: from.secretKey,
    sendMode: SendMode.PAY_GAS_SEPARATELY,
    messages: [internal({ to: typeof to === 'string' ? Address.parse(to) : to, value: toNano(amountTon), bounce: false, body: comment ? beginCell().storeUint(0, 32).storeStringTail(comment).endCell() : undefined })],
  })
  for (let i = 0; i < 40; i++) {
    await sleep(100)
    if ((await from.wallet.getSeqno(backend.provider(from.wallet.address))) > seqno) break
  }
  await sleep(300)
}
const minterSeqno = async () => (await chain.minterState()).seqno
const payment = (o: { providerOrderId?: string }) => ton.getTonTestnetPayment(o.providerOrderId!)!

test('order → server-chosen payment instructions (recipient, amount, comment, deadline)', async () => {
  const b = await buyer()
  const { order } = await sale.createOrder(b.id)
  assert.equal(order.provider, 'ton_testnet')
  assert.equal(order.currency, 'TON_TESTNET')
  const ins = order.paymentInstructions!
  assert.equal(Address.parse(ins.recipient).toRawString(), chain.minterAddress.toRawString())
  assert.equal(ins.amountNano, toNano('0.05').toString())
  assert.match(ins.comment, /^DJH-[0-9a-f]{16}$/)
  assert.equal(ins.validUntil, order.reservedUntil)
  assert.equal(payment(order).payer, b.wallet.address.toRawString(), 'only the proven wallet may pay')
})

test('real payment → PAID → MINTING → DELIVERING → OWNER_VERIFIED → DELIVERED; tx references recorded', async () => {
  const b = await buyer()
  const { order } = await sale.createOrder(b.id)
  assert.equal((await sale.userCheckPayment(b.id, order.id)).status, 'PAYMENT_PENDING', 'nothing sent yet → NOT PAID')
  await send(b, order.paymentInstructions!.recipient, '0.05', order.paymentInstructions!.comment)
  await sleep(3100) // a buyer's "check payment" is throttled to one chain read per 3 s
  const paid = await sale.userCheckPayment(b.id, order.id)
  assert.ok(['PAID', 'MINTING', 'DELIVERING', 'OWNER_VERIFIED', 'DELIVERED'].includes(paid.status), paid.status)
  assert.match(paid.paymentTxHash ?? '', /^[0-9a-f]{64}$/)
  assert.equal(paid.paymentFrom, b.wallet.address.toRawString())
  await sale.kickDelivery()
  const o = store.getOrder(order.id)!
  assert.equal(o.status, 'DELIVERED')
  assert.deepEqual(o.history.map((h) => h.status), ['PENDING', 'RESERVED', 'PAYMENT_PENDING', 'PAID', 'MINTING', 'DELIVERING', 'OWNER_VERIFIED', 'DELIVERED'])
  assert.ok(o.ownerVerifiedAt)
  assert.match(o.mintTxHash ?? '', /^[0-9a-f]{64}$/, 'minter wallet tx found on-chain')
  assert.match(o.itemTxHash ?? '', /^[0-9a-f]{64}$/, 'item deployment tx found on-chain')
  assert.equal(await chain.verifyOwnership(o.nftId, b.wallet.address), true)
  const merchantTxs = (await chain.transactions(chain.minterAddress, 50)).map((t) => t.hash().toString('hex'))
  assert.ok(merchantTxs.includes(o.paymentTxHash!), 'the credited tx really is on the merchant wallet')
  const v = (await sale.adminVerifyNft(order.id)) as Extract<Awaited<ReturnType<typeof sale.adminVerifyNft>>, { checks: unknown }>
  assert.equal(v.checks.ownerIsBuyer, true)
  assert.equal(v.checks.referenceItemCode, true)
  assert.equal(v.checks.index, o.nftId - 1)
  assert.equal(v.metadata.url?.endsWith(`/api/nft-sale/testnet/metadata/${o.nftId}`), true, 'on-chain metadata URL = the stable per-edition URL')
})

test('C. wrong comment → NOT PAID', async () => {
  const b = await buyer()
  const { order } = await sale.createOrder(b.id)
  await send(b, order.paymentInstructions!.recipient, '0.05', 'DJH-0000000000000000')
  assert.equal((await sale.userCheckPayment(b.id, order.id)).status, 'PAYMENT_PENDING')
})

test('D. insufficient amount → NOT PAID', async () => {
  const b = await buyer()
  const { order } = await sale.createOrder(b.id)
  await send(b, order.paymentInstructions!.recipient, '0.01', order.paymentInstructions!.comment)
  assert.equal((await sale.userCheckPayment(b.id, order.id)).status, 'PAYMENT_PENDING')
  assert.equal(payment(order).lastReason, 'insufficient_amount')
})

test('wrong sender (someone else pays with the right comment) → NOT PAID', async () => {
  const b = await buyer()
  const stranger = await newWallet()
  const { order } = await sale.createOrder(b.id)
  await send(stranger, order.paymentInstructions!.recipient, '0.05', order.paymentInstructions!.comment)
  assert.equal((await sale.userCheckPayment(b.id, order.id)).status, 'PAYMENT_PENDING')
  assert.equal(payment(order).lastReason, 'wrong_sender')
})

test('E. wrong recipient → NOT PAID', async () => {
  const b = await buyer()
  const elsewhere = await newWallet()
  const { order } = await sale.createOrder(b.id)
  await send(b, elsewhere.wallet.address, '0.05', order.paymentInstructions!.comment)
  assert.equal((await sale.userCheckPayment(b.id, order.id)).status, 'PAYMENT_PENDING')
})

test('A. duplicate payment for one order → credited once, one mint', async () => {
  const b = await buyer()
  const { order } = await sale.createOrder(b.id)
  const before = await minterSeqno()
  await send(b, order.paymentInstructions!.recipient, '0.05', order.paymentInstructions!.comment)
  await send(b, order.paymentInstructions!.recipient, '0.05', order.paymentInstructions!.comment)
  await sale.userCheckPayment(b.id, order.id)
  await Promise.all([sale.kickDelivery(), sale.checkPendingPayments(), sale.handlePaymentUpdate('ton_testnet', order.providerOrderId!)])
  await sale.kickDelivery()
  assert.equal(store.getOrder(order.id)!.status, 'DELIVERED')
  assert.equal((await minterSeqno()) - before, 1, 'exactly one mint message')
  const ledger = JSON.parse(readFileSync(join(DATA, 'nft-sale', 'ton-testnet-payments.json'), 'utf8'))
  assert.equal(Object.values(ledger.txs).filter((p) => p === order.providerOrderId).length, 1, 'one tx credited')
})

test('B. the same transaction can never pay a second payment (tx_reused)', async () => {
  const done = store.allOrders().find((o) => o.status === 'DELIVERED' && o.provider === 'ton_testnet')!
  const b = await buyer()
  const { order } = await sale.createOrder(b.id)
  const r = await ton.bindTx(order.providerOrderId!, { hash: done.paymentTxHash!, lt: '1', at: Math.floor(Date.now() / 1000) })
  assert.deepEqual(r, { ok: false, reason: 'tx_reused' })
  assert.equal(payment(order).status, 'PENDING')
})

test('payment after the reservation expired → not credited, edition released', async () => {
  process.env.NFT_RESERVATION_TTL_S = '2'
  const b = await buyer()
  const { order } = await sale.createOrder(b.id)
  delete process.env.NFT_RESERVATION_TTL_S
  await sleep(3600) // block time has 1 s resolution
  await send(b, order.paymentInstructions!.recipient, '0.05', order.paymentInstructions!.comment)
  await sale.expireReservations()
  const o = store.getOrder(order.id)!
  assert.equal(o.status, 'FAILED')
  assert.equal(o.error, 'reservation_expired')
  assert.equal(store.itemStatus(o.nftId), 'AVAILABLE')
  assert.equal(payment(order).status, 'FAILED')
})

test('M. retry after a mint timeout is safe: stays MINTING while it could still land, FAILED only when it cannot, retry mints once', async () => {
  const b = await buyer()
  const { order } = await sale.createOrder(b.id)
  await send(b, order.paymentInstructions!.recipient, '0.05', order.paymentInstructions!.comment)
  // the "network" swallows the mint message: submitted, never lands
  const orig = chain.mintNFT.bind(chain)
  chain.mintNFT = async () => {
    chain.mintNFT = orig
    return { seqno: (await chain.minterState()).seqno, validUntil: Math.floor(Date.now() / 1000) + 3600, submittedAt: Date.now() }
  }
  const [w1, w2] = [chain.waitForSeqnoAbove.bind(chain), chain.waitForConfirmation.bind(chain)]
  chain.waitForSeqnoAbove = (seq, _ms) => w1(seq, 500)
  chain.waitForConfirmation = (n, owner, _ms) => w2(n, owner, 500)
  await sleep(3100)
  await sale.userCheckPayment(b.id, order.id)
  await sale.kickDelivery()
  chain.waitForSeqnoAbove = w1
  chain.waitForConfirmation = w2
  await sleep(2100)
  await sale.kickDelivery()
  let o = store.getOrder(order.id)!
  assert.equal(o.status, 'MINTING', 'timeout ≠ delivered, ≠ failed while the message may still land')
  assert.equal(o.mintWarning, 'confirmation_delayed')
  await store.patchOrder(order.id, { mintValidUntil: Math.floor(Date.now() / 1000) - 120 }) // now it can never land
  await sale.kickDelivery()
  o = store.getOrder(order.id)!
  assert.equal(o.status, 'FAILED')
  assert.equal(o.error, 'mint_not_submitted')
  const before = await minterSeqno()
  assert.equal((await sale.adminRetry(order.id)).status, 'DELIVERED')
  assert.equal((await minterSeqno()) - before, 1)
})

test('L. retry after a successful delivery → refused, no duplicate mint', async () => {
  const done = store.allOrders().find((o) => o.status === 'DELIVERED')!
  const before = await minterSeqno()
  await assert.rejects(sale.adminRetry(done.id), { code: 'not_failed' })
  await sale.kickDelivery()
  assert.equal(await minterSeqno(), before)
})

test('refund (testnet): FAILED + PAID → testnet TON sent back on-chain → REFUNDED', async () => {
  const b = await buyer()
  const { order } = await sale.createOrder(b.id)
  await send(b, order.paymentInstructions!.recipient, '0.05', order.paymentInstructions!.comment)
  const orig = chain.mintNFT.bind(chain)
  chain.mintNFT = async () => {
    chain.mintNFT = orig
    throw new Error('simulated send failure')
  }
  await sale.userCheckPayment(b.id, order.id)
  await sale.kickDelivery()
  await sleep(2100)
  await sale.kickDelivery()
  assert.equal(store.getOrder(order.id)!.status, 'FAILED')
  const bal0 = (await backend.provider(b.wallet.address).getState()).balance
  const r = await sale.adminRefund(order.id)
  assert.equal(r.status, 'REFUNDED')
  await sleep(1500)
  const bal1 = (await backend.provider(b.wallet.address).getState()).balance
  assert.ok(bal1 - bal0 > toNano('0.049'), 'the testnet TON came back')
  assert.equal(payment(order).status, 'REFUNDED')
})

test('analytics: nft_sale_testnet_* funnel recorded by the server; no secrets in events', () => {
  const dir = join(DATA, 'analytics')
  const lines = readdirSync(dir).flatMap((f) => readFileSync(join(dir, f), 'utf8').trim().split('\n'))
  const names = new Set(lines.map((l) => JSON.parse(l).e))
  for (const n of ['order_created', 'payment_verified', 'mint_started', 'mint_confirmed', 'delivery_started', 'owner_verified', 'delivered', 'failed']) assert.ok(names.has(`nft_sale_testnet_${n}`), n)
  assert.ok(!lines.some((l) => /mnemonic|secret|private/i.test(l)))
})

test('F. wrong network: mainnet configuration → no provider, no orders; production+mainnet without approval → subsystem refuses', async () => {
  const cfg = await import('../../src/nftSale/config.js')
  const { paymentProvider } = await import('../../src/nftSale/payments/provider.js')
  process.env.NFT_NETWORK = 'mainnet'
  try {
    assert.throws(() => paymentProvider('ton_testnet'), { code: 'mainnet_blocked_phase1' })
    const b = await buyer()
    await assert.rejects(sale.createOrder(b.id), { code: 'mainnet_blocked_phase1' })
    assert.equal(cfg.subsystemRefusal(), null, 'outside production the network gate itself refuses')
    process.env.NODE_ENV = 'production'
    assert.equal(cfg.subsystemRefusal(), 'mainnet_not_approved')
    process.env.NFT_MAINNET_APPROVED = 'true'
    assert.equal(cfg.subsystemRefusal(), null)
    assert.throws(() => cfg.nftNetwork(), { code: 'mainnet_blocked_phase1' }, 'even approved, mainnet is not implemented in Phase 2')
  } finally {
    delete process.env.NFT_NETWORK
    delete process.env.NODE_ENV
    delete process.env.NFT_MAINNET_APPROVED
  }
})

test('pure matcher: every rejection reason', async () => {
  const b = await newWallet()
  const other = await newWallet()
  const p = { payer: b.wallet.address.toRawString(), recipient: chain.minterAddress.toRawString(), amountNano: toNano('0.05').toString(), comment: 'DJH-aaaaaaaaaaaaaaaa', createdAt: Date.now() - 1000, notAfter: Date.now() + 60_000 }
  await send(b, chain.minterAddress, '0.05', p.comment)
  const tx = (await chain.transactions(chain.minterAddress, 5)).find((t) => t.inMessage?.info.type === 'internal' && t.inMessage.info.src.equals(b.wallet.address))!
  assert.equal(ton.rejectReason(tx, p), null)
  assert.equal(ton.rejectReason(tx, { ...p, comment: 'DJH-bbbbbbbbbbbbbbbb' }), 'wrong_comment')
  assert.equal(ton.rejectReason(tx, { ...p, payer: other.wallet.address.toRawString() }), 'wrong_sender')
  assert.equal(ton.rejectReason(tx, { ...p, amountNano: toNano('0.06').toString() }), 'insufficient_amount')
  assert.equal(ton.rejectReason(tx, { ...p, recipient: other.wallet.address.toRawString() }), 'wrong_recipient')
  assert.equal(ton.rejectReason(tx, { ...p, notAfter: Date.now() - 120_000 }), 'after_reservation')
  assert.equal(ton.rejectReason(tx, { ...p, createdAt: Date.now() + 300_000 }), 'before_order')
})
