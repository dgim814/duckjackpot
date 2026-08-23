import { useI18n } from '../i18n/LanguageProvider'
import type { Lang } from '../i18n/messages'

const options: Lang[] = ['ru', 'en']

export function LangSwitch() {
  const { lang, setLang } = useI18n()

  return (
    <div className="flex rounded-full border border-white/10 bg-black/30 p-0.5 text-[10px] font-extrabold tracking-wide">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLang(option)}
          className={[
            'rounded-full px-2 py-1 uppercase transition-colors',
            lang === option ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400',
          ].join(' ')}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
