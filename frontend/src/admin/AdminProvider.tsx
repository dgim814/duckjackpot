import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  ADMIN_PASSWORD,
  CARD_ART,
  DEFAULT_TON_WALLET,
  DEFAULT_USDT_TRC20,
  getRaffle,
  RAFFLE_ORDER,
  RAFFLES,
  STORAGE_KEYS,
  USDT_RUB_DEFAULT,
  walletOrDefault,
  type RaffleId,
} from '../constants'
import type { Lang } from '../i18n/messages'

export type RaffleStatus = 'running' | 'stopped'

export type RaffleRuntime = {
  status: RaffleStatus
  soldBase: number
  image: string | null
}

export type Winner = {
  id: string
  raffleId: RaffleId
  place: number
  name: string
  amount: string
  paid: boolean
  note: string
}

export const CONTENT_KEYS = [
  'termsP1',
  'termsP2',
  'termsP3',
  'termsP4',
  'offerLead',
  'offerBody1',
  'offerBody2',
  'offerBody3',
  'offerBody4',
  'offerBody5',
] as const

export type ContentKey = (typeof CONTENT_KEYS)[number]
export type ContentOverrides = Partial<Record<Lang, Partial<Record<ContentKey, string>>>>

type AdminState = {
  raffles: Record<RaffleId, RaffleRuntime>
  winners: Winner[]
  content: ContentOverrides
  rateOverride: number | null
  testPayMode: boolean
  merchantWallet: string
  usdtTrc20Address: string
}

type AdminContextValue = AdminState & {
  authed: boolean
  login: (password: string) => boolean
  logout: () => void
  cardArt: (id: RaffleId) => string
  setStatus: (id: RaffleId, status: RaffleStatus) => void
  setSoldBase: (id: RaffleId, sold: number) => void
  incrementSold: (id: RaffleId) => void
  resetRaffle: (id: RaffleId) => void
  setCardImage: (id: RaffleId, dataUrl: string | null) => void
  setRateOverride: (rate: number | null) => void
  setTestPayMode: (enabled: boolean) => void
  setMerchantWallet: (address: string) => void
  setUsdtTrc20Address: (address: string) => void
  setContent: (lang: Lang, key: ContentKey, value: string) => void
  markPaid: (id: string, paid: boolean, note?: string) => void
  updateWinnerNote: (id: string, note: string) => void
}

const AdminContext = createContext<AdminContextValue | null>(null)

function defaultWinners(): Winner[] {
  return [
    { id: 'w1', raffleId: 'classic', place: 1, name: 'Test User A', amount: '5000 USDT', paid: false, note: '' },
    { id: 'w2', raffleId: 'classic', place: 2, name: 'Test User B', amount: '2000 USDT', paid: false, note: '' },
    { id: 'w3', raffleId: 'fast200', place: 1, name: 'Test User C', amount: '400 USDT', paid: false, note: '' },
    { id: 'w4', raffleId: 'fast100', place: 1, name: 'Test User D', amount: '300 USDT', paid: true, note: 'demo-hash' },
  ]
}

function defaultRaffles(): Record<RaffleId, RaffleRuntime> {
  return {
    classic: { status: 'running', soldBase: RAFFLES.classic.demoSold, image: null },
    fast200: { status: 'running', soldBase: RAFFLES.fast200.demoSold, image: null },
    fast100: { status: 'running', soldBase: RAFFLES.fast100.demoSold, image: null },
  }
}

function defaultState(): AdminState {
  return {
    raffles: defaultRaffles(),
    winners: defaultWinners(),
    content: {},
    rateOverride: null,
    testPayMode: false,
    merchantWallet: DEFAULT_TON_WALLET,
    usdtTrc20Address: DEFAULT_USDT_TRC20,
  }
}

function readAuth() {
  try {
    return sessionStorage.getItem(STORAGE_KEYS.adminAuth) === '1'
  } catch {
    return false
  }
}

function readState(): AdminState {
  const fallback = defaultState()
  try {
    const rateRaw = localStorage.getItem(STORAGE_KEYS.usdtRub)
    if (rateRaw) {
      const rate = Number(rateRaw)
      if (Number.isFinite(rate) && rate > 0 && rate !== USDT_RUB_DEFAULT) {
        fallback.rateOverride = rate
      }
    }
    const raw = localStorage.getItem(STORAGE_KEYS.admin)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<AdminState> & { usdtRub?: number }
    const override =
      parsed.rateOverride === null
        ? null
        : typeof parsed.rateOverride === 'number'
          ? parsed.rateOverride
          : typeof parsed.usdtRub === 'number' && parsed.usdtRub !== USDT_RUB_DEFAULT
            ? parsed.usdtRub
            : fallback.rateOverride
    return {
      raffles: {
        classic: { ...fallback.raffles.classic, ...parsed.raffles?.classic },
        fast200: { ...fallback.raffles.fast200, ...parsed.raffles?.fast200 },
        fast100: { ...fallback.raffles.fast100, ...parsed.raffles?.fast100 },
      },
      winners: Array.isArray(parsed.winners) && parsed.winners.length ? parsed.winners : fallback.winners,
      content: parsed.content ?? {},
      rateOverride: override ?? null,
      testPayMode: parsed.testPayMode === true,
      merchantWallet: walletOrDefault(parsed.merchantWallet, DEFAULT_TON_WALLET),
      usdtTrc20Address: walletOrDefault(parsed.usdtTrc20Address, DEFAULT_USDT_TRC20),
    }
  } catch {
    return fallback
  }
}

function persist(state: AdminState) {
  try {
    localStorage.setItem(STORAGE_KEYS.admin, JSON.stringify(state))
    if (state.rateOverride && state.rateOverride > 0) {
      localStorage.setItem(STORAGE_KEYS.usdtRub, String(state.rateOverride))
    } else {
      localStorage.removeItem(STORAGE_KEYS.usdtRub)
    }
  } catch {
    /* quota / private mode */
  }
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(readAuth)
  const [state, setState] = useState<AdminState>(readState)

  const patch = (updater: (prev: AdminState) => AdminState) => {
    setState((prev) => {
      const next = updater(prev)
      persist(next)
      return next
    })
  }

  const value = useMemo<AdminContextValue>(
    () => ({
      ...state,
      authed,
      login: (password) => {
        const ok = password === ADMIN_PASSWORD
        if (ok) {
          setAuthed(true)
          try {
            sessionStorage.setItem(STORAGE_KEYS.adminAuth, '1')
          } catch {
            /* ignore */
          }
        }
        return ok
      },
      logout: () => {
        setAuthed(false)
        try {
          sessionStorage.removeItem(STORAGE_KEYS.adminAuth)
        } catch {
          /* ignore */
        }
      },
      cardArt: (id) => state.raffles[id].image || CARD_ART,
      setStatus: (id, status) =>
        patch((prev) => ({
          ...prev,
          raffles: { ...prev.raffles, [id]: { ...prev.raffles[id], status } },
        })),
      setSoldBase: (id, sold) => {
        const total = getRaffle(id).total
        const soldBase = Math.max(0, Math.min(total, Math.round(sold)))
        patch((prev) => ({
          ...prev,
          raffles: { ...prev.raffles, [id]: { ...prev.raffles[id], soldBase } },
        }))
      },
      incrementSold: (id) =>
        patch((prev) => {
          const total = getRaffle(id).total
          const soldBase = Math.min(total, prev.raffles[id].soldBase + 1)
          return {
            ...prev,
            raffles: { ...prev.raffles, [id]: { ...prev.raffles[id], soldBase } },
          }
        }),
      resetRaffle: (id) =>
        patch((prev) => ({
          ...prev,
          raffles: {
            ...prev.raffles,
            [id]: { ...prev.raffles[id], status: 'stopped', soldBase: 0 },
          },
        })),
      setCardImage: (id, dataUrl) =>
        patch((prev) => ({
          ...prev,
          raffles: { ...prev.raffles, [id]: { ...prev.raffles[id], image: dataUrl } },
        })),
      setRateOverride: (rate) => {
        const rateOverride =
          rate === null ? null : Number.isFinite(rate) && rate > 0 ? rate : USDT_RUB_DEFAULT
        patch((prev) => ({ ...prev, rateOverride }))
      },
      setTestPayMode: (enabled) => patch((prev) => ({ ...prev, testPayMode: enabled })),
      merchantWallet: walletOrDefault(state.merchantWallet, DEFAULT_TON_WALLET),
      usdtTrc20Address: walletOrDefault(state.usdtTrc20Address, DEFAULT_USDT_TRC20),
      setMerchantWallet: (address) => patch((prev) => ({ ...prev, merchantWallet: address.trim() })),
      setUsdtTrc20Address: (address) => patch((prev) => ({ ...prev, usdtTrc20Address: address.trim() })),
      setContent: (lang, key, value) =>
        patch((prev) => ({
          ...prev,
          content: {
            ...prev.content,
            [lang]: { ...prev.content[lang], [key]: value },
          },
        })),
      markPaid: (id, paid, note) =>
        patch((prev) => ({
          ...prev,
          winners: prev.winners.map((winner) =>
            winner.id === id ? { ...winner, paid, note: note ?? winner.note } : winner,
          ),
        })),
      updateWinnerNote: (id, note) =>
        patch((prev) => ({
          ...prev,
          winners: prev.winners.map((winner) => (winner.id === id ? { ...winner, note } : winner)),
        })),
    }),
    [authed, state],
  )

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider')
  return ctx
}

export function revenueRub(raffles: Record<RaffleId, RaffleRuntime>) {
  return RAFFLE_ORDER.reduce((sum, id) => sum + raffles[id].soldBase * RAFFLES[id].priceRub, 0)
}
