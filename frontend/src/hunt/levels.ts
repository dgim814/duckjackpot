export const HUNT_LEVEL_COUNT = 3
export const HUNT_BREAK_MS = 2000
export const HUNT_CUE_END = 2.05

export const HUNT_LEVELS = [
  { id: 'hunt' as const, name: 'HUNT', seconds: 24, required: 4, ducks: 1, flyMin: 3.8, flyMax: 4.6, size: 150, turn: 0.12, gold: 0 },
  { id: 'wild' as const, name: 'WILD', seconds: 32, required: 8, ducks: 2, flyMin: 2.2, flyMax: 2.9, size: 118, turn: 1.2, gold: 0 },
  { id: 'hell' as const, name: 'DUCK HELL', seconds: 40, required: 9, ducks: 2, flyMin: 1.7, flyMax: 2.3, size: 108, turn: 1.5, gold: 0.08 },
]

export function huntLevel(index: number) {
  return HUNT_LEVELS[Math.max(0, Math.min(HUNT_LEVELS.length - 1, index))]
}
