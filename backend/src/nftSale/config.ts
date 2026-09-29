import { readFileSync } from 'node:fs'
/**
 * 🖼 NFT SALE — Phase 1 configuration and safety gates (TESTNET ONLY, no real money).
 *
 * A separate system next to the NFT Drop (cards + raffle), which it never touches.
 * Everything here is read from the environment on every call, so a Railway variable change
 * applies after a restart and tests can switch settings per process.
 */

export const NFT_SUPPLY = 2000
export const COLLECTION_NAME = 'DUCKJACKPOT HEIST'
export const COLLECTION_SYMBOL = 'HEIST'
export const PLACEHOLDER_NOTICE = 'TESTNET PLACEHOLDER — NOT FINAL ART'

/** Phase 1 knows ONE network. Mainnet is not implemented — not just switched off. */
export type NftNetwork = 'testnet'

/** Where the chain lives: the TON testnet (TON Center) or the in-process TVM sandbox (dev/test only). */
export type ChainMode = 'toncenter' | 'sandbox'

const env = (name: string) => (process.env[name] ?? '').trim()

/**
 * Production = NODE_ENV=production, or ANY Railway deployment unless its environment is explicitly
 * named something other than "production" (e.g. a future "staging"). Fail-safe: a Railway service
 * without an environment name counts as production.
 */
export function isProduction() {
  if (env('NODE_ENV') === 'production') return true
  const onRailway = Boolean(env('RAILWAY_PROJECT_ID') || env('RAILWAY_SERVICE_ID') || env('RAILWAY_PUBLIC_DOMAIN') || env('RAILWAY_VOLUME_MOUNT_PATH'))
  const name = env('RAILWAY_ENVIRONMENT_NAME') || env('RAILWAY_ENVIRONMENT')
  if (name === 'production') return true
  return onRailway && !name
}

/** NFT_SALE_ENABLED=true opens the sale screen and user endpoints. Default: off. */
export function saleEnabled() {
  return env('NFT_SALE_ENABLED') === 'true'
}

export class NftConfigError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'NftConfigError'
  }
}

/**
 * The only accepted network is testnet. Any other value (mainnet, empty typo…) is refused,
 * in every environment: Phase 1 cannot mint or sell on mainnet.
 */
export function nftNetwork(): NftNetwork {
  const v = env('NFT_NETWORK') || 'testnet'
  if (v !== 'testnet') throw new NftConfigError(v === 'mainnet' ? 'mainnet_blocked_phase1' : 'unknown_network')
  return 'testnet'
}

/**
 * Hard start guard (Phase 2): in production a mainnet configuration without the explicit
 * NFT_MAINNET_APPROVED=true makes the whole NFT Sale subsystem refuse to start (no routes, no worker).
 * Even when approved, mainnet stays unimplemented (nftNetwork() refuses it) until a later phase.
 */
export function subsystemRefusal(): string | null {
  if (isProduction() && env('NFT_NETWORK') === 'mainnet' && env('NFT_MAINNET_APPROVED') !== 'true') return 'mainnet_not_approved'
  return null
}

/** sandbox = emulated TVM inside this process (the official @ton/sandbox): never in production. */
export function chainMode(): ChainMode {
  const v = env('NFT_CHAIN') || 'toncenter'
  if (v === 'sandbox') {
    if (isProduction()) throw new NftConfigError('sandbox_blocked_in_production')
    return 'sandbox'
  }
  if (v !== 'toncenter') throw new NftConfigError('unknown_chain')
  return 'toncenter'
}

/** TON Center testnet JSON-RPC. Hard-coded to testnet on purpose (no mainnet URL anywhere). */
export const TONCENTER_TESTNET_ENDPOINT = 'https://testnet.toncenter.com/api/v2/jsonRPC'
export function toncenterApiKey() {
  return env('TONCENTER_TESTNET_API_KEY') || undefined
}

export const TESTNET_EXPLORER = 'https://testnet.tonviewer.com'

/** 24-word mnemonic of the testnet minter wallet. Railway secret only — never logged, never sent. */
export function minterMnemonic(): string[] | null {
  let raw = env('NFT_TESTNET_MINTER_MNEMONIC')
  // local runs only: a private 0600 file (from npm run nft:testnet-wallet) instead of an env value
  const file = env('NFT_TESTNET_MINTER_MNEMONIC_FILE')
  if (!raw && file && !isProduction()) {
    try {
      raw = readFileSync(file, 'utf8').trim()
    } catch {
      raw = ''
    }
  }
  const words = raw.split(/\s+/).filter(Boolean)
  return words.length === 24 ? words : null
}

/** Optional: an already deployed testnet collection (otherwise the admin deploys one). */
export function collectionAddressOverride() {
  return env('NFT_COLLECTION_ADDRESS') || null
}

/** Stable TEP-64 metadata path on this backend (collection.json and one URL per edition). */
export const METADATA_PATH = '/api/nft-sale/testnet/metadata/'

/** Public base URL of this backend: TEP-64 metadata and the placeholder art are served from here. */
export function metadataBaseUrl() {
  const explicit = env('NFT_METADATA_BASE_URL').replace(/\/$/, '')
  if (explicit) return explicit
  const domain = env('RAILWAY_PUBLIC_DOMAIN').replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (domain) return `https://${domain}`
  return `http://localhost:${env('PORT') || '3001'}`
}

/** Domains a ton_proof may be signed for (the TON Connect manifest's host). */
export function proofDomains() {
  const list = env('NFT_PROOF_DOMAINS')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
  return list.length ? list : ['duckjackpot.vercel.app']
}

export const PROOF_TTL_S = 15 * 60
export const PROOF_FUTURE_SKEW_S = 60

/** 15 minutes. Tests (never production) may shorten it with NFT_RESERVATION_TTL_S. */
export function reservationTtlMs() {
  const s = Number(env('NFT_RESERVATION_TTL_S'))
  if (!isProduction() && Number.isFinite(s) && s >= 1) return s * 1000
  return 15 * 60_000
}

/**
 * The TEST payment provider (simulated PENDING / PAID / FAILED / REFUNDED) only exists outside
 * production. In production every request naming it is rejected.
 */
export function testPaymentsAllowed() {
  return !isProduction()
}

/** Phase 1 test price: no real price is shown or charged. */
export const TEST_PRICE = { amount: 0, currency: 'TEST' as const }

/**
 * Payment provider for new orders. Phase 2: "ton_testnet" (real TESTNET TON transfer, verified
 * on-chain by the server — default) or "test" (simulated). Both are refused in production.
 */
export function paymentProviderId() {
  const v = env('NFT_PAYMENT_PROVIDER') || 'ton_testnet'
  return v === 'test' ? 'test' : 'ton_testnet'
}

/** Price of one TESTNET NFT in testnet TON (no value). */
export function testnetPriceTon() {
  const v = Number(env('NFT_TESTNET_PRICE_TON') || '0.05')
  return Number.isFinite(v) && v >= 0.01 && v <= 5 ? v : 0.05
}

/** Optional separate testnet merchant address (default: the minter wallet receives testnet payments). */
export function merchantAddressOverride() {
  return env('NFT_TESTNET_MERCHANT_ADDRESS') || null
}

/** A submitted mint that is not visible after this long is FAILED (before that it stays MINTING). */
export function mintHardTimeoutMs() {
  const s = Number(env('NFT_MINT_HARD_TIMEOUT_S'))
  return (Number.isFinite(s) && s >= 1 ? s : 1800) * 1000
}

/** Value attached to one mint (collection → new item); the reference item keeps ≥ 0.05 TON for storage. */
export const MINT_ITEM_VALUE_TON = '0.06'
export const MINT_MESSAGE_VALUE_TON = '0.08'

/** How long a submitted mint may take before the worker treats it as not confirmed. */
export function mintConfirmTimeoutMs() {
  const s = Number(env('NFT_MINT_CONFIRM_TIMEOUT_S'))
  return (Number.isFinite(s) && s >= 1 ? s : 180) * 1000
}
