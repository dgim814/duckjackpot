export type HeistObjectives = {
  loot: boolean
  stealth: boolean
  speed: boolean
}

export type HeistEnd = {
  verdict: 'escaped' | 'caught'
  coins: number
  bonus: number
  objBonus: number
  objectives: HeistObjectives
  banked: number
  timeMs: number
  alert: number
}
