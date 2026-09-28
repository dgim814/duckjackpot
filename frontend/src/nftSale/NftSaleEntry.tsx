import { useEffect, useState } from 'react'
import { NFT_ART_URL, saleConfig, saleMe, shortAddress, type SaleOrder } from './api'
import { useSaleText } from './i18n'
import { NftCard, NftViewerOverlay } from './NftViewer'
import './nftSale.css'

/** true once the backend says the sale is on (NFT_SALE_ENABLED). Off → nothing is rendered. */
function useSaleEnabled() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    let live = true
    void saleConfig().then((c) => live && setEnabled(c.enabled))
    return () => {
      live = false
    }
  }, [])
  return enabled
}

/** HUB entry "🖼 NFT SALE · REAL TON NFT · 2000 LIMITED" — hidden while the sale is switched off. */
export function NftSaleHubCard({ onOpen }: { onOpen: () => void }) {
  const { d } = useSaleText()
  if (!useSaleEnabled()) return null
  return (
    <button type="button" onClick={onOpen} className="nfts-hub mt-3 flex w-full items-center gap-3 rounded-2xl border border-amber-400/45 bg-gradient-to-r from-[#1c1409] to-[#0e0b08] px-3 py-2.5 text-left">
      <img src={NFT_ART_URL} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-amber-400/40 object-cover" loading="lazy" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-[15px] font-black text-amber-50">{d.hubTitle}</p>
        <p className="text-[10px] font-extrabold tracking-[0.14em] text-amber-200/80">
          {d.hubLine1} · {d.hubLine2}
        </p>
      </div>
      <span className="shrink-0 rounded-full border border-amber-300/50 px-2 py-0.5 text-[9px] font-black tracking-[0.16em] text-amber-200">TESTNET</span>
    </button>
  )
}

/** Profile "MY NFT" — the player's delivered HEIST NFTs (server data). Hidden while the sale is off. */
export function MyNftSection() {
  const { d } = useSaleText()
  const enabled = useSaleEnabled()
  const [nfts, setNfts] = useState<SaleOrder[] | null>(null)
  const [open, setOpen] = useState<SaleOrder | null>(null)
  useEffect(() => {
    if (!enabled) return
    void saleMe()
      .then((m) => setNfts(m.nfts))
      .catch(() => setNfts([]))
  }, [enabled])
  if (!enabled) return null
  return (
    <div className="nfts-mine mt-4 rounded-2xl border border-amber-400/25 bg-[#141009] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold tracking-[0.14em] text-amber-100">{d.myNft}</p>
        <span className="text-[9px] font-black tracking-[0.16em] text-amber-300/80">TESTNET</span>
      </div>
      {nfts === null ? <p className="mt-2 text-sm text-zinc-500">…</p> : null}
      {nfts && !nfts.length ? <p className="mt-2 text-sm text-zinc-400">{d.noNft}</p> : null}
      {nfts?.map((n) => (
        <div key={n.id} className="mt-3 flex gap-3">
          <div className="w-24 shrink-0">
            <NftCard edition={n.nftId} size="sm" onOpen={() => setOpen(n)} />
          </div>
          <div className="min-w-0 text-[12px] text-zinc-400">
            <p className="font-display text-base font-black text-amber-50">🦆 HEIST #{n.nftId}</p>
            <p>{n.edition}</p>
            <p className="mt-1">
              {d.owner}: <span className="font-mono text-amber-100">{shortAddress(n.wallet)}</span>
            </p>
            <p>
              {d.status}: <span className="font-bold text-emerald-300">{n.status}</span> · TESTNET
            </p>
            {n.explorerUrl ? (
              <a href={n.explorerUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block font-bold text-amber-300 underline">
                {d.viewOnTon} ↗
              </a>
            ) : null}
          </div>
        </div>
      ))}
      {open ? <NftViewerOverlay nft={open} onClose={() => setOpen(null)} /> : null}
    </div>
  )
}
