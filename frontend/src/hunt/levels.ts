export const HUNT_LEVEL_COUNT = 3
export const HUNT_BREAK_MS = 2000

export const HUNT_LEVELS = [
  { id: 'hunt' as const, name: 'HUNT', seconds: 48, required: 6, ducks: 1, flyMin: 3.6, flyMax: 4.8, size: 132, turn: 0.35, gold: 0 },
  { id: 'wild' as const, name: 'WILD', seconds: 50, required: 10, ducks: 2, flyMin: 2.4, flyMax: 3.2, size: 124, turn: 1.15, gold: 0 },
  { id: 'hell' as const, name: 'DUCK HELL', seconds: 52, required: 12, ducks: 2, flyMin: 1.9, flyMax: 2.6, size: 118, turn: 1.45, gold: 0.12 },
]

export function huntLevel(index: number) {
  return HUNT_LEVELS[Math.max(0, Math.min(HUNT_LEVELS.length - 1, index))]
}
