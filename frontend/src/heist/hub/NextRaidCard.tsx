import { useI18n } from '../../i18n/LanguageProvider'
import { bankCollectedPotential, bankTotalPotential, BANK_ZONE_COUNT } from '../phaser/bankLayout'
import { heistLevelCards } from '../heistLevel'
import { isMansionUnlocked, type PlayerProgress } from '../progress'

export function NextRaidCard({ progress, onPlay }: { progress: PlayerProgress; onPlay: () => void }) {
  const { t } = useI18n()
  const total = bankTotalPotential()
  const taken = bankCollectedPotential(progress.bankLootTaken ?? [], progress.bankOpenedSafes ?? [])
  const zone = Math.min(BANK_ZONE_COUNT, Math.max(1, Math.floor(progress.bankDepth ?? 0) + 1))
  const pct = progress.bankComplete ? 100 : Math.round((zone / BANK_ZONE_COUNT) * 100)
  const mansionOpen = isMansionUnlocked(progress)

  return (
    <section className="mt-3 rounded-2xl border border-white/8 bg-[#141218] px-3 py-3">
      <h2 className="font-display text-sm font-bold text-amber-200">{t('hubNextRaid')}</h2>

      <div className="mt-2 rounded-xl bg-black/25 px-2.5 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-sm font-black text-amber-50">{t('heistMapBank')}</p>
          <p className="text-[10px] font-extrabold tracking-[0.14em] text-amber-200">
            {progress.bankComplete ? t('heistBankCompleteTitle') : t('heistBankZone', { n: zone, max: BANK_ZONE_COUNT })}
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="progress-fill h-full rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] text-zinc-400">{t('heistBankCollected', { n: taken, total })}</p>
        {progress.bankComplete ? (
          <p className="mt-1 text-[11px] font-bold text-amber-200">{t('heistMansionUnlocked')}</p>
        ) : null}
      </div>

      <ul className="mt-2 space-y-2">
        {heistLevelCards(progress).map((card) => {
          const open = !card.locked && card.id
          return (
            <li
              key={card.n}
              className={[
                'flex items-center justify-between gap-3 rounded-xl px-2.5 py-2',
                open ? 'bg-black/25' : 'bg-black/15 opacity-60',
              ].join(' ')}
            >
              <span className="min-w-0">
                <span className="block text-[10px] font-extrabold tracking-[0.16em] text-amber-200/70">
                  {t('heistLevelNum', { n: card.n })}
                </span>
                <span className="block truncate font-display text-sm font-black text-amber-50">{t(card.nameKey)}</span>
              </span>
              {open ? (
                <button
                  type="button"
                  onClick={onPlay}
                  className="shrink-0 rounded-lg border border-amber-400/40 px-3 py-1.5 text-[11px] font-extrabold tracking-[0.12em] text-amber-200"
                >
                  {card.id === 'bank' ? t('hubEnterBank') : t('heistPlay')}
                </button>
              ) : (
                <span className="shrink-0 rounded-lg border border-white/12 px-3 py-1.5 text-[11px] font-extrabold tracking-[0.12em] text-zinc-500">
                  {t('heistLevelLocked')}
                </span>
              )}
            </li>
          )
        })}
      </ul>
      {mansionOpen ? null : (
        <p className="mt-2 text-[11px] text-zinc-500">{t('heistBankContinue')}</p>
      )}
    </section>
  )
}
