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
