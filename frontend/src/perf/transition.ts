/**
 * HUB ↔ GAME transition timing (dev / QA only). Off in production unless
 * localStorage 'duckjackpot.perf' = '1'; then every mark also lands in window.__perf.
 */
const enabled = (() => {
  if (import.meta.env.DEV) return true
  try {
    return localStorage.getItem('duckjackpot.perf') === '1'
  } catch {
    return false
  }
})()

type Row = { name: string; t: number }
const rows: Row[] = []
if (enabled && typeof window !== 'undefined') (window as Window & { __perf?: Row[] }).__perf = rows

export function perfMark(name: string) {
  if (!enabled) return
  const t = performance.now()
  rows.push({ name, t })
  try {
    performance.mark(name)
  } catch {
    /* ignore */
  }
}

/** Mark once the browser has actually painted what was just rendered (two frames later). */
export function perfMarkPainted(name: string) {
  if (!enabled) return
  requestAnimationFrame(() => requestAnimationFrame(() => perfMark(name)))
}
