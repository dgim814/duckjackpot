import { useEffect } from 'react'
import { NFT_ART_URL, shortAddress, type SaleOrder } from './api'
import { useSaleText } from './i18n'
import './nftSale.css'

/** The HEIST NFT card: gold vault frame, art, edition. Separate from the NFT Drop's card viewer. */
export function NftCard({ edition, supply = 2000, size = 'lg', onOpen }: { edition: number | null; supply?: number; size?: 'lg' | 'sm'; onOpen?: () => void }) {
  const lg = size === 'lg'
  return (
    <button type="button" onClick={onOpen} disabled={!onOpen} className="nfts-frame block w-full text-left disabled:cursor-default">
      <div className="nfts-frame-inner">
        <div className="nfts-sheen relative overflow-hidden">
          <img src={NFT_ART_URL} alt={edition ? `DuckJackpot HEIST #${edition}` : 'DuckJackpot HEIST'} className="nfts-art" loading="lazy" />
        </div>
        {/* caption under the art (never on top of it) */}
        <div className={`flex items-end justify-between gap-2 border-t border-amber-400/25 ${lg ? 'px-4 py-3' : 'px-2 py-1.5'}`}>
          <div className="min-w-0">
            <p className={`font-extrabold tracking-[0.2em] text-amber-200/80 ${lg ? 'text-[10px]' : 'text-[7px]'}`}>DUCKJACKPOT HEIST</p>
            <p className={`nfts-edition leading-none ${lg ? 'text-[2rem]' : 'text-base'}`}>
              #{edition ?? '—'}
              <span className={`ml-1 text-zinc-400 ${lg ? 'text-base' : 'text-[10px]'}`} style={{ WebkitTextFillColor: 'currentColor' }}>
                / {supply}
              </span>
            </p>
          </div>
          {lg ? <span className="nfts-ribbon">TESTNET</span> : null}
        </div>
      </div>
    </button>
  )
}

/** Fullscreen viewer for one owned NFT. */
export function NftViewerOverlay({ nft, onClose }: { nft: SaleOrder; onClose: () => void }) {
  const { d } = useSaleText()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="nfts-overlay" role="dialog" aria-modal="true">
      <div className="w-full max-w-[22rem]">
        <NftCard edition={nft.nftId} />
      </div>
      <div className="w-full max-w-[22rem] rounded-2xl border border-amber-400/25 bg-[#120e0a] p-4 text-sm">
        <p className="font-display text-lg font-black text-amber-50">🦆 HEIST #{nft.nftId}</p>
        <p className="text-zinc-400">{nft.edition}</p>
        <p className="mt-2 text-zinc-400">
          {d.owner}: <span className="font-mono text-amber-100">{shortAddress(nft.wallet)}</span>
        </p>
        <p className="text-zinc-400">
          {d.status}: <span className="font-bold text-emerald-300">{d.statusName[nft.status]}</span> <span className="text-[11px] text-amber-300/80">· TESTNET</span>
        </p>
        {nft.explorerUrl ? (
          <a href={nft.explorerUrl} target="_blank" rel="noreferrer" className="buy-btn mt-3 block rounded-xl px-3 py-2.5 text-center font-display text-sm font-black tracking-[0.08em] text-zinc-950">
            {d.viewOnTon}
          </a>
        ) : null}
      </div>
      <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-white/15 px-6 text-sm font-bold text-zinc-200">
        {d.close}
      </button>
    </div>
  )
}
