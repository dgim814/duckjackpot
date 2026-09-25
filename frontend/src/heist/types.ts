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
  /** True only on the raid that finished the BANK for the first time. */
  bankCompleted?: boolean
  /** True only on the raid that finished the MANSION for the first time. */
  mansionCompleted?: boolean
  /** This raid completed its level for the first time (any level). */
  levelCompleted?: boolean
  /** Special loot carried out through EXIT (goes to the Black Market fence). */
  valuables?: { id: string; kind: 'watch' | 'jewel' | 'art' | 'relic' | 'crown'; value: number; level: string }[]
  /** A PREVIEW PASS raid (first floor only, no completion). */
  preview?: boolean
}
