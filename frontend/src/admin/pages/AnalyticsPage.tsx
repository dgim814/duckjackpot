import { useEffect, useState } from 'react'
import { api, formatApiError } from '../../api/client'
import { useI18n } from '../../i18n/LanguageProvider'

type Range = 'today' | '7d' | '30d' | 'all'

type Summary = {
  range: Range
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

  const load = (r: Range) => {
    setBusy(true)
    setError(null)
    api
      .get<Summary>('/admin/analytics', { params: { range: r } })
      .then((res) => setData(res.data))
      .catch((err) => setError(formatApiError(err)))
      .finally(() => setBusy(false))
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
