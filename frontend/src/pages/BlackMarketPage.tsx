import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import { CATALOG, type ItemRarity } from '../heist/economy/catalog'
import { heistSfx, unlockHeistSfx } from '../heist/heistSfx'
import { buyCatalogItem, loadProgress } from '../heist/progress'
import { useI18n } from '../i18n/LanguageProvider'

const TONE: Record<ItemRarity, string> = {
  COMMON: 'border-white/15 text-zinc-300',
  RARE: 'border-sky-400/40 text-sky-200',
  EPIC: 'border-violet-400/40 text-violet-200',
  LEGENDARY: 'border-amber-400/50 text-amber-200',
  MYTHIC: 'border-orange-400/60 text-orange-200',
}

export function BlackMarketPage() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [progress, setProgress] = useState(loadProgress)
  const [msg, setMsg] = useState<string | null>(null)
  const locale = lang === 'ru' ? 'ru' : 'en'
  const items = useMemo(() => [...CATALOG].sort((a, b) => a.duckCoinValue - b.duckCoinValue), [])

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
        <p className="gold-text font-display text-center text-4xl font-black leading-none">{progress.bankedDuckCoin}</p>
        <p className="mt-2 text-center text-[11px] text-zinc-500">{t('marketStarsHint')}</p>
      </div>
      {msg ? <p className="mt-3 text-center text-sm font-bold text-amber-200">{msg}</p> : null}
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-amber-400/25 bg-[#141218] px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-base font-black text-amber-50">{item.name[locale]}</p>
                <p className="mt-1 text-[12px] leading-snug text-zinc-400">{item.blurb[locale]}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-extrabold tracking-[0.14em] ${TONE[item.rarity]}`}>
                {item.rarity}
              </span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="font-mono text-sm font-bold text-amber-200">
                {item.duckCoinValue.toLocaleString()} {t('heistDuckCoin')}
              </p>
              {item.limited ? (
                <p className="text-[10px] font-extrabold tracking-[0.12em] text-orange-200/80">
                  {t('marketLimited', { n: item.limited })}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="buy-btn mt-3 min-h-12 w-full rounded-xl px-4 py-3 text-sm font-black text-zinc-950"
              onClick={() => buy(item.id)}
            >
              {t('heistBuy')}
            </button>
          </article>
        ))}
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
