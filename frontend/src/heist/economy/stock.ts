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
  const rarityRank: Record<ItemRarity, number> = {
    LUX: 0,
    COMMON: 1,
    UNCOMMON: 2,
    RARE: 3,
    EPIC: 4,
    LEGENDARY: 5,
    ICONIC: 6,
  }
  out.sort((a, b) => rarityRank[a.rarity] - rarityRank[b.rarity] || a.purchasePrice - b.purchasePrice)
  const pin = out.findIndex((item) => item.id === 'art_sketch')
  if (pin > 0) {
    const [hero] = out.splice(pin, 1)
    out.unshift(hero)
  }
  return out
}

export function featuredLot(now = Date.now()) {
  const stock = marketStock(now)
  return stock.find((item) => item.id === 'art_sketch') ?? stock.find((item) => item.rarity !== 'COMMON') ?? stock[0] ?? null
}

export type MarketFilter = ItemCategory | 'ALL' | 'RARE'

export function stockByCategory(category: MarketFilter, now = Date.now()) {
  const stock = marketStock(now)
  if (category === 'ALL') return stock
  if (category === 'RARE') return stock.filter((item) => item.rarity === 'RARE')
  if (category === 'LUXURY') return stock.filter((item) => item.category === 'LUXURY' || item.rarity === 'LUX')
  return stock.filter((item) => item.category === category)
}

export function raidsHint(price: number, banked: number) {
  const need = Math.max(0, price - banked)
  if (need <= 0) return 'now'
  if (need <= 100) return 'bank'
  if (need <= 400) return 'mansion'
  return 'more'
}
