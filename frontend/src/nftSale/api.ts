import { api, API_ORIGIN } from '../api/client'
import { telegramInitData } from '../telegram/user'

/**
 * 🖼 NFT SALE client (TON testnet). The server decides everything: edition number, price,
 * payment result, mint and delivery. This module only sends the signed Telegram initData, the
 * wallet's ton_proof and "which order" — never a status, NFT id, price or owner.
 */
export type SaleConfig =
  | { enabled: false }
  | {
      enabled: true
      phase: number
      network: 'testnet'
      name: string
      supply: number
      available: number
      nextNumber: number | null
      priceLabel: string
      networkLabel?: string
      artNotice?: string
      provider?: 'test' | 'ton_testnet' | null
      testPayments: boolean
      chainReady: boolean
      collection: { address: string; explorerUrl: string | null } | null
    }

export type OrderStatus = 'PENDING' | 'RESERVED' | 'PAYMENT_PENDING' | 'PAID' | 'MINTING' | 'DELIVERING' | 'OWNER_VERIFIED' | 'DELIVERED' | 'FAILED' | 'REFUNDED'
export type PaymentInstructions = { network: 'testnet'; recipient: string; amountNano: string; amountTon: number; comment: string; validUntil: number }
export type TxLinks = { item: string | null; collection: string | null; paymentTx: string | null; mintTx: string | null; itemTx: string | null }
export type SaleOrder = {
  id: string
  nftId: number
  edition: string
  status: OrderStatus
  network: 'testnet'
  wallet: string
  provider: string
  createdAt: number
  reservedUntil: number
  paidAt: number | null
  deliveredAt: number | null
  itemAddress: string | null
  collectionAddress?: string | null
  paymentInstructions?: PaymentInstructions | null
  paymentTxHash?: string | null
  mintTxHash?: string | null
  txHash: string | null
  explorerUrl: string | null
  links?: TxLinks
  metadataUrl?: string | null
  mintWarning?: string | null
  error: string | null
}
export type SaleMe = { wallet: { address: string; network: 'testnet'; verifiedAt: number } | null; orders: SaleOrder[]; nfts: SaleOrder[] }

export const NFT_ART_URL = `${API_ORIGIN}/api/nft-sale/art/heist-testnet-placeholder.png`

export class SaleApiError extends Error {}
async function post<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  try {
    const { data } = await api.post<T>(path, { initData: telegramInitData(), ...body })
    return data
  } catch (err) {
    const e = err as { response?: { data?: { error?: string } } }
    throw new SaleApiError(e.response?.data?.error || 'network_error')
  }
}

let configCache: { at: number; value: Promise<SaleConfig> } | null = null
/** Sale config, cached for a minute (the hub asks on every visit). */
export function saleConfig(fresh = false): Promise<SaleConfig> {
  if (!fresh && configCache && Date.now() - configCache.at < 60_000) return configCache.value
  const value = api
    .get<SaleConfig>('/nft-sale/config')
    .then((r) => r.data)
    .catch(() => ({ enabled: false }) as SaleConfig)
  configCache = { at: Date.now(), value }
  return value
}

export const saleMe = () => post<SaleMe>('/nft-sale/me')
export const walletNonce = () => post<{ payload: string; expiresAt: number }>('/nft-sale/wallet/nonce')
export const verifyWallet = (body: { account: { address: string; chain: string; publicKey?: string; walletStateInit: string }; proof: unknown; walletApp?: string }) =>
  post<{ wallet: NonNullable<SaleMe['wallet']> }>('/nft-sale/wallet/verify', body)
export const disconnectWallet = () => post<{ ok: true }>('/nft-sale/wallet/disconnect')
export const createOrder = () => post<{ order: SaleOrder; existing: boolean }>('/nft-sale/orders')
export const orderStatus = (orderId: string) => post<{ order: SaleOrder }>('/nft-sale/orders/status', { orderId })
export const checkPayment = (orderId: string) => post<{ order: SaleOrder }>('/nft-sale/orders/check-payment', { orderId })
export const testPay = (orderId: string, outcome: 'PAID' | 'FAILED') => post<{ order: SaleOrder }>('/nft-sale/orders/test-pay', { orderId, outcome })

export const shortAddress = (a: string) => (a.length > 16 ? `${a.slice(0, 6)}…${a.slice(-6)}` : a)
