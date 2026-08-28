import WebApp from '@twa-dev/sdk'
import { Headphones } from 'lucide-react'
import { SUPPORT_BOT_URL } from '../constants'
import { useI18n } from '../i18n/LanguageProvider'

function openSupportBot() {
  try {
    const api = WebApp as typeof WebApp & { openTelegramLink?: (url: string) => void }
    if (typeof api.openTelegramLink === 'function') {
      api.openTelegramLink(SUPPORT_BOT_URL)
      return
    }
  } catch {
    /* browser / missing Telegram API */
  }
  window.open(SUPPORT_BOT_URL, '_blank', 'noopener,noreferrer')
}

export function SupportBlock() {
  const { t } = useI18n()

  return (
    <div className="rounded-2xl border border-white/8 bg-[#141218] p-4">
      <button
        type="button"
        onClick={openSupportBot}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-extrabold text-zinc-950"
      >
        <Headphones size={18} strokeWidth={2.4} />
        {t('support')}
      </button>
      <p className="mt-2.5 text-center text-xs leading-snug text-zinc-400">{t('supportHint')}</p>
    </div>
  )
}
