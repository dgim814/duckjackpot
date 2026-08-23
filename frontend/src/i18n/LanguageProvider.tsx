import WebApp from '@twa-dev/sdk'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { STORAGE_KEYS } from '../constants'
import { messages, type Lang, type MessageKey } from './messages'
import { useAdmin } from '../admin/AdminProvider'

type Vars = Record<string, string | number>

type I18nContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: MessageKey, vars?: Vars) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.lang)
    if (stored === 'ru' || stored === 'en') return stored
  } catch {
    /* ignore */
  }
  const code = WebApp.initDataUnsafe.user?.language_code?.toLowerCase() ?? ''
  return code.startsWith('en') ? 'en' : 'ru'
}

function interpolate(template: string, vars?: Vars) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''))
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang)
  const { content } = useAdmin()

  const value = useMemo<I18nContextValue>(() => {
    const setLang = (next: Lang) => {
      setLangState(next)
      try {
        localStorage.setItem(STORAGE_KEYS.lang, next)
      } catch {
        /* ignore */
      }
      document.documentElement.lang = next
    }

    return {
      lang,
      setLang,
      t: (key, vars) => {
        const custom = content[lang]?.[key as keyof NonNullable<(typeof content)[Lang]>]
        return interpolate(custom || messages[lang][key], vars)
      },
    }
  }, [content, lang])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider')
  return ctx
}
