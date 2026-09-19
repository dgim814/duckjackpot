import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import type { CatalogItem } from '../heist/economy/catalog'
import { LotArt } from '../heist/economy/LotArt'
import { featuredLot, raidsHint, stockByCategory, type MarketFilter } from '../heist/economy/stock'
import { heistSfx, unlockHeistSfx } from '../heist/heistSfx'
import { buyCatalogItem, loadProgress } from '../heist/progress'
import { useI18n } from '../i18n/LanguageProvider'
import type { MessageKey } from '../i18n/messages'

type Filter = 'ALL' | 'ART' | 'LUXURY' | 'RARE'

const FILTERS: Filter[] = ['ALL', 'ART', 'LUXURY', 'RARE']

const CAT_KEY: Record<Filter, MessageKey> = {
  ALL: 'marketCatAll',
  ART: 'marketCatArt',
  LUXURY: 'marketCatLuxury',
  RARE: 'marketCatRare',
}

const HINT_KEY: Record<ReturnType<typeof raidsHint>, MessageKey> = {
  now: 'marketHintNow',
  bank: 'marketHintBank',
  mansion: 'marketHintMansion',
  more: 'marketHintMore',
}

function lotKind(item: CatalogItem) {
  if (item.category === 'ART') return 'art'
  if (item.category === 'LUXURY' || item.rarity === 'LUX') return 'lux'
  if (item.rarity === 'RARE' || item.rarity === 'EPIC' || item.rarity === 'LEGENDARY' || item.rarity === 'ICONIC') return 'rare'
  return 'rest'
}

function kindLabel(item: CatalogItem) {
  if (item.category === 'ART') return 'ART'
  if (item.category === 'LUXURY' || item.rarity === 'LUX') return 'LUX'
  if (item.rarity === 'RARE') return 'RARE'
  return item.rarity
}

export function BlackMarketPage() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [progress, setProgress] = useState(loadProgress)
  const [msg, setMsg] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('ALL')
  const locale = lang === 'ru' ? 'ru' : 'en'
  const featured = useMemo(() => featuredLot(), [])
  const items = useMemo(() => stockByCategory(filter as MarketFilter), [filter])

  const buy = (id: string) => {
    unlockHeistSfx()
    const result = buyCatalogItem(progress, id)
    if (result.reason === 'poor') {
      setMsg(t('marketPoor'))
      return
    }
    if (result.reason !== 'ok') return
    setProgress(result.next)
    setMsg(t('marketBought'))
    heistSfx.purchase()
  }

  return (
    <div className="black-market overflow-x-hidden px-4 pb-5">
      <ScreenHeader
        kicker={t('marketKicker')}
        title={t('marketTitle')}
        subtitle={t('marketSubtitle')}
        kickerClassName="text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#d4af58]"
        titleClassName="font-display mt-1 text-[1.7rem] font-black leading-tight tracking-[0.06em] market-gold sm:text-[1.9rem]"
      />

      <section className="market-vault mt-4 rounded-2xl px-3 py-3">
        <p className="text-center text-[10px] font-extrabold tracking-[0.22em] text-[#d4af58]">{t('heistDuckCoin')}</p>
        <p className="market-gold font-display text-center text-4xl font-black leading-none">{progress.bankedDuckCoin.toLocaleString()}</p>
        <p className="mt-2 text-center text-[11px] leading-snug text-zinc-500">{t('marketStarsHint')}</p>
        <p className="mt-1 text-center text-[11px] leading-snug text-zinc-500">{t('marketRaidHint')}</p>
      </section>

      {featured ? (
        <p className="mt-4 text-center text-[10px] font-extrabold tracking-[0.2em] text-[#d4af58]/85">
          {t('marketToday')}: {featured.name[locale]}
        </p>
      ) : null}
      {msg ? <p className="mt-3 text-center text-sm font-bold text-[#e6d3a3]">{msg}</p> : null}

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`min-h-11 shrink-0 rounded-full border px-3 text-[11px] font-extrabold tracking-[0.14em] ${
              filter === id
                ? 'border-[#d4af58]/70 bg-[#d4af58]/12 text-[#f3e2b8]'
                : 'border-white/10 text-zinc-500'
            }`}
          >
            {t(CAT_KEY[id])}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {items.map((item, index) => (
          <MarketLotCard
            key={item.id}
            item={item}
            locale={locale}
            banked={progress.bankedDuckCoin}
            hero={index === 0}
            buyLabel={t('marketBuy')}
            needMore={t('marketNeedMore', { n: Math.max(0, item.purchasePrice - progress.bankedDuckCoin) })}
            hint={t(HINT_KEY[raidsHint(item.purchasePrice, progress.bankedDuckCoin)])}
            limited={item.limited ? t('marketLimited', { n: item.limited }) : null}
            onBuy={() => buy(item.id)}
          />
        ))}
      </div>

      <button
        type="button"
        className="mt-5 min-h-12 w-full rounded-2xl border border-[#d4af58]/25 bg-[#120e0a] px-4 py-3 text-sm font-bold tracking-[0.08em] text-[#e6d3a3]"
        onClick={() => navigate('/collection')}
      >
        {t('collectionTitle')}
      </button>
    </div>
  )
}

function MarketLotCard({
  item,
  locale,
  banked,
  hero,
  buyLabel,
  needMore,
  hint,
  limited,
  onBuy,
}: {
  item: CatalogItem
  locale: 'ru' | 'en'
  banked: number
  hero: boolean
  buyLabel: string
  needMore: string
  hint: string
  limited: string | null
  onBuy: () => void
}) {
  const can = banked >= item.purchasePrice
  const kind = lotKind(item)
  return (
    <article className={`market-lot market-lot-${kind} rounded-2xl p-3 ${hero ? 'market-lot-hero' : ''}`}>
      <LotArt item={item} className={hero ? 'mb-4 aspect-[16/10] h-auto w-full' : 'mb-3 aspect-[2/1] h-auto w-full'} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[15px] font-black leading-snug text-[#f6edd4]">{item.name[locale]}</p>
          {item.artist ? <p className="mt-1 text-[10px] font-extrabold tracking-[0.14em] text-[#d4af58]/80">{item.artist[locale]}</p> : null}
          <p className="mt-1 text-[12px] leading-snug text-zinc-400">{item.blurb[locale]}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`market-stamp market-stamp-${kind}`}>{kindLabel(item)}</span>
          <span className="text-[9px] font-extrabold tracking-[0.14em] text-zinc-500">{item.rarity}</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="market-stat">
          <p className="text-[9px] font-extrabold tracking-[0.16em] text-[#d4af58]">DUCK COIN</p>
          <p className="font-display text-2xl font-black leading-none text-[#f3e2b8]">{item.purchasePrice.toLocaleString()}</p>
        </div>
        <div className="market-stat market-stat-value">
          <p className="text-[9px] font-extrabold tracking-[0.16em] text-zinc-500">COLLECTION VALUE</p>
          <p className="font-display text-2xl font-black leading-none text-[#e8dcc0]">{item.collectionValue.toLocaleString()}</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-zinc-500">{hint}</p>
      {limited ? <p className="mt-1 text-[10px] font-extrabold tracking-[0.12em] text-[#d4af58]/80">{limited}</p> : null}
      <button type="button" disabled={!can} className="lot-buy mt-3 min-h-14 w-full rounded-xl px-4 text-[15px] font-black tracking-[0.18em] text-[#1a1208] disabled:opacity-45" onClick={onBuy}>
        {can ? buyLabel : needMore}
      </button>
    </article>
  )
}
