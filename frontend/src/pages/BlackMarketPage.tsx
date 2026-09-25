import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import type { CatalogItem } from '../heist/economy/catalog'
import { LotArt } from '../heist/economy/LotArt'
import { featuredLot, raidsHint, stockByCategory, type MarketFilter } from '../heist/economy/stock'
import { heistSfx, unlockHeistSfx } from '../heist/heistSfx'
import { buyCatalogItem, loadProgress, sellValuable, subscribeGameplayReset, type Valuable } from '../heist/progress'
import { raidsFor, type Tier } from '../heist/economy/balance'
import { useI18n } from '../i18n/LanguageProvider'
import type { MessageKey } from '../i18n/messages'

type Filter = 'ALL' | 'ART' | 'LUXURY' | 'CARS' | 'RARE'

const FILTERS: Filter[] = ['ALL', 'ART', 'LUXURY', 'CARS', 'RARE']

const CAT_KEY: Record<Filter, MessageKey> = {
  ALL: 'marketCatAll',
  ART: 'marketCatArt',
  LUXURY: 'marketCatLuxury',
  CARS: 'marketCatCars',
  RARE: 'marketCatRare',
}

const HINT_KEY: Record<ReturnType<typeof raidsHint>, MessageKey> = {
  now: 'marketHintNow',
  bank: 'marketHintBank',
  mansion: 'marketHintMansion',
  more: 'marketHintMore',
}

/** One colour per display tier, COMMON → MASTERPIECE. */
const TIER_COLOR: Record<Tier, string> = {
  COMMON: '#b8b2a4',
  RARE: '#6ec8ff',
  EPIC: '#c58bff',
  LEGENDARY: '#ffb347',
  MASTERPIECE: '#ffd65a',
}

const VALUABLE_ICON: Record<Valuable['kind'], string> = { watch: '⌚', jewel: '💎', art: '🖼️', relic: '🏺', crown: '👑' }
const VALUABLE_NAME: Record<Valuable['kind'], MessageKey> = {
  watch: 'heistValWatch',
  jewel: 'heistValJewel',
  art: 'heistValArt',
  relic: 'heistValRelic',
  crown: 'heistValCrown',
}

function lotKind(item: CatalogItem) {
  if (item.category === 'ART') return 'art'
  if (item.category === 'CARS') return 'rare'
  if (item.category === 'LUXURY' || item.rarity === 'LUX') return 'lux'
  if (item.rarity === 'RARE' || item.rarity === 'EPIC' || item.rarity === 'LEGENDARY' || item.rarity === 'ICONIC') return 'rare'
  return 'rest'
}

function kindLabel(item: CatalogItem) {
  if (item.category === 'ART') return 'ART'
  if (item.category === 'CARS') return 'CARS'
  if (item.category === 'LUXURY' || item.rarity === 'LUX') return 'LUX'
  if (item.rarity === 'RARE' || item.rarity === 'EPIC' || item.rarity === 'LEGENDARY' || item.rarity === 'ICONIC') return 'RARE'
  // Plain lots: show the category, the tier badge next to it carries the rarity.
  return item.category
}

export function BlackMarketPage() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [progress, setProgress] = useState(loadProgress)
  useEffect(() => subscribeGameplayReset(() => setProgress(loadProgress())), [])
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
    const item = items.find((i) => i.id === id)
    setMsg(t('marketBoughtCoins', { n: (item?.purchasePrice ?? 0).toLocaleString() }))
    heistSfx.purchase()
  }

  const sell = (v: Valuable) => {
    unlockHeistSfx()
    const res = sellValuable(v.id)
    if (!res.ok) return
    setProgress(res.next)
    setMsg(t('marketFenceSold', { n: res.coins.toLocaleString() }))
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
        <p className="mt-2 text-center text-[10px] font-extrabold tracking-[0.12em] text-[#d4af58]/80">{t('marketTierHint')}</p>
      </section>

      <section className="mt-4 rounded-2xl border border-[#d4af58]/30 bg-[#120e0a] p-3">
        <p className="text-center text-[11px] font-extrabold tracking-[0.22em] text-[#d4af58]">{t('marketFenceTitle')}</p>
        <p className="mt-1 text-center text-[11px] text-zinc-500">{t('marketFenceHint')}</p>
        {progress.valuables.length === 0 ? (
          <p className="mt-2 text-center text-[11px] text-zinc-500">{t('marketFenceEmpty')}</p>
        ) : (
          <div className="mt-2 space-y-2">
            {progress.valuables.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <span className="text-[13px] font-bold text-[#f6edd4]">
                  {VALUABLE_ICON[v.kind]} {t(VALUABLE_NAME[v.kind])}
                </span>
                <button type="button" className="lot-buy min-h-11 shrink-0 rounded-xl px-3 text-[13px] font-black text-[#1a1208]" onClick={() => sell(v)}>
                  {t('marketFenceSell', { n: v.value.toLocaleString() })}
                </button>
              </div>
            ))}
          </div>
        )}
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
            hint={
              progress.bankedDuckCoin >= item.purchasePrice
                ? t(HINT_KEY[raidsHint(item.purchasePrice, progress.bankedDuckCoin)])
                : t('marketRaidsN', { n: raidsFor(item.purchasePrice - progress.bankedDuckCoin, progress.bagLevel) })
            }
            limited={item.limited ? t('marketLimited', { n: item.limited }) : null}
            factLabel={t('marketFact')}
            whyLabel={t('marketWhy')}
            engineLabel={t('marketEngine')}
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
  factLabel,
  whyLabel,
  engineLabel,
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
  factLabel: string
  whyLabel: string
  engineLabel: string
  onBuy: () => void
}) {
  const can = banked >= item.purchasePrice
  const kind = lotKind(item)
  const maker = item.maker?.[locale] ?? item.artist?.[locale]
  return (
    <article className={`market-lot market-lot-${kind} rounded-2xl p-3 ${hero ? 'market-lot-hero' : ''}`}>
      <LotArt item={item} className={hero ? 'mb-4 aspect-[16/10] h-auto w-full' : 'mb-3 aspect-[2/1] h-auto w-full'} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[15px] font-black leading-snug text-[#f6edd4]">{item.name[locale]}</p>
          {maker ? <p className="mt-1 text-[10px] font-extrabold tracking-[0.12em] text-[#d4af58]/80">{maker}</p> : null}
          {item.year ? <p className="mt-0.5 text-[10px] tracking-[0.08em] text-zinc-500">{item.year[locale]}</p> : null}
          <p className="mt-1 text-[12px] leading-snug text-zinc-400">{item.blurb[locale]}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`market-stamp market-stamp-${kind}`}>{kindLabel(item)}</span>
          <span className="rounded-full border px-2 py-0.5 text-[9px] font-extrabold tracking-[0.14em]" style={{ color: TIER_COLOR[item.tier ?? 'COMMON'], borderColor: `${TIER_COLOR[item.tier ?? 'COMMON']}88` }}>
            {item.tier ?? item.rarity}
          </span>
        </div>
      </div>
      {item.engine ? (
        <p className="mt-2 text-[11px] text-zinc-400">
          <span className="font-extrabold tracking-[0.12em] text-[#d4af58]">{engineLabel}</span> {item.engine[locale]}
        </p>
      ) : null}
      {item.fact ? (
        <p className="mt-2 text-[11px] leading-snug text-[#e6d3a3]/90">
          <span className="font-extrabold tracking-[0.12em] text-[#d4af58]">{factLabel}</span> {item.fact[locale]}
        </p>
      ) : null}
      {item.significance ? (
        <p className="mt-1 text-[11px] leading-snug text-zinc-500">
          <span className="font-extrabold tracking-[0.12em] text-zinc-400">{whyLabel}</span> {item.significance[locale]}
        </p>
      ) : null}
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
