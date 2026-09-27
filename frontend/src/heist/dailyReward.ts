import { useCallback, useEffect, useRef, useState } from 'react'
import { API_ORIGIN } from '../api/client'
import { telegramInitData } from '../telegram/user'
import { creditDailyReward, type PlayerProgress } from './progress'

/**
 * 🎁 Daily reward client. The server (verified Telegram initData) decides whether +150 is due
 * and keeps lastDailyRewardAt; the wallet is credited only for a claim id the server granted,
 * once (creditDailyReward). A tap stores a nonce first: if the answer is lost, the next visit
 * retries with the same nonce and gets that same grant back, never a second one.
 */
const PENDING_KEY = 'duckjackpot.dailyReward.pending'

type Status = { amount: number; available: boolean; nextAt: number | null }
type Claim = { granted: true; replay: boolean; claimId: string; amount: number; nextAt: number } | { granted: false; amount: number; nextAt: number }

export type DailyPhase = 'loading' | 'available' | 'claiming' | 'claimed' | 'waiting' | 'off'

async function call<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_ORIGIN}/api/daily-reward/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': telegramInitData() },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw Object.assign(new Error(data.error || `http_${res.status}`), { status: res.status })
  return data
}

function pendingNonce() {
  try {
    return localStorage.getItem(PENDING_KEY)
  } catch {
    return null
  }
}

function setPending(nonce: string | null) {
  try {
    if (nonce) localStorage.setItem(PENDING_KEY, nonce)
    else localStorage.removeItem(PENDING_KEY)
  } catch {
    /* storage unavailable: a lost answer then simply is not retried */
  }
}

function newNonce() {
  try {
    return crypto.randomUUID().replace(/-/g, '')
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
}

export function useDailyReward(onCredited: (next: PlayerProgress, amount: number) => void) {
  const [phase, setPhase] = useState<DailyPhase>(() => (telegramInitData() ? 'loading' : 'off'))
  const [nextAt, setNextAt] = useState<number | null>(null)
  const [amount, setAmount] = useState(150)
  const busy = useRef(false)
  const alive = useRef(true)
  const credited = useRef(onCredited)
  credited.current = onCredited

  const apply = useCallback((r: Claim) => {
    setPending(null)
    setAmount(r.amount)
    setNextAt(r.nextAt)
    if (!r.granted) {
      setPhase('waiting')
      return
    }
    const { credited: fresh, next } = creditDailyReward(r.claimId, r.amount)
    setPhase('claimed')
    if (fresh) credited.current(next, r.amount)
  }, [])

  const send = useCallback(
    async (nonce: string) => {
      busy.current = true
      setPending(nonce)
      try {
        const r = await call<Claim>('claim', { nonce })
        if (alive.current) apply(r)
        else if (r.granted) creditDailyReward(r.claimId, r.amount)
      } catch (err) {
        const status = (err as { status?: number }).status
        if (status === 401) setPending(null)
        if (alive.current) setPhase(status === 401 ? 'off' : 'available')
      } finally {
        busy.current = false
      }
    },
    [apply],
  )

  useEffect(() => {
    alive.current = true
    if (!telegramInitData()) return
    const pending = pendingNonce()
    if (pending) {
      // The last tap never got its answer: finish that same claim.
      setPhase('claiming')
      void send(pending)
    } else {
      call<Status>('status', {})
        .then((s) => {
          if (!alive.current) return
          setAmount(s.amount)
          setNextAt(s.nextAt)
          setPhase(s.available ? 'available' : 'waiting')
        })
        .catch(() => alive.current && setPhase('off'))
    }
    return () => {
      alive.current = false
    }
  }, [send])

  const claim = useCallback(() => {
    if (busy.current || phase !== 'available') return
    setPhase('claiming')
    void send(pendingNonce() || newNonce())
  }, [phase, send])

  return { phase, nextAt, amount, claim }
}

/** "23 ч 48 мин" / "23h 48m" until the next reward. */
export function formatLeft(ms: number, lang: string) {
  const min = Math.max(1, Math.floor(ms / 60_000))
  const h = Math.floor(min / 60)
  const m = min % 60
  return lang === 'ru' ? `${h} ч ${String(m).padStart(2, '0')} мин` : `${h}h ${String(m).padStart(2, '0')}m`
}
