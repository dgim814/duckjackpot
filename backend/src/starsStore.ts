import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'
import { enqueueDataOp, writeJsonAtomic } from './dataQueue.js'

/**
 * Telegram Stars (currency XTR): server-side catalog, orders and idempotent delivery.
 * A product is one tier of an existing Duck Heist gear upgrade. Prices live ONLY here;
 * the client never sends a price. Orders are stored on the data volume and a purchase
 * is delivered only after Telegram's successful_payment for a matching order.
 */

export type StarsStat = 'bagLevel' | 'shoesLevel' | 'disguiseLevel' | 'dashLevel'

export type StarsProduct = {
  id: string
  stat: StarsStat
  /** Stars price per tier 1..3 (index 0 = tier 1). */
  prices: readonly number[]
  title: { ru: string; en: string }
  /** What each tier really does in the game (tier 1..3). */
  tiers: readonly { ru: string; en: string }[]
}

/**
 * ⚠️ PLACEHOLDER PRICES — the Stars prices the game already had for these tiers
 * (frontend balance.ts UPGRADES[*].stars). Change them here, in one place.
 */
export const STARS_PRODUCTS: Record<string, StarsProduct> = {
  big_bag: {
    id: 'big_bag',
    stat: 'bagLevel',
    prices: [50, 150, 400],
    title: { ru: 'BIG BAG', en: 'BIG BAG' },
    tiers: [
      { ru: 'Сумка вмещает 250 DUCK COIN вместо 100.', en: 'The bag holds 250 DUCK COIN instead of 100.' },
      { ru: 'Сумка вмещает 500 DUCK COIN.', en: 'The bag holds 500 DUCK COIN.' },
      { ru: 'Сумка вмещает 1000 DUCK COIN.', en: 'The bag holds 1000 DUCK COIN.' },
    ],
  },
  silent_shoes: {
    id: 'silent_shoes',
    stat: 'shoesLevel',
    prices: [80, 220, 500],
    title: { ru: 'SILENT SHOES', en: 'SILENT SHOES' },
    tiers: [
      { ru: 'Шаги тише: охрана слышит тебя хуже.', en: 'Quieter steps: guards hear you less.' },
      { ru: 'Ещё тише и немного быстрее.', en: 'Even quieter and a little faster.' },
      { ru: 'Самые тихие шаги и заметно быстрее.', en: 'The quietest steps and noticeably faster.' },
    ],
  },
  better_disguise: {
    id: 'better_disguise',
    stat: 'disguiseLevel',
    prices: [75, 200, 450],
    title: { ru: 'BETTER DISGUISE', en: 'BETTER DISGUISE' },
    tiers: [
      { ru: 'Охрана и камеры замечают тебя позже.', en: 'Guards and cameras notice you later.' },
      { ru: 'Охрана и камеры замечают тебя ещё позже.', en: 'Guards and cameras notice you even later.' },
      { ru: 'Лучшая маскировка: тебя замечают позже всего.', en: 'The best disguise: you are noticed last.' },
    ],
  },
  fast_dash: {
    id: 'fast_dash',
    stat: 'dashLevel',
    prices: [60, 180, 420],
    title: { ru: 'FAST DASH', en: 'FAST DASH' },
    tiers: [
      { ru: 'РЫВОК перезаряжается быстрее.', en: 'DASH recharges faster.' },
      { ru: 'РЫВОК перезаряжается ещё быстрее и чуть дальше.', en: 'DASH recharges even faster and goes a bit further.' },
      { ru: 'Самый быстрый и дальний РЫВОК.', en: 'The fastest, longest DASH.' },
    ],
  },
}

export const MAX_TIER = 3

export type OrderStatus = 'created' | 'invoice_created' | 'paid' | 'delivered' | 'cancelled' | 'failed' | 'refunded'

export type StarsOrder = {
  id: string
  telegramUserId: number
  productId: string
  /** gear orders only; a support pack has no stat */
  stat?: StarsStat
  tier: number
  /** 'support' = a Supporter Pack (status only, no gameplay); missing = a gear upgrade */
  kind?: 'gear' | 'support'
  usernameSnapshot?: string | null
  displayNameSnapshot?: string | null
  refundedAt?: number
  starsAmount: number
  status: OrderStatus
  payload: string
  lang: 'ru' | 'en'
  createdAt: number
  invoiceCreatedAt?: number
  paidAt?: number
  deliveredAt?: number
  telegramPaymentChargeId?: string
  providerPaymentChargeId?: string
  failReason?: string
}

type Store = { orders: Record<string, StarsOrder>; charges: Record<string, string> }

const DIR = join(DATA_DIR, 'stars')
const FILE = join(DIR, 'orders.json')
/** An unpaid invoice is only honoured for a day: after that the player makes a new one. */
export const INVOICE_TTL_MS = 24 * 60 * 60_000

function read(): Store {
  try {
    if (!existsSync(FILE)) return { orders: {}, charges: {} }
    const s = JSON.parse(readFileSync(FILE, 'utf8')) as Store
    return { orders: s.orders ?? {}, charges: s.charges ?? {} }
  } catch (err) {
    // Never silently start from empty over a broken file: payments depend on it.
    console.error('[stars] orders.json unreadable', err)
    throw new Error('stars_store_unreadable')
  }
}

function write(s: Store) {
  mkdirSync(DIR, { recursive: true })
  writeJsonAtomic(FILE, s)
}

export function payloadFor(orderId: string, productId: string) {
  return `dj_${orderId}_${productId}`
}

function parsePayload(payload: string) {
  const m = /^dj_([a-f0-9]{24})_([a-z_]{2,40})$/.exec(payload)
  return m ? { orderId: m[1], productId: m[2] } : null
}

/** Highest tier of a product already delivered to this player. */
export function deliveredTier(telegramUserId: number, productId: string) {
  let t = 0
  for (const o of Object.values(read().orders)) {
    if (o.telegramUserId === telegramUserId && o.productId === productId && o.status === 'delivered') t = Math.max(t, o.tier)
  }
  return t
}

/**
 * New order for the next tier. `clientLevel` is only the player's local gear level, used to
 * pick WHICH tier they are buying; the price always comes from the catalog for that tier and a
 * tier below what this player already bought with Stars is never sold again.
 */
export function createOrder(telegramUserId: number, productId: string, clientLevel: unknown, lang: 'ru' | 'en') {
  const product = STARS_PRODUCTS[productId]
  if (!product) return { error: 'unknown_product' as const }
  const local = typeof clientLevel === 'number' && Number.isFinite(clientLevel) ? Math.max(0, Math.min(MAX_TIER, Math.floor(clientLevel))) : 0
  const tier = Math.max(deliveredTier(telegramUserId, productId), local) + 1
  if (tier > MAX_TIER) return { error: 'max_level' as const }
  const id = randomBytes(12).toString('hex')
  const order: StarsOrder = {
    id,
    telegramUserId,
    productId,
    stat: product.stat,
    tier,
    starsAmount: product.prices[tier - 1],
    status: 'created',
    payload: payloadFor(id, productId),
    lang,
    createdAt: Date.now(),
  }
  return { order, product }
}

export function saveOrder(order: StarsOrder) {
  return enqueueDataOp('stars:save', order.id, () => {
    const s = read()
    s.orders[order.id] = order
    write(s)
    return order
  })
}

export function invoiceTexts(order: StarsOrder) {
  const pack = order.kind === 'support' ? SUPPORT_PACKS[order.productId] : undefined
  if (pack) {
    const l = order.lang
    return {
      title: `${pack.title[l]}`.slice(0, 32),
      description: (l === 'ru' ? `Поддержка DuckJackpot: статус ${pack.title.ru}. Без игровых преимуществ.` : `Support DuckJackpot: ${pack.title.en} status. No gameplay advantage.`).slice(0, 255),
      label: `${pack.title[l]}`.slice(0, 32),
    }
  }
  const p = STARS_PRODUCTS[order.productId]
  const l = order.lang
  const lvl = l === 'ru' ? `уровень ${order.tier + 1}` : `level ${order.tier + 1}`
  return {
    title: `${p.title[l]} · ${lvl}`.slice(0, 32),
    description: p.tiers[order.tier - 1][l].slice(0, 255),
    label: `${p.title[l]} ${order.tier + 1}`.slice(0, 32),
  }
}

export type PreCheckout = { id: string; from: { id: number }; currency: string; total_amount: number; invoice_payload: string }

/** pre_checkout_query: cheap checks only (Telegram wants an answer within 10 s). */
export function checkPreCheckout(q: PreCheckout, now = Date.now()): { ok: true } | { ok: false; error: string } {
  const parsed = parsePayload(q.invoice_payload)
  if (!parsed) return { ok: false, error: 'Неизвестный заказ.' }
  const o = read().orders[parsed.orderId]
  if (!o || o.productId !== parsed.productId || o.payload !== q.invoice_payload) return { ok: false, error: 'Заказ не найден.' }
  if (o.telegramUserId !== q.from?.id) return { ok: false, error: 'Этот счёт создан для другого игрока.' }
  if (q.currency !== 'XTR') return { ok: false, error: 'Оплата принимается только в Telegram Stars.' }
  if (q.total_amount !== o.starsAmount) return { ok: false, error: 'Сумма счёта не совпадает.' }
  if (o.status !== 'invoice_created') return { ok: false, error: o.status === 'delivered' ? 'Этот заказ уже оплачен.' : 'Счёт больше не действителен. Создайте новый.' }
  if (now - (o.invoiceCreatedAt ?? o.createdAt) > INVOICE_TTL_MS) return { ok: false, error: 'Счёт устарел. Создайте новый в игре.' }
  if (!STARS_PRODUCTS[o.productId] && !(o.kind === 'support' && SUPPORT_PACKS[o.productId])) return { ok: false, error: 'Товар больше не продаётся.' }
  return { ok: true }
}

export type SuccessfulPayment = {
  currency: string
  total_amount: number
  invoice_payload: string
  telegram_payment_charge_id: string
  provider_payment_charge_id?: string
}

export type PaymentOutcome =
  | { result: 'delivered'; order: StarsOrder }
  | { result: 'duplicate'; order?: StarsOrder }
  | { result: 'rejected'; reason: string; order?: StarsOrder }

/**
 * successful_payment → exactly one delivery. Idempotent on telegram_payment_charge_id and on the
 * order: a repeated update, a re-delivered message or a second payment for the same order never
 * delivers twice (a second charge is kept as `failed` for a manual refund).
 */
export function applySuccessfulPayment(fromId: number | undefined, p: SuccessfulPayment, now = Date.now()) {
  return enqueueDataOp('stars:paid', p?.telegram_payment_charge_id, (): PaymentOutcome => {
    const s = read()
    const charge = typeof p?.telegram_payment_charge_id === 'string' ? p.telegram_payment_charge_id : ''
    if (!charge) return { result: 'rejected', reason: 'no_charge_id' }
    if (s.charges[charge]) return { result: 'duplicate', order: s.orders[s.charges[charge]] }
    const parsed = parsePayload(p.invoice_payload ?? '')
    const o = parsed ? s.orders[parsed.orderId] : undefined
    const reject = (reason: string): PaymentOutcome => {
      if (o) {
        // Keep the charge on record even when it cannot be delivered: support can refund it.
        s.charges[charge] = o.id
        if (o.status !== 'delivered') {
          o.status = 'failed'
          o.failReason = reason
          o.telegramPaymentChargeId = charge
          o.paidAt = now
        }
        write(s)
      }
      return { result: 'rejected', reason, order: o }
    }
    if (!o || !parsed || o.productId !== parsed.productId) return { result: 'rejected', reason: 'unknown_order' }
    if (o.telegramUserId !== fromId) return reject('wrong_user')
    if (p.currency !== 'XTR') return reject('wrong_currency')
    if (p.total_amount !== o.starsAmount) return reject('wrong_amount')
    if (o.status === 'delivered') {
      s.charges[charge] = o.id
      write(s)
      return { result: 'duplicate', order: o }
    }
    if (o.status !== 'invoice_created' && o.status !== 'paid') return reject(`bad_status_${o.status}`)
    o.status = 'paid'
    o.paidAt = now
    o.telegramPaymentChargeId = charge
    o.providerPaymentChargeId = p.provider_payment_charge_id
    s.charges[charge] = o.id
    // Delivery: the order becomes the player's owned tier (the game reads it from /purchases).
    o.status = 'delivered'
    o.deliveredAt = now
    write(s)
    return { result: 'delivered', order: o }
  })
}

export function ordersOf(telegramUserId: number) {
  return Object.values(read().orders)
    .filter((o) => o.telegramUserId === telegramUserId)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function allOrders() {
  return Object.values(read().orders).sort((a, b) => b.createdAt - a.createdAt)
}

// ---------- 💎 Supporter Packs: voluntary support, status only (no DUCK COIN, no NFT, no advantage) ----------

export type SupportPack = { id: string; stars: number; rank: number; badge: string; title: { ru: string; en: string } }

/** Prices live only here; the client never decides an amount. */
export const SUPPORT_PACKS: Record<string, SupportPack> = {
  support_rookie: { id: 'support_rookie', stars: 50, rank: 1, badge: '🦆', title: { ru: 'ROOKIE SUPPORTER', en: 'ROOKIE SUPPORTER' } },
  support_heist: { id: 'support_heist', stars: 100, rank: 2, badge: '💰', title: { ru: 'HEIST SUPPORTER', en: 'HEIST SUPPORTER' } },
  support_gold: { id: 'support_gold', stars: 250, rank: 3, badge: '🥇', title: { ru: 'GOLD SUPPORTER', en: 'GOLD SUPPORTER' } },
  support_master: { id: 'support_master', stars: 500, rank: 4, badge: '👑', title: { ru: 'MASTER SUPPORTER', en: 'MASTER SUPPORTER' } },
  support_legend: { id: 'support_legend', stars: 1000, rank: 5, badge: '💎', title: { ru: 'DUCKJACKPOT LEGEND', en: 'DUCKJACKPOT LEGEND' } },
}

export const isSupportOrder = (o: StarsOrder) => o.kind === 'support'

/** A support order for one pack at the server price (the payload format is the same as gear orders). */
export function createSupportOrder(telegramUserId: number, packId: string, lang: 'ru' | 'en', who: { username?: string; name?: string }) {
  const pack = SUPPORT_PACKS[packId]
  if (!pack) return { error: 'unknown_pack' as const }
  const id = randomBytes(12).toString('hex')
  const order: StarsOrder = {
    id,
    telegramUserId,
    productId: pack.id,
    kind: 'support',
    tier: 1,
    starsAmount: pack.stars,
    status: 'created',
    payload: payloadFor(id, pack.id),
    lang,
    createdAt: Date.now(),
    usernameSnapshot: who.username ?? null,
    displayNameSnapshot: who.name ?? null,
  }
  return { order, pack }
}

export type SupportPurchase = { orderId: string; packId: string; stars: number; status: 'PAID' | 'REFUNDED'; purchasedAt: number }

/** One player's support: every paid pack (PAID / REFUNDED), and the status = the highest PAID pack. */
export function supportOf(telegramUserId: number) {
  const orders = Object.values(read().orders).filter((o) => o.telegramUserId === telegramUserId && isSupportOrder(o))
  const purchases: SupportPurchase[] = orders
    .filter((o) => o.status === 'delivered' || o.status === 'refunded')
    .map((o) => ({ orderId: o.id, packId: o.productId, stars: o.starsAmount, status: o.status === 'refunded' ? ('REFUNDED' as const) : ('PAID' as const), purchasedAt: o.deliveredAt ?? o.paidAt ?? o.createdAt }))
    .sort((a, b) => a.purchasedAt - b.purchasedAt)
  const paid = purchases.filter((p) => p.status === 'PAID')
  const top = paid.map((p) => SUPPORT_PACKS[p.packId]).filter(Boolean).sort((a, b) => b.rank - a.rank)[0] ?? null
  return {
    status: top ? { packId: top.id, rank: top.rank } : null,
    totalStars: paid.reduce((a, p) => a + p.stars, 0),
    memberSince: paid[0]?.purchasedAt ?? null,
    purchases,
    /** open/finished orders, so the client can follow its own invoice */
    orders: orders.map((o) => ({ orderId: o.id, packId: o.productId, status: o.status })),
  }
}

/**
 * Telegram's refunded_payment for a SUPPORT order → REFUNDED (the status is taken back).
 * Gear orders are left exactly as before.
 */
export function applySupportRefund(charge: string, now = Date.now()) {
  return enqueueDataOp('stars:refund', charge, () => {
    const s = read()
    const id = s.charges[charge]
    const o = id ? s.orders[id] : undefined
    if (!o || !isSupportOrder(o) || o.status !== 'delivered') return null
    o.status = 'refunded'
    o.refundedAt = now
    write(s)
    return o
  })
}

/** Admin: support purchases (no charge ids, no payment secrets). */
export function supportAdmin() {
  const orders = Object.values(read().orders).filter((o) => isSupportOrder(o) && (o.status === 'delivered' || o.status === 'refunded'))
  const paid = orders.filter((o) => o.status === 'delivered')
  const stars = paid.reduce((a, o) => a + o.starsAmount, 0)
  const supporters = new Set(paid.map((o) => o.telegramUserId))
  return {
    totalStars: stars,
    purchases: paid.length,
    uniqueSupporters: supporters.size,
    avgPurchase: paid.length ? Math.round((stars / paid.length) * 10) / 10 : 0,
    refunded: orders.length - paid.length,
    last: orders
      .sort((a, b) => (b.deliveredAt ?? 0) - (a.deliveredAt ?? 0))
      .slice(0, 20)
      .map((o) => ({ orderId: o.id, telegramId: o.telegramUserId, username: o.usernameSnapshot ?? null, name: o.displayNameSnapshot ?? null, packId: o.productId, stars: o.starsAmount, date: o.deliveredAt ?? o.paidAt ?? o.createdAt, status: o.status === 'refunded' ? 'REFUNDED' : 'PAID' })),
  }
}
