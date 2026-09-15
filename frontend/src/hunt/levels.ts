export const HUNT_LEVELS = [
  { id: 'easy' as const, seconds: 25, required: 5, spawnMs: 1400, flyMin: 3.2, flyMax: 4, size: 118 },
  { id: 'hard' as const, seconds: 30, required: 7, spawnMs: 1100, flyMin: 2.5, flyMax: 3.3, size: 104 },
  { id: 'extreme' as const, seconds: 35, required: 9, spawnMs: 850, flyMin: 2, flyMax: 2.7, size: 92 },
]

export type HuntLevelId = (typeof HUNT_LEVELS)[number]['id']
