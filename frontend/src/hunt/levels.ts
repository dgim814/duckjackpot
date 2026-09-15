export const HUNT_BREAK_MS = 3000

export const HUNT_LEVELS = [
  { id: 'easy' as const, seconds: 28, required: 8, spawnMs: 900, flyMin: 3.4, flyMax: 4.2, size: 156, minAlive: 2, maxAlive: 3 },
  { id: 'hard' as const, seconds: 30, required: 12, spawnMs: 620, flyMin: 2.0, flyMax: 2.6, size: 148, minAlive: 3, maxAlive: 4 },
  { id: 'extreme' as const, seconds: 32, required: 16, spawnMs: 480, flyMin: 1.35, flyMax: 1.9, size: 140, minAlive: 3, maxAlive: 4 },
]

export type HuntLevelId = (typeof HUNT_LEVELS)[number]['id']
