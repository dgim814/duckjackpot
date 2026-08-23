import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAdmin } from '../admin/AdminProvider'
import { STORAGE_KEYS, USDT_RUB_DEFAULT } from '../constants'
import { fetchUsdRubRate, todayKey, type FxQuote } from './fetchUsdRub'

type FxStatus = 'loading' | 'ok' | 'error'

type FxContextValue = {
  rate: number
  liveRate: number | null
  source: 'manual' | 'live' | 'fallback'
  status: FxStatus
  updatedDate: string | null
  refresh: () => void
}

const FxContext = createContext<FxContextValue | null>(null)

type Cache = {
  date: string
  rate: number
  source: string
}

function readCache(): Cache | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.fxCache)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cache
    if (parsed.date !== todayKey()) return null
    if (!Number.isFinite(parsed.rate) || parsed.rate <= 0) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(quote: FxQuote) {
  const cache: Cache = { date: todayKey(), rate: quote.rate, source: quote.source }
  try {
    localStorage.setItem(STORAGE_KEYS.fxCache, JSON.stringify(cache))
  } catch {
    /* ignore */
  }
}

export function FxProvider({ children }: { children: ReactNode }) {
  const { rateOverride } = useAdmin()
  const cached = readCache()
  const [live, setLive] = useState<FxQuote | null>(
    cached ? { rate: cached.rate, source: cached.source } : null,
  )
  const [status, setStatus] = useState<FxStatus>(cached ? 'ok' : 'loading')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const force = tick > 0
      const todayCache = force ? null : readCache()
      if (todayCache) {
        setLive({ rate: todayCache.rate, source: todayCache.source })
        setStatus('ok')
        return
      }
      setStatus('loading')
      try {
        const quote = await fetchUsdRubRate()
        if (cancelled) return
        writeCache(quote)
        setLive(quote)
        setStatus('ok')
      } catch {
        if (cancelled) return
        setStatus('error')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [tick])

  const value = useMemo<FxContextValue>(() => {
    if (rateOverride && rateOverride > 0) {
      return {
        rate: rateOverride,
        liveRate: live?.rate ?? null,
        source: 'manual',
        status,
        updatedDate: todayKey(),
        refresh: () => setTick((n) => n + 1),
      }
    }
    if (live) {
      return {
        rate: live.rate,
        liveRate: live.rate,
        source: 'live',
        status: 'ok',
        updatedDate: todayKey(),
        refresh: () => setTick((n) => n + 1),
      }
    }
    return {
      rate: USDT_RUB_DEFAULT,
      liveRate: null,
      source: 'fallback',
      status,
      updatedDate: null,
      refresh: () => setTick((n) => n + 1),
    }
  }, [live, rateOverride, status])

  return <FxContext.Provider value={value}>{children}</FxContext.Provider>
}

export function useFx() {
  const ctx = useContext(FxContext)
  if (!ctx) throw new Error('useFx must be used within FxProvider')
  return ctx
}
