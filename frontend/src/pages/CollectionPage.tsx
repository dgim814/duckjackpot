import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import { catalogItem, type ItemRarity } from '../heist/economy/catalog'
import { collectionValue, countOwned, ownedEntries } from '../heist/economy/collection'
import { boardPlace, localLeaderboard } from '../heist/economy/leaderboard'
import { loadListings, localPlayerId } from '../heist/economy/marketStore'
import { heistSfx, unlockHeistSfx } from '../heist/heistSfx'
import { listOwnedItem, loadProgress, recallListing } from '../heist/progress'
import { useI18n } from '../i18n/LanguageProvider'

const TONE: Record<ItemRarity, string> = {
  COMMON: 'text-zinc-300',
  RARE: 'text-sky-200',
  EPIC: 'text-violet-200',
  LEGENDARY: 'text-amber-200',
  MYTHIC: 'text-orange-200',
}

export function CollectionPage() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const locale = lang === 'ru' ? 'ru' : 'en'
  const [progress, setProgress] = useState(loadProgress)
  const [price, setPrice] = useState('10000')
  const [listings, setListings] = useState(loadListings)
  const you = localPlayerId()
  const entries = ownedEntries(progress.ownedArt)
  const value = collectionValue(progress.ownedArt)
  const board = useMemo(
    () => localLeaderboard(you, t('rankYou'), progress.ownedArt, progress.bankedDuckCoin),
    [progress.ownedArt, progress.bankedDuckCoin, t, you],
  )
  const place = boardPlace(board, you)
  const mine = listings.filter((row) => row.ownerId === you)

  const list = (itemId: string) => {
    unlockHeistSfx()
    const result = listOwnedItem(progress, itemId, Number(price) || 0)
    if (result.reason !== 'ok') return
    setProgress(result.next)
    setListings(loadListings())
    heistSfx.uiTap()
  }

  const recall = (id: string) => {
    unlockHeistSfx()
    const result = recallListing(progress, id)
    if (result.reason !== 'ok') return
    setProgress(result.next)
    setListings(loadListings())
    heistSfx.uiTap()
  }

  return (
    <div className="overflow-x-hidden px-4 pb-4">
      <ScreenHeader kicker={t('collectionKicker')} title={t('collectionTitle')} subtitle={t('collectionSubtitle')} />

      <section className="mt-3 rounded-2xl border border-amber-400/35 bg-[#16120c] px-3 py-3">
        <p className="text-center text-[10px] font-extrabold tracking-[0.2em] text-amber-200">{t('collectionValue')}</p>
        <p className="gold-text font-display text-center text-4xl font-black leading-none">{value.toLocaleString()}</p>
        <p className="mt-2 text-center text-[11px] text-zinc-400">
          {t('collectionCount', { n: countOwned(progress.ownedArt) })} · {t('rankPlace', { n: place })}
        </p>
      </section>

      <section className="mt-3 rounded-2xl border border-white/8 bg-[#141218] px-3 py-3">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-200">{t('rankTitle')}</h2>
        <p className="mt-1 text-[11px] text-zinc-500">{t('rankHint')}</p>
        <ul className="mt-2 space-y-1.5">
          {board.map((row, i) => (
            <li
              key={row.id}
              className={`flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 ${row.you ? 'bg-amber-400/10' : ''}`}
            >
              <span className="text-sm font-bold text-amber-50">
                {i + 1}. {row.name}
              </span>
              <span className="font-mono text-sm font-bold text-amber-200">{row.collectionValue.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-3 space-y-2">
        {entries.length === 0 ? (
          <p className="rounded-2xl border border-white/8 bg-[#141218] px-3 py-4 text-center text-sm text-zinc-500">
            {t('collectionEmpty')}
          </p>
        ) : (
          entries.map((item) => (
            <article key={item.id} className="rounded-2xl border border-amber-400/20 bg-[#141218] px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-sm font-black text-amber-50">{item.name[locale]}</p>
                  <p className={`mt-0.5 text-[10px] font-extrabold tracking-[0.14em] ${TONE[item.rarity]}`}>{item.rarity}</p>
                </div>
                <p className="font-mono text-sm font-bold text-amber-200">×{item.count}</p>
              </div>
              <p className="mt-1 text-[12px] text-zinc-500">{item.duckCoinValue.toLocaleString()} {t('heistDuckCoin')}</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric"
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-amber-50"
                  aria-label={t('marketListPrice')}
                />
                <button
                  type="button"
                  className="shrink-0 rounded-xl border border-amber-400/40 px-3 text-[11px] font-extrabold tracking-[0.1em] text-amber-100"
                  onClick={() => list(item.id)}
                >
                  {t('marketList')}
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {mine.length ? (
        <section className="mt-3 rounded-2xl border border-white/8 bg-[#141218] px-3 py-3">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-200">{t('marketMyListings')}</h2>
          <ul className="mt-2 space-y-2">
            {mine.map((row) => {
              const item = catalogItem(row.itemId)
              if (!item) return null
              return (
                <li key={row.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-amber-50">{item.name[locale]}</span>
                  <button
                    type="button"
                    className="rounded-lg border border-white/15 px-2 py-1 text-[10px] font-extrabold text-zinc-300"
                    onClick={() => recall(row.id)}
                  >
                    {t('marketRecall')}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <button
        type="button"
        className="buy-btn mt-4 min-h-12 w-full rounded-2xl px-4 py-3 font-black text-zinc-950"
        onClick={() => navigate('/market')}
      >
        {t('marketTitle')}
      </button>
    </div>
  )
}
