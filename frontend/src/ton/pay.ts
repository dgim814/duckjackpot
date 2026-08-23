import { Address, beginCell, Cell, toNano } from '@ton/core'
import type { SendTransactionRequest } from '@tonconnect/ui-react'
import { USDT_MASTER } from '../constants'

function cellToBase64(cell: Cell) {
  const boc = cell.toBoc()
  if (typeof Buffer !== 'undefined' && typeof Buffer.isBuffer === 'function' && Buffer.isBuffer(boc)) {
    return boc.toString('base64')
  }
  const bytes = boc instanceof Uint8Array ? boc : new Uint8Array(boc)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function commentPayload(text: string) {
  return cellToBase64(beginCell().storeUint(0, 32).storeStringTail(text).endCell())
}

export function parseFriendlyAddress(value: string) {
  const trimmed = value.trim()
  if (!trimmed) throw new Error('no_merchant')
  return Address.parse(trimmed)
}

export function toUserFriendly(address: Address) {
  return address.toString({ urlSafe: true, bounceable: true })
}

export function estimateTonAmount(priceRub: number, tonRub: number) {
  if (!Number.isFinite(tonRub) || tonRub <= 0) throw new Error('ton_rate')
  const ton = priceRub / tonRub
  return Math.max(0.05, Math.round(ton * 1e4) / 1e4)
}

export function estimateUsdtAmount(priceRub: number, usdtRub: number) {
  if (!Number.isFinite(usdtRub) || usdtRub <= 0) throw new Error('usdt_rate')
  const usdt = priceRub / usdtRub
  return Math.max(0.01, Math.round(usdt * 100) / 100)
}

export async function fetchTonRubRate(): Promise<number> {
  const attempts = [
    async () => {
      const res = await fetch('https://tonapi.io/v2/rates?tokens=ton&currencies=rub', {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('tonapi')
      const data = (await res.json()) as {
        rates?: Record<string, { prices?: Record<string, number> }>
      }
      const rate = data.rates?.TON?.prices?.RUB
      if (!Number.isFinite(rate) || !rate || rate < 10) throw new Error('tonapi-rate')
      return rate
    },
    async () => {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=rub',
        { cache: 'no-store' },
      )
      if (!res.ok) throw new Error('cg')
      const data = (await res.json()) as Record<string, { rub?: number }>
      const rate = data['the-open-network']?.rub
      if (!Number.isFinite(rate) || !rate || rate < 10) throw new Error('cg-rate')
      return rate
    },
  ]
  let last: unknown
  for (const attempt of attempts) {
    try {
      return await attempt()
    } catch (err) {
      last = err
    }
  }
  throw last instanceof Error ? last : new Error('ton_rate')
}

export async function getUsdtJettonWallet(ownerFriendly: string): Promise<string> {
  const owner = Address.parse(ownerFriendly)
  const master = Address.parse(USDT_MASTER)
  const url = `https://tonapi.io/v2/accounts/${owner.toString()}/jettons/${master.toString()}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('no_usdt_wallet')
  const data = (await res.json()) as {
    wallet_address?: { address?: string }
  }
  const raw = data.wallet_address?.address
  if (!raw) throw new Error('no_usdt_wallet')
  return toUserFriendly(Address.parse(raw))
}

function usdtTransferPayload(params: {
  to: Address
  response: Address
  amount: bigint
  comment: string
}) {
  const forward = beginCell().storeUint(0, 32).storeStringTail(params.comment).endCell()
  const body = beginCell()
    .storeUint(0xf8a7ea5, 32)
    .storeUint(0, 64)
    .storeCoins(params.amount)
    .storeAddress(params.to)
    .storeAddress(params.response)
    .storeBit(false)
    .storeCoins(toNano('0.05'))
    .storeBit(true)
    .storeRef(forward)
    .endCell()
  return cellToBase64(body)
}

export function buildTonTransaction(params: {
  merchant: string
  tonAmount: number
  comment: string
}): SendTransactionRequest {
  const merchant = parseFriendlyAddress(params.merchant)
  return {
    validUntil: Math.floor(Date.now() / 1000) + 600,
    messages: [
      {
        address: toUserFriendly(merchant),
        amount: toNano(params.tonAmount.toFixed(9)).toString(),
        payload: commentPayload(params.comment),
      },
    ],
  }
}

export async function buildUsdtTransaction(params: {
  merchant: string
  owner: string
  usdtAmount: number
  comment: string
}): Promise<SendTransactionRequest> {
  const merchant = parseFriendlyAddress(params.merchant)
  const owner = Address.parse(params.owner)
  const jettonWallet = await getUsdtJettonWallet(params.owner)
  const amount = BigInt(Math.round(params.usdtAmount * 1_000_000))
  return {
    validUntil: Math.floor(Date.now() / 1000) + 600,
    messages: [
      {
        address: jettonWallet,
        amount: toNano('0.12').toString(),
        payload: usdtTransferPayload({
          to: merchant,
          response: owner,
          amount,
          comment: params.comment,
        }),
      },
    ],
  }
}

function bocHash(boc: string) {
  try {
    return Cell.fromBase64(boc).hash().toString('hex')
  } catch {
    return boc.slice(0, 64)
  }
}

export async function waitForTonTransaction(boc: string, timeoutMs = 75_000) {
  const hash = bocHash(boc)
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`https://tonapi.io/v2/blockchain/messages/${hash}`, {
        cache: 'no-store',
      })
      if (res.ok) return hash
    } catch {
      /* network */
    }
    await new Promise((resolve) => setTimeout(resolve, 2500))
  }
  return hash
}

export function paymentComment(raffleId: string, serialHint: string) {
  return `DuckJackpot ${raffleId} ${serialHint}`.slice(0, 120)
}
