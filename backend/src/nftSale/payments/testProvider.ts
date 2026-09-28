import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { enqueueDataOp, writeJsonAtomic } from '../../dataQueue.js'
import { testPaymentsAllowed } from '../config.js'
import { NFT_SALE_DIR } from '../store.js'
import { PaymentProviderError, type PaymentProvider, type ProviderPaymentStatus } from './provider.js'

/**
 * TEST payment provider — dev/test environments only (refused in production by `paymentProvider`
 * and again here). It behaves like an external provider with its own ledger: a payment is created
 * PENDING and only moves when the simulator says PAID / FAILED, or on refund/cancel. No money.
 */
const FILE = join(NFT_SALE_DIR, 'test-payments.json')
type TestPayment = { id: string; orderId: string; amount: number; currency: string; status: ProviderPaymentStatus; createdAt: number; updatedAt: number }

function guard() {
  if (!testPaymentsAllowed()) throw new PaymentProviderError('test_provider_disabled_in_production')
}
function read(): Record<string, TestPayment> {
  if (!existsSync(FILE)) return {}
  return JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, TestPayment>
}
function write(all: Record<string, TestPayment>) {
  mkdirSync(NFT_SALE_DIR, { recursive: true })
  writeJsonAtomic(FILE, all)
}
function move(id: string, from: ProviderPaymentStatus[], to: ProviderPaymentStatus) {
  return enqueueDataOp('nft:test-pay', id, () => {
    const all = read()
    const p = all[id]
    if (!p) throw new PaymentProviderError('unknown_payment')
    if (p.status !== to) {
      if (!from.includes(p.status)) throw new PaymentProviderError(`cannot_${to.toLowerCase()}_from_${p.status.toLowerCase()}`)
      p.status = to
      p.updatedAt = Date.now()
      write(all)
    }
    return { status: p.status }
  })
}

export const testPaymentProvider: PaymentProvider & { simulate(id: string, outcome: 'PAID' | 'FAILED'): Promise<{ status: ProviderPaymentStatus }> } = {
  id: 'test',
  real: false,
  async createPayment(req) {
    guard()
    return enqueueDataOp('nft:test-pay-create', req.orderId, () => {
      const all = read()
      const id = `test_${randomBytes(10).toString('hex')}`
      all[id] = { id, orderId: req.orderId, amount: req.amount, currency: req.currency, status: 'PENDING', createdAt: Date.now(), updatedAt: Date.now() }
      write(all)
      return { providerOrderId: id, paymentId: id, status: 'PENDING' as const }
    })
  },
  async getPaymentStatus(id) {
    guard()
    const p = read()[id]
    if (!p) throw new PaymentProviderError('unknown_payment')
    return { status: p.status, orderId: p.orderId, amount: p.amount, currency: p.currency }
  },
  async verifyPayment(id, expected) {
    const p = await this.getPaymentStatus(id)
    if (p.orderId !== expected.orderId) return { ok: false, status: p.status, reason: 'order_mismatch' }
    if (p.amount !== expected.amount || p.currency !== expected.currency) return { ok: false, status: p.status, reason: 'amount_mismatch' }
    return { ok: true, status: p.status }
  },
  async refund(id) {
    guard()
    return move(id, ['PAID'], 'REFUNDED')
  },
  async cancel(id) {
    guard()
    return move(id, ['PENDING'], 'FAILED')
  },
  /** The "payment page" of the test provider: the tester decides the outcome. */
  async simulate(id, outcome) {
    guard()
    return move(id, ['PENDING'], outcome)
  },
}
