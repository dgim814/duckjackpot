import type { ReactNode } from 'react'

/**
 * Shared language of the Black Market illustrations: a dark auction-house
 * backdrop, a soft spotlight, a floor shadow and a few precious-metal ramps.
 * Every lot is drawn as vector art (lightweight, crisp at any size, no
 * network requests). `g` makes gradient ids unique per rendered instance.
 */

export type G = (key: string) => string

export type Tone = 'warm' | 'velvet' | 'navy' | 'green' | 'wall' | 'studio' | 'ink' | 'plum'

const TONES: Record<Tone, [string, string]> = {
  warm: ['#2e2318', '#0a0705'],
  velvet: ['#3d1622', '#0c0406'],
  navy: ['#1a2640', '#05070d'],
  green: ['#18291f', '#050a07'],
  wall: ['#2a221a', '#0a0806'],
  studio: ['#2b3038', '#07080a'],
  ink: ['#221f2e', '#07060b'],
  plum: ['#2c1838', '#08040c'],
}

export type Metal = 'gold' | 'steel' | 'rose' | 'plat' | 'black' | 'ti' | 'brass' | 'copper' | 'silver' | 'bronze'

export const METAL: Record<Metal, [string, string, string]> = {
  gold: ['#fbe9ad', '#d4af58', '#7d5a14'],
  steel: ['#f4f6f8', '#b6bec7', '#58616b'],
  silver: ['#ffffff', '#c9ccd2', '#6f747c'],
  rose: ['#f9d7c6', '#d8957a', '#7e4834'],
  plat: ['#ffffff', '#dde1e7', '#848c97'],
  black: ['#6a6a70', '#2c2c31', '#0f0f12'],
  ti: ['#e2e6e9', '#98a1a8', '#474f56'],
  brass: ['#f6dc92', '#c79c3c', '#6a4c12'],
  copper: ['#f7bb91', '#c56d3b', '#6a3217'],
  bronze: ['#d9b27a', '#8f6532', '#3d2a12'],
}

export function MetalRamp({ id, metal, vertical = false }: { id: string; metal: Metal; vertical?: boolean }) {
  const [a, b, c] = METAL[metal]
  return (
    <linearGradient id={id} x1="0" y1="0" x2={vertical ? '0' : '1'} y2="1">
      <stop offset="0%" stopColor={a} />
      <stop offset="45%" stopColor={b} />
      <stop offset="100%" stopColor={c} />
    </linearGradient>
  )
}

export function Scene({ g, tone = 'warm', floor = true, children }: { g: G; tone?: Tone; floor?: boolean; children: ReactNode }) {
  const [hi, lo] = TONES[tone]
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id={g('bg')} cx="50%" cy="40%" r="78%">
          <stop offset="0%" stopColor={hi} />
          <stop offset="100%" stopColor={lo} />
        </radialGradient>
        <radialGradient id={g('spot')} cx="50%" cy="0%" r="70%">
          <stop offset="0%" stopColor="#fff4d6" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#fff4d6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${g('bg')})`} />
      <rect width="320" height="180" fill={`url(#${g('spot')})`} />
      {floor ? <ellipse cx="160" cy="164" rx="96" ry="10" fill="#000" opacity="0.45" /> : null}
      {children}
    </svg>
  )
}

/** Small five-point star centred on (x, y). */
export function starPoints(x: number, y: number, r: number, inner = 0.45) {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * inner : r
    pts.push(`${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

/** Points of a regular polygon (for octagons, facets, tiaras). */
export function polyPoints(x: number, y: number, r: number, n: number, rot = 0) {
  const pts: string[] = []
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 2 * Math.PI) / n
    pts.push(`${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}
