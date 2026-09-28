import { api, inTelegram } from '../retention/api'

/**
 * 💎 Supporter Packs: voluntary support through the existing Telegram Stars flow. The server owns
 * the prices, creates the invoice and decides — from Telegram's successful_payment only — that a
 * pack was paid. Status only: no DUCK COIN, no NFT, no gameplay advantage.
 */
export type SupportPack = { id: string; stars: number; rank: number; badge: string; title: { ru: string; en: string } }
export type SupportMe = {
  status: { packId: string; rank: number } | null
  totalStars: number
  memberSince: number | null
  purchases: { orderId: string; packId: string; stars: number; status: 'PAID' | 'REFUNDED'; purchasedAt: number }[]
  orders: { orderId: string; packId: string; status: string }[]
}

export const supportPacks = () => api<{ enabled: boolean; packs: SupportPack[] }>('/support/packs')
export const supportMe = () => api<SupportMe>('/support/me')
export const createSupportInvoice = (packId: string, starsAmount: number, lang: string) =>
  api<{ orderId: string; invoiceUrl: string; packId: string; starsAmount: number }>('/support/create-invoice', { method: 'POST', body: JSON.stringify({ packId, starsAmount, lang }) })

export { inTelegram }

// A tiny shared cache so the hub card and the profile show the badge without refetching.
let last: SupportMe | null = null
const subs = new Set<(m: SupportMe) => void>()
export function refreshSupport() {
  if (!inTelegram()) return Promise.resolve(null)
  return supportMe()
    .then((m) => {
      last = m
      for (const s of subs) s(m)
      return m
    })
    .catch(() => null)
}
export function onSupport(cb: (m: SupportMe) => void) {
  if (last) cb(last)
  subs.add(cb)
  return () => void subs.delete(cb)
}
