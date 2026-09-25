import { useState } from 'react'
import { getRaffle } from '../../../constants'
import { RAFFLE_TITLE_KEY } from '../../../i18n/raffleLabels'
import { useI18n } from '../../../i18n/LanguageProvider'
import { STAR_ITEMS, type StarItemId } from '../../economy/balance'
import { heistT } from '../../heistI18n'
import { loadProgress } from '../../progress'
import type { LiftOption } from '../sim/Raid'

/** Shared shell: dimmed layer, scrollable card, a ✕ that never scrolls away. */
function Shell({ title, onClose, children }: { title: string; onClose?: () => void; children: React.ReactNode }) {
  return (
    <div className="v2-nft-layer" role="dialog" aria-modal="true" aria-label={title}>
      <div className="v2-pause-menu v2-nft-menu">
        <div className="v2-pause-card v2-nft-card">
          <div className="v2-pause-title">{title}</div>
          {children}
        </div>
      </div>
      {onClose ? (
        <button type="button" className="v2-nft-close" onClick={onClose} aria-label={heistT('heistClose')}>
          ✕
        </button>
      ) : null}
    </div>
  )
}

/** What a ⭐ item costs the player right now: an owned token, a purchase, or not affordable. */
export function starAccess(id: StarItemId) {
  const p = loadProgress()
  const owned = p.starItems?.[id] ?? 0
  const price = STAR_ITEMS[id].stars
  return { owned, price, stars: p.stars || 0, canBuy: (p.stars || 0) >= price }
}

export function LiftPanel({
  floor,
  options,
  passActive,
  onRide,
  onClose,
}: {
  floor: number
  options: LiftOption[]
  passActive: boolean
  onRide: (id: string, premium: boolean) => void
  onClose: () => void
}) {
  const a = starAccess('elevatorPass')
  return (
    <Shell title={heistT('heistLiftPanelTitle', { n: floor + 1 })} onClose={onClose}>
      <div className="v2-nft-note">{heistT('heistLiftHint')}</div>
      {passActive ? <div className="v2-nft-like">{heistT('heistPassActive')}</div> : a.owned > 0 ? <div className="v2-nft-note">{heistT('heistPassOwned', { n: a.owned })}</div> : null}
      {options.map((o) => {
        const n = o.floor + 1
        if (!o.reached) {
          return (
            <button key={o.id} type="button" className="v2-pause-abort" disabled>
              {heistT('heistLiftLocked', { n })}
            </button>
          )
        }
        if (o.free) {
          return (
            <button key={o.id} type="button" className="v2-pause-resume" onClick={() => onRide(o.id, false)}>
              {heistT('heistLiftFree', { n })}
            </button>
          )
        }
        if (!o.premium) {
          return (
            <button key={o.id} type="button" className="v2-pause-abort" disabled>
              {heistT('heistLiftFar', { n })}
            </button>
          )
        }
        const usable = passActive || a.owned > 0 || a.canBuy
        return (
          <button key={o.id} type="button" className="v2-pause-resume v2-btn-star" disabled={!usable} onClick={() => onRide(o.id, true)}>
            {heistT('heistLiftPremium', { n })}
            {!passActive && a.owned <= 0 ? <small>{usable ? ` · ${a.price}` : ` · ${heistT('heistPassNeed', { n: a.price, have: a.stars })}`}</small> : null}
          </button>
        )
      })}
    </Shell>
  )
}

export function PassPanel({ onUse, onClose }: { onUse: () => void; onClose: () => void }) {
  const a = starAccess('escalatorPass')
  return (
    <Shell title={heistT('heistEscPassTitle')} onClose={onClose}>
      <div className="v2-nft-note">{heistT('heistEscPassHint')}</div>
      {a.owned > 0 ? (
        <button type="button" className="v2-pause-resume" onClick={onUse}>
          {heistT('heistUsePass')} · {heistT('heistPassOwned', { n: a.owned })}
        </button>
      ) : (
        <button type="button" className="v2-pause-resume v2-btn-star" disabled={!a.canBuy} onClick={onUse}>
          {a.canBuy ? heistT('heistPassBuy', { n: a.price }) : heistT('heistPassNeed', { n: a.price, have: a.stars })}
        </button>
      )}
      <button type="button" className="v2-pause-abort" onClick={onClose}>
        {heistT('heistClose')}
      </button>
    </Shell>
  )
}

export function ContinuePanel({ keep, onContinue, onEnd }: { keep: number; onContinue: () => void; onEnd: () => void }) {
  const a = starAccess('continueRaid')
  return (
    <Shell title={heistT('heistContinueTitle')}>
      <div className="v2-nft-desc">{heistT('heistContinueSub', { n: keep })}</div>
      <div className="v2-nft-note">{heistT('heistContinueOnce')}</div>
      <button type="button" className="v2-pause-resume v2-btn-star" disabled={a.owned <= 0 && !a.canBuy} onClick={onContinue}>
        {a.owned > 0 ? heistT('heistContinueUse') : a.canBuy ? heistT('heistContinueBuy', { n: a.price }) : heistT('heistPassNeed', { n: a.price, have: a.stars })}
      </button>
      <button type="button" className="v2-pause-abort" onClick={onEnd}>
        {heistT('heistContinueNo')}
      </button>
    </Shell>
  )
}

/**
 * The NFT Drop offer: at most once a day, after a good stretch of play, the raid
 * pauses. Real draw data only (existing NFT Drop prize), no promise of a win.
 */
export function NftCtaPanel({ onOpen, onContinue }: { onOpen: () => void; onContinue: () => void }) {
  const { t } = useI18n()
  const [leaving, setLeaving] = useState(false)
  const raffle = getRaffle('classic')
  return (
    <Shell title={heistT('heistCtaTitle')} onClose={onContinue}>
      <div className="v2-nft-win">🎴</div>
      <div className="v2-nft-name">{heistT('heistCtaSub')}</div>
      <div className="v2-cta-arrow" aria-hidden>
        →
      </div>
      <div className="v2-nft-note">{heistT('heistCtaPrize', { name: t(RAFFLE_TITLE_KEY.classic), prize: raffle.prizes[0]?.amount ?? '' })}</div>
      {leaving ? (
        <>
          <div className="v2-nft-warn">{heistT('heistCtaLeave')}</div>
          <button type="button" className="v2-pause-resume" onClick={onOpen}>
            {heistT('heistNftConfirmLeave')}
          </button>
        </>
      ) : (
        <button type="button" className="v2-pause-resume" onClick={() => setLeaving(true)}>
          {heistT('heistCtaOpen')}
        </button>
      )}
      <button type="button" className="v2-pause-abort" onClick={onContinue}>
        {heistT('heistCtaContinue')}
      </button>
    </Shell>
  )
}
