import { useMemo, useState } from 'react'
import { HeistDuck } from '../heist/HeistDuck'
import { HeistGame, type HeistEnd } from '../heist/HeistGame'
import { bindHeistI18n } from '../heist/heistI18n'
import { LangSwitch } from '../components/LangSwitch'
import {
  PRICE_BIG_BAG,
  PRICE_DISGUISE,
  PRICE_SHOES,
  bagCap,
  bankCoins,
  loadProgress,
  runMods,
  saveProgress,
  type PlayerProgress,
} from '../heist/progress'
import { useI18n } from '../i18n/LanguageProvider'

function formatTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

type Screen = 'lobby' | 'play' | 'result' | 'shop'

export function HeistPage() {
  const { t } = useI18n()
  bindHeistI18n(t)
  const [screen, setScreen] = useState<Screen>('lobby')
  const [end, setEnd] = useState<HeistEnd | null>(null)
  const [progress, setProgress] = useState(loadProgress)
  const [runKey, setRunKey] = useState(0)
  const [shopMsg, setShopMsg] = useState<string | null>(null)
  const mods = useMemo(() => runMods(progress), [progress])

  const onDone = (next: HeistEnd) => {
    if (next.verdict === 'escaped') {
      const gained = next.coins + next.bonus
      const updated = bankCoins(progress, gained)
      setProgress(updated)
      setEnd({ ...next, banked: updated.bankedDuckCoin })
    } else {
      setEnd({ ...next, banked: progress.bankedDuckCoin })
    }
    setScreen('result')
  }

  const playAgain = () => {
    setEnd(null)
    setRunKey((n) => n + 1)
    setScreen('play')
  }

  const buy = (ok: boolean, apply: (p: PlayerProgress) => PlayerProgress, price: number) => {
    if (ok) {
      setShopMsg(t('heistOwned'))
      return
    }
    if (progress.bankedDuckCoin < price) {
      setShopMsg(t('heistNotEnough'))
      return
    }
    const next = apply({ ...progress, bankedDuckCoin: progress.bankedDuckCoin - price })
    saveProgress(next)
    setProgress(next)
    setShopMsg(null)
  }

  if (screen === 'play') {
    return (
      <section
        className="relative h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] overflow-hidden overscroll-none bg-[#120c10]"
        style={{ touchAction: 'none', overscrollBehavior: 'none' }}
      >
        <HeistGame key={runKey} running mods={mods} onDone={onDone} />
      </section>
    )
  }

  if (screen === 'shop') {
    const items = [
      {
        title: t('heistBigBag'),
        hint: t('heistBigBagHint'),
        price: PRICE_BIG_BAG,
        owned: progress.bagLevel >= 1,
        onBuy: () => buy(progress.bagLevel >= 1, (p) => ({ ...p, bagLevel: 1 }), PRICE_BIG_BAG),
      },
      {
        title: t('heistDisguise'),
        hint: t('heistDisguiseHint'),
        price: PRICE_DISGUISE,
        owned: progress.disguiseLevel >= 1,
        onBuy: () => buy(progress.disguiseLevel >= 1, (p) => ({ ...p, disguiseLevel: 1 }), PRICE_DISGUISE),
      },
      {
        title: t('heistShoes'),
        hint: t('heistShoesHint'),
        price: PRICE_SHOES,
        owned: progress.shoesLevel >= 1,
        onBuy: () => buy(progress.shoesLevel >= 1, (p) => ({ ...p, shoesLevel: 1 }), PRICE_SHOES),
      },
    ]
    return (
      <section className="relative h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] overflow-y-auto bg-[#120c10] px-5 py-6">
        <div className="mx-auto w-full max-w-sm">
          <p className="text-center text-[11px] font-extrabold tracking-[0.2em] text-amber-200">{t('heistUpgrades')}</p>
          <p className="mt-3 text-center font-display text-4xl font-black text-amber-300">{progress.bankedDuckCoin}</p>
          <p className="text-center text-xs font-extrabold tracking-[0.18em] text-amber-100/80">{t('heistDuckCoin')}</p>
          <p className="mt-1 text-center text-xs text-zinc-400">
            {t('heistBag')} {bagCap(progress)}
          </p>
          {shopMsg ? <p className="mt-3 text-center text-sm font-bold text-orange-300">{shopMsg}</p> : null}
          <div className="mt-5 space-y-3">
            {items.map((item) => (
              <div key={item.title} className="rounded-2xl border border-amber-400/30 bg-[#101014]/90 p-4">
                <p className="font-display text-lg font-black text-amber-100">{item.title}</p>
                <p className="mt-1 text-sm text-zinc-400">{item.hint}</p>
                <p className="mt-2 font-mono text-sm font-bold text-amber-200">{item.price} {t('heistDuckCoin')}</p>
                <button
                  type="button"
                  className="buy-btn mt-3 w-full rounded-xl px-4 py-2 text-sm font-black text-zinc-950"
                  onClick={item.onBuy}
                >
                  {item.owned ? t('heistOwned') : t('heistBuy')}
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-5 w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-zinc-200"
            onClick={() => {
              setShopMsg(null)
              setScreen('lobby')
            }}
          >
            {t('heistHome')}
          </button>
        </div>
      </section>
    )
  }

  if (screen === 'result' && end) {
    const win = end.verdict === 'escaped'
    return (
      <section className="relative flex h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] items-center justify-center overflow-hidden bg-[#120c10] px-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,193,7,0.22),transparent_55%)]" />
        <div className="relative w-full max-w-sm rounded-3xl border border-amber-400/40 bg-[#101014]/92 p-6 text-center shadow-[0_0_60px_rgba(255,176,40,0.12)]">
          <p className="font-display text-3xl font-black text-amber-300">{win ? t('heistEscaped') : t('heistCaught')}</p>
          {win ? (
            <>
              <p className="mt-5 font-display text-5xl font-black text-white">+{end.coins + end.bonus}</p>
              <p className="text-xs font-extrabold tracking-[0.18em] text-amber-200">{t('heistDuckCoin')}</p>
              <p className="mt-3 text-sm text-zinc-300">
                {t('heistBanked')}: {end.banked}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-zinc-200">
                <div>
                  <p className="text-[10px] font-extrabold tracking-[0.14em] text-zinc-500">{t('heistTime')}</p>
                  <p className="font-display text-xl font-black">{formatTime(end.timeMs)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold tracking-[0.14em] text-zinc-500">{t('heistCoinsCollected')}</p>
                  <p className="font-display text-xl font-black">{end.coins}</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold tracking-[0.14em] text-zinc-500">{t('heistAlert')}</p>
                  <p className="font-display text-xl font-black">{Math.round(end.alert * 100)}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold tracking-[0.14em] text-zinc-500">{t('heistBonus')}</p>
                  <p className="font-display text-xl font-black">{end.bonus}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="mt-5 text-xs font-extrabold tracking-[0.2em] text-orange-300/80">{t('heistLostRun')}</p>
              <p className="font-display text-4xl font-black text-orange-200">{end.coins}</p>
              <p className="mt-3 text-sm text-zinc-300">
                {t('heistBanked')}: {end.banked}
              </p>
            </>
          )}
          <button type="button" className="buy-btn mt-6 w-full rounded-2xl px-4 py-3 text-zinc-950" onClick={playAgain}>
            {win ? t('heistAgain') : t('heistTryAgain')}
          </button>
          <button
            type="button"
            className="mt-3 w-full rounded-2xl border border-amber-400/40 px-4 py-3 text-sm font-bold text-amber-100"
            onClick={() => {
              setEnd(null)
              setShopMsg(null)
              setScreen('shop')
            }}
          >
            {t('heistUpgrades')}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="relative h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] overflow-hidden bg-[#120c10]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,107,0,0.18),transparent_50%)]" />
      <div className="absolute inset-0 flex flex-col items-center justify-end px-5 pb-6">
        <HeistDuck className="mb-2" />
        <div className="w-full max-w-sm rounded-3xl border border-amber-400/35 bg-[#120c10]/88 p-4 backdrop-blur-md">
          <div className="mb-3 flex justify-center">
            <LangSwitch gold />
          </div>
          <p className="text-center text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-200">{t('heistKicker')}</p>
          <h1 className="font-display mt-1 text-center text-3xl font-black text-amber-50">{t('heistTitle')}</h1>
          <p className="mt-2 whitespace-pre-line text-center text-sm font-semibold text-amber-50/90">{t('heistHint')}</p>
          <div className="mt-3 flex justify-between text-sm text-zinc-300">
            <span>{t('heistBanked')}</span>
            <span className="font-mono font-bold text-amber-200">{progress.bankedDuckCoin}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm text-zinc-300">
            <span>{t('heistBag')}</span>
            <span className="font-mono font-bold text-amber-200">{bagCap(progress)}</span>
          </div>
          <button
            type="button"
            className="buy-btn mt-4 w-full rounded-full px-6 py-4 font-display text-2xl font-black tracking-[0.12em] text-zinc-950"
            onClick={() => {
              setEnd(null)
              setRunKey((n) => n + 1)
              setScreen('play')
            }}
          >
            {t('heistPlay')}
          </button>
          <button
            type="button"
            className="mt-3 w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-zinc-200"
            onClick={() => {
              setShopMsg(null)
              setScreen('shop')
            }}
          >
            {t('heistUpgrades')}
          </button>
        </div>
      </div>
    </section>
  )
}
