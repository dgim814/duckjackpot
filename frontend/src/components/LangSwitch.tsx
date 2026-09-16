import { useI18n } from '../i18n/LanguageProvider'
import type { Lang } from '../i18n/messages'

const options: Lang[] = ['ru', 'en']

export function LangSwitch({ gold = false }: { gold?: boolean }) {
  const { lang, setLang } = useI18n()

  return (
    <div
      className={[
        'flex rounded-full p-0.5 text-[10px] font-extrabold tracking-wide',
        gold
          ? 'border border-amber-400/45 bg-black/45'
          : 'border border-white/10 bg-black/30',
      ].join(' ')}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLang(option)}
          className={[
            'rounded-full px-2.5 py-1 uppercase transition-colors',
            lang === option
              ? gold
                ? 'bg-amber-400 text-zinc-950'
                : 'bg-amber-400 text-zinc-950'
              : gold
                ? 'text-amber-100/70'
                : 'text-zinc-400',
          ].join(' ')}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
