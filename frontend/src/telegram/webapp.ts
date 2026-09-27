import WebApp from '@twa-dev/sdk'

/**
 * The one place the Mini App is set up with Telegram (called once from App's TelegramBoot).
 * Official Mini Apps API only: ready → expand → colours → a single fullscreen request on phones.
 *
 * expand() only gives the full height UNDER Telegram's own header bar; requestFullscreen()
 * (Bot API 8.0+) removes that bar too. Layout keeps clear of the notch / Dynamic Island and of
 * Telegram's floating controls through the --tg-safe-area-* and --tg-content-safe-area-* CSS
 * variables that telegram-web-app.js maintains (combined into --safe-top/--safe-bottom in index.css).
 */
type FullscreenApi = {
  isFullscreen?: boolean
  requestFullscreen?: () => void
  isVersionAtLeast?: (v: string) => boolean
  platform?: string
  onEvent: (event: string, cb: (...args: unknown[]) => void) => void
}

export function telegramWebApp(): typeof WebApp {
  return (window as Window & { Telegram?: { WebApp?: typeof WebApp } }).Telegram?.WebApp ?? WebApp
}

const debug = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.info('[telegram]', ...args)
}

let booted = false

export function bootTelegramApp() {
  if (booted) return
  booted = true
  const tg = telegramWebApp()
  try {
    tg.ready()
    tg.expand()
    tg.setHeaderColor('#09080c')
    tg.setBackgroundColor('#09080c')
  } catch (err) {
    debug('setup skipped', err)
  }
  requestFullscreenOnce(tg as unknown as FullscreenApi)
}

/** Phones only (a desktop client would turn the whole window fullscreen), once per launch. */
function requestFullscreenOnce(tg: FullscreenApi) {
  const root = document.documentElement
  const sync = () => {
    root.dataset.tgFullscreen = tg.isFullscreen ? '1' : '0'
  }
  const phone = tg.platform === 'ios' || tg.platform === 'android' || tg.platform === 'android_x'
  if (!phone || typeof tg.requestFullscreen !== 'function' || !tg.isVersionAtLeast?.('8.0')) {
    debug('fullscreen not requested', { platform: tg.platform })
    return
  }
  try {
    tg.onEvent('fullscreenChanged', () => {
      sync()
      debug('fullscreenChanged', tg.isFullscreen)
    })
    // Not supported / refused by the client: the app simply stays in its normal (expanded) mode.
    tg.onEvent('fullscreenFailed', (e) => {
      sync()
      debug('fullscreenFailed', e)
    })
    sync()
    if (!tg.isFullscreen) tg.requestFullscreen()
  } catch (err) {
    debug('fullscreen request failed', err)
  }
}
