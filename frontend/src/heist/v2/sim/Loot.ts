import type { DuckCoinKind } from '../../coinAssets'

export type Coin = {
  uid: number
  /** Persistent id for BANK coins; undefined for drops and mansion coins. */
  persistId?: string
  x: number
  y: number
  kind: DuckCoinKind
  value: number
  weight: number
  taken: boolean
  /** Sim time before which the coin cannot be picked up (fresh drops). */
  lockedUntil: number
  /** Changes when the coin is spawned or removed, so the renderer can resync cheaply. */
  version: number
}

export const COIN_VALUE: Record<DuckCoinKind, number> = { C5: 5, C10: 10, C50: 50, C100: 100 }
export const PICKUP_R = 46
const BUCKET = 256

/** Coins bucketed by position: pickups and rendering only look at nearby buckets. */
export class LootField {
  readonly coins: Coin[] = []
  private buckets = new Map<number, Coin[]>()
  private uid = 0
  version = 0

  constructor(private cols: number) {}

  private key(x: number, y: number) {
    return Math.floor(y / BUCKET) * this.cols + Math.floor(x / BUCKET)
  }

  spawn(x: number, y: number, kind: DuckCoinKind, opts: { persistId?: string; value?: number; weight: number; lockedUntil?: number }) {
    const coin: Coin = {
      uid: (this.uid += 1),
      persistId: opts.persistId,
      x,
      y,
      kind,
      value: opts.value ?? COIN_VALUE[kind],
      weight: opts.weight,
      taken: false,
      lockedUntil: opts.lockedUntil ?? 0,
      version: 0,
    }
    this.coins.push(coin)
    const k = this.key(x, y)
    const list = this.buckets.get(k)
    if (list) list.push(coin)
    else this.buckets.set(k, [coin])
    this.version += 1
    return coin
  }

  take(coin: Coin) {
    coin.taken = true
    coin.version += 1
    const list = this.buckets.get(this.key(coin.x, coin.y))
    if (list) {
      const i = list.indexOf(coin)
      if (i >= 0) list.splice(i, 1)
    }
    this.version += 1
  }

  /** Visit live coins whose bucket overlaps the rectangle. */
  forEachNear(x0: number, y0: number, x1: number, y1: number, fn: (c: Coin) => void) {
    const bx0 = Math.floor(x0 / BUCKET)
    const bx1 = Math.floor(x1 / BUCKET)
    const by0 = Math.floor(y0 / BUCKET)
    const by1 = Math.floor(y1 / BUCKET)
    for (let by = by0; by <= by1; by += 1) {
      for (let bx = bx0; bx <= bx1; bx += 1) {
        if (bx < 0 || by < 0 || bx >= this.cols) continue
        const list = this.buckets.get(by * this.cols + bx)
        if (!list) continue
        for (let i = 0; i < list.length; i += 1) fn(list[i])
      }
    }
  }

  nearestPickable(x: number, y: number, time: number): Coin | null {
    let best: Coin | null = null
    let bestD = PICKUP_R
    this.forEachNear(x - PICKUP_R, y - PICKUP_R, x + PICKUP_R, y + PICKUP_R, (c) => {
      if (c.taken || time < c.lockedUntil) return
      const d = Math.hypot(c.x - x, c.y - y)
      if (d <= bestD) {
        bestD = d
        best = c
      }
    })
    return best
  }
}
