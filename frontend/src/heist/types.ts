export type HeistObjectives = {
  loot: boolean
  stealth: boolean
  speed: boolean
}

export type HeistEnd = {
  verdict: 'escaped' | 'caught' | 'aborted'
  coins: number
  bonus: number
  objBonus: number
  objectives: HeistObjectives
  lootGoal: number
  speedGoalS: number
  banked: number
  timeMs: number
  alert: number
}
