import type { CatalogItem, ItemRarity } from './catalog'

export const RARITY_TONE: Record<ItemRarity, string> = {
  COMMON: 'border-white/20 text-zinc-300',
  UNCOMMON: 'border-emerald-400/40 text-emerald-200',
  LUX: 'border-amber-400/55 text-amber-200',
  RARE: 'border-sky-400/45 text-sky-200',
  EPIC: 'border-violet-400/45 text-violet-200',
  LEGENDARY: 'border-amber-400/55 text-amber-200',
  ICONIC: 'border-orange-400/70 text-orange-100',
}

function tone(id: string) {
  let h = 0
  for (const ch of id) h = (h * 33 + ch.charCodeAt(0)) >>> 0
  return h % 360
}

function lotKind(item: CatalogItem) {
  if (item.category === 'ART') return 'art'
  if (item.category === 'LUXURY' || item.rarity === 'LUX') return 'lux'
  if (item.rarity === 'RARE' || item.rarity === 'EPIC' || item.rarity === 'LEGENDARY' || item.rarity === 'ICONIC') return 'rare'
  return 'rest'
}

function LotGlyph({ item }: { item: CatalogItem }) {
  const hue = tone(item.id)
  if (item.id === 'luxury_pin') return <BroochGlyph />
  if (item.id === 'luxury_chain') return <ChainGlyph />
  if (item.id === 'rare_cameo') return <CameoGlyph />
  if (item.id === 'lux_lighter') return <LighterGlyph />
  if (item.id === 'special_faberge_egg') return <JewelGlyph hue={hue} rare />
  if (item.id === 'special_mystery') return <TokenGlyph hue={hue} />
  if (item.id.startsWith('watch_')) return <WatchGlyph hue={hue} />
  if (item.id.startsWith('car_')) return <CarGlyph hue={hue} />
  if (item.id.startsWith('fashion_')) return <FashionGlyph hue={hue} />
  if (item.id.startsWith('jewel_')) return <JewelGlyph hue={hue} rare={item.rarity !== 'LUX' && item.rarity !== 'COMMON'} />
  if (item.id.startsWith('tech_')) return <DeviceGlyph hue={hue} />
  if (item.id.startsWith('music_')) return <GuitarGlyph hue={hue} />
  if (item.id.startsWith('book_')) return <BookGlyph hue={hue} />
  if (item.id.startsWith('sci_') || item.id.startsWith('antique_')) return <InstrumentGlyph hue={hue} />
  if (item.category === 'ART') return <PaintingGlyph hue={hue} />
  if (item.category === 'CARS') return <CarGlyph hue={hue} />
  if (item.category === 'SPECIAL') return <TokenGlyph hue={hue} />
  if (item.category === 'INTERIOR') return <VesselGlyph hue={hue} />
  if (item.category === 'LUXURY') return <JewelGlyph hue={hue} rare={item.rarity === 'RARE' || item.rarity === 'EPIC' || item.rarity === 'LEGENDARY' || item.rarity === 'ICONIC'} />
  return <JewelGlyph hue={hue} rare />
}

function BroochGlyph() {
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="180" fill="#1a0e12" />
      <rect width="320" height="180" fill="url(#pinVelvet)" />
      <defs>
        <radialGradient id="pinVelvet" cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor="#4a1c28" />
          <stop offset="100%" stopColor="#12080a" />
        </radialGradient>
        <radialGradient id="pinGem" cx="42%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#6b1020" />
          <stop offset="100%" stopColor="#2a0610" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="96" rx="58" ry="58" fill="none" stroke="#c4a028" strokeWidth="7" />
      <ellipse cx="160" cy="96" rx="46" ry="46" fill="none" stroke="#e6d3a3" strokeWidth="2" opacity="0.7" />
      <ellipse cx="160" cy="96" rx="28" ry="28" fill="url(#pinGem)" stroke="#d4af58" strokeWidth="3" />
      <ellipse cx="150" cy="86" rx="8" ry="5" fill="#f7ecd0" opacity="0.35" />
    </svg>
  )
}

function ChainGlyph() {
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="180" fill="#100c08" />
      <defs>
        <linearGradient id="chainGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f3e2b8" />
          <stop offset="50%" stopColor="#d4af58" />
          <stop offset="100%" stopColor="#8a5a12" />
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="148" rx="96" ry="16" fill="#000" opacity="0.35" />
      {[86, 123, 160, 197, 234].map((x, i) => (
        <ellipse
          key={x}
          cx={x}
          cy={88 + (i % 2) * 8}
          rx="22"
          ry="30"
          fill="none"
          stroke="url(#chainGold)"
          strokeWidth="7"
        />
      ))}
    </svg>
  )
}

function CameoGlyph() {
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="180" fill="#0c1018" />
      <defs>
        <radialGradient id="cameoNight" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#243044" />
          <stop offset="100%" stopColor="#0a0d14" />
        </radialGradient>
      </defs>
      <rect width="320" height="180" fill="url(#cameoNight)" />
      <ellipse cx="160" cy="92" rx="54" ry="68" fill="#c4a028" />
      <ellipse cx="160" cy="92" rx="46" ry="60" fill="#1a2433" />
      <ellipse cx="160" cy="92" rx="40" ry="54" fill="#e8dcc4" />
      <path
        d="M168 62c12 2 18 14 16 26 0 8-4 12-3 18 8 6 16 16 14 28-2 16-18 24-34 22-16-2-28-14-26-28 2-12 10-18 12-24-2-8-8-14-6-24 2-12 14-20 27-18z"
        fill="#3a2a22"
      />
      <ellipse cx="160" cy="92" rx="46" ry="60" fill="none" stroke="#d4af58" strokeWidth="3" />
    </svg>
  )
}

function LighterGlyph() {
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="180" fill="#14100c" />
      <rect x="118" y="44" width="84" height="100" rx="8" fill="#c4a028" />
      <rect x="124" y="50" width="72" height="88" rx="5" fill="#1a140e" />
      <rect x="132" y="58" width="56" height="10" rx="2" fill="#e6d3a3" />
      <rect x="148" y="36" width="24" height="14" rx="3" fill="#d4af58" />
      <rect x="154" y="28" width="12" height="10" rx="2" fill="#f3e2b8" />
    </svg>
  )
}

function PaintingGlyph({ hue }: { hue: number }) {
  const a = `hsl(${hue} 28% 22%)`
  const b = `hsl(${(hue + 28) % 360} 32% 16%)`
  const c = `hsl(${(hue + 50) % 360} 40% 38%)`
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="180" fill="#120e0a" />
      <rect x="22" y="14" width="276" height="152" fill="#c4a028" />
      <rect x="34" y="26" width="252" height="128" fill={b} />
      <ellipse cx="118" cy="78" rx="58" ry="36" fill={a} />
      <ellipse cx="210" cy="96" rx="70" ry="40" fill={c} opacity="0.85" />
      <rect x="34" y="26" width="252" height="128" fill="none" stroke="#f3e2b8" strokeWidth="2" opacity="0.25" />
    </svg>
  )
}

function JewelGlyph({ hue, rare }: { hue: number; rare?: boolean }) {
  const gem = rare ? `hsl(${220 + (hue % 40)} 42% 42%)` : `hsl(${40 + (hue % 20)} 58% 48%)`
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="180" fill={rare ? '#10141c' : '#16110c'} />
      <ellipse cx="160" cy="142" rx="70" ry="14" fill="#000" opacity="0.35" />
      <polygon points="160,46 196,88 160,132 124,88" fill={gem} stroke="#d4af58" strokeWidth="3" />
      <polygon points="160,46 178,88 160,78 142,88" fill="#f7ecd0" opacity="0.28" />
    </svg>
  )
}

function VesselGlyph({ hue }: { hue: number }) {
  const clay = `hsl(${28 + (hue % 18)} 36% 38%)`
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="180" fill="#14110d" />
      <ellipse cx="160" cy="46" rx="28" ry="10" fill="#d4af58" />
      <path d="M132 50c-8 20-18 48-10 78 6 22 46 22 52 0 8-30-2-58-10-78z" fill={clay} stroke="#d4af58" strokeWidth="3" />
      <ellipse cx="160" cy="50" rx="24" ry="8" fill="#1a140e" />
    </svg>
  )
}

function CarGlyph({ hue }: { hue: number }) {
  const body = `hsl(${hue % 360} 18% 18%)`
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="180" fill="#0e0c0a" />
      <path d="M64 112h192c8-22 6-38-18-48-28-8-54-22-78-22s-52 14-72 22c-22 8-28 24-24 48z" fill={body} stroke="#d4af58" strokeWidth="3" />
      <circle cx="112" cy="118" r="16" fill="#1a140e" stroke="#c4a028" strokeWidth="3" />
      <circle cx="220" cy="118" r="16" fill="#1a140e" stroke="#c4a028" strokeWidth="3" />
    </svg>
  )
}

function TokenGlyph({ hue }: { hue: number }) {
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="180" fill="#121018" />
      <circle cx="160" cy="90" r="48" fill="#c4a028" />
      <circle cx="160" cy="90" r="38" fill="#1a140e" stroke="#f3e2b8" strokeWidth="2" />
      <circle cx="160" cy="90" r="14" fill={`hsl(${hue} 40% 46%)`} />
    </svg>
  )
}

function WatchGlyph({ hue }: { hue: number }) {
  const face = `hsl(${hue % 360} 18% 18%)`
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="180" fill="#100c08" />
      <rect x="148" y="18" width="24" height="22" rx="3" fill="#c4a028" />
      <rect x="148" y="140" width="24" height="22" rx="3" fill="#c4a028" />
      <circle cx="160" cy="90" r="52" fill="#c4a028" />
      <circle cx="160" cy="90" r="42" fill={face} stroke="#f3e2b8" strokeWidth="2" />
      <circle cx="160" cy="90" r="4" fill="#d4af58" />
      <line x1="160" y1="90" x2="160" y2="62" stroke="#e6d3a3" strokeWidth="3" />
      <line x1="160" y1="90" x2="186" y2="90" stroke="#d4af58" strokeWidth="2" />
    </svg>
  )
}

function FashionGlyph({ hue }: { hue: number }) {
  const leather = `hsl(${28 + (hue % 16)} 32% 28%)`
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="180" fill="#120e0c" />
      <path d="M118 58h84v18c22 6 34 22 34 42v28H84v-28c0-20 12-36 34-42z" fill={leather} stroke="#d4af58" strokeWidth="3" />
      <path d="M132 58c0-22 12-36 28-36s28 14 28 36" fill="none" stroke="#c4a028" strokeWidth="6" />
    </svg>
  )
}

function DeviceGlyph({ hue }: { hue: number }) {
  const body = `hsl(${hue % 360} 12% 16%)`
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="180" fill="#0c1014" />
      <rect x="86" y="38" width="148" height="104" rx="10" fill={body} stroke="#d4af58" strokeWidth="3" />
      <rect x="102" y="52" width="116" height="58" rx="4" fill="#1a2430" />
      <circle cx="160" cy="126" r="8" fill="#c4a028" />
    </svg>
  )
}

function GuitarGlyph({ hue }: { hue: number }) {
  const body = `hsl(${28 + (hue % 20)} 38% 32%)`
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="180" fill="#100c0a" />
      <ellipse cx="128" cy="108" rx="46" ry="38" fill={body} stroke="#d4af58" strokeWidth="3" />
      <ellipse cx="168" cy="88" rx="36" ry="30" fill={body} stroke="#d4af58" strokeWidth="3" />
      <rect x="188" y="42" width="72" height="10" rx="3" fill="#c4a028" transform="rotate(-28 224 47)" />
      <circle cx="148" cy="98" r="10" fill="#1a140e" stroke="#e6d3a3" strokeWidth="2" />
    </svg>
  )
}

function BookGlyph({ hue }: { hue: number }) {
  const cover = `hsl(${hue % 360} 28% 24%)`
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="180" fill="#14100c" />
      <rect x="92" y="32" width="136" height="116" rx="4" fill={cover} stroke="#d4af58" strokeWidth="3" />
      <rect x="108" y="48" width="104" height="12" fill="#e6d3a3" opacity="0.35" />
      <rect x="108" y="70" width="88" height="8" fill="#f3e2b8" opacity="0.2" />
      <rect x="92" y="32" width="14" height="116" fill="#c4a028" />
    </svg>
  )
}

function InstrumentGlyph({ hue }: { hue: number }) {
  const brass = `hsl(${38 + (hue % 12)} 48% 46%)`
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="180" fill="#10140c" />
      <circle cx="160" cy="96" r="46" fill="none" stroke={brass} strokeWidth="8" />
      <circle cx="160" cy="96" r="8" fill="#d4af58" />
      <line x1="160" y1="50" x2="160" y2="88" stroke="#e6d3a3" strokeWidth="3" />
      <polygon points="160,44 168,56 152,56" fill="#c4a028" />
    </svg>
  )
}

export function LotArt({ item, className = '' }: { item: CatalogItem; className?: string }) {
  const kind = lotKind(item)
  return (
    <div
      className={`lot-art lot-art-${item.rarity} ${item.image ? 'lot-art-framed' : `lot-art-place lot-art-place-${kind}`} ${className}`.trim()}
      aria-hidden
    >
      {item.image ? <img src={item.image} alt="" className="lot-art-image" /> : <LotGlyph item={item} />}
    </div>
  )
}
