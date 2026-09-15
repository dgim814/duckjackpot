export const HUNT_WAVE_COUNT = 3
export const HUNT_CUE_END = 1.7

export const HUNT_WAVES = [
  { id: 'common' as const, seconds: 45, ducks: 1, flyMin: 3.6, flyMax: 4.4, size: 148, kind: 'common' as const },
  { id: 'fast' as const, seconds: 45, ducks: 2, flyMin: 2.1, flyMax: 2.8, size: 120, kind: 'zigzag' as const },
  { id: 'dive' as const, seconds: 45, ducks: 2, flyMin: 1.8, flyMax: 2.5, size: 114, kind: 'dive' as const },
]

export function huntWave(index: number) {
  return HUNT_WAVES[Math.max(0, Math.min(HUNT_WAVES.length - 1, index))]
}
