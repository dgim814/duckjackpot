import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'
import { enqueueDataOp, writeJsonAtomic } from './dataQueue.js'

/**
 * NFT Drop — TON payments verified by the SERVER on-chain.
 *
 * 1. quote: the server fixes the amount (its own TON/RUB rate), the receiving wallet and a
 *    unique comment for this order;
 * 2. the player sends exactly that transfer from their wallet (TON Connect);
 * 3. confirm: the server looks for a successful incoming transfer to the merchant wallet with
 *    that comment and at least that amount (TonAPI), not already used by another order.
 * Nothing the client says (tx hash, "paid", timeout) is ever taken as proof of payment.
 */
const FILE = join(DATA_DIR, 'ton-orders.json')
const QUOTE_TTL_MS = 30 * 60_000
const TONAPI = () => (process.env.TONAPI_BASE ?? 'https://tonapi.io').replace(/\/$/, '')

export type TonOrder = {
  id: string
  telegramId: number
  telegramUsername?: string
  raffleId: string
  priceRub: number
  tonRub: number
  amountTon: number
  expectedNano: string
  merchant: string
  comment: string
  createdAt: number
  expiresAt: number
  status: 'pending' | 'issuing' | 'paid' | 'paid_unissued'
  txHash?: string
  paidAt?: number
  cardId?: string
  error?: string
}

type Store = { orders: Record<string, TonOrder>; txs: Record<string, string> }

function read(): Store {
  try {
    if (!existsSync(FILE)) return { orders: {}, txs: {} }
    const s = JSON.parse(readFileSync(FILE, 'utf8')) as Store
    return { orders: s.orders ?? {}, txs: s.txs ?? {} }
  } catch (err) {
    console.error('[ton-pay] ton-orders.json unreadable', err)
    throw new Error('ton_store_unreadable')
  }
}

const tonapiHeaders = () => (process.env.TONAPI_KEY ? { Authorization: `Bearer ${process.env.TONAPI_KEY}` } : undefined)

/** TON/RUB on the server (TonAPI, then CoinGecko). */
export async function serverTonRub(): Promise<number> {
  try {
    const r = await fetch(`${TONAPI()}/v2/rates?tokens=ton&currencies=rub`, { headers: tonapiHeaders() })
    const d = (await r.json()) as { rates?: Record<string, { prices?: Record<string, number> }> }
    const rate = d.rates?.TON?.prices?.RUB
    if (rate && Number.isFinite(rate) && rate > 10) return rate
  } catch {
    /* fall through */
  }
  const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=rub')
  const d = (await r.json()) as Record<string, { rub?: number }>
  const rate = d['the-open-network']?.rub
  if (rate && Number.isFinite(rate) && rate > 10) return rate
  throw new Error('ton_rate')
}

export function createTonQuote(input: { telegramId: number; telegramUsername?: string; raffleId: string; priceRub: number; tonRub: number; merchant: string }, now = Date.now()) {
  return enqueueDataOp('ton:quote', undefined, () => {
    const s = read()
    const id = randomBytes(8).toString('hex')
    const amountTon = Math.max(0.05, Math.round((input.priceRub / input.tonRub) * 1e4) / 1e4)
    const order: TonOrder = {
      id,
      telegramId: input.telegramId,
      telegramUsername: input.telegramUsername,
      raffleId: input.raffleId,
      priceRub: input.priceRub,
      tonRub: input.tonRub,
      amountTon,
      expectedNano: String(BigInt(Math.round(amountTon * 1e9))),
      merchant: input.merchant,
      comment: `DuckJackpot ${input.raffleId} T${id}`,
      createdAt: now,
      expiresAt: now + QUOTE_TTL_MS,
      status: 'pending',
    }
    s.orders[id] = order
    writeJsonAtomic(FILE, s)
    return order
  })
}

export function getTonOrder(id: string) {
  return read().orders[id] ?? null
}

type TonapiTx = {
  hash: string
  utime: number
  success: boolean
  aborted?: boolean
  in_msg?: { value?: number | string; decoded_op_name?: string; decoded_body?: { text?: string }; msg_type?: string; bounced?: boolean }
}

/** Successful incoming transfer to the merchant with the order's comment and amount (TonAPI). */
export async function findOrderTransfer(order: TonOrder): Promise<TonapiTx | null> {
  const url = `${TONAPI()}/v2/blockchain/accounts/${encodeURIComponent(order.merchant)}/transactions?limit=100`
  const r = await fetch(url, { headers: tonapiHeaders() })
  if (!r.ok) throw new Error(`tonapi_${r.status}`)
  const d = (await r.json()) as { transactions?: TonapiTx[] }
  const expected = BigInt(order.expectedNano)
  for (const tx of d.transactions ?? []) {
    const m = tx.in_msg
    if (!tx.success || tx.aborted || !m || m.bounced) continue
    if (m.msg_type && m.msg_type !== 'int_msg') continue
    if (m.decoded_op_name !== 'text_comment' || m.decoded_body?.text !== order.comment) continue
    if (tx.utime * 1000 < order.createdAt - 120_000) continue
    let value: bigint
    try {
      value = BigInt(String(m.value ?? '0'))
    } catch {
      continue
    }
    if (value < expected) continue
    return tx
  }
  return null
}

/**
 * Step 1 (atomic): bind a verified tx to this order, once. A tx hash belongs to one order only;
 * a second confirm while the card is being issued just waits. No nested queue calls here.
 */
export function bindTonTx(orderId: string, txHash: string) {
  return enqueueDataOp('ton:bind', txHash, () => {
    const s = read()
    const o = s.orders[orderId]
    if (!o) return { error: 'not_found' as const }
    if (s.txs[txHash] && s.txs[txHash] !== orderId) return { error: 'tx_reused' as const }
    if (o.status === 'paid' || o.status === 'paid_unissued') return { order: o, state: 'done' as const }
    if (o.status === 'issuing') return { order: o, state: 'issuing' as const }
    o.status = 'issuing'
    o.txHash = txHash
    o.paidAt = Date.now()
    s.txs[txHash] = orderId
    writeJsonAtomic(FILE, s)
    return { order: o, state: 'bound' as const }
  })
}

/** Step 3 (atomic): the card was issued (or could not be) for this order. */
export function finishTonOrder(orderId: string, result: { cardId: string } | { error: string }) {
  return enqueueDataOp('ton:finish', orderId, () => {
    const s = read()
    const o = s.orders[orderId]
    if (!o) return null
    if ('cardId' in result) {
      o.status = 'paid'
      o.cardId = result.cardId
    } else {
      o.status = 'paid_unissued'
      o.error = result.error
    }
    writeJsonAtomic(FILE, s)
    return o
  })
}

export function allTonOrders() {
  return Object.values(read().orders).sort((a, b) => b.createdAt - a.createdAt)
}
