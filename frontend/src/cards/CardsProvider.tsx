import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAdmin } from '../admin/AdminProvider'
import { getRaffle, RAFFLES, STORAGE_KEYS, type RaffleId } from '../constants'
import { syncCardsToBot } from '../telegram/syncCards'
import { captureTelegramUser } from '../telegram/user'

export type PayAsset = 'TON' | 'USDT'
export type CardStatus = 'pending' | 'active'

export type OwnedCard = {
  id: string
  raffleId: RaffleId
  serial: number
  paidWith: PayAsset
  purchasedAt: number
  status: CardStatus
  payCode: string
  /** Exact USDT TRC-20 amount the user must send (unique offset 0.01–0.05). */
  usdtExact?: number
  txHash?: string
  telegramId?: number
  telegramUsername?: string
}

type CardsContextValue = {
  cards: OwnedCard[]
  raffleId: RaffleId
  setRaffleId: (id: RaffleId) => void
  soldCount: number
  cardsFor: (id: RaffleId) => OwnedCard[]
  soldCountFor: (id: RaffleId) => number
  remaining: number
  isRunning: boolean
  mintCard: (paidWith: PayAsset, extra?: { txHash?: string }) => OwnedCard
  createPendingUsdt: (baseUsdt: number) => OwnedCard
  confirmCardPayment: (id: string, extra?: { txHash?: string }) => OwnedCard
  clearRaffleCards: (id: RaffleId) => void
}

const PAY_CODE_TAG: Record<RaffleId, string> = {
  classic: 'MAIN',
  fast200: '200',
  fast100: '100',
}

export function formatPayCode(raffleId: RaffleId, serial: number) {
  return `DJ-${PAY_CODE_TAG[raffleId]}-${String(serial).padStart(4, '0')}`
}

export function roundUsdt(amount: number) {
  return Math.round(amount * 100) / 100
}

export function formatUsdtExact(amount: number, locale: string) {
  return `${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
}

/** Base price plus a unique 0.01–0.05 USDT tag, avoiding other pending amounts. */
export function allocateUniqueUsdt(baseUsdt: number, existing: OwnedCard[]) {
  const base = roundUsdt(baseUsdt)
  const used = new Set(
    existing
      .filter(
        (card) =>
          card.paidWith === 'USDT' && card.status === 'pending' && typeof card.usdtExact === 'number',
      )
      .map((card) => roundUsdt(card.usdtExact as number)),
  )
  const cents = [1, 2, 3, 4, 5]
  const bytes = new Uint32Array(1)
  for (let i = cents.length - 1; i > 0; i -= 1) {
    crypto.getRandomValues(bytes)
    const j = bytes[0] % (i + 1)
    const tmp = cents[i]
    cents[i] = cents[j]
    cents[j] = tmp
  }
  for (const extra of cents) {
    const amount = roundUsdt(base + extra / 100)
    if (!used.has(amount)) return amount
  }
  return roundUsdt(base + cents[0] / 100)
}

function isRaffleId(value: unknown): value is RaffleId {
  return value === 'classic' || value === 'fast200' || value === 'fast100'
}

function readCards(): OwnedCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.cards)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<Partial<OwnedCard>>
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((card) => card && typeof card.serial === 'number')
      .map((card) => ({
        id: String(card.id ?? crypto.randomUUID()),
        raffleId: isRaffleId(card.raffleId) ? card.raffleId : 'classic',
        serial: card.serial as number,
        paidWith: card.paidWith === 'USDT' ? 'USDT' : 'TON',
        purchasedAt: typeof card.purchasedAt === 'number' ? card.purchasedAt : Date.now(),
        status: card.status === 'pending' ? 'pending' : 'active',
        payCode:
          typeof card.payCode === 'string' && card.payCode
            ? card.payCode
            : formatPayCode(isRaffleId(card.raffleId) ? card.raffleId : 'classic', card.serial as number),
        usdtExact: typeof card.usdtExact === 'number' && Number.isFinite(card.usdtExact) ? card.usdtExact : undefined,
        txHash: typeof card.txHash === 'string' ? card.txHash : undefined,
        telegramId: typeof card.telegramId === 'number' ? card.telegramId : undefined,
        telegramUsername: typeof card.telegramUsername === 'string' ? card.telegramUsername : undefined,
      }))
  } catch {
    return []
  }
}

function readRaffleId(): RaffleId {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.raffle)
    if (isRaffleId(stored)) return stored
  } catch {
    /* ignore */
  }
  return 'classic'
}

function persist(cards: OwnedCard[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.cards, JSON.stringify(cards))
  } catch {
    /* ignore */
  }
  syncCardsToBot(cards)
}

function withBuyer(card: OwnedCard): OwnedCard {
  const buyer = captureTelegramUser()
  if (!buyer) return card
  return {
    ...card,
    telegramId: card.telegramId ?? buyer.telegramId,
    telegramUsername: card.telegramUsername ?? buyer.telegramUsername,
  }
}

function allocateSerial(existing: OwnedCard[], raffleId: RaffleId) {
  const total = RAFFLES[raffleId].total
  const used = new Set(
    existing.filter((card) => card.raffleId === raffleId).map((card) => card.serial),
  )
  const bytes = new Uint32Array(1)
  for (let i = 0; i < total * 2; i += 1) {
    crypto.getRandomValues(bytes)
    const serial = (bytes[0] % total) + 1
    if (!used.has(serial)) return serial
  }
  for (let serial = 1; serial <= total; serial += 1) {
    if (!used.has(serial)) return serial
  }
  throw new Error('sold_out')
}

const CardsContext = createContext<CardsContextValue | null>(null)

export function CardsProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<OwnedCard[]>(readCards)
  const [raffleId, setRaffleState] = useState<RaffleId>(readRaffleId)
  const admin = useAdmin()

  const value = useMemo<CardsContextValue>(() => {
    const cardsFor = (id: RaffleId) => cards.filter((card) => card.raffleId === id)
    const soldCountFor = (id: RaffleId) => {
      const raffle = getRaffle(id)
      return Math.min(raffle.total, admin.raffles[id].soldBase)
    }
    const raffle = getRaffle(raffleId)
    const soldCount = soldCountFor(raffleId)
    const isRunning = admin.raffles[raffleId].status === 'running'

    return {
      cards,
      raffleId,
      setRaffleId: (id) => {
        setRaffleState(id)
        try {
          localStorage.setItem(STORAGE_KEYS.raffle, id)
        } catch {
          /* ignore */
        }
      },
      soldCount,
      cardsFor,
      soldCountFor,
      remaining: raffle.total - soldCount,
      isRunning,
      mintCard: (paidWith, extra) => {
        if (!isRunning) throw new Error('stopped')
        if (soldCount >= raffle.total) throw new Error('sold_out')
        const serial = allocateSerial(cards, raffleId)
        const card = withBuyer({
          id: crypto.randomUUID(),
          raffleId,
          serial,
          paidWith,
          purchasedAt: Date.now(),
          status: 'active',
          payCode: formatPayCode(raffleId, serial),
          txHash: extra?.txHash,
        })
        const next = [card, ...cards]
        setCards(next)
        persist(next)
        admin.incrementSold(raffleId)
        return card
      },
      createPendingUsdt: (baseUsdt) => {
        if (!isRunning) throw new Error('stopped')
        if (soldCount >= raffle.total) throw new Error('sold_out')
        if (!Number.isFinite(baseUsdt) || baseUsdt <= 0) throw new Error('usdt_rate')
        const existing = cards.find(
          (card) => card.raffleId === raffleId && card.paidWith === 'USDT' && card.status === 'pending',
        )
        if (existing) {
          const patched = withBuyer({
            ...existing,
            usdtExact:
              typeof existing.usdtExact === 'number'
                ? existing.usdtExact
                : allocateUniqueUsdt(
                    baseUsdt,
                    cards.filter((card) => card.id !== existing.id),
                  ),
          })
          const next = cards.map((card) => (card.id === existing.id ? patched : card))
          setCards(next)
          persist(next)
          return patched
        }
        const serial = allocateSerial(cards, raffleId)
        const card = withBuyer({
          id: crypto.randomUUID(),
          raffleId,
          serial,
          paidWith: 'USDT',
          purchasedAt: Date.now(),
          status: 'pending',
          payCode: formatPayCode(raffleId, serial),
          usdtExact: allocateUniqueUsdt(baseUsdt, cards),
        })
        const next = [card, ...cards]
        setCards(next)
        persist(next)
        return card
      },
      confirmCardPayment: (id, extra) => {
        const current = cards.find((card) => card.id === id)
        if (!current) throw new Error('not_found')
        if (current.status === 'active') {
          return current
        }
        const updated = withBuyer({
          ...current,
          status: 'active',
          purchasedAt: Date.now(),
          txHash: extra?.txHash ?? current.txHash,
        })
        const next = cards.map((card) => (card.id === id ? updated : card))
        setCards(next)
        persist(next)
        admin.incrementSold(current.raffleId)
        return updated
      },
      clearRaffleCards: (id) => {
        const next = cards.filter((card) => card.raffleId !== id)
        setCards(next)
        persist(next)
      },
    }
  }, [admin, cards, raffleId])

  useEffect(() => {
    const buyer = captureTelegramUser()
    if (!buyer) return
    setCards((prev) => {
      let changed = false
      const next = prev.map((card) => {
        if (card.telegramId) return card
        changed = true
        return { ...card, telegramId: buyer.telegramId, telegramUsername: buyer.telegramUsername }
      })
      if (!changed) {
        syncCardsToBot(prev)
        return prev
      }
      persist(next)
      return next
    })
  }, [])

  return <CardsContext.Provider value={value}>{children}</CardsContext.Provider>
}

export function useCards() {
  const ctx = useContext(CardsContext)
  if (!ctx) throw new Error('useCards must be used within CardsProvider')
  return ctx
}

export function formatSerial(serial: number, total = 2000) {
  const width = total >= 1000 ? 4 : 3
  return String(serial).padStart(width, '0')
}
