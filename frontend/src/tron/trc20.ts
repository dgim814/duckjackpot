/** Tether USDT TRC-20 contract on TRON mainnet */
export const USDT_TRC20_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'

export function isTronAddress(value: string) {
  const address = value.trim()
  return address.startsWith('T') && address.length === 34
}

type Trc20Tx = {
  transaction_id?: string
  to?: string
  value?: string
  block_timestamp?: number
}

export async function waitForTrc20Usdt(params: {
  to: string
  amount: number
  sinceMs: number
  timeoutMs?: number
  signal?: AbortSignal
}) {
  const expected = BigInt(Math.round(params.amount * 1_000_000))
  const timeout = params.timeoutMs ?? 120_000
  const started = Date.now()
  const url =
    `https://api.trongrid.io/v1/accounts/${encodeURIComponent(params.to.trim())}` +
    `/transactions/trc20?only_to=true&limit=40&contract_address=${USDT_TRC20_CONTRACT}`

  while (Date.now() - started < timeout) {
    if (params.signal?.aborted) throw new Error('cancel')
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const body = (await res.json()) as { data?: Trc20Tx[] }
        const match = (body.data ?? []).find((tx) => {
          if (!tx.transaction_id || !tx.value) return false
          if (BigInt(tx.value) !== expected) return false
          const ts = typeof tx.block_timestamp === 'number' ? tx.block_timestamp : 0
          return ts >= params.sinceMs - 30_000
        })
        if (match?.transaction_id) return match.transaction_id
      }
    } catch {
      /* network */
    }
    await new Promise((resolve) => setTimeout(resolve, 4000))
  }
  throw new Error('trc20_timeout')
}
