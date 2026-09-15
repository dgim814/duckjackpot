const BEST_KEY = 'duckjackpot.hunt.bestScore'
const XP_KEY = 'duckjackpot.hunt.xp'

export function readHuntBest() {
  try {
    return Math.max(0, Number(localStorage.getItem(BEST_KEY) ?? 0) || 0)
  } catch {
    return 0
  }
}

export function writeHuntBest(score: number) {
  const next = Math.max(readHuntBest(), Math.max(0, Math.round(score)))
  try {
    localStorage.setItem(BEST_KEY, String(next))
  } catch {
    /* ignore */
  }
  return next
}

export function readHuntXp() {
  try {
    return Math.max(0, Number(localStorage.getItem(XP_KEY) ?? 0) || 0)
  } catch {
    return 0
  }
}

export function addHuntXp(amount: number) {
  const xp = readHuntXp() + Math.max(0, Math.round(amount))
  try {
    localStorage.setItem(XP_KEY, String(xp))
  } catch {
    /* ignore */
  }
  return xp
}

export function huntXpBar(xp: number) {
  return { level: Math.floor(xp / 100) + 1, into: xp % 100, need: 100 }
}
