import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Address, fromNano, toNano, type Transaction } from '@ton/core'
import { enqueueDataOp, writeJsonAtomic } from '../../dataQueue.js'
import { merchantAddressOverride, testnetPriceTon } from '../config.js'
import { getChain } from '../chainService.js'
import { NFT_SALE_DIR } from '../store.js'
import { PaymentProviderError, type PaymentProvider, type ProviderPaymentStatus } from './provider.js'

/**
 * TON TESTNET payment provider (Phase 2) — a REAL transfer of testnet TON (no value), verified by
 * the server on-chain. The server fixes recipient, amount, comment and the accepted sender; the
 * client's "I paid", tx hash or status is never used. A transaction is credited only if:
 *   internal message · not bounced · compute phase success · not aborted
 *   destination = merchant · source = the wallet proven with ton_proof
 *   value ≥ amount · text comment = this payment's comment
 *   time inside [created − 60 s, reservation end] · hash not credited to any other payment
 * The chain is read through the same TON Center TESTNET / sandbox backend as the minter.
 */
const FILE = join(NFT_SALE_DIR, 'ton-testnet-payments.json')

export type TonTestnetPayment = {
  id: string
  orderId: string
  payer: string
  recipient: string
  amountNano: string
  amountTon: number
  comment: string
  createdAt: number
  notAfter: number
  status: ProviderPaymentStatus
  txHash?: string
  txLt?: string
  txAt?: number
  lastReason?: string
  refundSeqno?: number
}
type Ledger = { payments: Record<string, TonTestnetPayment>; txs: Record<string, string> }

function read(): Ledger {
  if (!existsSync(FILE)) return { payments: {}, txs: {} }
  const l = JSON.parse(readFileSync(FILE, 'utf8')) as Partial<Ledger>
  return { payments: l.payments ?? {}, txs: l.txs ?? {} }
}
function write(l: Ledger) {
  mkdirSync(NFT_SALE_DIR, { recursive: true })
  writeJsonAtomic(FILE, l)
}
export const getTonTestnetPayment = (id: string) => read().payments[id] ?? null

/** Comment the buyer's wallet puts on the transfer: unique per order, short, readable. */
export const paymentComment = (orderId: string) => `DJH-${orderId.slice(0, 16)}`

function textComment(tx: Transaction) {
  const m = tx.inMessage
  if (!m) return null
  try {
    const s = m.body.beginParse()
    if (s.remainingBits < 32 || s.loadUint(32) !== 0) return null
    return s.loadStringTail()
  } catch {
    return null
  }
}

/** Why a transaction does (not) pay this payment — null = it pays it. Pure; exported for tests. */
export function rejectReason(tx: Transaction, p: Pick<TonTestnetPayment, 'payer' | 'recipient' | 'amountNano' | 'comment' | 'createdAt' | 'notAfter'>): string | null {
  const m = tx.inMessage
  if (!m || m.info.type !== 'internal') return 'not_internal'
  if (m.info.bounced) return 'bounced'
  if (!m.info.dest.equals(Address.parse(p.recipient))) return 'wrong_recipient'
  if (textComment(tx) !== p.comment) return 'wrong_comment'
  if (!m.info.src.equals(Address.parse(p.payer))) return 'wrong_sender'
  if (m.info.value.coins < BigInt(p.amountNano)) return 'insufficient_amount'
  const d = tx.description
  if (d.type !== 'generic' || d.aborted || d.computePhase.type !== 'vm' || !d.computePhase.success) return 'tx_failed'
  if (tx.now * 1000 < p.createdAt - 60_000) return 'before_order'
  if (tx.now * 1000 > p.notAfter) return 'after_reservation'
  return null
}

/** Atomically credit a tx to one payment. A hash already credited elsewhere is refused. */
export function bindTx(paymentId: string, tx: { hash: string; lt: string; at: number }) {
  return enqueueDataOp('nft:ton-pay-bind', paymentId, () => {
    const l = read()
    const p = l.payments[paymentId]
    if (!p) return { ok: false as const, reason: 'unknown_payment' }
    const owner = l.txs[tx.hash]
    if (owner && owner !== paymentId) return { ok: false as const, reason: 'tx_reused' }
    if (p.status === 'PAID') return { ok: true as const, payment: p }
    if (p.status !== 'PENDING') return { ok: false as const, reason: `payment_${p.status.toLowerCase()}` }
    p.status = 'PAID'
    p.txHash = tx.hash
    p.txLt = tx.lt
    p.txAt = tx.at
    l.txs[tx.hash] = paymentId
    write(l)
    return { ok: true as const, payment: p }
  })
}

function setStatus(id: string, from: ProviderPaymentStatus[], to: ProviderPaymentStatus, patch: Partial<TonTestnetPayment> = {}) {
  return enqueueDataOp('nft:ton-pay-status', id, () => {
    const l = read()
    const p = l.payments[id]
    if (!p) throw new PaymentProviderError('unknown_payment')
    if (p.status !== to) {
      if (!from.includes(p.status)) throw new PaymentProviderError(`cannot_${to.toLowerCase()}_from_${p.status.toLowerCase()}`)
      p.status = to
    }
    Object.assign(p, patch)
    write(l)
    return p
  })
}

/** Reads the merchant's recent transactions and credits the first one that pays `p`. */
async function scan(p: TonTestnetPayment) {
  const chain = await getChain()
  const txs = await chain.transactions(Address.parse(p.recipient), 50)
  let reason = 'no_transaction'
  for (const tx of txs) {
    const why = rejectReason(tx, p)
    if (why) {
      // remember the most specific reason for a tx that carried THIS comment
      if (textComment(tx) === p.comment && why !== 'wrong_comment') reason = why
      continue
    }
    const r = await bindTx(p.id, { hash: tx.hash().toString('hex'), lt: tx.lt.toString(), at: tx.now })
    if (r.ok) return r.payment
    reason = r.reason
  }
  if (reason !== p.lastReason) await setStatus(p.id, ['PENDING'], 'PENDING', { lastReason: reason }).catch(() => undefined)
  return getTonTestnetPayment(p.id)!
}

export const tonTestnetProvider: PaymentProvider = {
  id: 'ton_testnet',
  real: false,
  async createPayment(req) {
    if (!req.payer) throw new PaymentProviderError('payer_required')
    const chain = await getChain()
    const recipient = merchantAddressOverride() ? Address.parse(merchantAddressOverride()!) : chain.minterAddress
    const amountTon = testnetPriceTon()
    return enqueueDataOp('nft:ton-pay-create', req.orderId, () => {
      const l = read()
      const id = `tt_${randomBytes(10).toString('hex')}`
      const p: TonTestnetPayment = {
        id,
        orderId: req.orderId,
        payer: Address.parse(req.payer!).toRawString(),
        recipient: recipient.toRawString(),
        amountNano: toNano(amountTon).toString(),
        amountTon,
        comment: paymentComment(req.orderId),
        createdAt: Date.now(),
        notAfter: req.notAfter ?? Date.now() + 15 * 60_000,
        status: 'PENDING',
      }
      l.payments[id] = p
      write(l)
      return {
        providerOrderId: id,
        paymentId: id,
        status: 'PENDING' as const,
        instructions: {
          network: 'testnet' as const,
          recipient: recipient.toString({ testOnly: true, bounceable: false }),
          amountNano: p.amountNano,
          amountTon,
          comment: p.comment,
          validUntil: p.notAfter,
        },
      }
    })
  },
  async getPaymentStatus(id) {
    let p = getTonTestnetPayment(id)
    if (!p) throw new PaymentProviderError('unknown_payment')
    if (p.status === 'PENDING') p = await scan(p)
    return { status: p.status, orderId: p.orderId, amount: p.amountTon, currency: 'TON_TESTNET', txHash: p.txHash, from: p.payer }
  },
  async verifyPayment(id, expected) {
    const p = await this.getPaymentStatus(id)
    if (p.orderId !== expected.orderId) return { ok: false, status: p.status, reason: 'order_mismatch' }
    if (p.amount !== expected.amount || expected.currency !== 'TON_TESTNET') return { ok: false, status: p.status, reason: 'amount_mismatch' }
    return { ok: true, status: p.status }
  },
  /** Sends the testnet TON back from the minter (when the minter is the merchant). */
  async refund(id) {
    const p = getTonTestnetPayment(id)
    if (!p) throw new PaymentProviderError('unknown_payment')
    if (p.status !== 'PAID') throw new PaymentProviderError(`cannot_refunded_from_${p.status.toLowerCase()}`)
    const chain = await getChain()
    if (!chain.minterAddress.equals(Address.parse(p.recipient))) throw new PaymentProviderError('refund_manual_merchant')
    const { seqno } = await chain.sendTon(Address.parse(p.payer), BigInt(p.amountNano), `DJH refund ${p.orderId.slice(0, 16)}`)
    const done = await setStatus(id, ['PAID'], 'REFUNDED', { refundSeqno: seqno })
    return { status: done.status }
  },
  /** Reservation over: one last look at the chain, then the payment can no longer be paid. */
  async cancel(id) {
    const p = getTonTestnetPayment(id)
    if (!p) throw new PaymentProviderError('unknown_payment')
    if (p.status !== 'PENDING') return { status: p.status }
    const after = await scan(p)
    if (after.status !== 'PENDING') return { status: after.status }
    return { status: (await setStatus(id, ['PENDING'], 'FAILED', { lastReason: 'reservation_expired' })).status }
  },
}

export const formatTon = (nano: string) => fromNano(BigInt(nano))
