import { USDT_RUB_DEFAULT } from '../constants'

export type FxQuote = {
  rate: number
  source: string
}

function todayKey() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function readJson(url: string) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`fx ${res.status}`)
  return res.json() as Promise<Record<string, unknown>>
}

function asRate(value: unknown) {
  const rate = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(rate) || rate < 20 || rate > 300) return null
  return rate
}

export async function fetchUsdRubRate(): Promise<FxQuote> {
  const attempts: Array<() => Promise<FxQuote>> = [
    async () => {
      const data = await readJson('https://open.er-api.com/v6/latest/USD')
      const rates = data.rates as Record<string, number> | undefined
      const rate = asRate(rates?.RUB)
      if (!rate) throw new Error('er-api')
      return { rate, source: 'open.er-api.com' }
    },
    async () => {
      const data = await readJson('https://api.frankfurter.app/latest?from=USD&to=RUB')
      const rates = data.rates as Record<string, number> | undefined
      const rate = asRate(rates?.RUB)
      if (!rate) throw new Error('frankfurter')
      return { rate, source: 'frankfurter.app' }
    },
    async () => {
      const data = await readJson(
        'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
      )
      const usd = data.usd as Record<string, number> | undefined
      const rate = asRate(usd?.rub)
      if (!rate) throw new Error('jsdelivr')
      return { rate, source: 'currency-api' }
    },
  ]

  let lastError: unknown
  for (const attempt of attempts) {
    try {
      return await attempt()
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('fx failed')
}

export function formatUsdt(amount: number, locale: string) {
  return amount.toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })
}

export function rubToUsdt(priceRub: number, usdtRub: number) {
  const rate = usdtRub > 0 ? usdtRub : USDT_RUB_DEFAULT
  return priceRub / rate
}

export { todayKey }
