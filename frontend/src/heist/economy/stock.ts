import { CATALOG, type CatalogItem, type ItemCategory, type ItemRarity } from './catalog'
import { STOCK_RULES } from './config'

function dayKey(now: number) {
  return Math.floor(now / 86_400_000)
}

function pick(pool: CatalogItem[], count: number, seed: number) {
  if (pool.length === 0 || count <= 0) return []
  const out: CatalogItem[] = []
  const used = new Set<string>()
  let n = seed
  for (let i = 0; i < count; i += 1) {
    n = (n * 1103515245 + 12345) & 0x7fffffff
    let idx = n % pool.length
    let guard = 0
    while (used.has(pool[idx].id) && guard < pool.length) {
      idx = (idx + 1) % pool.length
      guard += 1
    }
    used.add(pool[idx].id)
    out.push(pool[idx])
  }
  return out
}

export function marketStock(now = Date.now()): CatalogItem[] {
  const day = dayKey(now)
  const alwaysSet = new Set<string>(STOCK_RULES.always)
  const always = CATALOG.filter((item) => alwaysSet.has(item.rarity))
  const of = (rarity: ItemRarity) => CATALOG.filter((item) => item.rarity === rarity)
  const rare = pick(of('RARE'), STOCK_RULES.dailyRare, day + 11)
  const epic = pick(of('EPIC'), STOCK_RULES.dailyEpic, day + 29)
  const legendary = pick(of('LEGENDARY'), STOCK_RULES.dailyLegendary, day + 47)
  const iconic =
    day % STOCK_RULES.iconicEveryDays === 0 ? pick(of('ICONIC'), 1, day + 73) : []
  const seen = new Set<string>()
  const out: CatalogItem[] = []
  for (const item of [...always, ...rare, ...epic, ...legendary, ...iconic]) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
  }
  out.sort((a, b) => a.purchasePrice - b.purchasePrice)
  return out
}

export function featuredLot(now = Date.now()) {
  const stock = marketStock(now).filter((item) => item.rarity !== 'COMMON')
  if (stock.length === 0) return marketStock(now)[0] ?? null
  const day = dayKey(now)
  return stock[day % stock.length] ?? null
}

export function stockByCategory(category: ItemCategory | 'ALL', now = Date.now()) {
  const stock = marketStock(now)
  if (category === 'ALL') return stock
  return stock.filter((item) => item.category === category)
}

export function raidsHint(price: number, banked: number) {
  const need = Math.max(0, price - banked)
  if (need <= 0) return 'now'
  if (need <= 100) return 'bank'
  if (need <= 400) return 'mansion'
  return 'more'
}
