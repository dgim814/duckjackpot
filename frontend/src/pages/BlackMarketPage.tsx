import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import type { CatalogItem } from '../heist/economy/catalog'
import { LotArt } from '../heist/economy/LotArt'
import { raidsFor, type Tier } from '../heist/economy/balance'
import { SECTIONS, TIER_RANK, collectedCount, marketItems, sectionItems, type SectionId } from '../heist/economy/sections'
import { heistSfx, unlockHeistSfx } from '../heist/heistSfx'
import {
  buyCatalogItem,
  goalProgress,
  loadProgress,
  sellValuable,
  setMyGoal,
  subscribeGameplayReset,
  type PlayerProgress,
  type Valuable,
} from '../heist/progress'
import { useI18n } from '../i18n/LanguageProvider'
import type { MessageKey } from '../i18n/messages'

type Filter = 'ALL' | 'AVAILABLE' | 'GOAL' | 'OWNED'
type Sort = 'LOW' | 'HIGH' | 'RARITY'
const PAGE = 12

const FILTERS: { id: Filter; key: MessageKey }[] = [
  { id: 'ALL', key: 'bmFilterAll' },
  { id: 'AVAILABLE', key: 'bmFilterAvailable' },
  { id: 'GOAL', key: 'bmFilterGoal' },
  { id: 'OWNED', key: 'bmFilterOwned' },
]
const SORTS: { id: Sort; key: MessageKey }[] = [
  { id: 'LOW', key: 'bmSortLow' },
  { id: 'HIGH', key: 'bmSortHigh' },
  { id: 'RARITY', key: 'bmSortRarity' },
]

/** One colour per display tier, COMMON → MASTERPIECE. */
export const TIER_COLOR: Record<Tier, string> = {
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

function owned(p: PlayerProgress, id: string) {
  return Math.max(0, Math.floor(p.ownedArt?.[id] ?? 0))
}

function TierBadge({ tier }: { tier: Tier }) {
  const c = TIER_COLOR[tier]
  return (
    <span className={`tier-badge tier-badge-${tier}`} style={{ color: c, borderColor: `${c}99` }}>
      {tier}
    </span>
  )
}

const SECTION_DESC: Record<SectionId, MessageKey> = {
  WATCHES: 'bmSecDescWatches',
  JEWELRY: 'bmSecDescJewelry',
  ART: 'bmSecDescArt',
  ANTIQUES: 'bmSecDescAntiques',
  COLLECTIBLES: 'bmSecDescCollectibles',
  RARE: 'bmSecDescRare',
  MASTERPIECES: 'bmSecDescMasterpieces',
}

/** «1 предмет / 2 предмета / 5 предметов». */
function pluralKey(n: number, lang: string): MessageKey {
  if (lang !== 'ru') return n === 1 ? 'bmItems1' : 'bmItems5'
  const d = n % 10
  const h = n % 100
  if (d === 1 && h !== 11) return 'bmItems1'
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'bmItems2'
  return 'bmItems5'
}

export function BlackMarketPage() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const locale = lang === 'ru' ? 'ru' : 'en'
  const fmt = (n: number) => n.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')
  const [progress, setProgress] = useState(loadProgress)
  useEffect(() => subscribeGameplayReset(() => setProgress(loadProgress())), [])
  const [msg, setMsg] = useState<string | null>(null)
  const goal = goalProgress(progress)
  const startSection = (): SectionId => {
    const g = goal?.item
    return (g && SECTIONS.find((s) => s.id !== 'MASTERPIECES' && s.match(g))?.id) || 'WATCHES'
  }
  const [section, setSection] = useState<SectionId>(startSection)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [sort, setSort] = useState<Sort>('LOW')
  const [shown, setShown] = useState(PAGE)
  const [open, setOpen] = useState<CatalogItem | null>(null)
  const [done, setDone] = useState<{ item: CatalogItem; goalReached: boolean } | null>(null)

  // HUB "КУПИТЬ" on a reached goal opens that lot straight away.
  useEffect(() => {
    const want = (location.state as { open?: string } | null)?.open
    if (!want) return
    const item = marketItems().find((i) => i.id === want)
    if (item) setOpen(item)
  }, [location.state])

  const items = useMemo(() => {
    let list = sectionItems(section)
    if (filter === 'AVAILABLE') list = list.filter((i) => progress.bankedDuckCoin >= i.purchasePrice && owned(progress, i.id) === 0)
    if (filter === 'GOAL') list = list.filter((i) => i.id === progress.myGoalId)
    if (filter === 'OWNED') list = list.filter((i) => owned(progress, i.id) > 0)
    const byPrice = (a: CatalogItem, b: CatalogItem) => a.purchasePrice - b.purchasePrice
    if (sort === 'LOW') list = [...list].sort(byPrice)
    if (sort === 'HIGH') list = [...list].sort((a, b) => byPrice(b, a))
    if (sort === 'RARITY') list = [...list].sort((a, b) => TIER_RANK[b.tier ?? 'COMMON'] - TIER_RANK[a.tier ?? 'COMMON'] || byPrice(b, a))
    return list
  }, [section, filter, sort, progress])

  useEffect(() => setShown(PAGE), [section, filter, sort])

  const chooseGoal = (item: CatalogItem) => {
    unlockHeistSfx()
    heistSfx.uiTap()
    setProgress(setMyGoal(item.id))
    setMsg(t('bmGoalChanged', { name: item.name[locale] }))
  }

  const buy = (item: CatalogItem) => {
    unlockHeistSfx()
    const result = buyCatalogItem(progress, item.id)
    if (result.reason === 'poor') {
      setMsg(t('bmNeedMore', { n: fmt(item.purchasePrice - progress.bankedDuckCoin) }))
      return
    }
    if (!result.ok) return
    setProgress(result.next)
    setDone({ item, goalReached: result.goalReached })
    setMsg(t('bmBoughtSub', { name: item.name[locale], n: fmt(item.purchasePrice) }))
    heistSfx.purchase()
  }

  const sell = (v: Valuable) => {
    unlockHeistSfx()
    const res = sellValuable(v.id)
    if (!res.ok) return
    setProgress(res.next)
    setMsg(t('marketFenceSold', { n: fmt(res.coins) }))
    heistSfx.purchase()
  }

  const collected = collectedCount(progress.ownedArt)
  const sec = SECTIONS.find((x) => x.id === section) ?? SECTIONS[0]
  const secAll = sectionItems(section)
  const secOwned = secAll.filter((i) => owned(progress, i.id) > 0).length
  const vip = section === 'MASTERPIECES'
  const visible = Math.min(shown, items.length)
  const itemsWord = (n: number) => t(pluralKey(n, lang))

  const pickSection = (id: SectionId) => {
    setSection(id)
    requestAnimationFrame(() => document.getElementById(`bm-sec-${id}`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }))
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

      <section className="market-vault mt-4 grid grid-cols-2 gap-3 rounded-2xl px-3 py-3">
        <div className="text-center">
          <p className="text-[10px] font-extrabold tracking-[0.2em] text-[#d4af58]">💰 {t('heistDuckCoin')}</p>
          <p className="market-gold font-display text-[1.9rem] font-black leading-tight">{fmt(progress.bankedDuckCoin)}</p>
        </div>
        <div className="border-l border-[#d4af58]/20 text-center">
          <p className="text-[10px] font-extrabold tracking-[0.2em] text-[#d4af58]">{t('bmCollection')}</p>
          <p className="font-display text-[1.9rem] font-black leading-tight text-[#f3e2b8]">
            {collected.n}
            <span className="text-base text-zinc-500"> / {collected.total}</span>
          </p>
          <div className="goal-bar goal-bar-thin mx-2 mt-1">
            <i style={{ width: `${Math.max(2, (collected.n / collected.total) * 100)}%` }} />
          </div>
        </div>
        <p className="col-span-2 text-center text-[11px] leading-snug text-zinc-500">{t('marketStarsHint')}</p>
      </section>

      {/* 🎯 the player's own goal — or an invitation to choose one */}
      {goal ? (
        <div className={`goal-card goal-tier-${goal.item.tier} mt-3 rounded-2xl p-3`}>
          <p className="text-[10px] font-extrabold tracking-[0.2em] text-amber-200">{t('bmCurrentGoal')}</p>
          <button type="button" className="mt-2 flex w-full items-center gap-3 text-left" onClick={() => setOpen(goal.item)}>
            <LotArt item={goal.item} className="goal-art h-14 w-20 shrink-0 overflow-hidden rounded-xl" />
            <span className="min-w-0 flex-1">
              <span className="font-display block truncate text-[15px] font-black text-amber-50">{goal.item.name[locale]}</span>
              <span className="block text-[12px] font-bold text-amber-100">
                {fmt(goal.have)} / {fmt(goal.price)}
              </span>
            </span>
          </button>
          <div className="goal-bar mt-2">
            <i style={{ width: `${Math.max(2, goal.pct)}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className={`text-[12px] font-extrabold ${goal.reached ? 'text-emerald-300' : 'text-amber-200'}`}>
              {goal.reached ? t('bmGoalReached') : t('bmLeft', { n: fmt(goal.left) })}
            </span>
            <button
              type="button"
              className="bm-chip min-h-9 shrink-0 rounded-full px-3 text-[11px] font-extrabold tracking-[0.08em]"
              onClick={() => document.getElementById('bm-cats')?.scrollIntoView({ block: 'start', behavior: 'smooth' })}
            >
              {t('bmChangeGoal')}
            </button>
          </div>
        </div>
      ) : (
        <div className="goal-card mt-3 rounded-2xl p-3 text-center">
          <p className="font-display text-[15px] font-black text-amber-100">{t('bmNoGoal')}</p>
          <p className="mt-1 text-[11px] leading-snug text-zinc-400">{t('bmNoGoalSub')}</p>
        </div>
      )}

      {msg ? <p className="mt-3 text-center text-sm font-bold text-[#e6d3a3]">{msg}</p> : null}

      {progress.valuables.length > 0 ? (
        <section className="mt-4 rounded-2xl border border-[#d4af58]/30 bg-[#120e0a] p-3">
          <p className="text-center text-[11px] font-extrabold tracking-[0.22em] text-[#d4af58]">{t('marketFenceTitle')}</p>
          <p className="mt-1 text-center text-[11px] text-zinc-500">{t('marketFenceHint')}</p>
          <div className="mt-2 space-y-2">
            {progress.valuables.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <span className="text-[13px] font-bold text-[#f6edd4]">
                  {VALUABLE_ICON[v.kind]} {t(VALUABLE_NAME[v.kind])}
                </span>
                <button type="button" className="lot-buy min-h-11 shrink-0 rounded-xl px-3 text-[13px] font-black text-[#1a1208]" onClick={() => sell(v)}>
                  {t('marketFenceSell', { n: fmt(v.value) })}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <p id="bm-cats" className="mt-5 scroll-mt-24 text-[10px] font-extrabold tracking-[0.22em] text-[#d4af58]">
        {t('bmSectionsTitle')} · {marketItems().length} {itemsWord(marketItems().length)}
      </p>
      <div className="bm-cat-row -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-2">
        {SECTIONS.map((x) => (
          <button
            key={x.id}
            id={`bm-sec-${x.id}`}
            type="button"
            onClick={() => pickSection(x.id)}
            className={`bm-section bm-cat shrink-0 rounded-2xl px-3 py-2 text-left ${section === x.id ? 'is-on' : ''} ${x.id === 'MASTERPIECES' ? 'bm-cat-vip' : ''}`}
          >
            <span className="flex items-center gap-2">
              <span className="text-xl leading-none">{x.icon}</span>
              <span>
                <span className="block text-[10px] font-extrabold tracking-[0.08em]">{t(x.name)}</span>
                <span className="block text-[11px] font-black text-[#f3e2b8]">{sectionItems(x.id).length}</span>
              </span>
            </span>
          </button>
        ))}
      </div>

      <section className={`bm-sec-head mt-2 rounded-2xl p-3 ${vip ? 'bm-sec-head-vip' : ''}`}>
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-[20px] font-black tracking-[0.06em] text-[#f3e2b8]">
            {vip ? t('bmVipTitle') : `${sec.icon} ${t(sec.name)}`}
          </p>
          <p className="shrink-0 text-[12px] font-extrabold text-[#d4af58]">
            {secAll.length} {itemsWord(secAll.length)}
          </p>
        </div>
        <p className="mt-1 text-[12px] leading-snug text-zinc-400">{t(SECTION_DESC[section])}</p>
        <p className="mt-1 text-[11px] font-bold text-emerald-300/80">{t('bmSecOwned', { n: secOwned, total: secAll.length })}</p>
      </section>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)} className={`bm-chip min-h-10 shrink-0 rounded-full px-3 text-[11px] font-extrabold tracking-[0.1em] ${filter === f.id ? 'is-on' : ''}`}>
            {t(f.key)}
          </button>
        ))}
        {SORTS.map((x) => (
          <button key={x.id} type="button" onClick={() => setSort(x.id)} className={`bm-chip bm-chip-sort min-h-10 shrink-0 rounded-full px-3 text-[11px] font-extrabold tracking-[0.1em] ${sort === x.id ? 'is-on' : ''}`}>
            {t(x.key)}
          </button>
        ))}
      </div>
      {filter !== 'ALL' ? <p className="mt-2 text-[11px] text-zinc-500">{t('bmItemsN', { n: items.length })}</p> : null}

      <div className="mt-3 space-y-3">
        {items.length === 0 ? <p className="py-6 text-center text-sm text-zinc-500">{t('bmEmpty')}</p> : null}
        {items.slice(0, shown).map((item) => (
          <LotCard
            key={item.id}
            item={item}
            vip={vip}
            progress={progress}
            locale={locale}
            fmt={fmt}
            onOpen={() => setOpen(item)}
            onGoal={() => chooseGoal(item)}
            onBuy={() => {
              setOpen(item)
              buy(item)
            }}
          />
        ))}
      </div>
      {items.length > shown ? (
        <button type="button" className="bm-more mt-3 w-full rounded-2xl px-3 py-3 text-left" onClick={() => setShown((n) => n + PAGE)}>
          <span className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-extrabold tracking-[0.08em] text-[#f3e2b8]">{t('bmMoreOf', { shown: visible, total: items.length })}</span>
            <span className="text-lg text-[#d4af58]">↓</span>
          </span>
          <span className="mt-2 flex gap-1.5" aria-hidden>
            {items.slice(shown, shown + 4).map((it) => (
              <LotArt key={it.id} item={it} className="bm-peek h-10 w-14 shrink-0 overflow-hidden rounded-lg" />
            ))}
            {items.length - shown > 4 ? <span className="bm-peek-more flex h-10 items-center rounded-lg px-2 text-[11px] font-black text-[#d4af58]">+{items.length - shown - 4}</span> : null}
          </span>
        </button>
      ) : items.length > 0 ? (
        <p className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 py-3 text-center text-[12px] font-extrabold tracking-[0.08em] text-emerald-200/90">
          {t('bmAllShown', { total: items.length })}
        </p>
      ) : null}

      <button
        type="button"
        className="mt-5 min-h-12 w-full rounded-2xl border border-[#d4af58]/25 bg-[#120e0a] px-4 py-3 text-sm font-bold tracking-[0.08em] text-[#e6d3a3]"
        onClick={() => navigate('/collection')}
      >
        {t('collectionTitle')}
      </button>

      {open ? (
        <LotSheet
          item={open}
          progress={progress}
          locale={locale}
          fmt={fmt}
          done={done?.item.id === open.id ? done : null}
          onGoal={() => chooseGoal(open)}
          onClearGoal={() => setProgress(setMyGoal(null))}
          onBuy={() => buy(open)}
          onNewGoal={() => {
            setOpen(null)
            setDone(null)
            setFilter('ALL')
          }}
          onClose={() => {
            setOpen(null)
            setDone(null)
          }}
        />
      ) : null}
    </div>
  )
}

function statusOf(item: CatalogItem, p: PlayerProgress) {
  const n = owned(p, item.id)
  return { n, isGoal: p.myGoalId === item.id, can: p.bankedDuckCoin >= item.purchasePrice }
}

/** Shelf card: compact row (image left) — or the larger VIP frame in MASTERPIECES. */
function LotCard({
  item,
  vip,
  progress,
  locale,
  fmt,
  onOpen,
  onGoal,
  onBuy,
}: {
  item: CatalogItem
  vip?: boolean
  progress: PlayerProgress
  locale: 'ru' | 'en'
  fmt: (n: number) => string
  onOpen: () => void
  onGoal: () => void
  onBuy: () => void
}) {
  const { t } = useI18n()
  const s = statusOf(item, progress)
  const tier = item.tier ?? 'COMMON'
  const pct = Math.min(100, Math.floor((progress.bankedDuckCoin / item.purchasePrice) * 100))
  const badges = (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {vip ? <span className="bm-vip-badge">{t('bmVipBadge')}</span> : <TierBadge tier={tier} />}
      {s.n > 0 ? <span className="bm-status bm-status-owned">{s.n > 1 ? t('bmOwnedN', { n: s.n }) : t('bmOwned')}</span> : null}
      {s.isGoal ? <span className="bm-status bm-status-goal">{t('bmGoalBadge')}</span> : null}
      {!s.n && !s.isGoal && s.can ? <span className="bm-status bm-status-can">{t('bmAvailable')}</span> : null}
      {item.fictional ? <span className="bm-status bm-status-lore">{t('bmFictionalShort')}</span> : null}
    </div>
  )
  const price = (
    <p className={`mt-1 font-display font-black text-[#f3e2b8] ${vip ? 'text-[22px]' : 'text-[17px]'}`}>
      {fmt(item.purchasePrice)} <span className="text-[9px] tracking-[0.14em] text-[#d4af58]">DUCK COIN</span>
    </p>
  )
  return (
    <article className={`bm-card bm-card-${tier} ${vip ? 'bm-card-vip p-3.5' : 'p-3'} rounded-2xl ${s.isGoal ? 'is-goal' : ''}`}>
      {vip ? (
        <button type="button" className="block w-full text-left" onClick={onOpen}>
          <div className="bm-vip-frame">
            <LotArt item={item} size="detail" className="bm-card-art aspect-[16/9] w-full overflow-hidden" />
          </div>
          <p className="font-display mt-3 text-[17px] font-black leading-snug text-[#f6edd4]">{item.name[locale]}</p>
          {item.maker ? <p className="mt-0.5 truncate text-[11px] font-extrabold tracking-[0.08em] text-[#d4af58]/80">{item.maker[locale]}</p> : null}
          {badges}
          {price}
        </button>
      ) : (
        <button type="button" className="flex w-full gap-3 text-left" onClick={onOpen}>
          <LotArt item={item} className="bm-card-art h-[76px] w-[96px] shrink-0 overflow-hidden rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[14px] font-black leading-snug text-[#f6edd4]">{item.name[locale]}</p>
            {item.maker ? <p className="mt-0.5 truncate text-[10px] font-extrabold tracking-[0.08em] text-[#d4af58]/80">{item.maker[locale]}</p> : null}
            {badges}
            {price}
          </div>
        </button>
      )}
      {!s.can ? (
        <div className="goal-bar goal-bar-thin mt-2">
          <i style={{ width: `${Math.max(2, pct)}%` }} />
        </div>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className="bm-chip min-h-11 rounded-xl text-[12px] font-extrabold tracking-[0.08em]" onClick={onOpen}>
          {t('bmDetails')}
        </button>
        {s.can ? (
          <button type="button" className="lot-buy min-h-11 rounded-xl text-[13px] font-black text-[#1a1208]" onClick={onBuy}>
            {s.n > 0 ? t('bmBuyAgain') : t('bmBuy')}
          </button>
        ) : s.isGoal ? (
          <button type="button" className="bm-chip is-on min-h-11 rounded-xl text-[12px] font-extrabold" disabled>
            {t('bmGoalSet')}
          </button>
        ) : (
          <button type="button" className="bm-goal-btn min-h-11 rounded-xl text-[12px] font-black" onClick={onGoal}>
            {t('bmSetGoal')}
          </button>
        )}
      </div>
    </article>
  )
}

/** The educational lot sheet: image → name → rarity → price → short → did you know → why valuable → history → goal progress → action. */
function LotSheet({
  item,
  progress,
  locale,
  fmt,
  done,
  onGoal,
  onClearGoal,
  onBuy,
  onNewGoal,
  onClose,
}: {
  item: CatalogItem
  progress: PlayerProgress
  locale: 'ru' | 'en'
  fmt: (n: number) => string
  done: { item: CatalogItem; goalReached: boolean } | null
  onGoal: () => void
  onClearGoal: () => void
  onBuy: () => void
  onNewGoal: () => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const s = statusOf(item, progress)
  const tier = item.tier ?? 'COMMON'
  const have = progress.bankedDuckCoin
  const pct = Math.min(100, Math.floor((have / item.purchasePrice) * 100))
  const left = Math.max(0, item.purchasePrice - have)
  return (
    <div className="bm-sheet-layer" role="dialog" aria-modal="true" aria-label={item.name[locale]}>
      <div className="bm-sheet-scroll">
        <div className={`bm-sheet bm-card-${tier} rounded-3xl p-4`}>
          <LotArt item={item} size="detail" className={`${tier === 'MASTERPIECE' ? 'bm-vip-frame' : ''} aspect-[16/10] h-auto w-full overflow-hidden rounded-2xl`} />
          <p className="font-display mt-3 text-xl font-black leading-tight text-[#f6edd4]">{item.name[locale]}</p>
          {item.maker ? <p className="mt-0.5 text-[11px] font-extrabold tracking-[0.08em] text-[#d4af58]/80">{item.maker[locale]}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TierBadge tier={tier} />
            <span className={`bm-status ${item.fictional ? 'bm-status-lore' : 'bm-status-real'}`}>{item.fictional ? t('bmFictional') : t('bmReal')}</span>
          </div>
          <p className="mt-2 font-display text-2xl font-black text-[#f3e2b8]">
            {fmt(item.purchasePrice)} <span className="text-[11px] tracking-[0.14em] text-[#d4af58]">DUCK COIN</span>
          </p>
          <div className="bm-block mt-3">
            <p className="bm-block-title">{t('bmShort')}</p>
            <p>{item.blurb[locale]}</p>
          </div>
          {item.fact ? (
            <div className="bm-block mt-2">
              <p className="bm-block-title">{t('bmDidYouKnow')}</p>
              <p>{item.fact[locale]}</p>
            </div>
          ) : null}
          {item.significance ? (
            <div className="bm-block mt-2">
              <p className="bm-block-title">{t('bmWhyValuable')}</p>
              <p>{item.significance[locale]}</p>
            </div>
          ) : null}
          <div className="bm-block mt-2">
            <p className="bm-block-title">{t('bmHistory')}</p>
            {item.maker && item.year ? <p className="text-[11px] font-bold text-[#d4af58]">{t('bmMakerYear', { maker: item.maker[locale], year: item.year[locale] })}</p> : null}
            {item.history ? <p className="mt-1">{item.history[locale]}</p> : null}
            {item.engine ? <p className="mt-1 text-zinc-400">{item.engine[locale]}</p> : null}
            {!item.fictional ? <p className="mt-2 text-[11px] text-zinc-500">{t('bmRealNote')}</p> : null}
          </div>

          {done ? null : (
          <div className="bm-block mt-3">
            <p className="bm-block-title">{s.isGoal ? t('bmMyGoalTitle') : t('bmYourProgress')}</p>
            <div className="goal-bar mt-1">
              <i style={{ width: `${Math.max(2, pct)}%` }} />
            </div>
            <p className="mt-1 flex justify-between text-[12px] font-bold">
              <span>
                {fmt(Math.min(have, item.purchasePrice))} / {fmt(item.purchasePrice)}
              </span>
              <span className={s.can ? 'text-emerald-300' : 'text-zinc-400'}>{s.can ? (s.isGoal ? t('bmGoalReached') : t('bmAvailable')) : t('bmLeft', { n: fmt(left) })}</span>
            </p>
            {!s.can ? <p className="mt-0.5 text-[11px] text-zinc-500">{t('bmRaidsLeft', { n: raidsFor(left, progress.bagLevel) })}</p> : null}
          </div>
          )}

          {done ? (
            <div className="mt-3 rounded-2xl border border-emerald-400/50 bg-emerald-400/10 p-3 text-center">
              {done.goalReached ? <p className="font-display text-lg font-black text-emerald-200">{t('bmGoalReached')}</p> : null}
              <p className="font-display text-base font-black text-emerald-100">{t('bmBought')}</p>
              <button type="button" className="bm-goal-btn mt-3 min-h-12 w-full rounded-xl text-sm font-black" onClick={onNewGoal}>
                {t('bmPickNewGoal')}
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {s.can ? (
                <button type="button" className="lot-buy min-h-14 w-full rounded-xl text-[15px] font-black tracking-[0.12em] text-[#1a1208]" onClick={onBuy}>
                  {s.n > 0 ? t('bmBuyAgain') : t('bmBuy')}
                </button>
              ) : null}
              {s.isGoal ? (
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="bm-chip is-on min-h-12 rounded-xl text-[12px] font-extrabold" disabled>
                    {t('bmGoalSet')}
                  </button>
                  <button type="button" className="bm-chip min-h-12 rounded-xl text-[12px] font-extrabold" onClick={onClearGoal}>
                    {t('bmClearGoal')}
                  </button>
                </div>
              ) : (
                <button type="button" className="bm-goal-btn min-h-12 w-full rounded-xl text-[14px] font-black" onClick={onGoal}>
                  {t('bmSetGoal')}
                </button>
              )}
            </div>
          )}
          <button type="button" className="mt-3 min-h-11 w-full rounded-xl border border-white/15 text-[13px] font-bold text-zinc-300" onClick={onClose}>
            {t('bmClose')}
          </button>
        </div>
      </div>
      <button type="button" className="bm-sheet-x" onClick={onClose} aria-label={t('bmClose')}>
        ✕
      </button>
    </div>
  )
}
