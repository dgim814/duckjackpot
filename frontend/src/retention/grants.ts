import { creditGrant, type PlayerProgress } from '../heist/progress'
import { api, type Grant } from './api'

/**
 * Referral rewards (DUCK COIN) the server granted: claimed once with a stored nonce (a lost answer
 * retries with the same nonce and gets the same grant back), credited once per grant id.
 */
const KEY = 'duckjackpot.grants.pending'
const busy = new Set<string>()

function nonces(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, string>
  } catch {
    return {}
  }
}
function saveNonces(m: Record<string, string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m))
  } catch {
    /* storage unavailable */
  }
}
const mkNonce = () => {
  try {
    return crypto.randomUUID().replace(/-/g, '')
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
}

export async function claimGrants(grants: Grant[], onCredited: (next: PlayerProgress, g: Grant) => void) {
  for (const g of grants) {
    if (busy.has(g.id)) continue
    busy.add(g.id)
    const m = nonces()
    const nonce = m[g.id] || mkNonce()
    m[g.id] = nonce
    saveNonces(m)
    try {
      const r = await api<{ granted: boolean; claimId: string; amount: number }>('/rewards/claim', { method: 'POST', body: JSON.stringify({ grantId: g.id, nonce }) })
      if (r.granted) {
        const { credited, next } = creditGrant(r.claimId, r.amount)
        if (credited) onCredited(next, g)
      }
      const left = nonces()
      delete left[g.id]
      saveNonces(left)
    } catch (err) {
      // 409: already claimed on another device — nothing to credit here; 404: not ours.
      const status = (err as { status?: number }).status
      if (status === 409 || status === 404) {
        const left = nonces()
        delete left[g.id]
        saveNonces(left)
      }
    } finally {
      busy.delete(g.id)
    }
  }
}
