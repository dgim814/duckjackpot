/**
 * DUCKJACKPOT ECONOMY MODEL — every price and income assumption lives here.
 *
 * Two currencies that never mix:
 *  - DUCK COIN: earned only by carrying loot out of a raid. Buys Black Market
 *    lots and (slowly) gear upgrades. The long-term goal.
 *  - ⭐ Stars: premium convenience. Buys the same gear faster, one-raid boosts,
 *    passes for premium lifts/escalators and a paid "continue" after CAUGHT.
 *    Never buys NFTs, never buys Black Market lots, never skips progression.
 *
 * How prices are derived
 * ----------------------
 * A raid's income is capped by the BAG, not by the level: coins are only
 * banked if they fit. So the reference income is "bag fill + average bonus".
 * Deeper levels matter because they fill a big bag fast (C50/C100 coins,
 * big safes, special loot), and loot is persistent per level (once carried
 * out it is gone), so every level is a finite mine (loot + safes + special loot):
 * BANK ≈ 6.5k, MANSION ≈ 18k, PRIVATE BANK ≈ 32k, BLACK MARKET ≈ 47k,
 * GRAND VAULT ≈ 66k, SKYLINE TOWER ≈ 88k, UNDERGROUND CITY ≈ 106k,
 * GRAND COLLECTION ≈ 127k — ≈ 492k in total. Special loot (L6–L8) is sold
 * to the fence and is not limited by the bag. See frontend/docs/heist-economy.md.
 *
 * Price tiers are expressed in successful raids at the bag you would normally
 * own when you are shopping in that tier, assuming ~30 % of raids end CAUGHT.
 */

/** Average DUCK COIN banked by one successful raid, by bag tier (fill ≈ 95 % + objectives/stealth bonus). */
export const RAID_INCOME_BY_BAG = [140, 290, 520, 990] as const

/** Share of raids that end CAUGHT (loot lost) in normal play — used for "≈ N raids" hints. */
export const CAUGHT_RATE = 0.3

/** Display rarity: the five tiers players see. Internal lot rarities map onto them. */
export type Tier = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MASTERPIECE'
export const TIERS: readonly Tier[] = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MASTERPIECE']

/**
 * Price band per tier (DUCK COIN) and the bag tier a player typically has there.
 *   COMMON       ≈ 0.3–2 raids   on the basic 100 bag
 *   RARE         ≈ 1–5 raids     on the 250 bag
 *   EPIC         ≈ 3–11 raids    on the 500 bag
 *   LEGENDARY    ≈ 6–25 raids    on the 1000 bag
 *   MASTERPIECE  ≈ 25–150 raids  on the 1000 bag — long-term collection goals
 */
export const TIER_BANDS: Record<Tier, { min: number; max: number; bag: number }> = {
  COMMON: { min: 40, max: 280, bag: 0 },
  RARE: { min: 300, max: 1400, bag: 1 },
  EPIC: { min: 1500, max: 5800, bag: 2 },
  LEGENDARY: { min: 6000, max: 24000, bag: 3 },
  MASTERPIECE: { min: 25000, max: 150000, bag: 3 },
}

/**
 * Renoir — «Bal du moulin de la Galette»: one of the main long-term goals the
 * player can choose. 50 000 DUCK COIN ≈ 73 successful raids on the 1000 bag
 * (≈ 138 on the 500 bag), i.e. many evenings of play — but finite: the game
 * holds ≈ 490k DUCK COIN in total. One line to rebalance.
 */
export const RENOIR = { id: 'art_sketch', price: 50000, value: 57500, tier: 'MASTERPIECE' as Tier }

/** First goal shown to new players after their first raids (a cheap COMMON lot). */
export const FIRST_LOT_ID = 'lux_lighter'

/** Successful raids needed for a price at a bag tier (CAUGHT raids included on average). */
export function raidsFor(price: number, bagTier: number) {
  const income = RAID_INCOME_BY_BAG[Math.max(0, Math.min(3, bagTier))] * (1 - CAUGHT_RATE)
  return Math.max(1, Math.ceil(price / income))
}

/** Collection-value ranks, scaled to the rebalanced prices. */
export const RANK_THRESHOLDS = [0, 2_000, 10_000, 40_000, 120_000, 400_000, 1_200_000] as const

// ---------------------------------------------------------------------------
// Gear upgrades: each tier can be bought with DUCK COIN (the long way) or with
// ⭐ Stars (the fast way). Level 0 is the free starting gear.
// ---------------------------------------------------------------------------

export type UpgradeId = 'bagLevel' | 'disguiseLevel' | 'shoesLevel' | 'dashLevel' | 'lockpickLevel' | 'magnetLevel'

export type UpgradeTrack = {
  id: UpgradeId
  /** Price of tiers 1..3. */
  coin: readonly [number, number, number]
  stars: readonly [number, number, number]
}

export const UPGRADES: Record<UpgradeId, UpgradeTrack> = {
  // Existing tracks keep their original prices (DUCK COIN list was already in the game).
  bagLevel: { id: 'bagLevel', coin: [500, 1600, 4200], stars: [50, 150, 400] },
  disguiseLevel: { id: 'disguiseLevel', coin: [750, 1800, 3600], stars: [75, 200, 450] },
  shoesLevel: { id: 'shoesLevel', coin: [1000, 2200, 4500], stars: [80, 220, 500] },
  // New tracks, priced between bag and shoes: useful, never mandatory.
  dashLevel: { id: 'dashLevel', coin: [600, 1800, 4000], stars: [60, 180, 420] },
  lockpickLevel: { id: 'lockpickLevel', coin: [500, 1500, 3500], stars: [50, 150, 380] },
  magnetLevel: { id: 'magnetLevel', coin: [400, 1200, 3000], stars: [40, 120, 300] },
}

/** Effects per tier 0..3. Small steps: gear helps, it never makes the duck invisible or instant. */
export const UPGRADE_EFFECTS = {
  bagCap: [100, 250, 500, 1000],
  /** Multiplies guard/camera sight range and detection speed. */
  disguiseMul: [1, 0.75, 0.6, 0.45],
  /** Multiplies step noise (existing shoes speed bonus on tiers 2–3 is kept). */
  shoesNoiseMul: [1, 0.65, 0.5, 0.38],
  shoesSpeedMul: [1, 1, 1.15, 1.3],
  /** DASH: cooldown multiplier and a small distance gain. */
  dashCdMul: [1, 0.88, 0.78, 0.7],
  dashMul: [1, 1.04, 1.08, 1.12],
  /** LOCKPICK: wider timing window. */
  lockWidthMul: [1, 1.15, 1.3, 1.45],
  /** MONEY MAGNET: extra coin pickup radius in px. */
  magnetPx: [0, 12, 24, 36],
} as const

// ---------------------------------------------------------------------------
// ⭐ Star items: one-off conveniences. Prices are small next to upgrades.
// ---------------------------------------------------------------------------

export type StarItemId = 'continueRaid' | 'elevatorPass' | 'escalatorPass' | 'previewPass' | 'boostSpeed' | 'boostStealth' | 'boostBag' | 'boostSilent'

export const STAR_ITEMS: Record<StarItemId, { stars: number }> = {
  /** After CAUGHT: once per raid, keep half of the bag and carry on. */
  continueRaid: { stars: 25 },
  /** One raid of the premium express lift (SKYLINE): lobby ↔ any floor already reached. */
  elevatorPass: { stars: 15 },
  /** One raid of the premium express escalators (UNDERGROUND CITY). */
  escalatorPass: { stars: 10 },
  /** One raid on the first floor of the next locked level. No completion, no unlock. */
  previewPass: { stars: 30 },
  boostSpeed: { stars: 15 },
  boostStealth: { stars: 15 },
  boostBag: { stars: 20 },
  boostSilent: { stars: 10 },
}

/** One-raid boost effects (applied to the next raid, then used up). */
export const BOOSTS = {
  boostSpeed: { speedMul: 1.08 },
  boostStealth: { disguiseMul: 0.85 },
  boostBag: { bagMul: 1.5 },
  boostSilent: { noiseMul: 0.7 },
} as const

/** Continue after CAUGHT keeps this share of the bag (by value, heaviest dropped first). */
export const CONTINUE_KEEP = 0.5

/** Special loot is sold to the Black Market fence at this share of its value. */
export const FENCE_RATE = 1

/** NFT Drop offer inside a raid: after this much active play, at most once per 24 h. */
export const NFT_CTA = { afterActiveS: 360, everyMs: 24 * 60 * 60 * 1000 }
