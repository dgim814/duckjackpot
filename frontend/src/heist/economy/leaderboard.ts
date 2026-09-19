import { collectionValue, type OwnedCollection } from './catalog'

export type LeaderboardEntry = {
  id: string
  name: string
  collectionValue: number
  you?: boolean
}

/** Local ghosts until a server board exists. Not presented as live online play. */
const GHOSTS: Omit<LeaderboardEntry, 'you'>[] = [
  { id: 'npc_shadow', name: 'SHADOW', collectionValue: 50000 },
  { id: 'npc_cracksman', name: 'CRACKSMAN', collectionValue: 250000 },
  { id: 'npc_legend', name: 'LEGEND', collectionValue: 500000 },
  { id: 'npc_rookie', name: 'ROOKIE', collectionValue: 1000 },
]

export function localLeaderboard(
  playerId: string,
  displayName: string,
  owned: OwnedCollection,
  _bankedDuckCoin: number,
): LeaderboardEntry[] {
  const you: LeaderboardEntry = {
    id: playerId,
    name: displayName,
    collectionValue: collectionValue(owned),
    you: true,
  }
  const rows = [...GHOSTS.map((row) => ({ ...row })), you]
  rows.sort((a, b) => b.collectionValue - a.collectionValue || a.name.localeCompare(b.name))
  return rows
}

export function boardPlace(rows: LeaderboardEntry[], playerId: string) {
  return rows.findIndex((row) => row.id === playerId) + 1
}

export function scoreOf(owned: OwnedCollection, _bankedDuckCoin: number) {
  return collectionValue(owned)
}

export { collectionValue }
