import type { RaffleId } from '../constants'

/**
 * 24-hour NFT try-on. Purely cosmetic: it changes how the heist duck looks and
 * never touches ownership, cards, DUCK COIN or payments. Stored on its own key
 * so the progress save is not affected.
 */
const KEY = 'duckjackpot.heist.nftTrial.v1'
export const NFT_TRIAL_MS = 24 * 60 * 60 * 1000

export type NftTrial = { nftId: RaffleId; startedAt: number; expiresAt: number }

const IDS: readonly RaffleId[] = ['classic', 'fast200', 'fast100']

export type NftSkinGait = 'idle' | 'walk' | 'run' | 'sneak' | 'dash'

/**
 * How an NFT dresses the heist duck. Only the colour, aura and crown are used
 * today; a real per-NFT skin is added later by filling `sheet` + `anims`
 * (same 256 px frame grid as /heist/duck_sheet.png) — no engine change needed.
 */
export type NftSkinDef = {
  id: RaffleId
  /** Accent for the fallback aura/crown and the HUB line. */
  color: number
  css: string
  /** Full-body sprite sheet for this NFT. Absent → the normal DuckJackpot duck. */
  sheet?: { url: string; frameWidth: number; frameHeight: number }
  /** Frame ranges on `sheet`; a missing gait falls back to the normal duck animation. */
  anims?: Partial<Record<NftSkinGait, { start: number; end: number; fps: number }>>
  /** Soft glow under the duck in `color`. */
  aura: boolean
  /** Crown accessory in `color`. */
  crown: boolean
  /** Reserved for extra accessories/effects of a finished skin (ignored by the fallback). */
  effects?: readonly string[]
}

/** Current looks: fallback duck + aura + crown. Add `sheet`/`anims` here when the PNGs exist. */
export const NFT_SKINS: Record<RaffleId, NftSkinDef> = {
  classic: { id: 'classic', color: 0xffd65a, css: '#ffd65a', aura: true, crown: true },
  fast200: { id: 'fast200', color: 0xbfe8ff, css: '#bfe8ff', aura: true, crown: true },
  fast100: { id: 'fast100', color: 0xff5a78, css: '#ff5a78', aura: true, crown: true },
}

export function nftSkin(id: RaffleId): NftSkinDef {
  return NFT_SKINS[id]
}

/** Active trial or null. An expired trial is removed on read. */
export function loadNftTrial(now = Date.now()): NftTrial | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<NftTrial>
    const nftId = IDS.find((id) => id === p.nftId)
    const startedAt = Number(p.startedAt)
    const expiresAt = Number(p.expiresAt)
    if (!nftId || !Number.isFinite(startedAt) || !Number.isFinite(expiresAt)) return null
    if (now >= expiresAt) {
      localStorage.removeItem(KEY)
      return null
    }
    return { nftId, startedAt, expiresAt }
  } catch {
    return null
  }
}

export function startNftTrial(nftId: RaffleId, now = Date.now()): NftTrial {
  const trial: NftTrial = { nftId, startedAt: now, expiresAt: now + NFT_TRIAL_MS }
  try {
    localStorage.setItem(KEY, JSON.stringify(trial))
  } catch {
    /* storage unavailable: the try-on lasts for this session only */
  }
  return trial
}

/** "23:59" style remaining time. */
export function nftTrialLeft(trial: NftTrial, now = Date.now()) {
  const ms = Math.max(0, trial.expiresAt - now)
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
