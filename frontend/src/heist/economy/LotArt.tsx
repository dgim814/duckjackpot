import type { CatalogItem, ItemRarity } from './catalog'

const MARK: Record<CatalogItem['category'], string> = {
  ART: 'ART',
  LUXURY: 'LUX',
  INTERIOR: 'INT',
  CARS: 'CAR',
  SPECIAL: '★',
}

export const RARITY_TONE: Record<ItemRarity, string> = {
  COMMON: 'border-white/20 text-zinc-300',
  UNCOMMON: 'border-emerald-400/40 text-emerald-200',
  LUX: 'border-amber-400/55 text-amber-200',
  RARE: 'border-sky-400/45 text-sky-200',
  EPIC: 'border-violet-400/45 text-violet-200',
  LEGENDARY: 'border-amber-400/55 text-amber-200',
  ICONIC: 'border-orange-400/70 text-orange-100',
}

export function LotArt({ item, className = '' }: { item: CatalogItem; className?: string }) {
  return (
    <div
      className={`lot-art lot-art-${item.rarity} ${item.image ? 'lot-art-framed' : ''} ${className}`.trim()}
      aria-hidden
    >
      {item.image ? (
        <img src={item.image} alt="" className="lot-art-image" />
      ) : (
        <span className="lot-art-mark">{MARK[item.category]}</span>
      )}
    </div>
  )
}
