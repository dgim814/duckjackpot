import { useI18n } from '../../i18n/LanguageProvider'
import { HEIST_LEVEL_CARDS } from '../heistLevel'
import type { PlayerProgress } from '../progress'

export function NextRaidCard({ progress, onPlay }: { progress: PlayerProgress; onPlay: () => void }) {
  const { t } = useI18n()
  const goals: { done: boolean; label: string }[] = [
    { done: progress.objLoot, label: t('hubGoalLoot') },
    { done: progress.objStealth, label: t('hubGoalStealth') },
    { done: progress.objSpeed, label: t('hubGoalSpeed') },
  ]

  return (
    <section className="mt-3 rounded-2xl border border-white/8 bg-[#141218] px-3 py-3">
      <h2 className="font-display text-sm font-bold text-amber-200">{t('hubNextRaid')}</h2>

      <ul className="mt-2 space-y-2">
        {HEIST_LEVEL_CARDS.map((card) => {
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
                  {t('heistPlay')}
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

      <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">{t('hubGoals')}</p>
      <ul className="mt-1.5 space-y-1">
        {goals.map((goal) => (
          <li key={goal.label} className={`text-sm ${goal.done ? 'text-amber-100' : 'text-zinc-500'}`}>
            {goal.done ? '✓' : '□'} {goal.label}
          </li>
        ))}
      </ul>
    </section>
  )
}
