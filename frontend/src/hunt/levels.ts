export const HUNT_LEVELS = [
  { id: 'medium' as const, required: 5, spawn: 6, speed: 150, spawnMs: 950, flap: 1.6 },
  { id: 'hard' as const, required: 7, spawn: 8, speed: 210, spawnMs: 720, flap: 2.1 },
  { id: 'extreme' as const, required: 9, spawn: 10, speed: 280, spawnMs: 540, flap: 2.7 },
]

export type HuntLevelId = (typeof HUNT_LEVELS)[number]['id']
