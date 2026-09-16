export type HeistEnd = {
  verdict: 'escaped' | 'caught'
  coins: number
  bonus: number
  banked: number
  timeMs: number
  alert: number
}
