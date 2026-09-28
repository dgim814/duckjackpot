import { testPaymentsAllowed } from '../config.js'
import { testPaymentProvider } from './testProvider.js'

/**
 * Payment adapter for the NFT Sale. The sale core only talks to this interface, so the provider
 * (TEST today; TonRamp, NOWPayments, Cryptomus or Pally later) can change without touching orders,
 * inventory or delivery. A webhook is only ever a *trigger*: the order moves after the server asks
 * the provider itself (`verifyPayment`), never because of what a webhook body claims.
 */
export type ProviderPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'

export type PaymentRequest = { orderId: string; telegramUserId: number; amount: number; currency: string; description: string }
export type ProviderPayment = { providerOrderId: string; paymentId: string; status: ProviderPaymentStatus; payUrl?: string }
export type PaymentState = { status: ProviderPaymentStatus; orderId: string; amount: number; currency: string }

export interface PaymentProvider {
  readonly id: string
  /** true = moves real money. Phase 1 refuses every such provider. */
  readonly real: boolean
  createPayment(req: PaymentRequest): Promise<ProviderPayment>
  getPaymentStatus(providerOrderId: string): Promise<PaymentState>
  /** Server-side confirmation that this payment belongs to this order, amount and currency. */
  verifyPayment(providerOrderId: string, expected: { orderId: string; amount: number; currency: string }): Promise<{ ok: boolean; status: ProviderPaymentStatus; reason?: string }>
  refund(providerOrderId: string): Promise<{ status: ProviderPaymentStatus }>
  /** Called when a reservation expires unpaid, so a late "paid" cannot happen for it. */
  cancel(providerOrderId: string): Promise<{ status: ProviderPaymentStatus }>
}

export class PaymentProviderError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'PaymentProviderError'
  }
}

/** Providers planned for later phases: named here so the admin sees they are NOT connected. */
export const FUTURE_PROVIDERS = ['tonramp', 'nowpayments', 'cryptomus', 'pally'] as const

export function paymentProvider(id: string): PaymentProvider {
  if (id === 'test') {
    if (!testPaymentsAllowed()) throw new PaymentProviderError('test_provider_disabled_in_production')
    return testPaymentProvider
  }
  if ((FUTURE_PROVIDERS as readonly string[]).includes(id)) throw new PaymentProviderError('provider_not_connected_phase1')
  throw new PaymentProviderError('unknown_provider')
}

/** The provider new orders use in Phase 1 — only the test one, and never a real-money provider. */
export function activeProvider(): PaymentProvider {
  const p = paymentProvider('test')
  if (p.real) throw new PaymentProviderError('real_payments_blocked_phase1')
  return p
}
