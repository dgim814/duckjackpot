import { useEffect, useState } from 'react'
import { track } from '../analytics/track'
import { openStarsInvoice } from '../heist/economy/stars'
import { useI18n } from '../i18n/LanguageProvider'
import type { MessageKey } from '../i18n/messages'
import { createSupportInvoice, inTelegram, onSupport, refreshSupport, supportMe, supportPacks, type SupportMe, type SupportPack } from './api'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Each tier looks a step above the previous one: warmer gold, stronger (but calm) glow. */
const TIER_STYLE: Record<number, string> = {
  1: 'border-amber-200/25 bg-[#15120d]',
  2: 'border-amber-300/35 bg-[#18130c] shadow-[0_0_10px_rgba(255,190,70,0.08)]',
  3: 'border-amber-300/55 bg-[#1b150b] shadow-[0_0_14px_rgba(255,200,70,0.14)]',
  4: 'border-amber-200/70 bg-[#1d160a] shadow-[0_0_18px_rgba(255,210,90,0.2)]',
  5: 'border-sky-200/70 bg-[#101722] shadow-[0_0_22px_rgba(140,200,255,0.25)]',
}

export function SupporterBadge({ packId, badge, compact = false }: { packId: string; badge: string; compact?: boolean }) {
  const { t } = useI18n()
  return (
    <span className={`supporter-badge inline-flex items-center gap-1 rounded-full border border-amber-300/50 bg-amber-300/10 font-black text-amber-100 ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[12px]'}`}>
      {badge} {t(`bd_${packId}` as MessageKey)}
    </span>
  )
}

/** A digital thank-you card (a UI component — not an NFT, not part of NFT Drop). */
function SupporterCard({ pack, since }: { pack: SupportPack; since: number | null }) {
  const { t } = useI18n()
  return (
    <div className={`supporter-card mx-auto mt-3 w-full max-w-xs rounded-3xl border px-5 py-6 text-center ${TIER_STYLE[pack.rank] ?? TIER_STYLE[3]}`}>
      <p className="text-[11px] font-extrabold tracking-[0.3em] text-amber-200/80">{t('cardKicker')}</p>
      <p className="font-display text-[13px] font-black tracking-[0.3em] text-amber-100">{t('cardSupporter')}</p>
      <p className="mt-4 text-5xl">{pack.badge}</p>
      <p className="gold-text mt-3 font-display text-2xl font-black leading-tight">{t(`pk_${pack.id}` as MessageKey)}</p>
      <p className="mt-3 text-[10px] font-bold tracking-[0.18em] text-amber-100/70">{t('cardThanks')}</p>
      {since ? <p className="mt-2 text-[11px] text-zinc-400">{t('cardSince', { y: new Date(since).getFullYear() })}</p> : null}
    </div>
  )
}

type Phase = { kind: 'idle' } | { kind: 'opening'; packId: string } | { kind: 'checking'; packId: string } | { kind: 'cancelled' } | { kind: 'failed'; msg: MessageKey } | { kind: 'still' } | { kind: 'done'; packId: string }

/** 💎 SUPPORT DUCKJACKPOT: the five packs, paid only through Telegram's own Stars payment sheet. */
export function SupportStore({ onClose }: { onClose: () => void }) {
  const { t, lang } = useI18n()
  const [packs, setPacks] = useState<SupportPack[] | null>(null)
  const [enabled, setEnabled] = useState(true)
  const [me, setMe] = useState<SupportMe | null>(null)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  useEffect(() => {
    track('support_store_open')
    supportPacks()
      .then((r) => {
        setPacks(r.packs)
        setEnabled(r.enabled)
      })
      .catch(() => setPacks([]))
    return onSupport(setMe)
  }, [])
  const busy = phase.kind === 'opening' || phase.kind === 'checking'

  const buy = async (pack: SupportPack) => {
    if (busy) return
    if (!inTelegram()) {
      setPhase({ kind: 'failed', msg: 'storeOnlyTg' })
      return
    }
    track('support_package_view', { productId: pack.id, starsAmount: pack.stars })
    setPhase({ kind: 'opening', packId: pack.id })
    let order: { orderId: string; invoiceUrl: string }
    try {
      order = await createSupportInvoice(pack.id, pack.stars, lang === 'en' ? 'en' : 'ru')
    } catch (err) {
      const status = (err as { status?: number }).status
      track('support_payment_failed', { productId: pack.id, starsAmount: pack.stars, error: status === 503 ? 'unavailable' : 'invoice' })
      setPhase({ kind: 'failed', msg: status === 401 ? 'storeOnlyTg' : status === 503 ? 'storeSoon' : 'storeFailed' })
      return
    }
    track('support_payment_started', { productId: pack.id, starsAmount: pack.stars, orderId: order.orderId })
    const closed = await openStarsInvoice(order.invoiceUrl)
    if (closed === 'cancelled') {
      track('support_payment_cancelled', { productId: pack.id, starsAmount: pack.stars, orderId: order.orderId })
      setPhase({ kind: 'cancelled' })
      return
    }
    if (closed === 'failed') {
      track('support_payment_failed', { productId: pack.id, starsAmount: pack.stars, orderId: order.orderId, error: 'telegram' })
      setPhase({ kind: 'failed', msg: 'storeFailed' })
      return
    }
    // "paid" from the sheet is not proof: only the server (Telegram's successful_payment) decides.
    setPhase({ kind: 'checking', packId: pack.id })
    for (let i = 0; i < 20; i += 1) {
      try {
        const m = await supportMe()
        if (m.orders.some((o) => o.orderId === order.orderId && o.status === 'delivered')) {
          setMe(m)
          void refreshSupport()
          setPhase({ kind: 'done', packId: pack.id })
          return
        }
      } catch {
        /* keep checking */
      }
      await sleep(1500)
    }
    setPhase({ kind: 'still' })
  }

  const doneTarget = phase.kind === 'done' ? packs?.find((p) => p.id === phase.packId) : undefined
  const current = me?.status ? packs?.find((p) => p.id === me.status!.packId) : undefined
  return (
    <div className="support-store fixed inset-0 z-50 flex items-end justify-center bg-black/75" onClick={busy ? undefined : onClose}>
      <div
        className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-amber-400/30 bg-[#110e0b] px-4 pt-5 pb-[calc(var(--safe-bottom)+16px)]"
        onClick={(e) => e.stopPropagation()}
      >
        {doneTarget ? (
          <div className="support-done text-center">
            <p className="font-display text-xl font-black text-amber-50">{t('okTitle')}</p>
            <p className="mt-1 text-[13px] font-bold text-amber-100">{t('okThanks')}</p>
            <SupporterCard pack={doneTarget} since={me?.memberSince ?? null} />
            <p className="mt-3 text-[12px] text-zinc-300">{t('okText')}</p>
            <button type="button" className="buy-btn mt-4 min-h-12 w-full rounded-2xl text-[14px] font-black text-zinc-950" onClick={onClose}>
              {t('okPlay')}
            </button>
          </div>
        ) : (
          <>
            <p className="font-display text-xl font-black text-amber-50">{t('storeTitle')}</p>
            <p className="mt-1 text-[12px] text-zinc-300">{t('storeSub')}</p>
            {current ? (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-amber-300/30 bg-amber-300/5 px-3 py-2">
                <span className="text-[11px] font-bold text-zinc-400">{t('storeCurrent')}</span>
                <SupporterBadge packId={current.id} badge={current.badge} />
              </div>
            ) : null}
            {me?.totalStars ? <p className="mt-1 text-right text-[10px] text-zinc-500">{t('storeTotal', { n: me.totalStars })}</p> : null}
            <ul className="mt-3 space-y-2">
              {(packs ?? []).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={busy || !enabled}
                    onClick={() => void buy(p)}
                    className={`support-pack flex w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left disabled:opacity-60 ${TIER_STYLE[p.rank] ?? ''}`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="text-2xl">{p.badge}</span>
                      <span className="min-w-0 font-display text-[13px] font-black leading-tight text-amber-50">{t(`pk_${p.id}` as MessageKey)}</span>
                    </span>
                    <span className="shrink-0 rounded-xl bg-amber-300 px-3 py-1.5 text-[13px] font-black text-zinc-950">
                      {(phase.kind === 'opening' || phase.kind === 'checking') && phase.packId === p.id ? (phase.kind === 'opening' ? t('storeOpening') : t('storeChecking')) : `${p.stars} ⭐`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {!enabled ? <p className="mt-2 text-[12px] font-bold text-orange-300">{t('storeSoon')}</p> : null}
            {phase.kind === 'cancelled' ? <p className="support-msg mt-3 text-[12px] font-bold text-zinc-300">{t('storeCancelled')}</p> : null}
            {phase.kind === 'failed' ? <p className="support-msg mt-3 text-[12px] font-bold text-orange-300">{t(phase.msg)}</p> : null}
            {phase.kind === 'still' ? <p className="support-msg mt-3 text-[12px] font-bold text-amber-200">{t('storeStill')}</p> : null}
            <p className="mt-3 text-[10px] leading-snug text-zinc-500">{t('storeNote')}</p>
            <button type="button" disabled={busy} className="mt-3 min-h-11 w-full rounded-xl border border-white/15 text-[13px] font-black text-zinc-200 disabled:opacity-50" onClick={onClose}>
              {t('storeClose')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/** 💎 The hub's small, secondary support card (with the player's badge once they have one). */
export function SupportCard() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [me, setMe] = useState<SupportMe | null>(null)
  const [packs, setPacks] = useState<SupportPack[]>([])
  useEffect(() => {
    void refreshSupport()
    supportPacks()
      .then((r) => setPacks(r.packs))
      .catch(() => undefined)
    return onSupport(setMe)
  }, [])
  const current = me?.status ? packs.find((p) => p.id === me.status!.packId) : undefined
  return (
    <section className="support-card mt-3 rounded-2xl border border-amber-300/25 bg-gradient-to-br from-[#17120b] to-[#0f0d0b] px-3 py-3 text-left">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-black tracking-[0.06em] text-amber-100">{t('supTitle')}</p>
        {current ? <SupporterBadge packId={current.id} badge={current.badge} compact /> : null}
      </div>
      <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">{t('supText')}</p>
      <button type="button" className="support-open mt-2 min-h-10 rounded-xl border border-amber-300/50 bg-amber-300/10 px-4 text-[12px] font-black text-amber-100" onClick={() => setOpen(true)}>
        {t('supBtn')}
      </button>
      {open ? <SupportStore onClose={() => setOpen(false)} /> : null}
    </section>
  )
}

/** Profile: the badge, if the player is a supporter. */
export function ProfileSupporter() {
  const { t } = useI18n()
  const [me, setMe] = useState<SupportMe | null>(null)
  const [packs, setPacks] = useState<SupportPack[]>([])
  useEffect(() => {
    void refreshSupport()
    supportPacks()
      .then((r) => setPacks(r.packs))
      .catch(() => undefined)
    return onSupport(setMe)
  }, [])
  const current = me?.status ? packs.find((p) => p.id === me.status!.packId) : undefined
  if (!current) return null
  return (
    <div className="profile-supporter mt-3 flex items-center justify-between gap-2 rounded-2xl border border-amber-300/25 bg-[#15110b] px-3 py-2.5">
      <span className="text-[12px] font-bold text-zinc-300">{t('profileSupporter')}</span>
      <SupporterBadge packId={current.id} badge={current.badge} />
    </div>
  )
}
