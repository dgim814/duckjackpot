import { API_ORIGIN } from '../api/client'
import { telegramInitData } from '../telegram/user'

/**
 * Product analytics → Railway backend (POST /api/analytics/events).
 * The backend identifies the player from Telegram initData (signature checked there);
 * this module never sends a user id of its own. Outside Telegram a random device id
 * keeps anonymous sessions apart. Fire-and-forget: analytics can never break the game.
 */
export type AnalyticsEvent =
  | 'app_open'
  | 'game_start'
  | 'tutorial_start'
  | 'tutorial_step'
  | 'first_coin'
  | 'first_exit'
  | 'raid_start'
  | 'raid_exit'
  | 'raid_caught'
  | 'second_raid'
  | 'level_start'
  | 'level_complete'
  | 'black_market_open'
  | 'black_market_goal_selected'
  | 'black_market_purchase'
  | 'nft_open'
  | 'nft_drop_open'
  | 'stars_open'
  | 'stars_invoice_created'
  | 'stars_payment_success'
  | 'stars_invoice_cancelled'
  | 'stars_purchase_error'

export type AnalyticsProps = Partial<{
  level: string
  zone: number
  raidId: string
  duckCoinLoot: number
  exitResult: string
  catchReason: string
  durationMs: number
  levelCompleted: boolean
  step: string
  itemId: string
  price: number
  tier: string
  raffleId: string
  item: string
  stars: number
  productId: string
  orderId: string
  starsAmount: number
  error: string
}>

const ANON_KEY = 'duckjackpot.analytics.device'
const ONCE_KEY = 'duckjackpot.analytics.once.v1'
const FLUSH_MS = 2500

const rand = () => {
  try {
    return crypto.randomUUID().replace(/-/g, '')
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
}

function deviceId() {
  try {
    let id = localStorage.getItem(ANON_KEY)
    if (!id) {
      id = rand()
      localStorage.setItem(ANON_KEY, id)
    }
    return id
  } catch {
    return sessionId
  }
}

const sessionId = rand().slice(0, 24)
/** Created right at startup, so a reload never races a device id that was not saved yet. */
const device = typeof window !== 'undefined' ? deviceId() : sessionId
let queue: { name: AnalyticsEvent; props?: AnalyticsProps }[] = []
let timer: number | null = null

function flush() {
  timer = null
  if (!queue.length) return
  const events = queue.splice(0, 50)
  try {
    void fetch(`${API_ORIGIN}/api/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: telegramInitData(), anonId: device, sessionId, events }),
      keepalive: true,
    }).catch(() => undefined)
  } catch {
    /* offline or blocked: the event is simply lost */
  }
  if (queue.length) schedule()
}

function schedule() {
  if (timer == null) timer = window.setTimeout(flush, FLUSH_MS)
}

export function track(name: AnalyticsEvent, props?: AnalyticsProps) {
  queue.push(props ? { name, props } : { name })
  schedule()
}

/** A milestone this device reports only once (first coin, first exit, second raid, level start…). */
export function trackOnce(key: string, name: AnalyticsEvent, props?: AnalyticsProps) {
  try {
    const done = JSON.parse(localStorage.getItem(ONCE_KEY) || '{}') as Record<string, 1>
    if (done[key]) return
    done[key] = 1
    localStorage.setItem(ONCE_KEY, JSON.stringify(done))
  } catch {
    /* storage unavailable: still report it */
  }
  track(name, props)
}

let opened = false
/** Once per page load — module state, so React re-renders and StrictMode double effects cannot repeat it. */
export function trackAppOpen() {
  if (opened) return
  opened = true
  track('app_open')
}

/** Same event from a screen mount: StrictMode mounts twice in dev, so ignore repeats within 2 s. */
const lastScreen = new Map<AnalyticsEvent, number>()
export function trackScreen(name: AnalyticsEvent, props?: AnalyticsProps) {
  const now = Date.now()
  if (now - (lastScreen.get(name) ?? 0) < 2000) return
  lastScreen.set(name, now)
  track(name, props)
}

if (typeof window !== 'undefined') {
  // Send what is queued when the Mini App is hidden or closed.
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}
