import { DAILY_REWARD_COINS, isGameplayFresh, isHeistNovice, type PlayerProgress } from './progress'
import { track } from '../analytics/track'

/**
 * In-raid tutorial: one short hint the first time a new player meets each mechanic.
 * The raid freezes while a hint is up; one tap continues from the same moment.
 * Hints only fire on a real encounter, so a mechanic a level does not have is never
 * explained there (the lift hint waits for the first lift, on the tower levels).
 */
export const TUTORIAL_KEY = 'duckjackpot.heist.tutorial.v1'

export type TutorialStep = 'coin' | 'goal' | 'guard' | 'camera' | 'door' | 'safe' | 'lift' | 'dash' | 'exit'

/** Priority when two encounters happen at once (the order a new player meets them). */
export const TUTORIAL_ORDER: readonly TutorialStep[] = ['coin', 'goal', 'guard', 'camera', 'door', 'safe', 'lift', 'dash', 'exit']

type Stored = { v: 1; active: boolean; seen: TutorialStep[] }

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(TUTORIAL_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Partial<Stored>
    return { v: 1, active: Boolean(s.active), seen: Array.isArray(s.seen) ? s.seen.filter((x): x is TutorialStep => TUTORIAL_ORDER.includes(x as TutorialStep)) : [] }
  } catch {
    return null
  }
}

function write(s: Stored) {
  try {
    localStorage.setItem(TUTORIAL_KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable: the tutorial simply runs from memory this session */
  }
}

/**
 * The tutorial state for this player, created on first use. Only a genuinely new
 * player (no escape yet, nothing banked, no upgrades) gets the tutorial; anyone who
 * already played is marked as not needing it and never sees it.
 */
export function tutorialState(progress: PlayerProgress): Stored {
  const s = read()
  if (s) return s
  // 🎁 Daily reward coins claimed on the hub before the first raid do not make a player "not new".
  const gifted = (progress.dailyClaimIds?.length ?? 0) * DAILY_REWARD_COINS
  const beforeGifts = { ...progress, bankedDuckCoin: Math.max(0, progress.bankedDuckCoin - gifted) }
  const fresh: Stored = { v: 1, active: isHeistNovice(progress) && isGameplayFresh(beforeGifts), seen: [] }
  write(fresh)
  if (fresh.active) track('tutorial_start')
  return fresh
}

/** Steps still to show, or null when this player has no tutorial. */
export function pendingTutorialSteps(progress: PlayerProgress): Set<TutorialStep> | null {
  const s = tutorialState(progress)
  if (!s.active) return null
  const left = TUTORIAL_ORDER.filter((x) => !s.seen.includes(x))
  return left.length ? new Set(left) : null
}

/** A hint was shown: it never comes back. */
export function markTutorialSeen(step: TutorialStep) {
  const s = read() ?? { v: 1 as const, active: true, seen: [] }
  if (s.seen.includes(step)) return
  write({ ...s, seen: [...s.seen, step] })
  track('tutorial_step', { step })
}

export function tutorialDone(progress: PlayerProgress) {
  return pendingTutorialSteps(progress) === null
}

/** Dev / QA: the next raid starts the tutorial again (for a fresh player state). */
export function resetHeistTutorial(active = true) {
  write({ v: 1, active, seen: [] })
}

/** Gameplay reset: forget the flag so the next check decides again. */
export function clearHeistTutorial() {
  try {
    localStorage.removeItem(TUTORIAL_KEY)
  } catch {
    /* ignore */
  }
}
