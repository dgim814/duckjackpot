export const HUNT_ROUND_COUNT = 20
export const HUNT_ROUND_SECONDS = 80
export const HUNT_BREAK_MS = 5000
export const HUNT_MIN_DAY_SCORE = 1600

export function huntRoundConfig(roundIndex: number) {
  const n = Math.max(0, Math.min(HUNT_ROUND_COUNT - 1, roundIndex))
  const t = n / (HUNT_ROUND_COUNT - 1)
  return {
    seconds: HUNT_ROUND_SECONDS,
    required: 8 + Math.round(t * 10),
    ducks: n < 6 ? 2 : n < 14 ? (n % 2 === 0 ? 2 : 3) : 3,
    flyMin: 4.1 - t * 1.5,
    flyMax: 5.2 - t * 1.7,
    size: 148 - t * 16,
  }
}
