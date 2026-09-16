import { messages, type Lang, type MessageKey } from '../i18n/messages'

type Vars = Record<string, string | number>
type TFn = (key: MessageKey, vars?: Vars) => string

function interpolate(template: string, vars?: Vars) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''))
}

function fallbackT(key: MessageKey, vars?: Vars) {
  const lang: Lang = document.documentElement.lang === 'en' ? 'en' : 'ru'
  return interpolate(messages[lang][key], vars)
}

let tFn: TFn = fallbackT

export function bindHeistI18n(t: TFn) {
  tFn = t
}

export function heistT(key: MessageKey, vars?: Vars) {
  return tFn(key, vars)
}
