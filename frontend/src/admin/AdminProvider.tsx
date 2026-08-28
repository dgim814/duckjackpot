import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ADMIN_PASSWORD,
  CARD_ART,
  getRaffle,
  RAFFLE_ORDER,
  RAFFLES,
  STORAGE_KEYS,
  USDT_RUB_DEFAULT,
  type RaffleId,
} from '../constants'
import { api, API_ORIGIN } from '../api/client'
import type { Lang } from '../i18n/messages'

export type RaffleStatus = 'running' | 'stopped' | 'awaiting_draw' | 'drawn'

export type RaffleRuntime = {
  status: RaffleStatus
  soldBase: number
  image: string | null
}

export type NotifyStatus = 'sent' | 'no_chat' | 'failed' | 'pending'

export type Winner = {
  id: string
  raffleId: RaffleId
  place: number
  name: string
  amount: string
  paid: boolean
  note: string
  telegramId?: number
  telegramUsername?: string
  payCode?: string
  notifyStatus: NotifyStatus
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
  uploadCardImage: (id: RaffleId, file: File) => Promise<void>
  resetCardImage: (id: RaffleId) => Promise<void>
  setRateOverride: (rate: number | null) => void
  setTestPayMode: (enabled: boolean) => void
  setMerchantWallet: (address: string) => void
  setUsdtTrc20Address: (address: string) => void
  applyPayWallets: (wallets: { merchantWallet: string; usdtTrc20Address: string }) => void
  refreshPayWallets: () => Promise<void>
  setContent: (lang: Lang, key: ContentKey, value: string) => void
  markPaid: (id: string, paid: boolean, note?: string) => void
  updateWinnerNote: (id: string, note: string) => void
  drawRaffle: (id: RaffleId) => Promise<{ winners: Winner[]; eligible: number }>
}

const AdminContext = createContext<AdminContextValue | null>(null)

function defaultWinners(): Winner[] {
  return [
    { id: 'w1', raffleId: 'classic', place: 1, name: 'Test User A', amount: '5000 USDT', paid: false, note: '', notifyStatus: 'pending' },
    { id: 'w2', raffleId: 'classic', place: 2, name: 'Test User B', amount: '2000 USDT', paid: false, note: '', notifyStatus: 'pending' },
    { id: 'w3', raffleId: 'fast200', place: 1, name: 'Test User C', amount: '400 USDT', paid: false, note: '', notifyStatus: 'pending' },
    { id: 'w4', raffleId: 'fast100', place: 1, name: 'Test User D', amount: '300 USDT', paid: true, note: 'demo-hash', notifyStatus: 'pending' },
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
    merchantWallet: '',
    usdtTrc20Address: '',
  }
}

function publicImage(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  if (value.startsWith('data:')) return null
  return value
}

function nftUrl(id: RaffleId, updatedAt: number) {
  return `${API_ORIGIN}/api/nft/${id}?v=${updatedAt}`
}

function applyNftCatalog(
  raffles: Record<RaffleId, RaffleRuntime>,
  images: Partial<Record<RaffleId, { updatedAt?: number } | null>>,
) {
  const next = { ...raffles }
  for (const id of RAFFLE_ORDER) {
    const meta = images[id]
    const updatedAt = meta && typeof meta.updatedAt === 'number' ? meta.updatedAt : 0
    next[id] = {
      ...next[id],
      image: updatedAt ? nftUrl(id, updatedAt) : null,
    }
  }
  return next
}

function isRaffleId(value: unknown): value is RaffleId {
  return value === 'classic' || value === 'fast200' || value === 'fast100'
}

function isNotifyStatus(value: unknown): value is NotifyStatus {
  return value === 'sent' || value === 'no_chat' || value === 'failed' || value === 'pending'
}

function normalizeWinner(winner: Partial<Winner> & { id?: string; place?: number }): Winner | null {
  if (!winner || typeof winner.place !== 'number') return null
  return {
    id: String(winner.id ?? crypto.randomUUID()),
    raffleId: isRaffleId(winner.raffleId) ? winner.raffleId : 'classic',
    place: winner.place,
    name: typeof winner.name === 'string' ? winner.name : 'Winner',
    amount: typeof winner.amount === 'string' ? winner.amount : '',
    paid: winner.paid === true,
    note: typeof winner.note === 'string' ? winner.note : '',
    telegramId: typeof winner.telegramId === 'number' ? winner.telegramId : undefined,
    telegramUsername: typeof winner.telegramUsername === 'string' ? winner.telegramUsername : undefined,
    payCode: typeof winner.payCode === 'string' ? winner.payCode : undefined,
    notifyStatus: isNotifyStatus(winner.notifyStatus) ? winner.notifyStatus : 'pending',
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
        classic: {
          ...fallback.raffles.classic,
          ...parsed.raffles?.classic,
          image: publicImage(parsed.raffles?.classic?.image),
        },
        fast200: {
          ...fallback.raffles.fast200,
          ...parsed.raffles?.fast200,
          image: publicImage(parsed.raffles?.fast200?.image),
        },
        fast100: {
          ...fallback.raffles.fast100,
          ...parsed.raffles?.fast100,
          image: publicImage(parsed.raffles?.fast100?.image),
        },
      },
      winners:
        Array.isArray(parsed.winners) && parsed.winners.length
          ? parsed.winners.map((winner) => normalizeWinner(winner)).filter((winner): winner is Winner => Boolean(winner))
          : fallback.winners,
      content: parsed.content ?? {},
      rateOverride: override ?? null,
      testPayMode: parsed.testPayMode === true,
      merchantWallet: '',
      usdtTrc20Address: '',
    }
  } catch {
    return fallback
  }
}

function persist(state: AdminState) {
  try {
    const raffles = {
      classic: { ...state.raffles.classic, image: publicImage(state.raffles.classic.image) },
      fast200: { ...state.raffles.fast200, image: publicImage(state.raffles.fast200.image) },
      fast100: { ...state.raffles.fast100, image: publicImage(state.raffles.fast100.image) },
    }
    localStorage.setItem(
      STORAGE_KEYS.admin,
      JSON.stringify({ ...state, raffles, merchantWallet: '', usdtTrc20Address: '' }),
    )
    if (state.rateOverride && state.rateOverride > 0) {
      localStorage.setItem(STORAGE_KEYS.usdtRub, String(state.rateOverride))
    } else {
      localStorage.removeItem(STORAGE_KEYS.usdtRub)
    }
  } catch {
    /* quota / private mode */
  }
}

function walletsFromApi(data: { tonAddress?: string; merchantWallet?: string; usdtTrc20Address?: string }) {
  return {
    merchantWallet: (data.tonAddress ?? data.merchantWallet ?? '').trim(),
    usdtTrc20Address: (data.usdtTrc20Address ?? '').trim(),
  }
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(readAuth)
  const [state, setState] = useState<AdminState>(readState)

  const refreshPayWallets = useCallback(async () => {
    const { data } = await api.get<{
      tonAddress?: string
      merchantWallet?: string
      usdtTrc20Address?: string
    }>('/wallets')
    const wallets = walletsFromApi(data)
    setState((prev) => {
      const next = { ...prev, ...wallets }
      persist(next)
      return next
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    void refreshPayWallets().catch(() => undefined)
    void api
      .get<{
        raffles?: Partial<Record<RaffleId, { status?: string; sold?: number; total?: number }>>
      }>('/raffles')
      .then(({ data }) => {
        if (cancelled) return
        const incoming = data.raffles ?? {}
        setState((prev) => {
          const raffles = { ...prev.raffles }
          for (const id of RAFFLE_ORDER) {
            const row = incoming[id]
            if (!row) continue
            const status =
              row.status === 'stopped' || row.status === 'awaiting_draw' || row.status === 'drawn' || row.status === 'running'
                ? row.status
                : raffles[id].status
            const soldBase =
              typeof row.sold === 'number' &&
              (row.sold > raffles[id].soldBase || row.status === 'awaiting_draw' || row.status === 'drawn')
                ? Math.max(0, Math.min(getRaffle(id).total, row.sold))
                : raffles[id].soldBase
            raffles[id] = { ...raffles[id], status, soldBase }
          }
          const next = { ...prev, raffles }
          persist(next)
          return next
        })
      })
      .catch(() => undefined)
    void api
      .get<{ images?: Partial<Record<RaffleId, { updatedAt?: number } | null>> }>('/nft')
      .then(({ data }) => {
        if (cancelled) return
        setState((prev) => {
          const next = { ...prev, raffles: applyNftCatalog(prev.raffles, data.images ?? {}) }
          persist(next)
          return next
        })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

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
          raffles: { ...prev.raffles, [id]: { ...prev.raffles[id], image: publicImage(dataUrl) } },
        })),
      uploadCardImage: async (id, file) => {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result ?? ''))
          reader.onerror = () => reject(reader.error ?? new Error('read_failed'))
          reader.readAsDataURL(file)
        })
        const { data: saved } = await api.post<{ updatedAt?: number }>(
          `/admin/nft/${id}`,
          { mime: file.type || 'image/jpeg', data },
          { headers: { 'x-admin-password': ADMIN_PASSWORD }, timeout: 60_000 },
        )
        const image = saved.updatedAt ? nftUrl(id, saved.updatedAt) : nftUrl(id, Date.now())
        patch((prev) => ({
          ...prev,
          raffles: { ...prev.raffles, [id]: { ...prev.raffles[id], image } },
        }))
      },
      resetCardImage: async (id) => {
        await api.delete(`/admin/nft/${id}`, { headers: { 'x-admin-password': ADMIN_PASSWORD } })
        patch((prev) => ({
          ...prev,
          raffles: { ...prev.raffles, [id]: { ...prev.raffles[id], image: null } },
        }))
      },
      setRateOverride: (rate) => {
        const rateOverride =
          rate === null ? null : Number.isFinite(rate) && rate > 0 ? rate : USDT_RUB_DEFAULT
        patch((prev) => ({ ...prev, rateOverride }))
      },
      setTestPayMode: (enabled) => patch((prev) => ({ ...prev, testPayMode: enabled })),
      merchantWallet: state.merchantWallet,
      usdtTrc20Address: state.usdtTrc20Address,
      setMerchantWallet: (address) => patch((prev) => ({ ...prev, merchantWallet: address })),
      setUsdtTrc20Address: (address) => patch((prev) => ({ ...prev, usdtTrc20Address: address })),
      applyPayWallets: (wallets) =>
        patch((prev) => ({
          ...prev,
          merchantWallet: wallets.merchantWallet,
          usdtTrc20Address: wallets.usdtTrc20Address,
        })),
      refreshPayWallets,
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
      drawRaffle: async (id) => {
        const { data } = await api.post<{ winners: Winner[]; eligible: number }>(
          `/admin/raffles/${id}/draw`,
          {},
          { headers: { 'x-admin-password': ADMIN_PASSWORD } },
        )
        const drawn = (data.winners ?? [])
          .map((winner) => normalizeWinner({ ...winner, raffleId: id }))
          .filter((winner): winner is Winner => Boolean(winner))
        patch((prev) => ({
          ...prev,
          raffles: {
            ...prev.raffles,
            [id]: { ...prev.raffles[id], status: 'drawn' },
          },
          winners: [...drawn, ...prev.winners.filter((winner) => winner.raffleId !== id)],
        }))
        return { winners: drawn, eligible: data.eligible ?? 0 }
      },
    }),
    [authed, state, refreshPayWallets],
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
