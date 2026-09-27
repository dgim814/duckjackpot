import { useEffect, useState } from 'react'
import { api, formatApiError } from '../../api/client'
import { useI18n } from '../../i18n/LanguageProvider'
import { RetentionBlocks } from './RetentionBlocks'
import { StarsPayouts } from './StarsPayouts'

type Range = 'today' | '7d' | '30d' | 'all'

type StarsBlock = {
  ctaShown: number
  ctaClicked: number
  ctaClickPct: number
  ctaToOpen: number
  opens: number
  openUsers: number
  invoices: number
  payments: number
  payers: number
  starsSold: number
  avgStars: number
  openToInvoice: number
  invoiceToPayment: number
  openToPayment: number
  products: { productId: string; purchases: number; payers: number; stars: number }[]
}

type AdminOrder = {
  id: string
  telegramUserId: number
  productId: string
  tier: number
  starsAmount: number
  status: string
  createdAt: number
  deliveredAt?: number
  telegramPaymentChargeId?: string
  failReason?: string
}

type Summary = {
  range: Range
  stars: StarsBlock
  daily: { available: number; claimed: number; claims: number; conversion: number; coins: number }
  hub: { ctaShown: number; ctaClicked: number; clicks: number; conversion: number }
  generatedAt: number
  players: number
  verifiedPlayers: number
  events: number
  funnel: {
    appOpen: number
    gameStart: number
    firstCoin: number
    firstExit: number
    secondRaid: number
    bankComplete: number
    blackMarketOpen: number
    goalSelected: number
    nftDropOpen: number
    starsOpen: number
    starsPayments: number
    starsPayers: number
  }
  conversion: {
    openToStart: number
    startToFirstCoin: number
    firstCoinToFirstExit: number
    firstExitToSecondRaid: number
    secondRaidToBankComplete: number
  }
  active: { dau: number; wau: number; mau: number }
  newPlayers: number
  returningPlayers: number
  raids: {
    started: number
    avgPerPlayer: number
    escaped: number
    caught: number
    caughtPct: number
    avgCoinsPerExit: number
    avgDurationS: number
    popularLevels: { level: string; raids: number }[]
  }
}

const L = {
  ru: {
    title: 'Аналитика',
    hint: 'Реальные события игроков с сервера (Railway). Игрок определяется по подписанным данным Telegram.',
    ranges: { today: 'Сегодня', '7d': '7 дней', '30d': '30 дней', all: 'Всё время' },
    funnel: 'Воронка',
    conv: 'Конверсия',
    activity: 'Активность',
    raids: 'Рейды',
    levels: 'Популярные уровни',
    players: 'Игроков в периоде',
    verified: 'из них с Telegram',
    events: 'Событий',
    noLevels: 'Пока нет рейдов',
    loading: 'Загрузка…',
    refresh: 'Обновить',
    rows: {
      appOpen: '👀 Открыли Mini App',
      gameStart: '🎮 Начали игру',
      firstCoin: '🪙 Собрали первую монету',
      firstExit: '🚪 Сделали первый EXIT',
      secondRaid: '🔁 Начали второй рейд',
      bankComplete: '🏦 Прошли BANK',
      blackMarketOpen: '🛒 Открыли Black Market',
      goalSelected: '🎯 Выбрали цель',
      nftDropOpen: '💎 Открыли NFT Drop',
      starsOpen: '⭐ Открыли Stars',
      starsPayments: '💳 Успешные Stars-покупки',
    },
    convRows: {
      openToStart: 'App Open → Game Start',
      startToFirstCoin: 'Game Start → First Coin',
      firstCoinToFirstExit: 'First Coin → First Exit',
      firstExitToSecondRaid: 'First Exit → Second Raid',
      secondRaidToBankComplete: 'Second Raid → BANK Complete',
    },
    act: { dau: 'DAU', wau: 'WAU', mau: 'MAU', newPlayers: 'Новые игроки', returningPlayers: 'Вернувшиеся' },
    raid: {
      started: 'Рейдов начато',
      avgPerPlayer: 'Рейдов на игрока',
      avgCoinsPerExit: 'DUCK COIN за успешный EXIT',
      caughtPct: 'CAUGHT',
      avgDurationS: 'Средняя длительность рейда',
    },
    sec: 'с',
    raidsN: 'рейдов',
    daily: {
      title: '🎁 DAILY REWARD',
      available: 'Доступна (игроков)',
      claimed: 'Забрали (игроков)',
      claims: 'Выдач всего',
      coins: 'DUCK COIN выдано',
      conversion: 'Доступна → забрали',
    },
    hub: {
      title: '▶ ГЛАВНАЯ КНОПКА HUB',
      shown: 'Увидели (игроков)',
      clicked: 'Нажали (игроков)',
      clicks: 'Нажатий',
      conversion: 'Увидели → нажали',
    },
    stars: {
      title: '⭐ TELEGRAM STARS',
      ctaShown: 'Stars CTA показан (игроков)',
      ctaClicked: 'Stars CTA нажат (игроков)',
      ctaClickPct: 'CTA → нажатие',
      ctaToOpen: 'CTA → Stars open',
      opens: 'Открытий экрана Stars',
      invoices: 'Счетов создано',
      payments: 'Успешных оплат',
      payers: 'Платящих игроков',
      sold: 'Stars продано',
      avg: 'Stars на покупку',
      openToInvoice: 'Stars open → invoice',
      invoiceToPayment: 'Invoice → оплата',
      openToPayment: 'Stars open → оплата',
      product: 'ТОВАР',
      buys: 'ПОКУПОК',
      buyers: 'ПЛАТЕЛЬЩИКОВ',
      starsCol: 'STARS',
      none: 'Покупок пока нет',
      orders: '⭐ ПЛАТЕЖИ',
      ordersHint: 'Последние заказы. Telegram ID и номер платежа видны только администратору.',
      date: 'Дата',
      user: 'Telegram ID',
      status: 'Статус',
      charge: 'Charge ID',
      noOrders: 'Заказов пока нет',
      bot: 'Бот',
      botOk: 'подключён, принимает платежи',
      botOff: 'НЕ подключён — счета не создаются',
    },
  },
  en: {
    title: 'Analytics',
    hint: 'Real player events from the server (Railway). Players are identified by signed Telegram data.',
    ranges: { today: 'Today', '7d': '7 days', '30d': '30 days', all: 'All time' },
    funnel: 'Funnel',
    conv: 'Conversion',
    activity: 'Activity',
    raids: 'Raids',
    levels: 'Popular levels',
    players: 'Players in range',
    verified: 'with Telegram',
    events: 'Events',
    noLevels: 'No raids yet',
    loading: 'Loading…',
    refresh: 'Refresh',
    rows: {
      appOpen: '👀 Opened the Mini App',
      gameStart: '🎮 Started the game',
      firstCoin: '🪙 Collected the first coin',
      firstExit: '🚪 Made the first EXIT',
      secondRaid: '🔁 Started a second raid',
      bankComplete: '🏦 Completed BANK',
      blackMarketOpen: '🛒 Opened the Black Market',
      goalSelected: '🎯 Picked a goal',
      nftDropOpen: '💎 Opened NFT Drop',
      starsOpen: '⭐ Opened Stars',
      starsPayments: '💳 Successful Stars purchases',
    },
    convRows: {
      openToStart: 'App Open → Game Start',
      startToFirstCoin: 'Game Start → First Coin',
      firstCoinToFirstExit: 'First Coin → First Exit',
      firstExitToSecondRaid: 'First Exit → Second Raid',
      secondRaidToBankComplete: 'Second Raid → BANK Complete',
    },
    act: { dau: 'DAU', wau: 'WAU', mau: 'MAU', newPlayers: 'New players', returningPlayers: 'Returning' },
    raid: {
      started: 'Raids started',
      avgPerPlayer: 'Raids per player',
      avgCoinsPerExit: 'DUCK COIN per successful EXIT',
      caughtPct: 'CAUGHT',
      avgDurationS: 'Average raid length',
    },
    sec: 's',
    raidsN: 'raids',
    daily: {
      title: '🎁 DAILY REWARD',
      available: 'Available (players)',
      claimed: 'Claimed (players)',
      claims: 'Total claims',
      coins: 'DUCK COIN given',
      conversion: 'Available → claimed',
    },
    hub: {
      title: '▶ HUB MAIN BUTTON',
      shown: 'Saw it (players)',
      clicked: 'Tapped it (players)',
      clicks: 'Taps',
      conversion: 'Saw → tapped',
    },
    stars: {
      title: '⭐ TELEGRAM STARS',
      ctaShown: 'Stars CTA shown (players)',
      ctaClicked: 'Stars CTA clicked (players)',
      ctaClickPct: 'CTA → click',
      ctaToOpen: 'CTA → Stars open',
      opens: 'Stars screen opens',
      invoices: 'Invoices created',
      payments: 'Successful payments',
      payers: 'Paying players',
      sold: 'Stars sold',
      avg: 'Stars per purchase',
      openToInvoice: 'Stars open → invoice',
      invoiceToPayment: 'Invoice → payment',
      openToPayment: 'Stars open → payment',
      product: 'PRODUCT',
      buys: 'PURCHASES',
      buyers: 'PAYERS',
      starsCol: 'STARS',
      none: 'No purchases yet',
      orders: '⭐ PAYMENTS',
      ordersHint: 'Latest orders. Telegram IDs and charge IDs are visible to admins only.',
      date: 'Date',
      user: 'Telegram ID',
      status: 'Status',
      charge: 'Charge ID',
      noOrders: 'No orders yet',
      bot: 'Bot',
      botOk: 'connected, accepting payments',
      botOff: 'NOT connected — invoices cannot be created',
    },
  },
}

const LEVEL_NAMES: Record<string, string> = {
  bank: 'BANK',
  mansion: 'MANSION',
  level3: 'PRIVATE BANK',
  level4: 'BLACK MARKET',
  level5: 'GRAND VAULT',
  level6: 'SKYLINE TOWER',
  level7: 'UNDERGROUND CITY',
  level8: 'GRAND COLLECTION',
}

export function AnalyticsPage() {
  const { lang } = useI18n()
  const tx = lang === 'ru' ? L.ru : L.en
  const [range, setRange] = useState<Range>('7d')
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [orders, setOrders] = useState<{ orders: AdminOrder[]; bot: { configured: boolean; polling: boolean } } | null>(null)

  const load = (r: Range) => {
    setBusy(true)
    setError(null)
    api
      .get<Summary>('/admin/analytics', { params: { range: r } })
      .then((res) => setData(res.data))
      .catch((err) => setError(formatApiError(err)))
      .finally(() => setBusy(false))
    api
      .get<{ orders: AdminOrder[]; bot: { configured: boolean; polling: boolean } }>('/admin/stars/orders')
      .then((res) => setOrders(res.data))
      .catch(() => setOrders(null))
  }
  useEffect(() => load(range), [range])

  const f = data?.funnel
  const top = f ? Math.max(1, f.appOpen) : 1
  const funnelRows: (keyof typeof tx.rows)[] = ['appOpen', 'gameStart', 'firstCoin', 'firstExit', 'secondRaid', 'bankComplete', 'blackMarketOpen', 'goalSelected', 'nftDropOpen', 'starsOpen', 'starsPayments']

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-zinc-100">{tx.title}</h2>
        <p className="mt-1 text-sm text-zinc-400">{tx.hint}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(tx.ranges) as Range[]).map((r) => (
          <button key={r} type="button" className={`admin-btn ${r === range ? 'border-amber-400 text-amber-200' : ''}`} onClick={() => setRange(r)} aria-pressed={r === range}>
            {tx.ranges[r]}
          </button>
        ))}
        <button type="button" className="admin-btn" onClick={() => load(range)} disabled={busy}>
          {busy ? tx.loading : tx.refresh}
        </button>
      </div>
      {error ? <p className="break-all text-sm text-orange-400">{error}</p> : null}

      {data && f ? (
        <>
          <section className="grid grid-cols-3 gap-2">
            <Stat label={tx.players} value={data.players} sub={`${tx.verified}: ${data.verifiedPlayers}`} />
            <Stat label={tx.act.newPlayers} value={data.newPlayers} />
            <Stat label={tx.act.returningPlayers} value={data.returningPlayers} />
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-200">{tx.funnel}</h3>
            <ul className="mt-3 space-y-2">
              {funnelRows.map((k) => {
                const n = f[k]
                return (
                  <li key={k}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="text-zinc-200">{tx.rows[k]}</span>
                      <span className="font-display font-black text-white">{n}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, (n / top) * 100)}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-200">{tx.conv}</h3>
            <ul className="mt-3 space-y-1.5">
              {(Object.keys(tx.convRows) as (keyof typeof tx.convRows)[]).map((k) => (
                <li key={k} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-zinc-300">{tx.convRows[k]}</span>
                  <span className="font-display font-black text-emerald-300">{data.conversion[k]}%</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-200">{tx.activity}</h3>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label={tx.act.dau} value={data.active.dau} />
              <Stat label={tx.act.wau} value={data.active.wau} />
              <Stat label={tx.act.mau} value={data.active.mau} />
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-200">{tx.raids}</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Stat label={tx.raid.started} value={data.raids.started} />
              <Stat label={tx.raid.avgPerPlayer} value={data.raids.avgPerPlayer} />
              <Stat label={tx.raid.avgCoinsPerExit} value={data.raids.avgCoinsPerExit} />
              <Stat label={tx.raid.caughtPct} value={`${data.raids.caughtPct}%`} sub={`${data.raids.caught} / ${data.raids.caught + data.raids.escaped}`} />
              <Stat label={tx.raid.avgDurationS} value={`${data.raids.avgDurationS} ${tx.sec}`} />
            </div>
            <h4 className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">{tx.levels}</h4>
            {data.raids.popularLevels.length ? (
              <ul className="mt-2 space-y-1">
                {data.raids.popularLevels.map((l) => (
                  <li key={l.level} className="flex justify-between text-sm">
                    <span className="text-zinc-200">{LEVEL_NAMES[l.level] ?? l.level}</span>
                    <span className="text-zinc-400">
                      {l.raids} {tx.raidsN}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">{tx.noLevels}</p>
            )}
          </section>
          <section className="rounded-2xl border border-emerald-400/30 bg-zinc-900/80 p-4">
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-emerald-200">{tx.daily.title}</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Stat label={tx.daily.available} value={data.daily?.available ?? 0} />
              <Stat label={tx.daily.claimed} value={data.daily?.claimed ?? 0} />
              <Stat label={tx.daily.claims} value={data.daily?.claims ?? 0} />
              <Stat label={tx.daily.coins} value={(data.daily?.coins ?? 0).toLocaleString()} />
            </div>
            <p className="mt-3 flex items-baseline justify-between gap-2 text-sm">
              <span className="text-zinc-300">{tx.daily.conversion}</span>
              <span className="font-display font-black text-emerald-300">{data.daily?.conversion ?? 0}%</span>
            </p>
          </section>
          <section className="rounded-2xl border border-amber-400/30 bg-zinc-900/80 p-4">
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-200">{tx.hub.title}</h3>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label={tx.hub.shown} value={data.hub?.ctaShown ?? 0} />
              <Stat label={tx.hub.clicked} value={data.hub?.ctaClicked ?? 0} />
              <Stat label={tx.hub.clicks} value={data.hub?.clicks ?? 0} />
            </div>
            <p className="mt-3 flex items-baseline justify-between gap-2 text-sm">
              <span className="text-zinc-300">{tx.hub.conversion}</span>
              <span className="font-display font-black text-emerald-300">{data.hub?.conversion ?? 0}%</span>
            </p>
          </section>
          <RetentionBlocks range={range} lang={lang} />
          <StarsPayouts lang={lang} />
          <section className="rounded-2xl border border-amber-400/30 bg-zinc-900/80 p-4">
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-200">{tx.stars.title}</h3>
            {orders ? (
              <p className={`mt-1 text-[11px] ${orders.bot.configured && orders.bot.polling ? 'text-emerald-300' : 'text-orange-300'}`}>
                {tx.stars.bot}: {orders.bot.configured && orders.bot.polling ? tx.stars.botOk : tx.stars.botOff}
              </p>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Stat label={tx.stars.ctaShown} value={data.stars.ctaShown} />
              <Stat label={tx.stars.ctaClicked} value={data.stars.ctaClicked} />
              <Stat label={tx.stars.opens} value={data.stars.opens} />
              <Stat label={tx.stars.invoices} value={data.stars.invoices} />
              <Stat label={tx.stars.payments} value={data.stars.payments} />
              <Stat label={tx.stars.payers} value={data.stars.payers} />
              <Stat label={tx.stars.sold} value={`${data.stars.starsSold} ⭐`} />
              <Stat label={tx.stars.avg} value={data.stars.avgStars} />
            </div>
            <ul className="mt-3 space-y-1.5">
              {(['ctaClickPct', 'ctaToOpen', 'openToInvoice', 'invoiceToPayment', 'openToPayment'] as const).map((k) => (
                <li key={k} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-zinc-300">{tx.stars[k]}</span>
                  <span className="font-display font-black text-emerald-300">{data.stars[k]}%</span>
                </li>
              ))}
            </ul>
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] tracking-[0.12em] text-zinc-500">
                  <th className="pb-1 font-extrabold">{tx.stars.product}</th>
                  <th className="pb-1 text-right font-extrabold">{tx.stars.buys}</th>
                  <th className="pb-1 text-right font-extrabold">{tx.stars.buyers}</th>
                  <th className="pb-1 text-right font-extrabold">{tx.stars.starsCol}</th>
                </tr>
              </thead>
              <tbody>
                {data.stars.products.length ? (
                  data.stars.products.map((p) => (
                    <tr key={p.productId} className="border-t border-white/5">
                      <td className="py-1 text-zinc-200">{p.productId.replace(/_/g, ' ').toUpperCase()}</td>
                      <td className="py-1 text-right text-zinc-200">{p.purchases}</td>
                      <td className="py-1 text-right text-zinc-200">{p.payers}</td>
                      <td className="py-1 text-right text-amber-200">{p.stars} ⭐</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="pt-2 text-zinc-500">
                      {tx.stars.none}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-200">{tx.stars.orders}</h3>
            <p className="mt-1 text-[11px] text-zinc-500">{tx.stars.ordersHint}</p>
            {orders?.orders.length ? (
              <ul className="mt-3 space-y-2">
                {orders.orders.slice(0, 50).map((o) => (
                  <li key={o.id} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-[12px]">
                    <div className="flex justify-between gap-2">
                      <span className="text-zinc-300">{new Date(o.deliveredAt ?? o.createdAt).toLocaleString()}</span>
                      <span className={o.status === 'delivered' ? 'text-emerald-300' : o.status === 'failed' ? 'text-orange-300' : 'text-zinc-400'}>{o.status}</span>
                    </div>
                    <div className="mt-0.5 flex justify-between gap-2">
                      <span className="text-zinc-200">
                        {o.productId.replace(/_/g, ' ').toUpperCase()} · {o.tier + 1}
                      </span>
                      <span className="text-amber-200">{o.starsAmount} ⭐</span>
                    </div>
                    <p className="mt-0.5 break-all text-[10px] text-zinc-500">
                      {tx.stars.user}: {o.telegramUserId}
                      {o.telegramPaymentChargeId ? ` · ${tx.stars.charge}: ${o.telegramPaymentChargeId}` : ''}
                      {o.failReason ? ` · ${o.failReason}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">{tx.stars.noOrders}</p>
            )}
          </section>

          <p className="text-[11px] text-zinc-600">
            {tx.events}: {data.events} · {new Date(data.generatedAt).toLocaleString()}
          </p>
        </>
      ) : null}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      <p className="font-display mt-0.5 text-xl font-black text-white">{value}</p>
      {sub ? <p className="text-[10px] text-zinc-500">{sub}</p> : null}
    </div>
  )
}
