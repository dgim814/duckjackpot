import { useState } from 'react'
import { useAdmin } from '../../../admin/AdminProvider'
import { CollectibleCard } from '../../../components/CollectibleCard'
import { getRaffle, type RaffleId } from '../../../constants'
import { formatCardPrice, useUsdtRate } from '../../../hooks/useUsdtRate'
import { useI18n } from '../../../i18n/LanguageProvider'
import { RAFFLE_HINT_KEY, RAFFLE_TITLE_KEY } from '../../../i18n/raffleLabels'
import { heistT } from '../../heistI18n'
import { nftWinAmount } from '../render/Props'

type Props = {
  ids: RaffleId[]
  onOpenDrop: (id: RaffleId) => void
  onClose: () => void
}

/**
 * 💎 NFT COLLECTION behind the MANSION bars: an information window only. The NFT is
 * a separate DuckJackpot digital collectible and NFT Drop prize — never a duck skin,
 * never granted, sold or paid from inside the heist. Art, edition, price, status and
 * prize are the real NFT Drop data (custom art comes from the admin upload).
 */
export function NftVaultPanel({ ids, onOpenDrop, onClose }: Props) {
  const { t, lang } = useI18n()
  const { raffles } = useAdmin()
  const { rate } = useUsdtRate()
  const [i, setI] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const id = ids[i % ids.length]
  const raffle = getRaffle(id)
  const prize = raffle.prizes[0]?.amount ?? ''
  const status = raffles[id]?.status ?? 'running'
  const statusKey = status === 'running' ? 'heistNftStatusLive' : status === 'drawn' || status === 'awaiting_draw' ? 'heistNftStatusDraw' : 'heistNftStatusSold'

  return (
    <div className="v2-nft-layer" role="dialog" aria-modal="true" aria-label={heistT('heistNftVault')}>
      <div className="v2-pause-menu v2-nft-menu">
        <div className="v2-pause-card v2-nft-card">
          <div className="v2-pause-title">{heistT('heistNftVault')}</div>
          <div className="v2-nft-sub">{heistT('heistNftBehindBars')}</div>
          <div className="v2-nft-art">
            <CollectibleCard raffleId={id} compact />
          </div>
          <div className="v2-nft-name">{t(RAFFLE_TITLE_KEY[id])}</div>
          <div className="v2-nft-desc">{t(RAFFLE_HINT_KEY[id])}</div>
          <div className="v2-nft-meta">
            <span>{heistT('heistNftEdition', { n: raffle.total.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US') })}</span>
            <span>{heistT('heistNftPrice', { price: formatCardPrice(raffle.priceRub, rate, lang) })}</span>
          </div>
          <div className="v2-nft-status">{heistT(statusKey)}</div>
          {id === 'classic' && <div className="v2-nft-win">{heistT('heistNftWinTitle', { amount: nftWinAmount() })}</div>}
          <div className="v2-nft-note">{heistT('heistNftWinNote', { name: t(RAFFLE_TITLE_KEY[id]), prize })}</div>
          <div className="v2-nft-note">{heistT('heistNftSeparate')}</div>
          {ids.length > 1 && (
            <button type="button" className="v2-pause-abort" onClick={() => setI((v) => (v + 1) % ids.length)}>
              {heistT('heistNftNext')}
            </button>
          )}
          {leaving ? (
            <>
              <div className="v2-nft-warn">{heistT('heistNftLeaveWarn')}</div>
              <button type="button" className="v2-pause-resume" onClick={() => onOpenDrop(id)}>
                {heistT('heistNftConfirmLeave')}
              </button>
            </>
          ) : (
            <button type="button" className="v2-pause-resume" onClick={() => setLeaving(true)}>
              {heistT('heistNftOpenDrop')}
            </button>
          )}
          <button type="button" className="v2-pause-abort" onClick={onClose}>
            {heistT('heistNftBack')}
          </button>
        </div>
      </div>
      {/* Outside the scroller so it never scrolls away; closes back into the same raid. */}
      <button type="button" className="v2-nft-close" onClick={onClose} aria-label={heistT('heistNftBack')}>
        ✕
      </button>
    </div>
  )
}
