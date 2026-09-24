import { useState } from 'react'
import { CollectibleCard } from '../../../components/CollectibleCard'
import { getRaffle, type RaffleId } from '../../../constants'
import { formatCardPrice, useUsdtRate } from '../../../hooks/useUsdtRate'
import { useI18n } from '../../../i18n/LanguageProvider'
import { RAFFLE_HINT_KEY, RAFFLE_TITLE_KEY } from '../../../i18n/raffleLabels'
import { heistT } from '../../heistI18n'
import { nftSkin, nftTrialLeft, type NftTrial } from '../../nftTrial'
import { nftWinAmount } from '../render/Props'

type Props = {
  ids: RaffleId[]
  trial: NftTrial | null
  onTry: (id: RaffleId) => void
  onOpenDrop: (id: RaffleId) => void
  onClose: () => void
}

/**
 * Look-only view of the NFTs behind the vault bars. Everything shown here is
 * the real NFT Drop data (art, edition, price, prize); nothing is granted,
 * sold or paid from inside the heist.
 */
export function NftVaultPanel({ ids, trial, onTry, onOpenDrop, onClose }: Props) {
  const { t, lang } = useI18n()
  const { rate } = useUsdtRate()
  const [i, setI] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const id = ids[i % ids.length]
  const raffle = getRaffle(id)
  const prize = raffle.prizes[0]?.amount ?? ''
  const wearing = trial?.nftId === id

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
        {id === 'classic' && <div className="v2-nft-win">{heistT('heistNftWinTitle', { amount: nftWinAmount() })}</div>}
        <div className="v2-nft-note">{heistT('heistNftWinNote', { name: t(RAFFLE_TITLE_KEY[id]), prize })}</div>
        {ids.length > 1 && (
          <button type="button" className="v2-pause-abort" onClick={() => setI((v) => (v + 1) % ids.length)}>
            {heistT('heistNftNext')}
          </button>
        )}
        <SkinPreview id={id} />
        <button type="button" className="v2-pause-resume" disabled={wearing} onClick={() => onTry(id)}>
          {wearing && trial ? heistT('heistNftTrying', { time: nftTrialLeft(trial) }) : heistT('heistNftTry')}
        </button>
        <div className="v2-nft-note">{heistT('heistNftTryNote')}</div>
        <div className="v2-nft-like">{heistT('heistNftLike')}</div>
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

/**
 * The in-raid look of this NFT: its idle frames from the skin sheet, stepped in
 * CSS (no canvas). If the sheet is missing it shows the fallback — the normal
 * duck with the NFT crown — exactly what the raid would show.
 */
function SkinPreview({ id }: { id: RaffleId }) {
  const skin = nftSkin(id)
  const [failed, setFailed] = useState<string | null>(null)
  const url = skin.sheet?.url
  const ok = Boolean(url) && failed !== url
  return (
    <div className="v2-nft-skin" style={{ '--skin': skin.css } as React.CSSProperties}>
      <div className="v2-nft-skin-stage">
        <div className="v2-nft-skin-duck" style={{ backgroundImage: `url(${ok ? url : '/heist/duck_sheet.png'})` }} />
        {!ok && <span className="v2-nft-skin-crown">👑</span>}
        {url && <img src={url} alt="" hidden onError={() => setFailed(url)} />}
      </div>
      <div className="v2-nft-skin-text">
        <b>{skin.name}</b>
        <span>{heistT('heistNftSkinLook')}</span>
      </div>
    </div>
  )
}
