import { useI18n } from '../../i18n/LanguageProvider'
import { trackCtaClick, useCtaView } from './starsDiscovery'

/** ⭐ DUCK LAB on the hub: always there, small; a one-time glow after the first successful EXIT. */
export function DuckLabEntry({ cue, onOpen }: { cue: boolean; onOpen: () => void }) {
  const { t } = useI18n()
  const ref = useCtaView('hub')
  return (
    <div ref={ref} className={`duck-lab-entry mt-3 rounded-2xl border px-3 py-3 text-left ${cue ? 'is-cue border-sky-300/70 bg-sky-400/10' : 'border-sky-300/35 bg-sky-400/[0.06]'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold tracking-[0.16em] text-sky-200">⭐ DUCK LAB</p>
        {cue ? <span className="rounded-full bg-sky-300 px-2 py-0.5 text-[9px] font-black tracking-[0.08em] text-zinc-950">{t('labNew')}</span> : null}
      </div>
      <p className="font-display mt-1 text-base font-black text-white">{t('labTitle')}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-sky-100/80">{t('labTracks')}</p>
      <p className="mt-0.5 text-[11px] text-sky-100/60">{t('labFast')}</p>
      <button
        type="button"
        className="mt-2 min-h-11 w-full rounded-xl border border-sky-300/50 bg-sky-300/15 px-3 py-2 text-[13px] font-black text-sky-50"
        onClick={() => {
          trackCtaClick('hub')
          onOpen()
        }}
      >
        {t('labOpen')}
      </button>
    </div>
  )
}
