import { useI18n } from '../../i18n/LanguageProvider'
import { ENERGY_MAX } from '../energy'

export function EnergyBar({ value }: { value: number }) {
  const { t } = useI18n()
  const slots = Array.from({ length: ENERGY_MAX }, (_, i) => i < value)

  return (
    <section className="mt-3 rounded-2xl border border-white/8 bg-[#141218] px-3 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-200">{t('hubEnergy')}</h2>
        <span className="font-mono text-sm font-bold text-amber-200">
          {value}/{ENERGY_MAX}
        </span>
      </div>
      <div className="mt-2 flex gap-1.5">
        {slots.map((filled, i) => (
          <span
            key={i}
            className={[
              'h-2.5 flex-1 rounded-full',
              filled ? 'bg-amber-400 shadow-[0_0_10px_rgba(255,193,7,0.35)]' : 'bg-zinc-800',
            ].join(' ')}
          />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-zinc-500">{t('hubEnergyFull')}</p>
    </section>
  )
}
