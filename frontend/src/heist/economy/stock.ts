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

function live() {
  return CATALOG.filter((item) => item.market !== false)
}

export function marketStock(now = Date.now()): CatalogItem[] {
  const day = dayKey(now)
  const pool = live()
  const pin = pool.filter((item) => item.id === 'art_sketch')
  const rest = pool.filter((item) => item.id !== 'art_sketch')
  const notIcon = rest.filter((item) => item.rarity !== 'ICONIC')
  const entry = pick(
    notIcon.filter((item) => item.rarity === 'COMMON' || item.rarity === 'UNCOMMON' || item.rarity === 'LUX'),
    STOCK_RULES.dailyEntry,
    day + 2,
  )
  const art = pick(
    notIcon.filter((item) => item.category === 'ART'),
    STOCK_RULES.dailyArt,
    day + 3,
  )
  const watches = pick(
    notIcon.filter((item) => item.id.startsWith('watch_')),
    STOCK_RULES.dailyWatch,
    day + 5,
  )
  const cars = pick(
    notIcon.filter((item) => item.category === 'CARS'),
    STOCK_RULES.dailyCars,
    day + 7,
  )
  const other = pick(
    notIcon.filter(
      (item) => item.category !== 'ART' && item.category !== 'CARS' && !item.id.startsWith('watch_'),
    ),
    STOCK_RULES.dailyOther,
    day + 9,
  )
  const rare = pick(
    rest.filter((item) => item.rarity === 'RARE'),
    STOCK_RULES.dailyRare,
    day + 11,
  )
  const epic = pick(
    rest.filter((item) => item.rarity === 'EPIC'),
    STOCK_RULES.dailyEpic,
    day + 29,
  )
  const legendary = pick(
    rest.filter((item) => item.rarity === 'LEGENDARY'),
    STOCK_RULES.dailyLegendary,
    day + 47,
  )
  const iconic =
    day % STOCK_RULES.iconicEveryDays === 0
      ? pick(
          rest.filter((item) => item.rarity === 'ICONIC'),
          1,
          day + 73,
        )
      : []
  const seen = new Set<string>()
  const out: CatalogItem[] = []
  for (const item of [...pin, ...entry, ...art, ...watches, ...cars, ...other, ...rare, ...epic, ...legendary, ...iconic]) {
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
  const pinAt = out.findIndex((item) => item.id === 'art_sketch')
  if (pinAt > 0) {
    const [hero] = out.splice(pinAt, 1)
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
  if (category === 'RARE') return stock.filter((item) => item.rarity === 'RARE' || item.rarity === 'EPIC' || item.rarity === 'LEGENDARY' || item.rarity === 'ICONIC')
  if (category === 'LUXURY') {
    return stock.filter(
      (item) =>
        item.category === 'LUXURY' ||
        item.rarity === 'LUX' ||
        item.id.startsWith('watch_') ||
        item.id.startsWith('jewel_') ||
        item.id.startsWith('fashion_'),
    )
  }
  return stock.filter((item) => item.category === category)
}

export function raidsHint(price: number, banked: number) {
  const need = Math.max(0, price - banked)
  if (need <= 0) return 'now'
  if (need <= 100) return 'bank'
  if (need <= 400) return 'mansion'
  return 'more'
}
