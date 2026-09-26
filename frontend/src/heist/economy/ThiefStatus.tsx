import { useI18n } from '../../i18n/LanguageProvider'
import { THIEF_BOARD_ONLINE, thiefWealth } from './leaderboard'

/**
 * 💰 Thief's fortune + 🏆 ranking. Wealth is BANK + collection value (DUCK COIN only);
 * no invented places or rivals while the online board is not live.
 */
export function ThiefStatus({ progress, compact = false }: { progress: { bankedDuckCoin: number; ownedArt?: Record<string, number> }; compact?: boolean }) {
  const { t, lang } = useI18n()
  const fmt = (n: number) => n.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')
  const w = thiefWealth(progress)
  return (
    <section className="thief-status mt-3 rounded-2xl border border-amber-400/35 bg-gradient-to-b from-amber-400/10 to-transparent p-3 text-left">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <p className="whitespace-nowrap text-[10px] font-extrabold tracking-[0.14em] text-amber-200">{t('wealthTitle')}</p>
        <p className="ml-auto whitespace-nowrap font-display text-lg font-black text-amber-100">
          {fmt(w.total)} <span className="text-[9px] tracking-[0.1em] text-amber-300/80">DUCK COIN</span>
        </p>
      </div>
      <p className="mt-0.5 text-[11px] text-zinc-400">{t('wealthLine', { bank: fmt(w.bank), collection: fmt(w.collection) })}</p>
      {!compact ? (
        <div className="mt-2 border-t border-white/8 pt-2">
          <p className="text-[10px] font-extrabold tracking-[0.18em] text-amber-200">{t('rateTitle')}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-zinc-300">{t('rateText')}</p>
          {!THIEF_BOARD_ONLINE ? <p className="mt-1 text-[10px] leading-snug text-zinc-500">{t('rateSoon')}</p> : null}
        </div>
      ) : null}
    </section>
  )
}
