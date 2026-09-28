export const RAFFLE_TOTALS: Record<string, number> = {
  classic: 2000,
  fast200: 200,
  fast100: 100,
}

export const RAFFLE_PRIZES: Record<string, Array<{ place: number; amount: string }>> = {
  classic: [
    { place: 1, amount: '5000 USDT' },
    { place: 2, amount: '2000 USDT' },
    { place: 3, amount: '500 USDT' },
    { place: 4, amount: '100 USDT' },
    { place: 5, amount: '50 USDT' },
    { place: 6, amount: '50 USDT' },
  ],
  fast200: [
    { place: 1, amount: '400 USDT' },
    { place: 2, amount: '100 USDT' },
    { place: 3, amount: '50 USDT' },
  ],
  fast100: [
    { place: 1, amount: '300 USDT' },
    { place: 2, amount: '100 USDT' },
    { place: 3, amount: '50 USDT' },
  ],
}

/** Card prices in RUB (same as the frontend RAFFLES); the server quotes TON from these. */
export const RAFFLE_PRICE_RUB: Record<string, number> = {
  classic: 1000,
  fast200: 400,
  fast100: 500,
}
