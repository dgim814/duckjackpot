/**
 * Telegram Stars (XTR) client. The server owns everything that matters: prices, orders and
 * the fact of a payment. This module only asks the server for an invoice, opens it with
 * Telegram.WebApp.openInvoice, and then asks the server what was actually paid.
 * The raw Telegram initData goes with every request; the server verifies it.
 */
import WebApp from '@twa-dev/sdk'
import { API_ORIGIN } from '../../api/client'
import { telegramInitData } from '../../telegram/user'
import { applyStarsOwnership } from '../progress'

export type StarsStat = 'bagLevel' | 'shoesLevel' | 'disguiseLevel' | 'dashLevel'
export type StarsProduct = { id: string; stat: StarsStat; prices: number[]; title: { ru: string; en: string }; tiers: { ru: string; en: string }[] }
export type StarsCatalog = { enabled: boolean; products: StarsProduct[] }
export type StarsOrderView = { orderId: string; productId: string; tier: number; starsAmount: number; status: string; createdAt: number; purchasedAt: number | null }

/** Purchases are possible only inside Telegram (a verified user). */
export function inTelegram() {
  return Boolean(telegramInitData())
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_ORIGIN}/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': telegramInitData(), ...(init.headers ?? {}) },
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw Object.assign(new Error(data.error || `http_${res.status}`), { status: res.status })
  return data
}

export function fetchStarsCatalog() {
  return call<StarsCatalog>('/stars/products')
}

export function fetchStarsPurchases() {
  return call<{ purchases: StarsOrderView[]; owned: Record<string, number> }>('/stars/purchases')
}

/** `level` is the local gear level (0..3): it tells the server which tier is next; the price is the server's. */
export function createStarsInvoice(productId: string, level: number, lang: 'ru' | 'en') {
  return call<{ orderId: string; invoiceUrl: string; productId: string; tier: number; starsAmount: number }>('/stars/create-invoice', {
    method: 'POST',
    body: JSON.stringify({ productId, level, lang }),
  })
}

/** Telegram's own payment sheet. Resolves with Telegram's status; the server decides if it was paid. */
export function openStarsInvoice(url: string): Promise<'paid' | 'cancelled' | 'failed' | 'pending'> {
  const tg = (window as Window & { Telegram?: { WebApp?: typeof WebApp } }).Telegram?.WebApp ?? WebApp
  return new Promise((resolve) => {
    try {
      tg.openInvoice(url, (status) => resolve(status as 'paid' | 'cancelled' | 'failed' | 'pending'))
    } catch {
      resolve('failed')
    }
  })
}

/**
 * Server purchases → local gear: each product raises its track to the tier the server
 * delivered. Idempotent (max), so calling it on every visit is safe.
 */
export async function syncStarsPurchases(catalog?: StarsCatalog | null) {
  if (!inTelegram()) return null
  const { purchases, owned } = await fetchStarsPurchases()
  const products = catalog?.products ?? (await fetchStarsCatalog()).products
  const byStat: Partial<Record<StarsStat, number>> = {}
  for (const p of products) if (owned[p.id]) byStat[p.stat] = Math.max(byStat[p.stat] ?? 0, owned[p.id])
  const applied = applyStarsOwnership(byStat)
  return { purchases, owned, progress: applied.next, raised: applied.raised }
}
