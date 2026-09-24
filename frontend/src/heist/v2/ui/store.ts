import { useRef, useSyncExternalStore } from 'react'
import type { RaidPhase } from '../sim/events'

export type Toast = { id: number; kind: 'intro' | 'info' | 'good' | 'warn' | 'danger' | 'safe'; title: string; sub?: string; note?: string; until: number }

/** Coins flying from a cracked safe to the bag chip; x/y are the safe on screen, 0..1. */
export type SafeFly = { id: number; x: number; y: number; amount: number }

export type HudSnapshot = {
  bag: number
  bagCap: number
  full: boolean
  alert: number
  phase: RaidPhase
  zone: number
  zoneMax: number
  zoneCount: number
  depthBest: number
  zoneName: string
  level: 'bank' | 'mansion'
  heavy: boolean
  load: number
  showWeight: boolean
  canDrop: boolean
  prompt: 'door' | 'safe' | 'nft' | null
  cracking: boolean
  crack: { kind: 'door' | 'safe'; marker: number; center: number; width: number; hits: number; need: number; miss: boolean } | null
  dashCd: number
  dashing: boolean
  sneaking: boolean
  hidden: boolean
  exitHold: number
  escapeLeft: number | null
  /** The police countdown was started by a cracked safe. */
  escapeBySafe: boolean
  /** First seconds after a safe triggered the police: the timer pill carries the explanation. */
  escapeIntro: boolean
  safeFly: SafeFly | null
  /** Direction from the duck to the EXIT on screen, when the exit is off-screen. */
  exitArrow: { angle: number; dist: number } | null
  paused: boolean
  ended: boolean
  toasts: Toast[]
  timeS: number
}

export const EMPTY_HUD: HudSnapshot = {
  bag: 0,
  bagCap: 100,
  full: false,
  alert: 0,
  phase: 'SAFE',
  zone: 1,
  zoneMax: 1,
  zoneCount: 20,
  depthBest: 1,
  zoneName: '',
  level: 'bank',
  heavy: false,
  load: 0,
  showWeight: false,
  canDrop: false,
  prompt: null,
  cracking: false,
  crack: null,
  dashCd: 0,
  dashing: false,
  sneaking: false,
  hidden: false,
  exitHold: 0,
  escapeLeft: null,
  escapeBySafe: false,
  escapeIntro: false,
  safeFly: null,
  exitArrow: null,
  paused: false,
  ended: false,
  toasts: [],
  timeS: 0,
}

/** Minimal external store: the Phaser scene writes, React widgets read slices. */
export class HudStore {
  private snap: HudSnapshot = EMPTY_HUD
  private subs = new Set<() => void>()

  get = () => this.snap

  set(next: HudSnapshot) {
    this.snap = next
    for (const fn of this.subs) fn()
  }

  subscribe = (fn: () => void) => {
    this.subs.add(fn)
    return () => {
      this.subs.delete(fn)
    }
  }
}

/** Subscribe to a slice; the widget re-renders only when the slice changes. */
export function useHud<T>(store: HudStore, select: (s: HudSnapshot) => T, equal: (a: T, b: T) => boolean = Object.is): T {
  const last = useRef<{ v: T } | null>(null)
  const getSlice = () => {
    const v = select(store.get())
    if (last.current && equal(last.current.v, v)) return last.current.v
    last.current = { v }
    return v
  }
  return useSyncExternalStore(store.subscribe, getSlice, getSlice)
}

export function shallowEqual<T extends object>(a: T, b: T) {
  if (a === b) return true
  if (!a || !b) return false
  const ka = Object.keys(a) as (keyof T)[]
  if (ka.length !== Object.keys(b).length) return false
  for (const k of ka) if (!Object.is(a[k], b[k])) return false
  return true
}
