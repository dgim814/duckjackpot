import { useEffect, useRef, useState } from 'react'
import { track } from '../../analytics/track'
import { useI18n } from '../../i18n/LanguageProvider'
import type { PlayerProgress } from '../progress'
import { createStarsInvoice, fetchStarsPurchases, inTelegram, openStarsInvoice, syncStarsPurchases, type StarsCatalog, type StarsProduct } from './stars'

type Phase = 'idle' | 'creating' | 'checking' | 'done' | 'cancelled' | 'error'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * ⭐ Buy the next tier of an upgrade with Telegram Stars. The tap only asks the server for an
 * invoice; whether it was paid is ALWAYS read back from the server after Telegram's sheet closes.
 */
export function StarsBuyButton({
  product,
  catalog,
  level,
  onDelivered,
  onMessage,
}: {
  product: StarsProduct
  catalog: StarsCatalog
  level: number
  onDelivered: (progress: PlayerProgress) => void
  onMessage: (msg: string) => void
}) {
  const { t, lang } = useI18n()
  const [phase, setPhase] = useState<Phase>('idle')
  const alive = useRef(true)
  useEffect(() => () => void (alive.current = false), [])
  const price = product.prices[Math.min(level, product.prices.length - 1)]
  // A result stays on the button for a moment, then it offers the next tier again.
  useEffect(() => {
    if (phase !== 'done' && phase !== 'cancelled' && phase !== 'error') return
    const id = window.setTimeout(() => setPhase('idle'), 3500)
    return () => window.clearTimeout(id)
  }, [phase])

  const buy = async () => {
    if (phase === 'creating' || phase === 'checking') return
    setPhase('creating')
    let order: { orderId: string; invoiceUrl: string; tier: number; starsAmount: number }
    try {
      order = await createStarsInvoice(product.id, level, lang === 'ru' ? 'ru' : 'en')
    } catch (err) {
      const status = (err as { status?: number }).status
      const code = err instanceof Error ? err.message : 'error'
      track('stars_purchase_error', { productId: product.id, error: code })
      setPhase('error')
      onMessage(status === 401 ? t('starsOnlyTelegram') : code === 'max_level' ? t('heistLabMax') : status === 503 ? t('starsSoon') : t('starsInvoiceError'))
      return
    }
    const closed = await openStarsInvoice(order.invoiceUrl)
    if (!alive.current) return
    if (closed === 'cancelled') track('stars_invoice_cancelled', { productId: product.id, orderId: order.orderId, starsAmount: order.starsAmount })
    setPhase('checking')
    // The server is the only source of truth: poll it until Telegram's successful_payment arrived.
    const tries = closed === 'paid' || closed === 'pending' ? 20 : 2
    for (let i = 0; i < tries; i += 1) {
      try {
        const { purchases } = await fetchStarsPurchases()
        const o = purchases.find((p) => p.orderId === order.orderId)
        if (o?.status === 'delivered') {
          const synced = await syncStarsPurchases(catalog)
          if (!alive.current) return
          if (synced) onDelivered(synced.progress)
          setPhase('done')
          onMessage(t('starsGot', { name: product.title[lang === 'ru' ? 'ru' : 'en'], n: o.tier + 1 }))
          return
        }
        if (o?.status === 'failed') break
      } catch {
        /* keep trying a little */
      }
      await sleep(1500)
      if (!alive.current) return
    }
    if (closed === 'cancelled') {
      setPhase('cancelled')
      return
    }
    setPhase(closed === 'failed' ? 'error' : 'checking')
    onMessage(closed === 'failed' ? t('starsInvoiceError') : t('starsStillChecking'))
  }

  if (!inTelegram()) {
    return (
      <button type="button" disabled className="min-h-12 rounded-xl border border-white/15 px-2 py-2 text-[11px] font-bold leading-tight text-zinc-400 opacity-70">
        {t('starsOnlyTelegram')}
      </button>
    )
  }
  if (!catalog.enabled) {
    return (
      <button type="button" disabled className="min-h-12 rounded-xl border border-white/15 px-2 py-2 text-[12px] font-bold text-zinc-400 opacity-70">
        {t('starsSoon')}
      </button>
    )
  }
  const label =
    phase === 'creating'
      ? t('starsCreating')
      : phase === 'checking'
        ? t('starsChecking')
        : phase === 'done'
          ? t('starsDone')
          : phase === 'cancelled'
            ? t('starsCancelled')
            : t('starsBuy', { n: price })
  return (
    <button
      type="button"
      disabled={phase === 'creating' || phase === 'checking'}
      className="buy-btn min-h-12 rounded-xl px-2 py-2 text-[12px] font-black leading-tight text-zinc-950 disabled:opacity-60"
      onClick={() => void buy()}
    >
      {label}
    </button>
  )
}
