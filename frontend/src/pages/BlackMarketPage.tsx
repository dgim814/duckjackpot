import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import { MARKET_CATEGORIES, type ItemCategory } from '../heist/economy/catalog'
import { LotArt, RARITY_TONE } from '../heist/economy/LotArt'
import { featuredLot, raidsHint, stockByCategory } from '../heist/economy/stock'
import { heistSfx, unlockHeistSfx } from '../heist/heistSfx'
import { buyCatalogItem, loadProgress } from '../heist/progress'
import { useI18n } from '../i18n/LanguageProvider'
import type { MessageKey } from '../i18n/messages'

type Filter = 'ALL' | ItemCategory

const CAT_KEY: Record<Filter, MessageKey> = {
  ALL: 'marketCatAll',
  ART: 'marketCatArt',
  LUXURY: 'marketCatLuxury',
  INTERIOR: 'marketCatInterior',
  CARS: 'marketCatCars',
  SPECIAL: 'marketCatSpecial',
}

const HINT_KEY: Record<ReturnType<typeof raidsHint>, MessageKey> = {
  now: 'marketHintNow',
  bank: 'marketHintBank',
  mansion: 'marketHintMansion',
  more: 'marketHintMore',
}

export function BlackMarketPage() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [progress, setProgress] = useState(loadProgress)
  const [msg, setMsg] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('ALL')
  const locale = lang === 'ru' ? 'ru' : 'en'
  const featured = useMemo(() => featuredLot(), [])
  const items = useMemo(() => stockByCategory(filter), [filter])

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
    <div className="overflow-x-hidden px-4 pb-4">
      <ScreenHeader kicker={t('marketKicker')} title={t('marketTitle')} subtitle={t('marketSubtitle')} />
      <div className="mt-3 rounded-2xl border border-amber-400/35 bg-[#16120c] px-3 py-3">
        <p className="text-center text-[10px] font-extrabold tracking-[0.2em] text-amber-200">{t('heistDuckCoin')}</p>
        <p className="gold-text font-display text-center text-4xl font-black leading-none">{progress.bankedDuckCoin.toLocaleString()}</p>
        <p className="mt-2 text-center text-[11px] text-zinc-500">{t('marketStarsHint')}</p>
        <p className="mt-1 text-center text-[11px] text-zinc-500">{t('marketRaidHint')}</p>
      </div>
      {featured ? (
        <p className="mt-3 text-center text-[10px] font-extrabold tracking-[0.16em] text-amber-200/80">
          {t('marketToday')}: {featured.name[locale]}
        </p>
      ) : null}
      {msg ? <p className="mt-3 text-center text-sm font-bold text-amber-200">{msg}</p> : null}

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {(['ALL', ...MARKET_CATEGORIES] as Filter[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`min-h-11 shrink-0 rounded-full border px-3 text-[11px] font-extrabold tracking-[0.12em] ${
              filter === id ? 'border-amber-400/60 bg-amber-400/15 text-amber-100' : 'border-white/10 text-zinc-400'
            }`}
          >
            {t(CAT_KEY[id])}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        {items.map((item) => {
          const can = progress.bankedDuckCoin >= item.purchasePrice
          const hint = raidsHint(item.purchasePrice, progress.bankedDuckCoin)
          return (
            <article key={item.id} className={`lot-card rounded-2xl border bg-[#141218] p-3 ${RARITY_TONE[item.rarity]}`}>
              <LotArt item={item} className="mb-3 h-28 w-full" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-base font-black text-amber-50">{item.name[locale]}</p>
                  <p className="mt-1 text-[12px] leading-snug text-zinc-400">{item.blurb[locale]}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-extrabold tracking-[0.14em] ${RARITY_TONE[item.rarity]}`}>
                  {item.rarity}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <p className="font-extrabold tracking-[0.12em] text-zinc-500">{t('marketBuyPrice')}</p>
                  <p className="font-mono text-sm font-bold text-amber-200">{item.purchasePrice.toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-extrabold tracking-[0.12em] text-zinc-500">{t('collectionValue')}</p>
                  <p className="font-mono text-sm font-bold text-amber-100">{item.collectionValue.toLocaleString()}</p>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">{t(HINT_KEY[hint])}</p>
              {item.limited ? (
                <p className="mt-1 text-[10px] font-extrabold tracking-[0.12em] text-orange-200/80">
                  {t('marketLimited', { n: item.limited })}
                </p>
              ) : null}
              <button
                type="button"
                disabled={!can}
                className="buy-btn mt-3 min-h-12 w-full rounded-xl px-4 py-3 text-sm font-black text-zinc-950 disabled:opacity-45"
                onClick={() => buy(item.id)}
              >
                {can ? t('heistBuy') : t('marketNeedMore', { n: item.purchasePrice - progress.bankedDuckCoin })}
              </button>
            </article>
          )
        })}
      </div>
      <button
        type="button"
        className="mt-4 min-h-12 w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-zinc-200"
        onClick={() => navigate('/collection')}
      >
        {t('collectionTitle')}
      </button>
    </div>
  )
}
