import { collectionValue, type OwnedCollection } from './catalog'

/**
 * Thief ranking. The game's long-term goal is to become one of the richest
 * thieves: wealth = DUCK COIN in the bank + the value of the collection
 * (buying a lot turns coins into collection, it does not make you poorer).
 * Stars are premium currency for gear and never count as wealth.
 *
 * There is no server board yet, so no places or rivals are shown — the UI
 * shows the player's own wealth and says the online ranking is coming.
 * When a real board exists, set THIEF_BOARD_ONLINE and fetch it here.
 */
export const THIEF_BOARD_ONLINE = false

export type ThiefWealth = { bank: number; collection: number; total: number }

export function thiefWealth(p: { bankedDuckCoin: number; ownedArt?: OwnedCollection }): ThiefWealth {
  const bank = Math.max(0, Math.floor(p.bankedDuckCoin || 0))
  const collection = collectionValue(p.ownedArt ?? {})
  return { bank, collection, total: bank + collection }
}
