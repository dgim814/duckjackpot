import { useI18n } from '../../i18n/LanguageProvider'
import { goalProgress, type PlayerProgress } from '../progress'
import { raidsFor } from './balance'
import { LotArt } from './LotArt'
import { collectedCount } from './sections'

/**
 * 🎯 MY GOAL — the lot the player chose to save up for. Shown on the HUB and
 * after a successful EXIT. The game never picks it: with no goal it only
 * invites the player to choose one in the Black Market.
 */
export function GoalCard({
  progress,
  gained,
  onMarket,
  onRaid,
  collection,
}: {
  progress: PlayerProgress
  /** DUCK COIN this raid added (result screen). */
  gained?: number
  onMarket: () => void
  onRaid?: () => void
  /** HUB: show the «🏆 КОЛЛЕКЦИЯ n / total» counter. */
  collection?: boolean
}) {
  const { t, lang } = useI18n()
  const g = goalProgress(progress)
  const locale = lang === 'ru' ? 'ru' : 'en'
  const fmt = (n: number) => n.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')
  const col = collectedCount(progress.ownedArt)
  const collectionLine = collection ? (
    <p className="mt-2 text-center text-[11px] font-extrabold tracking-[0.12em] text-[#d4af58]">{t('goalCollection', { n: col.n, total: col.total })}</p>
  ) : null
  if (!g) {
    return (
      <div className="goal-card mt-3 rounded-2xl p-3 text-center">
        <p className="font-display text-[15px] font-black text-amber-100">{t('bmNoGoal')}</p>
        <p className="mt-1 text-[11px] leading-snug text-zinc-400">{t('bmNoGoalSub')}</p>
        <button type="button" className="buy-btn mt-3 min-h-11 w-full rounded-xl px-4 py-2 text-sm font-black text-zinc-950" onClick={onMarket}>
          {t('bmOpen')}
        </button>
        {collectionLine}
      </div>
    )
  }
  const tier = g.item.tier ?? 'COMMON'
  return (
    <div className={`goal-card goal-tier-${tier} mt-3 rounded-2xl p-3`}>
      <p className="text-[10px] font-extrabold tracking-[0.2em] text-amber-200">{t('goalTitle')}</p>
      <div className="mt-2 flex items-center gap-3">
        <LotArt item={g.item} className="goal-art h-16 w-24 shrink-0 overflow-hidden rounded-xl" />
        <div className="min-w-0">
          <p className="font-display truncate text-[15px] font-black text-amber-50">{g.item.name[locale]}</p>
          <p className="text-[11px] font-bold text-amber-200/80">
            {fmt(g.price)} DUCK COIN · <span className={`tier-text tier-${tier}`}>{tier}</span>
          </p>
          {gained ? <p className="text-[11px] font-extrabold text-emerald-300">{t('goalGain', { n: fmt(gained) })}</p> : null}
        </div>
      </div>
      <div className="goal-bar mt-3" role="progressbar" aria-valuenow={g.pct} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: `${Math.max(2, g.pct)}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] font-bold">
        <span className="text-amber-100">
          {fmt(g.have)} / {fmt(g.price)}
        </span>
        <span className={g.reached ? 'text-emerald-300' : 'text-zinc-300'}>{g.reached ? t('bmGoalReached') : t('bmLeft', { n: fmt(g.left) })}</span>
      </div>
      {!g.reached ? <p className="mt-0.5 text-right text-[10px] text-zinc-500">{t('bmRaidsLeft', { n: raidsFor(g.left, progress.bagLevel) })}</p> : null}
      <div className={`mt-3 grid gap-2 ${onRaid ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {onRaid ? (
          <button type="button" className="buy-btn min-h-11 rounded-xl px-3 py-2 text-[13px] font-black text-zinc-950" onClick={onRaid}>
            {t('goalRaidAgain')}
          </button>
        ) : null}
        <button type="button" className="min-h-11 rounded-xl border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-[13px] font-black text-amber-100" onClick={onMarket}>
          {g.reached ? t('bmBuy') : t('bmMarketBtn')}
        </button>
      </div>
      {collectionLine}
    </div>
  )
}
