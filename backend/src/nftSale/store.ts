import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from '../config.js'
import { enqueueDataOp, writeJsonAtomic } from '../dataQueue.js'
import { NFT_SUPPLY } from './config.js'

/**
 * NFT Sale storage — its own folder (DATA_DIR/nft-sale), nothing shared with the NFT Drop or Stars.
 * Orders and the inventory live in ONE file written atomically, so a reservation and its order can
 * never disagree. Every change runs in the global serialized data queue (no two reservations race).
 * Never call a queued function from inside another queued task.
 */
const DIR = join(DATA_DIR, 'nft-sale')
const SALE_FILE = join(DIR, 'sale.json')
const WALLETS_FILE = join(DIR, 'wallets.json')
const STATE_FILE = join(DIR, 'state.json')

export type OrderStatus = 'PENDING' | 'RESERVED' | 'PAYMENT_PENDING' | 'PAID' | 'MINTING' | 'DELIVERING' | 'OWNER_VERIFIED' | 'DELIVERED' | 'FAILED' | 'REFUNDED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
/** AVAILABLE is "no entry". */
export type ItemStatus = 'RESERVED' | 'MINTING' | 'DELIVERED' | 'FAILED'

export const OPEN_STATUSES: OrderStatus[] = ['PENDING', 'RESERVED', 'PAYMENT_PENDING', 'PAID', 'MINTING', 'DELIVERING', 'OWNER_VERIFIED']

export type NftOrder = {
  id: string
  telegramUserId: number
  /** raw 0:hex of the wallet proven with ton_proof when the order was created */
  walletAddress: string
  walletFriendly: string
  /** edition #1..#2000 — chosen by the server */
  nftId: number
  price: number
  currency: string
  status: OrderStatus
  provider: string
  providerOrderId?: string
  paymentId?: string
  paymentStatus?: PaymentStatus
  network: 'testnet'
  createdAt: number
  updatedAt: number
  reservedUntil: number
  paidAt?: number
  /** what the buyer must send (on-chain providers) — chosen by the server */
  paymentInstructions?: { network: 'testnet'; recipient: string; amountNano: string; amountTon: number; comment: string; validUntil: number }
  /** the testnet payment transaction the server credited (hash hex) and its sender */
  paymentTxHash?: string
  paymentFrom?: string
  mintStartedAt?: number
  mintSeqno?: number
  mintSubmittedAt?: number
  mintValidUntil?: number
  /** minter-wallet transaction that sent the mint */
  mintTxHash?: string
  /** submitted but not visible on-chain yet (still MINTING, never delivered) */
  mintWarning?: string
  ownerVerifiedAt?: number
  deliveredAt?: number
  itemAddress?: string
  /** the item's deployment transaction (the buyer becomes owner here) */
  itemTxHash?: string
  txHash?: string
  error?: string
  attempts: number
  history: { status: OrderStatus; at: number; note?: string }[]
}

type Sale = { orders: Record<string, NftOrder>; inventory: Record<string, { status: ItemStatus; orderId: string; at: number }> }

function readJson<T>(file: string, empty: T): T {
  if (!existsSync(file)) return empty
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T
  } catch (err) {
    // never continue with a silently empty store (it would re-sell reserved editions)
    console.error('[nft-sale] unreadable store', file, err)
    throw new Error('nft_store_unreadable')
  }
}
function writeJson(file: string, value: unknown) {
  mkdirSync(DIR, { recursive: true })
  writeJsonAtomic(file, value)
}
const readSale = (): Sale => {
  const s = readJson<Partial<Sale>>(SALE_FILE, {})
  return { orders: s.orders ?? {}, inventory: s.inventory ?? {} }
}

// ---------- reads ----------

export function getOrder(id: string) {
  return readSale().orders[id] ?? null
}
export function allOrders() {
  return Object.values(readSale().orders).sort((a, b) => b.createdAt - a.createdAt)
}
export function ordersOf(telegramUserId: number) {
  return allOrders().filter((o) => o.telegramUserId === telegramUserId)
}
export function findOrderByProviderRef(provider: string, providerOrderId: string) {
  return Object.values(readSale().orders).find((o) => o.provider === provider && o.providerOrderId === providerOrderId) ?? null
}
export function inventoryCounts() {
  const { inventory } = readSale()
  const c = { supply: NFT_SUPPLY, available: NFT_SUPPLY, reserved: 0, minting: 0, delivered: 0, failed: 0 }
  for (const it of Object.values(inventory)) {
    c.available -= 1
    if (it.status === 'RESERVED') c.reserved += 1
    else if (it.status === 'MINTING') c.minting += 1
    else if (it.status === 'DELIVERED') c.delivered += 1
    else c.failed += 1
  }
  return c
}
/** The edition the next buyer would get (lowest free one), or null when sold out. */
export function nextAvailable() {
  const { inventory } = readSale()
  for (let n = 1; n <= NFT_SUPPLY; n++) if (!inventory[n]) return n
  return null
}
export function itemStatus(n: number) {
  return readSale().inventory[n]?.status ?? 'AVAILABLE'
}

// ---------- writes (queued) ----------

const now = () => Date.now()
function push(o: NftOrder, status: OrderStatus, note?: string) {
  o.status = status
  o.updatedAt = now()
  o.history.push(note ? { status, at: o.updatedAt, note } : { status, at: o.updatedAt })
}

/**
 * Atomically: a user with an open order gets that order back (no second reservation); otherwise the
 * lowest AVAILABLE edition becomes RESERVED for a new order. Client input never picks the edition.
 */
export function reserveOrder(input: { telegramUserId: number; walletAddress: string; walletFriendly: string; provider: string; price: number; currency: string; ttlMs: number }) {
  return enqueueDataOp('nft:reserve', undefined, () => {
    const s = readSale()
    const open = Object.values(s.orders).find((o) => o.telegramUserId === input.telegramUserId && OPEN_STATUSES.includes(o.status))
    if (open) return { order: open, existing: true as const }
    let n = 0
    for (let i = 1; i <= NFT_SUPPLY; i++)
      if (!s.inventory[i]) {
        n = i
        break
      }
    if (!n) return { error: 'sold_out' as const }
    const t = now()
    const order: NftOrder = {
      id: randomBytes(12).toString('hex'),
      telegramUserId: input.telegramUserId,
      walletAddress: input.walletAddress,
      walletFriendly: input.walletFriendly,
      nftId: n,
      price: input.price,
      currency: input.currency,
      status: 'PENDING',
      provider: input.provider,
      network: 'testnet',
      createdAt: t,
      updatedAt: t,
      reservedUntil: t + input.ttlMs,
      attempts: 0,
      history: [{ status: 'PENDING', at: t }],
    }
    push(order, 'RESERVED', `#${n}`)
    s.orders[order.id] = order
    s.inventory[n] = { status: 'RESERVED', orderId: order.id, at: t }
    writeJson(SALE_FILE, s)
    return { order, existing: false as const }
  })
}

type Patch = Partial<Omit<NftOrder, 'id' | 'telegramUserId' | 'nftId' | 'history' | 'status'>>

/**
 * Guarded state change: applied only if the order is currently in one of `from`. `item` moves the
 * order's edition in the inventory (null = back to AVAILABLE, only if this order still holds it).
 */
export function transition(orderId: string, from: OrderStatus[], to: OrderStatus, patch: Patch = {}, item?: ItemStatus | null, note?: string) {
  return enqueueDataOp('nft:transition', orderId, () => {
    const s = readSale()
    const o = s.orders[orderId]
    if (!o) return { ok: false as const, reason: 'not_found' as const, order: null }
    if (!from.includes(o.status)) return { ok: false as const, reason: 'wrong_status' as const, order: o }
    Object.assign(o, patch)
    if (to !== o.status || note) push(o, to, note)
    else o.updatedAt = now()
    if (item !== undefined) {
      const held = s.inventory[o.nftId]
      if (item === null) {
        if (held?.orderId === o.id) delete s.inventory[o.nftId]
      } else if (!held || held.orderId === o.id) {
        s.inventory[o.nftId] = { status: item, orderId: o.id, at: now() }
      }
    }
    writeJson(SALE_FILE, s)
    return { ok: true as const, order: o }
  })
}

/** Field update without a status change (payment refs, mint bookkeeping). */
export function patchOrder(orderId: string, patch: Patch) {
  return enqueueDataOp('nft:patch', orderId, () => {
    const s = readSale()
    const o = s.orders[orderId]
    if (!o) return null
    Object.assign(o, patch, { updatedAt: now() })
    writeJson(SALE_FILE, s)
    return o
  })
}

// ---------- wallets (Telegram user ↔ TON wallet, proven with ton_proof) ----------

export type WalletLink = { address: string; friendly: string; publicKey: string; network: 'testnet'; walletApp?: string; verifiedAt: number }

export function getWallet(telegramUserId: number): WalletLink | null {
  return readJson<Record<string, WalletLink>>(WALLETS_FILE, {})[String(telegramUserId)] ?? null
}
export function setWallet(telegramUserId: number, link: WalletLink) {
  return enqueueDataOp('nft:wallet', undefined, () => {
    const all = readJson<Record<string, WalletLink>>(WALLETS_FILE, {})
    all[String(telegramUserId)] = link
    writeJson(WALLETS_FILE, all)
    return link
  })
}
export function removeWallet(telegramUserId: number) {
  return enqueueDataOp('nft:wallet-remove', undefined, () => {
    const all = readJson<Record<string, WalletLink>>(WALLETS_FILE, {})
    delete all[String(telegramUserId)]
    writeJson(WALLETS_FILE, all)
    return true
  })
}

// ---------- chain state (deployed testnet collection) ----------

export type ChainState = { collectionAddress?: string; deployedAt?: number; network: 'testnet' }
export function getChainState(): ChainState {
  return readJson<ChainState>(STATE_FILE, { network: 'testnet' })
}
export function setChainState(patch: Partial<ChainState>) {
  return enqueueDataOp('nft:chain-state', undefined, () => {
    const next = { ...getChainState(), ...patch, network: 'testnet' as const }
    writeJson(STATE_FILE, next)
    return next
  })
}

export const NFT_SALE_DIR = DIR
