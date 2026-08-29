export const STORAGE_KEYS = {
  lang: 'duckjackpot.lang',
  agreement: 'duckjackpot.agreement.v1',
  cards: 'duckjackpot.cards.v2',
  raffle: 'duckjackpot.raffle.v1',
  usdtRub: 'duckjackpot.usdtRub.v1',
  fxCache: 'duckjackpot.fx.v1',
  preAml: 'duckjackpot.preaml.v1',
  admin: 'duckjackpot.admin.v1',
  adminAuth: 'duckjackpot.admin.auth',
  telegramId: 'duckjackpot.telegramId.v1',
  telegramUsername: 'duckjackpot.telegramUsername.v1',
} as const

export type RaffleId = 'classic' | 'fast200' | 'fast100'

export type Prize = {
  place: number
  amount: string
}

export type Raffle = {
  id: RaffleId
  total: number
  priceRub: number
  demoSold: number
  prizes: Prize[]
  testTon: string
  testUsdt: string
}

export const RAFFLES: Record<RaffleId, Raffle> = {
  classic: {
    id: 'classic',
    total: 2000,
    priceRub: 1000,
    demoSold: 734,
    prizes: [
      { place: 1, amount: '5000 USDT' },
      { place: 2, amount: '2000 USDT' },
      { place: 3, amount: '500 USDT' },
      { place: 4, amount: '100 USDT' },
      { place: 5, amount: '50 USDT' },
      { place: 6, amount: '50 USDT' },
    ],
    testTon: '2.5 TON',
    testUsdt: '12 USDT',
  },
  fast200: {
    id: 'fast200',
    total: 200,
    priceRub: 400,
    demoSold: 81,
    prizes: [
      { place: 1, amount: '400 USDT' },
      { place: 2, amount: '100 USDT' },
      { place: 3, amount: '50 USDT' },
    ],
    testTon: '1 TON',
    testUsdt: '5 USDT',
  },
  fast100: {
    id: 'fast100',
    total: 100,
    priceRub: 500,
    demoSold: 44,
    prizes: [
      { place: 1, amount: '300 USDT' },
      { place: 2, amount: '100 USDT' },
      { place: 3, amount: '50 USDT' },
    ],
    testTon: '1.2 TON',
    testUsdt: '6 USDT',
  },
}

export const RAFFLE_ORDER: RaffleId[] = ['classic', 'fast200', 'fast100']

export const TEST_PAY = {
  enabled: true,
} as const

export const USDT_RUB_DEFAULT = 95
export const CARD_ART = '/duck-jackpot.jpg'
export const SUPPORT_BOT_URL = 'https://t.me/DuckJackpotSupportBot'

/** Fallback only when nothing is saved on the backend. Do not write these into admin fields. */
export const DEFAULT_USDT_TRC20 = 'TQVrB6XACMwhAJXh1eJUVw5cEgEL3ZfML'
export const DEFAULT_TON_WALLET = 'UQAdc1niAN8M0GQoFp_v_F53iA50HzoPf'

export function isTronPayAddress(value: string) {
  const address = value.trim()
  return address.startsWith('T') && address.length === 34
}

export function isTonPayAddress(value: string) {
  const address = value.trim()
  if (address.startsWith('EQ') || address.startsWith('UQ')) return address.length === 48
  return /^-?\d+:[0-9a-fA-F]{64}$/.test(address)
}

export function walletOrDefault(value: string | undefined, fallback: string) {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed || fallback
}

/** Official Tether USDT jetton master on TON */
export const USDT_MASTER =
  'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs'

export function getRaffle(id: RaffleId) {
  return RAFFLES[id]
}
