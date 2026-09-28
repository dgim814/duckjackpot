import { api } from '../api/client'
import type { OwnedCard } from '../cards/CardsProvider'
import { telegramInitData } from './user'

/** The server identifies the player only from the signed initData (never from a client id). */
function authBody() {
  return { initData: telegramInitData() }
}

export async function claimUsdtPayment(card: OwnedCard) {
  const { data } = await api.post('/payments/claim', {
    ...authBody(),
    card: {
      id: card.id,
      raffleId: card.raffleId,
      serial: card.serial,
      paidWith: card.paidWith,
      purchasedAt: card.purchasedAt,
      status: 'pending',
      payCode: card.payCode,
      usdtExact: card.usdtExact,
      telegramId: card.telegramId,
      telegramUsername: card.telegramUsername,
    },
  })
  return data
}

export async function fetchMyServerCards(): Promise<OwnedCard[]> {
  const body = authBody()
  if (!body.initData) return []
  const { data } = await api.post<{ cards?: OwnedCard[] }>('/me/cards/fetch', body)
  return Array.isArray(data.cards) ? data.cards : []
}

export function syncCardsToBot(cards: OwnedCard[]) {
  const body = authBody()
  if (!body.initData) return
  void api
    .post('/me/cards', {
      ...body,
      cards: cards.map((card) => ({
        id: card.id,
        raffleId: card.raffleId,
        serial: card.serial,
        paidWith: card.paidWith,
        purchasedAt: card.purchasedAt,
        status: card.status,
        payCode: card.payCode,
        usdtExact: card.usdtExact,
        telegramId: card.telegramId,
        telegramUsername: card.telegramUsername,
      })),
    })
    .catch(() => {
      /* backend unavailable */
    })
}

// ---------- TON payments: the server fixes the amount and verifies the transfer on-chain ----------
export type TonQuote = { orderId: string; amountTon: number; merchant: string; comment: string; expiresAt: number }
export type TonConfirm = { status: 'pending' | 'paid' | 'paid_unissued'; card?: OwnedCard | null; error?: string }

function apiError(err: unknown) {
  const e = err as { response?: { data?: { error?: string } } }
  return new Error(e.response?.data?.error || (err instanceof Error ? err.message : 'failed'))
}

export async function tonQuote(raffleId: string): Promise<TonQuote> {
  try {
    const { data } = await api.post<TonQuote>('/payments/ton/quote', { ...authBody(), raffleId })
    return data
  } catch (err) {
    throw apiError(err)
  }
}

export async function tonConfirm(orderId: string): Promise<TonConfirm> {
  try {
    const { data } = await api.post<TonConfirm>('/payments/ton/confirm', { ...authBody(), orderId })
    return data
  } catch (err) {
    throw apiError(err)
  }
}

/** Orders sent to the wallet but not confirmed yet: re-checked on the next launch. */
const PENDING_TON = 'duckjackpot.ton.pendingOrders'
type PendingTon = { id: string; at: number }
function readPending(): PendingTon[] {
  try {
    const list = JSON.parse(localStorage.getItem(PENDING_TON) || '[]') as PendingTon[]
    return Array.isArray(list) ? list.filter((x) => x && typeof x.id === 'string' && Date.now() - x.at < 3 * 86_400_000) : []
  } catch {
    return []
  }
}
function writePending(list: PendingTon[]) {
  try {
    localStorage.setItem(PENDING_TON, JSON.stringify(list.slice(-10)))
  } catch {
    /* storage unavailable */
  }
}
export function rememberTonOrder(id: string) {
  writePending([...readPending().filter((x) => x.id !== id), { id, at: Date.now() }])
}
export function forgetTonOrder(id: string) {
  writePending(readPending().filter((x) => x.id !== id))
}

/** Launch: ask the server about orders that were paid but not confirmed yet. */
export async function recheckPendingTonOrders(): Promise<OwnedCard[]> {
  if (!telegramInitData()) return []
  const cards: OwnedCard[] = []
  for (const p of readPending()) {
    try {
      const r = await tonConfirm(p.id)
      if (r.status === 'paid' && r.card) cards.push(r.card)
      if (r.status !== 'pending') forgetTonOrder(p.id)
    } catch (err) {
      if ((err as Error).message === 'not_found') forgetTonOrder(p.id)
    }
  }
  return cards
}
