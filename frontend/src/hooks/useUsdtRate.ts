import { useAdmin } from '../admin/AdminProvider'
import { USDT_RUB_DEFAULT } from '../constants'
import { formatUsdt, rubToUsdt } from '../fx/fetchUsdRub'
import { useFx } from '../fx/FxProvider'
import type { Lang } from '../i18n/messages'

export function useUsdtRate() {
  const fx = useFx()
  const { setRateOverride } = useAdmin()
  return {
    rate: fx.rate,
    liveRate: fx.liveRate,
    source: fx.source,
    status: fx.status,
    setRate: (value: number) => setRateOverride(value),
    clearOverride: () => setRateOverride(null),
    refresh: fx.refresh,
  }
}

export function formatCardPrice(priceRub: number, rate: number, lang: Lang) {
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  const usdt = formatUsdt(rubToUsdt(priceRub, rate || USDT_RUB_DEFAULT), locale)
  const rub = `${priceRub.toLocaleString(locale)} ₽`
  if (lang === 'en') return `${usdt} USDT ≈ ${rub}`
  return `${rub} ≈ ${usdt} USDT`
}
